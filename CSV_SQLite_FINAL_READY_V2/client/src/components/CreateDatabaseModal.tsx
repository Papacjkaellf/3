import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateDatabaseModalProps {
  onClose: () => void;
  onDatabaseCreated: (databaseId: number) => void;
}

export default function CreateDatabaseModal({
  onClose,
  onDatabaseCreated
}: CreateDatabaseModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [databaseName, setDatabaseName] = useState("");
  const [importCity, setImportCity] = useState("");
  
  // Create database mutation
  const createDatabaseMutation = useMutation({
    mutationFn: async (data: { name: string, importCity?: string }) => {
      const response = await apiRequest("POST", "/api/databases", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/databases"] });
      toast({
        title: t("database-created"),
        description: t("database-created-message", { name: data.name }),
        variant: "default",
      });
      onDatabaseCreated(data.id);
    },
    onError: (error) => {
      toast({
        title: t("database-creation-error"),
        description: t("database-creation-error-message"),
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!databaseName.trim()) {
      toast({
        title: t("validation-error"),
        description: t("enter-database-name"),
        variant: "destructive",
      });
      return;
    }
    
    createDatabaseMutation.mutate({
      name: databaseName,
      importCity: importCity.trim() || undefined
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t("create-new-db")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label
              htmlFor="db-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t("db-name")}
            </Label>
            <Input
              type="text"
              id="db-name"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder={databaseName || "AllTywekCustomersBase"}
            />
          </div>
          
          <div className="mb-4">
            <Label
              htmlFor="import-city"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t("import-city")}
            </Label>
            <Input
              type="text"
              id="import-city"
              value={importCity}
              onChange={(e) => setImportCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Париж / Paris / Manchester"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("import-city-hint")}
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createDatabaseMutation.isPending}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {t("create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
