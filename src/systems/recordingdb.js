/* global indexedDB */
var constants = require('../constants');

var DB_NAME = 'motionCaptureRecordings';
var OBJECT_STORE_NAME = 'recordings';
var VERSION = 1;

/**
 * Interface for storing and accessing recordings from Indexed DB.
 */
AFRAME.registerSystem('recordingdb', {
  init: function () {
    var request;
    var self = this;

    request = indexedDB.open(DB_NAME, VERSION);

    request.onerror = function (evt) {
      console.error('Error opening IndexedDB for motion capture.',
                    evt.target.errorCode);
    };

    // Initialize database.
    request.onupgradeneeded = function (evt) {
      var db = self.db = evt.target.result;
      var objectStore;

      objectStore = db.createObjectStore('recordings', {keyPath: 'name'});
      objectStore.createIndex('name', 'name', {unique: true});
      self.objectStore = objectStore;
    };

    // Got database.
    request.onsuccess = function (evt) {
      var db = self.db = evt.target.result;
      var transaction;
      transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
      self.objectStore = transaction.objectStore(OBJECT_STORE_NAME);
      self.sceneEl.emit('recordingdbinitialized', {objectStore: self.objectStore});
    };
  },

  getRecordingNames: function () {
    var self = this;

    return new Promise(function (resolve) {
      if (!self.objectStore) {
        self.sceneEl.addEventListener('recordingdbinitialized', function (evt) {
          getRecordingNames();
        });
        return;
      }
      geRecordingNames();

      function getRecordingNames () {
        self.objectStore.openCursor().onsuccess = function (evt) {
          var cursor = evt.target.result;
          var recordingNames

          // No recordings.
          if (!cursor) {
            resolve([]);
            return;
          }

          recordingNames = [cursor.value.name];
          while (cursor.continue()) {
            recordings.push(cursor.value.name);
          }
          resolve(recordingNames.sort());
        };
      }
    });
  },

  getRecordings: function (cb) {
    var objectStore = this.objectStore;
    var self = this;

    return new Promise(function getRecordings (resolve) {
      if (!objectStore) {
        self.sceneEl.addEventListener('recordingdbinitialized', function () {
          getRecordings(resolve);
        });
        return;
      }

      objectStore.openCursor().onsuccess = function (evt) {
        var cursor = evt.target.result;
        var recordings = [cursor.value];
        while (cursor.continue()) {
          recordings.push(cursor.value);
        }
        resolve(recordings);
      };
    });
  },

  getRecording: function (name) {
    var objectStore = this.objectStore;
    var self = this;

    return new Promise(function getRecording (resolve) {
      if (!objectStore) {
        self.sceneEl.addEventListener('recordingdbinitialized', function () {
          getRecording(resolve);
        });
        return;
      }

      objectStore.get(name).onsuccess = function (evt) {
        resolve(evt.target.result);
      };
    });
  },

  addRecording: function (name, data) {
    data.name = name;
    this.objectStore.put(data);
  },

  deleteRecording: function (name) {
    this.objectStore.delete(name);
  }
});
