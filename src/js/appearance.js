/* Clock, date and font settings (Prefs.appearance). */
(function () {
    'use strict';

    var FONTS = [
        { key: 'manrope', label: 'Manrope', family: '"Manrope"' },
        { key: 'inter', label: 'Inter', family: '"Inter"' },
        { key: 'outfit', label: 'Outfit', family: '"Outfit"' },
        { key: 'dm-sans', label: 'DM Sans', family: '"DM Sans"' }
    ];

    var LOCALES = [
        { key: 'en-GB', label: 'English' },
        { key: 'es-ES', label: 'Español' },
        { key: 'fr-FR', label: 'Français' },
        { key: 'it-IT', label: 'Italiano' }
    ];

    // Stili della Home: ognuno è una classe su #stage, definita in fondo a style.css.
    var STYLES = [
        { key: 'vetro', label: 'Vetro' },
        { key: 'cinema', label: 'Cinema' },
        { key: 'icone', label: 'Icone' },
        { key: 'chiaro', label: 'Chiaro' }
    ];

    var FALLBACK = ', "SamsungOne", "Helvetica Neue", Arial, sans-serif';

    function prefs() { return Prefs.get().appearance; }

    function font(key) {
        return FONTS.find(function (f) { return f.key === key; }) || FONTS[0];
    }

    function pad(n) { return String(n).padStart(2, '0'); }

    // Returns { time: '16:05', suffix: '' } or { time: '4:05', suffix: 'PM' }.
    function time(d) {
        if (prefs().clock === '12h') {
            var h = d.getHours() % 12 || 12;
            return { time: h + ':' + pad(d.getMinutes()), suffix: d.getHours() < 12 ? 'AM' : 'PM' };
        }
        return { time: pad(d.getHours()) + ':' + pad(d.getMinutes()), suffix: '' };
    }

    function date(d) {
        try {
            var text = d.toLocaleDateString(prefs().locale, { weekday: 'long', day: 'numeric', month: 'long' });
            return text.charAt(0).toUpperCase() + text.slice(1);
        } catch (e) {
            return d.toDateString();
        }
    }

    // Saluto sopra l'orologio, solo in italiano (le altre lingue non lo mostrano).
    function greeting(d) {
        if (prefs().locale !== 'it-IT') return '';
        var h = d.getHours();
        if (h >= 5 && h < 13) return 'Buongiorno';
        if (h >= 13 && h < 18) return 'Buon pomeriggio';
        return 'Buonasera';
    }

    // Lo stile viene da config.js e non si cambia dal telecomando.
    function style() {
        return (window.LAUNCHER_CONFIG || {}).style || 'cinema';
    }

    function apply() {
        var p = prefs();
        document.documentElement.style.setProperty('--font', font(p.font).family + FALLBACK);
        var home = document.getElementById('home');
        home.classList.toggle('names-focused', p.names === 'focused');
        home.classList.toggle('names-never', p.names === 'never');
        home.classList.toggle('no-date', !p.showDate);
        document.documentElement.classList.toggle('no-motion', p.motion === 'off');
        var stage = document.getElementById('stage');
        STYLES.forEach(function (s) { stage.classList.toggle('style-' + s.key, style() === s.key); });
    }

    window.Appearance = {
        FONTS: FONTS,
        LOCALES: LOCALES,
        STYLES: STYLES,
        style: style,
        font: font,
        time: time,
        date: date,
        greeting: greeting,
        apply: apply
    };
})();
