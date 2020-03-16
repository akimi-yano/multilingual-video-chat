const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors')({origin: true});

admin.initializeApp(functions.config().firebase)
const app = express();
app.use(cors)

// when user goes to /api, return a json response that says 'ok desu'
app.get('/api', async (req, res) => {
    // note: when locally deploying, you would need to set the FIREBASE_CONFIG
    // environment variable for the firestore connection to work:
    // https://firebase.google.com/docs/admin/setup#initialize-without-parameters
    const db = admin.firestore();

    const roomWithOffer = {
        'offer': {
            type: 'test type',
            sdp: 'test sdp',
        },
    };
    const roomRef = await db.collection('rooms').add(roomWithOffer);

    return res.json({'roomRef': roomRef.id})
})

exports.app = functions.https.onRequest(app);