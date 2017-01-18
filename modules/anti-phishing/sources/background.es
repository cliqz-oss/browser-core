import CliqzAntiPhishing from 'anti-phishing/anti-phishing';
import CliqzHumanWeb from 'human-web/human-web';


function updateBlackWhiteStatus(req, md5Prefix) {
  const response = req.response;
  const blacklist = JSON.parse(response).blacklist;
  const whitelist = JSON.parse(response).whitelist;
  if (!(md5Prefix in CliqzAntiPhishing.blackWhiteList)) {
    CliqzAntiPhishing.blackWhiteList[md5Prefix] = {};
  }
  for (let i = 0; i < blacklist.length; i++) {
    CliqzAntiPhishing.blackWhiteList[md5Prefix][blacklist[i][0]] = `black:${blacklist[i][1]}`;
  }
  for (let i = 0; i < whitelist.length; i++) {
    CliqzAntiPhishing.blackWhiteList[md5Prefix][whitelist[i]] = 'white';
  }
}

function checkStatus(url, md5Prefix, md5Surfix) {
  const bw = CliqzAntiPhishing.blackWhiteList[md5Prefix];
  const status = md5Surfix in bw && bw[md5Surfix].includes('black');
  if (status && CliqzHumanWeb && CliqzHumanWeb.state.v[url]) {
    CliqzHumanWeb.state.v[url]['anti-phishing'] = 'block';
  }
  return status;
}

export default {
  init(/* settitng */) {
  },

  unload() {
  },

  actions: {
    isPhishingURL(url) {
      if(!CliqzAntiPhishing.isAntiPhishingActive()) return;

      const [md5Prefix, md5Surfix] = CliqzAntiPhishing.getSplitMd5(url);

      // check if whitelisted
      if (md5Prefix in CliqzAntiPhishing.forceWhiteList) {
        if (CliqzAntiPhishing.forceWhiteList[md5Prefix] === 2) {
          CliqzUtils.setTimeout(() => {
            delete CliqzAntiPhishing.forceWhiteList[md5Prefix];
          }, 1000);
        }
        return {
          block: false,
          type: 'phishingURL',
        };
      }

      // check cache
      if (md5Prefix in CliqzAntiPhishing.blackWhiteList) {
        return {
          block: checkStatus(url, md5Prefix, md5Surfix),
          type: 'phishingURL',
        };
      } else {
        return new Promise((resolve, reject) => {
          CliqzUtils.httpGet(
            CliqzAntiPhishing.BW_URL + md5Prefix,
            (req) => {
              updateBlackWhiteStatus(req, md5Prefix);
              console.log('fetched', url, 'anti-phishing', checkStatus(url, md5Prefix, md5Surfix));
              resolve({
                block: checkStatus(url, md5Prefix, md5Surfix),
                type: 'phishingURL',
              });
            },
            (e) => {
              reject(e);
            }
          );
        });
      }
    },
  },
};
