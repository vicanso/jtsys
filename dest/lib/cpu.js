(function() {
  var PREV_CPUS, os;

  os = require('os');

  PREV_CPUS = null;


  /**
   * [logCpus 记录CPU使用率]
   * @return {[type]} [description]
   */

  exports.log = function(client, cpuFilter) {
    var arr, cpuInfo, cpus, cpusTotal, currentCpuTimes, i, idle, prevCpuTimes, sum, total, value, _i, _len;
    sum = function(times) {
      var name, total, value;
      total = 0;
      for (name in times) {
        value = times[name];
        total += value;
      }
      return total;
    };
    arr = [];
    cpus = os.cpus();
    if (PREV_CPUS) {
      cpusTotal = 0;
      for (i = _i = 0, _len = cpus.length; _i < _len; i = ++_i) {
        cpuInfo = cpus[i];
        if (cpuFilter && false === cpuFilter(i)) {
          continue;
        }
        prevCpuTimes = PREV_CPUS[i].times;
        currentCpuTimes = cpuInfo.times;
        total = sum(currentCpuTimes) - sum(prevCpuTimes);
        idle = currentCpuTimes.idle - prevCpuTimes.idle;
        value = Math.floor(100 * (total - idle) / (total / 1));
        cpusTotal += value;
        client.gauge("cpu." + i, value);
      }
      client.gauge('cpu.all', Math.floor(cpusTotal / cpus.length));
    }
    PREV_CPUS = cpus;
  };

}).call(this);
