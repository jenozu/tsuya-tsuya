import { isSameOriginMutation } from '@/lib/same-origin'
import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/csv-parser';
import { CSV_CONFIG } from '@/lib/print-sizes';
import { createProductSchema } from '@/lib/product-validation';
import { createProduct, getProductByName, updateProduct } from '@/lib/data'
import { hasAdminSession } from '@/lib/admin-session'
import { revalidatePath } from 'next/cache'
import { reportServerError } from '@/lib/safe-server-log'

/**
 * POST /api/products/import
 * Bulk import products from CSV file
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: 'Forbidden request origin' }, { status: 403 })
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const useMultipliers = formData.get('useMultipliers') === 'true';

    if (!(file instanceof File)) {
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

    if (file.size === 0 || file.size > CSV_CONFIG.MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'CSV must be between 1 byte and 5 MB' }, { status: 413 },
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
    const updatedProducts: string[] = [];
    const failedProducts: string[] = [];
    const updatedIds: string[] = [];

    for (const product of result.products) {
      try {
        const checked = createProductSchema.safeParse({
          name: product.name,
          category: product.category,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          sizes: product.sizes,
          description: product.description,
          image_url: product.image_url,
          product_type: product.product_type,
        });
        if (!checked.success) {
          failedProducts.push(`${product.name} (invalid product fields)`);
          continue;
        }

        const existing = await getProductByName(product.name);
        const incomingUsesPlaceholder = product.image_url === '/product-placeholder.svg';

        if (existing) {
          const updatedProduct = await updateProduct(existing.id, {
            name: product.name,
            description: product.description,
            price: product.price,
            cost: product.cost,
            category: product.category,
            image_url: incomingUsesPlaceholder ? existing.image_url : product.image_url,
            stock: product.stock,
            sizes: product.sizes,
            product_type: product.product_type,
          });

          if (updatedProduct) {
            updatedIds.push(existing.id);
            updatedProducts.push(product.name);
          } else {
            failedProducts.push(`${product.name} (database update error)`);
          }
          continue;
        }

        const newProduct = await createProduct({
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          category: product.category,
          image_url: product.image_url,
          stock: product.stock,
          sizes: product.sizes,
          product_type: product.product_type,
        });

        if (newProduct) {
          importedProducts.push(product.name);
        } else {
          failedProducts.push(`${product.name} (database error)`);
        }
      } catch (error) {
        reportServerError('api.product_import.item_failure');
        failedProducts.push(
          `${product.name} (database operation failed)`
        );
      }
    }

    // Return summary
    revalidatePath('/')
    revalidatePath('/shop')
    for (const id of updatedIds) revalidatePath(`/shop/${id}`)
    return NextResponse.json(
      {
        success: true,
        message: `Created ${importedProducts.length} and updated ${updatedProducts.length} items`,
        imported: importedProducts.length,
        updated: updatedProducts.length,
        failed: failedProducts.length,
        skipped: result.skipped,
        errors: result.errors,
        failedProducts: failedProducts.length > 0 ? failedProducts : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    reportServerError('api.product_import.request_failure');
    return NextResponse.json(
      {
        error: 'Failed to process CSV import',
        details: 'Check CSV format and storage configuration.',
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
      requiredHeaders: ['name', 'category', 'stock'],
      requiredProductType: 'Each row must identify 1-piece, 2-piece, or 3-piece using productType (legacy set_pieces is also accepted).',
      requiredPricing: 'At least one price_8x10 ... price_24x36 column must contain a positive price',
      optionalHeaders: ['imageUrl', 'description', 'videoUrl', 'cost_8x10 ... cost_24x36'],
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
        category: 'Naruto',
        productType: '1-piece',
        price: 189,
        stock: 50,
        imageUrl: '',
        description: 'Beautiful mountain landscape',
        cost: 85,
      },
    },
  });
}
