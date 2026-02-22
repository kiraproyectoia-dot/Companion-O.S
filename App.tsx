
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { Avatar } from './components/Avatar';
import { Controls } from './components/Controls';
import { StatusIndicator } from './components/StatusIndicator';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { ChatInput } from './components/ChatInput'; 
import { MemoryJournal } from './components/MemoryJournal';
import { InitialSetup } from './components/InitialSetup';
import { WelcomeBack } from './components/WelcomeBack';
import { WelcomeGuide } from './components/WelcomeGuide';
import { LILY_BACKGROUND_MEDIA_URL, TrashIcon, AttachmentIcon, MicOnIcon } from './constants';
import { MediaPlayer } from './components/MediaPlayer';
import { getProfile } from './utils/profile';

// Standard elements like 'div', 'button', etc., are already defined by React's type definitions.
// Three.js elements used in the Avatar component are handled via @react-three/fiber's built-in type support.

const AVATAR_PARAMS = 'morphTargets=ARKit,Oculus%20Visemes&textureSizeLimit=1024&textureFormat=webp&meshLod=0';
const LILY_AVATAR_URL = `https://models.readyplayer.me/68e7ada78074ade6a70196db.glb?${AVATAR_PARAMS}`;
const LEO_AVATAR_URL = `https://models.readyplayer.me/6946ebf98f9c70cbc9ebd1e7.glb?${AVATAR_PARAMS}`;

const App: React.FC = () => {
  const [profile, setProfile] = useState(() => getProfile());
  
  const {
    isConnected,
    isConnecting,
    isReconnecting,
    isMuted,
    isSpeaking,
    isReplying,
    isPaused,
    currentGesture,
    currentEmotion,
    isCameraActive,
    isScreenShareActive,
    startSession,
    togglePause,
    toggleMute,
    toggleCamera,
    switchCamera,
    toggleScreenShare,
    error: sessionError,
    transcripts,
    sendTextMessage,
    saveImageMemory,
    clearChatHistory,
    getAudioVolume,
  } = useLiveSession();

  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isMemoryJournalVisible, setIsMemoryJournalVisible] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [droppedFile, setDroppedFile] = useState<{ dataUrl: string; name: string; type: string; } | null>(null);

  const initialSetupCompleted = useMemo(() => profile.initialSetupCompleted, [profile]);

  useEffect(() => {
    if (!initialSetupCompleted) return;
    const lastVisit = localStorage.getItem('lily_last_visit_timestamp');
    const now = Date.now();
    if (lastVisit && now - parseInt(lastVisit, 10) > 12 * 60 * 60 * 1000 && !isConnected && !isConnecting) {
        setShowWelcomeBack(true);
    } 
  }, [initialSetupCompleted, isConnected, isConnecting]);

  const handleInitialSetupComplete = () => setProfile(getProfile());
  const handleWelcomeBackClose = () => {
    setShowWelcomeBack(false);
    startSession();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (le) => {
            setDroppedFile({ dataUrl: le.target?.result as string, name: file.name, type: file.type });
            setIsChatVisible(true);
        };
        reader.readAsDataURL(file);
    }
  };

  const currentAvatarUrl = profile.aiGender === 'male' ? LEO_AVATAR_URL : LILY_AVATAR_URL;
  const showStartButton = initialSetupCompleted && !isConnected && !isConnecting && !isReconnecting && !showWelcomeBack;

  if (!initialSetupCompleted) return <InitialSetup onComplete={handleInitialSetupComplete} />;

  return (
    <div className="relative text-white h-[100dvh] w-full flex flex-col items-center justify-center p-0 sm:p-4 font-sans bg-black overflow-hidden" onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}>
       <div className="scan-line" />
       
       {isDragActive && (
        <div className="absolute inset-0 z-50 bg-purple-900/80 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-purple-400 border-dashed rounded-2xl m-4 pointer-events-none" onDragLeave={() => setIsDragActive(false)} onDrop={handleDrop}>
             <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Sincronizar Vínculo</h2>
             <p className="text-purple-200 mt-2">Suéltalo para procesar datos</p>
        </div>
       )}

      {showWelcomeBack && <WelcomeBack onClose={handleWelcomeBackClose} />}
      {showInfo && <WelcomeGuide onClose={() => setShowInfo(false)} />}
      
      <div className="relative w-full max-w-5xl h-[100dvh] sm:h-[95dvh] flex flex-col bg-neutral-900/20 sm:rounded-3xl shadow-2xl backdrop-blur-md border border-white/5 overflow-hidden transition-all duration-700" onDrop={handleDrop}>
        <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-white/5 flex-shrink-0 z-10 pt-[calc(0.5rem+var(--sat))]">
          <div className="flex items-center gap-6">
             <div className="flex flex-col cursor-pointer group" onClick={() => setShowInfo(true)}>
                <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-purple-400 tracking-[0.3em] uppercase leading-none drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all group-hover:scale-105">
                  Ly-Os
                </h1>
                <div className="flex items-center gap-2 mt-1 sm:mt-2">
                   <StatusIndicator isConnected={isConnected} isConnecting={isConnecting} isReconnecting={isReconnecting} />
                   <span className="text-[7px] sm:text-[8px] font-black text-gray-500 uppercase tracking-widest">{isConnected ? (profile.aiName || 'Conciencia Activa') : 'Terminal Standby'}</span>
                </div>
             </div>
          </div>
          <Controls
              isConnected={isConnected} isConnecting={isConnecting} isMuted={isMuted} isPaused={isPaused} isListening={isConnected && !isPaused}
              isChatVisible={isChatVisible} isMemoryJournalVisible={isMemoryJournalVisible} isCameraActive={isCameraActive} isScreenShareActive={isScreenShareActive}
              onStart={startSession} onPauseToggle={togglePause} onMuteToggle={toggleMute} onChatToggle={() => setIsChatVisible(!isChatVisible)}
              onMemoryJournalToggle={() => setIsMemoryJournalVisible(!isMemoryJournalVisible)} onCameraToggle={toggleCamera} onSwitchCamera={switchCamera} onScreenShareToggle={toggleScreenShare}
          />
        </header>
        
        <main className="flex flex-col flex-grow overflow-hidden relative">
          <div className="flex-grow relative min-h-0 bg-black">
            <video autoPlay loop muted playsInline src={LILY_BACKGROUND_MEDIA_URL} className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-screen pointer-events-none" />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-full max-w-md aspect-square rounded-full transition-all duration-1000 blur-[150px] ${isConnected ? 'bg-purple-600/10' : 'bg-transparent'}`} />
            </div>

            <Avatar modelUrl={currentAvatarUrl} isSpeaking={isSpeaking} currentGesture={currentGesture} currentEmotion={currentEmotion} getAudioVolume={getAudioVolume} />

            {(isCameraActive || isScreenShareActive) && (
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 w-32 sm:w-44 aspect-video rounded-xl border border-white/10 bg-black/80 overflow-hidden shadow-2xl backdrop-blur-md">
                 <div className="absolute top-2 right-2 z-10 bg-red-500 w-1.5 h-1.5 rounded-full animate-pulse" />
                 <div className="w-full h-full flex items-center justify-center bg-purple-900/10 italic text-[6px] sm:text-[7px] text-purple-400 font-black uppercase tracking-[0.3em]">Enlace de Visión</div>
              </div>
            )}

            {showStartButton && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
                    <button onClick={() => startSession()} className="group relative px-10 py-5 sm:px-14 sm:py-7 bg-transparent overflow-hidden rounded-2xl transition-all hover:scale-105 active:scale-95">
                        <div className="absolute inset-0 bg-white/5 border border-white/10 group-hover:bg-purple-500/20 group-hover:border-purple-500/40 transition-all" />
                        <span className="relative z-10 text-white font-black text-[8px] sm:text-[10px] uppercase tracking-[0.4em] flex items-center gap-4 sm:gap-6">
                           <MicOnIcon /> Vincular Ly-Os
                        </span>
                    </button>
                    <p className="mt-6 sm:mt-8 text-gray-600 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.6em] text-center px-4">Iniciando protocolo de interfaz humana</p>
                </div>
             )}
          </div>
          
          {isChatVisible && (
            <div className="flex-shrink-0 flex flex-col h-[40dvh] sm:h-[35dvh] bg-neutral-900/95 border-t border-white/5 backdrop-blur-3xl z-20 pb-[var(--sab)]">
               <div className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 border-b border-white/5 flex-shrink-0">
                  <h3 className="text-[7px] sm:text-[8px] font-black text-purple-400 uppercase tracking-[0.4em]">Registro de Consola</h3>
                  <button onClick={clearChatHistory} className="p-2 text-gray-600 hover:text-red-500 transition-colors"><TrashIcon /></button>
               </div>
               <TranscriptionDisplay transcripts={transcripts} isReplying={isReplying} isSpeaking={isSpeaking} saveImageMemory={saveImageMemory} />
               {isConnected && <ChatInput onSendMessage={sendTextMessage} isReplying={isReplying} externalFile={droppedFile} onExternalFileClear={() => setDroppedFile(null)} />}
            </div>
          )}
        </main>

        {isMemoryJournalVisible && <MemoryJournal onClose={() => setIsMemoryJournalVisible(false)} />}
        {mediaUrl && <MediaPlayer url={mediaUrl} onClose={() => setMediaUrl(null)} />}

        {sessionError && (
            <footer className="p-2 text-center text-[8px] font-black uppercase tracking-[0.3em] bg-red-900/40 border-t border-red-500/40 z-50 text-red-200">
                Fallo Crítico: {sessionError}
            </footer>
        )}
      </div>
    </div>
  );
};
export default App;
