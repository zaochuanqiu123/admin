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
  getTopItemRect?: (topKey: string) => DOMRect | null;
  getHoverPanelRect?: () => DOMRect | null;
};

type HoverIntentPoint = {
  clientX: number;
  clientY: number;
  timeStamp?: number;
};

const INITIAL_OPEN_DELAY = 56;
const SWITCH_OPEN_DELAY = 16;
const MENU_SWITCH_DWELL_DELAY = 120;
const SAFE_CORRIDOR_PADDING = 12;
const SAFE_CORRIDOR_MIN_DELTA_X = 2;

function isPointInTriangle(
  point: HoverIntentPoint,
  a: HoverIntentPoint,
  b: HoverIntentPoint,
  c: HoverIntentPoint,
): boolean {
  const area =
    0.5 *
    (-b.clientY * c.clientX +
      a.clientY * (-b.clientX + c.clientX) +
      a.clientX * (b.clientY - c.clientY) +
      b.clientX * c.clientY);
  const sign = area < 0 ? -1 : 1;
  const s =
    (a.clientY * c.clientX -
      a.clientX * c.clientY +
      (c.clientY - a.clientY) * point.clientX +
      (a.clientX - c.clientX) * point.clientY) *
    sign;
  const t =
    (a.clientX * b.clientY -
      a.clientY * b.clientX +
      (a.clientY - b.clientY) * point.clientX +
      (b.clientX - a.clientX) * point.clientY) *
    sign;

  return s >= 0 && t >= 0 && s + t <= 2 * Math.abs(area);
}

function isPointInRect(
  point: HoverIntentPoint | null,
  rect: DOMRect | null,
  padding = 0,
): boolean {
  if (!point || !rect) return true;
  return (
    point.clientX >= rect.left - padding &&
    point.clientX <= rect.right + padding &&
    point.clientY >= rect.top - padding &&
    point.clientY <= rect.bottom + padding
  );
}

function isMovingThroughSafeCorridor({
  previousPoint,
  currentPoint,
  activeRect,
  panelRect,
}: {
  previousPoint: HoverIntentPoint | null;
  currentPoint: HoverIntentPoint;
  activeRect: DOMRect | null;
  panelRect: DOMRect | null;
}): boolean {
  if (!previousPoint || !activeRect || !panelRect) return false;
  if (
    currentPoint.clientX - previousPoint.clientX <
    SAFE_CORRIDOR_MIN_DELTA_X
  ) {
    return false;
  }

  const activationX = activeRect.left + activeRect.width * 0.45;
  if (currentPoint.clientX < activationX) return false;

  const panelEdgeX = panelRect.left - SAFE_CORRIDOR_PADDING;
  if (currentPoint.clientX > panelRect.right + SAFE_CORRIDOR_PADDING) {
    return false;
  }

  return isPointInTriangle(
    currentPoint,
    previousPoint,
    {
      clientX: panelEdgeX,
      clientY: panelRect.top - SAFE_CORRIDOR_PADDING,
    },
    {
      clientX: panelEdgeX,
      clientY: panelRect.bottom + SAFE_CORRIDOR_PADDING,
    },
  );
}

export function useSplitMenuHoverIntent({
  hoverOpen,
  activeHoverKey,
  onIntentOpen,
  clearCloseTimer,
  clearCloseCleanupTimer,
  getTopItemRect,
  getHoverPanelRect,
}: UseSplitMenuHoverIntentOptions) {
  const intentTimerRef = React.useRef<number | null>(null);
  const pendingIntentKeyRef = React.useRef<string | null>(null);
  const pendingIntentDelayRef = React.useRef<number | null>(null);
  const lastPointerRef = React.useRef<HoverIntentPoint | null>(null);
  const clearHoverIntent = React.useCallback(() => {
    if (intentTimerRef.current !== null) {
      window.clearTimeout(intentTimerRef.current);
      intentTimerRef.current = null;
    }
    pendingIntentKeyRef.current = null;
    pendingIntentDelayRef.current = null;
  }, []);

  const queueHoverIntent = React.useCallback(
    (topKey?: string, fromPointerMove = false, pointer?: HoverIntentPoint) => {
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

      const previousPoint = lastPointerRef.current;
      if (pointer) {
        lastPointerRef.current = pointer;
      }

      clearCloseTimer();
      clearCloseCleanupTimer?.();

      if (hoverOpen && activeHoverKey === topKey) {
        clearHoverIntent();
        return;
      }

      if (
        hoverOpen &&
        activeHoverKey &&
        activeHoverKey !== topKey &&
        pointer &&
        isMovingThroughSafeCorridor({
          previousPoint,
          currentPoint: pointer,
          activeRect: getTopItemRect?.(activeHoverKey) ?? null,
          panelRect: getHoverPanelRect?.() ?? null,
        })
      ) {
        clearHoverIntent();
        return;
      }

      const switchingTopMenu =
        hoverOpen && activeHoverKey && activeHoverKey !== topKey;
      const intentDelay = switchingTopMenu
        ? MENU_SWITCH_DWELL_DELAY
        : hoverOpen
          ? SWITCH_OPEN_DELAY
          : INITIAL_OPEN_DELAY;

      if (
        intentTimerRef.current !== null &&
        pendingIntentKeyRef.current === topKey &&
        (pendingIntentDelayRef.current ?? intentDelay) <= intentDelay
      ) {
        return;
      }

      clearHoverIntent();
      pendingIntentKeyRef.current = topKey;
      pendingIntentDelayRef.current = intentDelay;
      intentTimerRef.current = window.setTimeout(() => {
        intentTimerRef.current = null;
        pendingIntentKeyRef.current = null;
        pendingIntentDelayRef.current = null;
        if (isMenuHoverAutoOpenSuppressed()) {
          return;
        }
        if (
          !isPointInRect(
            lastPointerRef.current,
            getTopItemRect?.(topKey) ?? null,
            2,
          )
        ) {
          return;
        }
        onIntentOpen(topKey);
      }, intentDelay);
    },
    [
      activeHoverKey,
      clearCloseCleanupTimer,
      clearCloseTimer,
      clearHoverIntent,
      hoverOpen,
      getHoverPanelRect,
      getTopItemRect,
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
