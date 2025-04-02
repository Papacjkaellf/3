import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Column } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  databaseId: number;
  collapsed: boolean;
  onToggle: () => void;
  textFilter: string;
  onTextFilterChange: (text: string) => void;
  columnFilter: string;
  onColumnFilterChange: (column: string) => void;
  filterType: string;
  onFilterTypeChange: (type: string) => void;
  showDuplicates: boolean | null;
  onShowDuplicatesChange: (show: boolean | null) => void;
}

export default function Sidebar({
  databaseId,
  collapsed,
  onToggle,
  textFilter,
  onTextFilterChange,
  columnFilter,
  onColumnFilterChange,
  filterType,
  onFilterTypeChange,
  showDuplicates,
  onShowDuplicatesChange
}: SidebarProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // Get columns for the current database
  const { data: columns = [] } = useQuery({
    queryKey: [`/api/databases/${databaseId}/columns`],
    enabled: !!databaseId
  });

  // Get duplicate count
  const { data: duplicateData } = useQuery({
    queryKey: [`/api/databases/${databaseId}/duplicates/count`],
    enabled: !!databaseId
  });

  // Update column visibility
  const updateColumnMutation = useMutation({
    mutationFn: async ({ id, visible }: { id: number; visible: boolean }) => {
      const response = await apiRequest("PATCH", `/api/columns/${id}`, { visible });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/columns`] });
    }
  });

  // Delete duplicates
  const deleteDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/databases/${databaseId}/duplicates`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/records`] });
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/duplicates/count`] });
      onShowDuplicatesChange(null);
    }
  });

  // Handle column visibility change
  const handleColumnVisibilityChange = (id: number, checked: boolean) => {
    updateColumnMutation.mutate({ id, visible: checked });
  };

  // Handle show/hide duplicates
  const handleDuplicatesAction = (action: "show" | "hide" | "all" | "delete") => {
    if (action === "show") {
      onShowDuplicatesChange(true);
    } else if (action === "hide") {
      onShowDuplicatesChange(false);
    } else if (action === "all") {
      onShowDuplicatesChange(null);
    } else if (action === "delete") {
      if (window.confirm(t("confirm-delete-duplicates"))) {
        deleteDuplicatesMutation.mutate();
      }
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 shadow-md rounded-r-lg p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 z-10"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    );
  }

  return (
    <aside className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out overflow-y-auto relative">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {t("column-settings")}
          </h2>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Column Visibility Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("column-visibility")}
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {columns.map((column: Column) => (
                <div key={column.id} className="flex items-center">
                  <Checkbox
                    id={`col-${column.id}`}
                    checked={column.visible}
                    onCheckedChange={(checked) => handleColumnVisibilityChange(column.id, !!checked)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                  <Label 
                    htmlFor={`col-${column.id}`} 
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {column.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Filtering Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("filters")}
            </h3>
            <div className="space-y-3">
              <div>
                <Label 
                  htmlFor="text-filter" 
                  className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                >
                  {t("text-filter")}
                </Label>
                <Input
                  type="text"
                  id="text-filter"
                  value={textFilter}
                  onChange={(e) => onTextFilterChange(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">
                    {t("column-filter")}
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    id="filter-column"
                    value={columnFilter}
                    onChange={(e) => onColumnFilterChange(e.target.value)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 p-1"
                  >
                    <option value="all">{t("all-columns")}</option>
                    {columns
                      .filter((col: Column) => col.key !== "id")
                      .map((column: Column) => (
                        <option key={column.id} value={column.key}>
                          {column.name}
                        </option>
                      ))}
                  </select>
                  <select
                    id="filter-type"
                    value={filterType}
                    onChange={(e) => onFilterTypeChange(e.target.value)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 p-1"
                  >
                    <option value="contains">{t("contains")}</option>
                    <option value="starts">{t("starts-with")}</option>
                    <option value="ends">{t("ends-with")}</option>
                    <option value="empty">{t("empty")}</option>
                    <option value="not-empty">{t("not-empty")}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Duplicates Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("duplicates")}
            </h3>
            <div className="space-y-2">
              <div className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                <span>{t("found-duplicates")}</span>
                <span className="font-semibold text-primary-600">
                  {duplicateData?.count || 0}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    {t("duplicates-filter")}:
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => handleDuplicatesAction("show")}
                      className={`text-xs px-2 py-1 rounded relative ${
                        showDuplicates === true 
                          ? "bg-blue-600 text-white dark:bg-blue-700" 
                          : "bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800"
                      }`}
                    >
                      {showDuplicates === true && (
                        <span className="absolute -top-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center text-white text-xs">
                          ✓
                        </span>
                      )}
                      {t("only-duplicates")}
                    </button>
                    <button
                      onClick={() => handleDuplicatesAction("hide")}
                      className={`text-xs px-2 py-1 rounded relative ${
                        showDuplicates === false 
                          ? "bg-green-600 text-white dark:bg-green-700" 
                          : "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-800"
                      }`}
                    >
                      {showDuplicates === false && (
                        <span className="absolute -top-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center text-white text-xs">
                          ✓
                        </span>
                      )}
                      {t("no-duplicates")}
                    </button>
                    <button
                      onClick={() => handleDuplicatesAction("all")}
                      className={`text-xs px-2 py-1 rounded relative ${
                        showDuplicates === null 
                          ? "bg-gray-600 text-white dark:bg-gray-700" 
                          : "bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {showDuplicates === null && (
                        <span className="absolute -top-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center text-white text-xs">
                          ✓
                        </span>
                      )}
                      {t("show-all")}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDuplicatesAction("delete")}
                  disabled={!duplicateData?.count}
                  className="text-xs px-2 py-1 w-full bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200 rounded hover:bg-red-100 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("delete-duplicates")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
