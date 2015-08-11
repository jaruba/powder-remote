/*****************************************************************************
* Copyright (c) 2015 Branza Victor-Alexandru <branza.alex[at]gmail.com>
*
* This program is free software; you can redistribute it and/or modify it
* under the terms of the GNU Lesser General Public License as published by
* the Free Software Foundation; either version 2.1 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General Public License
* along with this program; if not, write to the Free Software Foundation,
* Inc., 51 Franklin Street, Fifth Floor, Boston MA 02110-1301, USA.
*****************************************************************************/

// Powder Player Remote v0.0.1

var portrange = 45032,
    net = require('net'),
    fs = require('fs'),
    powderPath,
    homePath,
    powderApi = { connection: false, keepCBs: [], keepDone: [], keepResults: [], events: false };
    
if (window.process.env.HOME) homePath = window.process.env.HOME;
else if (window.process.env.HOMEPATH) homePath = window.process.env.HOMEPATH;

(({
    linux: ["/usr/bin/powder", "/usr/local/bin/powder"],
    darwin: ["/Applications/Powder.app/Contents/MacOS/powder", homePath+"/Applications/Powder.app/Contents/MacOS/powder"],
    win32: ["C:\\Program Files (x86)\\PowderPlayer\\powder.exe", "C:\\Program Files\\PowderPlayer\\powder.exe", "E:\\Siteuri\\PowderPlayer\\powder.exe"]
})[window.process.platform] || []).forEach(function(path) {
    if (fs.existsSync(path)) powderPath = path;
});

function getPort(cb) {
    var port = portrange
    portrange += 1
    var server = net.createServer()
    server.listen(port, function (err) {
        server.once('close', function () { cb(port) })
        server.close()
    })
    server.on('error', function (err) { getPort(cb) })
}

powderApi.startPlayer = function(cb) {
    if (!powderPath) throw("Powder Player could not be found.");
    player = this;
    getPort(function(port) {
        var io = require('socket.io').listen(port),
            secret = Math.floor(Date.now() / 1000),
            eventInit = require('events');
        player.events = new eventInit.EventEmitter();
        require('child_process').exec('"'+powderPath+'" --controller-secret='+secret+' --controller-port='+port);
        io.on('connection', function(player){
            return function(socket){
                io.emit('secret', { message: secret });
                socket.on('event', function(webData) {
                    if (typeof webData.value !== 'undefined') player.events.emit(webData.name, webData.value);
                    else if (webData.name) player.events.emit(webData.name);
                });
                
                socket.on('sync', function(webData) {
                    if (typeof webData.value !== 'undefined' && typeof webData.ind !== 'undefined' && typeof player.keepDone[webData.ind] !== 'undefined') {
                        player.keepResults[webData.ind] = webData.value;
                        player.keepDone[webData.ind] = true;
                    }
                });
                
                socket.on('async', function(webData) {
                    if (typeof webData.value !== 'undefined' && typeof webData.ind !== 'undefined' && typeof player.keepCBs[webData.ind] !== 'undefined') {
                        player.keepCBs[webData.ind](webData.value);
                        delete player.keepCBs[webData.ind];
                    } else if (typeof webData.ind !== 'undefined' && player.keepCBs[webData.ind]) {
                        player.keepCBs[webData.ind]();
                        delete player.keepCBs[webData.ind];
                    }
                });
                cb.call(player);
            }
        }(player));
        player.connection = io;
    });
};

powderApi.async = function (cValue,cType,val) {
    if (this.connection && typeof cValue === 'function' && typeof cType === 'string') {
        this.keepCBs.push(cValue);
        var set = { cbType: 'async', ind: this.keepCBs.length -1 };
        if (typeof val !== 'undefined') set.value = val;
        this.emit(cType, set);
        return true;
    } else return false;
};

powderApi.sync = function(cType,val) {
    if (this.connection && typeof cType === 'string') {
        this.keepDone.push(false);
        index = this.keepDone.length -1;
        var set = { cbType: 'sync', ind: index };
        if (typeof val !== 'undefined') set.value = val;
        this.connection.emit(cType, set);
        player = this;
        setTimeout(function(wjsPlayer,wjsIndex){ return function() { wjsPlayer.keepResults[wjsIndex] = false; wjsPlayer.keepDone[index] = true; } }(player,index),150);
        require('deasync').loopWhile(function(){ return !player.keepDone[index]; });
        delete this.keepDone[index];
        setTimeout(function(wjsPlayer,wjsIndex){ return function() { delete wjsPlayer.keepResults[wjsIndex]; } }(player,index),100);
        return this.keepResults[index];
    } else return false;
};

powderApi.twoWay = function (cType,val,cb) {
    if (!this.connection) return false;
    if (typeof cb === 'function') return this.request(cType,val,cb);
    else if (typeof val !== 'undefined') return this.request(cType,val);
    else if (cType) return this.request(cType);
    return true;
};

powderApi.request = function (cType,val,cb) {
    if (!this.connection) return false;
    if (typeof val === 'function') this.async(val,cType);
    else if (typeof cb === 'function') this.async(cb,cType,val);
    else if (typeof val !== 'undefined') return this.sync(cType,val);
    else return this.sync(cType);
    return true;
};

powderApi.emit = function(cType,cValue) {
    if (!this.connection) return false;
    if (typeof cValue === 'object') this.connection.emit(cType, cValue);
    else if (cValue) this.connection.emit(cType, { value: cValue });
    else this.connection.emit(cType);
    return true;
};
    
methods = ['play','pause','stop','next','prev','close','clearPlaylist','toggleFullscreen','toggleMute','mute','playItem','removeItem','notify']
methods.forEach(function(el) { powderApi[el] = function(elem) { return function(i) { return this.emit(elem,i); } }(el) });

methods = ['subCount','audioCount','fps','length','width','height','state','stateInt','itemCount','playing'];
methods.forEach(function(el) { powderApi[el] = function(elem) { return function(cb) { return this.request(elem,cb) } }(el) });

methods = ['currentItem','time','position','rate','subTrack','subDesc','subDelay','stateInt','itemCount','playing','audioTrack','audioDesc','audioDelay','audioChan','audioChanInt','itemDesc','volume','rate','aspectRatio','crop','zoom'];
methods.forEach(function(el) { powderApi[el] = function(elem) { return function(i,cb) { return this.twoWay(elem,i,cb) } }(el) });

powderApi.addPlaylist = function(settings) { this.emit('addPlaylist',{ value: settings }) };
powderApi.advanceItem = function(pValue,cValue) { return this.emit('advanceItem', { prev: pValue, count: cValue }); },

module.exports = powderApi;
