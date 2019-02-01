/* global chai, describeModule */

export default describeModule('freshtab/main',
  function () {
    return {
      'core/config': {
        default: {
          settings: {
            NEW_TAB_URL: '',
            channel: '99',
          }
        },
      },
      'core/prefs': {
        default: {
        },
      },
      'core/platform': {
        isDesktopBrowser: false,
        getResourceUrl: () => {},
      },
      'platform/freshtab/new-tab-setting': {
        setNewTabPage: '[dynamic]',
        resetNewTabPage: '[dynamic]',
        setHomePage: '[dynamic]',
        getHomePage: '[dynamic]',
        migrate: '[dynamic]',
      },
    };
  },
  function () {
    let newTab;

    beforeEach(function () {
      newTab = this.module().default;
    });

    context('inside CLIQZ browser', function () {
      beforeEach(function () {
        this.deps('core/platform').isDesktopBrowser = true;
      });

      it('#isActive is always true', function () {
        chai.expect(newTab.isActive).to.equal(true);
      });
    });

    context('inside non CLIQZ browser', function () {

    });
  });
