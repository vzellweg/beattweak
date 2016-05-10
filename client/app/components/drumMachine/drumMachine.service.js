(function() {
  'use strict';
angular
.module('beattweakApp')
.factory('drumMachine', ['$http', '$q', 'channel', '$window', '$rootScope', '$log', function($http, $q, channel, $window, $rootScope, $log) {
  // Private variables
  if (!$window.AudioContext) {alert('you browser doesnt support Web Audio API')}

  var tempo = 120
    , signature = 4
    , barRes = 8 // display half-note resolution
    , gridLength = 16
    , beatDur = 60/tempo
    , barDur = signature * beatDur
    , clock, context, rhythmIndex,
    playing, uiEvent;
  var rows = [];
  // var events = eventQueue;

/*  
  scheduling code inspired by tutorial at:
    http://sebpiq.github.io/WAAClock/demos/beatSequence.html
*/

  function loadInstruments() {
    return channel.loadInstruments(gridLength, context).then(function()
      {
        rows = channel.getChannels();
        $log.debug('rows: ' + JSON.stringify(rows))
        return "success"
      });
  }
  // This function activates the beat `beatInd` of `track`.
  var startBeat = function(track, beatInd) {

    if (!playing){return;}

    var beat = rows[track].sequence[beatInd]

    var event = clock.callbackAtTime(function(event) {
      var bufferNode = rows[track].sound.createNode()
      bufferNode.start(event.deadline)
    }, nextBeatTime(beatInd))
    event.repeat(barDur)
    event.tolerance({late: 0.01})
    beat.event = event
  }

  // This function deactivates the beat `beatInd` of `track`.
  var stopBeat = function(track, beatInd) {
    if (!playing){return;}

    var event = rows[track].sequence[beatInd].event
    event.clear()
  }

  // ---------- Just some helpers ---------- //
  // This helper calculates the absolute time of the upcoming `beatInd`. 
  // TODO: add param for type of beat dur, for now use 16th
  var nextBeatTime = function(beatInd) {
    var noteRatio = 0.25; // default 16th note  
    var currentTime = context.currentTime
      , currentBar = Math.floor(currentTime / barDur)
      , currentBeat = Math.round(currentTime % barDur)
    if (currentBeat < beatInd) return currentBar * barDur + beatInd * beatDur * noteRatio
    else return (currentBar + 1) * barDur + beatInd * beatDur * noteRatio
  }

  function incrementStep(){
    var cur = rhythmIndex;
    var next = cur + 1 < gridLength ? cur + 1: 0;
    rows.forEach(function(c){
      if (cur > -1) {
        c.sequence[cur].togglePlay();
      }
      c.sequence[next].togglePlay();
    });
    rhythmIndex = next;
    $rootScope.$digest();
  }

  function disableCol(col) {
    rows.forEach(function(c){
      c.sequence[col].stopPlay();
    });
    // $rootScope.$digest();
  }

  function getRows() {
    rows = channel.getChannels();
    return rows;
  }
  function getGridLength() {
    return gridLength;
  }
  function play() {
    rhythmIndex = -1;
    clock = new WAAClock(context, {toleranceEarly: 0.1});
    playing = true;
    $log.debug('play started')
    clock.start();

    // Schedule all enabled beats
    rows.forEach(function(row, rowInd) {
      row.sequence.forEach(function(beat, beatInd) {
        if (beat.active) {
          startBeat(rowInd, beatInd);
        }
      })
    })

    uiEvent = clock.callbackAtTime(incrementStep, nextBeatTime(0))
    // TODO: update uitempo while playing
    .repeat(beatDur*0.25)
    .tolerance({ early: 0.1, late: 1 })
  }
  function stop() {
    playing = false;
    // events.clear();
    uiEvent.clear();
    disableCol(rhythmIndex);
    clock.stop();
  }
  function getTempo() {
    return tempo;
  }
  function setTempo(new_tempo) {
    tempo = new_tempo;
    beatDur = 60/tempo
    barDur = signature * beatDur
  }
  function isPlaying() {
    return playing;
  }
  function reset() {
    $log.debug('reset started')
    rows.forEach(function(c) {
      c.clearBeats();
    });
  }
  function getContext(){
    return context;
  }
  // End scheduling code

  context = new AudioContext();
    
  // rows = channel.loadInstruments();

  // Return public functions
  return {
    loadInstruments: loadInstruments,
    // loadSequence: loadSequence,
    gridLength: getGridLength,
    // currentBeat: currentBeat,
    channels: getRows,
    tempo: getTempo,
    setTempo: setTempo,
    play: play,
    playing: isPlaying,
    stop: stop,
    reset: reset,
    startBeat: startBeat,
    stopBeat: stopBeat,
    context: getContext,
    rhythmIndex: rhythmIndex
  }
}])
})();