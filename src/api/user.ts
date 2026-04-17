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

/** 用户基本信息（来自后端接口） */
export type UserInfoResult = {
  account?: string;
  name?: string;
  phone?: string;
  avatar?: string;
  avatarUrl?: string;
  nickName?: string;
};

/** 获取当前登录用户的基本信息 */
export async function getUserInfo(options?: { [key: string]: any }) {
  return apiData<UserInfoResult>('/api/admin/user/v1/user/get/info', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 保存用户头像（传 attachmentId） */
export async function saveUserAvatar(
  avatar: string,
  options?: { [key: string]: any },
) {
  return apiData<boolean>('/api/admin/user/v1/user/save/avatar', {
    method: 'GET',
    params: { avatar },
    ...(options || {}),
  });
}
