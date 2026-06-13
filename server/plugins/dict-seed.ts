import { db } from '#database'
import { dictEntries } from '#schema'
import { productCategories } from '#schema/products'
import { tags } from '#schema/customers'
import { financeCategories } from '#schema/finance'
import { generateId } from '#server-utils/id'
import { eq } from 'drizzle-orm'

const seedDictData: { dict_type: string; value: string; label: string; sort: string }[] = [
  ...['信息技术','软件开发','人工智能','网络安全','电子商务','制造业','金融','教育','医疗','房地产','物流','其他'].map((v, i) => ({
    dict_type: 'industry', value: v, label: v, sort: String(i),
  })),
  ...['主动联系','客户介绍','展会','网络推广','电话营销','其他'].map((v, i) => ({
    dict_type: 'opportunity_source', value: v, label: v, sort: String(i),
  })),
]

export default defineNitroPlugin(async () => {
  // 改为逐类型检查是否已同步
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 1. 行业 / 商机来源
  const existing = await db.select().from(dictEntries).limit(2)
  if (existing.length === 0) {
    for (const item of seedDictData) {
      await db.insert(dictEntries).values({
        id: generateId(),
        dict_type: item.dict_type,
        value: item.value,
        label: item.label,
        sort: item.sort,
        is_active: '1',
        createdAt: now,
        updatedAt: now,
      })
    }
    console.log(`[dict-seed] 行业/来源初始化 (${seedDictData.length} 条)`)
  }

  // 同步已有表的分类数据到 dict
  const syncCategory = async (dictType: string, rows: { name: string; sort?: string }[], mapValue?: (r: any) => string) => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      await db.insert(dictEntries).values({
        id: generateId(),
        dict_type: dictType,
        value: mapValue ? mapValue(r) : r.name,
        label: r.name,
        sort: r.sort || String(i),
        is_active: '1',
        createdAt: now,
        updatedAt: now,
      }).catch(() => { /* ignore dup */ })
    }
  }

  // 2. 产品分类
  const productCatRows = await db.select().from(productCategories)
  const existingProductCat = await db.select().from(dictEntries).where(eq(dictEntries.dict_type, 'product_category')).limit(1)
  if (existingProductCat.length === 0 && productCatRows.length > 0) {
    await syncCategory('product_category', productCatRows as any)
    console.log(`[dict-seed] 产品分类同步 (${productCatRows.length} 条)`)
  }

  // 3. 客户标签
  const tagRows = await db.select().from(tags)
  const existingTags = await db.select().from(dictEntries).where(eq(dictEntries.dict_type, 'customer_tag')).limit(1)
  if (existingTags.length === 0 && tagRows.length > 0) {
    await syncCategory('customer_tag', tagRows as any)
    console.log(`[dict-seed] 客户标签同步 (${tagRows.length} 条)`)
  }

  // 4. 财务分类
  const financeCatRows = await db.select().from(financeCategories)
  const existingFinance = await db.select().from(dictEntries).where(eq(dictEntries.dict_type, 'finance_income_category')).limit(1)
  if (existingFinance.length === 0 && financeCatRows.length > 0) {
    for (let i = 0; i < financeCatRows.length; i++) {
      const fc = financeCatRows[i]
      await db.insert(dictEntries).values({
        id: generateId(),
        dict_type: fc.type === 'income' ? 'finance_income_category' : 'finance_expense_category',
        value: fc.name,
        label: fc.name,
        sort: fc.sort || String(i),
        is_active: '1',
        createdAt: now,
        updatedAt: now,
      }).catch(() => {})
    }
    console.log(`[dict-seed] 财务分类同步 (${financeCatRows.length} 条)`)
  }

  // 5. 报销类型
  const existingReimb = await db.select().from(dictEntries).where(eq(dictEntries.dict_type, 'reimbursement_type')).limit(1)
  if (existingReimb.length === 0) {
    const reimbSeeds = ['办公用品', '差旅费', '招待费', '其他']
    for (let i = 0; i < reimbSeeds.length; i++) {
      await db.insert(dictEntries).values({
        id: generateId(),
        dict_type: 'reimbursement_type',
        value: reimbSeeds[i],
        label: reimbSeeds[i],
        sort: String(i),
        is_active: '1',
        createdAt: now,
        updatedAt: now,
      }).catch(() => {})
    }
    console.log(`[dict-seed] 报销类型初始化 (${reimbSeeds.length} 条)`)
  }
})
