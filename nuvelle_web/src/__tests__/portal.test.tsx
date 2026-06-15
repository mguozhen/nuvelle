import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

describe("CPS portal", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it("joins and displays the material square", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByPlaceholderText("your@email.com"), "creator@example.com");
    await user.click(screen.getByRole("button", { name: /join free/i }));
    expect(screen.getByText("Material Square")).toBeInTheDocument();
    expect(screen.getByText(/^NB/)).toBeInTheDocument();
  });

  it("adds grabbed links to My Links", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByPlaceholderText("your@email.com"), "creator@example.com");
    await user.click(screen.getByRole("button", { name: /join free/i }));
    await user.click(screen.getAllByRole("button", { name: /grab link/i })[0]);
    await user.click(screen.getByRole("button", { name: /my links/i }));
    expect(screen.getByText(/nuvelle.ai\/d\//)).toBeInTheDocument();
  });
});
