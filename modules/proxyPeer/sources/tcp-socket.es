import logger from './logger';

let MAIN_THREAD = null;
let TRANSPORT_SERVICE = null;
let OK_RESULT = null;
try {
  MAIN_THREAD = Components.classes['@mozilla.org/thread-manager;1']
    .getService(Components.interfaces.nsIThreadManager).mainThread;
  TRANSPORT_SERVICE = Components.classes['@mozilla.org/network/socket-transport-service;1']
    .getService(Components.interfaces.nsISocketTransportService);
  OK_RESULT = Components.results.NS_OK;
} catch (ex) {
  logger.error(`TCP MAIN_THREAD ERROR ${ex}`);
}


// Uniq IDs generator
function getRandomID() {
  const min = 1;
  const max = Number.MAX_SAFE_INTEGER;
  return Math.floor(Math.random() * ((max - min) + 1)) + min;
}


/* Reads all available data from the given input stream.
 *
 * @param {nsIBinaryInputStream} inputStream The stream to read from.
 */
function readBytes(binaryStream) {
  const bytesAvailable = binaryStream.available();
  const lineData = binaryStream.readByteArray(bytesAvailable);
  const buffer = new ArrayBuffer(lineData.length);
  const typedBuffer = new Uint8Array(buffer);
  typedBuffer.set(lineData);
  return typedBuffer;
}


export class TcpConnection {

  /* @param {nsISocketTransport} transport
   */
  constructor(transport) {
    this.transport = transport;
    this.transportPort = transport.port;
    this.id = getRandomID();

    this.input = transport.openInputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0)
      .QueryInterface(Ci.nsIAsyncInputStream);
    this.output = transport.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);

    // Create binary writer
    this._binaryWriter = Components.classes['@mozilla.org/binaryoutputstream;1']
        .createInstance(Components.interfaces.nsIBinaryOutputStream);
    this._binaryWriter.setOutputStream(this.output);

    // Create binary reader
    this._binaryReader = Components.classes['@mozilla.org/binaryinputstream;1']
        .createInstance(Components.interfaces.nsIBinaryInputStream);
    this._binaryReader.setInputStream(this.input);

    // Callbacks
    this.onClose = null;

    logger.debug(`TCP new connection ${JSON.stringify({
      input: this.input,
      output: this.output,
      transportPort: this.transportPort,
      id: this.id,
    })}`);
  }

  /* Close the connection.
   */
  close() {
    // Close the transport and any open streams.
    // Closing transport already close any opened stream
    // this.input.close();
    // this.output.close();
    this.transport.close(OK_RESULT);
  }

  /* Sends a chunk of data through the opened socket.
   *
   * @param {Uint8Array} data - Chunk of data to be sent.
   * @param {integer} length - Number of octets to be sent.
   */
  sendData(data, length) {
    logger.debug(`TCP ${this.id} sends ${length} octets`);
    return Promise.resolve(this._binaryWriter.writeByteArray(data, length))
      .catch((ex) => {
        logger.debug(`TCP exception on sendData ${ex}`);
      });
  }

  /* Returns a promise wrapping the next chunk of data received
   * through the opened socket.
   */
  getNextData() {
    const self = this;

    return new Promise((resolve, reject) => {
      this.input.asyncWait({
        onInputStreamReady() {
          try {
            const data = readBytes(self._binaryReader);
            logger.debug(`TCP socket ${self.id} received ${data.length} octets`);
            resolve(data);
          } catch (ex) {
            self.close();
            reject(ex);
          }
        },
      }, 0, 0, MAIN_THREAD);
    });
  }

  /* Registers a callback to be called everytime a new chunk
   * of data is received through the socket.
   *
   * @param {function} callback - callback called on each chunk of data.
   */
  registerCallbackOnData(callback) {
    this.getNextData().then((data) => {
      callback(data);
      this.registerCallbackOnData(callback);
    }).catch((ex) => {
      logger.debug(`TCP ${this.id} closing connection ${ex} ${ex.stack}`);
      try {
        // Make sure transport is properly closed
        this.close();
      } catch (e) {
        // Exception might be raised for already closed streams
      }

      if (this.onClose !== null) {
        this.onClose();
      }
    });
  }

  registerCallbackOnClose(callback) {
    this.onClose = callback;
  }
}


/* Opens a new socket connected to given host and port.
 *
 * @param {String} host - Host to connect to.
 * @param {String} port - Port to use.
 */
export function openSocket(host, port) {
  logger.debug(`TCP openSocket ${host}:${port}`);
  const transport = TRANSPORT_SERVICE.createTransport(
    null,  // aSocketTypes
    0,     // aTypeCount
    host,  // aHost
    port,  // aPort
    null); // aProxyInfo

  return new TcpConnection(transport);
}
