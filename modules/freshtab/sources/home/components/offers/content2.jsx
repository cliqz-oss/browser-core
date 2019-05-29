import React from 'react';
import Title from './title';
import HeadlineBenefit from './headlineBenefit';

function Content(props) {
  const benefitOrHeadline = (props.data.benefit || props.data.headline);
  let heading;
  if (benefitOrHeadline) {
    heading = <HeadlineBenefit headline={props.data.headline} benefit={props.data.benefit} />;
  } else {
    heading = <Title title={props.data.title} />;
  }
  return (
    <div className="content flex-container">
      {heading}
      <div className="desc-container">
        <span className="expires">Expires in 12 days</span>
        <p className="offer-description flex-desc">
          {props.data.desc}
        </p>
      </div>
    </div>

  );
}

export default Content;
