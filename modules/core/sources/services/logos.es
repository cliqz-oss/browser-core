import loadLogoDb from '../../platform/services/logos';
import config from '../config';
import inject from '../kord/inject';

export async function service() {
  let BRANDS_DATABASE_VERSION = 1521469421408;
  let BRANDS_DATABASE;

  BRANDS_DATABASE = await loadLogoDb(BRANDS_DATABASE_VERSION, {
    updateVersion: (version) => { BRANDS_DATABASE_VERSION = version; },
    updateDatabase: (db) => { BRANDS_DATABASE = db; },
  });

  return {
    getLogoDetails: (urlDetails) => {
      const base = urlDetails.name;
      const baseCore = base.replace(/[-]/g, '');
      const check = (host, rule) => {
        const address = host.lastIndexOf(base);
        const parseddomain = `${host.substr(0, address)}$${host.substr(address + base.length)}`;
        return parseddomain.indexOf(rule) !== -1;
      };
      let result = {};
      const domains = BRANDS_DATABASE.domains;
      const blackTxtColor = '2d2d2d';

      if (base.length === 0) {
        return result;
      }

      if (base === 'IP') {
        result = { text: 'IP', backgroundColor: '9077e3' };
      } else if (domains[base]) {
        for (let i = 0, imax = domains[base].length; i < imax; i += 1) {
          // r = rule, b = background-color, l = logo, t = text, c = color
          const rule = domains[base][i];

          if (check(urlDetails.host, rule.r)) {
            result = {
              backgroundColor: rule.b ? rule.b : null,
              backgroundImage: rule.l
                ? `url(${config.settings.BACKGROUND_IMAGE_URL}${BRANDS_DATABASE_VERSION}/logos/${base}/${rule.r}.svg)`
                : '',
              text: rule.t,
              color: rule.c ? '' : '#fff',
              brandTxtColor: rule.b ? rule.b : blackTxtColor,
            };
            break;
          }
        }
      }
      result.text = result.text || `${baseCore[0] || ''}${baseCore[1] || ''}`.toLowerCase();
      result.backgroundColor = result.backgroundColor
        || BRANDS_DATABASE.palette[base.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % BRANDS_DATABASE.palette.length];
      result.brandTxtColor = result.brandTxtColor || blackTxtColor;

      const colorID = BRANDS_DATABASE.palette.indexOf(result.backgroundColor);
      const buttonClass = BRANDS_DATABASE.buttons
        && colorID !== -1
        && BRANDS_DATABASE.buttons[colorID]
        ? BRANDS_DATABASE.buttons[colorID]
        : 10;

      result.buttonsClass = `cliqz-brands-button-${buttonClass}`;
      result.style = `background-color: #${result.backgroundColor};color:${(result.color || '#fff')};`;


      if (result.backgroundImage) {
        result.style += `background-image:${result.backgroundImage}; text-indent: -10em;`;
      }

      return result;
    },
  };
}

export default function () {
  return inject.service('logos');
}
