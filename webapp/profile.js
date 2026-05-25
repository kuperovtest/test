(function() {
    'use strict';
    
    if (!window.MarketApp) {
        console.error('[PROFILE] MarketApp not initialized');
        return;
    }
    
    const tg = window.Telegram?.WebApp;
    const avatarEl = document.getElementById('profileAvatar');
    const nameEl = document.getElementById('profileName');
    const statsEls = {
        volume: document.getElementById('profileVolumeValue'),
        bought: document.getElementById('profileBoughtValue'),
        sold: document.getElementById('profileSoldValue'),
    };
    const referralInviteBtn = document.getElementById('referralInviteBtn');
    const registerBtn = document.getElementById('profileRegisterBtn');
    const historyBtn = document.getElementById('profileHistoryBtn');
    let referralInited = false;
    let registrationInited = false;
    let historyInited = false;

    function getUserData() {
        const user = tg?.initDataUnsafe?.user || {};
        const first = user.first_name || '';
        const last = user.last_name || '';
        const username = user.username ? `@${user.username}` : '';
        const name = (first || last) ? `${first} ${last}`.trim() : (username || 'Пользователь');
        return {
            name,
            photoUrl: user.photo_url || ''
        };
    }

    function renderProfile() {
        if (!avatarEl || !nameEl) return;
        const { name, photoUrl } = getUserData();
        nameEl.textContent = name;
        avatarEl.classList.remove('has-image');
        avatarEl.style.backgroundImage = '';
        avatarEl.textContent = '';

        if (photoUrl && photoUrl.trim()) {
            avatarEl.style.backgroundImage = `url(${photoUrl})`;
            avatarEl.classList.add('has-image');
        } else {
            const initials = name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
            avatarEl.textContent = initials || 'U';
        }
    }

    function formatNumber(num) {
        if (num < 1000) {
            const str = num.toString();
            if (str.length > 4) {
                return str.slice(0, 4);
            }
            return str;
        }
        const thousands = Math.floor(num / 1000);
        if (thousands > 999) {
            return '999к';
        }
        return `${thousands}к`;
    }

    async function loadProfileStats() {
        try {
            const tg = window.Telegram?.WebApp;
            const botUsername = new URLSearchParams(window.location.search).get('bot_username') || '';
            
            const response = await fetch('/miniapp/profile_stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: tg?.initData || '',
                    bot_username: botUsername
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.MarketApp.profileStats = {
                    volume: data.total_volume || 0,
                    bought: data.total_bought || 0,
                    sold: data.total_sold || 0
                };
                window.MarketApp.syncButtonText = data.sync_button_text || "Синхронизация";
            } else {
                window.MarketApp.profileStats = {
                    volume: 0,
                    bought: 0,
                    sold: 0
                };
                window.MarketApp.syncButtonText = "Синхронизация";
            }
        } catch (error) {
            console.error('[PROFILE] Ошибка загрузки статистики:', error);
            window.MarketApp.profileStats = {
                volume: 0,
                bought: 0,
                sold: 0
            };
            window.MarketApp.syncButtonText = "Синхронизация";
        }
    }

    function renderStats() {
        const volume = window.MarketApp?.profileStats?.volume ?? 0;
        const bought = window.MarketApp?.profileStats?.bought ?? 0;
        const sold = window.MarketApp?.profileStats?.sold ?? 0;

        if (statsEls.volume) statsEls.volume.textContent = formatNumber(volume);
        if (statsEls.bought) statsEls.bought.textContent = formatNumber(bought);
        if (statsEls.sold) statsEls.sold.textContent = formatNumber(sold);
    }
    
    function renderSyncButton() {
        const syncButtonText = window.MarketApp?.syncButtonText || "Синхронизация";
        if (registerBtn) {
            registerBtn.textContent = syncButtonText;
        }
    }
    
    function updateProfileData() {
        renderStats();
        renderSyncButton();
    }

    function initReferralInvite() {
        if (referralInited || !referralInviteBtn) return;
        referralInited = true;

        const tgWebApp = window.Telegram?.WebApp;
        const userData = tgWebApp?.initDataUnsafe?.user || null;
        const botUsername = new URLSearchParams(window.location.search).get('bot_username') || '';

        referralInviteBtn.addEventListener('click', () => {
            if (tgWebApp?.HapticFeedback) {
                tgWebApp.HapticFeedback.impactOccurred('light');
            }

            if (!botUsername) {
                const msg = 'Не удалось сформировать ссылку.';
                if (tgWebApp?.showAlert) {
                    tgWebApp.showAlert(msg);
                } else {
                    alert(msg);
                }
                return;
            }

            const uid = userData?.id || '';
            const startParam = uid ? `ref_${uid}` : 'ref_friend';
            const link = `https://t.me/${botUsername}?start=${startParam}`;
            const shareText = '🎁 Присоединяйся в маркет подарков и получай бонусы!';
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;

            if (tgWebApp?.openTelegramLink) {
                tgWebApp.openTelegramLink(shareUrl);
            } else {
                window.open(shareUrl, '_blank');
            }
        });
    }

    function openRegistration() {
        window.MarketApp.switchView('registration');

        if (tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    }

    function initRegistration() {
        if (registrationInited) return;
        registrationInited = true;
        if (!registerBtn) return;
        registerBtn.addEventListener('click', openRegistration, { passive: true });
    }
    
    function openHistoryModal() {
        const errorOverlay = document.getElementById('errorOverlay');
        const errorPopup = document.getElementById('errorPopup');
        const errorTitle = document.getElementById('errorTitle');
        const errorText = document.getElementById('errorText');
        const errorCloseBtn = document.getElementById('errorCloseBtn');
        
        if (!errorOverlay || !errorPopup) return;
        
        if (errorTitle) errorTitle.textContent = 'Ошибка';
        if (errorText) errorText.textContent = 'Для просмотра истории транзакций необходимо синхронизировать аккаунт с маркетом';
        
        let syncButton = document.getElementById('errorSyncBtn');
        if (!syncButton) {
            syncButton = document.createElement('button');
            syncButton.id = 'errorSyncBtn';
            syncButton.className = 'popup-btn popup-btn-primary';
            syncButton.textContent = 'Синхронизировать';
            syncButton.addEventListener('click', () => {
                closeHistoryModal();
                if (window.MarketApp && window.MarketApp.switchView) {
                    window.MarketApp.switchView('registration');
                }
                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            });
            if (errorCloseBtn && errorCloseBtn.parentNode) {
                errorCloseBtn.parentNode.insertBefore(syncButton, errorCloseBtn);
            }
        }
        syncButton.style.display = 'block';
        
        errorOverlay.classList.add('open');
        errorPopup.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    }
    
    function closeHistoryModal() {
        const errorOverlay = document.getElementById('errorOverlay');
        const errorPopup = document.getElementById('errorPopup');
        if (errorOverlay) errorOverlay.classList.remove('open');
        if (errorPopup) errorPopup.classList.remove('open');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        
        const syncButton = document.getElementById('errorSyncBtn');
        if (syncButton) syncButton.style.display = 'none';
        
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }
    
    function initHistory() {
        if (historyInited || !historyBtn) return;
        historyInited = true;
        
        historyBtn.addEventListener('click', () => {
            openHistoryModal();
        }, { passive: true });
        
        const errorOverlay = document.getElementById('errorOverlay');
        const errorCloseBtn = document.getElementById('errorCloseBtn');
        
        if (errorOverlay) {
            errorOverlay.addEventListener('click', (e) => {
                if (e.target === errorOverlay) {
                    closeHistoryModal();
                }
            });
        }
        
        if (errorCloseBtn) {
            const originalHandler = errorCloseBtn.onclick;
            errorCloseBtn.addEventListener('click', () => {
                closeHistoryModal();
            });
        }
    }
    
    const profileModule = {
        onEnter: async function() {
            renderProfile();
            if (!window.MarketApp.profileStats || !window.MarketApp.syncButtonText) {
                await loadProfileStats();
            }
            updateProfileData();
            initReferralInvite();
            initRegistration();
            initHistory();
        },
        onLeave: function() {
            console.log('[PROFILE] View left');
        }
    };
    
    window.MarketApp.registerModule('profile', profileModule);
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await loadProfileStats();
        });
    } else {
        loadProfileStats();
    }
})();

