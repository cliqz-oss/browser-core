/**
Load Directory Service Public key.
*/
var secureLogger = class secureLogger {
  constructor(){
    // Test machine

    /*
    var publicKey = "-----BEGIN PUBLIC KEY-----\
    MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA3RSCIP98RHukGMepY8XB\
    hPMovZLXrYV1UcXncN5m/gCLo7hytbw1VL1ZzguH1LGIOBR9V+0bm13r8hp/GVAs\
    RtEZBQ5/6qoHQ29MZOHPdWeWQpxXeMzp1/1iYf7BWh9G2oiFjV+NR736kPHzYbgF\
    ivn6vroN/VWHgZ1SRWRUp8oP2g5npppv8S5gAHdjueDwppQD03HuFojYD0ciNP8h\
    evKsTAPP5r79FR7bVgJChVItcAvga1/jolhZMF1yF5IcidqN1fT6nUpWpOe/mPR7\
    sQP5227W1Vn+NGkenyeV4Bsi/J/FqPZJBtScEXeCnnZKoPR8g99p9K70AH7fsShb\
    05crnhFo/pwH6zyEzJX4XyB4ZtwGicUv8H3dTRx25hUuTsQDJPAL4FuF6mlx39XE\
    fZvIAMl6r2seCq7AldbsrmvENOLU/XWqVishHrQHys7K4DFMBYZXLlbevZ96C953\
    Luws8SkaH2uJ57DQV0LJKBU0IQOyELSE/Ysi5tUyyqRstFn/dej1oJcbKiO12l+p\
    kEYGZ2rYUTp0CO6LNQjkzlOq/8K2UhMo3QNTInneLbQHCPxIDmt8XPeSSDWabCAD\
    9+3U1d1Wc+WsUphJ16O24SDpxzOm7d5bDEheH26wEUcuve1XIC+H1ykAnIRWyNa/\
    OTUuZWzk67wG4UoswD3Cq00CAwEAAQ==\
    -----END PUBLIC KEY-----"
    */
    // Production

    var publicKey = "-----BEGIN PUBLIC KEY-----\
    MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAh5HhcRAn6+6woXQXl/Nt\
    Z+fOooNglZct/HSpYuqkcmrPauHW7EuOSq5bvpBZRTDROjR/kUPomqVZIzqhdCFP\
    A8BwXSCz7hAel2Q157vtBvh9sngMMLXb5Fgzef5N4EuKO8pL5KrS+I9tfZac41vF\
    JSdpgAirZYhh+tdcQQ1z0Qv/Rw0zOXjfvddCz3gEv2gB9KsLMVnTS1J4YOOgfza2\
    adg9Ebz1z99DiF4vtCwn0IUwH/3ToTBwJLbMnC3Ol43yBNk8rgK2mkgCi614vOSD\
    3hnVmio+iW6+AUklM8VPl6l7hEK9cljJY+9UsMVmTrvaFbMPwS6AdZCXKTmNdaMJ\
    cy3zSOXu5zvzihoQLwAu9LM3l2eVk0Mw0K7JXOP20fc8BtzWCOLYVP32r4R0BNuh\
    TtvGqjHNZHPJN5OwaxkLpn2dujL9uDWGjRiOItKMVq/nOqmNGghrbf8IOaKT7VQh\
    qOU4cXRkB/uF1UjYETBavwUZAxx9Wd/cMcAGmKiDxighxxQ29jDufl+2WG065tmJ\
    z+zCxmgrPh6Zb3KFUxPTe6yksAhWJhmGShA9v20t84M5c6NpZXoUsFcVja6XxzHe\
    SB8dWq9Uu5QcZ83Gz/ronwdEjT2OGTtBgOFeTDqLYUgphC1gcUEHOCnTNXRMQOXq\
    GwBfZHp+Mq61QcMq2rNS7xECAwEAAQ==\
    -----END PUBLIC KEY-----"
    this.keyObj = new JSEncrypt();
    this.keyObj.setPublicKey(publicKey);
  }
};