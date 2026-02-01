
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { AnimationMixer, AnimationAction, LoopOnce, Bone, SkinnedMesh, Vector2, Euler, MathUtils } from 'three';
import { useGLTF, OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';

// FIX: Removed the duplicate global JSX declaration. A single consolidated declaration 
// is provided in App.tsx to avoid project-wide duplicate index signature errors.

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

const EMOTION_MAP: Record<string, Record<string, number>> = {
  happy: { mouthSmileLeft: 0.7, mouthSmileRight: 0.7, eyeSquintLeft: 0.4, eyeSquintRight: 0.4, cheekPuff: 0.2, browInnerUp: 0.3 },
  sad: { mouthFrownLeft: 0.8, mouthFrownRight: 0.8, browInnerUp: 0.9, eyeWideLeft: 0.2, eyeWideRight: 0.2, mouthShrugLower: 0.6 },
  angry: { browDownLeft: 1.0, browDownRight: 1.0, mouthShrugUpper: 0.7, eyeSquintLeft: 0.6, eyeSquintRight: 0.6, jawForward: 0.5 },
  surprised: { browOuterUpLeft: 1.0, browOuterUpRight: 1.0, jawOpen: 0.3, eyeWideLeft: 0.9, eyeWideRight: 0.9 },
  passionate: { mouthSmileLeft: 0.4, mouthSmileRight: 0.4, eyeWideLeft: 0.3, eyeWideRight: 0.3, browInnerUp: 0.6 },
  neutral: {} 
};

const AvatarModel: React.FC<ModelProps> = ({ modelUrl, isSpeaking, currentGesture, currentEmotion = 'neutral', getAudioVolume }) => {
  const { scene, animations } = useGLTF(modelUrl);
  const mixer = useRef<AnimationMixer | null>(null);

  const [visemes, setVisemes] = useState<Record<string, MorphTargetInfo[]>>({});
  const [emotionMorphs, setEmotionMorphs] = useState<Record<string, MorphTargetInfo[]>>({});
  
  const [headBone, setHeadBone] = useState<Bone | null>(null);
  const [neckBone, setNeckBone] = useState<Bone | null>(null);
  const [leftEyeBone, setLeftEyeBone] = useState<Bone | null>(null);
  const [rightEyeBone, setRightEyeBone] = useState<Bone | null>(null);
  
  const animationsMap = useRef<Record<string, AnimationAction>>({});
  const idleAnimations = useRef<AnimationAction[]>([]);
  
  const eyeDartState = useRef({ nextTime: 3, target: new Vector2() });
  const idleAnimState = useRef({ nextTime: 10, isPlaying: false });
  const gestureState = useRef({ isPlaying: false, activeProcedural: null as string | null, startTime: 0 });
  
  const lipSyncState = useRef({
      lastVisemeChangeTime: 0,
      currentVisemeIndex: -1,
      targetIntensity: 0,
  });

  const initialBoneRotations = useRef(new Map<string, Euler>());

  useEffect(() => {
    if (!scene) return;
    
    // Optimizando para móviles: Desactivar sombras de alto costo si es necesario
    scene.traverse(o => {
      if ((o as any).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        // Limitar resolución de texturas programáticamente si no viene del URL
        if ((o as any).material && (o as any).material.map) {
          (o as any).material.map.anisotropy = 4;
        }
      }
    });

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
                idleAnimations.push(action);
            }
        });
    }
    
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
                    if (name.includes('head')) setHeadBone(bone);
                    if (name.includes('neck')) setNeckBone(bone);
                    if (name.includes('lefteye')) setLeftEyeBone(bone);
                    if (name.includes('righteye')) setRightEyeBone(bone);
                });
            }
        }
    });
    
    setVisemes(discoveredVisemes);
    setEmotionMorphs(discoveredEmotions);

    return () => {
        mixer.current?.removeEventListener('finished', onAnimationFinished);
        mixer.current?.stopAllAction();
    }
  }, [scene, animations]);

  useEffect(() => {
    if (currentGesture) {
      const keywords = GESTURE_TO_ANIMATION_MAP[currentGesture] || [currentGesture];
      const animationNames = Object.keys(animationsMap.current);
      let foundClipName = animationNames.find(name => keywords.some(kw => name.toLowerCase().includes(kw)));

      if (foundClipName) {
        animationsMap.current[foundClipName].reset().fadeIn(0.2).play();
        gestureState.current.isPlaying = true;
      } else {
        gestureState.current.activeProcedural = currentGesture;
        gestureState.current.startTime = performance.now() / 1000;
        gestureState.current.isPlaying = true;
      }
    }
  }, [currentGesture]);

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime;
    mixer.current?.update(delta);
    
    // EXPRESIÓN
    const activeEmotionTargets = EMOTION_MAP[currentEmotion] || {};
    Object.keys(emotionMorphs).forEach(morphName => {
        const targets = emotionMorphs[morphName];
        const targetValue = activeEmotionTargets[morphName] || 0;
        targets.forEach(info => {
          if (info.mesh.morphTargetInfluences) {
            info.mesh.morphTargetInfluences[info.index] = MathUtils.lerp(info.mesh.morphTargetInfluences[info.index], targetValue, delta * 4.0);
          }
        });
    });

    // LIP SYNC
    const visemeKeys = Object.keys(visemes);
    if (visemeKeys.length > 0) {
        let intensity = (isSpeaking && getAudioVolume) ? Math.pow(getAudioVolume(), 0.7) * 1.5 : 0;
        lipSyncState.current.targetIntensity = MathUtils.lerp(lipSyncState.current.targetIntensity, Math.min(intensity, 1.0), delta * 20.0);
        
        if (lipSyncState.current.targetIntensity > 0.05) {
            if (now - lipSyncState.current.lastVisemeChangeTime > 0.1) {
                lipSyncState.current.currentVisemeIndex = Math.floor(Math.random() * visemeKeys.length);
                lipSyncState.current.lastVisemeChangeTime = now;
            }
        } else {
            lipSyncState.current.currentVisemeIndex = -1;
        }

        visemeKeys.forEach((key, index) => {
            const targetVal = (index === lipSyncState.current.currentVisemeIndex) ? lipSyncState.current.targetIntensity : 0;
            visemes[key].forEach(info => {
              if (info.mesh.morphTargetInfluences) {
                info.mesh.morphTargetInfluences[info.index] = MathUtils.lerp(info.mesh.morphTargetInfluences[info.index], targetVal, delta * 30);
              }
            });
        });
    }

    // PROCEDURAL
    if (headBone && neckBone) {
        const initialHead = initialBoneRotations.current.get(headBone.uuid)!;
        const initialNeck = initialBoneRotations.current.get(neckBone.uuid)!;
        let targetRotHead = initialHead.clone();
        let targetRotNeck = initialNeck.clone();

        if (gestureState.current.activeProcedural) {
            const elapsed = now - gestureState.current.startTime;
            if (elapsed > 1.5) { gestureState.current.activeProcedural = null; gestureState.current.isPlaying = false; }
            else {
                if (gestureState.current.activeProcedural === 'nod') targetRotHead.x += Math.sin(elapsed * 10) * 0.15;
                else if (gestureState.current.activeProcedural === 'shake') targetRotHead.y += Math.sin(elapsed * 10) * 0.25;
            }
        } else {
            targetRotNeck.y += Math.sin(now * 0.5) * 0.02;
            targetRotHead.x += Math.cos(now * 0.3) * 0.01;
        }

        headBone.rotation.x = MathUtils.lerp(headBone.rotation.x, targetRotHead.x, delta * 5);
        headBone.rotation.y = MathUtils.lerp(headBone.rotation.y, targetRotHead.y, delta * 5);
        neckBone.rotation.y = MathUtils.lerp(neckBone.rotation.y, targetRotNeck.y, delta * 5);
    }
  });

  return <primitive object={scene} position={[0, -1.55, 0]} />;
};

export const Avatar: React.FC<ModelProps> = (props) => {
  return (
    <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} className="w-full h-full">
      <PerspectiveCamera makeDefault position={[0, 0, 0.8]} fov={40} />
      <ambientLight intensity={0.5} />
      <spotLight position={[5, 10, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />
      <pointLight position={[-5, 2, -2]} intensity={1} color="#4c1d95" />
      <Suspense fallback={null}>
        <AvatarModel {...props} />
        <Environment preset="night" />
      </Suspense>
      <OrbitControls 
        target={[0, 0.15, 0]} 
        enableZoom={false} 
        enablePan={false}
        minPolarAngle={Math.PI / 2.2}
        maxPolarAngle={Math.PI / 1.8}
      />
    </Canvas>
  );
};
