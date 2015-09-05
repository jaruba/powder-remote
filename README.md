# Powder Remote

Node.js Controller for [Powder Player](https://github.com/jaruba/PowderPlayer).

Supports Magnet Links, Youtube Links and all VLC supported Media Files/URLs (for local files use ``file:///`` in front of the absolute file paths)

[**JavaScript API**](https://github.com/jaruba/powder-remote/wiki/JavaScript-API)

### Install

    npm install powder-remote


### Initiation

	pRemote = require('powder-remote')
	
	powder = new pRemote()


### Example Usage

Start a youtube video in fullscreen mode with a custom subtitle:

	powder.startPlayer(['--fs'],function() {
	
		this.addPlaylist({
			url: "https://www.youtube.com/watch?v=HomAZcKm3Jo",
			title: "Custom Title",
			defaultSub: "Custom Subtitle",
			subtitles: {
			  "Custom Subtitle": "http://dl.opensubtitles.org/en/download/subencoding-utf8/file/1952537611.srt"
			}
		})

	})


Starting a video from a http server and listening to some of the events:

    powder.startPlayer(function() {
        this.addPlaylist({
            url: "http://trailers.divx.com/divx_prod/divx_plus_hd_showcase/Sintel_DivXPlus_6500kbps.mkv",
            title: "Sintel 2010"
        })
        this.on("Opening",function() { console.log("Opening") })
        this.on("Buffering",function(prc) { console.log("Buffering: "+prc) })
        this.on("Playing",function() { console.log("Playing") })
        this.on("Paused",function() { console.log("Paused") })
        this.on("Stopped",function() { console.log("Stopped") })
        this.on("Ended",function() { console.log("Ended") })
        this.on("MediaChanged",function() { console.log("Media Changed") })
        this.on("TorrentProgress",function(prc) { console.log("Torrent Progress: "+prc) })
    })
