import React,{useEffect, useState} from 'react'
import Context from "./Context"
import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk"
import firebaseConfig from "../config/firebaseConfig.js"
import msTokenUrl from "../config/tokenUrl.js"
import cookie from 'cookie'

// dev - make sure to add bypass in server/local.settings.json:
// https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=macos%2Ccsharp%2Cbash#local-settings-file
// const tokenUrl = 'http://localhost:7071/api/token'
// deployed - make sure cors is configured on Azure portal via Function Apps -> Platform Features
// const tokenUrl = 'in/firebaseConfig.js'

// local dev
const fbTokenUrl = `http://localhost:5001/${firebaseConfig.projectId}/us-central1/token?authId=`
// deployed
// const tokenUrl = `https://${firebaseConfig.projectId}.firebaseapp.com/api/token?authId=`

const Contexts = (props) => {
    // user name
    const [name, setName] = useState("anonymous")
    // avatar
    const [avatar, setAvatar]=useState([1,1,1])
    // firebase connection
    const [db, setDb] = useState(null)
    // room
    const [room, setRoom] = useState(null)
    // speech recognition
    const [webkitSpeech, setWebkitSpeech] = useState(null);
    // translation
    const [speechConfig, setSpeechConfig] = useState(null);
    const [audioConfig, setAudioConfig] = useState(null);

    useEffect(()=>{
        setupDbAndRoom()
        setupWebkitSpeech()
        setupTranslator()
    },[])

    useEffect(() => {
        let cookies = cookie.parse(document.cookie)
        if (cookies.token) {
            firebase.auth().signInWithCustomToken(cookies.token)
            .catch(function(error) {
                console.log('auth failed, re-fetching token')
                setupToken(name)
            })
        } else {
            setupToken(name)
        }
    }, [name])

    const setupToken = (authId) => {
        fetch(fbTokenUrl + authId)
        .then(resp => resp.json())
        .then(body => firebase.auth().signInWithCustomToken(body.token).catch(error => console.log(error)))
    }

    const setupDbAndRoom = () => {
        firebase.initializeApp(firebaseConfig)
        let database = firebase.firestore()
        setDb(database)

        let cookies = cookie.parse(document.cookie)
        if (cookies.room) {
            database.collection('rooms').doc(cookies.room).get()
            .then(snapshot => {
                if (snapshot.exists) {
                    setRoom(cookies.room)
                } else {
                    createRoom(database)
                }
            })
        } else {
            createRoom(database)
        }
    }

    const createRoom = (database) => {
        database.collection('rooms').add({})
        .then(snapshot => {
            setRoom(snapshot.id)
            document.cookie = `room=${snapshot.id}`
        })
    }

    const setupWebkitSpeech = () => {
        let rec = new window.webkitSpeechRecognition()
        rec.onspeechend = function (event) {
            rec.stop();
        }
        setWebkitSpeech(rec)
    }

    const setupTranslator = () => {
        window.fetch(msTokenUrl)
        .then(res => res.json())
        .then(body => {
            setSpeechConfig(SpeechSDK.SpeechTranslationConfig.fromAuthorizationToken(body.token, body.region))
            setAudioConfig(SpeechSDK.AudioConfig.fromDefaultMicrophoneInput())
        })
    }

    return (
        <div>
            <Context.Provider value={{name, setName, db, room, webkitSpeech, speechConfig, audioConfig, avatar, setAvatar}}>
                {props.children}
            </Context.Provider>
        </div>
    )
}


export default Contexts
