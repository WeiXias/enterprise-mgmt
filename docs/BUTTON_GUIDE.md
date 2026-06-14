# 按钮使用规范

基于 Nuxt UI v4 的 `UButton` 组件，定义本项目按钮的使用规则。

---

## 1. 变体（variant）

| 变体 | 用途 | 示例 |
|------|------|------|
| `solid`（默认） | 主要操作：创建、保存、确认提交 | 新建客户、保存、确认删除 |
| `ghost` | 次要操作：取消、关闭、行内图标操作 | 取消、编辑图标、删除图标 |
| `soft` | 警示性操作：转让、驳回、需注意的操作 | 商机转让、驳回审批 |
| `outline` | 暂不推荐使用 | — |
| `link` | 暂不推荐使用 | — |
| `subtle` | 暂不推荐使用 | — |

**规则**：主要操作按钮不写 `variant`（隐式 `solid`），其余必须显式声明。

---

## 2. 颜色（color）

| 颜色 | 用途 | 搭配变体 |
|------|------|----------|
| `primary` | 主要正向操作 | solid（默认） |
| `neutral` | 取消/关闭/次要操作 | ghost |
| `error` | 破坏性操作：删除、移除 | solid 或 ghost |
| `warning` | 警示性操作：转让、驳回 | soft 或 ghost |
| `success` | 完成/胜出操作 | solid |
| `info` | 信息性操作 | solid |

**禁止**：不允许使用 `secondary` 颜色。

---

## 3. 尺寸（size）

| 尺寸 | 用途 |
|------|------|
| `md`（默认） | 页面主操作按钮（新建、保存） |
| `sm` | 模态框内按钮、页面头部辅助操作（导出、返回） |
| `xs` | 表格行内图标按钮、紧凑空间内的操作 |

**规则**：
- 主要操作按钮不写 `size`（隐式 `md`）。
- 表格行内操作统一 `xs`。
- 模态框内按钮统一 `sm`。
- 禁止使用 `lg` 和 `xl`。

---

## 4. 图标（icon）

### 图标集

统一使用 `i-lucide-*` 前缀的 Lucide 图标，**禁止**混用其他图标集。

### 常用图标映射

| 操作 | 图标 |
|------|------|
| 新建/添加 | `i-lucide-plus` |
| 编辑 | `i-lucide-pen-line` |
| 删除 | `i-lucide-trash-2` |
| 返回 | `i-lucide-arrow-left` |
| 关闭/取消 | `i-lucide-x` |
| 导出/下载 | `i-lucide-download` |
| 确认/通过 | `i-lucide-check-circle` |
| 驳回/拒绝 | `i-lucide-x-circle` |
| 发送 | `i-lucide-send` |
| 添加用户 | `i-lucide-user-plus` |
| 转让 | `i-lucide-arrow-left-right` |

### 图标位置

- 所有按钮图标使用 `icon` 属性（前缀图标），**不使用** `trailingIcon`。
- 纯图标按钮不写文字内容，仅传 `icon`。

---

## 5. 场景模板

### 5.1 页面头部操作栏

```vue
<CommonPageHeader title="客户管理">
  <template #actions>
    <div class="flex items-center gap-2">
      <!-- 辅助操作：ghost + neutral + sm -->
      <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm">
        导出
      </UButton>
      <!-- 主操作：不写 variant（默认 solid）+ 不写 size（默认 md） -->
      <UButton icon="i-lucide-plus" color="primary">
        新建客户
      </UButton>
    </div>
  </template>
</CommonPageHeader>
```

### 5.2 表格行内操作

```vue
<!-- 编辑 -->
<UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" />
<!-- 删除 -->
<UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" />
<!-- 转让 -->
<UButton icon="i-lucide-arrow-left-right" variant="ghost" color="warning" size="xs" />
```

### 5.3 模态框底部按钮

```vue
<template #footer>
  <div class="flex justify-end gap-2">
    <!-- 取消 -->
    <UButton variant="ghost" color="neutral" size="sm" @click="close">
      算了
    </UButton>
    <!-- 确认保存 -->
    <UButton color="primary" size="sm" :loading="saving" @click="handleSave">
      保存
    </UButton>
  </div>
</template>
```

### 5.4 删除确认

```vue
<UButton color="error" size="sm" :loading="deleting" @click="handleDelete">
  确认删除
</UButton>
```

### 5.5 返回导航

```vue
<UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()">
  返回
</UButton>
```

---

## 6. 文案规范

| 场景 | 推荐文案 | 禁止文案 |
|------|----------|----------|
| 取消操作 | 算了、再想想 | — |
| 确认保存 | 保存、搞定了 | 操作成功、提交成功 |
| 确认删除 | 确认删除 | 执行删除 |
| 新建 | 新建XX | 新增XX记录 |
| 编辑 | 编辑 | 修改、编辑XX信息 |

**规则**：
- 按钮文案口语化，像同事对话，不像系统提示。
- 禁止使用：智能、AI、自动优化、系统、请求、处理、执行、模块、初始化。
- 操作成功反馈用 toast（3 秒自动消失），禁止用 modal 弹窗。

---

## 7. 禁止事项

1. **禁止**使用原生 `<button>` 元素，一律用 `<UButton>`。
2. **禁止**使用 `color="secondary"`。
3. **禁止**使用 `size="lg"` 或 `size="xl"`。
4. **禁止**使用 `trailingIcon`，图标统一前置。
5. **禁止**使用 `variant="link"` 或 `variant="subtle"`。
6. **禁止**圆角超 6px（按钮 `rounded-[6px]`）。
7. **禁止**在按钮文案中使用系统化用语（见第 6 节）。