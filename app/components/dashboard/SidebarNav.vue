<script setup lang="ts">
/**
 * 侧边栏导航组件 — 从 layouts/dashboard.vue 提取
 */
const authStore = useAuthStore()
const { can } = usePermission()
const route = useRoute()

const props = defineProps<{
  collapsed: boolean
  logoUrl: string
  systemName: string
  groups: SidebarGroup[]
  collapsedGroups: Record<string, boolean>
}>()

const emit = defineEmits<{
  'toggle-group': [key: string]
  'update:collapsed': [value: boolean]
}>()

const userMenuItems = computed(() => [
  [{ label: authStore.user?.name || '未登录', slot: 'account', disabled: true }],
  [{ label: '个人中心', icon: 'i-lucide-user', to: '/dashboard/profile' }],
  [{ label: '退出登录', icon: 'i-lucide-log-out', onSelect: () => authStore.logout() }],
])

function isItemActive(item: SidebarItem): boolean {
  if (!item.to) return false
  if (item.exact) return route.path === item.to
  return route.path === item.to || route.path.startsWith(item.to)
}
</script>

<template>
  <aside :class="[collapsed ? 'w-16' : 'w-60', 'shrink-0 border-r border-line bg-surface-card flex flex-col transition-all duration-300']">
    <!-- Logo 区 -->
    <div class="h-14 flex items-center gap-2 px-3 border-b border-line-light" :class="collapsed ? 'justify-center' : 'px-5'">
      <NuxtLink to="/dashboard" class="flex items-center gap-2 hover:opacity-80 transition-opacity" :class="collapsed ? 'justify-center' : ''">
        <div v-if="logoUrl" class="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center shrink-0">
          <img :src="logoUrl" alt="Logo" class="w-full h-full object-contain" />
        </div>
        <div v-else class="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center shrink-0">
          <span class="text-white text-sm font-medium">E</span>
        </div>
        <span v-show="!collapsed" class="text-sm font-medium text-content-primary truncate">{{ systemName }}</span>
      </NuxtLink>
    </div>

    <nav class="flex-1 overflow-y-auto py-3 px-3">
      <!-- 首页 / 待办 / 消息 — 无分组标题，始终显示 -->
      <ul class="space-y-0.5 mb-2">
        <li>
          <NuxtLink
            to="/dashboard"
            :title="collapsed ? '首页' : undefined"
            :class="['flex items-center rounded-md text-sm transition-all', collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2', 'text-content-secondary hover:bg-brand-50 hover:text-brand-600', route.path === '/dashboard' ? 'bg-brand-50 text-brand-600 font-medium' : '']"
          >
            <UIcon name="i-lucide-home" class="w-[18px] h-[18px] shrink-0" />
            <span v-show="!collapsed" class="truncate">首页</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/dashboard/todos"
            :title="collapsed ? '待办' : undefined"
            :class="['flex items-center rounded-md text-sm transition-all', collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2', 'text-content-secondary hover:bg-brand-50 hover:text-brand-600', route.path === '/dashboard/todos' || route.path.startsWith('/dashboard/todos') ? 'bg-brand-50 text-brand-600 font-medium' : '']"
          >
            <UIcon name="i-lucide-list-checks" class="w-[18px] h-[18px] shrink-0" />
            <span v-show="!collapsed" class="truncate">待办</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/dashboard/notifications"
            :title="collapsed ? '消息' : undefined"
            :class="['flex items-center rounded-md text-sm transition-all', collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2', 'text-content-secondary hover:bg-brand-50 hover:text-brand-600', route.path.startsWith('/dashboard/notifications') ? 'bg-brand-50 text-brand-600 font-medium' : '']"
          >
            <UIcon name="i-lucide-bell" class="w-[18px] h-[18px] shrink-0" />
            <span v-show="!collapsed" class="truncate">消息</span>
          </NuxtLink>
        </li>
      </ul>

      <div class="border-t border-line-light my-2" />

      <!-- 分组菜单 -->
      <div v-for="group in groups" :key="group.key">
        <!-- 分组标题 -->
        <button
          v-show="!collapsed"
          class="w-full flex items-center gap-1 text-[11px] text-content-muted font-medium tracking-wide uppercase py-2 px-3 hover:text-content-secondary transition-colors"
          @click="emit('toggle-group', group.key)"
        >
          <UIcon
            :name="collapsedGroups[group.key] ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
            class="w-3 h-3 shrink-0"
          />
          {{ group.label }}
        </button>
        <!-- 收起时分割线 -->
        <div v-show="collapsed" class="border-t border-line-light my-2 mx-2" />

        <!-- 菜单项 -->
        <ul v-show="collapsed || !collapsedGroups[group.key]" class="space-y-0.5">
          <template v-for="(item, idx) in group.items" :key="idx">
            <li>
              <NuxtLink
                :to="item.to!"
                :title="collapsed ? item.label : undefined"
                :class="[
                  'flex items-center rounded-md text-sm transition-all',
                  collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
                  'text-content-secondary hover:bg-brand-50 hover:text-brand-600',
                  isItemActive(item) ? 'bg-brand-50 text-brand-600 font-medium' : ''
                ]"
              >
                <UIcon v-if="item.icon" :name="item.icon" class="w-[18px] h-[18px] shrink-0" />
                <span v-show="!collapsed" class="truncate">{{ item.label }}</span>
              </NuxtLink>
            </li>
            <!-- 二级子项 -->
            <template v-if="item.children && !collapsed && !collapsedGroups[group.key]">
              <li v-for="(child, cIdx) in item.children" :key="'c-' + cIdx">
                <NuxtLink
                  :to="child.to!"
                  :class="[
                    'flex items-center rounded-md text-sm transition-all gap-3 pl-10 py-1.5',
                    'text-content-muted hover:bg-brand-50 hover:text-brand-600',
                    $route.path === child.to || $route.path.startsWith(child.to!) ? 'text-brand-600' : ''
                  ]"
                >
                  <span class="text-xs truncate">{{ child.label }}</span>
                </NuxtLink>
              </li>
            </template>
          </template>
        </ul>
      </div>

      <div class="border-t border-line-light my-2" />

      <!-- 底部管理区 -->
      <ul class="space-y-0.5">
        <li v-if="can('user:read')">
          <NuxtLink
            to="/dashboard/users"
            :title="collapsed ? '同事' : undefined"
            :class="['flex items-center rounded-md text-sm transition-all', collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2', 'text-content-secondary hover:bg-brand-50 hover:text-brand-600', route.path.startsWith('/dashboard/users') ? 'bg-brand-50 text-brand-600 font-medium' : '']"
          >
            <UIcon name="i-lucide-user-round-plus" class="w-[18px] h-[18px] shrink-0" />
            <span v-show="!collapsed" class="truncate">同事</span>
          </NuxtLink>
        </li>
        <li v-if="can('user:read')">
          <NuxtLink
            to="/dashboard/settings"
            :title="collapsed ? '设置' : undefined"
            :class="['flex items-center rounded-md text-sm transition-all', collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2', 'text-content-secondary hover:bg-brand-50 hover:text-brand-600', route.path.startsWith('/dashboard/settings') ? 'bg-brand-50 text-brand-600 font-medium' : '']"
          >
            <UIcon name="i-lucide-settings" class="w-[18px] h-[18px] shrink-0" />
            <span v-show="!collapsed" class="truncate">设置</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <!-- 底部用户区 -->
    <div class="border-t border-line-light p-3">
      <UDropdownMenu :items="userMenuItems" :popper="{ placement: 'top' }">
        <button :class="[collapsed ? 'justify-center' : '', 'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-hover transition-colors text-left']">
          <div class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span class="text-brand-700 text-xs font-medium">{{ authStore.user?.name?.charAt(0) || '?' }}</span>
          </div>
          <div v-show="!collapsed" class="flex-1 min-w-0">
            <p class="text-sm text-content-primary truncate">{{ authStore.user?.name || '未登录' }}</p>
            <p class="text-xs text-content-muted truncate">{{ authStore.roleLabel }}</p>
          </div>
        </button>
      </UDropdownMenu>
      <button
        @click="emit('update:collapsed', !collapsed)"
        :class="[
          'w-full flex items-center rounded-md text-sm transition-colors mt-1',
          collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
          'text-content-muted hover:bg-brand-50 hover:text-brand-600'
        ]"
        :title="collapsed ? '展开菜单' : '收起菜单'"
      >
        <UIcon :name="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" class="w-[18px] h-[18px] shrink-0" />
        <span v-show="!collapsed" class="truncate">收起菜单</span>
      </button>
    </div>
  </aside>
</template>
