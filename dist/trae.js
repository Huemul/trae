/**
 * Trae, the fetch library!
 *
 * @version: 0.0.11
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

/**
 * Build query params strings from the keys and values of an object
 *
 * @param {String} url The url to append the query to
 * @param {Object} params The object to build the query from
 * @returns {String} The query string
 */
function buildQuery() {
  var url = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var keys = Object.keys(params);

  if (keys.length === 0) {
    return url;
  }

  return url + encodeURI(keys.reduce(function (acc, key) {
    return acc + '&' + key + '=' + (params[key] || '');
  }, '?').replace('?&', '?'));
}

var build$1 = buildQuery;

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

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

/**
 * Parses a url to get the query params
 *
 * @param {String} url The url to parse
 * @returns {Object} A map of the query keys & values
 */
function parseQuery() {
  var url = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

  if (!url.includes('?')) {
    return {};
  }
  var params = {};

  var _decodeURI$split = decodeURI(url).split('?'),
      _decodeURI$split2 = slicedToArray(_decodeURI$split, 2),
      query = _decodeURI$split2[1];

  var pairs = query.split('&');

  pairs.forEach(function (pair) {
    var _pair$split = pair.split('='),
        _pair$split2 = slicedToArray(_pair$split, 2),
        key = _pair$split2[0],
        value = _pair$split2[1];

    params[key] = parseValue(value);
  });
  return params;
}

function parseValue(value) {
  if (value === '') {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  var number = parseFloat(value);
  // eslint-disable-next-line eqeqeq
  if (Number.isNaN(number) || number != value) {
    return value;
  }
  return number;
}

var parse$1 = parseQuery;

var build = build$1;
var parse = parse$1;

var index$1 = {
  buildQuery: build,
  parseQuery: parse
};

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

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
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
	})((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && module && _typeof(module.exports) === 'object' && module.exports);
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

    this._defaults = merge(DEFAULT_CONFIG, { headers: DEFAULT_HEADERS });
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
    value: function set(config) {
      this._config = merge(this._config, config);
    }
  }, {
    key: 'get',
    value: function get() {
      return merge(this._defaults, this._config);
    }
  }]);
  return Config;
}();

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
 */
function format(baseUrl, relativeURL) {
  if (!baseUrl || isAbsolute(relativeURL)) {
    return relativeURL;
  }

  return combine(baseUrl, relativeURL);
}

/**
 * Wrap a response
 *
 * @param {Object} response response object
 * @param {String} reader type of reader to use on response body
 * @return {Promise} resolves to the wrapped read response
 */
function wrapResponse(response, reader) {
  return response[reader]().then(function (data) {
    return {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
      data: data
    };
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
      return new this.constructor(config);
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
      var url = index$1.buildQuery(format(this._baseUrl, config.url), config.params);

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
          var url = index$1.buildQuery(format(_this2._baseUrl, path), config.params);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMvdHJhZS1xdWVyeS9saWIvYnVpbGQuanMiLCIuLi9ub2RlX21vZHVsZXMvdHJhZS1xdWVyeS9saWIvcGFyc2UuanMiLCIuLi9ub2RlX21vZHVsZXMvdHJhZS1xdWVyeS9saWIvaW5kZXguanMiLCIuLi9saWIvbWlkZGxld2FyZS5qcyIsIi4uL25vZGVfbW9kdWxlcy9tZXJnZS9tZXJnZS5qcyIsIi4uL2xpYi91dGlscy5qcyIsIi4uL2xpYi9jb25maWcuanMiLCIuLi9saWIvaGVscGVycy91cmwtaGFuZGxlci5qcyIsIi4uL2xpYi9oZWxwZXJzL3Jlc3BvbnNlLWhhbmRsZXIuanMiLCIuLi9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlcikge1xuICAgIHZhciB2aWV3Q2xhc3NlcyA9IFtcbiAgICAgICdbb2JqZWN0IEludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDY0QXJyYXldJ1xuICAgIF1cblxuICAgIHZhciBpc0RhdGFWaWV3ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIERhdGFWaWV3LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iailcbiAgICB9XG5cbiAgICB2YXIgaXNBcnJheUJ1ZmZlclZpZXcgPSBBcnJheUJ1ZmZlci5pc1ZpZXcgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIHZpZXdDbGFzc2VzLmluZGV4T2YoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikpID4gLTFcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiB7ZG9uZTogdmFsdWUgPT09IHVuZGVmaW5lZCwgdmFsdWU6IHZhbHVlfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMubWFwKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHRoaXMubWFwW25hbWVdLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB2YWx1ZSwgbmFtZSwgdGhpcylcbiAgICAgIH0sIHRoaXMpXG4gICAgfSwgdGhpcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKG5hbWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgaXRlbXMucHVzaCh2YWx1ZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgSGVhZGVycy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRBcnJheUJ1ZmZlckFzVGV4dChidWYpIHtcbiAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICB2YXIgY2hhcnMgPSBuZXcgQXJyYXkodmlldy5sZW5ndGgpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZpZXcubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoYXJzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSh2aWV3W2ldKVxuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJylcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1ZmZlckNsb25lKGJ1Zikge1xuICAgIGlmIChidWYuc2xpY2UpIHtcbiAgICAgIHJldHVybiBidWYuc2xpY2UoMClcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYuYnl0ZUxlbmd0aClcbiAgICAgIHZpZXcuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZikpXG4gICAgICByZXR1cm4gdmlldy5idWZmZXJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiBzdXBwb3J0LmJsb2IgJiYgaXNEYXRhVmlldyhib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5LmJ1ZmZlcilcbiAgICAgICAgLy8gSUUgMTAtMTEgY2FuJ3QgaGFuZGxlIGEgRGF0YVZpZXcgYm9keS5cbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiAoQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkgfHwgaXNBcnJheUJ1ZmZlclZpZXcoYm9keSkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QmxvYiAmJiB0aGlzLl9ib2R5QmxvYi50eXBlKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgdGhpcy5fYm9keUJsb2IudHlwZSlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKSlcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gY29uc3VtZWQodGhpcykgfHwgUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICByZXR1cm4gcmVhZEJsb2JBc1RleHQodGhpcy5fYm9keUJsb2IpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlYWRBcnJheUJ1ZmZlckFzVGV4dCh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIHRleHQnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHlcblxuICAgIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLnVybCA9IGlucHV0XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbnB1dC5ib2R5VXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKVxuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSBpbnB1dC51cmxcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFsc1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHRoaXMubWV0aG9kID0gaW5wdXQubWV0aG9kXG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlXG4gICAgICBpZiAoIWJvZHkgJiYgaW5wdXQuX2JvZHlJbml0ICE9IG51bGwpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdFxuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcywgeyBib2R5OiB0aGlzLl9ib2R5SW5pdCB9KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUhlYWRlcnMocmF3SGVhZGVycykge1xuICAgIHZhciBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKVxuICAgIHJhd0hlYWRlcnMuc3BsaXQoJ1xcclxcbicpLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgdmFyIHBhcnRzID0gbGluZS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gcGFydHMuc2hpZnQoKS50cmltKClcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFydHMuam9pbignOicpLnRyaW0oKVxuICAgICAgICBoZWFkZXJzLmFwcGVuZChrZXksIHZhbHVlKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRlcnNcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSAnc3RhdHVzJyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXMgOiAyMDBcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gJ3N0YXR1c1RleHQnIGluIG9wdGlvbnMgPyBvcHRpb25zLnN0YXR1c1RleHQgOiAnT0snXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IHBhcnNlSGVhZGVycyh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpXG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy51cmwgPSAncmVzcG9uc2VVUkwnIGluIHhociA/IHhoci5yZXNwb25zZVVSTCA6IG9wdGlvbnMuaGVhZGVycy5nZXQoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiLyoqXG4gKiBCdWlsZCBxdWVyeSBwYXJhbXMgc3RyaW5ncyBmcm9tIHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgdXJsIHRvIGFwcGVuZCB0aGUgcXVlcnkgdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgVGhlIG9iamVjdCB0byBidWlsZCB0aGUgcXVlcnkgZnJvbVxuICogQHJldHVybnMge1N0cmluZ30gVGhlIHF1ZXJ5IHN0cmluZ1xuICovXG5mdW5jdGlvbiBidWlsZFF1ZXJ5KHVybCA9ICcnLCBwYXJhbXMgPSB7fSkge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocGFyYW1zKVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB1cmxcbiAgfVxuXG4gIHJldHVybiB1cmwgKyBlbmNvZGVVUkkoa2V5c1xuICAgIC5yZWR1Y2UoKGFjYywga2V5KSA9PiBgJHthY2N9JiR7a2V5fT0ke3BhcmFtc1trZXldIHx8ICcnfWAsICc/JylcbiAgICAucmVwbGFjZSgnPyYnLCAnPycpXG4gIClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBidWlsZFF1ZXJ5XG4iLCIvKipcbiAqIFBhcnNlcyBhIHVybCB0byBnZXQgdGhlIHF1ZXJ5IHBhcmFtc1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIHVybCB0byBwYXJzZVxuICogQHJldHVybnMge09iamVjdH0gQSBtYXAgb2YgdGhlIHF1ZXJ5IGtleXMgJiB2YWx1ZXNcbiAqL1xuZnVuY3Rpb24gcGFyc2VRdWVyeSh1cmwgPSAnJykge1xuICBpZiAoIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgcmV0dXJuIHt9XG4gIH1cbiAgY29uc3QgcGFyYW1zID0ge31cbiAgY29uc3QgWywgcXVlcnldID0gZGVjb2RlVVJJKHVybCkuc3BsaXQoJz8nKVxuXG4gIGNvbnN0IHBhaXJzID0gcXVlcnkuc3BsaXQoJyYnKVxuXG4gIHBhaXJzLmZvckVhY2gocGFpciA9PiB7XG4gICAgY29uc3QgW2tleSwgdmFsdWVdID0gcGFpci5zcGxpdCgnPScpXG4gICAgcGFyYW1zW2tleV0gPSBwYXJzZVZhbHVlKHZhbHVlKVxuICB9KVxuICByZXR1cm4gcGFyYW1zXG59XG5cbmZ1bmN0aW9uIHBhcnNlVmFsdWUodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuICBpZiAodmFsdWUgPT09ICd0cnVlJykge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHZhbHVlID09PSAnZmFsc2UnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgY29uc3QgbnVtYmVyID0gcGFyc2VGbG9hdCh2YWx1ZSlcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGVxZXFlcVxuICBpZiAoTnVtYmVyLmlzTmFOKG51bWJlcikgfHwgbnVtYmVyICE9IHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgcmV0dXJuIG51bWJlclxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlUXVlcnlcbiIsImNvbnN0IGJ1aWxkID0gcmVxdWlyZSgnLi9idWlsZCcpXG5jb25zdCBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGRRdWVyeTogYnVpbGQsXG4gIHBhcnNlUXVlcnk6IHBhcnNlXG59XG4iLCJjb25zdCBpZGVudGl0eSAgPSByZXNwb25zZSA9PiByZXNwb25zZTtcbmNvbnN0IHJlamVjdGlvbiA9IGVyciA9PiBQcm9taXNlLnJlamVjdChlcnIpO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pZGRsZXdhcmUge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9iZWZvcmUgID0gW107XG4gICAgdGhpcy5fYWZ0ZXIgICA9IFtdO1xuICAgIHRoaXMuX2ZpbmFsbHkgPSBbXTtcbiAgfVxuXG4gIGJlZm9yZShmbikge1xuICAgIHRoaXMuX2JlZm9yZS5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcy5fYmVmb3JlLmxlbmd0aCAtIDE7XG4gIH1cblxuICBhZnRlcihmdWxmaWxsID0gaWRlbnRpdHksIHJlamVjdCA9IHJlamVjdGlvbikge1xuICAgIHRoaXMuX2FmdGVyLnB1c2goeyBmdWxmaWxsLCByZWplY3QgfSk7XG4gICAgcmV0dXJuIHRoaXMuX2FmdGVyLmxlbmd0aCAtIDE7XG4gIH1cblxuICBmaW5hbGx5KGZuKSB7XG4gICAgdGhpcy5fZmluYWxseS5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcy5fZmluYWxseS5sZW5ndGggLSAxO1xuICB9XG5cbiAgcmVzb2x2ZUJlZm9yZShjb25maWcpIHtcbiAgICBjb25zdCBjaGFpbiA9IChwcm9taXNlLCB0YXNrKSA9PiBwcm9taXNlLnRoZW4odGFzayk7XG4gICAgcmV0dXJuIHRoaXMuX2JlZm9yZS5yZWR1Y2UoY2hhaW4sIFByb21pc2UucmVzb2x2ZShjb25maWcpKTtcbiAgfVxuXG4gIHJlc29sdmVBZnRlcihlcnIsIHJlc3BvbnNlKSB7XG4gICAgY29uc3QgY2hhaW4gICA9IChwcm9taXNlLCB0YXNrKSA9PiBwcm9taXNlLnRoZW4odGFzay5mdWxmaWxsLCB0YXNrLnJlamVjdCk7XG4gICAgY29uc3QgaW5pdGlhbCA9IGVyciA/IFByb21pc2UucmVqZWN0KGVycikgOiBQcm9taXNlLnJlc29sdmUocmVzcG9uc2UpO1xuICAgIHJldHVybiB0aGlzLl9hZnRlci5yZWR1Y2UoY2hhaW4sIGluaXRpYWwpO1xuICB9XG5cblxuICByZXNvbHZlRmluYWxseSgpIHtcbiAgICB0aGlzLl9maW5hbGx5LmZvckVhY2godGFzayA9PiB0YXNrKCkpO1xuICB9XG59XG4iLCIvKiFcclxuICogQG5hbWUgSmF2YVNjcmlwdC9Ob2RlSlMgTWVyZ2UgdjEuMi4wXHJcbiAqIEBhdXRob3IgeWVpa29zXHJcbiAqIEByZXBvc2l0b3J5IGh0dHBzOi8vZ2l0aHViLmNvbS95ZWlrb3MvanMubWVyZ2VcclxuXHJcbiAqIENvcHlyaWdodCAyMDE0IHllaWtvcyAtIE1JVCBsaWNlbnNlXHJcbiAqIGh0dHBzOi8vcmF3LmdpdGh1Yi5jb20veWVpa29zL2pzLm1lcmdlL21hc3Rlci9MSUNFTlNFXHJcbiAqL1xyXG5cclxuOyhmdW5jdGlvbihpc05vZGUpIHtcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2Ugb25lIG9yIG1vcmUgb2JqZWN0cyBcclxuXHQgKiBAcGFyYW0gYm9vbD8gY2xvbmVcclxuXHQgKiBAcGFyYW0gbWl4ZWQsLi4uIGFyZ3VtZW50c1xyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdHZhciBQdWJsaWMgPSBmdW5jdGlvbihjbG9uZSkge1xyXG5cclxuXHRcdHJldHVybiBtZXJnZShjbG9uZSA9PT0gdHJ1ZSwgZmFsc2UsIGFyZ3VtZW50cyk7XHJcblxyXG5cdH0sIHB1YmxpY05hbWUgPSAnbWVyZ2UnO1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb3IgbW9yZSBvYmplY3RzIHJlY3Vyc2l2ZWx5IFxyXG5cdCAqIEBwYXJhbSBib29sPyBjbG9uZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCwuLi4gYXJndW1lbnRzXHJcblx0ICogQHJldHVybiBvYmplY3RcclxuXHQgKi9cclxuXHJcblx0UHVibGljLnJlY3Vyc2l2ZSA9IGZ1bmN0aW9uKGNsb25lKSB7XHJcblxyXG5cdFx0cmV0dXJuIG1lcmdlKGNsb25lID09PSB0cnVlLCB0cnVlLCBhcmd1bWVudHMpO1xyXG5cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBDbG9uZSB0aGUgaW5wdXQgcmVtb3ZpbmcgYW55IHJlZmVyZW5jZVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEByZXR1cm4gbWl4ZWRcclxuXHQgKi9cclxuXHJcblx0UHVibGljLmNsb25lID0gZnVuY3Rpb24oaW5wdXQpIHtcclxuXHJcblx0XHR2YXIgb3V0cHV0ID0gaW5wdXQsXHJcblx0XHRcdHR5cGUgPSB0eXBlT2YoaW5wdXQpLFxyXG5cdFx0XHRpbmRleCwgc2l6ZTtcclxuXHJcblx0XHRpZiAodHlwZSA9PT0gJ2FycmF5Jykge1xyXG5cclxuXHRcdFx0b3V0cHV0ID0gW107XHJcblx0XHRcdHNpemUgPSBpbnB1dC5sZW5ndGg7XHJcblxyXG5cdFx0XHRmb3IgKGluZGV4PTA7aW5kZXg8c2l6ZTsrK2luZGV4KVxyXG5cclxuXHRcdFx0XHRvdXRwdXRbaW5kZXhdID0gUHVibGljLmNsb25lKGlucHV0W2luZGV4XSk7XHJcblxyXG5cdFx0fSBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0b3V0cHV0ID0ge307XHJcblxyXG5cdFx0XHRmb3IgKGluZGV4IGluIGlucHV0KVxyXG5cclxuXHRcdFx0XHRvdXRwdXRbaW5kZXhdID0gUHVibGljLmNsb25lKGlucHV0W2luZGV4XSk7XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBvdXRwdXQ7XHJcblxyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIHR3byBvYmplY3RzIHJlY3Vyc2l2ZWx5XHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHBhcmFtIG1peGVkIGV4dGVuZFxyXG5cdCAqIEByZXR1cm4gbWl4ZWRcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gbWVyZ2VfcmVjdXJzaXZlKGJhc2UsIGV4dGVuZCkge1xyXG5cclxuXHRcdGlmICh0eXBlT2YoYmFzZSkgIT09ICdvYmplY3QnKVxyXG5cclxuXHRcdFx0cmV0dXJuIGV4dGVuZDtcclxuXHJcblx0XHRmb3IgKHZhciBrZXkgaW4gZXh0ZW5kKSB7XHJcblxyXG5cdFx0XHRpZiAodHlwZU9mKGJhc2Vba2V5XSkgPT09ICdvYmplY3QnICYmIHR5cGVPZihleHRlbmRba2V5XSkgPT09ICdvYmplY3QnKSB7XHJcblxyXG5cdFx0XHRcdGJhc2Vba2V5XSA9IG1lcmdlX3JlY3Vyc2l2ZShiYXNlW2tleV0sIGV4dGVuZFtrZXldKTtcclxuXHJcblx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdGJhc2Vba2V5XSA9IGV4dGVuZFtrZXldO1xyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gYmFzZTtcclxuXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb3IgbW9yZSBvYmplY3RzXHJcblx0ICogQHBhcmFtIGJvb2wgY2xvbmVcclxuXHQgKiBAcGFyYW0gYm9vbCByZWN1cnNpdmVcclxuXHQgKiBAcGFyYW0gYXJyYXkgYXJndlxyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIG1lcmdlKGNsb25lLCByZWN1cnNpdmUsIGFyZ3YpIHtcclxuXHJcblx0XHR2YXIgcmVzdWx0ID0gYXJndlswXSxcclxuXHRcdFx0c2l6ZSA9IGFyZ3YubGVuZ3RoO1xyXG5cclxuXHRcdGlmIChjbG9uZSB8fCB0eXBlT2YocmVzdWx0KSAhPT0gJ29iamVjdCcpXHJcblxyXG5cdFx0XHRyZXN1bHQgPSB7fTtcclxuXHJcblx0XHRmb3IgKHZhciBpbmRleD0wO2luZGV4PHNpemU7KytpbmRleCkge1xyXG5cclxuXHRcdFx0dmFyIGl0ZW0gPSBhcmd2W2luZGV4XSxcclxuXHJcblx0XHRcdFx0dHlwZSA9IHR5cGVPZihpdGVtKTtcclxuXHJcblx0XHRcdGlmICh0eXBlICE9PSAnb2JqZWN0JykgY29udGludWU7XHJcblxyXG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gaXRlbSkge1xyXG5cclxuXHRcdFx0XHR2YXIgc2l0ZW0gPSBjbG9uZSA/IFB1YmxpYy5jbG9uZShpdGVtW2tleV0pIDogaXRlbVtrZXldO1xyXG5cclxuXHRcdFx0XHRpZiAocmVjdXJzaXZlKSB7XHJcblxyXG5cdFx0XHRcdFx0cmVzdWx0W2tleV0gPSBtZXJnZV9yZWN1cnNpdmUocmVzdWx0W2tleV0sIHNpdGVtKTtcclxuXHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHJcblx0XHRcdFx0XHRyZXN1bHRba2V5XSA9IHNpdGVtO1xyXG5cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHR9XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHR5cGUgb2YgdmFyaWFibGVcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcmV0dXJuIHN0cmluZ1xyXG5cdCAqXHJcblx0ICogQHNlZSBodHRwOi8vanNwZXJmLmNvbS90eXBlb2Z2YXJcclxuXHQgKi9cclxuXHJcblx0ZnVuY3Rpb24gdHlwZU9mKGlucHV0KSB7XHJcblxyXG5cdFx0cmV0dXJuICh7fSkudG9TdHJpbmcuY2FsbChpbnB1dCkuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdH1cclxuXHJcblx0aWYgKGlzTm9kZSkge1xyXG5cclxuXHRcdG1vZHVsZS5leHBvcnRzID0gUHVibGljO1xyXG5cclxuXHR9IGVsc2Uge1xyXG5cclxuXHRcdHdpbmRvd1twdWJsaWNOYW1lXSA9IFB1YmxpYztcclxuXHJcblx0fVxyXG5cclxufSkodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpOyIsImltcG9ydCBfbWVyZ2UgZnJvbSAnbWVyZ2UnO1xuXG5cbi8qKlxuICogUmVjdXJzaXZlbHkgbWVyZ2Ugb2JqZWN0c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3RzIHRvIG1lcmdlXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBtZXJnZWQgb2JqZWN0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2UoLi4ucGFyYW1zKSAge1xuICByZXR1cm4gX21lcmdlLnJlY3Vyc2l2ZSh0cnVlLCAuLi5wYXJhbXMpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHNraXBwZWQgcHJvcGVydGllc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogdGhlIG9iamVjdCB0byBza2lwIHByb3BlcnRpZXMgZnJvbVxuICogQHBhcmFtIHtbU3RyaW5nXX0ga2V5cyBrZXlzIG9mIHRoZSBwcm9wZXJ0aWVzIHRvIHNraXBcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIG9iamVjdCB3aXRoIHRoZSBwcm9wZXJ0aWVzIHNraXBwZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNraXAob2JqLCBrZXlzKSB7XG4gIGNvbnN0IHNraXBwZWQgPSB7fTtcbiAgT2JqZWN0LmtleXMob2JqKS5mb3JFYWNoKChvYmpLZXkpID0+IHtcbiAgICBpZiAoa2V5cy5pbmRleE9mKG9iaktleSkgPT09IC0xKSB7XG4gICAgICBza2lwcGVkW29iaktleV0gPSBvYmpbb2JqS2V5XTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gc2tpcHBlZDtcbn1cbiIsImltcG9ydCB7IG1lcmdlIH0gZnJvbSAnLi91dGlscyc7XG5cblxuY29uc3QgREVGQVVMVF9IRUFERVJTID0ge1xuICAnQWNjZXB0JyAgICAgIDogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvcGxhaW4sICovKicsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgcXVvdGUtcHJvcHNcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xufTtcblxuY29uc3QgREVGQVVMVF9DT05GSUcgPSB7XG4gIHhzcmZDb29raWVOYW1lOiAnWFNSRi1UT0tFTicsXG4gIHhzcmZIZWFkZXJOYW1lOiAnWC1YU1JGLVRPS0VOJ1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29uZmlnIHtcbiAgY29uc3RydWN0b3IoY29uZmlnID0ge30pIHtcbiAgICB0aGlzLl9kZWZhdWx0cyA9IG1lcmdlKERFRkFVTFRfQ09ORklHLCB7IGhlYWRlcnM6IERFRkFVTFRfSEVBREVSUyB9KTtcbiAgICB0aGlzLl9jb25maWcgICA9IHt9O1xuXG4gICAgdGhpcy5zZXQoY29uZmlnKTtcbiAgfVxuXG4gIG1lcmdlV2l0aERlZmF1bHRzKC4uLmNvbmZpZ1BhcmFtcykge1xuICAgIGNvbnN0IGNvbmZpZyA9IG1lcmdlKHRoaXMuX2RlZmF1bHRzLCB0aGlzLl9jb25maWcsIC4uLmNvbmZpZ1BhcmFtcyk7XG4gICAgaWYgKFxuICAgICAgdHlwZW9mIGNvbmZpZy5ib2R5ID09PSAnb2JqZWN0JyAmJlxuICAgICAgY29uZmlnLmhlYWRlcnMgJiZcbiAgICAgIGNvbmZpZy5oZWFkZXJzWydDb250ZW50LVR5cGUnXSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgKSB7XG4gICAgICBjb25maWcuYm9keSA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZy5ib2R5KTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIHNldChjb25maWcpIHtcbiAgICB0aGlzLl9jb25maWcgPSBtZXJnZSh0aGlzLl9jb25maWcsIGNvbmZpZyk7XG4gIH1cblxuICBnZXQoKSB7XG4gICAgcmV0dXJuIG1lcmdlKHRoaXMuX2RlZmF1bHRzLCB0aGlzLl9jb25maWcpO1xuICB9XG59XG4iLCIvKipcbiAqIENyZWF0ZXMgYSBuZXcgVVJMIGJ5IGNvbWJpbmluZyB0aGUgc3BlY2lmaWVkIFVSTHNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVSTCBUaGUgYmFzZSBVUkxcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVSTCBUaGUgcmVsYXRpdmUgVVJMXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY29tYmluZWQgVVJMXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmUoYmFzZVVSTCwgcmVsYXRpdmVVUkwpIHtcbiAgcmV0dXJuIGAke2Jhc2VVUkwucmVwbGFjZSgvXFwvKyQvLCAnJyl9LyR7cmVsYXRpdmVVUkwucmVwbGFjZSgvXlxcLysvLCAnJyl9YDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFRoZSBVUkwgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBYnNvbHV0ZSh1cmwpIHtcbiAgLy8gQSBVUkwgaXMgY29uc2lkZXJlZCBhYnNvbHV0ZSBpZiBpdCBiZWdpbnMgd2l0aCBcIjxzY2hlbWU+Oi8vXCIgb3IgXCIvL1wiIChwcm90b2NvbC1yZWxhdGl2ZSBVUkwpLlxuICAvLyBSRkMgMzk4NiBkZWZpbmVzIHNjaGVtZSBuYW1lIGFzIGEgc2VxdWVuY2Ugb2YgY2hhcmFjdGVycyBiZWdpbm5pbmcgd2l0aCBhIGxldHRlciBhbmQgZm9sbG93ZWRcbiAgLy8gYnkgYW55IGNvbWJpbmF0aW9uIG9mIGxldHRlcnMsIGRpZ2l0cywgcGx1cywgcGVyaW9kLCBvciBoeXBoZW4uXG4gIHJldHVybiAvXihbYS16XVthLXpcXGRcXCtcXC1cXC5dKjopP1xcL1xcLy9pLnRlc3QodXJsKTtcbn1cblxuLyoqXG4gKiBGb3JtYXQgYW4gdXJsIGNvbWJpbmluZyBwcm92aWRlZCB1cmxzIG9yIHJldHVybmluZyB0aGUgcmVsYXRpdmVVUkxcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVybCBUaGUgYmFzZSB1cmxcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVSTCBUaGUgcmVsYXRpdmUgdXJsXG4gKiBAcmV0dXJucyB7c3RyaW5nfSByZWxhdGl2ZVVSTCBpZiB0aGUgc3BlY2lmaWVkIHJlbGF0aXZlVVJMIGlzIGFic29sdXRlIG9yIGJhc2VVcmwgaXMgbm90IGRlZmluZWQsXG4gKiAgICAgICAgICAgICAgICAgICBvdGhlcndpc2UgaXQgcmV0dXJucyB0aGUgY29tYmluYXRpb24gb2YgYm90aCB1cmxzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXQoYmFzZVVybCwgcmVsYXRpdmVVUkwpIHtcbiAgaWYgKCFiYXNlVXJsIHx8IGlzQWJzb2x1dGUocmVsYXRpdmVVUkwpKSB7XG4gICAgcmV0dXJuIHJlbGF0aXZlVVJMO1xuICB9XG5cbiAgcmV0dXJuIGNvbWJpbmUoYmFzZVVybCwgcmVsYXRpdmVVUkwpO1xufVxuIiwiLyoqXG4gKiBXcmFwIGEgcmVzcG9uc2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgcmVzcG9uc2Ugb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gcmVhZGVyIHR5cGUgb2YgcmVhZGVyIHRvIHVzZSBvbiByZXNwb25zZSBib2R5XG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZXNvbHZlcyB0byB0aGUgd3JhcHBlZCByZWFkIHJlc3BvbnNlXG4gKi9cbmZ1bmN0aW9uIHdyYXBSZXNwb25zZShyZXNwb25zZSwgcmVhZGVyKSB7XG4gIHJldHVybiByZXNwb25zZVtyZWFkZXJdKClcbiAgLnRoZW4oZGF0YSA9PiAoe1xuICAgIGhlYWRlcnMgICA6IHJlc3BvbnNlLmhlYWRlcnMsXG4gICAgc3RhdHVzICAgIDogcmVzcG9uc2Uuc3RhdHVzLFxuICAgIHN0YXR1c1RleHQ6IHJlc3BvbnNlLnN0YXR1c1RleHQsXG4gICAgZGF0YVxuICB9KSk7XG59XG5cbi8qKlxuICogUmVhZHMgb3IgcmVqZWN0cyBhIGZldGNoIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIHJlc3BvbnNlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHJlYWRlciB0eXBlIG9mIHJlYWRlciB0byB1c2Ugb24gcmVzcG9uc2UgYm9keVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVhZCBvciByZWplY3Rpb24gcHJvbWlzZVxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZXNwb25zZUhhbmRsZXIocmVzcG9uc2UsIHJlYWRlcikge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgY29uc3QgZXJyICAgICAgID0gbmV3IEVycm9yKHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgIGVyci5zdGF0dXMgICAgICA9IHJlc3BvbnNlLnN0YXR1cztcbiAgICBlcnIuc3RhdHVzVGV4dCAgPSByZXNwb25zZS5zdGF0dXNUZXh0O1xuICAgIGVyci5oZWFkZXJzICAgICA9IHJlc3BvbnNlLmhlYWRlcnM7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gIH1cbiAgaWYgKHJlYWRlcikge1xuICAgIHJldHVybiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsIHJlYWRlcik7XG4gIH1cblxuICBjb25zdCBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKTtcbiAgaWYgKGNvbnRlbnRUeXBlICYmIGNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCAnanNvbicpO1xuICB9XG4gIHJldHVybiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsICd0ZXh0Jyk7XG59XG4iLCJpbXBvcnQgJ3doYXR3Zy1mZXRjaCc7XG5pbXBvcnQgcXVlcnkgZnJvbSAndHJhZS1xdWVyeSc7XG5cbmltcG9ydCBNaWRkbGV3YXJlICAgICAgZnJvbSAnLi9taWRkbGV3YXJlJztcbmltcG9ydCBDb25maWcgICAgICAgICAgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHsgc2tpcCB9ICAgICAgICBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGZvcm1hdCB9ICAgICAgZnJvbSAnLi9oZWxwZXJzL3VybC1oYW5kbGVyJztcbmltcG9ydCByZXNwb25zZUhhbmRsZXIgZnJvbSAnLi9oZWxwZXJzL3Jlc3BvbnNlLWhhbmRsZXInO1xuXG5cbmNsYXNzIFRyYWUge1xuICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgIHRoaXMuX21pZGRsZXdhcmUgPSBuZXcgTWlkZGxld2FyZSgpO1xuICAgIHRoaXMuX2NvbmZpZyAgICAgPSBuZXcgQ29uZmlnKHNraXAoY29uZmlnLCBbJ2Jhc2VVcmwnXSkpO1xuXG4gICAgdGhpcy5iYXNlVXJsKGNvbmZpZy5iYXNlVXJsIHx8ICcnKTtcbiAgICB0aGlzLl9pbml0TWV0aG9kc1dpdGhCb2R5KCk7XG4gICAgdGhpcy5faW5pdE1ldGhvZHNXaXRoTm9Cb2R5KCk7XG4gICAgdGhpcy5faW5pdE1pZGRsZXdhcmVNZXRob2RzKCk7XG4gIH1cblxuICBjcmVhdGUoY29uZmlnKSB7XG4gICAgcmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKGNvbmZpZyk7XG4gIH1cblxuICBkZWZhdWx0cyhjb25maWcpIHtcbiAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRzID0gdGhpcy5fY29uZmlnLmdldCgpO1xuICAgICAgdGhpcy5iYXNlVXJsKCkgJiYgKGRlZmF1bHRzLmJhc2VVcmwgPSB0aGlzLmJhc2VVcmwoKSk7XG4gICAgICByZXR1cm4gZGVmYXVsdHM7XG4gICAgfVxuICAgIHRoaXMuX2NvbmZpZy5zZXQoc2tpcChjb25maWcsIFsnYmFzZVVybCddKSk7XG4gICAgY29uZmlnLmJhc2VVcmwgJiYgdGhpcy5iYXNlVXJsKGNvbmZpZy5iYXNlVXJsKTtcbiAgICByZXR1cm4gdGhpcy5fY29uZmlnLmdldCgpO1xuICB9XG5cbiAgYmFzZVVybChiYXNlVXJsKSB7XG4gICAgaWYgKHR5cGVvZiBiYXNlVXJsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIHRoaXMuX2Jhc2VVcmw7XG4gICAgfVxuICAgIHRoaXMuX2Jhc2VVcmwgPSBiYXNlVXJsO1xuICAgIHJldHVybiB0aGlzLl9iYXNlVXJsO1xuICB9XG5cbiAgcmVxdWVzdChjb25maWcgPSB7fSkge1xuICAgIGNvbmZpZy5tZXRob2QgfHwgKGNvbmZpZy5tZXRob2QgPSAnZ2V0Jyk7XG4gICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlV2l0aERlZmF1bHRzKGNvbmZpZyk7XG4gICAgY29uc3QgdXJsICAgICAgICAgID0gcXVlcnkuYnVpbGRRdWVyeShmb3JtYXQodGhpcy5fYmFzZVVybCwgY29uZmlnLnVybCksIGNvbmZpZy5wYXJhbXMpO1xuXG4gICAgcmV0dXJuIHRoaXMuX2ZldGNoKHVybCwgbWVyZ2VkQ29uZmlnKTtcbiAgfVxuXG4gIF9mZXRjaCh1cmwsIGNvbmZpZykge1xuICAgIHJldHVybiB0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVCZWZvcmUoY29uZmlnKVxuICAgIC50aGVuKGNvbmZpZyA9PiBmZXRjaCh1cmwsIGNvbmZpZykpXG4gICAgLnRoZW4ocmVzID0+IHJlc3BvbnNlSGFuZGxlcihyZXMsIGNvbmZpZy5ib2R5VHlwZSkpXG4gICAgLnRoZW4oXG4gICAgICByZXMgPT4gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlQWZ0ZXIodW5kZWZpbmVkLCByZXMpLFxuICAgICAgZXJyID0+IHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUFmdGVyKGVycilcbiAgICApXG4gICAgLnRoZW4oXG4gICAgICByZXMgPT4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUZpbmFsbHkoKSkudGhlbigoKSA9PiByZXMpLFxuICAgICAgZXJyID0+IFByb21pc2UucmVzb2x2ZSh0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVGaW5hbGx5KCkpLnRoZW4oKCkgPT4geyB0aHJvdyBlcnI7IH0pXG4gICAgKTtcbiAgfVxuXG4gIF9pbml0TWV0aG9kc1dpdGhOb0JvZHkoKSB7XG4gICAgWydnZXQnLCAnZGVsZXRlJywgJ2hlYWQnXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIHRoaXNbbWV0aG9kXSA9IChwYXRoLCBjb25maWcgPSB7fSkgPT4ge1xuICAgICAgICBjb25zdCBtZXJnZWRDb25maWcgPSB0aGlzLl9jb25maWcubWVyZ2VXaXRoRGVmYXVsdHMoY29uZmlnLCB7IG1ldGhvZCB9KTtcbiAgICAgICAgY29uc3QgdXJsICAgICAgICAgID0gcXVlcnkuYnVpbGRRdWVyeShmb3JtYXQodGhpcy5fYmFzZVVybCwgcGF0aCksIGNvbmZpZy5wYXJhbXMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9mZXRjaCh1cmwsIG1lcmdlZENvbmZpZyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgX2luaXRNZXRob2RzV2l0aEJvZHkoKSB7XG4gICAgWydwb3N0JywgJ3B1dCcsICdwYXRjaCddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgdGhpc1ttZXRob2RdID0gKHBhdGgsIGJvZHksIGNvbmZpZykgPT4ge1xuICAgICAgICBjb25zdCBtZXJnZWRDb25maWcgPSB0aGlzLl9jb25maWcubWVyZ2VXaXRoRGVmYXVsdHMoY29uZmlnLCB7IGJvZHksIG1ldGhvZCB9KTtcbiAgICAgICAgY29uc3QgdXJsICAgICAgICAgID0gZm9ybWF0KHRoaXMuX2Jhc2VVcmwsIHBhdGgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9mZXRjaCh1cmwsIG1lcmdlZENvbmZpZyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgX2luaXRNaWRkbGV3YXJlTWV0aG9kcygpIHtcbiAgICBbJ2JlZm9yZScsICdhZnRlcicsICdmaW5hbGx5J10uZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICB0aGlzW21ldGhvZF0gPSAoLi4uYXJncykgPT4gdGhpcy5fbWlkZGxld2FyZVttZXRob2RdKC4uLmFyZ3MpO1xuICAgIH0pO1xuICB9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IFRyYWUoKTtcbiJdLCJuYW1lcyI6WyJzZWxmIiwiZmV0Y2giLCJzdXBwb3J0IiwiU3ltYm9sIiwiQmxvYiIsImUiLCJhcnJheUJ1ZmZlciIsInZpZXdDbGFzc2VzIiwiaXNEYXRhVmlldyIsIm9iaiIsIkRhdGFWaWV3IiwicHJvdG90eXBlIiwiaXNQcm90b3R5cGVPZiIsImlzQXJyYXlCdWZmZXJWaWV3IiwiQXJyYXlCdWZmZXIiLCJpc1ZpZXciLCJpbmRleE9mIiwiT2JqZWN0IiwidG9TdHJpbmciLCJjYWxsIiwibm9ybWFsaXplTmFtZSIsIm5hbWUiLCJTdHJpbmciLCJ0ZXN0IiwiVHlwZUVycm9yIiwidG9Mb3dlckNhc2UiLCJub3JtYWxpemVWYWx1ZSIsInZhbHVlIiwiaXRlcmF0b3JGb3IiLCJpdGVtcyIsIml0ZXJhdG9yIiwic2hpZnQiLCJkb25lIiwidW5kZWZpbmVkIiwiaXRlcmFibGUiLCJIZWFkZXJzIiwiaGVhZGVycyIsIm1hcCIsImZvckVhY2giLCJhcHBlbmQiLCJnZXRPd25Qcm9wZXJ0eU5hbWVzIiwibGlzdCIsInB1c2giLCJnZXQiLCJ2YWx1ZXMiLCJnZXRBbGwiLCJoYXMiLCJoYXNPd25Qcm9wZXJ0eSIsInNldCIsImNhbGxiYWNrIiwidGhpc0FyZyIsImtleXMiLCJlbnRyaWVzIiwiY29uc3VtZWQiLCJib2R5IiwiYm9keVVzZWQiLCJQcm9taXNlIiwicmVqZWN0IiwiZmlsZVJlYWRlclJlYWR5IiwicmVhZGVyIiwicmVzb2x2ZSIsIm9ubG9hZCIsInJlc3VsdCIsIm9uZXJyb3IiLCJlcnJvciIsInJlYWRCbG9iQXNBcnJheUJ1ZmZlciIsImJsb2IiLCJGaWxlUmVhZGVyIiwicHJvbWlzZSIsInJlYWRBc0FycmF5QnVmZmVyIiwicmVhZEJsb2JBc1RleHQiLCJyZWFkQXNUZXh0IiwicmVhZEFycmF5QnVmZmVyQXNUZXh0IiwiYnVmIiwidmlldyIsIlVpbnQ4QXJyYXkiLCJjaGFycyIsIkFycmF5IiwibGVuZ3RoIiwiaSIsImZyb21DaGFyQ29kZSIsImpvaW4iLCJidWZmZXJDbG9uZSIsInNsaWNlIiwiYnl0ZUxlbmd0aCIsImJ1ZmZlciIsIkJvZHkiLCJfaW5pdEJvZHkiLCJfYm9keUluaXQiLCJfYm9keVRleHQiLCJfYm9keUJsb2IiLCJmb3JtRGF0YSIsIkZvcm1EYXRhIiwiX2JvZHlGb3JtRGF0YSIsInNlYXJjaFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIl9ib2R5QXJyYXlCdWZmZXIiLCJFcnJvciIsInR5cGUiLCJyZWplY3RlZCIsInRoZW4iLCJ0ZXh0IiwiZGVjb2RlIiwianNvbiIsIkpTT04iLCJwYXJzZSIsIm1ldGhvZHMiLCJub3JtYWxpemVNZXRob2QiLCJtZXRob2QiLCJ1cGNhc2VkIiwidG9VcHBlckNhc2UiLCJSZXF1ZXN0IiwiaW5wdXQiLCJvcHRpb25zIiwidXJsIiwiY3JlZGVudGlhbHMiLCJtb2RlIiwicmVmZXJyZXIiLCJjbG9uZSIsImZvcm0iLCJ0cmltIiwic3BsaXQiLCJieXRlcyIsInJlcGxhY2UiLCJkZWNvZGVVUklDb21wb25lbnQiLCJwYXJzZUhlYWRlcnMiLCJyYXdIZWFkZXJzIiwibGluZSIsInBhcnRzIiwia2V5IiwiUmVzcG9uc2UiLCJib2R5SW5pdCIsInN0YXR1cyIsIm9rIiwic3RhdHVzVGV4dCIsInJlc3BvbnNlIiwicmVkaXJlY3RTdGF0dXNlcyIsInJlZGlyZWN0IiwiUmFuZ2VFcnJvciIsImxvY2F0aW9uIiwiaW5pdCIsInJlcXVlc3QiLCJ4aHIiLCJYTUxIdHRwUmVxdWVzdCIsImdldEFsbFJlc3BvbnNlSGVhZGVycyIsInJlc3BvbnNlVVJMIiwicmVzcG9uc2VUZXh0Iiwib250aW1lb3V0Iiwib3BlbiIsIndpdGhDcmVkZW50aWFscyIsInJlc3BvbnNlVHlwZSIsInNldFJlcXVlc3RIZWFkZXIiLCJzZW5kIiwicG9seWZpbGwiLCJ0aGlzIiwiYnVpbGRRdWVyeSIsInBhcmFtcyIsImVuY29kZVVSSSIsInJlZHVjZSIsImFjYyIsInBhcnNlUXVlcnkiLCJpbmNsdWRlcyIsImRlY29kZVVSSSIsInF1ZXJ5IiwicGFpcnMiLCJwYWlyIiwicGFyc2VWYWx1ZSIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJOdW1iZXIiLCJpc05hTiIsImJ1aWxkIiwicmVxdWlyZSQkMSIsInJlcXVpcmUkJDAiLCJpZGVudGl0eSIsInJlamVjdGlvbiIsImVyciIsIk1pZGRsZXdhcmUiLCJfYmVmb3JlIiwiX2FmdGVyIiwiX2ZpbmFsbHkiLCJmbiIsImZ1bGZpbGwiLCJjb25maWciLCJjaGFpbiIsInRhc2siLCJpbml0aWFsIiwiaXNOb2RlIiwiUHVibGljIiwibWVyZ2UiLCJhcmd1bWVudHMiLCJwdWJsaWNOYW1lIiwicmVjdXJzaXZlIiwib3V0cHV0IiwidHlwZU9mIiwiaW5kZXgiLCJzaXplIiwibWVyZ2VfcmVjdXJzaXZlIiwiYmFzZSIsImV4dGVuZCIsImFyZ3YiLCJpdGVtIiwic2l0ZW0iLCJtb2R1bGUiLCJiYWJlbEhlbHBlcnMudHlwZW9mIiwiZXhwb3J0cyIsIl9tZXJnZSIsInNraXAiLCJza2lwcGVkIiwib2JqS2V5IiwiREVGQVVMVF9IRUFERVJTIiwiREVGQVVMVF9DT05GSUciLCJDb25maWciLCJfZGVmYXVsdHMiLCJfY29uZmlnIiwiY29uZmlnUGFyYW1zIiwic3RyaW5naWZ5IiwiY29tYmluZSIsImJhc2VVUkwiLCJyZWxhdGl2ZVVSTCIsImlzQWJzb2x1dGUiLCJmb3JtYXQiLCJiYXNlVXJsIiwid3JhcFJlc3BvbnNlIiwicmVzcG9uc2VIYW5kbGVyIiwiY29udGVudFR5cGUiLCJUcmFlIiwiX21pZGRsZXdhcmUiLCJfaW5pdE1ldGhvZHNXaXRoQm9keSIsIl9pbml0TWV0aG9kc1dpdGhOb0JvZHkiLCJfaW5pdE1pZGRsZXdhcmVNZXRob2RzIiwiY29uc3RydWN0b3IiLCJkZWZhdWx0cyIsIl9iYXNlVXJsIiwibWVyZ2VkQ29uZmlnIiwibWVyZ2VXaXRoRGVmYXVsdHMiLCJfZmV0Y2giLCJyZXNvbHZlQmVmb3JlIiwicmVzIiwiYm9keVR5cGUiLCJyZXNvbHZlQWZ0ZXIiLCJyZXNvbHZlRmluYWxseSIsInBhdGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLENBQUMsVUFBU0EsSUFBVCxFQUFlOzs7TUFHVkEsS0FBS0MsS0FBVCxFQUFnQjs7OztNQUlaQyxVQUFVO2tCQUNFLHFCQUFxQkYsSUFEdkI7Y0FFRixZQUFZQSxJQUFaLElBQW9CLGNBQWNHLE1BRmhDO1VBR04sZ0JBQWdCSCxJQUFoQixJQUF3QixVQUFVQSxJQUFsQyxJQUEyQyxZQUFXO1VBQ3REO1lBQ0VJLElBQUo7ZUFDTyxJQUFQO09BRkYs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
