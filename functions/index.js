const functions = require('firebase-functions')
const fetch = require('node-fetch')
const cors = require('cors')({
    origin: true
})
const speechConfig = require("./config/speechConfig.js")

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

let translateFn = (req, res) => {
    let text = req.query.text
    let fromLang = req.query.fromLang
    let toLang = req.query.toLang
    // TODO actually translate
    res.json({'text': `Translated '${text}' from ${fromLang} to ${toLang} desuu!`})
}

exports.translate = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        translateFn(req, res)
    });
})

let tokenFn = (req, res) => {
    let customHeaders = {}
    customHeaders[speechConfig.headerKey] = speechConfig.headerValue
    fetch(speechConfig.endpoint, {
        method: 'POST',
        headers: customHeaders
    })
    .then(fetchRes => fetchRes.text())
    .then(token => {
        res.json({
            region: speechConfig.region,
            token: token
        })
    })
    .catch(error => console.log(error))
}

exports.token = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        tokenFn(req, res)
    });
})