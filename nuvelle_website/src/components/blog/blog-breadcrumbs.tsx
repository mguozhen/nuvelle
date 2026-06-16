import type { BreadcrumbItem } from "@/lib/blog/seo";

type BlogBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function BlogBreadcrumbs({ items }: BlogBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[#8f98b6]">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={`${item.name}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span className="text-[#4e5674]">/</span> : null}
              {item.url && !isCurrent ? (
                <a className="font-medium transition-colors hover:text-white" href={item.url}>
                  {item.name}
                </a>
              ) : (
                <span
                  className={isCurrent ? "font-medium text-white" : undefined}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
