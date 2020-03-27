import React, { useState, useRef, useContext, useEffect } from 'react';
import Context from '../context/Context'
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk"
import { navigate } from '@reach/router';
import staticConfig from "../staticConfig.js"

// Styling - Material US 
import Button from '@material-ui/core/Button';
import Icon from '@material-ui/core/Icon';
// import KeyboardVoiceIcon from '@material-ui/icons/KeyboardVoice';
import { makeStyles } from '@material-ui/core/styles';
import HomeIcon from '@material-ui/icons/Home';
import VideocamOffIcon from '@material-ui/icons/VideocamOff';
import VideocamIcon from '@material-ui/icons/Videocam';
// import MicOffIcon from '@material-ui/icons/MicOff';
import MicIcon from '@material-ui/icons/Mic';
import TranslateIcon from '@material-ui/icons/Translate';
import LanguageIcon from '@material-ui/icons/Language';
import PhoneDisabledIcon from '@material-ui/icons/PhoneDisabled';
import PhoneEnabledIcon from '@material-ui/icons/PhoneEnabled';
import SendIcon from '@material-ui/icons/Send';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';


const useStyles = makeStyles(theme => ({
    button: {
        margin: theme.spacing(1),
    },
}));

// Keep WebRTC goodies in global scope
let pc
let makingOffer
let polite
let ignoreOffer
let channel
let readRoom
let unsub
let unsubscribes
const initRTC = () => {
    pc = null
    makingOffer = false
    polite = false
    ignoreOffer = false
    channel = null
    readRoom = null
    unsub = null
    unsubscribes = []
}
initRTC()

// TODO investigate why this is needed
let chatLog
const initChatLog = () => {
    chatLog = []
}
initChatLog()

const Chat = (props) => {
    // Styling - Material US 
    const classes = useStyles();

    // context stores the db connection
    const context = useContext(Context)
    // refs for various HTML elements
    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)

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
    const [connected, setConnected] = useState(false)
    // buttons buttons buttons
    const [speechState, setSpeechState] = useState(false)
    const [translationState, setTranslationState] = useState(false)
    // language
    const [spokenLang, setSpokenLang] = useState('en-US')
    const [translatedLang, setTranslatedLang] = useState('en')

    useEffect(() => {
        window.addEventListener("beforeunload", event => { hangUp() })
    })

    useEffect(() => {
        // When entering a Chat, either create a new room or join one
        if (context.room) {
            context.db.collection('countries').doc(props.country).get()
                .then(countrySnapshot => {
                    if (!countrySnapshot.exists) {
                        context.db.collection('countries').doc(props.country).set({ readRoom: context.room })
                        startRoom()
                    } else {
                        readRoom = countrySnapshot.data().readRoom
                        context.db.collection('countries').doc(props.country).delete()
                        joinRoom()
                    }
                })
        }
    }, [context.room])

    useEffect(() => {
        // onresult event handler for Webkit Speech
        if (context.webkitSpeech) {
            context.webkitSpeech.onresult = function (event) {
                let speechText = event.results[0][0].transcript.toLowerCase()
                setSpeechText(speechText)
                let speechObj = { sender: context.name, text: speechText, avatar: context.avatar }
                if (channel && channel.readyState == 'open') {
                    channel.send(JSON.stringify(speechObj))
                }
                chatLog = [...chatLog, speechObj]
                setChatLogState(chatLog)
            }
            context.webkitSpeech.onend = e => {setSpeechState(false)}
        }
    }, [context.webkitSpeech, chatLogState]) // TODO debug why listening on setChatLogState doesn't work

    useEffect(() => {
        if (context.speechConfig && context.audioConfig) {
            setTranslationState(false)
        } else {
            setTranslationState(true)
        }
    }, [context.speechConfig, context.audioConfig])

    // to keep the scroll bar for the chat message to be scrolled down
    useEffect(() => {
        if (chatLogState && messagesEndRef) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [chatLogState, messagesEndRef])

    // set up WebRTC peer connection with the necessary listeners
    const initializePeerConnection = () => {
        pc = new RTCPeerConnection(staticConfig.rtcConfig)
        // inits
        remoteVideoRef.current.srcObject = new MediaStream();
        // handy console logging
        registerPeerConnectionListeners();

        // event handler for negotiations (track, data channel adds)
        pc.onnegotiationneeded = () => {
            makingOffer = true;
            pc.setLocalDescription()
                .then(() => {
                    return context.db.collection('rooms').doc(context.room)
                        .set({ description: pc.localDescription.toJSON() })
                })
                .finally(() => makingOffer = false)
        };
        // event handler for ice candidate updates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                context.db.collection('rooms').doc(context.room).collection('candidates').add(event.candidate.toJSON());
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
            channel.onmessage = onChannelMessage
            channel.onopen = sendIntro
        }

        // Initializer for listening on write room snapshots.
        // The only change we ever listen on the write room is for receiving the read room id.
        // once it is set, we will ignore any future room updates.
        unsub = context.db.collection('rooms').doc(context.room).onSnapshot(snapshot => {
            // ignore your own writes
            if (snapshot.metadata.hasPendingWrites) {
                return
            }
            // edge case
            if (!snapshot.exists) {
                console.log("Room deleted unexpectedly, leaving chat")
                hangUp()
                // get a new room
                context.setupNameDbRoomToken()
                return
            }

            if (!readRoom && snapshot.data().readRoom) {
                readRoom = snapshot.data().readRoom
                initializeReadRoomOnSnapshots(pc)
            }
        })
        unsubscribes.push(unsub)
    }

    // Initializer for listening on read room snapshots.
    // This cannot be set until the read room id is known.
    const initializeReadRoomOnSnapshots = () => {
        // listen for new offers/answers
        unsub = context.db.collection('rooms').doc(readRoom).onSnapshot(snapshot => {
            // ignore your own writes (happens during joinRoom() flow)
            if (snapshot.metadata.hasPendingWrites) {
                return
            }
            // ignore empty data
            if (JSON.stringify(snapshot.data()) == '{}') {
                return
            }
            // edge case
            if (!snapshot.exists) {
                console.log("Room deleted unexpectedly, leaving chat")
                hangUp()
                // get a new room
                context.setupNameDbRoomToken()
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
                    if (description.type != "offer") {
                        console.log("unexpected state during negotiation")
                        return
                    }
                    pc.setLocalDescription()
                        .then(() => {
                            return context.db.collection('rooms').doc(context.room)
                                .set({ description: pc.localDescription.toJSON() })
                        })
                })
        })
        unsubscribes.push(unsub)

        // listen for new ice candidates
        unsub = context.db.collection('rooms').doc(readRoom)
            .collection('candidates').onSnapshot(snapshot => {
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
        unsubscribes.push(unsub)
    }

    const startRoom = () => {
        // the starter of the room is destined to be polite
        polite = true
        initializePeerConnection()
    }

    const joinRoom = () => {
        initializePeerConnection()
        initializeReadRoomOnSnapshots()
        pc.setLocalDescription()
            .then(() => {
                channel = pc.createDataChannel("sendChannel")
                channel.onopen = sendIntro
                channel.onmessage = onChannelMessage
                context.db.collection('rooms').doc(context.room)
                    .set({ description: pc.localDescription.toJSON() })
            })
            .then(() => {
                // update by "passing back" room id
                context.db.collection('rooms').doc(readRoom).update({ readRoom: context.room })
            })
    }

    const hangUp = () => {
        // remove all onSnapshot subscriptions
        unsubscribes.forEach(unsub => unsub())
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(track => track.stop())
        }
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop())
        }
        if (pc) {
            pc.close()
        }

        // keep track of async deletions so we can re-init webrtc globals after they are completed
        let promises = []
        let p

        p = context.db.collection('countries').doc(props.country).delete()
        promises.push(p)
        // delete your own candidates
        p = context.db.collection('rooms').doc(context.room).collection('candidates').get()
            .then(candidates => {
                candidates.forEach(candidate => {
                    context.db.collection('rooms').doc(context.room).collection('candidates').doc(candidate.id).delete()
                })
            })
        promises.push(p)
        p = context.db.collection('rooms').doc(context.room).set({})
        promises.push(p)
        if (readRoom) {
            // delete readRoom candidates (better chance of full cleanup)
            p = context.db.collection('rooms').doc(readRoom).collection('candidates').get()
                .then(candidates => {
                    candidates.forEach(candidate => {
                        context.db.collection('rooms').doc(readRoom).collection('candidates').doc(candidate.id).delete()
                    })
                })
            promises.push(p)
            p = context.db.collection('rooms').doc(readRoom).set({})
            promises.push(p)
        }
        // init webRTC global vars once cleanup is complete
        Promise.all(promises).then(() => { initRTC(); initChatLog() })
        navigate(`/leave/${props.country}`)
    }

    const registerPeerConnectionListeners = () => {
        pc.addEventListener('icegatheringstatechange', () => {
            console.log(
                `ICE gathering state changed: ${pc.iceGatheringState}`);
        });

        pc.addEventListener('connectionstatechange', () => {
            console.log(`Connection state change: ${pc.connectionState}`);
            if (pc.connectionState == 'connected') {
                setConnected(true)
            } else {
                setConnected(false)
            }
        });

        pc.addEventListener('signalingstatechange', () => {
            console.log(`Signaling state change: ${pc.signalingState}`);
        });

        pc.addEventListener('iceconnectionstatechange ', () => {
            console.log(
                `ICE connection state change: ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === "failed") {
                pc.restartIce();
            }
        });
    }

    // event hiandler for channel received
    const onChannelMessage = event => {
        let chatObj = JSON.parse(event.data)
        chatLog = [...chatLog, chatObj]
        setChatLogState(chatLog)
    }

    const sendIntro = event => {
        let chatObj = { sender: context.name, text: `*connected to ${context.name}!*` }
        channel.send(JSON.stringify(chatObj))
    }

    // event handler for chat sending
    const sendChatMessage = e => {
        e.preventDefault();
        if (!chatText) {
            return;
        }
        let chatObj = { sender: context.name, text: chatText, avatar: context.avatar }
        if (channel && channel.readyState == 'open') {
            channel.send(JSON.stringify(chatObj))
        }
        chatLog = [...chatLog, chatObj]
        setChatLogState(chatLog)
        setChatText("")
    }

    const startWebkitSpeech = e => {
        setSpeechState(true)
        context.webkitSpeech.lang = spokenLang
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
        let translationText = result.translations.get(translatedLang)
        setTranslatedText(translationText)
        let translationObj = { sender: context.name, text: translationText, avatar: context.avatar }
        if (channel && channel.readyState == 'open') {
            channel.send(JSON.stringify(translationObj))
        }
        chatLog = [...chatLog, translationObj]
        setChatLogState(chatLog)
        setTranslationState(false)
    }

    return (
        <div style={{width: "100%", height: "100%", zIndex: "2", position: "absolute"}}>
        <div id="chatRoom">
            <div class='chatHeader'>
                <h1 class='chatTitle'>{props.country} Chat Room</h1>
                <Button style={{ height: "45px" }} onClick={hangUp} id="hangupBtn" variant="contained" color="secondary" className={classes.button} endIcon={<HomeIcon />} >Leave</Button>
            </div>
            <div id="buttons">
                <Button style={{ height: "45px" }} onClick={e => toggleTrack('audio')} id="toggleAudio" variant="contained" color="primary" className={classes.button} endIcon={audioState ? <PhoneDisabledIcon /> : <PhoneEnabledIcon />}>Turn {audioState ? "Off" : "On"} Audio</Button>
                <Button style={{ height: "45px" }} onClick={e => toggleTrack('video')} id="toggleVideo" variant="contained" color="primary" className={classes.button} endIcon={videoState ? <VideocamOffIcon /> : <VideocamIcon />}>Turn {videoState ? "Off" : "On"} Video</Button>

                <div id="videos">
                    <video id="remoteVideo" autoPlay playsInline ref={remoteVideoRef}></video>
                    <video id="localVideo" muted autoPlay playsInline ref={localVideoRef}></video>
                </div>
            </div>
            <div className="chatSet">
                <div className="scrollBar" ref={messagesEndRef}>
                    {chatLogState.map((item, index) => (

                        <div key={index}>
                            {item.sender === context.name ?

                                <div className="balloon_r">
                                    <div className="faceicon" style={{ display: "block" }}>
                                        <div style={{ zoom: '140%' }} className={'x' + (context.avatar[0]).toString()}>
                                            <img src={process.env.PUBLIC_URL + '/color_atlas.gif'} />
                                        </div>
                                        <div style={{ zoom: '140%' }} className={'y' + (context.avatar[1]).toString()}>
                                            <img src={process.env.PUBLIC_URL + '/eyes_atlas.gif'} />
                                        </div>
                                        <div style={{ zoom: '90%' }} className={'z' + (context.avatar[2]).toString()}>
                                            <img src={process.env.PUBLIC_URL + '/mouth_atlas.gif'} />
                                        </div>
                                        <p style={{ maxWidth: '70px', wordWrap: 'break-word', marginTop: '60px', fontSize: '12px', marginLeft: '-5px' }}>{item.sender} (me)</p>

                                    </div>
                                    <div className="says">
                                        <p>{item.text}</p></div>
                                </div>

                                :

                                item.avatar
                                    ?
                                    <div className="balloon_l">
                                        <div className="faceicon" style={{ display: "block", marginRight: '5px' }}>
                                            <div style={{ zoom: '140%' }} className={'x' + (item.avatar[0]).toString()}>
                                                <img src={process.env.PUBLIC_URL + '/color_atlas.gif'} />
                                            </div>
                                            <div style={{ zoom: '140%' }} className={'y' + (item.avatar[1]).toString()}>
                                                <img src={process.env.PUBLIC_URL + '/eyes_atlas.gif'} />
                                            </div>
                                            <div style={{ zoom: '90%' }} className={'z' + (item.avatar[2]).toString()}>
                                                <img src={process.env.PUBLIC_URL + '/mouth_atlas.gif'} />
                                            </div>
                                            <p style={{ maxWidth: '70px', wordWrap: 'break-word', marginTop: "60px", fontSize: '12px' }}>{item.sender}</p>
                                        </div>
                                        <div className="says">
                                            <p>{item.text}</p></div>
                                    </div>
                                    :
                                    <div>
                                        <p>{item.text}</p>
                                    </div>

                            }
                        </div>
                    ))
                    }


                </div>
                <div className="messageForm">

                    <form className="messageOnSubmit" onSubmit={sendChatMessage}>
                        <input style={{ height: "40px", width: "150px", fontSize: "20px", marginTop: '12px', marginLeft: '10px' }} type="text" onChange={e => setChatText(e.target.value)} value={chatText} />
                        <Button disabled={!chatText} style={{ width: '9px', height: "45px", marginTop: '3px', marginLeft: '15px' }} type="submit" variant="contained" color="primary" className={classes.button}><SendIcon /></Button>
                    </form>
                    <Button style={{ display: "inline-block" }} onClick={startWebkitSpeech} disabled={speechState} style={{ width: '9px', height: "45px", marginTop: '3px' }} type="submit" variant="contained" color="primary" className={classes.button}><MicIcon /></Button>
                </div>



<div className="translationButtons">
                <div>
                    {/* <label><LanguageIcon />Speaking in </label> */}
                    <label>Speaking in </label>
                    <FormControl variant="outlined">

                    <Select style={{width: "119px", height: "45px"}} value={spokenLang} onChange={e=> setSpokenLang(e.target.value) } labelId="demo-simple-select-outlined-label">
                        <MenuItem value="en-US" default>English</MenuItem>
                        <MenuItem value="ko-KR">한국</MenuItem>
                        <MenuItem value="zh-CN">中文</MenuItem>
                        <MenuItem value="ja-JP">日本語</MenuItem>
                        <MenuItem value="es-ES">español</MenuItem>
                        <MenuItem value="fr-FR">français</MenuItem>
                        <MenuItem value="pt-PT">português</MenuItem>
                        <MenuItem value="ru-RU">русский</MenuItem>
                    </Select>
                    </FormControl>
                </div>
                <div>
                    {/* <label><LanguageIcon />Translate to </label> */}
                    <label>Translate to </label>
                    <FormControl variant="outlined">
                    <Select style={{width: "119px", height: "45px"}} value={translatedLang} onChange={e=> setTranslatedLang(e.target.value)} labelId="demo-simple-select-outlined-label">
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="ko">한국</MenuItem>
                        <MenuItem value="zh-Hant">中文</MenuItem>
                        <MenuItem value="ja">日本語</MenuItem>
                        <MenuItem value="es">español</MenuItem>
                        <MenuItem value="fr">français</MenuItem>
                        <MenuItem value="pt">português</MenuItem>
                        <MenuItem value="ru">русский</MenuItem>
                    </Select>
                    </FormControl>
                </div>
                <div>
                    <form onSubmit={e => {
                        e.preventDefault()
                        setTranslationState(true)
                        context.speechConfig.speechRecognitionLanguage = spokenLang
                        context.speechConfig.addTargetLanguage(translatedLang)
                        let recognizer = new SpeechSDK.TranslationRecognizer(context.speechConfig, context.audioConfig)
                        recognizer.recognizeOnceAsync(onTranslationDone, e=> {console.log(e); setTranslationState(false)})
                    }}>
                        <Button
                        style={{ height: "45px" , marginTop: "18px", marginLeft: "6px", marginRight: "0px"}}
                        disabled={translationState} type="submit" variant="contained" color="secondary" className={classes.button} endIcon={<TranslateIcon />}>Speak</Button>
                    </form>
                </div>
</div>
            </div>



        </div >
        </div>

    );
}

export default Chat
