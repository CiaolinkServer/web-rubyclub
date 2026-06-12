var googleSignInInitialized = false;
var googleSignInHandlers = {
    login: null,
    link: null
};

function getGoogleClientId() {
    return window.RubyClubConfig && window.RubyClubConfig.GOOGLE_CLIENT_ID
        ? String(window.RubyClubConfig.GOOGLE_CLIENT_ID).trim()
        : '';
}

function getGoogleSignInOrigin() {
    return window.location.origin;
}

function waitForGoogleAccounts(timeoutMs) {
    var timeout = timeoutMs || 10000;

    return new Promise(function (resolve, reject) {
        if (window.google && google.accounts && google.accounts.id) {
            resolve(google.accounts);
            return;
        }

        var startedAt = Date.now();
        var timer = setInterval(function () {
            if (window.google && google.accounts && google.accounts.id) {
                clearInterval(timer);
                resolve(google.accounts);
                return;
            }

            if (Date.now() - startedAt >= timeout) {
                clearInterval(timer);
                reject(new Error('Google Sign-In chưa sẵn sàng'));
            }
        }, 100);
    });
}

function resolveGoogleSignInContext() {
    var upgradeOverlay = document.getElementById('popupupgrade-overlay');
    var loginOverlay = document.getElementById('popuplogin-overlay');

    if (upgradeOverlay && upgradeOverlay.classList.contains('is-open')) {
        return 'link';
    }

    if (loginOverlay && loginOverlay.classList.contains('is-open')) {
        return 'login';
    }

    return 'login';
}

function handleGoogleSignInCredential(response) {
    var credential = response && response.credential;

    if (!credential) {
        console.error('[GoogleSignIn] Missing credential');
        return;
    }

    var context = resolveGoogleSignInContext();
    var handler = googleSignInHandlers[context];

    if (typeof handler === 'function') {
        handler(credential);
        return;
    }

    console.warn('[GoogleSignIn] No handler for context:', context);
}

function initGoogleSignIn() {
    var clientId = getGoogleClientId();

    if (!clientId) {
        return Promise.reject(new Error('Chưa cấu hình GOOGLE_CLIENT_ID'));
    }

    if (googleSignInInitialized) {
        return Promise.resolve(true);
    }

    return waitForGoogleAccounts().then(function () {
        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSignInCredential,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            ux_mode: 'popup',
            itp_support: true
        });

        googleSignInInitialized = true;
        console.info('[GoogleSignIn] Ready. Origin:', getGoogleSignInOrigin(), 'Client:', clientId);
        return true;
    });
}

function mountGoogleSignInButton(container, options) {
    options = options || {};

    if (!container) {
        return Promise.resolve(false);
    }

    return initGoogleSignIn().then(function () {
        container.innerHTML = '';

        google.accounts.id.renderButton(container, {
            type: 'standard',
            theme: options.theme || 'outline',
            size: 'large',
            text: options.text || 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: options.width || Math.max(container.clientWidth || 0, 260)
        });

        return true;
    }).catch(function (err) {
        console.error('[GoogleSignIn] mountButton failed:', err);
        return false;
    });
}

function mountCustomGoogleSignInButton(container, options) {
    options = options || {};

    if (!container) {
        return Promise.resolve(false);
    }

    var label = options.label || 'Link google account';
    var buttonClass = options.buttonClass || 'google-signin-custom';
    var iconClass = options.iconClass || 'google-signin-custom__icon';
    var iconSrc = options.iconSrc || '/assets/image/popuplogin/icon_logo_google.png';
    var buttonId = options.buttonId || 'google-signin-custom-btn';
    var hiddenId = options.hiddenId || 'google-signin-hidden';
    var hiddenClass = options.hiddenClass || 'google-signin-hidden';

    var customBtn = container.querySelector('#' + buttonId);
    var hiddenMount = container.querySelector('#' + hiddenId);

    if (!customBtn || !hiddenMount) {
        container.innerHTML =
            '<button type="button" class="' + buttonClass + '" id="' + buttonId + '">' +
            '<img class="' + iconClass + '" src="' + iconSrc + '" alt="">' +
            '<span>' + label + '</span>' +
            '</button>' +
            '<div class="' + hiddenClass + '" id="' + hiddenId + '" aria-hidden="true"></div>';

        customBtn = container.querySelector('#' + buttonId);
        hiddenMount = container.querySelector('#' + hiddenId);
    } else {
        var labelEl = customBtn.querySelector('span');
        if (labelEl) {
            labelEl.textContent = label;
        }
    }

    return initGoogleSignIn().then(function () {
        hiddenMount.innerHTML = '';

        google.accounts.id.renderButton(hiddenMount, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: 200
        });

        if (!customBtn.dataset.googleBound) {
            customBtn.dataset.googleBound = '1';
            customBtn.addEventListener('click', function () {
                var googleBtn = hiddenMount.querySelector('div[role="button"]');

                if (googleBtn) {
                    googleBtn.click();
                }
            });
        }

        return true;
    }).catch(function (err) {
        console.error('[GoogleSignIn] mountCustomButton failed:', err);
        return false;
    });
}

function registerGoogleSignInHandler(context, handler) {
    if (context === 'login' || context === 'link') {
        googleSignInHandlers[context] = handler;
    }
}

window.GoogleSignIn = {
    init: initGoogleSignIn,
    mountButton: mountGoogleSignInButton,
    mountCustomButton: mountCustomGoogleSignInButton,
    registerHandler: registerGoogleSignInHandler,
    getClientId: getGoogleClientId,
    getOrigin: getGoogleSignInOrigin
};

window.addEventListener('load', function () {
    initGoogleSignIn().catch(function (err) {
        console.warn('[GoogleSignIn] init skipped:', err.message || err);
        console.warn('[GoogleSignIn] Thêm origin vào Google Console:', getGoogleSignInOrigin());
    });
});
