(function () {
    var host = window.location.hostname;

    var useRelativeApi =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === 'rubyclubph.com';

    window.RubyClubConfig = {
        API_BASE: 'https://rubyclubph.com',
        KEY_CHECK_PROXY: '9x8h95-482132-963284-ja9006',
        GOOGLE_CLIENT_ID: '344434163197-ci754vjla6kta2c540qk3lfhsnnti42o.apps.googleusercontent.com'
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
