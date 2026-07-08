var bannerPopupEventsBound = false;
var bannerPopupMountPromise = null;
var bannerPopupBanners = [];
var bannerPopupCurrentIndex = 0;

function getBannerPopupOverlay() {
    return document.getElementById('bannerpopup-overlay');
}

function getLobbyBannerList() {
    if (window.list_banner_game && window.list_banner_game.lobby) {
        return window.list_banner_game.lobby;
    }

    if (window.Login1 && typeof window.Login1.getLobbyBanners === 'function') {
        return window.Login1.getLobbyBanners();
    }

    return [];
}

function isDepositBannerSrc(src) {
    if (typeof window.isDepositBanner === 'function') {
        return window.isDepositBanner(src);
    }

    return false;
}

function updateBannerPopupClickState() {
    var img = document.getElementById('bannerpopup-img');

    if (!img || !bannerPopupBanners.length) {
        return;
    }

    var isDeposit = isDepositBannerSrc(bannerPopupBanners[bannerPopupCurrentIndex]);
    img.style.cursor = isDeposit ? 'pointer' : '';
    img.dataset.depositBanner = isDeposit ? '1' : '0';
}

function showBannerPopupAt(index) {
    var img = document.getElementById('bannerpopup-img');

    if (!img || !bannerPopupBanners.length) {
        return;
    }

    bannerPopupCurrentIndex = index;
    img.src = bannerPopupBanners[index];
    updateBannerPopupClickState();
}

function closePopupBanner() {
    var overlay = getBannerPopupOverlay();

    if (!overlay) {
        return;
    }

    bannerPopupBanners = [];
    bannerPopupCurrentIndex = 0;
    overlay.classList.remove('is-open');

    if (typeof window.releaseFocusWithin === 'function') {
        window.releaseFocusWithin(overlay);
    }

    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function handleBannerPopupCloseClick() {
    if (!bannerPopupBanners.length) {
        closePopupBanner();
        return;
    }

    if (bannerPopupCurrentIndex < bannerPopupBanners.length - 1) {
        showBannerPopupAt(bannerPopupCurrentIndex + 1);
        return;
    }

    closePopupBanner();
}

function openPopupBanner() {
    var overlay = getBannerPopupOverlay();
    var banners = getLobbyBannerList();

    if (!overlay || !banners.length) {
        return false;
    }

    bannerPopupBanners = banners.slice();
    showBannerPopupAt(0);
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    return true;
}

function bindPopupBannerEvents(root) {
    var scope = root || document;
    var overlay = scope.querySelector ? scope.querySelector('#bannerpopup-overlay') : getBannerPopupOverlay();

    if (!overlay) {
        return;
    }

    if (bannerPopupEventsBound && !root) {
        return;
    }
    bannerPopupEventsBound = true;

    var closeBtn = overlay.querySelector('#bannerpopup-close');

    if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            handleBannerPopupCloseClick();
        });
    }

    var bannerImg = overlay.querySelector('#bannerpopup-img');

    if (bannerImg && bannerImg.dataset.depositClickBound !== '1') {
        bannerImg.dataset.depositClickBound = '1';
        bannerImg.addEventListener('click', function () {
            if (bannerImg.dataset.depositBanner !== '1') {
                return;
            }

            if (typeof window.openDepositFromBanner === 'function' && window.openDepositFromBanner()) {
                closePopupBanner();
            }
        });
    }

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closePopupBanner();
        }
    });

    if (!window.__bannerpopupEscapeBound) {
        window.__bannerpopupEscapeBound = true;
        document.addEventListener('keydown', function (e) {
            var el = getBannerPopupOverlay();
            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                closePopupBanner();
            }
        });
    }
}

function mountPopupBanner(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindPopupBannerEvents(container);
        return Promise.resolve(true);
    }

    return fetch('view/function/bannerpopup.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindPopupBannerEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Could not load banner popup:', err);
            return false;
        });
}

function initPopupBanner(options) {
    options = options || {};
    var container = options.container || document.getElementById('bannerpopup-mount');
    var overlay = getBannerPopupOverlay();

    if (overlay) {
        bindPopupBannerEvents();
        return Promise.resolve(true);
    }

    if (bannerPopupMountPromise) {
        return bannerPopupMountPromise;
    }

    bannerPopupMountPromise = mountPopupBanner(container).then(function (ok) {
        if (!ok) {
            bannerPopupMountPromise = null;
        }
        return ok;
    });

    return bannerPopupMountPromise;
}

function openPopupBannerAfterLogin() {
    return initPopupBanner().then(function (ok) {
        if (ok) {
            openPopupBanner();
        }
        return ok;
    });
}

document.addEventListener('DOMContentLoaded', function () {
    initPopupBanner();
});

window.PopupBanner = {
    init: initPopupBanner,
    open: openPopupBanner,
    openAfterLogin: openPopupBannerAfterLogin,
    close: closePopupBanner,
    mount: mountPopupBanner
};
