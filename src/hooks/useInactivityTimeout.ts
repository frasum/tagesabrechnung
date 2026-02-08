import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useInactivityTimeout() {
  const { user, isLocked, lockSession } = useAuth();
  const timerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    
    if (user && !isLocked) {
      timerRef.current = window.setTimeout(() => {
        lockSession();
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [user, isLocked, lockSession]);

  useEffect(() => {
    // Don't track if no user or already locked
    if (!user || isLocked) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Events that count as activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    
    // Throttle mousemove to avoid excessive updates
    let lastMoveTime = 0;
    const handleActivity = (event: Event) => {
      if (event.type === 'mousemove') {
        const now = Date.now();
        if (now - lastMoveTime < 5000) return; // Only update every 5s for mousemove
        lastMoveTime = now;
      }
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [user, isLocked, resetTimer]);

  return { lastActivity: lastActivityRef.current };
}
