# 样式令牌与选择器使用规范

> 适用范围：enterprise-mgmt 前端（Nuxt 4 + Nuxt UI v4 + Tailwind CSS v4）  
> 最后更新：2025-06-14

---

## 1. 总则

### 1.1 核心原则

| 原则 | 说明 |
|------|------|
| **令牌优先** | 颜色、间距、圆角、阴影、z-index 一律使用设计令牌，禁止硬编码 |
| **工具类优先** | 优先使用 Tailwind 工具类，避免 `<style>` 块和自定义 CSS class |
| **语义化命名** | 使用 `brand-500` 而非 `blue-500`，使用 `surface-card` 而非 `white` |
| **主题可换** | 所有颜色必须能随 `.theme-amber` / `.theme-blue` / `.theme-warm` 切换而变化 |

### 1.2 样式优先级（从高到低）

1. **Tailwind 工具类**（模板 `class=""` 中）— 默认选择
2. **`@utility` 自定义工具类** — 重复出现的组合样式提取到此
3. **全局语义 class**（`main.css` 中 `.card` 等）— 仅用于跨组件复用的复杂组合
4. **`<style scoped>`** — 仅当工具类无法表达时使用（如动画、复杂选择器）

---

## 2. 颜色令牌

### 2.1 三层令牌体系

项目在 `main.css` 的 `@theme static { }` 中定义了三层令牌：

```
基础色阶        语义色            运行时变量(:root)
brand-500  ──►  content-primary  ──►  --color-text-primary (别名)
brand-400  ──►  surface-card     ──►  --color-bg-card     (别名)
gray-200   ──►  line             ──►  --color-border       (别名)
```

**使用规则：**

| 场景 | 用什么 | 示例 |
|------|--------|------|
| 品牌色 / 功能色 | 基础色阶名 | `bg-brand-500`, `text-danger-600` |
| 文字、表面、边框 | 语义色名 | `text-content-primary`, `bg-surface-card`, `border-line` |
| 主题切换时需要变化的色值 | 语义色名（它们会被 `.theme-*` 覆写） | `bg-surface-page`, `text-content-secondary` |

### 2.2 禁止使用的写法

| 禁止 | 原因 | 替代 |
|------|------|------|
| `bg-blue-500`, `text-blue-*` | 旧兼容层别名，迁移后删除 | `bg-brand-500`, `text-brand-*` |
| `bg-stone-*`, `text-stone-*` | 旧兼容层别名，迁移后删除 | `bg-gray-*`, `text-gray-*` |
| `bg-amber-*` | 旧兼容层别名，迁移后删除 | `bg-brand-*` |
| `bg-[var(--color-brand-400)]` | 冗长，`@theme` 已注册可直接用 | `bg-brand-400` |
| `text-[var(--color-content-secondary)]` | 冗长，语义色已注册可直接用 | `text-content-secondary` |
| `border-[var(--color-line)]` | 同上 | `border-line` |
| `bg-white` | 不随主题切换 | `bg-surface-card` |
| `bg-gray-100`（表面色意图时） | 不随主题切换 | `bg-surface-page` |
| `#EF9F27`, `#333`, `rgb(...)` 硬编码 | 绕过令牌系统，无法统一调整 | 使用对应的令牌名 |

### 2.3 允许的例外

以下场景可使用硬编码色值，但需加注释说明原因：

- **SVG 属性**：`<svg fill="#EF9F27">` — SVG 不支持 CSS 变量时，用 `var()` 注入 `style` 优先，无法注入时才硬编码并注释
- **第三方库配置**：图表库等要求传入 hex 值的 API
- **打印样式**：打印页面需要固定黑白时

### 2.4 功能色对照

| 语义 | 令牌 | 用途 |
|------|------|------|
| 成功 | `success-*` | 操作成功、已通过 |
| 危险 | `danger-*` | 删除、错误、必填 |
| 警告 | `warning-*` | 提醒、需注意 |
| 信息 | `info-*` / `brand-*` | 一般提示、品牌强调 |

---

## 3. 间距与圆角

### 3.1 间距令牌

使用 Tailwind 标准间距刻度，不引入自定义间距令牌：

| 用途 | 值 | 说明 |
|------|-----|------|
| 组件内紧凑间距 | `1` / `1.5` (4px / 6px) | 图标与文字间距等 |
| 组件内常规间距 | `2` / `3` (8px / 12px) | 表单元素间距等 |
| 卡片内边距 | `5` (20px / `1.25rem`) | 与 `.card` 的 `padding` 一致 |
| 区块间距 | `4` / `6` (16px / 24px) | 模块之间的间距 |
| 页面边距 | `4` / `6` (16px / 24px) | 响应式调整 |

### 3.2 圆角规范

参照 CLAUDE.md 中的视觉原则：

| 用途 | 值 | Tailwind | 说明 |
|------|-----|-----------|------|
| 按钮 | 6px | `rounded-md` | 按项目规范 |
| 小卡片 / 徽章 | 6px | `rounded-md` | badge、tag |
| 卡片 / 弹窗 | 12px | `rounded-xl` | `.card` 已用 12px |
| 大面板 / 模态框 | 12px | `rounded-xl` | 与卡片保持一致 |
| 全圆角 | 9999px | `rounded-full` | 头像、圆点 |

> **注意**：项目规范明确禁止 `rounded-lg`（8px）作为主要圆角值。当前存量中 `rounded-lg` 大量使用（594 处），新代码应按上表选用 `rounded-md` 或 `rounded-xl`。存量逐步迁移。

---

## 4. 阴影

使用 `@theme` 中已注册的阴影令牌：

| 令牌 | 值 | 用途 |
|------|-----|------|
| `shadow-card` | `0 1px 3px 0 rgb(0 0 0 / 0.03), 0 1px 2px -1px rgb(0 0 0 / 0.04)` | 卡片默认 |
| `shadow-card-hover` | `0 4px 12px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03)` | 卡片悬浮 |
| `shadow-elevated` | `0 12px 40px -3px rgb(0 0 0 / 0.08), 0 4px 8px -4px rgb(0 0 0 / 0.04)` | 弹出层 |

模板中使用方式：`shadow-card`、`shadow-card-hover`、`shadow-elevated`。

---

## 5. z-index 分层

### 5.1 分层定义

在 `@theme` 中新增 z-index 令牌（**待实施**）：

```css
@theme static {
  --z-base: 0;
  --z-dropdown: 20;
  --z-sticky: 30;
  --z-overlay: 50;
  --z-modal: 100;
  --z-popover: 110;
  --z-toast: 200;
  --z-watermark: 300;
}
```

### 5.2 使用规则

| 用途 | 令牌 | 说明 |
|------|------|------|
| 普通内容 | `z-base` (0) | 默认，无需写 |
| 下拉选择器 | `z-dropdown` (20) | CustomerSelect, UserSelect 等 |
| 粘性元素 | `z-sticky` (30) | 吸顶表头、固定侧栏 |
| 全局搜索/通知面板 | `z-overlay` (50) | 遮罩层、搜索下拉 |
| 模态弹窗 | `z-modal` (100) | UModal 等 |
| Popover/Tooltip | `z-popover` (110) | 弹出提示 |
| Toast 通知 | `z-toast` (200) | 轻量通知 |
| 水印 | `z-watermark` (300) | 全局水印覆盖 |

**禁止事项：**

- 禁止内联 `style="z-index: 9999"` 或 `style="z-index: 99999"`
- 禁止使用 Tailwind 的 `z-50`、`z-20` 等魔法数字
- 统一使用 `z-[var(--z-dropdown)]` 或 `@utility` 封装后的 `z-dropdown`

---

## 6. 字重

按 CLAUDE.md 视觉原则：

| 用途 | 字重 | Tailwind |
|------|------|----------|
| 正文 | 400 | `font-normal`（默认，无需写） |
| 标题 | 500 | `font-medium` |

**禁止**使用 `font-semibold`（600）、`font-bold`（700）、`font-extrabold`（800）。

---

## 7. 重复样式提取为 `@utility`

### 7.1 已识别的提取候选

| 重复模式 | 出现次数 | 提取为 |
|----------|----------|--------|
| `focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15` | 106 | `@utility focus-ring` |
| 表单输入框基础样式 `h-9 px-3 text-sm rounded-lg border border-line bg-surface-card` | ~80 | `@utility input-base` |

### 7.2 `@utility` 定义方式（Tailwind v4）

在 `main.css` 中添加：

```css
@utility focus-ring {
  outline: none;
  border-color: var(--color-brand-400);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-brand-400) 15%, transparent);
}
```

模板中使用：`class="... focus-ring"` 替代原来的 4 个 focus 类。

### 7.3 提取原则

- 同一组 class 组合出现 **≥10 次** 时考虑提取
- 提取后保留语义可读性，不提取无意义的原子组合
- 提取为 `@utility` 而非 `@apply`（Tailwind v4 推荐）

---

## 8. 全局语义 class 规范

### 8.1 现有 class 与迁移计划

| 旧 class | 新 class | 状态 | 计划 |
|----------|----------|------|------|
| `.warm-card` | `.card` | 两者并存，`.card` 更完善（有阴影） | 冻结 `.warm-card`，新代码一律用 `.card`，存量逐步替换 |
| `.warm-badge` | `.badge` | 旧 class 在用 | 新建 `.badge` 语义类，逐步替换 |
| `.warm-badge-*` | `.badge-*` | 旧 class 在用 | 同上 |
| `.skeleton` | `.skeleton` | 已是正确命名 | 保留 |
| `.form-group` | 无 | 43 处使用但无样式 | 移除或替换为 `<div class="mb-4">` |

### 8.2 新增全局 class 命名规范

- 全局 class **必须加项目前缀 `em-`**（Enterprise Management），避免与 Nuxt UI / 第三方库冲突
- 迁移完成后：
  - `.card` → `.em-card`
  - `.badge` → `.em-badge`
  - `.skeleton` → `.em-skeleton`
- 迁移策略：先在 `main.css` 中同时定义 `.em-card` 和 `.card`（后者指向前者），存量替换完成后再删除 `.card`

### 8.3 何时使用全局 class vs 工具类

| 场景 | 选择 | 原因 |
|------|------|------|
| 单个属性（`mb-4`, `text-sm`） | 工具类 | 简单直接 |
| 跨 3+ 组件复用的组合样式 | 全局 class | 减少重复 |
| 组件内部的一次性样式 | 工具类 | 不值得提取 |
| 带状态变化的复杂样式 | `<style scoped>` | 工具类难以表达 |

---

## 9. 主题切换适配

### 9.1 当前主题机制

```ts
// useTheme.ts
type ThemeName = 'blue' | 'warm'
// 在 <html> 上切换 class: theme-blue / theme-warm
// 默认（无额外 class）= amber 暖色主题
```

### 9.2 新增主题的步骤

1. 在 `main.css` 的 `@theme static { }` 中定义该主题需要覆盖的色阶
2. 添加 `.theme-xxx { }` 块，覆写运行时变量
3. 在 `useTheme.ts` 中扩展 `ThemeName` 类型
4. 确保 **没有** 使用硬编码色值（`bg-white`、`#xxx`），否则新主题下会穿帮

### 9.3 主题适配清单

每个页面/组件必须检查：

- [ ] 没有使用 `bg-white`（应用 `bg-surface-card` 或 `bg-surface-page`）
- [ ] 没有使用硬编码 hex 色值
- [ ] 没有使用旧令牌名（`blue-*`、`stone-*`、`amber-*`）
- [ ] 深色/浅色文字对比度在新主题下仍满足 WCAG AA

---

## 10. 表单控件规范

### 10.1 统一表单样式

原生 `<input>` / `<select>` / `<textarea>` 使用以下组合：

```html
<!-- 输入框 -->
<input class="h-9 px-3 text-sm rounded-md border border-line bg-surface-card focus-ring" />

<!-- 下拉选择 -->
<select class="h-9 px-3 text-sm rounded-md border border-line bg-surface-card focus-ring" />

<!-- 文本域 -->
<textarea class="px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring" />
```

提取 `@utility` 后简化为：

```html
<input class="input-base focus-ring" />
```

### 10.2 表单布局

- 表单项分组使用 `<div class="mb-4">`，不再使用无样式的 `.form-group`
- 标签使用 `<label class="block text-sm text-content-secondary mb-1">`
- 错误提示使用 `text-danger-600 text-xs mt-1`

---

## 11. Nuxt UI 组件样式覆写

### 11.1 原则

- Nuxt UI v4 组件通过 `app.config.ts` 的 `ui` 选项全局定制
- 单处定制通过组件的 `:ui` prop 传入
- **禁止**在全局 CSS 中用选择器覆写 Nuxt UI 组件内部样式（如 `.UButton { ... }`）
- 必须覆写时使用 Tailwind 的 `!important` 前缀（`!rounded-lg`），且仅限当前组件的 `:ui` prop

### 11.2 当前 app.config.ts

```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber',
      neutral: 'gray'
    }
  }
})
```

后续如需调整 Nuxt UI 组件默认样式，在此文件的 `ui` 对象中扩展。

---

## 12. 迁移清单

### Phase 1 — 基础设施（立即可做）

- [ ] 在 `@theme` 中添加 z-index 令牌（`--z-dropdown` 等）
- [ ] 提取 `@utility focus-ring` 和 `@utility input-base`
- [ ] 新建 `.em-card` 全局 class，`.card` 别名指向它
- [ ] 新建 `.em-badge` 系列替代 `.warm-badge`

### Phase 2 — 令牌统一 ✅ 已完成

- [x] 将 `bg-[var(--color-brand-*)]` 替换为 `bg-brand-*` — 0 处残留
- [x] 将 `text-[var(--color-content-*)]` 替换为 `text-content-*` — 0 处残留
- [x] 将 `border-[var(--color-line*)]` 替换为 `border-line` — 0 处残留
- [x] 将 `bg-white` 替换为 `bg-surface-card` 或 `bg-surface-page` — 0 处残留
- [x] 将 `font-semibold` / `font-bold` 替换为 `font-medium` — 0 处残留
- [x] 移除 `.warm-card` / `.warm-badge` / `.form-group` — 0 处残留
- [x] 将 `rounded-lg` 统一迁移为 `rounded-md` 或 `rounded-xl` — 0 处残留

### Phase 3 — 清理（待实施）

- [ ] 移除 `@theme` 中的 `blue-*`、`stone-*`、`amber-*` 兼容别名
- [ ] 移除 `.warm-card` 及 `.warm-badge-*` 定义
- [ ] 移除 `.card` 别名，统一使用 `.em-card`
- [ ] 替换所有 `.form-group` 为 `<div class="mb-4">`
- [ ] 将 `rounded-lg` 统一迁移为 `rounded-md`（按钮）或 `rounded-xl`（卡片）

### Phase 4 — 验证

- [ ] 切换 `theme-blue` 和 `theme-warm` 全页面走查，确认无遗漏的硬编码色
- [ ] 检查 SVG / 图表中的硬编码色值，改为 CSS 变量注入
- [ ] 检查 `z-index` 无内联值
- [ ] 检查字重无 `font-semibold`/`font-bold`

---

## 13. 新代码 Checklist

提交新代码前对照检查：

- [ ] 颜色使用令牌名（`brand-500`、`content-secondary`、`surface-card`、`line`），无硬编码
- [ ] 无 `bg-white`、`bg-blue-*`、`text-stone-*`、`bg-amber-*` 等旧令牌
- [ ] 无 `bg-[var(--color-xxx)]` 冗长写法（直接用注册名 `bg-xxx`）
- [ ] 无内联 `z-index`
- [ ] 无 `font-semibold` / `font-bold` / `font-extrabold`
- [ ] 无 `!important`（Nuxt UI `:ui` prop 场景除外）
- [ ] 表单控件使用 `focus-ring` 工具类而非 4 段重复类
- [ ] 全局 class 使用 `em-` 前缀
- [ ] 圆角遵循 6px / 12px 规范，不新增 `rounded-lg`（8px）