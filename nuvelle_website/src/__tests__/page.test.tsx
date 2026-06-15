import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import WebsiteHome from "../../app/page";

describe("website home page", () => {
  it("renders catalog sections and opens a drama modal", async () => {
    const user = userEvent.setup();
    render(<WebsiteHome />);
    expect(screen.getByText("Nuvelle")).toBeInTheDocument();
    expect(screen.getByText("Top 10 This Week")).toBeInTheDocument();
    await user.click(screen.getAllByText("The CEO's Secret Wife")[0]);
    expect(screen.getByRole("dialog")).toHaveTextContent("Watch Episode 1");
  });

  it("filters search results", async () => {
    const user = userEvent.setup();
    render(<WebsiteHome />);
    await user.type(screen.getByPlaceholderText("Search dramas"), "mafia");
    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getByText("Mafia Wife")).toBeInTheDocument();
  });
});
