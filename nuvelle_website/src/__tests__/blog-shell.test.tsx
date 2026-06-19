import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlogShell } from "../components/blog/blog-shell";

describe("BlogShell", () => {
  it("renders page-level structured data scripts", () => {
    render(
      <BlogShell
        locale="en"
        title="Blog"
        description="Latest Nuvelle updates."
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Blog | Nuvelle"
          }
        ]}
      >
        <div>Blog content</div>
      </BlogShell>
    );

    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

    expect(scripts.some((script) => script.textContent?.includes('"@type":"Blog"'))).toBe(true);
  });
});
