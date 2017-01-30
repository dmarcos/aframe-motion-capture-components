AFRAME.registerSystem('motion-capture-recorder', {
  init: function () {
    this.strokes = [];
  },

  undo: function () {
    var stroke = this.strokes.pop();
    if (stroke) {
      var entity = stroke.entity;
      entity.emit('stroke-removed', {entity: entity});
      entity.parentNode.removeChild(entity);
    }
  },

  clear: function () {
    // Remove all the stroke entities
    for (var i = 0; i < this.strokes.length; i++) {
      var entity = this.strokes[i].entity;
      entity.parentNode.removeChild(entity);
    }
    this.strokes = [];
  },

  generateRandomStrokes: function (numStrokes) {
    function randNeg () { return 2 * Math.random() - 1; }

    for (var l = 0; l < numStrokes; l++) {
      var numPoints = parseInt(Math.random() * 500);

      var stroke = [];

      var position = new THREE.Vector3(randNeg(), randNeg(), randNeg());
      var aux = new THREE.Vector3();
      var orientation = new THREE.Quaternion();

      var pressure = 0.2;
      for (var i = 0; i < numPoints; i++) {
        aux.set(randNeg(), randNeg(), randNeg());
        aux.multiplyScalar(randNeg() / 20);
        orientation.setFromUnitVectors(position.clone().normalize(), aux.clone().normalize());
        position = position.add(aux);
        var timestamp = 0;

        var pointerPosition = this.getPointerPosition(position, orientation);
        stroke.addPoint(position, orientation, pointerPosition, pressure, timestamp);
      }
    }
  },

  saveStroke: function (stroke) {
    this.strokes.push(stroke);
  },

  getPointerPosition: (function () {
    var pointerPosition = new THREE.Vector3();
    var offset = new THREE.Vector3(0, 0.7, 1);
    return function getPointerPosition (position, orientation) {
      var pointer = offset
        .clone()
        .applyQuaternion(orientation)
        .normalize()
        .multiplyScalar(-0.03);
      pointerPosition.copy(position).add(pointer);
      return pointerPosition;
    };
  })(),

  getJSON: function () {
    // Strokes
    var json = {
      version: VERSION,
      strokes: [],
      author: ''
    };
    for (i = 0; i < this.strokes.length; i++) {
      json.strokes.push(this.strokes[i].getJSON(this));
    }
    return json;
  },

  getStrokeJSON: function (stroke) {
    var point;
    var points = [];
    for (var i = 0; i < stroke.length; i++) {
      point = stroke[i];
      points.push({
        position: point.position,
        rotation: point.rotation,
        timestamp: point.timestamp
      });
    }
    return points;
  },

  getBinary: function () {
    var dataViews = [];
    var MAGIC = 'apainter';
    var strokes = this.strokes = [];

    // MAGIC(8) + version (2) + usedBrushesNum(2) + usedBrushesStrings(*)
    var bufferSize = MAGIC.length;
    var binaryManager = new BinaryManager(new ArrayBuffer(bufferSize));

    // Header magic and version
    binaryManager.writeString(MAGIC);
    binaryManager.writeUint16(VERSION);

    // Number of strokes
    binaryManager.writeUint32(this.strokes.length);
    dataViews.push(binaryManager.getDataView());

    // Strokes
    for (var i = 0; i < strokes.length; i++) {
      dataViews.push(this.getStrokeBinary(strokes[i]));
    }
    return dataViews;
  },

  getStrokeBinary: function (stroke) {
    // NumPoints   = 4
    // ----------- = 4
    // [Point] = vector3 + quat + timestamp = (3+4+1)*4 = 32

    var bufferSize = 4 + (36 * stroke.length);
    var binaryManager = new BinaryManager(new ArrayBuffer(bufferSize));

    // Number of points
    binaryManager.writeUint32(stroke.length);

    // Points
    for (var i = 0; i < stroke.length; i++) {
      var point = stroke[i];
      binaryManager.writeFloat32Array(point.position.toArray());
      binaryManager.writeFloat32Array(point.orientation.toArray());
      binaryManager.writeUint32(point.timestamp);
    }
    return binaryManager.getDataView();
  },

  loadJSON: function (data) {
    var strokeData;
    if (data.version !== VERSION) {
      console.error('Invalid version: ', version, '(Expected: ' + VERSION + ')');
    }
    for (var i = 0; i < data.strokes.length; i++) {
      strokeData = data.strokes[i];
      this.loadStrokeJSON(data.strokes[i]);
    }
  },

  loadBinary: function (buffer) {
    var binaryManager = new BinaryManager(buffer);
    var magic = binaryManager.readString();
    if (magic !== 'apainter') {
      console.error('Invalid `magic` header');
      return;
    }

    var version = binaryManager.readUint16();
    if (version !== VERSION) {
      console.error('Invalid version: ', version, '(Expected: ' + VERSION + ')');
    }

    var numStrokes = binaryManager.readUint32();
    for (var l = 0; l < numStrokes; l++) {
      var numPoints = binaryManager.readUint32();
      var stroke = [];
      for (var i = 0; i < numPoints; i++) {
        var position = binaryManager.readVector3();
        var orientation = binaryManager.readQuaternion();
        var timestamp = binaryManager.readUint32();
        stroke.push({
          position: position,
          rotation: rotation,
          timestamp: time
        });
      }
    }
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
  },

  loadFromUrl: function (url, binary) {
    var loader = new THREE.XHRLoader(this.manager);
    var self = this;
    loader.crossOrigin = 'anonymous';
    if (binary === true) { loader.setResponseType('arraybuffer'); }
    loader.load(url, function (buffer) {
      if (binary === true) {
        self.loadBinary(buffer);
      } else {
        self.loadJSON(JSON.parse(buffer));
      }
    });
  }
});
