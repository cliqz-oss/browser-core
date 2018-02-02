function nope(arg) {
    return arg;
}
class ReverseIndex {
    constructor(filters, getTokens, { optimizer = nope, multiKeys = false } = {}) {
        this.index = new Map();
        this.size = 0;
        this.optimizer = optimizer;
        this.getTokens = getTokens;
        this.multiKeys = multiKeys || false;
        this.addFilters(filters || []);
    }
    iterMatchingFilters(tokens, cb) {
        for (let j = 0; j < tokens.length; j += 1) {
            if (this.iterBucket(tokens[j], cb) === false) {
                return;
            }
        }
        this.iterBucket(0, cb);
    }
    report() {
        const sizes = new Map();
        let strResult = '';
        this.index.forEach((bucket, token) => {
            const filters = bucket.filters;
            sizes.set(filters.length, (sizes.get(filters.length) || 0) + 1);
            if (length > 5) {
                strResult = strResult.concat(`adblocker size bucket "${token}" => ${filters.length}\n`);
                filters.forEach((f) => {
                    strResult = strResult.concat(`    ${f.toString()} ${f.mask}\n`);
                });
            }
        });
        sizes.forEach((count, size) => {
            strResult = strResult.concat(`adblocker sizes ${size} => ${count} buckets\n`);
        });
        return strResult;
    }
    optimizeAheadOfTime() {
        if (this.optimizer) {
            this.index.forEach((bucket) => {
                this.optimize(bucket, true);
            });
        }
    }
    addFilters(filters) {
        const length = filters.length;
        this.size = length;
        const idToTokens = new Map();
        const histogram = new Map();
        for (let i = 0; i < filters.length; i += 1) {
            const filter = filters[i];
            const multiTokens = this.multiKeys
                ? this.getTokens(filter)
                : [this.getTokens(filter)];
            idToTokens.set(filter.id, multiTokens);
            for (let j = 0; j < multiTokens.length; j += 1) {
                const tokens = multiTokens[j];
                for (let k = 0; k < tokens.length; k += 1) {
                    const token = tokens[k];
                    histogram.set(token, (histogram.get(token) || 0) + 1);
                }
            }
        }
        for (let i = 0; i < filters.length; i += 1) {
            let wildCardInserted = false;
            const filter = filters[i];
            const multiTokens = idToTokens.get(filter.id);
            for (let j = 0; j < multiTokens.length; j += 1) {
                const tokens = multiTokens[j];
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
                if (bestToken === 0) {
                    if (wildCardInserted) {
                        continue;
                    }
                    else {
                        wildCardInserted = true;
                    }
                }
                const bucket = this.index.get(bestToken);
                if (bucket === undefined) {
                    this.index.set(bestToken, {
                        filters: [filter],
                        hit: 0,
                        optimized: false,
                    });
                }
                else {
                    bucket.filters.push(filter);
                }
            }
        }
    }
    optimize(bucket, force = false) {
        if (this.optimizer && !bucket.optimized && (force || bucket.hit >= 5)) {
            if (bucket.filters.length > 1) {
                bucket.filters = this.optimizer(bucket.filters);
            }
            bucket.optimized = true;
        }
    }
    iterBucket(token, cb) {
        const bucket = this.index.get(token);
        if (bucket !== undefined) {
            bucket.hit += 1;
            this.optimize(bucket);
            const filters = bucket.filters;
            for (let k = 0; k < filters.length; k += 1) {
                if (cb(filters[k]) === false) {
                    return false;
                }
            }
        }
        return true;
    }
}

function getBit(n, mask) {
    return !!(n & mask);
}
function setBit(n, mask) {
    return n | mask;
}
function clearBit(n, mask) {
    return n & ~mask;
}
function fastHash(str) {
    if (!str) {
        return 0;
    }
    let hash = 5407;
    for (let i = 0; i < str.length; i += 1) {
        hash = (hash * 31) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
}
function fastStartsWith(haystack, needle) {
    if (haystack.length < needle.length) {
        return false;
    }
    const ceil = needle.length;
    for (let i = 0; i < ceil; i += 1) {
        if (haystack[i] !== needle[i]) {
            return false;
        }
    }
    return true;
}
function fastStartsWithFrom(haystack, needle, start) {
    if (haystack.length - start < needle.length) {
        return false;
    }
    const ceil = start + needle.length;
    for (let i = start; i < ceil; i += 1) {
        if (haystack[i] !== needle[i - start]) {
            return false;
        }
    }
    return true;
}
function isDigit(ch) {
    return ch >= 48 && ch <= 57;
}
function isAlpha(ch) {
    ch &= ~32;
    return ch >= 65 && ch <= 90;
}
function isAllowed(ch) {
    return isDigit(ch) || isAlpha(ch);
}
function fastTokenizer(pattern, isAllowedCode, allowRegexSurround = false) {
    const tokens = [];
    let inside = false;
    let start = 0;
    let length = 0;
    for (let i = 0, len = pattern.length; i < len; i += 1) {
        const ch = pattern.charCodeAt(i);
        if (isAllowedCode(ch)) {
            if (!inside) {
                inside = true;
                start = i;
                length = 0;
            }
            length += 1;
        }
        else if (inside) {
            inside = false;
            if (allowRegexSurround || ch !== 42) {
                tokens.push(fastHash(pattern.substr(start, length)));
            }
        }
    }
    if (inside) {
        tokens.push(fastHash(pattern.substr(start, length)));
    }
    return tokens;
}
function tokenize(pattern) {
    return fastTokenizer(pattern, isAllowed, false);
}

function isAnchoredByHostname(filterHostname, hostname) {
    const matchIndex = hostname.indexOf(filterHostname);
    return (matchIndex === 0 || (matchIndex > 0 && hostname[matchIndex - 1] === '.'));
}
function checkPatternPlainFilter(filter, { url }) {
    return url.indexOf(filter.getFilter()) !== -1;
}
function checkPatternRightAnchorFilter(filter, { url }) {
    return url.endsWith(filter.getFilter());
}
function checkPatternLeftAnchorFilter(filter, { url }) {
    return fastStartsWith(url, filter.getFilter());
}
function checkPatternLeftRightAnchorFilter(filter, { url }) {
    return url === filter.getFilter();
}
function checkPatternRegexFilter(filter, { url }) {
    return filter.getRegex().test(url);
}
function checkPatternHostnameAnchorRegexFilter(filter, { url, hostname }) {
    if (isAnchoredByHostname(filter.getHostname(), hostname)) {
        return checkPatternRegexFilter(filter, { url });
    }
    return false;
}
function checkPatternHostnameRightAnchorFilter(filter, { url, hostname }) {
    if (isAnchoredByHostname(filter.getHostname(), hostname)) {
        const urlAfterHostname = url.substring(url.indexOf(filter.getHostname()) + filter.getHostname().length);
        return filter.getFilter() === urlAfterHostname;
    }
    return false;
}
function checkPatternHostnameAnchorFilter(filter, { url, hostname }) {
    if (isAnchoredByHostname(filter.getHostname(), hostname)) {
        const urlAfterHostname = url.substring(url.indexOf(filter.getHostname()) + filter.getHostname().length);
        return fastStartsWith(urlAfterHostname, filter.getFilter());
    }
    return false;
}
function checkPattern(filter, request) {
    if (filter.isHostnameAnchor()) {
        if (filter.isRegex()) {
            return checkPatternHostnameAnchorRegexFilter(filter, request);
        }
        else if (filter.isRightAnchor()) {
            return checkPatternHostnameRightAnchorFilter(filter, request);
        }
        return checkPatternHostnameAnchorFilter(filter, request);
    }
    else if (filter.isRegex()) {
        return checkPatternRegexFilter(filter, request);
    }
    else if (filter.isLeftAnchor() && filter.isRightAnchor()) {
        return checkPatternLeftRightAnchorFilter(filter, request);
    }
    else if (filter.isLeftAnchor()) {
        return checkPatternLeftAnchorFilter(filter, request);
    }
    else if (filter.isRightAnchor()) {
        return checkPatternRightAnchorFilter(filter, request);
    }
    return checkPatternPlainFilter(filter, request);
}
function checkOptions(filter, request) {
    if (!filter.isCptAllowed(request.cpt)) {
        return false;
    }
    const sHost = request.sourceHostname;
    const sHostGD = request.sourceGD;
    const hostGD = request.hostGD;
    const isFirstParty = sHostGD === hostGD;
    if (!filter.firstParty() && isFirstParty) {
        return false;
    }
    if (!filter.thirdParty() && !isFirstParty) {
        return false;
    }
    if (filter.hasOptDomains()) {
        const optDomains = filter.getOptDomains();
        if (optDomains.size > 0 &&
            !(optDomains.has(sHostGD) || optDomains.has(sHost))) {
            return false;
        }
    }
    if (filter.hasOptNotDomains()) {
        const optNotDomains = filter.getOptNotDomains();
        if (optNotDomains.size > 0 &&
            (optNotDomains.has(sHostGD) || optNotDomains.has(sHost))) {
            return false;
        }
    }
    return true;
}
function matchNetworkFilter(filter, request) {
    return checkOptions(filter, request) && checkPattern(filter, request);
}

const FROM_ANY = 1 |
    2 |
    4 |
    8 |
    16 |
    32 |
    64 |
    128 |
    256 |
    512 |
    1024 |
    2048 |
    4096 |
    8192 |
    16384 |
    32768 |
    65536;
const CPT_TO_MASK = {
    1: 16,
    2: 64,
    3: 1,
    4: 128,
    5: 4,
    7: 256,
    10: 32,
    11: 1024,
    12: 8,
    13: 4096,
    14: 8192,
    15: 2,
    16: 512,
    17: 65536,
    18: 16384,
    19: 32768,
    20: 2048,
    21: 1,
};
const SEPARATOR = /[/^*]/;
function compileRegex(filterStr, isRightAnchor, isLeftAnchor, matchCase) {
    let filter = filterStr;
    filter = filter.replace(/([|.$+?{}()[\]\\])/g, '\\$1');
    filter = filter.replace(/\*/g, '.*');
    filter = filter.replace(/\^/g, '(?:[^\\w\\d_.%-]|$)');
    if (isRightAnchor) {
        filter = `${filter}$`;
    }
    if (isLeftAnchor) {
        filter = `^${filter}`;
    }
    if (matchCase) {
        return new RegExp(filter);
    }
    return new RegExp(filter, 'i');
}
function parseDomainsOption(domains) {
    return new Set(domains ? domains.split('|') : []);
}
class NetworkFilter {
    constructor({ mask, filter, optDomains, optNotDomains, redirect, hostname, id, }) {
        this.id = id;
        this.mask = mask;
        this.filter = filter;
        this.optDomains = optDomains;
        this.optNotDomains = optNotDomains;
        this.redirect = redirect;
        this.hostname = hostname;
        this.regex = null;
        this.optDomainsSet = null;
        this.optNotDomainsSet = null;
        this.rawLine = null;
    }
    isCosmeticFilter() {
        return false;
    }
    isNetworkFilter() {
        return true;
    }
    toString() {
        let filter = '';
        if (this.isException()) {
            filter += '@@';
        }
        if (this.isHostnameAnchor()) {
            filter += '||';
        }
        if (this.isLeftAnchor()) {
            filter += '|';
        }
        if (!this.isRegex()) {
            if (this.hasHostname()) {
                filter += this.getHostname();
                filter += '^';
            }
            filter += this.getFilter();
        }
        else {
            filter += this.getRegex().source;
        }
        const options = [];
        if (!this.fromAny()) {
            if (this.fromImage()) {
                options.push('image');
            }
            if (this.fromMedia()) {
                options.push('media');
            }
            if (this.fromObject()) {
                options.push('object');
            }
            if (this.fromObjectSubrequest()) {
                options.push('object-subrequest');
            }
            if (this.fromOther()) {
                options.push('other');
            }
            if (this.fromPing()) {
                options.push('ping');
            }
            if (this.fromScript()) {
                options.push('script');
            }
            if (this.fromStylesheet()) {
                options.push('stylesheet');
            }
            if (this.fromSubdocument()) {
                options.push('subdocument');
            }
            if (this.fromWebsocket()) {
                options.push('websocket');
            }
            if (this.fromXmlHttpRequest()) {
                options.push('xmlhttprequest');
            }
            if (this.fromFont()) {
                options.push('font');
            }
        }
        if (this.isImportant()) {
            options.push('important');
        }
        if (this.isRedirect()) {
            options.push(`redirect=${this.getRedirect()}`);
        }
        if (this.firstParty() !== this.thirdParty()) {
            if (this.firstParty()) {
                options.push('first-party');
            }
            if (this.thirdParty()) {
                options.push('third-party');
            }
        }
        if (this.hasOptDomains() || this.hasOptNotDomains()) {
            const domains = [...this.getOptDomains()];
            this.getOptNotDomains().forEach(nd => domains.push(`~${nd}`));
            options.push(`domain=${domains.join('|')}`);
        }
        if (options.length > 0) {
            filter += `$${options.join(',')}`;
        }
        if (this.isRightAnchor()) {
            filter += '|';
        }
        return filter;
    }
    hasFilter() {
        return !!this.filter;
    }
    hasOptNotDomains() {
        return !!this.optNotDomains;
    }
    getOptNotDomains() {
        this.optNotDomainsSet =
            this.optNotDomainsSet || parseDomainsOption(this.optNotDomains);
        return this.optNotDomainsSet;
    }
    hasOptDomains() {
        return !!this.optDomains;
    }
    getOptDomains() {
        this.optDomainsSet =
            this.optDomainsSet || parseDomainsOption(this.optDomains);
        return this.optDomainsSet;
    }
    getMask() {
        return this.mask;
    }
    isRedirect() {
        return !!this.redirect;
    }
    getRedirect() {
        return this.redirect;
    }
    hasHostname() {
        return !!this.hostname;
    }
    getHostname() {
        return this.hostname;
    }
    getFilter() {
        return this.filter;
    }
    setRegex(re) {
        this.regex = re;
        this.mask = setBit(this.mask, 8388608);
        this.mask = clearBit(this.mask, 4194304);
    }
    getRegex() {
        if (this.regex === null) {
            this.regex = compileRegex(this.filter, this.isRightAnchor(), this.isLeftAnchor(), this.matchCase());
        }
        return this.regex;
    }
    getTokens() {
        return tokenize(this.filter).concat(tokenize(this.hostname));
    }
    isCptAllowed(cpt) {
        const mask = CPT_TO_MASK[cpt];
        if (mask !== undefined) {
            return getBit(this.mask, mask);
        }
        return true;
    }
    isException() {
        return getBit(this.mask, 134217728);
    }
    isHostnameAnchor() {
        return getBit(this.mask, 67108864);
    }
    isRightAnchor() {
        return getBit(this.mask, 33554432);
    }
    isLeftAnchor() {
        return getBit(this.mask, 16777216);
    }
    matchCase() {
        return getBit(this.mask, 262144);
    }
    isImportant() {
        return getBit(this.mask, 131072);
    }
    isRegex() {
        return getBit(this.mask, 8388608);
    }
    isPlain() {
        return !getBit(this.mask, 8388608);
    }
    isHostname() {
        return getBit(this.mask, 2097152);
    }
    fromAny() {
        return (this.mask & FROM_ANY) === FROM_ANY;
    }
    thirdParty() {
        return getBit(this.mask, 524288);
    }
    firstParty() {
        return getBit(this.mask, 1048576);
    }
    fromImage() {
        return getBit(this.mask, 1);
    }
    fromMedia() {
        return getBit(this.mask, 2);
    }
    fromObject() {
        return getBit(this.mask, 4);
    }
    fromObjectSubrequest() {
        return getBit(this.mask, 8);
    }
    fromOther() {
        return getBit(this.mask, 16);
    }
    fromPing() {
        return getBit(this.mask, 32);
    }
    fromScript() {
        return getBit(this.mask, 64);
    }
    fromStylesheet() {
        return getBit(this.mask, 128);
    }
    fromSubdocument() {
        return getBit(this.mask, 256);
    }
    fromWebsocket() {
        return getBit(this.mask, 512);
    }
    fromXmlHttpRequest() {
        return getBit(this.mask, 1024);
    }
    fromFont() {
        return getBit(this.mask, 8192);
    }
}
function setNetworkMask(mask, m, value) {
    if (value) {
        return setBit(mask, m);
    }
    return clearBit(mask, m);
}
function checkIsRegex(filter, start, end) {
    const starIndex = filter.indexOf('*', start);
    const separatorIndex = filter.indexOf('^', start);
    return ((starIndex !== -1 && starIndex < end) ||
        (separatorIndex !== -1 && separatorIndex < end));
}
function parseNetworkFilter(rawLine) {
    const line = rawLine;
    let mask = 524288 | 1048576;
    let filter = null;
    let hostname = null;
    let optDomains = '';
    let optNotDomains = '';
    let redirect = '';
    let hasCptOption = false;
    let filterIndexStart = 0;
    let filterIndexEnd = line.length;
    if (fastStartsWith(line, '@@')) {
        filterIndexStart += 2;
        mask = setBit(mask, 134217728);
    }
    const optionsIndex = line.indexOf('$', filterIndexStart);
    if (optionsIndex !== -1) {
        filterIndexEnd = optionsIndex;
        const rawOptions = line.substr(optionsIndex + 1);
        const options = rawOptions.split(',');
        for (let i = 0; i < options.length; i += 1) {
            const rawOption = options[i];
            let negation = false;
            let option = rawOption;
            if (fastStartsWith(option, '~')) {
                negation = true;
                option = option.substr(1);
            }
            else {
                negation = false;
            }
            let optionValues = [];
            if (option.indexOf('=') !== -1) {
                const optionAndValues = option.split('=', 2);
                option = optionAndValues[0];
                optionValues = optionAndValues[1].split('|');
            }
            switch (option) {
                case 'domain': {
                    const optDomainsArray = [];
                    const optNotDomainsArray = [];
                    for (let j = 0; j < optionValues.length; j += 1) {
                        const value = optionValues[j];
                        if (value) {
                            if (fastStartsWith(value, '~')) {
                                optNotDomainsArray.push(value.substr(1));
                            }
                            else {
                                optDomainsArray.push(value);
                            }
                        }
                    }
                    if (optDomainsArray.length > 0) {
                        optDomains = optDomainsArray.join('|');
                    }
                    if (optNotDomainsArray.length > 0) {
                        optNotDomains = optNotDomainsArray.join('|');
                    }
                    break;
                }
                case 'image':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 1, !negation);
                    break;
                case 'media':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 2, !negation);
                    break;
                case 'object':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 4, !negation);
                    break;
                case 'object-subrequest':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 8, !negation);
                    break;
                case 'other':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 16, !negation);
                    break;
                case 'ping':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 32, !negation);
                    break;
                case 'script':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 64, !negation);
                    break;
                case 'stylesheet':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 128, !negation);
                    break;
                case 'subdocument':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 256, !negation);
                    break;
                case 'xmlhttprequest':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 1024, !negation);
                    break;
                case 'websocket':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 512, !negation);
                    break;
                case 'font':
                    hasCptOption = true;
                    mask = setNetworkMask(mask, 8192, !negation);
                    break;
                case 'important':
                    if (negation) {
                        return null;
                    }
                    mask = setBit(mask, 131072);
                    break;
                case 'match-case':
                    if (negation) {
                        return null;
                    }
                    mask = setBit(mask, 262144);
                    break;
                case 'third-party':
                    if (negation) {
                        mask = clearBit(mask, 524288);
                    }
                    else {
                        mask = clearBit(mask, 1048576);
                    }
                    break;
                case 'first-party':
                    if (negation) {
                        mask = clearBit(mask, 1048576);
                    }
                    else {
                        mask = clearBit(mask, 524288);
                    }
                    break;
                case 'collapse':
                    break;
                case 'redirect':
                    if (negation) {
                        return null;
                    }
                    if (optionValues.length === 0) {
                        return null;
                    }
                    redirect = optionValues[0];
                    break;
                default:
                    return null;
            }
        }
    }
    if (hasCptOption === false) {
        mask = setBit(mask, FROM_ANY);
    }
    if (fastStartsWith(line, '127.0.0.1')) {
        hostname = line.substr(line.lastIndexOf(' ') + 1);
        filter = '';
        mask = clearBit(mask, 8388608);
        mask = setBit(mask, 2097152);
        mask = setBit(mask, 67108864);
    }
    else {
        if (line[filterIndexEnd - 1] === '|') {
            mask = setBit(mask, 33554432);
            filterIndexEnd -= 1;
        }
        if (fastStartsWithFrom(line, '||', filterIndexStart)) {
            mask = setBit(mask, 67108864);
            filterIndexStart += 2;
        }
        else if (line[filterIndexStart] === '|') {
            mask = setBit(mask, 16777216);
            filterIndexStart += 1;
        }
        if (line.charAt(filterIndexEnd - 1) === '*' &&
            filterIndexEnd - filterIndexStart > 1) {
            filterIndexEnd -= 1;
        }
        const isRegex = checkIsRegex(line, filterIndexStart, filterIndexEnd);
        mask = setNetworkMask(mask, 8388608, isRegex);
        const isHostnameAnchor = getBit(mask, 67108864);
        if (!isRegex && isHostnameAnchor) {
            const slashIndex = line.indexOf('/', filterIndexStart);
            if (slashIndex !== -1) {
                hostname = line.substring(filterIndexStart, slashIndex);
                filterIndexStart = slashIndex;
            }
            else {
                hostname = line.substring(filterIndexStart, filterIndexEnd);
                filter = '';
            }
        }
        else if (isRegex && isHostnameAnchor) {
            const firstSeparator = line.search(SEPARATOR);
            if (firstSeparator !== -1) {
                hostname = line.substring(filterIndexStart, firstSeparator);
                filterIndexStart = firstSeparator;
                if (filterIndexEnd - filterIndexStart === 1 &&
                    line.charAt(filterIndexStart) === '^') {
                    filter = '';
                    mask = clearBit(mask, 8388608);
                }
                else {
                    mask = setNetworkMask(mask, 8388608, checkIsRegex(line, filterIndexStart, filterIndexEnd));
                }
            }
        }
    }
    if (filter === null) {
        filter = line.substring(filterIndexStart, filterIndexEnd).toLowerCase();
    }
    let finalHostname = '';
    if (hostname !== null) {
        finalHostname = hostname;
    }
    let finalFilter = '';
    if (filter !== null) {
        finalFilter = filter;
    }
    if (getBit(mask, 67108864) &&
        fastStartsWith(finalHostname, 'www.')) {
        finalHostname = finalHostname.slice(4);
    }
    if (finalHostname !== '') {
        finalHostname = finalHostname.toLowerCase();
    }
    const id = fastHash(line);
    return new NetworkFilter({
        filter: finalFilter,
        hostname: finalHostname,
        id,
        mask,
        optDomains,
        optNotDomains,
        redirect,
    });
}

function mkRequest({ url = '', hostname = '', domain = '', sourceHostname = '', sourceDomain = '', cpt = 6 }) {
    return {
        cpt,
        tokens: tokenize(url),
        sourceGD: sourceDomain,
        sourceHostname,
        hostGD: domain,
        hostname,
        url: url.toLowerCase(),
    };
}

export { ReverseIndex, matchNetworkFilter, parseNetworkFilter, mkRequest };
