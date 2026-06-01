var AUTH_TOKEN_KEY = 'rubyclub_auth_token';
var USER_DATA_KEY = 'rubyclub_user_data';
var API_BASE = 'https://rubyclubph.com';

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function saveUserData(data) {
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
}

async function fetchJson(url, options) {
    var response = await fetch(url, options);

    if (!response.ok) {
        throw new Error('HTTP ' + response.status);
    }

    return response.json();
}

async function fetchUserMe(token) {
    return fetchJson(API_BASE + '/api/v1/user/me', {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + token
        }
    });
}

async function fetchGoogleLogin() {
    return fetchJson(API_BASE + '/api/v1/auth/google/login', {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        }
    });
}

async function captureTokenFromUrl() {
    var url = new URL(window.location.href);
    var token = url.searchParams.get('token');

    if (!token) {
        return false;
    }

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    // console.log('Token saved:', token);
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);

    try {
        var data = await fetchUserMe(token);
        sessionStorage.removeItem('rubyclub_guest');
        saveUserData(data);
        window.location.href = 'view/lobby.html';
        return true;
    } catch (err) {
        console.error('Lấy thông tin user thất bại:', err);
        alert('Không lấy được thông tin tài khoản. Vui lòng đăng nhập lại.');
        localStorage.removeItem(AUTH_TOKEN_KEY);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    var redirecting = await captureTokenFromUrl();

    if (redirecting) {
        return;
    }

    initLoginPage();
});

function initLoginPage() {
    var buttons = document.querySelectorAll('.login-btn');

    async function handleGoogleLogin(btn) {
        if (btn.disabled) {
            return;
        }

        btn.disabled = true;

        try {
            var data = await fetchGoogleLogin();

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

    buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var action = btn.getAttribute('data-action');

            switch (action) {
                case 'guest':
                    sessionStorage.removeItem(USER_DATA_KEY);
                    sessionStorage.setItem('rubyclub_guest', '1');
                    window.location.href = 'view/lobby.html';
                    break;
                case 'google':
                    handleGoogleLogin(btn);
                    break;
                case 'id':
                    console.log('Login ID - chưa tích hợp');
                    break;
            }
        });
    });
}
