import { Button, Input, Modal, Radio, Select, Space, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';
import {
  getQrCodeListQuery,
  type QrCodeListQueryParams,
  type QrCodeRecord,
} from '@/api/qrCode';
import './TransferModal.less';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { getErrorMessage } from '@/utils/apiMessage';

type TransferModalProps = {
  open: boolean;
  onCancel: () => void;
  onOk: (values: any) => Promise<void> | void;
  selectedRecords?: QrCodeRecord[];
};

export const TransferModal: React.FC<TransferModalProps> = ({
  open,
  onCancel,
  onOk,
  selectedRecords = [],
}) => {
  const [actionType, setActionType] = useState('transfer'); // transfer, callback
  const [transferType, setTransferType] = useState('custom'); // custom, range, batch
  const [customKeyword, setCustomKeyword] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [batchKeyword, setBatchKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Left List States (Source)
  const [leftData, setLeftData] = useState<QrCodeRecord[]>([]);
  const [leftSelectedRowKeys, setLeftSelectedRowKeys] = useState<React.Key[]>(
    [],
  );

  // Right List States (Target)
  const [rightData, setRightData] = useState<QrCodeRecord[]>(selectedRecords);
  const [rightSelectedRowKeys, setRightSelectedRowKeys] = useState<React.Key[]>(
    [],
  );

  // We should initialize the right list with the selected items from the parent
  React.useEffect(() => {
    if (open) {
      setRightData(selectedRecords);
      setLeftData([]);
      setLeftSelectedRowKeys([]);
      setRightSelectedRowKeys([]);
      setSubmitting(false);
    }
  }, [open, selectedRecords]);

  const rightDataIdSet = useMemo(
    () => new Set(rightData.map((item) => String(item.id))),
    [rightData],
  );

  const buildSearchParams = (): QrCodeListQueryParams => {
    if (transferType === 'custom') {
      return {
        snList: customKeyword
          .split(/[\n,，\s]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      };
    }

    if (transferType === 'range') {
      return {
        startSn: rangeStart.trim(),
        endSn: rangeEnd.trim(),
      };
    }

    return {
      batchSn: batchKeyword.trim(),
    };
  };

  const handleSearch = async () => {
    setSearchLoading(true);
    try {
      const records = await getQrCodeListQuery(buildSearchParams(), {
        skipErrorHandler: true,
      });
      setLeftData(
        records.filter((item) => !rightDataIdSet.has(String(item.id))),
      );
      setLeftSelectedRowKeys([]);
    } catch (error: any) {
      message.error(getErrorMessage(error, '获取二维码列表失败'));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleOk = async () => {
    setSubmitting(true);
    try {
      await onOk({
        actionType,
        transferType,
        items: rightData,
      });
    } catch (error) {
      message.error(getErrorMessage(error, '提交划拨操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle moving items from Left to Right
  const handleMoveToRight = () => {
    const itemsToMove = leftData.filter((item) =>
      leftSelectedRowKeys.includes(item.id),
    );
    setRightData((prev) => {
      const existingIds = new Set(prev.map((item) => String(item.id)));
      return [
        ...prev,
        ...itemsToMove.filter((item) => !existingIds.has(String(item.id))),
      ];
    });
    setLeftData((prev) =>
      prev.filter((item) => !leftSelectedRowKeys.includes(item.id)),
    );
    setLeftSelectedRowKeys([]);
  };

  // Handle moving items from Right to Left
  const handleMoveToLeft = () => {
    const itemsToMove = rightData.filter((item) =>
      rightSelectedRowKeys.includes(item.id),
    );
    setLeftData((prev) => [...prev, ...itemsToMove]);
    setRightData((prev) =>
      prev.filter((item) => !rightSelectedRowKeys.includes(item.id)),
    );
    setRightSelectedRowKeys([]);
  };

  const columns: ColumnsType<QrCodeRecord> = useMemo(
    () => [
      {
        title: '设备编号',
        dataIndex: 'sn',
        width: 140,
        render: (val: string) => String(val || '-'),
      },
      {
        title: '类别',
        dataIndex: 'bizType',
        width: 100,
        render: (val: string) => {
          if (val === 'RECEIPT_CODE') return '收款码';
          if (val === 'CATER_TABLE') return '餐饮桌台';
          if (val === 'OTHER') return '其他业务';
          return String(val || '-');
        },
      },
      {
        title: '型号',
        dataIndex: 'model',
        width: 100,
        render: (val: string) => String(val || '-'),
      },
    ],
    [],
  );

  return (
    <Modal
      title="划拨/回调收款码"
      open={open}
      onCancel={onCancel}
      width={1000}
      className="qr-code-transfer-modal"
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnClose
    >
      <div className="transfer-filter-area">
        <div className="filter-row">
          <div className="filter-label">操作类型</div>
          <div className="filter-content">
            <Radio.Group
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
            >
              <Radio value="transfer">划拨/网签至其他机构</Radio>
              <Radio value="callback">回调</Radio>
            </Radio.Group>
          </div>
        </div>

        {actionType === 'transfer' && (
          <div className="filter-row">
            <div className="filter-label">目标机构</div>
            <div className="filter-content">
              <Select
                placeholder="请选择机构"
                style={{ width: 300 }}
                options={[{ label: '测试分公司A', value: '1' }]} // Mock
              />
            </div>
          </div>
        )}

        <div className="filter-row">
          <div className="filter-label">划拨方式</div>
          <div className="filter-content">
            <Radio.Group
              value={transferType}
              onChange={(e) => setTransferType(e.target.value)}
            >
              <Radio value="custom">自定义编号</Radio>
              <Radio value="range">按编号区间</Radio>
              <Radio value="batch">按批次号</Radio>
            </Radio.Group>
          </div>
        </div>

        <div className="filter-row" style={{ marginTop: 24 }}>
          {transferType === 'custom' && (
            <>
              <div className="filter-label">自定义编号</div>
              <div className="filter-content">
                <Input
                  placeholder="多个用换行符、逗号隔开"
                  style={{ width: 200 }}
                  value={customKeyword}
                  onChange={(event) => setCustomKeyword(event.target.value)}
                />
                <Button type="primary" disabled={searchLoading} onClick={handleSearch}>
                  搜索
                </Button>
              </div>
            </>
          )}

          {transferType === 'range' && (
            <>
              <div className="filter-label">编号区间</div>
              <div className="filter-content">
                <Space.Compact>
                  <Input
                    placeholder="起始编号"
                    style={{ width: 150 }}
                    value={rangeStart}
                    onChange={(event) => setRangeStart(event.target.value)}
                  />
                  <Input
                    placeholder="截止编号"
                    style={{ width: 150 }}
                    value={rangeEnd}
                    onChange={(event) => setRangeEnd(event.target.value)}
                  />
                </Space.Compact>
                <Button type="primary" disabled={searchLoading} onClick={handleSearch}>
                  搜索
                </Button>
              </div>
            </>
          )}

          {transferType === 'batch' && (
            <>
              <div className="filter-label">批次号</div>
              <div className="filter-content">
                <Input
                  placeholder="请输入批次号"
                  style={{ width: 200 }}
                  value={batchKeyword}
                  onChange={(event) => setBatchKeyword(event.target.value)}
                />
                <Button type="primary" disabled={searchLoading} onClick={handleSearch}>
                  搜索
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="transfer-shuttle-area">
        <div className="shuttle-panel">
          <div className="shuttle-panel-table">
            <Table
              rowKey="id"
              loading={searchLoading}
              dataSource={leftData}
              columns={columns}
              rowSelection={{
                selectedRowKeys: leftSelectedRowKeys,
                onChange: setLeftSelectedRowKeys,
              }}
              pagination={false}
              size="small"
              scroll={{ y: 250 }}
            />
          </div>
          <div className="shuttle-panel-footer">共计：{leftData.length}</div>
        </div>

        <div className="shuttle-actions">
          <Button
            type="primary"
            icon={<RightOutlined />}
            disabled={leftSelectedRowKeys.length === 0}
            onClick={handleMoveToRight}
          />
          <Button
            type="primary"
            icon={<LeftOutlined />}
            disabled={rightSelectedRowKeys.length === 0}
            onClick={handleMoveToLeft}
          />
        </div>

        <div className="shuttle-panel">
          <div className="shuttle-panel-table">
            <Table
              rowKey="id"
              dataSource={rightData}
              columns={columns}
              rowSelection={{
                selectedRowKeys: rightSelectedRowKeys,
                onChange: setRightSelectedRowKeys,
              }}
              pagination={false}
              size="small"
              scroll={{ y: 250 }}
            />
          </div>
          <div className="shuttle-panel-footer">共计：{rightData.length}</div>
        </div>
      </div>
    </Modal>
  );
};
