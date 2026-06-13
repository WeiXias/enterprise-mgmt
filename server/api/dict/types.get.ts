import { defineEventHandler } from 'h3'

// 字典类型注册表：dict_type → { label, category }
const DICT_TYPES: Record<string, { label: string; category: string }> = {
  industry: { label: '客户行业', category: '业务字典' },
  opportunity_source: { label: '商机来源', category: '业务字典' },
  product_category: { label: '产品分类', category: '业务字典' },
  customer_tag: { label: '客户标签', category: '业务字典' },
  reimbursement_type: { label: '报销类型', category: '业务字典' },
}

export default defineEventHandler(() => {
  const types = Object.entries(DICT_TYPES).map(([key, val]) => ({
    key,
    label: val.label,
    category: val.category,
  }))

  return { code: 0, data: types }
})
