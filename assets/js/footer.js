function getFooterNav() {
    return document.querySelector('.login1-footer__nav');
}

var SETTINGS_CACHE_KEY = 'rubyclub_settings_cache';
var SETTINGS_CACHE_EXPIRES_KEY = 'rubyclub_settings_cache_expires_at';
var SETTINGS_CACHE_TTL_MS = 10 * 60 * 1000;

function getFooterApiBase() {
    return (window.RubyClubConfig && window.RubyClubConfig.API_BASE) || 'https://rubyclubph.com';
}

function getFooterAuthToken() {
    if (window.Login1 && typeof window.Login1.getAuthToken === 'function') {
        return window.Login1.getAuthToken();
    }

    return localStorage.getItem('rubyclub_auth_token');
}

function cloneSettingsData(data) {
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (err) {
        return data;
    }
}

function readSettingsCache() {
    var raw = localStorage.getItem(SETTINGS_CACHE_KEY);

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (err) {
        invalidateSettingsCache();
        return null;
    }
}

function saveSettingsCache(data) {
    var expiresAt = Date.now() + SETTINGS_CACHE_TTL_MS;

    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(SETTINGS_CACHE_EXPIRES_KEY, String(expiresAt));
}

function isSettingsCacheValid() {
    var expiresAt = localStorage.getItem(SETTINGS_CACHE_EXPIRES_KEY);
    var cached = readSettingsCache();

    if (!expiresAt || !cached) {
        return false;
    }

    return Date.now() < Number(expiresAt);
}

function invalidateSettingsCache() {
    localStorage.removeItem(SETTINGS_CACHE_KEY);
    localStorage.removeItem(SETTINGS_CACHE_EXPIRES_KEY);
}

async function fetchFooterSettings() {
    var token = getFooterAuthToken();
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

async function getFooterSettings(options) {
    options = options || {};

    if (!options.forceRefresh && isSettingsCacheValid()) {
        return cloneSettingsData(readSettingsCache());
    }

    var data = await fetchFooterSettings();
    var cachedData = cloneSettingsData(data);

    saveSettingsCache(cachedData);

    return cloneSettingsData(cachedData);
}

async function handleFooterDepositClick() {
    try {
        await getFooterSettings();
    } catch (err) {
        console.error('Không tải được settings:', err);

        if (typeof window.showToast === 'function') {
            window.showToast('Không tải được cài đặt');
        }
    }

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
                window.showToast('Deposit comming soon');
            }
            return;
        }

        if (typeof window.showToast === 'function') {
            window.showToast(action === 'withdraw' ? 'Withdraw comming soon' : 'Comming soon');
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
        var item = e.target.closest('.login1-footer__item');

        if (!item || !nav.contains(item)) {
            return;
        }

        var label = (item.getAttribute('aria-label') || '').toLowerCase();

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

        if (label === 'mail' || label === 'invite friends') {
            if (typeof window.openMailPopupFromEvent === 'function') {
                window.openMailPopupFromEvent(e);
            } else if (typeof window.showToast === 'function') {
                window.showToast('Comming soon');
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
            window.showToast('Comming soon');
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
            return true;
        })
        .catch(function (err) {
            console.error('Không tải được footer:', err);
            return false;
        });
}

function initFooter(options) {
    options = options || {};
    var container = options.container || document.getElementById('footer-mount');

    if (getFooterNav()) {
        bindFooterNavEvents();
        return Promise.resolve(true);
    }

    return mountFooter(container);
}

window.Footer = {
    init: initFooter,
    mount: mountFooter,
    setActiveItem: setActiveFooterItem,
    openDepositMenu: openFooterDepositMenu,
    closeDepositMenu: closeFooterDepositMenu,
    toggleDepositMenu: toggleFooterDepositMenu,
    getSettings: getFooterSettings,
    invalidateSettingsCache: invalidateSettingsCache
};
