# Nuvelle 多语言官网与 SSR 博客接入设计

日期：2026-06-16

## 背景

官网位于 `nuvelle_website/`，当前是 Next.js App Router 应用，但 `next.config.mjs` 配置了 `output: "export"`，因此构建产物是静态导出。用户要求给官网做博客页面，并使用 `SolveaCX/website-blog` 提供的 `voc-blog` skill 接入 VOC/Shulex 后端博客系统。

`voc-blog` 的核心约束是：博客列表、分类、搜索和详情内容必须服务端获取并直接出现在首屏 HTML 中，同时要做好 canonical、hreflang、`html lang`、面包屑和 JSON-LD。静态导出加客户端请求不满足这个约束。

已确认：

- `BLOG_SITE_KEY=nuvelle.ai`。
- 官网和博客都要支持多语言。
- 路由语言模型：
  - 英文默认路径：`/`
  - 中文：`/cn`
  - 日文：`/jp`
  - 德文：`/de`
  - 法文：`/fr`
  - 西文：`/es`
  - 葡文：`/pt`
- 后端 category ids 暂时没有，先通过环境变量配置，未配置时不传 `categoryIds`。

## 目标

实现 Nuvelle 官网的多语言路由和 SSR 博客页面：

- 多语言官网首页。
- 多语言博客列表页。
- 多语言博客分类页。
- 多语言博客搜索结果页。
- 多语言博客详情页。
- 博客 SEO 元数据、canonical、hreflang、面包屑 JSON-LD 和详情页 BlogPosting JSON-LD。

实现必须保持官网现有视觉基调，避免大幅重设品牌样式。博客为空时仍要渲染可索引的服务端 HTML 空状态，等后端发布 `site=nuvelle.ai` 的内容后自动展示。

## 非目标

- 不新增 CMS 管理后台。
- 不新增数据库或本地缓存层。
- 不把通用 UI 抽成 monorepo shared package。
- 不接入支持中心文章到博客路由，除非后端以后提供明确的支持文章分类和路由规则。
- 不把文章内容改成客户端渲染。

## 路由设计

官网首页：

- `/`
- `/cn`
- `/jp`
- `/de`
- `/fr`
- `/es`
- `/pt`

博客页面：

- `/blog`
- `/blog/category/[slug]`
- `/blog/search?value=...`
- `/blog/[slug]`
- `/cn/blog`
- `/cn/blog/category/[slug]`
- `/cn/blog/search?value=...`
- `/cn/blog/[slug]`
- `/jp/blog`
- `/jp/blog/category/[slug]`
- `/jp/blog/search?value=...`
- `/jp/blog/[slug]`
- `/de/blog`
- `/de/blog/category/[slug]`
- `/de/blog/search?value=...`
- `/de/blog/[slug]`
- `/fr/blog`
- `/fr/blog/category/[slug]`
- `/fr/blog/search?value=...`
- `/fr/blog/[slug]`
- `/es/blog`
- `/es/blog/category/[slug]`
- `/es/blog/search?value=...`
- `/es/blog/[slug]`
- `/pt/blog`
- `/pt/blog/category/[slug]`
- `/pt/blog/search?value=...`
- `/pt/blog/[slug]`

为降低重复，App Router 下使用共享组件和共享 server helpers：

- 默认英文路由作为实际实现入口。
- 语言前缀路由只解析 locale 并调用相同的页面组件/helper。
- 所有博客链接通过同一个 URL builder 生成，避免 canonical、hreflang 和页面链接各写一套规则。

## Locale 模型

内部 locale key：

| URL 前缀 | Locale | html lang | hreflang |
|---|---|---|---|
| 空 | `en` | `en` | `en` |
| `/cn` | `cn` | `zh` | `zh-CN` |
| `/jp` | `jp` | `ja` | `ja-JP` |
| `/de` | `de` | `de` | `de-DE` |
| `/fr` | `fr` | `fr` | `fr-FR` |
| `/es` | `es` | `es` | `es-ES` |
| `/pt` | `pt` | `pt` | `pt-PT` |

`app/layout.tsx` 目前固定 `<html lang="en">`。多语言实现后需要让 locale segment 对应的 layout 设置正确的 `lang`。默认英文保持 `en`，语言前缀 layout 根据映射设置 `zh`、`ja`、`de`、`fr`、`es`、`pt`。

## 配置设计

新增服务端博客配置模块，例如 `src/lib/blog/config.ts`：

- `SLX_HOST` 固定默认 `https://apps.voc.ai`，允许通过 `BLOG_SLX_HOST` 覆盖仅用于调试。
- `BLOG_SITE_KEY` 默认 `nuvelle.ai`，部署时可显式配置。
- `BLOG_PAGE_SIZE` 默认 `12`。
- `BLOG_CATEGORY_IDS_EN`
- `BLOG_CATEGORY_IDS_CN`
- `BLOG_CATEGORY_IDS_JP`
- `BLOG_CATEGORY_IDS_DE`
- `BLOG_CATEGORY_IDS_FR`
- `BLOG_CATEGORY_IDS_ES`
- `BLOG_CATEGORY_IDS_PT`
- `NEXT_PUBLIC_SITE_ORIGIN` 默认生产域 `https://nuvelle.ai`，用于 canonical 和 hreflang。

category id 环境变量解析为数字数组。数组为空时请求列表、分类、搜索和详情接口都不传 `categoryIds`，避免使用错误映射过滤掉未来内容。

所有业务参数从配置模块读取，不在页面文件中散落 `nuvelle.ai`、语言前缀或 page size。

## 后端接口

使用 `voc-blog` 指定接口：

- 列表、分类、搜索：`GET /n/blog/listDataV2`
- 详情：`GET /n/blog/detailData`

列表请求参数：

- `site=nuvelle.ai`
- `pageNum`
- `pageSize`
- `categoryIds`：当前 locale 配置存在时传逗号分隔 ids。
- `type`：分类页传 `[slug]`；普通列表页不传。
- `search`：搜索页传查询词；普通列表页不传。

详情请求参数：

- `site=nuvelle.ai`
- `slug=encodeURIComponent(slug)`
- `categoryIds`：当前 locale 配置存在时传。

当前实测 `site=nuvelle.ai` 的 `listDataV2` 返回 `{"total":0,"list":[]}`。这是可接受的空内容状态，不影响页面结构和 SEO 验证。用 `site=voc.ai` 样例确认过 detail 字段包含 `post_content`、`post_title`、`post_excerpt`、`post_date`、`twitter_image`、`meta`、`schemaJsonTrimmed`、`category` 等，没有稳定的单独 canonical/source 字段。因此 canonical 规则应写成：如果后端未来返回可信 canonical/source 字段则优先使用，否则按当前 locale 路径和 slug 生成。

## 页面结构

新增博客共享页面组件：

- `BlogShell`：复用官网 header/footer 风格，提供博客导航、搜索框和内容容器。
- `BlogListPage`：渲染 SSR 获取到的文章卡片、分页链接和空状态。
- `BlogArticleCard`：渲染标题、摘要、日期、作者、分类、封面。
- `BlogSearchForm`：使用 GET 表单跳转到当前 locale 的 `/blog/search?value=...`。
- `BlogArticlePage`：渲染标题、作者、日期、封面、正文 HTML、分类链接和面包屑。
- `BlogBreadcrumbs`：渲染可见面包屑，并与 JSON-LD 使用相同标签/URL。

首页多语言先采用轻量文本字典，不重写剧集数据结构。现有剧集标题、海报、视频和分类数据保持不变；导航、CTA、搜索 placeholder、section 标题、footer 文案等界面文本从 locale 字典读取。这样能满足官网多语言路由，同时控制改动范围。

## SEO 设计

每个博客路由提供 `generateMetadata`：

- `title`
- `description`
- `alternates.canonical`
- `alternates.languages`
- Open Graph 基础字段
- Twitter card 图片字段

canonical：

- 列表页：`${origin}${prefix}/blog`
- 分类页：`${origin}${prefix}/blog/category/${slug}`
- 搜索页：`${origin}${prefix}/blog/search?value=${query}`，仅当有 query 时带参数。
- 详情页：优先后端可信 canonical/source 字段；没有则 `${origin}${prefix}/blog/${slug}`。

hreflang：

- 列表、分类、搜索为所有支持语言输出等价 URL。
- 详情页在没有翻译关联字段时只输出当前语言和 `x-default`，避免把不同语言错误指向同一个 slug。
- `x-default` 指向英文默认路径。

JSON-LD：

- 所有博客页面输出 `BreadcrumbList`。
- 详情页优先使用后端 `schemaJsonTrimmed`，解析失败或不存在时生成 `BlogPosting`。
- `BlogPosting` 包含 headline、description、image、datePublished、dateModified、author、mainEntityOfPage。

## HTML 内容安全

详情页需要渲染后端 `post_content` HTML。实现时新增小型 sanitizer：

- 移除 `<script>`、`<style>`、`<iframe>` 中不允许的脚本风险。
- 移除 `on*` 事件属性。
- 移除 `javascript:` URL。
- 保留常见文章标签：`p`、`h2`、`h3`、`ul`、`ol`、`li`、`table`、`thead`、`tbody`、`tr`、`th`、`td`、`a`、`img`、`strong`、`em`、`blockquote`、`code`、`pre` 等。

如果后端以后明确保证 HTML 已可信，可保留该 sanitizer 作为额外防护。

## 部署影响

`nuvelle_website/next.config.mjs` 需要移除 `output: "export"`，否则 App Router SSR 博客不生效。

这会影响 `deploy/google-cloud.sh` 和 `deploy/README-google-cloud.md` 中当前把 `nuvelle_website/out` 当静态服务部署的假设。实现时需要把 `nuvelle-website` 改为 Next SSR 服务：

- 使用 Node runtime 启动 `next start` 或等价 standalone 输出。
- Cloud Run 设置必要环境变量。
- 不再把官网当纯静态 nginx 服务。

如果部署脚本改造超出本次实现窗口，至少要在 README 和脚本中明确官网 SSR 的运行方式，避免构建成功但生产博客不可用。

## 错误处理

- 列表、分类、搜索接口失败时渲染 SSR 空状态和错误提示，不让整页崩溃。
- 详情接口无数据时返回 `notFound()`。
- 详情接口返回非 blog 类型内容时返回 `notFound()`。
- 搜索 query 为空时仍渲染搜索页，但显示输入提示和最新文章列表或空状态。

## 测试计划

新增或更新 `nuvelle_website` 测试：

- URL builder 单元测试：locale prefix、canonical、hreflang、搜索 URL。
- 配置解析测试：category ids 为空、逗号分隔数字、非法值过滤。
- sanitizer 测试：移除 script、事件属性和 javascript URL，保留文章结构。
- 博客数据 adapter 测试：后端列表/detail 字段映射。
- 多语言首页渲染测试：每个 locale 至少渲染正确导航和 blog 链接。

验证命令：

- `pnpm --filter nuvelle_website typecheck`
- `pnpm --filter nuvelle_website test --run`
- `pnpm --filter nuvelle_website build`

SSR 验证：

- 启动官网 dev server。
- `curl -s http://localhost:3000/blog | rg "Blog|canonical|application/ld\\+json|hreflang"`
- 后端有文章后，`curl -s http://localhost:3000/blog/[slug] | rg "<article|<h1|canonical|application/ld\\+json"`
- JavaScript 禁用或只看 `curl` 输出时，文章卡片和详情正文应已在 HTML 中。

## 风险

- `site=nuvelle.ai` 当前没有文章，视觉和 SEO 结构可以验证，但真实文章样式需要等内容发布后再用实际数据复核。
- 移除静态导出会改变官网部署模式，需要同步 Cloud Run 构建/启动脚本。
- 后端 category ids 未确定，短期不传 `categoryIds` 能避免误过滤，但多语言内容隔离依赖后端 `site`、`type` 或未来 category 配置。
- 详情页翻译关联字段未知，hreflang 不能假设所有语言都有同 slug 翻译。
