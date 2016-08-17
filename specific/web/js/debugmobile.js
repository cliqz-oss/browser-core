var urlbar = document.getElementById('urlbar');
CliqzUtils.init({ lang: 'en' });
var resultsBox = document.getElementById('results');
CLIQZ.UI.init(urlbar);
var item_container;

CLIQZ.Core = {
	urlbar: urlbar,
	popup: resultsBox
}
urlbar.addEventListener('keydown', function(e){
	setTimeout(function(){
		item_container = document.getElementById('cliqz-results');
		var currentScrollInfo = {
			page: 0,
			totalOffset: 0,
			pageOffset: 0
		};
		(new CliqzAutocomplete.CliqzResults()).search(urlbar.value, function(r){

			var w = window.innerWidth;
			var isLoadingGoogle = false;

			var offset = 0;
			var showGooglethis = (r._results.length ? 1 : 0);
			resultsBox.style.width = (window.innerWidth * (r._results.length + showGooglethis)) + 'px';
			item_container.style.width = resultsBox.style.width;
			var validCount = 0;

			var currentResults = CLIQZ.UI.results({
				q: r._searchString,
				results: r._results.map(function(r, idx){
					r.type = r.style;
					r.left = (window.innerWidth * validCount);
					r.frameWidth = window.innerWidth;
					r.url = r.val || '';
					r.title = r.comment || '';

					if (!r.invalid) {
						validCount++;
					}
					return r;
				}),
				isInstant: false,
				googleThis: {
					left: (window.innerWidth * validCount),
					add: showGooglethis,
					frameWidth: window.innerWidth
				}
			});
			validCount += showGooglethis;


			if (_cliqzIsMobile) {
				resultsBox.style['transform'] = 'translate3d(' + Math.min((offset * w), (window.innerWidth * validCount)) + 'px, 0px, 0px)';
				var googleAnim = document.getElementById("googleThisAnim");


				var vp = new ViewPager(resultsBox, {
				  pages: validCount,
				  dragSize: window.innerWidth,
				  prevent_all_native_scrolling: true,
				  vertical: false,
				  onPageScroll : function (scrollInfo) {
				  	currentScrollInfo = scrollInfo;
				    offset = -scrollInfo.totalOffset;
				    invalidateScroll();
				  },

				  onPageChange : function (page) {
				    console.log('page', page);
				  }
				});

				function invalidateScroll() {
					// setTimeout(function() {
				  	resultsBox.style['transform'] = 'translate3d(' + (offset * w) + 'px, 0px, 0px)';
				  	if (googleAnim) {
				  		if (currentScrollInfo['page'] >= validCount - 2) {
				  			googleAnim.style['transform'] = 'rotate(' + (currentScrollInfo['pageOffset'] * 360) + 'deg)';
				  		}
				  		if (currentScrollInfo['totalOffset'] >= validCount - 0.9 && !isLoadingGoogle) {
				  			isLoadingGoogle = true;
				  			history.replaceState({"currentCliqzQuery": urlbar.value}, "", window.location.href + "?q=" + urlbar.value);
				  			window.open("http://www.google.com/#q=" + urlbar.value, "_self");
				  		}
				  	}
					// }, 0);
				}

				window.addEventListener('resize', function () {
				  var w = window.innerWidth;
				  invalidateScroll();
				});
			}
		});

	}, 300);
});

