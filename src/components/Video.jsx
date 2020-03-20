
import React, { useState, useRef, useContext } from 'react';
import Context from '../context/Context'

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
let pc = new RTCPeerConnection(configuration)
let makingOffer = false
let polite = false
let ignoreOffer = false

// 
let writeRoom = null
let readRoom = null

const Video = () => {
    const context = useContext(Context)

    const [writeRoomState, setWriteRoomState] = useState(null)
    const [readRoomState, setReadRoomState] = useState(null)

    // use refs for video stream as srcObject cannot be set by using states
    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)

    const initializePeerConnection = (pc) => {
        registerPeerConnectionListeners(pc);

        pc.onnegotiationneeded = () => {
            console.log("negotiation needed!")
            makingOffer = true;
            pc.setLocalDescription()
                .then(() => {
                    console.log('LocalDescription: ', pc.localDescription)
                    const description = pc.localDescription.toJSON()
                    return context.db.collection('rooms').doc(writeRoom).update({description})
                })
                .finally(() => makingOffer = false)
        };

        pc.addEventListener('icecandidate', event => {
            console.log('candidate: ', event.candidate)
            if (event.candidate) {
                context.db.collection('rooms').doc(writeRoom).collection('candidates').add(event.candidate.toJSON());
            }
        }
        )

        remoteVideoRef.current.srcObject = new MediaStream();

        pc.addEventListener('track', event => {
            console.log('Got remote track:', event.streams[0]);
            event.streams[0].getTracks().forEach(track => {
                console.log('Add a track to the remoteStream:', track);
                remoteVideoRef.current.srcObject.addTrack(track);
            });
        });
    }

    const initializeWriteRoomOnSnapshots = (pc) => {
        context.db.collection('rooms').doc(writeRoom).onSnapshot(snapshot => {
            if (snapshot.data().readRoom && !readRoom) {
                readRoom = snapshot.data().readRoom
                console.log("received write snapshot: ", snapshot.data())
                setReadRoomState(readRoom)
                initializeReadRoomOnSnapshots(pc)
            }
        })
        
    }

    const initializeReadRoomOnSnapshots = (pc) => {
        context.db.collection('rooms').doc(readRoom).onSnapshot(snapshot => {
            console.log('room snapshot: ', snapshot.data())

            let description = snapshot.data().description
            const offerCollision = (description.type == "offer") &&
                (makingOffer || pc.signalingState != "stable");

            ignoreOffer = !polite && offerCollision
            if (ignoreOffer) {
                return;
            }

            console.log('setting RemoteDescription: ', description)
            pc.setRemoteDescription(new RTCSessionDescription((description)))
            .then(() => {
                if (description.type == "offer") {
                    pc.setLocalDescription()
                    .then(() => {
                        console.log('LocalDescription: ', pc.localDescription)
                        let description = pc.localDescription.toJSON()
                        return context.db.collection('rooms').doc(writeRoom).update({description})
                    })
                }
            })
        })

        context.db.collection('rooms').doc(readRoom).collection('candidates').onSnapshot(snapshot => {
            // ignore your own writes
            let myWrite = snapshot.metadata.hasPendingWrites ? true : false;
            if (myWrite) {
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
        // TODO better politeness
        polite = true

        let offer
        pc.createOffer()
        .then(offerObj => {
            offer = offerObj
            let description = offer.toJSON()
            return context.db.collection('rooms').add({description})
        })
        .then(roomSnapshot => {
            writeRoom = roomSnapshot.id
            setWriteRoomState(writeRoom)

            initializePeerConnection(pc)
            initializeWriteRoomOnSnapshots(pc)
            pc.setLocalDescription(offer)
        })
        .then(() => {
            console.log('LocalDescription: ', pc.localDescription)
        })
    }

    const joinRoom = () => {
        context.db.collection('rooms').doc(readRoom).get()
        .then(roomSnapshot => {
            initializePeerConnection(pc)
            let offer = roomSnapshot.data().description
            console.log('setting RemoteDescription: ', offer)
            return pc.setRemoteDescription(new RTCSessionDescription((offer)))
        })
        // .then(() => pc.createAnswer())
        .then(() => pc.setLocalDescription())
        .then(() => {
            console.log('LocalDescription: ', pc.localDescription)
            let description = pc.localDescription.toJSON()
            return context.db.collection('rooms').add({description})
        })
        .then((roomSnapshot) => {
            writeRoom = roomSnapshot.id
            setWriteRoomState(writeRoom)
            initializeReadRoomOnSnapshots(pc)

            let updated = {readRoom: writeRoom}
            context.db.collection('rooms').doc(readRoom).update(updated)
        })
    }

    const openUserMedia = (e) => {
        navigator.mediaDevices.getUserMedia(
            { video: true, audio: true })
        .then(stream => {
            localVideoRef.current.srcObject = stream

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        })
    }

    const hangUp = (e) => {
        const tracks = document.querySelector('#localVideo').srcObject.getTracks();
        tracks.forEach(track => {
            track.stop();
        });

        if (remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }

        if (pc) {
            pc.close();
        }

        // TODO handle hanging up vs turning off video
        document.querySelector('#localVideo').srcObject = null;
        document.querySelector('#remoteVideo').srcObject = null;

        // Delete room on hangup
        if (writeRoom) {
            context.db.collection('rooms').doc(writeRoom).collection('candidates').get()
            .then(candidates => {
                candidates.forEach(candidate => {
                    candidate.delete();
                })
                context.db.collection('rooms').doc(writeRoom).get()
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

    const setReadRoom = (e) => {
        readRoom = e.target.value
        setReadRoomState(readRoom)
    }

    return (
        <div>
            <h1>♥ Welcome to Secret Video Chat, {context.name}! ♥</h1>
            <div>Your read room ID is {readRoomState}</div>
            <div>Your write room ID is {writeRoomState}</div>
            <div id="buttons">
                <button onClick={openUserMedia} id="cameraBtn">Open Camera & Microphone</button>
                <button onClick={createRoom} id="createBtn">Create Room</button>
                <button onClick={joinRoom} id="joinBtn">Join Room</button>
                <button onClick={hangUp} id="hangupBtn">Hang Up</button>
            </div>


            <div>
                <h2 id="my-dialog-title">Join Room</h2>
                <div id="my-dialog-content">
                    Enter ID for Room to Join:
                <div>
                        <input type="text" id="room-id" onChange={setReadRoom} />
                        <p>Room ID</p>
                    </div>
                </div>
                <footer>
                    <button type="button">Cancel</button>
                    <button id="confirmJoinBtn" type="button">Join</button>
                </footer>
            </div>

            <div id="videos">
                <video id="localVideo" muted autoPlay playsInline ref={localVideoRef}></video>
                <video id="remoteVideo" autoPlay playsInline ref={remoteVideoRef}></video>
            </div>
        </div >
    );
}

export default Video
