import { CSV_CONFIG, STANDARD_PRINT_SIZES, SIZE_MULTIPLIERS } from './print-sizes';
import { ProductSize } from './supabase-helpers';

/**
 * CSV Row Interface - Updated for individual size prices
 */
export interface CSVRow {
  name: string;
  category: string;
  stock: string | number;
  imageUrl: string;
  description?: string;
  videoUrl?: string;
  // Individual size prices and costs
  price_8x10?: string | number;
  cost_8x10?: string | number;
  price_11x14?: string | number;
  cost_11x14?: string | number;
  price_12x18?: string | number;
  cost_12x18?: string | number;
  price_16x20?: string | number;
  cost_16x20?: string | number;
  price_18x24?: string | number;
  cost_18x24?: string | number;
  price_20x30?: string | number;
  cost_20x30?: string | number;
  price_24x32?: string | number;
  cost_24x32?: string | number;
  price_24x36?: string | number;
  cost_24x36?: string | number;
}

/**
 * Parsed Product Interface
 */
export interface ParsedProduct {
  name: string;
  category: string;
  description: string;
  price: number;
  cost: number;
  image_url: string;
  stock: number;
  sizes: ProductSize[];
  video_url?: string;
}

/**
 * CSV Import Result
 */
export interface CSVImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  products: ParsedProduct[];
}

/**
 * Validates if a string is a valid image URL or filename
 */
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const lowerUrl = url.toLowerCase();
  return CSV_CONFIG.VALID_IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext));
}

/**
 * Converts filename to Supabase Storage URL if needed
 * If already a full URL, returns as-is
 * @param imageUrlOrFilename - Either a full URL or just a filename
 */
function normalizeImageUrl(imageUrlOrFilename: string): string {
  const trimmed = imageUrlOrFilename.trim();
  
  // If it's already a full URL (starts with http:// or https://), return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  // Otherwise, construct Supabase Storage URL
  // Format: https://[project-id].supabase.co/storage/v1/object/public/product-images/products/[filename]
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    // Fallback: return filename as-is and let Supabase helpers construct URL
    return trimmed;
  }
  
  // Construct full Supabase Storage URL
  return `${supabaseUrl}/storage/v1/object/public/product-images/products/${trimmed}`;
}

/**
 * Validates required fields in a CSV row
 */
function validateRow(row: any, rowIndex: number): { valid: boolean; error?: string } {
  // Check basic required fields (category is optional, defaults to "Art Prints")
  const basicRequired = ['name', 'stock', 'imageUrl'];
  
  for (const field of basicRequired) {
    if (!row[field] || String(row[field]).trim() === '') {
      return {
        valid: false,
        error: `Row ${rowIndex + 2}: Missing required field "${field}"`,
      };
    }
  }

  // Validate stock is numeric
  const stock = parseInt(String(row.stock));
  if (isNaN(stock) || stock < 0) {
    return {
      valid: false,
      error: `Row ${rowIndex + 2}: Invalid stock "${row.stock}" (must be a non-negative number)`,
    };
  }

  // Validate at least one size price is provided
  const sizePriceFields = [
    'price_8x10', 'price_11x14', 'price_12x18', 'price_16x20',
    'price_18x24', 'price_20x30', 'price_24x32', 'price_24x36'
  ];
  
  const hasSizePrice = sizePriceFields.some(field => {
    const value = row[field];
    return value && String(value).trim() !== '' && !isNaN(parseFloat(String(value)));
  });
  
  if (!hasSizePrice) {
    return {
      valid: false,
      error: `Row ${rowIndex + 2}: At least one size price must be provided (e.g., price_8x10, price_11x14, etc.)`,
    };
  }

  // Validate image URL
  if (!isValidImageUrl(row.imageUrl)) {
    return {
      valid: false,
      error: `Row ${rowIndex + 2}: Invalid imageUrl "${row.imageUrl}" (must end with .jpg, .jpeg, .png, or .webp)`,
    };
  }

  return { valid: true };
}

/**
 * Creates size variations from individual CSV price columns
 * @param row - CSV row with individual size prices/costs
 */
function createSizeVariationsFromRow(row: CSVRow): ProductSize[] {
  const sizeMapping = {
    '8" x 10"': { price: 'price_8x10', cost: 'cost_8x10' },
    '11" x 14"': { price: 'price_11x14', cost: 'cost_11x14' },
    '12" x 18"': { price: 'price_12x18', cost: 'cost_12x18' },
    '16" x 20"': { price: 'price_16x20', cost: 'cost_16x20' },
    '18" x 24"': { price: 'price_18x24', cost: 'cost_18x24' },
    '20" x 30"': { price: 'price_20x30', cost: 'cost_20x30' },
    '24" x 32"': { price: 'price_24x32', cost: 'cost_24x32' },
    '24" x 36"': { price: 'price_24x36', cost: 'cost_24x36' },
  };

  const variations: ProductSize[] = [];

  for (const [sizeLabel, fields] of Object.entries(sizeMapping)) {
    const priceValue = (row as any)[fields.price];
    const costValue = (row as any)[fields.cost];

    // Only add variation if price is provided
    if (priceValue && String(priceValue).trim() !== '') {
      const price = parseFloat(String(priceValue));
      const cost = costValue && String(costValue).trim() !== '' 
        ? parseFloat(String(costValue)) 
        : 0;

      if (!isNaN(price) && price > 0) {
        variations.push({
          label: sizeLabel,
          price: Math.round(price),
          cost: Math.round(cost),
        });
      }
    }
  }

  return variations;
}

/**
 * Parses a CSV row into a product with variations
 */
function parseProductFromRow(row: CSVRow): ParsedProduct {
  const stock = parseInt(String(row.stock));
  const sizes = createSizeVariationsFromRow(row);

  // Calculate average price and total cost from variations
  const avgPrice = sizes.length > 0 
    ? Math.round(sizes.reduce((sum, s) => sum + s.price, 0) / sizes.length)
    : 0;
  
  const avgCost = sizes.length > 0
    ? Math.round(sizes.reduce((sum, s) => sum + (s.cost ?? 0), 0) / sizes.length)
    : 0;

  return {
    name: String(row.name).trim(),
    category: row.category && String(row.category).trim() !== '' ? String(row.category).trim() : 'Art Prints',
    description: row.description ? String(row.description).trim() : '',
    price: avgPrice,
    cost: avgCost,
    image_url: normalizeImageUrl(String(row.imageUrl)),
    stock,
    sizes,
    video_url: row.videoUrl ? String(row.videoUrl).trim() : undefined,
  };
}

/**
 * Parses CSV text into products
 * @param csvText - Raw CSV text content
 * @param useMultipliers - Deprecated, kept for backwards compatibility
 */
export function parseCSV(
  csvText: string,
  useMultipliers: boolean = false
): CSVImportResult {
  const result: CSVImportResult = {
    success: false,
    imported: 0,
    skipped: 0,
    errors: [],
    products: [],
  };

  try {
    // Split into lines and filter empty lines
    const lines = csvText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      result.errors.push('CSV file is empty or contains no data rows');
      return result;
    }

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // Validate basic required headers
    const requiredHeaders = ['name', 'category', 'stock', 'imageUrl'];
    const missingHeaders = requiredHeaders.filter(
      required => !headers.some(h => h.toLowerCase() === required.toLowerCase())
    );

    if (missingHeaders.length > 0) {
      result.errors.push(
        `Missing required headers: ${missingHeaders.join(', ')}`
      );
      return result;
    }

    // Create header map (case-insensitive)
    const headerMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerMap[header.toLowerCase()] = index;
    });

    // All possible headers
    const allHeaders = [
      'name', 'category', 'stock', 'imageUrl', 'description', 'videoUrl',
      'price_8x10', 'cost_8x10', 'price_11x14', 'cost_11x14',
      'price_12x18', 'cost_12x18', 'price_16x20', 'cost_16x20',
      'price_18x24', 'cost_18x24', 'price_20x30', 'cost_20x30',
      'price_24x32', 'cost_24x32', 'price_24x36', 'cost_24x36',
    ];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Simple CSV parsing (handles quotes)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      // Create row object
      const row: any = {};
      allHeaders.forEach(field => {
        const index = headerMap[field.toLowerCase()];
        if (index !== undefined && values[index] !== undefined) {
          row[field] = values[index].replace(/^"|"$/g, '');
        }
      });

      // Validate row
      const validation = validateRow(row, i - 1);
      if (!validation.valid) {
        result.errors.push(validation.error!);
        result.skipped++;
        continue;
      }

      // Parse product
      try {
        const product = parseProductFromRow(row);
        result.products.push(product);
        result.imported++;
      } catch (error) {
        result.errors.push(
          `Row ${i + 1}: Failed to parse product - ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        result.skipped++;
      }
    }

    result.success = result.imported > 0;
    return result;
  } catch (error) {
    result.errors.push(
      `Fatal error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return result;
  }
}

/**
 * Validates CSV file before processing
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { valid: false, error: 'File must be a CSV (.csv extension)' };
  }

  if (file.size > CSV_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum (${CSV_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
}
