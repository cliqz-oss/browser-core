"use strict";

var FIRST_PARTY_HOST = "localhost:60508",
    THIRD_PARTY_HOST1 = "127.0.0.1:60508",
    THIRD_PARTY_HOST2 = "cliqztest.de:60508";

var testPages = {}
testPages['thirdpartyscript'] = {"onBeforeRequest":[{"url":"http://localhost:60508/thirdpartyscript.html","method":"GET","frameId":66,"parentFrameId":66,"tabId":66,"type":6,"originUrl":"http://localhost:60508/thirdpartyscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/thirdpartyscript.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":66,"parentFrameId":66,"tabId":66,"type":2,"originUrl":"http://localhost:60508/thirdpartyscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/thirdpartyscript.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":66,"parentFrameId":66,"tabId":66,"type":11,"originUrl":"http://localhost:60508/thirdpartyscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/thirdpartyscript.html"}],"onBeforeSendHeaders":[{"url":"http://localhost:60508/thirdpartyscript.html","method":"GET","frameId":66,"parentFrameId":66,"tabId":66,"type":6,"originUrl":"http://localhost:60508/thirdpartyscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/thirdpartyscript.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":66,"parentFrameId":66,"tabId":66,"type":2,"originUrl":"http://localhost:60508/thirdpartyscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/thirdpartyscript.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":66,"parentFrameId":66,"tabId":66,"type":11,"originUrl":"http://localhost:60508/thirdpartyscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/thirdpartyscript.html"}],"onHeadersReceived":[{"url":"http://localhost:60508/thirdpartyscript.html","method":"GET","frameId":66,"parentFrameId":66,"tabId":66,"type":6,"originUrl":"http://localhost:60508/thirdpartyscript.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/thirdpartyscript.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":66,"parentFrameId":66,"tabId":66,"type":2,"originUrl":"http://localhost:60508/thirdpartyscript.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/thirdpartyscript.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":66,"parentFrameId":66,"tabId":66,"type":11,"originUrl":"http://localhost:60508/thirdpartyscript.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/thirdpartyscript.html"}]}
testPages['injectedscript'] = {"onBeforeRequest":[{"url":"http://localhost:60508/injectedscript.html","method":"GET","frameId":69,"parentFrameId":69,"tabId":69,"type":6,"originUrl":"http://localhost:60508/injectedscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/injectedscript.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":69,"parentFrameId":69,"tabId":69,"type":11,"originUrl":"http://localhost:60508/injectedscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/injectedscript.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":69,"parentFrameId":69,"tabId":69,"type":2,"originUrl":"http://localhost:60508/injectedscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/injectedscript.html"}],"onBeforeSendHeaders":[{"url":"http://localhost:60508/injectedscript.html","method":"GET","frameId":69,"parentFrameId":69,"tabId":69,"type":6,"originUrl":"http://localhost:60508/injectedscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/injectedscript.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":69,"parentFrameId":69,"tabId":69,"type":11,"originUrl":"http://localhost:60508/injectedscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/injectedscript.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":69,"parentFrameId":69,"tabId":69,"type":2,"originUrl":"http://localhost:60508/injectedscript.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/injectedscript.html"}],"onHeadersReceived":[{"url":"http://localhost:60508/injectedscript.html","method":"GET","frameId":69,"parentFrameId":69,"tabId":69,"type":6,"originUrl":"http://localhost:60508/injectedscript.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/injectedscript.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":69,"parentFrameId":69,"tabId":69,"type":11,"originUrl":"http://localhost:60508/injectedscript.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/injectedscript.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":69,"parentFrameId":69,"tabId":69,"type":2,"originUrl":"http://localhost:60508/injectedscript.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/injectedscript.html"}]}
testPages['imgtest'] = {"onBeforeRequest":[{"url":"http://localhost:60508/imgtest.html","method":"GET","frameId":72,"parentFrameId":72,"tabId":72,"type":6,"originUrl":"http://localhost:60508/imgtest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/imgtest.html"},{"url":"http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":72,"parentFrameId":72,"tabId":72,"type":3,"originUrl":"http://localhost:60508/imgtest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/imgtest.html"},{"url":"http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":72,"parentFrameId":72,"tabId":72,"type":3,"originUrl":"http://localhost:60508/imgtest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/imgtest.html"}],"onBeforeSendHeaders":[{"url":"http://localhost:60508/imgtest.html","method":"GET","frameId":72,"parentFrameId":72,"tabId":72,"type":6,"originUrl":"http://localhost:60508/imgtest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/imgtest.html"},{"url":"http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":72,"parentFrameId":72,"tabId":72,"type":3,"originUrl":"http://localhost:60508/imgtest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/imgtest.html"},{"url":"http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":72,"parentFrameId":72,"tabId":72,"type":3,"originUrl":"http://localhost:60508/imgtest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/imgtest.html"}],"onHeadersReceived":[{"url":"http://localhost:60508/imgtest.html","method":"GET","frameId":72,"parentFrameId":72,"tabId":72,"type":6,"originUrl":"http://localhost:60508/imgtest.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/imgtest.html"},{"url":"http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":72,"parentFrameId":72,"tabId":72,"type":3,"originUrl":"http://localhost:60508/imgtest.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/imgtest.html"},{"url":"http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":72,"parentFrameId":72,"tabId":72,"type":3,"originUrl":"http://localhost:60508/imgtest.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/imgtest.html"}]}
testPages['crossdomainxhr'] = {"onBeforeRequest":[{"url":"http://localhost:60508/crossdomainxhr.html","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":6,"originUrl":"http://localhost:60508/crossdomainxhr.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/crossdomainxhr.html"},{"url":"http://localhost:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":2,"originUrl":"http://localhost:60508/crossdomainxhr.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/crossdomainxhr.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":11,"originUrl":"http://localhost:60508/crossdomainxhr.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/crossdomainxhr.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":11,"originUrl":"http://localhost:60508/crossdomainxhr.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/crossdomainxhr.html"}],"onBeforeSendHeaders":[{"url":"http://localhost:60508/crossdomainxhr.html","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":6,"originUrl":"http://localhost:60508/crossdomainxhr.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/crossdomainxhr.html"},{"url":"http://localhost:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":2,"originUrl":"http://localhost:60508/crossdomainxhr.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/crossdomainxhr.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":11,"originUrl":"http://localhost:60508/crossdomainxhr.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/crossdomainxhr.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":11,"originUrl":"http://localhost:60508/crossdomainxhr.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/crossdomainxhr.html"}],"onHeadersReceived":[{"url":"http://localhost:60508/crossdomainxhr.html","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":6,"originUrl":"http://localhost:60508/crossdomainxhr.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/crossdomainxhr.html"},{"url":"http://localhost:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":2,"originUrl":"http://localhost:60508/crossdomainxhr.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/crossdomainxhr.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":11,"originUrl":"http://localhost:60508/crossdomainxhr.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/crossdomainxhr.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":75,"parentFrameId":75,"tabId":75,"type":11,"originUrl":"http://localhost:60508/crossdomainxhr.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/crossdomainxhr.html"}]}
testPages['iframetest'] = {"onBeforeRequest":[{"url":"http://localhost:60508/iframetest.html","method":"GET","frameId":78,"parentFrameId":78,"tabId":78,"type":6,"originUrl":"http://localhost:60508/iframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://localhost:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":78,"parentFrameId":78,"tabId":78,"type":2,"originUrl":"http://localhost:60508/iframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://127.0.0.1:60508/iframe.html","method":"GET","frameId":81,"parentFrameId":78,"tabId":78,"type":7,"originUrl":"http://localhost:60508/iframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":78,"parentFrameId":78,"tabId":78,"type":11,"originUrl":"http://localhost:60508/iframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://127.0.0.1:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":81,"parentFrameId":78,"tabId":78,"type":2,"originUrl":"http://127.0.0.1:60508/iframe.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":81,"parentFrameId":78,"tabId":78,"type":11,"originUrl":"http://127.0.0.1:60508/iframe.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"}],"onBeforeSendHeaders":[{"url":"http://localhost:60508/iframetest.html","method":"GET","frameId":78,"parentFrameId":78,"tabId":78,"type":6,"originUrl":"http://localhost:60508/iframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://localhost:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":78,"parentFrameId":78,"tabId":78,"type":2,"originUrl":"http://localhost:60508/iframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://127.0.0.1:60508/iframe.html","method":"GET","frameId":81,"parentFrameId":78,"tabId":78,"type":7,"originUrl":"http://localhost:60508/iframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":78,"parentFrameId":78,"tabId":78,"type":11,"originUrl":"http://localhost:60508/iframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://127.0.0.1:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":81,"parentFrameId":78,"tabId":78,"type":2,"originUrl":"http://127.0.0.1:60508/iframe.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":81,"parentFrameId":78,"tabId":78,"type":11,"originUrl":"http://127.0.0.1:60508/iframe.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"}],"onHeadersReceived":[{"url":"http://localhost:60508/iframetest.html","method":"GET","frameId":78,"parentFrameId":78,"tabId":78,"type":6,"originUrl":"http://localhost:60508/iframetest.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/iframetest.html"},{"url":"http://localhost:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":78,"parentFrameId":78,"tabId":78,"type":2,"originUrl":"http://localhost:60508/iframetest.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/iframetest.html"},{"url":"http://127.0.0.1:60508/iframe.html","method":"GET","frameId":81,"parentFrameId":78,"tabId":78,"type":7,"originUrl":"http://localhost:60508/iframetest.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/iframetest.html"},{"url":"http://127.0.0.1:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":81,"parentFrameId":78,"tabId":78,"type":2,"originUrl":"http://127.0.0.1:60508/iframe.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/iframetest.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":78,"parentFrameId":78,"tabId":78,"type":11,"originUrl":"http://localhost:60508/iframetest.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":81,"parentFrameId":78,"tabId":78,"type":11,"originUrl":"http://127.0.0.1:60508/iframe.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/iframetest.html"}]}
testPages['image302test'] = {"onBeforeRequest":[{"url":"http://localhost:60508/image302test.html","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":6,"originUrl":"http://localhost:60508/image302test.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"},{"url":"http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":3,"originUrl":"http://localhost:60508/image302test.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"},{"url":"http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":3,"originUrl":"http://localhost:60508/image302test.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"}],"onBeforeSendHeaders":[{"url":"http://localhost:60508/image302test.html","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":6,"originUrl":"http://localhost:60508/image302test.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"},{"url":"http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":3,"originUrl":"http://localhost:60508/image302test.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"},{"url":"http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":3,"originUrl":"http://localhost:60508/image302test.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"},{"url":"http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":3,"originUrl":"http://localhost:60508/image302test.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"}],"onHeadersReceived":[{"url":"http://localhost:60508/image302test.html","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":6,"originUrl":"http://localhost:60508/image302test.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"},{"url":"http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":3,"originUrl":"http://localhost:60508/image302test.html","responseStatus":302,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"},{"url":"http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":3,"originUrl":"http://localhost:60508/image302test.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"},{"url":"http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":84,"parentFrameId":84,"tabId":84,"type":3,"originUrl":"http://localhost:60508/image302test.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/image302test.html"}]}
testPages['nestediframetest'] = {"onBeforeRequest":[{"url":"http://localhost:60508/nestediframetest.html","method":"GET","frameId":87,"parentFrameId":87,"tabId":87,"type":6,"originUrl":"http://localhost:60508/nestediframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://localhost:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":87,"parentFrameId":87,"tabId":87,"type":2,"originUrl":"http://localhost:60508/nestediframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://cliqztest.de:60508/proxyiframe.html","method":"GET","frameId":90,"parentFrameId":87,"tabId":87,"type":7,"originUrl":"http://localhost:60508/nestediframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":87,"parentFrameId":87,"tabId":87,"type":11,"originUrl":"http://localhost:60508/nestediframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://cliqztest.de:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":90,"parentFrameId":87,"tabId":87,"type":2,"originUrl":"http://cliqztest.de:60508/proxyiframe.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://127.0.0.1:60508/iframe2.html","method":"GET","frameId":93,"parentFrameId":90,"tabId":87,"type":7,"originUrl":"http://cliqztest.de:60508/proxyiframe.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://127.0.0.1:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":93,"parentFrameId":90,"tabId":87,"type":2,"originUrl":"http://127.0.0.1:60508/iframe2.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":93,"parentFrameId":90,"tabId":87,"type":11,"originUrl":"http://127.0.0.1:60508/iframe2.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"}],"onBeforeSendHeaders":[{"url":"http://localhost:60508/nestediframetest.html","method":"GET","frameId":87,"parentFrameId":87,"tabId":87,"type":6,"originUrl":"http://localhost:60508/nestediframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://localhost:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":87,"parentFrameId":87,"tabId":87,"type":2,"originUrl":"http://localhost:60508/nestediframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://cliqztest.de:60508/proxyiframe.html","method":"GET","frameId":90,"parentFrameId":87,"tabId":87,"type":7,"originUrl":"http://localhost:60508/nestediframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":87,"parentFrameId":87,"tabId":87,"type":11,"originUrl":"http://localhost:60508/nestediframetest.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://cliqztest.de:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":90,"parentFrameId":87,"tabId":87,"type":2,"originUrl":"http://cliqztest.de:60508/proxyiframe.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://127.0.0.1:60508/iframe2.html","method":"GET","frameId":93,"parentFrameId":90,"tabId":87,"type":7,"originUrl":"http://cliqztest.de:60508/proxyiframe.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://127.0.0.1:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":93,"parentFrameId":90,"tabId":87,"type":2,"originUrl":"http://127.0.0.1:60508/iframe2.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":93,"parentFrameId":90,"tabId":87,"type":11,"originUrl":"http://127.0.0.1:60508/iframe2.html","isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"}],"onHeadersReceived":[{"url":"http://localhost:60508/nestediframetest.html","method":"GET","frameId":87,"parentFrameId":87,"tabId":87,"type":6,"originUrl":"http://localhost:60508/nestediframetest.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://localhost:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":87,"parentFrameId":87,"tabId":87,"type":2,"originUrl":"http://localhost:60508/nestediframetest.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://cliqztest.de:60508/proxyiframe.html","method":"GET","frameId":90,"parentFrameId":87,"tabId":87,"type":7,"originUrl":"http://localhost:60508/nestediframetest.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://cliqztest.de:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":90,"parentFrameId":87,"tabId":87,"type":2,"originUrl":"http://cliqztest.de:60508/proxyiframe.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":87,"parentFrameId":87,"tabId":87,"type":11,"originUrl":"http://localhost:60508/nestediframetest.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://127.0.0.1:60508/iframe2.html","method":"GET","frameId":93,"parentFrameId":90,"tabId":87,"type":7,"originUrl":"http://cliqztest.de:60508/proxyiframe.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://127.0.0.1:60508/bower_components/jquery/dist/jquery.js","method":"GET","frameId":93,"parentFrameId":90,"tabId":87,"type":2,"originUrl":"http://127.0.0.1:60508/iframe2.html","responseStatus":200,"isPrivate":false,"isCached":true,"source":"http://localhost:60508/nestediframetest.html"},{"url":"http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134","method":"GET","frameId":93,"parentFrameId":90,"tabId":87,"type":11,"originUrl":"http://127.0.0.1:60508/iframe2.html","responseStatus":200,"isPrivate":false,"isCached":false,"source":"http://localhost:60508/nestediframetest.html"}]}


DEPS.AttrackUnitTest = ["core/utils"];
TESTS.AttrackUnitTest = function(CliqzUtils) {

  // test helpers and mocks

  function mockGetRequestHeader(name) {
    switch (name) {
      case 'Cookie': return "uid=234239gjvbadsfdsaf";
      case 'Referer': return '';
    }
  }

  function mockGetResponseHeader(name) {
    switch (name) {
      case 'Content-Length': return '0';
    }
  }

  function isThirdParty(url) {
    return url.indexOf(THIRD_PARTY_HOST1) > -1 || url.indexOf(THIRD_PARTY_HOST2) > -1;
  }

  function expectNoModification(resp) {
    if (resp.response) {
      chai.expect(resp.response).not.have.property('cancel');
      chai.expect(resp.response).not.have.property('redirectUrl');
      chai.expect(resp.response).not.have.property('requestHeaders');
    } else {
      chai.expect(resp.response).to.be.undefined;
    }
  }

  describe('Test Attrack listeners', function() {
    var System = CliqzUtils.getWindow().CLIQZ.System,
        attrack = System.get('antitracking/attrack').default,
        QSWhitelist = System.get('antitracking/qs-whitelists').default,
        md5 = System.get('antitracking/md5').default,
        datetime = System.get('antitracking/time');

    var initialCookie = true,
        initialQS = true;

    beforeEach(function() {
      // clean, mocked QSWhitelist
      attrack.qs_whitelist = new QSWhitelist();
      attrack.qs_whitelist.isUpToDate = function() { return true };
      attrack.qs_whitelist.isReady = function() { return true };

      initialCookie = CliqzUtils.getPref('attrackBlockCookieTracking');
      initialQS = CliqzUtils.getPref('attrackRemoveQueryStringTracking');
      CliqzUtils.setPref('attrackBlockCookieTracking', false);
      CliqzUtils.setPref('attrackRemoveQueryStringTracking', false);

      attrack.recentlyModified.clear();

    });

    after(function() {
      attrack.tp_events.commit();
      CliqzUtils.setPref('attrackBlockCookieTracking', initialCookie);
      CliqzUtils.setPref('attrackRemoveQueryStringTracking', initialCookie);
    });

    function simulatePageLoad(pageSpec) {
      return {
        onBeforeRequest: pageSpec.onBeforeRequest.map(function(reqData) {
            reqData.getRequestHeader = mockGetRequestHeader;
            var response = attrack.httpopenObserver(reqData);
            return {url: reqData.url, response};
          }),
        onBeforeSendHeaders: pageSpec.onBeforeSendHeaders.map(function(reqData) {
          reqData.getRequestHeader = mockGetRequestHeader;
          var response = attrack.httpmodObserver(reqData);
          return {url: reqData.url, response};
        }),
        onHeadersReceived: pageSpec.onHeadersReceived.map(function(reqData) {
          reqData.getRequestHeader = mockGetRequestHeader;
          reqData.getResponseHeader = mockGetResponseHeader;
          var response = attrack.httpResponseObserver(reqData);
          return {url: reqData.url, response};
        }),
      };
    }

    Object.keys(testPages).forEach(function(testPage) {
      var reqs = testPages[testPage];

      describe(testPage, function() {

        describe('cookie blocking', function() {

          describe('cookie blocking disabled', function() {
            beforeEach(function() {
              CliqzUtils.setPref('attrackBlockCookieTracking', false);
            });

            it('allows all cookies', function() {
              var responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectNoModification);
              responses.onBeforeSendHeaders.forEach(expectNoModification);
            });
          });

          describe('cookie blocking enabled', function() {
            beforeEach(function() {
              CliqzUtils.setPref('attrackBlockCookieTracking', true);
            });

            it('blocks third party cookies', function() {
              var responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectNoModification);
              responses.onBeforeSendHeaders.forEach(function(resp) {
                if (isThirdParty(resp.url))  {
                  chai.expect(resp.response).to.not.be.undefined;
                  chai.expect(resp.response).to.have.property('requestHeaders');
                } else {
                  expectNoModification(resp);
                }
              });
            });

            context('anti-tracking disabled for source domain', function() {

              beforeEach(function() {
                attrack.addSourceDomainToWhitelist('localhost');
              });

              afterEach(function() {
                attrack.removeSourceDomainFromWhitelist('localhost');
              });

              it('allows all cookies on whitelisted site', function() {
                var responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectNoModification);
                responses.onBeforeSendHeaders.forEach(expectNoModification);
              });


            });

            context('anti-tracking disabled for other domain', function() {

              beforeEach(function() {
                attrack.addSourceDomainToWhitelist('cliqztest.de');
              });

              afterEach(function() {
                attrack.removeSourceDomainFromWhitelist('cliqztest.de');
              });

              it('still blocks cookies on other domains', function() {
                var responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectNoModification);
                responses.onBeforeSendHeaders.forEach(function(resp) {
                  if (isThirdParty(resp.url))  {
                    chai.expect(resp.response).to.not.be.undefined;
                    chai.expect(resp.response).to.have.property('requestHeaders');
                  } else {
                    expectNoModification(resp);
                  }
                });
              });
            });
          });

        });

        context('QS blocking', function() {

          beforeEach(function() {
            CliqzUtils.setPref('attrackRemoveQueryStringTracking', true);
          });

          it('allows query strings on domains not in the tracker list', function() {
            var responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectNoModification);
            responses.onBeforeRequest.forEach(expectNoModification);
            responses.onBeforeSendHeaders.forEach(expectNoModification);
          });

          describe('when third party on tracker list', function() {
            var key = md5('uid'),
                tracker_hash = md5('127.0.0.1').substring(0, 16);

            beforeEach(function() {
              attrack.qs_whitelist.addSafeToken(tracker_hash, "");
              attrack.tokenDomainCountThreshold = 2;
              attrack.blockLog.clear();
            });

            it('allows QS first time on tracker', function() {
              var responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectNoModification);
              responses.onBeforeSendHeaders.forEach(expectNoModification);
            });

            context('when domain count exceeded', function() {

              var uid = '04C2EAD03BAB7F5E-2E85855CF4C75134';

              function expectThirdPartyBlock(req) {
                if (isThirdParty(req.url) && req.url.indexOf(uid) > -1) {
                  // request was already redirected
                } else {
                  console.log(req);
                  expectNoModification(req);
                }
              }

              beforeEach(function() {
                attrack.tokenDomainCountThreshold = 0;
              });

              it('blocks long tokens on tracker domain', function() {
                var responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectThirdPartyBlock);
                responses.onBeforeSendHeaders.forEach(function(req) {
                  if (isThirdParty(req.url) && req.url.indexOf(uid) > -1) {
                    // request was already redirected
                  } else {
                    expectNoModification(req);
                  }
                });
              });

              it('does not block if safekey',  function() {
                attrack.qs_whitelist.addSafeKey(tracker_hash, key);

                var responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectNoModification);
                responses.onBeforeSendHeaders.forEach(expectNoModification);
              });

              it('blocks if key listed as unsafe', function() {
                attrack.qs_whitelist.addSafeKey(tracker_hash, key);
                attrack.qs_whitelist.addUnsafeKey(tracker_hash, key);

                var responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectThirdPartyBlock);
                responses.onBeforeSendHeaders.forEach(function(req) {
                  if (isThirdParty(req.url) && req.url.indexOf(uid) > -1) {
                    // request was already redirected
                  } else {
                    expectNoModification(req);
                  }
                });
              });

              it('does not block if whitelisted token', function() {
                var tok = md5(uid);
                attrack.qs_whitelist.addSafeToken(tracker_hash, tok);

                var responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectNoModification);
                responses.onBeforeSendHeaders.forEach(expectNoModification);
              });

              context('anti-tracking disabled for source domain', function() {

                beforeEach(function() {
                  attrack.addSourceDomainToWhitelist('localhost');
                });

                afterEach(function() {
                  attrack.removeSourceDomainFromWhitelist('localhost');
                });

                it('allows all tokens on whitelisted site', function() {
                  var responses = simulatePageLoad(reqs);
                  responses.onBeforeRequest.forEach(expectNoModification);
                  responses.onBeforeSendHeaders.forEach(expectNoModification);
                });
              });
            });
          });
        });
      });
    });

    describe('onBeforeRequest', function() {

        var uid = '04C2EAD03BAB7F5E-2E85855CF4C75134';

        beforeEach(function() {
          CliqzUtils.setPref('attrackRemoveQueryStringTracking', true);
          attrack.qs_whitelist.addSafeToken(md5('tracker.com').substring(0, 16), '');
          attrack.tokenDomainCountThreshold = 0; // block first time
          attrack.initPipeline();
        });

        it('removes all occurances of uid in the request', function() {
          var mainDoc = attrack.httpopenObserver({
              tabId: 34,
              frameId: 34,
              parentFrameId: 34,
              method: 'GET',
              type: 6,
              url: 'http://cliqztest.com/',
              getRequestHeader: mockGetRequestHeader,
              originUrl: '',
              source: '',
            });
          expect(mainDoc).to.not.have.property('cancel');
          expect(mainDoc).to.not.have.property('redirectUrl');
          expect(mainDoc).to.not.have.property('requestHeaders');
          var response = attrack.httpopenObserver({
            tabId: 34,
            frameId: 34,
            parentFrameId: 34,
            method: 'GET',
            type: 11,
            url: 'http://tracker.com/track;uid=' + uid + '?uid2=' + uid + '&encuid=' + encodeURIComponent(uid),
            getRequestHeader: mockGetRequestHeader,
            originUrl: 'http://cliqztest.com',
            source: 'http://cliqztest.com',
            isPrivate: false,
          });
          chai.expect(response).to.have.property('redirectUrl');
          chai.expect(response.redirectUrl).to.not.contain(uid);
          chai.expect(response.redirectUrl).to.not.contain(encodeURIComponent(uid));
        });
      });

  });
};
