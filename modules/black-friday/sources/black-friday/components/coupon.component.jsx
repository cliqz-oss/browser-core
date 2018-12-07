/* eslint-disable */
import React from 'react';

class CouponItem extends React.Component {
  constructor() {
    super();
    // this.http = new Http();
    // this.time = new Time();
    // this.state = {
    //   couponsData: couponsData
    // };
  }

  componentWillMount() {}



  render() {
    return (
      <li>
        ++
        {this.props.couponsData.title}
        <span className="code">##COdE@</span>
        <a href="#" className="cta">Get the Offer</a>
      </li>
    )
  }
}

export default CouponItem;