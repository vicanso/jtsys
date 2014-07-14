(function() {
  var JTStatsClient, client, dgram, jtSys, os, program, server;

  JTStatsClient = require('jtstats_client');

  os = require('os');

  program = require('commander');

  jtSys = require('./index');

  dgram = require('dgram');

  server = dgram.createSocket('udp4');

  server.bind('9300');

  server.on('message', function(buf) {
    return console.dir(buf.toString());
  });

  (function() {
    return program.version('0.0.1').option('-p, --port <n>', 'stats server port', parseInt).parse(process.argv);
  })();

  client = new JTStatsClient({
    port: program.port || '9300',
    category: "sys-" + (os.hostname())
  });

  jtSys.client(client);

  jtSys.filter('network', function(name) {
    if (name === 'em2') {
      return false;
    } else {
      return true;
    }
  });

  jtSys.filter('disk', function(mount) {
    if (mount === '/dev') {
      return false;
    } else {
      return true;
    }
  });

  jtSys.start(10 * 1000);

}).call(this);
