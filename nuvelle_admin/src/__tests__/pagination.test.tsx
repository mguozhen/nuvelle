import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "@/components/ui/pagination";

describe("pagination", () => {
  it("renders a semantic shadcn-style pagination wrapper", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Pagination
        firstLabel="First page"
        lastLabel="Last page"
        nextLabel="Next page"
        page={2}
        pageLabel="Page 2 of 3"
        pageSize={10}
        previousLabel="Previous page"
        summaryLabel="11-20 of 30 dramas"
        total={30}
        onPageChange={onPageChange}
      />
    );

    const navigation = screen.getByRole("navigation", { name: /pagination/i });
    expect(within(navigation).getByRole("list")).toBeInTheDocument();
    expect(within(navigation).getByText("Page 2 of 3")).toHaveAttribute("aria-current", "page");

    await user.click(within(navigation).getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
