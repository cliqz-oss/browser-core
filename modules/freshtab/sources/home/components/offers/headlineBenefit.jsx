import React from 'react';
import { sendOffersMessage } from '../../services/offers';

function Benefit(props) {
  return (
    <span className="benefit">
      <a
        href={props.url}
        onClick={() => {
          sendOffersMessage(props.offer_id, 'offer_ca_action');
          sendOffersMessage(props.offer_id, 'offer_benefit');
        }}
      >
        {props.benefit}
      </a>
    </span>
  );
}

function Headline(props) {
  return (
    <span className="headline-container">
      <div
        className="headline"
        style={{ color: props.color }}
      >
        <a
          className="headline-url"
          style={{ color: props.color }}
          href={props.url}
          onClick={() => {
            sendOffersMessage(props.offer_id, 'offer_ca_action');
            sendOffersMessage(props.offer_id, 'offer_headline');
          }}
        >
          {props.headline}
        </a>
      </div>
    </span>
  );
}

function HeadlineBenefit(props) {
  return (
    <div className="headline-benefit-ctner">
      <Benefit
        benefit={props.benefit}
        url={props.url}
        offer_id={props.offer_id}
      />
      <Headline
        headline={props.headline}
        color={props.color}
        url={props.url}
        offer_id={props.offer_id}
      />
    </div>
  );
}

export default HeadlineBenefit;
