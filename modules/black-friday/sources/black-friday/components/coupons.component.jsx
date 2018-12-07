/* eslint-disable */
import React from 'react';
import Coupon from './coupon.component';

const couponsData = [
	{title: 'Coupon 1'},
	{title: 'Coupon 2'},
	{title: 'Coupon 3'},
]

class Coupons extends React.Component {
  constructor() {
    super();
    // this.http = new Http();
    // this.time = new Time();
    this.state = {
      couponsData: couponsData
    };
  }

  componentWillMount() {}

  render() {
    return (
      <ul className="coupons-list">

      	{couponsData.map((coupon, i) => ( <Coupon couponsData={coupon} key={i} /> ))}

      </ul>
    )
  }
}

export default Coupons;