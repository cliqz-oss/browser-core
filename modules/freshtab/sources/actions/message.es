import prefs from '../../core/prefs';
import events from '../../core/events';
import console from '../../core/console';
import utils from '../../core/utils';

const ONE_DAY = 24 * 60 * 60 * 1000;
export const saveMessageDismission = (message) => {
  prefs.setObject('dismissedAlerts', (prevValue) => {
    const oldMessage = prevValue[message.id] || {
      scope: 'freshtab',
      count: 0,
    };
    return {
      ...prevValue,
      [message.id]: {
        ...oldMessage,
        isDismissed: true,
        count: oldMessage.count + 1,
      }
    };
  });
};

const hide = (messageId, handler) => {
  events.pub('msg_center:hide_message', { id: messageId }, handler);
};

export function dismissOffer(messageId, handler) {
  hide(messageId, handler);
}

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

export function setMessageShownTime(message) {
  const messageShownTimePref = `modules.message-center.stats.${message.handler}.${message.id}.shown_time`;
  const messageShownTime = prefs.get(messageShownTimePref, '');

  if (!messageShownTime) {
    prefs.set(messageShownTimePref, Date.now().toString());
  } else if (parseInt(messageShownTime, 10) + (14 * ONE_DAY) < Date.now()) {
    // More than 14 days ago => Dismiss message
    saveMessageDismission(message);
    prefs.clear(messageShownTimePref);
  }
}
