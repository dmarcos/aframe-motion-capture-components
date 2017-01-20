/* global THREE AFRAME  */
AFRAME.registerComponent('avatar-player', {
  schema: {
    src: {default: ''}
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
    keys.forEach(function (key) {
      if (key === 'camera') {
        self.el.camera.el.setAttribute('motion-capture-player', {loop: false});
        self.el.camera.el.components['motion-capture-player'].startPlaying(data.camera);
      } else {
        el = document.querySelector('#' + key);
        if (!el) { console.warn('Avatar Player: No element with id ' + key); }
        el.setAttribute('motion-capture-player', {loop: false});
        el.components['motion-capture-player'].startPlaying(data[key]);
      }
    });
  },

  loadRecordingFromUrl: function (url, binary, callback) {
    var loader = new THREE.XHRLoader(this.manager);
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