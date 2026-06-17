import { beforeEach, describe, expect, it } from "vitest";
import { clearAuthState, loadAuthState, saveAuthState } from "../lib/auth";

describe("admin auth storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and clears the current admin token and user", () => {
    expect(loadAuthState()).toEqual({ token: "", user: null });

    saveAuthState({
      token: "token-1",
      user: { id: 1, email: "promoter@example.com", role: "promoter", status: "active" }
    });

    expect(loadAuthState()).toEqual({
      token: "token-1",
      user: { id: 1, email: "promoter@example.com", role: "promoter", status: "active" }
    });

    clearAuthState();

    expect(loadAuthState()).toEqual({ token: "", user: null });
  });
});
