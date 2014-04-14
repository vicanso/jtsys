os = require 'os'
fs = require 'fs'
program = require 'commander'
KB = 1024
MB = 1024 * KB
platform = process.platform
statsClient = null
spawn = require('child_process').spawn



###*
 * [getSwapUseInLinux 获取swap的使用情况，单位MB(只用于linux)]
 * @param  {[type]} cbf [description]
 * @return {[type]}     [description]
###
getSwapUseInLinux = (cbf) ->
  getUse = (data) ->
    infos = data.split '\n'
    swapTotalStr = 'SwapTotal:'
    swapFreeStr = 'SwapFree:'
    swapTotal = -1
    swapFree = -1
    for info in infos
      if info.indexOf(swapTotalStr) == 0
        swapTotal = GLOBAL.parseInt info.substring(swapTotalStr.length)
      else if info.indexOf(swapFreeStr) == 0
        swapFree = GLOBAL.parseInt info.substring(swapTotalStr.length)
    if ~swapTotal && ~swapFree
      Math.floor (swapTotal - swapFree) / 1024
    else
      -1
  fs.readFile '/proc/meminfo', 'utf8', (err, data) ->
    if err
      cbf err
      return
    cbf null, getUse data.trim()


NETWORK_INTERFACE_INFOS = {}
###*
 * [getNetworkInLinux 获取网络信息（只用于linux）]
 * @param  {[type]} cbf [description]
 * @return {[type]}     [description]
###
getNetworkInLinux = (cbf) ->
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
        Math.floor value / base
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
 * [getDiskInfo 获取disk信息]
 * @param  {[type]} cbf [description]
 * @return {[type]}     [description]
###
getDiskInfo = (cbf) ->
  df = spawn 'df', ['-h']
  getInfo = (info) ->
    values = info.trim().split /\s+/g
    size = GLOBAL.parseFloat values[1]
    if !GLOBAL.isNaN size
      {
        size : GLOBAL.parseFloat values[1]
        avail : GLOBAL.parseFloat values[3]
        percent : GLOBAL.parseInt values[4]
        mount : values.pop()
      }
  df.stdout.on 'data', (msg)->
    infos = msg.toString().split '\n'
    infos.shift()
    result = []
    for info in infos
      tmpInfo = getInfo info
      result.push tmpInfo if tmpInfo
    cbf null, result

PREV_CPUS = null
###*
 * [logCpus 记录CPU使用率]
 * @return {[type]} [description]
###
logCpus = ->
  sum = (times) ->
    total = 0
    for name, value of times
      total += value
    total  
  arr = []
  cpus = os.cpus()
  if PREV_CPUS
    cpusTotal = 0
    for cpuInfo, i in cpus
      prevCpuTimes = PREV_CPUS[i].times
      currentCpuTimes = cpuInfo.times
      total = sum(currentCpuTimes) - sum(prevCpuTimes)
      idle = currentCpuTimes.idle - prevCpuTimes.idle
      value = Math.floor 100 * (total - idle) / total
      cpusTotal += value
      statsClient.gauge "cpu#{i}", value
    statsClient.gauge 'cpu', Math.floor cpusTotal / cpus.length
  PREV_CPUS = cpus
  return
###*
 * [logMemory 记录内存的使用]
 * @return {[type]} [description]
###
logMemory = ->
  freeMemory = os.freemem()
  userMemory = os.totalmem() - freeMemory
  statsClient.gauge 'freeMemory', Math.floor freeMemory / MB
  statsClient.gauge 'useMemory', Math.floor userMemory / MB
  if platform == 'linux'
    getSwapUseInLinux (err, swapUse) ->
      if ~swapUse
        statsClient.gauge 'swapUse', swapUse

###*
 * [logNetworkInterfaceInfos 记录networkinterface的状态信息]
 * @return {[type]} [description]
###
logNetworkInterfaceInfos = ->
  if platform == 'linux'
    getNetworkInLinux (err, networkInterfaceInfos) ->
      for networkInterfaceInfo in networkInterfaceInfos
        if networkInterfaceInfo
          name = networkInterfaceInfo.name
          statsClient.gauge "#{name}_receiveSpeed", networkInterfaceInfo.receiveSpeed
          statsClient.count "#{name}_receiveErrs", networkInterfaceInfo.receiveErrs
          statsClient.count "#{name}_receiveDrop", networkInterfaceInfo.receiveDrop
          statsClient.gauge "#{name}_transmitSpeed", networkInterfaceInfo.transmitSpeed
          statsClient.count "#{name}_transmitErrs", networkInterfaceInfo.transmitErrs
          statsClient.count "#{name}_transmitDrop", networkInterfaceInfo.transmitDrop
###*
 * [logDiskInfos 记录disk相关信息]
 * @return {[type]} [description]
###
logDiskInfos = ->
  if platform == 'linux' || platform == 'darwin'
    getDiskInfo (err, infos) ->
      for info in infos
        statsClient.gauge "disk_#{info.mount}", info.avail

###*
 * [setLogClient 设置记录log的client]
 * @param {[type]} client [description]
###
module.exports.setLogClient = (client) ->
  statsClient = client
  return

timerId = null
###*
 * [start 开始监控]
 * @param  {[type]} interval 取样时间间隔
 * @param  {[type]} options 配置是否不需要监控某指标，如不希望监控CPU使用率{cpu : false}
 * @return {[type]}          [description]
###
module.exports.start = (interval, options = {}) ->
  GLOBAL.clearInterval timerId if timerId
  timerId = GLOBAL.setInterval ->
    if statsClient
      logCpus() if options.cpu != false
      logMemory() if options.memory != false
      logNetworkInterfaceInfos() if options.netWork != false
      logDiskInfos() if options.disk != false
  , interval
  return
