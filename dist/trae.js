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
      return this._before.reduce(function (promise, task) {
        promise = promise.then(task);
        return promise;
      }, Promise.resolve(config));
    }
  }, {
    key: "resolveAfter",
    value: function resolveAfter(err, response) {
      return this._after.reduce(function (promise, task) {
        promise = promise.then(task.fulfill, task.reject);
        return promise;
      }, err ? Promise.reject(err) : Promise.resolve(response));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMvdHJhZS1xdWVyeS9saWIvYnVpbGQuanMiLCIuLi9ub2RlX21vZHVsZXMvdHJhZS1xdWVyeS9saWIvcGFyc2UuanMiLCIuLi9ub2RlX21vZHVsZXMvdHJhZS1xdWVyeS9saWIvaW5kZXguanMiLCIuLi9saWIvbWlkZGxld2FyZS5qcyIsIi4uL25vZGVfbW9kdWxlcy9tZXJnZS9tZXJnZS5qcyIsIi4uL2xpYi91dGlscy5qcyIsIi4uL2xpYi9jb25maWcuanMiLCIuLi9saWIvaGVscGVycy91cmwtaGFuZGxlci5qcyIsIi4uL2xpYi9oZWxwZXJzL3Jlc3BvbnNlLWhhbmRsZXIuanMiLCIuLi9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiB7ZG9uZTogdmFsdWUgPT09IHVuZGVmaW5lZCwgdmFsdWU6IHZhbHVlfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMubWFwKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHRoaXMubWFwW25hbWVdLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB2YWx1ZSwgbmFtZSwgdGhpcylcbiAgICAgIH0sIHRoaXMpXG4gICAgfSwgdGhpcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKG5hbWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgaXRlbXMucHVzaCh2YWx1ZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgSGVhZGVycy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIC8vIE9ubHkgc3VwcG9ydCBBcnJheUJ1ZmZlcnMgZm9yIFBPU1QgbWV0aG9kLlxuICAgICAgICAvLyBSZWNlaXZpbmcgQXJyYXlCdWZmZXJzIGhhcHBlbnMgdmlhIEJsb2JzLCBpbnN0ZWFkLlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG4gICAgaWYgKFJlcXVlc3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5wdXQpKSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gaW5wdXRcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcylcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gaGVhZGVycyh4aHIpIHtcbiAgICB2YXIgaGVhZCA9IG5ldyBIZWFkZXJzKClcbiAgICB2YXIgcGFpcnMgPSAoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKS50cmltKCkuc3BsaXQoJ1xcbicpXG4gICAgcGFpcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgIHZhciBzcGxpdCA9IGhlYWRlci50cmltKCkuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHNwbGl0LnNoaWZ0KCkudHJpbSgpXG4gICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc6JykudHJpbSgpXG4gICAgICBoZWFkLmFwcGVuZChrZXksIHZhbHVlKVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSBvcHRpb25zLnN0YXR1c1RleHRcbiAgICB0aGlzLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzID8gb3B0aW9ucy5oZWFkZXJzIDogbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdFxuICAgICAgaWYgKFJlcXVlc3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5wdXQpICYmICFpbml0KSB7XG4gICAgICAgIHJlcXVlc3QgPSBpbnB1dFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgfVxuXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgZnVuY3Rpb24gcmVzcG9uc2VVUkwoKSB7XG4gICAgICAgIGlmICgncmVzcG9uc2VVUkwnIGluIHhocikge1xuICAgICAgICAgIHJldHVybiB4aHIucmVzcG9uc2VVUkxcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF2b2lkIHNlY3VyaXR5IHdhcm5pbmdzIG9uIGdldFJlc3BvbnNlSGVhZGVyIHdoZW4gbm90IGFsbG93ZWQgYnkgQ09SU1xuICAgICAgICBpZiAoL15YLVJlcXVlc3QtVVJMOi9tLnRlc3QoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSkge1xuICAgICAgICAgIHJldHVybiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcnMoeGhyKSxcbiAgICAgICAgICB1cmw6IHJlc3BvbnNlVVJMKClcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiLyoqXG4gKiBCdWlsZCBxdWVyeSBwYXJhbXMgc3RyaW5ncyBmcm9tIHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgdXJsIHRvIGFwcGVuZCB0aGUgcXVlcnkgdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgVGhlIG9iamVjdCB0byBidWlsZCB0aGUgcXVlcnkgZnJvbVxuICogQHJldHVybnMge1N0cmluZ30gVGhlIHF1ZXJ5IHN0cmluZ1xuICovXG5cblxuXG5mdW5jdGlvbiBidWlsZFF1ZXJ5KHVybCA9ICcnLCBwYXJhbXMgPSB7fSkge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocGFyYW1zKVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB1cmxcbiAgfVxuXG4gIHJldHVybiB1cmwgKyBlbmNvZGVVUkkoa2V5c1xuICAgIC5yZWR1Y2UoKGFjYywga2V5KSA9PiBgJHthY2N9JiR7a2V5fT0ke3BhcmFtc1trZXldIHx8ICcnfWAsICc/JylcbiAgICAucmVwbGFjZSgnPyYnLCAnPycpXG4gIClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBidWlsZFF1ZXJ5XG4iLCIvKipcbiAqIFBhcnNlcyBhIHVybCB0byBnZXQgdGhlIHF1ZXJ5IHBhcmFtc1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIHVybCB0byBwYXJzZVxuICogQHJldHVybnMge09iamVjdH0gQSBtYXAgb2YgdGhlIHF1ZXJ5IGtleXMgJiB2YWx1ZXNcbiAqL1xuZnVuY3Rpb24gcGFyc2VRdWVyeSh1cmwgPSAnJykge1xuICBpZiAoIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgcmV0dXJuIHt9XG4gIH1cbiAgY29uc3QgcGFyYW1zID0ge31cbiAgY29uc3QgWywgcXVlcnldID0gZGVjb2RlVVJJKHVybCkuc3BsaXQoJz8nKVxuXG4gIGNvbnN0IHBhaXJzID0gcXVlcnkuc3BsaXQoJyYnKVxuXG4gIHBhaXJzLmZvckVhY2gocGFpciA9PiB7XG4gICAgY29uc3QgW2tleSwgdmFsdWVdID0gcGFpci5zcGxpdCgnPScpXG4gICAgcGFyYW1zW2tleV0gPSBwYXJzZVZhbHVlKHZhbHVlKVxuICB9KVxuICByZXR1cm4gcGFyYW1zXG59XG5cbmZ1bmN0aW9uIHBhcnNlVmFsdWUodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuICBpZiAodmFsdWUgPT09ICd0cnVlJykge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgaWYgKHZhbHVlID09PSAnZmFsc2UnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgY29uc3QgbnVtYmVyID0gcGFyc2VGbG9hdCh2YWx1ZSlcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGVxZXFlcVxuICBpZiAoTnVtYmVyLmlzTmFOKG51bWJlcikgfHwgbnVtYmVyICE9IHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cbiAgcmV0dXJuIG51bWJlclxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlUXVlcnlcbiIsImNvbnN0IGJ1aWxkID0gcmVxdWlyZSgnLi9idWlsZCcpXG5jb25zdCBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYnVpbGRRdWVyeTogYnVpbGQsXG4gIHBhcnNlUXVlcnk6IHBhcnNlXG59XG4iLCJjb25zdCBpZGVudGl0eSAgPSByZXNwb25zZSA9PiByZXNwb25zZTtcbmNvbnN0IHJlamVjdGlvbiA9IGVyciA9PiBQcm9taXNlLnJlamVjdChlcnIpO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pZGRsZXdhcmUge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLl9iZWZvcmUgID0gW107XG4gICAgdGhpcy5fYWZ0ZXIgICA9IFtdO1xuICAgIHRoaXMuX2ZpbmFsbHkgPSBbXTtcbiAgfVxuXG4gIGJlZm9yZShmbikge1xuICAgIHRoaXMuX2JlZm9yZS5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcy5fYmVmb3JlLmxlbmd0aCAtIDE7XG4gIH1cblxuICBhZnRlcihmdWxmaWxsID0gaWRlbnRpdHksIHJlamVjdCA9IHJlamVjdGlvbikge1xuICAgIHRoaXMuX2FmdGVyLnB1c2goeyBmdWxmaWxsLCByZWplY3QgfSk7XG4gICAgcmV0dXJuIHRoaXMuX2FmdGVyLmxlbmd0aCAtIDE7XG4gIH1cblxuICBmaW5hbGx5KGZuKSB7XG4gICAgdGhpcy5fZmluYWxseS5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcy5fZmluYWxseS5sZW5ndGggLSAxO1xuICB9XG5cbiAgcmVzb2x2ZUJlZm9yZShjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5fYmVmb3JlLnJlZHVjZSgocHJvbWlzZSwgdGFzaykgPT4ge1xuICAgICAgcHJvbWlzZSA9IHByb21pc2UudGhlbih0YXNrKTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH0sIFByb21pc2UucmVzb2x2ZShjb25maWcpKTtcbiAgfVxuXG4gIHJlc29sdmVBZnRlcihlcnIsIHJlc3BvbnNlKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FmdGVyLnJlZHVjZSgocHJvbWlzZSwgdGFzaykgPT4ge1xuICAgICAgcHJvbWlzZSA9IHByb21pc2UudGhlbih0YXNrLmZ1bGZpbGwsIHRhc2sucmVqZWN0KTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH0sIGVyciA/IFByb21pc2UucmVqZWN0KGVycikgOiBQcm9taXNlLnJlc29sdmUocmVzcG9uc2UpKTtcbiAgfVxuXG5cbiAgcmVzb2x2ZUZpbmFsbHkoKSB7XG4gICAgdGhpcy5fZmluYWxseS5mb3JFYWNoKHRhc2sgPT4gdGFzaygpKTtcbiAgfVxufVxuIiwiLyohXHJcbiAqIEBuYW1lIEphdmFTY3JpcHQvTm9kZUpTIE1lcmdlIHYxLjIuMFxyXG4gKiBAYXV0aG9yIHllaWtvc1xyXG4gKiBAcmVwb3NpdG9yeSBodHRwczovL2dpdGh1Yi5jb20veWVpa29zL2pzLm1lcmdlXHJcblxyXG4gKiBDb3B5cmlnaHQgMjAxNCB5ZWlrb3MgLSBNSVQgbGljZW5zZVxyXG4gKiBodHRwczovL3Jhdy5naXRodWIuY29tL3llaWtvcy9qcy5tZXJnZS9tYXN0ZXIvTElDRU5TRVxyXG4gKi9cclxuXHJcbjsoZnVuY3Rpb24oaXNOb2RlKSB7XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1lcmdlIG9uZSBvciBtb3JlIG9iamVjdHMgXHJcblx0ICogQHBhcmFtIGJvb2w/IGNsb25lXHJcblx0ICogQHBhcmFtIG1peGVkLC4uLiBhcmd1bWVudHNcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHR2YXIgUHVibGljID0gZnVuY3Rpb24oY2xvbmUpIHtcclxuXHJcblx0XHRyZXR1cm4gbWVyZ2UoY2xvbmUgPT09IHRydWUsIGZhbHNlLCBhcmd1bWVudHMpO1xyXG5cclxuXHR9LCBwdWJsaWNOYW1lID0gJ21lcmdlJztcclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9yIG1vcmUgb2JqZWN0cyByZWN1cnNpdmVseSBcclxuXHQgKiBAcGFyYW0gYm9vbD8gY2xvbmVcclxuXHQgKiBAcGFyYW0gbWl4ZWQsLi4uIGFyZ3VtZW50c1xyXG5cdCAqIEByZXR1cm4gb2JqZWN0XHJcblx0ICovXHJcblxyXG5cdFB1YmxpYy5yZWN1cnNpdmUgPSBmdW5jdGlvbihjbG9uZSkge1xyXG5cclxuXHRcdHJldHVybiBtZXJnZShjbG9uZSA9PT0gdHJ1ZSwgdHJ1ZSwgYXJndW1lbnRzKTtcclxuXHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogQ2xvbmUgdGhlIGlucHV0IHJlbW92aW5nIGFueSByZWZlcmVuY2VcclxuXHQgKiBAcGFyYW0gbWl4ZWQgaW5wdXRcclxuXHQgKiBAcmV0dXJuIG1peGVkXHJcblx0ICovXHJcblxyXG5cdFB1YmxpYy5jbG9uZSA9IGZ1bmN0aW9uKGlucHV0KSB7XHJcblxyXG5cdFx0dmFyIG91dHB1dCA9IGlucHV0LFxyXG5cdFx0XHR0eXBlID0gdHlwZU9mKGlucHV0KSxcclxuXHRcdFx0aW5kZXgsIHNpemU7XHJcblxyXG5cdFx0aWYgKHR5cGUgPT09ICdhcnJheScpIHtcclxuXHJcblx0XHRcdG91dHB1dCA9IFtdO1xyXG5cdFx0XHRzaXplID0gaW5wdXQubGVuZ3RoO1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleD0wO2luZGV4PHNpemU7KytpbmRleClcclxuXHJcblx0XHRcdFx0b3V0cHV0W2luZGV4XSA9IFB1YmxpYy5jbG9uZShpbnB1dFtpbmRleF0pO1xyXG5cclxuXHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpIHtcclxuXHJcblx0XHRcdG91dHB1dCA9IHt9O1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleCBpbiBpbnB1dClcclxuXHJcblx0XHRcdFx0b3V0cHV0W2luZGV4XSA9IFB1YmxpYy5jbG9uZShpbnB1dFtpbmRleF0pO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3V0cHV0O1xyXG5cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBNZXJnZSB0d28gb2JqZWN0cyByZWN1cnNpdmVseVxyXG5cdCAqIEBwYXJhbSBtaXhlZCBpbnB1dFxyXG5cdCAqIEBwYXJhbSBtaXhlZCBleHRlbmRcclxuXHQgKiBAcmV0dXJuIG1peGVkXHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIG1lcmdlX3JlY3Vyc2l2ZShiYXNlLCBleHRlbmQpIHtcclxuXHJcblx0XHRpZiAodHlwZU9mKGJhc2UpICE9PSAnb2JqZWN0JylcclxuXHJcblx0XHRcdHJldHVybiBleHRlbmQ7XHJcblxyXG5cdFx0Zm9yICh2YXIga2V5IGluIGV4dGVuZCkge1xyXG5cclxuXHRcdFx0aWYgKHR5cGVPZihiYXNlW2tleV0pID09PSAnb2JqZWN0JyAmJiB0eXBlT2YoZXh0ZW5kW2tleV0pID09PSAnb2JqZWN0Jykge1xyXG5cclxuXHRcdFx0XHRiYXNlW2tleV0gPSBtZXJnZV9yZWN1cnNpdmUoYmFzZVtrZXldLCBleHRlbmRba2V5XSk7XHJcblxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHRiYXNlW2tleV0gPSBleHRlbmRba2V5XTtcclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGJhc2U7XHJcblxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWVyZ2UgdHdvIG9yIG1vcmUgb2JqZWN0c1xyXG5cdCAqIEBwYXJhbSBib29sIGNsb25lXHJcblx0ICogQHBhcmFtIGJvb2wgcmVjdXJzaXZlXHJcblx0ICogQHBhcmFtIGFycmF5IGFyZ3ZcclxuXHQgKiBAcmV0dXJuIG9iamVjdFxyXG5cdCAqL1xyXG5cclxuXHRmdW5jdGlvbiBtZXJnZShjbG9uZSwgcmVjdXJzaXZlLCBhcmd2KSB7XHJcblxyXG5cdFx0dmFyIHJlc3VsdCA9IGFyZ3ZbMF0sXHJcblx0XHRcdHNpemUgPSBhcmd2Lmxlbmd0aDtcclxuXHJcblx0XHRpZiAoY2xvbmUgfHwgdHlwZU9mKHJlc3VsdCkgIT09ICdvYmplY3QnKVxyXG5cclxuXHRcdFx0cmVzdWx0ID0ge307XHJcblxyXG5cdFx0Zm9yICh2YXIgaW5kZXg9MDtpbmRleDxzaXplOysraW5kZXgpIHtcclxuXHJcblx0XHRcdHZhciBpdGVtID0gYXJndltpbmRleF0sXHJcblxyXG5cdFx0XHRcdHR5cGUgPSB0eXBlT2YoaXRlbSk7XHJcblxyXG5cdFx0XHRpZiAodHlwZSAhPT0gJ29iamVjdCcpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Zm9yICh2YXIga2V5IGluIGl0ZW0pIHtcclxuXHJcblx0XHRcdFx0dmFyIHNpdGVtID0gY2xvbmUgPyBQdWJsaWMuY2xvbmUoaXRlbVtrZXldKSA6IGl0ZW1ba2V5XTtcclxuXHJcblx0XHRcdFx0aWYgKHJlY3Vyc2l2ZSkge1xyXG5cclxuXHRcdFx0XHRcdHJlc3VsdFtrZXldID0gbWVyZ2VfcmVjdXJzaXZlKHJlc3VsdFtrZXldLCBzaXRlbSk7XHJcblxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRcdFx0cmVzdWx0W2tleV0gPSBzaXRlbTtcclxuXHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0fVxyXG5cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0eXBlIG9mIHZhcmlhYmxlXHJcblx0ICogQHBhcmFtIG1peGVkIGlucHV0XHJcblx0ICogQHJldHVybiBzdHJpbmdcclxuXHQgKlxyXG5cdCAqIEBzZWUgaHR0cDovL2pzcGVyZi5jb20vdHlwZW9mdmFyXHJcblx0ICovXHJcblxyXG5cdGZ1bmN0aW9uIHR5cGVPZihpbnB1dCkge1xyXG5cclxuXHRcdHJldHVybiAoe30pLnRvU3RyaW5nLmNhbGwoaW5wdXQpLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHR9XHJcblxyXG5cdGlmIChpc05vZGUpIHtcclxuXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IFB1YmxpYztcclxuXHJcblx0fSBlbHNlIHtcclxuXHJcblx0XHR3aW5kb3dbcHVibGljTmFtZV0gPSBQdWJsaWM7XHJcblxyXG5cdH1cclxuXHJcbn0pKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKTsiLCJpbXBvcnQgX21lcmdlIGZyb20gJ21lcmdlJztcblxuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IG1lcmdlIG9iamVjdHNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0cyB0byBtZXJnZVxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgbWVyZ2VkIG9iamVjdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlKC4uLnBhcmFtcykgIHtcbiAgcmV0dXJuIF9tZXJnZS5yZWN1cnNpdmUodHJ1ZSwgLi4ucGFyYW1zKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBza2lwcGVkIHByb3BlcnRpZXNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIHRoZSBvYmplY3QgdG8gc2tpcCBwcm9wZXJ0aWVzIGZyb21cbiAqIEBwYXJhbSB7W1N0cmluZ119IGtleXMga2V5cyBvZiB0aGUgcHJvcGVydGllcyB0byBza2lwXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBvYmplY3Qgd2l0aCB0aGUgcHJvcGVydGllcyBza2lwcGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBza2lwKG9iaiwga2V5cykge1xuICBjb25zdCBza2lwcGVkID0ge307XG4gIE9iamVjdC5rZXlzKG9iaikuZm9yRWFjaCgob2JqS2V5KSA9PiB7XG4gICAgaWYgKGtleXMuaW5kZXhPZihvYmpLZXkpID09PSAtMSkge1xuICAgICAgc2tpcHBlZFtvYmpLZXldID0gb2JqW29iaktleV07XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHNraXBwZWQ7XG59XG4iLCJpbXBvcnQgeyBtZXJnZSB9IGZyb20gJy4vdXRpbHMnO1xuXG5cbmNvbnN0IERFRkFVTFRfSEVBREVSUyA9IHtcbiAgJ0FjY2VwdCcgICAgICA6ICdhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L3BsYWluLCAqLyonLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHF1b3RlLXByb3BzXG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbn07XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHID0ge1xuICB4c3JmQ29va2llTmFtZTogJ1hTUkYtVE9LRU4nLFxuICB4c3JmSGVhZGVyTmFtZTogJ1gtWFNSRi1UT0tFTidcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbmZpZyB7XG4gIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgdGhpcy5fZGVmYXVsdHMgPSBtZXJnZShERUZBVUxUX0NPTkZJRywgeyBoZWFkZXJzOiBERUZBVUxUX0hFQURFUlMgfSk7XG4gICAgdGhpcy5fY29uZmlnICAgPSB7fTtcblxuICAgIHRoaXMuc2V0KGNvbmZpZyk7XG4gIH1cblxuICBtZXJnZVdpdGhEZWZhdWx0cyguLi5jb25maWdQYXJhbXMpIHtcbiAgICBjb25zdCBjb25maWcgPSBtZXJnZSh0aGlzLl9kZWZhdWx0cywgdGhpcy5fY29uZmlnLCAuLi5jb25maWdQYXJhbXMpO1xuICAgIGlmIChcbiAgICAgIHR5cGVvZiBjb25maWcuYm9keSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIGNvbmZpZy5oZWFkZXJzICYmXG4gICAgICBjb25maWcuaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPT09ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICkge1xuICAgICAgY29uZmlnLmJvZHkgPSBKU09OLnN0cmluZ2lmeShjb25maWcuYm9keSk7XG4gICAgfVxuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBzZXQoY29uZmlnKSB7XG4gICAgdGhpcy5fY29uZmlnID0gbWVyZ2UodGhpcy5fY29uZmlnLCBjb25maWcpO1xuICB9XG5cbiAgZ2V0KCkge1xuICAgIHJldHVybiBtZXJnZSh0aGlzLl9kZWZhdWx0cywgdGhpcy5fY29uZmlnKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFVSTCBieSBjb21iaW5pbmcgdGhlIHNwZWNpZmllZCBVUkxzXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVUkwgVGhlIGJhc2UgVVJMXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIFVSTFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbWJpbmVkIFVSTFxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5lKGJhc2VVUkwsIHJlbGF0aXZlVVJMKSB7XG4gIHJldHVybiBgJHtiYXNlVVJMLnJlcGxhY2UoL1xcLyskLywgJycpfS8ke3JlbGF0aXZlVVJMLnJlcGxhY2UoL15cXC8rLywgJycpfWA7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgVVJMIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQWJzb2x1dGUodXJsKSB7XG4gIC8vIEEgVVJMIGlzIGNvbnNpZGVyZWQgYWJzb2x1dGUgaWYgaXQgYmVnaW5zIHdpdGggXCI8c2NoZW1lPjovL1wiIG9yIFwiLy9cIiAocHJvdG9jb2wtcmVsYXRpdmUgVVJMKS5cbiAgLy8gUkZDIDM5ODYgZGVmaW5lcyBzY2hlbWUgbmFtZSBhcyBhIHNlcXVlbmNlIG9mIGNoYXJhY3RlcnMgYmVnaW5uaW5nIHdpdGggYSBsZXR0ZXIgYW5kIGZvbGxvd2VkXG4gIC8vIGJ5IGFueSBjb21iaW5hdGlvbiBvZiBsZXR0ZXJzLCBkaWdpdHMsIHBsdXMsIHBlcmlvZCwgb3IgaHlwaGVuLlxuICByZXR1cm4gL14oW2Etel1bYS16XFxkXFwrXFwtXFwuXSo6KT9cXC9cXC8vaS50ZXN0KHVybCk7XG59XG5cbi8qKlxuICogRm9ybWF0IGFuIHVybCBjb21iaW5pbmcgcHJvdmlkZWQgdXJscyBvciByZXR1cm5pbmcgdGhlIHJlbGF0aXZlVVJMXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVcmwgVGhlIGJhc2UgdXJsXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIHVybFxuICogQHJldHVybnMge3N0cmluZ30gcmVsYXRpdmVVUkwgaWYgdGhlIHNwZWNpZmllZCByZWxhdGl2ZVVSTCBpcyBhYnNvbHV0ZSBvciBiYXNlVXJsIGlzIG5vdCBkZWZpbmVkLFxuICogICAgICAgICAgICAgICAgICAgb3RoZXJ3aXNlIGl0IHJldHVybnMgdGhlIGNvbWJpbmF0aW9uIG9mIGJvdGggdXJsc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0KGJhc2VVcmwsIHJlbGF0aXZlVVJMKSB7XG4gIGlmICghYmFzZVVybCB8fCBpc0Fic29sdXRlKHJlbGF0aXZlVVJMKSkge1xuICAgIHJldHVybiByZWxhdGl2ZVVSTDtcbiAgfVxuXG4gIHJldHVybiBjb21iaW5lKGJhc2VVcmwsIHJlbGF0aXZlVVJMKTtcbn1cbiIsIi8qKlxuICogV3JhcCBhIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIHJlc3BvbnNlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHJlYWRlciB0eXBlIG9mIHJlYWRlciB0byB1c2Ugb24gcmVzcG9uc2UgYm9keVxuICogQHJldHVybiB7UHJvbWlzZX0gcmVzb2x2ZXMgdG8gdGhlIHdyYXBwZWQgcmVhZCByZXNwb25zZVxuICovXG5mdW5jdGlvbiB3cmFwUmVzcG9uc2UocmVzcG9uc2UsIHJlYWRlcikge1xuICByZXR1cm4gcmVzcG9uc2VbcmVhZGVyXSgpXG4gIC50aGVuKGRhdGEgPT4gKHtcbiAgICBoZWFkZXJzICAgOiByZXNwb25zZS5oZWFkZXJzLFxuICAgIHN0YXR1cyAgICA6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICBzdGF0dXNUZXh0OiByZXNwb25zZS5zdGF0dXNUZXh0LFxuICAgIGRhdGFcbiAgfSkpO1xufVxuXG4vKipcbiAqIFJlYWRzIG9yIHJlamVjdHMgYSBmZXRjaCByZXNwb25zZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSByZXNwb25zZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSByZWFkZXIgdHlwZSBvZiByZWFkZXIgdG8gdXNlIG9uIHJlc3BvbnNlIGJvZHlcbiAqIEByZXR1cm4ge1Byb21pc2V9IHJlYWQgb3IgcmVqZWN0aW9uIHByb21pc2VcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlLCByZWFkZXIpIHtcbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIGNvbnN0IGVyciAgICAgICA9IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgICBlcnIuc3RhdHVzICAgICAgPSByZXNwb25zZS5zdGF0dXM7XG4gICAgZXJyLnN0YXR1c1RleHQgID0gcmVzcG9uc2Uuc3RhdHVzVGV4dDtcbiAgICBlcnIuaGVhZGVycyAgICAgPSByZXNwb25zZS5oZWFkZXJzO1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICB9XG4gIGlmIChyZWFkZXIpIHtcbiAgICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCByZWFkZXIpO1xuICB9XG5cbiAgY29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJyk7XG4gIGlmIChjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmNsdWRlcygnYXBwbGljYXRpb24vanNvbicpKSB7XG4gICAgcmV0dXJuIHdyYXBSZXNwb25zZShyZXNwb25zZSwgJ2pzb24nKTtcbiAgfVxuICByZXR1cm4gd3JhcFJlc3BvbnNlKHJlc3BvbnNlLCAndGV4dCcpO1xufVxuIiwiaW1wb3J0ICd3aGF0d2ctZmV0Y2gnO1xuaW1wb3J0IHF1ZXJ5IGZyb20gJ3RyYWUtcXVlcnknO1xuXG5pbXBvcnQgTWlkZGxld2FyZSAgICAgIGZyb20gJy4vbWlkZGxld2FyZSc7XG5pbXBvcnQgQ29uZmlnICAgICAgICAgIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IHNraXAgfSAgICAgICAgZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBmb3JtYXQgfSAgICAgIGZyb20gJy4vaGVscGVycy91cmwtaGFuZGxlcic7XG5pbXBvcnQgcmVzcG9uc2VIYW5kbGVyIGZyb20gJy4vaGVscGVycy9yZXNwb25zZS1oYW5kbGVyJztcblxuXG5jbGFzcyBUcmFlIHtcbiAgY29uc3RydWN0b3IoY29uZmlnID0ge30pIHtcbiAgICB0aGlzLl9taWRkbGV3YXJlID0gbmV3IE1pZGRsZXdhcmUoKTtcbiAgICB0aGlzLl9jb25maWcgICAgID0gbmV3IENvbmZpZyhza2lwKGNvbmZpZywgWydiYXNlVXJsJ10pKTtcblxuICAgIHRoaXMuYmFzZVVybChjb25maWcuYmFzZVVybCB8fCAnJyk7XG4gICAgdGhpcy5faW5pdE1ldGhvZHNXaXRoQm9keSgpO1xuICAgIHRoaXMuX2luaXRNZXRob2RzV2l0aE5vQm9keSgpO1xuICAgIHRoaXMuX2luaXRNaWRkbGV3YXJlTWV0aG9kcygpO1xuICB9XG5cbiAgY3JlYXRlKGNvbmZpZykge1xuICAgIHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3Rvcihjb25maWcpO1xuICB9XG5cbiAgZGVmYXVsdHMoY29uZmlnKSB7XG4gICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBjb25zdCBkZWZhdWx0cyA9IHRoaXMuX2NvbmZpZy5nZXQoKTtcbiAgICAgIHRoaXMuYmFzZVVybCgpICYmIChkZWZhdWx0cy5iYXNlVXJsID0gdGhpcy5iYXNlVXJsKCkpO1xuICAgICAgcmV0dXJuIGRlZmF1bHRzO1xuICAgIH1cbiAgICB0aGlzLl9jb25maWcuc2V0KHNraXAoY29uZmlnLCBbJ2Jhc2VVcmwnXSkpO1xuICAgIGNvbmZpZy5iYXNlVXJsICYmIHRoaXMuYmFzZVVybChjb25maWcuYmFzZVVybCk7XG4gICAgcmV0dXJuIHRoaXMuX2NvbmZpZy5nZXQoKTtcbiAgfVxuXG4gIGJhc2VVcmwoYmFzZVVybCkge1xuICAgIGlmICh0eXBlb2YgYmFzZVVybCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLl9iYXNlVXJsO1xuICAgIH1cbiAgICB0aGlzLl9iYXNlVXJsID0gYmFzZVVybDtcbiAgICByZXR1cm4gdGhpcy5fYmFzZVVybDtcbiAgfVxuXG4gIHJlcXVlc3QoY29uZmlnID0ge30pIHtcbiAgICBjb25maWcubWV0aG9kIHx8IChjb25maWcubWV0aG9kID0gJ2dldCcpO1xuICAgIGNvbnN0IG1lcmdlZENvbmZpZyA9IHRoaXMuX2NvbmZpZy5tZXJnZVdpdGhEZWZhdWx0cyhjb25maWcpO1xuICAgIGNvbnN0IHVybCAgICAgICAgICA9IHF1ZXJ5LmJ1aWxkUXVlcnkoZm9ybWF0KHRoaXMuX2Jhc2VVcmwsIGNvbmZpZy51cmwpLCBjb25maWcucGFyYW1zKTtcblxuICAgIHJldHVybiB0aGlzLl9mZXRjaCh1cmwsIG1lcmdlZENvbmZpZyk7XG4gIH1cblxuICBfZmV0Y2godXJsLCBjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlQmVmb3JlKGNvbmZpZylcbiAgICAudGhlbihjb25maWcgPT4gZmV0Y2godXJsLCBjb25maWcpKVxuICAgIC50aGVuKHJlcyA9PiByZXNwb25zZUhhbmRsZXIocmVzLCBjb25maWcuYm9keVR5cGUpKVxuICAgIC50aGVuKFxuICAgICAgcmVzID0+IHRoaXMuX21pZGRsZXdhcmUucmVzb2x2ZUFmdGVyKHVuZGVmaW5lZCwgcmVzKSxcbiAgICAgIGVyciA9PiB0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVBZnRlcihlcnIpXG4gICAgKVxuICAgIC50aGVuKFxuICAgICAgcmVzID0+IFByb21pc2UucmVzb2x2ZSh0aGlzLl9taWRkbGV3YXJlLnJlc29sdmVGaW5hbGx5KCkpLnRoZW4oKCkgPT4gcmVzKSxcbiAgICAgIGVyciA9PiBQcm9taXNlLnJlc29sdmUodGhpcy5fbWlkZGxld2FyZS5yZXNvbHZlRmluYWxseSgpKS50aGVuKCgpID0+IHsgdGhyb3cgZXJyOyB9KVxuICAgICk7XG4gIH1cblxuICBfaW5pdE1ldGhvZHNXaXRoTm9Cb2R5KCkge1xuICAgIFsnZ2V0JywgJ2RlbGV0ZScsICdoZWFkJ10uZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgICB0aGlzW21ldGhvZF0gPSAocGF0aCwgY29uZmlnID0ge30pID0+IHtcbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlV2l0aERlZmF1bHRzKGNvbmZpZywgeyBtZXRob2QgfSk7XG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgICA9IHF1ZXJ5LmJ1aWxkUXVlcnkoZm9ybWF0KHRoaXMuX2Jhc2VVcmwsIHBhdGgpLCBjb25maWcucGFyYW1zKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIF9pbml0TWV0aG9kc1dpdGhCb2R5KCkge1xuICAgIFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXS5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIHRoaXNbbWV0aG9kXSA9IChwYXRoLCBib2R5LCBjb25maWcpID0+IHtcbiAgICAgICAgY29uc3QgbWVyZ2VkQ29uZmlnID0gdGhpcy5fY29uZmlnLm1lcmdlV2l0aERlZmF1bHRzKGNvbmZpZywgeyBib2R5LCBtZXRob2QgfSk7XG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgICA9IGZvcm1hdCh0aGlzLl9iYXNlVXJsLCBwYXRoKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fZmV0Y2godXJsLCBtZXJnZWRDb25maWcpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIF9pbml0TWlkZGxld2FyZU1ldGhvZHMoKSB7XG4gICAgWydiZWZvcmUnLCAnYWZ0ZXInLCAnZmluYWxseSddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgdGhpc1ttZXRob2RdID0gKC4uLmFyZ3MpID0+IHRoaXMuX21pZGRsZXdhcmVbbWV0aG9kXSguLi5hcmdzKTtcbiAgICB9KTtcbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBUcmFlKCk7XG4iXSwibmFtZXMiOlsic2VsZiIsImZldGNoIiwic3VwcG9ydCIsIlN5bWJvbCIsIkJsb2IiLCJlIiwibm9ybWFsaXplTmFtZSIsIm5hbWUiLCJTdHJpbmciLCJ0ZXN0IiwiVHlwZUVycm9yIiwidG9Mb3dlckNhc2UiLCJub3JtYWxpemVWYWx1ZSIsInZhbHVlIiwiaXRlcmF0b3JGb3IiLCJpdGVtcyIsIml0ZXJhdG9yIiwic2hpZnQiLCJkb25lIiwidW5kZWZpbmVkIiwiaXRlcmFibGUiLCJIZWFkZXJzIiwiaGVhZGVycyIsIm1hcCIsImZvckVhY2giLCJhcHBlbmQiLCJnZXRPd25Qcm9wZXJ0eU5hbWVzIiwicHJvdG90eXBlIiwibGlzdCIsInB1c2giLCJnZXQiLCJ2YWx1ZXMiLCJnZXRBbGwiLCJoYXMiLCJoYXNPd25Qcm9wZXJ0eSIsInNldCIsImNhbGxiYWNrIiwidGhpc0FyZyIsImNhbGwiLCJrZXlzIiwiZW50cmllcyIsImNvbnN1bWVkIiwiYm9keSIsImJvZHlVc2VkIiwiUHJvbWlzZSIsInJlamVjdCIsImZpbGVSZWFkZXJSZWFkeSIsInJlYWRlciIsInJlc29sdmUiLCJvbmxvYWQiLCJyZXN1bHQiLCJvbmVycm9yIiwiZXJyb3IiLCJyZWFkQmxvYkFzQXJyYXlCdWZmZXIiLCJibG9iIiwiRmlsZVJlYWRlciIsInJlYWRBc0FycmF5QnVmZmVyIiwicmVhZEJsb2JBc1RleHQiLCJyZWFkQXNUZXh0IiwiQm9keSIsIl9pbml0Qm9keSIsIl9ib2R5SW5pdCIsIl9ib2R5VGV4dCIsImlzUHJvdG90eXBlT2YiLCJfYm9keUJsb2IiLCJmb3JtRGF0YSIsIkZvcm1EYXRhIiwiX2JvZHlGb3JtRGF0YSIsInNlYXJjaFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInRvU3RyaW5nIiwiYXJyYXlCdWZmZXIiLCJBcnJheUJ1ZmZlciIsIkVycm9yIiwidHlwZSIsInJlamVjdGVkIiwidGhlbiIsInRleHQiLCJkZWNvZGUiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwibWV0aG9kcyIsIm5vcm1hbGl6ZU1ldGhvZCIsIm1ldGhvZCIsInVwY2FzZWQiLCJ0b1VwcGVyQ2FzZSIsImluZGV4T2YiLCJSZXF1ZXN0IiwiaW5wdXQiLCJvcHRpb25zIiwidXJsIiwiY3JlZGVudGlhbHMiLCJtb2RlIiwicmVmZXJyZXIiLCJjbG9uZSIsImZvcm0iLCJ0cmltIiwic3BsaXQiLCJieXRlcyIsInJlcGxhY2UiLCJqb2luIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwieGhyIiwiaGVhZCIsInBhaXJzIiwiZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIiwiaGVhZGVyIiwia2V5IiwiUmVzcG9uc2UiLCJib2R5SW5pdCIsInN0YXR1cyIsIm9rIiwic3RhdHVzVGV4dCIsInJlc3BvbnNlIiwicmVkaXJlY3RTdGF0dXNlcyIsInJlZGlyZWN0IiwiUmFuZ2VFcnJvciIsImxvY2F0aW9uIiwiaW5pdCIsInJlcXVlc3QiLCJYTUxIdHRwUmVxdWVzdCIsInJlc3BvbnNlVVJMIiwiZ2V0UmVzcG9uc2VIZWFkZXIiLCJyZXNwb25zZVRleHQiLCJvbnRpbWVvdXQiLCJvcGVuIiwid2l0aENyZWRlbnRpYWxzIiwicmVzcG9uc2VUeXBlIiwic2V0UmVxdWVzdEhlYWRlciIsInNlbmQiLCJwb2x5ZmlsbCIsInRoaXMiLCJidWlsZFF1ZXJ5IiwicGFyYW1zIiwiT2JqZWN0IiwibGVuZ3RoIiwiZW5jb2RlVVJJIiwicmVkdWNlIiwiYWNjIiwicGFyc2VRdWVyeSIsImluY2x1ZGVzIiwiZGVjb2RlVVJJIiwicXVlcnkiLCJwYWlyIiwicGFyc2VWYWx1ZSIsIm51bWJlciIsInBhcnNlRmxvYXQiLCJOdW1iZXIiLCJpc05hTiIsImJ1aWxkIiwicmVxdWlyZSQkMSIsInJlcXVpcmUkJDAiLCJpZGVudGl0eSIsInJlamVjdGlvbiIsImVyciIsIk1pZGRsZXdhcmUiLCJfYmVmb3JlIiwiX2FmdGVyIiwiX2ZpbmFsbHkiLCJmbiIsImZ1bGZpbGwiLCJjb25maWciLCJwcm9taXNlIiwidGFzayIsImlzTm9kZSIsIlB1YmxpYyIsIm1lcmdlIiwiYXJndW1lbnRzIiwicHVibGljTmFtZSIsInJlY3Vyc2l2ZSIsIm91dHB1dCIsInR5cGVPZiIsImluZGV4Iiwic2l6ZSIsIm1lcmdlX3JlY3Vyc2l2ZSIsImJhc2UiLCJleHRlbmQiLCJhcmd2IiwiaXRlbSIsInNpdGVtIiwic2xpY2UiLCJtb2R1bGUiLCJiYWJlbEhlbHBlcnMudHlwZW9mIiwiZXhwb3J0cyIsIl9tZXJnZSIsInNraXAiLCJvYmoiLCJza2lwcGVkIiwib2JqS2V5IiwiREVGQVVMVF9IRUFERVJTIiwiREVGQVVMVF9DT05GSUciLCJDb25maWciLCJfZGVmYXVsdHMiLCJfY29uZmlnIiwiY29uZmlnUGFyYW1zIiwic3RyaW5naWZ5IiwiY29tYmluZSIsImJhc2VVUkwiLCJyZWxhdGl2ZVVSTCIsImlzQWJzb2x1dGUiLCJmb3JtYXQiLCJiYXNlVXJsIiwid3JhcFJlc3BvbnNlIiwicmVzcG9uc2VIYW5kbGVyIiwiY29udGVudFR5cGUiLCJUcmFlIiwiX21pZGRsZXdhcmUiLCJfaW5pdE1ldGhvZHNXaXRoQm9keSIsIl9pbml0TWV0aG9kc1dpdGhOb0JvZHkiLCJfaW5pdE1pZGRsZXdhcmVNZXRob2RzIiwiY29uc3RydWN0b3IiLCJkZWZhdWx0cyIsIl9iYXNlVXJsIiwibWVyZ2VkQ29uZmlnIiwibWVyZ2VXaXRoRGVmYXVsdHMiLCJfZmV0Y2giLCJyZXNvbHZlQmVmb3JlIiwicmVzIiwiYm9keVR5cGUiLCJyZXNvbHZlQWZ0ZXIiLCJyZXNvbHZlRmluYWxseSIsInBhdGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLENBQUMsVUFBU0EsSUFBVCxFQUFlOzs7TUFHVkEsS0FBS0MsS0FBVCxFQUFnQjs7OztNQUlaQyxVQUFVO2tCQUNFLHFCQUFxQkYsSUFEdkI7Y0FFRixZQUFZQSxJQUFaLElBQW9CLGNBQWNHLE1BRmhDO1VBR04sZ0JBQWdCSCxJQUFoQixJQUF3QixVQUFVQSxJQUFsQyxJQUEyQyxZQUFXO1VBQ3REO1lBQ0VJLElBQUo7ZUFDTyxJQUFQO09BRkYsQ0FHRSxPQUFNQyxDQUFOLEVBQVM7ZUFDRixLQUFQOztLQUw0QyxFQUhwQztjQVdGLGNBQWNMLElBWFo7aUJBWUMsaUJBQWlCQTtHQVpoQzs7V0FlU00sYUFBVCxDQUF1QkMsSUFBdkIsRUFBNkI7UUFDdkIsT0FBT0EsSUFBUCxLQUFnQixRQUFwQixFQUE4QjthQUNyQkMsT0FBT0QsSUFBUCxDQUFQOztRQUVFLDZCQUE2QkUsSUFBN0IsQ0FBa0NGLElBQWxDLENBQUosRUFBNkM7WUFDckMsSUFBSUcsU0FBSixDQUFjLHdDQUFkLENBQU47O1dBRUtILEtBQUtJLFdBQUwsRUFBUDs7O1dBR09DLGNBQVQsQ0FBd0JDLEtBQXhCLEVBQStCO1FBQ3pCLE9BQU9BLEtBQVAsS0FBaUIsUUFBckIsRUFBK0I7Y0FDckJMLE9BQU9LLEtBQVAsQ0FBUjs7V0FFS0EsS0FBUDs7OztXQUlPQyxXQUFULENBQXFCQyxLQUFyQixFQUE0QjtRQUN0QkMsV0FBVztZQUNQLGdCQUFXO1lBQ1hILFFBQVFFLE1BQU1FLEtBQU4sRUFBWjtlQUNPLEVBQUNDLE1BQU1MLFVBQVVNLFNBQWpCLEVBQTRCTixPQUFP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
