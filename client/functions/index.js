const functions = require('firebase-functions')
const cors = require('cors')({
    origin: true
})
const admin = require('firebase-admin')

admin.initializeApp()

let tokenFn = (req, res) => {
    admin.auth().createCustomToken(req.query.authId)
    .then(function(customToken) {
        res.json({token: customToken})
    })
}

// need to wrap with cors - https://mhaligowski.github.io/blog/2017/03/10/cors-in-cloud-functions.html
exports.token = functions.https.onRequest((req, res) => {
    console.log('cors!')
    cors(req, res, () => {
        tokenFn(req, res)
    });
})