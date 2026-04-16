import {
  enableOrgBusiness,
  getCurrentOrgBusinessDetail,
  getEnableBusinessVersionList,
  getMerchantBusinessList,
  getUpgradeBusinessVersionList,
  renewOrgBusiness,
  upgradeOrgBusiness,
} from '@/api/business';
import MerchantCapabilityManagementModal from './MerchantCapabilityManagementModal';

type MerchantBusinessModalProps = {
  open: boolean;
  orgId?: string;
  merchantName?: string;
  onCancel: () => void;
};

const MerchantBusinessModal: React.FC<MerchantBusinessModalProps> = ({
  open,
  orgId,
  merchantName,
  onCancel,
}) => {
  return (
    <MerchantCapabilityManagementModal
      open={open}
      orgId={orgId}
      merchantName={merchantName}
      onCancel={onCancel}
      config={{
        managementName: '业态',
        getList: async (nextOrgId) => {
          const res = await getMerchantBusinessList(nextOrgId, {
            skipErrorHandler: true,
          });
          return (Array.isArray(res) ? res : []).map((item) => ({
            id: String(item.businessCode || '').trim(),
            name: item.businessName,
            state: item.state,
            openStatus: item.openStatus,
          }));
        },
        getEnableVersionList: async (nextOrgId, itemId) => {
          const res = await getEnableBusinessVersionList(nextOrgId, itemId, {
            skipErrorHandler: true,
          });
          return (Array.isArray(res) ? res : []).map((item) => ({
            id: String(item.id || '').trim(),
            name: item.businessVersionName,
            level: item.level,
            price: item.price,
            state: item.state,
            isDefault: item.isDefault,
          }));
        },
        getUpgradeVersionList: async (nextOrgId, itemId) => {
          const res = await getUpgradeBusinessVersionList(nextOrgId, itemId, {
            skipErrorHandler: true,
          });
          return (Array.isArray(res) ? res : []).map((item) => ({
            id: String(item.id || '').trim(),
            name: item.businessVersionName,
            level: item.level,
            price: item.price,
            state: item.state,
            isDefault: item.isDefault,
          }));
        },
        getCurrentDetail: async (nextOrgId, itemId) => {
          const res = await getCurrentOrgBusinessDetail(nextOrgId, itemId, {
            skipErrorHandler: true,
          });
          return {
            startDate: res?.startDate,
            endDate: res?.endDate,
            versionName: res?.businessVersionName,
            level: res?.level,
            price: res?.price,
          };
        },
        enable: (params) =>
          enableOrgBusiness(
            {
              businessVersionId: params.versionId,
              businessCode: params.itemId,
              orgId: params.orgId,
              cycle: params.cycle,
            },
            {
              skipErrorHandler: true,
            },
          ),
        renew: (params) =>
          renewOrgBusiness(
            {
              businessCode: params.itemId,
              orgId: params.orgId,
              cycle: params.cycle,
            },
            {
              skipErrorHandler: true,
            },
          ),
        upgrade: (params) =>
          upgradeOrgBusiness(
            {
              businessCode: params.itemId,
              orgId: params.orgId,
              businessVersionId: params.versionId,
            },
            {
              skipErrorHandler: true,
            },
          ),
      }}
    />
  );
};

export default MerchantBusinessModal;
