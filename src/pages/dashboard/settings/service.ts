import { request } from '@umijs/max';
import type { GeographicItemType } from './data';
import city from './geographic/city.json';
import province from './geographic/province.json';

export async function queryProvince(): Promise<{ data: GeographicItemType[] }> {
  return Promise.resolve({ data: province });
}

export async function queryCity(
  provinceId: string,
): Promise<{ data: GeographicItemType[] }> {
  const citiesForProvince =
    (city as Record<string, GeographicItemType[]>)[provinceId] || [];
  return Promise.resolve({ data: citiesForProvince });
}

export async function query() {
  return request('/api/users');
}
