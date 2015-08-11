
statsClient = null
filterSetting = {}

# fs = require 'fs'
# path = require 'path'
# _readFile = fs.readFile
# fs.readFile = (file, encoding, cbf) ->
#   file = path.join __dirname, "../#{file}"
#   _readFile file, encoding, cbf


###*
 * [client 设置记录log的client]
 * @param {[type]} client [description]
###
module.exports.client = (client) ->
  statsClient = client if client
  statsClient

timerId = null
###*
 * [start 开始监控]
 * @param  {[type]} interval 取样时间间隔
 * @param  {[type]} options 配置是否不需要监控某指标，如不希望监控CPU使用率{cpu : false}
 * @return {[type]}          [description]
###
module.exports.start = (interval, options = {}) ->
  memory = require './lib/memory'
  cpu = require './lib/cpu'
  network = require './lib/network'
  disk = require './lib/disk'
  io = require './lib/io'

  monitorHandler = ->
    if statsClient
      cpu.log statsClient, filterSetting.cpu if options.cpu != false
      memory.log statsClient if options.memory != false
      network.log statsClient, filterSetting.network if options.netWork != false
      disk.log statsClient, filterSetting.disk if options.disk != false
      if options.io != false
        io.log statsClient, filterSetting.io, interval
        options.io = false
    return
  GLOBAL.clearInterval timerId if timerId
  monitorHandler()
  timerId = GLOBAL.setInterval ->
    monitorHandler()
  , interval
  return

###*
 * [filter 设置filter]
 * @param  {[type]} type   [description]
 * @param  {[type]} filter [description]
 * @return {[type]}        [description]
###
module.exports.filter = (type, filter) ->
  filterSetting[type] = filter
  return
