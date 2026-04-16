import type { AddressCityNode } from '@/api/address';

export type RegionOption = {
  value: string;
  label: string;
  isLeaf?: boolean;
  loading?: boolean;
  children?: RegionOption[];
};

export function buildRegionOptions(
  nodes: AddressCityNode[],
  nextLevel: 1 | 2 | 3,
): RegionOption[] {
  return nodes.map((node) => ({
    value: String(node?.city_code || ''),
    label: String(node?.city_name || ''),
    isLeaf: nextLevel >= 3,
  }));
}

export function findRegionPath(options: RegionOption[], values: string[]) {
  const path: RegionOption[] = [];
  let currentOptions = options;
  for (const value of values) {
    const matched = currentOptions.find(
      (option) => String(option.value) === String(value),
    );
    if (!matched) {
      return [];
    }
    path.push(matched);
    currentOptions = matched.children || [];
  }
  return path;
}
