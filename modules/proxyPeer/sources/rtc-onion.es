import console from 'core/console';
import { generateAESKey
       , encryptRSA
       , decryptRSA
       , encryptAES
       , decryptAES
       , fromArrayBuffer } from 'proxyPeer/rtc-crypto';


/*
 * Socks to RTC
 */


function padPayload(data /* , paddingLength */) {
  // TODO: padding necessary?
  // TODO: implement different padding sizes to avoid sending too much data
  return data;
}


function encryptPayload(payload, pubKey) {
  const data = (new TextEncoder()).encode(JSON.stringify(payload));
  return generateAESKey()
    .then(aesKey => encryptRSA(
      padPayload(data, 20000),
      pubKey,
      aesKey,
    ))
    .then(JSON.stringify);
}


export function decryptPayload(data, privKey) {
  const parsed = JSON.parse(data);
  try {
    return decryptRSA(parsed, privKey)
      .then(decrypted => JSON.parse((new TextDecoder()).decode(decrypted)));
  } catch (ex) {
    // From exit node to client, the payload is just a JSON
    // with an AES encrypted message. So no RSA decryption is
    // necessary.
    return Promise.resolve(parsed);
  }
}


export function wrapOnionRequest(data, peers, connectionID, aesKey, messageNumber) {
  // Deeper layer of the request, used by the exit node
  const onionRequest = {
    aesKey,
    connectionID,
    messageNumber,
    role: 'exit',
    data: [...data.values()],
  };

  const wrapRequest = (layer, i) => {
    if (i > 0) {
      const peerName = peers[i].name;
      const pubKey = peers[i].pubKey;
      return encryptPayload(layer, pubKey).then(encrypted => wrapRequest(
        {
          connectionID,
          role: 'relay',
          messageNumber,
          nextPeer: peerName,
          data: encrypted,
        },
        i - 1)).catch((e) => { console.debug(`proxyPeer PEER ERROR ${e}`); });
    }

    return encryptPayload(layer, peers[0].pubKey);
  };

  return wrapRequest(onionRequest, peers.length - 1);
}


export function sendOnionRequest(onionRequest, peers, peer) {
  console.debug(`proxyPeer sendOnionRequest to ${JSON.stringify(peers[0])}`);
  return peer.send(
    peers[0].name,
    onionRequest,
    'antitracking',
  ).catch((e) => {
    console.debug(`proxyPeer CLIENT ERROR: could not send message ${e}`);
  });
}


/*
 * Exit node
 */


export function createResponseFromExitNode(data, aesKey, iv) {
  return Promise.resolve(encryptAES(data, aesKey, iv).then(encrypted => encrypted[1]))
    .catch((ex) => {
      console.debug(`proxyPeer SERVER ERR encryptResponse ${ex}`);
      return Promise.reject(ex);
    });
}


export function decryptResponseFromExitNode(encrypted, aesKey, iv) {
  // TODO: Remove double conversion of iv
  return Promise.resolve(decryptAES([fromArrayBuffer(iv, 'b64'), encrypted], aesKey))
    .catch((ex) => {
      console.debug(`proxyPeer SERVER ERR decryptResponse ${ex}`);
      return Promise.reject(ex);
    });
}
