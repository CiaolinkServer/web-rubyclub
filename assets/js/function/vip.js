function getVipOverlay() {
    return document.getElementById('vip-overlay');
}

function formatVipNumber(value) {
    var num = Number(value);

    if (Number.isNaN(num)) {
        return '0';
    }

    return num.toLocaleString('de-DE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

async function bindVipStats(user) {
    var depositEl = document.getElementById('vip-total-deposit');
    var betEl = document.getElementById('vip-total-bet');
    var vipLevelEl = document.getElementById('vip-title');

    if (depositEl) {
        depositEl.textContent = formatVipNumber(user && user.totalDeposit != null ? user.totalDeposit : 0);
    }

    if (betEl) {
        betEl.textContent = formatVipNumber(user && user.totalBet != null ? user.totalBet : 0);
    }
    if(vipLevelEl){
        
        let vipLevel = await getVipConditison(user.totalDeposit, user.totalBet);
        vipLevelEl.textContent = "VIP " + vipLevel;
    }
    
}

async function getVipConditison(totalDeposit, totalBet){
    let vipLevel = 0;
    if(window.Footer && typeof window.Footer.getSettings === 'function'){
        let data = await window.Footer.getSettings();
        let dataVipCondition = data.vips;
        for(let i = dataVipCondition.length -1; i >= 0; i--){
            if(totalDeposit >= Number(dataVipCondition[i].totalDeposit) && totalBet >= Number(dataVipCondition[i].totalBet)){
                vipLevel =  dataVipCondition[i].level;
                break;
            }
        }
    }
    return vipLevel;
}

async function loadVipUserStats() {
    if (window.Login1 && typeof window.Login1.captureTokenFromUrl === 'function') {
        await window.Login1.captureTokenFromUrl();
    }

    if (window.Login1 && typeof window.Login1.initLogin1Session === 'function') {
        await window.Login1.initLogin1Session();
    }

    var token = typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null;

    if (!token) {
        bindVipStats(null);
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
        var user = window.Login1 && window.Login1.normalizeUser
            ? window.Login1.normalizeUser(data)
            : (data.user || data);

        bindVipStats(user);
    } catch (err) {
        console.error('Could not load VIP info:', err);
        bindVipStats(null);
    }
}

function openPopupVip() {
    var overlay = getVipOverlay();

    if (!overlay) {
        return;
    }

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    loadVipUserStats();
}

function closePopupVip() {
    var overlay = getVipOverlay();

    if (!overlay) {
        return;
    }

    overlay.classList.remove('is-open', 'is-dimmed');

    if (typeof window.releaseFocusWithin === 'function') {
        window.releaseFocusWithin(overlay);
    }

    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function setPopupVipDimmed(dimmed) {
    var overlay = getVipOverlay();

    if (!overlay) {
        return;
    }

    overlay.classList.toggle('is-dimmed', !!dimmed);
}

function handleVipUpgrade() {
    closePopupVip();

    if (window.PopupDeposit && typeof window.PopupDeposit.open === 'function') {
        window.PopupDeposit.open();
        return;
    }

    if (typeof window.showToast === 'function') {
        window.showToast('Coming soon');
    }
}

function openSubVipFromVip() {
    var mount = document.getElementById('sub-vip-mount');
    var openSubVip = function () {
        if (window.PopupSubVip && typeof window.PopupSubVip.open === 'function') {
            window.PopupSubVip.open({ fromVip: true });
        }
    };

    if (!window.PopupSubVip) {
        if (typeof window.showToast === 'function') {
            window.showToast('Could not load VIP rules');
        }
        return;
    }

    if (typeof window.PopupSubVip.init === 'function' && mount && !document.getElementById('sub-vip-overlay')) {
        window.PopupSubVip.init({ container: mount }).then(function (ok) {
            if (ok) {
                openSubVip();
            }
        });
        return;
    }

    openSubVip();
}

var vipEventsBound = false;

function bindPopupVipEvents(root) {
    var scope = root || document;
    var overlay = scope.querySelector ? scope.querySelector('#vip-overlay') : getVipOverlay();

    if (!overlay) {
        return;
    }

    if (vipEventsBound && !root) {
        return;
    }
    vipEventsBound = true;

    var closeBtn = overlay.querySelector('#vip-close');
    var helpBtn = overlay.querySelector('#vip-help');
    var upgradeBtn = overlay.querySelector('#vip-upgrade');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePopupVip);
    }

    if (helpBtn) {
        helpBtn.addEventListener('click', openSubVipFromVip);
    }

    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', handleVipUpgrade);
    }

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closePopupVip();
        }
    });

    if (!window.__vipEscapeBound) {
        window.__vipEscapeBound = true;
        document.addEventListener('keydown', function (e) {
            var el = getVipOverlay();
            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                closePopupVip();
            }
        });
    }
}

function mountPopupVip(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindPopupVipEvents(container);
        return Promise.resolve(true);
    }

    return fetch('/view/function/vip.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindPopupVipEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Could not load VIP popup:', err);
            return false;
        });
}

function initPopupVip(options) {
    options = options || {};
    var container = options.container || document.getElementById('vip-mount');

    if (getVipOverlay()) {
        bindPopupVipEvents();
        if (options.openOnLoad) {
            openPopupVip();
        }
        return Promise.resolve(true);
    }

    return mountPopupVip(container).then(function (ok) {
        if (ok && options.openOnLoad) {
            openPopupVip();
        }
        return ok;
    });
}

window.PopupVip = {
    init: initPopupVip,
    open: openPopupVip,
    close: closePopupVip,
    mount: mountPopupVip,
    bindStats: bindVipStats,
    setDimmed: setPopupVipDimmed
};
