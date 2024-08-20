import URLSearchParamsPolyfill from "./searchParams";

if (typeof URL != 'function' || typeof URLSearchParams != "function") {
    polyfillURL();
}

const specialSchemes = {
    ftp: 21,
    file: null,
    http: 80,
    https: 443,
    ws: 80,
    wss: 443
};

function defaultPort(scheme) {
    // scheme should end of ":"
    if (scheme.endsWith(":")) {
        scheme = scheme.slice(0, -1);
    }
    return specialSchemes[scheme];
}

function polyfillURL() {
    globalThis.URLSearchParams = URLSearchParamsPolyfill;

    // https://gist.github.com/ryangoree/def0a520ed43c6c465d9a6518161bc7c
    globalThis.URL = function (url, base) {
        let _hash;
        let _hostname;
        let _password;
        let _pathname;
        let _port;
        let _protocol;
        let _search;
        let _username;

        // Define SymbolTag as URL
        Object.defineProperty(this, Symbol.toStringTag, {
            value: 'URL',
        });

        Object.defineProperty(this, 'hostname', {
            get: function () {
                return _hostname;
            },
            set: function (value) {
                _hostname = value.length > 0 ? encodeURIComponent(value) : _hostname;
                return value;
            }
        });

        Object.defineProperty(this, 'hash', {
            get: function () {
                return _hash;
            },
            set: function (value) {
                _hash = value.length > 0 ? '#' + value.match(/^#*(.*)/)[1] : '';
                return value;
            }
        });

        Object.defineProperty(this, 'host', {
            get: function () {
                return _port.length > 0 ? _hostname + ':' + _port : _hostname;
            },
            set: function (value) {
                let parts = value.split(':');
                this.hostname = parts[0];
                this.port = parts[1];
                return value;
            }
        });

        function removeUsername(match, username, password) {
            if (password === '@') {
                return '';
            } else {
                return password;
            }
        }

        Object.defineProperty(this, 'href', {
            get: function () {
                var hrefStr = _protocol + '//';
                if (_username.length > 0 || _password.length > 0) {
                    if (_username.length > 0) {
                        hrefStr += _username;
                    }
                    if (_password.length > 0) {
                        hrefStr += ':' + _password;
                    }
                    hrefStr += '@'
                }
                hrefStr += _hostname;
                if (_port.length > 0) {
                    hrefStr += ':' + _port;
                }
                let real_search = this.searchParams.toString();
                if (real_search) {
                    // if real_search not contains &, decode real_search
                    if (real_search.indexOf("&") === -1) {
                        real_search = decodeURIComponent(real_search);
                    }
                    real_search = "?" + real_search;
                }
                hrefStr += _pathname + real_search + _hash;
                return hrefStr;
            },
            set: function (value) {

                this.protocol = value;
                value = value.replace(/.*?:\/*/, '');

                var usernameMatch = value.match(/([^:]*).*@/);
                this.username = usernameMatch ? usernameMatch[1] : '';
                value = value.replace(/([^:]*):?(.*@)/, removeUsername);

                var passwordMatch = value.match(/.*(?=@)/);
                this.password = passwordMatch ? passwordMatch[0] : '';
                value = value.replace(/.*@/, '');

                this.hostname = value.match(/[^:/?]*/);

                var portMatch = value.match(/:(\d+)/);
                this.port = portMatch ? portMatch[1] : '';


                var pathnameMatch = value.match(/\/([^?#]*)/);
                this.pathname = pathnameMatch ? pathnameMatch[1] : '';

                var searchMatch = value.match(/\?[^#]*/);
                this.search = searchMatch ? searchMatch[0] : '';

                var hashMatch = value.match(/\#.*/);
                this.hash = hashMatch ? hashMatch[0] : '';
            }
        });

        Object.defineProperty(this, 'origin', {
            get: function () {
                var originStr = _protocol + '//' + _hostname;
                if (_port.length > 0) {
                    originStr += ':' + _port;
                }
                return originStr;
            },
            set: function (value) {

                this.protocol = value;
                value = value.replace(/.*?:\/*/, '');

                this.hostname = value.match(/[^:/?]*/);

                var portMatch = value.match(/:(\d+)/);
                this.port = portMatch ? portMatch[1] : '';
            }
        });

        Object.defineProperty(this, 'password', {
            get: function () {
                return _password;
            },
            set: function (value) {
                _password = encodeURIComponent(value);
                return value;
            }
        });

        Object.defineProperty(this, 'pathname', {
            get: function () {
                return _pathname;
            },
            set: function (value) {
                _pathname = '/' + value.match(/\/?(.*)/)[1];
                return value;
            }
        });

        Object.defineProperty(this, 'port', {
            get: function () {
                return _port;
            },
            set: function (value) {
                if (isNaN(value) || value === '') {
                    _port = '';
                } else {
                    if (defaultPort(_protocol) == value) {
                        _port = '';
                    } else {
                        _port = Math.min(65535, value).toString();
                    }
                }
                return value;
            }
        });

        Object.defineProperty(this, 'protocol', {
            get: function () {
                return _protocol;
            },
            set: function (value) {
                _protocol = value.match(/[^/:]*/)[0] + ':';
                return value;
            }
        });

        Object.defineProperty(this, 'search', {
            get: function () {
                let real_search = _search
                if (this.searchParams) {
                    real_search = this.searchParams.toString();
                    // if real_search is empty, then remove?
                    if (real_search) {
                        real_search = "?" + real_search;
                    }
                }
                return real_search;
            },
            set: function (value) {
                _search = value.length > 0 ? '?' + value.match(/\??(.*)/)[1] : '';
                this.searchParams = new URLSearchParamsPolyfill(_search);
                return value;
            }
        });

        Object.defineProperty(this, 'username', {
            get: function () {
                return _username;
            },
            set: function (value) {
                _username = value;
            }
        });

        // If a string is passed for url instead of location or link, then set the 
        if (typeof url === 'string') {
            if (base instanceof URL) {
                base = base.href;
            }
            var urlIsValid = /^[a-zA-z]+:\/\/.*/.test(url);
            var baseIsValid = /^[a-zA-z]+:\/\/.*/.test(base);

            if (urlIsValid) {
                this.href = url;
            }

            // If the url isn't valid, but the base is, then prepend the base to the url.
            else if (baseIsValid) {
                this.href = base + url;
            }

            // If no valid url or base is given, then throw a type error.
            else {
                throw new TypeError('URL string is not valid. If using a relative url, a second argument needs to be passed representing the base URL. Example: new URL("relative/path", "http://www.example.com");');
            }

        } else {

            // Copy all of the location or link properties to the
            // new URL instance.
            _hash = url.hash;
            _hostname = url.hostname;
            _password = url.password ? url.password : '';
            _pathname = url.pathname;
            _port = url.port;
            _protocol = url.protocol;
            _search = url.search;
            _username = url.username ? url.username : '';

        }

        this.toJSON = function () {
            return this.href;
        }

        this.toString = function () {
            return this.href;
        }

    }
}