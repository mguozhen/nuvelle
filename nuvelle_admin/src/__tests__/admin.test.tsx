import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

describe("admin app", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/seed_dramas.json")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  id: 1,
                  title: "Demo Drama",
                  platform: "ReelShort",
                  genre: "Hidden Identity",
                  video_url: "https://cdn.example/video.m3u8",
                  signal: "revenue $1,000,000 | 12,000 promoters"
                }
              ])
            )
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ rated: [] })));
      })
    );
  });

  it("logs in with the existing local credentials and loads data", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByPlaceholderText("username"), "admin");
    await user.type(screen.getByPlaceholderText("password"), "admin");
    await user.click(screen.getByRole("button", { name: /login/i }));
    await waitFor(() => expect(screen.getByText("Demo Drama")).toBeInTheDocument());
    expect(screen.getByText(/Nuvelle Score/i)).toBeInTheDocument();
  });

  it("opens backend URL settings", async () => {
    const user = userEvent.setup();
    localStorage.setItem("nuvelle_admin_state", JSON.stringify({ loggedIn: true, votes: {}, generated: [] }));
    render(<App />);
    await user.click(screen.getByRole("button", { name: /backend/i }));
    expect(screen.getByDisplayValue("http://localhost:8000/api/v1")).toBeInTheDocument();
  });
});
