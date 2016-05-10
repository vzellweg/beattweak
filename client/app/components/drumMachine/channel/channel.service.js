(function() {
  'use strict';

  angular
      .module('beattweakApp')
      .service('channel', channel);
    function channel($http, $log) {
      var data = [];

      
      this.getChannels = function () {
        return data;
      }

      // This helper loads sound buffers
      var loadTrack = function(track, index, context) {
        var item = data[index];
        var url = '/assets/sounds/' + track;
        $http.get(url, {responseType: "arraybuffer"}).
          success(function(data) {
            $log.debug("Read '" + url + "' with " + data.byteLength
            + " bytes in a variable of type '" + data + "'");
            context.decodeAudioData(data, function(buffer) {
              var createNode = function() {
                var node = context.createBufferSource()
                node.buffer = buffer
                node.connect(context.destination)
                return node
              }
              item.sound = { createNode: createNode }
            })
          }).
          error(function(data, status) {
            $log.error("Request failed with status: " + status);
          });
        
      }

      this.loadInstruments = function(gridLength, context, instrumentFile) {
        var item;
        var file = instrumentFile || "/app/components/drumMachine/defaults/local-kit.json";

        return $http.get(file).then(function(response) {
          var clearBeats = function(){this.sequence.forEach(function(b){b.active = false;})};
          for(var i = 0; i < 4; i++) {
            item = response.data.instruments[i];
            var row = {
              'channel': i + 1,
              'title': item.name, 
              'sound': null,
              'sequence': []
            };
            var toggleBeat = function(){this.active = !this.active;};
            var clearBeat = function(){this.active = false;};
            var togglePlay = function(){this.playing = !this.playing;};
            var stopPlay = function(){this.playing = false;};
            for(var j = 0; j < gridLength; j++) {
              // Add beats
              row.sequence.push({"active": false, "toggle": toggleBeat, 
                "clear": clearBeat, "playing": false,
                "togglePlay": togglePlay, "stopPlay": stopPlay,
                "getClasses": function(){return {"active": this.active, "playing": this.playing};}
              });
            }
            row.clearBeats = clearBeats;
            row.getSequence =  function(){return this.sequence};
            data.push(row);
            loadTrack(item.file, i, context);
               
          }
          return "Instruments Loaded";
        });
      }
    }

    channel.$inject = ['$http', '$log'];

})();