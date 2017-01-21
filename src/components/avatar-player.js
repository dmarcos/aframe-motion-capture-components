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
    this.loadRecordingFromUrl(src, false, this.startPlaying.bind(this));
  },

  /**
   * Set player on camera and controllers (marked by ID).
   *
   * @params {object} data - {
   *   camera: {poses: [], events: []},
   *   [c1ID]: {poses: [], events: []},
   *   [c2ID]: {poses: [], events: []}
   * }
   */
  startPlaying: function (data) {
    var self = this;
    var puppetEl;
    var sceneEl = this.el;

    this.recordingData = data;
    this.isPlaying = true;
    if (!this.el.camera) {
      this.el.addEventListener('camera-set-active', function () {
        self.startPlaying(data);
      });
      return;
    }

    Object.keys(data).forEach(function setPlayer (key) {
      if (key === 'camera') {
        sceneEl.camera.el.setAttribute('motion-capture-player', {loop: false});
        sceneEl.camera.el.components['motion-capture-player'].startPlaying(data.camera);
        return;
      }

      puppetEl = sceneEl.querySelector('#' + key);
      if (!puppetEl) { console.warn('Avatar Player: No element with id ' + key); }
      puppetEl.setAttribute('motion-capture-player', {loop: false});
      puppetEl.components['motion-capture-player'].startPlaying(data[key]);
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
