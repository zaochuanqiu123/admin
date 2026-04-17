import { Input, Select } from 'antd';
import { type Dispatch, type SetStateAction, useMemo } from 'react';
import { ExpandableFilterCard } from '@/components';
import { TERMINAL_STATE_OPTIONS, TERMINAL_TYPE_OPTIONS } from '../constants';
import type { TerminalFilterState } from '../types';

type TerminalFilterCardProps = {
  draftFilters: TerminalFilterState;
  setDraftFilters: Dispatch<SetStateAction<TerminalFilterState>>;
  onSearch: () => void;
  onReset: () => void;
};

function TerminalFilterCard({
  draftFilters,
  setDraftFilters,
  onSearch,
  onReset,
}: TerminalFilterCardProps) {
  const fields = useMemo(
    () => [
      {
        key: 'sn',
        label: '终端编号',
        content: (
          <Input
            allowClear
            placeholder="请输入"
            value={draftFilters.sn}
            onChange={(event) => {
              setDraftFilters((prev) => ({
                ...prev,
                sn: event.target.value,
              }));
            }}
            onPressEnter={onSearch}
          />
        ),
      },
      {
        key: 'brandCode',
        label: '品牌编码',
        content: (
          <Input
            allowClear
            placeholder="请输入"
            value={draftFilters.brandCode}
            onChange={(event) => {
              setDraftFilters((prev) => ({
                ...prev,
                brandCode: event.target.value,
              }));
            }}
            onPressEnter={onSearch}
          />
        ),
      },
      {
        key: 'model',
        label: '型号',
        content: (
          <Input
            allowClear
            placeholder="请输入"
            value={draftFilters.model}
            onChange={(event) => {
              setDraftFilters((prev) => ({
                ...prev,
                model: event.target.value,
              }));
            }}
            onPressEnter={onSearch}
          />
        ),
      },
      {
        key: 'osCode',
        label: '系统编码',
        content: (
          <Input
            allowClear
            placeholder="请输入"
            value={draftFilters.osCode}
            onChange={(event) => {
              setDraftFilters((prev) => ({
                ...prev,
                osCode: event.target.value,
              }));
            }}
            onPressEnter={onSearch}
          />
        ),
      },
      {
        key: 'osVersion',
        label: '系统版本',
        content: (
          <Input
            allowClear
            placeholder="请输入"
            value={draftFilters.osVersion}
            onChange={(event) => {
              setDraftFilters((prev) => ({
                ...prev,
                osVersion: event.target.value,
              }));
            }}
            onPressEnter={onSearch}
          />
        ),
      },
      {
        key: 'clientVersion',
        label: '客户端版本',
        content: (
          <Input
            allowClear
            placeholder="请输入"
            value={draftFilters.clientVersion}
            onChange={(event) => {
              setDraftFilters((prev) => ({
                ...prev,
                clientVersion: event.target.value,
              }));
            }}
            onPressEnter={onSearch}
          />
        ),
      },
      {
        key: 'state',
        label: '状态',
        content: (
          <Select
            allowClear
            placeholder="请选择"
            value={draftFilters.state}
            options={TERMINAL_STATE_OPTIONS}
            onChange={(value) => {
              setDraftFilters((prev) => ({
                ...prev,
                state: value,
              }));
            }}
          />
        ),
      },
      {
        key: 'type',
        label: '终端类型',
        content: (
          <Select
            allowClear
            placeholder="请选择"
            value={draftFilters.type}
            options={TERMINAL_TYPE_OPTIONS}
            onChange={(value) => {
              setDraftFilters((prev) => ({
                ...prev,
                type: value,
              }));
            }}
          />
        ),
      },
      {
        key: 'currentIp',
        label: '当前IP',
        content: (
          <Input
            allowClear
            placeholder="请输入"
            value={draftFilters.currentIp}
            onChange={(event) => {
              setDraftFilters((prev) => ({
                ...prev,
                currentIp: event.target.value,
              }));
            }}
            onPressEnter={onSearch}
          />
        ),
      },
      {
        key: 'remark',
        label: '备注',
        content: (
          <Input
            allowClear
            placeholder="请输入"
            value={draftFilters.remark}
            onChange={(event) => {
              setDraftFilters((prev) => ({
                ...prev,
                remark: event.target.value,
              }));
            }}
            onPressEnter={onSearch}
          />
        ),
      },
    ],
    [draftFilters, onSearch, setDraftFilters],
  );

  return (
    <ExpandableFilterCard
      className="terminal-filter-card"
      onSearch={onSearch}
      onReset={onReset}
      fields={fields}
    />
  );
}

export default TerminalFilterCard;
