/**
 * 数据库一致性校验脚本
 * 运行方式：cd enterprise-mgmt && pnpm tsx scripts/check-consistency.ts
 * 可配合 cron 定时执行：0 3 * * * cd /path/to/enterprise-mgmt && pnpm tsx scripts/check-consistency.ts >> data/consistency.log 2>&1
 */
import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'enterprise.db')

interface CheckResult { check: string; passed: boolean; detail: string }

function main() {
  const db = new Database(DB_PATH, { readonly: true })
  db.pragma('journal_mode = WAL')
  const results: CheckResult[] = []

  // 1. 库存量 = 入库合计 - 出库合计 + 调整合计
  const stockCheck = db.prepare(`
    SELECT p.id, p.name, p.stock_quantity AS declared,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN ABS(t.quantity) ELSE 0 END), 0)
      + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0) AS calculated
    FROM products p
    LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
    HAVING declared != calculated
  `).all() as Array<{ id: string; name: string; declared: number; calculated: number }>

  if (stockCheck.length === 0) {
    results.push({ check: '库存量一致性', passed: true, detail: `检查了所有产品，库存量与实际交易记录一致` })
  } else {
    for (const row of stockCheck) {
      results.push({ check: '库存量一致性', passed: false, detail: `产品「${row.name}」(${row.id}) 库存偏差: 声明 ${row.declared} ≠ 计算 ${row.calculated}` })
    }
  }

  // 2. 合同累计收款 = payments 表 sum(amount) where contractId
  const paymentCheck = db.prepare(`
    SELECT c.id, c.code, c.name, c.total_amount AS contract_amount,
      COALESCE(SUM(p.amount), 0) AS received,
      COALESCE((
        SELECT SUM(pp.amount) FROM payment_plans pp
        WHERE pp.contract_id = c.id AND pp.status = 'paid' AND pp.deleted_at IS NULL
      ), 0) AS plan_paid
    FROM contracts c
    LEFT JOIN payments p ON p.contract_id = c.id AND p.deleted_at IS NULL
    WHERE c.deleted_at IS NULL AND c.status IN ('in_progress', 'completed')
    GROUP BY c.id
    HAVING received > c.total_amount
  `).all() as Array<{ id: string; code: string; name: string; contract_amount: number; received: number; plan_paid: number }>

  if (paymentCheck.length === 0) {
    results.push({ check: '合同收款-超额检查', passed: true, detail: '所有进行中/已完成的合同收款未超过合同金额' })
  } else {
    for (const row of paymentCheck) {
      results.push({ check: '合同收款-超额检查', passed: false, detail: `合同「${row.name}」(${row.code}) 累计收款 ${row.received} 超过合同金额 ${row.contract_amount}` })
    }
  }

  // 3. 采购应付余额 = totalAmount - paidAmount，不应为负
  const payableCheck = db.prepare(`
    SELECT po.code, p.total_amount, p.paid_amount, p.invoice_amount,
      p.total_amount - p.paid_amount AS balance
    FROM purchase_payables p
    LEFT JOIN purchase_orders po ON po.id = p.order_id AND po.deleted_at IS NULL
    WHERE p.deleted_at IS NULL AND p.paid_amount > p.total_amount
  `).all() as Array<{ code: string; total_amount: number; paid_amount: number; invoice_amount: number; balance: number }>

  if (payableCheck.length === 0) {
    results.push({ check: '采购应付-余额检查', passed: true, detail: '所有采购应付余额正常' })
  } else {
    for (const row of payableCheck) {
      results.push({ check: '采购应付-余额检查', passed: false, detail: `采购订单「${row.code}」已付 ${row.paid_amount} 超过应付 ${row.total_amount}` })
    }
  }

  // 4. 软删除数据量统计
  const deletedStats = db.prepare(`
    SELECT 'customers' AS tbl, COUNT(*) AS cnt FROM customers WHERE deleted_at IS NOT NULL
    UNION ALL SELECT 'opportunities', COUNT(*) FROM opportunities WHERE deleted_at IS NOT NULL
    UNION ALL SELECT 'contracts', COUNT(*) FROM contracts WHERE deleted_at IS NOT NULL
    UNION ALL SELECT 'projects', COUNT(*) FROM projects WHERE deleted_at IS NOT NULL
    UNION ALL SELECT 'tasks', COUNT(*) FROM tasks WHERE deleted_at IS NOT NULL
    UNION ALL SELECT 'users', COUNT(*) FROM users WHERE deleted_at IS NOT NULL
    UNION ALL SELECT 'inventory_transactions', COUNT(*) FROM inventory_transactions WHERE deleted_at IS NOT NULL
    UNION ALL SELECT 'payment_plans', COUNT(*) FROM payment_plans WHERE deleted_at IS NOT NULL
    UNION ALL SELECT 'payments', COUNT(*) FROM payments WHERE deleted_at IS NOT NULL
    UNION ALL SELECT 'purchase_orders', COUNT(*) FROM purchase_orders WHERE deleted_at IS NOT NULL
    ORDER BY cnt DESC
  `).all() as Array<{ tbl: string; cnt: number }>

  const totalDeleted = deletedStats.reduce((sum, r) => sum + r.cnt, 0)
  results.push({ check: '软删除数据统计', passed: true, detail: `共 ${totalDeleted} 条软删除记录 (${deletedStats.slice(0, 3).map(r => `${r.tbl}:${r.cnt}`).join(', ')}...)` })

  // 5. 孤立记录检查
  const orphanResults: CheckResult[] = []
  const orphanQueries = [
    { label: '孤悬合同产品', sql: `SELECT COUNT(*) AS cnt FROM contract_products cp LEFT JOIN contracts c ON c.id = cp.contract_id WHERE c.id IS NULL` },
    { label: '孤悬付款计划', sql: `SELECT COUNT(*) AS cnt FROM payment_plans pp LEFT JOIN contracts c ON c.id = pp.contract_id WHERE c.id IS NULL AND pp.deleted_at IS NULL` },
    { label: '孤悬项目成员', sql: `SELECT COUNT(*) AS cnt FROM project_members pm LEFT JOIN projects p ON p.id = pm.project_id WHERE p.id IS NULL AND pm.deleted_at IS NULL` },
    { label: '孤悬项目任务', sql: `SELECT COUNT(*) AS cnt FROM tasks t LEFT JOIN projects p ON p.id = t.project_id WHERE p.id IS NULL AND t.deleted_at IS NULL` },
    { label: '孤悬盘点明细', sql: `SELECT COUNT(*) AS cnt FROM inventory_count_items ici LEFT JOIN inventory_counts ic ON ic.id = ici.count_id WHERE ic.id IS NULL` },
  ]
  for (const q of orphanQueries) {
    const row = db.prepare(q.sql).get() as { cnt: number }
    orphanResults.push({
      check: q.label,
      passed: row.cnt === 0,
      detail: row.cnt === 0 ? '无孤悬记录' : `发现 ${row.cnt} 条孤悬记录`
    })
  }
  results.push(...orphanResults)

  // 输出报告
  const ts = new Date().toISOString()
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  console.log(`[${ts}] 数据库一致性校验: ${passed}通过 / ${failed}失败 / ${results.length}总计`)
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌'
    console.log(`  ${icon} ${r.check}: ${r.detail}`)
  }

  if (failed > 0) {
    console.log(`\n⚠️  发现 ${failed} 个不一致项，请及时排查。`)
    process.exit(1)
  } else {
    console.log('\n🎉 所有检查通过。')
  }

  db.close()
}

main()
