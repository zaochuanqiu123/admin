import { useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Input,
  Modal,
  message,
  Select,
  Switch,
  Table,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPrinterPageQuery,
  type PrinterConnectType,
  type PrinterOrgInfo,
  type PrinterPrintType,
  type PrinterRecord,
} from '@/api/printer';
import {
  ExpandableFilterCard,
  OrganizationPickerInput,
  PageSectionSkeleton,
  PermissionButton,
  PermissionVisible,
} from '@/components';
import { getErrorMessage } from '@/utils/apiMessage';
import {
  getCurrentIdentityItem,
  getIdentityItemsFromStorage,
} from '@/utils/identity';
import './index.less';

const DEFAULT_PAGE_SIZE = 10;
const PRINTER_PERMS = {
  add: 'admin:device:printer:add',
  detail: [
    'admin:device:printer:detail',
    'admin:device:printer:get',
  ] as string[],
};

const PRINT_TYPE_OPTIONS = [
  { label: 'TICKET-小票打印', value: 'TICKET' },
  { label: 'LABEL-标签打印', value: 'LABEL' },
];

const CONNECT_TYPE_OPTIONS = [
  { label: 'SERIAL-串口', value: 'SERIAL' },
  { label: 'USB-USB', value: 'USB' },
  { label: 'NETWORK-网络', value: 'NETWORK' },
  { label: 'BLUETOOTH-蓝牙', value: 'BLUETOOTH' },
  { label: 'CLOUD-云打印', value: 'CLOUD' },
];

type QueryFilters = {
  agentOrgId: string;
  groupOrgId: string;
  merchantOrgId: string;
  storeOrgId: string;
  sn: string;
  printerChannelId: string;
  printerChannelCode: string;
  model: string;
  printType?: PrinterPrintType;
  connectType?: PrinterConnectType;
  state?: string;
  bindName: string;
  snList: string;
  startSn: string;
  endSn: string;
};

function normalizeText(value?: string) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

function parseSnList(value: string) {
  const list = String(value || '')
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return list.length > 0 ? list : undefined;
}

function normalizeState(value?: string) {
  if (value === undefined || value === '') {
    return undefined;
  }

  const nextValue = Number(value);
  return Number.isNaN(nextValue) ? undefined : nextValue;
}

function getPrintTypeText(value?: PrinterPrintType) {
  if (value === 'TICKET') return '小票打印';
  if (value === 'LABEL') return '标签打印';
  return normalizeText(value) || '-';
}

function getConnectTypeText(value?: PrinterConnectType) {
  if (value === 'SERIAL') return '串口';
  if (value === 'USB') return 'USB';
  if (value === 'NETWORK') return '网络';
  if (value === 'BLUETOOTH') return '蓝牙';
  if (value === 'CLOUD') return '云打印';
  return normalizeText(value) || '-';
}

function getOrgLines(org?: PrinterOrgInfo, _fallbackOrgId?: string) {
  const lines = [
    normalizeText(org?.orgName),
    normalizeText(org?.orgCode) && `编码：${normalizeText(org?.orgCode)}`,
  ].filter(Boolean) as string[];

  return lines.length > 0 ? lines : ['-'];
}

function getPrinterChannelLines(record: PrinterRecord) {
  const lines = [
    normalizeText(record?.printerChannelCode),
    normalizeText(record?.printerChannelId) &&
      `通道ID：${normalizeText(record?.printerChannelId)}`,
  ].filter(Boolean) as string[];

  return lines.length > 0 ? lines : ['-'];
}

function renderMultiLines(lines: string[]) {
  const lineKeyCount = new Map<string, number>();

  return (
    <div className="printer-lines">
      {lines.map((item, index) => {
        const duplicateCount = lineKeyCount.get(item) ?? 0;
        lineKeyCount.set(item, duplicateCount + 1);
        const itemKey =
          duplicateCount === 0 ? item : `${item}-${duplicateCount}`;

        return (
          <div
            key={itemKey}
            className={index > 0 ? 'printer-sub-text' : undefined}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

const PrinterPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const identityItems = useMemo(() => getIdentityItemsFromStorage(), []);
  const currentIdentity = useMemo(
    () => getCurrentIdentityItem(initialState?.currentOrgCode, identityItems),
    [initialState?.currentOrgCode, identityItems],
  );
  const accountRole = currentIdentity?.levelName || '';
  const isStore = accountRole.includes('门店');
  const isMerchant = accountRole.includes('商户');
  const isAgent = accountRole.includes('代理');
  const isPlatform = !isMerchant && !isStore && !isAgent;

  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<PrinterRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [detailRecord, setDetailRecord] = useState<PrinterRecord | null>(null);
  const [draftFilters, setDraftFilters] = useState<QueryFilters>({
    agentOrgId: '',
    groupOrgId: '',
    merchantOrgId: '',
    storeOrgId: '',
    sn: '',
    printerChannelId: '',
    printerChannelCode: '',
    model: '',
    printType: undefined,
    connectType: undefined,
    state: undefined,
    bindName: '',
    snList: '',
    startSn: '',
    endSn: '',
  });
  const [filters, setFilters] = useState<QueryFilters>({
    agentOrgId: '',
    groupOrgId: '',
    merchantOrgId: '',
    storeOrgId: '',
    sn: '',
    printerChannelId: '',
    printerChannelCode: '',
    model: '',
    printType: undefined,
    connectType: undefined,
    state: undefined,
    bindName: '',
    snList: '',
    startSn: '',
    endSn: '',
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = Number(pagination.current || 1);
  const pageSize = Number(pagination.pageSize || DEFAULT_PAGE_SIZE);

  const loadPrinterPage = useCallback(async () => {
    setLoading(true);
    setListError(undefined);

    try {
      const res = await getPrinterPageQuery(
        {
          current,
          pageSize,
          agentOrgId: normalizeText(filters.agentOrgId),
          groupOrgId: normalizeText(filters.groupOrgId),
          merchantOrgId: normalizeText(filters.merchantOrgId),
          storeOrgId: normalizeText(filters.storeOrgId),
          sn: normalizeText(filters.sn),
          printerChannelId: normalizeText(filters.printerChannelId),
          printerChannelCode: normalizeText(filters.printerChannelCode),
          model: normalizeText(filters.model),
          printType: filters.printType,
          connectType: filters.connectType,
          state: normalizeState(filters.state),
          bindName: normalizeText(filters.bindName),
          snList: parseSnList(filters.snList),
          startSn: normalizeText(filters.startSn),
          endSn: normalizeText(filters.endSn),
        },
        {
          skipErrorHandler: true,
        },
      );

      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load printer page failed:', error);
      setListError(getErrorMessage(error, '获取打印机列表失败'));
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [
    current,
    filters.agentOrgId,
    filters.bindName,
    filters.connectType,
    filters.groupOrgId,
    filters.merchantOrgId,
    filters.model,
    filters.printType,
    filters.printerChannelCode,
    filters.printerChannelId,
    filters.sn,
    filters.snList,
    filters.startSn,
    filters.state,
    filters.endSn,
    filters.storeOrgId,
    pageSize,
  ]);

  useEffect(() => {
    void loadPrinterPage();
  }, [loadPrinterPage]);

  const columns = useMemo<ColumnsType<PrinterRecord>>(
    () =>
      [
        {
          title: '编号',
          dataIndex: 'sn',
          width: 180,
          ellipsis: true,
          render: (value: any) => value || '-',
        },
        isPlatform && {
          title: '代理组织',
          key: 'agentOrg',
          width: 180,
          render: (_: any, record: PrinterRecord) =>
            renderMultiLines(getOrgLines(record.agentOrg)),
        },
        (isPlatform || isAgent) && {
          title: '集团组织',
          key: 'groupOrg',
          width: 180,
          render: (_: any, record: PrinterRecord) =>
            renderMultiLines(getOrgLines(record.groupOrg)),
        },
        (isPlatform || isAgent) && {
          title: '商户组织',
          key: 'merchantOrg',
          width: 180,
          render: (_: any, record: PrinterRecord) =>
            renderMultiLines(getOrgLines(record.merchantOrg)),
        },
        (isPlatform || isAgent || isMerchant) && {
          title: '门店组织',
          key: 'storeOrg',
          width: 180,
          render: (_: any, record: PrinterRecord) =>
            renderMultiLines(getOrgLines(record.storeOrg)),
        },
        {
          title: '打印通道',
          key: 'printerChannel',
          width: 180,
          render: (_: unknown, record: PrinterRecord) =>
            renderMultiLines(getPrinterChannelLines(record)),
        },
        {
          title: '型号',
          dataIndex: 'model',
          width: 160,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '打印类型',
          dataIndex: 'printType',
          width: 130,
          render: (value: PrinterPrintType) => getPrintTypeText(value),
        },
        {
          title: '连接类型',
          dataIndex: 'connectType',
          width: 130,
          render: (value: PrinterConnectType) => getConnectTypeText(value),
        },
        {
          title: '绑定名称',
          dataIndex: 'bindName',
          width: 180,
          ellipsis: true,
          render: (value: string) => value || '-',
        },
        {
          title: '状态',
          dataIndex: 'state',
          width: 120,
          render: (value: string | number) => (
            <Switch
              checked={Number(value) === 1}
              checkedChildren="启用"
              unCheckedChildren="禁用"
              disabled
            />
          ),
        },
        {
          title: '创建时间',
          dataIndex: 'createTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '修改时间',
          dataIndex: 'updateTime',
          width: 180,
          render: (value: string) => value || '-',
        },
        {
          title: '操作',
          key: 'action',
          width: 120,
          fixed: 'right',
          render: (_: unknown, record: PrinterRecord) => (
            <div className="printer-action-links">
              <PermissionVisible perm={PRINTER_PERMS.detail}>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setDetailRecord(record);
                  }}
                >
                  查看详情
                </Button>
              </PermissionVisible>
            </div>
          ),
        },
      ].filter(Boolean) as ColumnsType<PrinterRecord>,
    [isPlatform, isAgent, isMerchant],
  );

  const handleSearch = () => {
    const nextFilters: QueryFilters = {
      agentOrgId: draftFilters.agentOrgId.trim(),
      groupOrgId: draftFilters.groupOrgId.trim(),
      merchantOrgId: draftFilters.merchantOrgId.trim(),
      storeOrgId: draftFilters.storeOrgId.trim(),
      sn: draftFilters.sn.trim(),
      printerChannelId: draftFilters.printerChannelId.trim(),
      printerChannelCode: draftFilters.printerChannelCode.trim(),
      model: draftFilters.model.trim(),
      printType: draftFilters.printType,
      connectType: draftFilters.connectType,
      state: draftFilters.state,
      bindName: draftFilters.bindName.trim(),
      snList: draftFilters.snList.trim(),
      startSn: draftFilters.startSn.trim(),
      endSn: draftFilters.endSn.trim(),
    };

    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleReset = () => {
    const nextFilters: QueryFilters = {
      agentOrgId: '',
      groupOrgId: '',
      merchantOrgId: '',
      storeOrgId: '',
      sn: '',
      printerChannelId: '',
      printerChannelCode: '',
      model: '',
      printType: undefined,
      connectType: undefined,
      state: undefined,
      bindName: '',
      snList: '',
      startSn: '',
      endSn: '',
    };

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
    <div className="printer-page">
      <ExpandableFilterCard
        className="printer-filter-card"
        onSearch={handleSearch}
        onReset={handleReset}
        fields={
          [
            isPlatform && {
              key: 'agentOrgId',
              label: '代理组织ID',
              content: (
                <OrganizationPickerInput
                  placeholder="请选择代理组织"
                  value={draftFilters.agentOrgId}
                  onChange={(value) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      agentOrgId: value,
                    }));
                  }}
                />
              ),
            },
            (isPlatform || isAgent) && {
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
            (isPlatform || isAgent) && {
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
            (isPlatform || isAgent || isMerchant) && {
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
              key: 'printerChannelId',
              label: '打印通道ID',
              content: (
                <Input
                  allowClear
                  placeholder="请输入打印通道ID"
                  value={draftFilters.printerChannelId}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      printerChannelId: event.target.value,
                    }));
                  }}
                  onPressEnter={handleSearch}
                />
              ),
            },
            {
              key: 'printerChannelCode',
              label: '打印通道编码',
              content: (
                <Input
                  allowClear
                  placeholder="请输入打印通道编码"
                  value={draftFilters.printerChannelCode}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      printerChannelCode: event.target.value,
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
              key: 'printType',
              label: '打印类型',
              content: (
                <Select
                  allowClear
                  placeholder="请选择"
                  value={draftFilters.printType}
                  options={PRINT_TYPE_OPTIONS}
                  onChange={(value) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      printType: value,
                    }));
                  }}
                />
              ),
            },
            {
              key: 'connectType',
              label: '连接类型',
              content: (
                <Select
                  allowClear
                  placeholder="请选择"
                  value={draftFilters.connectType}
                  options={CONNECT_TYPE_OPTIONS}
                  onChange={(value) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      connectType: value,
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
              label: '设备号集合',
              content: (
                <Input
                  allowClear
                  placeholder="多个编号用逗号或空格分隔"
                  value={draftFilters.snList}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      snList: event.target.value,
                    }));
                  }}
                  onPressEnter={handleSearch}
                />
              ),
            },
            {
              key: 'startSn',
              label: '起始设备号',
              content: (
                <Input
                  allowClear
                  placeholder="请输入起始设备号"
                  value={draftFilters.startSn}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      startSn: event.target.value,
                    }));
                  }}
                  onPressEnter={handleSearch}
                />
              ),
            },
            {
              key: 'endSn',
              label: '结束设备号',
              content: (
                <Input
                  allowClear
                  placeholder="请输入结束设备号"
                  value={draftFilters.endSn}
                  onChange={(event) => {
                    setDraftFilters((prev) => ({
                      ...prev,
                      endSn: event.target.value,
                    }));
                  }}
                  onPressEnter={handleSearch}
                />
              ),
            },
          ].filter(Boolean) as any
        }
      />

      <div className="content-card printer-table-card">
        <div className="printer-toolbar">
          <PermissionButton
            perm={PRINTER_PERMS.add}
            type="primary"
            className="printer-primary-action-btn"
            onClick={() => {
              message.info('打印机入库接口待补充，当前先保留权限化入口。');
            }}
          >
            打印机入库
          </PermissionButton>
        </div>

        {initialListLoading ? (
          <PageSectionSkeleton rows={8} />
        ) : listError && records.length === 0 ? (
          <Alert type="error" showIcon message={listError} />
        ) : (
          <Table<PrinterRecord>
            rowKey={(record) =>
              String(
                record.id ??
                  record.sn ??
                  `${record.printerChannelId || record.printerChannelCode || 'printer'}-${
                    record.bindName || ''
                  }`,
              )
            }
            loading={refreshingList}
            columns={columns}
            dataSource={records}
            scroll={{ x: 2240 }}
            locale={{
              emptyText: <Empty description="暂无打印机数据" />,
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

      <Modal
        title="打印机详情"
        open={Boolean(detailRecord)}
        onCancel={() => {
          setDetailRecord(null);
        }}
        footer={null}
        width={980}
        destroyOnClose
      >
        {detailRecord ? (
          <Descriptions
            bordered
            column={2}
            items={[
              { key: 'id', label: 'ID', children: detailRecord.id || '-' },
              { key: 'sn', label: '编号', children: detailRecord.sn || '-' },
              {
                key: 'printerChannelId',
                label: '打印通道ID',
                children: detailRecord.printerChannelId || '-',
              },
              {
                key: 'printerChannelCode',
                label: '打印通道编码',
                children: detailRecord.printerChannelCode || '-',
              },
              {
                key: 'model',
                label: '型号',
                children: detailRecord.model || '-',
              },
              {
                key: 'printType',
                label: '打印类型',
                children: getPrintTypeText(detailRecord.printType),
              },
              {
                key: 'connectType',
                label: '连接类型',
                children: getConnectTypeText(detailRecord.connectType),
              },
              {
                key: 'state',
                label: '状态',
                children: Number(detailRecord.state) === 1 ? '启用' : '禁用',
              },
              {
                key: 'bindName',
                label: '绑定名称',
                children: detailRecord.bindName || '-',
                span: 2,
              },
              {
                key: 'agentOrg',
                label: '代理组织',
                children: renderMultiLines(
                  getOrgLines(detailRecord.agentOrg, detailRecord.agentOrgId),
                ),
              },
              {
                key: 'groupOrg',
                label: '集团组织',
                children: renderMultiLines(
                  getOrgLines(detailRecord.groupOrg, detailRecord.groupOrgId),
                ),
              },
              {
                key: 'merchantOrg',
                label: '商户组织',
                children: renderMultiLines(
                  getOrgLines(
                    detailRecord.merchantOrg,
                    detailRecord.merchantOrgId,
                  ),
                ),
              },
              {
                key: 'storeOrg',
                label: '门店组织',
                children: renderMultiLines(
                  getOrgLines(detailRecord.storeOrg, detailRecord.storeOrgId),
                ),
              },
              {
                key: 'createTime',
                label: '创建时间',
                children: detailRecord.createTime || '-',
              },
              {
                key: 'updateTime',
                label: '修改时间',
                children: detailRecord.updateTime || '-',
              },
            ]}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default PrinterPage;
