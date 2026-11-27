# Evaluation on real Slack data

Until this test, slack-to-ando had only run on a synthetic workspace I generated with known answers. This is the first run on real Slack chat. It found real bugs, which are fixed below, and it shows where the approach is strong and where it's weak.

## Corpus

[Software-related Slack Chats with Disentangled Conversations](https://github.com/preethac/Software-related-Slack-Chats-with-Disentangled-Conversations) (Chatterjee, Damevski, Kraft, Pollock, MSR 2020). It contains about two years (2017–2019) of public Slack Q&A channels from four communities:

| Community | Channels | Messages | People | Weeks |
|---|---|---:|---:|---:|
| racket | general | 22,172 | 351 | 108 |
| clojurians | clojure | 72,973 | 2,125 | 102 |
| pythondev | help | 106,262 | 2,720 | 103 |
| elmlang | general, beginners | 258,658 | 4,011 | 103 |
| **Total** | 5 | **460,065** | 9,207 | |

**Conversion.** The dataset is flat XML, not a Slack export. Each message carries a `conversation_id` from the authors' *automatic* disentanglement. [`scripts/convert_msr2020.py`](scripts/convert_msr2020.py) turns each conversation into a Slack thread (first message as the parent, the rest as replies) and writes one standard export zip per community. Errors in that automatic grouping show up as answers taken from the wrong conversation. Real Slack threads don't have that problem.

**How this differs from a company workspace.** These are public help channels full of strangers. There's little ownership talk, few team decisions and no status updates, so the corpus mostly tests repeat-question detection and answer extraction. It barely tests "who owns what" or the relay-work audit.

## Speed

| Export | Messages | Node (parse + audit + wiki) | Chrome (drop zip → rendered) | Heap |
|---|---:|---:|---:|---:|
| pythondev | 106k | 0.9 s | 0.9 s | 59 MB |
| elmlang | 259k | 3.1 s | 2.3 s | 129 MB |

Before the fixes, repeat-question grouping compared every question to every group, which took 7 s on clojurians alone and would have frozen a browser on elmlang. It now uses an inverted index.

## Accuracy

Each sample was drawn at random from all four communities and judged by one annotator. **Every judgment is published**, so anyone can re-check it:

| What | Held-out result | Labels |
|---|---|---|
| Repeat-question groups: do the questions really ask the same thing? | **12 / 33 = 36%** strict, about 45% counting near-duplicates | [eval/repeat-questions-labeled.md](eval/repeat-questions-labeled.md) |
| Wiki answers: does the chosen reply answer the question? | **18 / 33 = 55%** (was 6 / 33 = 18% before the fix below) | [eval/faq-answers-labeled.md](eval/faq-answers-labeled.md) |
| Owners: is the claim a real ownership statement? | 2 of 3 found in elmlang. The rest of the corpus has almost none | `node scripts/sample-corpus.mjs od 0` |

"Held-out" means the accuracy figures come from fresh random samples (seeds 123 and 777) drawn *after* tuning, not from the examples used to tune. On the tuning sample, repeat-question precision looked like 63%. The held-out 36% is the honest figure.

Recall (how many real repeats or answers were missed) was **not** measured. That would need a fully labeled subset.

## What real data broke, and the fixes

| Problem found | Example | Fix |
|---|---|---|
| Owner detection was 0 / 25 on racket | "when I **run** `raco setup`…" read as "owns raco setup" | Dropped "run" and "handle" as ownership verbs. Rejected code, questions, hypotheticals and "I own a/your…". |
| Question detection caught only 165 of 2,364 new threads | missed "Is there a way…", "Can I…", "Why does…" | Added real question shapes, gated on a "?". Detection went up 3.5–5×. |
| Repeat grouping too strict and too slow | 3 groups in 73k clojurians messages, 7 s | Switched to TF-IDF cosine with an inverted index, and stripped code blocks, greetings and help-seeking filler. |
| Follow-ups grouped as "repeat questions" | "what's the exact error?" × 2 | Skipped @-replies and questions aimed at "you" that don't also address "anyone". |
| Wiki answers took the *last* reply | "cool :)", "had no idea there was a limit" | Scored replies by overlap with the question, links or code, early position and @-addressing the asker. No entry is made when nothing scores as an answer. Accuracy went from 18% to 55%. |
| "agreed :)" counted as a decision | the emoji's colon looked like "Decision:" | Required a real statement after the colon. |
| Owner labels were URLs | "<https://www" | Named the linked thing instead (`rollup-plugin-elm`). |

The synthetic-workspace tests (`npm test`) still pass after every fix, so behavior on company-style data is unchanged.

## Remaining failure modes

1. **Lexical, not semantic.** Grouping matches words, not meaning. It finds reposts and close paraphrases ("equivalent of `lein deps` with deps.edn" asked twice), but it misses "same question, different words" and sometimes merges questions that share a library name. The clear next step is sentence embeddings, run in the browser, to keep the no-upload guarantee.
2. **Dataset grouping noise.** About a quarter of the wrong answers came from a different conversation that the dataset's automatic grouping merged in.
3. **Little ownership or decision signal in public communities.** Those extractors need a company workspace to be tested properly.

## Reproduce

```bash
git clone https://github.com/preethac/Software-related-Slack-Chats-with-Disentangled-Conversations msr2020
python3 scripts/convert_msr2020.py msr2020/data corpus-exports
node scripts/run-corpus.mjs corpus-exports/elmlang-slack-export.zip
EXPORTS=corpus-exports SEED=123 node scripts/sample-corpus.mjs clusters 10   # repeat-question sample
EXPORTS=corpus-exports SEED=777 node scripts/sample-corpus.mjs faq 10        # wiki-answer sample
```

The converted exports aren't committed. They're derived from the dataset, so regenerate them with the script.
