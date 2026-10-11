import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { hapticFeedback } from '../utils/haptics';

interface CharacterCanvasProps {
  gender?: 'male' | 'female';
  isWalking?: boolean;
  gamePage?: 'welcome' | 'character' | 'playing';
  activeEmote?: string;
  onEmoteChange?: (emote: string) => void;
  onCharacterClick?: () => void;
}

export interface CharacterEmoteOption {
  id: string;
  label: string;
  emoji: string;
  isDance?: boolean;
}

// Module-level cache for Nico clips so they are loaded once and shared with female
let cachedNicoClips: THREE.AnimationClip[] | null = null;
let nicoLoadingPromise: Promise<THREE.AnimationClip[]> | null = null;

const fetchNicoClips = (loader: GLTFLoader): Promise<THREE.AnimationClip[]> => {
  if (cachedNicoClips && cachedNicoClips.length > 0) return Promise.resolve(cachedNicoClips);
  if (nicoLoadingPromise) return nicoLoadingPromise;
  nicoLoadingPromise = new Promise((resolve) => {
    loader.load(
      '/models/nico.glb',
      (gltf) => {
        cachedNicoClips = gltf?.animations || [];
        resolve(cachedNicoClips);
      },
      undefined,
      (err) => {
        console.warn('[CharacterCanvas] Shared animations fetch notice:', err);
        resolve([]);
      }
    );
  });
  return nicoLoadingPromise;
};

/**
 * Retargets Nico's meter-scale Mixamo animation clips onto Michelle's centimeter-scale Mixamo skeleton.
 * Keeps quaternion rotations for all bones, strips non-root bone position/scale tracks so Michelle
 * preserves her exact bone lengths, and maps Hips.position to Michelle's standing centimeter scale.
 */
function retargetClipForMichelle(clip: THREE.AnimationClip): THREE.AnimationClip {
  const hipsZScale = 102.625 / 0.83884; // Exact ratio of Michelle rest Hips.z (-102.625cm) to Nico rest Hips.z (-0.83884m)
  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    if (track.name.endsWith('.quaternion')) {
      newTracks.push(track.clone());
    } else if (track.name === 'mixamorigHips.position') {
      const cloned = track.clone();
      for (let i = 0; i < cloned.values.length; i += 3) {
        // Keep horizontal X/Y sway centered in the viewport and scale vertical Z accurately
        cloned.values[i] = cloned.values[i] * 40;
        cloned.values[i + 1] = cloned.values[i + 1] * 40;
        cloned.values[i + 2] = cloned.values[i + 2] * hipsZScale;
      }
      newTracks.push(cloned);
    }
  }

  return new THREE.AnimationClip(clip.name, clip.duration, newTracks);
}

export const CharacterCanvas: React.FC<CharacterCanvasProps> = ({
  gender = 'male',
  isWalking = false,
  gamePage = 'welcome',
  activeEmote,
  onEmoteChange,
  onCharacterClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const manualRotationRef = useRef<number>(0);
  const targetManualRotationRef = useRef<number>(0);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 3D Scene and Model References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const characterRootRef = useRef<THREE.Group | null>(null);
  const maleGroupRef = useRef<THREE.Group | null>(null);
  const maleGltfRef = useRef<THREE.Group | null>(null);
  const maleMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const maleActionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const currentActionRef = useRef<string>('idle');

  // Procedural Fallback Mesh (shown instantly until GLTF completes)
  const maleFallbackRef = useRef<THREE.Group | null>(null);
  const maleLimbsRef = useRef<{
    leftArm?: THREE.Group;
    rightArm?: THREE.Group;
    leftLeg?: THREE.Group;
    rightLeg?: THREE.Group;
    head?: THREE.Group;
    pelvis?: THREE.Group;
  }>({});

  // Default emote:
  // - On Mission page ('playing'): strictly 'slide' (Walk & Stride)
  // - On Character/Welcome page: 'dance' (Hip Hop Dance) for female, 'idle' for male
  const defaultEmoteForContext =
    gamePage === 'playing' ? 'slide' : gender === 'female' ? 'dance' : 'idle';

  const [activeAnimation, setActiveAnimation] = useState<string>(
    gamePage === 'playing' ? 'slide' : activeEmote || defaultEmoteForContext
  );
  const desiredEmoteRef = useRef<string>(
    gamePage === 'playing' ? 'slide' : activeEmote || defaultEmoteForContext
  );
  const emoteScrollRef = useRef<HTMLDivElement>(null);

  // Emote options per character & page
  const emoteList: CharacterEmoteOption[] = React.useMemo(() => {
    if (gamePage === 'playing') {
      return [{ id: 'slide', label: 'Walk & Stride', emoji: '🚶' }];
    }
    if (gender === 'female') {
      return [
        { id: 'dance', label: 'Hip Hop Dance', emoji: '🕺', isDance: true },
        { id: 'slide', label: 'Walk & Stride', emoji: '🚶' },
        { id: 'samba', label: 'Samba Dance', emoji: '💃', isDance: true },
        { id: 'idle', label: 'Idle', emoji: '🧍' },
      ];
    }
    return [
      { id: 'idle', label: 'Idle', emoji: '🧍' },
      { id: 'slide', label: 'Walk & Stride', emoji: '🚶' },
      { id: 'dance', label: 'Hip Hop Dance', emoji: '🕺', isDance: true },
      { id: 'twist', label: 'Twist Dance', emoji: '🌀', isDance: true },
      { id: 'snake', label: 'Snake Dance', emoji: '🐍', isDance: true },
      { id: 'twerk', label: 'Groove Dance', emoji: '⚡', isDance: true },
      { id: 'wave', label: 'Wave', emoji: '👋' },
    ];
  }, [gender, gamePage]);

  // Helper to map generic emote id to model specific clip name
  const resolveClipName = (emoteId: string): string => {
    const actions = maleActionsRef.current;
    if (!actions) return 'idle';

    if (emoteId === 'slide') {
      if (actions['slide']) return 'slide';
    }
    if (emoteId === 'dance' || emoteId === 'hiphop') {
      if (actions['hiphop']) return 'hiphop';
      if (actions['SambaDance']) return 'SambaDance';
    }
    if (emoteId === 'samba') {
      if (actions['SambaDance']) return 'SambaDance';
      if (actions['hiphop']) return 'hiphop';
    }
    if (emoteId === 'wave' || emoteId === 'waving') {
      if (actions['waving']) return 'waving';
      if (actions['wave']) return 'wave';
    }
    if (emoteId === 'idle') {
      if (actions['idle']) return 'idle';
    }
    if (actions[emoteId]) return emoteId;

    const keys = Object.keys(actions);
    return keys.includes(emoteId) ? emoteId : actions['hiphop'] ? 'hiphop' : actions['idle'] ? 'idle' : keys[0] || 'idle';
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 450;
    const aspect = width / height;
    const fov = aspect < 0.75 ? 36 : aspect < 1.0 ? 33 : 30;
    const camZ = aspect < 0.75 ? 4.9 : aspect < 1.0 ? 4.4 : 4.0;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    camera.position.set(0, 0.12, camZ);
    camera.lookAt(0, 0.12, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Warm Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.5);
    keyLight.position.set(2.5, 4.5, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.4);
    fillLight.position.set(-3.0, 2.5, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa7f3d0, 2.2);
    rimLight.position.set(0, 3.5, -3.5);
    scene.add(rimLight);

    // Ground Contact Shadow Disc
    try {
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 256;
      shadowCanvas.height = 256;
      const sCtx = shadowCanvas.getContext('2d');
      if (sCtx) {
        const grad = sCtx.createRadialGradient(128, 128, 12, 128, 128, 120);
        grad.addColorStop(0, 'rgba(15, 23, 42, 0.7)');
        grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.22)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, 256, 256);

        const shadowTex = new THREE.CanvasTexture(shadowCanvas);
        const shadowGeo = new THREE.PlaneGeometry(3.0, 3.0);
        const shadowMat = new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
        });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.rotation.x = -Math.PI / 2;
        shadowMesh.position.y = -0.68;
        scene.add(shadowMesh);
      }
    } catch (shadowErr) {
      console.warn('[CharacterCanvas] Shadow disc initialization notice:', shadowErr);
    }

    // Character Root Node elevated so character feet are well above bottom dock
    const characterRoot = new THREE.Group();
    characterRoot.position.set(0, -0.68, 0);
    scene.add(characterRoot);
    characterRootRef.current = characterRoot;

    // Materials for procedural fallback
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xedd6c8, roughness: 0.55 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.45 });
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const beanieMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const emeraldMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.2 });
    const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.4 });
    const sneakerSoleMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });

    const maleGroup = new THREE.Group();
    characterRoot.add(maleGroup);
    maleGroupRef.current = maleGroup;

    // Immediate Procedural Fallback (so canvas is never blank)
    const mFallback = new THREE.Group();
    maleGroup.add(mFallback);
    maleFallbackRef.current = mFallback;

    const mPelvis = new THREE.Group();
    mPelvis.position.y = 1.05;
    mFallback.add(mPelvis);
    maleLimbsRef.current.pelvis = mPelvis;

    const mTorso = new THREE.Group();
    mPelvis.add(mTorso);

    const mBLower = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.34, 0.2, 20), jacketMat);
    mBLower.position.y = 0.14;
    mBLower.castShadow = true;
    mTorso.add(mBLower);

    const mBMid = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.36, 0.2, 20), jacketMat);
    mBMid.position.y = 0.32;
    mBMid.castShadow = true;
    mTorso.add(mBMid);

    const mBUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.38, 0.2, 20), jacketMat);
    mBUpper.position.y = 0.50;
    mBUpper.castShadow = true;
    mTorso.add(mBUpper);

    const mCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.16, 20), jacketMat);
    mCollar.position.y = 0.66;
    mTorso.add(mCollar);

    const mZipper = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.56, 0.03), emeraldMat);
    mZipper.position.set(0, 0.32, 0.37);
    mTorso.add(mZipper);

    // Head
    const mHeadGroup = new THREE.Group();
    mHeadGroup.position.y = 0.88;
    mTorso.add(mHeadGroup);
    maleLimbsRef.current.head = mHeadGroup;

    const mFace = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 24), skinMat);
    mHeadGroup.add(mFace);

    const mBDome = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), beanieMat);
    mBDome.position.set(0, 0.05, -0.02);
    mHeadGroup.add(mBDome);

    const mBCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.08, 20), beanieMat);
    mBCuff.position.set(0, 0.04, -0.01);
    mHeadGroup.add(mBCuff);

    const mShades = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.045, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.9 })
    );
    mShades.position.set(0, 0.02, 0.155);
    mHeadGroup.add(mShades);

    // Arms
    const mLArm = new THREE.Group();
    mLArm.position.set(-0.44, 0.52, 0);
    mTorso.add(mLArm);
    maleLimbsRef.current.leftArm = mLArm;

    const mLSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.50, 16), jacketMat);
    mLSleeve.position.y = -0.25;
    mLSleeve.castShadow = true;
    mLArm.add(mLSleeve);

    const mLHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.07), skinMat);
    mLHand.position.y = -0.55;
    mLArm.add(mLHand);

    const mRArm = new THREE.Group();
    mRArm.position.set(0.44, 0.52, 0);
    mTorso.add(mRArm);
    maleLimbsRef.current.rightArm = mRArm;

    const mRSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.50, 16), jacketMat);
    mRSleeve.position.y = -0.25;
    mRSleeve.castShadow = true;
    mRArm.add(mRSleeve);

    const mRHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.07), skinMat);
    mRHand.position.y = -0.55;
    mRArm.add(mRHand);

    // Legs
    const mWaist = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.36, 0.2, 20), cargoMat);
    mWaist.position.y = 0.02;
    mPelvis.add(mWaist);

    const mLLeg = new THREE.Group();
    mLLeg.position.set(-0.19, 0.05, 0);
    mPelvis.add(mLLeg);
    maleLimbsRef.current.leftLeg = mLLeg;

    const mLLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.74, 16), cargoMat);
    mLLegMesh.position.y = -0.34;
    mLLegMesh.castShadow = true;
    mLLeg.add(mLLegMesh);

    const mLShoe = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.16, 0.38), sneakerMat);
    mLShoe.position.set(0, -0.73, 0.05);
    mLShoe.castShadow = true;
    mLLeg.add(mLShoe);

    const mLSole = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.07, 0.40), sneakerSoleMat);
    mLSole.position.set(0, -0.81, 0.05);
    mLLeg.add(mLSole);

    const mRLeg = new THREE.Group();
    mRLeg.position.set(0.19, 0.05, 0);
    mPelvis.add(mRLeg);
    maleLimbsRef.current.rightLeg = mRLeg;

    const mRLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.74, 16), cargoMat);
    mRLegMesh.position.y = -0.34;
    mRLegMesh.castShadow = true;
    mRLeg.add(mRLegMesh);

    const mRShoe = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.16, 0.38), sneakerMat);
    mRShoe.position.set(0, -0.73, 0.05);
    mRShoe.castShadow = true;
    mRLeg.add(mRShoe);

    const mRSole = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.07, 0.40), sneakerSoleMat);
    mRSole.position.set(0, -0.81, 0.05);
    mRLeg.add(mRSole);

    let isDisposed = false;

    const loadCharacterGltf = async () => {
      if (isDisposed) return;
      try {
        const loader = new GLTFLoader();
        if (MeshoptDecoder && typeof (MeshoptDecoder as any)?.ready?.then === 'function') {
          try {
            await (MeshoptDecoder as any).ready;
            loader.setMeshoptDecoder(MeshoptDecoder);
          } catch (meshErr) {
            console.warn('[CharacterCanvas] MeshoptDecoder init notice:', meshErr);
          }
        }

        if (gender === 'female') {
          loader.load(
            '/models/michelle.glb',
            async (gltf) => {
              if (isDisposed) return;
              try {
                const model = gltf?.scene;
                if (!model) return;

                model.traverse((child) => {
                  if ((child as THREE.Mesh)?.isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                  }
                });

                const scale = 0.98;
                model.scale.set(scale, scale, scale);
                model.position.set(0, 0, 0);

                const mixer = new THREE.AnimationMixer(model);
                maleMixerRef.current = mixer;

                const actions: Record<string, THREE.AnimationAction> = {};
                if (gltf.animations) {
                  gltf.animations.forEach((clip) => {
                    if (clip?.name) {
                      actions[clip.name] = mixer.clipAction(clip);
                    }
                  });
                }

                // Retarget shared animations from Nico so Michelle has exact centimeter bone alignment
                const sharedClips = await fetchNicoClips(loader);
                if (!isDisposed && sharedClips) {
                  sharedClips.forEach((clip) => {
                    if (clip?.name && !actions[clip.name]) {
                      const retargetedClip = retargetClipForMichelle(clip);
                      actions[clip.name] = mixer.clipAction(retargetedClip);
                    }
                  });
                }

                maleActionsRef.current = actions;

                const targetEmote =
                  gamePage === 'playing'
                    ? 'slide'
                    : desiredEmoteRef.current || 'dance';
                const initialClipName = resolveClipName(targetEmote);
                const startAction =
                  actions[initialClipName] ||
                  actions['hiphop'] ||
                  actions['SambaDance'] ||
                  Object.values(actions)[0];
                if (startAction) {
                  startAction.reset().fadeIn(0.25).play();
                  currentActionRef.current = initialClipName;
                  setActiveAnimation(targetEmote);
                }

                if (mFallback) mFallback.visible = false;
                maleGroup.add(model);
                maleGltfRef.current = model;
              } catch (traverseErr) {
                console.warn('[CharacterCanvas] GLTF process notice, procedural fallback active:', traverseErr);
              }
            },
            undefined,
            (err) => {
              console.warn('[CharacterCanvas] GLTF load notice, procedural fallback active:', err);
            }
          );
        } else {
          loader.load(
            '/models/nico.glb',
            (gltf) => {
              if (isDisposed) return;
              try {
                const model = gltf?.scene;
                if (!model) return;

                if (gltf.animations && gltf.animations.length > 0) {
                  cachedNicoClips = gltf.animations;
                }

                model.traverse((child) => {
                  if ((child as THREE.Mesh)?.isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                  }
                });

                const scale = 1.0;
                model.scale.set(scale, scale, scale);
                model.position.set(0, 0, 0);

                if (gltf.animations && gltf.animations.length > 0) {
                  const mixer = new THREE.AnimationMixer(model);
                  maleMixerRef.current = mixer;

                  const actions: Record<string, THREE.AnimationAction> = {};
                  gltf.animations.forEach((clip) => {
                    if (clip?.name) {
                      actions[clip.name] = mixer.clipAction(clip);
                    }
                  });
                  maleActionsRef.current = actions;

                  const targetEmote =
                    gamePage === 'playing'
                      ? 'slide'
                      : desiredEmoteRef.current || 'idle';
                  const initialClipName = resolveClipName(targetEmote);
                  const startAction =
                    actions[initialClipName] || actions['slide'] || actions['idle'] || Object.values(actions)[0];
                  if (startAction) {
                    startAction.reset().fadeIn(0.25).play();
                    currentActionRef.current = initialClipName;
                    setActiveAnimation(targetEmote);
                  }
                }

                if (mFallback) mFallback.visible = false;
                maleGroup.add(model);
                maleGltfRef.current = model;
              } catch (traverseErr) {
                console.warn('[CharacterCanvas] GLTF process notice, procedural fallback active:', traverseErr);
              }
            },
            undefined,
            (err) => {
              console.warn('[CharacterCanvas] GLTF load notice, procedural fallback active:', err);
            }
          );
        }
      } catch (loaderErr) {
        console.warn('[CharacterCanvas] GLTFLoader init notice:', loaderErr);
      }
    };

    loadCharacterGltf();

    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePosRef.current = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      const aspect = w / h;
      camera.aspect = aspect;
      camera.fov = aspect < 0.75 ? 36 : aspect < 1.0 ? 33 : 30;
      camera.position.z = aspect < 0.75 ? 4.9 : aspect < 1.0 ? 4.4 : 4.0;
      camera.position.y = 0.12;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      try {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
      } catch (_) {}
    }

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      if (maleMixerRef.current) {
        maleMixerRef.current.update(delta);
      }

      manualRotationRef.current = THREE.MathUtils.lerp(
        manualRotationRef.current,
        targetManualRotationRef.current,
        0.1
      );

      // Procedural Fallback Animation
      if (mFallback && mFallback.visible) {
        const breath = Math.sin(elapsedTime * 2.2) * 0.012;
        if (maleLimbsRef.current.pelvis) maleLimbsRef.current.pelvis.position.y = 1.05 + breath;

        if (isWalking || gamePage === 'playing') {
          const walkCycle = Math.sin(elapsedTime * 6.5);
          if (maleLimbsRef.current.leftLeg) maleLimbsRef.current.leftLeg.rotation.x = walkCycle * 0.6;
          if (maleLimbsRef.current.rightLeg) maleLimbsRef.current.rightLeg.rotation.x = -walkCycle * 0.6;
          if (maleLimbsRef.current.leftArm) maleLimbsRef.current.leftArm.rotation.x = -walkCycle * 0.45;
          if (maleLimbsRef.current.rightArm) maleLimbsRef.current.rightArm.rotation.x = walkCycle * 0.45;
        } else {
          const idleArm = Math.sin(elapsedTime * 2.0) * 0.035;
          if (maleLimbsRef.current.leftArm) maleLimbsRef.current.leftArm.rotation.x = 0.05 + idleArm;
          if (maleLimbsRef.current.rightArm) maleLimbsRef.current.rightArm.rotation.x = 0.05 - idleArm;
        }
      }

      const idleSway = Math.sin(elapsedTime * 1.5) * 0.02;
      if (characterRootRef.current) {
        characterRootRef.current.rotation.y = manualRotationRef.current + idleSway;
      }

      const aspect = (container.clientWidth || 400) / (container.clientHeight || 450);
      let targetZ = 3.8;
      if (aspect < 0.7) {
        targetZ = 4.5;
      } else if (aspect < 0.95) {
        targetZ = 4.2;
      } else if (aspect < 1.3) {
        targetZ = 4.0;
      } else {
        targetZ = 3.8;
      }

      if (gamePage === 'playing') {
        targetZ = Math.max(targetZ, 4.1);
      }

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.08);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.0, 0.08);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.08);
      camera.lookAt(0, -0.05, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch (_) {}
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [gamePage, gender]);

  // Robust animation switcher with smooth crossfade
  const switchAnimation = (emoteId: string, notifyParent = false) => {
    const effectiveEmote = gamePage === 'playing' ? 'slide' : emoteId;
    desiredEmoteRef.current = effectiveEmote;

    const actions = maleActionsRef.current;
    const clipName = resolveClipName(effectiveEmote);

    if (actions && actions[clipName]) {
      const prevAction = actions[currentActionRef.current];
      const nextAction = actions[clipName];
      if (prevAction !== nextAction) {
        if (prevAction) {
          prevAction.fadeOut(0.3);
        }
        nextAction.reset().fadeIn(0.3).play();
        currentActionRef.current = clipName;
      } else if (!nextAction.isRunning()) {
        nextAction.reset().fadeIn(0.3).play();
      }
    }

    setActiveAnimation((prev) => (prev === effectiveEmote ? prev : effectiveEmote));

    if (notifyParent && onEmoteChange) {
      onEmoteChange(effectiveEmote);
    }

    requestAnimationFrame(() => {
      const container = emoteScrollRef.current;
      if (container) {
        const activeBtn = container.querySelector<HTMLElement>(`[data-emote-id="${effectiveEmote}"]`);
        if (activeBtn) {
          const containerWidth = container.clientWidth;
          const btnLeft = activeBtn.offsetLeft;
          const btnWidth = activeBtn.offsetWidth;
          const targetScrollLeft = btnLeft - containerWidth / 2 + btnWidth / 2;
          container.scrollTo({
            left: Math.max(0, targetScrollLeft),
            behavior: 'smooth',
          });
        }
      }
    });
  };

  // Sync external activeEmote or gamePage without causing parent setState loops
  useEffect(() => {
    if (gamePage === 'playing') {
      switchAnimation('slide', false);
    } else if (activeEmote) {
      switchAnimation(activeEmote, false);
    } else if (gender === 'female') {
      switchAnimation('dance', false);
    } else if (isWalking) {
      switchAnimation('slide', false);
    } else {
      switchAnimation('idle', false);
    }
  }, [activeEmote, isWalking, gamePage, gender]);

  // Pointer drag to orbit 360°
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    targetManualRotationRef.current += deltaX * 0.012;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const handleCanvasClick = () => {
    hapticFeedback.tactileClick();
    if (gamePage === 'playing') {
      switchAnimation('slide', true);
    } else if (gender === 'female') {
      const nextEmote = activeAnimation === 'dance' ? 'slide' : 'dance';
      switchAnimation(nextEmote, true);
    } else {
      const nextEmote = activeAnimation === 'slide' ? 'dance' : 'slide';
      switchAnimation(nextEmote, true);
    }

    if (onCharacterClick) {
      onCharacterClick();
    }
  };

  const rotateLeft = () => {
    hapticFeedback.tactileClick();
    targetManualRotationRef.current -= Math.PI / 4;
  };
  const rotateRight = () => {
    hapticFeedback.tactileClick();
    targetManualRotationRef.current += Math.PI / 4;
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden">
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleCanvasClick}
      />

      {/* Top Right: Rotation Controls */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
        <button
          onClick={rotateLeft}
          title="Rotate Left 45°"
          type="button"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-900/80 hover:bg-stone-900 active:scale-95 text-stone-200 hover:text-white border border-stone-700/60 shadow-sm text-xs font-mono transition-all cursor-pointer backdrop-blur-md flex items-center justify-center"
        >
          <span>⟲</span>
        </button>
        <button
          onClick={rotateRight}
          title="Rotate Right 45°"
          type="button"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-900/80 hover:bg-stone-900 active:scale-95 text-stone-200 hover:text-white border border-stone-700/60 shadow-sm text-xs font-mono transition-all cursor-pointer backdrop-blur-md flex items-center justify-center"
        >
          <span>⟳</span>
        </button>
      </div>

      {/* Bottom Emote Bar - Properly Centered & Aligned */}
      <div className="absolute bottom-2.5 sm:bottom-3 inset-x-2.5 sm:inset-x-3 z-20 pointer-events-auto flex justify-center">
        <div className="max-w-full bg-stone-950/90 backdrop-blur-md rounded-2xl border border-stone-700/80 shadow-[0_6px_20px_rgba(0,0,0,0.5)] p-1.5 sm:p-2">
          <div
            ref={emoteScrollRef}
            className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5 px-1 touch-pan-x overscroll-x-contain select-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {emoteList.map((emote) => {
              const isSelected = activeAnimation === emote.id;
              return (
                <button
                  key={emote.id}
                  type="button"
                  data-emote-id={emote.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticFeedback.tactileClick();
                    switchAnimation(emote.id, true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 select-none active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-400 text-stone-950 shadow-md ring-2 ring-emerald-300/40'
                      : 'text-stone-300 hover:text-white bg-stone-900/80 hover:bg-stone-850 active:bg-stone-800 border border-stone-800'
                  }`}
                >
                  <span className="text-sm leading-none">{emote.emoji}</span>
                  <span className="whitespace-nowrap leading-none">{emote.label}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-pulse ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
