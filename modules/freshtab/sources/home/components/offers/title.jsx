import React from 'react';
import { sendOffersMessage } from '../../services/offers';

function Title(props) {
  return (
    <div className="title-container">
      <div
        className="title"
        style={{ color: props.color }}
      >
        <a
          href={props.url}
          onClick={() => {
            sendOffersMessage(props.offer_id, 'offer_ca_action');
            sendOffersMessage(props.offer_id, 'offer_title');
          }}
        >
          {props.title}
        </a>
      </div>
    </div>
  );
}

export default Title;
