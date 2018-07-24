import React from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';
import EditSpeedDial from './edit-speed-dial';

class SpeedDial extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dial: this.props.dial,
    };
  }
  updateDial = (dial) => {
    this.setState({ dial });
  }

  render() {
    return (
      <a
        className="dial"
        title={this.state.dial.url}
        href={this.state.dial.url}
        onClick={() => {
          this.props.visitSpeedDial();
        }}
      >
        <Logo logo={this.state.dial.logo} />
        {this.state.dial.custom ?
          <EditSpeedDial
            dial={this.state.dial}
            isCustom={this.state.dial.isCustom}
            removeDial={this.props.removeSpeedDial}
            updateDial={this.updateDial}
          /> :
          <button
            className="delete"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              this.props.removeSpeedDial();
            }
            }
          >X</button>
        }
        <div className="title">{ this.state.dial.displayTitle}</div>
      </a>
    );
  }
}

SpeedDial.propTypes = {
  dial: PropTypes.shape({
    logo: {},
    url: PropTypes.string,
    displayTitle: PropTypes.string,
    isCustom: PropTypes.bool,
    updateMethod: PropTypes.func,
  }),
};

export default SpeedDial;
