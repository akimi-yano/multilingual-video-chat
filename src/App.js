import * as firebase from 'firebase'
import firebaseConfig from "./firebaseConfig.js"

import React,{useState, useEffect} from 'react';
import './App.css';
// import Dash from './components/Dash'

console.log(firebaseConfig)

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

function App() {
  const [state, setState] =useState(
    {speed:10}
  )
  const [rootRef, setRootRef]=useState(null)
  useEffect(async ()=>{
    let rootRef = await firebase.firestore().collection("react").doc("QMcsnV5dN5S6pbDabhTN");
    // const speedRef =rootRef.child("speed")
    rootRef.onSnapshot(async doc=>{
      let speedData = await doc.data().speed
      setState({
        speed: speedData
      })
      console.log("database change: ", doc)
    })
    // console.log("Set state: ", rootRef.data())
    setRootRef(rootRef)
  },[])

  return (
    <div className="App">
      <h1>Test</h1>
      <p>{state.speed}</p>
    </div>
  );
}

export default App;
