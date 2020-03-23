const functions = require('firebase-functions')
const fetch = require('node-fetch')
const cors = require('cors')({
    origin: true
})
const speechConfig = require("./config/speechConfig.js")

const CACHE_TIMEOUT = 1000 * 60 * 5

let cachedToken
let cachedTime

let tokenFn = (req, res) => {
    let customHeaders = {}
    customHeaders[speechConfig.headerKey] = speechConfig.headerValue

    // use cached result if possible
    if (cachedToken && cachedTime && new Date() - cachedTime < CACHE_TIMEOUT) {
        res.json({region: speechConfig.region, token: cachedToken})
    } else {
        fetch(speechConfig.endpoint, {
            method: 'POST',
            headers: customHeaders
        })
        .then(fetchRes => fetchRes.text())
        .then(token => {
            res.json({region: speechConfig.region, token: token})
            // cache the results
            cachedToken = token
            cachedTime = new Date()
        })
        .catch(error => console.log(error))
    }
}

// need to wrap with cors - https://mhaligowski.github.io/blog/2017/03/10/cors-in-cloud-functions.html
exports.token = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        tokenFn(req, res)
    });
})