/*
 * Foto divertenti nel riquadro in alto a sinistra della Home, al posto del saluto.
 *
 * Le scarica la TV: gatti da cataas.com, cani da random.dog (con dog.ceo di riserva), più le
 * foto personali elencate in config.js → funPhotos.mine. Se internet non risponde il riquadro
 * sparisce e torna il saluto, poi la TV riprova più tardi.
 *
 * Gira solo mentre la Home è visibile: niente download con un'app aperta o col salvaschermo.
 */
(function () {
    'use strict';

    var SOURCES = [
        { key: 'misto', label: 'Gatti e cani' },
        { key: 'gatti', label: 'Gatti' },
        { key: 'cani', label: 'Cani' },
        { key: 'mie', label: 'Le mie foto' },
        { key: 'off', label: 'Spente' }
    ];

    var EVERY = [
        { key: '15s', label: '15 s', ms: 15 * 1000 },
        { key: '30s', label: '30 s', ms: 30 * 1000 },
        { key: '1m', label: '1 min', ms: 60 * 1000 }
    ];

    var CAPTIONS = {
        gatti: [
            'Il vero padrone di casa', 'Modalità divano: attiva', 'Sto giudicando le tue scelte',
            'Pisolino numero 14 di oggi', 'Il telecomando è mio', 'Lunedì? Non mi riguarda'
        ],
        cani: [
            'Chi è un bravo cane? Lui.', 'Pronto per la passeggiata', 'Ancora un episodio, dai',
            'Capo della sicurezza', 'Ha visto un biscotto', 'Felicità a quattro zampe'
        ],
        mie: ['Ricordi', 'Che giornata', 'Da rifare']
    };

    var TIMEOUT_MS = 10000;
    var BACKOFF_MS = 5 * 60 * 1000;

    var timer = null;
    var front = 'a';
    var failures = 0;
    var pausedUntil = 0;
    var busy = false;

    function cfg() { return window.LAUNCHER_CONFIG.funPhotos || {}; }
    function prefs() { return Prefs.get().fun; }
    function $(id) { return document.getElementById(id); }

    function every() {
        var key = prefs().every;
        return (EVERY.find(function (e) { return e.key === key; }) || EVERY[1]).ms;
    }

    function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }

    function getJSON(url, ok, fail) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = TIMEOUT_MS;
        xhr.onload = function () {
            try {
                ok(JSON.parse(xhr.responseText));
            } catch (e) {
                fail();
            }
        };
        xhr.onerror = fail;
        xhr.ontimeout = fail;
        xhr.send();
    }

    // Chiama done(url) con l'indirizzo di una foto del tipo scelto, o done(null).
    function source(kind, done) {
        if (kind === 'gatti') {
            done('https://cataas.com/cat?width=900&_=' + Date.now());
        } else if (kind === 'cani') {
            getJSON('https://random.dog/woof.json?filter=mp4,webm,gif', function (d) {
                if (d && d.url && /\.(jpe?g|png)$/i.test(d.url)) done(d.url);
                else dogCeo(done);
            }, function () { dogCeo(done); });
        } else {
            var mine = cfg().mine || [];
            done(mine.length ? pickOne(mine) : null);
        }
    }

    function dogCeo(done) {
        getJSON('https://dog.ceo/api/breeds/image/random', function (d) {
            done(d && d.message ? d.message : null);
        }, function () { done(null); });
    }

    function kindNow() {
        var s = prefs().source;
        var mine = (cfg().mine || []).length > 0;
        if (s === 'misto') {
            var kinds = mine ? ['gatti', 'cani', 'mie'] : ['gatti', 'cani'];
            return pickOne(kinds);
        }
        return s;
    }

    function showing(on) {
        $('home').classList.toggle('has-fun', on);
    }

    function failed() {
        busy = false;
        failures++;
        if (failures >= 3) {
            showing(false);
            pausedUntil = Date.now() + BACKOFF_MS;
            failures = 0;
            DevLog.log('Foto divertenti: internet non risponde, riprovo tra 5 minuti');
        }
    }

    function next() {
        if (busy || prefs().source === 'off') return;
        if (Date.now() < pausedUntil) return;
        busy = true;
        var kind = kindNow();
        source(kind, function (url) {
            if (!url) return failed();
            var img = new Image();
            var t = setTimeout(function () { img.onload = img.onerror = null; failed(); }, TIMEOUT_MS);
            img.onload = function () {
                clearTimeout(t);
                busy = false;
                failures = 0;
                var back = front === 'a' ? 'b' : 'a';
                var layer = $('fun-' + back);
                layer.style.backgroundImage = 'url("' + url + '")';
                layer.classList.add('on');
                $('fun-' + front).classList.remove('on');
                front = back;
                $('fun-cap').textContent = pickOne(CAPTIONS[kind] || CAPTIONS.mie);
                showing(true);
            };
            img.onerror = function () { clearTimeout(t); failed(); };
            img.src = url;
        });
    }

    function tick() {
        if (document.hidden || !UI.isVisible('home')) return;
        if (window.Screensaver && Screensaver.isOpen()) return;
        next();
    }

    function restart() {
        clearInterval(timer);
        failures = 0;
        pausedUntil = 0;
        if (prefs().source === 'off') {
            showing(false);
            return;
        }
        next();
        timer = setInterval(tick, every());
    }

    function init() {
        restart();
    }

    window.Fun = {
        SOURCES: SOURCES,
        EVERY: EVERY,
        init: init,
        restart: restart
    };
})();
