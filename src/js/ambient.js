/*
 * Atmosfera della Home.
 *
 * 1. Quando selezioni un'app, sopra la foto compare una luce del colore dell'app (rosso per
 *    Netflix, verde per Spotify…) e la frase cambia in tema. Se per un'app c'è una foto propria
 *    (config.js → apps → backdrop), compare quella al posto della luce.
 * 2. Modalità sera: dalle 22 alle 6 la foto è più scura e la Home più tenue.
 *
 * La luce è disegnata una volta su una tela piccola (allargata dal browser, quindi morbida) e
 * compare con una dissolvenza di opacità: niente sfumature calcolate a ogni fotogramma.
 */
(function () {
    'use strict';

    var DEBOUNCE_MS = 350;
    var timer = null;
    var currentKey = null;
    var backdrops = {};

    function canvas() { return document.getElementById('ambient'); }

    function hexRgb(hex) {
        var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
        if (!m) return null;
        var n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function drawGlow(rgb) {
        var c = canvas();
        var ctx = c.getContext('2d');
        var W = c.width;
        var H = c.height;
        ctx.clearRect(0, 0, W, H);
        var g = ctx.createRadialGradient(W * 0.72, H * 0.62, 0, W * 0.72, H * 0.62, W * 0.62);
        g.addColorStop(0, 'rgba(' + rgb.join(',') + ',0.55)');
        g.addColorStop(0.5, 'rgba(' + rgb.join(',') + ',0.22)');
        g.addColorStop(1, 'rgba(' + rgb.join(',') + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    function drawPhoto(img) {
        var c = canvas();
        var ctx = c.getContext('2d');
        var W = c.width;
        var H = c.height;
        var s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        ctx.drawImage(img, (W - img.naturalWidth * s) / 2, (H - img.naturalHeight * s) / 2,
            img.naturalWidth * s, img.naturalHeight * s);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, W, H);
    }

    function hide() {
        canvas().classList.remove('show');
        currentKey = null;
    }

    function show(item) {
        var brand = item.brand || {};
        var key = brand.key || item.id;
        if (key === currentKey) return;
        currentKey = key;
        var c = canvas();
        c.classList.remove('show');
        setTimeout(function () {
            if (currentKey !== key) return;
            var photo = item.backdrop && backdrops[item.backdrop];
            if (photo) {
                c.width = 1920;
                c.height = 1080;
                drawPhoto(photo);
            } else {
                var rgb = hexRgb(brand.glow);
                if (!rgb) return;
                c.width = 192;
                c.height = 108;
                drawGlow(rgb);
            }
            c.classList.add('show');
        }, 250);
    }

    // Chiamata a ogni spostamento sulla Home; aspetta che ci si fermi su un'app.
    function focus(item) {
        clearTimeout(timer);
        timer = setTimeout(function () {
            var isApp = item && (item.kind === 'app' || item.kind === 'tv');
            if (!isApp) {
                hide();
                Phrases.forApp(null);
                return;
            }
            show(item);
            Phrases.forApp(item.brand ? item.brand.key : null);
        }, DEBOUNCE_MS);
    }

    // Le foto proprie per app (backdrop) si caricano una volta all'avvio.
    function preloadBackdrops() {
        (window.LAUNCHER_CONFIG.apps || []).forEach(function (entry) {
            if (!entry.backdrop || backdrops[entry.backdrop]) return;
            var img = new Image();
            img.onload = function () { backdrops[entry.backdrop] = img; };
            img.src = entry.backdrop;
        });
    }

    // ---------- Modalità sera

    function isNight(d) {
        var h = d.getHours();
        return h >= 22 || h < 6;
    }

    function checkNight() {
        var on = Prefs.get().appearance.night !== 'off' && isNight(new Date());
        document.documentElement.classList.toggle('night', on);
    }

    function init() {
        preloadBackdrops();
        checkNight();
        setInterval(checkNight, 60 * 1000);
    }

    window.Ambient = {
        init: init,
        focus: focus,
        hide: hide,
        checkNight: checkNight,
        isNight: isNight
    };
})();
