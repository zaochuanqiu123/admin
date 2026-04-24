import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useAccess, useParams } from '@umijs/max';
import {
  AutoComplete,
  Button,
  Card,
  Cascader,
  Form,
  Input,
  message,
  Radio,
  Result,
  Select,
  Steps,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  type AddressCityNode,
  getAddressProvinceCityArea,
} from '@/api/address';
import { getCurrentStoreBusiness } from '@/api/business';
import {
  addStore,
  getStoreDetail,
  getStoreNum,
  modifyStore,
  type StoreDetailRecord,
  type StoreNumVO,
} from '@/api/store';
import type { SearchUserResult } from '@/api/user';
import { ROUTE_TAB_REFRESH_EVENT } from '@/components/Layout/RouteTabsKeepAlive';
import UserPhoneMatchFields, {
  type UserPhoneMatchStatus,
} from '@/components/UserPhoneMatchFields';
import {
  createRemoteUploadFileList,
  imageUploadRequest,
  normalizeUploadFileList,
  resolveUploadAttachmentId,
} from '@/pages/form/shared/upload';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import { STORE_PERMS } from '../store-perms';
import './index.less';

const DEFAULT_CENTER = { lat: 31.2304, lng: 121.4737 };
const MAP_MARKER_ID = 'store-center';
const DIRECT_STORE_CLASS = 1;
const NORMAL_SUPPLIER_TYPE = 1;
const TENCENT_MAP_KEY =
  typeof __TENCENT_MAP_KEY__ !== 'undefined' ? __TENCENT_MAP_KEY__ : '';

type SupplierTypeValue = 1 | 2;

type SuggestionItem = {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
};

type SuggestionOption = {
  key: string;
  value: string;
  label: ReactNode;
  item: SuggestionItem;
};

type GeocodeResult = {
  recommend: string;
  standardAddress: string;
};

type BusinessOption = {
  label: string;
  value: string;
};

type RegionOption = {
  value: string;
  label: string;
  isLeaf?: boolean;
  loading?: boolean;
  children?: RegionOption[];
};

type StoreCreateFormValues = {
  businessCode?: string;
  storeClass: number;
  supplierType: SupplierTypeValue;
  storeName?: string;
  storePhone?: string;
  shopImgFileList?: UploadFile[];
  logoFileList?: UploadFile[];
  regionCodes?: string[];
  longitude?: string;
  latitude?: string;
  storeAddress?: string;
  storeDetailAddress?: string;
  originShopId?: string;
  storeManagerPhone?: string;
  storeManagerName?: string;
  storeManagerNickName?: string;
  storeManagerPassword?: string;
  confirmPassword?: string;
};

type StoreRouteParams = {
  id?: string;
};

function loadScriptOnce(
  id: string,
  src: string,
  readyCheck: () => boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const safeResolve = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const safeReject = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const onLoad = () => {
      if (readyCheck()) {
        safeResolve();
        return;
      }
      window.setTimeout(() => {
        if (readyCheck()) {
          safeResolve();
          return;
        }
        safeReject(new Error(`${id} loaded but sdk not ready`));
      }, 80);
    };
    if (readyCheck()) {
      safeResolve();
      return;
    }
    const existingScript = document.getElementById(
      id,
    ) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', onLoad, { once: true });
      existingScript.addEventListener(
        'error',
        () => safeReject(new Error(`${id} load failed`)),
        { once: true },
      );
      window.setTimeout(onLoad, 0);
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = src;
    script.onload = onLoad;
    script.onerror = () => safeReject(new Error(`${id} load failed`));
    document.head.appendChild(script);
  });
}

function loadTencentGLMapScript(key: string): Promise<void> {
  if (!key) {
    return Promise.reject(new Error('missing tencent map key'));
  }
  return loadScriptOnce(
    'tencent-map-gl-sdk-script',
    `https://map.qq.com/api/gljs?v=1.exp&libraries=service&key=${key}`,
    () => Boolean((window as any).TMap?.Map),
  );
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requestTencentJsonp<T>(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `__tencent_jsonp_${Date.now()}_${Math.floor(
      Math.random() * 10000,
    )}`;
    const query = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
      ),
      output: 'jsonp',
      callback: callbackName,
      cb: callbackName,
    });
    const script = document.createElement('script');
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('tencent jsonp timeout'));
    }, 10000);
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      try {
        delete (window as any)[callbackName];
      } catch {}
      script.parentNode?.removeChild(script);
    };
    (window as any)[callbackName] = (payload: T) => {
      cleanup();
      resolve(payload);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('tencent jsonp load failed'));
    };
    script.src = `${endpoint}?${query.toString()}`;
    document.body.appendChild(script);
  });
}

function normalizeSuggestionItems(rawList: any[]): SuggestionItem[] {
  const list: SuggestionItem[] = [];
  for (const [index, item] of rawList.entries()) {
    const lat = toNumber(item?.location?.lat ?? item?.lat);
    const lng = toNumber(item?.location?.lng ?? item?.lng);
    if (lat === null || lng === null) {
      continue;
    }
    list.push({
      id: String(item?.id || `${lat}-${lng}-${index}`),
      title: String(item?.title || item?.name || ''),
      address: String(item?.address || item?.addr || ''),
      lat,
      lng,
    });
  }
  return list;
}

function extractRecommendFromGeocode(payload: any): string {
  return String(payload?.result?.formatted_addresses?.recommend || '');
}

function extractStandardAddressFromGeocode(payload: any): string {
  return String(payload?.result?.formatted_addresses?.standard_address || '');
}

async function fetchSuggestionListByGL(
  keyword: string,
): Promise<SuggestionItem[]> {
  const TMap = (window as any).TMap;
  if (!TMap?.service?.Suggestion) {
    return [];
  }
  try {
    const suggestion = new TMap.service.Suggestion({
      pageSize: 10,
      region: '',
      regionFix: false,
    });
    const result =
      typeof suggestion.getSuggestions === 'function'
        ? await suggestion.getSuggestions({ keyword })
        : typeof suggestion.getSuggestion === 'function'
          ? await suggestion.getSuggestion({ keyword })
          : null;
    const rawList = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.result?.data)
        ? result.result.data
        : [];
    return normalizeSuggestionItems(rawList);
  } catch {
    return [];
  }
}

async function fetchSuggestionList(
  keyword: string,
  key: string,
): Promise<SuggestionItem[]> {
  if (!keyword || !key) return [];
  const glList = await fetchSuggestionListByGL(keyword);
  if (glList.length > 0) return glList;
  const data: any = await requestTencentJsonp(
    'https://apis.map.qq.com/ws/place/v1/suggestion',
    {
      keyword,
      region: '全国',
      region_fix: 0,
      policy: 0,
      page_size: 10,
      key,
    },
  );
  if (data?.status !== 0 || !Array.isArray(data?.data)) {
    return [];
  }
  return normalizeSuggestionItems(data.data as any[]);
}

async function reverseGeocodeByGL(
  lat: number,
  lng: number,
): Promise<GeocodeResult> {
  const TMap = (window as any).TMap;
  if (!TMap?.service?.Geocoder || !TMap?.LatLng) {
    throw new Error('tencent gl geocoder unavailable');
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (result: GeocodeResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error('tencent gl geocoder failed'));
    };
    const handlePayload = (payload: any) => {
      const recommend = extractRecommendFromGeocode(payload);
      const standardAddress = extractStandardAddressFromGeocode(payload);
      if (recommend || standardAddress) {
        finish({ recommend, standardAddress });
      } else {
        fail();
      }
    };
    try {
      const geocoder = new TMap.service.Geocoder({
        complete: handlePayload,
        error: fail,
      });
      const maybePromise = geocoder.getAddress({
        location: new TMap.LatLng(lat, lng),
      });
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(handlePayload).catch(fail);
      }
    } catch {
      fail();
    }
  });
}

async function reverseGeocodeByWebService(
  lat: number,
  lng: number,
  key: string,
): Promise<GeocodeResult> {
  const data: any = await requestTencentJsonp(
    'https://apis.map.qq.com/ws/geocoder/v1/',
    {
      location: `${lat},${lng}`,
      key,
    },
  );
  if (data?.status !== 0) {
    throw new Error('tencent geocoder response invalid');
  }
  const recommend = extractRecommendFromGeocode(data);
  const standardAddress = extractStandardAddressFromGeocode(data);
  if (!recommend && !standardAddress) {
    throw new Error('tencent geocoder empty');
  }
  return { recommend, standardAddress };
}

async function reverseGeocodeWithFallback(
  lat: number,
  lng: number,
  key: string,
): Promise<GeocodeResult | null> {
  try {
    return await reverseGeocodeByGL(lat, lng);
  } catch {}
  try {
    return await reverseGeocodeByWebService(lat, lng, key);
  } catch {}
  return null;
}

function readCoordinateValue(
  ...values: Array<string | number | undefined | null>
): string {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return '';
}

function getDetailAttachmentId(value: string | undefined) {
  const text = String(value || '').trim();
  return text && !/^https?:\/\//i.test(text) ? text : '';
}

function formatStoreNum(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : '--';
}

function findRegionOptionByText(
  options: RegionOption[],
  target: string | undefined,
) {
  const normalizedTarget = String(target || '').trim();
  if (!normalizedTarget) {
    return undefined;
  }
  return options.find((option) => {
    const optionLabel = String(option.label || '').trim();
    const optionValue = String(option.value || '').trim();
    return optionLabel === normalizedTarget || optionValue === normalizedTarget;
  });
}

function buildRegionOptions(
  nodes: AddressCityNode[],
  nextLevel: 1 | 2 | 3,
): RegionOption[] {
  return nodes.map((node) => ({
    value: String(node?.city_code || ''),
    label: String(node?.city_name || ''),
    isLeaf: nextLevel >= 3,
  }));
}

function findRegionPath(
  options: RegionOption[],
  values: string[],
): RegionOption[] {
  const path: RegionOption[] = [];
  let currentOptions = options;
  for (const value of values) {
    const matched = currentOptions.find(
      (option) => String(option.value) === String(value),
    );
    if (!matched) {
      return [];
    }
    path.push(matched);
    currentOptions = matched.children || [];
  }
  return path;
}

export default function StoreCreatePage() {
  const access = useAccess() as {
    hasButtonPerm?: (value: string | string[]) => boolean;
  };
  const { id: routeStoreId } = useParams<StoreRouteParams>();
  const [form] = Form.useForm<StoreCreateFormValues>();
  const isEditMode = !!routeStoreId;
  const isUpdateMode = isEditMode;
  const canAccessCurrentPage = isEditMode
    ? !!access?.hasButtonPerm?.(STORE_PERMS.edit)
    : !!access?.hasButtonPerm?.(STORE_PERMS.add);
  const [currentStep, setCurrentStep] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [suggestionOptions, setSuggestionOptions] = useState<
    SuggestionOption[]
  >([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [businessOptions, setBusinessOptions] = useState<BusinessOption[]>([]);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [adminMatchStatus, setAdminMatchStatus] =
    useState<UserPhoneMatchStatus>('idle');
  const [matchedAdmin, setMatchedAdmin] = useState<SearchUserResult>();
  const [detailRecord, setDetailRecord] = useState<StoreDetailRecord>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [storeNumInfo, setStoreNumInfo] = useState<StoreNumVO>();
  const [storeNumLoading, setStoreNumLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapMarkerRef = useRef<any>(null);
  const geocodeRequestIdRef = useRef(0);
  const suggestionRequestIdRef = useRef(0);
  const suggestionTimerRef = useRef<number | null>(null);
  const selectingSuggestionRef = useRef(false);

  const storeAddress = Form.useWatch('storeAddress', form) || '';
  const longitude = Form.useWatch('longitude', form) || '';
  const latitude = Form.useWatch('latitude', form) || '';
  const pageTitle = isEditMode
    ? '修改门店'
    : currentStep === 0
      ? '基础信息'
      : '管理员信息';

  const navigateBackToStoreManage = (refresh = false) => {
    history.push('/form/store-manage');
    if (!refresh) {
      return;
    }
    window.setTimeout(() => {
      window.dispatchEvent(new Event(ROUTE_TAB_REFRESH_EVENT));
    }, 120);
  };

  const buildSuggestionOptions = (list: SuggestionItem[]): SuggestionOption[] =>
    list.map((item) => ({
      key: item.id,
      value: item.title || item.address,
      label: (
        <div className="store-suggestion-option">
          <div className="store-suggestion-title">
            {item.title || item.address}
          </div>
          <div className="store-suggestion-address">{item.address}</div>
        </div>
      ),
      item,
    }));

  const moveMapWithMarker = (lat: number, lng: number) => {
    const TMap = (window as any).TMap;
    if (!TMap?.LatLng) return;
    const position = new TMap.LatLng(lat, lng);
    if (mapMarkerRef.current?.updateGeometries) {
      mapMarkerRef.current.updateGeometries([{ id: MAP_MARKER_ID, position }]);
    }
    if (typeof mapInstanceRef.current?.panTo === 'function') {
      mapInstanceRef.current.panTo(position);
      return;
    }
    if (typeof mapInstanceRef.current?.setCenter === 'function') {
      mapInstanceRef.current.setCenter(position);
    }
  };

  const applySuggestionItem = (item: SuggestionItem) => {
    selectingSuggestionRef.current = true;
    setSuggestionOptions([]);
    void (async () => {
      form.setFieldsValue({
        longitude: item.lng.toFixed(6),
        latitude: item.lat.toFixed(6),
      });
      moveMapWithMarker(item.lat, item.lng);
      const requestId = ++geocodeRequestIdRef.current;
      const geocode = await reverseGeocodeWithFallback(
        item.lat,
        item.lng,
        TENCENT_MAP_KEY,
      );
      if (requestId !== geocodeRequestIdRef.current) {
        return;
      }
      form.setFieldValue(
        'storeAddress',
        geocode?.recommend || item.title || '',
      );
      if (geocode?.standardAddress) {
        form.setFieldValue('storeDetailAddress', geocode.standardAddress);
      }
    })().finally(() => {
      window.setTimeout(() => {
        selectingSuggestionRef.current = false;
      }, 0);
    });
  };

  const requestSuggestionOptions = async (
    keyword: string,
  ): Promise<SuggestionItem[]> => {
    const trimmed = keyword.trim();
    if (!trimmed || !TENCENT_MAP_KEY) {
      setSuggestionOptions([]);
      return [];
    }
    const requestId = ++suggestionRequestIdRef.current;
    setSuggestionLoading(true);
    try {
      const list = await fetchSuggestionList(trimmed, TENCENT_MAP_KEY);
      if (requestId !== suggestionRequestIdRef.current) {
        return [];
      }
      setSuggestionOptions(buildSuggestionOptions(list));
      return list;
    } catch {
      if (requestId === suggestionRequestIdRef.current) {
        setSuggestionOptions([]);
      }
      return [];
    } finally {
      if (requestId === suggestionRequestIdRef.current) {
        setSuggestionLoading(false);
      }
    }
  };

  const handleAddressInputSearch = (value: string) => {
    if (selectingSuggestionRef.current) return;
    if (suggestionTimerRef.current !== null) {
      window.clearTimeout(suggestionTimerRef.current);
    }
    if (!value.trim()) {
      setSuggestionOptions([]);
      return;
    }
    suggestionTimerRef.current = window.setTimeout(() => {
      void requestSuggestionOptions(value);
    }, 300);
  };

  const handleSuggestionSelect = (_value: string, option: any) => {
    const item = (option as SuggestionOption | undefined)?.item;
    if (item) {
      applySuggestionItem(item);
    }
  };

  const handleAddressSearchSubmit = async () => {
    const list = await requestSuggestionOptions(storeAddress);
    if (list.length > 0) {
      applySuggestionItem(list[0]);
    }
  };

  const handleCoordinateBlur = () => {
    const lat = Number(form.getFieldValue('latitude'));
    const lng = Number(form.getFieldValue('longitude'));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      moveMapWithMarker(lat, lng);
    }
  };

  const requestRegionChildren = async (selectedOptions: RegionOption[]) => {
    const nextType = selectedOptions.length === 1 ? 1 : 2;
    return getAddressProvinceCityArea(
      {
        type: nextType as 1 | 2,
        provinceCode:
          selectedOptions.length >= 1
            ? String(selectedOptions[0]?.value || '')
            : '',
        cityCode:
          selectedOptions.length >= 2
            ? String(selectedOptions[1]?.value || '')
            : '',
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
      const list = await requestRegionChildren(selectedOptions);

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
    const loadBaseOptions = async () => {
      setBusinessLoading(true);
      try {
        const res = await getCurrentStoreBusiness({ skipErrorHandler: true });
        if (cancelled) return;
        const businessCode = String(res?.businessCode || '').trim();
        const businessName = String(res?.businessName || '').trim();
        const optionLabel = [businessCode, businessName]
          .filter(Boolean)
          .join(' ');
        if (businessCode && optionLabel) {
          setBusinessOptions([{ label: optionLabel, value: businessCode }]);
          form.setFieldValue('businessCode', businessCode);
        } else {
          setBusinessOptions([]);
          form.setFieldValue('businessCode', undefined);
        }
      } catch (error) {
        if (cancelled) return;
        setBusinessOptions([]);
        form.setFieldValue('businessCode', undefined);
        message.error(getErrorMessage(error, '获取所属业态失败'));
      } finally {
        if (!cancelled) setBusinessLoading(false);
      }
    };
    const loadRegionTree = async () => {
      setRegionLoading(true);
      try {
        const list = await getAddressProvinceCityArea(
          {
            type: 0,
            provinceCode: '',
            cityCode: '',
          },
          { skipErrorHandler: true },
        );
        if (!cancelled) {
          setRegionOptions(buildRegionOptions(list, 1));
        }
      } catch (error) {
        if (!cancelled) {
          setRegionOptions([]);
          message.error(getErrorMessage(error, '获取省市区失败'));
        }
      } finally {
        if (!cancelled) setRegionLoading(false);
      }
    };
    const loadStoreNumInfo = async () => {
      if (isUpdateMode) {
        setStoreNumInfo(undefined);
        return;
      }
      setStoreNumLoading(true);
      try {
        const res = await getStoreNum({ skipErrorHandler: true });
        if (!cancelled) {
          setStoreNumInfo(res || {});
        }
      } catch {
        if (!cancelled) {
          setStoreNumInfo(undefined);
        }
      } finally {
        if (!cancelled) setStoreNumLoading(false);
      }
    };
    void Promise.all([loadBaseOptions(), loadRegionTree(), loadStoreNumInfo()]);
    return () => {
      cancelled = true;
    };
  }, [form, isUpdateMode]);

  useEffect(() => {
    if (!isUpdateMode) {
      setDetailRecord(undefined);
      setDetailLoading(false);
      return;
    }
    if (!routeStoreId) {
      message.error('缺少门店 ID');
      return;
    }
    let cancelled = false;
    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const detail = await getStoreDetail(routeStoreId, {
          skipErrorHandler: true,
        });
        if (cancelled) {
          return;
        }
        setDetailRecord(detail);
        form.setFieldsValue({
          businessCode: String(detail?.businessCode || '').trim() || undefined,
          storeClass: Number(detail?.storeClass || DIRECT_STORE_CLASS),
          supplierType: Number(
            detail?.supplierType || NORMAL_SUPPLIER_TYPE,
          ) as SupplierTypeValue,
          storeName: String(detail?.storeName || '').trim(),
          storePhone: String(detail?.storePhone || '').trim(),
          shopImgFileList: createRemoteUploadFileList(
            detail?.shopImgUrl,
            'shop-image.png',
          ),
          logoFileList: createRemoteUploadFileList(
            detail?.logoUrl,
            'store-logo.png',
          ),
          longitude: readCoordinateValue(
            detail?.longitude,
            detail?.lng,
            detail?.storeLongitude,
          ),
          latitude: readCoordinateValue(
            detail?.latitude,
            detail?.lat,
            detail?.storeLatitude,
          ),
          storeAddress: String(detail?.storeAddress || '').trim(),
          storeDetailAddress: String(detail?.storeDetailAddress || '').trim(),
          originShopId: String(detail?.originShopId || '').trim(),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        message.error(getErrorMessage(error, '获取门店详情失败'));
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [form, isUpdateMode, routeStoreId]);

  useEffect(() => {
    if (!detailRecord || regionLoading || regionOptions.length === 0) {
      return;
    }
    const currentCodes = form.getFieldValue('regionCodes');
    if (Array.isArray(currentCodes) && currentCodes.length === 3) {
      return;
    }
    let cancelled = false;
    const fillRegionCodes = async () => {
      const provinceTarget = String(
        detailRecord.storeProvinceCode || detailRecord.storeProvince || '',
      ).trim();
      const cityTarget = String(
        detailRecord.storeCityCode || detailRecord.storeCity || '',
      ).trim();
      const areaTarget = String(
        detailRecord.storeAreaCode || detailRecord.storeArea || '',
      ).trim();

      const province = findRegionOptionByText(regionOptions, provinceTarget);
      if (!province) {
        return;
      }
      if (!Array.isArray(province.children)) {
        const cityList = await requestRegionChildren([province]);
        if (cancelled) {
          return;
        }
        province.children = buildRegionOptions(cityList, 2);
        setRegionOptions((prev) => [...prev]);
      }
      const city = findRegionOptionByText(province.children || [], cityTarget);
      if (!city) {
        return;
      }
      if (!Array.isArray(city.children)) {
        const areaList = await requestRegionChildren([province, city]);
        if (cancelled) {
          return;
        }
        city.children = buildRegionOptions(areaList, 3);
        setRegionOptions((prev) => [...prev]);
      }
      const area = findRegionOptionByText(city.children || [], areaTarget);
      if (!area || cancelled) {
        return;
      }
      form.setFieldValue('regionCodes', [
        String(province.value || ''),
        String(city.value || ''),
        String(area.value || ''),
      ]);
    };
    void fillRegionCodes().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [detailRecord, form, regionLoading, regionOptions]);

  useEffect(() => {
    return () => {
      if (suggestionTimerRef.current !== null) {
        window.clearTimeout(suggestionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!mapReady || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }
    moveMapWithMarker(lat, lng);
  }, [latitude, longitude, mapReady]);

  useEffect(() => {
    let disposed = false;
    let cleanupMap: (() => void) | null = null;
    if (currentStep !== 0) return () => {};
    if (!mapRef.current) return () => {};
    const initMap = async () => {
      if (!TENCENT_MAP_KEY) {
        throw new Error('missing tencent map key');
      }
      const handleMapPointSelect = async (lat: number, lng: number) => {
        form.setFieldsValue({
          longitude: lng.toFixed(6),
          latitude: lat.toFixed(6),
        });
        moveMapWithMarker(lat, lng);
        const requestId = ++geocodeRequestIdRef.current;
        const geocode = await reverseGeocodeWithFallback(
          lat,
          lng,
          TENCENT_MAP_KEY,
        );
        if (disposed || requestId !== geocodeRequestIdRef.current) {
          return;
        }
        if (geocode?.standardAddress) {
          form.setFieldValue('storeDetailAddress', geocode.standardAddress);
        }
        if (geocode?.recommend) {
          form.setFieldValue('storeAddress', geocode.recommend);
        }
      };
      await loadTencentGLMapScript(TENCENT_MAP_KEY);
      if (disposed || !mapRef.current) return;
      const TMap = (window as any).TMap;
      if (!TMap?.Map) {
        throw new Error('tencent gl sdk unavailable');
      }
      const center = new TMap.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
      const map = new TMap.Map(mapRef.current, { center, zoom: 13 });
      const marker = new TMap.MultiMarker({
        map,
        geometries: [{ id: MAP_MARKER_ID, position: center }],
      });
      mapInstanceRef.current = map;
      mapMarkerRef.current = marker;
      const onMapClick = (event: any) => {
        const latLng = event?.latLng;
        if (!latLng) return;
        void handleMapPointSelect(latLng.getLat(), latLng.getLng());
      };
      map.on('click', onMapClick);
      cleanupMap = () => {
        map.off('click', onMapClick);
        marker.setMap(null);
        if (typeof map.destroy === 'function') {
          map.destroy();
        }
        mapMarkerRef.current = null;
        mapInstanceRef.current = null;
      };
    };
    initMap()
      .then(() => {
        if (!disposed) {
          setMapReady(true);
          setMapError('');
        }
      })
      .catch(() => {
        if (!disposed) {
          setMapReady(false);
          setMapError(
            TENCENT_MAP_KEY
              ? '腾讯地图加载失败，请检查 key 白名单（如 localhost）或网络'
              : '未配置腾讯地图 Key（REACT_APP_TENCENT_MAP_KEY）',
          );
        }
      });
    return () => {
      disposed = true;
      cleanupMap?.();
    };
  }, [currentStep, form]);

  const handleNextStep = async () => {
    await form.validateFields([
      'businessCode',
      'storeClass',
      'supplierType',
      'storeName',
      'storePhone',
      'shopImgFileList',
      'logoFileList',
      'regionCodes',
      'longitude',
      'latitude',
      'storeAddress',
      'storeDetailAddress',
    ]);
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    const baseFieldNames = [
      'businessCode',
      'storeClass',
      'supplierType',
      'storeName',
      'storePhone',
      'shopImgFileList',
      'logoFileList',
      'regionCodes',
      'longitude',
      'latitude',
      'storeAddress',
      'storeDetailAddress',
    ];
    if (!isUpdateMode && adminMatchStatus === 'idle') {
      await form.validateFields(['storeManagerPhone']);
      message.warning('请先匹配管理员手机号');
      return;
    }
    const validateFieldNames = [...baseFieldNames];
    if (!isUpdateMode) {
      validateFieldNames.push('storeManagerPhone');
      if (adminMatchStatus === 'matched') {
        validateFieldNames.push('storeManagerNickName');
      }
      if (adminMatchStatus === 'new') {
        validateFieldNames.push(
          'storeManagerName',
          'storeManagerNickName',
          'storeManagerPassword',
          'confirmPassword',
        );
      }
    }
    const values = await form.validateFields(validateFieldNames);
    const regionPath = findRegionPath(
      regionOptions,
      Array.isArray(values.regionCodes) ? values.regionCodes : [],
    );
    if (regionPath.length !== 3) {
      message.warning('请选择完整的省市区');
      return;
    }
    setSubmitting(true);
    try {
      const shopImgId = await resolveUploadAttachmentId(
        values.shopImgFileList,
        getDetailAttachmentId(detailRecord?.shopImgId),
      );
      const logoId = await resolveUploadAttachmentId(
        values.logoFileList,
        getDetailAttachmentId(detailRecord?.logoId),
      );
      const payload = {
        storeName: String(values.storeName || '').trim(),
        businessCode: String(values.businessCode || '').trim(),
        logoId,
        shopImgId,
        storePhone: String(values.storePhone || '').trim(),
        storeAddress: String(values.storeAddress || '').trim(),
        storeProvince: String(regionPath[0]?.label || '').trim(),
        storeCity: String(regionPath[1]?.label || '').trim(),
        storeArea: String(regionPath[2]?.label || '').trim(),
        storeProvinceCode: String(regionPath[0]?.value || '').trim(),
        storeCityCode: String(regionPath[1]?.value || '').trim(),
        storeAreaCode: String(regionPath[2]?.value || '').trim(),
        storeDetailAddress: String(values.storeDetailAddress || '').trim(),
        longitude: String(values.longitude || '').trim(),
        latitude: String(values.latitude || '').trim(),
        originShopId: String(values.originShopId || '').trim(),
        storeClass: Number(values.storeClass || DIRECT_STORE_CLASS),
        supplierType: Number(values.supplierType || NORMAL_SUPPLIER_TYPE),
      };
      if (isUpdateMode) {
        if (!routeStoreId) {
          message.error('缺少门店 ID');
          return;
        }
        const response = await modifyStore(
          {
            id: routeStoreId,
            ...payload,
          },
          { skipErrorHandler: true },
        );
        message.success(getApiMessage(response, '修改门店成功'));
        navigateBackToStoreManage(true);
        return;
      }
      const response = await addStore(
        {
          ...payload,
          storeManagerPhone: String(values.storeManagerPhone || '').trim(),
          storeManagerName:
            adminMatchStatus === 'matched'
              ? String(matchedAdmin?.name || '').trim()
              : String(values.storeManagerName || '').trim(),
          storeManagerNickName: String(
            values.storeManagerNickName || '',
          ).trim(),
          storeManagerPassword:
            adminMatchStatus === 'new'
              ? String(values.storeManagerPassword || '').trim()
              : '',
        },
        { skipErrorHandler: true },
      );
      message.success(getApiMessage(response, '新增门店成功'));
      navigateBackToStoreManage(true);
    } catch (error) {
      message.error(
        getErrorMessage(error, isUpdateMode ? '修改门店失败' : '新增门店失败'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccessCurrentPage) {
    return (
      <PageContainer
        className="store-create-container"
        contentWidth="Fluid"
        pageHeaderRender={false}
      >
        <div className="store-create-page">
          <Card className="store-create-card wizard-card">
            <Result
              status="403"
              title="暂无权限"
              subTitle={
                isEditMode
                  ? '当前账号没有修改门店权限'
                  : '当前账号没有新增门店权限'
              }
              extra={
                <Button onClick={() => navigateBackToStoreManage(false)}>
                  返回门店管理
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
      className="store-create-container"
      contentWidth="Fluid"
      pageHeaderRender={false}
    >
      <div className="store-create-page">
        <Card className="store-create-card wizard-card" loading={detailLoading}>
          {!isUpdateMode ? (
            <Steps
              className="store-create-steps"
              current={currentStep}
              items={[{ title: '基础信息' }, { title: '管理员信息' }]}
            />
          ) : null}
          <div className="store-create-step-heading">
            <div className="store-create-step-title">{pageTitle}</div>
            {!isUpdateMode ? (
              <div className="store-create-quota">
                <span>
                  可创建门店：
                  {storeNumLoading
                    ? '--'
                    : formatStoreNum(storeNumInfo?.storeNum)}
                </span>
                <span>
                  剩余：
                  {storeNumLoading
                    ? '--'
                    : formatStoreNum(storeNumInfo?.remainingStoresToCreate)}
                </span>
              </div>
            ) : null}
          </div>
          <Form<StoreCreateFormValues>
            form={form}
            className="store-create-form"
            layout="horizontal"
            colon={false}
            labelCol={{ flex: '118px' }}
            wrapperCol={{ flex: '520px' }}
            initialValues={{
              storeClass: DIRECT_STORE_CLASS,
              supplierType: NORMAL_SUPPLIER_TYPE,
              shopImgFileList: [],
              logoFileList: [],
              longitude: '',
              latitude: '',
            }}
          >
            {currentStep === 0 ? (
              <>
                <Form.Item
                  label="所属业态"
                  name="businessCode"
                  rules={[{ required: true, message: '请选择所属业态' }]}
                >
                  <Select
                    placeholder="请选择所属业态"
                    loading={businessLoading}
                    options={businessOptions}
                    optionFilterProp="label"
                  />
                </Form.Item>
                <Form.Item
                  label="经营类型"
                  name="storeClass"
                  rules={[{ required: true, message: '请选择经营类型' }]}
                >
                  <Radio.Group
                    className="store-radio-group"
                    optionType="button"
                    buttonStyle="solid"
                    options={[{ label: '直营店', value: DIRECT_STORE_CLASS }]}
                    disabled
                  />
                </Form.Item>
                <Form.Item
                  label="供货商类型"
                  name="supplierType"
                  rules={[{ required: true, message: '请选择供货商类型' }]}
                >
                  <Radio.Group
                    className="store-radio-group"
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                      { label: '常规供货商', value: 1 },
                      { label: '寄售供货商', value: 2 },
                    ]}
                  />
                </Form.Item>
                <Form.Item
                  label="门店名称"
                  name="storeName"
                  rules={[{ required: true, message: '请输入门店名称' }]}
                >
                  <Input placeholder="请输入门店名称" />
                </Form.Item>
                <Form.Item label="门店电话" name="storePhone">
                  <Input placeholder="请输入门店电话/手机号" />
                </Form.Item>
                <Form.Item
                  label="门头照片"
                  name="shopImgFileList"
                  valuePropName="fileList"
                  getValueFromEvent={normalizeUploadFileList}
                  rules={[
                    {
                      validator: async (
                        _rule,
                        value: UploadFile[] | undefined,
                      ) => {
                        if (!value || value.length === 0) {
                          throw new Error('请上传门头照片');
                        }
                      },
                    },
                  ]}
                  extra="选择图片后会自动上传。"
                >
                  <Upload
                    accept="image/*"
                    customRequest={imageUploadRequest}
                    maxCount={1}
                    listType="picture-card"
                    className="store-upload"
                  >
                    <div className="upload-box u-flex-col u-flex-center">
                      <PlusOutlined />
                      <span>上传图片</span>
                    </div>
                  </Upload>
                </Form.Item>
                <Form.Item
                  label="门店 logo"
                  name="logoFileList"
                  valuePropName="fileList"
                  getValueFromEvent={normalizeUploadFileList}
                >
                  <Upload
                    accept="image/*"
                    customRequest={imageUploadRequest}
                    maxCount={1}
                    listType="picture-card"
                    className="store-upload"
                  >
                    <div className="upload-box u-flex-col u-flex-center">
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
                      validator: async (_rule, value: string[] | undefined) => {
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
                <Form.Item label="经纬度">
                  <div className="latlng-group">
                    <Form.Item
                      name="longitude"
                      noStyle
                      rules={[{ required: true, message: '请输入经度' }]}
                    >
                      <Input placeholder="经度" onBlur={handleCoordinateBlur} />
                    </Form.Item>
                    <Form.Item
                      name="latitude"
                      noStyle
                      rules={[{ required: true, message: '请输入纬度' }]}
                    >
                      <Input placeholder="纬度" onBlur={handleCoordinateBlur} />
                    </Form.Item>
                  </div>
                </Form.Item>
                <Form.Item label="门店地址" required>
                  <div className="address-search">
                    <Form.Item
                      name="storeAddress"
                      className="store-inline-form-item"
                      rules={[{ required: true, message: '请输入门店地址' }]}
                    >
                      <AutoComplete
                        className="address-autocomplete"
                        placeholder="搜索地址"
                        options={suggestionOptions}
                        filterOption={false}
                        onSearch={handleAddressInputSearch}
                        onSelect={handleSuggestionSelect}
                        onChange={(value) => {
                          if (selectingSuggestionRef.current) {
                            return;
                          }
                          form.setFieldValue('storeAddress', value);
                          if (!String(value || '').trim()) {
                            setSuggestionOptions([]);
                          }
                        }}
                        open={
                          !!storeAddress.trim() &&
                          (suggestionLoading || suggestionOptions.length > 0)
                        }
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      loading={suggestionLoading}
                      onClick={() => void handleAddressSearchSubmit()}
                    />
                  </div>
                </Form.Item>
                <Form.Item label="地图定位">
                  <div className="map-box">
                    <div ref={mapRef} className="map-canvas" />
                    {!mapReady ? (
                      <div className="map-fallback u-flex-center">
                        {mapError || '地图加载中...'}
                      </div>
                    ) : null}
                  </div>
                </Form.Item>
                <Form.Item
                  label="详细地址"
                  name="storeDetailAddress"
                  rules={[{ required: true, message: '请输入详细地址' }]}
                >
                  <Input placeholder="请输入详细地址" />
                </Form.Item>
              </>
            ) : null}
            {currentStep === 1 ? (
              <UserPhoneMatchFields
                form={form}
                status={adminMatchStatus}
                matchedUser={matchedAdmin}
                onStatusChange={setAdminMatchStatus}
                onMatchedUserChange={setMatchedAdmin}
                phoneName="storeManagerPhone"
                nameName="storeManagerName"
                nickNameName="storeManagerNickName"
                passwordName="storeManagerPassword"
                confirmPasswordName="confirmPassword"
                phoneLabel="管理员手机号"
                phonePlaceholder="请输入管理员手机号"
                matchedMessage="已匹配到现有用户，将绑定为门店管理员。"
                newMessage="未匹配到现有用户，请补充管理员信息并创建新账号。"
                nameRequiredMessage="请输入管理员姓名"
                nickNameRequiredMessage="请输入管理员昵称"
              />
            ) : null}
          </Form>
          <div className="store-create-actions u-flex">
            {isEditMode ? (
              <>
                <Button onClick={() => navigateBackToStoreManage(false)}>
                  取消
                </Button>
                <Button
                  type="primary"
                  shape="round"
                  className="store-create-save-btn"
                  loading={submitting}
                  onClick={() => void handleSubmit()}
                >
                  保存
                </Button>
              </>
            ) : currentStep === 0 ? (
              <Button
                type="primary"
                shape="round"
                className="store-create-save-btn"
                onClick={() => void handleNextStep()}
              >
                下一步
              </Button>
            ) : (
              <>
                <Button onClick={() => setCurrentStep(0)}>上一步</Button>
                <Button
                  type="primary"
                  shape="round"
                  className="store-create-save-btn"
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
