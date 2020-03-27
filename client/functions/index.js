// const functions = require('firebase-functions')
// const cors = require('cors')({
//     origin: true
// })
// // const admin = require('firebase-admin')

// // admin.initializeApp()

// // let tokenFn = (req, res) => {
// //     console.log('cors in!')
// //     admin.auth().createCustomToken(req.query.authId)
// //     .then(function(customToken) {
// //         res.json({token: customToken})
// //     })
// //     .catch(e=>console.log(e))
// // }

// // // need to wrap with cors - https://mhaligowski.github.io/blog/2017/03/10/cors-in-cloud-functions.html
// // exports.token = functions.https.onRequest((req, res) => {
// //     console.log('cors out!')
// //     cors(req, res, () => {
// //         tokenFn(req, res)
// //     });
// // })