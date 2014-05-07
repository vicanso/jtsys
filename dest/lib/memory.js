(function() {
  var KB, MB, fs, getSwapUsage, os;

  fs = require('fs');

  os = require('os');

  KB = 1024;

  MB = 1024 * KB;


  /**
   * [getSwapUsage 获取swap的使用情况，单位MB(只用于linux)]
   * @param  {[type]} cbf [description]
   * @return {[type]}     [description]
   */

  getSwapUsage = function(cbf) {
    var getUse;
    getUse = function(data) {
      var info, infos, swapFree, swapFreeStr, swapTotal, swapTotalStr, _i, _len;
      infos = data.split('\n');
      swapTotalStr = 'SwapTotal:';
      swapFreeStr = 'SwapFree:';
      swapTotal = -1;
      swapFree = -1;
      for (_i = 0, _len = infos.length; _i < _len; _i++) {
        info = infos[_i];
        if (info.indexOf(swapTotalStr) === 0) {
          swapTotal = GLOBAL.parseInt(info.substring(swapTotalStr.length));
        } else if (info.indexOf(swapFreeStr) === 0) {
          swapFree = GLOBAL.parseInt(info.substring(swapTotalStr.length));
        }
      }
      if (~swapTotal && ~swapFree) {
        return Math.floor((swapTotal - swapFree) / 1024);
      } else {
        return -1;
      }
    };
    return fs.readFile('/proc/meminfo', 'utf8', function(err, data) {
      if (err) {
        cbf(err);
        return;
      }
      return cbf(null, getUse(data.trim()));
    });
  };

  exports.log = function(client) {
    var freeMemory, userMemory;
    freeMemory = os.freemem();
    userMemory = os.totalmem() - freeMemory;
    client.gauge('memory.free', Math.floor(freeMemory / MB));
    client.gauge('memory.use', Math.floor(userMemory / MB));
    return getSwapUsage(function(err, swapUse) {
      if (err) {
        return;
      }
      if (~swapUse) {
        return client.gauge('memory.swapUse', swapUse);
      }
    });
  };

}).call(this);
