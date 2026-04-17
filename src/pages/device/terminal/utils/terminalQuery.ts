import type { TerminalPageQueryParams } from '@/api/terminal';
import type { TerminalFilterState } from '../types';

export type TerminalRequestParams = Partial<TerminalFilterState> & {
  current?: number;
  pageSize?: number;
};

export function normalizeText(value?: string) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

export function normalizeState(value?: string | number) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const nextValue = Number(value);
  return Number.isNaN(nextValue) ? undefined : nextValue;
}

export function buildTerminalPageQueryParams(
  params: TerminalRequestParams,
): TerminalPageQueryParams {
  return {
    current: Number(params.current || 1),
    pageSize: Number(params.pageSize || 10),
    sn: normalizeText(params.sn),
    brandCode: normalizeText(params.brandCode),
    model: normalizeText(params.model),
    osCode: normalizeText(params.osCode),
    osVersion: normalizeText(params.osVersion),
    clientVersion: normalizeText(params.clientVersion),
    remark: normalizeText(params.remark),
    state: normalizeState(params.state),
    type: normalizeText(params.type) as TerminalPageQueryParams['type'],
    currentIp: normalizeText(params.currentIp),
  };
}
