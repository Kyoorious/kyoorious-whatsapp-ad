// Single-page internal app: Dashboard + Messages. All user text is inserted with textContent (no HTML injection).
// NOTE: this is a JS template literal - avoid backslashes and the dollar-brace sequence inside.
export const APP_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Kyoorious WhatsApp</title>
<style>
/* ---- theme tokens: change these to re-brand ---- */
:root{
  --brand:#4f46e5; --brand-ink:#fff; --brand-soft:#eef0ff;
  --bg:#f4f5f9; --surface:#ffffff; --surface-2:#f8f9fc; --line:#e4e6ee;
  --text:#161a2b; --muted:#6a7088;
  --ok:#0f9d58; --ok-soft:#e6f6ee; --read:#2563eb; --read-soft:#e8f0ff;
  --warn:#b7791f; --warn-soft:#fdf3e1; --bad:#d93025; --bad-soft:#fdeceb;
  --bubble-in:#ffffff; --bubble-out:#dcf8e6; --chat-bg:#eef0f6;
  --shadow:0 1px 2px rgba(20,24,50,.06),0 4px 14px rgba(20,24,50,.05);
  --radius:12px;
}
@media(prefers-color-scheme:dark){:root{
  --brand:#7c83ff; --brand-ink:#0f1226; --brand-soft:#23274d;
  --bg:#0e1017; --surface:#171a24; --surface-2:#1c2030; --line:#2a2f42;
  --text:#e9ebf4; --muted:#9097b0;
  --ok:#3ddc84; --ok-soft:#14301f; --read:#6ea8ff; --read-soft:#16264a;
  --warn:#f5b94a; --warn-soft:#3a2d12; --bad:#ff6b60; --bad-soft:#40201e;
  --bubble-in:#222738; --bubble-out:#14432c; --chat-bg:#12151f;
  --shadow:0 1px 2px rgba(0,0,0,.4);
}}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 Inter,system-ui,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
button,input,textarea{font:inherit;color:inherit}
button{cursor:pointer}
.hide{display:none!important}
.muted{color:var(--muted)}
svg.ic{width:22px;height:22px;fill:currentColor;display:block}
svg.ic.sm{width:17px;height:17px}

/* header */
.top{position:sticky;top:0;z-index:20;background:var(--surface);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:18px;padding:10px 20px}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px;letter-spacing:-.01em}
.logo i{width:30px;height:30px;border-radius:9px;background:var(--brand);color:var(--brand-ink);display:grid;place-items:center;font-style:normal;font-weight:800}
.tabs{display:flex;gap:4px;background:var(--surface-2);border:1px solid var(--line);padding:3px;border-radius:10px}
.tab{border:0;background:transparent;padding:6px 16px;border-radius:8px;font-weight:600;color:var(--muted);display:flex;align-items:center;gap:8px}
.tab.on{background:var(--surface);color:var(--text);box-shadow:var(--shadow)}
.count{background:var(--bad);color:#fff;border-radius:999px;font-size:11px;font-weight:700;padding:1px 7px;min-width:20px;text-align:center}
.grow{flex:1}
.live{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 var(--ok);animation:pulse 2s infinite}
.dot.off{background:var(--bad);animation:none}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(15,157,88,.45)}70%{box-shadow:0 0 0 8px rgba(15,157,88,0)}100%{box-shadow:0 0 0 0 rgba(15,157,88,0)}}

/* layout */
.page{max-width:1240px;margin:0 auto;padding:20px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.kpi{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--shadow);position:relative;overflow:hidden}
.kpi:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--c,var(--brand))}
.kpi span{display:block;color:var(--muted);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.kpi b{display:block;font-size:28px;line-height:1.2;margin-top:2px;letter-spacing:-.02em}
.kpi small{color:var(--muted)}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);margin-top:16px}
.panel-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px;border-bottom:1px solid var(--line)}
.panel-h h2{font-size:15px;margin:0;margin-right:auto}
.bar{display:flex;height:10px;border-radius:999px;overflow:hidden;background:var(--surface-2);border:1px solid var(--line)}
.bar i{display:block;height:100%}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--muted)}
.legend b{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px}
.field{background:var(--surface-2);border:1px solid var(--line);border-radius:9px;padding:7px 11px;min-width:200px;outline:none}
.field:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chipbtn{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;color:var(--muted)}
.chipbtn.on{background:var(--brand);color:var(--brand-ink);border-color:var(--brand)}
.btn{border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:7px 13px;font-weight:600}
.btn:hover{background:var(--surface-2)}
.btn.primary{background:var(--brand);color:var(--brand-ink);border-color:var(--brand)}
.btn.primary:hover{filter:brightness(1.08)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.scroll{overflow:auto;max-height:62vh}
table{width:100%;border-collapse:separate;border-spacing:0}
th{position:sticky;top:0;background:var(--surface-2);text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:9px 14px;border-bottom:1px solid var(--line);cursor:pointer;white-space:nowrap;user-select:none}
th.n,td.n{text-align:right}
td{padding:10px 14px;border-bottom:1px solid var(--line);white-space:nowrap}
tbody tr:hover{background:var(--surface-2)}
td.err{white-space:normal;max-width:260px;color:var(--bad);font-size:12px}
.num{font-variant-numeric:tabular-nums}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600}
.pill:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.pill.delivered{background:var(--ok-soft);color:var(--ok)}
.pill.read{background:var(--read-soft);color:var(--read)}
.pill.failed{background:var(--bad-soft);color:var(--bad)}
.pill.sent,.pill.accepted{background:var(--warn-soft);color:var(--warn)}
.pill.untracked{background:var(--surface-2);color:var(--muted)}
.empty{padding:36px;text-align:center;color:var(--muted)}
.av{flex:0 0 auto;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;font-size:14px}
.av.sm{width:34px;height:34px;font-size:12px}
.who{display:flex;gap:10px;align-items:center}
.nm{font-weight:600;line-height:1.25}.ph{font-size:12px;color:var(--muted)}
.editable{cursor:pointer}.editable:hover .nm{color:var(--brand)}
.addname{color:var(--brand);font-weight:500}

/* messages */
.msgwrap{display:grid;grid-template-columns:340px 1fr;height:calc(100vh - 62px)}
.side{background:var(--surface);border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.side-h{padding:12px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.side-h .field{width:100%}
.convos{overflow:auto;flex:1}
.conv{display:flex;gap:11px;padding:11px 14px;border-bottom:1px solid var(--line);cursor:pointer}
.conv:hover{background:var(--surface-2)}
.conv.sel{background:var(--brand-soft)}
.cmain{min-width:0;flex:1}
.crow{display:flex;gap:8px;align-items:baseline}
.cname{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.ctime{font-size:11px;color:var(--muted)}
.cprev{display:flex;gap:6px;align-items:center;color:var(--muted);font-size:13px}
.cprev span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.unread{width:10px;height:10px;border-radius:50%;background:var(--brand);flex:0 0 auto}
.chat{display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--chat-bg);position:relative}
.chat-h{display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--line)}
.chat-h .t{font-weight:700}
.chat-h .s{font-size:12px;color:var(--muted)}
.back{display:none}
.stream{flex:1;overflow:auto;padding:16px 20px;display:flex;flex-direction:column;gap:6px}
.day{align-self:center;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:2px 12px;font-size:11px;color:var(--muted);margin:8px 0}
.b{position:relative;max-width:min(560px,78%);padding:6px 10px 5px;border-radius:14px;box-shadow:var(--shadow);white-space:pre-wrap;word-break:break-word}
.b.in{align-self:flex-start;background:var(--bubble-in);border-top-left-radius:4px}
.b.out{align-self:flex-end;background:var(--bubble-out);border-top-right-radius:4px}
.b.has-rx{margin-bottom:12px}
.b small{display:block;text-align:right;font-size:11px;color:var(--muted);margin-top:2px}
.b.err small{color:var(--bad);font-weight:600}
.b.media{padding:4px 4px 5px}
.b.media>.cap,.b.media>small,.b.media>.tagauto{padding:0 6px}
.cap{padding-top:4px}
.tagauto{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.rx{position:absolute;bottom:-12px;right:10px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:0 6px;font-size:14px;box-shadow:var(--shadow)}
.act{position:absolute;top:-14px;right:8px;display:none;gap:2px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:2px 4px;box-shadow:var(--shadow);z-index:3}
.b:hover .act,.act.open{display:flex}
.act button{border:0;background:transparent;color:var(--muted);width:28px;height:26px;border-radius:50%;display:grid;place-items:center;padding:0}
.act button:hover{color:var(--text);background:var(--surface-2)}
.rxpick{position:absolute;top:-52px;right:0;background:var(--surface);border:1px solid var(--line);border-radius:999px;box-shadow:var(--shadow);padding:4px 6px;display:flex;gap:2px;z-index:4}
.rxpick button{border:0;background:transparent;font-size:20px;border-radius:50%;width:32px;height:32px}.rxpick button:hover{background:var(--surface-2)}
.mwrap{position:relative;min-width:200px}
.skel{width:260px;max-width:100%;height:170px;border-radius:10px;background:linear-gradient(90deg,var(--surface-2),var(--line),var(--surface-2));background-size:200% 100%;animation:sk 1.2s infinite;display:grid;place-items:center;color:var(--muted);font-size:12px}
@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}
.mwrap img{display:block;max-width:100%;max-height:340px;border-radius:10px;cursor:zoom-in;object-fit:contain;background:var(--surface-2)}
.mwrap video{display:block;max-width:100%;max-height:340px;border-radius:10px;background:#000}
.mwrap audio{display:block;width:260px;max-width:100%}
.file{display:flex;gap:12px;align-items:center;padding:10px 12px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;min-width:240px;max-width:100%}
.file .fi{width:40px;height:46px;border-radius:8px;background:var(--brand);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800;flex:0 0 auto}
.fi.pdf{background:#d93025!important}.fi.doc{background:#2563eb!important}.fi.xls{background:#0f9d58!important}.fi.ppt{background:#e8710a!important}
.file .fn{min-width:0;flex:1}.file .fn div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.file .fn small{text-align:left;margin:0}
.file button{border:1px solid var(--line);background:var(--surface);border-radius:50%;width:34px;height:34px;display:grid;place-items:center;color:var(--text);padding:0}
.file button:hover{background:var(--brand-soft)}
.notice{margin:8px 16px 0;padding:8px 12px;border-radius:9px;background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:600}
.compose{display:flex;gap:8px;padding:10px 14px;background:var(--surface);border-top:1px solid var(--line);align-items:flex-end;position:relative}
.compose textarea{flex:1;resize:none;max-height:140px;min-height:42px;background:var(--surface-2);border:1px solid var(--line);border-radius:22px;padding:10px 16px;outline:none}
.compose textarea:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.icon{border:0;background:transparent;color:var(--muted);border-radius:50%;width:42px;height:42px;display:grid;place-items:center;flex:0 0 auto;padding:0}
.icon:hover{background:var(--surface-2);color:var(--text)}
.icon:disabled{opacity:.4;cursor:not-allowed}
.icon.send{background:var(--brand);color:var(--brand-ink)}
.icon.send:hover{filter:brightness(1.1);background:var(--brand)}
.placeholder{flex:1;display:grid;place-items:center;color:var(--muted);text-align:center;padding:20px}
.dropmark{position:absolute;inset:0;background:var(--brand-soft);opacity:.92;display:grid;place-items:center;font-weight:700;color:var(--brand);border:3px dashed var(--brand);z-index:15;border-radius:6px}
.emo{position:absolute;bottom:62px;left:14px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:8px;display:grid;grid-template-columns:repeat(8,34px);gap:2px;z-index:10}
.emo button{border:0;background:transparent;font-size:20px;border-radius:8px;height:34px}.emo button:hover{background:var(--surface-2)}

/* attachment preview + lightbox */
.modal{position:fixed;inset:0;z-index:40;background:rgba(10,12,22,.82);display:flex;flex-direction:column;color:#fff}
.modal .mh{display:flex;align-items:center;gap:12px;padding:12px 16px}
.modal .mh .t{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.modal .mb{flex:1;display:grid;place-items:center;padding:12px;min-height:0}
.modal .mb img,.modal .mb video{max-width:100%;max-height:100%;border-radius:8px;object-fit:contain}
.modal .big{background:#fff;color:#161a2b;border-radius:14px;padding:26px 34px;text-align:center;min-width:260px}
.modal .big .fi{width:64px;height:76px;margin:0 auto 12px;border-radius:10px;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:800}
.modal .mf{display:flex;gap:10px;padding:12px 16px 18px;max-width:760px;width:100%;margin:0 auto}
.modal .mf input{flex:1;background:#fff;color:#161a2b;border:0;border-radius:24px;padding:12px 18px;outline:none}
.modal .icon{color:#fff}.modal .icon:hover{background:rgba(255,255,255,.15);color:#fff}
.modal .icon.send{background:var(--brand);color:var(--brand-ink)}
.adwrap{max-width:900px;margin:16px auto 0}
#camp{margin-top:0}
.adstrip{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--line);font-size:13px;color:var(--muted)}
.adstrip .link{border:0;background:transparent;color:var(--brand);font-weight:600;padding:0}
.adhead,.adr{display:grid;grid-template-columns:128px 1fr 1fr 124px 36px;gap:8px;align-items:center;padding:6px 14px}
.adhead{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding-top:12px}
.adbtns{display:flex;gap:8px;flex-wrap:wrap}
.ccbtn{display:flex;align-items:center;gap:8px;width:100%;background:var(--surface-2);border:1px solid var(--line);border-radius:9px;padding:9px 10px;text-align:left}
.ccbtn:hover,.ccbtn:focus{border-color:var(--brand);outline:none}
.caret{margin-left:auto;color:var(--muted);font-size:11px}
.flag{width:20px;height:15px;border-radius:2px;object-fit:cover;box-shadow:0 0 0 1px var(--line);flex:0 0 auto}
.flagfb{font-size:10px;font-weight:700;color:var(--muted);width:20px;text-align:center}
.ccmenu{position:fixed;z-index:80;width:290px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 30px rgba(10,12,30,.25);padding:8px}
.cclist{max-height:264px;overflow:auto;margin-top:6px}
.ccitem{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;cursor:pointer}
.ccitem:hover,.ccitem.on{background:var(--brand-soft)}
.ccn{flex:1}
.adin{background:var(--surface-2);border:1px solid var(--line);border-radius:9px;padding:9px 11px;outline:none;min-width:0;width:100%}
.adin:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.adreason{grid-column:1/-1;color:var(--bad);font-size:12px;padding:0 2px 4px}
.meter{height:8px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden;margin:0 14px 16px}
.meter i{display:block;height:100%;background:var(--brand);width:0}
@media(max-width:700px){.adhead{display:none}.adr{grid-template-columns:120px 1fr 36px}.adr .adname{grid-column:1/3}}
.rt td{vertical-align:top}
.rt .who{align-items:flex-start}
.rt .nm{max-width:300px;white-space:normal;word-break:break-word}
.sub{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.suberr{display:block;font-size:12px;color:var(--bad);white-space:normal;max-width:240px;margin-top:4px;line-height:1.35}
.byc{max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tag{display:inline-block;background:var(--brand-soft);color:var(--brand);border-radius:6px;padding:1px 8px;font-size:12px;font-weight:600}
.toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 16px;border-radius:10px;box-shadow:var(--shadow);z-index:60;font-weight:600}
@media(max-width:820px){
  .top{padding:10px 12px;gap:10px}.live span{display:none}
  .msgwrap{grid-template-columns:1fr}
  .msgwrap .chat{display:none}.msgwrap.open .side{display:none}.msgwrap.open .chat{display:flex}
  .back{display:inline-block}
  .page{padding:12px}
  .b{max-width:88%}
}

.acct{width:34px;height:34px;border-radius:50%;border:0;background:var(--brand);color:var(--brand-ink);font-weight:700;display:grid;place-items:center;flex:0 0 auto}
.acctmenu{position:fixed;top:56px;right:12px;z-index:70;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 30px rgba(10,12,30,.25);padding:12px;min-width:220px;max-width:calc(100vw - 24px)}
.bnav{display:none}
.tab{white-space:nowrap}
html{-webkit-text-size-adjust:100%}
body{overflow-x:hidden}

@media(max-width:820px){
  body{padding-bottom:calc(62px + env(safe-area-inset-bottom))}
  input,textarea,select,.field,.adin,.ccmenu input{font-size:16px}
  /* top bar: logo + status + account; navigation moves to the bottom bar */
  .top{padding:8px 12px;gap:10px;min-height:52px}
  .tabs{display:none}
  .logo span{font-size:15px}
  .live{gap:10px}.live #upd{display:none}
  /* bottom navigation */
  .bnav{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:30;background:var(--surface);border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom)}
  .bnav button{flex:1;border:0;background:transparent;color:var(--muted);padding:8px 4px 7px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;font-weight:600;position:relative;min-height:56px}
  .bnav button.on{color:var(--brand)}
  .bnav .ic{width:24px;height:24px}
  .bnav .count{position:absolute;top:4px;left:calc(50% + 6px);min-width:18px;font-size:10px;padding:0 5px}
  .page{padding:12px 12px 24px}
  /* dashboard */
  .kpis{grid-template-columns:repeat(2,1fr);gap:10px}
  .kpi{padding:12px 14px}.kpi b{font-size:24px}
  .panel-h{padding:12px;gap:10px}
  .panel-h h2{flex:1 1 100%;margin:0}
  .chips{flex-wrap:nowrap;overflow-x:auto;width:100%;padding-bottom:4px;-webkit-overflow-scrolling:touch}
  .chipbtn{white-space:nowrap;padding:7px 14px}
  .panel-h .field{flex:1 1 0;min-width:0;padding:10px 12px}
  .panel-h .btn{padding:10px 14px}
  .scroll{max-height:none;overflow:visible}
  /* recipients as cards */
  .rt,.rt tbody{display:block;width:100%}.rt thead{display:none}
  .rt tbody{padding:4px 0}
  .rt tr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px 16px;align-items:start;padding:16px 14px;margin:0 0 10px;background:var(--panel,#fff);border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 2px rgba(16,24,40,.05)}
  .rt td{display:block;padding:0;border:0;white-space:normal;text-align:left;min-width:0}
  .rt td:nth-child(1),.rt td:nth-child(2){grid-column:1/-1}
  .rt .nm{max-width:none;font-size:17px;font-weight:700;line-height:1.3}
  .rt .ph{font-size:14px}
  .rt .av.sm{width:44px;height:44px;font-size:15px}
  .rt td:nth-child(2) .pill{font-size:14px;padding:5px 12px}
  .rt td:nth-child(2) .sub{display:inline-block;margin:0 0 0 8px;font-size:13px}
  .suberr{font-size:13.5px;margin-top:8px;padding:8px 10px;background:rgba(220,38,38,.07);border-radius:8px}
  .rt td:nth-child(3),.rt td:nth-child(4),.rt td:nth-child(6){font-size:16px;font-weight:600;color:var(--text)}
  .rt td:nth-child(3),.rt td:nth-child(4){padding-top:12px;border-top:1px solid var(--line)}
  .rt td:nth-child(3){order:3}.rt td:nth-child(4){order:4}.rt td:nth-child(6){order:5}.rt td:nth-child(5){order:6}
  .rt td:nth-child(3):before,.rt td:nth-child(4):before,.rt td:nth-child(6):before{display:block;font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}
  .rt td:nth-child(3):before{content:'Messages sent'}
  .rt td:nth-child(4):before{content:'Sent by'}
  .rt td:nth-child(6):before{content:'Last update'}
  .rt td:nth-child(3) .sub{display:block;font-size:12.5px;font-weight:400;margin:3px 0 0!important;max-width:none!important}
  .rt td:nth-child(6) .sub{display:block;font-size:12.5px;font-weight:400}
  .rt td:nth-child(5) .muted{display:none}
  .rt td:nth-child(5):has(.muted){display:none}
  .rt td:nth-child(5){align-self:end}
  .rt td:nth-child(5) .btn{width:100%;padding:12px 14px;font-size:15px;font-weight:600}
  .rt .byc{max-width:none;display:block;white-space:normal;word-break:break-all;font-size:14px}
  .rt .tag{font-size:14px;padding:3px 10px}
  .rt tr td[colspan]{grid-column:1/-1;text-align:center}
  .suberr{max-width:none}
  /* send advertisement */
  .adwrap .panel-h h2{flex:1 1 100%}
  .adbtns{width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .adbtns .btn{padding:11px 8px;white-space:nowrap}
  #adsend{position:fixed;left:12px;right:12px;bottom:calc(70px + env(safe-area-inset-bottom));z-index:25;padding:14px;font-size:16px;border-radius:12px;box-shadow:0 6px 20px rgba(79,70,229,.35)}
  #vA{padding-bottom:150px}
  .adstrip{padding:10px 12px;flex-wrap:wrap;gap:6px 12px}
  .adstrip .grow{display:none}
  .adhead{display:none}
  .adr{grid-template-columns:116px 1fr 44px;grid-template-areas:"cc num del" "name name name" "chip chip chip" "reason reason reason";gap:0 8px;padding:12px 12px 4px;border-bottom:1px solid var(--line)}
  .adr>*{margin-bottom:8px}
  .adr .ccbtn{grid-area:cc;padding:11px 10px}
  .adr .adnum{grid-area:num;padding:11px}
  .adr .adname{grid-area:name;padding:11px}
  .adr .adx{grid-area:del;width:44px;height:44px}
  .adr .adchip{grid-area:chip}.adr .adchip:empty{display:none}
  .adr .adreason{grid-area:reason;padding:0}
  .ccmenu{left:8px!important;right:8px;top:auto!important;bottom:calc(8px + env(safe-area-inset-bottom));width:auto;max-height:70vh}
  .cclist{max-height:50vh}
  .ccitem{padding:12px 10px}
  /* messages */
  .msgwrap{grid-template-columns:minmax(0,1fr);height:calc(100vh - 52px - 62px - env(safe-area-inset-bottom));height:calc(100dvh - 52px - 62px - env(safe-area-inset-bottom))}
  .side-h{padding:10px}
  .conv{padding:12px}
  .chat-h{padding:8px 10px;gap:10px}
  .chat-h .btn{padding:8px 10px;font-size:13px;white-space:nowrap}
  .chat-h .s{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:48vw}
  .chat-h>div:nth-child(3){min-width:0}
  .adwrap{margin-top:12px}
  .back{display:inline-grid;place-items:center;width:40px;height:40px;padding:0;font-size:22px;line-height:1}
  .stream{padding:12px 10px}
  .b{max-width:88%}
  .act{top:-18px;right:6px}.act button{width:34px;height:32px}
  .rxpick{top:-56px;max-width:calc(100vw - 40px);overflow-x:auto}
  .rxpick button{width:38px;height:38px}
  .compose{padding:8px 8px calc(8px + env(safe-area-inset-bottom));gap:4px}
  .compose .icon{width:40px;height:40px}
  .emo{left:8px;right:8px;grid-template-columns:repeat(8,1fr);bottom:calc(60px + env(safe-area-inset-bottom))}
  .emo button{height:38px;font-size:22px}
  .mwrap{min-width:0}.skel{width:100%}
  .file{min-width:0;width:100%}
  .modal .mf{padding:10px 12px calc(14px + env(safe-area-inset-bottom))}
  .modal .big{min-width:0;width:90%;padding:22px}
  /* hide the bottom bar while a chat is open so the composer owns the bottom */
  body[data-view="M"] .msgwrap.open ~ .bnav,.msgwrap.open{}
}
@media(max-width:820px){body[data-view="M"]:has(.msgwrap.open) .bnav{display:none}body[data-view="M"]:has(.msgwrap.open){padding-bottom:0}.msgwrap.open{height:calc(100dvh - 52px)}}
</style></head>
<body>
<div class="top">
  <div class="logo"><i>K</i><span>Kyoorious WhatsApp</span></div>
  <div class="tabs">
    <button class="tab" id="tA">Send Advertisement</button>
    <button class="tab" id="tD">Recipient Details</button>
    <button class="tab" id="tM">Messages <span class="count hide" id="badge"></span></button>
  </div>
  <div class="grow"></div>
  <div class="live"><i class="dot" id="dot"></i><span id="upd">connecting...</span><button class="acct hide" id="acct" type="button" aria-label="Account"></button></div>
</div>

<div id="vD" class="page">
  <div class="kpis" id="kpis"></div>
  <div class="panel" style="padding:14px">
    <div class="bar" id="bar"></div><div class="legend" id="legend"></div>
  </div>
  <div class="panel">
    <div class="panel-h">
      <h2>Recipient details</h2>
      <div class="chips" id="chips"></div>
      <input class="field" id="q" placeholder="Search name, city, number or sender...">
      <button class="btn" id="csv">Export CSV</button>
    </div>
    <div class="scroll"><table class="rt"><thead id="thead"></thead><tbody id="rows"></tbody></table></div>
  </div>
</div>

<div id="vM" class="msgwrap hide">
  <div class="side">
    <div class="side-h">
      <input class="field" id="cq" placeholder="Search chats...">
      <div class="chips" id="cchips"></div>
    </div>
    <div class="convos" id="convos"></div>
  </div>
  <div class="chat" id="chat">
    <div class="placeholder" id="ph">Select a chat to read and reply</div>
  </div>
</div>
<div id="vA" class="page hide">
<div class="panel adwrap" id="camp">
  <div class="panel-h">
    <h2>Daily campaign</h2><span class="pill hide" id="campstate"></span><span class="muted" id="camptxt"></span>
  </div>
  <div class="adstrip hide" id="campnote"></div>
</div>
<div class="panel adwrap">
  <div class="panel-h">
    <h2>Send Advertisement</h2>
    <div class="adbtns">
      <button class="btn" id="adadd">+ Add number</button>
      <button class="btn" id="adclear">Clear all</button>
      <button class="btn" id="adimport" title="Import numbers from an Excel, Word, CSV or text file">Import</button>
      <button class="btn primary" id="adsend">Send</button>
    </div>
    <input type="file" id="adfile" class="hide" accept=".xlsx,.xls,.csv,.docx,.txt">
  </div>
  <div class="adstrip"><span id="adused"></span><span class="grow"></span><span id="adsumtxt"></span><span id="adprog"></span><span id="advid"></span><button class="link hide" id="advbtn">Replace video</button><input type="file" id="advfile" class="hide" accept="video/mp4"></div>
  <div class="adhead"><span>Country</span><span>Mobile number</span><span>Name (optional)</span><span></span><span></span></div>
  <div id="adlist"></div>
  <div class="meter hide" id="admeter"><i id="adfill"></i></div>
</div></div>
<nav class="bnav" id="bnav">
  <button id="bA" type="button"><svg class="ic" viewBox="0 0 24 24"><path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/></svg><span>Advertise</span></button>
  <button id="bD" type="button"><svg class="ic" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg><span>Recipients</span></button>
  <button id="bM" type="button"><svg class="ic" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg><span>Messages</span><i class="count hide" id="badge2"></i></button>
</nav>
<div id="overlay"></div>

<script>
let KEY='';try{KEY=localStorage.getItem('wa_key')||''}catch(e){}
let ACCESS=false;
function who(e){return String(e||'').split('@')[0];}
function byLabel(e){return e==='campaign'?'Campaign':(e||'');}
const ERRTXT={'131026':'Not on WhatsApp / undeliverable','131049':'Not delivered by WhatsApp (low engagement)','130472':'Blocked by a WhatsApp experiment','131030':'Number not allowed','131047':'24h reply window closed'};
function errText(e){if(!e)return '';const m=/[0-9]{5,6}/.exec(e);return (m&&ERRTXT[m[0]])||e;}
let SHOWN=150;
function ensureKey(){if(ACCESS)return;if(!KEY){KEY=prompt('Admin key')||'';try{localStorage.setItem('wa_key',KEY)}catch(e){}}}
async function api(p,o){ensureKey();o=o||{};o.headers=Object.assign({'x-admin-key':KEY},o.headers||{});
  const r=await fetch(p,o);if(r.status===403){KEY='';try{localStorage.removeItem('wa_key')}catch(e){}throw new Error('Wrong admin key - reload to retry');}return r;}
function el(t,a,...k){const e=document.createElement(t);for(const x in(a||{})){if(x==='class')e.className=a[x];else if(x.startsWith('on'))e[x]=a[x];else e.setAttribute(x,a[x]);}
  for(const c of k){if(c==null||c===false)continue;e.append(c instanceof Node?c:document.createTextNode(String(c)));}return e;}
const $=id=>document.getElementById(id);
function toast(m){const t=el('div',{class:'toast'},m);document.body.append(t);setTimeout(()=>t.remove(),3200);}
const NL=String.fromCharCode(10);

// ---- standard icons (static markup only) ----
const P={
  smile:'<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-10c.83 0 1.5-.67 1.5-1.5S16.33 7 15.5 7 14 7.67 14 8.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 7 8.5 7 7 7.67 7 8.5 7.67 10 8.5 10zm3.5 7.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>',
  clip:'<path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 015 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 005 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>',
  send:'<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>',
  trash:'<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
  close:'<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
  down:'<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>'
};
function ic(n,sm){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('class','ic'+(sm?' sm':''));s.innerHTML=P[n];return s;}
function ibtn(cls,name,title,fn,sm){const b=el('button',{class:cls,title:title,type:'button'});b.append(ic(name,sm));if(fn)b.onclick=fn;return b;}

function phoneFmt(p){const m=/^91([0-9]{5})([0-9]{5})$/.exec(p||'');return m?'+91 '+m[1]+' '+m[2]:'+'+p;}
function ago(t){if(!t)return '';const s=Math.max(0,Date.now()/1000-t);if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return new Date(t*1000).toLocaleDateString([], {day:'numeric',month:'short'});}
function hm(t){return new Date(t*1000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}
function dayLabel(t){const d=new Date(t*1000),n=new Date();if(d.toDateString()===n.toDateString())return 'Today';const y=new Date(n-864e5);if(d.toDateString()===y.toDateString())return 'Yesterday';return d.toLocaleDateString([], {day:'numeric',month:'short',year:'numeric'});}
const COLORS=['#4f46e5','#0f9d58','#d97706','#db2777','#0891b2','#7c3aed','#dc2626','#475569'];
function color(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return COLORS[h%COLORS.length];}
function initials(n,p){const s=(n||'').trim();if(s)return s.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();return p.slice(-2);}
function extOf(n){const m=/[.]([A-Za-z0-9]+)$/.exec(n||'');return m?m[1].toLowerCase():'';}
function fileKind(n){const e=extOf(n);if(e==='pdf')return ['pdf','PDF'];if(['doc','docx','txt','rtf'].includes(e))return ['doc',e.toUpperCase()];if(['xls','xlsx','csv'].includes(e))return ['xls',e.toUpperCase()];if(['ppt','pptx'].includes(e))return ['ppt',e.toUpperCase()];return ['',(e||'FILE').toUpperCase().slice(0,4)];}

// ---------- state ----------
let DATA=null,CONVOS=[],SEL=null,VIEW='D',SORT={k:'last_ts',d:-1},FILTER='all',CFILTER='all',CHATKEY='',STICK=true,OPEN=false;
function show(v){VIEW=v;$('vD').classList.toggle('hide',v!=='D');$('vM').classList.toggle('hide',v!=='M');$('vA').classList.toggle('hide',v!=='A');
  $('tD').classList.toggle('on',v==='D');$('tM').classList.toggle('on',v==='M');$('tA').classList.toggle('on',v==='A');
  $('bD').classList.toggle('on',v==='D');$('bM').classList.toggle('on',v==='M');$('bA').classList.toggle('on',v==='A');
  document.body.setAttribute('data-view',v);window.scrollTo(0,0);
  history.replaceState(null,'',v==='M'?'#messages':v==='D'?'#recipients':'#advertisement');
  if(v==='A')openAd();refresh();}
$('tD').onclick=()=>show('D');$('tM').onclick=()=>show('M');$('tA').onclick=()=>show('A');
$('bD').onclick=()=>show('D');$('bM').onclick=()=>show('M');$('bA').onclick=()=>show('A');

// ---------- dashboard ----------
function kpi(label,val,sub,c){return el('div',{class:'kpi',style:'--c:'+c},el('span',{},label),el('b',{class:'num'},val),sub?el('small',{},sub):null);}
function renderDash(){
  if(!DATA)return;const t=DATA.totals,pend=t.accepted+t.sent,deliv=t.delivered+t.read;
  const pct=n=>t.messages?Math.round(n/t.messages*100)+'%':'-';
  $('kpis').replaceChildren(
    kpi('Messages sent',t.messages,t.recipients+' recipients','var(--brand)'),
    kpi('Delivered',deliv,pct(deliv)+' of sent','var(--ok)'),
    kpi('Read',t.read,pct(t.read)+' of sent','var(--read)'),
    kpi('Pending',pend,'awaiting delivery','var(--warn)'),
    kpi('Failed',t.failed,pct(t.failed)+' of sent','var(--bad)'),
    kpi('Need a reply',DATA.needs_human,DATA.conversations+' conversations','var(--brand)'));
  const seg=[['read',t.read,'var(--read)','Read'],['delivered',t.delivered,'var(--ok)','Delivered'],['pend',pend,'var(--warn)','Pending'],['failed',t.failed,'var(--bad)','Failed'],['untracked',t.untracked,'var(--muted)','No data']];
  $('bar').replaceChildren(...seg.filter(s=>s[1]).map(s=>el('i',{style:'width:'+(s[1]/Math.max(t.messages,1)*100)+'%;background:'+s[2],title:s[3]+': '+s[1]})));
  $('legend').replaceChildren(...seg.map(s=>el('span',{},el('b',{style:'background:'+s[2]}),s[3]+' '+s[1])));
  const lab=r=>(r.latest==='accepted'||r.latest==='sent')?'pending':r.latest;
  const cnt={all:DATA.rows.length,pending:0,delivered:0,read:0,failed:0,untracked:0};
  DATA.rows.forEach(r=>{const l=lab(r);if(cnt[l]!==undefined)cnt[l]++;});
  const CL={all:'All',pending:'Pending',delivered:'Delivered',read:'Read',failed:'Failed',untracked:'No data'};
  $('chips').replaceChildren(...Object.keys(CL).map(f=>el('button',{class:'chipbtn'+(FILTER===f?' on':''),onclick:()=>{FILTER=f;SHOWN=150;renderDash();}},CL[f]+' '+cnt[f])));
  const cols=[['name','Recipient'],['latest','Status'],['messages','Sent',1],['sent_by','Sent by'],['replies','Replies',1],['last_ts','Last update']];
  $('thead').replaceChildren(el('tr',{},...cols.map(c=>el('th',{class:c[2]?'n':'',onclick:()=>{SORT=SORT.k===c[0]?{k:c[0],d:-SORT.d}:{k:c[0],d:(c[0]==='name'||c[0]==='sent_by')?1:-1};renderDash();}},c[1]+(SORT.k===c[0]?(SORT.d>0?' ▲':' ▼'):'')))));
  const q=$('q').value.trim().toLowerCase(),qd=q.replace(/[^0-9]/g,'');
  let rows=DATA.rows.map(r=>Object.assign({},r,{name:r.name||'',city:r.city||'',sent_by:r.sent_by||''})).filter(r=>(FILTER==='all'||lab(r)===FILTER)&&(!q||r.name.toLowerCase().includes(q)||r.city.toLowerCase().includes(q)||r.sent_by.toLowerCase().includes(q)||(qd&&r.phone.includes(qd))));
  rows.sort((a,b)=>{let x=a[SORT.k],y=b[SORT.k];if(SORT.k==='name'){x=(a.name||'~'+a.phone);y=(b.name||'~'+b.phone);}return (typeof x==='string'?x.localeCompare(y):x-y)*SORT.d;});
  const tb=$('rows');tb.replaceChildren();
  if(!rows.length)tb.append(el('tr',{},el('td',{colspan:6,class:'empty'},DATA.rows.length?'No recipients match this filter.':'No messages sent yet.')));
  rows.slice(0,SHOWN).forEach(r=>{
    const edit=async()=>{const v=prompt('Name for '+phoneFmt(r.phone),r.name);if(v===null)return;await api('/api/contact',{method:'POST',body:JSON.stringify({phone:r.phone,name:v})});toast('Saved');refresh();};
    const more=r.messages>1?(r.delivered+r.read)+' delivered, '+r.read+' read'+(r.failed?', '+r.failed+' failed':''):'';
    tb.append(el('tr',{},
      el('td',{},el('div',{class:'who editable',title:'Click to edit name',onclick:edit},el('div',{class:'av sm',style:'background:'+color(r.phone)},initials(r.name,r.phone)),
        el('div',{},el('div',{class:'nm'},r.name?r.name:el('span',{class:'addname'},'Add name')),el('div',{class:'ph num'},phoneFmt(r.phone)+(r.city?' - '+r.city:''))))),
      el('td',{},el('span',{class:'pill '+r.latest,title:r.auto_only?'Only an automated reply received - read receipt ignored':''},r.latest==='accepted'?'queued':(r.latest==='untracked'?'no data':r.latest)),r.auto_only?el('span',{class:'sub'},'auto-reply only'):null,r.last_error?el('span',{class:'suberr',title:r.last_error},errText(r.last_error)):null),
      el('td',{class:'n num'},el('span',{class:'cnt'},r.messages),more?el('span',{class:'sub msub'},more):null),
      el('td',{},r.sent_by?el('span',{class:r.sent_by==='campaign'?'tag':'byc',title:r.sent_by==='campaign'?'Sent automatically by the daily campaign':r.sent_by},byLabel(r.sent_by)):el('span',{class:'muted'},'-')),
      el('td',{class:'n'},r.replies?el('button',{class:'btn',onclick:()=>{show('M');openChat(r.phone);}},'Chat ('+r.replies+')'):el('span',{class:'muted'},'-')),
      el('td',{title:r.last_ts?new Date(r.last_ts*1000).toLocaleString():''},ago(r.last_ts),r.last_ts?el('span',{class:'sub'},new Date(r.last_ts*1000).toLocaleDateString([], {day:'numeric',month:'short'})+', '+hm(r.last_ts)):null)));});
  if(rows.length>SHOWN)tb.append(el('tr',{},el('td',{colspan:6,style:'text-align:center'},el('button',{class:'btn',onclick:()=>{SHOWN+=200;renderDash();}},'Show more ('+(rows.length-SHOWN)+' more)'))));
  ['badge','badge2'].forEach(id=>{const b=$(id);b.textContent=DATA.needs_human;b.classList.toggle('hide',!DATA.needs_human);});
}
$('q').oninput=()=>{SHOWN=150;renderDash();};
$('csv').onclick=()=>{if(!DATA)return;const L=['name,phone,city,messages,delivered,read,failed,latest_status,last_error,sent_by,replies'];
  const qt=x=>'"'+String(x||'').replace(/"/g,'""')+'"';
  DATA.rows.forEach(r=>L.push([qt(r.name),r.phone,qt(r.city),r.messages,r.delivered+r.read,r.read,r.failed,r.latest,qt(r.last_error),qt(byLabel(r.sent_by)),r.replies].join(',')));
  const a=el('a',{href:URL.createObjectURL(new Blob([L.join(NL)],{type:'text/csv'})),download:'recipients.csv'});document.body.append(a);a.click();a.remove();};

// ---------- conversation list ----------
function renderConvos(){
  const q=$('cq').value.toLowerCase().trim(),qd=q.replace(/[^0-9]/g,'');
  const cnt={all:CONVOS.length,new:CONVOS.filter(c=>c.needs_human).length};
  $('cchips').replaceChildren(...[['all','All'],['new','Needs reply']].map(([f,l])=>el('button',{class:'chipbtn'+(CFILTER===f?' on':''),onclick:()=>{CFILTER=f;renderConvos();}},l+' '+cnt[f])));
  const list=CONVOS.filter(c=>(CFILTER==='all'||c.needs_human)&&(!q||(c.name||'').toLowerCase().includes(q)||(qd&&c.phone.includes(qd))||(c.last_body||'').toLowerCase().includes(q)));
  const box=$('convos');box.replaceChildren();
  if(!list.length)box.append(el('div',{class:'empty'},CONVOS.length?'No chats match.':'No replies yet. Customer messages appear here.'));
  list.forEach(c=>box.append(el('div',{class:'conv'+(c.phone===SEL?' sel':''),onclick:()=>openChat(c.phone)},
    el('div',{class:'av',style:'background:'+color(c.phone)},initials(c.name,c.phone)),
    el('div',{class:'cmain'},
      el('div',{class:'crow'},el('span',{class:'cname'},c.name||phoneFmt(c.phone)),el('span',{class:'ctime'},ago(c.last_in_ts))),
      el('div',{class:'cprev'},el('span',{},c.opted_out?'Unsubscribed':(c.last_body||'')),c.needs_human?el('i',{class:'unread',title:'Needs a reply'}):null)))));
}
$('cq').oninput=renderConvos;
async function openChat(phone){SEL=phone;CHATKEY='';$('vM').classList.add('open');renderConvos();await loadChat(true);}

// ---------- media ----------
const BLOBS={};
async function mediaUrl(id){if(BLOBS[id])return BLOBS[id];const r=await api('/api/media?id='+encodeURIComponent(id));if(!r.ok)throw new Error('gone');const u=URL.createObjectURL(await r.blob());BLOBS[id]=u;return u;}
function saveBlob(u,name){const a=el('a',{href:u,download:name||'file'});document.body.append(a);a.click();a.remove();}
function stick(){const s=document.querySelector('.stream');if(s&&STICK)s.scrollTop=s.scrollHeight;}
function lightbox(url,name){
  const close=()=>{$('overlay').replaceChildren();document.removeEventListener('keydown',esc);};
  const esc=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',esc);
  const img=el('img',{src:url,alt:name||''});
  $('overlay').replaceChildren(el('div',{class:'modal',onclick:e=>{if(e.target.classList.contains('mb')||e.target.classList.contains('modal'))close();}},
    el('div',{class:'mh'},ibtn('icon','close','Close',close),el('div',{class:'t'},name||''),ibtn('icon','down','Download',()=>saveBlob(url,name||'image'))),
    el('div',{class:'mb'},img)));
}
function mediaNode(x){
  const m=x.mime||'',h=el('div',{class:'mwrap'});
  const fail=txt=>h.replaceChildren(el('div',{class:'muted'},txt));
  if(m.startsWith('image/')){
    h.append(el('div',{class:'skel'},'Loading image...'));
    mediaUrl(x.media_id).then(u=>{const i=el('img',{alt:x.filename||'image',title:'Click to enlarge'});i.onload=()=>{h.replaceChildren(i);stick();};i.onclick=()=>lightbox(u,x.filename);i.src=u;}).catch(()=>fail('Image no longer available'));
  }else if(m.startsWith('video/')){
    h.append(el('div',{class:'skel'},'Loading video...'));
    mediaUrl(x.media_id).then(u=>{const v=el('video',{controls:'',playsinline:'',preload:'metadata'});v.onloadedmetadata=()=>{h.replaceChildren(v);stick();};v.onerror=()=>fail('Video cannot be played here');v.src=u;}).catch(()=>fail('Video no longer available'));
  }else if(m.startsWith('audio/')){
    h.append(el('div',{class:'skel',style:'height:48px;width:260px'},'Loading audio...'));
    mediaUrl(x.media_id).then(u=>{const a=el('audio',{controls:''});a.src=u;h.replaceChildren(a);stick();}).catch(()=>fail('Audio no longer available'));
  }else{
    const k=fileKind(x.filename);
    const dl=ibtn('','down','Download',async()=>{try{saveBlob(await mediaUrl(x.media_id),x.filename);}catch(e){toast('File no longer available');}},true);
    h.append(el('div',{class:'file'},el('div',{class:'fi '+k[0]},k[1]),el('div',{class:'fn'},el('div',{},x.filename||'File'),el('small',{},(m||'document'))),dl));
  }
  return h;}

// ---------- chat ----------
const EMOJI=['😀','😁','😂','🙂','😉','😊','😍','🙏','👍','👏','🙌','💪','🎉','✨','🔥','❤️','😇','🤝','👋','😅','🤔','😢','😎','🥳','📚','✏️','📝','🎓','🏫','✅','❌','⭐','🌟','💡','📞','📧','🔗','⏰','📅','🚀','🎯','💯','👌','🤗','😄'];
const REACTS=['👍','❤️','😂','😮','😢','🙏'];
let ATT=null;

function bubble(x){
  const has=!!x.media_id,rx=(x.react_in||'')+(x.react_out||'');
  const b=el('div',{class:'b '+x.direction+(x.error?' err':'')+(has?' media':'')+(rx?' has-rx':'')});
  if(x.sender==='auto')b.append(el('div',{class:'tagauto'},'Auto reply'));
  if(x.direction==='out'&&x.sender==='human'&&x.sent_by)b.append(el('div',{class:'tagauto'},'Sent by '+byLabel(x.sent_by)));
  if(x.auto_flag)b.append(el('div',{class:'tagauto'},'Automated message from them'));
  if(has)b.append(mediaNode(x));
  if(x.body)b.append(el('div',{class:has?'cap':''},x.body));
  b.append(el('small',{},hm(x.ts)+(x.error?' - NOT SENT: '+x.error:'')));
  if(rx)b.append(el('div',{class:'rx',title:'Reactions'},rx));
  // hover actions: react (customer messages only) and delete (from this dashboard)
  const act=el('div',{class:'act'});
  if(x.direction==='in'&&x.wamid&&OPEN){
    act.append(ibtn('','smile','React',e=>{e.stopPropagation();
      const old=b.querySelector('.rxpick');if(old){old.remove();act.classList.remove('open');return;}
      act.classList.add('open');
      b.append(el('div',{class:'rxpick'},...REACTS.map(em=>el('button',{type:'button',onclick:async ev=>{ev.stopPropagation();
        try{const r=await api('/api/react',{method:'POST',body:JSON.stringify({phone:SEL,wamid:x.wamid,emoji:x.react_out===em?'':em})});const j=await r.json();if(!r.ok)toast(j.error||'Reaction failed');else refresh(true);}catch(e2){toast(e2.message);}}},em))));},true));
  }
  act.append(ibtn('','trash','Delete from this dashboard (cannot unsend from WhatsApp)',async e=>{e.stopPropagation();
    if(!confirm('Delete this message from the dashboard?'+NL+'It will NOT be removed from the recipient WhatsApp.'))return;
    await api('/api/delete-message',{method:'POST',body:JSON.stringify({id:x.id})});refresh(true);},true));
  b.append(act);
  b.onclick=e=>{if(e.target.closest('.act,.rxpick,img,video,audio,button,a'))return;document.querySelectorAll('.act.open').forEach(x=>{if(x!==act)x.classList.remove('open');});act.classList.toggle('open');};
  return b;}

function closePreview(){ATT=null;$('overlay').replaceChildren();document.removeEventListener('keydown',pvEsc);}
function pvEsc(e){if(e.key==='Escape')closePreview();}
function showPreview(file){
  if(!SEL)return;
  if(!OPEN){toast('The 24h reply window is closed for this chat');return;}
  ATT=file;document.addEventListener('keydown',pvEsc);
  const url=URL.createObjectURL(file),mt=file.type||'';
  let body;
  if(mt.startsWith('image/'))body=el('img',{src:url,alt:file.name});
  else if(mt.startsWith('video/'))body=el('video',{src:url,controls:'',playsinline:''});
  else{const k=fileKind(file.name);body=el('div',{class:'big'},el('div',{class:'fi '+k[0]},k[1]),el('div',{style:'font-weight:700;word-break:break-all'},file.name),el('div',{style:'color:#6a7088'},(file.size/1048576).toFixed(2)+' MB'));}
  const cap=el('input',{placeholder:'Add a caption (optional)',maxlength:'1000'});
  const go=async()=>{send.disabled=true;
    try{const fd=new FormData();fd.append('phone',SEL);fd.append('caption',cap.value);fd.append('file',file);
      const r=await api('/api/send-file',{method:'POST',body:fd});const j=await r.json();
      if(!r.ok){toast(j.error||'Send failed');send.disabled=false;return;}
      closePreview();STICK=true;await refresh(true);}catch(e){toast(e.message);send.disabled=false;}};
  const send=ibtn('icon send','send','Send',go);
  cap.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go();}};
  $('overlay').replaceChildren(el('div',{class:'modal'},
    el('div',{class:'mh'},ibtn('icon','close','Cancel',closePreview),el('div',{class:'t'},file.name),ibtn('icon','trash','Remove attachment',closePreview)),
    el('div',{class:'mb'},body),el('div',{class:'mf'},cap,send)));
  cap.focus();
}

async function loadChat(force){
  if(!SEL)return;const r=await api('/api/chat?phone='+encodeURIComponent(SEL));const d=await r.json();const cv=d.convo||{};
  const sig=JSON.stringify([d.rows.map(x=>x.id+(x.react_in||'')+(x.react_out||'')).join(','),cv.needs_human,cv.opted_out,cv.name,Math.floor(d.now/60)]);
  if(!force&&sig===CHATKEY)return;CHATKEY=sig;
  const chat=$('chat');const keep=chat.querySelector('textarea');const draft=keep?keep.value:'';const hadFocus=keep&&document.activeElement===keep;
  const oldS=chat.querySelector('.stream');const near=!oldS||(oldS.scrollHeight-oldS.scrollTop-oldS.clientHeight<140);
  OPEN=(d.now-(cv.last_in_ts||0))<86400&&!cv.opted_out;
  const stream=el('div',{class:'stream'});let last='';
  d.rows.forEach(x=>{const dl=dayLabel(x.ts);if(dl!==last){stream.append(el('div',{class:'day'},dl));last=dl;}stream.append(bubble(x));});
  stream.onscroll=()=>{STICK=stream.scrollHeight-stream.scrollTop-stream.clientHeight<140;};
  const ta=el('textarea',{placeholder:OPEN?'Type a message':'Reply window closed',rows:'1'});ta.value=draft;ta.disabled=!OPEN;
  const send=ibtn('icon send','send','Send',null);send.disabled=!OPEN;
  const doSend=async()=>{const v=ta.value.trim();if(!v)return;send.disabled=true;
    try{const rr=await api('/api/reply',{method:'POST',body:JSON.stringify({phone:SEL,text:v})});const j=await rr.json();
      if(!rr.ok){toast(j.error||'Send failed');send.disabled=false;return;}ta.value='';STICK=true;await refresh(true);}catch(e){toast(e.message);send.disabled=false;}};
  send.onclick=doSend;
  ta.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doSend();}};
  ta.oninput=()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,140)+'px';};
  ta.onpaste=e=>{const f=[...(e.clipboardData&&e.clipboardData.files||[])][0];if(f){e.preventDefault();showPreview(f);}};
  const fin=el('input',{type:'file',class:'hide'});
  fin.onchange=()=>{if(fin.files[0])showPreview(fin.files[0]);fin.value='';};
  const clip=ibtn('icon','clip','Attach photo, video or file',()=>fin.click());clip.disabled=!OPEN;
  const emo=el('div',{class:'emo hide'},...EMOJI.map(e=>el('button',{type:'button',onclick:()=>{ta.setRangeText(e,ta.selectionStart,ta.selectionEnd,'end');ta.focus();}},e)));
  const face=ibtn('icon','smile','Emoji',()=>emo.classList.toggle('hide'));face.disabled=!OPEN;
  const head=el('div',{class:'chat-h'},
    el('button',{class:'btn back',onclick:()=>{$('vM').classList.remove('open');SEL=null;renderConvos();}},'‹'),
    el('div',{class:'av',style:'background:'+color(SEL)},initials(cv.name,SEL)),
    el('div',{},el('div',{class:'t'},cv.name||phoneFmt(SEL)),el('div',{class:'s'},phoneFmt(SEL)+' - last message '+ago(cv.last_in_ts))),
    el('div',{class:'grow'}),
    cv.needs_human?el('button',{class:'btn',onclick:async()=>{await api('/api/toggle',{method:'POST',body:JSON.stringify({phone:SEL,needs_human:false})});refresh(true);}},'Mark handled'):null);
  const notice=cv.opted_out?el('div',{class:'notice'},'This person unsubscribed. Do not message them.'):(!OPEN?el('div',{class:'notice'},'More than 24 hours since their last message. WhatsApp only allows an approved template now.'):null);
  chat.replaceChildren(head,...(notice?[notice]:[]),stream,el('div',{class:'compose'},fin,emo,face,clip,ta,send));
  STICK=force||near;stick();setTimeout(stick,120);if(hadFocus||force)ta.focus();
}
// drag & drop a file onto the chat
(function(){const c=$('chat');let n=0,mark=null;
  c.addEventListener('dragenter',e=>{if(!SEL)return;e.preventDefault();n++;if(!mark){mark=el('div',{class:'dropmark'},'Drop to send');c.append(mark);}});
  c.addEventListener('dragover',e=>{if(SEL)e.preventDefault();});
  c.addEventListener('dragleave',()=>{n--;if(n<=0&&mark){mark.remove();mark=null;n=0;}});
  c.addEventListener('drop',e=>{e.preventDefault();n=0;if(mark){mark.remove();mark=null;}const f=e.dataTransfer&&e.dataTransfer.files[0];if(f)showPreview(f);});})();

// ---------- send advertisement ----------
const AD={rows:[],info:null,sentSet:new Set(),optout:new Set(),sending:false,timer:null};
let ADID=0;
const COUNTRIES=[['IN','India','91'],['AF','Afghanistan','93'],['AU','Australia','61'],['AT','Austria','43'],['BH','Bahrain','973'],['BD','Bangladesh','880'],['BE','Belgium','32'],['BT','Bhutan','975'],['BR','Brazil','55'],['BG','Bulgaria','359'],['CA','Canada','1'],['CL','Chile','56'],['CN','China','86'],['CO','Colombia','57'],['HR','Croatia','385'],['CY','Cyprus','357'],['CZ','Czechia','420'],['DK','Denmark','45'],['EG','Egypt','20'],['EE','Estonia','372'],['ET','Ethiopia','251'],['FJ','Fiji','679'],['FI','Finland','358'],['FR','France','33'],['DE','Germany','49'],['GH','Ghana','233'],['GR','Greece','30'],['HK','Hong Kong','852'],['HU','Hungary','36'],['IS','Iceland','354'],['ID','Indonesia','62'],['IR','Iran','98'],['IQ','Iraq','964'],['IE','Ireland','353'],['IL','Israel','972'],['IT','Italy','39'],['JP','Japan','81'],['JO','Jordan','962'],['KZ','Kazakhstan','7'],['KE','Kenya','254'],['KW','Kuwait','965'],['LV','Latvia','371'],['LB','Lebanon','961'],['LT','Lithuania','370'],['LU','Luxembourg','352'],['MY','Malaysia','60'],['MV','Maldives','960'],['MU','Mauritius','230'],['MX','Mexico','52'],['MA','Morocco','212'],['MM','Myanmar','95'],['NP','Nepal','977'],['NL','Netherlands','31'],['NZ','New Zealand','64'],['NG','Nigeria','234'],['NO','Norway','47'],['OM','Oman','968'],['PK','Pakistan','92'],['PE','Peru','51'],['PH','Philippines','63'],['PL','Poland','48'],['PT','Portugal','351'],['QA','Qatar','974'],['RO','Romania','40'],['RU','Russia','7'],['SA','Saudi Arabia','966'],['RS','Serbia','381'],['SG','Singapore','65'],['SK','Slovakia','421'],['SI','Slovenia','386'],['ZA','South Africa','27'],['KR','South Korea','82'],['ES','Spain','34'],['LK','Sri Lanka','94'],['SE','Sweden','46'],['CH','Switzerland','41'],['TW','Taiwan','886'],['TZ','Tanzania','255'],['TH','Thailand','66'],['TR','Turkey','90'],['UG','Uganda','256'],['UA','Ukraine','380'],['AE','United Arab Emirates','971'],['GB','United Kingdom','44'],['US','United States','1'],['UZ','Uzbekistan','998'],['VN','Vietnam','84'],['YE','Yemen','967'],['ZM','Zambia','260'],['ZW','Zimbabwe','263']];
const CC_BY_DIAL={};COUNTRIES.forEach(c=>{if(!CC_BY_DIAL[c[2]])CC_BY_DIAL[c[2]]=c[0];});
const CCS=Object.keys(CC_BY_DIAL);
function flagImg(iso){const i=el('img',{class:'flag',src:'https://flagcdn.com/w40/'+iso.toLowerCase()+'.png',alt:iso,loading:'lazy'});i.onerror=()=>{i.replaceWith(el('span',{class:'flagfb'},iso));};return i;}
function closeCc(){const m=document.getElementById('ccmenu');if(m)m.remove();document.removeEventListener('click',closeCc);}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCc();});
function openCcMenu(anchor,cur,onPick){
  closeCc();const b=anchor.getBoundingClientRect();
  const top=(b.bottom+330>window.innerHeight&&b.top>340)?b.top-334:b.bottom+4;
  const menu=el('div',{id:'ccmenu',class:'ccmenu',style:'left:'+Math.max(8,Math.min(b.left,window.innerWidth-300))+'px;top:'+top+'px'});
  const q=el('input',{class:'adin',placeholder:'Search country or code'});
  const list=el('div',{class:'cclist'});
  const fill=()=>{const t=q.value.trim().toLowerCase().replace('+','');
    list.replaceChildren(...COUNTRIES.filter(c=>!t||c[1].toLowerCase().includes(t)||c[2].startsWith(t)).map(c=>
      el('div',{class:'ccitem'+(c[0]===cur?' on':''),onclick:()=>{closeCc();onPick(c);}},flagImg(c[0]),el('span',{class:'ccn'},c[1]),el('span',{class:'muted'},'+'+c[2]))));};
  q.oninput=fill;fill();menu.append(q,list);menu.onclick=e=>e.stopPropagation();document.body.append(menu);
  setTimeout(()=>{document.addEventListener('click',closeCc);q.focus();},0);
}
const digits=x=>String(x||'').replace(/[^0-9]/g,'');
const newRow=(cc,num,name,iso)=>({id:++ADID,cc:cc||'91',iso:iso||CC_BY_DIAL[cc||'91']||'IN',num:num||'',name:name||'',state:'',note:''});
const fullPhone=r=>digits(r.cc)+digits(r.num);
function validRow(r){const c=digits(r.cc),n=digits(r.num);if(!c||!n)return false;if(c==='91')return /^[6-9][0-9]{9}$/.test(n);return n.length>=6&&(c+n).length<=15;}
const ADST={new:['Ready','read'],ok:['Sent','delivered'],sent:['Already sent','untracked'],dup:['Duplicate','untracked'],invalid:['Invalid','failed'],optout:['Unsubscribed','failed'],cap:['Over limit','sent'],failed:['Failed','failed'],skipped:['Skipped','sent']};

// ---- reading numbers out of pasted text / Excel / Word ----
function splitIntl(d,plus){
  if(plus||d.length>10){
    if(d.startsWith('91')&&d.length===12)return {cc:'91',num:d.slice(2)};
    for(const L of [3,2,1]){const cc=d.slice(0,L);if(CCS.includes(cc)){const rest=d.slice(L);if(rest.length>=6&&rest.length<=12)return {cc:cc,num:rest};}}
    return null;}
  if(d.length===10)return {cc:'91',num:d};
  if(d.length===11&&d[0]==='0')return {cc:'91',num:d.slice(1)};
  return null;}
const SKIP_NAME=/^(s[.]? ?no[.]?|sr[.]?|#|whatsapp|number|city|name|coaching|teacher|mobile|phone|contact)([ /]|$)/i;
function entriesFromTable(table){
  const out=[];
  table.forEach(row=>{
    const phones=[];let name='';
    row.forEach(cell=>{
      const t=String(cell==null?'':cell).trim();if(!t)return;
      const re=/[+]?[0-9][0-9 ()-]{6,18}[0-9]/g;let m,rest=t,found=false;
      while((m=re.exec(t))){
        const raw=m[0],plus=raw[0]==='+';let d=digits(raw);
        if(!plus){const tk=raw.trim().split(/[ -]+/);if(tk.length>1&&tk[0].length<=3&&tk[0]!=='91'&&digits(tk.slice(1).join('')).length===10)d=digits(tk.slice(1).join(''));}
        if(d.length<8)continue;
        const sp=splitIntl(d,plus);if(!sp)continue;
        phones.push(sp);rest=rest.replace(raw,' ');found=true;
      }
      if(found)rest=rest.replace(/[,;|]+/g,' ').replace(/ +/g,' ').trim().replace(/^[0-9]+[.)]? /,'').replace(/^[-:]+ ?/,'').replace(/ ?[-:]+$/,'').trim();
      if(!name&&/[A-Za-z]{2,}/.test(rest)&&!SKIP_NAME.test(rest))name=rest.slice(0,120);
    });
    const seen=new Set();
    phones.forEach(p=>{const k=p.cc+p.num;if(seen.has(k))return;seen.add(k);out.push({cc:p.cc,num:p.num,name:name});});
  });
  return out;
}
const entriesFromText=t=>entriesFromTable(t.split(NL).map(l=>[l]));
const LIBS={xlsx:['XLSX','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'],mammoth:['mammoth','https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js']};
function loadLib(k){return new Promise((ok,no)=>{if(window[LIBS[k][0]])return ok();const sc=el('script',{src:LIBS[k][1]});sc.onload=ok;sc.onerror=()=>no(new Error('Could not load the file reader. Check your internet connection.'));document.head.append(sc);});}
async function importFile(f){
  const name=f.name.toLowerCase(),table=[];
  try{
    if(/[.](xlsx|xls|csv)$/.test(name)){
      await loadLib('xlsx');const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});
      wb.SheetNames.forEach(sn=>XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:false,defval:''}).forEach(r=>table.push(r.map(String))));
    }else if(/[.]docx$/.test(name)){
      await loadLib('mammoth');const res=await mammoth.convertToHtml({arrayBuffer:await f.arrayBuffer()});
      const doc=new DOMParser().parseFromString(res.value,'text/html');
      doc.querySelectorAll('tr').forEach(tr=>table.push([...tr.children].map(c=>c.textContent.trim())));
      doc.querySelectorAll('p,li').forEach(x=>{if(!x.closest('table'))table.push([x.textContent.trim()]);});
    }else if(/[.]txt$/.test(name)){(await f.text()).split(NL).forEach(l=>table.push([l]));}
    else{toast('Use an Excel (.xlsx), Word (.docx), CSV or text file. Save old .doc files as .docx first.');return;}
  }catch(e){toast(e.message||'Could not read this file');return;}
  const ents=entriesFromTable(table);
  if(!ents.length){toast('No phone numbers found in this file');return;}
  addEntries(ents);toast('Added '+Math.min(ents.length,1000)+' number'+(ents.length>1?'s':''));
}

// ---- rows ----
function addEntries(ents,afterRow){
  let idx=AD.rows.length;
  if(afterRow){idx=AD.rows.indexOf(afterRow);if(!afterRow.num){AD.rows.splice(idx,1);}else idx++;}
  else if(AD.rows.length===1&&!AD.rows[0].num){AD.rows=[];idx=0;}
  AD.rows.splice(idx,0,...ents.slice(0,1000).map(e=>newRow(e.cc,e.num,e.name)));
  if(ents.length>1000)toast('Only the first 1000 numbers were added');
  if(!AD.rows.length)AD.rows.push(newRow());
  renderAd(true);scheduleCheck();
}
function rowEl(r){
  const ccb=el('button',{class:'ccbtn',type:'button','aria-label':'Country code'});
  const paint=()=>ccb.replaceChildren(flagImg(r.iso),el('span',{},'+'+r.cc),el('span',{class:'caret'},'▾'));
  paint();
  ccb.onclick=e=>{e.stopPropagation();openCcMenu(ccb,r.iso,c=>{r.iso=c[0];r.cc=c[2];paint();changed();});};
  const num=el('input',{class:'adin adnum',inputmode:'tel',placeholder:'Mobile number','aria-label':'Mobile number'});num.value=r.num;
  const nm=el('input',{class:'adin adname',placeholder:'Name (optional)'});nm.value=r.name;
  const chip=el('span',{class:'hide'}),reason=el('div',{class:'adreason hide'});
  const del=ibtn('icon adx','close','Remove',()=>{AD.rows=AD.rows.filter(x=>x!==r);if(!AD.rows.length)AD.rows.push(newRow());renderAd(true);scheduleCheck();},true);
  num.oninput=()=>{r.num=num.value.replace(/[^0-9 -]/g,'');if(num.value!==r.num)num.value=r.num;changed();};
  nm.oninput=()=>{r.name=nm.value;};
  num.onpaste=e=>{const t=(e.clipboardData||window.clipboardData).getData('text');
    if(t.indexOf(NL)>=0||/^ *[+]/.test(t)||entriesFromText(t).length>1){const ents=entriesFromText(t);if(ents.length){e.preventDefault();addEntries(ents,r);}}};
  const next=e=>{if(e.key==='Enter'){e.preventDefault();const nr=newRow(r.cc,'','',r.iso);AD.rows.splice(AD.rows.indexOf(r)+1,0,nr);renderAd(true);nr.numInput.focus();}};
  num.onkeydown=next;nm.onkeydown=next;
  r.chip=chip;r.reason=reason;r.numInput=num;
  return el('div',{class:'adr'},ccb,num,nm,el('div',{class:'adchip'},chip),del,reason);
}
function classifyAd(){
  const seen=new Set();let cap=AD.info?AD.info.remaining:0;
  AD.rows.forEach(r=>{
    if(r.result)return;
    if(!digits(r.num)){r.state='';r.note='';return;}
    if(!validRow(r)){r.state='invalid';r.note=digits(r.cc)==='91'?'Indian mobile numbers have 10 digits starting with 6-9':'Check the country code and number';return;}
    const p=fullPhone(r);
    if(seen.has(p)){r.state='dup';r.note='Repeated in this list';return;}
    seen.add(p);
    if(AD.optout.has(p)){r.state='optout';r.note='Asked not to be messaged';return;}
    if(AD.sentSet.has(p)){r.state='sent';r.note='Ad already sent earlier';return;}
    if(cap<=0){r.state='cap';r.note='Over the 24h limit - send later';return;}
    cap--;r.state='new';r.note='';
  });
}
function updateChips(){AD.rows.forEach(r=>{if(!r.chip)return;const st=ADST[r.state];const show=st&&r.state!=='new';
  r.chip.parentNode.style.display=show?'':'none';r.chip.className=show?'pill '+st[1]:'hide';r.chip.textContent=show?st[0]:'';r.chip.title=r.note||'';
  r.reason.textContent=r.state==='failed'?r.note:'';r.reason.classList.toggle('hide',r.state!=='failed');});}
function updateSummary(){
  const cnt={};AD.rows.forEach(r=>{if(r.state)cnt[r.state]=(cnt[r.state]||0)+1;});
  const n=cnt.new||0,skip=(cnt.sent||0)+(cnt.dup||0)+(cnt.invalid||0)+(cnt.optout||0)+(cnt.cap||0);
  $('adsumtxt').textContent=(n?n+' ready':'')+(skip?(n?' - ':'')+skip+' will be skipped':'');
  const b=$('adsend');b.textContent=n?'Send to '+n:'Send';b.disabled=AD.sending||!n||!(AD.info&&AD.info.video_set);
  b.title=AD.info&&!AD.info.video_set?'Upload the ad video first':'';
}
function renderAd(structural){
  if(structural)$('adlist').replaceChildren(...AD.rows.map(rowEl));
  classifyAd();updateChips();updateSummary();
}
function changed(){classifyAd();updateChips();updateSummary();scheduleCheck();}
function scheduleCheck(){clearTimeout(AD.timer);AD.timer=setTimeout(checkAd,400);}
async function checkAd(){
  const phones=[...new Set(AD.rows.filter(r=>!r.result&&validRow(r)).map(fullPhone))];
  if(phones.length){try{const j=await (await api('/api/ad-check',{method:'POST',body:JSON.stringify({phones})})).json();AD.sentSet=new Set(j.sent);AD.optout=new Set(j.optout);}catch(e){toast(e.message);}}
  renderAd(false);
}
function renderAdInfo(){
  const i=AD.info;if(!i)return;
  const days=i.video_ts?Math.floor((i.now-i.video_ts)/86400):null;
  $('adused').textContent=i.used+' of '+i.cap+' sent in the last 24h';
  const bad=!i.video_set||days>=25;
  const v=$('advid');v.textContent=bad?(!i.video_set?'Ad video missing':'Ad video is '+days+' days old, replace it soon'):'';
  v.style.color='var(--bad)';$('advbtn').classList.toggle('hide',!bad);
}
async function loadAdInfo(){try{AD.info=await (await api('/api/ad-info')).json();renderAdInfo();renderAd(false);}catch(e){toast(e.message);}}
function openAd(){loadCamp();if(!AD.rows.length)AD.rows.push(newRow());renderAd(true);loadAdInfo();scheduleCheck();}
$('adadd').onclick=()=>{const nr=newRow();AD.rows.push(nr);renderAd(true);nr.numInput.focus();};
$('adclear').onclick=()=>{if(AD.rows.some(r=>r.num)&&!confirm('Clear all numbers?'))return;AD.rows=[newRow()];$('adprog').textContent='';$('admeter').classList.add('hide');renderAd(true);};
$('adimport').onclick=()=>$('adfile').click();
$('adfile').onchange=()=>{const f=$('adfile').files[0];$('adfile').value='';if(f)importFile(f);};
$('advbtn').onclick=()=>$('advfile').click();
$('advfile').onchange=async()=>{const f=$('advfile').files[0];$('advfile').value='';if(!f)return;
  const fd=new FormData();fd.append('file',f);toast('Uploading video...');
  try{const r=await api('/api/ad-video',{method:'POST',body:fd});const j=await r.json();if(!r.ok){toast(j.error||'Upload failed');return;}toast('Ad video updated');loadAdInfo();}catch(e){toast(e.message);}};
$('adsend').onclick=async()=>{
  const todo=AD.rows.filter(r=>r.state==='new');if(!todo.length)return;
  if(!confirm('Send the advertisement to '+todo.length+' number'+(todo.length>1?'s':'')+' now?'+NL+NL+'This cannot be undone.'))return;
  AD.sending=true;updateSummary();$('admeter').classList.remove('hide');$('adfill').style.width='0';
  let done=0,ok=0,bad=0;
  for(let i=0;i<todo.length;i+=15){
    const chunk=todo.slice(i,i+15);
    try{
      const r=await api('/api/send-ad',{method:'POST',body:JSON.stringify({items:chunk.map(x=>({phone:fullPhone(x),name:x.name}))})});const j=await r.json();
      if(!r.ok){toast(j.error||'Sending stopped');break;}
      j.results.forEach(res=>{const row=chunk.find(x=>fullPhone(x)===res.phone);if(!row)return;row.result=res;
        if(res.ok){row.state='ok';row.note='Accepted by WhatsApp';ok++;}else if(res.skipped){row.state='skipped';row.note=res.skipped;}else{row.state='failed';row.note=res.error;bad++;}});
    }catch(e){toast(e.message);break;}
    done+=chunk.length;$('adfill').style.width=(done/todo.length*100)+'%';$('adprog').textContent='Sent '+done+' of '+todo.length+'...';updateChips();
  }
  AD.sending=false;$('adprog').textContent='Done: '+ok+' accepted'+(bad?', '+bad+' failed':'')+'. Delivery status appears on the Dashboard.';
  updateChips();await loadAdInfo();refresh();
};

// ---------- daily campaign card (read-only status) ----------
let CAMP=null;
function renderCamp(){
  const c=CAMP;if(!c)return;
  const st=$('campstate');st.classList.remove('hide');
  const cls=c.state==='running'?'delivered':c.state==='finished'?'read':(c.reason?'failed':'sent');
  st.className='pill '+cls;st.textContent=c.state==='running'?'Running':c.state==='finished'?'Finished':'Paused';
  $('camptxt').textContent=c.pending+' waiting - today '+c.today+' of '+c.lot_size;
  let note='';
  if(c.state==='paused'&&c.reason)note='Paused: '+c.reason;
  else if(c.state==='finished')note='All numbers in the queue have been sent.';
  const n=$('campnote');n.textContent=note;n.classList.toggle('hide',!note);n.style.color=note.startsWith('Paused')?'var(--bad)':'';
}
async function loadCamp(){try{CAMP=await (await api('/api/campaign')).json();renderCamp();}catch(e){}}

// ---------- account ----------
function setAcct(email){
  const b=$('acct');b.textContent=(email||'?')[0].toUpperCase();b.classList.remove('hide');
  b.onclick=e=>{e.stopPropagation();const old=document.getElementById('acctmenu');if(old){old.remove();return;}
    const m=el('div',{id:'acctmenu',class:'acctmenu'},el('div',{class:'muted',style:'font-size:12px'},'Signed in as'),el('div',{style:'font-weight:600;word-break:break-all;margin-bottom:8px'},email),
      el('a',{class:'btn',href:'/cdn-cgi/access/logout',style:'display:block;text-align:center;text-decoration:none;color:var(--text)'},'Sign out'));
    m.onclick=ev=>ev.stopPropagation();document.body.append(m);setTimeout(()=>document.addEventListener('click',function f(){m.remove();document.removeEventListener('click',f);}),0);};
}

// ---------- refresh loop ----------
async function refresh(force){
  try{
    const r=await api('/api/dashboard');DATA=await r.json();renderDash();
    if(VIEW==='M'){const c=await (await api('/api/convos')).json();CONVOS=c.rows;renderConvos();await loadChat(!!force);}
    if(VIEW==='A')loadCamp();
    $('upd').textContent='Live - updated '+new Date().toLocaleTimeString();$('dot').classList.remove('off');
  }catch(e){$('upd').textContent=e.message;$('dot').classList.add('off');}
}
(async()=>{
  try{const j=await (await fetch('/api/me')).json();if(j.via==='access'){ACCESS=true;setAcct(j.email);}}catch(e){}
  show(location.hash==='#messages'?'M':location.hash==='#recipients'?'D':'A');setInterval(()=>{if(!document.hidden)refresh();},8000);
})();
</script></body></html>`;
