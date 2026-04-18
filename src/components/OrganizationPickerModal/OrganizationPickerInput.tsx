import { Button, Input, Space } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { AgentOrgRecord } from '@/api/org';
import OrganizationPickerModal from './index';

type OrganizationPickerInputProps = {
  value?: string;
  onChange?: (value: string, record?: AgentOrgRecord) => void;
  placeholder?: string;
};

function getOrgDisplayText(record?: AgentOrgRecord | null) {
  const orgName = String(record?.orgName || '').trim();
  const orgId = String(record?.id || '').trim();

  if (orgName && orgId) return `${orgName}（ID: ${orgId}）`;
  return orgName || orgId || '';
}

const OrganizationPickerInput: React.FC<OrganizationPickerInputProps> = ({
  value,
  onChange,
  placeholder = '请选择机构',
}) => {
  const [open, setOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<AgentOrgRecord | null>(null);

  useEffect(() => {
    if (!value || selectedOrg?.id === value) return;
    setSelectedOrg(null);
  }, [selectedOrg?.id, value]);

  const displayValue = useMemo(() => {
    return getOrgDisplayText(selectedOrg) || String(value || '');
  }, [selectedOrg, value]);

  const handleClear = () => {
    setSelectedOrg(null);
    onChange?.('');
  };

  const handleSelect = (record: AgentOrgRecord) => {
    const nextValue = String(record.id || '').trim();
    setSelectedOrg(record);
    onChange?.(nextValue, record);
    setOpen(false);
  };

  return (
    <>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          readOnly
          allowClear
          placeholder={placeholder}
          value={displayValue}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            if (!event.target.value) {
              handleClear();
            }
          }}
        />
        <Button onClick={() => setOpen(true)}>选择</Button>
        {value ? <Button onClick={handleClear}>清空</Button> : null}
      </Space.Compact>
      <OrganizationPickerModal
        open={open}
        onCancel={() => setOpen(false)}
        onSelect={handleSelect}
        selectedOrg={
          selectedOrg || (value ? ({ id: value } as AgentOrgRecord) : null)
        }
      />
    </>
  );
};

export type { OrganizationPickerInputProps };
export default OrganizationPickerInput;
