/*
 * Vetro e movimento.
 *
 * Il vetro è finto di proposito: ogni sfondo ha una copia già sfocata (img/wallpapers/blur/),
 * e ogni pannello di vetro mostra quella copia spostata in modo da coincidere con lo sfondo vero
 * dietro di lui. La TV non calcola nessuna sfocatura (backdrop-filter non è mai stato misurato
 * su questo hardware), disegna solo un'immagine.
 *
 * Lo sfondo "respira" con una lenta animazione di zoom; le copie sfocate fanno la stessa
 * animazione con lo stesso ritardo, quindi restano allineate anche dopo che la Home è stata
 * nascosta e rimostrata (un elemento nascosto riparte da zero: il ritardo negativo lo rimette
 * al punto giusto).
 */
(function () {
    'use strict';

    var t0 = Date.now();
    var DEFAULT_BLUR = 'img/bg-blur.jpg';

    function stage() { return document.getElementById('stage'); }

    // Posizione dell'elemento rispetto allo stage 1920x1080, senza la scala dell'anteprima.
    function stageOffset(el) {
        var x = 0;
        var y = 0;
        var s = stage();
        while (el && el !== s) {
            x += el.offsetLeft;
            y += el.offsetTop;
            el = el.offsetParent;
        }
        return { x: x, y: y };
    }

    function layers() {
        return Array.prototype.slice.call(document.querySelectorAll('.glass-bg'));
    }

    // Allinea ogni copia sfocata allo sfondo, e tutte le animazioni allo stesso orologio.
    function sync() {
        var delay = -((Date.now() - t0) / 1000) + 's';
        document.getElementById('bg').style.animationDelay = delay;
        layers().forEach(function (layer) {
            var o = stageOffset(layer.parentNode);
            layer.style.left = (-o.x) + 'px';
            layer.style.top = (-o.y) + 'px';
            layer.style.animationDelay = delay;
        });
    }

    function setWallpaper(w) {
        var path = (w && w.blur) || DEFAULT_BLUR;
        var url = 'url("' + new URL(path, location.href).href + '")';
        document.documentElement.style.setProperty('--wall-blur', url);
    }

    /*
     * Entrata della Home: orologio, vetro e app arrivano in sequenza (full), oppure una breve
     * dissolvenza quando si torna dalle Impostazioni, per non far aspettare chi naviga.
     */
    function enter(full) {
        var home = document.getElementById('home');
        home.classList.remove('enter', 'enter-soft');
        void home.offsetWidth;
        home.classList.add(full ? 'enter' : 'enter-soft');
        sync();
    }

    function renderWeather() {
        var pill = document.getElementById('wx-pill');
        var now = window.Weather && Weather.current();
        pill.classList.toggle('hidden', !now);
        if (now) {
            document.getElementById('wx-icon').innerHTML = now.icon;
            document.getElementById('wx-temp').textContent = now.temp;
            document.getElementById('wx-place').textContent = (window.LAUNCHER_CONFIG.weather || {}).place || '';
        }
        // La pillola è allineata a destra: se cambia larghezza cambia anche la sua posizione.
        sync();
    }

    function init() {
        setWallpaper(null);
        if (window.Weather) Weather.onUpdate(renderWeather);
        renderWeather();
        window.addEventListener('resize', sync);
    }

    window.Glass = {
        init: init,
        sync: sync,
        enter: enter,
        setWallpaper: setWallpaper,
        renderWeather: renderWeather
    };
})();
