import { PlusCircleOutlined } from '@ant-design/icons';
import React from 'react';
import type { CommonAction } from '@/config/menu.config';

/**
 * 右侧待选列表项 (Level 3)
 * 仅保留点击添加功能
 */
function CandidateRow({
  item,
  disabled,
  onAdd,
}: {
  item: CommonAction;
  disabled: boolean;
  onAdd: () => void;
}) {
  const [hovering, setHovering] = React.useState(false);

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    background: 'transparent',
    cursor: 'default',
    userSelect: 'none',
    fontSize: 14,
    color: hovering && !disabled ? '#005BF8' : disabled ? '#ccc' : '#333',
  };
  return (
    <div
      style={style}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div style={{ whiteSpace: 'nowrap', paddingRight: 12 }}>{item.title}</div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onAdd();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: 0,
          padding: 0,
          background: 'transparent',
        }}
      >
        <PlusCircleOutlined
          style={{
            fontSize: 12,
            color: disabled
              ? '#ccc'
              : hovering
                ? '#005BF8'
                : 'var(--ant-color-primary)',
          }}
        />
      </button>
    </div>
  );
}

export default CandidateRow;
