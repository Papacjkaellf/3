import Papa from 'papaparse';
import { CsvRow } from '@shared/schema';

export const useFileUpload = {
  /**
   * Parse a CSV file and return the data as an array of objects
   * @param file The CSV file to parse
   * @param onProgress Progress callback (0-1)
   * @returns Promise resolving to an array of row objects
   */
  parseCsvFile: (file: File, onProgress?: (progress: number) => void): Promise<CsvRow[]> => {
    return new Promise((resolve, reject) => {
      const results: CsvRow[] = [];
      let rowCount = 0;
      let processedCount = 0;
      
      // Проверка формата файла
      if (!file.name.toLowerCase().endsWith('.csv')) {
        reject(new Error('Неверный формат файла. Пожалуйста, загрузите файл CSV'));
        return;
      }
      
      // First pass to count total rows and validate format
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        delimitersToGuess: [',', ';', '\t', '|', '^'],
        encoding: 'UTF-8',
        error: (error) => {
          reject(new Error(`Ошибка при обработке CSV: ${error.message}`));
        },
        step: (results, parser) => {
          // Проверяем первую строку на наличие необходимых колонок
          if (rowCount === 0) {
            const headers = Object.keys(results.data);
            if (headers.length === 0) {
              parser.abort();
              reject(new Error('CSV файл не содержит заголовков колонок'));
              return;
            }
          }
          rowCount++;
        },
        complete: () => {
          // Second pass to process rows
          Papa.parse(file, {
            header: true,
            skipEmptyLines: 'greedy',
            delimitersToGuess: [',', ';', '\t', '|', '^'],
            encoding: 'UTF-8',
            transformHeader: (header) => header.trim(),
            error: (error) => {
              reject(new Error(`Ошибка при обработке CSV: ${error.message}`));
            },
            step: (row: Papa.ParseResult<any>) => {
              processedCount++;
              
              // Map CSV column names to our schema
              // Get all keys in lowercase for case-insensitive matching
              const dataKeys: Record<string, string> = {};
              Object.keys(row.data).forEach(key => {
                dataKeys[key.toLowerCase()] = key;
              });
              
              const getValue = (possibleKeys: string[]): string | null => {
                for (const key of possibleKeys) {
                  const lowerKey = key.toLowerCase();
                  if (dataKeys[lowerKey]) {
                    const originalKey = dataKeys[lowerKey];
                    // Use dynamic access with safety check
                    if (originalKey in row.data) {
                      // Безопасное приведение к Any для совместимости с PapaParse
                      const value = (row.data as any)[originalKey];
                      return value !== undefined && value !== "" ? String(value) : null;
                    }
                  }
                }
                return null;
              };
              
              // Создаем объект с точными именами полей из CSV
              const mappedRow: CsvRow = {};
              
              // Сначала сохраняем все оригинальные поля из CSV напрямую
              Object.keys(row.data).forEach(key => {
                // Безопасное приведение к Any для совместимости с PapaParse
                const value = (row.data as any)[key];
                if (value !== undefined) {
                  (mappedRow as any)[key] = value !== "" ? String(value) : null;
                }
              });
              
              // Для обратной совместимости также копируем в поля со старыми именами
              // Приводим row.data к типу Record<string, any>
              const data = row.data as Record<string, any>;
              
              if (data.Name) mappedRow.name = data.Name;
              if (data.Email) mappedRow.email = data.Email; 
              if (data.Phone) mappedRow.phone = data.Phone;
              if (data.Fulladdress) mappedRow.fulladdress = data.Fulladdress;
              if (data.Street) mappedRow.street = data.Street;
              if (data.Municipality) mappedRow.municipality = data.Municipality;
              if (data.Categories) mappedRow.categories = data.Categories;
              if (data.Phones) mappedRow.phones = data.Phones;
              if (data.Claimed) mappedRow.claimed = data.Claimed;
              if (data["Review Count"]) mappedRow.reviewCount = data["Review Count"];
              if (data["Average Rating"]) mappedRow.averageRating = data["Average Rating"];
              if (data["Review URL"]) mappedRow.reviewUrl = data["Review URL"];
              if (data["Google Maps URL"]) mappedRow.googleMapsUrl = data["Google Maps URL"];
              if (data.Latitude) mappedRow.latitude = data.Latitude;
              if (data.Longitude) mappedRow.longitude = data.Longitude;
              if (data["Plus code"]) mappedRow.plusCode = data["Plus code"];
              if (data.Website) mappedRow.website = data.Website;
              if (data.Domain) mappedRow.domain = data.Domain;
              if (data["Opening hours"]) mappedRow.openingHours = data["Opening hours"];
              if (data["Featured image"]) mappedRow.featuredImage = data["Featured image"];
              if (data.Cid) mappedRow.cid = data.Cid;
              if (data["Place Id"]) mappedRow.placeId = data["Place Id"];
              if (data.Kgmid) mappedRow.kgmid = data.Kgmid;
              if (data["Google Knowledge URL"]) mappedRow.googleKnowledgeUrl = data["Google Knowledge URL"];
              if (data["Social Medias"]) mappedRow.socialMedias = data["Social Medias"];
              if (data.Facebook) mappedRow.facebook = data.Facebook;
              if (data.Instagram) mappedRow.instagram = data.Instagram;
              if (data.Twitter) mappedRow.twitter = data.Twitter;
              if (data.Yelp) mappedRow.yelp = data.Yelp;
              
              results.push(mappedRow);
              
              if (onProgress && rowCount > 0) {
                onProgress(processedCount / rowCount);
              }
            },
            complete: () => {
              resolve(results);
            },
            error: (error: Error) => {
              reject(error);
            }
          });
        },
        error: (error: Error) => {
          reject(error);
        }
      });
    });
  }
};
