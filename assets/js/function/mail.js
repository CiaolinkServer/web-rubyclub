var MAIL_ICON_BASE = '/assets/image/function/mail/';
var MAIL_LIST_CACHE_TTL_MS = 10 * 60 * 1000;
var mailEventsBound = false;
var mailSelectedIds = {};
var mailListCache = {};
var mailListResponseCache = null;

function getMailOverlay() {
    return document.getElementById('mail-overlay');
}

function getMailApiBase() {
    return (window.RubyClubConfig && window.RubyClubConfig.API_BASE) || 'https://rubyclubph.com';
}

function escapeMailHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatMailAmount(amount) {
    var num = Number(amount);

    if (Number.isNaN(num)) {
        return '0';
    }

    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatMailTitle(mail) {
    var amount = mail.amount != null ? Number(mail.amount) : 0;

    if (amount > 0) {
        return formatMailAmount(amount) + '₱';
    }

    if (mail.title) {
        return mail.title;
    }

    return 'Mail';
}

function formatMailPreview(content) {
    if (!content) {
        return '';
    }

    return content.length > 25 ? content.slice(0, 28) + '...' : content;
}

function formatMailDateTime(createdAt) {
    if (!createdAt) {
        return { time: '', date: '' };
    }

    var date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
        return { time: '', date: '' };
    }

    var hours = date.getHours();
    var minutes = String(date.getMinutes()).padStart(2, '0');
    var ampm = hours >= 12 ? 'pm' : 'am';
    var hour12 = hours % 12;

    if (hour12 === 0) {
        hour12 = 12;
    }

    return {
        time: hour12 + ':' + minutes + ' ' + ampm,
        date: date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear()
    };
}

async function fetchMyMails(options) {
    options = options || {};
    var page = options.page != null ? options.page : 1;
    var pageSize = options.pageSize != null ? options.pageSize : 20;
    var token = options.token || (typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null);

    if (!token) {
        throw new Error('Not logged in');
    }

    var url = getMailApiBase()
        + '/api/v1/mail/my?page='
        + encodeURIComponent(page)
        + '&pageSize='
        + encodeURIComponent(pageSize);

    var response = await fetch(url, {
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

function getMailListCacheKey(token, page, pageSize) {
    return String(token || '') + '|' + page + '|' + pageSize;
}

function isMailListCacheValid(cacheKey) {
    if (!mailListResponseCache || mailListResponseCache.key !== cacheKey) {
        return false;
    }

    return Date.now() - mailListResponseCache.fetchedAt < MAIL_LIST_CACHE_TTL_MS;
}

function invalidateMailListCache() {
    mailListResponseCache = null;
}

function cloneMailListResult(result) {
    return {
        mails: result.mails.slice(),
        pagination: result.pagination
    };
}

async function getMyMailList(options) {
    options = options || {};
    var page = options.page != null ? options.page : 1;
    var pageSize = options.pageSize != null ? options.pageSize : 20;
    var token = options.token || (typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null);
    var cacheKey = getMailListCacheKey(token, page, pageSize);

    if (!options.forceRefresh && isMailListCacheValid(cacheKey)) {
        return cloneMailListResult(mailListResponseCache.data);
    }

    var data = await fetchMyMails(options);

    var result = {
        mails: Array.isArray(data.mails) ? data.mails : [],
        pagination: data.pagination || null
    };

    mailListResponseCache = {
        key: cacheKey,
        fetchedAt: Date.now(),
        data: cloneMailListResult(result)
    };

    return cloneMailListResult(result);
}

async function deleteMails(ids) {
    var token = typeof window.getAuthTokenSafe === 'function' ? window.getAuthTokenSafe() : null;

    if (!token) {
        throw new Error('Not logged in');
    }

    if (!ids || !ids.length) {
        return { success: false };
    }

    var response = await fetch(getMailApiBase() + '/api/v1/mail/delete', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ ids: ids })
    });

    if (!response.ok) {
        throw new Error('HTTP ' + response.status);
    }

    return response.json();
}

function resetMailSelection() {
    mailSelectedIds = {};
}

function getSelectedMailIds() {
    return Object.keys(mailSelectedIds).filter(function (id) {
        return mailSelectedIds[id];
    });
}

function updateSavedMailListItem(mailId, updates) {
    var id = String(mailId);
    var cachedMail = mailListCache[id];
    var responseMails;
    var i;
    var key;

    if (!updates || typeof updates !== 'object') {
        return;
    }

    if (cachedMail) {
        for (key in updates) {
            if (Object.prototype.hasOwnProperty.call(updates, key)) {
                cachedMail[key] = updates[key];
            }
        }
    }

    if (mailListResponseCache && mailListResponseCache.data && Array.isArray(mailListResponseCache.data.mails)) {
        responseMails = mailListResponseCache.data.mails;

        for (i = 0; i < responseMails.length; i++) {
            if (String(responseMails[i].id) === id) {
                for (key in updates) {
                    if (Object.prototype.hasOwnProperty.call(updates, key)) {
                        responseMails[i][key] = updates[key];
                    }
                }

                if (!cachedMail) {
                    mailListCache[id] = responseMails[i];
                }

                break;
            }
        }
    }

    syncFooterMailBadgeFromCache();
}

function markMailAsRead(id) {
    var mailId = String(id);
    var items;
    var i;

    updateSavedMailListItem(mailId, { isRead: true });

    items = document.querySelectorAll('#mail-list .mail__item');

    for (i = 0; i < items.length; i++) {
        if (items[i].getAttribute('data-mail-id') === mailId) {
            items[i].classList.add('mail__item--read');
            break;
        }
    }
}

function getMailById(id) {
    return mailListCache[String(id)] || null;
}

function parseMailBoolean(value, defaultValue) {
    if (value === true || value === 1 || value === '1' || value === 'true') {
        return true;
    }

    if (value === false || value === 0 || value === '0' || value === 'false') {
        return false;
    }

    return defaultValue;
}

function isMailUnclaimed(mail) {
    var amount = mail && mail.amount != null ? Number(mail.amount) : 0;

    if (Number.isNaN(amount) || amount <= 0) {
        return false;
    }

    return !parseMailBoolean(mail.isClaimed, false);
}

function isMailNotificationPending(mail) {
    if (!mail) {
        return false;
    }

    return !parseMailBoolean(mail.isRead, false) || isMailUnclaimed(mail);
}

function countMailNotifications(mails) {
    var count = 0;
    var i;

    if (!Array.isArray(mails)) {
        return 0;
    }

    for (i = 0; i < mails.length; i++) {
        if (isMailNotificationPending(mails[i])) {
            count++;
        }
    }

    return count;
}

function getCachedMailListItems() {
    if (mailListResponseCache && mailListResponseCache.data && Array.isArray(mailListResponseCache.data.mails)) {
        return mailListResponseCache.data.mails;
    }

    return Object.keys(mailListCache).map(function (key) {
        return mailListCache[key];
    });
}

function updateFooterMailBadge(count) {
    var badge = document.getElementById('login1-footer-mail-badge');
    var countEl = document.getElementById('login1-footer-mail-badge-count');
    var mailBtn = document.querySelector('.login1-footer__item[data-footer-nav="mail"]');
    var num = Math.max(0, Number(count) || 0);
    var isVisible = num > 0;

    if (countEl) {
        countEl.textContent = num > 99 ? '99+' : String(num);
    }

    if (badge) {
        badge.classList.toggle('is-visible', isVisible);
        badge.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    }

    if (mailBtn) {
        mailBtn.setAttribute('aria-label', isVisible ? 'Mail (' + num + ' notifications)' : 'Mail');
    }
}

function refreshFooterMailBadge(options) {
    options = options || {};

    if (typeof window.getAuthTokenSafe !== 'function' || !window.getAuthTokenSafe()) {
        updateFooterMailBadge(0);
        return Promise.resolve(0);
    }

    return getMyMailList(options).then(function (result) {
        var count = countMailNotifications(result.mails);

        updateFooterMailBadge(count);
        return count;
    }).catch(function () {
        updateFooterMailBadge(0);
        return 0;
    });
}

function syncFooterMailBadgeFromCache() {
    updateFooterMailBadge(countMailNotifications(getCachedMailListItems()));
}

function renderMailList(mails) {
    var listEl = document.getElementById('mail-list');
    var emptyEl = document.getElementById('mail-empty');

    if (!listEl || !emptyEl) {
        return;
    }

    if (!mails.length) {
        mailListCache = {};
        listEl.innerHTML = '';
        emptyEl.hidden = false;
        updateFooterMailBadge(0);
        return;
    }

    mailListCache = {};
    mails.forEach(function (mail) {
        mailListCache[String(mail.id)] = mail;
    });

    emptyEl.hidden = true;
    listEl.innerHTML = mails.map(function (mail) {
        var id = String(mail.id);
        var isSelected = !!mailSelectedIds[id];
        var title = escapeMailHtml(formatMailTitle(mail));
        var preview = escapeMailHtml(formatMailPreview(mail.content));
        var dateParts = formatMailDateTime(mail.createdAt);
        var isRead = !!mail.isRead;
        var isClaimed = parseMailBoolean(mail.isClaimed, false);
        var isNoti = isReadMail(mail.amount, isClaimed, isRead);
        return (
            '<li class="mail__item'
                + (isSelected ? ' mail__item--selected' : '')
                + (isNoti ? ' mail__item--read' : '')
                + '" data-mail-id="' + escapeMailHtml(id) + '">' +
                '<button type="button" class="mail__checkbox" aria-label="Select mail" aria-pressed="' + (isSelected ? 'true' : 'false') + '">' +
                    '<img class="mail__checkbox-icon mail__checkbox-icon--off" src="' + MAIL_ICON_BASE + 'icon_checkbox.png" alt="">' +
                    '<img class="mail__checkbox-icon mail__checkbox-icon--on" src="' + MAIL_ICON_BASE + 'icon_check.png" alt="">' +
                '</button>' +
                '<div class="mail__content">' +
                    '<p class="mail__title-text">' + title + '</p>' +
                    '<p class="mail__preview">' + preview + '</p>' +
                '</div>' +
                '<div class="mail__time">' +
                    '<span class="mail__time-value">' + escapeMailHtml(dateParts.time) + '</span>' +
                    '<span class="mail__date-value">' + escapeMailHtml(dateParts.date) + '</span>' +
                '</div>' +
            '</li>'
        );
    }).join('');

    syncFooterMailBadgeFromCache();
}

function isReadMail(amount, isClaimed, isRead){
    if(amount > 0 && !isClaimed){
        return false;
    }
    return isRead;
}

async function loadMailList(options) {
    options = options || {};

    try {
        if (options.forceRefresh) {
            invalidateMailListCache();
        }

        var result = await getMyMailList(options);
        var overlay = getMailOverlay();

        if (overlay) {
            renderMailList(result.mails);
        } else {
            updateFooterMailBadge(countMailNotifications(result.mails));
        }

        return result;
    } catch (err) {
        console.error('Could not load mail:', err);

        if (typeof window.showToast === 'function') {
            window.showToastError(err.message || 'Could not load mail');
        }

        throw err;
    }
}

function toggleMailItemSelection(item) {
    if (!item) {
        return;
    }

    var id = item.getAttribute('data-mail-id');

    if (!id) {
        return;
    }

    var isSelected = !mailSelectedIds[id];
    mailSelectedIds[id] = isSelected;

    if (!isSelected) {
        delete mailSelectedIds[id];
    }

    item.classList.toggle('mail__item--selected', isSelected);

    var checkbox = item.querySelector('.mail__checkbox');

    if (checkbox) {
        checkbox.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    }
}

function toggleSelectAllMails() {
    var items = document.querySelectorAll('#mail-list .mail__item');
    var shouldSelectAll = getSelectedMailIds().length !== items.length;
    var i;

    mailSelectedIds = {};

    for (i = 0; i < items.length; i++) {
        var id = items[i].getAttribute('data-mail-id');

        if (!id) {
            continue;
        }

        if (shouldSelectAll) {
            mailSelectedIds[id] = true;
        }

        items[i].classList.toggle('mail__item--selected', shouldSelectAll);

        var checkbox = items[i].querySelector('.mail__checkbox');

        if (checkbox) {
            checkbox.setAttribute('aria-pressed', shouldSelectAll ? 'true' : 'false');
        }
    }
}

async function deleteSelectedMails() {
    var ids = getSelectedMailIds();

    if (!ids.length) {
        if (typeof window.showToast === 'function') {
            window.showToastError('Select mail to delete');
        }
        return;
    }

    try {
        await deleteMails(ids);
        resetMailSelection();
        invalidateMailListCache();
        await loadMailList({ forceRefresh: true });

        if (typeof window.showToast === 'function') {
            window.showToast('Mail deleted');
        }
    } catch (err) {
        console.error('Failed to delete mail:', err);

        if (typeof window.showToast === 'function') {
            window.showToastError('Failed to delete mail');
        }
    }
}

function openPopupMail() {
    var overlay = getMailOverlay();

    if (!overlay) {
        return;
    }

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    resetMailSelection();
    loadMailList({ forceRefresh: true });
}

function closePopupMail() {
    var overlay = getMailOverlay();

    if (!overlay) {
        return;
    }

    overlay.classList.remove('is-open');
    if (typeof window.releaseFocusWithin === 'function') {
        window.releaseFocusWithin(overlay);
    }
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    resetMailSelection();
}

function bindPopupMailEvents(root) {
    var scope = root || document;
    var overlay = scope.querySelector ? scope.querySelector('#mail-overlay') : getMailOverlay();

    if (!overlay) {
        return;
    }

    if (mailEventsBound && !root) {
        return;
    }

    mailEventsBound = true;

    var closeBtn = overlay.querySelector('#mail-close');
    var selectAllBtn = overlay.querySelector('#mail-select-all');
    var deleteBtn = overlay.querySelector('#mail-delete');
    var listEl = overlay.querySelector('#mail-list');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePopupMail);
    }

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closePopupMail();
        }
    });

    if (!window.__mailEscapeBound) {
        window.__mailEscapeBound = true;
        document.addEventListener('keydown', function (e) {
            var el = getMailOverlay();

            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                closePopupMail();
            }
        });
    }

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', toggleSelectAllMails);
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteSelectedMails);
    }

    if (listEl) {
        listEl.addEventListener('click', function (e) {
            var checkbox = e.target.closest('.mail__checkbox');
            var item = e.target.closest('.mail__item');

            if (checkbox && item && listEl.contains(item)) {
                toggleMailItemSelection(item);
                return;
            }

            var content = e.target.closest('.mail__content');

            if (!content || !item || !listEl.contains(item)) {
                return;
            }

            var id = item.getAttribute('data-mail-id');
            var mail = getMailById(id);

            if (mail && window.PopupMailDetail) {
                window.PopupMailDetail.open(Object.assign({}, mail));
            }
        });
    }
}

function mountPopupMail(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindPopupMailEvents(container);
        return Promise.resolve(true);
    }

    return fetch('/view/function/mail.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindPopupMailEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Could not load mail popup:', err);
            return false;
        });
}

function initPopupMail(options) {
    options = options || {};
    var container = options.container || document.getElementById('mail-mount');
    var detailContainer = options.detailContainer || document.getElementById('maildetail-mount');

    function initDetail() {
        if (!window.PopupMailDetail || !detailContainer) {
            return Promise.resolve(true);
        }

        return window.PopupMailDetail.init({ container: detailContainer });
    }

    if (getMailOverlay()) {
        bindPopupMailEvents();

        return initDetail().then(function () {
            if (options.openOnLoad) {
                openPopupMail();
            }

            return true;
        });
    }

    return mountPopupMail(container).then(function (ok) {
        if (!ok) {
            return false;
        }

        return initDetail().then(function () {
            if (options.openOnLoad) {
                openPopupMail();
            }

            return true;
        });
    });
}

window.PopupMail = {
    init: initPopupMail,
    open: openPopupMail,
    close: closePopupMail,
    mount: mountPopupMail,
    fetchMyMails: fetchMyMails,
    getMyMailList: getMyMailList,
    deleteMails: deleteMails,
    reloadList: loadMailList,
    loadMailList: loadMailList,
    invalidateListCache: invalidateMailListCache,
    getMailById: getMailById,
    markMailAsRead: markMailAsRead,
    updateSavedMailListItem: updateSavedMailListItem,
    countMailNotifications: countMailNotifications,
    updateFooterBadge: updateFooterMailBadge,
    refreshFooterBadge: refreshFooterMailBadge
};

window.Mail = window.PopupMail;
