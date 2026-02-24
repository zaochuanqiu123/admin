import { RightOutlined } from '@ant-design/icons';
import type { UniqueIdentifier } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';

/**
 * 左侧一级菜单 Item (Level 1)
 * 支持拖拽排序
 */
function GroupRow({
  id,
  active,
  icon,
  title,
  isDarkMode = false,
  onClick,
}: {
  id: string;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  isDarkMode?: boolean;
  onClick: () => void;
}) {
  const [hovering, setHovering] = React.useState(false);
  const defaultTextColor = isDarkMode ? 'rgba(255, 255, 255, 0.88)' : '#333';
  const defaultSecondaryColor = isDarkMode
    ? 'rgba(255, 255, 255, 0.55)'
    : '#999';
  const sortableId = `group:${id}` as UniqueIdentifier;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    height: 36,
    marginBottom: 8,
    padding: 0,
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: 14,
    color: active || hovering ? '#005BF8' : defaultTextColor,
    background: 'transparent',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: active || hovering ? '#005BF8' : undefined,
          }}
        >
          {icon}
        </span>
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
      </div>
      <RightOutlined
        style={{
          color: active || hovering ? '#005BF8' : defaultSecondaryColor,
          fontSize: 12,
          marginLeft: 8,
        }}
      />
    </div>
  );
}

export default GroupRow;
