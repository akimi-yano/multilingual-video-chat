
import React, { useState, useRef, useContext } from 'react';
import Context from '../context/Context'
import { resolve } from 'dns';

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

// Room data is also tied to signaling, but we need to also maintain a React state
// copy for UI rendering
let writeRoom = null
let readRoom = null

const Video = () => {
    // context stores the db connection
    const context = useContext(Context)

    // the React state counterpart to writeRoom and readRoom, for UI needs
    const [writeRoomState, setWriteRoomState] = useState(null)
    const [readRoomState, setReadRoomState] = useState(null)
    const [audioState, setAudioState] = useState(false)
    const [videoState, setVideoState] = useState(false)

    // refs for video stream as srcObject cannot be set by using React states
    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)

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
                    return context.db.collection('rooms').doc(writeRoom).update({description})
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
            console.log('track event!')
            event.streams[0].getTracks().forEach(track => {
                remoteVideoRef.current.srcObject.addTrack(track)
            })
        }
    }

    // Initializer for listening on write room snapshots.
    // The only change we ever listen on the write room is for receiving the read room id.
    // once it is set, we will ignore any future room updates.
    const initializeWriteRoomOnSnapshots = (pc) => {
        context.db.collection('rooms').doc(writeRoom).onSnapshot(snapshot => {
            if (snapshot.data().readRoom && !readRoom) {
                readRoom = snapshot.data().readRoom
                setReadRoomState(readRoom)
                initializeReadRoomOnSnapshots(pc)
            }
        })
        
    }

    // Initializer for listening on read room snapshots.
    // This cannot be set until the read room id is known.
    const initializeReadRoomOnSnapshots = (pc) => {
        // listen for new offers/answers
        context.db.collection('rooms').doc(readRoom).onSnapshot(snapshot => {
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
                        return context.db.collection('rooms').doc(writeRoom).update({description})
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
    }

    const joinRoom = () => {
        context.db.collection('rooms').doc(readRoom).get()
        .then(roomSnapshot => {
            initializePeerConnection(pc)
            let offer = roomSnapshot.data().description
            return pc.setRemoteDescription(new RTCSessionDescription((offer)))
        })
        .then(() => pc.setLocalDescription())
        .then(() => {
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

    const openUserMedia = () => {
        // only allow this to be called once
        if (localVideoRef.current.srcObject) {
            return new Promise((resolve) => resolve())
        }

        return navigator.mediaDevices.getUserMedia(
            {audio: true, video: true})
        .then(stream => {
            localVideoRef.current.srcObject = stream
            stream.getTracks().forEach(track => {
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
        .catch(error => console.log(error))
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
                <button onClick={() => openUserMedia(audioState, videoState)} id="cameraBtn">Open Camera & Microphone</button>
                <button onClick={toggleAudio} id="toggleAudio">Toggle Audio</button>
                <button onClick={toggleVideo} id="toggleVideo">Toggle Video</button>
                <button onClick={createRoom} id="createBtn">Create Room</button>
                <button onClick={hangUp} id="hangupBtn">Hang Up</button>
            </div>
            <div>
                <h2 id="my-dialog-title">Join Room</h2>
                <div id="my-dialog-content">
                    Enter ID for Room to Join:
                <div>
                        <input type="text" id="room-id" onChange={setReadRoom} />
                        <p>Room ID</p>
                        <button onClick={joinRoom} id="joinBtn">Join Room</button>
                    </div>
                </div>
            </div>

            <div id="videos">
                <video id="localVideo" muted autoPlay playsInline ref={localVideoRef}></video>
                <video id="remoteVideo" autoPlay playsInline ref={remoteVideoRef}></video>
            </div>
        </div>
    );
}

export default Video
