import React,{useEffect, useState} from 'react'
import Context from "../context/Context"
import * as firebase from 'firebase'
import firebaseConfig from "../config/firebaseConfig.js"

let SpeechRecognition = window.webkitSpeechRecognition;

const DBWrapper = (props) => {
    const [db, setDb] = useState(null)
    const [name, setName] = useState("")

// speech recognition
    const [speechRec, setSpeechRec] = useState(null);
    useEffect(()=>{
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        firebase.analytics();
        setDb(firebase.firestore())

        setSpeechRec(setupRecognition())
    },[]) 
    
    const setupRecognition = () => {
        let r = new SpeechRecognition()
        r.onaudiostart = function(event) {
            //Fired when the user agent has started to capture audio.
            console.log('SpeechRecognition.onaudiostart');
        }
        
        r.onaudioend = function(event) {
            //Fired when the user agent has finished capturing audio.
            console.log('SpeechRecognition.onaudioend');
        }
        
        r.onend = function(event) {
            //Fired when the speech recognition service has disconnected.
            console.log('SpeechRecognition.onend');
        }
        
        r.onnomatch = function(event) {
            //Fired when the speech recognition service returns a final result with no significant recognition. This may involve some degree of recognition, which doesn't meet or exceed the confidence threshold.
            console.log('SpeechRecognition.onnomatch');
        }
        
        r.onsoundstart = function(event) {
            //Fired when any sound — recognisable speech or not — has been detected.
            console.log('SpeechRecognition.onsoundstart');
        }
        
        r.onsoundend = function(event) {
            //Fired when any sound — recognisable speech or not — has stopped being detected.
            console.log('SpeechRecognition.onsoundend');
        }
        
        r.onspeechstart = function (event) {
            //Fired when sound that is recognised by the speech recognition service as speech has been detected.
            console.log('SpeechRecognition.onspeechstart');
        }
        r.onstart = function(event) {
            //Fired when the speech recognition service has begun listening to incoming audio with intent to recognize grammars associated with the current SpeechRecognition.
            console.log('SpeechRecognition.onstart');
        }

        return r
    }

    return (
        <div>
            <Context.Provider value={{db,setDb, name, setName, speechRec}}>
                {props.children}
            </Context.Provider>
        </div>
    )
}


export default DBWrapper
