const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors')({origin: true});

admin.initializeApp(functions.config().firebase)
const app = express();
app.use(cors)


// const db = admin.firestore();
// exports.writeToFirestore = functions.firestore
// .document('rooms')
// .onSnapshot((change, context) => {
//     db.doc('some/otherdoc').set({ ... });
// });


// when user goes to /api, return a json response that says 'ok desu'
app.post('/api/offer', async (req, res) => {
    // note: when locally deploying, you would need to set the FIREBASE_CONFIG
    // environment variable for the firestore connection to work:
    // https://firebase.google.com/docs/admin/setup#initialize-without-parameters
    const db = admin.firestore();

    const roomWithOffer = {
        'offer': {
            type: req.body.type,
            sdp: req.body.sdp,
        },
    };
    const roomRef = await db.collection('rooms').add(roomWithOffer);

    return res.json({'roomId': roomRef.id})
})

app.post('/api/caller-ice', async (req, res) => {
    const db = admin.firestore();
    let roomId = req.body.roomId
    let candidate = req.body.candidate
    const callerCandidatesCollection = db.collection('rooms').doc(roomId).collection('callerCandidates')
    console.log(candidate)
    await callerCandidatesCollection.add(candidate)
    return res.json({'roomRef': roomId})
})

app.post('/api/callee-ice', async (req, res) => {
    const db = admin.firestore();
    let roomId = req.body.roomId
    let candidate = req.body.candidate
    let calleeCandidatesCollection = db.collection('rooms').doc(roomId).collection('calleeCandidates')
    calleeCandidatesCollection.add(candidate)
    return res.json({'roomRef': roomId})
})

app.get('/api/rooms/:roomId', async (req, res) => {
    const db = admin.firestore();
    let roomId = req.params.roomId
    let roomSnapshot = await db.collection('rooms').doc(roomId).get()
    return res.json({'roomSnapshot': roomSnapshot.data()})
})

app.post('/api/rooms/:roomId', async (req, res) => {
    const db = admin.firestore();
    let answer = req.body
    let roomId = req.params.roomId
    await db.collection('rooms').doc(roomId).update(answer)
    return res.json({'roomId': roomId})
})

// app.get(`/api/answer/${roomRef.id}`, async (req, res) => {

//     const db = admin.firestore();
//     const roomRef = db.collection('rooms').doc(`${roomRef.id}`);

//     const roomWithAnswer = {
//         'answer': {
//             type: 'answer test type',
//             sdp: 'answer test sdp',
//         },
//     };
//     await roomRef.update(roomWithAnswer);

//     return res.json({'roomRef': roomRef.id})
// })

exports.app = functions.https.onRequest(app);