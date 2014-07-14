JTStatsClient = require 'jtstats_client'
os = require 'os'
program = require 'commander'
jtSys = require './index'
dgram = require 'dgram'
server = dgram.createSocket 'udp4'
server.bind '9300'

server.on 'message', (buf) ->
  console.dir buf.toString()

do ->
  program.version('0.0.1')
  .option('-p, --port <n>', 'stats server port', parseInt)
  .parse process.argv

# cpuCheckInterval = 100
client = new JTStatsClient {
  port : program.port || '9300'
  category : "sys-#{os.hostname()}"
}



jtSys.client client
jtSys.filter 'network', (name) ->
  if name == 'em2'
    false
  else
    true

jtSys.filter 'disk', (mount) ->
  if mount == '/dev'
    false
  else
    true
jtSys.start 10 * 1000



