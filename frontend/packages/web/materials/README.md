# @skyroc/materials

> 管理后台 UI 材料库 — 提供完整的布局框架 `AdminLayout` 与多风格标签页 `PageTab`，支持响应式、暗色模式与 CSS 变量驱动的动态主题

专为管理后台设计的 React UI 材料库，组件零业务耦合、纯插槽组合，所有尺寸与层叠通过 CSS 变量驱动。

## Features

- **`AdminLayout`** — 完整的后台布局框架，通过 `Header` / `Tab` / `Sider` / `Footer` / `children` 五大插槽组合区域
- **两种布局模式** — `vertical`（侧边导航）与 `horizontal`（顶部导航 + 侧边内容）
- **两种滚动模式** — `content`（仅内容区滚动）与 `wrapper`（整体滚动）
- **移动端适配** — `isMobile` 模式自动切换为遮罩式抽屉 Sider
- **`PageTab`** — 多风格标签页组件，支持 `chrome` / `button` / `slider` 三种样式
- **CSS 变量驱动** — 所有尺寸、层叠、色彩通过 `--soy-*` CSS 变量注入,过渡动画自然平滑
- **触摸事件友好** — 内置 `useTap` 区分滑动与点击，避免移动端误触
- **完整 TypeScript 类型** — `AdminLayoutProps` / `PageTabProps` / `LayoutCssVars` / `PageTabCssVars`

## Installation

```bash
pnpm add @skyroc/materials
```

**依赖**：`@skyroc/color`、`@skyroc/ui`、`@skyroc/utils`

## Quick Start

### AdminLayout

```tsx
import { AdminLayout, LAYOUT_SCROLL_EL_ID } from '@skyroc/materials';

const App = () => {
  const [siderCollapse, setSiderCollapse] = useState(false);

  return (
    <AdminLayout
      mode="vertical"
      fixedTop
      headerHeight={56}
      tabHeight={44}
      siderWidth={220}
      siderCollapsedWidth={64}
      siderCollapse={siderCollapse}
      footerHeight={48}
      isMobile={false}
      scrollMode="content"
      updateSiderCollapse={() => setSiderCollapse(v => !v)}
      Header={<AppHeader />}
      Tab={<AppTab />}
      Sider={<AppSider />}
      Footer={<AppFooter />}
    >
      <RouterOutlet />
    </AdminLayout>
  );
};
```

### PageTab

```tsx
import { PageTab } from '@skyroc/materials';

{tabs.map(tab => (
  <PageTab
    key={tab.path}
    mode="chrome"
    active={tab.path === currentPath}
    activeColor="#6366F1"
    prefix={tab.icon}
    darkMode={isDark}
    closable
    onClick={() => navigate(tab.path)}
    handleClose={() => closeTab(tab.path)}
  >
    {tab.title}
  </PageTab>
))}
```

### 编程式滚动

```ts
import { LAYOUT_SCROLL_EL_ID } from '@skyroc/materials';

const scrollEl = document.querySelector(`#${LAYOUT_SCROLL_EL_ID}`);
scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
```

## Package Structure

```
src/
├── types/
│   └── index.ts                AdminLayoutProps、PageTabProps 及所有子配置类型
├── libs/
│   ├── admin-layout/
│   │   ├── index.tsx           AdminLayout 组件（布局逻辑 + 插槽渲染）
│   │   ├── shared.ts           createLayoutCssVars / LAYOUT_SCROLL_EL_ID / LAYOUT_MAX_Z_INDEX
│   │   └── index.module.css    布局 CSS 变量消费（--soy-* 变量）
│   └── page-tab/
│       ├── index.tsx           PageTab 入口（模式分发、memo 包装）
│       ├── ButtonTab.tsx       按钮风格标签
│       ├── ChromeTab.tsx       Chrome 风格标签
│       ├── SliderTab.tsx       滑块下划线风格标签
│       ├── SvgClose.tsx        关闭图标（支持触摸事件）
│       ├── ChromeTabBg.tsx     Chrome 弧形 SVG 背景
│       ├── hook.ts             useTap（触摸事件处理）
│       ├── shared.ts           createTabCssVars / ACTIVE_COLOR
│       └── index.module.css    标签页 CSS 变量消费
└── index.ts                    公共导出
```

## API 速览

| 导出 | 类型 | 说明 |
|------|------|------|
| `AdminLayout` | component | 插槽式后台布局容器，零业务耦合 |
| `PageTab` | component | 单个标签页单元，三种风格可选 |
| `LAYOUT_SCROLL_EL_ID` | const | `'__SCROLL_EL_ID__'` — 滚动容器默认 DOM id |
| `LAYOUT_MAX_Z_INDEX` | const | `100` — 布局层叠默认最大值 |
| `AdminLayoutProps` | type | 布局组件所有 Props 类型 |
| `PageTabProps` | type | 标签组件所有 Props 类型 |
| `LayoutMode` | type | `'horizontal' \| 'vertical'` |
| `LayoutScrollMode` | type | `'content' \| 'wrapper'` |
| `PageTabMode` | type | `'button' \| 'chrome' \| 'slider'` |
| `LayoutCssVars` | type | 布局相关 CSS 变量类型 |
| `PageTabCssVars` | type | 标签相关 CSS 变量类型 |

完整 API 文档（含 Props 详解、风格示意图、CSS 变量计算规则、设计取舍）：见 [`apps/web-kit-docs/content/docs/materials.mdx`](../../../apps/web-kit-docs/content/docs/materials.mdx)。

## CSS 变量系统

所有尺寸与层叠值由组件写入 inline CSS 变量，CSS Module 通过 `var()` 消费：

**布局变量**（AdminLayout）

```
--soy-header-height          Header 高度
--soy-header-z-index         Header 层叠（默认 97）
--soy-tab-height             Tab 高度
--soy-tab-z-index            Tab 层叠（默认 95）
--soy-sider-width            Sider 展开宽度
--soy-sider-collapsed-width  Sider 折叠宽度
--soy-sider-z-index          Sider 层叠（垂直 99 / 水平 96）
--soy-mobile-sider-z-index   移动端 Sider 层叠（默认 98）
--soy-footer-height          Footer 高度
--soy-footer-z-index         Footer 层叠（默认 95）
```

**标签变量**（PageTab，由 `createTabCssVars(activeColor)` 生成）

```
--soy-primary-color           原色（文字激活、分隔线）
--soy-primary-color1          主色 + 白底 10% 混合（Chrome 亮色激活背景）
--soy-primary-color2          主色 + 黑底 30% 混合（Chrome 暗色激活背景）
--soy-primary-color-opacity1  alpha 10%（Button/Slider 激活背景）
--soy-primary-color-opacity2  alpha 15%（关闭按钮 hover 背景）
--soy-primary-color-opacity3  alpha 30%（关闭按钮 hover 激活态）
```

颜色混合来自 `@skyroc/color` 的 `transformColorWithOpacity` 与 `addColorAlpha`。

## 设计要点

- **零业务耦合**：`AdminLayout` 是纯布局容器，不内置菜单树、标签列表、用户信息等业务组件，通过插槽自由组合
- **CSS 变量驱动**：所有尺寸/层叠/色彩由 CSS 变量驱动，组件内部样式改动无需 JS 参与，过渡动画自然覆盖属性变化
- **`PageTab` memo 包装**：标签列表中只有属性变化的标签会重新渲染，`ChromeTabBg` 与 `SvgClose` 同样 memo
- **触摸事件防误触**：`useTap` 在 `touchmove` 时取消点击,避免移动端滚动时误触发标签切换

## Related Packages

- [`@skyroc/web-admin-theme`](../admin-theme) — 主题状态、预设系统、Ant Design 集成
- [`@skyroc/color`](../../@core/color) — 核心色板生成与颜色工具
- [`@skyroc/ui`](../ui) — 基础 UI 元素

## License

MIT
