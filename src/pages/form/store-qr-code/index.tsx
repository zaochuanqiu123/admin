import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Image,
  Input,
  Modal,
  message,
  Select,
  Space,
  Switch,
  Table,
} from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  batchAddQrCode,
  bindQrCode,
  changeQrCodeTemplate,
  getQrCodePageQuery,
  type QrCodeRecord,
  transferQrCode,
  unbindQrCode,
} from '@/api/qrCode';
import { getQrCodeTemplateList } from '@/api/qrCodeTemplate';
import {
  ExpandableFilterCard,
  PageSectionSkeleton,
  PermissionButton,
  PermissionVisible,
} from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import { BatchChangeTemplateModal } from './components/BatchChangeTemplateModal';
import { BindQrCodeModal } from './components/BindQrCodeModal';
import { CreateQrCodeModal } from './components/CreateQrCodeModal';
import type { TemplateSelectOption } from './components/TemplatePreviewSelect';
import { TransferModal } from './components/TransferModal';
import './index.less';

const { RangePicker } = DatePicker;
const QR_CODE_PERMS = {
  bind: 'admin:device:qrcode:bind',
  transfer: 'admin:device:qrcode:transfer',
  batchAdd: 'admin:device:qrcode:batchAdd',
  changeTemplate: 'admin:device:qrcode:changeTemplate',
  updateState: 'admin:device:qrcode:updateState',
  unbind: 'admin:device:qrcode:unbind',
  exportData: 'admin:device:qrcode:exportData',
  exportQrcode: 'admin:device:qrcode:exportQrcode',
  exportCompose: 'admin:device:qrcode:exportCompose',
} as const;

type QueryFilters = {
  brandName?: string;
  transferTimeRange?: RangePickerProps['value'];
  bizType?: string;
  state?: string;
  isTransferred?: string;
  isBound?: string;
  sn: string;
  batchSn: string;
  qrcodeTemplateId?: string;
  openType?: string;
  snStart: string;
  snEnd: string;
  keyword: string;
  model: string;
};

const DEFAULT_PAGE_SIZE = 10;
function readText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function formatOpenType(value?: string) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (!normalized) return '-';
  if (normalized === 'MINI' || normalized === 'MINI_PROGRAM') return '小程序';
  if (normalized === 'H5' || normalized === 'H5-H5') return 'H5';
  return value || '-';
}

function formatBizType(value?: string) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (!normalized) return '-';
  if (normalized === 'RECEIPT_CODE') return '收款码';
  if (normalized === 'CATER_TABLE') return '餐饮桌台';
  if (normalized === 'OTHER') return '其他业务';
  return value || '-';
}

function getTemplateName(record: QrCodeRecord) {
  return readText(record?.qrcodeTemplate?.name);
}

function getPreviewImage(record: QrCodeRecord) {
  return readText(record?.qrcodeTemplate?.prevImageUrl);
}

function getBrandName(record: QrCodeRecord) {
  const rawValue =
    (record as any)?.brandName ||
    (record as any)?.belongBrandName ||
    (record as any)?.brand ||
    (record as any)?.brandLabel;
  return readText(rawValue);
}

function isBound(record: QrCodeRecord) {
  return Boolean(
    readText(
      record?.targetId,
      record?.bindTime,
      record?.bindName,
      record?.merchantOrg?.orgName,
      record?.storeOrg?.orgName,
      record?.merchantOrgId,
      record?.storeOrgId,
      record?.storeOrgUserId,
    ),
  );
}

function isTransferred(record: QrCodeRecord) {
  return Boolean(readText(record?.transferTime));
}

function getOrgDisplay(record: QrCodeRecord) {
  return (
    [readText(record?.agentOrg?.orgName), readText(record?.groupOrg?.orgName)]
      .filter(Boolean)
      .join(' / ') ||
    readText(record?.agentOrgId, record?.groupOrgId) ||
    '-'
  );
}

function getBindDisplay(record: QrCodeRecord) {
  const merchantName = readText(record?.merchantOrg?.orgName);
  const merchantId = readText(record?.merchantOrgId);
  return [
    merchantName || merchantId || '-',
    merchantName && merchantId ? merchantId : '',
  ].filter(Boolean);
}

function getStoreDisplay(record: QrCodeRecord) {
  const storeName = readText(record?.storeOrg?.orgName);
  const storeId = readText(record?.storeOrgId);
  return [
    storeName || storeId || '-',
    storeName && storeId ? storeId : '',
  ].filter(Boolean);
}

function getKeywordSource(record: QrCodeRecord) {
  return [
    readText(record?.merchantOrg?.orgName),
    readText(record?.storeOrg?.orgName),
    readText(record?.agentOrg?.orgName),
    readText(record?.groupOrg?.orgName),
    readText(record?.bindName),
    readText(record?.merchantOrgId),
    readText(record?.storeOrgId),
    readText(record?.storeOrgUserId),
    readText(record?.agentOrgId),
    readText(record?.groupOrgId),
    readText(record?.targetId),
    getTemplateName(record),
  ]
    .filter(Boolean)
    .join(' ');
}

function showPendingActionMessage(label: string) {
  message.info(`${label}功能暂未接入，等你确认接口后再补。`);
}

const StoreQrCodeListPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<QrCodeRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateOptionsSource, setTemplateOptionsSource] = useState<
    TemplateSelectOption[]
  >([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  // Modals state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [batchChangeTemplateOpen, setBatchChangeTemplateOpen] = useState(false);

  const [draftFilters, setDraftFilters] = useState<QueryFilters>({
    brandName: undefined,
    transferTimeRange: undefined,
    bizType: undefined,
    state: undefined,
    isTransferred: undefined,
    isBound: undefined,
    sn: '',
    batchSn: '',
    qrcodeTemplateId: undefined,
    openType: undefined,
    snStart: '',
    snEnd: '',
    keyword: '',
    model: '',
  });
  const [filters, setFilters] = useState<QueryFilters>({
    brandName: undefined,
    transferTimeRange: undefined,
    bizType: undefined,
    state: undefined,
    isTransferred: undefined,
    isBound: undefined,
    sn: '',
    batchSn: '',
    qrcodeTemplateId: undefined,
    openType: undefined,
    snStart: '',
    snEnd: '',
    keyword: '',
    model: '',
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = pagination.current || 1;
  const pageSize = pagination.pageSize || DEFAULT_PAGE_SIZE;

  const templateOptions = useMemo(() => {
    const templateMap = new Map<string, TemplateSelectOption>();
    templateOptionsSource.forEach((item) => {
      const templateId = readText(item?.value);
      const templateName = readText(item?.label);
      if (!templateId || !templateName) return;
      templateMap.set(templateId, item);
    });
    records.forEach((record) => {
      const templateId = readText(record?.qrcodeTemplateId);
      const templateName = getTemplateName(record);
      if (!templateId || !templateName) return;
      const currentOption = templateMap.get(templateId);
      templateMap.set(templateId, {
        label: templateName,
        value: templateId,
        previewImageUrl:
          getPreviewImage(record) || currentOption?.previewImageUrl,
        brandName: getBrandName(record) || currentOption?.brandName,
      });
    });
    return Array.from(templateMap.values());
  }, [records, templateOptionsSource]);

  const brandOptions = useMemo(() => {
    const brandMap = new Map<string, { label: string; value: string }>();
    records.forEach((record) => {
      const brandName = getBrandName(record);
      if (!brandName) return;
      brandMap.set(brandName, { label: brandName, value: brandName });
    });
    return Array.from(brandMap.values());
  }, [records]);

  const openTypeOptions = useMemo(() => {
    const optionMap = new Map<string, { label: string; value: string }>();
    records.forEach((record) => {
      const value = String(record?.openType || '').trim();
      if (!value) return;
      optionMap.set(value, { label: formatOpenType(value), value });
    });
    return Array.from(optionMap.values());
  }, [records]);

  const bizTypeOptions = useMemo(() => {
    const optionMap = new Map<string, { label: string; value: string }>();
    records.forEach((record) => {
      const value = String(record?.bizType || '').trim();
      if (!value) return;
      optionMap.set(value, { label: formatBizType(value), value });
    });
    return Array.from(optionMap.values());
  }, [records]);

  const loadTemplateOptions = useCallback(async () => {
    setTemplateLoading(true);
    try {
      const res = await getQrCodeTemplateList(
        {
          state: 1,
        },
        {
          skipErrorHandler: true,
        },
      );
      const nextOptions = (Array.isArray(res) ? res : [])
        .map((record) => {
          const templateId = readText(record?.id);
          const templateName = readText(record?.name);
          if (!templateId || !templateName) return null;
          return {
            label: templateName,
            value: templateId,
            previewImageUrl: readText(record?.prevImageUrl, record?.prevImage),
            brandName: readText(record?.brandName),
          } satisfies TemplateSelectOption;
        })
        .filter(Boolean) as TemplateSelectOption[];
      setTemplateOptionsSource(nextOptions);
    } catch (error) {
      console.error('load qr code template options failed:', error);
      message.error(getErrorMessage(error, '获取模板列表失败'));
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  const loadQrCodes = useCallback(async () => {
    setLoading(true);
    setListError(undefined);
    try {
      const res = await getQrCodePageQuery(
        {
          current,
          pageSize,
          sn: filters.sn.trim() || undefined,
          batchSn: filters.batchSn.trim() || undefined,
          model: filters.model.trim() || undefined,
          qrcodeTemplateId: filters.qrcodeTemplateId || undefined,
        },
        {
          skipErrorHandler: true,
        },
      );
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load qr code list failed:', error);
      const nextError = getErrorMessage(
        error,
        '获取收款码列表失败，请稍后重试',
      );
      setListError(nextError);
      message.error(nextError);
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [
    current,
    filters.batchSn,
    filters.model,
    filters.qrcodeTemplateId,
    filters.sn,
    pageSize,
  ]);

  useEffect(() => {
    void loadQrCodes();
  }, [loadQrCodes]);

  useEffect(() => {
    void loadTemplateOptions();
  }, [loadTemplateOptions]);

  const handleOpenBindModal = useCallback(() => {
    setBindModalOpen(true);
  }, []);

  const handleUnbind = useCallback(
    async (record: QrCodeRecord) => {
      const id = String(record?.id || '').trim();
      const sn = String(record?.sn || '').trim();

      if (!id && !sn) {
        message.error('缺少二维码标识，无法解绑');
        return;
      }

      Modal.confirm({
        title: '确认解绑该二维码吗？',
        content: sn ? `编号：${sn}` : undefined,
        okText: '确认',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            const res = await unbindQrCode(
              {
                id: id || undefined,
                sn: sn || undefined,
              },
              { skipErrorHandler: true },
            );
            message.success(getApiMessage(res, '解绑成功'));
            await loadQrCodes();
          } catch (error) {
            console.error('unbindQrCode failed:', error);
            message.error(getErrorMessage(error, '解绑失败'));
            throw error;
          }
        },
      });
    },
    [loadQrCodes],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.brandName && getBrandName(record) !== filters.brandName) {
        return false;
      }

      if (
        filters.bizType &&
        String(record?.bizType || '') !== filters.bizType
      ) {
        return false;
      }

      if (
        filters.openType &&
        String(record?.openType || '') !== filters.openType
      ) {
        return false;
      }

      if (filters.state !== undefined && filters.state !== '') {
        if (String(Number(record?.state ?? 0)) !== String(filters.state)) {
          return false;
        }
      }

      if (filters.isTransferred !== undefined && filters.isTransferred !== '') {
        if (
          String(Number(isTransferred(record))) !==
          String(filters.isTransferred)
        ) {
          return false;
        }
      }

      if (filters.isBound !== undefined && filters.isBound !== '') {
        if (String(Number(isBound(record))) !== String(filters.isBound)) {
          return false;
        }
      }

      if (filters.transferTimeRange?.[0] && filters.transferTimeRange[1]) {
        const transferTime = dayjs(record?.transferTime);
        if (!transferTime.isValid()) return false;
        const start = filters.transferTimeRange[0].startOf('day');
        const end = filters.transferTimeRange[1].endOf('day');
        if (transferTime.isBefore(start) || transferTime.isAfter(end)) {
          return false;
        }
      }

      const snValue = String(record?.sn || '').trim();
      if (filters.snStart && snValue && snValue < filters.snStart) {
        return false;
      }
      if (filters.snEnd && snValue && snValue > filters.snEnd) {
        return false;
      }

      const keyword = filters.keyword.trim();
      if (keyword) {
        const keywordSource = getKeywordSource(record);
        if (!keywordSource.includes(keyword)) {
          return false;
        }
      }

      return true;
    });
  }, [
    filters.bizType,
    filters.brandName,
    filters.isBound,
    filters.isTransferred,
    filters.keyword,
    filters.openType,
    filters.snEnd,
    filters.snStart,
    filters.state,
    filters.transferTimeRange,
    records,
  ]);

  const columns = useMemo<ColumnsType<QrCodeRecord>>(
    () => [
      {
        title: '批次号',
        dataIndex: 'batchSn',
        width: 140,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '编号',
        dataIndex: 'sn',
        width: 140,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '二维码',
        dataIndex: ['qrcodeTemplate', 'prevImageUrl'],
        width: 140,
        render: (_value, record) => {
          const imageUrl = getPreviewImage(record);
          if (imageUrl) {
            return (
              <div className="qr-code-preview-box">
                <img
                  src={imageUrl}
                  alt={getTemplateName(record) || '收款码预览'}
                  className="qr-code-preview-image"
                  onClick={() => {
                    setPreviewImage(imageUrl);
                    setPreviewOpen(true);
                  }}
                />
              </div>
            );
          }

          return (
            <div className="qr-code-preview-box qr-code-preview-box-placeholder">
              <span>暂无预览</span>
            </div>
          );
        },
      },
      {
        title: '打开方式',
        dataIndex: 'openType',
        width: 120,
        render: (value) => formatOpenType(value),
      },
      {
        title: '类型',
        dataIndex: 'bizType',
        width: 130,
        render: (value) => (
          <span className="qr-code-chip is-muted">{formatBizType(value)}</span>
        ),
      },
      {
        title: '型号',
        dataIndex: 'model',
        width: 120,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '机构',
        key: 'orgInfo',
        width: 180,
        render: (_, record) => getOrgDisplay(record),
      },
      {
        title: '绑定商户',
        key: 'bindInfo',
        width: 220,
        render: (_, record) => {
          const bindInfo = getBindDisplay(record);
          return (
            <div className="qr-code-bind-lines">
              {bindInfo.map((item, index) => (
                <div
                  key={`${String(record.id)}-merchant-${index}-${item}`}
                  className={index === 0 ? '' : 'is-secondary'}
                >
                  {item}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        title: '门店',
        key: 'storeInfo',
        width: 220,
        render: (_, record) => {
          const storeInfo = getStoreDisplay(record);
          return (
            <div className="qr-code-bind-lines">
              {storeInfo.map((item, index) => (
                <div
                  key={`${String(record.id)}-store-${index}-${item}`}
                  className={index === 0 ? '' : 'is-secondary'}
                >
                  {item}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 180,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '划拨时间',
        dataIndex: 'transferTime',
        width: 180,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '状态',
        dataIndex: 'state',
        width: 120,
        render: (value) => (
          <Switch
            checked={Number(value) === 1}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            disabled
          />
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        render: (_, record) => {
          const hasBindInfo = isBound(record);

          return (
            <div className="qr-code-action-links">
              {hasBindInfo ? (
                <PermissionVisible perm={QR_CODE_PERMS.unbind}>
                  <a
                    className="is-danger"
                    onClick={() => {
                      void handleUnbind(record);
                    }}
                  >
                    解绑
                  </a>
                </PermissionVisible>
              ) : null}
            </div>
          );
        },
      },
    ],
    [handleUnbind],
  );

  const handleSearch = () => {
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
    setFilters({
      ...draftFilters,
      sn: draftFilters.sn.trim(),
      batchSn: draftFilters.batchSn.trim(),
      model: draftFilters.model.trim(),
      snStart: draftFilters.snStart.trim(),
      snEnd: draftFilters.snEnd.trim(),
      keyword: draftFilters.keyword.trim(),
    });
  };

  const handleReset = () => {
    const nextFilters: QueryFilters = {
      brandName: undefined,
      transferTimeRange: undefined,
      bizType: undefined,
      state: undefined,
      isTransferred: undefined,
      isBound: undefined,
      sn: '',
      batchSn: '',
      qrcodeTemplateId: undefined,
      openType: undefined,
      snStart: '',
      snEnd: '',
      keyword: '',
      model: '',
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const filteredTotal =
    filters.brandName ||
    filters.transferTimeRange ||
    filters.bizType ||
    filters.state ||
    filters.isTransferred ||
    filters.isBound ||
    filters.openType ||
    filters.snStart ||
    filters.snEnd ||
    filters.keyword
      ? filteredRecords.length
      : serverTotal;
  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  return (
    <div className="qr-code-page">
      <ExpandableFilterCard
        className="qr-code-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={[
          {
            key: 'brandName',
            label: '所属品牌',
            content: (
              <Select
                allowClear
                placeholder="请选择"
                value={draftFilters.brandName}
                options={brandOptions}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    brandName: value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'transferTimeRange',
            label: '划拨时间',
            content: (
              <RangePicker
                value={draftFilters.transferTimeRange}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    transferTimeRange: value || undefined,
                  }));
                }}
              />
            ),
          },
          {
            key: 'bizType',
            label: '类别',
            content: (
              <Select
                allowClear
                placeholder="请选择"
                value={draftFilters.bizType}
                options={bizTypeOptions}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    bizType: value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'state',
            label: '状态',
            content: (
              <Select
                allowClear
                placeholder="请选择"
                value={draftFilters.state}
                options={[
                  { label: '启用', value: '1' },
                  { label: '禁用', value: '0' },
                ]}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    state: value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'isTransferred',
            label: '是否划拨',
            content: (
              <Select
                allowClear
                placeholder="请选择"
                value={draftFilters.isTransferred}
                options={[
                  { label: '是', value: '1' },
                  { label: '否', value: '0' },
                ]}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    isTransferred: value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'isBound',
            label: '是否绑定',
            content: (
              <Select
                allowClear
                placeholder="请选择"
                value={draftFilters.isBound}
                options={[
                  { label: '是', value: '1' },
                  { label: '否', value: '0' },
                ]}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    isBound: value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'sn',
            label: '编号',
            content: (
              <Input
                allowClear
                placeholder="请输入编号"
                value={draftFilters.sn}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    sn: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'batchSn',
            label: '批次号',
            content: (
              <Input
                allowClear
                placeholder="请输入批次号"
                value={draftFilters.batchSn}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    batchSn: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'qrcodeTemplateId',
            label: '模板',
            content: (
              <Select
                allowClear
                placeholder="请选择"
                loading={templateLoading}
                value={draftFilters.qrcodeTemplateId}
                options={templateOptions}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    qrcodeTemplateId: value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'openType',
            label: '打开方式',
            content: (
              <Select
                allowClear
                placeholder="请选择"
                value={draftFilters.openType}
                options={openTypeOptions}
                onChange={(value) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    openType: value,
                  }));
                }}
              />
            ),
          },
          {
            key: 'snRange',
            label: '编号区间',
            content: (
              <Space.Compact block>
                <Input
                  placeholder="请输入起始编号"
                  value={draftFilters.snStart}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      snStart: event.target.value,
                    }));
                  }}
                />
                <Input
                  placeholder="请输入截止编号"
                  value={draftFilters.snEnd}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      snEnd: event.target.value,
                    }));
                  }}
                />
              </Space.Compact>
            ),
          },
          {
            key: 'keyword',
            label: '关键字',
            content: (
              <Input
                allowClear
                placeholder="请输入商户/门店/机构名称"
                value={draftFilters.keyword}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    keyword: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
        ]}
      />

      <div className="content-card qr-code-table-card">
        <div className="qr-code-toolbar">
          <Space wrap size={12}>
            <PermissionButton
              perm={QR_CODE_PERMS.bind}
              type="primary"
              className="qr-code-primary-action-btn"
              onClick={handleOpenBindModal}
            >
              绑定
            </PermissionButton>
            <PermissionButton
              perm={QR_CODE_PERMS.transfer}
              type="primary"
              className="qr-code-primary-action-btn"
              onClick={() => {
                setTransferModalOpen(true);
              }}
            >
              划拨/回调
            </PermissionButton>
            <PermissionButton
              perm={QR_CODE_PERMS.batchAdd}
              type="primary"
              icon={<PlusOutlined />}
              className="qr-code-primary-action-btn"
              onClick={() => {
                setCreateModalOpen(true);
              }}
            >
              生成收款码
            </PermissionButton>
            <PermissionButton
              perm={QR_CODE_PERMS.changeTemplate}
              onClick={() => {
                setBatchChangeTemplateOpen(true);
              }}
            >
              批量修改模板
            </PermissionButton>
            <PermissionButton
              perm={QR_CODE_PERMS.exportData}
              onClick={() => {
                showPendingActionMessage('导出收款码数据');
              }}
            >
              导出收款码数据
            </PermissionButton>
            <PermissionButton
              perm={QR_CODE_PERMS.exportQrcode}
              onClick={() => {
                showPendingActionMessage('导出二维码');
              }}
            >
              导出二维码
            </PermissionButton>
            <PermissionButton
              perm={QR_CODE_PERMS.exportCompose}
              onClick={() => {
                showPendingActionMessage('导出合成码');
              }}
            >
              导出合成码
            </PermissionButton>
          </Space>
        </div>

        {initialListLoading ? (
          <PageSectionSkeleton rows={8} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<QrCodeRecord>
            rowKey="id"
            loading={refreshingList}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={columns}
            dataSource={filteredRecords}
            scroll={{ x: 1940 }}
            locale={{
              emptyText: <Empty description="暂无收款码数据" />,
            }}
            pagination={{
              ...pagination,
              total: filteredTotal,
              onChange: (nextCurrent, nextPageSize) => {
                setPagination((prev) => ({
                  ...prev,
                  current: nextCurrent,
                  pageSize: nextPageSize,
                }));
              },
            }}
          />
        )}
      </div>

      <TransferModal
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        selectedRecords={records.filter((r) => selectedRowKeys.includes(r.id))}
        onOk={async (values) => {
          const snList = (Array.isArray(values?.items) ? values.items : [])
            .map((item: QrCodeRecord) => String(item?.sn || '').trim())
            .filter(Boolean);

          if (!snList.length) {
            message.warning('请选择有效的设备编号');
            return;
          }

          const res = await transferQrCode(
            {
              transferType:
                values?.actionType === 'callback' ? 'RETURN' : 'ISSUE',
              orgId:
                values?.actionType === 'callback' ? undefined : values?.orgId,
              snList,
            },
            {
              skipErrorHandler: true,
            },
          );

          message.success(getApiMessage(res, '操作成功'));
          setTransferModalOpen(false);
          setSelectedRowKeys([]);
          await loadQrCodes();
        }}
      />

      <BindQrCodeModal
        open={bindModalOpen}
        onCancel={() => {
          setBindModalOpen(false);
        }}
        onOk={async (values) => {
          const res = await bindQrCode(values, {
            skipErrorHandler: true,
          });
          message.success(getApiMessage(res, '绑定成功'));
          setBindModalOpen(false);
          setSelectedRowKeys([]);
          await loadQrCodes();
        }}
      />

      <CreateQrCodeModal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        templateOptions={templateOptions}
        templateLoading={templateLoading}
        onOk={async (values) => {
          const res = await batchAddQrCode(values, {
            skipErrorHandler: true,
          });
          message.success(getApiMessage(res, '生成收款码成功'));
          setCreateModalOpen(false);
          await loadQrCodes();
        }}
      />

      <BatchChangeTemplateModal
        open={batchChangeTemplateOpen}
        onCancel={() => setBatchChangeTemplateOpen(false)}
        templateOptions={templateOptions}
        templateLoading={templateLoading}
        onOk={async (values) => {
          const res = await changeQrCodeTemplate(values, {
            skipErrorHandler: true,
          });
          message.success(getApiMessage(res, '批量修改模板成功'));
          setBatchChangeTemplateOpen(false);
          await loadQrCodes();
        }}
      />

      <Image
        preview={{
          visible: previewOpen,
          src: previewImage,
          onVisibleChange: (visible) => {
            setPreviewOpen(visible);
            if (!visible) {
              setPreviewImage('');
            }
          },
        }}
        src={previewImage || undefined}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default StoreQrCodeListPage;
