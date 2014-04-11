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

jtSysMoniter.setLogClient client
jtSysMoniter.start 10 * 1000



