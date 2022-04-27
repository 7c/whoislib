const whois = require('whois')
const debug = require('debug')('whoislib')
const axios = require('axios')
// const https = require('https')
const validURL = require('@7c/validurl')
const { tldDetails } = require('whoisserver-world')
const { randomUseragent } = require('useragentsdata')
const useragent = randomUseragent(true) // // useragent will be set per session, we do not change it by every new hit
var whoisError = require('./whoisError.js')
// const { executionAsyncResource } = require('async_hooks')
debug(`useragent for rdap requests:`, useragent)
// axios.defaults.headers.common['User-Agent'] = useragent

function removeDoubleSlashes(url) {
    if (typeof url === 'string')
        return url.replace(/([^:]\/)\/+/g, "$1")
    return false
}

/**
 * used to make port 53 whois server lookups, it will return raw result
 * whoisserverLookup function does not support any kind of parsing or detection, it is quite basic
 * @param  {string} domain
 * @param  {string} whoisserver
 * @param  {number} timeout=3000
 * @param  {boolean} verbose=true
 */
function whoisserverLookup(domain, whoisserver, timeout = 3000, verbose = true, addtlOptions={}) {
    debug(`whoisserverLookup(${domain},${whoisserver})`)
    return new Promise((resolve, reject) => {
        whois.lookup(domain, {
            server: whoisserver,
            follow: 0,
            timeout,
            verbose,
            ...addtlOptions, // see https://github.com/FurqanSoftware/node-whois
        }, function (err, data) {
            if (err) {
                // err.message:
                if (err.message.search(/timeout/i) > 0) {
                    return reject(new whoisError('TIMEDOUT', err.code))
                }

                if (err.code && err.code === 'ENOTFOUND') {
                    return reject(new whoisError('DNS_ISSUE', err.code))
                }

                // connection issue
                if (err && err.code && (err.code==='ECONNRESET' || err.code==='ECONNREFUSED')) {
                    return reject(new whoisError('CONNECTIONISSUE', err.code))
                }

                // other errors we pass through in raw
                debug(`whoisserverLookup error`, JSON.stringify(err))
                return reject(err)
            }
            // var lines = []
            var all = ''
            for (var row of data) {
                if (row.data) all += row.data
            }
            debug(`whoisserverLookup result`, all)
            resolve(all)
        })
    })
}


/**
 * [promise] used to make rdap whois requests
 * @param  {string} domain
 * @param  {string} rdapServer
 * @param  {number} timeout=3000
 * @param  {boolean} verbose=true
 * @returns resolve : json object
 * @returns catch : {message:''} error
 */
function rdapserverLookup(domain, rdapServer, timeout = 3000,testParams={}) {
    debug(`rdapserverLookup(${domain},${rdapServer})`)
    return new Promise((resolve, reject) => {
        var rdapURL = rdapServer + '/' + domain
        if (testParams.do_not_attach_domain) rdapURL = rdapServer
        // axios.defaults.timeout = timeout
        debug(`rdapURL=${rdapURL}`)
        if (!validURL(rdapURL)) return reject({ message: 'INVALID RDAP URL', rdapurl: rdapURL })
        rdapURL = removeDoubleSlashes(rdapURL)
        debug(`executing axios.get`)
        axios.get(rdapURL,{timeout,
            headers: {'User-Agent': useragent.ua},}).then(res => {
            if (res && res.data && res.status === 200) {
                debug(`data:`, res.data)
                return resolve(res.data)
            }
            debug(`UNEXPECTED RDAP RESPONSE`, res)
            return reject({ message: 'UNEXPECTED RDAP RESPONSE', response: res })

        }).catch(err => {
            // we uniform some answers to help higher functions
            if (err && err.isAxiosError) {
                // domain not found returns 404
                if (err.response && err.response.status === 404) {
                    return resolve(404)
                }
                // certificate error
                if (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || err.code === 'CERT_HAS_EXPIRED' || err.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
                    return reject(new whoisError('CERTIFICATE_ISSUE', err.code))
                }
                
                // dns issue - probably rdap server is not resolveable
                if (err.code === 'ENOTFOUND') {
                    return reject(new whoisError('DNS_ISSUE', err.code))
                }
                // parse issue
                if (err.code === 'HPE_INVALID_HEADER_TOKEN') {
                    // this seems to be a bug with nodejs https://github.com/nodejs/node/issues/27711
                    // lets use nodejs 14 and up
                    console.log(`parsing issue at:`, rdapURL)
                    return reject(new whoisError('PARSE_ISSUE', err.code))
                }
                // timeout
                if (err.code === 'ETIMEDOUT' || (err.code === 'ECONNABORTED' && err.message.search(/timeout/i) >= 0)) {
                    return reject(new whoisError('TIMEDOUT', err.code))
                }

                // too many requests - rate limited
                /*
                    429 : does this code refer to rate limit ? research
                */
                if (err.response && err.response.status && err.response.status===429) {
                    return reject(new whoisError('RATELIMITED', 429))
                }

                // some servers throw 400 - Bad Requst 'https://rdap.nic.voting/v1/domain/lbj.voting'
                if (err.response && err.response.status && err.response.status===400) {
                    return reject(new whoisError('BADREQUEST', 400))
                }

                // connection issue
                if (err && err.code && (err.code==='ECONNRESET' || err.code==='ECONNREFUSED')) {
                    return reject(new whoisError('CONNECTIONISSUE', -54))
                }

                // capture rest of errors
                // some rdap servers like  return to every request 
                console.log(err)
            }
            
            // other errors we pass through
            debug(`EXCEPTION : ${JSON.stringify(err)}`)
            reject(err)
        })
    })
}

/**
 * parses hostname and returns TLD details, if tld exists
 * 
 * @param  {string} hostname
 * @returns {boolean|object} TLD Object or false
 */
function findTLD(hostname) {
    debug(`findTLD(${hostname})`)
    if (typeof hostname === 'string') {
        try {
            hostname = hostname.trim()
            if (hostname && hostname.search(/\./) > 0) {
                var parts = hostname.split(/\./)
                return tldDetails(parts[parts.length - 1])
            }
        }catch(err) {
            debug(err)
            // for now
        }
    }
    return false
}

/**
 * performs whois for given domain either rdap(priority) or whois, 
 * if rdapServers,whoisServers options is not defined we will find servers based on TLD of that domain
 * with help of whoisserver-world dependency
 * 
 * @param  {string} domain
 * @param  {object} options 
 * @returns catch,false,responseObject
 */
function performWhois(domain, options = {
    rdapServers: false,
    whoisServers: false
}) {
    debug(`performWhois(${domain},${JSON.stringify(options)})`)
    return new Promise(async function (resolve, reject) {
        let rdapServers = options.rdapServers ? options.rdapServers : false
        let whoisServers = options.whoisServers ? options.whoisServers : false
        let trace = {}
        trace['domain'] = domain

        if ((!rdapServers && !whoisServers) || (rdapServers.length == 0 && whoisServers.length == 0)) {
            // determine the tld in case we do not have these details
            let tld = findTLD(domain)
            trace.tld = tld
            debug(`tld:${JSON.stringify(tld)}`)
            if (!tld) return reject({ message: 'UNKNOWN TLD', trace })
            rdapServers = tld.rdapServers && tld.rdapServers.length > 0 ? tld.rdapServers : []
            whoisServers = tld.whoisServer && tld.whoisServer.length > 0 ? tld.whoisServer : []
            trace.rdapServers = rdapServers
            trace.whoisServers = whoisServers
        }

        // does the domain have a rdap server ? rdap has priority
        if (rdapServers && rdapServers.length > 0) {
            trace['rdapLookup'] = []
            for (var rdapServer of rdapServers) {
                if (typeof rdapServer !== 'string') continue
                var _trace = {}
                trace['rdapLookup'].push(_trace)
                try {
                    debug(`rdap lookup ${rdapServer}`)
                    _trace['lookup'] = { domain, rdapServer }
                    let rdapResponse = await rdapserverLookup(domain, rdapServer)

                    let response = {
                        type: 'rdap',
                        data: rdapResponse,
                        domain,
                        rdapServer
                    }
                    _trace['response'] = { ...response }
                    debug(`response:${JSON.stringify(response)}`)
                    // success
                    _trace['success'] = true
                    return resolve({ response, trace })
                } catch (err) {
                    _trace['exception'] = err
                    debug(`rdapserverLookup exception: ${err.message}`)
                }
            }
        }

        if (whoisServers && whoisServers.length > 0) {
            var _trace = []
            trace['whoisLookup'] = []
            for (let whoisServer of whoisServers) {
                if (typeof whoisServer === 'string')
                    var _trace = {}
                trace['whoisLookup'].push(_trace)
                try {
                    debug(`whois lookup ${whoisServer}`)
                    _trace['lookup'] = { domain, whoisServer }
                    let whoisResponse = await whoisserverLookup(domain, whoisServer)
                    let response = {
                        type: 'whois',
                        data: whoisResponse,
                        domain,
                        whoisServer
                    }
                    _trace['response'] = { ...response }
                    debug(`response:${JSON.stringify(response)}`)
                    // success
                    _trace['success'] = true
                    return resolve({ response, trace })
                } catch (err) {
                    _trace['exception'] = err
                    debug(`whoisServerLookup exception: ${err.message}`)
                }
            }
        }

        return resolve({ response: null, trace })
    })
}

module.exports = {
    whoisserverLookup,
    rdapserverLookup,
    findTLD,
    performWhois
}
