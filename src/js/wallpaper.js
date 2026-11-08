/* Wallpaper display and rotation, driven by Prefs.wallpaper. */
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

    var token = 0;

    function list() { return window.WALLPAPERS || []; }

    function find(key) {
        return list().find(function (w) { return w.key === key; }) || list()[0] || null;
    }

    function interval(key) {
        var find = function (k) { return INTERVALS.find(function (i) { return i.key === k; }); };
        return find(key) || find('15m');
    }

    function bg() { return document.getElementById('bg'); }
    function bgNext() { return document.getElementById('bg-next'); }

    /*
     * Dissolvenza: la nuova immagine compare sopra la vecchia, poi diventa lo sfondo vero e il
     * livello sopra si svuota. Solo opacità, quindi niente di costoso per la TV.
     */
    var fadeTimer = null;
    function crossfade(url) {
        var next = bgNext();
        var reduced = document.documentElement.classList.contains('no-motion');
        if (!next || reduced || !bg().style.backgroundImage) {
            bg().style.backgroundImage = url;
            return;
        }
        clearTimeout(fadeTimer);
        next.style.backgroundImage = url;
        next.classList.add('show');
        fadeTimer = setTimeout(function () {
            bg().style.backgroundImage = url;
            next.classList.remove('show');
        }, 1600);
    }

    // The next image is decoded before it replaces the current one, so the screen never flashes empty.
    // No wallpaper falls back to the stylesheet's plain gradient (img/bg.jpg).
    function display(w) {
        var t = ++token;
        if (!w) {
            bg().style.backgroundImage = '';
            if (window.Glass) Glass.setWallpaper(null);
            return;
        }
        var img = new Image();
        img.onload = function () {
            if (t !== token) return;
            crossfade('url("' + w.file + '")');
            if (window.Glass) Glass.setWallpaper(w);
        };
        img.onerror = function () { DevLog.log('Wallpaper failed to load: ' + w.file); };
        img.src = w.file;
    }

    function apply() {
        var p = Prefs.get().wallpaper;
        display(p.mode === 'off' ? null : find(p.photo));
    }

    // Rotazione solo tra sfondi adatti allo stile: chiari per Chiaro, scuri per gli altri.
    function suited() {
        var light = Appearance.style() === 'chiaro';
        var l = list().filter(function (w) { return light ? w.light : w.abstract; });
        return l.length ? l : list();
    }

    function next() {
        var p = Prefs.get().wallpaper;
        var l = suited();
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

    // Called when Home appears (launch or return from another app).
    function homeShown() {
        var p = Prefs.get().wallpaper;
        if (p.mode === 'rotate' && (p.interval === 'open' || due())) next();
    }

    function start() {
        apply();
        homeShown();
        // The screen saver has its own photo cycle and covers Home completely, so rotating
        // underneath it would only decode images nobody can see — and move the photo Home
        // comes back to.
        setInterval(function () {
            if (window.Screensaver && Screensaver.isOpen()) return;
            if (!document.hidden && due()) next();
        }, 5 * 1000);
    }

    window.Wallpaper = {
        INTERVALS: INTERVALS,
        list: list,
        find: find,
        interval: interval,
        apply: apply,
        next: next,
        homeShown: homeShown,
        start: start
    };
})();
