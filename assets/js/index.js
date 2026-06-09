var AUTH_TOKEN_KEY = 'rubyclub_auth_token';
var AUTH_TOKEN_EXPIRES_KEY = 'rubyclub_auth_token_expires_at';
var AUTH_TOKEN_TTL_MS = 23 * 60 * 60 * 1000;
var API_BASE = window.RubyClubConfig != null ? window.RubyClubConfig.API_BASE : 'https://rubyclubph.com';
var KEY_CHECK_PROXY = window.RubyClubConfig != null ? window.RubyClubConfig.KEY_CHECK_PROXY : '';
var API_CHECK_PROXY = 'https://proxycheck.io/v3/{ip}?key={key}';
var API_CHECK_PROXY_IP = 'https://proxycheck.io/v3/${ip}?vpn=1&asn=1';
var authTokenExpiryTimer = null;
var GAME_ICON_BASE = 'assets/image/icongame/';
var GAME_NAME_BG = 'assets/image/icongame/background_name_game.png';
var GAME_EAGER_LOAD = 12;
var gameImageObserver = null;

async function launchGame(card) {
    console.log("data card "+card.dataset.gameId);
    var token = getAuthToken();

    if (!token) {
        alert('Vui lòng đăng nhập để chơi game.');
        if (window.PopupLogin) {
            window.PopupLogin.switchTab('login');
            window.PopupLogin.open();
        }
        return;
    }
    
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

function filterGamesByIds(ids) {
    var gameMap = {};
    var filtered = [];
    var i;
    var j;
    var game;

    for (i = 0; i < games.length; i++) {
        gameMap[String(games[i].id)] = games[i];
    }

    for (j = 0; j < ids.length; j++) {
        game = gameMap[String(ids[j])];

        if (game) {
            filtered.push(game);
        }
    }

    return filtered;
}

function getGamesForSidebarFilter(filterKey) {
    var filterMap = {
        hot: hot_games_ids,
        hall_of_fame: hall_of_fame_games_ids,
        new: new_games_ids,
        bigwin: big_win_games_ids,
        bonus_rich: bonus_rich_games_ids
    };

    if (filterKey && filterKey !== 'all' && filterMap[filterKey]) {
        return filterGamesByIds(filterMap[filterKey]);
    }

    return games;
}

function renderLogin1Games(filterKey) {
    var grid = document.querySelector('.login1-games__grid');

    if (!grid) {
        return;
    }

    var list = filterKey ? getGamesForSidebarFilter(filterKey) : games;

    grid.innerHTML = list.map(function (game) {
        var iconSrc = GAME_ICON_BASE + escapeHtml(game.id) + '.png';
        var bgHtml = game.bg
            ? '<img class="login1-game__bg login1-game__img--lazy" data-src="' + escapeHtml(game.bg) + '" alt="">'
            : '';

        return (
            '<li class="login1-game login1-game--stack">' +
                '<div class="login1-game__card" aria-label="' + escapeHtml(game.name) + '" data-game-id="' + escapeHtml(game.id) + '">' +
                    bgHtml +
                    '<img class="login1-game__icon login1-game__img--lazy" data-src="' + iconSrc + '" alt="">' +
                    '<img class="login1-game__name-bg login1-game__img--lazy" data-src="' + GAME_NAME_BG + '" alt="">' +
                    '<div class="login1-game__name">' +
                        '<div class="login1-game__name-marquee">' +
                            '<span class="login1-game__name-text">' + escapeHtml(game.name) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</li>'
        );
    }).join('');

    initGameImageLazyLoad();
    initGameNameMarquees();
}

function loadLazyGameImage(img) {
    if (!img || img.dataset.loaded === '1') {
        return;
    }

    var src = img.getAttribute('data-src');

    if (!src) {
        return;
    }

    img.src = src;
    img.removeAttribute('data-src');
    img.dataset.loaded = '1';
    img.classList.add('login1-game__img--loaded');
}

function preloadEagerGameImages(root) {
    var cards = root.querySelectorAll('.login1-game__card');
    var limit = Math.min(GAME_EAGER_LOAD, cards.length);

    for (var i = 0; i < limit; i++) {
        var images = cards[i].querySelectorAll('.login1-game__img--lazy[data-src]');

        for (var j = 0; j < images.length; j++) {
            loadLazyGameImage(images[j]);
        }
    }
}

function initGameImageLazyLoad() {
    var root = document.getElementById('login1-games');

    if (!root) {
        return;
    }

    if (gameImageObserver) {
        gameImageObserver.disconnect();
        gameImageObserver = null;
    }

    preloadEagerGameImages(root);

    var lazyImages = root.querySelectorAll('.login1-game__img--lazy[data-src]');

    if (!lazyImages.length) {
        return;
    }

    if (!('IntersectionObserver' in window)) {
        for (var i = 0; i < lazyImages.length; i++) {
            loadLazyGameImage(lazyImages[i]);
        }
        return;
    }

    gameImageObserver = new IntersectionObserver(function (entries) {
        for (var j = 0; j < entries.length; j++) {
            if (entries[j].isIntersecting) {
                loadLazyGameImage(entries[j].target);
                gameImageObserver.unobserve(entries[j].target);
            }
        }
    }, {
        root: root,
        rootMargin: '120px 0px',
        threshold: 0
    });

    for (var k = 0; k < lazyImages.length; k++) {
        gameImageObserver.observe(lazyImages[k]);
    }
}

function initGameNameMarquees() {
    var items = document.querySelectorAll('.login1-game__name');

    for (var i = 0; i < items.length; i++) {
        var wrap = items[i];
        var marquee = wrap.querySelector('.login1-game__name-marquee');
        var label = marquee && marquee.querySelector('.login1-game__name-text');

        if (!marquee || !label) {
            continue;
        }

        var name = label.textContent;
        wrap.classList.remove('login1-game__name--scroll');
        marquee.innerHTML = '<span class="login1-game__name-text">' + escapeHtml(name) + '</span>';

        label = marquee.querySelector('.login1-game__name-text');

        if (label.scrollWidth > wrap.clientWidth) {
            wrap.classList.add('login1-game__name--scroll');
            marquee.innerHTML =
                '<span class="login1-game__name-text">' + escapeHtml(name) + '</span>' +
                '<span class="login1-game__name-text" aria-hidden="true">' + escapeHtml(name) + '</span>';
        }
    }
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

function setSidebarItemIcon(item, isActive) {
    if (!item) {
        return;
    }

    var icon = item.querySelector('.login1-sidebar__icon');

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

function setActiveSidebarItem(item) {
    var nav = document.querySelector('.login1-sidebar__nav');
    var items = nav ? nav.querySelectorAll('.login1-sidebar__item') : [];

    for (var i = 0; i < items.length; i++) {
        var isActive = items[i] === item;
        items[i].classList.toggle('login1-sidebar__item--active', isActive);
        setSidebarItemIcon(items[i], isActive);
    }
}

function initLogin1SidebarNav() {
    var nav = document.querySelector('.login1-sidebar__nav');

    if (!nav || nav.dataset.sidebarNavBound === '1') {
        return;
    }

    nav.dataset.sidebarNavBound = '1';

    nav.addEventListener('click', function (e) {
        var item = e.target.closest('.login1-sidebar__item');

        if (!item || !nav.contains(item)) {
            return;
        }

        setActiveSidebarItem(item);

        var filterKey = item.getAttribute('data-game-filter');

        if (filterKey) {
            renderLogin1Games(filterKey);

            var gamesEl = document.getElementById('login1-games');
            if (gamesEl) {
                gamesEl.scrollTop = 0;
            }
        }
    });
}

function initSupportButtons() {
    var mount = document.getElementById('support-mount');
    var btnSupport = document.getElementById('btn-support');

    if (!window.PopupSupport || !mount) {
        console.error('Popup support not initialized');
        return;
    }

    window.PopupSupport.init({ container: mount }).then(function () {
        if (btnSupport) {
            btnSupport.addEventListener('click', function () {
                window.PopupSupport.open();
            });
        }
    });
}

function initMailButtons() {
    var mount = document.getElementById('mail-mount');

    if (!window.PopupMail || !mount) {
        return;
    }

    window.PopupMail.init({ container: mount });
}

function initDepositButtons() {
    var mount = document.getElementById('deposit-mount');

    if (!window.PopupDeposit || !mount) {
        return;
    }

    window.PopupDeposit.init({ container: mount });
}

function openMailPopupFromEvent(e) {
    if (!window.PopupMail) {
        if (typeof window.showToast === 'function') {
            window.showToast('Comming soon');
        }
        return;
    }

    if (e) {
        e.preventDefault();
    }

    if (!getMailAuthTokenSafe()) {
        if (typeof window.showToast === 'function') {
            window.showToast('Vui lòng đăng nhập');
        }

        if (window.PopupLogin) {
            window.PopupLogin.switchTab('login');
            window.PopupLogin.open();
        }
        return;
    }

    window.PopupMail.open();
}

function getMailAuthTokenSafe() {
    if (window.Login1 && typeof window.Login1.getAuthToken === 'function') {
        return window.Login1.getAuthToken();
    }

    return localStorage.getItem('rubyclub_auth_token');
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

async function getClientIp() {
  try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || null;
  } catch (err) {
      console.error('getClientIp failed:', err);
      return null;
  }
}

async function chekcip() {
  try {
      const res = await fetch('https://proxycheck.io/v3/113.186.229.217/?key=public-5632b3-j5y391-188460');
      const data = await res.json();
      return data
  } catch (err) {
      console.error('getClientIp failed:', err);
      return null;
  }
}

async function reDirectIfVietNamIp() {
    try {
        var data = await chekcip();
        console.log("chekcip "+data);
        var ip = await getClientIp();

        if (!ip) {
            return false;
        }
        if(!KEY_CHECK_PROXY) {
            return false;
        }

        // var url = API_CHECK_PROXY_IP.replace('{key}', KEY_CHECK_PROXY);
        //replace ip
         var url = API_CHECK_PROXY_IP.replace('{ip}', ip);
         console.log(url);
        var res = await fetch(url);
        if (!res.ok) {
            return false;
        }

        var data = await res.json();
        var proxy = data[ip].detections.proxy;
        var vpn = data[ip].detections.vpn;
        var country_code = data[ip].location.country_code;

        if (proxy === true || vpn === true || country_code === 'VN') {
            window.location.replace('https://www.google.com');
            return true;
        }
    } catch (err) {
        console.error('reDirectIfVietNamIp failed:', err);
    }

    return false;
}

// var login1RedirectCheck = reDirectIfVietNamIp();

document.addEventListener('DOMContentLoaded', async function () {
    if (document.body.classList.contains('login1-page--account')) {
        return;
    }

    // if (await login1RedirectCheck) {
    //     return;
    // }
    initPopupLoginButtons();
    initSupportButtons();
    initMailButtons();
    initDepositButtons();
    if (window.Header) {
        window.Header.init();
    }
    if (window.Footer) {
        window.Footer.init();
    }
    document.body.style.overflow = '';

    var handledToken = await captureTokenFromUrl();

    if (!handledToken) {
        await initLogin1Session();
    }

    renderLogin1Games('all');
    initLogin1Games();
    initLogin1SidebarNav();

    if (!window.__login1GameNameResizeBound) {
        window.__login1GameNameResizeBound = true;
        var gameNameResizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(gameNameResizeTimer);
            gameNameResizeTimer = setTimeout(initGameNameMarquees, 150);
        });
    }

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
var hot_games_ids = [65, 74, 89, 75, 87, 54, 57, 68, 71, 103, 112, 127];
var big_win_games_ids = [1, 42, 48, 60, 62, 69, 71, 73, 74, 75, 79, 80, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 97, 101, 103, 106, 107, 110, 112, 113, 117, 119, 120, 125, 127, 128, 132];
var new_games_ids = [1827457, 1834850, 1849515, 1850016, 1865521, 1879752, 1881268, 1897678, 1903012, 1918451, 1929177, 1935269, 1940257, 1950910, 1964781, 1971587, 1981965, 1997301, 2009635, 2012025, 2024510, 2035783, 2058347, 2081892, 2100928];
var hall_of_fame_games_ids = [3, 6, 7, 29, 65, 74, 71, 89, 54, 42, 75, 87, 57, 68];
var bonus_rich_games_ids = [57, 65, 74, 89, 75, 87, 103, 112, 106, 62, 54, 95, 91, 128, 113];
var games = [
    {
      "id": 1,
      "name": "Honey Trap of Diao Chan"
    },
    {
      "id": 2,
      "name": "Gem Saviour"
    },
    {
      "id": 3,
      "name": "Fortune Gods"
    },
    {
      "id": 6,
      "name": "Medusa 2: The Quest of Perseus"
    },
    {
      "id": 7,
      "name": "Medusa 1: The Curse of Athena"
    },
    {
      "id": 18,
      "name": "Hood vs Wolf"
    },
    {
      "id": 20,
      "name": "Reel Love"
    },
    {
      "id": 24,
      "name": "Win Win Won"
    },
    {
      "id": 25,
      "name": "Plushie Frenzy"
    },
    {
      "id": 26,
      "name": "Tree of Fortune"
    },
    {
      "id": 28,
      "name": "Hotpot"
    },
    {
      "id": 29,
      "name": "Dragon Legend"
    },
    {
      "id": 33,
      "name": "Hip Hop Panda"
    },
    {
      "id": 34,
      "name": "Legend of Hou Yi"
    },
    {
      "id": 35,
      "name": "Mr. Hallow-Jackpot!"
    },
    {
      "id": 36,
      "name": "Prosperity Lion"
    },
    {
      "id": 37,
      "name": "Santa's Gift Rush"
    },
    {
      "id": 38,
      "name": "Gem Saviour Sword"
    },
    {
      "id": 39,
      "name": "Piggy Gold"
    },
    {
      "id": 40,
      "name": "Jungle Delight"
    },
    {
      "id": 41,
      "name": "Symbols Of Egypt"
    },
    {
      "id": 42,
      "name": "Ganesha Gold"
    },
    {
      "id": 44,
      "name": "Emperor's Favour"
    },
    {
      "id": 48,
      "name": "Double Fortune"
    },
    {
      "id": 50,
      "name": "Journey to the Wealth"
    },
    {
      "id": 53,
      "name": "The Great Icescape"
    },
    {
      "id": 54,
      "name": "Captain's Bounty"
    },
    {
      "id": 57,
      "name": "Dragon Hatch"
    },
    {
      "id": 58,
      "name": "Vampire's Charm"
    },
    {
      "id": 59,
      "name": "Ninja vs Samurai"
    },
    {
      "id": 60,
      "name": "Leprechaun Riches"
    },
    {
      "id": 61,
      "name": "Flirting Scholar"
    },
    {
      "id": 62,
      "name": "Gem Saviour Conquest"
    },
    {
      "id": 63,
      "name": "Dragon Tiger Luck"
    },
    {
      "id": 64,
      "name": "Muay Thai Champion"
    },
    {
      "id": 65,
      "name": "Mahjong Ways"
    },
    {
      "id": 67,
      "name": "Shaolin Soccer"
    },
    {
      "id": 68,
      "name": "Fortune Mouse"
    },
    {
      "id": 69,
      "name": "Bikini Paradise"
    },
    {
      "id": 70,
      "name": "Candy Burst"
    },
    {
      "id": 71,
      "name": "Cai Shen Wins"
    },
    {
      "id": 73,
      "name": "Egypt's Book of Mystery"
    },
    {
      "id": 74,
      "name": "Mahjong Ways 2"
    },
    {
      "id": 75,
      "name": "Ganesha Fortune"
    },
    {
      "id": 79,
      "name": "Dreams of Macau"
    },
    {
      "id": 80,
      "name": "Circus Delight"
    },
    {
      "id": 82,
      "name": "Phoenix Rises"
    },
    {
      "id": 83,
      "name": "Wild Fireworks"
    },
    {
      "id": 84,
      "name": "Queen of Bounty"
    },
    {
      "id": 85,
      "name": "Genie's 3 Wishes"
    },
    {
      "id": 86,
      "name": "Galactic Gems"
    },
    {
      "id": 87,
      "name": "Treasures of Aztec"
    },
    {
      "id": 88,
      "name": "Jewels of Prosperity"
    },
    {
      "id": 89,
      "name": "Lucky Neko"
    },
    {
      "id": 90,
      "name": "Secrets of Cleopatra"
    },
    {
      "id": 91,
      "name": "Guardians of Ice & Fire"
    },
    {
      "id": 92,
      "name": "Thai River Wonders"
    },
    {
      "id": 93,
      "name": "Opera Dynasty"
    },
    {
      "id": 94,
      "name": "Bali Vacation"
    },
    {
      "id": 95,
      "name": "Majestic Treasures"
    },
    {
      "id": 97,
      "name": "Jack Frost's Winter"
    },
    {
      "id": 98,
      "name": "Fortune Ox"
    },
    {
      "id": 100,
      "name": "Candy Superwin"
    },
    {
      "id": 101,
      "name": "Rise of the Sun God"
    },
    {
      "id": 102,
      "name": "Mermaid Riches"
    },
    {
      "id": 103,
      "name": "Crypto Gold"
    },
    {
      "id": 104,
      "name": "Wild Bandito"
    },
    {
      "id": 105,
      "name": "Heist Stakes"
    },
    {
      "id": 106,
      "name": "Ways of the Qilin"
    },
    {
      "id": 107,
      "name": "Legendary Monkey King"
    },
    {
      "id": 108,
      "name": "Buffalo Win"
    },
    {
      "id": 110,
      "name": "Jurassic Kingdom"
    },
    {
      "id": 112,
      "name": "Oriental Prosperity"
    },
    {
      "id": 113,
      "name": "Raider Jane's Crypt of Fortune"
    },
    {
      "id": 114,
      "name": "Emoji Riches"
    },
    {
      "id": 115,
      "name": "Supermarket Spree"
    },
    {
      "id": 117,
      "name": "Cocktail Nights"
    },
    {
      "id": 118,
      "name": "Mask Carnival"
    },
    {
      "id": 119,
      "name": "Spirited Wonders"
    },
    {
      "id": 120,
      "name": "The Queen's Banquet"
    },
    {
      "id": 121,
      "name": "Destiny of Sun & Moon"
    },
    {
      "id": 122,
      "name": "Garuda Gems"
    },
    {
      "id": 123,
      "name": "Rooster Rumble"
    },
    {
      "id": 124,
      "name": "Battleground Royale"
    },
    {
      "id": 125,
      "name": "Butterfly Blossom"
    },
    {
      "id": 126,
      "name": "Fortune Tiger"
    },
    {
      "id": 127,
      "name": "Speed Winner"
    },
    {
      "id": 128,
      "name": "Legend of Perseus"
    },
    {
      "id": 129,
      "name": "Win Win Fish Prawn Crab"
    },
    {
      "id": 130,
      "name": "Lucky Piggy"
    },
    {
      "id": 132,
      "name": "Wild Coaster"
    },
    {
      "id": 135,
      "name": "Wild Bounty Showdown"
    },
    {
      "id": 1312883,
      "name": "Prosperity Fortune Tree"
    },
    {
      "id": 1338274,
      "name": "Totem Wonders"
    },
    {
      "id": 1340277,
      "name": "Asgardian Rising"
    },
    {
      "id": 1368367,
      "name": "Alchemy Gold"
    },
    {
      "id": 1372643,
      "name": "Diner Delights"
    },
    {
      "id": 1381200,
      "name": "Hawaiian Tiki"
    },
    {
      "id": 1397455,
      "name": "Fruity Candy"
    },
    {
      "id": 1402846,
      "name": "Midas Fortune"
    },
    {
      "id": 1418544,
      "name": "Bakery Bonanza"
    },
    {
      "id": 1420892,
      "name": "Rave Party Fever"
    },
    {
      "id": 1432733,
      "name": "Mystical Spirits"
    },
    {
      "id": 1448762,
      "name": "Songkran Splash"
    },
    {
      "id": 1451122,
      "name": "Dragon Hatch2"
    },
    {
      "id": 1473388,
      "name": "Cruise Royale"
    },
    {
      "id": 1489936,
      "name": "Ultimate Striker"
    },
    {
      "id": 1492288,
      "name": "Pinata Wins"
    },
    {
      "id": 1508783,
      "name": "Wild Ape #3258"
    },
    {
      "id": 1513328,
      "name": "Super Golf Drive"
    },
    {
      "id": 1529867,
      "name": "Ninja Raccoon Frenzy"
    },
    {
      "id": 1543462,
      "name": "Fortune Rabbit"
    },
    {
      "id": 1555350,
      "name": "Forge of Wealth"
    },
    {
      "id": 1568554,
      "name": "Wild Heist Cashout"
    },
    {
      "id": 1572362,
      "name": "Gladiator's Glory"
    },
    {
      "id": 1580541,
      "name": "Mafia Mayhem"
    },
    {
      "id": 1594259,
      "name": "Safari Wilds"
    },
    {
      "id": 1601012,
      "name": "Lucky Clover Riches"
    },
    {
      "id": 1615454,
      "name": "Werewolf's Hunt"
    },
    {
      "id": 1623475,
      "name": "Anubis Wrath"
    },
    {
      "id": 1635221,
      "name": "Zombie Outbreak"
    },
    {
      "id": 1648578,
      "name": "Shark Bounty"
    },
    {
      "id": 1655268,
      "name": "Tsar Treasures"
    },
    {
      "id": 1666445,
      "name": "Chocolate Deluxe"
    },
    {
      "id": 1671262,
      "name": "Gemstones Gold"
    },
    {
      "id": 1682240,
      "name": "Cash Mania"
    },
    {
      "id": 1695365,
      "name": "Fortune Dragon"
    },
    {
      "id": 1702123,
      "name": "Geisha's Revenge"
    },
    {
      "id": 1717688,
      "name": "Mystic Potion"
    },
    {
      "id": 1727711,
      "name": "Three Crazy Piggies"
    },
    {
      "id": 1738001,
      "name": "Chicky Run"
    },
    {
      "id": 1747549,
      "name": "Wings of Iguazu"
    },
    {
      "id": 1755623,
      "name": "Museum Wonders"
    },
    {
      "id": 1760238,
      "name": "Yakuza Honor"
    },
    {
      "id": 1778752,
      "name": "Futebol Fever"
    },
    {
      "id": 1786529,
      "name": "Rio Fantasia"
    },
    {
      "id": 1799745,
      "name": "Mr. Treasure's Fortune"
    },
    {
      "id": 1804577,
      "name": "Graffiti Rush"
    },
    {
      "id": 1815268,
      "name": "Oishi Delights"
    },
    {
      "id": 1827457,
      "name": "Doomsday Rampage"
    },
    {
      "id": 1834850,
      "name": "Jack the Giant Hunter"
    },
    {
      "id": 1849515,
      "name": "Mythical Guardians"
    },
    {
      "id": 1850016,
      "name": "Incan Wonders"
    },
    {
      "id": 1865521,
      "name": "Dead Man's Riches"
    },
    {
      "id": 1879752,
      "name": "Fortune Snake"
    },
    {
      "id": 1881268,
      "name": "Knockout Riches"
    },
    {
      "id": 1897678,
      "name": "Dragon's Treasure Quest"
    },
    {
      "id": 1903012,
      "name": "Grimms' Bounty: Hansel & Gretel"
    },
    {
      "id": 1918451,
      "name": "Galaxy Miner"
    },
    {
      "id": 1929177,
      "name": "Kraken Gold Rush"
    },
    {
      "id": 1935269,
      "name": "Diner Frenzy Spins"
    },
    {
      "id": 1940257,
      "name": "Alibaba's Cave of Fortune"
    },
    {
      "id": 1950910,
      "name": "Inferno Mayhem"
    },
    {
      "id": 1964781,
      "name": "Pharaoh Royals"
    },
    {
      "id": 1971587,
      "name": "Majestic Empire"
    },
    {
      "id": 1981965,
      "name": "Forbidden Alchemy"
    },
    {
      "id": 1997301,
      "name": "Mayan Destiny"
    },
    {
      "id": 2009635,
      "name": "Poker Kingdom Win"
    },
    {
      "id": 2012025,
      "name": "Skylight Wonders"
    },
    {
      "id": 2024510,
      "name": "Perfect Strike"
    },
    {
      "id": 2035783,
      "name": "Funky Fortunez"
    },
    {
      "id": 2058347,
      "name": "Reel Royale Showdown"
    },
    {
      "id": 2081892,
      "name": "Mighty Mania"
    },
    {
      "id": 2100928,
      "name": "Fortune Horse"
    }
  ];

  function getCountryCode() {
    // Creates a locale object from the browser's language setting
    const locale = new Intl.Locale(navigator.language);

    // Extracts the region/country code (e.g., "US")
    const countryCode = locale.region; 

    console.log(countryCode); 
    return countryCode;

  }

function showToast(message) {
    var container = document.getElementById('toast-container');
    if (!container || !message) {
        return;
    }

    var toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(function () {
        toast.remove();
    }, 3000);
}

window.showToast = showToast;

window.openMailPopupFromEvent = openMailPopupFromEvent;

window.Login1 = {
    launchGame: launchGame,
    refreshUserProfile: refreshUserProfile,
    setLoggedInState: setLoggedInState,
    bindUserToLogin1: bindUserToLogin1,
    normalizeUser: normalizeUser,
    saveAuthToken: saveAuthToken,
    clearAuthSession: clearAuthSession,
    getAuthToken: getAuthToken,
    captureTokenFromUrl: captureTokenFromUrl,
    initLogin1Session: initLogin1Session
};

window.downloadAPK = downloadAPK;
