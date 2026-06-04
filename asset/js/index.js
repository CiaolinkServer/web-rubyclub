var AUTH_TOKEN_KEY = 'rubyclub_auth_token';
var AUTH_TOKEN_EXPIRES_KEY = 'rubyclub_auth_token_expires_at';
var AUTH_TOKEN_TTL_MS = 23 * 60 * 60 * 1000;
var API_BASE = 'https://rubyclubph.com';
var authTokenExpiryTimer = null;

var games = [
    {
        id: 1,
        name: 'Showdown',
        icon: 'asset/image/icongame/1.png',
        nameBg: 'asset/image/icongame/background_name_game.png'
    },
    {
        id: 2,
        name: 'Showdown',
        icon: 'asset/image/icongame/1.png',
        nameBg: 'asset/image/icongame/background_name_game.png'
    },
    {
        id: 3,
        name: 'Showdown',
        icon: 'asset/image/icongame/1.png',
        nameBg: 'asset/image/icongame/background_name_game.png'
    },
    {
        id: 4,
        name: 'Showdown',
        icon: 'asset/image/icongame/1.png',
        nameBg: 'asset/image/icongame/background_name_game.png'
    },
    {
        id: 5,
        name: 'Showdown',
        icon: 'asset/image/icongame/1.png',
        nameBg: 'asset/image/icongame/background_name_game.png'
    },
    {
        id: 6,
        name: 'Showdown',
        icon: 'asset/image/icongame/1.png',
        nameBg: 'asset/image/icongame/background_name_game.png'
    },
    {
        id: 7,
        name: 'Showdown',
        icon: 'asset/image/icongame/1.png',
        nameBg: 'asset/image/icongame/background_name_game.png'
    },
    {
        id: 8,
        name: 'Showdown',
        icon: 'asset/image/icongame/1.png',
        nameBg: 'asset/image/icongame/background_name_game.png'
    },
    {
        id: 9,
        name: 'Showdown',
        icon: 'asset/image/icongame/1.png',
        nameBg: 'asset/image/icongame/background_name_game.png'
    }
];

async function launchGame(card) {
    var token = getAuthToken();

    if (!token) {
        alert('Vui lòng đăng nhập để chơi game.');
        if (window.PopupLogin) {
            window.PopupLogin.switchTab('login');
            window.PopupLogin.open();
        }
        return;
    }
    console.log("data card "+card.dataset);
    var gameId = card && card.dataset ? card.dataset.gameId : null;

    if (!gameId) {
        alert('Không xác định được game.');
        return;
    }

    if (card) {
        card.setAttribute('aria-disabled', 'true');
    }

    try {
        var response = await fetch(API_BASE + '/api/v1/auth/launch', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({
                game_id: Number(gameId)
            })
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
        if (card) {
            card.removeAttribute('aria-disabled');
        }
    }
}

function downloadAPK() {
    alert('Tính năng đang phát triển. Vui lòng thử lại sau.');
}

function clearAuthToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_EXPIRES_KEY);

    if (authTokenExpiryTimer) {
        clearTimeout(authTokenExpiryTimer);
        authTokenExpiryTimer = null;
    }
}

function clearAuthSession() {
    clearAuthToken();
    setLoggedInState(false);
}

function scheduleAuthTokenExpiry(delayMs) {
    if (authTokenExpiryTimer) {
        clearTimeout(authTokenExpiryTimer);
    }

    if (delayMs <= 0) {
        return;
    }

    authTokenExpiryTimer = setTimeout(function () {
        clearAuthSession();
    }, delayMs);
}

function saveAuthToken(token) {
    var expiresAt = Date.now() + AUTH_TOKEN_TTL_MS;

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_TOKEN_EXPIRES_KEY, String(expiresAt));
    scheduleAuthTokenExpiry(AUTH_TOKEN_TTL_MS);
}

function getAuthToken() {
    var token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
        return null;
    }

    var expiresAt = localStorage.getItem(AUTH_TOKEN_EXPIRES_KEY);

    if (!expiresAt) {
        expiresAt = String(Date.now() + AUTH_TOKEN_TTL_MS);
        localStorage.setItem(AUTH_TOKEN_EXPIRES_KEY, expiresAt);
        scheduleAuthTokenExpiry(AUTH_TOKEN_TTL_MS);
        return token;
    }

    var remainingMs = Number(expiresAt) - Date.now();

    if (remainingMs <= 0) {
        clearAuthSession();
        return null;
    }

    scheduleAuthTokenExpiry(remainingMs);
    return token;
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
        bindUserToLogin1(normalizeUser(data));
        setLoggedInState(true);
    } catch (err) {
        console.error('Làm mới thông tin user thất bại:', err);
        alert('Không lấy được thông tin tài khoản. Vui lòng thử lại.');

        clearAuthToken();
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

    saveAuthToken(token);
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);

    try {
        var data = await fetchUserMe(token);
        bindUserToLogin1(normalizeUser(data));
        setLoggedInState(true);
        return true;
    } catch (err) {
        console.error('Lấy thông tin user thất bại:', err);
        alert('Không lấy được thông tin tài khoản. Vui lòng đăng nhập lại.');
        clearAuthToken();
        return false;
    }
}

async function initLogin1Session() {
    var token = getAuthToken();

    if (!token) {
        setLoggedInState(false);
        return;
    }

    try {
        var data = await fetchUserMe(token);
        bindUserToLogin1(normalizeUser(data));
        setLoggedInState(true);
    } catch (err) {
        console.error('Không tải được profile:', err);
        clearAuthSession();
    }
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderLogin1Games() {
    var grid = document.querySelector('.login1-games__grid');

    if (!grid) {
        return;
    }

    grid.innerHTML = games.map(function (game) {
        var bgHtml = game.bg
            ? '<img class="login1-game__bg" src="' + escapeHtml(game.bg) + '" alt="">'
            : '';

        return (
            '<li class="login1-game login1-game--stack">' +
                '<div class="login1-game__card" aria-label="' + escapeHtml(game.name) + '" data-game-id="' + escapeHtml(game.id) + '">' +
                    bgHtml +
                    '<img class="login1-game__icon" src="' + escapeHtml(game.icon) + '" alt="">' +
                    '<img class="login1-game__name-bg" src="' + escapeHtml(game.nameBg) + '" alt="">' +
                    '<span class="login1-game__name">' + escapeHtml(game.name) + '</span>' +
                '</div>' +
            '</li>'
        );
    }).join('');
}

function getGameCardAtPoint(x, y) {
    var cards = document.querySelectorAll('.login1-game__card');

    for (var i = 0; i < cards.length; i++) {
        var rect = cards[i].getBoundingClientRect();

        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            return cards[i];
        }
    }

    return null;
}

function initLogin1Games() {
    var gamesEl = document.getElementById('login1-games');
    var TAP_MOVE_THRESHOLD = 12;

    if (!gamesEl) {
        return;
    }

    var activePointerId = null;
    var startX = 0;
    var startY = 0;
    var pointerMoved = false;

    function tryLaunchAtPoint(x, y) {
        var card = getGameCardAtPoint(x, y);
        if (card) {
            launchGame(card);
        }
    }

    gamesEl.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) {
            return;
        }

        activePointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        pointerMoved = false;
    });

    gamesEl.addEventListener(
        'pointermove',
        function (e) {
            if (e.pointerId !== activePointerId) {
                return;
            }

            var dx = Math.abs(e.clientX - startX);
            var dy = Math.abs(e.clientY - startY);

            if (dx > TAP_MOVE_THRESHOLD || dy > TAP_MOVE_THRESHOLD) {
                pointerMoved = true;
            }
        },
        { passive: true }
    );

    function finishPointer(e) {
        if (e.pointerId !== activePointerId) {
            return;
        }

        activePointerId = null;

        if (pointerMoved) {
            return;
        }

        tryLaunchAtPoint(e.clientX, e.clientY);
    }

    gamesEl.addEventListener('pointerup', finishPointer);
    gamesEl.addEventListener('pointercancel', function (e) {
        if (e.pointerId === activePointerId) {
            activePointerId = null;
        }
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

    renderLogin1Games();
    initLogin1Games();

    var refreshBtn = document.getElementById('login1-refresh-balance');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            refreshUserProfile();
        });
    }

    var apkBtn = document.getElementById('btn-download-apk');
    if (apkBtn) {
        apkBtn.addEventListener('click', function () {
            downloadAPK();
        });
    }

    
});

window.Login1 = {
    launchGame: launchGame,
    refreshUserProfile: refreshUserProfile,
    setLoggedInState: setLoggedInState,
    bindUserToLogin1: bindUserToLogin1,
    normalizeUser: normalizeUser,
    saveAuthToken: saveAuthToken,
    clearAuthSession: clearAuthSession,
    getAuthToken: getAuthToken
};

window.downloadAPK = downloadAPK;
