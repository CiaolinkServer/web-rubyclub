var POPUP_API_BASE = 'https://rubyclubph.com';

function getPopupOverlay() {
    return document.getElementById('popuplogin-overlay');
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
    if (!response.ok) {
        throw new Error('HTTP ' + response.status);
    }
    return response.json();
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
            console.log('Popup login - chưa tích hợp API');
        });
    }

    if (formSignin) {
        formSignin.addEventListener('submit', function (e) {
            e.preventDefault();
            console.log('Popup signin - chưa tích hợp API');
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
            sessionStorage.removeItem('rubyclub_user_data');
            sessionStorage.setItem('rubyclub_guest', '1');
            window.location.href = 'index.html';
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
