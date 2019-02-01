const ghosteryBase = require('./ghostery-tab');
const publish = require('./common/publish');

module.exports = Object.assign({}, ghosteryBase, {
  publish: 'web-ext sign -a . -s build/ --api-key=$UPLOAD_API_KEY --api-secret=$UPLOAD_API_SECRET --id="{0ea88bc4-03bd-4baa-8153-acc861589c1c}" --timeout=360000 &&' + publish.toEdgeForGhostery('ghostery_start_tab_with_private_ghost_search_nightly', 'ghostery-tab-firefox', 'xpi'),

})
