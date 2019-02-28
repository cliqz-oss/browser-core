import React from 'react';
import { StyleSheet, View } from 'react-native';

import NativeDrawable, { normalizeUrl } from './custom/NativeDrawable';
import Link from './Link';
import { elementSideMargins } from '../styles/CardStyle';
import themeDetails from '../themes';

const styles = (collapsed = true, index, theme) => StyleSheet.create({
  container: {
    borderTopWidth: index === 0 ? 1.5 : 0,
    borderBottomWidth: 1.5,
    borderTopColor: themeDetails[theme].separatorColor,
    borderBottomColor: themeDetails[theme].separatorColor,
    flex: 1,
  },
  arrow: {
    height: 8,
    width: 12,
    transform: [{ rotateX: collapsed ? '0deg' : '180deg' }],
  },
  headerExpand: {
    alignItems: 'flex-end',
    flex: 1,
  },
  headerDetails: {
    flex: 10,
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    ...elementSideMargins,
  },
  content: {
    ...elementSideMargins,
  },
});

export default class ExpandView extends React.Component {
  constructor(props) {
    super(props);
    this.state = { collapsed: true };
  }

  render() {
    const isCollapsed = this.state.collapsed;
    const theme = this.props.theme;
    const index = this.props.index;
    const arrowImage = normalizeUrl('arrow-down.svg');

    const style = styles(isCollapsed, index, theme);
    return (
      <View
        accessible={false}
        accessibilityLabel="expand-view-container"
        style={style.container}
      >
        <Link
          onPress={() => this.setState({ collapsed: !isCollapsed })}
        >
          <View style={style.header}>
            <View
              accessible={false}
              accessibilityLabel="expand-view-header"
              style={style.headerDetails}
            >
              { this.props.header }
            </View>
            <View
              accessible={false}
              accessibilityLabel="expand-view-arrow"
              style={style.headerExpand}
            >
              <NativeDrawable
                source={arrowImage}
                style={style.arrow}
              />
            </View>
          </View>
        </Link>
        { isCollapsed
          || (
            <Link>
              <View
                accessible={false}
                accessibilityLabel="expand-view-content"
                style={style.content}
              >
                { this.props.content }
              </View>
            </Link>
          )
        }
      </View>
    );
  }
}
