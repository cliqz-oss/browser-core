/**
 * @param routingTable  array of proxy information (keys: dns, ip, ssl)
 * @returns the proxy list (unique proxies in the routing table)
 */
export function createProxyList(routeTable) {
  const proxyList = [];
  const seenProxies = new Set();
  for (const proxy of routeTable) {
    const key = [proxy.dns, proxy.ip];
    if (!seenProxies[key]) {
      seenProxies[key] = proxy;
      proxyList.push(proxy);
    }
  }
  return proxyList;
}

export function getProxyVerifyUrl(args) {
  const schema = args.supportsHttps ? 'https' : 'http';
  const host = args.host || args.ip;
  return `${schema}://${host}/v2/verify`;
}
