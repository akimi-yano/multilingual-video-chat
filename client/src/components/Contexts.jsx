import React,{useEffect, useState} from 'react'
import Context from "../context/Context"
import * as firebase from 'firebase'
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk"
import firebaseConfig from "../config/firebaseConfig.js"
import tokenUrl from "../config/tokenUrl.js"

// dev - make sure to add bypass in server/local.settings.json:
// https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=macos%2Ccsharp%2Cbash#local-settings-file
// const tokenUrl = 'http://localhost:7071/api/token'
// deployed - make sure cors is configured on Azure portal via Function Apps -> Platform Features
// const tokenUrl = 'in/firebaseConfig.js'

const Contexts = (props) => {
    // user name
    const [name, setName] = useState("anonymous")
    // avatar
    const [avatar, setAvatar]=useState([1,1,1])
    // firebase connection
    const [db, setDb] = useState(null)
    // speech recognition
    const [webkitSpeech, setWebkitSpeech] = useState(null);
    // translation
    const [speechConfig, setSpeechConfig] = useState(null);
    const [audioConfig, setAudioConfig] = useState(null);

    useEffect(()=>{
        setupDb()
        setupWebkitSpeech()
        setupTranslator()
    },[]) 

    const setupDb = () => {
        firebase.initializeApp(firebaseConfig);
        firebase.analytics();
        setDb(firebase.firestore())
    }

    const setupWebkitSpeech = () => {
        let rec = new window.webkitSpeechRecognition()
        rec.onspeechend = function (event) {
            rec.stop();
        }
        setWebkitSpeech(rec)
    }

    const setupTranslator = () => {
        window.fetch(tokenUrl)
        .then(res => res.json())
        .then(body => {
            setSpeechConfig(SpeechSDK.SpeechTranslationConfig.fromAuthorizationToken(body.token, body.region))
            setAudioConfig(SpeechSDK.AudioConfig.fromDefaultMicrophoneInput())
        })
    }

    return (
        <div>
            <Context.Provider value={{name, setName, db, webkitSpeech, speechConfig, audioConfig, avatar, setAvatar}}>
                {props.children}
            </Context.Provider>
        </div>
    )
}


export default Contexts
