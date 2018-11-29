import React from 'react';
import { sendOffersMessage } from '../../services/offers';

function Logo(props) {
  return (
    <a
      className="logo-url"
      href={props.url}
      rel="noreferrer noopener"
      target="_blank"
      onClick={() => {
        sendOffersMessage(props.offer_id, 'offer_ca_action');
        sendOffersMessage(props.offer_id, 'offer_logo');
      }}
    >
      <div
        className={`logo ${props.data.logo_class}`}
      >
        <img src={props.data.logo_url} alt="logo" />
      </div>
    </a>
  );
}

export default Logo;
