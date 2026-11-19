"""Download delivery statuses from the webhook Worker into delivery_status.csv.

Env vars: WA_WEBHOOK_URL (e.g. https://kyoorious-wa-webhook.<acct>.workers.dev), WA_ADMIN_KEY
Usage: py wa_pull_status.py
Prints a summary and lists numbers whose final status is failed.
"""
import csv, os, sys
import requests

base, key = os.environ.get("WA_WEBHOOK_URL"), os.environ.get("WA_ADMIN_KEY")
if not (base and key):
    sys.exit("Set WA_WEBHOOK_URL and WA_ADMIN_KEY first.")
rows = requests.get(f"{base}/statuses", params={"key": key}, headers={"User-Agent": "Mozilla/5.0"}, timeout=60).json()
rank = {"sent": 1, "delivered": 2, "read": 3, "failed": 9}
final = {}
for r in rows:
    p = r["phone"]
    if p not in final or rank.get(r["status"], 0) > rank.get(final[p]["status"], 0):
        final[p] = r
with open("delivery_status.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["phone", "status", "error_code", "error", "timestamp"])
    for r in final.values():
        w.writerow([r["phone"], r["status"], r["error_code"], r["error"], r["ts"]])
counts = {}
for r in final.values():
    counts[r["status"]] = counts.get(r["status"], 0) + 1
print(counts)
for r in final.values():
    if r["status"] == "failed":
        print("FAILED", r["phone"], r["error_code"], r["error"])
