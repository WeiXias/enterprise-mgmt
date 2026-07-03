import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { accounts, accountBalances } from '#schema'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const query = getQuery(event)
  const periodId = query.periodId as string

  // 资产负债表：资产 = 负债 + 权益
  // 从 account_balances 取期末余额
  const whereBalance = periodId ? [eq(accountBalances.periodId, periodId)] : []

  const balances = periodId ? await db.select({
    accountId: accountBalances.accountId,
    accountCode: accounts.code,
    accountName: accounts.name,
    categoryType: accounts.categoryType,
    balanceDirection: accounts.balanceDirection,
    closingDebit: accountBalances.closingDebit,
    closingCredit: accountBalances.closingCredit,
  }).from(accountBalances)
    .leftJoin(accounts, eq(accountBalances.accountId, accounts.id))
    .where(eq(accountBalances.periodId, periodId))
    .orderBy(accounts.code) : []

  const formatAssetItem = (code: string, name: string, b: any) => {
    // 借方余额科目：期末余额 = 期末借方 - 期末贷方
    // 贷方余额科目（如累计折旧、坏账准备、存货跌价准备）：期末余额 = 期末贷方 - 期末借方
    const found = b.find((r: any) => r.accountCode === code)
    if (!found) return { code, name, amount: 0 }
    if (found.balanceDirection === 'credit') {
      return { code, name, amount: Number(found.closingCredit) - Number(found.closingDebit) }
    }
    return { code, name, amount: Number(found.closingDebit) - Number(found.closingCredit) }
  }

  const formatLiabilityOrEquityItem = (code: string, name: string, b: any) => {
    const found = b.find((r: any) => r.accountCode === code)
    if (!found) return { code, name, amount: 0 }
    // 负债/权益：期末余额 = 贷方 - 借方
    return { code, name, amount: Number(found.closingCredit) - Number(found.closingDebit) }
  }

  // 流动资产
  const currentAssets = [
    formatAssetItem('1001', '货币资金-库存现金', balances),
    formatAssetItem('1002', '货币资金-银行存款', balances),
    formatAssetItem('1012', '其他货币资金', balances),
    formatAssetItem('1121', '应收票据', balances),
    formatAssetItem('1122', '应收账款', balances),
    formatAssetItem('1123', '预付账款', balances),
    formatAssetItem('1221', '其他应收款', balances),
    formatAssetItem('1231', '坏账准备', balances),
    formatAssetItem('1401', '原材料', balances),
    formatAssetItem('1405', '库存商品', balances),
    formatAssetItem('1411', '周转材料', balances),
    formatAssetItem('1471', '存货跌价准备', balances),
  ]
  const totalCurrentAssets = currentAssets.reduce((sum, i) => sum + i.amount, 0)

  // 非流动资产
  const nonCurrentAssets = [
    formatAssetItem('1501', '持有至到期投资', balances),
    formatAssetItem('1511', '长期股权投资', balances),
    formatAssetItem('1601', '固定资产', balances),
    formatAssetItem('1602', '累计折旧', balances),
    formatAssetItem('1701', '无形资产', balances),
    formatAssetItem('1702', '累计摊销', balances),
    formatAssetItem('1801', '长期待摊费用', balances),
  ]
  const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, i) => sum + i.amount, 0)

  // 流动负债
  const currentLiabilities = [
    formatLiabilityOrEquityItem('2001', '短期借款', balances),
    formatLiabilityOrEquityItem('2201', '应付票据', balances),
    formatLiabilityOrEquityItem('2202', '应付账款', balances),
    formatLiabilityOrEquityItem('2203', '预收账款', balances),
    formatLiabilityOrEquityItem('2211', '应付职工薪酬', balances),
    formatLiabilityOrEquityItem('2221', '应交税费', balances),
    formatLiabilityOrEquityItem('2231', '应付利息', balances),
    formatLiabilityOrEquityItem('2241', '其他应付款', balances),
  ]
  const totalCurrentLiabilities = currentLiabilities.reduce((sum, i) => sum + i.amount, 0)

  // 非流动负债
  const nonCurrentLiabilities = [
    formatLiabilityOrEquityItem('2501', '长期借款', balances),
  ]
  const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum, i) => sum + i.amount, 0)

  // 所有者权益
  const equity = [
    formatLiabilityOrEquityItem('3001', '实收资本', balances),
    formatLiabilityOrEquityItem('3002', '资本公积', balances),
    formatLiabilityOrEquityItem('3101', '盈余公积', balances),
    formatLiabilityOrEquityItem('3103', '本年利润', balances),
    formatLiabilityOrEquityItem('3104', '利润分配', balances),
  ]
  const totalEquity = equity.reduce((sum, i) => sum + i.amount, 0)

  const totalAssets = totalCurrentAssets + totalNonCurrentAssets
  const totalLiabilitiesAndEquity = totalCurrentLiabilities + totalNonCurrentLiabilities + totalEquity

  return {
    code: 0,
    data: {
      assets: { items: currentAssets, total: totalCurrentAssets, label: '流动资产' },
      nonCurrentAssets: { items: nonCurrentAssets, total: totalNonCurrentAssets, label: '非流动资产' },
      totalAssets,
      currentLiabilities: { items: currentLiabilities, total: totalCurrentLiabilities, label: '流动负债' },
      nonCurrentLiabilities: { items: nonCurrentLiabilities, total: totalNonCurrentLiabilities, label: '非流动负债' },
      equity: { items: equity, total: totalEquity, label: '所有者权益' },
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1,
    }
  }
})
