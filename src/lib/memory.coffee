fs = require 'fs'
os = require 'os'
KB = 1024
MB = 1024 * KB
###*
 * [getSwapUsage 获取swap的使用情况，单位MB(只用于linux)]
 * @param  {[type]} cbf [description]
 * @return {[type]}     [description]
###
getSwapUsage = (cbf) ->
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

exports.log = (client) ->
  freeMemory = os.freemem()
  totalMemory = os.totalmem()
  userMemory = totalMemory - freeMemory
  client.gauge 'memory.free', Math.floor freeMemory / MB
  client.gauge 'memory.use', Math.floor userMemory / MB
  client.gauge 'memory.usageRate', Math.floor 100 * userMemory / totalMemory
  getSwapUsage (err, swapUse) ->
    return if err
    if ~swapUse
      client.gauge 'memory.swapUse', swapUse