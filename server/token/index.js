const fetch = require('node-fetch')
const speechConfig = require("./config/speechConfig.js")

const CACHE_TIMEOUT = 1000 * 60 * 5
let cachedToken
let cachedTime

module.exports = async function (context, req) {
    let customHeaders = {}
    customHeaders[speechConfig.headerKey] = speechConfig.headerValue

    // use cached result if possible
    if (cachedToken && cachedTime && new Date() - cachedTime < CACHE_TIMEOUT) {
        context.res = {
            status: 200,
            body: { region: speechConfig.region, token: cachedToken }
        }
    } else {
        let fetchRes = await fetch(speechConfig.endpoint, {
            method: 'POST',
            headers: customHeaders
        })
        let token = await fetchRes.text()
        context.res = {
            status: 200,
            body: { region: speechConfig.region, token: token }
        }
        // cache the results
        cachedToken = token
        cachedTime = new Date()
    }
};