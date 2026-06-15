<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '设置 · 方案A', middleware: ['auth'] })
const activeTab = ref('basic')
const tabs = [
  { key: 'basic', label: '基本信息', icon: 'i-lucide-info' },
  { key: 'organizations', label: '组织架构', icon: 'i-lucide-network' },
  { key: 'roles', label: '角色权限', icon: 'i-lucide-shield-check' },
  { key: 'coderules', label: '编码规则', icon: 'i-lucide-hash' },
  { key: 'smtp', label: '邮件配置', icon: 'i-lucide-mail' },
  { key: 'security', label: '安全策略', icon: 'i-lucide-shield' },
  { key: 'backup', label: '数据备份', icon: 'i-lucide-hard-drive' },
  { key: 'ai', label: '数字员工', icon: 'i-lucide-user-check' },
  { key: 'sidebar', label: '菜单排序', icon: 'i-lucide-menu' },
  { key: 'datadict', label: '数据字典', icon: 'i-lucide-database' },
  { key: 'logs', label: '操作日志', icon: 'i-lucide-clock' },
]
const tabDescs: Record<string, string> = {
  basic: '公司名称、Logo、系统名称等基础信息配置',
  organizations: '部门树管理与成员分配，支持多层级组织架构',
  roles: '角色定义与权限分配，控制每个角色能做什么',
  coderules: '业务单据自动编号规则，修改后新编号生效',
  smtp: 'SMTP 发信服务设置，用于系统邮件通知',
  security: '登录安全与密码策略，保护系统访问安全',
  backup: '数据库备份与恢复，定期备份保障数据安全',
  ai: 'AI 供应商与数字员工配置',
  sidebar: '侧边栏模块顺序调整，拖拽排列菜单',
  datadict: '业务枚举与分类维护，统一管理下拉选项',
  logs: '系统操作审计记录，谁在什么时间做了什么',
}
</script>

<template>
  <div>
    <!-- 页面标题 —— 杂志风大标题 + 引导文案 -->
    <div class="mb-10">
      <h1 class="text-2xl font-medium text-content-primary tracking-tight">系统设置</h1>
      <p class="text-sm text-content-muted mt-1.5 max-w-lg leading-relaxed">
        这里管着整个系统的运行参数。每一项调整都会即时生效，改之前可以多看一眼。
      </p>
    </div>

    <div class="flex gap-8">
      <!-- 左侧导航 -->
      <nav class="w-44 shrink-0">
        <p class="text-[10px] font-medium text-content-muted uppercase tracking-[0.12em] mb-3 px-1">设置分类</p>
        <div class="space-y-0.5">
          <button
            v-for="tab in tabs" :key="tab.key"
            class="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
            :class="activeTab === tab.key
              ? 'bg-surface-card shadow-sm text-content-primary font-medium ring-1 ring-brand-200/50'
              : 'text-content-muted hover:text-content-secondary hover:bg-surface-hover'"
            @click="activeTab = tab.key"
          >
            <div class="flex items-center gap-2.5">
              <UIcon :name="tab.icon" class="w-4 h-4 shrink-0" :class="activeTab === tab.key ? 'text-brand-500' : ''" />
              <span>{{ tab.label }}</span>
            </div>
          </button>
        </div>
      </nav>

      <!-- 右侧 -->
      <div class="flex-1 min-w-0">
        <!-- 引导卡 -->
        <div class="em-card mb-6 border-l-4 border-l-brand-500">
          <h2 class="text-base font-medium text-content-primary mb-1">{{ tabs.find(t => t.key === activeTab)?.label }}</h2>
          <p class="text-sm text-content-muted">{{ tabDescs[activeTab] || '' }}</p>
        </div>

        <!-- 基本信息 -->
        <div v-show="activeTab === 'basic'" class="grid grid-cols-2 gap-5">
          <div class="em-card">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-building-2" class="w-5 h-5 text-brand-600" /></div>
              <div class="flex-1">
                <label class="text-sm font-medium text-content-primary">公司名称</label>
                <p class="text-[11px] text-content-muted mt-0.5">对外展示的企业全称</p>
                <input type="text" placeholder="输入公司名称" value="星辰科技有限公司" class="w-full mt-2.5 input-base focus-ring text-sm" />
              </div>
            </div>
            <div class="flex justify-end mt-3"><UButton size="xs" color="primary">保存</UButton></div>
          </div>
          <div class="em-card">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-type" class="w-5 h-5 text-brand-600" /></div>
              <div class="flex-1">
                <label class="text-sm font-medium text-content-primary">系统名称</label>
                <p class="text-[11px] text-content-muted mt-0.5">浏览器标签页显示的名称</p>
                <input type="text" placeholder="一体化管理" value="企业一体化管理" class="w-full mt-2.5 input-base focus-ring text-sm" />
              </div>
            </div>
            <div class="flex justify-end mt-3"><UButton size="xs" color="primary">保存</UButton></div>
          </div>
          <div class="em-card">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-message-square-text" class="w-5 h-5 text-brand-600" /></div>
              <div class="flex-1">
                <label class="text-sm font-medium text-content-primary">系统副标题</label>
                <p class="text-[11px] text-content-muted mt-0.5">一句简短的口号或说明</p>
                <input type="text" placeholder="小团队的一站式业务管理工具" value="小团队的一站式业务管理工具" class="w-full mt-2.5 input-base focus-ring text-sm" />
              </div>
            </div>
            <div class="flex justify-end mt-3"><UButton size="xs" color="primary">保存</UButton></div>
          </div>
          <div class="em-card">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-image" class="w-5 h-5 text-brand-600" /></div>
              <div class="flex-1">
                <label class="text-sm font-medium text-content-primary">公司 Logo</label>
                <p class="text-[11px] text-content-muted mt-0.5">支持 png/jpg/gif/webp/svg</p>
                <div class="mt-2.5 flex items-center gap-3">
                  <div class="w-14 h-14 rounded-xl bg-surface-hover flex items-center justify-center border-2 border-dashed border-line"><UIcon name="i-lucide-image" class="w-6 h-6 text-content-muted" /></div>
                  <UButton size="xs" color="neutral" variant="outline">选择图片</UButton>
                </div>
              </div>
            </div>
            <div class="flex justify-end mt-3"><UButton size="xs" color="primary">保存</UButton></div>
          </div>
        </div>

        <!-- 组织架构 -->
        <div v-show="activeTab === 'organizations'" class="grid grid-cols-3 gap-5">
          <div class="em-card">
            <div class="flex items-center justify-between mb-4"><h3 class="text-sm font-medium text-content-primary">部门列表</h3><UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs">添加</UButton></div>
            <div class="space-y-0.5">
              <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-50 text-brand-700 text-sm"><UIcon name="i-lucide-building-2" class="w-3.5 h-3.5" /> 技术部 <span class="ml-auto text-[10px]">12人</span></div>
              <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-content-secondary hover:bg-surface-hover cursor-pointer"><UIcon name="i-lucide-corner-down-right" class="w-3.5 h-3.5 text-content-muted" /> 前端组 <span class="ml-auto text-[10px]">5人</span></div>
              <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-content-secondary hover:bg-surface-hover cursor-pointer"><UIcon name="i-lucide-corner-down-right" class="w-3.5 h-3.5 text-content-muted" /> 后端组 <span class="ml-auto text-[10px]">7人</span></div>
              <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-content-secondary hover:bg-surface-hover cursor-pointer"><UIcon name="i-lucide-building-2" class="w-3.5 h-3.5 text-content-muted" /> 市场部 <span class="ml-auto text-[10px]">3人</span></div>
            </div>
          </div>
          <div class="em-card col-span-2">
            <div class="flex items-center justify-between mb-4"><h3 class="text-sm font-medium text-content-primary">技术部</h3><UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs">编辑</UButton></div>
            <p class="text-xs text-content-muted mb-3">研发中心 · 12 名成员</p>
            <div class="space-y-1.5">
              <div v-for="i in 4" :key="i" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors">
                <div class="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 text-xs font-medium">{{ '张李王赵'[i-1] }}</div>
                <div class="flex-1"><p class="text-sm text-content-primary">成员{{ i }}</p><p class="text-[11px] text-content-muted">@user{{ i }}</p></div>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{{ ['前端','后端','后端','全栈'][i-1] }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 角色权限 -->
        <div v-show="activeTab === 'roles'" class="grid grid-cols-2 gap-5">
          <div class="em-card">
            <div class="flex items-center justify-between mb-4"><h3 class="text-sm font-medium text-content-primary">角色列表</h3><UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs">添加</UButton></div>
            <div class="space-y-1">
              <div v-for="(r, i) in ['管理员','销售负责人','销售成员','财务']" :key="r" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors" :class="i === 0 ? 'bg-brand-50' : ''">
                <UIcon :name="i === 0 ? 'i-lucide-lock' : 'i-lucide-shield'" class="w-3.5 h-3.5 shrink-0" :class="i === 0 ? 'text-brand-500' : 'text-content-muted'" />
                <span class="text-sm text-content-secondary">{{ r }}</span>
                <span class="ml-auto text-[10px] text-content-muted">{{ [1,2,5,1][i] }}人</span>
              </div>
            </div>
          </div>
          <div class="em-card">
            <div class="flex items-center justify-between mb-4"><h3 class="text-sm font-medium text-content-primary">管理员 · 权限</h3><UButton size="xs" color="primary">保存权限</UButton></div>
            <div class="space-y-3">
              <div v-for="res in ['客户','商机','产品','合同','财务','系统']" :key="res" class="border border-line-light rounded-lg p-3">
                <div class="flex items-center justify-between mb-2"><span class="text-[11px] font-medium text-content-muted uppercase tracking-wide">{{ res }}</span><button class="text-[10px] text-brand-600 hover:text-brand-700">全选</button></div>
                <div class="flex flex-wrap gap-1.5">
                  <label class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-brand-50 text-brand-700 cursor-pointer"><input type="checkbox" checked class="w-3 h-3 rounded accent-brand-500" /> 查看</label>
                  <label class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-surface-hover text-content-muted cursor-pointer hover:bg-brand-50 hover:text-brand-700 transition-colors"><input type="checkbox" class="w-3 h-3 rounded accent-brand-500" /> 新增</label>
                  <label class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-surface-hover text-content-muted cursor-pointer hover:bg-brand-50 hover:text-brand-700 transition-colors"><input type="checkbox" class="w-3 h-3 rounded accent-brand-500" /> 编辑</label>
                  <label class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-surface-hover text-content-muted cursor-pointer hover:bg-brand-50 hover:text-brand-700 transition-colors"><input type="checkbox" class="w-3 h-3 rounded accent-brand-500" /> 删除</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 数据字典 -->
        <div v-show="activeTab === 'datadict'" class="grid grid-cols-3 gap-5">
          <div class="em-card">
            <h3 class="text-[11px] font-medium text-content-muted uppercase tracking-wide mb-3">字典分类</h3>
            <div class="space-y-0.5">
              <button class="w-full text-left px-2.5 py-2 rounded-lg text-sm bg-brand-50 text-brand-700 font-medium">全部分类</button>
              <button class="w-full text-left px-2.5 py-2 rounded-lg text-sm text-content-muted hover:bg-surface-hover transition-colors">业务字典</button>
              <button class="w-full text-left px-2.5 py-2 rounded-lg text-sm text-content-muted hover:bg-surface-hover transition-colors">产品规格模板</button>
              <button class="w-full text-left px-2.5 py-2 rounded-lg text-sm text-content-muted hover:bg-surface-hover transition-colors">财务</button>
              <button class="w-full text-left px-2.5 py-2 rounded-lg text-sm text-content-muted hover:bg-surface-hover transition-colors">状态枚举</button>
            </div>
          </div>
          <div class="em-card col-span-2">
            <div class="flex items-center justify-between mb-4"><h3 class="text-sm font-medium text-content-primary">客户行业 · 12 项</h3><UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs">添加</UButton></div>
            <div class="space-y-1">
              <div v-for="item in ['信息技术','软件开发','物流运输','电子商务','教育培训','金融保险','医疗健康','制造业','房地产','餐饮旅游','媒体娱乐','政府及公共']" :key="item" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors group text-sm text-content-secondary">
                <div class="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                <span class="flex-1">{{ item }}</span>
                <div class="hidden group-hover:flex items-center gap-1"><UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" /><UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" /></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 菜单排序 -->
        <div v-show="activeTab === 'sidebar'" class="em-card">
          <h3 class="text-sm font-medium text-content-primary mb-4">侧边栏模块排序</h3>
          <p class="text-xs text-content-muted mb-4">拖拽调整左侧菜单显示顺序。</p>
          <div class="space-y-1.5 max-w-sm">
            <div v-for="m in ['首页','待办','畅聊','消息','审批','客户','商机','产品','合同']" :key="m" class="flex items-center gap-3 px-3 py-2 rounded-lg border border-line-light bg-surface-card cursor-grab hover:shadow-sm transition-shadow">
              <UIcon name="i-lucide-grip-vertical" class="w-3.5 h-3.5 text-content-muted" />
              <span class="text-sm text-content-secondary">{{ m }}</span>
            </div>
          </div>
          <div class="flex justify-end mt-4"><UButton size="xs" color="primary">保存排序</UButton></div>
        </div>

        <!-- 其他 Tab 占位 -->
        <div v-show="activeTab === 'coderules'" class="em-card"><h3 class="text-sm font-medium text-content-primary mb-4">业务单据自动编号规则</h3><p class="text-xs text-content-muted mb-4">修改后新生成的编号立即生效。</p><div class="grid grid-cols-3 gap-4"><div v-for="m in ['合同','项目','客户','商机','发票','采购']" :key="m" class="border border-line-light rounded-xl p-4"><div class="flex items-center gap-2 mb-3"><div class="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-hash" class="w-4 h-4 text-brand-600" /></div><span class="text-sm font-medium text-content-primary">{{ m }}</span></div><div class="space-y-2"><div><label class="text-[10px] text-content-muted">前缀</label><input type="text" value="HT-" class="w-full mt-0.5 input-base text-xs focus-ring" /></div><div><label class="text-[10px] text-content-muted">日期格式</label><select class="w-full mt-0.5 input-base text-xs focus-ring"><option>年月</option><option>年月日</option><option>无</option></select></div><div><label class="text-[10px] text-content-muted">序号位数</label><input type="number" value="4" min="2" max="8" class="w-full mt-0.5 input-base text-xs focus-ring" /></div></div></div></div></div>
        <div v-show="activeTab === 'smtp'" class="em-card max-w-2xl"><h3 class="text-sm font-medium text-content-primary mb-4">SMTP 发信服务设置</h3><div class="grid grid-cols-2 gap-4"><div><label class="text-xs text-content-secondary mb-1 block">SMTP 服务器</label><input type="text" placeholder="smtp.example.com" class="w-full input-base focus-ring" /></div><div><label class="text-xs text-content-secondary mb-1 block">端口</label><input type="number" value="587" class="w-full input-base focus-ring" /></div><div><label class="text-xs text-content-secondary mb-1 block">账号</label><input type="text" placeholder="noreply@example.com" class="w-full input-base focus-ring" /></div><div><label class="text-xs text-content-secondary mb-1 block">密码</label><input type="password" placeholder="••••••••" class="w-full input-base focus-ring" /></div></div><div class="flex justify-end mt-4"><UButton size="xs" color="primary">保存</UButton></div></div>
        <div v-show="activeTab === 'security'" class="grid grid-cols-2 gap-5">
          <div class="em-card"><div class="flex items-start gap-4"><div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-key" class="w-5 h-5 text-brand-600" /></div><div><label class="text-sm font-medium text-content-primary">密码最小长度</label><p class="text-xs text-content-muted mt-0.5 mb-3">要求密码至少达到的字符数</p><div class="flex items-center gap-2"><input type="number" value="8" min="4" max="32" class="w-20 input-base focus-ring" /><span class="text-xs text-content-muted">个字符</span></div></div></div></div>
          <div class="em-card"><div class="flex items-start gap-4"><div class="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center shrink-0"><UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-warning-600" /></div><div><label class="text-sm font-medium text-content-primary">最大登录尝试次数</label><p class="text-xs text-content-muted mt-0.5 mb-3">超过后账号暂时锁定</p><div class="flex items-center gap-2"><input type="number" value="5" min="1" max="20" class="w-20 input-base focus-ring" /><span class="text-xs text-content-muted">次</span></div></div></div></div>
          <div class="em-card col-span-2 flex justify-end"><UButton size="xs" color="primary">保存安全策略</UButton></div>
        </div>
        <div v-show="activeTab === 'backup'" class="em-card text-center py-16"><UIcon name="i-lucide-hard-drive" class="w-10 h-10 text-content-muted mx-auto mb-3" /><h3 class="text-sm font-medium text-content-secondary mb-1">数据备份</h3><p class="text-xs text-content-muted mb-4">创建、下载和恢复数据库备份</p><UButton size="sm" color="primary">创建新备份</UButton></div>
        <div v-show="activeTab === 'ai'" class="em-card text-center py-16"><UIcon name="i-lucide-user-check" class="w-10 h-10 text-content-muted mx-auto mb-3" /><h3 class="text-sm font-medium text-content-secondary mb-1">数字员工设置</h3><p class="text-xs text-content-muted mb-4">管理 AI 供应商和数字员工</p><UButton size="sm" color="primary">配置</UButton></div>
        <div v-show="activeTab === 'logs'" class="em-card"><h3 class="text-sm font-medium text-content-primary mb-4">操作日志</h3><div class="overflow-hidden"><table class="w-full text-sm"><thead><tr class="border-b border-line-light text-left text-xs text-content-muted"><th class="py-2.5 px-4">时间</th><th class="py-2.5 px-4">操作人</th><th class="py-2.5 px-4">模块</th><th class="py-2.5 px-4">操作</th><th class="py-2.5 px-4">详情</th></tr></thead><tbody><tr v-for="i in 5" :key="i" class="border-b border-line-light last:border-0 hover:bg-surface-hover/50 transition-colors"><td class="py-2 px-4 text-xs text-content-muted">2026-06-15 10:3{{ i }}</td><td class="py-2 px-4 text-xs text-content-secondary">{{ ['张管理','李经理','王销售','赵财务','陈开发'][i-1] }}</td><td class="py-2 px-4"><span class="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700">{{ ['客户','合同','商机','财务','系统'][i-1] }}</span></td><td class="py-2 px-4 text-xs text-content-secondary">{{ ['创建','审批','更新','审核','修改'][i-1] }}</td><td class="py-2 px-4 text-xs text-content-muted max-w-[200px] truncate">{{ ['新增了客户','通过了合同审批','修改了商机','审核了报销','修改了系统配置'][i-1] }}</td></tr></tbody></table></div></div>
      </div>
    </div>
  </div>
</template>
