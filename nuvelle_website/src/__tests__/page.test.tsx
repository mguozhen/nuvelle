import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import WebsiteHome from "../components/website-home";

describe("website home page", () => {
  it("renders catalog sections and opens a drama modal", async () => {
    const user = userEvent.setup();
    render(<WebsiteHome locale="en" />);
    expect(screen.getByText("Nuvelle")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New Releases" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top 10 This Week" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hidden Identity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Magic & Mates" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Love at First Sight" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Revenge & Reversal" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Second Chance" })).toBeInTheDocument();
    await user.click(screen.getAllByText("The CEO's Secret Wife")[0]);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Watch Episode 1");
    expect(dialog).toHaveTextContent("EP 1 · Free");
    expect(dialog).toHaveTextContent("EP 2 · Free");
    expect(dialog).toHaveTextContent("EP 8");
  });

  it("filters search results", async () => {
    const user = userEvent.setup();
    render(<WebsiteHome locale="en" />);
    await user.type(screen.getByPlaceholderText("Search dramas"), "mafia");
    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getByText("Mafia Wife")).toBeInTheDocument();
  });

  it("supports carousel controls and closes the detail dialog", async () => {
    const user = userEvent.setup();
    render(<WebsiteHome locale="en" />);
    await user.click(screen.getByRole("button", { name: "Next banner" }));
    await user.click(screen.getByRole("button", { name: "Show Wife of the Mafia King" }));
    await user.click(screen.getByRole("button", { name: "Watch Now" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Wife of the Mafia King");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("renders localized navigation and app copy", () => {
    render(<WebsiteHome locale="cn" />);
    expect(screen.getByRole("link", { name: "博客" })).toHaveAttribute("href", "/cn/blog");
    expect(screen.getByPlaceholderText("搜索短剧")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "最新上线" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "隐藏身份" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "公司" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "关于 Nuvelle" })).toBeInTheDocument();
    expect(screen.getAllByText("获取 App").length).toBeGreaterThan(0);
  });

  it("falls back to the app band when no affiliate link exists", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const requestAnimationFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView
    });

    render(<WebsiteHome locale="en" />);
    await user.click(screen.getAllByText("The CEO's Secret Wife")[0]);
    await user.click(screen.getByRole("button", { name: /watch episode 1/i }));
    expect(scrollIntoView).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    requestAnimationFrame.mockRestore();
  });
});
