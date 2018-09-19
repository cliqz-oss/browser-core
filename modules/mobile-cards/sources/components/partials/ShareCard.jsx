import React from 'react';
import { StyleSheet, View, Text, Image, TouchableWithoutFeedback, Platform, NativeModules } from 'react-native';

import ViewShot from 'react-native-view-shot';

import { elementTopMargin, cardBorderBottomRadius, cardMargins, getCardWidth, elementSidePaddings } from '../../styles/CardStyle';
import { getMessage } from '../../../core/i18n';
import { appName } from '../../../platform/platform';
import NativeDrawabale, { normalizeUrl } from '../custom/NativeDrawable';

const PermissionManager = NativeModules.PermissionManagerModule;
const ShareCardModule = NativeModules.RNShare || NativeModules.ShareCardModule;

const OPTIONS = {
  format: 'png',
  quality: 0.8,
  result: 'data-uri',
};

const styles = width => StyleSheet.create({
  shareSection: {
    borderTopWidth: 1,
    borderTopColor: '#EDECEC',
    ...elementTopMargin,
    paddingTop: 10,
    paddingBottom: 5,
    marginBottom: 5,
    ...elementSidePaddings,
    width,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareText: {
    color: 'black',
    textAlign: 'center',
    fontSize: 10,
    marginRight: 5,
  },
  shareImage: {
    marginRight: 5,
    width: 15,
    height: 15,
  },
  shareOverlay: {
    position: 'absolute',
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'white',
    bottom: cardMargins.marginBottom,
    ...cardBorderBottomRadius,
  }
});

export default class ShareCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      capturing: false,
    };
  }

  componentDidUpdate() {
    if (this.state.capturing) {
      setTimeout(view => view && view.capture()
        .then((res) => {
          this.setState({ capturing: false });
          if (res) {
            (ShareCardModule.open || ShareCardModule.share)(
              {
                url: res,
                title: this.props.title,
                subject: this.props.title,
              },
              () => {}, // temporary until an action for failure is defined
              () => {} // temporary until an action for success is defined
            );
          }
        }),
      0, this._view); // timeout to 0 to wait for the view to update
    }
  }

  async shareCard() {
    if (Platform.OS === 'ios') {
      this.setState({ capturing: true });
      return;
    }

    // android needs to write on external storage
    const type = PermissionManager.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
    const granted = PermissionManager.RESULTS.GRANTED;

    const isStorageAccessGranted = (
      await PermissionManager.check(type) === granted ||
      await PermissionManager.request(type) === granted
    );
    if (isStorageAccessGranted) {
      this.setState({ capturing: true });
    }
  }

  displaySharedViaCliqz() {
    return Platform.select({
      ios: (
        <View style={styles(getCardWidth()).shareSection}>
          <Image
            style={styles().shareImage}
            source={{ uri: 'AppIcon' }}
          />
          <Text style={styles().shareText}>
            { getMessage('mobile_card_shared_via', [appName, 'iOS']) }
          </Text>
        </View>
      ),
      android: (
        <View style={styles(getCardWidth()).shareSection}>
          <Image
            style={styles().shareImage}
            source={{ uri: 'mipmap/ic_launcher' }}
          />
          <Text style={styles().shareText}>
            { getMessage('mobile_card_shared_via', [appName, 'Android']) }
          </Text>
        </View>
      )
    });
  }

  displayShareLink() {
    const src = normalizeUrl('share.png', { isNative: true });
    return (
      <TouchableWithoutFeedback onPress={() => this.shareCard()}>
        <View
          style={styles(getCardWidth()).shareSection}
          accessibilityLabel="share-card-button"
          accessible={false}
        >
          <NativeDrawabale
            style={styles().shareImage}
            source={src}
            color={'black'}
          />
          <Text style={styles().shareText}>{getMessage('mobile_share_card')}</Text>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  render() {
    if (Platform.OS === 'web') {
      return (
        <View style={[this.props.style || {}]}>
          { this.props.children }
          <View style={{ padding: 5 }} />
        </View>
      );
    }
    return (
      <View>
        <ViewShot ref={(view) => { this._view = view; }} options={OPTIONS}>
          <View style={this.props.style || {}}>
            { this.props.children }
            {
              this.state.capturing
                ?
                this.displaySharedViaCliqz()
                :
                this.displayShareLink()
            }
          </View>
        </ViewShot>
        <View style={styles().shareOverlay} >
          { this.displayShareLink() }
        </View>
      </View>
    );
  }
}
