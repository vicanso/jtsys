fs = require 'fs'
KB = 1024
MB = 1024 * KB
NETWORK_INTERFACE_INFOS = {}
###*
 * [getNetworkInfos 获取网络信息（只用于linux）]
 * @param  {[type]} cbf [description]
 * @return {[type]}     [description]
###
getNetworkInfos = (cbf) ->
  getNetworkInfo = (info) ->
    currentTime = Math.floor Date.now() / 1000
    values = info.trim().split /\s+/g
    name = values[0]
    name = name.substring 0, name.length - 1
    interfaceInfo = 
      seconds : currentTime
      receiveBytes : GLOBAL.parseInt values[1]
      receivePackets : GLOBAL.parseInt values[2]
      receiveErrs : GLOBAL.parseInt values[3]
      receiveDrop : GLOBAL.parseInt values[4]
      transmitBytes : GLOBAL.parseInt values[9]
      transmitPackets : GLOBAL.parseInt values[10]
      transmitErrs : GLOBAL.parseInt values[11]
      transmitDrop : GLOBAL.parseInt values[12]
    prevInterfaceInfo = NETWORK_INTERFACE_INFOS[name]
    NETWORK_INTERFACE_INFOS[name] = interfaceInfo
    if prevInterfaceInfo
      base = (currentTime - prevInterfaceInfo.seconds) * KB
      getSpeed = (value) ->
        Math.floor value / (base || 1)
      {
        name : name
        receiveSpeed : getSpeed interfaceInfo.receiveBytes - prevInterfaceInfo.receiveBytes
        receiveErrs : interfaceInfo.receiveErrs - prevInterfaceInfo.receiveErrs
        receiveDrop : interfaceInfo.receiveDrop - prevInterfaceInfo.receiveDrop
        transmitSpeed : getSpeed interfaceInfo.transmitBytes - prevInterfaceInfo.transmitBytes
        transmitErrs : interfaceInfo.transmitErrs - prevInterfaceInfo.transmitErrs
        transmitDrop : interfaceInfo.transmitDrop - prevInterfaceInfo.transmitDrop

      }
  getNetworks = (data) ->
    infos = data.split '\n'
    infos.shift()
    infos.shift()
    result = []
    
    for info in infos
      result.push getNetworkInfo info

    result
    
  fs.readFile '/proc/net/dev', 'utf8', (err, data) ->
    if err
      cbf err
    else
      cbf null, getNetworks data.trim()


###*
 * [log 记录networkinterface的状态信息， 单位KB]
 * @return {[type]} [description]
###
exports.log = (client, networkFilter) ->
  getNetworkInfos (err, networkInterfaceInfos) ->
    return if err
    for networkInterfaceInfo in networkInterfaceInfos
      if networkInterfaceInfo
        name = networkInterfaceInfo.name
        return if networkFilter && false == networkFilter name
        client.gauge "network.#{name}.receiveSpeed", networkInterfaceInfo.receiveSpeed
        client.count "network.#{name}.receiveErrs", networkInterfaceInfo.receiveErrs
        client.count "network.#{name}.receiveDrop", networkInterfaceInfo.receiveDrop
        client.gauge "network.#{name}.transmitSpeed", networkInterfaceInfo.transmitSpeed
        client.count "network.#{name}.transmitErrs", networkInterfaceInfo.transmitErrs
        client.count "network.#{name}.transmitDrop", networkInterfaceInfo.transmitDrop