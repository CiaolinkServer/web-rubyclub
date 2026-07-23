function getPageAccountRoot() {
    return document.getElementById('page-account');
}

var PAGE_ACCOUNT_UPGRADE_ICON = '/assets/image/page_account/icon_updateacc.png';
var PAGE_ACCOUNT_UPGRADE_ICON_DISABLED = '/assets/image/page_account/icon_updateacc_disable.png';

function updatePageAccountUpgradeTile(user) {
    var upgradeBtn = document.getElementById('page-account-upgrade');
    var upgradeIcon = document.getElementById('page-account-upgrade-icon');
    var spanAccUpgrade = document.getElementById('page-account-upgrade-span');
    var isOfficial = !!(user && user.official);

    if (upgradeIcon) {
        upgradeIcon.src = isOfficial ? PAGE_ACCOUNT_UPGRADE_ICON_DISABLED : PAGE_ACCOUNT_UPGRADE_ICON;
    }

    if (upgradeBtn) {
        upgradeBtn.disabled = isOfficial;
        upgradeBtn.setAttribute('aria-disabled', isOfficial ? 'true' : 'false');
    }
    if (spanAccUpgrade) {
        spanAccUpgrade.style.color = isOfficial ? '#808080' : '#fff';
    }
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
    var playerIdEl = document.getElementById('page-account-playerid');

    if (!user) {
        return;
    }

    if (nameEl) {
        nameEl.textContent = user.name || user.username || user.email || 'Player';
    }

    if (balanceEl) {
        balanceEl.textContent = formatAccountBalance(user.balance != null ? user.balance : 0);
    }

    if (playerIdEl) {
        playerIdEl.textContent = user.sid || '0';
    }

    var copyEl = document.getElementById('page-account-copy');

    if (copyEl) {
        copyEl.setAttribute('data-copy', user.sid || (playerIdEl && playerIdEl.textContent) || '0');
    }

    updatePageAccountUpgradeTile(user);
}

async function copyPlayerId(text) {
    var value = String(text || '').trim();

    if (!value) {
        var playerIdEl = document.getElementById('page-account-playerid');

        if (playerIdEl) {
            value = String(playerIdEl.textContent || '').trim();
        }
    }

    if (!value) {
        return false;
    }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (err) {
        console.error('Copy failed:', err);
    }

    try {
        var textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    } catch (err) {
        console.error('Copy fallback failed:', err);
    }

    return false;
}

function bindPageAccountCopyButton(root) {
    var scope = root || document;
    var copyEl = scope.querySelector ? scope.querySelector('#page-account-copy') : document.getElementById('page-account-copy');

    if (!copyEl || copyEl.dataset.copyBound === '1') {
        return;
    }

    copyEl.dataset.copyBound = '1';

    copyEl.addEventListener('click', function () {
        copyPlayerId(copyEl.getAttribute('data-copy')).then(function (ok) {
            if (ok && typeof window.showToast === 'function') {
                window.showToast('Copied');
            } else if (!ok && typeof window.showToastError === 'function') {
                window.showToastError('Could not copy');
            }
        });
    });
}

async function loadPageAccountProfile() {
    if (window.Login1 && typeof window.Login1.captureTokenFromUrl === 'function') {
        await window.Login1.captureTokenFromUrl();
    }

    if (window.Login1 && typeof window.Login1.initLogin1Session === 'function') {
        await window.Login1.initLogin1Session();
    }

    var token = typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null;

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
        console.error('Could not load account page profile:', err);
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

    bindPageAccountCopyButton(pageRoot);

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

        if (actionBtn.getAttribute('data-action') === 'upgrade') {
            if (actionBtn.disabled) {
                return;
            }

            if (window.PopupUpgrade && typeof window.PopupUpgrade.open === 'function') {
                window.PopupUpgrade.open();
            } else if (typeof window.showToast === 'function') {
                window.showToast('Could not load upgrade popup');
            }
            return;
        }

        if (actionBtn.getAttribute('data-action') === 'topup') {
            if (window.PopupDeposit && typeof window.PopupDeposit.open === 'function') {
                window.PopupDeposit.open();
            } else if (typeof window.showToast === 'function') {
                window.showToast('Coming soon');
            }
            return;
        }

        if (actionBtn.getAttribute('data-action') === 'withdraw') {
            if (window.PopupWithdraw && typeof window.PopupWithdraw.open === 'function') {
                window.PopupWithdraw.open();
            } else if (typeof window.showToast === 'function') {
                window.showToast('Coming soon');
            }
            return;
        }

        if (actionBtn.getAttribute('data-action') === 'vip') {
            if (window.PopupVip && typeof window.PopupVip.open === 'function') {
                window.PopupVip.open();
            } else if (typeof window.showToast === 'function') {
                window.showToast('Could not load VIP popup');
            }
            return;
        }

        if (typeof window.showToast === 'function') {
            window.showToast('Coming soon');
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

    if (window.PopupDepositGuide) {
        tasks.push(window.PopupDepositGuide.init({ container: document.body }));
    }

    if (window.PopupWithdraw) {
        tasks.push(window.PopupWithdraw.init({ container: document.getElementById('withdraw-mount') }));
    }

    if (window.PopupWithdrawGuide) {
        tasks.push(window.PopupWithdrawGuide.init({ container: document.getElementById('withdraw-guide-mount') }));
    }

    if (window.PopupUpgrade) {
        tasks.push(window.PopupUpgrade.init({ container: document.getElementById('popupupgrade-mount') }));
    }

    if (window.PopupSupport) {
        tasks.push(window.PopupSupport.init({ container: document.getElementById('support-mount') }));
    }

    if (window.PopupVip) {
        tasks.push(window.PopupVip.init({ container: document.getElementById('vip-mount') }));
    }

    if (window.PopupSubVip) {
        tasks.push(window.PopupSubVip.init({ container: document.getElementById('sub-vip-mount') }));
    }

    return Promise.all(tasks).then(function () {
        return loadPageAccountProfile();
    });
}

window.PageAccount = {
    init: initPageAccount,
    bindUser: bindUserToPageAccount
};
