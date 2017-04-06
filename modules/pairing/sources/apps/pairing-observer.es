// Base class for pairing module observer. An instance of this class can be added
// to a peer-master or peer-slave instance using the function addObserver(channel, observer)

/* eslint no-unused-vars: ["error", {"args": "none"}] */

export default class PairingObserver {
  constructor(onchangeCallback) {
    this.onchangeCallback = onchangeCallback;
  }

  statusChanged() {
    if (this.onchangeCallback) {
      // isInit, masterID, deviceID, devices, pairingToken, isPaired, isPairing, isUnpaired
      const isInit = !!this.comm;
      const masterID = isInit && this.comm.masterID;
      const masterName = isInit && this.comm.masterName;
      const deviceID = isInit && this.comm.deviceID;
      const deviceName = isInit && this.comm.deviceName;
      const devices = isInit && this.comm.devices;
      const isPaired = isInit && this.comm.isPaired;
      const isPairing = isInit && this.comm.isPairing;
      const isUnpaired = isInit && this.comm.isUnpaired;
      const pairingToken = isInit && this.comm.pairingToken;
      const pairingRemaining = isInit && this.comm.pairingRemaining;
      this.onchangeCallback(isInit, masterID, masterName, deviceID, deviceName, devices, isPaired,
        isPairing, isUnpaired, pairingToken, pairingRemaining);
    }
  }
  // The comm object.... TODO: explain
  oninit(comm) {
    this.comm = comm;
    this.statusChanged();
  }

  onunload() {
    this.comm = null;
    this.statusChanged();
  }

  // All messages sent through this.comm.send(data, deviceID) will be received
  // from the other side through this function (as long as the PairingObserver instances)
  // are registered in the same channel). msg parameter is the sent data, source is the
  // sender deviceID and msgtype the channel (probably not needed).
  onmessage(msg, source, msgtype) {
    this.statusChanged();
  }

  // executed whenever a new device is paired to the same master as you.
  // device is an object with at least id and name properties,
  // where name should be a human-readable label for the device and
  // id should be used to identify the device for sending/receiving
  // messages
  ondeviceadded(device) {
    this.statusChanged();
  }

  // executed whenever a new device is unpaired from the same master as you.
  ondeviceremoved(device) {
    this.statusChanged();
  }

  // Executed whenever the device moves from unpaired to pairing status.
  // Token must be transmitted to peer-master instance through qrCodeValue
  // function in order to pair this device with it. Only one PairingObserver instance
  // should do this (GUI?)
  onpairing(token) {
    this.statusChanged();
  }

  // Executed whenever the device moves from pairing state to paired. masterID is
  // the master identifier and devices an array of objects of the same type as in
  // ondeviceadded.
  onpaired(masterID, devices) {
    this.statusChanged();
  }

  // Executed whenever the device moves from paired status to unpaired.
  onunpaired() {
    this.statusChanged();
  }

  // TODO: document possible errors, should have a way to display them
  // nicely and possibly enable localization.
  // Will errors be observer-specific? Or the same for all observers?
  onerror(e) {
    this.statusChanged();
  }

  // Called when a connection with master is stablished
  onmasterconnected() {
    this.statusChanged();
  }

  // Called when a connection with master is closed
  onmasterdisconnected() {
    this.statusChanged();
  }

  // Called for each pairing countdown tick, when in pairing status.
  // parameter is the remaining time in seconds for pairing, when 0
  // no more time and status will have moved to unpaired.
  onpairingtick(remainingSeconds) {
    this.statusChanged();
  }
}
