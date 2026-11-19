"""Send the WhatsApp template teacher_free_practice_offer_v2 to numbers in a CSV.

Env vars: WA_TOKEN, WA_PHONE_ID, WA_VIDEO_URL
Usage: py wa_bulk_send.py contacts.csv [--dry-run] [--limit N]
"""
import argparse, csv, os, re, sys, time
import requests

TEMPLATE = "teacher_free_practice_offer_v2"
LANG_CODE = "en"          # change to en_US if Meta returns error 132001
API = "https://graph.facebook.com/v21.0"
DAILY_CAP = 250
DELAY = 0.5               # seconds between sends


def normalize(raw):
    d = re.sub(r"\D", "", raw or "")
    if len(d) == 10:
        d = "91" + d
    if d.startswith("0") and len(d) == 11:
        d = "91" + d[1:]
    return d if 11 <= len(d) <= 15 else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_file")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int)
    a = ap.parse_args()

    token = os.environ.get("WA_TOKEN")
    phone_id = os.environ.get("WA_PHONE_ID")
    video = os.environ.get("WA_VIDEO_URL")
    video_id = os.environ.get("WA_VIDEO_ID")  # uploaded media id (preferred)
    if not a.dry_run and not (token and phone_id and (video or video_id)):
        sys.exit("Set WA_TOKEN, WA_PHONE_ID and WA_VIDEO_ID (or WA_VIDEO_URL) first.")

    seen, rows = set(), []
    with open(a.csv_file, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            n = normalize(r.get("phone"))
            if not n:
                print("SKIP invalid:", r.get("phone"))
            elif n not in seen:
                seen.add(n)
                rows.append(n)
    limit = min(a.limit or DAILY_CAP, DAILY_CAP)
    rows = rows[:limit]
    print(f"{len(rows)} recipients (cap {DAILY_CAP}/24h)")
    if a.dry_run:
        for n in rows:
            print("DRY", n)
        return

    with open("results.csv", "a", newline="", encoding="utf-8") as out:
        w = csv.writer(out)
        for n in rows:
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
            r = requests.post(f"{API}/{phone_id}/messages", json=body,
                              headers={"Authorization": f"Bearer {token}"}, timeout=30)
            print(n, r.status_code, r.text[:200])
            w.writerow([time.strftime("%F %T"), n, r.status_code, r.text])
            out.flush()
            time.sleep(DELAY)


if __name__ == "__main__":
    main()
