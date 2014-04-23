JTStatsClient = require '../../jtstats_client'
os = require 'os'
program = require 'commander'
jtSysMoniter = require './index'

do ->
  program.version('0.0.1')
  .option('-p, --port <n>', 'stats server port', parseInt)
  .parse process.argv

# cpuCheckInterval = 100
client = new JTStatsClient {
  port : program.port || '9300'
  prefix : "sys.#{os.hostname()}."
}

client._send = ->
  console.dir arguments

jtSysMoniter.setLogClient client
jtSysMoniter.filter 'network', (name) ->
  if name == 'em2'
    false
  else
    true

jtSysMoniter.filter 'disk', (mount) ->
  if mount == '/dev'
    false
  else
    true
jtSysMoniter.start 10 * 1000



