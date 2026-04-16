import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
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
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
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
  agentOrgId: string;
  groupOrgId: string;
  merchantOrgId: string;
  storeOrgId: string;
  storeOrgUserId: string;
  bizType?: string;
  sn: string;
  snList: string;
  startSn: string;
  endSn: string;
  batchSn: string;
  qrcodeTemplateId?: string;
  openType?: string;
  bindName: string;
  model: string;
};

const DEFAULT_PAGE_SIZE = 10;
const OPEN_TYPE_OPTIONS = [
  { label: '小程序', value: 'MINI' },
  { label: 'H5', value: 'H5' },
];
const BIZ_TYPE_OPTIONS = [
  { label: '收款码', value: 'RECEIPT_CODE' },
  { label: '餐饮桌台', value: 'CATER_TABLE' },
  { label: '其他业务', value: 'OTHER' },
];

function createEmptyFilters(): QueryFilters {
  return {
    agentOrgId: '',
    groupOrgId: '',
    merchantOrgId: '',
    storeOrgId: '',
    storeOrgUserId: '',
    bizType: undefined,
    sn: '',
    snList: '',
    startSn: '',
    endSn: '',
    batchSn: '',
    qrcodeTemplateId: undefined,
    openType: undefined,
    bindName: '',
    model: '',
  };
}

function parseSnList(value: string) {
  return value
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

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

function getOrgDisplay(record: QrCodeRecord) {
  return (
    [readText(record?.agentOrg?.orgName), readText(record?.groupOrg?.orgName)]
      .filter(Boolean)
      .join(' / ') ||
    readText(record?.agentOrgId, record?.groupOrgId) ||
    '-'
  );
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

  const [draftFilters, setDraftFilters] =
    useState<QueryFilters>(createEmptyFilters);
  const [filters, setFilters] = useState<QueryFilters>(createEmptyFilters);
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
        brandName: currentOption?.brandName,
      });
    });
    return Array.from(templateMap.values());
  }, [records, templateOptionsSource]);

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
      const snList = parseSnList(filters.snList);
      const res = await getQrCodePageQuery(
        {
          current,
          pageSize,
          agentOrgId: filters.agentOrgId.trim() || undefined,
          groupOrgId: filters.groupOrgId.trim() || undefined,
          merchantOrgId: filters.merchantOrgId.trim() || undefined,
          storeOrgId: filters.storeOrgId.trim() || undefined,
          storeOrgUserId: filters.storeOrgUserId.trim() || undefined,
          sn: filters.sn.trim() || undefined,
          batchSn: filters.batchSn.trim() || undefined,
          model: filters.model.trim() || undefined,
          qrcodeTemplateId: filters.qrcodeTemplateId || undefined,
          openType: filters.openType || undefined,
          bizType: filters.bizType || undefined,
          bindName: filters.bindName.trim() || undefined,
          snList: snList.length > 0 ? snList : undefined,
          startSn: filters.startSn.trim() || undefined,
          endSn: filters.endSn.trim() || undefined,
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
    filters.agentOrgId,
    current,
    filters.batchSn,
    filters.bindName,
    filters.bizType,
    filters.endSn,
    filters.groupOrgId,
    filters.merchantOrgId,
    filters.model,
    filters.openType,
    filters.qrcodeTemplateId,
    filters.sn,
    filters.snList,
    filters.startSn,
    filters.storeOrgId,
    filters.storeOrgUserId,
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
      agentOrgId: draftFilters.agentOrgId.trim(),
      groupOrgId: draftFilters.groupOrgId.trim(),
      merchantOrgId: draftFilters.merchantOrgId.trim(),
      storeOrgId: draftFilters.storeOrgId.trim(),
      storeOrgUserId: draftFilters.storeOrgUserId.trim(),
      sn: draftFilters.sn.trim(),
      snList: draftFilters.snList.trim(),
      startSn: draftFilters.startSn.trim(),
      endSn: draftFilters.endSn.trim(),
      batchSn: draftFilters.batchSn.trim(),
      bindName: draftFilters.bindName.trim(),
      model: draftFilters.model.trim(),
    });
  };

  const handleReset = () => {
    const nextFilters = createEmptyFilters();
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

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
            key: 'agentOrgId',
            label: '代理组织ID',
            content: (
              <Input
                allowClear
                placeholder="请输入代理组织ID"
                value={draftFilters.agentOrgId}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    agentOrgId: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'groupOrgId',
            label: '集团组织ID',
            content: (
              <Input
                allowClear
                placeholder="请输入集团组织ID"
                value={draftFilters.groupOrgId}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    groupOrgId: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'merchantOrgId',
            label: '商户组织ID',
            content: (
              <Input
                allowClear
                placeholder="请输入商户组织ID"
                value={draftFilters.merchantOrgId}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    merchantOrgId: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'storeOrgId',
            label: '门店组织ID',
            content: (
              <Input
                allowClear
                placeholder="请输入门店组织ID"
                value={draftFilters.storeOrgId}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    storeOrgId: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'storeOrgUserId',
            label: '门店员工ID',
            content: (
              <Input
                allowClear
                placeholder="请输入门店员工ID"
                value={draftFilters.storeOrgUserId}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    storeOrgUserId: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
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
            key: 'model',
            label: '型号',
            content: (
              <Input
                allowClear
                placeholder="请输入型号"
                value={draftFilters.model}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    model: event.target.value,
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
                options={OPEN_TYPE_OPTIONS}
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
            key: 'bizType',
            label: '业务类型',
            content: (
              <Select
                allowClear
                placeholder="请选择"
                value={draftFilters.bizType}
                options={BIZ_TYPE_OPTIONS}
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
            key: 'bindName',
            label: '绑定名称',
            content: (
              <Input
                allowClear
                placeholder="请输入绑定名称"
                value={draftFilters.bindName}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    bindName: event.target.value,
                  }));
                }}
                onPressEnter={handleSearch}
              />
            ),
          },
          {
            key: 'snList',
            label: '编号集合',
            content: (
              <Input.TextArea
                allowClear
                autoSize={{ minRows: 1, maxRows: 3 }}
                placeholder="多个编号用逗号、空格或换行分隔"
                value={draftFilters.snList}
                onChange={(event) => {
                  setDraftFilters((prev) => ({
                    ...prev,
                    snList: event.target.value,
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
                  value={draftFilters.startSn}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      startSn: event.target.value,
                    }));
                  }}
                />
                <Input
                  placeholder="请输入截止编号"
                  value={draftFilters.endSn}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      endSn: event.target.value,
                    }));
                  }}
                />
              </Space.Compact>
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
            dataSource={records}
            scroll={{ x: 1940 }}
            locale={{
              emptyText: <Empty description="暂无收款码数据" />,
            }}
            pagination={{
              ...pagination,
              total: serverTotal,
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
