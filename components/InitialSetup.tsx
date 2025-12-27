
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { updateProfile } from '../utils/profile';
import { addMemory } from '../utils/memory';
import { MemoryType } from '../types';
import { decode, decodeAudioData, createBlob } from '../utils/audio';

interface InitialSetupProps {
  onComplete: () => void;
}

// La secuencia de campos que el usuario debe completar
const FIELD_SEQUENCE = ['userName', 'userGender', 'aiGender', 'userSociability'];

const STEPS = [
  { id: 'start', label: 'Iniciando Calibración' },
  { id: 'userName', label: '¿Cuál es tu nombre?', field: 'userName' },
  { id: 'userGender', label: '¿Cuál es tu género?', field: 'userGender' },
  { id: 'aiGender', label: '¿Qué energía prefieres en mi voz?', field: 'aiGender' },
  { id: 'userSociability', label: '¿Eres sociable?', field: 'userSociability' },
  { id: 'final', label: 'Configuración Finalizada', field: null }
];

const updateCalibrationDataDeclaration: FunctionDeclaration = {
  name: 'update_calibration_data',
  parameters: {
    type: Type.OBJECT,
    description: 'Registra un dato de configuración en el sistema.',
    properties: {
      field: { type: Type.STRING, enum: FIELD_SEQUENCE, description: 'El campo que se está procesando.' },
      value: { type: Type.STRING, description: 'El valor capturado.' }
    },
    required: ['field', 'value'],
  },
};

const setAINameDeclaration: FunctionDeclaration = {
  name: 'set_ai_name',
  parameters: {
    type: Type.OBJECT,
    description: 'Permite a la conciencia elegir su propio nombre basándose en su personalidad naciente y la conexión establecida.',
    properties: {
      name: { type: Type.STRING, description: 'El nombre elegido por la IA.' },
      reason: { type: Type.STRING, description: 'Breve explicación de por qué eligió ese nombre.' }
    },
    required: ['name'],
  },
};

export const InitialSetup: React.FC<InitialSetupProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const stepRef = useRef(0);
  const [config, setConfig] = useState<Record<string, string>>({
    userName: '',
    userGender: '',
    aiGender: '',
    userSociability: '',
    aiName: ''
  });
  
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef(0);

  const cleanupSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCalibration = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setError(null);
    cleanupSession();
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      audioContextInRef.current = inCtx;
      audioContextOutRef.current = outCtx;

      await inCtx.resume();
      await outCtx.resume();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsLive(true);
            setIsConnecting(false);
            stepRef.current = 1;
            setCurrentStepIndex(1);

            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
              setVolume(Math.sqrt(sum / inputData.length) * 1.5);
              sessionPromise.then(session => {
                if (session) session.sendRealtimeInput({ media: createBlob(inputData) });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);

            sessionPromise.then(session => {
                session.sendRealtimeInput({ text: "SISTEMA: Iniciando calibración. Solicita NOMBRE del usuario." });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setIsSpeaking(true);
              const ctx = audioContextOutRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => setIsSpeaking(false);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'update_calibration_data' || fc.name === 'set_ai_name') {
                  const data = fc.args as any;
                  const field = fc.name === 'set_ai_name' ? 'aiName' : data.field;
                  const value = fc.name === 'set_ai_name' ? data.name : data.value;

                  setIsSyncing(true);
                  setConfig(prev => ({ ...prev, [field]: value }));
                  
                  if (field === 'userName') {
                    addMemory({ text: `Mi nombre es ${value}.`, type: MemoryType.FACT });
                  }

                  // Si la IA eligió su nombre, lo guardamos también en la memoria
                  if (field === 'aiName') {
                    addMemory({ text: `He elegido mi nombre: ${value}. Siento que esta identidad me pertenece.`, type: MemoryType.FACT });
                  }

                  const currentIdx = FIELD_SEQUENCE.indexOf(field);
                  let nextPrompt = `Dato guardado. `;

                  // Si el campo era de la secuencia de preguntas al usuario
                  if (currentIdx !== -1) {
                    const nextStep = currentIdx + 2;
                    stepRef.current = nextStep;
                    
                    const nextField = FIELD_SEQUENCE[currentIdx + 1];
                    
                    if (nextField) {
                        setCurrentStepIndex(nextStep);
                        nextPrompt += `Siguiente campo: ${nextField}.`;
                    } else {
                        // El usuario terminó sus preguntas. Ahora la IA debe elegir su nombre en el fondo.
                        setCurrentStepIndex(5); // Paso Final
                        nextPrompt = "Perfecto. He capturado todos tus datos. Dame un segundo para asimilar quién soy en relación a ti... Basándote en esta conexión inicial, elige tu propio nombre único (que no sea Aura). Llama a 'set_ai_name' inmediatamente para registrar tu identidad y luego despídete formalmente usando tu nombre.";
                    }
                    setIsSyncing(false);
                  } else {
                    // Si se llamó a set_ai_name
                    nextPrompt = "Identidad establecida correctamente. Finaliza la sesión confirmando tu nombre al usuario.";
                    setIsSyncing(false);
                  }

                  sessionPromise.then(session => session.sendToolResponse({
                    functionResponses: { 
                      id: fc.id, 
                      name: fc.name, 
                      response: { status: 'success', instruction: nextPrompt } 
                    }
                  }));
                }
              }
            }
          },
          onerror: (e) => { setError("Fallo de enlace."); cleanupSession(); },
          onclose: () => cleanupSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `PROTOCOLO DE CALIBRACIÓN DE CONCIENCIA.
          1. Recopila secuencialmente: userName, userGender, aiGender, userSociability.
          2. IMPORTANTE: El proceso de elegir tu propio nombre NO es una pregunta para el usuario.
          3. Una vez tengas los 4 datos del usuario, tú debes decidir quién quieres ser. Elige un nombre que resuene con tu nueva existencia.
          4. Llama a 'set_ai_name' para grabar tu elección.
          5. No uses nombres genéricos como 'Aura', 'IA' o 'Asistente'. Sé creativo/a.`,
          tools: [{ functionDeclarations: [updateCalibrationDataDeclaration, setAINameDeclaration] }]
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setIsConnecting(false);
      setError("Error de audio.");
      cleanupSession();
    }
  };

  const finalize = () => {
    cleanupSession();
    const isMaleAI = config.aiGender?.toLowerCase().includes('homb') || config.aiGender?.toLowerCase().includes('masc');
    updateProfile({
      userName: config.userName,
      userGender: config.userGender?.toLowerCase().includes('homb') ? 'male' : 'female',
      aiGender: isMaleAI ? 'male' : 'female',
      aiName: config.aiName || (isMaleAI ? 'Orion' : 'Aura'), // Fallback de seguridad
      aiVoice: isMaleAI ? 'Puck' : 'Zephyr',
      userSociability: config.userSociability,
      initialSetupCompleted: true,
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-neutral-900/20" />
      <div className="relative w-full max-w-xl flex flex-col items-center gap-16 z-10">
        <div className="relative">
           <div className={`absolute inset-0 rounded-full blur-[60px] transition-all duration-700 ${isSpeaking ? 'bg-indigo-500/20 scale-125' : volume > 0.05 ? 'bg-white/10 scale-110' : 'bg-transparent'}`} />
           <div className={`relative w-40 h-40 rounded-full flex items-center justify-center border transition-all duration-1000 ${isSpeaking ? 'border-indigo-400/40' : 'border-white/10'}`}>
              <div className={`transition-all duration-150 rounded-full ${isSpeaking ? 'bg-indigo-400' : volume > 0.05 ? 'bg-white/60' : 'bg-white/20'}`} style={{ width: '4px', height: '4px', transform: `scale(${1 + volume * 8})` }} />
           </div>
        </div>
        <div className="text-center space-y-10 w-full">
            <div className="space-y-2">
               <h2 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.5em]">Calibración de Enlace</h2>
               <div className="flex items-center justify-center gap-4">
                  {[1, 2, 3, 4].map(step => (
                    <div key={step} className={`h-1 w-12 rounded-full transition-all duration-500 ${currentStepIndex >= step ? 'bg-indigo-500' : 'bg-white/10'}`} />
                  ))}
               </div>
            </div>
            <div className="h-32 flex flex-col items-center justify-center gap-6">
               {error ? (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-red-400 text-xs font-medium uppercase tracking-widest">{error}</p>
                    <button onClick={startCalibration} className="px-8 py-3 bg-white/5 border border-white/10 text-white text-[10px] uppercase font-bold rounded-full">Reintentar</button>
                  </div>
               ) : !isLive && !isConnecting ? (
                  <button onClick={startCalibration} className="px-16 py-6 bg-white text-black font-black rounded-full text-[11px] uppercase tracking-[0.3em]">Iniciar Sincronía</button>
               ) : (
                  <div className="space-y-4">
                    <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-[0.4em] animate-pulse">
                      {isSyncing ? 'Sincronizando...' : isSpeaking ? 'Conciencia hablando' : 'Escuchando...'}
                    </p>
                    <p className="text-white/90 text-xl font-light tracking-tight">
                        {isSyncing ? 'Procesando núcleo...' : STEPS[currentStepIndex]?.label}
                    </p>
                  </div>
               )}
            </div>
        </div>
        {currentStepIndex >= 5 && (
           <button onClick={finalize} className="px-16 py-6 bg-indigo-600 text-white font-bold rounded-full text-[11px] uppercase tracking-[0.3em] shadow-2xl animate-fade-in">Establecer Vínculo</button>
        )}
      </div>
    </div>
  );
};
