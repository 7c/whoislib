const expect = require('chai').expect
const { whoisserverLookup, rdapserverLookup, findTLD, performWhois } = require('./../whoislib')
const { tldDetails, tlds } = require('whoisserver-world')
const tld_com = tldDetails('com')
const useragent = require('express-useragent')

describe('Function: findTLD', function () {
    this.timeout(0)
    it('basic', async function () {
        // basics
        expect(findTLD('notexisting')).to.be.false
        expect(findTLD('com')).to.be.false // we expect domain/hostname not tld
        expect(findTLD('.com')).to.be.false
        expect(findTLD(' .com')).to.be.false
        expect(findTLD('a .com')).property('tld').eq('com')
        expect(findTLD('test.nett')).to.be.false
        expect(findTLD(false)).to.be.false
        expect(findTLD(null)).to.be.false
        expect(findTLD()).to.be.false
        expect(findTLD({})).to.be.false
        expect(findTLD([])).to.be.false
        expect(findTLD(new Array(4))).to.be.false
        expect(findTLD('test.uk')).property('tld').eq('uk')
    })
    it('basic positive', async function () {
        // basic positive
        let tld_com = findTLD('test.com')
        expect(tld_com).to.be.a('object')
        expect(tld_com).property('tld').eq('com')
        expect(tld_com).property('tldUpdated').greaterThan(150000000000)
        expect(tld_com).property('tldCreated').greaterThan(1)
        expect(tld_com).property('whoisServer').to.be.a('array')
        expect(tld_com).property('registry')
    })
    it('structure', async function () {        
        // all tlds in loop to make sure we find them all properly
        var all_tlds = tlds()
        // console.log(all_tlds)
        for (var tld of Object.keys(all_tlds)) {
            // console.log(tld,all_tlds[tld])            
            if (all_tlds[tld] && tld) expect(findTLD(`test.${tld}`)).property('tld').eq(tld)
        }
    })
})