# Powder Remote

Node.js Controller for [Powder Player](https://github.com/jaruba/PowderPlayer) based on the [Web API](https://github.com/jaruba/PowderPlayer/wiki/Web-API-Docs).

Supports Magnet Links, Youtube Links and all VLC supported Media Files/URLs (for local files use ``file:///`` in front of the absolute file paths)

[**JavaScript API**](https://github.com/jaruba/powder-remote/wiki/JavaScript-API)


### Install

    npm install powder-remote


### Initiation

```javascript
const pRemote = require('powder-remote')
	
const powder = new pRemote()
```


### Example Usage

Start a youtube video in fullscreen mode:

```javascript
powder.start_player({ args: ['--fs'] }).then(remote => {

    remote.add_playlist({
        url: "https://www.youtube.com/watch?v=HomAZcKm3Jo"
    })

}).catch(e => {
    console.error(e)
})
```

Starting a video from a http server and listening to some of the events:

```javascript
powder.start_player().then(remote => {
    remote.add_playlist({
        url: "https://download.blender.org/durian/movies/Sintel.2010.1080p.mkv"
    })
    remote.on("initialPlay",function() { console.log("initialPlay") })
    remote.on("Opening",function() { console.log("Opening") })
    remote.on("Buffering",function() { console.log("Buffering") })
    remote.on("Playing",function() { console.log("Playing") })
    remote.on("Paused",function() { console.log("Paused") })
    remote.on("Stopped",function() { console.log("Stopped") })
    remote.on("Ended",function() { console.log("Ended") })
}).catch(e => {
    console.error(e)
})
```
