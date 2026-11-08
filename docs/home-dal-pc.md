# Home TV come vera Home: piano dal PC

Obiettivo: fare in modo che il tasto Home del telecomando apra Home TV invece della Home Samsung,
con un modo sicuro per tornare indietro.

**Stato: fermo dopo la fase 1.** La fase 1 è stata eseguita sulla TV di casa (Samsung
UE55U8000FUXZT, 2025): vedi "Esito della fase 1". Le fasi 2 e 3 non sono state tentate. Il metodo del progetto originale è stato provato solo
su una Q70B del 2022 con Tizen 6.5 (vedi `docs/setup-tv.md`).

## Perché per fasi

- Samsung non ha un modo ufficiale per cambiare la Home: il metodo originale riscrive impostazioni
  interne non documentate (`db/appfw/home_appid` e l'app predefinita dell'operazione "main").
- Un'app web come Home TV **non può** toccare quelle impostazioni: il ripristino si fa solo dal PC.
  Un "kill switch" dentro le Impostazioni di Home TV non avrebbe effetto, per questo non c'è.
- I programmi in `native/` si fermano da soli se la TV non è quella di riferimento (processo a
  32 bit, utente 901, firmware `T-PTMDEUC-1720.7`). Non vanno forzati: vanno adattati solo dopo
  aver letto i valori della TV di casa.

## Fase 1 — che TV è (sola lettura)

Serve il programma `sdb` sul PC (è lo strumento Samsung per la Modalità sviluppatore).

1. Cerca `sdb.exe` sul PC (Esplora file → Questo PC → cerca `sdb.exe`): Apps2Samsung potrebbe
   averlo già scaricato. Se non c'è, installa *Tizen Studio* con l'estensione *Samsung TV* da
   developer.samsung.com e usa `C:\tizen-studio\tools\sdb.exe`.
2. Apri il Prompt dei comandi nella cartella di `sdb.exe` (barra degli indirizzi di Esplora file →
   scrivi `cmd` → Invio) ed esegui:

   ```
   sdb connect 192.168.0.170
   sdb devices
   sdb capability
   sdb shell "echo shell-ok"
   ```

Nessuno di questi comandi cambia qualcosa sulla TV: si collegano, elencano la TV, chiedono le sue
caratteristiche e provano se la TV accetta un comando innocuo.

Da guardare nel risultato di `sdb capability`:

| Voce | Perché conta |
| --- | --- |
| `platform_version` | versione di Tizen (il riferimento era 6.5) |
| `cpu_arch` | 32 o 64 bit (i programmi in `native/` sono a 32 bit) |
| `sdbd_rootperm`, `can_launch`, `secure_protocol` | cosa permette la Modalità sviluppatore |

E se `sdb shell` risponde `shell-ok` o rifiuta.

## Esito della fase 1 (8 novembre 2026)

`sdb connect` e `sdb devices` funzionano. Da `sdb capability`:

| Voce | Valore | Riferimento (Q70B) |
| --- | --- | --- |
| `platform_version` | 9.0 | 6.5 |
| `cpu_arch` / `architecture` | armv7 / 32 | armv7 / 32 |
| `sdbd_rootperm` | disabled | nessun root neanche lì |
| `intershell_support` | disabled | — |
| `secure_protocol` | enabled | — |
| `netcoredbg_support`, `pkgcmd_debugmode` | enabled | — |

`sdb shell "echo shell-ok"` non restituisce nulla: **la TV non esegue comandi dal PC**. Il metodo
originale ha bisogno proprio di questo (e di un "runner" che il progetto originale non pubblica),
quindi le fasi 2 e 3 così come sono descritte qui **non si possono fare** su questa TV.

Resterebbe solo un'idea non verificata: impacchettare `native/Query.cs` come app .NET per TV
(TPK) e lanciarla da Home TV, per vedere se su Tizen 9 un'app può anche solo leggere quelle
impostazioni. È stata scartata: molto lavoro di prove sulla TV, e poche probabilità che il sistema
lo permetta. Si usano le soluzioni sicure (sezione in fondo).

## Fase 2 — copia di sicurezza (sola lettura)

Solo se la fase 1 lo permette: adattare `native/Query.cs` ai valori letti (firmware e architettura
della TV di casa) e leggere le impostazioni attuali della Home, salvandole sul PC in un file
`baseline.json` (formato in `docs/setup-tv.md`). Il file resta fuori dal repository (`.gitignore`).

## Fase 3 — cambio della Home, con ripristino

Solo con la copia di sicurezza verificata (`Arn0HomeControl verify`): `apply` per passare a
Home TV, `restore` per tornare alla Home Samsung. Se la TV non si raggiunge più dal PC, dalle
Impostazioni di Home TV → Impostazioni della TV si apre comunque la Home Samsung.

## Se si ferma qui

Senza cambiare la Home, le soluzioni sicure restano: "Esegui automaticamente l'ultima app" (la
TV si accende su Home TV), Home TV al primo posto nella barra Samsung (Home → OK) e "Apri Home TV"
con la voce.
