import { apiData, apiRequest } from '@/api/http';

export type SystemConfigItem = {
  id?: string;
  configKey?: string;
  config_key?: string;
  valueType?: string;
  value_type?: string;
  configType?: string;
  config_type?: string;
  configValue?: string;
  config_value?: string;
  configValueConvert?: string;
  config_value_convert?: string;
  description?: string;
  scope?: string;
  remark?: string;
  explain?: string;
  createTime?: string;
  updateTime?: string;
  timestamp?: number;
  [key: string]: any;
};

type CommonApiResponse<T = any> = {
  code?: number | string;
  msg?: string;
  message?: string;
  data?: T;
  success?: boolean;
  errorMessage?: string;
};

export type SystemConfigValueSaveItem = {
  id?: string;
  configKey?: string;
  configType?: string;
  scope?: string;
  valueType?: string;
  configValue: string;
};

const SYSTEM_CONFIG_API_PREFIX = '/api/admin/system/v1/systemConfig';
const SITE_STATIC_RESOURCE_SCOPE = 'GLOBAL';
const SITE_STATIC_RESOURCE_CONFIG_TYPE = 'SITE_STATIC_RESOURCE';
const DOMAIN_CONFIG_SCOPE = 'GLOBAL';
const DOMAIN_CONFIG_TYPE = 'DOMAIN';

export async function getUncheckedSiteStaticConfig(options?: {
  [key: string]: any;
}) {
  return apiData<SystemConfigItem[]>(
    `${SYSTEM_CONFIG_API_PREFIX}/unchecked/getSiteStaticConfig`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getSystemConfigList(
  scope: string,
  configType: string,
  options?: { [key: string]: any },
) {
  return apiData<SystemConfigItem[]>(
    `${SYSTEM_CONFIG_API_PREFIX}/${encodeURIComponent(
      scope,
    )}/${encodeURIComponent(configType)}/getList`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function getSiteStaticResourceConfigList(options?: {
  [key: string]: any;
}) {
  return getSystemConfigList(
    SITE_STATIC_RESOURCE_SCOPE,
    SITE_STATIC_RESOURCE_CONFIG_TYPE,
    options,
  );
}

export async function getDomainConfigList(options?: { [key: string]: any }) {
  return getSystemConfigList(DOMAIN_CONFIG_SCOPE, DOMAIN_CONFIG_TYPE, options);
}

export async function modifySystemConfigValue(
  data: SystemConfigValueSaveItem[],
  options?: { [key: string]: any },
) {
  return apiRequest<CommonApiResponse<boolean>>(
    `${SYSTEM_CONFIG_API_PREFIX}/modify/value`,
    {
      method: 'POST',
      data,
      ...(options || {}),
    },
  );
}
