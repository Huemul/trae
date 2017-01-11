/**
 * Trae, the fetch library!
 *
 * @version: 1.0.1
 * @authors: gillchristian <gillchristiang@gmail.com> | ndelvalle <nicolas.delvalle@gmail.com>
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define('trae', factory) :
	(global.trae = factory());
}(this, (function () { 'use strict';

(function (self) {
  'use strict';

  if (self.fetch) {
    return;
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && function () {
      try {
        new Blob();
        return true;
      } catch (e) {
        return false;
      }
    }(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  };

  if (support.arrayBuffer) {
    var viewClasses = ['[object Int8Array]', '[object Uint8Array]', '[object Uint8ClampedArray]', '[object Int16Array]', '[object Uint16Array]', '[object Int32Array]', '[object Uint32Array]', '[object Float32Array]', '[object Float64Array]'];

    var isDataView = function isDataView(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj);
    };

    var isArrayBufferView = ArrayBuffer.isView || function (obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1;
    };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name');
    }
    return name.toLowerCase();
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value;
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function next() {
        var value = items.shift();
        return { done: value === undefined, value: value };
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function () {
        return iterator;
      };
    }

    return iterator;
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function (value, name) {
        this.append(name, value);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function (name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function (name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ',' + value : value;
  };

  Headers.prototype['delete'] = function (name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function (name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null;
  };

  Headers.prototype.has = function (name) {
    return this.map.hasOwnProperty(normalizeName(name));
  };

  Headers.prototype.set = function (name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function (callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };

  Headers.prototype.keys = function () {
    var items = [];
    this.forEach(function (value, name) {
      items.push(name);
    });
    return iteratorFor(items);
  };

  Headers.prototype.values = function () {
    var items = [];
    this.forEach(function (value) {
      items.push(value);
    });
    return iteratorFor(items);
  };

  Headers.prototype.entries = function () {
    var items = [];
    this.forEach(function (value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items);
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'));
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function (resolve, reject) {
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(reader.error);
      };
    });
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise;
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise;
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('');
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0);
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer;
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function (body) {
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        throw new Error('unsupported BodyInit type');
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function () {
        var rejected = consumed(this);
        if (rejected) {
          return rejected;
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob);
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]));
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob');
        } else {
          return Promise.resolve(new Blob([this._bodyText]));
        }
      };

      this.arrayBuffer = function () {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer);
        } else {
          return this.blob().then(readBlobAsArrayBuffer);
        }
      };
    }

    this.text = function () {
      var rejected = consumed(this);
      if (rejected) {
        return rejected;
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob);
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer));
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text');
      } else {
        return Promise.resolve(this._bodyText);
      }
    };

    if (support.formData) {
      this.formData = function () {
        return this.text().then(decode);
      };
    }

    this.json = function () {
      return this.text().then(JSON.parse);
    };

    return this;
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method;
  }

  function Request(input, options) {
    options = options || {};
    var body = options.body;

    if (typeof input === 'string') {
      this.url = input;
    } else {
      if (input.bodyUsed) {
        throw new TypeError('Already read');
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    }

    this.credentials = options.credentials || this.credentials || 'omit';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests');
    }
    this._initBody(body);
  }

  Request.prototype.clone = function () {
    return new Request(this, { body: this._bodyInit });
  };

  function decode(body) {
    var form = new FormData();
    body.trim().split('&').forEach(function (bytes) {
      if (bytes) {
        var split = bytes.split('=');
        var name = split.shift().replace(/\+/g, ' ');
        var value = split.join('=').replace(/\+/g, ' ');
        form.append(decodeURIComponent(name), decodeURIComponent(value));
      }
    });
    return form;
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    rawHeaders.split('\r\n').forEach(function (line) {
      var parts = line.split(':');
      var key = parts.shift().trim();
      if (key) {
        var value = parts.join(':').trim();
        headers.append(key, value);
      }
    });
    return headers;
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = 'status' in options ? options.status : 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = 'statusText' in options ? options.statusText : 'OK';
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function () {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    });
  };

  Response.error = function () {
    var response = new Response(null, { status: 0, statusText: '' });
    response.type = 'error';
    return response;
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function (url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code');
    }

    return new Response(null, { status: status, headers: { location: url } });
  };

  self.Headers = Headers;
  self.Request = Request;
  self.Response = Response;

  self.fetch = function (input, init) {
    return new Promise(function (resolve, reject) {
      var request = new Request(input, init);
      var xhr = new XMLHttpRequest();

      xhr.onload = function () {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options));
      };

      xhr.onerror = function () {
        reject(new TypeError('Network request failed'));
      };

      xhr.ontimeout = function () {
        reject(new TypeError('Network request failed'));
      };

      xhr.open(request.method, request.url, true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob';
      }

      request.headers.forEach(function (value, name) {
        xhr.setRequestHeader(name, value);
      });

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    });
  };
  self.fetch.polyfill = true;
})(typeof self !== 'undefined' ? self : global);

// the whatwg-fetch polyfill installs the fetch() function
// on the global object (window or self)
//
// Return that as the export for use in Webpack, Browserify etc.

var fetchNpmBrowserify = self.fetch.bind(self);

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var utils$1 = createCommonjsModule(function (module, exports) {
    'use strict';

    var has = Object.prototype.hasOwnProperty;

    var hexTable = function () {
        var array = [];
        for (var i = 0; i < 256; ++i) {
            array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
        }

        return array;
    }();

    exports.arrayToObject = function (source, options) {
        var obj = options && options.plainObjects ? Object.create(null) : {};
        for (var i = 0; i < source.length; ++i) {
            if (typeof source[i] !== 'undefined') {
                obj[i] = source[i];
            }
        }

        return obj;
    };

    exports.merge = function (target, source, options) {
        if (!source) {
            return target;
        }

        if ((typeof source === 'undefined' ? 'undefined' : _typeof(source)) !== 'object') {
            if (Array.isArray(target)) {
                target.push(source);
            } else if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object') {
                target[source] = true;
            } else {
                return [target, source];
            }

            return target;
        }

        if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) !== 'object') {
            return [target].concat(source);
        }

        var mergeTarget = target;
        if (Array.isArray(target) && !Array.isArray(source)) {
            mergeTarget = exports.arrayToObject(target, options);
        }

        if (Array.isArray(target) && Array.isArray(source)) {
            source.forEach(function (item, i) {
                if (has.call(target, i)) {
                    if (target[i] && _typeof(target[i]) === 'object') {
                        target[i] = exports.merge(target[i], item, options);
                    } else {
                        target.push(item);
                    }
                } else {
                    target[i] = item;
                }
            });
            return target;
        }

        return Object.keys(source).reduce(function (acc, key) {
            var value = source[key];

            if (Object.prototype.hasOwnProperty.call(acc, key)) {
                acc[key] = exports.merge(acc[key], value, options);
            } else {
                acc[key] = value;
            }
            return acc;
        }, mergeTarget);
    };

    exports.decode = function (str) {
        try {
            return decodeURIComponent(str.replace(/\+/g, ' '));
        } catch (e) {
            return str;
        }
    };

    exports.encode = function (str) {
        // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
        // It has been adapted here for stricter adherence to RFC 3986
        if (str.length === 0) {
            return str;
        }

        var string = typeof str === 'string' ? str : String(str);

        var out = '';
        for (var i = 0; i < string.length; ++i) {
            var c = string.charCodeAt(i);

            if (c === 0x2D || // -
            c === 0x2E || // .
            c === 0x5F || // _
            c === 0x7E || // ~
            c >= 0x30 && c <= 0x39 || // 0-9
            c >= 0x41 && c <= 0x5A || // a-z
            c >= 0x61 && c <= 0x7A // A-Z
            ) {
                    out += string.charAt(i);
                    continue;
                }

            if (c < 0x80) {
                out = out + hexTable[c];
                continue;
            }

            if (c < 0x800) {
                out = out + (hexTable[0xC0 | c >> 6] + hexTable[0x80 | c & 0x3F]);
                continue;
            }

            if (c < 0xD800 || c >= 0xE000) {
                out = out + (hexTable[0xE0 | c >> 12] + hexTable[0x80 | c >> 6 & 0x3F] + hexTable[0x80 | c & 0x3F]);
                continue;
            }

            i += 1;
            c = 0x10000 + ((c & 0x3FF) << 10 | string.charCodeAt(i) & 0x3FF);
            out += hexTable[0xF0 | c >> 18] + hexTable[0x80 | c >> 12 & 0x3F] + hexTable[0x80 | c >> 6 & 0x3F] + hexTable[0x80 | c & 0x3F];
        }

        return out;
    };

    exports.compact = function (obj, references) {
        if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object' || obj === null) {
            return obj;
        }

        var refs = references || [];
        var lookup = refs.indexOf(obj);
        if (lookup !== -1) {
            return refs[lookup];
        }

        refs.push(obj);

        if (Array.isArray(obj)) {
            var compacted = [];

            for (var i = 0; i < obj.length; ++i) {
                if (obj[i] && _typeof(obj[i]) === 'object') {
                    compacted.push(exports.compact(obj[i], refs));
                } else if (typeof obj[i] !== 'undefined') {
                    compacted.push(obj[i]);
                }
            }

            return compacted;
        }

        var keys = Object.keys(obj);
        keys.forEach(function (key) {
            obj[key] = exports.compact(obj[key], refs);
        });

        return obj;
    };

    exports.isRegExp = function (obj) {
        return Object.prototype.toString.call(obj) === '[object RegExp]';
    };

    exports.isBuffer = function (obj) {
        if (obj === null || typeof obj === 'undefined') {
            return false;
        }

        return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
    };
});

var replace = String.prototype.replace;
var percentTwenties = /%20/g;

var formats$2 = {
    'default': 'RFC3986',
    formatters: {
        RFC1738: function RFC1738(value) {
            return replace.call(value, percentTwenties, '+');
        },
        RFC3986: function RFC3986(value) {
            return value;
        }
    },
    RFC1738: 'RFC1738',
    RFC3986: 'RFC3986'
};

var utils = utils$1;
var formats$1 = formats$2;

var arrayPrefixGenerators = {
    brackets: function brackets(prefix) {
        return prefix + '[]';
    },
    indices: function indices(prefix, key) {
        return prefix + '[' + key + ']';
    },
    repeat: function repeat(prefix) {
        return prefix;
    }
};

var toISO = Date.prototype.toISOString;

var defaults$$1 = {
    delimiter: '&',
    encode: true,
    encoder: utils.encode,
    serializeDate: function serializeDate(date) {
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

var stringify$1 = function stringify(object, prefix, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter) {
    var obj = object;
    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = serializeDate(obj);
    } else if (obj === null) {
        if (strictNullHandling) {
            return encoder ? encoder(prefix) : prefix;
        }

        obj = '';
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || utils.isBuffer(obj)) {
        if (encoder) {
            return [formatter(encoder(prefix)) + '=' + formatter(encoder(obj))];
        }
        return [formatter(prefix) + '=' + formatter(String(obj))];
    }

    var values = [];

    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys;
    if (Array.isArray(filter)) {
        objKeys = filter;
    } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        if (Array.isArray(obj)) {
            values = values.concat(stringify(obj[key], generateArrayPrefix(prefix, key), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter));
        } else {
            values = values.concat(stringify(obj[key], prefix + (allowDots ? '.' + key : '[' + key + ']'), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter));
        }
    }

    return values;
};

var stringify_1 = function stringify_1(object, opts) {
    var obj = object;
    var options = opts || {};
    var delimiter = typeof options.delimiter === 'undefined' ? defaults$$1.delimiter : options.delimiter;
    var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults$$1.strictNullHandling;
    var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults$$1.skipNulls;
    var encode = typeof options.encode === 'boolean' ? options.encode : defaults$$1.encode;
    var encoder = encode ? typeof options.encoder === 'function' ? options.encoder : defaults$$1.encoder : null;
    var sort = typeof options.sort === 'function' ? options.sort : null;
    var allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots;
    var serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults$$1.serializeDate;
    if (typeof options.format === 'undefined') {
        options.format = formats$1.default;
    } else if (!Object.prototype.hasOwnProperty.call(formats$1.formatters, options.format)) {
        throw new TypeError('Unknown format option provided.');
    }
    var formatter = formats$1.formatters[options.format];
    var objKeys;
    var filter;

    if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    } else if (Array.isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
    }

    var keys = [];

    if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object' || obj === null) {
        return '';
    }

    var arrayFormat;
    if (options.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
    } else if ('indices' in options) {
        arrayFormat = options.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = 'indices';
    }

    var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (sort) {
        objKeys.sort(sort);
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        keys = keys.concat(stringify$1(obj[key], key, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter));
    }

    return keys.join(delimiter);
};

var utils$3 = utils$1;

var has = Object.prototype.hasOwnProperty;

var defaults$2 = {
    allowDots: false,
    allowPrototypes: false,
    arrayLimit: 20,
    decoder: utils$3.decode,
    delimiter: '&',
    depth: 5,
    parameterLimit: 1000,
    plainObjects: false,
    strictNullHandling: false
};

var parseValues = function parseValues(str, options) {
    var obj = {};
    var parts = str.split(options.delimiter, options.parameterLimit === Infinity ? undefined : options.parameterLimit);

    for (var i = 0; i < parts.length; ++i) {
        var part = parts[i];
        var pos = part.indexOf(']=') === -1 ? part.indexOf('=') : part.indexOf(']=') + 1;

        var key, val;
        if (pos === -1) {
            key = options.decoder(part);
            val = options.strictNullHandling ? null : '';
        } else {
            key = options.decoder(part.slice(0, pos));
            val = options.decoder(part.slice(pos + 1));
        }
        if (has.call(obj, key)) {
            obj[key] = [].concat(obj[key]).concat(val);
        } else {
            obj[key] = val;
        }
    }

    return obj;
};

var parseObject = function parseObject(chain, val, options) {
    if (!chain.length) {
        return val;
    }

    var root = chain.shift();

    var obj;
    if (root === '[]') {
        obj = [];
        obj = obj.concat(parseObject(chain, val, options));
    } else {
        obj = options.plainObjects ? Object.create(null) : {};
        var cleanRoot = root[0] === '[' && root[root.length - 1] === ']' ? root.slice(1, root.length - 1) : root;
        var index = parseInt(cleanRoot, 10);
        if (!isNaN(index) && root !== cleanRoot && String(index) === cleanRoot && index >= 0 && options.parseArrays && index <= options.arrayLimit) {
            obj = [];
            obj[index] = parseObject(chain, val, options);
        } else {
            obj[cleanRoot] = parseObject(chain, val, options);
        }
    }

    return obj;
};

var parseKeys = function parseKeys(givenKey, val, options) {
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    var key = options.allowDots ? givenKey.replace(/\.([^\.\[]+)/g, '[$1]') : givenKey;

    // The regex chunks

    var parent = /^([^\[\]]*)/;
    var child = /(\[[^\[\]]*\])/g;

    // Get the parent

    var segment = parent.exec(key);

    // Stash the parent if it exists

    var keys = [];
    if (segment[1]) {
        // If we aren't using plain objects, optionally prefix keys
        // that would overwrite object prototype properties
        if (!options.plainObjects && has.call(Object.prototype, segment[1])) {
            if (!options.allowPrototypes) {
                return;
            }
        }

        keys.push(segment[1]);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;
    while ((segment = child.exec(key)) !== null && i < options.depth) {
        i += 1;
        if (!options.plainObjects && has.call(Object.prototype, segment[1].replace(/\[|\]/g, ''))) {
            if (!options.allowPrototypes) {
                continue;
            }
        }
        keys.push(segment[1]);
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push('[' + key.slice(segment.index) + ']');
    }

    return parseObject(keys, val, options);
};

var parse$1 = function parse(str, opts) {
    var options = opts || {};

    if (options.decoder !== null && options.decoder !== undefined && typeof options.decoder !== 'function') {
        throw new TypeError('Decoder has to be a function.');
    }

    options.delimiter = typeof options.delimiter === 'string' || utils$3.isRegExp(options.delimiter) ? options.delimiter : defaults$2.delimiter;
    options.depth = typeof options.depth === 'number' ? options.depth : defaults$2.depth;
    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : defaults$2.arrayLimit;
    options.parseArrays = options.parseArrays !== false;
    options.decoder = typeof options.decoder === 'function' ? options.decoder : defaults$2.decoder;
    options.allowDots = typeof options.allowDots === 'boolean' ? options.allowDots : defaults$2.allowDots;
    options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : defaults$2.plainObjects;
    options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : defaults$2.allowPrototypes;
    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : defaults$2.parameterLimit;
    options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults$2.strictNullHandling;

    if (str === '' || str === null || typeof str === 'undefined') {
        return options.plainObjects ? Object.create(null) : {};
    }

    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
    var obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    var keys = Object.keys(tempObj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var newObj = parseKeys(key, tempObj[key], options);
        obj = utils$3.merge(obj, newObj, options);
    }

    return utils$3.compact(obj);
};

var stringify = stringify_1;
var parse = parse$1;
var formats = formats$2;

var index$1 = {
    formats: formats,
    parse: parse,
    stringify: stringify
};

var index_1 = index$1.stringify;

/**
 * Stringify and concats params to the provided URL
 *
 * @param {string} URL The URL
 * @param {object} params The params Object
 * @returns {string} The url and params combined
 */

function concatParams(URL, params) {
  return params ? (URL + '?' + index_1(params)).replace(/\?$/, '') : URL;
}

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */

function combine(baseURL, relativeURL) {
  return baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '');
}

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
function isAbsolute(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return (/^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url)
  );
}

/**
 * Format an url combining provided urls or returning the relativeURL
 *
 * @param {string} baseUrl The base url
 * @param {string} relativeURL The relative url
 * @returns {string} relativeURL if the specified relativeURL is absolute or baseUrl is not defined,
 *                   otherwise it returns the combination of both urls
 * @param {object} params The params object
 */
function format(baseUrl, relativeURL, params) {
  if (!baseUrl || isAbsolute(relativeURL)) {
    return concatParams(relativeURL, params);
  }

  return concatParams(combine(baseUrl, relativeURL), params);
}

var merge$1 = createCommonjsModule(function (module) {
	/*!
  * @name JavaScript/NodeJS Merge v1.2.0
  * @author yeikos
  * @repository https://github.com/yeikos/js.merge
 
  * Copyright 2014 yeikos - MIT license
  * https://raw.github.com/yeikos/js.merge/master/LICENSE
  */

	(function (isNode) {

		/**
   * Merge one or more objects 
   * @param bool? clone
   * @param mixed,... arguments
   * @return object
   */

		var Public = function Public(clone) {

			return merge(clone === true, false, arguments);
		},
		    publicName = 'merge';

		/**
   * Merge two or more objects recursively 
   * @param bool? clone
   * @param mixed,... arguments
   * @return object
   */

		Public.recursive = function (clone) {

			return merge(clone === true, true, arguments);
		};

		/**
   * Clone the input removing any reference
   * @param mixed input
   * @return mixed
   */

		Public.clone = function (input) {

			var output = input,
			    type = typeOf(input),
			    index,
			    size;

			if (type === 'array') {

				output = [];
				size = input.length;

				for (index = 0; index < size; ++index) {

					output[index] = Public.clone(input[index]);
				}
			} else if (type === 'object') {

				output = {};

				for (index in input) {

					output[index] = Public.clone(input[index]);
				}
			}

			return output;
		};

		/**
   * Merge two objects recursively
   * @param mixed input
   * @param mixed extend
   * @return mixed
   */

		function merge_recursive(base, extend) {

			if (typeOf(base) !== 'object') return extend;

			for (var key in extend) {

				if (typeOf(base[key]) === 'object' && typeOf(extend[key]) === 'object') {

					base[key] = merge_recursive(base[key], extend[key]);
				} else {

					base[key] = extend[key];
				}
			}

			return base;
		}

		/**
   * Merge two or more objects
   * @param bool clone
   * @param bool recursive
   * @param array argv
   * @return object
   */

		function merge(clone, recursive, argv) {

			var result = argv[0],
			    size = argv.length;

			if (clone || typeOf(result) !== 'object') result = {};

			for (var index = 0; index < size; ++index) {

				var item = argv[index],
				    type = typeOf(item);

				if (type !== 'object') continue;

				for (var key in item) {

					var sitem = clone ? Public.clone(item[key]) : item[key];

					if (recursive) {

						result[key] = merge_recursive(result[key], sitem);
					} else {

						result[key] = sitem;
					}
				}
			}

			return result;
		}

		/**
   * Get type of variable
   * @param mixed input
   * @return string
   *
   * @see http://jsperf.com/typeofvar
   */

		function typeOf(input) {

			return {}.toString.call(input).slice(8, -1).toLowerCase();
		}

		if (isNode) {

			module.exports = Public;
		} else {

			window[publicName] = Public;
		}
	})('object' === 'object' && module && 'object' === 'object' && module.exports);
});

/**
 * Recursively merge objects
 *
 * @param {Object} objects to merge
 * @return {Object} the merged objects
 */
function merge() {
  for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
    params[_key] = arguments[_key];
  }

  return merge$1.recursive.apply(merge$1, [true].concat(params));
}

/**
 * Returns an object with the skipped properties
 *
 * @param {Object} obj the object to skip properties from
 * @param {[String]} keys keys of the properties to skip
 * @return {Object} the object with the properties skipped
 */
function skip(obj, keys) {
  var skipped = {};
  Object.keys(obj).forEach(function (objKey) {
    if (keys.indexOf(objKey) === -1) {
      skipped[objKey] = obj[objKey];
    }
  });
  return skipped;
}

var identity = function identity(response) {
  return response;
};
var rejection = function rejection(err) {
  return Promise.reject(err);
};

var Middleware = function () {
  function Middleware() {
    classCallCheck(this, Middleware);

    this._before = [];
    this._after = [];
    this._finally = [];
  }

  createClass(Middleware, [{
    key: "before",
    value: function before(fn) {
      this._before.push(fn);
      return this._before.length - 1;
    }
  }, {
    key: "after",
    value: function after() {
      var fulfill = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : identity;
      var reject = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : rejection;

      this._after.push({ fulfill: fulfill, reject: reject });
      return this._after.length - 1;
    }
  }, {
    key: "finally",
    value: function _finally(fn) {
      this._finally.push(fn);
      return this._finally.length - 1;
    }
  }, {
    key: "resolveBefore",
    value: function resolveBefore(config) {
      var chain = function chain(promise, task) {
        return promise.then(task);
      };
      return this._before.reduce(chain, Promise.resolve(config));
    }
  }, {
    key: "resolveAfter",
    value: function resolveAfter(err, response) {
      var chain = function chain(promise, task) {
        return promise.then(task.fulfill, task.reject);
      };
      var initial = err ? Promise.reject(err) : Promise.resolve(response);
      return this._after.reduce(chain, initial);
    }
  }, {
    key: "resolveFinally",
    value: function resolveFinally() {
      this._finally.forEach(function (task) {
        return task();
      });
    }
  }]);
  return Middleware;
}();

var DEFAULT_HEADERS = {
  'Accept': 'application/json, text/plain, */*', // eslint-disable-line quote-props
  'Content-Type': 'application/json'
};

var Config = function () {
  function Config() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    classCallCheck(this, Config);

    this._defaults = merge({}, { headers: DEFAULT_HEADERS });
    this._config = {};

    this.set(config);
  }

  createClass(Config, [{
    key: 'mergeWithDefaults',
    value: function mergeWithDefaults() {
      for (var _len = arguments.length, configParams = Array(_len), _key = 0; _key < _len; _key++) {
        configParams[_key] = arguments[_key];
      }

      var config = merge.apply(undefined, [this._defaults, this._config].concat(configParams));
      if (_typeof(config.body) === 'object' && config.headers && config.headers['Content-Type'] === 'application/json') {
        config.body = JSON.stringify(config.body);
      }
      return config;
    }
  }, {
    key: 'set',
    value: function set$$1(config) {
      this._config = merge(this._config, config);
    }
  }, {
    key: 'get',
    value: function get$$1() {
      return merge(this._defaults, this._config);
    }
  }]);
  return Config;
}();

/**
 * Wrap a response
 *
 * @param {Object} response response object
 * @param {String} reader type of reader to use on response body
 * @return {Promise} resolves to the wrapped read response
 */
function wrapResponse(response, reader) {
  var res = {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText
  };

  if (reader === 'raw') {
    res.data = response.body;
    return res;
  }

  return response[reader]().then(function (data) {
    res.data = data;
    return res;
  });
}

/**
 * Reads or rejects a fetch response
 *
 * @param {Object} response response object
 * @param {String} reader type of reader to use on response body
 * @return {Promise} read or rejection promise
 */
function responseHandler(response, reader) {
  if (!response.ok) {
    var err = new Error(response.statusText);
    err.status = response.status;
    err.statusText = response.statusText;
    err.headers = response.headers;
    return Promise.reject(err);
  }
  if (reader) {
    return wrapResponse(response, reader);
  }

  var contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('application/json')) {
    return wrapResponse(response, 'json');
  }
  return wrapResponse(response, 'text');
}

var Trae = function () {
  function Trae() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    classCallCheck(this, Trae);

    this._middleware = new Middleware();
    this._config = new Config(skip(config, ['baseUrl']));

    this.baseUrl(config.baseUrl || '');
    this._initMethodsWithBody();
    this._initMethodsWithNoBody();
    this._initMiddlewareMethods();
  }

  createClass(Trae, [{
    key: 'create',
    value: function create(config) {
      var instance = new this.constructor(merge(this.defaults(), config));
      var mapAfter = function mapAfter(_ref) {
        var fulfill = _ref.fulfill,
            reject = _ref.reject;
        return instance.after(fulfill, reject);
      };
      this._middleware._before.forEach(instance.before);
      this._middleware._after.forEach(mapAfter);
      this._middleware._finally.forEach(instance.finally);
      return instance;
    }
  }, {
    key: 'defaults',
    value: function defaults$$1(config) {
      if (typeof config === 'undefined') {
        var defaults$$1 = this._config.get();
        this.baseUrl() && (defaults$$1.baseUrl = this.baseUrl());
        return defaults$$1;
      }
      this._config.set(skip(config, ['baseUrl']));
      config.baseUrl && this.baseUrl(config.baseUrl);
      return this._config.get();
    }
  }, {
    key: 'baseUrl',
    value: function baseUrl(_baseUrl) {
      if (typeof _baseUrl === 'undefined') {
        return this._baseUrl;
      }
      this._baseUrl = _baseUrl;
      return this._baseUrl;
    }
  }, {
    key: 'request',
    value: function request() {
      var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      config.method || (config.method = 'get');
      var mergedConfig = this._config.mergeWithDefaults(config);
      var url = format(this._baseUrl, config.url, config.params);

      return this._fetch(url, mergedConfig);
    }
  }, {
    key: '_fetch',
    value: function _fetch(url, config) {
      var _this = this;

      return this._middleware.resolveBefore(config).then(function (config) {
        return fetch(url, config);
      }).then(function (res) {
        return responseHandler(res, config.bodyType);
      }).then(function (res) {
        return _this._middleware.resolveAfter(undefined, res);
      }, function (err) {
        return _this._middleware.resolveAfter(err);
      }).then(function (res) {
        return Promise.resolve(_this._middleware.resolveFinally()).then(function () {
          return res;
        });
      }, function (err) {
        return Promise.resolve(_this._middleware.resolveFinally()).then(function () {
          throw err;
        });
      });
    }
  }, {
    key: '_initMethodsWithNoBody',
    value: function _initMethodsWithNoBody() {
      var _this2 = this;

      ['get', 'delete', 'head'].forEach(function (method) {
        _this2[method] = function (path) {
          var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

          var mergedConfig = _this2._config.mergeWithDefaults(config, { method: method });
          var url = format(_this2._baseUrl, path, config.params);

          return _this2._fetch(url, mergedConfig);
        };
      });
    }
  }, {
    key: '_initMethodsWithBody',
    value: function _initMethodsWithBody() {
      var _this3 = this;

      ['post', 'put', 'patch'].forEach(function (method) {
        _this3[method] = function (path, body, config) {
          var mergedConfig = _this3._config.mergeWithDefaults(config, { body: body, method: method });
          var url = format(_this3._baseUrl, path);

          return _this3._fetch(url, mergedConfig);
        };
      });
    }
  }, {
    key: '_initMiddlewareMethods',
    value: function _initMiddlewareMethods() {
      var _this4 = this;

      ['before', 'after', 'finally'].forEach(function (method) {
        _this4[method] = function () {
          var _middleware;

          return (_middleware = _this4._middleware)[method].apply(_middleware, arguments);
        };
      });
    }
  }]);
  return Trae;
}();

var index = new Trae();

return index;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMvaXNvbW9ycGhpYy1mZXRjaC9mZXRjaC1ucG0tYnJvd3NlcmlmeS5qcyIsIi4uL25vZGVfbW9kdWxlcy9xcy9saWIvdXRpbHMuanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL2Zvcm1hdHMuanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL3N0cmluZ2lmeS5qcyIsIi4uL25vZGVfbW9kdWxlcy9xcy9saWIvcGFyc2UuanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL2luZGV4LmpzIiwiLi4vbGliL2hlbHBlcnMvdXJsLWhhbmRsZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvbWVyZ2UvbWVyZ2UuanMiLCIuLi9saWIvdXRpbHMuanMiLCIuLi9saWIvbWlkZGxld2FyZS5qcyIsIi4uL2xpYi9jb25maWcuanMiLCIuLi9saWIvaGVscGVycy9yZXNwb25zZS1oYW5kbGVyLmpzIiwiLi4vbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbihzZWxmKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBpZiAoc2VsZi5mZXRjaCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHN1cHBvcnQgPSB7XG4gICAgc2VhcmNoUGFyYW1zOiAnVVJMU2VhcmNoUGFyYW1zJyBpbiBzZWxmLFxuICAgIGl0ZXJhYmxlOiAnU3ltYm9sJyBpbiBzZWxmICYmICdpdGVyYXRvcicgaW4gU3ltYm9sLFxuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKClcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KSgpLFxuICAgIGZvcm1EYXRhOiAnRm9ybURhdGEnIGluIHNlbGYsXG4gICAgYXJyYXlCdWZmZXI6ICdBcnJheUJ1ZmZlcicgaW4gc2VsZlxuICB9XG5cbiAgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIpIHtcbiAgICB2YXIgdmlld0NsYXNzZXMgPSBbXG4gICAgICAnW29iamVjdCBJbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQ2NEFycmF5XSdcbiAgICBdXG5cbiAgICB2YXIgaXNEYXRhVmlldyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiBEYXRhVmlldy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmopXG4gICAgfVxuXG4gICAgdmFyIGlzQXJyYXlCdWZmZXJWaWV3ID0gQXJyYXlCdWZmZXIuaXNWaWV3IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiB2aWV3Q2xhc3Nlcy5pbmRleE9mKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopKSA+IC0xXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTmFtZShuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgbmFtZSA9IFN0cmluZyhuYW1lKVxuICAgIH1cbiAgICBpZiAoL1teYS16MC05XFwtIyQlJicqKy5cXF5fYHx+XS9pLnRlc3QobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2hhcmFjdGVyIGluIGhlYWRlciBmaWVsZCBuYW1lJylcbiAgICB9XG4gICAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSBTdHJpbmcodmFsdWUpXG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgLy8gQnVpbGQgYSBkZXN0cnVjdGl2ZSBpdGVyYXRvciBmb3IgdGhlIHZhbHVlIGxpc3RcbiAgZnVuY3Rpb24gaXRlcmF0b3JGb3IoaXRlbXMpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSB7XG4gICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gaXRlbXMuc2hpZnQoKVxuICAgICAgICByZXR1cm4ge2RvbmU6IHZhbHVlID09PSB1bmRlZmluZWQsIHZhbHVlOiB2YWx1ZX1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgICAgaXRlcmF0b3JbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaXRlcmF0b3JcbiAgfVxuXG4gIGZ1bmN0aW9uIEhlYWRlcnMoaGVhZGVycykge1xuICAgIHRoaXMubWFwID0ge31cblxuICAgIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIHZhbHVlKVxuICAgICAgfSwgdGhpcylcblxuICAgIH0gZWxzZSBpZiAoaGVhZGVycykge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaGVhZGVycykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIGhlYWRlcnNbbmFtZV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMubWFwW25hbWVdXG4gICAgdGhpcy5tYXBbbmFtZV0gPSBvbGRWYWx1ZSA/IG9sZFZhbHVlKycsJyt2YWx1ZSA6IHZhbHVlXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICByZXR1cm4gdGhpcy5oYXMobmFtZSkgPyB0aGlzLm1hcFtuYW1lXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGZvciAodmFyIG5hbWUgaW4gdGhpcy5tYXApIHtcbiAgICAgIGlmICh0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMubWFwW25hbWVdLCBuYW1lLCB0aGlzKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKG5hbWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgaXRlbXMucHVzaCh2YWx1ZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgSGVhZGVycy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRBcnJheUJ1ZmZlckFzVGV4dChidWYpIHtcbiAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICB2YXIgY2hhcnMgPSBuZXcgQXJyYXkodmlldy5sZW5ndGgpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZpZXcubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoYXJzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSh2aWV3W2ldKVxuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJylcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1ZmZlckNsb25lKGJ1Zikge1xuICAgIGlmIChidWYuc2xpY2UpIHtcbiAgICAgIHJldHVybiBidWYuc2xpY2UoMClcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYuYnl0ZUxlbmd0aClcbiAgICAgIHZpZXcuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZikpXG4gICAgICByZXR1cm4gdmlldy5idWZmZXJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiBzdXBwb3J0LmJsb2IgJiYgaXNEYXRhVmlldyhib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5LmJ1ZmZlcilcbiAgICAgICAgLy8gSUUgMTAtMTEgY2FuJ3QgaGFuZGxlIGEgRGF0YVZpZXcgYm9keS5cbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiAoQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkgfHwgaXNBcnJheUJ1ZmZlclZpZXcoYm9keSkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QmxvYiAmJiB0aGlzLl9ib2R5QmxvYi50eXBlKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgdGhpcy5fYm9keUJsb2IudHlwZSlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKSlcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gY29uc3VtZWQodGhpcykgfHwgUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICByZXR1cm4gcmVhZEJsb2JBc1RleHQodGhpcy5fYm9keUJsb2IpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlYWRBcnJheUJ1ZmZlckFzVGV4dCh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIHRleHQnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHlcblxuICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLnVybCA9IGlucHV0XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbnB1dC5ib2R5VXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKVxuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSBpbnB1dC51cmxcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFsc1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHRoaXMubWV0aG9kID0gaW5wdXQubWV0aG9kXG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlXG4gICAgICBpZiAoIWJvZHkgJiYgaW5wdXQuX2JvZHlJbml0ICE9IG51bGwpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdFxuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcywgeyBib2R5OiB0aGlzLl9ib2R5SW5pdCB9KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUhlYWRlcnMocmF3SGVhZGVycykge1xuICAgIHZhciBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKVxuICAgIHJhd0hlYWRlcnMuc3BsaXQoJ1xcclxcbicpLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgdmFyIHBhcnRzID0gbGluZS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gcGFydHMuc2hpZnQoKS50cmltKClcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFydHMuam9pbignOicpLnRyaW0oKVxuICAgICAgICBoZWFkZXJzLmFwcGVuZChrZXksIHZhbHVlKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRlcnNcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSAnc3RhdHVzJyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXMgOiAyMDBcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gJ3N0YXR1c1RleHQnIGluIG9wdGlvbnMgPyBvcHRpb25zLnN0YXR1c1RleHQgOiAnT0snXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IHBhcnNlSGVhZGVycyh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpXG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy51cmwgPSAncmVzcG9uc2VVUkwnIGluIHhociA/IHhoci5yZXNwb25zZVVSTCA6IG9wdGlvbnMuaGVhZGVycy5nZXQoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiLy8gdGhlIHdoYXR3Zy1mZXRjaCBwb2x5ZmlsbCBpbnN0YWxscyB0aGUgZmV0Y2goKSBmdW5jdGlvblxuLy8gb24gdGhlIGdsb2JhbCBvYmplY3QgKHdpbmRvdyBvciBzZWxmKVxuLy9cbi8vIFJldHVybiB0aGF0IGFzIHRoZSBleHBvcnQgZm9yIHVzZSBpbiBXZWJwYWNrLCBCcm93c2VyaWZ5IGV0Yy5cbnJlcXVpcmUoJ3doYXR3Zy1mZXRjaCcpO1xubW9kdWxlLmV4cG9ydHMgPSBzZWxmLmZldGNoLmJpbmQoc2VsZik7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgaGV4VGFibGUgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcnJheSA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyArK2kpIHtcbiAgICAgICAgYXJyYXkucHVzaCgnJScgKyAoKGkgPCAxNiA/ICcwJyA6ICcnKSArIGkudG9TdHJpbmcoMTYpKS50b1VwcGVyQ2FzZSgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyYXk7XG59KCkpO1xuXG5leHBvcnRzLmFycmF5VG9PYmplY3QgPSBmdW5jdGlvbiAoc291cmNlLCBvcHRpb25zKSB7XG4gICAgdmFyIG9iaiA9IG9wdGlvbnMgJiYgb3B0aW9ucy5wbGFpbk9iamVjdHMgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzb3VyY2UubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbaV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBvYmpbaV0gPSBzb3VyY2VbaV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxuZXhwb3J0cy5tZXJnZSA9IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSwgb3B0aW9ucykge1xuICAgIGlmICghc291cmNlKSB7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzb3VyY2UgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgICAgIHRhcmdldC5wdXNoKHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHRhcmdldCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHRhcmdldFtzb3VyY2VdID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbdGFyZ2V0LCBzb3VyY2VdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRhcmdldCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIFt0YXJnZXRdLmNvbmNhdChzb3VyY2UpO1xuICAgIH1cblxuICAgIHZhciBtZXJnZVRhcmdldCA9IHRhcmdldDtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpICYmICFBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgICAgbWVyZ2VUYXJnZXQgPSBleHBvcnRzLmFycmF5VG9PYmplY3QodGFyZ2V0LCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpICYmIEFycmF5LmlzQXJyYXkoc291cmNlKSkge1xuICAgICAgICBzb3VyY2UuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaSkge1xuICAgICAgICAgICAgaWYgKGhhcy5jYWxsKHRhcmdldCwgaSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0W2ldICYmIHR5cGVvZiB0YXJnZXRbaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFtpXSA9IGV4cG9ydHMubWVyZ2UodGFyZ2V0W2ldLCBpdGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldFtpXSA9IGl0ZW07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cblxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzb3VyY2UpLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gc291cmNlW2tleV07XG5cbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhY2MsIGtleSkpIHtcbiAgICAgICAgICAgIGFjY1trZXldID0gZXhwb3J0cy5tZXJnZShhY2Nba2V5XSwgdmFsdWUsIG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWNjW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWNjO1xuICAgIH0sIG1lcmdlVGFyZ2V0KTtcbn07XG5cbmV4cG9ydHMuZGVjb2RlID0gZnVuY3Rpb24gKHN0cikge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyLnJlcGxhY2UoL1xcKy9nLCAnICcpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxufTtcblxuZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgLy8gVGhpcyBjb2RlIHdhcyBvcmlnaW5hbGx5IHdyaXR0ZW4gYnkgQnJpYW4gV2hpdGUgKG1zY2RleCkgZm9yIHRoZSBpby5qcyBjb3JlIHF1ZXJ5c3RyaW5nIGxpYnJhcnkuXG4gICAgLy8gSXQgaGFzIGJlZW4gYWRhcHRlZCBoZXJlIGZvciBzdHJpY3RlciBhZGhlcmVuY2UgdG8gUkZDIDM5ODZcbiAgICBpZiAoc3RyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cblxuICAgIHZhciBzdHJpbmcgPSB0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyA/IHN0ciA6IFN0cmluZyhzdHIpO1xuXG4gICAgdmFyIG91dCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBjID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgYyA9PT0gMHgyRCB8fCAvLyAtXG4gICAgICAgICAgICBjID09PSAweDJFIHx8IC8vIC5cbiAgICAgICAgICAgIGMgPT09IDB4NUYgfHwgLy8gX1xuICAgICAgICAgICAgYyA9PT0gMHg3RSB8fCAvLyB+XG4gICAgICAgICAgICAoYyA+PSAweDMwICYmIGMgPD0gMHgzOSkgfHwgLy8gMC05XG4gICAgICAgICAgICAoYyA+PSAweDQxICYmIGMgPD0gMHg1QSkgfHwgLy8gYS16XG4gICAgICAgICAgICAoYyA+PSAweDYxICYmIGMgPD0gMHg3QSkgLy8gQS1aXG4gICAgICAgICkge1xuICAgICAgICAgICAgb3V0ICs9IHN0cmluZy5jaGFyQXQoaSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjIDwgMHg4MCkge1xuICAgICAgICAgICAgb3V0ID0gb3V0ICsgaGV4VGFibGVbY107XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjIDwgMHg4MDApIHtcbiAgICAgICAgICAgIG91dCA9IG91dCArIChoZXhUYWJsZVsweEMwIHwgKGMgPj4gNildICsgaGV4VGFibGVbMHg4MCB8IChjICYgMHgzRildKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweEQ4MDAgfHwgYyA+PSAweEUwMDApIHtcbiAgICAgICAgICAgIG91dCA9IG91dCArIChoZXhUYWJsZVsweEUwIHwgKGMgPj4gMTIpXSArIGhleFRhYmxlWzB4ODAgfCAoKGMgPj4gNikgJiAweDNGKV0gKyBoZXhUYWJsZVsweDgwIHwgKGMgJiAweDNGKV0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpICs9IDE7XG4gICAgICAgIGMgPSAweDEwMDAwICsgKCgoYyAmIDB4M0ZGKSA8PCAxMCkgfCAoc3RyaW5nLmNoYXJDb2RlQXQoaSkgJiAweDNGRikpO1xuICAgICAgICBvdXQgKz0gaGV4VGFibGVbMHhGMCB8IChjID4+IDE4KV0gKyBoZXhUYWJsZVsweDgwIHwgKChjID4+IDEyKSAmIDB4M0YpXSArIGhleFRhYmxlWzB4ODAgfCAoKGMgPj4gNikgJiAweDNGKV0gKyBoZXhUYWJsZVsweDgwIHwgKGMgJiAweDNGKV07XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbmV4cG9ydHMuY29tcGFjdCA9IGZ1bmN0aW9uIChvYmosIHJlZmVyZW5jZXMpIHtcbiAgICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgdmFyIHJlZnMgPSByZWZlcmVuY2VzIHx8IFtdO1xuICAgIHZhciBsb29rdXAgPSByZWZzLmluZGV4T2Yob2JqKTtcbiAgICBpZiAobG9va3VwICE9PSAtMSkge1xuICAgICAgICByZXR1cm4gcmVmc1tsb29rdXBdO1xuICAgIH1cblxuICAgIHJlZnMucHVzaChvYmopO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSkge1xuICAgICAgICB2YXIgY29tcGFjdGVkID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChvYmpbaV0gJiYgdHlwZW9mIG9ialtpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjb21wYWN0ZWQucHVzaChleHBvcnRzLmNvbXBhY3Qob2JqW2ldLCByZWZzKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvYmpbaV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29tcGFjdGVkLnB1c2gob2JqW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb21wYWN0ZWQ7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIG9ialtrZXldID0gZXhwb3J0cy5jb21wYWN0KG9ialtrZXldLCByZWZzKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvYmo7XG59O1xuXG5leHBvcnRzLmlzUmVnRXhwID0gZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59O1xuXG5leHBvcnRzLmlzQnVmZmVyID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGlmIChvYmogPT09IG51bGwgfHwgdHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiAhIShvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciByZXBsYWNlID0gU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlO1xudmFyIHBlcmNlbnRUd2VudGllcyA9IC8lMjAvZztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgJ2RlZmF1bHQnOiAnUkZDMzk4NicsXG4gICAgZm9ybWF0dGVyczoge1xuICAgICAgICBSRkMxNzM4OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlLmNhbGwodmFsdWUsIHBlcmNlbnRUd2VudGllcywgJysnKTtcbiAgICAgICAgfSxcbiAgICAgICAgUkZDMzk4NjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFJGQzE3Mzg6ICdSRkMxNzM4JyxcbiAgICBSRkMzOTg2OiAnUkZDMzk4Nidcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBmb3JtYXRzID0gcmVxdWlyZSgnLi9mb3JtYXRzJyk7XG5cbnZhciBhcnJheVByZWZpeEdlbmVyYXRvcnMgPSB7XG4gICAgYnJhY2tldHM6IGZ1bmN0aW9uIGJyYWNrZXRzKHByZWZpeCkge1xuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ1tdJztcbiAgICB9LFxuICAgIGluZGljZXM6IGZ1bmN0aW9uIGluZGljZXMocHJlZml4LCBrZXkpIHtcbiAgICAgICAgcmV0dXJuIHByZWZpeCArICdbJyArIGtleSArICddJztcbiAgICB9LFxuICAgIHJlcGVhdDogZnVuY3Rpb24gcmVwZWF0KHByZWZpeCkge1xuICAgICAgICByZXR1cm4gcHJlZml4O1xuICAgIH1cbn07XG5cbnZhciB0b0lTTyA9IERhdGUucHJvdG90eXBlLnRvSVNPU3RyaW5nO1xuXG52YXIgZGVmYXVsdHMgPSB7XG4gICAgZGVsaW1pdGVyOiAnJicsXG4gICAgZW5jb2RlOiB0cnVlLFxuICAgIGVuY29kZXI6IHV0aWxzLmVuY29kZSxcbiAgICBzZXJpYWxpemVEYXRlOiBmdW5jdGlvbiBzZXJpYWxpemVEYXRlKGRhdGUpIHtcbiAgICAgICAgcmV0dXJuIHRvSVNPLmNhbGwoZGF0ZSk7XG4gICAgfSxcbiAgICBza2lwTnVsbHM6IGZhbHNlLFxuICAgIHN0cmljdE51bGxIYW5kbGluZzogZmFsc2Vcbn07XG5cbnZhciBzdHJpbmdpZnkgPSBmdW5jdGlvbiBzdHJpbmdpZnkob2JqZWN0LCBwcmVmaXgsIGdlbmVyYXRlQXJyYXlQcmVmaXgsIHN0cmljdE51bGxIYW5kbGluZywgc2tpcE51bGxzLCBlbmNvZGVyLCBmaWx0ZXIsIHNvcnQsIGFsbG93RG90cywgc2VyaWFsaXplRGF0ZSwgZm9ybWF0dGVyKSB7XG4gICAgdmFyIG9iaiA9IG9iamVjdDtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvYmogPSBmaWx0ZXIocHJlZml4LCBvYmopO1xuICAgIH0gZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICBvYmogPSBzZXJpYWxpemVEYXRlKG9iaik7XG4gICAgfSBlbHNlIGlmIChvYmogPT09IG51bGwpIHtcbiAgICAgICAgaWYgKHN0cmljdE51bGxIYW5kbGluZykge1xuICAgICAgICAgICAgcmV0dXJuIGVuY29kZXIgPyBlbmNvZGVyKHByZWZpeCkgOiBwcmVmaXg7XG4gICAgICAgIH1cblxuICAgICAgICBvYmogPSAnJztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIG9iaiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIG9iaiA9PT0gJ2Jvb2xlYW4nIHx8IHV0aWxzLmlzQnVmZmVyKG9iaikpIHtcbiAgICAgICAgaWYgKGVuY29kZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBbZm9ybWF0dGVyKGVuY29kZXIocHJlZml4KSkgKyAnPScgKyBmb3JtYXR0ZXIoZW5jb2RlcihvYmopKV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtmb3JtYXR0ZXIocHJlZml4KSArICc9JyArIGZvcm1hdHRlcihTdHJpbmcob2JqKSldO1xuICAgIH1cblxuICAgIHZhciB2YWx1ZXMgPSBbXTtcblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH1cblxuICAgIHZhciBvYmpLZXlzO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGZpbHRlcikpIHtcbiAgICAgICAgb2JqS2V5cyA9IGZpbHRlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAgICAgIG9iaktleXMgPSBzb3J0ID8ga2V5cy5zb3J0KHNvcnQpIDoga2V5cztcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iaktleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IG9iaktleXNbaV07XG5cbiAgICAgICAgaWYgKHNraXBOdWxscyAmJiBvYmpba2V5XSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSB2YWx1ZXMuY29uY2F0KHN0cmluZ2lmeShcbiAgICAgICAgICAgICAgICBvYmpba2V5XSxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUFycmF5UHJlZml4KHByZWZpeCwga2V5KSxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUFycmF5UHJlZml4LFxuICAgICAgICAgICAgICAgIHN0cmljdE51bGxIYW5kbGluZyxcbiAgICAgICAgICAgICAgICBza2lwTnVsbHMsXG4gICAgICAgICAgICAgICAgZW5jb2RlcixcbiAgICAgICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICAgICAgc29ydCxcbiAgICAgICAgICAgICAgICBhbGxvd0RvdHMsXG4gICAgICAgICAgICAgICAgc2VyaWFsaXplRGF0ZSxcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZXJcbiAgICAgICAgICAgICkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWVzID0gdmFsdWVzLmNvbmNhdChzdHJpbmdpZnkoXG4gICAgICAgICAgICAgICAgb2JqW2tleV0sXG4gICAgICAgICAgICAgICAgcHJlZml4ICsgKGFsbG93RG90cyA/ICcuJyArIGtleSA6ICdbJyArIGtleSArICddJyksXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVBcnJheVByZWZpeCxcbiAgICAgICAgICAgICAgICBzdHJpY3ROdWxsSGFuZGxpbmcsXG4gICAgICAgICAgICAgICAgc2tpcE51bGxzLFxuICAgICAgICAgICAgICAgIGVuY29kZXIsXG4gICAgICAgICAgICAgICAgZmlsdGVyLFxuICAgICAgICAgICAgICAgIHNvcnQsXG4gICAgICAgICAgICAgICAgYWxsb3dEb3RzLFxuICAgICAgICAgICAgICAgIHNlcmlhbGl6ZURhdGUsXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVyXG4gICAgICAgICAgICApKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmplY3QsIG9wdHMpIHtcbiAgICB2YXIgb2JqID0gb2JqZWN0O1xuICAgIHZhciBvcHRpb25zID0gb3B0cyB8fCB7fTtcbiAgICB2YXIgZGVsaW1pdGVyID0gdHlwZW9mIG9wdGlvbnMuZGVsaW1pdGVyID09PSAndW5kZWZpbmVkJyA/IGRlZmF1bHRzLmRlbGltaXRlciA6IG9wdGlvbnMuZGVsaW1pdGVyO1xuICAgIHZhciBzdHJpY3ROdWxsSGFuZGxpbmcgPSB0eXBlb2Ygb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgPT09ICdib29sZWFuJyA/IG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nIDogZGVmYXVsdHMuc3RyaWN0TnVsbEhhbmRsaW5nO1xuICAgIHZhciBza2lwTnVsbHMgPSB0eXBlb2Ygb3B0aW9ucy5za2lwTnVsbHMgPT09ICdib29sZWFuJyA/IG9wdGlvbnMuc2tpcE51bGxzIDogZGVmYXVsdHMuc2tpcE51bGxzO1xuICAgIHZhciBlbmNvZGUgPSB0eXBlb2Ygb3B0aW9ucy5lbmNvZGUgPT09ICdib29sZWFuJyA/IG9wdGlvbnMuZW5jb2RlIDogZGVmYXVsdHMuZW5jb2RlO1xuICAgIHZhciBlbmNvZGVyID0gZW5jb2RlID8gKHR5cGVvZiBvcHRpb25zLmVuY29kZXIgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLmVuY29kZXIgOiBkZWZhdWx0cy5lbmNvZGVyKSA6IG51bGw7XG4gICAgdmFyIHNvcnQgPSB0eXBlb2Ygb3B0aW9ucy5zb3J0ID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5zb3J0IDogbnVsbDtcbiAgICB2YXIgYWxsb3dEb3RzID0gdHlwZW9mIG9wdGlvbnMuYWxsb3dEb3RzID09PSAndW5kZWZpbmVkJyA/IGZhbHNlIDogb3B0aW9ucy5hbGxvd0RvdHM7XG4gICAgdmFyIHNlcmlhbGl6ZURhdGUgPSB0eXBlb2Ygb3B0aW9ucy5zZXJpYWxpemVEYXRlID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5zZXJpYWxpemVEYXRlIDogZGVmYXVsdHMuc2VyaWFsaXplRGF0ZTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuZm9ybWF0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBvcHRpb25zLmZvcm1hdCA9IGZvcm1hdHMuZGVmYXVsdDtcbiAgICB9IGVsc2UgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZm9ybWF0cy5mb3JtYXR0ZXJzLCBvcHRpb25zLmZvcm1hdCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBmb3JtYXQgb3B0aW9uIHByb3ZpZGVkLicpO1xuICAgIH1cbiAgICB2YXIgZm9ybWF0dGVyID0gZm9ybWF0cy5mb3JtYXR0ZXJzW29wdGlvbnMuZm9ybWF0XTtcbiAgICB2YXIgb2JqS2V5cztcbiAgICB2YXIgZmlsdGVyO1xuXG4gICAgaWYgKG9wdGlvbnMuZW5jb2RlciAhPT0gbnVsbCAmJiBvcHRpb25zLmVuY29kZXIgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5lbmNvZGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0VuY29kZXIgaGFzIHRvIGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmZpbHRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBmaWx0ZXIgPSBvcHRpb25zLmZpbHRlcjtcbiAgICAgICAgb2JqID0gZmlsdGVyKCcnLCBvYmopO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmZpbHRlcikpIHtcbiAgICAgICAgZmlsdGVyID0gb3B0aW9ucy5maWx0ZXI7XG4gICAgICAgIG9iaktleXMgPSBmaWx0ZXI7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBbXTtcblxuICAgIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH1cblxuICAgIHZhciBhcnJheUZvcm1hdDtcbiAgICBpZiAob3B0aW9ucy5hcnJheUZvcm1hdCBpbiBhcnJheVByZWZpeEdlbmVyYXRvcnMpIHtcbiAgICAgICAgYXJyYXlGb3JtYXQgPSBvcHRpb25zLmFycmF5Rm9ybWF0O1xuICAgIH0gZWxzZSBpZiAoJ2luZGljZXMnIGluIG9wdGlvbnMpIHtcbiAgICAgICAgYXJyYXlGb3JtYXQgPSBvcHRpb25zLmluZGljZXMgPyAnaW5kaWNlcycgOiAncmVwZWF0JztcbiAgICB9IGVsc2Uge1xuICAgICAgICBhcnJheUZvcm1hdCA9ICdpbmRpY2VzJztcbiAgICB9XG5cbiAgICB2YXIgZ2VuZXJhdGVBcnJheVByZWZpeCA9IGFycmF5UHJlZml4R2VuZXJhdG9yc1thcnJheUZvcm1hdF07XG5cbiAgICBpZiAoIW9iaktleXMpIHtcbiAgICAgICAgb2JqS2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAgfVxuXG4gICAgaWYgKHNvcnQpIHtcbiAgICAgICAgb2JqS2V5cy5zb3J0KHNvcnQpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqS2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIga2V5ID0gb2JqS2V5c1tpXTtcblxuICAgICAgICBpZiAoc2tpcE51bGxzICYmIG9ialtrZXldID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGtleXMgPSBrZXlzLmNvbmNhdChzdHJpbmdpZnkoXG4gICAgICAgICAgICBvYmpba2V5XSxcbiAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgIGdlbmVyYXRlQXJyYXlQcmVmaXgsXG4gICAgICAgICAgICBzdHJpY3ROdWxsSGFuZGxpbmcsXG4gICAgICAgICAgICBza2lwTnVsbHMsXG4gICAgICAgICAgICBlbmNvZGVyLFxuICAgICAgICAgICAgZmlsdGVyLFxuICAgICAgICAgICAgc29ydCxcbiAgICAgICAgICAgIGFsbG93RG90cyxcbiAgICAgICAgICAgIHNlcmlhbGl6ZURhdGUsXG4gICAgICAgICAgICBmb3JtYXR0ZXJcbiAgICAgICAgKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGtleXMuam9pbihkZWxpbWl0ZXIpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxudmFyIGRlZmF1bHRzID0ge1xuICAgIGFsbG93RG90czogZmFsc2UsXG4gICAgYWxsb3dQcm90b3R5cGVzOiBmYWxzZSxcbiAgICBhcnJheUxpbWl0OiAyMCxcbiAgICBkZWNvZGVyOiB1dGlscy5kZWNvZGUsXG4gICAgZGVsaW1pdGVyOiAnJicsXG4gICAgZGVwdGg6IDUsXG4gICAgcGFyYW1ldGVyTGltaXQ6IDEwMDAsXG4gICAgcGxhaW5PYmplY3RzOiBmYWxzZSxcbiAgICBzdHJpY3ROdWxsSGFuZGxpbmc6IGZhbHNlXG59O1xuXG52YXIgcGFyc2VWYWx1ZXMgPSBmdW5jdGlvbiBwYXJzZVZhbHVlcyhzdHIsIG9wdGlvbnMpIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgdmFyIHBhcnRzID0gc3RyLnNwbGl0KG9wdGlvbnMuZGVsaW1pdGVyLCBvcHRpb25zLnBhcmFtZXRlckxpbWl0ID09PSBJbmZpbml0eSA/IHVuZGVmaW5lZCA6IG9wdGlvbnMucGFyYW1ldGVyTGltaXQpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2ldO1xuICAgICAgICB2YXIgcG9zID0gcGFydC5pbmRleE9mKCddPScpID09PSAtMSA/IHBhcnQuaW5kZXhPZignPScpIDogcGFydC5pbmRleE9mKCddPScpICsgMTtcblxuICAgICAgICB2YXIga2V5LCB2YWw7XG4gICAgICAgIGlmIChwb3MgPT09IC0xKSB7XG4gICAgICAgICAgICBrZXkgPSBvcHRpb25zLmRlY29kZXIocGFydCk7XG4gICAgICAgICAgICB2YWwgPSBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA/IG51bGwgOiAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleSA9IG9wdGlvbnMuZGVjb2RlcihwYXJ0LnNsaWNlKDAsIHBvcykpO1xuICAgICAgICAgICAgdmFsID0gb3B0aW9ucy5kZWNvZGVyKHBhcnQuc2xpY2UocG9zICsgMSkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoYXMuY2FsbChvYmosIGtleSkpIHtcbiAgICAgICAgICAgIG9ialtrZXldID0gW10uY29uY2F0KG9ialtrZXldKS5jb25jYXQodmFsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9ialtrZXldID0gdmFsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBwYXJzZU9iamVjdCA9IGZ1bmN0aW9uIHBhcnNlT2JqZWN0KGNoYWluLCB2YWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoIWNoYWluLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH1cblxuICAgIHZhciByb290ID0gY2hhaW4uc2hpZnQoKTtcblxuICAgIHZhciBvYmo7XG4gICAgaWYgKHJvb3QgPT09ICdbXScpIHtcbiAgICAgICAgb2JqID0gW107XG4gICAgICAgIG9iaiA9IG9iai5jb25jYXQocGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG9iaiA9IG9wdGlvbnMucGxhaW5PYmplY3RzID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuICAgICAgICB2YXIgY2xlYW5Sb290ID0gcm9vdFswXSA9PT0gJ1snICYmIHJvb3Rbcm9vdC5sZW5ndGggLSAxXSA9PT0gJ10nID8gcm9vdC5zbGljZSgxLCByb290Lmxlbmd0aCAtIDEpIDogcm9vdDtcbiAgICAgICAgdmFyIGluZGV4ID0gcGFyc2VJbnQoY2xlYW5Sb290LCAxMCk7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgICFpc05hTihpbmRleCkgJiZcbiAgICAgICAgICAgIHJvb3QgIT09IGNsZWFuUm9vdCAmJlxuICAgICAgICAgICAgU3RyaW5nKGluZGV4KSA9PT0gY2xlYW5Sb290ICYmXG4gICAgICAgICAgICBpbmRleCA+PSAwICYmXG4gICAgICAgICAgICAob3B0aW9ucy5wYXJzZUFycmF5cyAmJiBpbmRleCA8PSBvcHRpb25zLmFycmF5TGltaXQpXG4gICAgICAgICkge1xuICAgICAgICAgICAgb2JqID0gW107XG4gICAgICAgICAgICBvYmpbaW5kZXhdID0gcGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvYmpbY2xlYW5Sb290XSA9IHBhcnNlT2JqZWN0KGNoYWluLCB2YWwsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBwYXJzZUtleXMgPSBmdW5jdGlvbiBwYXJzZUtleXMoZ2l2ZW5LZXksIHZhbCwgb3B0aW9ucykge1xuICAgIGlmICghZ2l2ZW5LZXkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRyYW5zZm9ybSBkb3Qgbm90YXRpb24gdG8gYnJhY2tldCBub3RhdGlvblxuICAgIHZhciBrZXkgPSBvcHRpb25zLmFsbG93RG90cyA/IGdpdmVuS2V5LnJlcGxhY2UoL1xcLihbXlxcLlxcW10rKS9nLCAnWyQxXScpIDogZ2l2ZW5LZXk7XG5cbiAgICAvLyBUaGUgcmVnZXggY2h1bmtzXG5cbiAgICB2YXIgcGFyZW50ID0gL14oW15cXFtcXF1dKikvO1xuICAgIHZhciBjaGlsZCA9IC8oXFxbW15cXFtcXF1dKlxcXSkvZztcblxuICAgIC8vIEdldCB0aGUgcGFyZW50XG5cbiAgICB2YXIgc2VnbWVudCA9IHBhcmVudC5leGVjKGtleSk7XG5cbiAgICAvLyBTdGFzaCB0aGUgcGFyZW50IGlmIGl0IGV4aXN0c1xuXG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBpZiAoc2VnbWVudFsxXSkge1xuICAgICAgICAvLyBJZiB3ZSBhcmVuJ3QgdXNpbmcgcGxhaW4gb2JqZWN0cywgb3B0aW9uYWxseSBwcmVmaXgga2V5c1xuICAgICAgICAvLyB0aGF0IHdvdWxkIG92ZXJ3cml0ZSBvYmplY3QgcHJvdG90eXBlIHByb3BlcnRpZXNcbiAgICAgICAgaWYgKCFvcHRpb25zLnBsYWluT2JqZWN0cyAmJiBoYXMuY2FsbChPYmplY3QucHJvdG90eXBlLCBzZWdtZW50WzFdKSkge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zLmFsbG93UHJvdG90eXBlcykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGtleXMucHVzaChzZWdtZW50WzFdKTtcbiAgICB9XG5cbiAgICAvLyBMb29wIHRocm91Z2ggY2hpbGRyZW4gYXBwZW5kaW5nIHRvIHRoZSBhcnJheSB1bnRpbCB3ZSBoaXQgZGVwdGhcblxuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZSAoKHNlZ21lbnQgPSBjaGlsZC5leGVjKGtleSkpICE9PSBudWxsICYmIGkgPCBvcHRpb25zLmRlcHRoKSB7XG4gICAgICAgIGkgKz0gMTtcbiAgICAgICAgaWYgKCFvcHRpb25zLnBsYWluT2JqZWN0cyAmJiBoYXMuY2FsbChPYmplY3QucHJvdG90eXBlLCBzZWdtZW50WzFdLnJlcGxhY2UoL1xcW3xcXF0vZywgJycpKSkge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zLmFsbG93UHJvdG90eXBlcykge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGtleXMucHVzaChzZWdtZW50WzFdKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSdzIGEgcmVtYWluZGVyLCBqdXN0IGFkZCB3aGF0ZXZlciBpcyBsZWZ0XG5cbiAgICBpZiAoc2VnbWVudCkge1xuICAgICAgICBrZXlzLnB1c2goJ1snICsga2V5LnNsaWNlKHNlZ21lbnQuaW5kZXgpICsgJ10nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VPYmplY3Qoa2V5cywgdmFsLCBvcHRpb25zKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0ciwgb3B0cykge1xuICAgIHZhciBvcHRpb25zID0gb3B0cyB8fCB7fTtcblxuICAgIGlmIChvcHRpb25zLmRlY29kZXIgIT09IG51bGwgJiYgb3B0aW9ucy5kZWNvZGVyICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuZGVjb2RlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdEZWNvZGVyIGhhcyB0byBiZSBhIGZ1bmN0aW9uLicpO1xuICAgIH1cblxuICAgIG9wdGlvbnMuZGVsaW1pdGVyID0gdHlwZW9mIG9wdGlvbnMuZGVsaW1pdGVyID09PSAnc3RyaW5nJyB8fCB1dGlscy5pc1JlZ0V4cChvcHRpb25zLmRlbGltaXRlcikgPyBvcHRpb25zLmRlbGltaXRlciA6IGRlZmF1bHRzLmRlbGltaXRlcjtcbiAgICBvcHRpb25zLmRlcHRoID0gdHlwZW9mIG9wdGlvbnMuZGVwdGggPT09ICdudW1iZXInID8gb3B0aW9ucy5kZXB0aCA6IGRlZmF1bHRzLmRlcHRoO1xuICAgIG9wdGlvbnMuYXJyYXlMaW1pdCA9IHR5cGVvZiBvcHRpb25zLmFycmF5TGltaXQgPT09ICdudW1iZXInID8gb3B0aW9ucy5hcnJheUxpbWl0IDogZGVmYXVsdHMuYXJyYXlMaW1pdDtcbiAgICBvcHRpb25zLnBhcnNlQXJyYXlzID0gb3B0aW9ucy5wYXJzZUFycmF5cyAhPT0gZmFsc2U7XG4gICAgb3B0aW9ucy5kZWNvZGVyID0gdHlwZW9mIG9wdGlvbnMuZGVjb2RlciA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuZGVjb2RlciA6IGRlZmF1bHRzLmRlY29kZXI7XG4gICAgb3B0aW9ucy5hbGxvd0RvdHMgPSB0eXBlb2Ygb3B0aW9ucy5hbGxvd0RvdHMgPT09ICdib29sZWFuJyA/IG9wdGlvbnMuYWxsb3dEb3RzIDogZGVmYXVsdHMuYWxsb3dEb3RzO1xuICAgIG9wdGlvbnMucGxhaW5PYmplY3RzID0gdHlwZW9mIG9wdGlvbnMucGxhaW5PYmplY3RzID09PSAnYm9vbGVhbicgPyBvcHRpb25zLnBsYWluT2JqZWN0cyA6IGRlZmF1bHRzLnBsYWluT2JqZWN0cztcbiAgICBvcHRpb25zLmFsbG93UHJvdG90eXBlcyA9IHR5cGVvZiBvcHRpb25zLmFsbG93UHJvdG90eXBlcyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5hbGxvd1Byb3RvdHlwZXMgOiBkZWZhdWx0cy5hbGxvd1Byb3RvdHlwZXM7XG4gICAgb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCA9IHR5cGVvZiBvcHRpb25zLnBhcmFtZXRlckxpbWl0ID09PSAnbnVtYmVyJyA/IG9wdGlvbnMucGFyYW1ldGVyTGltaXQgOiBkZWZhdWx0cy5wYXJhbWV0ZXJMaW1pdDtcbiAgICBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA9IHR5cGVvZiBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgOiBkZWZhdWx0cy5zdHJpY3ROdWxsSGFuZGxpbmc7XG5cbiAgICBpZiAoc3RyID09PSAnJyB8fCBzdHIgPT09IG51bGwgfHwgdHlwZW9mIHN0ciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMucGxhaW5PYmplY3RzID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuICAgIH1cblxuICAgIHZhciB0ZW1wT2JqID0gdHlwZW9mIHN0ciA9PT0gJ3N0cmluZycgPyBwYXJzZVZhbHVlcyhzdHIsIG9wdGlvbnMpIDogc3RyO1xuICAgIHZhciBvYmogPSBvcHRpb25zLnBsYWluT2JqZWN0cyA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiB7fTtcblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUga2V5cyBhbmQgc2V0dXAgdGhlIG5ldyBvYmplY3RcblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGVtcE9iaik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICB2YXIgbmV3T2JqID0gcGFyc2VLZXlzKGtleSwgdGVtcE9ialtrZXldLCBvcHRpb25zKTtcbiAgICAgICAgb2JqID0gdXRpbHMubWVyZ2Uob2JqLCBuZXdPYmosIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHJldHVybiB1dGlscy5jb21wYWN0KG9iaik7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9zdHJpbmdpZnknKTtcbnZhciBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKTtcbnZhciBmb3JtYXRzID0gcmVxdWlyZSgnLi9mb3JtYXRzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGZvcm1hdHM6IGZvcm1hdHMsXG4gICAgcGFyc2U6IHBhcnNlLFxuICAgIHN0cmluZ2lmeTogc3RyaW5naWZ5XG59O1xuIiwiaW1wb3J0IHsgc3RyaW5naWZ5IGFzIHN0cmluZ2lmeVBhcmFtcyB9IGZyb20gJ3FzJztcblxuLyoqXG4gKiBTdHJpbmdpZnkgYW5kIGNvbmNhdHMgcGFyYW1zIHRvIHRoZSBwcm92aWRlZCBVUkxcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gVVJMIFRoZSBVUkxcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgVGhlIHBhcmFtcyBPYmplY3RcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB1cmwgYW5kIHBhcmFtcyBjb21iaW5lZFxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBjb25jYXRQYXJhbXMoVVJMLCBwYXJhbXMpIHtcbiAgcmV0dXJuIHBhcmFtc1xuICAgID8gYCR7VVJMfT8ke3N0cmluZ2lmeVBhcmFtcyhwYXJhbXMpfWAucmVwbGFjZSgvXFw/JC8sICcnKVxuICAgIDogVVJMO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgVVJMIGJ5IGNvbWJpbmluZyB0aGUgc3BlY2lmaWVkIFVSTHNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVSTCBUaGUgYmFzZSBVUkxcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVSTCBUaGUgcmVsYXRpdmUgVVJMXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY29tYmluZWQgVVJMXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmUoYmFzZVVSTCwgcmVsYXRpdmVVUkwpIHtcbiAgcmV0dXJuIGAke2Jhc2VVUkwucmVwbGFjZSgvXFwvKyQvLCAnJyl9LyR7cmVsYXRpdmVVUkwucmVwbGFjZSgvXlxcLysvLCAnJyl9YDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFRoZSBVUkwgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBYnNvbHV0ZSh1cmwpIHtcbiAgLy8gQSBVUkwgaXMgY29uc2lkZXJlZCBhYnNvbHV0ZSBpZiBpdCBiZWdpbnMgd2l0aCBcIjxzY2hlbWU+Oi8vXCIgb3IgXCIvL1wiIChwcm90b2NvbC1yZWxhdGl2ZSBVUkwpLlxuICAvLyBSRkMgMzk4NiBkZWZpbmVzIHNjaGVtZSBuYW1lIGFzIGEgc2VxdWVuY2Ugb2YgY2hhcmFjdGVycyBiZWdpbm5pbmcgd2l0aCBhIGxldHRlciBhbmQgZm9sbG93ZWRcbiAgLy8gYnkgYW55IGNvbWJpbmF0aW9uIG9mIGxldHRlcnMsIGRpZ2l0cywgcGx1cywgcGVyaW9kLCBvciBoeXBoZW4uXG4gIHJldHVybiAvXihbYS16XVthLXpcXGRcXCtcXC1cXC5dKjopP1xcL1xcLy9pLnRlc3QodXJsKTtcbn1cblxuLyoqXG4gKiBGb3JtYXQgYW4gdXJsIGNvbWJpbmluZyBwcm92aWRlZCB1cmxzIG9yIHJldHVybmluZyB0aGUgcmVsYXRpdmVVUkxcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVybCBUaGUgYmFzZSB1cmxcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVSTCBUaGUgcmVsYXRpdmUgdXJsXG4gKiBAcmV0dXJucyB7c3RyaW5nfSByZWxhdGl2ZVVSTCBpZiB0aGUgc3BlY2lmaWVkIHJlbGF0aXZlVVJMIGlzIGFic29sdXRlIG9yIGJhc2VVcmwgaXMgbm90IGRlZmluZWQsXG4gKiAgICAgICAgICAgICAgICAgICBvdGhlcndpc2UgaXQgcmV0dXJucyB0aGUgY29tYmluYXRpb24gb2YgYm90aCB1cmxzXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIFRoZSBwYXJhbXMgb2JqZWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXQoYmFzZVVybCwgcmVsYXRpdmVVUkwsIHBhcmFtcykge1xuICBpZiAoIWJhc2VVcmwgfHwgaXNBYnNvbHV0ZShyZWxhdGl2ZVVSTCkpIHtcbiAgICByZXR1cm4gY29uY2F0UGFyYW1zKHJlbGF0aXZlVVJMLCBwYXJhbXMpO1xuICB9XG5cbiAgcmV0dXJuIGNvbmNhdFBhcmFtcyhjb21iaW5lKGJhc2VVcmwsIHJlbGF0aXZlVVJMKSwgcGFyYW1zKTtcbn1cbiIsIi8qIVxyXG4gKiBAbmFtZSBKYXZhU2NyaXB0L05vZGVKUyBNZXJnZSB2MS4yLjBcclxuICogQGF1dGhvciB5ZWlrb3NcclxuICogQHJlcG9zaXRvcnkgaHR0cHM6Ly9naXRodWIuY29tL3llaWtvcy9qcy5tZXJnZVxyXG5cclxuICogQ29weXJpZ2h0IDIwMTQgeWVpa29zIC0gTUlUIGxpY2Vuc2VcclxuICogaHR0cHM6Ly9yYXcuZ2l0aHViLmNvbS95ZWlrb3MvanMubWVyZ2UvbWFzdGVyL0xJQ0VOU0VcclxuICovXHJcblxyXG47KGZ1bmN0aW9uKGlzTm9kZSkge1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSBvbmUgb3IgbW9yZSBvYmplY3RzIFxyXG5cdCAqIEBwYXJhbSBib29sPyBjbG9uZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCwuLi4gYXJndW1lbnRzXHJcblx0ICogQHJldHVybiBvYmplY3RcclxuXHQgKi9cclxuXHJcblx0dmFyIFB1YmxpYyA9IGZ1bmN0aW9uKGNsb25lKSB7XHJcblxyXG5cdFx0cmV0dXJuIG1lcmdlKGNsb25lID09PSB0cnVlLCBmYWxzZSwgYXJndW1lbnRzKTtcclxuXHJcblx0fSwgcHVibGljTmFtZSA9ICdtZXJnZSc7XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHR3byBvciBtb3JlIG9iamVjdHMgcmVjdXJzaXZlbHkgXHJcblx0ICogQHBhcmFtIGJvb2w/IGNsb25lXHJcblx0ICogQHBhcmFtIG1peGVkLC4uLiBhcmd1bWVudHNcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHRQdWJsaWMucmVjdXJzaXZlID0gZnVuY3Rpb24oY2xvbmUpIHtcclxuXHJcblx0XHRyZXR1cm4gbWVyZ2UoY2xvbmUgPT09IHRydWUsIHRydWUsIGFyZ3VtZW50cyk7XHJcblxyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsb25lIHRoZSBpbnB1dCByZW1vdmluZyBhbnkgcmVmZXJlbmNlXHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHJldHVybiBtaXhlZFxyXG5cdCAqL1xyXG5cclxuXHRQdWJsaWMuY2xvbmUgPSBmdW5jdGlvbihpbnB1dCkge1xyXG5cclxuXHRcdHZhciBvdXRwdXQgPSBpbnB1dCxcclxuXHRcdFx0dHlwZSA9IHR5cGVPZihpbnB1dCksXHJcblx0XHRcdGluZGV4LCBzaXplO1xyXG5cclxuXHRcdGlmICh0eXBlID09PSAnYXJyYXknKSB7XHJcblxyXG5cdFx0XHRvdXRwdXQgPSBbXTtcclxuXHRcdFx0c2l6ZSA9IGlucHV0Lmxlbmd0aDtcclxuXHJcblx0XHRcdGZvciAoaW5kZXg9MDtpbmRleDxzaXplOysraW5kZXgpXHJcblxyXG5cdFx0XHRcdG91dHB1dFtpbmRleF0gPSBQdWJsaWMuY2xvbmUoaW5wdXRbaW5kZXhdKTtcclxuXHJcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKSB7XHJcblxyXG5cdFx0XHRvdXRwdXQgPSB7fTtcclxuXHJcblx0XHRcdGZvciAoaW5kZXggaW4gaW5wdXQpXHJcblxyXG5cdFx0XHRcdG91dHB1dFtpbmRleF0gPSBQdWJsaWMuY2xvbmUoaW5wdXRbaW5kZXhdKTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG91dHB1dDtcclxuXHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9iamVjdHMgcmVjdXJzaXZlbHlcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcGFyYW0gbWl4ZWQgZXh0ZW5kXHJcblx0ICogQHJldHVybiBtaXhlZFxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiBtZXJnZV9yZWN1cnNpdmUoYmFzZSwgZXh0ZW5kKSB7XHJcblxyXG5cdFx0aWYgKHR5cGVPZihiYXNlKSAhPT0gJ29iamVjdCcpXHJcblxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kO1xyXG5cclxuXHRcdGZvciAodmFyIGtleSBpbiBleHRlbmQpIHtcclxuXHJcblx0XHRcdGlmICh0eXBlT2YoYmFzZVtrZXldKSA9PT0gJ29iamVjdCcgJiYgdHlwZU9mKGV4dGVuZFtrZXldKSA9PT0gJ29iamVjdCcpIHtcclxuXHJcblx0XHRcdFx0YmFzZVtrZXldID0gbWVyZ2VfcmVjdXJzaXZlKGJhc2Vba2V5XSwgZXh0ZW5kW2tleV0pO1xyXG5cclxuXHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0YmFzZVtrZXldID0gZXh0ZW5kW2tleV07XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBiYXNlO1xyXG5cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHR3byBvciBtb3JlIG9iamVjdHNcclxuXHQgKiBAcGFyYW0gYm9vbCBjbG9uZVxyXG5cdCAqIEBwYXJhbSBib29sIHJlY3Vyc2l2ZVxyXG5cdCAqIEBwYXJhbSBhcnJheSBhcmd2XHJcblx0ICogQHJldHVybiBvYmplY3RcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gbWVyZ2UoY2xvbmUsIHJlY3Vyc2l2ZSwgYXJndikge1xyXG5cclxuXHRcdHZhciByZXN1bHQgPSBhcmd2WzBdLFxyXG5cdFx0XHRzaXplID0gYXJndi5sZW5ndGg7XHJcblxyXG5cdFx0aWYgKGNsb25lIHx8IHR5cGVPZihyZXN1bHQpICE9PSAnb2JqZWN0JylcclxuXHJcblx0XHRcdHJlc3VsdCA9IHt9O1xyXG5cclxuXHRcdGZvciAodmFyIGluZGV4PTA7aW5kZXg8c2l6ZTsrK2luZGV4KSB7XHJcblxyXG5cdFx0XHR2YXIgaXRlbSA9IGFyZ3ZbaW5kZXhdLFxyXG5cclxuXHRcdFx0XHR0eXBlID0gdHlwZU9mKGl0ZW0pO1xyXG5cclxuXHRcdFx0aWYgKHR5cGUgIT09ICdvYmplY3QnKSBjb250aW51ZTtcclxuXHJcblx0XHRcdGZvciAodmFyIGtleSBpbiBpdGVtKSB7XHJcblxyXG5cdFx0XHRcdHZhciBzaXRlbSA9IGNsb25lID8gUHVibGljLmNsb25lKGl0ZW1ba2V5XSkgOiBpdGVtW2tleV07XHJcblxyXG5cdFx0XHRcdGlmIChyZWN1cnNpdmUpIHtcclxuXHJcblx0XHRcdFx0XHRyZXN1bHRba2V5XSA9IG1lcmdlX3JlY3Vyc2l2ZShyZXN1bHRba2V5XSwgc2l0ZW0pO1xyXG5cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHRcdHJlc3VsdFtrZXldID0gc2l0ZW07XHJcblxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdHlwZSBvZiB2YXJpYWJsZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEByZXR1cm4gc3RyaW5nXHJcblx0ICpcclxuXHQgKiBAc2VlIGh0dHA6Ly9qc3BlcmYuY29tL3R5cGVvZnZhclxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiB0eXBlT2YoaW5wdXQpIHtcclxuXHJcblx0XHRyZXR1cm4gKHt9KS50b1N0cmluZy5jYWxsKGlucHV0KS5zbGljZSg4LCAtMSkudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0fVxyXG5cclxuXHRpZiAoaXNOb2RlKSB7XHJcblxyXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBQdWJsaWM7XHJcblxyXG5cdH0gZWxzZSB7XHJcblxyXG5cdFx0d2luZG93W3B1YmxpY05hbWVdID0gUHVibGljO1xyXG5cclxuXHR9XHJcblxyXG59KSh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cyk7IiwiaW1wb3J0IF9tZXJnZSBmcm9tICdtZXJnZSc7XG5cblxuLyoqXG4gKiBSZWN1cnNpdmVseSBtZXJnZSBvYmplY3RzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdHMgdG8gbWVyZ2VcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIG1lcmdlZCBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZSguLi5wYXJhbXMpICB7XG4gIHJldHVybiBfbWVyZ2UucmVjdXJzaXZlKHRydWUsIC4uLnBhcmFtcyk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgc2tpcHBlZCBwcm9wZXJ0aWVzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgb2JqZWN0IHRvIHNraXAgcHJvcGVydGllcyBmcm9tXG4gKiBAcGFyYW0ge1tTdHJpbmddfSBrZXlzIGtleXMgb2YgdGhlIHByb3BlcnRpZXMgdG8gc2tpcFxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgb2JqZWN0IHdpdGggdGhlIHByb3BlcnRpZXMgc2tpcHBlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2tpcChvYmosIGtleXMpIHtcbiAgY29uc3Qgc2tpcHBlZCA9IHt9O1xuICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goKG9iaktleSkgPT4ge1xuICAgIGlmIChrZXlzLmluZGV4T2Yob2JqS2V5KSA9PT0gLTEpIHtcbiAgICAgIHNraXBwZWRbb2JqS2V5XSA9IG9ialtvYmpLZXldO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBza2lwcGVkO1xufVxuIiwiY29uc3QgaWRlbnRpdHkgID0gcmVzcG9uc2UgPT4gcmVzcG9uc2U7XG5jb25zdCByZWplY3Rpb24gPSBlcnIgPT4gUHJvbWlzZS5yZWplY3QoZXJyKTtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaWRkbGV3YXJlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fYmVmb3JlICA9IFtdO1xuICAgIHRoaXMuX2FmdGVyICAgPSBbXTtcbiAgICB0aGlzLl9maW5hbGx5ID0gW107XG4gIH1cblxuICBiZWZvcmUoZm4pIHtcbiAgICB0aGlzLl9iZWZvcmUucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXMuX2JlZm9yZS5sZW5ndGggLSAxO1xuICB9XG5cbiAgYWZ0ZXIoZnVsZmlsbCA9IGlkZW50aXR5LCByZWplY3QgPSByZWplY3Rpb24pIHtcbiAgICB0aGlzLl9hZnRlci5wdXNoKHsgZnVsZmlsbCwgcmVqZWN0IH0pO1xuICAgIHJldHVybiB0aGlzLl9hZnRlci5sZW5ndGggLSAxO1xuICB9XG5cbiAgZmluYWxseShmbikge1xuICAgIHRoaXMuX2ZpbmFsbHkucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXMuX2ZpbmFsbHkubGVuZ3RoIC0gMTtcbiAgfVxuXG4gIHJlc29sdmVCZWZvcmUoY29uZmlnKSB7XG4gICAgY29uc3QgY2hhaW4gPSAocHJvbWlzZSwgdGFzaykgPT4gcHJvbWlzZS50aGVuKHRhc2spO1xuICAgIHJldHVybiB0aGlzLl9iZWZvcmUucmVkdWNlKGNoYWluLCBQcm9taXNlLnJlc29sdmUoY29uZmlnKSk7XG4gIH1cblxuICByZXNvbHZlQWZ0ZXIoZXJyLCByZXNwb25zZSkge1xuICAgIGNvbnN0IGNoYWluICAgPSAocHJvbWlzZSwgdGFzaykgPT4gcHJvbWlzZS50aGVuKHRhc2suZnVsZmlsbCwgdGFzay5yZWplY3QpO1xuICAgIGNvbnN0IGluaXRpYWwgPSBlcnIgPyBQcm9taXNlLnJlamVjdChlcnIpIDogUHJvbWlzZS5yZXNvbHZlKHJlc3BvbnNlKTtcbiAgICByZXR1cm4gdGhpcy5fYWZ0ZXIucmVkdWNlKGNoYWluLCBpbml0aWFsKTtcbiAgfVxuXG5cbiAgcmVzb2x2ZUZpbmFsbHkoKSB7XG4gICAgdGhpcy5fZmluYWxseS5mb3JFYWNoKHRhc2sgPT4gdGFzaygpKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgbWVyZ2UgfSBmcm9tICcuL3V0aWxzJztcblxuXG5jb25zdCBERUZBVUxUX0hFQURFUlMgPSB7XG4gICdBY2NlcHQnICAgICAgOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9wbGFpbiwgKi8qJywgLy8gZXNsaW50LWRpc2FibGUtbGluZSBxdW90ZS1wcm9wc1xuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb25maWcge1xuICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgIHRoaXMuX2RlZmF1bHRzID0gbWVyZ2Uoe30sIHsgaGVhZGVyczogREVGQVVMVF9IRUFERVJTIH0pO1xuICAgIHRoaXMuX2NvbmZpZyAgID0ge307XG5cbiAgICB0aGlzLnNldChjb25maWcpO1xuICB9XG5cbiAgbWVyZ2VXaXRoRGVmYXVsdHMoLi4uY29uZmlnUGFyYW1zKSB7XG4gICAgY29uc3QgY29uZmlnID0gbWVyZ2UodGhpcy5fZGVmYXVsdHMsIHRoaXMuX2NvbmZpZywgLi4uY29uZmlnUGFyYW1zKTtcbiAgICBpZiAoXG4gICAgICB0eXBlb2YgY29uZmlnLmJvZHkgPT09ICdvYmplY3QnICYmXG4gICAgICBjb25maWcuaGVhZGVycyAmJlxuICAgICAgY29uZmlnLmhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID09PSAnYXBwbGljYXRpb24vanNvbidcbiAgICApIHtcbiAgICAgIGNvbmZpZy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoY29uZmlnLmJvZHkpO1xuICAgIH1cbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgc2V0KGNvbmZpZykge1xuICAgIHRoaXMuX2NvbmZpZyA9IG1lcmdlKHRoaXMuX2NvbmZpZywgY29uZmlnKTtcbiAgfVxuXG4gIGdldCgpIHtcbiAgICByZXR1cm4gbWVyZ2UodGhpcy5fZGVmYXVsdHMsIHRoaXMuX2NvbmZpZyk7XG4gIH1cbn1cbiIsIi8qKlxuICogV3JhcCBhIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIHJlc3BvbnNlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHJlYWRlciB0eXBlIG9mIHJlYWRlciB0byB1c2Ugb24gcmVzcG9uc2UgYm9keVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZXMgdG8gdGhlIHdyYXBwZWQgcmVhZCByZXNwb25zZVxuICovXG5mdW5jdGlvbiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsIHJlYWRlcikge1xuICBjb25zdCByZXMgPSB7XG4gICAgaGVhZGVycyAgIDogcmVzcG9uc2UuaGVhZGVycyxcbiAgICBzdGF0dXMgICAgOiByZXNwb25zZS5zdGF0dXMsXG4gICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dFxuICB9O1xuXG4gIGlmIChyZWFkZXIgPT09ICdyYXcnKSB7XG4gICAgcmVzLmRhdGEgPSByZXNwb25zZS5ib2R5O1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2VbcmVhZGVyXSgpXG4gIC50aGVuKChkYXRhKSA9PiB7XG4gICAgcmVzLmRhdGEgPSBkYXRhO1xuICAgIHJldHVybiByZXM7XG4gIH0pO1xufVxuXG4vKipcbiAqIFJlYWRzIG9yIHJlamVjdHMgYSBmZXRjaCByZXNwb25zZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSByZXNwb25zZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSByZWFkZXIgdHlwZSBvZiByZWFkZXIgdG8gdXNlIG9uIHJlc3BvbnNlIGJvZHlcbiAqIEByZXR1cm4ge1Byb21pc2V9IHJlYWQgb3IgcmVqZWN0aW9uIHByb21pc2VcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlLCByZWFkZXIpIHtcbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIGNvbnN0IGVyciAgICAgICA9IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICBlcnIuc3RhdHVzICAgICAgPSByZXNwb25zZS5zdGF0dXM7XG4gICAgZXJyLnN0YXR1c1RleHQgID0gcmVzcG9uc2Uuc3RhdHVzVGV4dDtcbiAgICBlcnIuaGVhZGVycyAgICAgPSByZXNwb25zZS5oZWFkZXJzO1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICB9XG4gIGlmIChyZWFkZXIpIHtcbiAgICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCByZWFkZXIpO1xuICB9XG5cbiAgY29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gIGlmIChjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmNsdWRlcygnYXBwbGljYXRpb24vanNvbicpKSB7XG4gICAgcmV0dXJuIHdyYXBSZXNwb25zZShyZXNwb25zZSwgJ2pzb24nKTtcbiAgfVxuICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCAndGV4dCcpO1xufVxuIiwiaW1wb3J0ICdpc29tb3JwaGljLWZldGNoJztcblxuaW1wb3J0IHsgZm9ybWF0IGFzIGZvcm1hdFVybCB9IGZyb20gJy4vaGVscGVycy91cmwtaGFuZGxlcic7XG5pbXBvcnQgeyBza2lwLCBtZXJnZSB9ICAgICAgICAgZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgTWlkZGxld2FyZSAgICAgICAgICAgICAgZnJvbSAnLi9taWRkbGV3YXJlJztcbmltcG9ydCBDb25maWcgICAgICAgICAgICAgICAgICBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgcmVzcG9uc2VIYW5kbGVyICAgICAgICAgZnJvbSAnLi9oZWxwZXJzL3Jlc3BvbnNlLWhhbmRsZXInO1xuXG5cbmNsYXNzIFRyYWUge1xuICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgIHRoaXMuX21pZGRsZXdhcmUgPSBuZXcgTWlkZGxld2FyZSgpO1xuICAgIHRoaXMuX2NvbmZpZyAgICAgPSBuZXcgQ29uZmlnKHNraXAoY29uZmlnLCBbJ2Jhc2VVcmwnXSkpO1xuXG4gICAgdGhpcy5iYXNlVXJsKGNvbmZpZy5iYXNlVXJsIHx8ICcnKTtcbiAgICB0aGlzLl9pbml0TWV0aG9kc1dpdGhCb2R5KCk7XG4gICAgdGhpcy5faW5pdE1ldGhvZHNXaXRoTm9Cb2R5KCk7XG4gICAgdGhpcy5faW5pdE1pZGRsZXdhcmVNZXRob2RzKCk7XG4gIH1cblxuICBjcmVhdGUoY29uZmlnKSB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihtZXJnZSh0aGlzLmRlZmF1bHRzKCksIGNvbmZpZykpO1xuICAgIGNvbnN0IG1hcEFmdGVyID0gKHsgZnVsZmlsbCwgcmVqZWN0IH0pID0+IGluc3RhbmNlLmFmdGVyKGZ1bGZpbGwsIHJlamVjdCk7XG4gICAgdGhpcy5fbWlkZGxld2FyZS5fYmVmb3JlLmZvckVhY2goaW5zdGFuY2UuYmVmb3JlKTtcbiAgICB0aGlzLl9taWRkbGV3YXJlLl9hZnRlci5mb3JFYWNoKG1hcEFmdGVyKTtcbiAgICB0aGlzLl9taWRkbGV3YXJlLl9maW5hbGx5LmZvckVhY2goaW5zdGFuY2UuZmluYWxseSk7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgZGVmYXVsdHMoY29uZmlnKSB7XG4gICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBjb25zdCBkZWZhdWx0cyA9IHRoaXMuX2NvbmZpZy5nZXQoKTtcbiAgICAgIHRoaXMuYmFzZVVybCgpICYmIChkZWZhdWx0cy5iYXNlVXJsID0gdGhpcy5iYXNlVXJsKCkpO1xuICAgICAgcmV0dXJuIGRlZmF1bHRzO1xuICAgIH1cbiAgICB0aGlzLl9jb25maWcuc2V0KHNraXAoY29uZmlnLCBbJ2Jhc2VVcmwnXSkpO1xuICAgIGNvbmZpZy5iYXNlVXJsICYmIHRoaXMuYmFzZVVybChjb25maWcuYmFzZVVybCk7XG4gICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5nZXQoKTtcbiAgfVxuXG4gIGJhc2VVcmwoYmFzZVVybCkge1xuICAgIGlmICh0eXBlb2YgYmFzZVVybCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLl9iYXNlVXJsO1xuICAgIH1cbiAgICB0aGlzLl9iYXNlVXJsID0gYmFzZVVybDtcbiAgICByZXR1cm4gdGhpcy5fYmFzZVVybDtcbiAgfVxuXG4gIHJlcXVlc3QoY29uZmlnID0ge30pIHtcbiAgICBjb25maWcubWV0aG9kIHx8IChjb25maWcubWV0aG9kID0gJ2dldCcpO1xuICAgIGNvbnN0IG1lcmdlZENvbmZpZyA9IHRoaXMuX2NvbmZpZy5tZXJnZVdpdGhEZWZhdWx0cyhjb25maWcpO1xuICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdFVybCh0aGlzLl9iYXNlVXJsLCBjb25maWcudXJsLCBjb25maWcucGFyYW1zKTtcblxuICAgIHJldHVybiB0aGlzLl9mZXRjaCh1cmwsIG1lcmdlZENvbmZpZyk7XG4gIH1cblxuICBfZmV0Y2godXJsLCBjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlQmVmb3JlKGNvbmZpZylcbiAgICAudGhlbihjb25maWcgPT4gZmV0Y2godXJsLCBjb25maWcpKVxuICAgIC50aGVuKHJlcyA9PiByZXNwb25zZUhhbmRsZXIocmVzLCBjb25maWcuYm9keVR5cGUpKVxuICAgIC50aGVuKFxuICAgICAgcmVzID0+IHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUFmdGVyKHVuZGVmaW5lZCwgcmVzKSxcbiAgICAgIGVyciA9PiB0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVBZnRlcihlcnIpXG4gICAgKVxuICAgIC50aGVuKFxuICAgICAgcmVzID0+IFByb21pc2UucmVzb2x2ZSh0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVGaW5hbGx5KCkpLnRoZW4oKCkgPT4gcmVzKSxcbiAgICAgIGVyciA9PiBQcm9taXNlLnJlc29sdmUodGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlRmluYWxseSgpKS50aGVuKCgpID0+IHsgdGhyb3cgZXJyOyB9KVxuICAgICk7XG4gIH1cblxuICBfaW5pdE1ldGhvZHNXaXRoTm9Cb2R5KCkge1xuICAgIFsnZ2V0JywgJ2RlbGV0ZScsICdoZWFkJ10uZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICB0aGlzW21ldGhvZF0gPSAocGF0aCwgY29uZmlnID0ge30pID0+IHtcbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlV2l0aERlZmF1bHRzKGNvbmZpZywgeyBtZXRob2QgfSk7XG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdFVybCh0aGlzLl9iYXNlVXJsLCBwYXRoLCBjb25maWcucGFyYW1zKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIF9pbml0TWV0aG9kc1dpdGhCb2R5KCkge1xuICAgIFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIHRoaXNbbWV0aG9kXSA9IChwYXRoLCBib2R5LCBjb25maWcpID0+IHtcbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlV2l0aERlZmF1bHRzKGNvbmZpZywgeyBib2R5LCBtZXRob2QgfSk7XG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdFVybCh0aGlzLl9iYXNlVXJsLCBwYXRoKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIF9pbml0TWlkZGxld2FyZU1ldGhvZHMoKSB7XG4gICAgWydiZWZvcmUnLCAnYWZ0ZXInLCAnZmluYWxseSddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgdGhpc1ttZXRob2RdID0gKC4uLmFyZ3MpID0+IHRoaXMuX21pZGRsZXdhcmVbbWV0aG9kXSguLi5hcmdzKTtcbiAgICB9KTtcbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBUcmFlKCk7XG4iXSwibmFtZXMiOlsic2VsZiIsImZldGNoIiwic3VwcG9ydCIsIlN5bWJvbCIsIkJsb2IiLCJlIiwiYXJyYXlCdWZmZXIiLCJ2aWV3Q2xhc3NlcyIsImlzRGF0YVZpZXciLCJvYmoiLCJEYXRhVmlldyIsInByb3RvdHlwZSIsImlzUHJvdG90eXBlT2YiLCJpc0FycmF5QnVmZmVyVmlldyIsIkFycmF5QnVmZmVyIiwiaXNWaWV3IiwiaW5kZXhPZiIsIk9iamVjdCIsInRvU3RyaW5nIiwiY2FsbCIsIm5vcm1hbGl6ZU5hbWUiLCJuYW1lIiwiU3RyaW5nIiwidGVzdCIsIlR5cGVFcnJvciIsInRvTG93ZXJDYXNlIiwibm9ybWFsaXplVmFsdWUiLCJ2YWx1ZSIsIml0ZXJhdG9yRm9yIiwiaXRlbXMiLCJpdGVyYXRvciIsInNoaWZ0IiwiZG9uZSIsInVuZGVmaW5lZCIsIml0ZXJhYmxlIiwiSGVhZGVycyIsImhlYWRlcnMiLCJtYXAiLCJmb3JFYWNoIiwiYXBwZW5kIiwiZ2V0T3duUHJvcGVydHlOYW1lcyIsIm9sZFZhbHVlIiwiZ2V0IiwiaGFzIiwiaGFzT3duUHJvcGVydHkiLCJzZXQiLCJjYWxsYmFjayIsInRoaXNBcmciLCJrZXlzIiwicHVzaCIsInZhbHVlcyIsImVudHJpZXMiLCJjb25zdW1lZCIsImJvZHkiLCJib2R5VXNlZCIsIlByb21pc2UiLCJyZWplY3QiLCJmaWxlUmVhZGVyUmVhZHkiLCJyZWFkZXIiLCJyZXNvbHZlIiwib25sb2FkIiwicmVzdWx0Iiwib25lcnJvciIsImVycm9yIiwicmVhZEJsb2JBc0FycmF5QnVmZmVyIiwiYmxvYiIsIkZpbGVSZWFkZXIiLCJwcm9taXNlIiwicmVhZEFzQXJyYXlCdWZmZXIiLCJyZWFkQmxvYkFzVGV4dCIsInJlYWRBc1RleHQiLCJyZWFkQXJyYXlCdWZmZXJBc1RleHQiLCJidWYiLCJ2aWV3IiwiVWludDhBcnJheSIsImNoYXJzIiwiQXJyYXkiLCJsZW5ndGgiLCJpIiwiZnJvbUNoYXJDb2RlIiwiam9pbiIsImJ1ZmZlckNsb25lIiwic2xpY2UiLCJieXRlTGVuZ3RoIiwiYnVmZmVyIiwiQm9keSIsIl9pbml0Qm9keSIsIl9ib2R5SW5pdCIsIl9ib2R5VGV4dCIsIl9ib2R5QmxvYiIsImZvcm1EYXRhIiwiRm9ybURhdGEiLCJfYm9keUZvcm1EYXRhIiwic2VhcmNoUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiX2JvZHlBcnJheUJ1ZmZlciIsIkVycm9yIiwidHlwZSIsInJlamVjdGVkIiwidGhlbiIsInRleHQiLCJkZWNvZGUiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwibWV0aG9kcyIsIm5vcm1hbGl6ZU1ldGhvZCIsIm1ldGhvZCIsInVwY2FzZWQiLCJ0b1VwcGVyQ2FzZSIsIlJlcXVlc3QiLCJpbnB1dCIsIm9wdGlvbnMiLCJ1cmwiLCJjcmVkZW50aWFscyIsIm1vZGUiLCJyZWZlcnJlciIsImNsb25lIiwiZm9ybSIsInRyaW0iLCJzcGxpdCIsImJ5dGVzIiwicmVwbGFjZSIsImRlY29kZVVSSUNvbXBvbmVudCIsInBhcnNlSGVhZGVycyIsInJhd0hlYWRlcnMiLCJsaW5lIiwicGFydHMiLCJrZXkiLCJSZXNwb25zZSIsImJvZHlJbml0Iiwic3RhdHVzIiwib2siLCJzdGF0dXNUZXh0IiwicmVzcG9uc2UiLCJyZWRpcmVjdFN0YXR1c2VzIiwicmVkaXJlY3QiLCJSYW5nZUVycm9yIiwibG9jYXRpb24iLCJpbml0IiwicmVxdWVzdCIsInhociIsIlhNTEh0dHBSZXF1ZXN0IiwiZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIiwicmVzcG9uc2VVUkwiLCJyZXNwb25zZVRleHQiLCJvbnRpbWVvdXQiLCJvcGVuIiwid2l0aENyZWRlbnRpYWxzIiwicmVzcG9uc2VUeXBlIiwic2V0UmVxdWVzdEhlYWRlciIsInNlbmQiLCJwb2x5ZmlsbCIsInRoaXMiLCJiaW5kIiwiaGV4VGFibGUiLCJhcnJheSIsInNvdXJjZSIsInBsYWluT2JqZWN0cyIsImNyZWF0ZSIsInRhcmdldCIsImlzQXJyYXkiLCJjb25jYXQiLCJtZXJnZVRhcmdldCIsImV4cG9ydHMiLCJhcnJheVRvT2JqZWN0IiwiaXRlbSIsImJhYmVsSGVscGVycy50eXBlb2YiLCJtZXJnZSIsInJlZHVjZSIsImFjYyIsInN0ciIsInN0cmluZyIsIm91dCIsImMiLCJjaGFyQ29kZUF0IiwiY2hhckF0IiwicmVmZXJlbmNlcyIsInJlZnMiLCJsb29rdXAiLCJjb21wYWN0ZWQiLCJjb21wYWN0IiwiY29uc3RydWN0b3IiLCJpc0J1ZmZlciIsInBlcmNlbnRUd2VudGllcyIsInV0aWxzIiwicmVxdWlyZSQkMCIsImZvcm1hdHMiLCJyZXF1aXJlJCQxIiwiYXJyYXlQcmVmaXhHZW5lcmF0b3JzIiwiYnJhY2tldHMiLCJwcmVmaXgiLCJpbmRpY2VzIiwicmVwZWF0IiwidG9JU08iLCJEYXRlIiwidG9JU09TdHJpbmciLCJkZWZhdWx0cyIsImVuY29kZSIsInNlcmlhbGl6ZURhdGUiLCJkYXRlIiwic3RyaW5naWZ5Iiwib2JqZWN0IiwiZ2VuZXJhdGVBcnJheVByZWZpeCIsInN0cmljdE51bGxIYW5kbGluZyIsInNraXBOdWxscyIsImVuY29kZXIiLCJmaWx0ZXIiLCJzb3J0IiwiYWxsb3dEb3RzIiwiZm9ybWF0dGVyIiwib2JqS2V5cyIsIm9wdHMiLCJkZWxpbWl0ZXIiLCJmb3JtYXQiLCJkZWZhdWx0IiwiZm9ybWF0dGVycyIsImFycmF5Rm9ybWF0IiwicGFyc2VWYWx1ZXMiLCJwYXJhbWV0ZXJMaW1pdCIsIkluZmluaXR5IiwicGFydCIsInBvcyIsInZhbCIsImRlY29kZXIiLCJwYXJzZU9iamVjdCIsImNoYWluIiwicm9vdCIsImNsZWFuUm9vdCIsImluZGV4IiwicGFyc2VJbnQiLCJpc05hTiIsInBhcnNlQXJyYXlzIiwiYXJyYXlMaW1pdCIsInBhcnNlS2V5cyIsImdpdmVuS2V5IiwicGFyZW50IiwiY2hpbGQiLCJzZWdtZW50IiwiZXhlYyIsImFsbG93UHJvdG90eXBlcyIsImRlcHRoIiwiaXNSZWdFeHAiLCJ0ZW1wT2JqIiwibmV3T2JqIiwicmVxdWlyZSQkMiIsImNvbmNhdFBhcmFtcyIsIlVSTCIsInBhcmFtcyIsInN0cmluZ2lmeVBhcmFtcyIsImNvbWJpbmUiLCJiYXNlVVJMIiwicmVsYXRpdmVVUkwiLCJpc0Fic29sdXRlIiwiYmFzZVVybCIsImlzTm9kZSIsIlB1YmxpYyIsImFyZ3VtZW50cyIsInB1YmxpY05hbWUiLCJyZWN1cnNpdmUiLCJvdXRwdXQiLCJ0eXBlT2YiLCJzaXplIiwibWVyZ2VfcmVjdXJzaXZlIiwiYmFzZSIsImV4dGVuZCIsImFyZ3YiLCJzaXRlbSIsIm1vZHVsZSIsIl9tZXJnZSIsInNraXAiLCJza2lwcGVkIiwib2JqS2V5IiwiaWRlbnRpdHkiLCJyZWplY3Rpb24iLCJlcnIiLCJNaWRkbGV3YXJlIiwiX2JlZm9yZSIsIl9hZnRlciIsIl9maW5hbGx5IiwiZm4iLCJmdWxmaWxsIiwiY29uZmlnIiwidGFzayIsImluaXRpYWwiLCJERUZBVUxUX0hFQURFUlMiLCJDb25maWciLCJfZGVmYXVsdHMiLCJfY29uZmlnIiwiY29uZmlnUGFyYW1zIiwid3JhcFJlc3BvbnNlIiwicmVzIiwiZGF0YSIsInJlc3BvbnNlSGFuZGxlciIsImNvbnRlbnRUeXBlIiwiaW5jbHVkZXMiLCJUcmFlIiwiX21pZGRsZXdhcmUiLCJfaW5pdE1ldGhvZHNXaXRoQm9keSIsIl9pbml0TWV0aG9kc1dpdGhOb0JvZHkiLCJfaW5pdE1pZGRsZXdhcmVNZXRob2RzIiwiaW5zdGFuY2UiLCJtYXBBZnRlciIsImFmdGVyIiwiYmVmb3JlIiwiZmluYWxseSIsIl9iYXNlVXJsIiwibWVyZ2VkQ29uZmlnIiwibWVyZ2VXaXRoRGVmYXVsdHMiLCJmb3JtYXRVcmwiLCJfZmV0Y2giLCJyZXNvbHZlQmVmb3JlIiwiYm9keVR5cGUiLCJyZXNvbHZlQWZ0ZXIiLCJyZXNvbHZlRmluYWxseSIsInBhdGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLENBQUMsVUFBU0EsSUFBVCxFQUFlOzs7TUFHVkEsS0FBS0MsS0FBVCxFQUFnQjs7OztNQUlaQyxVQUFVO2tCQUNFLHFCQUFxQkYsSUFEdkI7Y0FFRixZQUFZQSxJQUFaLElBQW9CLGNBQWNHLE1BRmhDO1VBR04sZ0JBQWdCSCxJQUFoQixJQUF3QixVQUFVQSxJQUFsQyxJQUEyQyxZQUFXO1VBQ3REO1lBQ0VJLElBQUo7ZUFDTyxJQUFQO09BRkYsQ0FHRSxPQUFNQyxDQUFOLEVBQVM7ZUFDRixLQUFQOztLQUw0QyxFQUhwQztjQVdGLGNBQWNMLElBWFo7aUJB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
