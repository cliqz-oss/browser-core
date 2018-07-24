import React from 'react';
import { Image } from 'react-native';


export default class ExternalImage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { Image: null };
    this.loadImage(props);
  }

  componentWillReceiveProps(props) {
    this.loadImage(props);
  }

  loadImage(props) {
    Image.prefetch(props.source.uri)
      .then(() => {
        this.setState({
          Image: <Image {...props} />
        });
      })
      .catch(() => this.setState({ Image: null }));
  }

  render() {
    return this.state.Image;
  }
}
