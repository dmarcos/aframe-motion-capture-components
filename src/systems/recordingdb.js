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

    this.db = null;
    this.hasLoaded = false;

    request = indexedDB.open(DB_NAME, VERSION);

    request.onerror = function () {
      console.error('Error opening IndexedDB for motion capture.', request.error);
    };

    // Initialize database.
    request.onupgradeneeded = function (evt) {
      var db = self.db = evt.target.result;
      var objectStore;

      // Create object store.
      objectStore = db.createObjectStore('recordings', {
        autoIncrement: false
      });
      objectStore.createIndex('recordingName', 'recordingName', {unique: true});
      self.objectStore = objectStore;
    };

    // Got database.
    request.onsuccess = function (evt) {
      self.db = evt.target.result;
      self.hasLoaded = true;
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
      var recordingNames = [];

      self.waitForDb(function () {
        self.getTransaction().openCursor().onsuccess = function (evt) {
          var cursor = evt.target.result;

          // No recordings.
          if (!cursor) {
            resolve(recordingNames.sort());
            return;
          }

          recordingNames.push(cursor.key);
          cursor.continue();
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
          while (cursor.ontinue()) {
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
          resolve(evt.target.result);
        };
      });
    });
  },

  addRecording: function (name, data) {
    this.getTransaction().add(data, name);
  },

  deleteRecording: function (name) {
    this.getTransaction().delete(name);
  },

  /**
   * Helper to wait for store to be initialized before using it.
   */
  waitForDb: function (cb) {
    if (this.hasLoaded) {
      cb();
      return;
    }
    this.sceneEl.addEventListener('recordingdbinitialized', cb);
  }
});
