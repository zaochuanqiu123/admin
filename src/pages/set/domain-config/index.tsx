import { ReloadOutlined } from '@ant-design/icons';
import { useAccess } from '@umijs/max';
import { Alert, Button, Empty, Form, Input, message, Space } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getDomainConfigList,
  modifySystemConfigValue,
  type SystemConfigItem,
  type SystemConfigValueSaveItem,
} from '@/api/systemConfig';
import { PageSectionSkeleton, PermissionButton } from '@/components';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import './index.less';

const DOMAIN_CONFIG_PERMS = {
  modify: 'system:config:modify:value',
};

const CONFIG_LABELS: Record<string, string> = {
  'domain.channel.notify': '支付通道异步通知域名',
  'domain.device.qrcode': '收款码域名',
};

const CONFIG_HELP: Record<string, string> = {
  'domain.channel.notify': '用于支付通道异步通知回调的域名。',
  'domain.device.qrcode': '用于收款码访问和展示的域名。',
};

const CONFIG_ORDER = ['domain.channel.notify', 'domain.device.qrcode'];

type DomainConfigFormValues = {
  values?: Record<string, string>;
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
  return readRecordText(record, ['configType', 'config_type']) || 'DOMAIN';
}

function getConfigScope(record: SystemConfigItem) {
  return readRecordText(record, ['scope']) || 'GLOBAL';
}

function getValueType(record: SystemConfigItem) {
  return readRecordText(record, ['valueType', 'value_type']) || 'STRING';
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

function createDefaultConfigRecord(configKey: string): SystemConfigItem {
  return {
    configKey,
    configType: 'DOMAIN',
    valueType: 'STRING',
    scope: 'GLOBAL',
    description: CONFIG_LABELS[configKey],
    explain: CONFIG_HELP[configKey],
  };
}

function mergeDomainConfigRecords(records: SystemConfigItem[]) {
  const recordMap = new Map<string, SystemConfigItem>();

  records.forEach((record) => {
    const configKey = getConfigKey(record);
    if (configKey && CONFIG_LABELS[configKey]) {
      recordMap.set(configKey, record);
    }
  });

  return CONFIG_ORDER.map((configKey) => ({
    ...createDefaultConfigRecord(configKey),
    ...(recordMap.get(configKey) || {}),
  }));
}

function getFieldKey(record: SystemConfigItem, index: number) {
  return (
    getRecordId(record) || getConfigKey(record) || `domain-config-${index}`
  );
}

function getConfigValue(record: SystemConfigItem) {
  return readRecordText(record, [
    'configValue',
    'config_value',
    'value',
    'configValueConvert',
    'config_value_convert',
    'valueConvert',
  ]);
}

function buildInitialValues(records: SystemConfigItem[]) {
  const values: Record<string, string> = {};
  records.forEach((record, index) => {
    values[getFieldKey(record, index)] = getConfigValue(record);
  });
  return values;
}

const DomainConfigPage = () => {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };
  const [form] = Form.useForm<DomainConfigFormValues>();
  const recordsRef = useRef<SystemConfigItem[]>([]);
  const [records, setRecords] = useState<SystemConfigItem[]>([]);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const canModify = Boolean(
    access?.hasButtonPerm?.(DOMAIN_CONFIG_PERMS.modify),
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
        const res = await getDomainConfigList({
          skipErrorHandler: true,
        });
        const list = Array.isArray(res) ? res : [];
        const mergedList = mergeDomainConfigRecords(list);
        recordsRef.current = mergedList;
        setRecords(mergedList);
        form.resetFields();
        form.setFieldsValue({
          values: buildInitialValues(mergedList),
        });
        setDirtyKeys(new Set());
      } catch (error) {
        console.error('load domain configs failed:', error);
        const errorMessage = getErrorMessage(error, '获取域名配置失败');
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
    [form],
  );

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const handleValuesChange = (changedValues: DomainConfigFormValues) => {
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
        valueType: getValueType(record),
        configValue: String(formValues[fieldKey] || '').trim(),
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
      console.error('save domain configs failed:', error);
      message.error(getErrorMessage(error, '保存域名配置失败'));
    } finally {
      setSaving(false);
    }
  };

  const sortedRecords = useMemo(
    () =>
      records
        .map((record, index) => ({ record, index }))
        .sort((a, b) => {
          const orderDiff =
            CONFIG_ORDER.indexOf(getConfigKey(a.record)) -
            CONFIG_ORDER.indexOf(getConfigKey(b.record));
          return orderDiff || a.index - b.index;
        }),
    [records],
  );

  const renderConfigItem = (record: SystemConfigItem, index: number) => {
    const fieldKey = getFieldKey(record, index);
    const help = getConfigHelp(record);

    return (
      <Form.Item
        className="site-config-form-item"
        extra={help}
        key={fieldKey}
        label={getConfigLabel(record)}
        name={['values', fieldKey]}
      >
        <Input
          allowClear
          disabled={!canModify}
          placeholder={`请输入${getConfigLabel(record)}`}
        />
      </Form.Item>
    );
  };

  return (
    <Form
      className="site-config-page domain-config-page"
      form={form}
      labelAlign="right"
      labelCol={{ flex: '180px' }}
      layout="horizontal"
      onFinish={handleSave}
      onValuesChange={handleValuesChange}
      wrapperCol={{ flex: '1' }}
    >
      <section className="content-card site-config-card">
        <div className="site-config-header">
          <div className="site-config-title-block">
            <h2>域名配置</h2>
            <span>配置支付通道异步通知域名和收款码域名</span>
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
          <PageSectionSkeleton rows={4} />
        ) : loadError ? (
          <Alert type="error" showIcon message={loadError} />
        ) : sortedRecords.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="接口未返回域名配置项"
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
                perm={DOMAIN_CONFIG_PERMS.modify}
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

export default DomainConfigPage;
