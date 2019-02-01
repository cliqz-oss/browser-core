import React from 'react';
import { StyleSheet, View, Image, TouchableWithoutFeedback, Platform, NativeModules } from 'react-native';
import ViewShot from 'react-native-view-shot';
import NativeDrawabale, { normalizeUrl } from '../custom/NativeDrawable';

const PermissionManager = NativeModules.PermissionManagerModule;
const ShareCardModule = NativeModules.ShareCardModule;

const OPTIONS = {
  format: 'png',
  quality: 0.8,
  result: 'data-uri',
};

const styles = StyleSheet.create({
  shareSection: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  shareImage: {
    width: 11,
    height: 11,
  },
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
      await PermissionManager.check(type) === granted
      || await PermissionManager.request(type) === granted
    );
    if (isStorageAccessGranted) {
      this.setState({ capturing: true });
    }
  }

  displaySharedViaCliqz() {
    return (
      <View style={styles.shareSection}>
        <Image
          style={styles.shareImage}
          source={{ uri: 'AppIcon' }}
        />
      </View>
    );
  }

  displayShareLink() {
    const src = normalizeUrl('ic_share.png', { isNative: true });
    return (
      <TouchableWithoutFeedback onPress={() => this.shareCard()}>
        <View
          style={styles.shareSection}
          accessibilityLabel="share-card-button"
          accessible={false}
        >
          <NativeDrawabale
            style={styles.shareImage}
            source={src}
            color="#FFFFFF"
          />
        </View>
      </TouchableWithoutFeedback>
    );
  }

  render() {
    if (Platform.OS === 'web' || Platform.OS === 'android') {
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
                ? this.displaySharedViaCliqz()
                : this.displayShareLink()
            }
          </View>
        </ViewShot>
      </View>
    );
  }
}
