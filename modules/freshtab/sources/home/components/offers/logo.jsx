import React from 'react';
import { sendOffersMessage } from '../../services/offers';

function Logo(props) {
  return (
    <a
      className="logo-url"
      href={props.url}
      onClick={() => {
        sendOffersMessage(props.offer_id, 'offer_ca_action');
        sendOffersMessage(props.offer_id, 'offer_logo');
      }}
    >
      <div
        className={`logo ${props.data.logo_class}`}
        style={{
          color: 'red',
          textIndent: '-1000em',
          backgroundImage: `url(${props.data.logo_url})`,
        }}
      />
    </a>
  );
}

export default Logo;
