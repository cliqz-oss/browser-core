const WebSocket = require('ws');
const fs = require('fs');

exports.TapStreamer = class TapStreamer {
  constructor(host = '127.0.0.1', port = 3001) {
    this.logFile = process.env.EXTENSION_LOG;
    // Listener to close event
    this.onclose = () => { };

    // Start listening for client
    this.wss = new WebSocket.Server({ host, port });
    this.sockets = new Set();

    this.wss.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('TAP result streamer error', err);
    });

    this.wss.on('connection', async (ws) => {
      // Keep track of opened sockets so that they can be terminated properly on `unload`
      this.sockets.add(ws);

      ws.on('message', (message) => {
        const parsed = JSON.parse(message);
        if (parsed.tap) {
          // Forward logs from browser to stdin
          // eslint-disable-next-line no-console
          console.log(parsed.tap);
        } else if (this.logFile && parsed.log) {
          const s = `${(new Date()).toISOString()} ${parsed.log}`;
          fs.appendFileSync(this.logFile, s);
        } else if (parsed.action === 'END') {
          this.onclose();
        }
      });

      ws.on('close', () => {
        this.onclose();
        this.sockets.delete(ws);
      });
    });
  }

  unload() {
    this.wss.close();
    this.sockets.forEach((ws) => {
      ws.close();
    });
  }
};
