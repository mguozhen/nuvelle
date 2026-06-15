import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import WebsiteHome from "../../app/page";

describe("website home page", () => {
  it("renders catalog sections and opens a drama modal", async () => {
    const user = userEvent.setup();
    render(<WebsiteHome />);
    expect(screen.getByText("Nuvelle")).toBeInTheDocument();
    expect(screen.getByText("New Releases")).toBeInTheDocument();
    expect(screen.getByText("Top 10 This Week")).toBeInTheDocument();
    expect(screen.getByText("Hidden Identity")).toBeInTheDocument();
    expect(screen.getByText("Magic & Mates")).toBeInTheDocument();
    expect(screen.getByText("Love at First Sight")).toBeInTheDocument();
    expect(screen.getByText("Revenge & Reversal")).toBeInTheDocument();
    expect(screen.getByText("Second Chance")).toBeInTheDocument();
    await user.click(screen.getAllByText("The CEO's Secret Wife")[0]);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Watch Episode 1");
    expect(dialog).toHaveTextContent("EP 1 · Free");
    expect(dialog).toHaveTextContent("EP 2 · Free");
    expect(dialog).toHaveTextContent("EP 8");
  });

  it("filters search results", async () => {
    const user = userEvent.setup();
    render(<WebsiteHome />);
    await user.type(screen.getByPlaceholderText("Search dramas"), "mafia");
    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getByText("Mafia Wife")).toBeInTheDocument();
  });

  it("supports carousel controls and closes the detail dialog", async () => {
    const user = userEvent.setup();
    render(<WebsiteHome />);
    await user.click(screen.getByRole("button", { name: "Next banner" }));
    await user.click(screen.getByRole("button", { name: "Show Wife of the Mafia King" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Wife of the Mafia King");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
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

    render(<WebsiteHome />);
    await user.click(screen.getAllByText("The CEO's Secret Wife")[0]);
    await user.click(screen.getByRole("button", { name: /watch episode 1/i }));
    expect(scrollIntoView).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    requestAnimationFrame.mockRestore();
  });
});
