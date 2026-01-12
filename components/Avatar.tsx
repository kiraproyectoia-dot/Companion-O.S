import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { AnimationMixer, AnimationAction, LoopOnce, Bone, SkinnedMesh, Vector2, Euler, MathUtils } from 'three';
import { useGLTF, OrbitControls } from '@react-three/drei';

// FIX: Added JSX declarations for Three.js components to resolve compilation errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any;
      ambientLight: any;
      directionalLight: any;
    }
  }
}

interface ModelProps {
  modelUrl: string;
  isSpeaking: boolean;
  currentGesture: string | null;
  currentEmotion?: string;
  getAudioVolume?: () => number;
}

interface MorphTargetInfo {
  mesh: SkinnedMesh;
  index: number;
}

const GESTURE_TO_ANIMATION_MAP: Record<string, string[]> = {
    nod: ['nod', 'yes', 'agree', 'affirm'],
    shake: ['shake', 'no', 'disagree', 'deny'],
    thoughtful: ['lookaround', 'headtilt', 'think', 'ponder'],
    idle_yawn: ['yawn', 'tired'],
    idle_hair: ['hair', 'fix'],
};

// Mapeo refinado para morph targets ARKit (Estándar de Ready Player Me)
const EMOTION_MAP: Record<string, Record<string, number>> = {
  happy: {
    mouthSmileLeft: 0.7,
    mouthSmileRight: 0.7,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.4,
    cheekPuff: 0.2,
    browInnerUp: 0.3,
    mouthUpperUpLeft: 0.2,
    mouthUpperUpRight: 0.2
  },
  sad: {
    mouthFrownLeft: 0.8,
    mouthFrownRight: 0.8,
    browInnerUp: 0.9,
    eyeWideLeft: 0.2,
    eyeWideRight: 0.2,
    mouthShrugLower: 0.6,
    browDownLeft: 0.3,
    browDownRight: 0.3,
    mouthRollLower: 0.4
  },
  angry: {
    browDownLeft: 1.0,
    browDownRight: 1.0,
    mouthShrugUpper: 0.7,
    eyeSquintLeft: 0.6,
    eyeSquintRight: 0.6,
    jawForward: 0.5,
    noseSneerLeft: 0.8,
    noseSneerRight: 0.8,
    mouthRollUpper: 0.3
  },
  surprised: {
    browOuterUpLeft: 1.0,
    browOuterUpRight: 1.0,
    jawOpen: 0.3, 
    eyeWideLeft: 0.9,
    eyeWideRight: 0.9,
    browInnerUp: 0.5
  },
  passionate: {
    mouthSmileLeft: 0.4,
    mouthSmileRight: 0.4,
    eyeWideLeft: 0.3,
    eyeWideRight: 0.3,
    browInnerUp: 0.6,
    mouthOpen: 0.2,
    cheekSquintLeft: 0.3,
    cheekSquintRight: 0.3
  },
  neutral: {} 
};

const AvatarModel: React.FC<ModelProps> = ({ modelUrl, isSpeaking, currentGesture, currentEmotion = 'neutral', getAudioVolume }) => {
  const { scene, animations } = useGLTF(modelUrl);
  const mixer = useRef<AnimationMixer | null>(null);

  const [visemes, setVisemes] = useState<Record<string, MorphTargetInfo[]>>({});
  const [emotionMorphs, setEmotionMorphs] = useState<Record<string, MorphTargetInfo[]>>({});
  
  const [headBone, setHeadBone] = useState<Bone | null>(null);
  const [neckBone, setNeckBone] = useState<Bone | null>(null);
  const [spineBone, setSpineBone] = useState<Bone | null>(null);
  const [leftEyeBone, setLeftEyeBone] = useState<Bone | null>(null);
  const [rightEyeBone, setRightEyeBone] = useState<Bone | null>(null);
  
  const animationsMap = useRef<Record<string, AnimationAction>>({});
  const idleAnimations = useRef<AnimationAction[]>([]);
  
  const eyeDartState = useRef({ nextTime: 3, target: new Vector2() });
  const idleAnimState = useRef({ nextTime: 10, isPlaying: false });
  const gestureState = useRef({ isPlaying: false, activeProcedural: null as string | null, startTime: 0 });
  const lastEmotionRef = useRef<string>('neutral');
  
  const lipSyncState = useRef({
      lastVisemeChangeTime: 0,
      currentVisemeIndex: -1,
      targetIntensity: 0,
  });

  const initialBoneRotations = useRef(new Map<string, Euler>());

  useEffect(() => {
    if (!scene) return;
    
    mixer.current = new AnimationMixer(scene);
    const onAnimationFinished = (event: any) => {
        if (idleAnimations.current.includes(event.action)) idleAnimState.current.isPlaying = false;
        if (Object.values(animationsMap.current).includes(event.action)) gestureState.current.isPlaying = false;
    };
    mixer.current.addEventListener('finished', onAnimationFinished);
    
    animationsMap.current = {};
    idleAnimations.current = [];
    if (animations && animations.length > 0) {
        animations.forEach(clip => {
            const action = mixer.current!.clipAction(clip);
            action.setLoop(LoopOnce, 1);
            action.clampWhenFinished = true;
            animationsMap.current[clip.name] = action;

            const name = clip.name.toLowerCase();
            if (['idle', 'breathe', 'look', 'hair', 'yawn'].some(k => name.includes(k))) {
                idleAnimations.current.push(action);
            }
        });
    }
    
    let candidates = {
        head: null as Bone | null,
        neck: null as Bone | null,
        spine: null as Bone | null,
        leftEye: null as Bone | null,
        rightEye: null as Bone | null,
    };
    
    const discoveredVisemes: Record<string, MorphTargetInfo[]> = {};
    const discoveredEmotions: Record<string, MorphTargetInfo[]> = {};

    scene.traverse(node => {
        if ((node as any).isSkinnedMesh) {
            const mesh = node as SkinnedMesh;
            if (mesh.morphTargetDictionary) {
                for (const name in mesh.morphTargetDictionary) {
                    const info = { mesh, index: mesh.morphTargetDictionary[name] };
                    if (name.toLowerCase().startsWith('viseme_')) {
                        if (!discoveredVisemes[name]) discoveredVisemes[name] = [];
                        discoveredVisemes[name].push(info);
                    } else {
                        if (!discoveredEmotions[name]) discoveredEmotions[name] = [];
                        discoveredEmotions[name].push(info);
                    }
                }
            }
            
            if (mesh.skeleton) {
                mesh.skeleton.bones.forEach(bone => {
                    if (!initialBoneRotations.current.has(bone.uuid)) {
                        initialBoneRotations.current.set(bone.uuid, bone.rotation.clone());
                    }
                    const name = bone.name.toLowerCase();
                    if (name.includes('head')) candidates.head = bone;
                    if (name.includes('neck')) candidates.neck = bone;
                    if (name.includes('spine2') || name.includes('chest')) candidates.spine = bone;
                    if (name.includes('lefteye')) candidates.leftEye = bone;
                    if (name.includes('righteye')) candidates.rightEye = bone;
                });
            }
        }
    });
    
    setVisemes(discoveredVisemes);
    setEmotionMorphs(discoveredEmotions);
    setHeadBone(candidates.head);
    setNeckBone(candidates.neck);
    setSpineBone(candidates.spine);
    setLeftEyeBone(candidates.leftEye);
    setRightEyeBone(candidates.rightEye);

    return () => {
        mixer.current?.removeEventListener('finished', onAnimationFinished);
        mixer.current?.stopAllAction();
    }
  }, [scene, animations, modelUrl]);

  // Gestos Automáticos por Emoción (Lógica común para ambos géneros)
  useEffect(() => {
      if (currentEmotion !== lastEmotionRef.current) {
          lastEmotionRef.current = currentEmotion;
          if (!currentGesture && !gestureState.current.isPlaying) {
              const emotionToGesture: Record<string, string> = {
                  happy: 'nod',
                  surprised: 'thoughtful',
                  angry: 'shake',
                  sad: 'thoughtful'
              };
              if (emotionToGesture[currentEmotion]) playGesture(emotionToGesture[currentEmotion]);
          }
      }
  }, [currentEmotion, currentGesture]);

  useEffect(() => {
    if (currentGesture) playGesture(currentGesture);
  }, [currentGesture]);

  const playGesture = (gestureKey: string) => {
      const keywords = GESTURE_TO_ANIMATION_MAP[gestureKey] || [gestureKey];
      const animationNames = Object.keys(animationsMap.current);
      
      let foundClipName = animationNames.find(name => 
          keywords.some(kw => name.toLowerCase().includes(kw))
      );

      if (foundClipName) {
        animationsMap.current[foundClipName].reset().fadeIn(0.2).play();
        gestureState.current.isPlaying = true;
        gestureState.current.activeProcedural = null;
      } else {
        // RESPALDO PROCEDIMENTAL: Si el modelo no tiene la animación, la simulamos con huesos
        if (['nod', 'shake', 'thoughtful'].includes(gestureKey)) {
          gestureState.current.activeProcedural = gestureKey;
          gestureState.current.startTime = performance.now() / 1000;
          gestureState.current.isPlaying = true;
          // El gesto procedimental se detendrá solo después de un tiempo en useFrame
        }
      }
  };

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime;
    mixer.current?.update(delta);
    
    // 1. APLICAR EXPRESIÓN FACIAL (Morphs ARKit)
    const activeEmotionTargets = EMOTION_MAP[currentEmotion] || {};
    Object.keys(emotionMorphs).forEach(morphName => {
        const targets = emotionMorphs[morphName];
        const targetValue = activeEmotionTargets[morphName] || 0;
        targets.forEach(info => {
          if (info.mesh.morphTargetInfluences) {
            const current = info.mesh.morphTargetInfluences[info.index];
            info.mesh.morphTargetInfluences[info.index] = MathUtils.lerp(current, targetValue, delta * 5.0);
          }
        });
    });

    // 2. SINCRONÍA LABIAL
    const visemeKeys = Object.keys(visemes);
    if (visemeKeys.length > 0) {
        let intensity = (isSpeaking && getAudioVolume) ? Math.pow(getAudioVolume(), 0.7) * 1.5 : 0;
        lipSyncState.current.targetIntensity = MathUtils.lerp(lipSyncState.current.targetIntensity, Math.min(intensity, 1.0), delta * 25.0);
        
        if (lipSyncState.current.targetIntensity > 0.05) {
            if (now - lipSyncState.current.lastVisemeChangeTime > 0.08) {
                const k = visemeKeys[Math.floor(Math.random() * visemeKeys.length)];
                lipSyncState.current.currentVisemeIndex = visemeKeys.indexOf(k);
                lipSyncState.current.lastVisemeChangeTime = now;
            }
        } else {
            lipSyncState.current.currentVisemeIndex = -1;
        }

        visemeKeys.forEach((key, index) => {
            const targetVal = (index === lipSyncState.current.currentVisemeIndex) ? lipSyncState.current.targetIntensity : 0;
            visemes[key].forEach(info => {
              if (info.mesh.morphTargetInfluences) {
                info.mesh.morphTargetInfluences[info.index] = MathUtils.lerp(info.mesh.morphTargetInfluences[info.index], targetVal, delta * 35);
              }
            });
        });
    }

    // 3. GESTOS PROCEDIMENTALES (MOVIMIENTO DE HUESOS)
    if (headBone && neckBone) {
        const initialHead = initialBoneRotations.current.get(headBone.uuid)!;
        const initialNeck = initialBoneRotations.current.get(neckBone.uuid)!;
        
        let targetRotHead = initialHead.clone();
        let targetRotNeck = initialNeck.clone();

        if (gestureState.current.activeProcedural) {
            const elapsed = now - gestureState.current.startTime;
            const duration = 1.5;
            
            if (elapsed > duration) {
                gestureState.current.activeProcedural = null;
                gestureState.current.isPlaying = false;
            } else {
                if (gestureState.current.activeProcedural === 'nod') {
                   targetRotHead.x += Math.sin(elapsed * 10) * 0.15;
                   targetRotNeck.x += Math.sin(elapsed * 10) * 0.05;
                } else if (gestureState.current.activeProcedural === 'shake') {
                   targetRotHead.y += Math.sin(elapsed * 10) * 0.25;
                   targetRotNeck.y += Math.sin(elapsed * 10) * 0.1;
                } else if (gestureState.current.activeProcedural === 'thoughtful') {
                   targetRotHead.z += 0.2;
                   targetRotHead.y += 0.1;
                }
            }
        } else {
            // Animación constante sutil (Respiración/Balanceo)
            const sway = Math.sin(now * 0.5);
            targetRotNeck.y += sway * 0.02;
            targetRotHead.x += Math.cos(now * 0.3) * 0.01;
        }

        headBone.rotation.x = MathUtils.lerp(headBone.rotation.x, targetRotHead.x, delta * 4);
        headBone.rotation.y = MathUtils.lerp(headBone.rotation.y, targetRotHead.y, delta * 4);
        headBone.rotation.z = MathUtils.lerp(headBone.rotation.z, targetRotHead.z, delta * 4);
        neckBone.rotation.y = MathUtils.lerp(neckBone.rotation.y, targetRotNeck.y, delta * 4);
    }

    // 4. MOVIMIENTO OCULAR
    if (leftEyeBone && rightEyeBone && !isSpeaking) {
        if (now > eyeDartState.current.nextTime) {
            eyeDartState.current.target.set((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.1);
            eyeDartState.current.nextTime = now + 2 + Math.random() * 4;
        }
        const initialL = initialBoneRotations.current.get(leftEyeBone.uuid)!;
        leftEyeBone.rotation.y = MathUtils.lerp(leftEyeBone.rotation.y, initialL.y + eyeDartState.current.target.x, delta * 5);
        leftEyeBone.rotation.x = MathUtils.lerp(leftEyeBone.rotation.x, initialL.x + eyeDartState.current.target.y, delta * 5);
        rightEyeBone.rotation.y = MathUtils.lerp(rightEyeBone.rotation.y, initialL.y + eyeDartState.current.target.x, delta * 5);
        rightEyeBone.rotation.x = MathUtils.lerp(rightEyeBone.rotation.x, initialL.x + eyeDartState.current.target.y, delta * 5);
    }

    // 5. ANIMACIONES IDLE ALEATORIAS (Si existen)
    if (idleAnimations.current.length > 0 && !isSpeaking && !gestureState.current.isPlaying && !idleAnimState.current.isPlaying && now > idleAnimState.current.nextTime) {
        const next = idleAnimations.current[Math.floor(Math.random() * idleAnimations.current.length)];
        next.reset().fadeIn(0.5).play();
        idleAnimState.current.isPlaying = true;
        idleAnimState.current.nextTime = now + next.getClip().duration + 10 + Math.random() * 15;
    }
  });

  return <primitive object={scene} position={[0, -1.6, 0]} />;
};

export const Avatar: React.FC<ModelProps> = ({ modelUrl, isSpeaking, currentGesture, currentEmotion, getAudioVolume }) => {
  return (
    <Canvas camera={{ position: [0, 0, 1.1], fov: 45 }} shadows className="w-full h-full">
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 4, 4]} intensity={2.0} castShadow={true} />
      <Suspense fallback={null}>
        <AvatarModel 
          modelUrl={modelUrl} 
          isSpeaking={isSpeaking} 
          currentGesture={currentGesture} 
          currentEmotion={currentEmotion}
          getAudioVolume={getAudioVolume} 
        />
      </Suspense>
      <OrbitControls 
        target={[0, 0.1, 0]} 
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2.2}
        maxPolarAngle={Math.PI / 1.8}
        minAzimuthAngle={-Math.PI / 12}
        maxAzimuthAngle={Math.PI / 12}
      />
    </Canvas>
  );
};
