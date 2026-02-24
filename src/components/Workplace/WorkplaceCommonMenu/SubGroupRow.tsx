import { RightOutlined } from '@ant-design/icons';
import React from 'react';

/**
 * 左侧二级菜单 Item (Level 2)
 */
function SubGroupRow({
  title,
  active,
  isDarkMode = false,
  onClick,
}: {
  title: string;
  active: boolean;
  isDarkMode?: boolean;
  onClick: () => void;
}) {
  const [hovering, setHovering] = React.useState(false);
  const high = active || hovering;
  const defaultTextColor = isDarkMode ? 'rgba(255, 255, 255, 0.88)' : '#333';
  const defaultSecondaryColor = isDarkMode
    ? 'rgba(255, 255, 255, 0.55)'
    : '#999';
  return (
    <button
      type="button"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 36,
        marginBottom: 8,
        padding: '12px 24px',
        cursor: 'pointer',
        userSelect: 'none',
        fontSize: 14,
        color: high ? '#005BF8' : defaultTextColor,
        background: 'transparent',
        border: 0,
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        font: 'inherit',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <span
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      <RightOutlined
        style={{
          color: high ? '#005BF8' : defaultSecondaryColor,
          fontSize: 12,
          marginLeft: 8,
        }}
      />
    </button>
  );
}

export default SubGroupRow;
