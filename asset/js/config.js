(function () {
    var host = window.location.hostname;

    var useRelativeApi =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === 'h5.rubyclubph.com';

    window.RubyClubConfig = {
        API_BASE: useRelativeApi ? '' : 'https://rubyclubph.com'
    };
})();
