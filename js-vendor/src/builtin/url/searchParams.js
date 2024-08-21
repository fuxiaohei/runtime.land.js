/**!
 * url-search-params-polyfill
 *
 * @author Jerry Bendy (https://github.com/jerrybendy)
 * @licence MIT
 * 
 * modify as class definition
 */


function isArray(val) {
    return !!val && '[object Array]' === Object.prototype.toString.call(val);
}

function makeIterator(arr) {
    var iterator = {
        next: function () {
            var value = arr.shift();
            return { done: value === undefined, value: value };
        }
    };
    iterator[Symbol.iterator] = function () {
        return iterator;
    };
    return iterator;
}

function encode(str) {
    var replace = {
        '!': '%21',
        "'": '%27',
        '(': '%28',
        ')': '%29',
        '~': '%7E',
        '%20': '+',
    };
    return encodeURIComponent(str).replace(/[!'\(\)~]|%20/g, function (match) {
        return replace[match];
    });
}

function decode(str) {
    return str
        .replace(/[ +]/g, '%20')
        .replace(/(%[a-f0-9]{2})+/ig, function (match) {
            return decodeURIComponent(match);
        });
}

class URLSearchParamsPolyfill {
    #_params = [];
    #_values = [];

    constructor(search) {
        if (search instanceof URLSearchParamsPolyfill) {
            search = search.toString();
        }
        if (search instanceof FormData) {
            const keys = search.keys();
            for (var key of keys) {
                const values = search.getAll(key);
                if (values) {
                    for (var value of values) {
                        this.#_params.push(String(key));
                        this.#_values.push(String(value));
                    }
                } else {
                    this.#_params.push(String(key));
                    this.#_values.push('');
                }
            }
            return;
        }
        if (typeof search == "object") {
            if (isArray(search)) {
                for (var i = 0; i < search.length; i++) {
                    var item = search[i];
                    if (isArray(item) && item.length === 2) {
                        this.#_params.push(item[0]);
                        this.#_values.push(item[1]);
                    } else {
                        throw new TypeError("Failed to construct 'URLSearchParams': Sequence initializer must only contain pair elements");
                    }
                }
            } else {
                for (var key in search) {
                    if (search.hasOwnProperty(key)) {
                        this.#_params.push(key);
                        this.#_values.push(search[key]);
                    }
                }
            }
            return;
        }
        if (typeof search == "string") {
            // remove first '?'
            if (search.indexOf("?") === 0) {
                search = search.slice(1);
            }

            var pairs = search.split("&");
            for (var j = 0; j < pairs.length; j++) {
                var value = pairs[j],
                    index = value.indexOf('=');
                if (-1 < index) {
                    this.#_params.push(decode(value.slice(0, index)));
                    this.#_values.push(decode(value.slice(index + 1)));
                } else {
                    if (value) {
                        this.#_params.push(decode(value));
                        this.#_values.push('');
                    }
                }
            }
            return
        }
        if (!search) {
            return;
        }
        throw new TypeError("Failed to construct 'URLSearchParams': 1st argument must be a string or a Sequence, or empty");
    }

    get size() {
        return this.#_params.length;
    }

    append(name, value) {
        this.#_params.push(String(name));
        this.#_values.push(String(value));
    }

    delete(name, value) {
        name = String(name);
        const length = this.#_params.length
        for (var i = 0; i < length; i++) {
            if (this.#_params[i] == name) {
                if (typeof value !== 'undefined' && this.#_values[i] != String(value)) {
                    continue;
                }
                this.#_params.splice(i, 1);
                this.#_values.splice(i, 1);
                // because we delete the current item, we need to decrease the index
                i = i - 1;
            }
        }
    }


    entries() {
        let iterator_index = 0;
        var iterator = {
            next: () => {
                var value = this.#_values[iterator_index];
                var name = this.#_params[iterator_index];
                iterator_index++;
                return { done: value === undefined, value: [name, value] };
            },
            [Symbol.iterator]() {
                return this;
            },
        }
        return iterator;
    }

    forEach(callback, thisArg) {
        for (var i = 0; i < this.#_params.length; i++) {
            callback.call(thisArg, this.#_values[i], this.#_params[i], this);
        }
    }

    get(name) {
        for (var i = 0; i < this.#_params.length; i++) {
            if (this.#_params[i] == name) {
                return this.#_values[i];
            }
        }
        return null;
    }

    getAll(name) {
        var values = [];
        for (var i = 0; i < this.#_params.length; i++) {
            if (this.#_params[i] == name) {
                values.push(this.#_values[i]);
            }
        }
        return values;
    }

    has(name, value) {
        name = String(name);
        for (var i = 0; i < this.#_params.length; i++) {
            if (this.#_params[i] == name) {
                if (typeof value !== 'undefined' && this.#_values[i] != String(value)) {
                    continue;
                }
                return true;
            }
        }
        return false;
    }

    keys() {
        return makeIterator(this.#_params);
    }

    set(name, value) {
        this.delete(name);
        this.append(name, value);
    }

    sort() {
        let sequence = this.#_params.map((item, index) => [item, index]);
        sequence.sort((a, b) => {
            if (a[0] == b[0]) {
                return 0;
            }
            return a[0] > b[0] ? 1 : -1;
        });
        let params = [];
        let values = [];
        for (var i = 0; i < sequence.length; i++) {
            params.push(this.#_params[sequence[i][1]]);
            values.push(this.#_values[sequence[i][1]]);
        }
        this.#_params = params;
        this.#_values = values;
    }

    toString() {
        var pairs = [];
        for (var i = 0; i < this.#_params.length; i++) {
            var value = this.#_values[i];
            pairs.push(encode(this.#_params[i]) + '=' + encode(value));
        }
        return pairs.join('&');
    }

    values() {
        return makeIterator(this.#_values);
    }

}

const stringTag = globalThis.Symbol && Symbol.toStringTag;
if (stringTag) {
    URLSearchParamsPolyfill.prototype[stringTag] = 'URLSearchParams'
}

URLSearchParamsPolyfill.prototype[Symbol.iterator] = URLSearchParamsPolyfill.prototype.entries;

export default URLSearchParamsPolyfill;
