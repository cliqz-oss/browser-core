"use strict";

function equalPromises(a, b) {
  return Promise.all([a, b])
    .then(function(x) {
      chai.expect(x[0]).to.equal(x[1]);
    });
}
function notEqualPromises(a, b) {
  return Promise.all([a, b])
    .then(function(x) {
      chai.expect(x[0]).to.not.equal(x[1]);
    });
}

DEPS.WebCryptoTest = ["core/utils"];
TESTS.WebCryptoTest = function(CliqzUtils) {
  var subtle;
  var encoding;
  beforeEach(function() {
    encoding = getModule('core/encoding');
    subtle = getModule('core/crypto/subtle-polyfill').default;
  });
  describe('WebCrypto polyfill', function() {
    this.timeout(60000);
    var cachedKey;

    describe('RSA-OAEP', function() {
      function exportPublicKey(key, s) {
        return s.exportKey(
          'spki',
           key
        );
      }

      function importPublicKey(key, s) {
        return s.importKey(
          'spki',
          key,
          { name: 'RSA-OAEP', hash: { name: 'SHA-256' } },
          true,
          ['encrypt', 'wrapKey']
        );
      }

      function exportPrivateKey(key, s) {
        return s.exportKey(
          'pkcs8',
           key
        );
      }

      function importPrivateKey(key, s) {
        return s.importKey(
          'pkcs8',
          key,
          { name: 'RSA-OAEP', hash: { name: 'SHA-256' } },
          true,
          ['decrypt', 'unwrapKey']
        );
      }

      function generateKey(s) {
        // Only generating once, and caching, because it's too slow...
        if (cachedKey) {
          return Promise.all([
            importPublicKey(cachedKey.publicKey, s),
            importPrivateKey(cachedKey.privateKey, s),
          ])
          .then(function(result) {
            return { publicKey: result[0], privateKey: result[1] };
          });
        }
        return s.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: { name: 'SHA-256' },
          },
          true,
          ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
        ).then(function(result) {
          return Promise.all([
            exportPublicKey(result.publicKey, s),
            exportPrivateKey(result.privateKey, s),
          ])
          .then(function(result2) {
            cachedKey = {
              publicKey: result2[0],
              privateKey: result2[1],
            };
            return result;
          });
        });
      }

      function encrypt(key, data, s) {
        return s.encrypt({ name: 'RSA-OAEP' }, key, data);
      }

      function encryptAES(key, data, iv, s) {
        return s.encrypt({ name: 'AES-GCM', iv }, key, data);
      }

      function decryptAES(key, data, iv, s) {
        return s.decrypt({ name: 'AES-GCM', iv }, key, data);
      }

      function decrypt(key, data, s) {
        return s.decrypt(
          { name: 'RSA-OAEP' },
          key,
          data
        );
      }
      // 'raw', aesKey, pk, { name: 'RSA-OAEP', hash: { name: 'SHA-256' } }
      function wrapKey(key, publicKey, s) {
        return s.wrapKey('raw', key, publicKey, { name: 'RSA-OAEP', hash: { name: 'SHA-256' } });
      }

      function unwrapKey(key, privateKey, s) {
        return s.unwrapKey(
          'raw',
          key,
          privateKey,
          {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: { name: 'SHA-256' },
          },
          {
            name: 'AES-GCM',
            length: 256,
          },
          true,
          ['encrypt', 'decrypt']
        );
      }

      function generateAESKey(s) {
        return s.generateKey(
          { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
        );
      }

      function testEncrypt(c1, c2) {
        var data = new Uint8Array([1, 2, 3, 4, 5]);
        return generateKey(c1)
          .then((key) => {
            var publicKey = key.publicKey;
            var privateKey = key.privateKey;
            return Promise.all([
              encrypt(publicKey, data, c1),
              exportPrivateKey(privateKey, c1),
            ])
            .then((exported) => {
              var encrypted = exported[0];
              return importPrivateKey(exported[1], c2)
                .then(importedKey => decrypt(importedKey, encrypted, c2))
                .then((what) => {
                  chai.expect(encoding.toBase64(what)).to.equal(encoding.toBase64(data));
                });
            });
          });
      }

      function testWrapKey(c1, c2) {
        var data = new Uint8Array([1, 2, 3, 4, 5]);
        return Promise.all([generateKey(c1), generateAESKey(c1)])
          .then((keys) => {
            var iv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            var publicKey = keys[0].publicKey;
            var privateKey = keys[0].privateKey;
            var aesKey = keys[1];
            return Promise.all([
              wrapKey(aesKey, publicKey, c1),
              exportPrivateKey(privateKey, c1),
              encryptAES(aesKey, data, iv, c1),
            ])
            .then((exported) => {
              var encrypted = exported[0];
              return importPrivateKey(exported[1], c2)
                .then(importedKey => unwrapKey(encrypted, importedKey, c2))
                .then(unwrappedKey => decryptAES(unwrappedKey, exported[2], iv, c2))
                .then((what) => {
                  chai.expect(encoding.toBase64(what)).to.equal(encoding.toBase64(data));
                });
            });
          });
      }

      it('encrypt, decrypt', function() {
        return Promise.all([
          testEncrypt(crypto.subtle, subtle),
          testEncrypt(subtle, crypto.subtle),
          testEncrypt(subtle, subtle),
          testEncrypt(crypto.subtle, crypto.subtle),
        ]);
      });

      it('wrap, unwrap', function() {
        return Promise.all([
          testWrapKey(crypto.subtle, subtle),
          testWrapKey(subtle, crypto.subtle),
          testWrapKey(subtle, subtle),
          testWrapKey(crypto.subtle, crypto.subtle),
        ]);
      });
    });

    describe('RSASSA-PKCS1-v1_5', function() {
      function exportPublicKey(key, s) {
        return s.exportKey(
          'spki',
           key
        );
      }

      function importPublicKey(key, s) {
        return s.importKey(
          'spki',
          key,
          { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
          true,
          ['verify']
        );
      }

      function exportPrivateKey(key, s) {
        return s.exportKey(
          'pkcs8',
           key
        );
      }

      function importPrivateKey(key, s) {
        return s.importKey(
          'pkcs8',
          key,
          { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
          true,
          ['sign']
        );
      }

      function generateKey(s) {
        // Only generating once, and caching, because it's too slow...
        if (cachedKey) {
          return Promise.all([
            importPublicKey(cachedKey.publicKey, s),
            importPrivateKey(cachedKey.privateKey, s),
          ])
          .then(function(result) {
            return { publicKey: result[0], privateKey: result[1] };
          });
        }
        return s.generateKey(
          {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: { name: 'SHA-256' },
          },
          true,
          ['sign', 'verify']
        ).then(function(result) {
          return Promise.all([
            exportPublicKey(result.publicKey, s),
            exportPrivateKey(result.privateKey, s),
          ])
          .then(function(result2) {
            cachedKey = {
              publicKey: result2[0],
              privateKey: result2[1],
            };
            return result;
          });
        });
      }

      function sign(key, data, s) {
        return s.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, data);
      }

      function verify(key, data, sig, s) {
        return s.verify(
          { name: 'RSASSA-PKCS1-v1_5' },
          key,
          sig,
          data
        );
      }

      describe('generateKey, exportKey, importKey', function() {
        function testPublicKey(c1, c2) {
          var k1;
          return generateKey(c1)
            .then(x => exportPublicKey(x.publicKey, c1))
            .then((k) => {
              k1 = encoding.toBase64(k);
              return k;
            })
            .then(publicKey => importPublicKey(publicKey, c2))
            .then(publicKey => exportPublicKey(publicKey, c2))
            .then(encoding.toBase64)
            .then((k2) => {
              chai.expect(k1).to.equal(k2);
            });
        }
        it('public key', function() {
          return Promise.all([
            testPublicKey(crypto.subtle, subtle),
            testPublicKey(subtle, crypto.subtle),
            testPublicKey(subtle, subtle),
            testPublicKey(crypto.subtle, crypto.subtle),
          ]);
        });

        function testPrivateKey(c1, c2) {
          var k1;
          return generateKey(c1)
            .then(x => exportPrivateKey(x.privateKey, c1))
            .then((k) => {
              k1 = encoding.toBase64(k);
              return k;
            })
            .then(k => importPrivateKey(k, c2))
            .then(k => exportPrivateKey(k, c2))
            .then(encoding.toBase64)
            .then((k2) => {
              chai.expect(k1).to.equal(k2);
            });
        }
        it('private key', function() {
          return Promise.all([
            testPrivateKey(crypto.subtle, subtle),
            testPrivateKey(subtle, crypto.subtle),
            testPrivateKey(subtle, subtle),
            testPrivateKey(crypto.subtle, crypto.subtle),
          ]);
        });
      });

      function testSign(c1, c2) {
        var data = new Uint8Array([1, 2, 3, 4, 5]);
        var data2 = new Uint8Array([1, 2, 3, 4, 5, 6]);
        return generateKey(c1)
          .then((key) => {
            var publicKey = key.publicKey;
            var privateKey = key.privateKey;
            return Promise.all([
              sign(privateKey, data, c1),
              exportPublicKey(publicKey, c1),
              exportPrivateKey(privateKey, c1),
            ]).then((exported) => {
              var signature = exported[0];
              return Promise.all([
                importPublicKey(exported[1], c2)
                .then(importedKey => verify(importedKey, data2, signature, c2))
                .then(what => chai.expect(what).to.be.false),
                importPublicKey(exported[1], c2)
                .then(importedKey => verify(importedKey, data, signature, c2))
                .then(what => chai.expect(what).to.be.true),
              ]);
            });
          });
      }

      it('sign, verify', function() {
        return Promise.all([
          testSign(crypto.subtle, subtle),
          testSign(subtle, crypto.subtle),
          testSign(subtle, subtle),
          testSign(crypto.subtle, crypto.subtle),
        ]);
      });
    });
    describe('AES-GCM', function() {
      function generateKey(s) {
        return s.generateKey(
          { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
        );
      }

      function exportKey(key, s) {
        return s.exportKey('raw', key)
        .then(_key => encoding.toHex(_key));
      }

      function importKey(key, s) {
        return s.importKey('raw', encoding.fromHex(key, 'hex'),
          { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      }

      function encrypt(key, data, iv, s) {
        return s.encrypt({ name: 'AES-GCM', iv }, key, data);
      }

      function decrypt(key, data, iv, s) {
        return s.decrypt({ name: 'AES-GCM', iv }, key, data);
      }

      function testKeys(c1, c2) {
        return generateKey(c1)
        .then(function(key) {
          return exportKey(key, c1);
        })
        .then(function(exportedKey) {
          return importKey(exportedKey, c2)
          .then(function(importedKey) {
            return exportKey(importedKey, c2);
          })
          .then(function(exportedKey2) {
            chai.expect(exportedKey).to.equal(exportedKey2);
          });
        }).then(function() {
          return generateKey(c2)
          .then(function(key) {
            return exportKey(key, c2);
          })
          .then(function(exportedKey) {
            return importKey(exportedKey, c1)
            .then(function(importedKey) {
              return exportKey(importedKey, c1);
            })
            .then(function(exportedKey2) {
              chai.expect(exportedKey).to.equal(exportedKey2);
            });
          });
        });
      }

      it('generateKey, exportKey, importKey', function() {
        return Promise.all([
          testKeys(crypto.subtle, subtle),
          testKeys(subtle, crypto.subtle),
          testKeys(subtle, subtle),
          testKeys(crypto.subtle, crypto.subtle),
        ]);
      });

      function testEncrypt(c1, c2) {
        var keyOne;
        var keyTwo;
        return generateKey(c1)
        .then(function(key) {
          keyOne = key;
          return exportKey(key, c1);
        })
        .then(function(exportedKey) {
          return importKey(exportedKey, c2)
          .then(function(importedKey) {
            keyTwo = importedKey;
          });
        }).then(function() {
          var data = new Uint8Array([1,2,3]);
          var iv = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12]);
          return equalPromises(
            encrypt(keyOne, data, iv, c1).then(encoding.toBase64),
            encrypt(keyTwo, data, iv, c2).then(encoding.toBase64)
          ).then(function() {
            return encrypt(keyOne, data, iv, c1);
          })
          .then(function(encrypted) {
            return decrypt(keyTwo, encrypted, iv, c2);
          })
          .then(function(decrypted) {
            chai.expect(encoding.toBase64(decrypted)).to.equal(encoding.toBase64(data));
          });
        });
      }

      it('encrypt, decrypt', function() {
        return Promise.all([
          testEncrypt(crypto.subtle, subtle),
          testEncrypt(subtle, crypto.subtle),
          testEncrypt(subtle, subtle),
          testEncrypt(crypto.subtle, crypto.subtle),
        ]);
      });
    });

    describe('hash', function() {
      function sha256(x, s) {
        return s.digest('SHA-256', x).then(encoding.toHex);
      }

      function sha1(x, s) {
        return s.digest('SHA-1', x).then(encoding.toHex);
      }

      function testSha(c1, c2) {
        var datas = [
          encoding.toUTF8('data'),
          encoding.toUTF8('data2').buffer,
          new Uint8Array([1,2,3,4]),
          (new Uint8Array([1,2,3,4,5])).buffer,
        ];
        var promises = datas.map(function(data) {
          return equalPromises(
            sha256(data, c1),
            sha256(data, c2)
          );
        });

        promises = promises.concat(datas.map(function(data) {
          return equalPromises(
            sha1(data, c1),
            sha1(data, c2)
          );
        }));

        promises = promises.concat(datas.map(function(data) {
          return notEqualPromises(
            sha256(data, c1),
            sha1(data, c2)
          );
        }));

        promises.push(notEqualPromises(
          sha256(datas[0], c1),
          sha256(datas[1], c2)
        ));

        promises.push(notEqualPromises(
          sha1(datas[0], c1),
          sha1(datas[1], c2)
        ));

        return Promise.all(promises);
      }

      it('sha1 and sha256', function() {
        return Promise.all([
          testSha(crypto.subtle, subtle),
          testSha(subtle, crypto.subtle),
          testSha(subtle, subtle),
          testSha(crypto.subtle, crypto.subtle),
        ]);
      });
    });
  });
};

TESTS.WebCryptoTest.MIN_BROWSER_VERSION = 37;
