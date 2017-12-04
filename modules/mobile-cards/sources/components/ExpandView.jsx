import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import NativeDrawable, { normalizeUrl } from './custom/NativeDrawable';
import Link from './Link';
import { elementTopMargin, elementSideMargins } from '../styles/CardStyle';

export default class extends React.Component {

  constructor(props) {
    super(props);
    this.state = {collapsed: true};
  }

  displayInstruction(text, index) {
    const indexedText = `${index + 1}. ${text}`;
    return (
      <Text key={index} style={styles().item}>{indexedText}</Text>
    );
  }

  render() {
    const isCollapsed = this.state.collapsed;
    const ratingImageName = normalizeUrl('arrow-down.svg');
    return (
      <View style={styles().container}>
        <View style={styles().content}>
          <Link
            onPress={() => this.setState({collapsed: !this.state.collapsed})}
          >
            <View style={styles().header}>
              <View style={{ flex: 10, flexDirection: 'row', justifyContent: 'flex-start' }}>
                {<Text style={styles().headerText}>{this.props.header}</Text>}
              </View>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }}>
                {<NativeDrawable source={ratingImageName} style={styles(this.state.collapsed).arrow} />}
              </View>

            </View>
          </Link>
          { isCollapsed ||
            this.props.content.map(this.displayInstruction)
          }
        </View>
      </View>
    );
  }
}

const styles = (collapsed = true) => StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#EDECEC',
    borderBottomColor: '#EDECEC',
    ...elementTopMargin,
  },
  headerText: {
    paddingTop: 3,
    paddingBottom: 3,
    color: 'black',
  },
  content: {
    paddingTop: 8,
    paddingBottom: 8,
    ...elementSideMargins,
  },
  arrow: {
    height: 16,
    width: 16,
    transform: [{ rotateX: collapsed ? '0deg' : '180deg' }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    color: 'black',
    marginTop: 12,
  },
});
