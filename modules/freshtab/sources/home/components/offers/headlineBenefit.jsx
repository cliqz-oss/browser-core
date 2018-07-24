import React from 'react';
import { sendOffersMessage } from '../../services/offers';

function Benefit(props) {
  return (
    <div className="benefit">
      <a
        href={props.url}
        onClick={() => {
          sendOffersMessage(props.offer_id, 'offer_ca_action');
          sendOffersMessage(props.offer_id, 'offer_benefit');
        }}
      >
        {props.benefit}
      </a>
    </div>
  );
}

function Headline(props) {
  return (
    <div className="headline-container">
      <div
        className="headline"
        style={{ color: props.color }}
      >
        <a
          className="headline-url"
          href={props.url}
          onClick={() => {
            sendOffersMessage(props.offer_id, 'offer_ca_action');
            sendOffersMessage(props.offer_id, 'offer_headline');
          }}
        >
          {props.headline}
        </a>
      </div>
    </div>
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
