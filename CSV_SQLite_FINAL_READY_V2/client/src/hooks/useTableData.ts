import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocalStorage } from "./useLocalStorage";
import { Record, Column } from "@shared/schema";

interface UseTableDataProps {
  databaseId: number;
  filters?: {
    text?: string;
    column?: string;
    type?: string;
  };
  showDuplicates?: boolean | null;
}

interface UseTableDataResult {
  records: Record[];
  columns: Column[];
  totalCount: number;
  page: number;
  setPage: (page: number) => void;
  pageSize: number | string;
  setPageSize: (size: number | string) => void;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
}

export function useTableData({
  databaseId,
  filters,
  showDuplicates
}: UseTableDataProps): UseTableDataResult {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useLocalStorage<number | string>("pageSize", 50);
  
  // Reset page when database or filters change
  useEffect(() => {
    setPage(1);
  }, [databaseId, filters]);
  
  // Prepare query parameters
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  });
  
  if (filters?.text) {
    queryParams.set("text", filters.text);
  }
  
  if (filters?.column && filters.column !== "all") {
    queryParams.set("column", filters.column);
  }
  
  if (filters?.type) {
    queryParams.set("filterType", filters.type);
  }
  
  // Fetch columns
  const { data: columns = [] } = useQuery({
    queryKey: [`/api/databases/${databaseId}/columns`],
    enabled: !!databaseId,
    refetchInterval: 3000, // Автоматически обновлять данные каждые 3 секунды
    refetchIntervalInBackground: true
  });
  
  // Fetch records
  const { 
    data: recordsData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: [
      `/api/databases/${databaseId}/records?${queryParams.toString()}`,
      databaseId,
      page,
      pageSize,
      filters
    ],
    enabled: !!databaseId,
    refetchInterval: 3000, // Автоматически обновлять данные каждые 3 секунды
    refetchIntervalInBackground: true
  });
  
  // Process records data
  const records = recordsData?.records || [];
  const totalCount = recordsData?.totalCount || 0;
  
  // Filter duplicates if specified
  const filteredRecords = showDuplicates === null
    ? records
    : records.filter((record: Record) => record.isDuplicate === showDuplicates);
  
  // Calculate pagination info
  const totalPages = pageSize === "all" 
    ? 1 
    : Math.ceil(totalCount / (pageSize as number));
  
  return {
    records: filteredRecords,
    columns,
    totalCount,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    isLoading,
    error: error as Error | null
  };
}
