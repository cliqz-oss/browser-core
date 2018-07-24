import React from 'react';

class Update extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    this.props.update();
  }
  render() {
    return (
      <div
        onClick={() => this.handleClick()}
        role="presentation"
      >
        <button>UPDATe</button>
      </div>
    );
  }
}

export default Update;

