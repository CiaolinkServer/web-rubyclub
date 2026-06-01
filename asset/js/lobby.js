var AUTH_TOKEN_KEY = 'rubyclub_auth_token';
var USER_DATA_KEY = 'rubyclub_user_data';
var API_BASE = 'https://www.rubyclubph.com';

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getUserData() {
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

function bindUserToLobby(user, isGuest) {
    var nameEl = document.getElementById('lobby-username');
    var idEl = document.getElementById('lobby-userid');
    var balanceEl = document.getElementById('lobby-balance');

    if (!nameEl || !idEl || !balanceEl) {
        return;
    }

    if (isGuest) {
        nameEl.textContent = 'Guest';
        idEl.textContent = 'ID —';
        balanceEl.textContent = '0';
        return;
    }

    nameEl.textContent = user.name || 'Player';
    idEl.textContent = 'ID ' + (user.sid || user.email || '—');
    balanceEl.textContent = formatBalance(user.balance != null ? user.balance : 0);
}

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

function initLobbyGameFooter() {
    var playBtn = document.getElementById('lobby-play-game');
    var cards = document.querySelectorAll('.lobby-game-card');
    var activeCard = null;

    if (!cards.length) {
        return;
    }

    function setActiveCard(card) {
        activeCard = card;
    }

    cards.forEach(function (card) {
        card.addEventListener('click', function () {
            setActiveCard(card);
        });
    });

    if (playBtn) {
        playBtn.addEventListener('click', function () {
            launchGame(playBtn);
        });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    var isGuest = sessionStorage.getItem('rubyclub_guest') === '1';
    var data = getUserData();

    if (!data && !isGuest) {
        window.location.href = '../index.html';
        return;
    }

    if (isGuest) {
        bindUserToLobby(null, true);
    } else {
        window.lobbyUser = data;
        var user = data.user || data;
        bindUserToLobby(user, false);
    }

    initLobbyGameFooter();
});
