registerContentScript('https://cliqz.com/search/?q=*', function (window) {
  var URLSearchParams = window.URLSearchParams;
  var searchParams = new URLSearchParams(window.location.search);
  var queries = searchParams.getAll('q');
  var query = queries[queries.length-1];

  if (query) {
    window.chrome.runtime.sendMessage({
      module: 'core',
      action: 'queryCliqz',
      args: [
        decodeURIComponent(query)
      ]
    });
  }
});
