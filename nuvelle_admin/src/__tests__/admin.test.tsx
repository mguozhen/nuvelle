import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

const drama = {
  id: 1,
  title: "Demo Drama",
  platform: "ReelShort",
  genre: "Hidden Identity",
  language: "English",
  tags: ["Female", "Revenge"],
  show_tags: ["Female", "Billionaire"],
  cover_image_url: "https://example.com/cover.jpg",
  synopsis_or_hook: "A secret billionaire revenge story",
  episode_count: 2,
  recent_revenue: 2000,
  promoters_cnt: 1000,
  has_video: true,
  seen: false,
  generated_count: 0,
  episodes: [
    {
      id: 10,
      episode_no: 1,
      play_url: "https://cdn.example/ep1.mp4",
      poster_url: "https://example.com/poster.jpg",
      iframe_src: "https://www.reelshort.com/en/embed/demo-ep1"
    },
    {
      id: 11,
      episode_no: 2,
      play_url: "https://cdn.example/ep2.mp4",
      poster_url: "https://example.com/poster-2.jpg",
      iframe_src: "https://www.reelshort.com/en/embed/demo-ep2"
    },
    {
      id: 12,
      episode_no: 3,
      play_url: "https://cdn.example/ep3.mp4",
      poster_url: "https://example.com/poster-3.jpg",
      iframe_src: "https://www.reelshort.com/en/embed/demo-ep3"
    }
  ]
};
const dramaSummary = { ...drama, episodes: undefined, episode_list: undefined };
const webeyeDrama = {
  ...drama,
  id: 2,
  title: "Webeye Demo",
  platform: "Webeye",
  video_url: null,
  episodes: [
    {
      id: 20,
      episode_no: 1,
      play_url: null,
      poster_url: "https://example.com/webeye-poster.jpg",
      iframe_src: null,
      has_video: true
    }
  ]
};
const webeyeDramaSummary = { ...webeyeDrama, episodes: undefined, episode_list: undefined };

function json(data: unknown, init?: ResponseInit) {
  return Promise.resolve(new Response(JSON.stringify(data), init));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function pagedDramas(offset: number, length: number) {
  return Array.from({ length }).map((_, index) => ({
    ...dramaSummary,
    id: offset + index + 1,
    title: offset === 0 && index === 0 ? "Demo Drama" : `Demo Drama ${offset + index + 1}`
  }));
}

function installFetchMock(options: { boardResponse?: (url: string) => Promise<Response>; detailResponse?: () => Promise<Response>; filterOptionsResponse?: () => Promise<Response>; generatedResponse?: () => Promise<Response> } = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/register")) {
      return json({ access_token: "token-1", user: { id: 1, email: "promoter@example.com", role: "promoter", status: "active" } });
    }
    if (url.endsWith("/auth/login")) {
      return json({ access_token: "token-1", user: { id: 1, email: "promoter@example.com", role: "promoter", status: "active" } });
    }
    if (url.endsWith("/admin/dramas/filters")) {
      return options.filterOptionsResponse?.() ?? json({
        platforms: ["ReelShort", "DramaBox"],
        languages: ["English", "Spanish"],
        tags: ["Female", "Fantasy"]
      });
    }
    if (url.includes("/admin/dramas?")) {
      return options.boardResponse?.(url) ?? json({ items: [dramaSummary], total: 1 });
    }
    if (url.match(/\/admin\/dramas\/\d+$/)) {
      return options.detailResponse?.() ?? json(drama);
    }
    const episodeDownloadUrlMatch = url.match(/\/admin\/dramas\/1\/episodes\/(\d+)\/download-url$/);
    if (episodeDownloadUrlMatch) {
      return json({ url: `https://storage.example/signed-episode-${episodeDownloadUrlMatch[1]}` });
    }
    const episodePlayUrlMatch = url.match(/\/admin\/dramas\/\d+\/episodes\/(\d+)\/play-url$/);
    if (episodePlayUrlMatch) {
      return json({ url: `https://storage.example/signed-play-${episodePlayUrlMatch[1]}.mp4` });
    }
    const generatedDownloadUrlMatch = url.match(/\/promo\/jobs\/([^/]+)\/files\/teaser\.mp4\/download-url$/);
    if (generatedDownloadUrlMatch) {
      return json({ url: `https://storage.example/${generatedDownloadUrlMatch[1]}-teaser.mp4` });
    }
    if (url.endsWith("/admin/swipe/next")) {
      return json(dramaSummary);
    }
    if (url.endsWith("/admin/drama-events")) {
      return json({ ok: true, event_id: 11 });
    }
    if (url.includes("/admin/generated")) {
      return options.generatedResponse?.() ?? json({
        items: [
          {
            id: "job-1",
            job_id: "job-1",
            status: "queued",
            progress: 5,
            title: "Demo Drama",
            episode: 1,
            duration: 20,
            source_url: "https://cdn.example/ep1.mp4",
            prompt: "high tension",
            files: null,
            drama: { id: 1, title: "Demo Drama" },
            episode_ref: { id: 10, episode_no: 1 },
            created_at: "2026-06-18T00:00:00Z"
          }
        ],
        total: 1
      });
    }
    if (url.endsWith("/promo/jobs")) {
      return json({ id: "job-2", job_id: "job-2", status: "queued" });
    }
    if (url.endsWith("/promo/batches")) {
      return json({ batch_id: "batch-1" });
    }
    return json({}, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function registerAndLoad(user = userEvent.setup(), expectedTitle = "Demo Drama") {
  await user.click(screen.getByRole("button", { name: /create account/i }));
  await user.type(screen.getByPlaceholderText(/invite code/i), "JOIN");
  await user.type(screen.getByPlaceholderText(/email/i), "promoter@example.com");
  await user.type(screen.getByPlaceholderText(/password/i), "secret123");
  await user.click(screen.getByRole("button", { name: /register/i }));
  await waitFor(() => expect(screen.getByText(expectedTitle)).toBeInTheDocument());
  return user;
}

describe("admin app", () => {
  beforeEach(() => {
    expect(typeof window.localStorage.clear).toBe("function");
    window.history.replaceState(null, "", "/board");
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults root visits to the swipe route", async () => {
    localStorage.setItem(
      "nuvelle_admin_auth",
      JSON.stringify({ token: "token-1", user: { id: 1, email: "promoter@example.com", role: "promoter", status: "active" } })
    );
    window.history.replaceState(null, "", "/");
    installFetchMock();
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe("/swipe"));
    expect(await screen.findByLabelText("Demo Drama video")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /swipe/i })).toHaveAttribute("aria-current", "page");
  });

  it("registers with invite code and loads board from admin API", async () => {
    const fetchMock = installFetchMock();
    render(<App />);

    await registerAndLoad();

    expect(screen.getByText(/ReelShort/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/admin/dramas?language=English&has_video=true&limit=50&offset=0",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("seed_dramas"))).toBe(false);
    expect(screen.queryByText(/\d+\s+eps/i)).not.toBeInTheDocument();
  });

  it("loads board filters from the admin API", async () => {
    const fetchMock = installFetchMock();
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user);

    await user.type(screen.getByPlaceholderText(/search title or hook/i), "revenge");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/dramas?q=revenge&language=English&has_video=true&limit=50&offset=0",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
      )
    );

    await user.click(screen.getByRole("button", { name: /top picks/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/dramas?q=revenge&language=English&min_score=70&limit=50&offset=0",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
      )
    );
  });

  it("uses backend-provided board filter options instead of current page values", async () => {
    const fetchMock = installFetchMock({
      boardResponse: () => json({ items: [dramaSummary], total: 1 })
    });
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/dramas/filters",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
      )
    );

    await user.click(screen.getByRole("combobox", { name: /all languages/i }));

    expect(await screen.findByRole("option", { name: "Spanish" })).toBeInTheDocument();
  });

  it("searches and virtualizes backend-provided tag filter options", async () => {
    const tags = Array.from({ length: 80 }, (_, index) => `Tag ${String(index + 1).padStart(2, "0")}`);
    const fetchMock = installFetchMock({
      filterOptionsResponse: () => json({ platforms: ["ReelShort"], languages: ["English"], tags }),
      boardResponse: () => json({ items: [dramaSummary], total: 1 })
    });
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("combobox", { name: /all tags/i }));

    const tagSearch = await screen.findByRole("searchbox", { name: /search tags/i });
    expect(screen.getByRole("option", { name: "Tag 01" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Tag 80" })).not.toBeInTheDocument();

    await user.type(tagSearch, "Tag 80");

    const distantTag = await screen.findByRole("option", { name: "Tag 80" });
    expect(screen.queryByRole("option", { name: "Tag 01" })).not.toBeInTheDocument();

    await user.click(distantTag);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/dramas?language=English&tag=Tag+80&has_video=true&limit=50&offset=0",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
      )
    );
  });

  it("paginates board queries through the admin API and resets page on filters", async () => {
    const fetchMock = installFetchMock({
      boardResponse: (url) => {
        if (url.includes("q=rose")) {
          return json({ items: [{ ...dramaSummary, title: "Rose Drama" }], total: 1 });
        }

        if (url.includes("offset=50")) {
          return json({ items: [{ ...dramaSummary, id: 51, title: "Second Page Drama" }, ...pagedDramas(51, 24)], total: 75 });
        }

        return json({ items: pagedDramas(0, 50), total: 75 });
      }
    });
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user);

    expect(await screen.findByText("1-50 of 75 dramas")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next page/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/dramas?language=English&has_video=true&limit=50&offset=50",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
      )
    );
    expect(await screen.findByText("Second Page Drama")).toBeInTheDocument();
    expect(screen.getByText("51-75 of 75 dramas")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/search title or hook/i), "rose");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/dramas?q=rose&language=English&has_video=true&limit=50&offset=0",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
      )
    );
    expect(await screen.findByText("Rose Drama")).toBeInTheDocument();
  });

  it("shows board skeletons while admin dramas are loading", async () => {
    const boardResponse = deferred<Response>();
    const user = userEvent.setup();
    installFetchMock({ boardResponse: () => boardResponse.promise });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /create account/i }));
    await user.type(screen.getByPlaceholderText(/invite code/i), "JOIN");
    await user.type(screen.getByPlaceholderText(/email/i), "promoter@example.com");
    await user.type(screen.getByPlaceholderText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => expect(screen.getAllByTestId("board-skeleton-card").length).toBeGreaterThan(0));
    expect(screen.queryByText("No dramas match this filter.")).not.toBeInTheDocument();

    await act(async () => {
      boardResponse.resolve(new Response(JSON.stringify({ items: [dramaSummary], total: 1 })));
    });

    await waitFor(() => expect(screen.getByText("Demo Drama")).toBeInTheDocument());
  });

  it("switches the admin interface to Simplified Chinese", async () => {
    const user = userEvent.setup();
    installFetchMock();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "简体中文" }));
    expect(screen.getByText("AI 短剧遴选后台 - 内部")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "创建账号" }));
    await user.type(screen.getByPlaceholderText("邀请码"), "JOIN");
    await user.type(screen.getByPlaceholderText("邮箱"), "promoter@example.com");
    await user.type(screen.getByPlaceholderText("密码"), "secret123");
    await user.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => expect(screen.getByText("Demo Drama")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /素材库/ })).toBeInTheDocument();
    expect(screen.getByText("全部视频")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索标题或钩子")).toBeInTheDocument();
    expect(screen.getByLabelText("时长")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /生成资源/ }));
    expect(await screen.findByText("生成资源库")).toBeInTheDocument();
  });

  it("keeps each admin tab on its own route across refreshes", async () => {
    localStorage.setItem(
      "nuvelle_admin_auth",
      JSON.stringify({ token: "token-1", user: { id: 1, email: "promoter@example.com", role: "promoter", status: "active" } })
    );
    window.history.replaceState(null, "", "/generated");
    installFetchMock();
    render(<App />);

    expect(await screen.findByText("Generated library")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /generated/i })).toHaveAttribute("aria-current", "page");

    await userEvent.click(screen.getByRole("link", { name: /swipe/i }));

    expect(window.location.pathname).toBe("/swipe");
    expect(await screen.findByLabelText("Demo Drama video")).toBeInTheDocument();

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe("/generated"));
    expect(screen.getByRole("link", { name: /generated/i })).toHaveAttribute("aria-current", "page");
  });

  it("records swipe verdict through the admin event API", async () => {
    const fetchMock = installFetchMock();
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("link", { name: /swipe/i }));
    const actionButtons = within(screen.getByTestId("swipe-actions")).getAllByRole("button");
    expect(actionButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Featured",
      "Like",
      "Dislike",
      "Next"
    ]);
    await user.click(screen.getByRole("button", { name: /dislike/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/drama-events",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"event_type\":\"vote\"")
        })
      )
    );
  });

  it("plays the first episode in the swipe feed and marks swiped dramas as seen", async () => {
    const fetchMock = installFetchMock();
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("link", { name: /swipe/i }));

    const video = await screen.findByLabelText("Demo Drama video");
    await waitFor(() => expect((video as HTMLVideoElement).src).toBe("https://cdn.example/ep1.mp4"));
    expect((video as HTMLVideoElement).muted).toBe(false);

    fireEvent.wheel(screen.getByTestId("swipe-feed"), { deltaY: 180 });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/drama-events",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"event_type\":\"seen\"")
        })
      )
    );
  });

  it("does not fall back to the board cover while swipe detail is loading", async () => {
    const detailResponse = deferred<Response>();
    const user = userEvent.setup();
    installFetchMock({ detailResponse: () => detailResponse.promise });
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("link", { name: /swipe/i }));

    await waitFor(() => expect(screen.getByTestId("swipe-skeleton")).toBeInTheDocument());
    expect(screen.queryByAltText("Demo Drama")).not.toBeInTheDocument();

    await act(async () => {
      detailResponse.resolve(new Response(JSON.stringify(drama)));
    });

    const video = await screen.findByLabelText("Demo Drama video");
    await waitFor(() => expect((video as HTMLVideoElement).src).toBe("https://cdn.example/ep1.mp4"));
  });

  it("shows all detail tags and generates from the selected episode", async () => {
    const fetchMock = installFetchMock();
    const playMock = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("button", { name: /details/i }));
    expect(screen.getByText("Source tags")).toBeInTheDocument();
    expect(screen.getByText("Female")).toBeInTheDocument();
    expect(screen.getByText("Revenge")).toBeInTheDocument();
    expect(screen.getByText("Billionaire")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play ep 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play ep 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play ep 3/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^play$/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /play ep 2/i })).getByText("Not generated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download ep 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download ep 2/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download ep 1/i })).not.toBeInTheDocument();
    expect(screen.queryByText("https://cdn.example/ep1.mp4")).not.toBeInTheDocument();
    expect(screen.queryByText("https://cdn.example/ep2.mp4")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/paste an episode video url/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Generate$/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /play ep 2/i }));
    const video = screen.getByLabelText("Demo Drama video");
    await waitFor(() => expect((video as HTMLVideoElement).src).toBe("https://cdn.example/ep2.mp4"));
    await waitFor(() => expect(playMock).toHaveBeenCalled());
    await act(async () => {
      video.dispatchEvent(new Event("error", { bubbles: true }));
    });
    expect(await screen.findByTitle("Demo Drama embedded player")).toHaveAttribute(
      "src",
      "https://www.reelshort.com/en/embed/demo-ep2"
    );
    expect(screen.getByText("Direct video failed. Switched to the ReelShort player.")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/prompt for this promo/i), "high tension opener");
    await user.click(screen.getByRole("button", { name: /generate current episode/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/promo/jobs",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"episode_id\":11")
        })
      )
    );
    const promoCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/promo/jobs"));
    expect(JSON.parse(String(promoCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        drama_id: 1,
        episode_id: 11,
        prompt: "high tension opener",
        dur: 30,
        ep: 2,
        video_url: "https://cdn.example/ep2.mp4"
      })
    );
  });

  it("plays a Webeye GCS-backed episode by requesting a signed play URL", async () => {
    const fetchMock = installFetchMock({
      boardResponse: () => json({ items: [webeyeDramaSummary], total: 1 }),
      detailResponse: () => json(webeyeDrama)
    });
    const playMock = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user, "Webeye Demo");

    await user.click(screen.getByRole("button", { name: /details/i }));
    const playEpisode = await screen.findByRole("button", { name: /play ep 1/i });

    await user.click(playEpisode);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/dramas/2/episodes/20/play-url",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
      )
    );
    const video = await screen.findByLabelText("Webeye Demo video");
    await waitFor(() => expect((video as HTMLVideoElement).src).toBe("https://storage.example/signed-play-20.mp4"));
    await waitFor(() => expect(playMock).toHaveBeenCalled());
  });

  it("batch-generates Webeye GCS-backed episodes with signed play URLs", async () => {
    const fetchMock = installFetchMock({
      boardResponse: () => json({ items: [webeyeDramaSummary], total: 1 }),
      detailResponse: () => json(webeyeDrama)
    });
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user, "Webeye Demo");

    await user.click(screen.getByRole("button", { name: /details/i }));
    await user.click(await screen.findByRole("button", { name: /generate all available episodes/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/dramas/2/episodes/20/play-url",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
      )
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/promo/batches",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("https://storage.example/signed-play-20.mp4")
        })
      )
    );
    const batchCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/promo/batches"));
    expect(JSON.parse(String(batchCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        episodes: { "1": "https://storage.example/signed-play-20.mp4" },
        title: "Webeye Demo"
      })
    );
  });

  it("requests a signed episode download URL with bearer auth before starting the download", async () => {
    const fetchMock = installFetchMock();
    const clickMock = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("button", { name: /details/i }));
    const download = await screen.findByRole("button", { name: /download ep 1/i });

    expect(screen.queryByRole("link", { name: /download ep 1/i })).not.toBeInTheDocument();

    await user.click(download);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/admin/dramas/1/episodes/10/download-url",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
      )
    );
    expect(clickMock).toHaveBeenCalledTimes(1);
  });

  it("shows generated library from backend", async () => {
    const user = userEvent.setup();
    installFetchMock();
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("link", { name: /generated/i }));

    expect(await screen.findByText(/queued 5%/i)).toBeInTheDocument();
    const card = screen.getByTestId("generated-card");
    expect(card).toHaveClass("flex", "h-full", "flex-col");
    expect(within(card).getByRole("heading", { name: "Demo Drama" })).toHaveClass("line-clamp-1", "h-6");
    expect(screen.getByRole("progressbar", { name: /queued 5%/i })).toHaveAttribute("aria-valuenow", "5");
    expect(screen.getByDisplayValue("high tension")).toBeInTheDocument();
    const regenButton = screen.getByRole("button", { name: /regen/i });
    expect(regenButton.className).toContain("bg-[linear-gradient(135deg,#b25cff,#ff5fbf)]");
  });

  it("uses a portrait contain preview for generated vertical videos", async () => {
    const user = userEvent.setup();
    installFetchMock({
      generatedResponse: () =>
        json({
          items: [
            {
              id: "job-vertical",
              job_id: "job-vertical",
              status: "done",
              progress: 100,
              title: "Demo Drama",
              episode: 1,
              duration: 20,
              source_url: "https://cdn.example/ep1.mp4",
              prompt: "high tension",
              files: {
                teaser: "/promo/jobs/job-vertical/files/teaser.mp4",
                cover: "/promo/jobs/job-vertical/files/cover.jpg"
              },
              drama: { id: 1, title: "Demo Drama" },
              episode_ref: { id: 10, episode_no: 1 },
              created_at: "2026-06-18T00:00:00Z"
            }
          ],
          total: 1
        })
    });
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("link", { name: /generated/i }));

    const frame = await screen.findByTestId("generated-preview-frame");
    const video = screen.getByLabelText("Demo Drama generated video");
    expect(frame.firstElementChild).toHaveClass("aspect-[9/16]");
    expect(video).toHaveClass("object-contain");
    expect(video).toHaveAttribute("src", "http://localhost:8000/api/v1/promo/jobs/job-vertical/files/teaser.mp4");
    expect(screen.getByRole("button", { name: /teaser/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /teaser/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cover/i })).toHaveAttribute(
      "href",
      "http://localhost:8000/api/v1/promo/jobs/job-vertical/files/cover.jpg?download=1"
    );
  });

  it("requests a signed generated video download URL with bearer auth before starting the download", async () => {
    const fetchMock = installFetchMock({
      generatedResponse: () =>
        json({
          items: [
            {
              id: "job-vertical",
              job_id: "job-vertical",
              status: "done",
              progress: 100,
              title: "Demo Drama",
              episode: 1,
              duration: 20,
              source_url: "https://cdn.example/ep1.mp4",
              prompt: "high tension",
              files: {
                teaser: "/promo/jobs/job-vertical/files/teaser.mp4",
                cover: "/promo/jobs/job-vertical/files/cover.jpg"
              },
              drama: { id: 1, title: "Demo Drama" },
              episode_ref: { id: 10, episode_no: 1 },
              created_at: "2026-06-18T00:00:00Z"
            }
          ],
          total: 1
        })
    });
    const clickMock = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("link", { name: /generated/i }));
    const teaserDownload = await screen.findByRole("button", { name: /teaser/i });

    expect(screen.queryByRole("link", { name: /teaser/i })).not.toBeInTheDocument();

    await user.click(teaserDownload);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/promo/jobs/job-vertical/files/teaser.mp4/download-url",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-1" }) })
      )
    );
    expect(clickMock).toHaveBeenCalledTimes(1);
  });

  it("downloads generated videos through the API route even when preview URLs are absolute", async () => {
    const user = userEvent.setup();
    installFetchMock({
      generatedResponse: () =>
        json({
          items: [
            {
              id: "job-cdn",
              job_id: "job-cdn",
              status: "done",
              progress: 100,
              title: "Demo Drama",
              episode: 1,
              duration: 20,
              source_url: "https://cdn.example/ep1.mp4",
              prompt: "high tension",
              files: {
                teaser: "https://cdn.nuvelle.ai/promo/jobs/job-cdn/files/teaser.mp4",
                cover: "https://cdn.nuvelle.ai/promo/jobs/job-cdn/files/cover.jpg"
              },
              drama: { id: 1, title: "Demo Drama" },
              episode_ref: { id: 10, episode_no: 1 },
              created_at: "2026-06-18T00:00:00Z"
            }
          ],
          total: 1
        })
    });
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("link", { name: /generated/i }));

    const video = await screen.findByLabelText("Demo Drama generated video");
    expect(video).toHaveAttribute("src", "https://cdn.nuvelle.ai/promo/jobs/job-cdn/files/teaser.mp4");
    expect(screen.getByRole("button", { name: /teaser/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /teaser/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cover/i })).toHaveAttribute(
      "href",
      "http://localhost:8000/api/v1/promo/jobs/job-cdn/files/cover.jpg?download=1"
    );
  });

  it("keeps generation in the detail footer and disables generated episodes", async () => {
    const user = userEvent.setup();
    installFetchMock({
      boardResponse: () =>
        json({
          items: [{ ...dramaSummary, generated_count: 1, generation_status: "done", generation_progress: 100 }],
          total: 1
        }),
      detailResponse: () =>
        json({
          ...drama,
          generated_count: 1,
          generation_status: "done",
          generation_progress: 100,
          episode_list: drama.episodes.map((episode, index) => ({
            ...episode,
            generation_status: index === 0 ? "done" : null,
            generation_progress: index === 0 ? 100 : 0
          }))
        })
    });
    render(<App />);
    await registerAndLoad(user);

    expect(screen.queryByRole("button", { name: /generate promo/i })).not.toBeInTheDocument();
    expect(screen.getByText("Generated 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /details/i }));

    await waitFor(() => expect(screen.getByText("Source tags")).toBeInTheDocument());
    expect(screen.queryByPlaceholderText(/paste an episode video url/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Generate$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download ep 1/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download ep 1/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /play ep 1/i })).getByText(/Generated|Queued 5%/)).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /play ep 2/i })).getByText("Not generated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate all available episodes/i })).toBeInTheDocument();
    const disabledGeneratedButtons = screen.getAllByRole("button", { name: /Generated|Queued 5%/ }).filter((button) => button.hasAttribute("disabled"));
    expect(disabledGeneratedButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("opens backend URL settings after authentication", async () => {
    const user = userEvent.setup();
    installFetchMock();
    render(<App />);
    await registerAndLoad(user);

    await user.click(screen.getByRole("button", { name: /backend/i }));
    expect(screen.getByDisplayValue("http://localhost:8000/api/v1")).toBeInTheDocument();
  });
});
