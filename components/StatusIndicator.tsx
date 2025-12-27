
import React from 'react';

interface StatusIndicatorProps {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isConnected, isConnecting, isReconnecting }) => {
  let color = 'bg-red-500/50 border border-red-500';
  let title = 'Desconectada';

  if (isReconnecting) {
    color = 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]';
    title = 'Reconectando';
  } else if (isConnecting) {
    color = 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]';
    title = 'Conectando';
  } else if (isConnected) {
    // Green with a soft glow
    color = 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]';
    title = 'Conectada';
  }

  return (
    <div 
      className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${color}`} 
      title={title}
      aria-label={title}
    />
  );
};
