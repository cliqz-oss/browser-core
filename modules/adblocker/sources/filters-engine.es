"use strict";


import { log } from "adblocker/utils";


/* Manage all the filters and match them in an efficient way.
 * To avoid inspecting to many filters for each request, we create
 * the following accelerating structure:
 *
 * [ Importants ]    [ Exceptions ]    [ Remaining filters ]
 *
 * Each of theses is a `FilterBucket`, which manage a subset of filters.
 *
 * Importants filters are not subject to exceptions, hence we try it first.
 * If no important filter matched, try to use the remaining filters bucket.
 * If we have a match, try to find an exception.
 */
export default class {
  constructor() {
    // @@filter
    this.exceptions       = new FilterBucket([]);
    // $important
    this.importants       = new FilterBucket([]);
    // All other filters
    this.filters          = new FilterBucket([]);
  }

  onUpdateFilters(newFilters) {
    log(`FILTER ENGINE UPDATE ${newFilters.length}`);
    let filters         = [];
    let exceptions      = [];
    let importants      = [];

    // Dispatch filters into buckets
    newFilters.forEach(filter => {
      if (filter.isException) {
        exceptions.push(filter);
      }
      else if (filter.isImportant) {
        importants.push(filter);
      }
      else {
        filters.push(filter);
      }
    });

    this.filters    = new FilterBucket(filters, "filters");
    this.exceptions = new FilterBucket(exceptions, "exceptions");
    this.importants = new FilterBucket(importants, "importants");
    log(`Filter engine updated with ${filters.length} filters, ${exceptions.length} exceptions and ${importants.length} importants\n`);
  }

  match(httpContext) {
    log(`MATCH`);
    if (this.importants.match(httpContext)) {
      log("IMPORTANT");
      return true;
    }
    else if (this.filters.match(httpContext)) {
      log("FILTER");
      if (this.exceptions.match(httpContext)) {
        log("EXCEPTION");
        return false;
      }
      else {
        return true;
      }
    }

    return false;
  }
}


/* A Bucket manages a subsets of all the filters. To avoid matching too many
 * useless filters, there is a second level of dispatch here.
 *
 * [ hostname anchors (||filter) ]    [ remaining filters ]
 *
 * The first structure map { domain -> filters that apply only on domain }
 * as the `hostname anchors` only apply on a specific domain name.
 *
 * Each group of filters is stored in a Filter index that is the last level
 * of dispatch of our matching engine.
 */
class FilterBucket {

  constructor(filters, name) {
    // TODO: Dispatch also on:
    // - fromImage
    // - fromMedia
    // - fromObject
    // - fromObjectSubrequest
    // - fromOther
    // - fromPing
    // - fromScript
    // - fromStylesheet
    // - fromXmlHttpRequest
    // To avoid matching filter if request type doesn't match
    // If we do it, we could simplify the match function of Filter

    this.name = name;

    // ||hostname filter
    this.hostnameAnchors  = new Map();
    // All other filters
    this.filters          = new FilterReverseIndex([], this.name);

    // Dispatch filters
    filters.forEach(filter => {
      if (filter.isHostnameAnchor && filter.hostname !== null) {
        if (this.hostnameAnchors.has(filter.hostname)) {
          this.hostnameAnchors.get(filter.hostname).addFilter(filter);
        }
        else {
          this.hostnameAnchors.set(filter.hostname, new FilterReverseIndex([filter], filter.hostname + "_" + this.name));
        }
      }
      else {
        this.filters.addFilter(filter);
      }
    });

    log(`${name} CREATE BUCKET: ${this.filters.length} filters + ${this.hostnameAnchors.size} hostnames`);
  }

  matchWithDomain(httpContext, domain) {
    let filters = this.hostnameAnchors.get(domain);
    if (filters !== undefined) {
      log(`${this.name} bucket try to match hostnameAnchors (${domain})`);
      return filters.match(httpContext);
    }

    return false;
  }

  match(httpContext) {
    // Try to find a match with specific domain
    if (this.matchWithDomain(httpContext, httpContext.hostname)) {
      return true;
    }

    // Try to find a match with general domain
    if (this.matchWithDomain(httpContext, httpContext.hostGD)) {
      return true;
    }

    // Try to find a match with remaining filters
    log(`${this.name} bucket try to match misc`);
    return this.filters.match(httpContext);
  }
}



/* A filter reverse index is the lowest level of optimization we apply on filter
 * matching. To avoid inspecting filters that have no chance of matching, we
 * dispatch them in an index { ngram -> list of filter }.
 *
 * When we need to know if there is a match for an URL, we extract ngrams from it
 * and find all the buckets for which filters contains at list one of the ngram of
 * the URL. We then stop at the first match.
 */
class FilterReverseIndex {
  constructor(filters, name) {
    // Name of this index (for debugging purpose)
    this.name = name;

    // {token -> list of ids} Each id refers to an element of `this.filters`
    this.index   = new Map();

    // Remaining filters not stored in the index
    this.miscFilters = [];

    this.length = 0;

    // Update index
    filters.forEach(this.addFilter.bind(this));
  }

  addFilter(filter) {
    // Increase length
    this.length += 1;

    // Used to know if we could generate at least one token from this filter.
    // If it's not the case we will store in in the miscFilters Array.
    let filterIsLongEnough = false;

    // Update index with tokens found in filter pattern
    const pattern = filter.isRegex ? filter.rawRegex : filter.filterStr;
    pattern.split(/[*^]/g).forEach(part => {
      tokenizeURL(part).forEach(token => {
        // Filter is in index which means we found at least 1 valid token
        filterIsLongEnough = true;

        // Add it to the index
        const bucket = this.index.get(token);
        if (bucket === undefined) {
          this.index.set(token, [filter]);
        }
        else {
          bucket.push(filter);
        }
      });
    });

    // If no token has been extracted from the pattern
    // Add it to a list of remaining .
    if (!filterIsLongEnough) {
      this.miscFilters.push(filter);
    }
  }

  matchList(httpContext, list, checkedFilters) {
    for (let i = 0; i < list.length; i++) {
      let filter = list[i];
      if (!checkedFilters.has(filter._id)) {
        checkedFilters.add(filter._id);
        if (filter.match(httpContext)) {
          log(`INDEX ${this.name} MATCH ${filter.rawLine} (${filter.rawLine}) ~= ${httpContext.url}`);
          return filter;
        }
      }
    }
    return null;
  }

  match(httpContext) {
    // Keep track of filters checked
    let checkedFilters = new Set();

    const tokens = httpContext.tokens;
    for (let i = 0; i < tokens.length; ++i) {
      let token = tokens[i];
      let bucket = this.index.get(token);
      if (bucket !== undefined) {
        log(`INDEX ${this.name} BUCKET ${token} => ${bucket.length}`);
        if (this.matchList(httpContext, bucket, checkedFilters) !== null) {
          return true;
        }
      }
    }

    log(`INDEX ${this.name} ${this.miscFilters.length} remaining filters checked`);
    log(`INDEX ${this.name} total filters examined ${checkedFilters.size + this.miscFilters.length}`);
    // If no match found, check regexes
    return this.matchList(httpContext, this.miscFilters, checkedFilters) !== null;
  }
}


export function tokenizeURL(pattern) {
  // Generate tokens (ngrams)
  const NGRAM_SIZE = 6;
  let tokens = [];
  for (let i = 0; i <= (pattern.length - NGRAM_SIZE); ++i) {
    tokens.push(pattern.substring(i, i + NGRAM_SIZE));
  }
  return tokens;
}
