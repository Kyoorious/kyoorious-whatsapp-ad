// Cloudflare Worker for Kyoorious WhatsApp:
//  - receives Meta webhooks (delivery statuses + customer replies) into D1
//  - /dashboard : one app - delivery dashboard + "Messages" (all chats, manual replies)
//  - one fixed default reply per conversation per 24h; no AI
// Secrets: VERIFY_TOKEN, APP_SECRET, ADMIN_KEY, WA_TOKEN.  Vars: WA_PHONE_ID.  Binding: DB (D1).
import { APP_HTML } from "./pages.js";

const GRAPH = "https://graph.facebook.com/v21.0";
const AD_TEMPLATE = "teacher_free_practice_offer_v2", AD_LANG = "en", DAILY_CAP = 250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normPhone = (raw) => {
  let d = String(raw || "").replace(/[^0-9]/g, "");
  if (d.length === 10) d = "91" + d;
  if (d.length === 11 && d[0] === "0") d = "91" + d.slice(1);
  if (d.startsWith("91")) return /^91[6-9][0-9]{9}$/.test(d) ? d : null; // India: 10-digit mobile
  return /^[1-9][0-9]{7,14}$/.test(d) ? d : null; // other countries: full international number
};
async function getSetting(env, k) {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind(k).first();
  return r ? r.value : null;
}
async function setSetting(env, k, v) {
  await env.DB.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(k, String(v)).run();
}
async function sent24h(env) {
  const r = await env.DB.prepare("SELECT COUNT(*) n FROM messages WHERE sent_ts>? AND wamid NOT LIKE 'fail:%'").bind(Math.floor(Date.now() / 1000) - 86400).first();
  return r.n || 0;
}

// ---------- daily campaign (queue of numbers sent automatically by a cron trigger) ----------
const SPARE_SLOTS = 50, RUN_BATCH = 10, IST = 19800;
const RECIPIENT_ERRORS = ["131026", "131030", "131021", "131049", "131050", "131055", "130472", "131056", "131051"];
const PENDING_SQL = "NOT EXISTS (SELECT 1 FROM messages m WHERE m.phone=queue.phone) AND NOT EXISTS (SELECT 1 FROM convo c WHERE c.phone=queue.phone AND c.opted_out=1)";

async function campaignGuard(env, now) {
  try {
    const r = await fetch(`${GRAPH}/${env.WA_PHONE_ID}?fields=quality_rating`, { headers: { Authorization: `Bearer ${env.WA_TOKEN}` } });
    const j = await r.json();
    if (j.quality_rating && j.quality_rating !== "GREEN" && j.quality_rating !== "UNKNOWN") return `WhatsApp quality rating is ${j.quality_rating}`;
  } catch (e) { /* cannot read rating: do not pause on that alone */ }
  const rows = (await env.DB.prepare(
    "SELECT m.wamid, EXISTS(SELECT 1 FROM statuses s WHERE s.wamid=m.wamid AND s.status='failed') f FROM messages m WHERE m.source='queue' AND m.sent_ts<? AND m.sent_ts>? AND m.wamid NOT LIKE 'fail:%'")
    .bind(now - 6 * 3600, now - 4 * 86400).all()).results;
  if (rows.length >= 50) {
    const failed = rows.filter((x) => x.f).length;
    if (failed / rows.length > 0.6) return `Last lot failed too often: ${failed} of ${rows.length} (${Math.round(failed / rows.length * 100)}%)`;
  }
  return "";
}

async function campaignRun(env) {
  const note = async (o) => { await setSetting(env, "last_run", JSON.stringify({ ts: Math.floor(Date.now() / 1000), ...o })); return o; };
  const state = (await getSetting(env, "campaign_state")) || "paused";
  if (state !== "running") return { skipped: state };
  const now = Math.floor(Date.now() / 1000);
  const pause = async (why) => { await setSetting(env, "campaign_state", "paused"); await setSetting(env, "campaign_pause_reason", why); return note({ paused: why }); };
  const vid = await getSetting(env, "video_id");
  if (!vid) return pause("Ad video missing: upload it on the Send Advertisement tab");
  const today = String(Math.floor((now + IST) / 86400));
  if ((await getSetting(env, "guard_day")) !== today) {
    const bad = await campaignGuard(env, now);
    if (bad) return pause(bad);
    await setSetting(env, "guard_day", today);
  }
  const lot = Math.min(Math.max(Number(await getSetting(env, "lot_size")) || 200, 1), DAILY_CAP - SPARE_SLOTS);
  const dayStart = now - ((now + IST) % 86400);
  const qt = (await env.DB.prepare("SELECT COUNT(*) n FROM messages WHERE source='queue' AND sent_ts>=? AND wamid NOT LIKE 'fail:%'").bind(dayStart).first()).n || 0;
  const used = await sent24h(env);
  const remaining = Math.min(lot - qt, DAILY_CAP - SPARE_SLOTS - used);
  if (remaining <= 0) return note({ idle: "limit reached for now", today: qt, used });
  const n = Math.min(remaining, RUN_BATCH);
  const rows = (await env.DB.prepare(`SELECT phone,name FROM queue WHERE (claimed_ts IS NULL OR claimed_ts<?) AND ${PENDING_SQL} ORDER BY pos LIMIT ?`).bind(now - 600, n).all()).results;
  if (!rows.length) {
    const left = (await env.DB.prepare(`SELECT COUNT(*) n FROM queue WHERE ${PENDING_SQL}`).first()).n;
    if (!left) { await setSetting(env, "campaign_state", "finished"); return note({ finished: true }); }
    return note({ idle: "waiting for in-flight sends" });
  }
  const ph = rows.map(() => "?").join(",");
  await env.DB.prepare(`UPDATE queue SET claimed_ts=? WHERE phone IN (${ph})`).bind(now, ...rows.map((r) => r.phone)).run();
  const stmts = [];
  let sent = 0, failed = 0, stop = "", systemic = false;
  const release = [];
  for (const row of rows) {
    if (stop) { release.push(row.phone); continue; }
    let j = {}, ok = false, status = 0;
    try {
      const r = await fetch(`${GRAPH}/${env.WA_PHONE_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.WA_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: row.phone, type: "template", template: {
          name: AD_TEMPLATE, language: { code: AD_LANG },
          components: [{ type: "header", parameters: [{ type: "video", video: { id: vid } }] }] } }),
      });
      status = r.status; ok = r.ok; j = await r.json().catch(() => ({}));
    } catch (e) { stop = "network error"; release.push(row.phone); continue; }
    const t = Math.floor(Date.now() / 1000), wamid = j.messages?.[0]?.id, err = j.error || {};
    if (ok && wamid) {
      stmts.push(env.DB.prepare("INSERT OR IGNORE INTO messages(wamid,phone,sent_ts,sent_by,source) VALUES(?,?,?,?,?)").bind(wamid, row.phone, t, "campaign", "queue"));
      sent++;
    } else if (RECIPIENT_ERRORS.includes(String(err.code))) {
      const fid = `fail:${row.phone}:${t}`;
      stmts.push(env.DB.prepare("INSERT OR IGNORE INTO messages(wamid,phone,sent_ts,sent_by,source) VALUES(?,?,?,?,?)").bind(fid, row.phone, t, "campaign", "queue"));
      stmts.push(env.DB.prepare("INSERT OR REPLACE INTO statuses(wamid,status,ts,error_code,error) VALUES(?,?,?,?,?)").bind(fid, "failed", t, String(err.code), err.message || "Send failed"));
      failed++;
    } else {
      // not specific to this number (token, media, template, rate limit...): stop and keep the number for later
      stop = `${err.code || status}: ${err.message || "send rejected"}`;
      systemic = String(err.code) !== "130429";
      release.push(row.phone);
    }
    await sleep(250);
  }
  if (stmts.length) await env.DB.batch(stmts);
  if (release.length) await env.DB.prepare(`UPDATE queue SET claimed_ts=NULL WHERE phone IN (${release.map(() => "?").join(",")})`).bind(...release).run();
  if (stop && systemic) return pause(`Sending stopped: ${stop}`);
  return note({ sent, failed, stopped: stop || undefined, today: qt + sent });
}

async function campaignInfo(env) {
  const now = Math.floor(Date.now() / 1000), dayStart = now - ((now + IST) % 86400);
  const pending = (await env.DB.prepare(`SELECT COUNT(*) n FROM queue WHERE ${PENDING_SQL}`).first()).n || 0;
  const total = (await env.DB.prepare("SELECT COUNT(*) n FROM queue").first()).n || 0;
  const today = (await env.DB.prepare("SELECT COUNT(*) n FROM messages WHERE source='queue' AND sent_ts>=? AND wamid NOT LIKE 'fail:%'").bind(dayStart).first()).n || 0;
  let last = null; try { last = JSON.parse((await getSetting(env, "last_run")) || "null"); } catch (e) { last = null; }
  return {
    state: (await getSetting(env, "campaign_state")) || "paused", reason: (await getSetting(env, "campaign_pause_reason")) || "",
    lot_size: Number(await getSetting(env, "lot_size")) || 200, pending, total, today, used24h: await sent24h(env), cap: DAILY_CAP, spare: SPARE_SLOTS, last, now,
  };
}

const DEFAULT_REPLY = "Thank you for connecting with us! As soon as a team member becomes available, they will reply.\nYour students’ outcomes are our top priority.";

// OWNER_EMAIL (a Worker secret) is who sends made with the admin key, and older sends, are attributed to
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
const page = (s) => new Response(s, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
// ---- who is calling? Cloudflare Access login (email) or, for scripts, the admin key ----
let JWKS = null, JWKS_AT = 0;
const b64u = (x) => { x = x.replace(/-/g, "+").replace(/_/g, "/"); while (x.length % 4) x += "="; return Uint8Array.from(atob(x), (c) => c.charCodeAt(0)); };
async function getJwks(env) {
  if (JWKS && Date.now() - JWKS_AT < 3600e3) return JWKS;
  const r = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
  JWKS = (await r.json()).keys || []; JWKS_AT = Date.now();
  return JWKS;
}
async function accessEmail(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  const tok = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!tok) return null;
  const [h, p, sig] = tok.split(".");
  if (!sig) return null;
  try {
    const dec = new TextDecoder();
    const header = JSON.parse(dec.decode(b64u(h))), pay = JSON.parse(dec.decode(b64u(p)));
    if (header.alg !== "RS256") return null;
    const aud = Array.isArray(pay.aud) ? pay.aud : [pay.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;
    if (!pay.exp || pay.exp * 1000 < Date.now()) return null;
    if (pay.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
    const jwk = (await getJwks(env)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(sig), new TextEncoder().encode(h + "." + p));
    return ok ? (pay.email || null) : null;
  } catch (e) { return null; }
}
async function authenticate(req, env) {
  const email = await accessEmail(req, env);
  if (email) return { email, via: "access" };
  const k = req.headers.get("x-admin-key") || new URL(req.url).searchParams.get("key");
  if (k && k === env.ADMIN_KEY) return { email: env.OWNER_EMAIL || "owner", via: "key" };
  return null;
}

async function validSignature(request, rawBody, secret) {
  const sig = request.headers.get("X-Hub-Signature-256") || "";
  if (!sig.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, rawBody);
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = sig.slice(7);
  if (hex.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function sendText(env, to, body) {
  const r = await fetch(`${GRAPH}/${env.WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WA_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: true } }),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, id: j.messages?.[0]?.id, error: j.error ? `${j.error.code}: ${j.error.message}` : "" };
}

async function logOut(env, phone, sender, body, res, media) {
  media = media || {};
  await env.DB.prepare("INSERT INTO chat(wamid,phone,direction,sender,body,ts,error,media_id,mime,filename,sent_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
    .bind(res.id || null, phone, "out", sender, body, Math.floor(Date.now() / 1000), res.ok ? null : res.error,
      media.id || null, media.mime || null, media.filename || null, media.sent_by || null).run();
}

async function sendMedia(env, to, kind, mediaId, caption, filename) {
  const obj = { id: mediaId };
  if (caption && kind !== "audio") obj.caption = caption;
  if (kind === "document" && filename) obj.filename = filename;
  const r = await fetch(`${GRAPH}/${env.WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WA_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: kind, [kind]: obj }),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, id: j.messages?.[0]?.id, error: j.error ? `${j.error.code}: ${j.error.message}` : "" };
}

// returns an error string if a free-form reply is not allowed right now
async function replyBlocked(env, phone) {
  const cv = await env.DB.prepare("SELECT last_in_ts,opted_out FROM convo WHERE phone=?").bind(phone).first();
  if (!cv) return "unknown conversation";
  if (cv.opted_out) return "This person unsubscribed.";
  if (Date.now() / 1000 - (cv.last_in_ts || 0) > 86400)
    return "More than 24h since their last message: WhatsApp only allows an approved template now.";
  return "";
}

// ---------- webhook: delivery statuses ----------
async function handleStatus(env, s) {
  const phone = s.recipient_id, wamid = s.id;
  const category = s.pricing?.category || "";
  const isReply = category === "service" || (await env.DB.prepare("SELECT 1 FROM chat WHERE wamid=?").bind(wamid).first());
  if (!isReply) {
    await env.DB.prepare("INSERT OR IGNORE INTO messages(wamid,phone,sent_ts) VALUES(?,?,?)").bind(wamid, phone, Number(s.timestamp) || null).run();
  }
  const err = (s.errors && s.errors[0]) || {};
  await env.DB.prepare("INSERT OR REPLACE INTO statuses(wamid,status,ts,error_code,error,category,billable) VALUES(?,?,?,?,?,?,?)")
    .bind(wamid, s.status, Number(s.timestamp) || null, String(err.code || ""), err.title || err.message || "", category, s.pricing?.billable ? 1 : 0).run();
}

// ---------- webhook: customer messages ----------
const STOP_RE = /^\s*(stop|unsubscribe|opt[ -]?out|cancel|band karo|बंद)\s*[.!]*\s*$/i;

// ---- is this inbound text probably another business's auto-responder? ----
const BOT_RE = new RegExp([
  "thank(s| you)?( you)? for (contacting|reaching|connecting|messaging|writing|your (message|enquiry|inquiry|interest|query))",
  "we (have )?received your (message|enquiry|inquiry|query)",
  "(our|the) (team|executive|representative|counsellor|counselor) will (get back|contact|reach|respond|call|connect)",
  "will (get back|respond|reply|revert|connect)( to you)? (shortly|soon|as soon|within)",
  "(this is|it is|it's) an? (auto|automated)",
  "auto[- ]?(reply|response|responder)",
  "automated (message|reply|response)",
  "out of office",
  "currently (unavailable|away|closed|offline|busy)",
  "(business|working|office) hours",
  "how (may|can) (we|i) (help|assist) you",
  "please let us know how",
  "welcome to ",
  "aapka (swagat|dhanyavaad|dhanyavad)",
  "dhanyavaad|dhanyavad|" + "धन्यवाद",
].join("|"), "i");
const MENU_RE = /(press|reply with|reply|type|send) [0-9]( |$)|reply (yes|stop|menu)|[1-9][.)] [^\r\n]+[\r\n]+\s*[1-9][.)] /i;
const URL_ONLY_RE = /^\s*https?:\/\/\S+\s*$/i;

// Scores how likely a message is another business's auto-responder / broadcast (>= 3 means automated).
const PROMO_RE = /(contact|call|whatsapp|phone)( us| now)?[ ]*[:\-]|locations?[ ]*[:\-]|address[ ]*[:\-]|timings?[ ]*[:\-]|visit (our|us)|admissions? (are )?open|demo class(es)?( available)?|hurry|limited seats|enrol+|enroll|register (now|today)|join (now|today|us)|batch(es)? (start|starting|begin|commenc)|(special )?offer|discount|book (a )?(free )?(demo|seat)|follow us|our (centre|center|branch|branches)|working hours|open (from|daily)/i;
const HUMAN_RE = /kyoorious|handwritten|how (does|do|can|will)|what (is|are)|who are|interested|tell me|send (me )?(the )?(details|more|info)|call me|batao|bataiye|kya hai|kaise|how much|price|cost|fees?\b|free access|practice/i;
function botScore(text, latencySec) {
  const t = (text || "").trim();
  if (!t) return 0;
  let sc = 0;
  if (BOT_RE.test(t) || MENU_RE.test(t)) return 5; // stock auto-responder phrase: no human cue outweighs it
  const lines = t.split(/\r?\n/).filter((x) => x.trim()).length;
  if (t.length > 140) sc += 1;
  if (t.length > 300) sc += 1;
  if (lines >= 4) sc += 1;
  if (PROMO_RE.test(t)) sc += 2;
  if (/[6-9][0-9]{9}/.test(t.replace(/[ -]/g, ""))) sc += 1;
  if ((t.match(/\p{Extended_Pictographic}/gu) || []).length >= 3) sc += 1;
  if (latencySec !== null && latencySec !== undefined && latencySec >= 0 && latencySec <= 90) sc += 2;
  if (HUMAN_RE.test(t)) sc -= 3;
  if (t.includes("?") && t.length < 120) sc -= 2;
  return sc;
}

async function looksAutomated(env, phone, body, ts) {
  const t = (body || "").trim();
  if (!t) return false;
  const last = await env.DB.prepare("SELECT MAX(sent_ts) t FROM messages WHERE phone=? AND wamid NOT LIKE 'fail:%' AND sent_ts<=?").bind(phone, ts).first();
  const latency = last && last.t ? ts - last.t : null;
  if (botScore(t, latency) >= 3) return true;
  if (URL_ONLY_RE.test(t)) {
    // a bare link straight after their greeting, or soon after our ad, is an auto-sent location/catalogue link
    if (await env.DB.prepare("SELECT 1 FROM chat WHERE phone=? AND direction='in' AND auto_flag=1 AND ts>?").bind(phone, ts - 180).first()) return true;
    if (latency !== null && latency <= 300) return true;
  }
  return false;
}

async function handleInbound(env, value) {
  const names = {};
  for (const c of value.contacts || []) names[c.wa_id] = c.profile?.name || "";
  for (const m of value.messages || []) {
    const phone = m.from, ts = Number(m.timestamp) || Math.floor(Date.now() / 1000);
    if (m.type === "reaction") { // customer reacted to a message: attach to it, no new chat row
      await env.DB.prepare("UPDATE chat SET react_in=? WHERE wamid=?").bind(m.reaction?.emoji || null, m.reaction?.message_id || "").run();
      continue;
    }
    const mo = ["image", "video", "document", "audio", "sticker"].includes(m.type) ? m[m.type] : null;
    const body = m.type === "text" ? m.text?.body || "" : mo ? mo.caption || "" : m.type === "button" ? m.button?.text || "[button]" : `[${m.type}]`;
    const ins = await env.DB.prepare("INSERT OR IGNORE INTO chat(wamid,phone,direction,sender,body,ts,media_id,mime,filename) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(m.id, phone, "in", "customer", body, ts, mo?.id || null, mo?.mime_type || null, mo?.filename || null).run();
    if (!ins.meta.changes) continue; // duplicate delivery from Meta
    const isBot = m.type === "text" && !STOP_RE.test(body) && (await looksAutomated(env, phone, body, ts));
    if (isBot) await env.DB.prepare("UPDATE chat SET auto_flag=1 WHERE wamid=?").bind(m.id).run();
    // an automated greeting from them does not need a human reply
    await env.DB.prepare(
      "INSERT INTO convo(phone,name,last_in_ts,needs_human) VALUES(?,?,?,?) ON CONFLICT(phone) DO UPDATE SET last_in_ts=excluded.last_in_ts, needs_human=CASE WHEN ?=1 THEN convo.needs_human ELSE 1 END, name=COALESCE(NULLIF(excluded.name,''),convo.name)")
      .bind(phone, names[phone] || "", ts, isBot ? 0 : 1, isBot ? 1 : 0).run();

    // STOP: record the opt-out silently (no reply sent)
    if (m.type === "text" && STOP_RE.test(body)) {
      await env.DB.prepare("UPDATE convo SET opted_out=1, needs_human=0 WHERE phone=?").bind(phone).run();
      continue;
    }
    const cv = await env.DB.prepare("SELECT opted_out FROM convo WHERE phone=?").bind(phone).first();
    if (cv.opted_out) continue;

    // never answer another business's auto-responder (avoids bot-to-bot loops and looking robotic)
    if (isBot) continue;

    // fixed default reply: at most once per 24h, never after we already replied in that window,
    // and claimed atomically so two messages arriving together cannot both trigger it
    const prior = await env.DB.prepare("SELECT 1 FROM chat WHERE phone=? AND direction='out' AND ts>?").bind(phone, ts - 86400).first();
    if (prior) continue;
    const claim = await env.DB.prepare("UPDATE convo SET last_auto_ts=? WHERE phone=? AND (last_auto_ts IS NULL OR last_auto_ts<?)").bind(ts, phone, ts - 86400).run();
    if (!claim.meta.changes) continue;
    const res = await sendText(env, phone, DEFAULT_REPLY);
    await logOut(env, phone, "auto", DEFAULT_REPLY, res);
    if (!res.ok) await env.DB.prepare("UPDATE convo SET last_auto_ts=NULL WHERE phone=?").bind(phone).run();
  }
}

// ---------- dashboard data ----------
async function dashboardData(env) {
  const msgs = (await env.DB.prepare("SELECT wamid,phone,sent_ts,sent_by FROM messages WHERE wamid NOT IN (SELECT wamid FROM chat WHERE wamid IS NOT NULL)").all()).results;
  const sts = (await env.DB.prepare("SELECT wamid,status,ts,error_code,error FROM statuses").all()).results;
  const nm = {};
  for (const c of (await env.DB.prepare("SELECT phone,name FROM convo WHERE COALESCE(name,'')<>''").all()).results) nm[c.phone] = c.name;
  for (const c of (await env.DB.prepare("SELECT phone,name FROM contacts WHERE COALESCE(name,'')<>''").all()).results) nm[c.phone] = c.name;
  const nowS = Math.floor(Date.now() / 1000);
  const replies = {};
  for (const r of (await env.DB.prepare("SELECT phone,COUNT(*) n FROM chat WHERE direction='in' GROUP BY phone").all()).results) replies[r.phone] = r.n;
  const cities = {};
  for (const r of (await env.DB.prepare("SELECT phone,city FROM queue WHERE COALESCE(city,'')<>''").all()).results) cities[r.phone] = r.city;
  // recipients whose only replies are automated: their "read" receipt comes from the auto-responder, so do not count it
  const autoOnly = {};
  for (const r of (await env.DB.prepare("SELECT phone, SUM(CASE WHEN auto_flag=1 THEN 1 ELSE 0 END) a, SUM(CASE WHEN auto_flag=1 THEN 0 ELSE 1 END) h FROM chat WHERE direction='in' GROUP BY phone").all()).results)
    if (r.a > 0 && r.h === 0) autoOnly[r.phone] = true;
  const by = {};
  for (const s of sts) (by[s.wamid] ||= []).push(s);
  const rank = { failed: 4, read: 3, delivered: 2, sent: 1 };
  const people = {};
  const totals = { recipients: 0, messages: 0, accepted: 0, sent: 0, delivered: 0, read: 0, failed: 0, untracked: 0 };
  for (const m of msgs) {
    const list = by[m.wamid] || [];
    let best = "accepted", err = "", last = m.sent_ts || 0;
    for (const s of list) {
      if ((rank[s.status] || 0) > (rank[best] || 0)) best = s.status;
      if (s.status === "failed") err = `${s.error_code} ${s.error}`.trim();
      if ((s.ts || 0) > last) last = s.ts;
    }
    if (best === "read" && autoOnly[m.phone]) best = "delivered";
    if (best === "accepted" && nowS - last > 1800) best = "untracked"; // no delivery events ever arrived
    const p = (people[m.phone] ||= { phone: m.phone, name: nm[m.phone] || "", city: cities[m.phone] || "", messages: 0, accepted: 0, sent: 0, delivered: 0, read: 0, failed: 0, untracked: 0, latest: "", last_error: "", sent_by: "", sb_ts: 0, last_ts: 0, replies: replies[m.phone] || 0 });
    p.auto_only = !!autoOnly[m.phone];
    if ((m.sent_ts || 0) >= (p.sb_ts || 0)) { p.sent_by = (m.sent_by && m.sent_by !== "admin-key") ? m.sent_by : (env.OWNER_EMAIL || "owner"); p.sb_ts = m.sent_ts || 0; }
    p.messages++; p[best]++; totals.messages++; totals[best]++;
    if (last >= p.last_ts) { p.last_ts = last; p.latest = best; }
    if (err) p.last_error = err;
  }
  totals.recipients = Object.keys(people).length;
  const rows = Object.values(people).sort((a, b) => b.last_ts - a.last_ts);
  const cs = await env.DB.prepare("SELECT COUNT(*) n, SUM(needs_human) h FROM convo").first();
  return { totals, rows, conversations: cs.n || 0, needs_human: cs.h || 0, now: Math.floor(Date.now() / 1000) };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(campaignRun(env).catch((e) => console.log("campaign error", e && e.message)));
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET" && path === "/webhook") {
      if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === env.VERIFY_TOKEN)
        return new Response(url.searchParams.get("hub.challenge"), { status: 200 });
      return new Response("Forbidden", { status: 403 });
    }

    if (request.method === "POST" && path === "/webhook") {
      const raw = await request.arrayBuffer();
      if (!(await validSignature(request, raw, env.APP_SECRET))) return new Response("Bad signature", { status: 401 });
      const payload = JSON.parse(new TextDecoder().decode(raw));
      const work = (async () => {
        for (const entry of payload.entry || [])
          for (const change of entry.changes || []) {
            const v = change.value || {};
            for (const s of v.statuses || []) await handleStatus(env, s);
            if (v.messages) await handleInbound(env, v);
          }
      })().catch((e) => console.log("webhook error", e && e.message));
      ctx.waitUntil(work);
      return new Response("ok", { status: 200 });
    }

    if (request.method === "GET" && path === "/dashboard") return page(APP_HTML);
    if (request.method === "GET" && path === "/inbox") return Response.redirect(url.origin + "/dashboard#messages", 302);

    if (request.method === "GET" && path === "/api/me") {
      const w = await authenticate(request, env);
      return json({ via: w ? w.via : "none", email: w ? w.email : "" });
    }

    const who = await authenticate(request, env);
    if (!who) return new Response("Forbidden", { status: 403 });

    if (request.method === "GET" && path === "/api/dashboard") return json(await dashboardData(env));

    // legacy format used by wa_pull_status.py
    if (request.method === "GET" && path === "/statuses") {
      const rows = (await env.DB.prepare(
        "SELECT s.ts ts, s.status status, m.phone phone, s.wamid wamid, s.error_code error_code, s.error error FROM statuses s JOIN messages m ON m.wamid=s.wamid").all()).results;
      return json(rows);
    }

    if (request.method === "GET" && path === "/api/convos") {
      const rows = (await env.DB.prepare(
        "SELECT c.phone,COALESCE(NULLIF(k.name,''),c.name) name,c.needs_human,c.opted_out,c.last_in_ts,(SELECT COALESCE(NULLIF(body,''),CASE WHEN mime LIKE 'image/%' THEN '\u{1F4F7} Photo' WHEN mime LIKE 'video/%' THEN '\u{1F3A5} Video' WHEN mime LIKE 'audio/%' THEN '\u{1F3A4} Audio' WHEN media_id IS NOT NULL THEN '\u{1F4CE} '||COALESCE(filename,'File') ELSE '' END) FROM chat WHERE phone=c.phone ORDER BY ts DESC,id DESC LIMIT 1) last_body FROM convo c LEFT JOIN contacts k ON k.phone=c.phone ORDER BY c.needs_human DESC, c.last_in_ts DESC").all()).results;
      return json({ rows, now: Math.floor(Date.now() / 1000) });
    }

    if (request.method === "GET" && path === "/api/chat") {
      const phone = url.searchParams.get("phone");
      const rows = (await env.DB.prepare("SELECT id,wamid,direction,sender,body,ts,error,media_id,mime,filename,react_in,react_out,auto_flag,sent_by FROM chat WHERE phone=? ORDER BY ts,id").bind(phone).all()).results;
      const cv = await env.DB.prepare("SELECT * FROM convo WHERE phone=?").bind(phone).first();
      const kn = await env.DB.prepare("SELECT name FROM contacts WHERE phone=?").bind(phone).first();
      if (cv && kn && kn.name) cv.name = kn.name;
      return json({ rows, convo: cv, now: Math.floor(Date.now() / 1000) });
    }

    if (request.method === "POST" && path === "/api/reply") {
      const { phone, text } = await request.json();
      if (!phone || !text || !text.trim()) return json({ error: "phone and text required" }, 400);
      const blocked = await replyBlocked(env, phone);
      if (blocked) return json({ error: blocked }, 400);
      const res = await sendText(env, phone, text.trim());
      await logOut(env, phone, "human", text.trim(), res, { sent_by: who.email });
      if (res.ok) await env.DB.prepare("UPDATE convo SET needs_human=0 WHERE phone=?").bind(phone).run();
      return json(res.ok ? { ok: true } : { error: res.error }, res.ok ? 200 : 502);
    }

    if (request.method === "POST" && path === "/api/toggle") {
      const { phone, ai_enabled, needs_human } = await request.json();
      if (ai_enabled !== undefined) await env.DB.prepare("UPDATE convo SET ai_enabled=? WHERE phone=?").bind(ai_enabled ? 1 : 0, phone).run();
      if (needs_human !== undefined) await env.DB.prepare("UPDATE convo SET needs_human=? WHERE phone=?").bind(needs_human ? 1 : 0, phone).run();
      return json({ ok: true });
    }

    if (request.method === "POST" && path === "/api/react") {
      const { phone, wamid, emoji } = await request.json();
      if (!phone || !wamid) return json({ error: "phone and wamid required" }, 400);
      const blocked = await replyBlocked(env, phone);
      if (blocked) return json({ error: blocked }, 400);
      const r = await fetch(`${GRAPH}/${env.WA_PHONE_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.WA_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "reaction", reaction: { message_id: wamid, emoji: emoji || "" } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return json({ error: j.error ? `${j.error.code}: ${j.error.message}` : "Reaction failed" }, 502);
      await env.DB.prepare("UPDATE chat SET react_out=? WHERE wamid=?").bind(emoji || null, wamid).run();
      return json({ ok: true });
    }

    if (request.method === "POST" && path === "/api/delete-message") {
      const { id } = await request.json();
      await env.DB.prepare("DELETE FROM chat WHERE id=?").bind(Number(id)).run();
      return json({ ok: true });
    }

    // ---------- daily campaign ----------
    if (request.method === "GET" && path === "/api/campaign") return json(await campaignInfo(env));
    if (request.method === "POST" && path === "/api/campaign") {
      const { action, lot_size } = await request.json();
      if (lot_size !== undefined) await setSetting(env, "lot_size", Math.min(Math.max(parseInt(lot_size, 10) || 200, 10), DAILY_CAP - SPARE_SLOTS));
      if (action === "pause") await setSetting(env, "campaign_state", "paused");
      if (action === "resume") { await setSetting(env, "campaign_state", "running"); await setSetting(env, "campaign_pause_reason", ""); await setSetting(env, "guard_day", ""); }
      return json(await campaignInfo(env));
    }

    // ---------- Send Advertisement ----------
    if (request.method === "GET" && path === "/api/ad-info") {
      const vid = await getSetting(env, "video_id"), ts = Number(await getSetting(env, "video_ts")) || 0;
      const used = await sent24h(env);
      return json({ cap: DAILY_CAP, used, remaining: Math.max(DAILY_CAP - used, 0), video_set: !!vid, video_ts: ts, now: Math.floor(Date.now() / 1000), template: AD_TEMPLATE });
    }

    if (request.method === "POST" && path === "/api/ad-check") {
      const { phones } = await request.json();
      const list = [...new Set((phones || []).map(String))].slice(0, 1000);
      const sentSet = [], optout = [];
      for (let i = 0; i < list.length; i += 80) {
        const part = list.slice(i, i + 80), q = part.map(() => "?").join(",");
        for (const r of (await env.DB.prepare(`SELECT DISTINCT phone FROM messages WHERE phone IN (${q}) AND wamid NOT LIKE 'fail:%'`).bind(...part).all()).results) sentSet.push(r.phone);
        for (const r of (await env.DB.prepare(`SELECT phone FROM convo WHERE phone IN (${q}) AND opted_out=1`).bind(...part).all()).results) optout.push(r.phone);
      }
      return json({ sent: sentSet, optout });
    }

    if (request.method === "POST" && path === "/api/ad-video") {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") return json({ error: "file required" }, 400);
      if (!/^video\/(mp4|3gpp)$/.test(file.type || "")) return json({ error: "Use an MP4 video" }, 400);
      if (file.size > 16 * 1024 * 1024) return json({ error: "Video must be 16 MB or smaller" }, 400);
      const up = new FormData();
      up.append("messaging_product", "whatsapp");
      up.append("type", file.type);
      up.append("file", file, file.name || "ad.mp4");
      const ur = await fetch(`${GRAPH}/${env.WA_PHONE_ID}/media`, { method: "POST", headers: { Authorization: `Bearer ${env.WA_TOKEN}` }, body: up });
      const uj = await ur.json().catch(() => ({}));
      if (!uj.id) return json({ error: uj.error ? `${uj.error.code}: ${uj.error.message}` : "Upload failed" }, 502);
      await setSetting(env, "video_id", uj.id);
      await setSetting(env, "video_ts", Math.floor(Date.now() / 1000));
      return json({ ok: true });
    }

    if (request.method === "POST" && path === "/api/send-ad") {
      const { items } = await request.json();
      const batch = (items || []).slice(0, 20);
      const vid = await getSetting(env, "video_id");
      if (!vid) return json({ error: "No ad video is set. Upload one first." }, 400);
      let used = await sent24h(env);
      const results = [];
      for (const it of batch) {
        const phone = normPhone(it.phone);
        if (!phone) { results.push({ phone: String(it.phone), ok: false, skipped: "invalid number" }); continue; }
        if (await env.DB.prepare("SELECT 1 FROM messages WHERE phone=? AND wamid NOT LIKE 'fail:%'").bind(phone).first()) { results.push({ phone, ok: false, skipped: "already sent" }); continue; }
        if (await env.DB.prepare("SELECT 1 FROM convo WHERE phone=? AND opted_out=1").bind(phone).first()) { results.push({ phone, ok: false, skipped: "unsubscribed" }); continue; }
        if (used >= DAILY_CAP) { results.push({ phone, ok: false, skipped: "daily limit reached" }); continue; }
        const r = await fetch(`${GRAPH}/${env.WA_PHONE_ID}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.WA_TOKEN}`, "content-type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "template", template: {
            name: AD_TEMPLATE, language: { code: AD_LANG },
            components: [{ type: "header", parameters: [{ type: "video", video: { id: vid } }] }] } }),
        });
        const j = await r.json().catch(() => ({}));
        const now = Math.floor(Date.now() / 1000);
        const wamid = j.messages?.[0]?.id;
        if (it.name) await env.DB.prepare("INSERT INTO contacts(phone,name) VALUES(?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name").bind(phone, String(it.name).slice(0, 120)).run();
        if (r.ok && wamid) {
          await env.DB.prepare("INSERT OR IGNORE INTO messages(wamid,phone,sent_ts,sent_by,source) VALUES(?,?,?,?,?)").bind(wamid, phone, now, who.email, "manual").run();
          used++;
          results.push({ phone, ok: true });
        } else {
          const err = j.error || {};
          const fid = `fail:${phone}:${now}`;
          await env.DB.prepare("INSERT OR IGNORE INTO messages(wamid,phone,sent_ts,sent_by) VALUES(?,?,?,?)").bind(fid, phone, now, who.email).run();
          await env.DB.prepare("INSERT OR REPLACE INTO statuses(wamid,status,ts,error_code,error) VALUES(?,?,?,?,?)").bind(fid, "failed", now, String(err.code || r.status), err.message || "Send failed").run();
          results.push({ phone, ok: false, error: `${err.code || r.status}: ${err.message || "Send failed"}` });
        }
        await sleep(300);
      }
      return json({ results, used });
    }

    if (request.method === "POST" && path === "/api/contact") {
      const { phone, name } = await request.json();
      if (!phone) return json({ error: "phone required" }, 400);
      await env.DB.prepare("INSERT INTO contacts(phone,name) VALUES(?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name").bind(String(phone), (name || "").trim()).run();
      return json({ ok: true });
    }

    if (request.method === "GET" && path === "/api/media") {
      const id = url.searchParams.get("id");
      if (!id || !/^\d+$/.test(id)) return new Response("bad id", { status: 400 });
      const auth = { Authorization: `Bearer ${env.WA_TOKEN}` };
      const meta = await (await fetch(`${GRAPH}/${id}`, { headers: auth })).json();
      if (!meta.url) return new Response("media unavailable (expired?)", { status: 404 });
      const f = await fetch(meta.url, { headers: auth });
      return new Response(f.body, { status: f.status, headers: { "content-type": meta.mime_type || "application/octet-stream", "cache-control": "private, max-age=3600" } });
    }

    if (request.method === "POST" && path === "/api/send-file") {
      const form = await request.formData();
      const phone = form.get("phone"), caption = (form.get("caption") || "").toString().trim(), file = form.get("file");
      if (!phone || !file || typeof file === "string") return json({ error: "phone and file required" }, 400);
      const blocked = await replyBlocked(env, phone);
      if (blocked) return json({ error: blocked }, 400);
      const mime = file.type || "application/octet-stream";
      let kind = "document", limit = 20 * 1024 * 1024;
      if (/^image\/(jpeg|png)$/.test(mime)) { kind = "image"; limit = 5 * 1024 * 1024; }
      else if (/^video\/(mp4|3gpp)$/.test(mime)) { kind = "video"; limit = 16 * 1024 * 1024; }
      else if (/^audio\/(aac|mp4|mpeg|amr|ogg)$/.test(mime)) { kind = "audio"; limit = 16 * 1024 * 1024; }
      if (file.size > limit) return json({ error: `File too large for WhatsApp ${kind} (max ${Math.round(limit / 1048576)} MB)` }, 400);
      const up = new FormData();
      up.append("messaging_product", "whatsapp");
      up.append("type", mime);
      up.append("file", file, file.name || "file");
      const ur = await fetch(`${GRAPH}/${env.WA_PHONE_ID}/media`, { method: "POST", headers: { Authorization: `Bearer ${env.WA_TOKEN}` }, body: up });
      const uj = await ur.json().catch(() => ({}));
      if (!uj.id) return json({ error: uj.error ? `${uj.error.code}: ${uj.error.message}` : "Upload failed" }, 502);
      const res = await sendMedia(env, phone, kind, uj.id, caption, file.name);
      await logOut(env, phone, "human", caption, res, { id: uj.id, mime, filename: file.name, sent_by: who.email });
      if (res.ok) await env.DB.prepare("UPDATE convo SET needs_human=0 WHERE phone=?").bind(phone).run();
      return json(res.ok ? { ok: true } : { error: res.error }, res.ok ? 200 : 502);
    }

    // sender script / one-time import: {items:[{wamid,phone,ts}]}
    if (request.method === "POST" && path === "/api/sent") {
      const { items } = await request.json();
      const stmts = [];
      for (const i of items || []) {
        if (!i.phone) continue;
        if (i.wamid) stmts.push(env.DB.prepare("INSERT OR IGNORE INTO messages(wamid,phone,sent_ts) VALUES(?,?,?)").bind(i.wamid, String(i.phone), Number(i.ts) || null));
        if (i.name) stmts.push(env.DB.prepare("INSERT INTO contacts(phone,name) VALUES(?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name").bind(String(i.phone), String(i.name)));
      }
      if (stmts.length) await env.DB.batch(stmts);
      return json({ ok: true, count: stmts.length });
    }

    return new Response("Not found", { status: 404 });
  },
};
