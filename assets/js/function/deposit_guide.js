function getDepositGuideOverlay() {
    return document.getElementById('deposit-guide-overlay');
}

function getDepositGuideMount() {
    return document.body;
}

function pauseDepositGuideVideos(overlay) {
    if (!overlay) {
        return;
    }

    var videos = overlay.querySelectorAll('video');
    var i;

    for (i = 0; i < videos.length; i++) {
        try {
            videos[i].pause();
        } catch (err) {
            // ignore
        }
    }
}

function closePopupDepositGuide() {
    var overlay = getDepositGuideOverlay();

    if (!overlay) {
        return;
    }

    pauseDepositGuideVideos(overlay);
    overlay.classList.remove('is-open');
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
}

function bindPopupDepositGuideEvents(root) {
    var overlay = root && root.querySelector
        ? root.querySelector('#deposit-guide-overlay')
        : getDepositGuideOverlay();

    if (!overlay || overlay.dataset.depositGuideEventsBound === '1') {
        return;
    }

    overlay.dataset.depositGuideEventsBound = '1';

    overlay.addEventListener('click', function (e) {
        if (e.target.closest('#deposit-guide-close')) {
            e.preventDefault();
            e.stopPropagation();
            closePopupDepositGuide();
            return;
        }

        if (e.target === overlay) {
            closePopupDepositGuide();
        }
    });

    if (!window.__depositGuideEscapeBound) {
        window.__depositGuideEscapeBound = true;

        document.addEventListener('keydown', function (e) {
            var el = getDepositGuideOverlay();

            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                closePopupDepositGuide();
            }
        });
    }
}

function mountPopupDepositGuide(container, html) {
    var mount = container || getDepositGuideMount();

    if (!mount) {
        return Promise.resolve(false);
    }

    if (getDepositGuideOverlay()) {
        bindPopupDepositGuideEvents(document);
        closePopupDepositGuide();
        return Promise.resolve(true);
    }

    if (html) {
        mount.insertAdjacentHTML('beforeend', html);
        bindPopupDepositGuideEvents(mount);
        closePopupDepositGuide();
        return Promise.resolve(true);
    }

    return fetch('/view/function/deposit_guide.html?v=20260717')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            return res.text();
        })
        .then(function (markup) {
            if (!getDepositGuideOverlay()) {
                mount.insertAdjacentHTML('beforeend', markup);
            }
            bindPopupDepositGuideEvents(mount);
            closePopupDepositGuide();
            return true;
        })
        .catch(function (err) {
            console.error('Could not load deposit guide popup:', err);
            return false;
        });
}

function openPopupDepositGuide() {
    function showOverlay() {
        var overlay = getDepositGuideOverlay();

        if (!overlay) {
            return false;
        }

        overlay.hidden = false;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        return true;
    }

    if (getDepositGuideOverlay()) {
        return Promise.resolve(showOverlay());
    }

    return mountPopupDepositGuide(document.body).then(function (ok) {
        if (!ok) {
            return false;
        }

        return showOverlay();
    });
}

function initPopupDepositGuide(options) {
    options = options || {};
    var container = options.container || getDepositGuideMount();

    if (getDepositGuideOverlay()) {
        bindPopupDepositGuideEvents(document);
        closePopupDepositGuide();
        return Promise.resolve(true);
    }

    return mountPopupDepositGuide(container);
}

window.PopupDepositGuide = {
    init: initPopupDepositGuide,
    open: openPopupDepositGuide,
    close: closePopupDepositGuide,
    mount: mountPopupDepositGuide
};
