#!/usr/bin/env node
/**
 * Manual ONLY: destructive-to-the-empty-target baseline bootstrap and real Neon
 * CRUD smoke test. NEVER run against an existing, shared or production database.
 * CI deliberately does not supply TEST_DATABASE_URL or acknowledge this action.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { neon } from '@neondatabase/serverless'

async function main() {
  if (process.env.TSU_DISPOSABLE_DB_ACK !== 'CREATE_ON_EMPTY_TEST_DATABASE' ||
      process.env.VERCEL_ENV === 'production' ||
      !process.env.TEST_DATABASE_URL ||
      process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
    throw new Error('Disposable database test requires an explicitly acknowledged separate TEST_DATABASE_URL outside production')
  }
  const sql = neon(process.env.TEST_DATABASE_URL)
  const existing = await sql.query(`
    SELECT to_regclass('public.products') AS products,
      to_regclass('public.orders') AS orders,
      to_regclass('public.schema_migrations') AS ledger,
      to_regclass('public.shipping_rates') AS shipping_rates,
      to_regclass('public.favorites') AS favorites,
      to_regclass('public.waitlist') AS waitlist
  `)
  assert.ok(existing.length === 1)
  if (Object.values(existing[0]).some(Boolean)) {
    throw new Error('Refusing real DB smoke test: target is not empty. Create a NEW isolated Neon test branch/database')
  }
  const child = spawnSync(process.execPath, ['scripts/migrate.mjs', '--init-empty', '--confirm-reviewed-backup'], {
    cwd: process.cwd(), encoding:'utf8', timeout:60_000,
    env:{...process.env, DATABASE_URL:process.env.TEST_DATABASE_URL, VERCEL_ENV:'development'},
  })
  if (child.status !== 0) {
    // The migration CLI already sanitizes its failures; do not print provider errors or connection details.
    throw new Error('Disposable schema bootstrap failed; consult private Neon logs and the migration runbook')
  }
  const ledger = await sql.query('SELECT version FROM public.schema_migrations ORDER BY version')
  assert.deepEqual(ledger.map(row => row.version), ['002_neon_r2_schema'])
  // Additive payment-delivery foundation is operator-run, never applied by
  // a Next.js build. This optional test is restricted to an EMPTY disposable
  // Neon branch/database and reuses the existing explicit acknowledgement.
  const forward = spawnSync(process.execPath, ['scripts/migrate.mjs', '--apply', '--confirm-reviewed-backup'], {
    cwd: process.cwd(), encoding:'utf8', timeout:60_000,
    env:{...process.env, DATABASE_URL:process.env.TEST_DATABASE_URL, VERCEL_ENV:'development'},
  })
  if (forward.status !== 0) throw new Error('Disposable forward migration failed; inspect private Neon logs')
  const updatedLedger = await sql.query('SELECT version FROM public.schema_migrations ORDER BY version')
  assert.ok(updatedLedger.some(row => row.version === '003_payment_delivery_foundation'))

  const marker = crypto.randomUUID()
  const product = await sql.query(`
    INSERT INTO products (name, category, price, stock, sizes, image_url)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    RETURNING id, name, price, stock, sizes
  `, ['Task 7 isolated product '+marker, 'Art Prints', 12.50, 3,
    JSON.stringify([{label:'8" x 10"',price:12.50}]), ''])
  assert.equal(product.length, 1)
  const id = product[0].id
  try {
    const selected = await sql.query('SELECT id, stock, sizes FROM products WHERE id::text = $1', [id])
    assert.equal(selected.length, 1)
    assert.equal(selected[0].stock, 3)
    assert.equal(selected[0].sizes[0].price, 12.5)

    const changed = await sql.query('UPDATE products SET stock = $1 WHERE id::text = $2 RETURNING stock', [1,id])
    assert.equal(changed[0].stock, 1)

    await assert.rejects(
      sql.query('UPDATE products SET stock = $1 WHERE id::text = $2', [-1,id]),
      () => true, 'Database must reject negative product stock'
    )
    const unchanged = await sql.query('SELECT stock FROM products WHERE id::text = $1', [id])
    assert.equal(unchanged[0].stock, 1)

    const orderId = 'tsu-disposable-'+marker
    const first = await sql.query(`
      INSERT INTO orders (order_id,email,items,subtotal,total,shipping_address)
      VALUES ($1,$2,$3::jsonb,$4,$5,$6::jsonb) RETURNING id
    `, [orderId,'isolated@example.invalid',JSON.stringify([{productId:id,quantity:1}]),12.50,12.50,'{}'])
    assert.equal(first.length, 1)
    try {
      await assert.rejects(
        sql.query('INSERT INTO orders (order_id,email) VALUES ($1,$2)', [orderId,'isolated@example.invalid']),
        () => true, 'Database must reject duplicate order IDs'
      )
      const count = await sql.query('SELECT count(*)::int AS total FROM orders WHERE order_id=$1',[orderId])
      assert.equal(count[0].total,1)

      const eventId = 'evt_disposable_'+marker
      await sql.query(`INSERT INTO stripe_payment_events (event_id, event_type, checkout_session_id)
        VALUES ($1, $2, $3)`,[eventId,'checkout.session.completed','cs_disposable_'+marker])
      try {
        const repeated = await sql.query(`INSERT INTO stripe_payment_events (event_id, event_type)
          VALUES ($1,$2) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,[eventId,'checkout.session.completed'])
        assert.equal(repeated.length,0,'Duplicate payment event must not be claimed twice')

        const claims = await Promise.all([
          sql.query(`UPDATE stripe_payment_events SET status='processing', attempts=attempts+1,
            claim_expires_at=NOW()+INTERVAL '1 minute'
            WHERE event_id=$1 AND status='pending' RETURNING event_id`,[eventId]),
          sql.query(`UPDATE stripe_payment_events SET status='processing', attempts=attempts+1,
            claim_expires_at=NOW()+INTERVAL '1 minute'
            WHERE event_id=$1 AND status='pending' RETURNING event_id`,[eventId]),
        ])
        assert.equal(claims.reduce((n,rows)=>n+rows.length,0),1,'Concurrent event claims must have one winner')

        await sql.query(`INSERT INTO order_email_deliveries (order_id, recipient_kind)
          VALUES ($1,'customer'),($1,'owner')`,[orderId])
        const emailAgain = await sql.query(`INSERT INTO order_email_deliveries (order_id, recipient_kind)
          VALUES ($1,'customer') ON CONFLICT (order_id, recipient_kind) DO NOTHING
          RETURNING recipient_kind`,[orderId])
        assert.equal(emailAgain.length,0,'One durable email record per order/recipient kind')
        const emailClaims = await Promise.all([
          sql.query(`UPDATE order_email_deliveries SET status='sending', attempts=attempts+1,
            claim_expires_at=NOW()+INTERVAL '1 minute'
            WHERE order_id=$1 AND recipient_kind='customer' AND status='pending'
            RETURNING recipient_kind`,[orderId]),
          sql.query(`UPDATE order_email_deliveries SET status='sending', attempts=attempts+1,
            claim_expires_at=NOW()+INTERVAL '1 minute'
            WHERE order_id=$1 AND recipient_kind='customer' AND status='pending'
            RETURNING recipient_kind`,[orderId]),
        ])
        assert.equal(emailClaims.reduce((n,rows)=>n+rows.length,0),1,'Concurrent email claims must have one winner')
      } finally {
        await sql.query('DELETE FROM order_email_deliveries WHERE order_id=$1',[orderId])
        await sql.query('DELETE FROM stripe_payment_events WHERE event_id=$1',[eventId])
      }
    } finally {
      await sql.query('DELETE FROM orders WHERE order_id=$1',[orderId])
    }
  } finally {
    const deleted = await sql.query('DELETE FROM products WHERE id::text = $1 RETURNING id',[id])
    assert.equal(deleted.length, 1)
  }
  console.log('Disposable Neon test passed: baseline/forward ledger, product CRUD, stock/order uniqueness, payment-event and email claim uniqueness.')
  console.log('The TEST database/branch is disposable. Do not treat this as production verification.')
}
main().catch(() => {
  // Credentials, provider errors and row payloads never go to CI/stdout.
  console.error('Disposable Neon verification refused or failed. Verify test-only settings and consult private Neon logs.')
  process.exitCode = 1
})
