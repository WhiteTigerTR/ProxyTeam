# Örnek: doldurulmuş dosyalar

Bu klasör, şablonların dolu halini gösterir. Proje uydurmadır: küçük bir derneğin kitap ödünç verme uygulaması.
Kişi, kurum ve adresler gerçek değildir. Amaç, bir görevin baştan sona nasıl kayda geçtiğini göstermektir.

Okuma sırası:

1. [docs/kararlar/0004-hatirlatma-kanali.md](docs/kararlar/0004-hatirlatma-kanali.md): bir vekil kararı. Geri alınabilir, ölçütü belli.
2. [docs/gorevler/0012-gecikme-hatirlatmasi.md](docs/gorevler/0012-gecikme-hatirlatmasi.md): görev, geliştiricinin raporu, liderin incelemesi. İlk turda bağımsız göz bir kusur buluyor.
3. [docs/DURUM.md](docs/DURUM.md): liderin tuttuğu durum ve devir notu.
4. [yerel/vekil/rapor.md](yerel/vekil/rapor.md): vekilin proje sahibine raporu. Gerçek projede bu dosya depoya girmez; burada örnek olsun diye duruyor.

Dikkat edilecekler:

- Her iddianın yanında kanıt var: test sayısı, görüntü yolu, commit kimliği.
- Rapor "düzeldi" demiyor; neyin düzeldiğini ve neyin kaldığını ayrı yazıyor.
- Vekil, para gerektiren seçeneği (SMS) kendisi seçmiyor; proje sahibine götürüyor.
- Canlıya çıkış bu projede proje sahibinde; rapor ondan onay istiyor.

## English

**Example: filled-in files.** This folder shows what the templates look like when filled in. The example files are in Turkish, like the templates themselves.
The project is made up: a book lending app for a small association.
The people, organizations and addresses are not real. The point is to show how a single task gets recorded from start to finish.

Reading order:

1. [docs/kararlar/0004-hatirlatma-kanali.md](docs/kararlar/0004-hatirlatma-kanali.md): a proxy decision (which channel to use for reminders). Reversible, with a clear criterion.
2. [docs/gorevler/0012-gecikme-hatirlatmasi.md](docs/gorevler/0012-gecikme-hatirlatmasi.md): the task (overdue reminders), the developer's report, the lead's review. In the first round the independent reviewer finds a defect.
3. [docs/DURUM.md](docs/DURUM.md): the status and handoff note kept by the lead.
4. [yerel/vekil/rapor.md](yerel/vekil/rapor.md): the proxy's report to the owner. In a real project this file does not go into the repository; it is here only as an example.

Things to notice:

- Every claim has evidence next to it: test count, screenshot path, commit id.
- The report does not say "fixed"; it states separately what was fixed and what remains.
- The proxy does not choose the option that costs money (SMS) on its own; it takes that to the owner.
- Production deploys in this project are the owner's call; the report asks the owner for approval.
