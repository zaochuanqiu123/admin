import { apiData } from '@/api/http';

export async function getUserLoginContext(
  orgCode: string,
  options?: { [key: string]: any },
) {
  return apiData<any>('/api/system/getUserLoginContext', {
    method: 'GET',
    params: { orgCode },
    ...(options || {}),
  });
}

export async function getPermContext(
  businessCode?: string,
  options?: { [key: string]: any },
) {
  return apiData<any>('/api/system/perm/getPermContext', {
    method: 'GET',
    params: businessCode ? { businessCode } : undefined,
    ...(options || {}),
  });
}
