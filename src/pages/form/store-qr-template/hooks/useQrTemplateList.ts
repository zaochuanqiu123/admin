import { message } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteQrCodeTemplate,
  getQrCodeTemplatePageQuery,
  type QrCodeTemplateRecord,
} from '@/api/qrCodeTemplate';
import { getApiMessage, getErrorMessage } from '@/utils/apiMessage';
import { DEFAULT_PAGE_SIZE } from '../constants';
import type { QueryFilters } from '../types';

export function useQrTemplateList() {
  const [loading, setLoading] = useState(false);
  const [listInitialized, setListInitialized] = useState(false);
  const [listError, setListError] = useState<string>();
  const [records, setRecords] = useState<QrCodeTemplateRecord[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [draftFilters, setDraftFilters] = useState<QueryFilters>({
    name: '',
    state: undefined,
  });
  const [filters, setFilters] = useState<QueryFilters>({
    name: '',
    state: undefined,
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  });

  const current = pagination.current || 1;
  const pageSize = pagination.pageSize || DEFAULT_PAGE_SIZE;

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setListError(undefined);
    try {
      const res = await getQrCodeTemplatePageQuery(
        {
          current,
          pageSize,
          name: filters.name.trim() || undefined,
        },
        {
          skipErrorHandler: true,
        },
      );
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setServerTotal(Number(res?.total || 0));
    } catch (error) {
      console.error('load qr code templates failed:', error);
      const nextError = getErrorMessage(
        error,
        '获取二维码模板列表失败，请稍后重试',
      );
      setListError(nextError);
      message.error(nextError);
      return;
    } finally {
      setLoading(false);
      setListInitialized(true);
    }
  }, [current, filters.name, pageSize, refreshKey]);

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

      return true;
    });
  }, [filters.state, records]);

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
    };
    setDraftFilters(nextFilters);
    setFilters(nextFilters);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handlePageChange = (nextCurrent: number, nextPageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: nextCurrent,
      pageSize: nextPageSize,
    }));
  };

  const refreshFirstPage = () => {
    setRefreshKey((prev) => prev + 1);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await deleteQrCodeTemplate(id, {
        skipErrorHandler: true,
      });
      message.success(getApiMessage(res, '删除成功'));
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Delete template failed:', error);
      message.error(getErrorMessage(error, '删除失败'));
    }
  };

  const filteredTotal = filters.state ? filteredRecords.length : serverTotal;
  const initialListLoading = loading && !listInitialized;
  const refreshingList = loading && listInitialized;

  return {
    state: {
      loading,
      listInitialized,
      listError,
      records,
      filteredRecords,
      filteredTotal,
      initialListLoading,
      refreshingList,
      draftFilters,
      pagination,
    },
    actions: {
      setDraftFilters,
      handleSearch,
      handleReset,
      handlePageChange,
      refreshFirstPage,
      handleDeleteTemplate,
    },
  };
}
