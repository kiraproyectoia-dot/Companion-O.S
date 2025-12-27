
import React from 'react';
import { MicOnIcon, MicOffIcon, LoadingIcon, ChatIcon, JournalIcon, PauseIcon, PlayIcon, VideoCameraIcon, VideoCameraOffIcon, DesktopComputerIcon, StopScreenShareIcon } from '../constants';

interface ControlsProps {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isPaused: boolean;
  isListening: boolean;
  isChatVisible: boolean;
  isMemoryJournalVisible: boolean;
  isCameraActive: boolean;
  isScreenShareActive: boolean;
  hideMainButton?: boolean;
  onStart: () => void;
  onPauseToggle: () => void;
  onMuteToggle: () => void;
  onChatToggle: () => void;
  onMemoryJournalToggle: () => void;
  onCameraToggle: () => void;
  onScreenShareToggle: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isConnected,
  isConnecting,
  isMuted,
  isPaused,
  isListening,
  isChatVisible,
  isMemoryJournalVisible,
  isCameraActive,
  isScreenShareActive,
  onPauseToggle,
  onMuteToggle,
  onChatToggle,
  onMemoryJournalToggle,
  onCameraToggle,
  onScreenShareToggle,
}) => {

    // Base classes for the new sleek mini-buttons
    const btnBase = "group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 overflow-hidden";
    const btnActive = "bg-purple-600/80 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]";
    const btnInactive = "text-gray-400 hover:text-white hover:bg-white/10";
    
    // Function to generate button classes dynamically
    const getBtnClass = (isActive: boolean, customActiveColor?: string) => {
        if (isActive) return `${btnBase} ${customActiveColor || btnActive}`;
        return `${btnBase} ${btnInactive}`;
    };

    // Helper for tooltips
    const Tooltip = ({ text }: { text: string }) => (
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-white/10 z-50">
        {text}
      </div>
    );

    if (!isConnected) {
         if (isConnecting) {
             return (
                <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900/60 backdrop-blur-md rounded-full border border-white/5 shadow-lg">
                     <div className="w-4 h-4 text-purple-400 animate-spin"><LoadingIcon /></div>
                     <span className="text-xs font-medium text-purple-200 animate-pulse">Conectando...</span>
                </div>
             );
         }
         return null;
    }

  return (
    <div className="flex items-center p-1.5 gap-1 bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl transition-all duration-300 hover:bg-neutral-900/80">
      
      {/* --- Tools Section --- */}
      <button onClick={onChatToggle} className={getBtnClass(isChatVisible)} aria-label="Chat">
          <div className="scale-75"><ChatIcon /></div>
          <Tooltip text={isChatVisible ? "Ocultar Chat" : "Chat"} />
      </button>

      <button onClick={onMemoryJournalToggle} className={getBtnClass(isMemoryJournalVisible)} aria-label="Diario">
          <div className="scale-75"><JournalIcon /></div>
          <Tooltip text="Diario" />
      </button>

      {/* Vertical Divider */}
      <div className="w-px h-5 bg-white/10 mx-1"></div>

      {/* --- Visuals Section --- */}
      <button onClick={onCameraToggle} className={getBtnClass(isCameraActive)} aria-label="Cámara">
          <div className="scale-75">{isCameraActive ? <VideoCameraOffIcon /> : <VideoCameraIcon />}</div>
          <Tooltip text={isCameraActive ? "Apagar Cámara" : "Cámara"} />
      </button>

      <button onClick={onScreenShareToggle} className={getBtnClass(isScreenShareActive)} aria-label="Compartir">
          <div className="scale-75">{isScreenShareActive ? <StopScreenShareIcon /> : <DesktopComputerIcon />}</div>
          <Tooltip text={isScreenShareActive ? "Dejar de compartir" : "Compartir"} />
      </button>

      {/* Vertical Divider */}
      <div className="w-px h-5 bg-white/10 mx-1"></div>

      {/* --- Audio & Control Section --- */}
      <button 
        onClick={onMuteToggle} 
        className={getBtnClass(isMuted, "bg-amber-600/80 text-white")} 
        aria-label="Micrófono"
      >
          <div className="scale-75">{isMuted ? <MicOffIcon /> : <MicOnIcon />}</div>
          <Tooltip text={isMuted ? "Activar Audio" : "Silenciar"} />
      </button>

      <button
        onClick={onPauseToggle}
        className={`${btnBase} ${isPaused ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-red-600/90 text-white hover:bg-red-500'}`}
        aria-label={isPaused ? "Reanudar" : "Pausar"}
      >
        <div className="scale-75">{isPaused ? <PlayIcon /> : <PauseIcon />}</div>
        <Tooltip text={isPaused ? "Reanudar" : "Pausar"} />
      </button>

    </div>
  );
};
