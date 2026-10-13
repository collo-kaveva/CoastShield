import { describe, expect, it } from "vitest";
import { analyzeMessage, analyzeUrl, classify, extractUrls, validateMessage, MAX_MESSAGE_LENGTH } from "./analyzer";
import { SAMPLE_MESSAGES } from "./samples";

const sample = (id: string) => SAMPLE_MESSAGES.find((s) => s.id === id)!.text;
const ids = (r: { indicators: { id: string }[] }) => r.indicators.map((i) => i.id);

describe("message analysis: representative positives", () => {
  it("flags a fake 'sent by mistake' payment as HIGH with explanations", () => {
    const r = analyzeMessage(sample("fake-reversal"));
    expect(r.risk).toBe("HIGH");
    expect(ids(r)).toEqual(expect.arrayContaining(["mistaken_transfer", "urgency", "money_request"]));
    r.indicators.forEach((i) => expect(i.explanation.length).toBeGreaterThan(10));
    expect(r.recommendations.length).toBeGreaterThan(2);
    expect(r.disclaimer).toMatch(/preliminary/i);
  });
  it("flags an account-suspension link as HIGH", () => {
    const r = analyzeMessage(sample("account-link"));
    expect(r.risk).toBe("HIGH");
    expect(ids(r)).toEqual(expect.arrayContaining(["urgency", "account_problem", "link_warnings"]));
    expect(r.urlsFound).toHaveLength(1);
  });
  it("flags remote-access + PIN request as HIGH", () => {
    const r = analyzeMessage(sample("remote-access"));
    expect(r.risk).toBe("HIGH");
    expect(ids(r)).toEqual(expect.arrayContaining(["remote_access", "credentials"]));
  });
  it("flags a prize-with-fee message as CAUTION, not HIGH", () => {
    expect(analyzeMessage(sample("prize")).risk).toBe("CAUTION");
  });
});

describe("message analysis: negatives and false positives", () => {
  it("treats an ordinary message as LOW with no indicators", () => {
    const r = analyzeMessage(sample("ordinary"));
    expect(r.risk).toBe("LOW");
    expect(r.indicators).toHaveLength(0);
  });
  it("does not flag a safety reminder that says never share your PIN", () => {
    const r = analyzeMessage(sample("safety-tip"));
    expect(r.risk).toBe("LOW");
    expect(ids(r)).not.toContain("credentials");
  });
  it("stays LOW for a payment confirmation but warns that texts can be forged", () => {
    const r = analyzeMessage(sample("customer-claim"));
    expect(r.risk).toBe("LOW");
    expect(ids(r)).toContain("payment_confirmation");
    expect(r.summary).toMatch(/does not make a message safe|worth checking/i);
  });
  it("never reaches HIGH from a single indicator", () => {
    expect(analyzeMessage("Please confirm your PIN").risk).not.toBe("HIGH");
    expect(classify([{ id: "x", label: "x", severity: "high", explanation: "x" }])).toBe("CAUTION");
  });
  it("does not treat an email address domain as a link", () => {
    expect(extractUrls("write to fatuma@gmail.com today")).toEqual([]);
  });
});

describe("message analysis: malformed and hostile input", () => {
  it("validates empty, whitespace and oversized input", () => {
    expect(validateMessage("")).toBeTruthy();
    expect(validateMessage("   \n ")).toBeTruthy();
    expect(validateMessage("a".repeat(MAX_MESSAGE_LENGTH + 1))).toBeTruthy();
    expect(validateMessage(undefined)).toBeTruthy();
    expect(validateMessage("hello")).toBeNull();
  });
  it("handles HTML, unicode and very long single tokens without throwing", () => {
    expect(() => analyzeMessage("<script>alert(1)</script> 😀 مرحبا ".repeat(40))).not.toThrow();
    expect(() => analyzeMessage("a".repeat(MAX_MESSAGE_LENGTH))).not.toThrow();
    expect(() => analyzeMessage("pin ".repeat(500))).not.toThrow();
  });
  it("returns plain data only (no HTML interpretation of input)", () => {
    const r = analyzeMessage("Send your PIN <img src=x onerror=alert(1)> now");
    expect(typeof r.summary).toBe("string");
  });
});

describe("URL analysis", () => {
  it("flags an IP-address destination", () => expect(ids(analyzeUrl("http://192.168.0.15/pay"))).toContain("ip_host"));
  it("flags a brand name on an unrelated domain", () => {
    const r = analyzeUrl("http://safaricom-verify-account.xyz/login");
    expect(ids(r)).toContain("brand_lookalike");
    expect(r.risk).toBe("HIGH");
  });
  it("does not flag the genuine Safaricom domain as an imitation", () => {
    const r = analyzeUrl("https://www.safaricom.co.ke");
    expect(ids(r)).not.toContain("brand_lookalike");
    expect(r.risk).toBe("LOW");
    expect(r.summary).toMatch(/not guarantee/i);
  });
  it("catches brand names placed in a subdomain of another site", () => {
    expect(ids(analyzeUrl("https://safaricom.co.ke.evil-site.top/login"))).toContain("brand_lookalike");
  });
  it("flags shorteners", () => expect(ids(analyzeUrl("https://bit.ly/3abcXYZ"))).toContain("shortener"));
  it("flags userinfo tricks", () => expect(ids(analyzeUrl("https://safaricom.co.ke@evil.example.com/"))).toContain("userinfo"));
  it("flags look-alike (punycode) hostnames", () => expect(ids(analyzeUrl("https://xn--sfaricom-q4a.com"))).toContain("punycode"));
  it("rejects unsafe schemes", () => {
    for (const u of ["javascript:alert(1)", "data:text/html,<b>x</b>", "file:///etc/passwd", "ftp://example.com"]) {
      const r = analyzeUrl(u);
      expect(r.valid).toBe(false);
      expect(ids(r)).toContain("unsafe_scheme");
    }
  });
  it("handles malformed input safely", () => {
    for (const u of ["", "   ", "http://", "not a url", "http://exa mple.com", "https://", "a".repeat(5000), "<script>"]) {
      const r = analyzeUrl(u);
      expect(r.valid).toBe(false);
      expect(r.indicators.length).toBeGreaterThan(0);
    }
  });
  it("never claims a clean result is guaranteed safe", () => {
    expect(analyzeUrl("https://example.com").disclaimer).toMatch(/preliminary/i);
  });
});
