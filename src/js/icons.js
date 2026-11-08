/*
 * Icone originali delle app.
 *
 * Prima l'icona che fornisce la TV (la stessa del menu Samsung). Per le app della Home, se la TV
 * non ce l'ha, quella ufficiale cercata su internet (App Store) e ricordata sulla TV. Se manca
 * anche quella resta il logo disegnato di brands.js. Le altre app (Tutte le app) non cercano su
 * internet, per non fare decine di ricerche.
 *
 * Impostazioni → Avanzate → Icone delle app svuota la memoria e dice da dove arrivano.
 *
 * In config.js un'app può avere `icon: 'https://…'` per forzare un'immagine, oppure
 * `iconSearch: 'nome'` se la ricerca con il suo nome trova l'app sbagliata.
 */
(function () {
    'use strict';

    var KEY = 'home.icons.v1';
    var ENDPOINT = 'https://itunes.apple.com/search';
    var RETRY_MS = 6 * 60 * 60 * 1000;   // dopo un fallimento riprova tra 6 ore
    var cache = load();
    var pending = {};
    var stats = { web: 0, tv: 0, none: 0 };

    function load() {
        try {
            return JSON.parse(localStorage.getItem(KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    function store() {
        try {
            localStorage.setItem(KEY, JSON.stringify(cache));
        } catch (e) {
            // Senza cache si rifà solo la ricerca al prossimo avvio.
        }
    }

    function norm(text) {
        return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // Prima un nome che inizia con il termine ("Netflix"), poi uno che lo contiene
    // ("Amazon Prime Video" per "Prime Video").
    function pick(results, term) {
        var t = norm(term);
        var best = results.find(function (r) { return norm(r.trackName).indexOf(t) === 0; }) ||
            results.find(function (r) { return norm(r.trackName).indexOf(t) >= 0; });
        return best ? (best.artworkUrl512 || best.artworkUrl100 || null) : null;
    }

    function finish(k, url) {
        cache[k] = url ? { url: url } : { failed: Date.now() };
        store();
        var callbacks = pending[k] || [];
        delete pending[k];
        callbacks.forEach(function (fn) { fn(url); });
    }

    function lookup(term, done) {
        var k = norm(term);
        if (!k) return done(null);
        var hit = cache[k];
        if (hit && hit.url) return done(hit.url);
        if (hit && hit.failed && Date.now() - hit.failed < RETRY_MS) return done(null);
        if (pending[k]) {
            pending[k].push(done);
            return;
        }
        pending[k] = [done];
        var xhr = new XMLHttpRequest();
        xhr.open('GET', ENDPOINT + '?entity=software&country=it&limit=10&term=' + encodeURIComponent(term), true);
        xhr.timeout = 10000;
        xhr.onload = function () {
            var url = null;
            try {
                url = pick(JSON.parse(xhr.responseText).results || [], term);
            } catch (e) {
                url = null;
            }
            DevLog.log('Icona per ' + term + ': ' + (url || 'non trovata'));
            finish(k, url);
        };
        xhr.onerror = function () { finish(k, null); };
        xhr.ontimeout = function () { finish(k, null); };
        xhr.send();
    }

    /*
     * Colore del bordo dell'icona, per allargarla senza stacchi sulle tessere larghe. Funziona
     * solo se l'immagine è leggibile (stessa origine o CORS); altrimenti null e la tessera tiene
     * il colore del marchio.
     */
    function edgeColor(img) {
        try {
            var c = document.createElement('canvas');
            c.width = 24;
            c.height = 24;
            var ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, 24, 24);
            var d = ctx.getImageData(0, 0, 24, 24).data;
            var sum = [0, 0, 0];
            var n = 0;
            for (var y = 0; y < 24; y++) {
                for (var x = 0; x < 24; x++) {
                    if (x > 1 && x < 22 && y > 1 && y < 22) continue;
                    var i = (y * 24 + x) * 4;
                    if (d[i + 3] < 200) continue;
                    sum[0] += d[i];
                    sum[1] += d[i + 1];
                    sum[2] += d[i + 2];
                    n++;
                }
            }
            if (!n) return null;
            return 'rgb(' + Math.round(sum[0] / n) + ',' + Math.round(sum[1] / n) + ',' + Math.round(sum[2] / n) + ')';
        } catch (e) {
            return null;
        }
    }

    // Prova a caricare un'immagine; un'immagine remota prima con CORS (per leggere il colore),
    // poi senza se il server non lo permette.
    function loadImage(src, remote, ok, fail) {
        var img = new Image();
        img.className = 'real';
        if (remote) img.crossOrigin = 'anonymous';
        img.onload = function () {
            if (img.naturalWidth < 8) fail();
            else ok(img);
        };
        img.onerror = function () {
            if (remote && img.crossOrigin) loadImage(src, false, ok, fail);
            else fail();
        };
        img.src = src;
    }

    function apply(tile, img, from) {
        stats[from]++;
        // Le icone Samsung sono spesso rettangoli larghi già composti: riempiono la tessera.
        // Quelle quasi quadrate (come le icone App Store) restano intere al centro.
        if (img.naturalWidth / img.naturalHeight >= 1.15) img.classList.add('fill');
        tile.classList.add('real-icon');
        tile.appendChild(img);
        var color = edgeColor(img);
        if (color) tile.style.background = color;
    }

    // item: { iconPath, icon, iconSearch, label, onHome }
    function attach(tile, item) {
        function none() {
            if (item.onHome) stats.none++;
        }
        function fromTv(fail) {
            if (!item.iconPath) return fail();
            var src = item.iconPath.charAt(0) === '/' ? 'file://' + item.iconPath : item.iconPath;
            loadImage(src, false, function (img) { apply(tile, img, 'tv'); }, fail);
        }
        function fromWeb(fail) {
            if (item.icon) {
                loadImage(item.icon, true, function (img) { apply(tile, img, 'web'); }, fail);
                return;
            }
            lookup(item.iconSearch || item.label, function (url) {
                if (url) loadImage(url, true, function (img) { apply(tile, img, 'web'); }, fail);
                else fail();
            });
        }
        // Prima l'icona della TV (è quella vera, la stessa del menu Samsung); per le app della Home,
        // se la TV non ce l'ha, quella cercata su internet. `tvIcon: false` in config.js salta
        // l'icona della TV per un'app (es. YouTube, la cui icona sulla TV è quella di TizenTube).
        // Il marchio (brands.js) può dire da dove prendere l'icona: `icon: 'logo'` solo il logo
        // disegnato (quando l'icona della TV è quadrata e nella tessera larga sta male), `icon: 'web'`
        // salta l'icona della TV (YouTube: sulla TV è quella di TizenTube).
        var source = (item.brand && item.brand.icon) || (item.tvIcon === false ? 'web' : 'tv');
        if (source === 'logo') return;
        var web = item.onHome ? function () { fromWeb(none); } : none;
        if (source === 'web') web();
        else fromTv(web);
    }

    // Svuota la memoria delle ricerche e azzera il conteggio (per il controllo in Avanzate).
    function reset() {
        cache = {};
        store();
        stats = { web: 0, tv: 0, none: 0 };
    }

    window.Icons = {
        attach: attach,
        lookup: lookup,
        reset: reset,
        stats: function () { return stats; }
    };
})();
