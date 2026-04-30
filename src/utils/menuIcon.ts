import * as AntIcons from '@ant-design/icons';
import React from 'react';

type AntIconComponent = React.ElementType;

const antIconMap = AntIcons as unknown as Record<
  string,
  AntIconComponent | undefined
>;

function hasIconSuffix(name: string) {
  return /(Outlined|Filled|TwoTone)$/.test(name);
}

function upperFirst(value: string) {
  if (!value) return '';
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function toPascalIconName(value: string) {
  const normalized = value
    .replace(/^<|\/?>$/g, '')
    .replace(/^ant[-_]?icon[-_:]/i, '')
    .replace(/^icon[-_:]/i, '')
    .trim();

  if (!normalized) return '';

  if (/[-_\s]/.test(normalized)) {
    return normalized
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => upperFirst(part.toLowerCase()))
      .join('');
  }

  return upperFirst(normalized);
}

function getIconCandidateNames(value: string) {
  const raw = value.trim();
  const pascalName = toPascalIconName(raw);
  const candidates = [raw, upperFirst(raw), pascalName].filter(Boolean);

  if (pascalName && !hasIconSuffix(pascalName)) {
    candidates.push(
      `${pascalName}Outlined`,
      `${pascalName}Filled`,
      `${pascalName}TwoTone`,
    );
  }

  return Array.from(new Set(candidates)).filter(hasIconSuffix);
}

function isImageIconValue(value: string) {
  return (
    /^https?:\/\//i.test(value) ||
    /^data:image\//i.test(value) ||
    /^\/.+\.(svg|png|jpe?g|gif|webp)(\?.*)?$/i.test(value)
  );
}

function isAntIconComponent(value: unknown): value is AntIconComponent {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null && '$$typeof' in value)
  );
}

export function renderMenuIcon(icon: unknown): React.ReactNode {
  if (!icon) return undefined;
  if (React.isValidElement(icon)) return icon;

  if (typeof icon !== 'string') return undefined;

  const iconValue = icon.trim();
  if (!iconValue) return undefined;

  for (const candidateName of getIconCandidateNames(iconValue)) {
    const IconComponent = antIconMap[candidateName];
    if (isAntIconComponent(IconComponent)) {
      return React.createElement(IconComponent);
    }
  }

  if (isImageIconValue(iconValue)) {
    return React.createElement('img', {
      alt: '',
      className: 'pc-admin-menu-icon-img',
      src: iconValue,
    });
  }

  return undefined;
}
