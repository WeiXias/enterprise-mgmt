import { db } from '#database'
import { dictEntries } from '#schema'
import { generateId } from '#server-utils/id'

const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

const seeds: { dict_type: string; value: string; label: string; sort: string }[] = [
  // 行业分类
  ...['信息技术','软件开发','人工智能','网络安全','电子商务','制造业','金融','教育','医疗','房地产','物流','其他'].map((v, i) => ({
    dict_type: 'industry', value: v, label: v, sort: String(i),
  })),
  // 商机来源
  ...['主动联系','客户介绍','展会','网络推广','电话营销','其他'].map((v, i) => ({
    dict_type: 'opportunity_source', value: v, label: v, sort: String(i),
  })),
]

export async function seedDict() {
  const existing = await db.select().from(dictEntries).limit(1)
  if (existing.length > 0) return // 已有数据，跳过
  for (const item of seeds) {
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
  console.log(`[seed] 字典种子数据已写入 ${seeds.length} 条`)
}
