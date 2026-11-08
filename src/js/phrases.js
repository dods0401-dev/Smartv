/*
 * Frasi divertenti al posto di "Buongiorno". Cambiano in base all'ora del giorno, a ogni
 * apertura della Home e ogni tanto mentre è aperta (Impostazioni → Home → Cambia frase ogni).
 * Per aggiungerne: basta scriverle nella fascia giusta qui sotto.
 */
(function () {
    'use strict';

    var PHRASES = {
        mattina: [
            'Caffè prima, decisioni dopo.',
            'La sveglia ha suonato. Noi no.',
            'Oggi si fa tutto. Forse domani.',
            'Colazione dei campioni: divano e telecomando.',
            'Buongiorno a chi ha già perso le chiavi.',
            'Il divano ha già prenotato il pomeriggio.'
        ],
        pomeriggio: [
            'Un episodio e poi si lavora. Promesso.',
            'Il divano ha chiesto di te.',
            'Pomeriggio produttivo: abbiamo acceso la TV.',
            'Lo sport di oggi? Lo zapping.',
            'Pausa pranzo diventata pausa pomeriggio.',
            'Pisolino o serie? Perché non entrambi.'
        ],
        sera: [
            'Scegliere il film: tempo stimato un\'ora.',
            'Chi tiene il telecomando, comanda.',
            'Cena pronta? Allora, cosa guardiamo?',
            'Ancora un episodio. L\'ultimo. Davvero.',
            'Popcorn: obbligatori.',
            'Modalità divano: attivata.',
            'Stasera niente spoiler, intesi?'
        ],
        notte: [
            'Domani ci pentiremo. Stasera no.',
            'È tardi, ma il finale ci aspetta.',
            'Il letto può aspettare. Il colpo di scena no.',
            'Ufficialmente è troppo tardi. Ufficiosamente, un altro.',
            'Silenzio: i vicini dormono, noi no.'
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
