import type { TerminalPageQueryParams } from '@/api/terminal';

export type TerminalFilterState = {
  sn: string;
  brandCode: string;
  model: string;
  osCode: string;
  osVersion: string;
  clientVersion: string;
  remark: string;
  state?: string;
  type?: TerminalPageQueryParams['type'];
  currentIp: string;
};
