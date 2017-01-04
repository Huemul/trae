/**
 * Trae, the fetch library!
 *
 * @version: 0.0.13
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
    var list = this.map[name];
    if (!list) {
      list = [];
      this.map[name] = list;
    }
    list.push(value);
  };

  Headers.prototype['delete'] = function (name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function (name) {
    var values = this.map[normalizeName(name)];
    return values ? values[0] : null;
  };

  Headers.prototype.getAll = function (name) {
    return this.map[normalizeName(name)] || [];
  };

  Headers.prototype.has = function (name) {
    return this.map.hasOwnProperty(normalizeName(name));
  };

  Headers.prototype.set = function (name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)];
  };

  Headers.prototype.forEach = function (callback, thisArg) {
    Object.getOwnPropertyNames(this.map).forEach(function (name) {
      this.map[name].forEach(function (value) {
        callback.call(thisArg, value, name, this);
      }, this);
    }, this);
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







var get$1 = function get$1(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get$1(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

















var set$1 = function set$1(object, property, value, receiver) {
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent !== null) {
      set$1(parent, property, value, receiver);
    }
  } else if ("value" in desc && desc.writable) {
    desc.value = value;
  } else {
    var setter = desc.set;

    if (setter !== undefined) {
      setter.call(receiver, value);
    }
  }

  return value;
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

var stringify$1 = function stringify$1(object, prefix, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter) {
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
            values = values.concat(stringify$1(obj[key], generateArrayPrefix(prefix, key), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter));
        } else {
            values = values.concat(stringify$1(obj[key], prefix + (allowDots ? '.' + key : '[' + key + ']'), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter));
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

var parse$1 = function parse$1(str, opts) {
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

var stringify = index$1.stringify;

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
  return URL + '?' + stringify(params);
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

var merge$2 = createCommonjsModule(function (module) {
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
	})((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && module && _typeof(module.exports) === 'object' && module.exports);
});

/**
 * Recursively merge objects
 *
 * @param {Object} objects to merge
 * @return {Object} the merged objects
 */
function merge$1() {
  for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
    params[_key] = arguments[_key];
  }

  return merge$2.recursive.apply(merge$2, [true].concat(params));
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

var DEFAULT_CONFIG = {
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
};

var Config = function () {
  function Config() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    classCallCheck(this, Config);

    this._defaults = merge$1(DEFAULT_CONFIG, { headers: DEFAULT_HEADERS });
    this._config = {};

    this.set(config);
  }

  createClass(Config, [{
    key: 'mergeWithDefaults',
    value: function mergeWithDefaults() {
      for (var _len = arguments.length, configParams = Array(_len), _key = 0; _key < _len; _key++) {
        configParams[_key] = arguments[_key];
      }

      var config = merge$1.apply(undefined, [this._defaults, this._config].concat(configParams));
      if (_typeof(config.body) === 'object' && config.headers && config.headers['Content-Type'] === 'application/json') {
        config.body = JSON.stringify(config.body);
      }
      return config;
    }
  }, {
    key: 'set',
    value: function set(config) {
      this._config = merge$1(this._config, config);
    }
  }, {
    key: 'get',
    value: function get() {
      return merge$1(this._defaults, this._config);
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
      var instance = new this.constructor(merge$1(this.defaults(), config));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL3V0aWxzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi9mb3JtYXRzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi9zdHJpbmdpZnkuanMiLCIuLi9ub2RlX21vZHVsZXMvcXMvbGliL3BhcnNlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3FzL2xpYi9pbmRleC5qcyIsIi4uL2xpYi9oZWxwZXJzL3VybC1oYW5kbGVyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL21lcmdlL21lcmdlLmpzIiwiLi4vbGliL3V0aWxzLmpzIiwiLi4vbGliL21pZGRsZXdhcmUuanMiLCIuLi9saWIvY29uZmlnLmpzIiwiLi4vbGliL2hlbHBlcnMvcmVzcG9uc2UtaGFuZGxlci5qcyIsIi4uL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG5cbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgbGlzdCA9IHRoaXMubWFwW25hbWVdXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICBsaXN0ID0gW11cbiAgICAgIHRoaXMubWFwW25hbWVdID0gbGlzdFxuICAgIH1cbiAgICBsaXN0LnB1c2godmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHZhbHVlcyA9IHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gICAgcmV0dXJuIHZhbHVlcyA/IHZhbHVlc1swXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gfHwgW11cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBbbm9ybWFsaXplVmFsdWUodmFsdWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5tYXApLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgdGhpcy5tYXBbbmFtZV0uZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHZhbHVlLCBuYW1lLCB0aGlzKVxuICAgICAgfSwgdGhpcylcbiAgICB9LCB0aGlzKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2gobmFtZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkgeyBpdGVtcy5wdXNoKHZhbHVlKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKFtuYW1lLCB2YWx1ZV0pIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICBIZWFkZXJzLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID0gSGVhZGVycy5wcm90b3R5cGUuZW50cmllc1xuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEFycmF5QnVmZmVyQXNUZXh0KGJ1Zikge1xuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIHZhciBjaGFycyA9IG5ldyBBcnJheSh2aWV3Lmxlbmd0aClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hhcnNbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHZpZXdbaV0pXG4gICAgfVxuICAgIHJldHVybiBjaGFycy5qb2luKCcnKVxuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyQ2xvbmUoYnVmKSB7XG4gICAgaWYgKGJ1Zi5zbGljZSkge1xuICAgICAgcmV0dXJuIGJ1Zi5zbGljZSgwKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zi5ieXRlTGVuZ3RoKVxuICAgICAgdmlldy5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmKSlcbiAgICAgIHJldHVybiB2aWV3LmJ1ZmZlclxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHkudG9TdHJpbmcoKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIHN1cHBvcnQuYmxvYiAmJiBpc0RhdGFWaWV3KGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkuYnVmZmVyKVxuICAgICAgICAvLyBJRSAxMC0xMSBjYW4ndCBoYW5kbGUgYSBEYXRhVmlldyBib2R5LlxuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIChBcnJheUJ1ZmZlci5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSB8fCBpc0FycmF5QnVmZmVyVmlldyhib2R5KSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlCbG9iICYmIHRoaXMuX2JvZHlCbG9iLnR5cGUpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCB0aGlzLl9ib2R5QmxvYi50eXBlKVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5ibG9iKSB7XG4gICAgICB0aGlzLmJsb2IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyBibG9iJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5VGV4dF0pKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYXJyYXlCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBjb25zdW1lZCh0aGlzKSB8fCBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUFycmF5QnVmZmVyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVhZEFycmF5QnVmZmVyQXNUZXh0KHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmZvcm1EYXRhKSB7XG4gICAgICB0aGlzLmZvcm1EYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKGRlY29kZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKEpTT04ucGFyc2UpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8vIEhUVFAgbWV0aG9kcyB3aG9zZSBjYXBpdGFsaXphdGlvbiBzaG91bGQgYmUgbm9ybWFsaXplZFxuICB2YXIgbWV0aG9kcyA9IFsnREVMRVRFJywgJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnXVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldGhvZChtZXRob2QpIHtcbiAgICB2YXIgdXBjYXNlZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpXG4gICAgcmV0dXJuIChtZXRob2RzLmluZGV4T2YodXBjYXNlZCkgPiAtMSkgPyB1cGNhc2VkIDogbWV0aG9kXG4gIH1cblxuICBmdW5jdGlvbiBSZXF1ZXN0KGlucHV0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB2YXIgYm9keSA9IG9wdGlvbnMuYm9keVxuXG4gICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMudXJsID0gaW5wdXRcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGlucHV0LmJvZHlVc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpXG4gICAgICB9XG4gICAgICB0aGlzLnVybCA9IGlucHV0LnVybFxuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IGlucHV0LmNyZWRlbnRpYWxzXG4gICAgICBpZiAoIW9wdGlvbnMuaGVhZGVycykge1xuICAgICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhpbnB1dC5oZWFkZXJzKVxuICAgICAgfVxuICAgICAgdGhpcy5tZXRob2QgPSBpbnB1dC5tZXRob2RcbiAgICAgIHRoaXMubW9kZSA9IGlucHV0Lm1vZGVcbiAgICAgIGlmICghYm9keSAmJiBpbnB1dC5fYm9keUluaXQgIT0gbnVsbCkge1xuICAgICAgICBib2R5ID0gaW5wdXQuX2JvZHlJbml0XG4gICAgICAgIGlucHV0LmJvZHlVc2VkID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLCB7IGJvZHk6IHRoaXMuX2JvZHlJbml0IH0pXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycygpXG4gICAgcmF3SGVhZGVycy5zcGxpdCgnXFxyXFxuJykuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICB2YXIgcGFydHMgPSBsaW5lLnNwbGl0KCc6JylcbiAgICAgIHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpLnRyaW0oKVxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJ0cy5qb2luKCc6JykudHJpbSgpXG4gICAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaGVhZGVyc1xuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9ICdzdGF0dXMnIGluIG9wdGlvbnMgPyBvcHRpb25zLnN0YXR1cyA6IDIwMFxuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSAnc3RhdHVzVGV4dCcgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzVGV4dCA6ICdPSydcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHhoci5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogcGFyc2VIZWFkZXJzKHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSB8fCAnJylcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zLnVybCA9ICdyZXNwb25zZVVSTCcgaW4geGhyID8geGhyLnJlc3BvbnNlVVJMIDogb3B0aW9ucy5oZWFkZXJzLmdldCgnWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfVxuXG4gICAgICBpZiAoJ3Jlc3BvbnNlVHlwZScgaW4geGhyICYmIHN1cHBvcnQuYmxvYikge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3QuaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIHZhbHVlKVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQodHlwZW9mIHJlcXVlc3QuX2JvZHlJbml0ID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiByZXF1ZXN0Ll9ib2R5SW5pdClcbiAgICB9KVxuICB9XG4gIHNlbGYuZmV0Y2gucG9seWZpbGwgPSB0cnVlXG59KSh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdGhpcyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgaGV4VGFibGUgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcnJheSA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyArK2kpIHtcbiAgICAgICAgYXJyYXkucHVzaCgnJScgKyAoKGkgPCAxNiA/ICcwJyA6ICcnKSArIGkudG9TdHJpbmcoMTYpKS50b1VwcGVyQ2FzZSgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJyYXk7XG59KCkpO1xuXG5leHBvcnRzLmFycmF5VG9PYmplY3QgPSBmdW5jdGlvbiAoc291cmNlLCBvcHRpb25zKSB7XG4gICAgdmFyIG9iaiA9IG9wdGlvbnMgJiYgb3B0aW9ucy5wbGFpbk9iamVjdHMgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzb3VyY2UubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbaV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBvYmpbaV0gPSBzb3VyY2VbaV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufTtcblxuZXhwb3J0cy5tZXJnZSA9IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSwgb3B0aW9ucykge1xuICAgIGlmICghc291cmNlKSB7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzb3VyY2UgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgICAgIHRhcmdldC5wdXNoKHNvdXJjZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHRhcmdldCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHRhcmdldFtzb3VyY2VdID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbdGFyZ2V0LCBzb3VyY2VdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRhcmdldCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIFt0YXJnZXRdLmNvbmNhdChzb3VyY2UpO1xuICAgIH1cblxuICAgIHZhciBtZXJnZVRhcmdldCA9IHRhcmdldDtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpICYmICFBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgICAgbWVyZ2VUYXJnZXQgPSBleHBvcnRzLmFycmF5VG9PYmplY3QodGFyZ2V0LCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpICYmIEFycmF5LmlzQXJyYXkoc291cmNlKSkge1xuICAgICAgICBzb3VyY2UuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaSkge1xuICAgICAgICAgICAgaWYgKGhhcy5jYWxsKHRhcmdldCwgaSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGFyZ2V0W2ldICYmIHR5cGVvZiB0YXJnZXRbaV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFtpXSA9IGV4cG9ydHMubWVyZ2UodGFyZ2V0W2ldLCBpdGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldFtpXSA9IGl0ZW07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cblxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzb3VyY2UpLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gc291cmNlW2tleV07XG5cbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhY2MsIGtleSkpIHtcbiAgICAgICAgICAgIGFjY1trZXldID0gZXhwb3J0cy5tZXJnZShhY2Nba2V5XSwgdmFsdWUsIG9wdGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWNjW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWNjO1xuICAgIH0sIG1lcmdlVGFyZ2V0KTtcbn07XG5cbmV4cG9ydHMuZGVjb2RlID0gZnVuY3Rpb24gKHN0cikge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyLnJlcGxhY2UoL1xcKy9nLCAnICcpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxufTtcblxuZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgLy8gVGhpcyBjb2RlIHdhcyBvcmlnaW5hbGx5IHdyaXR0ZW4gYnkgQnJpYW4gV2hpdGUgKG1zY2RleCkgZm9yIHRoZSBpby5qcyBjb3JlIHF1ZXJ5c3RyaW5nIGxpYnJhcnkuXG4gICAgLy8gSXQgaGFzIGJlZW4gYWRhcHRlZCBoZXJlIGZvciBzdHJpY3RlciBhZGhlcmVuY2UgdG8gUkZDIDM5ODZcbiAgICBpZiAoc3RyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cblxuICAgIHZhciBzdHJpbmcgPSB0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyA/IHN0ciA6IFN0cmluZyhzdHIpO1xuXG4gICAgdmFyIG91dCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBjID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgYyA9PT0gMHgyRCB8fCAvLyAtXG4gICAgICAgICAgICBjID09PSAweDJFIHx8IC8vIC5cbiAgICAgICAgICAgIGMgPT09IDB4NUYgfHwgLy8gX1xuICAgICAgICAgICAgYyA9PT0gMHg3RSB8fCAvLyB+XG4gICAgICAgICAgICAoYyA+PSAweDMwICYmIGMgPD0gMHgzOSkgfHwgLy8gMC05XG4gICAgICAgICAgICAoYyA+PSAweDQxICYmIGMgPD0gMHg1QSkgfHwgLy8gYS16XG4gICAgICAgICAgICAoYyA+PSAweDYxICYmIGMgPD0gMHg3QSkgLy8gQS1aXG4gICAgICAgICkge1xuICAgICAgICAgICAgb3V0ICs9IHN0cmluZy5jaGFyQXQoaSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjIDwgMHg4MCkge1xuICAgICAgICAgICAgb3V0ID0gb3V0ICsgaGV4VGFibGVbY107XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjIDwgMHg4MDApIHtcbiAgICAgICAgICAgIG91dCA9IG91dCArIChoZXhUYWJsZVsweEMwIHwgKGMgPj4gNildICsgaGV4VGFibGVbMHg4MCB8IChjICYgMHgzRildKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGMgPCAweEQ4MDAgfHwgYyA+PSAweEUwMDApIHtcbiAgICAgICAgICAgIG91dCA9IG91dCArIChoZXhUYWJsZVsweEUwIHwgKGMgPj4gMTIpXSArIGhleFRhYmxlWzB4ODAgfCAoKGMgPj4gNikgJiAweDNGKV0gKyBoZXhUYWJsZVsweDgwIHwgKGMgJiAweDNGKV0pO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpICs9IDE7XG4gICAgICAgIGMgPSAweDEwMDAwICsgKCgoYyAmIDB4M0ZGKSA8PCAxMCkgfCAoc3RyaW5nLmNoYXJDb2RlQXQoaSkgJiAweDNGRikpO1xuICAgICAgICBvdXQgKz0gaGV4VGFibGVbMHhGMCB8IChjID4+IDE4KV0gKyBoZXhUYWJsZVsweDgwIHwgKChjID4+IDEyKSAmIDB4M0YpXSArIGhleFRhYmxlWzB4ODAgfCAoKGMgPj4gNikgJiAweDNGKV0gKyBoZXhUYWJsZVsweDgwIHwgKGMgJiAweDNGKV07XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbmV4cG9ydHMuY29tcGFjdCA9IGZ1bmN0aW9uIChvYmosIHJlZmVyZW5jZXMpIHtcbiAgICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgdmFyIHJlZnMgPSByZWZlcmVuY2VzIHx8IFtdO1xuICAgIHZhciBsb29rdXAgPSByZWZzLmluZGV4T2Yob2JqKTtcbiAgICBpZiAobG9va3VwICE9PSAtMSkge1xuICAgICAgICByZXR1cm4gcmVmc1tsb29rdXBdO1xuICAgIH1cblxuICAgIHJlZnMucHVzaChvYmopO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSkge1xuICAgICAgICB2YXIgY29tcGFjdGVkID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChvYmpbaV0gJiYgdHlwZW9mIG9ialtpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjb21wYWN0ZWQucHVzaChleHBvcnRzLmNvbXBhY3Qob2JqW2ldLCByZWZzKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvYmpbaV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29tcGFjdGVkLnB1c2gob2JqW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb21wYWN0ZWQ7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIG9ialtrZXldID0gZXhwb3J0cy5jb21wYWN0KG9ialtrZXldLCByZWZzKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvYmo7XG59O1xuXG5leHBvcnRzLmlzUmVnRXhwID0gZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59O1xuXG5leHBvcnRzLmlzQnVmZmVyID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGlmIChvYmogPT09IG51bGwgfHwgdHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiAhIShvYmouY29uc3RydWN0b3IgJiYgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciByZXBsYWNlID0gU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlO1xudmFyIHBlcmNlbnRUd2VudGllcyA9IC8lMjAvZztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgJ2RlZmF1bHQnOiAnUkZDMzk4NicsXG4gICAgZm9ybWF0dGVyczoge1xuICAgICAgICBSRkMxNzM4OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlLmNhbGwodmFsdWUsIHBlcmNlbnRUd2VudGllcywgJysnKTtcbiAgICAgICAgfSxcbiAgICAgICAgUkZDMzk4NjogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFJGQzE3Mzg6ICdSRkMxNzM4JyxcbiAgICBSRkMzOTg2OiAnUkZDMzk4Nidcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBmb3JtYXRzID0gcmVxdWlyZSgnLi9mb3JtYXRzJyk7XG5cbnZhciBhcnJheVByZWZpeEdlbmVyYXRvcnMgPSB7XG4gICAgYnJhY2tldHM6IGZ1bmN0aW9uIGJyYWNrZXRzKHByZWZpeCkge1xuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ1tdJztcbiAgICB9LFxuICAgIGluZGljZXM6IGZ1bmN0aW9uIGluZGljZXMocHJlZml4LCBrZXkpIHtcbiAgICAgICAgcmV0dXJuIHByZWZpeCArICdbJyArIGtleSArICddJztcbiAgICB9LFxuICAgIHJlcGVhdDogZnVuY3Rpb24gcmVwZWF0KHByZWZpeCkge1xuICAgICAgICByZXR1cm4gcHJlZml4O1xuICAgIH1cbn07XG5cbnZhciB0b0lTTyA9IERhdGUucHJvdG90eXBlLnRvSVNPU3RyaW5nO1xuXG52YXIgZGVmYXVsdHMgPSB7XG4gICAgZGVsaW1pdGVyOiAnJicsXG4gICAgZW5jb2RlOiB0cnVlLFxuICAgIGVuY29kZXI6IHV0aWxzLmVuY29kZSxcbiAgICBzZXJpYWxpemVEYXRlOiBmdW5jdGlvbiBzZXJpYWxpemVEYXRlKGRhdGUpIHtcbiAgICAgICAgcmV0dXJuIHRvSVNPLmNhbGwoZGF0ZSk7XG4gICAgfSxcbiAgICBza2lwTnVsbHM6IGZhbHNlLFxuICAgIHN0cmljdE51bGxIYW5kbGluZzogZmFsc2Vcbn07XG5cbnZhciBzdHJpbmdpZnkgPSBmdW5jdGlvbiBzdHJpbmdpZnkob2JqZWN0LCBwcmVmaXgsIGdlbmVyYXRlQXJyYXlQcmVmaXgsIHN0cmljdE51bGxIYW5kbGluZywgc2tpcE51bGxzLCBlbmNvZGVyLCBmaWx0ZXIsIHNvcnQsIGFsbG93RG90cywgc2VyaWFsaXplRGF0ZSwgZm9ybWF0dGVyKSB7XG4gICAgdmFyIG9iaiA9IG9iamVjdDtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvYmogPSBmaWx0ZXIocHJlZml4LCBvYmopO1xuICAgIH0gZWxzZSBpZiAob2JqIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICBvYmogPSBzZXJpYWxpemVEYXRlKG9iaik7XG4gICAgfSBlbHNlIGlmIChvYmogPT09IG51bGwpIHtcbiAgICAgICAgaWYgKHN0cmljdE51bGxIYW5kbGluZykge1xuICAgICAgICAgICAgcmV0dXJuIGVuY29kZXIgPyBlbmNvZGVyKHByZWZpeCkgOiBwcmVmaXg7XG4gICAgICAgIH1cblxuICAgICAgICBvYmogPSAnJztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIG9iaiA9PT0gJ251bWJlcicgfHwgdHlwZW9mIG9iaiA9PT0gJ2Jvb2xlYW4nIHx8IHV0aWxzLmlzQnVmZmVyKG9iaikpIHtcbiAgICAgICAgaWYgKGVuY29kZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBbZm9ybWF0dGVyKGVuY29kZXIocHJlZml4KSkgKyAnPScgKyBmb3JtYXR0ZXIoZW5jb2RlcihvYmopKV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtmb3JtYXR0ZXIocHJlZml4KSArICc9JyArIGZvcm1hdHRlcihTdHJpbmcob2JqKSldO1xuICAgIH1cblxuICAgIHZhciB2YWx1ZXMgPSBbXTtcblxuICAgIGlmICh0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH1cblxuICAgIHZhciBvYmpLZXlzO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGZpbHRlcikpIHtcbiAgICAgICAgb2JqS2V5cyA9IGZpbHRlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAgICAgIG9iaktleXMgPSBzb3J0ID8ga2V5cy5zb3J0KHNvcnQpIDoga2V5cztcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iaktleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IG9iaktleXNbaV07XG5cbiAgICAgICAgaWYgKHNraXBOdWxscyAmJiBvYmpba2V5XSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSB2YWx1ZXMuY29uY2F0KHN0cmluZ2lmeShcbiAgICAgICAgICAgICAgICBvYmpba2V5XSxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUFycmF5UHJlZml4KHByZWZpeCwga2V5KSxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUFycmF5UHJlZml4LFxuICAgICAgICAgICAgICAgIHN0cmljdE51bGxIYW5kbGluZyxcbiAgICAgICAgICAgICAgICBza2lwTnVsbHMsXG4gICAgICAgICAgICAgICAgZW5jb2RlcixcbiAgICAgICAgICAgICAgICBmaWx0ZXIsXG4gICAgICAgICAgICAgICAgc29ydCxcbiAgICAgICAgICAgICAgICBhbGxvd0RvdHMsXG4gICAgICAgICAgICAgICAgc2VyaWFsaXplRGF0ZSxcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZXJcbiAgICAgICAgICAgICkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWVzID0gdmFsdWVzLmNvbmNhdChzdHJpbmdpZnkoXG4gICAgICAgICAgICAgICAgb2JqW2tleV0sXG4gICAgICAgICAgICAgICAgcHJlZml4ICsgKGFsbG93RG90cyA/ICcuJyArIGtleSA6ICdbJyArIGtleSArICddJyksXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVBcnJheVByZWZpeCxcbiAgICAgICAgICAgICAgICBzdHJpY3ROdWxsSGFuZGxpbmcsXG4gICAgICAgICAgICAgICAgc2tpcE51bGxzLFxuICAgICAgICAgICAgICAgIGVuY29kZXIsXG4gICAgICAgICAgICAgICAgZmlsdGVyLFxuICAgICAgICAgICAgICAgIHNvcnQsXG4gICAgICAgICAgICAgICAgYWxsb3dEb3RzLFxuICAgICAgICAgICAgICAgIHNlcmlhbGl6ZURhdGUsXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVyXG4gICAgICAgICAgICApKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmplY3QsIG9wdHMpIHtcbiAgICB2YXIgb2JqID0gb2JqZWN0O1xuICAgIHZhciBvcHRpb25zID0gb3B0cyB8fCB7fTtcbiAgICB2YXIgZGVsaW1pdGVyID0gdHlwZW9mIG9wdGlvbnMuZGVsaW1pdGVyID09PSAndW5kZWZpbmVkJyA/IGRlZmF1bHRzLmRlbGltaXRlciA6IG9wdGlvbnMuZGVsaW1pdGVyO1xuICAgIHZhciBzdHJpY3ROdWxsSGFuZGxpbmcgPSB0eXBlb2Ygb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgPT09ICdib29sZWFuJyA/IG9wdGlvbnMuc3RyaWN0TnVsbEhhbmRsaW5nIDogZGVmYXVsdHMuc3RyaWN0TnVsbEhhbmRsaW5nO1xuICAgIHZhciBza2lwTnVsbHMgPSB0eXBlb2Ygb3B0aW9ucy5za2lwTnVsbHMgPT09ICdib29sZWFuJyA/IG9wdGlvbnMuc2tpcE51bGxzIDogZGVmYXVsdHMuc2tpcE51bGxzO1xuICAgIHZhciBlbmNvZGUgPSB0eXBlb2Ygb3B0aW9ucy5lbmNvZGUgPT09ICdib29sZWFuJyA/IG9wdGlvbnMuZW5jb2RlIDogZGVmYXVsdHMuZW5jb2RlO1xuICAgIHZhciBlbmNvZGVyID0gZW5jb2RlID8gKHR5cGVvZiBvcHRpb25zLmVuY29kZXIgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLmVuY29kZXIgOiBkZWZhdWx0cy5lbmNvZGVyKSA6IG51bGw7XG4gICAgdmFyIHNvcnQgPSB0eXBlb2Ygb3B0aW9ucy5zb3J0ID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5zb3J0IDogbnVsbDtcbiAgICB2YXIgYWxsb3dEb3RzID0gdHlwZW9mIG9wdGlvbnMuYWxsb3dEb3RzID09PSAndW5kZWZpbmVkJyA/IGZhbHNlIDogb3B0aW9ucy5hbGxvd0RvdHM7XG4gICAgdmFyIHNlcmlhbGl6ZURhdGUgPSB0eXBlb2Ygb3B0aW9ucy5zZXJpYWxpemVEYXRlID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5zZXJpYWxpemVEYXRlIDogZGVmYXVsdHMuc2VyaWFsaXplRGF0ZTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuZm9ybWF0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBvcHRpb25zLmZvcm1hdCA9IGZvcm1hdHMuZGVmYXVsdDtcbiAgICB9IGVsc2UgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZm9ybWF0cy5mb3JtYXR0ZXJzLCBvcHRpb25zLmZvcm1hdCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBmb3JtYXQgb3B0aW9uIHByb3ZpZGVkLicpO1xuICAgIH1cbiAgICB2YXIgZm9ybWF0dGVyID0gZm9ybWF0cy5mb3JtYXR0ZXJzW29wdGlvbnMuZm9ybWF0XTtcbiAgICB2YXIgb2JqS2V5cztcbiAgICB2YXIgZmlsdGVyO1xuXG4gICAgaWYgKG9wdGlvbnMuZW5jb2RlciAhPT0gbnVsbCAmJiBvcHRpb25zLmVuY29kZXIgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5lbmNvZGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0VuY29kZXIgaGFzIHRvIGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLmZpbHRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBmaWx0ZXIgPSBvcHRpb25zLmZpbHRlcjtcbiAgICAgICAgb2JqID0gZmlsdGVyKCcnLCBvYmopO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLmZpbHRlcikpIHtcbiAgICAgICAgZmlsdGVyID0gb3B0aW9ucy5maWx0ZXI7XG4gICAgICAgIG9iaktleXMgPSBmaWx0ZXI7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBbXTtcblxuICAgIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH1cblxuICAgIHZhciBhcnJheUZvcm1hdDtcbiAgICBpZiAob3B0aW9ucy5hcnJheUZvcm1hdCBpbiBhcnJheVByZWZpeEdlbmVyYXRvcnMpIHtcbiAgICAgICAgYXJyYXlGb3JtYXQgPSBvcHRpb25zLmFycmF5Rm9ybWF0O1xuICAgIH0gZWxzZSBpZiAoJ2luZGljZXMnIGluIG9wdGlvbnMpIHtcbiAgICAgICAgYXJyYXlGb3JtYXQgPSBvcHRpb25zLmluZGljZXMgPyAnaW5kaWNlcycgOiAncmVwZWF0JztcbiAgICB9IGVsc2Uge1xuICAgICAgICBhcnJheUZvcm1hdCA9ICdpbmRpY2VzJztcbiAgICB9XG5cbiAgICB2YXIgZ2VuZXJhdGVBcnJheVByZWZpeCA9IGFycmF5UHJlZml4R2VuZXJhdG9yc1thcnJheUZvcm1hdF07XG5cbiAgICBpZiAoIW9iaktleXMpIHtcbiAgICAgICAgb2JqS2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG4gICAgfVxuXG4gICAgaWYgKHNvcnQpIHtcbiAgICAgICAgb2JqS2V5cy5zb3J0KHNvcnQpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqS2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIga2V5ID0gb2JqS2V5c1tpXTtcblxuICAgICAgICBpZiAoc2tpcE51bGxzICYmIG9ialtrZXldID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGtleXMgPSBrZXlzLmNvbmNhdChzdHJpbmdpZnkoXG4gICAgICAgICAgICBvYmpba2V5XSxcbiAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgIGdlbmVyYXRlQXJyYXlQcmVmaXgsXG4gICAgICAgICAgICBzdHJpY3ROdWxsSGFuZGxpbmcsXG4gICAgICAgICAgICBza2lwTnVsbHMsXG4gICAgICAgICAgICBlbmNvZGVyLFxuICAgICAgICAgICAgZmlsdGVyLFxuICAgICAgICAgICAgc29ydCxcbiAgICAgICAgICAgIGFsbG93RG90cyxcbiAgICAgICAgICAgIHNlcmlhbGl6ZURhdGUsXG4gICAgICAgICAgICBmb3JtYXR0ZXJcbiAgICAgICAgKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGtleXMuam9pbihkZWxpbWl0ZXIpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxudmFyIGRlZmF1bHRzID0ge1xuICAgIGFsbG93RG90czogZmFsc2UsXG4gICAgYWxsb3dQcm90b3R5cGVzOiBmYWxzZSxcbiAgICBhcnJheUxpbWl0OiAyMCxcbiAgICBkZWNvZGVyOiB1dGlscy5kZWNvZGUsXG4gICAgZGVsaW1pdGVyOiAnJicsXG4gICAgZGVwdGg6IDUsXG4gICAgcGFyYW1ldGVyTGltaXQ6IDEwMDAsXG4gICAgcGxhaW5PYmplY3RzOiBmYWxzZSxcbiAgICBzdHJpY3ROdWxsSGFuZGxpbmc6IGZhbHNlXG59O1xuXG52YXIgcGFyc2VWYWx1ZXMgPSBmdW5jdGlvbiBwYXJzZVZhbHVlcyhzdHIsIG9wdGlvbnMpIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgdmFyIHBhcnRzID0gc3RyLnNwbGl0KG9wdGlvbnMuZGVsaW1pdGVyLCBvcHRpb25zLnBhcmFtZXRlckxpbWl0ID09PSBJbmZpbml0eSA/IHVuZGVmaW5lZCA6IG9wdGlvbnMucGFyYW1ldGVyTGltaXQpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2ldO1xuICAgICAgICB2YXIgcG9zID0gcGFydC5pbmRleE9mKCddPScpID09PSAtMSA/IHBhcnQuaW5kZXhPZignPScpIDogcGFydC5pbmRleE9mKCddPScpICsgMTtcblxuICAgICAgICB2YXIga2V5LCB2YWw7XG4gICAgICAgIGlmIChwb3MgPT09IC0xKSB7XG4gICAgICAgICAgICBrZXkgPSBvcHRpb25zLmRlY29kZXIocGFydCk7XG4gICAgICAgICAgICB2YWwgPSBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA/IG51bGwgOiAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleSA9IG9wdGlvbnMuZGVjb2RlcihwYXJ0LnNsaWNlKDAsIHBvcykpO1xuICAgICAgICAgICAgdmFsID0gb3B0aW9ucy5kZWNvZGVyKHBhcnQuc2xpY2UocG9zICsgMSkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoYXMuY2FsbChvYmosIGtleSkpIHtcbiAgICAgICAgICAgIG9ialtrZXldID0gW10uY29uY2F0KG9ialtrZXldKS5jb25jYXQodmFsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9ialtrZXldID0gdmFsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBwYXJzZU9iamVjdCA9IGZ1bmN0aW9uIHBhcnNlT2JqZWN0KGNoYWluLCB2YWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoIWNoYWluLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH1cblxuICAgIHZhciByb290ID0gY2hhaW4uc2hpZnQoKTtcblxuICAgIHZhciBvYmo7XG4gICAgaWYgKHJvb3QgPT09ICdbXScpIHtcbiAgICAgICAgb2JqID0gW107XG4gICAgICAgIG9iaiA9IG9iai5jb25jYXQocGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG9iaiA9IG9wdGlvbnMucGxhaW5PYmplY3RzID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuICAgICAgICB2YXIgY2xlYW5Sb290ID0gcm9vdFswXSA9PT0gJ1snICYmIHJvb3Rbcm9vdC5sZW5ndGggLSAxXSA9PT0gJ10nID8gcm9vdC5zbGljZSgxLCByb290Lmxlbmd0aCAtIDEpIDogcm9vdDtcbiAgICAgICAgdmFyIGluZGV4ID0gcGFyc2VJbnQoY2xlYW5Sb290LCAxMCk7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgICFpc05hTihpbmRleCkgJiZcbiAgICAgICAgICAgIHJvb3QgIT09IGNsZWFuUm9vdCAmJlxuICAgICAgICAgICAgU3RyaW5nKGluZGV4KSA9PT0gY2xlYW5Sb290ICYmXG4gICAgICAgICAgICBpbmRleCA+PSAwICYmXG4gICAgICAgICAgICAob3B0aW9ucy5wYXJzZUFycmF5cyAmJiBpbmRleCA8PSBvcHRpb25zLmFycmF5TGltaXQpXG4gICAgICAgICkge1xuICAgICAgICAgICAgb2JqID0gW107XG4gICAgICAgICAgICBvYmpbaW5kZXhdID0gcGFyc2VPYmplY3QoY2hhaW4sIHZhbCwgb3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvYmpbY2xlYW5Sb290XSA9IHBhcnNlT2JqZWN0KGNoYWluLCB2YWwsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBwYXJzZUtleXMgPSBmdW5jdGlvbiBwYXJzZUtleXMoZ2l2ZW5LZXksIHZhbCwgb3B0aW9ucykge1xuICAgIGlmICghZ2l2ZW5LZXkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRyYW5zZm9ybSBkb3Qgbm90YXRpb24gdG8gYnJhY2tldCBub3RhdGlvblxuICAgIHZhciBrZXkgPSBvcHRpb25zLmFsbG93RG90cyA/IGdpdmVuS2V5LnJlcGxhY2UoL1xcLihbXlxcLlxcW10rKS9nLCAnWyQxXScpIDogZ2l2ZW5LZXk7XG5cbiAgICAvLyBUaGUgcmVnZXggY2h1bmtzXG5cbiAgICB2YXIgcGFyZW50ID0gL14oW15cXFtcXF1dKikvO1xuICAgIHZhciBjaGlsZCA9IC8oXFxbW15cXFtcXF1dKlxcXSkvZztcblxuICAgIC8vIEdldCB0aGUgcGFyZW50XG5cbiAgICB2YXIgc2VnbWVudCA9IHBhcmVudC5leGVjKGtleSk7XG5cbiAgICAvLyBTdGFzaCB0aGUgcGFyZW50IGlmIGl0IGV4aXN0c1xuXG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBpZiAoc2VnbWVudFsxXSkge1xuICAgICAgICAvLyBJZiB3ZSBhcmVuJ3QgdXNpbmcgcGxhaW4gb2JqZWN0cywgb3B0aW9uYWxseSBwcmVmaXgga2V5c1xuICAgICAgICAvLyB0aGF0IHdvdWxkIG92ZXJ3cml0ZSBvYmplY3QgcHJvdG90eXBlIHByb3BlcnRpZXNcbiAgICAgICAgaWYgKCFvcHRpb25zLnBsYWluT2JqZWN0cyAmJiBoYXMuY2FsbChPYmplY3QucHJvdG90eXBlLCBzZWdtZW50WzFdKSkge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zLmFsbG93UHJvdG90eXBlcykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGtleXMucHVzaChzZWdtZW50WzFdKTtcbiAgICB9XG5cbiAgICAvLyBMb29wIHRocm91Z2ggY2hpbGRyZW4gYXBwZW5kaW5nIHRvIHRoZSBhcnJheSB1bnRpbCB3ZSBoaXQgZGVwdGhcblxuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZSAoKHNlZ21lbnQgPSBjaGlsZC5leGVjKGtleSkpICE9PSBudWxsICYmIGkgPCBvcHRpb25zLmRlcHRoKSB7XG4gICAgICAgIGkgKz0gMTtcbiAgICAgICAgaWYgKCFvcHRpb25zLnBsYWluT2JqZWN0cyAmJiBoYXMuY2FsbChPYmplY3QucHJvdG90eXBlLCBzZWdtZW50WzFdLnJlcGxhY2UoL1xcW3xcXF0vZywgJycpKSkge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zLmFsbG93UHJvdG90eXBlcykge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGtleXMucHVzaChzZWdtZW50WzFdKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSdzIGEgcmVtYWluZGVyLCBqdXN0IGFkZCB3aGF0ZXZlciBpcyBsZWZ0XG5cbiAgICBpZiAoc2VnbWVudCkge1xuICAgICAgICBrZXlzLnB1c2goJ1snICsga2V5LnNsaWNlKHNlZ21lbnQuaW5kZXgpICsgJ10nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VPYmplY3Qoa2V5cywgdmFsLCBvcHRpb25zKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0ciwgb3B0cykge1xuICAgIHZhciBvcHRpb25zID0gb3B0cyB8fCB7fTtcblxuICAgIGlmIChvcHRpb25zLmRlY29kZXIgIT09IG51bGwgJiYgb3B0aW9ucy5kZWNvZGVyICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuZGVjb2RlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdEZWNvZGVyIGhhcyB0byBiZSBhIGZ1bmN0aW9uLicpO1xuICAgIH1cblxuICAgIG9wdGlvbnMuZGVsaW1pdGVyID0gdHlwZW9mIG9wdGlvbnMuZGVsaW1pdGVyID09PSAnc3RyaW5nJyB8fCB1dGlscy5pc1JlZ0V4cChvcHRpb25zLmRlbGltaXRlcikgPyBvcHRpb25zLmRlbGltaXRlciA6IGRlZmF1bHRzLmRlbGltaXRlcjtcbiAgICBvcHRpb25zLmRlcHRoID0gdHlwZW9mIG9wdGlvbnMuZGVwdGggPT09ICdudW1iZXInID8gb3B0aW9ucy5kZXB0aCA6IGRlZmF1bHRzLmRlcHRoO1xuICAgIG9wdGlvbnMuYXJyYXlMaW1pdCA9IHR5cGVvZiBvcHRpb25zLmFycmF5TGltaXQgPT09ICdudW1iZXInID8gb3B0aW9ucy5hcnJheUxpbWl0IDogZGVmYXVsdHMuYXJyYXlMaW1pdDtcbiAgICBvcHRpb25zLnBhcnNlQXJyYXlzID0gb3B0aW9ucy5wYXJzZUFycmF5cyAhPT0gZmFsc2U7XG4gICAgb3B0aW9ucy5kZWNvZGVyID0gdHlwZW9mIG9wdGlvbnMuZGVjb2RlciA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuZGVjb2RlciA6IGRlZmF1bHRzLmRlY29kZXI7XG4gICAgb3B0aW9ucy5hbGxvd0RvdHMgPSB0eXBlb2Ygb3B0aW9ucy5hbGxvd0RvdHMgPT09ICdib29sZWFuJyA/IG9wdGlvbnMuYWxsb3dEb3RzIDogZGVmYXVsdHMuYWxsb3dEb3RzO1xuICAgIG9wdGlvbnMucGxhaW5PYmplY3RzID0gdHlwZW9mIG9wdGlvbnMucGxhaW5PYmplY3RzID09PSAnYm9vbGVhbicgPyBvcHRpb25zLnBsYWluT2JqZWN0cyA6IGRlZmF1bHRzLnBsYWluT2JqZWN0cztcbiAgICBvcHRpb25zLmFsbG93UHJvdG90eXBlcyA9IHR5cGVvZiBvcHRpb25zLmFsbG93UHJvdG90eXBlcyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5hbGxvd1Byb3RvdHlwZXMgOiBkZWZhdWx0cy5hbGxvd1Byb3RvdHlwZXM7XG4gICAgb3B0aW9ucy5wYXJhbWV0ZXJMaW1pdCA9IHR5cGVvZiBvcHRpb25zLnBhcmFtZXRlckxpbWl0ID09PSAnbnVtYmVyJyA/IG9wdGlvbnMucGFyYW1ldGVyTGltaXQgOiBkZWZhdWx0cy5wYXJhbWV0ZXJMaW1pdDtcbiAgICBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA9IHR5cGVvZiBvcHRpb25zLnN0cmljdE51bGxIYW5kbGluZyA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5zdHJpY3ROdWxsSGFuZGxpbmcgOiBkZWZhdWx0cy5zdHJpY3ROdWxsSGFuZGxpbmc7XG5cbiAgICBpZiAoc3RyID09PSAnJyB8fCBzdHIgPT09IG51bGwgfHwgdHlwZW9mIHN0ciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMucGxhaW5PYmplY3RzID8gT2JqZWN0LmNyZWF0ZShudWxsKSA6IHt9O1xuICAgIH1cblxuICAgIHZhciB0ZW1wT2JqID0gdHlwZW9mIHN0ciA9PT0gJ3N0cmluZycgPyBwYXJzZVZhbHVlcyhzdHIsIG9wdGlvbnMpIDogc3RyO1xuICAgIHZhciBvYmogPSBvcHRpb25zLnBsYWluT2JqZWN0cyA/IE9iamVjdC5jcmVhdGUobnVsbCkgOiB7fTtcblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUga2V5cyBhbmQgc2V0dXAgdGhlIG5ldyBvYmplY3RcblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGVtcE9iaik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICB2YXIgbmV3T2JqID0gcGFyc2VLZXlzKGtleSwgdGVtcE9ialtrZXldLCBvcHRpb25zKTtcbiAgICAgICAgb2JqID0gdXRpbHMubWVyZ2Uob2JqLCBuZXdPYmosIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHJldHVybiB1dGlscy5jb21wYWN0KG9iaik7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9zdHJpbmdpZnknKTtcbnZhciBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKTtcbnZhciBmb3JtYXRzID0gcmVxdWlyZSgnLi9mb3JtYXRzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGZvcm1hdHM6IGZvcm1hdHMsXG4gICAgcGFyc2U6IHBhcnNlLFxuICAgIHN0cmluZ2lmeTogc3RyaW5naWZ5XG59O1xuIiwiaW1wb3J0IHsgc3RyaW5naWZ5IGFzIHN0cmluZ2lmeVBhcmFtcyB9IGZyb20gJ3FzJztcblxuLyoqXG4gKiBTdHJpbmdpZnkgYW5kIGNvbmNhdHMgcGFyYW1zIHRvIHRoZSBwcm92aWRlZCBVUkxcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gVVJMIFRoZSBVUkxcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgVGhlIHBhcmFtcyBPYmplY3RcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSB1cmwgYW5kIHBhcmFtcyBjb21iaW5lZFxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBjb25jYXRQYXJhbXMoVVJMLCBwYXJhbXMpIHtcbiAgaWYgKCFwYXJhbXMpIHtcbiAgICByZXR1cm4gVVJMO1xuICB9XG4gIHJldHVybiBgJHtVUkx9PyR7c3RyaW5naWZ5UGFyYW1zKHBhcmFtcyl9YDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFVSTCBieSBjb21iaW5pbmcgdGhlIHNwZWNpZmllZCBVUkxzXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVUkwgVGhlIGJhc2UgVVJMXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIFVSTFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbWJpbmVkIFVSTFxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5lKGJhc2VVUkwsIHJlbGF0aXZlVVJMKSB7XG4gIHJldHVybiBgJHtiYXNlVVJMLnJlcGxhY2UoL1xcLyskLywgJycpfS8ke3JlbGF0aXZlVVJMLnJlcGxhY2UoL15cXC8rLywgJycpfWA7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgVVJMIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQWJzb2x1dGUodXJsKSB7XG4gIC8vIEEgVVJMIGlzIGNvbnNpZGVyZWQgYWJzb2x1dGUgaWYgaXQgYmVnaW5zIHdpdGggXCI8c2NoZW1lPjovL1wiIG9yIFwiLy9cIiAocHJvdG9jb2wtcmVsYXRpdmUgVVJMKS5cbiAgLy8gUkZDIDM5ODYgZGVmaW5lcyBzY2hlbWUgbmFtZSBhcyBhIHNlcXVlbmNlIG9mIGNoYXJhY3RlcnMgYmVnaW5uaW5nIHdpdGggYSBsZXR0ZXIgYW5kIGZvbGxvd2VkXG4gIC8vIGJ5IGFueSBjb21iaW5hdGlvbiBvZiBsZXR0ZXJzLCBkaWdpdHMsIHBsdXMsIHBlcmlvZCwgb3IgaHlwaGVuLlxuICByZXR1cm4gL14oW2Etel1bYS16XFxkXFwrXFwtXFwuXSo6KT9cXC9cXC8vaS50ZXN0KHVybCk7XG59XG5cbi8qKlxuICogRm9ybWF0IGFuIHVybCBjb21iaW5pbmcgcHJvdmlkZWQgdXJscyBvciByZXR1cm5pbmcgdGhlIHJlbGF0aXZlVVJMXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVcmwgVGhlIGJhc2UgdXJsXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIHVybFxuICogQHJldHVybnMge3N0cmluZ30gcmVsYXRpdmVVUkwgaWYgdGhlIHNwZWNpZmllZCByZWxhdGl2ZVVSTCBpcyBhYnNvbHV0ZSBvciBiYXNlVXJsIGlzIG5vdCBkZWZpbmVkLFxuICogICAgICAgICAgICAgICAgICAgb3RoZXJ3aXNlIGl0IHJldHVybnMgdGhlIGNvbWJpbmF0aW9uIG9mIGJvdGggdXJsc1xuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyBUaGUgcGFyYW1zIG9iamVjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0KGJhc2VVcmwsIHJlbGF0aXZlVVJMLCBwYXJhbXMpIHtcbiAgaWYgKCFiYXNlVXJsIHx8IGlzQWJzb2x1dGUocmVsYXRpdmVVUkwpKSB7XG4gICAgcmV0dXJuIGNvbmNhdFBhcmFtcyhyZWxhdGl2ZVVSTCwgcGFyYW1zKTtcbiAgfVxuXG4gIHJldHVybiBjb25jYXRQYXJhbXMoY29tYmluZShiYXNlVXJsLCByZWxhdGl2ZVVSTCksIHBhcmFtcyk7XG59XG4iLCIvKiFcclxuICogQG5hbWUgSmF2YVNjcmlwdC9Ob2RlSlMgTWVyZ2UgdjEuMi4wXHJcbiAqIEBhdXRob3IgeWVpa29zXHJcbiAqIEByZXBvc2l0b3J5IGh0dHBzOi8vZ2l0aHViLmNvbS95ZWlrb3MvanMubWVyZ2VcclxuXHJcbiAqIENvcHlyaWdodCAyMDE0IHllaWtvcyAtIE1JVCBsaWNlbnNlXHJcbiAqIGh0dHBzOi8vcmF3LmdpdGh1Yi5jb20veWVpa29zL2pzLm1lcmdlL21hc3Rlci9MSUNFTlNFXHJcbiAqL1xyXG5cclxuOyhmdW5jdGlvbihpc05vZGUpIHtcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2Ugb25lIG9yIG1vcmUgb2JqZWN0cyBcclxuXHQgKiBAcGFyYW0gYm9vbD8gY2xvbmVcclxuXHQgKiBAcGFyYW0gbWl4ZWQsLi4uIGFyZ3VtZW50c1xyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdHZhciBQdWJsaWMgPSBmdW5jdGlvbihjbG9uZSkge1xyXG5cclxuXHRcdHJldHVybiBtZXJnZShjbG9uZSA9PT0gdHJ1ZSwgZmFsc2UsIGFyZ3VtZW50cyk7XHJcblxyXG5cdH0sIHB1YmxpY05hbWUgPSAnbWVyZ2UnO1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb3IgbW9yZSBvYmplY3RzIHJlY3Vyc2l2ZWx5IFxyXG5cdCAqIEBwYXJhbSBib29sPyBjbG9uZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCwuLi4gYXJndW1lbnRzXHJcblx0ICogQHJldHVybiBvYmplY3RcclxuXHQgKi9cclxuXHJcblx0UHVibGljLnJlY3Vyc2l2ZSA9IGZ1bmN0aW9uKGNsb25lKSB7XHJcblxyXG5cdFx0cmV0dXJuIG1lcmdlKGNsb25lID09PSB0cnVlLCB0cnVlLCBhcmd1bWVudHMpO1xyXG5cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBDbG9uZSB0aGUgaW5wdXQgcmVtb3ZpbmcgYW55IHJlZmVyZW5jZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEByZXR1cm4gbWl4ZWRcclxuXHQgKi9cclxuXHJcblx0UHVibGljLmNsb25lID0gZnVuY3Rpb24oaW5wdXQpIHtcclxuXHJcblx0XHR2YXIgb3V0cHV0ID0gaW5wdXQsXHJcblx0XHRcdHR5cGUgPSB0eXBlT2YoaW5wdXQpLFxyXG5cdFx0XHRpbmRleCwgc2l6ZTtcclxuXHJcblx0XHRpZiAodHlwZSA9PT0gJ2FycmF5Jykge1xyXG5cclxuXHRcdFx0b3V0cHV0ID0gW107XHJcblx0XHRcdHNpemUgPSBpbnB1dC5sZW5ndGg7XHJcblxyXG5cdFx0XHRmb3IgKGluZGV4PTA7aW5kZXg8c2l6ZTsrK2luZGV4KVxyXG5cclxuXHRcdFx0XHRvdXRwdXRbaW5kZXhdID0gUHVibGljLmNsb25lKGlucHV0W2luZGV4XSk7XHJcblxyXG5cdFx0fSBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0b3V0cHV0ID0ge307XHJcblxyXG5cdFx0XHRmb3IgKGluZGV4IGluIGlucHV0KVxyXG5cclxuXHRcdFx0XHRvdXRwdXRbaW5kZXhdID0gUHVibGljLmNsb25lKGlucHV0W2luZGV4XSk7XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBvdXRwdXQ7XHJcblxyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHR3byBvYmplY3RzIHJlY3Vyc2l2ZWx5XHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHBhcmFtIG1peGVkIGV4dGVuZFxyXG5cdCAqIEByZXR1cm4gbWl4ZWRcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gbWVyZ2VfcmVjdXJzaXZlKGJhc2UsIGV4dGVuZCkge1xyXG5cclxuXHRcdGlmICh0eXBlT2YoYmFzZSkgIT09ICdvYmplY3QnKVxyXG5cclxuXHRcdFx0cmV0dXJuIGV4dGVuZDtcclxuXHJcblx0XHRmb3IgKHZhciBrZXkgaW4gZXh0ZW5kKSB7XHJcblxyXG5cdFx0XHRpZiAodHlwZU9mKGJhc2Vba2V5XSkgPT09ICdvYmplY3QnICYmIHR5cGVPZihleHRlbmRba2V5XSkgPT09ICdvYmplY3QnKSB7XHJcblxyXG5cdFx0XHRcdGJhc2Vba2V5XSA9IG1lcmdlX3JlY3Vyc2l2ZShiYXNlW2tleV0sIGV4dGVuZFtrZXldKTtcclxuXHJcblx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdGJhc2Vba2V5XSA9IGV4dGVuZFtrZXldO1xyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gYmFzZTtcclxuXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb3IgbW9yZSBvYmplY3RzXHJcblx0ICogQHBhcmFtIGJvb2wgY2xvbmVcclxuXHQgKiBAcGFyYW0gYm9vbCByZWN1cnNpdmVcclxuXHQgKiBAcGFyYW0gYXJyYXkgYXJndlxyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIG1lcmdlKGNsb25lLCByZWN1cnNpdmUsIGFyZ3YpIHtcclxuXHJcblx0XHR2YXIgcmVzdWx0ID0gYXJndlswXSxcclxuXHRcdFx0c2l6ZSA9IGFyZ3YubGVuZ3RoO1xyXG5cclxuXHRcdGlmIChjbG9uZSB8fCB0eXBlT2YocmVzdWx0KSAhPT0gJ29iamVjdCcpXHJcblxyXG5cdFx0XHRyZXN1bHQgPSB7fTtcclxuXHJcblx0XHRmb3IgKHZhciBpbmRleD0wO2luZGV4PHNpemU7KytpbmRleCkge1xyXG5cclxuXHRcdFx0dmFyIGl0ZW0gPSBhcmd2W2luZGV4XSxcclxuXHJcblx0XHRcdFx0dHlwZSA9IHR5cGVPZihpdGVtKTtcclxuXHJcblx0XHRcdGlmICh0eXBlICE9PSAnb2JqZWN0JykgY29udGludWU7XHJcblxyXG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gaXRlbSkge1xyXG5cclxuXHRcdFx0XHR2YXIgc2l0ZW0gPSBjbG9uZSA/IFB1YmxpYy5jbG9uZShpdGVtW2tleV0pIDogaXRlbVtrZXldO1xyXG5cclxuXHRcdFx0XHRpZiAocmVjdXJzaXZlKSB7XHJcblxyXG5cdFx0XHRcdFx0cmVzdWx0W2tleV0gPSBtZXJnZV9yZWN1cnNpdmUocmVzdWx0W2tleV0sIHNpdGVtKTtcclxuXHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0XHRyZXN1bHRba2V5XSA9IHNpdGVtO1xyXG5cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHR5cGUgb2YgdmFyaWFibGVcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcmV0dXJuIHN0cmluZ1xyXG5cdCAqXHJcblx0ICogQHNlZSBodHRwOi8vanNwZXJmLmNvbS90eXBlb2Z2YXJcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gdHlwZU9mKGlucHV0KSB7XHJcblxyXG5cdFx0cmV0dXJuICh7fSkudG9TdHJpbmcuY2FsbChpbnB1dCkuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdH1cclxuXHJcblx0aWYgKGlzTm9kZSkge1xyXG5cclxuXHRcdG1vZHVsZS5leHBvcnRzID0gUHVibGljO1xyXG5cclxuXHR9IGVsc2Uge1xyXG5cclxuXHRcdHdpbmRvd1twdWJsaWNOYW1lXSA9IFB1YmxpYztcclxuXHJcblx0fVxyXG5cclxufSkodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpOyIsImltcG9ydCBfbWVyZ2UgZnJvbSAnbWVyZ2UnO1xuXG5cbi8qKlxuICogUmVjdXJzaXZlbHkgbWVyZ2Ugb2JqZWN0c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3RzIHRvIG1lcmdlXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBtZXJnZWQgb2JqZWN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2UoLi4ucGFyYW1zKSAge1xuICByZXR1cm4gX21lcmdlLnJlY3Vyc2l2ZSh0cnVlLCAuLi5wYXJhbXMpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHNraXBwZWQgcHJvcGVydGllc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIG9iamVjdCB0byBza2lwIHByb3BlcnRpZXMgZnJvbVxuICogQHBhcmFtIHtbU3RyaW5nXX0ga2V5cyBrZXlzIG9mIHRoZSBwcm9wZXJ0aWVzIHRvIHNraXBcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIG9iamVjdCB3aXRoIHRoZSBwcm9wZXJ0aWVzIHNraXBwZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNraXAob2JqLCBrZXlzKSB7XG4gIGNvbnN0IHNraXBwZWQgPSB7fTtcbiAgT2JqZWN0LmtleXMob2JqKS5mb3JFYWNoKChvYmpLZXkpID0+IHtcbiAgICBpZiAoa2V5cy5pbmRleE9mKG9iaktleSkgPT09IC0xKSB7XG4gICAgICBza2lwcGVkW29iaktleV0gPSBvYmpbb2JqS2V5XTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gc2tpcHBlZDtcbn1cbiIsImNvbnN0IGlkZW50aXR5ICA9IHJlc3BvbnNlID0+IHJlc3BvbnNlO1xuY29uc3QgcmVqZWN0aW9uID0gZXJyID0+IFByb21pc2UucmVqZWN0KGVycik7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWlkZGxld2FyZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX2JlZm9yZSAgPSBbXTtcbiAgICB0aGlzLl9hZnRlciAgID0gW107XG4gICAgdGhpcy5fZmluYWxseSA9IFtdO1xuICB9XG5cbiAgYmVmb3JlKGZuKSB7XG4gICAgdGhpcy5fYmVmb3JlLnB1c2goZm4pO1xuICAgIHJldHVybiB0aGlzLl9iZWZvcmUubGVuZ3RoIC0gMTtcbiAgfVxuXG4gIGFmdGVyKGZ1bGZpbGwgPSBpZGVudGl0eSwgcmVqZWN0ID0gcmVqZWN0aW9uKSB7XG4gICAgdGhpcy5fYWZ0ZXIucHVzaCh7IGZ1bGZpbGwsIHJlamVjdCB9KTtcbiAgICByZXR1cm4gdGhpcy5fYWZ0ZXIubGVuZ3RoIC0gMTtcbiAgfVxuXG4gIGZpbmFsbHkoZm4pIHtcbiAgICB0aGlzLl9maW5hbGx5LnB1c2goZm4pO1xuICAgIHJldHVybiB0aGlzLl9maW5hbGx5Lmxlbmd0aCAtIDE7XG4gIH1cblxuICByZXNvbHZlQmVmb3JlKGNvbmZpZykge1xuICAgIGNvbnN0IGNoYWluID0gKHByb21pc2UsIHRhc2spID0+IHByb21pc2UudGhlbih0YXNrKTtcbiAgICByZXR1cm4gdGhpcy5fYmVmb3JlLnJlZHVjZShjaGFpbiwgUHJvbWlzZS5yZXNvbHZlKGNvbmZpZykpO1xuICB9XG5cbiAgcmVzb2x2ZUFmdGVyKGVyciwgcmVzcG9uc2UpIHtcbiAgICBjb25zdCBjaGFpbiAgID0gKHByb21pc2UsIHRhc2spID0+IHByb21pc2UudGhlbih0YXNrLmZ1bGZpbGwsIHRhc2sucmVqZWN0KTtcbiAgICBjb25zdCBpbml0aWFsID0gZXJyID8gUHJvbWlzZS5yZWplY3QoZXJyKSA6IFByb21pc2UucmVzb2x2ZShyZXNwb25zZSk7XG4gICAgcmV0dXJuIHRoaXMuX2FmdGVyLnJlZHVjZShjaGFpbiwgaW5pdGlhbCk7XG4gIH1cblxuXG4gIHJlc29sdmVGaW5hbGx5KCkge1xuICAgIHRoaXMuX2ZpbmFsbHkuZm9yRWFjaCh0YXNrID0+IHRhc2soKSk7XG4gIH1cbn1cbiIsImltcG9ydCB7IG1lcmdlIH0gZnJvbSAnLi91dGlscyc7XG5cblxuY29uc3QgREVGQVVMVF9IRUFERVJTID0ge1xuICAnQWNjZXB0JyAgICAgIDogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvcGxhaW4sICovKicsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgcXVvdGUtcHJvcHNcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xufTtcblxuY29uc3QgREVGQVVMVF9DT05GSUcgPSB7XG4gIHhzcmZDb29raWVOYW1lOiAnWFNSRi1UT0tFTicsXG4gIHhzcmZIZWFkZXJOYW1lOiAnWC1YU1JGLVRPS0VOJ1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29uZmlnIHtcbiAgY29uc3RydWN0b3IoY29uZmlnID0ge30pIHtcbiAgICB0aGlzLl9kZWZhdWx0cyA9IG1lcmdlKERFRkFVTFRfQ09ORklHLCB7IGhlYWRlcnM6IERFRkFVTFRfSEVBREVSUyB9KTtcbiAgICB0aGlzLl9jb25maWcgICA9IHt9O1xuXG4gICAgdGhpcy5zZXQoY29uZmlnKTtcbiAgfVxuXG4gIG1lcmdlV2l0aERlZmF1bHRzKC4uLmNvbmZpZ1BhcmFtcykge1xuICAgIGNvbnN0IGNvbmZpZyA9IG1lcmdlKHRoaXMuX2RlZmF1bHRzLCB0aGlzLl9jb25maWcsIC4uLmNvbmZpZ1BhcmFtcyk7XG4gICAgaWYgKFxuICAgICAgdHlwZW9mIGNvbmZpZy5ib2R5ID09PSAnb2JqZWN0JyAmJlxuICAgICAgY29uZmlnLmhlYWRlcnMgJiZcbiAgICAgIGNvbmZpZy5oZWFkZXJzWydDb250ZW50LVR5cGUnXSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgKSB7XG4gICAgICBjb25maWcuYm9keSA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZy5ib2R5KTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIHNldChjb25maWcpIHtcbiAgICB0aGlzLl9jb25maWcgPSBtZXJnZSh0aGlzLl9jb25maWcsIGNvbmZpZyk7XG4gIH1cblxuICBnZXQoKSB7XG4gICAgcmV0dXJuIG1lcmdlKHRoaXMuX2RlZmF1bHRzLCB0aGlzLl9jb25maWcpO1xuICB9XG59XG4iLCIvKipcbiAqIFdyYXAgYSByZXNwb25zZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSByZXNwb25zZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSByZWFkZXIgdHlwZSBvZiByZWFkZXIgdG8gdXNlIG9uIHJlc3BvbnNlIGJvZHlcbiAqIEByZXR1cm4ge1Byb21pc2V9IHJlc29sdmVzIHRvIHRoZSB3cmFwcGVkIHJlYWQgcmVzcG9uc2VcbiAqL1xuZnVuY3Rpb24gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCByZWFkZXIpIHtcbiAgY29uc3QgcmVzID0ge1xuICAgIGhlYWRlcnMgICA6IHJlc3BvbnNlLmhlYWRlcnMsXG4gICAgc3RhdHVzICAgIDogcmVzcG9uc2Uuc3RhdHVzLFxuICAgIHN0YXR1c1RleHQ6IHJlc3BvbnNlLnN0YXR1c1RleHRcbiAgfTtcblxuICBpZiAocmVhZGVyID09PSAncmF3Jykge1xuICAgIHJlcy5kYXRhID0gcmVzcG9uc2UuYm9keTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcmV0dXJuIHJlc3BvbnNlW3JlYWRlcl0oKVxuICAudGhlbigoZGF0YSkgPT4ge1xuICAgIHJlcy5kYXRhID0gZGF0YTtcbiAgICByZXR1cm4gcmVzO1xuICB9KTtcbn1cblxuLyoqXG4gKiBSZWFkcyBvciByZWplY3RzIGEgZmV0Y2ggcmVzcG9uc2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgcmVzcG9uc2Ugb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gcmVhZGVyIHR5cGUgb2YgcmVhZGVyIHRvIHVzZSBvbiByZXNwb25zZSBib2R5XG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZWFkIG9yIHJlamVjdGlvbiBwcm9taXNlXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSwgcmVhZGVyKSB7XG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICBjb25zdCBlcnIgICAgICAgPSBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgZXJyLnN0YXR1cyAgICAgID0gcmVzcG9uc2Uuc3RhdHVzO1xuICAgIGVyci5zdGF0dXNUZXh0ICA9IHJlc3BvbnNlLnN0YXR1c1RleHQ7XG4gICAgZXJyLmhlYWRlcnMgICAgID0gcmVzcG9uc2UuaGVhZGVycztcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgfVxuICBpZiAocmVhZGVyKSB7XG4gICAgcmV0dXJuIHdyYXBSZXNwb25zZShyZXNwb25zZSwgcmVhZGVyKTtcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpO1xuICBpZiAoY29udGVudFR5cGUgJiYgY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgIHJldHVybiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsICdqc29uJyk7XG4gIH1cbiAgcmV0dXJuIHdyYXBSZXNwb25zZShyZXNwb25zZSwgJ3RleHQnKTtcbn1cbiIsImltcG9ydCAnd2hhdHdnLWZldGNoJztcblxuaW1wb3J0IHsgZm9ybWF0IGFzIGZvcm1hdFVybCB9IGZyb20gJy4vaGVscGVycy91cmwtaGFuZGxlcic7XG5pbXBvcnQgeyBza2lwLCBtZXJnZSB9ICAgICAgICAgZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgTWlkZGxld2FyZSAgICAgICAgICAgICAgZnJvbSAnLi9taWRkbGV3YXJlJztcbmltcG9ydCBDb25maWcgICAgICAgICAgICAgICAgICBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgcmVzcG9uc2VIYW5kbGVyICAgICAgICAgZnJvbSAnLi9oZWxwZXJzL3Jlc3BvbnNlLWhhbmRsZXInO1xuXG5cbmNsYXNzIFRyYWUge1xuICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgIHRoaXMuX21pZGRsZXdhcmUgPSBuZXcgTWlkZGxld2FyZSgpO1xuICAgIHRoaXMuX2NvbmZpZyAgICAgPSBuZXcgQ29uZmlnKHNraXAoY29uZmlnLCBbJ2Jhc2VVcmwnXSkpO1xuXG4gICAgdGhpcy5iYXNlVXJsKGNvbmZpZy5iYXNlVXJsIHx8ICcnKTtcbiAgICB0aGlzLl9pbml0TWV0aG9kc1dpdGhCb2R5KCk7XG4gICAgdGhpcy5faW5pdE1ldGhvZHNXaXRoTm9Cb2R5KCk7XG4gICAgdGhpcy5faW5pdE1pZGRsZXdhcmVNZXRob2RzKCk7XG4gIH1cblxuICBjcmVhdGUoY29uZmlnKSB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihtZXJnZSh0aGlzLmRlZmF1bHRzKCksIGNvbmZpZykpO1xuICAgIGNvbnN0IG1hcEFmdGVyID0gKHsgZnVsZmlsbCwgcmVqZWN0IH0pID0+IGluc3RhbmNlLmFmdGVyKGZ1bGZpbGwsIHJlamVjdCk7XG4gICAgdGhpcy5fbWlkZGxld2FyZS5fYmVmb3JlLmZvckVhY2goaW5zdGFuY2UuYmVmb3JlKTtcbiAgICB0aGlzLl9taWRkbGV3YXJlLl9hZnRlci5mb3JFYWNoKG1hcEFmdGVyKTtcbiAgICB0aGlzLl9taWRkbGV3YXJlLl9maW5hbGx5LmZvckVhY2goaW5zdGFuY2UuZmluYWxseSk7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgZGVmYXVsdHMoY29uZmlnKSB7XG4gICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBjb25zdCBkZWZhdWx0cyA9IHRoaXMuX2NvbmZpZy5nZXQoKTtcbiAgICAgIHRoaXMuYmFzZVVybCgpICYmIChkZWZhdWx0cy5iYXNlVXJsID0gdGhpcy5iYXNlVXJsKCkpO1xuICAgICAgcmV0dXJuIGRlZmF1bHRzO1xuICAgIH1cbiAgICB0aGlzLl9jb25maWcuc2V0KHNraXAoY29uZmlnLCBbJ2Jhc2VVcmwnXSkpO1xuICAgIGNvbmZpZy5iYXNlVXJsICYmIHRoaXMuYmFzZVVybChjb25maWcuYmFzZVVybCk7XG4gICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5nZXQoKTtcbiAgfVxuXG4gIGJhc2VVcmwoYmFzZVVybCkge1xuICAgIGlmICh0eXBlb2YgYmFzZVVybCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLl9iYXNlVXJsO1xuICAgIH1cbiAgICB0aGlzLl9iYXNlVXJsID0gYmFzZVVybDtcbiAgICByZXR1cm4gdGhpcy5fYmFzZVVybDtcbiAgfVxuXG4gIHJlcXVlc3QoY29uZmlnID0ge30pIHtcbiAgICBjb25maWcubWV0aG9kIHx8IChjb25maWcubWV0aG9kID0gJ2dldCcpO1xuICAgIGNvbnN0IG1lcmdlZENvbmZpZyA9IHRoaXMuX2NvbmZpZy5tZXJnZVdpdGhEZWZhdWx0cyhjb25maWcpO1xuICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdFVybCh0aGlzLl9iYXNlVXJsLCBjb25maWcudXJsLCBjb25maWcucGFyYW1zKTtcblxuICAgIHJldHVybiB0aGlzLl9mZXRjaCh1cmwsIG1lcmdlZENvbmZpZyk7XG4gIH1cblxuICBfZmV0Y2godXJsLCBjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlQmVmb3JlKGNvbmZpZylcbiAgICAudGhlbihjb25maWcgPT4gZmV0Y2godXJsLCBjb25maWcpKVxuICAgIC50aGVuKHJlcyA9PiByZXNwb25zZUhhbmRsZXIocmVzLCBjb25maWcuYm9keVR5cGUpKVxuICAgIC50aGVuKFxuICAgICAgcmVzID0+IHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUFmdGVyKHVuZGVmaW5lZCwgcmVzKSxcbiAgICAgIGVyciA9PiB0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVBZnRlcihlcnIpXG4gICAgKVxuICAgIC50aGVuKFxuICAgICAgcmVzID0+IFByb21pc2UucmVzb2x2ZSh0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVGaW5hbGx5KCkpLnRoZW4oKCkgPT4gcmVzKSxcbiAgICAgIGVyciA9PiBQcm9taXNlLnJlc29sdmUodGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlRmluYWxseSgpKS50aGVuKCgpID0+IHsgdGhyb3cgZXJyOyB9KVxuICAgICk7XG4gIH1cblxuICBfaW5pdE1ldGhvZHNXaXRoTm9Cb2R5KCkge1xuICAgIFsnZ2V0JywgJ2RlbGV0ZScsICdoZWFkJ10uZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICB0aGlzW21ldGhvZF0gPSAocGF0aCwgY29uZmlnID0ge30pID0+IHtcbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlV2l0aERlZmF1bHRzKGNvbmZpZywgeyBtZXRob2QgfSk7XG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdFVybCh0aGlzLl9iYXNlVXJsLCBwYXRoLCBjb25maWcucGFyYW1zKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIF9pbml0TWV0aG9kc1dpdGhCb2R5KCkge1xuICAgIFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIHRoaXNbbWV0aG9kXSA9IChwYXRoLCBib2R5LCBjb25maWcpID0+IHtcbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlV2l0aERlZmF1bHRzKGNvbmZpZywgeyBib2R5LCBtZXRob2QgfSk7XG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdFVybCh0aGlzLl9iYXNlVXJsLCBwYXRoKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIF9pbml0TWlkZGxld2FyZU1ldGhvZHMoKSB7XG4gICAgWydiZWZvcmUnLCAnYWZ0ZXInLCAnZmluYWxseSddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgdGhpc1ttZXRob2RdID0gKC4uLmFyZ3MpID0+IHRoaXMuX21pZGRsZXdhcmVbbWV0aG9kXSguLi5hcmdzKTtcbiAgICB9KTtcbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBUcmFlKCk7XG4iXSwibmFtZXMiOlsic2VsZiIsImZldGNoIiwic3VwcG9ydCIsIlN5bWJvbCIsIkJsb2IiLCJlIiwiYXJyYXlCdWZmZXIiLCJ2aWV3Q2xhc3NlcyIsImlzRGF0YVZpZXciLCJvYmoiLCJEYXRhVmlldyIsInByb3RvdHlwZSIsImlzUHJvdG90eXBlT2YiLCJpc0FycmF5QnVmZmVyVmlldyIsIkFycmF5QnVmZmVyIiwiaXNWaWV3IiwiaW5kZXhPZiIsIk9iamVjdCIsInRvU3RyaW5nIiwiY2FsbCIsIm5vcm1hbGl6ZU5hbWUiLCJuYW1lIiwiU3RyaW5nIiwidGVzdCIsIlR5cGVFcnJvciIsInRvTG93ZXJDYXNlIiwibm9ybWFsaXplVmFsdWUiLCJ2YWx1ZSIsIml0ZXJhdG9yRm9yIiwiaXRlbXMiLCJpdGVyYXRvciIsInNoaWZ0IiwiZG9uZSIsInVuZGVmaW5lZCIsIml0ZXJhYmxlIiwiSGVhZGVycyIsImhlYWRlcnMiLCJtYXAiLCJmb3JFYWNoIiwiYXBwZW5kIiwiZ2V0T3duUHJvcGVydHlOYW1lcyIsImxpc3QiLCJwdXNoIiwiZ2V0IiwidmFsdWVzIiwiZ2V0QWxsIiwiaGFzIiwiaGFzT3duUHJvcGVydHkiLCJzZXQiLCJjYWxsYmFjayIsInRoaXNBcmciLCJrZXlzIiwiZW50cmllcyIsImNvbnN1bWVkIiwiYm9keSIsImJvZHlVc2VkIiwiUHJvbWlzZSIsInJlamVjdCIsImZpbGVSZWFkZXJSZWFkeSIsInJlYWRlciIsInJlc29sdmUiLCJvbmxvYWQiLCJyZXN1bHQiLCJvbmVycm9yIiwiZXJyb3IiLCJyZWFkQmxvYkFzQXJyYXlCdWZmZXIiLCJibG9iIiwiRmlsZVJlYWRlciIsInByb21pc2UiLCJyZWFkQXNBcnJheUJ1ZmZlciIsInJlYWRCbG9iQXNUZXh0IiwicmVhZEFzVGV4dCIsInJlYWRBcnJheUJ1ZmZlckFzVGV4dCIsImJ1ZiIsInZpZXciLCJVaW50OEFycmF5IiwiY2hhcnMiLCJBcnJheSIsImxlbmd0aCIsImkiLCJmcm9tQ2hhckNvZGUiLCJqb2luIiwiYnVmZmVyQ2xvbmUiLCJzbGljZSIsImJ5dGVMZW5ndGgiLCJidWZmZXIiLCJCb2R5IiwiX2luaXRCb2R5IiwiX2JvZHlJbml0IiwiX2JvZHlUZXh0IiwiX2JvZHlCbG9iIiwiZm9ybURhdGEiLCJGb3JtRGF0YSIsIl9ib2R5Rm9ybURhdGEiLCJzZWFyY2hQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJfYm9keUFycmF5QnVmZmVyIiwiRXJyb3IiLCJ0eXBlIiwicmVqZWN0ZWQiLCJ0aGVuIiwidGV4dCIsImRlY29kZSIsImpzb24iLCJKU09OIiwicGFyc2UiLCJtZXRob2RzIiwibm9ybWFsaXplTWV0aG9kIiwibWV0aG9kIiwidXBjYXNlZCIsInRvVXBwZXJDYXNlIiwiUmVxdWVzdCIsImlucHV0Iiwib3B0aW9ucyIsInVybCIsImNyZWRlbnRpYWxzIiwibW9kZSIsInJlZmVycmVyIiwiY2xvbmUiLCJmb3JtIiwidHJpbSIsInNwbGl0IiwiYnl0ZXMiLCJyZXBsYWNlIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwicGFyc2VIZWFkZXJzIiwicmF3SGVhZGVycyIsImxpbmUiLCJwYXJ0cyIsImtleSIsIlJlc3BvbnNlIiwiYm9keUluaXQiLCJzdGF0dXMiLCJvayIsInN0YXR1c1RleHQiLCJyZXNwb25zZSIsInJlZGlyZWN0U3RhdHVzZXMiLCJyZWRpcmVjdCIsIlJhbmdlRXJyb3IiLCJsb2NhdGlvbiIsImluaXQiLCJyZXF1ZXN0IiwieGhyIiwiWE1MSHR0cFJlcXVlc3QiLCJnZXRBbGxSZXNwb25zZUhlYWRlcnMiLCJyZXNwb25zZVVSTCIsInJlc3BvbnNlVGV4dCIsIm9udGltZW91dCIsIm9wZW4iLCJ3aXRoQ3JlZGVudGlhbHMiLCJyZXNwb25zZVR5cGUiLCJzZXRSZXF1ZXN0SGVhZGVyIiwic2VuZCIsInBvbHlmaWxsIiwidGhpcyIsImhleFRhYmxlIiwiYXJyYXkiLCJzb3VyY2UiLCJwbGFpbk9iamVjdHMiLCJjcmVhdGUiLCJ0YXJnZXQiLCJpc0FycmF5IiwiY29uY2F0IiwibWVyZ2VUYXJnZXQiLCJleHBvcnRzIiwiYXJyYXlUb09iamVjdCIsIml0ZW0iLCJiYWJlbEhlbHBlcnMudHlwZW9mIiwibWVyZ2UiLCJyZWR1Y2UiLCJhY2MiLCJzdHIiLCJzdHJpbmciLCJvdXQiLCJjIiwiY2hhckNvZGVBdCIsImNoYXJBdCIsInJlZmVyZW5jZXMiLCJyZWZzIiwibG9va3VwIiwiY29tcGFjdGVkIiwiY29tcGFjdCIsImNvbnN0cnVjdG9yIiwiaXNCdWZmZXIiLCJwZXJjZW50VHdlbnRpZXMiLCJ1dGlscyIsInJlcXVpcmUkJDEiLCJmb3JtYXRzIiwicmVxdWlyZSQkMCIsImFycmF5UHJlZml4R2VuZXJhdG9ycyIsImJyYWNrZXRzIiwicHJlZml4IiwiaW5kaWNlcyIsInJlcGVhdCIsInRvSVNPIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwiZGVmYXVsdHMiLCJlbmNvZGUiLCJzZXJpYWxpemVEYXRlIiwiZGF0ZSIsInN0cmluZ2lmeSIsIm9iamVjdCIsImdlbmVyYXRlQXJyYXlQcmVmaXgiLCJzdHJpY3ROdWxsSGFuZGxpbmciLCJza2lwTnVsbHMiLCJlbmNvZGVyIiwiZmlsdGVyIiwic29ydCIsImFsbG93RG90cyIsImZvcm1hdHRlciIsIm9iaktleXMiLCJvcHRzIiwiZGVsaW1pdGVyIiwiZm9ybWF0IiwiZGVmYXVsdCIsImZvcm1hdHRlcnMiLCJhcnJheUZvcm1hdCIsInBhcnNlVmFsdWVzIiwicGFyYW1ldGVyTGltaXQiLCJJbmZpbml0eSIsInBhcnQiLCJwb3MiLCJ2YWwiLCJkZWNvZGVyIiwicGFyc2VPYmplY3QiLCJjaGFpbiIsInJvb3QiLCJjbGVhblJvb3QiLCJpbmRleCIsInBhcnNlSW50IiwiaXNOYU4iLCJwYXJzZUFycmF5cyIsImFycmF5TGltaXQiLCJwYXJzZUtleXMiLCJnaXZlbktleSIsInBhcmVudCIsImNoaWxkIiwic2VnbWVudCIsImV4ZWMiLCJhbGxvd1Byb3RvdHlwZXMiLCJkZXB0aCIsImlzUmVnRXhwIiwidGVtcE9iaiIsIm5ld09iaiIsInJlcXVpcmUkJDIiLCJjb25jYXRQYXJhbXMiLCJVUkwiLCJwYXJhbXMiLCJzdHJpbmdpZnlQYXJhbXMiLCJjb21iaW5lIiwiYmFzZVVSTCIsInJlbGF0aXZlVVJMIiwiaXNBYnNvbHV0ZSIsImJhc2VVcmwiLCJpc05vZGUiLCJQdWJsaWMiLCJhcmd1bWVudHMiLCJwdWJsaWNOYW1lIiwicmVjdXJzaXZlIiwib3V0cHV0IiwidHlwZU9mIiwic2l6ZSIsIm1lcmdlX3JlY3Vyc2l2ZSIsImJhc2UiLCJleHRlbmQiLCJhcmd2Iiwic2l0ZW0iLCJtb2R1bGUiLCJfbWVyZ2UiLCJza2lwIiwic2tpcHBlZCIsIm9iaktleSIsImlkZW50aXR5IiwicmVqZWN0aW9uIiwiZXJyIiwiTWlkZGxld2FyZSIsIl9iZWZvcmUiLCJfYWZ0ZXIiLCJfZmluYWxseSIsImZuIiwiZnVsZmlsbCIsImNvbmZpZyIsInRhc2siLCJpbml0aWFsIiwiREVGQVVMVF9IRUFERVJTIiwiREVGQVVMVF9DT05GSUciLCJDb25maWciLCJfZGVmYXVsdHMiLCJfY29uZmlnIiwiY29uZmlnUGFyYW1zIiwid3JhcFJlc3BvbnNlIiwicmVzIiwiZGF0YSIsInJlc3BvbnNlSGFuZGxlciIsImNvbnRlbnRUeXBlIiwiaW5jbHVkZXMiLCJUcmFlIiwiX21pZGRsZXdhcmUiLCJfaW5pdE1ldGhvZHNXaXRoQm9keSIsIl9pbml0TWV0aG9kc1dpdGhOb0JvZHkiLCJfaW5pdE1pZGRsZXdhcmVNZXRob2RzIiwiaW5zdGFuY2UiLCJtYXBBZnRlciIsImFmdGVyIiwiYmVmb3JlIiwiZmluYWxseSIsIl9iYXNlVXJsIiwibWVyZ2VkQ29uZmlnIiwibWVyZ2VXaXRoRGVmYXVsdHMiLCJmb3JtYXRVcmwiLCJfZmV0Y2giLCJyZXNvbHZlQmVmb3JlIiwiYm9keVR5cGUiLCJyZXNvbHZlQWZ0ZXIiLCJyZXNvbHZlRmluYWxseSIsInBhdGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLENBQUMsVUFBU0EsSUFBVCxFQUFlOzs7TUFHVkEsS0FBS0MsS0FBVCxFQUFnQjs7OztNQUlaQyxVQUFVO2tCQUNFLHFCQUFxQkYsSUFEdkI7Y0FFRixZQUFZQSxJQUFaLElBQW9CLGNBQWNHLE1BRmhDO1VBR04sZ0JBQWdCSCxJQUFoQixJQUF3QixVQUFVQSxJQUFsQyxJQUEyQyxZQUFXO1VBQ3REO1lBQ0VJLElBQUo7ZUFDTyxJQUFQO09BRkYsQ0FHRSxPQUFNQyxDQUFOLEVBQVM7ZUFDRixLQUFQOztLQUw0QyxFQUhwQztjQVdGLGNBQWNMLElBWFo7aUJBWUMsaUJB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
