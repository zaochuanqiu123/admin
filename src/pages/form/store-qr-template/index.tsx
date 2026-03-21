import {
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import {
  Button,
  ColorPicker,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  message,
  QRCode,
  Select,
  Slider,
  Space,
  Spin,
  Switch,
  Table,
  Upload,
} from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getQrCodeTemplatePageQuery,
  type QrCodeTemplateRecord,
} from '@/api/qrCodeTemplate';
import './index.less';

const { RangePicker } = DatePicker;

type QueryFilters = {
  name: string;
  state?: string;
  showSn?: string;
  createTimeRange?: RangePickerProps['value'];
};

type EditorSelection = 'qrcode' | 'codeText' | null;

type EditorStateModel = {
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage: string | null;
  qrcode: {
    x: number;
    y: number;
    size: number;
  };
  codeText: {
    offsetY: number;
    fontSize: number;
    color: string;
  };
  showCodeText: boolean;
};

type DragState = {
  type: 'qrcode' | 'qrcodeResize' | 'codeText';
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialSize?: number;
};

type CropDraft = {
  sourceUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_CANVAS_WIDTH = 500;
const MAX_CANVAS_HEIGHT = 600;

const DEFAULT_EDITOR_STATE: EditorStateModel = {
  canvasWidth: 320,
  canvasHeight: 420,
  backgroundImage: null,
  qrcode: {
    x: 88,
    y: 112,
    size: 144,
  },
  codeText: {
    offsetY: 14,
    fontSize: 16,
    color: '#1f2837',
  },
  showCodeText: true,
};

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function clampCodeTextOffset(
  nextOffset: number,
  nextState: Pick<EditorStateModel, 'canvasHeight' | 'qrcode' | 'codeText'>,
) {
  const minOffset = -Math.max(0, nextState.qrcode.size - 24);
  const rawMaxOffset =
    nextState.canvasHeight -
    (nextState.qrcode.y + nextState.qrcode.size) -
    nextState.codeText.fontSize -
    10;
  const maxOffset = Math.max(minOffset, rawMaxOffset);
  return clamp(nextOffset, minOffset, maxOffset);
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('load image failed'));
    image.src = url;
  });
}

function revokeObjectUrl(url?: string | null) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

function getShowSnLabel(record: QrCodeTemplateRecord) {
  return Number(record?.qrCodeSnConfig?.isShow) === 1 ? '显示' : '隐藏';
}

function getStateLabel(state?: number) {
  if (Number(state) === 1) return '启用';
  if (Number(state) === 0) return '禁用';
  return '未知';
}

function buildPreviewImage(record: QrCodeTemplateRecord) {
  return String(record?.prevImageUrl || record?.prevImage || '').trim();
}

function showPendingEditorMessage() {
  message.info('编辑模板接口待接入，当前先完成添加模板抽屉页面。');
}

const QrTemplateListPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<QrCodeTemplateRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [drawerForm] = Form.useForm();
  const [editorState, setEditorState] =
    useState<EditorStateModel>(DEFAULT_EDITOR_STATE);
  const [selection, setSelection] = useState<EditorSelection>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [cropDragState, setCropDragState] = useState<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const [draftFilters, setDraftFilters] = useState<QueryFilters>({
    name: '',
    state: undefined,
    showSn: undefined,
    createTimeRange: undefined,
  });
  const [filters, setFilters] = useState<QueryFilters>({
    name: '',
    state: undefined,
    showSn: undefined,
    createTimeRange: undefined,
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  });
  const backgroundObjectUrlRef = useRef<string | null>(null);
  const backgroundSourceObjectUrlRef = useRef<string | null>(null);

  const current = pagination.current || 1;
  const pageSize = pagination.pageSize || DEFAULT_PAGE_SIZE;

  const releaseBackgroundResources = useCallback(() => {
    revokeObjectUrl(backgroundObjectUrlRef.current);
    backgroundObjectUrlRef.current = null;
    revokeObjectUrl(backgroundSourceObjectUrlRef.current);
    backgroundSourceObjectUrlRef.current = null;
  }, []);

  const clearBackgroundPreview = useCallback(() => {
    releaseBackgroundResources();
    setEditorState((prev) => ({
      ...prev,
      backgroundImage: null,
    }));
    setCropDraft(null);
  }, [releaseBackgroundResources]);

  const resetEditorState = useCallback(() => {
    releaseBackgroundResources();
    setEditorState(DEFAULT_EDITOR_STATE);
    setSelection(null);
    setDragState(null);
    setCropDraft(null);
    setCropModalOpen(false);
    setCropDragState(null);
  }, [releaseBackgroundResources]);

  useEffect(() => {
    return () => {
      revokeObjectUrl(backgroundObjectUrlRef.current);
      revokeObjectUrl(backgroundSourceObjectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (dragState.type === 'qrcode') {
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;

        setEditorState((prev) => {
          const maxX = Math.max(0, prev.canvasWidth - prev.qrcode.size);
          const maxY = Math.max(0, prev.canvasHeight - prev.qrcode.size);

          return {
            ...prev,
            qrcode: {
              ...prev.qrcode,
              x: clamp(dragState.initialX + deltaX, 0, maxX),
              y: clamp(dragState.initialY + deltaY, 0, maxY),
            },
          };
        });
        return;
      }

      if (dragState.type === 'qrcodeResize') {
        const delta = Math.max(
          event.clientX - dragState.startX,
          event.clientY - dragState.startY,
        );

        setEditorState((prev) => {
          const maxSize = Math.min(
            prev.canvasWidth - prev.qrcode.x,
            prev.canvasHeight - prev.qrcode.y,
          );
          const size = clamp(
            Number(dragState.initialSize || prev.qrcode.size) + delta,
            72,
            maxSize,
          );
          const nextQrcode = {
            ...prev.qrcode,
            size,
          };

          return {
            ...prev,
            qrcode: nextQrcode,
            codeText: {
              ...prev.codeText,
              offsetY: clampCodeTextOffset(prev.codeText.offsetY, {
                canvasHeight: prev.canvasHeight,
                qrcode: nextQrcode,
                codeText: prev.codeText,
              }),
            },
          };
        });
        return;
      }

      const deltaY = event.clientY - dragState.startY;
      setEditorState((prev) => ({
        ...prev,
        codeText: {
          ...prev.codeText,
          offsetY: clampCodeTextOffset(dragState.initialY + deltaY, prev),
        },
      }));
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  useEffect(() => {
    if (!cropDragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      setCropDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          offsetX:
            cropDragState.initialX + (event.clientX - cropDragState.startX),
          offsetY:
            cropDragState.initialY + (event.clientY - cropDragState.startY),
        };
      });
    };

    const handleMouseUp = () => {
      setCropDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [cropDragState]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQrCodeTemplatePageQuery({
        current,
        pageSize,
        name: filters.name.trim() || undefined,
      });
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load qr code templates failed:', error);
      setRecords([]);
      setServerTotal(0);
      message.error('获取二维码模板列表失败');
    } finally {
      setLoading(false);
    }
  }, [current, filters.name, pageSize]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.state !== undefined && filters.state !== '') {
        if (String(Number(record?.state ?? 0)) !== String(filters.state)) {
          return false;
        }
      }

      if (filters.showSn !== undefined && filters.showSn !== '') {
        if (
          String(Number(record?.qrCodeSnConfig?.isShow ?? 0)) !==
          String(filters.showSn)
        ) {
          return false;
        }
      }

      const range = filters.createTimeRange;
      if (range && range[0] && range[1] && record?.createTime) {
        const createTime = dayjs(record.createTime);
        if (createTime.isValid()) {
          const start = range[0].startOf('day');
          const end = range[1].endOf('day');
          if (createTime.isBefore(start) || createTime.isAfter(end)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [filters.createTimeRange, filters.showSn, filters.state, records]);

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
                    setPreviewImage(imageUrl);
                    setPreviewOpen(true);
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
        dataIndex: ['qrCodeSnConfig', 'isShow'],
        width: 120,
        render: (_value, record) => (
          <span
            className={`qr-template-chip ${
              Number(record?.qrCodeSnConfig?.isShow) === 1
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
            <a
              onClick={() => {
                void record;
                showPendingEditorMessage();
              }}
            >
              编辑
            </a>
          </div>
        ),
      },
    ],
    [],
  );

  const handleSearch = () => {
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
    setFilters({
      ...draftFilters,
      name: draftFilters.name.trim(),
    });
  };

  const handleReset = () => {
    const nextFilters: QueryFilters = {
      name: '',
      state: undefined,
      showSn: undefined,
      createTimeRange: undefined,
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const filteredTotal =
    filters.state || filters.showSn || filters.createTimeRange
      ? filteredRecords.length
      : serverTotal;

  const openCreateDrawer = () => {
    drawerForm.setFieldsValue({
      name: '',
      state: 1,
      isDefault: false,
      showSn: true,
      remark: '',
    });
    resetEditorState();
    setDrawerOpen(true);
  };

  const handleCanvasWidthChange = (value: number | null) => {
    setEditorState((prev) => {
      const canvasWidth = clamp(Number(value || 0), 120, MAX_CANVAS_WIDTH);
      const nextSize = clamp(
        prev.qrcode.size,
        72,
        Math.min(canvasWidth, prev.canvasHeight),
      );

      return {
        ...prev,
        canvasWidth,
        qrcode: {
          ...prev.qrcode,
          size: nextSize,
          x: clamp(prev.qrcode.x, 0, Math.max(0, canvasWidth - nextSize)),
          y: clamp(prev.qrcode.y, 0, Math.max(0, prev.canvasHeight - nextSize)),
        },
      };
    });
  };

  const handleCanvasHeightChange = (value: number | null) => {
    setEditorState((prev) => {
      const canvasHeight = clamp(Number(value || 0), 120, MAX_CANVAS_HEIGHT);
      const nextSize = clamp(
        prev.qrcode.size,
        72,
        Math.min(prev.canvasWidth, canvasHeight),
      );
      const nextQrcode = {
        ...prev.qrcode,
        size: nextSize,
        x: clamp(prev.qrcode.x, 0, Math.max(0, prev.canvasWidth - nextSize)),
        y: clamp(prev.qrcode.y, 0, Math.max(0, canvasHeight - nextSize)),
      };

      return {
        ...prev,
        canvasHeight,
        qrcode: nextQrcode,
        codeText: {
          ...prev.codeText,
          offsetY: clampCodeTextOffset(prev.codeText.offsetY, {
            canvasHeight,
            qrcode: nextQrcode,
            codeText: prev.codeText,
          }),
        },
      };
    });
  };

  const handleShowCodeTextChange = (checked: boolean) => {
    setEditorState((prev) => ({
      ...prev,
      showCodeText: checked,
    }));

    if (!checked && selection === 'codeText') {
      setSelection('qrcode');
    }
  };

  const handleCodeTextFontSizeChange = (value: number | null) => {
    setEditorState((prev) => {
      const nextCodeText = {
        ...prev.codeText,
        fontSize: clamp(Number(value || 0), 12, 36),
      };

      return {
        ...prev,
        codeText: {
          ...nextCodeText,
          offsetY: clampCodeTextOffset(nextCodeText.offsetY, {
            canvasHeight: prev.canvasHeight,
            qrcode: prev.qrcode,
            codeText: nextCodeText,
          }),
        },
      };
    });
  };

  const handleCodeTextColorChange = (color: string) => {
    setEditorState((prev) => ({
      ...prev,
      codeText: {
        ...prev.codeText,
        color,
      },
    }));
  };

  const backgroundUploadProps: UploadProps = {
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: async (file) => {
      revokeObjectUrl(backgroundSourceObjectUrlRef.current);

      const sourceUrl = URL.createObjectURL(file);
      backgroundSourceObjectUrlRef.current = sourceUrl;

      try {
        const image = await loadImage(sourceUrl);
        setCropDraft({
          sourceUrl,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        });
        setCropModalOpen(true);
      } catch (error) {
        console.error('load background image failed:', error);
        message.error('图片读取失败，请重试');
        revokeObjectUrl(sourceUrl);
        backgroundSourceObjectUrlRef.current = null;
      }

      return false;
    },
  };

  const handleCropConfirm = async () => {
    if (!cropDraft) return;

    setCropLoading(true);
    try {
      const image = await loadImage(cropDraft.sourceUrl);
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = editorState.canvasWidth;
      exportCanvas.height = editorState.canvasHeight;
      const context = exportCanvas.getContext('2d');
      if (!context) throw new Error('canvas context unavailable');

      const previewWidth = 420;
      const previewHeight = Math.round(
        previewWidth * (editorState.canvasHeight / editorState.canvasWidth),
      );
      const baseScale = Math.max(
        previewWidth / cropDraft.naturalWidth,
        previewHeight / cropDraft.naturalHeight,
      );
      const totalScale = baseScale * cropDraft.zoom;
      const imageDrawWidth = cropDraft.naturalWidth * totalScale;
      const imageDrawHeight = cropDraft.naturalHeight * totalScale;
      const previewLeft =
        (previewWidth - imageDrawWidth) / 2 + cropDraft.offsetX;
      const previewTop =
        (previewHeight - imageDrawHeight) / 2 + cropDraft.offsetY;
      const ratioX = editorState.canvasWidth / previewWidth;
      const ratioY = editorState.canvasHeight / previewHeight;

      context.drawImage(
        image,
        previewLeft * ratioX,
        previewTop * ratioY,
        imageDrawWidth * ratioX,
        imageDrawHeight * ratioY,
      );

      const dataUrl = exportCanvas.toDataURL('image/png');
      revokeObjectUrl(backgroundObjectUrlRef.current);
      backgroundObjectUrlRef.current = dataUrl;
      setEditorState((prev) => ({
        ...prev,
        backgroundImage: dataUrl,
      }));
      setCropModalOpen(false);
      setCropDragState(null);
      message.success('背景图裁剪完成');
    } catch (error) {
      console.error('crop background image failed:', error);
      message.error('背景图裁剪失败，请重试');
    } finally {
      setCropLoading(false);
    }
  };

  const handleDrawerSubmit = async () => {
    try {
      await drawerForm.validateFields();
      message.success('模板编辑抽屉已接好，保存接口待接入。');
    } catch (error: any) {
      if (error?.errorFields) return;
    }
  };

  const activeSelection =
    selection === 'codeText'
      ? editorState.showCodeText
        ? 'codeText'
        : null
      : selection === 'qrcode'
        ? 'qrcode'
        : null;

  const codeTextTop =
    editorState.qrcode.y +
    editorState.qrcode.size +
    editorState.codeText.offsetY;
  const cropPreviewWidth = 420;
  const cropPreviewHeight = Math.round(
    cropPreviewWidth * (editorState.canvasHeight / editorState.canvasWidth),
  );
  const cropBaseScale = cropDraft
    ? Math.max(
        cropPreviewWidth / cropDraft.naturalWidth,
        cropPreviewHeight / cropDraft.naturalHeight,
      )
    : 1;
  const cropImageWidth = cropDraft
    ? cropDraft.naturalWidth * cropBaseScale * cropDraft.zoom
    : 0;
  const cropImageHeight = cropDraft
    ? cropDraft.naturalHeight * cropBaseScale * cropDraft.zoom
    : 0;

  return (
    <div className="qr-template-page">
      <div className="content-card qr-template-filter-card">
        <div className="filter-grid">
          <div className="field">
            <span className="field-label">模板名称</span>
            <Input
              allowClear
              placeholder="请输入模板名称"
              value={draftFilters.name}
              onChange={(event) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  name: event.target.value,
                }));
              }}
              onPressEnter={handleSearch}
            />
          </div>

          <div className="field">
            <span className="field-label">创建时间</span>
            <RangePicker
              value={draftFilters.createTimeRange}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  createTimeRange: value || undefined,
                }));
              }}
            />
          </div>

          <div className="field">
            <span className="field-label">状态</span>
            <Select
              allowClear
              placeholder="请选择状态"
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
          </div>

          <div className="field">
            <span className="field-label">显示编号</span>
            <Select
              allowClear
              placeholder="请选择"
              value={draftFilters.showSn}
              options={[
                { label: '显示', value: '1' },
                { label: '隐藏', value: '0' },
              ]}
              onChange={(value) => {
                setDraftFilters((prev) => ({
                  ...prev,
                  showSn: value,
                }));
              }}
            />
          </div>

          <div className="field actions">
            <Button type="primary" onClick={handleSearch}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </div>
        </div>
      </div>

      <div className="content-card qr-template-table-card">
        <div className="qr-template-toolbar">
          <Button
            type="primary"
            shape="round"
            icon={<PlusOutlined />}
            className="qr-template-add-btn"
            onClick={openCreateDrawer}
          >
            添加模板
          </Button>
          <div className="qr-template-toolbar-note">
            当前列表基于模板名称走远程分页，状态/显示编号/创建时间按当前页结果过滤。
          </div>
        </div>

        <Table<QrCodeTemplateRecord>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredRecords}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: <Empty description="暂无二维码模板" />,
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
      </div>

      <Drawer
        title="添加模板"
        width={1040}
        open={drawerOpen}
        destroyOnClose
        placement="right"
        onClose={() => {
          setDrawerOpen(false);
          setDragState(null);
        }}
        className="qr-template-drawer"
        styles={{
          body: {
            padding: 16,
          },
        }}
        footer={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleDrawerSubmit}>
              保存
            </Button>
          </Space>
        }
      >
        <div className="qr-template-editor-layout">
          <div className="qr-template-editor-sidebar">
            <Form form={drawerForm} layout="vertical">
              <div className="qr-template-editor-card">
                <div className="qr-template-editor-card-title">基础信息</div>
                <Form.Item
                  label="模板名称"
                  name="name"
                  rules={[{ required: true, message: '请输入模板名称' }]}
                >
                  <Input placeholder="请输入模板名称" maxLength={30} />
                </Form.Item>
                <Form.Item
                  label="状态"
                  name="state"
                  rules={[{ required: true, message: '请选择状态' }]}
                >
                  <Select
                    placeholder="请选择状态"
                    options={[
                      { label: '启用', value: 1 },
                      { label: '禁用', value: 0 },
                    ]}
                  />
                </Form.Item>
                <Form.Item
                  label="显示编码"
                  name="showSn"
                  valuePropName="checked"
                >
                  <Switch
                    checkedChildren="显示"
                    unCheckedChildren="隐藏"
                    onChange={handleShowCodeTextChange}
                  />
                </Form.Item>
                <div className="qr-template-editor-grid">
                  <div className="qr-template-editor-control">
                    <span className="qr-template-editor-label">编码字号</span>
                    <InputNumber
                      min={12}
                      max={36}
                      addonAfter="px"
                      disabled={!editorState.showCodeText}
                      value={editorState.codeText.fontSize}
                      onChange={handleCodeTextFontSizeChange}
                    />
                  </div>
                  <div className="qr-template-editor-control">
                    <span className="qr-template-editor-label">编码颜色</span>
                    <div className="qr-template-editor-color-control">
                      <ColorPicker
                        disabled={!editorState.showCodeText}
                        value={editorState.codeText.color}
                        showText
                        onChange={(_, hex) => {
                          handleCodeTextColorChange(hex);
                        }}
                      />
                      <div
                        className="qr-template-editor-color-preview"
                        style={{ backgroundColor: editorState.codeText.color }}
                      />
                    </div>
                  </div>
                </div>
                <Form.Item label="备注" name="remark">
                  <Input.TextArea
                    rows={4}
                    placeholder="请输入备注"
                    maxLength={200}
                  />
                </Form.Item>
              </div>
            </Form>

            <div className="qr-template-editor-card">
              <div className="qr-template-editor-card-title">画布设置</div>
              <div className="qr-template-editor-grid">
                <div className="qr-template-editor-control">
                  <span className="qr-template-editor-label">画布宽度</span>
                  <InputNumber
                    min={120}
                    max={MAX_CANVAS_WIDTH}
                    addonAfter="px"
                    value={editorState.canvasWidth}
                    onChange={handleCanvasWidthChange}
                  />
                </div>
                <div className="qr-template-editor-control">
                  <span className="qr-template-editor-label">画布高度</span>
                  <InputNumber
                    min={120}
                    max={MAX_CANVAS_HEIGHT}
                    addonAfter="px"
                    value={editorState.canvasHeight}
                    onChange={handleCanvasHeightChange}
                  />
                </div>
              </div>
              <div className="qr-template-editor-limit-note">
                当前先限制为宽 {MAX_CANVAS_WIDTH}px、高 {MAX_CANVAS_HEIGHT}px。
              </div>
              <div className="qr-template-editor-actions">
                <Upload {...backgroundUploadProps}>
                  <Button icon={<UploadOutlined />}>
                    {editorState.backgroundImage
                      ? '重新上传背景图'
                      : '上传背景图'}
                  </Button>
                </Upload>
                <Button
                  icon={<DeleteOutlined />}
                  disabled={!editorState.backgroundImage}
                  onClick={clearBackgroundPreview}
                >
                  删除背景图
                </Button>
              </div>
            </div>
          </div>

          <div className="qr-template-editor-preview-pane">
            <div className="qr-template-editor-preview-header">
              <div>
                <div className="qr-template-editor-preview-title">画布预览</div>
                <div className="qr-template-editor-preview-desc">
                  二维码支持拖拽和等比缩放，编码仅支持纵向拖动。
                </div>
              </div>
            </div>

            <div className="qr-template-canvas-shell">
              <div className="qr-template-canvas-stage">
                <div
                  className="qr-template-canvas"
                  style={{
                    width: editorState.canvasWidth,
                    height: editorState.canvasHeight,
                  }}
                  onMouseDown={() => {
                    setSelection(null);
                  }}
                >
                  {editorState.backgroundImage ? (
                    <img
                      src={editorState.backgroundImage}
                      alt="背景图预览"
                      className="qr-template-canvas-background"
                    />
                  ) : null}
                  {!editorState.backgroundImage ? (
                    <div className="qr-template-canvas-empty">
                      <span>上传背景图后在这里预览</span>
                    </div>
                  ) : null}

                  <div
                    className={`qr-template-canvas-qrcode ${
                      activeSelection === 'qrcode' ? 'is-active' : ''
                    }`}
                    style={{
                      left: editorState.qrcode.x,
                      top: editorState.qrcode.y,
                      width: editorState.qrcode.size,
                      height: editorState.qrcode.size,
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelection('qrcode');
                      setDragState({
                        type: 'qrcode',
                        startX: event.clientX,
                        startY: event.clientY,
                        initialX: editorState.qrcode.x,
                        initialY: editorState.qrcode.y,
                      });
                    }}
                  >
                    <QRCode
                      value="https://demo.suifida.local/pay/template-preview"
                      size={Math.max(72, editorState.qrcode.size - 14)}
                      bordered={false}
                    />
                    {activeSelection === 'qrcode' ? (
                      <div
                        className="qr-template-canvas-qrcode-handle"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelection('qrcode');
                          setDragState({
                            type: 'qrcodeResize',
                            startX: event.clientX,
                            startY: event.clientY,
                            initialX: editorState.qrcode.x,
                            initialY: editorState.qrcode.y,
                            initialSize: editorState.qrcode.size,
                          });
                        }}
                      />
                    ) : null}
                  </div>

                  {editorState.showCodeText ? (
                    <div
                      className={`qr-template-canvas-code-text ${
                        activeSelection === 'codeText' ? 'is-active' : ''
                      }`}
                      style={{
                        left: editorState.qrcode.x,
                        top: codeTextTop,
                        width: editorState.qrcode.size,
                        color: editorState.codeText.color,
                        fontSize: editorState.codeText.fontSize,
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelection('codeText');
                        setDragState({
                          type: 'codeText',
                          startX: event.clientX,
                          startY: event.clientY,
                          initialX: editorState.qrcode.x,
                          initialY: editorState.codeText.offsetY,
                        });
                      }}
                    >
                      NO. 20260320
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      <Modal
        title="裁剪背景图"
        open={cropModalOpen}
        width={560}
        destroyOnClose
        maskClosable={false}
        className="qr-template-crop-modal"
        confirmLoading={cropLoading}
        onCancel={() => {
          setCropModalOpen(false);
          setCropDragState(null);
        }}
        onOk={() => {
          void handleCropConfirm();
        }}
        okText="确定"
        cancelText="取消"
      >
        <div className="qr-template-crop-panel">
          <div className="qr-template-crop-hint">
            选中图片后可拖动位置，并通过缩放控制裁剪范围。确认后再应用到画布。
          </div>
          <div
            className="qr-template-crop-stage"
            style={{
              width: cropPreviewWidth,
              height: cropPreviewHeight,
            }}
          >
            {cropDraft ? (
              <div
                className="qr-template-crop-viewport"
                style={{
                  width: cropPreviewWidth,
                  height: cropPreviewHeight,
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setCropDragState({
                    startX: event.clientX,
                    startY: event.clientY,
                    initialX: cropDraft.offsetX,
                    initialY: cropDraft.offsetY,
                  });
                }}
              >
                <img
                  src={cropDraft.sourceUrl}
                  alt="待裁剪背景图"
                  className="qr-template-crop-image"
                  style={{
                    width: cropImageWidth,
                    height: cropImageHeight,
                    marginLeft: -cropImageWidth / 2,
                    marginTop: -cropImageHeight / 2,
                    transform: `translate(${cropDraft.offsetX}px, ${cropDraft.offsetY}px)`,
                  }}
                />
                <div className="qr-template-crop-frame" />
              </div>
            ) : (
              <div className="qr-template-crop-empty">
                <Spin size="large" />
              </div>
            )}
          </div>
          <div className="qr-template-crop-toolbar">
            <span className="qr-template-crop-toolbar-label">缩放</span>
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={cropDraft?.zoom ?? 1}
              onChange={(value) => {
                setCropDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        zoom: Number(value),
                      }
                    : prev,
                );
              }}
            />
            <span className="qr-template-crop-toolbar-value">
              {`${((cropDraft?.zoom ?? 1) * 100).toFixed(0)}%`}
            </span>
          </div>
        </div>
      </Modal>

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

export default QrTemplateListPage;
