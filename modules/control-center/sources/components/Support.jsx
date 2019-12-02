/* eslint-disable jsx-a11y/interactive-supports-focus */
import React from 'react';

export default function Support({ feedbackURL, localize, openUrl, privacyPolicyURL }) {
  return (
    <span id="support">
      <img className="support-icon" src="./images/support.svg" alt="Cliqz - support" />
      <span
        onClick={() => openUrl(feedbackURL, false, 'info_help')}
        target={feedbackURL}
        role="button"
        className="support"
      >
        {localize('control_center_support')}
      </span>
      &nbsp;&#8226;&nbsp;
      <span
        onClick={() => openUrl(privacyPolicyURL, false, 'info_help')}
        target={privacyPolicyURL}
        role="button"
        className="privacy"

      >
        {localize('control_center_privacy_policy')}
      </span>
    </span>

  );
}
