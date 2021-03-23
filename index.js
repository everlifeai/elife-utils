'use strict'
const fs = require('fs')
const os = require('os')
const path = require('path')
const util = require('util')

module.exports = {
    nodeNum: nodeNum,
    adjustPort: adjustPort,
    homeLoc: homeLoc,
    dataLoc: dataLoc,
    ssbLoc: ssbLoc,
    skillLoc: skillLoc,
    logsLoc: logsLoc,
    showMsg: showMsg,
    showErr: showErr,
    ensureExists: ensureExists,
    rmdir: rmdir,
    getIPs: getIPs,
    toStr: toStr,
    shallowClone: shallowClone,
}

/*      outcome/
 * Log the given message/object
 */
function showMsg(msg) {
    console.log(new Date().toISOString(), toStr(msg))
}

/*      outcome/
 * Show error log of the given message/object
 */
function showErr(err) {
    console.error(new Date().toISOString(), toStr(err))
}

/*      outcome/
 * Return a string representation of the object (with error stack if
 * present).
 */
function toStr(obj) {
    if(!obj) return obj;
    if(typeof obj === "string") return obj;
    var m = util.inspect(obj, {depth:null});
    if(obj.stack) m += obj.stack;
    return m;
}

/*      outcome/
 * Create the folders in the path by creating each path in turn
 */
function ensureExists(path_, cb) {
    try {
        path_ = path.normalize(path_)
    } catch(err) {
        return cb(err)
    }
    let p = path_.split(path.sep)
    if(p[0] == '.') p.shift() // Don't create current directory
    else if(p[0] == '') { // Absolute path
        p.shift()
        p[0] = path.sep + p[0]
    }
    ensure_exists_1(p, 1)

    function ensure_exists_1(p, upto) {
        if(p.length < upto) cb(null, path_)
        else {
            let curr = path.join.apply(path, p.slice(0,upto))
            fs.mkdir(curr, '0777', (err) => {
                if (err && err.code != 'EEXIST') cb(err)
                else ensure_exists_1(p, upto+1)
            })
        }
    }
}

/*      outcome/
 * Recursively remove the given directory and all sub-directories
 */
function rmdir(loc, cb) {
    try {
        rmdir_1(loc)
        cb()
    } catch(e) {
        cb(e)
    }

    function rmdir_1(loc) {
        let files = fs.readdirSync(loc, { withFileTypes: true })
        for(let i = 0;i < files.length;i++) {
            let file = files[i]
            let name = path.join(loc, file.name)
            if(file.isDirectory()) {
                rmdir_1(name)
            } else {
                fs.unlinkSync(name)
            }
        }
        fs.rmdirSync(loc)
    }
}

/*      outcome/
 * Get all external addresses (IPV4 first)
 */
function getIPs() {
    let ifaces = os.networkInterfaces();
    let ip4s = []
    let ip6s = []
    Object.keys(ifaces).forEach(ifname => {
        ifaces[ifname].forEach(iface => {
            if (iface.internal !== false) return
            if ('IPv4' == iface.family) ip4s.push(iface.address)
            else ip6s.push(iface.address)
        })
    })
    return ip4s.concat(ip6s)
}

/*      outcome/
 * Make a simple, quick, shallow clone of the given object.
 */
function shallowClone(obj) {
    let ret = {}
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            ret[key] = obj[key];
        }
    }
    return ret;
}


/*      problem/
 * We need to find a location where we can store elife data and
 * downloaded skills. This location needs to support multiple nodes
 * because (especially for development) we do need to run multiple nodes
 * on the same machine without them stepping on each other's toes. We
 * also need to support 'organization-specific' locations for per-org
 * deployments.
 *
 *      way/
 * Most operating systems provide a location for application data. We
 * will use such a location unless the user has specified (via
 * environment variable) as the location for ELIFE_HOME
 *      Windows: C:\Users\<user>\AppData\Local\everlifeai\
 *      Mac: ~/everlifeai/
 *      Linux: ~/everlifeai/
 * We will use the %APPDATA% (windows) enviroment variable and the $HOME
 * (Mac/Linux) environment variable to find these locations.
 *
 * Now in order to support multiple nodes on the same machine, we will
 * append a "node number" to this. Most machines will only have the
 * first node but additional nodes will now be possible:
 *
 *      %APPDATA%\Local\everlifeai\0\...
 *      $HOME\everlifeai\2\...
 *
 * Finally we support org-specific locations by using an ORG identifier:
 *
 *      %APPDATA%\Local\everlifeai\microsoft.com\0\...
 *      $HOME\everlifeai\microsoft.com\2\...
 */
function homeLoc() {
    if(process.env.ELIFE_HOME) return process.env.ELIFE_HOME

    let num = nodeNum()
    let org = orgID()
    let root = process.env.APPDATA
    if(root) {
        root = path.join(root, "Local")
    } else {
        root = process.env.HOME
    }
    return path.join(root, "everlifeai", org, num.toString())
}

/*      outcome/
 * If the user has specified an ELIFE_NODE_ORG we set that otherwise we
 * return an empty string.
 */
function orgID() {
    let org = process.env.ELIFE_NODE_ORG
    if(org) return org
    return ""
}

/*      outcome/
 * Check if the user has specified ELIFE_NODE_NUM and use that number
 * otherwise return zero.
 */
function nodeNum() {
    let num = process.env.ELIFE_NODE_NUM
    if(num) {
        num = parseInt(num)
        if(isNaN(num)) {
            showErr("Environment variable ELIFE_NODE_NUM is not a valid number")
            return 0
        }
    } else {
        num = 0
    }
    return num
}


/*      outcome/
 * Returns the standard data location for EverlifeAI Avatar
 */
function dataLoc() {
    return path.join(homeLoc(), "data")
}

/*      outcome/
 * Returns the directory location for SSB blockchain
 */
function ssbLoc() {
    return path.join(dataLoc(), "__ssb")
}

/*      outcome/
 * Returns the standard user skill location for EverlifeAI Avatar
 */
function skillLoc() {
    return path.join(homeLoc(), "skills")
}

/*      outcome/
 * Returns the standard logs directory location for EverlifeAI Avatar
 */
function logsLoc() {
    return path.join(homeLoc(), "logs")
}

/*      outcome/
 * We adjust the given port by offsetting it based on the avatar node
 * number and any org port offset to allow multiple nodes to live on the
 * same machine without interfering with each other.
 */
function adjustPort(p) {
    let num = nodeNum()
    p += num * 100
    let adj = process.env.ELIFE_ORG_PORT_OFFSET
    if(adj) {
        adj = parseInt(adj)
        if(isNaN(adj)) {
            showErr("Environment variable ELIFE_ORG_PORT_OFFSET is not a valid number")
        } else {
            p += adj * 1000
        }
    }
    return p.toString()
}
