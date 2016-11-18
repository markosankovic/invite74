(function () {
  var camera, scene, renderer, composer;
  var geometry, material, mesh;
  var controls;

  var blocker = document.getElementById('blocker');
  var instructions = document.getElementById('instructions');

  var i, l;

  var foundWordObjects = [];
  var animatedWordObjects = [];

  // http://www.html5rocks.com/en/tutorials/pointerlock/intro/

  var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

  if (havePointerLock) {
    var element = document.body;
    var pointerlockchange = function () {
      if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element) {
        controlsEnabled = true;
        controls.enabled = true;
        $(blocker).fadeOut(400);
      } else {
        controls.enabled = false;
        $(blocker).fadeIn(400);
        instructions.style.display = '';
      }
    };

    var pointerlockerror = function () {
      instructions.style.display = '';
    };

    // Hook pointer lock state change events
    document.addEventListener('pointerlockchange', pointerlockchange, false);
    document.addEventListener('mozpointerlockchange', pointerlockchange, false);
    document.addEventListener('webkitpointerlockchange', pointerlockchange, false);

    document.addEventListener('pointerlockerror', pointerlockerror, false);
    document.addEventListener('mozpointerlockerror', pointerlockerror, false);
    document.addEventListener('webkitpointerlockerror', pointerlockerror, false);

    instructions.addEventListener('click', function () {
      instructions.style.display = 'none';
      // Ask the browser to lock the pointer
      element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
      if (/Firefox/i.test(navigator.userAgent)) {
        var fullscreenchange = function () {
          if (document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {
            document.removeEventListener('fullscreenchange', fullscreenchange);
            document.removeEventListener('mozfullscreenchange', fullscreenchange);
            element.requestPointerLock();
          }
        };

        document.addEventListener('fullscreenchange', fullscreenchange, false);
        document.addEventListener('mozfullscreenchange', fullscreenchange, false);

        element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;

        element.requestFullscreen();
      } else {
        element.requestPointerLock();
      }
    }, false);
  } else {
    instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
  }

  var loader = new THREE.FontLoader();
  loader.load('fonts/open_sans_condensed_bold.typeface.json', function (font) {
    init(font);
    animate();
  });

  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();

  function onMouseMove(event) {

    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  var controlsEnabled = false;

  var moveForward = false;
  var moveBackward = false;
  var moveLeft = false;
  var moveRight = false;
  var canJump = false;

  var prevTime = performance.now();
  var velocity = new THREE.Vector3();

  function init(font) {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 1, 250);

    // lights

    var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.2);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(-1, 1.75, 1);
    dirLight.position.multiplyScalar(50);

    scene.add(dirLight);

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    var d = 50;

    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 3500;
    dirLight.shadow.bias = -0.0001;

    controls = new THREE.PointerLockControls(camera);
    scene.add(controls.getObject());

    var onKeyDown = function (event) {
      switch (event.keyCode) {
      case 38: // up
      case 87: // w
        moveForward = true;
        break;
      case 37: // left
      case 65: // a
        moveLeft = true;
        break;
      case 40: // down
      case 83: // s
        moveBackward = true;
        break;
      case 39: // right
      case 68: // d
        moveRight = true;
        break;
      case 32: // space
        if (canJump === true) velocity.y += 350;
        canJump = false;
        break;
      }
    };

    var onKeyUp = function (event) {
      switch (event.keyCode) {
      case 38: // up
      case 87: // w
        moveForward = false;
        break;
      case 37: // left
      case 65: // a
        moveLeft = false;
        break;
      case 40: // down
      case 83: // s
        moveBackward = false;
        break;
      case 39: // right
      case 68: // d
        moveRight = false;
        break;
      }
    };

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    // floor

    geometry = new THREE.PlaneGeometry(8000, 8000, 100, 100);
    geometry.rotateX(-Math.PI / 2);

    for (i = 0, l = geometry.vertices.length; i < l; i++) {
      var vertex = geometry.vertices[i];
      vertex.x += Math.random() * 20 - 10;
      vertex.y += Math.random() * 2;
      vertex.z += Math.random() * 20 - 10;
    }

    for (i = 0, l = geometry.faces.length; i < l; i++) {
      var face = geometry.faces[i];
      face.vertexColors[0] = new THREE.Color().setHSL(Math.random() * 0.1 + 0.5, 0.25, Math.random() * 0.25 + 0.75);
      face.vertexColors[1] = new THREE.Color().setHSL(Math.random() * 0.1 + 0.5, 0.25, Math.random() * 0.25 + 0.75);
      face.vertexColors[2] = new THREE.Color().setHSL(Math.random() * 0.1 + 0.5, 0.25, Math.random() * 0.25 + 0.75);
    }

    material = new THREE.MeshBasicMaterial({
      vertexColors: THREE.VertexColors
    });

    mesh = new THREE.Mesh(geometry, material);

    scene.add(mesh);

    mesh.receiveShadow = true;

    // words

    ["TI", "TEBI", "DRAGA", "OSOBA", "STE", "POZVANI", "KOD", "ICE", "MARKA", "NA", "USELJAJ"].forEach(function (word) {
      material = new THREE.MeshPhongMaterial({
        color: 0xdddddd
      });
      geometry = new THREE.TextGeometry(word, { font: font, curveSegments: 32 });
      mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { word: word };
      var x = Math.floor(Math.random() * 400) + 100;
      x *= Math.floor(Math.random() * 2) == 1 ? 1 : -1;
      var z = Math.floor(Math.random() * 400) + 100;
      z *= Math.floor(Math.random() * 2) == 1 ? 1 : -1;
      mesh.position.set(x, 0, z);
      mesh.lookAt(new THREE.Vector3(0, 0, 0));
      mesh.castShadow = true;
      scene.add(mesh);

      mesh.receiveShadow = true;

      geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(0, 3, 0));
      geometry.vertices.push(new THREE.Vector3(x, 3, z));
      material = new THREE.LineBasicMaterial({ color: 0x777777 });
      var line = new THREE.Line(geometry, material);
      scene.add(line);
    });

    // renderer

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xefefef);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.renderReverseSided = false;
    document.body.appendChild(renderer.domElement);

    // postprocessing

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));

    var shaderVignette = THREE.VignetteShader;
    var effectVignette = new THREE.ShaderPass(shaderVignette);
    composer.addPass(effectVignette);

    var shaderSepia = THREE.SepiaShader;
    var effectSepia = new THREE.ShaderPass(shaderSepia);
    effectSepia.uniforms.amount.value = 0.5;
    composer.addPass(effectSepia);

    // EffectCopy, which output the result as is:
    var effectCopy = new THREE.ShaderPass(THREE.CopyShader);
    effectCopy.renderToScreen = true;
    composer.addPass(effectCopy);

    // resize

    window.addEventListener('resize', onWindowResize, false);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);

    if (controlsEnabled) {
      var time = performance.now();
      var delta = (time - prevTime) / 1000;

      velocity.x -= velocity.x * 10.0 * delta;
      velocity.z -= velocity.z * 10.0 * delta;

      velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

      if (moveForward) velocity.z -= 400.0 * delta;
      if (moveBackward) velocity.z += 400.0 * delta;

      if (moveLeft) velocity.x -= 400.0 * delta;
      if (moveRight) velocity.x += 400.0 * delta;

      controls.getObject().translateX(velocity.x * delta);
      controls.getObject().translateY(velocity.y * delta);
      controls.getObject().translateZ(velocity.z * delta);

      if (controls.getObject().position.y < 10) {
        velocity.y = 0;
        controls.getObject().position.y = 10;
        canJump = true;
      }

      // update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);
      raycaster.near = 0;
      raycaster.far = 100;

      // calculate objects intersecting the picking ray
      var intersects = raycaster.intersectObjects(scene.children);

      intersects.forEach(function (intersect) {
        if (foundWordObjects.indexOf(intersect.object) === -1 && intersect.object.userData.word) {
          foundWordObjects.push(intersect.object);
          animatedWordObjects.push(intersect.object);
          window.revealWord(intersect.object.userData.word);
        }
      });

      animateWordObjects();

      prevTime = time;
    }

    function animateWordObjects() {
      animatedWordObjects.forEach(function (object) {
        object.translateY(0.5);
      });
    }

    // renderer.render(scene, camera);
    composer.render();
  }
})();