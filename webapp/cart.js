(function () {
    'use strict';

    if (!window.MarketApp) {
        console.error('[CART] MarketApp not initialized');
        return;
    }

    const tg = window.MarketApp.tg;
    let cart = JSON.parse(localStorage.getItem('market_cart') || '[]');
    let previousView = 'market';

    function saveCart() {
        localStorage.setItem('market_cart', JSON.stringify(cart));
        updateCartUI();
    }

    function addToCart(item) {
        const existingIndex = cart.findIndex(i => i.link === item.link);
        if (existingIndex === -1) {
            cart.push(item);
            saveCart();
            showCartNotification();
            return true;
        }
        return false;
    }

    function removeFromCart(link) {
        const index = cart.findIndex(i => i.link === link);
        if (index !== -1) {
            cart.splice(index, 1);
            saveCart();
            updateCartNotification();
            return true;
        }
        return false;
    }

    function isInCart(link) {
        return cart.some(i => i.link === link);
    }

    function getTotalPrice() {
        return cart.reduce((sum, item) => sum + (item.price || 0), 0);
    }

    function getReward() {
        return Math.floor(getTotalPrice() * 100);
    }

    function getCashback() {
        return 0;
    }

    function showCartNotification() {
        const notification = document.getElementById('cartNotification');
        if (notification && cart.length > 0) {
            notification.classList.add('show');
            updateCartNotification();
        }
    }

    function updateCartNotification() {
        const notification = document.getElementById('cartNotification');
        const priceEl = document.getElementById('cartNotificationPrice');
        const countEl = document.getElementById('cartNotificationCount');

        if (cart.length === 0) {
            if (notification) notification.classList.remove('show');
            return;
        }

        const total = getTotalPrice();
        const count = cart.length;
        const countText = count === 1 ? '1 подарок' : `${count} подарков`;

        if (priceEl) priceEl.textContent = `${total.toFixed(2)} TON`;
        if (countEl) countEl.textContent = countText;
    }

    function openCart() {
        const overlay = document.getElementById('drawerOverlay');
        const cartDrawer = document.getElementById('cartDrawer');
        
        if (!cartDrawer || !overlay) return;

        hideCartNotification();
        renderCartItems();
        updateCartSummary();

        overlay.classList.add('open');
        cartDrawer.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    }

    function closeCart() {
        const overlay = document.getElementById('drawerOverlay');
        const cartDrawer = document.getElementById('cartDrawer');
        
        if (!cartDrawer || !overlay) return;

        overlay.classList.remove('open');
        cartDrawer.classList.remove('open');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';

        if (cart.length > 0) {
            showCartNotification();
        }

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    function hideCartNotification() {
        const notification = document.getElementById('cartNotification');
        if (notification) {
            notification.classList.remove('show');
        }
    }

    function updateCartUI() {
        updateCartNotification();
        renderCartItems();
        updateCartSummary();
    }

    function renderCartItems() {
        const container = document.getElementById('cartItemsList');
        if (!container) return;

        container.innerHTML = '';

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="cart-empty">
                    <p>Корзина пуста</p>
                </div>
            `;
            return;
        }

        cart.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `
                <div class="cart-item-left">
                    <img src="${item.previewUrl}" alt="${item.name}" class="cart-item-img">
                    <span class="cart-item-name">${item.name}</span>
                </div>
                <div class="cart-item-right">
                    <div class="cart-item-price">${item.price.toFixed(2)} TON</div>
                    <button class="cart-item-remove" data-link="${item.link}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" />
                            <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" />
                        </svg>
                    </button>
                </div>
            `;

            const removeBtn = itemEl.querySelector('.cart-item-remove');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeFromCart(item.link);
                    updateCartButtonState(item.link, false);
                    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                });
            }

            container.appendChild(itemEl);
        });
    }

    function updateCartSummary() {
        const payAmountEl = document.getElementById('cartPayAmount');

        if (payAmountEl) payAmountEl.textContent = `${getTotalPrice().toFixed(2)} TON`;
    }

    function updateCartButtonState(link, inCart) {
        const cards = document.querySelectorAll('.nft-card');
        cards.forEach(card => {
            if (card.dataset.giftLink === link) {
                const cartBtn = card.querySelector('.nft-card-cart-btn');
                if (cartBtn) {
                    if (inCart) {
                        cartBtn.classList.add('in-cart');
                        cartBtn.innerHTML = `
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12L10 17L19 7" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        `;
                    } else {
                        cartBtn.classList.remove('in-cart');
                        cartBtn.innerHTML = `
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        `;
                    }
                }
            }
        });
    }

    function initCartDrawer() {
        const overlay = document.getElementById('drawerOverlay');
        const cartDrawer = document.getElementById('cartDrawer');
        const cartCloseBtn = document.getElementById('cartCloseBtn');
        const payBtn = document.getElementById('cartPayBtn');

        if (!cartDrawer || !overlay) return;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && cartDrawer.classList.contains('open')) {
                closeCart();
            }
        });

        if (cartCloseBtn) {
            cartCloseBtn.addEventListener('click', closeCart);
        }

        if (payBtn) {
            payBtn.addEventListener('click', async () => {
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                
                if (cart.length === 0) {
                    return;
                }

                const botUsername = new URLSearchParams(window.location.search).get('bot_username') || '';
                const initData = tg?.initData || '';
                
                if (!initData) {
                    const errorOverlay = document.getElementById('errorOverlay');
                    const errorPopup = document.getElementById('errorPopup');
                    const errorTitle = document.getElementById('errorTitle');
                    const errorText = document.getElementById('errorText');
                    if (errorTitle) errorTitle.textContent = 'Ошибка';
                    if (errorText) errorText.textContent = 'Отсутствуют данные авторизации';
                    if (errorOverlay) errorOverlay.classList.add('open');
                    if (errorPopup) errorPopup.classList.add('open');
                    return;
                }

                payBtn.disabled = true;
                payBtn.textContent = 'Обработка...';

                const totalPrice = getTotalPrice();
                const currentBalance = window.MarketApp?.tonBalance || 0;

                if (currentBalance < totalPrice) {
                    payBtn.disabled = false;
                    payBtn.textContent = 'Оплатить';
                    const errorOverlay = document.getElementById('errorOverlay');
                    const errorPopup = document.getElementById('errorPopup');
                    const errorTitle = document.getElementById('errorTitle');
                    const errorText = document.getElementById('errorText');
                    if (errorTitle) errorTitle.textContent = 'Недостаточно средств';
                    if (errorText) errorText.textContent = `Не хватает ${(totalPrice - currentBalance).toFixed(2)} TON`;
                    if (errorOverlay) errorOverlay.classList.add('open');
                    if (errorPopup) errorPopup.classList.add('open');
                    return;
                }

                let successCount = 0;
                let failedItems = [];

                for (const item of cart) {
                    try {
                        const response = await fetch('/miniapp/buy_gift', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                initData: initData,
                                bot_username: botUsername,
                                gift_link: item.link,
                                price: item.price
                            })
                        });

                        const data = await response.json();

                        if (data.success) {
                            successCount++;
                            if (data.new_balance !== undefined && window.MarketApp?.setTonBalance) {
                                window.MarketApp.setTonBalance(data.new_balance);
                            }
                            if (data.market_won_nfts && window.MarketApp) {
                                window.MarketApp.marketWonNfts = data.market_won_nfts;
                            }
                        } else {
                            failedItems.push({ link: item.link, error: data.error || 'Ошибка покупки' });
                        }
                    } catch (error) {
                        console.error('[CART] Ошибка покупки:', error);
                        failedItems.push({ link: item.link, error: 'Ошибка сети' });
                    }
                }

                if (successCount > 0) {
                    const totalItems = cart.length;
                    cart = [];
                    saveCart();
                    closeCart();

                    const updateNavBadge = (count) => {
                        const badge = document.getElementById('myGiftsNavBadge');
                        if (!badge) return;
                        const total = count || 0;
                        if (total > 0) {
                            badge.textContent = total > 99 ? '99+' : total.toString();
                            badge.classList.remove('hidden');
                        } else {
                            badge.classList.add('hidden');
                        }
                    };

                    if (window.MarketApp && typeof window.MarketApp.fetchBalances === 'function') {
                        await window.MarketApp.fetchBalances();
                        
                        const nftCount = window.MarketApp?.marketWonNfts?.length || 0;
                        if (nftCount > 0) {
                            updateNavBadge(nftCount);
                        }
                    }

                    const myGiftsModule = window.MarketApp?.modules?.['my-gifts'];
                    if (myGiftsModule && typeof myGiftsModule.refresh === 'function') {
                        await myGiftsModule.refresh();
                        
                        const nftCount = window.MarketApp?.marketWonNfts?.length || 0;
                        if (nftCount > 0) {
                            updateNavBadge(nftCount);
                        }
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

                    if (failedItems.length > 0) {
                        showTopToast(`Куплено ${successCount} из ${totalItems} подарков`);
                    } else {
                        showTopToast('Покупка прошла успешно!');
                    }

                    if (tg?.HapticFeedback) {
                        tg.HapticFeedback.notificationOccurred('success');
                    }
                } else {
                    payBtn.disabled = false;
                    payBtn.textContent = 'Оплатить';
                    const errorOverlay = document.getElementById('errorOverlay');
                    const errorPopup = document.getElementById('errorPopup');
                    const errorTitle = document.getElementById('errorTitle');
                    const errorText = document.getElementById('errorText');
                    if (errorTitle) errorTitle.textContent = 'Ошибка покупки';
                    if (errorText) errorText.textContent = failedItems.length > 0 
                        ? failedItems[0].error 
                        : 'Не удалось купить подарки';
                    if (errorOverlay) errorOverlay.classList.add('open');
                    if (errorPopup) errorPopup.classList.add('open');
                }
            });
        }

        let startY = 0;
        let isDragging = false;

        cartDrawer.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
            cartDrawer.style.transition = 'none';
        }, { passive: true });

        cartDrawer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                if (e.cancelable) e.preventDefault();
                cartDrawer.style.transform = `translateY(${diff}px)`;
            }
        }, { passive: false });

        cartDrawer.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            cartDrawer.style.transition = 'transform 0.3s cubic-bezier(0.19, 1, 0.22, 1)';
            const currentY = e.changedTouches[0].clientY;
            const diff = currentY - startY;
            if (diff > 100) {
                closeCart();
            } else {
                cartDrawer.style.transform = '';
            }
        }, { passive: true });
    }

    function initCartNotification() {
        const notification = document.getElementById('cartNotification');
        if (notification) {
            notification.addEventListener('click', () => {
                openCart();
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initCartNotification();
            initCartDrawer();
            updateCartUI();
        });
    } else {
        initCartNotification();
        initCartDrawer();
        updateCartUI();
    }

    window.CartManager = {
        addToCart: addToCart,
        removeFromCart: removeFromCart,
        isInCart: isInCart,
        getCart: () => [...cart],
        getTotalPrice: getTotalPrice,
        updateCartButtonState: updateCartButtonState,
        updateCartUI: updateCartUI,
        hideCartNotification: hideCartNotification,
        showCartNotification: showCartNotification,
        openCart: openCart,
        closeCart: closeCart
    };
})();

