(function() {
  var filterSetting, statsClient, timerId;

  statsClient = null;

  filterSetting = {};


  /**
   * [setLogClient 设置记录log的client]
   * @param {[type]} client [description]
   */

  module.exports.setLogClient = function(client) {
    statsClient = client;
  };

  timerId = null;


  /**
   * [start 开始监控]
   * @param  {[type]} interval 取样时间间隔
   * @param  {[type]} options 配置是否不需要监控某指标，如不希望监控CPU使用率{cpu : false}
   * @return {[type]}          [description]
   */

  module.exports.start = function(interval, options) {
    var cpu, disk, io, memory, monitorHandler, network;
    if (options == null) {
      options = {};
    }
    memory = require('./lib/memory');
    cpu = require('./lib/cpu');
    network = require('./lib/network');
    disk = require('./lib/disk');
    io = require('./lib/io');
    monitorHandler = function() {
      if (statsClient) {
        if (options.cpu !== false) {
          cpu.log(statsClient, filterSetting.cpu);
        }
        if (options.memory !== false) {
          memory.log(statsClient);
        }
        if (options.netWork !== false) {
          network.log(statsClient, filterSetting.network);
        }
        if (options.disk !== false) {
          disk.log(statsClient, filterSetting.disk);
        }
        if (options.io !== false) {
          io.log(statsClient, filterSetting.io, interval);
          options.io = false;
        }
      }
    };
    if (timerId) {
      GLOBAL.clearInterval(timerId);
    }
    monitorHandler();
    timerId = GLOBAL.setInterval(function() {
      return monitorHandler();
    }, interval);
  };


  /**
   * [filter 设置filter]
   * @param  {[type]} type   [description]
   * @param  {[type]} filter [description]
   * @return {[type]}        [description]
   */

  module.exports.filter = function(type, filter) {
    filterSetting[type] = filter;
  };

}).call(this);
