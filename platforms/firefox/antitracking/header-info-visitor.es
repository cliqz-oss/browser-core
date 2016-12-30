const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

function HeaderInfoVisitor(oHttp) {
    this.oHttp = oHttp;
    this.headers = new Array();
}

HeaderInfoVisitor.prototype = {
    extractPostData : function(visitor, oHttp) {
        function postData(stream) {
            // Scriptable Stream Constants
            this.seekablestream = stream;
            this.stream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
            this.stream.init(this.seekablestream);

            // Check if the stream has headers
            this.hasheaders = false;
            this.body = 0;
            this.isBinary = true;
            if (this.seekablestream instanceof Ci.nsIMIMEInputStream) {
                this.seekablestream.QueryInterface(Ci.nsIMIMEInputStream);
                this.hasheaders = true;
                this.body = -1; // Must read header to find body
                this.isBinary = false;
            } else if (this.seekablestream instanceof Ci.nsIStringInputStream) {
                this.seekablestream.QueryInterface(Ci.nsIStringInputStream);
                this.hasheaders = true;
                this.body = -1; // Must read header to find body
            }
        }

        postData.prototype = {
            rewind: function() {
                this.seekablestream.seek(0,0);
            },
            tell: function() {
                return this.seekablestream.tell();
            },
            readLine: function() {
                var line = "";
                var size = this.stream.available();
                for (var i = 0; i < size; i++) {
                    var c = this.stream.read(1);
                    if (c == '\r') {
                    } else if (c == '\n') {
                        break;
                    } else {
                        line += c;
                    }
                }
                return line;
            },

            // visitor can be null, function has side-effect of setting body
            visitPostHeaders: function(visitor) {
                if (this.hasheaders) {
                    this.rewind();
                    var line = this.readLine();
                    while(line) {
                        if (visitor) {
                            var tmp = line.match(/^([^:]+):\s?(.*)/);
                            // match can return null...
                            if (tmp) {
                                visitor.visitPostHeader(tmp[1], tmp[2]);
                                // if we get a tricky content type, then we are binary
                                // e.g. Content-Type=multipart/form-data; boundary=---------------------------41184676334
                                if (!this.isBinary && tmp[1].toLowerCase() == "content-type" && tmp[2].indexOf("multipart") != "-1") {
                                    this.isBinary = true;
                                }
                            } else {
                                visitor.visitPostHeader(line, "");
                            }
                        }
                        line = this.readLine();
                    }
                    this.body = this.tell();
                }
            },

            getPostBody: function(visitor) {
                // Position the stream to the start of the body
                if (this.body < 0 || this.seekablestream.tell() != this.body) {
                    this.visitPostHeaders(visitor);
                }

                var size = this.stream.available();
                if (size == 0 && this.body != 0) {
                    // whoops, there weren't really headers..
                    this.rewind();
                    visitor.clearPostHeaders();
                    this.hasheaders = false;
                    this.isBinary   = false;
                    size = this.stream.available();
                }
                var postString = "";
                try {
                    // This is to avoid 'NS_BASE_STREAM_CLOSED' exception that may occurs
                    // See bug #188328.
                    for (var i = 0; i < size; i++) {
                        var c = this.stream.read(1);
                        c ? postString += c : postString+='\0';
                    }
                } catch (ex) {
                    return "" + ex;
                } finally {
                    this.rewind();
                }
                // strip off trailing \r\n's
                while (postString.indexOf("\r\n") == (postString.length - 2)) {
                    postString = postString.substring(0, postString.length - 2);
                }
                return postString;
            }
        };

        // Get the postData stream from the Http Object
        try {
            // Must change HttpChannel to UploadChannel to be able to access post data
            oHttp.QueryInterface(Components.interfaces.nsIUploadChannel);
            // Get the post data stream
            if (oHttp.uploadStream) {
                // Must change to SeekableStream to be able to rewind
                oHttp.uploadStream.QueryInterface(Components.interfaces.nsISeekableStream);
                // And return a postData object
                return new postData(oHttp.uploadStream);
            }
        } catch (e) {
            return "crap";
        }
        return null;
    },
    visitPostHeader : function(name, value) {
        if (!this.postBodyHeaders) {
            this.postBodyHeaders = {};
        }
        this.postBodyHeaders[name] = value;
    },

    clearPostHeaders : function() {
        if (this.postBodyHeaders) {
            delete this.postBodyHeaders;
        }
    },
    visitRequest : function () {
        this.headers = {};
        this.oHttp.visitRequestHeaders(this);

        // There may be post data in the request
        var postData = this.extractPostData(this, this.oHttp);
        if (postData) {
            var postBody = postData.getPostBody(this);
            if (postBody !== null) {
                this.postBody = {body : postBody, binary : postData.isBinary};
            }
        }
        return this.headers;
    },
    getPostData : function() {
        return this.postBody ? this.postBody : null;
    },
    getPostBodyHeaders : function() {
        return this.postBodyHeaders ? this.postBodyHeaders : null;
    },
    visitHeader: function(name, value) {
        if (value.length >= 8 && name != 'Cookie' &&
            name != 'Host' && name != 'User-Agent' && name.indexOf('Accept') !== 0 &&
            name != 'Origin' && name != 'Connection') {
            // cookie is handled seperately, host is in the request,
            // we can change the user-agent if needed
            this.headers[name] = value;
        }
    }
};

export default HeaderInfoVisitor;
