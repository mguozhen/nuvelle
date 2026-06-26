import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlogListPage } from "../components/blog/blog-list-page";

describe("BlogListPage", () => {
  it("renders stable editorial context even when the integration has no posts", () => {
    render(
      <BlogListPage
        locale="en"
        result={{ articles: [], total: 0, pageNum: 1, pageSize: 12 }}
        emptyTitle="No blog posts yet"
        emptyBody="Check back soon for Nuvelle updates and story recommendations."
      />
    );

    expect(screen.getByRole("heading", { name: "What Nuvelle covers" })).toBeInTheDocument();
    expect(screen.getByText(/AI short drama production notes/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Nuvelle dramas" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Explore story categories" })).toHaveAttribute("href", "/#categories");
  });
});
