import { ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useAccess, useModel } from '@umijs/max';
import type { UploadProps } from 'antd';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  message,
  Space,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getSiteStaticResourceConfigList,
  modifySystemConfigValue,
  type SystemConfigItem,
  type SystemConfigValueSaveItem,
} from '@/api/systemConfig';
import {
  PageSectionSkeleton,
  PermissionButton,
  PermissionVisible,
} from '@/components';
import { uploadImageAttachment } from '@/pages/form/shared/upload';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import { setDocumentFavicon } from '@/utils/favicon';
import './index.less';

const SITE_CONFIG_PERMS = {
  modify: 'system:config:modify:value',
};

const CONFIG_LABELS: Record<string, string> = {
  'auth.login.logo': '登录页 logo',
  'site.favicon': '网站 favicon',
  'site.logo': '站点 logo',
  'footer.icp.text': 'ICP 备案文本',
  'footer.icp.link': 'ICP 备案跳转链接',
  'footer.psb.text': '公安备案号文本',
  'footer.psb.link': '公安备案跳转链接',
  'auth.login.recordNumber.color': '登录页备案号颜色',
  'footer.extra': '底部其他信息',
  'auth.login.carousel': '登录页轮播图',
  'footer.contact.phone': '联系电话',
  'site.name': '网站名称',
};

const CONFIG_HELP: Record<string, string> = {
  'auth.login.logo': '登录页显示的品牌标识，仅支持上传一张图片。',
  'site.favicon': '浏览器标签页左侧显示的小图标，仅支持上传一张图片。',
  'site.logo': '网站页面显示的主标识，仅支持上传一张图片。',
  'auth.login.carousel': '登录页轮播区域展示的图片，支持上传多张图片。',
  'footer.extra': '可直接填写文本，内容较多时可以换行，不需要填写 JSON。',
};

const CONFIG_VALUE_TYPES: Record<string, string> = {
  'auth.login.logo': 'FILE',
  'site.favicon': 'FILE',
  'site.logo': 'FILE',
  'footer.icp.text': 'STRING',
  'footer.icp.link': 'STRING',
  'footer.psb.text': 'STRING',
  'footer.psb.link': 'STRING',
  'auth.login.recordNumber.color': 'COLOR',
  'footer.extra': 'STRING',
  'auth.login.carousel': 'BANNER_IMAGE',
  'footer.contact.phone': 'STRING',
  'site.name': 'STRING',
};

const CONFIG_ORDER = [
  'auth.login.logo',
  'site.logo',
  'site.favicon',
  'auth.login.carousel',
  'footer.contact.phone',
  'site.name',
  'footer.icp.text',
  'footer.icp.link',
  'footer.psb.text',
  'footer.psb.link',
  'auth.login.recordNumber.color',
  'footer.extra',
];

type SiteConfigFormValues = {
  values?: Record<string, any>;
};

type StaticImageValue = {
  attachmentId?: string;
  url?: string;
};

type ImageUploadFieldProps = {
  value?: StaticImageValue;
  onChange?: (value: StaticImageValue) => void;
  canModify?: boolean;
  triggerText?: string;
};

type BannerImagesFieldProps = {
  value?: StaticImageValue[];
  onChange?: (value: StaticImageValue[]) => void;
  canModify?: boolean;
};

type ColorValueFieldProps = {
  value?: string;
  onChange?: (value: string) => void;
};

function readRecordText(record: SystemConfigItem, keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function getRecordId(record: SystemConfigItem) {
  return readRecordText(record, [
    'id',
    'configId',
    'config_id',
    'systemConfigId',
    'system_config_id',
  ]);
}

function getConfigKey(record: SystemConfigItem) {
  return readRecordText(record, ['configKey', 'config_key']);
}

function getConfigType(record: SystemConfigItem) {
  return (
    readRecordText(record, ['configType', 'config_type']) ||
    'SITE_STATIC_RESOURCE'
  );
}

function getConfigScope(record: SystemConfigItem) {
  return readRecordText(record, ['scope']) || 'GLOBAL';
}

function getConfigDescription(record: SystemConfigItem) {
  return readRecordText(record, ['description', 'desc']);
}

function getConfigRemark(record: SystemConfigItem) {
  return readRecordText(record, ['explain', 'remark', 'memo', 'note']);
}

function getConfigLabel(record: SystemConfigItem) {
  const configKey = getConfigKey(record);
  return (
    CONFIG_LABELS[configKey] ||
    getConfigDescription(record) ||
    getConfigRemark(record) ||
    configKey ||
    '配置项'
  );
}

function getConfigHelp(record: SystemConfigItem) {
  const configKey = getConfigKey(record);
  if (CONFIG_HELP[configKey]) return CONFIG_HELP[configKey];

  const label = getConfigLabel(record);
  const remark = getConfigRemark(record);
  if (!remark || remark === label) return undefined;
  return remark;
}

function getConfigOrder(record: SystemConfigItem) {
  const orderIndex = CONFIG_ORDER.indexOf(getConfigKey(record));
  return orderIndex >= 0 ? orderIndex : CONFIG_ORDER.length;
}

function createDefaultConfigRecord(configKey: string): SystemConfigItem {
  return {
    configKey,
    configType: 'SITE_STATIC_RESOURCE',
    scope: 'GLOBAL',
    valueType: CONFIG_VALUE_TYPES[configKey],
    description: CONFIG_LABELS[configKey],
    explain: CONFIG_HELP[configKey],
  };
}

function mergeSiteConfigRecords(records: SystemConfigItem[]) {
  const recordMap = new Map<string, SystemConfigItem>();
  const unknownRecords: SystemConfigItem[] = [];

  records.forEach((record) => {
    const configKey = getConfigKey(record);
    if (configKey && CONFIG_LABELS[configKey]) {
      recordMap.set(configKey, record);
      return;
    }
    unknownRecords.push(record);
  });

  return [
    ...CONFIG_ORDER.map((configKey) => ({
      ...createDefaultConfigRecord(configKey),
      ...(recordMap.get(configKey) || {}),
    })),
    ...unknownRecords,
  ];
}

function getSingleImageUploadText(record: SystemConfigItem) {
  const configKey = getConfigKey(record);
  if (configKey === 'site.favicon') return '上传网站 favicon';
  if (configKey === 'auth.login.logo') return '上传登录页 logo';
  if (configKey === 'site.logo') return '上传站点 logo';
  return '上传图片';
}

function getConfigRawValue(record: SystemConfigItem) {
  return readRecordText(record, ['configValue', 'config_value', 'value']);
}

function getConfigConvertedValue(record: SystemConfigItem) {
  return readRecordText(record, [
    'configValueConvert',
    'config_value_convert',
    'valueConvert',
  ]);
}

function getValueType(record: SystemConfigItem) {
  return readRecordText(record, ['valueType', 'value_type']).toUpperCase();
}

function getEffectiveValueType(record: SystemConfigItem) {
  const configKey = getConfigKey(record);
  if (configKey === 'footer.extra') return 'STRING';
  return getValueType(record);
}

function getFieldKey(record: SystemConfigItem, index: number) {
  return getRecordId(record) || getConfigKey(record) || `site-config-${index}`;
}

function isPreviewUrl(value?: unknown) {
  const text = String(value || '').trim();
  if (!text) return false;
  return (
    /^(https?:)?\/\//i.test(text) ||
    /^(data|blob):/i.test(text) ||
    text.startsWith('/')
  );
}

function parseJsonValue<T>(value?: unknown): T | undefined {
  if (!value) return undefined;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function normalizeJsonText(value: string) {
  const parsed = parseJsonValue<unknown>(value);
  return parsed ? JSON.stringify(parsed, null, 2) : value;
}

function getAttachmentId(value: unknown) {
  return String(
    (value as any)?.id ||
      (value as any)?.attachmentId ||
      (value as any)?.attachment_id ||
      (value as any)?.fileId ||
      (value as any)?.file_id ||
      '',
  ).trim();
}

function getAttachmentUrl(value: unknown) {
  return String(
    (value as any)?.url ||
      (value as any)?.attachmentUrl ||
      (value as any)?.attachment_url ||
      (value as any)?.imageUrl ||
      (value as any)?.image_url ||
      (value as any)?.src ||
      '',
  ).trim();
}

function normalizeImageValue(value: unknown): StaticImageValue {
  if (!value) return {};
  if (typeof value === 'string') {
    const text = value.trim();
    return isPreviewUrl(text) ? { url: text } : { attachmentId: text };
  }
  return {
    attachmentId: getAttachmentId(value),
    url: getAttachmentUrl(value),
  };
}

function getImageUid(value: StaticImageValue, index: number, prefix: string) {
  return value.attachmentId || value.url || `${prefix}-${index}`;
}

function toUploadFile(
  value: StaticImageValue,
  index: number,
  prefix: string,
): UploadFile {
  const uid = getImageUid(value, index, prefix);
  return {
    uid,
    name: `${prefix}-${index + 1}.png`,
    status: 'done',
    url: value.url,
    response: {
      id: value.attachmentId,
      url: value.url,
    },
  };
}

function getFileImageValue(record: SystemConfigItem): StaticImageValue {
  return {
    attachmentId: getConfigRawValue(record),
    url: getConfigConvertedValue(record),
  };
}

function getBannerItemsFromValue(value: unknown): StaticImageValue[] {
  const parsed = parseJsonValue<any>(value);
  const items = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.items)
      ? parsed.items
      : [];

  if (items.length > 0) {
    return items
      .slice()
      .sort((a: any, b: any) => Number(a?.sort || 0) - Number(b?.sort || 0))
      .map((item: any) => normalizeImageValue(item))
      .filter((item: StaticImageValue) => item.attachmentId || item.url);
  }

  const directItem = normalizeImageValue(value);
  return directItem.attachmentId || directItem.url ? [directItem] : [];
}

function getBannerImages(record: SystemConfigItem) {
  const rawValue = getConfigRawValue(record);
  const convertedValue = getConfigConvertedValue(record);
  const rawItems = getBannerItemsFromValue(rawValue);
  const convertedItems = getBannerItemsFromValue(convertedValue);
  const maxLength = Math.max(rawItems.length, convertedItems.length);

  return Array.from({ length: maxLength }, (_item, index) => ({
    attachmentId:
      rawItems[index]?.attachmentId || convertedItems[index]?.attachmentId,
    url: convertedItems[index]?.url || rawItems[index]?.url,
  })).filter((item) => item.attachmentId || item.url);
}

function getInitialFieldValue(record: SystemConfigItem): unknown {
  const valueType = getEffectiveValueType(record);
  if (valueType === 'BANNER_IMAGE') return getBannerImages(record);
  if (valueType === 'FILE') return getFileImageValue(record);

  const rawValue = getConfigRawValue(record);
  const fallbackValue = getConfigConvertedValue(record);
  const value = rawValue || fallbackValue;
  return valueType === 'JSON' ? normalizeJsonText(value) : value;
}

function buildInitialValues(records: SystemConfigItem[]) {
  return records.reduce<Record<string, unknown>>((result, record, index) => {
    result[getFieldKey(record, index)] = getInitialFieldValue(record);
    return result;
  }, {});
}

function validateImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    message.error('只能上传图片文件');
    return false;
  }
  return true;
}

const handleUploadPreview: UploadProps['onPreview'] = (file) => {
  const previewUrl = String(file.url || file.thumbUrl || '').trim();
  if (!previewUrl) return;
  window.open(previewUrl, '_blank', 'noopener,noreferrer');
};

function renderUploadTrigger(text: string) {
  return (
    <div className="site-config-upload-trigger">
      <UploadOutlined />
      <span>{text}</span>
    </div>
  );
}

function normalizePickerColor(value?: string) {
  const color = String(value || '').trim();
  const shortHex = /^#([0-9a-f]{3})$/i.exec(color);
  if (shortHex?.[1]) {
    return `#${shortHex[1]
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`;
  }
  if (/^#([0-9a-f]{6})$/i.test(color)) {
    return color;
  }
  return '#1677ff';
}

function ColorValueField({ value, onChange }: ColorValueFieldProps) {
  const color = String(value || '').trim();
  const pickerColor = normalizePickerColor(color);

  return (
    <div className="site-config-color-field">
      <input
        aria-label="选择颜色"
        className="site-config-color-picker"
        type="color"
        value={pickerColor}
        onChange={(event) => onChange?.(event.target.value)}
      />
      <Input
        allowClear
        value={color}
        placeholder="请输入颜色值，如 #1677ff"
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  );
}

function ImageUploadField({
  value,
  onChange,
  canModify = false,
  triggerText = '上传图片',
}: ImageUploadFieldProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const imageValue = normalizeImageValue(value);
  const fileList =
    imageValue.attachmentId || imageValue.url
      ? [toUploadFile(imageValue, 0, 'site-image')]
      : [];
  const uploading = uploadingCount > 0;

  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) =>
    validateImageFile(file) ? true : Upload.LIST_IGNORE;

  const handleUpload: UploadProps['customRequest'] = async ({
    file,
    onError,
    onSuccess,
  }) => {
    setUploadingCount((prev) => prev + 1);
    try {
      const uploadFile = file as File;
      const attachment = await uploadImageAttachment(
        uploadFile,
        uploadFile.name,
      );
      const attachmentId = getAttachmentId(attachment);
      const attachmentUrl = getAttachmentUrl(attachment);
      if (!attachmentId) {
        throw new Error('上传接口未返回附件 ID');
      }
      onChange?.({
        attachmentId,
        url: attachmentUrl,
      });
      onSuccess?.(attachment);
      message.success('上传成功');
    } catch (error) {
      onError?.(error as Error);
      message.error(getErrorMessage(error, '上传失败'));
    } finally {
      setUploadingCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleRemove: UploadProps['onRemove'] = () => {
    onChange?.({});
    return true;
  };

  return (
    <div className="site-config-image-field site-config-upload-list">
      <Upload
        accept="image/*"
        beforeUpload={handleBeforeUpload}
        customRequest={handleUpload}
        fileList={fileList}
        listType="picture-card"
        maxCount={1}
        onPreview={handleUploadPreview}
        onRemove={handleRemove}
        showUploadList={{
          showPreviewIcon: true,
          showRemoveIcon: canModify,
        }}
      >
        {fileList.length === 0 ? (
          <PermissionVisible perm={SITE_CONFIG_PERMS.modify}>
            {renderUploadTrigger(triggerText)}
          </PermissionVisible>
        ) : null}
      </Upload>
      {uploading ? (
        <span className="site-config-uploading">上传中...</span>
      ) : null}
    </div>
  );
}

function BannerImagesField({
  value,
  onChange,
  canModify = false,
}: BannerImagesFieldProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const images = Array.isArray(value) ? value.map(normalizeImageValue) : [];
  const imagesRef = useRef<StaticImageValue[]>(images);
  const fileList = images.map((image, index) =>
    toUploadFile(image, index, 'banner-image'),
  );
  const uploading = uploadingCount > 0;

  useEffect(() => {
    imagesRef.current = images;
  }, [value]);

  const emitImagesChange = (nextImages: StaticImageValue[]) => {
    imagesRef.current = nextImages;
    onChange?.(nextImages);
  };

  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) =>
    validateImageFile(file) ? true : Upload.LIST_IGNORE;

  const handleRemove: UploadProps['onRemove'] = (file) => {
    const removeUid = String(file.uid || '');
    emitImagesChange(
      imagesRef.current.filter(
        (image, index) =>
          getImageUid(image, index, 'banner-image') !== removeUid,
      ),
    );
    return true;
  };

  const handleUpload: UploadProps['customRequest'] = async ({
    file,
    onError,
    onSuccess,
  }) => {
    setUploadingCount((prev) => prev + 1);
    try {
      const uploadFile = file as File;
      const attachment = await uploadImageAttachment(
        uploadFile,
        uploadFile.name,
      );
      const attachmentId = getAttachmentId(attachment);
      const attachmentUrl = getAttachmentUrl(attachment);
      if (!attachmentId) {
        throw new Error('上传接口未返回附件 ID');
      }
      emitImagesChange([
        ...imagesRef.current,
        {
          attachmentId,
          url: attachmentUrl,
        },
      ]);
      onSuccess?.(attachment);
      message.success('上传成功');
    } catch (error) {
      onError?.(error as Error);
      message.error(getErrorMessage(error, '上传失败'));
    } finally {
      setUploadingCount((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="site-config-banner-field site-config-upload-list">
      <Upload
        accept="image/*"
        beforeUpload={handleBeforeUpload}
        customRequest={handleUpload}
        fileList={fileList}
        listType="picture-card"
        multiple
        onPreview={handleUploadPreview}
        onRemove={handleRemove}
        showUploadList={{
          showPreviewIcon: true,
          showRemoveIcon: canModify,
        }}
      >
        <PermissionVisible perm={SITE_CONFIG_PERMS.modify}>
          {renderUploadTrigger('上传轮播图')}
        </PermissionVisible>
      </Upload>
      {uploading ? (
        <span className="site-config-uploading">上传中...</span>
      ) : null}
    </div>
  );
}

function serializeFieldValue(valueType: string, value: unknown) {
  if (valueType === 'FILE') {
    const imageValue = normalizeImageValue(value);
    return imageValue.attachmentId || '';
  }

  if (valueType === 'BANNER_IMAGE') {
    const images = Array.isArray(value)
      ? value.map(normalizeImageValue).filter((item) => item.attachmentId)
      : [];
    return JSON.stringify({
      items: images.map((image, index) => ({
        attachmentId: image.attachmentId,
        link: '',
        title: '',
        sort: index + 1,
      })),
      autoplay: true,
      intervalMs: 5000,
    });
  }

  return String(value ?? '').trim();
}

async function validateJsonValue(_rule: unknown, value?: string) {
  const text = String(value || '').trim();
  if (!text) return;
  try {
    JSON.parse(text);
  } catch {
    throw new Error('请输入正确的 JSON 格式');
  }
}

async function validateColorValue(_rule: unknown, value?: string) {
  const text = String(value || '').trim();
  if (!text) return;
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)) {
    throw new Error('请输入正确的颜色值');
  }
}

const SiteConfigPage = () => {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };
  const { setInitialState } = useModel('@@initialState');
  const [form] = Form.useForm<SiteConfigFormValues>();
  const recordsRef = useRef<SystemConfigItem[]>([]);
  const [records, setRecords] = useState<SystemConfigItem[]>([]);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const canModify = Boolean(access?.hasButtonPerm?.(SITE_CONFIG_PERMS.modify));

  const syncSiteNameToLayout = useCallback(
    (siteName?: string) => {
      const title = String(siteName || '').trim();
      if (!title) return;
      setInitialState((prevState: any) => ({
        ...prevState,
        settings: {
          ...(prevState?.settings || {}),
          title,
        },
      }));
    },
    [setInitialState],
  );

  const loadConfigs = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const hasOldRecords = recordsRef.current.length > 0;
      if (mode === 'initial' && !hasOldRecords) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setLoadError(undefined);

      try {
        const res = await getSiteStaticResourceConfigList({
          skipErrorHandler: true,
        });
        const list = Array.isArray(res) ? res : [];
        const mergedList = mergeSiteConfigRecords(list);
        const faviconRecord = mergedList.find(
          (record) => getConfigKey(record) === 'site.favicon',
        );
        const siteNameRecord = mergedList.find(
          (record) => getConfigKey(record) === 'site.name',
        );
        setDocumentFavicon(getFileImageValue(faviconRecord || {}).url);
        syncSiteNameToLayout(
          getInitialFieldValue(siteNameRecord || {}) as string,
        );
        recordsRef.current = mergedList;
        setRecords(mergedList);
        form.resetFields();
        form.setFieldsValue({
          values: buildInitialValues(mergedList),
        });
        setDirtyKeys(new Set());
      } catch (error) {
        console.error('load site static resource configs failed:', error);
        const errorMessage = getErrorMessage(error, '获取网站配置失败');
        if (hasOldRecords) {
          message.error(errorMessage);
        } else {
          setLoadError(errorMessage);
        }
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [form, syncSiteNameToLayout],
  );

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const handleValuesChange = (changedValues: SiteConfigFormValues) => {
    const changedConfigValues = changedValues?.values || {};
    const changedFieldKeys = Object.keys(changedConfigValues);
    if (changedFieldKeys.length === 0) return;
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      changedFieldKeys.forEach((key) => {
        next.add(key);
      });
      return next;
    });
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const formValues = values.values || {};
    const payload: SystemConfigValueSaveItem[] = [];

    records.forEach((record, index) => {
      const fieldKey = getFieldKey(record, index);
      if (!dirtyKeys.has(fieldKey)) return;

      const id = getRecordId(record);
      const configKey = getConfigKey(record);

      payload.push({
        ...(id ? { id } : {}),
        ...(configKey ? { configKey } : {}),
        configType: getConfigType(record),
        scope: getConfigScope(record),
        valueType: getEffectiveValueType(record),
        configValue: serializeFieldValue(
          getEffectiveValueType(record),
          formValues[fieldKey],
        ),
      });
    });

    if (payload.length === 0) {
      message.info('暂无需要保存的修改');
      return;
    }

    setSaving(true);
    try {
      const res = await modifySystemConfigValue(payload, {
        skipErrorHandler: true,
      });
      message.success(getApiMessage(res, '保存成功'));
      await loadConfigs('refresh');
    } catch (error) {
      console.error('save site static resource configs failed:', error);
      message.error(getErrorMessage(error, '保存网站配置失败'));
    } finally {
      setSaving(false);
    }
  };

  const sortedRecords = useMemo(
    () =>
      records
        .map((record, index) => ({ record, index }))
        .sort((a, b) => {
          const orderDiff = getConfigOrder(a.record) - getConfigOrder(b.record);
          return orderDiff || a.index - b.index;
        }),
    [records],
  );

  const renderValueControl = (record: SystemConfigItem) => {
    const valueType = getEffectiveValueType(record);

    if (valueType === 'FILE') {
      return (
        <ImageUploadField
          canModify={canModify}
          triggerText={getSingleImageUploadText(record)}
        />
      );
    }

    if (valueType === 'BANNER_IMAGE') {
      return <BannerImagesField canModify={canModify} />;
    }

    if (valueType === 'COLOR') {
      return <ColorValueField />;
    }

    if (getConfigKey(record) === 'footer.extra') {
      return (
        <Input.TextArea
          autoSize={{ minRows: 3, maxRows: 6 }}
          placeholder="请输入网站底部其他信息"
        />
      );
    }

    if (valueType === 'JSON') {
      return (
        <Input.TextArea
          autoSize={{ minRows: 4, maxRows: 8 }}
          placeholder="请输入 JSON 配置"
        />
      );
    }

    return <Input allowClear placeholder="请输入配置值" />;
  };

  const renderConfigItem = (record: SystemConfigItem, index: number) => {
    const valueType = getEffectiveValueType(record);
    const fieldKey = getFieldKey(record, index);
    const help = getConfigHelp(record);
    const rules =
      valueType === 'JSON'
        ? [{ validator: validateJsonValue }]
        : valueType === 'COLOR'
          ? [{ validator: validateColorValue }]
          : undefined;

    return (
      <Form.Item
        className="site-config-form-item"
        extra={help}
        key={fieldKey}
        label={getConfigLabel(record)}
        name={['values', fieldKey]}
        rules={rules}
      >
        {renderValueControl(record)}
      </Form.Item>
    );
  };

  return (
    <Form
      className="site-config-page"
      form={form}
      labelAlign="right"
      labelCol={{ flex: '140px' }}
      layout="horizontal"
      onFinish={handleSave}
      onValuesChange={handleValuesChange}
      wrapperCol={{ flex: '1' }}
    >
      <section className="content-card site-config-card">
        <div className="site-config-header">
          <div className="site-config-title-block">
            <h2>网站配置</h2>
            <span>配置登录页、站点标识、联系电话和备案展示资源</span>
          </div>
          <Space wrap>
            <Button
              htmlType="button"
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={() => loadConfigs('refresh')}
            >
              刷新
            </Button>
          </Space>
        </div>

        {initialLoading ? (
          <PageSectionSkeleton rows={6} />
        ) : loadError ? (
          <Alert type="error" showIcon message={loadError} />
        ) : sortedRecords.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="接口未返回网站配置项"
          />
        ) : (
          <>
            <div className="site-config-form-list">
              {sortedRecords.map(({ record, index }) =>
                renderConfigItem(record, index),
              )}
            </div>
            <Form.Item
              className="site-config-submit-row"
              label=" "
              colon={false}
            >
              <PermissionButton
                perm={SITE_CONFIG_PERMS.modify}
                type="primary"
                htmlType="submit"
                loading={saving}
                disabled={dirtyKeys.size === 0}
              >
                立即提交
              </PermissionButton>
            </Form.Item>
          </>
        )}
      </section>
    </Form>
  );
};

export default SiteConfigPage;
