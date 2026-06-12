function getHeader() {
    return document.querySelector('.login1-header');
}

function bindHeaderEvents(root) {
    var scope = root || document;
    var header = scope.querySelector ? scope.querySelector('.login1-header') : getHeader();

    if (!header || header.dataset.headerBound === '1') {
        return;
    }

    header.dataset.headerBound = '1';

    var menuBtn = header.querySelector('.login1-header__menu');

    if (menuBtn) {
        menuBtn.addEventListener('click', function () {
            if (typeof window.showToast === 'function') {
                window.showToast('Coming soon');
            }
        });
    }
}

function mountHeader(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindHeaderEvents(container);
        return Promise.resolve(true);
    }

    return fetch('/view/header.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindHeaderEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Could not load header:', err);
            return false;
        });
}

function initHeader(options) {
    options = options || {};
    var container = options.container || document.getElementById('header-mount');

    if (getHeader()) {
        bindHeaderEvents();
        return Promise.resolve(true);
    }

    return mountHeader(container);
}

window.Header = {
    init: initHeader,
    mount: mountHeader
};
