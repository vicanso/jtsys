assert = require 'assert'
jsc = require 'jscoverage'
fs = require 'fs'
path = require 'path'
jtsysFile = '../dest'
if process.env.NODE_ENV == 'cov'
  jtSys = jsc.require module, jtsysFile
else
  jtSys = require jtsysFile

_readFile = fs.readFile
fs.readFile = (file, encoding, cbf) ->
  file = path.join __dirname, "../#{file}"
  _readFile file, encoding, cbf





describe 'jtSys', ->
  describe '#start', ->
    it 'should start successful', (done) ->
      total = 0
      checkFinished = ->
        total++
        done() if total == 61
      clientMock = 
        gauge : ->
          checkFinished()
        count : ->
          checkFinished()

      jtSys.setLogClient clientMock
      jtSys.start 20
      setTimeout ->
        jtSys.start 2000 * 1000
      , 25
  describe '#filter', ->
    it 'should set filter successful', (done) ->
      total = 0
      checkFinished = ->
        total++
        done() if total == 42
      clientMock = 
        gauge : (key) ->
          total++
          if key == 'cpu0'
            done new Error 'cpu0 is not filter'
          checkFinished()
        count : ->
          checkFinished()
      jtSys.filter 'cpu', (name) ->
        if name == 0
          false
        else
          true
      jtSys.setLogClient clientMock
      jtSys.start 20 * 1000