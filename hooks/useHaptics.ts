
import { useCallback } from 'react';

export const useHaptics = () => {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn('Vibración no soportada o bloqueada por el sistema.');
      }
    }
  }, []);

  const pulseEmpathy = useCallback((intensity: number) => {
    // intensidad de 0 a 1
    if (intensity > 0.1) {
      vibrate(Math.min(20, intensity * 40));
    }
  }, [vibrate]);

  const notifyEmotion = useCallback((emotion: string) => {
    switch (emotion) {
      case 'happy': vibrate([30, 50, 30]); break;
      case 'sad': vibrate(50); break;
      case 'angry': vibrate([100, 30, 100]); break;
      case 'surprised': vibrate([10, 10, 10, 10, 50]); break;
      default: break;
    }
  }, [vibrate]);

  return { vibrate, pulseEmpathy, notifyEmotion };
};
