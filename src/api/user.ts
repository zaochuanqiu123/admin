import { apiData } from '@/api/http';

export type SearchUserResult = {
  id?: string;
  phone?: string;
  name?: string;
};

export async function searchUserByPhone(
  phone: string,
  options?: { [key: string]: any },
) {
  return apiData<SearchUserResult>('/api/admin/user/v1/user/search/user', {
    method: 'GET',
    params: { phone },
    ...(options || {}),
  });
}
