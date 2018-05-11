import React from 'react';
import { StyleSheet, ListView } from 'react-native';
import ImageQueue from '../../components/ImageQueue';
import { elementTopMargin } from '../../styles/CardStyle';

export default class extends React.Component {

  constructor(props) {
    super(props);
    this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    // set limit for number of images
    this.state = {
      ds: this.ds.cloneWithRows(this.props.data || [])
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      ds: this.state.ds.cloneWithRows(nextProps.data || [])
    });
  }

  shouldComponentUpdate() {
    return Boolean(this.state.ds);
  }

  render() {
    return <ListView
      dataSource={this.state.ds}
      renderRow={this.renderRow}
      style={{ ...elementTopMargin }}
      horizontal={true}
      enableEmptySections={true}
      pageSize={4}
    >
    </ListView>
  }

  renderRow(data) {
    return <ImageQueue
      source={{uri: data.image}}
      style={{height: 100, width: 90}}
    />;
  }
}
