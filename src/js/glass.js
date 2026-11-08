/*
 * Vetro e movimento.
 *
 * Il vetro è finto di proposito: ogni pannello mostra una copia sfocata dello sfondo (vedi
 * setWallpaper), spostata in modo da coincidere con lo sfondo vero dietro di lui. La TV non
 * applica nessuna sfocatura in tempo reale (backdrop-filter non è mai stato misurato su questo
 * hardware): disegna solo un'immagine.
 *
 * Lo sfondo "respira" con una lenta animazione di zoom; le copie sfocate fanno la stessa
 * animazione con lo stesso ritardo, quindi restano allineate anche dopo che la Home è stata
 * nascosta e rimostrata (un elemento nascosto riparte da zero: il ritardo negativo lo rimette
 * al punto giusto).
 */
(function () {
    'use strict';

    var t0 = Date.now();

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

    /*
     * La copia sfocata si ottiene rimpicciolendo la foto a 96x54 punti: allargata di nuovo a tutto
     * schermo dal browser diventa una sfocatura morbida. Costa un disegno piccolo per ogni cambio di
     * sfondo, e funziona anche con le foto scaricate da internet (una tela "contaminata" da
     * un'immagine di un altro sito si può mostrare, solo non leggere).
     */
    function canvases() {
        return layers().concat([document.getElementById('bg-blur')]).filter(Boolean);
    }

    function setWallpaper(img) {
        var list = canvases();
        if (!list.length || !img) return;
        var first = list[0];
        var ctx = first.getContext('2d');
        try { ctx.filter = 'blur(1.5px)'; } catch (e) { /* senza filtro va bene lo stesso */ }
        ctx.drawImage(img, -4, -4, first.width + 8, first.height + 8);
        try { ctx.filter = 'none'; } catch (e) { /* idem */ }
        // Un velo di luce: è quello che fa leggere il pannello come vetro.
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(0, 0, first.width, first.height);
        list.slice(1).forEach(function (c) {
            c.getContext('2d').drawImage(first, 0, 0, c.width, c.height);
        });
    }

    /*
     * Entrata della Home: orologio, vetro e app arrivano in sequenza (full), oppure una breve
     * dissolvenza quando si torna dalle Impostazioni, per non far aspettare chi naviga.
     */
    function enter(full) {
        var home = document.getElementById('home');
        if (full && window.Phrases) Phrases.fresh();
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
