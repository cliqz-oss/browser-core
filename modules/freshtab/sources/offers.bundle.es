/* global document */
import React from 'react';
import ReactDOM from 'react-dom';
import Offer from './home/components/middle-messages-offer';

class OffersTests extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      offer: false
    };
    const onMessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.target === 'cliqz-tab-offer') {
        this.setState({
          offer: data.offer
        });
      }
    };
    window.addEventListener('message', onMessage);
  }


  render() {
    /* eslint-disable react/jsx-filename-extension */
    return (
      <div>
        {this.state.offer &&
          <Offer offer={this.state.offer} />
        }
      </div>
    );
  }
}

ReactDOM.render(
  React.createElement(OffersTests, {}, null),
  document.getElementById('root')
);

