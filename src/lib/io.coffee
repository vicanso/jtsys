spawn = require('child_process').spawn
iostat = null

# fs = require 'fs'
# path = require 'path'
# mockStr = fs.readFileSync path.join __dirname, '../../proc/iostat'

ioFields = null

getFields = (str) ->
  names = str.trim().split /\s+/g
  result = 
    device : names.indexOf 'Device:'
    readSpeed : names.indexOf 'rkB/s'
    writeSpped : names.indexOf 'wkB/s'
    await : names.indexOf 'await'
    rAwait : names.indexOf 'r_await'
    wAwait : names.indexOf 'w_await'
    svctm : names.indexOf 'svctm'
    util : names.indexOf '%util'
  result
getInfos = (data, ioFilter) ->
  infos = data.split '\n'
  return infos.length < 2
  str = infos.shift()
  while !~str.indexOf 'Device:'
    str = infos.shift()
  if !ioFields
    ioFields = getFields str
  result = []
  for info in infos
    values = info.trim().split /\s+/g
    continue if values.length != 14 || (ioFilter && false == ioFilter values[0])
    tmpResult = {}
    for field, i of ioFields
      if ~i
        value = values[i]
        value = Math.floor value if field != 'device'
        tmpResult[field] = value
    result.push tmpResult
  result

exports.log = (client, ioFilter, interval) ->
  iostat.kill() if iostat
  iostat = spawn 'iostat', ['-d', '-x', Math.floor interval / 1000]
  iostat.unref()

  iostat.stdout.on 'data', (msg) ->
    msg = msg.toString().trim()
    return if msg.length == 0
    infos = getInfos msg.toString().trim(), ioFilter
    for info in infos
      device = info.device
      delete info.device
      for field, value of info
        client.gauge "io.#{device}.#{field}", value
