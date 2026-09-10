/**
 * Print Size Configuration for House of Lustre Collection
 * 
 * STANDARD_PRINT_SIZES: Default size variations for all print products
 * SIZE_MULTIPLIERS: Price multipliers for each size (Option B pricing)
 */

export const STANDARD_PRINT_SIZES = [
  '8" x 10"',
  '11" x 14"',
  '12" x 18"',
  '16" x 20"',
  '18" x 24"',
  '20" x 30"',
  '24" x 32"',
  '24" x 36"',
] as const;

/**
 * Price multipliers for print sizes
 * Base size (8" x 10") = 1.0x
 * Larger sizes have progressively higher multipliers
 */
export const SIZE_MULTIPLIERS: Record<string, number> = {
  '8" x 10"': 1.0,
  '11" x 14"': 1.3,
  '12" x 18"': 1.5,
  '16" x 20"': 1.8,
  '18" x 24"': 2.1,
  '20" x 30"': 2.5,
  '24" x 32"': 2.8,
  '24" x 36"': 3.2,
};

/**
 * CSV Import Configuration
 */
export const CSV_CONFIG = {
  REQUIRED_HEADERS: ['name', 'category', 'price', 'stock', 'imageUrl'],
  OPTIONAL_HEADERS: ['description', 'salePrice', 'cost', 'videoUrl'],
  VALID_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;
