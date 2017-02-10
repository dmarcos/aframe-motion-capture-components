/* global THREE AFRAME  */
AFRAME.registerComponent('stroke', {
  schema: {
    enabled: {default: true},
    color: {default: '#ef2d5e', type: 'color'}
  },

  init: function () {
    var maxPoints = this.maxPoints = 3000;
    var strokeEl;
    this.idx = 0;
    this.numPoints = 0;

    // Buffers
    this.vertices = new Float32Array(maxPoints*3*3);
    this.normals = new Float32Array(maxPoints*3*3);
    this.uvs = new Float32Array(maxPoints*2*2);

    // Geometries
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setDrawRange(0, 0);
    this.geometry.addAttribute('position', new THREE.BufferAttribute(this.vertices, 3).setDynamic(true));
    this.geometry.addAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setDynamic(true));
    this.geometry.addAttribute('normal', new THREE.BufferAttribute(this.normals, 3).setDynamic(true));

    this.material = new THREE.MeshStandardMaterial({
      color: this.data.color,
      roughness: 0.75,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    var mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.drawMode = THREE.TriangleStripDrawMode;
    mesh.frustumCulled = false;

    // Injects stroke entity
    strokeEl = document.createElement('a-entity');
    strokeEl.setObject3D('stroke', mesh);
    this.el.sceneEl.appendChild(strokeEl);
  },

  update: function() {
    this.material.color.set(this.data.color);
  },

  drawPoint: (function () {
    var direction = new THREE.Vector3();
    var positionA = new THREE.Vector3();
    var positionB = new THREE.Vector3();
    return function (position, orientation, timestamp, pointerPosition) {
      var uv = 0;
      var numPoints = this.numPoints;
      var brushSize = 0.01;
      if (numPoints === this.maxPoints) { return; }
      for (i = 0; i < numPoints; i++) {
        this.uvs[uv++] = i / (numPoints - 1);
        this.uvs[uv++] = 0;

        this.uvs[uv++] = i / (numPoints - 1);
        this.uvs[uv++] = 1;
      }

      direction.set(1, 0, 0);
      direction.applyQuaternion(orientation);
      direction.normalize();

      positionA.copy(pointerPosition);
      positionB.copy(pointerPosition);
      positionA.add(direction.clone().multiplyScalar(brushSize / 2));
      positionB.add(direction.clone().multiplyScalar(-brushSize / 2));

      this.vertices[this.idx++] = positionA.x;
      this.vertices[this.idx++] = positionA.y;
      this.vertices[this.idx++] = positionA.z;

      this.vertices[this.idx++] = positionB.x;
      this.vertices[this.idx++] = positionB.y;
      this.vertices[this.idx++] = positionB.z;

      this.computeVertexNormals();
      this.geometry.attributes.normal.needsUpdate = true;
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.uv.needsUpdate = true;

      this.geometry.setDrawRange(0, numPoints * 2);
      this.numPoints += 1;
      return true;
    }
  })(),

  reset: function () {
    var idx = 0;
    var vertices = this.vertices;
    for (i = 0; i < this.numPoints; i++) {
      vertices[idx++] = 0;
      vertices[idx++] = 0;
      vertices[idx++] = 0;

      vertices[idx++] = 0;
      vertices[idx++] = 0;
      vertices[idx++] = 0;
    }
    this.geometry.setDrawRange(0, 0);
    this.idx = 0;
    this.numPoints = 0;
  },

  computeVertexNormals: function () {
    var pA = new THREE.Vector3();
    var pB = new THREE.Vector3();
    var pC = new THREE.Vector3();
    var cb = new THREE.Vector3();
    var ab = new THREE.Vector3();

    for (var i = 0, il = this.idx; i < il; i++) {
      this.normals[ i ] = 0;
    }

    var pair = true;
    for (i = 0, il = this.idx; i < il; i += 3) {
      if (pair) {
        pA.fromArray(this.vertices, i);
        pB.fromArray(this.vertices, i + 3);
        pC.fromArray(this.vertices, i + 6);
      } else {
        pA.fromArray(this.vertices, i + 3);
        pB.fromArray(this.vertices, i);
        pC.fromArray(this.vertices, i + 6);
      }
      pair = !pair;

      cb.subVectors(pC, pB);
      ab.subVectors(pA, pB);
      cb.cross(ab);
      cb.normalize();

      this.normals[i] += cb.x;
      this.normals[i + 1] += cb.y;
      this.normals[i + 2] += cb.z;

      this.normals[i + 3] += cb.x;
      this.normals[i + 4] += cb.y;
      this.normals[i + 5] += cb.z;

      this.normals[i + 6] += cb.x;
      this.normals[i + 7] += cb.y;
      this.normals[i + 8] += cb.z;
    }

    /*
    first and last vertice (0 and 8) belongs just to one triangle
    second and penultimate (1 and 7) belongs to two triangles
    the rest of the vertices belongs to three triangles

      1_____3_____5_____7
      /\    /\    /\    /\
     /  \  /  \  /  \  /  \
    /____\/____\/____\/____\
    0    2     4     6     8
    */

    // Vertices that are shared across three triangles
    for (i = 2 * 3, il = this.idx - 2 * 3; i < il; i++) {
      this.normals[ i ] = this.normals[ i ] / 3;
    }

    // Second and penultimate triangle, that shares just two triangles
    this.normals[ 3 ] = this.normals[ 3 ] / 2;
    this.normals[ 3 + 1 ] = this.normals[ 3 + 1 ] / 2;
    this.normals[ 3 + 2 ] = this.normals[ 3 * 1 + 2 ] / 2;

    this.normals[ this.idx - 2 * 3 ] = this.normals[ this.idx - 2 * 3 ] / 2;
    this.normals[ this.idx - 2 * 3 + 1 ] = this.normals[ this.idx - 2 * 3 + 1 ] / 2;
    this.normals[ this.idx - 2 * 3 + 2 ] = this.normals[ this.idx - 2 * 3 + 2 ] / 2;

    this.geometry.normalizeNormals();
  }
});
