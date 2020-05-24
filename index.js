var portrange = 45032,
    net = require('net'),
    fs = require('fs'),
    events = require('events'),
    powderPath,
    homePath,
    needle = require('needle')

if (process.env.HOME) homePath = process.env.HOME;
else if (process.env.HOMEPATH) homePath = process.env.HOMEPATH;

(({
    linux: ["/usr/bin/PowderPlayer/powder", "/usr/local/bin/PowderPlayer/powder", "/usr/bin/PowderPlayer/PowderPlayer/powder", "/usr/local/bin/PowderPlayer/PowderPlayer/powder", homePath+"/Desktop/PowderPlayer/powder", homePath+"/Desktop/PowderPlayer/PowderPlayer/powder"],
    darwin: ["/Applications/Powder Player.app/Contents/MacOS/Electron", homePath+"/Applications/Powder Player.app/Contents/MacOS/Electron", homePath+"/Desktop/Powder Player.app/Contents/MacOS/Electron"],
    win32: ["C:\\Program Files (x86)\\Powder Player\\powder.exe", "C:\\Program Files\\Powder Player\\powder.exe", "E:\\Siteuri\\PowderPlayer\\powder.exe"]
})[process.platform] || []).forEach(function(path) {
    if (fs.existsSync(path)) powderPath = path
})

function getPort(cb) {
    const port = portrange
    portrange += 1
    const server = net.createServer()
    server.listen(port, function (err) {
        server.once('close', function () { cb(port) })
        server.close()
    })
    server.on('error', function (err) { getPort(cb) })
}

let pollTimes = 120 // max 2 mins

function poll(host, cb) {
    pollTimes--
    if (!pollTimes) {
        cb(true)
        return
    }
    needle.get(host + 'time', (err, resp, body) => {
        if (((resp || {}).headers || {})['x-powered-by'] == 'Express') {
            cb(null, true)
            return
        }
        setTimeout(() => {
            poll(host, cb)
        }, 1000)
    })
}

function toObject(body) {
    if (typeof body === 'object')
        return body
    else {
        try {
            return JSON.parse(body)
        } catch(e) {
            return false
        }
    }
}

function serialize(obj) {
  const str = []
  for (let p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]))
    }
  return str.join("&")
}

function api() {
    
    const powderApi = new events.EventEmitter()
    powderApi.connection = false

    let lastEvent = null
    let initialPlay = false

    function pollEvents(host) {
        needle.get(host + 'state', (err, resp, body) => {
            if ((resp || {}).statusCode == 200 && body) {
                const obj = toObject(body)
                if (((obj || {}).response || {}).state) {
                    if (!initialPlay && ['Buffering', 'Playing', 'Paused'].includes(obj.response.state)) {
                        initialPlay = true
                        powderApi.emit('initialPlay')
                    }
                    if (obj.response.state != lastEvent) {
                        let event
                        if (['NothingSpecial', 'Stopped'].includes(obj.response.state))
                            event = 'Stopped'
                        else
                            event = obj.response.state
                        lastEvent = event
                        powderApi.emit(event)
                    }
                }
            }
            setTimeout(() => {
                pollEvents(host)
            }, 1000)
        })
    }

    powderApi.startPlayer = function(opts) {
        return new Promise((resolve, reject) => {
            opts = opts || {}
            if (!Array.isArray(opts.args) || !(opts.args || []).length) opts.args = []
            if (!powderPath) {
                reject(Error("Powder Player could not be found. Please set path manually."))
                return
            }

            player = this

            getPort(function(port) {
                let command = '"'+powderPath+'" --web-api='+port

                if (opts.args.length) command += ' '+opts.args.join(' ')

                player.process = require('child_process').exec(command)

                player.host = (opts.protocol || 'http') + '://' + (opts.host || '127.0.0.1') + ':' + port + '/';

                poll(player.host, (err, success) => {
                    if (success) {
                        pollEvents(player.host)
                        powderApi.connection = true
                        resolve(player)
                    } else
                        reject(Error("Could not connect to Powder Player Web API"))
                })
            })
        })
    }
    
    powderApi.send = function(cType,cValue) {
        return new Promise((resolve, reject) => {
            let extra = ''
            if (typeof cValue === 'object' && cValue !== null) extra += '?' + serialize(cValue)
            else if (typeof cValue !== 'undefined') extra += '?value=' + encodeURIComponent(cValue)
            needle.get(this.host + cType + extra, (err, resp, body) => {
                let obj

                if (body)
                    obj = toObject(body)

                if ((resp || {}).statusCode == 200) {
                    resolve((obj || {}).success ? obj.response : undefined)
                } else
                    reject((obj || {}).reason || ('Error occurred while sending command: ' + cType))
            })
        })
    }
    
    const methods = [
        'pause',
        'play',
        'toggle_pause',
        'next',
        'prev',
        'progress',
        'set_progress',
        'time',
        'set_time',
        'jump_forward',
        'jump_backward',
        'duration',
        'volume',
        'set_volume',
        'muted',
        'set_mute',
        'toggle_mute',
        'state',
        'item_data',
        'playlist',
        'add_playlist'
    ]

    methods.forEach(function(el) {
        powderApi[el] = function(elem) {
            return function(i) {
                return new Promise((resolve, reject) => {
                    this.send(elem,i).then(body => {
                        resolve(body)
                    }).catch(reject)
                })
            }
        }(el)
    })


    powderApi.close = function() {
        this.process.kill()
    }


    return powderApi

}

module.exports = api
