// GLM (Zhipu AI) chat, for the collector and dev tools only — never on a visitor's path (docs/AI.md). No dependencies.
// The family's evidence (FloodWatch D-030, KNOWN_ISSUES KI-508 and its 2026-10-02 probe): glm-5.3-flash always
// reasons (`thinking: disabled` → API error 1210); `reasoning_effort: "low"` answers in ~1–5 s; when the budget runs
// out `content` is empty and only `reasoning_content` is filled — that is never an answer. The key goes in the
// Authorization header only and is never printed, logged or put in a URL.

export const DEFAULTS = {
  model: "glm-5.3-flash",
  endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
};

/** The settings from the environment, or null when AI is off or has no key. `force` ignores AI_ENABLED (probes). */
export function glmConfig(env = process.env, { force = false } = {}) {
  if (!force && env.AI_ENABLED !== "1") return null;
  if ((env.AI_PROVIDER || "glm").trim().toLowerCase() !== "glm") return null;
  const key = (env.GLM_API_KEY || "").trim();
  if (!key) return null;
  return {
    key,
    model: (env.GLM_MODEL || "").trim() || DEFAULTS.model,
    endpoint: (env.GLM_ENDPOINT || "").trim() || DEFAULTS.endpoint,
  };
}

/** The request body. A floor of 500 tokens leaves room for the reasoning that can't be switched off. */
export function payload(model, messages, { maxTokens = 800, temperature = 0.1, effort = "low", json = false } = {}) {
  return {
    model, messages, max_tokens: Math.max(maxTokens, 500), temperature, reasoning_effort: effort,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  };
}

/** The answer only: `content`, trimmed; null when it is empty (a cut-off reasoning is not an answer). */
export function answerText(d) {
  const text = d?.choices?.[0]?.message?.content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

/** One call. Never throws: {ok, text, ms, model, usage} or {ok: false, error, ms}. */
export async function chat(messages, { config = glmConfig(), timeoutMs = 30000, fetchImpl = globalThis.fetch, ...opts } = {}) {
  const t0 = Date.now();
  if (!config) return { ok: false, error: "AI off or no GLM_API_KEY", ms: 0 };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(config.endpoint, {
      method: "POST",
      signal: ctl.signal,
      headers: { authorization: `Bearer ${config.key}`, "content-type": "application/json" },
      body: JSON.stringify(payload(config.model, messages, opts)),
    });
    let d = null;
    try { d = await r.json(); } catch { /* not JSON */ }
    const text = r.ok ? answerText(d) : null;
    if (text == null) {
      const why = d?.error ? `${d.error.code ?? ""} ${d.error.message ?? ""}`.trim() : r.ok ? "empty answer" : `HTTP ${r.status}`;
      return { ok: false, error: why.slice(0, 200), ms: Date.now() - t0 };
    }
    return { ok: true, text, ms: Date.now() - t0, model: d.model || config.model, usage: d.usage || null };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "timeout" : String(e.message || e).slice(0, 200), ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

/** The first JSON object in a text (models sometimes wrap it in ``` fences), or null. */
export function firstJson(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
