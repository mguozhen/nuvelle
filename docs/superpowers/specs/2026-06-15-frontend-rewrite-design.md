# Nuvelle 前端重构设计

日期：2026-06-15

## 背景

当前仓库包含四个静态前端页面和一个 Python promo 后端：

- `site/`：官网，静态 `index.html`，包含剧集目录、Banner、Top 10、搜索和详情弹窗。
- `nuvelle_app/`：移动端 PWA，静态 `index.html` + `manifest.webmanifest` + `sw.js`，包含底部 Tab、搜索、My List、本地安装入口和离线缓存。
- `nuvelle_cps/`：CPS/分销门户，静态 `index.html`，包含加入流程、本地分销码、素材包下载、推广链接和演示收益页。
- `nuvelle_dash/`：Admin/Scout dashboard，静态 `index.html`，包含 `admin/admin` 本地登录、选品、投票、本地状态、剧集看板、HLS 预览、promo 生成和批量生成入口。
- `nuvelle_kit/`：Python promo 生成服务，`promo_server.py` 暴露 `/health`、`/vote`、`/votes`、`/gen`、`/job`、`/gen-batch`、`/batch`、`/batch-download`、`/rs-video` 等接口。

本次任务只重构前端项目结构和实现方式，不上线部署，不改 `nuvelle_kit` 的核心生成逻辑。

## 已确认选择

- 根目录统一管理脚本，不创建 shared package。
- UI 尽量贴近当前页面，不做品牌方向重设计。
- 全部前端使用 TypeScript。
- 官网 `site/` 改为 `nuvelle_website/`，使用 Next.js + shadcn/ui + Tailwind CSS。
- 其他三个前端使用 React + Vite + shadcn/ui + Tailwind CSS：
  - `nuvelle_app/` 改为 `nuvelle_mobile/`
  - `nuvelle_cps/` 改为 `nuvelle_web/`
  - `nuvelle_dash/` 改为 `nuvelle_admin/`

## 目标结构

仓库根目录新增 Node 工作区配置：

- `package.json`：放统一脚本，例如安装、dev、build、typecheck。
- `pnpm-workspace.yaml`：声明四个前端 app。
- `nuvelle_website/`：Next.js app。
- `nuvelle_mobile/`：Vite React app。
- `nuvelle_web/`：Vite React app。
- `nuvelle_admin/`：Vite React app。

选择 `pnpm` 作为包管理器，因为它适合多 app 工作区，依赖安装快，根脚本也清晰。每个 app 保留自己的配置文件，避免引入共享包后扩大重构范围。

## 技术栈

四个前端统一使用：

- TypeScript
- React
- Tailwind CSS
- shadcn/ui 组件模式
- lucide-react 图标

`nuvelle_website` 使用 Next.js，主要原因是官网以后更可能需要 SEO、路由、元数据和服务端静态生成。其余三个产品面是应用型界面，用 Vite 更轻，开发和构建反馈更快。

## 资产迁移

静态资源按所属 app 迁移到各自 `public/` 目录：

- `site/posters/`、`site/videos/` 迁入 `nuvelle_website/public/`。
- `nuvelle_app/posters/`、`nuvelle_app/icons/`、`manifest.webmanifest`、`sw.js`、视频资产迁入 `nuvelle_mobile/public/`。
- `nuvelle_cps/posters/`、`nuvelle_cps/icons/`、`nuvelle_cps/packs/` 迁入 `nuvelle_web/public/`。
- `nuvelle_dash/icons/`、`nuvelle_dash/seed_dramas.json` 迁入 `nuvelle_admin/public/`。

当前 `dashboard_data/seed_dramas.json` 是空文件；本次 Admin 初始数据以 `nuvelle_dash/seed_dramas.json` 为准。

## 功能范围

### `nuvelle_website`

重写官网为 Next.js 页面，保留现有体验：

- 顶部导航、品牌标识、搜索框和 Get the App CTA。
- 首页大 Banner 轮播、横向剧集行、Top 10、分类行。
- 搜索结果区域，按标题、类型、简介过滤。
- 剧集详情弹窗，展示海报、类型、评分、集数、播放量、简介和剧集列表。
- 真实分销链接存在时跳转外链；没有链接时滚动到 app 下载区。
- 保留现有海报、视频和品牌视觉，避免大幅重设视觉风格。

### `nuvelle_mobile`

重写移动端 PWA，保留现有体验：

- Home、Search、My List、Me 四个底部 Tab。
- 首页 Hero、Top 10、分类剧集横滑列表。
- 搜索输入、类型 chips、本地过滤。
- My List 使用 `localStorage`，键名兼容现有 `nuvelle_list`。
- 剧集详情 sheet，支持收藏、播放按钮、免费/锁定集数展示。
- PWA manifest、service worker、安装提示和离线缓存。

### `nuvelle_web`

重写 CPS/分销门户，保留现有体验：

- 加入流程：邮箱、TikTok handle、本地生成分销码。
- 登录状态使用 `localStorage`，键名兼容现有 `nuvelle_boost`。
- Material Square：素材包卡片、13s 视频下载、封面下载、caption 复制。
- Full catalog：剧集卡片、推广链接复制。
- My Links：已领取链接列表。
- Earnings：继续作为演示数据，不引入真实结算逻辑。

### `nuvelle_admin`

重写 Admin/Scout dashboard，保留现有核心工作流：

- 本地登录：默认仍为 `admin/admin`。
- 从 `public/seed_dramas.json` 加载剧集数据。
- 投票和本地状态使用 `localStorage`，并继续尝试同步到 promo 后端 `/vote`、`/votes`。
- 选品 Swipe：保留视频预览、HLS 支持、标签、highlight 标记、投票动作。
- Promo 生成：保留后端 URL 设置，默认开发地址为 `http://localhost:8799`，并调用 `/gen`、`/job`。
- 剧集看板：排序、筛选、详情弹窗、单集生成、手动链接生成、批量生成。
- 生成素材库：展示已生成的 teaser、cover、caption，支持下载和 regenerate。

## 后端接口边界

本次前端重构不新建数据库，也不把本地 `localStorage` 状态改为真实账号系统。

`nuvelle_admin` 是唯一直接依赖后端接口的前端。它继续通过可配置的 promo backend URL 调用 `nuvelle_kit/promo_server.py`：

- 健康检查：`GET /health`
- 投票同步：`GET /votes`、`POST /vote`
- 单个 promo：`POST /gen`、`GET /job?id=...`
- 批量 promo：`POST /gen-batch`、`GET /batch?id=...`、`GET /batch-download?id=...`
- ReelShort 视频解析：`GET /rs-video?book_id=...`

官网、移动端、CPS 门户本次仍以前端静态数据和本地状态为主。

## 数据和状态

- 剧集目录数据先按 app 内静态 TypeScript 数据维护，等价迁移当前 `index.html` 里的常量。
- Admin 大数据集保留为 JSON 静态文件，避免把 2 万行数据塞进组件源码。
- PWA 收藏、CPS 登录/链接、Admin 登录/投票/生成历史继续使用现有 `localStorage` 键，降低迁移后用户本地状态丢失的风险。

## 路由和脚本

根目录必须提供这些脚本：

- `pnpm dev:website`
- `pnpm dev:mobile`
- `pnpm dev:web`
- `pnpm dev:admin`
- `pnpm build`
- `pnpm typecheck`

各 app 自己提供 `dev`、`build`、`typecheck`。根脚本只编排，不封装业务逻辑。

## 兼容更新

重构完成后同步更新：

- `README.md` 中的目录说明、启动方式和构建方式。
- `deploy/README-gcp.md` 和 `deploy/deploy-gcp.sh` 中旧目录名。
- `nuvelle_kit/promo_server.py` 中服务 Admin 静态目录的旧 `nuvelle_dash` 路径。
- `.gitignore` 增加 `.superpowers/`，只忽略本地辅助产物，不提交其内容。

## 测试和验收

本次重构完成前必须验证：

- `pnpm install`
- `pnpm typecheck`
- `pnpm build`
- 各 app 至少启动一次 dev server。
- 用浏览器冒烟验证四个入口：
  - 官网首页、搜索、详情弹窗。
  - 移动端 Tab、搜索、收藏、详情 sheet。
  - CPS 加入、复制链接、素材下载入口。
  - Admin 登录、数据加载、看板、后端 URL 设置、promo 生成请求错误态。

如果本地没有可用 `FLATKEY_API_KEY` 或 promo 后端未启动，Admin 的生成成功态不作为必须验收项，但错误态和 URL 配置必须可用。

## 非目标

- 不部署到 GCP、Vercel 或 Railway。
- 不新增真实用户系统、CPS 结算、数据库或后台管理权限。
- 不改 Python promo pipeline 的生成算法。
- 不把四个 app 抽成 monorepo shared UI 包。
- 不做大幅品牌视觉重设计。

## 风险

- 旧页面把数据、样式和逻辑混在单个 HTML 文件中，迁移时容易漏掉小交互，需要按页面逐项比对。
- Admin 页面逻辑最多，且依赖 HLS 和 promo 后端，应该最后验收但最早拆出类型和 API 边界。
- shadcn/ui 默认视觉与旧页面不同，实施时需要用 Tailwind token 和自定义样式贴近旧视觉，而不是直接套默认组件外观。
- Next.js 与 Vite 的静态资源路径规则不同，迁移资源后要逐页检查图片、视频、manifest 和 service worker 路径。
