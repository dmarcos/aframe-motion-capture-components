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

      // Create object store.
      objectStore = db.createObjectStore('recordings', {keyPath: 'recordingName'});
      objectStore.createIndex('recordingName', 'recordingName', {unique: true});
      self.objectStore = objectStore;
    };

    // Got database.
    request.onsuccess = function (evt) {
      self.db = evt.target.result;
      self.sceneEl.emit('recordingdbinitialized');
    };
  },

  /**
   * Need a new transaction for everything.
   */
  getTransaction: function () {
    var transaction = this.db.transaction([OBJECT_STORE_NAME], 'readwrite');
    return transaction.objectStore(OBJECT_STORE_NAME);
  },

  getRecordingNames: function () {
    var self = this;

    return new Promise(function (resolve) {
      self.waitForDb(function () {
        self.getTransaction().openCursor().onsuccess = function (evt) {
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
      });
    });
  },

  getRecordings: function (cb) {
    var self = this;

    return new Promise(function getRecordings (resolve) {
      self.waitForDb(function () {
        self.getTransaction().openCursor().onsuccess = function (evt) {
          var cursor = evt.target.result;
          var recordings = [cursor.value];
          while (cursor.continue()) {
            recordings.push(cursor.value);
          }
          resolve(recordings);
        };
      });
    });
  },

  getRecording: function (name) {
    var self = this;

    return new Promise(function getRecording (resolve) {
      self.waitForDb(function () {
        self.getTransaction().get(name).onsuccess = function (evt) {
          delete evt.target.result.recordingName;
          resolve(evt.target.result);
        };
      });
    });
  },

  addRecording: function (name, data) {
    data.recordingName = name;
    this.getTransaction().put(data);
  },

  deleteRecording: function (name) {
    this.getTransaction().delete(name);
  },

  /**
   * Helper to wait for store to be initialized before using it.
   */
  waitForDb: function (cb) {
    if (this.db) {
      cb();
      return;
    }
    this.sceneEl.addEventListener('recordingdbinitialized', cb);
  }
});
