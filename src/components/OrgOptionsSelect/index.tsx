import type { SelectProps } from 'antd';
import { Select } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getOrgOptions,
  type OrgLevelCode,
  type OrgOptionsRecord,
} from '@/api/org';

type OrgOptionsSelectProps = {
  value?: string;
  onChange?: (value: string, record?: OrgOptionsRecord) => void;
  orgLevelCode: OrgLevelCode;
  parentOrgId?: string;
  placeholder?: string;
  disabled?: boolean;
};

const DEFAULT_PAGE_SIZE = 20;

function buildSearchParams(keyword: string) {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) return {};

  if (/^[A-Za-z0-9_-]+$/.test(trimmedKeyword)) {
    return { orgCode: trimmedKeyword };
  }

  return { orgName: trimmedKeyword };
}

function getOrgOptionLabel(record: OrgOptionsRecord) {
  const orgName = String(record.orgName || '').trim();
  const orgCode = String(record.orgCode || '').trim();
  if (orgName && orgCode) return `${orgName}（${orgCode}）`;
  return orgName || orgCode || String(record.id || '');
}

const OrgOptionsSelect: React.FC<OrgOptionsSelectProps> = ({
  value,
  onChange,
  orgLevelCode,
  parentOrgId,
  placeholder = '请选择组织',
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<OrgOptionsRecord[]>([]);
  const requestIdRef = useRef(0);

  const loadOptions = useCallback(async () => {
    if (disabled) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);

    try {
      const res = await getOrgOptions(
        {
          current: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          ...buildSearchParams(searchValue),
          orgLevelCode,
          parentOrgId: String(parentOrgId || ''),
          state: true,
        },
        {
          skipErrorHandler: true,
        },
      );

      if (requestIdRef.current !== requestId) return;
      setRecords(Array.isArray(res?.records) ? res.records : []);
    } catch {
      if (requestIdRef.current === requestId) {
        setRecords([]);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [disabled, orgLevelCode, parentOrgId, searchValue]);

  useEffect(() => {
    if (!open) return;
    void loadOptions();
  }, [loadOptions, open]);

  useEffect(() => {
    setRecords([]);
    setSearchValue('');
  }, [orgLevelCode, parentOrgId]);

  const options = useMemo<SelectProps['options']>(() => {
    return records.map((record) => ({
      label: getOrgOptionLabel(record),
      value: String(record.id || ''),
      record,
    }));
  }, [records]);

  return (
    <Select
      allowClear
      showSearch
      filterOption={false}
      placeholder={placeholder}
      value={value || undefined}
      options={options}
      loading={loading}
      disabled={disabled}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
      onSearch={(nextSearchValue) => {
        setSearchValue(nextSearchValue);
      }}
      onChange={(nextValue, option) => {
        const selectedOption = Array.isArray(option) ? option[0] : option;
        onChange?.(
          String(nextValue || ''),
          (selectedOption as { record?: OrgOptionsRecord } | undefined)?.record,
        );
      }}
    />
  );
};

export type { OrgOptionsSelectProps };
export default OrgOptionsSelect;
