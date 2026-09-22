# ADX Admin

ADX 管理系统前端，面向运营、财务、运维和平台管理员，覆盖经营概览、实时信号、数据报表、广告资源、财务结算、用户权限与运行时配置。

项目基于 Vue 3、TypeScript、Vite、Pinia、Vue Router 和 ECharts，界面实现遵循仓库内统一的 ADX Design System。

## 核心能力

- 全屏一体化管理框架，包含一级模块导航、二级菜单和可折叠侧栏。
- 支持浅色、深色和跟随系统三种主题，并持久化用户偏好。
- JWT 登录、会话刷新、路由守卫和统一 API 响应处理。
- 投放总览、实时运行状态和经营指标可视化。
- 基于 Swagger 的页面范围、接口映射、角色与状态清单。
- 可复用的设计令牌、组件样式、HTML 片段和页面验收规范。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite 7 |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 图表 | ECharts |
| 图标 | Lucide Vue Next |
| 样式 | 原生 CSS + ADX Design Tokens |

## 环境要求

- Node.js `20.19+` 或 `22.12+`，推荐使用当前 LTS 版本。
- npm `10+`。

## 快速开始

```bash
npm install
npm run dev
```

开发服务器默认运行在：

```text
http://127.0.0.1:5173
```

开发环境默认启用 Mock 数据，并代理 `/api` 到测试环境。可直接登录和浏览已落地的页面骨架，不需要先启动后端。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器 |
| `npm run typecheck` | 执行 Vue/TypeScript 类型检查 |
| `npm run build` | 类型检查并构建生产产物到 `dist/` |
| `npm run preview` | 本地预览生产构建 |

提交代码前至少执行：

```bash
npm run typecheck
npm run build
```

## 环境变量

### `.env.development`

```dotenv
VITE_USE_MOCK=true
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://10.193.144.133:8080
```

### `.env.production`

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
```

| 变量 | 用途 |
| --- | --- |
| `VITE_USE_MOCK` | `true` 时使用本地演示数据，`false` 时调用真实接口 |
| `VITE_API_BASE_URL` | 前端 API 基础路径，默认 `/api` |
| `VITE_API_PROXY_TARGET` | Vite 开发代理的后端目标地址 |

真实接口与字段定义以 Swagger 为准：

```text
http://10.193.144.133:8080/swagger-ui/index.html
```

统一接口请求逻辑位于 `src/services/http.ts`。业务服务应通过该入口调用接口，统一处理 JWT、业务码和错误信息。

## 设计系统

设计系统文档已随仓库提交，可通过开发服务器访问：

- [通用组件规范](http://127.0.0.1:5173/docs/design-system/component-spec.html)：设计原则、令牌、骨架、导航、操作、表单、数据展示、反馈和验收规则。
- [可复用 HTML 片段](http://127.0.0.1:5173/docs/design-system/snippets.html)：骨架、导航、按钮、筛选、数据表和状态反馈片段。
- [页面交付清单](http://127.0.0.1:5173/docs/design-system/page-inventory.html)：页面、路由、角色、操作、接口、状态和优先级。
- [页面清单源数据](docs/design-system/page-inventory.json)：用于筛选、检索和后续任务拆分的结构化数据。
- [设计系统约束](docs/design-system/README.md)：引用顺序、命名规范、主题协议、无障碍要求和页面接入检查表。

运行中的实现样式位于：

```text
src/styles/tokens.css
src/styles/components.css
src/styles/app.css
```

`src/styles` 是应用运行时样式源，`docs/design-system/tokens.css` 和
`docs/design-system/components.css` 是规范文档资产。修改设计令牌或共享组件时，
必须同步更新两处，避免规范与实现漂移。

### 主题协议

主题状态统一保存在 `document.documentElement`：

```html
<html data-theme="light" data-theme-preference="system">
```

- `data-theme`：当前生效主题，值为 `light` 或 `dark`。
- `data-theme-preference`：用户偏好，值为 `light`、`dark` 或 `system`。

用户偏好保存在 `localStorage` 的 `adx-theme-preference` 中。选择跟随系统时，
应用会监听 `prefers-color-scheme` 并实时更新。

## 页面范围

页面清单当前包含 22 个页面、6 个模块、13 个 P0 页面和 90 项接口映射。

| 模块 | 页面数 | 主要范围 |
| --- | ---: | --- |
| 访问入口 | 1 | 登录与验证码 |
| 经营中心 | 3 | 投放总览、收益分析、实时信号 |
| 数据报表 | 4 | 核心趋势、专项报表、三方对账、事件上报日志 |
| 广告运营 | 6 | 广告位、媒体、DSP 广告源、策略、兜底广告、DSP 配置 |
| 财务结算 | 3 | DSP 账单、DSP 结算、媒体结算 |
| 系统设置 | 5 | 用户、角色、运行时配置、字典、Client SDK |

当前已提供登录、投放总览和实时信号的页面原型；其余路由已建立 P0 占位骨架，并逐步替换为完整业务页面。

每个页面必须覆盖设计清单中定义的必要状态，包括加载、空数据、错误、无权限、表单校验、操作中、成功反馈和危险操作确认等适用状态。

## 项目结构

```text
.
├─ docs/
│  └─ design-system/       # 设计规范、组件片段、页面清单
├─ src/
│  ├─ components/          # 通用 Vue 组件
│  ├─ config/              # 导航和模块配置
│  ├─ layouts/             # 管理台骨架布局
│  ├─ router/              # 路由与访问守卫
│  ├─ services/            # API 服务与请求封装
│  ├─ stores/              # Pinia 状态
│  ├─ styles/              # 运行时设计令牌与组件样式
│  ├─ types/               # API 与业务类型
│  └─ views/               # 页面视图
├─ .env.development
├─ .env.production
├─ package.json
└─ vite.config.ts
```

## 开发约定

- 路由、菜单标题、所属模块和交付阶段统一维护在 `src/router/index.ts` 与 `src/config/navigation.ts`。
- 共享颜色、字体、间距、圆角、阴影和动效只能来自 `src/styles/tokens.css`。
- 共享组件样式使用 `adx-` 命名空间，状态修饰使用 `adx-button--primary`、`adx-status--warning` 等形式。
- 业务页面不得自行新增同义颜色、圆角或控件尺寸。
- 所有图标按钮必须提供可访问名称，键盘焦点必须保持可见。
- 状态必须同时使用文字和颜色表达，不能只依赖颜色。
- 新页面至少验证 `1440×1024` 和 `1233×751`，不得出现横向溢出或文字遮挡。
- 新页面必须验证浅色、深色和跟随系统主题。

## 分支与提交

- 主分支：`master`
- 远程地址：`https://github.com/zhaoshuolei/adx-front.git`
- 提交信息建议使用 `feat:`、`fix:`、`docs:`、`refactor:` 等前缀描述变更范围。

## 开发状态

当前仓库处于基础框架和 P0 页面建设阶段。设计系统、页面清单、导航骨架、主题系统、登录、投放总览和实时信号已经建立，后续页面按页面清单中的 P0 优先级持续推进。
