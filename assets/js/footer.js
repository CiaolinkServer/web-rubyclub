function getFooterNav() {
    return document.querySelector('.login1-footer__nav');
}

function getFooterApiBase() {
    return (window.RubyClubConfig && window.RubyClubConfig.API_BASE) || 'https://rubyclubph.com';
}

function cloneSettingsData(data) {
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (err) {
        return data;
    }
}

async function fetchFooterSettings() {
    var token = typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null;
    var headers = {
        Accept: 'application/json'
    };

    if (token) {
        headers.Authorization = 'Bearer ' + token;
    }

    var response = await fetch(getFooterApiBase() + '/api/v1/settings', {
        method: 'GET',
        headers: headers
    });

    if (!response.ok) {
        throw new Error('HTTP ' + response.status);
    }

    return response.json();
}

async function getFooterSettings() {
    var data = await fetchFooterSettings();

    return cloneSettingsData(data);
}

function handleFooterDepositClick() {
    toggleFooterDepositMenu();
}

function setFooterItemIcon(item, isActive) {
    if (!item) {
        return;
    }

    var icon = item.querySelector('.login1-footer__icon, .login1-footer__deposit-icon');

    if (!icon) {
        return;
    }

    var normalSrc = icon.getAttribute('data-icon');
    var activeSrc = icon.getAttribute('data-icon-active');

    if (isActive && activeSrc) {
        icon.src = activeSrc;
        return;
    }

    if (normalSrc) {
        icon.src = normalSrc;
    }
}

function setActiveFooterItem(item) {
    var nav = getFooterNav();
    var items = nav ? nav.querySelectorAll('.login1-footer__item') : [];

    for (var i = 0; i < items.length; i++) {
        var isActive = items[i] === item;
        items[i].classList.toggle('login1-footer__item--active', isActive);
        setFooterItemIcon(items[i], isActive);
    }
}

function getFooterDepositMenu() {
    return document.getElementById('login1-footer-deposit-menu');
}

function getFooterDepositButton() {
    return document.querySelector('.login1-footer__item--deposit');
}

function closeFooterDepositMenu() {
    var menu = getFooterDepositMenu();
    var depositBtn = getFooterDepositButton();

    if (!menu) {
        return;
    }

    menu.classList.remove('is-open');
    if (typeof window.releaseFocusWithin === 'function') {
        window.releaseFocusWithin(menu);
    }
    menu.setAttribute('aria-hidden', 'true');

    if (depositBtn) {
        depositBtn.classList.remove('login1-footer__item--menu-open');
        depositBtn.setAttribute('aria-expanded', 'false');
    }
}

function openFooterDepositMenu() {
    var menu = getFooterDepositMenu();
    var depositBtn = getFooterDepositButton();

    if (!menu) {
        return;
    }

    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');

    if (depositBtn) {
        depositBtn.classList.add('login1-footer__item--menu-open');
        depositBtn.setAttribute('aria-expanded', 'true');
    }
}

function toggleFooterDepositMenu() {
    var menu = getFooterDepositMenu();

    if (!menu) {
        return;
    }

    if (menu.classList.contains('is-open')) {
        closeFooterDepositMenu();
    } else {
        openFooterDepositMenu();
    }
}

function bindFooterDepositMenuEvents(root) {
    var scope = root || document;
    var menu = scope.querySelector ? scope.querySelector('#login1-footer-deposit-menu') : getFooterDepositMenu();
    var depositBtn = scope.querySelector ? scope.querySelector('.login1-footer__item--deposit') : getFooterDepositButton();

    if (!menu || menu.dataset.depositMenuBound === '1') {
        return;
    }

    menu.dataset.depositMenuBound = '1';

    menu.addEventListener('click', function (e) {
        var actionBtn = e.target.closest('[data-action]');

        if (!actionBtn || !menu.contains(actionBtn)) {
            return;
        }

        e.stopPropagation();

        var action = actionBtn.getAttribute('data-action');
        closeFooterDepositMenu();

        if (action === 'deposit') {
            if (window.PopupDeposit && typeof window.PopupDeposit.open === 'function') {
                window.PopupDeposit.open();
            } else if (typeof window.showToast === 'function') {
                window.showToast('Deposit coming soon');
            }
            return;
        }

        if (action === 'withdraw') {
            if (window.PopupWithdraw && typeof window.PopupWithdraw.open === 'function') {
                window.PopupWithdraw.open();
            } else if (typeof window.showToast === 'function') {
                window.showToast('Withdraw coming soon');
            }
            return;
        }

        if (typeof window.showToast === 'function') {
            window.showToast('Coming soon');
        }
    });

    if (!window.__footerDepositOutsideBound) {
        window.__footerDepositOutsideBound = true;

        document.addEventListener('click', function (e) {
            var currentMenu = getFooterDepositMenu();
            var currentDepositBtn = getFooterDepositButton();

            if (!currentMenu || !currentMenu.classList.contains('is-open')) {
                return;
            }

            if (currentMenu.contains(e.target) || (currentDepositBtn && currentDepositBtn.contains(e.target))) {
                return;
            }

            closeFooterDepositMenu();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeFooterDepositMenu();
            }
        });
    }
}

function bindFooterNavEvents(root) {
    var scope = root || document;
    var nav = scope.querySelector ? scope.querySelector('.login1-footer__nav') : getFooterNav();

    if (!nav || nav.dataset.footerNavBound === '1') {
        return;
    }

    nav.dataset.footerNavBound = '1';
    bindFooterDepositMenuEvents(scope);

    nav.addEventListener('click', function (e) {

        if (!window.checkLoggedIn()) {
            if (typeof window.showToast === 'function') {
                window.showToastError('Please log in');
            }
            return;
        }

        var item = e.target.closest('.login1-footer__item');

        if (!item || !nav.contains(item)) {
            return;
        }

        var navKey = (item.getAttribute('data-footer-nav') || item.getAttribute('aria-label') || '').toLowerCase();
        var label = navKey;

        if (label === 'home') {
            if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
                window.location.href = '/index.html';
            } else {
                setActiveFooterItem(item);
            }
            return;
        }

        if (label === 'account') {
            if (!window.location.pathname.endsWith('/view/footer/account.html')) {
                window.location.href = '/view/footer/account.html';
            } else {
                setActiveFooterItem(item);
            }
            return;
        }

        if (label === 'mail' || navKey.indexOf('mail') === 0) {
            if (typeof window.openMailPopupFromEvent === 'function') {
                window.openMailPopupFromEvent(e);
            } else if (window.PopupMail && typeof window.PopupMail.open === 'function') {
                window.PopupMail.open();
            } else if (typeof window.showToast === 'function') {
                window.showToast('Coming soon');
            }
            return;
        }

        if (label === 'deposit withdrawal') {
            e.stopPropagation();
            handleFooterDepositClick();
            return;
        }

        closeFooterDepositMenu();

        if (typeof window.showToast === 'function') {
            window.showToast('Coming soon');
        }
    });
}

function mountFooter(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindFooterNavEvents(container);
        refreshFooterMailBadgeIfReady();
        return Promise.resolve(true);
    }

    return fetch('/view/footer.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindFooterNavEvents(container);
            refreshFooterMailBadgeIfReady();
            return true;
        })
        .catch(function (err) {
            console.error('Could not load footer:', err);
            return false;
        });
}

function refreshFooterMailBadgeIfReady() {
    if (window.PopupMail && typeof window.PopupMail.refreshFooterBadge === 'function') {
        return window.PopupMail.refreshFooterBadge();
    }

    return Promise.resolve(0);
}

function initFooter(options) {
    options = options || {};
    var container = options.container || document.getElementById('footer-mount');

    if (getFooterNav()) {
        bindFooterNavEvents();
        refreshFooterMailBadgeIfReady();
        return Promise.resolve(true);
    }

    return mountFooter(container).then(function (ok) {
        if (ok) {
            refreshFooterMailBadgeIfReady();
        }

        return ok;
    });
}

window.Footer = {
    init: initFooter,
    mount: mountFooter,
    setActiveItem: setActiveFooterItem,
    openDepositMenu: openFooterDepositMenu,
    closeDepositMenu: closeFooterDepositMenu,
    toggleDepositMenu: toggleFooterDepositMenu,
    getSettings: getFooterSettings,
};
