"""Generate a synthetic Slack workspace export for an invented company, Northwind.

The output follows Slack's standard export layout:
    users.json, channels.json, <channel>/<YYYY-MM-DD>.json

Every person, message and link is invented. The workspace is shaped so the
audit and the wiki have something real to find: repeat questions that get
substantive thread answers, ownership that changes hands mid-export, and
decisions posted in channels.

    python3 sample/generate_export.py            # writes sample/northwind-slack-export.zip
"""
import datetime as dt
import json
import os
import random
import shutil
import tempfile
import zipfile

random.seed(42)
HERE = os.path.dirname(os.path.abspath(__file__))
ZIP_OUT = os.path.join(HERE, "northwind-slack-export.zip")
WEEKS = 6
END = dt.datetime(2026, 11, 20, tzinfo=dt.timezone.utc)

USERS = [
    ("U01A", "maya", "Maya Chen", "Eng lead"), ("U02B", "dev", "Dev Patel", "Backend"),
    ("U03C", "priya", "Priya Rao", "PM"), ("U04D", "tom", "Tom Okafor", "Design"),
    ("U05E", "lena", "Lena Weiss", "Support lead"), ("U06F", "sam", "Sam Ortiz", "CEO"),
    ("U07G", "jo", "Jo Kim", "Support"), ("U08H", "arjun", "Arjun Mehta", "Infra"),
    ("U09J", "nina", "Nina Rossi", "Frontend"), ("U10K", "felix", "Felix Braun", "Sales"),
    ("U11L", "aisha", "Aisha Bello", "Ops"), ("U12M", "leo", "Leo Park", "Data"),
]
U = {u[1]: u[0] for u in USERS}


def at(k):
    return f"<@{U[k]}>"


def gh(repo="api"):
    return f"<https://github.com/northwind/{repo}/pull/{random.randint(200, 999)}>"


def notion(slug, label):
    return f"<https://www.notion.so/northwind/{slug}|{label}>"


def linear(n):
    return f"<https://linear.app/northwind/issue/NW-{n}|NW-{n}>"


R = random.choice

# Knowledge the team keeps re-asking for. Each fact: channel, paraphrased
# questions, who answers, and answers (optionally different before/after a
# cutover week, to model ownership changing hands).
FACTS = [
    dict(ch="engineering", q=["who owns the billing service now?", "who owns billing these days?", "anyone know who owns the billing service?"],
         early=("dev", ["that's me, I own billing for now", "me, I own the billing service"]),
         late=("maya", [f"billing moved to infra last week, {at('arjun')} owns it now", f"{at('arjun')} owns billing now since the infra move"]),
         cut=3, w=3),
    dict(ch="engineering", q=["how do I run the integration tests locally?", "how do we run integration tests locally again?", "how do I run integration tests on my machine?"],
         a=("maya", [f"`make test-int`, needs docker running. full steps in {notion('testing-guide-81', 'Testing guide')}", "run `make test-int` with docker up, the testing guide in notion has the rest"]), w=3),
    dict(ch="engineering", q=["does anyone know why the CI cache keeps missing?", "anyone know why CI is so slow today?", "is CI slow for anyone else today?"],
         a=("arjun", [f"cache keys changed after the node 22 upgrade, fix is in {linear(412)}", "it's the cache keys after the node upgrade, I'm fixing it this week"]), w=3),
    dict(ch="engineering", q=["who is on call for payments this week?", "who's on call for payments?"],
         a=("maya", [f"{at('dev')} is on call for payments through end of month", f"{at('dev')} has payments on-call this month"]), w=1),
    dict(ch="incidents", q=["anyone know if the payments alert is real?", "is the payments error alert real or noise?"],
         a=("arjun", [f"real if error rate is over 2% for 5 min, otherwise noise. runbook: {notion('payments-runbook-22', 'Payments runbook')}"]), w=2),
    dict(ch="product", q=["where's the latest spec for onboarding v2?", "where is the onboarding v2 spec?", "does anyone have the onboarding v2 spec?"],
         a=("priya", [f"latest spec is here: {notion('onboarding-v2-spec-17', 'Onboarding v2 spec')}", f"it's in notion: {notion('onboarding-v2-spec-17', 'Onboarding v2 spec')}"]), w=3),
    dict(ch="product", q=["what did we decide on the free trial?", "what did we decide about the trial length?", f"{at('priya')} what did we decide on trials in the call?"],
         a=("priya", [f"decided: 14-day trial, no card required. notes in {notion('trials-decision-40', 'Trials decision')}", "we decided on a 14-day trial with no credit card"]), w=2),
    dict(ch="product", q=["who owns the pricing page copy?", "any update on the pricing page copy?"],
         a=("tom", ["I own the pricing page copy, draft is going out friday"]), w=1),
    dict(ch="product", q=["can someone pull signup numbers from posthog?", "could someone pull this week's signups from posthog?"],
         a=("leo", ["I own the signups dashboard, it's here: <https://us.posthog.com/project/northwind/dashboard/88|Signups dashboard>"]), w=2),
    dict(ch="support", q=["does anyone know how to reset SSO for a customer?", "how do I reset a customer's SSO config?", "how do we reset SSO for an enterprise account?"],
         a=("lena", ["Admin → Org settings → SSO → Reset config. Needs the owner role, and use the SSO-reset macro to tell the customer", "Admin → Org settings → SSO → Reset config, owner role only. macro is SSO-reset"]), w=3),
    dict(ch="support", q=["where's the refund policy doc?", "where is the refund policy written down?", "what's our refund policy again?"],
         a=("lena", [f"full refund within 30 days, prorated after that. doc: {notion('refund-policy-09', 'Refund policy')}"]), w=3),
    dict(ch="support", q=["can someone check why acme can't export CSVs?", "anyone know why CSV export is failing for customers?"],
         a=("dev", [f"known bug with large exports, fix is in {gh()}, ships thursday"]), w=2),
    dict(ch="design", q=["does anyone have the figma login for the old brand file?", "where's the figma login?"],
         a=("tom", ["it's in 1Password under Design"]), w=1),
    dict(ch="sales", q=["where is the SOC 2 report for prospects?", "where's the latest security questionnaire?"],
         a=("felix", [f"both are in {notion('trust-folder-55', 'Trust folder')}, share the report only after an NDA"]), w=2),
    dict(ch="general", q=["where's the wifi password for the new office?", "does anyone know the wifi password?"],
         a=("aisha", ["it's in 1Password under Office"]), w=1),
]

# Standalone posts: decisions and ownership statements, posted once on a given workday.
POSTS = [
    ("engineering", 4, "maya", "Decision: we're dropping the old job queue and moving to SQS by Dec 15"),
    ("engineering", 12, "maya", f"{at('nina')} owns the design system components now"),
    ("engineering", 20, "arjun", "I'm taking over the deploy pipeline from Dev starting today"),
    ("incidents", 9, "arjun", "decision from the postmortem: every deploy goes behind a feature flag from now on"),
    ("product", 6, "priya", "Decision: going with option B for the new empty state"),
    ("product", 17, "sam", "we decided to push the mobile app to Q1 and focus on onboarding"),
    ("sales", 11, "sam", "we decided to offer annual plans with 2 months free"),
    ("support", 14, "lena", f"{at('jo')} owns the enterprise support queue starting next week"),
    ("general", 8, "aisha", "decided: the offsite is Jan 22–24 in Austin"),
]

# Ordinary traffic per channel: (members, daily rate, chatter).
CHANNELS = {
    "engineering": ("maya dev arjun nina leo sam".split(), 11, [
        lambda: f"can someone review my PR? {gh()}", lambda: f"could someone take a look at {gh('web')} before EOD",
        lambda: "merged, thanks", lambda: "pushing the migration after lunch", lambda: "nice catch", lambda: "lgtm",
        lambda: "pairing on the cache layer this afternoon if anyone wants in", lambda: linear(random.randint(100, 999)),
        lambda: gh(), lambda: "benchmarks look good, p95 down 40ms", lambda: "rewrote the retry logic, much simpler now"]),
    "incidents": ("arjun dev maya aisha".split(), 3, [
        lambda: "is the checkout API down? seeing 500s", lambda: "any update on the latency spike?",
        lambda: "rolled back, error rate back to normal", lambda: "status: mitigated, watching for 30 min",
        lambda: f"{at('arjun')} can you check sentry? <https://sentry.io/organizations/northwind/issues/{random.randint(10**6, 10**7)}/>"]),
    "product": ("priya tom sam nina felix leo".split(), 6, [
        lambda: "weekly update: shipped saved views, started trials experiment", lambda: linear(random.randint(100, 999)),
        lambda: "I like option B, the empty state is much clearer", lambda: "talked to 3 customers today, all of them want CSV export"]),
    "design": ("tom nina priya".split(), 3, [
        lambda: "new empty states are up in figma", lambda: "tightened the spacing on settings", lambda: "love this direction",
        lambda: f"{at('tom')} can you export the new icons?"]),
    "support": ("lena jo felix dev".split(), 7, [
        lambda: "closed 14 tickets today", lambda: "customer says thanks for the quick fix", lambda: "macro for the export bug is updated",
        lambda: "queue is clear", lambda: f"{at('lena')} can you look at the northstar ticket? they are blocked"]),
    "standup": ("maya dev priya tom lena jo arjun nina leo".split(), 8, [
        lambda: f"yesterday: {R(['finished auth refactor', 'fixed export bug', 'wrote trial spec', 'user interviews', 'infra cost review'])}. "
                f"today: {R(['billing tests', 'pricing copy', 'SSO docs', 'perf work', 'dashboard queries'])}. blocked: {R(['none', 'none', 'waiting on review'])}",
        lambda: "standup: still on the cache layer, no blockers", lambda: "eod update: shipped the fix, writing tests tomorrow"]),
    "sales": ("felix sam priya".split(), 3, [
        lambda: "acme signed!", lambda: "pipeline review notes are in notion", lambda: "great call with globex",
        lambda: f"{at('priya')} can you join the acme demo thursday?"]),
    "general": ([u[1] for u in USERS], 3, [
        lambda: "lunch is here", lambda: "welcome Leo!", lambda: "offsite photos are up", lambda: "happy friday all", lambda: "great demo today team"]),
}
GENERIC = ["on it", "I'll dm you", "looking", "same question as last week, check the thread above", "+1, would like to know too"]


def msg(user, text, ts, **kw):
    return {"type": "message", "user": U[user], "text": text, "ts": f"{ts:.6f}", **kw}


def main():
    days = [END - dt.timedelta(days=i) for i in range(WEEKS * 7)][::-1]
    workdays = [d for d in days if d.weekday() < 5]
    by_day = {}

    def put(ch, d, m):
        by_day.setdefault((ch, d.strftime("%Y-%m-%d")), []).append(m)

    for wi, d in enumerate(workdays):
        week = wi // 5 + 1
        base = d.timestamp()
        for ch, (who, rate, chatter) in CHANNELS.items():
            for _ in range(max(0, int(random.gauss(rate, rate * 0.3)))):
                u = R(who)
                m = msg(u, R(chatter)(), base + random.randint(9 * 3600, 18 * 3600) + random.random())
                if random.random() < 0.05:
                    m.update(subtype="file_share", files=[{"name": "screenshot.png"}])
                put(ch, d, m)
                if "?" in m["text"] and random.random() < 0.6:
                    put(ch, d, msg(R(who), R(GENERIC), float(m["ts"]) + 600, thread_ts=m["ts"]))
            if ch == "engineering":
                for _ in range(random.randint(1, 3)):
                    put(ch, d, {"type": "message", "subtype": "bot_message", "bot_id": "B01GH", "username": "GitHub",
                                "text": "Deploy succeeded: api@main", "ts": f"{base + random.randint(30000, 60000):.6f}"})
        for f in FACTS:
            if random.random() > 0.18 * f["w"]:
                continue
            who = CHANNELS[f["ch"]][0]
            ans_user, answers = (f["late"] if week > f["cut"] else f["early"]) if "cut" in f else f["a"]
            asker = R([w for w in who if w != ans_user] or who)
            ts = base + random.randint(9 * 3600, 17 * 3600) + random.random()
            q = msg(asker, R(f["q"]), ts)
            replies = []
            if random.random() < 0.3:
                replies.append(msg(R([w for w in who if w not in (asker, ans_user)] or who), R(GENERIC), ts + 240, thread_ts=q["ts"]))
            if random.random() < 0.85:
                replies.append(msg(ans_user, R(answers), ts + 900 + random.randint(0, 3000), thread_ts=q["ts"]))
            if replies:
                q.update(thread_ts=q["ts"], reply_count=len(replies), reply_users=sorted({r["user"] for r in replies}))
            put(f["ch"], d, q)
            for r in replies:
                put(f["ch"], d, r)
        for ch, n, user, text in POSTS:
            if wi == n:
                put(ch, d, msg(user, text, base + 11 * 3600 + random.random()))

    tmp = tempfile.mkdtemp()
    root = os.path.join(tmp, "northwind-slack-export")
    os.makedirs(root)
    with open(os.path.join(root, "users.json"), "w") as fh:
        json.dump([{"id": i, "name": n, "real_name": r, "deleted": False, "is_bot": False,
                    "profile": {"real_name": r, "display_name": n, "title": t}} for i, n, r, t in USERS], fh, indent=1)
    with open(os.path.join(root, "channels.json"), "w") as fh:
        json.dump([{"id": f"C0{k:02d}NW", "name": ch, "created": 1700000000, "creator": U["sam"], "is_archived": False,
                    "members": [U[w] for w in CHANNELS[ch][0]], "topic": {"value": ""}, "purpose": {"value": ""}}
                   for k, ch in enumerate(CHANNELS)], fh, indent=1)
    for f in ("integration_logs.json", "dms.json", "mpims.json"):
        with open(os.path.join(root, f), "w") as fh:
            json.dump([], fh)
    total = 0
    for (ch, day), msgs in sorted(by_day.items()):
        os.makedirs(os.path.join(root, ch), exist_ok=True)
        msgs.sort(key=lambda m: float(m["ts"]))
        total += len(msgs)
        with open(os.path.join(root, ch, f"{day}.json"), "w") as fh:
            json.dump(msgs, fh, indent=1)
    with zipfile.ZipFile(ZIP_OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for dirpath, _, files in os.walk(root):
            for f in sorted(files):
                p = os.path.join(dirpath, f)
                z.write(p, os.path.relpath(p, tmp))
    shutil.rmtree(tmp)
    print(f"wrote {ZIP_OUT}: {total} messages")


if __name__ == "__main__":
    main()
