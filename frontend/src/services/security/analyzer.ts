/**
 * Transparent, rule-based checks. This is a preliminary aid, NOT fraud detection.
 * Pure functions: no network access, nothing is fetched or stored.
 * Phase 3 re-implements the same rules in Python behind the same response shape.
 */
import type { AnalysisResult, Indicator, MessageAnalysis, RiskLevel, Severity, UrlAnalysis } from "@/types";

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_URL_LENGTH = 2048;
export const DISCLAIMER =
  "This is a preliminary, rule-based check. It can miss real scams and can flag genuine messages, so it is not proof either way. Never share PINs, passwords or one-time codes.";

const WEIGHT: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

/** HIGH needs several signals together; one indicator alone never reaches HIGH. */
export function classify(indicators: Indicator[]): RiskLevel {
  const score = indicators.reduce((s, i) => s + WEIGHT[i.severity], 0);
  if (score >= 5 && indicators.length >= 2) return "HIGH";
  if (score >= 2) return "CAUTION";
  return "LOW";
}

const maxSeverity = (list: Indicator[]): Severity =>
  list.some((i) => i.severity === "high") ? "high" : list.some((i) => i.severity === "medium") ? "medium" : "low";

const snippet = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 90 ? `${t.slice(0, 87)}…` : t;
};

export function validateMessage(text: unknown): string | null {
  if (typeof text !== "string" || text.trim().length === 0) return "Paste a message to check.";
  if (text.length > MAX_MESSAGE_LENGTH) return `Message is too long (maximum ${MAX_MESSAGE_LENGTH} characters).`;
  return null;
}

/* ------------------------------ URL analysis ------------------------------ */

const CC_SLD = new Set(["co", "com", "or", "go", "ac", "ne", "org", "net", "gov", "sc"]);
export function registrableDomain(host: string): string {
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const tld = labels[labels.length - 1];
  const sld = labels[labels.length - 2];
  return tld.length === 2 && CC_SLD.has(sld) ? labels.slice(-3).join(".") : labels.slice(-2).join(".");
}

const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc", "rebrand.ly"]);
const ODD_TLDS = new Set(["xyz", "top", "click", "icu", "tk", "gq", "cf", "ml", "ga", "zip", "mov", "buzz", "rest", "cam"]);

interface Brand { name: string; tokens: string[]; domains: string[] }
const BRANDS: Brand[] = [
  { name: "Safaricom / M-PESA", tokens: ["safaricom", "mpesa", "m-pesa"], domains: ["safaricom.co.ke", "safaricom.com", "m-pesa.com"] },
  { name: "Airtel", tokens: ["airtel"], domains: ["airtel.co.ke", "airtel.africa", "airtel.com"] },
  { name: "Equity Bank", tokens: ["equitybank", "equity"], domains: ["equitybank.co.ke", "equitygroupholdings.com"] },
  { name: "KCB", tokens: ["kcb"], domains: ["kcbgroup.com"] },
  { name: "Co-operative Bank", tokens: ["co-opbank", "coopbank"], domains: ["co-opbank.co.ke"] },
  { name: "NCBA", tokens: ["ncba"], domains: ["ncbagroup.com"] },
  { name: "KRA", tokens: ["kra"], domains: ["kra.go.ke"] },
  { name: "eCitizen / Huduma", tokens: ["ecitizen", "huduma"], domains: ["ecitizen.go.ke", "hudumakenya.go.ke"] },
  { name: "Jumia", tokens: ["jumia"], domains: ["jumia.co.ke", "jumia.com"] },
  { name: "PayPal", tokens: ["paypal"], domains: ["paypal.com"] },
  { name: "WhatsApp", tokens: ["whatsapp"], domains: ["whatsapp.com", "whatsapp.net"] },
  { name: "Facebook", tokens: ["facebook"], domains: ["facebook.com"] },
  { name: "Google", tokens: ["google"], domains: ["google.com"] },
];

const isLegit = (host: string, brand: Brand) => brand.domains.some((d) => host === d || host.endsWith(`.${d}`));
const hostHasToken = (host: string, token: string) =>
  token.length <= 3 ? host.split(/[.-]/).includes(token) : host.includes(token);

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const PRIVATE_IP = /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/;

const URL_RECS = [
  "Do not enter passwords, PINs or codes on a page you reached from a message.",
  "If you need the site, type the official address yourself or use the official app.",
];

function urlResult(indicators: Indicator[], extra: Omit<UrlAnalysis, keyof AnalysisResult>): UrlAnalysis {
  const risk = classify(indicators);
  const summary =
    risk === "HIGH" ? "Several warning signs were found in this address. Treat it as risky until you verify it another way."
    : risk === "CAUTION" ? "This address has some warning signs. That does not prove it is harmful, but do not trust it without checking."
    : "No obvious warning signs were found in the address itself. This does not guarantee the destination is safe.";
  const recommendations = [...URL_RECS];
  if (indicators.some((i) => i.id === "shortener")) recommendations.push("Shortened links hide where they lead. Ask the sender for the full address through another channel.");
  if (indicators.some((i) => i.id === "unsafe_scheme")) recommendations.push("Do not open this. Addresses that start this way can run code instead of showing a website.");
  return { risk, indicators, summary, recommendations, disclaimer: DISCLAIMER, ...extra };
}

export function analyzeUrl(input: string): UrlAnalysis {
  const invalid = (msg: string) =>
    urlResult([{ id: "invalid_url", label: "Not a valid web address", severity: "medium", explanation: msg }], { valid: false, normalizedUrl: null, hostname: null });

  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return invalid("Enter a web address to check.");
  if (raw.length > MAX_URL_LENGTH) return invalid(`The address is too long (maximum ${MAX_URL_LENGTH} characters).`);

  const indicators: Indicator[] = [];

  if (/^(javascript|data|vbscript|file|blob|intent):/i.test(raw)) {
    indicators.push({ id: "unsafe_scheme", label: "Unsafe or unusual address type", severity: "high", explanation: "This is not a normal website address. Some of these types can run code or open local files.", matched: raw.slice(0, 20) });
    return urlResult(indicators, { valid: false, normalizedUrl: null, hostname: null });
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  if (hasScheme && !/^https?:\/\//i.test(raw)) {
    indicators.push({ id: "unsafe_scheme", label: "Unusual address type", severity: "high", explanation: "Only http and https are normal for websites. Other types can open apps or files." });
    return urlResult(indicators, { valid: false, normalizedUrl: null, hostname: null });
  }

  if (/[\s<>"]/.test(raw)) return invalid("Web addresses do not contain spaces or special characters like < > or quotes.");

  let url: URL;
  try {
    url = new URL(hasScheme ? raw : `https://${raw}`);
  } catch {
    return invalid("This could not be read as a web address.");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || (!host.includes(".") && !host.startsWith("["))) return invalid("This address has no valid website name.");

  if (url.username || url.password)
    indicators.push({ id: "userinfo", label: "Text before an @ sign", severity: "high", explanation: "Anything before “@” in an address is ignored when visiting. Scammers use it to make a link look like a trusted site." });

  if (IPV4.test(host) || host.startsWith("[")) {
    indicators.push({ id: "ip_host", label: "Numbers instead of a website name", severity: "medium", explanation: PRIVATE_IP.test(host) ? "This points to a local or private network address, which is unusual for a public message." : "Legitimate businesses rarely send customers to a raw IP address." });
  } else {
    const reg = registrableDomain(host);
    for (const brand of BRANDS) {
      if (brand.tokens.some((t) => hostHasToken(host, t)) && !isLegit(host, brand))
        indicators.push({ id: "brand_lookalike", label: `Uses the name “${brand.name}”`, severity: "high", explanation: `The address mentions ${brand.name} but is not one of its known websites (our list is limited). Imitation addresses are a common trick.`, matched: host });
    }
    if (SHORTENERS.has(reg)) indicators.push({ id: "shortener", label: "Shortened link", severity: "medium", explanation: "The real destination is hidden behind a short link. CoastShield does not open links to check them.", matched: reg });
    if (host.split(".").some((l) => l.startsWith("xn--"))) indicators.push({ id: "punycode", label: "Look-alike characters", severity: "medium", explanation: "The name uses special encoding that can disguise look-alike letters (for example a different “a”)." });
    const tld = host.split(".").pop() ?? "";
    if (ODD_TLDS.has(tld)) indicators.push({ id: "odd_tld", label: `Uncommon ending “.${tld}”`, severity: "low", explanation: "Some endings are often used for throwaway sites. This is only a weak hint, not proof." });
    if (host.split(".").length >= 5) indicators.push({ id: "many_parts", label: "Very long website name", severity: "low", explanation: "Many dot-separated parts can be used to bury a trusted-looking word at the start." });
    if ((host.match(/-/g) ?? []).length >= 3) indicators.push({ id: "hyphens", label: "Many hyphens", severity: "low", explanation: "Several hyphens in a website name are common in imitation sites." });
    if (/(login|signin|verify|secure|update|confirm|wallet|reward|bonus|account)/.test(host) && !indicators.some((i) => i.id === "brand_lookalike"))
      indicators.push({ id: "login_words", label: "Login-style words in the name", severity: "low", explanation: "Words like “verify” or “secure” in the website name are often used to look official.", matched: reg });
  }

  if (url.protocol === "http:") indicators.push({ id: "no_https", label: "Not encrypted (http)", severity: "low", explanation: "Information sent to this site is not protected in transit." });
  if (url.port && !["80", "443"].includes(url.port)) indicators.push({ id: "odd_port", label: "Unusual port number", severity: "low", explanation: "Normal websites rarely need a custom port number." });
  if (raw.length > 200) indicators.push({ id: "long_url", label: "Very long address", severity: "low", explanation: "Extremely long addresses can hide where they lead." });

  return urlResult(indicators, { valid: true, normalizedUrl: url.toString(), hostname: host });
}

/* ----------------------------- Message analysis ---------------------------- */

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|info|xyz|top|click|link|me|co\.ke|go\.ke|or\.ke|ke|ly|cc|icu|site|online|app)(?:\/[^\s<>"']*)?/gi;

export function extractUrls(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(URL_RE)) {
    if (m.index !== undefined && text[m.index - 1] === "@") continue; // email domain
    const u = m[0].replace(/[.,;:!?)\]]+$/, "");
    if (u && !out.includes(u)) out.push(u);
    if (out.length >= 5) break;
  }
  return out;
}

const SECRET = /\b(pin|password|passcode|one[\s-]?time\s+(?:code|password|pin)|otp|verification\s+code|security\s+code|cvv|secret\s+code)\b/i;
const ASK = /\b(send|share|reply|confirm|enter|provide|give|tell|submit|type|forward|read\s+out)\b/i;
const WARNING_NEGATION = /\b(never|do\s+not|don'?t|dont|not)\b[^.!?]{0,25}\b(share|give|tell|send|disclose|reveal|reply)\b/i;
const URGENCY = /\b(urgent(?:ly)?|immediately|within\s+\d+\s*(?:minutes?|mins?|hours?|hrs?)|right\s+now|act\s+now|last\s+warning|final\s+notice|expires?\s+(?:today|soon)|will\s+be\s+(?:blocked|suspended|closed|deactivated|locked))\b/i;
const MONEY = /\b(?:ksh|kes|sh)\.?\s?\d[\d,]*|\b\d[\d,]{2,}\s?(?:ksh|kes|\/=|shillings?)/i;
const MISTAKEN = /\b(?:sent|transferred|deposited|paid)\b[^.!?]{0,60}\b(?:by\s+mistake|wrongly|in\s+error|mistakenly|accidentally)\b/i;
const RETURN_REQ = /\b(?:please|kindly)\s+(?:return|send\s+back|refund|reverse)\b/i;
const PHONE = /(?:\+?254|0)[17]\d{8}/;
const PROBLEM = [
  /\b(?:account|wallet|sim|card|payment|transaction|parcel|delivery)\b[^.!?]{0,60}\b(?:suspend\w*|block\w*|lock\w*|deactivat\w*|clos\w+|fail\w*|problem|issue|verify|verification|unusual|restricted|expire\w*|on\s+hold|pending)\b/i,
  /\b(?:problem|issue|trouble)\b[^.!?]{0,30}\b(?:account|wallet|card|payment)\b/i,
  /\b(?:verify|confirm|update|unlock|reactivate)\b[^.!?]{0,40}\b(?:account|details|identity|wallet)\b/i,
];
const INSTALL = /\b(?:install|download|open)\b[^.!?]{0,40}\b(?:app|apk|software|program|tool)\b|\b(?:anydesk|teamviewer|quicksupport|rustdesk|remote\s+(?:access|control|support)|share\s+(?:your\s+)?screen)\b/i;
const PRIZE = /\b(?:congratulations|you(?:'ve|\s+have)\s+won|you\s+are\s+(?:a\s+)?winner|lucky\s+winner|lottery|jackpot|claim\s+your\s+(?:prize|reward|gift))\b/i;
const CONFIRM_TEXT = /\bconfirmed\b/i;

const REC: Record<string, string> = {
  credentials: "Never share PINs, passwords or one-time codes with anyone, including people who say they work for a provider.",
  urgency: "Pressure to act quickly is a common tactic. Pause and take your time.",
  mistaken_transfer: "Do not send money back because of a message. Check your real balance and statement in the official app or menu, and ask the provider to handle genuine reversals.",
  money_request: "Do not send money to a number, till or paybill you did not expect. Confirm with the person using a contact you already trust.",
  account_problem: "Do not tap the link. Open the official app or website yourself, or contact the provider through the channel on your SIM pack, card or official site.",
  link_warnings: "Do not open the link. If you must check it, type the official address yourself.",
  remote_access: "Do not install apps or allow remote access because someone asked. Genuine providers do not request this.",
  prize: "Prizes you did not enter for are usually scams. Never pay a fee to “claim” one.",
  impersonation: "Verify the sender through the provider's official channels, not the contact details in the message.",
  payment_confirmation: "Do not release goods based on a text or screenshot alone. Check the payment in your own M-PESA or bank app, or your statement.",
};

export function analyzeMessage(text: string): MessageAnalysis {
  const msg = typeof text === "string" ? text.slice(0, MAX_MESSAGE_LENGTH) : "";
  const sentences = msg.split(/[.!?\n]+/);
  const compact = msg.replace(/[\s-]/g, "");
  const urls = extractUrls(msg);
  const found: Indicator[] = [];
  const add = (i: Indicator) => found.push(i);

  const credSentence = sentences.find((s) => SECRET.test(s) && ASK.test(s) && !WARNING_NEGATION.test(s));
  if (credSentence) add({ id: "credentials", label: "Asks for a PIN, password or code", severity: "high", explanation: "Real providers and banks do not ask you to send or confirm secret codes by message or phone.", matched: snippet(credSentence) });

  const urgency = msg.match(URGENCY);
  if (urgency) add({ id: "urgency", label: "Pressure to act immediately", severity: "medium", explanation: "Urgent threats are used to stop you from thinking or checking.", matched: urgency[0] });

  const mistaken = msg.match(MISTAKEN);
  if (mistaken || (RETURN_REQ.test(msg) && MONEY.test(msg)))
    add({ id: "mistaken_transfer", label: "Asks you to send money back", severity: "high", explanation: "A common scam sends a fake “sent by mistake” message and asks you to return the money.", matched: mistaken ? snippet(mistaken[0]) : undefined });

  if (MONEY.test(msg) && /\b(send|transfer|deposit|pay)\b/i.test(msg) && (PHONE.test(compact) || /\b(till|paybill|pay\s?bill)\b/i.test(msg)))
    add({ id: "money_request", label: "Asks you to send money to a number or till", severity: "medium", explanation: "Be careful with requests to pay a number, till or paybill you did not expect." });

  const hasProblem = PROBLEM.some((r) => r.test(msg));
  if (hasProblem && urls.length > 0)
    add({ id: "account_problem", label: "Account or payment problem with a link", severity: "medium", explanation: "Messages that claim a problem and send you to a link are a classic phishing pattern." });

  if (urls.length > 0) {
    const results = urls.map((u) => analyzeUrl(u)).filter((r) => r.indicators.length > 0);
    if (results.length > 0) {
      const all = results.flatMap((r) => r.indicators);
      add({ id: "link_warnings", label: "Link with warning signs", severity: maxSeverity(all), explanation: all.slice(0, 3).map((i) => i.label).join("; ") + ".", matched: urls[0] });
    }
  }

  if (INSTALL.test(msg)) add({ id: "remote_access", label: "Asks you to install an app or share your screen", severity: "high", explanation: "Remote-access and unknown apps let scammers see or control your phone and money apps." });

  if (PRIZE.test(msg)) add({ id: "prize", label: "Unexpected prize or reward", severity: "medium", explanation: "Surprise winnings that ask for a fee or details are a common scam." });

  const brand = BRANDS.find((b) => b.tokens.some((t) => new RegExp(`\\b${t.replace("-", "[- ]?")}\\b`, "i").test(msg)));
  const hasOther = found.length > 0;
  if (brand && hasOther) add({ id: "impersonation", label: `Mentions ${brand.name}`, severity: "medium", explanation: "Scammers copy the names of well-known providers. A name in a message does not prove who sent it." });

  if (CONFIRM_TEXT.test(msg) && MONEY.test(msg) && /\b(received|sent|paid|transferred)\b/i.test(msg))
    add({ id: "payment_confirmation", label: "Looks like a payment confirmation", severity: "low", explanation: "Texts and screenshots can be forged. Only your own account balance or statement proves a payment." });

  const risk = classify(found);
  const summary =
    risk === "HIGH" ? "Several warning signs appear together. Treat this message as risky until you verify it through an official channel."
    : risk === "CAUTION" ? "Some warning signs were found. This does not prove the message is a scam, but slow down and verify before acting."
    : found.length > 0 ? "Few warning signs were found, but one point is worth checking. A low result does not make a message safe."
    : "No common warning signs were found. That does not make a message safe, so verify anything unexpected.";

  const recommendations = [...new Set(found.map((i) => REC[i.id]).filter(Boolean))];
  if (risk !== "LOW") {
    recommendations.push("Do not reply to the message or call numbers it gives you.");
    recommendations.push("If you already shared details or paid, open the matching incident guide and contact your provider through an official channel.");
    recommendations.push("Block the sender and report the message to your provider.");
  } else {
    recommendations.push("If a request is unexpected, confirm it using a contact you already trust before acting.");
  }

  return { risk, indicators: found, summary, recommendations, disclaimer: DISCLAIMER, urlsFound: urls };
}
