
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { AnimationMixer, AnimationAction, LoopOnce, Bone, SkinnedMesh, Vector2, Euler, MathUtils } from 'three';
import { useGLTF, OrbitControls } from '@react-three/drei';

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
  happy: {
    mouthSmileLeft: 0.7,
    mouthSmileRight: 0.7,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.4,
    browInnerUp: 0.3
  },
  sad: {
    mouthFrownLeft: 0.8,
    mouthFrownRight: 0.8,
    browInnerUp: 0.9,
    mouthShrugLower: 0.6
  },
  angry: {
    browDownLeft: 1.0,
    browDownRight: 1.0,
    mouthShrugUpper: 0.7,
    eyeSquintLeft: 0.6,
    jawForward: 0.5
  },
  surprised: {
    browOuterUpLeft: 1.0,
    browOuterUpRight: 1.0,
    jawOpen: 0.3, 
    eyeWideLeft: 0.9,
    eyeWideRight: 0.9
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
  const [leftEyeBone, setLeftEyeBone] = useState<Bone | null>(null);
  const [rightEyeBone, setRightEyeBone] = useState<Bone | null>(null);
  
  const animationsMap = useRef<Record<string, AnimationAction>>({});
  const idleAnimations = useRef<AnimationAction[]>([]);
  
  const eyeDartState = useRef({ nextTime: 3, target: new Vector2() });
  const idleAnimState = useRef({ nextTime: 5, isPlaying: false });
  const gestureState = useRef({ isPlaying: false, activeProcedural: null as string | null, startTime: 0 });
  const lastEmotionRef = useRef<string>('neutral');
  
  const lipSyncState = useRef({
      lastVisemeChangeTime: 0,
      currentVisemeIndex: -1,
      targetIntensity: 0,
  });

  const mouseRef = useRef(new Vector2());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
    animations?.forEach(clip => {
        const action = mixer.current!.clipAction(clip);
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
        animationsMap.current[clip.name] = action;
        const name = clip.name.toLowerCase();
        if (['idle', 'breathe', 'look', 'hair', 'yawn'].some(k => name.includes(k))) {
            idleAnimations.current.push(action);
        }
    });

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
            mesh.skeleton?.bones.forEach(bone => {
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
    });
    
    setVisemes(discoveredVisemes);
    setEmotionMorphs(discoveredEmotions);

    return () => mixer.current?.stopAllAction();
  }, [scene, animations, modelUrl]);

  useEffect(() => {
      if (currentEmotion !== lastEmotionRef.current) {
          lastEmotionRef.current = currentEmotion;
          const emotionToGesture: Record<string, string> = { happy: 'nod', angry: 'shake' };
          if (emotionToGesture[currentEmotion]) playGesture(emotionToGesture[currentEmotion]);
      }
  }, [currentEmotion]);

  useEffect(() => { if (currentGesture) playGesture(currentGesture); }, [currentGesture]);

  const playGesture = (gestureKey: string) => {
      const keywords = GESTURE_TO_ANIMATION_MAP[gestureKey] || [gestureKey];
      const foundClipName = Object.keys(animationsMap.current).find(name => keywords.some(kw => name.toLowerCase().includes(kw)));
      if (foundClipName) {
        animationsMap.current[foundClipName].reset().fadeIn(0.2).play();
        gestureState.current.isPlaying = true;
      } else {
        gestureState.current.activeProcedural = gestureKey;
        gestureState.current.startTime = performance.now() / 1000;
        gestureState.current.isPlaying = true;
      }
  };

  useFrame((state, delta) => {
    const now = state.clock.elapsedTime;
    mixer.current?.update(delta);
    
    // Morphs
    const activeEmotionTargets = EMOTION_MAP[currentEmotion] || {};
    Object.keys(emotionMorphs).forEach(morphName => {
        const targetValue = activeEmotionTargets[morphName] || 0;
        emotionMorphs[morphName].forEach(info => {
            if (info.mesh.morphTargetInfluences) {
                info.mesh.morphTargetInfluences[info.index] = MathUtils.lerp(info.mesh.morphTargetInfluences[info.index], targetValue, delta * 5.0);
            }
        });
    });

    // Lip Sync
    const visemeKeys = Object.keys(visemes);
    if (visemeKeys.length > 0) {
        let intensity = (isSpeaking && getAudioVolume) ? Math.pow(getAudioVolume(), 0.7) * 2.0 : 0;
        lipSyncState.current.targetIntensity = MathUtils.lerp(lipSyncState.current.targetIntensity, Math.min(intensity, 1.2), delta * 25.0);
        if (lipSyncState.current.targetIntensity > 0.05) {
            if (now - lipSyncState.current.lastVisemeChangeTime > 0.07) {
                lipSyncState.current.currentVisemeIndex = Math.floor(Math.random() * visemeKeys.length);
                lipSyncState.current.lastVisemeChangeTime = now;
            }
        } else { lipSyncState.current.currentVisemeIndex = -1; }
        visemeKeys.forEach((key, index) => {
            const targetVal = (index === lipSyncState.current.currentVisemeIndex) ? lipSyncState.current.targetIntensity : 0;
            visemes[key].forEach(info => {
              if (info.mesh.morphTargetInfluences) info.mesh.morphTargetInfluences[info.index] = MathUtils.lerp(info.mesh.morphTargetInfluences[info.index], targetVal, delta * 30);
            });
        });
    }

    // Procedural movement (Neck/Head focus)
    if (headBone && neckBone) {
        const initHead = initialBoneRotations.current.get(headBone.uuid)!;
        const initNeck = initialBoneRotations.current.get(neckBone.uuid)!;
        let targetHead = initHead.clone();
        let targetNeck = initNeck.clone();

        if (gestureState.current.activeProcedural) {
            const el = now - gestureState.current.startTime;
            if (el > 1.2) { gestureState.current.activeProcedural = null; gestureState.current.isPlaying = false; }
            else {
                if (gestureState.current.activeProcedural === 'nod') targetHead.x += Math.sin(el * 12) * 0.2;
                else if (gestureState.current.activeProcedural === 'shake') targetHead.y += Math.sin(el * 12) * 0.3;
            }
        } else {
            // Mouse tracking
            targetHead.y += mouseRef.current.x * 0.15;
            targetHead.x -= mouseRef.current.y * 0.1;
            targetNeck.y += mouseRef.current.x * 0.05;
            
            // Micro-movements
            targetHead.x += Math.sin(now * 1.5) * 0.02;
            targetHead.y += Math.cos(now * 1.2) * 0.02;
        }

        headBone.rotation.x = MathUtils.lerp(headBone.rotation.x, targetHead.x, delta * 5);
        headBone.rotation.y = MathUtils.lerp(headBone.rotation.y, targetHead.y, delta * 5);
        neckBone.rotation.y = MathUtils.lerp(neckBone.rotation.y, targetNeck.y, delta * 5);
    }

    // Ocular
    if (leftEyeBone && rightEyeBone) {
        if (now > eyeDartState.current.nextTime) {
            eyeDartState.current.target.set((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.15);
            eyeDartState.current.nextTime = now + 1.5 + Math.random() * 3;
        }
        const initialL = initialBoneRotations.current.get(leftEyeBone.uuid)!;
        leftEyeBone.rotation.y = MathUtils.lerp(leftEyeBone.rotation.y, initialL.y + eyeDartState.current.target.x + mouseRef.current.x * 0.2, delta * 8);
        leftEyeBone.rotation.x = MathUtils.lerp(leftEyeBone.rotation.x, initialL.x + eyeDartState.current.target.y - mouseRef.current.y * 0.1, delta * 8);
        rightEyeBone.rotation.y = MathUtils.lerp(rightEyeBone.rotation.y, initialL.y + eyeDartState.current.target.x + mouseRef.current.x * 0.2, delta * 8);
        rightEyeBone.rotation.x = MathUtils.lerp(rightEyeBone.rotation.x, initialL.x + eyeDartState.current.target.y - mouseRef.current.y * 0.1, delta * 8);
    }
  });

  return <primitive object={scene} position={[0, -1.55, 0]} />;
};

export const Avatar: React.FC<ModelProps> = ({ modelUrl, isSpeaking, currentGesture, currentEmotion, getAudioVolume }) => {
  return (
    <Canvas camera={{ position: [0, 0, 1.6], fov: 40 }} shadows className="w-full h-full">
      <ambientLight intensity={1.0} />
      <spotLight position={[5, 5, 5]} intensity={2.5} penumbra={1} angle={0.3} castShadow />
      <pointLight position={[-2, 1, 2]} intensity={1.5} color="#a855f7" />
      <directionalLight position={[0, 2, -2]} intensity={0.5} />
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
        target={[0, 0.05, 0]} 
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2.1}
        maxPolarAngle={Math.PI / 1.9}
        minAzimuthAngle={-Math.PI / 20}
        maxAzimuthAngle={Math.PI / 20}
      />
    </Canvas>
  );
};
