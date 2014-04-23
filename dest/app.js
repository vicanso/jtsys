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

  client._send = function() {
    return console.dir(arguments);
  };

  jtSysMoniter.setLogClient(client);

  jtSysMoniter.filter('network', function(name) {
    if (name === 'em2') {
      return false;
    } else {
      return true;
    }
  });

  jtSysMoniter.filter('disk', function(mount) {
    if (mount === '/dev') {
      return false;
    } else {
      return true;
    }
  });

  jtSysMoniter.start(10 * 1000);

}).call(this);
