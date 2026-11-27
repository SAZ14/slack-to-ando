"""Convert the MSR 2020 "Software-related Slack Chats with Disentangled Conversations"
dataset (Chatterjee et al.) into standard Slack workspace exports, one zip per community.

Dataset: https://github.com/preethac/Software-related-Slack-Chats-with-Disentangled-Conversations

The dataset stores flat channel history as XML. Messages carry a conversation_id from the
authors' automatic disentanglement. Slack exports group replies into threads, so each
conversation becomes one thread: its first message is the parent, the rest are replies.
User names are already anonymized in the dataset; they are mapped to stable Slack-style ids.

    python3 scripts/convert_msr2020.py <dataset-repo>/data <out-dir>
"""
import collections
import datetime as dt
import html
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile


def ts_of(iso):
    t = dt.datetime.fromisoformat(iso).replace(tzinfo=dt.timezone.utc)
    return f"{t.timestamp():.6f}"


def convert(data_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for community in sorted(os.listdir(data_dir)):
        cdir = os.path.join(data_dir, community)
        if not os.path.isdir(cdir):
            continue
        users = {}
        uid = lambda n: users.setdefault(n, f"U{len(users) + 1:06d}")
        days = collections.defaultdict(list)  # (channel, YYYY-MM-DD) -> messages
        channels = set()
        total = 0
        for year in sorted(os.listdir(cdir)):
            for f in sorted(os.listdir(os.path.join(cdir, year))):
                root = ET.parse(os.path.join(cdir, year, f)).getroot()
                channel = root.findtext("channel_name") or re.sub(r"^merged-[^-]+-|\.xml$", "", f)
                channels.add(channel)
                parents = {}
                for m in root.iter("message"):
                    user, text, iso = m.findtext("user"), m.findtext("text") or "", m.findtext("ts")
                    if not user or not iso:
                        continue
                    ts = ts_of(iso)
                    # Mentions are stored as <@Name>; map them to user ids like a real export.
                    text = re.sub(r"<@([^>|]+)>", lambda x: f"<@{uid(x.group(1).strip())}>", html.unescape(text))
                    msg = {"type": "message", "user": uid(user), "text": text, "ts": ts}
                    key = (f, year, m.get("conversation_id"))
                    if key in parents:
                        msg["thread_ts"] = parents[key]["ts"]
                        parents[key]["reply_count"] = parents[key].get("reply_count", 0) + 1
                    else:
                        parents[key] = msg
                    days[(channel, iso[:10])].append(msg)
                    total += 1
        for p_msgs in days.values():
            for msg in p_msgs:
                if msg.get("reply_count"):
                    msg["thread_ts"] = msg["ts"]
        zpath = os.path.join(out_dir, f"{community}-slack-export.zip")
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("users.json", json.dumps([{"id": i, "name": n, "real_name": n, "profile": {"real_name": n}} for n, i in users.items()]))
            z.writestr("channels.json", json.dumps([{"id": f"C{k:04d}", "name": c} for k, c in enumerate(sorted(channels))]))
            for (channel, day), msgs in sorted(days.items()):
                msgs.sort(key=lambda m: float(m["ts"]))
                z.writestr(f"{channel}/{day}.json", json.dumps(msgs))
        print(f"{community}: {total} messages, {len(users)} users, {len(channels)} channels -> {zpath}")


if __name__ == "__main__":
    convert(sys.argv[1], sys.argv[2])
