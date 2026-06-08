var POPUP_API_BASE = window.RubyClubConfig != null ? window.RubyClubConfig.API_BASE : 'https://rubyclubph.com';
var POPUP_AUTH_TOKEN_KEY = 'rubyclub_auth_token';
var POPUP_AUTH_TOKEN_EXPIRES_KEY = 'rubyclub_auth_token_expires_at';
var POPUP_AUTH_TOKEN_TTL_MS = 23 * 60 * 60 * 1000;
var POPUP_QUICK_PLAY_ID_KEY = 'rubyclub_quick_play_id';

function getPopupOverlay() {
    return document.getElementById('popuplogin-overlay');
}

async function getBrowserFingerprint() {
    if (typeof FingerprintJS === 'undefined') {
        throw new Error('FingerprintJS chưa được tải');
    }

    var fp = await FingerprintJS.load();
    var result = await fp.get();
    // console.log('Browser fingerprint:', result.visitorId);
    return result.visitorId;
}

async function getQuickPlayDeviceId() {
    var saved = localStorage.getItem(POPUP_QUICK_PLAY_ID_KEY);
    if (saved) {
        return saved;
    }

    return getBrowserFingerprint();
}

function openPopupLogin() {
    var overlay = getPopupOverlay();
    if (!overlay) {
        return;
    }
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closePopupLogin() {
    var overlay = getPopupOverlay();
    if (!overlay) {
        return;
    }
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function switchPopupTab(tabName) {
    var isLogin = tabName === 'login';
    var tabLogin = document.getElementById('popuplogin-tab-login');
    var tabSignin = document.getElementById('popuplogin-tab-signin');
    var formLogin = document.getElementById('popuplogin-form-login');
    var formSignin = document.getElementById('popuplogin-form-signin');

    if (!tabLogin || !tabSignin || !formLogin || !formSignin) {
        return;
    }

    tabLogin.classList.toggle('popuplogin__tab--active', isLogin);
    tabSignin.classList.toggle('popuplogin__tab--active', !isLogin);
    tabLogin.setAttribute('aria-selected', isLogin ? 'true' : 'false');
    tabSignin.setAttribute('aria-selected', isLogin ? 'false' : 'true');

    formLogin.classList.toggle('popuplogin__form--hidden', !isLogin);
    formSignin.classList.toggle('popuplogin__form--hidden', isLogin);
    formLogin.setAttribute('aria-hidden', isLogin ? 'false' : 'true');
    formSignin.setAttribute('aria-hidden', isLogin ? 'true' : 'false');
}

async function fetchPopupJson(url, options) {
    var response = await fetch(url, options);
    var text = await response.text();
    var data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = null;
        }
    }

    if (!response.ok) {
        var msg = (data && (data.message || data.error || data.detail)) || ('HTTP ' + response.status);
        throw new Error(typeof msg === 'string' ? msg : 'HTTP ' + response.status);
    }

    return data;
}

function savePopupAuthToken(token) {
    if (window.Login1 && window.Login1.saveAuthToken) {
        window.Login1.saveAuthToken(token);
        return;
    }

    var expiresAt = Date.now() + POPUP_AUTH_TOKEN_TTL_MS;
    localStorage.setItem(POPUP_AUTH_TOKEN_KEY, token);
    localStorage.setItem(POPUP_AUTH_TOKEN_EXPIRES_KEY, String(expiresAt));
}

async function fetchPopupUserMe(token) {
    return fetchPopupJson(POPUP_API_BASE + '/api/v1/user/me', {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + token
        }
    });
}

async function applyPopupAuthSession(token) {
    savePopupAuthToken(token);
    var data = await fetchPopupUserMe(token);
    console.log('data quick play ', data);
    if (window.Login1) {
        window.Login1.bindUserToLogin1(window.Login1.normalizeUser(data));
        window.Login1.setLoggedInState(true);
    }

    return data;
}

async function handlePopupLogin(form) {
    if (!form) {
        return;
    }

    var submitBtn = form.querySelector('.popuplogin__submit');
    var accountInput = form.querySelector('[name="account"]');
    var passwordInput = form.querySelector('[name="password"]');
    var userName = (accountInput && accountInput.value ? accountInput.value : '').trim();
    var password = passwordInput ? passwordInput.value : '';

    if (!userName) {
        alert('Vui lòng nhập tài khoản.');
        return;
    }

    if (!password) {
        alert('Vui lòng nhập mật khẩu.');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
    }

    try {
        var data = await fetchPopupJson(POPUP_API_BASE + '/api/v1/auth/login', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userName: userName,
                password: password
            })
        });

        if (!data || !data.token) {
            throw new Error('Không nhận được token');
        }

        await applyPopupAuthSession(data.token);
        form.reset();
        closePopupLogin();
    } catch (err) {
        console.error('Login failed:', err);
        alert(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
}

async function handlePopupRegister(form) {
    if (!form) {
        return;
    }

    var submitBtn = form.querySelector('.popuplogin__submit');
    var accountInput = form.querySelector('[name="account"]');
    var passwordInput = form.querySelector('[name="password"]');
    var confirmInput = form.querySelector('[name="confirm_password"]');
    var userName = (accountInput && accountInput.value ? accountInput.value : '').trim();
    var password = passwordInput ? passwordInput.value : '';
    var confirmPassword = confirmInput ? confirmInput.value : '';

    if (!userName) {
        alert('Vui lòng nhập tài khoản.');
        return;
    }

    if (!password) {
        alert('Vui lòng nhập mật khẩu.');
        return;
    }

    if (password !== confirmPassword) {
        alert('Mật khẩu xác nhận không khớp.');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
    }

    try {
        var data = await fetchPopupJson(POPUP_API_BASE + '/api/v1/auth/register', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userName: userName,
                password: password
            })
        });

        if (!data || !data.token) {
            throw new Error('Không nhận được token');
        }

        await applyPopupAuthSession(data.token);
        form.reset();
        closePopupLogin();
    } catch (err) {
        console.error('Register failed:', err);
        alert(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
}

async function handlePopupFreePlay(btn) {
    if (!btn || btn.disabled) {
        return;
    }

    btn.disabled = true;

    try {
        var deviceId = await getQuickPlayDeviceId();

        if (!deviceId) {
            throw new Error('Không lấy được device id');
        }
        var data = await fetchPopupJson(POPUP_API_BASE + '/api/v1/auth/quick-play', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: deviceId })
        });

        if (data && data.id) {
            localStorage.setItem(POPUP_QUICK_PLAY_ID_KEY, data.id);
        }
        // console.log('Data:', data);
        if (!data || !data.token) {
            throw new Error('Không nhận được token');
        }

        await applyPopupAuthSession(data.token);
        closePopupLogin();
    } catch (err) {
        console.error('Quick play failed:', err);
        alert(err.message || 'FREE PLAY thất bại. Vui lòng thử lại.');
    } finally {
        btn.disabled = false;
    }
}

async function handlePopupGoogleLogin(btn) {
    if (!btn || btn.disabled) {
        return;
    }

    btn.disabled = true;

    try {
        var data = await fetchPopupJson(POPUP_API_BASE + '/api/v1/auth/google/login', {
            method: 'GET',
            headers: { Accept: 'application/json' }
        });

        if (data && data.redirectUrl) {
            window.location.href = data.redirectUrl;
            return;
        }

        throw new Error('Không nhận được redirectUrl');
    } catch (err) {
        console.error('Google login failed:', err);
        alert('Đăng nhập Google thất bại. Vui lòng thử lại.');
        btn.disabled = false;
    }
}

var popupLoginEventsBound = false;

function bindPopupLoginEvents(root) {
    var scope = root || document;

    var overlay = scope.querySelector ? scope.querySelector('#popuplogin-overlay') : getPopupOverlay();
    if (!overlay) {
        return;
    }

    if (popupLoginEventsBound && !root) {
        return;
    }
    popupLoginEventsBound = true;

    var closeBtn = overlay.querySelector('#popuplogin-close');
    var tabLogin = overlay.querySelector('#popuplogin-tab-login');
    var tabSignin = overlay.querySelector('#popuplogin-tab-signin');
    var formLogin = overlay.querySelector('#popuplogin-form-login');
    var formSignin = overlay.querySelector('#popuplogin-form-signin');
    var togglePass = overlay.querySelector('#popuplogin-toggle-pass');
    var passwordInput = overlay.querySelector('#popuplogin-password');
    var googleBtn = overlay.querySelector('#popuplogin-google');
    var forgotBtn = overlay.querySelector('#popuplogin-forgot');
    var freePlayBtn = overlay.querySelector('#popuplogin-free-play');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePopupLogin);
    }

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            closePopupLogin();
        }
    });

    if (!window.__popuploginEscapeBound) {
        window.__popuploginEscapeBound = true;
        document.addEventListener('keydown', function (e) {
            var el = getPopupOverlay();
            if (e.key === 'Escape' && el && el.classList.contains('is-open')) {
                closePopupLogin();
            }
        });
    }

    if (tabLogin) {
        tabLogin.addEventListener('click', function () {
            switchPopupTab('login');
        });
    }

    if (tabSignin) {
        tabSignin.addEventListener('click', function () {
            switchPopupTab('signin');
        });
    }

    if (togglePass && passwordInput) {
        togglePass.addEventListener('click', function () {
            var isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            togglePass.setAttribute('aria-label', isHidden ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
        });
    }

    if (formLogin) {
        formLogin.addEventListener('submit', function (e) {
            e.preventDefault();
            handlePopupLogin(formLogin);
        });
    }

    if (formSignin) {
        formSignin.addEventListener('submit', function (e) {
            e.preventDefault();
            handlePopupRegister(formSignin);
        });
    }

    if (googleBtn) {
        googleBtn.addEventListener('click', function () {
            handlePopupGoogleLogin(googleBtn);
        });
    }

    if (forgotBtn) {
        forgotBtn.addEventListener('click', function () {
            console.log('Forgot password - chưa tích hợp');
        });
    }

    if (freePlayBtn) {
        freePlayBtn.addEventListener('click', function () {
            handlePopupFreePlay(freePlayBtn);
        });
    }

    var supportBtn = overlay.querySelector('#popuplogin-support');
    if (supportBtn) {
        supportBtn.addEventListener('click', function () {
            if (window.PopupSupport) {
                closePopupLogin();
                window.PopupSupport.open();
            }
        });
    }
}

function mountPopupLogin(container, html) {
    if (!container) {
        return Promise.resolve(false);
    }

    if (html) {
        container.innerHTML = html;
        bindPopupLoginEvents(container);
        return Promise.resolve(true);
    }

    return fetch('view/popuplogin.html')
        .then(function (res) {
            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }
            return res.text();
        })
        .then(function (markup) {
            container.innerHTML = markup;
            bindPopupLoginEvents(container);
            return true;
        })
        .catch(function (err) {
            console.error('Không tải được popup login:', err);
            return false;
        });
}

function initPopupLogin(options) {
    options = options || {};
    var container = options.container || document.body;

    if (getPopupOverlay()) {
        bindPopupLoginEvents();
        if (options.openOnLoad) {
            openPopupLogin();
        }
        return Promise.resolve(true);
    }

    return mountPopupLogin(container).then(function (ok) {
        if (ok && options.openOnLoad) {
            openPopupLogin();
        }
        return ok;
    });
}

window.PopupLogin = {
    init: initPopupLogin,
    open: openPopupLogin,
    close: closePopupLogin,
    mount: mountPopupLogin,
    switchTab: switchPopupTab
};
