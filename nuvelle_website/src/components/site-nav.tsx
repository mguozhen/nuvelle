import { blogPath } from "@/lib/blog/urls";
import { homePathForLocale, type LocaleKey, websiteCopy } from "@/lib/i18n";

type SiteNavProps = {
  locale: LocaleKey;
};

function homeSectionPath(locale: LocaleKey, id: string) {
  return `${homePathForLocale(locale)}#${id}`;
}

export function SiteNav({ locale }: SiteNavProps) {
  const copy = websiteCopy[locale];
  const homeHref = homePathForLocale(locale);
  const links = [
    { label: copy.nav.home, href: homeHref },
    { label: copy.nav.categories, href: homeSectionPath(locale, "categories") },
    { label: copy.nav.fandom, href: homeSectionPath(locale, "app") },
    { label: copy.nav.creators, href: homeSectionPath(locale, "app") },
    { label: copy.nav.blog, href: blogPath(locale, { kind: "list" }) }
  ];

  return (
    <nav className="hidden items-center gap-7 text-sm font-medium text-[#a8b0cc] md:flex">
      {links.map((link) => (
        <a key={link.label} className="transition-colors hover:text-white" href={link.href}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
