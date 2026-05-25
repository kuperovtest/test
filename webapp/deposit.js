(function () {
    'use strict';

    if (!window.MarketApp) {
        console.error('[DEPOSIT] MarketApp not initialized');
        return;
    }

    const tg = window.MarketApp.tg;
    let previousView = 'market';

    function setHeaderVisible(visible) {
        const header = document.querySelector('.top-header');
        const bottomNav = document.querySelector('.bottom-nav');

        if (header) {
            if (visible) {
                header.style.display = 'flex';
                header.style.opacity = '1';
                header.style.pointerEvents = 'auto';
            } else {
                header.style.display = 'none';
                header.style.opacity = '0';
                header.style.pointerEvents = 'none';
            }
            header.style.transition = 'opacity 0.3s ease';
        }

        if (bottomNav) {
            bottomNav.style.transform = visible ? 'translateY(0)' : 'translateY(100%)';
            bottomNav.style.transition = 'transform 0.3s ease';
        }
    }

    function setupBackButton() {
        if (tg.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(handleBackClick);
        }
    }

    function hideBackButton() {
        if (tg.BackButton) {
            tg.BackButton.hide();
            tg.BackButton.offClick(handleBackClick);
        }
    }

    function handleBackClick() {
        hideBackButton();
        setHeaderVisible(true);
        window.MarketApp.switchView(previousView);

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    function openDepositTon() {
        previousView = window.MarketApp.getCurrentView();
        setHeaderVisible(false);
        setupBackButton();
        window.MarketApp.switchView('deposit-ton');

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    }

    function openDepositStars() {
        previousView = window.MarketApp.getCurrentView();
        setHeaderVisible(false);
        setupBackButton();
        window.MarketApp.switchView('deposit-stars');

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    }

    function initDepositButtons() {
        const addBalanceBtn = document.getElementById('addBalanceBtn');
        const addStarsBtn = document.getElementById('addStarsBtn');

        if (addBalanceBtn) {
            addBalanceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDepositTon();
            }, { passive: true });
        }

        if (addStarsBtn) {
            addStarsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDepositStars();
            }, { passive: true });
        }
    }

    function initDepositPageButtons() {
        const depositTonBtn = document.getElementById('depositTonBtn');
        const withdrawTonBtn = document.getElementById('withdrawTonBtn');

        if (depositTonBtn) {
            depositTonBtn.addEventListener('click', () => {
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                showDepositPopup('ton');
            });
        }

        if (withdrawTonBtn) {
            withdrawTonBtn.addEventListener('click', () => {
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                showWithdrawPopup('ton');
            });
        }

        const depositStarsBtn = document.getElementById('depositStarsBtn');
        const exchangeStarsBtn = document.getElementById('exchangeStarsBtn');
        const withdrawStarsBtn = document.getElementById('withdrawStarsBtn');
        const exchangeStarsDrawer = document.getElementById('exchangeStarsDrawer');
        const exchangeStarsCloseBtn = document.getElementById('exchangeStarsCloseBtn');
        const exchangeStarsCancelBtn = document.getElementById('exchangeStarsCancelBtn');
        const exchangeStarsConfirmBtn = document.getElementById('exchangeStarsConfirmBtn');
        const exchangeStarsAvailable = document.getElementById('exchangeStarsAvailable');
        const exchangeTonReceive = document.getElementById('exchangeTonReceive');
        const drawerOverlay = document.getElementById('drawerOverlay');

        if (depositStarsBtn) {
            depositStarsBtn.addEventListener('click', () => {
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                showDepositPopup('stars');
            });
        }

        const showTopToast = (message) => {
            const toast = document.getElementById('withdrawToast');
            const toastText = document.getElementById('withdrawToastText');
            const toastBar = document.getElementById('withdrawToastBar');
            if (!toast || !toastText || !toastBar) return;
            toastText.textContent = message;
            toast.classList.add('show');
            toastBar.style.transition = 'none';
            toastBar.style.transform = 'scaleX(1)';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    toastBar.style.transition = 'transform 3s linear';
                    toastBar.style.transform = 'scaleX(0)';
                });
            });
            setTimeout(() => toast.classList.remove('show'), 3000);
        };

        const closeExchangeDrawer = () => {
            if (exchangeStarsDrawer) {
                exchangeStarsDrawer.classList.remove('open');
                exchangeStarsDrawer.style.transform = '';
            }
            if (drawerOverlay) drawerOverlay.classList.remove('open');
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };

        const openExchangeDrawer = () => {
            const stars = Number(window.MarketApp?.starsBalance || 0);
            if (stars < 100) {
                showTopToast('Недостаточно Stars для обмена');
                return;
            }
            const canExchange = Math.floor(stars / 100);
            const tonReceive = canExchange;
            const roundedStars = Math.round(stars);
            const starsDisplay = roundedStars >= 10000 ? '10000.' : roundedStars.toString();
            const tonDisplay = tonReceive >= 10000 ? '10000.' : tonReceive.toFixed(2);
            if (exchangeStarsAvailable) exchangeStarsAvailable.textContent = `${starsDisplay} Stars`;
            if (exchangeTonReceive) exchangeTonReceive.textContent = `${tonDisplay} TON`;
            if (drawerOverlay) drawerOverlay.classList.add('open');
            if (exchangeStarsDrawer) exchangeStarsDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        };

        if (exchangeStarsBtn) {
            exchangeStarsBtn.addEventListener('click', () => {
                openExchangeDrawer();
            });
        }

        if (withdrawStarsBtn) {
            withdrawStarsBtn.addEventListener('click', () => {
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                showWithdrawPopup('stars');
            });
        }

        const confirmExchange = async () => {
            const stars = Number(window.MarketApp?.starsBalance || 0);
            const ton = Number(window.MarketApp?.tonBalance || 0);
            if (stars < 100) {
                showTopToast('Недостаточно Stars для обмена');
                return;
            }
            const canExchange = Math.floor(stars / 100);
            if (canExchange <= 0) {
                showTopToast('Недостаточно Stars для обмена');
                return;
            }
            const starsToSpend = canExchange * 100;
            const tonToAdd = canExchange * 1;

            try {
                const tg = window.Telegram?.WebApp;
                const botUsername = new URLSearchParams(window.location.search).get('bot_username') || '';
                
                const response = await fetch('/miniapp/exchange_stars', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        initData: tg?.initData || '',
                        bot_username: botUsername,
                        stars_amount: starsToSpend
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (window.MarketApp?.setStarsBalance) window.MarketApp.setStarsBalance(data.new_stars_balance);
                    if (window.MarketApp?.setTonBalance) window.MarketApp.setTonBalance(data.new_ton_balance);
                    showTopToast(`Обмен успешно: -${starsToSpend} Stars, +${tonToAdd} TON`);
                    closeExchangeDrawer();
                } else {
                    showTopToast(data.error || 'Ошибка обмена');
                }
            } catch (error) {
                console.error('[DEPOSIT] Ошибка обмена Stars:', error);
                showTopToast('Ошибка обмена');
            }
        };

        if (exchangeStarsCloseBtn) exchangeStarsCloseBtn.addEventListener('click', closeExchangeDrawer);
        if (exchangeStarsCancelBtn) exchangeStarsCancelBtn.addEventListener('click', closeExchangeDrawer);
        if (exchangeStarsConfirmBtn) exchangeStarsConfirmBtn.addEventListener('click', confirmExchange);
        if (drawerOverlay && exchangeStarsDrawer) {
            drawerOverlay.addEventListener('click', () => {
                if (exchangeStarsDrawer.classList.contains('open')) closeExchangeDrawer();
            });
        }
    }

    function showDepositPopup(type) {
        const errorOverlay = document.getElementById('errorOverlay');
        const errorPopup = document.getElementById('errorPopup');
        const errorTitle = document.getElementById('errorTitle');
        const errorText = document.getElementById('errorText');
        const errorCloseBtn = document.getElementById('errorCloseBtn');
        
        let syncButton = document.getElementById('errorSyncBtn');
        if (!syncButton) {
            syncButton = document.createElement('button');
            syncButton.id = 'errorSyncBtn';
            syncButton.className = 'popup-btn';
            syncButton.textContent = 'Синхронизация';
            syncButton.addEventListener('click', () => {
                const errorOverlay = document.getElementById('errorOverlay');
                const errorPopup = document.getElementById('errorPopup');
                if (errorOverlay) errorOverlay.classList.remove('open');
                if (errorPopup) errorPopup.classList.remove('open');
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                if (window.MarketApp && window.MarketApp.switchView) {
                    window.MarketApp.switchView('registration');
                }
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            });
            if (errorCloseBtn && errorCloseBtn.parentNode) {
                errorCloseBtn.parentNode.insertBefore(syncButton, errorCloseBtn);
            }
        }
        syncButton.style.display = 'block';

        if (errorTitle) errorTitle.textContent = 'Требуется авторизация';
        if (errorText) {
            errorText.textContent = type === 'ton'
                ? 'Для пополнения TON необходимо синхронизироваться с маркетом'
                : 'Для пополнения Stars необходимо синхронизироваться с маркетом';
        }

        if (errorOverlay) errorOverlay.classList.add('open');
        if (errorPopup) errorPopup.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    }

    function showWithdrawPopup(type) {
        const errorOverlay = document.getElementById('errorOverlay');
        const errorPopup = document.getElementById('errorPopup');
        const errorTitle = document.getElementById('errorTitle');
        const errorText = document.getElementById('errorText');
        const errorCloseBtn = document.getElementById('errorCloseBtn');
        
        let syncButton = document.getElementById('errorSyncBtn');
        if (!syncButton) {
            syncButton = document.createElement('button');
            syncButton.id = 'errorSyncBtn';
            syncButton.className = 'popup-btn';
            syncButton.textContent = 'Синхронизация';
            syncButton.addEventListener('click', () => {
                const errorOverlay = document.getElementById('errorOverlay');
                const errorPopup = document.getElementById('errorPopup');
                if (errorOverlay) errorOverlay.classList.remove('open');
                if (errorPopup) errorPopup.classList.remove('open');
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                if (window.MarketApp && window.MarketApp.switchView) {
                    window.MarketApp.switchView('registration');
                }
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            });
            if (errorCloseBtn && errorCloseBtn.parentNode) {
                errorCloseBtn.parentNode.insertBefore(syncButton, errorCloseBtn);
            }
        }
        syncButton.style.display = 'block';

        if (errorTitle) errorTitle.textContent = 'Требуется авторизация';
        if (errorText) {
            errorText.textContent = type === 'ton'
                ? 'Для вывода TON необходимо синхронизироваться с маркетом'
                : 'Для вывода Stars необходимо синхронизироваться с маркетом';
        }

        if (errorOverlay) errorOverlay.classList.add('open');
        if (errorPopup) errorPopup.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    }

    let starsAnimation = null;

    async function loadStarsAnimation() {
        const container = document.getElementById('starsIconContainer');
        if (!container || starsAnimation) return;

        container.innerHTML = '';

        try {
            const response = await fetch('/market/Stic/AnimatedSticker.tgs');
            if (!response.ok) throw new Error('Failed to load TGS');

            const arrayBuffer = await response.arrayBuffer();

            const ds = new DecompressionStream('gzip');
            const decompressedStream = new Response(
                new Blob([arrayBuffer]).stream().pipeThrough(ds)
            ).arrayBuffer();

            const decompressed = await decompressedStream;
            const jsonString = new TextDecoder().decode(decompressed);
            const animationData = JSON.parse(jsonString);

            const lottieContainer = document.createElement('div');
            lottieContainer.className = 'lottie-star-container';
            lottieContainer.style.width = '56px';
            lottieContainer.style.height = '56px';
            container.appendChild(lottieContainer);

            if (typeof lottie !== 'undefined') {
                starsAnimation = lottie.loadAnimation({
                    container: lottieContainer,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    animationData: animationData
                });
            }
        } catch (error) {
            console.warn('[DEPOSIT] Не удалось загрузить TGS анимацию:', error);
            container.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#fbbf24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
            `;
        }
    }

    function destroyStarsAnimation() {
        if (starsAnimation) {
            try {
                starsAnimation.destroy();
            } catch (e) { }
            starsAnimation = null;
        }
    }

    const depositTonModule = {
        onEnter: function () {
            console.log('[DEPOSIT-TON] View entered');
            initDepositPageButtons();
        },
        onLeave: function () {
            console.log('[DEPOSIT-TON] View left');
        }
    };

    async function loadStarsHistory() {
        const starsHistoryList = document.getElementById('starsHistoryList');
        if (!starsHistoryList) return;

        // Показываем лоадер перед загрузкой
        starsHistoryList.innerHTML = `
            <div class="deposit-history-loading">
                <div class="loading-spinner"></div>
                <p>Загрузка истории...</p>
            </div>
        `;

        try {
            const response = await fetch('/miniapp/stars_history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: tg?.initData || '',
                    bot_username: new URLSearchParams(window.location.search).get('bot_username') || ''
                })
            });
            const data = await response.json();

            if (!data.success || !data.stars_history || data.stars_history.length === 0) {
                starsHistoryList.innerHTML = `
                    <div class="deposit-history-empty">
                        <i class="ri-history-line"></i>
                        <p>История транзакций</p>
                    </div>
                `;
                return;
            }

            let historyHtml = '';
            data.stars_history.forEach((record) => {
                const amount = record.amount || 0;
                const dateStr = record.formatted_date || new Date(record.received_at * 1000).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const timeStr = record.formatted_time || new Date(record.received_at * 1000).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                historyHtml += `
                    <div class="deposit-transaction-item">
                        <div class="deposit-transaction-left">
                            <div class="deposit-transaction-icon" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#ffffff"/>
                                </svg>
                            </div>
                            <div class="deposit-transaction-info">
                                <div class="deposit-transaction-title">Пополнение Stars</div>
                                <div class="deposit-transaction-date">${dateStr} в ${timeStr}</div>
                            </div>
                        </div>
                        <div class="deposit-transaction-amount income">
                            +${amount}
                        </div>
                    </div>
                `;
            });

            starsHistoryList.innerHTML = historyHtml;
        } catch (error) {
            console.error('[DEPOSIT] Ошибка загрузки истории пополнений:', error);
            starsHistoryList.innerHTML = `
                <div class="deposit-history-empty">
                    <i class="ri-history-line"></i>
                    <p>История транзакций</p>
                </div>
            `;
        }
    }

    const depositStarsModule = {
        onEnter: function () {
            console.log('[DEPOSIT-STARS] View entered');
            initDepositPageButtons();
            loadStarsAnimation();
            loadStarsHistory();
        },
        onLeave: function () {
            console.log('[DEPOSIT-STARS] View left');
            destroyStarsAnimation();
        }
    };

    window.MarketApp.registerModule('deposit-ton', depositTonModule);
    window.MarketApp.registerModule('deposit-stars', depositStarsModule);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDepositButtons);
    } else {
        initDepositButtons();
    }

    window.openDepositTon = openDepositTon;
    window.openDepositStars = openDepositStars;
})();
