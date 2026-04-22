import { PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useAccess, useParams } from '@umijs/max';
import {
  Button,
  Card,
  Cascader,
  Form,
  Input,
  message,
  Radio,
  Result,
  Spin,
  Steps,
  Switch,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useState } from 'react';
import { getAddressProvinceCityArea } from '@/api/address';
import {
  addMerchant,
  getMerchantDetail,
  type MerchantDetailRecord,
  modifyMerchant,
} from '@/api/merchant';
import { type SearchUserResult, searchUserByPhone } from '@/api/user';
import { ROUTE_TAB_REFRESH_EVENT } from '@/components/Layout/RouteTabsKeepAlive';
import {
  buildRegionOptions,
  type RegionOption,
} from '@/pages/form/shared/region';
import {
  createRemoteUploadFileList,
  imageUploadRequest,
  normalizeUploadFileList,
  resolveUploadAttachmentId,
} from '@/pages/form/shared/upload';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import { MERCHANT_PERMS } from '../merchant-perms';
import './index.less';

type MerchantRouteParams = {
  id?: string;
};

type MerchantFormValues = {
  merchantName?: string;
  contactsName?: string;
  contactsPhone?: string;
  logoFileList?: UploadFile[];
  regionCodes?: string[];
  merchantDetailAddress?: string;
  sourceType?: number;
  isMultiStore?: boolean;
  merchantManagerPhone?: string;
  merchantManagerName?: string;
  merchantManagerNickName?: string;
  merchantManagerPassword?: string;
  confirmPassword?: string;
};

type AdminMatchStatus = 'idle' | 'matched' | 'new';

function isValidMainlandPhone(phone: string): boolean {
  if (!phone) return true;
  return /^1\d{10}$/.test(phone);
}

function normalizeText(value?: string) {
  const nextValue = String(value || '').trim();
  return nextValue || undefined;
}

function getMerchantLogoPreviewUrl(detail?: MerchantDetailRecord) {
  return normalizeText(detail?.logoUrl);
}

function getMerchantLogoId(detail?: MerchantDetailRecord) {
  const logoId = normalizeText(detail?.logoId);
  return logoId && !/^https?:\/\//i.test(logoId) ? logoId : '';
}

function findOptionByValueOrLabel(options: RegionOption[], target?: string) {
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) return undefined;
  return options.find(
    (option) =>
      normalizeText(String(option.value || '')) === normalizedTarget ||
      normalizeText(String(option.label || '')) === normalizedTarget,
  );
}

function cloneRegionOptions(options: RegionOption[]): RegionOption[] {
  return options.map((option) => ({
    ...option,
    children: option.children ? cloneRegionOptions(option.children) : undefined,
  }));
}

export default function MerchantCreatePage() {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };
  const { id: routeMerchantId } = useParams<MerchantRouteParams>();
  const isEditMode = !!routeMerchantId;
  const canAccessCurrentPage = isEditMode
    ? !!access?.hasButtonPerm?.(MERCHANT_PERMS.modify)
    : !!access?.hasButtonPerm?.(MERCHANT_PERMS.add);
  const [form] = Form.useForm<MerchantFormValues>();
  const [currentStep, setCurrentStep] = useState(0);
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MerchantDetailRecord>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [regionPatched, setRegionPatched] = useState(false);
  const [adminSearching, setAdminSearching] = useState(false);
  const [adminMatchStatus, setAdminMatchStatus] =
    useState<AdminMatchStatus>('idle');
  const [matchedAdmin, setMatchedAdmin] = useState<SearchUserResult>();
  const [submitting, setSubmitting] = useState(false);
  const adminPhone = Form.useWatch('merchantManagerPhone', form) || '';

  const pageTitle = isEditMode
    ? '修改商户'
    : currentStep === 0
      ? '基础信息'
      : '管理员信息';

  const navigateBackToMerchantList = (refresh = false) => {
    history.push('/merchant/list');
    if (!refresh) {
      return;
    }
    window.setTimeout(() => {
      window.dispatchEvent(new Event(ROUTE_TAB_REFRESH_EVENT));
    }, 120);
  };

  const requestRegionNodes = async (
    type: 0 | 1 | 2,
    provinceCode = '',
    cityCode = '',
  ) => {
    return getAddressProvinceCityArea(
      {
        type,
        provinceCode,
        cityCode,
      },
      { skipErrorHandler: true },
    );
  };

  const handleRegionLoadData = async (selectedOptions: RegionOption[]) => {
    const targetOption = selectedOptions[selectedOptions.length - 1];
    if (!targetOption || targetOption.isLeaf) {
      return;
    }

    targetOption.loading = true;
    setRegionOptions((prev) => [...prev]);

    try {
      const list = await requestRegionNodes(
        selectedOptions.length === 1 ? 1 : 2,
        selectedOptions.length >= 1
          ? String(selectedOptions[0]?.value || '')
          : '',
        selectedOptions.length >= 2
          ? String(selectedOptions[1]?.value || '')
          : '',
      );
      targetOption.children = buildRegionOptions(
        list,
        selectedOptions.length === 1 ? 2 : 3,
      );
    } catch (error) {
      message.error(getErrorMessage(error, '获取省市区失败'));
      targetOption.children = [];
    } finally {
      targetOption.loading = false;
      setRegionOptions((prev) => [...prev]);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadRegionTree = async () => {
      setRegionLoading(true);
      try {
        const list = await requestRegionNodes(0);
        if (!cancelled) {
          setRegionOptions(buildRegionOptions(list, 1));
        }
      } catch (error) {
        if (!cancelled) {
          setRegionOptions([]);
          message.error(getErrorMessage(error, '获取省市区失败'));
        }
      } finally {
        if (!cancelled) {
          setRegionLoading(false);
        }
      }
    };

    void loadRegionTree();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode || !routeMerchantId) {
      return;
    }

    let cancelled = false;

    const loadMerchantDetail = async () => {
      setDetailLoading(true);
      try {
        const detail = await getMerchantDetail(routeMerchantId, {
          skipErrorHandler: true,
        });
        if (cancelled) {
          return;
        }
        setDetailRecord(detail);
        setRegionPatched(false);
        form.setFieldsValue({
          merchantName: normalizeText(detail?.merchantName),
          contactsName: normalizeText(detail?.contactsName),
          contactsPhone: normalizeText(detail?.contactsPhone),
          logoFileList: createRemoteUploadFileList(
            getMerchantLogoPreviewUrl(detail),
            'merchant',
          ),
          merchantDetailAddress: normalizeText(detail?.merchantDetailAddress),
          sourceType:
            typeof detail?.sourceType === 'number' ? detail.sourceType : 1,
        });
      } catch (error) {
        if (!cancelled) {
          message.error(getErrorMessage(error, '获取商户详情失败'));
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadMerchantDetail();
    return () => {
      cancelled = true;
    };
  }, [form, isEditMode, routeMerchantId]);

  useEffect(() => {
    if (
      !isEditMode ||
      regionLoading ||
      regionOptions.length === 0 ||
      regionPatched
    ) {
      return;
    }

    const provinceCode =
      normalizeText(detailRecord?.merchantProvinceCode) ||
      normalizeText(detailRecord?.merchantProvince);
    const cityCode =
      normalizeText(detailRecord?.merchantCityCode) ||
      normalizeText(detailRecord?.merchantCity);
    const areaCode =
      normalizeText(detailRecord?.merchantAreaCode) ||
      normalizeText(detailRecord?.merchantArea);
    if (!provinceCode || !cityCode || !areaCode) {
      setRegionPatched(true);
      return;
    }

    let cancelled = false;

    const patchRegionCodes = async () => {
      const nextOptions = cloneRegionOptions(regionOptions);
      const province = findOptionByValueOrLabel(nextOptions, provinceCode);
      if (!province) {
        setRegionPatched(true);
        return;
      }

      if (!Array.isArray(province.children) || province.children.length === 0) {
        const cityNodes = await requestRegionNodes(
          1,
          String(province.value),
          '',
        );
        province.children = buildRegionOptions(cityNodes, 2);
      }

      const city = findOptionByValueOrLabel(province.children || [], cityCode);
      if (!city) {
        setRegionPatched(true);
        return;
      }

      if (!Array.isArray(city.children) || city.children.length === 0) {
        const areaNodes = await requestRegionNodes(
          2,
          String(province.value),
          String(city.value),
        );
        city.children = buildRegionOptions(areaNodes, 3);
      }

      const area = findOptionByValueOrLabel(city.children || [], areaCode);
      if (!area || cancelled) {
        setRegionPatched(true);
        return;
      }

      setRegionOptions(nextOptions);
      form.setFieldValue('regionCodes', [
        String(province.value),
        String(city.value),
        String(area.value),
      ]);
      setRegionPatched(true);
    };

    void patchRegionCodes().catch((error) => {
      if (!cancelled) {
        message.error(getErrorMessage(error, '回显省市区失败'));
        setRegionPatched(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    detailRecord,
    form,
    isEditMode,
    regionLoading,
    regionOptions,
    regionPatched,
  ]);

  const handleNextStep = async () => {
    await form.validateFields([
      'merchantName',
      'regionCodes',
      'merchantDetailAddress',
    ]);
    setCurrentStep(1);
  };

  const resetAdminMatchState = () => {
    setAdminMatchStatus('idle');
    setMatchedAdmin(undefined);
    form.setFieldsValue({
      merchantManagerName: undefined,
      merchantManagerNickName: undefined,
      merchantManagerPassword: undefined,
      confirmPassword: undefined,
    });
  };

  const handleSearchAdmin = async () => {
    const phone = String(
      form.getFieldValue('merchantManagerPhone') || '',
    ).trim();
    if (!isValidMainlandPhone(phone)) {
      message.warning('请输入11位手机号');
      return;
    }

    setAdminSearching(true);
    try {
      const res = await searchUserByPhone(phone, { skipErrorHandler: true });
      if (String(res?.id || '').trim()) {
        setMatchedAdmin(res);
        setAdminMatchStatus('matched');
        form.setFieldsValue({
          merchantManagerName: undefined,
          merchantManagerNickName: undefined,
          merchantManagerPassword: undefined,
          confirmPassword: undefined,
        });
        message.success('已匹配到现有用户');
      } else {
        setMatchedAdmin(undefined);
        setAdminMatchStatus('new');
        form.setFieldsValue({
          merchantManagerName: undefined,
          merchantManagerNickName: undefined,
          merchantManagerPassword: undefined,
          confirmPassword: undefined,
        });
        message.info('未匹配到现有用户，请补充管理员信息');
      }
    } catch (error) {
      setMatchedAdmin(undefined);
      setAdminMatchStatus('idle');
      message.error(getErrorMessage(error, '查询管理员失败'));
    } finally {
      setAdminSearching(false);
    }
  };

  const getRegionLabels = (regionCodes: string[]) => {
    const selectedCodes = Array.isArray(regionCodes) ? regionCodes : [];
    if (selectedCodes.length !== 3) {
      return undefined;
    }

    const [provinceCode, cityCode, areaCode] = selectedCodes;
    const province = regionOptions.find(
      (option) => String(option.value) === String(provinceCode),
    );
    const city = province?.children?.find(
      (option) => String(option.value) === String(cityCode),
    );
    const area = city?.children?.find(
      (option) => String(option.value) === String(areaCode),
    );
    if (!province || !city || !area) {
      return undefined;
    }
    return {
      merchantProvince: String(province.label || '').trim(),
      merchantCity: String(city.label || '').trim(),
      merchantArea: String(area.label || '').trim(),
      merchantProvinceCode: String(province.value || '').trim(),
      merchantCityCode: String(city.value || '').trim(),
      merchantAreaCode: String(area.value || '').trim(),
    };
  };

  const handleSubmit = async () => {
    const baseFieldNames = [
      'merchantName',
      'regionCodes',
      'merchantDetailAddress',
    ];
    if (!isEditMode && adminMatchStatus === 'idle') {
      await form.validateFields(['merchantManagerPhone']);
      message.warning('请先匹配管理员手机号');
      return;
    }
    const validateFieldNames = [...baseFieldNames];
    if (!isEditMode) {
      validateFieldNames.push('merchantManagerPhone');
      if (adminMatchStatus === 'matched') {
        validateFieldNames.push('merchantManagerNickName');
      }
      if (adminMatchStatus === 'new') {
        validateFieldNames.push(
          'merchantManagerName',
          'merchantManagerNickName',
          'merchantManagerPassword',
          'confirmPassword',
        );
      }
    }

    await form.validateFields(validateFieldNames);
    const values = form.getFieldsValue(true) as MerchantFormValues;

    const contactsPhone = String(values.contactsPhone || '').trim();
    if (!isValidMainlandPhone(contactsPhone)) {
      message.warning('请输入正确的联系人手机号');
      return;
    }

    const regionLabels = getRegionLabels(
      Array.isArray(values.regionCodes) ? values.regionCodes : [],
    );
    if (!regionLabels) {
      message.warning('请选择完整的省市区');
      return;
    }

    const logoId = await resolveUploadAttachmentId(
      values.logoFileList,
      getMerchantLogoId(detailRecord),
    );
    const merchantName = String(values.merchantName ?? '').trim();
    const contactsName = String(values.contactsName ?? '').trim();
    const merchantDetailAddress = String(
      values.merchantDetailAddress ?? '',
    ).trim();
    const sourceType = Number(
      values.sourceType ?? detailRecord?.sourceType ?? 1,
    );
    const basePayload = {
      merchantName,
      contactsName,
      contactsPhone,
      logoId: String(logoId || '').trim(),
      merchantProvince: regionLabels.merchantProvince,
      merchantCity: regionLabels.merchantCity,
      merchantArea: regionLabels.merchantArea,
      merchantProvinceCode: regionLabels.merchantProvinceCode,
      merchantCityCode: regionLabels.merchantCityCode,
      merchantAreaCode: regionLabels.merchantAreaCode,
      merchantDetailAddress,
      sourceType,
    };

    setSubmitting(true);
    try {
      if (isEditMode) {
        const response = await modifyMerchant(
          {
            id: String(routeMerchantId || '').trim(),
            ...basePayload,
          },
          { skipErrorHandler: true },
        );
        message.success(getApiMessage(response, '修改商户成功'));
      } else {
        const managerPhone = String(values.merchantManagerPhone || '').trim();
        if (!isValidMainlandPhone(managerPhone)) {
          message.warning('请输入正确的管理员手机号');
          return;
        }

        const response = await addMerchant(
          {
            ...basePayload,
            merchantManagerPhone: managerPhone,
            merchantManagerName:
              adminMatchStatus === 'matched'
                ? String(matchedAdmin?.name ?? '').trim()
                : String(values.merchantManagerName ?? '').trim(),
            merchantManagerNickName: String(
              values.merchantManagerNickName ?? '',
            ).trim(),
            merchantManagerPassword:
              adminMatchStatus === 'new'
                ? String(values.merchantManagerPassword ?? '').trim()
                : '',
            isMultiStore: values.isMultiStore === true,
          },
          { skipErrorHandler: true },
        );
        message.success(getApiMessage(response, '新增商户成功'));
      }

      navigateBackToMerchantList(true);
    } catch (error) {
      message.error(
        getErrorMessage(error, isEditMode ? '修改商户失败' : '新增商户失败'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccessCurrentPage) {
    return (
      <PageContainer
        className="merchant-create-container"
        contentWidth="Fluid"
        pageHeaderRender={false}
      >
        <div className="merchant-create-page">
          <Card className="merchant-create-card merchant-wizard-card">
            <Result
              status="403"
              title="暂无权限"
              subTitle={
                isEditMode
                  ? '当前账号没有修改商户权限'
                  : '当前账号没有新增商户权限'
              }
              extra={
                <Button onClick={() => navigateBackToMerchantList(false)}>
                  返回商户列表
                </Button>
              }
            />
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      className="merchant-create-container"
      contentWidth="Fluid"
      pageHeaderRender={false}
    >
      <div className="merchant-create-page">
        <Card
          className="merchant-create-card merchant-wizard-card"
          loading={detailLoading}
        >
          {!isEditMode && (
            <Steps
              className="merchant-create-steps"
              current={currentStep}
              items={[{ title: '基础信息' }, { title: '管理员信息' }]}
            />
          )}
          <div className="merchant-create-step-title">{pageTitle}</div>
          <Spin spinning={regionLoading && regionOptions.length === 0}>
            <Form<MerchantFormValues>
              form={form}
              className="merchant-create-form"
              layout="horizontal"
              colon={false}
              labelCol={{ flex: '118px' }}
              wrapperCol={{ flex: '520px' }}
              initialValues={{
                sourceType: 1,
                isMultiStore: false,
                logoFileList: [],
              }}
            >
              {isEditMode || currentStep === 0 ? (
                <>
                  <Form.Item
                    label="商户名称"
                    name="merchantName"
                    rules={[{ required: true, message: '请输入商户名称' }]}
                  >
                    <Input placeholder="请输入商户名称" />
                  </Form.Item>
                  <Form.Item label="联系人" name="contactsName">
                    <Input placeholder="请输入联系人" />
                  </Form.Item>
                  <Form.Item
                    label="联系人电话"
                    name="contactsPhone"
                    rules={[
                      {
                        validator: async (_rule, value) => {
                          const text = String(value || '').trim();
                          if (!text || isValidMainlandPhone(text)) {
                            return;
                          }
                          throw new Error('请输入正确的联系人手机号');
                        },
                      },
                    ]}
                  >
                    <Input maxLength={11} placeholder="请输入联系人电话" />
                  </Form.Item>
                  <Form.Item
                    label="商户头像"
                    name="logoFileList"
                    valuePropName="fileList"
                    getValueFromEvent={normalizeUploadFileList}
                  >
                    <Upload
                      accept="image/*"
                      customRequest={imageUploadRequest}
                      maxCount={1}
                      listType="picture-card"
                      className="merchant-upload"
                    >
                      <div className="merchant-upload-box u-flex-col u-flex-center">
                        <PlusOutlined />
                        <span>上传图片</span>
                      </div>
                    </Upload>
                  </Form.Item>
                  <Form.Item label="来源渠道" name="sourceType">
                    <Radio.Group
                      className="merchant-radio-group"
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        { label: '后台添加', value: 1 },
                        { label: '网站注册', value: 2 },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    label="省市区"
                    name="regionCodes"
                    rules={[
                      {
                        validator: async (
                          _rule,
                          value: string[] | undefined,
                        ) => {
                          if (!Array.isArray(value) || value.length !== 3) {
                            throw new Error('请选择省市区');
                          }
                        },
                      },
                    ]}
                  >
                    <Cascader
                      placeholder={
                        regionLoading ? '省市区加载中...' : '请选择省市区'
                      }
                      options={regionOptions}
                      disabled={regionLoading}
                      loadData={(selectedOptions) =>
                        void handleRegionLoadData(
                          selectedOptions as RegionOption[],
                        )
                      }
                      changeOnSelect={false}
                    />
                  </Form.Item>
                  <Form.Item
                    label="详细地址"
                    name="merchantDetailAddress"
                    rules={[{ required: true, message: '请输入详细地址' }]}
                  >
                    <Input placeholder="请输入详细地址" />
                  </Form.Item>
                  {!isEditMode && (
                    <Form.Item
                      label="是否多门店"
                      name="isMultiStore"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="是" unCheckedChildren="否" />
                    </Form.Item>
                  )}
                </>
              ) : (
                <>
                  <Form.Item label="管理员手机号" required>
                    <div className="admin-phone-search">
                      <Form.Item
                        name="merchantManagerPhone"
                        className="merchant-inline-form-item"
                        normalize={(value) =>
                          String(value || '')
                            .replace(/[^\d]/g, '')
                            .slice(0, 11)
                        }
                        rules={[
                          { required: true, message: '请输入管理员手机号' },
                          {
                            validator: async (_rule, value) => {
                              if (!value || isValidMainlandPhone(value)) {
                                return;
                              }
                              throw new Error('请输入11位手机号');
                            },
                          },
                        ]}
                      >
                        <Input
                          placeholder="请输入管理员手机号"
                          maxLength={11}
                          onChange={resetAdminMatchState}
                          onPressEnter={() => void handleSearchAdmin()}
                        />
                      </Form.Item>
                      <Button
                        type="primary"
                        loading={adminSearching}
                        onClick={() => void handleSearchAdmin()}
                      >
                        匹配
                      </Button>
                    </div>
                  </Form.Item>
                  {adminMatchStatus === 'matched' ? (
                    <>
                      <Form.Item label=" ">
                        <div className="admin-result-banner matched">
                          已匹配到现有用户，将绑定为商户管理员。
                        </div>
                      </Form.Item>
                      <Form.Item label="用户姓名">
                        <Input
                          value={String(matchedAdmin?.name || '-')}
                          disabled
                        />
                      </Form.Item>
                      <Form.Item label="手机号">
                        <Input
                          value={String(matchedAdmin?.phone || adminPhone)}
                          disabled
                        />
                      </Form.Item>
                      <Form.Item
                        label="管理员昵称"
                        name="merchantManagerNickName"
                        rules={[
                          { required: true, message: '请输入管理员昵称' },
                        ]}
                      >
                        <Input placeholder="请输入管理员昵称" />
                      </Form.Item>
                    </>
                  ) : null}
                  {adminMatchStatus === 'new' ? (
                    <>
                      <Form.Item label=" ">
                        <div className="admin-result-banner warning">
                          未匹配到现有用户，请补充管理员信息并创建新账号。
                        </div>
                      </Form.Item>
                      <Form.Item label="手机号">
                        <Input value={adminPhone} disabled />
                      </Form.Item>
                      <Form.Item
                        label="管理员姓名"
                        name="merchantManagerName"
                        rules={[
                          { required: true, message: '请输入管理员姓名' },
                        ]}
                      >
                        <Input placeholder="请输入管理员姓名" />
                      </Form.Item>
                      <Form.Item
                        label="管理员昵称"
                        name="merchantManagerNickName"
                        rules={[
                          { required: true, message: '请输入管理员昵称' },
                        ]}
                      >
                        <Input placeholder="请输入管理员昵称" />
                      </Form.Item>
                      <Form.Item
                        label="管理员密码"
                        name="merchantManagerPassword"
                        rules={[{ required: true, message: '请输入登录密码' }]}
                      >
                        <Input.Password placeholder="请输入登录密码" />
                      </Form.Item>
                      <Form.Item
                        label="确认密码"
                        name="confirmPassword"
                        dependencies={['merchantManagerPassword']}
                        rules={[
                          { required: true, message: '请输入确认密码' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (
                                !value ||
                                getFieldValue('merchantManagerPassword') ===
                                  value
                              ) {
                                return Promise.resolve();
                              }
                              return Promise.reject(
                                new Error('两次输入的密码不一致'),
                              );
                            },
                          }),
                        ]}
                      >
                        <Input.Password placeholder="请再次输入登录密码" />
                      </Form.Item>
                    </>
                  ) : null}
                </>
              )}
            </Form>
          </Spin>
          <div className="merchant-create-actions u-flex">
            {isEditMode ? (
              <>
                <Button onClick={() => navigateBackToMerchantList(false)}>
                  取消
                </Button>
                <Button
                  type="primary"
                  shape="round"
                  className="merchant-create-save-btn"
                  loading={submitting}
                  onClick={() => void handleSubmit()}
                >
                  保存
                </Button>
              </>
            ) : currentStep === 0 ? (
              <>
                <Button onClick={() => navigateBackToMerchantList(false)}>
                  取消
                </Button>
                <Button
                  type="primary"
                  shape="round"
                  className="merchant-create-save-btn"
                  onClick={() => void handleNextStep()}
                >
                  下一步
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setCurrentStep(0)}>上一步</Button>
                <Button
                  type="primary"
                  shape="round"
                  className="merchant-create-save-btn"
                  loading={submitting}
                  onClick={() => void handleSubmit()}
                >
                  提交
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
