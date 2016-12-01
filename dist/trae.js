/**
 * Trae, the fetch library!
 *
 * @version: 0.0.8
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
    reader.readAsArrayBuffer(blob);
    return fileReaderReady(reader);
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    reader.readAsText(blob);
    return fileReaderReady(reader);
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function (body) {
      this._bodyInit = body;
      if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (!body) {
        this._bodyText = '';
      } else if (support.arrayBuffer && ArrayBuffer.prototype.isPrototypeOf(body)) {
        // Only support ArrayBuffers for POST method.
        // Receiving ArrayBuffers happens via Blobs, instead.
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
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob');
        } else {
          return Promise.resolve(new Blob([this._bodyText]));
        }
      };

      this.arrayBuffer = function () {
        return this.blob().then(readBlobAsArrayBuffer);
      };

      this.text = function () {
        var rejected = consumed(this);
        if (rejected) {
          return rejected;
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob);
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text');
        } else {
          return Promise.resolve(this._bodyText);
        }
      };
    } else {
      this.text = function () {
        var rejected = consumed(this);
        return rejected ? rejected : Promise.resolve(this._bodyText);
      };
    }

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
    if (Request.prototype.isPrototypeOf(input)) {
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
      if (!body) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = input;
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
    return new Request(this);
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

  function headers(xhr) {
    var head = new Headers();
    var pairs = (xhr.getAllResponseHeaders() || '').trim().split('\n');
    pairs.forEach(function (header) {
      var split = header.trim().split(':');
      var key = split.shift().trim();
      var value = split.join(':').trim();
      head.append(key, value);
    });
    return head;
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = options.statusText;
    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
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
      var request;
      if (Request.prototype.isPrototypeOf(input) && !init) {
        request = input;
      } else {
        request = new Request(input, init);
      }

      var xhr = new XMLHttpRequest();

      function responseURL() {
        if ('responseURL' in xhr) {
          return xhr.responseURL;
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader('X-Request-URL');
        }

        return;
      }

      xhr.onload = function () {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: headers(xhr),
          url: responseURL()
        };
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

var Middleware = function () {
  function Middleware() {
    classCallCheck(this, Middleware);

    this._before = [];
    this._success = [];
    this._error = [];
    this._after = [];
  }

  createClass(Middleware, [{
    key: "before",
    value: function before(fn) {
      this._before.push(fn);
      return this._before.length - 1;
    }
  }, {
    key: "success",
    value: function success() {
      var _success = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function (res) {
        return res;
      };

      this._success.push(_success);
      return this._success.length - 1;
    }
  }, {
    key: "error",
    value: function error(fn) {
      this._error.push(fn);
      return this._error.length - 1;
    }
  }, {
    key: "after",
    value: function after(fn) {
      this._after.push(fn);
      return this._after.length - 1;
    }
  }, {
    key: "resolveBefore",
    value: function resolveBefore(config) {
      return this._before.reduce(function (promise, before) {
        promise = promise.then(before);
        return promise;
      }, Promise.resolve(config));
    }
  }, {
    key: "resolveSuccess",
    value: function resolveSuccess(res) {
      return this._success.reduce(function (promise, success) {
        promise = promise.then(success);
        return promise;
      }, Promise.resolve(res));
    }
  }, {
    key: "resolveError",
    value: function resolveError(err) {
      this._error.forEach(function (fn) {
        return fn && fn.call && fn(err);
      });
      return Promise.reject(err);
    }
  }, {
    key: "resolveAfter",
    value: function resolveAfter(err, res) {
      return this._after.reduce(function (promise, after) {
        promise = promise.then(after);
        return promise;
      }, err ? Promise.reject(res) : Promise.resolve(res));
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
 * Wrapp a response
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
 * Reads or rejects a fetch request response
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
  }

  createClass(Trae, [{
    key: 'create',
    value: function create(config) {
      return new this.constructor(config);
    }
  }, {
    key: 'use',
    value: function use() {
      var middlewares = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      middlewares.before && this._middleware.before(middlewares.before);
      middlewares.success && this._middleware.success(middlewares.success);
      middlewares.error && this._middleware.error(middlewares.error);
      middlewares.after && this._middleware.after(middlewares.after);
    }
  }, {
    key: 'defaults',
    value: function defaults(config) {
      if (typeof config === 'undefined') {
        return this._config.get();
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

      var runAfter = true;

      return this._middleware.resolveBefore(config).then(function (config) {
        return fetch(url, config);
      }).then(function (res) {
        return responseHandler(res, config.bodyType);
      }).then(function (res) {
        return _this._middleware.resolveSuccess(res);
      }).then(function (res) {
        runAfter = false;
        return _this._middleware.resolveAfter(null, res);
      }).catch(function (err) {
        _this._middleware.resolveError(err);
        return runAfter ? _this._middleware.resolveAfter(err) : Promise.reject(err);
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
  }]);
  return Trae;
}();

var index = new Trae();

return index;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMvdHJhZS1xdWVyeS9saWIvYnVpbGQuanMiLCIuLi9ub2RlX21vZHVsZXMvdHJhZS1xdWVyeS9saWIvcGFyc2UuanMiLCIuLi9ub2RlX21vZHVsZXMvdHJhZS1xdWVyeS9saWIvaW5kZXguanMiLCIuLi9saWIvbWlkZGxld2FyZS5qcyIsIi4uL25vZGVfbW9kdWxlcy9tZXJnZS9tZXJnZS5qcyIsIi4uL2xpYi91dGlscy5qcyIsIi4uL2xpYi9jb25maWcuanMiLCIuLi9saWIvaGVscGVycy91cmwtaGFuZGxlci5qcyIsIi4uL2xpYi9oZWxwZXJzL3Jlc3BvbnNlLWhhbmRsZXIuanMiLCIuLi9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiB7ZG9uZTogdmFsdWUgPT09IHVuZGVmaW5lZCwgdmFsdWU6IHZhbHVlfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMubWFwKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHRoaXMubWFwW25hbWVdLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB2YWx1ZSwgbmFtZSwgdGhpcylcbiAgICAgIH0sIHRoaXMpXG4gICAgfSwgdGhpcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKG5hbWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgaXRlbXMucHVzaCh2YWx1ZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgSGVhZGVycy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIC8vIE9ubHkgc3VwcG9ydCBBcnJheUJ1ZmZlcnMgZm9yIFBPU1QgbWV0aG9kLlxuICAgICAgICAvLyBSZWNlaXZpbmcgQXJyYXlCdWZmZXJzIGhhcHBlbnMgdmlhIEJsb2JzLCBpbnN0ZWFkLlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG4gICAgaWYgKFJlcXVlc3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5wdXQpKSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gaW5wdXRcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcylcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gaGVhZGVycyh4aHIpIHtcbiAgICB2YXIgaGVhZCA9IG5ldyBIZWFkZXJzKClcbiAgICB2YXIgcGFpcnMgPSAoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKS50cmltKCkuc3BsaXQoJ1xcbicpXG4gICAgcGFpcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgIHZhciBzcGxpdCA9IGhlYWRlci50cmltKCkuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHNwbGl0LnNoaWZ0KCkudHJpbSgpXG4gICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc6JykudHJpbSgpXG4gICAgICBoZWFkLmFwcGVuZChrZXksIHZhbHVlKVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSBvcHRpb25zLnN0YXR1c1RleHRcbiAgICB0aGlzLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzID8gb3B0aW9ucy5oZWFkZXJzIDogbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdFxuICAgICAgaWYgKFJlcXVlc3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5wdXQpICYmICFpbml0KSB7XG4gICAgICAgIHJlcXVlc3QgPSBpbnB1dFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgfVxuXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgZnVuY3Rpb24gcmVzcG9uc2VVUkwoKSB7XG4gICAgICAgIGlmICgncmVzcG9uc2VVUkwnIGluIHhocikge1xuICAgICAgICAgIHJldHVybiB4aHIucmVzcG9uc2VVUkxcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF2b2lkIHNlY3VyaXR5IHdhcm5pbmdzIG9uIGdldFJlc3BvbnNlSGVhZGVyIHdoZW4gbm90IGFsbG93ZWQgYnkgQ09SU1xuICAgICAgICBpZiAoL15YLVJlcXVlc3QtVVJMOi9tLnRlc3QoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSkge1xuICAgICAgICAgIHJldHVybiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcnMoeGhyKSxcbiAgICAgICAgICB1cmw6IHJlc3BvbnNlVVJMKClcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiLyoqXG4gKiBCdWlsZCBxdWVyeSBwYXJhbXMgc3RyaW5ncyBmcm9tIHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgdXJsIHRvIGFwcGVuZCB0aGUgcXVlcnkgdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgVGhlIG9iamVjdCB0byBidWlsZCB0aGUgcXVlcnkgZnJvbVxuICogQHJldHVybnMge1N0cmluZ30gVGhlIHF1ZXJ5IHN0cmluZ1xuICovXG5mdW5jdGlvbiBidWlsZFF1ZXJ5KHVybCA9ICcnLCBwYXJhbXMgPSB7fSkge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocGFyYW1zKVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB1cmxcbiAgfVxuXG4gIHJldHVybiB1cmwgKyBlbmNvZGVVUkkoa2V5c1xuICAgIC5yZWR1Y2UoKGFjYywga2V5KSA9PiBgJHthY2N9JiR7a2V5fT0ke3BhcmFtc1trZXldIHx8ICcnfWAsICc/JylcbiAgICAucmVwbGFjZSgnPyYnLCAnPycpXG4gIClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBidWlsZFF1ZXJ5XG4iLCIvKipcbiAqIFBhcnNlcyBhIHVybCB0byBnZXQgdGhlIHF1ZXJ5IHBhcmFtc1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIHVybCB0byBwYXJzZVxuICogQHJldHVybnMge09iamVjdH0gQSBtYXAgb2YgdGhlIHF1ZXJ5IGtleXMgJiB2YWx1ZXNcbiAqL1xuZnVuY3Rpb24gcGFyc2VRdWVyeSh1cmwgPSAnJykge1xuICBpZiAoIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgcmV0dXJuIHt9XG4gIH1cbiAgY29uc3QgcGFyYW1zID0ge31cbiAgY29uc3QgWywgcXVlcnldID0gZGVjb2RlVVJJKHVybCkuc3BsaXQoJz8nKVxuXG4gIGNvbnN0IHBhaXJzID0gcXVlcnkuc3BsaXQoJyYnKVxuXG4gIHBhaXJzLmZvckVhY2gocGFpciA9PiB7XG4gICAgY29uc3QgW2tleSwgdmFsdWVdID0gcGFpci5zcGxpdCgnPScpXG4gICAgcGFyYW1zW2tleV0gPSBwYXJzZVZhbHVlKHZhbHVlKVxuICB9KVxuICByZXR1cm4gcGFyYW1zXG59XG5cbmZ1bmN0aW9uIHBhcnNlVmFsdWUodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuICBpZiAodmFsdWUgPT09ICd0cnVlJykge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHZhbHVlID09PSAnZmFsc2UnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgY29uc3QgbnVtYmVyID0gcGFyc2VGbG9hdCh2YWx1ZSlcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGVxZXFlcVxuICBpZiAoTnVtYmVyLmlzTmFOKG51bWJlcikgfHwgbnVtYmVyICE9IHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgcmV0dXJuIG51bWJlclxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlUXVlcnlcbiIsImNvbnN0IGJ1aWxkID0gcmVxdWlyZSgnLi9idWlsZCcpXG5jb25zdCBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGRRdWVyeTogYnVpbGQsXG4gIHBhcnNlUXVlcnk6IHBhcnNlXG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBNaWRkbGV3YXJlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5fYmVmb3JlICA9IFtdO1xuICAgIHRoaXMuX3N1Y2Nlc3MgPSBbXTtcbiAgICB0aGlzLl9lcnJvciAgID0gW107XG4gICAgdGhpcy5fYWZ0ZXIgICA9IFtdO1xuICB9XG5cbiAgYmVmb3JlKGZuKSB7XG4gICAgdGhpcy5fYmVmb3JlLnB1c2goZm4pO1xuICAgIHJldHVybiB0aGlzLl9iZWZvcmUubGVuZ3RoIC0gMTtcbiAgfVxuXG4gIHN1Y2Nlc3Moc3VjY2VzcyA9IHJlcyA9PiByZXMpIHtcbiAgICB0aGlzLl9zdWNjZXNzLnB1c2goc3VjY2Vzcyk7XG4gICAgcmV0dXJuIHRoaXMuX3N1Y2Nlc3MubGVuZ3RoIC0gMTtcbiAgfVxuXG4gIGVycm9yKGZuKSB7XG4gICAgdGhpcy5fZXJyb3IucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXMuX2Vycm9yLmxlbmd0aCAtIDE7XG4gIH1cblxuICBhZnRlcihmbikge1xuICAgIHRoaXMuX2FmdGVyLnB1c2goZm4pO1xuICAgIHJldHVybiB0aGlzLl9hZnRlci5sZW5ndGggLSAxO1xuICB9XG5cbiAgcmVzb2x2ZUJlZm9yZShjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5fYmVmb3JlLnJlZHVjZSgocHJvbWlzZSwgYmVmb3JlKSA9PiB7XG4gICAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKGJlZm9yZSk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9LCBQcm9taXNlLnJlc29sdmUoY29uZmlnKSk7XG4gIH1cblxuICByZXNvbHZlU3VjY2VzcyhyZXMpIHtcbiAgICByZXR1cm4gdGhpcy5fc3VjY2Vzcy5yZWR1Y2UoKHByb21pc2UsIHN1Y2Nlc3MpID0+IHtcbiAgICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oc3VjY2Vzcyk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9LCBQcm9taXNlLnJlc29sdmUocmVzKSk7XG4gIH1cblxuICByZXNvbHZlRXJyb3IoZXJyKSB7XG4gICAgdGhpcy5fZXJyb3IuZm9yRWFjaChmbiA9PiBmbiAmJiBmbi5jYWxsICYmIGZuKGVycikpO1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICB9XG5cbiAgcmVzb2x2ZUFmdGVyKGVyciwgcmVzKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FmdGVyLnJlZHVjZSgocHJvbWlzZSwgYWZ0ZXIpID0+IHtcbiAgICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oYWZ0ZXIpO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfSwgZXJyID8gUHJvbWlzZS5yZWplY3QocmVzKSA6IFByb21pc2UucmVzb2x2ZShyZXMpKTtcbiAgfVxufVxuIiwiLyohXHJcbiAqIEBuYW1lIEphdmFTY3JpcHQvTm9kZUpTIE1lcmdlIHYxLjIuMFxyXG4gKiBAYXV0aG9yIHllaWtvc1xyXG4gKiBAcmVwb3NpdG9yeSBodHRwczovL2dpdGh1Yi5jb20veWVpa29zL2pzLm1lcmdlXHJcblxyXG4gKiBDb3B5cmlnaHQgMjAxNCB5ZWlrb3MgLSBNSVQgbGljZW5zZVxyXG4gKiBodHRwczovL3Jhdy5naXRodWIuY29tL3llaWtvcy9qcy5tZXJnZS9tYXN0ZXIvTElDRU5TRVxyXG4gKi9cclxuXHJcbjsoZnVuY3Rpb24oaXNOb2RlKSB7XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIG9uZSBvciBtb3JlIG9iamVjdHMgXHJcblx0ICogQHBhcmFtIGJvb2w/IGNsb25lXHJcblx0ICogQHBhcmFtIG1peGVkLC4uLiBhcmd1bWVudHNcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHR2YXIgUHVibGljID0gZnVuY3Rpb24oY2xvbmUpIHtcclxuXHJcblx0XHRyZXR1cm4gbWVyZ2UoY2xvbmUgPT09IHRydWUsIGZhbHNlLCBhcmd1bWVudHMpO1xyXG5cclxuXHR9LCBwdWJsaWNOYW1lID0gJ21lcmdlJztcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9yIG1vcmUgb2JqZWN0cyByZWN1cnNpdmVseSBcclxuXHQgKiBAcGFyYW0gYm9vbD8gY2xvbmVcclxuXHQgKiBAcGFyYW0gbWl4ZWQsLi4uIGFyZ3VtZW50c1xyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdFB1YmxpYy5yZWN1cnNpdmUgPSBmdW5jdGlvbihjbG9uZSkge1xyXG5cclxuXHRcdHJldHVybiBtZXJnZShjbG9uZSA9PT0gdHJ1ZSwgdHJ1ZSwgYXJndW1lbnRzKTtcclxuXHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQ2xvbmUgdGhlIGlucHV0IHJlbW92aW5nIGFueSByZWZlcmVuY2VcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcmV0dXJuIG1peGVkXHJcblx0ICovXHJcblxyXG5cdFB1YmxpYy5jbG9uZSA9IGZ1bmN0aW9uKGlucHV0KSB7XHJcblxyXG5cdFx0dmFyIG91dHB1dCA9IGlucHV0LFxyXG5cdFx0XHR0eXBlID0gdHlwZU9mKGlucHV0KSxcclxuXHRcdFx0aW5kZXgsIHNpemU7XHJcblxyXG5cdFx0aWYgKHR5cGUgPT09ICdhcnJheScpIHtcclxuXHJcblx0XHRcdG91dHB1dCA9IFtdO1xyXG5cdFx0XHRzaXplID0gaW5wdXQubGVuZ3RoO1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleD0wO2luZGV4PHNpemU7KytpbmRleClcclxuXHJcblx0XHRcdFx0b3V0cHV0W2luZGV4XSA9IFB1YmxpYy5jbG9uZShpbnB1dFtpbmRleF0pO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpIHtcclxuXHJcblx0XHRcdG91dHB1dCA9IHt9O1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleCBpbiBpbnB1dClcclxuXHJcblx0XHRcdFx0b3V0cHV0W2luZGV4XSA9IFB1YmxpYy5jbG9uZShpbnB1dFtpbmRleF0pO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb2JqZWN0cyByZWN1cnNpdmVseVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEBwYXJhbSBtaXhlZCBleHRlbmRcclxuXHQgKiBAcmV0dXJuIG1peGVkXHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIG1lcmdlX3JlY3Vyc2l2ZShiYXNlLCBleHRlbmQpIHtcclxuXHJcblx0XHRpZiAodHlwZU9mKGJhc2UpICE9PSAnb2JqZWN0JylcclxuXHJcblx0XHRcdHJldHVybiBleHRlbmQ7XHJcblxyXG5cdFx0Zm9yICh2YXIga2V5IGluIGV4dGVuZCkge1xyXG5cclxuXHRcdFx0aWYgKHR5cGVPZihiYXNlW2tleV0pID09PSAnb2JqZWN0JyAmJiB0eXBlT2YoZXh0ZW5kW2tleV0pID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0XHRiYXNlW2tleV0gPSBtZXJnZV9yZWN1cnNpdmUoYmFzZVtrZXldLCBleHRlbmRba2V5XSk7XHJcblxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHRiYXNlW2tleV0gPSBleHRlbmRba2V5XTtcclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGJhc2U7XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9yIG1vcmUgb2JqZWN0c1xyXG5cdCAqIEBwYXJhbSBib29sIGNsb25lXHJcblx0ICogQHBhcmFtIGJvb2wgcmVjdXJzaXZlXHJcblx0ICogQHBhcmFtIGFycmF5IGFyZ3ZcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiBtZXJnZShjbG9uZSwgcmVjdXJzaXZlLCBhcmd2KSB7XHJcblxyXG5cdFx0dmFyIHJlc3VsdCA9IGFyZ3ZbMF0sXHJcblx0XHRcdHNpemUgPSBhcmd2Lmxlbmd0aDtcclxuXHJcblx0XHRpZiAoY2xvbmUgfHwgdHlwZU9mKHJlc3VsdCkgIT09ICdvYmplY3QnKVxyXG5cclxuXHRcdFx0cmVzdWx0ID0ge307XHJcblxyXG5cdFx0Zm9yICh2YXIgaW5kZXg9MDtpbmRleDxzaXplOysraW5kZXgpIHtcclxuXHJcblx0XHRcdHZhciBpdGVtID0gYXJndltpbmRleF0sXHJcblxyXG5cdFx0XHRcdHR5cGUgPSB0eXBlT2YoaXRlbSk7XHJcblxyXG5cdFx0XHRpZiAodHlwZSAhPT0gJ29iamVjdCcpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Zm9yICh2YXIga2V5IGluIGl0ZW0pIHtcclxuXHJcblx0XHRcdFx0dmFyIHNpdGVtID0gY2xvbmUgPyBQdWJsaWMuY2xvbmUoaXRlbVtrZXldKSA6IGl0ZW1ba2V5XTtcclxuXHJcblx0XHRcdFx0aWYgKHJlY3Vyc2l2ZSkge1xyXG5cclxuXHRcdFx0XHRcdHJlc3VsdFtrZXldID0gbWVyZ2VfcmVjdXJzaXZlKHJlc3VsdFtrZXldLCBzaXRlbSk7XHJcblxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdFx0cmVzdWx0W2tleV0gPSBzaXRlbTtcclxuXHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0eXBlIG9mIHZhcmlhYmxlXHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHJldHVybiBzdHJpbmdcclxuXHQgKlxyXG5cdCAqIEBzZWUgaHR0cDovL2pzcGVyZi5jb20vdHlwZW9mdmFyXHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIHR5cGVPZihpbnB1dCkge1xyXG5cclxuXHRcdHJldHVybiAoe30pLnRvU3RyaW5nLmNhbGwoaW5wdXQpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHR9XHJcblxyXG5cdGlmIChpc05vZGUpIHtcclxuXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IFB1YmxpYztcclxuXHJcblx0fSBlbHNlIHtcclxuXHJcblx0XHR3aW5kb3dbcHVibGljTmFtZV0gPSBQdWJsaWM7XHJcblxyXG5cdH1cclxuXHJcbn0pKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKTsiLCJpbXBvcnQgX21lcmdlIGZyb20gJ21lcmdlJztcblxuLyoqXG4gKiBSZWN1cnNpdmVseSBtZXJnZSBvYmplY3RzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdHMgdG8gbWVyZ2VcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIG1lcmdlZCBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZSguLi5wYXJhbXMpICB7XG4gIHJldHVybiBfbWVyZ2UucmVjdXJzaXZlKHRydWUsIC4uLnBhcmFtcyk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgc2tpcHBlZCBwcm9wZXJ0aWVzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiB0aGUgb2JqZWN0IHRvIHNraXAgcHJvcGVydGllcyBmcm9tXG4gKiBAcGFyYW0ge1tTdHJpbmddfSBrZXlzIGtleXMgb2YgdGhlIHByb3BlcnRpZXMgdG8gc2tpcFxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgb2JqZWN0IHdpdGggdGhlIHByb3BlcnRpZXMgc2tpcHBlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2tpcChvYmosIGtleXMpIHtcbiAgY29uc3Qgc2tpcHBlZCA9IHt9O1xuICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goKG9iaktleSkgPT4ge1xuICAgIGlmIChrZXlzLmluZGV4T2Yob2JqS2V5KSA9PT0gLTEpIHtcbiAgICAgIHNraXBwZWRbb2JqS2V5XSA9IG9ialtvYmpLZXldO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBza2lwcGVkO1xufVxuIiwiaW1wb3J0IHsgbWVyZ2UgfSBmcm9tICcuL3V0aWxzJztcblxuY29uc3QgREVGQVVMVF9IRUFERVJTID0ge1xuICAnQWNjZXB0JyAgICAgIDogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvcGxhaW4sICovKicsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgcXVvdGUtcHJvcHNcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xufTtcblxuY29uc3QgREVGQVVMVF9DT05GSUcgPSB7XG4gIHhzcmZDb29raWVOYW1lOiAnWFNSRi1UT0tFTicsXG4gIHhzcmZIZWFkZXJOYW1lOiAnWC1YU1JGLVRPS0VOJ1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29uZmlnIHtcbiAgY29uc3RydWN0b3IoY29uZmlnID0ge30pIHtcbiAgICB0aGlzLl9kZWZhdWx0cyA9IG1lcmdlKERFRkFVTFRfQ09ORklHLCB7IGhlYWRlcnM6IERFRkFVTFRfSEVBREVSUyB9KTtcbiAgICB0aGlzLl9jb25maWcgICA9IHt9O1xuXG4gICAgdGhpcy5zZXQoY29uZmlnKTtcbiAgfVxuXG4gIG1lcmdlV2l0aERlZmF1bHRzKC4uLmNvbmZpZ1BhcmFtcykge1xuICAgIGNvbnN0IGNvbmZpZyA9IG1lcmdlKHRoaXMuX2RlZmF1bHRzLCB0aGlzLl9jb25maWcsIC4uLmNvbmZpZ1BhcmFtcyk7XG4gICAgaWYgKFxuICAgICAgdHlwZW9mIGNvbmZpZy5ib2R5ID09PSAnb2JqZWN0JyAmJlxuICAgICAgY29uZmlnLmhlYWRlcnMgJiZcbiAgICAgIGNvbmZpZy5oZWFkZXJzWydDb250ZW50LVR5cGUnXSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgKSB7XG4gICAgICBjb25maWcuYm9keSA9IEpTT04uc3RyaW5naWZ5KGNvbmZpZy5ib2R5KTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIHNldChjb25maWcpIHtcbiAgICB0aGlzLl9jb25maWcgPSBtZXJnZSh0aGlzLl9jb25maWcsIGNvbmZpZyk7XG4gIH1cblxuICBnZXQoKSB7XG4gICAgcmV0dXJuIG1lcmdlKHRoaXMuX2RlZmF1bHRzLCB0aGlzLl9jb25maWcpO1xuICB9XG59XG4iLCIvKipcbiAqIENyZWF0ZXMgYSBuZXcgVVJMIGJ5IGNvbWJpbmluZyB0aGUgc3BlY2lmaWVkIFVSTHNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVSTCBUaGUgYmFzZSBVUkxcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVSTCBUaGUgcmVsYXRpdmUgVVJMXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY29tYmluZWQgVVJMXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmUoYmFzZVVSTCwgcmVsYXRpdmVVUkwpIHtcbiAgcmV0dXJuIGAke2Jhc2VVUkwucmVwbGFjZSgvXFwvKyQvLCAnJyl9LyR7cmVsYXRpdmVVUkwucmVwbGFjZSgvXlxcLysvLCAnJyl9YDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFRoZSBVUkwgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBYnNvbHV0ZSh1cmwpIHtcbiAgLy8gQSBVUkwgaXMgY29uc2lkZXJlZCBhYnNvbHV0ZSBpZiBpdCBiZWdpbnMgd2l0aCBcIjxzY2hlbWU+Oi8vXCIgb3IgXCIvL1wiIChwcm90b2NvbC1yZWxhdGl2ZSBVUkwpLlxuICAvLyBSRkMgMzk4NiBkZWZpbmVzIHNjaGVtZSBuYW1lIGFzIGEgc2VxdWVuY2Ugb2YgY2hhcmFjdGVycyBiZWdpbm5pbmcgd2l0aCBhIGxldHRlciBhbmQgZm9sbG93ZWRcbiAgLy8gYnkgYW55IGNvbWJpbmF0aW9uIG9mIGxldHRlcnMsIGRpZ2l0cywgcGx1cywgcGVyaW9kLCBvciBoeXBoZW4uXG4gIHJldHVybiAvXihbYS16XVthLXpcXGRcXCtcXC1cXC5dKjopP1xcL1xcLy9pLnRlc3QodXJsKTtcbn1cblxuLyoqXG4gKiBGb3JtYXQgYW4gdXJsIGNvbWJpbmluZyBwcm92aWRlZCB1cmxzIG9yIHJldHVybmluZyB0aGUgcmVsYXRpdmVVUkxcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVybCBUaGUgYmFzZSB1cmxcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVSTCBUaGUgcmVsYXRpdmUgdXJsXG4gKiBAcmV0dXJucyB7c3RyaW5nfSByZWxhdGl2ZVVSTCBpZiB0aGUgc3BlY2lmaWVkIHJlbGF0aXZlVVJMIGlzIGFic29sdXRlIG9yIGJhc2VVcmwgaXMgbm90IGRlZmluZWQsXG4gKiAgICAgICAgICAgICAgICAgICBvdGhlcndpc2UgaXQgcmV0dXJucyB0aGUgY29tYmluYXRpb24gb2YgYm90aCB1cmxzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXQoYmFzZVVybCwgcmVsYXRpdmVVUkwpIHtcbiAgaWYgKCFiYXNlVXJsIHx8IGlzQWJzb2x1dGUocmVsYXRpdmVVUkwpKSB7XG4gICAgcmV0dXJuIHJlbGF0aXZlVVJMO1xuICB9XG5cbiAgcmV0dXJuIGNvbWJpbmUoYmFzZVVybCwgcmVsYXRpdmVVUkwpO1xufVxuIiwiLyoqXG4gKiBXcmFwcCBhIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIHJlc3BvbnNlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHJlYWRlciB0eXBlIG9mIHJlYWRlciB0byB1c2Ugb24gcmVzcG9uc2UgYm9keVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZXMgdG8gdGhlIHdyYXBwZWQgcmVhZCByZXNwb25zZVxuICovXG5mdW5jdGlvbiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsIHJlYWRlcikge1xuICByZXR1cm4gcmVzcG9uc2VbcmVhZGVyXSgpXG4gIC50aGVuKGRhdGEgPT4gKHtcbiAgICBoZWFkZXJzICAgOiByZXNwb25zZS5oZWFkZXJzLFxuICAgIHN0YXR1cyAgICA6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICBzdGF0dXNUZXh0OiByZXNwb25zZS5zdGF0dXNUZXh0LFxuICAgIGRhdGFcbiAgfSkpO1xufVxuXG4vKipcbiAqIFJlYWRzIG9yIHJlamVjdHMgYSBmZXRjaCByZXF1ZXN0IHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIHJlc3BvbnNlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHJlYWRlciB0eXBlIG9mIHJlYWRlciB0byB1c2Ugb24gcmVzcG9uc2UgYm9keVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVhZCBvciByZWplY3Rpb24gcHJvbWlzZVxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZXNwb25zZUhhbmRsZXIocmVzcG9uc2UsIHJlYWRlcikge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgY29uc3QgZXJyICAgICAgID0gbmV3IEVycm9yKHJlc3BvbnNlLnN0YXR1c1RleHQpO1xuICAgIGVyci5zdGF0dXMgICAgICA9IHJlc3BvbnNlLnN0YXR1cztcbiAgICBlcnIuc3RhdHVzVGV4dCAgPSByZXNwb25zZS5zdGF0dXNUZXh0O1xuICAgIGVyci5oZWFkZXJzICAgICA9IHJlc3BvbnNlLmhlYWRlcnM7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gIH1cbiAgaWYgKHJlYWRlcikge1xuICAgIHJldHVybiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsIHJlYWRlcik7XG4gIH1cblxuICBjb25zdCBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKTtcbiAgaWYgKGNvbnRlbnRUeXBlICYmIGNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCAnanNvbicpO1xuICB9XG4gIHJldHVybiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsICd0ZXh0Jyk7XG59XG4iLCJpbXBvcnQgJ3doYXR3Zy1mZXRjaCc7XG5pbXBvcnQgcXVlcnkgZnJvbSAndHJhZS1xdWVyeSc7XG5cbmltcG9ydCBNaWRkbGV3YXJlICAgICAgZnJvbSAnLi9taWRkbGV3YXJlJztcbmltcG9ydCBDb25maWcgICAgICAgICAgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHsgc2tpcCB9ICAgICAgICBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGZvcm1hdCB9ICAgICAgZnJvbSAnLi9oZWxwZXJzL3VybC1oYW5kbGVyJztcbmltcG9ydCByZXNwb25zZUhhbmRsZXIgZnJvbSAnLi9oZWxwZXJzL3Jlc3BvbnNlLWhhbmRsZXInO1xuXG5jbGFzcyBUcmFlIHtcbiAgY29uc3RydWN0b3IoY29uZmlnID0ge30pIHtcbiAgICB0aGlzLl9taWRkbGV3YXJlID0gbmV3IE1pZGRsZXdhcmUoKTtcbiAgICB0aGlzLl9jb25maWcgICAgID0gbmV3IENvbmZpZyhza2lwKGNvbmZpZywgWydiYXNlVXJsJ10pKTtcblxuICAgIHRoaXMuYmFzZVVybChjb25maWcuYmFzZVVybCB8fCAnJyk7XG4gICAgdGhpcy5faW5pdE1ldGhvZHNXaXRoQm9keSgpO1xuICAgIHRoaXMuX2luaXRNZXRob2RzV2l0aE5vQm9keSgpO1xuICB9XG5cbiAgY3JlYXRlKGNvbmZpZykge1xuICAgIHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3Rvcihjb25maWcpO1xuICB9XG5cbiAgdXNlKG1pZGRsZXdhcmVzID0ge30pIHtcbiAgICBtaWRkbGV3YXJlcy5iZWZvcmUgICYmIHRoaXMuX21pZGRsZXdhcmUuYmVmb3JlKG1pZGRsZXdhcmVzLmJlZm9yZSk7XG4gICAgbWlkZGxld2FyZXMuc3VjY2VzcyAmJiB0aGlzLl9taWRkbGV3YXJlLnN1Y2Nlc3MobWlkZGxld2FyZXMuc3VjY2Vzcyk7XG4gICAgbWlkZGxld2FyZXMuZXJyb3IgICAmJiB0aGlzLl9taWRkbGV3YXJlLmVycm9yKG1pZGRsZXdhcmVzLmVycm9yKTtcbiAgICBtaWRkbGV3YXJlcy5hZnRlciAgICYmIHRoaXMuX21pZGRsZXdhcmUuYWZ0ZXIobWlkZGxld2FyZXMuYWZ0ZXIpO1xuICB9XG5cbiAgZGVmYXVsdHMoY29uZmlnKSB7XG4gICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY29uZmlnLmdldCgpO1xuICAgIH1cbiAgICB0aGlzLl9jb25maWcuc2V0KHNraXAoY29uZmlnLCBbJ2Jhc2VVcmwnXSkpO1xuICAgIGNvbmZpZy5iYXNlVXJsICYmIHRoaXMuYmFzZVVybChjb25maWcuYmFzZVVybCk7XG4gICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5nZXQoKTtcbiAgfVxuXG4gIGJhc2VVcmwoYmFzZVVybCkge1xuICAgIGlmICh0eXBlb2YgYmFzZVVybCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLl9iYXNlVXJsO1xuICAgIH1cbiAgICB0aGlzLl9iYXNlVXJsID0gYmFzZVVybDtcbiAgICByZXR1cm4gdGhpcy5fYmFzZVVybDtcbiAgfVxuXG4gIHJlcXVlc3QoY29uZmlnID0ge30pIHtcbiAgICBjb25maWcubWV0aG9kIHx8IChjb25maWcubWV0aG9kID0gJ2dldCcpO1xuICAgIGNvbnN0IG1lcmdlZENvbmZpZyA9IHRoaXMuX2NvbmZpZy5tZXJnZVdpdGhEZWZhdWx0cyhjb25maWcpO1xuICAgIGNvbnN0IHVybCAgICAgICAgICA9IHF1ZXJ5LmJ1aWxkUXVlcnkoZm9ybWF0KHRoaXMuX2Jhc2VVcmwsIGNvbmZpZy51cmwpLCBjb25maWcucGFyYW1zKTtcblxuICAgIHJldHVybiB0aGlzLl9mZXRjaCh1cmwsIG1lcmdlZENvbmZpZyk7XG4gIH1cblxuICBfZmV0Y2godXJsLCBjb25maWcpIHtcbiAgICBsZXQgcnVuQWZ0ZXIgPSB0cnVlO1xuXG4gICAgcmV0dXJuIHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUJlZm9yZShjb25maWcpXG4gICAgLnRoZW4oY29uZmlnID0+IGZldGNoKHVybCwgY29uZmlnKSlcbiAgICAudGhlbihyZXMgPT4gcmVzcG9uc2VIYW5kbGVyKHJlcywgY29uZmlnLmJvZHlUeXBlKSlcbiAgICAudGhlbihyZXMgPT4gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlU3VjY2VzcyhyZXMpKVxuICAgIC50aGVuKChyZXMpID0+IHtcbiAgICAgIHJ1bkFmdGVyID0gZmFsc2U7XG4gICAgICByZXR1cm4gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlQWZ0ZXIobnVsbCwgcmVzKTtcbiAgICB9KVxuICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICB0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVFcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIHJ1bkFmdGVyID8gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlQWZ0ZXIoZXJyKSA6IFByb21pc2UucmVqZWN0KGVycik7XG4gICAgfSk7XG4gIH1cblxuICBfaW5pdE1ldGhvZHNXaXRoTm9Cb2R5KCkge1xuICAgIFsnZ2V0JywgJ2RlbGV0ZScsICdoZWFkJ10uZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICB0aGlzW21ldGhvZF0gPSAocGF0aCwgY29uZmlnID0ge30pID0+IHtcbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlV2l0aERlZmF1bHRzKGNvbmZpZywgeyBtZXRob2QgfSk7XG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgICA9IHF1ZXJ5LmJ1aWxkUXVlcnkoZm9ybWF0KHRoaXMuX2Jhc2VVcmwsIHBhdGgpLCBjb25maWcucGFyYW1zKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIF9pbml0TWV0aG9kc1dpdGhCb2R5KCkge1xuICAgIFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIHRoaXNbbWV0aG9kXSA9IChwYXRoLCBib2R5LCBjb25maWcpID0+IHtcbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlV2l0aERlZmF1bHRzKGNvbmZpZywgeyBib2R5LCBtZXRob2QgfSk7XG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdCh0aGlzLl9iYXNlVXJsLCBwYXRoKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBUcmFlKCk7XG4iXSwibmFtZXMiOlsic2VsZiIsImZldGNoIiwic3VwcG9ydCIsIlN5bWJvbCIsIkJsb2IiLCJlIiwibm9ybWFsaXplTmFtZSIsIm5hbWUiLCJTdHJpbmciLCJ0ZXN0IiwiVHlwZUVycm9yIiwidG9Mb3dlckNhc2UiLCJub3JtYWxpemVWYWx1ZSIsInZhbHVlIiwiaXRlcmF0b3JGb3IiLCJpdGVtcyIsIml0ZXJhdG9yIiwic2hpZnQiLCJkb25lIiwidW5kZWZpbmVkIiwiaXRlcmFibGUiLCJIZWFkZXJzIiwiaGVhZGVycyIsIm1hcCIsImZvckVhY2giLCJhcHBlbmQiLCJnZXRPd25Qcm9wZXJ0eU5hbWVzIiwicHJvdG90eXBlIiwibGlzdCIsInB1c2giLCJnZXQiLCJ2YWx1ZXMiLCJnZXRBbGwiLCJoYXMiLCJoYXNPd25Qcm9wZXJ0eSIsInNldCIsImNhbGxiYWNrIiwidGhpc0FyZyIsImNhbGwiLCJrZXlzIiwiZW50cmllcyIsImNvbnN1bWVkIiwiYm9keSIsImJvZHlVc2VkIiwiUHJvbWlzZSIsInJlamVjdCIsImZpbGVSZWFkZXJSZWFkeSIsInJlYWRlciIsInJlc29sdmUiLCJvbmxvYWQiLCJyZXN1bHQiLCJvbmVycm9yIiwiZXJyb3IiLCJyZWFkQmxvYkFzQXJyYXlCdWZmZXIiLCJibG9iIiwiRmlsZVJlYWRlciIsInJlYWRBc0FycmF5QnVmZmVyIiwicmVhZEJsb2JBc1RleHQiLCJyZWFkQXNUZXh0IiwiQm9keSIsIl9pbml0Qm9keSIsIl9ib2R5SW5pdCIsIl9ib2R5VGV4dCIsImlzUHJvdG90eXBlT2YiLCJfYm9keUJsb2IiLCJmb3JtRGF0YSIsIkZvcm1EYXRhIiwiX2JvZHlGb3JtRGF0YSIsInNlYXJjaFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInRvU3RyaW5nIiwiYXJyYXlCdWZmZXIiLCJBcnJheUJ1ZmZlciIsIkVycm9yIiwidHlwZSIsInJlamVjdGVkIiwidGhlbiIsInRleHQiLCJkZWNvZGUiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwibWV0aG9kcyIsIm5vcm1hbGl6ZU1ldGhvZCIsIm1ldGhvZCIsInVwY2FzZWQiLCJ0b1VwcGVyQ2FzZSIsImluZGV4T2YiLCJSZXF1ZXN0IiwiaW5wdXQiLCJvcHRpb25zIiwidXJsIiwiY3JlZGVudGlhbHMiLCJtb2RlIiwicmVmZXJyZXIiLCJjbG9uZSIsImZvcm0iLCJ0cmltIiwic3BsaXQiLCJieXRlcyIsInJlcGxhY2UiLCJqb2luIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwieGhyIiwiaGVhZCIsInBhaXJzIiwiZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIiwiaGVhZGVyIiwia2V5IiwiUmVzcG9uc2UiLCJib2R5SW5pdCIsInN0YXR1cyIsIm9rIiwic3RhdHVzVGV4dCIsInJlc3BvbnNlIiwicmVkaXJlY3RTdGF0dXNlcyIsInJlZGlyZWN0IiwiUmFuZ2VFcnJvciIsImxvY2F0aW9uIiwiaW5pdCIsInJlcXVlc3QiLCJYTUxIdHRwUmVxdWVzdCIsInJlc3BvbnNlVVJMIiwiZ2V0UmVzcG9uc2VIZWFkZXIiLCJyZXNwb25zZVRleHQiLCJvbnRpbWVvdXQiLCJvcGVuIiwid2l0aENyZWRlbnRpYWxzIiwicmVzcG9uc2VUeXBlIiwic2V0UmVxdWVzdEhlYWRlciIsInNlbmQiLCJwb2x5ZmlsbCIsInRoaXMiLCJidWlsZFF1ZXJ5IiwicGFyYW1zIiwiT2JqZWN0IiwibGVuZ3RoIiwiZW5jb2RlVVJJIiwicmVkdWNlIiwiYWNjIiwicGFyc2VRdWVyeSIsImluY2x1ZGVzIiwiZGVjb2RlVVJJIiwicXVlcnkiLCJwYWlyIiwicGFyc2VWYWx1ZSIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJOdW1iZXIiLCJpc05hTiIsImJ1aWxkIiwicmVxdWlyZSQkMSIsInJlcXVpcmUkJDAiLCJNaWRkbGV3YXJlIiwiX2JlZm9yZSIsIl9zdWNjZXNzIiwiX2Vycm9yIiwiX2FmdGVyIiwiZm4iLCJzdWNjZXNzIiwicmVzIiwiY29uZmlnIiwicHJvbWlzZSIsImJlZm9yZSIsImVyciIsImFmdGVyIiwiaXNOb2RlIiwiUHVibGljIiwibWVyZ2UiLCJhcmd1bWVudHMiLCJwdWJsaWNOYW1lIiwicmVjdXJzaXZlIiwib3V0cHV0IiwidHlwZU9mIiwiaW5kZXgiLCJzaXplIiwibWVyZ2VfcmVjdXJzaXZlIiwiYmFzZSIsImV4dGVuZCIsImFyZ3YiLCJpdGVtIiwic2l0ZW0iLCJzbGljZSIsIm1vZHVsZSIsImJhYmVsSGVscGVycy50eXBlb2YiLCJleHBvcnRzIiwiX21lcmdlIiwic2tpcCIsIm9iaiIsInNraXBwZWQiLCJvYmpLZXkiLCJERUZBVUxUX0hFQURFUlMiLCJERUZBVUxUX0NPTkZJRyIsIkNvbmZpZyIsIl9kZWZhdWx0cyIsIl9jb25maWciLCJjb25maWdQYXJhbXMiLCJzdHJpbmdpZnkiLCJjb21iaW5lIiwiYmFzZVVSTCIsInJlbGF0aXZlVVJMIiwiaXNBYnNvbHV0ZSIsImZvcm1hdCIsImJhc2VVcmwiLCJ3cmFwUmVzcG9uc2UiLCJyZXNwb25zZUhhbmRsZXIiLCJjb250ZW50VHlwZSIsIlRyYWUiLCJfbWlkZGxld2FyZSIsIl9pbml0TWV0aG9kc1dpdGhCb2R5IiwiX2luaXRNZXRob2RzV2l0aE5vQm9keSIsImNvbnN0cnVjdG9yIiwibWlkZGxld2FyZXMiLCJfYmFzZVVybCIsIm1lcmdlZENvbmZpZyIsIm1lcmdlV2l0aERlZmF1bHRzIiwiX2ZldGNoIiwicnVuQWZ0ZXIiLCJyZXNvbHZlQmVmb3JlIiwiYm9keVR5cGUiLCJyZXNvbHZlU3VjY2VzcyIsInJlc29sdmVBZnRlciIsImNhdGNoIiwicmVzb2x2ZUVycm9yIiwicGF0aCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsQ0FBQyxVQUFTQSxJQUFULEVBQWU7OztNQUdWQSxLQUFLQyxLQUFULEVBQWdCOzs7O01BSVpDLFVBQVU7a0JBQ0UscUJBQXFCRixJQUR2QjtjQUVGLFlBQVlBLElBQVosSUFBb0IsY0FBY0csTUFGaEM7VUFHTixnQkFBZ0JILElBQWhCLElBQXdCLFVBQVVBLElBQWxDLElBQTJDLFlBQVc7VUFDdEQ7WUFDRUksSUFBSjtlQUNPLElBQVA7T0FGRixDQUdFLE9BQU1DLENBQU4sRUFBUztlQUNGLEtBQVA7O0tBTDRDLEVBSHBDO2NBV0YsY0FBY0wsSUFYWjtpQkFZQyxpQkFBaUJBO0dBWmhDOztXQWVTTSxhQUFULENBQXVCQyxJQUF2QixFQUE2QjtRQUN2QixPQUFPQSxJQUFQLEtBQWdCLFFBQXBCLEVBQThCO2FBQ3JCQyxPQUFPRCxJQUFQLENBQVA7O1FBRUUsNkJBQTZCRSxJQUE3QixDQUFrQ0YsSUFBbEMsQ0FBSixFQUE2QztZQUNyQyxJQUFJRyxTQUFKLENBQWMsd0NBQWQsQ0FBTjs7V0FF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
