os = require 'os'
PREV_CPUS = null
###*
 * [logCpus 记录CPU使用率]
 * @return {[type]} [description]
###
exports.log = (client, cpuFilter) ->
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
      continue if cpuFilter && false == cpuFilter i
      prevCpuTimes = PREV_CPUS[i].times
      currentCpuTimes = cpuInfo.times
      total = sum(currentCpuTimes) - sum(prevCpuTimes)
      idle = currentCpuTimes.idle - prevCpuTimes.idle
      value = Math.floor 100 * (total - idle) / (total / 1)
      cpusTotal += value
      client.gauge "cpu.#{i}", value
    client.gauge 'cpu.all', Math.floor cpusTotal / cpus.length
  PREV_CPUS = cpus
  return