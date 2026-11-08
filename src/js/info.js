/*
 * Informazioni utili nella parte alta del pannello di vetro: cosa c'è in onda su un canale e
 * le partite di Serie A. Le scarica la TV ogni 10 minuti; se una fonte non risponde la sua
 * parte sparisce senza errori.
 *
 *   TV:     palinsesto di RaiPlay (config.js → info.channel, es. 'rai-1')
 *   Calcio: tabellone pubblico di ESPN (config.js → info.league, es. 'ita.1' = Serie A)
 *
 * Nessuna delle due fonti ha un'interfaccia documentata: se cambiano formato, la riga si spegne
 * da sola e va aggiornato il modo di leggerle qui sotto.
 */
(function () {
    'use strict';

    var REFRESH_MS = 10 * 60 * 1000;
    var ROTATE_MS = 8000;
    var TIMEOUT_MS = 10000;

    var tvText = '';
    var sport = [];
    var sportIndex = 0;

    function cfg() { return window.LAUNCHER_CONFIG.info || {}; }
    function show() { return (Prefs.get().info || {}).show || 'tutto'; }
    function $(id) { return document.getElementById(id); }

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

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    // ---------- Programmi TV (RaiPlay)

    var TIME_KEYS = ['hour', 'timePublished', 'time', 'start', 'orario'];
    var NAME_KEYS = ['name', 'title', 'titolo', 'program_name'];

    function field(o, keys) {
        for (var i = 0; i < keys.length; i++) {
            var v = o[keys[i]];
            if (typeof v === 'string' && v) return v;
            if (v && typeof v === 'object' && typeof v.name === 'string') return v.name;
        }
        return '';
    }

    // Il formato del palinsesto non è documentato: si cercano, ovunque nel JSON, oggetti con un
    // orario "HH:MM" e un nome.
    function collect(node, out) {
        if (Array.isArray(node)) {
            node.forEach(function (n) { collect(n, out); });
        } else if (node && typeof node === 'object') {
            var t = /^(\d{1,2}):(\d{2})/.exec(field(node, TIME_KEYS));
            var name = field(node, NAME_KEYS);
            if (t && name) out.push({ min: +t[1] * 60 + +t[2], time: pad(+t[1]) + ':' + t[2], name: name.trim() });
            Object.keys(node).forEach(function (k) {
                if (node[k] && typeof node[k] === 'object') collect(node[k], out);
            });
        }
    }

    function channelLabel(id) {
        return id.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    function refreshTv() {
        var channel = cfg().channel;
        if (!channel) return;
        var d = new Date();
        var day = pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear();
        getJSON('https://www.raiplay.it/palinsesto/app/' + channel + '/' + day + '.json', function (data) {
            var list = [];
            collect(data, list);
            list.sort(function (a, b) { return a.min - b.min; });
            var now = d.getHours() * 60 + d.getMinutes();
            var i = -1;
            list.forEach(function (p, k) { if (p.min <= now) i = k; });
            if (i < 0) { tvText = ''; render(); return; }
            var cur = list[i];
            var next = list[i + 1];
            tvText = channelLabel(channel) + ' · ora: ' + cur.name + (next ? '  ·  ' + next.time + ' ' + next.name : '');
            render();
        }, function () {
            DevLog.log('Info TV: palinsesto non disponibile');
            tvText = '';
            render();
        });
    }

    // ---------- Calcio (ESPN)

    function team(c) {
        return (c.team && (c.team.shortDisplayName || c.team.displayName || c.team.abbreviation)) || '';
    }

    function describe(e) {
        var comp = (e.competitions || [])[0] || {};
        var cs = comp.competitors || [];
        var home = cs.find(function (c) { return c.homeAway === 'home'; }) || cs[0];
        var away = cs.find(function (c) { return c.homeAway === 'away'; }) || cs[1];
        if (!home || !away) return null;
        var st = (e.status && e.status.type) || {};
        var match = team(home) + ' – ' + team(away);
        if (st.state === 'in') {
            return { rank: 0, text: match.replace(' – ', ' ' + home.score + '–' + away.score + ' ') + ' · ' + (e.status.displayClock || 'in corso') };
        }
        if (st.state === 'post') {
            return { rank: 2, text: match.replace(' – ', ' ' + home.score + '–' + away.score + ' ') + ' · finale' };
        }
        var d = new Date(e.date);
        var today = new Date();
        var when = d.toDateString() === today.toDateString() ? 'oggi' :
            d.toLocaleDateString('it-IT', { weekday: 'short' });
        return { rank: 1, text: match + ' · ' + when + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) };
    }

    function refreshSport() {
        var league = cfg().league;
        if (!league) return;
        getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/' + league + '/scoreboard', function (data) {
            var items = (data.events || []).map(describe).filter(Boolean);
            // Prima le partite in corso, poi le prossime, poi i risultati.
            items.sort(function (a, b) { return a.rank - b.rank; });
            sport = items.slice(0, 6).map(function (i) { return i.text; });
            sportIndex = 0;
            render();
        }, function () {
            DevLog.log('Info calcio: tabellone non disponibile');
            sport = [];
            render();
        });
    }

    // ---------- Riga nel vetro

    function render() {
        var s = show();
        var tv = s === 'tutto' || s === 'tv' ? tvText : '';
        var football = (s === 'tutto' || s === 'calcio') && sport.length ? 'Serie A · ' + sport[sportIndex % sport.length] : '';
        $('info-tv').textContent = tv;
        $('info-sport').textContent = football;
        var any = !!(tv || football);
        if ($('home').classList.contains('has-info') !== any) {
            $('home').classList.toggle('has-info', any);
            if (window.Glass) Glass.sync();
        }
    }

    function refresh() {
        if (show() === 'spente') { render(); return; }
        refreshTv();
        refreshSport();
    }

    function init() {
        refresh();
        setInterval(function () { if (!document.hidden) refresh(); }, REFRESH_MS);
        setInterval(function () {
            if (sport.length > 1) {
                sportIndex++;
                render();
            }
        }, ROTATE_MS);
    }

    window.Info = {
        SHOW: [
            { key: 'tutto', label: 'TV e calcio' },
            { key: 'tv', label: 'Solo TV' },
            { key: 'calcio', label: 'Solo calcio' },
            { key: 'spente', label: 'Spente' }
        ],
        init: init,
        refresh: refresh,
        render: render
    };
})();
