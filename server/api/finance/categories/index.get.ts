import { defineEventHandler } from 'h3'
import { db } from '#database'
import { financeCategories } from '#schema'

export default defineEventHandler(async () => {
  const rows = await db.select().from(financeCategories).orderBy(financeCategories.sort)
  const income = rows.filter(r => r.type === 'income')
  const expense = rows.filter(r => r.type === 'expense')

  // Seed defaults if empty
  if (rows.length === 0) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const { generateId } = await import('#server-utils/id')
    const defaults = [
      { name: '合同收款', type: 'income', sort: 0 },
      { name: '其他收入', type: 'income', sort: 1 },
      { name: '服务费', type: 'income', sort: 2 },
      { name: '利息', type: 'income', sort: 3 },
      { name: '提成发放', type: 'expense', sort: 0 },
      { name: '报销', type: 'expense', sort: 1 },
      { name: '办公费', type: 'expense', sort: 2 },
      { name: '差旅费', type: 'expense', sort: 3 },
      { name: '房租', type: 'expense', sort: 4 },
      { name: '工资', type: 'expense', sort: 5 },
      { name: '其他', type: 'expense', sort: 6 },
    ]
    await db.insert(financeCategories).values(
      defaults.map(d => ({ id: generateId(), ...d, createdAt: now }))
    )
    return {
      code: 0,
      data: { income: defaults.filter(d => d.type === 'income'), expense: defaults.filter(d => d.type === 'expense') }
    }
  }

  return { code: 0, data: { income, expense } }
})
