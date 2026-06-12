function getSubVipOverlay() {
    return document.getElementById('sub-vip-overlay');
}

function openPopupSubVip(options) {
    options = options || {};
    var overlay = getSubVipOverlay();

    if (!overlay) {
        return;
    }

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (options.fromVip && window.PopupVip && typeof window.PopupVip.setDimmed === 'function') {
        window.PopupVip.setDimmed(true);
    }
}

function closePopupSubVip() {
    var overlay = getSubVipOverlay();
    var vipOverlay = document.getElementById('vip-overlay');

    if (!overlay) {
        return;
    }

    overlay.classList.remove('is-open');

    if (typeof window.releaseFocusWithin === 'function') {
        window.releaseFocusWithin(overlay);
    }

    overlay.setAttribute('aria-hidden', 'true');

    if (vipOverlay && vipOverlay.classList.contains('is-open')) {
        if (window.PopupVip && typeof window.PopupVip.setDimmed === 'function') {
            window.PopupVip.setDimmed(false);
        }

        document.body.style.overflow = 'hidden';
        return;
    }

    document.body.style.overflow = '';
}

var subVipEventsBound = false;

function bindPopupSubVipEvents(root) {
    var scope = root || document;
    var overlay = scope.querySelector ? scope.querySelector('#sub-vip-overlay') : getSubVipOverlay();

    if (!overlay) {
        return;
    }

    if (subVipEventsBound && !root) {
        return;
    }
    subVipEventsBound = true;

    var closeBtn = overlay.querySelector('#sub-vip-close');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePopupSubVip);
    }

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closePopupSubVip();
        }
    });

    if (!window.__subVipEscapeBound) {
        window.__subVipEscapeBound = true;
        document.addEventListener('keydown', function (e) {
            var el = getSubVipOverlay();
            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                closePopupSubVip();
            }
        });
    }
}

function mountPopupSubVip(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindPopupSubVipEvents(container);
        return Promise.resolve(true);
    }

    return fetch('/view/function/sub_vip.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindPopupSubVipEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Could not load sub VIP popup:', err);
            return false;
        });
}

function initPopupSubVip(options) {
    options = options || {};
    var container = options.container || document.getElementById('sub-vip-mount');

    if (getSubVipOverlay()) {
        bindPopupSubVipEvents();
        if (options.openOnLoad) {
            openPopupSubVip();
        }
        return Promise.resolve(true);
    }

    return mountPopupSubVip(container).then(function (ok) {
        if (ok && options.openOnLoad) {
            openPopupSubVip();
        }
        return ok;
    });
}

window.PopupSubVip = {
    init: initPopupSubVip,
    open: openPopupSubVip,
    close: closePopupSubVip,
    mount: mountPopupSubVip
};
