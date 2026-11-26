# ProxyTeam (VekilEkip)

**English** · A three-session way of working with Claude Code: you talk only to a *proxy* session, which makes the routine
calls for you and passes work on to a *lead* and a *developer*. Experimental; observations so far, not measurements.

**Türkçe** · Claude Code ile üç oturumlu bir çalışma yöntemi: yalnız *vekil* oturumuyla konuşursunuz; rutin kararları o verir,
işi *lider*e ve *geliştirici*ye iletir. Deneysel; şimdilik gözlem var, ölçüm yok.

<table>
<tr>
<th width="50%">Why · Neden (1:00)</th>
<th width="50%">How the work flows · İş nasıl akar (1:18)</th>
</tr>
<tr>
<td><video src="https://github.com/user-attachments/assets/aef53dca-43c2-4105-8004-d0706bac27d9" controls></video></td>
<td><video src="https://github.com/user-attachments/assets/d4941eea-c0e8-4354-9c5b-1923295a62f0" controls></video></td>
</tr>
</table>

Both videos have an English voice-over, with on-screen headings in both languages; use the player's full-screen button for the full view. İki video da İngilizce seslendirmelidir, başlıklar iki dildedir; tam görünüm için oynatıcının tam ekran düğmesini kullanın.

Türkçe seslendirmeli tanıtım videosu / The intro with Turkish narration: [tanitim/proxyteam-tr.mp4](tanitim/proxyteam-tr.mp4)

**What is in it · İçinde ne var**

| English | Türkçe |
|---|---|
| **A proxy with written authority.** It makes the routine calls and logs each one; money, secrets, deleting data and anything hard to undo come back to you. | **Yetkisi yazılı bir vekil.** Rutin kararları verir, her birini kayda geçirir; para, sır, veri silme ve geri dönüşü zor her şey size gelir. |
| **A production gate.** Per project: you approve that exact commit, or the proxy decides. | **Canlı kapısı.** Projeye göre: o commit'i siz onaylarsınız ya da vekil karar verir. |
| **The repo as shared memory.** Status, decisions, tasks and handoff notes are files; a new session starts from them. | **Ortak bellek olarak depo.** Durum, kararlar, görevler ve devir notları dosyadır; yeni oturum oradan başlar. |
| **Evidence and a blind reviewer.** No "it works" without proof; before acceptance a subagent sees only the material. | **Kanıt ve bağımsız göz.** Kanıtsız "çalıştı" yok; kabulden önce bir alt ajan yalnız malzemeyi görür. |
| **A break you can check.** "Take a break" stops every session; a script verifies that no uncommitted work or running process is left. | **Denetlenebilen mola.** "Mola ver" bütün oturumları durdurur; bir betik kaydedilmemiş iş ve çalışan süreç kalmadığını doğrular. |
| **Measurement instead of claims.** Task files and a script keep the numbers; the log is published as it comes out. | **İddia yerine ölçüm.** Sayıları görev dosyaları ve bir betik tutar; günlük, çıktığı gibi yayımlanır. |

Most of these parts are known practices; what the kit adds is the proxy and how the parts fit together. Bu parçaların çoğu bilinen yöntemlerdir; kitin eklediği, vekil ve parçaların bir araya getirilişidir.

| | English | Türkçe |
|---|---|---|
| Guide / Kılavuz | [GUIDE.en.md](GUIDE.en.md) | [KILAVUZ.md](KILAVUZ.md) |
| Quick start / Hızlı kurulum | [QUICKSTART.en.md](QUICKSTART.en.md) | [HIZLI-BASLANGIC.md](HIZLI-BASLANGIC.md) |
| Step-by-step use / Adım adım kullanım | [USAGE.en.md](USAGE.en.md) | [KULLANIM-TALIMATI.md](KULLANIM-TALIMATI.md) |
| Measurement log / Ölçüm günlüğü | [MEASUREMENT-LOG.en.md](MEASUREMENT-LOG.en.md) | [OLCUM-GUNLUGU.md](OLCUM-GUNLUGU.md) |
| Changelog / Değişiklikler | [CHANGELOG.en.md](CHANGELOG.en.md) | [DEGISIKLIKLER.md](DEGISIKLIKLER.md) |

The documents and the code comments are in both languages. The kit's working parts (templates the sessions read, script
messages, file names) are in Turkish. First measurement entry: Friday 4 December 2026.

Belgeler ve kod açıklamaları iki dildedir. Kitin çalışan parçaları (oturumların okuduğu şablonlar, betik iletileri, dosya
adları) Türkçedir. İlk ölçüm girişi: 4 Aralık 2026 Cuma.

MIT · Video: voice by ElevenLabs (Brian, Derya), music "Brassy Bubbles" by Technodono (CC0).
