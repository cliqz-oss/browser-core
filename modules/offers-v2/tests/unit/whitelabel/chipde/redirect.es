const urls = {
  hop1: 'https://bestcheck.de/something',
  xchipde: 'https://x.chip.de/linktrack/button/?url=https%3A%2F%2Fpartners.webmasterplan.com%2F...',
  hop2: 'https://partners.webmasterplan.com/click.aspx?ref=119198&site=14665&type=text&tnb=158&s...',
  hop3: 'https://partners.webmasterplan.com/click2.aspx?csts=0&ref=119198&site=14665&type=tex...',
  hop4: 'https://ad.doubleclick.net/ddm/trackclk/N195005.149763AFFILINET/B20244785.204282965;dc_...',
  hop5: 'https://apiservices.krxd.net/click_tracker/track?kxconfid=rvq31sie0&kxadvertiserid=652253....',
  target: 'https://www.mediamarkt.de/de/shop/computer-buero/komponenten/nvidia-geforce-rtx20-aktion.html?...',
};
urls.defaultChain = [urls.hop1, urls.xchipde, urls.hop2, urls.hop3,
  urls.hop4, urls.hop5, urls.target];

function doRedirects(chain, onRequest) {
  for (let i = 0; i < chain.length - 1; i += 1) {
    const from = chain[i];
    const to = chain[i + 1];
    const evt = {
      statusCode: 302,
      type: 'main_frame',
      url: from,
      urlParts: { hostname: from.split('/')[2] },
      getResponseHeader: () => to,
    };
    onRequest(evt);
  }
  const url = chain[chain.length - 1];
  const evt = {
    statusCode: 200,
    type: 'main_frame',
    url,
    urlParts: { hostname: url.split('/')[2] },
  };
  onRequest(evt);
}

module.exports = { doRedirects, urls };
