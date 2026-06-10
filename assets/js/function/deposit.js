var DEPOSIT_ICON_BASE = '/assets/image/function/deposit/';
var DEPOSIT_COPY_ICON = DEPOSIT_ICON_BASE + 'icon_copy.png';
var depositSettings = null;
var depositActiveChannel = '';
var depositSelectedAmount = '';

var DEPOSIT_CHANNEL_META = {
    gcash: {
        icon: DEPOSIT_ICON_BASE + 'icon_payment_gcash.png',
        label: 'GCash'
    },
    maya: {
        icon: DEPOSIT_ICON_BASE + 'icon_payment_maya.png',
        label: 'Maya'
    }
};

function getDepositOverlay() {
    return document.getElementById('deposit-overlay');
}

function escapeDepositHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normalizeDepositChannelKey(key) {
    return String(key || '').trim().toLowerCase();
}

function getDepositChannelMeta(key) {
    var normalized = normalizeDepositChannelKey(key);

    if (DEPOSIT_CHANNEL_META[normalized]) {
        return DEPOSIT_CHANNEL_META[normalized];
    }

    return {
        icon: '',
        label: key
    };
}

function getDepositChannels(settings) {
    var channels = [];
    var accounts = settings && settings.depositAccounts;
    var keys;
    var i;

    if (accounts && typeof accounts === 'object') {
        keys = Object.keys(accounts);

        for (i = 0; i < keys.length; i++) {
            channels.push(keys[i]);
        }
    }

    if (!channels.length) {
        channels = ['gcash', 'maya'];
    }

    return channels;
}

function formatDepositAmountLabel(amount) {
    var value = String(amount == null ? '' : amount).trim();

    if (!value) {
        return '';
    }

    if (/p$/i.test(value)) {
        return value;
    }

    return value + 'P';
}

function getRecommendDepositAmounts(settings) {
    if (!settings || !Array.isArray(settings.recommendDepositAmount)) {
        return [];
    }

    return settings.recommendDepositAmount
        .map(function (amount) {
            return String(amount).trim();
        })
        .filter(function (amount) {
            return !!amount;
        });
}

function renderDepositTabs(channels) {
    var tabsEl = document.getElementById('deposit-tabs');

    if (!tabsEl) {
        return;
    }

    if (!channels.length) {
        tabsEl.innerHTML = '';
        depositActiveChannel = '';
        return;
    }

    if (!depositActiveChannel || channels.indexOf(depositActiveChannel) === -1) {
        depositActiveChannel = channels[0];
    }

    tabsEl.innerHTML = channels.map(function (channel) {
        var meta = getDepositChannelMeta(channel);
        var isActive = channel === depositActiveChannel;

        return (
            '<button type="button" class="deposit__tab' + (isActive ? ' is-active' : '') + '" role="tab"' +
                ' aria-selected="' + (isActive ? 'true' : 'false') + '"' +
                ' data-channel="' + escapeDepositHtml(channel) + '">' +
                (meta.icon
                    ? '<img src="' + escapeDepositHtml(meta.icon) + '" alt="' + escapeDepositHtml(meta.label) + '">'
                    : '<span>' + escapeDepositHtml(meta.label) + '</span>') +
            '</button>'
        );
    }).join('');
}

function formatDepositSummaryAmount(amount) {
    var value = String(amount == null ? '' : amount).trim().replace(/p$/i, '');

    if (!value) {
        return '0';
    }

    var num = Number(value);

    if (!Number.isNaN(num)) {
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    return value;
}

function parseDepositAccountEntry(entry) {
    if (entry && typeof entry === 'object') {
        return {
            name: String(entry.name == null ? '' : entry.name).trim(),
            number: String(entry.number == null ? '' : entry.number).trim()
        };
    }

    var value = String(entry || '').trim();
    var parts;

    if (!value) {
        return { name: '', number: '' };
    }

    parts = value.split(/[|,;]/).map(function (part) {
        return part.trim();
    }).filter(Boolean);

    if (parts.length >= 2) {
        return {
            name: parts[0],
            number: parts[1]
        };
    }

    return {
        name: '',
        number: value
    };
}

function getDepositAccountsForChannel(settings, channel) {
    var accountsData;
    var channelKey = channel;

    if (!settings || !settings.depositAccounts || !channel) {
        return [];
    }

    accountsData = settings.depositAccounts[channel];

    if (!accountsData && settings.depositAccounts) {
        Object.keys(settings.depositAccounts).some(function (key) {
            if (normalizeDepositChannelKey(key) === normalizeDepositChannelKey(channel)) {
                channelKey = key;
                accountsData = settings.depositAccounts[key];
                return true;
            }

            return false;
        });
    }

    if (!accountsData || !Array.isArray(accountsData.accounts)) {
        return [];
    }

    return accountsData.accounts
        .map(parseDepositAccountEntry)
        .filter(function (account) {
            return !!(account.name || account.number);
        });
}

function getDepositStep1Element() {
    return document.getElementById('deposit-step1');
}

function getDepositStep2Element() {
    return document.getElementById('deposit-step2');
}

function showDepositStep1() {
    var overlay = getDepositOverlay();
    var step1 = getDepositStep1Element();
    var step2 = getDepositStep2Element();
    var refInput = document.getElementById('deposit-step2-ref');

    if (overlay) {
        overlay.classList.remove('deposit-overlay--step2');
    }

    if (step1) {
        step1.hidden = false;
    }

    if (step2) {
        if (typeof window.releaseFocusWithin === 'function') {
            window.releaseFocusWithin(step2);
        }
        step2.hidden = true;
    }

    if (refInput) {
        refInput.value = '';
    }

    depositSelectedAmount = '';
}

function showDepositStep2(amount) {
    var overlay = getDepositOverlay();
    var step1 = getDepositStep1Element();
    var step2 = getDepositStep2Element();

    depositSelectedAmount = String(amount || '').trim();
    renderDepositStep2(depositSelectedAmount);

    if (overlay) {
        overlay.classList.add('deposit-overlay--step2');
    }

    if (step1) {
        step1.hidden = true;
    }

    if (step2) {
        step2.hidden = false;
    }
}

function isDepositStep2Visible() {
    var overlay = getDepositOverlay();

    return !!(overlay && overlay.classList.contains('deposit-overlay--step2'));
}

function backFromDepositStep2() {
    showDepositStep1();
}

function renderDepositStep2Channel(channel) {
    var channelEl = document.getElementById('deposit-step2-channel');
    var meta = getDepositChannelMeta(channel);

    if (!channelEl) {
        return;
    }

    if (!meta.icon) {
        channelEl.innerHTML = '<span class="deposit-step2__channel-badge">' + escapeDepositHtml(meta.label || channel) + '</span>';
        return;
    }

    channelEl.innerHTML =
        '<span class="deposit-step2__channel-badge">' +
            '<img src="' + escapeDepositHtml(meta.icon) + '" alt="' + escapeDepositHtml(meta.label) + '">' +
        '</span>';
}

function renderDepositStep2Accounts(accounts) {
    var accountsEl = document.getElementById('deposit-step2-accounts');

    if (!accountsEl) {
        return;
    }

    if (!accounts.length) {
        accountsEl.innerHTML = '<p class="deposit-step2__empty">Không có tài khoản nạp</p>';
        return;
    }

    accountsEl.innerHTML = accounts.map(function (account) {
        var copyValue = account.number || account.name;
        var hasName = !!account.name;
        var hasNumber = !!account.number;

        return (
            '<div class="deposit-step2__account">' +
                '<div class="deposit-step2__account-info">' +
                    (hasName ? '<span class="deposit-step2__account-name">' + escapeDepositHtml(account.name) + '</span>' : '') +
                    (hasName && hasNumber ? '<span class="deposit-step2__account-divider" aria-hidden="true"></span>' : '') +
                    (hasNumber ? '<span class="deposit-step2__account-number">' + escapeDepositHtml(account.number) + '</span>' : '') +
                '</div>' +
                '<button type="button" class="deposit-step2__copy" data-copy="' + escapeDepositHtml(copyValue) + '" aria-label="Sao chép">' +
                    '<img src="' + escapeDepositHtml(DEPOSIT_COPY_ICON) + '" alt="" aria-hidden="true">' +
                '</button>' +
            '</div>'
        );
    }).join('');
}

function renderDepositStep2(amount) {
    var amountEl = document.getElementById('deposit-step2-amount');
    var descEl = document.getElementById('deposit-step2-step1-desc');
    var channelMeta = getDepositChannelMeta(depositActiveChannel);
    var channelLabel = channelMeta.label || depositActiveChannel || 'payment';
    var accounts = getDepositAccountsForChannel(depositSettings, depositActiveChannel);

    if (amountEl) {
        amountEl.textContent = formatDepositSummaryAmount(amount);
    }

    if (descEl) {
        descEl.textContent = 'Please transfer money to our ' + channelLabel + ' account (choose and transfer to one of the accounts shown below):';
    }

    renderDepositStep2Channel(depositActiveChannel);
    renderDepositStep2Accounts(accounts);
}

async function copyDepositText(text) {
    var value = String(text || '').trim();

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

    return false;
}

function getDepositApiBase() {
    return (window.RubyClubConfig && window.RubyClubConfig.API_BASE) || 'https://rubyclubph.com';
}

async function claimDeposit(tx) {
    var token = typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null;

    if (!token) {
        throw new Error('Chưa đăng nhập');
    }

    var response = await fetch(getDepositApiBase() + '/api/v1/deposit/claim', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
            tx: String(tx || '').trim()
        })
    });

    if (!response.ok) {
        var message = 'HTTP ' + response.status;

        try {
            var errorData = await response.json();

            if (errorData && errorData.message) {
                message = errorData.message;
            }
        } catch (parseErr) {
            // ignore parse error
        }

        throw new Error(message);
    }

    try {
        return await response.json();
    } catch (jsonErr) {
        return {};
    }
}

async function handleDepositSubmit(refInput, submitBtn) {
    var refValue = refInput ? refInput.value.trim() : '';

    if (!refValue) {
        if (typeof window.showToast === 'function') {
            window.showToastError('Nhập reference number');
        }
        return;
    }
    // check if refValue is 6 characters
    if (refValue.length < 6) {
        if (typeof window.showToast === 'function') {
            window.showToastError('Nhập 6 ký tự cuối của reference number ( Ref. no )');
        }
        return;
    }
    refValue = refInput ? refInput.value.slice(-6) : '';
    if (submitBtn) {
        submitBtn.disabled = true;
    }

    try {
        await claimDeposit(refValue);

        if (refInput) {
            refInput.value = '';
        }

        if (typeof window.showToast === 'function') {
            window.showToast('Nạp tiền thành công');
        }

        if (window.Login1 && typeof window.Login1.refreshUserProfile === 'function') {
            await window.Login1.refreshUserProfile();
        }

        showDepositStep1();
    } catch (err) {
        console.error('Claim deposit thất bại:', err);

        if (typeof window.showToast === 'function') {
            window.showToastError(err.message || 'Nạp tiền thất bại');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
}

function renderDepositAmounts(amounts) {
    var amountsEl = document.getElementById('deposit-amounts');
    var emptyEl = document.getElementById('deposit-empty');

    if (!amountsEl || !emptyEl) {
        return;
    }

    if (!amounts.length) {
        amountsEl.innerHTML = '';
        emptyEl.hidden = false;
        return;
    }

    emptyEl.hidden = true;
    amountsEl.innerHTML = amounts.map(function (amount) {
        var label = formatDepositAmountLabel(amount);

        return (
            '<button type="button" class="deposit__amount" data-amount="' + escapeDepositHtml(amount) + '">' +
                escapeDepositHtml(label) +
            '</button>'
        );
    }).join('');
}

function renderDepositView(settings) {
    depositSettings = settings || null;
    renderDepositTabs(getDepositChannels(depositSettings));
    renderDepositAmounts(getRecommendDepositAmounts(depositSettings));
}

async function loadDepositSettings() {
    if (window.Footer && typeof window.Footer.getSettings === 'function') {
        return window.Footer.getSettings();
    }

    throw new Error('Không tải được settings');
}

function openPopupDeposit() {
    var overlay = getDepositOverlay();

    if (!overlay) {
        return;
    }

    showDepositStep1();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    loadDepositSettings()
        .then(function (settings) {
            renderDepositView(settings);
        })
        .catch(function (err) {
            console.error('Không tải được settings cho deposit:', err);

            if (typeof window.showToast === 'function') {
                window.showToastError('Không tải được cài đặt nạp tiền');
            }

            renderDepositView(null);
        });
}

function closePopupDeposit() {
    var overlay = getDepositOverlay();

    if (!overlay) {
        return;
    }

    showDepositStep1();
    if (typeof window.releaseFocusWithin === 'function') {
        window.releaseFocusWithin(overlay);
    }
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function bindPopupDepositEvents(root) {
    var scope = root || document;
    var overlay = scope.querySelector ? scope.querySelector('#deposit-overlay') : getDepositOverlay();

    if (!overlay) {
        return;
    }

    if (overlay.dataset.depositEventsBound === '1') {
        return;
    }

    overlay.dataset.depositEventsBound = '1';

    var tabsEl = overlay.querySelector('#deposit-tabs');
    var amountsEl = overlay.querySelector('#deposit-amounts');
    var accountsEl = overlay.querySelector('#deposit-step2-accounts');
    var submitBtn = overlay.querySelector('#deposit-step2-submit');
    var supportBtn = overlay.querySelector('#deposit-step2-support');
    var refInput = overlay.querySelector('#deposit-step2-ref');

    overlay.addEventListener('click', function (e) {
        if (e.target.closest('#deposit-step2-close')) {
            e.preventDefault();
            e.stopPropagation();
            backFromDepositStep2();
            return;
        }

        if (e.target.closest('#deposit-close')) {
            e.preventDefault();
            e.stopPropagation();
            closePopupDeposit();
            return;
        }

        if (e.target === overlay) {
            if (isDepositStep2Visible()) {
                backFromDepositStep2();
            } else {
                closePopupDeposit();
            }
        }
    });

    if (!window.__depositEscapeBound) {
        window.__depositEscapeBound = true;
        document.addEventListener('keydown', function (e) {
            var el = getDepositOverlay();

            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                if (isDepositStep2Visible()) {
                    backFromDepositStep2();
                } else {
                    closePopupDeposit();
                }
            }
        });
    }

    if (tabsEl) {
        tabsEl.addEventListener('click', function (e) {
            var tab = e.target.closest('.deposit__tab');

            if (!tab || !tabsEl.contains(tab)) {
                return;
            }

            depositActiveChannel = tab.getAttribute('data-channel') || '';
            renderDepositTabs(getDepositChannels(depositSettings));
        });
    }

    if (amountsEl) {
        amountsEl.addEventListener('click', function (e) {
            var amountBtn = e.target.closest('.deposit__amount');

            if (!amountBtn || !amountsEl.contains(amountBtn)) {
                return;
            }

            var amount = amountBtn.getAttribute('data-amount');
            showDepositStep2(amount);
        });
    }

    if (accountsEl) {
        accountsEl.addEventListener('click', function (e) {
            var copyBtn = e.target.closest('.deposit-step2__copy');

            if (!copyBtn || !accountsEl.contains(copyBtn)) {
                return;
            }

            copyDepositText(copyBtn.getAttribute('data-copy')).then(function (ok) {
                if (ok && typeof window.showToast === 'function') {
                    window.showToast('Đã sao chép');
                } else if (!ok && typeof window.showToastError === 'function') {
                    window.showToastError('Không sao chép được');
                }
            });
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', function () {
            handleDepositSubmit(refInput, submitBtn);
        });
    }

    if (supportBtn) {
        supportBtn.addEventListener('click', function () {
            closePopupDeposit();

            if (window.PopupSupport && typeof window.PopupSupport.open === 'function') {
                window.PopupSupport.open();
                return;
            }

            if (typeof window.showToast === 'function') {
                window.showToast('Comming soon');
            }
        });
    }
}

function mountPopupDeposit(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindPopupDepositEvents(container);
        return Promise.resolve(true);
    }

    return fetch('/view/function/deposit.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindPopupDepositEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Không tải được popup deposit:', err);
            return false;
        });
}

function initPopupDeposit(options) {
    options = options || {};
    var container = options.container || document.getElementById('deposit-mount');

    if (getDepositOverlay()) {
        bindPopupDepositEvents();

        if (options.openOnLoad) {
            openPopupDeposit();
        }

        return Promise.resolve(true);
    }

    return mountPopupDeposit(container).then(function (ok) {
        if (ok && options.openOnLoad) {
            openPopupDeposit();
        }

        return ok;
    });
}

window.PopupDeposit = {
    init: initPopupDeposit,
    open: openPopupDeposit,
    close: closePopupDeposit,
    mount: mountPopupDeposit,
    render: renderDepositView,
    showStep1: showDepositStep1,
    showStep2: showDepositStep2,
    back: backFromDepositStep2
};
