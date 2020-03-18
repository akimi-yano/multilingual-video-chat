import React from 'react'
import firebase from 'firebase'
// const config = require('..../config/config.js')
// import Config from '.../config/config.js'


const Dash = () => {
    let TWEETSREF = firebase.database().ref()
    TWEETSREF.on("value", (snapshot)=>{
        console.log(snapshot.val())

    })
    return (
        <div>
            <h1>Test</h1>
        </div>
    )
}

export default Dash
