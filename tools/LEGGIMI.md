# Home TV all'accensione (programma per il PC)

La TV non permette di scegliere quale app si apre all'accensione. Questo programma, che gira sul
PC di casa, se ne accorge quando la TV si accende e le chiede di aprire Home TV, qualunque app
fosse aperta prima. Usa l'interfaccia di rete ufficiale delle TV Samsung (quella delle app
telecomando), non la Modalità sviluppatore e non cambia impostazioni della TV.

Limite: il PC deve essere acceso (anche bloccato o in background) quando si accende la TV.

## Primo avvio

1. Copia `home-tv-avvio.ps1` e `home-tv-avvio.bat` nella stessa cartella, per esempio
   `Documenti\Home TV`.
2. Con la TV accesa, doppio clic su `home-tv-avvio.bat`: si apre una finestra con i messaggi.
3. Spegni e riaccendi la TV. La prima volta la TV chiede di **consentire** il collegamento del
   PC: scegli **Consenti**. Il permesso resta salvato in `home-tv-token.txt`.

## Farlo partire con Windows

1. Tasto destro su `home-tv-avvio.bat` → *Crea collegamento*.
2. Premi Windows + R, scrivi `shell:startup` e Invio: si apre la cartella Esecuzione automatica.
3. Sposta lì il collegamento. Per tenerlo nascosto: tasto destro sul collegamento → *Proprietà*
   → *Esegui* → *Ridotto a icona*.

## Se cambia qualcosa

- Indirizzo della TV diverso: modifica `$TvIp` in cima a `home-tv-avvio.ps1`.
- Home TV compare troppo presto o troppo tardi: modifica `$DelayAfterOnSeconds` (secondi).
- Per fermarlo: chiudi la finestra, o togli il collegamento da `shell:startup`.
