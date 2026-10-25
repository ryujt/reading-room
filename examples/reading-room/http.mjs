import assert from "node:assert/strict";

export class Actor {
  cookies = new Map();
  constructor(baseUrl) {
    this.origin = new URL(baseUrl);
    assert(this.origin.hostname === "127.0.0.1" && this.origin.port === "4721", "Only the isolated Reading Room loopback service is supported");
  }
  async request(path, method = "GET", body, form = false) {
    const response = await fetch(new URL(path, this.origin), {
      method, redirect: "manual", signal: AbortSignal.timeout(45000),
      headers: { Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "), Origin: this.origin.origin, ...(body === undefined ? {} : { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" }) },
      body: body === undefined ? undefined : form ? new URLSearchParams(body).toString() : JSON.stringify(body),
    });
    for (const header of response.headers.getSetCookie()) { const [pair] = header.split(";"); const i = pair.indexOf("="); if (i > 0) this.cookies.set(pair.slice(0, i), pair.slice(i + 1)); }
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }
    return { status: response.status, data: json?.response, json, text, cacheControl: response.headers.get("cache-control") };
  }
  async login(credentials) {
    const csrf = await this.request("/api/v1/auth/csrf");
    assert.equal(csrf.status, 200);
    const result = await this.request("/api/v1/auth/callback/credentials", "POST", { csrfToken: csrf.json.csrfToken, username: credentials.username, password: credentials.password, callbackUrl: this.origin.origin, json: "true" }, true);
    assert([200, 302].includes(result.status), "Credentials login status");
    const session = await this.request("/api/v1/auth/session");
    assert(session.json?.user, "An actual NextAuth session must be established");
    return session.json.user;
  }
}

export function expectStatus(result, expected, label) {
  assert.equal(result.status, expected, `${label}: expected HTTP ${expected}, got ${result.status}`);
  return result.data;
}
