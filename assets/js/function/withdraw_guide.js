function getWithdrawGuideOverlay() {
    return document.getElementById('withdraw-guide-overlay');
}

function getWithdrawGuideMount() {
    return document.getElementById('withdraw-guide-mount') || document.body;
}

function closePopupWithdrawGuide() {
    var overlay = getWithdrawGuideOverlay();

    if (!overlay) {
        return;
    }

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
}

function bindPopupWithdrawGuideEvents(root) {
    var overlay = root && root.querySelector
        ? root.querySelector('#withdraw-guide-overlay')
        : getWithdrawGuideOverlay();

    if (!overlay || overlay.dataset.withdrawGuideEventsBound === '1') {
        return;
    }

    overlay.dataset.withdrawGuideEventsBound = '1';

    overlay.addEventListener('click', function (e) {
        if (e.target.closest('#withdraw-guide-close')) {
            e.preventDefault();
            e.stopPropagation();
            closePopupWithdrawGuide();
            return;
        }

        if (e.target === overlay) {
            closePopupWithdrawGuide();
        }
    });

    if (!window.__withdrawGuideEscapeBound) {
        window.__withdrawGuideEscapeBound = true;

        document.addEventListener('keydown', function (e) {
            var el = getWithdrawGuideOverlay();

            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                closePopupWithdrawGuide();
            }
        });
    }
}

function mountPopupWithdrawGuide(container, html) {
    var mount = container || getWithdrawGuideMount();

    if (!mount) {
        return Promise.resolve(false);
    }

    if (getWithdrawGuideOverlay()) {
        bindPopupWithdrawGuideEvents(document);
        return Promise.resolve(true);
    }

    if (html) {
        mount.insertAdjacentHTML('beforeend', html);
        bindPopupWithdrawGuideEvents(mount);
        return Promise.resolve(true);
    }

    return fetch('/view/function/withdraw_guide.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            return res.text();
        })
        .then(function (markup) {
            if (!getWithdrawGuideOverlay()) {
                mount.insertAdjacentHTML('beforeend', markup);
            }
            bindPopupWithdrawGuideEvents(mount);
            return true;
        })
        .catch(function (err) {
            console.error('Could not load withdraw guide popup:', err);
            return false;
        });
}

function openPopupWithdrawGuide() {
    function showOverlay() {
        var overlay = getWithdrawGuideOverlay();

        if (!overlay) {
            return false;
        }

        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        return true;
    }

    if (getWithdrawGuideOverlay()) {
        return Promise.resolve(showOverlay());
    }

    return mountPopupWithdrawGuide().then(function (ok) {
        if (!ok) {
            return false;
        }

        return showOverlay();
    });
}

function initPopupWithdrawGuide(options) {
    options = options || {};
    var container = options.container || getWithdrawGuideMount();

    if (getWithdrawGuideOverlay()) {
        bindPopupWithdrawGuideEvents(document);
        return Promise.resolve(true);
    }

    return mountPopupWithdrawGuide(container);
}

window.PopupWithdrawGuide = {
    init: initPopupWithdrawGuide,
    open: openPopupWithdrawGuide,
    close: closePopupWithdrawGuide,
    mount: mountPopupWithdrawGuide
};
