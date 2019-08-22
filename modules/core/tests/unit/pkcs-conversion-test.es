/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global describeModule */

const expect = chai.expect;

export default describeModule('core/crypto/pkcs-conversion',
  () => ({
    '../../platform/text-encoder': {
      default: function () {
        return {
          encode: function (s) {
            const buf = Buffer.from(s, 'utf8');
            return buf;
          }
        };
      },
    },
    '../../platform/text-decoder': {
      default: function () {
        return {
          decode: function (s) {
            return Buffer.from(s).toString();
          }
        };
      },
    },
  }),
  () => {
    describe('PKCS Conversion', function () {
      this.timeout(5000);
      const privateKeyJWK = {
        kty: 'RSA',
        key_ops: ['sign'],
        e: 'AQAB',
        n: '0nKhlw2zQSvi5Lo8JSYzMAXtAeew1ztSOoISJhDbFEvsR7a3_c7CcHSp1YvTgOZnheASgeVrzIxJIxUcvLDKRRg09Sh7dUtclm7pnieVCN5zoQ74aO30L7l0LZRX_Gfz9eO6h3jrGmRcQ_X1SfqN_gemQanokQOFh4xO3YVeU3lUnCglg3ALgysVYRTQm3AKgp5e4yhLm249Q0-vgkjDcJnzbLwGq9-gCvjLHineIhlpRmVb5lSV9wzLyCtdG8p1HkWWJMHtICK-JlUtEGNi0Ec7m96nnq_ceRFfzQJyQVKNrLHJOpvHPEHy9Nd7ErsaEysFFicIYiXNCBSG-hnhzw',
        d: 'kcGhV6y-faH2yTKP268EfvtrtwkQu1Gz1yAlj8XW5sza_qR39MtScm7q_iOVPs7V3qxeRSdwLUDwmuLRf4L25Top267JK2kh3HM_TTHfEEB6V4-1z38XxEIvTC5VblVVa_XpSFEgjKv8F3nwBOgLlmkX5pzWnjGRN1ufd-Aaf7bkfO8L3QdPqswyET3LqFuq1dekY7-6ZUz6wdnuwsc3_dMJfItUrlnaVzWnPeeRVYh3MXVtHQQ1Oc_wVbPdWJ-MFrFrfeqhVGyZd1_ZPTEI6LIlsbjHc9zVQRUqwfoz1r0M366UKqt4xxZHq4R4qFVUcY5uPNbZL32FS2HNx9-LwQ',
        p: '8Mfuk_GnIji599qwjDdZktXKJN441RsVphC5X4cJfFaDkq1HjVa70X4N3JTIg-FkVhbtjRxHhZIJfvVCp_h7IaGr6vZ1jvIta-5u1Wf_DWvtPJxKMgsz_krkxfVWR8ylXEZI6rPOCPO128Wr0-zn_MDj1NhnnHrKINT6jpFP6OE',
        q: '37_g-QtEVhPxxex_NZ6GwxsOz_y7_hQQVQO3QGT4-lZSO3WVtWHZYnkWgMOxLwuHrOgTKSp5bWsxeogRDhZiRDfbxdDt6OL0MCunYBJ_ybdUsrJ1HKA5Bfhg7b8INybHcXQmyCyfvHm4lzMSkNOBRoKXDOT_fv-ce1YRdAU_sK8',
        dp: 'P6t-yRxTp9b8RjBMEyfnxc5Gv-0Ldj7NQLaXbk1VEs4FyNmNXDCdRc5hd_zX8Re-4oz5kCD0QLvXSv0r_SLV3JTV0zIM8BnWLP5FzKTNaw0pFKf3brhLrWi8iiRQBnh1Gat0SKv3RaK8ajshLs8soUeYd4YqD9TgckIfZ2fBi8E',
        dq: 'amrWU1y6eb4upZYfwp7NNYpu9xkbSHK-edC0nZnomRfpMIJyW7xYKe-xdjic0uVG-EPAqTmcWyA6fi6s_ehDgHKYwnLmVHds8GQyzQy_Xm8lh4A9FwpVVLOXVjwfaiu1fA5kS5x9tKSn2LHfyKXvvFtsACQCKKLmB_sdffLpId0',
        qi: 'wjBj_ZzBcRR5ImZxTuoltlhbFrpx5FfxDVuqEm0vGZPDrkoJuA8H4VHqZpHaC-cM5eeKlS5e32pe13QJHuXD88OgKXqg1GXPnGCXPu2uk3bfbbCdJI_euqdLM3vtU25DseIBEj2tjbXH78x4vAgCo65qZV0gwFaxMovV0AnShOI',
        alg: 'RS256',
        ext: true
      };

      const privateKeyPKCS8 = 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDScqGXDbNBK+LkujwlJjMwBe0B57DXO1I6ghImENsUS+xHtrf9zsJwdKnVi9OA5meF4BKB5WvMjEkjFRy8sMpFGDT1KHt1S1yWbumeJ5UI3nOhDvho7fQvuXQtlFf8Z/P147qHeOsaZFxD9fVJ+o3+B6ZBqeiRA4WHjE7dhV5TeVScKCWDcAuDKxVhFNCbcAqCnl7jKEubbj1DT6+CSMNwmfNsvAar36AK+MseKd4iGWlGZVvmVJX3DMvIK10bynUeRZYkwe0gIr4mVS0QY2LQRzub3qeer9x5EV/NAnJBUo2ssck6m8c8QfL013sSuxoTKwUWJwhiJc0IFIb6GeHPAgMBAAECggEBAJHBoVesvn2h9skyj9uvBH77a7cJELtRs9cgJY/F1ubM2v6kd/TLUnJu6v4jlT7O1d6sXkUncC1A8Jri0X+C9uU6KduuyStpIdxzP00x3xBAelePtc9/F8RCL0wuVW5VVWv16UhRIIyr/Bd58AToC5ZpF+ac1p4xkTdbn3fgGn+25HzvC90HT6rMMhE9y6hbqtXXpGO/umVM+sHZ7sLHN/3TCXyLVK5Z2lc1pz3nkVWIdzF1bR0ENTnP8FWz3VifjBaxa33qoVRsmXdf2T0xCOiyJbG4x3Pc1UEVKsH6M9a9DN+ulCqreMcWR6uEeKhVVHGObjzW2S99hUthzcffi8ECgYEA8Mfuk/GnIji599qwjDdZktXKJN441RsVphC5X4cJfFaDkq1HjVa70X4N3JTIg+FkVhbtjRxHhZIJfvVCp/h7IaGr6vZ1jvIta+5u1Wf/DWvtPJxKMgsz/krkxfVWR8ylXEZI6rPOCPO128Wr0+zn/MDj1NhnnHrKINT6jpFP6OECgYEA37/g+QtEVhPxxex/NZ6GwxsOz/y7/hQQVQO3QGT4+lZSO3WVtWHZYnkWgMOxLwuHrOgTKSp5bWsxeogRDhZiRDfbxdDt6OL0MCunYBJ/ybdUsrJ1HKA5Bfhg7b8INybHcXQmyCyfvHm4lzMSkNOBRoKXDOT/fv+ce1YRdAU/sK8CgYA/q37JHFOn1vxGMEwTJ+fFzka/7Qt2Ps1AtpduTVUSzgXI2Y1cMJ1FzmF3/NfxF77ijPmQIPRAu9dK/Sv9ItXclNXTMgzwGdYs/kXMpM1rDSkUp/duuEutaLyKJFAGeHUZq3RIq/dForxqOyEuzyyhR5h3hioP1OByQh9nZ8GLwQKBgGpq1lNcunm+LqWWH8KezTWKbvcZG0hyvnnQtJ2Z6JkX6TCCclu8WCnvsXY4nNLlRvhDwKk5nFsgOn4urP3oQ4BymMJy5lR3bPBkMs0Mv15vJYeAPRcKVVSzl1Y8H2ortXwOZEucfbSkp9ix38il77xbbAAkAiii5gf7HX3y6SHdAoGBAMIwY/2cwXEUeSJmcU7qJbZYWxa6ceRX8Q1bqhJtLxmTw65KCbgPB+FR6maR2gvnDOXnipUuXt9qXtd0CR7lw/PDoCl6oNRlz5xglz7trpN2322wnSSP3rqnSzN77VNuQ7HiARI9rY21x+/MeLwIAqOuamVdIMBWsTKL1dAJ0oTi';

      const privateKey = 'MIIEpAIBAAKCAQEA0nKhlw2zQSvi5Lo8JSYzMAXtAeew1ztSOoISJhDbFEvsR7a3/c7CcHSp1YvTgOZnheASgeVrzIxJIxUcvLDKRRg09Sh7dUtclm7pnieVCN5zoQ74aO30L7l0LZRX/Gfz9eO6h3jrGmRcQ/X1SfqN/gemQanokQOFh4xO3YVeU3lUnCglg3ALgysVYRTQm3AKgp5e4yhLm249Q0+vgkjDcJnzbLwGq9+gCvjLHineIhlpRmVb5lSV9wzLyCtdG8p1HkWWJMHtICK+JlUtEGNi0Ec7m96nnq/ceRFfzQJyQVKNrLHJOpvHPEHy9Nd7ErsaEysFFicIYiXNCBSG+hnhzwIDAQABAoIBAQCRwaFXrL59ofbJMo/brwR++2u3CRC7UbPXICWPxdbmzNr+pHf0y1Jybur+I5U+ztXerF5FJ3AtQPCa4tF/gvblOinbrskraSHccz9NMd8QQHpXj7XPfxfEQi9MLlVuVVVr9elIUSCMq/wXefAE6AuWaRfmnNaeMZE3W5934Bp/tuR87wvdB0+qzDIRPcuoW6rV16Rjv7plTPrB2e7Cxzf90wl8i1SuWdpXNac955FViHcxdW0dBDU5z/BVs91Yn4wWsWt96qFUbJl3X9k9MQjosiWxuMdz3NVBFSrB+jPWvQzfrpQqq3jHFkerhHioVVRxjm481tkvfYVLYc3H34vBAoGBAPDH7pPxpyI4uffasIw3WZLVyiTeONUbFaYQuV+HCXxWg5KtR41Wu9F+DdyUyIPhZFYW7Y0cR4WSCX71Qqf4eyGhq+r2dY7yLWvubtVn/w1r7TycSjILM/5K5MX1VkfMpVxGSOqzzgjztdvFq9Ps5/zA49TYZ5x6yiDU+o6RT+jhAoGBAN+/4PkLRFYT8cXsfzWehsMbDs/8u/4UEFUDt0Bk+PpWUjt1lbVh2WJ5FoDDsS8Lh6zoEykqeW1rMXqIEQ4WYkQ328XQ7eji9DArp2ASf8m3VLKydRygOQX4YO2/CDcmx3F0Jsgsn7x5uJczEpDTgUaClwzk/37/nHtWEXQFP7CvAoGAP6t+yRxTp9b8RjBMEyfnxc5Gv+0Ldj7NQLaXbk1VEs4FyNmNXDCdRc5hd/zX8Re+4oz5kCD0QLvXSv0r/SLV3JTV0zIM8BnWLP5FzKTNaw0pFKf3brhLrWi8iiRQBnh1Gat0SKv3RaK8ajshLs8soUeYd4YqD9TgckIfZ2fBi8ECgYBqatZTXLp5vi6llh/Cns01im73GRtIcr550LSdmeiZF+kwgnJbvFgp77F2OJzS5Ub4Q8CpOZxbIDp+Lqz96EOAcpjCcuZUd2zwZDLNDL9ebyWHgD0XClVUs5dWPB9qK7V8DmRLnH20pKfYsd/Ipe+8W2wAJAIoouYH+x198ukh3QKBgQDCMGP9nMFxFHkiZnFO6iW2WFsWunHkV/ENW6oSbS8Zk8OuSgm4DwfhUepmkdoL5wzl54qVLl7fal7XdAke5cPzw6ApeqDUZc+cYJc+7a6Tdt9tsJ0kj966p0sze+1TbkOx4gESPa2NtcfvzHi8CAKjrmplXSDAVrEyi9XQCdKE4g==';

      const publicKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0nKhlw2zQSvi5Lo8JSYzMAXtAeew1ztSOoISJhDbFEvsR7a3/c7CcHSp1YvTgOZnheASgeVrzIxJIxUcvLDKRRg09Sh7dUtclm7pnieVCN5zoQ74aO30L7l0LZRX/Gfz9eO6h3jrGmRcQ/X1SfqN/gemQanokQOFh4xO3YVeU3lUnCglg3ALgysVYRTQm3AKgp5e4yhLm249Q0+vgkjDcJnzbLwGq9+gCvjLHineIhlpRmVb5lSV9wzLyCtdG8p1HkWWJMHtICK+JlUtEGNi0Ec7m96nnq/ceRFfzQJyQVKNrLHJOpvHPEHy9Nd7ErsaEysFFicIYiXNCBSG+hnhzwIDAQAB';

      const publicKeySimple = 'MIIBCgKCAQEA0nKhlw2zQSvi5Lo8JSYzMAXtAeew1ztSOoISJhDbFEvsR7a3/c7CcHSp1YvTgOZnheASgeVrzIxJIxUcvLDKRRg09Sh7dUtclm7pnieVCN5zoQ74aO30L7l0LZRX/Gfz9eO6h3jrGmRcQ/X1SfqN/gemQanokQOFh4xO3YVeU3lUnCglg3ALgysVYRTQm3AKgp5e4yhLm249Q0+vgkjDcJnzbLwGq9+gCvjLHineIhlpRmVb5lSV9wzLyCtdG8p1HkWWJMHtICK+JlUtEGNi0Ec7m96nnq/ceRFfzQJyQVKNrLHJOpvHPEHy9Nd7ErsaEysFFicIYiXNCBSG+hnhzwIDAQAB';


      let PKCS;
      beforeEach(function () {
        PKCS = this.module();
      });

      it('importPrivateKeyPKCS8', function () {
        expect(PKCS.exportPrivateKeyPKCS8(PKCS.importPrivateKeyPKCS8(privateKeyPKCS8)))
          .to.equal(privateKeyPKCS8);
      });

      it('exportPrivateKeyPKCS8', function () {
        expect(PKCS.exportPrivateKeyPKCS8(privateKeyJWK)).to.equal(privateKeyPKCS8);
      });

      it('exportPrivateKey', function () {
        expect(PKCS.exportPrivateKey(privateKeyJWK)).to.equal(privateKey);
      });

      it('exportPublicKey', function () {
        expect(PKCS.exportPublicKey(privateKeyJWK)).to.equal(publicKey);
      });

      it('exportPublicKeySPKI', function () {
        expect(PKCS.exportPublicKeySPKI(privateKeyJWK)).to.equal(publicKey);
      });

      it('importPublicKey', function () {
        expect(PKCS.exportPublicKey(PKCS.importPublicKey(publicKey))).to.equal(publicKey);
      });

      it('importPrivateKey', function () {
        expect(PKCS.exportPrivateKey(PKCS.importPrivateKey(privateKey))).to.equal(privateKey);
      });

      it('privateKeytoKeypair', function () {
        const one = PKCS.privateKeytoKeypair(privateKey);
        const two = [publicKey, privateKeyPKCS8];
        expect(JSON.stringify(one)).to.equal(JSON.stringify(two));
      });

      it('exportPublicKeySimple', function () {
        expect(PKCS.exportPublicKeySimple(privateKeyJWK)).to.equal(publicKeySimple);
      });
    });
  });
