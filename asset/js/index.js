var AUTH_TOKEN_KEY = 'rubyclub_auth_token';
var USER_DATA_KEY = 'rubyclub_user_data';
var API_BASE = 'https://rubyclubph.com';


async function launchGame(btn) {
    var token = getAuthToken();

    if (!token) {
        alert('Vui lòng đăng nhập để chơi game.');
        window.location.href = '../index.html';
        return;
    }

    if (btn) {
        btn.disabled = true;
    }

    try {
        var response = await fetch(API_BASE + '/api/v1/auth/launch', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        var data = await response.text();

        var newPage = window.open('', '_blank');
        if (!newPage) {
            alert('Trình duyệt đã chặn cửa sổ mới. Vui lòng cho phép popup.');
            return;
        }

        newPage.document.open();
        newPage.document.write(data);
        newPage.document.close();
    } catch (err) {
        console.error('Launch game failed:', err);
        alert('Không thể khởi chạy game. Vui lòng thử lại.');
    } finally {
        if (btn) {
            btn.disabled = false;
        }
    }
}

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function loadUserFromStorage() {
    var raw = sessionStorage.getItem(USER_DATA_KEY);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function saveUserData(data) {
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
}

function normalizeUser(data) {
    if (!data) {
        return null;
    }
    return data.user || data;
}

function formatBalance(value) {
    var num = Number(value);
    if (Number.isNaN(num)) {
        return '0';
    }
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function bindUserToLogin1(user) {
    var balanceEl = document.getElementById('login1-balance');
    var nameEl = document.getElementById('login1-username');

    if (!balanceEl || !nameEl || !user) {
        return;
    }

    nameEl.textContent = user.name || user.username || user.email || 'Player';
    balanceEl.textContent = formatBalance(user.balance != null ? user.balance : 0);
    balanceEl.style.color = '#14E8FF';
}

function setLoggedInState(isLoggedIn) {
    var actions = document.getElementById('login1-actions');
    var auth = document.getElementById('login1-actions-auth');
    var userPanel = document.getElementById('login1-actions-user');

    if (actions) {
        actions.classList.toggle('login1-actions--logged-in', isLoggedIn);
        actions.setAttribute('aria-label', isLoggedIn ? 'Tài khoản' : 'Đăng nhập');
    }

    if (auth) {
        auth.hidden = isLoggedIn;
    }

    if (userPanel) {
        userPanel.hidden = !isLoggedIn;
    }
}

async function fetchUserMe(token) {
    var response = await fetch(API_BASE + '/api/v1/user/me', {
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

async function refreshUserProfile() {
    var token = getAuthToken();
    var refreshBtn = document.getElementById('login1-refresh-balance');

    if (!token) {
        return;
    }

    if (refreshBtn) {
        refreshBtn.disabled = true;
    }

    try {
        var data = await fetchUserMe(token);
        sessionStorage.removeItem('rubyclub_guest');
        saveUserData(data);
        bindUserToLogin1(normalizeUser(data));
        setLoggedInState(true);
    } catch (err) {
        console.error('Làm mới thông tin user thất bại:', err);
        alert('Không lấy được thông tin tài khoản. Vui lòng thử lại.');

        //delete token
        localStorage.removeItem(AUTH_TOKEN_KEY);
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
        }
    }
}

async function captureTokenFromUrl() {
    var url = new URL(window.location.href);
    var token = url.searchParams.get('token');

    if (!token) {
        return false;
    }

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);

    try {
        var data = await fetchUserMe(token);
        sessionStorage.removeItem('rubyclub_guest');
        saveUserData(data);
        bindUserToLogin1(normalizeUser(data));
        setLoggedInState(true);
        return true;
    } catch (err) {
        console.error('Lấy thông tin user thất bại:', err);
        alert('Không lấy được thông tin tài khoản. Vui lòng đăng nhập lại.');
        localStorage.removeItem(AUTH_TOKEN_KEY);
        return false;
    }
}

async function initLogin1Session() {
    var token = getAuthToken();

    if (!token) {
        setLoggedInState(false);
        return;
    }

    var cached = loadUserFromStorage();
    if (cached) {
        bindUserToLogin1(normalizeUser(cached));
        setLoggedInState(true);
    }

    try {
        var data = await fetchUserMe(token);
        sessionStorage.removeItem('rubyclub_guest');
        saveUserData(data);
        bindUserToLogin1(normalizeUser(data));
        setLoggedInState(true);
    } catch (err) {
        console.error('Không tải được profile:', err);
        if (!cached) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setLoggedInState(false);
        }
    }
}

function initLogin1Games() {
    var cards = document.querySelectorAll('.login1-game__card');

    cards.forEach(function (card) {
        card.addEventListener('click', function () {
            launchGame(card);
        });
    });
}

function initPopupLoginButtons() {
    var mount = document.getElementById('popuplogin-mount');
    var btnLogin = document.getElementById('btn-login');
    var btnSignin = document.getElementById('btn-signin');

    if (!window.PopupLogin || !mount) {
        console.error('Popup login not initialized');
        return;
    }
    window.PopupLogin.init({ container: mount }).then(function () {
        if (btnLogin) {
            btnLogin.addEventListener('click', function () {
                window.PopupLogin.switchTab('login');
                window.PopupLogin.open();
            });
        }

        if (btnSignin) {
            btnSignin.addEventListener('click', function () {
                window.PopupLogin.switchTab('signin');
                window.PopupLogin.open();
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    initPopupLoginButtons();
    document.body.style.overflow = '';

    var handledToken = await captureTokenFromUrl();

    if (!handledToken) {
        await initLogin1Session();
    }

    
    initLogin1Games();

    var refreshBtn = document.getElementById('login1-refresh-balance');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            refreshUserProfile();
        });
    }
});

window.Login1 = {
    launchGame: launchGame,
    refreshUserProfile: refreshUserProfile,
    setLoggedInState: setLoggedInState,
    bindUserToLogin1: bindUserToLogin1,
    normalizeUser: normalizeUser,
    saveUserData: saveUserData
};
