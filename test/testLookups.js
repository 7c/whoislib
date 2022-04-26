var argv = require('minimist')(process.argv.slice(7))
const expect = require('chai').expect
const chalk = require('chalk')
const { findTLD, rdapserverLookup, whoisserverLookup } = require('./../whoislib')
const { tldDetails, tlds } = require('whoisserver-world')
const { array_shuffle, object_shuffle, combineSampledomains } = require('./shared')

/*
    Responsible to test both lookup Methods excessively

    parameters:
            --tld
*/

describe('lookup all tlds', async function () {
    this.timeout(0)
    if (argv.tld) console.log(chalk.blue(`** TLD filter mode is active ** `))

    // WhoisServer Lookup
    it('whoisserverLookup', async function () {
        var all_tlds = object_shuffle(tlds())
        for (var tld in all_tlds) {
            if (argv.tld && argv.tld !== tld) continue
            // console.log(tld)
            var details = tldDetails(tld)
            expect(details).to.be.a('object').property('tld').eq(tld)
            // console.log(details)
            // process.exit(0)
            // sample domains
            if (details.sampleDomains && Object.keys(details.sampleDomains).length > 0) {
                if (details.whoisServer && details.whoisServer.length > 0) {
                    var flatten = combineSampledomains(details)
                    if (!flatten) continue
                    
                    var pickenDomain = flatten.random()
                    try {
                        // let { response, trace } = await performWhois(pickenDomain)
                        let whoisServer = details.whoisServer.random()
                        try {
                            
                            let response = await whoisserverLookup(pickenDomain,whoisServer)
                            
                            if (typeof response==='string') {
                                /*
                                    For now - no common indication could be found for regular whois Servers
                                */

                               
                                console.log(chalk.green.inverse(`>`), `whois lookup testing tld:'${tld}' with domain '${pickenDomain}'`)
                            }

                        }catch(_err) {
                            if (_err.whoisError && _err.whoisError===true) {
                                console.log(chalk.yellow.inverse(`${_err.message} >`), `whois lookup testing tld:'${tld}' with domain '${pickenDomain}'`)
                            } else {
                                console.log(`why3`)
                            }
                        }
                        
                        // if (response === null) {
                        //     console.log(`why`)
                        // }
                        // // RDAP whois was performed
                        // if (response.type === 'rdap') {

                        //     // some domains might not exist
                        //     if (response.data === 404) {
                        //         console.log(chalk.yellow.inverse(`>`), `rdap lookup testing tld:'${tld}' with domain '${pickenDomain}' ${chalk.red('404')}`)
                        //         expect(response).property('domain').eq(pickenDomain)
                        //         continue
                        //     }

                        //     console.log(chalk.yellow.inverse(`>`), `rdap lookup testing tld:'${tld}' with domain '${pickenDomain}'`)
                        //     try {
                        //         expect(response).to.be.a('object').property('type').eq('rdap')
                        //         expect(response).property('data').to.be.a('object')
                        //         expect(response).property('domain').eq(pickenDomain)
                        //     } catch (err) {
                        //         console.log(err)
                        //         console.dir(response, { depth: null })
                        //     }
                        // }
                    } catch (_err) {
                        console.log(_err)
                    }




                    // break
                    continue


                } else { console.log(chalk.blue(`skipping tld '${tld}' - no whoisServer`)); continue; }
            }
            console.log(chalk.gray(`skipping tld '${tld}' - no sampleDomains`))
        }
    })


    it('rdapserverLookup', async function () {
        var all_tlds = object_shuffle(tlds())
        for (var tld in all_tlds) {
            if (argv.tld && argv.tld !== tld) continue
            // console.log(tld)
            var details = tldDetails(tld)
            expect(details).to.be.a('object').property('tld').eq(tld)
            // sample domains
            if (details.sampleDomains && Object.keys(details.sampleDomains).length > 0) {
                if (details.rdapServers && details.rdapServers.length > 0) {
                    var flatten = combineSampledomains(details)
                    if (!flatten) continue
                    
                    var pickenDomain = flatten.random()
                    try {
                        // let { response, trace } = await performWhois(pickenDomain)
                        let rdapServer = details.rdapServers.random()
                        try {
                            let response = await rdapserverLookup(pickenDomain,rdapServer)
                            // queried domain does not exist
                            if (response===404) {
                                console.log(chalk.red.inverse(`>`), `rdap lookup testing tld:'${tld}' with domain '${pickenDomain}' ${chalk.red('404')}`)
                                continue
                            } else 
                            if (typeof response==='object') {
                                try {
                                    // expect(response).property('nameservers')
                                    // expect(response).property('port43')
                                    // expect(response).property('status')
                                    expect(response).property('entities')
                                    // expect(response).property('unicodeName')
                                }catch(_err3) {
                                    console.log(`why2`)
                                }
                                
                                console.log(chalk.green.inverse(`>`), `rdap lookup testing tld:'${tld}' with domain '${pickenDomain}'`)
                            }

                        }catch(_err) {
                            if (_err.whoisError && _err.whoisError===true) {
                                console.log(chalk.yellow.inverse(`${_err.message} >`), `rdap lookup testing tld:'${tld}' with domain '${pickenDomain}'`)
                            }
                        }
                        
                        // if (response === null) {
                        //     console.log(`why`)
                        // }
                        // // RDAP whois was performed
                        // if (response.type === 'rdap') {

                        //     // some domains might not exist
                        //     if (response.data === 404) {
                        //         console.log(chalk.yellow.inverse(`>`), `rdap lookup testing tld:'${tld}' with domain '${pickenDomain}' ${chalk.red('404')}`)
                        //         expect(response).property('domain').eq(pickenDomain)
                        //         continue
                        //     }

                        //     console.log(chalk.yellow.inverse(`>`), `rdap lookup testing tld:'${tld}' with domain '${pickenDomain}'`)
                        //     try {
                        //         expect(response).to.be.a('object').property('type').eq('rdap')
                        //         expect(response).property('data').to.be.a('object')
                        //         expect(response).property('domain').eq(pickenDomain)
                        //     } catch (err) {
                        //         console.log(err)
                        //         console.dir(response, { depth: null })
                        //     }
                        // }
                    } catch (_err) {
                        console.log(_err)
                    }

                    // break
                    continue


                } else { console.log(chalk.blue(`skipping tld '${tld}' - no rdapServers`)); continue; }
            }
            console.log(chalk.gray(`skipping tld '${tld}' - no sampleDomains`))
        }
    })

})