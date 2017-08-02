import React from 'react';
import { StyleSheet, Text, View, TouchableWithoutFeedback } from 'react-native';

export default class extends React.Component {

  constructor(props) {
    super(props);
    this.state = {collapsed: true};
  }

  render() {
    const isCollapsed = this.state.collapsed;
    return (
      <View>
        <TouchableWithoutFeedback
          onPress={() => this.setState({collapsed: !this.state.collapsed})}
        >
          <View>
            <Text style={styles.header}>{this.props.header}</Text>
          </View>
        </TouchableWithoutFeedback>
        { isCollapsed ||
          <Text style={styles.content}>{this.props.content}</Text>
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  header: {
    padding: 3,
    color: 'black',
    fontSize: 15,
    fontWeight: 'bold',
  },
  content: {
    color: 'black',
  }
});
