(function(root) {

    // Use polyfill for setImmediate for performance gains
    var asap = (typeof setImmediate === 'function' && setImmediate) ||
        function(fn) { setTimeout(fn, 1); };

    // Polyfill for Function.prototype.bind
    function bind(fn, thisArg) {
        return function() {
            fn.apply(thisArg, arguments);
        }
    }

    var isArray = Array.isArray || function(value) { return Object.prototype.toString.call(value) === "[object Array]" };

    function Promise(fn) {
        if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
        if (typeof fn !== 'function') throw new TypeError('not a function');
        this._state = null;
        this._value = null;
        this._deferreds = []

        doResolve(fn, bind(resolve, this), bind(reject, this))
    }

    function handle(deferred) {
        var me = this;
        if (this._state === null) {
            this._deferreds.push(deferred);
            return
        }
        asap(function() {
            var cb = me._state ? deferred.onFulfilled : deferred.onRejected
            if (cb === null) {
                (me._state ? deferred.resolve : deferred.reject)(me._value);
                return;
            }
            var ret;
            try {
                ret = cb(me._value);
            }
            catch (e) {
                deferred.reject(e);
                return;
            }
            deferred.resolve(ret);
        })
    }

    function resolve(newValue) {
        try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
            if (newValue === this) throw new TypeError('A promise cannot be resolved with itself.');
            if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
                var then = newValue.then;
                if (typeof then === 'function') {
                    doResolve(bind(then, newValue), bind(resolve, this), bind(reject, this));
                    return;
                }
            }
            this._state = true;
            this._value = newValue;
            finale.call(this);
        } catch (e) { reject.call(this, e); }
    }

    function reject(newValue) {
        this._state = false;
        this._value = newValue;
        finale.call(this);
    }

    function finale() {
        for (var i = 0, len = this._deferreds.length; i < len; i++) {
            handle.call(this, this._deferreds[i]);
        }
        this._deferreds = null;
    }

    function Handler(onFulfilled, onRejected, resolve, reject){
        this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
        this.onRejected = typeof onRejected === 'function' ? onRejected : null;
        this.resolve = resolve;
        this.reject = reject;
    }

    /**
     * Take a potentially misbehaving resolver function and make sure
     * onFulfilled and onRejected are only called once.
     *
     * Makes no guarantees about asynchrony.
     */
    function doResolve(fn, onFulfilled, onRejected) {
        var done = false;
        try {
            fn(function (value) {
                if (done) return;
                done = true;
                onFulfilled(value);
            }, function (reason) {
                if (done) return;
                done = true;
                onRejected(reason);
            })
        } catch (ex) {
            if (done) return;
            done = true;
            onRejected(ex);
        }
    }

    Promise.prototype['catch'] = function (onRejected) {
        return this.then(null, onRejected);
    };

    Promise.prototype.then = function(onFulfilled, onRejected) {
        var me = this;
        return new Promise(function(resolve, reject) {
            handle.call(me, new Handler(onFulfilled, onRejected, resolve, reject));
        })
    };

    Promise.all = function () {
        var args = Array.prototype.slice.call(arguments.length === 1 && isArray(arguments[0]) ? arguments[0] : arguments);

        return new Promise(function (resolve, reject) {
            if (args.length === 0) return resolve([]);
            var remaining = args.length;
            function res(i, val) {
                try {
                    if (val && (typeof val === 'object' || typeof val === 'function')) {
                        var then = val.then;
                        if (typeof then === 'function') {
                            then.call(val, function (val) { res(i, val) }, reject);
                            return;
                        }
                    }
                    args[i] = val;
                    if (--remaining === 0) {
                        resolve(args);
                    }
                } catch (ex) {
                    reject(ex);
                }
            }
            for (var i = 0; i < args.length; i++) {
                res(i, args[i]);
            }
        });
    };

    Promise.resolve = function (value) {
        if (value && typeof value === 'object' && value.constructor === Promise) {
            return value;
        }

        return new Promise(function (resolve) {
            resolve(value);
        });
    };

    Promise.reject = function (value) {
        return new Promise(function (resolve, reject) {
            reject(value);
        });
    };

    Promise.race = function (values) {
        return new Promise(function (resolve, reject) {
            for(var i = 0, len = values.length; i < len; i++) {
                values[i].then(resolve, reject);
            }
        });
    };

    /**
     * Set the immediate function to execute callbacks
     * @param fn {function} Function to execute
     * @private
     */
    Promise._setImmediateFn = function _setImmediateFn(fn) {
        asap = fn;
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Promise;
    } else if (!root.Promise) {
        root.Promise = Promise;
    }

})(this);


(function(exports) {

'use strict';

var headEl = document.getElementsByTagName('head')[0],
    ie = /MSIE/.test(navigator.userAgent),
    assetMap = {};

/*
  normalizeName() is inspired by Ember's loader:
  https://github.com/emberjs/ember.js/blob/0591740685ee2c444f2cfdbcebad0bebd89d1303/packages/loader/lib/main.js#L39-L53
 */
function normalizeName(child, parentBase) {
    if (child.charAt(0) === '/') {
        child = child.slice(1);
    }
    if (child.charAt(0) !== '.') {
        return child;
    }
    var parts = child.split('/');
    while (parts[0] === '.' || parts[0] === '..') {
        if (parts.shift() === '..') {
            parentBase.pop();
        }
    }
    return parentBase.concat(parts).join('/');
}

var seen = Object.create(null);
var internalRegistry = Object.create(null);
var externalRegistry = Object.create(null);
var anonymousEntry;

function ensuredExecute(name) {
    var mod = internalRegistry[name];
    if (mod && !seen[name]) {
        seen[name] = true;
        // one time operation to execute the module body
        mod.execute();
    }
    return mod && mod.proxy;
}

function set(name, values) {
    externalRegistry[name] = values;
}

function get(name) {
    return externalRegistry[name] || ensuredExecute(name);
}

function has(name) {
    return !!externalRegistry[name] || !!internalRegistry[name];
}

function createScriptNode(src, callback) {
    var node = document.createElement('script');
    // use async=false for ordered async?
    // parallel-load-serial-execute http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order
    if (node.async) {
        node.async = false;
    }
    if (ie) {
        node.onreadystatechange = function() {
            if (/loaded|complete/.test(this.readyState)) {
                this.onreadystatechange = null;
                callback();
            }
        };
    } else {
        node.onload = node.onerror = callback;
    }
    node.setAttribute('src', src);
    headEl.appendChild(node);
}

function loadAssetMap(){
  return new Promise(function(resolve, reject) {
    if(assetMap){
      resolve();
      return;
    }

    var req = new XMLHttpRequest();
    req.open('GET', 'assets/assetMap.json?r=' + Math.random(), false);
    req.overrideMimeType && req.overrideMimeType('application/json');
    req.onload = function () {
        if(req.status === 200) {
          assetMap = JSON.parse(req.response).assets;
        } else if (req.status === 404) {
          // no asset rewrite during development, thus not asset map
          assetMap = {};
          CliqzUtils.log('failed loading assetMap: 404', 'system-polyfill');
        }
        resolve();
    }
    try {
      req.send();
    } catch (e) {
      assetMap = {};
      resolve();
      CliqzUtils.log('failed loading assetMap ' + e, 'system-polyfill');
    }
  });
}

function resolveSrc(src){
  return assetMap[src] || src;
}

function load(name) {
    return new Promise(function(resolve, reject) {
        loadAssetMap().then(function () {
            var src = resolveSrc((System.baseURL || '/') + name + '.js');
            createScriptNode(src, function(err) {
                if (anonymousEntry) {
                    System.register(name, anonymousEntry[0], anonymousEntry[1]);
                    anonymousEntry = undefined;
                }
                var mod = internalRegistry[name];
                if (!mod) {
                    reject(new Error('Error loading module ' + name));
                    return;
                }
                Promise.all(mod.deps.map(function (dep) {
                    if (externalRegistry[dep] || internalRegistry[dep]) {
                        return Promise.resolve();
                    }
                    return load(dep);
                })).then(resolve, reject);
            });
        });
    });
}


var System = {
    set: set,
    get: get,
    has: has,
    import: function(name) {
        return new Promise(function(resolve, reject) {
            var normalizedName = normalizeName(name, []);
            var mod = get(normalizedName);
            return mod ? resolve(mod) : load(name).then(function () {
                resolve(get(normalizedName));
            }).catch(function(error) {
                reject(error)
            });
        });
    },
    register: function(name, deps, wrapper) {
        if (Array.isArray(name)) {
            // anounymous module
            anonymousEntry = [];
            anonymousEntry.push.apply(anonymousEntry, arguments);
            return; // breaking to let the script tag to name it.
        }
        var proxy = Object.create(null),
            values = Object.create(null),
            mod, meta;
        // creating a new entry in the internal registry
        internalRegistry[name] = mod = {
            // live bindings
            proxy: proxy,
            // exported values
            values: values,
            // normalized deps
            deps: deps.map(function(dep) {
                return normalizeName(dep, name.split('/').slice(0, -1));
            }),
            // other modules that depends on this so we can push updates into those modules
            dependants: [],
            // method used to push updates of deps into the module body
            update: function(moduleName, moduleObj) {
                meta.setters[mod.deps.indexOf(moduleName)](moduleObj);
            },
            execute: function() {
                mod.deps.map(function(dep) {
                    var imports = externalRegistry[dep];
                    if (imports) {
                        mod.update(dep, imports);
                    } else {
                        imports = get(dep) && internalRegistry[dep].values; // optimization to pass plain values instead of bindings
                        if (imports) {
                            internalRegistry[dep].dependants.push(name);
                            mod.update(dep, imports);
                        }
                    }
                });
                meta.execute();
            }
        };
        // collecting execute() and setters[]
        meta = wrapper(function(identifier, value) {
            values[identifier] = value;
            mod.lock = true; // locking down the updates on the module to avoid infinite loop
            mod.dependants.forEach(function(moduleName) {
                if (internalRegistry[moduleName] && !internalRegistry[moduleName].lock) {
                    internalRegistry[moduleName].update(name, values);
                }
            });
            mod.lock = false;
            if (!Object.getOwnPropertyDescriptor(proxy, identifier)) {
                Object.defineProperty(proxy, identifier, {
                    enumerable: true,
                    get: function() {
                        return values[identifier];
                    }
                });
            }
            return value;
        });
    }
};

// exporting the System object
exports.System = System;

})(window);
