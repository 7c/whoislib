const expect= require('chai').expect
const { whoisserverLookup,rdapserverLookup,findTLD,performWhois } = require('./../whoislib')
const { tldDetails,tlds } = require('whoisserver-world')
const tld_com = tldDetails('com')
const useragent = require('express-useragent')

describe('Functions',function() {
this.timeout(0)
    it('whoisserverLookup',async function() {
        // console.log(tld_com)
        // positive test, querying .com whois server for given domain
        var response = await whoisserverLookup('test.com',tld_com.whoisServer[0])        
        expect(response).to.be.a('string').contain('TEST.COM')

        // negative - not existing whois server
        try {
            var response = await whoisserverLookup('test.com','nedomain2184243.com')
        }catch(err) {
            expect(err).property('message').eq('DNS_ISSUE')
        }
    })


    it('rdapserverLookup',async function() {
        return //TODO: make tests
        // positive
        var response = await rdapserverLookup('test.com',tld_com.rdapServers[0])
        expect(response).to.be.a('object').property('objectClassName').eq('domain')
        expect(response.ldhName).eq('TEST.COM')

        // make sure useragent is randomized and can be parsed
        // useragent will be set per session, we do not change it by every new hit
        var response1 = await rdapserverLookup('test.com','https://ip8.com/echo',5000,{do_not_attach_domain:true})
        var response2 = await rdapserverLookup('test.com','https://ip8.com/echo',5000,{do_not_attach_domain:true})
        expect(response1.user_agent).eq(response2.user_agent)
        expect(useragent.parse(response1.user_agent).browser==='unknown').to.be.false
        
        // cause an exception
        try {
            var response = await rdapserverLookup('test.com','https://nedomain7812423.com/echo')
        }catch(err) {
            expect(err).property('message').eq('DNS_ISSUE')
        }

        // cause invalid url
        try {
            var response = await rdapserverLookup('test.com','https//nedomain7812423.com/echo')
        }catch(err) {
            expect(err).to.be.a('object').property('message').eq('INVALID RDAP URL')
            expect(err).to.be.a('object').property('rdapurl').eq('https//nedomain7812423.com/echo/test.com')
        }
    })

    it('performWhois',async function() {
        return //TODO: make tests
        // basics
        performWhois(false).then().catch(err=>{expect(err).property('message').eq('UNKNOWN TLD')})
        performWhois({}).then().catch(err=>{expect(err).property('message').eq('UNKNOWN TLD')})
        performWhois('garbage').then().catch(err=>{expect(err).property('message').eq('UNKNOWN TLD')})
        performWhois('test.garbage').then().catch(err=>{expect(err).property('message').eq('UNKNOWN TLD')})
        
        // provide custom rdapServer
        expect(await performWhois('test.garbage',{rdapServers:['https://ip8.com/echo']})).property('data').contain('DOCTYPE')
        // provide invalid rdapServer on first position, make sure we skip this server on exception
        expect(await performWhois('test.garbage',{rdapServers:['http://notexsting127842132.com','https://ip8.com/echo']})).property('data').contain('DOCTYPE')
        // not working rdap servers should return null
        expect(await performWhois('test.garbage',{rdapServers:['http://notexsting127842132.com']})).to.be.null
        
        // provide custom whoisserver
        let test1 = await performWhois('test.com',{whoisServers:tld_com.whoisServer})
        expect(test1).property('type').eq('whois')
        expect(test1).property('whoisServer').to.be.a('string')
        // provide invalid whois server which should be skipped
        expect(await performWhois('test.com',{whoisServers:['invalidwhoisserver123.com'].concat(tld_com.whoisServer)})).property('type').eq('whois')
        // not working whois servers should return null
        expect(await performWhois('test.tld',{whoisServers:['notexisting87123123.com']})).to.be.null

        // positive test with rdap server (auto)- which should be prioritized
        let com_test = await performWhois('test.com')
        expect(com_test).to.be.a('object').property('type').eq('rdap')
        expect(com_test).to.be.a('object').property('domain').eq('test.com')
        expect(com_test).to.be.a('object').property('rdapServer').to.be.a('string')
        expect(com_test).property('data').to.be.a('object').property('ldhName').eq('TEST.COM')

        // positive test with manual rdapServers valid option
        let com_test2 = await performWhois('test.com',{rdapServers:tld_com.rdapServers})
        expect(com_test2).to.be.a('object').property('type').eq('rdap')
        expect(com_test2).to.be.a('object').property('domain').eq('test.com')
        expect(com_test2).property('data').to.be.a('object').property('ldhName').eq('TEST.COM')
    })
})