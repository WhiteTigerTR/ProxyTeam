# VekilEkip: a three-session way of working with Claude Code

*Vekil* means proxy or delegate in Turkish; *ekip* means team, hence the repository name ProxyTeam. The full guide is in Turkish: [README.md](README.md).

> **Status: experimental.** This is an experience report, not a product. It was used by one person on two projects
> over a few days. The benefits below are goals, not measured results. What the author observed (not measured):
> fewer interruptions, decisions on record, work that moved faster and in order. Whether it costs more or fewer tokens
> than a single session has not been measured: three sessions and subagents push the total up, small and frequently
> cleared contexts push it down. The kit now keeps the records needed to measure cost and gain (a short measurement block in every
> task file, plus a script that reads session logs). The first measurement entry is published on Friday
> 4 December 2026, and the next three on the following Fridays, in [OLCUM-GUNLUGU.md](OLCUM-GUNLUGU.md).
> Most building blocks (lead and worker sessions, git worktrees, a separate reviewer, handoff notes) are known
> practices. What this kit adds is how they are combined, plus a handful of rules. One rule came from a real
> incident; the others were written against risks the author anticipated.

## What this kit contributes

**What seems original, as far as we could find:** the proxy. Lead-and-developer setups are known; in them the human
talks to the lead and every decision still comes back to the human. Here a separate session makes routine decisions
on the owner's behalf. What it may decide is written down, every decision it makes is logged, and everything beyond
that boundary goes to the owner.

**Four things it tries to make people notice:**

1. **The bottleneck is often the human, not the model.** When every small decision waits for you, the work moves at
   your pace. The question is not "how fast is the model" but "which decisions are really mine".
2. **The human's word is also a claim.** The owner said "I logged in"; it was passed on without a record and turned
   out to be wrong. Verification applies to everyone in the chain, not only to the model.
3. **Whoever did the work describes it optimistically.** Hence evidence, and a reviewer who has not seen the
   conclusion. That reviewer is the same model: it reduces the blind spot, it does not remove it.
4. **Claiming without measuring is easy.** This kit also started out saying "it made things faster". Measuring after
   the fact showed how much the numbers depend on definitions, and the claim was withdrawn. A
   [measurement log](OLCUM-GUNLUGU.md) took its place.

## The idea

Three Claude Code sessions, one line of communication:

```
Owner → Proxy (vekil) → Lead (lider) → Developer (geliştirici)
```

- **The owner talks only to the proxy.** The proxy makes routine decisions on the owner's behalf and logs each
  one as a "proxy decision". Money, secrets, deleting data, anything sent outside, anything hard to undo, and
  final visual approval stay with the owner.
- **The lead** splits work into task files, reviews, merges, deploys, and runs the independent reviewer.
- **The developer** only writes code, on its own branch in its own git worktree.
- **The repository is the shared memory, not the chat.** Status, decisions and tasks live in files, and each file
  (in the task file, each section) has exactly one writer: the lead writes the status file, the developer writes
  its report and handoff note into its task file, the proxy writes decision records and its own report.

## What is in the kit

| Piece | What it does |
|---|---|
| `kurulum/kur.sh` | Interactive installer. Copies templates and tools into a project; never overwrites (writes `.yeni` files instead). |
| `araclar/mola.mjs` | "Take a break" check. Blocks the break if a worktree has uncommitted changes, a known long-running process is still running, or a deploy is in progress. Warns (without blocking, by default) if the lead's handoff note was not committed in the last 30 minutes, if there are stashes, or if commits are not pushed. Exit 0 means safe to stop. It never kills anything. |
| `araclar/canli.mjs` | Production gate. Each project sets who decides on production deploys: the owner (default) or the proxy. With "owner", the owner approves one specific commit in their own interactive terminal; the approval is valid for 24 hours, and the deploy step deletes it afterwards with `canli.mjs kullan` so it cannot be reused (if that step is skipped, the approval stays valid for the same commit until it expires). With "proxy", no approval is needed and the proxy logs each deploy as a decision. |
| `araclar/olcum.py` | Measurement. Counts messages, decisions, subagent calls, commits and tokens per role from session logs and git history, and estimates active time: the owner's, each role's, the team's, and the team's while the owner was away. Numbers only; no message text. |
| `sablonlar/` | Templates: the team section for `CLAUDE.md`, status file, decision record, task file, proxy report, role prompts, the blind-review prompt, incident log, weekly retro. |
| `sablonlar/ornekler/` | Examples that are not installed: an approval hook (lets the owner approve a production deploy by typing one exact sentence into a session, so it works from a phone; off by default and not yet tried in a live session), a role hook (blocks the proxy from editing files other than its report and decision records and from merging or pushing; blocks the developer from changing files or committing on the production branch and from spawning subagents; blocks every session from writing the production approval). It matches tool calls and common shell patterns, so indirect writes can slip through, a secret-protection hook, a deploy lock. |
| `ornek/` | A filled-in example from an invented project. |

## Rules

- **No "it works" without evidence.** Every claim comes with a log, a screenshot or a number.
- **The owner's own "I logged in" is also a claim.** It is verified against a record (which environment, which
  version) before being passed on. This is the one rule that came from a real incident.
- **Not one degree of optimism.** Reports say what the screenshot shows: "fixed in three places, still broken in one".
- **Blind review.** Before acceptance the lead gives a fresh subagent only the material (screenshots, criteria,
  the sentence in the report), never its own conclusion. Deterministic checks come first; for risky decisions a
  different model is preferred, because the same model shares the same blind spots.
- **A deploy is never interrupted.** A break waits for it, or the previous version is restored.
- **Secrets are read only by tools.** Sessions may check that a secret file exists (`test -s`, `wc -c`), never print it.

## Known limits

- Evidence is thin: one user, two projects, a few days, no single-session baseline yet.
- Token cost against a single session is unknown. Three sessions plus subagents add to it; small, frequently cleared contexts reduce it. The net effect has not been measured.
- Without the example hooks, the role rules are only text in a prompt. The hooks are not installed by default and
  match patterns; they are a seat belt, not a lock. In particular, with production set to "owner" but no role hook
  installed, a session could still write the approval file by hand. The hook logic is covered by tests but has not
  been used in live sessions for long.
- The blind reviewer is the same model as the author. A clean context reduces anchoring on the author's reasoning;
  it does not remove the model's own blind spots.
- The chain is long: information changes hands twice between owner and developer, and the lead is a bottleneck.
- It depends on Claude Code sessions being able to message each other. If that changes, the owner carries the
  messages by hand; the files in the repository keep working. Claude Code's own experimental agent teams feature
  offers a similar lead-and-teammates setup; compare and pick what fits.
- The multi-account option exists to use accounts you already own in different roles. It is not meant for getting
  around usage limits; each account's own terms apply.

## Related work

This kit is not an invention. A short web search on 25 November 2026 showed that most parts are known:
lead-and-teammate sessions ([Claude Code agent teams](https://code.claude.com/docs/en/agent-teams), experimental);
a single agent the human talks to ([Gas Town](https://github.com/steveyegge/gastown)'s Mayor); escalation lists for
what goes to the human ([example](https://github.com/MarcusJellinghaus/mcp_coder/issues/1058)); safe pause with a
checked handoff note ([handoff skill](https://github.com/h102-log/handoff)); and fresh-context reviewers
([guide](https://www.augmentcode.com/guides/adversarial-code-review)). The Turkish README has a comparison table.
What seems specific here, as far as we could find: a proxy session separate from the lead that makes routine
decisions on the owner's behalf, and presenting the outcome as an open question tracked in a measurement log rather
than as a claim. If you know prior work we missed, please open an issue.

## Platform

Written on macOS. Tests, installer and break check were also run on Ubuntu 24.04. On Windows, use WSL. A native
Windows path exists in the break check (PowerShell) but is untested. Needs git, bash, Node.js 18+, and Python 3 for
the measurement tool. Documentation, prompts and identifiers are in Turkish.

## Tests

```bash
node --test araclar/mola.test.mjs araclar/canli.test.mjs sablonlar/ornekler/kanca.test.mjs
python3 araclar/olcum_test.py
```

32 Node tests and 7 Python tests; they pass on macOS (the Node tests also on Ubuntu 24.04).

## License

MIT. See [LICENSE](LICENSE).
