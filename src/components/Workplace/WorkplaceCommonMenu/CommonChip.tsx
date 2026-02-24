import { CloseOutlined } from '@ant-design/icons';
import type { UniqueIdentifier } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';
import type { CommonAction } from '@/config/menu.config';

/**
 * 顶部已选中的胶囊样式
 * 支持拖拽排序
 */
function CommonChip({
  item,
  isDarkMode = false,
  onRemove,
}: {
  item: CommonAction;
  isDarkMode?: boolean;
  onRemove: (id: string) => void;
}) {
  const chipBg = isDarkMode ? '#262626' : '#F4F6F8';
  const chipTextColor = isDarkMode ? 'rgba(255, 255, 255, 0.88)' : '#333';
  const chipCloseBg = isDarkMode ? '#595959' : '#C0C4CC';
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id: item.id as UniqueIdentifier });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isSorting ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
    background: chipBg,
    borderRadius: 16,
    padding: '4px 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    userSelect: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    fontSize: 13,
    color: chipTextColor,
    boxSizing: 'border-box',
    height: 28,
    lineHeight: '20px',
    width: '100%',
    justifyContent: 'space-between',
    minWidth: 0,
    willChange: 'transform',
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: 1,
        background: isDragging ? 'transparent' : style.background,
        border: isDragging
          ? '1px dashed var(--ant-color-primary)'
          : '1px solid transparent',
      }}
      {...attributes}
      {...listeners}
    >
      <span
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          flex: 1,
        }}
      >
        {item.title}
      </span>
      <button
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: chipCloseBg,
          color: '#fff',
          cursor: 'pointer',
          fontSize: 8,
          border: 0,
          padding: 0,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
      >
        <CloseOutlined />
      </button>
    </div>
  );
}

export default CommonChip;
