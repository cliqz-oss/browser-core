// import logger from './logger';


function processRegex(r) {
  return `(?:${r.source})`;
}


function escape(s) {
  return `(?:${s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`;
}


function setWithDefault(map, key, value) {
  if (!map.has(key)) {
    map.set(key, [value]);
  } else {
    const lst = map.get(key);
    lst.push(value);
  }
}


export default function (filters) {
  const fused = [];

  // 1. Group filters by same options
  const groupedByOption = new Map();
  for (let i = 0; i < filters.length; i += 1) {
    const filter = filters[i];
    const mask = filter.getMask();

    if (!groupedByOption.has(mask)) {
      groupedByOption.set(mask, [filter]);
    } else {
      const lst = groupedByOption.get(mask);
      lst.push(filter);
    }
  }

  // For each identical option, group identical patterns into one filter
  groupedByOption.forEach((lst) => {
    // Group filters by identical filter/hostname
    const plainNoDomains = new Map(); // Plain filter with no `$domain` option
    const plainPatterns = new Map(); // Plain filter with a `$domain` option
    const regexPatterns = new Map(); // Regex filter

    for (let i = 0; i < lst.length; i += 1) {
      const filter = lst[i];
      if (filter.isPlain()) {
        if (!(filter.hasOptDomains() ||
              filter.hasOptNotDomains() ||
              filter.isHostname() ||
              filter.isHostnameAnchor())) {
          // A very common case of full-text patterns, with no hostname and not
          // options. In this case we just group them into a big regexp. We
          // should just make sure that we keep redirects unchanged.
          setWithDefault(
            plainNoDomains,
            `${filter.redirect}`,
            filter
          );
        } else {
          setWithDefault(
            plainPatterns,
            `${filter.getHostname()}|||${filter.getFilter()}|||${filter.redirect}`,
            filter
          );
        }
      } else if (!(filter.hasOptDomains() || filter.hasOptNotDomains())) {
        setWithDefault(
          plainNoDomains,
          `${filter.redirect}`,
          filter
        );
      } else {
        setWithDefault(
          regexPatterns,
          `${filter.getHostname()}|||${filter.getRegex().source}`,
          filter
        );
      }
    }

    // Fusion plain patterns with no domain (create a compiled regex)
    plainNoDomains.forEach((bucket) => {
      if (bucket.length === 1) {
        fused.push(bucket[0]);
      } else {
        // logger.debug(`>++ consolidate ${p} (size: ${bucket.length})`);
        // bucket.forEach((f) => {
        //   logger.debug(`[pp]   ${f.rawLine}`);
        // });

        let filter = null;
        const patterns = new Set();
        for (let i = 0; i < bucket.length; i += 1) {
          const f = bucket[i];
          if (filter === null) {
            filter = f;
          }

          if (f.isRegex()) {
            patterns.add(processRegex(f.getRegex()));
          } else if (f.isRightAnchor()) {
            patterns.add(`${escape(f.getFilter())}$`);
          } else if (f.isLeftAnchor()) {
            patterns.add(`^${escape(f.getFilter())}`);
          } else {
            patterns.add(escape(f.getFilter()));
          }
        }

        // Create one big regex out of all the patterns
        if (patterns.size > 1) {
          filter.setRegex(new RegExp([...patterns].join('|')));
        }

        fused.push(filter);
        // logger.debug(`  pp  ${filter.pprint()}`);
      }
    });

    // Fusion plain patterns with domain
    plainPatterns.forEach((bucket) => {
      if (bucket.length === 1) {
        fused.push(bucket[0]);
      } else {
        // logger.debug(`>++ consolidate ${p} (size: ${bucket.length})`);
        // bucket.forEach((f) => {
        //   logger.debug(`[p]   ${f.rawLine}`);
        // });

        let newFilterDomains = null;
        let optDomains = null;
        let newFilterNotDomains = null;
        let optNotDomains = null;
        let newFilter = null;

        for (let i = 0; i < bucket.length; i += 1) {
          const f = bucket[i];
          if (f.hasOptNotDomains()) {
            if (newFilterNotDomains === null) {
              newFilterNotDomains = f;
              optNotDomains = f.getOptNotDomains();
            } else {
              const ds = f.optNotDomains.split('|');
              for (let j = 0; j < ds.length; j += 1) {
                optNotDomains.add(ds[i]);
              }
            }
          } else if (f.hasOptDomains()) {
            if (newFilterDomains === null) {
              newFilterDomains = f;
              optDomains = f.getOptDomains();
            } else {
              const ds = f.optDomains.split('|');
              for (let j = 0; j < ds.length; j += 1) {
                optDomains.add(ds[j]);
              }
            }
          } else if (newFilter === null) {
            newFilter = f;
          }
        }

        if (newFilter !== null) {
          // logger.debug(`  e   ${newFilter.pprint()}`);
          fused.push(newFilter);
        }

        if (newFilterDomains !== null) {
          // logger.debug(`  d   ${newFilterDomains.pprint()}`);
          fused.push(newFilterDomains);
        }
        if (newFilterNotDomains !== null) {
          // logger.debug(`  nd  ${newFilterNotDomains.pprint()}`);
          fused.push(newFilterNotDomains);
        }
      }
    });

    // Fusion regex patterns
    regexPatterns.forEach((bucket) => {
      if (bucket.length === 1) {
        fused.push(bucket[0]);
      } else {
        // logger.debug(`>++ consolidate regex ${p} (size: ${bucket.length})`);
        // bucket.forEach((f) => {
        //   logger.debug(`[r]   ${f.rawLine}`);
        // });

        let newFilterDomains = null;
        const newFilterDomainsRegex = new Set();
        let optDomains = null;

        let newFilterNotDomains = null;
        let optNotDomains = null;
        const newFilterNotDomainsRegex = new Set();

        let newFilter = null;
        const newFilterRegex = new Set();

        for (let i = 0; i < bucket.length; i += 1) {
          const f = bucket[i];
          if (f.hasOptNotDomains()) {
            if (newFilterNotDomains === null) {
              newFilterNotDomains = f;
              optNotDomains = f.getOptNotDomains();
              newFilterNotDomainsRegex.add(processRegex(f.getRegex()));
            } else {
              const ds = f.optNotDomains.split('|');
              for (let j = 0; j < ds.length; j += 1) {
                optNotDomains.add(ds[i]);
              }
              newFilterNotDomainsRegex.add(processRegex(f.getRegex()));
            }
          } else if (f.hasOptDomains()) {
            if (newFilterDomains === null) {
              newFilterDomains = f;
              optDomains = f.getOptDomains();
              newFilterDomainsRegex.add(processRegex(f.getRegex()));
            } else {
              const ds = f.optDomains.split('|');
              for (let j = 0; j < ds.length; j += 1) {
                optDomains.add(ds[j]);
              }
              newFilterDomainsRegex.add(processRegex(f.getRegex()));
            }
          } else if (newFilter === null) {
            newFilter = f;
            newFilterRegex.add(processRegex(f.getRegex()));
          } else {
            newFilterRegex.add(processRegex(f.getRegex()));
          }
        }

        // Combine regex into one filter
        if (newFilter !== null) {
          const fusedRegex = [...newFilterRegex].join('|');
          // logger.debug(`  e  ${fusedRegex}`);
          newFilter.regex = new RegExp(fusedRegex);
          fused.push(newFilter);
        }

        if (newFilterDomains !== null) {
          const fusedRegex = [...newFilterDomainsRegex].join('|');
          // logger.debug(`  d  ${fusedRegex}`);
          newFilterDomains.regex = new RegExp(fusedRegex);
          fused.push(newFilterDomains);
        }

        if (newFilterNotDomains !== null) {
          const fusedRegex = [...newFilterNotDomainsRegex].join('|');
          // logger.debug(`  nd  ${fusedRegex}`);
          newFilterNotDomains.regex = new RegExp(fusedRegex);
          fused.push(newFilterNotDomains);
        }
      }
    });
  });

  return fused;
}
