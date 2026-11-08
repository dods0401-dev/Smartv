/*
 * Tile styling per brand. `match` is tested against "<name> <id>" of an installed app.
 * `mark` is a file in img/marks/; the build recolours it in `fg` (img/tiles/<key>.svg), shown over `bg`.
 * `text` instead of `mark` draws a typographic logo (for brands without an available mark).
 * `pad` optionally overrides the mark's [vertical, horizontal] inset in % of the tile (default [26, 22]).
 */
window.BRANDS = [
    // Colori come le icone ufficiali delle app (si vedono finché l'icona vera non arriva).
    // `glow`: colore della luce che compare sulla foto quando l'app è selezionata (ambient.js).
    { key: 'tv', glow: '#4f8cff', mark: 'tv', bg: 'linear-gradient(135deg,#1f2937,#374151)', fg: '#fff' },
    { key: 'youtube', icon: 'web', glow: '#ff0033', match: /youtube|tizentube|cobalt-yt/i, mark: 'youtube', bg: '#fff', fg: '#ff0033' },
    { key: 'netflix', glow: '#e50914', match: /netflix/i, mark: 'netflix', bg: '#141414', fg: '#e50914' },
    { key: 'primevideo', glow: '#1aa0e0', match: /prime ?video/i, mark: 'primevideo', bg: 'linear-gradient(135deg,#0b4f7a,#1aa0e0)', fg: '#fff', pad: [12, 10] },
    { key: 'disneyplus', icon: 'logo', glow: '#2f6bff', match: /disney/i, mark: 'disneyplus', bg: 'linear-gradient(135deg,#0a1a4f 0%,#1240a8 55%,#19a3c9 100%)', fg: '#fff' },
    { key: 'appletv', icon: 'logo', glow: '#c9d1dc', match: /apple ?tv|aria-video/i, mark: 'appletv', bg: 'linear-gradient(160deg,#2c2c2e,#000)', fg: '#fff' },
    { key: 'spotify', glow: '#1ed760', match: /spotify/i, mark: 'spotify', bg: '#121212', fg: '#1ed760' },
    { key: 'movistar', match: /movistar/i, mark: 'movistar', bg: '#0b6fd8', fg: '#fff' },
    { key: 'hbomax', icon: 'logo', glow: '#6a3cff', match: /hbo/i, text: 'HBO max', bg: 'linear-gradient(160deg,#0b0b14 40%,#1d2a8a)', fg: '#fff' },
    { key: 'max', match: /(^|\s)max(\s|$)/i, mark: 'max', bg: '#002be7', fg: '#fff' },
    { key: 'dazn', glow: '#f8fc00', match: /dazn/i, mark: 'dazn', bg: '#000', fg: '#fff' },
    { key: 'plex', match: /plex/i, mark: 'plex', bg: '#1f1f1f', fg: '#e5a00d' },
    { key: 'twitch', match: /twitch/i, mark: 'twitch', bg: '#9146ff', fg: '#fff' },
    { key: 'tf1', match: /tf1/i, text: 'TF1+', bg: 'linear-gradient(135deg,#071a4d,#1d4ed8)', fg: '#fff' },
    // Italia: loghi tipografici (nessun marchio ufficiale incluso nel repository)
    { key: 'raiplay', glow: '#1f6bff', match: /raiplay|rai ?play/i, text: 'RaiPlay', bg: 'linear-gradient(135deg,#00205b,#0a5bd3)', fg: '#fff' },
    { key: 'mediaset', match: /mediaset|infinity/i, text: 'Infinity', bg: 'linear-gradient(135deg,#0b1e3f,#1b4fa0)', fg: '#fff' },
    { key: 'now', match: /(^|[^a-z])now([^a-z]|$)|nowtv/i, text: 'NOW', bg: '#0b0b0b', fg: '#21e6c1' },
    { key: 'tvplus', match: /tv ?plus|tvplus/i, text: 'TV Plus', bg: 'linear-gradient(135deg,#1428a0,#3d5afe)', fg: '#fff' },
    { key: 'crunchyroll', match: /crunchyroll/i, mark: 'crunchyroll', bg: '#f47521', fg: '#fff' },

    // Consoles (used by inputs in config.js)
    { key: 'playstation', mark: 'playstation', bg: 'linear-gradient(135deg,#00205c,#0070d1)', fg: '#fff' },
    { key: 'xbox', mark: 'xbox', bg: 'linear-gradient(135deg,#0a3a0a,#16a016)', fg: '#fff' },
    { key: 'switch', mark: 'nintendoswitch', bg: 'linear-gradient(135deg,#b3000e,#ff2a2a)', fg: '#fff' }
];

window.findBrand = function (keyOrApp) {
    if (typeof keyOrApp === 'string') {
        return window.BRANDS.find(function (b) { return b.key === keyOrApp; }) || null;
    }
    var text = (keyOrApp.name || '') + ' ' + (keyOrApp.id || '');
    return window.BRANDS.find(function (b) { return b.match && b.match.test(text); }) || null;
};
