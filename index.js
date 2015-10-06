var portrange = 45032,
    net = require('net'),
    fs = require('fs'),
	events = require('events'),
    powderPath,
    homePath,
	defaults = { state: { 'Idle': 0, 'Opening': 1, 'Buffering': 2, 'Playing': 3, 'Paused': 4, 'Stopping': 5, 'Ended': 6, 'Error': 7 } };
    
if (window.process.env.HOME) homePath = window.process.env.HOME;
else if (window.process.env.HOMEPATH) homePath = window.process.env.HOMEPATH;

(({
    linux: ["/usr/bin/PowderPlayer/powder", "/usr/local/bin/PowderPlayer/powder", "/usr/bin/PowderPlayer/PowderPlayer/powder", "/usr/local/bin/PowderPlayer/PowderPlayer/powder", homePath+"/Desktop/PowderPlayer/powder", homePath+"/Desktop/PowderPlayer/PowderPlayer/powder"],
    darwin: ["/Applications/Powder Player.app/Contents/MacOS/nwjs", homePath+"/Applications/Powder Player.app/Contents/MacOS/nwjs", homePath+"/Desktop/Powder Player.app/Contents/MacOS/nwjs"],
    win32: ["C:\\Program Files (x86)\\Powder Player\\powder.exe", "C:\\Program Files\\Powder Player\\powder.exe", "E:\\Siteuri\\PowderPlayer\\powder.exe"]
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

function api() {
	
	var powderApi = new events.EventEmitter();
	powderApi.connection = false;
	powderApi.keepCBs = [];
	powderApi.params = {};

	powderApi.startPlayer = function(powArgs,cb) {
		if (typeof powArgs === 'function') cb = powArgs;
		if (Object.prototype.toString.call(powArgs) !== '[object Array]') powArgs = null;
		if (!powderPath) throw("Powder Player could not be found.");
		player = this;
		getPort(function(port) {
			var io = require('socket.io').listen(port),
				secret = Math.floor(Date.now() / 1000),
				command = '"'+powderPath+'" --controller-secret='+secret+' --controller-port='+port;
				
			if (powArgs) command += ' '+powArgs.join(' ');
			require('child_process').exec(command);
			io.on('connection', function(player){
				return function(socket){
					io.emit('secret', { message: secret });
					socket.on('event', function(webData) {
						if (typeof webData.value !== 'undefined') powderApi.emit(webData.name, webData.value);
						else if (webData.name) powderApi.emit(webData.name);
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
	
					socket.on('update', function(webData) {
						if (webData.name && typeof webData.value !== 'undefined') {
							powderApi.params[webData.name] = webData.value;
						}
					});
					
					socket.on('event', function(webData) {
						if (typeof webData.value !== 'undefined') {
							if (webData.name == 'State') {
								webData.value = webData.value.charAt(0).toUpperCase() + webData.value.slice(1); // capitalize first letter
								if (defaults.state[webData.value]) {
									powderApi.params.state = webData.value;
									powderApi.params.stateInt = defaults.state[webData.value];
									if (webData.value == 'Playing') powderApi.params.playing = true;
									else  powderApi.params.playing = false;
								}
							} else if (webData.name == 'Time') powderApi.params.time = webData.value;
							else if (webData.name == 'Position') powderApi.params.position = webData.value;
							else if (webData.name == 'MediaChanged') {
								powderApi.params.currentItem = webData.value;
								powderApi.params.subTrack = 0;
								powderApi.params.subDelay = 0;
								powderApi.params.aspectRatio = 'Default';
								powderApi.params.crop = 'Default';
								powderApi.params.zoom = 1;
							}
							else if (webData.name == 'TorrentProgress') powderApi.params.torrentProgress = webData.value;
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
			this.send(cType, set);
			return true;
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
		else if (typeof val !== 'undefined') this.async(function() {},cType,val);
		else {
			if (typeof powderApi.params[cType] !== 'undefined') return powderApi.params[cType];
			else return false;
		}
		return true;
	};
	
	powderApi.send = function(cType,cValue) {
		if (!this.connection) return false;
		if (typeof cValue === 'object') this.connection.emit(cType, cValue);
		else if (typeof cValue !== 'undefined') this.connection.emit(cType, { value: cValue });
		else this.connection.emit(cType);
		return true;
	};
	
	powderApi.getAll = function() { return powderApi.params };
	
	methods = ['play','pause','stop','next','prev','close','clearPlaylist','toggleFullscreen','toggleMute','playItem','removeItem','notify']
	methods.forEach(function(el) { powderApi[el] = function(elem) { return function(i) { return this.send(elem,i); } }(el) });
	
	methods = ['subCount','audioCount','fps','length','width','height','state','stateInt','itemCount','playing'];
	methods.forEach(function(el) { powderApi[el] = function(elem) { return function(cb) { return this.request(elem,cb) } }(el) });
	
	methods = ['currentItem','time','position','rate','subTrack','subDelay','stateInt','itemCount','playing','audioTrack','audioDelay','audioChan','audioChanInt','volume','rate','aspectRatio','crop','zoom','mute','fullscreen','torrentProgress'];
	methods.forEach(function(el) { powderApi[el] = function(elem) { return function(i,cb) { return this.twoWay(elem,i,cb) } }(el) });
	
	methods = ['subDesc','audioDesc','itemDesc'];
	methods.forEach(function(el) { powderApi[el] = function(elem) { return function(i,cb) {
		if (typeof i !== 'undefined' && typeof cb === 'function') {
			 return this.twoWay(elem,i,cb)
		} else throw("Error: Value and Callback Function are mandatory for this method.");
	} }(el) });
	
	methods = ['torrentPlay','torrentPause'];
	methods.forEach(function(el) { powderApi[el] = function(elem) { return function(i,cb) { this.send(el,{ }); return true; } }(el) });
	
	powderApi.addPlaylist = function(settings) { this.send('addPlaylist',{ value: settings }) };
	powderApi.advanceItem = function(pValue,cValue) { return this.send('advanceItem', { prev: pValue, count: cValue }); };
	
	powderApi.mediaFiles = function() {
		if (powderApi.params.mediaFiles) {
			return powderApi.params.mediaFiles;
		} else return false;
	}
	
	return powderApi;

}

module.exports = api;
