(function() {
  var KB, MB, getDiskInfo, mountInfos, spawn;

  spawn = require('child_process').spawn;

  KB = 1024;

  MB = 1024 * KB;


  /**
   * [getDiskInfo 获取disk信息，返回单位mb]
   * @param  {[type]} cbf [description]
   * @return {[type]}     [description]
   */

  getDiskInfo = function(cbf) {
    var blockSize, df, getInfo;
    df = spawn('df');
    blockSize = 1024 / MB;
    getInfo = function(info) {
      var avail, used, values;
      values = info.trim().split(/\s+/g);
      used = GLOBAL.parseFloat(values[2]);
      if (!GLOBAL.isNaN(used)) {
        avail = GLOBAL.parseFloat(values[3]);
        return {
          size: Math.floor((used + avail) * blockSize),
          avail: Math.floor(avail * blockSize),
          percent: 100 - GLOBAL.parseInt(values[4]),
          mount: values.pop()
        };
      }
    };
    return df.stdout.on('data', function(msg) {
      var firstLine, info, infos, result, tmpInfo, _i, _len;
      infos = msg.toString().split('\n');
      firstLine = infos.shift();
      if (~firstLine.indexOf('512-blocks')) {
        blockSize = 512 / MB;
      }
      result = [];
      for (_i = 0, _len = infos.length; _i < _len; _i++) {
        info = infos[_i];
        tmpInfo = getInfo(info);
        if (tmpInfo) {
          result.push(tmpInfo);
        }
      }
      return cbf(null, result);
    });
  };


  /**
   * [logDiskInfos 记录disk相关信息(直接使用df命令的返回数值，不考虑单位)]
   * @return {[type]} [description]
   */

  mountInfos = {};

  exports.log = function(client, diskFilter) {
    return getDiskInfo(function(err, infos) {
      var avail, changeSize, info, mount, now, prevMountInfo, usedTime, _i, _len;
      if (err) {
        return;
      }
      for (_i = 0, _len = infos.length; _i < _len; _i++) {
        info = infos[_i];
        mount = info.mount;
        avail = info.avail;
        if (diskFilter && false === diskFilter(mount)) {
          return;
        }
        prevMountInfo = mountInfos[mount];
        now = Math.floor(Date.now() / 1000);
        if (prevMountInfo) {
          changeSize = prevMountInfo.avail - avail;
          usedTime = now - prevMountInfo.updatedAt;
          client.gauge("disk.writeSpeed." + mount, Math.floor(changeSize / usedTime));
        }
        mountInfos[mount] = {
          avail: avail,
          updatedAt: now
        };
        client.gauge("disk.avail." + mount, avail);
      }
    });
  };

}).call(this);
