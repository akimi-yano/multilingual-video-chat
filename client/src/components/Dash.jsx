import React, { useState } from 'react'
import axios from 'axios'

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
let peerConnection = null
let roomId = null;


const Dash = () => {
    const [localStreamState, setLocalStreamState] = useState(null)
    const [remoteStreamState, setRemoteStreamState] = useState(null)

    async function openUserMedia(e) {
        const localStream = await navigator.mediaDevices.getUserMedia(
            { video: true, audio: true });
        document.querySelector('#localVideo').srcObject = localStream;
        setLocalStreamState(localStream)

        const remoteStream = new MediaStream()
        document.querySelector('#remoteVideo').srcObject = remoteStream;
        setRemoteStreamState(remoteStream)

        // TODO make it more Reactive
        document.querySelector('#cameraBtn').disabled = true;
        document.querySelector('#confirmJoinBtn').disabled = false;
        document.querySelector('#createBtn').disabled = false;
        document.querySelector('#hangupBtn').disabled = false;
    }


    async function hangUp(e) {
        console.log("HI")
        const tracks = localStreamState.getTracks();
        tracks.forEach(track => {
            track.stop();
        });
        setLocalStreamState(null)

        if (remoteStreamState) {
            remoteStreamState.getTracks().forEach(track => track.stop());
        }

        if (peerConnection) {
            peerConnection.close();
        }
        // document.querySelector('#localVideo').autoPlay = false;
        document.querySelector('#localVideo').srcObject = null;
        document.querySelector('#remoteVideo').srcObject = null;
        document.querySelector('#cameraBtn').disabled = false;
        document.querySelector('#confirmJoinBtn').disabled = true;
        document.querySelector('#createBtn').disabled = true;
        document.querySelector('#hangupBtn').disabled = true;
        document.querySelector('#currentRoom').innerText = '';

        // Delete room on hangup
        // if (roomId) {
        //   const db = firebase.firestore();
        //   const roomRef = db.collection('rooms').doc(roomId);
        //   const calleeCandidates = await roomRef.collection('calleeCandidates').get();
        //   calleeCandidates.forEach(async candidate => {
        //     await candidate.delete();
        //   });
        //   const callerCandidates = await roomRef.collection('callerCandidates').get();
        //   callerCandidates.forEach(async candidate => {
        //     await candidate.delete();
        //   });
        //   await roomRef.delete();
        // }

        document.location.reload(true);
    }

    // const [offerState, setOfferState] = useState({})
    async function createRoom() {
        document.querySelector('#createBtn').disabled = true;
        document.querySelector('#confirmJoinBtn').disabled = true;



        // const db = firebase.firestore();

        // console.log('Create PeerConnection with configuration: ', configuration);
        peerConnection = new RTCPeerConnection(configuration);

        registerPeerConnectionListeners();
        //   console.log("***",localStream)
        localStreamState.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamState);
        });

        // // Code for creating a room below
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log('Created offer:', offer);


        // axios.post("https://fir-rtc-bf5c0.firebaseapp.com/api/offer", offer)
        axios.post("http://localhost:5000/api/offer", offer)
            .then(response => {
                roomId = response.data.roomId
                console.log(`New room created with SDP offer. Room ID: ${roomId}`);
                document.querySelector('#currentRoom').innerText =
                    `Current room is ${roomId} - You are the caller!`;

                peerConnection.addEventListener('icecandidate', event => {
                    if (!event.candidate) {
                        console.log('Got final candidate!');
                        return;
                    }
                    console.log('Got candidate: ', event.candidate);
                    axios.post("http://localhost:5000/api/caller-ice",
                        {
                            roomId: roomId,
                            candidate: event.candidate.toJSON()
                        })
                        .then(response => {
                            console.log('Got caller ice: ', response)
                        })
                        .catch(error => console.log(error));
                });

                peerConnection.addEventListener('track', event => {
                    console.log('Got remote track:', event.streams[0]);
                    event.streams[0].getTracks().forEach(track => {
                        console.log('Add a track to the remoteStreamState:', track);
                        remoteStreamState.addTrack(track);
                    });
                });
            })
            .catch(error => console.log(error))

        // // Listening for remote session description below
        // roomRef.onSnapshot(async snapshot => {
        //   const data = snapshot.data();
        //   if (!peerConnection.currentRemoteDescription && data.answer) {
        //     console.log('Got remote description: ', data.answer);
        //     const rtcSessionDescription = new RTCSessionDescription(data.answer);
        //     await peerConnection.setRemoteDescription(rtcSessionDescription);
        //   }
        // });
        // // Listening for remote session description above

        // // Listen for remote ICE candidates below
        // roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
        //   snapshot.docChanges().forEach(async change => {
        //     if (change.type === 'added') {
        //       let data = change.doc.data();
        //       console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
        //       await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        //     }
        //   });
        // });
        // Listen for remote ICE candidates above
    }
    async function joinRoom() {
        // document.querySelector('#createBtn').disabled = true;
        // document.querySelector('#joinBtn').disabled = true;
        // document.querySelector('#confirmJoinBtn').
        //     addEventListener('click', async () => {
        // roomId = document.querySelector('#room-id').value;
        //         console.log('Join room: ', roomId);
        //         document.querySelector(
        //             '#currentRoom').innerText = `Current room is ${roomId} - You are the callee!`;
        roomId = document.querySelector('#room-id').value
        await joinRoomById(roomId);
        // }, { once: true });
        // roomDialog.open();
    }
    async function joinRoomById(roomId) {
        axios.get(`http://localhost:5000/api/rooms/${roomId}`)
            .then(async response => {
                let roomSnapshot = response.data.roomSnapshot
                console.log('Got room snapshot: ', roomSnapshot);
                // if (roomSnapshot) {
                console.log('Create PeerConnection with configuration: ', configuration);
                peerConnection = new RTCPeerConnection(configuration);
                registerPeerConnectionListeners();
                localStreamState.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStreamState);
                });

                peerConnection.addEventListener('icecandidate', event => {
                    if (!event.candidate) {
                        console.log('Got final candidate!');
                        return;
                    }
                    console.log('Got candidate: ', event.candidate);
                    axios.post("http://localhost:5000/api/callee-ice",
                        {
                            roomId: roomId,
                            candidate: event.candidate.toJSON()
                        })
                        .then(response => console.log('Got callee ice: ', response))
                        .catch(error => console.log(error))
                });

                peerConnection.addEventListener('track', event => {
                    console.log('Got remote track:', event.streams[0]);
                    event.streams[0].getTracks().forEach(track => {
                        console.log('Add a track to the remoteStreamState:', track);
                        remoteStreamState.addTrack(track);
                    });
                });

                // }
                // Code for creating SDP answer below
                const offer = roomSnapshot.offer;
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
                axios.post(`http://localhost:5000/api/rooms/${roomId}`, roomWithAnswer)
                    .then(response => console.log('got room with answer: ', response))
                    .catch(error => console.log(error))
                // Code for creating SDP answer above
            })
            .catch(error => console.log(error))

        //     // Code for creating SDP answer below
        //     const offer = roomSnapshot.data().offer;
        //     console.log('Got offer:', offer);
        //     await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        //     const answer = await peerConnection.createAnswer();
        //     console.log('Created answer:', answer);
        //     await peerConnection.setLocalDescription(answer);

        //     const roomWithAnswer = {
        //         answer: {
        //             type: answer.type,
        //             sdp: answer.sdp,
        //         },
        //     };
        //     await roomRef.update(roomWithAnswer);
        //     // Code for creating SDP answer above

        //     // Listening for remote ICE candidates below
        //     roomRef.collection('callerCandidates').onSnapshot(snapshot => {
        //         snapshot.docChanges().forEach(async change => {
        //             if (change.type === 'added') {
        //                 let data = change.doc.data();
        //                 console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
        //                 await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        //             }
        //         });
        //     });
        // Listening for remote ICE candidates above
    }



    function registerPeerConnectionListeners() {
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
            <h1>♥ Welcome to Aki's Secret Video Chat ♥</h1>
            <div id="buttons">
                <button onClick={openUserMedia} id="cameraBtn">Open Camera & Microphone</button>

                {localStreamState ?
                    <div>
                        <button onClick={createRoom} id="createBtn">Create Room</button>
                        <button onClick={hangUp} id="hangupBtn">Hang Up</button>
                        <div
                            id="room-dialog"
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="my-dialog-title"
                            aria-describedby="my-dialog-content">
                            <div>
                                <h2 id="my-dialog-title">Join Room</h2>
                                <div id="my-dialog-content">Enter ID for Room to Join:</div>
                                <p>Room ID</p><input type="text" id="room-id" />
                            </div>
                            <div>
                                <button type="button">Cancel</button>
                                <button onClick={joinRoom} id="confirmJoinBtn" type="button">Join</button>
                            </div>
                        </div>
                    </div>
                    :
                    <div>
                        <button disabled>Create room</button>
                        <button disabled>Hangup</button>
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
    )
}

export default Dash
