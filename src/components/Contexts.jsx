import React,{useEffect, useState} from 'react'
import Context from "../context/Context"
import * as firebase from 'firebase'
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk"
import firebaseConfig from "../config/firebaseConfig.js"
import apiConfig from "../config/apiConfig.js"

const SpeechRecognition = window.webkitSpeechRecognition;

const Contexts = (props) => {
    // user name
    const [name, setName] = useState("")
    // firebase connection
    const [db, setDb] = useState(null)
    // speech recognition
    const [speechRec, setSpeechRec] = useState(null);
    // translation
    const [speechConfig, setSpeechConfig] = useState(null);
    const [audioConfig, setAudioConfig] = useState(null);

    useEffect(()=>{
        setupDb()
        setupSpeechRec()
        setupTranslator()
    },[]) 

    const setupDb = () => {
        firebase.initializeApp(firebaseConfig);
        firebase.analytics();
        setDb(firebase.firestore())
    }

    const setupSpeechRec = () => {
        let r = new SpeechRecognition()
        r.onspeechend = function (event) {
            r.stop();
        }
        setSpeechRec(r)
    }

    const setupTranslator = () => {
        window.fetch(apiConfig.tokenUrl)
        .then(res => res.text())
        .then(token => {
            setSpeechConfig(SpeechSDK.SpeechTranslationConfig.fromAuthorizationToken(token, apiConfig.tokenServiceRegion))
            setAudioConfig(SpeechSDK.AudioConfig.fromDefaultMicrophoneInput())
        })
    }

    return (
        <div>
            <Context.Provider value={{name, setName, db, speechRec, speechConfig, audioConfig}}>
                {props.children}
            </Context.Provider>
        </div>
    )
}


export default Contexts
