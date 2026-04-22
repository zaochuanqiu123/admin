import { Alert, Empty, Popconfirm, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import type { QrCodeTemplateRecord } from '@/api/qrCodeTemplate';
import {
  PageSectionSkeleton,
  PermissionButton,
  PermissionVisible,
} from '@/components';
import { QR_TEMPLATE_PERMS } from '../constants';
import type { QrTemplateListActions, QrTemplateListState } from '../types';
import {
  buildPreviewImage,
  getShowSnLabel,
  getStateLabel,
} from '../utils/templateData';

type QrTemplateTableProps = {
  listState: QrTemplateListState;
  listActions: QrTemplateListActions;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onPreview: (imageUrl: string) => void;
};

const QrTemplateTable: React.FC<QrTemplateTableProps> = ({
  listState,
  listActions,
  onCreate,
  onEdit,
  onPreview,
}) => {
  const columns = useMemo<ColumnsType<QrCodeTemplateRecord>>(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 180,
        ellipsis: true,
      },
      {
        title: '模板名称',
        dataIndex: 'name',
        width: 220,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '预览',
        dataIndex: 'prevImageUrl',
        width: 160,
        render: (_value, record) => {
          const imageUrl = buildPreviewImage(record);
          if (imageUrl) {
            return (
              <div className="qr-template-preview-box">
                <img
                  src={imageUrl}
                  alt={record?.name || '二维码模板预览'}
                  className="qr-template-preview-image"
                  onClick={() => {
                    onPreview(imageUrl);
                  }}
                />
              </div>
            );
          }

          return (
            <div className="qr-template-preview-box qr-template-preview-box-placeholder">
              <span>暂无预览</span>
            </div>
          );
        },
      },
      {
        title: '显示编号',
        dataIndex: ['qrcodeSnConfig', 'isShow'],
        width: 120,
        render: (_value, record) => (
          <span
            className={`qr-template-chip ${
              Number(record?.qrcodeSnConfig?.isShow) === 1
                ? 'is-success'
                : 'is-muted'
            }`}
          >
            {getShowSnLabel(record)}
          </span>
        ),
      },
      {
        title: '状态',
        dataIndex: 'state',
        width: 120,
        render: (value) => (
          <span
            className={`qr-template-chip ${
              Number(value) === 1 ? 'is-success' : 'is-danger'
            }`}
          >
            {getStateLabel(value)}
          </span>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        width: 190,
        ellipsis: true,
        render: (value) => value || '-',
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <div className="qr-template-action-links">
            <PermissionVisible perm={QR_TEMPLATE_PERMS.update}>
              <a
                onClick={() => {
                  onEdit(record.id);
                }}
              >
                编辑
              </a>
            </PermissionVisible>
            <PermissionVisible perm={QR_TEMPLATE_PERMS.delete}>
              <Popconfirm
                title="确认删除该模板？"
                onConfirm={() => listActions.handleDeleteTemplate(record.id)}
              >
                <a className="is-danger">删除</a>
              </Popconfirm>
            </PermissionVisible>
          </div>
        ),
      },
    ],
    [listActions, onEdit, onPreview],
  );

  return (
    <div className="content-card qr-template-table-card">
      <div className="qr-template-toolbar">
        <PermissionButton
          perm={QR_TEMPLATE_PERMS.add}
          type="primary"
          shape="round"
          className="qr-template-add-btn"
          onClick={onCreate}
        >
          添加模板
        </PermissionButton>
      </div>

      {listState.initialListLoading ? (
        <PageSectionSkeleton rows={7} />
      ) : listState.listError && listState.records.length === 0 ? (
        <Alert type="error" showIcon message={listState.listError} />
      ) : (
        <Table<QrCodeTemplateRecord>
          rowKey="id"
          loading={listState.refreshingList}
          columns={columns}
          dataSource={listState.filteredRecords}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: <Empty description="暂无二维码模板" />,
          }}
          pagination={{
            ...listState.pagination,
            total: listState.filteredTotal,
            onChange: listActions.handlePageChange,
          }}
        />
      )}
    </div>
  );
};

export default QrTemplateTable;
