/**
 * This modules contains all functions and utils to serialize the adblocker
 * efficiently. The central part if `DynamicDataView`, a dynamically growing
 * ArrayBuffer exposing an API allowing to set values of type: String, uint8,
 * uint16 and uint32 efficiently.
 */

import { NetworkFilter, CosmeticFilter } from './filters-parsing';
import FiltersEngine from './filters-engine';
import DynamicDataView from './dynamic-data-view';


/**
 * To allow for a more compact representation of network filters, the
 * representation is composed of a mandatory header, and some optional
 *
 * Header:
 * =======
 *
 *  | opt | mask | id
 *    8     32     32
 *
 * For an empty filter having no pattern, hostname, the minimum size is: 72 bits.
 *
 * Then for each optional part (filter, hostname optDomains, optNotDomains,
 * redirect), it takes 16 bits for the length of the string + the length of the
 * string in byte.
 *
 * The optional parts are written in order of there number of occurrence in the
 * filter list using by the adblocker. The most common being `hostname`, then
 * `filter`, `optDomains`, `optNotDomains`, `redirect`.
 *
 * Example:
 * ========
 *
 * @@||cliqz.com would result in a serialized version:
 *
 * | 1 | mask | id | 9 | c | l | i | q | z | . | c | o | m  (19 bytes)
 *
 * In this case, the serialized version is actually bigger than the original
 * filter, but faster to deserialize. In the future, we could optimize the
 * representation to compact small filters better.
 *
 * Ideas:
 *  * variable length encoding for the mask (if not option, take max 1 byte).
 *  * first byte could contain the mask as well if small enough.
 *  * when packing ascii string, store several of them in each byte.
 */
function serializeNetworkFilter(filter, buffer) {
  // Check number of optional parts (e.g.: filter, hostname, etc.)
  let numberOfOptionalParts = 0;

  if (filter.isRedirect()) {
    numberOfOptionalParts = 5;
  } else if (filter.hasOptNotDomains()) {
    numberOfOptionalParts = 4;
  } else if (filter.hasOptDomains()) {
    numberOfOptionalParts = 3;
  } else if (filter.hasFilter()) {
    numberOfOptionalParts = 2;
  } else if (filter.hasHostname()) {
    numberOfOptionalParts = 1;
  }

  buffer.pushUint8(numberOfOptionalParts);
  buffer.pushUint32(filter.mask);
  buffer.pushUint32(filter.id);

  if (numberOfOptionalParts === 0) { return; }

  buffer.pushStr(filter.hostname);
  if (numberOfOptionalParts === 1) { return; }

  buffer.pushStr(filter.filter);
  if (numberOfOptionalParts === 2) { return; }

  buffer.pushStr(filter.optDomains);
  if (numberOfOptionalParts === 3) { return; }

  buffer.pushStr(filter.optNotDomains);
  if (numberOfOptionalParts === 4) { return; }

  buffer.pushStr(filter.redirect);
}


/**
 * Deserialize network filters. The code accessing the buffer should be
 * symetrical to the one in `serializeNetworkFilter`.
 */
function deserializeNetworkFilter(buffer) {
  const numberOfOptionalParts = buffer.getUint8();

  return new NetworkFilter({
    mask: buffer.getUint32(),
    id: buffer.getUint32(),
    hostname: numberOfOptionalParts > 0 ? buffer.getStr() : '',
    filter: numberOfOptionalParts > 1 ? buffer.getStr() : '',
    optDomains: numberOfOptionalParts > 2 ? buffer.getStr() : '',
    optNotDomains: numberOfOptionalParts > 3 ? buffer.getStr() : '',
    redirect: numberOfOptionalParts > 4 ? buffer.getStr() : '',
  });
}


/**
 * The format of a cosmetic filter is:
 *
 * | mask | id | selector length | selector... | hostnames length | hostnames...
 *   32     32   16                              16
 *
 * The header (mask + id) is 64 bits, then we have a total of 32 bits to store
 * the length of `selector` and `hostnames` (16 bits each).
 *
 * Improvements similar to the onces mentioned in `serializeNetworkFilters`
 * could be applied here, to get a more compact representation.
 */
function serializeCosmeticFilter(filter, buffer) {
  buffer.pushUint8(filter.mask);
  buffer.pushUint32(filter.id);
  buffer.pushStr(filter.selector);
  buffer.pushStr(filter.hostnames);
}


/**
 * Deserialize cosmetic filters. The code accessing the buffer should be
 * symetrical to the one in `serializeCosmeticFilter`.
 */
function deserializeCosmeticFilter(buffer) {
  return new CosmeticFilter({
    mask: buffer.getUint8(),
    id: buffer.getUint32(),
    selector: buffer.getStr(),
    hostnames: buffer.getStr(),
  });
}


function serializeFilters(filters, buffer, serialize) {
  buffer.pushUint32(filters.length);
  for (let i = 0; i < filters.length; i += 1) {
    serialize(filters[i], buffer);
  }
}


function deserializeFilters(buffer, deserialize, allFilters) {
  const length = buffer.getUint32();
  const filters = [];
  for (let i = 0; i < length; i += 1) {
    const filter = deserialize(buffer);
    filters.push(filter);
    allFilters.set(filter.id, filter);
  }

  return filters;
}


function serializeLists(buffer, lists) {
  const assets = [...lists.keys()];

  // Serialize number of assets
  buffer.pushUint8(assets.length);

  for (let i = 0; i < assets.length; i += 1) {
    const asset = assets[i];
    const list = lists.get(asset);

    buffer.pushStr(asset);
    buffer.pushStr(list.checksum);
    serializeFilters(list.filters, buffer, serializeNetworkFilter);
    serializeFilters(list.exceptions, buffer, serializeNetworkFilter);
    serializeFilters(list.importants, buffer, serializeNetworkFilter);
    serializeFilters(list.redirects, buffer, serializeNetworkFilter);
    serializeFilters(list.cosmetics, buffer, serializeCosmeticFilter);
  }
}


function deserializeLists(buffer) {
  const lists = new Map();
  const networkFilters = new Map();
  const cosmeticFilters = new Map();

  // Get number of assets
  const size = buffer.getUint8();
  for (let i = 0; i < size; i += 1) {
    lists.set(buffer.getStr(), {
      checksum: buffer.getStr(),
      filters: deserializeFilters(buffer, deserializeNetworkFilter, networkFilters),
      exceptions: deserializeFilters(buffer, deserializeNetworkFilter, networkFilters),
      importants: deserializeFilters(buffer, deserializeNetworkFilter, networkFilters),
      redirects: deserializeFilters(buffer, deserializeNetworkFilter, networkFilters),
      cosmetics: deserializeFilters(buffer, deserializeCosmeticFilter, cosmeticFilters),
    });
  }

  return {
    networkFilters,
    cosmeticFilters,
    lists,
  };
}


function serializeBucket(token, filters, buffer) {
  buffer.pushUint16(filters.length);
  buffer.pushUint32(token);

  for (let i = 0; i < filters.length; i += 1) {
    buffer.pushUint32(filters[i].id);
  }
}


function deserializeBucket(buffer, filters) {
  const bucket = [];

  const length = buffer.getUint16();
  const token = buffer.getUint32();

  for (let i = 0; i < length; i += 1) {
    bucket.push(filters.get(buffer.getUint32()));
  }

  return {
    token,
    bucket: {
      hit: 0,
      filters: bucket,
      optimized: false,
    },
  };
}


function serializeReverseIndex(reverseIndex, buffer) {
  const index = reverseIndex.index;
  const tokens = [...index.keys()];

  buffer.pushUint32(reverseIndex.size);
  buffer.pushUint32(tokens.length);

  // Serialize all other buckets (the ones having a non-empty token).
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    serializeBucket(token, index.get(token).filters, buffer);
  }
}


function deserializeReverseIndex(buffer, index, filters) {
  const deserializedIndex = new Map();

  const size = buffer.getUint32();
  const numberOfTokens = buffer.getUint32();

  for (let i = 0; i < numberOfTokens; i += 1) {
    const { token, bucket } = deserializeBucket(buffer, filters);
    deserializedIndex.set(token, bucket);
  }

  /* eslint-disable no-param-reassign */
  index.index = deserializedIndex;
  index.size = size;
  /* eslint-enable no-param-reassign */

  return index;
}


function serializeResources(engine, buffer) {
  // Serialize `resourceChecksum`
  buffer.pushStr(engine.resourceChecksum);

  // Serialize `js`
  buffer.pushUint8(engine.js.size);
  engine.js.forEach((resource, name) => {
    buffer.pushStr(name);
    buffer.pushStr(resource);
  });

  // Serialize `resources`
  buffer.pushUint8(engine.resources.size);
  engine.resources.forEach(({ contentType, data }, name) => {
    buffer.pushStr(name);
    buffer.pushStr(contentType);
    buffer.pushStr(data);
  });
}


function deserializeResources(buffer) {
  const js = new Map();
  const resources = new Map();
  const resourceChecksum = buffer.getStr();

  // Deserialize `js`
  const jsSize = buffer.getUint8();
  for (let i = 0; i < jsSize; i += 1) {
    js.set(
      buffer.getStr(), // name
      buffer.getStr() // resource
    );
  }

  // Deserialize `resources`
  const resourcesSize = buffer.getUint8();
  for (let i = 0; i < resourcesSize; i += 1) {
    resources.set(
      buffer.getStr(), { // name
        contentType: buffer.getStr(),
        data: buffer.getStr(),
      },
    );
  }

  return {
    js,
    resources,
    resourceChecksum,
  };
}


/**
 * Creates a string representation of the full engine. It can be stored
 * on-disk for faster loading of the adblocker. The `load` method of a
 * `FiltersEngine` instance can be used to restore the engine *in-place*.
 */
function serializeEngine(engine) {
  // Create a big buffer! It does not have to be the right size since
  // `DynamicDataView` is able to resize itself dynamically if needed.
  const buffer = new DynamicDataView(4000000);

  buffer.pushUint8(engine.version);
  buffer.pushUint8(Number(engine.loadCosmeticFilters));
  buffer.pushUint8(Number(engine.loadNetworkFilters));
  buffer.pushUint8(Number(engine.optimizeAOT));

  // Resources (js, resources)
  serializeResources(engine, buffer);

  // Lists
  serializeLists(buffer, engine.lists);

  // Buckets
  serializeReverseIndex(engine.filters.index, buffer);
  serializeReverseIndex(engine.exceptions.index, buffer);
  serializeReverseIndex(engine.importants.index, buffer);
  serializeReverseIndex(engine.redirects.index, buffer);
  serializeReverseIndex(engine.cosmetics.hostnameIndex, buffer);
  serializeReverseIndex(engine.cosmetics.selectorIndex, buffer);

  return buffer.crop();
}


function deserializeEngine(serialized, version) {
  const buffer = new DynamicDataView(0);
  buffer.set(serialized);

  // Before starting deserialization, we make sure that the version of the
  // serialized engine is the same as the current source code. If not, we start
  // fresh and create a new engine from the lists.
  const serializedEngineVersion = buffer.getUint8();
  if (version !== serializedEngineVersion) {
    throw new Error('serialized engine version mismatch');
  }

  // Create a new engine with same options
  const options = {
    loadCosmeticFilters: Boolean(buffer.getUint8()),
    loadNetworkFilters: Boolean(buffer.getUint8()),
    optimizeAOT: Boolean(buffer.getUint8()),
    version: serializedEngineVersion,
  };
  const engine = new FiltersEngine(options);

  // Deserialize resources
  const {
    js,
    resources,
    resourceChecksum,
  } = deserializeResources(buffer);

  engine.js = js;
  engine.resources = resources;
  engine.resourceChecksum = resourceChecksum;

  // Deserialize lists + filters
  const {
    lists,
    networkFilters,
    cosmeticFilters,
  } = deserializeLists(buffer);

  engine.lists = lists;

  // Deserialize buckets
  deserializeReverseIndex(buffer, engine.filters.index, networkFilters);
  deserializeReverseIndex(buffer, engine.exceptions.index, networkFilters);
  deserializeReverseIndex(buffer, engine.importants.index, networkFilters);
  deserializeReverseIndex(buffer, engine.redirects.index, networkFilters);
  deserializeReverseIndex(buffer, engine.cosmetics.hostnameIndex, cosmeticFilters);
  deserializeReverseIndex(buffer, engine.cosmetics.selectorIndex, cosmeticFilters);

  return engine;
}


export {
  serializeNetworkFilter,
  deserializeNetworkFilter,
  serializeCosmeticFilter,
  deserializeCosmeticFilter,
  serializeReverseIndex,
  deserializeReverseIndex,
  serializeEngine,
  deserializeEngine
};
