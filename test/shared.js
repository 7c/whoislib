var chalk = require('chalk')
var debug = require('debug')('whoislib')

Array.prototype.random = function () {
    return this[Math.floor((Math.random()*this.length))];
}

/**
 * used to flatten sampleDomains property of TLD Object - helper function
 * @param  {object} tldObject
 * @returns null or array with at least 1 element
 */
function combineSampledomains(tldObject) {
    if (tldObject && tldObject.hasOwnProperty('sampleDomains') && Object.keys(tldObject.sampleDomains).length > 0) {
        var ret = []
        for (var sub in tldObject.sampleDomains) {
            ret = ret.concat(tldObject.sampleDomains[sub])
        }
        if (ret.length > 0) return ret
    }
    return null
}

function array_shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function object_shuffle(object) {
        var keys = array_shuffle(Object.keys(object))
        var ret = {}
        for(var k of keys) {
            ret[k]=object[k]
        }
        return ret
    }

module.exports = { 
    object_shuffle,
    array_shuffle,
    combineSampledomains
}