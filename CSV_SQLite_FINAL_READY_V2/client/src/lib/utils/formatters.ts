/**
 * Форматеры ячеек таблицы для специальных типов данных
 */
import { createElement } from 'react';

/**
 * Проверяет, является ли строка Email адресом
 */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Проверяет, является ли строка URL адресом
 */
export function isUrl(value: string): boolean {
  try {
    new URL(value.startsWith('http') ? value : `https://${value}`);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Проверяет, является ли строка номером телефона
 */
export function isPhoneNumber(value: string): boolean {
  return /^[+\d()\-\s]+$/.test(value) && /\d{5,}/.test(value);
}

/**
 * Форматирует номер телефона для отображения
 */
export function formatPhoneNumber(phone: string): string {
  return phone;
}

/**
 * Форматирует Email адрес в виде ссылки для Gmail с CC функцией
 * @param email Email адрес
 * @returns HTML элемент с ссылкой
 */
export function formatEmail(email: string | null): JSX.Element | string {
  if (!email) return "";
  
  // Создание ссылки для Gmail с CC
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  
  return createElement(
    'a',
    {
      href: gmailUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-blue-500 hover:text-blue-700 hover:underline'
    },
    email
  );
}

/**
 * Форматирует номер телефона в виде ссылки для WhatsApp
 * @param phone Номер телефона
 * @returns HTML элемент с ссылкой
 */
export function formatPhone(phones: string | null, singlePhone?: string): JSX.Element | string {
  if (!phones) return "";
  
  // Function to standardize phone number format
  const standardizePhone = (phone: string): string => {
    const cleaned = phone.trim().replace(/[^\d+]/g, "");
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('33') || cleaned.startsWith('44')) return '+' + cleaned;
    if (cleaned.length === 9) return '+33' + cleaned;
    return cleaned;
  };

  // Function to check if numbers are duplicates
  const arePhonesDuplicate = (phone1: string, phone2: string): boolean => {
    const std1 = standardizePhone(phone1);
    const std2 = standardizePhone(phone2);
    return std1 === std2 || (std1.length > 0 && std2.length > 0 && std1.endsWith(std2) || std2.endsWith(std1));
  };

  // Split and clean phone numbers
  const phoneNumbers = phones.split(/,\s*/);
  
  // Filter out duplicates and non-international format
  const uniquePhones = phoneNumbers.reduce((acc: string[], phone: string) => {
    const standardized = standardizePhone(phone.trim());
    
    // Skip if it's a duplicate of the single phone column
    if (singlePhone && arePhonesDuplicate(phone, singlePhone)) {
      return acc;
    }
    
    // Skip if it's not in international format or is a duplicate
    if (!standardized.startsWith('+')) return acc;
    
    // Check if this number is a duplicate of any existing number
    const isDuplicate = acc.some(existingPhone => 
      arePhonesDuplicate(standardized, existingPhone)
    );
    
    if (!isDuplicate) {
      acc.push(standardized);
    }
    
    return acc;
  }, []);

  if (uniquePhones.length === 0) return "";
  
  if (uniquePhones.length === 1) {
    const whatsappUrl = `https://wa.me/${uniquePhones[0].substring(1)}`;
    return createElement(
      'a',
      {
        href: whatsappUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-green-500 hover:text-green-700 hover:underline'
      },
      uniquePhones[0]
    );
  }

  return createElement(
    'span',
    null,
    uniquePhones.map((phone, index) => {
      const whatsappUrl = `https://wa.me/${phone.substring(1)}`;
      return [
        createElement(
          'a',
          {
            key: index,
            href: whatsappUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'text-green-500 hover:text-green-700 hover:underline'
          },
          phone
        ),
        index < uniquePhones.length - 1 ? ", " : ""
      ];
    }).flat()
  );
}

/**
 * Форматирует URL в виде кликабельной ссылки
 * @param url URL адрес
 * @returns HTML элемент с ссылкой
 */
export function formatUrl(url: string | null): JSX.Element | string {
  if (!url) return "";
  
  // Добавляем протокол, если его нет
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Получаем домен для отображения
  let displayText = url;
  try {
    const urlObj = new URL(fullUrl);
    displayText = urlObj.hostname;
  } catch (e) {
    // Если не удалось распарсить URL, оставляем как есть
  }
  
  return createElement(
    'a',
    {
      href: fullUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-blue-500 hover:text-blue-700 hover:underline'
    },
    displayText
  );
}

/**
 * Форматирует Google Maps URL в виде кликабельной ссылки
 * @param url Google Maps URL
 * @returns HTML элемент с ссылкой
 */
export function formatGoogleMapsUrl(url: string | null): JSX.Element | string {
  if (!url) return "";
  
  return createElement(
    'a',
    {
      href: url,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-red-500 hover:text-red-700 hover:underline'
    },
    'Карта'
  );
}

/**
 * Форматирует Facebook URL в виде кликабельной ссылки
 * @param url Facebook URL
 * @returns HTML элемент с ссылкой
 */
export function formatFacebookUrl(url: string | null): JSX.Element | string {
  if (!url) return "";
  
  return createElement(
    'a',
    {
      href: url.startsWith('http') ? url : `https://${url}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-blue-600 hover:text-blue-800 hover:underline'
    },
    'Facebook'
  );
}

/**
 * Форматирует Instagram URL в виде кликабельной ссылки
 * @param url Instagram URL
 * @returns HTML элемент с ссылкой
 */
export function formatInstagramUrl(url: string | null): JSX.Element | string {
  if (!url) return "";
  
  return createElement(
    'a',
    {
      href: url.startsWith('http') ? url : `https://${url}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-pink-600 hover:text-pink-800 hover:underline'
    },
    'Instagram'
  );
}

/**
 * Форматирует Twitter URL в виде кликабельной ссылки
 * @param url Twitter URL
 * @returns HTML элемент с ссылкой
 */
export function formatTwitterUrl(url: string | null): JSX.Element | string {
  if (!url) return "";
  
  return createElement(
    'a',
    {
      href: url.startsWith('http') ? url : `https://${url}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-blue-400 hover:text-blue-600 hover:underline'
    },
    'Twitter'
  );
}

/**
 * Форматирует Yelp URL в виде кликабельной ссылки
 * @param url Yelp URL
 * @returns HTML элемент с ссылкой
 */
export function formatYelpUrl(url: string | null): JSX.Element | string {
  if (!url) return "";
  
  return createElement(
    'a',
    {
      href: url.startsWith('http') ? url : `https://${url}`,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-red-600 hover:text-red-800 hover:underline'
    },
    'Yelp'
  );
}

/**
 * Форматирует любое значение как текст с безопасной конвертацией
 * @param value Любое значение
 * @returns Строка или пустая строка для null/undefined
 */
export function formatText(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value);
}