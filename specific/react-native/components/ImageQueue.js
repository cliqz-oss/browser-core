import React from 'react';
import { Image } from 'react-native';
import events from '../modules/core/events';

let queue = [];
let isActive = false;
function pull() {
  const imageItem = queue.shift();
  if (!imageItem || !isActive) {
    isActive = false;
    return;
  }
  Image.prefetch(imageItem.uri)
    .then(() => {
      if (isActive) {
        imageItem.onFetch();
        pull();
      }
    })
    .catch(console.log);
}

export default class extends React.Component {

  constructor(props) {
    super(props);
    this.state = { image: null };
    this.addToQueue(props);
  }

  addToQueue({ source: { uri }}) {
    if (!uri || uri.substr(-4) === '.svg') {
      return;
    }
    queue.push({
      uri,
      onFetch: () => this.setState({ image: <Image {...this.props} /> }),
    });
    if (!isActive) {
      isActive = true;
      pull();
    }
  }

  componentWillReceiveProps(nextProps) {
    isActive = false;
    queue = [];
    this.addToQueue(nextProps);
  }

  render() {
    return this.state.image;
  }
}