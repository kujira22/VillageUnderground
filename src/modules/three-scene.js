import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { UNDERLINE_REVEAL_EVENT } from "./text-animations.js";


export function initThreeScene({ mount } = {}) {
  if (!mount) {
    console.warn("[base] No [data-three-canvas] mount found.");
    return null;
  }

  const settings = getSceneSettings(mount);

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
    settings.fov,
    getWidth() / getHeight(),
    0.1,
    100,
  );
  camera.position.set(
    settings.cameraPosition.x,
    settings.cameraPosition.y,
    settings.cameraPosition.z,
  );
  const baseCameraPosition = camera.position.clone();

  const modelGroup = new THREE.Group();
  modelGroup.rotation.set(
    THREE.MathUtils.degToRad(settings.rotation.x),
    THREE.MathUtils.degToRad(settings.rotation.y),
    THREE.MathUtils.degToRad(settings.rotation.z),
  );
  scene.add(modelGroup);
  camera.lookAt(0, 0, 0);

  let disposed = false;
  let frameId = null;
  let model = null;
  let placeholder = false;
  let mixer = null;
  let animationAction = null;
  let animationClip = null;
  let animationTween = null;
  let animationTrigger = null;
  let animationPlayed = false;
  let revealEventCleanup = null;
  let footerControlCleanup = null;
  let targetRotationY = modelGroup.rotation.y;
  let targetCameraX = baseCameraPosition.x;
  let targetCameraY = baseCameraPosition.y;
  let targetCameraZ = baseCameraPosition.z;
  let running = false;
  const clock = new THREE.Clock();
  const loader = new GLTFLoader();
  const blackMaterial = new THREE.MeshBasicMaterial({
    color: settings.blackColor,
    side: THREE.FrontSide,
  });
  const whiteMaskMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    colorWrite: false,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const ready = loadModel();

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
    updateCameraTarget();
    renderer.setSize(width, height);
  }

  function updateCameraTarget() {
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    if (model && placeholder) positionPlaceholder();
  }

  function render() {
    if (!running) {
      return;
    }

    if (!settings.enterAnimation) {
      mixer?.update(clock.getDelta());
    }

    if (settings.mouseCameraMove) {
      camera.position.x += (targetCameraX - camera.position.x) * settings.mouseEase;
      camera.position.y += (targetCameraY - camera.position.y) * settings.mouseEase;
      camera.position.z += (targetCameraZ - camera.position.z) * settings.mouseEase;
    } else {
      modelGroup.rotation.y += (targetRotationY - modelGroup.rotation.y) * settings.mouseEase;
    }

    updateCameraTarget();
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(render);
  }

  async function loadModel() {
    const modelUrl = mount.dataset.threeModel;
    if (!modelUrl) {
      addPlaceholder();
      return;
    }
    try {
      const gltf = await loader.loadAsync(modelUrl);
      if (disposed) {
        disposeModel(gltf.scene);
        return;
      }
      model = gltf.scene;
      setupModel(model);
      model.position.set(0, 0, 0);
      modelGroup.add(model);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2));
      playModelAnimations(gltf);
      updateCameraTarget();
    } catch (error) {
      console.warn("[base] Model could not be loaded; using placeholder.", error);
      if (!disposed) addPlaceholder();
    }
  }

  function addPlaceholder() {
    placeholder = true;
    model = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: 0xf4f1ea, metalness: 0.25, roughness: 0.4 }),
    );
    modelGroup.add(model);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight, new THREE.AmbientLight(0xb7c7ff, 0.75));
    positionPlaceholder();
  }

  function positionPlaceholder() {
    const distance = camera.position.length();
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    modelGroup.position.copy(right.multiplyScalar(height * camera.aspect * 0.30))
      .add(up.multiplyScalar(height * -0.28));
    model.scale.setScalar(height * Math.min(0.16, camera.aspect * 0.18));
  }

  function playModelAnimations(gltf) {
    if (!gltf.animations.length) {
      return;
    }

    mixer = new THREE.AnimationMixer(model);

    const clip = gltf.animations[0];
    animationClip = clip;
    animationAction = mixer.clipAction(clip);
    animationAction.reset();
    animationAction.setLoop(THREE.LoopOnce, 1);
    animationAction.clampWhenFinished = true;
    animationAction.play();
    animationAction.paused = true;
    animationAction.time = 0;
    mixer.update(0);

    if (settings.enterAnimation) {
      setupEnterAnimation(clip);
    }

    if (settings.footerControls) {
      setupFooterControls(clip);
    }
  }

  function setupEnterAnimation(clip) {
    const gsap = window.gsap;

    if (!gsap) {
      holdFinalFrame(clip);
      return;
    }

    const finalTime = getFinalFrameTime(clip);

    animationTween = gsap.to(animationAction, {
      time: finalTime,
      duration: settings.enterDuration,
      ease: "power4.out",
      paused: true,
      onStart: () => {
        animationAction.paused = false;
      },
      onUpdate: () => {
        mixer.update(0);
      },
      onComplete: () => {
        holdFinalFrame(clip);
      },
    });

    if (setupUnderlineRevealTrigger(clip)) {
      return;
    }

    activateRevealTrigger();
  }

  function activateRevealTrigger() {
    if (!animationClip || !animationAction || animationTrigger || animationPlayed) {
      return;
    }

    if (setupUnderlineRevealTrigger(animationClip)) {
      return;
    }

    if (!window.ScrollTrigger) {
      playEnterAnimation(animationClip);
      return;
    }

    const triggerElement = getRevealTriggerElement();

    animationTrigger = window.ScrollTrigger.create({
      trigger: triggerElement,
      start: settings.enterStart,
      once: true,
      onEnter: () => playEnterAnimation(animationClip),
    });

    window.ScrollTrigger.refresh();

    if (isInViewport(triggerElement)) {
      playEnterAnimation(animationClip);
    }
  }

  function setupUnderlineRevealTrigger(clip) {
    const triggerElement = getRevealTriggerElement();

    if (!settings.useUnderlineRevealTrigger || !triggerElement) {
      return false;
    }

    if (triggerElement.dataset.underlineRevealed === "true") {
      playFooterRevealAnimation(clip);
      return true;
    }

    if (revealEventCleanup) {
      return true;
    }

    const onReveal = () => {
      revealEventCleanup = null;
      playFooterRevealAnimation(clip);
    };

    triggerElement.addEventListener(UNDERLINE_REVEAL_EVENT, onReveal, { once: true });
    revealEventCleanup = () => {
      triggerElement.removeEventListener(UNDERLINE_REVEAL_EVENT, onReveal);
    };

    return true;
  }

  function playEnterAnimation(clip) {
    if (animationPlayed) {
      holdFinalFrame(clip);
      return;
    }

    animationTween?.play();
  }

  function playFooterRevealAnimation(clip) {
    if (!settings.footerControls || !window.gsap || !animationAction || !mixer) {
      playEnterAnimation(clip);
      return;
    }

    animationTween?.kill();
    animationPlayed = false;
    animationAction.paused = false;
    animationAction.time = 0;
    resize();
    mixer.update(0);
    renderer.render(scene, camera);

    requestAnimationFrame(resize);

    animationTween = window.gsap.to(animationAction, {
      time: getFinalFrameTime(clip),
      duration: settings.enterDuration,
      ease: "power4.out",
      overwrite: true,
      onStart: () => {
        animationAction.paused = false;
      },
      onUpdate: () => {
        mixer.update(0);
      },
      onComplete: () => {
        holdFinalFrame(clip);
      },
    });
  }

  function setupFooterControls(clip) {
    const gsap = window.gsap;

    if (!gsap || !animationAction || !mixer) {
      return;
    }

    const finalTime = getFinalFrameTime(clip);
    const hoverTime = finalTime * settings.footerHoverProgress;
    const restTime = finalTime * settings.footerRestProgress;
    const clickTime = finalTime * settings.footerClickProgress;
    const controlTarget = mount.closest("[data-three-control]") || mount;
    const onMouseEnter = () => {
      if (document.querySelector("[data-page-leaving='true']")) {
        return;
      }

      tweenAnimationTime(hoverTime, settings.footerHoverDuration, settings.footerHoverEase);
    };
    const onMouseLeave = () => {
      if (document.querySelector("[data-page-leaving='true']")) {
        return;
      }

      tweenAnimationTime(restTime, settings.footerHoverDuration, settings.footerHoverEase);
    };
    const onClick = () => {
      tweenAnimationTime(clickTime, settings.footerClickDuration, settings.footerClickEase);
    };

    controlTarget.addEventListener("mouseenter", onMouseEnter);
    controlTarget.addEventListener("mouseleave", onMouseLeave);
    controlTarget.addEventListener("click", onClick);

    footerControlCleanup = () => {
      controlTarget.removeEventListener("mouseenter", onMouseEnter);
      controlTarget.removeEventListener("mouseleave", onMouseLeave);
      controlTarget.removeEventListener("click", onClick);
    };
  }

  function tweenAnimationTime(time, duration, ease) {
    const gsap = window.gsap;

    if (!gsap || !animationAction || !mixer) {
      return;
    }

    animationTween?.kill();
    animationAction.paused = false;
    animationTween = gsap.to(animationAction, {
      time,
      duration,
      ease,
      onUpdate: () => {
        mixer.update(0);
      },
      onComplete: () => {
        animationAction.paused = true;
        mixer.update(0);
      },
    });
  }

  function animateToProgress(progress, duration = settings.transitionOutDuration) {
    if (!animationAction || !animationClip) {
      window.gsap?.to(modelGroup.rotation, { y: modelGroup.rotation.y + Math.PI, duration, overwrite: true });
      return;
    }

    const finalTime = getFinalFrameTime(animationClip);
    const time = finalTime * THREE.MathUtils.clamp(progress, 0, 1);

    tweenAnimationTime(time, duration, settings.transitionOutEase);
  }

  function holdFinalFrame(clip) {
    const finalTime = getFinalFrameTime(clip);

    animationPlayed = true;
    animationAction.time = finalTime;
    animationAction.paused = true;
    mixer.update(0);
  }

  function setupModel(root) {
    root.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      const usesWhite = materials.some(isWhiteMaterial);
      const usesBlack = materials.some(isBlackMaterial);

      // Optional depth-mask convention for models authored with black/white materials.
      if (!usesWhite && !usesBlack) return;
      materials.forEach((material) => material?.dispose());
      child.material = Array.isArray(child.material)
        ? materials.map((material) =>
            isWhiteMaterial(material) ? whiteMaskMaterial : blackMaterial,
          )
        : usesWhite
          ? whiteMaskMaterial
          : blackMaterial;
      child.renderOrder = usesBlack ? 1 : 0;
    });
  }

  function isWhiteMaterial(material) {
    return material?.name?.toLowerCase() === "white";
  }

  function isBlackMaterial(material) {
    return material?.name?.toLowerCase() === "black";
  }

  function updateMouseInteraction(event) {
    const progress = event.clientX / Math.max(window.innerWidth, 1);
    const centered = progress - 0.5;

    if (settings.mouseCameraMove) {
      const yProgress = event.clientY / Math.max(window.innerHeight, 1);
      const centeredY = yProgress - 0.5;

      targetCameraX = baseCameraPosition.x + centered * 2 * settings.mouseCameraRange.x;
      targetCameraY = baseCameraPosition.y + centeredY * 2 * settings.mouseCameraRange.y;
      targetCameraZ = baseCameraPosition.z - centeredY * 2 * settings.mouseCameraRange.z;
      return;
    }

    const offset = THREE.MathUtils.degToRad(settings.mouseRotationRange) * centered * 2;

    targetRotationY = THREE.MathUtils.degToRad(settings.rotation.y) + offset;
  }

  function getRevealTriggerElement() {
    return settings.enterTrigger || mount;
  }

  window.addEventListener("resize", resize);
  if (settings.mouseRotation || settings.mouseCameraMove) {
    window.addEventListener("mousemove", updateMouseInteraction);
  }
  resize();
  start();

  function start() {
    if (running) {
      return;
    }

    running = true;
    clock.getDelta();
    render();
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(frameId);
    frameId = null;
  }

  function isVisible() {
    const style = window.getComputedStyle?.(mount);
    const rect = mount.getBoundingClientRect();

    return (
      style?.display !== "none" &&
      style?.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  return {
    ready,
    animateToProgress,
    isVisible,
    start,
    stop,
    destroy() {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", updateMouseInteraction);
      stop();
      revealEventCleanup?.();
      footerControlCleanup?.();
      animationTrigger?.kill();
      animationTween?.kill();
      disposed = true;
      mixer?.stopAllAction();
      if (model) {
        mixer?.uncacheRoot(model);
        disposeModel(model);
      }
      blackMaterial.dispose();
      whiteMaskMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function isInViewport(element) {
  const rect = element.getBoundingClientRect();

  return rect.top < window.innerHeight && rect.bottom > 0;
}

function getFinalFrameTime(clip) {
  return Math.max(clip.duration - 0.001, 0);
}

function getSceneSettings(mount) {
  const triggerSelector = mount.dataset.threeReveal;
  const enterTrigger = triggerSelector ? document.querySelector(triggerSelector) : null;
  return {
    fov: 25,
    cameraPosition: { x: 0, y: 2, z: 3 },
    rotation: { x: 0, y: 35, z: 0 },
    enterAnimation: true,
    enterTrigger,
    enterStart: "top 100%",
    useUnderlineRevealTrigger: Boolean(enterTrigger),
    enterDuration: 2.2,
    mouseRotation: false,
    mouseRotationRange: 5,
    mouseCameraMove: true,
    mouseCameraRange: { x: 0.18, y: 0.12, z: 0.1 },
    mouseEase: 0.045,
    footerControls: true,
    footerRestProgress: 1,
    footerHoverProgress: 0.8,
    footerClickProgress: 0,
    footerHoverDuration: 0.24,
    footerHoverEase: "power1.inOut",
    footerClickDuration: 0.42,
    footerClickEase: "power4.in",
    transitionOutDuration: 0.55,
    transitionOutEase: "power4.in",
    blackColor: 0x252525,
  };
}

function disposeModel(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    const entries = Array.isArray(child.material) ? child.material : [child.material];
    entries.filter(Boolean).forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value?.isTexture) textures.add(value);
      });
    });
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}
