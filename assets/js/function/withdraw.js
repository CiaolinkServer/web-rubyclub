var WITHDRAW_ICON_BASE = '/assets/image/function/deposit/';
var withdrawSettings = null;
var withdrawActiveChannel = '';
var withdrawActiveMode = 'reward';
var withdrawHistoryLoaded = false;
var withdrawHistoryList = [];
var withdrawHistoryActiveChannel = '';
var withdrawSelectedAmount = '';

var WITHDRAW_CHANNEL_META = {
    gcash: {
        icon: WITHDRAW_ICON_BASE + 'icon_payment_gcash.png',
        label: 'GCash'
    },
    paymaya: {
        icon: WITHDRAW_ICON_BASE + 'icon_payment_maya.png',
        label: 'Maya'
    },
    maya: {
        icon: WITHDRAW_ICON_BASE + 'icon_payment_maya.png',
        label: 'Maya'
    }
};

function getWithdrawOverlay() {
    return document.getElementById('withdraw-overlay');
}

function escapeWithdrawHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normalizeWithdrawChannelKey(key) {
    return String(key || '').trim().toLowerCase();
}

function getWithdrawChannelMeta(key) {
    var normalized = normalizeWithdrawChannelKey(key);

    if (WITHDRAW_CHANNEL_META[normalized]) {
        return WITHDRAW_CHANNEL_META[normalized];
    }

    return {
        icon: '',
        label: key
    };
}

function getWithdrawChannels(settings) {
    var channels = [];
    var channelsMap = settings && settings.withdrawChannels;
    var keys;
    var i;

    if (channelsMap && typeof channelsMap === 'object') {
        keys = Object.keys(channelsMap);

        for (i = 0; i < keys.length; i++) {
            channels.push(keys[i]);
        }
    }

    if (!channels.length) {
        channels = ['gcash', 'paymaya'];
    }

    return channels;
}

function findWithdrawChannelData(settings, channel) {
    var channelsMap = settings && settings.withdrawChannels;
    var channelData;

    if (!channelsMap || !channel) {
        return null;
    }

    channelData = channelsMap[channel];

    if (channelData) {
        return channelData;
    }

    Object.keys(channelsMap).some(function (key) {
        if (normalizeWithdrawChannelKey(key) === normalizeWithdrawChannelKey(channel)) {
            channelData = channelsMap[key];
            return true;
        }

        return false;
    });

    return channelData || null;
}

function formatWithdrawAmountLabel(amount) {
    var value = String(amount == null ? '' : amount).trim();

    if (!value) {
        return '';
    }

    if (/p$/i.test(value)) {
        return value;
    }

    return value + 'P';
}

function getWithdrawStep2AmountDisplay(amount) {
    var value = String(amount == null ? '' : amount).trim();

    if (!value) {
        return '0';
    }

    return value.replace(/p$/i, '');
}

function getWithdrawAmountsForChannel(settings, channel) {
    var channelData = findWithdrawChannelData(settings, channel);
    var amounts = channelData && Array.isArray(channelData.amounts) ? channelData.amounts : [];

    return amounts
        .map(function (amount) {
            return String(amount).trim();
        })
        .filter(function (amount) {
            return !!amount;
        });
}

function getWithdrawStep1Element() {
    return document.getElementById('withdraw-step1');
}

function getWithdrawStep2Element() {
    return document.getElementById('withdraw-step2');
}

function isWithdrawStep2Visible() {
    var overlay = getWithdrawOverlay();

    return !!(overlay && overlay.classList.contains('withdraw-overlay--step2'));
}

function showWithdrawStep1() {
    var overlay = getWithdrawOverlay();
    var step1 = getWithdrawStep1Element();
    var step2 = getWithdrawStep2Element();
    var numberInput = document.getElementById('withdraw-step2-number');
    var confirmInput = document.getElementById('withdraw-step2-confirm');

    if (overlay) {
        overlay.classList.remove('withdraw-overlay--step2');
    }

    if (step2) {
        if (typeof window.releaseFocusWithin === 'function') {
            window.releaseFocusWithin(step2);
        }
        step2.hidden = true;
    }

    if (numberInput) {
        numberInput.value = '';
    }

    if (confirmInput) {
        confirmInput.value = '';
    }

    withdrawSelectedAmount = '';
}

function renderWithdrawStep2Labels() {
    var channelMeta = getWithdrawChannelMeta(withdrawActiveChannel);
    var channelLabel = channelMeta.label || withdrawActiveChannel || 'payment';
    var amountEl = document.getElementById('withdraw-step2-amount');
    var numberLabel = document.getElementById('withdraw-step2-number-label');
    var confirmLabel = document.getElementById('withdraw-step2-confirm-label');
    // var numberInput = document.getElementById('withdraw-step2-number');
    // var confirmInput = document.getElementById('withdraw-step2-confirm');

    if (amountEl) {
        amountEl.textContent = getWithdrawStep2AmountDisplay(withdrawSelectedAmount);
    }

    if (numberLabel) {
        numberLabel.textContent = 'Enter your ' + channelLabel + ' number';
    }

    if (confirmLabel) {
        confirmLabel.textContent = 'Confirm your ' + channelLabel + ' number';
    }

    // if (numberInput) {
    //     numberInput.placeholder = 'Enter your ' + channelLabel + ' number';
    // }

    // if (confirmInput) {
    //     confirmInput.placeholder = 'Confirm your ' + channelLabel + ' number';
    // }
}

function showWithdrawStep2(amount) {
    var overlay = getWithdrawOverlay();
    var step1 = getWithdrawStep1Element();
    var step2 = getWithdrawStep2Element();

    withdrawSelectedAmount = String(amount || '').trim();
    renderWithdrawStep2Labels();

    if (overlay) {
        overlay.classList.add('withdraw-overlay--step2');
    }

    if (step2) {
        step2.hidden = false;
    }
}

function backFromWithdrawStep2() {
    showWithdrawStep1();
}

function renderWithdrawChannels(channels) {
    var channelsEl = document.getElementById('withdraw-channels');

    if (!channelsEl) {
        return;
    }

    if (!channels.length) {
        channelsEl.innerHTML = '';
        withdrawActiveChannel = '';
        return;
    }

    if (!withdrawActiveChannel || channels.indexOf(withdrawActiveChannel) === -1) {
        withdrawActiveChannel = channels[0];
    }

    channelsEl.innerHTML = channels.map(function (channel) {
        var meta = getWithdrawChannelMeta(channel);
        var isActive = channel === withdrawActiveChannel;

        return (
            '<button type="button" class="withdraw__channel' + (isActive ? ' is-active' : '') + '" role="tab"' +
                ' aria-selected="' + (isActive ? 'true' : 'false') + '"' +
                ' data-channel="' + escapeWithdrawHtml(channel) + '">' +
                (meta.icon
                    ? '<img src="' + escapeWithdrawHtml(meta.icon) + '" alt="' + escapeWithdrawHtml(meta.label) + '">'
                    : '<span>' + escapeWithdrawHtml(meta.label) + '</span>') +
            '</button>'
        );
    }).join('');
}

function renderWithdrawAmounts(amounts) {
    var amountsEl = document.getElementById('withdraw-amounts');
    var emptyEl = document.getElementById('withdraw-empty');

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
        var label = formatWithdrawAmountLabel(amount);

        return (
            '<button type="button" class="withdraw__amount" data-amount="' + escapeWithdrawHtml(amount) + '">' +
                escapeWithdrawHtml(label) +
            '</button>'
        );
    }).join('');
}

function formatWithdrawHistoryAmount(value) {
    var num = Number(value);

    if (Number.isNaN(num)) {
        return String(value == null ? '0' : value);
    }

    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function formatWithdrawHistoryDate(value) {
    if (!value) {
        return '';
    }

    var date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function getWithdrawHistoryChannels(withdrawals) {
    var channels = [];
    var seen = {};
    var i;
    var key;

    for (i = 0; i < withdrawals.length; i++) {
        key = normalizeWithdrawChannelKey(withdrawals[i].channel);

        if (!key || seen[key]) {
            continue;
        }

        seen[key] = true;
        channels.push(key);
    }

    return channels;
}

function renderWithdrawHistoryChannels(channels) {
    var channelsEl = document.getElementById('withdraw-history-channels');

    if (!channelsEl) {
        return;
    }

    if (!channels.length) {
        channelsEl.innerHTML = '';
        withdrawHistoryActiveChannel = '';
        return;
    }

    if (!withdrawHistoryActiveChannel || channels.indexOf(withdrawHistoryActiveChannel) === -1) {
        withdrawHistoryActiveChannel = channels[0];
    }

    channelsEl.innerHTML = channels.map(function (channel) {
        var meta = getWithdrawChannelMeta(channel);
        var isActive = channel === withdrawHistoryActiveChannel;

        return (
            '<button type="button" class="withdraw__channel' + (isActive ? ' is-active' : '') + '" role="tab"' +
                ' aria-selected="' + (isActive ? 'true' : 'false') + '"' +
                ' data-channel="' + escapeWithdrawHtml(channel) + '">' +
                (meta.icon
                    ? '<img src="' + escapeWithdrawHtml(meta.icon) + '" alt="' + escapeWithdrawHtml(meta.label) + '">'
                    : '<span>' + escapeWithdrawHtml(meta.label) + '</span>') +
            '</button>'
        );
    }).join('');
}

function getFilteredWithdrawHistory() {
    if (!withdrawHistoryActiveChannel) {
        return withdrawHistoryList.slice();
    }

    return withdrawHistoryList.filter(function (item) {
        return normalizeWithdrawChannelKey(item.channel) === withdrawHistoryActiveChannel;
    });
}

function formatWithdrawHistoryStatusMeta(status) {
    switch (status) {
        case 1:
            return { label: 'Pending', modifier: '' };
        case 2:
            return { label: 'Rejected', modifier: 'is-failed' };
        case 3:
            return { label: 'Done', modifier: 'is-done' };
        case 4:
            return { label: 'Processing', modifier: 'is-done' };
        case 5:
            return { label: 'Completed', modifier: 'is-completed' };
        case 6:
            return { label: 'Failed', modifier: 'is-failed' };
        case 7:
            return { label: 'Refunded', modifier: '' };
        case 8:
            return { label: 'Canceled', modifier: 'is-canceled' };
        default:
            return { label: 'Unknown', modifier: '' };
    }
}

function renderWithdrawHistoryTable() {
    var historyBodyEl = document.getElementById('withdraw-history');
    var historyWrapEl = document.getElementById('withdraw-history-wrap');
    var emptyEl = document.getElementById('withdraw-history-empty');
    var withdrawals = getFilteredWithdrawHistory();

    if (!historyBodyEl || !emptyEl) {
        return;
    }

    if (!withdrawHistoryList.length) {
        historyBodyEl.innerHTML = '';
        if (historyWrapEl) {
            historyWrapEl.hidden = true;
        }
        emptyEl.textContent = 'No withdraw history yet';
        emptyEl.hidden = false;
        return;
    }

    if (!withdrawals.length) {
        historyBodyEl.innerHTML = '';
        if (historyWrapEl) {
            historyWrapEl.hidden = true;
        }
        emptyEl.textContent = 'No history for this channel';
        emptyEl.hidden = false;
        return;
    }

    emptyEl.hidden = true;
    if (historyWrapEl) {
        historyWrapEl.hidden = false;
    }

    historyBodyEl.innerHTML = withdrawals.map(function (item) {
        var amount = item.fiatAmount != null ? item.fiatAmount : item.amount;
        var statusMeta = formatWithdrawHistoryStatusMeta(item.status);
        var createdAt = formatWithdrawHistoryDate(item.createdAt);
        var mobile = item.receiver || item.sender || '';

        return (
            '<tr class="withdraw__history-row">' +
                '<td class="withdraw__history-time">' + escapeWithdrawHtml(createdAt) + '</td>' +
                '<td class="withdraw__history-pesos">' + escapeWithdrawHtml(formatWithdrawHistoryAmount(amount)) + 'P</td>' +
                '<td class="withdraw__history-mobile">' + escapeWithdrawHtml(mobile) + '</td>' +
                '<td class="withdraw__history-status' + (statusMeta.modifier ? ' ' + statusMeta.modifier : '') + '">' +
                    escapeWithdrawHtml(statusMeta.label) +
                '</td>' +
            '</tr>'
        );
    }).join('');
}

function renderWithdrawHistory(withdrawals) {
    withdrawHistoryList = Array.isArray(withdrawals) ? withdrawals : [];
    renderWithdrawHistoryChannels(getWithdrawHistoryChannels(withdrawHistoryList));
    renderWithdrawHistoryTable();
}

function renderWithdrawView(settings) {
    withdrawSettings = settings || null;
    renderWithdrawChannels(getWithdrawChannels(withdrawSettings));
    renderWithdrawAmounts(getWithdrawAmountsForChannel(withdrawSettings, withdrawActiveChannel));
}

function setWithdrawMode(mode) {
    var rewardView = document.getElementById('withdraw-view-reward');
    var historyView = document.getElementById('withdraw-view-history');
    var rewardTab = document.getElementById('withdraw-tab-reward');
    var historyTab = document.getElementById('withdraw-tab-history');
    var nextMode = mode === 'history' ? 'history' : 'reward';

    withdrawActiveMode = nextMode;

    if (rewardTab) {
        rewardTab.classList.toggle('is-active', nextMode === 'reward');
        rewardTab.setAttribute('aria-selected', nextMode === 'reward' ? 'true' : 'false');
    }

    if (historyTab) {
        historyTab.classList.toggle('is-active', nextMode === 'history');
        historyTab.setAttribute('aria-selected', nextMode === 'history' ? 'true' : 'false');
    }

    if (rewardView) {
        rewardView.hidden = nextMode !== 'reward';
    }

    if (historyView) {
        historyView.hidden = nextMode !== 'history';
    }

    if (nextMode === 'history') {
        loadWithdrawHistory();
    }
}

async function loadWithdrawSettings() {
    if (window.Footer && typeof window.Footer.getSettings === 'function') {
        return window.Footer.getSettings();
    }

    throw new Error('Could not load settings');
}

function getWithdrawApiBase() {
    return (window.RubyClubConfig && window.RubyClubConfig.API_BASE) || 'https://rubyclubph.com';
}

async function fetchWithdrawHistory() {
    var token = typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null;

    if (!token) {
        throw new Error('Not logged in');
    }

    var response = await fetch(getWithdrawApiBase() + '/api/v1/withdraw/mine?page=1&pageSize=20', {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + token
        }
    });

    if (!response.ok) {
        throw new Error('HTTP ' + response.status);
    }

    return response.json();
}

async function loadWithdrawHistory(force) {
    if (withdrawHistoryLoaded && !force) {
        return;
    }

    var historyBodyEl = document.getElementById('withdraw-history');
    var historyWrapEl = document.getElementById('withdraw-history-wrap');
    var emptyEl = document.getElementById('withdraw-history-empty');

    if (historyBodyEl) {
        historyBodyEl.innerHTML = '';
    }

    if (historyWrapEl) {
        historyWrapEl.hidden = false;
    }

    if (emptyEl) {
        emptyEl.textContent = 'No withdraw history yet';
        emptyEl.hidden = true;
    }

    try {
        var data = await fetchWithdrawHistory();
        var withdrawals = Array.isArray(data.withdrawals) ? data.withdrawals : [];

        renderWithdrawHistory(withdrawals);
        withdrawHistoryLoaded = true;
    } catch (err) {
        console.error('Could not load withdraw history:', err);
        renderWithdrawHistory([]);

        if (typeof window.showToast === 'function') {
            window.showToastError('Could not load withdraw history');
        }
    }
}

function handleWithdrawAmountSelect(amount) {
    showWithdrawStep2(amount);
}

async function handleWithdrawStep2Confirm() {
    try{
        var numberInput = document.getElementById('withdraw-step2-number');
        var confirmInput = document.getElementById('withdraw-step2-confirm');
        var numberValue = numberInput ? numberInput.value.trim() : '';
        var confirmValue = confirmInput ? confirmInput.value.trim() : '';

        if (!numberValue || !confirmValue) {
            if (typeof window.showToast === 'function') {
                window.showToastError('Enter full account number');
            }
            return;
        }

        if (numberValue !== confirmValue) {
            if (typeof window.showToast === 'function') {
                window.showToastError('Account number confirmation does not match');
            }
            return;
        }
        //call api to withdraw
        //channel: gcash, maya
        token = typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null;
        if (!token) {
            window.showToastError('Not logged in');
            return;
        }
        console.log("withdrawSelectedAmount"+parseFloat(withdrawSelectedAmount));
        console.log("numberValue"+numberValue);
        console.log("withdrawActiveChannel"+withdrawActiveChannel);
        var response = await fetch(getWithdrawApiBase() + '/api/v1/withdraw', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({
                amount: parseFloat(withdrawSelectedAmount),
                receiver: numberValue,
                channel: withdrawActiveChannel
            })
        });
        // if (!response.ok) {
        //     throw new Error('HTTP ' + response.status);
        // }
        var data = await response.json();
        // console.log("data"+JSON.stringify(data));
        if (data.withdrawal) {
            if (typeof window.showToast === 'function') {
                window.showToast('Withdraw confirm success: ' + formatWithdrawAmountLabel(withdrawSelectedAmount));
            }
        } else {
            if (typeof window.showToastError === 'function') {
                window.showToastError(data.message);
            }
        }
    } catch (err) {
        if (typeof window.showToastError === 'function') {
            window.showToastError('Withdraw confirm failed: ' + err.message);
        }
    }
}

function openPopupWithdraw() {
    var overlay = getWithdrawOverlay();

    if (!overlay) {
        return;
    }

    showWithdrawStep1();
    setWithdrawMode('reward');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    loadWithdrawSettings()
        .then(function (settings) {
            renderWithdrawView(settings);
        })
        .catch(function (err) {
            console.error('Could not load settings for withdraw:', err);

            if (typeof window.showToast === 'function') {
                window.showToastError('Could not load withdraw settings');
            }

            renderWithdrawView(null);
        });
}

function closePopupWithdraw() {
    var overlay = getWithdrawOverlay();

    if (!overlay) {
        return;
    }

    showWithdrawStep1();
    if (typeof window.releaseFocusWithin === 'function') {
        window.releaseFocusWithin(overlay);
    }
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function bindPopupWithdrawEvents(root) {
    var scope = root || document;
    var overlay = scope.querySelector ? scope.querySelector('#withdraw-overlay') : getWithdrawOverlay();

    if (!overlay) {
        return;
    }

    if (overlay.dataset.withdrawEventsBound === '1') {
        return;
    }

    overlay.dataset.withdrawEventsBound = '1';

    var modeTabsEl = overlay.querySelector('#withdraw-mode-tabs');
    var channelsEl = overlay.querySelector('#withdraw-channels');
    var historyChannelsEl = overlay.querySelector('#withdraw-history-channels');
    var amountsEl = overlay.querySelector('#withdraw-amounts');

    overlay.addEventListener('click', function (e) {
        if (e.target.closest('#withdraw-step2-close')) {
            e.preventDefault();
            e.stopPropagation();
            backFromWithdrawStep2();
            return;
        }

        if (e.target.closest('#withdraw-close')) {
            e.preventDefault();
            e.stopPropagation();
            closePopupWithdraw();
            return;
        }

        if (e.target === overlay) {
            if (isWithdrawStep2Visible()) {
                backFromWithdrawStep2();
            } else {
                closePopupWithdraw();
            }
        }
    });

    if (!window.__withdrawEscapeBound) {
        window.__withdrawEscapeBound = true;

        document.addEventListener('keydown', function (e) {
            var el = getWithdrawOverlay();

            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                if (isWithdrawStep2Visible()) {
                    backFromWithdrawStep2();
                } else {
                    closePopupWithdraw();
                }
            }
        });
    }

    if (modeTabsEl) {
        modeTabsEl.addEventListener('click', function (e) {
            var tab = e.target.closest('.withdraw__mode-tab');

            if (!tab || !modeTabsEl.contains(tab)) {
                return;
            }

            setWithdrawMode(tab.getAttribute('data-mode') || 'reward');
        });
    }

    if (channelsEl) {
        channelsEl.addEventListener('click', function (e) {
            var channelBtn = e.target.closest('.withdraw__channel');

            if (!channelBtn || !channelsEl.contains(channelBtn)) {
                return;
            }

            withdrawActiveChannel = channelBtn.getAttribute('data-channel') || '';
            renderWithdrawChannels(getWithdrawChannels(withdrawSettings));
            renderWithdrawAmounts(getWithdrawAmountsForChannel(withdrawSettings, withdrawActiveChannel));
        });
    }

    if (historyChannelsEl) {
        historyChannelsEl.addEventListener('click', function (e) {
            var channelBtn = e.target.closest('.withdraw__channel');

            if (!channelBtn || !historyChannelsEl.contains(channelBtn)) {
                return;
            }

            withdrawHistoryActiveChannel = channelBtn.getAttribute('data-channel') || '';
            renderWithdrawHistoryChannels(getWithdrawHistoryChannels(withdrawHistoryList));
            renderWithdrawHistoryTable();
        });
    }

    if (amountsEl) {
        amountsEl.addEventListener('click', function (e) {
            var amountBtn = e.target.closest('.withdraw__amount');

            if (!amountBtn || !amountsEl.contains(amountBtn)) {
                return;
            }

            handleWithdrawAmountSelect(amountBtn.getAttribute('data-amount'));
        });
    }

    var step2ConfirmBtn = overlay.querySelector('#withdraw-step2-confirm-button');
    var step2CancelBtn = overlay.querySelector('#withdraw-step2-cancel-button');

    if (step2ConfirmBtn) {
        step2ConfirmBtn.addEventListener('click', handleWithdrawStep2Confirm);
    }

    if (step2CancelBtn) {
        step2CancelBtn.addEventListener('click', backFromWithdrawStep2);
    }
}

function mountPopupWithdraw(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindPopupWithdrawEvents(container);
        return Promise.resolve(true);
    }

    return fetch('/view/function/withdraw.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindPopupWithdrawEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Could not load withdraw popup:', err);
            return false;
        });
}

function initPopupWithdraw(options) {
    options = options || {};
    var container = options.container || document.getElementById('withdraw-mount');

    if (getWithdrawOverlay()) {
        bindPopupWithdrawEvents();

        if (options.openOnLoad) {
            openPopupWithdraw();
        }

        return Promise.resolve(true);
    }

    return mountPopupWithdraw(container).then(function (ok) {
        if (ok && options.openOnLoad) {
            openPopupWithdraw();
        }

        return ok;
    });
}

window.PopupWithdraw = {
    init: initPopupWithdraw,
    open: openPopupWithdraw,
    close: closePopupWithdraw,
    mount: mountPopupWithdraw,
    render: renderWithdrawView,
    setMode: setWithdrawMode,
    showStep1: showWithdrawStep1,
    showStep2: showWithdrawStep2,
    back: backFromWithdrawStep2,
    reloadHistory: function () {
        withdrawHistoryLoaded = false;
        return loadWithdrawHistory(true);
    }
};
