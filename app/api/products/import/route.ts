import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/csv-parser';
import { createProduct } from '@/lib/supabase-helpers';

/**
 * POST /api/products/import
 * Bulk import products from CSV file
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const useMultipliers = formData.get('useMultipliers') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV (.csv extension)' },
        { status: 400 }
      );
    }

    // Read file content
    const csvText = await file.text();

    // Parse CSV
    const result = parseCSV(csvText, useMultipliers);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'CSV parsing failed',
          details: result.errors,
          imported: 0,
          skipped: result.skipped,
        },
        { status: 400 }
      );
    }

    // Import products to database
    const importedProducts: string[] = [];
    const failedProducts: string[] = [];

    for (const product of result.products) {
      try {
        const newProduct = await createProduct({
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          category: product.category,
          image_url: product.image_url,
          stock: product.stock,
          sizes: product.sizes,
        });

        if (newProduct) {
          importedProducts.push(product.name);
        } else {
          failedProducts.push(`${product.name} (database error)`);
        }
      } catch (error) {
        console.error(`Failed to import product ${product.name}:`, error);
        failedProducts.push(
          `${product.name} (${error instanceof Error ? error.message : 'unknown error'})`
        );
      }
    }

    // Return summary
    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${importedProducts.length} items`,
        imported: importedProducts.length,
        failed: failedProducts.length,
        skipped: result.skipped,
        errors: result.errors,
        failedProducts: failedProducts.length > 0 ? failedProducts : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process CSV import',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/products/import
 * Returns CSV template information
 */
export async function GET() {
  return NextResponse.json({
    template: {
      requiredHeaders: ['name', 'category', 'price', 'stock', 'imageUrl'],
      optionalHeaders: ['description', 'salePrice', 'cost', 'videoUrl'],
      sizeVariations: [
        '8" x 10"',
        '11" x 14"',
        '12" x 18"',
        '16" x 20"',
        '18" x 24"',
        '20" x 30"',
        '24" x 32"',
        '24" x 36"',
      ],
      example: {
        name: 'Mountain Landscape Print',
        category: 'Art Prints',
        price: 189,
        stock: 50,
        imageUrl: 'https://example.com/image.jpg',
        description: 'Beautiful mountain landscape',
        cost: 85,
      },
    },
  });
}
