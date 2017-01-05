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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL3V0aWxzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi9mb3JtYXRzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi9zdHJpbmdpZnkuanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL3BhcnNlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi9pbmRleC5qcyIsIi4uL2xpYi9oZWxwZXJzL3VybC1oYW5kbGVyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL21lcmdlL21lcmdlLmpzIiwiLi4vbGliL3V0aWxzLmpzIiwiLi4vbGliL21pZGRsZXdhcmUuanMiLCIuLi9saWIvY29uZmlnLmpzIiwiLi4vbGliL2hlbHBlcnMvcmVzcG9uc2UtaGFuZGxlci5qcyIsIi4uL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG5cbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLm1hcFtuYW1lXVxuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSsnLCcrdmFsdWUgOiB2YWx1ZVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHRoaXMubWFwKSB7XG4gICAgICBpZiAodGhpcy5tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLm1hcFtuYW1lXSwgbmFtZSwgdGhpcylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChuYW1lKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IGl0ZW1zLnB1c2godmFsdWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2goW25hbWUsIHZhbHVlXSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgdmFyIGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpXG4gICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKVxuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpXG4gICAgICAgIC8vIElFIDEwLTExIGNhbid0IGhhbmRsZSBhIERhdGFWaWV3IGJvZHkuXG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gbmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSkpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZWFkQXJyYXlCdWZmZXJBc1RleHQodGhpcy5fYm9keUFycmF5QnVmZmVyKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG5cbiAgICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy51cmwgPSBpbnB1dFxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5ICYmIGlucHV0Ll9ib2R5SW5pdCAhPSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgdGhpcy5jcmVkZW50aWFscyB8fCAnb21pdCdcbiAgICBpZiAob3B0aW9ucy5oZWFkZXJzIHx8ICF0aGlzLmhlYWRlcnMpIHtcbiAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB9XG4gICAgdGhpcy5tZXRob2QgPSBub3JtYWxpemVNZXRob2Qob3B0aW9ucy5tZXRob2QgfHwgdGhpcy5tZXRob2QgfHwgJ0dFVCcpXG4gICAgdGhpcy5tb2RlID0gb3B0aW9ucy5tb2RlIHx8IHRoaXMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIGJvZHkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvZHkgbm90IGFsbG93ZWQgZm9yIEdFVCBvciBIRUFEIHJlcXVlc3RzJylcbiAgICB9XG4gICAgdGhpcy5faW5pdEJvZHkoYm9keSlcbiAgfVxuXG4gIFJlcXVlc3QucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF1ZXN0KHRoaXMsIHsgYm9keTogdGhpcy5fYm9keUluaXQgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VIZWFkZXJzKHJhd0hlYWRlcnMpIHtcbiAgICB2YXIgaGVhZGVycyA9IG5ldyBIZWFkZXJzKClcbiAgICByYXdIZWFkZXJzLnNwbGl0KCdcXHJcXG4nKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnRzLmpvaW4oJzonKS50cmltKClcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBoZWFkZXJzXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMuc3RhdHVzID0gJ3N0YXR1cycgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzIDogMjAwXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9ICdzdGF0dXNUZXh0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXNUZXh0IDogJ09LJ1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIFJlc3BvbnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UodGhpcy5fYm9keUluaXQsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiB0aGlzLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBuZXcgSGVhZGVycyh0aGlzLmhlYWRlcnMpLFxuICAgICAgdXJsOiB0aGlzLnVybFxuICAgIH0pXG4gIH1cblxuICBSZXNwb25zZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiAwLCBzdGF0dXNUZXh0OiAnJ30pXG4gICAgcmVzcG9uc2UudHlwZSA9ICdlcnJvcidcbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfVxuXG4gIHZhciByZWRpcmVjdFN0YXR1c2VzID0gWzMwMSwgMzAyLCAzMDMsIDMwNywgMzA4XVxuXG4gIFJlc3BvbnNlLnJlZGlyZWN0ID0gZnVuY3Rpb24odXJsLCBzdGF0dXMpIHtcbiAgICBpZiAocmVkaXJlY3RTdGF0dXNlcy5pbmRleE9mKHN0YXR1cykgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBzdGF0dXMgY29kZScpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiBzdGF0dXMsIGhlYWRlcnM6IHtsb2NhdGlvbjogdXJsfX0pXG4gIH1cblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzXG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3RcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlXG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChpbnB1dCwgaW5pdClcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBwYXJzZUhlYWRlcnMoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKVxuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMudXJsID0gJ3Jlc3BvbnNlVVJMJyBpbiB4aHIgPyB4aHIucmVzcG9uc2VVUkwgOiBvcHRpb25zLmhlYWRlcnMuZ2V0KCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbnZhciBoZXhUYWJsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFycmF5ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICAgICAgICBhcnJheS5wdXNoKCclJyArICgoaSA8IDE2ID8gJzAnIDogJycpICsgaS50b1N0cmluZygxNikpLnRvVXBwZXJDYXNlKCkpO1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheTtcbn0oKSk7XG5cbmV4cG9ydHMuYXJyYXlUb09iamVjdCA9IGZ1bmN0aW9uIChzb3VyY2UsIG9wdGlvbnMpIHtcbiAgICB2YXIgb2JqID0gb3B0aW9ucyAmJiBvcHRpb25zLnBsYWluT2JqZWN0cyA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNvdXJjZS5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVtpXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG9ialtpXSA9IHNvdXJjZVtpXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59O1xuXG5leHBvcnRzLm1lcmdlID0gZnVuY3Rpb24gKHRhcmdldCwgc291cmNlLCBvcHRpb25zKSB7XG4gICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHNvdXJjZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICAgICAgdGFyZ2V0LnB1c2goc291cmNlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdGFyZ2V0W3NvdXJjZV0gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFt0YXJnZXQsIHNvdXJjZV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gW3RhcmdldF0uY29uY2F0KHNvdXJjZSk7XG4gICAgfVxuXG4gICAgdmFyIG1lcmdlVGFyZ2V0ID0gdGFyZ2V0O1xuICAgIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkgJiYgIUFycmF5LmlzQXJyYXkoc291cmNlKSkge1xuICAgICAgICBtZXJnZVRhcmdldCA9IGV4cG9ydHMuYXJyYXlUb09iamVjdCh0YXJnZXQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkgJiYgQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICAgIHNvdXJjZS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpKSB7XG4gICAgICAgICAgICBpZiAoaGFzLmNhbGwodGFyZ2V0LCBpKSkge1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRbaV0gJiYgdHlwZW9mIHRhcmdldFtpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2ldID0gZXhwb3J0cy5tZXJnZSh0YXJnZXRbaV0sIGl0ZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2ldID0gaXRlbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNvdXJjZSkucmVkdWNlKGZ1bmN0aW9uIChhY2MsIGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBzb3VyY2Vba2V5XTtcblxuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFjYywga2V5KSkge1xuICAgICAgICAgICAgYWNjW2tleV0gPSBleHBvcnRzLm1lcmdlKGFjY1trZXldLCB2YWx1ZSwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhY2Nba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgfSwgbWVyZ2VUYXJnZXQpO1xufTtcblxuZXhwb3J0cy5kZWNvZGUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIucmVwbGFjZSgvXFwrL2csICcgJykpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG59O1xuXG5leHBvcnRzLmVuY29kZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAvLyBUaGlzIGNvZGUgd2FzIG9yaWdpbmFsbHkgd3JpdHRlbiBieSBCcmlhbiBXaGl0ZSAobXNjZGV4KSBmb3IgdGhlIGlvLmpzIGNvcmUgcXVlcnlzdHJpbmcgbGlicmFyeS5cbiAgICAvLyBJdCBoYXMgYmVlbiBhZGFwdGVkIGhlcmUgZm9yIHN0cmljdGVyIGFkaGVyZW5jZSB0byBSRkMgMzk4NlxuICAgIGlmIChzdHIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuXG4gICAgdmFyIHN0cmluZyA9IHR5cGVvZiBzdHIgPT09ICdzdHJpbmcnID8gc3RyIDogU3RyaW5nKHN0cik7XG5cbiAgICB2YXIgb3V0ID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGMgPSBzdHJpbmcuY2hhckNvZGVBdChpKTtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgICBjID09PSAweDJEIHx8IC8vIC1cbiAgICAgICAgICAgIGMgPT09IDB4MkUgfHwgLy8gLlxuICAgICAgICAgICAgYyA9PT0gMHg1RiB8fCAvLyBfXG4gICAgICAgICAgICBjID09PSAweDdFIHx8IC8vIH5cbiAgICAgICAgICAgIChjID49IDB4MzAgJiYgYyA8PSAweDM5KSB8fCAvLyAwLTlcbiAgICAgICAgICAgIChjID49IDB4NDEgJiYgYyA8PSAweDVBKSB8fCAvLyBhLXpcbiAgICAgICAgICAgIChjID49IDB4NjEgJiYgYyA8PSAweDdBKSAvLyBBLVpcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBvdXQgKz0gc3RyaW5nLmNoYXJBdChpKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweDgwKSB7XG4gICAgICAgICAgICBvdXQgPSBvdXQgKyBoZXhUYWJsZVtjXTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweDgwMCkge1xuICAgICAgICAgICAgb3V0ID0gb3V0ICsgKGhleFRhYmxlWzB4QzAgfCAoYyA+PiA2KV0gKyBoZXhUYWJsZVsweDgwIHwgKGMgJiAweDNGKV0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYyA8IDB4RDgwMCB8fCBjID49IDB4RTAwMCkge1xuICAgICAgICAgICAgb3V0ID0gb3V0ICsgKGhleFRhYmxlWzB4RTAgfCAoYyA+PiAxMildICsgaGV4VGFibGVbMHg4MCB8ICgoYyA+PiA2KSAmIDB4M0YpXSArIGhleFRhYmxlWzB4ODAgfCAoYyAmIDB4M0YpXSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGkgKz0gMTtcbiAgICAgICAgYyA9IDB4MTAwMDAgKyAoKChjICYgMHgzRkYpIDw8IDEwKSB8IChzdHJpbmcuY2hhckNvZGVBdChpKSAmIDB4M0ZGKSk7XG4gICAgICAgIG91dCArPSBoZXhUYWJsZVsweEYwIHwgKGMgPj4gMTgpXSArIGhleFRhYmxlWzB4ODAgfCAoKGMgPj4gMTIpICYgMHgzRildICsgaGV4VGFibGVbMHg4MCB8ICgoYyA+PiA2KSAmIDB4M0YpXSArIGhleFRhYmxlWzB4ODAgfCAoYyAmIDB4M0YpXTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xufTtcblxuZXhwb3J0cy5jb21wYWN0ID0gZnVuY3Rpb24gKG9iaiwgcmVmZXJlbmNlcykge1xuICAgIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICB2YXIgcmVmcyA9IHJlZmVyZW5jZXMgfHwgW107XG4gICAgdmFyIGxvb2t1cCA9IHJlZnMuaW5kZXhPZihvYmopO1xuICAgIGlmIChsb29rdXAgIT09IC0xKSB7XG4gICAgICAgIHJldHVybiByZWZzW2xvb2t1cF07XG4gICAgfVxuXG4gICAgcmVmcy5wdXNoKG9iaik7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICAgIHZhciBjb21wYWN0ZWQgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKG9ialtpXSAmJiB0eXBlb2Ygb2JqW2ldID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbXBhY3RlZC5wdXNoKGV4cG9ydHMuY29tcGFjdChvYmpbaV0sIHJlZnMpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG9ialtpXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb21wYWN0ZWQucHVzaChvYmpbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbXBhY3RlZDtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgb2JqW2tleV0gPSBleHBvcnRzLmNvbXBhY3Qob2JqW2tleV0sIHJlZnMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbmV4cG9ydHMuaXNSZWdFeHAgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBSZWdFeHBdJztcbn07XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgaWYgKG9iaiA9PT0gbnVsbCB8fCB0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuICEhKG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iaikpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlcGxhY2UgPSBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2U7XG52YXIgcGVyY2VudFR3ZW50aWVzID0gLyUyMC9nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAnZGVmYXVsdCc6ICdSRkMzOTg2JyxcbiAgICBmb3JtYXR0ZXJzOiB7XG4gICAgICAgIFJGQzE3Mzg6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2UuY2FsbCh2YWx1ZSwgcGVyY2VudFR3ZW50aWVzLCAnKycpO1xuICAgICAgICB9LFxuICAgICAgICBSRkMzOTg2OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgUkZDMTczODogJ1JGQzE3MzgnLFxuICAgIFJGQzM5ODY6ICdSRkMzOTg2J1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGZvcm1hdHMgPSByZXF1aXJlKCcuL2Zvcm1hdHMnKTtcblxudmFyIGFycmF5UHJlZml4R2VuZXJhdG9ycyA9IHtcbiAgICBicmFja2V0czogZnVuY3Rpb24gYnJhY2tldHMocHJlZml4KSB7XG4gICAgICAgIHJldHVybiBwcmVmaXggKyAnW10nO1xuICAgIH0sXG4gICAgaW5kaWNlczogZnVuY3Rpb24gaW5kaWNlcyhwcmVmaXgsIGtleSkge1xuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ1snICsga2V5ICsgJ10nO1xuICAgIH0sXG4gICAgcmVwZWF0OiBmdW5jdGlvbiByZXBlYXQocHJlZml4KSB7XG4gICAgICAgIHJldHVybiBwcmVmaXg7XG4gICAgfVxufTtcblxudmFyIHRvSVNPID0gRGF0ZS5wcm90b3R5cGUudG9JU09TdHJpbmc7XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgICBkZWxpbWl0ZXI6ICcmJyxcbiAgICBlbmNvZGU6IHRydWUsXG4gICAgZW5jb2RlcjogdXRpbHMuZW5jb2RlLFxuICAgIHNlcmlhbGl6ZURhdGU6IGZ1bmN0aW9uIHNlcmlhbGl6ZURhdGUoZGF0ZSkge1xuICAgICAgICByZXR1cm4gdG9JU08uY2FsbChkYXRlKTtcbiAgICB9LFxuICAgIHNraXBOdWxsczogZmFsc2UsXG4gICAgc3RyaWN0TnVsbEhhbmRsaW5nOiBmYWxzZVxufTtcblxudmFyIHN0cmluZ2lmeSA9IGZ1bmN0aW9uIHN0cmluZ2lmeShvYmplY3QsIHByZWZpeCwgZ2VuZXJhdGVBcnJheVByZWZpeCwgc3RyaWN0TnVsbEhhbmRsaW5nLCBza2lwTnVsbHMsIGVuY29kZXIsIGZpbHRlciwgc29ydCwgYWxsb3dEb3RzLCBzZXJpYWxpemVEYXRlLCBmb3JtYXR0ZXIpIHtcbiAgICB2YXIgb2JqID0gb2JqZWN0O1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9iaiA9IGZpbHRlcihwcmVmaXgsIG9iaik7XG4gICAgfSBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgIG9iaiA9IHNlcmlhbGl6ZURhdGUob2JqKTtcbiAgICB9IGVsc2UgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgICAgICBpZiAoc3RyaWN0TnVsbEhhbmRsaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlciA/IGVuY29kZXIocHJlZml4KSA6IHByZWZpeDtcbiAgICAgICAgfVxuXG4gICAgICAgIG9iaiA9ICcnO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJyB8fCB0eXBlb2Ygb2JqID09PSAnbnVtYmVyJyB8fCB0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicgfHwgdXRpbHMuaXNCdWZmZXIob2JqKSkge1xuICAgICAgICBpZiAoZW5jb2Rlcikge1xuICAgICAgICAgICAgcmV0dXJuIFtmb3JtYXR0ZXIoZW5jb2RlcihwcmVmaXgpKSArICc9JyArIGZvcm1hdHRlcihlbmNvZGVyKG9iaikpXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW2Zvcm1hdHRlcihwcmVmaXgpICsgJz0nICsgZm9ybWF0dGVyKFN0cmluZyhvYmopKV07XG4gICAgfVxuXG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuXG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfVxuXG4gICAgdmFyIG9iaktleXM7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmlsdGVyKSkge1xuICAgICAgICBvYmpLZXlzID0gZmlsdGVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgb2JqS2V5cyA9IHNvcnQgPyBrZXlzLnNvcnQoc29ydCkgOiBrZXlzO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqS2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIga2V5ID0gb2JqS2V5c1tpXTtcblxuICAgICAgICBpZiAoc2tpcE51bGxzICYmIG9ialtrZXldID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHZhbHVlcy5jb25jYXQoc3RyaW5naWZ5KFxuICAgICAgICAgICAgICAgIG9ialtrZXldLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQXJyYXlQcmVmaXgocHJlZml4LCBrZXkpLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQXJyYXlQcmVmaXgsXG4gICAgICAgICAgICAgICAgc3RyaWN0TnVsbEhhbmRsaW5nLFxuICAgICAgICAgICAgICAgIHNraXBOdWxscyxcbiAgICAgICAgICAgICAgICBlbmNvZGVyLFxuICAgICAgICAgICAgICAgIGZpbHRlcixcbiAgICAgICAgICAgICAgICBzb3J0LFxuICAgICAgICAgICAgICAgIGFsbG93RG90cyxcbiAgICAgICAgICAgICAgICBzZXJpYWxpemVEYXRlLFxuICAgICAgICAgICAgICAgIGZvcm1hdHRlclxuICAgICAgICAgICAgKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSB2YWx1ZXMuY29uY2F0KHN0cmluZ2lmeShcbiAgICAgICAgICAgICAgICBvYmpba2V5XSxcbiAgICAgICAgICAgICAgICBwcmVmaXggKyAoYWxsb3dEb3RzID8gJy4nICsga2V5IDogJ1snICsga2V5ICsgJ10nKSxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUFycmF5UHJlZml4LFxuICAgICAgICAgICAgICAgIHN0cmljdE51bGxIYW5kbGluZyxcbiAgICAgICAgICAgICAgICBza2lwTnVsbHMsXG4gICAgICAgICAgICAgICAgZW5jb2RlcixcbiAgICAgICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICAgICAgc29ydCxcbiAgICAgICAgICAgICAgICBhbGxvd0RvdHMsXG4gICAgICAgICAgICAgICAgc2VyaWFsaXplRGF0ZSxcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZXJcbiAgICAgICAgICAgICkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iamVjdCwgb3B0cykge1xuICAgIHZhciBvYmogPSBvYmplY3Q7XG4gICAgdmFyIG9wdGlvbnMgPSBvcHRzIHx8IHt9O1xuICAgIHZhciBkZWxpbWl0ZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWxpbWl0ZXIgPT09ICd1bmRlZmluZWQnID8gZGVmYXVsdHMuZGVsaW1pdGVyIDogb3B0aW9ucy5kZWxpbWl0ZXI7XG4gICAgdmFyIHN0cmljdE51bGxIYW5kbGluZyA9IHR5cGVvZiBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgOiBkZWZhdWx0cy5zdHJpY3ROdWxsSGFuZGxpbmc7XG4gICAgdmFyIHNraXBOdWxscyA9IHR5cGVvZiBvcHRpb25zLnNraXBOdWxscyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5za2lwTnVsbHMgOiBkZWZhdWx0cy5za2lwTnVsbHM7XG4gICAgdmFyIGVuY29kZSA9IHR5cGVvZiBvcHRpb25zLmVuY29kZSA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5lbmNvZGUgOiBkZWZhdWx0cy5lbmNvZGU7XG4gICAgdmFyIGVuY29kZXIgPSBlbmNvZGUgPyAodHlwZW9mIG9wdGlvbnMuZW5jb2RlciA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuZW5jb2RlciA6IGRlZmF1bHRzLmVuY29kZXIpIDogbnVsbDtcbiAgICB2YXIgc29ydCA9IHR5cGVvZiBvcHRpb25zLnNvcnQgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLnNvcnQgOiBudWxsO1xuICAgIHZhciBhbGxvd0RvdHMgPSB0eXBlb2Ygb3B0aW9ucy5hbGxvd0RvdHMgPT09ICd1bmRlZmluZWQnID8gZmFsc2UgOiBvcHRpb25zLmFsbG93RG90cztcbiAgICB2YXIgc2VyaWFsaXplRGF0ZSA9IHR5cGVvZiBvcHRpb25zLnNlcmlhbGl6ZURhdGUgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLnNlcmlhbGl6ZURhdGUgOiBkZWZhdWx0cy5zZXJpYWxpemVEYXRlO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5mb3JtYXQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIG9wdGlvbnMuZm9ybWF0ID0gZm9ybWF0cy5kZWZhdWx0O1xuICAgIH0gZWxzZSBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChmb3JtYXRzLmZvcm1hdHRlcnMsIG9wdGlvbnMuZm9ybWF0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGZvcm1hdCBvcHRpb24gcHJvdmlkZWQuJyk7XG4gICAgfVxuICAgIHZhciBmb3JtYXR0ZXIgPSBmb3JtYXRzLmZvcm1hdHRlcnNbb3B0aW9ucy5mb3JtYXRdO1xuICAgIHZhciBvYmpLZXlzO1xuICAgIHZhciBmaWx0ZXI7XG5cbiAgICBpZiAob3B0aW9ucy5lbmNvZGVyICE9PSBudWxsICYmIG9wdGlvbnMuZW5jb2RlciAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmVuY29kZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRW5jb2RlciBoYXMgdG8gYmUgYSBmdW5jdGlvbi4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuZmlsdGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGZpbHRlciA9IG9wdGlvbnMuZmlsdGVyO1xuICAgICAgICBvYmogPSBmaWx0ZXIoJycsIG9iaik7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMuZmlsdGVyKSkge1xuICAgICAgICBmaWx0ZXIgPSBvcHRpb25zLmZpbHRlcjtcbiAgICAgICAgb2JqS2V5cyA9IGZpbHRlcjtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IFtdO1xuXG4gICAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8IG9iaiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgdmFyIGFycmF5Rm9ybWF0O1xuICAgIGlmIChvcHRpb25zLmFycmF5Rm9ybWF0IGluIGFycmF5UHJlZml4R2VuZXJhdG9ycykge1xuICAgICAgICBhcnJheUZvcm1hdCA9IG9wdGlvbnMuYXJyYXlGb3JtYXQ7XG4gICAgfSBlbHNlIGlmICgnaW5kaWNlcycgaW4gb3B0aW9ucykge1xuICAgICAgICBhcnJheUZvcm1hdCA9IG9wdGlvbnMuaW5kaWNlcyA/ICdpbmRpY2VzJyA6ICdyZXBlYXQnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFycmF5Rm9ybWF0ID0gJ2luZGljZXMnO1xuICAgIH1cblxuICAgIHZhciBnZW5lcmF0ZUFycmF5UHJlZml4ID0gYXJyYXlQcmVmaXhHZW5lcmF0b3JzW2FycmF5Rm9ybWF0XTtcblxuICAgIGlmICghb2JqS2V5cykge1xuICAgICAgICBvYmpLZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICB9XG5cbiAgICBpZiAoc29ydCkge1xuICAgICAgICBvYmpLZXlzLnNvcnQoc29ydCk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmpLZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBrZXkgPSBvYmpLZXlzW2ldO1xuXG4gICAgICAgIGlmIChza2lwTnVsbHMgJiYgb2JqW2tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAga2V5cyA9IGtleXMuY29uY2F0KHN0cmluZ2lmeShcbiAgICAgICAgICAgIG9ialtrZXldLFxuICAgICAgICAgICAga2V5LFxuICAgICAgICAgICAgZ2VuZXJhdGVBcnJheVByZWZpeCxcbiAgICAgICAgICAgIHN0cmljdE51bGxIYW5kbGluZyxcbiAgICAgICAgICAgIHNraXBOdWxscyxcbiAgICAgICAgICAgIGVuY29kZXIsXG4gICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICBzb3J0LFxuICAgICAgICAgICAgYWxsb3dEb3RzLFxuICAgICAgICAgICAgc2VyaWFsaXplRGF0ZSxcbiAgICAgICAgICAgIGZvcm1hdHRlclxuICAgICAgICApKTtcbiAgICB9XG5cbiAgICByZXR1cm4ga2V5cy5qb2luKGRlbGltaXRlcik7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgZGVmYXVsdHMgPSB7XG4gICAgYWxsb3dEb3RzOiBmYWxzZSxcbiAgICBhbGxvd1Byb3RvdHlwZXM6IGZhbHNlLFxuICAgIGFycmF5TGltaXQ6IDIwLFxuICAgIGRlY29kZXI6IHV0aWxzLmRlY29kZSxcbiAgICBkZWxpbWl0ZXI6ICcmJyxcbiAgICBkZXB0aDogNSxcbiAgICBwYXJhbWV0ZXJMaW1pdDogMTAwMCxcbiAgICBwbGFpbk9iamVjdHM6IGZhbHNlLFxuICAgIHN0cmljdE51bGxIYW5kbGluZzogZmFsc2Vcbn07XG5cbnZhciBwYXJzZVZhbHVlcyA9IGZ1bmN0aW9uIHBhcnNlVmFsdWVzKHN0ciwgb3B0aW9ucykge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICB2YXIgcGFydHMgPSBzdHIuc3BsaXQob3B0aW9ucy5kZWxpbWl0ZXIsIG9wdGlvbnMucGFyYW1ldGVyTGltaXQgPT09IEluZmluaXR5ID8gdW5kZWZpbmVkIDogb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV07XG4gICAgICAgIHZhciBwb3MgPSBwYXJ0LmluZGV4T2YoJ109JykgPT09IC0xID8gcGFydC5pbmRleE9mKCc9JykgOiBwYXJ0LmluZGV4T2YoJ109JykgKyAxO1xuXG4gICAgICAgIHZhciBrZXksIHZhbDtcbiAgICAgICAgaWYgKHBvcyA9PT0gLTEpIHtcbiAgICAgICAgICAgIGtleSA9IG9wdGlvbnMuZGVjb2RlcihwYXJ0KTtcbiAgICAgICAgICAgIHZhbCA9IG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID8gbnVsbCA6ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5ID0gb3B0aW9ucy5kZWNvZGVyKHBhcnQuc2xpY2UoMCwgcG9zKSk7XG4gICAgICAgICAgICB2YWwgPSBvcHRpb25zLmRlY29kZXIocGFydC5zbGljZShwb3MgKyAxKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhcy5jYWxsKG9iaiwga2V5KSkge1xuICAgICAgICAgICAgb2JqW2tleV0gPSBbXS5jb25jYXQob2JqW2tleV0pLmNvbmNhdCh2YWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2JqW2tleV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxudmFyIHBhcnNlT2JqZWN0ID0gZnVuY3Rpb24gcGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucykge1xuICAgIGlmICghY2hhaW4ubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfVxuXG4gICAgdmFyIHJvb3QgPSBjaGFpbi5zaGlmdCgpO1xuXG4gICAgdmFyIG9iajtcbiAgICBpZiAocm9vdCA9PT0gJ1tdJykge1xuICAgICAgICBvYmogPSBbXTtcbiAgICAgICAgb2JqID0gb2JqLmNvbmNhdChwYXJzZU9iamVjdChjaGFpbiwgdmFsLCBvcHRpb25zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgb2JqID0gb3B0aW9ucy5wbGFpbk9iamVjdHMgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgICAgIHZhciBjbGVhblJvb3QgPSByb290WzBdID09PSAnWycgJiYgcm9vdFtyb290Lmxlbmd0aCAtIDFdID09PSAnXScgPyByb290LnNsaWNlKDEsIHJvb3QubGVuZ3RoIC0gMSkgOiByb290O1xuICAgICAgICB2YXIgaW5kZXggPSBwYXJzZUludChjbGVhblJvb3QsIDEwKTtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgIWlzTmFOKGluZGV4KSAmJlxuICAgICAgICAgICAgcm9vdCAhPT0gY2xlYW5Sb290ICYmXG4gICAgICAgICAgICBTdHJpbmcoaW5kZXgpID09PSBjbGVhblJvb3QgJiZcbiAgICAgICAgICAgIGluZGV4ID49IDAgJiZcbiAgICAgICAgICAgIChvcHRpb25zLnBhcnNlQXJyYXlzICYmIGluZGV4IDw9IG9wdGlvbnMuYXJyYXlMaW1pdClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBvYmogPSBbXTtcbiAgICAgICAgICAgIG9ialtpbmRleF0gPSBwYXJzZU9iamVjdChjaGFpbiwgdmFsLCBvcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9ialtjbGVhblJvb3RdID0gcGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxudmFyIHBhcnNlS2V5cyA9IGZ1bmN0aW9uIHBhcnNlS2V5cyhnaXZlbktleSwgdmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKCFnaXZlbktleSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVHJhbnNmb3JtIGRvdCBub3RhdGlvbiB0byBicmFja2V0IG5vdGF0aW9uXG4gICAgdmFyIGtleSA9IG9wdGlvbnMuYWxsb3dEb3RzID8gZ2l2ZW5LZXkucmVwbGFjZSgvXFwuKFteXFwuXFxbXSspL2csICdbJDFdJykgOiBnaXZlbktleTtcblxuICAgIC8vIFRoZSByZWdleCBjaHVua3NcblxuICAgIHZhciBwYXJlbnQgPSAvXihbXlxcW1xcXV0qKS87XG4gICAgdmFyIGNoaWxkID0gLyhcXFtbXlxcW1xcXV0qXFxdKS9nO1xuXG4gICAgLy8gR2V0IHRoZSBwYXJlbnRcblxuICAgIHZhciBzZWdtZW50ID0gcGFyZW50LmV4ZWMoa2V5KTtcblxuICAgIC8vIFN0YXNoIHRoZSBwYXJlbnQgaWYgaXQgZXhpc3RzXG5cbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGlmIChzZWdtZW50WzFdKSB7XG4gICAgICAgIC8vIElmIHdlIGFyZW4ndCB1c2luZyBwbGFpbiBvYmplY3RzLCBvcHRpb25hbGx5IHByZWZpeCBrZXlzXG4gICAgICAgIC8vIHRoYXQgd291bGQgb3ZlcndyaXRlIG9iamVjdCBwcm90b3R5cGUgcHJvcGVydGllc1xuICAgICAgICBpZiAoIW9wdGlvbnMucGxhaW5PYmplY3RzICYmIGhhcy5jYWxsKE9iamVjdC5wcm90b3R5cGUsIHNlZ21lbnRbMV0pKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMuYWxsb3dQcm90b3R5cGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAga2V5cy5wdXNoKHNlZ21lbnRbMV0pO1xuICAgIH1cblxuICAgIC8vIExvb3AgdGhyb3VnaCBjaGlsZHJlbiBhcHBlbmRpbmcgdG8gdGhlIGFycmF5IHVudGlsIHdlIGhpdCBkZXB0aFxuXG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlICgoc2VnbWVudCA9IGNoaWxkLmV4ZWMoa2V5KSkgIT09IG51bGwgJiYgaSA8IG9wdGlvbnMuZGVwdGgpIHtcbiAgICAgICAgaSArPSAxO1xuICAgICAgICBpZiAoIW9wdGlvbnMucGxhaW5PYmplY3RzICYmIGhhcy5jYWxsKE9iamVjdC5wcm90b3R5cGUsIHNlZ21lbnRbMV0ucmVwbGFjZSgvXFxbfFxcXS9nLCAnJykpKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMuYWxsb3dQcm90b3R5cGVzKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAga2V5cy5wdXNoKHNlZ21lbnRbMV0pO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlJ3MgYSByZW1haW5kZXIsIGp1c3QgYWRkIHdoYXRldmVyIGlzIGxlZnRcblxuICAgIGlmIChzZWdtZW50KSB7XG4gICAgICAgIGtleXMucHVzaCgnWycgKyBrZXkuc2xpY2Uoc2VnbWVudC5pbmRleCkgKyAnXScpO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZU9iamVjdChrZXlzLCB2YWwsIG9wdGlvbnMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyLCBvcHRzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBvcHRzIHx8IHt9O1xuXG4gICAgaWYgKG9wdGlvbnMuZGVjb2RlciAhPT0gbnVsbCAmJiBvcHRpb25zLmRlY29kZXIgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5kZWNvZGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0RlY29kZXIgaGFzIHRvIGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgb3B0aW9ucy5kZWxpbWl0ZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWxpbWl0ZXIgPT09ICdzdHJpbmcnIHx8IHV0aWxzLmlzUmVnRXhwKG9wdGlvbnMuZGVsaW1pdGVyKSA/IG9wdGlvbnMuZGVsaW1pdGVyIDogZGVmYXVsdHMuZGVsaW1pdGVyO1xuICAgIG9wdGlvbnMuZGVwdGggPSB0eXBlb2Ygb3B0aW9ucy5kZXB0aCA9PT0gJ251bWJlcicgPyBvcHRpb25zLmRlcHRoIDogZGVmYXVsdHMuZGVwdGg7XG4gICAgb3B0aW9ucy5hcnJheUxpbWl0ID0gdHlwZW9mIG9wdGlvbnMuYXJyYXlMaW1pdCA9PT0gJ251bWJlcicgPyBvcHRpb25zLmFycmF5TGltaXQgOiBkZWZhdWx0cy5hcnJheUxpbWl0O1xuICAgIG9wdGlvbnMucGFyc2VBcnJheXMgPSBvcHRpb25zLnBhcnNlQXJyYXlzICE9PSBmYWxzZTtcbiAgICBvcHRpb25zLmRlY29kZXIgPSB0eXBlb2Ygb3B0aW9ucy5kZWNvZGVyID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5kZWNvZGVyIDogZGVmYXVsdHMuZGVjb2RlcjtcbiAgICBvcHRpb25zLmFsbG93RG90cyA9IHR5cGVvZiBvcHRpb25zLmFsbG93RG90cyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5hbGxvd0RvdHMgOiBkZWZhdWx0cy5hbGxvd0RvdHM7XG4gICAgb3B0aW9ucy5wbGFpbk9iamVjdHMgPSB0eXBlb2Ygb3B0aW9ucy5wbGFpbk9iamVjdHMgPT09ICdib29sZWFuJyA/IG9wdGlvbnMucGxhaW5PYmplY3RzIDogZGVmYXVsdHMucGxhaW5PYmplY3RzO1xuICAgIG9wdGlvbnMuYWxsb3dQcm90b3R5cGVzID0gdHlwZW9mIG9wdGlvbnMuYWxsb3dQcm90b3R5cGVzID09PSAnYm9vbGVhbicgPyBvcHRpb25zLmFsbG93UHJvdG90eXBlcyA6IGRlZmF1bHRzLmFsbG93UHJvdG90eXBlcztcbiAgICBvcHRpb25zLnBhcmFtZXRlckxpbWl0ID0gdHlwZW9mIG9wdGlvbnMucGFyYW1ldGVyTGltaXQgPT09ICdudW1iZXInID8gb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCA6IGRlZmF1bHRzLnBhcmFtZXRlckxpbWl0O1xuICAgIG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID0gdHlwZW9mIG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nID09PSAnYm9vbGVhbicgPyBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA6IGRlZmF1bHRzLnN0cmljdE51bGxIYW5kbGluZztcblxuICAgIGlmIChzdHIgPT09ICcnIHx8IHN0ciA9PT0gbnVsbCB8fCB0eXBlb2Ygc3RyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5wbGFpbk9iamVjdHMgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgfVxuXG4gICAgdmFyIHRlbXBPYmogPSB0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyA/IHBhcnNlVmFsdWVzKHN0ciwgb3B0aW9ucykgOiBzdHI7XG4gICAgdmFyIG9iaiA9IG9wdGlvbnMucGxhaW5PYmplY3RzID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBrZXlzIGFuZCBzZXR1cCB0aGUgbmV3IG9iamVjdFxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0ZW1wT2JqKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciBuZXdPYmogPSBwYXJzZUtleXMoa2V5LCB0ZW1wT2JqW2tleV0sIG9wdGlvbnMpO1xuICAgICAgICBvYmogPSB1dGlscy5tZXJnZShvYmosIG5ld09iaiwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHV0aWxzLmNvbXBhY3Qob2JqKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzdHJpbmdpZnkgPSByZXF1aXJlKCcuL3N0cmluZ2lmeScpO1xudmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpO1xudmFyIGZvcm1hdHMgPSByZXF1aXJlKCcuL2Zvcm1hdHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZm9ybWF0czogZm9ybWF0cyxcbiAgICBwYXJzZTogcGFyc2UsXG4gICAgc3RyaW5naWZ5OiBzdHJpbmdpZnlcbn07XG4iLCJpbXBvcnQgeyBzdHJpbmdpZnkgYXMgc3RyaW5naWZ5UGFyYW1zIH0gZnJvbSAncXMnO1xuXG4vKipcbiAqIFN0cmluZ2lmeSBhbmQgY29uY2F0cyBwYXJhbXMgdG8gdGhlIHByb3ZpZGVkIFVSTFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBVUkwgVGhlIFVSTFxuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyBUaGUgcGFyYW1zIE9iamVjdFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIHVybCBhbmQgcGFyYW1zIGNvbWJpbmVkXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbmNhdFBhcmFtcyhVUkwsIHBhcmFtcykge1xuICByZXR1cm4gcGFyYW1zXG4gICAgPyBgJHtVUkx9PyR7c3RyaW5naWZ5UGFyYW1zKHBhcmFtcyl9YC5yZXBsYWNlKC9cXD8kLywgJycpXG4gICAgOiBVUkw7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBVUkwgYnkgY29tYmluaW5nIHRoZSBzcGVjaWZpZWQgVVJMc1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlVVJMIFRoZSBiYXNlIFVSTFxuICogQHBhcmFtIHtzdHJpbmd9IHJlbGF0aXZlVVJMIFRoZSByZWxhdGl2ZSBVUkxcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjb21iaW5lZCBVUkxcbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gY29tYmluZShiYXNlVVJMLCByZWxhdGl2ZVVSTCkge1xuICByZXR1cm4gYCR7YmFzZVVSTC5yZXBsYWNlKC9cXC8rJC8sICcnKX0vJHtyZWxhdGl2ZVVSTC5yZXBsYWNlKC9eXFwvKy8sICcnKX1gO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIFVSTCB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Fic29sdXRlKHVybCkge1xuICAvLyBBIFVSTCBpcyBjb25zaWRlcmVkIGFic29sdXRlIGlmIGl0IGJlZ2lucyB3aXRoIFwiPHNjaGVtZT46Ly9cIiBvciBcIi8vXCIgKHByb3RvY29sLXJlbGF0aXZlIFVSTCkuXG4gIC8vIFJGQyAzOTg2IGRlZmluZXMgc2NoZW1lIG5hbWUgYXMgYSBzZXF1ZW5jZSBvZiBjaGFyYWN0ZXJzIGJlZ2lubmluZyB3aXRoIGEgbGV0dGVyIGFuZCBmb2xsb3dlZFxuICAvLyBieSBhbnkgY29tYmluYXRpb24gb2YgbGV0dGVycywgZGlnaXRzLCBwbHVzLCBwZXJpb2QsIG9yIGh5cGhlbi5cbiAgcmV0dXJuIC9eKFthLXpdW2EtelxcZFxcK1xcLVxcLl0qOik/XFwvXFwvL2kudGVzdCh1cmwpO1xufVxuXG4vKipcbiAqIEZvcm1hdCBhbiB1cmwgY29tYmluaW5nIHByb3ZpZGVkIHVybHMgb3IgcmV0dXJuaW5nIHRoZSByZWxhdGl2ZVVSTFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlVXJsIFRoZSBiYXNlIHVybFxuICogQHBhcmFtIHtzdHJpbmd9IHJlbGF0aXZlVVJMIFRoZSByZWxhdGl2ZSB1cmxcbiAqIEByZXR1cm5zIHtzdHJpbmd9IHJlbGF0aXZlVVJMIGlmIHRoZSBzcGVjaWZpZWQgcmVsYXRpdmVVUkwgaXMgYWJzb2x1dGUgb3IgYmFzZVVybCBpcyBub3QgZGVmaW5lZCxcbiAqICAgICAgICAgICAgICAgICAgIG90aGVyd2lzZSBpdCByZXR1cm5zIHRoZSBjb21iaW5hdGlvbiBvZiBib3RoIHVybHNcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgVGhlIHBhcmFtcyBvYmplY3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdChiYXNlVXJsLCByZWxhdGl2ZVVSTCwgcGFyYW1zKSB7XG4gIGlmICghYmFzZVVybCB8fCBpc0Fic29sdXRlKHJlbGF0aXZlVVJMKSkge1xuICAgIHJldHVybiBjb25jYXRQYXJhbXMocmVsYXRpdmVVUkwsIHBhcmFtcyk7XG4gIH1cblxuICByZXR1cm4gY29uY2F0UGFyYW1zKGNvbWJpbmUoYmFzZVVybCwgcmVsYXRpdmVVUkwpLCBwYXJhbXMpO1xufVxuIiwiLyohXHJcbiAqIEBuYW1lIEphdmFTY3JpcHQvTm9kZUpTIE1lcmdlIHYxLjIuMFxyXG4gKiBAYXV0aG9yIHllaWtvc1xyXG4gKiBAcmVwb3NpdG9yeSBodHRwczovL2dpdGh1Yi5jb20veWVpa29zL2pzLm1lcmdlXHJcblxyXG4gKiBDb3B5cmlnaHQgMjAxNCB5ZWlrb3MgLSBNSVQgbGljZW5zZVxyXG4gKiBodHRwczovL3Jhdy5naXRodWIuY29tL3llaWtvcy9qcy5tZXJnZS9tYXN0ZXIvTElDRU5TRVxyXG4gKi9cclxuXHJcbjsoZnVuY3Rpb24oaXNOb2RlKSB7XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIG9uZSBvciBtb3JlIG9iamVjdHMgXHJcblx0ICogQHBhcmFtIGJvb2w/IGNsb25lXHJcblx0ICogQHBhcmFtIG1peGVkLC4uLiBhcmd1bWVudHNcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHR2YXIgUHVibGljID0gZnVuY3Rpb24oY2xvbmUpIHtcclxuXHJcblx0XHRyZXR1cm4gbWVyZ2UoY2xvbmUgPT09IHRydWUsIGZhbHNlLCBhcmd1bWVudHMpO1xyXG5cclxuXHR9LCBwdWJsaWNOYW1lID0gJ21lcmdlJztcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9yIG1vcmUgb2JqZWN0cyByZWN1cnNpdmVseSBcclxuXHQgKiBAcGFyYW0gYm9vbD8gY2xvbmVcclxuXHQgKiBAcGFyYW0gbWl4ZWQsLi4uIGFyZ3VtZW50c1xyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdFB1YmxpYy5yZWN1cnNpdmUgPSBmdW5jdGlvbihjbG9uZSkge1xyXG5cclxuXHRcdHJldHVybiBtZXJnZShjbG9uZSA9PT0gdHJ1ZSwgdHJ1ZSwgYXJndW1lbnRzKTtcclxuXHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQ2xvbmUgdGhlIGlucHV0IHJlbW92aW5nIGFueSByZWZlcmVuY2VcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcmV0dXJuIG1peGVkXHJcblx0ICovXHJcblxyXG5cdFB1YmxpYy5jbG9uZSA9IGZ1bmN0aW9uKGlucHV0KSB7XHJcblxyXG5cdFx0dmFyIG91dHB1dCA9IGlucHV0LFxyXG5cdFx0XHR0eXBlID0gdHlwZU9mKGlucHV0KSxcclxuXHRcdFx0aW5kZXgsIHNpemU7XHJcblxyXG5cdFx0aWYgKHR5cGUgPT09ICdhcnJheScpIHtcclxuXHJcblx0XHRcdG91dHB1dCA9IFtdO1xyXG5cdFx0XHRzaXplID0gaW5wdXQubGVuZ3RoO1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleD0wO2luZGV4PHNpemU7KytpbmRleClcclxuXHJcblx0XHRcdFx0b3V0cHV0W2luZGV4XSA9IFB1YmxpYy5jbG9uZShpbnB1dFtpbmRleF0pO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpIHtcclxuXHJcblx0XHRcdG91dHB1dCA9IHt9O1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleCBpbiBpbnB1dClcclxuXHJcblx0XHRcdFx0b3V0cHV0W2luZGV4XSA9IFB1YmxpYy5jbG9uZShpbnB1dFtpbmRleF0pO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb2JqZWN0cyByZWN1cnNpdmVseVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEBwYXJhbSBtaXhlZCBleHRlbmRcclxuXHQgKiBAcmV0dXJuIG1peGVkXHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIG1lcmdlX3JlY3Vyc2l2ZShiYXNlLCBleHRlbmQpIHtcclxuXHJcblx0XHRpZiAodHlwZU9mKGJhc2UpICE9PSAnb2JqZWN0JylcclxuXHJcblx0XHRcdHJldHVybiBleHRlbmQ7XHJcblxyXG5cdFx0Zm9yICh2YXIga2V5IGluIGV4dGVuZCkge1xyXG5cclxuXHRcdFx0aWYgKHR5cGVPZihiYXNlW2tleV0pID09PSAnb2JqZWN0JyAmJiB0eXBlT2YoZXh0ZW5kW2tleV0pID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0XHRiYXNlW2tleV0gPSBtZXJnZV9yZWN1cnNpdmUoYmFzZVtrZXldLCBleHRlbmRba2V5XSk7XHJcblxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHRiYXNlW2tleV0gPSBleHRlbmRba2V5XTtcclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGJhc2U7XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9yIG1vcmUgb2JqZWN0c1xyXG5cdCAqIEBwYXJhbSBib29sIGNsb25lXHJcblx0ICogQHBhcmFtIGJvb2wgcmVjdXJzaXZlXHJcblx0ICogQHBhcmFtIGFycmF5IGFyZ3ZcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiBtZXJnZShjbG9uZSwgcmVjdXJzaXZlLCBhcmd2KSB7XHJcblxyXG5cdFx0dmFyIHJlc3VsdCA9IGFyZ3ZbMF0sXHJcblx0XHRcdHNpemUgPSBhcmd2Lmxlbmd0aDtcclxuXHJcblx0XHRpZiAoY2xvbmUgfHwgdHlwZU9mKHJlc3VsdCkgIT09ICdvYmplY3QnKVxyXG5cclxuXHRcdFx0cmVzdWx0ID0ge307XHJcblxyXG5cdFx0Zm9yICh2YXIgaW5kZXg9MDtpbmRleDxzaXplOysraW5kZXgpIHtcclxuXHJcblx0XHRcdHZhciBpdGVtID0gYXJndltpbmRleF0sXHJcblxyXG5cdFx0XHRcdHR5cGUgPSB0eXBlT2YoaXRlbSk7XHJcblxyXG5cdFx0XHRpZiAodHlwZSAhPT0gJ29iamVjdCcpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Zm9yICh2YXIga2V5IGluIGl0ZW0pIHtcclxuXHJcblx0XHRcdFx0dmFyIHNpdGVtID0gY2xvbmUgPyBQdWJsaWMuY2xvbmUoaXRlbVtrZXldKSA6IGl0ZW1ba2V5XTtcclxuXHJcblx0XHRcdFx0aWYgKHJlY3Vyc2l2ZSkge1xyXG5cclxuXHRcdFx0XHRcdHJlc3VsdFtrZXldID0gbWVyZ2VfcmVjdXJzaXZlKHJlc3VsdFtrZXldLCBzaXRlbSk7XHJcblxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdFx0cmVzdWx0W2tleV0gPSBzaXRlbTtcclxuXHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0eXBlIG9mIHZhcmlhYmxlXHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHJldHVybiBzdHJpbmdcclxuXHQgKlxyXG5cdCAqIEBzZWUgaHR0cDovL2pzcGVyZi5jb20vdHlwZW9mdmFyXHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIHR5cGVPZihpbnB1dCkge1xyXG5cclxuXHRcdHJldHVybiAoe30pLnRvU3RyaW5nLmNhbGwoaW5wdXQpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHR9XHJcblxyXG5cdGlmIChpc05vZGUpIHtcclxuXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IFB1YmxpYztcclxuXHJcblx0fSBlbHNlIHtcclxuXHJcblx0XHR3aW5kb3dbcHVibGljTmFtZV0gPSBQdWJsaWM7XHJcblxyXG5cdH1cclxuXHJcbn0pKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKTsiLCJpbXBvcnQgX21lcmdlIGZyb20gJ21lcmdlJztcblxuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IG1lcmdlIG9iamVjdHNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0cyB0byBtZXJnZVxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgbWVyZ2VkIG9iamVjdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlKC4uLnBhcmFtcykgIHtcbiAgcmV0dXJuIF9tZXJnZS5yZWN1cnNpdmUodHJ1ZSwgLi4ucGFyYW1zKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBza2lwcGVkIHByb3BlcnRpZXNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBvYmplY3QgdG8gc2tpcCBwcm9wZXJ0aWVzIGZyb21cbiAqIEBwYXJhbSB7W1N0cmluZ119IGtleXMga2V5cyBvZiB0aGUgcHJvcGVydGllcyB0byBza2lwXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBvYmplY3Qgd2l0aCB0aGUgcHJvcGVydGllcyBza2lwcGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBza2lwKG9iaiwga2V5cykge1xuICBjb25zdCBza2lwcGVkID0ge307XG4gIE9iamVjdC5rZXlzKG9iaikuZm9yRWFjaCgob2JqS2V5KSA9PiB7XG4gICAgaWYgKGtleXMuaW5kZXhPZihvYmpLZXkpID09PSAtMSkge1xuICAgICAgc2tpcHBlZFtvYmpLZXldID0gb2JqW29iaktleV07XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHNraXBwZWQ7XG59XG4iLCJjb25zdCBpZGVudGl0eSAgPSByZXNwb25zZSA9PiByZXNwb25zZTtcbmNvbnN0IHJlamVjdGlvbiA9IGVyciA9PiBQcm9taXNlLnJlamVjdChlcnIpO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pZGRsZXdhcmUge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9iZWZvcmUgID0gW107XG4gICAgdGhpcy5fYWZ0ZXIgICA9IFtdO1xuICAgIHRoaXMuX2ZpbmFsbHkgPSBbXTtcbiAgfVxuXG4gIGJlZm9yZShmbikge1xuICAgIHRoaXMuX2JlZm9yZS5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcy5fYmVmb3JlLmxlbmd0aCAtIDE7XG4gIH1cblxuICBhZnRlcihmdWxmaWxsID0gaWRlbnRpdHksIHJlamVjdCA9IHJlamVjdGlvbikge1xuICAgIHRoaXMuX2FmdGVyLnB1c2goeyBmdWxmaWxsLCByZWplY3QgfSk7XG4gICAgcmV0dXJuIHRoaXMuX2FmdGVyLmxlbmd0aCAtIDE7XG4gIH1cblxuICBmaW5hbGx5KGZuKSB7XG4gICAgdGhpcy5fZmluYWxseS5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcy5fZmluYWxseS5sZW5ndGggLSAxO1xuICB9XG5cbiAgcmVzb2x2ZUJlZm9yZShjb25maWcpIHtcbiAgICBjb25zdCBjaGFpbiA9IChwcm9taXNlLCB0YXNrKSA9PiBwcm9taXNlLnRoZW4odGFzayk7XG4gICAgcmV0dXJuIHRoaXMuX2JlZm9yZS5yZWR1Y2UoY2hhaW4sIFByb21pc2UucmVzb2x2ZShjb25maWcpKTtcbiAgfVxuXG4gIHJlc29sdmVBZnRlcihlcnIsIHJlc3BvbnNlKSB7XG4gICAgY29uc3QgY2hhaW4gICA9IChwcm9taXNlLCB0YXNrKSA9PiBwcm9taXNlLnRoZW4odGFzay5mdWxmaWxsLCB0YXNrLnJlamVjdCk7XG4gICAgY29uc3QgaW5pdGlhbCA9IGVyciA/IFByb21pc2UucmVqZWN0KGVycikgOiBQcm9taXNlLnJlc29sdmUocmVzcG9uc2UpO1xuICAgIHJldHVybiB0aGlzLl9hZnRlci5yZWR1Y2UoY2hhaW4sIGluaXRpYWwpO1xuICB9XG5cblxuICByZXNvbHZlRmluYWxseSgpIHtcbiAgICB0aGlzLl9maW5hbGx5LmZvckVhY2godGFzayA9PiB0YXNrKCkpO1xuICB9XG59XG4iLCJpbXBvcnQgeyBtZXJnZSB9IGZyb20gJy4vdXRpbHMnO1xuXG5cbmNvbnN0IERFRkFVTFRfSEVBREVSUyA9IHtcbiAgJ0FjY2VwdCcgICAgICA6ICdhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L3BsYWluLCAqLyonLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHF1b3RlLXByb3BzXG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbmZpZyB7XG4gIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgdGhpcy5fZGVmYXVsdHMgPSBtZXJnZSh7fSwgeyBoZWFkZXJzOiBERUZBVUxUX0hFQURFUlMgfSk7XG4gICAgdGhpcy5fY29uZmlnICAgPSB7fTtcblxuICAgIHRoaXMuc2V0KGNvbmZpZyk7XG4gIH1cblxuICBtZXJnZVdpdGhEZWZhdWx0cyguLi5jb25maWdQYXJhbXMpIHtcbiAgICBjb25zdCBjb25maWcgPSBtZXJnZSh0aGlzLl9kZWZhdWx0cywgdGhpcy5fY29uZmlnLCAuLi5jb25maWdQYXJhbXMpO1xuICAgIGlmIChcbiAgICAgIHR5cGVvZiBjb25maWcuYm9keSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIGNvbmZpZy5oZWFkZXJzICYmXG4gICAgICBjb25maWcuaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPT09ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICkge1xuICAgICAgY29uZmlnLmJvZHkgPSBKU09OLnN0cmluZ2lmeShjb25maWcuYm9keSk7XG4gICAgfVxuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBzZXQoY29uZmlnKSB7XG4gICAgdGhpcy5fY29uZmlnID0gbWVyZ2UodGhpcy5fY29uZmlnLCBjb25maWcpO1xuICB9XG5cbiAgZ2V0KCkge1xuICAgIHJldHVybiBtZXJnZSh0aGlzLl9kZWZhdWx0cywgdGhpcy5fY29uZmlnKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBXcmFwIGEgcmVzcG9uc2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgcmVzcG9uc2Ugb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gcmVhZGVyIHR5cGUgb2YgcmVhZGVyIHRvIHVzZSBvbiByZXNwb25zZSBib2R5XG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZXNvbHZlcyB0byB0aGUgd3JhcHBlZCByZWFkIHJlc3BvbnNlXG4gKi9cbmZ1bmN0aW9uIHdyYXBSZXNwb25zZShyZXNwb25zZSwgcmVhZGVyKSB7XG4gIGNvbnN0IHJlcyA9IHtcbiAgICBoZWFkZXJzICAgOiByZXNwb25zZS5oZWFkZXJzLFxuICAgIHN0YXR1cyAgICA6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICBzdGF0dXNUZXh0OiByZXNwb25zZS5zdGF0dXNUZXh0XG4gIH07XG5cbiAgaWYgKHJlYWRlciA9PT0gJ3JhdycpIHtcbiAgICByZXMuZGF0YSA9IHJlc3BvbnNlLmJvZHk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHJldHVybiByZXNwb25zZVtyZWFkZXJdKClcbiAgLnRoZW4oKGRhdGEpID0+IHtcbiAgICByZXMuZGF0YSA9IGRhdGE7XG4gICAgcmV0dXJuIHJlcztcbiAgfSk7XG59XG5cbi8qKlxuICogUmVhZHMgb3IgcmVqZWN0cyBhIGZldGNoIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIHJlc3BvbnNlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHJlYWRlciB0eXBlIG9mIHJlYWRlciB0byB1c2Ugb24gcmVzcG9uc2UgYm9keVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVhZCBvciByZWplY3Rpb24gcHJvbWlzZVxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZXNwb25zZUhhbmRsZXIocmVzcG9uc2UsIHJlYWRlcikge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgY29uc3QgZXJyICAgICAgID0gbmV3IEVycm9yKHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgIGVyci5zdGF0dXMgICAgICA9IHJlc3BvbnNlLnN0YXR1cztcbiAgICBlcnIuc3RhdHVzVGV4dCAgPSByZXNwb25zZS5zdGF0dXNUZXh0O1xuICAgIGVyci5oZWFkZXJzICAgICA9IHJlc3BvbnNlLmhlYWRlcnM7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gIH1cbiAgaWYgKHJlYWRlcikge1xuICAgIHJldHVybiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsIHJlYWRlcik7XG4gIH1cblxuICBjb25zdCBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKTtcbiAgaWYgKGNvbnRlbnRUeXBlICYmIGNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCAnanNvbicpO1xuICB9XG4gIHJldHVybiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsICd0ZXh0Jyk7XG59XG4iLCJpbXBvcnQgJ3doYXR3Zy1mZXRjaCc7XG5cbmltcG9ydCB7IGZvcm1hdCBhcyBmb3JtYXRVcmwgfSBmcm9tICcuL2hlbHBlcnMvdXJsLWhhbmRsZXInO1xuaW1wb3J0IHsgc2tpcCwgbWVyZ2UgfSAgICAgICAgIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IE1pZGRsZXdhcmUgICAgICAgICAgICAgIGZyb20gJy4vbWlkZGxld2FyZSc7XG5pbXBvcnQgQ29uZmlnICAgICAgICAgICAgICAgICAgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHJlc3BvbnNlSGFuZGxlciAgICAgICAgIGZyb20gJy4vaGVscGVycy9yZXNwb25zZS1oYW5kbGVyJztcblxuXG5jbGFzcyBUcmFlIHtcbiAgY29uc3RydWN0b3IoY29uZmlnID0ge30pIHtcbiAgICB0aGlzLl9taWRkbGV3YXJlID0gbmV3IE1pZGRsZXdhcmUoKTtcbiAgICB0aGlzLl9jb25maWcgICAgID0gbmV3IENvbmZpZyhza2lwKGNvbmZpZywgWydiYXNlVXJsJ10pKTtcblxuICAgIHRoaXMuYmFzZVVybChjb25maWcuYmFzZVVybCB8fCAnJyk7XG4gICAgdGhpcy5faW5pdE1ldGhvZHNXaXRoQm9keSgpO1xuICAgIHRoaXMuX2luaXRNZXRob2RzV2l0aE5vQm9keSgpO1xuICAgIHRoaXMuX2luaXRNaWRkbGV3YXJlTWV0aG9kcygpO1xuICB9XG5cbiAgY3JlYXRlKGNvbmZpZykge1xuICAgIGNvbnN0IGluc3RhbmNlID0gbmV3IHRoaXMuY29uc3RydWN0b3IobWVyZ2UodGhpcy5kZWZhdWx0cygpLCBjb25maWcpKTtcbiAgICBjb25zdCBtYXBBZnRlciA9ICh7IGZ1bGZpbGwsIHJlamVjdCB9KSA9PiBpbnN0YW5jZS5hZnRlcihmdWxmaWxsLCByZWplY3QpO1xuICAgIHRoaXMuX21pZGRsZXdhcmUuX2JlZm9yZS5mb3JFYWNoKGluc3RhbmNlLmJlZm9yZSk7XG4gICAgdGhpcy5fbWlkZGxld2FyZS5fYWZ0ZXIuZm9yRWFjaChtYXBBZnRlcik7XG4gICAgdGhpcy5fbWlkZGxld2FyZS5fZmluYWxseS5mb3JFYWNoKGluc3RhbmNlLmZpbmFsbHkpO1xuICAgIHJldHVybiBpbnN0YW5jZTtcbiAgfVxuXG4gIGRlZmF1bHRzKGNvbmZpZykge1xuICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAndW5kZWZpbmVkJykge1xuICAgICAgY29uc3QgZGVmYXVsdHMgPSB0aGlzLl9jb25maWcuZ2V0KCk7XG4gICAgICB0aGlzLmJhc2VVcmwoKSAmJiAoZGVmYXVsdHMuYmFzZVVybCA9IHRoaXMuYmFzZVVybCgpKTtcbiAgICAgIHJldHVybiBkZWZhdWx0cztcbiAgICB9XG4gICAgdGhpcy5fY29uZmlnLnNldChza2lwKGNvbmZpZywgWydiYXNlVXJsJ10pKTtcbiAgICBjb25maWcuYmFzZVVybCAmJiB0aGlzLmJhc2VVcmwoY29uZmlnLmJhc2VVcmwpO1xuICAgIHJldHVybiB0aGlzLl9jb25maWcuZ2V0KCk7XG4gIH1cblxuICBiYXNlVXJsKGJhc2VVcmwpIHtcbiAgICBpZiAodHlwZW9mIGJhc2VVcmwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYmFzZVVybDtcbiAgICB9XG4gICAgdGhpcy5fYmFzZVVybCA9IGJhc2VVcmw7XG4gICAgcmV0dXJuIHRoaXMuX2Jhc2VVcmw7XG4gIH1cblxuICByZXF1ZXN0KGNvbmZpZyA9IHt9KSB7XG4gICAgY29uZmlnLm1ldGhvZCB8fCAoY29uZmlnLm1ldGhvZCA9ICdnZXQnKTtcbiAgICBjb25zdCBtZXJnZWRDb25maWcgPSB0aGlzLl9jb25maWcubWVyZ2VXaXRoRGVmYXVsdHMoY29uZmlnKTtcbiAgICBjb25zdCB1cmwgICAgICAgICAgPSBmb3JtYXRVcmwodGhpcy5fYmFzZVVybCwgY29uZmlnLnVybCwgY29uZmlnLnBhcmFtcyk7XG5cbiAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICB9XG5cbiAgX2ZldGNoKHVybCwgY29uZmlnKSB7XG4gICAgcmV0dXJuIHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUJlZm9yZShjb25maWcpXG4gICAgLnRoZW4oY29uZmlnID0+IGZldGNoKHVybCwgY29uZmlnKSlcbiAgICAudGhlbihyZXMgPT4gcmVzcG9uc2VIYW5kbGVyKHJlcywgY29uZmlnLmJvZHlUeXBlKSlcbiAgICAudGhlbihcbiAgICAgIHJlcyA9PiB0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVBZnRlcih1bmRlZmluZWQsIHJlcyksXG4gICAgICBlcnIgPT4gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlQWZ0ZXIoZXJyKVxuICAgIClcbiAgICAudGhlbihcbiAgICAgIHJlcyA9PiBQcm9taXNlLnJlc29sdmUodGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlRmluYWxseSgpKS50aGVuKCgpID0+IHJlcyksXG4gICAgICBlcnIgPT4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUZpbmFsbHkoKSkudGhlbigoKSA9PiB7IHRocm93IGVycjsgfSlcbiAgICApO1xuICB9XG5cbiAgX2luaXRNZXRob2RzV2l0aE5vQm9keSgpIHtcbiAgICBbJ2dldCcsICdkZWxldGUnLCAnaGVhZCddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgdGhpc1ttZXRob2RdID0gKHBhdGgsIGNvbmZpZyA9IHt9KSA9PiB7XG4gICAgICAgIGNvbnN0IG1lcmdlZENvbmZpZyA9IHRoaXMuX2NvbmZpZy5tZXJnZVdpdGhEZWZhdWx0cyhjb25maWcsIHsgbWV0aG9kIH0pO1xuICAgICAgICBjb25zdCB1cmwgICAgICAgICAgPSBmb3JtYXRVcmwodGhpcy5fYmFzZVVybCwgcGF0aCwgY29uZmlnLnBhcmFtcyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZldGNoKHVybCwgbWVyZ2VkQ29uZmlnKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBfaW5pdE1ldGhvZHNXaXRoQm9keSgpIHtcbiAgICBbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10uZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICB0aGlzW21ldGhvZF0gPSAocGF0aCwgYm9keSwgY29uZmlnKSA9PiB7XG4gICAgICAgIGNvbnN0IG1lcmdlZENvbmZpZyA9IHRoaXMuX2NvbmZpZy5tZXJnZVdpdGhEZWZhdWx0cyhjb25maWcsIHsgYm9keSwgbWV0aG9kIH0pO1xuICAgICAgICBjb25zdCB1cmwgICAgICAgICAgPSBmb3JtYXRVcmwodGhpcy5fYmFzZVVybCwgcGF0aCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZldGNoKHVybCwgbWVyZ2VkQ29uZmlnKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBfaW5pdE1pZGRsZXdhcmVNZXRob2RzKCkge1xuICAgIFsnYmVmb3JlJywgJ2FmdGVyJywgJ2ZpbmFsbHknXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIHRoaXNbbWV0aG9kXSA9ICguLi5hcmdzKSA9PiB0aGlzLl9taWRkbGV3YXJlW21ldGhvZF0oLi4uYXJncyk7XG4gICAgfSk7XG4gIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgVHJhZSgpO1xuIl0sIm5hbWVzIjpbInNlbGYiLCJmZXRjaCIsInN1cHBvcnQiLCJTeW1ib2wiLCJCbG9iIiwiZSIsImFycmF5QnVmZmVyIiwidmlld0NsYXNzZXMiLCJpc0RhdGFWaWV3Iiwib2JqIiwiRGF0YVZpZXciLCJwcm90b3R5cGUiLCJpc1Byb3RvdHlwZU9mIiwiaXNBcnJheUJ1ZmZlclZpZXciLCJBcnJheUJ1ZmZlciIsImlzVmlldyIsImluZGV4T2YiLCJPYmplY3QiLCJ0b1N0cmluZyIsImNhbGwiLCJub3JtYWxpemVOYW1lIiwibmFtZSIsIlN0cmluZyIsInRlc3QiLCJUeXBlRXJyb3IiLCJ0b0xvd2VyQ2FzZSIsIm5vcm1hbGl6ZVZhbHVlIiwidmFsdWUiLCJpdGVyYXRvckZvciIsIml0ZW1zIiwiaXRlcmF0b3IiLCJzaGlmdCIsImRvbmUiLCJ1bmRlZmluZWQiLCJpdGVyYWJsZSIsIkhlYWRlcnMiLCJoZWFkZXJzIiwibWFwIiwiZm9yRWFjaCIsImFwcGVuZCIsImdldE93blByb3BlcnR5TmFtZXMiLCJvbGRWYWx1ZSIsImdldCIsImhhcyIsImhhc093blByb3BlcnR5Iiwic2V0IiwiY2FsbGJhY2siLCJ0aGlzQXJnIiwia2V5cyIsInB1c2giLCJ2YWx1ZXMiLCJlbnRyaWVzIiwiY29uc3VtZWQiLCJib2R5IiwiYm9keVVzZWQiLCJQcm9taXNlIiwicmVqZWN0IiwiZmlsZVJlYWRlclJlYWR5IiwicmVhZGVyIiwicmVzb2x2ZSIsIm9ubG9hZCIsInJlc3VsdCIsIm9uZXJyb3IiLCJlcnJvciIsInJlYWRCbG9iQXNBcnJheUJ1ZmZlciIsImJsb2IiLCJGaWxlUmVhZGVyIiwicHJvbWlzZSIsInJlYWRBc0FycmF5QnVmZmVyIiwicmVhZEJsb2JBc1RleHQiLCJyZWFkQXNUZXh0IiwicmVhZEFycmF5QnVmZmVyQXNUZXh0IiwiYnVmIiwidmlldyIsIlVpbnQ4QXJyYXkiLCJjaGFycyIsIkFycmF5IiwibGVuZ3RoIiwiaSIsImZyb21DaGFyQ29kZSIsImpvaW4iLCJidWZmZXJDbG9uZSIsInNsaWNlIiwiYnl0ZUxlbmd0aCIsImJ1ZmZlciIsIkJvZHkiLCJfaW5pdEJvZHkiLCJfYm9keUluaXQiLCJfYm9keVRleHQiLCJfYm9keUJsb2IiLCJmb3JtRGF0YSIsIkZvcm1EYXRhIiwiX2JvZHlGb3JtRGF0YSIsInNlYXJjaFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIl9ib2R5QXJyYXlCdWZmZXIiLCJFcnJvciIsInR5cGUiLCJyZWplY3RlZCIsInRoZW4iLCJ0ZXh0IiwiZGVjb2RlIiwianNvbiIsIkpTT04iLCJwYXJzZSIsIm1ldGhvZHMiLCJub3JtYWxpemVNZXRob2QiLCJtZXRob2QiLCJ1cGNhc2VkIiwidG9VcHBlckNhc2UiLCJSZXF1ZXN0IiwiaW5wdXQiLCJvcHRpb25zIiwidXJsIiwiY3JlZGVudGlhbHMiLCJtb2RlIiwicmVmZXJyZXIiLCJjbG9uZSIsImZvcm0iLCJ0cmltIiwic3BsaXQiLCJieXRlcyIsInJlcGxhY2UiLCJkZWNvZGVVUklDb21wb25lbnQiLCJwYXJzZUhlYWRlcnMiLCJyYXdIZWFkZXJzIiwibGluZSIsInBhcnRzIiwia2V5IiwiUmVzcG9uc2UiLCJib2R5SW5pdCIsInN0YXR1cyIsIm9rIiwic3RhdHVzVGV4dCIsInJlc3BvbnNlIiwicmVkaXJlY3RTdGF0dXNlcyIsInJlZGlyZWN0IiwiUmFuZ2VFcnJvciIsImxvY2F0aW9uIiwiaW5pdCIsInJlcXVlc3QiLCJ4aHIiLCJYTUxIdHRwUmVxdWVzdCIsImdldEFsbFJlc3BvbnNlSGVhZGVycyIsInJlc3BvbnNlVVJMIiwicmVzcG9uc2VUZXh0Iiwib250aW1lb3V0Iiwib3BlbiIsIndpdGhDcmVkZW50aWFscyIsInJlc3BvbnNlVHlwZSIsInNldFJlcXVlc3RIZWFkZXIiLCJzZW5kIiwicG9seWZpbGwiLCJ0aGlzIiwiaGV4VGFibGUiLCJhcnJheSIsInNvdXJjZSIsInBsYWluT2JqZWN0cyIsImNyZWF0ZSIsInRhcmdldCIsImlzQXJyYXkiLCJjb25jYXQiLCJtZXJnZVRhcmdldCIsImV4cG9ydHMiLCJhcnJheVRvT2JqZWN0IiwiaXRlbSIsImJhYmVsSGVscGVycy50eXBlb2YiLCJtZXJnZSIsInJlZHVjZSIsImFjYyIsInN0ciIsInN0cmluZyIsIm91dCIsImMiLCJjaGFyQ29kZUF0IiwiY2hhckF0IiwicmVmZXJlbmNlcyIsInJlZnMiLCJsb29rdXAiLCJjb21wYWN0ZWQiLCJjb21wYWN0IiwiY29uc3RydWN0b3IiLCJpc0J1ZmZlciIsInBlcmNlbnRUd2VudGllcyIsInV0aWxzIiwicmVxdWlyZSQkMCIsImZvcm1hdHMiLCJyZXF1aXJlJCQxIiwiYXJyYXlQcmVmaXhHZW5lcmF0b3JzIiwiYnJhY2tldHMiLCJwcmVmaXgiLCJpbmRpY2VzIiwicmVwZWF0IiwidG9JU08iLCJEYXRlIiwidG9JU09TdHJpbmciLCJkZWZhdWx0cyIsImVuY29kZSIsInNlcmlhbGl6ZURhdGUiLCJkYXRlIiwic3RyaW5naWZ5Iiwib2JqZWN0IiwiZ2VuZXJhdGVBcnJheVByZWZpeCIsInN0cmljdE51bGxIYW5kbGluZyIsInNraXBOdWxscyIsImVuY29kZXIiLCJmaWx0ZXIiLCJzb3J0IiwiYWxsb3dEb3RzIiwiZm9ybWF0dGVyIiwib2JqS2V5cyIsIm9wdHMiLCJkZWxpbWl0ZXIiLCJmb3JtYXQiLCJkZWZhdWx0IiwiZm9ybWF0dGVycyIsImFycmF5Rm9ybWF0IiwicGFyc2VWYWx1ZXMiLCJwYXJhbWV0ZXJMaW1pdCIsIkluZmluaXR5IiwicGFydCIsInBvcyIsInZhbCIsImRlY29kZXIiLCJwYXJzZU9iamVjdCIsImNoYWluIiwicm9vdCIsImNsZWFuUm9vdCIsImluZGV4IiwicGFyc2VJbnQiLCJpc05hTiIsInBhcnNlQXJyYXlzIiwiYXJyYXlMaW1pdCIsInBhcnNlS2V5cyIsImdpdmVuS2V5IiwicGFyZW50IiwiY2hpbGQiLCJzZWdtZW50IiwiZXhlYyIsImFsbG93UHJvdG90eXBlcyIsImRlcHRoIiwiaXNSZWdFeHAiLCJ0ZW1wT2JqIiwibmV3T2JqIiwicmVxdWlyZSQkMiIsImNvbmNhdFBhcmFtcyIsIlVSTCIsInBhcmFtcyIsInN0cmluZ2lmeVBhcmFtcyIsImNvbWJpbmUiLCJiYXNlVVJMIiwicmVsYXRpdmVVUkwiLCJpc0Fic29sdXRlIiwiYmFzZVVybCIsImlzTm9kZSIsIlB1YmxpYyIsImFyZ3VtZW50cyIsInB1YmxpY05hbWUiLCJyZWN1cnNpdmUiLCJvdXRwdXQiLCJ0eXBlT2YiLCJzaXplIiwibWVyZ2VfcmVjdXJzaXZlIiwiYmFzZSIsImV4dGVuZCIsImFyZ3YiLCJzaXRlbSIsIm1vZHVsZSIsIl9tZXJnZSIsInNraXAiLCJza2lwcGVkIiwib2JqS2V5IiwiaWRlbnRpdHkiLCJyZWplY3Rpb24iLCJlcnIiLCJNaWRkbGV3YXJlIiwiX2JlZm9yZSIsIl9hZnRlciIsIl9maW5hbGx5IiwiZm4iLCJmdWxmaWxsIiwiY29uZmlnIiwidGFzayIsImluaXRpYWwiLCJERUZBVUxUX0hFQURFUlMiLCJDb25maWciLCJfZGVmYXVsdHMiLCJfY29uZmlnIiwiY29uZmlnUGFyYW1zIiwid3JhcFJlc3BvbnNlIiwicmVzIiwiZGF0YSIsInJlc3BvbnNlSGFuZGxlciIsImNvbnRlbnRUeXBlIiwiaW5jbHVkZXMiLCJUcmFlIiwiX21pZGRsZXdhcmUiLCJfaW5pdE1ldGhvZHNXaXRoQm9keSIsIl9pbml0TWV0aG9kc1dpdGhOb0JvZHkiLCJfaW5pdE1pZGRsZXdhcmVNZXRob2RzIiwiaW5zdGFuY2UiLCJtYXBBZnRlciIsImFmdGVyIiwiYmVmb3JlIiwiZmluYWxseSIsIl9iYXNlVXJsIiwibWVyZ2VkQ29uZmlnIiwibWVyZ2VXaXRoRGVmYXVsdHMiLCJmb3JtYXRVcmwiLCJfZmV0Y2giLCJyZXNvbHZlQmVmb3JlIiwiYm9keVR5cGUiLCJyZXNvbHZlQWZ0ZXIiLCJyZXNvbHZlRmluYWxseSIsInBhdGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLENBQUMsVUFBU0EsSUFBVCxFQUFlOzs7TUFHVkEsS0FBS0MsS0FBVCxFQUFnQjs7OztNQUlaQyxVQUFVO2tCQUNFLHFCQUFxQkYsSUFEdkI7Y0FFRixZQUFZQSxJQUFaLElBQW9CLGNBQWNHLE1BRmhDO1VBR04sZ0JBQWdCSCxJQUFoQixJQUF3QixVQUFVQSxJQUFsQyxJQUEyQyxZQUFXO1VBQ3REO1lBQ0VJLElBQUo7ZUFDTyxJQUFQO09BRkYsQ0FHRSxPQUFNQyxDQUFOLEVBQVM7ZUFDRixLQUFQOztLQUw0QyxFQUhwQztjQVdGLGNBQWNMLElBWFo7aUJBWUMsaUJBQWlCQTtHQVpoQzs7TUFlSUUsUUFBUUksV0FBWixFQUF5QjtRQUNuQkMsY0FBYyxDQUNoQixvQkFEZ0IsRUFFaEIscUJBRmdCLEVBR2hCLDRCQUhnQixFQUloQixxQkFKZ0IsRUFLaEIsc0JBTGdCLEVBTWhCLHFCQU5nQixFQU9oQixzQkFQZ0IsRUFRaEIsdUJBUmdCLEVBU2hCLHVCQVRnQixDQUFsQjs7UUFZSUMsYUFBYSxTQUFiQSxVQUFhLENBQVNDLEdBQVQsRUFBYzthQUN0QkEsT0FBT0MsU0FBU0MsU0FBVCxDQUFtQkMsYUFBbkIsQ0FBaUNILEdBQWpDLENBQWQ7S0FERjs7UUFJSUksb0JBQW9CQyxZQUFZQyxNQUFaLElBQXNCLFVBQVNO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
