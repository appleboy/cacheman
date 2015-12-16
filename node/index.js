'use strict';

/**
 * Module dependencies.
 */

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _error = require('./error');

var _error2 = _interopRequireDefault(_error);

var _ms = require('ms');

var _ms2 = _interopRequireDefault(_ms);

/**
 * Module constants.
 */

var noop = function noop() {};
var engines = ['memory', 'redis', 'mongo', 'file'];

/**
 * Cacheman constructor.
 *
 * @param {String} name
 * @param {Object} options
 * @api public
 */

var Cacheman = (function () {

  /**
   * Class constructor method.
   *
   * @param {String} name
   * @param {Object} [options]
   * @return {Cacheman} this
   * @api public
   */

  function Cacheman(name) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, Cacheman);

    if (name && 'object' === typeof name) {
      options = name;
      name = null;
    }

    this.options = options;
    this.options.count = 1000;
    this.options.prefix = this.options.prefix || 'cache';
    this.options.delimiter = this.options.delimiter || ':';
    this._name = name || '';
    this._fns = [];
    this._ttl = this.options.ttl || 60;
    this.engine(this.options.engine || 'memory');
    this._prefix = this.options.delimiter + this._name + this.options.delimiter;
  }

  /**
   * Set get engine.
   *
   * @param {String} engine
   * @param {Object} options
   * @return {Cacheman} this
   * @api public
   */

  _createClass(Cacheman, [{
    key: 'engine',
    value: function engine(_engine, options) {

      if (!arguments.length) return this._engine;

      var type = typeof _engine;

      if (!/string|function|object/.test(type)) {
        throw new _error2['default']('Invalid engine format, engine must be a String, Function or a valid engine instance');
      }

      if ('string' === type) {

        var Engine = undefined;

        if (~Cacheman.engines.indexOf(_engine)) {
          _engine = 'cacheman-' + _engine;
        }

        try {
          Engine = require(_engine);
        } catch (e) {
          if (e.code === 'MODULE_NOT_FOUND') {
            throw new _error2['default']('Missing required npm module ' + _engine);
          } else {
            throw e;
          }
        }

        this._engine = new Engine(options || this.options, this);
      } else if ('object' === type) {
        var fns = ['get', 'set', 'del', 'clear'];
        for (var i = 0; i < fns.length; ++i) {
          if ('function' !== typeof _engine[fns[i]]) {
            throw new _error2['default']('Invalid engine format, must be a valid engine instance');
          }
        }

        this._engine = _engine;
      } else {
        this._engine = _engine(options || this.options, this);
      }

      return this;
    }

    /**
     * Wrap key with prefix.
     *
     * @param {String} key
     * @return {String}
     * @api private
     */

  }, {
    key: 'key',
    value: function key(_key) {
      return this._prefix + _key;
    }

    /**
     * Sets up namespace middleware.
     *
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'use',
    value: function use(fn) {
      this._fns.push(fn);
      return this;
    }

    /**
     * Executes the cache middleware.
     *
     * @param {String} key
     * @param {Mixed} data
     * @param {Number} ttl
     * @param {Function} fn
     * @api private
     */

  }, {
    key: 'run',
    value: function run(key, data, ttl, fn) {
      var fns = this._fns.slice(0);
      if (!fns.length) return fn(null);

      function go(i) {
        fns[i](key, data, ttl, function (err, _data, _ttl, _force) {
          // upon error, short-circuit
          if (err) return fn(err);

          // if no middleware left, summon callback
          if (!fns[i + 1]) return fn(null, _data, _ttl, _force);

          // go on to next
          go(i + 1);
        });
      }

      go(0);
    }

    /**
     * Set an entry.
     *
     * @param {String} key
     * @param {Mixed} data
     * @param {Number} ttl
     * @param {Function} fn
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'cache',
    value: function cache(key, data, ttl) {
      var _this = this;

      var fn = arguments.length <= 3 || arguments[3] === undefined ? noop : arguments[3];

      if ('function' === typeof ttl) {
        fn = ttl;
        ttl = null;
      }

      this.get(key, function (err, res) {

        _this.run(key, res, ttl, function (_err, _data, _ttl, _force) {

          if (err || _err) return fn(err || _err);

          var force = false;

          if ('undefined' !== typeof _data) {
            force = true;
            data = _data;
          }

          if ('undefined' !== typeof _ttl) {
            force = true;
            ttl = _ttl;
          }

          if ('undefined' === typeof res || force) {
            return _this.set(key, data, ttl, fn);
          }

          fn(null, res);
        });
      });

      return this;
    }

    /**
     * Get an entry.
     *
     * @param {String} key
     * @param {Function} fn
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'get',
    value: function get(key) {
      var fn = arguments.length <= 1 || arguments[1] === undefined ? noop : arguments[1];

      this._engine.get(this.key(key), fn);
      return this;
    }

    /**
     * Set an entry.
     *
     * @param {String} key
     * @param {Mixed} data
     * @param {Number} ttl
     * @param {Function} fn
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'set',
    value: function set(key, data, ttl) {
      var fn = arguments.length <= 3 || arguments[3] === undefined ? noop : arguments[3];

      if ('function' === typeof ttl) {
        fn = ttl;
        ttl = null;
      }

      if (ttl) {
        if ('string' === typeof ttl) {
          ttl = Math.round((0, _ms2['default'])(ttl) / 1000);
        }
      }

      if ('string' !== typeof key) {
        return process.nextTick(function () {
          fn(new _error2['default']('Invalid key, key must be a string.'));
        });
      }

      if ('undefined' === typeof data) {
        return process.nextTick(fn);
      }

      this._engine.set(this.key(key), data, ttl || this._ttl, fn);

      return this;
    }

    /**
     * Delete an entry.
     *
     * @param {String} key
     * @param {Function} fn
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'del',
    value: function del(key) {
      var fn = arguments.length <= 1 || arguments[1] === undefined ? noop : arguments[1];

      if ('function' === typeof key) {
        fn = key;
        key = '';
      }

      this._engine.del(this.key(key), fn);
      return this;
    }

    /**
     * Clear all entries.
     *
     * @param {String} key
     * @param {Function} fn
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'clear',
    value: function clear() {
      var fn = arguments.length <= 0 || arguments[0] === undefined ? noop : arguments[0];

      this._engine.clear(fn);
      return this;
    }

    /**
     * Wraps a function in cache. I.e., the first time the function is run,
     * its results are stored in cache so subsequent calls retrieve from cache
     * instead of calling the function.
     *
     * @param {String} key
     * @param {Function} work
     * @param {Number} ttl
     * @param {Function} fn
     * @api public
     */

  }, {
    key: 'wrap',
    value: function wrap(key, work, ttl) {
      var _this2 = this;

      var fn = arguments.length <= 3 || arguments[3] === undefined ? noop : arguments[3];

      if ('function' === typeof ttl) {
        fn = ttl;
        ttl = null;
      }

      this.get(key, function (err, res) {
        if (err || res) return fn(err, res);

        work(function (err, data) {
          if (err) return fn(err);
          _this2.set(key, data, ttl, function (err) {
            fn(err, data);
          });
        });
      });

      return this;
    }
  }]);

  return Cacheman;
})();

exports['default'] = Cacheman;

Cacheman.engines = engines;
module.exports = exports['default'];
