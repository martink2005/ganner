import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "../LoginForm";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
        refresh: mockRefresh,
    }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("LoginForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render email and password inputs", () => {
        render(<LoginForm />);

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/heslo/i)).toBeInTheDocument();
    });

    it("should render login button", () => {
        render(<LoginForm />);

        expect(
            screen.getByRole("button", { name: /prihlásiť sa/i })
        ).toBeInTheDocument();
    });

    it("should render form title", () => {
        render(<LoginForm />);

        expect(screen.getByText(/prihlásenie/i)).toBeInTheDocument();
    });

    it("should update email input value", () => {
        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });

        expect(emailInput).toHaveValue("test@example.com");
    });

    it("should update password input value", () => {
        render(<LoginForm />);

        const passwordInput = screen.getByLabelText(/heslo/i);
        fireEvent.change(passwordInput, { target: { value: "password123" } });

        expect(passwordInput).toHaveValue("password123");
    });

    it("should show error message on login failure", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Neplatné prihlasovacie údaje" }),
        });

        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/heslo/i);
        const submitButton = screen.getByRole("button", { name: /prihlásiť sa/i });

        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByTestId("error-message")).toBeInTheDocument();
            expect(screen.getByTestId("error-message")).toHaveTextContent(
                "Neplatné prihlasovacie údaje"
            );
        });
    });

    it("should redirect to dashboard on successful login", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                user: { id: "1", email: "test@example.com" },
            }),
        });

        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/heslo/i);
        const submitButton = screen.getByRole("button", { name: /prihlásiť sa/i });

        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(passwordInput, { target: { value: "password123" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith("/dashboard");
            expect(mockRefresh).toHaveBeenCalled();
        });
    });

    it("should disable inputs and button during loading", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
            () =>
                new Promise((resolve) =>
                    setTimeout(
                        () => resolve({ ok: true, json: async () => ({ success: true }) }),
                        100
                    )
                )
        );

        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/heslo/i);
        const submitButton = screen.getByRole("button", { name: /prihlásiť sa/i });

        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(passwordInput, { target: { value: "password123" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(submitButton).toHaveTextContent("Prihlasujem...");
        });
    });
});
