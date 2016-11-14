export default class {
  // TODO: rename to *Storage
  constructor(behavior, demographics) {
    this.behavior = behavior;
    this.demographics = demographics;
  }

  // TODO: rename `interval` to `split`, `period`, `duration`, ...
  // for daily retention: createMessages(retention, { from: now - 30 DAYS, now },
  //    interval = 86400000 (DAY))
  // for daily behavior:  createMessages(behavior, { from: now - 1 DAY, now })
  createMessages(behaviorAggregator, demographicsAggregator, { from = null, to = null } = { }, interval = null) {
    const timespans = [];

    if (interval === null) {
      timespans.push({ from, to });
    } else {
      if (from === null || to === null) {
        throw new Error('need explicit `from` and `to` if interval is given');
      }
      if (interval <= 0) {
        throw new Error('`interval` needs to be > 0');
      }

      while (from < to) {
        timespans.push({ from, to: Math.min(from + interval, to) });
        from += interval + 1;
      }
    }

    return Promise.all([
      // use the same demographics for all messages
      this.createDemographicsMessages(timespans[timespans.length - 1], demographicsAggregator),
      ...timespans.map(timespan => this.createBehaviorMessage(timespan, behaviorAggregator)),
    ])
      // create all combinations of demographics and behavior messages
      .then(([demographicsMessages, ...behaviorMessages]) =>
        this.joinMessages(demographicsMessages, behaviorMessages));
  }

  /**
  * Generates all combination of messages from lists A and B, for example,
  * to combine a set of demographic factors with behavioral statistics from
  * different timespans.
  * @param {Object[]} listA - First list of messages.
  * @param {Object[]} listB - Second list of messages.
  */
  joinMessages(listA, listB) {
    const joined = [];
    listA.forEach((msgA) => {
      listB.forEach((msgB) => {
        joined.push(Object.assign({ }, msgA, msgB));
      });
    });
    return joined;
  }

  createBehaviorMessage(timespan, behaviorAggregator) {
    return this.behavior.getTypesByTimespan(timespan)
      .then(records => behaviorAggregator.aggregate(records))
      .then((aggregation) => {
        aggregation.timespan = timespan;
        return {
          behavior: aggregation,
        };
      });
  }

  createDemographicsMessages(timespan, demographicsAggregator) {
    return this.demographics.getTypesByTimespan(timespan)
      .then(records => {
        const demographics = demographicsAggregator.aggregate(records);
        demographics._any = true;
        return Object.keys(demographics)
          .map((key) => {
            return {
              demographics: { [key]: demographics[key] },
            };
          });
      });
  }
}
