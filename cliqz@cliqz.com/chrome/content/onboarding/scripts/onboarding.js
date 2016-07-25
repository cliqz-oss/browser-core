Components.utils.import('chrome://cliqzmodules/content/CliqzTour.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');

var unload = function () {
    CliqzTour.unload();
}

var init = function () {
    CliqzUtils.localizeDoc(document);

    CliqzTour.init();

    var btn = document.getElementById('tour-btn'),
        btnCancel = document.getElementById('tour-btn-cancel');

    btn.addEventListener('click', function () {
        CliqzTour.start("page");    
    });

    btnCancel.addEventListener('click', function () {
        CliqzTour.cancel();
    });          
};
