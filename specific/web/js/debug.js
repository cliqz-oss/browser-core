var urlbar      = document.getElementById('urlbar'),
    cpBtn       = document.getElementById('cpBtn'),
    panelWindow = document.getElementById('panelWindow'),
    panelLeft   = -265,
    enableCMenu = CLIQZ.ContextMenu.enableContextMenu,
    openPopup   = CLIQZEnvironment.openPopup;
CliqzUtils.init(window);
CLIQZ.UI.init(urlbar);
//disable context menu by default
togglecMenu(true);


CLIQZ.Core = {
	urlbar: urlbar,
	popup: document.getElementById('results'),
	refreshButtons: function(){}
}
urlbar.addEventListener('keydown', function(e){
  panelWindow.style.left = panelLeft + 'px';
	CLIQZ.UI.main(document.getElementById('results'));
	setTimeout(function(){
		(new CliqzAutocomplete.CliqzResults()).search(urlbar.value, function(r){
			var currentResults = CLIQZ.UI.results({
				q: r._searchString,
				results: r._results.map(function(r){
					r.type = r.style;
					r.url = r.val || '';
					r.title = r.comment || '';
					return r;
				}),
				isInstant: false
			});
		});
	}, 0);
});

cpBtn.addEventListener('click', function(e) {
  var left = panelWindow.style.left;
  if (left === '0px') {
    panelWindow.style.left = panelLeft + "px";
  } else {
    panelWindow.style.left = 0;
  }
});


function togglecMenu(checked) {
  if(checked) {
    CLIQZ.ContextMenu.enableContextMenu = function() { return false; }
    CLIQZEnvironment.openPopup = function() { return false; }
  } else {
    CLIQZ.ContextMenu.enableContextMenu = enableCMenu;
    CLIQZEnvironment.openPopup = openPopup;
  }
}