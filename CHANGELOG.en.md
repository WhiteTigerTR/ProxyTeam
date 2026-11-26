# Changelog

English · [Türkçe](DEGISIKLIKLER.md)

What changed in the kit, and what to do in a project where the kit is already installed. Newest entry first.
`kur.sh` can be run again: it does not touch existing files and leaves the new version of each changed file as `.yeni`.

## 27.11.2026

| Change | What to do in an installed project |
|---|---|
| The setup documents now have a "download the kit" step; the path in the examples is `~/ProxyTeam`. | Nothing. |
| Measurement log: every entry states which tool version it was measured with; numbers are published as they are. | If you publish your own measurements, put the kit's commit id in the entry. |
| Added this file, and a test that checks the two language versions of the documents stay in step. | Nothing. |
| The landing page has a "what is in it" table; the guide's summary list now mentions measurement; reading a report "in two minutes" is stated as a goal. | Nothing. |
| The break row on the landing page was corrected: the script does not verify that "nothing is left half done"; it verifies that no uncommitted work or running process is left. The example folder now has labeled messages and a status table (`ornek/mesajlar.md`). | Nothing. |
| The status table has a "Tahmin kimin" (whose estimate) column and a "Lider görüşü" (lead's view) line: the lead does not change the developer's estimate, it writes its own view separately. | Update the "Ekip ve hat" section in `CLAUDE.md` and `docs/ekip/ilk-mesajlar.md` together. |
| `mola.mjs bitti` warns if there is stashed work (`git stash`). Stash entries are listed with their branch name; an entry whose message starts with "yarım" counts as pending half-done work. | Take the new `mola.mjs`. |
| The videos were redone: the flow video now shows the message labels and has a corrected sentence about the break; the intro video says "ten rules, four safeguards". | Nothing. |
| Break: if the commit hook will not let half-done work through, the hook is not skipped; the work is stashed with a "yarım" message and a patch is written under `yerel/mola-guvence/`. | Update the `CLAUDE.md` section and `docs/ekip/ilk-mesajlar.md` together. |

## 26.11.2026

| Change | What to do in an installed project |
|---|---|
| `araclar/olcum.py`: messages that arrive while a session is busy are counted; the duration of tool calls whose permission the owner granted is no longer counted as work (`izin_bekleme_dakika`); the interrupt line is not a message; files whose name starts with `_` are not tasks or decisions; a label at the very start of a message is recognized, in capitals only. | Take the new `olcum.py`. **Numbers from the old tool cannot be compared with the new one**; re-measure the earlier period with the new tool if you need it. |
| The break order changed: the check first, with its output sent to the proxy; then the blocking work and the handoff notes; then the check again. The proxy verifies the record itself. | Update the "Ekip ve hat" section in `CLAUDE.md` and `docs/ekip/ilk-mesajlar.md` **together**; if only one is updated, the sessions get conflicting instructions. |
| Report labels (`RAPOR`, `SORU`, `BİLGİ`, `DÜZELTME`) and decision phrases are now in the role prompts. | They come with the same two files. In a project that does not use labels, the label counts in the measurement are 0. |
| New rules: a change that collects new personal data goes to the owner; if the proxy and the lead share an account, the lead asks the proxy before a large wave of subagents. A ready-made text for the status table. | They come with the same two files. |
| The commit subject rule is now in the template ("Birleştirme…", "canlıya yükseltme"). | Optional. If it is not followed, those two counts are 0 in the measurement. |
| `kur.sh` also writes `__pycache__/` to `.gitignore`. | Add `__pycache__/` to your `.gitignore`; otherwise the break is blocked after the measurement tests run. |
| The role hook blocks shell commands that contain the approval sentence; the secret hook covers more commands; the deploy lock is taken in one step. | If you copied these example files, copy them again. If you did not, nothing changes. |
| Documents and code comments are now in both languages. `README.md` is the landing page; the guide is `KILAVUZ.md` and `GUIDE.en.md`. | Nothing. |

## 25.11.2026

First release. Added on top of the original kit: the production gate (`araclar/canli.mjs`), the measurement script, the handoff note check, the single-writer rule, and example role and approval hooks.

| Change | What to do in an installed project |
|---|---|
| `.vekilekip.json` has new fields (`devirNotu`, `canli`). | **Update `araclar/mola.mjs` first, then the settings file.** The old `mola.mjs` rejects unknown fields and the break check stops working. |
| Production deploy is now a separate setting (`canli.yetki`, default `sahip`, the owner). | In a project where the proxy deploys to production, choose `canli.yetki: "vekil"`; otherwise the deploy flow waits for approval. |
| Only the lead writes `docs/DURUM.md`; the developer's handoff note lives in the task file, the proxy's in `yerel/vekil/rapor.md`. | Update the `CLAUDE.md` section and `docs/ekip/ilk-mesajlar.md` together; tell the lead once. |
