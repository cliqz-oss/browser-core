// Some content policy types used in filters
const CPT = {
  TYPE_OTHER: 1,
  TYPE_SCRIPT: 2,
  TYPE_IMAGE: 3,
  TYPE_STYLESHEET: 4,
  TYPE_OBJECT: 5,
  TYPE_SUBDOCUMENT: 7,
  TYPE_PING: 10,
  TYPE_XMLHTTPREQUEST: 11,
  TYPE_OBJECT_SUBREQUEST: 12,
  TYPE_MEDIA: 15,
};


function checkContentPolicy(filter, cpt) {
  // Check content policy type only if at least one content policy has
  // been specified in the options.
  if (!filter.fromAny) {
    const options = [
      [filter.fromSubdocument, CPT.TYPE_SUBDOCUMENT],
      [filter.fromImage, CPT.TYPE_IMAGE],
      [filter.fromMedia, CPT.TYPE_MEDIA],
      [filter.fromObject, CPT.TYPE_OBJECT],
      [filter.fromObjectSubrequest, CPT.TYPE_OBJECT_SUBREQUEST],
      [filter.fromOther, CPT.TYPE_OTHER],
      [filter.fromPing, CPT.TYPE_PING],
      [filter.fromScript, CPT.TYPE_SCRIPT],
      [filter.fromStylesheet, CPT.TYPE_STYLESHEET],
      [filter.fromXmlHttpRequest, CPT.TYPE_XMLHTTPREQUEST],
    ];

    // If content policy type `option` is specified in filter filter,
    // then the policy type of the request must match.
    // - If more than one policy type is valid, we must find at least one
    // - If we found a blacklisted policy type we can return `false`
    let foundValidCP = null;
    for (let i = 0; i < options.length; i++) {
      const [option, policyType] = options[i];

      // Found a fromX matching the origin policy of the request
      if (option === true) {
        if (cpt === policyType) {
          foundValidCP = true;
          break;
        } else {
          foundValidCP = false;
        }
      }

      // This rule can't be used with filter policy type
      if (option === false && cpt === policyType) {
        return false;
      }
    }

    // Couldn't find any policy origin matching the request
    if (foundValidCP === false) {
      return false;
    }
  }

  return true;
}


function checkOptions(filter, request) {
  // Source
  const sHost = request.sourceHostname;
  const sHostGD = request.sourceGD;

  // Url endpoint
  const hostGD = request.hostGD;

  // Check option $third-party
  // source domain and requested domain must be different
  if ((filter.firstParty === false || filter.thirdParty === true) && sHostGD === hostGD) {
    return false;
  }

  // $~third-party
  // source domain and requested domain must be the same
  if ((filter.firstParty === true || filter.thirdParty === false) && sHostGD !== hostGD) {
    return false;
  }

  // URL must be among these domains to match
  if (filter.optDomains !== null &&
     !(filter.optDomains.has(sHostGD) ||
       filter.optDomains.has(sHost))) {
    return false;
  }

  // URL must not be among these domains to match
  if (filter.optNotDomains !== null &&
      (filter.optNotDomains.has(sHostGD) ||
       filter.optNotDomains.has(sHost))) {
    return false;
  }

  if (!checkContentPolicy(filter, request.cpt)) {
    return false;
  }

  return true;
}


function checkPattern(filter, request) {
  const url = request.url;
  const host = request.hostname;

  // Try to match url with pattern
  if (filter.isHostnameAnchor) {
    const matchIndex = host.indexOf(filter.hostname);
    // Either start at beginning of hostname or be preceded by a '.'
    if ((matchIndex > 0 && host[matchIndex - 1] === '.') || matchIndex === 0) {
      // Extract only the part after the hostname
      const urlPattern = url.substring(url.indexOf(filter.hostname) + filter.hostname.length);
      if (filter.isRegex) {
        return filter.regex.test(urlPattern);
      }
      // TODO: Should startWith instead of includes?
      return urlPattern.startsWith(filter.filterStr);
    }
  } else {
    if (filter.isRegex) {
      return filter.regex.test(url);
    } else if (filter.isLeftAnchor) {
      return url.startsWith(filter.filterStr);
    } else if (filter.isRightAnchor) {
      return url.endsWith(filter.filterStr);
    }

    return url.includes(filter.filterStr);
  }

  return false;
}


export default function match(filter, request) {
  if (filter.supported) {
    if (!checkOptions(filter, request)) {
      return false;
    }

    return checkPattern(filter, request);
  }

  return false;
}
