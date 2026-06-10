(function () {
    var host = window.location.hostname;

    var useRelativeApi =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === 'rubyclubph.com';

    window.RubyClubConfig = {
        API_BASE: 'https://rubyclubph.com',
        KEY_CHECK_PROXY: '9x8h95-482132-963284-ja9006'
    };

    window.releaseFocusWithin = function (container) {
        if (!container) {
            return;
        }

        var active = document.activeElement;

        if (active && active !== document.body && container.contains(active)) {
            active.blur();
        }
    };
})();
