import React from 'react';
import {
  isMenuHoverAutoOpenSuppressed,
  resumeMenuHoverAutoOpen,
} from '@/utils/menuHover';

type UseSplitMenuHoverIntentOptions = {
  hoverOpen: boolean;
  activeHoverKey: string;
  onIntentOpen: (topKey?: string) => void;
  clearCloseTimer: () => void;
  clearCloseCleanupTimer?: () => void;
};

const INITIAL_OPEN_DELAY = 90;
const SWITCH_OPEN_DELAY = 120;

export function useSplitMenuHoverIntent({
  hoverOpen,
  activeHoverKey,
  onIntentOpen,
  clearCloseTimer,
  clearCloseCleanupTimer,
}: UseSplitMenuHoverIntentOptions) {
  const intentTimerRef = React.useRef<number | null>(null);
  const clearHoverIntent = React.useCallback(() => {
    if (intentTimerRef.current !== null) {
      window.clearTimeout(intentTimerRef.current);
      intentTimerRef.current = null;
    }
  }, []);

  const queueHoverIntent = React.useCallback(
    (topKey?: string, fromPointerMove = false) => {
      if (!topKey) {
        clearHoverIntent();
        return;
      }

      if (fromPointerMove) {
        resumeMenuHoverAutoOpen();
      }

      if (isMenuHoverAutoOpenSuppressed()) {
        clearHoverIntent();
        return;
      }

      clearCloseTimer();
      clearCloseCleanupTimer?.();

      if (hoverOpen && activeHoverKey === topKey) {
        clearHoverIntent();
        return;
      }

      clearHoverIntent();
      intentTimerRef.current = window.setTimeout(
        () => {
          intentTimerRef.current = null;
          if (isMenuHoverAutoOpenSuppressed()) {
            return;
          }
          onIntentOpen(topKey);
        },
        hoverOpen ? SWITCH_OPEN_DELAY : INITIAL_OPEN_DELAY,
      );
    },
    [
      activeHoverKey,
      clearCloseCleanupTimer,
      clearCloseTimer,
      clearHoverIntent,
      hoverOpen,
      onIntentOpen,
    ],
  );

  React.useEffect(() => {
    return () => {
      clearHoverIntent();
    };
  }, [clearHoverIntent]);

  return {
    clearHoverIntent,
    queueHoverIntent,
  };
}
