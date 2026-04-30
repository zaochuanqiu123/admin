import { apiData, apiRequest } from '@/api/http';

export type SearchUserResult = {
  id?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  avatarUrl?: string | null;
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

export type ModifyPasswordParams = {
  oldPassword: string;
  newPassword: string;
};

export type EditUserInfoParams = {
  account: string;
  name: string;
  avatar?: string;
  nickName: string;
};

/** 获取当前登录用户的基本信息 */
export async function getUserInfo(options?: { [key: string]: any }) {
  return apiData<UserInfoResult>('/api/admin/user/v1/user/get/info', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 保存当前登录用户基本信息 */
export async function editUserInfo(
  data: EditUserInfoParams,
  options?: { [key: string]: any },
) {
  return apiData<boolean>('/api/admin/user/v1/user/edit/info', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/** 保存用户头像（avatar 参数传上传后的附件 id） */
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

/** 修改当前登录用户密码 */
export async function modifyUserPassword(
  data: ModifyPasswordParams,
  options?: { [key: string]: any },
) {
  return apiRequest<any>('/api/admin/user/v1/user/modify/password', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}
