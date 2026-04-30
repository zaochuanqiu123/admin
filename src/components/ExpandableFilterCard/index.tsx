import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import type { FC, Key, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import './index.less';

export type ExpandableFilterField = {
  key: Key;
  label: ReactNode;
  content: ReactNode;
};

type ExpandableFilterCardProps = {
  fields: ExpandableFilterField[];
  onSearch: () => void;
  onReset: () => void;
  className?: string;
  defaultCollapsed?: boolean;
  extraActions?: ReactNode;
  visibleCount?: number;
  searchText?: string;
  resetText?: string;
};

const ExpandableFilterCard: FC<ExpandableFilterCardProps> = ({
  fields,
  onSearch,
  onReset,
  className,
  defaultCollapsed = true,
  extraActions,
  visibleCount = 3,
  searchText = '查询',
  resetText = '重置',
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const shouldShowCollapse = fields.length > visibleCount;
  const visibleFields = useMemo(() => {
    if (!shouldShowCollapse || !collapsed) {
      return fields;
    }

    return fields.slice(0, visibleCount);
  }, [collapsed, fields, shouldShowCollapse, visibleCount]);

  return (
    <div
      className={`content-card common-filter-card${className ? ` ${className}` : ''}`}
    >
      <div className="common-filter-grid">
        {visibleFields.map((field) => (
          <div key={field.key} className="common-filter-field">
            <span className="common-filter-label">{field.label}</span>
            <div className="common-filter-control">{field.content}</div>
          </div>
        ))}

        <div className="common-filter-actions">
          <Space size={12} wrap>
            <Button type="primary" onClick={onSearch}>
              {searchText}
            </Button>
            <Button onClick={onReset}>{resetText}</Button>
            {extraActions}
            {shouldShowCollapse ? (
              <Button
                type="link"
                className="common-filter-collapse-btn"
                onClick={() => {
                  setCollapsed((prev) => !prev);
                }}
              >
                {collapsed ? '展开' : '收起'}
                {collapsed ? <DownOutlined /> : <UpOutlined />}
              </Button>
            ) : null}
          </Space>
        </div>
      </div>
    </div>
  );
};

export default ExpandableFilterCard;
