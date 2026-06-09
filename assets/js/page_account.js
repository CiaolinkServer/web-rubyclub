function getPageAccountRoot() {
    return document.getElementById('page-account');
}

function formatAccountBalance(value) {
    var num = Number(value);

    if (Number.isNaN(num)) {
        return '0';
    }

    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function bindUserToPageAccount(user) {
    var nameEl = document.getElementById('page-account-username');
    var balanceEl = document.getElementById('page-account-balance');

    if (!user) {
        return;
    }

    if (nameEl) {
        nameEl.textContent = user.name || user.username || user.email || 'Player';
    }

    if (balanceEl) {
        balanceEl.textContent = formatAccountBalance(user.balance != null ? user.balance : 0);
    }
}

async function loadPageAccountProfile() {
    if (window.Login1 && typeof window.Login1.captureTokenFromUrl === 'function') {
        await window.Login1.captureTokenFromUrl();
    }

    if (window.Login1 && typeof window.Login1.initLogin1Session === 'function') {
        await window.Login1.initLogin1Session();
    }

    if (!window.Login1 || typeof window.Login1.getAuthToken !== 'function') {
        bindUserToPageAccount({ name: 'Player', balance: 0 });
        return;
    }

    var token = window.Login1.getAuthToken();

    if (!token) {
        bindUserToPageAccount({ name: 'Player', balance: 0 });
        return;
    }

    try {
        var apiBase = (window.RubyClubConfig && window.RubyClubConfig.API_BASE) || 'https://rubyclubph.com';
        var response = await fetch(apiBase + '/api/v1/user/me', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: 'Bearer ' + token
            }
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        var data = await response.json();
        var user = window.Login1.normalizeUser ? window.Login1.normalizeUser(data) : (data.user || data);
        bindUserToPageAccount(user);
    } catch (err) {
        console.error('Không tải được profile account page:', err);
    }
}

function setAccountFooterActive() {
    if (!window.Footer || typeof window.Footer.setActiveItem !== 'function') {
        return;
    }

    var accountItem = document.querySelector('.login1-footer__item[aria-label="Account"]');

    if (accountItem) {
        window.Footer.setActiveItem(accountItem);
    }
}

function bindPageAccountEvents(root) {
    var scope = root || document;
    var pageRoot = scope.querySelector ? scope.querySelector('#page-account') : getPageAccountRoot();

    if (!pageRoot || pageRoot.dataset.accountBound === '1') {
        return;
    }

    pageRoot.dataset.accountBound = '1';

    pageRoot.addEventListener('click', function (e) {
        var actionBtn = e.target.closest('[data-action]');

        if (!actionBtn || !pageRoot.contains(actionBtn)) {
            return;
        }

        if (actionBtn.getAttribute('data-action') === 'mail') {
            if (typeof window.openMailPopupFromEvent === 'function') {
                window.openMailPopupFromEvent(e);
            }
            return;
        }

        if (typeof window.showToast === 'function') {
            window.showToast('Comming soon');
        }
    });

    var logoutBtn = pageRoot.querySelector('#page-account-logout');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (window.Login1 && typeof window.Login1.clearAuthSession === 'function') {
                window.Login1.clearAuthSession();
            } else {
                localStorage.removeItem('rubyclub_auth_token');
                localStorage.removeItem('rubyclub_auth_token_expires_at');
            }

            window.location.href = '/index.html';
        });
    }
}

function initPageAccount(options) {
    options = options || {};
    var tasks = [];

    bindPageAccountEvents(options.root);

    if (window.Header) {
        tasks.push(window.Header.init({ container: document.getElementById('header-mount') }));
    }

    if (window.Footer) {
        tasks.push(
            window.Footer.init({ container: document.getElementById('footer-mount') }).then(function () {
                setAccountFooterActive();
            })
        );
    }

    if (window.PopupMail) {
        tasks.push(window.PopupMail.init({ container: document.getElementById('mail-mount') }));
    }

    if (window.PopupDeposit) {
        tasks.push(window.PopupDeposit.init({ container: document.getElementById('deposit-mount') }));
    }

    return Promise.all(tasks).then(function () {
        return loadPageAccountProfile();
    });
}

window.PageAccount = {
    init: initPageAccount,
    bindUser: bindUserToPageAccount
};
