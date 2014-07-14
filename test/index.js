(function() {
  var assert, fs, jsc, jtSys, jtsysFile, path, _readFile;

  assert = require('assert');

  jsc = require('jscoverage');

  fs = require('fs');

  path = require('path');

  jtsysFile = '../dest';

  if (process.env.NODE_ENV === 'cov') {
    jtSys = jsc.require(module, jtsysFile);
  } else {
    jtSys = require(jtsysFile);
  }

  _readFile = fs.readFile;

  fs.readFile = function(file, encoding, cbf) {
    file = path.join(__dirname, "../" + file);
    return _readFile(file, encoding, cbf);
  };

  describe('jtSys', function() {
    describe('#start', function() {
      return it('should start successful', function(done) {
        var checkFinished, clientMock, total;
        total = 0;
        checkFinished = function() {
          total++;
          if (total === 61) {
            return done();
          }
        };
        clientMock = {
          gauge: function() {
            return checkFinished();
          },
          count: function() {
            return checkFinished();
          }
        };
        jtSys.client(clientMock);
        jtSys.start(20);
        return setTimeout(function() {
          return jtSys.start(2000 * 1000);
        }, 25);
      });
    });
    return describe('#filter', function() {
      return it('should set filter successful', function(done) {
        var checkFinished, clientMock, total;
        total = 0;
        checkFinished = function() {
          total++;
          if (total === 42) {
            return done();
          }
        };
        clientMock = {
          gauge: function(key) {
            total++;
            if (key === 'cpu0') {
              done(new Error('cpu0 is not filter'));
            }
            return checkFinished();
          },
          count: function() {
            return checkFinished();
          }
        };
        jtSys.filter('cpu', function(name) {
          if (name === 0) {
            return false;
          } else {
            return true;
          }
        });
        jtSys.client(clientMock);
        return jtSys.start(20 * 1000);
      });
    });
  });

}).call(this);
