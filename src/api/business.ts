import { apiData } from '@/api/http';

export type CurrentStoreBusinessInfo = {
  businessCode?: string;
  businessVersionId?: string;
  businessName?: string;
};

export async function getCurrentStoreBusiness(options?: {
  [key: string]: any;
}) {
  return apiData<CurrentStoreBusinessInfo>(
    '/api/admin/system/v1/business/curr/store/business',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}
