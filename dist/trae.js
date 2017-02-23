/**
 * Trae, the fetch library!
 *
 * @version: 1.1.3
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

    if (input instanceof Request) {
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
    } else {
      this.url = String(input);
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
    rawHeaders.split(/\r?\n/).forEach(function (line) {
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





var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

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
            out += hexTable[0xF0 | c >> 18] + hexTable[0x80 | c >> 12 & 0x3F] + hexTable[0x80 | c >> 6 & 0x3F] + hexTable[0x80 | c & 0x3F]; // eslint-disable-line max-len
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
        // eslint-disable-line func-name-matching
        return prefix + '[]';
    },
    indices: function indices(prefix, key) {
        // eslint-disable-line func-name-matching
        return prefix + '[' + key + ']';
    },
    repeat: function repeat(prefix) {
        // eslint-disable-line func-name-matching
        return prefix;
    }
};

var toISO = Date.prototype.toISOString;

var defaults$$1 = {
    delimiter: '&',
    encode: true,
    encoder: utils.encode,
    serializeDate: function serializeDate(date) {
        // eslint-disable-line func-name-matching
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

var stringify$1 = function stringify( // eslint-disable-line func-name-matching
object, prefix, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter) {
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

    if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

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

var parseValues = function parseQueryStringValues(str, options) {
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

var parseObject = function parseObjectRecursive(chain, val, options) {
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
        var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
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

var parseKeys = function parseQueryStringKeys(givenKey, val, options) {
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

    // The regex chunks

    var parent = /^([^[]*)/;
    var child = /(\[[^[\]]*])/g;

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
        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
            if (!options.allowPrototypes) {
                return;
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
  var result = {};
  Object.keys(obj).filter(function (key) {
    return !keys.includes(key);
  }).forEach(function (key) {
    result[key] = obj[key];
  });
  return result;
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
    value: function resolveFinally(config, url) {
      this._finally.forEach(function (task) {
        return task(config, url);
      });
    }
  }]);
  return Middleware;
}();

var Config = function () {
  function Config() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    classCallCheck(this, Config);

    this._config = { headers: {} };

    this.set(config);
  }

  createClass(Config, [{
    key: 'merge',
    value: function merge$$1() {
      var params = merge.apply(undefined, arguments);

      var config = merge(this.skipNotUsedMethods(params.method), this._config[params.method], params);

      if (_typeof(config.body) === 'object' && config.headers && config.headers['Content-Type'] === 'application/json') {
        config.body = JSON.stringify(config.body);
      }
      return config;
    }
  }, {
    key: 'skipNotUsedMethods',
    value: function skipNotUsedMethods(currentMethod) {
      var notUsedMethods = ['delete', 'get', 'head', 'patch', 'post', 'put'].filter(function (method) {
        return currentMethod !== method.toLowerCase();
      });
      return skip(this._config, notUsedMethods);
    }
  }, {
    key: 'set',
    value: function set$$1(config) {
      this._config = merge(this._config, config);
    }
  }, {
    key: 'get',
    value: function get$$1() {
      return merge(this._config);
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
      var mergedConfig = this._config.merge(config);
      var url = format(this._baseUrl, config.url, config.params);

      return this._fetch(url, mergedConfig);
    }
  }, {
    key: '_fetch',
    value: function _fetch(url, config) {
      var _this = this;

      var resolveFinally = function resolveFinally() {
        var _middleware;

        return (_middleware = _this._middleware).resolveFinally.apply(_middleware, arguments);
      };

      return this._middleware.resolveBefore(config).then(function (config) {
        return fetch(url, config);
      }).then(function (res) {
        return responseHandler(res, config.bodyType);
      }).then(function (res) {
        return _this._middleware.resolveAfter(undefined, res);
      }, function (err) {
        return _this._middleware.resolveAfter(err);
      }).then(function (res) {
        return Promise.resolve(resolveFinally(config, url)).then(function () {
          return res;
        });
      }, function (err) {
        return Promise.resolve(resolveFinally(config, url)).then(function () {
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

          var mergedConfig = _this2._config.merge(config, { method: method });
          var url = format(_this2._baseUrl, path, config.params);

          return _this2._fetch(url, mergedConfig);
        };
      });
    }
  }, {
    key: '_initMethodsWithBody',
    value: function _initMethodsWithBody() {
      var _this3 = this;

      var defaultConf = { headers: { 'Content-Type': 'application/json' } };

      ['post', 'put', 'patch'].forEach(function (method) {
        _this3._config.set(defineProperty({}, method, defaultConf));

        _this3[method] = function (path, body, config) {
          var mergedConfig = _this3._config.merge(config, { body: body, method: method });
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
          var _middleware2;

          return (_middleware2 = _this4._middleware)[method].apply(_middleware2, arguments);
        };
      });
    }
  }]);
  return Trae;
}();

var index = new Trae();

return index;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhZS5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3doYXR3Zy1mZXRjaC9mZXRjaC5qcyIsIi4uL25vZGVfbW9kdWxlcy9pc29tb3JwaGljLWZldGNoL2ZldGNoLW5wbS1icm93c2VyaWZ5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi91dGlscy5qcyIsIi4uL25vZGVfbW9kdWxlcy9xcy9saWIvZm9ybWF0cy5qcyIsIi4uL25vZGVfbW9kdWxlcy9xcy9saWIvc3RyaW5naWZ5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi9wYXJzZS5qcyIsIi4uL25vZGVfbW9kdWxlcy9xcy9saWIvaW5kZXguanMiLCIuLi9saWIvaGVscGVycy91cmwtaGFuZGxlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9tZXJnZS9tZXJnZS5qcyIsIi4uL2xpYi91dGlscy5qcyIsIi4uL2xpYi9taWRkbGV3YXJlLmpzIiwiLi4vbGliL2NvbmZpZy5qcyIsIi4uL2xpYi9oZWxwZXJzL3Jlc3BvbnNlLWhhbmRsZXIuanMiLCIuLi9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlcikge1xuICAgIHZhciB2aWV3Q2xhc3NlcyA9IFtcbiAgICAgICdbb2JqZWN0IEludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDY0QXJyYXldJ1xuICAgIF1cblxuICAgIHZhciBpc0RhdGFWaWV3ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIERhdGFWaWV3LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iailcbiAgICB9XG5cbiAgICB2YXIgaXNBcnJheUJ1ZmZlclZpZXcgPSBBcnJheUJ1ZmZlci5pc1ZpZXcgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIHZpZXdDbGFzc2VzLmluZGV4T2YoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikpID4gLTFcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiB7ZG9uZTogdmFsdWUgPT09IHVuZGVmaW5lZCwgdmFsdWU6IHZhbHVlfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIG9sZFZhbHVlID0gdGhpcy5tYXBbbmFtZV1cbiAgICB0aGlzLm1hcFtuYW1lXSA9IG9sZFZhbHVlID8gb2xkVmFsdWUrJywnK3ZhbHVlIDogdmFsdWVcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHJldHVybiB0aGlzLmhhcyhuYW1lKSA/IHRoaXMubWFwW25hbWVdIDogbnVsbFxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShub3JtYWxpemVOYW1lKG5hbWUpKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLm1hcCkge1xuICAgICAgaWYgKHRoaXMubWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5tYXBbbmFtZV0sIG5hbWUsIHRoaXMpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2gobmFtZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkgeyBpdGVtcy5wdXNoKHZhbHVlKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKFtuYW1lLCB2YWx1ZV0pIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICBIZWFkZXJzLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID0gSGVhZGVycy5wcm90b3R5cGUuZW50cmllc1xuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEFycmF5QnVmZmVyQXNUZXh0KGJ1Zikge1xuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIHZhciBjaGFycyA9IG5ldyBBcnJheSh2aWV3Lmxlbmd0aClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hhcnNbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHZpZXdbaV0pXG4gICAgfVxuICAgIHJldHVybiBjaGFycy5qb2luKCcnKVxuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyQ2xvbmUoYnVmKSB7XG4gICAgaWYgKGJ1Zi5zbGljZSkge1xuICAgICAgcmV0dXJuIGJ1Zi5zbGljZSgwKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zi5ieXRlTGVuZ3RoKVxuICAgICAgdmlldy5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmKSlcbiAgICAgIHJldHVybiB2aWV3LmJ1ZmZlclxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHkudG9TdHJpbmcoKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIHN1cHBvcnQuYmxvYiAmJiBpc0RhdGFWaWV3KGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkuYnVmZmVyKVxuICAgICAgICAvLyBJRSAxMC0xMSBjYW4ndCBoYW5kbGUgYSBEYXRhVmlldyBib2R5LlxuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIChBcnJheUJ1ZmZlci5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSB8fCBpc0FycmF5QnVmZmVyVmlldyhib2R5KSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlCbG9iICYmIHRoaXMuX2JvZHlCbG9iLnR5cGUpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCB0aGlzLl9ib2R5QmxvYi50eXBlKVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5ibG9iKSB7XG4gICAgICB0aGlzLmJsb2IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyBibG9iJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5VGV4dF0pKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYXJyYXlCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBjb25zdW1lZCh0aGlzKSB8fCBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUFycmF5QnVmZmVyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVhZEFycmF5QnVmZmVyQXNUZXh0KHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmZvcm1EYXRhKSB7XG4gICAgICB0aGlzLmZvcm1EYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKGRlY29kZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKEpTT04ucGFyc2UpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8vIEhUVFAgbWV0aG9kcyB3aG9zZSBjYXBpdGFsaXphdGlvbiBzaG91bGQgYmUgbm9ybWFsaXplZFxuICB2YXIgbWV0aG9kcyA9IFsnREVMRVRFJywgJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnXVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldGhvZChtZXRob2QpIHtcbiAgICB2YXIgdXBjYXNlZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpXG4gICAgcmV0dXJuIChtZXRob2RzLmluZGV4T2YodXBjYXNlZCkgPiAtMSkgPyB1cGNhc2VkIDogbWV0aG9kXG4gIH1cblxuICBmdW5jdGlvbiBSZXF1ZXN0KGlucHV0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB2YXIgYm9keSA9IG9wdGlvbnMuYm9keVxuXG4gICAgaWYgKGlucHV0IGluc3RhbmNlb2YgUmVxdWVzdCkge1xuICAgICAgaWYgKGlucHV0LmJvZHlVc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpXG4gICAgICB9XG4gICAgICB0aGlzLnVybCA9IGlucHV0LnVybFxuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IGlucHV0LmNyZWRlbnRpYWxzXG4gICAgICBpZiAoIW9wdGlvbnMuaGVhZGVycykge1xuICAgICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhpbnB1dC5oZWFkZXJzKVxuICAgICAgfVxuICAgICAgdGhpcy5tZXRob2QgPSBpbnB1dC5tZXRob2RcbiAgICAgIHRoaXMubW9kZSA9IGlucHV0Lm1vZGVcbiAgICAgIGlmICghYm9keSAmJiBpbnB1dC5fYm9keUluaXQgIT0gbnVsbCkge1xuICAgICAgICBib2R5ID0gaW5wdXQuX2JvZHlJbml0XG4gICAgICAgIGlucHV0LmJvZHlVc2VkID0gdHJ1ZVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVybCA9IFN0cmluZyhpbnB1dClcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcywgeyBib2R5OiB0aGlzLl9ib2R5SW5pdCB9KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUhlYWRlcnMocmF3SGVhZGVycykge1xuICAgIHZhciBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKVxuICAgIHJhd0hlYWRlcnMuc3BsaXQoL1xccj9cXG4vKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnRzLmpvaW4oJzonKS50cmltKClcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBoZWFkZXJzXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMuc3RhdHVzID0gJ3N0YXR1cycgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzIDogMjAwXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9ICdzdGF0dXNUZXh0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXNUZXh0IDogJ09LJ1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIFJlc3BvbnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UodGhpcy5fYm9keUluaXQsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiB0aGlzLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBuZXcgSGVhZGVycyh0aGlzLmhlYWRlcnMpLFxuICAgICAgdXJsOiB0aGlzLnVybFxuICAgIH0pXG4gIH1cblxuICBSZXNwb25zZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiAwLCBzdGF0dXNUZXh0OiAnJ30pXG4gICAgcmVzcG9uc2UudHlwZSA9ICdlcnJvcidcbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfVxuXG4gIHZhciByZWRpcmVjdFN0YXR1c2VzID0gWzMwMSwgMzAyLCAzMDMsIDMwNywgMzA4XVxuXG4gIFJlc3BvbnNlLnJlZGlyZWN0ID0gZnVuY3Rpb24odXJsLCBzdGF0dXMpIHtcbiAgICBpZiAocmVkaXJlY3RTdGF0dXNlcy5pbmRleE9mKHN0YXR1cykgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBzdGF0dXMgY29kZScpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiBzdGF0dXMsIGhlYWRlcnM6IHtsb2NhdGlvbjogdXJsfX0pXG4gIH1cblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzXG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3RcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlXG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChpbnB1dCwgaW5pdClcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBwYXJzZUhlYWRlcnMoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKVxuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMudXJsID0gJ3Jlc3BvbnNlVVJMJyBpbiB4aHIgPyB4aHIucmVzcG9uc2VVUkwgOiBvcHRpb25zLmhlYWRlcnMuZ2V0KCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbiIsIi8vIHRoZSB3aGF0d2ctZmV0Y2ggcG9seWZpbGwgaW5zdGFsbHMgdGhlIGZldGNoKCkgZnVuY3Rpb25cbi8vIG9uIHRoZSBnbG9iYWwgb2JqZWN0ICh3aW5kb3cgb3Igc2VsZilcbi8vXG4vLyBSZXR1cm4gdGhhdCBhcyB0aGUgZXhwb3J0IGZvciB1c2UgaW4gV2VicGFjaywgQnJvd3NlcmlmeSBldGMuXG5yZXF1aXJlKCd3aGF0d2ctZmV0Y2gnKTtcbm1vZHVsZS5leHBvcnRzID0gc2VsZi5mZXRjaC5iaW5kKHNlbGYpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxudmFyIGhleFRhYmxlID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJyYXkgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gICAgICAgIGFycmF5LnB1c2goJyUnICsgKChpIDwgMTYgPyAnMCcgOiAnJykgKyBpLnRvU3RyaW5nKDE2KSkudG9VcHBlckNhc2UoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5O1xufSgpKTtcblxuZXhwb3J0cy5hcnJheVRvT2JqZWN0ID0gZnVuY3Rpb24gKHNvdXJjZSwgb3B0aW9ucykge1xuICAgIHZhciBvYmogPSBvcHRpb25zICYmIG9wdGlvbnMucGxhaW5PYmplY3RzID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc291cmNlLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc291cmNlW2ldICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgb2JqW2ldID0gc291cmNlW2ldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UsIG9wdGlvbnMpIHtcbiAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygc291cmNlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgICAgICB0YXJnZXQucHVzaChzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0YXJnZXQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICB0YXJnZXRbc291cmNlXSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW3RhcmdldCwgc291cmNlXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBbdGFyZ2V0XS5jb25jYXQoc291cmNlKTtcbiAgICB9XG5cbiAgICB2YXIgbWVyZ2VUYXJnZXQgPSB0YXJnZXQ7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSAmJiAhQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICAgIG1lcmdlVGFyZ2V0ID0gZXhwb3J0cy5hcnJheVRvT2JqZWN0KHRhcmdldCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSAmJiBBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgICAgc291cmNlLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0sIGkpIHtcbiAgICAgICAgICAgIGlmIChoYXMuY2FsbCh0YXJnZXQsIGkpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldFtpXSAmJiB0eXBlb2YgdGFyZ2V0W2ldID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRbaV0gPSBleHBvcnRzLm1lcmdlKHRhcmdldFtpXSwgaXRlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbaV0gPSBpdGVtO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc291cmNlKS5yZWR1Y2UoZnVuY3Rpb24gKGFjYywga2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHNvdXJjZVtrZXldO1xuXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYWNjLCBrZXkpKSB7XG4gICAgICAgICAgICBhY2Nba2V5XSA9IGV4cG9ydHMubWVyZ2UoYWNjW2tleV0sIHZhbHVlLCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjY1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCBtZXJnZVRhcmdldCk7XG59O1xuXG5leHBvcnRzLmRlY29kZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0ci5yZXBsYWNlKC9cXCsvZywgJyAnKSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuZW5jb2RlID0gZnVuY3Rpb24gKHN0cikge1xuICAgIC8vIFRoaXMgY29kZSB3YXMgb3JpZ2luYWxseSB3cml0dGVuIGJ5IEJyaWFuIFdoaXRlIChtc2NkZXgpIGZvciB0aGUgaW8uanMgY29yZSBxdWVyeXN0cmluZyBsaWJyYXJ5LlxuICAgIC8vIEl0IGhhcyBiZWVuIGFkYXB0ZWQgaGVyZSBmb3Igc3RyaWN0ZXIgYWRoZXJlbmNlIHRvIFJGQyAzOTg2XG4gICAgaWYgKHN0ci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG5cbiAgICB2YXIgc3RyaW5nID0gdHlwZW9mIHN0ciA9PT0gJ3N0cmluZycgPyBzdHIgOiBTdHJpbmcoc3RyKTtcblxuICAgIHZhciBvdXQgPSAnJztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgYyA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIGMgPT09IDB4MkQgfHwgLy8gLVxuICAgICAgICAgICAgYyA9PT0gMHgyRSB8fCAvLyAuXG4gICAgICAgICAgICBjID09PSAweDVGIHx8IC8vIF9cbiAgICAgICAgICAgIGMgPT09IDB4N0UgfHwgLy8gflxuICAgICAgICAgICAgKGMgPj0gMHgzMCAmJiBjIDw9IDB4MzkpIHx8IC8vIDAtOVxuICAgICAgICAgICAgKGMgPj0gMHg0MSAmJiBjIDw9IDB4NUEpIHx8IC8vIGEtelxuICAgICAgICAgICAgKGMgPj0gMHg2MSAmJiBjIDw9IDB4N0EpIC8vIEEtWlxuICAgICAgICApIHtcbiAgICAgICAgICAgIG91dCArPSBzdHJpbmcuY2hhckF0KGkpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYyA8IDB4ODApIHtcbiAgICAgICAgICAgIG91dCA9IG91dCArIGhleFRhYmxlW2NdO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYyA8IDB4ODAwKSB7XG4gICAgICAgICAgICBvdXQgPSBvdXQgKyAoaGV4VGFibGVbMHhDMCB8IChjID4+IDYpXSArIGhleFRhYmxlWzB4ODAgfCAoYyAmIDB4M0YpXSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjIDwgMHhEODAwIHx8IGMgPj0gMHhFMDAwKSB7XG4gICAgICAgICAgICBvdXQgPSBvdXQgKyAoaGV4VGFibGVbMHhFMCB8IChjID4+IDEyKV0gKyBoZXhUYWJsZVsweDgwIHwgKChjID4+IDYpICYgMHgzRildICsgaGV4VGFibGVbMHg4MCB8IChjICYgMHgzRildKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaSArPSAxO1xuICAgICAgICBjID0gMHgxMDAwMCArICgoKGMgJiAweDNGRikgPDwgMTApIHwgKHN0cmluZy5jaGFyQ29kZUF0KGkpICYgMHgzRkYpKTtcbiAgICAgICAgb3V0ICs9IGhleFRhYmxlWzB4RjAgfCAoYyA+PiAxOCldICsgaGV4VGFibGVbMHg4MCB8ICgoYyA+PiAxMikgJiAweDNGKV0gKyBoZXhUYWJsZVsweDgwIHwgKChjID4+IDYpICYgMHgzRildICsgaGV4VGFibGVbMHg4MCB8IChjICYgMHgzRildOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG1heC1sZW5cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xufTtcblxuZXhwb3J0cy5jb21wYWN0ID0gZnVuY3Rpb24gKG9iaiwgcmVmZXJlbmNlcykge1xuICAgIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICB2YXIgcmVmcyA9IHJlZmVyZW5jZXMgfHwgW107XG4gICAgdmFyIGxvb2t1cCA9IHJlZnMuaW5kZXhPZihvYmopO1xuICAgIGlmIChsb29rdXAgIT09IC0xKSB7XG4gICAgICAgIHJldHVybiByZWZzW2xvb2t1cF07XG4gICAgfVxuXG4gICAgcmVmcy5wdXNoKG9iaik7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICAgIHZhciBjb21wYWN0ZWQgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKG9ialtpXSAmJiB0eXBlb2Ygb2JqW2ldID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbXBhY3RlZC5wdXNoKGV4cG9ydHMuY29tcGFjdChvYmpbaV0sIHJlZnMpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG9ialtpXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb21wYWN0ZWQucHVzaChvYmpbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbXBhY3RlZDtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgb2JqW2tleV0gPSBleHBvcnRzLmNvbXBhY3Qob2JqW2tleV0sIHJlZnMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbmV4cG9ydHMuaXNSZWdFeHAgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBSZWdFeHBdJztcbn07XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgaWYgKG9iaiA9PT0gbnVsbCB8fCB0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuICEhKG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iaikpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlcGxhY2UgPSBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2U7XG52YXIgcGVyY2VudFR3ZW50aWVzID0gLyUyMC9nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAnZGVmYXVsdCc6ICdSRkMzOTg2JyxcbiAgICBmb3JtYXR0ZXJzOiB7XG4gICAgICAgIFJGQzE3Mzg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2UuY2FsbCh2YWx1ZSwgcGVyY2VudFR3ZW50aWVzLCAnKycpO1xuICAgICAgICB9LFxuICAgICAgICBSRkMzOTg2OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgUkZDMTczODogJ1JGQzE3MzgnLFxuICAgIFJGQzM5ODY6ICdSRkMzOTg2J1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGZvcm1hdHMgPSByZXF1aXJlKCcuL2Zvcm1hdHMnKTtcblxudmFyIGFycmF5UHJlZml4R2VuZXJhdG9ycyA9IHtcbiAgICBicmFja2V0czogZnVuY3Rpb24gYnJhY2tldHMocHJlZml4KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZnVuYy1uYW1lLW1hdGNoaW5nXG4gICAgICAgIHJldHVybiBwcmVmaXggKyAnW10nO1xuICAgIH0sXG4gICAgaW5kaWNlczogZnVuY3Rpb24gaW5kaWNlcyhwcmVmaXgsIGtleSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZ1bmMtbmFtZS1tYXRjaGluZ1xuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ1snICsga2V5ICsgJ10nO1xuICAgIH0sXG4gICAgcmVwZWF0OiBmdW5jdGlvbiByZXBlYXQocHJlZml4KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZnVuYy1uYW1lLW1hdGNoaW5nXG4gICAgICAgIHJldHVybiBwcmVmaXg7XG4gICAgfVxufTtcblxudmFyIHRvSVNPID0gRGF0ZS5wcm90b3R5cGUudG9JU09TdHJpbmc7XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgICBkZWxpbWl0ZXI6ICcmJyxcbiAgICBlbmNvZGU6IHRydWUsXG4gICAgZW5jb2RlcjogdXRpbHMuZW5jb2RlLFxuICAgIHNlcmlhbGl6ZURhdGU6IGZ1bmN0aW9uIHNlcmlhbGl6ZURhdGUoZGF0ZSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGZ1bmMtbmFtZS1tYXRjaGluZ1xuICAgICAgICByZXR1cm4gdG9JU08uY2FsbChkYXRlKTtcbiAgICB9LFxuICAgIHNraXBOdWxsczogZmFsc2UsXG4gICAgc3RyaWN0TnVsbEhhbmRsaW5nOiBmYWxzZVxufTtcblxudmFyIHN0cmluZ2lmeSA9IGZ1bmN0aW9uIHN0cmluZ2lmeSggLy8gZXNsaW50LWRpc2FibGUtbGluZSBmdW5jLW5hbWUtbWF0Y2hpbmdcbiAgICBvYmplY3QsXG4gICAgcHJlZml4LFxuICAgIGdlbmVyYXRlQXJyYXlQcmVmaXgsXG4gICAgc3RyaWN0TnVsbEhhbmRsaW5nLFxuICAgIHNraXBOdWxscyxcbiAgICBlbmNvZGVyLFxuICAgIGZpbHRlcixcbiAgICBzb3J0LFxuICAgIGFsbG93RG90cyxcbiAgICBzZXJpYWxpemVEYXRlLFxuICAgIGZvcm1hdHRlclxuKSB7XG4gICAgdmFyIG9iaiA9IG9iamVjdDtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvYmogPSBmaWx0ZXIocHJlZml4LCBvYmopO1xuICAgIH0gZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICBvYmogPSBzZXJpYWxpemVEYXRlKG9iaik7XG4gICAgfSBlbHNlIGlmIChvYmogPT09IG51bGwpIHtcbiAgICAgICAgaWYgKHN0cmljdE51bGxIYW5kbGluZykge1xuICAgICAgICAgICAgcmV0dXJuIGVuY29kZXIgPyBlbmNvZGVyKHByZWZpeCkgOiBwcmVmaXg7XG4gICAgICAgIH1cblxuICAgICAgICBvYmogPSAnJztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIG9iaiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIG9iaiA9PT0gJ2Jvb2xlYW4nIHx8IHV0aWxzLmlzQnVmZmVyKG9iaikpIHtcbiAgICAgICAgaWYgKGVuY29kZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBbZm9ybWF0dGVyKGVuY29kZXIocHJlZml4KSkgKyAnPScgKyBmb3JtYXR0ZXIoZW5jb2RlcihvYmopKV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtmb3JtYXR0ZXIocHJlZml4KSArICc9JyArIGZvcm1hdHRlcihTdHJpbmcob2JqKSldO1xuICAgIH1cblxuICAgIHZhciB2YWx1ZXMgPSBbXTtcblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH1cblxuICAgIHZhciBvYmpLZXlzO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGZpbHRlcikpIHtcbiAgICAgICAgb2JqS2V5cyA9IGZpbHRlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAgICAgIG9iaktleXMgPSBzb3J0ID8ga2V5cy5zb3J0KHNvcnQpIDoga2V5cztcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iaktleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IG9iaktleXNbaV07XG5cbiAgICAgICAgaWYgKHNraXBOdWxscyAmJiBvYmpba2V5XSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSB2YWx1ZXMuY29uY2F0KHN0cmluZ2lmeShcbiAgICAgICAgICAgICAgICBvYmpba2V5XSxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUFycmF5UHJlZml4KHByZWZpeCwga2V5KSxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUFycmF5UHJlZml4LFxuICAgICAgICAgICAgICAgIHN0cmljdE51bGxIYW5kbGluZyxcbiAgICAgICAgICAgICAgICBza2lwTnVsbHMsXG4gICAgICAgICAgICAgICAgZW5jb2RlcixcbiAgICAgICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICAgICAgc29ydCxcbiAgICAgICAgICAgICAgICBhbGxvd0RvdHMsXG4gICAgICAgICAgICAgICAgc2VyaWFsaXplRGF0ZSxcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZXJcbiAgICAgICAgICAgICkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWVzID0gdmFsdWVzLmNvbmNhdChzdHJpbmdpZnkoXG4gICAgICAgICAgICAgICAgb2JqW2tleV0sXG4gICAgICAgICAgICAgICAgcHJlZml4ICsgKGFsbG93RG90cyA/ICcuJyArIGtleSA6ICdbJyArIGtleSArICddJyksXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVBcnJheVByZWZpeCxcbiAgICAgICAgICAgICAgICBzdHJpY3ROdWxsSGFuZGxpbmcsXG4gICAgICAgICAgICAgICAgc2tpcE51bGxzLFxuICAgICAgICAgICAgICAgIGVuY29kZXIsXG4gICAgICAgICAgICAgICAgZmlsdGVyLFxuICAgICAgICAgICAgICAgIHNvcnQsXG4gICAgICAgICAgICAgICAgYWxsb3dEb3RzLFxuICAgICAgICAgICAgICAgIHNlcmlhbGl6ZURhdGUsXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVyXG4gICAgICAgICAgICApKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmplY3QsIG9wdHMpIHtcbiAgICB2YXIgb2JqID0gb2JqZWN0O1xuICAgIHZhciBvcHRpb25zID0gb3B0cyB8fCB7fTtcblxuICAgIGlmIChvcHRpb25zLmVuY29kZXIgIT09IG51bGwgJiYgb3B0aW9ucy5lbmNvZGVyICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuZW5jb2RlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFbmNvZGVyIGhhcyB0byBiZSBhIGZ1bmN0aW9uLicpO1xuICAgIH1cblxuICAgIHZhciBkZWxpbWl0ZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWxpbWl0ZXIgPT09ICd1bmRlZmluZWQnID8gZGVmYXVsdHMuZGVsaW1pdGVyIDogb3B0aW9ucy5kZWxpbWl0ZXI7XG4gICAgdmFyIHN0cmljdE51bGxIYW5kbGluZyA9IHR5cGVvZiBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgOiBkZWZhdWx0cy5zdHJpY3ROdWxsSGFuZGxpbmc7XG4gICAgdmFyIHNraXBOdWxscyA9IHR5cGVvZiBvcHRpb25zLnNraXBOdWxscyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5za2lwTnVsbHMgOiBkZWZhdWx0cy5za2lwTnVsbHM7XG4gICAgdmFyIGVuY29kZSA9IHR5cGVvZiBvcHRpb25zLmVuY29kZSA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5lbmNvZGUgOiBkZWZhdWx0cy5lbmNvZGU7XG4gICAgdmFyIGVuY29kZXIgPSBlbmNvZGUgPyAodHlwZW9mIG9wdGlvbnMuZW5jb2RlciA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuZW5jb2RlciA6IGRlZmF1bHRzLmVuY29kZXIpIDogbnVsbDtcbiAgICB2YXIgc29ydCA9IHR5cGVvZiBvcHRpb25zLnNvcnQgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLnNvcnQgOiBudWxsO1xuICAgIHZhciBhbGxvd0RvdHMgPSB0eXBlb2Ygb3B0aW9ucy5hbGxvd0RvdHMgPT09ICd1bmRlZmluZWQnID8gZmFsc2UgOiBvcHRpb25zLmFsbG93RG90cztcbiAgICB2YXIgc2VyaWFsaXplRGF0ZSA9IHR5cGVvZiBvcHRpb25zLnNlcmlhbGl6ZURhdGUgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLnNlcmlhbGl6ZURhdGUgOiBkZWZhdWx0cy5zZXJpYWxpemVEYXRlO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5mb3JtYXQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIG9wdGlvbnMuZm9ybWF0ID0gZm9ybWF0cy5kZWZhdWx0O1xuICAgIH0gZWxzZSBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChmb3JtYXRzLmZvcm1hdHRlcnMsIG9wdGlvbnMuZm9ybWF0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGZvcm1hdCBvcHRpb24gcHJvdmlkZWQuJyk7XG4gICAgfVxuICAgIHZhciBmb3JtYXR0ZXIgPSBmb3JtYXRzLmZvcm1hdHRlcnNbb3B0aW9ucy5mb3JtYXRdO1xuICAgIHZhciBvYmpLZXlzO1xuICAgIHZhciBmaWx0ZXI7XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuZmlsdGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGZpbHRlciA9IG9wdGlvbnMuZmlsdGVyO1xuICAgICAgICBvYmogPSBmaWx0ZXIoJycsIG9iaik7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuZmlsdGVyKSkge1xuICAgICAgICBmaWx0ZXIgPSBvcHRpb25zLmZpbHRlcjtcbiAgICAgICAgb2JqS2V5cyA9IGZpbHRlcjtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IFtdO1xuXG4gICAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8IG9iaiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgdmFyIGFycmF5Rm9ybWF0O1xuICAgIGlmIChvcHRpb25zLmFycmF5Rm9ybWF0IGluIGFycmF5UHJlZml4R2VuZXJhdG9ycykge1xuICAgICAgICBhcnJheUZvcm1hdCA9IG9wdGlvbnMuYXJyYXlGb3JtYXQ7XG4gICAgfSBlbHNlIGlmICgnaW5kaWNlcycgaW4gb3B0aW9ucykge1xuICAgICAgICBhcnJheUZvcm1hdCA9IG9wdGlvbnMuaW5kaWNlcyA/ICdpbmRpY2VzJyA6ICdyZXBlYXQnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFycmF5Rm9ybWF0ID0gJ2luZGljZXMnO1xuICAgIH1cblxuICAgIHZhciBnZW5lcmF0ZUFycmF5UHJlZml4ID0gYXJyYXlQcmVmaXhHZW5lcmF0b3JzW2FycmF5Rm9ybWF0XTtcblxuICAgIGlmICghb2JqS2V5cykge1xuICAgICAgICBvYmpLZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICB9XG5cbiAgICBpZiAoc29ydCkge1xuICAgICAgICBvYmpLZXlzLnNvcnQoc29ydCk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmpLZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBrZXkgPSBvYmpLZXlzW2ldO1xuXG4gICAgICAgIGlmIChza2lwTnVsbHMgJiYgb2JqW2tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAga2V5cyA9IGtleXMuY29uY2F0KHN0cmluZ2lmeShcbiAgICAgICAgICAgIG9ialtrZXldLFxuICAgICAgICAgICAga2V5LFxuICAgICAgICAgICAgZ2VuZXJhdGVBcnJheVByZWZpeCxcbiAgICAgICAgICAgIHN0cmljdE51bGxIYW5kbGluZyxcbiAgICAgICAgICAgIHNraXBOdWxscyxcbiAgICAgICAgICAgIGVuY29kZXIsXG4gICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICBzb3J0LFxuICAgICAgICAgICAgYWxsb3dEb3RzLFxuICAgICAgICAgICAgc2VyaWFsaXplRGF0ZSxcbiAgICAgICAgICAgIGZvcm1hdHRlclxuICAgICAgICApKTtcbiAgICB9XG5cbiAgICByZXR1cm4ga2V5cy5qb2luKGRlbGltaXRlcik7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgZGVmYXVsdHMgPSB7XG4gICAgYWxsb3dEb3RzOiBmYWxzZSxcbiAgICBhbGxvd1Byb3RvdHlwZXM6IGZhbHNlLFxuICAgIGFycmF5TGltaXQ6IDIwLFxuICAgIGRlY29kZXI6IHV0aWxzLmRlY29kZSxcbiAgICBkZWxpbWl0ZXI6ICcmJyxcbiAgICBkZXB0aDogNSxcbiAgICBwYXJhbWV0ZXJMaW1pdDogMTAwMCxcbiAgICBwbGFpbk9iamVjdHM6IGZhbHNlLFxuICAgIHN0cmljdE51bGxIYW5kbGluZzogZmFsc2Vcbn07XG5cbnZhciBwYXJzZVZhbHVlcyA9IGZ1bmN0aW9uIHBhcnNlUXVlcnlTdHJpbmdWYWx1ZXMoc3RyLCBvcHRpb25zKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdChvcHRpb25zLmRlbGltaXRlciwgb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCA9PT0gSW5maW5pdHkgPyB1bmRlZmluZWQgOiBvcHRpb25zLnBhcmFtZXRlckxpbWl0KTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHBhcnQgPSBwYXJ0c1tpXTtcbiAgICAgICAgdmFyIHBvcyA9IHBhcnQuaW5kZXhPZignXT0nKSA9PT0gLTEgPyBwYXJ0LmluZGV4T2YoJz0nKSA6IHBhcnQuaW5kZXhPZignXT0nKSArIDE7XG5cbiAgICAgICAgdmFyIGtleSwgdmFsO1xuICAgICAgICBpZiAocG9zID09PSAtMSkge1xuICAgICAgICAgICAga2V5ID0gb3B0aW9ucy5kZWNvZGVyKHBhcnQpO1xuICAgICAgICAgICAgdmFsID0gb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgPyBudWxsIDogJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBrZXkgPSBvcHRpb25zLmRlY29kZXIocGFydC5zbGljZSgwLCBwb3MpKTtcbiAgICAgICAgICAgIHZhbCA9IG9wdGlvbnMuZGVjb2RlcihwYXJ0LnNsaWNlKHBvcyArIDEpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzLmNhbGwob2JqLCBrZXkpKSB7XG4gICAgICAgICAgICBvYmpba2V5XSA9IFtdLmNvbmNhdChvYmpba2V5XSkuY29uY2F0KHZhbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvYmpba2V5XSA9IHZhbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59O1xuXG52YXIgcGFyc2VPYmplY3QgPSBmdW5jdGlvbiBwYXJzZU9iamVjdFJlY3Vyc2l2ZShjaGFpbiwgdmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKCFjaGFpbi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG5cbiAgICB2YXIgcm9vdCA9IGNoYWluLnNoaWZ0KCk7XG5cbiAgICB2YXIgb2JqO1xuICAgIGlmIChyb290ID09PSAnW10nKSB7XG4gICAgICAgIG9iaiA9IFtdO1xuICAgICAgICBvYmogPSBvYmouY29uY2F0KHBhcnNlT2JqZWN0KGNoYWluLCB2YWwsIG9wdGlvbnMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBvYmogPSBvcHRpb25zLnBsYWluT2JqZWN0cyA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiB7fTtcbiAgICAgICAgdmFyIGNsZWFuUm9vdCA9IHJvb3QuY2hhckF0KDApID09PSAnWycgJiYgcm9vdC5jaGFyQXQocm9vdC5sZW5ndGggLSAxKSA9PT0gJ10nID8gcm9vdC5zbGljZSgxLCAtMSkgOiByb290O1xuICAgICAgICB2YXIgaW5kZXggPSBwYXJzZUludChjbGVhblJvb3QsIDEwKTtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgIWlzTmFOKGluZGV4KSAmJlxuICAgICAgICAgICAgcm9vdCAhPT0gY2xlYW5Sb290ICYmXG4gICAgICAgICAgICBTdHJpbmcoaW5kZXgpID09PSBjbGVhblJvb3QgJiZcbiAgICAgICAgICAgIGluZGV4ID49IDAgJiZcbiAgICAgICAgICAgIChvcHRpb25zLnBhcnNlQXJyYXlzICYmIGluZGV4IDw9IG9wdGlvbnMuYXJyYXlMaW1pdClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBvYmogPSBbXTtcbiAgICAgICAgICAgIG9ialtpbmRleF0gPSBwYXJzZU9iamVjdChjaGFpbiwgdmFsLCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9ialtjbGVhblJvb3RdID0gcGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxudmFyIHBhcnNlS2V5cyA9IGZ1bmN0aW9uIHBhcnNlUXVlcnlTdHJpbmdLZXlzKGdpdmVuS2V5LCB2YWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoIWdpdmVuS2V5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUcmFuc2Zvcm0gZG90IG5vdGF0aW9uIHRvIGJyYWNrZXQgbm90YXRpb25cbiAgICB2YXIga2V5ID0gb3B0aW9ucy5hbGxvd0RvdHMgPyBnaXZlbktleS5yZXBsYWNlKC9cXC4oW14uW10rKS9nLCAnWyQxXScpIDogZ2l2ZW5LZXk7XG5cbiAgICAvLyBUaGUgcmVnZXggY2h1bmtzXG5cbiAgICB2YXIgcGFyZW50ID0gL14oW15bXSopLztcbiAgICB2YXIgY2hpbGQgPSAvKFxcW1teW1xcXV0qXSkvZztcblxuICAgIC8vIEdldCB0aGUgcGFyZW50XG5cbiAgICB2YXIgc2VnbWVudCA9IHBhcmVudC5leGVjKGtleSk7XG5cbiAgICAvLyBTdGFzaCB0aGUgcGFyZW50IGlmIGl0IGV4aXN0c1xuXG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBpZiAoc2VnbWVudFsxXSkge1xuICAgICAgICAvLyBJZiB3ZSBhcmVuJ3QgdXNpbmcgcGxhaW4gb2JqZWN0cywgb3B0aW9uYWxseSBwcmVmaXgga2V5c1xuICAgICAgICAvLyB0aGF0IHdvdWxkIG92ZXJ3cml0ZSBvYmplY3QgcHJvdG90eXBlIHByb3BlcnRpZXNcbiAgICAgICAgaWYgKCFvcHRpb25zLnBsYWluT2JqZWN0cyAmJiBoYXMuY2FsbChPYmplY3QucHJvdG90eXBlLCBzZWdtZW50WzFdKSkge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zLmFsbG93UHJvdG90eXBlcykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGtleXMucHVzaChzZWdtZW50WzFdKTtcbiAgICB9XG5cbiAgICAvLyBMb29wIHRocm91Z2ggY2hpbGRyZW4gYXBwZW5kaW5nIHRvIHRoZSBhcnJheSB1bnRpbCB3ZSBoaXQgZGVwdGhcblxuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZSAoKHNlZ21lbnQgPSBjaGlsZC5leGVjKGtleSkpICE9PSBudWxsICYmIGkgPCBvcHRpb25zLmRlcHRoKSB7XG4gICAgICAgIGkgKz0gMTtcbiAgICAgICAgaWYgKCFvcHRpb25zLnBsYWluT2JqZWN0cyAmJiBoYXMuY2FsbChPYmplY3QucHJvdG90eXBlLCBzZWdtZW50WzFdLnNsaWNlKDEsIC0xKSkpIHtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5hbGxvd1Byb3RvdHlwZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAga2V5cy5wdXNoKHNlZ21lbnRbMV0pO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlJ3MgYSByZW1haW5kZXIsIGp1c3QgYWRkIHdoYXRldmVyIGlzIGxlZnRcblxuICAgIGlmIChzZWdtZW50KSB7XG4gICAgICAgIGtleXMucHVzaCgnWycgKyBrZXkuc2xpY2Uoc2VnbWVudC5pbmRleCkgKyAnXScpO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZU9iamVjdChrZXlzLCB2YWwsIG9wdGlvbnMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyLCBvcHRzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBvcHRzIHx8IHt9O1xuXG4gICAgaWYgKG9wdGlvbnMuZGVjb2RlciAhPT0gbnVsbCAmJiBvcHRpb25zLmRlY29kZXIgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5kZWNvZGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0RlY29kZXIgaGFzIHRvIGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgb3B0aW9ucy5kZWxpbWl0ZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWxpbWl0ZXIgPT09ICdzdHJpbmcnIHx8IHV0aWxzLmlzUmVnRXhwKG9wdGlvbnMuZGVsaW1pdGVyKSA/IG9wdGlvbnMuZGVsaW1pdGVyIDogZGVmYXVsdHMuZGVsaW1pdGVyO1xuICAgIG9wdGlvbnMuZGVwdGggPSB0eXBlb2Ygb3B0aW9ucy5kZXB0aCA9PT0gJ251bWJlcicgPyBvcHRpb25zLmRlcHRoIDogZGVmYXVsdHMuZGVwdGg7XG4gICAgb3B0aW9ucy5hcnJheUxpbWl0ID0gdHlwZW9mIG9wdGlvbnMuYXJyYXlMaW1pdCA9PT0gJ251bWJlcicgPyBvcHRpb25zLmFycmF5TGltaXQgOiBkZWZhdWx0cy5hcnJheUxpbWl0O1xuICAgIG9wdGlvbnMucGFyc2VBcnJheXMgPSBvcHRpb25zLnBhcnNlQXJyYXlzICE9PSBmYWxzZTtcbiAgICBvcHRpb25zLmRlY29kZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWNvZGVyID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5kZWNvZGVyIDogZGVmYXVsdHMuZGVjb2RlcjtcbiAgICBvcHRpb25zLmFsbG93RG90cyA9IHR5cGVvZiBvcHRpb25zLmFsbG93RG90cyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5hbGxvd0RvdHMgOiBkZWZhdWx0cy5hbGxvd0RvdHM7XG4gICAgb3B0aW9ucy5wbGFpbk9iamVjdHMgPSB0eXBlb2Ygb3B0aW9ucy5wbGFpbk9iamVjdHMgPT09ICdib29sZWFuJyA/IG9wdGlvbnMucGxhaW5PYmplY3RzIDogZGVmYXVsdHMucGxhaW5PYmplY3RzO1xuICAgIG9wdGlvbnMuYWxsb3dQcm90b3R5cGVzID0gdHlwZW9mIG9wdGlvbnMuYWxsb3dQcm90b3R5cGVzID09PSAnYm9vbGVhbicgPyBvcHRpb25zLmFsbG93UHJvdG90eXBlcyA6IGRlZmF1bHRzLmFsbG93UHJvdG90eXBlcztcbiAgICBvcHRpb25zLnBhcmFtZXRlckxpbWl0ID0gdHlwZW9mIG9wdGlvbnMucGFyYW1ldGVyTGltaXQgPT09ICdudW1iZXInID8gb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCA6IGRlZmF1bHRzLnBhcmFtZXRlckxpbWl0O1xuICAgIG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID0gdHlwZW9mIG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID09PSAnYm9vbGVhbicgPyBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA6IGRlZmF1bHRzLnN0cmljdE51bGxIYW5kbGluZztcblxuICAgIGlmIChzdHIgPT09ICcnIHx8IHN0ciA9PT0gbnVsbCB8fCB0eXBlb2Ygc3RyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5wbGFpbk9iamVjdHMgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgfVxuXG4gICAgdmFyIHRlbXBPYmogPSB0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyA/IHBhcnNlVmFsdWVzKHN0ciwgb3B0aW9ucykgOiBzdHI7XG4gICAgdmFyIG9iaiA9IG9wdGlvbnMucGxhaW5PYmplY3RzID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBrZXlzIGFuZCBzZXR1cCB0aGUgbmV3IG9iamVjdFxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0ZW1wT2JqKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciBuZXdPYmogPSBwYXJzZUtleXMoa2V5LCB0ZW1wT2JqW2tleV0sIG9wdGlvbnMpO1xuICAgICAgICBvYmogPSB1dGlscy5tZXJnZShvYmosIG5ld09iaiwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHV0aWxzLmNvbXBhY3Qob2JqKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzdHJpbmdpZnkgPSByZXF1aXJlKCcuL3N0cmluZ2lmeScpO1xudmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpO1xudmFyIGZvcm1hdHMgPSByZXF1aXJlKCcuL2Zvcm1hdHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZm9ybWF0czogZm9ybWF0cyxcbiAgICBwYXJzZTogcGFyc2UsXG4gICAgc3RyaW5naWZ5OiBzdHJpbmdpZnlcbn07XG4iLCJpbXBvcnQgeyBzdHJpbmdpZnkgYXMgc3RyaW5naWZ5UGFyYW1zIH0gZnJvbSAncXMnO1xuXG4vKipcbiAqIFN0cmluZ2lmeSBhbmQgY29uY2F0cyBwYXJhbXMgdG8gdGhlIHByb3ZpZGVkIFVSTFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBVUkwgVGhlIFVSTFxuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyBUaGUgcGFyYW1zIE9iamVjdFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIHVybCBhbmQgcGFyYW1zIGNvbWJpbmVkXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmNhdFBhcmFtcyhVUkwsIHBhcmFtcykge1xuICByZXR1cm4gcGFyYW1zXG4gICAgPyBgJHtVUkx9PyR7c3RyaW5naWZ5UGFyYW1zKHBhcmFtcyl9YC5yZXBsYWNlKC9cXD8kLywgJycpXG4gICAgOiBVUkw7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBVUkwgYnkgY29tYmluaW5nIHRoZSBzcGVjaWZpZWQgVVJMc1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlVVJMIFRoZSBiYXNlIFVSTFxuICogQHBhcmFtIHtzdHJpbmd9IHJlbGF0aXZlVVJMIFRoZSByZWxhdGl2ZSBVUkxcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjb21iaW5lZCBVUkxcbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gY29tYmluZShiYXNlVVJMLCByZWxhdGl2ZVVSTCkge1xuICByZXR1cm4gYCR7YmFzZVVSTC5yZXBsYWNlKC9cXC8rJC8sICcnKX0vJHtyZWxhdGl2ZVVSTC5yZXBsYWNlKC9eXFwvKy8sICcnKX1gO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIFVSTCB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Fic29sdXRlKHVybCkge1xuICAvLyBBIFVSTCBpcyBjb25zaWRlcmVkIGFic29sdXRlIGlmIGl0IGJlZ2lucyB3aXRoIFwiPHNjaGVtZT46Ly9cIiBvciBcIi8vXCIgKHByb3RvY29sLXJlbGF0aXZlIFVSTCkuXG4gIC8vIFJGQyAzOTg2IGRlZmluZXMgc2NoZW1lIG5hbWUgYXMgYSBzZXF1ZW5jZSBvZiBjaGFyYWN0ZXJzIGJlZ2lubmluZyB3aXRoIGEgbGV0dGVyIGFuZCBmb2xsb3dlZFxuICAvLyBieSBhbnkgY29tYmluYXRpb24gb2YgbGV0dGVycywgZGlnaXRzLCBwbHVzLCBwZXJpb2QsIG9yIGh5cGhlbi5cbiAgcmV0dXJuIC9eKFthLXpdW2EtelxcZFxcK1xcLVxcLl0qOik/XFwvXFwvL2kudGVzdCh1cmwpO1xufVxuXG4vKipcbiAqIEZvcm1hdCBhbiB1cmwgY29tYmluaW5nIHByb3ZpZGVkIHVybHMgb3IgcmV0dXJuaW5nIHRoZSByZWxhdGl2ZVVSTFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlVXJsIFRoZSBiYXNlIHVybFxuICogQHBhcmFtIHtzdHJpbmd9IHJlbGF0aXZlVVJMIFRoZSByZWxhdGl2ZSB1cmxcbiAqIEByZXR1cm5zIHtzdHJpbmd9IHJlbGF0aXZlVVJMIGlmIHRoZSBzcGVjaWZpZWQgcmVsYXRpdmVVUkwgaXMgYWJzb2x1dGUgb3IgYmFzZVVybCBpcyBub3QgZGVmaW5lZCxcbiAqICAgICAgICAgICAgICAgICAgIG90aGVyd2lzZSBpdCByZXR1cm5zIHRoZSBjb21iaW5hdGlvbiBvZiBib3RoIHVybHNcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgVGhlIHBhcmFtcyBvYmplY3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdChiYXNlVXJsLCByZWxhdGl2ZVVSTCwgcGFyYW1zKSB7XG4gIGlmICghYmFzZVVybCB8fCBpc0Fic29sdXRlKHJlbGF0aXZlVVJMKSkge1xuICAgIHJldHVybiBjb25jYXRQYXJhbXMocmVsYXRpdmVVUkwsIHBhcmFtcyk7XG4gIH1cblxuICByZXR1cm4gY29uY2F0UGFyYW1zKGNvbWJpbmUoYmFzZVVybCwgcmVsYXRpdmVVUkwpLCBwYXJhbXMpO1xufVxuIiwiLyohXHJcbiAqIEBuYW1lIEphdmFTY3JpcHQvTm9kZUpTIE1lcmdlIHYxLjIuMFxyXG4gKiBAYXV0aG9yIHllaWtvc1xyXG4gKiBAcmVwb3NpdG9yeSBodHRwczovL2dpdGh1Yi5jb20veWVpa29zL2pzLm1lcmdlXHJcblxyXG4gKiBDb3B5cmlnaHQgMjAxNCB5ZWlrb3MgLSBNSVQgbGljZW5zZVxyXG4gKiBodHRwczovL3Jhdy5naXRodWIuY29tL3llaWtvcy9qcy5tZXJnZS9tYXN0ZXIvTElDRU5TRVxyXG4gKi9cclxuXHJcbjsoZnVuY3Rpb24oaXNOb2RlKSB7XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIG9uZSBvciBtb3JlIG9iamVjdHMgXHJcblx0ICogQHBhcmFtIGJvb2w/IGNsb25lXHJcblx0ICogQHBhcmFtIG1peGVkLC4uLiBhcmd1bWVudHNcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHR2YXIgUHVibGljID0gZnVuY3Rpb24oY2xvbmUpIHtcclxuXHJcblx0XHRyZXR1cm4gbWVyZ2UoY2xvbmUgPT09IHRydWUsIGZhbHNlLCBhcmd1bWVudHMpO1xyXG5cclxuXHR9LCBwdWJsaWNOYW1lID0gJ21lcmdlJztcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9yIG1vcmUgb2JqZWN0cyByZWN1cnNpdmVseSBcclxuXHQgKiBAcGFyYW0gYm9vbD8gY2xvbmVcclxuXHQgKiBAcGFyYW0gbWl4ZWQsLi4uIGFyZ3VtZW50c1xyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdFB1YmxpYy5yZWN1cnNpdmUgPSBmdW5jdGlvbihjbG9uZSkge1xyXG5cclxuXHRcdHJldHVybiBtZXJnZShjbG9uZSA9PT0gdHJ1ZSwgdHJ1ZSwgYXJndW1lbnRzKTtcclxuXHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQ2xvbmUgdGhlIGlucHV0IHJlbW92aW5nIGFueSByZWZlcmVuY2VcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcmV0dXJuIG1peGVkXHJcblx0ICovXHJcblxyXG5cdFB1YmxpYy5jbG9uZSA9IGZ1bmN0aW9uKGlucHV0KSB7XHJcblxyXG5cdFx0dmFyIG91dHB1dCA9IGlucHV0LFxyXG5cdFx0XHR0eXBlID0gdHlwZU9mKGlucHV0KSxcclxuXHRcdFx0aW5kZXgsIHNpemU7XHJcblxyXG5cdFx0aWYgKHR5cGUgPT09ICdhcnJheScpIHtcclxuXHJcblx0XHRcdG91dHB1dCA9IFtdO1xyXG5cdFx0XHRzaXplID0gaW5wdXQubGVuZ3RoO1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleD0wO2luZGV4PHNpemU7KytpbmRleClcclxuXHJcblx0XHRcdFx0b3V0cHV0W2luZGV4XSA9IFB1YmxpYy5jbG9uZShpbnB1dFtpbmRleF0pO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpIHtcclxuXHJcblx0XHRcdG91dHB1dCA9IHt9O1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleCBpbiBpbnB1dClcclxuXHJcblx0XHRcdFx0b3V0cHV0W2luZGV4XSA9IFB1YmxpYy5jbG9uZShpbnB1dFtpbmRleF0pO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb2JqZWN0cyByZWN1cnNpdmVseVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEBwYXJhbSBtaXhlZCBleHRlbmRcclxuXHQgKiBAcmV0dXJuIG1peGVkXHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIG1lcmdlX3JlY3Vyc2l2ZShiYXNlLCBleHRlbmQpIHtcclxuXHJcblx0XHRpZiAodHlwZU9mKGJhc2UpICE9PSAnb2JqZWN0JylcclxuXHJcblx0XHRcdHJldHVybiBleHRlbmQ7XHJcblxyXG5cdFx0Zm9yICh2YXIga2V5IGluIGV4dGVuZCkge1xyXG5cclxuXHRcdFx0aWYgKHR5cGVPZihiYXNlW2tleV0pID09PSAnb2JqZWN0JyAmJiB0eXBlT2YoZXh0ZW5kW2tleV0pID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0XHRiYXNlW2tleV0gPSBtZXJnZV9yZWN1cnNpdmUoYmFzZVtrZXldLCBleHRlbmRba2V5XSk7XHJcblxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHRiYXNlW2tleV0gPSBleHRlbmRba2V5XTtcclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGJhc2U7XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9yIG1vcmUgb2JqZWN0c1xyXG5cdCAqIEBwYXJhbSBib29sIGNsb25lXHJcblx0ICogQHBhcmFtIGJvb2wgcmVjdXJzaXZlXHJcblx0ICogQHBhcmFtIGFycmF5IGFyZ3ZcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiBtZXJnZShjbG9uZSwgcmVjdXJzaXZlLCBhcmd2KSB7XHJcblxyXG5cdFx0dmFyIHJlc3VsdCA9IGFyZ3ZbMF0sXHJcblx0XHRcdHNpemUgPSBhcmd2Lmxlbmd0aDtcclxuXHJcblx0XHRpZiAoY2xvbmUgfHwgdHlwZU9mKHJlc3VsdCkgIT09ICdvYmplY3QnKVxyXG5cclxuXHRcdFx0cmVzdWx0ID0ge307XHJcblxyXG5cdFx0Zm9yICh2YXIgaW5kZXg9MDtpbmRleDxzaXplOysraW5kZXgpIHtcclxuXHJcblx0XHRcdHZhciBpdGVtID0gYXJndltpbmRleF0sXHJcblxyXG5cdFx0XHRcdHR5cGUgPSB0eXBlT2YoaXRlbSk7XHJcblxyXG5cdFx0XHRpZiAodHlwZSAhPT0gJ29iamVjdCcpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Zm9yICh2YXIga2V5IGluIGl0ZW0pIHtcclxuXHJcblx0XHRcdFx0dmFyIHNpdGVtID0gY2xvbmUgPyBQdWJsaWMuY2xvbmUoaXRlbVtrZXldKSA6IGl0ZW1ba2V5XTtcclxuXHJcblx0XHRcdFx0aWYgKHJlY3Vyc2l2ZSkge1xyXG5cclxuXHRcdFx0XHRcdHJlc3VsdFtrZXldID0gbWVyZ2VfcmVjdXJzaXZlKHJlc3VsdFtrZXldLCBzaXRlbSk7XHJcblxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdFx0cmVzdWx0W2tleV0gPSBzaXRlbTtcclxuXHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0eXBlIG9mIHZhcmlhYmxlXHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHJldHVybiBzdHJpbmdcclxuXHQgKlxyXG5cdCAqIEBzZWUgaHR0cDovL2pzcGVyZi5jb20vdHlwZW9mdmFyXHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIHR5cGVPZihpbnB1dCkge1xyXG5cclxuXHRcdHJldHVybiAoe30pLnRvU3RyaW5nLmNhbGwoaW5wdXQpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHR9XHJcblxyXG5cdGlmIChpc05vZGUpIHtcclxuXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IFB1YmxpYztcclxuXHJcblx0fSBlbHNlIHtcclxuXHJcblx0XHR3aW5kb3dbcHVibGljTmFtZV0gPSBQdWJsaWM7XHJcblxyXG5cdH1cclxuXHJcbn0pKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKTsiLCJpbXBvcnQgX21lcmdlIGZyb20gJ21lcmdlJztcblxuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IG1lcmdlIG9iamVjdHNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0cyB0byBtZXJnZVxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgbWVyZ2VkIG9iamVjdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlKC4uLnBhcmFtcykgIHtcbiAgcmV0dXJuIF9tZXJnZS5yZWN1cnNpdmUodHJ1ZSwgLi4ucGFyYW1zKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBza2lwcGVkIHByb3BlcnRpZXNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBvYmplY3QgdG8gc2tpcCBwcm9wZXJ0aWVzIGZyb21cbiAqIEBwYXJhbSB7W1N0cmluZ119IGtleXMga2V5cyBvZiB0aGUgcHJvcGVydGllcyB0byBza2lwXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBvYmplY3Qgd2l0aCB0aGUgcHJvcGVydGllcyBza2lwcGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBza2lwKG9iaiwga2V5cykge1xuICBjb25zdCByZXN1bHQgPSB7fTtcbiAgT2JqZWN0LmtleXMob2JqKVxuICAgIC5maWx0ZXIoa2V5ID0+ICFrZXlzLmluY2x1ZGVzKGtleSkpXG4gICAgLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgcmVzdWx0W2tleV0gPSBvYmpba2V5XTtcbiAgICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuIiwiY29uc3QgaWRlbnRpdHkgID0gcmVzcG9uc2UgPT4gcmVzcG9uc2U7XG5jb25zdCByZWplY3Rpb24gPSBlcnIgPT4gUHJvbWlzZS5yZWplY3QoZXJyKTtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaWRkbGV3YXJlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fYmVmb3JlICA9IFtdO1xuICAgIHRoaXMuX2FmdGVyICAgPSBbXTtcbiAgICB0aGlzLl9maW5hbGx5ID0gW107XG4gIH1cblxuICBiZWZvcmUoZm4pIHtcbiAgICB0aGlzLl9iZWZvcmUucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXMuX2JlZm9yZS5sZW5ndGggLSAxO1xuICB9XG5cbiAgYWZ0ZXIoZnVsZmlsbCA9IGlkZW50aXR5LCByZWplY3QgPSByZWplY3Rpb24pIHtcbiAgICB0aGlzLl9hZnRlci5wdXNoKHsgZnVsZmlsbCwgcmVqZWN0IH0pO1xuICAgIHJldHVybiB0aGlzLl9hZnRlci5sZW5ndGggLSAxO1xuICB9XG5cbiAgZmluYWxseShmbikge1xuICAgIHRoaXMuX2ZpbmFsbHkucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXMuX2ZpbmFsbHkubGVuZ3RoIC0gMTtcbiAgfVxuXG4gIHJlc29sdmVCZWZvcmUoY29uZmlnKSB7XG4gICAgY29uc3QgY2hhaW4gPSAocHJvbWlzZSwgdGFzaykgPT4gcHJvbWlzZS50aGVuKHRhc2spO1xuICAgIHJldHVybiB0aGlzLl9iZWZvcmUucmVkdWNlKGNoYWluLCBQcm9taXNlLnJlc29sdmUoY29uZmlnKSk7XG4gIH1cblxuICByZXNvbHZlQWZ0ZXIoZXJyLCByZXNwb25zZSkge1xuICAgIGNvbnN0IGNoYWluICAgPSAocHJvbWlzZSwgdGFzaykgPT4gcHJvbWlzZS50aGVuKHRhc2suZnVsZmlsbCwgdGFzay5yZWplY3QpO1xuICAgIGNvbnN0IGluaXRpYWwgPSBlcnIgPyBQcm9taXNlLnJlamVjdChlcnIpIDogUHJvbWlzZS5yZXNvbHZlKHJlc3BvbnNlKTtcbiAgICByZXR1cm4gdGhpcy5fYWZ0ZXIucmVkdWNlKGNoYWluLCBpbml0aWFsKTtcbiAgfVxuXG4gIHJlc29sdmVGaW5hbGx5KGNvbmZpZywgdXJsKSB7XG4gICAgdGhpcy5fZmluYWxseS5mb3JFYWNoKHRhc2sgPT4gdGFzayhjb25maWcsIHVybCkpO1xuICB9XG59XG4iLCJpbXBvcnQgeyBtZXJnZSwgc2tpcCB9IGZyb20gJy4vdXRpbHMnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbmZpZyB7XG4gIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgdGhpcy5fY29uZmlnICAgPSB7IGhlYWRlcnM6IHt9IH07XG5cbiAgICB0aGlzLnNldChjb25maWcpO1xuICB9XG5cbiAgbWVyZ2UoLi4uY29uZmlnUGFyYW1zKSB7XG4gICAgY29uc3QgcGFyYW1zID0gbWVyZ2UoLi4uY29uZmlnUGFyYW1zKTtcblxuICAgIGNvbnN0IGNvbmZpZyA9IG1lcmdlKFxuICAgICAgdGhpcy5za2lwTm90VXNlZE1ldGhvZHMocGFyYW1zLm1ldGhvZCksXG4gICAgICB0aGlzLl9jb25maWdbcGFyYW1zLm1ldGhvZF0sXG4gICAgICBwYXJhbXNcbiAgICApO1xuXG4gICAgaWYgKFxuICAgICAgdHlwZW9mIGNvbmZpZy5ib2R5ID09PSAnb2JqZWN0JyAmJlxuICAgICAgY29uZmlnLmhlYWRlcnMgJiZcbiAgICAgIGNvbmZpZy5oZWFkZXJzWydDb250ZW50LVR5cGUnXSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgKSB7XG4gICAgICBjb25maWcuYm9keSA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZy5ib2R5KTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIHNraXBOb3RVc2VkTWV0aG9kcyhjdXJyZW50TWV0aG9kKSB7XG4gICAgY29uc3Qgbm90VXNlZE1ldGhvZHMgPSBbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdwYXRjaCcsICdwb3N0JywgJ3B1dCddXG4gICAgICAuZmlsdGVyKG1ldGhvZCA9PiBjdXJyZW50TWV0aG9kICE9PSBtZXRob2QudG9Mb3dlckNhc2UoKSk7XG4gICAgcmV0dXJuIHNraXAodGhpcy5fY29uZmlnLCBub3RVc2VkTWV0aG9kcyk7XG4gIH1cblxuXG4gIHNldChjb25maWcpIHtcbiAgICB0aGlzLl9jb25maWcgPSBtZXJnZSh0aGlzLl9jb25maWcsIGNvbmZpZyk7XG4gIH1cblxuICBnZXQoKSB7XG4gICAgcmV0dXJuIG1lcmdlKHRoaXMuX2NvbmZpZyk7XG4gIH1cbn1cbiIsIi8qKlxuICogV3JhcCBhIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIHJlc3BvbnNlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHJlYWRlciB0eXBlIG9mIHJlYWRlciB0byB1c2Ugb24gcmVzcG9uc2UgYm9keVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZXMgdG8gdGhlIHdyYXBwZWQgcmVhZCByZXNwb25zZVxuICovXG5mdW5jdGlvbiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsIHJlYWRlcikge1xuICBjb25zdCByZXMgPSB7XG4gICAgaGVhZGVycyAgIDogcmVzcG9uc2UuaGVhZGVycyxcbiAgICBzdGF0dXMgICAgOiByZXNwb25zZS5zdGF0dXMsXG4gICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dFxuICB9O1xuXG4gIGlmIChyZWFkZXIgPT09ICdyYXcnKSB7XG4gICAgcmVzLmRhdGEgPSByZXNwb25zZS5ib2R5O1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2VbcmVhZGVyXSgpXG4gIC50aGVuKChkYXRhKSA9PiB7XG4gICAgcmVzLmRhdGEgPSBkYXRhO1xuICAgIHJldHVybiByZXM7XG4gIH0pO1xufVxuXG4vKipcbiAqIFJlYWRzIG9yIHJlamVjdHMgYSBmZXRjaCByZXNwb25zZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSByZXNwb25zZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSByZWFkZXIgdHlwZSBvZiByZWFkZXIgdG8gdXNlIG9uIHJlc3BvbnNlIGJvZHlcbiAqIEByZXR1cm4ge1Byb21pc2V9IHJlYWQgb3IgcmVqZWN0aW9uIHByb21pc2VcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlLCByZWFkZXIpIHtcbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIGNvbnN0IGVyciAgICAgICA9IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICBlcnIuc3RhdHVzICAgICAgPSByZXNwb25zZS5zdGF0dXM7XG4gICAgZXJyLnN0YXR1c1RleHQgID0gcmVzcG9uc2Uuc3RhdHVzVGV4dDtcbiAgICBlcnIuaGVhZGVycyAgICAgPSByZXNwb25zZS5oZWFkZXJzO1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICB9XG4gIGlmIChyZWFkZXIpIHtcbiAgICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCByZWFkZXIpO1xuICB9XG5cbiAgY29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gIGlmIChjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmNsdWRlcygnYXBwbGljYXRpb24vanNvbicpKSB7XG4gICAgcmV0dXJuIHdyYXBSZXNwb25zZShyZXNwb25zZSwgJ2pzb24nKTtcbiAgfVxuICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCAndGV4dCcpO1xufVxuIiwiaW1wb3J0ICdpc29tb3JwaGljLWZldGNoJztcblxuaW1wb3J0IHsgZm9ybWF0IGFzIGZvcm1hdFVybCB9IGZyb20gJy4vaGVscGVycy91cmwtaGFuZGxlcic7XG5pbXBvcnQgeyBza2lwLCBtZXJnZSB9ICAgICAgICAgZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgTWlkZGxld2FyZSAgICAgICAgICAgICAgZnJvbSAnLi9taWRkbGV3YXJlJztcbmltcG9ydCBDb25maWcgICAgICAgICAgICAgICAgICBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgcmVzcG9uc2VIYW5kbGVyICAgICAgICAgZnJvbSAnLi9oZWxwZXJzL3Jlc3BvbnNlLWhhbmRsZXInO1xuXG5cbmNsYXNzIFRyYWUge1xuICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgIHRoaXMuX21pZGRsZXdhcmUgPSBuZXcgTWlkZGxld2FyZSgpO1xuICAgIHRoaXMuX2NvbmZpZyAgICAgPSBuZXcgQ29uZmlnKHNraXAoY29uZmlnLCBbJ2Jhc2VVcmwnXSkpO1xuXG4gICAgdGhpcy5iYXNlVXJsKGNvbmZpZy5iYXNlVXJsIHx8ICcnKTtcbiAgICB0aGlzLl9pbml0TWV0aG9kc1dpdGhCb2R5KCk7XG4gICAgdGhpcy5faW5pdE1ldGhvZHNXaXRoTm9Cb2R5KCk7XG4gICAgdGhpcy5faW5pdE1pZGRsZXdhcmVNZXRob2RzKCk7XG4gIH1cblxuICBjcmVhdGUoY29uZmlnKSB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihtZXJnZSh0aGlzLmRlZmF1bHRzKCksIGNvbmZpZykpO1xuICAgIGNvbnN0IG1hcEFmdGVyID0gKHsgZnVsZmlsbCwgcmVqZWN0IH0pID0+IGluc3RhbmNlLmFmdGVyKGZ1bGZpbGwsIHJlamVjdCk7XG4gICAgdGhpcy5fbWlkZGxld2FyZS5fYmVmb3JlLmZvckVhY2goaW5zdGFuY2UuYmVmb3JlKTtcbiAgICB0aGlzLl9taWRkbGV3YXJlLl9hZnRlci5mb3JFYWNoKG1hcEFmdGVyKTtcbiAgICB0aGlzLl9taWRkbGV3YXJlLl9maW5hbGx5LmZvckVhY2goaW5zdGFuY2UuZmluYWxseSk7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgZGVmYXVsdHMoY29uZmlnKSB7XG4gICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBjb25zdCBkZWZhdWx0cyA9IHRoaXMuX2NvbmZpZy5nZXQoKTtcbiAgICAgIHRoaXMuYmFzZVVybCgpICYmIChkZWZhdWx0cy5iYXNlVXJsID0gdGhpcy5iYXNlVXJsKCkpO1xuICAgICAgcmV0dXJuIGRlZmF1bHRzO1xuICAgIH1cbiAgICB0aGlzLl9jb25maWcuc2V0KHNraXAoY29uZmlnLCBbJ2Jhc2VVcmwnXSkpO1xuICAgIGNvbmZpZy5iYXNlVXJsICYmIHRoaXMuYmFzZVVybChjb25maWcuYmFzZVVybCk7XG4gICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5nZXQoKTtcbiAgfVxuXG4gIGJhc2VVcmwoYmFzZVVybCkge1xuICAgIGlmICh0eXBlb2YgYmFzZVVybCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLl9iYXNlVXJsO1xuICAgIH1cbiAgICB0aGlzLl9iYXNlVXJsID0gYmFzZVVybDtcbiAgICByZXR1cm4gdGhpcy5fYmFzZVVybDtcbiAgfVxuXG4gIHJlcXVlc3QoY29uZmlnID0ge30pIHtcbiAgICBjb25maWcubWV0aG9kIHx8IChjb25maWcubWV0aG9kID0gJ2dldCcpO1xuICAgIGNvbnN0IG1lcmdlZENvbmZpZyA9IHRoaXMuX2NvbmZpZy5tZXJnZShjb25maWcpO1xuICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdFVybCh0aGlzLl9iYXNlVXJsLCBjb25maWcudXJsLCBjb25maWcucGFyYW1zKTtcblxuICAgIHJldHVybiB0aGlzLl9mZXRjaCh1cmwsIG1lcmdlZENvbmZpZyk7XG4gIH1cblxuICBfZmV0Y2godXJsLCBjb25maWcpIHtcbiAgICBjb25zdCByZXNvbHZlRmluYWxseSA9ICguLi5hcmdzKSA9PiB0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVGaW5hbGx5KC4uLmFyZ3MpO1xuXG4gICAgcmV0dXJuIHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUJlZm9yZShjb25maWcpXG4gICAgLnRoZW4oY29uZmlnID0+IGZldGNoKHVybCwgY29uZmlnKSlcbiAgICAudGhlbihyZXMgPT4gcmVzcG9uc2VIYW5kbGVyKHJlcywgY29uZmlnLmJvZHlUeXBlKSlcbiAgICAudGhlbihcbiAgICAgIHJlcyA9PiB0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVBZnRlcih1bmRlZmluZWQsIHJlcyksXG4gICAgICBlcnIgPT4gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlQWZ0ZXIoZXJyKVxuICAgIClcbiAgICAudGhlbihcbiAgICAgIHJlcyA9PiBQcm9taXNlLnJlc29sdmUocmVzb2x2ZUZpbmFsbHkoY29uZmlnLCB1cmwpKS50aGVuKCgpID0+IHJlcyksXG4gICAgICBlcnIgPT4gUHJvbWlzZS5yZXNvbHZlKHJlc29sdmVGaW5hbGx5KGNvbmZpZywgdXJsKSkudGhlbigoKSA9PiB7IHRocm93IGVycjsgfSlcbiAgICApO1xuICB9XG5cbiAgX2luaXRNZXRob2RzV2l0aE5vQm9keSgpIHtcbiAgICBbJ2dldCcsICdkZWxldGUnLCAnaGVhZCddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgdGhpc1ttZXRob2RdID0gKHBhdGgsIGNvbmZpZyA9IHt9KSA9PiB7XG4gICAgICAgIGNvbnN0IG1lcmdlZENvbmZpZyA9IHRoaXMuX2NvbmZpZy5tZXJnZShjb25maWcsIHsgbWV0aG9kIH0pO1xuICAgICAgICBjb25zdCB1cmwgICAgICAgICAgPSBmb3JtYXRVcmwodGhpcy5fYmFzZVVybCwgcGF0aCwgY29uZmlnLnBhcmFtcyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZldGNoKHVybCwgbWVyZ2VkQ29uZmlnKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBfaW5pdE1ldGhvZHNXaXRoQm9keSgpIHtcbiAgICBjb25zdCBkZWZhdWx0Q29uZiA9IHsgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0gfTtcblxuICAgIFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIHRoaXMuX2NvbmZpZy5zZXQoeyBbbWV0aG9kXTogZGVmYXVsdENvbmYgfSk7XG5cbiAgICAgIHRoaXNbbWV0aG9kXSA9IChwYXRoLCBib2R5LCBjb25maWcpID0+IHtcbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlKGNvbmZpZywgeyBib2R5LCBtZXRob2QgfSk7XG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdFVybCh0aGlzLl9iYXNlVXJsLCBwYXRoKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIF9pbml0TWlkZGxld2FyZU1ldGhvZHMoKSB7XG4gICAgWydiZWZvcmUnLCAnYWZ0ZXInLCAnZmluYWxseSddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgdGhpc1ttZXRob2RdID0gKC4uLmFyZ3MpID0+IHRoaXMuX21pZGRsZXdhcmVbbWV0aG9kXSguLi5hcmdzKTtcbiAgICB9KTtcbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBUcmFlKCk7XG4iXSwibmFtZXMiOlsic2VsZiIsImZldGNoIiwic3VwcG9ydCIsIlN5bWJvbCIsIkJsb2IiLCJlIiwiYXJyYXlCdWZmZXIiLCJ2aWV3Q2xhc3NlcyIsImlzRGF0YVZpZXciLCJvYmoiLCJEYXRhVmlldyIsInByb3RvdHlwZSIsImlzUHJvdG90eXBlT2YiLCJpc0FycmF5QnVmZmVyVmlldyIsIkFycmF5QnVmZmVyIiwiaXNWaWV3IiwiaW5kZXhPZiIsIk9iamVjdCIsInRvU3RyaW5nIiwiY2FsbCIsIm5vcm1hbGl6ZU5hbWUiLCJuYW1lIiwiU3RyaW5nIiwidGVzdCIsIlR5cGVFcnJvciIsInRvTG93ZXJDYXNlIiwibm9ybWFsaXplVmFsdWUiLCJ2YWx1ZSIsIml0ZXJhdG9yRm9yIiwiaXRlbXMiLCJpdGVyYXRvciIsInNoaWZ0IiwiZG9uZSIsInVuZGVmaW5lZCIsIml0ZXJhYmxlIiwiSGVhZGVycyIsImhlYWRlcnMiLCJtYXAiLCJmb3JFYWNoIiwiYXBwZW5kIiwiZ2V0T3duUHJvcGVydHlOYW1lcyIsIm9sZFZhbHVlIiwiZ2V0IiwiaGFzIiwiaGFzT3duUHJvcGVydHkiLCJzZXQiLCJjYWxsYmFjayIsInRoaXNBcmciLCJrZXlzIiwicHVzaCIsInZhbHVlcyIsImVudHJpZXMiLCJjb25zdW1lZCIsImJvZHkiLCJib2R5VXNlZCIsIlByb21pc2UiLCJyZWplY3QiLCJmaWxlUmVhZGVyUmVhZHkiLCJyZWFkZXIiLCJyZXNvbHZlIiwib25sb2FkIiwicmVzdWx0Iiwib25lcnJvciIsImVycm9yIiwicmVhZEJsb2JBc0FycmF5QnVmZmVyIiwiYmxvYiIsIkZpbGVSZWFkZXIiLCJwcm9taXNlIiwicmVhZEFzQXJyYXlCdWZmZXIiLCJyZWFkQmxvYkFzVGV4dCIsInJlYWRBc1RleHQiLCJyZWFkQXJyYXlCdWZmZXJBc1RleHQiLCJidWYiLCJ2aWV3IiwiVWludDhBcnJheSIsImNoYXJzIiwiQXJyYXkiLCJsZW5ndGgiLCJpIiwiZnJvbUNoYXJDb2RlIiwiam9pbiIsImJ1ZmZlckNsb25lIiwic2xpY2UiLCJieXRlTGVuZ3RoIiwiYnVmZmVyIiwiQm9keSIsIl9pbml0Qm9keSIsIl9ib2R5SW5pdCIsIl9ib2R5VGV4dCIsIl9ib2R5QmxvYiIsImZvcm1EYXRhIiwiRm9ybURhdGEiLCJfYm9keUZvcm1EYXRhIiwic2VhcmNoUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiX2JvZHlBcnJheUJ1ZmZlciIsIkVycm9yIiwidHlwZSIsInJlamVjdGVkIiwidGhlbiIsInRleHQiLCJkZWNvZGUiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwibWV0aG9kcyIsIm5vcm1hbGl6ZU1ldGhvZCIsIm1ldGhvZCIsInVwY2FzZWQiLCJ0b1VwcGVyQ2FzZSIsIlJlcXVlc3QiLCJpbnB1dCIsIm9wdGlvbnMiLCJ1cmwiLCJjcmVkZW50aWFscyIsIm1vZGUiLCJyZWZlcnJlciIsImNsb25lIiwiZm9ybSIsInRyaW0iLCJzcGxpdCIsImJ5dGVzIiwicmVwbGFjZSIsImRlY29kZVVSSUNvbXBvbmVudCIsInBhcnNlSGVhZGVycyIsInJhd0hlYWRlcnMiLCJsaW5lIiwicGFydHMiLCJrZXkiLCJSZXNwb25zZSIsImJvZHlJbml0Iiwic3RhdHVzIiwib2siLCJzdGF0dXNUZXh0IiwicmVzcG9uc2UiLCJyZWRpcmVjdFN0YXR1c2VzIiwicmVkaXJlY3QiLCJSYW5nZUVycm9yIiwibG9jYXRpb24iLCJpbml0IiwicmVxdWVzdCIsInhociIsIlhNTEh0dHBSZXF1ZXN0IiwiZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIiwicmVzcG9uc2VVUkwiLCJyZXNwb25zZVRleHQiLCJvbnRpbWVvdXQiLCJvcGVuIiwid2l0aENyZWRlbnRpYWxzIiwicmVzcG9uc2VUeXBlIiwic2V0UmVxdWVzdEhlYWRlciIsInNlbmQiLCJwb2x5ZmlsbCIsInRoaXMiLCJiaW5kIiwiaGV4VGFibGUiLCJhcnJheSIsInNvdXJjZSIsInBsYWluT2JqZWN0cyIsImNyZWF0ZSIsInRhcmdldCIsImlzQXJyYXkiLCJjb25jYXQiLCJtZXJnZVRhcmdldCIsImV4cG9ydHMiLCJhcnJheVRvT2JqZWN0IiwiaXRlbSIsImJhYmVsSGVscGVycy50eXBlb2YiLCJtZXJnZSIsInJlZHVjZSIsImFjYyIsInN0ciIsInN0cmluZyIsIm91dCIsImMiLCJjaGFyQ29kZUF0IiwiY2hhckF0IiwicmVmZXJlbmNlcyIsInJlZnMiLCJsb29rdXAiLCJjb21wYWN0ZWQiLCJjb21wYWN0IiwiY29uc3RydWN0b3IiLCJpc0J1ZmZlciIsInBlcmNlbnRUd2VudGllcyIsInV0aWxzIiwicmVxdWlyZSQkMCIsImZvcm1hdHMiLCJyZXF1aXJlJCQxIiwiYXJyYXlQcmVmaXhHZW5lcmF0b3JzIiwiYnJhY2tldHMiLCJwcmVmaXgiLCJpbmRpY2VzIiwicmVwZWF0IiwidG9JU08iLCJEYXRlIiwidG9JU09TdHJpbmciLCJkZWZhdWx0cyIsImVuY29kZSIsInNlcmlhbGl6ZURhdGUiLCJkYXRlIiwic3RyaW5naWZ5Iiwib2JqZWN0IiwiZ2VuZXJhdGVBcnJheVByZWZpeCIsInN0cmljdE51bGxIYW5kbGluZyIsInNraXBOdWxscyIsImVuY29kZXIiLCJmaWx0ZXIiLCJzb3J0IiwiYWxsb3dEb3RzIiwiZm9ybWF0dGVyIiwib2JqS2V5cyIsIm9wdHMiLCJkZWxpbWl0ZXIiLCJmb3JtYXQiLCJkZWZhdWx0IiwiZm9ybWF0dGVycyIsImFycmF5Rm9ybWF0IiwicGFyc2VWYWx1ZXMiLCJwYXJzZVF1ZXJ5U3RyaW5nVmFsdWVzIiwicGFyYW1ldGVyTGltaXQiLCJJbmZpbml0eSIsInBhcnQiLCJwb3MiLCJ2YWwiLCJkZWNvZGVyIiwicGFyc2VPYmplY3QiLCJwYXJzZU9iamVjdFJlY3Vyc2l2ZSIsImNoYWluIiwicm9vdCIsImNsZWFuUm9vdCIsImluZGV4IiwicGFyc2VJbnQiLCJpc05hTiIsInBhcnNlQXJyYXlzIiwiYXJyYXlMaW1pdCIsInBhcnNlS2V5cyIsInBhcnNlUXVlcnlTdHJpbmdLZXlzIiwiZ2l2ZW5LZXkiLCJwYXJlbnQiLCJjaGlsZCIsInNlZ21lbnQiLCJleGVjIiwiYWxsb3dQcm90b3R5cGVzIiwiZGVwdGgiLCJpc1JlZ0V4cCIsInRlbXBPYmoiLCJuZXdPYmoiLCJyZXF1aXJlJCQyIiwiY29uY2F0UGFyYW1zIiwiVVJMIiwicGFyYW1zIiwic3RyaW5naWZ5UGFyYW1zIiwiY29tYmluZSIsImJhc2VVUkwiLCJyZWxhdGl2ZVVSTCIsImlzQWJzb2x1dGUiLCJiYXNlVXJsIiwiaXNOb2RlIiwiUHVibGljIiwiYXJndW1lbnRzIiwicHVibGljTmFtZSIsInJlY3Vyc2l2ZSIsIm91dHB1dCIsInR5cGVPZiIsInNpemUiLCJtZXJnZV9yZWN1cnNpdmUiLCJiYXNlIiwiZXh0ZW5kIiwiYXJndiIsInNpdGVtIiwibW9kdWxlIiwiX21lcmdlIiwic2tpcCIsImluY2x1ZGVzIiwiaWRlbnRpdHkiLCJyZWplY3Rpb24iLCJlcnIiLCJNaWRkbGV3YXJlIiwiX2JlZm9yZSIsIl9hZnRlciIsIl9maW5hbGx5IiwiZm4iLCJmdWxmaWxsIiwiY29uZmlnIiwidGFzayIsImluaXRpYWwiLCJDb25maWciLCJfY29uZmlnIiwic2tpcE5vdFVzZWRNZXRob2RzIiwiY3VycmVudE1ldGhvZCIsIm5vdFVzZWRNZXRob2RzIiwid3JhcFJlc3BvbnNlIiwicmVzIiwiZGF0YSIsInJlc3BvbnNlSGFuZGxlciIsImNvbnRlbnRUeXBlIiwiVHJhZSIsIl9taWRkbGV3YXJlIiwiX2luaXRNZXRob2RzV2l0aEJvZHkiLCJfaW5pdE1ldGhvZHNXaXRoTm9Cb2R5IiwiX2luaXRNaWRkbGV3YXJlTWV0aG9kcyIsImluc3RhbmNlIiwibWFwQWZ0ZXIiLCJhZnRlciIsImJlZm9yZSIsImZpbmFsbHkiLCJfYmFzZVVybCIsIm1lcmdlZENvbmZpZyIsImZvcm1hdFVybCIsIl9mZXRjaCIsInJlc29sdmVGaW5hbGx5IiwicmVzb2x2ZUJlZm9yZSIsImJvZHlUeXBlIiwicmVzb2x2ZUFmdGVyIiwicGF0aCIsImRlZmF1bHRDb25mIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxDQUFDLFVBQVNBLElBQVQsRUFBZTs7O01BR1ZBLEtBQUtDLEtBQVQsRUFBZ0I7Ozs7TUFJWkMsVUFBVTtrQkFDRSxxQkFBcUJGLElBRHZCO2NBRUYsWUFBWUEsSUFBWixJQUFvQixjQUFjRyxNQUZoQztVQUdOLGdCQUFnQkgsSUFBaEIsSUFBd0IsVUFBVUEsSUFBbEMsSUFBMkMsWUFBVztVQUN0RDtZQUNFSSxJQUFKO2VBQ08sSUFBUDtPQUZGLENBR0UsT0FBTUMsQ0FBTixFQUFTO2VBQ0YsS0FBUDs7S0FMNEMsRUFIcEM7Y0FXRixjQUFjTCxJQVhaO2lCQVlDLGlCQUFpQkE7R0FaaEM7O01BZUlFLFFBQVFJLFdBQVosRUFBeUI7UUFDbkJDLGNBQWMsQ0FDaEIsb0JBRGdCLEVBRWhCLHFCQUZnQixFQUdoQiw0QkFIZ0IsRUFJaEIscUJBSmdCLEVBS2hCLHNCQUxnQixFQU1oQixxQkFOZ0IsRUFPaEIsc0JBUGdCLEVBUWhCLHVCQVJnQixFQVNoQix1QkFUZ0IsQ0FBbEI7O1FBWUlDLGFBQWEsU0FBYkEsVUFBYSxDQUFTQyxHQUFULEVBQWM7YUFDdEJBLE9BQU9DLFNB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
