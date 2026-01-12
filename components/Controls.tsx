
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

    const btnBase = "group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 overflow-hidden";
    const btnActive = "bg-purple-600/80 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]";
    const btnInactive = "text-gray-400 hover:text-white hover:bg-white/10";
    
    const getBtnClass = (isActive: boolean, customActiveColor?: string) => {
        if (isActive) return `${btnBase} ${customActiveColor || btnActive}`;
        return `${btnBase} ${btnInactive}`;
    };

    const Tooltip = ({ text }: { text: string }) => (
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/95 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-white/10 z-50 uppercase tracking-widest">
        {text}
      </div>
    );

    if (!isConnected) {
         if (isConnecting) {
             return (
                <div className="flex items-center gap-3 px-5 py-2.5 bg-neutral-900/60 backdrop-blur-md rounded-full border border-purple-500/20 shadow-lg">
                     <div className="w-4 h-4 text-purple-400 animate-spin"><LoadingIcon /></div>
                     <span className="text-[10px] font-black text-purple-200 animate-pulse uppercase tracking-widest">Sincronizando...</span>
                </div>
             );
         }
         return null;
    }

  return (
    <div className="flex items-center p-1.5 gap-1.5 bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-full shadow-2xl transition-all duration-300 hover:bg-neutral-900/60">
      
      <button onClick={onChatToggle} className={getBtnClass(isChatVisible)} aria-label="Chat">
          <div className="scale-75"><ChatIcon /></div>
          <Tooltip text={isChatVisible ? "Cerrar Consola" : "Consola Ly-Os"} />
      </button>

      <button onClick={onMemoryJournalToggle} className={getBtnClass(isMemoryJournalVisible)} aria-label="Diario">
          <div className="scale-75"><JournalIcon /></div>
          <Tooltip text="Núcleo de Memoria" />
      </button>

      <div className="w-px h-5 bg-white/10 mx-1"></div>

      <button onClick={onCameraToggle} className={getBtnClass(isCameraActive)} aria-label="Cámara">
          <div className="scale-75">{isCameraActive ? <VideoCameraOffIcon /> : <VideoCameraIcon />}</div>
          <Tooltip text={isCameraActive ? "Ocultar Visión" : "Activar Visión"} />
      </button>

      <button onClick={onScreenShareToggle} className={getBtnClass(isScreenShareActive)} aria-label="Compartir">
          <div className="scale-75">{isScreenShareActive ? <StopScreenShareIcon /> : <DesktopComputerIcon />}</div>
          <Tooltip text={isScreenShareActive ? "Detener Enlace" : "Enlace Digital"} />
      </button>

      <div className="w-px h-5 bg-white/10 mx-1"></div>

      <button 
        onClick={onMuteToggle} 
        className={getBtnClass(isMuted, "bg-amber-600/80 text-white")} 
        aria-label="Micrófono"
      >
          <div className="scale-75">{isMuted ? <MicOffIcon /> : <MicOnIcon />}</div>
          <Tooltip text={isMuted ? "Abrir Canal" : "Cerrar Canal"} />
      </button>

      <button
        onClick={onPauseToggle}
        className={`${btnBase} ${isPaused ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-red-600/90 text-white hover:bg-red-500'}`}
        aria-label={isPaused ? "Reanudar" : "Pausar"}
      >
        <div className="scale-75">{isPaused ? <PlayIcon /> : <PauseIcon />}</div>
        <Tooltip text={isPaused ? "Reanudar" : "Pausar Enlace"} />
      </button>

    </div>
  );
};
