
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
import { LILY_BACKGROUND_MEDIA_URL, TrashIcon, MicOnIcon } from './constants';
import { MediaPlayer } from './components/MediaPlayer';
import { getProfile } from './utils/profile';

// Global declaration to ensure standard HTML elements are recognized in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

const AVATAR_PARAMS = 'morphTargets=ARKit,Oculus%20Visemes&textureSizeLimit=1024&textureFormat=webp&meshLod=0';
const LILY_AVATAR_URL = `https://models.readyplayer.me/68e7ada78074ade6a70196db.glb?${AVATAR_PARAMS}`;
const LEO_AVATAR_URL = `https://models.readyplayer.me/6946ebf98f9c70cbc9ebd1e7.glb?${AVATAR_PARAMS}`;

const App: React.FC = () => {
  const [profile, setProfile] = useState(() => getProfile());
  const [initialSetupCompleted, setInitialSetupCompleted] = useState(profile.initialSetupCompleted);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isMemoryJournalVisible, setIsMemoryJournalVisible] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  const {
    isConnected, isConnecting, isReconnecting, isMuted, isSpeaking, isReplying, isPaused,
    currentGesture, currentEmotion, isCameraActive, isScreenShareActive,
    startSession, togglePause, toggleMute, toggleCamera, toggleScreenShare,
    error: sessionError, transcripts, sendTextMessage, clearChatHistory, getAudioVolume,
  } = useLiveSession();

  useEffect(() => {
    if (initialSetupCompleted && !isConnected && !isConnecting && !showWelcomeBack) {
      const lastVisit = localStorage.getItem('lily_last_visit_timestamp');
      if (lastVisit && Date.now() - parseInt(lastVisit) > 12 * 3600000) setShowWelcomeBack(true);
    }
  }, [initialSetupCompleted, isConnected, isConnecting]);

  const handleWelcomeBackClose = () => {
    setShowWelcomeBack(false);
    startSession();
  };

  const currentAvatarUrl = profile.aiGender === 'male' ? LEO_AVATAR_URL : LILY_AVATAR_URL;

  if (!initialSetupCompleted) return <InitialSetup onComplete={() => { setProfile(getProfile()); setInitialSetupCompleted(true); }} />;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col text-white font-sans">
      {showWelcomeBack && <WelcomeBack onClose={handleWelcomeBackClose} />}
      
      {/* Background Layer */}
      <video
        autoPlay loop muted playsInline
        src={LILY_BACKGROUND_MEDIA_URL}
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
      />

      {/* Header - Minimalista Play Store Style */}
      <header className="absolute top-0 left-0 right-0 z-50 p-6 flex items-center justify-between pointer-events-none">
        <div className="flex flex-col gap-1 pointer-events-auto">
          <h1 className="text-xl font-black tracking-[0.3em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-white">Ly-Os</h1>
          <div className="flex items-center gap-2">
            <StatusIndicator isConnected={isConnected} isConnecting={isConnecting} isReconnecting={isReconnecting} />
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{isConnected ? (profile.aiName || 'Sincronizada') : 'Offline'}</span>
          </div>
        </div>
        <div className="pointer-events-auto">
           <Controls
              isConnected={isConnected} isConnecting={isConnecting} isMuted={isMuted} isPaused={isPaused}
              isListening={isConnected && !isPaused} isChatVisible={isChatVisible}
              isMemoryJournalVisible={isMemoryJournalVisible} isCameraActive={isCameraActive}
              isScreenShareActive={isScreenShareActive} onStart={startSession}
              onPauseToggle={togglePause} onMuteToggle={toggleMute} onChatToggle={() => setIsChatVisible(!isChatVisible)}
              onMemoryJournalToggle={() => setIsMemoryJournalVisible(!isMemoryJournalVisible)}
              onCameraToggle={toggleCamera} onScreenShareToggle={toggleScreenShare}
          />
        </div>
      </header>

      {/* Main Avatar Section - THE TALKING HEAD */}
      <main className="relative flex-grow flex items-center justify-center">
        <div className="w-full h-full max-w-4xl max-h-4xl aspect-square relative">
            {/* Efecto de Pulso de Conciencia */}
            <div className={`absolute inset-0 rounded-full transition-all duration-1000 blur-[100px] ${isConnected ? 'bg-purple-600/10' : 'bg-transparent'}`} />
            
            <Avatar 
              modelUrl={currentAvatarUrl}
              isSpeaking={isSpeaking}
              currentGesture={currentGesture}
              currentEmotion={currentEmotion}
              getAudioVolume={getAudioVolume}
            />
        </div>

        {!isConnected && !isConnecting && !showWelcomeBack && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                <button 
                    onClick={startSession}
                    className="group relative px-10 py-5 bg-white/5 border border-white/20 rounded-2xl transition-all hover:bg-purple-500/10 active:scale-95"
                >
                    <span className="relative z-10 text-white font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-4">
                       <MicOnIcon /> Vincular Ly-Os
                    </span>
                </button>
            </div>
        )}
      </main>

      {/* Chat Overlay - Se desliza desde abajo */}
      <div className={`absolute inset-x-0 bottom-0 z-40 bg-black/90 backdrop-blur-2xl border-t border-white/5 transition-all duration-500 ease-in-out ${isChatVisible ? 'h-[45vh]' : 'h-0 opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col h-full">
              <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">Terminal de Datos</span>
                <button onClick={clearChatHistory} className="p-2 text-gray-500 hover:text-red-400 transition-colors"><TrashIcon /></button>
              </div>
              <TranscriptionDisplay transcripts={transcripts} isReplying={isReplying} isSpeaking={isSpeaking} saveImageMemory={() => {}} />
              <ChatInput onSendMessage={sendTextMessage} isReplying={isReplying} onExternalFileClear={() => {}} />
          </div>
      </div>

      {isMemoryJournalVisible && <MemoryJournal onClose={() => setIsMemoryJournalVisible(false)} />}
      {mediaUrl && <MediaPlayer url={mediaUrl} onClose={() => setMediaUrl(null)} />}

      {sessionError && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600/90 rounded-full text-[8px] font-bold uppercase tracking-widest z-[100] animate-bounce">
              Error de Sincronía: {sessionError}
          </div>
      )}
    </div>
  );
};

export default App;
