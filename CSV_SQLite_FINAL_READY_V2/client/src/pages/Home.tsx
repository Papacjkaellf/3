import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import FileUpload from "@/components/FileUpload";
import CreateDatabaseModal from "@/components/CreateDatabaseModal";
import { useQuery } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLanguage } from "@/hooks/useLanguage";
import { Database } from "@shared/schema";

interface HomeProps {
  onThemeChange: (theme: "light" | "dark") => void;
  currentTheme: "light" | "dark";
}

export default function Home({ onThemeChange, currentTheme }: HomeProps) {
  // Language (только для t функции)
  const { t } = useLanguage();
  
  // Database state
  const [selectedDatabaseId, setSelectedDatabaseId] = useLocalStorage<number>("selectedDatabaseId", 1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>("sidebarCollapsed", false);
  
  // Filter state
  const [textFilter, setTextFilter] = useState("");
  const [columnFilter, setColumnFilter] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("contains");
  
  // Duplicate state
  const [showDuplicates, setShowDuplicates] = useState<boolean | null>(null);
  
  // Get all databases
  const { data: databases = [] } = useQuery<Database[]>({
    queryKey: ["/api/databases"],
    onSuccess: (data) => {
      // Проверяем, существует ли выбранная база данных
      if (data.length > 0 && !data.some(db => db.id === selectedDatabaseId)) {
        // Если выбранной базы нет в списке, сбрасываем на первую доступную
        console.log('Выбранная база данных не найдена, сбрасываем на первую доступную');
        setSelectedDatabaseId(data[0].id);
      }
    }
  });

  // Open create database modal
  const handleCreateDatabase = () => {
    setShowCreateModal(true);
  };

  // Handle database creation success
  const handleDatabaseCreated = (databaseId: number) => {
    setSelectedDatabaseId(databaseId);
    setShowCreateModal(false);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  return (
    <>
      <Header 
        databases={databases || []}
        selectedDatabaseId={selectedDatabaseId}
        onDatabaseChange={setSelectedDatabaseId}
        onCreateDatabase={handleCreateDatabase}
        theme={currentTheme}
        onThemeToggle={() => onThemeChange(currentTheme === "light" ? "dark" : "light")}
      />
      
      <main className="flex-1 flex overflow-hidden">
        <Sidebar 
          databaseId={selectedDatabaseId}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          textFilter={textFilter}
          onTextFilterChange={setTextFilter}
          columnFilter={columnFilter}
          onColumnFilterChange={setColumnFilter}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          showDuplicates={showDuplicates}
          onShowDuplicatesChange={setShowDuplicates}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <FileUpload databaseId={selectedDatabaseId} />
          
          <DataTable 
            databaseId={selectedDatabaseId}
            textFilter={textFilter}
            columnFilter={columnFilter}
            filterType={filterType}
            showDuplicates={showDuplicates}
          />
        </div>
      </main>
      
      {showCreateModal && (
        <CreateDatabaseModal 
          onClose={() => setShowCreateModal(false)}
          onDatabaseCreated={handleDatabaseCreated}
        />
      )}
    </>
  );
}
