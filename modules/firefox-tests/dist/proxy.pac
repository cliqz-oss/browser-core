
// Default connection
var direct = "DIRECT";

// Alternate Proxy Server
var proxy = "PROXY localhost:60508";

function FindProxyForURL(url, host)
{
    // Use Proxy?
    if (localHostOrDomainIs(host, "cliqztest.com") || localHostOrDomainIs(host, "www.cliqztest.com")
      || localHostOrDomainIs(host, "cliqztest.de")) {
        return proxy;
    } else {
        return direct;
    }
 }
