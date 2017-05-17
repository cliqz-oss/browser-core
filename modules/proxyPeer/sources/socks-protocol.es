/* eslint no-bitwise: off */

// Supported SOCKS version
export const SOCKS5 = 5;


// Socks authentication
export const AUTH_METHOD = {
  NOAUTH: 0x00,
  GSSAPI: 0x01,
  USER_PASSWORD: 0x02,
  IANA_ASSIGNED: 0x03,
  NO_ACCEPTABLE_METHOD: 0xFF,
};


export const COMMAND_TYPE = {
  TCP_CONNECT: 1,
  TCP_BIND: 2,
  UDP_ASSOCIATE: 3,
};


export const ADDRESS_TYPE = {
  IP_V4: 1,
  DOMAIN_NAME: 3,
  IP_V6: 4,
};


export const SERVER_REPLY = {
  SUCCEEDED: 0,
  GENERAL_SOCKS_SERVER_FAILURE: 1,
  CONNECTION_NOT_ALLOWED_BY_RULESET: 2,
  NETWORK_UNREACHABLE: 3,
  HOST_UNREACHABLE: 4,
  CONNECTION_REFUSED: 5,
  TTL_EXPIRED: 6,
  COMMAND_NOT_SUPPORTED: 7,
  ADDRESS_TYPE_NOT_SUPPORTED: 8,
  // X'09' to X'FF' unassigned
};

/*
 * +----+----------+----------+
 * |VER | NMETHODS | METHODS  |
 * +----+----------+----------+
 * | 1  |    1     | 1 to 255 |
 * +----+----------+----------+
 */
export function parseHandshake(data) {
  const socksVersion = data[0];
  const nAuthMethods = data[1];
  const authenticationMethods = data.slice(2, 3 + nAuthMethods);

  return {
    VER: socksVersion,
    NMETHODS: nAuthMethods,
    METHODS: authenticationMethods,
  };
}


/*
 * +----+-----+-------+------+----------+----------+
 * |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
 * +----+-----+-------+------+----------+----------+
 * | 1  |  1  | X"00" |  1   | Variable |    2     |
 * +----+-----+-------+------+----------+----------+
 */
export function parseRequest(data) {
  // Parse Socks version (should be 5)
  const socksVersion = data[0];

  // One of:
  // TCP_CONNECT
  // TCP_BIND
  // UDP_ASSOCIATE
  const command = data[1];
  if (command !== COMMAND_TYPE.TCP_BIND &&
      command !== COMMAND_TYPE.TCP_CONNECT &&
      command !== COMMAND_TYPE.UDP_ASSOCIATE) {
    // SERVER_REPLY.COMMAND_NOT_SUPPORTED
    return undefined;
  }

  // Parse destination
  const addressType = data[3];
  let address = null;
  switch (addressType) {
    // 4 octets long
    case ADDRESS_TYPE.IP_V4:
      address = data.slice(4, 4 + 4).join('.');
      break;

    // Variable length (stored in first octet)
    case ADDRESS_TYPE.DOMAIN_NAME:
      // NOTE: It should never happen when firefox is proxying
      // data[4] == length
      address = String.fromCharCode.apply(null, data.slice(5, 5 + data[4]));
      break;

    // 16 octets long
    case ADDRESS_TYPE.IP_V6:
      address = data.slice(4, 4 + 16);
      break;

    default:
      // TODO: throw error
      // SERVER_REPLY.ADDRESS_TYPE_NOT_SUPPORTED
      return undefined;
  }

  // Parse port
  const portOffset = data.length - 2;
  const port = (data[portOffset] << 8) | data[portOffset + 1];

  return {
    VER: socksVersion,
    CMD: command,
    ATYP: addressType,
    'DST.ADDR': address,
    'DST.PORT': port,
  };
}
