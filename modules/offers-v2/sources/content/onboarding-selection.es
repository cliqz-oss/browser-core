import { callWhenDOMContentLoaded } from './utils';

const DELETE_ONBOARDING_OFFERS_ACTION_ID = 'deleteOnboardingOffers';
const trim = str => str?.trim();
const split = str => str?.split(',').map(trim).filter(Boolean);

/**
 * @see {@link OnboardingSelectionHandler#mount}
 */
class OnboardingSelectionHandler {
  constructor(window, CLIQZ) {
    this._window = window;
    this._CLIQZ = CLIQZ;
  }

  /**
   * @type {boolean}
   */
  _isMounted = false;

  /**
   * when the `offers-to-remove` attribute on the `<body>` element is defined
   * and includes a list of offer ids, emit a corresponding `deleteOnboardingOffers` action
   * for each of these, then unregister this `click` handler.
   * otherwise do nothing.
   */
  _removeOffersOnClick = () => {
    const { offersToRemove } = this._window.document.body.dataset;
    if (!offersToRemove) {
      return;
    }
    this._CLIQZ.app.modules['offers-v2'].action(
      DELETE_ONBOARDING_OFFERS_ACTION_ID,
      split(offersToRemove)
    );
    if (this._isMounted) {
      this._unmount();
    }
  }

  _unmount = () => {
    if (!this._isMounted) {
      return;
    }
    this._window.removeEventListener('unload', this._unmount);
    this._window.document.body.removeEventListener('click', this._removeOffersOnClick);
    this._isMounted = false;
  }

  /**
   * when not yet mounted, register a `click` handler that actions deletion
   * of onboarding offers that were not selected when the user selection is defined.
   * the handler will be unregistered on window `unload` or when delete actions
   * were emitted, whichever happens first.
   * @see {@link #_removeOffersOnClick}
   */
  mount = () => {
    if (this._isMounted) {
      return;
    }
    this._window.document.body.addEventListener('click', this._removeOffersOnClick);
    this._window.addEventListener('unload', this._unmount);
    this._isMounted = true;
  }
}

/**
 * @return a `mount-onboarding` action handler that mounts an onboarding-selection handler.
 * calling the `mount_onboarding` action when the onboarding-selection handler is already mounted
 * does nothing.
 * @see {@link OnboardingSelectionHandler#mount}
 */
export default function removeUnselectedOnboardingOffers(window, _, CLIQZ) {
  const { mount } = new OnboardingSelectionHandler(window, CLIQZ);

  return {
    'mount-onboarding': () => (window.document.readyState !== 'loading'
      ? mount()
      : callWhenDOMContentLoaded(mount))
  };
}
