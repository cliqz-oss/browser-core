
/* Helper function used to serialize a bucket (one single entry of a
 * ReverseIndex) into a string. Each entry is made of a `token` (used to index
 * the bucket) and a list of filters.
 *
 * The resulting serialization is formatted as follows:
 * - The first two chars are the hash of the token (as returned by packInt32)
 * - Each group of two chars following is a valid filter id (same format ^)
 *
 * eg: c1 c2 c3 c4 c5 c6 c7 c8
 *     |---^ |---^ |---^ ^---^ is the id of the third filter ("c7c8")
 *     |     |     ^ is the id of the second filter          ("c5c6")
 *     |     ^ is the id of the first filter                 ("c3c4")
 *     ^ is the hash of the token                            ("c1c2")
 */
function serializeBucket(token, filters) {
  let bucketLine = token; // Line accumulator
  //               ^ first 2 chars are the hashed key

  for (let j = 0; j < filters.length; j += 1) {
    bucketLine += filters[j].id;
  }

  return bucketLine;
}


/**
 * Helper function used to load a bucket from the serialized version returned by
 * `serializeBucket`. Given as an argument is a line returned by
 * `serializeBucket` as well as `filters` (a mapping from filters ids to the
 * filters themselves) and `start` which is the index of the first filter id on
 * the line (usually 0, except if the line does not has a token hash at the
 * begining, as is the case with the special "wild-card bucket", a.k.a. the
 * bucket with an empty token as a key).
 */
function deserializeBucket(line, filters, start) {
  const bucket = [];

  // Get filters
  for (let j = start; j < line.length; j += 2) {
    const filterId = line.substr(j, 2);
    bucket.push(filters[filterId]);
  }

  return {
    filters: bucket,
    hit: 0,
    optimized: false,
  };
}


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
  constructor(filters, getTokens, { optimizer, multiKeys }) {
    // Mapping from tokens to filters
    this.index = Object.create(null);

    this.optimizer = optimizer;
    this.getTokens = getTokens;
    this.multiKeys = multiKeys || false;

    this.addFilters(filters || []);
  }

  /**
   * Transforms the `index` attribute of the `ReverseIndex` instance into a
   * serialized version (JSON-serializable Object). Other attributes are not
   * serialized (optimizer, getTokens, multiKeys) and will have to be restored
   * using the context (cf: `load` method of the `FiltersEngine`).
   */
  jsonify() {
    /* eslint-disable no-continue */
    const index = this.index;
    const lines = [];

    // The first entry of `lines` is the wildcard bucket (empty token)
    const wildCardBucket = index[''];
    if (wildCardBucket) {
      lines.push(serializeBucket('', wildCardBucket.filters));
    } else {
      lines.push('');
    }

    // Serialize all other buckets (the ones having a non-empty token).
    const tokens = Object.keys(index);
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token === '') { continue; }
      lines.push(serializeBucket(token, index[token].filters));
    }

    return lines;
  }

  /**
   * Given the result of the `jsonify` method of the `ReverseIndex`, restores
   * its content *in-place* into the `index` attribute. The other attributes
   * (optimizer, getTokens, multiKeys) are unchanged.
   */
  load(lines, filters) {
    // Each line is one entry in the index (ie: one token and a list of filters)
    const index = Object.create(null);

    // Deserialize the wildcard bucket
    const wildCardLine = lines[0];
    if (wildCardLine !== '') {
      index[''] = deserializeBucket(wildCardLine, filters, 0);
    }

    // Deserialize other buckets
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      index[line.substr(0, 2)] = deserializeBucket(line, filters, 2);
    }

    this.index = index;
  }

  addFilters(filters) {
    /* eslint-disable no-continue */
    const length = filters.length;
    const idToTokens = Object.create(null);
    const histogram = Object.create(null);

    // Update histogram with new tokens
    for (let i = 0; i < filters.length; i += 1) {
      const filter = filters[i];

      // Deal with filters generating several sets of tokens
      // (eg: cosmetic filters and their hostnames)
      const multiTokens = this.multiKeys ? this.getTokens(filter) : [this.getTokens(filter)];

      idToTokens[filter.id] = multiTokens;
      for (let j = 0; j < multiTokens.length; j += 1) {
        const tokens = multiTokens[j];
        for (let k = 0; k < tokens.length; k += 1) {
          const token = tokens[k];
          histogram[token] = (histogram[token] || 0) + 1;
        }
      }
    }

    // For each filter, take the best token (least seen)
    for (let i = 0; i < filters.length; i += 1) {
      let wildCardInserted = false;
      const filter = filters[i];
      const multiTokens = idToTokens[filter.id];

      for (let j = 0; j < multiTokens.length; j += 1) {
        const tokens = multiTokens[j];

        // Empty token is used as a wild-card
        let bestToken = '';
        let count = length;
        for (let k = 0; k < tokens.length; k += 1) {
          const token = tokens[k];
          const tokenCount = histogram[token];
          if (tokenCount < count) {
            bestToken = token;
            count = tokenCount;
          }
        }

        // Only allow each filter to be present one time in the wildcard
        if (bestToken === '') {
          if (wildCardInserted) {
            continue;
          } else {
            wildCardInserted = true;
          }
        }

        // Add filter to the corresponding bucket
        const bucket = this.index[bestToken];
        if (bucket === undefined) {
          this.index[bestToken] = {
            hit: 0,
            filters: [filter],
            optimized: false,
          };
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
      const tokens = Object.keys(this.index);
      for (let i = 0; i < tokens.length; i += 1) {
        this.optimize(this.index[tokens[i]], true /* force optimization */);
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
    const bucket = this.index[token];
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

    // Fallback to '' bucket if nothing was found before.
    this.iterBucket('', cb);
  }

  /**
   * Returns a report (string) of bucket sizes to be printed on the console.
   * This is mainly designed for debugging purposes.
   */
  report() {
    const sizes = Object.create(null);
    // Report size of buckets
    let strResult = '';
    Object.keys(this.index).forEach((token) => {
      const bucket = this.index[token];
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
