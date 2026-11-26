# Usage guide: step-by-step installation into an existing folder

English · [Türkçe](KULLANIM-TALIMATI.md)

This guide comes out of a real installation. The scenario: a working folder that holds notes, backups and documents and is not yet a git repository; one Claude account; three sessions (proxy, lead, developer).

[QUICKSTART.en.md](QUICKSTART.en.md) assumes a project that is empty or already a git repository. If your folder already has content in it or is not a git repository, follow this guide. [GUIDE.en.md](GUIDE.en.md) explains what the method is and why it helps.

It takes about 15 minutes in total. Each step tells you what to type, what you should see, and what to do if something goes wrong.

The kit itself is in Turkish: file names, commands, the installer's questions and the script output. They are quoted here exactly as they appear, with the English meaning in parentheses.

---

## 0. Before you start

- This page was written on macOS (`open -e`, zsh). The same steps apply on Linux and on WSL on Windows; use your own text editor instead of `open -e`.
- In the terminal, `node --version` should show 18 or later.
- Claude Code must be installed. If you have an alias (for example `claude-ali`), use it; otherwise type `claude`.
- Know where the kit lives. The examples use `~/VekilEkip`; substitute your own path.

---

## 1. Turn the folder into a git repository (3 min)

```zsh
cd ~/work/myfolder
git init -b main
git status
```

**What you should see:** "Initialized empty Git repository" and the files in the folder listed under "Untracked files".

**Look at this list carefully.** Anything that goes into git stays in the history for good, and getting it out later is a chore. Keep these out:
- backup folders, database files (`.sqlite`, `.db`), large PDF and Word documents;
- installation and audit output (server files, logs);
- any file that contains passwords, keys or personal data (`.env`, lists of records).

To do that, write a `.gitignore`. Adjust the patterns below to your own folder names:

```zsh
cat > .gitignore <<'EOF'
# Backups, installation and audit output do not go into git
*-backup-*/
*-install-*/
audit-*/
*.docx
*.sqlite
*.db
*.pdf
.env
yerel/
EOF
git status
```

**What you should see:** only the files you want in git, plus `.gitignore`. The folders should no longer be listed.

To also keep out a single file whose contents you are unsure about:

```zsh
echo "file-name-*.json" >> .gitignore
```

Note: `cat > .gitignore` rewrites the file from scratch, while `echo ... >>` appends a line. If you run `cat >` a second time, you lose whatever you added earlier.

---

## 2. Run the installer (3 min)

```zsh
bash ~/VekilEkip/kurulum/kur.sh
```

| Question | Answer |
|---|---|
| `Hedef proje klasörü` (target project folder) | Enter (the folder you are in) |
| (if not a git repository) `Yine de devam edilsin mi?` (continue anyway?) | If you did step 1, you will not see this question. If you do, answer `h` (no) and go back to step 1. |
| `Rol adları` (role names) | Enter, Enter, Enter (`vekil`, `lider`, `gelistirici`) |
| `Hesap düzeni` (account setup) | `1` (single account) |
| `Commit'lerin gönderildiği uzak depo adı` (name of the remote) | Enter (`origin`). Press Enter even if there is no remote. |
| `Canlıya çıkış kararı kimde olsun?` (who decides on production deploys) | Enter (`1`, the owner). To hand it to the proxy: `2`. |
| `Dosyalar yazılsın mı?` (write the files?) | `e` (yes) |

**What you should see:** "Kurulum bitti" (installation finished) and the list of created files (`CLAUDE.md`, `docs/...`, `araclar/mola.mjs` and so on).

- Under the heading "Atlananlar:" (skipped), the line `= .gitignore (yerel/ zaten var)` (yerel/ is already there) is normal; your own file was left as it was.
- If the list includes a file ending in `.yeni` ("new"), the folder already had a file by that name. Compare the two and merge by hand: `diff CLAUDE.md CLAUDE.md.yeni`.

---

## 3. Review and make the first commit (3 min)

1. Read the "Ekip ve hat" ("Team and line") section in `CLAUDE.md`:
   ```zsh
   open -e CLAUDE.md
   ```
   Delete anything that does not apply to your work. If you have no deploy or no dev environment, for example, remove those items.

2. Run the break check:
   ```zsh
   node araclar/mola.mjs
   ```
   On the first run it is **normal** for this to say "commit edilmemiş değişiklik (N dosya)" (uncommitted changes, N files), because nothing has been committed yet.

3. Commit and try the break check again:
   ```zsh
   git add -A && git commit -m "Install VekilEkip"
   node araclar/mola.mjs && node araclar/mola.mjs bitti
   ```

**What you should see:**

```
Güvende: 1 kopya temiz, çalışan iş yok. Kayıt: yerel/mola.json
  main abc1234  /your/folder
Mola bitti: 1 kopya kaydedilen commit'te. Devir notundan devam.
```

In English: "Safe: 1 working copy clean, nothing running. Record: yerel/mola.json" and "Break over: 1 working copy at the recorded commit. Continue from the handoff note." The second line shows your branch name, the commit id and the path of your folder.

- The line `UYARI ... "origin" adlı uzak depo yok` (warning: no remote named "origin") shows up every time if your repository only exists on this computer. It is harmless.
- If, later on, you see `UYARI docs/DURUM.md: son commit ... önce` (warning: last commit ... ago), it means the lead has not updated and committed the handoff note in the last 30 minutes. The break check still passes; ask for the note to be updated.
- The files you kept out with `.gitignore` **must not appear** in the commit output. If they do, remove them with `git rm --cached <file>`, add them to `.gitignore` and commit again.

---

## 4. Open the three sessions (3 min)

Open three tabs in the terminal (Cmd+T on macOS). Run this in each tab:

```zsh
cd ~/work/myfolder && claude      # or your own alias
```

Once the sessions are up, name them:

| Tab | Command |
|---|---|
| 1 | `/rename vekil` |
| 2 | `/rename lider` |
| 3 | `/rename gelistirici` |

If you installed the role hook (`sablonlar/ornekler/kanca-rol.mjs` in the kit; it is not installed automatically), start each tab with its role: `VEKILEKIP_ROL=vekil claude`, `VEKILEKIP_ROL=lider claude`, `VEKILEKIP_ROL=gelistirici claude`. Even if you changed the role names, this value is always one of these three words.

**Important:** the names must be **exactly** the role names you chose in `kur.sh`. The role prompts address the sessions by these names; with `Vekil-1` or a prefixed name, messages will not get through. Sessions from another project open on the same machine are not a problem as long as their names are different.

---

## 5. Hand out the role prompts (2 min)

```zsh
open -e docs/ekip/ilk-mesajlar.md
```

The file has an opening prompt for each role. Paste each one into its own tab: the proxy prompt into the proxy, the lead prompt into the lead, the developer prompt into the developer. The prompts are in Turkish; paste them as they are.

After every `/clear`, paste the same prompt again. Do not retype it by hand: it comes out slightly different each time, and the sessions end up behaving differently.

---

## 6. Test the line (1 min)

Type this into the proxy tab:

> Oturumları listele ve lider'e "merhaba, hazır mısın?" mesajı gönder.

(In English: list the sessions and send the lead the message "hello, are you ready?".)

**What you should see:**
- The proxy's list shows `vekil` (this session), `lider` and `gelistirici`.
- A few seconds later the lead replies that it is ready.

If the lead is missing from the list:
- Check the `/rename` name in that tab.
- Make sure the session was opened with the same account (in the single-account setup all tabs must be opened with the same alias).
- Close the tab, open it again and repeat step 4.

In the single-account setup the sessions see each other directly; the linking script (`oturum-bagla.sh`) is not needed. This was verified in a real installation.

---

## 7. Watching from your phone (optional)

- Turn on the remote connection in each tab: `/remote-control`. If the command has a different name in your version, look it up with `/help`.
- Log in to the Claude app on the phone with the same account; the three sessions appear in the list.
- You can watch any of them, but **send your input only to the proxy**.

---

## After installation: everyday use

| When | What you do |
|---|---|
| A request, an opinion or a decision | Type it into the **proxy** tab only. The proxy passes it to the lead, the lead to the developer. |
| When the proxy asks something | Answer the proxy. If the lead or the developer asks you directly, still give your answer to the proxy. |
| When a report arrives | Status, done, proxy decisions, expected from you, risk. Look at "expected from you" first. |
| When someone says "it works" | Ask for evidence: a screenshot, a log or a number. Do not accept it without evidence. |
| When a big piece of work is finished | Have that session write its own handoff note (the lead in `docs/DURUM.md`, the developer in the task file, the proxy in its own report) and commit; then `/clear` in that tab and paste the role prompt again. |
| When it is time for a production deploy (if that decision is yours) | The proxy asks for your approval. In your own terminal run `node araclar/canli.mjs onayla` ("approve") and type the short id that is shown. Sessions cannot give this approval. |
| When you step away from the computer | Tell the proxy "Mola ver." (take a break) and wait for the "güvende" (safe) reply. |
| When you are back | Tell the proxy "Mola bitti." (break is over). |
| When an incident happens (secret leak, wrong report, wrong environment) | Tell the proxy; the proxy passes it to the lead, the lead writes it in `docs/olaylar.md`. |
| Once a week | A short review with `docs/ekip/geriye-bakis.md`: which rules helped, which ones are not needed. |

---

## Checklist

- [ ] No backups, installation output, secrets or large documents in the `git status` list
- [ ] `kur.sh` said "Kurulum bitti"; `.yeni` files were merged
- [ ] The "Ekip ve hat" section in `CLAUDE.md` was adapted to the work, and it correctly states who decides on production deploys
- [ ] The first commit was made; `node araclar/mola.mjs` says "Güvende"
- [ ] Three tabs are open with the names `vekil`, `lider`, `gelistirici`
- [ ] The role prompts were pasted
- [ ] The proxy sent a message to the lead and got a reply
