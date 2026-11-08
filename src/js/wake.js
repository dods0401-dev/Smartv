/*
 * ESPERIMENTO: Home TV davanti a tutto quando si accende la TV.
 *
 * La TV non permette di scegliere l'app di avvio, e "Esegui automaticamente l'ultima app" riapre
 * l'ultima usata (es. Spotify). Qui Home TV resta attiva in sottofondo (config.xml →
 * background-support) e ogni pochi secondi guarda l'orologio. In standby la TV si ferma, quindi
 * alla riaccensione tra un controllo e l'altro risulta un salto di molti minuti: è il segnale
 * che la TV si è appena accesa, e Home TV chiede di essere riaperta in primo piano.
 *
 * Non è documentato da Samsung che un'app in sottofondo possa farlo: per questo è un'opzione
 * (Impostazioni → Altro → Home), spenta di partenza, e l'esito dell'ultimo tentativo resta
 * scritto in Impostazioni → Altro → Accensione (prova), per capire se funziona senza il PC.
 */
(function () {
    'use strict';

    var TICK_MS = 5000;
    var GAP_MS = 5 * 60 * 1000;      // salto minimo per dire "la TV era in standby"
    var SETTLE_MS = 4000;            // lascia alla TV il tempo di riaprire l'ultima app
    var STATUS_KEY = 'home.wake.v1';

    var last = Date.now();

    function enabled() {
        return Prefs.get().appearance.wake === 'on';
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function save(text) {
        var d = new Date();
        var status = { at: d.getTime(), text: pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' · ' + text };
        try {
            localStorage.setItem(STATUS_KEY, JSON.stringify(status));
        } catch (e) {
            // Solo diagnostica: se non si salva, pazienza.
        }
        DevLog.log('Accensione (prova): ' + text);
    }

    function status() {
        try {
            var s = JSON.parse(localStorage.getItem(STATUS_KEY));
            return s && s.text ? s.text : 'Mai rilevata';
        } catch (e) {
            return 'Mai rilevata';
        }
    }

    function selfId() {
        try {
            return tizen.application.getCurrentApplication().appInfo.id;
        } catch (e) {
            return null;
        }
    }

    function bringToFront() {
        if (!document.hidden) {
            save('rilevata, Home TV era già davanti');
            return;
        }
        var id = selfId();
        if (!id) {
            save('rilevata, ma non trovo il nome dell\'app');
            return;
        }
        Apps.launch(id).then(function () {
            save('rilevata, Home TV riaperta');
        }, function (err) {
            save('rilevata, la TV non ha permesso di riaprire: ' + DevLog.errorText(err));
        });
    }

    function tick() {
        var now = Date.now();
        var gap = now - last;
        last = now;
        if (gap < GAP_MS || !enabled()) return;
        setTimeout(bringToFront, SETTLE_MS);
    }

    function init() {
        setInterval(tick, TICK_MS);
    }

    window.Wake = {
        init: init,
        status: status
    };
})();
