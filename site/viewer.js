'use strict';

import * as THREE from 'three';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let animationId = null;
let currentModel = null;
const loader = new MMDLoader();

function resize() {
  if (!renderer) return;
  const widthLimit = getWidthLimit();
  const heightLimit = getHeightLimit();
  camera.aspect = widthLimit / heightLimit;
  camera.updateProjectionMatrix();
  renderer.setSize(widthLimit, heightLimit);
}

function initOnce() {
  const canvas = document.getElementById('modelViewer');
  if (!canvas) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  camera = new THREE.PerspectiveCamera(
    45, (getWidthLimit()) / getHeightLimit(), 0.1, 1000
  );
  camera.position.set(0, 15, 30);
  camera.lookAt(0, 10, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.setSize(getWidthLimit(), getHeightLimit());

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 10, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 15);
  dirLight.castShadow = true;
  scene.add(dirLight);

  window.addEventListener('resize', resize);
}

function preview(characterVersion, characterName) {
  const canvas = document.getElementById('modelViewer');
  canvas.style.display = 'block';

  if (window.innerWidth < 1024) {
    const closeViewer = document.getElementById('closeViewer');
    closeViewer.style.display = 'block';
    const modelList = document.getElementById('modelList');
    modelList.style.display = 'none';
  }

  if (!renderer) initOnce();

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }

  const modelPath = `ver/${characterVersion}/${characterName}/main.pmx`;
  loader.load(
    modelPath,
    (mesh) => {
      scene.add(mesh);
      currentModel = mesh;
    },
    (progress) => {
      // console.log('Loading: ', Math.round(progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
      console.error('Error loading model:', error);
    }
  );

  function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

function getWidthLimit() {
  return window.innerWidth > 1024 ? window.innerWidth / 2 : window.innerWidth;
}

function getHeightLimit() {
  const header = document.querySelector('header');
  const toolbar = document.querySelector('div[role="toolbar"]');
  return window.innerHeight - header.offsetHeight - toolbar.offsetHeight;
}

window.modelViewer = { preview, getHeightLimit };
