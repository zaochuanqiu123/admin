import {
  enableOrgApp,
  getCurrentOrgAppDetail,
  getEnableAppVersionList,
  getOrgAppList,
  getUpgradeAppVersionList,
  renewOrgApp,
  upgradeOrgApp,
} from '@/api/app';
import MerchantCapabilityManagementModal from './MerchantCapabilityManagementModal';

type MerchantAppModalProps = {
  open: boolean;
  orgId?: string;
  merchantName?: string;
  onCancel: () => void;
};

function normalizeAppState(value?: number | boolean | string) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (typeof value === 'string') {
    const nextValue = value.trim().toUpperCase();
    if (
      ['TRUE', 'ENABLE', 'ENABLED', 'OPEN', 'ON', 'ACTIVE'].includes(nextValue)
    ) {
      return true;
    }
    if (
      [
        'FALSE',
        'DISABLE',
        'DISABLED',
        'OFF',
        'INACTIVE',
        'CLOSE',
        'CLOSED',
      ].includes(nextValue)
    ) {
      return false;
    }
  }
  if (typeof value === 'number') {
    return value > 0;
  }
  return value === undefined || value === null ? true : Boolean(value);
}

const MerchantAppModal: React.FC<MerchantAppModalProps> = ({
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
        managementName: '应用',
        getList: async (nextOrgId) => {
          const res = await getOrgAppList(nextOrgId, {
            skipErrorHandler: true,
          });
          return (Array.isArray(res) ? res : []).flatMap((group) =>
            (Array.isArray(group.appList) ? group.appList : []).map((item) => ({
              id: String(item.id || '').trim(),
              name: item.appName,
              state: normalizeAppState(item.state),
              openStatus: item.openStatus,
              categoryName: group.typeName,
              description: item.appDesc,
            })),
          );
        },
        getEnableVersionList: async (nextOrgId, itemId) => {
          const res = await getEnableAppVersionList(nextOrgId, itemId, {
            skipErrorHandler: true,
          });
          return (Array.isArray(res) ? res : []).map((item) => ({
            id: String(item.id || '').trim(),
            name: item.appVersionName,
            description: item.appVersionDesc,
            level: item.level,
            price: item.appVersionPrice,
            isDefault: false,
            state: true,
          }));
        },
        getUpgradeVersionList: async (nextOrgId, itemId) => {
          const res = await getUpgradeAppVersionList(nextOrgId, itemId, {
            skipErrorHandler: true,
          });
          return (Array.isArray(res) ? res : []).map((item) => ({
            id: String(item.id || '').trim(),
            name: item.appVersionName,
            description: item.appVersionDesc,
            level: item.level,
            price: item.appVersionPrice,
            isDefault: false,
            state: true,
          }));
        },
        getCurrentDetail: async (nextOrgId, itemId) => {
          const res = await getCurrentOrgAppDetail(nextOrgId, itemId, {
            skipErrorHandler: true,
          });
          return {
            startDate: res?.startDate,
            endDate: res?.endDate,
            versionName: res?.appVersionName,
            versionDescription: res?.appVersionDesc,
            level: res?.level,
            price: res?.appVersionPrice,
          };
        },
        enable: (params) =>
          enableOrgApp(
            {
              appVersionId: params.versionId,
              orgId: params.orgId,
              cycle: params.cycle,
            },
            {
              skipErrorHandler: true,
            },
          ),
        renew: (params) =>
          renewOrgApp(
            {
              appId: params.itemId,
              orgId: params.orgId,
              cycle: params.cycle,
            },
            {
              skipErrorHandler: true,
            },
          ),
        upgrade: (params) =>
          upgradeOrgApp(
            {
              appId: params.itemId,
              orgId: params.orgId,
              appVersionId: params.versionId,
            },
            {
              skipErrorHandler: true,
            },
          ),
      }}
    />
  );
};

export default MerchantAppModal;
