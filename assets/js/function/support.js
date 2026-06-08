var SUPPORT_LINKS = {
    messenger: 'https://m.me/',
    telegram: 'https://t.me/'
};

function getSupportOverlay() {
    return document.getElementById('support-overlay');
}

function openPopupSupport() {
    var overlay = getSupportOverlay();
    if (!overlay) {
        return;
    }
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closePopupSupport() {
    var overlay = getSupportOverlay();
    if (!overlay) {
        return;
    }
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

var supportEventsBound = false;

function bindPopupSupportEvents(root) {
    var scope = root || document;
    var overlay = scope.querySelector ? scope.querySelector('#support-overlay') : getSupportOverlay();

    if (!overlay) {
        return;
    }

    if (supportEventsBound && !root) {
        return;
    }
    supportEventsBound = true;

    var closeBtn = overlay.querySelector('#support-close');
    var messengerLink = overlay.querySelector('#support-messenger');
    var telegramLink = overlay.querySelector('#support-telegram');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePopupSupport);
    }

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closePopupSupport();
        }
    });

    if (!window.__supportEscapeBound) {
        window.__supportEscapeBound = true;
        document.addEventListener('keydown', function (e) {
            var el = getSupportOverlay();
            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                closePopupSupport();
            }
        });
    }

    if (messengerLink && SUPPORT_LINKS.messenger) {
        messengerLink.href = SUPPORT_LINKS.messenger;
    }

    if (telegramLink && SUPPORT_LINKS.telegram) {
        telegramLink.href = SUPPORT_LINKS.telegram;
    }
}

function mountPopupSupport(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindPopupSupportEvents(container);
        return Promise.resolve(true);
    }

    return fetch('view/function/support.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindPopupSupportEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Không tải được popup support:', err);
            return false;
        });
}

function initPopupSupport(options) {
    options = options || {};
    var container = options.container || document.getElementById('support-mount');

    if (getSupportOverlay()) {
        bindPopupSupportEvents();
        if (options.openOnLoad) {
            openPopupSupport();
        }
        return Promise.resolve(true);
    }

    return mountPopupSupport(container).then(function (ok) {
        if (ok && options.openOnLoad) {
            openPopupSupport();
        }
        return ok;
    });
}

function openFacebookSupport() {
    window.open('https://www.facebook.com/support', '_blank');
}

function openTelegramSupport() {
    window.open('https://t.me/support', '_blank');
}

window.PopupSupport = {
    init: initPopupSupport,
    open: openPopupSupport,
    close: closePopupSupport,
    mount: mountPopupSupport,
    setLinks: function (links) {
        links = links || {};
        if (links.messenger) {
            SUPPORT_LINKS.messenger = links.messenger;
        }
        if (links.telegram) {
            SUPPORT_LINKS.telegram = links.telegram;
        }
        bindPopupSupportEvents();
    }
};
