var mailDetailEventsBound = false;
var mailDetailCurrentMail = null;

function getMailDetailOverlay() {
    return document.getElementById('maildetail-overlay');
}

function getMailDetailApiBase() {
    return (window.RubyClubConfig && window.RubyClubConfig.API_BASE) || 'https://rubyclubph.com';
}

function escapeMailDetailHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatMailDetailAmount(amount) {
    var num = Number(amount);

    if (Number.isNaN(num)) {
        return '0';
    }

    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function getMailDetailContent(mail) {
    if (!mail) {
        return '';
    }

    return mail.content || mail.body || mail.message || '';
}

function getMailDetailAmount(mail) {
    if (!mail || mail.amount == null || mail.amount === '') {
        return 0;
    }

    var amount = Number(mail.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        return 0;
    }

    return amount;
}

function isMailDetailClaimed(mail) {
    if (!mail || mail.isClaimed == null || mail.isClaimed === '') {
        return false;
    }

    var claimed = mail.isClaimed;

    if (claimed === true || claimed === 1 || claimed === '1') {
        return true;
    }

    if (claimed === false || claimed === 0 || claimed === '0') {
        return false;
    }

    if (typeof claimed === 'string') {
        var normalized = claimed.toLowerCase();

        if (normalized === 'true' || normalized === '1') {
            return true;
        }

        if (normalized === 'false' || normalized === '0') {
            return false;
        }
    }

    return Boolean(claimed);
}

function canReceiveMailDetail(mail) {
    return getMailDetailAmount(mail) > 0 && !isMailDetailClaimed(mail);
}

function getMailDetailHeading(mail) {
    if (mail && mail.title) {
        return mail.title;
    }

    return 'Mail';
}

function renderMailDetail(mail) {
    var overlay = getMailDetailOverlay();
    var dialogEl = overlay ? overlay.querySelector('.maildetail') : null;
    var headingEl = document.getElementById('maildetail-title');
    var rewardEl = document.getElementById('maildetail-reward');
    var coinEl = document.getElementById('maildetail-coin');
    var amountEl = document.getElementById('maildetail-amount');
    var contentEl = document.getElementById('maildetail-content');
    var receiveBtn = document.getElementById('maildetail-receive');

    if (!headingEl || !rewardEl || !amountEl || !contentEl || !receiveBtn) {
        return;
    }

    var amount = getMailDetailAmount(mail);
    var hasReward = amount > 0;
    var isClaimed = isMailDetailClaimed(mail);
    var canReceive = canReceiveMailDetail(mail);
    var fullContent = getMailDetailContent(mail);

    headingEl.textContent = getMailDetailHeading(mail);

    if (dialogEl) {
        dialogEl.classList.toggle('maildetail--has-reward', hasReward);
        dialogEl.classList.toggle('maildetail--claimed', isClaimed);
        dialogEl.classList.toggle('maildetail--show-receive', canReceive);
    }

    amountEl.textContent = hasReward ? formatMailDetailAmount(amount) : '';

    if (coinEl) {
        if (hasReward) {
            coinEl.src = '/assets/image/function/mail/icon_coin.png';
        } else {
            coinEl.removeAttribute('src');
        }
    }

    contentEl.textContent = fullContent;

    receiveBtn.textContent = 'Receive';
    receiveBtn.disabled = !canReceive;

    if (canReceive) {
        receiveBtn.removeAttribute('hidden');
    } else {
        receiveBtn.setAttribute('hidden', '');
    }
}

async function readMailDetail(id) {
    var token = typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null;

    if (!token) {
        throw new Error('Not logged in');
    }

    var response = await fetch(getMailDetailApiBase() + '/api/v1/mail/read/' + encodeURIComponent(id), {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + token
        }
    });

    if (!response.ok) {
        throw new Error('HTTP ' + response.status);
    }
    // console.log( "readMailDetail", response.json());
    return response.json();
}

async function markMailDetailAsRead(mail) {
    if (!mail || !mail.id || mail.isRead) {
        return;
    }

    try {
        await readMailDetail(String(mail.id));
        if(!mail.isClaimed){
            return;
        }
        mail.isRead = true;

        if (mailDetailCurrentMail && String(mailDetailCurrentMail.id) === String(mail.id)) {
            mailDetailCurrentMail.isRead = true;
        }

        if (window.PopupMail && typeof window.PopupMail.markMailAsRead === 'function') {
            window.PopupMail.markMailAsRead(String(mail.id));
        }
    } catch (err) {
        console.error('Failed to mark mail as read:', err);
    }
}

async function claimMailDetail(id) {
    var token = typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null;

    if (!token) {
        throw new Error('Not logged in');
    }

    var response = await fetch(getMailDetailApiBase() + '/api/v1/mail/claim/' + encodeURIComponent(id), {
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

async function handleMailDetailReceive() {
    if (!mailDetailCurrentMail || !mailDetailCurrentMail.id) {
        return;
    }

    var receiveBtn = document.getElementById('maildetail-receive');

    if (receiveBtn) {
        receiveBtn.disabled = true;
    }

    try {
        await claimMailDetail(String(mailDetailCurrentMail.id));
        mailDetailCurrentMail.isClaimed = true;

        if (window.PopupMail && typeof window.PopupMail.updateSavedMailListItem === 'function') {
            window.PopupMail.updateSavedMailListItem(String(mailDetailCurrentMail.id), { isClaimed: true });
        }

        renderMailDetail(mailDetailCurrentMail);

        if (typeof window.showToast === 'function') {
            window.showToast('Reward claimed successfully');
        }

        if (window.PopupMail && typeof window.PopupMail.reloadList === 'function') {
            if (typeof window.PopupMail.invalidateListCache === 'function') {
                window.PopupMail.invalidateListCache();
            }

            await window.PopupMail.reloadList({ forceRefresh: true });
        }
        if(window.Login1 && typeof window.Login1.refreshUserProfile === 'function'){
            await window.Login1.refreshUserProfile();
            
        }

        closePopupMailDetail();
    } catch (err) {
        console.error('Failed to claim reward:', err);

        if (receiveBtn) {
            receiveBtn.disabled = false;
        }

        if (typeof window.showToast === 'function') {
            window.showToastError('Failed to claim reward');
        }
    }
}

function openPopupMailDetail(mail) {
    var overlay = getMailDetailOverlay();

    if (!overlay || !mail) {
        return;
    }

    mailDetailCurrentMail = mail;
    renderMailDetail(mail);
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    markMailDetailAsRead(mail);
}

function closePopupMailDetail() {
    var overlay = getMailDetailOverlay();

    if (!overlay) {
        return;
    }

    overlay.classList.remove('is-open');
    if (typeof window.releaseFocusWithin === 'function') {
        window.releaseFocusWithin(overlay);
    }
    overlay.setAttribute('aria-hidden', 'true');
    mailDetailCurrentMail = null;

    var dialogEl = overlay.querySelector('.maildetail');

    if (dialogEl) {
        dialogEl.classList.remove('maildetail--has-reward', 'maildetail--claimed', 'maildetail--show-receive');
    }
}

function bindPopupMailDetailEvents(root) {
    var scope = root || document;
    var overlay = scope.querySelector ? scope.querySelector('#maildetail-overlay') : getMailDetailOverlay();

    if (!overlay) {
        return;
    }

    if (mailDetailEventsBound && !root) {
        return;
    }

    mailDetailEventsBound = true;

    var closeBtn = overlay.querySelector('#maildetail-close');
    var receiveBtn = overlay.querySelector('#maildetail-receive');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePopupMailDetail);
    }

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closePopupMailDetail();
        }
    });

    if (!window.__mailDetailEscapeBound) {
        window.__mailDetailEscapeBound = true;
        document.addEventListener('keydown', function (e) {
            var el = getMailDetailOverlay();

            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                closePopupMailDetail();
            }
        });
    }

    if (receiveBtn) {
        receiveBtn.addEventListener('click', handleMailDetailReceive);
    }
}

function mountPopupMailDetail(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindPopupMailDetailEvents(container);
        return Promise.resolve(true);
    }

    return fetch('/view/function/maildetail.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindPopupMailDetailEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Could not load mail detail popup:', err);
            return false;
        });
}

function initPopupMailDetail(options) {
    options = options || {};
    var container = options.container || document.getElementById('maildetail-mount');

    if (getMailDetailOverlay()) {
        bindPopupMailDetailEvents();

        if (options.openOnLoad && options.mail) {
            openPopupMailDetail(options.mail);
        }

        return Promise.resolve(true);
    }

    return mountPopupMailDetail(container).then(function (ok) {
        if (ok && options.openOnLoad && options.mail) {
            openPopupMailDetail(options.mail);
        }

        return ok;
    });
}

window.PopupMailDetail = {
    init: initPopupMailDetail,
    open: openPopupMailDetail,
    close: closePopupMailDetail,
    mount: mountPopupMailDetail,
    claimMail: claimMailDetail,
    readMail: readMailDetail
};
