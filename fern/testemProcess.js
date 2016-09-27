var Testem  = require('testem')

var testem = new Testem()

process.on('message', function(msg) {
	if (msg.cmd === 'start') {
		testem.startDev(msg.options)
	} else if (msg.cmd === 'restart') {
		testem.restart()
	}
})
