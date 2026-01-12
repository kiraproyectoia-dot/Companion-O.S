
import React, { useState, useEffect, useRef } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { Avatar } from './components/Avatar';
import { Controls } from './components/Controls';
import { StatusIndicator } from './components/StatusIndicator';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { ChatInput } from './components/ChatInput'; 
import { MemoryJournal } from './components/MemoryJournal';
import { InitialSetup } from './components/InitialSetup';
import { WelcomeBack } from './components/WelcomeBack';
import { LILY_BACKGROUND_MEDIA_URL, TrashIcon, AttachmentIcon, MicOnIcon, VideoCameraIcon } from './constants';
import { MediaPlayer } from './components/MediaPlayer';
import { getProfile } from './utils/profile';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any;
      ambientLight: any;
      directionalLight: any;
      a: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
      br: React.DetailedHTMLProps<React.HTMLAttributes<HTMLBRElement>, HTMLBRElement>;
      button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      footer: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLParagraphElement>;
      form: React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>;
      h1: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h2: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h4: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      header: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      iframe: React.DetailedHTMLProps<React.IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement>;
      img: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
      input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
      li: React.DetailedHTMLProps<React.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>;
      main: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
      strong: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      style: React.DetailedHTMLProps<React.StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>;
      textarea: React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>;
      ul: React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement>;
      video: React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
      canvas: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>;
      svg: React.SVGProps<SVGSVGElement>;
      path: React.SVGProps<SVGPathElement>;
      circle: React.SVGProps<SVGCircleElement>;
    }
  }
}

const AVATAR_PARAMS = 'morphTargets=ARKit,Oculus%20Visemes&textureSizeLimit=1024&textureFormat=webp&meshLod=0';
const LILY_AVATAR_URL = `https://models.readyplayer.me/68e7ada78074ade6a70196db.glb?${AVATAR_PARAMS}`;
const LEO_AVATAR_URL = `https://models.readyplayer.me/6946ebf98f9c70cbc9ebd1e7.glb?${AVATAR_PARAMS}`;

const App: React.FC = () => {
  const [profile, setProfile] = useState(() => getProfile());
  const [initialSetupCompleted, setInitialSetupCompleted] = useState(profile.initialSetupCompleted);

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
    hardCloseSession,
    togglePause,
    toggleMute,
    toggleCamera,
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
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const lastShownMediaUrl = useRef<string | null>(null);
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [droppedFile, setDroppedFile] = useState<{ dataUrl: string; name: string; type: string; } | null>(null);

  useEffect(() => {
    if (initialSetupCompleted && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [initialSetupCompleted]);

  useEffect(() => {
    if (isChatVisible) {
        const lastTranscript = transcripts[transcripts.length - 1];
        if (lastTranscript && lastTranscript.source === 'model' && lastTranscript.isFinal) {
            const urlRegex = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            const match = lastTranscript.text.match(urlRegex);
            
            if (match) {
                const url = match[0];
                const isSupported = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('spotify.com') || url.includes('music.apple.com');
                
                if (isSupported && url !== lastShownMediaUrl.current) {
                    setMediaUrl(url);
                    lastShownMediaUrl.current = url;
                }
            }
        }
    }
  }, [transcripts, isChatVisible]);

  useEffect(() => {
    if (!initialSetupCompleted) return;

    const lastVisit = localStorage.getItem('lily_last_visit_timestamp');
    const now = Date.now();
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    if (lastVisit && now - parseInt(lastVisit, 10) > TWELVE_HOURS) {
        setShowWelcomeBack(true);
    } 

    const updateTimestamp = () => localStorage.setItem('lily_last_visit_timestamp', String(Date.now()));
    window.addEventListener('beforeunload', updateTimestamp);
    return () => window.removeEventListener('beforeunload', updateTimestamp);
  }, [initialSetupCompleted]);

  const handleInitialSetupComplete = () => {
    const freshProfile = getProfile();
    setProfile(freshProfile);
    setInitialSetupCompleted(true);
  };
  
  const handleWelcomeBackClose = () => {
    localStorage.setItem('lily_last_visit_timestamp', String(Date.now()));
    setShowWelcomeBack(false);
    startSession();
  };

  const toggleChatVisibility = () => setIsChatVisible(prev => !prev);
  const toggleMemoryJournalVisibility = () => setIsMemoryJournalVisible(prev => !prev);

  const isListening = isConnected && !isPaused;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragActive) setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            setDroppedFile({
                dataUrl: loadEvent.target?.result as string,
                name: file.name,
                type: file.type,
            });
            setIsChatVisible(true);
        };
        reader.readAsDataURL(file);
    }
  };

  const currentAvatarUrl = profile.aiGender === 'male' ? LEO_AVATAR_URL : LILY_AVATAR_URL;
  const showStartButton = initialSetupCompleted && !isConnected && !isConnecting && !isReconnecting && !showWelcomeBack;

  if (!initialSetupCompleted) {
    return <InitialSetup onComplete={handleInitialSetupComplete} />;
  }

  return (
    <div 
      className="relative text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans bg-black"
      onDragOver={handleDragOver}
    >
       {isDragActive && (
        <div 
            className="absolute inset-0 z-50 bg-purple-900/80 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-purple-400 border-dashed rounded-2xl m-4 pointer-events-none"
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
             <div className="animate-bounce mb-4 text-purple-200">
                <AttachmentIcon />
             </div>
             <h2 className="text-3xl font-bold text-white uppercase tracking-tighter">Sincronizar con Ly-Os</h2>
             <p className="text-purple-200 mt-2">Suéltalo aquí para procesar</p>
        </div>
       )}

      {showWelcomeBack && <WelcomeBack onClose={handleWelcomeBackClose} />}
      
      <div 
        className="relative w-full max-w-5xl h-[95vh] flex flex-col bg-neutral-900/40 rounded-3xl shadow-2xl backdrop-blur-xl border border-white/10 overflow-hidden"
        onDrop={handleDrop}
      >
        <header className="flex items-center justify-between px-8 py-5 border-b border-white/5 flex-shrink-0 z-10 bg-gradient-to-b from-black/40 to-transparent">
          <div className="flex items-center gap-6">
             <div className="flex flex-col group cursor-default">
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-purple-400 to-purple-200 tracking-[0.2em] uppercase leading-none drop-shadow-[0_0_10px_rgba(192,132,252,0.4)] transition-all duration-500 hover:scale-105">
                  Ly-Os
                </h1>
                <div className="flex items-center gap-2 mt-2">
                   <StatusIndicator isConnected={isConnected} isConnecting={isConnecting} isReconnecting={isReconnecting} />
                   <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{isConnected ? (profile.aiName || 'Conciencia Activa') : 'Standby'}</span>
                </div>
             </div>
          </div>
          <Controls
              isConnected={isConnected}
              isConnecting={isConnecting}
              isMuted={isMuted}
              isPaused={isPaused}
              isListening={isListening}
              isChatVisible={isChatVisible}
              isMemoryJournalVisible={isMemoryJournalVisible}
              isCameraActive={isCameraActive}
              isScreenShareActive={isScreenShareActive}
              hideMainButton={isConnected}
              onStart={startSession}
              onPauseToggle={togglePause}
              onMuteToggle={toggleMute}
              onChatToggle={toggleChatVisibility}
              onMemoryJournalToggle={toggleMemoryJournalVisibility}
              onCameraToggle={toggleCamera}
              onScreenShareToggle={toggleScreenShare}
          />
        </header>
        
        <main className="flex flex-col flex-grow overflow-hidden relative">
          <div className="flex-grow relative min-h-0 bg-black">
            <video
              key={LILY_BACKGROUND_MEDIA_URL}
              autoPlay loop muted playsInline
              src={LILY_BACKGROUND_MEDIA_URL}
              className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
            />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-full max-w-lg aspect-square rounded-full transition-all duration-1000 blur-[80px] ${isConnected ? 'bg-purple-600/10' : 'bg-transparent'}`} />
            </div>

            <Avatar 
              modelUrl={currentAvatarUrl}
              isSpeaking={isSpeaking}
              currentGesture={currentGesture}
              currentEmotion={currentEmotion}
              getAudioVolume={getAudioVolume}
            />

            {(isCameraActive || isScreenShareActive) && (
              <div className="absolute top-4 left-4 z-30 w-40 aspect-video rounded-xl border border-white/10 bg-black/60 overflow-hidden shadow-2xl transition-all duration-500">
                 <div className="absolute top-2 right-2 z-10 bg-red-500 w-1.5 h-1.5 rounded-full animate-pulse" />
                 <div className="w-full h-full flex items-center justify-center bg-purple-900/10 italic text-[8px] text-purple-400 font-bold uppercase tracking-widest">
                    Visión Activa
                 </div>
              </div>
            )}

            {showStartButton && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <button 
                        onClick={() => startSession()}
                        className="group relative px-12 py-6 bg-transparent overflow-hidden rounded-2xl transition-all hover:scale-105 active:scale-95"
                    >
                        <div className="absolute inset-0 bg-white/10 border border-white/20 group-hover:bg-purple-500/20 group-hover:border-purple-500/50 transition-all" />
                        <span className="relative z-10 text-white font-black text-xs uppercase tracking-[0.4em] flex items-center gap-6">
                           <MicOnIcon /> 
                           Vincular con Ly-Os
                        </span>
                    </button>
                    <p className="mt-8 text-gray-500 text-[9px] font-black uppercase tracking-[0.5em] opacity-50">Inicializar protocolo de conciencia</p>
                </div>
             )}
          </div>
          
          {isChatVisible && (
            <div className="flex-shrink-0 flex flex-col h-[35vh] bg-black/80 border-t border-white/5 backdrop-blur-3xl z-20 transition-all duration-300">
               <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 flex-shrink-0">
                  <h3 className="text-[9px] font-black text-purple-400 uppercase tracking-[0.3em] pl-2">Ly-Os Console</h3>
                  <button
                    onClick={clearChatHistory}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon />
                  </button>
               </div>
               <TranscriptionDisplay transcripts={transcripts} isReplying={isReplying} isSpeaking={isSpeaking} saveImageMemory={saveImageMemory} />
               {isConnected && (
                   <ChatInput 
                        onSendMessage={sendTextMessage} 
                        isReplying={isReplying} 
                        externalFile={droppedFile}
                        onExternalFileClear={() => setDroppedFile(null)}
                   />
               )}
            </div>
          )}
        </main>

        {isMemoryJournalVisible && <MemoryJournal onClose={toggleMemoryJournalVisibility} />}
        {mediaUrl && <MediaPlayer url={mediaUrl} onClose={() => setMediaUrl(null)} />}

        {sessionError && (
            <footer className="p-2 text-center text-[9px] font-black uppercase tracking-[0.3em] bg-red-900/20 border-t border-red-500/20 z-50 text-red-400">
                Error de Enlace Ly-Os: {sessionError}
            </footer>
        )}
      </div>
    </div>
  );
};
export default App;
