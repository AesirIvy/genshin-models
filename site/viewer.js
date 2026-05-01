'use strict';

import * as THREE from 'three';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let currentModel = null;
const loader = new MMDLoader();

function getWidthLimit() {
  return window.innerWidth > 1024 ? window.innerWidth / 2 : window.innerWidth;
}

function getHeightLimit() {
  const header = document.querySelector('header');
  const toolbar = document.querySelector('div[role="toolbar"]');
  return window.innerHeight - header.offsetHeight - toolbar.offsetHeight;
}

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

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x29291b })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  camera = new THREE.PerspectiveCamera(
    45, (getWidthLimit()) / getHeightLimit(), 0.1, 1000
  );
  camera.position.set(0, 15, 37);
  camera.lookAt(0, 10, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.setSize(getWidthLimit(), getHeightLimit());

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 10, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(10, 20, 15);
  dirLight.castShadow = true;
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.right = 20;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.bias = -0.0005;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.add(dirLight);

  lightSourceSlider = document.getElementById('lightSourceSlider');
  lightSourceSlider.addEventListener('input', (event) => {
    const intensity = event.target.value;
    dirLight.intensity = intensity;
  });

  window.addEventListener('resize', resize);
}

async function preview(characterVersion, characterName) {
  const canvas = document.getElementById('modelViewer');
  canvas.style.display = 'block';
  const canvasToolbar = document.getElementById('canvasToolbar');
  canvasToolbar.style.display = 'flex';

  if (window.innerWidth < 1024) {
    const modelList = document.getElementById('modelList');
    modelList.style.display = 'none';
  }

  if (!renderer) initOnce();

  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }

  const modelPath = `site/models/${characterVersion}/${characterName}/character.pmx`;
  currentModel = await loader.loadAsync(modelPath);
  currentModel.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });
  scene.add(currentModel);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

window.modelViewer = { preview, getHeightLimit };
