/* global THREE AFRAME  */
AFRAME.registerComponent('avatar-player', {
  schema: {
    src: {default: ''},
    loop: {default: false}
  },

  update: function (oldData) {
    var data = this.data;
    if (!data.src || oldData.src === data.src) { return; }
    this.updateSrc(data.src);
  },

  updateSrc: function (src) {
    var self = this;
    this.loadRecordingFromUrl(src, false, this.startPlaying.bind(this));
  },

  startPlaying: function (data) {
    var self = this;
    var keys = Object.keys(data);
    this.recordingData = data;
    this.isPlaying = true;
    if (!this.el.camera) {
      this.el.addEventListener('camera-set-active', function () {
        self.startPlaying(data);
      });
      return;
    }
    keys.forEach(function (key) {
      if (key === 'camera') {
        self.el.camera.el.setAttribute('motion-capture-player', {loop: self.data.loop});
        self.el.camera.el.components['motion-capture-player'].startPlaying(data.camera);
      } else {
        el = document.querySelector('#' + key);
        if (!el) { console.warn('Avatar Player: No element with id ' + key); }
        el.setAttribute('motion-capture-player', {loop: self.data.loop});
        el.components['motion-capture-player'].startPlaying(data[key]);
      }
    });
  },

  stopPlaying: function () {
    var keys;
    var self = this;
    if (!this.isPlaying || !this.recordingData) { return; }
    this.isPlaying = false;
    keys = Object.keys(this.recordingData);
    keys.forEach(function (key) {
      if (key === 'camera') {
        self.el.camera.el.components['motion-capture-player'].stopPlaying();
      } else {
        el = document.querySelector('#' + key);
        if (!el) { console.warn('Avatar Player: No element with id ' + key); }
        el.components['motion-capture-player'].stopPlaying();
      }
    });
  },

  loadRecordingFromUrl: function (url, binary, callback) {
    var loader = new THREE.FileLoader(this.manager);
    var self = this;
    var data;
    loader.crossOrigin = 'anonymous';
    if (binary === true) { loader.setResponseType('arraybuffer'); }
    loader.load(url, function (buffer) {
      if (binary === true) {
        data = self.loadStrokeBinary(buffer);
      } else {
        data = JSON.parse(buffer);
      }
      if (callback) { callback(data); }
    });
  }
});