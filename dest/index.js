(function() {
  var KB, MB, NETWORK_INTERFACE_INFOS, PREV_CPUS, filterSetting, fs, getDiskInfo, getNetworkInfos, getSwapUsage, logCpus, logDiskInfos, logMemory, logNetworkInterfaceInfos, os, path, platform, program, spawn, statsClient, timerId;

  os = require('os');

  fs = require('fs');

  program = require('commander');

  KB = 1024;

  MB = 1024 * KB;

  path = require('path');

  platform = process.platform;

  statsClient = null;

  spawn = require('child_process').spawn;

  filterSetting = {};


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

  NETWORK_INTERFACE_INFOS = {};


  /**
   * [getNetworkInfos 获取网络信息（只用于linux）]
   * @param  {[type]} cbf [description]
   * @return {[type]}     [description]
   */

  getNetworkInfos = function(cbf) {
    var getNetworkInfo, getNetworks;
    getNetworkInfo = function(info) {
      var base, currentTime, getSpeed, interfaceInfo, name, prevInterfaceInfo, values;
      currentTime = Math.floor(Date.now() / 1000);
      values = info.trim().split(/\s+/g);
      name = values[0];
      name = name.substring(0, name.length - 1);
      interfaceInfo = {
        seconds: currentTime,
        receiveBytes: GLOBAL.parseInt(values[1]),
        receivePackets: GLOBAL.parseInt(values[2]),
        receiveErrs: GLOBAL.parseInt(values[3]),
        receiveDrop: GLOBAL.parseInt(values[4]),
        transmitBytes: GLOBAL.parseInt(values[9]),
        transmitPackets: GLOBAL.parseInt(values[10]),
        transmitErrs: GLOBAL.parseInt(values[11]),
        transmitDrop: GLOBAL.parseInt(values[12])
      };
      prevInterfaceInfo = NETWORK_INTERFACE_INFOS[name];
      NETWORK_INTERFACE_INFOS[name] = interfaceInfo;
      if (prevInterfaceInfo) {
        base = (currentTime - prevInterfaceInfo.seconds) * KB;
        getSpeed = function(value) {
          return Math.floor(value / (base || 1));
        };
        return {
          name: name,
          receiveSpeed: getSpeed(interfaceInfo.receiveBytes - prevInterfaceInfo.receiveBytes),
          receiveErrs: interfaceInfo.receiveErrs - prevInterfaceInfo.receiveErrs,
          receiveDrop: interfaceInfo.receiveDrop - prevInterfaceInfo.receiveDrop,
          transmitSpeed: getSpeed(interfaceInfo.transmitBytes - prevInterfaceInfo.transmitBytes),
          transmitErrs: interfaceInfo.transmitErrs - prevInterfaceInfo.transmitErrs,
          transmitDrop: interfaceInfo.transmitDrop - prevInterfaceInfo.transmitDrop
        };
      }
    };
    getNetworks = function(data) {
      var info, infos, result, _i, _len;
      infos = data.split('\n');
      infos.shift();
      infos.shift();
      result = [];
      for (_i = 0, _len = infos.length; _i < _len; _i++) {
        info = infos[_i];
        result.push(getNetworkInfo(info));
      }
      return result;
    };
    return fs.readFile('/proc/net/dev', 'utf8', function(err, data) {
      if (err) {
        return cbf(err);
      } else {
        return cbf(null, getNetworks(data.trim()));
      }
    });
  };


  /**
   * [getDiskInfo 获取disk信息]
   * @param  {[type]} cbf [description]
   * @return {[type]}     [description]
   */

  getDiskInfo = function(cbf) {
    var df, getInfo;
    df = spawn('df', ['-h']);
    getInfo = function(info) {
      var size, values;
      values = info.trim().split(/\s+/g);
      size = GLOBAL.parseFloat(values[1]);
      if (!GLOBAL.isNaN(size)) {
        return {
          size: GLOBAL.parseFloat(values[1]),
          avail: GLOBAL.parseFloat(values[3]),
          percent: GLOBAL.parseInt(values[4]),
          mount: values.pop()
        };
      }
    };
    return df.stdout.on('data', function(msg) {
      var info, infos, result, tmpInfo, _i, _len;
      infos = msg.toString().split('\n');
      infos.shift();
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

  PREV_CPUS = null;


  /**
   * [logCpus 记录CPU使用率]
   * @return {[type]} [description]
   */

  logCpus = function() {
    var arr, cpuFilter, cpuInfo, cpus, cpusTotal, currentCpuTimes, i, idle, prevCpuTimes, sum, total, value, _i, _len;
    sum = function(times) {
      var name, total, value;
      total = 0;
      for (name in times) {
        value = times[name];
        total += value;
      }
      return total;
    };
    arr = [];
    cpus = os.cpus();
    if (PREV_CPUS) {
      cpusTotal = 0;
      cpuFilter = filterSetting.cpu;
      for (i = _i = 0, _len = cpus.length; _i < _len; i = ++_i) {
        cpuInfo = cpus[i];
        if (cpuFilter && false === cpuFilter(i)) {
          continue;
        }
        prevCpuTimes = PREV_CPUS[i].times;
        currentCpuTimes = cpuInfo.times;
        total = sum(currentCpuTimes) - sum(prevCpuTimes);
        idle = currentCpuTimes.idle - prevCpuTimes.idle;
        value = Math.floor(100 * (total - idle) / (total / 1));
        cpusTotal += value;
        statsClient.gauge("cpu" + i, value);
      }
      statsClient.gauge('cpu', Math.floor(cpusTotal / cpus.length));
    }
    PREV_CPUS = cpus;
  };


  /**
   * [logMemory 记录内存的使用]
   * @return {[type]} [description]
   */

  logMemory = function() {
    var freeMemory, userMemory;
    freeMemory = os.freemem();
    userMemory = os.totalmem() - freeMemory;
    statsClient.gauge('freeMemory', Math.floor(freeMemory / MB));
    statsClient.gauge('useMemory', Math.floor(userMemory / MB));
    return getSwapUsage(function(err, swapUse) {
      if (err) {
        return;
      }
      if (~swapUse) {
        return statsClient.gauge('swapUse', swapUse);
      }
    });
  };


  /**
   * [logNetworkInterfaceInfos 记录networkinterface的状态信息]
   * @return {[type]} [description]
   */

  logNetworkInterfaceInfos = function() {
    return getNetworkInfos(function(err, networkInterfaceInfos) {
      var name, networkFilter, networkInterfaceInfo, _i, _len;
      if (err) {
        return;
      }
      for (_i = 0, _len = networkInterfaceInfos.length; _i < _len; _i++) {
        networkInterfaceInfo = networkInterfaceInfos[_i];
        if (networkInterfaceInfo) {
          networkFilter = filterSetting.network;
          name = networkInterfaceInfo.name;
          if (networkFilter && false === networkFilter(name)) {
            return;
          }
          statsClient.gauge("" + name + "_receiveSpeed", networkInterfaceInfo.receiveSpeed);
          statsClient.count("" + name + "_receiveErrs", networkInterfaceInfo.receiveErrs);
          statsClient.count("" + name + "_receiveDrop", networkInterfaceInfo.receiveDrop);
          statsClient.gauge("" + name + "_transmitSpeed", networkInterfaceInfo.transmitSpeed);
          statsClient.count("" + name + "_transmitErrs", networkInterfaceInfo.transmitErrs);
          statsClient.count("" + name + "_transmitDrop", networkInterfaceInfo.transmitDrop);
        }
      }
    });
  };


  /**
   * [logDiskInfos 记录disk相关信息]
   * @return {[type]} [description]
   */

  logDiskInfos = function() {
    return getDiskInfo(function(err, infos) {
      var diskFilter, info, mount, _i, _len;
      if (err) {
        return;
      }
      for (_i = 0, _len = infos.length; _i < _len; _i++) {
        info = infos[_i];
        mount = info.mount;
        diskFilter = filterSetting.disk;
        if (diskFilter && false === diskFilter(mount)) {
          return;
        }
        statsClient.gauge("diskAvail_" + mount, info.avail);
      }
    });
  };


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
    var monitorHandler;
    if (options == null) {
      options = {};
    }
    monitorHandler = function() {
      if (statsClient) {
        if (options.cpu !== false) {
          logCpus();
        }
        if (options.memory !== false) {
          logMemory();
        }
        if (options.netWork !== false) {
          logNetworkInterfaceInfos();
        }
        if (options.disk !== false) {
          return logDiskInfos();
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
