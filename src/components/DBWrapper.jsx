import React,{useEffect, useState} from 'react'
import Context from "../context/Context"
import * as firebase from 'firebase'
import firebaseConfig from "../config/firebaseConfig.js"



const DBWrapper = (props) => {
    const [db, setDb] = useState(null)
    const [name, setName] = useState("")
    useEffect(()=>{
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        firebase.analytics();
        setDb(firebase.firestore())
    },[]) 

    return (
        <div>
            <Context.Provider value={{db,setDb, name, setName}}>
                {props.children}
            </Context.Provider>
        </div>
    )
}

export default DBWrapper
