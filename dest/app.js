(function() {
  var JTStatsClient, client, jtSysMoniter, os, program;

  JTStatsClient = require('../../jtstats_client');

  os = require('os');

  program = require('commander');

  jtSysMoniter = require('./index');

  (function() {
    return program.version('0.0.1').option('-p, --port <n>', 'stats server port', parseInt).parse(process.argv);
  })();

  client = new JTStatsClient({
    port: program.port || '9300',
    prefix: "sys." + (os.hostname()) + "."
  });

  jtSysMoniter.setLogClient(client);

  jtSysMoniter.start(10 * 1000);

}).call(this);
