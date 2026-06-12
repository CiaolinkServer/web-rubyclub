var UPGRADE_API_BASE = window.RubyClubConfig != null ? window.RubyClubConfig.API_BASE : 'https://rubyclubph.com';

function getPopupUpgradeOverlay() {
    return document.getElementById('popupupgrade-overlay');
}

function openPopupUpgrade() {
    var overlay = getPopupUpgradeOverlay();

    if (!overlay) {
        return;
    }

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closePopupUpgrade() {
    var overlay = getPopupUpgradeOverlay();

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

function setPopupUpgradeDimmed(dimmed) {
    var overlay = getPopupUpgradeOverlay();

    if (!overlay) {
        return;
    }

    overlay.classList.toggle('is-dimmed', !!dimmed);
}

function openSupportFromUpgrade() {
    var mount = document.getElementById('support-mount');
    var openSupport = function () {
        setPopupUpgradeDimmed(true);

        if (window.PopupSupport && typeof window.PopupSupport.open === 'function') {
            window.PopupSupport.open({ fromUpgrade: true });
        }
    };

    if (!window.PopupSupport) {
        if (typeof window.showToast === 'function') {
            window.showToast('Coming soon');
        }
        return;
    }

    if (typeof window.PopupSupport.init === 'function' && mount && !document.getElementById('support-overlay')) {
        window.PopupSupport.init({ container: mount }).then(function (ok) {
            if (ok) {
                openSupport();
            } else if (typeof window.showToastError === 'function') {
                window.showToastError('Could not load support popup');
            }
        });
        return;
    }

    openSupport();
}

async function fetchUpgradeJson(url, options) {
    var response = await fetch(url, options);
    var text = await response.text();
    var data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch (err) {
            data = null;
        }
    }

    if (!response.ok) {
        var msg = (data && (data.message || data.error || data.detail)) || ('HTTP ' + response.status);
        throw new Error(typeof msg === 'string' ? msg : 'HTTP ' + response.status);
    }

    return data;
}

function getUpgradeAuthToken() {
    if (typeof window.getAuthTokenSafe === 'function') {
        return window.getAuthTokenSafe();
    }

    return localStorage.getItem('rubyclub_auth_token');
}

function bindUpgradePasswordToggle(toggleBtn, input) {
    if (!toggleBtn || !input) {
        return;
    }

    toggleBtn.addEventListener('click', function () {
        var isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
}

async function refreshAccountAfterUpgrade() {
    if (window.Login1 && typeof window.Login1.refreshUserProfile === 'function') {
        await window.Login1.refreshUserProfile();
    }

    if (window.PageAccount && typeof window.PageAccount.bindUser === 'function') {
        var token = getUpgradeAuthToken();

        if (!token) {
            return;
        }

        try {
            var data = await fetchUpgradeJson(UPGRADE_API_BASE + '/api/v1/user/me', {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + token
                }
            });
            var user = window.Login1 && window.Login1.normalizeUser
                ? window.Login1.normalizeUser(data)
                : (data.user || data);

            window.PageAccount.bindUser(user);
        } catch (err) {
            console.error('Could not refresh profile after upgrade:', err);
        }
    }
}

async function handlePopupUpgradeSubmit(form) {
    if (!form) {
        return;
    }

    var token = getUpgradeAuthToken();

    if (!token) {
        if (typeof window.showToastError === 'function') {
            window.showToastError('Please log in');
        }
        return;
    }

    var submitBtn = form.querySelector('#popupupgrade-submit');
    var userNameInput = form.querySelector('#popupupgrade-username');
    var passwordInput = form.querySelector('#popupupgrade-password');
    var confirmInput = form.querySelector('#popupupgrade-confirm-password');
    var userName = (userNameInput && userNameInput.value ? userNameInput.value : '').trim();
    var password = passwordInput ? passwordInput.value : '';
    var confirmPassword = confirmInput ? confirmInput.value : '';

    if (!userName) {
        if (typeof window.showToastError === 'function') {
            window.showToastError('Please enter username');
        }
        return;
    }

    if (!password) {
        if (typeof window.showToastError === 'function') {
            window.showToastError('Please enter password');
        }
        return;
    }

    if (password !== confirmPassword) {
        if (typeof window.showToastError === 'function') {
            window.showToastError('Password confirmation does not match');
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
    }

    try {
        await fetchUpgradeJson(UPGRADE_API_BASE + '/api/v1/auth/register-quick-play', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({
                userName: userName,
                password: password
            })
        });

        form.reset();

        if (typeof window.showToast === 'function') {
            window.showToast('Account upgraded successfully');
        }

        await refreshAccountAfterUpgrade();
        closePopupUpgrade();
    } catch (err) {
        console.error('Upgrade account failed:', err);

        if (typeof window.showToastError === 'function') {
            window.showToastError(err.message || 'Account upgrade failed');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
}

async function completePopupUpgradeGoogleLink(googleCredential) {
    var authToken = getUpgradeAuthToken();

    if (!authToken) {
        throw new Error('Please log in');
    }

    await fetchUpgradeJson(UPGRADE_API_BASE + '/api/v1/auth/link-google', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + authToken
        },
        body: JSON.stringify({
            token: googleCredential
        })
    });

    if (typeof window.showToast === 'function') {
        window.showToast('Google account linked successfully');
    }

    await refreshAccountAfterUpgrade();
    closePopupUpgrade();
}

async function handlePopupUpgradeGoogleCredential(googleCredential) {
    try {
        await completePopupUpgradeGoogleLink(googleCredential);
    } catch (err) {
        console.error('Link Google failed:', err);

        if (typeof window.showToastError === 'function') {
            window.showToastError(err.message || 'Google link failed');
        }
    }
}

function setupPopupUpgradeGoogleSignIn(overlay) {
    var mount = overlay ? overlay.querySelector('#popupupgrade-google-mount') : document.getElementById('popupupgrade-google-mount');

    if (!mount || !window.GoogleSignIn) {
        return;
    }

    window.GoogleSignIn.registerHandler('link', handlePopupUpgradeGoogleCredential);
    window.GoogleSignIn.mountCustomButton(mount, {
        label: 'Link google account',
        buttonClass: 'popupupgrade__google',
        iconClass: 'popupupgrade__google-icon',
        buttonId: 'popupupgrade-google-btn',
        hiddenId: 'popupupgrade-google-hidden',
        hiddenClass: 'popupupgrade__google-hidden'
    });
}

var popupUpgradeEventsBound = false;

function bindPopupUpgradeEvents(root) {
    var scope = root || document;
    var overlay = scope.querySelector ? scope.querySelector('#popupupgrade-overlay') : getPopupUpgradeOverlay();

    if (!overlay) {
        return;
    }

    if (popupUpgradeEventsBound && !root) {
        return;
    }

    popupUpgradeEventsBound = true;

    var closeBtn = overlay.querySelector('#popupupgrade-close');
    var form = overlay.querySelector('#popupupgrade-form');
    var supportBtn = overlay.querySelector('#popupupgrade-support');
    var passwordInput = overlay.querySelector('#popupupgrade-password');
    var confirmInput = overlay.querySelector('#popupupgrade-confirm-password');

    setupPopupUpgradeGoogleSignIn(overlay);

    if (closeBtn) {
        closeBtn.addEventListener('click', closePopupUpgrade);
    }

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closePopupUpgrade();
        }
    });

    if (!window.__popupupgradeEscapeBound) {
        window.__popupupgradeEscapeBound = true;
        document.addEventListener('keydown', function (e) {
            var el = getPopupUpgradeOverlay();

            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                closePopupUpgrade();
            }
        });
    }

    bindUpgradePasswordToggle(overlay.querySelector('#popupupgrade-toggle-password'), passwordInput);
    bindUpgradePasswordToggle(overlay.querySelector('#popupupgrade-toggle-confirm'), confirmInput);

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            handlePopupUpgradeSubmit(form);
        });
    }

    if (supportBtn) {
        supportBtn.addEventListener('click', function () {
            openSupportFromUpgrade();
        });
    }
}

function mountPopupUpgrade(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindPopupUpgradeEvents(container);
        return Promise.resolve(true);
    }

    return fetch('/view/popupupgrade.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindPopupUpgradeEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Could not load upgrade popup:', err);
            return false;
        });
}

function initPopupUpgrade(options) {
    options = options || {};
    var container = options.container || document.getElementById('popupupgrade-mount');

    if (getPopupUpgradeOverlay()) {
        bindPopupUpgradeEvents();

        if (options.openOnLoad) {
            openPopupUpgrade();
        }

        return Promise.resolve(true);
    }

    return mountPopupUpgrade(container).then(function (ok) {
        if (ok && options.openOnLoad) {
            openPopupUpgrade();
        }

        return ok;
    });
}

window.PopupUpgrade = {
    init: initPopupUpgrade,
    open: openPopupUpgrade,
    close: closePopupUpgrade,
    mount: mountPopupUpgrade,
    setDimmed: setPopupUpgradeDimmed,
    openSupport: openSupportFromUpgrade
};
