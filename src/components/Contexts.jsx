import React,{useEffect, useState} from 'react'
import Context from "../context/Context"
import * as firebase from 'firebase'
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk"
import firebaseConfig from "../config/firebaseConfig.js"

// dev
const tokenUrl = `http://localhost:5001/${firebaseConfig.projectId}/us-central1/token`
// deployed
// const tokenUrl = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/token`

const Contexts = (props) => {
    // user name
    const [name, setName] = useState("")
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
            <Context.Provider value={{name, setName, db, webkitSpeech, speechConfig, audioConfig}}>
                {props.children}
            </Context.Provider>
        </div>
    )
}


export default Contexts
