const cliqzBase = require('./cliqz-tab');

module.exports = Object.assign({}, cliqzBase, {
  publish: 'web-ext sign -s build/ --api-key=$UPLOAD_API_KEY --api-secret=$UPLOAD_API_SECRET --id="{0ea88bc4-03bd-4baa-8153-acc861589c1c}" --timeout=0 && true',
})