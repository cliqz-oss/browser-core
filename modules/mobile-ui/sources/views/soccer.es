/**
* @namespace ui.views
*/
export default class {
  isSubscribed({ id }, list) {
    return list.indexOf(id) !== -1;
  }

  toggleSubscription(type, subtype, id, isSubscribed, index, buttonCount) {
    const message = {
      type: 'cards',
      action: 'click',
    }
    if (isSubscribed) {
      osAPI.unsubscribeToNotifications(type, subtype, id);
      message.target = 'unsubscribe';
    } else {
      osAPI.subscribeToNotifications(type, subtype, id);
      message.target = 'subscribe';
    }
    if (subtype === 'game') {
      message.index = index;
      message.button_count = buttonCount;
    }
    osAPI.pushTelemetry(message);
  }
}
