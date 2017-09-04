import prefs from '../../core/prefs';
import events from '../../core/events';
import console from '../../core/console';
import utils from '../../core/utils';

const saveMessageDismission = (message) => {
  prefs.setObject('dismissedAlerts', (prevValue) => {
    const oldMessage = prevValue[message.id] || {
      scope: 'freshtab',
      count: 0,
    };
    return {
      ...prevValue,
      [message.id]: {
        ...oldMessage,
        count: oldMessage.count + 1,
      }
    };
  });
};

export function dismissMessage(messageId, handler) {
  try {
    saveMessageDismission({
      id: messageId,
      handler,
    });

    events.pub('msg_center:hide_message', { id: messageId }, handler);

    utils.telemetry({
      type: 'notification',
      topic: messageId,
      context: 'home',
      action: 'click',
      target: 'hide'
    });
  } catch (e) {
    console.log(e, `Freshtab error setting ${messageId} dismiss pref`);
  }
}

export function countMessageClick(message) {
  const countPref = `modules.message-center.stats.${message.handler}.${message.id}.cta_count`;
  const count = prefs.get(countPref, 0);

  prefs.set(countPref, count + 1);

  if (count >= 3) {
    events.pub('msg_center:hide_message', { id: message.id }, message.handler);
    saveMessageDismission(message);
  }
}
