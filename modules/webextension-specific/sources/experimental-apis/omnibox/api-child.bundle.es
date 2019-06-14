/* globals ExtensionAPI */
global.omnibox2 = class extends ExtensionAPI {
  getAPI(context) {
    return {
      omnibox2: {
        getContext() {
          return context.contextId;
        }
      },
    };
  }
};
