(function () {
    'use strict';

    const tg = window.Telegram?.WebApp || {
        ready: () => {}, expand: () => {}, disableVerticalSwipes: () => {},
        setHeaderColor: () => {}, setBackgroundColor: () => {},
        platform: 'unknown', initData: '',
        initDataUnsafe: { user: { first_name: 'Разработчик', username: 'test', id: 0 } },
        requestFullscreen: () => {},
        HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {} },
        showAlert: (msg) => alert(msg),
        openTelegramLink: (url) => window.open(url, '_blank'),
        openLink: (url) => window.open(url, '_blank'),
        BackButton: { show: () => {}, hide: () => {}, onClick: () => {}, offClick: () => {} }
    };

    window.MarketApp = {
        tg: tg,
        modules: {},
        currentView: null,
        previousView: null,
        profileStats: null,
        syncButtonText: null,
        shuffledNFTLinks: null,

        registerModule: function (name, mod) {
            this.modules[name] = mod;
        },

        getCurrentView: function () {
            return this.currentView;
        },

        switchView: function (viewName) {
            const prev = this.currentView;

            if (prev && this.modules[prev] && this.modules[prev].onLeave) {
                try { this.modules[prev].onLeave(); } catch (e) {}
            }

            document.querySelectorAll('.view-container').forEach(s => s.classList.add('hidden'));
            const target = document.getElementById('view-' + viewName);
            if (target) target.classList.remove('hidden');

            const mainViews = ['market', 'my-gifts', 'seasons', 'profile'];
            if (mainViews.includes(viewName)) {
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.view === viewName);
                });
                // Снять класс скрытия header/nav
                document.body.classList.remove('tc-open');
                this.previousView = prev;
            }

            // Для страницы добавления подарка — скрыть header и nav
            if (viewName === 'registration') {
                document.body.classList.add('tc-open');
            }

            this.currentView = viewName;

            if (this.modules[viewName] && this.modules[viewName].onEnter) {
                try { this.modules[viewName].onEnter(); } catch (e) {}
            }
        }
    };

    tg.ready();
    tg.expand();

    function hideLoader() {
        const loader = document.getElementById('pageLoader');
        const app = document.getElementById('app');
        if (loader) loader.style.display = 'none';
        if (app) { app.style.visibility = 'visible'; app.style.opacity = '1'; }
    }

    function initNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (view && view !== window.MarketApp.currentView) {
                    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                    window.MarketApp.switchView(view);
                }
            });
        });
    }

    function initAddGiftScreen() {
        const backBtn = document.getElementById('tcBackBtn');
        const connectBtn = document.getElementById('tcConnectBtn');

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                const prev = window.MarketApp.previousView || 'my-gifts';
                window.MarketApp.switchView(prev);
            });
        }

        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                const botUrl = 'https://t.me/otc_helper';
                if (tg.openTelegramLink) tg.openTelegramLink(botUrl);
                else window.open(botUrl, '_blank');
            });
        }
    }

    function init() {
        initNavigation();
        initAddGiftScreen();

        if (typeof window.initMarketView === 'function') {
            window.initMarketView();
        }

        if (typeof initAuth === 'function') {
            const botUsername = new URLSearchParams(window.location.search).get('bot_username') || '';
            try { initAuth(botUsername, 'registration'); } catch(e) {}
        }

        window.MarketApp.switchView('market');
        setTimeout(hideLoader, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();