import { LeftOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Modal, message, Radio, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';
import type { AgentOrgRecord } from '@/api/org';
import {
  getSpeakerListQuery,
  type SpeakerListQueryParams,
  type SpeakerRecord,
} from '@/api/speaker';
import { OrganizationPickerModal } from '@/components';
import { getErrorMessage } from '@/utils/apiMessage';
import { getSpeakerNameLines } from '../helpers';
import './SpeakerTransferModal.less';

type SpeakerTransferModalProps = {
  open: boolean;
  onCancel: () => void;
  onOk: (values: {
    actionType: 'transfer' | 'callback';
    orgId?: string;
    targetOrg?: AgentOrgRecord;
    searchMode: 'custom' | 'range' | 'batch';
    items: SpeakerRecord[];
  }) => Promise<void> | void;
  selectedRecords?: SpeakerRecord[];
};

function getOrgDisplayText(record?: AgentOrgRecord | null) {
  const orgName = String(record?.orgName || '').trim();
  const orgId = String(record?.id || '').trim();

  if (orgName && orgId) return `${orgName}（ID: ${orgId}）`;
  return orgName || orgId || '';
}

export const SpeakerTransferModal: React.FC<SpeakerTransferModalProps> = ({
  open,
  onCancel,
  onOk,
  selectedRecords = [],
}) => {
  const [actionType, setActionType] = useState<'transfer' | 'callback'>(
    'transfer',
  );
  const [targetOrg, setTargetOrg] = useState<AgentOrgRecord | null>(null);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'custom' | 'range' | 'batch'>(
    'custom',
  );
  const [customKeyword, setCustomKeyword] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [batchSn, setBatchSn] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leftData, setLeftData] = useState<SpeakerRecord[]>([]);
  const [leftSelectedRowKeys, setLeftSelectedRowKeys] = useState<React.Key[]>(
    [],
  );
  const [rightData, setRightData] = useState<SpeakerRecord[]>(selectedRecords);
  const [rightSelectedRowKeys, setRightSelectedRowKeys] = useState<React.Key[]>(
    [],
  );

  React.useEffect(() => {
    if (open) {
      setActionType('transfer');
      setTargetOrg(null);
      setOrgPickerOpen(false);
      setSearchMode('custom');
      setCustomKeyword('');
      setRangeStart('');
      setRangeEnd('');
      setBatchSn('');
      setLeftData([]);
      setLeftSelectedRowKeys([]);
      setRightData(selectedRecords);
      setRightSelectedRowKeys([]);
      setSearchLoading(false);
      setSubmitting(false);
    }
  }, [open, selectedRecords]);

  const rightIdSet = useMemo(
    () => new Set(rightData.map((item) => String(item.id))),
    [rightData],
  );

  const columns = useMemo<ColumnsType<SpeakerRecord>>(
    () => [
      {
        title: '设备编号',
        dataIndex: 'sn',
        width: 150,
        render: (value) => value || '-',
      },
      {
        title: '设备名称',
        key: 'speakerName',
        width: 180,
        render: (_, record) => getSpeakerNameLines(record)[0] || '-',
      },
      {
        title: '型号',
        dataIndex: 'model',
        width: 120,
        render: (value) => value || '-',
      },
    ],
    [],
  );

  const buildSearchParams = (): SpeakerListQueryParams => {
    if (searchMode === 'custom') {
      return {
        snList: customKeyword
          .split(/[\n,，\s]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      };
    }

    if (searchMode === 'range') {
      return {
        startSn: rangeStart.trim(),
        endSn: rangeEnd.trim(),
      };
    }

    return {
      batchSn: batchSn.trim(),
    };
  };

  const handleSearch = async () => {
    const params = buildSearchParams();
    if (
      !params.batchSn &&
      !params.startSn &&
      !params.endSn &&
      (!params.snList || params.snList.length === 0)
    ) {
      message.warning('请先填写搜索条件');
      return;
    }

    setSearchLoading(true);
    try {
      const list = await getSpeakerListQuery(params, {
        skipErrorHandler: true,
      });
      setLeftData(list.filter((item) => !rightIdSet.has(String(item.id))));
      setLeftSelectedRowKeys([]);
    } catch (error) {
      message.error(getErrorMessage(error, '获取云音响列表失败'));
    } finally {
      setSearchLoading(false);
    }
  };

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

  const handleOk = async () => {
    if (actionType === 'transfer' && !targetOrg?.id) {
      message.warning('请选择目标机构');
      return;
    }

    if (rightData.length === 0) {
      message.warning('请至少选择一台云音响');
      return;
    }

    setSubmitting(true);
    try {
      await onOk({
        actionType,
        orgId: targetOrg?.id,
        targetOrg: targetOrg || undefined,
        searchMode,
        items: rightData,
      });
    } catch (error) {
      message.error(getErrorMessage(error, '提交云音响划拨失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="划拨/回调云音响"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
      confirmLoading={submitting}
      width={1060}
      className="speaker-transfer-modal"
      destroyOnClose
    >
      <div className="speaker-transfer-filter-area">
        <div className="filter-row">
          <div className="filter-label">操作类型</div>
          <div className="filter-content">
            <Radio.Group
              value={actionType}
              onChange={(event) => setActionType(event.target.value)}
            >
              <Radio value="transfer">划拨/回调至其他机构</Radio>
              <Radio value="callback">回调</Radio>
            </Radio.Group>
          </div>
        </div>

        {actionType === 'transfer' && (
          <div className="filter-row">
            <div className="filter-label">目标机构</div>
            <div className="filter-content target-org-picker">
              <Input
                readOnly
                value={getOrgDisplayText(targetOrg)}
                placeholder="请选择机构"
                style={{ width: 260 }}
              />
              <Button
                icon={<SearchOutlined />}
                onClick={() => {
                  setOrgPickerOpen(true);
                }}
              >
                选择机构
              </Button>
              {targetOrg ? (
                <Button
                  type="link"
                  onClick={() => {
                    setTargetOrg(null);
                  }}
                >
                  清空
                </Button>
              ) : null}
            </div>
          </div>
        )}

        <div className="filter-row">
          <div className="filter-label">划拨方式</div>
          <div className="filter-content">
            <Radio.Group
              value={searchMode}
              onChange={(event) => setSearchMode(event.target.value)}
            >
              <Radio value="custom">自定义编号</Radio>
              <Radio value="range">按编号区间</Radio>
              <Radio value="batch">按批次号</Radio>
            </Radio.Group>
          </div>
        </div>

        <div className="filter-row filter-row-last">
          {searchMode === 'custom' && (
            <>
              <div className="filter-label">自定义编号</div>
              <div className="filter-content">
                <Input
                  value={customKeyword}
                  onChange={(event) => setCustomKeyword(event.target.value)}
                  placeholder="多个用英文,或换行隔开"
                  style={{ width: 220 }}
                />
                <Button
                  type="primary"
                  disabled={searchLoading}
                  onClick={handleSearch}
                >
                  搜索
                </Button>
              </div>
            </>
          )}

          {searchMode === 'range' && (
            <>
              <div className="filter-label">编号区间</div>
              <div className="filter-content">
                <Input
                  value={rangeStart}
                  onChange={(event) => setRangeStart(event.target.value)}
                  placeholder="起始编号"
                  style={{ width: 160 }}
                />
                <Input
                  value={rangeEnd}
                  onChange={(event) => setRangeEnd(event.target.value)}
                  placeholder="结束编号"
                  style={{ width: 160 }}
                />
                <Button
                  type="primary"
                  disabled={searchLoading}
                  onClick={handleSearch}
                >
                  搜索
                </Button>
              </div>
            </>
          )}

          {searchMode === 'batch' && (
            <>
              <div className="filter-label">批次号</div>
              <div className="filter-content">
                <Input
                  value={batchSn}
                  onChange={(event) => setBatchSn(event.target.value)}
                  placeholder="请输入批次号"
                  style={{ width: 220 }}
                />
                <Button
                  type="primary"
                  disabled={searchLoading}
                  onClick={handleSearch}
                >
                  搜索
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="speaker-transfer-shuttle-area">
        <div className="speaker-shuttle-panel">
          <div className="speaker-shuttle-table">
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
              locale={{ emptyText: '暂无数据' }}
            />
          </div>
          <div className="speaker-shuttle-footer">共计：{leftData.length}</div>
        </div>

        <div className="speaker-shuttle-actions">
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

        <div className="speaker-shuttle-panel">
          <div className="speaker-shuttle-table">
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
              locale={{ emptyText: '暂无数据' }}
            />
          </div>
          <div className="speaker-shuttle-footer">共计：{rightData.length}</div>
        </div>
      </div>
      <OrganizationPickerModal
        open={orgPickerOpen}
        onCancel={() => setOrgPickerOpen(false)}
        onSelect={(record) => {
          setTargetOrg(record);
          setOrgPickerOpen(false);
        }}
        selectedOrg={targetOrg}
      />
    </Modal>
  );
};
