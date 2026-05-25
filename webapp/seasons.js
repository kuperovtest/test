(function () {
    'use strict';

    if (!window.MarketApp) {
        console.error('[SEASONS] MarketApp not initialized');
        return;
    }

    const tg = window.MarketApp.tg;
    let rocketAnimation = null;
    let starAnimations = [];
    let getButtonsInitialized = false;

    async function loadRocketAnimation() {
        const container = document.getElementById('seasonsRocketContainer');
        if (!container || rocketAnimation) return;

        container.innerHTML = '';

        try {
            const response = await fetch('/market/Stic/rocet.tgs');
            if (!response.ok) throw new Error('Failed to load rocket TGS');

            const arrayBuffer = await response.arrayBuffer();

            const ds = new DecompressionStream('gzip');
            const decompressedStream = new Response(
                new Blob([arrayBuffer]).stream().pipeThrough(ds)
            ).arrayBuffer();

            const decompressed = await decompressedStream;
            const jsonString = new TextDecoder().decode(decompressed);
            const animationData = JSON.parse(jsonString);

            if (typeof lottie !== 'undefined') {
                rocketAnimation = lottie.loadAnimation({
                    container: container,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    animationData: animationData
                });
            }
        } catch (error) {
            console.error('[SEASONS] Ошибка загрузки анимации ракеты:', error);
            container.innerHTML = `<div style="font-size: 64px;">🚀</div>`;
        }
    }

    async function loadStarAnimations() {
        const containers = document.querySelectorAll('.seasons-star-lottie');
        if (containers.length === 0) return;

        destroyStarAnimations();

        try {
            const response = await fetch('/market/Stic/AnimatedSticker.tgs');
            if (!response.ok) throw new Error('Failed to load star TGS');

            const arrayBuffer = await response.arrayBuffer();
            const ds = new DecompressionStream('gzip');
            const decompressedStream = new Response(
                new Blob([arrayBuffer]).stream().pipeThrough(ds)
            ).arrayBuffer();
            const decompressed = await decompressedStream;
            const jsonString = new TextDecoder().decode(decompressed);
            const animationData = JSON.parse(jsonString);

            containers.forEach(container => {
                if (typeof lottie !== 'undefined') {
                    const anim = lottie.loadAnimation({
                        container: container,
                        renderer: 'svg',
                        loop: true,
                        autoplay: true,
                        animationData: animationData
                    });
                    starAnimations.push(anim);
                }
            });

        } catch (error) {
            console.error('[SEASONS] Ошибка загрузки анимаций звезд:', error);
        }
    }

    function destroyRocketAnimation() {
        if (rocketAnimation) {
            try {
                rocketAnimation.destroy();
            } catch (e) { }
            rocketAnimation = null;
        }
    }

    function destroyStarAnimations() {
        starAnimations.forEach(anim => {
            try {
                anim.destroy();
            } catch (e) { }
        });
        starAnimations = [];
    }

    function initTabs() {
        const tabs = document.querySelectorAll('.seasons-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                if (tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('light');
                }
            });
        });
    }

    function openErrorPopup(title = 'Ошибка', message = '', showSyncButton = false) {
        const errorOverlay = document.getElementById('errorOverlay');
        const errorPopup = document.getElementById('errorPopup');
        const errorTitle = document.getElementById('errorTitle');
        const errorText = document.getElementById('errorText');
        const errorCloseBtn = document.getElementById('errorCloseBtn');
        let syncButton = document.getElementById('errorSyncBtn');
        
        if (errorTitle) errorTitle.textContent = title;
        if (errorText) errorText.textContent = message;
        
        if (showSyncButton) {
            if (!syncButton) {
                syncButton = document.createElement('button');
                syncButton.id = 'errorSyncBtn';
                syncButton.className = 'popup-btn';
                syncButton.textContent = 'Синхронизация';
                syncButton.addEventListener('click', () => {
                    closeErrorPopup();
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
        } else {
            if (syncButton) {
                syncButton.style.display = 'none';
            }
        }
        
        if (errorOverlay) errorOverlay.classList.add('open');
        if (errorPopup) errorPopup.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    }

    function closeErrorPopup() {
        const errorOverlay = document.getElementById('errorOverlay');
        const errorPopup = document.getElementById('errorPopup');
        if (errorOverlay) errorOverlay.classList.remove('open');
        if (errorPopup) errorPopup.classList.remove('open');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    }

    function initGetButtons() {
        if (getButtonsInitialized) return;
        getButtonsInitialized = true;

        const getButtons = document.querySelectorAll('.seasons-task-btn');
        
        getButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (tg?.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('medium');
                }
                
                openErrorPopup(
                    'Ошибка',
                    'Для получения награды необходимо синхронизировать аккаунт с маркетом',
                    true
                );
            });
        });

    }

    const seasonsModule = {
        onEnter: function () {
            console.log('[SEASONS] View entered');
            loadRocketAnimation();
            loadStarAnimations();
            initGetButtons();

            const firstTab = document.querySelector('.seasons-tab');
            if (firstTab && !firstTab.classList.contains('active')) {
                const tabs = document.querySelectorAll('.seasons-tab');
                tabs.forEach(t => t.classList.remove('active'));
                firstTab.classList.add('active');
            }
        },
        onLeave: function () {
            console.log('[SEASONS] View left');
            destroyRocketAnimation();
            destroyStarAnimations();
            closeErrorPopup();
        }
    };

    window.MarketApp.registerModule('seasons', seasonsModule);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTabs);
    } else {
        initTabs();
    }
})();
