import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { AutoComplete, Button, Card, Input, Select, Space, Switch } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import './index.less';

type BusinessType = 'direct' | 'join';
type SupplierType = 'normal' | 'consignment';

const DEFAULT_CENTER = { lat: 31.2304, lng: 121.4737 };
const MAP_MARKER_ID = 'store-center';
const TENCENT_MAP_KEY =
  typeof __TENCENT_MAP_KEY__ !== 'undefined' ? __TENCENT_MAP_KEY__ : '';

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

    const onError = () => {
      safeReject(new Error(`${id} load failed`));
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
      existingScript.addEventListener('error', onError, { once: true });
      window.setTimeout(onLoad, 0);
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = src;
    script.onload = onLoad;
    script.onerror = onError;
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
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
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

    const title = String(item?.title || item?.name || '');
    const address = String(item?.address || item?.addr || '');
    list.push({
      id: String(item?.id || `${lat}-${lng}-${index}`),
      title,
      address,
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
    const params = { keyword };

    let result: any = null;
    if (typeof suggestion.getSuggestions === 'function') {
      result = await suggestion.getSuggestions(params);
    } else if (typeof suggestion.getSuggestion === 'function') {
      result = await suggestion.getSuggestion(params);
    }

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
  if (!keyword || !key) {
    return [];
  }

  const glList = await fetchSuggestionListByGL(keyword);
  if (glList.length > 0) {
    return glList;
  }

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
  if (!key) {
    throw new Error('missing tencent map key');
  }

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
  return {
    recommend,
    standardAddress,
  };
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

const StoreCreatePage: React.FC = () => {
  const [businessType, setBusinessType] = useState<BusinessType>('direct');
  const [supplierType, setSupplierType] = useState<SupplierType>('normal');
  const [dadaEnabled, setDadaEnabled] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string>('');
  const [storeAddress, setStoreAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [suggestionOptions, setSuggestionOptions] = useState<
    SuggestionOption[]
  >([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapMarkerRef = useRef<any>(null);
  const geocodeRequestIdRef = useRef(0);
  const suggestionRequestIdRef = useRef(0);
  const suggestionTimerRef = useRef<number | null>(null);
  const selectingSuggestionRef = useRef(false);

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
    const marker = mapMarkerRef.current;
    if (marker?.updateGeometries) {
      marker.updateGeometries([{ id: MAP_MARKER_ID, position }]);
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    if (typeof map.panTo === 'function') {
      map.panTo(position);
      return;
    }
    if (typeof map.setCenter === 'function') {
      map.setCenter(position);
    }
  };

  const applySuggestionItem = (item: SuggestionItem) => {
    selectingSuggestionRef.current = true;
    setSuggestionOptions([]);
    void (async () => {
      setLongitude(item.lng.toFixed(6));
      setLatitude(item.lat.toFixed(6));
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

      if (geocode?.recommend) {
        setStoreAddress(geocode.recommend);
      } else {
        setStoreAddress(item.title || '');
      }
      if (geocode?.standardAddress) {
        setDetailAddress(geocode.standardAddress);
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
    setStoreAddress(value);
    if (selectingSuggestionRef.current) {
      return;
    }

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
    if (!item) return;
    applySuggestionItem(item);
  };

  const handleAddressValueChange = (value: string) => {
    setStoreAddress(value);
  };

  const handleAddressSearchSubmit = async () => {
    const list = await requestSuggestionOptions(storeAddress);
    if (list.length > 0) {
      applySuggestionItem(list[0]);
    }
  };

  useEffect(() => {
    return () => {
      if (suggestionTimerRef.current !== null) {
        window.clearTimeout(suggestionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let cleanupMap: (() => void) | null = null;

    if (!mapRef.current) return () => {};

    const initMap = async () => {
      if (!TENCENT_MAP_KEY) {
        throw new Error('missing tencent map key');
      }

      const handleMapPointSelect = async (lat: number, lng: number) => {
        setLongitude(lng.toFixed(6));
        setLatitude(lat.toFixed(6));
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
          setDetailAddress(geocode.standardAddress);
        }
        if (geocode?.recommend) {
          setStoreAddress(geocode.recommend);
        }
      };

      await loadTencentGLMapScript(TENCENT_MAP_KEY);
      if (disposed || !mapRef.current) return;

      const TMap = (window as any).TMap;
      if (!TMap?.Map) {
        throw new Error('tencent gl sdk unavailable');
      }

      const center = new TMap.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
      const map = new TMap.Map(mapRef.current, {
        center,
        zoom: 13,
      });
      const marker = new TMap.MultiMarker({
        map,
        geometries: [
          {
            id: MAP_MARKER_ID,
            position: center,
          },
        ],
      });
      mapInstanceRef.current = map;
      mapMarkerRef.current = marker;

      const onMapClick = (event: any) => {
        const latLng = event?.latLng;
        if (!latLng) return;

        const lat = latLng.getLat();
        const lng = latLng.getLng();
        void handleMapPointSelect(lat, lng);
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
        if (disposed) return;
        setMapReady(true);
        setMapError('');
      })
      .catch(() => {
        if (disposed) return;
        setMapReady(false);
        setMapError(
          TENCENT_MAP_KEY
            ? '腾讯地图加载失败，请检查 key 白名单（如 localhost）或网络'
            : '未配置腾讯地图 Key（REACT_APP_TENCENT_MAP_KEY）',
        );
      });

    return () => {
      disposed = true;
      cleanupMap?.();
    };
  }, []);

  return (
    <PageContainer
      title="门店管理"
      className="store-create-container"
      contentWidth="Fluid"
    >
      <div className="store-create-page">
        <Card title="基础信息" className="store-create-card">
          <div className="store-form-row">
            <div className="store-form-label required">门店行业</div>
            <div className="store-form-control">
              <Select
                placeholder="选择行业"
                options={[
                  { label: '中式正餐', value: 'cn' },
                  { label: '快餐简餐', value: 'fast' },
                  { label: '咖啡饮品', value: 'drink' },
                ]}
              />
            </div>
          </div>

          <div className="store-form-row">
            <div className="store-form-label required">经营类型</div>
            <div className="store-form-control">
              <Space size={0} className="choice-group">
                <button
                  type="button"
                  className={`choice-btn ${
                    businessType === 'direct' ? 'active' : ''
                  }`}
                  onClick={() => setBusinessType('direct')}
                >
                  直营店
                </button>
                <button
                  type="button"
                  className={`choice-btn ${businessType === 'join' ? 'active' : ''}`}
                  onClick={() => setBusinessType('join')}
                >
                  加盟店
                </button>
              </Space>
            </div>
          </div>

          <div className="store-form-row">
            <div className="store-form-label required">供货商类型</div>
            <div className="store-form-control">
              <Space size={0} className="choice-group">
                <button
                  type="button"
                  className={`choice-btn ${
                    supplierType === 'normal' ? 'active' : ''
                  }`}
                  onClick={() => setSupplierType('normal')}
                >
                  常规供货商
                </button>
                <button
                  type="button"
                  className={`choice-btn ${
                    supplierType === 'consignment' ? 'active' : ''
                  }`}
                  onClick={() => setSupplierType('consignment')}
                >
                  寄售供货商
                </button>
              </Space>
            </div>
          </div>

          <div className="store-form-row">
            <div className="store-form-label required">门店名称</div>
            <div className="store-form-control">
              <Input placeholder="请输入门店名称" />
            </div>
          </div>

          <div className="store-form-row">
            <div className="store-form-label required">门头照片</div>
            <div className="store-form-control">
              <div className="upload-box">
                <PlusOutlined />
                <span>上传图片</span>
              </div>
            </div>
          </div>

          <div className="store-form-row">
            <div className="store-form-label required">省市区</div>
            <div className="store-form-control">
              <Select
                placeholder="请选择省市区"
                options={[{ label: '上海市 / 闵行区', value: 'sh-mh' }]}
              />
            </div>
          </div>

          <div className="store-form-row">
            <div className="store-form-label">经纬度</div>
            <div className="store-form-control latlng-group">
              <Input
                placeholder="经度"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
              />
              <Input
                placeholder="纬度"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
              />
            </div>
          </div>

          <div className="store-form-row">
            <div className="store-form-label required">门店地址</div>
            <div className="store-form-control address-search">
              <AutoComplete
                className="address-autocomplete"
                placeholder="搜索地址"
                value={storeAddress}
                options={suggestionOptions}
                filterOption={false}
                onSearch={handleAddressInputSearch}
                onSelect={handleSuggestionSelect}
                onChange={handleAddressValueChange}
                open={
                  !!storeAddress.trim() &&
                  (suggestionLoading || suggestionOptions.length > 0)
                }
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                loading={suggestionLoading}
                onClick={() => void handleAddressSearchSubmit()}
              />
            </div>
          </div>

          <div className="store-form-row">
            <div className="store-form-label" />
            <div className="store-form-control">
              <div className="map-box">
                <div ref={mapRef} className="map-canvas" />
                {!mapReady ? (
                  <div className="map-fallback">
                    {mapError || '地图加载中...'}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="store-form-row">
            <div className="store-form-label required">详细地址</div>
            <div className="store-form-control">
              <Input
                placeholder="请输入详细地址"
                value={detailAddress}
                onChange={(event) => setDetailAddress(event.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card title="功能信息" className="store-create-card function-card">
          <div className="function-row">
            <div className="function-row-title">达达配送</div>
            <Space size={12}>
              <span className={`feature-status ${dadaEnabled ? 'on' : 'off'}`}>
                {dadaEnabled ? '开启' : '关闭'}
              </span>
              <Switch checked={dadaEnabled} onChange={setDadaEnabled} />
            </Space>
          </div>
        </Card>

        <div className="store-create-actions">
          <Button
            type="primary"
            shape="round"
            className="store-create-save-btn"
          >
            保存
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default StoreCreatePage;
