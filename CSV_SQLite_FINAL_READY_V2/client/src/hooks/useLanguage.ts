import { translations } from "@/lib/translations";

interface UseLanguageResult {
  language: "ru";
  toggleLanguage: () => void; // Сохраняем для совместимости
  t: (key: string, params?: Record<string, any>) => string;
}

// Создаем тип для ключей перевода
type TranslationKey = keyof typeof translations.ru;

export function useLanguage(): UseLanguageResult {
  // Фиксированный русский язык
  const language = "ru";
  
  // Заглушка для совместимости со старым кодом
  const toggleLanguage = () => {
    // Ничего не делаем, т.к. язык всегда русский
  };
  
  // Translation function
  const t = (key: string, params?: Record<string, any>): string => {
    // Проверяем, является ли ключ допустимым ключом перевода
    const translation = (translations.ru as any)[key] || key;
    
    if (!params) return translation;
    
    // Replace parameters in the translation string
    return Object.entries(params).reduce(
      (result, [param, value]) => result.replace(`{${param}}`, String(value)),
      translation
    );
  };
  
  return { language, toggleLanguage, t };
}
