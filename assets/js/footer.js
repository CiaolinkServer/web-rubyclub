function getFooterNav() {
    return document.querySelector('.login1-footer__nav');
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

function bindFooterNavEvents(root) {
    var scope = root || document;
    var nav = scope.querySelector ? scope.querySelector('.login1-footer__nav') : getFooterNav();

    if (!nav || nav.dataset.footerNavBound === '1') {
        return;
    }

    nav.dataset.footerNavBound = '1';

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
    setActiveItem: setActiveFooterItem
};
