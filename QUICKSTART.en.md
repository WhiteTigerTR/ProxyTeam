# Quick start (10 minutes)

English · [Türkçe](HIZLI-BASLANGIC.md)

[GUIDE.en.md](GUIDE.en.md) explains what the method is and why it helps. This page covers installation only. If your folder already has content in it or is not a git repository, follow [USAGE.en.md](USAGE.en.md) instead.

The kit itself is in Turkish: file names, commands, the installer's questions and the script output. They are quoted here exactly as they appear, with the English meaning in parentheses.

## 0. What you need

- macOS or Linux (WSL on Windows). git, bash, Node.js 18 or later (`node --version`). Python 3 for the measurement script (`python3 --version`); not needed if you will not measure.
- Claude Code (`claude --version`).
- A project folder that is a git repository. If it is not: `git init`.

## 1. Choose the account setup (1 minute)

- **Single account:** three sessions on the same account, in three terminal tabs. Simple; all usage comes out of one account's quota.
- **Multiple accounts:** you put accounts you already own to work in different roles; each account opens with its own configuration folder (`CLAUDE_CONFIG_DIR`). Setup takes a little longer. This arrangement is not a way around usage limits.

If you are not sure, start with a single account. `kur.sh` is safe to run again and never touches existing files: wherever a file has changed, it leaves the new version next to it as `.yeni` ("new"). `CLAUDE.md` gets the same treatment: `CLAUDE.md.yeni` has the updated "Ekip ve hat" ("Team and line") section with your own sections left intact. Comparing and merging is up to you.

## 2. Run the installer (3 minutes)

It works the same from bash or zsh:

```bash
bash /path/VekilEkip/kurulum/kur.sh
```

The questions, in order:

| Question | Example answer |
|---|---|
| `Hedef proje klasörü` (target project folder) | `~/projects/project` |
| (if not a git repository) `Yine de devam edilsin mi?` (continue anyway?) | `h` (no; run `git init` first) |
| `Rol adları` (role names) | Enter (vekil, lider, gelistirici) |
| `Hesap düzeni` (account setup) | `1` or `2` |
| (multiple accounts) How many accounts, aliases, folders | `2`, `claude-ali` → `~/.claude`, `claude-veli` → `~/.claude-k2` |
| (multiple accounts) `Hangi rol hangi hesapta açılsın?` (which role on which account) | vekil 1, lider 1, gelistirici 2 |
| `Commit'lerin gönderildiği uzak depo adı` (name of the remote that commits are pushed to) | `origin` |
| `Canlıya çıkış kararı kimde olsun?` (who decides on production deploys) | `1` (the owner; recommended) or `2` (the proxy) |
| `Dosyalar yazılsın mı?` (write the files?) | `e` (yes) |
| (multiple accounts) Should the aliases be added to your shell startup file (`~/.zshrc` or `~/.bashrc`) | `e` (yes) or `h` (no; if you say no, add the lines yourself). Not asked if the shell is not recognized or the lines are already there. |

The script never overwrites an existing file. When a file already exists, the new one is written with a `.yeni` extension; compare and merge by hand:

```bash
diff CLAUDE.md CLAUDE.md.yeni
```

## 3. Review and commit (3 minutes)

1. Read the "Ekip ve hat" section in `CLAUDE.md`. Delete anything that does not apply to your project (for example "Yayın" (deploy) if you have nothing to deploy).
2. Look at the process patterns in `.vekilekip.json`. If your project has other long-running processes, add them. In the same file, `canli.yetki` holds the value you chose during installation (`sahip` (owner) or `vekil` (proxy)).
3. Commit: `git add -A && git commit -m "Install VekilEkip"` (`yerel/` stays out of the repository).
4. Try the break check:
   ```bash
   node araclar/mola.mjs        # exit 0: safe
   node araclar/mola.mjs bitti
   ```
   If you run it before committing, it says "commit edilmemiş değişiklik" (uncommitted changes) and exits with 1; `bitti` ("done") then says "kayıtlı bir mola yok" (no recorded break). Both are expected.
   If, later on, you see `UYARI docs/DURUM.md: son commit ... önce` (warning: last commit ... ago), it means the lead has not updated and committed the handoff note; the break check still passes.

## 4. Open the sessions (3 minutes)

**Single account:**

```bash
cd ~/projects/project && claude      # in three separate terminal tabs
```

In each tab: `/rename vekil`, `/rename lider`, `/rename gelistirici`.

**Multiple accounts:**

```bash
cd ~/projects/project && claude-ali     # proxy and lead tabs
cd ~/projects/project && claude-veli    # developer tab
```

The first time, each account asks you to log in. Then `/rename`.
Optionally, to let the sessions see each other (this relies on undocumented internals and may break):

```bash
bash /path/VekilEkip/kurulum/oturum-bagla.sh ~/.claude ~/.claude-k2
```

Run it once each time you open a new session.

## 5. Paste the role prompts (1 minute)

Paste each of the three prompts in `docs/ekip/ilk-mesajlar.md` into its session. Do the same after every `/clear`. The prompts are in Turkish; paste them as they are.

## 6. Watching from your phone (optional)

Turn on Claude Code's Remote Control in each session: `/remote-control` (if your version does not have the command, look up its name with `/help`).
Watch from your phone, but send your input **only to the proxy** session.

With multiple accounts: the Claude app on the phone shows one account. Keep the other account open in the phone's browser.

---

## Three rules for the first day

1. Talk only to the proxy.
2. When a big piece of work is finished: handoff note, commit, `/clear`.
3. Do not accept "it works" without evidence: ask for a screenshot, a log or a number.

Taking a break: tell the proxy "Mola ver." (take a break). When you are back: "Mola bitti." (break is over).

Production deploys (if that decision is yours): in your own terminal, run `node araclar/canli.mjs onayla` ("approve"). Sessions cannot give this approval.

To have the rules enforced by checks, see the role and secret hooks in `sablonlar/ornekler/` (not installed; see [Suggested additions](GUIDE.en.md#suggested-additions) in the guide).
