registerContentScript('https://cliqz.com/search?q=*', function (window) {
  var URLSearchParams = window.URLSearchParams;
  var searchParams = new URLSearchParams(window.location.search);
  var queries = searchParams.getAll('q');
  var query = queries[queries.length-1];

  function queryCliqz(query) {
    window.chrome.runtime.sendMessage({
      module: 'core',
      action: 'queryCliqz',
      args: [
        decodeURIComponent(query)
      ]
    });
  }

  if (!query) {
    return;
  }

  queryCliqz(query);

  window.document.addEventListener("DOMContentLoaded", function(event) {
    var content = window.document.querySelector('.post-content');
    if (content) {
      content.innerHTML = '';

      var rowContainer = window.document.createElement('div');
      rowContainer.classList.add('row-container');

      var row = window.document.createElement('div');
      row.classList.add('row');
      row.classList.add('limit-width');
      row.classList.add('row-parent');
      rowContainer.appendChild(row);

      var p = window.document.createElement('p');
      // TODO: need translations
      p.innerText = 'Search CLIQZ for: ';
      row.appendChild(p);

      var anchor = window.document.createElement('a');
      anchor.innerText = query;
      anchor.classList.add('btn');
      anchor.addEventListener('click', queryCliqz.bind(null, query));
      p.appendChild(anchor);

      content.appendChild(rowContainer);
    }
  });
});
