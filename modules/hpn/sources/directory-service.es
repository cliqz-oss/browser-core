import CliqzSecureMessage from 'hpn/main';

/**
Load Directory Service Public key.
*/
export default class{
  constructor(){
    this.dsPubKey = "-----BEGIN PUBLIC KEY-----\
    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwXo4hXvboKHCggNJ0UNF\
    vZQfDWi0jNcF1kBHthxilMu6LB/hFrSMQ+/FgTqVE36cCezWE0K1UcwmYGVsuqxc\
    vql82RfCmYUVBroJ3UFG8qnetYfU5FOk43C555p5l5HzlF8QilcCUBCO4SCj9lEZ\
    3/8FJboCupTqxEUq7nwUgaNZOiGKMdDUBZJO1tW4LSH4lj9IAZccEJ5HKVmJKopQ\
    3hmzWgDqowxni4NQz+0DnsSfCGAupKaJDxjfajJosX5i674rgdHbZGtgHB3M9jhc\
    6HFNPcmtUgLwgtUtRwMhSnya6q/O06euouNi1h0m5eRrWeMRlJSdUnelLSU8QNy7\
    LQIDAQAB\
    -----END PUBLIC KEY-----"
    this.endPoint = CliqzSecureMessage.BLIND_SIGNER;
    this.loadKey = new CliqzSecureMessage.JSEncrypt();
    this.loadKey.setPublicKey(CliqzSecureMessage.signerKey || this.dsPubKey);
    this.n = this.loadKey.parseKeyValues(this.dsPubKey)['mod'];
    this.e = '' + this.loadKey.parseKeyValues(this.dsPubKey)['e']; // Needs to be string, else fails on blinding nonce.
  }
};


