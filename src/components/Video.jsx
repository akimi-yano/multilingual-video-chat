
import React, { useState, useEffect, useRef, useContext } from 'react';
import Context from '../context/Context'

const Video = () => {
    const context = useContext(Context)

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

    let peerConnection = null;
    const [localStreamState, setlocalStreamState] = useState(null)
    const [remoteStreamState, setRemoteStreamState] = useState(null)
    const [chatChannel, setChatChannel] = useState("derpderp")
    const [chatText, setChatText] = useState("")
    const [allChatState, setAllChatState] = useState([])
    const allChatRef = useRef([])

    // let roomDialog = null;
    let roomId = null;

    const onChannelOpen = event => {
    }
    const onChannelClose = event => {
    }
    const onChannelMessage = event => {
        let chatObj = JSON.parse(event.data)
        console.log("Remote says:", chatObj.text)
        console.log("chat state pre: ", allChatRef.current)
        console.log("chatChannel: ", chatChannel)
        let temp = [...allChatRef.current]
        temp.push(chatObj)
        allChatRef.current = temp
        setAllChatState(allChatRef.current)
    }

    const sendChat = e => {
        console.log("Local (I) says:", chatText)
        console.log("chat state pre: ", allChatRef.current)
        console.log("chatChannel: ", chatChannel)
        e.preventDefault()

        let chatObj = { sender: context.name, text: chatText }
        chatChannel.send(JSON.stringify(chatObj))
        setChatText("")

        let temp = [...allChatRef.current]
        temp.push(chatObj)
        allChatRef.current = temp
        setAllChatState(allChatRef.current)
    }

    const createRoom = async () => {
        document.querySelector('#createBtn').disabled = true;
        document.querySelector('#joinBtn').disabled = true;
        // const db = firebase.firestore();

        console.log('Create PeerConnection with configuration: ', configuration);
        peerConnection = new RTCPeerConnection(configuration);

        let channel = peerConnection.createDataChannel("sendChannel");
        channel.onmessage = onChannelMessage;
        channel.onopen = onChannelOpen;
        channel.onclose = onChannelClose;
        setChatChannel(channel)

        registerPeerConnectionListeners();

        localStreamState.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamState);
        });

        // Code for creating a room below
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log('Created offer:', offer);

        const roomWithOffer = {
            'offer': {
                type: offer.type,
                sdp: offer.sdp,
            },
        };
        const roomRef = await context.db.collection('rooms').add(roomWithOffer);
        roomId = roomRef.id;
        console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
        document.querySelector(
            '#currentRoom').innerText = `Current room is ${roomRef.id} - You are the caller!`;
        // Code for creating a room above

        // Code for collecting ICE candidates below
        const callerCandidatesCollection = roomRef.collection('callerCandidates');

        peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            console.log('Got candidate: ', event.candidate);
            callerCandidatesCollection.add(event.candidate.toJSON());
        });
        // Code for collecting ICE candidates above

        peerConnection.addEventListener('track', event => {
            console.log('Got remote track:', event.streams[0]);
            event.streams[0].getTracks().forEach(track => {
                console.log('Add a track to the remoteStreamState:', track);
                remoteStreamState.addTrack(track);
            });
        });

        // Listening for remote session description below
        roomRef.onSnapshot(async snapshot => {
            const data = snapshot.data();
            if (!peerConnection.currentRemoteDescription && data.answer) {
                console.log('Got remote description: ', data.answer);
                const rtcSessionDescription = new RTCSessionDescription(data.answer);
                await peerConnection.setRemoteDescription(rtcSessionDescription);
            }
        });
        // Listening for remote session description above

        // Listen for remote ICE candidates below
        roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
        // Listen for remote ICE candidates above
    }

    const joinRoom = () => {
        document.querySelector('#createBtn').disabled = true;
        document.querySelector('#joinBtn').disabled = true;

        document.querySelector('#confirmJoinBtn').
            addEventListener('click', async () => {
                roomId = document.querySelector('#room-id').value;
                console.log('Join room: ', roomId);
                document.querySelector(
                    '#currentRoom').innerText = `Current room is ${roomId} - You are the callee!`;
                await joinRoomById(roomId);
            }, { once: true });
        // roomDialog.open();
    }

    const receiveChannelCallback = event => {
        let channel = event.channel;
        channel.onmessage = onChannelMessage;
        channel.onopen = onChannelOpen;
        channel.onclose = onChannelClose;
        setChatChannel(channel)
    }

    const joinRoomById = async (roomId) => {
        // const db = firebase.firestore();
        const roomRef = context.db.collection('rooms').doc(`${roomId}`);
        const roomSnapshot = await roomRef.get();
        console.log('Got room:', roomSnapshot.exists);

        if (roomSnapshot.exists) {
            console.log('Create PeerConnection with configuration: ', configuration);
            peerConnection = new RTCPeerConnection(configuration);
            peerConnection.ondatachannel = receiveChannelCallback;

            registerPeerConnectionListeners();
            localStreamState.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStreamState);
            });

            // Code for collecting ICE candidates below
            const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
            peerConnection.addEventListener('icecandidate', event => {
                if (!event.candidate) {
                    console.log('Got final candidate!');
                    return;
                }
                console.log('Got candidate: ', event.candidate);
                calleeCandidatesCollection.add(event.candidate.toJSON());
            });
            // Code for collecting ICE candidates above

            peerConnection.addEventListener('track', event => {
                console.log('Got remote track:', event.streams[0]);
                event.streams[0].getTracks().forEach(track => {
                    console.log('Add a track to the remoteStream:', track);
                    remoteStreamState.addTrack(track);
                });
            });

            // Code for creating SDP answer below
            const offer = roomSnapshot.data().offer;
            console.log('Got offer:', offer);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            console.log('Created answer:', answer);
            await peerConnection.setLocalDescription(answer);

            const roomWithAnswer = {
                answer: {
                    type: answer.type,
                    sdp: answer.sdp,
                },
            };
            await roomRef.update(roomWithAnswer);
            // Code for creating SDP answer above

            // Listening for remote ICE candidates below
            roomRef.collection('callerCandidates').onSnapshot(snapshot => {
                snapshot.docChanges().forEach(async change => {
                    if (change.type === 'added') {
                        let data = change.doc.data();
                        console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                    }
                });
            });
            // Listening for remote ICE candidates above
        }
    }

    const openUserMedia = async (e) => {
        const stream = await navigator.mediaDevices.getUserMedia(
            { video: true, audio: true });
        document.querySelector('#localVideo').srcObject = stream;
        setlocalStreamState(stream)
        let remoteStream = new MediaStream();
        document.querySelector('#remoteVideo').srcObject = remoteStream;
        setRemoteStreamState(remoteStream)

        console.log('Stream:', document.querySelector('#localVideo').srcObject);
        document.querySelector('#cameraBtn').disabled = true;
        document.querySelector('#joinBtn').disabled = false;
        document.querySelector('#createBtn').disabled = false;
        document.querySelector('#hangupBtn').disabled = false;
    }

    const hangUp = async (e) => {
        const tracks = document.querySelector('#localVideo').srcObject.getTracks();
        tracks.forEach(track => {
            track.stop();
        });

        if (remoteStreamState) {
            remoteStreamState.getTracks().forEach(track => track.stop());
        }

        if (peerConnection) {
            peerConnection.close();
        }

        document.querySelector('#localVideo').srcObject = null;
        document.querySelector('#remoteVideo').srcObject = null;
        document.querySelector('#cameraBtn').disabled = false;
        document.querySelector('#joinBtn').disabled = true;
        document.querySelector('#createBtn').disabled = true;
        document.querySelector('#hangupBtn').disabled = true;
        document.querySelector('#currentRoom').innerText = '';

        // Delete room on hangup
        if (roomId) {
            // const db = firebase.firestore();
            const roomRef = context.db.collection('rooms').doc(roomId);
            const calleeCandidates = await roomRef.collection('calleeCandidates').get();
            calleeCandidates.forEach(async candidate => {
                await candidate.delete();
            });
            const callerCandidates = await roomRef.collection('callerCandidates').get();
            callerCandidates.forEach(async candidate => {
                await candidate.delete();
            });
            await roomRef.delete();
        }

        document.location.reload(true);
    }

    const registerPeerConnectionListeners = () => {
        peerConnection.addEventListener('icegatheringstatechange', () => {
            console.log(
                `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
        });

        peerConnection.addEventListener('connectionstatechange', () => {
            console.log(`Connection state change: ${peerConnection.connectionState}`);
        });

        peerConnection.addEventListener('signalingstatechange', () => {
            console.log(`Signaling state change: ${peerConnection.signalingState}`);
        });

        peerConnection.addEventListener('iceconnectionstatechange ', () => {
            console.log(
                `ICE connection state change: ${peerConnection.iceConnectionState}`);
        });
    }

    return (

        <div>
            <h1>♥ Welcome to Secret Video Chat, {context.name}! ♥</h1>
            <div id="buttons">
                {localStreamState ?
                    <div>
                        <button onClick={openUserMedia} id="cameraBtn">Open Camera & Microphone</button>
                        <button onClick={createRoom} id="createBtn">Create Room</button>
                        <button onClick={joinRoom} id="joinBtn">Join Room</button>
                        <button onClick={hangUp} id="hangupBtn">Hang Up</button>

                        <div>
                            {allChatState.map((item, index) => (


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
                                            <input type="text" id="room-id" />
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
                    </div>
                    :
                    <div>
                        <button onClick={openUserMedia} id="cameraBtn">Open Camera & Microphone</button>
                        <button disabled onClick={createRoom} id="createBtn">Create Room</button>
                        <button disabled onClick={joinRoom} id="joinBtn">Join Room</button>
                        <button disabled onClick={hangUp} id="hangupBtn">Hang Up</button>
                        <text disabled onClick={sendChat}></text>
                    </div>
                }
            </div>
            <div>
                <span id="currentRoom"></span>
            </div>
            <div id="videos">
                <video id="localVideo" muted autoPlay playsInline></video>
                <video id="remoteVideo" autoPlay playsInline></video>
            </div>

        </div>
    );
}

export default Video
