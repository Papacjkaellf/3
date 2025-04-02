import { Database } from "@shared/schema";
import { Sun, Moon } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface HeaderProps {
  databases: Database[];
  selectedDatabaseId: number;
  onDatabaseChange: (id: number) => void;
  onCreateDatabase: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
}

export default function Header({
  databases,
  selectedDatabaseId,
  onDatabaseChange,
  onCreateDatabase,
  theme,
  onThemeToggle
}: HeaderProps) {
  const { t } = useLanguage();
  
  // Handle database selection
  const handleDatabaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "new_db") {
      onCreateDatabase();
    } else {
      onDatabaseChange(parseInt(value));
    }
  };
  
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <svg className="h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l5-3h6l5 3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8" />
              </svg>
              <h1 className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
                {t("app-title")}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Database Selector */}
            <div className="relative">
              <select
                id="database-selector"
                className="block appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-10 text-sm leading-5 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={selectedDatabaseId.toString()}
                onChange={handleDatabaseChange}
              >
                {databases.map((db) => (
                  <option key={db.id} value={db.id.toString()}>
                    {db.name}
                  </option>
                ))}
                <option value="new_db">{t("create-new-db")}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={onThemeToggle}
              className="bg-gray-200 dark:bg-gray-700 rounded-full p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {theme === "dark" ? (
                <Sun className="h-6 w-6" />
              ) : (
                <Moon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
