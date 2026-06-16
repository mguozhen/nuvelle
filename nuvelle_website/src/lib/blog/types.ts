export type BlogCategory = {
  slug: string;
  name: string;
};

export type BlogArticleListItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  image?: string;
  authorName?: string;
  category?: BlogCategory;
};

export type BlogArticleDetail = BlogArticleListItem & {
  contentHtml: string;
  meta: {
    title?: string;
    desc?: string;
  };
  schemaJsonTrimmed?: string;
  canonicalUrl?: string;
  modifiedDate?: string;
  type?: string;
};

export type BlogListResult = {
  articles: BlogArticleListItem[];
  total: number;
  pageNum: number;
  pageSize: number;
};

export type BackendBlogListItem = {
  ID?: number | string;
  id?: number | string;
  slug?: string;
  post_name?: string;
  post_title?: string;
  title?: string;
  post_excerpt?: string;
  description?: string;
  post_date?: string;
  update_time?: string;
  twitter_image?: string;
  author_name?: string;
  category_slug?: string;
  category_name?: string;
  category?: Partial<BlogCategory>;
  detailUrl?: string;
};

export type BackendBlogDetail = BackendBlogListItem & {
  post_content?: string;
  meta?: {
    title?: string;
    desc?: string;
  };
  schemaJsonTrimmed?: string;
  canonical?: string;
  canonicalUrl?: string;
  canonical_url?: string;
  sourceUrl?: string;
  source_url?: string;
  post_modified?: string;
  type?: string;
};
