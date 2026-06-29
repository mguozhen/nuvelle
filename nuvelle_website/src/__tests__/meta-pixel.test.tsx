import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MetaPixelNoScript, MetaPixelScript } from "../components/meta-pixel";
import {
  configuredMetaPixelId,
  trackMetaPixelEvent
} from "../lib/tracking/meta-pixel";

describe("meta pixel tracking", () => {
  afterEach(() => {
    delete window.fbq;
    vi.unstubAllEnvs();
  });

  it("reads the public pixel id from the environment", () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", " 123456789 ");

    expect(configuredMetaPixelId()).toBe("123456789");
  });

  it("renders the base pixel script and noscript fallback when configured", () => {
    render(<MetaPixelScript pixelId="123456789" />);

    expect(document.querySelector("script")?.textContent).toContain("connect.facebook.net/en_US/fbevents.js");
    expect(document.querySelector("script")?.textContent).toContain("123456789");
    expect(renderToStaticMarkup(<MetaPixelNoScript pixelId="123456789" />)).toContain(
      "https://www.facebook.com/tr?id=123456789&amp;ev=PageView&amp;noscript=1"
    );
  });

  it("does not render pixel markup when no id is configured", () => {
    const { container } = render(
      <>
        <MetaPixelScript pixelId="" />
        <MetaPixelNoScript pixelId="" />
      </>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("tracks browser events through fbq and removes empty payload fields", () => {
    const fbq = vi.fn();
    window.fbq = fbq;

    trackMetaPixelEvent("Lead", {
      content_name: "Nuvelle app",
      source: "header_get_app",
      empty: "",
      missing: null
    });

    expect(fbq).toHaveBeenCalledWith("track", "Lead", {
      content_name: "Nuvelle app",
      source: "header_get_app"
    });
  });
});
