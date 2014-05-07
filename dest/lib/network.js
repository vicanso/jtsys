(function() {
  var KB, MB, NETWORK_INTERFACE_INFOS, fs, getNetworkInfos;

  fs = require('fs');

  KB = 1024;

  MB = 1024 * KB;

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
   * [log 记录networkinterface的状态信息， 单位KB]
   * @return {[type]} [description]
   */

  exports.log = function(client, networkFilter) {
    return getNetworkInfos(function(err, networkInterfaceInfos) {
      var name, networkInterfaceInfo, _i, _len;
      if (err) {
        return;
      }
      for (_i = 0, _len = networkInterfaceInfos.length; _i < _len; _i++) {
        networkInterfaceInfo = networkInterfaceInfos[_i];
        if (networkInterfaceInfo) {
          name = networkInterfaceInfo.name;
          if (networkFilter && false === networkFilter(name)) {
            return;
          }
          client.gauge("network." + name + ".receiveSpeed", networkInterfaceInfo.receiveSpeed);
          client.count("network." + name + ".receiveErrs", networkInterfaceInfo.receiveErrs);
          client.count("network." + name + ".receiveDrop", networkInterfaceInfo.receiveDrop);
          client.gauge("network." + name + ".transmitSpeed", networkInterfaceInfo.transmitSpeed);
          client.count("network." + name + ".transmitErrs", networkInterfaceInfo.transmitErrs);
          client.count("network." + name + ".transmitDrop", networkInterfaceInfo.transmitDrop);
        }
      }
    });
  };

}).call(this);
