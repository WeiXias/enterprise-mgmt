import { defineEventHandler, getRouterParams, createError } from 'h3'
import Database from 'better-sqlite3'

function openDb() {
  return new Database(process.env.DB_PATH || './data/enterprise.db')
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const db = openDb()
  db.pragma('foreign_keys = ON')

  const row = db.prepare('SELECT * FROM suppliers WHERE id = ? AND deleted_at IS NULL').get(id) as any
  if (!row) {
    db.close()
    throw createError({ statusCode: 404, statusMessage: '供应商不存在' })
  }

  // 关联合同
  const contractList = db.prepare(
    'SELECT id, code, name, status, total_amount, created_at FROM contracts WHERE supplier_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10'
  ).all(id) as any[]

  // 关联采购订单
  const orderList = db.prepare(
    'SELECT id, name, status, total_amount, created_at FROM purchase_orders WHERE supplier_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10'
  ).all(id) as any[]

  db.close()

  return {
    code: 0,
    data: {
      id: row.id,
      name: row.name,
      code: row.code,
      contactPerson: row.contact_person || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      bankName: row.bank_name || '',
      bankAccount: row.bank_account || '',
      taxId: row.tax_id || '',
      status: row.status,
      remark: row.remark || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
      contracts: contractList.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        status: c.status,
        totalAmount: c.total_amount,
        createdAt: c.created_at,
      })),
      purchaseOrders: orderList.map((o: any) => ({
        id: o.id,
        name: o.name,
        status: o.status,
        totalAmount: o.total_amount,
        createdAt: o.created_at,
      })),
    },
  }
})
