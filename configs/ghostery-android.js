const base = require('./common/system');
const subprojects = require('./common/subprojects/bundles');
const publish = require('./common/publish');
const urls = require('./common/urls-ghostery')

const id = "android@cliqz.com";
const packageName = "cliqz";

module.exports = {
  "platform": "webextension",
  "specific": "cliqz-android",
  "brocfile": "Brocfile.webextension.js",
  "testsBasePath": "./build",
  "testem_launchers": ["unit-node", "Chrome"],
  "pack": "web-ext build -s build -a .",
  "sign": "python ./xpi-sign/xpisign.py -k $CLIQZ_CERT_PATH --signer openssl --passin file:$CLIQZ_CERT_PASS_PATH "+packageName+"-$PACKAGE_VERSION.zip "+packageName+"-$PACKAGE_VERSION-signed.zip && cp "+packageName+"-$PACKAGE_VERSION-signed.zip "+packageName+"-$PACKAGE_VERSION.zip",
  "publish": publish.toEdge(packageName, 'ghostery-android', 'zip'),
  "baseURL": "/modules/",
  "isMobile": true,
  "settings": Object.assign({}, urls, {
    "id": id,
    "description": "",
    "name": "Cliqz",
    "antitrackingButton": false,
    "ATTRACK_TELEMETRY_PROVIDER": "platform",
    "RESULTS_TIMEOUT": 3000,
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "RESULTS_PROVIDER_ORDER": ["calculator", "history", "cliqz", "querySuggestions", "instant"],
    "CLEAR_RESULTS_AT_SESSION_START": false,
    'ICONS': {
      'active': {
        'default': 'control-center/images/cc-active.svg',
        'dark': 'control-center/images/cc-active-dark.svg'
      },
      'inactive': {
        'default': 'control-center/images/cc-critical.svg',
        'dark': 'control-center/images/cc-critical-dark.svg'
      },
      'critical': {
        'default': 'control-center/images/cc-critical.svg',
        'dark': 'control-center/images/cc-critical-dark.svg'
      }
    },
    'BACKGROUNDS': {
      'active': '#471647',
      'inactive': '#471647',
      'critical': '#471647',
      'off': '#471647'
    },
  }),
  "modules": [
    "core",
    "core-cliqz",
    "static",
    "mobile-cards",
    "search",
    "anolysis",
    "geolocation",
    "control-center",
    "cliqz-android"
  ],
  "bundles": [
    "mobile-cards/debug.bundle.js",
    "mobile-cards/cliqz-android.bundle.js",
    "cliqz-android/app.bundle.js",
    "cliqz-android/cliqz-search-engines.bundle.js",
    "cliqz-android/cliqz-native-bridge.bundle.js",
    "cliqz-android/cliqz-app-constants.bundle.js",
  ],
  system: Object.assign({}, base.systemConfig, {
    map: Object.assign({}, base.systemConfig.map, {
      "pouchdb": "node_modules/pouchdb/dist/pouchdb.js",
      "@cliqz-oss/dexie": "node_modules/@cliqz-oss/dexie/dist/dexie.js",
      "mathjs": "node_modules/mathjs/dist/math.min.js",
      "react-native-view-shot": "modules/mobile-cards/external-libs/react-native-view-shot.js",
      "react-dom/unstable-native-dependencies": "node_modules/react-dom/unstable-native-dependencies.js",
      "ajv": "node_modules/ajv/dist/ajv.min.js",
    }),
    "packages": Object.assign({}, base.systemConfig.packages, {
      "is-obj": {
        "main": "./index.js"
      },
      "array-find-index": {
        "main": "./index.js"
      },
      "object-assign": {
        "main": "./index.js"
      },
      "react-native-web": {
        "map": {
          "./dist": "./dist/index.js",
          "./dist/apis/Animated": "./dist/apis/Animated/index.js",
          "./dist/apis/AppRegistry": "./dist/apis/AppRegistry/index.js",
          "./dist/apis/AppState": "./dist/apis/AppState/index.js",
          "./dist/apis/AsyncStorage": "./dist/apis/AsyncStorage/index.js",
          "./dist/apis/BackHandler": "./dist/apis/BackHandler/index.js",
          "./dist/apis/Clipboard": "./dist/apis/Clipboard/index.js",
          "./dist/apis/Dimensions": "./dist/apis/Dimensions/index.js",
          "./dist/apis/Easing": "./dist/apis/Easing/index.js",
          "./dist/apis/I18nManager": "./dist/apis/I18nManager/index.js",
          "./dist/apis/InteractionManager": "./dist/apis/InteractionManager/index.js",
          "./dist/apis/Keyboard": "./dist/apis/Keyboard/index.js",
          "./dist/apis/Linking": "./dist/apis/Linking/index.js",
          "./dist/apis/NetInfo": "./dist/apis/NetInfo/index.js",
          "./dist/apis/PanResponder": "./dist/apis/PanResponder/index.js",
          "./dist/apis/PixelRatio": "./dist/apis/PixelRatio/index.js",
          "./dist/apis/Platform": "./dist/apis/Platform/index.js",
          "./dist/apis/StyleSheet": "./dist/apis/StyleSheet/index.js",
          "./dist/apis/UIManager": "./dist/apis/UIManager/index.js",
          "./dist/apis/Vibration": "./dist/apis/Vibration/index.js",
          "./dist/components/ActivityIndicator": "./dist/components/ActivityIndicator/index.js",
          "./dist/components/Button": "./dist/components/Button/index.js",
          "./dist/components/Image": "./dist/components/Image/index.js",
          "./dist/components/FlatList": "./dist/components/FlatList/index.js",
          "./dist/components/ListView": "./dist/components/ListView/index.js",
          "./dist/components/KeyboardAvoidingView": "./dist/components/KeyboardAvoidingView/index.js",
          "./dist/components/Modal": "./dist/components/Modal/index.js",
          "./dist/components/Picker": "./dist/components/Picker/index.js",
          "./dist/components/ProgressBar": "./dist/components/ProgressBar/index.js",
          "./dist/components/RefreshControl": "./dist/components/RefreshControl/index.js",
          "./dist/components/SectionList": "./dist/components/SectionList/index.js",
          "./dist/components/ScrollView": "./dist/components/ScrollView/index.js",
          "./dist/components/Slider": "./dist/components/Slider/index.js",
          "./dist/components/StatusBar": "./dist/components/StatusBar/index.js",
          "./dist/components/StaticContainer": "./dist/components/StaticContainer/index.js",
          "./dist/components/StaticRenderer": "./dist/components/StaticRenderer/index.js",
          "./dist/components/Switch": "./dist/components/Switch/index.js",
          "./dist/components/Text": "./dist/components/Text/index.js",
          "./dist/components/TextInput": "./dist/components/TextInput/index.js",
          "./dist/components/UnimplementedView": "./dist/components/UnimplementedView/index.js",
          "./dist/components/View": "./dist/components/View/index.js",
          "./dist/components/VirtualizedList": "./dist/components/VirtualizedList/index.js",
          "./dist/modules/AccessibilityUtil": "./dist/modules/AccessibilityUtil/index.js",
          "./dist/modules/AssetRegistry": "./dist/modules/AssetRegistry/index.js",
          "./dist/modules/NativeMethodsMixin": "./dist/modules/NativeMethodsMixin/index.js",
          "./dist/modules/NativeModules": "./dist/modules/NativeModules/index.js",
          "./dist/modules/ReactNativePropRegistry": "./dist/modules/ReactNativePropRegistry/index.js",
          "./dist/modules/ScrollResponder": "./dist/modules/ScrollResponder/index.js",
          "./dist/modules/applyLayout": "./dist/modules/applyLayout/index.js",
          "./dist/modules/applyNativeMethods": "./dist/modules/applyNativeMethods/index.js",
          "./dist/modules/createDOMElement": "./dist/modules/createDOMElement/index.js",
          "./dist/modules/createDOMProps": "./dist/modules/createDOMProps/index.js",
          "./dist/modules/createElement": "./dist/modules/createElement/index.js",
          "./dist/modules/dismissKeyboard": "./dist/modules/dismissKeyboard/index.js",
          "./dist/modules/injectResponderEventPlugin": "./dist/modules/injectResponderEventPlugin/index.js",
          "./dist/modules/findNodeHandle": "./dist/modules/findNodeHandle/index.js",
          "./dist/modules/flattenStyle": "./dist/modules/flattenStyle/index.js",
          "./dist/modules/ImageLoader": "./dist/modules/ImageLoader/index.js",
          "./dist/modules/requestIdleCallback": "./dist/modules/requestIdleCallback/index.js",
          "./dist/modules/merge": "./dist/modules/merge/index.js",
          "./dist/modules/modality": "./dist/modules/modality/index.js",
          "./dist/modules/unitlessNumbers": "./dist/modules/unitlessNumbers/index.js",
          "./dist/modules/flattenArray": "./dist/modules/flattenArray/index.js",
          "./dist/modules/prefixStyles": "./dist/modules/prefixStyles/index.js",
          "./dist/modules/multiplyStyleLengthValue": "./dist/modules/multiplyStyleLengthValue/index.js",
          "./dist/modules/normalizeColor": "./dist/modules/normalizeColor/index.js",
          "./dist/modules/mapKeyValue": "./dist/modules/mapKeyValue/index.js",
          "./dist/modules/normalizeNativeEvent": "./dist/modules/normalizeNativeEvent/index.js",
          "./dist/modules/processColor": "./dist/modules/processColor/index.js",
          "./dist/vendor/setValueForStyles": "./dist/vendor/setValueForStyles/index.js",
          "./dist/vendor/warnValidStyle": "./dist/vendor/warnValidStyle/index.js",
          "./dist/vendor/PooledClass": "./dist/vendor/PooledClass/index.js",
          "./dist/vendor/dangerousStyleValue": "./dist/vendor/dangerousStyleValue/index.js",
          "./dist/vendor/hash": "./dist/vendor/hash/index.js",
          "./dist/vendor/TouchHistoryMath": "./dist/vendor/TouchHistoryMath/index.js"
        }
      }
    }),
  }),
  "subprojects": subprojects([
    'react',
    'reactDom',
    'rxjs',
    'mathjs',
  ]),
  builderDefault: base.builderConfig,
  "babelPlugins": [
    "react-native-web/babel"
  ]
}
