(function() {
  var getFields, getInfos, ioFields, iostat, spawn;

  spawn = require('child_process').spawn;

  iostat = null;

  ioFields = null;

  getFields = function(str) {
    var names, result;
    names = str.trim().split(/\s+/g);
    result = {
      device: names.indexOf('Device:'),
      readSpeed: names.indexOf('rkB/s'),
      writeSpped: names.indexOf('wkB/s'),
      await: names.indexOf('await'),
      rAwait: names.indexOf('r_await'),
      wAwait: names.indexOf('w_await'),
      svctm: names.indexOf('svctm'),
      util: names.indexOf('%util')
    };
    return result;
  };

  getInfos = function(data, ioFilter) {
    var field, i, info, infos, result, str, tmpResult, value, values, _i, _len;
    infos = data.split('\n');
    str = infos.shift();
    if (!ioFields) {
      ioFields = getFields(str);
    }
    result = [];
    for (_i = 0, _len = infos.length; _i < _len; _i++) {
      info = infos[_i];
      values = info.trim().split(/\s+/g);
      if (ioFilter && false === ioFilter(values[0])) {
        continue;
      }
      tmpResult = {};
      for (field in ioFields) {
        i = ioFields[field];
        if (~i) {
          value = values[i];
          if (field !== 'device') {
            value = Math.floor(value);
          }
          tmpResult[field] = value;
        }
      }
      result.push(tmpResult);
    }
    return result;
  };

  exports.log = function(client, ioFilter, interval) {
    if (iostat) {
      iostat.kill();
    }
    iostat = spawn('iostat', ['-d', '-x', Math.floor(interval / 1000)]);
    iostat.unref();
    return iostat.stdout.on('data', function(msg) {
      var device, field, info, infos, value, _i, _len, _results;
      infos = getInfos(msg.toString(), ioFilter);
      _results = [];
      for (_i = 0, _len = infos.length; _i < _len; _i++) {
        info = infos[_i];
        device = info.device;
        delete info.device;
        _results.push((function() {
          var _results1;
          _results1 = [];
          for (field in info) {
            value = info[field];
            _results1.push(client.gauge("io." + device + "." + field, value));
          }
          return _results1;
        })());
      }
      return _results;
    });
  };

}).call(this);
