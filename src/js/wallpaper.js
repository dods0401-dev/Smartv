/*
 * Sfondi: foto reali, a rotazione, con dissolvenza.
 *
 * Le foto vengono da due posti:
 *   - online: le "foto del giorno" di Bing (paesaggi in alta definizione, ne escono di nuove
 *     ogni giorno). Le scarica la TV e ricorda l'elenco per 12 ore.
 *   - incluse nell'app (wallpapers.js), usate se internet non risponde e nel menu Sfondo.
 */
(function () {
    'use strict';

    var INTERVALS = [
        { key: 'open', label: 'A ogni apertura della Home', ms: 0 },
        { key: '30s', label: '30 s', ms: 30 * 1000 },
        { key: '1m', label: '1 min', ms: 60 * 1000 },
        { key: '5m', label: '5 min', ms: 5 * 60 * 1000 },
        { key: '15m', label: '15 min', ms: 15 * 60 * 1000 },
        { key: '1h', label: '1 ora', ms: 60 * 60 * 1000 },
        { key: '1d', label: 'Ogni giorno', ms: 24 * 60 * 60 * 1000 }
    ];

    var ONLINE_KEY = 'home.photos.v1';
    var ONLINE_FRESH_MS = 12 * 60 * 60 * 1000;
    var BING = 'https://www.bing.com';

    var token = 0;
    var online = loadOnline();

    // ---------- Elenchi

    function list() { return window.WALLPAPERS || []; }

    // Le foto tra cui gira la Home: quelle online se ci sono, altrimenti quelle incluse.
    function pool() {
        return online.items.length ? online.items : list();
    }

    function find(key) {
        var all = pool().concat(list());
        return all.find(function (w) { return w.key === key; }) || pool()[0] || null;
    }

    function interval(key) {
        var find = function (k) { return INTERVALS.find(function (i) { return i.key === k; }); };
        return find(key) || find('15m');
    }

    // ---------- Foto online (Bing)

    function loadOnline() {
        try {
            var saved = JSON.parse(localStorage.getItem(ONLINE_KEY));
            if (saved && Array.isArray(saved.items)) return saved;
        } catch (e) {
            // Nessuna cache: si scarica.
        }
        return { at: 0, items: [] };
    }

    function storeOnline() {
        try {
            localStorage.setItem(ONLINE_KEY, JSON.stringify(online));
        } catch (e) {
            // Senza cache si riscarica l'elenco al prossimo avvio.
        }
    }

    function quality() {
        var q = (window.LAUNCHER_CONFIG.photos || {}).quality;
        return q === 'uhd' ? '_UHD.jpg' : '_1920x1080.jpg';
    }

    // "Titolo (© Autore/Agenzia)" → { title, credit }
    function bingItem(img) {
        var m = /^(.*?)\s*\((©.*)\)\s*$/.exec(img.copyright || '');
        return {
            key: 'bing:' + (img.hsh || img.urlbase),
            title: img.title || (m ? m[1] : 'Foto del giorno'),
            credit: m ? m[2] : (img.copyright || ''),
            file: BING + img.urlbase + quality()
        };
    }

    function fetchBing(idx, done) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', BING + '/HPImageArchive.aspx?format=js&n=8&mkt=it-IT&idx=' + idx, true);
        xhr.timeout = 10000;
        xhr.onload = function () {
            try {
                done((JSON.parse(xhr.responseText).images || []).filter(function (i) { return i.urlbase; }));
            } catch (e) {
                done([]);
            }
        };
        xhr.onerror = function () { done([]); };
        xhr.ontimeout = function () { done([]); };
        xhr.send();
    }

    // Bing dà al massimo 8 foto per richiesta e arriva indietro di 7 giorni: due richieste ≈ 15 foto.
    function refreshOnline() {
        if (Date.now() - online.at < ONLINE_FRESH_MS && online.items.length) return;
        fetchBing(0, function (a) {
            fetchBing(7, function (b) {
                var seen = {};
                var items = a.concat(b).map(bingItem).filter(function (w) {
                    if (seen[w.key]) return false;
                    seen[w.key] = true;
                    return true;
                });
                DevLog.log('Foto online: ' + items.length);
                if (!items.length) return;
                var first = !online.items.length;
                online = { at: Date.now(), items: items };
                storeOnline();
                // Appena arrivano le prime foto online, la Home passa a quelle.
                if (first && Prefs.get().wallpaper.mode === 'rotate') next();
            });
        });
    }

    // ---------- Visualizzazione

    function bg() { return document.getElementById('bg'); }
    function bgNext() { return document.getElementById('bg-next'); }

    /*
     * Disegna la foto a riempire lo schermo e, per le foto online, il velo che rende leggibili
     * frase e app: più scuro a sinistra e in basso. Le foto incluse ce l'hanno già dentro il file
     * (scripts/prepare-wallpapers.mjs). Una volta per cambio di sfondo, mai durante le animazioni.
     */
    function paint(canvas, img, scrim) {
        var ctx = canvas.getContext('2d');
        var W = canvas.width;
        var H = canvas.height;
        var s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        var w = img.naturalWidth * s;
        var h = img.naturalHeight * s;
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        if (!scrim) return;
        var g = ctx.createLinearGradient(0, 0, W * 0.8, H * 0.25);
        g.addColorStop(0, 'rgba(0,0,0,0.55)');
        g.addColorStop(0.6, 'rgba(0,0,0,0.12)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // In alto (meteo e Impostazioni) un velo leggero, per le foto con il cielo chiaro.
        var top = ctx.createLinearGradient(0, 0, 0, H * 0.3);
        top.addColorStop(0, 'rgba(0,0,0,0.35)');
        top.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, W, H * 0.3);
        var v = ctx.createLinearGradient(0, H * 0.45, 0, H);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = v;
        ctx.fillRect(0, H * 0.45, W, H * 0.55);
    }

    function clear(canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }

    /*
     * Dissolvenza: la nuova foto compare sopra la vecchia, poi viene ridisegnata sotto e il
     * livello sopra si nasconde. Solo opacità, quindi niente di costoso per la TV.
     */
    var fadeTimer = null;
    var shown = false;
    function crossfade(img, scrim) {
        var next = bgNext();
        var reduced = document.documentElement.classList.contains('no-motion');
        clearTimeout(fadeTimer);
        if (!shown || reduced) {
            paint(bg(), img, scrim);
            next.classList.remove('show');
            shown = true;
            return;
        }
        paint(next, img, scrim);
        next.classList.add('show');
        fadeTimer = setTimeout(function () {
            paint(bg(), img, scrim);
            next.classList.remove('show');
        }, 1600);
    }

    // L'immagine viene decodificata prima di sostituire quella attuale: lo schermo non resta mai vuoto.
    function display(w) {
        var t = ++token;
        var img = new Image();
        var file = w ? w.file : 'img/bg.jpg';
        img.onload = function () {
            if (t !== token) return;
            if (w) {
                crossfade(img, w.key.indexOf('bing:') === 0);
            } else {
                clear(bg());
                shown = false;
            }
            if (window.Glass) Glass.setWallpaper(img);
        };
        img.onerror = function () {
            DevLog.log('Sfondo non caricato: ' + file);
            // Una foto online non raggiungibile: si passa alla successiva.
            if (w && w.key.indexOf('bing:') === 0 && t === token) setTimeout(next, 2000);
        };
        img.src = file;
    }

    function apply() {
        var p = Prefs.get().wallpaper;
        display(p.mode === 'off' ? null : find(p.photo));
    }

    function next() {
        var p = Prefs.get().wallpaper;
        var l = pool();
        if (!l.length) return null;
        var i = l.findIndex(function (w) { return w.key === p.photo; });
        p.photo = l[(i + 1) % l.length].key;
        p.lastChange = Date.now();
        if (p.mode === 'off') p.mode = 'photo';
        Prefs.save();
        apply();
        return find(p.photo);
    }

    function due() {
        var p = Prefs.get().wallpaper;
        var ms = interval(p.interval).ms;
        return p.mode === 'rotate' && ms > 0 && Date.now() - p.lastChange >= ms;
    }

    // Chiamata quando la Home compare (avvio o ritorno da un'altra app).
    function homeShown() {
        var p = Prefs.get().wallpaper;
        refreshOnline();
        if (p.mode === 'rotate' && (p.interval === 'open' || due())) next();
    }

    function start() {
        apply();
        homeShown();
        // Il salvaschermo copre la Home e ha il suo giro di foto: cambiare sotto di lui
        // decodificherebbe immagini che nessuno vede.
        setInterval(function () {
            if (window.Screensaver && Screensaver.isOpen()) return;
            if (!document.hidden && due()) next();
        }, 5 * 1000);
    }

    window.Wallpaper = {
        INTERVALS: INTERVALS,
        list: list,
        pool: pool,
        find: find,
        interval: interval,
        apply: apply,
        next: next,
        homeShown: homeShown,
        start: start
    };
})();
