"""Send the WhatsApp template teacher_free_practice_offer_v2 to numbers in a CSV.

Env vars: WA_TOKEN, WA_PHONE_ID, WA_VIDEO_ID (uploaded media id) or WA_VIDEO_URL
Usage:
  py wa_bulk_send.py contacts.csv [--dry-run] [--limit N]
  py wa_bulk_send.py --failures            # list numbers whose send failed
  py wa_bulk_send.py contacts.csv --retry-failed   # also retry previous failures

results.csv is the ledger (time, phone, http_status, response). A number with a
200 is never sent again; failures are retried only with --retry-failed.
"""
import argparse, csv, os, re, sys, time
from datetime import datetime, timedelta
import requests

TEMPLATE = "teacher_free_practice_offer_v2"
LANG_CODE = "en"          # change to en_US if Meta returns error 132001
API = "https://graph.facebook.com/v21.0"
DAILY_CAP = 250
DELAY = 0.5               # seconds between sends
LEDGER = "results.csv"


def normalize(raw):
    d = re.sub(r"\D", "", raw or "")
    if len(d) == 10:
        d = "91" + d
    if d.startswith("0") and len(d) == 11:
        d = "91" + d[1:]
    return d if 11 <= len(d) <= 15 else None


def load_ledger():
    """Return (sent set, failed dict phone->last response, sent in last 24h)."""
    sent, failed, recent = set(), {}, 0
    if not os.path.exists(LEDGER):
        return sent, failed, recent
    cutoff = datetime.now() - timedelta(hours=24)
    with open(LEDGER, newline="", encoding="utf-8") as f:
        for row in csv.reader(f):
            if len(row) < 3:
                continue
            ts, phone, status = row[0], row[1], row[2]
            if status == "200":
                sent.add(phone)
                failed.pop(phone, None)
                try:
                    if datetime.strptime(ts, "%Y-%m-%d %H:%M:%S") >= cutoff:
                        recent += 1
                except ValueError:
                    pass
            elif phone not in sent:
                failed[phone] = row[3][:150] if len(row) > 3 else ""
    return sent, failed, recent


def push_sent(phone, text, name=""):
    """Register a successful send with the dashboard (optional)."""
    base, key = os.environ.get("WA_WEBHOOK_URL"), os.environ.get("WA_ADMIN_KEY")
    if not (base and key):
        return
    try:
        wamid = requests.models.complexjson.loads(text)["messages"][0]["id"]
        requests.post(f"{base}/api/sent", headers={"x-admin-key": key, "User-Agent": "Mozilla/5.0"},
                      json={"items": [{"wamid": wamid, "phone": phone, "ts": int(time.time()), "name": name}]}, timeout=15)
    except Exception:
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_file", nargs="?")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--retry-failed", action="store_true")
    ap.add_argument("--failures", action="store_true")
    ap.add_argument("--force", action="store_true", help="resend even if already sent (tests only)")
    a = ap.parse_args()

    sent, failed, recent = load_ledger()
    if a.failures:
        print(f"{len(failed)} failed numbers:")
        for p, err in failed.items():
            print(p, err)
        return
    if not a.csv_file:
        sys.exit("Give a contacts csv.")

    token = os.environ.get("WA_TOKEN")
    phone_id = os.environ.get("WA_PHONE_ID")
    video = os.environ.get("WA_VIDEO_URL")
    video_id = os.environ.get("WA_VIDEO_ID")
    if not a.dry_run and not (token and phone_id and (video or video_id)):
        sys.exit("Set WA_TOKEN, WA_PHONE_ID and WA_VIDEO_ID (or WA_VIDEO_URL) first.")

    seen, todo, names = set(), [], {}
    dup_sent = dup_file = invalid = 0
    with open(a.csv_file, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            n = normalize(r.get("phone"))
            if not n:
                invalid += 1
                print("SKIP invalid:", r.get("phone"))
            elif n in seen:
                dup_file += 1
            elif n in sent and not a.force:
                dup_sent += 1
                seen.add(n)
            elif n in failed and not a.retry_failed:
                seen.add(n)
                print("SKIP previously failed (use --retry-failed):", n)
            else:
                seen.add(n)
                todo.append(n)
                names[n] = (r.get("name") or "").strip()

    room = max(DAILY_CAP - recent, 0)
    limit = min(a.limit or room, room)
    skipped_cap = max(len(todo) - limit, 0)
    todo = todo[:limit]
    print(f"new: {len(todo)} | already sent: {dup_sent} | dup in file: {dup_file} "
          f"| invalid: {invalid} | over 24h cap (not sent): {skipped_cap} "
          f"| sent last 24h: {recent}/{DAILY_CAP}")
    if a.dry_run:
        for n in todo:
            print("DRY", n)
        return

    ok = bad = 0
    with open(LEDGER, "a", newline="", encoding="utf-8") as out:
        w = csv.writer(out)
        for n in todo:
            body = {
                "messaging_product": "whatsapp",
                "to": n,
                "type": "template",
                "template": {
                    "name": TEMPLATE,
                    "language": {"code": LANG_CODE},
                    "components": [{
                        "type": "header",
                        "parameters": [{"type": "video", "video": (
                            {"id": video_id} if video_id else {"link": video})}],
                    }],
                },
            }
            try:
                r = requests.post(f"{API}/{phone_id}/messages", json=body,
                                  headers={"Authorization": f"Bearer {token}"}, timeout=30)
                code, text = str(r.status_code), r.text
            except requests.RequestException as e:
                code, text = "EXC", str(e)
            if code == "200":
                push_sent(n, text, names.get(n, ""))
            ok += code == "200"
            bad += code != "200"
            print(n, code, text[:120])
            w.writerow([time.strftime("%Y-%m-%d %H:%M:%S"), n, code, text.replace("\n", " ")])
            out.flush()
            time.sleep(DELAY)
    print(f"done: {ok} accepted, {bad} failed. Run with --failures to list failures.")


if __name__ == "__main__":
    main()
