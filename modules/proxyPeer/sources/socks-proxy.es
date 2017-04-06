import console from 'core/console';
import { TcpConnection } from 'proxyPeer/tcp-socket';


export default class SocksProxy {
  constructor() {
    this.host = '0.0.0.0';

    this._socket = Cc['@mozilla.org/network/server-socket;1']
      .createInstance(Ci.nsIServerSocket);

    // Choose a random port
    this._socket.init(-1, true, -1);
    this._socket.asyncListen(this);

    this.onSocketOpen = undefined;
  }

  isInitialized() {
    return this._socket !== null;
  }

  getHost() {
    return this.host;
  }

  getPort() {
    return this._socket.port;
  }

  addSocketOpenListener(callback) {
    this.onSocketOpen = callback;
  }

  unload() {
    this._socket.close();
  }

  /* Accept a request from a new client.
   *
   * @param {nsIServerSocket} socket - The server socket
   * @param {nsISocketTransport} transport - The connected socket transport
   */
  onSocketAccepted(socket, transport) {
    try {
      if (this.onSocketOpen !== undefined) {
        this.onSocketOpen(new TcpConnection(transport));
      } else {
        // TODO: Exception or logging?
      }
    } catch (ex) {
      console.debug(`proxyPeer SOCKS PROXY error on socket accept ${ex}`);
    }
  }

  onStopListening(/* socket, status */) {
  }
}
