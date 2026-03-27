import { Empty, Select } from 'antd';
import type { BaseOptionType, DefaultOptionType } from 'antd/es/select';
import type { FlattenOptionData } from 'rc-select/lib/interface';
import React from 'react';
import './TemplatePreviewSelect.less';

export type TemplateSelectOption = {
  label: string;
  value: string;
  previewImageUrl?: string;
  brandName?: string;
};

type TemplatePreviewSelectProps = {
  value?: string;
  onChange?: (value?: string) => void;
  options: TemplateSelectOption[];
  placeholder?: string;
  allowClear?: boolean;
  loading?: boolean;
  disabled?: boolean;
};

type TemplatePreviewCardProps = {
  template?: TemplateSelectOption;
  title?: string;
  emptyText?: string;
  size?: 'default' | 'compact';
};

function readText(value?: string) {
  return String(value || '').trim();
}

export function findTemplateOption(
  options: TemplateSelectOption[],
  value?: string,
) {
  const currentValue = readText(value);
  if (!currentValue) return undefined;
  return options.find((item) => readText(item.value) === currentValue);
}

export const TemplatePreviewSelect: React.FC<TemplatePreviewSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '请选择模板',
  allowClear = true,
  loading = false,
  disabled = false,
}) => {
  return (
    <Select
      showSearch
      allowClear={allowClear}
      placeholder={placeholder}
      value={value}
      loading={loading}
      disabled={disabled}
      options={options}
      optionFilterProp="label"
      popupMatchSelectWidth={false}
      notFoundContent={
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无模板" />
      }
      onChange={(nextValue) => {
        onChange?.(readText(nextValue) || undefined);
      }}
      optionRender={(
        option: FlattenOptionData<BaseOptionType | DefaultOptionType>,
      ) => {
        const data = option.data as TemplateSelectOption;
        const previewImageUrl = readText(data?.previewImageUrl);
        const brandName = readText(data?.brandName);

        return (
          <div className="template-preview-select-option">
            <div className="template-preview-select-option__thumb">
              {previewImageUrl ? (
                <img
                  src={previewImageUrl}
                  alt={readText(data?.label) || '模板缩略图'}
                />
              ) : (
                <span>暂无预览</span>
              )}
            </div>
            <div className="template-preview-select-option__content">
              <div className="template-preview-select-option__title">
                {readText(data?.label) || '-'}
              </div>
              {brandName ? (
                <div className="template-preview-select-option__meta">
                  {brandName}
                </div>
              ) : null}
            </div>
          </div>
        );
      }}
    />
  );
};

export const TemplatePreviewCard: React.FC<TemplatePreviewCardProps> = ({
  template,
  title = '模板预览',
  emptyText = '请选择模板',
  size = 'default',
}) => {
  const previewImageUrl = readText(template?.previewImageUrl);
  const brandName = readText(template?.brandName);
  const className =
    size === 'compact'
      ? 'template-preview-card is-compact'
      : 'template-preview-card';

  return (
    <div className={className}>
      <div className="template-preview-card__header">
        <div className="template-preview-card__title">{title}</div>
        {template?.label ? (
          <div className="template-preview-card__name">{template.label}</div>
        ) : null}
        {brandName ? (
          <div className="template-preview-card__meta">
            所属品牌：{brandName}
          </div>
        ) : null}
      </div>

      <div className="template-preview-card__body">
        {previewImageUrl ? (
          <img
            src={previewImageUrl}
            alt={readText(template?.label) || '模板预览'}
            className="template-preview-card__image"
          />
        ) : (
          <div className="template-preview-card__empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyText}
            />
          </div>
        )}
      </div>
    </div>
  );
};
