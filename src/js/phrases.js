/*
 * Frasi divertenti al posto di "Buongiorno". Cambiano in base all'ora del giorno, a ogni
 * apertura della Home e ogni tanto mentre è aperta (Impostazioni → Home → Cambia frase ogni).
 * Per aggiungerne: basta scriverle nella fascia giusta qui sotto.
 */
(function () {
    'use strict';

    var PHRASES = {
        mattina: [
            'Il caffè l\'hai già preso?',
            'Troppo presto per decidere qualsiasi cosa.',
            'Ancora cinque minuti, dai.',
            'Oggi si esce. Forse.',
            'Buongiorno, ma piano.',
            'Ancora in pigiama? Va benissimo.'
        ],
        pomeriggio: [
            'Una puntata e poi basta, giuro.',
            'Il pisolino è sottovalutato.',
            'Ma sono già le cinque?',
            'Qualcuno ha visto il telecomando?',
            'Oggi vince il divano.',
            'Si lavora meglio dopo una puntata. Credo.'
        ],
        sera: [
            'Allora, cosa guardiamo?',
            'Mezz\'ora per scegliere il film, come sempre.',
            'Pizza e serie, piano perfetto.',
            'Chi ha il telecomando decide.',
            'Stasera niente spoiler, eh.',
            'Dai, ancora una.'
        ],
        notte: [
            'Domani mattina sarà dura.',
            'Ultima puntata. Davvero l\'ultima.',
            'Volume basso, i vicini dormono.',
            'Ma che ore sono?',
            'Il finale non si guarda da solo.'
        ]
    };

    var EVERY = [
        { key: '5m', label: '5 min', ms: 5 * 60 * 1000 },
        { key: '15m', label: '15 min', ms: 15 * 60 * 1000 },
        { key: '1h', label: '1 ora', ms: 60 * 60 * 1000 },
        { key: 'open', label: 'Solo all\'apertura', ms: 0 }
    ];

    var current = '';
    var slotNow = '';
    var since = 0;
    var last = {};

    function slot(d) {
        var h = d.getHours();
        if (h >= 5 && h < 12) return 'mattina';
        if (h >= 12 && h < 18) return 'pomeriggio';
        if (h >= 18 && h < 23) return 'sera';
        return 'notte';
    }

    function every() {
        var key = (Prefs.get().phrases || {}).every;
        return (EVERY.find(function (e) { return e.key === key; }) || EVERY[1]).ms;
    }

    // Una frase della fascia, mai la stessa due volte di fila.
    function pick(s) {
        var list = PHRASES[s];
        var p;
        do {
            p = list[Math.floor(Math.random() * list.length)];
        } while (list.length > 1 && p === last[s]);
        last[s] = p;
        return p;
    }

    function change(d) {
        slotNow = slot(d);
        current = pick(slotNow);
        since = d.getTime();
        var el = document.getElementById('greeting');
        if (el) {
            el.classList.remove('swap');
            void el.offsetWidth;
            el.classList.add('swap');
        }
    }

    // Chiamata dall'orologio ogni 10 secondi: cambia solo se è cambiata la fascia o è ora.
    function text(d) {
        var ms = every();
        if (!current || slot(d) !== slotNow || (ms && d.getTime() - since >= ms)) change(d);
        return current;
    }

    // Nuova frase a ogni apertura della Home.
    function fresh() {
        change(new Date());
        var el = document.getElementById('greeting');
        if (el) el.textContent = current;
    }

    window.Phrases = {
        EVERY: EVERY,
        text: text,
        fresh: fresh
    };
})();
