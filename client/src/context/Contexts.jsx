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
// const fbTokenUrl = `http://localhost:5001/${firebaseConfig.projectId}/us-central1/token?authId=`
// deployed
const fbTokenUrl = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/token?authId=`

const DEFAULT_NAME = 'anonymous'
const DEFAULT_AVATAR = [1, 1, 1]


const Contexts = (props) => {
    // user name
    const [name, setName] = useState(DEFAULT_NAME)
    // avatar
    const [avatar, setAvatar]=useState(DEFAULT_AVATAR)
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
        setupWebkitSpeech()
        setupTranslator()
    },[])

    useEffect(() => {
        setupNameAvatarDbRoomToken()
    }, [name])

    const setupNameAvatarDbRoomToken = (inputName, inputAvatar) => {
        // handle inputs
        if (inputName) {
            document.cookie = `name=${inputName}; path=/`
        }
        if (inputAvatar) {
            document.cookie = `avatar=${JSON.stringify(inputAvatar)}; path=/`
        }
        let cookies = cookie.parse(document.cookie)

        // name setup
        let nameToUse = name ? name : DEFAULT_NAME
        if (cookies.name) {
            nameToUse = cookies.name
        } else {
            document.cookie = `name=${nameToUse}; path=/`
        }
        setName(nameToUse)

        // avatar setup
        let avatarToUse = avatar ? avatar : DEFAULT_AVATAR
        if (cookies.avatar) {
            avatarToUse = JSON.parse(cookies.avatar)
        } else {
            document.cookie = `avatar=${JSON.stringify(avatarToUse)}; path=/`
        }
        setAvatar(avatarToUse)

        // db setup
        if (firebase.apps.length == 0) {
            firebase.initializeApp(firebaseConfig)
        }
        let database = firebase.firestore()
        setDb(database)

        // room setup
        if (cookies.room) {
            database.collection('rooms').doc(cookies.room).get()
            .then(snapshot => {
                if (snapshot.exists) {
                    setRoom(cookies.room)
                } else {
                    createAndSetRoom(database)
                }
            })
        } else {
            createAndSetRoom(database)
        }

        // token setup
        fetch(fbTokenUrl + nameToUse)
        .then(resp => resp.json())
        .then(body => {
            firebase.auth().signInWithCustomToken(body.token)
        })
        .catch(e => console.log(e))
    }

    const createAndSetRoom = (database) => {
        database.collection('rooms').add({})
        .then(snapshot => {
            setRoom(snapshot.id)
            document.cookie = `room=${snapshot.id}; path=/`
        })
        .catch(e => console.log(e))
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
            <Context.Provider value={{name, setupNameAvatarDbRoomToken, db, room, webkitSpeech, speechConfig, audioConfig, avatar, setAvatar}}>
                {props.children}
            </Context.Provider>
        </div>
    )
}


export default Contexts
