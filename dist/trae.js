/**
 * Trae, the fetch library!
 *
 * @version: 1.1.0
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
    value: function resolveFinally() {
      this._finally.forEach(function (task) {
        return task();
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

      var defaultConf = { headers: { 'Contet-Type': 'application/json' } };

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhZS5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3doYXR3Zy1mZXRjaC9mZXRjaC5qcyIsIi4uL25vZGVfbW9kdWxlcy9xcy9saWIvdXRpbHMuanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL2Zvcm1hdHMuanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL3N0cmluZ2lmeS5qcyIsIi4uL25vZGVfbW9kdWxlcy9xcy9saWIvcGFyc2UuanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL2luZGV4LmpzIiwiLi4vbGliL2hlbHBlcnMvdXJsLWhhbmRsZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvbWVyZ2UvbWVyZ2UuanMiLCIuLi9saWIvdXRpbHMuanMiLCIuLi9saWIvbWlkZGxld2FyZS5qcyIsIi4uL2xpYi9jb25maWcuanMiLCIuLi9saWIvaGVscGVycy9yZXNwb25zZS1oYW5kbGVyLmpzIiwiLi4vbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbihzZWxmKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBpZiAoc2VsZi5mZXRjaCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHN1cHBvcnQgPSB7XG4gICAgc2VhcmNoUGFyYW1zOiAnVVJMU2VhcmNoUGFyYW1zJyBpbiBzZWxmLFxuICAgIGl0ZXJhYmxlOiAnU3ltYm9sJyBpbiBzZWxmICYmICdpdGVyYXRvcicgaW4gU3ltYm9sLFxuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKClcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KSgpLFxuICAgIGZvcm1EYXRhOiAnRm9ybURhdGEnIGluIHNlbGYsXG4gICAgYXJyYXlCdWZmZXI6ICdBcnJheUJ1ZmZlcicgaW4gc2VsZlxuICB9XG5cbiAgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIpIHtcbiAgICB2YXIgdmlld0NsYXNzZXMgPSBbXG4gICAgICAnW29iamVjdCBJbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQ2NEFycmF5XSdcbiAgICBdXG5cbiAgICB2YXIgaXNEYXRhVmlldyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiBEYXRhVmlldy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmopXG4gICAgfVxuXG4gICAgdmFyIGlzQXJyYXlCdWZmZXJWaWV3ID0gQXJyYXlCdWZmZXIuaXNWaWV3IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiB2aWV3Q2xhc3Nlcy5pbmRleE9mKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopKSA+IC0xXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTmFtZShuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgbmFtZSA9IFN0cmluZyhuYW1lKVxuICAgIH1cbiAgICBpZiAoL1teYS16MC05XFwtIyQlJicqKy5cXF5fYHx+XS9pLnRlc3QobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2hhcmFjdGVyIGluIGhlYWRlciBmaWVsZCBuYW1lJylcbiAgICB9XG4gICAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSBTdHJpbmcodmFsdWUpXG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgLy8gQnVpbGQgYSBkZXN0cnVjdGl2ZSBpdGVyYXRvciBmb3IgdGhlIHZhbHVlIGxpc3RcbiAgZnVuY3Rpb24gaXRlcmF0b3JGb3IoaXRlbXMpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSB7XG4gICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gaXRlbXMuc2hpZnQoKVxuICAgICAgICByZXR1cm4ge2RvbmU6IHZhbHVlID09PSB1bmRlZmluZWQsIHZhbHVlOiB2YWx1ZX1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgICAgaXRlcmF0b3JbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaXRlcmF0b3JcbiAgfVxuXG4gIGZ1bmN0aW9uIEhlYWRlcnMoaGVhZGVycykge1xuICAgIHRoaXMubWFwID0ge31cblxuICAgIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIHZhbHVlKVxuICAgICAgfSwgdGhpcylcblxuICAgIH0gZWxzZSBpZiAoaGVhZGVycykge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaGVhZGVycykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIGhlYWRlcnNbbmFtZV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMubWFwW25hbWVdXG4gICAgdGhpcy5tYXBbbmFtZV0gPSBvbGRWYWx1ZSA/IG9sZFZhbHVlKycsJyt2YWx1ZSA6IHZhbHVlXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICByZXR1cm4gdGhpcy5oYXMobmFtZSkgPyB0aGlzLm1hcFtuYW1lXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGZvciAodmFyIG5hbWUgaW4gdGhpcy5tYXApIHtcbiAgICAgIGlmICh0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMubWFwW25hbWVdLCBuYW1lLCB0aGlzKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKG5hbWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgaXRlbXMucHVzaCh2YWx1ZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgSGVhZGVycy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRBcnJheUJ1ZmZlckFzVGV4dChidWYpIHtcbiAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICB2YXIgY2hhcnMgPSBuZXcgQXJyYXkodmlldy5sZW5ndGgpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZpZXcubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoYXJzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSh2aWV3W2ldKVxuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJylcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1ZmZlckNsb25lKGJ1Zikge1xuICAgIGlmIChidWYuc2xpY2UpIHtcbiAgICAgIHJldHVybiBidWYuc2xpY2UoMClcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYuYnl0ZUxlbmd0aClcbiAgICAgIHZpZXcuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZikpXG4gICAgICByZXR1cm4gdmlldy5idWZmZXJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiBzdXBwb3J0LmJsb2IgJiYgaXNEYXRhVmlldyhib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5LmJ1ZmZlcilcbiAgICAgICAgLy8gSUUgMTAtMTEgY2FuJ3QgaGFuZGxlIGEgRGF0YVZpZXcgYm9keS5cbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiAoQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkgfHwgaXNBcnJheUJ1ZmZlclZpZXcoYm9keSkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QmxvYiAmJiB0aGlzLl9ib2R5QmxvYi50eXBlKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgdGhpcy5fYm9keUJsb2IudHlwZSlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKSlcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gY29uc3VtZWQodGhpcykgfHwgUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICByZXR1cm4gcmVhZEJsb2JBc1RleHQodGhpcy5fYm9keUJsb2IpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlYWRBcnJheUJ1ZmZlckFzVGV4dCh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIHRleHQnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHlcblxuICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLnVybCA9IGlucHV0XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbnB1dC5ib2R5VXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKVxuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSBpbnB1dC51cmxcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFsc1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHRoaXMubWV0aG9kID0gaW5wdXQubWV0aG9kXG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlXG4gICAgICBpZiAoIWJvZHkgJiYgaW5wdXQuX2JvZHlJbml0ICE9IG51bGwpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdFxuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcywgeyBib2R5OiB0aGlzLl9ib2R5SW5pdCB9KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUhlYWRlcnMocmF3SGVhZGVycykge1xuICAgIHZhciBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKVxuICAgIHJhd0hlYWRlcnMuc3BsaXQoJ1xcclxcbicpLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgdmFyIHBhcnRzID0gbGluZS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gcGFydHMuc2hpZnQoKS50cmltKClcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFydHMuam9pbignOicpLnRyaW0oKVxuICAgICAgICBoZWFkZXJzLmFwcGVuZChrZXksIHZhbHVlKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRlcnNcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSAnc3RhdHVzJyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXMgOiAyMDBcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gJ3N0YXR1c1RleHQnIGluIG9wdGlvbnMgPyBvcHRpb25zLnN0YXR1c1RleHQgOiAnT0snXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IHBhcnNlSGVhZGVycyh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpXG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy51cmwgPSAncmVzcG9uc2VVUkwnIGluIHhociA/IHhoci5yZXNwb25zZVVSTCA6IG9wdGlvbnMuaGVhZGVycy5nZXQoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxudmFyIGhleFRhYmxlID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJyYXkgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gICAgICAgIGFycmF5LnB1c2goJyUnICsgKChpIDwgMTYgPyAnMCcgOiAnJykgKyBpLnRvU3RyaW5nKDE2KSkudG9VcHBlckNhc2UoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFycmF5O1xufSgpKTtcblxuZXhwb3J0cy5hcnJheVRvT2JqZWN0ID0gZnVuY3Rpb24gKHNvdXJjZSwgb3B0aW9ucykge1xuICAgIHZhciBvYmogPSBvcHRpb25zICYmIG9wdGlvbnMucGxhaW5PYmplY3RzID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc291cmNlLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc291cmNlW2ldICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgb2JqW2ldID0gc291cmNlW2ldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UsIG9wdGlvbnMpIHtcbiAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygc291cmNlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgICAgICB0YXJnZXQucHVzaChzb3VyY2UpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0YXJnZXQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICB0YXJnZXRbc291cmNlXSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW3RhcmdldCwgc291cmNlXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBbdGFyZ2V0XS5jb25jYXQoc291cmNlKTtcbiAgICB9XG5cbiAgICB2YXIgbWVyZ2VUYXJnZXQgPSB0YXJnZXQ7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSAmJiAhQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICAgIG1lcmdlVGFyZ2V0ID0gZXhwb3J0cy5hcnJheVRvT2JqZWN0KHRhcmdldCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSAmJiBBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgICAgc291cmNlLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0sIGkpIHtcbiAgICAgICAgICAgIGlmIChoYXMuY2FsbCh0YXJnZXQsIGkpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldFtpXSAmJiB0eXBlb2YgdGFyZ2V0W2ldID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRbaV0gPSBleHBvcnRzLm1lcmdlKHRhcmdldFtpXSwgaXRlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbaV0gPSBpdGVtO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc291cmNlKS5yZWR1Y2UoZnVuY3Rpb24gKGFjYywga2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHNvdXJjZVtrZXldO1xuXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYWNjLCBrZXkpKSB7XG4gICAgICAgICAgICBhY2Nba2V5XSA9IGV4cG9ydHMubWVyZ2UoYWNjW2tleV0sIHZhbHVlLCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjY1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCBtZXJnZVRhcmdldCk7XG59O1xuXG5leHBvcnRzLmRlY29kZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0ci5yZXBsYWNlKC9cXCsvZywgJyAnKSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuZW5jb2RlID0gZnVuY3Rpb24gKHN0cikge1xuICAgIC8vIFRoaXMgY29kZSB3YXMgb3JpZ2luYWxseSB3cml0dGVuIGJ5IEJyaWFuIFdoaXRlIChtc2NkZXgpIGZvciB0aGUgaW8uanMgY29yZSBxdWVyeXN0cmluZyBsaWJyYXJ5LlxuICAgIC8vIEl0IGhhcyBiZWVuIGFkYXB0ZWQgaGVyZSBmb3Igc3RyaWN0ZXIgYWRoZXJlbmNlIHRvIFJGQyAzOTg2XG4gICAgaWYgKHN0ci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG5cbiAgICB2YXIgc3RyaW5nID0gdHlwZW9mIHN0ciA9PT0gJ3N0cmluZycgPyBzdHIgOiBTdHJpbmcoc3RyKTtcblxuICAgIHZhciBvdXQgPSAnJztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgYyA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIGMgPT09IDB4MkQgfHwgLy8gLVxuICAgICAgICAgICAgYyA9PT0gMHgyRSB8fCAvLyAuXG4gICAgICAgICAgICBjID09PSAweDVGIHx8IC8vIF9cbiAgICAgICAgICAgIGMgPT09IDB4N0UgfHwgLy8gflxuICAgICAgICAgICAgKGMgPj0gMHgzMCAmJiBjIDw9IDB4MzkpIHx8IC8vIDAtOVxuICAgICAgICAgICAgKGMgPj0gMHg0MSAmJiBjIDw9IDB4NUEpIHx8IC8vIGEtelxuICAgICAgICAgICAgKGMgPj0gMHg2MSAmJiBjIDw9IDB4N0EpIC8vIEEtWlxuICAgICAgICApIHtcbiAgICAgICAgICAgIG91dCArPSBzdHJpbmcuY2hhckF0KGkpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYyA8IDB4ODApIHtcbiAgICAgICAgICAgIG91dCA9IG91dCArIGhleFRhYmxlW2NdO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYyA8IDB4ODAwKSB7XG4gICAgICAgICAgICBvdXQgPSBvdXQgKyAoaGV4VGFibGVbMHhDMCB8IChjID4+IDYpXSArIGhleFRhYmxlWzB4ODAgfCAoYyAmIDB4M0YpXSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjIDwgMHhEODAwIHx8IGMgPj0gMHhFMDAwKSB7XG4gICAgICAgICAgICBvdXQgPSBvdXQgKyAoaGV4VGFibGVbMHhFMCB8IChjID4+IDEyKV0gKyBoZXhUYWJsZVsweDgwIHwgKChjID4+IDYpICYgMHgzRildICsgaGV4VGFibGVbMHg4MCB8IChjICYgMHgzRildKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaSArPSAxO1xuICAgICAgICBjID0gMHgxMDAwMCArICgoKGMgJiAweDNGRikgPDwgMTApIHwgKHN0cmluZy5jaGFyQ29kZUF0KGkpICYgMHgzRkYpKTtcbiAgICAgICAgb3V0ICs9IGhleFRhYmxlWzB4RjAgfCAoYyA+PiAxOCldICsgaGV4VGFibGVbMHg4MCB8ICgoYyA+PiAxMikgJiAweDNGKV0gKyBoZXhUYWJsZVsweDgwIHwgKChjID4+IDYpICYgMHgzRildICsgaGV4VGFibGVbMHg4MCB8IChjICYgMHgzRildO1xuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG59O1xuXG5leHBvcnRzLmNvbXBhY3QgPSBmdW5jdGlvbiAob2JqLCByZWZlcmVuY2VzKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8IG9iaiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIHZhciByZWZzID0gcmVmZXJlbmNlcyB8fCBbXTtcbiAgICB2YXIgbG9va3VwID0gcmVmcy5pbmRleE9mKG9iaik7XG4gICAgaWYgKGxvb2t1cCAhPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIHJlZnNbbG9va3VwXTtcbiAgICB9XG5cbiAgICByZWZzLnB1c2gob2JqKTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgdmFyIGNvbXBhY3RlZCA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAob2JqW2ldICYmIHR5cGVvZiBvYmpbaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29tcGFjdGVkLnB1c2goZXhwb3J0cy5jb21wYWN0KG9ialtpXSwgcmVmcykpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqW2ldICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbXBhY3RlZC5wdXNoKG9ialtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29tcGFjdGVkO1xuICAgIH1cblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBvYmpba2V5XSA9IGV4cG9ydHMuY29tcGFjdChvYmpba2V5XSwgcmVmcyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxuZXhwb3J0cy5pc1JlZ0V4cCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICBpZiAob2JqID09PSBudWxsIHx8IHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gISEob2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlciAmJiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVwbGFjZSA9IFN0cmluZy5wcm90b3R5cGUucmVwbGFjZTtcbnZhciBwZXJjZW50VHdlbnRpZXMgPSAvJTIwL2c7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgICdkZWZhdWx0JzogJ1JGQzM5ODYnLFxuICAgIGZvcm1hdHRlcnM6IHtcbiAgICAgICAgUkZDMTczODogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZS5jYWxsKHZhbHVlLCBwZXJjZW50VHdlbnRpZXMsICcrJyk7XG4gICAgICAgIH0sXG4gICAgICAgIFJGQzM5ODY6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBSRkMxNzM4OiAnUkZDMTczOCcsXG4gICAgUkZDMzk4NjogJ1JGQzM5ODYnXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgZm9ybWF0cyA9IHJlcXVpcmUoJy4vZm9ybWF0cycpO1xuXG52YXIgYXJyYXlQcmVmaXhHZW5lcmF0b3JzID0ge1xuICAgIGJyYWNrZXRzOiBmdW5jdGlvbiBicmFja2V0cyhwcmVmaXgpIHtcbiAgICAgICAgcmV0dXJuIHByZWZpeCArICdbXSc7XG4gICAgfSxcbiAgICBpbmRpY2VzOiBmdW5jdGlvbiBpbmRpY2VzKHByZWZpeCwga2V5KSB7XG4gICAgICAgIHJldHVybiBwcmVmaXggKyAnWycgKyBrZXkgKyAnXSc7XG4gICAgfSxcbiAgICByZXBlYXQ6IGZ1bmN0aW9uIHJlcGVhdChwcmVmaXgpIHtcbiAgICAgICAgcmV0dXJuIHByZWZpeDtcbiAgICB9XG59O1xuXG52YXIgdG9JU08gPSBEYXRlLnByb3RvdHlwZS50b0lTT1N0cmluZztcblxudmFyIGRlZmF1bHRzID0ge1xuICAgIGRlbGltaXRlcjogJyYnLFxuICAgIGVuY29kZTogdHJ1ZSxcbiAgICBlbmNvZGVyOiB1dGlscy5lbmNvZGUsXG4gICAgc2VyaWFsaXplRGF0ZTogZnVuY3Rpb24gc2VyaWFsaXplRGF0ZShkYXRlKSB7XG4gICAgICAgIHJldHVybiB0b0lTTy5jYWxsKGRhdGUpO1xuICAgIH0sXG4gICAgc2tpcE51bGxzOiBmYWxzZSxcbiAgICBzdHJpY3ROdWxsSGFuZGxpbmc6IGZhbHNlXG59O1xuXG52YXIgc3RyaW5naWZ5ID0gZnVuY3Rpb24gc3RyaW5naWZ5KG9iamVjdCwgcHJlZml4LCBnZW5lcmF0ZUFycmF5UHJlZml4LCBzdHJpY3ROdWxsSGFuZGxpbmcsIHNraXBOdWxscywgZW5jb2RlciwgZmlsdGVyLCBzb3J0LCBhbGxvd0RvdHMsIHNlcmlhbGl6ZURhdGUsIGZvcm1hdHRlcikge1xuICAgIHZhciBvYmogPSBvYmplY3Q7XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb2JqID0gZmlsdGVyKHByZWZpeCwgb2JqKTtcbiAgICB9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgb2JqID0gc2VyaWFsaXplRGF0ZShvYmopO1xuICAgIH0gZWxzZSBpZiAob2JqID09PSBudWxsKSB7XG4gICAgICAgIGlmIChzdHJpY3ROdWxsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVyID8gZW5jb2RlcihwcmVmaXgpIDogcHJlZml4O1xuICAgICAgICB9XG5cbiAgICAgICAgb2JqID0gJyc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBvYmogPT09ICdudW1iZXInIHx8IHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB1dGlscy5pc0J1ZmZlcihvYmopKSB7XG4gICAgICAgIGlmIChlbmNvZGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gW2Zvcm1hdHRlcihlbmNvZGVyKHByZWZpeCkpICsgJz0nICsgZm9ybWF0dGVyKGVuY29kZXIob2JqKSldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbZm9ybWF0dGVyKHByZWZpeCkgKyAnPScgKyBmb3JtYXR0ZXIoU3RyaW5nKG9iaikpXTtcbiAgICB9XG5cbiAgICB2YXIgdmFsdWVzID0gW107XG5cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9XG5cbiAgICB2YXIgb2JqS2V5cztcbiAgICBpZiAoQXJyYXkuaXNBcnJheShmaWx0ZXIpKSB7XG4gICAgICAgIG9iaktleXMgPSBmaWx0ZXI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgICAgICBvYmpLZXlzID0gc29ydCA/IGtleXMuc29ydChzb3J0KSA6IGtleXM7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmpLZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBrZXkgPSBvYmpLZXlzW2ldO1xuXG4gICAgICAgIGlmIChza2lwTnVsbHMgJiYgb2JqW2tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSkge1xuICAgICAgICAgICAgdmFsdWVzID0gdmFsdWVzLmNvbmNhdChzdHJpbmdpZnkoXG4gICAgICAgICAgICAgICAgb2JqW2tleV0sXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVBcnJheVByZWZpeChwcmVmaXgsIGtleSksXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVBcnJheVByZWZpeCxcbiAgICAgICAgICAgICAgICBzdHJpY3ROdWxsSGFuZGxpbmcsXG4gICAgICAgICAgICAgICAgc2tpcE51bGxzLFxuICAgICAgICAgICAgICAgIGVuY29kZXIsXG4gICAgICAgICAgICAgICAgZmlsdGVyLFxuICAgICAgICAgICAgICAgIHNvcnQsXG4gICAgICAgICAgICAgICAgYWxsb3dEb3RzLFxuICAgICAgICAgICAgICAgIHNlcmlhbGl6ZURhdGUsXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVyXG4gICAgICAgICAgICApKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHZhbHVlcy5jb25jYXQoc3RyaW5naWZ5KFxuICAgICAgICAgICAgICAgIG9ialtrZXldLFxuICAgICAgICAgICAgICAgIHByZWZpeCArIChhbGxvd0RvdHMgPyAnLicgKyBrZXkgOiAnWycgKyBrZXkgKyAnXScpLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQXJyYXlQcmVmaXgsXG4gICAgICAgICAgICAgICAgc3RyaWN0TnVsbEhhbmRsaW5nLFxuICAgICAgICAgICAgICAgIHNraXBOdWxscyxcbiAgICAgICAgICAgICAgICBlbmNvZGVyLFxuICAgICAgICAgICAgICAgIGZpbHRlcixcbiAgICAgICAgICAgICAgICBzb3J0LFxuICAgICAgICAgICAgICAgIGFsbG93RG90cyxcbiAgICAgICAgICAgICAgICBzZXJpYWxpemVEYXRlLFxuICAgICAgICAgICAgICAgIGZvcm1hdHRlclxuICAgICAgICAgICAgKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWVzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqZWN0LCBvcHRzKSB7XG4gICAgdmFyIG9iaiA9IG9iamVjdDtcbiAgICB2YXIgb3B0aW9ucyA9IG9wdHMgfHwge307XG4gICAgdmFyIGRlbGltaXRlciA9IHR5cGVvZiBvcHRpb25zLmRlbGltaXRlciA9PT0gJ3VuZGVmaW5lZCcgPyBkZWZhdWx0cy5kZWxpbWl0ZXIgOiBvcHRpb25zLmRlbGltaXRlcjtcbiAgICB2YXIgc3RyaWN0TnVsbEhhbmRsaW5nID0gdHlwZW9mIG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID09PSAnYm9vbGVhbicgPyBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA6IGRlZmF1bHRzLnN0cmljdE51bGxIYW5kbGluZztcbiAgICB2YXIgc2tpcE51bGxzID0gdHlwZW9mIG9wdGlvbnMuc2tpcE51bGxzID09PSAnYm9vbGVhbicgPyBvcHRpb25zLnNraXBOdWxscyA6IGRlZmF1bHRzLnNraXBOdWxscztcbiAgICB2YXIgZW5jb2RlID0gdHlwZW9mIG9wdGlvbnMuZW5jb2RlID09PSAnYm9vbGVhbicgPyBvcHRpb25zLmVuY29kZSA6IGRlZmF1bHRzLmVuY29kZTtcbiAgICB2YXIgZW5jb2RlciA9IGVuY29kZSA/ICh0eXBlb2Ygb3B0aW9ucy5lbmNvZGVyID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5lbmNvZGVyIDogZGVmYXVsdHMuZW5jb2RlcikgOiBudWxsO1xuICAgIHZhciBzb3J0ID0gdHlwZW9mIG9wdGlvbnMuc29ydCA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuc29ydCA6IG51bGw7XG4gICAgdmFyIGFsbG93RG90cyA9IHR5cGVvZiBvcHRpb25zLmFsbG93RG90cyA9PT0gJ3VuZGVmaW5lZCcgPyBmYWxzZSA6IG9wdGlvbnMuYWxsb3dEb3RzO1xuICAgIHZhciBzZXJpYWxpemVEYXRlID0gdHlwZW9mIG9wdGlvbnMuc2VyaWFsaXplRGF0ZSA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuc2VyaWFsaXplRGF0ZSA6IGRlZmF1bHRzLnNlcmlhbGl6ZURhdGU7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmZvcm1hdCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgb3B0aW9ucy5mb3JtYXQgPSBmb3JtYXRzLmRlZmF1bHQ7XG4gICAgfSBlbHNlIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGZvcm1hdHMuZm9ybWF0dGVycywgb3B0aW9ucy5mb3JtYXQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZm9ybWF0IG9wdGlvbiBwcm92aWRlZC4nKTtcbiAgICB9XG4gICAgdmFyIGZvcm1hdHRlciA9IGZvcm1hdHMuZm9ybWF0dGVyc1tvcHRpb25zLmZvcm1hdF07XG4gICAgdmFyIG9iaktleXM7XG4gICAgdmFyIGZpbHRlcjtcblxuICAgIGlmIChvcHRpb25zLmVuY29kZXIgIT09IG51bGwgJiYgb3B0aW9ucy5lbmNvZGVyICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuZW5jb2RlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFbmNvZGVyIGhhcyB0byBiZSBhIGZ1bmN0aW9uLicpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5maWx0ZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZmlsdGVyID0gb3B0aW9ucy5maWx0ZXI7XG4gICAgICAgIG9iaiA9IGZpbHRlcignJywgb2JqKTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkob3B0aW9ucy5maWx0ZXIpKSB7XG4gICAgICAgIGZpbHRlciA9IG9wdGlvbnMuZmlsdGVyO1xuICAgICAgICBvYmpLZXlzID0gZmlsdGVyO1xuICAgIH1cblxuICAgIHZhciBrZXlzID0gW107XG5cbiAgICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICB2YXIgYXJyYXlGb3JtYXQ7XG4gICAgaWYgKG9wdGlvbnMuYXJyYXlGb3JtYXQgaW4gYXJyYXlQcmVmaXhHZW5lcmF0b3JzKSB7XG4gICAgICAgIGFycmF5Rm9ybWF0ID0gb3B0aW9ucy5hcnJheUZvcm1hdDtcbiAgICB9IGVsc2UgaWYgKCdpbmRpY2VzJyBpbiBvcHRpb25zKSB7XG4gICAgICAgIGFycmF5Rm9ybWF0ID0gb3B0aW9ucy5pbmRpY2VzID8gJ2luZGljZXMnIDogJ3JlcGVhdCc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYXJyYXlGb3JtYXQgPSAnaW5kaWNlcyc7XG4gICAgfVxuXG4gICAgdmFyIGdlbmVyYXRlQXJyYXlQcmVmaXggPSBhcnJheVByZWZpeEdlbmVyYXRvcnNbYXJyYXlGb3JtYXRdO1xuXG4gICAgaWYgKCFvYmpLZXlzKSB7XG4gICAgICAgIG9iaktleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgIH1cblxuICAgIGlmIChzb3J0KSB7XG4gICAgICAgIG9iaktleXMuc29ydChzb3J0KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iaktleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IG9iaktleXNbaV07XG5cbiAgICAgICAgaWYgKHNraXBOdWxscyAmJiBvYmpba2V5XSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBrZXlzID0ga2V5cy5jb25jYXQoc3RyaW5naWZ5KFxuICAgICAgICAgICAgb2JqW2tleV0sXG4gICAgICAgICAgICBrZXksXG4gICAgICAgICAgICBnZW5lcmF0ZUFycmF5UHJlZml4LFxuICAgICAgICAgICAgc3RyaWN0TnVsbEhhbmRsaW5nLFxuICAgICAgICAgICAgc2tpcE51bGxzLFxuICAgICAgICAgICAgZW5jb2RlcixcbiAgICAgICAgICAgIGZpbHRlcixcbiAgICAgICAgICAgIHNvcnQsXG4gICAgICAgICAgICBhbGxvd0RvdHMsXG4gICAgICAgICAgICBzZXJpYWxpemVEYXRlLFxuICAgICAgICAgICAgZm9ybWF0dGVyXG4gICAgICAgICkpO1xuICAgIH1cblxuICAgIHJldHVybiBrZXlzLmpvaW4oZGVsaW1pdGVyKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgICBhbGxvd0RvdHM6IGZhbHNlLFxuICAgIGFsbG93UHJvdG90eXBlczogZmFsc2UsXG4gICAgYXJyYXlMaW1pdDogMjAsXG4gICAgZGVjb2RlcjogdXRpbHMuZGVjb2RlLFxuICAgIGRlbGltaXRlcjogJyYnLFxuICAgIGRlcHRoOiA1LFxuICAgIHBhcmFtZXRlckxpbWl0OiAxMDAwLFxuICAgIHBsYWluT2JqZWN0czogZmFsc2UsXG4gICAgc3RyaWN0TnVsbEhhbmRsaW5nOiBmYWxzZVxufTtcblxudmFyIHBhcnNlVmFsdWVzID0gZnVuY3Rpb24gcGFyc2VWYWx1ZXMoc3RyLCBvcHRpb25zKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdChvcHRpb25zLmRlbGltaXRlciwgb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCA9PT0gSW5maW5pdHkgPyB1bmRlZmluZWQgOiBvcHRpb25zLnBhcmFtZXRlckxpbWl0KTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHBhcnQgPSBwYXJ0c1tpXTtcbiAgICAgICAgdmFyIHBvcyA9IHBhcnQuaW5kZXhPZignXT0nKSA9PT0gLTEgPyBwYXJ0LmluZGV4T2YoJz0nKSA6IHBhcnQuaW5kZXhPZignXT0nKSArIDE7XG5cbiAgICAgICAgdmFyIGtleSwgdmFsO1xuICAgICAgICBpZiAocG9zID09PSAtMSkge1xuICAgICAgICAgICAga2V5ID0gb3B0aW9ucy5kZWNvZGVyKHBhcnQpO1xuICAgICAgICAgICAgdmFsID0gb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgPyBudWxsIDogJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBrZXkgPSBvcHRpb25zLmRlY29kZXIocGFydC5zbGljZSgwLCBwb3MpKTtcbiAgICAgICAgICAgIHZhbCA9IG9wdGlvbnMuZGVjb2RlcihwYXJ0LnNsaWNlKHBvcyArIDEpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzLmNhbGwob2JqLCBrZXkpKSB7XG4gICAgICAgICAgICBvYmpba2V5XSA9IFtdLmNvbmNhdChvYmpba2V5XSkuY29uY2F0KHZhbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvYmpba2V5XSA9IHZhbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59O1xuXG52YXIgcGFyc2VPYmplY3QgPSBmdW5jdGlvbiBwYXJzZU9iamVjdChjaGFpbiwgdmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKCFjaGFpbi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG5cbiAgICB2YXIgcm9vdCA9IGNoYWluLnNoaWZ0KCk7XG5cbiAgICB2YXIgb2JqO1xuICAgIGlmIChyb290ID09PSAnW10nKSB7XG4gICAgICAgIG9iaiA9IFtdO1xuICAgICAgICBvYmogPSBvYmouY29uY2F0KHBhcnNlT2JqZWN0KGNoYWluLCB2YWwsIG9wdGlvbnMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBvYmogPSBvcHRpb25zLnBsYWluT2JqZWN0cyA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiB7fTtcbiAgICAgICAgdmFyIGNsZWFuUm9vdCA9IHJvb3RbMF0gPT09ICdbJyAmJiByb290W3Jvb3QubGVuZ3RoIC0gMV0gPT09ICddJyA/IHJvb3Quc2xpY2UoMSwgcm9vdC5sZW5ndGggLSAxKSA6IHJvb3Q7XG4gICAgICAgIHZhciBpbmRleCA9IHBhcnNlSW50KGNsZWFuUm9vdCwgMTApO1xuICAgICAgICBpZiAoXG4gICAgICAgICAgICAhaXNOYU4oaW5kZXgpICYmXG4gICAgICAgICAgICByb290ICE9PSBjbGVhblJvb3QgJiZcbiAgICAgICAgICAgIFN0cmluZyhpbmRleCkgPT09IGNsZWFuUm9vdCAmJlxuICAgICAgICAgICAgaW5kZXggPj0gMCAmJlxuICAgICAgICAgICAgKG9wdGlvbnMucGFyc2VBcnJheXMgJiYgaW5kZXggPD0gb3B0aW9ucy5hcnJheUxpbWl0KVxuICAgICAgICApIHtcbiAgICAgICAgICAgIG9iaiA9IFtdO1xuICAgICAgICAgICAgb2JqW2luZGV4XSA9IHBhcnNlT2JqZWN0KGNoYWluLCB2YWwsIG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2JqW2NsZWFuUm9vdF0gPSBwYXJzZU9iamVjdChjaGFpbiwgdmFsLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59O1xuXG52YXIgcGFyc2VLZXlzID0gZnVuY3Rpb24gcGFyc2VLZXlzKGdpdmVuS2V5LCB2YWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoIWdpdmVuS2V5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUcmFuc2Zvcm0gZG90IG5vdGF0aW9uIHRvIGJyYWNrZXQgbm90YXRpb25cbiAgICB2YXIga2V5ID0gb3B0aW9ucy5hbGxvd0RvdHMgPyBnaXZlbktleS5yZXBsYWNlKC9cXC4oW15cXC5cXFtdKykvZywgJ1skMV0nKSA6IGdpdmVuS2V5O1xuXG4gICAgLy8gVGhlIHJlZ2V4IGNodW5rc1xuXG4gICAgdmFyIHBhcmVudCA9IC9eKFteXFxbXFxdXSopLztcbiAgICB2YXIgY2hpbGQgPSAvKFxcW1teXFxbXFxdXSpcXF0pL2c7XG5cbiAgICAvLyBHZXQgdGhlIHBhcmVudFxuXG4gICAgdmFyIHNlZ21lbnQgPSBwYXJlbnQuZXhlYyhrZXkpO1xuXG4gICAgLy8gU3Rhc2ggdGhlIHBhcmVudCBpZiBpdCBleGlzdHNcblxuICAgIHZhciBrZXlzID0gW107XG4gICAgaWYgKHNlZ21lbnRbMV0pIHtcbiAgICAgICAgLy8gSWYgd2UgYXJlbid0IHVzaW5nIHBsYWluIG9iamVjdHMsIG9wdGlvbmFsbHkgcHJlZml4IGtleXNcbiAgICAgICAgLy8gdGhhdCB3b3VsZCBvdmVyd3JpdGUgb2JqZWN0IHByb3RvdHlwZSBwcm9wZXJ0aWVzXG4gICAgICAgIGlmICghb3B0aW9ucy5wbGFpbk9iamVjdHMgJiYgaGFzLmNhbGwoT2JqZWN0LnByb3RvdHlwZSwgc2VnbWVudFsxXSkpIHtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5hbGxvd1Byb3RvdHlwZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBrZXlzLnB1c2goc2VnbWVudFsxXSk7XG4gICAgfVxuXG4gICAgLy8gTG9vcCB0aHJvdWdoIGNoaWxkcmVuIGFwcGVuZGluZyB0byB0aGUgYXJyYXkgdW50aWwgd2UgaGl0IGRlcHRoXG5cbiAgICB2YXIgaSA9IDA7XG4gICAgd2hpbGUgKChzZWdtZW50ID0gY2hpbGQuZXhlYyhrZXkpKSAhPT0gbnVsbCAmJiBpIDwgb3B0aW9ucy5kZXB0aCkge1xuICAgICAgICBpICs9IDE7XG4gICAgICAgIGlmICghb3B0aW9ucy5wbGFpbk9iamVjdHMgJiYgaGFzLmNhbGwoT2JqZWN0LnByb3RvdHlwZSwgc2VnbWVudFsxXS5yZXBsYWNlKC9cXFt8XFxdL2csICcnKSkpIHtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5hbGxvd1Byb3RvdHlwZXMpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBrZXlzLnB1c2goc2VnbWVudFsxXSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUncyBhIHJlbWFpbmRlciwganVzdCBhZGQgd2hhdGV2ZXIgaXMgbGVmdFxuXG4gICAgaWYgKHNlZ21lbnQpIHtcbiAgICAgICAga2V5cy5wdXNoKCdbJyArIGtleS5zbGljZShzZWdtZW50LmluZGV4KSArICddJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlT2JqZWN0KGtleXMsIHZhbCwgb3B0aW9ucyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChzdHIsIG9wdHMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IG9wdHMgfHwge307XG5cbiAgICBpZiAob3B0aW9ucy5kZWNvZGVyICE9PSBudWxsICYmIG9wdGlvbnMuZGVjb2RlciAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmRlY29kZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRGVjb2RlciBoYXMgdG8gYmUgYSBmdW5jdGlvbi4nKTtcbiAgICB9XG5cbiAgICBvcHRpb25zLmRlbGltaXRlciA9IHR5cGVvZiBvcHRpb25zLmRlbGltaXRlciA9PT0gJ3N0cmluZycgfHwgdXRpbHMuaXNSZWdFeHAob3B0aW9ucy5kZWxpbWl0ZXIpID8gb3B0aW9ucy5kZWxpbWl0ZXIgOiBkZWZhdWx0cy5kZWxpbWl0ZXI7XG4gICAgb3B0aW9ucy5kZXB0aCA9IHR5cGVvZiBvcHRpb25zLmRlcHRoID09PSAnbnVtYmVyJyA/IG9wdGlvbnMuZGVwdGggOiBkZWZhdWx0cy5kZXB0aDtcbiAgICBvcHRpb25zLmFycmF5TGltaXQgPSB0eXBlb2Ygb3B0aW9ucy5hcnJheUxpbWl0ID09PSAnbnVtYmVyJyA/IG9wdGlvbnMuYXJyYXlMaW1pdCA6IGRlZmF1bHRzLmFycmF5TGltaXQ7XG4gICAgb3B0aW9ucy5wYXJzZUFycmF5cyA9IG9wdGlvbnMucGFyc2VBcnJheXMgIT09IGZhbHNlO1xuICAgIG9wdGlvbnMuZGVjb2RlciA9IHR5cGVvZiBvcHRpb25zLmRlY29kZXIgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLmRlY29kZXIgOiBkZWZhdWx0cy5kZWNvZGVyO1xuICAgIG9wdGlvbnMuYWxsb3dEb3RzID0gdHlwZW9mIG9wdGlvbnMuYWxsb3dEb3RzID09PSAnYm9vbGVhbicgPyBvcHRpb25zLmFsbG93RG90cyA6IGRlZmF1bHRzLmFsbG93RG90cztcbiAgICBvcHRpb25zLnBsYWluT2JqZWN0cyA9IHR5cGVvZiBvcHRpb25zLnBsYWluT2JqZWN0cyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5wbGFpbk9iamVjdHMgOiBkZWZhdWx0cy5wbGFpbk9iamVjdHM7XG4gICAgb3B0aW9ucy5hbGxvd1Byb3RvdHlwZXMgPSB0eXBlb2Ygb3B0aW9ucy5hbGxvd1Byb3RvdHlwZXMgPT09ICdib29sZWFuJyA/IG9wdGlvbnMuYWxsb3dQcm90b3R5cGVzIDogZGVmYXVsdHMuYWxsb3dQcm90b3R5cGVzO1xuICAgIG9wdGlvbnMucGFyYW1ldGVyTGltaXQgPSB0eXBlb2Ygb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCA9PT0gJ251bWJlcicgPyBvcHRpb25zLnBhcmFtZXRlckxpbWl0IDogZGVmYXVsdHMucGFyYW1ldGVyTGltaXQ7XG4gICAgb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgPSB0eXBlb2Ygb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgPT09ICdib29sZWFuJyA/IG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nIDogZGVmYXVsdHMuc3RyaWN0TnVsbEhhbmRsaW5nO1xuXG4gICAgaWYgKHN0ciA9PT0gJycgfHwgc3RyID09PSBudWxsIHx8IHR5cGVvZiBzdHIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLnBsYWluT2JqZWN0cyA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiB7fTtcbiAgICB9XG5cbiAgICB2YXIgdGVtcE9iaiA9IHR5cGVvZiBzdHIgPT09ICdzdHJpbmcnID8gcGFyc2VWYWx1ZXMoc3RyLCBvcHRpb25zKSA6IHN0cjtcbiAgICB2YXIgb2JqID0gb3B0aW9ucy5wbGFpbk9iamVjdHMgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG5cbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIGtleXMgYW5kIHNldHVwIHRoZSBuZXcgb2JqZWN0XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRlbXBPYmopO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgdmFyIG5ld09iaiA9IHBhcnNlS2V5cyhrZXksIHRlbXBPYmpba2V5XSwgb3B0aW9ucyk7XG4gICAgICAgIG9iaiA9IHV0aWxzLm1lcmdlKG9iaiwgbmV3T2JqLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdXRpbHMuY29tcGFjdChvYmopO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHN0cmluZ2lmeSA9IHJlcXVpcmUoJy4vc3RyaW5naWZ5Jyk7XG52YXIgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlJyk7XG52YXIgZm9ybWF0cyA9IHJlcXVpcmUoJy4vZm9ybWF0cycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBmb3JtYXRzOiBmb3JtYXRzLFxuICAgIHBhcnNlOiBwYXJzZSxcbiAgICBzdHJpbmdpZnk6IHN0cmluZ2lmeVxufTtcbiIsImltcG9ydCB7IHN0cmluZ2lmeSBhcyBzdHJpbmdpZnlQYXJhbXMgfSBmcm9tICdxcyc7XG5cbi8qKlxuICogU3RyaW5naWZ5IGFuZCBjb25jYXRzIHBhcmFtcyB0byB0aGUgcHJvdmlkZWQgVVJMXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IFVSTCBUaGUgVVJMXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIFRoZSBwYXJhbXMgT2JqZWN0XG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgdXJsIGFuZCBwYXJhbXMgY29tYmluZWRcbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gY29uY2F0UGFyYW1zKFVSTCwgcGFyYW1zKSB7XG4gIHJldHVybiBwYXJhbXNcbiAgICA/IGAke1VSTH0/JHtzdHJpbmdpZnlQYXJhbXMocGFyYW1zKX1gLnJlcGxhY2UoL1xcPyQvLCAnJylcbiAgICA6IFVSTDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFVSTCBieSBjb21iaW5pbmcgdGhlIHNwZWNpZmllZCBVUkxzXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVUkwgVGhlIGJhc2UgVVJMXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIFVSTFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbWJpbmVkIFVSTFxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5lKGJhc2VVUkwsIHJlbGF0aXZlVVJMKSB7XG4gIHJldHVybiBgJHtiYXNlVVJMLnJlcGxhY2UoL1xcLyskLywgJycpfS8ke3JlbGF0aXZlVVJMLnJlcGxhY2UoL15cXC8rLywgJycpfWA7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgVVJMIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQWJzb2x1dGUodXJsKSB7XG4gIC8vIEEgVVJMIGlzIGNvbnNpZGVyZWQgYWJzb2x1dGUgaWYgaXQgYmVnaW5zIHdpdGggXCI8c2NoZW1lPjovL1wiIG9yIFwiLy9cIiAocHJvdG9jb2wtcmVsYXRpdmUgVVJMKS5cbiAgLy8gUkZDIDM5ODYgZGVmaW5lcyBzY2hlbWUgbmFtZSBhcyBhIHNlcXVlbmNlIG9mIGNoYXJhY3RlcnMgYmVnaW5uaW5nIHdpdGggYSBsZXR0ZXIgYW5kIGZvbGxvd2VkXG4gIC8vIGJ5IGFueSBjb21iaW5hdGlvbiBvZiBsZXR0ZXJzLCBkaWdpdHMsIHBsdXMsIHBlcmlvZCwgb3IgaHlwaGVuLlxuICByZXR1cm4gL14oW2Etel1bYS16XFxkXFwrXFwtXFwuXSo6KT9cXC9cXC8vaS50ZXN0KHVybCk7XG59XG5cbi8qKlxuICogRm9ybWF0IGFuIHVybCBjb21iaW5pbmcgcHJvdmlkZWQgdXJscyBvciByZXR1cm5pbmcgdGhlIHJlbGF0aXZlVVJMXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVcmwgVGhlIGJhc2UgdXJsXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIHVybFxuICogQHJldHVybnMge3N0cmluZ30gcmVsYXRpdmVVUkwgaWYgdGhlIHNwZWNpZmllZCByZWxhdGl2ZVVSTCBpcyBhYnNvbHV0ZSBvciBiYXNlVXJsIGlzIG5vdCBkZWZpbmVkLFxuICogICAgICAgICAgICAgICAgICAgb3RoZXJ3aXNlIGl0IHJldHVybnMgdGhlIGNvbWJpbmF0aW9uIG9mIGJvdGggdXJsc1xuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyBUaGUgcGFyYW1zIG9iamVjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0KGJhc2VVcmwsIHJlbGF0aXZlVVJMLCBwYXJhbXMpIHtcbiAgaWYgKCFiYXNlVXJsIHx8IGlzQWJzb2x1dGUocmVsYXRpdmVVUkwpKSB7XG4gICAgcmV0dXJuIGNvbmNhdFBhcmFtcyhyZWxhdGl2ZVVSTCwgcGFyYW1zKTtcbiAgfVxuXG4gIHJldHVybiBjb25jYXRQYXJhbXMoY29tYmluZShiYXNlVXJsLCByZWxhdGl2ZVVSTCksIHBhcmFtcyk7XG59XG4iLCIvKiFcclxuICogQG5hbWUgSmF2YVNjcmlwdC9Ob2RlSlMgTWVyZ2UgdjEuMi4wXHJcbiAqIEBhdXRob3IgeWVpa29zXHJcbiAqIEByZXBvc2l0b3J5IGh0dHBzOi8vZ2l0aHViLmNvbS95ZWlrb3MvanMubWVyZ2VcclxuXHJcbiAqIENvcHlyaWdodCAyMDE0IHllaWtvcyAtIE1JVCBsaWNlbnNlXHJcbiAqIGh0dHBzOi8vcmF3LmdpdGh1Yi5jb20veWVpa29zL2pzLm1lcmdlL21hc3Rlci9MSUNFTlNFXHJcbiAqL1xyXG5cclxuOyhmdW5jdGlvbihpc05vZGUpIHtcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2Ugb25lIG9yIG1vcmUgb2JqZWN0cyBcclxuXHQgKiBAcGFyYW0gYm9vbD8gY2xvbmVcclxuXHQgKiBAcGFyYW0gbWl4ZWQsLi4uIGFyZ3VtZW50c1xyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdHZhciBQdWJsaWMgPSBmdW5jdGlvbihjbG9uZSkge1xyXG5cclxuXHRcdHJldHVybiBtZXJnZShjbG9uZSA9PT0gdHJ1ZSwgZmFsc2UsIGFyZ3VtZW50cyk7XHJcblxyXG5cdH0sIHB1YmxpY05hbWUgPSAnbWVyZ2UnO1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb3IgbW9yZSBvYmplY3RzIHJlY3Vyc2l2ZWx5IFxyXG5cdCAqIEBwYXJhbSBib29sPyBjbG9uZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCwuLi4gYXJndW1lbnRzXHJcblx0ICogQHJldHVybiBvYmplY3RcclxuXHQgKi9cclxuXHJcblx0UHVibGljLnJlY3Vyc2l2ZSA9IGZ1bmN0aW9uKGNsb25lKSB7XHJcblxyXG5cdFx0cmV0dXJuIG1lcmdlKGNsb25lID09PSB0cnVlLCB0cnVlLCBhcmd1bWVudHMpO1xyXG5cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBDbG9uZSB0aGUgaW5wdXQgcmVtb3ZpbmcgYW55IHJlZmVyZW5jZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEByZXR1cm4gbWl4ZWRcclxuXHQgKi9cclxuXHJcblx0UHVibGljLmNsb25lID0gZnVuY3Rpb24oaW5wdXQpIHtcclxuXHJcblx0XHR2YXIgb3V0cHV0ID0gaW5wdXQsXHJcblx0XHRcdHR5cGUgPSB0eXBlT2YoaW5wdXQpLFxyXG5cdFx0XHRpbmRleCwgc2l6ZTtcclxuXHJcblx0XHRpZiAodHlwZSA9PT0gJ2FycmF5Jykge1xyXG5cclxuXHRcdFx0b3V0cHV0ID0gW107XHJcblx0XHRcdHNpemUgPSBpbnB1dC5sZW5ndGg7XHJcblxyXG5cdFx0XHRmb3IgKGluZGV4PTA7aW5kZXg8c2l6ZTsrK2luZGV4KVxyXG5cclxuXHRcdFx0XHRvdXRwdXRbaW5kZXhdID0gUHVibGljLmNsb25lKGlucHV0W2luZGV4XSk7XHJcblxyXG5cdFx0fSBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0b3V0cHV0ID0ge307XHJcblxyXG5cdFx0XHRmb3IgKGluZGV4IGluIGlucHV0KVxyXG5cclxuXHRcdFx0XHRvdXRwdXRbaW5kZXhdID0gUHVibGljLmNsb25lKGlucHV0W2luZGV4XSk7XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBvdXRwdXQ7XHJcblxyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHR3byBvYmplY3RzIHJlY3Vyc2l2ZWx5XHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHBhcmFtIG1peGVkIGV4dGVuZFxyXG5cdCAqIEByZXR1cm4gbWl4ZWRcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gbWVyZ2VfcmVjdXJzaXZlKGJhc2UsIGV4dGVuZCkge1xyXG5cclxuXHRcdGlmICh0eXBlT2YoYmFzZSkgIT09ICdvYmplY3QnKVxyXG5cclxuXHRcdFx0cmV0dXJuIGV4dGVuZDtcclxuXHJcblx0XHRmb3IgKHZhciBrZXkgaW4gZXh0ZW5kKSB7XHJcblxyXG5cdFx0XHRpZiAodHlwZU9mKGJhc2Vba2V5XSkgPT09ICdvYmplY3QnICYmIHR5cGVPZihleHRlbmRba2V5XSkgPT09ICdvYmplY3QnKSB7XHJcblxyXG5cdFx0XHRcdGJhc2Vba2V5XSA9IG1lcmdlX3JlY3Vyc2l2ZShiYXNlW2tleV0sIGV4dGVuZFtrZXldKTtcclxuXHJcblx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdGJhc2Vba2V5XSA9IGV4dGVuZFtrZXldO1xyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gYmFzZTtcclxuXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb3IgbW9yZSBvYmplY3RzXHJcblx0ICogQHBhcmFtIGJvb2wgY2xvbmVcclxuXHQgKiBAcGFyYW0gYm9vbCByZWN1cnNpdmVcclxuXHQgKiBAcGFyYW0gYXJyYXkgYXJndlxyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIG1lcmdlKGNsb25lLCByZWN1cnNpdmUsIGFyZ3YpIHtcclxuXHJcblx0XHR2YXIgcmVzdWx0ID0gYXJndlswXSxcclxuXHRcdFx0c2l6ZSA9IGFyZ3YubGVuZ3RoO1xyXG5cclxuXHRcdGlmIChjbG9uZSB8fCB0eXBlT2YocmVzdWx0KSAhPT0gJ29iamVjdCcpXHJcblxyXG5cdFx0XHRyZXN1bHQgPSB7fTtcclxuXHJcblx0XHRmb3IgKHZhciBpbmRleD0wO2luZGV4PHNpemU7KytpbmRleCkge1xyXG5cclxuXHRcdFx0dmFyIGl0ZW0gPSBhcmd2W2luZGV4XSxcclxuXHJcblx0XHRcdFx0dHlwZSA9IHR5cGVPZihpdGVtKTtcclxuXHJcblx0XHRcdGlmICh0eXBlICE9PSAnb2JqZWN0JykgY29udGludWU7XHJcblxyXG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gaXRlbSkge1xyXG5cclxuXHRcdFx0XHR2YXIgc2l0ZW0gPSBjbG9uZSA/IFB1YmxpYy5jbG9uZShpdGVtW2tleV0pIDogaXRlbVtrZXldO1xyXG5cclxuXHRcdFx0XHRpZiAocmVjdXJzaXZlKSB7XHJcblxyXG5cdFx0XHRcdFx0cmVzdWx0W2tleV0gPSBtZXJnZV9yZWN1cnNpdmUocmVzdWx0W2tleV0sIHNpdGVtKTtcclxuXHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0XHRyZXN1bHRba2V5XSA9IHNpdGVtO1xyXG5cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHR5cGUgb2YgdmFyaWFibGVcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcmV0dXJuIHN0cmluZ1xyXG5cdCAqXHJcblx0ICogQHNlZSBodHRwOi8vanNwZXJmLmNvbS90eXBlb2Z2YXJcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gdHlwZU9mKGlucHV0KSB7XHJcblxyXG5cdFx0cmV0dXJuICh7fSkudG9TdHJpbmcuY2FsbChpbnB1dCkuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdH1cclxuXHJcblx0aWYgKGlzTm9kZSkge1xyXG5cclxuXHRcdG1vZHVsZS5leHBvcnRzID0gUHVibGljO1xyXG5cclxuXHR9IGVsc2Uge1xyXG5cclxuXHRcdHdpbmRvd1twdWJsaWNOYW1lXSA9IFB1YmxpYztcclxuXHJcblx0fVxyXG5cclxufSkodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpOyIsImltcG9ydCBfbWVyZ2UgZnJvbSAnbWVyZ2UnO1xuXG5cbi8qKlxuICogUmVjdXJzaXZlbHkgbWVyZ2Ugb2JqZWN0c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3RzIHRvIG1lcmdlXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBtZXJnZWQgb2JqZWN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2UoLi4ucGFyYW1zKSAge1xuICByZXR1cm4gX21lcmdlLnJlY3Vyc2l2ZSh0cnVlLCAuLi5wYXJhbXMpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHNraXBwZWQgcHJvcGVydGllc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIG9iamVjdCB0byBza2lwIHByb3BlcnRpZXMgZnJvbVxuICogQHBhcmFtIHtbU3RyaW5nXX0ga2V5cyBrZXlzIG9mIHRoZSBwcm9wZXJ0aWVzIHRvIHNraXBcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIG9iamVjdCB3aXRoIHRoZSBwcm9wZXJ0aWVzIHNraXBwZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNraXAob2JqLCBrZXlzKSB7XG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuICBPYmplY3Qua2V5cyhvYmopXG4gICAgLmZpbHRlcihrZXkgPT4gIWtleXMuaW5jbHVkZXMoa2V5KSlcbiAgICAuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICByZXN1bHRba2V5XSA9IG9ialtrZXldO1xuICAgIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG4iLCJjb25zdCBpZGVudGl0eSAgPSByZXNwb25zZSA9PiByZXNwb25zZTtcbmNvbnN0IHJlamVjdGlvbiA9IGVyciA9PiBQcm9taXNlLnJlamVjdChlcnIpO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pZGRsZXdhcmUge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9iZWZvcmUgID0gW107XG4gICAgdGhpcy5fYWZ0ZXIgICA9IFtdO1xuICAgIHRoaXMuX2ZpbmFsbHkgPSBbXTtcbiAgfVxuXG4gIGJlZm9yZShmbikge1xuICAgIHRoaXMuX2JlZm9yZS5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcy5fYmVmb3JlLmxlbmd0aCAtIDE7XG4gIH1cblxuICBhZnRlcihmdWxmaWxsID0gaWRlbnRpdHksIHJlamVjdCA9IHJlamVjdGlvbikge1xuICAgIHRoaXMuX2FmdGVyLnB1c2goeyBmdWxmaWxsLCByZWplY3QgfSk7XG4gICAgcmV0dXJuIHRoaXMuX2FmdGVyLmxlbmd0aCAtIDE7XG4gIH1cblxuICBmaW5hbGx5KGZuKSB7XG4gICAgdGhpcy5fZmluYWxseS5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcy5fZmluYWxseS5sZW5ndGggLSAxO1xuICB9XG5cbiAgcmVzb2x2ZUJlZm9yZShjb25maWcpIHtcbiAgICBjb25zdCBjaGFpbiA9IChwcm9taXNlLCB0YXNrKSA9PiBwcm9taXNlLnRoZW4odGFzayk7XG4gICAgcmV0dXJuIHRoaXMuX2JlZm9yZS5yZWR1Y2UoY2hhaW4sIFByb21pc2UucmVzb2x2ZShjb25maWcpKTtcbiAgfVxuXG4gIHJlc29sdmVBZnRlcihlcnIsIHJlc3BvbnNlKSB7XG4gICAgY29uc3QgY2hhaW4gICA9IChwcm9taXNlLCB0YXNrKSA9PiBwcm9taXNlLnRoZW4odGFzay5mdWxmaWxsLCB0YXNrLnJlamVjdCk7XG4gICAgY29uc3QgaW5pdGlhbCA9IGVyciA/IFByb21pc2UucmVqZWN0KGVycikgOiBQcm9taXNlLnJlc29sdmUocmVzcG9uc2UpO1xuICAgIHJldHVybiB0aGlzLl9hZnRlci5yZWR1Y2UoY2hhaW4sIGluaXRpYWwpO1xuICB9XG5cblxuICByZXNvbHZlRmluYWxseSgpIHtcbiAgICB0aGlzLl9maW5hbGx5LmZvckVhY2godGFzayA9PiB0YXNrKCkpO1xuICB9XG59XG4iLCJpbXBvcnQgeyBtZXJnZSwgc2tpcCB9IGZyb20gJy4vdXRpbHMnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbmZpZyB7XG4gIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgdGhpcy5fY29uZmlnICAgPSB7IGhlYWRlcnM6IHt9IH07XG5cbiAgICB0aGlzLnNldChjb25maWcpO1xuICB9XG5cbiAgbWVyZ2UoLi4uY29uZmlnUGFyYW1zKSB7XG4gICAgY29uc3QgcGFyYW1zID0gbWVyZ2UoLi4uY29uZmlnUGFyYW1zKTtcblxuICAgIGNvbnN0IGNvbmZpZyA9IG1lcmdlKFxuICAgICAgdGhpcy5za2lwTm90VXNlZE1ldGhvZHMocGFyYW1zLm1ldGhvZCksXG4gICAgICB0aGlzLl9jb25maWdbcGFyYW1zLm1ldGhvZF0sXG4gICAgICBwYXJhbXNcbiAgICApO1xuXG4gICAgaWYgKFxuICAgICAgdHlwZW9mIGNvbmZpZy5ib2R5ID09PSAnb2JqZWN0JyAmJlxuICAgICAgY29uZmlnLmhlYWRlcnMgJiZcbiAgICAgIGNvbmZpZy5oZWFkZXJzWydDb250ZW50LVR5cGUnXSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgKSB7XG4gICAgICBjb25maWcuYm9keSA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZy5ib2R5KTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIHNraXBOb3RVc2VkTWV0aG9kcyhjdXJyZW50TWV0aG9kKSB7XG4gICAgY29uc3Qgbm90VXNlZE1ldGhvZHMgPSBbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdwYXRjaCcsICdwb3N0JywgJ3B1dCddXG4gICAgICAuZmlsdGVyKG1ldGhvZCA9PiBjdXJyZW50TWV0aG9kICE9PSBtZXRob2QudG9Mb3dlckNhc2UoKSk7XG4gICAgcmV0dXJuIHNraXAodGhpcy5fY29uZmlnLCBub3RVc2VkTWV0aG9kcyk7XG4gIH1cblxuXG4gIHNldChjb25maWcpIHtcbiAgICB0aGlzLl9jb25maWcgPSBtZXJnZSh0aGlzLl9jb25maWcsIGNvbmZpZyk7XG4gIH1cblxuICBnZXQoKSB7XG4gICAgcmV0dXJuIG1lcmdlKHRoaXMuX2NvbmZpZyk7XG4gIH1cbn1cbiIsIi8qKlxuICogV3JhcCBhIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIHJlc3BvbnNlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHJlYWRlciB0eXBlIG9mIHJlYWRlciB0byB1c2Ugb24gcmVzcG9uc2UgYm9keVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZXMgdG8gdGhlIHdyYXBwZWQgcmVhZCByZXNwb25zZVxuICovXG5mdW5jdGlvbiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsIHJlYWRlcikge1xuICBjb25zdCByZXMgPSB7XG4gICAgaGVhZGVycyAgIDogcmVzcG9uc2UuaGVhZGVycyxcbiAgICBzdGF0dXMgICAgOiByZXNwb25zZS5zdGF0dXMsXG4gICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dFxuICB9O1xuXG4gIGlmIChyZWFkZXIgPT09ICdyYXcnKSB7XG4gICAgcmVzLmRhdGEgPSByZXNwb25zZS5ib2R5O1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2VbcmVhZGVyXSgpXG4gIC50aGVuKChkYXRhKSA9PiB7XG4gICAgcmVzLmRhdGEgPSBkYXRhO1xuICAgIHJldHVybiByZXM7XG4gIH0pO1xufVxuXG4vKipcbiAqIFJlYWRzIG9yIHJlamVjdHMgYSBmZXRjaCByZXNwb25zZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSByZXNwb25zZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSByZWFkZXIgdHlwZSBvZiByZWFkZXIgdG8gdXNlIG9uIHJlc3BvbnNlIGJvZHlcbiAqIEByZXR1cm4ge1Byb21pc2V9IHJlYWQgb3IgcmVqZWN0aW9uIHByb21pc2VcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlLCByZWFkZXIpIHtcbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIGNvbnN0IGVyciAgICAgICA9IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICBlcnIuc3RhdHVzICAgICAgPSByZXNwb25zZS5zdGF0dXM7XG4gICAgZXJyLnN0YXR1c1RleHQgID0gcmVzcG9uc2Uuc3RhdHVzVGV4dDtcbiAgICBlcnIuaGVhZGVycyAgICAgPSByZXNwb25zZS5oZWFkZXJzO1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICB9XG4gIGlmIChyZWFkZXIpIHtcbiAgICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCByZWFkZXIpO1xuICB9XG5cbiAgY29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gIGlmIChjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmNsdWRlcygnYXBwbGljYXRpb24vanNvbicpKSB7XG4gICAgcmV0dXJuIHdyYXBSZXNwb25zZShyZXNwb25zZSwgJ2pzb24nKTtcbiAgfVxuICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCAndGV4dCcpO1xufVxuIiwiaW1wb3J0ICd3aGF0d2ctZmV0Y2gnO1xuXG5pbXBvcnQgeyBmb3JtYXQgYXMgZm9ybWF0VXJsIH0gZnJvbSAnLi9oZWxwZXJzL3VybC1oYW5kbGVyJztcbmltcG9ydCB7IHNraXAsIG1lcmdlIH0gICAgICAgICBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBNaWRkbGV3YXJlICAgICAgICAgICAgICBmcm9tICcuL21pZGRsZXdhcmUnO1xuaW1wb3J0IENvbmZpZyAgICAgICAgICAgICAgICAgIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCByZXNwb25zZUhhbmRsZXIgICAgICAgICBmcm9tICcuL2hlbHBlcnMvcmVzcG9uc2UtaGFuZGxlcic7XG5cblxuY2xhc3MgVHJhZSB7XG4gIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgdGhpcy5fbWlkZGxld2FyZSA9IG5ldyBNaWRkbGV3YXJlKCk7XG4gICAgdGhpcy5fY29uZmlnICAgICA9IG5ldyBDb25maWcoc2tpcChjb25maWcsIFsnYmFzZVVybCddKSk7XG5cbiAgICB0aGlzLmJhc2VVcmwoY29uZmlnLmJhc2VVcmwgfHwgJycpO1xuICAgIHRoaXMuX2luaXRNZXRob2RzV2l0aEJvZHkoKTtcbiAgICB0aGlzLl9pbml0TWV0aG9kc1dpdGhOb0JvZHkoKTtcbiAgICB0aGlzLl9pbml0TWlkZGxld2FyZU1ldGhvZHMoKTtcbiAgfVxuXG4gIGNyZWF0ZShjb25maWcpIHtcbiAgICBjb25zdCBpbnN0YW5jZSA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG1lcmdlKHRoaXMuZGVmYXVsdHMoKSwgY29uZmlnKSk7XG4gICAgY29uc3QgbWFwQWZ0ZXIgPSAoeyBmdWxmaWxsLCByZWplY3QgfSkgPT4gaW5zdGFuY2UuYWZ0ZXIoZnVsZmlsbCwgcmVqZWN0KTtcbiAgICB0aGlzLl9taWRkbGV3YXJlLl9iZWZvcmUuZm9yRWFjaChpbnN0YW5jZS5iZWZvcmUpO1xuICAgIHRoaXMuX21pZGRsZXdhcmUuX2FmdGVyLmZvckVhY2gobWFwQWZ0ZXIpO1xuICAgIHRoaXMuX21pZGRsZXdhcmUuX2ZpbmFsbHkuZm9yRWFjaChpbnN0YW5jZS5maW5hbGx5KTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH1cblxuICBkZWZhdWx0cyhjb25maWcpIHtcbiAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRzID0gdGhpcy5fY29uZmlnLmdldCgpO1xuICAgICAgdGhpcy5iYXNlVXJsKCkgJiYgKGRlZmF1bHRzLmJhc2VVcmwgPSB0aGlzLmJhc2VVcmwoKSk7XG4gICAgICByZXR1cm4gZGVmYXVsdHM7XG4gICAgfVxuICAgIHRoaXMuX2NvbmZpZy5zZXQoc2tpcChjb25maWcsIFsnYmFzZVVybCddKSk7XG4gICAgY29uZmlnLmJhc2VVcmwgJiYgdGhpcy5iYXNlVXJsKGNvbmZpZy5iYXNlVXJsKTtcbiAgICByZXR1cm4gdGhpcy5fY29uZmlnLmdldCgpO1xuICB9XG5cbiAgYmFzZVVybChiYXNlVXJsKSB7XG4gICAgaWYgKHR5cGVvZiBiYXNlVXJsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIHRoaXMuX2Jhc2VVcmw7XG4gICAgfVxuICAgIHRoaXMuX2Jhc2VVcmwgPSBiYXNlVXJsO1xuICAgIHJldHVybiB0aGlzLl9iYXNlVXJsO1xuICB9XG5cbiAgcmVxdWVzdChjb25maWcgPSB7fSkge1xuICAgIGNvbmZpZy5tZXRob2QgfHwgKGNvbmZpZy5tZXRob2QgPSAnZ2V0Jyk7XG4gICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlKGNvbmZpZyk7XG4gICAgY29uc3QgdXJsICAgICAgICAgID0gZm9ybWF0VXJsKHRoaXMuX2Jhc2VVcmwsIGNvbmZpZy51cmwsIGNvbmZpZy5wYXJhbXMpO1xuXG4gICAgcmV0dXJuIHRoaXMuX2ZldGNoKHVybCwgbWVyZ2VkQ29uZmlnKTtcbiAgfVxuXG4gIF9mZXRjaCh1cmwsIGNvbmZpZykge1xuICAgIHJldHVybiB0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVCZWZvcmUoY29uZmlnKVxuICAgIC50aGVuKGNvbmZpZyA9PiBmZXRjaCh1cmwsIGNvbmZpZykpXG4gICAgLnRoZW4ocmVzID0+IHJlc3BvbnNlSGFuZGxlcihyZXMsIGNvbmZpZy5ib2R5VHlwZSkpXG4gICAgLnRoZW4oXG4gICAgICByZXMgPT4gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlQWZ0ZXIodW5kZWZpbmVkLCByZXMpLFxuICAgICAgZXJyID0+IHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUFmdGVyKGVycilcbiAgICApXG4gICAgLnRoZW4oXG4gICAgICByZXMgPT4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUZpbmFsbHkoKSkudGhlbigoKSA9PiByZXMpLFxuICAgICAgZXJyID0+IFByb21pc2UucmVzb2x2ZSh0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVGaW5hbGx5KCkpLnRoZW4oKCkgPT4geyB0aHJvdyBlcnI7IH0pXG4gICAgKTtcbiAgfVxuXG4gIF9pbml0TWV0aG9kc1dpdGhOb0JvZHkoKSB7XG4gICAgWydnZXQnLCAnZGVsZXRlJywgJ2hlYWQnXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIHRoaXNbbWV0aG9kXSA9IChwYXRoLCBjb25maWcgPSB7fSkgPT4ge1xuICAgICAgICBjb25zdCBtZXJnZWRDb25maWcgPSB0aGlzLl9jb25maWcubWVyZ2UoY29uZmlnLCB7IG1ldGhvZCB9KTtcbiAgICAgICAgY29uc3QgdXJsICAgICAgICAgID0gZm9ybWF0VXJsKHRoaXMuX2Jhc2VVcmwsIHBhdGgsIGNvbmZpZy5wYXJhbXMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9mZXRjaCh1cmwsIG1lcmdlZENvbmZpZyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgX2luaXRNZXRob2RzV2l0aEJvZHkoKSB7XG4gICAgY29uc3QgZGVmYXVsdENvbmYgPSB7IGhlYWRlcnM6IHsgJ0NvbnRldC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0gfTtcblxuICAgIFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIHRoaXMuX2NvbmZpZy5zZXQoeyBbbWV0aG9kXTogZGVmYXVsdENvbmYgfSk7XG5cbiAgICAgIHRoaXNbbWV0aG9kXSA9IChwYXRoLCBib2R5LCBjb25maWcpID0+IHtcbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlKGNvbmZpZywgeyBib2R5LCBtZXRob2QgfSk7XG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdFVybCh0aGlzLl9iYXNlVXJsLCBwYXRoKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIF9pbml0TWlkZGxld2FyZU1ldGhvZHMoKSB7XG4gICAgWydiZWZvcmUnLCAnYWZ0ZXInLCAnZmluYWxseSddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgdGhpc1ttZXRob2RdID0gKC4uLmFyZ3MpID0+IHRoaXMuX21pZGRsZXdhcmVbbWV0aG9kXSguLi5hcmdzKTtcbiAgICB9KTtcbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBUcmFlKCk7XG4iXSwibmFtZXMiOlsic2VsZiIsImZldGNoIiwic3VwcG9ydCIsIlN5bWJvbCIsIkJsb2IiLCJlIiwiYXJyYXlCdWZmZXIiLCJ2aWV3Q2xhc3NlcyIsImlzRGF0YVZpZXciLCJvYmoiLCJEYXRhVmlldyIsInByb3RvdHlwZSIsImlzUHJvdG90eXBlT2YiLCJpc0FycmF5QnVmZmVyVmlldyIsIkFycmF5QnVmZmVyIiwiaXNWaWV3IiwiaW5kZXhPZiIsIk9iamVjdCIsInRvU3RyaW5nIiwiY2FsbCIsIm5vcm1hbGl6ZU5hbWUiLCJuYW1lIiwiU3RyaW5nIiwidGVzdCIsIlR5cGVFcnJvciIsInRvTG93ZXJDYXNlIiwibm9ybWFsaXplVmFsdWUiLCJ2YWx1ZSIsIml0ZXJhdG9yRm9yIiwiaXRlbXMiLCJpdGVyYXRvciIsInNoaWZ0IiwiZG9uZSIsInVuZGVmaW5lZCIsIml0ZXJhYmxlIiwiSGVhZGVycyIsImhlYWRlcnMiLCJtYXAiLCJmb3JFYWNoIiwiYXBwZW5kIiwiZ2V0T3duUHJvcGVydHlOYW1lcyIsIm9sZFZhbHVlIiwiZ2V0IiwiaGFzIiwiaGFzT3duUHJvcGVydHkiLCJzZXQiLCJjYWxsYmFjayIsInRoaXNBcmciLCJrZXlzIiwicHVzaCIsInZhbHVlcyIsImVudHJpZXMiLCJjb25zdW1lZCIsImJvZHkiLCJib2R5VXNlZCIsIlByb21pc2UiLCJyZWplY3QiLCJmaWxlUmVhZGVyUmVhZHkiLCJyZWFkZXIiLCJyZXNvbHZlIiwib25sb2FkIiwicmVzdWx0Iiwib25lcnJvciIsImVycm9yIiwicmVhZEJsb2JBc0FycmF5QnVmZmVyIiwiYmxvYiIsIkZpbGVSZWFkZXIiLCJwcm9taXNlIiwicmVhZEFzQXJyYXlCdWZmZXIiLCJyZWFkQmxvYkFzVGV4dCIsInJlYWRBc1RleHQiLCJyZWFkQXJyYXlCdWZmZXJBc1RleHQiLCJidWYiLCJ2aWV3IiwiVWludDhBcnJheSIsImNoYXJzIiwiQXJyYXkiLCJsZW5ndGgiLCJpIiwiZnJvbUNoYXJDb2RlIiwiam9pbiIsImJ1ZmZlckNsb25lIiwic2xpY2UiLCJieXRlTGVuZ3RoIiwiYnVmZmVyIiwiQm9keSIsIl9pbml0Qm9keSIsIl9ib2R5SW5pdCIsIl9ib2R5VGV4dCIsIl9ib2R5QmxvYiIsImZvcm1EYXRhIiwiRm9ybURhdGEiLCJfYm9keUZvcm1EYXRhIiwic2VhcmNoUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiX2JvZHlBcnJheUJ1ZmZlciIsIkVycm9yIiwidHlwZSIsInJlamVjdGVkIiwidGhlbiIsInRleHQiLCJkZWNvZGUiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwibWV0aG9kcyIsIm5vcm1hbGl6ZU1ldGhvZCIsIm1ldGhvZCIsInVwY2FzZWQiLCJ0b1VwcGVyQ2FzZSIsIlJlcXVlc3QiLCJpbnB1dCIsIm9wdGlvbnMiLCJ1cmwiLCJjcmVkZW50aWFscyIsIm1vZGUiLCJyZWZlcnJlciIsImNsb25lIiwiZm9ybSIsInRyaW0iLCJzcGxpdCIsImJ5dGVzIiwicmVwbGFjZSIsImRlY29kZVVSSUNvbXBvbmVudCIsInBhcnNlSGVhZGVycyIsInJhd0hlYWRlcnMiLCJsaW5lIiwicGFydHMiLCJrZXkiLCJSZXNwb25zZSIsImJvZHlJbml0Iiwic3RhdHVzIiwib2siLCJzdGF0dXNUZXh0IiwicmVzcG9uc2UiLCJyZWRpcmVjdFN0YXR1c2VzIiwicmVkaXJlY3QiLCJSYW5nZUVycm9yIiwibG9jYXRpb24iLCJpbml0IiwicmVxdWVzdCIsInhociIsIlhNTEh0dHBSZXF1ZXN0IiwiZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIiwicmVzcG9uc2VVUkwiLCJyZXNwb25zZVRleHQiLCJvbnRpbWVvdXQiLCJvcGVuIiwid2l0aENyZWRlbnRpYWxzIiwicmVzcG9uc2VUeXBlIiwic2V0UmVxdWVzdEhlYWRlciIsInNlbmQiLCJwb2x5ZmlsbCIsInRoaXMiLCJoZXhUYWJsZSIsImFycmF5Iiwic291cmNlIiwicGxhaW5PYmplY3RzIiwiY3JlYXRlIiwidGFyZ2V0IiwiaXNBcnJheSIsImNvbmNhdCIsIm1lcmdlVGFyZ2V0IiwiZXhwb3J0cyIsImFycmF5VG9PYmplY3QiLCJpdGVtIiwiYmFiZWxIZWxwZXJzLnR5cGVvZiIsIm1lcmdlIiwicmVkdWNlIiwiYWNjIiwic3RyIiwic3RyaW5nIiwib3V0IiwiYyIsImNoYXJDb2RlQXQiLCJjaGFyQXQiLCJyZWZlcmVuY2VzIiwicmVmcyIsImxvb2t1cCIsImNvbXBhY3RlZCIsImNvbXBhY3QiLCJjb25zdHJ1Y3RvciIsImlzQnVmZmVyIiwicGVyY2VudFR3ZW50aWVzIiwidXRpbHMiLCJyZXF1aXJlJCQwIiwiZm9ybWF0cyIsInJlcXVpcmUkJDEiLCJhcnJheVByZWZpeEdlbmVyYXRvcnMiLCJicmFja2V0cyIsInByZWZpeCIsImluZGljZXMiLCJyZXBlYXQiLCJ0b0lTTyIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImRlZmF1bHRzIiwiZW5jb2RlIiwic2VyaWFsaXplRGF0ZSIsImRhdGUiLCJzdHJpbmdpZnkiLCJvYmplY3QiLCJnZW5lcmF0ZUFycmF5UHJlZml4Iiwic3RyaWN0TnVsbEhhbmRsaW5nIiwic2tpcE51bGxzIiwiZW5jb2RlciIsImZpbHRlciIsInNvcnQiLCJhbGxvd0RvdHMiLCJmb3JtYXR0ZXIiLCJvYmpLZXlzIiwib3B0cyIsImRlbGltaXRlciIsImZvcm1hdCIsImRlZmF1bHQiLCJmb3JtYXR0ZXJzIiwiYXJyYXlGb3JtYXQiLCJwYXJzZVZhbHVlcyIsInBhcmFtZXRlckxpbWl0IiwiSW5maW5pdHkiLCJwYXJ0IiwicG9zIiwidmFsIiwiZGVjb2RlciIsInBhcnNlT2JqZWN0IiwiY2hhaW4iLCJyb290IiwiY2xlYW5Sb290IiwiaW5kZXgiLCJwYXJzZUludCIsImlzTmFOIiwicGFyc2VBcnJheXMiLCJhcnJheUxpbWl0IiwicGFyc2VLZXlzIiwiZ2l2ZW5LZXkiLCJwYXJlbnQiLCJjaGlsZCIsInNlZ21lbnQiLCJleGVjIiwiYWxsb3dQcm90b3R5cGVzIiwiZGVwdGgiLCJpc1JlZ0V4cCIsInRlbXBPYmoiLCJuZXdPYmoiLCJyZXF1aXJlJCQyIiwiY29uY2F0UGFyYW1zIiwiVVJMIiwicGFyYW1zIiwic3RyaW5naWZ5UGFyYW1zIiwiY29tYmluZSIsImJhc2VVUkwiLCJyZWxhdGl2ZVVSTCIsImlzQWJzb2x1dGUiLCJiYXNlVXJsIiwiaXNOb2RlIiwiUHVibGljIiwiYXJndW1lbnRzIiwicHVibGljTmFtZSIsInJlY3Vyc2l2ZSIsIm91dHB1dCIsInR5cGVPZiIsInNpemUiLCJtZXJnZV9yZWN1cnNpdmUiLCJiYXNlIiwiZXh0ZW5kIiwiYXJndiIsInNpdGVtIiwibW9kdWxlIiwiX21lcmdlIiwic2tpcCIsImluY2x1ZGVzIiwiaWRlbnRpdHkiLCJyZWplY3Rpb24iLCJlcnIiLCJNaWRkbGV3YXJlIiwiX2JlZm9yZSIsIl9hZnRlciIsIl9maW5hbGx5IiwiZm4iLCJmdWxmaWxsIiwiY29uZmlnIiwidGFzayIsImluaXRpYWwiLCJDb25maWciLCJfY29uZmlnIiwic2tpcE5vdFVzZWRNZXRob2RzIiwiY3VycmVudE1ldGhvZCIsIm5vdFVzZWRNZXRob2RzIiwid3JhcFJlc3BvbnNlIiwicmVzIiwiZGF0YSIsInJlc3BvbnNlSGFuZGxlciIsImNvbnRlbnRUeXBlIiwiVHJhZSIsIl9taWRkbGV3YXJlIiwiX2luaXRNZXRob2RzV2l0aEJvZHkiLCJfaW5pdE1ldGhvZHNXaXRoTm9Cb2R5IiwiX2luaXRNaWRkbGV3YXJlTWV0aG9kcyIsImluc3RhbmNlIiwibWFwQWZ0ZXIiLCJhZnRlciIsImJlZm9yZSIsImZpbmFsbHkiLCJfYmFzZVVybCIsIm1lcmdlZENvbmZpZyIsImZvcm1hdFVybCIsIl9mZXRjaCIsInJlc29sdmVCZWZvcmUiLCJib2R5VHlwZSIsInJlc29sdmVBZnRlciIsInJlc29sdmVGaW5hbGx5IiwicGF0aCIsImRlZmF1bHRDb25mIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxDQUFDLFVBQVNBLElBQVQsRUFBZTs7O01BR1ZBLEtBQUtDLEtBQVQsRUFBZ0I7Ozs7TUFJWkMsVUFBVTtrQkFDRSxxQkFBcUJGLElBRHZCO2NBRUYsWUFBWUEsSUFBWixJQUFvQixjQUFjRyxNQUZoQztVQUdOLGdCQUFnQkgsSUFBaEIsSUFBd0IsVUFBVUEsSUFBbEMsSUFBMkMsWUFBVztVQUN0RDtZQUNFSSxJQUFKO2VBQ08sSUFBUDtPQUZGLENBR0UsT0FBTUMsQ0FBTixFQUFTO2VBQ0YsS0FBUDs7S0FMNEMsRUFIcEM7Y0FXRixjQUFjTCxJQVhaO2lCQVlDLGlCQUFpQkE7R0FaaEM7O01BZUlFLFFBQVFJLFdBQVosRUFBeUI7UUFDbkJDLGNBQWMsQ0FDaEIsb0JBRGdCLEVBRWhCLHFCQUZnQixFQUdoQiw0QkFIZ0IsRUFJaEIscUJBSmdCLEVBS2hCLHNCQUxnQixFQU1o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
