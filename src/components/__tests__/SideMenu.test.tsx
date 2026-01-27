import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SideMenu } from "../SideMenu";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
    usePathname: () => "/dashboard",
    useRouter: () => ({
        push: mockPush,
        refresh: mockRefresh,
    }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("SideMenu", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render the app title", () => {
        render(<SideMenu />);

        expect(screen.getByText(/gannomat protec/i)).toBeInTheDocument();
    });

    it("should render Katalóg link", () => {
        render(<SideMenu />);

        const katalogLink = screen.getByRole("link", { name: /katalóg/i });
        expect(katalogLink).toBeInTheDocument();
        expect(katalogLink).toHaveAttribute("href", "/dashboard/katalog");
    });

    it("should render Zákazky link", () => {
        render(<SideMenu />);

        const zakazkyLink = screen.getByRole("link", { name: /zákazky/i });
        expect(zakazkyLink).toBeInTheDocument();
        expect(zakazkyLink).toHaveAttribute("href", "/dashboard/zakazky");
    });

    it("should render logout button", () => {
        render(<SideMenu />);

        expect(
            screen.getByRole("button", { name: /odhlásiť sa/i })
        ).toBeInTheDocument();
    });

    it("should call logout API and redirect on logout click", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        render(<SideMenu />);

        const logoutButton = screen.getByRole("button", { name: /odhlásiť sa/i });
        fireEvent.click(logoutButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", {
                method: "POST",
            });
            expect(mockPush).toHaveBeenCalledWith("/login");
            expect(mockRefresh).toHaveBeenCalled();
        });
    });

    it("should have proper navigation structure", () => {
        render(<SideMenu />);

        const nav = screen.getByRole("navigation");
        expect(nav).toBeInTheDocument();
    });
});
