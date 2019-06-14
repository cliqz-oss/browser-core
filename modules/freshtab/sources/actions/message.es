import prefs from '../../core/prefs';
import events from '../../core/events';
import console from '../../core/console';
import telemetry from '../../core/services/telemetry';

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

export const saveMessagePausing = (message) => {
  prefs.setObject('dismissedAlerts', (prevValue) => {
    const oldMessage = prevValue[message.id] || {
      scope: 'freshtab',
      active: true,
      count: 0,
    };
    return {
      ...prevValue,
      [message.id]: {
        ...oldMessage,
        pausedOn: prefs.get('config_ts', null),
        active: true,
        count: 0,
      }
    };
  });
};

const hide = (messageId, handler) => {
  events.pub('msg_center:hide_message', { id: messageId }, handler);
};

const pause = (messageId, handler) => {
  events.pub('msg_center:pause_message', { id: messageId }, handler);
};

export function pauseMessage(messageId, handler) {
  try {
    saveMessagePausing({
      id: messageId,
      handler,
    });
    pause(messageId, handler);

    telemetry.push({
      type: 'notification',
      topic: messageId,
      context: 'home',
      action: 'click',
      target: 'later'
    });
  } catch (e) {
    console.log(e, `Freshtab error setting ${messageId} pause pref`);
  }
}

export function dismissMessage(messageId, handler) {
  try {
    saveMessageDismission({
      id: messageId,
      handler,
    });
    hide(messageId, handler);

    telemetry.push({
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
