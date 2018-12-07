import { NativeModules } from 'react-native';

const subscriptionModule = NativeModules.SubscriptionModule;

export function toggleSubscription(type, subtype, id, isSubscribed) {
  const message = {
    type: 'cards',
    action: 'click',
  };
  let promise;
  if (isSubscribed) {
    promise = subscriptionModule.unsubscribeToNotifications(type, subtype, id);
    message.target = 'unsubscribe';
  } else {
    promise = subscriptionModule.subscribeToNotifications(type, subtype, id);
    message.target = 'subscribe';
  }
  // TODO: implement telemetry
  return promise;
}

export function checkSubscriptions(batch) {
  if (!subscriptionModule) {
    return Promise.reject(new Error('Native subscription is not available'));
  }
  return subscriptionModule.isSubscribedBatch(batch);
}

export function isSubscribedToLeague(id) {
  if (!subscriptionModule) {
    return Promise.reject(new Error('Native subscription is not available'));
  }
  return subscriptionModule.isSubscribed('soccer', 'league', id);
}

export function isSubscribedToTeam(id) {
  if (!subscriptionModule) {
    return Promise.reject(new Error('Native subscription is not available'));
  }
  return subscriptionModule.isSubscribed('soccer', 'team', id);
}
