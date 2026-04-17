import type { EditorStateModel } from '../types';

export function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function clampCodeTextOffset(
  nextOffset: number,
  nextState: Pick<EditorStateModel, 'canvasHeight' | 'qrcode' | 'codeText'>,
) {
  const minOffset = -Math.max(0, nextState.qrcode.size - 24);
  const rawMaxOffset =
    nextState.canvasHeight -
    (nextState.qrcode.y + nextState.qrcode.size) -
    nextState.codeText.fontSize -
    10;
  const maxOffset = Math.max(minOffset, rawMaxOffset);
  return clamp(nextOffset, minOffset, maxOffset);
}
