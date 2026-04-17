import type { ProColumns } from '@ant-design/pro-components';
import type { TerminalRecord } from '@/api/terminal';
import type { TerminalFilterState } from './types';

export const TERMINAL_TYPE_ENUM = {
  POS: { text: 'POS-收银机' },
  MPOS: { text: 'MPOS-手持POS' },
  KIOSK: { text: 'KIOSK-自助收银机' },
  MOBILE: { text: 'MOBILE-移动端' },
  PC: { text: 'PC-PC端' },
} as const;

export const TERMINAL_STATE_ENUM = {
  0: { text: '禁用', status: 'Default' },
  1: { text: '启用', status: 'Success' },
} as const;

export const TERMINAL_TYPE_OPTIONS = [
  { label: 'POS-收银机', value: 'POS' },
  { label: 'MPOS-手持POS', value: 'MPOS' },
  { label: 'KIOSK-自助收银机', value: 'KIOSK' },
  { label: 'MOBILE-移动端', value: 'MOBILE' },
  { label: 'PC-PC端', value: 'PC' },
];

export const TERMINAL_STATE_OPTIONS = [
  { label: '禁用', value: '0' },
  { label: '启用', value: '1' },
];

export const DEFAULT_TERMINAL_FILTERS: TerminalFilterState = {
  sn: '',
  brandCode: '',
  model: '',
  osCode: '',
  osVersion: '',
  clientVersion: '',
  remark: '',
  state: undefined,
  type: undefined,
  currentIp: '',
};

export const TERMINAL_COLUMNS: ProColumns<TerminalRecord>[] = [
  {
    title: '终端编号',
    dataIndex: 'sn',
    ellipsis: true,
    width: 180,
  },
  {
    title: '品牌编码',
    dataIndex: 'brandCode',
    ellipsis: true,
    width: 140,
  },
  {
    title: '型号',
    dataIndex: 'model',
    ellipsis: true,
    width: 180,
  },
  {
    title: '系统编码',
    dataIndex: 'osCode',
    ellipsis: true,
    width: 140,
  },
  {
    title: '系统版本',
    dataIndex: 'osVersion',
    ellipsis: true,
    width: 140,
  },
  {
    title: '客户端版本',
    dataIndex: 'clientVersion',
    ellipsis: true,
    width: 160,
  },
  {
    title: '终端类型',
    dataIndex: 'type',
    valueType: 'select',
    valueEnum: TERMINAL_TYPE_ENUM,
    ellipsis: true,
    width: 180,
  },
  {
    title: '状态',
    dataIndex: 'state',
    valueType: 'select',
    valueEnum: TERMINAL_STATE_ENUM,
    width: 120,
  },
  {
    title: '当前 IP',
    dataIndex: 'currentIp',
    ellipsis: true,
    width: 160,
  },
  {
    title: '备注',
    dataIndex: 'remark',
    ellipsis: true,
    width: 220,
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    valueType: 'dateTime',
    search: false,
    width: 180,
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    valueType: 'dateTime',
    search: false,
    width: 180,
  },
];
