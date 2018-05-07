import config from '../../core/config';

export default {
  getState() {
    return {
      baseURL: config.baseURL,
      ...config.settings,
    };
  },
};
