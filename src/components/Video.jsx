
import React, { useState, useRef, useContext, useEffect } from 'react';
import Context from '../context/Context'
import { resolve } from 'dns';
import { navigate } from '@reach/router';

// WebRTC peer connection configuration
const configuration = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

// Keep WebRTC goodies in global scope
let pc
let channel
let chatLog
let makingOffer
let polite
let ignoreOffer
let hangingUp
let writeRoom
let readRoom

const initGlobal = () => {
    pc = new RTCPeerConnection(configuration)
    channel = null
    chatLog = []
    makingOffer = false
    polite = false
    ignoreOffer = false
    hangingUp = false

    writeRoom = null
    readRoom = null
}
initGlobal()

const Video = (props) => {
    // context stores the db connection
    const context = useContext(Context)

    // refs for video stream as srcObject cannot be set by using React states
    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)

    // Standard React states
    const [audioState, setAudioState] = useState(false)
    const [videoState, setVideoState] = useState(false)
    const [chatLogState, setChatLogState] = useState([])
    const [chatText, setChatText] = useState("")

    useEffect(() => {
        context.db.collection('countries').doc(props.country).collection('rooms').get()
        .then(countryRoomsSnapshot => {
            if (countryRoomsSnapshot.docs.length < 1) {
                createRoom()
            } else if (countryRoomsSnapshot.docs.length == 1) {
                readRoom = countryRoomsSnapshot.docs[0].data().room
                joinRoom()
            } else {
                console.log('country is full: ', countryRoomsSnapshot.docs)
            }
        })
    }, [])

    // set up WebRTC peer connection with the necessary listeners
    const initializePeerConnection = (pc) => {
        // set up listeners for handy console logging
        registerPeerConnectionListeners(pc);

        // initialize the remote video stream
        remoteVideoRef.current.srcObject = new MediaStream();

        // handle any negotiations needed (track, data channel changes)
        pc.onnegotiationneeded = () => {
            makingOffer = true;
            pc.setLocalDescription()
                .then(() => {
                    const description = pc.localDescription.toJSON()
                    return context.db.collection('rooms').doc(writeRoom).update({ description })
                })
                .finally(() => makingOffer = false)
        };

        // handle ice candidate updates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                context.db.collection('rooms').doc(writeRoom).collection('candidates').add(event.candidate.toJSON());
            }
        }

        // handle track changes
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach(track => {
                remoteVideoRef.current.srcObject.addTrack(track)
            })
        }

        // handle channel changes
        pc.ondatachannel = (event) => {
            channel = event.channel;
            channel.onmessage = onChannelMessage;
        }
    }

    // Initializer for listening on write room snapshots.
    // The only change we ever listen on the write room is for receiving the read room id.
    // once it is set, we will ignore any future room updates.
    const initializeWriteRoomOnSnapshots = (pc) => {
        context.db.collection('rooms').doc(writeRoom).onSnapshot(snapshot => {
            // ignore your own writes
            let myWrite = snapshot.metadata.hasPendingWrites ? true : false;
            if (myWrite) {
                return
            }

            // if hanging up, there may be writes on the other end to delete
            if (hangingUp || !snapshot.exists) {
                return
            }

            if (snapshot.data().readRoom && !readRoom) {
                readRoom = snapshot.data().readRoom
                initializeReadRoomOnSnapshots(pc)
            }
        })

    }

    // Initializer for listening on read room snapshots.
    // This cannot be set until the read room id is known.
    const initializeReadRoomOnSnapshots = (pc) => {
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
            // ignore your own writes
            let myWrite = snapshot.metadata.hasPendingWrites ? true : false;
            if (myWrite) {
                return
            }

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
        channel = pc.createDataChannel("sendChannel")
        channel.onmessage = onChannelMessage

        let offer
        pc.createOffer()
            .then(offerObj => {
                offer = offerObj
                let description = offer.toJSON()
                return context.db.collection('rooms').add({ description })
            })
            .then(roomSnapshot => {
                let room = roomSnapshot.id
                context.db.collection('countries').doc(props.country).collection('rooms').add({room})
                writeRoom = roomSnapshot.id

                initializePeerConnection(pc)
                initializeWriteRoomOnSnapshots(pc)
                pc.setLocalDescription(offer)
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
                context.db.collection('countries').doc(props.country).collection('rooms').add({room})
                writeRoom = snapshot.id
            }).then(() => {
                initializePeerConnection(pc)
                let offer = offerSnapshot.data().description
                return pc.setRemoteDescription(new RTCSessionDescription((offer)))
            }).then(() => pc.setLocalDescription())
            .then(() => {
                let description = pc.localDescription.toJSON()
                context.db.collection('rooms').doc(writeRoom).update({ description })
            })
            .then(() => {
                initializeReadRoomOnSnapshots(pc)

                let updated = { readRoom: writeRoom }
                context.db.collection('rooms').doc(readRoom).update(updated)
            })
    }

    // handle channel message recieving
    const onChannelMessage = event => {
        let chatObj = JSON.parse(event.data)
        chatLog = [...chatLog, chatObj]
        setChatLogState(chatLog)
    }

    const sendChannelMessage = e => {
        e.preventDefault()

        let chatObj = { sender: context.name, text: chatText }
        channel.send(JSON.stringify(chatObj))
        setChatText("")
        chatLog = [...chatLog, chatObj]
        setChatLogState(chatLog)
    }

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

    const toggleAudio = () => {
        let newAudioState = !audioState
        setAudioState(newAudioState)
        openUserMedia()
            .then(() => {
                let stream = localVideoRef.current.srcObject
                stream.getAudioTracks().forEach(track => track.enabled = newAudioState)
            })
    }
    const toggleVideo = () => {
        let newVideoState = !videoState
        setVideoState(newVideoState)
        openUserMedia()
            .then(() => {
                let stream = localVideoRef.current.srcObject
                stream.getVideoTracks().forEach(track => track.enabled = newVideoState)
            })
    }

    const hangUp = (e) => {
        hangingUp = true
        if (localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(track => track.stop())
        }
        localVideoRef.current.srcObject = null
        if (remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop())
        }
        remoteVideoRef.current.srcObject = null
        pc.close()
        if (writeRoom) {
            context.db.collection('rooms').doc(writeRoom).delete()

            let writeRoomRef = writeRoom
            context.db.collection('rooms').doc(writeRoom).collection('candidates').get()
            .then(candidates => {
                candidates.forEach(candidate => {
                    context.db.collection('rooms').doc(writeRoomRef).collection('candidates').doc(candidate.id).delete()
                })
            })
            context.db.collection('countries').doc(props.country).collection('rooms').get()
            .then((countryRooms) => {
                countryRooms.forEach(countryRoom => {
                    if(countryRoom.data().room == writeRoomRef) {
                        context.db.collection('countries').doc(props.country).collection('rooms').doc(countryRoom.id).delete()
                    }
                })
            })

            // this will also set hangingUp back to false
            initGlobal()

            // init React states
            setAudioState(false)
            setVideoState(false)
            setChatLogState([])
            setChatText("")
            // we don't want to reset the Refs since they are tied to html tags
            // localVideoRef.current = null
            // remoteVideoRef.current = null
            navigate('/chat')
        }
    }

    const registerPeerConnectionListeners = (pc) => {
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

    return (
        <div id="chatRoom">
            <h1>♥ Welcome to {props.country} Chat Room, {context.name}! ♥</h1>
            <div id="buttons">
                <button onClick={toggleAudio} id="toggleAudio">Turn {audioState ? "Off" : "On"} Audio</button>
                <button onClick={toggleVideo} id="toggleVideo">Turn {videoState ? "Off" : "On"} Video</button>
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

            <div id="videos">
                <video id="localVideo" muted autoPlay playsInline ref={localVideoRef}></video>
                <video id="remoteVideo" autoPlay playsInline ref={remoteVideoRef}></video>
            </div>
        </div>
    );
}

export default Video
