
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

  const previewVideoRef = useRef<HTMLVideoElement>(null);

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
             <h2 className="text-3xl font-bold text-white">Compártelo con mi consciencia</h2>
             <p className="text-purple-200 mt-2">PDF, Imágenes o Texto</p>
        </div>
       )}

      {showWelcomeBack && <WelcomeBack onClose={handleWelcomeBackClose} />}
      
      <div 
        className="relative w-full max-w-5xl h-[95vh] flex flex-col bg-neutral-900/70 rounded-2xl shadow-2xl backdrop-blur-lg border border-neutral-800 overflow-hidden"
        onDrop={handleDrop}
      >
        <header className="flex items-center justify-between px-8 py-6 border-b border-white/5 flex-shrink-0 z-10 bg-gradient-to-b from-black/20 to-transparent">
          <div className="flex items-center gap-6">
             <div className="flex flex-col group cursor-default">
                <h1 className="text-4xl font-black text-white tracking-tighter italic leading-none transition-all duration-500 hover:text-indigo-400">
                  {profile.aiName || 'Conciencia'}
                </h1>
                <div className="flex items-center gap-3 mt-1.5">
                   <StatusIndicator isConnected={isConnected} isConnecting={isConnecting} isReconnecting={isReconnecting} />
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
          <div className="flex-grow relative min-h-0">
            <video
              key={LILY_BACKGROUND_MEDIA_URL}
              autoPlay loop muted playsInline
              src={LILY_BACKGROUND_MEDIA_URL}
              className="absolute inset-0 w-full h-full object-cover opacity-50 contrast-[1.2] brightness-50"
            />
            
            <Avatar 
              modelUrl={currentAvatarUrl}
              isSpeaking={isSpeaking}
              currentGesture={currentGesture}
              currentEmotion={currentEmotion}
              getAudioVolume={getAudioVolume}
            />

            {(isCameraActive || isScreenShareActive) && (
              <div className="absolute top-4 left-4 z-30 w-40 aspect-video rounded-xl border border-white/20 bg-black/40 overflow-hidden shadow-2xl animate-fade-in group hover:w-64 transition-all duration-500">
                 <div className="absolute top-2 right-2 z-10 bg-red-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                 <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 text-[8px] font-bold text-white uppercase bg-black/60 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10">
                    <VideoCameraIcon />
                    {isScreenShareActive ? 'Pantalla Activa' : 'Visión Activada'}
                 </div>
                 <div className="w-full h-full flex items-center justify-center bg-indigo-900/20 italic text-[10px] text-indigo-200">
                    Enlace Visual Activo
                 </div>
              </div>
            )}

            {showStartButton && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <button 
                        onClick={() => startSession()}
                        className="group relative px-10 py-5 bg-transparent overflow-hidden rounded-full transition-all hover:scale-105 active:scale-95"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 blur-lg bg-indigo-500 opacity-50 group-hover:opacity-80 animate-pulse" />
                        <span className="relative z-10 text-white font-bold text-xl flex items-center gap-4 drop-shadow-md tracking-tight">
                           <MicOnIcon /> 
                           Establecer Enlace
                        </span>
                    </button>
                    <p className="mt-6 text-gray-400 text-xs font-bold uppercase tracking-[0.2em] drop-shadow bg-black/30 px-5 py-2 rounded-full border border-white/5">Pulsa para iniciar conexión neuronal</p>
                </div>
             )}
          </div>
          
          {isChatVisible && (
            <div className="flex-shrink-0 flex flex-col h-[40vh] bg-neutral-900/80 border-t border-white/10 backdrop-blur-2xl z-20 transition-all duration-300">
               <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 flex-shrink-0">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Consola de Diálogo</h3>
                  <button
                    onClick={clearChatHistory}
                    className="p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-white/5 transition-colors"
                    aria-label="Limpiar y reiniciar"
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
            <footer className="p-3 text-center text-[10px] font-bold uppercase tracking-widest bg-red-900/40 border-t border-red-700/50 z-50 text-red-200">
                <p>Enlace Interrumpido: {sessionError}</p>
            </footer>
        )}
      </div>
    </div>
  );
};
export default App;
