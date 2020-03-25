import React, { useState, useRef, useContext, useEffect } from 'react';
import Context from '../context/Context'
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk"
import { navigate } from '@reach/router';
import staticConfig from "../staticConfig.js"

// Styling - Material US 
import Button from '@material-ui/core/Button';
import Icon from '@material-ui/core/Icon';
import KeyboardVoiceIcon from '@material-ui/icons/KeyboardVoice';
import { makeStyles } from '@material-ui/core/styles';
import HomeIcon from '@material-ui/icons/Home';
import VideocamOffIcon from '@material-ui/icons/VideocamOff';
import VideocamIcon from '@material-ui/icons/Videocam';
import MicOffIcon from '@material-ui/icons/MicOff';
import MicIcon from '@material-ui/icons/Mic';
import TranslateIcon from '@material-ui/icons/Translate';
import LanguageIcon from '@material-ui/icons/Language';
import PhoneDisabledIcon from '@material-ui/icons/PhoneDisabled';
import PhoneEnabledIcon from '@material-ui/icons/PhoneEnabled';
import SendIcon from '@material-ui/icons/Send';

const useStyles = makeStyles(theme => ({
    button: {
        margin: theme.spacing(1),
    },
}));

// Keep WebRTC goodies in global scope
let pc = null
let makingOffer = false
let polite = false
let ignoreOffer = false
let hangingUp = false
let channel = null
let writeRoom = null
let readRoom = null

// TODO investigate why this is needed
let chatLog = []

const Chat = (props) => {
    // Styling - Material US 
    const classes = useStyles();

    // context stores the db connection
    const context = useContext(Context)
    // refs for various HTML elements
    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const speechButtonRef = useRef(null)
    const translationButtonRef = useRef(null)
    const spokenLangRef = useRef(null)
    const translatedLangRef = useRef(null)

    // ref to keep the chat scroll bar scrolled down
    const messagesEndRef = useRef(null)

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
            context.db.collection('countries').doc(props.country).get()
                .then(countrySnapshot => {
                    if (!countrySnapshot.exists) {
                        createRoom()
                    } else if (countrySnapshot.data().rooms.length == 1) {
                        readRoom = countrySnapshot.data().rooms[0]
                        joinRoom()
                    } else {
                        console.log('country is full: ', countrySnapshot.data().rooms)
                        navigate(`/leave/${props.country}`)
                    }
                })
        }
    }, [context.db])

    useEffect(() => {
        // onresult event handler for Webkit Speech
        if (context.webkitSpeech) {
            context.webkitSpeech.onresult = function (event) {
                let speechText = event.results[0][0].transcript.toLowerCase()
                setSpeechText(speechText)
                let speechObj = { sender: context.name, text: speechText }
                if (channel && channel.readyState == 'open') {
                    channel.send(JSON.stringify(speechObj))
                }
                chatLog = [...chatLog, speechObj]
                setChatLogState(chatLog)
                speechButtonRef.current.disabled = false
            }
        }
    }, [context.webkitSpeech, chatLogState]) // TODO debug why listening on setChatLogState doesn't work

    useEffect(() => {
        if (translationButtonRef) {
            if (context.speechConfig && context.audioConfig) {
                translationButtonRef.current.disabled = false
            } else {
                translationButtonRef.current.disabled = true
            }
        }
    }, [translationButtonRef, context.speechConfig, context.audioConfig])

    useEffect(() => {
        if (chatLogState && messagesEndRef) {
        scrollToBottom()
        }
    }, [chatLogState, messagesEndRef])

    // to keep the scroll bar for the chat message to be scrolled down
    const scrollToBottom = () => {
        messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }



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
            // during hangup, ignore any snapshot updates
            if (hangingUp) {
                return
            }
            // if room no longer exists, it's time to leave
            if (!snapshot.exists) {
                hangUp()
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
            // ignore your own writes (for joinRoom() when providing your writeRoom)
            let myWrite = snapshot.metadata.hasPendingWrites ? true : false;
            if (myWrite) {
                return
            }
            // during hangup, ignore any snapshot updates
            if (hangingUp) {
                return
            }
            // if room no longer exists, it's time to leave
            if (!snapshot.exists) {
                hangUp()
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
            // during hangup, ignore any snapshot updates
            if (hangingUp) {
                return
            }

            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    let candidate = change.doc.data()
                    pc.addIceCandidate(candidate);
                // if candidates are being removed, it's time to leave
                } else if (change.type === "removed") {
                    hangUp()
                    return
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
                context.db.collection('countries').doc(props.country).set({ rooms: [writeRoom] })
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
                context.db.collection('countries').doc(props.country).set({ rooms: [readRoom, snapshot.id]})
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
            // delete country data
            context.db.collection('countries').doc(props.country).delete()
            // delete writeRoom data
            context.db.collection('rooms').doc(writeRoom).collection('candidates').get()
            .then(candidates => {
                candidates.forEach(candidate => {
                    context.db.collection('rooms').doc(writeRoom).collection('candidates').doc(candidate.id).delete()
                })
            })
            context.db.collection('rooms').doc(writeRoom).delete()
        }
        if (readRoom) {
            // delete readRoom data (better chance of full cleanup)
            context.db.collection('rooms').doc(readRoom).collection('candidates').get()
            .then(candidates => {
                candidates.forEach(candidate => {
                    context.db.collection('rooms').doc(writeRoom).collection('candidates').doc(candidate.id).delete()
                })
            })
            context.db.collection('rooms').doc(readRoom).delete()
        }
        navigate(`/leave/${props.country}`)
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

    // event handler for chat sending
    const sendChatMessage = e => {
        e.preventDefault();
        let chatObj = { sender: context.name, text: chatText }
        if (channel && channel.readyState == 'open') {
            channel.send(JSON.stringify(chatObj))
        }
        chatLog = [...chatLog, chatObj]
        setChatLogState(chatLog)
        setChatText("")
    }

    const startWebkitSpeech = e => {
        speechButtonRef.current.disabled = true
        context.webkitSpeech.lang = spokenLangRef.current.value
        context.webkitSpeech.start()
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
        let translationText = result.translations.get(translatedLangRef.current.value)
        setTranslatedText(translationText)
        let translationObj = { sender: context.name, text: translationText }
        if (channel && channel.readyState == 'open') {
            channel.send(JSON.stringify(translationObj))
        }
        chatLog = [...chatLog, translationObj]
        setChatLogState(chatLog)
        translationButtonRef.current.disabled = false
    }

    return (
        <div id="chatRoom">
            <h1>{props.country} Chat Room {context.name}</h1>
            <div id="buttons">
                <Button style={{height: "45px"}} onClick={e => toggleTrack('audio')} id="toggleAudio" disabled={!pcState} variant="contained" color="primary" className={classes.button} endIcon={audioState? <PhoneDisabledIcon/> :<PhoneEnabledIcon/>}>Turn {audioState ? "Off" : "On"} Audio</Button>
                <Button style={{height: "45px"}} onClick={e => toggleTrack('video')} id="toggleVideo" disabled={!pcState} variant="contained" color="primary" className={classes.button} endIcon={videoState? <VideocamOffIcon/> :<VideocamIcon/>}>Turn {videoState ? "Off" : "On"} Video</Button>
                <Button style={{height: "45px"}} onClick={hangUp} id="hangupBtn" variant="contained" color="secondary" className={classes.button} endIcon={<HomeIcon/>} >Leave</Button>
            </div>
            <div className="chatSet">
                <div className="scrollBar" ref={messagesEndRef}>
                    {chatLogState.map((item, index) => (

                        <div key={index}>
                            {item.sender === context.name ?
                                <div>
                                    <p style={{ color: 'red', textAlign: "right", marginRight:"3vw"}}>{item.sender} (You) says:</p>
                                    <p style={{ color: 'red', textAlign: "right", marginRight:"3vw"}}>{item.text}</p>
                                </div>
                                :
                                <div>
                                    <p style={{textAlign:"left", marginLeft:"3vw"}}>{item.sender} says:</p>
                                    <p style={{textAlign:"left", marginLeft:"3vw"}}>{item.text}</p>
                                </div>
                            }
                        </div>
                    ))
                    }
                </div>
                <div className="messageForm">

                <form className="messageOnSubmit" onSubmit={sendChatMessage}> 
                    <input style={{ height: "40px", width: "150px", fontSize: "20px", marginTop: '12px', marginLeft: '10px' }} type="text" onChange={e => setChatText(e.target.value)} value={chatText} />
                    <Button style={{ width: '9px', height: "45px", marginTop: '3px', marginLeft: '15px'  }} type="submit" variant="contained" color="primary" className={classes.button}><SendIcon/></Button>
                </form> 
                    <Button style={{display: "inline-block"}} onClick={startWebkitSpeech} ref={speechButtonRef} style={{ width: '9px', height: "45px", marginTop: '3px'}} type="submit" variant="contained" color="primary" className={classes.button}><MicIcon/></Button>
                </div>
            </div>
                
        
            <div id="videos">
                <video id="localVideo" muted autoPlay playsInline ref={localVideoRef}></video>
                <video id="remoteVideo" autoPlay playsInline ref={remoteVideoRef}></video>
            </div>

            <div>
                <label><LanguageIcon/> Spoken Language</label>
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
                <label><LanguageIcon/> Translated Language</label>
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
            <div className="translationSet">
            <form onSubmit={e => {
                e.preventDefault()
                translationButtonRef.current.disabled = true
                context.speechConfig.speechRecognitionLanguage = spokenLangRef.current.value
                context.speechConfig.addTargetLanguage(translatedLangRef.current.value)
                let recognizer = new SpeechSDK.TranslationRecognizer(context.speechConfig, context.audioConfig)
                recognizer.recognizeOnceAsync(onTranslationDone)
            }}>
                <Button style={{height: "45px"}} ref={translationButtonRef} type="submit" variant="contained" color="secondary" className={classes.button} startIcon={<TranslateIcon/>} endIcon={<Icon>send</Icon>}>Translate & Send</Button>
                <div style={{ border: "1px solid black", width: '50%', margin: "auto", minHeight: "20vh" }}>
                    <h2>{translatedText}</h2>
                </div>
            </form>
            </div>
     

            
        </div >

    );
}

export default Chat
