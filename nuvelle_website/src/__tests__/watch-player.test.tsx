import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { WatchDramaPlayer } from "../components/watch-drama-player";

const drama = {
  id: 42,
  title: "Playable Drama",
  platform: "ReelShort",
  genre: "Romance",
  cover_image_url: "https://cdn.nuvelle.ai/cover.jpg",
  video_url: "https://cdn.nuvelle.ai/videos/reelshort/42/episodes/0001.mp4",
  source_url: "https://reelslink.com/cps/example",
  episode_count: 2,
  synopsis_or_hook: "A stable playback test.",
  signal: null,
  rs_book_id: "book-42",
  created_at: "2026-06-23T00:00:00Z",
  updated_at: "2026-06-23T00:00:00Z",
  language: "English",
  episodes: [
    {
      id: 1,
      episode_no: 1,
      play_url: "https://cdn.nuvelle.ai/videos/reelshort/42/episodes/0001.mp4",
      poster_url: null,
      video_transfer_status: "transferred"
    },
    {
      id: 2,
      episode_no: 2,
      play_url: "https://cdn.nuvelle.ai/videos/reelshort/42/episodes/0002.mp4",
      poster_url: null,
      video_transfer_status: "transferred"
    }
  ]
};

describe("watch drama player", () => {
  it("plays the first episode and switches between transferred episodes", async () => {
    const user = userEvent.setup();
    render(<WatchDramaPlayer drama={drama} locale="en" />);

    const video = screen.getByLabelText("Playable Drama episode 1");
    expect(video).toHaveAttribute("src", "https://cdn.nuvelle.ai/videos/reelshort/42/episodes/0001.mp4");

    await user.click(screen.getByRole("button", { name: "EP 2" }));

    expect(screen.getByLabelText("Playable Drama episode 2")).toHaveAttribute(
      "src",
      "https://cdn.nuvelle.ai/videos/reelshort/42/episodes/0002.mp4"
    );
  });
});
