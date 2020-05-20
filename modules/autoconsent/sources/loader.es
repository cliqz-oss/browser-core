import config from '../core/config';
import { fetch } from '../core/http';
import { Resource } from '../core/resource-loader';
import { isBetaVersion } from '../platform/platform';

const CONFIG_URL = `${config.settings.CDN_BASEURL}/autoconsent/${isBetaVersion() ? 'staging-' : ''}config.json`;

export default class AutoconsentLoader {
  constructor(autoconsent, logger) {
    this.autoconsent = autoconsent;
    this.logger = logger;
    this.ruleResource = new Resource(['autoconsent', 'rules.json'], {
      dataType: 'json',
    });
    this.version = null;
    this.disabledCmps = [];
    this.initialRulesLength = this.autoconsent.rules.length;
  }

  async init() {
    // load from local if available
    await this.ruleResource.load().then(rules => this.processUpdate(rules), () => null);
    await this.checkUpdate();
  }

  async checkUpdate() {
    try {
      const autoconsentConfig = await (await fetch(CONFIG_URL)).json();
      this.disabledCmps = autoconsentConfig.disabled || [];
      if (autoconsentConfig.ruleVersion !== this.version) {
        const rules = await this.ruleResource.updateFromURL(`${config.settings.CDN_BASEURL}/autoconsent/rules/${autoconsentConfig.ruleVersion}.json.br`);
        this.processUpdate(rules);
      }
    } catch (e) {
      this.logger.warn('Error updating autoconsent config', e);
    }
  }

  processUpdate(rules) {
    const {
      version,
      autoconsent,
      consentomatic
    } = rules;
    // clear rules from previous version
    this.autoconsent.rules = this.autoconsent.rules.slice(0, this.initialRulesLength);
    autoconsent.forEach((rule) => {
      this.autoconsent.addCMP(rule);
    });
    Object.keys(consentomatic).forEach((name) => {
      this.autoconsent.addConsentomaticCMP(name, consentomatic[name]);
    });
    this.version = version;
    this.logger.info(`Loaded autoconsent rules version ${version}`);
  }
}
