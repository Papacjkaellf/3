import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFileUpload } from "@/hooks/useFileUpload";
import { CsvRow } from "@shared/schema";

interface FileUploadProps {
  databaseId: number;
}

interface FileImportStatus {
  file: File;
  progress: number;
  status: 'waiting' | 'parsing' | 'uploading' | 'completed' | 'error';
  error?: string;
  importCity?: string; // Город, указанный пользователем при импорте
}

export default function FileUpload({ databaseId }: FileUploadProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileImportStatus[]>([]);
  const [uploading, setUploading] = useState(false);

  // Import CSV mutation
  const importCsvMutation = useMutation({
    mutationFn: async (csvData: CsvRow[]) => {
      const response = await fetch(`/api/databases/${databaseId}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(csvData),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/records`] });
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/columns`] });
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/duplicates/count`] });
    },
    onError: (error) => {
      toast({
        title: t("import-error"),
        description: t("import-error-message"),
        variant: "destructive",
      });
    }
  });
  
  // Schema check mutation
  const checkSchemaMutation = useMutation({
    mutationFn: async (sample: CsvRow) => {
      const response = await fetch(`/api/databases/${databaseId}/check-schema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sample }),
      });
      return response.json();
    }
  });
  
  // Schema reset mutation
  const resetSchemaMutation = useMutation({
    mutationFn: async (sample: CsvRow) => {
      const response = await fetch(`/api/databases/${databaseId}/reset-schema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sample }),
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all database queries
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}`] });
    }
  });
  
  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: File[] = [];
      const newStatuses: FileImportStatus[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === "text/csv" || file.name.endsWith(".csv")) {
          newFiles.push(file);
          newStatuses.push({
            file,
            progress: 0,
            status: 'waiting'
          });
        } else {
          toast({
            title: t("invalid-file-type"),
            description: `${file.name}: ${t("select-csv-file")}`,
            variant: "destructive",
          });
        }
      }
      
      setSelectedFiles([...selectedFiles, ...newFiles]);
      setFileStatuses([...fileStatuses, ...newStatuses]);
    }
  };
  
  // Update status for a specific file
  const updateFileStatus = (index: number, updates: Partial<FileImportStatus>) => {
    setFileStatuses(prevStatuses => 
      prevStatuses.map((status, i) => 
        i === index ? { ...status, ...updates } : status
      )
    );
  };
  
  // Process single file
  const processFile = async (file: File, index: number): Promise<CsvRow[]> => {
    updateFileStatus(index, { status: 'parsing', progress: 0 });
    
    try {
      // Проверяем, указан ли город для файла
      const importCity = fileStatuses[index].importCity;
      if (!importCity) {
        throw new Error(t("city-missing-error"));
      }
      
      // Parse the CSV file
      const csvData = await useFileUpload.parseCsvFile(file, (progress) => {
        updateFileStatus(index, { progress: progress * 50 }); // First 50% for parsing
      });
      
      // Добавляем importCity в каждую запись
      csvData.forEach(row => {
        row.importCity = importCity;
      });
      
      // Set status to uploading
      updateFileStatus(index, { status: 'uploading', progress: 50 });
      
      // Simulate upload progress for the remaining 50%
      let progressInterval = setInterval(() => {
        setFileStatuses(prevStatuses => 
          prevStatuses.map((status, i) => 
            i === index ? { ...status, progress: Math.min(95, status.progress + 5) } : status
          )
        );
      }, 100);
      
      // Проверяем схему данных если есть строки
      if (csvData.length > 0) {
        // Получаем первую строку как образец для проверки схемы
        const sampleRow = csvData[0];
        
        try {
          // Проверка схемы
          const newColumns = await checkSchemaMutation.mutateAsync(sampleRow);
          
          // Если найдены новые колонки, спрашиваем пользователя подтверждение
          if (newColumns.length > 0) {
            clearInterval(progressInterval);
            
            // Запрашиваем подтверждение у пользователя через диалог
            const shouldReset = window.confirm(
              `${t("schema-mismatch-title")}\n\n${t("schema-mismatch-message")}\n\n${t("schema-mismatch-confirm")} / ${t("schema-mismatch-cancel")}`
            );
            
            if (shouldReset) {
              // Обновляем статус
              updateFileStatus(index, { status: 'uploading', progress: 60 });
              
              // Сбрасываем схему
              await resetSchemaMutation.mutateAsync(sampleRow);
              
              // Показываем уведомление об успешном обновлении
              toast({
                title: t("schema-updated"),
                description: t("schema-updated-message"),
                variant: "default",
              });
              
              // Возобновляем прогресс
              progressInterval = setInterval(() => {
                setFileStatuses(prevStatuses => 
                  prevStatuses.map((status, i) => 
                    i === index ? { ...status, progress: Math.min(95, status.progress + 5) } : status
                  )
                );
              }, 100);
            } else {
              // Пользователь отменил, прерываем импорт
              updateFileStatus(index, { 
                status: 'error', 
                progress: 0,
                error: t("schema-mismatch-cancel")
              });
              return [];
            }
          }
        } catch (error) {
          console.error("Error checking schema:", error);
        }
      }
      
      // Submit to the server
      const result = await importCsvMutation.mutateAsync(csvData);
      
      // Complete progress
      clearInterval(progressInterval);
      updateFileStatus(index, { status: 'completed', progress: 100 });
      
      // Show success toast
      toast({
        title: t("import-success"),
        description: `${t("Импортировано записей")}: ${result.imported || 0}, ${t("найдено дубликатов")}: ${result.duplicates || 0}, ${t("файл")}: ${file.name}`,
        variant: "default",
      });
      
      // Force refresh all database queries
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/records`] });
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/columns`] });
      queryClient.invalidateQueries({ queryKey: [`/api/databases/${databaseId}/duplicates/count`] });
      
      return csvData;
    } catch (error) {
      updateFileStatus(index, { 
        status: 'error', 
        progress: 0,
        error: error instanceof Error ? error.message : String(error)
      });
      
      toast({
        title: t("csv-parse-error"),
        description: `${file.name}: ${t("csv-parse-error-message")}`,
        variant: "destructive",
      });
      
      return [];
    }
  };
  
  // Process all files sequentially
  const processAllFiles = async () => {
    if (selectedFiles.length === 0 || !databaseId) return;
    
    setUploading(true);
    
    try {
      // Process files one by one
      for (let i = 0; i < selectedFiles.length; i++) {
        if (fileStatuses[i].status !== 'completed' && fileStatuses[i].status !== 'error') {
          await processFile(selectedFiles[i], i);
        }
      }
    } finally {
      setUploading(false);
      
      // Check if all files are processed
      const allProcessed = fileStatuses.every(
        status => status.status === 'completed' || status.status === 'error'
      );
      
      if (allProcessed) {
        // Reset file selection
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };
  
  // Remove file from the list
  const removeFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setFileStatuses(prevStatuses => prevStatuses.filter((_, i) => i !== index));
  };
  
  // Remove all completed or error files
  const clearProcessedFiles = () => {
    const indices = fileStatuses
      .map((status, index) => (status.status === 'completed' || status.status === 'error') ? index : -1)
      .filter(index => index !== -1)
      .sort((a, b) => b - a); // Sort in descending order to remove from end to beginning
    
    for (const index of indices) {
      removeFile(index);
    }
  };
  
  // Check if import button should be disabled
  const isImportDisabled = uploading || selectedFiles.length === 0 || 
    selectedFiles.every((_, i) => 
      fileStatuses[i]?.status === 'completed' || fileStatuses[i]?.status === 'error'
    );
  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {t("import-csv")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("import-description")}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="relative inline-flex items-center px-4 py-2 border border-primary-500 text-sm font-medium rounded-md text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-gray-900 hover:bg-primary-100 dark:hover:bg-gray-800 cursor-pointer">
            <span>{t("select-files")}</span>
            <input
              type="file"
              id="csv-file"
              ref={fileInputRef}
              accept=".csv"
              className="sr-only"
              onChange={handleFileChange}
              disabled={uploading}
              multiple
            />
          </label>
          <Button
            id="import-button"
            onClick={processAllFiles}
            disabled={isImportDisabled}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {t("import")}
          </Button>
          
          {fileStatuses.some(status => status.status === 'completed' || status.status === 'error') && (
            <Button
              variant="outline"
              onClick={clearProcessedFiles}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 text-sm"
            >
              {t("clear-processed")}
            </Button>
          )}
        </div>
      </div>
      
      {/* File list with progress */}
      {fileStatuses.length > 0 && (
        <div className="mt-4 space-y-3">
          {fileStatuses.map((fileStatus, index) => (
            <div key={`${fileStatus.file.name}-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm truncate max-w-xs">{fileStatus.file.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({Math.round(fileStatus.file.size / 1024)} KB)
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    fileStatus.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    fileStatus.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    fileStatus.status === 'parsing' || fileStatus.status === 'uploading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {fileStatus.status === 'completed' ? t('completed') :
                     fileStatus.status === 'error' ? t('error') :
                     fileStatus.status === 'parsing' ? t('parsing') :
                     fileStatus.status === 'uploading' ? t('uploading') :
                     t('waiting')}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {Math.round(fileStatus.progress)}%
                  </span>
                  {(fileStatus.status === 'completed' || fileStatus.status === 'error' || fileStatus.status === 'waiting') && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      disabled={uploading && fileStatus.status !== 'completed' && fileStatus.status !== 'error'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Input поля для указания города */}
              {fileStatus.status !== 'completed' && fileStatus.status !== 'error' && (
                <div className="mt-2 mb-2">
                  <Label htmlFor={`city-input-${index}`} className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                    {t("city-input-label")}:
                  </Label>
                  <Input
                    id={`city-input-${index}`}
                    type="text"
                    placeholder={t("city-input-placeholder")}
                    value={fileStatus.importCity || ''}
                    onChange={(e) => updateFileStatus(index, { importCity: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              )}
              
              <Progress value={fileStatus.progress} className="w-full h-2" />
              
              {fileStatus.error && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fileStatus.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
