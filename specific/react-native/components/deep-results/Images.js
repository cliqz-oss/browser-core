import React from 'react';
import { StyleSheet, ListView } from 'react-native';
import ImageQueue from '../../components/ImageQueue';


export default class extends React.Component {
  
  constructor(props) {
    super(props);
    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    // set limit for number of images
    this.state = {
      ds: ds.cloneWithRows(this.props.data || [])
    }
  }

  render() {
    return <ListView
      dataSource={this.state.ds}
      renderRow={this.renderRow}
      style={{marginTop: 5}}
      horizontal={true}
      enableEmptySections={true}
      pageSize={4}
    >
    </ListView>
  }

  renderRow(data) {
    console.log(data.image);
    return <ImageQueue 
      source={{uri: data.image}}
      style={{height: 100, width: 90, margin: 1}}
      onLoad={console.log}
      onError={this.onError}
    />;
  }

  onLoad(image) {
    console.log(this);
  }

  onError(image) {
    console.log(this);
  }
}