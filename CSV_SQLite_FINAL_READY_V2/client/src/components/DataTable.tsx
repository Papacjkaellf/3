import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { 
  formatEmail, 
  formatPhone, 
  formatUrl, 
  formatGoogleMapsUrl,
  formatFacebookUrl,
  formatInstagramUrl,
  formatTwitterUrl,
  formatYelpUrl,
  formatText
} from "@/lib/utils/formatters";
import { 
  ArrowLeftIcon, 
  ArrowRightIcon, 
  DownloadIcon, 
  TrashIcon,
  ArrowUpDownIcon,
  Trash2Icon,
  RotateCcwIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "lucide-react";
import { Record, Column } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface DataTableProps {
  databaseId: number;
  textFilter: string;
  columnFilter: string;
  filterType: string;
  showDuplicates: boolean | null;
}

export default function DataTable({
  databaseId,
  textFilter,
  columnFilter,
  filterType,
  showDuplicates
}: DataTableProps) {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useLocalStorage<number | string>("pageSize", 50);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [resizingColumnKey, setResizingColumnKey] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [columnWidths, setColumnWidths] = useLocalStorage<Record<string, number>>(
    "columnWidths",
    {}
  );
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isClearDatabaseDialogOpen, setIsClearDatabaseDialogOpen] = useState(false);
  const [visibleRecords, setVisibleRecords] = useState(0);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const [mailLogicFilter, setMailLogicFilter] = useState(true);

  // Function to check if email matches domain logic
  const isEmailValid = (record: Record): boolean => {
    if (!mailLogicFilter) return true;

    const email = record.Email || record.email;
    if (!email) return false;

    // Split multiple emails if present
    const emails = email.split(',').map(e => e.trim());
    const name = (record.Name || record.name || '').toLowerCase();
    const website = (record.Website || record.website || '').toLowerCase();
    const domain = (record.Domain || record.domain || '').toLowerCase();

    // Helper function to extract domain from URL
    const extractDomain = (url: string): string => {
      return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();
    };

    // Check each email
    for (const singleEmail of emails) {
      const emailParts = singleEmail.split('@');
      const emailName = emailParts[0]?.toLowerCase() || '';
      const emailDomain = emailParts[1]?.toLowerCase() || '';

      // Normalize strings for comparison
      const normalizedName = name.replace(/[.\-_&\s]/g, '').toLowerCase();
      const normalizedEmailName = emailName.replace(/[.\-_]/g, '').toLowerCase();
      const normalizedEmailDomain = emailDomain.replace(/^www\./, '');

      // Website matching (if present)
      if (website) {
        const websiteDomain = extractDomain(website);
        // Extract base domain without TLD for comparison
        const websiteBase = websiteDomain.split('.').slice(0, -1).join('.');
        const emailBase = normalizedEmailDomain.split('.').slice(0, -1).join('.');

        if (websiteBase === emailBase) {
          return true;
        }
      }

      // Name matching
      const nameParts = normalizedName.split(/[\s&]+/);
      for (const part of nameParts) {
        if (part.length > 3 && (
          normalizedEmailName.includes(part) || 
          normalizedEmailDomain.includes(part)
        )) {
          return true;
        }
      }

      // Common email patterns
      const commonPrefixes = ['info', 'contact', 'hello', 'enquiries', 'admin'];
      if (commonPrefixes.includes(emailName) && (
        website?.includes(normalizedEmailDomain) ||
        domain?.includes(normalizedEmailDomain)
      )) {
        return true;
      }

      // Domain matching
      if (domain) {
        const normalizedDomain = domain.replace(/^www\./, '');
        if (normalizedEmailDomain === normalizedDomain) {
          return true;
        }
      }
    }

    return false;
  };

  // Reset page when database changes
  useEffect(() => {
    setPage(1);
  }, [databaseId]);

  // Get columns for the current database
  const { data: columns = [] } = useQuery({
    queryKey: [`/api/databases/${databaseId}/columns`],
    enabled: !!databaseId
  });

  // Get visible columns
  const visibleColumns = columns.filter((col: Column) => col.visible);

  // Prepare query params for data fetch
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString()
  });

  if (textFilter) {
    queryParams.set("text", textFilter);
  }

  if (columnFilter && columnFilter !== "all") {
    queryParams.set("column", columnFilter);
  }

  if (filterType) {
    queryParams.set("filterType", filterType);
  }

  // Get records with pagination and filters
  const { data: recordsData, isLoading } = useQuery({
    queryKey: [
      `/api/databases/${databaseId}/records?${queryParams.toString()}`, 
      databaseId, 
      page, 
      pageSize, 
      textFilter,
      columnFilter,
      filterType
    ],
    enabled: !!databaseId
  });

  // Apply duplicate filtering in the client
  const records = recordsData?.records || [];
  const totalCount = recordsData?.totalCount || 0;

  const displayedRecords = showDuplicates === null 
    ? records
    : records.filter((record: Record) => record.isDuplicate === showDuplicates);

  // Calculate pagination info
  const totalPages = pageSize === "all" ? 1 : Math.ceil(totalCount / (pageSize as number));

  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value === "all" ? "all" : parseInt(e.target.value);
    setPageSize(newSize);
    setPage(1);
  };

  // Handle pagination
  const goToPage = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Get initial column widths from columns or localStorage
  useEffect(() => {
    if (columns && columns.length > 0) {
      const initialWidths: Record<string, number> = {};

      // Initialize width for any columns that don't have a stored width
      columns.forEach((col: Column) => {
        if (!columnWidths[col.key]) {
          // Set default widths based on column type
          let defaultWidth = 150;  // Default width

          // Custom widths based on column types
          if (col.key === 'id') defaultWidth = 60;
          else if (col.key === 'name') defaultWidth = 200;
          else if (col.key === 'email' || col.key === 'website') defaultWidth = 180;
          else if (col.key === 'phone' || col.key === 'phones') defaultWidth = 150;
          else if (col.key === 'fulladdress') defaultWidth = 250;

          initialWidths[col.key] = defaultWidth;
        }
      });

      // Only update if we have new widths to add
      if (Object.keys(initialWidths).length > 0) {
        setColumnWidths(prev => ({
          ...prev,
          ...initialWidths
        }));
      }
    }
  }, [columns, columnWidths, setColumnWidths]);

  // Handle column resize start
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.pageX;
    const columnWidth = columnWidths[columnKey] || 150;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const currentX = e.pageX;
      const difference = currentX - startX;
      const newWidth = Math.max(50, columnWidth + difference);

      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setResizingColumnKey(null);
    };

    setResizingColumnKey(columnKey);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Render clickable content based on type
  const renderCellContent = (record: Record, column: Column) => {
    const value = record[column.key as keyof Record];
    if (value === null || value === undefined) {
      // Если значение не найдено, попробуем найти по альтернативному имени
      let alternativeKey: string | null = null;

      // Проверяем старые имена для новых ключей
      if (column.key === 'Name') alternativeKey = 'name';
      else if (column.key === 'Email') alternativeKey = 'email';
      else if (column.key === 'Phone') alternativeKey = 'phone';
      else if (column.key === 'Phones') alternativeKey = 'phones';
      else if (column.key === 'Website') alternativeKey = 'website';
      else if (column.key === 'Domain') alternativeKey = 'domain';
      else if (column.key === 'Facebook') alternativeKey = 'facebook';
      else if (column.key === 'Instagram') alternativeKey = 'instagram';
      else if (column.key === 'Twitter') alternativeKey = 'twitter';
      else if (column.key === 'Yelp') alternativeKey = 'yelp';
      else if (column.key === 'Fulladdress') alternativeKey = 'fulladdress';
      else if (column.key === 'Street') alternativeKey = 'street';
      else if (column.key === 'Municipality') alternativeKey = 'municipality';
      else if (column.key === 'Categories') alternativeKey = 'categories';
      else if (column.key === 'Claimed') alternativeKey = 'claimed';
      else if (column.key === 'Review Count') alternativeKey = 'reviewCount';
      else if (column.key === 'Average Rating') alternativeKey = 'averageRating';
      else if (column.key === 'Review URL') alternativeKey = 'reviewUrl';
      else if (column.key === 'Google Maps URL') alternativeKey = 'googleMapsUrl';
      else if (column.key === 'Latitude') alternativeKey = 'latitude';
      else if (column.key === 'Longitude') alternativeKey = 'longitude';
      else if (column.key === 'Plus code') alternativeKey = 'plusCode';
      else if (column.key === 'Opening hours') alternativeKey = 'openingHours';
      else if (column.key === 'Featured image') alternativeKey = 'featuredImage';
      else if (column.key === 'Cid') alternativeKey = 'cid';
      else if (column.key === 'Place Id') alternativeKey = 'placeId';
      else if (column.key === 'Kgmid') alternativeKey = 'kgmid';
      else if (column.key === 'Google Knowledge URL') alternativeKey = 'googleKnowledgeUrl';
      else if (column.key === 'Social Medias') alternativeKey = 'socialMedias';

      // Проверяем новые имена для старых ключей
      else if (column.key === 'name') alternativeKey = 'Name';
      else if (column.key === 'email') alternativeKey = 'Email';
      else if (column.key === 'phone') alternativeKey = 'Phone';
      else if (column.key === 'phones') alternativeKey = 'Phones';
      else if (column.key === 'website') alternativeKey = 'Website';
      else if (column.key === 'domain') alternativeKey = 'Domain';
      else if (column.key === 'facebook') alternativeKey = 'Facebook';
      else if (column.key === 'instagram') alternativeKey = 'Instagram';
      else if (column.key === 'twitter') alternativeKey = 'Twitter';
      else if (column.key === 'yelp') alternativeKey = 'Yelp';
      else if (column.key === 'fulladdress') alternativeKey = 'Fulladdress';
      else if (column.key === 'street') alternativeKey = 'Street';
      else if (column.key === 'municipality') alternativeKey = 'Municipality';
      else if (column.key === 'categories') alternativeKey = 'Categories';
      else if (column.key === 'claimed') alternativeKey = 'Claimed';
      else if (column.key === 'reviewCount') alternativeKey = 'Review Count';
      else if (column.key === 'averageRating') alternativeKey = 'Average Rating';
      else if (column.key === 'reviewUrl') alternativeKey = 'Review URL';
      else if (column.key === 'googleMapsUrl') alternativeKey = 'Google Maps URL';
      else if (column.key === 'latitude') alternativeKey = 'Latitude';
      else if (column.key === 'longitude') alternativeKey = 'Longitude';
      else if (column.key === 'plusCode') alternativeKey = 'Plus code';
      else if (column.key === 'openingHours') alternativeKey = 'Opening hours';
      else if (column.key === 'featuredImage') alternativeKey = 'Featured image';
      else if (column.key === 'cid') alternativeKey = 'Cid';
      else if (column.key === 'placeId') alternativeKey = 'Place Id';
      else if (column.key === 'kgmid') alternativeKey = 'Kgmid';
      else if (column.key === 'googleKnowledgeUrl') alternativeKey = 'Google Knowledge URL';
      else if (column.key === 'socialMedias') alternativeKey = 'Social Medias';

      if (alternativeKey && record[alternativeKey as keyof Record]) {
        const alternativeValue = record[alternativeKey as keyof Record];
        if (alternativeValue !== null && alternativeValue !== undefined) {
          const stringValue = String(alternativeValue);
          return formatCellByType(column.key, alternativeKey, stringValue);
        }
      }

      return null;
    }

    const stringValue = String(value);
    return formatCellByType(column.key, null, stringValue, record);
  };

  // Форматирование ячейки в зависимости от типа данных
  const formatCellByType = (columnKey: string, alternativeKey: string | null, value: string, currentRecord: Record = {} as Record) => {
    // Используем ключ для определения типа форматирования
    const key = columnKey.toLowerCase();
    const altKey = alternativeKey ? alternativeKey.toLowerCase() : '';

    if (key === 'email' || altKey === 'email') {
      if (key === 'email' || key === 'Email') {
        return isEmailValid(currentRecord) ? formatEmail(value) : null;
      }
      return formatEmail(value);
    } else if (key === 'phone' || altKey === 'phone') {
      return formatPhone(value);
    } else if (key === 'phones' || altKey === 'phones') {
      const phoneValue = currentRecord['phone'] || currentRecord['Phone'];
      return formatPhone(value, phoneValue);
    } else if (key === 'website' || key === 'domain' || altKey === 'website' || altKey === 'domain') {
      return formatUrl(value);
    } else if (key.includes('google maps') || key === 'googlemapsurl' || altKey === 'googlemapsurl') {
      return formatGoogleMapsUrl(value);
    } else if (key === 'facebook' || altKey === 'facebook') {
      return formatFacebookUrl(value);
    } else if (key === 'instagram' || altKey === 'instagram') {
      return formatInstagramUrl(value);
    } else if (key === 'twitter' || altKey === 'twitter') {
      return formatTwitterUrl(value);
    } else if (key === 'yelp' || altKey === 'yelp') {
      return formatYelpUrl(value);
    } else {
      return formatText(value);
    }
  };

  // Обновляем количество видимых записей
  useEffect(() => {
    setVisibleRecords(displayedRecords.length);
  }, [displayedRecords]);

  // Настройка автоматического обновления данных
  useEffect(() => {
    // Очищаем предыдущий таймер при обновлении
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    // Создаем новый таймер обновления (каждые 3 секунды)
    const timer = setInterval(() => {
      if (databaseId) {
        queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/records`] });
        queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/columns`] });
      }
    }, 1000);

    setRefreshTimer(timer);

    // Очистка таймера при размонтировании
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [databaseId]);

  // Сброс выбранных записей при изменении страницы или фильтров
  useEffect(() => {
    setSelectedRecords(new Set());
    setSelectAll(false);
  }, [page, textFilter, columnFilter, filterType, showDuplicates, databaseId]);

  // Мутация для удаления записей
  const deleteMutation = useMutation({
    mutationFn: async (recordIds: number[]) => {
      // Для каждой записи вызываем DELETE запрос
      const promises = recordIds.map(id => 
        apiRequest(`/api/records/${id}`, { 
          method: "DELETE" 
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      // Инвалидируем запросы, чтобы обновить данные
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/records`] });
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/duplicates/count`] });

      // Сбрасываем выбранные записи
      setSelectedRecords(new Set());
      setSelectAll(false);
    }
  });

  // Мутация для очистки базы данных
  const clearDatabaseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/databases/${databaseId}/clear`, { 
        method: "DELETE" 
      });
    },
    onSuccess: () => {
      // Инвалидируем запросы, чтобы обновить данные
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/records`] });
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/duplicates/count`] });

      // Сбрасываем выбранные записи
      setSelectedRecords(new Set());
      setSelectAll(false);
    }
  });

  // Обработчик выбора всех записей
  const handleSelectAll = () => {
    if (selectAll) {
      // Если все уже выбраны, снимаем выбор
      setSelectedRecords(new Set());
    } else {
      // Иначе выбираем все записи на текущей странице
      const newSelected = new Set<number>();
      displayedRecords.forEach((record: Record) => {
        newSelected.add(record.id);
      });
      setSelectedRecords(newSelected);
    }
    setSelectAll(!selectAll);
  };

  // Обработчик выбора одной записи
  const handleSelectRecord = (id: number) => {
    const newSelected = new Set(selectedRecords);

    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }

    setSelectedRecords(newSelected);

    // Проверяем, все ли записи на странице выбраны
    setSelectAll(newSelected.size === displayedRecords.length && displayedRecords.length > 0);
  };

  // Обработчик удаления выбранных записей
  const handleDeleteSelected = () => {
    if (selectedRecords.size > 0) {
      setIsDeleteDialogOpen(true);
    }
  };

  // Обработчик подтверждения удаления
  const confirmDelete = () => {
    deleteMutation.mutate(Array.from(selectedRecords));
    setIsDeleteDialogOpen(false);
  };

  // Обработчик очистки базы данных
  const handleClearDatabase = () => {
    setIsClearDatabaseDialogOpen(true);
  };

  // Обработчик подтверждения очистки
  const confirmClearDatabase = () => {
    clearDatabaseMutation.mutate();
    setIsClearDatabaseDialogOpen(false);
  };

  return (
    <div className="flex-1 overflow-auto relative">
      {/* Resize indicator */}
      {resizingColumnKey && (
        <div className="absolute inset-0 bg-black bg-opacity-10 dark:bg-opacity-30 z-50 pointer-events-none flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 py-1 px-3 rounded-md shadow-lg text-sm font-medium">
            {t("resizing-column")}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t("total-records")}{" "}
              <span id="record-count" className="font-medium">
                {totalCount.toLocaleString()}
              </span>
            </span>
            <Badge variant="outline" className="text-xs">
              {t("visible")}: {visibleRecords}
            </Badge>
            {selectedRecords.size > 0 && (
              <Badge variant="secondary" className="text-xs">
                {t("selected")}: {selectedRecords.size}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setMailLogicFilter(!mailLogicFilter)}
              className={`flex items-center space-x-1 relative ${
                mailLogicFilter 
                  ? "bg-green-100 hover:bg-green-200 text-green-700 border-green-300" 
                  : "bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
              }`}
            >
              <span>MailLogic Filter</span>
              {mailLogicFilter ? (
                <>
                  <ArrowUpIcon className="h-4 w-4" />
                  {records.filter(record => !isEmailValid(record)).length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {records.filter(record => !isEmailValid(record)).length}
                    </span>
                  )}
                </>
              ) : (
                <ArrowDownIcon className="h-4 w-4" />
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleDeleteSelected()}
              disabled={selectedRecords.size === 0}
              className="flex items-center space-x-1 text-red-500 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
              <span>{t("delete-selected")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDatabase}
              className="flex items-center space-x-1 text-green-500 hover:text-green-700"
            >
              <Trash2Icon className="h-4 w-4" />
              <span>{t("clear-database")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm(t("confirm-delete-exact-duplicates"))) {
                  apiRequest("DELETE", `/api/databases/${databaseId}/exact-duplicates`).then(() => {
                    queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/records`] });
                    queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/duplicates/count`] });
                  });
                }
              }}
              className="flex items-center space-x-1 text-orange-500 hover:text-orange-700"
            >
              <RotateCcwIcon className="h-4 w-4" />
              <span>{t("delete-exact-duplicates")}</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center">
          <div className="flex items-center mr-4">
            <span className="text-sm text-gray-700 dark:text-gray-300 mr-2">
              {t("rows-per-page")}
            </span>
            <select
              id="page-size"
              value={pageSize.toString()}
              onChange={handlePageSizeChange}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
              <option value="all">{t("all")}</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {page} {t("of")} {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Container with horizontal scroll */}
      <div className="overflow-x-auto" ref={tableContainerRef}>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 font-mono text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
            <tr>
              {/* Checkbox column */}
              <th
                scope="col"
                className="table-header p-0 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap select-none"
                style={{ width: '20px', minWidth: '20px', maxWidth: '20px' }}
              >
                <div className="flex items-center justify-center h-full">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label={t("select-all-records")}
                    className="mx-auto"
                  />
                </div>
              </th>

              {/* Data columns */}
              {visibleColumns.map((column: Column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="table-header group px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap select-none cursor-col-resize relative"
                  data-column={column.key}
                  style={{
                    minWidth: `${columnWidths[column.key] || column.width}px`,
                    width: `${columnWidths[column.key] || column.width}px`
                  }}
                >
                  <div className="flex items-center">
                    <span>{column.name}</span>
                    {column.key === 'id' && (
                      <span className="ml-1 text-gray-400 dark:text-gray-500">
                        <ArrowUpDownIcon className="h-4 w-4" />
                      </span>
                    )}
                    <div
                      className="w-1 absolute right-0 top-0 h-full cursor-col-resize group-hover:bg-green-200 opacity-0 group-hover:opacity-100"
                      onMouseDown={(e) => handleResizeStart(e, column.key)}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {isLoading ? (
              // Loading state
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="animate-pulse">
                  {/* Checkbox cell */}
                  <td className="p-0 text-center" style={{ width: '20px', minWidth: '20px', maxWidth: '20px' }}>
                    <div className="flex items-center justify-center h-full">
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </td>

                  {/* Data cells */}
                  {visibleColumns.map((column: Column) => (
                    <td 
                      key={`skeleton-${index}-${column.id}`} 
                      className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{
                        maxWidth: `${columnWidths[column.key] || column.width}px`,
                        width: `${columnWidths[column.key] || column.width}px`
                      }}
                    >
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : displayedRecords.length > 0 ? (
              // Data rows
              displayedRecords.map((record: Record) => (
                <tr 
                  key={record.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    record.isDuplicate ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {/* Checkbox cell */}
                  <td className="p-0 text-center" style={{ width: '20px', minWidth: '20px', maxWidth: '20px' }}>
                    <div className="flex items-center justify-center h-full">
                      <Checkbox
                        checked={selectedRecords.has(record.id)}
                        onCheckedChange={() => handleSelectRecord(record.id)}
                        aria-label={t("select-record")}
                      />
                    </div>
                  </td>

                  {/* Data cells */}
                  {visibleColumns.map((column: Column) => (
                    <td 
                      key={`${record.id}-${column.id}`} 
                      className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{
                        maxWidth: `${columnWidths[column.key] || column.width}px`,
                        width: `${columnWidths[column.key] || column.width}px`
                      }}
                    >
                      {renderCellContent(record, column)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              // Empty state
              <tr>
                <td 
                  colSpan={visibleColumns.length + 1} // +1 for checkbox column 
                  className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {textFilter ? t("no-matching-records") : t("no-records")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog подтверждения удаления записей */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete-selected-records")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete-selected-records-confirm", { count: selectedRecords.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bgred-600">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog подтверждения очистки базы данных */}
      <AlertDialog open={isClearDatabaseDialogOpen} onOpenChange={setIsClearDatabaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clear-database")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clear-database-confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearDatabase} className="bg-red-500 hover:bg-red-600">
              {t("clear")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}