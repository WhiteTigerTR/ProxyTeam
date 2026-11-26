# Measurement log

English · [Türkçe](OLCUM-GUNLUGU.md)

It is not yet known what this method costs, or what it gains, compared with one person working in a single session.
This page is where the answer accumulates. **The first measurement entry is published on Friday 4 December 2026, and the next three on the following three Fridays (11, 18 and 25 December 2026).**
The measurement ends with those four entries, about one month; the last entry sums up the result.

## How it is measured

- The "Ölçüm" (measurement) section at the end of every task file: duration, number of rounds, bugs caught and at which stage, decisions that went to the owner.
- `araclar/olcum.py`: from session logs, tokens, messages, subagent calls and estimated active time per role; from git history, commit counts.
- Projects are referred to by code name. No message text, names or file contents go in here.
- Every number that is an estimate is marked "estimate". Anything that cannot be measured is written down as "not measured"; it is neither left blank nor made up.
- The numbers are published as they are, even if they come out weak or mixed. A published entry is not edited afterwards; if an error is found, it is written up as a correction in the next entry.
- Every entry states which version of the tool it was measured with (the kit's commit id). If the tool has changed, that entry cannot be compared with earlier ones, and the entry says so.

## Entry template

```
### DD.MM.YYYY · period: DD.MM – DD.MM (N working days)

Tool version: the kit's commit id (`git -C ~/ProxyTeam rev-parse --short HEAD`)

| Measure | Project A | Project B | Note |
|---|---|---|---|
| Tasks closed | | | from task files |
| Tasks accepted in the first round | | | those with round count 1 |
| Bugs caught: plan / review / independent reviewer / production | | | by stage |
| Decisions that went to the owner | | | |
| Tokens: output / cache write / cache read | | | olcum.py, total of the three roles |
| Owner's active time (estimate) | | | olcum.py; only time spent writing messages |
| Comparison with a single session | | | if done: which work, what result |

Observation (not measurement): ...
Definitions changed or errors fixed in the measurement during this period: ...
```

## Entries

### 25.11.2026 · starting point

No numbers; this entry is the baseline.

- The method has been in use on two projects, by one person, for a few days. Measurement was not on the agenda when it was set up.
- An attempt to measure retroactively from the logs showed that time-based measures depend heavily on definitions: whether subagent logs are counted,
  how long-running tool calls are treated and whether pasted role prompts count all changed the result noticeably. Those numbers are therefore not published here;
  the related bugs in the measurement tool have been fixed.
- As of today, task files carry an "Ölçüm" section.
- Observation (not measurement): fewer interruptions, decisions on record, and work that moved faster and in better order.
- Whether this costs more or fewer tokens than a single session is not known.

Schedule: Friday 04.12.2026 (first measurement), 11.12.2026, 18.12.2026, 25.12.2026.
