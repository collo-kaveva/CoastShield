import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Providers, makeClient } from "@/app/App";
import { AppRoutes } from "@/routes/AppRoutes";
import { mockApi as api } from "@/services/mock/mockApi";
import { resetState } from "@/services/mock/db";

function renderAt(path: string) {
  return render(<Providers client={makeClient()}><MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter></Providers>);
}
const h1 = async (text: RegExp) => expect(await screen.findByRole("heading", { level: 1, name: text })).toBeTruthy();
const signIn = () => api.auth.login("fatuma@example.com", "demo-password");

beforeEach(() => { resetState(); });

describe("public routes load", () => {
  it.each([
    ["/", /Grow Your Business/],
    ["/login", /Sign in/],
    ["/register", /Create your free account/],
    ["/forgot-password", /Reset your password/],
    ["/discover", /Browse local businesses/],
    ["/store/bandari-fresh-fish", /Bandari Fresh Fish/],
    ["/about", /About CoastShield/],
    ["/privacy", /Privacy notice/],
    ["/contact", /Contact/],
    ["/nope", /Page not found/],
  ])("%s", async (path, heading) => { renderAt(path); await h1(heading); });

  it("shows a friendly state for an unknown or unpublished storefront", async () => {
    renderAt("/store/does-not-exist");
    await h1(/Storefront not available/);
  });
});

describe("authenticated routes", () => {
  it("redirects anonymous visitors to sign in", async () => {
    renderAt("/dashboard");
    await h1(/Sign in/);
  });
  it.each([
    ["/dashboard", /Habari/],
    ["/business", /My storefront/],
    ["/business/catalog", /Products & services/],
    ["/orders", /Orders & enquiries/],
    ["/orders/o_1", /Request/],
    ["/security", /Security centre/],
    ["/security/checklist", /Security checklist/],
    ["/security/incidents", /What to do if something goes wrong/],
    ["/settings", /Account settings/],
  ])("%s", async (path, heading) => { await signIn(); renderAt(path); await h1(heading); });

  it("sends owners without a business to onboarding", async () => {
    await api.auth.register({ name: "New Owner", email: "new@example.com", password: "password123" });
    renderAt("/dashboard");
    await h1(/Tell us about your business/);
  });
});

describe("customer flow", () => {
  it("lets a customer add items and submit an order request, receiving a reference", async () => {
    renderAt("/store/mama-fatuma-fresh-catch");
    await screen.findByRole("heading", { level: 1 });
    fireEvent.click(await screen.findByRole("button", { name: /Add Fresh tilapia/ }));
    fireEvent.click(screen.getByRole("button", { name: /Send order request/ }));
    const dialog = await screen.findByRole("dialog", { hidden: true });
    fireEvent.change(within(dialog).getByLabelText("Your name"), { target: { value: "Test Customer" } });
    fireEvent.change(within(dialog).getByLabelText(/Phone number or email/), { target: { value: "0700 123 456" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send request" }));
    const ref = await screen.findByTestId("order-reference");
    expect(ref.textContent).toMatch(/^CS-[A-Z0-9]{6}$/);
  });

  it("shows validation errors instead of submitting an incomplete request", async () => {
    renderAt("/store/mama-fatuma-fresh-catch");
    fireEvent.click(await screen.findByRole("button", { name: /Send an enquiry/ }));
    const dialog = await screen.findByRole("dialog", { hidden: true });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send enquiry" }));
    expect(await within(dialog).findByText("Enter your name.")).toBeTruthy();
    expect(screen.queryByTestId("order-reference")).toBeNull();
  });
});

describe("owner flows", () => {
  it("lets the owner accept a new request and shows only valid next actions", async () => {
    await signIn();
    renderAt("/orders/o_1");
    await h1(/Request/);
    expect(screen.queryByRole("button", { name: "Mark completed" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Accept request" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Mark as ready" })).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Accept request" })).toBeNull();
  });

  it("runs the security assistant on a sample message and shows indicators, not just a label", async () => {
    await signIn();
    renderAt("/security");
    await h1(/Security centre/);
    fireEvent.click(screen.getByRole("button", { name: /Account suspension link/ }));
    fireEvent.click(screen.getByRole("button", { name: /Analyze message/ }));
    expect(await screen.findByText(/Warning signs found/)).toBeTruthy();
    expect(screen.getByText(/not confirmed findings/i)).toBeTruthy();
    expect(screen.getAllByText("Automated indicator").length).toBeGreaterThan(1);
    expect(screen.getByText(/preliminary/i)).toBeTruthy();
  });

  it("persists a checklist tick for the signed-in user", async () => {
    await signIn();
    renderAt("/security/checklist");
    await h1(/Security checklist/);
    const box = (await screen.findByLabelText(/Turn on two-step verification/)) as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    await waitFor(async () => expect((await api.security.checklist()).find((c) => c.key === "mfa-on")?.done).toBe(true));
  });

  it("completes onboarding, publishes and lands on the dashboard", async () => {
    await api.auth.register({ name: "New Owner", email: "new@example.com", password: "password123" });
    renderAt("/onboarding");
    fireEvent.change(await screen.findByLabelText("Business name"), { target: { value: "Test Fish Stall" } });
    fireEvent.click(screen.getByRole("radio", { name: /Fish & seafood/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.change(await screen.findByLabelText("Town or area"), { target: { value: "Nyali" } });
    fireEvent.change(screen.getByLabelText("Short description"), { target: { value: "Fresh fish every morning." } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.change(await screen.findByLabelText("Phone"), { target: { value: "0700 555 666" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Tilapia" } });
    fireEvent.change(screen.getByLabelText(/Price/), { target: { value: "400" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await h1(/Preview your storefront/);
    fireEvent.click(screen.getByRole("button", { name: /Publish storefront/ }));
    await h1(/Habari/);
    const b = await api.business.get();
    expect(b?.status).toBe("PUBLISHED");
    expect((await api.catalog.list()).map((i) => i.name)).toContain("Tilapia");
  });

  it("blocks onboarding progress until required fields are valid", async () => {
    await api.auth.register({ name: "New Owner", email: "new@example.com", password: "password123" });
    renderAt("/onboarding");
    fireEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(await screen.findByText("Enter your business name.")).toBeTruthy();
    await h1(/Tell us about your business/);
  });
});
