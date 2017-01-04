/**
 * Trae, the fetch library!
 *
 * @version: 1.0.0
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
})(typeof self !== 'undefined' ? self : window);

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
  if (!params) {
    return URL;
  }
  return URL + '?' + index_1(params);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL3V0aWxzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi9mb3JtYXRzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi9zdHJpbmdpZnkuanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL3BhcnNlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi9pbmRleC5qcyIsIi4uL2xpYi9oZWxwZXJzL3VybC1oYW5kbGVyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL21lcmdlL21lcmdlLmpzIiwiLi4vbGliL3V0aWxzLmpzIiwiLi4vbGliL21pZGRsZXdhcmUuanMiLCIuLi9saWIvY29uZmlnLmpzIiwiLi4vbGliL2hlbHBlcnMvcmVzcG9uc2UtaGFuZGxlci5qcyIsIi4uL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG5cbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLm1hcFtuYW1lXVxuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSsnLCcrdmFsdWUgOiB2YWx1ZVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHRoaXMubWFwKSB7XG4gICAgICBpZiAodGhpcy5tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLm1hcFtuYW1lXSwgbmFtZSwgdGhpcylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChuYW1lKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IGl0ZW1zLnB1c2godmFsdWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2goW25hbWUsIHZhbHVlXSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgdmFyIGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpXG4gICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKVxuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpXG4gICAgICAgIC8vIElFIDEwLTExIGNhbid0IGhhbmRsZSBhIERhdGFWaWV3IGJvZHkuXG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gbmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSkpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZWFkQXJyYXlCdWZmZXJBc1RleHQodGhpcy5fYm9keUFycmF5QnVmZmVyKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG5cbiAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy51cmwgPSBpbnB1dFxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5ICYmIGlucHV0Ll9ib2R5SW5pdCAhPSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgdGhpcy5jcmVkZW50aWFscyB8fCAnb21pdCdcbiAgICBpZiAob3B0aW9ucy5oZWFkZXJzIHx8ICF0aGlzLmhlYWRlcnMpIHtcbiAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB9XG4gICAgdGhpcy5tZXRob2QgPSBub3JtYWxpemVNZXRob2Qob3B0aW9ucy5tZXRob2QgfHwgdGhpcy5tZXRob2QgfHwgJ0dFVCcpXG4gICAgdGhpcy5tb2RlID0gb3B0aW9ucy5tb2RlIHx8IHRoaXMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIGJvZHkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvZHkgbm90IGFsbG93ZWQgZm9yIEdFVCBvciBIRUFEIHJlcXVlc3RzJylcbiAgICB9XG4gICAgdGhpcy5faW5pdEJvZHkoYm9keSlcbiAgfVxuXG4gIFJlcXVlc3QucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF1ZXN0KHRoaXMsIHsgYm9keTogdGhpcy5fYm9keUluaXQgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VIZWFkZXJzKHJhd0hlYWRlcnMpIHtcbiAgICB2YXIgaGVhZGVycyA9IG5ldyBIZWFkZXJzKClcbiAgICByYXdIZWFkZXJzLnNwbGl0KCdcXHJcXG4nKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnRzLmpvaW4oJzonKS50cmltKClcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBoZWFkZXJzXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMuc3RhdHVzID0gJ3N0YXR1cycgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzIDogMjAwXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9ICdzdGF0dXNUZXh0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXNUZXh0IDogJ09LJ1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIFJlc3BvbnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UodGhpcy5fYm9keUluaXQsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiB0aGlzLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBuZXcgSGVhZGVycyh0aGlzLmhlYWRlcnMpLFxuICAgICAgdXJsOiB0aGlzLnVybFxuICAgIH0pXG4gIH1cblxuICBSZXNwb25zZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiAwLCBzdGF0dXNUZXh0OiAnJ30pXG4gICAgcmVzcG9uc2UudHlwZSA9ICdlcnJvcidcbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfVxuXG4gIHZhciByZWRpcmVjdFN0YXR1c2VzID0gWzMwMSwgMzAyLCAzMDMsIDMwNywgMzA4XVxuXG4gIFJlc3BvbnNlLnJlZGlyZWN0ID0gZnVuY3Rpb24odXJsLCBzdGF0dXMpIHtcbiAgICBpZiAocmVkaXJlY3RTdGF0dXNlcy5pbmRleE9mKHN0YXR1cykgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBzdGF0dXMgY29kZScpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiBzdGF0dXMsIGhlYWRlcnM6IHtsb2NhdGlvbjogdXJsfX0pXG4gIH1cblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzXG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3RcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlXG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChpbnB1dCwgaW5pdClcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBwYXJzZUhlYWRlcnMoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKVxuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMudXJsID0gJ3Jlc3BvbnNlVVJMJyBpbiB4aHIgPyB4aHIucmVzcG9uc2VVUkwgOiBvcHRpb25zLmhlYWRlcnMuZ2V0KCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbnZhciBoZXhUYWJsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFycmF5ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICAgICAgICBhcnJheS5wdXNoKCclJyArICgoaSA8IDE2ID8gJzAnIDogJycpICsgaS50b1N0cmluZygxNikpLnRvVXBwZXJDYXNlKCkpO1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheTtcbn0oKSk7XG5cbmV4cG9ydHMuYXJyYXlUb09iamVjdCA9IGZ1bmN0aW9uIChzb3VyY2UsIG9wdGlvbnMpIHtcbiAgICB2YXIgb2JqID0gb3B0aW9ucyAmJiBvcHRpb25zLnBsYWluT2JqZWN0cyA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNvdXJjZS5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVtpXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG9ialtpXSA9IHNvdXJjZVtpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59O1xuXG5leHBvcnRzLm1lcmdlID0gZnVuY3Rpb24gKHRhcmdldCwgc291cmNlLCBvcHRpb25zKSB7XG4gICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHNvdXJjZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICAgICAgdGFyZ2V0LnB1c2goc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdGFyZ2V0W3NvdXJjZV0gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFt0YXJnZXQsIHNvdXJjZV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gW3RhcmdldF0uY29uY2F0KHNvdXJjZSk7XG4gICAgfVxuXG4gICAgdmFyIG1lcmdlVGFyZ2V0ID0gdGFyZ2V0O1xuICAgIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkgJiYgIUFycmF5LmlzQXJyYXkoc291cmNlKSkge1xuICAgICAgICBtZXJnZVRhcmdldCA9IGV4cG9ydHMuYXJyYXlUb09iamVjdCh0YXJnZXQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkgJiYgQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICAgIHNvdXJjZS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpKSB7XG4gICAgICAgICAgICBpZiAoaGFzLmNhbGwodGFyZ2V0LCBpKSkge1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRbaV0gJiYgdHlwZW9mIHRhcmdldFtpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2ldID0gZXhwb3J0cy5tZXJnZSh0YXJnZXRbaV0sIGl0ZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ldID0gaXRlbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNvdXJjZSkucmVkdWNlKGZ1bmN0aW9uIChhY2MsIGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBzb3VyY2Vba2V5XTtcblxuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFjYywga2V5KSkge1xuICAgICAgICAgICAgYWNjW2tleV0gPSBleHBvcnRzLm1lcmdlKGFjY1trZXldLCB2YWx1ZSwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhY2Nba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgfSwgbWVyZ2VUYXJnZXQpO1xufTtcblxuZXhwb3J0cy5kZWNvZGUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIucmVwbGFjZSgvXFwrL2csICcgJykpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG59O1xuXG5leHBvcnRzLmVuY29kZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAvLyBUaGlzIGNvZGUgd2FzIG9yaWdpbmFsbHkgd3JpdHRlbiBieSBCcmlhbiBXaGl0ZSAobXNjZGV4KSBmb3IgdGhlIGlvLmpzIGNvcmUgcXVlcnlzdHJpbmcgbGlicmFyeS5cbiAgICAvLyBJdCBoYXMgYmVlbiBhZGFwdGVkIGhlcmUgZm9yIHN0cmljdGVyIGFkaGVyZW5jZSB0byBSRkMgMzk4NlxuICAgIGlmIChzdHIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuXG4gICAgdmFyIHN0cmluZyA9IHR5cGVvZiBzdHIgPT09ICdzdHJpbmcnID8gc3RyIDogU3RyaW5nKHN0cik7XG5cbiAgICB2YXIgb3V0ID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGMgPSBzdHJpbmcuY2hhckNvZGVBdChpKTtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgICBjID09PSAweDJEIHx8IC8vIC1cbiAgICAgICAgICAgIGMgPT09IDB4MkUgfHwgLy8gLlxuICAgICAgICAgICAgYyA9PT0gMHg1RiB8fCAvLyBfXG4gICAgICAgICAgICBjID09PSAweDdFIHx8IC8vIH5cbiAgICAgICAgICAgIChjID49IDB4MzAgJiYgYyA8PSAweDM5KSB8fCAvLyAwLTlcbiAgICAgICAgICAgIChjID49IDB4NDEgJiYgYyA8PSAweDVBKSB8fCAvLyBhLXpcbiAgICAgICAgICAgIChjID49IDB4NjEgJiYgYyA8PSAweDdBKSAvLyBBLVpcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBvdXQgKz0gc3RyaW5nLmNoYXJBdChpKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweDgwKSB7XG4gICAgICAgICAgICBvdXQgPSBvdXQgKyBoZXhUYWJsZVtjXTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweDgwMCkge1xuICAgICAgICAgICAgb3V0ID0gb3V0ICsgKGhleFRhYmxlWzB4QzAgfCAoYyA+PiA2KV0gKyBoZXhUYWJsZVsweDgwIHwgKGMgJiAweDNGKV0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYyA8IDB4RDgwMCB8fCBjID49IDB4RTAwMCkge1xuICAgICAgICAgICAgb3V0ID0gb3V0ICsgKGhleFRhYmxlWzB4RTAgfCAoYyA+PiAxMildICsgaGV4VGFibGVbMHg4MCB8ICgoYyA+PiA2KSAmIDB4M0YpXSArIGhleFRhYmxlWzB4ODAgfCAoYyAmIDB4M0YpXSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGkgKz0gMTtcbiAgICAgICAgYyA9IDB4MTAwMDAgKyAoKChjICYgMHgzRkYpIDw8IDEwKSB8IChzdHJpbmcuY2hhckNvZGVBdChpKSAmIDB4M0ZGKSk7XG4gICAgICAgIG91dCArPSBoZXhUYWJsZVsweEYwIHwgKGMgPj4gMTgpXSArIGhleFRhYmxlWzB4ODAgfCAoKGMgPj4gMTIpICYgMHgzRildICsgaGV4VGFibGVbMHg4MCB8ICgoYyA+PiA2KSAmIDB4M0YpXSArIGhleFRhYmxlWzB4ODAgfCAoYyAmIDB4M0YpXTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xufTtcblxuZXhwb3J0cy5jb21wYWN0ID0gZnVuY3Rpb24gKG9iaiwgcmVmZXJlbmNlcykge1xuICAgIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICB2YXIgcmVmcyA9IHJlZmVyZW5jZXMgfHwgW107XG4gICAgdmFyIGxvb2t1cCA9IHJlZnMuaW5kZXhPZihvYmopO1xuICAgIGlmIChsb29rdXAgIT09IC0xKSB7XG4gICAgICAgIHJldHVybiByZWZzW2xvb2t1cF07XG4gICAgfVxuXG4gICAgcmVmcy5wdXNoKG9iaik7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICAgIHZhciBjb21wYWN0ZWQgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKG9ialtpXSAmJiB0eXBlb2Ygb2JqW2ldID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbXBhY3RlZC5wdXNoKGV4cG9ydHMuY29tcGFjdChvYmpbaV0sIHJlZnMpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG9ialtpXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb21wYWN0ZWQucHVzaChvYmpbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbXBhY3RlZDtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgb2JqW2tleV0gPSBleHBvcnRzLmNvbXBhY3Qob2JqW2tleV0sIHJlZnMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbmV4cG9ydHMuaXNSZWdFeHAgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBSZWdFeHBdJztcbn07XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgaWYgKG9iaiA9PT0gbnVsbCB8fCB0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuICEhKG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iaikpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlcGxhY2UgPSBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2U7XG52YXIgcGVyY2VudFR3ZW50aWVzID0gLyUyMC9nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAnZGVmYXVsdCc6ICdSRkMzOTg2JyxcbiAgICBmb3JtYXR0ZXJzOiB7XG4gICAgICAgIFJGQzE3Mzg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2UuY2FsbCh2YWx1ZSwgcGVyY2VudFR3ZW50aWVzLCAnKycpO1xuICAgICAgICB9LFxuICAgICAgICBSRkMzOTg2OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgUkZDMTczODogJ1JGQzE3MzgnLFxuICAgIFJGQzM5ODY6ICdSRkMzOTg2J1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGZvcm1hdHMgPSByZXF1aXJlKCcuL2Zvcm1hdHMnKTtcblxudmFyIGFycmF5UHJlZml4R2VuZXJhdG9ycyA9IHtcbiAgICBicmFja2V0czogZnVuY3Rpb24gYnJhY2tldHMocHJlZml4KSB7XG4gICAgICAgIHJldHVybiBwcmVmaXggKyAnW10nO1xuICAgIH0sXG4gICAgaW5kaWNlczogZnVuY3Rpb24gaW5kaWNlcyhwcmVmaXgsIGtleSkge1xuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ1snICsga2V5ICsgJ10nO1xuICAgIH0sXG4gICAgcmVwZWF0OiBmdW5jdGlvbiByZXBlYXQocHJlZml4KSB7XG4gICAgICAgIHJldHVybiBwcmVmaXg7XG4gICAgfVxufTtcblxudmFyIHRvSVNPID0gRGF0ZS5wcm90b3R5cGUudG9JU09TdHJpbmc7XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgICBkZWxpbWl0ZXI6ICcmJyxcbiAgICBlbmNvZGU6IHRydWUsXG4gICAgZW5jb2RlcjogdXRpbHMuZW5jb2RlLFxuICAgIHNlcmlhbGl6ZURhdGU6IGZ1bmN0aW9uIHNlcmlhbGl6ZURhdGUoZGF0ZSkge1xuICAgICAgICByZXR1cm4gdG9JU08uY2FsbChkYXRlKTtcbiAgICB9LFxuICAgIHNraXBOdWxsczogZmFsc2UsXG4gICAgc3RyaWN0TnVsbEhhbmRsaW5nOiBmYWxzZVxufTtcblxudmFyIHN0cmluZ2lmeSA9IGZ1bmN0aW9uIHN0cmluZ2lmeShvYmplY3QsIHByZWZpeCwgZ2VuZXJhdGVBcnJheVByZWZpeCwgc3RyaWN0TnVsbEhhbmRsaW5nLCBza2lwTnVsbHMsIGVuY29kZXIsIGZpbHRlciwgc29ydCwgYWxsb3dEb3RzLCBzZXJpYWxpemVEYXRlLCBmb3JtYXR0ZXIpIHtcbiAgICB2YXIgb2JqID0gb2JqZWN0O1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9iaiA9IGZpbHRlcihwcmVmaXgsIG9iaik7XG4gICAgfSBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgIG9iaiA9IHNlcmlhbGl6ZURhdGUob2JqKTtcbiAgICB9IGVsc2UgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgICAgICBpZiAoc3RyaWN0TnVsbEhhbmRsaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlciA/IGVuY29kZXIocHJlZml4KSA6IHByZWZpeDtcbiAgICAgICAgfVxuXG4gICAgICAgIG9iaiA9ICcnO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJyB8fCB0eXBlb2Ygb2JqID09PSAnbnVtYmVyJyB8fCB0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicgfHwgdXRpbHMuaXNCdWZmZXIob2JqKSkge1xuICAgICAgICBpZiAoZW5jb2Rlcikge1xuICAgICAgICAgICAgcmV0dXJuIFtmb3JtYXR0ZXIoZW5jb2RlcihwcmVmaXgpKSArICc9JyArIGZvcm1hdHRlcihlbmNvZGVyKG9iaikpXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW2Zvcm1hdHRlcihwcmVmaXgpICsgJz0nICsgZm9ybWF0dGVyKFN0cmluZyhvYmopKV07XG4gICAgfVxuXG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfVxuXG4gICAgdmFyIG9iaktleXM7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmlsdGVyKSkge1xuICAgICAgICBvYmpLZXlzID0gZmlsdGVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgb2JqS2V5cyA9IHNvcnQgPyBrZXlzLnNvcnQoc29ydCkgOiBrZXlzO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqS2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIga2V5ID0gb2JqS2V5c1tpXTtcblxuICAgICAgICBpZiAoc2tpcE51bGxzICYmIG9ialtrZXldID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHZhbHVlcy5jb25jYXQoc3RyaW5naWZ5KFxuICAgICAgICAgICAgICAgIG9ialtrZXldLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQXJyYXlQcmVmaXgocHJlZml4LCBrZXkpLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQXJyYXlQcmVmaXgsXG4gICAgICAgICAgICAgICAgc3RyaWN0TnVsbEhhbmRsaW5nLFxuICAgICAgICAgICAgICAgIHNraXBOdWxscyxcbiAgICAgICAgICAgICAgICBlbmNvZGVyLFxuICAgICAgICAgICAgICAgIGZpbHRlcixcbiAgICAgICAgICAgICAgICBzb3J0LFxuICAgICAgICAgICAgICAgIGFsbG93RG90cyxcbiAgICAgICAgICAgICAgICBzZXJpYWxpemVEYXRlLFxuICAgICAgICAgICAgICAgIGZvcm1hdHRlclxuICAgICAgICAgICAgKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSB2YWx1ZXMuY29uY2F0KHN0cmluZ2lmeShcbiAgICAgICAgICAgICAgICBvYmpba2V5XSxcbiAgICAgICAgICAgICAgICBwcmVmaXggKyAoYWxsb3dEb3RzID8gJy4nICsga2V5IDogJ1snICsga2V5ICsgJ10nKSxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUFycmF5UHJlZml4LFxuICAgICAgICAgICAgICAgIHN0cmljdE51bGxIYW5kbGluZyxcbiAgICAgICAgICAgICAgICBza2lwTnVsbHMsXG4gICAgICAgICAgICAgICAgZW5jb2RlcixcbiAgICAgICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICAgICAgc29ydCxcbiAgICAgICAgICAgICAgICBhbGxvd0RvdHMsXG4gICAgICAgICAgICAgICAgc2VyaWFsaXplRGF0ZSxcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZXJcbiAgICAgICAgICAgICkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iamVjdCwgb3B0cykge1xuICAgIHZhciBvYmogPSBvYmplY3Q7XG4gICAgdmFyIG9wdGlvbnMgPSBvcHRzIHx8IHt9O1xuICAgIHZhciBkZWxpbWl0ZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWxpbWl0ZXIgPT09ICd1bmRlZmluZWQnID8gZGVmYXVsdHMuZGVsaW1pdGVyIDogb3B0aW9ucy5kZWxpbWl0ZXI7XG4gICAgdmFyIHN0cmljdE51bGxIYW5kbGluZyA9IHR5cGVvZiBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgOiBkZWZhdWx0cy5zdHJpY3ROdWxsSGFuZGxpbmc7XG4gICAgdmFyIHNraXBOdWxscyA9IHR5cGVvZiBvcHRpb25zLnNraXBOdWxscyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5za2lwTnVsbHMgOiBkZWZhdWx0cy5za2lwTnVsbHM7XG4gICAgdmFyIGVuY29kZSA9IHR5cGVvZiBvcHRpb25zLmVuY29kZSA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5lbmNvZGUgOiBkZWZhdWx0cy5lbmNvZGU7XG4gICAgdmFyIGVuY29kZXIgPSBlbmNvZGUgPyAodHlwZW9mIG9wdGlvbnMuZW5jb2RlciA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuZW5jb2RlciA6IGRlZmF1bHRzLmVuY29kZXIpIDogbnVsbDtcbiAgICB2YXIgc29ydCA9IHR5cGVvZiBvcHRpb25zLnNvcnQgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLnNvcnQgOiBudWxsO1xuICAgIHZhciBhbGxvd0RvdHMgPSB0eXBlb2Ygb3B0aW9ucy5hbGxvd0RvdHMgPT09ICd1bmRlZmluZWQnID8gZmFsc2UgOiBvcHRpb25zLmFsbG93RG90cztcbiAgICB2YXIgc2VyaWFsaXplRGF0ZSA9IHR5cGVvZiBvcHRpb25zLnNlcmlhbGl6ZURhdGUgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLnNlcmlhbGl6ZURhdGUgOiBkZWZhdWx0cy5zZXJpYWxpemVEYXRlO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5mb3JtYXQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIG9wdGlvbnMuZm9ybWF0ID0gZm9ybWF0cy5kZWZhdWx0O1xuICAgIH0gZWxzZSBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChmb3JtYXRzLmZvcm1hdHRlcnMsIG9wdGlvbnMuZm9ybWF0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGZvcm1hdCBvcHRpb24gcHJvdmlkZWQuJyk7XG4gICAgfVxuICAgIHZhciBmb3JtYXR0ZXIgPSBmb3JtYXRzLmZvcm1hdHRlcnNbb3B0aW9ucy5mb3JtYXRdO1xuICAgIHZhciBvYmpLZXlzO1xuICAgIHZhciBmaWx0ZXI7XG5cbiAgICBpZiAob3B0aW9ucy5lbmNvZGVyICE9PSBudWxsICYmIG9wdGlvbnMuZW5jb2RlciAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmVuY29kZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRW5jb2RlciBoYXMgdG8gYmUgYSBmdW5jdGlvbi4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuZmlsdGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGZpbHRlciA9IG9wdGlvbnMuZmlsdGVyO1xuICAgICAgICBvYmogPSBmaWx0ZXIoJycsIG9iaik7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuZmlsdGVyKSkge1xuICAgICAgICBmaWx0ZXIgPSBvcHRpb25zLmZpbHRlcjtcbiAgICAgICAgb2JqS2V5cyA9IGZpbHRlcjtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IFtdO1xuXG4gICAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8IG9iaiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgdmFyIGFycmF5Rm9ybWF0O1xuICAgIGlmIChvcHRpb25zLmFycmF5Rm9ybWF0IGluIGFycmF5UHJlZml4R2VuZXJhdG9ycykge1xuICAgICAgICBhcnJheUZvcm1hdCA9IG9wdGlvbnMuYXJyYXlGb3JtYXQ7XG4gICAgfSBlbHNlIGlmICgnaW5kaWNlcycgaW4gb3B0aW9ucykge1xuICAgICAgICBhcnJheUZvcm1hdCA9IG9wdGlvbnMuaW5kaWNlcyA/ICdpbmRpY2VzJyA6ICdyZXBlYXQnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFycmF5Rm9ybWF0ID0gJ2luZGljZXMnO1xuICAgIH1cblxuICAgIHZhciBnZW5lcmF0ZUFycmF5UHJlZml4ID0gYXJyYXlQcmVmaXhHZW5lcmF0b3JzW2FycmF5Rm9ybWF0XTtcblxuICAgIGlmICghb2JqS2V5cykge1xuICAgICAgICBvYmpLZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICB9XG5cbiAgICBpZiAoc29ydCkge1xuICAgICAgICBvYmpLZXlzLnNvcnQoc29ydCk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmpLZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBrZXkgPSBvYmpLZXlzW2ldO1xuXG4gICAgICAgIGlmIChza2lwTnVsbHMgJiYgb2JqW2tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAga2V5cyA9IGtleXMuY29uY2F0KHN0cmluZ2lmeShcbiAgICAgICAgICAgIG9ialtrZXldLFxuICAgICAgICAgICAga2V5LFxuICAgICAgICAgICAgZ2VuZXJhdGVBcnJheVByZWZpeCxcbiAgICAgICAgICAgIHN0cmljdE51bGxIYW5kbGluZyxcbiAgICAgICAgICAgIHNraXBOdWxscyxcbiAgICAgICAgICAgIGVuY29kZXIsXG4gICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICBzb3J0LFxuICAgICAgICAgICAgYWxsb3dEb3RzLFxuICAgICAgICAgICAgc2VyaWFsaXplRGF0ZSxcbiAgICAgICAgICAgIGZvcm1hdHRlclxuICAgICAgICApKTtcbiAgICB9XG5cbiAgICByZXR1cm4ga2V5cy5qb2luKGRlbGltaXRlcik7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgZGVmYXVsdHMgPSB7XG4gICAgYWxsb3dEb3RzOiBmYWxzZSxcbiAgICBhbGxvd1Byb3RvdHlwZXM6IGZhbHNlLFxuICAgIGFycmF5TGltaXQ6IDIwLFxuICAgIGRlY29kZXI6IHV0aWxzLmRlY29kZSxcbiAgICBkZWxpbWl0ZXI6ICcmJyxcbiAgICBkZXB0aDogNSxcbiAgICBwYXJhbWV0ZXJMaW1pdDogMTAwMCxcbiAgICBwbGFpbk9iamVjdHM6IGZhbHNlLFxuICAgIHN0cmljdE51bGxIYW5kbGluZzogZmFsc2Vcbn07XG5cbnZhciBwYXJzZVZhbHVlcyA9IGZ1bmN0aW9uIHBhcnNlVmFsdWVzKHN0ciwgb3B0aW9ucykge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICB2YXIgcGFydHMgPSBzdHIuc3BsaXQob3B0aW9ucy5kZWxpbWl0ZXIsIG9wdGlvbnMucGFyYW1ldGVyTGltaXQgPT09IEluZmluaXR5ID8gdW5kZWZpbmVkIDogb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV07XG4gICAgICAgIHZhciBwb3MgPSBwYXJ0LmluZGV4T2YoJ109JykgPT09IC0xID8gcGFydC5pbmRleE9mKCc9JykgOiBwYXJ0LmluZGV4T2YoJ109JykgKyAxO1xuXG4gICAgICAgIHZhciBrZXksIHZhbDtcbiAgICAgICAgaWYgKHBvcyA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleSA9IG9wdGlvbnMuZGVjb2RlcihwYXJ0KTtcbiAgICAgICAgICAgIHZhbCA9IG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID8gbnVsbCA6ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5ID0gb3B0aW9ucy5kZWNvZGVyKHBhcnQuc2xpY2UoMCwgcG9zKSk7XG4gICAgICAgICAgICB2YWwgPSBvcHRpb25zLmRlY29kZXIocGFydC5zbGljZShwb3MgKyAxKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhcy5jYWxsKG9iaiwga2V5KSkge1xuICAgICAgICAgICAgb2JqW2tleV0gPSBbXS5jb25jYXQob2JqW2tleV0pLmNvbmNhdCh2YWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2JqW2tleV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxudmFyIHBhcnNlT2JqZWN0ID0gZnVuY3Rpb24gcGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucykge1xuICAgIGlmICghY2hhaW4ubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuXG4gICAgdmFyIHJvb3QgPSBjaGFpbi5zaGlmdCgpO1xuXG4gICAgdmFyIG9iajtcbiAgICBpZiAocm9vdCA9PT0gJ1tdJykge1xuICAgICAgICBvYmogPSBbXTtcbiAgICAgICAgb2JqID0gb2JqLmNvbmNhdChwYXJzZU9iamVjdChjaGFpbiwgdmFsLCBvcHRpb25zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgb2JqID0gb3B0aW9ucy5wbGFpbk9iamVjdHMgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgICAgIHZhciBjbGVhblJvb3QgPSByb290WzBdID09PSAnWycgJiYgcm9vdFtyb290Lmxlbmd0aCAtIDFdID09PSAnXScgPyByb290LnNsaWNlKDEsIHJvb3QubGVuZ3RoIC0gMSkgOiByb290O1xuICAgICAgICB2YXIgaW5kZXggPSBwYXJzZUludChjbGVhblJvb3QsIDEwKTtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgIWlzTmFOKGluZGV4KSAmJlxuICAgICAgICAgICAgcm9vdCAhPT0gY2xlYW5Sb290ICYmXG4gICAgICAgICAgICBTdHJpbmcoaW5kZXgpID09PSBjbGVhblJvb3QgJiZcbiAgICAgICAgICAgIGluZGV4ID49IDAgJiZcbiAgICAgICAgICAgIChvcHRpb25zLnBhcnNlQXJyYXlzICYmIGluZGV4IDw9IG9wdGlvbnMuYXJyYXlMaW1pdClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBvYmogPSBbXTtcbiAgICAgICAgICAgIG9ialtpbmRleF0gPSBwYXJzZU9iamVjdChjaGFpbiwgdmFsLCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9ialtjbGVhblJvb3RdID0gcGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxudmFyIHBhcnNlS2V5cyA9IGZ1bmN0aW9uIHBhcnNlS2V5cyhnaXZlbktleSwgdmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKCFnaXZlbktleSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVHJhbnNmb3JtIGRvdCBub3RhdGlvbiB0byBicmFja2V0IG5vdGF0aW9uXG4gICAgdmFyIGtleSA9IG9wdGlvbnMuYWxsb3dEb3RzID8gZ2l2ZW5LZXkucmVwbGFjZSgvXFwuKFteXFwuXFxbXSspL2csICdbJDFdJykgOiBnaXZlbktleTtcblxuICAgIC8vIFRoZSByZWdleCBjaHVua3NcblxuICAgIHZhciBwYXJlbnQgPSAvXihbXlxcW1xcXV0qKS87XG4gICAgdmFyIGNoaWxkID0gLyhcXFtbXlxcW1xcXV0qXFxdKS9nO1xuXG4gICAgLy8gR2V0IHRoZSBwYXJlbnRcblxuICAgIHZhciBzZWdtZW50ID0gcGFyZW50LmV4ZWMoa2V5KTtcblxuICAgIC8vIFN0YXNoIHRoZSBwYXJlbnQgaWYgaXQgZXhpc3RzXG5cbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGlmIChzZWdtZW50WzFdKSB7XG4gICAgICAgIC8vIElmIHdlIGFyZW4ndCB1c2luZyBwbGFpbiBvYmplY3RzLCBvcHRpb25hbGx5IHByZWZpeCBrZXlzXG4gICAgICAgIC8vIHRoYXQgd291bGQgb3ZlcndyaXRlIG9iamVjdCBwcm90b3R5cGUgcHJvcGVydGllc1xuICAgICAgICBpZiAoIW9wdGlvbnMucGxhaW5PYmplY3RzICYmIGhhcy5jYWxsKE9iamVjdC5wcm90b3R5cGUsIHNlZ21lbnRbMV0pKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMuYWxsb3dQcm90b3R5cGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAga2V5cy5wdXNoKHNlZ21lbnRbMV0pO1xuICAgIH1cblxuICAgIC8vIExvb3AgdGhyb3VnaCBjaGlsZHJlbiBhcHBlbmRpbmcgdG8gdGhlIGFycmF5IHVudGlsIHdlIGhpdCBkZXB0aFxuXG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlICgoc2VnbWVudCA9IGNoaWxkLmV4ZWMoa2V5KSkgIT09IG51bGwgJiYgaSA8IG9wdGlvbnMuZGVwdGgpIHtcbiAgICAgICAgaSArPSAxO1xuICAgICAgICBpZiAoIW9wdGlvbnMucGxhaW5PYmplY3RzICYmIGhhcy5jYWxsKE9iamVjdC5wcm90b3R5cGUsIHNlZ21lbnRbMV0ucmVwbGFjZSgvXFxbfFxcXS9nLCAnJykpKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMuYWxsb3dQcm90b3R5cGVzKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAga2V5cy5wdXNoKHNlZ21lbnRbMV0pO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlJ3MgYSByZW1haW5kZXIsIGp1c3QgYWRkIHdoYXRldmVyIGlzIGxlZnRcblxuICAgIGlmIChzZWdtZW50KSB7XG4gICAgICAgIGtleXMucHVzaCgnWycgKyBrZXkuc2xpY2Uoc2VnbWVudC5pbmRleCkgKyAnXScpO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZU9iamVjdChrZXlzLCB2YWwsIG9wdGlvbnMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyLCBvcHRzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBvcHRzIHx8IHt9O1xuXG4gICAgaWYgKG9wdGlvbnMuZGVjb2RlciAhPT0gbnVsbCAmJiBvcHRpb25zLmRlY29kZXIgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5kZWNvZGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0RlY29kZXIgaGFzIHRvIGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgb3B0aW9ucy5kZWxpbWl0ZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWxpbWl0ZXIgPT09ICdzdHJpbmcnIHx8IHV0aWxzLmlzUmVnRXhwKG9wdGlvbnMuZGVsaW1pdGVyKSA/IG9wdGlvbnMuZGVsaW1pdGVyIDogZGVmYXVsdHMuZGVsaW1pdGVyO1xuICAgIG9wdGlvbnMuZGVwdGggPSB0eXBlb2Ygb3B0aW9ucy5kZXB0aCA9PT0gJ251bWJlcicgPyBvcHRpb25zLmRlcHRoIDogZGVmYXVsdHMuZGVwdGg7XG4gICAgb3B0aW9ucy5hcnJheUxpbWl0ID0gdHlwZW9mIG9wdGlvbnMuYXJyYXlMaW1pdCA9PT0gJ251bWJlcicgPyBvcHRpb25zLmFycmF5TGltaXQgOiBkZWZhdWx0cy5hcnJheUxpbWl0O1xuICAgIG9wdGlvbnMucGFyc2VBcnJheXMgPSBvcHRpb25zLnBhcnNlQXJyYXlzICE9PSBmYWxzZTtcbiAgICBvcHRpb25zLmRlY29kZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWNvZGVyID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5kZWNvZGVyIDogZGVmYXVsdHMuZGVjb2RlcjtcbiAgICBvcHRpb25zLmFsbG93RG90cyA9IHR5cGVvZiBvcHRpb25zLmFsbG93RG90cyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5hbGxvd0RvdHMgOiBkZWZhdWx0cy5hbGxvd0RvdHM7XG4gICAgb3B0aW9ucy5wbGFpbk9iamVjdHMgPSB0eXBlb2Ygb3B0aW9ucy5wbGFpbk9iamVjdHMgPT09ICdib29sZWFuJyA/IG9wdGlvbnMucGxhaW5PYmplY3RzIDogZGVmYXVsdHMucGxhaW5PYmplY3RzO1xuICAgIG9wdGlvbnMuYWxsb3dQcm90b3R5cGVzID0gdHlwZW9mIG9wdGlvbnMuYWxsb3dQcm90b3R5cGVzID09PSAnYm9vbGVhbicgPyBvcHRpb25zLmFsbG93UHJvdG90eXBlcyA6IGRlZmF1bHRzLmFsbG93UHJvdG90eXBlcztcbiAgICBvcHRpb25zLnBhcmFtZXRlckxpbWl0ID0gdHlwZW9mIG9wdGlvbnMucGFyYW1ldGVyTGltaXQgPT09ICdudW1iZXInID8gb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCA6IGRlZmF1bHRzLnBhcmFtZXRlckxpbWl0O1xuICAgIG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID0gdHlwZW9mIG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID09PSAnYm9vbGVhbicgPyBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA6IGRlZmF1bHRzLnN0cmljdE51bGxIYW5kbGluZztcblxuICAgIGlmIChzdHIgPT09ICcnIHx8IHN0ciA9PT0gbnVsbCB8fCB0eXBlb2Ygc3RyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5wbGFpbk9iamVjdHMgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgfVxuXG4gICAgdmFyIHRlbXBPYmogPSB0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyA/IHBhcnNlVmFsdWVzKHN0ciwgb3B0aW9ucykgOiBzdHI7XG4gICAgdmFyIG9iaiA9IG9wdGlvbnMucGxhaW5PYmplY3RzID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBrZXlzIGFuZCBzZXR1cCB0aGUgbmV3IG9iamVjdFxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0ZW1wT2JqKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciBuZXdPYmogPSBwYXJzZUtleXMoa2V5LCB0ZW1wT2JqW2tleV0sIG9wdGlvbnMpO1xuICAgICAgICBvYmogPSB1dGlscy5tZXJnZShvYmosIG5ld09iaiwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHV0aWxzLmNvbXBhY3Qob2JqKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzdHJpbmdpZnkgPSByZXF1aXJlKCcuL3N0cmluZ2lmeScpO1xudmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpO1xudmFyIGZvcm1hdHMgPSByZXF1aXJlKCcuL2Zvcm1hdHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZm9ybWF0czogZm9ybWF0cyxcbiAgICBwYXJzZTogcGFyc2UsXG4gICAgc3RyaW5naWZ5OiBzdHJpbmdpZnlcbn07XG4iLCJpbXBvcnQgeyBzdHJpbmdpZnkgYXMgc3RyaW5naWZ5UGFyYW1zIH0gZnJvbSAncXMnO1xuXG4vKipcbiAqIFN0cmluZ2lmeSBhbmQgY29uY2F0cyBwYXJhbXMgdG8gdGhlIHByb3ZpZGVkIFVSTFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBVUkwgVGhlIFVSTFxuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyBUaGUgcGFyYW1zIE9iamVjdFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIHVybCBhbmQgcGFyYW1zIGNvbWJpbmVkXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmNhdFBhcmFtcyhVUkwsIHBhcmFtcykge1xuICBpZiAoIXBhcmFtcykge1xuICAgIHJldHVybiBVUkw7XG4gIH1cbiAgcmV0dXJuIGAke1VSTH0/JHtzdHJpbmdpZnlQYXJhbXMocGFyYW1zKX1gO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgVVJMIGJ5IGNvbWJpbmluZyB0aGUgc3BlY2lmaWVkIFVSTHNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVSTCBUaGUgYmFzZSBVUkxcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVSTCBUaGUgcmVsYXRpdmUgVVJMXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY29tYmluZWQgVVJMXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmUoYmFzZVVSTCwgcmVsYXRpdmVVUkwpIHtcbiAgcmV0dXJuIGAke2Jhc2VVUkwucmVwbGFjZSgvXFwvKyQvLCAnJyl9LyR7cmVsYXRpdmVVUkwucmVwbGFjZSgvXlxcLysvLCAnJyl9YDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFRoZSBVUkwgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBYnNvbHV0ZSh1cmwpIHtcbiAgLy8gQSBVUkwgaXMgY29uc2lkZXJlZCBhYnNvbHV0ZSBpZiBpdCBiZWdpbnMgd2l0aCBcIjxzY2hlbWU+Oi8vXCIgb3IgXCIvL1wiIChwcm90b2NvbC1yZWxhdGl2ZSBVUkwpLlxuICAvLyBSRkMgMzk4NiBkZWZpbmVzIHNjaGVtZSBuYW1lIGFzIGEgc2VxdWVuY2Ugb2YgY2hhcmFjdGVycyBiZWdpbm5pbmcgd2l0aCBhIGxldHRlciBhbmQgZm9sbG93ZWRcbiAgLy8gYnkgYW55IGNvbWJpbmF0aW9uIG9mIGxldHRlcnMsIGRpZ2l0cywgcGx1cywgcGVyaW9kLCBvciBoeXBoZW4uXG4gIHJldHVybiAvXihbYS16XVthLXpcXGRcXCtcXC1cXC5dKjopP1xcL1xcLy9pLnRlc3QodXJsKTtcbn1cblxuLyoqXG4gKiBGb3JtYXQgYW4gdXJsIGNvbWJpbmluZyBwcm92aWRlZCB1cmxzIG9yIHJldHVybmluZyB0aGUgcmVsYXRpdmVVUkxcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVybCBUaGUgYmFzZSB1cmxcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVSTCBUaGUgcmVsYXRpdmUgdXJsXG4gKiBAcmV0dXJucyB7c3RyaW5nfSByZWxhdGl2ZVVSTCBpZiB0aGUgc3BlY2lmaWVkIHJlbGF0aXZlVVJMIGlzIGFic29sdXRlIG9yIGJhc2VVcmwgaXMgbm90IGRlZmluZWQsXG4gKiAgICAgICAgICAgICAgICAgICBvdGhlcndpc2UgaXQgcmV0dXJucyB0aGUgY29tYmluYXRpb24gb2YgYm90aCB1cmxzXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIFRoZSBwYXJhbXMgb2JqZWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXQoYmFzZVVybCwgcmVsYXRpdmVVUkwsIHBhcmFtcykge1xuICBpZiAoIWJhc2VVcmwgfHwgaXNBYnNvbHV0ZShyZWxhdGl2ZVVSTCkpIHtcbiAgICByZXR1cm4gY29uY2F0UGFyYW1zKHJlbGF0aXZlVVJMLCBwYXJhbXMpO1xuICB9XG5cbiAgcmV0dXJuIGNvbmNhdFBhcmFtcyhjb21iaW5lKGJhc2VVcmwsIHJlbGF0aXZlVVJMKSwgcGFyYW1zKTtcbn1cbiIsIi8qIVxyXG4gKiBAbmFtZSBKYXZhU2NyaXB0L05vZGVKUyBNZXJnZSB2MS4yLjBcclxuICogQGF1dGhvciB5ZWlrb3NcclxuICogQHJlcG9zaXRvcnkgaHR0cHM6Ly9naXRodWIuY29tL3llaWtvcy9qcy5tZXJnZVxyXG5cclxuICogQ29weXJpZ2h0IDIwMTQgeWVpa29zIC0gTUlUIGxpY2Vuc2VcclxuICogaHR0cHM6Ly9yYXcuZ2l0aHViLmNvbS95ZWlrb3MvanMubWVyZ2UvbWFzdGVyL0xJQ0VOU0VcclxuICovXHJcblxyXG47KGZ1bmN0aW9uKGlzTm9kZSkge1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSBvbmUgb3IgbW9yZSBvYmplY3RzIFxyXG5cdCAqIEBwYXJhbSBib29sPyBjbG9uZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCwuLi4gYXJndW1lbnRzXHJcblx0ICogQHJldHVybiBvYmplY3RcclxuXHQgKi9cclxuXHJcblx0dmFyIFB1YmxpYyA9IGZ1bmN0aW9uKGNsb25lKSB7XHJcblxyXG5cdFx0cmV0dXJuIG1lcmdlKGNsb25lID09PSB0cnVlLCBmYWxzZSwgYXJndW1lbnRzKTtcclxuXHJcblx0fSwgcHVibGljTmFtZSA9ICdtZXJnZSc7XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHR3byBvciBtb3JlIG9iamVjdHMgcmVjdXJzaXZlbHkgXHJcblx0ICogQHBhcmFtIGJvb2w/IGNsb25lXHJcblx0ICogQHBhcmFtIG1peGVkLC4uLiBhcmd1bWVudHNcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHRQdWJsaWMucmVjdXJzaXZlID0gZnVuY3Rpb24oY2xvbmUpIHtcclxuXHJcblx0XHRyZXR1cm4gbWVyZ2UoY2xvbmUgPT09IHRydWUsIHRydWUsIGFyZ3VtZW50cyk7XHJcblxyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsb25lIHRoZSBpbnB1dCByZW1vdmluZyBhbnkgcmVmZXJlbmNlXHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHJldHVybiBtaXhlZFxyXG5cdCAqL1xyXG5cclxuXHRQdWJsaWMuY2xvbmUgPSBmdW5jdGlvbihpbnB1dCkge1xyXG5cclxuXHRcdHZhciBvdXRwdXQgPSBpbnB1dCxcclxuXHRcdFx0dHlwZSA9IHR5cGVPZihpbnB1dCksXHJcblx0XHRcdGluZGV4LCBzaXplO1xyXG5cclxuXHRcdGlmICh0eXBlID09PSAnYXJyYXknKSB7XHJcblxyXG5cdFx0XHRvdXRwdXQgPSBbXTtcclxuXHRcdFx0c2l6ZSA9IGlucHV0Lmxlbmd0aDtcclxuXHJcblx0XHRcdGZvciAoaW5kZXg9MDtpbmRleDxzaXplOysraW5kZXgpXHJcblxyXG5cdFx0XHRcdG91dHB1dFtpbmRleF0gPSBQdWJsaWMuY2xvbmUoaW5wdXRbaW5kZXhdKTtcclxuXHJcblx0XHR9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKSB7XHJcblxyXG5cdFx0XHRvdXRwdXQgPSB7fTtcclxuXHJcblx0XHRcdGZvciAoaW5kZXggaW4gaW5wdXQpXHJcblxyXG5cdFx0XHRcdG91dHB1dFtpbmRleF0gPSBQdWJsaWMuY2xvbmUoaW5wdXRbaW5kZXhdKTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG91dHB1dDtcclxuXHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9iamVjdHMgcmVjdXJzaXZlbHlcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcGFyYW0gbWl4ZWQgZXh0ZW5kXHJcblx0ICogQHJldHVybiBtaXhlZFxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiBtZXJnZV9yZWN1cnNpdmUoYmFzZSwgZXh0ZW5kKSB7XHJcblxyXG5cdFx0aWYgKHR5cGVPZihiYXNlKSAhPT0gJ29iamVjdCcpXHJcblxyXG5cdFx0XHRyZXR1cm4gZXh0ZW5kO1xyXG5cclxuXHRcdGZvciAodmFyIGtleSBpbiBleHRlbmQpIHtcclxuXHJcblx0XHRcdGlmICh0eXBlT2YoYmFzZVtrZXldKSA9PT0gJ29iamVjdCcgJiYgdHlwZU9mKGV4dGVuZFtrZXldKSA9PT0gJ29iamVjdCcpIHtcclxuXHJcblx0XHRcdFx0YmFzZVtrZXldID0gbWVyZ2VfcmVjdXJzaXZlKGJhc2Vba2V5XSwgZXh0ZW5kW2tleV0pO1xyXG5cclxuXHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0YmFzZVtrZXldID0gZXh0ZW5kW2tleV07XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBiYXNlO1xyXG5cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHR3byBvciBtb3JlIG9iamVjdHNcclxuXHQgKiBAcGFyYW0gYm9vbCBjbG9uZVxyXG5cdCAqIEBwYXJhbSBib29sIHJlY3Vyc2l2ZVxyXG5cdCAqIEBwYXJhbSBhcnJheSBhcmd2XHJcblx0ICogQHJldHVybiBvYmplY3RcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gbWVyZ2UoY2xvbmUsIHJlY3Vyc2l2ZSwgYXJndikge1xyXG5cclxuXHRcdHZhciByZXN1bHQgPSBhcmd2WzBdLFxyXG5cdFx0XHRzaXplID0gYXJndi5sZW5ndGg7XHJcblxyXG5cdFx0aWYgKGNsb25lIHx8IHR5cGVPZihyZXN1bHQpICE9PSAnb2JqZWN0JylcclxuXHJcblx0XHRcdHJlc3VsdCA9IHt9O1xyXG5cclxuXHRcdGZvciAodmFyIGluZGV4PTA7aW5kZXg8c2l6ZTsrK2luZGV4KSB7XHJcblxyXG5cdFx0XHR2YXIgaXRlbSA9IGFyZ3ZbaW5kZXhdLFxyXG5cclxuXHRcdFx0XHR0eXBlID0gdHlwZU9mKGl0ZW0pO1xyXG5cclxuXHRcdFx0aWYgKHR5cGUgIT09ICdvYmplY3QnKSBjb250aW51ZTtcclxuXHJcblx0XHRcdGZvciAodmFyIGtleSBpbiBpdGVtKSB7XHJcblxyXG5cdFx0XHRcdHZhciBzaXRlbSA9IGNsb25lID8gUHVibGljLmNsb25lKGl0ZW1ba2V5XSkgOiBpdGVtW2tleV07XHJcblxyXG5cdFx0XHRcdGlmIChyZWN1cnNpdmUpIHtcclxuXHJcblx0XHRcdFx0XHRyZXN1bHRba2V5XSA9IG1lcmdlX3JlY3Vyc2l2ZShyZXN1bHRba2V5XSwgc2l0ZW0pO1xyXG5cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHRcdHJlc3VsdFtrZXldID0gc2l0ZW07XHJcblxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdHlwZSBvZiB2YXJpYWJsZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEByZXR1cm4gc3RyaW5nXHJcblx0ICpcclxuXHQgKiBAc2VlIGh0dHA6Ly9qc3BlcmYuY29tL3R5cGVvZnZhclxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiB0eXBlT2YoaW5wdXQpIHtcclxuXHJcblx0XHRyZXR1cm4gKHt9KS50b1N0cmluZy5jYWxsKGlucHV0KS5zbGljZSg4LCAtMSkudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0fVxyXG5cclxuXHRpZiAoaXNOb2RlKSB7XHJcblxyXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBQdWJsaWM7XHJcblxyXG5cdH0gZWxzZSB7XHJcblxyXG5cdFx0d2luZG93W3B1YmxpY05hbWVdID0gUHVibGljO1xyXG5cclxuXHR9XHJcblxyXG59KSh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cyk7IiwiaW1wb3J0IF9tZXJnZSBmcm9tICdtZXJnZSc7XG5cblxuLyoqXG4gKiBSZWN1cnNpdmVseSBtZXJnZSBvYmplY3RzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdHMgdG8gbWVyZ2VcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIG1lcmdlZCBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZSguLi5wYXJhbXMpICB7XG4gIHJldHVybiBfbWVyZ2UucmVjdXJzaXZlKHRydWUsIC4uLnBhcmFtcyk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgc2tpcHBlZCBwcm9wZXJ0aWVzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgb2JqZWN0IHRvIHNraXAgcHJvcGVydGllcyBmcm9tXG4gKiBAcGFyYW0ge1tTdHJpbmddfSBrZXlzIGtleXMgb2YgdGhlIHByb3BlcnRpZXMgdG8gc2tpcFxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgb2JqZWN0IHdpdGggdGhlIHByb3BlcnRpZXMgc2tpcHBlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2tpcChvYmosIGtleXMpIHtcbiAgY29uc3Qgc2tpcHBlZCA9IHt9O1xuICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goKG9iaktleSkgPT4ge1xuICAgIGlmIChrZXlzLmluZGV4T2Yob2JqS2V5KSA9PT0gLTEpIHtcbiAgICAgIHNraXBwZWRbb2JqS2V5XSA9IG9ialtvYmpLZXldO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBza2lwcGVkO1xufVxuIiwiY29uc3QgaWRlbnRpdHkgID0gcmVzcG9uc2UgPT4gcmVzcG9uc2U7XG5jb25zdCByZWplY3Rpb24gPSBlcnIgPT4gUHJvbWlzZS5yZWplY3QoZXJyKTtcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNaWRkbGV3YXJlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fYmVmb3JlICA9IFtdO1xuICAgIHRoaXMuX2FmdGVyICAgPSBbXTtcbiAgICB0aGlzLl9maW5hbGx5ID0gW107XG4gIH1cblxuICBiZWZvcmUoZm4pIHtcbiAgICB0aGlzLl9iZWZvcmUucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXMuX2JlZm9yZS5sZW5ndGggLSAxO1xuICB9XG5cbiAgYWZ0ZXIoZnVsZmlsbCA9IGlkZW50aXR5LCByZWplY3QgPSByZWplY3Rpb24pIHtcbiAgICB0aGlzLl9hZnRlci5wdXNoKHsgZnVsZmlsbCwgcmVqZWN0IH0pO1xuICAgIHJldHVybiB0aGlzLl9hZnRlci5sZW5ndGggLSAxO1xuICB9XG5cbiAgZmluYWxseShmbikge1xuICAgIHRoaXMuX2ZpbmFsbHkucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXMuX2ZpbmFsbHkubGVuZ3RoIC0gMTtcbiAgfVxuXG4gIHJlc29sdmVCZWZvcmUoY29uZmlnKSB7XG4gICAgY29uc3QgY2hhaW4gPSAocHJvbWlzZSwgdGFzaykgPT4gcHJvbWlzZS50aGVuKHRhc2spO1xuICAgIHJldHVybiB0aGlzLl9iZWZvcmUucmVkdWNlKGNoYWluLCBQcm9taXNlLnJlc29sdmUoY29uZmlnKSk7XG4gIH1cblxuICByZXNvbHZlQWZ0ZXIoZXJyLCByZXNwb25zZSkge1xuICAgIGNvbnN0IGNoYWluICAgPSAocHJvbWlzZSwgdGFzaykgPT4gcHJvbWlzZS50aGVuKHRhc2suZnVsZmlsbCwgdGFzay5yZWplY3QpO1xuICAgIGNvbnN0IGluaXRpYWwgPSBlcnIgPyBQcm9taXNlLnJlamVjdChlcnIpIDogUHJvbWlzZS5yZXNvbHZlKHJlc3BvbnNlKTtcbiAgICByZXR1cm4gdGhpcy5fYWZ0ZXIucmVkdWNlKGNoYWluLCBpbml0aWFsKTtcbiAgfVxuXG5cbiAgcmVzb2x2ZUZpbmFsbHkoKSB7XG4gICAgdGhpcy5fZmluYWxseS5mb3JFYWNoKHRhc2sgPT4gdGFzaygpKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgbWVyZ2UgfSBmcm9tICcuL3V0aWxzJztcblxuXG5jb25zdCBERUZBVUxUX0hFQURFUlMgPSB7XG4gICdBY2NlcHQnICAgICAgOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9wbGFpbiwgKi8qJywgLy8gZXNsaW50LWRpc2FibGUtbGluZSBxdW90ZS1wcm9wc1xuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb25maWcge1xuICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgIHRoaXMuX2RlZmF1bHRzID0gbWVyZ2Uoe30sIHsgaGVhZGVyczogREVGQVVMVF9IRUFERVJTIH0pO1xuICAgIHRoaXMuX2NvbmZpZyAgID0ge307XG5cbiAgICB0aGlzLnNldChjb25maWcpO1xuICB9XG5cbiAgbWVyZ2VXaXRoRGVmYXVsdHMoLi4uY29uZmlnUGFyYW1zKSB7XG4gICAgY29uc3QgY29uZmlnID0gbWVyZ2UodGhpcy5fZGVmYXVsdHMsIHRoaXMuX2NvbmZpZywgLi4uY29uZmlnUGFyYW1zKTtcbiAgICBpZiAoXG4gICAgICB0eXBlb2YgY29uZmlnLmJvZHkgPT09ICdvYmplY3QnICYmXG4gICAgICBjb25maWcuaGVhZGVycyAmJlxuICAgICAgY29uZmlnLmhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID09PSAnYXBwbGljYXRpb24vanNvbidcbiAgICApIHtcbiAgICAgIGNvbmZpZy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoY29uZmlnLmJvZHkpO1xuICAgIH1cbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgc2V0KGNvbmZpZykge1xuICAgIHRoaXMuX2NvbmZpZyA9IG1lcmdlKHRoaXMuX2NvbmZpZywgY29uZmlnKTtcbiAgfVxuXG4gIGdldCgpIHtcbiAgICByZXR1cm4gbWVyZ2UodGhpcy5fZGVmYXVsdHMsIHRoaXMuX2NvbmZpZyk7XG4gIH1cbn1cbiIsIi8qKlxuICogV3JhcCBhIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIHJlc3BvbnNlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHJlYWRlciB0eXBlIG9mIHJlYWRlciB0byB1c2Ugb24gcmVzcG9uc2UgYm9keVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZXMgdG8gdGhlIHdyYXBwZWQgcmVhZCByZXNwb25zZVxuICovXG5mdW5jdGlvbiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsIHJlYWRlcikge1xuICBjb25zdCByZXMgPSB7XG4gICAgaGVhZGVycyAgIDogcmVzcG9uc2UuaGVhZGVycyxcbiAgICBzdGF0dXMgICAgOiByZXNwb25zZS5zdGF0dXMsXG4gICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dFxuICB9O1xuXG4gIGlmIChyZWFkZXIgPT09ICdyYXcnKSB7XG4gICAgcmVzLmRhdGEgPSByZXNwb25zZS5ib2R5O1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2VbcmVhZGVyXSgpXG4gIC50aGVuKChkYXRhKSA9PiB7XG4gICAgcmVzLmRhdGEgPSBkYXRhO1xuICAgIHJldHVybiByZXM7XG4gIH0pO1xufVxuXG4vKipcbiAqIFJlYWRzIG9yIHJlamVjdHMgYSBmZXRjaCByZXNwb25zZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSByZXNwb25zZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSByZWFkZXIgdHlwZSBvZiByZWFkZXIgdG8gdXNlIG9uIHJlc3BvbnNlIGJvZHlcbiAqIEByZXR1cm4ge1Byb21pc2V9IHJlYWQgb3IgcmVqZWN0aW9uIHByb21pc2VcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlLCByZWFkZXIpIHtcbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIGNvbnN0IGVyciAgICAgICA9IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICBlcnIuc3RhdHVzICAgICAgPSByZXNwb25zZS5zdGF0dXM7XG4gICAgZXJyLnN0YXR1c1RleHQgID0gcmVzcG9uc2Uuc3RhdHVzVGV4dDtcbiAgICBlcnIuaGVhZGVycyAgICAgPSByZXNwb25zZS5oZWFkZXJzO1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICB9XG4gIGlmIChyZWFkZXIpIHtcbiAgICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCByZWFkZXIpO1xuICB9XG5cbiAgY29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gIGlmIChjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmNsdWRlcygnYXBwbGljYXRpb24vanNvbicpKSB7XG4gICAgcmV0dXJuIHdyYXBSZXNwb25zZShyZXNwb25zZSwgJ2pzb24nKTtcbiAgfVxuICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCAndGV4dCcpO1xufVxuIiwiaW1wb3J0ICd3aGF0d2ctZmV0Y2gnO1xuXG5pbXBvcnQgeyBmb3JtYXQgYXMgZm9ybWF0VXJsIH0gZnJvbSAnLi9oZWxwZXJzL3VybC1oYW5kbGVyJztcbmltcG9ydCB7IHNraXAsIG1lcmdlIH0gICAgICAgICBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBNaWRkbGV3YXJlICAgICAgICAgICAgICBmcm9tICcuL21pZGRsZXdhcmUnO1xuaW1wb3J0IENvbmZpZyAgICAgICAgICAgICAgICAgIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCByZXNwb25zZUhhbmRsZXIgICAgICAgICBmcm9tICcuL2hlbHBlcnMvcmVzcG9uc2UtaGFuZGxlcic7XG5cblxuY2xhc3MgVHJhZSB7XG4gIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgdGhpcy5fbWlkZGxld2FyZSA9IG5ldyBNaWRkbGV3YXJlKCk7XG4gICAgdGhpcy5fY29uZmlnICAgICA9IG5ldyBDb25maWcoc2tpcChjb25maWcsIFsnYmFzZVVybCddKSk7XG5cbiAgICB0aGlzLmJhc2VVcmwoY29uZmlnLmJhc2VVcmwgfHwgJycpO1xuICAgIHRoaXMuX2luaXRNZXRob2RzV2l0aEJvZHkoKTtcbiAgICB0aGlzLl9pbml0TWV0aG9kc1dpdGhOb0JvZHkoKTtcbiAgICB0aGlzLl9pbml0TWlkZGxld2FyZU1ldGhvZHMoKTtcbiAgfVxuXG4gIGNyZWF0ZShjb25maWcpIHtcbiAgICBjb25zdCBpbnN0YW5jZSA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG1lcmdlKHRoaXMuZGVmYXVsdHMoKSwgY29uZmlnKSk7XG4gICAgY29uc3QgbWFwQWZ0ZXIgPSAoeyBmdWxmaWxsLCByZWplY3QgfSkgPT4gaW5zdGFuY2UuYWZ0ZXIoZnVsZmlsbCwgcmVqZWN0KTtcbiAgICB0aGlzLl9taWRkbGV3YXJlLl9iZWZvcmUuZm9yRWFjaChpbnN0YW5jZS5iZWZvcmUpO1xuICAgIHRoaXMuX21pZGRsZXdhcmUuX2FmdGVyLmZvckVhY2gobWFwQWZ0ZXIpO1xuICAgIHRoaXMuX21pZGRsZXdhcmUuX2ZpbmFsbHkuZm9yRWFjaChpbnN0YW5jZS5maW5hbGx5KTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH1cblxuICBkZWZhdWx0cyhjb25maWcpIHtcbiAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRzID0gdGhpcy5fY29uZmlnLmdldCgpO1xuICAgICAgdGhpcy5iYXNlVXJsKCkgJiYgKGRlZmF1bHRzLmJhc2VVcmwgPSB0aGlzLmJhc2VVcmwoKSk7XG4gICAgICByZXR1cm4gZGVmYXVsdHM7XG4gICAgfVxuICAgIHRoaXMuX2NvbmZpZy5zZXQoc2tpcChjb25maWcsIFsnYmFzZVVybCddKSk7XG4gICAgY29uZmlnLmJhc2VVcmwgJiYgdGhpcy5iYXNlVXJsKGNvbmZpZy5iYXNlVXJsKTtcbiAgICByZXR1cm4gdGhpcy5fY29uZmlnLmdldCgpO1xuICB9XG5cbiAgYmFzZVVybChiYXNlVXJsKSB7XG4gICAgaWYgKHR5cGVvZiBiYXNlVXJsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIHRoaXMuX2Jhc2VVcmw7XG4gICAgfVxuICAgIHRoaXMuX2Jhc2VVcmwgPSBiYXNlVXJsO1xuICAgIHJldHVybiB0aGlzLl9iYXNlVXJsO1xuICB9XG5cbiAgcmVxdWVzdChjb25maWcgPSB7fSkge1xuICAgIGNvbmZpZy5tZXRob2QgfHwgKGNvbmZpZy5tZXRob2QgPSAnZ2V0Jyk7XG4gICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlV2l0aERlZmF1bHRzKGNvbmZpZyk7XG4gICAgY29uc3QgdXJsICAgICAgICAgID0gZm9ybWF0VXJsKHRoaXMuX2Jhc2VVcmwsIGNvbmZpZy51cmwsIGNvbmZpZy5wYXJhbXMpO1xuXG4gICAgcmV0dXJuIHRoaXMuX2ZldGNoKHVybCwgbWVyZ2VkQ29uZmlnKTtcbiAgfVxuXG4gIF9mZXRjaCh1cmwsIGNvbmZpZykge1xuICAgIHJldHVybiB0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVCZWZvcmUoY29uZmlnKVxuICAgIC50aGVuKGNvbmZpZyA9PiBmZXRjaCh1cmwsIGNvbmZpZykpXG4gICAgLnRoZW4ocmVzID0+IHJlc3BvbnNlSGFuZGxlcihyZXMsIGNvbmZpZy5ib2R5VHlwZSkpXG4gICAgLnRoZW4oXG4gICAgICByZXMgPT4gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlQWZ0ZXIodW5kZWZpbmVkLCByZXMpLFxuICAgICAgZXJyID0+IHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUFmdGVyKGVycilcbiAgICApXG4gICAgLnRoZW4oXG4gICAgICByZXMgPT4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUZpbmFsbHkoKSkudGhlbigoKSA9PiByZXMpLFxuICAgICAgZXJyID0+IFByb21pc2UucmVzb2x2ZSh0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVGaW5hbGx5KCkpLnRoZW4oKCkgPT4geyB0aHJvdyBlcnI7IH0pXG4gICAgKTtcbiAgfVxuXG4gIF9pbml0TWV0aG9kc1dpdGhOb0JvZHkoKSB7XG4gICAgWydnZXQnLCAnZGVsZXRlJywgJ2hlYWQnXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIHRoaXNbbWV0aG9kXSA9IChwYXRoLCBjb25maWcgPSB7fSkgPT4ge1xuICAgICAgICBjb25zdCBtZXJnZWRDb25maWcgPSB0aGlzLl9jb25maWcubWVyZ2VXaXRoRGVmYXVsdHMoY29uZmlnLCB7IG1ldGhvZCB9KTtcbiAgICAgICAgY29uc3QgdXJsICAgICAgICAgID0gZm9ybWF0VXJsKHRoaXMuX2Jhc2VVcmwsIHBhdGgsIGNvbmZpZy5wYXJhbXMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9mZXRjaCh1cmwsIG1lcmdlZENvbmZpZyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgX2luaXRNZXRob2RzV2l0aEJvZHkoKSB7XG4gICAgWydwb3N0JywgJ3B1dCcsICdwYXRjaCddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgdGhpc1ttZXRob2RdID0gKHBhdGgsIGJvZHksIGNvbmZpZykgPT4ge1xuICAgICAgICBjb25zdCBtZXJnZWRDb25maWcgPSB0aGlzLl9jb25maWcubWVyZ2VXaXRoRGVmYXVsdHMoY29uZmlnLCB7IGJvZHksIG1ldGhvZCB9KTtcbiAgICAgICAgY29uc3QgdXJsICAgICAgICAgID0gZm9ybWF0VXJsKHRoaXMuX2Jhc2VVcmwsIHBhdGgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9mZXRjaCh1cmwsIG1lcmdlZENvbmZpZyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgX2luaXRNaWRkbGV3YXJlTWV0aG9kcygpIHtcbiAgICBbJ2JlZm9yZScsICdhZnRlcicsICdmaW5hbGx5J10uZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICB0aGlzW21ldGhvZF0gPSAoLi4uYXJncykgPT4gdGhpcy5fbWlkZGxld2FyZVttZXRob2RdKC4uLmFyZ3MpO1xuICAgIH0pO1xuICB9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IFRyYWUoKTtcbiJdLCJuYW1lcyI6WyJzZWxmIiwiZmV0Y2giLCJzdXBwb3J0IiwiU3ltYm9sIiwiQmxvYiIsImUiLCJhcnJheUJ1ZmZlciIsInZpZXdDbGFzc2VzIiwiaXNEYXRhVmlldyIsIm9iaiIsIkRhdGFWaWV3IiwicHJvdG90eXBlIiwiaXNQcm90b3R5cGVPZiIsImlzQXJyYXlCdWZmZXJWaWV3IiwiQXJyYXlCdWZmZXIiLCJpc1ZpZXciLCJpbmRleE9mIiwiT2JqZWN0IiwidG9TdHJpbmciLCJjYWxsIiwibm9ybWFsaXplTmFtZSIsIm5hbWUiLCJTdHJpbmciLCJ0ZXN0IiwiVHlwZUVycm9yIiwidG9Mb3dlckNhc2UiLCJub3JtYWxpemVWYWx1ZSIsInZhbHVlIiwiaXRlcmF0b3JGb3IiLCJpdGVtcyIsIml0ZXJhdG9yIiwic2hpZnQiLCJkb25lIiwidW5kZWZpbmVkIiwiaXRlcmFibGUiLCJIZWFkZXJzIiwiaGVhZGVycyIsIm1hcCIsImZvckVhY2giLCJhcHBlbmQiLCJnZXRPd25Qcm9wZXJ0eU5hbWVzIiwib2xkVmFsdWUiLCJnZXQiLCJoYXMiLCJoYXNPd25Qcm9wZXJ0eSIsInNldCIsImNhbGxiYWNrIiwidGhpc0FyZyIsImtleXMiLCJwdXNoIiwidmFsdWVzIiwiZW50cmllcyIsImNvbnN1bWVkIiwiYm9keSIsImJvZHlVc2VkIiwiUHJvbWlzZSIsInJlamVjdCIsImZpbGVSZWFkZXJSZWFkeSIsInJlYWRlciIsInJlc29sdmUiLCJvbmxvYWQiLCJyZXN1bHQiLCJvbmVycm9yIiwiZXJyb3IiLCJyZWFkQmxvYkFzQXJyYXlCdWZmZXIiLCJibG9iIiwiRmlsZVJlYWRlciIsInByb21pc2UiLCJyZWFkQXNBcnJheUJ1ZmZlciIsInJlYWRCbG9iQXNUZXh0IiwicmVhZEFzVGV4dCIsInJlYWRBcnJheUJ1ZmZlckFzVGV4dCIsImJ1ZiIsInZpZXciLCJVaW50OEFycmF5IiwiY2hhcnMiLCJBcnJheSIsImxlbmd0aCIsImkiLCJmcm9tQ2hhckNvZGUiLCJqb2luIiwiYnVmZmVyQ2xvbmUiLCJzbGljZSIsImJ5dGVMZW5ndGgiLCJidWZmZXIiLCJCb2R5IiwiX2luaXRCb2R5IiwiX2JvZHlJbml0IiwiX2JvZHlUZXh0IiwiX2JvZHlCbG9iIiwiZm9ybURhdGEiLCJGb3JtRGF0YSIsIl9ib2R5Rm9ybURhdGEiLCJzZWFyY2hQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJfYm9keUFycmF5QnVmZmVyIiwiRXJyb3IiLCJ0eXBlIiwicmVqZWN0ZWQiLCJ0aGVuIiwidGV4dCIsImRlY29kZSIsImpzb24iLCJKU09OIiwicGFyc2UiLCJtZXRob2RzIiwibm9ybWFsaXplTWV0aG9kIiwibWV0aG9kIiwidXBjYXNlZCIsInRvVXBwZXJDYXNlIiwiUmVxdWVzdCIsImlucHV0Iiwib3B0aW9ucyIsInVybCIsImNyZWRlbnRpYWxzIiwibW9kZSIsInJlZmVycmVyIiwiY2xvbmUiLCJmb3JtIiwidHJpbSIsInNwbGl0IiwiYnl0ZXMiLCJyZXBsYWNlIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwicGFyc2VIZWFkZXJzIiwicmF3SGVhZGVycyIsImxpbmUiLCJwYXJ0cyIsImtleSIsIlJlc3BvbnNlIiwiYm9keUluaXQiLCJzdGF0dXMiLCJvayIsInN0YXR1c1RleHQiLCJyZXNwb25zZSIsInJlZGlyZWN0U3RhdHVzZXMiLCJyZWRpcmVjdCIsIlJhbmdlRXJyb3IiLCJsb2NhdGlvbiIsImluaXQiLCJyZXF1ZXN0IiwieGhyIiwiWE1MSHR0cFJlcXVlc3QiLCJnZXRBbGxSZXNwb25zZUhlYWRlcnMiLCJyZXNwb25zZVVSTCIsInJlc3BvbnNlVGV4dCIsIm9udGltZW91dCIsIm9wZW4iLCJ3aXRoQ3JlZGVudGlhbHMiLCJyZXNwb25zZVR5cGUiLCJzZXRSZXF1ZXN0SGVhZGVyIiwic2VuZCIsInBvbHlmaWxsIiwidGhpcyIsImhleFRhYmxlIiwiYXJyYXkiLCJzb3VyY2UiLCJwbGFpbk9iamVjdHMiLCJjcmVhdGUiLCJ0YXJnZXQiLCJpc0FycmF5IiwiY29uY2F0IiwibWVyZ2VUYXJnZXQiLCJleHBvcnRzIiwiYXJyYXlUb09iamVjdCIsIml0ZW0iLCJiYWJlbEhlbHBlcnMudHlwZW9mIiwibWVyZ2UiLCJyZWR1Y2UiLCJhY2MiLCJzdHIiLCJzdHJpbmciLCJvdXQiLCJjIiwiY2hhckNvZGVBdCIsImNoYXJBdCIsInJlZmVyZW5jZXMiLCJyZWZzIiwibG9va3VwIiwiY29tcGFjdGVkIiwiY29tcGFjdCIsImNvbnN0cnVjdG9yIiwiaXNCdWZmZXIiLCJwZXJjZW50VHdlbnRpZXMiLCJ1dGlscyIsInJlcXVpcmUkJDAiLCJmb3JtYXRzIiwicmVxdWlyZSQkMSIsImFycmF5UHJlZml4R2VuZXJhdG9ycyIsImJyYWNrZXRzIiwicHJlZml4IiwiaW5kaWNlcyIsInJlcGVhdCIsInRvSVNPIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwiZGVmYXVsdHMiLCJlbmNvZGUiLCJzZXJpYWxpemVEYXRlIiwiZGF0ZSIsInN0cmluZ2lmeSIsIm9iamVjdCIsImdlbmVyYXRlQXJyYXlQcmVmaXgiLCJzdHJpY3ROdWxsSGFuZGxpbmciLCJza2lwTnVsbHMiLCJlbmNvZGVyIiwiZmlsdGVyIiwic29ydCIsImFsbG93RG90cyIsImZvcm1hdHRlciIsIm9iaktleXMiLCJvcHRzIiwiZGVsaW1pdGVyIiwiZm9ybWF0IiwiZGVmYXVsdCIsImZvcm1hdHRlcnMiLCJhcnJheUZvcm1hdCIsInBhcnNlVmFsdWVzIiwicGFyYW1ldGVyTGltaXQiLCJJbmZpbml0eSIsInBhcnQiLCJwb3MiLCJ2YWwiLCJkZWNvZGVyIiwicGFyc2VPYmplY3QiLCJjaGFpbiIsInJvb3QiLCJjbGVhblJvb3QiLCJpbmRleCIsInBhcnNlSW50IiwiaXNOYU4iLCJwYXJzZUFycmF5cyIsImFycmF5TGltaXQiLCJwYXJzZUtleXMiLCJnaXZlbktleSIsInBhcmVudCIsImNoaWxkIiwic2VnbWVudCIsImV4ZWMiLCJhbGxvd1Byb3RvdHlwZXMiLCJkZXB0aCIsImlzUmVnRXhwIiwidGVtcE9iaiIsIm5ld09iaiIsInJlcXVpcmUkJDIiLCJjb25jYXRQYXJhbXMiLCJVUkwiLCJwYXJhbXMiLCJzdHJpbmdpZnlQYXJhbXMiLCJjb21iaW5lIiwiYmFzZVVSTCIsInJlbGF0aXZlVVJMIiwiaXNBYnNvbHV0ZSIsImJhc2VVcmwiLCJpc05vZGUiLCJQdWJsaWMiLCJhcmd1bWVudHMiLCJwdWJsaWNOYW1lIiwicmVjdXJzaXZlIiwib3V0cHV0IiwidHlwZU9mIiwic2l6ZSIsIm1lcmdlX3JlY3Vyc2l2ZSIsImJhc2UiLCJleHRlbmQiLCJhcmd2Iiwic2l0ZW0iLCJtb2R1bGUiLCJfbWVyZ2UiLCJza2lwIiwic2tpcHBlZCIsIm9iaktleSIsImlkZW50aXR5IiwicmVqZWN0aW9uIiwiZXJyIiwiTWlkZGxld2FyZSIsIl9iZWZvcmUiLCJfYWZ0ZXIiLCJfZmluYWxseSIsImZuIiwiZnVsZmlsbCIsImNvbmZpZyIsInRhc2siLCJpbml0aWFsIiwiREVGQVVMVF9IRUFERVJTIiwiQ29uZmlnIiwiX2RlZmF1bHRzIiwiX2NvbmZpZyIsImNvbmZpZ1BhcmFtcyIsIndyYXBSZXNwb25zZSIsInJlcyIsImRhdGEiLCJyZXNwb25zZUhhbmRsZXIiLCJjb250ZW50VHlwZSIsImluY2x1ZGVzIiwiVHJhZSIsIl9taWRkbGV3YXJlIiwiX2luaXRNZXRob2RzV2l0aEJvZHkiLCJfaW5pdE1ldGhvZHNXaXRoTm9Cb2R5IiwiX2luaXRNaWRkbGV3YXJlTWV0aG9kcyIsImluc3RhbmNlIiwibWFwQWZ0ZXIiLCJhZnRlciIsImJlZm9yZSIsImZpbmFsbHkiLCJfYmFzZVVybCIsIm1lcmdlZENvbmZpZyIsIm1lcmdlV2l0aERlZmF1bHRzIiwiZm9ybWF0VXJsIiwiX2ZldGNoIiwicmVzb2x2ZUJlZm9yZSIsImJvZHlUeXBlIiwicmVzb2x2ZUFmdGVyIiwicmVzb2x2ZUZpbmFsbHkiLCJwYXRoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxDQUFDLFVBQVNBLElBQVQsRUFBZTs7O01BR1ZBLEtBQUtDLEtBQVQsRUFBZ0I7Ozs7TUFJWkMsVUFBVTtrQkFDRSxxQkFBcUJGLElBRHZCO2NBRUYsWUFBWUEsSUFBWixJQUFvQixjQUFjRyxNQUZoQztVQUdOLGdCQUFnQkgsSUFBaEIsSUFBd0IsVUFBVUEsSUFBbEMsSUFBMkMsWUFBVztVQUN0RDtZQUNFSSxJQUFKO2VBQ08sSUFBUDtPQUZGLENBR0UsT0FBTUMsQ0FBTixFQUFTO2VBQ0YsS0FBUDs7S0FMNEMsRUFIcEM7Y0FXRixjQUFjTCxJQVhaO2lCQVlDLGlCQUFpQkE7R0FaaEM7O01BZUlFLFFBQVFJLFdBQVosRUFBeUI7UUFDbkJDLGNBQWMsQ0FDaEIsb0JBRGdCLEVBRWhCLHFCQUZnQixFQUdoQiw0QkFIZ0IsRUFJaEIscUJBSmdCLEVBS2hCLHNCQUxnQixFQU1oQixxQkFOZ0IsRUFPaEIsc0JBUGdCLEVBUWhCLHVCQVJnQixFQVNoQix1QkFUZ0IsQ0FBbEI7O1FBWUlDLGFBQWEsU0FBYkEsVUFBYSxDQUFTQyxHQUFULEVBQWM7YUFDdEJBLE9BQU9DLFNBQVNDLFNBQVQsQ0FBbUJDLGFBQW5CLENBQWlDSCxHQUFqQyxDQUFkO0tBREY7O1FBSUlJLG9CQUFvQkMsWUFBWUMsTUFBWixJQUFzQixVQUFTTixHQUFULEVBQWM7YUFDbkRBLE9BQU9GLFlBQVlTLE9BQVosQ0FBb0JDLE9BQU9OLFNBQVAsQ0FBaUJPLFFBQWpCLENBQTBCQyxJQUExQixDQUErQlYsR0FBL0IsQ0FBcEIsSUFBMkQsQ0FBQyxDQUExRTtLQURGOzs7V0FLT1csYUFBVCxDQUF1QkMsSUFBdkIsRUFBNkI7UUFDdkIsT0FBT0EsSUFBUCxLQUFnQixRQUFwQixFQUE4QjthQUNyQkMsT0FBT0QsSUFBUCxDQUFQOztRQUVFLDZCQUE2QkUsSUFBN0IsQ0FBa0NGLElBQWxDLENBQUosRUFBNkM7WUFDckMsSUFBSUcsU0FBSixDQUFjLHdDQUFkLENBQU47O1dBRUtILEtBQUtJLFdBQUwsRUFBUDs7O1dBR09DLGNBQVQsQ0FBd0JDLEtBQXhCLEVBQStCO1FBQ3pCLE9BQU9BLEtBQVAsS0FBaUIsUUFBckIsRUFBK0I7Y0FDckJMLE9BQU9LLEtBQVAsQ0FBUjs7V0FFS0EsS0FBUDs7OztXQUlPQyxXQUFULENBQXFCQyxLQUFyQixFQUE0QjtRQUN0QkMsV0FBVztZQUNQLGdCQUFXO1lBQ1hILFFBQVFFLE1BQU1FLEtBQU4sRUFBWjtlQUNPLEVBQUNDLE1BQU1MLFVBQVVNLFNBQWpCLEVBQTRCTixPQUFPQSxLQUFuQyxFQUFQOztLQUhKOztRQU9JekIsUUFBUWdDLFFBQVosRUFBc0I7ZUFDWC9CLE9BQU8yQixRQUFoQixJQUE0QixZQUFXO2VBQzlCQSxRQUFQO09BREY7OztXQUtLQSxRQUFQOzs7V0FHT0ssT0FBVCxDQUFpQkMsT0FBakIsRUFBMEI7U0FDbkJDLEdBQUwsR0FBVyxFQUFYOztRQUVJRCxtQkFBbUJELE9BQXZCLEVBQWdDO2NBQ3RCRyxPQUFSLENBQWdCLFVBQVNYLEtBQVQsRUFBZ0JOLElBQWhCLEVBQXNCO2FBQy9Ca0IsTUFBTCxDQUFZbEIsSUFBWixFQUFrQk0sS0FBbEI7T0FERixFQUVHLElBRkg7S0FERixNQUtPLElBQUlTLE9BQUosRUFBYTthQUNYSSxtQkFBUCxDQUEyQkosT0FBM0IsRUFBb0NFLE9BQXBDLENBQTRDLFVBQVNqQixJQUFULEVBQWU7YUFDcERrQixNQUFMLENBQVlsQixJQUFaLEVBQWtCZSxRQUFRZixJQUFSLENBQWxCO09BREYsRUFFRyxJQUZIOzs7O1VBTUlWLFNBQVIsQ0FBa0I0QixNQUFsQixHQUEyQixVQUFTbEIsSUFBVCxFQUFlTSxLQUFmLEVBQXNCO1dBQ3hDUCxjQUFjQyxJQUFkLENBQVA7WUFDUUssZUFBZUMsS0FBZixDQUFSO1FBQ0ljLFdBQVcsS0FBS0osR0FBTCxDQUFTaEIsSUFBVCxDQUFmO1NBQ0tnQixHQUFMLENBQVNoQixJQUFULElBQWlCb0IsV0FBV0EsV0FBUyxHQUFULEdBQWFkLEtBQXhCLEdBQWdDQSxLQUFqRDtHQUpGOztVQU9RaEIsU0FBUixDQUFrQixRQUFsQixJQUE4QixVQUFTVSxJQUFULEVBQWU7V0FDcEMsS0FBS2dCLEdBQUwsQ0FBU2pCLGNBQWNDLElBQWQsQ0FBVCxDQUFQO0dBREY7O1VBSVFWLFNBQVIsQ0FBa0IrQixHQUFsQixHQUF3QixVQUFTckIsSUFBVCxFQUFlO1dBQzlCRCxjQUFjQyxJQUFkLENBQVA7V0FDTyxLQUFLc0IsR0FBTCxDQUFTdEIsSUFBVCxJQUFpQixLQUFLZ0IsR0FBTCxDQUFTaEIsSUFBVCxDQUFqQixHQUFrQyxJQUF6QztHQUZGOztVQUtRVixTQUFSLENBQWtCZ0MsR0FBbEIsR0FBd0IsVUFBU3RCLElBQVQsRUFBZTtXQUM5QixLQUFLZ0IsR0FBTCxDQUFTTyxjQUFULENBQXdCeEIsY0FBY0MsSUFBZCxDQUF4QixDQUFQO0dBREY7O1VBSVFWLFNBQVIsQ0FBa0JrQyxHQUFsQixHQUF3QixVQUFTeEIsSUFBVCxFQUFlTSxLQUFmLEVBQXNCO1NBQ3ZDVSxHQUFMLENBQVNqQixjQUFjQyxJQUFkLENBQVQsSUFBZ0NLLGVBQWVDLEtBQWYsQ0FBaEM7R0FERjs7VUFJUWhCLFNBQVIsQ0FBa0IyQixPQUFsQixHQUE0QixVQUFTUSxRQUFULEVBQW1CQyxPQUFuQixFQUE0QjtTQUNqRCxJQUFJMUIsSUFBVCxJQUFpQixLQUFLZ0IsR0FBdEIsRUFBMkI7VUFDckIsS0FBS0EsR0FBTCxDQUFTTyxjQUFULENBQXdCdkIsSUFBeEIsQ0FBSixFQUFtQztpQkFDeEJGLElBQVQsQ0FBYzRCLE9BQWQsRUFBdUIsS0FBS1YsR0FBTCxDQUFTaEIsSUFBVCxDQUF2QixFQUF1Q0EsSUFBdkMsRUFBNkMsSUFBN0M7OztHQUhOOztVQVFRVixTQUFSLENBQWtCcUMsSUFBbEIsR0FBeUIsWUFBVztRQUM5Qm5CLFFBQVEsRUFBWjtTQUNLUyxPQUFMLENBQWEsVUFBU1gsS0FBVCxFQUFnQk4sSUFBaEIsRUFBc0I7WUFBUTRCLElBQU4sQ0FBVzVCLElBQVg7S0FBckM7V0FDT08sWUFBWUMsS0FBWixDQUFQO0dBSEY7O1VBTVFsQixTQUFSLENBQWtCdUMsTUFBbEIsR0FBMkIsWUFBVztRQUNoQ3JCLFFBQVEsRUFBWjtTQUNLUyxPQUFMLENBQWEsVUFBU1gsS0FBVCxFQUFnQjtZQUFRc0IsSUFBTixDQUFXdEIsS0FBWDtLQUEvQjtXQUNPQyxZQUFZQyxLQUFaLENBQVA7R0FIRjs7VUFNUWxCLFNBQVIsQ0FBa0J3QyxPQUFsQixHQUE0QixZQUFXO1FBQ2pDdEIsUUFBUSxFQUFaO1NBQ0tTLE9BQUwsQ0FBYSxVQUFTWCxLQUFULEVBQWdCTixJQUFoQixFQUFzQjtZQUFRNEIsSUFBTixDQUFXLENBQUM1QixJQUFELEVBQU9NLEtBQVAsQ0FBWDtLQUFyQztXQUNPQyxZQUFZQyxLQUFaLENBQVA7R0FIRjs7TUFNSTNCLFFBQVFnQyxRQUFaLEVBQXNCO1lBQ1p2QixTQUFSLENBQWtCUixPQUFPMkIsUUFBekIsSUFBcUNLLFFBQVF4QixTQUFSLENBQWtCd0MsT0FBdkQ7OztXQUdPQyxRQUFULENBQWtCQyxJQUFsQixFQUF3QjtRQUNsQkEsS0FBS0MsUUFBVCxFQUFtQjthQUNWQyxRQUFRQyxNQUFSLENBQWUsSUFBSWhDLFNBQUosQ0FBYyxjQUFkLENBQWYsQ0FBUDs7U0FFRzhCLFFBQUwsR0FBZ0IsSUFBaEI7OztXQUdPRyxlQUFULENBQXlCQyxNQUF6QixFQUFpQztXQUN4QixJQUFJSCxPQUFKLENBQVksVUFBU0ksT0FBVCxFQUFrQkgsTUFBbEIsRUFBMEI7YUFDcENJLE1BQVAsR0FBZ0IsWUFBVztnQkFDakJGLE9BQU9HLE1BQWY7T0FERjthQUdPQyxPQUFQLEdBQWlCLFlBQVc7ZUFDbkJKLE9BQU9LLEtBQWQ7T0FERjtLQUpLLENBQVA7OztXQVVPQyxxQkFBVCxDQUErQkMsSUFBL0IsRUFBcUM7UUFDL0JQLFNBQVMsSUFBSVEsVUFBSixFQUFiO1FBQ0lDLFVBQVVWLGdCQUFnQkMsTUFBaEIsQ0FBZDtXQUNPVSxpQkFBUCxDQUF5QkgsSUFBekI7V0FDT0UsT0FBUDs7O1dBR09FLGNBQVQsQ0FBd0JKLElBQXhCLEVBQThCO1FBQ3hCUCxTQUFTLElBQUlRLFVBQUosRUFBYjtRQUNJQyxVQUFVVixnQkFBZ0JDLE1BQWhCLENBQWQ7V0FDT1ksVUFBUCxDQUFrQkwsSUFBbEI7V0FDT0UsT0FBUDs7O1dBR09JLHFCQUFULENBQStCQyxHQUEvQixFQUFvQztRQUM5QkMsT0FBTyxJQUFJQyxVQUFKLENBQWVGLEdBQWYsQ0FBWDtRQUNJRyxRQUFRLElBQUlDLEtBQUosQ0FBVUgsS0FBS0ksTUFBZixDQUFaOztTQUVLLElBQUlDLElBQUksQ0FBYixFQUFnQkEsSUFBSUwsS0FBS0ksTUFBekIsRUFBaUNDLEdBQWpDLEVBQXNDO1lBQzlCQSxDQUFOLElBQVd4RCxPQUFPeUQsWUFBUCxDQUFvQk4sS0FBS0ssQ0FBTCxDQUFwQixDQUFYOztXQUVLSCxNQUFNSyxJQUFOLENBQVcsRUFBWCxDQUFQOzs7V0FHT0MsV0FBVCxDQUFxQlQsR0FBckIsRUFBMEI7UUFDcEJBLElBQUlVLEtBQVIsRUFBZTthQUNOVixJQUFJVSxLQUFKLENBQVUsQ0FBVixDQUFQO0tBREYsTUFFTztVQUNEVCxPQUFPLElBQUlDLFVBQUosQ0FBZUYsSUFBSVcsVUFBbkIsQ0FBWDtXQUNLdEMsR0FBTCxDQUFTLElBQUk2QixVQUFKLENBQWVGLEdBQWYsQ0FBVDthQUNPQyxLQUFLVyxNQUFaOzs7O1dBSUtDLElBQVQsR0FBZ0I7U0FDVC9CLFFBQUwsR0FBZ0IsS0FBaEI7O1NBRUtnQyxTQUFMLEdBQWlCLFVBQVNqQyxJQUFULEVBQWU7V0FDekJrQyxTQUFMLEdBQWlCbEMsSUFBakI7VUFDSSxDQUFDQSxJQUFMLEVBQVc7YUFDSm1DLFNBQUwsR0FBaUIsRUFBakI7T0FERixNQUVPLElBQUksT0FBT25DLElBQVAsS0FBZ0IsUUFBcEIsRUFBOEI7YUFDOUJtQyxTQUFMLEdBQWlCbkMsSUFBakI7T0FESyxNQUVBLElBQUluRCxRQUFRK0QsSUFBUixJQUFnQjdELEtBQUtPLFNBQUwsQ0FBZUMsYUFBZixDQUE2QnlDLElBQTdCLENBQXBCLEVBQXdEO2FBQ3hEb0MsU0FBTCxHQUFpQnBDLElBQWpCO09BREssTUFFQSxJQUFJbkQsUUFBUXdGLFFBQVIsSUFBb0JDLFNBQVNoRixTQUFULENBQW1CQyxhQUFuQixDQUFpQ3lDLElBQWpDLENBQXhCLEVBQWdFO2FBQ2hFdUMsYUFBTCxHQUFxQnZDLElBQXJCO09BREssTUFFQSxJQUFJbkQsUUFBUTJGLFlBQVIsSUFBd0JDLGdCQUFnQm5GLFNBQWhCLENBQTBCQyxhQUExQixDQUF3Q3lDLElBQXhDLENBQTVCLEVBQTJFO2FBQzNFbUMsU0FBTCxHQUFpQm5DLEtBQUtuQyxRQUFMLEVBQWpCO09BREssTUFFQSxJQUFJaEIsUUFBUUksV0FBUixJQUF1QkosUUFBUStELElBQS9CLElBQXVDekQsV0FBVzZDLElBQVgsQ0FBM0MsRUFBNkQ7YUFDN0QwQyxnQkFBTCxHQUF3QmQsWUFBWTVCLEtBQUsrQixNQUFqQixDQUF4Qjs7YUFFS0csU0FBTCxHQUFpQixJQUFJbkYsSUFBSixDQUFTLENBQUMsS0FBSzJGLGdCQUFOLENBQVQsQ0FBakI7T0FISyxNQUlBLElBQUk3RixRQUFRSSxXQUFSLEtBQXdCUSxZQUFZSCxTQUFaLENBQXNCQyxhQUF0QixDQUFvQ3lDLElBQXBDLEtBQTZDeEMsa0JBQWtCd0MsSUFBbEIsQ0FBckUsQ0FBSixFQUFtRzthQUNuRzBDLGdCQUFMLEdBQXdCZCxZQUFZNUIsSUFBWixDQUF4QjtPQURLLE1BRUE7Y0FDQyxJQUFJMkMsS0FBSixDQUFVLDJCQUFWLENBQU47OztVQUdFLENBQUMsS0FBSzVELE9BQUwsQ0FBYU0sR0FBYixDQUFpQixjQUFqQixDQUFMLEVBQXVDO1lBQ2pDLE9BQU9XLElBQVAsS0FBZ0IsUUFBcEIsRUFBOEI7ZUFDdkJqQixPQUFMLENBQWFTLEdBQWIsQ0FBaUIsY0FBakIsRUFBaUMsMEJBQWpDO1NBREYsTUFFTyxJQUFJLEtBQUs0QyxTQUFMLElBQWtCLEtBQUtBLFNBQUwsQ0FBZVEsSUFBckMsRUFBMkM7ZUFDM0M3RCxPQUFMLENBQWFTLEdBQWIsQ0FBaUIsY0FBakIsRUFBaUMsS0FBSzRDLFNBQUwsQ0FBZVEsSUFBaEQ7U0FESyxNQUVBLElBQUkvRixRQUFRMkYsWUFBUixJQUF3QkMsZ0JBQWdCbkYsU0FBaEIsQ0FBMEJDLGFBQTFCLENBQXdDeUMsSUFBeEMsQ0FBNUIsRUFBMkU7ZUFDM0VqQixPQUFMLENBQWFTLEdBQWIsQ0FBaUIsY0FBakIsRUFBaUMsaURBQWpDOzs7S0E1Qk47O1FBaUNJM0MsUUFBUStELElBQVosRUFBa0I7V0FDWEEsSUFBTCxHQUFZLFlBQVc7WUFDakJpQyxXQUFXOUMsU0FBUyxJQUFULENBQWY7WUFDSThDLFFBQUosRUFBYztpQkFDTEEsUUFBUDs7O1lBR0UsS0FBS1QsU0FBVCxFQUFvQjtpQkFDWGxDLFFBQVFJLE9BQVIsQ0FBZ0IsS0FBSzhCLFNBQXJCLENBQVA7U0FERixNQUVPLElBQUksS0FBS00sZ0JBQVQsRUFBMkI7aUJBQ3pCeEMsUUFBUUksT0FBUixDQUFnQixJQUFJdkQsSUFBSixDQUFTLENBQUMsS0FBSzJGLGdCQUFOLENBQVQsQ0FBaEIsQ0FBUDtTQURLLE1BRUEsSUFBSSxLQUFLSCxhQUFULEVBQXdCO2dCQUN2QixJQUFJSSxLQUFKLENBQVUsc0NBQVYsQ0FBTjtTQURLLE1BRUE7aUJBQ0V6QyxRQUFRSSxPQUFSLENBQWdCLElBQUl2RCxJQUFKLENBQVMsQ0FBQyxLQUFLb0YsU0FBTixDQUFULENBQWhCLENBQVA7O09BYko7O1dBaUJLbEYsV0FBTCxHQUFtQixZQUFXO1lBQ3hCLEtBQUt5RixnQkFBVCxFQUEyQjtpQkFDbEIzQyxTQUFTLElBQVQsS0FBa0JHLFFBQVFJLE9BQVIsQ0FBZ0IsS0FBS29DLGdCQUFyQixDQUF6QjtTQURGLE1BRU87aUJBQ0UsS0FBSzlCLElBQUwsR0FBWWtDLElBQVosQ0FBaUJuQyxxQkFBakIsQ0FBUDs7T0FKSjs7O1NBU0dvQyxJQUFMLEdBQVksWUFBVztVQUNqQkYsV0FBVzlDLFNBQVMsSUFBVCxDQUFmO1VBQ0k4QyxRQUFKLEVBQWM7ZUFDTEEsUUFBUDs7O1VBR0UsS0FBS1QsU0FBVCxFQUFvQjtlQUNYcEIsZUFBZSxLQUFLb0IsU0FBcEIsQ0FBUDtPQURGLE1BRU8sSUFBSSxLQUFLTSxnQkFBVCxFQUEyQjtlQUN6QnhDLFFBQVFJLE9BQVIsQ0FBZ0JZLHNCQUFzQixLQUFLd0IsZ0JBQTNCLENBQWhCLENBQVA7T0FESyxNQUVBLElBQUksS0FBS0gsYUFBVCxFQUF3QjtjQUN2QixJQUFJSSxLQUFKLENBQVUsc0NBQVYsQ0FBTjtPQURLLE1BRUE7ZUFDRXpDLFFBQVFJLE9BQVIsQ0FBZ0IsS0FBSzZCLFNBQXJCLENBQVA7O0tBYko7O1FBaUJJdEYsUUFBUXdGLFFBQVosRUFBc0I7V0FDZkEsUUFBTCxHQUFnQixZQUFXO2VBQ2xCLEtBQUtVLElBQUwsR0FBWUQsSUFBWixDQUFpQkUsTUFBakIsQ0FBUDtPQURGOzs7U0FLR0MsSUFBTCxHQUFZLFlBQVc7YUFDZCxLQUFLRixJQUFMLEdBQVlELElBQVosQ0FBaUJJLEtBQUtDLEtBQXRCLENBQVA7S0FERjs7V0FJTyxJQUFQOzs7O01BSUVDLFVBQVUsQ0FBQyxRQUFELEVBQVcsS0FBWCxFQUFrQixNQUFsQixFQUEwQixTQUExQixFQUFxQyxNQUFyQyxFQUE2QyxLQUE3QyxDQUFkOztXQUVTQyxlQUFULENBQXlCQyxNQUF6QixFQUFpQztRQUMzQkMsVUFBVUQsT0FBT0UsV0FBUCxFQUFkO1dBQ1FKLFFBQVF6RixPQUFSLENBQWdCNEYsT0FBaEIsSUFBMkIsQ0FBQyxDQUE3QixHQUFrQ0EsT0FBbEMsR0FBNENELE1BQW5EOzs7V0FHT0csT0FBVCxDQUFpQkMsS0FBakIsRUFBd0JDLE9BQXhCLEVBQWlDO2NBQ3JCQSxXQUFXLEVBQXJCO1FBQ0kzRCxPQUFPMkQsUUFBUTNELElBQW5COztRQUVJLE9BQU8wRCxLQUFQLEtBQWlCLFFBQXJCLEVBQStCO1dBQ3hCRSxHQUFMLEdBQVdGLEtBQVg7S0FERixNQUVPO1VBQ0RBLE1BQU16RCxRQUFWLEVBQW9CO2NBQ1osSUFBSTlCLFNBQUosQ0FBYyxjQUFkLENBQU47O1dBRUd5RixHQUFMLEdBQVdGLE1BQU1FLEdBQWpCO1dBQ0tDLFdBQUwsR0FBbUJILE1BQU1HLFdBQXpCO1VBQ0ksQ0FBQ0YsUUFBUTVFLE9BQWIsRUFBc0I7YUFDZkEsT0FBTCxHQUFlLElBQUlELE9BQUosQ0FBWTRFLE1BQU0zRSxPQUFsQixDQUFmOztXQUVHdUUsTUFBTCxHQUFjSSxNQUFNSixNQUFwQjtXQUNLUSxJQUFMLEdBQVlKLE1BQU1JLElBQWxCO1VBQ0ksQ0FBQzlELElBQUQsSUFBUzBELE1BQU14QixTQUFOLElBQW1CLElBQWhDLEVBQXNDO2VBQzdCd0IsTUFBTXhCLFNBQWI7Y0FDTWpDLFFBQU4sR0FBaUIsSUFBakI7Ozs7U0FJQzRELFdBQUwsR0FBbUJGLFFBQVFFLFdBQVIsSUFBdUIsS0FBS0EsV0FBNUIsSUFBMkMsTUFBOUQ7UUFDSUYsUUFBUTVFLE9BQVIsSUFBbUIsQ0FBQyxLQUFLQSxPQUE3QixFQUFzQztXQUMvQkEsT0FBTCxHQUFlLElBQUlELE9BQUosQ0FBWTZFLFFBQVE1RSxPQUFwQixDQUFmOztTQUVHdUUsTUFBTCxHQUFjRCxnQkFBZ0JNLFFBQVFMLE1BQVIsSUFBa0IsS0FBS0EsTUFBdkIsSUFBaUMsS0FBakQsQ0FBZDtTQUNLUSxJQUFMLEdBQVlILFFBQVFHLElBQVIsSUFBZ0IsS0FBS0EsSUFBckIsSUFBNkIsSUFBekM7U0FDS0MsUUFBTCxHQUFnQixJQUFoQjs7UUFFSSxDQUFDLEtBQUtULE1BQUwsS0FBZ0IsS0FBaEIsSUFBeUIsS0FBS0EsTUFBTCxLQUFnQixNQUExQyxLQUFxRHRELElBQXpELEVBQStEO1lBQ3ZELElBQUk3QixTQUFKLENBQWMsMkNBQWQsQ0FBTjs7U0FFRzhELFNBQUwsQ0FBZWpDLElBQWY7OztVQUdNMUMsU0FBUixDQUFrQjBHLEtBQWxCLEdBQTBCLFlBQVc7V0FDNUIsSUFBSVAsT0FBSixDQUFZLElBQVosRUFBa0IsRUFBRXpELE1BQU0sS0FBS2tDLFNBQWIsRUFBbEIsQ0FBUDtHQURGOztXQUlTYyxNQUFULENBQWdCaEQsSUFBaEIsRUFBc0I7UUFDaEJpRSxPQUFPLElBQUkzQixRQUFKLEVBQVg7U0FDSzRCLElBQUwsR0FBWUMsS0FBWixDQUFrQixHQUFsQixFQUF1QmxGLE9BQXZCLENBQStCLFVBQVNtRixLQUFULEVBQWdCO1VBQ3pDQSxLQUFKLEVBQVc7WUFDTEQsUUFBUUMsTUFBTUQsS0FBTixDQUFZLEdBQVosQ0FBWjtZQUNJbkcsT0FBT21HLE1BQU16RixLQUFOLEdBQWMyRixPQUFkLENBQXNCLEtBQXRCLEVBQTZCLEdBQTdCLENBQVg7WUFDSS9GLFFBQVE2RixNQUFNeEMsSUFBTixDQUFXLEdBQVgsRUFBZ0IwQyxPQUFoQixDQUF3QixLQUF4QixFQUErQixHQUEvQixDQUFaO2FBQ0tuRixNQUFMLENBQVlvRixtQkFBbUJ0RyxJQUFuQixDQUFaLEVBQXNDc0csbUJBQW1CaEcsS0FBbkIsQ0FBdEM7O0tBTEo7V0FRTzJGLElBQVA7OztXQUdPTSxZQUFULENBQXNCQyxVQUF0QixFQUFrQztRQUM1QnpGLFVBQVUsSUFBSUQsT0FBSixFQUFkO2VBQ1dxRixLQUFYLENBQWlCLE1BQWpCLEVBQXlCbEYsT0FBekIsQ0FBaUMsVUFBU3dGLElBQVQsRUFBZTtVQUMxQ0MsUUFBUUQsS0FBS04sS0FBTCxDQUFXLEdBQVgsQ0FBWjtVQUNJUSxNQUFNRCxNQUFNaEcsS0FBTixHQUFjd0YsSUFBZCxFQUFWO1VBQ0lTLEdBQUosRUFBUztZQUNIckcsUUFBUW9HLE1BQU0vQyxJQUFOLENBQVcsR0FBWCxFQUFnQnVDLElBQWhCLEVBQVo7Z0JBQ1FoRixNQUFSLENBQWV5RixHQUFmLEVBQW9CckcsS0FBcEI7O0tBTEo7V0FRT1MsT0FBUDs7O09BR0dqQixJQUFMLENBQVUyRixRQUFRbkcsU0FBbEI7O1dBRVNzSCxRQUFULENBQWtCQyxRQUFsQixFQUE0QmxCLE9BQTVCLEVBQXFDO1FBQy9CLENBQUNBLE9BQUwsRUFBYztnQkFDRixFQUFWOzs7U0FHR2YsSUFBTCxHQUFZLFNBQVo7U0FDS2tDLE1BQUwsR0FBYyxZQUFZbkIsT0FBWixHQUFzQkEsUUFBUW1CLE1BQTlCLEdBQXVDLEdBQXJEO1NBQ0tDLEVBQUwsR0FBVSxLQUFLRCxNQUFMLElBQWUsR0FBZixJQUFzQixLQUFLQSxNQUFMLEdBQWMsR0FBOUM7U0FDS0UsVUFBTCxHQUFrQixnQkFBZ0JyQixPQUFoQixHQUEwQkEsUUFBUXFCLFVBQWxDLEdBQStDLElBQWpFO1NBQ0tqRyxPQUFMLEdBQWUsSUFBSUQsT0FBSixDQUFZNkUsUUFBUTVFLE9BQXBCLENBQWY7U0FDSzZFLEdBQUwsR0FBV0QsUUFBUUMsR0FBUixJQUFlLEVBQTFCO1NBQ0szQixTQUFMLENBQWU0QyxRQUFmOzs7T0FHRy9HLElBQUwsQ0FBVThHLFNBQVN0SCxTQUFuQjs7V0FFU0EsU0FBVCxDQUFtQjBHLEtBQW5CLEdBQTJCLFlBQVc7V0FDN0IsSUFBSVksUUFBSixDQUFhLEtBQUsxQyxTQUFsQixFQUE2QjtjQUMxQixLQUFLNEMsTUFEcUI7a0JBRXRCLEtBQUtFLFVBRmlCO2VBR3pCLElBQUlsRyxPQUFKLENBQVksS0FBS0MsT0FBakIsQ0FIeUI7V0FJN0IsS0FBSzZFO0tBSkwsQ0FBUDtHQURGOztXQVNTbEQsS0FBVCxHQUFpQixZQUFXO1FBQ3RCdUUsV0FBVyxJQUFJTCxRQUFKLENBQWEsSUFBYixFQUFtQixFQUFDRSxRQUFRLENBQVQsRUFBWUUsWUFBWSxFQUF4QixFQUFuQixDQUFmO2FBQ1NwQyxJQUFULEdBQWdCLE9BQWhCO1dBQ09xQyxRQUFQO0dBSEY7O01BTUlDLG1CQUFtQixDQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsR0FBWCxFQUFnQixHQUFoQixFQUFxQixHQUFyQixDQUF2Qjs7V0FFU0MsUUFBVCxHQUFvQixVQUFTdkIsR0FBVCxFQUFja0IsTUFBZCxFQUFzQjtRQUNwQ0ksaUJBQWlCdkgsT0FBakIsQ0FBeUJtSCxNQUF6QixNQUFxQyxDQUFDLENBQTFDLEVBQTZDO1lBQ3JDLElBQUlNLFVBQUosQ0FBZSxxQkFBZixDQUFOOzs7V0FHSyxJQUFJUixRQUFKLENBQWEsSUFBYixFQUFtQixFQUFDRSxRQUFRQSxNQUFULEVBQWlCL0YsU0FBUyxFQUFDc0csVUFBVXpCLEdBQVgsRUFBMUIsRUFBbkIsQ0FBUDtHQUxGOztPQVFLOUUsT0FBTCxHQUFlQSxPQUFmO09BQ0syRSxPQUFMLEdBQWVBLE9BQWY7T0FDS21CLFFBQUwsR0FBZ0JBLFFBQWhCOztPQUVLaEksS0FBTCxHQUFhLFVBQVM4RyxLQUFULEVBQWdCNEIsSUFBaEIsRUFBc0I7V0FDMUIsSUFBSXBGLE9BQUosQ0FBWSxVQUFTSSxPQUFULEVBQWtCSCxNQUFsQixFQUEwQjtVQUN2Q29GLFVBQVUsSUFBSTlCLE9BQUosQ0FBWUMsS0FBWixFQUFtQjRCLElBQW5CLENBQWQ7VUFDSUUsTUFBTSxJQUFJQyxjQUFKLEVBQVY7O1VBRUlsRixNQUFKLEdBQWEsWUFBVztZQUNsQm9ELFVBQVU7a0JBQ0o2QixJQUFJVixNQURBO3NCQUVBVSxJQUFJUixVQUZKO21CQUdIVCxhQUFhaUIsSUFBSUUscUJBQUosTUFBK0IsRUFBNUM7U0FIWDtnQkFLUTlCLEdBQVIsR0FBYyxpQkFBaUI0QixHQUFqQixHQUF1QkEsSUFBSUcsV0FBM0IsR0FBeUNoQyxRQUFRNUUsT0FBUixDQUFnQk0sR0FBaEIsQ0FBb0IsZUFBcEIsQ0FBdkQ7WUFDSVcsT0FBTyxjQUFjd0YsR0FBZCxHQUFvQkEsSUFBSVAsUUFBeEIsR0FBbUNPLElBQUlJLFlBQWxEO2dCQUNRLElBQUloQixRQUFKLENBQWE1RSxJQUFiLEVBQW1CMkQsT0FBbkIsQ0FBUjtPQVJGOztVQVdJbEQsT0FBSixHQUFjLFlBQVc7ZUFDaEIsSUFBSXRDLFNBQUosQ0FBYyx3QkFBZCxDQUFQO09BREY7O1VBSUkwSCxTQUFKLEdBQWdCLFlBQVc7ZUFDbEIsSUFBSTFILFNBQUosQ0FBYyx3QkFBZCxDQUFQO09BREY7O1VBSUkySCxJQUFKLENBQVNQLFFBQVFqQyxNQUFqQixFQUF5QmlDLFFBQVEzQixHQUFqQyxFQUFzQyxJQUF0Qzs7VUFFSTJCLFFBQVExQixXQUFSLEtBQXdCLFNBQTVCLEVBQXVDO1lBQ2pDa0MsZUFBSixHQUFzQixJQUF0Qjs7O1VBR0Usa0JBQWtCUCxHQUFsQixJQUF5QjNJLFFBQVErRCxJQUFyQyxFQUEyQztZQUNyQ29GLFlBQUosR0FBbUIsTUFBbkI7OztjQUdNakgsT0FBUixDQUFnQkUsT0FBaEIsQ0FBd0IsVUFBU1gsS0FBVCxFQUFnQk4sSUFBaEIsRUFBc0I7WUFDeENpSSxnQkFBSixDQUFxQmpJLElBQXJCLEVBQTJCTSxLQUEzQjtPQURGOztVQUlJNEgsSUFBSixDQUFTLE9BQU9YLFFBQVFyRCxTQUFmLEtBQTZCLFdBQTdCLEdBQTJDLElBQTNDLEdBQWtEcUQsUUFBUXJELFNBQW5FO0tBckNLLENBQVA7R0FERjtPQXlDS3RGLEtBQUwsQ0FBV3VKLFFBQVgsR0FBc0IsSUFBdEI7Q0F4Y0YsRUF5Y0csT0FBT3hKLElBQVAsS0FBZ0IsV0FBaEIsR0FBOEJBLElBQTlCLEdBQXFDeUosTUF6Y3hDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1FDRUk5RyxNQUFNMUIsT0FBT04sU0FBUCxDQUFpQmlDLGNBQTNCOztRQUVJOEcsV0FBWSxZQUFZO1lBQ3BCQyxRQUFRLEVBQVo7YUFDSyxJQUFJN0UsSUFBSSxDQUFiLEVBQWdCQSxJQUFJLEdBQXBCLEVBQXlCLEVBQUVBLENBQTNCLEVBQThCO2tCQUNwQjdCLElBQU4sQ0FBVyxNQUFNLENBQUMsQ0FBQzZCLElBQUksRUFBSixHQUFTLEdBQVQsR0FBZSxFQUFoQixJQUFzQkEsRUFBRTVELFFBQUYsQ0FBVyxFQUFYLENBQXZCLEVBQXVDMkYsV0FBdkMsRUFBakI7OztlQUdHOEMsS0FBUDtLQU5ZLEVBQWhCOzt5QkFTQSxHQUF3QixVQUFVQyxNQUFWLEVBQWtCNUMsT0FBbEIsRUFBMkI7WUFDM0N2RyxNQUFNdUcsV0FBV0EsUUFBUTZDLFlBQW5CLEdBQWtDNUksT0FBTzZJLE1BQVAsQ0FBYyxJQUFkLENBQWxDLEdBQXdELEVBQWxFO2FBQ0ssSUFBSWhGLElBQUksQ0FBYixFQUFnQkEsSUFBSThFLE9BQU8vRSxNQUEzQixFQUFtQyxFQUFFQyxDQUFyQyxFQUF3QztnQkFDaEMsT0FBTzhFLE9BQU85RSxDQUFQLENBQVAsS0FBcUIsV0FBekIsRUFBc0M7b0JBQzlCQSxDQUFKLElBQVM4RSxPQUFPOUUsQ0FBUCxDQUFUOzs7O2VBSURyRSxHQUFQO0tBUko7O2lCQVdBLEdBQWdCLFVBQVVzSixNQUFWLEVBQWtCSCxNQUFsQixFQUEwQjVDLE9BQTFCLEVBQW1DO1lBQzNDLENBQUM0QyxNQUFMLEVBQWE7bUJBQ0ZHLE1BQVA7OztZQUdBLFFBQU9ILE1BQVAseUNBQU9BLE1BQVAsT0FBa0IsUUFBdEIsRUFBZ0M7Z0JBQ3hCaEYsTUFBTW9GLE9BQU4sQ0FBY0QsTUFBZCxDQUFKLEVBQTJCO3VCQUNoQjlHLElBQVAsQ0FBWTJHLE1BQVo7YUFESixNQUVPLElBQUksUUFBT0csTUFBUCx5Q0FBT0EsTUFBUCxPQUFrQixRQUF0QixFQUFnQzt1QkFDNUJILE1BQVAsSUFBaUIsSUFBakI7YUFERyxNQUVBO3VCQUNJLENBQUNHLE1BQUQsRUFBU0gsTUFBVCxDQUFQOzs7bUJBR0dHLE1BQVA7OztZQUdBLFFBQU9BLE1BQVAseUNBQU9BLE1BQVAsT0FBa0IsUUFBdEIsRUFBZ0M7bUJBQ3JCLENBQUNBLE1BQUQsRUFBU0UsTUFBVCxDQUFnQkwsTUFBaEIsQ0FBUDs7O1lBR0FNLGNBQWNILE1BQWxCO1lBQ0luRixNQUFNb0YsT0FBTixDQUFjRCxNQUFkLEtBQXlCLENBQUNuRixNQUFNb0YsT0FBTixDQUFjSixNQUFkLENBQTlCLEVBQXFEOzBCQUNuQ08sUUFBUUMsYUFBUixDQUFzQkwsTUFBdEIsRUFBOEIvQyxPQUE5QixDQUFkOzs7WUFHQXBDLE1BQU1vRixPQUFOLENBQWNELE1BQWQsS0FBeUJuRixNQUFNb0YsT0FBTixDQUFjSixNQUFkLENBQTdCLEVBQW9EO21CQUN6Q3RILE9BQVAsQ0FBZSxVQUFVK0gsSUFBVixFQUFnQnZGLENBQWhCLEVBQW1CO29CQUMxQm5DLElBQUl4QixJQUFKLENBQVM0SSxNQUFULEVBQWlCakYsQ0FBakIsQ0FBSixFQUF5Qjt3QkFDakJpRixPQUFPakYsQ0FBUCxLQUFhd0YsUUFBT1AsT0FBT2pGLENBQVAsQ0FBUCxNQUFxQixRQUF0QyxFQUFnRDsrQkFDckNBLENBQVAsSUFBWXFGLFFBQVFJLEtBQVIsQ0FBY1IsT0FBT2pGLENBQVAsQ0FBZCxFQUF5QnVGLElBQXpCLEVBQStCckQsT0FBL0IsQ0FBWjtxQkFESixNQUVPOytCQUNJL0QsSUFBUCxDQUFZb0gsSUFBWjs7aUJBSlIsTUFNTzsyQkFDSXZGLENBQVAsSUFBWXVGLElBQVo7O2FBUlI7bUJBV09OLE1BQVA7OztlQUdHOUksT0FBTytCLElBQVAsQ0FBWTRHLE1BQVosRUFBb0JZLE1BQXBCLENBQTJCLFVBQVVDLEdBQVYsRUFBZXpDLEdBQWYsRUFBb0I7Z0JBQzlDckcsUUFBUWlJLE9BQU81QixHQUFQLENBQVo7O2dCQUVJL0csT0FBT04sU0FBUCxDQUFpQmlDLGNBQWpCLENBQWdDekIsSUFBaEMsQ0FBcUNzSixHQUFyQyxFQUEwQ3pDLEdBQTFDLENBQUosRUFBb0Q7b0JBQzVDQSxHQUFKLElBQVdtQyxRQUFRSSxLQUFSLENBQWNFLElBQUl6QyxHQUFKLENBQWQsRUFBd0JyRyxLQUF4QixFQUErQnFGLE9BQS9CLENBQVg7YUFESixNQUVPO29CQUNDZ0IsR0FBSixJQUFXckcsS0FBWDs7bUJBRUc4SSxHQUFQO1NBUkcsRUFTSlAsV0FUSSxDQUFQO0tBekNKOztrQkFxREEsR0FBaUIsVUFBVVEsR0FBVixFQUFlO1lBQ3hCO21CQUNPL0MsbUJBQW1CK0MsSUFBSWhELE9BQUosQ0FBWSxLQUFaLEVBQW1CLEdBQW5CLENBQW5CLENBQVA7U0FESixDQUVFLE9BQU9ySCxDQUFQLEVBQVU7bUJBQ0RxSyxHQUFQOztLQUpSOztrQkFRQSxHQUFpQixVQUFVQSxHQUFWLEVBQWU7OztZQUd4QkEsSUFBSTdGLE1BQUosS0FBZSxDQUFuQixFQUFzQjttQkFDWDZGLEdBQVA7OztZQUdBQyxTQUFTLE9BQU9ELEdBQVAsS0FBZSxRQUFmLEdBQTBCQSxHQUExQixHQUFnQ3BKLE9BQU9vSixHQUFQLENBQTdDOztZQUVJRSxNQUFNLEVBQVY7YUFDSyxJQUFJOUYsSUFBSSxDQUFiLEVBQWdCQSxJQUFJNkYsT0FBTzlGLE1BQTNCLEVBQW1DLEVBQUVDLENBQXJDLEVBQXdDO2dCQUNoQytGLElBQUlGLE9BQU9HLFVBQVAsQ0FBa0JoRyxDQUFsQixDQUFSOztnQkFHSStGLE1BQU0sSUFBTjtrQkFDTSxJQUROO2tCQUVNLElBRk47a0JBR00sSUFITjtpQkFJTSxJQUFMLElBQWFBLEtBQUssSUFKbkI7aUJBS00sSUFBTCxJQUFhQSxLQUFLLElBTG5CO2lCQU1NLElBQUwsSUFBYUEsS0FBSyxJQVB2QjtjQVFFOzJCQUNTRixPQUFPSSxNQUFQLENBQWNqRyxDQUFkLENBQVA7Ozs7Z0JBSUErRixJQUFJLElBQVIsRUFBYztzQkFDSkQsTUFBTWxCLFNBQVNtQixDQUFULENBQVo7Ozs7Z0JBSUFBLElBQUksS0FBUixFQUFlO3NCQUNMRCxPQUFPbEIsU0FBUyxPQUFRbUIsS0FBSyxDQUF0QixJQUE0Qm5CLFNBQVMsT0FBUW1CLElBQUksSUFBckIsQ0FBbkMsQ0FBTjs7OztnQkFJQUEsSUFBSSxNQUFKLElBQWNBLEtBQUssTUFBdkIsRUFBK0I7c0JBQ3JCRCxPQUFPbEIsU0FBUyxPQUFRbUIsS0FBSyxFQUF0QixJQUE2Qm5CLFNBQVMsT0FBU21CLEtBQUssQ0FBTixHQUFXLElBQTVCLENBQTdCLEdBQWtFbkIsU0FBUyxPQUFRbUIsSUFBSSxJQUFyQixDQUF6RSxDQUFOOzs7O2lCQUlDLENBQUw7Z0JBQ0ksV0FBWSxDQUFDQSxJQUFJLEtBQUwsS0FBZSxFQUFoQixHQUF1QkYsT0FBT0csVUFBUCxDQUFrQmhHLENBQWxCLElBQXVCLEtBQXpELENBQUo7bUJBQ080RSxTQUFTLE9BQVFtQixLQUFLLEVBQXRCLElBQTZCbkIsU0FBUyxPQUFTbUIsS0FBSyxFQUFOLEdBQVksSUFBN0IsQ0FBN0IsR0FBbUVuQixTQUFTLE9BQVNtQixLQUFLLENBQU4sR0FBVyxJQUE1QixDQUFuRSxHQUF3R25CLFNBQVMsT0FBUW1CLElBQUksSUFBckIsQ0FBL0c7OztlQUdHRCxHQUFQO0tBOUNKOzttQkFpREEsR0FBa0IsVUFBVW5LLEdBQVYsRUFBZXVLLFVBQWYsRUFBMkI7WUFDckMsUUFBT3ZLLEdBQVAseUNBQU9BLEdBQVAsT0FBZSxRQUFmLElBQTJCQSxRQUFRLElBQXZDLEVBQTZDO21CQUNsQ0EsR0FBUDs7O1lBR0F3SyxPQUFPRCxjQUFjLEVBQXpCO1lBQ0lFLFNBQVNELEtBQUtqSyxPQUFMLENBQWFQLEdBQWIsQ0FBYjtZQUNJeUssV0FBVyxDQUFDLENBQWhCLEVBQW1CO21CQUNSRCxLQUFLQyxNQUFMLENBQVA7OzthQUdDakksSUFBTCxDQUFVeEMsR0FBVjs7WUFFSW1FLE1BQU1vRixPQUFOLENBQWN2SixHQUFkLENBQUosRUFBd0I7Z0JBQ2hCMEssWUFBWSxFQUFoQjs7aUJBRUssSUFBSXJHLElBQUksQ0FBYixFQUFnQkEsSUFBSXJFLElBQUlvRSxNQUF4QixFQUFnQyxFQUFFQyxDQUFsQyxFQUFxQztvQkFDN0JyRSxJQUFJcUUsQ0FBSixLQUFVd0YsUUFBTzdKLElBQUlxRSxDQUFKLENBQVAsTUFBa0IsUUFBaEMsRUFBMEM7OEJBQzVCN0IsSUFBVixDQUFla0gsUUFBUWlCLE9BQVIsQ0FBZ0IzSyxJQUFJcUUsQ0FBSixDQUFoQixFQUF3Qm1HLElBQXhCLENBQWY7aUJBREosTUFFTyxJQUFJLE9BQU94SyxJQUFJcUUsQ0FBSixDQUFQLEtBQWtCLFdBQXRCLEVBQW1DOzhCQUM1QjdCLElBQVYsQ0FBZXhDLElBQUlxRSxDQUFKLENBQWY7Ozs7bUJBSURxRyxTQUFQOzs7WUFHQW5JLE9BQU8vQixPQUFPK0IsSUFBUCxDQUFZdkMsR0FBWixDQUFYO2FBQ0s2QixPQUFMLENBQWEsVUFBVTBGLEdBQVYsRUFBZTtnQkFDcEJBLEdBQUosSUFBV21DLFFBQVFpQixPQUFSLENBQWdCM0ssSUFBSXVILEdBQUosQ0FBaEIsRUFBMEJpRCxJQUExQixDQUFYO1NBREo7O2VBSU94SyxHQUFQO0tBaENKOztvQkFtQ0EsR0FBbUIsVUFBVUEsR0FBVixFQUFlO2VBQ3ZCUSxPQUFPTixTQUFQLENBQWlCTyxRQUFqQixDQUEwQkMsSUFBMUIsQ0FBK0JWLEdBQS9CLE1BQXdDLGlCQUEvQztLQURKOztvQkFJQSxHQUFtQixVQUFVQSxHQUFWLEVBQWU7WUFDMUJBLFFBQVEsSUFBUixJQUFnQixPQUFPQSxHQUFQLEtBQWUsV0FBbkMsRUFBZ0Q7bUJBQ3JDLEtBQVA7OztlQUdHLENBQUMsRUFBRUEsSUFBSTRLLFdBQUosSUFBbUI1SyxJQUFJNEssV0FBSixDQUFnQkMsUUFBbkMsSUFBK0M3SyxJQUFJNEssV0FBSixDQUFnQkMsUUFBaEIsQ0FBeUI3SyxHQUF6QixDQUFqRCxDQUFSO0tBTEo7OztBQzNLQSxJQUFJaUgsVUFBVXBHLE9BQU9YLFNBQVAsQ0FBaUIrRyxPQUEvQjtBQUNBLElBQUk2RCxrQkFBa0IsTUFBdEI7O0FBRUEsZ0JBQWlCO2VBQ0YsU0FERTtnQkFFRDtpQkFDQyxpQkFBVTVKLEtBQVYsRUFBaUI7bUJBQ2YrRixRQUFRdkcsSUFBUixDQUFhUSxLQUFiLEVBQW9CNEosZUFBcEIsRUFBcUMsR0FBckMsQ0FBUDtTQUZJO2lCQUlDLGlCQUFVNUosS0FBVixFQUFpQjttQkFDZkEsS0FBUDs7S0FQSzthQVVKLFNBVkk7YUFXSjtDQVhiOztBQ0hBLElBQUk2SixRQUFRQyxPQUFaO0FBQ0EsSUFBSUMsWUFBVUMsU0FBZDs7QUFFQSxJQUFJQyx3QkFBd0I7Y0FDZCxTQUFTQyxRQUFULENBQWtCQyxNQUFsQixFQUEwQjtlQUN6QkEsU0FBUyxJQUFoQjtLQUZvQjthQUlmLFNBQVNDLE9BQVQsQ0FBaUJELE1BQWpCLEVBQXlCOUQsR0FBekIsRUFBOEI7ZUFDNUI4RCxTQUFTLEdBQVQsR0FBZTlELEdBQWYsR0FBcUIsR0FBNUI7S0FMb0I7WUFPaEIsU0FBU2dFLE1BQVQsQ0FBZ0JGLE1BQWhCLEVBQXdCO2VBQ3JCQSxNQUFQOztDQVJSOztBQVlBLElBQUlHLFFBQVFDLEtBQUt2TCxTQUFMLENBQWV3TCxXQUEzQjs7QUFFQSxJQUFJQyxjQUFXO2VBQ0EsR0FEQTtZQUVILElBRkc7YUFHRlosTUFBTWEsTUFISjttQkFJSSxTQUFTQyxhQUFULENBQXVCQyxJQUF2QixFQUE2QjtlQUNqQ04sTUFBTTlLLElBQU4sQ0FBV29MLElBQVgsQ0FBUDtLQUxPO2VBT0EsS0FQQTt3QkFRUztDQVJ4Qjs7QUFXQSxJQUFJQyxjQUFZLFNBQVNBLFNBQVQsQ0FBbUJDLE1BQW5CLEVBQTJCWCxNQUEzQixFQUFtQ1ksbUJBQW5DLEVBQXdEQyxrQkFBeEQsRUFBNEVDLFNBQTVFLEVBQXVGQyxPQUF2RixFQUFnR0MsTUFBaEcsRUFBd0dDLElBQXhHLEVBQThHQyxTQUE5RyxFQUF5SFYsYUFBekgsRUFBd0lXLFNBQXhJLEVBQW1KO1FBQzNKeE0sTUFBTWdNLE1BQVY7UUFDSSxPQUFPSyxNQUFQLEtBQWtCLFVBQXRCLEVBQWtDO2NBQ3hCQSxPQUFPaEIsTUFBUCxFQUFlckwsR0FBZixDQUFOO0tBREosTUFFTyxJQUFJQSxlQUFleUwsSUFBbkIsRUFBeUI7Y0FDdEJJLGNBQWM3TCxHQUFkLENBQU47S0FERyxNQUVBLElBQUlBLFFBQVEsSUFBWixFQUFrQjtZQUNqQmtNLGtCQUFKLEVBQXdCO21CQUNiRSxVQUFVQSxRQUFRZixNQUFSLENBQVYsR0FBNEJBLE1BQW5DOzs7Y0FHRSxFQUFOOzs7UUFHQSxPQUFPckwsR0FBUCxLQUFlLFFBQWYsSUFBMkIsT0FBT0EsR0FBUCxLQUFlLFFBQTFDLElBQXNELE9BQU9BLEdBQVAsS0FBZSxTQUFyRSxJQUFrRitLLE1BQU1GLFFBQU4sQ0FBZTdLLEdBQWYsQ0FBdEYsRUFBMkc7WUFDbkdvTSxPQUFKLEVBQWE7bUJBQ0YsQ0FBQ0ksVUFBVUosUUFBUWYsTUFBUixDQUFWLElBQTZCLEdBQTdCLEdBQW1DbUIsVUFBVUosUUFBUXBNLEdBQVIsQ0FBVixDQUFwQyxDQUFQOztlQUVHLENBQUN3TSxVQUFVbkIsTUFBVixJQUFvQixHQUFwQixHQUEwQm1CLFVBQVUzTCxPQUFPYixHQUFQLENBQVYsQ0FBM0IsQ0FBUDs7O1FBR0F5QyxTQUFTLEVBQWI7O1FBRUksT0FBT3pDLEdBQVAsS0FBZSxXQUFuQixFQUFnQztlQUNyQnlDLE1BQVA7OztRQUdBZ0ssT0FBSjtRQUNJdEksTUFBTW9GLE9BQU4sQ0FBYzhDLE1BQWQsQ0FBSixFQUEyQjtrQkFDYkEsTUFBVjtLQURKLE1BRU87WUFDQzlKLE9BQU8vQixPQUFPK0IsSUFBUCxDQUFZdkMsR0FBWixDQUFYO2tCQUNVc00sT0FBTy9KLEtBQUsrSixJQUFMLENBQVVBLElBQVYsQ0FBUCxHQUF5Qi9KLElBQW5DOzs7U0FHQyxJQUFJOEIsSUFBSSxDQUFiLEVBQWdCQSxJQUFJb0ksUUFBUXJJLE1BQTVCLEVBQW9DLEVBQUVDLENBQXRDLEVBQXlDO1lBQ2pDa0QsTUFBTWtGLFFBQVFwSSxDQUFSLENBQVY7O1lBRUk4SCxhQUFhbk0sSUFBSXVILEdBQUosTUFBYSxJQUE5QixFQUFvQzs7OztZQUloQ3BELE1BQU1vRixPQUFOLENBQWN2SixHQUFkLENBQUosRUFBd0I7cUJBQ1h5QyxPQUFPK0csTUFBUCxDQUFjdUMsVUFDbkIvTCxJQUFJdUgsR0FBSixDQURtQixFQUVuQjBFLG9CQUFvQlosTUFBcEIsRUFBNEI5RCxHQUE1QixDQUZtQixFQUduQjBFLG1CQUhtQixFQUluQkMsa0JBSm1CLEVBS25CQyxTQUxtQixFQU1uQkMsT0FObUIsRUFPbkJDLE1BUG1CLEVBUW5CQyxJQVJtQixFQVNuQkMsU0FUbUIsRUFVbkJWLGFBVm1CLEVBV25CVyxTQVhtQixDQUFkLENBQVQ7U0FESixNQWNPO3FCQUNNL0osT0FBTytHLE1BQVAsQ0FBY3VDLFVBQ25CL0wsSUFBSXVILEdBQUosQ0FEbUIsRUFFbkI4RCxVQUFVa0IsWUFBWSxNQUFNaEYsR0FBbEIsR0FBd0IsTUFBTUEsR0FBTixHQUFZLEdBQTlDLENBRm1CLEVBR25CMEUsbUJBSG1CLEVBSW5CQyxrQkFKbUIsRUFLbkJDLFNBTG1CLEVBTW5CQyxPQU5tQixFQU9uQkMsTUFQbUIsRUFRbkJDLElBUm1CLEVBU25CQyxTQVRtQixFQVVuQlYsYUFWbUIsRUFXbkJXLFNBWG1CLENBQWQsQ0FBVDs7OztXQWdCRC9KLE1BQVA7Q0F6RUo7O0FBNEVBLGtCQUFpQixvQkFBQSxDQUFVdUosTUFBVixFQUFrQlUsSUFBbEIsRUFBd0I7UUFDakMxTSxNQUFNZ00sTUFBVjtRQUNJekYsVUFBVW1HLFFBQVEsRUFBdEI7UUFDSUMsWUFBWSxPQUFPcEcsUUFBUW9HLFNBQWYsS0FBNkIsV0FBN0IsR0FBMkNoQixZQUFTZ0IsU0FBcEQsR0FBZ0VwRyxRQUFRb0csU0FBeEY7UUFDSVQscUJBQXFCLE9BQU8zRixRQUFRMkYsa0JBQWYsS0FBc0MsU0FBdEMsR0FBa0QzRixRQUFRMkYsa0JBQTFELEdBQStFUCxZQUFTTyxrQkFBakg7UUFDSUMsWUFBWSxPQUFPNUYsUUFBUTRGLFNBQWYsS0FBNkIsU0FBN0IsR0FBeUM1RixRQUFRNEYsU0FBakQsR0FBNkRSLFlBQVNRLFNBQXRGO1FBQ0lQLFNBQVMsT0FBT3JGLFFBQVFxRixNQUFmLEtBQTBCLFNBQTFCLEdBQXNDckYsUUFBUXFGLE1BQTlDLEdBQXVERCxZQUFTQyxNQUE3RTtRQUNJUSxVQUFVUixTQUFVLE9BQU9yRixRQUFRNkYsT0FBZixLQUEyQixVQUEzQixHQUF3QzdGLFFBQVE2RixPQUFoRCxHQUEwRFQsWUFBU1MsT0FBN0UsR0FBd0YsSUFBdEc7UUFDSUUsT0FBTyxPQUFPL0YsUUFBUStGLElBQWYsS0FBd0IsVUFBeEIsR0FBcUMvRixRQUFRK0YsSUFBN0MsR0FBb0QsSUFBL0Q7UUFDSUMsWUFBWSxPQUFPaEcsUUFBUWdHLFNBQWYsS0FBNkIsV0FBN0IsR0FBMkMsS0FBM0MsR0FBbURoRyxRQUFRZ0csU0FBM0U7UUFDSVYsZ0JBQWdCLE9BQU90RixRQUFRc0YsYUFBZixLQUFpQyxVQUFqQyxHQUE4Q3RGLFFBQVFzRixhQUF0RCxHQUFzRUYsWUFBU0UsYUFBbkc7UUFDSSxPQUFPdEYsUUFBUXFHLE1BQWYsS0FBMEIsV0FBOUIsRUFBMkM7Z0JBQy9CQSxNQUFSLEdBQWlCM0IsVUFBUTRCLE9BQXpCO0tBREosTUFFTyxJQUFJLENBQUNyTSxPQUFPTixTQUFQLENBQWlCaUMsY0FBakIsQ0FBZ0N6QixJQUFoQyxDQUFxQ3VLLFVBQVE2QixVQUE3QyxFQUF5RHZHLFFBQVFxRyxNQUFqRSxDQUFMLEVBQStFO2NBQzVFLElBQUk3TCxTQUFKLENBQWMsaUNBQWQsQ0FBTjs7UUFFQXlMLFlBQVl2QixVQUFRNkIsVUFBUixDQUFtQnZHLFFBQVFxRyxNQUEzQixDQUFoQjtRQUNJSCxPQUFKO1FBQ0lKLE1BQUo7O1FBRUk5RixRQUFRNkYsT0FBUixLQUFvQixJQUFwQixJQUE0QjdGLFFBQVE2RixPQUFSLEtBQW9CNUssU0FBaEQsSUFBNkQsT0FBTytFLFFBQVE2RixPQUFmLEtBQTJCLFVBQTVGLEVBQXdHO2NBQzlGLElBQUlyTCxTQUFKLENBQWMsK0JBQWQsQ0FBTjs7O1FBR0EsT0FBT3dGLFFBQVE4RixNQUFmLEtBQTBCLFVBQTlCLEVBQTBDO2lCQUM3QjlGLFFBQVE4RixNQUFqQjtjQUNNQSxPQUFPLEVBQVAsRUFBV3JNLEdBQVgsQ0FBTjtLQUZKLE1BR08sSUFBSW1FLE1BQU1vRixPQUFOLENBQWNoRCxRQUFROEYsTUFBdEIsQ0FBSixFQUFtQztpQkFDN0I5RixRQUFROEYsTUFBakI7a0JBQ1VBLE1BQVY7OztRQUdBOUosT0FBTyxFQUFYOztRQUVJLFFBQU92QyxHQUFQLHlDQUFPQSxHQUFQLE9BQWUsUUFBZixJQUEyQkEsUUFBUSxJQUF2QyxFQUE2QztlQUNsQyxFQUFQOzs7UUFHQStNLFdBQUo7UUFDSXhHLFFBQVF3RyxXQUFSLElBQXVCNUIscUJBQTNCLEVBQWtEO3NCQUNoQzVFLFFBQVF3RyxXQUF0QjtLQURKLE1BRU8sSUFBSSxhQUFheEcsT0FBakIsRUFBMEI7c0JBQ2ZBLFFBQVErRSxPQUFSLEdBQWtCLFNBQWxCLEdBQThCLFFBQTVDO0tBREcsTUFFQTtzQkFDVyxTQUFkOzs7UUFHQVcsc0JBQXNCZCxzQkFBc0I0QixXQUF0QixDQUExQjs7UUFFSSxDQUFDTixPQUFMLEVBQWM7a0JBQ0FqTSxPQUFPK0IsSUFBUCxDQUFZdkMsR0FBWixDQUFWOzs7UUFHQXNNLElBQUosRUFBVTtnQkFDRUEsSUFBUixDQUFhQSxJQUFiOzs7U0FHQyxJQUFJakksSUFBSSxDQUFiLEVBQWdCQSxJQUFJb0ksUUFBUXJJLE1BQTVCLEVBQW9DLEVBQUVDLENBQXRDLEVBQXlDO1lBQ2pDa0QsTUFBTWtGLFFBQVFwSSxDQUFSLENBQVY7O1lBRUk4SCxhQUFhbk0sSUFBSXVILEdBQUosTUFBYSxJQUE5QixFQUFvQzs7OztlQUk3QmhGLEtBQUtpSCxNQUFMLENBQVl1QyxZQUNmL0wsSUFBSXVILEdBQUosQ0FEZSxFQUVmQSxHQUZlLEVBR2YwRSxtQkFIZSxFQUlmQyxrQkFKZSxFQUtmQyxTQUxlLEVBTWZDLE9BTmUsRUFPZkMsTUFQZSxFQVFmQyxJQVJlLEVBU2ZDLFNBVGUsRUFVZlYsYUFWZSxFQVdmVyxTQVhlLENBQVosQ0FBUDs7O1dBZUdqSyxLQUFLZ0MsSUFBTCxDQUFVb0ksU0FBVixDQUFQO0NBL0VKOztBQ3hHQSxJQUFJNUIsVUFBUUMsT0FBWjs7QUFFQSxJQUFJOUksTUFBTTFCLE9BQU9OLFNBQVAsQ0FBaUJpQyxjQUEzQjs7QUFFQSxJQUFJd0osYUFBVztlQUNBLEtBREE7cUJBRU0sS0FGTjtnQkFHQyxFQUhEO2FBSUZaLFFBQU1uRixNQUpKO2VBS0EsR0FMQTtXQU1KLENBTkk7b0JBT0ssSUFQTDtrQkFRRyxLQVJIO3dCQVNTO0NBVHhCOztBQVlBLElBQUlvSCxjQUFjLFNBQVNBLFdBQVQsQ0FBcUIvQyxHQUFyQixFQUEwQjFELE9BQTFCLEVBQW1DO1FBQzdDdkcsTUFBTSxFQUFWO1FBQ0lzSCxRQUFRMkMsSUFBSWxELEtBQUosQ0FBVVIsUUFBUW9HLFNBQWxCLEVBQTZCcEcsUUFBUTBHLGNBQVIsS0FBMkJDLFFBQTNCLEdBQXNDMUwsU0FBdEMsR0FBa0QrRSxRQUFRMEcsY0FBdkYsQ0FBWjs7U0FFSyxJQUFJNUksSUFBSSxDQUFiLEVBQWdCQSxJQUFJaUQsTUFBTWxELE1BQTFCLEVBQWtDLEVBQUVDLENBQXBDLEVBQXVDO1lBQy9COEksT0FBTzdGLE1BQU1qRCxDQUFOLENBQVg7WUFDSStJLE1BQU1ELEtBQUs1TSxPQUFMLENBQWEsSUFBYixNQUF1QixDQUFDLENBQXhCLEdBQTRCNE0sS0FBSzVNLE9BQUwsQ0FBYSxHQUFiLENBQTVCLEdBQWdENE0sS0FBSzVNLE9BQUwsQ0FBYSxJQUFiLElBQXFCLENBQS9FOztZQUVJZ0gsR0FBSixFQUFTOEYsR0FBVDtZQUNJRCxRQUFRLENBQUMsQ0FBYixFQUFnQjtrQkFDTjdHLFFBQVErRyxPQUFSLENBQWdCSCxJQUFoQixDQUFOO2tCQUNNNUcsUUFBUTJGLGtCQUFSLEdBQTZCLElBQTdCLEdBQW9DLEVBQTFDO1NBRkosTUFHTztrQkFDRzNGLFFBQVErRyxPQUFSLENBQWdCSCxLQUFLMUksS0FBTCxDQUFXLENBQVgsRUFBYzJJLEdBQWQsQ0FBaEIsQ0FBTjtrQkFDTTdHLFFBQVErRyxPQUFSLENBQWdCSCxLQUFLMUksS0FBTCxDQUFXMkksTUFBTSxDQUFqQixDQUFoQixDQUFOOztZQUVBbEwsSUFBSXhCLElBQUosQ0FBU1YsR0FBVCxFQUFjdUgsR0FBZCxDQUFKLEVBQXdCO2dCQUNoQkEsR0FBSixJQUFXLEdBQUdpQyxNQUFILENBQVV4SixJQUFJdUgsR0FBSixDQUFWLEVBQW9CaUMsTUFBcEIsQ0FBMkI2RCxHQUEzQixDQUFYO1NBREosTUFFTztnQkFDQzlGLEdBQUosSUFBVzhGLEdBQVg7Ozs7V0FJRHJOLEdBQVA7Q0F2Qko7O0FBMEJBLElBQUl1TixjQUFjLFNBQVNBLFdBQVQsQ0FBcUJDLEtBQXJCLEVBQTRCSCxHQUE1QixFQUFpQzlHLE9BQWpDLEVBQTBDO1FBQ3BELENBQUNpSCxNQUFNcEosTUFBWCxFQUFtQjtlQUNSaUosR0FBUDs7O1FBR0FJLE9BQU9ELE1BQU1sTSxLQUFOLEVBQVg7O1FBRUl0QixHQUFKO1FBQ0l5TixTQUFTLElBQWIsRUFBbUI7Y0FDVCxFQUFOO2NBQ016TixJQUFJd0osTUFBSixDQUFXK0QsWUFBWUMsS0FBWixFQUFtQkgsR0FBbkIsRUFBd0I5RyxPQUF4QixDQUFYLENBQU47S0FGSixNQUdPO2NBQ0dBLFFBQVE2QyxZQUFSLEdBQXVCNUksT0FBTzZJLE1BQVAsQ0FBYyxJQUFkLENBQXZCLEdBQTZDLEVBQW5EO1lBQ0lxRSxZQUFZRCxLQUFLLENBQUwsTUFBWSxHQUFaLElBQW1CQSxLQUFLQSxLQUFLckosTUFBTCxHQUFjLENBQW5CLE1BQTBCLEdBQTdDLEdBQW1EcUosS0FBS2hKLEtBQUwsQ0FBVyxDQUFYLEVBQWNnSixLQUFLckosTUFBTCxHQUFjLENBQTVCLENBQW5ELEdBQW9GcUosSUFBcEc7WUFDSUUsUUFBUUMsU0FBU0YsU0FBVCxFQUFvQixFQUFwQixDQUFaO1lBRUksQ0FBQ0csTUFBTUYsS0FBTixDQUFELElBQ0FGLFNBQVNDLFNBRFQsSUFFQTdNLE9BQU84TSxLQUFQLE1BQWtCRCxTQUZsQixJQUdBQyxTQUFTLENBSFQsSUFJQ3BILFFBQVF1SCxXQUFSLElBQXVCSCxTQUFTcEgsUUFBUXdILFVBTDdDLEVBTUU7a0JBQ1EsRUFBTjtnQkFDSUosS0FBSixJQUFhSixZQUFZQyxLQUFaLEVBQW1CSCxHQUFuQixFQUF3QjlHLE9BQXhCLENBQWI7U0FSSixNQVNPO2dCQUNDbUgsU0FBSixJQUFpQkgsWUFBWUMsS0FBWixFQUFtQkgsR0FBbkIsRUFBd0I5RyxPQUF4QixDQUFqQjs7OztXQUlEdkcsR0FBUDtDQTdCSjs7QUFnQ0EsSUFBSWdPLFlBQVksU0FBU0EsU0FBVCxDQUFtQkMsUUFBbkIsRUFBNkJaLEdBQTdCLEVBQWtDOUcsT0FBbEMsRUFBMkM7UUFDbkQsQ0FBQzBILFFBQUwsRUFBZTs7Ozs7UUFLWDFHLE1BQU1oQixRQUFRZ0csU0FBUixHQUFvQjBCLFNBQVNoSCxPQUFULENBQWlCLGVBQWpCLEVBQWtDLE1BQWxDLENBQXBCLEdBQWdFZ0gsUUFBMUU7Ozs7UUFJSUMsU0FBUyxhQUFiO1FBQ0lDLFFBQVEsaUJBQVo7Ozs7UUFJSUMsVUFBVUYsT0FBT0csSUFBUCxDQUFZOUcsR0FBWixDQUFkOzs7O1FBSUloRixPQUFPLEVBQVg7UUFDSTZMLFFBQVEsQ0FBUixDQUFKLEVBQWdCOzs7WUFHUixDQUFDN0gsUUFBUTZDLFlBQVQsSUFBeUJsSCxJQUFJeEIsSUFBSixDQUFTRixPQUFPTixTQUFoQixFQUEyQmtPLFFBQVEsQ0FBUixDQUEzQixDQUE3QixFQUFxRTtnQkFDN0QsQ0FBQzdILFFBQVErSCxlQUFiLEVBQThCOzs7OzthQUs3QjlMLElBQUwsQ0FBVTRMLFFBQVEsQ0FBUixDQUFWOzs7OztRQUtBL0osSUFBSSxDQUFSO1dBQ08sQ0FBQytKLFVBQVVELE1BQU1FLElBQU4sQ0FBVzlHLEdBQVgsQ0FBWCxNQUFnQyxJQUFoQyxJQUF3Q2xELElBQUlrQyxRQUFRZ0ksS0FBM0QsRUFBa0U7YUFDekQsQ0FBTDtZQUNJLENBQUNoSSxRQUFRNkMsWUFBVCxJQUF5QmxILElBQUl4QixJQUFKLENBQVNGLE9BQU9OLFNBQWhCLEVBQTJCa08sUUFBUSxDQUFSLEVBQVduSCxPQUFYLENBQW1CLFFBQW5CLEVBQTZCLEVBQTdCLENBQTNCLENBQTdCLEVBQTJGO2dCQUNuRixDQUFDVixRQUFRK0gsZUFBYixFQUE4Qjs7OzthQUk3QjlMLElBQUwsQ0FBVTRMLFFBQVEsQ0FBUixDQUFWOzs7OztRQUtBQSxPQUFKLEVBQWE7YUFDSjVMLElBQUwsQ0FBVSxNQUFNK0UsSUFBSTlDLEtBQUosQ0FBVTJKLFFBQVFULEtBQWxCLENBQU4sR0FBaUMsR0FBM0M7OztXQUdHSixZQUFZaEwsSUFBWixFQUFrQjhLLEdBQWxCLEVBQXVCOUcsT0FBdkIsQ0FBUDtDQW5ESjs7QUFzREEsY0FBaUIsY0FBQSxDQUFVMEQsR0FBVixFQUFleUMsSUFBZixFQUFxQjtRQUM5Qm5HLFVBQVVtRyxRQUFRLEVBQXRCOztRQUVJbkcsUUFBUStHLE9BQVIsS0FBb0IsSUFBcEIsSUFBNEIvRyxRQUFRK0csT0FBUixLQUFvQjlMLFNBQWhELElBQTZELE9BQU8rRSxRQUFRK0csT0FBZixLQUEyQixVQUE1RixFQUF3RztjQUM5RixJQUFJdk0sU0FBSixDQUFjLCtCQUFkLENBQU47OztZQUdJNEwsU0FBUixHQUFvQixPQUFPcEcsUUFBUW9HLFNBQWYsS0FBNkIsUUFBN0IsSUFBeUM1QixRQUFNeUQsUUFBTixDQUFlakksUUFBUW9HLFNBQXZCLENBQXpDLEdBQTZFcEcsUUFBUW9HLFNBQXJGLEdBQWlHaEIsV0FBU2dCLFNBQTlIO1lBQ1E0QixLQUFSLEdBQWdCLE9BQU9oSSxRQUFRZ0ksS0FBZixLQUF5QixRQUF6QixHQUFvQ2hJLFFBQVFnSSxLQUE1QyxHQUFvRDVDLFdBQVM0QyxLQUE3RTtZQUNRUixVQUFSLEdBQXFCLE9BQU94SCxRQUFRd0gsVUFBZixLQUE4QixRQUE5QixHQUF5Q3hILFFBQVF3SCxVQUFqRCxHQUE4RHBDLFdBQVNvQyxVQUE1RjtZQUNRRCxXQUFSLEdBQXNCdkgsUUFBUXVILFdBQVIsS0FBd0IsS0FBOUM7WUFDUVIsT0FBUixHQUFrQixPQUFPL0csUUFBUStHLE9BQWYsS0FBMkIsVUFBM0IsR0FBd0MvRyxRQUFRK0csT0FBaEQsR0FBMEQzQixXQUFTMkIsT0FBckY7WUFDUWYsU0FBUixHQUFvQixPQUFPaEcsUUFBUWdHLFNBQWYsS0FBNkIsU0FBN0IsR0FBeUNoRyxRQUFRZ0csU0FBakQsR0FBNkRaLFdBQVNZLFNBQTFGO1lBQ1FuRCxZQUFSLEdBQXVCLE9BQU83QyxRQUFRNkMsWUFBZixLQUFnQyxTQUFoQyxHQUE0QzdDLFFBQVE2QyxZQUFwRCxHQUFtRXVDLFdBQVN2QyxZQUFuRztZQUNRa0YsZUFBUixHQUEwQixPQUFPL0gsUUFBUStILGVBQWYsS0FBbUMsU0FBbkMsR0FBK0MvSCxRQUFRK0gsZUFBdkQsR0FBeUUzQyxXQUFTMkMsZUFBNUc7WUFDUXJCLGNBQVIsR0FBeUIsT0FBTzFHLFFBQVEwRyxjQUFmLEtBQWtDLFFBQWxDLEdBQTZDMUcsUUFBUTBHLGNBQXJELEdBQXNFdEIsV0FBU3NCLGNBQXhHO1lBQ1FmLGtCQUFSLEdBQTZCLE9BQU8zRixRQUFRMkYsa0JBQWYsS0FBc0MsU0FBdEMsR0FBa0QzRixRQUFRMkYsa0JBQTFELEdBQStFUCxXQUFTTyxrQkFBckg7O1FBRUlqQyxRQUFRLEVBQVIsSUFBY0EsUUFBUSxJQUF0QixJQUE4QixPQUFPQSxHQUFQLEtBQWUsV0FBakQsRUFBOEQ7ZUFDbkQxRCxRQUFRNkMsWUFBUixHQUF1QjVJLE9BQU82SSxNQUFQLENBQWMsSUFBZCxDQUF2QixHQUE2QyxFQUFwRDs7O1FBR0FvRixVQUFVLE9BQU94RSxHQUFQLEtBQWUsUUFBZixHQUEwQitDLFlBQVkvQyxHQUFaLEVBQWlCMUQsT0FBakIsQ0FBMUIsR0FBc0QwRCxHQUFwRTtRQUNJakssTUFBTXVHLFFBQVE2QyxZQUFSLEdBQXVCNUksT0FBTzZJLE1BQVAsQ0FBYyxJQUFkLENBQXZCLEdBQTZDLEVBQXZEOzs7O1FBSUk5RyxPQUFPL0IsT0FBTytCLElBQVAsQ0FBWWtNLE9BQVosQ0FBWDtTQUNLLElBQUlwSyxJQUFJLENBQWIsRUFBZ0JBLElBQUk5QixLQUFLNkIsTUFBekIsRUFBaUMsRUFBRUMsQ0FBbkMsRUFBc0M7WUFDOUJrRCxNQUFNaEYsS0FBSzhCLENBQUwsQ0FBVjtZQUNJcUssU0FBU1YsVUFBVXpHLEdBQVYsRUFBZWtILFFBQVFsSCxHQUFSLENBQWYsRUFBNkJoQixPQUE3QixDQUFiO2NBQ013RSxRQUFNakIsS0FBTixDQUFZOUosR0FBWixFQUFpQjBPLE1BQWpCLEVBQXlCbkksT0FBekIsQ0FBTjs7O1dBR0d3RSxRQUFNSixPQUFOLENBQWMzSyxHQUFkLENBQVA7Q0FsQ0o7O0FDaElBLElBQUkrTCxZQUFZZixXQUFoQjtBQUNBLElBQUlqRixRQUFRbUYsT0FBWjtBQUNBLElBQUlELFVBQVUwRCxTQUFkOztBQUVBLGNBQWlCO2FBQ0oxRCxPQURJO1dBRU5sRixLQUZNO2VBR0ZnRztDQUhmOzs7O0FDSkE7Ozs7Ozs7O0FBUUEsQUFBTyxTQUFTNkMsWUFBVCxDQUFzQkMsR0FBdEIsRUFBMkJDLE1BQTNCLEVBQW1DO01BQ3BDLENBQUNBLE1BQUwsRUFBYTtXQUNKRCxHQUFQOztTQUVRQSxHQUFWLFNBQWlCRSxRQUFnQkQsTUFBaEIsQ0FBakI7Ozs7Ozs7Ozs7O0FBV0YsQUFBTyxTQUFTRSxPQUFULENBQWlCQyxPQUFqQixFQUEwQkMsV0FBMUIsRUFBdUM7U0FDbENELFFBQVFoSSxPQUFSLENBQWdCLE1BQWhCLEVBQXdCLEVBQXhCLENBQVYsU0FBeUNpSSxZQUFZakksT0FBWixDQUFvQixNQUFwQixFQUE0QixFQUE1QixDQUF6Qzs7Ozs7Ozs7O0FBU0YsQUFBTyxTQUFTa0ksVUFBVCxDQUFvQjNJLEdBQXBCLEVBQXlCOzs7OzBDQUlTMUYsSUFBaEMsQ0FBcUMwRixHQUFyQzs7Ozs7Ozs7Ozs7OztBQVlULEFBQU8sU0FBU29HLE1BQVQsQ0FBZ0J3QyxPQUFoQixFQUF5QkYsV0FBekIsRUFBc0NKLE1BQXRDLEVBQThDO01BQy9DLENBQUNNLE9BQUQsSUFBWUQsV0FBV0QsV0FBWCxDQUFoQixFQUF5QztXQUNoQ04sYUFBYU0sV0FBYixFQUEwQkosTUFBMUIsQ0FBUDs7O1NBR0tGLGFBQWFJLFFBQVFJLE9BQVIsRUFBaUJGLFdBQWpCLENBQWIsRUFBNENKLE1BQTVDLENBQVA7Ozs7Ozs7Ozs7Ozs7Q0MvQ0QsQ0FBQyxVQUFTTyxNQUFULEVBQWlCOzs7Ozs7Ozs7TUFTZEMsU0FBUyxTQUFUQSxNQUFTLENBQVMxSSxLQUFULEVBQWdCOztVQUVyQmtELE1BQU1sRCxVQUFVLElBQWhCLEVBQXNCLEtBQXRCLEVBQTZCMkksU0FBN0IsQ0FBUDtHQUZEO01BSUdDLGFBQWEsT0FKaEI7Ozs7Ozs7OztTQWFPQyxTQUFQLEdBQW1CLFVBQVM3SSxLQUFULEVBQWdCOztVQUUzQmtELE1BQU1sRCxVQUFVLElBQWhCLEVBQXNCLElBQXRCLEVBQTRCMkksU0FBNUIsQ0FBUDtHQUZEOzs7Ozs7OztTQVlPM0ksS0FBUCxHQUFlLFVBQVNOLEtBQVQsRUFBZ0I7O09BRTFCb0osU0FBU3BKLEtBQWI7T0FDQ2QsT0FBT21LLE9BQU9ySixLQUFQLENBRFI7T0FFQ3FILEtBRkQ7T0FFUWlDLElBRlI7O09BSUlwSyxTQUFTLE9BQWIsRUFBc0I7O2FBRVosRUFBVDtXQUNPYyxNQUFNbEMsTUFBYjs7U0FFS3VKLFFBQU0sQ0FBWCxFQUFhQSxRQUFNaUMsSUFBbkIsRUFBd0IsRUFBRWpDLEtBQTFCOztZQUVRQSxLQUFQLElBQWdCMkIsT0FBTzFJLEtBQVAsQ0FBYU4sTUFBTXFILEtBQU4sQ0FBYixDQUFoQjs7SUFQRixNQVNPLElBQUluSSxTQUFTLFFBQWIsRUFBdUI7O2FBRXBCLEVBQVQ7O1NBRUttSSxLQUFMLElBQWNySCxLQUFkOztZQUVRcUgsS0FBUCxJQUFnQjJCLE9BQU8xSSxLQUFQLENBQWFOLE1BQU1xSCxLQUFOLENBQWIsQ0FBaEI7Ozs7VUFJSytCLE1BQVA7R0F6QkQ7Ozs7Ozs7OztXQW9DU0csZUFBVCxDQUF5QkMsSUFBekIsRUFBK0JDLE1BQS9CLEVBQXVDOztPQUVsQ0osT0FBT0csSUFBUCxNQUFpQixRQUFyQixFQUVDLE9BQU9DLE1BQVA7O1FBRUksSUFBSXhJLEdBQVQsSUFBZ0J3SSxNQUFoQixFQUF3Qjs7UUFFbkJKLE9BQU9HLEtBQUt2SSxHQUFMLENBQVAsTUFBc0IsUUFBdEIsSUFBa0NvSSxPQUFPSSxPQUFPeEksR0FBUCxDQUFQLE1BQXdCLFFBQTlELEVBQXdFOztVQUVsRUEsR0FBTCxJQUFZc0ksZ0JBQWdCQyxLQUFLdkksR0FBTCxDQUFoQixFQUEyQndJLE9BQU94SSxHQUFQLENBQTNCLENBQVo7S0FGRCxNQUlPOztVQUVEQSxHQUFMLElBQVl3SSxPQUFPeEksR0FBUCxDQUFaOzs7O1VBTUt1SSxJQUFQOzs7Ozs7Ozs7OztXQVlRaEcsS0FBVCxDQUFlbEQsS0FBZixFQUFzQjZJLFNBQXRCLEVBQWlDTyxJQUFqQyxFQUF1Qzs7T0FFbEM1TSxTQUFTNE0sS0FBSyxDQUFMLENBQWI7T0FDQ0osT0FBT0ksS0FBSzVMLE1BRGI7O09BR0l3QyxTQUFTK0ksT0FBT3ZNLE1BQVAsTUFBbUIsUUFBaEMsRUFFQ0EsU0FBUyxFQUFUOztRQUVJLElBQUl1SyxRQUFNLENBQWYsRUFBaUJBLFFBQU1pQyxJQUF2QixFQUE0QixFQUFFakMsS0FBOUIsRUFBcUM7O1FBRWhDL0QsT0FBT29HLEtBQUtyQyxLQUFMLENBQVg7UUFFQ25JLE9BQU9tSyxPQUFPL0YsSUFBUCxDQUZSOztRQUlJcEUsU0FBUyxRQUFiLEVBQXVCOztTQUVsQixJQUFJK0IsR0FBVCxJQUFnQnFDLElBQWhCLEVBQXNCOztTQUVqQnFHLFFBQVFySixRQUFRMEksT0FBTzFJLEtBQVAsQ0FBYWdELEtBQUtyQyxHQUFMLENBQWIsQ0FBUixHQUFrQ3FDLEtBQUtyQyxHQUFMLENBQTlDOztTQUVJa0ksU0FBSixFQUFlOzthQUVQbEksR0FBUCxJQUFjc0ksZ0JBQWdCek0sT0FBT21FLEdBQVAsQ0FBaEIsRUFBNkIwSSxLQUE3QixDQUFkO01BRkQsTUFJTzs7YUFFQzFJLEdBQVAsSUFBYzBJLEtBQWQ7Ozs7O1VBUUk3TSxNQUFQOzs7Ozs7Ozs7OztXQVlRdU0sTUFBVCxDQUFnQnJKLEtBQWhCLEVBQXVCOztVQUVkLEVBQUQsQ0FBSzdGLFFBQUwsQ0FBY0MsSUFBZCxDQUFtQjRGLEtBQW5CLEVBQTBCN0IsS0FBMUIsQ0FBZ0MsQ0FBaEMsRUFBbUMsQ0FBQyxDQUFwQyxFQUF1Q3pELFdBQXZDLEVBQVA7OztNQUlHcU8sTUFBSixFQUFZOztpQkFFWCxHQUFpQkMsTUFBakI7R0FGRCxNQUlPOztVQUVDRSxVQUFQLElBQXFCRixNQUFyQjs7RUFqS0QsRUFxS0UsYUFBa0IsUUFBbEIsSUFBOEJZLE1BQTlCLElBQXdDLGFBQTBCLFFBQWxFLElBQThFQSxPQUFPeEcsT0FyS3ZGOzs7QUNORDs7Ozs7O0FBTUEsQUFBTyxTQUFTSSxLQUFULEdBQTJCO29DQUFUZ0YsTUFBUztVQUFBOzs7U0FDekJxQixRQUFPVixTQUFQLGlCQUFpQixJQUFqQixTQUEwQlgsTUFBMUIsRUFBUDs7Ozs7Ozs7OztBQVVGLEFBQU8sU0FBU3NCLElBQVQsQ0FBY3BRLEdBQWQsRUFBbUJ1QyxJQUFuQixFQUF5QjtNQUN4QjhOLFVBQVUsRUFBaEI7U0FDTzlOLElBQVAsQ0FBWXZDLEdBQVosRUFBaUI2QixPQUFqQixDQUF5QixVQUFDeU8sTUFBRCxFQUFZO1FBQy9CL04sS0FBS2hDLE9BQUwsQ0FBYStQLE1BQWIsTUFBeUIsQ0FBQyxDQUE5QixFQUFpQztjQUN2QkEsTUFBUixJQUFrQnRRLElBQUlzUSxNQUFKLENBQWxCOztHQUZKO1NBS09ELE9BQVA7OztBQzNCRixJQUFNRSxXQUFZLFNBQVpBLFFBQVk7U0FBWTFJLFFBQVo7Q0FBbEI7QUFDQSxJQUFNMkksWUFBWSxTQUFaQSxTQUFZO1NBQU8xTixRQUFRQyxNQUFSLENBQWUwTixHQUFmLENBQVA7Q0FBbEI7O0lBR3FCQzt3QkFDTDs7O1NBQ1BDLE9BQUwsR0FBZ0IsRUFBaEI7U0FDS0MsTUFBTCxHQUFnQixFQUFoQjtTQUNLQyxRQUFMLEdBQWdCLEVBQWhCOzs7OzsyQkFHS0MsSUFBSTtXQUNKSCxPQUFMLENBQWFuTyxJQUFiLENBQWtCc08sRUFBbEI7YUFDTyxLQUFLSCxPQUFMLENBQWF2TSxNQUFiLEdBQXNCLENBQTdCOzs7OzRCQUc0QztVQUF4QzJNLE9BQXdDLHVFQUE5QlIsUUFBOEI7VUFBcEJ4TixNQUFvQix1RUFBWHlOLFNBQVc7O1dBQ3ZDSSxNQUFMLENBQVlwTyxJQUFaLENBQWlCLEVBQUV1TyxnQkFBRixFQUFXaE8sY0FBWCxFQUFqQjthQUNPLEtBQUs2TixNQUFMLENBQVl4TSxNQUFaLEdBQXFCLENBQTVCOzs7OzZCQUdNME0sSUFBSTtXQUNMRCxRQUFMLENBQWNyTyxJQUFkLENBQW1Cc08sRUFBbkI7YUFDTyxLQUFLRCxRQUFMLENBQWN6TSxNQUFkLEdBQXVCLENBQTlCOzs7O2tDQUdZNE0sUUFBUTtVQUNkeEQsUUFBUSxTQUFSQSxLQUFRLENBQUM5SixPQUFELEVBQVV1TixJQUFWO2VBQW1Cdk4sUUFBUWdDLElBQVIsQ0FBYXVMLElBQWIsQ0FBbkI7T0FBZDthQUNPLEtBQUtOLE9BQUwsQ0FBYTVHLE1BQWIsQ0FBb0J5RCxLQUFwQixFQUEyQjFLLFFBQVFJLE9BQVIsQ0FBZ0I4TixNQUFoQixDQUEzQixDQUFQOzs7O2lDQUdXUCxLQUFLNUksVUFBVTtVQUNwQjJGLFFBQVUsU0FBVkEsS0FBVSxDQUFDOUosT0FBRCxFQUFVdU4sSUFBVjtlQUFtQnZOLFFBQVFnQyxJQUFSLENBQWF1TCxLQUFLRixPQUFsQixFQUEyQkUsS0FBS2xPLE1BQWhDLENBQW5CO09BQWhCO1VBQ01tTyxVQUFVVCxNQUFNM04sUUFBUUMsTUFBUixDQUFlME4sR0FBZixDQUFOLEdBQTRCM04sUUFBUUksT0FBUixDQUFnQjJFLFFBQWhCLENBQTVDO2FBQ08sS0FBSytJLE1BQUwsQ0FBWTdHLE1BQVosQ0FBbUJ5RCxLQUFuQixFQUEwQjBELE9BQTFCLENBQVA7Ozs7cUNBSWU7V0FDVkwsUUFBTCxDQUFjaFAsT0FBZCxDQUFzQjtlQUFRb1AsTUFBUjtPQUF0Qjs7Ozs7O0FDcENKLElBQU1FLGtCQUFrQjtZQUNOLG1DQURNO2tCQUVOO0NBRmxCOztJQUtxQkM7b0JBQ007UUFBYkosTUFBYSx1RUFBSixFQUFJOzs7U0FDbEJLLFNBQUwsR0FBaUJ2SCxNQUFNLEVBQU4sRUFBVSxFQUFFbkksU0FBU3dQLGVBQVgsRUFBVixDQUFqQjtTQUNLRyxPQUFMLEdBQWlCLEVBQWpCOztTQUVLbFAsR0FBTCxDQUFTNE8sTUFBVDs7Ozs7d0NBR2lDO3dDQUFkTyxZQUFjO29CQUFBOzs7VUFDM0JQLFNBQVNsSCx3QkFBTSxLQUFLdUgsU0FBWCxFQUFzQixLQUFLQyxPQUEzQixTQUF1Q0MsWUFBdkMsRUFBZjtVQUVFMUgsUUFBT21ILE9BQU9wTyxJQUFkLE1BQXVCLFFBQXZCLElBQ0FvTyxPQUFPclAsT0FEUCxJQUVBcVAsT0FBT3JQLE9BQVAsQ0FBZSxjQUFmLE1BQW1DLGtCQUhyQyxFQUlFO2VBQ09pQixJQUFQLEdBQWNrRCxLQUFLaUcsU0FBTCxDQUFlaUYsT0FBT3BPLElBQXRCLENBQWQ7O2FBRUtvTyxNQUFQOzs7OzJCQUdFQSxRQUFRO1dBQ0xNLE9BQUwsR0FBZXhILE1BQU0sS0FBS3dILE9BQVgsRUFBb0JOLE1BQXBCLENBQWY7Ozs7NkJBR0k7YUFDR2xILE1BQU0sS0FBS3VILFNBQVgsRUFBc0IsS0FBS0MsT0FBM0IsQ0FBUDs7Ozs7O0FDakNKOzs7Ozs7O0FBT0EsU0FBU0UsWUFBVCxDQUFzQjNKLFFBQXRCLEVBQWdDNUUsTUFBaEMsRUFBd0M7TUFDaEN3TyxNQUFNO2FBQ0U1SixTQUFTbEcsT0FEWDtZQUVFa0csU0FBU0gsTUFGWDtnQkFHRUcsU0FBU0Q7R0FIdkI7O01BTUkzRSxXQUFXLEtBQWYsRUFBc0I7UUFDaEJ5TyxJQUFKLEdBQVc3SixTQUFTakYsSUFBcEI7V0FDTzZPLEdBQVA7OztTQUdLNUosU0FBUzVFLE1BQVQsSUFDTnlDLElBRE0sQ0FDRCxVQUFDZ00sSUFBRCxFQUFVO1FBQ1ZBLElBQUosR0FBV0EsSUFBWDtXQUNPRCxHQUFQO0dBSEssQ0FBUDs7Ozs7Ozs7OztBQWNGLEFBQWUsU0FBU0UsZUFBVCxDQUF5QjlKLFFBQXpCLEVBQW1DNUUsTUFBbkMsRUFBMkM7TUFDcEQsQ0FBQzRFLFNBQVNGLEVBQWQsRUFBa0I7UUFDVjhJLE1BQVksSUFBSWxMLEtBQUosQ0FBVXNDLFNBQVNELFVBQW5CLENBQWxCO1FBQ0lGLE1BQUosR0FBa0JHLFNBQVNILE1BQTNCO1FBQ0lFLFVBQUosR0FBa0JDLFNBQVNELFVBQTNCO1FBQ0lqRyxPQUFKLEdBQWtCa0csU0FBU2xHLE9BQTNCO1dBQ09tQixRQUFRQyxNQUFSLENBQWUwTixHQUFmLENBQVA7O01BRUV4TixNQUFKLEVBQVk7V0FDSHVPLGFBQWEzSixRQUFiLEVBQXVCNUUsTUFBdkIsQ0FBUDs7O01BR0kyTyxjQUFjL0osU0FBU2xHLE9BQVQsQ0FBaUJNLEdBQWpCLENBQXFCLGNBQXJCLENBQXBCO01BQ0kyUCxlQUFlQSxZQUFZQyxRQUFaLENBQXFCLGtCQUFyQixDQUFuQixFQUE2RDtXQUNwREwsYUFBYTNKLFFBQWIsRUFBdUIsTUFBdkIsQ0FBUDs7U0FFSzJKLGFBQWEzSixRQUFiLEVBQXVCLE1BQXZCLENBQVA7OztJQ3hDSWlLO2tCQUNxQjtRQUFiZCxNQUFhLHVFQUFKLEVBQUk7OztTQUNsQmUsV0FBTCxHQUFtQixJQUFJckIsVUFBSixFQUFuQjtTQUNLWSxPQUFMLEdBQW1CLElBQUlGLE1BQUosQ0FBV2hCLEtBQUtZLE1BQUwsRUFBYSxDQUFDLFNBQUQsQ0FBYixDQUFYLENBQW5COztTQUVLNUIsT0FBTCxDQUFhNEIsT0FBTzVCLE9BQVAsSUFBa0IsRUFBL0I7U0FDSzRDLG9CQUFMO1NBQ0tDLHNCQUFMO1NBQ0tDLHNCQUFMOzs7OzsyQkFHS2xCLFFBQVE7VUFDUG1CLFdBQVcsSUFBSSxLQUFLdkgsV0FBVCxDQUFxQmQsTUFBTSxLQUFLNkIsUUFBTCxFQUFOLEVBQXVCcUYsTUFBdkIsQ0FBckIsQ0FBakI7VUFDTW9CLFdBQVcsU0FBWEEsUUFBVztZQUFHckIsT0FBSCxRQUFHQSxPQUFIO1lBQVloTyxNQUFaLFFBQVlBLE1BQVo7ZUFBeUJvUCxTQUFTRSxLQUFULENBQWV0QixPQUFmLEVBQXdCaE8sTUFBeEIsQ0FBekI7T0FBakI7V0FDS2dQLFdBQUwsQ0FBaUJwQixPQUFqQixDQUF5QjlPLE9BQXpCLENBQWlDc1EsU0FBU0csTUFBMUM7V0FDS1AsV0FBTCxDQUFpQm5CLE1BQWpCLENBQXdCL08sT0FBeEIsQ0FBZ0N1USxRQUFoQztXQUNLTCxXQUFMLENBQWlCbEIsUUFBakIsQ0FBMEJoUCxPQUExQixDQUFrQ3NRLFNBQVNJLE9BQTNDO2FBQ09KLFFBQVA7Ozs7Z0NBR09uQixRQUFRO1VBQ1gsT0FBT0EsTUFBUCxLQUFrQixXQUF0QixFQUFtQztZQUMzQnJGLGNBQVcsS0FBSzJGLE9BQUwsQ0FBYXJQLEdBQWIsRUFBakI7YUFDS21OLE9BQUwsT0FBbUJ6RCxZQUFTeUQsT0FBVCxHQUFtQixLQUFLQSxPQUFMLEVBQXRDO2VBQ096RCxXQUFQOztXQUVHMkYsT0FBTCxDQUFhbFAsR0FBYixDQUFpQmdPLEtBQUtZLE1BQUwsRUFBYSxDQUFDLFNBQUQsQ0FBYixDQUFqQjthQUNPNUIsT0FBUCxJQUFrQixLQUFLQSxPQUFMLENBQWE0QixPQUFPNUIsT0FBcEIsQ0FBbEI7YUFDTyxLQUFLa0MsT0FBTCxDQUFhclAsR0FBYixFQUFQOzs7OzRCQUdNbU4sVUFBUztVQUNYLE9BQU9BLFFBQVAsS0FBbUIsV0FBdkIsRUFBb0M7ZUFDM0IsS0FBS29ELFFBQVo7O1dBRUdBLFFBQUwsR0FBZ0JwRCxRQUFoQjthQUNPLEtBQUtvRCxRQUFaOzs7OzhCQUdtQjtVQUFieEIsTUFBYSx1RUFBSixFQUFJOzthQUNaOUssTUFBUCxLQUFrQjhLLE9BQU85SyxNQUFQLEdBQWdCLEtBQWxDO1VBQ011TSxlQUFlLEtBQUtuQixPQUFMLENBQWFvQixpQkFBYixDQUErQjFCLE1BQS9CLENBQXJCO1VBQ014SyxNQUFlbU0sT0FBVSxLQUFLSCxRQUFmLEVBQXlCeEIsT0FBT3hLLEdBQWhDLEVBQXFDd0ssT0FBT2xDLE1BQTVDLENBQXJCOzthQUVPLEtBQUs4RCxNQUFMLENBQVlwTSxHQUFaLEVBQWlCaU0sWUFBakIsQ0FBUDs7OzsyQkFHS2pNLEtBQUt3SyxRQUFROzs7YUFDWCxLQUFLZSxXQUFMLENBQWlCYyxhQUFqQixDQUErQjdCLE1BQS9CLEVBQ050TCxJQURNLENBQ0Q7ZUFBVWxHLE1BQU1nSCxHQUFOLEVBQVd3SyxNQUFYLENBQVY7T0FEQyxFQUVOdEwsSUFGTSxDQUVEO2VBQU9pTSxnQkFBZ0JGLEdBQWhCLEVBQXFCVCxPQUFPOEIsUUFBNUIsQ0FBUDtPQUZDLEVBR05wTixJQUhNLENBSUw7ZUFBTyxNQUFLcU0sV0FBTCxDQUFpQmdCLFlBQWpCLENBQThCdlIsU0FBOUIsRUFBeUNpUSxHQUF6QyxDQUFQO09BSkssRUFLTDtlQUFPLE1BQUtNLFdBQUwsQ0FBaUJnQixZQUFqQixDQUE4QnRDLEdBQTlCLENBQVA7T0FMSyxFQU9OL0ssSUFQTSxDQVFMO2VBQU81QyxRQUFRSSxPQUFSLENBQWdCLE1BQUs2TyxXQUFMLENBQWlCaUIsY0FBakIsRUFBaEIsRUFBbUR0TixJQUFuRCxDQUF3RDtpQkFBTStMLEdBQU47U0FBeEQsQ0FBUDtPQVJLLEVBU0w7ZUFBTzNPLFFBQVFJLE9BQVIsQ0FBZ0IsTUFBSzZPLFdBQUwsQ0FBaUJpQixjQUFqQixFQUFoQixFQUFtRHROLElBQW5ELENBQXdELFlBQU07Z0JBQVErSyxHQUFOO1NBQWhFLENBQVA7T0FUSyxDQUFQOzs7OzZDQWF1Qjs7O09BQ3RCLEtBQUQsRUFBUSxRQUFSLEVBQWtCLE1BQWxCLEVBQTBCNU8sT0FBMUIsQ0FBa0MsVUFBQ3FFLE1BQUQsRUFBWTtlQUN2Q0EsTUFBTCxJQUFlLFVBQUMrTSxJQUFELEVBQXVCO2NBQWhCakMsTUFBZ0IsdUVBQVAsRUFBTzs7Y0FDOUJ5QixlQUFlLE9BQUtuQixPQUFMLENBQWFvQixpQkFBYixDQUErQjFCLE1BQS9CLEVBQXVDLEVBQUU5SyxjQUFGLEVBQXZDLENBQXJCO2NBQ01NLE1BQWVtTSxPQUFVLE9BQUtILFFBQWYsRUFBeUJTLElBQXpCLEVBQStCakMsT0FBT2xDLE1BQXRDLENBQXJCOztpQkFFTyxPQUFLOEQsTUFBTCxDQUFZcE0sR0FBWixFQUFpQmlNLFlBQWpCLENBQVA7U0FKRjtPQURGOzs7OzJDQVVxQjs7O09BQ3BCLE1BQUQsRUFBUyxLQUFULEVBQWdCLE9BQWhCLEVBQXlCNVEsT0FBekIsQ0FBaUMsVUFBQ3FFLE1BQUQsRUFBWTtlQUN0Q0EsTUFBTCxJQUFlLFVBQUMrTSxJQUFELEVBQU9yUSxJQUFQLEVBQWFvTyxNQUFiLEVBQXdCO2NBQy9CeUIsZUFBZSxPQUFLbkIsT0FBTCxDQUFhb0IsaUJBQWIsQ0FBK0IxQixNQUEvQixFQUF1QyxFQUFFcE8sVUFBRixFQUFRc0QsY0FBUixFQUF2QyxDQUFyQjtjQUNNTSxNQUFlbU0sT0FBVSxPQUFLSCxRQUFmLEVBQXlCUyxJQUF6QixDQUFyQjs7aUJBRU8sT0FBS0wsTUFBTCxDQUFZcE0sR0FBWixFQUFpQmlNLFlBQWpCLENBQVA7U0FKRjtPQURGOzs7OzZDQVV1Qjs7O09BQ3RCLFFBQUQsRUFBVyxPQUFYLEVBQW9CLFNBQXBCLEVBQStCNVEsT0FBL0IsQ0FBdUMsVUFBQ3FFLE1BQUQsRUFBWTtlQUM1Q0EsTUFBTCxJQUFlOzs7aUJBQWEsc0JBQUs2TCxXQUFMLEVBQWlCN0wsTUFBakIsK0JBQWI7U0FBZjtPQURGOzs7Ozs7QUFPSixZQUFlLElBQUk0TCxJQUFKLEVBQWY7Ozs7In0=
