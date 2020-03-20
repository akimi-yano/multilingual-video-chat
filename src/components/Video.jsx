
import React, { useState, useRef, useContext } from 'react';
import Context from '../context/Context'

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

const Video = () => {
    let pc
    // TODO see if this works
    let makingOffer

    const context = useContext(Context)

    const [channel, setChannel] = useState(null)
    const [chatText, setChatText] = useState("")
    const [chatLog, setChatLog] = useState([])
    const chatLogRef = useRef([])

    const roomIdRef = useRef(null)
    const [roomId, setRoomId] = useState(null)

    const [localStream, setLocalStream] = useState(null)
    const [remoteStream, setRemoteStream] = useState(null)

    const [ignoreOffer, setIgnoreOffer] = useState(false)
    const [polite, setPolite] = useState(false)

    const onChannelMessage = event => {
        let chatObj = JSON.parse(event.data)
        let temp = [
            ...chatLogRef.current,
            chatObj
        ]
        chatLogRef.current = temp
        setChatLog(chatLogRef.current)
    }

    const receiveChannelCallback = event => {
        let ch = event.channel;
        ch.onmessage = onChannelMessage;
        setChannel(ch)
    }

    const sendChat = e => {
        e.preventDefault()

        let chatObj = { sender: context.name, text: chatText }
        channel.send(JSON.stringify(chatObj))
        setChatText("")

        let temp = [
            ...chatLogRef.current,
            chatObj
        ]
        chatLogRef.current = temp
        setChatLog(chatLogRef.current)
    }

    const initializePeerConnection = (pc) => {

        let ch = pc.createDataChannel("sendChannel");
        ch.onmessage = onChannelMessage;
        setChannel(ch)

        pc.ondatachannel = receiveChannelCallback;

        registerPeerConnectionListeners(pc);

        makingOffer = false;
        pc.onnegotiationneeded = () => {
            makingOffer = true;
            pc.setLocalDescription()
                .then(() => {
                    const description = pc.localDescription.toJSON()
                    return context.db.collection('rooms').doc(roomIdRef.current).update({description})
                })
        };

        pc.onicecandidate = event => {
            if (event.candidate) {
                context.db.collection('rooms').doc(roomIdRef.current).collection('candidates').add(event.candidate.toJSON());
            }
        }

        context.db.collection('rooms').doc(roomIdRef.current).onSnapshot(snapshot => {
            let description = snapshot.data().description
            const offerCollision = (description.type == "offer") &&
                (makingOffer || pc.signalingState != "stable");

            setIgnoreOffer(!polite && offerCollision)
            if (ignoreOffer) {
                return;
            }

            pc.setRemoteDescription(description)
            .then(() => {
                if (description.type == "offer") {
                    pc.setLocalDescription()
                    .then(description => {
                        return context.db.collection('rooms').doc(roomIdRef.current).update({description})
                    })
                }
            })
        })

        context.db.collection('rooms').doc(roomIdRef.current).collection('candidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    let candidate = change.doc.data()
                    pc.addIceCandidate(candidate);
                }
            })
        })
    }

    const createRoom = () => {
        // TODO better politeness
        setPolite(true)
        pc = new RTCPeerConnection(configuration)

        // need to create offer manually the first time
        let description
        pc.createOffer()
        .then(offer => {
            description = offer.toJSON()
            return context.db.collection('rooms').add({description})
        })
        .then(roomRef => {
            console.log('created room: ', roomRef.id)
            roomIdRef.current = roomRef.id
            setRoomId(roomIdRef.current)

            initializePeerConnection(pc)
            pc.setLocalDescription({description})
        })
    }

    const joinRoom = () => {
        context.db.collection('rooms').doc(roomIdRef.current).get()
        .then(roomSnapshot => {
            if (roomSnapshot.exists) {
                pc = new RTCPeerConnection(configuration)
                pc.setLocalDescription(roomSnapshot.data())
                initializePeerConnection(pc)
            }
        })
    }

    const openUserMedia = (e) => {
        navigator.mediaDevices.getUserMedia(
            { video: true, audio: true })
        .then(stream => {
            document.querySelector('#localVideo').srcObject = stream;
            setLocalStream(stream)
            let rStream = new MediaStream();
            document.querySelector('#remoteVideo').srcObject = rStream;
            setRemoteStream(rStream)
        })
    }

    const hangUp = (e) => {
        const tracks = document.querySelector('#localVideo').srcObject.getTracks();
        tracks.forEach(track => {
            track.stop();
        });

        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
        }

        if (pc) {
            pc.close();
        }

        document.querySelector('#localVideo').srcObject = null;
        document.querySelector('#remoteVideo').srcObject = null;

        // Delete room on hangup
        if (roomIdRef.current) {
            context.db.collection('rooms').doc(roomIdRef.current).collection('candidates').get()
            .then(candidates => {
                candidates.forEach(candidate => {
                    candidate.delete();
                })
                context.db.collection('rooms').doc(roomIdRef.current).get()
                .then(roomRef =>roomRef.delete())
            })
        }
    }

    const registerPeerConnectionListeners = (pc) => {
        pc.addEventListener('icegatheringstatechange', () => {
            console.log(
                `ICE gathering state changed: ${pc.iceGatheringState}`);
        });

        pc.addEventListener('connectionstatechange', () => {
            console.log(`Connection state change: ${pc.connectionState}`);
        });

        pc.addEventListener('signalingstatechange', () => {
            console.log(`Signaling state change: ${pc.signalingState}`);
        });

        pc.addEventListener('iceconnectionstatechange ', () => {
            console.log(
                `ICE connection state change: ${pc.iceConnectionState}`);
        });
    }

    const setRoomIdRef = (e) => {
        roomIdRef.current = e.target.value
        setRoomId(roomIdRef.current)
    }

    return (
        <div>
            <h1>♥ Welcome to Secret Video Chat, {context.name}! ♥</h1>
            <div>Your room ID is {roomId}</div>
            <div id="buttons">
                <button onClick={openUserMedia} id="cameraBtn">Open Camera & Microphone</button>
                <button onClick={createRoom} id="createBtn">Create Room</button>
                <button onClick={joinRoom} id="joinBtn">Join Room</button>
                <button onClick={hangUp} id="hangupBtn">Hang Up</button>
            </div>

            <div>
                {chatLog.map((item, index) => (
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
                ))}
            </div>

            <form onSubmit={sendChat}>
                <input type="text" onChange={e => setChatText(e.target.value)} value={chatText} />
                <button type="submit">Send</button>
                </form>

            <div
                id="room-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="my-dialog-title"
                aria-describedby="my-dialog-content">
                <div>
                    <div>
                        <h2 id="my-dialog-title">Join Room</h2>
                        <div id="my-dialog-content">
                            Enter ID for Room to Join:
                <div>
                                <input type="text" id="room-id" onChange={setRoomIdRef}/>
                                <p>Room ID</p>
                            </div>
                        </div>
                        <footer>
                            <button type="button">Cancel</button>
                            <button id="confirmJoinBtn" type="button">Join</button>
                        </footer>
                    </div>
                </div>
            </div>

            <div>
                <span id="currentRoom"></span>
            </div>
            <div id="videos">
                <video id="localVideo" muted autoPlay playsInline></video>
                <video id="remoteVideo" autoPlay playsInline></video>
            </div>
        </div >
    );
}

export default Video
