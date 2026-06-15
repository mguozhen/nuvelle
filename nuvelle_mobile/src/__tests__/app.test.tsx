import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";

describe("mobile app", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("switches tabs and searches dramas", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("The CEO's Secret Wife")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /search/i }));
    await user.type(screen.getByPlaceholderText("Search dramas, genres..."), "mafia");
    expect(screen.getByText("Wife of the Mafia King")).toBeInTheDocument();
  });

  it("saves a drama to My List from the details sheet", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByText("The CEO's Secret Wife")[0]);
    await user.click(screen.getByRole("button", { name: /add to my list/i }));
    await user.click(screen.getByRole("button", { name: /my list/i }));
    expect(screen.getByText("The CEO's Secret Wife")).toBeInTheDocument();
  });
});
