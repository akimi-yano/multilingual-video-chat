import React, { useState, useRef, useContext, useEffect } from 'react';
import Context from '../context/Context'
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk"
import { navigate } from '@reach/router';
import staticConfig from "../staticConfig.js"

// Keep WebRTC goodies in global scope
let pc = null
let makingOffer = false
let polite = false
let ignoreOffer = false
let hangingUp = false
let channel = null
let chatLog = []
let writeRoom = null
let readRoom = null

const Chat = (props) => {
    // context stores the db connection
    const context = useContext(Context)
    // refs for various HTML elements
    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const speechButtonRef = useRef(null)
    const translationButtonRef = useRef(null)
    const spokenLangRef = useRef(null)
    const translatedLangRef = useRef(null)
    // standard React states
    const [audioState, setAudioState] = useState(false)
    const [videoState, setVideoState] = useState(false)
    const [chatLogState, setChatLogState] = useState([])
    const [chatText, setChatText] = useState("")
    const [speechText, setSpeechText] = useState("")
    const [translatedText, setTranslatedText] = useState("")
    // state to toggle UI buttons/views
    const [pcState, setPcState] = useState(null)

    useEffect(() => {
        // When entering a Chat, either create a new room or join one
        if (context.db) {
            context.db.collection('countries').doc(props.country).collection('rooms').get()
                .then(countryRoomsSnapshot => {
                    if (countryRoomsSnapshot.docs.length < 1) {
                        createRoom()
                    } else if (countryRoomsSnapshot.docs.length == 1) {
                        readRoom = countryRoomsSnapshot.docs[0].data().room
                        joinRoom()
                    } else {
                        console.log('country is full: ', countryRoomsSnapshot.docs)
                        // TODO uncomment
                        // navigate('/chat')
                    }
                })
        }
    }, [context.db])

    useEffect(() => {
        // onresult event handler for Webkit Speech
        if (context.webkitSpeech) {
            context.webkitSpeech.onresult = function (event) {
                setSpeechText(event.results[0][0].transcript.toLowerCase())
                speechButtonRef.current.disabled = false
            }
        }
    }, [context.webkitSpeech])

    // set up WebRTC peer connection with the necessary listeners
    const initializePeerConnection = () => {
        pc = new RTCPeerConnection(staticConfig.rtcConfig)
        setPcState(pc)
        // inits
        remoteVideoRef.current.srcObject = new MediaStream();
        // handy console logging
        registerPeerConnectionListeners();

        // event handler for negotiations (track, data channel adds)
        pc.onnegotiationneeded = () => {
            makingOffer = true;
            pc.setLocalDescription()
                .then(() => {
                    const description = pc.localDescription.toJSON()
                    return context.db.collection('rooms').doc(writeRoom).update({ description })
                })
                .finally(() => makingOffer = false)
        };
        // event handler for ice candidate updates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                context.db.collection('rooms').doc(writeRoom).collection('candidates').add(event.candidate.toJSON());
            }
        }
        // event handler for track received
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach(track => {
                remoteVideoRef.current.srcObject.addTrack(track)
            })
        }
        // event handler for channel received
        pc.ondatachannel = (event) => {
            channel = event.channel;
            channel.onmessage = onChannelMessage;
        }

        // Initializer for listening on write room snapshots.
        // The only change we ever listen on the write room is for receiving the read room id.
        // once it is set, we will ignore any future room updates.
        context.db.collection('rooms').doc(writeRoom).onSnapshot(snapshot => {
            // ignore your own writes
            let myWrite = snapshot.metadata.hasPendingWrites ? true : false;
            if (myWrite) {
                return
            }
            // if hanging up
            if (hangingUp) {
                return
            }

            if (!readRoom && snapshot.data().readRoom) {
                readRoom = snapshot.data().readRoom
                initializeReadRoomOnSnapshots(pc)
            }
        })
    }

    // Initializer for listening on read room snapshots.
    // This cannot be set until the read room id is known.
    const initializeReadRoomOnSnapshots = () => {
        // listen for new offers/answers
        context.db.collection('rooms').doc(readRoom).onSnapshot(snapshot => {
            // ignore your own writes
            let myWrite = snapshot.metadata.hasPendingWrites ? true : false;
            if (myWrite) {
                return
            }

            // if hanging up, there may be writes on the other end to delete
            if (hangingUp || !snapshot.exists) {
                return
            }

            let description = snapshot.data().description
            const offerCollision = (description.type == "offer") &&
                (makingOffer || pc.signalingState != "stable");

            ignoreOffer = !polite && offerCollision
            if (ignoreOffer) {
                return;
            }

            pc.setRemoteDescription(new RTCSessionDescription((description)))
                .then(() => {
                    if (description.type == "offer") {
                        pc.setLocalDescription()
                            .then(() => {
                                let description = pc.localDescription.toJSON()
                                return context.db.collection('rooms').doc(writeRoom).update({ description })
                            })
                    }
                })
        })

        // listen for new ice candidates
        context.db.collection('rooms').doc(readRoom).collection('candidates').onSnapshot(snapshot => {
            // if hanging up, there may be writes on the other end to delete
            if (hangingUp || !snapshot.exists) {
                return
            }

            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    let candidate = change.doc.data()
                    pc.addIceCandidate(candidate);
                }
            })
        })
    }

    const createRoom = () => {
        // the creator of the room is destined to be polite
        polite = true

        context.db.collection('rooms').add({})
            .then(roomSnapshot => {
                let room = roomSnapshot.id
                writeRoom = room
                context.db.collection('countries').doc(props.country).collection('rooms').add({ room })
                initializePeerConnection()
                channel = pc.createDataChannel("sendChannel")
                channel.onmessage = onChannelMessage
            })
    }

    const joinRoom = () => {
        // we need to create a writeRoom ahead of time b/c ice candidates may arrive earlier than
        // when we create the answer and put in firebase
        let offerSnapshot = null
        context.db.collection('rooms').doc(readRoom).get()
            .then(snapshot => {
                offerSnapshot = snapshot
                return context.db.collection('rooms').add({})
            }).then(snapshot => {
                let room = snapshot.id
                context.db.collection('countries').doc(props.country).collection('rooms').add({ room })
                writeRoom = snapshot.id
            }).then(() => {
                initializePeerConnection()
                let offer = offerSnapshot.data().description
                return pc.setRemoteDescription(new RTCSessionDescription((offer)))
            }).then(() => pc.setLocalDescription())
            .then(() => {
                let description = pc.localDescription.toJSON()
                context.db.collection('rooms').doc(writeRoom).update({ description })
            })
            .then(() => {
                initializeReadRoomOnSnapshots()

                let updated = { readRoom: writeRoom }
                context.db.collection('rooms').doc(readRoom).update(updated)
            })
    }

    const hangUp = () => {
        hangingUp = true
        if (localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(track => track.stop())
        }
        if (remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop())
        }
        if (pc) {
            pc.close()
        }
        if (writeRoom) {
            context.db.collection('countries').doc(props.country).collection('rooms').get()
            .then((countryRooms) => {
                countryRooms.forEach(countryRoom => {
                    if (countryRoom.data().room == writeRoom) {
                        context.db.collection('countries').doc(props.country).collection('rooms').doc(countryRoom.id).delete()
                    }
                })
            })
            context.db.collection('rooms').doc(writeRoom).collection('candidates').get()
            .then(candidates => {
                candidates.forEach(candidate => {
                    context.db.collection('rooms').doc(writeRoom).collection('candidates').doc(candidate.id).delete()
                })
            })
            context.db.collection('rooms').doc(writeRoom).delete()
        }
        navigate('/chat')
    }

    const registerPeerConnectionListeners = () => {
        pc.addEventListener('icegatheringstatechange', () => {
            console.log(
                `ICE gathering state changed: ${pc.iceGatheringState}`);
        });

        pc.addEventListener('connectionstatechange', () => {
            console.log(`Connection state change: ${pc.connectionState}`);
            if (pc.connectionState == 'disconnected') {
                hangUp()
            }
        });

        pc.addEventListener('signalingstatechange', () => {
            console.log(`Signaling state change: ${pc.signalingState}`);
        });

        pc.addEventListener('iceconnectionstatechange ', () => {
            console.log(
                `ICE connection state change: ${pc.iceConnectionState}`);
        });
    }

    // event hiandler for channel received
    const onChannelMessage = event => {
        let chatObj = JSON.parse(event.data)
        chatLog = [...chatLog, chatObj]
        setChatLogState(chatLog)
    }

    // event handler for message sending
    const sendChannelMessage = e => {
        e.preventDefault()

        let chatObj = { sender: context.name, text: chatText }
        channel.send(JSON.stringify(chatObj))
        setChatText("")
        chatLog = [...chatLog, chatObj]
        setChatLogState(chatLog)
    }

    // prompt user for camera and video permissions
    const openUserMedia = () => {
        // only allow this to be called once
        if (localVideoRef.current.srcObject) {
            return new Promise((resolve) => resolve())
        }
        return navigator.mediaDevices.getUserMedia(
            { audio: true, video: true })
            .then(stream => {
                localVideoRef.current.srcObject = stream
                stream.getTracks().forEach(track => {
                    track.enabled = false
                    pc.addTrack(track, stream)
                });
            })
    }

    // toggle media enabled state
    const toggleTrack = (trackType) => {
        let newState
        if (trackType == 'audio') {
            newState = !audioState
            setAudioState(newState)
        } else {
            newState = !videoState
            setVideoState(newState)
        }
        openUserMedia()
            .then(() => {
                let stream = localVideoRef.current.srcObject
                let tracks = trackType == 'audio' ? stream.getAudioTracks() : stream.getVideoTracks()
                tracks.forEach(track => track.enabled = newState)
            })
    }

    // event handler for translation
    const onTranslationDone = (result) => {
        console.log(result.translations, translatedLangRef.current.value)
        let text = result.translations.get(translatedLangRef.current.value)
        setTranslatedText(text)
        translationButtonRef.current.disabled = false
    }

    return (
        <div id="chatRoom">
            <h1>♥ Welcome to {props.country} Chat Room, {context.name}! ♥</h1>
            <div id="buttons">
                <button onClick={e => toggleTrack('audio') } id="toggleAudio" disabled={!pcState}>Turn {audioState ? "Off" : "On"} Audio</button>
                <button onClick={e => toggleTrack('video')} id="toggleVideo" disabled={!pcState}>Turn {videoState ? "Off" : "On"} Video</button>
                <button onClick={createRoom} id="createBtn">Create Room</button>
                <button onClick={hangUp} id="hangupBtn">End Chat</button>
            </div>

            <div>
                {chatLogState.map((item, index) => (


                    <div key={index}>
                        {item.sender === context.name ?
                            <div>
                                <p style={{ color: 'red' }}>{item.sender} (You) says:</p>
                                <p style={{ color: 'red' }}>{item.text}</p>
                            </div>
                            :
                            <div>
                                <p>{item.sender} says:</p>
                                <p>{item.text}</p>
                            </div>
                        }
                    </div>
                ))

                }
            </div>
            <form onSubmit={sendChannelMessage}>
                <input type="text" onChange={e => setChatText(e.target.value)} value={chatText} />
                <button type="submit">Send</button>
            </form>


            <div>
                <label>Spoken Language</label>
                <select ref={spokenLangRef}>
                    <option value="en-US">English</option>
                    <option value="zh-CN">中文</option>
                    <option value="ja-JP">日本語</option>
                    <option value="es-SP">español</option>
                    <option value="fr-FR">français</option>
                    <option value="pt-PT">português</option>
                    <option value="ru-RU">русский</option>
                </select>
            </div>
            <div>
                <label>Translated Language</label>
                <select ref={translatedLangRef}>
                    <option value="en">English</option>
                    <option value="zh-Hant">中文</option>
                    <option value="ja">日本語</option>
                    <option value="es">español</option>
                    <option value="fr">français</option>
                    <option value="pt">português</option>
                    <option value="ru">русский</option>
                </select>
            </div>
            <form onSubmit={e => {
                e.preventDefault()
                speechButtonRef.current.disabled = true
                context.webkitSpeech.lang = spokenLangRef.current.value
                context.webkitSpeech.start()
            }}>
                <button ref={speechButtonRef} type="submit">Speak & Send</button>
                <div style={{ border: "1px solid black", width: '50%', margin: "auto", minHeight: "20vh" }}>
                    <h2>{speechText}</h2>
                </div>
            </form>
            <form onSubmit={e => {
                e.preventDefault()
                translationButtonRef.current.disabled = true
                context.speechConfig.speechRecognitionLanguage = spokenLangRef.current.value
                context.speechConfig.addTargetLanguage(translatedLangRef.current.value)
                let recognizer = new SpeechSDK.TranslationRecognizer(context.speechConfig, context.audioConfig)
                recognizer.recognizeOnceAsync(onTranslationDone)
            }}>
                <button ref={translationButtonRef} type="submit">Translate & Send</button>
                <div style={{ border: "1px solid black", width: '50%', margin: "auto", minHeight: "20vh" }}>
                    <h2>{translatedText}</h2>
                </div>
            </form>

            <div id="videos">
                <video id="localVideo" muted autoPlay playsInline ref={localVideoRef}></video>
                <video id="remoteVideo" autoPlay playsInline ref={remoteVideoRef}></video>
            </div>
        </div>
    );
}

export default Chat
