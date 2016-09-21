var directoryServicePK = class directoryServicePK {
	constructor(){
	    this.dsPubKey = "-----BEGIN PUBLIC KEY-----\
	    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2YQdJOUx4/XT5uRlMl+9\
	    rCnyoPVcRLmbdd+DcUDPVYHxLl9bUorgfZHNnu/HPWj5vLRIF7mNnAFhZByZj/Fv\
	    QHqfOptrFEJP5h9/2iAUBr2ZgRsWHhGGEBDRXI3FLvuqFCf8jcDRsVRXqiJ8ZMJg\
	    aF+a4j2Smt7XYDlG56L+MZCXgaR6mlevXMymee8Cf1Y28+mtV4Q8UZPCqARWNKeN\
	    u8HG0X39lWb/boqB2IiZHdclpmeYpuHHlcPZ2Qg/5ofi7KlZXA9SW3w3WguQnR/T\
	    KC+sZd49fI63H4lpIN/Mkk4tq4oYR9zrvGUP5944+ozLiY4+sXFXjYJ9Lq/jZdHl\
	    BQIDAQAB\
	    -----END PUBLIC KEY-----"
	    this.endPoint = CliqzSecureMessage.BLIND_SIGNER;
	    this.loadKey = new CliqzSecureMessage.JSEncrypt();
	    this.loadKey.setPublicKey(CliqzSecureMessage.signerKey || this.dsPubKey);
	    this.n = this.loadKey.parseKeyValues(this.dsPubKey)['mod'];
	    this.e = '' + this.loadKey.parseKeyValues(this.dsPubKey)['e']; // Needs to be string, else fails on blinding nonce.
	}
};