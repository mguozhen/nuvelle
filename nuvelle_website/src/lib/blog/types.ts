export type BlogCategory = {
  slug: string;
  name: string;
};

export type BlogArticleListItem = {
  id: string;
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
  path?: string;
};

export type BlogListResult = {
  articles: BlogArticleListItem[];
  total: number;
  pageNum: number;
  pageSize: number;
};

export type BloggerAuthor = {
  id: string;
  email: string;
  nickname?: string | null;
  avatar_url?: string | null;
};

export type BloggerCategory = {
  id: string;
  site_id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
};

export type BloggerIntegrationPost = {
  id: string;
  site_slug: string;
  title: string;
  slug: string;
  language: string;
  path: string;
  html_content: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  published_at: string;
  updated_at: string;
  author?: BloggerAuthor | null;
  category?: BloggerCategory | null;
};
