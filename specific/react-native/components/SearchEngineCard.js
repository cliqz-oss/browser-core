import React from 'react';
import { View, StyleSheet } from 'react-native';
import Link from './Link';
import Icon from './partials/Icon';
import { vpWidth, vpHeight } from '../styles/CardStyle';
import utils from '../modules/core/utils';



export default class extends React.Component {
  render() {
    const searchEngine = utils.getDefaultSearchEngine();
    const urlDetails = utils.getDetailsFromUrl(searchEngine.url);
    const logoDetails = utils.getLogoDetails(urlDetails);
    const query = this.props.query;
    return (
      <Link to={searchEngine.url + query}>
        <View style={styles(logoDetails.backgroundColor).container}>
          <Icon logoDetails={logoDetails} width={vpWidth/4} height={vpWidth/4} />
        </View>
      </Link>
    )
  }
}

const styles = function (backgroundColor) {
  return StyleSheet.create({
    container: {
      width: vpWidth,
      height: vpHeight,
      paddingTop: vpHeight/4,
      alignItems: 'center',
      backgroundColor: `#${backgroundColor}`,
    }
  });
}