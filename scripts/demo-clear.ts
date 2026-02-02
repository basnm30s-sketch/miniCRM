import os from 'os'
import path from 'path'

function resolveUserDataDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(appData, 'iManage')
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'iManage')
  }
  return path.join(os.homedir(), '.config', 'iManage')
}

function ensureDbPath(): void {
  if (process.env.DB_PATH) return
  const userDataDir = resolveUserDataDir()
  process.env.DB_PATH = path.join(userDataDir, 'data', 'imanage.db')
}

async function clearDemoData(): Promise<void> {
  ensureDbPath()
  const { initDatabase, getDatabase } = await import('../lib/database')
  initDatabase()
  const db = getDatabase()
  if (!db) {
    throw new Error('Database is not available. Demo cleanup aborted.')
  }

  const prefix = 'demo_'
  const like = `${prefix}%`
  const run = (sql: string, params: any[] = []) => db.prepare(sql).run(...params)

  db.exec('BEGIN')
  try {
    run('DELETE FROM quote_items WHERE id LIKE ? OR quoteId LIKE ?', [like, like])
    run('DELETE FROM invoice_items WHERE id LIKE ? OR invoiceId LIKE ?', [like, like])
    run('DELETE FROM po_items WHERE id LIKE ? OR purchaseOrderId LIKE ?', [like, like])
    run(
      `DELETE FROM vehicle_transactions 
       WHERE id LIKE ? 
          OR vehicleId LIKE ? 
          OR employeeId LIKE ? 
          OR invoiceId LIKE ? 
          OR purchaseOrderId LIKE ? 
          OR quoteId LIKE ?`,
      [like, like, like, like, like, like]
    )
    run('DELETE FROM payslips WHERE id LIKE ? OR employeeId LIKE ?', [like, like])

    run('DELETE FROM invoices WHERE id LIKE ?', [like])
    run('DELETE FROM quotes WHERE id LIKE ?', [like])
    run('DELETE FROM purchase_orders WHERE id LIKE ?', [like])

    run('DELETE FROM customers WHERE id LIKE ?', [like])
    run('DELETE FROM vendors WHERE id LIKE ?', [like])
    run('DELETE FROM employees WHERE id LIKE ?', [like])
    run('DELETE FROM vehicles WHERE id LIKE ?', [like])
    run('DELETE FROM expense_categories WHERE id LIKE ?', [like])

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

clearDemoData()
  .then(() => {
    console.log('Demo data cleared successfully.')
  })
  .catch((error) => {
    console.error('Demo data clear failed:', error)
    process.exit(1)
  })
