/**
 * Accelerating data structure based on a reverse token index. The creation of
 * the index follows the following algorithm:
 *   1. Tokenize each filter
 *   2. Compute a histogram of frequency of each token (globally)
 *   3. Select the best token for each filter (lowest frequency)
 *
 * By default, each filter is only indexed once, using its token having the
 * lowest global frequency. This is to minimize the size of buckets.
 *
 * The ReverseIndex can be extended in two ways to provide more advanced
 * features:
 *   1. It is possible to provide an `optimizer` function, which takes as input
 *   a list of filters (typically the content of a bucket) and returns another
 *   list of filters (new content of the bucket), more compact/efficient. This
 *   allows to dynamically optimize the filters and make matching time and memory
 *   consumption lower. This optimization can be done ahead of time on all
 *   buckets, or dynamically when a bucket is 'hot' (hit several times).
 *
 *   Currently this is only available for network filters.
 *
 *   2. Insert a filter multiple times (with multiple keys). It is sometimes
 *   needed to insert the same filter at different keys. For this purpose it is
 *   possible to provide the `multiKeys` options + a `getTokens` tokenizer
 *   returning a list of list of tokens (instead of just a list of token).
 *
 *   For each set of tokens returned by the `getTokens` function, the filter
 *   will be inserted once. This is currently used only for hostname dispatch of
 *   cosmetic filters.
 */
export default class ReverseIndex {
  constructor(filters, getTokens, { optimizer, multiKeys } = {}) {
    // Mapping from tokens to filters
    this.index = new Map();
    this.size = 0;

    this.optimizer = optimizer;
    this.getTokens = getTokens;
    this.multiKeys = multiKeys || false;

    this.addFilters(filters || []);
  }

  addFilters(filters) {
    /* eslint-disable no-continue */
    const length = filters.length;
    this.size = length;

    const idToTokens = new Map();
    const histogram = new Map();

    // Update histogram with new tokens
    for (let i = 0; i < filters.length; i += 1) {
      const filter = filters[i];

      // Deal with filters generating several sets of tokens
      // (eg: cosmetic filters and their hostnames)
      const multiTokens = this.multiKeys ? this.getTokens(filter) : [this.getTokens(filter)];

      idToTokens.set(filter.id, multiTokens);
      for (let j = 0; j < multiTokens.length; j += 1) {
        const tokens = multiTokens[j];
        for (let k = 0; k < tokens.length; k += 1) {
          const token = tokens[k];
          histogram.set(token, (histogram.get(token) || 0) + 1);
        }
      }
    }

    // For each filter, take the best token (least seen)
    for (let i = 0; i < filters.length; i += 1) {
      let wildCardInserted = false;
      const filter = filters[i];
      const multiTokens = idToTokens.get(filter.id);

      for (let j = 0; j < multiTokens.length; j += 1) {
        const tokens = multiTokens[j];

        // Empty token is used as a wild-card
        let bestToken = 0;
        let count = length;
        for (let k = 0; k < tokens.length; k += 1) {
          const token = tokens[k];
          const tokenCount = histogram.get(token);
          if (tokenCount < count) {
            bestToken = token;
            count = tokenCount;
          }
        }

        // Only allow each filter to be present one time in the wildcard
        if (bestToken === 0) {
          if (wildCardInserted) {
            continue;
          } else {
            wildCardInserted = true;
          }
        }

        // Add filter to the corresponding bucket
        const bucket = this.index.get(bestToken);
        if (bucket === undefined) {
          this.index.set(bestToken, {
            hit: 0,
            filters: [filter],
            optimized: false,
          });
        } else {
          bucket.filters.push(filter);
        }
      }
    }
  }

  /**
   * Force optimization of all buckets.
   */
  optimizeAheadOfTime() {
    if (this.optimizer) {
      const tokens = [...this.index.keys()];
      for (let i = 0; i < tokens.length; i += 1) {
        this.optimize(this.index.get(tokens[i]), true /* force optimization */);
      }
    }
  }

  optimize(bucket, force = false) {
    /* eslint-disable no-param-reassign */
    // TODO - number of hits should depend on size of the bucket as payoff from
    // big buckets will be higher than on small buckets.
    if (this.optimizer && !bucket.optimized && (force || bucket.hit >= 5)) {
      if (bucket.filters.length > 1) {
        bucket.filters = this.optimizer(bucket.filters);
      }

      bucket.optimized = true;
    }
  }

  /**
   * If a bucket exist for the given `token`, call the callback on each filter
   * found inside. An early termination mechanism is built-in, to stop iterating
   * as soon as `false` is returned from the callback.
   */
  iterBucket(token, cb) {
    const bucket = this.index.get(token);
    if (bucket !== undefined) {
      bucket.hit += 1;
      this.optimize(bucket);

      const filters = bucket.filters;
      for (let k = 0; k < filters.length; k += 1) {
        // Break the loop if the callback returns `false`
        if (cb(filters[k]) === false) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Iterate on all filters found in buckets associated with the given list of
   * tokens. The callback is called on each of them. Early termination can be
   * achieved if the callback returns `false`.
   */
  iterMatchingFilters(tokens, cb) {
    // Doing so will make sure that time to find a match is minimized over time
    for (let j = 0; j < tokens.length; j += 1) {
      if (this.iterBucket(tokens[j], cb) === false) {
        return;
      }
    }

    // Fallback to 0 bucket if nothing was found before.
    this.iterBucket(0, cb);
  }

  /**
   * Returns a report (string) of bucket sizes to be printed on the console.
   * This is mainly designed for debugging purposes.
   */
  report() {
    const sizes = Object.create(null);
    // Report size of buckets
    let strResult = '';
    [...this.index.keys()].forEach((token) => {
      const bucket = this.index.get(token);
      sizes[bucket.length] = (sizes[bucket.length] || 0) + 1;
      if (bucket.length > 5) {
        strResult = strResult.concat(`adblocker size bucket "${token}" => ${bucket.length}\n`);
        bucket.forEach((f) => {
          strResult = strResult.concat(`    ${f.pprint()} ${f.mask}\n`);
        });
      }
    });

    Object.keys(sizes).forEach((size) => {
      const count = sizes[size];
      strResult = strResult.concat(`adblocker sizes ${size} => ${count} buckets\n`);
    });
    return strResult;
  }
}
