export interface AccountSeed {
  code: string
  name: string
  parentCode?: string
  categoryType: 'asset' | 'liability' | 'equity' | 'cost' | 'revenue_expense'
  balanceDirection: 'debit' | 'credit'
  level: number
  sort: number
}

export const accountsSeedData: AccountSeed[] = [
  // ============ 资产类 ============
  { code: '1001', name: '库存现金', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 1 },
  { code: '1002', name: '银行存款', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 2 },
  { code: '1002.01', name: '基本户', parentCode: '1002', categoryType: 'asset', balanceDirection: 'debit', level: 2, sort: 1 },
  { code: '1002.02', name: '一般户', parentCode: '1002', categoryType: 'asset', balanceDirection: 'debit', level: 2, sort: 2 },
  { code: '1012', name: '其他货币资金', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 3 },
  { code: '1121', name: '应收票据', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 4 },
  { code: '1122', name: '应收账款', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 5 },
  { code: '1123', name: '预付账款', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 6 },
  { code: '1221', name: '其他应收款', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 7 },
  { code: '1221.01', name: '员工借款', parentCode: '1221', categoryType: 'asset', balanceDirection: 'debit', level: 2, sort: 1 },
  { code: '1221.02', name: '保证金', parentCode: '1221', categoryType: 'asset', balanceDirection: 'debit', level: 2, sort: 2 },
  { code: '1231', name: '坏账准备', categoryType: 'asset', balanceDirection: 'credit', level: 1, sort: 8 },
  { code: '1401', name: '原材料', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 9 },
  { code: '1405', name: '库存商品', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 10 },
  { code: '1411', name: '周转材料', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 11 },
  { code: '1471', name: '存货跌价准备', categoryType: 'asset', balanceDirection: 'credit', level: 1, sort: 12 },
  { code: '1501', name: '持有至到期投资', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 13 },
  { code: '1511', name: '长期股权投资', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 14 },
  { code: '1601', name: '固定资产', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 15 },
  { code: '1601.01', name: '电子设备', parentCode: '1601', categoryType: 'asset', balanceDirection: 'debit', level: 2, sort: 1 },
  { code: '1601.02', name: '办公设备', parentCode: '1601', categoryType: 'asset', balanceDirection: 'debit', level: 2, sort: 2 },
  { code: '1601.03', name: '运输设备', parentCode: '1601', categoryType: 'asset', balanceDirection: 'debit', level: 2, sort: 3 },
  { code: '1601.04', name: '房屋建筑', parentCode: '1601', categoryType: 'asset', balanceDirection: 'debit', level: 2, sort: 4 },
  { code: '1602', name: '累计折旧', categoryType: 'asset', balanceDirection: 'credit', level: 1, sort: 16 },
  { code: '1606', name: '固定资产清理', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 17 },
  { code: '1701', name: '无形资产', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 18 },
  { code: '1702', name: '累计摊销', categoryType: 'asset', balanceDirection: 'credit', level: 1, sort: 19 },
  { code: '1801', name: '长期待摊费用', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 20 },
  { code: '1901', name: '待处理财产损溢', categoryType: 'asset', balanceDirection: 'debit', level: 1, sort: 21 },

  // ============ 负债类 ============
  { code: '2001', name: '短期借款', categoryType: 'liability', balanceDirection: 'credit', level: 1, sort: 1 },
  { code: '2201', name: '应付票据', categoryType: 'liability', balanceDirection: 'credit', level: 1, sort: 2 },
  { code: '2202', name: '应付账款', categoryType: 'liability', balanceDirection: 'credit', level: 1, sort: 3 },
  { code: '2203', name: '预收账款', categoryType: 'liability', balanceDirection: 'credit', level: 1, sort: 4 },
  { code: '2211', name: '应付职工薪酬', categoryType: 'liability', balanceDirection: 'credit', level: 1, sort: 5 },
  { code: '2211.01', name: '工资', parentCode: '2211', categoryType: 'liability', balanceDirection: 'credit', level: 2, sort: 1 },
  { code: '2211.02', name: '社保', parentCode: '2211', categoryType: 'liability', balanceDirection: 'credit', level: 2, sort: 2 },
  { code: '2211.03', name: '公积金', parentCode: '2211', categoryType: 'liability', balanceDirection: 'credit', level: 2, sort: 3 },
  { code: '2221', name: '应交税费', categoryType: 'liability', balanceDirection: 'credit', level: 1, sort: 6 },
  { code: '2221.01', name: '增值税', parentCode: '2221', categoryType: 'liability', balanceDirection: 'credit', level: 2, sort: 1 },
  { code: '2221.02', name: '企业所得税', parentCode: '2221', categoryType: 'liability', balanceDirection: 'credit', level: 2, sort: 2 },
  { code: '2221.03', name: '个人所得税', parentCode: '2221', categoryType: 'liability', balanceDirection: 'credit', level: 2, sort: 3 },
  { code: '2221.04', name: '附加税', parentCode: '2221', categoryType: 'liability', balanceDirection: 'credit', level: 2, sort: 4 },
  { code: '2231', name: '应付利息', categoryType: 'liability', balanceDirection: 'credit', level: 1, sort: 7 },
  { code: '2241', name: '其他应付款', categoryType: 'liability', balanceDirection: 'credit', level: 1, sort: 8 },
  { code: '2501', name: '长期借款', categoryType: 'liability', balanceDirection: 'credit', level: 1, sort: 9 },

  // ============ 权益类 ============
  { code: '3001', name: '实收资本', categoryType: 'equity', balanceDirection: 'credit', level: 1, sort: 1 },
  { code: '3002', name: '资本公积', categoryType: 'equity', balanceDirection: 'credit', level: 1, sort: 2 },
  { code: '3101', name: '盈余公积', categoryType: 'equity', balanceDirection: 'credit', level: 1, sort: 3 },
  { code: '3103', name: '本年利润', categoryType: 'equity', balanceDirection: 'credit', level: 1, sort: 4 },
  { code: '3104', name: '利润分配', categoryType: 'equity', balanceDirection: 'credit', level: 1, sort: 5 },
  { code: '3104.01', name: '未分配利润', parentCode: '3104', categoryType: 'equity', balanceDirection: 'credit', level: 2, sort: 1 },
  { code: '3104.02', name: '提取盈余公积', parentCode: '3104', categoryType: 'equity', balanceDirection: 'credit', level: 2, sort: 2 },

  // ============ 成本类 ============
  { code: '4001', name: '生产成本', categoryType: 'cost', balanceDirection: 'debit', level: 1, sort: 1 },
  { code: '4101', name: '制造费用', categoryType: 'cost', balanceDirection: 'debit', level: 1, sort: 2 },
  { code: '4301', name: '研发支出', categoryType: 'cost', balanceDirection: 'debit', level: 1, sort: 3 },
  { code: '4401', name: '工程施工', categoryType: 'cost', balanceDirection: 'debit', level: 1, sort: 4 },

  // ============ 损益类 - 收入 ============
  { code: '5001', name: '主营业务收入', categoryType: 'revenue_expense', balanceDirection: 'credit', level: 1, sort: 1 },
  { code: '5001.01', name: '产品销售', parentCode: '5001', categoryType: 'revenue_expense', balanceDirection: 'credit', level: 2, sort: 1 },
  { code: '5001.02', name: '服务收入', parentCode: '5001', categoryType: 'revenue_expense', balanceDirection: 'credit', level: 2, sort: 2 },
  { code: '5001.03', name: '项目收入', parentCode: '5001', categoryType: 'revenue_expense', balanceDirection: 'credit', level: 2, sort: 3 },
  { code: '5051', name: '其他业务收入', categoryType: 'revenue_expense', balanceDirection: 'credit', level: 1, sort: 2 },
  { code: '5111', name: '投资收益', categoryType: 'revenue_expense', balanceDirection: 'credit', level: 1, sort: 3 },
  { code: '5301', name: '营业外收入', categoryType: 'revenue_expense', balanceDirection: 'credit', level: 1, sort: 4 },
  { code: '5301.01', name: '政府补贴', parentCode: '5301', categoryType: 'revenue_expense', balanceDirection: 'credit', level: 2, sort: 1 },
  { code: '5301.02', name: '资产处置', parentCode: '5301', categoryType: 'revenue_expense', balanceDirection: 'credit', level: 2, sort: 2 },

  // ============ 损益类 - 费用 ============
  { code: '5401', name: '主营业务成本', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 1, sort: 5 },
  { code: '5402', name: '其他业务成本', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 1, sort: 6 },
  { code: '5403', name: '税金及附加', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 1, sort: 7 },
  { code: '5501', name: '销售费用', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 1, sort: 8 },
  { code: '5501.01', name: '提成', parentCode: '5501', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 1 },
  { code: '5501.02', name: '广告推广', parentCode: '5501', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 2 },
  { code: '5501.03', name: '差旅费', parentCode: '5501', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 3 },
  { code: '5501.04', name: '招待费', parentCode: '5501', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 4 },
  { code: '5601', name: '管理费用', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 1, sort: 9 },
  { code: '5601.01', name: '办公费', parentCode: '5601', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 1 },
  { code: '5601.02', name: '工资薪酬', parentCode: '5601', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 2 },
  { code: '5601.03', name: '折旧费', parentCode: '5601', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 3 },
  { code: '5601.04', name: '租金物业', parentCode: '5601', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 4 },
  { code: '5601.05', name: '交通差旅', parentCode: '5601', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 5 },
  { code: '5601.06', name: '招待费', parentCode: '5601', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 6 },
  { code: '5601.07', name: '保险费', parentCode: '5601', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 7 },
  { code: '5601.08', name: '培训费', parentCode: '5601', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 8 },
  { code: '5601.09', name: '招聘费', parentCode: '5601', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 9 },
  { code: '5601.10', name: '咨询服务费', parentCode: '5601', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 10 },
  { code: '5602', name: '财务费用', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 1, sort: 10 },
  { code: '5602.01', name: '利息费用', parentCode: '5602', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 1 },
  { code: '5602.02', name: '银行手续费', parentCode: '5602', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 2, sort: 2 },
  { code: '5711', name: '营业外支出', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 1, sort: 11 },
  { code: '5801', name: '所得税费用', categoryType: 'revenue_expense', balanceDirection: 'debit', level: 1, sort: 12 },
]
