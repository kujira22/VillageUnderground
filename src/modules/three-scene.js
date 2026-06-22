import * as THREE from "three";

export function initThreeScene({ mount }) {
  if (!mount) {
    console.warn("[base] No [data-three-canvas] mount found.");
    return null;
  }

  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
  } catch (error) {
    console.warn("[base] WebGL renderer could not be created.", error);
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(getWidth(), getHeight());
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    getWidth() / getHeight(),
    0.1,
    100,
  );
  camera.position.z = 5;

  const geometry = new THREE.IcosahedronGeometry(1.35, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xf4f1ea,
    metalness: 0.25,
    roughness: 0.4,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);

  const fillLight = new THREE.AmbientLight(0xb7c7ff, 0.75);
  scene.add(fillLight);

  let namespace = document.body.dataset.page || "home";
  let frameId = null;
  let spinBoost = 0;

  function getWidth() {
    return mount.clientWidth || window.innerWidth || 1;
  }

  function getHeight() {
    return mount.clientHeight || window.innerHeight || 1;
  }

  function resize() {
    const width = getWidth();
    const height = getHeight();

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    positionMesh();
  }

  function positionMesh() {
    const distance = camera.position.z - mesh.position.z;
    const visibleHeight =
      2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    const visibleWidth = visibleHeight * camera.aspect;

    mesh.position.x = visibleWidth * 0.34;
    mesh.position.y = visibleHeight * -0.28;
  }

  function render() {
    const speed = namespace === "home" ? 0.008 : 0.014;
    spinBoost *= 0.92;
    mesh.rotation.x += speed * 0.65 + spinBoost * 0.55;
    mesh.rotation.y += speed + spinBoost;

    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize);
  resize();
  render();

  return {
    spin() {
      spinBoost = 0.16;
    },
    setNamespace(nextNamespace) {
      namespace = nextNamespace;
    },
    destroy() {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
