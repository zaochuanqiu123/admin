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
  Result,
  Spin,
  Steps,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useState } from 'react';
import { getAddressProvinceCityArea } from '@/api/address';
import {
  type AgentDetailRecord,
  addAgent,
  getAgentDetail,
  modifyAgent,
} from '@/api/agent';
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
import { AGENT_PERMS } from '../agent-perms';
import './index.less';

type AgentRouteParams = {
  id?: string;
};

type AgentFormValues = {
  name?: string;
  contactsName?: string;
  contactsPhone?: string;
  logoFileList?: UploadFile[];
  regionCodes?: string[];
  address?: string;
  agentManagerPhone?: string;
  agentManagerName?: string;
  agentManagerNickName?: string;
  agentManagerPassword?: string;
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

function requiredText(value?: string) {
  return String(value ?? '').trim();
}

function getAgentLogoPreviewUrl(detail?: AgentDetailRecord) {
  return normalizeText(detail?.logoUrl);
}

function getAgentLogoId(detail?: AgentDetailRecord) {
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

export default function AgentCreatePage() {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };
  const { id: routeAgentId } = useParams<AgentRouteParams>();
  const isEditMode = !!routeAgentId;
  const canAccessCurrentPage = isEditMode
    ? !!access?.hasButtonPerm?.(AGENT_PERMS.modify)
    : !!access?.hasButtonPerm?.(AGENT_PERMS.add);
  const [form] = Form.useForm<AgentFormValues>();
  const [currentStep, setCurrentStep] = useState(0);
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<AgentDetailRecord>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [regionPatched, setRegionPatched] = useState(false);
  const [adminSearching, setAdminSearching] = useState(false);
  const [adminMatchStatus, setAdminMatchStatus] =
    useState<AdminMatchStatus>('idle');
  const [matchedAdmin, setMatchedAdmin] = useState<SearchUserResult>();
  const [submitting, setSubmitting] = useState(false);
  const adminPhone = Form.useWatch('agentManagerPhone', form) || '';

  const pageTitle = isEditMode
    ? '修改代理商'
    : currentStep === 0
      ? '基础信息'
      : '管理员信息';

  const navigateBackToAgentList = (refresh = false) => {
    history.push('/agent/list');
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
    if (!isEditMode || !routeAgentId) {
      return;
    }

    let cancelled = false;

    const loadAgentDetail = async () => {
      setDetailLoading(true);
      try {
        const detail = await getAgentDetail(routeAgentId, {
          skipErrorHandler: true,
        });
        if (cancelled) {
          return;
        }
        setDetailRecord(detail);
        setRegionPatched(false);
        form.setFieldsValue({
          name: normalizeText(detail?.name),
          contactsName: normalizeText(detail?.contactsName),
          contactsPhone: normalizeText(detail?.contactsPhone),
          logoFileList: createRemoteUploadFileList(
            getAgentLogoPreviewUrl(detail),
            'agent',
          ),
          address: normalizeText(detail?.address),
        });
      } catch (error) {
        if (!cancelled) {
          message.error(getErrorMessage(error, '获取代理商详情失败'));
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadAgentDetail();
    return () => {
      cancelled = true;
    };
  }, [form, isEditMode, routeAgentId]);

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
      normalizeText(detailRecord?.provinceCode) ||
      normalizeText(detailRecord?.province);
    const cityCode =
      normalizeText(detailRecord?.cityCode) ||
      normalizeText(detailRecord?.city);
    const areaCode =
      normalizeText(detailRecord?.areaCode) ||
      normalizeText(detailRecord?.area);
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
    await form.validateFields(['name', 'regionCodes', 'address']);
    setCurrentStep(1);
  };

  const resetAdminMatchState = () => {
    setAdminMatchStatus('idle');
    setMatchedAdmin(undefined);
    form.setFieldsValue({
      agentManagerName: undefined,
      agentManagerNickName: undefined,
      agentManagerPassword: undefined,
      confirmPassword: undefined,
    });
  };

  const handleSearchAdmin = async () => {
    const phone = String(form.getFieldValue('agentManagerPhone') || '').trim();
    if (!phone || !isValidMainlandPhone(phone)) {
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
          agentManagerName: undefined,
          agentManagerNickName: undefined,
          agentManagerPassword: undefined,
          confirmPassword: undefined,
        });
        message.success('已匹配到现有用户');
      } else {
        setMatchedAdmin(undefined);
        setAdminMatchStatus('new');
        form.setFieldsValue({
          agentManagerName: undefined,
          agentManagerNickName: undefined,
          agentManagerPassword: undefined,
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
      province: String(province.label || '').trim(),
      city: String(city.label || '').trim(),
      area: String(area.label || '').trim(),
      provinceCode: String(province.value || '').trim(),
      cityCode: String(city.value || '').trim(),
      areaCode: String(area.value || '').trim(),
    };
  };

  const handleSubmit = async () => {
    const baseFieldNames = ['name', 'regionCodes', 'address'];
    if (!isEditMode && adminMatchStatus === 'idle') {
      await form.validateFields(['agentManagerPhone']);
      message.warning('请先匹配管理员手机号');
      return;
    }
    const validateFieldNames = [...baseFieldNames];
    if (!isEditMode) {
      validateFieldNames.push('agentManagerPhone');
      if (adminMatchStatus === 'matched') {
        validateFieldNames.push('agentManagerNickName');
      }
      if (adminMatchStatus === 'new') {
        validateFieldNames.push(
          'agentManagerName',
          'agentManagerNickName',
          'agentManagerPassword',
          'confirmPassword',
        );
      }
    }

    await form.validateFields(validateFieldNames);
    const values = form.getFieldsValue(true) as AgentFormValues;

    const contactsPhone = requiredText(values.contactsPhone);
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
      getAgentLogoId(detailRecord),
    );
    const basePayload = {
      name: requiredText(values.name),
      contactsName: requiredText(values.contactsName),
      contactsPhone,
      logoId: String(logoId || '').trim(),
      province: regionLabels.province,
      city: regionLabels.city,
      area: regionLabels.area,
      provinceCode: regionLabels.provinceCode,
      cityCode: regionLabels.cityCode,
      areaCode: regionLabels.areaCode,
      address: requiredText(values.address),
    };

    setSubmitting(true);
    try {
      if (isEditMode) {
        const response = await modifyAgent(
          {
            id: String(routeAgentId || '').trim(),
            ...basePayload,
          },
          { skipErrorHandler: true },
        );
        message.success(getApiMessage(response, '修改代理商成功'));
      } else {
        const managerPhone = requiredText(values.agentManagerPhone);
        if (!isValidMainlandPhone(managerPhone)) {
          message.warning('请输入正确的管理员手机号');
          return;
        }

        const response = await addAgent(
          {
            ...basePayload,
            agentManagerPhone: managerPhone,
            agentManagerName:
              adminMatchStatus === 'matched'
                ? requiredText(matchedAdmin?.name)
                : requiredText(values.agentManagerName),
            agentManagerNickName: requiredText(values.agentManagerNickName),
            agentManagerPassword:
              adminMatchStatus === 'new'
                ? requiredText(values.agentManagerPassword)
                : '',
            agentManagerAvatar:
              adminMatchStatus === 'matched'
                ? requiredText(matchedAdmin?.avatar)
                : '',
          },
          { skipErrorHandler: true },
        );
        message.success(getApiMessage(response, '新增代理商成功'));
      }

      navigateBackToAgentList(true);
    } catch (error) {
      message.error(
        getErrorMessage(
          error,
          isEditMode ? '修改代理商失败' : '新增代理商失败',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccessCurrentPage) {
    return (
      <PageContainer
        className="agent-create-container"
        contentWidth="Fluid"
        pageHeaderRender={false}
      >
        <div className="agent-create-page">
          <Card className="agent-create-card agent-wizard-card">
            <Result
              status="403"
              title="暂无权限"
              subTitle={
                isEditMode
                  ? '当前账号没有修改代理商权限'
                  : '当前账号没有新增代理商权限'
              }
              extra={
                <Button onClick={() => navigateBackToAgentList(false)}>
                  返回代理商列表
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
      className="agent-create-container"
      contentWidth="Fluid"
      pageHeaderRender={false}
    >
      <div className="agent-create-page">
        <Card
          className="agent-create-card agent-wizard-card"
          loading={detailLoading}
        >
          {!isEditMode && (
            <Steps
              className="agent-create-steps"
              current={currentStep}
              items={[{ title: '基础信息' }, { title: '管理员信息' }]}
            />
          )}
          <div className="agent-create-step-title">{pageTitle}</div>
          <Spin spinning={regionLoading && regionOptions.length === 0}>
            <Form<AgentFormValues>
              form={form}
              className="agent-create-form"
              layout="horizontal"
              colon={false}
              labelCol={{ flex: '118px' }}
              wrapperCol={{ flex: '520px' }}
              initialValues={{
                logoFileList: [],
              }}
            >
              {isEditMode || currentStep === 0 ? (
                <>
                  <Form.Item
                    label="代理商名称"
                    name="name"
                    rules={[{ required: true, message: '请输入代理商名称' }]}
                  >
                    <Input placeholder="请输入代理商名称" />
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
                    label="代理商logo"
                    name="logoFileList"
                    valuePropName="fileList"
                    getValueFromEvent={normalizeUploadFileList}
                  >
                    <Upload
                      accept="image/*"
                      customRequest={imageUploadRequest}
                      maxCount={1}
                      listType="picture-card"
                      className="agent-upload"
                    >
                      <div className="agent-upload-box u-flex-col u-flex-center">
                        <PlusOutlined />
                        <span>上传图片</span>
                      </div>
                    </Upload>
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
                    name="address"
                    rules={[{ required: true, message: '请输入详细地址' }]}
                  >
                    <Input placeholder="请输入详细地址" />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item label="管理员手机号" required>
                    <div className="agent-admin-phone-search">
                      <Form.Item
                        name="agentManagerPhone"
                        className="agent-inline-form-item"
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
                        <div className="agent-admin-result-banner matched">
                          已匹配到现有用户，将绑定为代理商管理员。
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
                        name="agentManagerNickName"
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
                        <div className="agent-admin-result-banner warning">
                          未匹配到现有用户，请补充管理员信息并创建新账号。
                        </div>
                      </Form.Item>
                      <Form.Item label="手机号">
                        <Input value={adminPhone} disabled />
                      </Form.Item>
                      <Form.Item
                        label="管理员姓名"
                        name="agentManagerName"
                        rules={[
                          { required: true, message: '请输入管理员姓名' },
                        ]}
                      >
                        <Input placeholder="请输入管理员姓名" />
                      </Form.Item>
                      <Form.Item
                        label="管理员昵称"
                        name="agentManagerNickName"
                        rules={[
                          { required: true, message: '请输入管理员昵称' },
                        ]}
                      >
                        <Input placeholder="请输入管理员昵称" />
                      </Form.Item>
                      <Form.Item
                        label="管理员密码"
                        name="agentManagerPassword"
                        rules={[{ required: true, message: '请输入登录密码' }]}
                      >
                        <Input.Password placeholder="请输入登录密码" />
                      </Form.Item>
                      <Form.Item
                        label="确认密码"
                        name="confirmPassword"
                        dependencies={['agentManagerPassword']}
                        rules={[
                          { required: true, message: '请输入确认密码' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (
                                !value ||
                                getFieldValue('agentManagerPassword') === value
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
          <div className="agent-create-actions u-flex">
            {isEditMode ? (
              <>
                <Button onClick={() => navigateBackToAgentList(false)}>
                  取消
                </Button>
                <Button
                  type="primary"
                  shape="round"
                  className="agent-create-save-btn"
                  loading={submitting}
                  onClick={() => void handleSubmit()}
                >
                  保存
                </Button>
              </>
            ) : currentStep === 0 ? (
              <>
                <Button onClick={() => navigateBackToAgentList(false)}>
                  取消
                </Button>
                <Button
                  type="primary"
                  shape="round"
                  className="agent-create-save-btn"
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
                  className="agent-create-save-btn"
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
