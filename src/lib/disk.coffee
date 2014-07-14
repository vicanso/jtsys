spawn = require('child_process').spawn
KB = 1024
MB = 1024 * KB
###*
 * [getDiskInfo 获取disk信息，返回单位mb]
 * @param  {[type]} cbf [description]
 * @return {[type]}     [description]
###
getDiskInfo = (cbf) ->
  df = spawn 'df'
  blockSize = 1024 / MB

  getInfo = (info) ->
    values = info.trim().split /\s+/g
    used = GLOBAL.parseFloat values[2]
    if !GLOBAL.isNaN used
      avail = GLOBAL.parseFloat values[3]
      {
        size : Math.floor (used + avail) * blockSize
        avail : Math.floor avail * blockSize
        percent : 100 - GLOBAL.parseInt values[4]
        mount : values.pop()
      }
  df.stdout.on 'data', (msg)->
    infos = msg.toString().split '\n'
    firstLine = infos.shift()
    blockSize = 512 / MB if ~firstLine.indexOf '512-blocks'
    result = []
    for info in infos
      tmpInfo = getInfo info
      result.push tmpInfo if tmpInfo
    cbf null, result




###*
 * [logDiskInfos 记录disk相关信息(直接使用df命令的返回数值，不考虑单位)]
 * @return {[type]} [description]
###
mountInfos = {}
exports.log = (client, diskFilter) ->
  getDiskInfo (err, infos) ->
    return if err
    for info in infos
      mount = info.mount
      avail = info.avail
      return if diskFilter && false == diskFilter mount
      prevMountInfo = mountInfos[mount]
      now = Math.floor Date.now() / 1000
      if prevMountInfo
        changeSize = prevMountInfo.avail - avail 
        usedTime = now - prevMountInfo.updatedAt
        client.gauge "disk.writeSpeed.#{mount}", Math.floor changeSize / usedTime
      mountInfos[mount] = 
        avail : avail
        updatedAt : now
      client.gauge "disk.avail.#{mount}", Math.ceil avail / 1024