# Powder Remote

Node.js Controller for [Powder Player](https://github.com/jaruba/PowderPlayer).

[**Building Powder Remote**](https://github.com/jaruba/powder-remote/wiki)

[**JavaScript API**](https://github.com/jaruba/powder-remote/wiki/JavaScript-API)

### Example Usage

Start a youtube video with a custom subtitle:


	powder = require('powder-remote')
	
	powder.startPlayer(function() {
	
		this.addPlaylist({
			url: "https://www.youtube.com/watch?v=HomAZcKm3Jo",
			defaultSub: "Custom Subtitle",
			subtitles: {
			  "Custom Subtitle": "http://dl.opensubtitles.org/en/download/subencoding-utf8/file/1952537611.srt"
			}
		})

	})


Starting a video from a http server and listening to some the events:

    powder = require('powder-remote')

    powder.startPlayer(function() {
        this.addPlaylist({
            url: "http://trailers.divx.com/divx_prod/divx_plus_hd_showcase/Sintel_DivXPlus_6500kbps.mkv",
            title: "Sintel 2010"
        })
        this.events.on("Opening",function() { console.log("Opening") })
        this.events.on("Buffering",function(prc) { console.log("Buffering: "+prc) })
        this.events.on("Playing",function() { console.log("Playing") })
        this.events.on("Paused",function() { console.log("Paused") })
        this.events.on("Stopped",function() { console.log("Stopped") })
        this.events.on("Ended",function() { console.log("Ended") })
        this.events.on("MediaChanged",function() { console.log("Media Changed") })
    })
