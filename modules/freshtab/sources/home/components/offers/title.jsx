import React from 'react';
import { sendOffersMessage } from '../../services/offers';

function Title(props) {
  return (
    <div className="title-container">
      <span
        className="offer-text"
      >
        <a
          href={props.url}
          rel="noreferrer noopener"
          target="_blank"
          style={{ color: props.color }}
          onClick={() => {
            sendOffersMessage(props.offer_id, 'offer_ca_action');
            sendOffersMessage(props.offer_id, 'offer_title');
          }}
        >
          {props.title}
        </a>
      </span>
    </div>
  );
}

export default Title;
