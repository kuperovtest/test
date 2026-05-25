(function () {
    'use strict';

    if (!window.MarketApp) {
        console.error('[MARKET] MarketApp not initialized');
        return;
    }

    const tg = window.MarketApp.tg;
    let cleanupFn = null;

    function initBannersCarousel() {
        const wrapper = document.getElementById('bannersWrapper');
        if (!wrapper) return null;

        const items = wrapper.querySelectorAll('.banner-item');
        if (items.length === 0) return null;

        let isAnimating = false;
        let animationFrameId = null;
        let isDragging = false;
        let startX = 0;
        let scrollLeft = 0;
        let scrollTimeout = null;
        let touchStartX = 0;
        let touchScrollLeft = 0;
        let itemWidth = 0;
        let gap = 12;
        let autoScrollInterval = null;
        let isAutoScrollPaused = false;
        let autoScrollPauseTimeout = null;
        let resizeObserver = null;
        let intersectionObserver = null;
        let isVisible = true;
        const AUTO_SCROLL_DELAY = 5000;
        const AUTO_SCROLL_RESUME_DELAY = 3000;

        function updateItemWidth() {
            if (items.length > 0) {
                itemWidth = items[0].offsetWidth + gap;
            }
        }

        updateItemWidth();
        resizeObserver = new ResizeObserver(() => {
            updateItemWidth();
        });
        if (items[0]) {
            resizeObserver.observe(items[0]);
        }

        intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (!isVisible) {
                    stopAutoScroll();
                } else if (!isAutoScrollPaused) {
                    startAutoScroll();
                }
            });
        }, { threshold: 0.1 });

        intersectionObserver.observe(wrapper);

        function snapToNearest(forceIndex = null) {
            if (isAnimating) return;

            const currentScroll = wrapper.scrollLeft;
            if (itemWidth === 0) {
                updateItemWidth();
                if (itemWidth === 0) return;
            }

            let currentIndex;
            if (forceIndex !== null) {
                currentIndex = forceIndex;
            } else {
                currentIndex = Math.round(currentScroll / itemWidth);
            }

            const maxIndex = items.length - 1;
            currentIndex = Math.max(0, Math.min(currentIndex, maxIndex));

            const targetScroll = currentIndex * itemWidth;

            const distance = Math.abs(targetScroll - currentScroll);
            if (distance < 1 && forceIndex === null) return;

            isAnimating = true;
            const startScroll = currentScroll;
            const startTime = performance.now();
            const duration = Math.min(400, Math.max(200, distance * 0.5));

            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                wrapper.scrollLeft = startScroll + (targetScroll - startScroll) * easeProgress;

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    isAnimating = false;
                    animationFrameId = null;
                }
            }

            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            animationFrameId = requestAnimationFrame(animate);
        }

        function getCurrentIndex() {
            if (itemWidth === 0) {
                updateItemWidth();
                if (itemWidth === 0) return 0;
            }
            return Math.round(wrapper.scrollLeft / itemWidth);
        }

        function goToNextBanner() {
            if (isDragging || isAnimating || isAutoScrollPaused || !isVisible) return;

            const currentIndex = getCurrentIndex();
            const nextIndex = (currentIndex + 1) % items.length;
            snapToNearest(nextIndex);
        }

        function startAutoScroll() {
            stopAutoScroll();
            autoScrollInterval = setInterval(() => {
                goToNextBanner();
            }, AUTO_SCROLL_DELAY);
        }

        function stopAutoScroll() {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
            }
        }

        function pauseAutoScroll() {
            isAutoScrollPaused = true;
            stopAutoScroll();

            if (autoScrollPauseTimeout) {
                clearTimeout(autoScrollPauseTimeout);
            }

            autoScrollPauseTimeout = setTimeout(() => {
                isAutoScrollPaused = false;
                startAutoScroll();
            }, AUTO_SCROLL_RESUME_DELAY);
        }

        function cancelSnap() {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
                scrollTimeout = null;
            }
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
                isAnimating = false;
            }
        }

        function handleUserInteraction() {
            pauseAutoScroll();
        }

        function handleMouseDown(e) {
            cancelSnap();
            handleUserInteraction();
            isDragging = true;
            startX = e.pageX - wrapper.offsetLeft;
            scrollLeft = wrapper.scrollLeft;
            wrapper.style.cursor = 'grabbing';
            wrapper.style.userSelect = 'none';
        }

        function handleMouseUp() {
            if (isDragging) {
                isDragging = false;
                wrapper.style.cursor = 'grab';
                wrapper.style.userSelect = '';
                setTimeout(() => snapToNearest(), 50);
            }
        }

        function handleMouseMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            handleUserInteraction();
            const x = e.pageX - wrapper.offsetLeft;
            const walk = (x - startX) * 2;
            wrapper.scrollLeft = scrollLeft - walk;
        }

        function handleTouchStart(e) {
            cancelSnap();
            handleUserInteraction();
            touchStartX = e.touches[0].pageX - wrapper.offsetLeft;
            touchScrollLeft = wrapper.scrollLeft;
        }

        function handleTouchEnd() {
            setTimeout(() => snapToNearest(), 100);
        }

        function handleTouchMove(e) {
            handleUserInteraction();
            const x = e.touches[0].pageX - wrapper.offsetLeft;
            const walk = (x - touchStartX) * 2;
            wrapper.scrollLeft = touchScrollLeft - walk;
        }

        function handleScroll() {
            if (isDragging || isAnimating) return;

            handleUserInteraction();

            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }

            scrollTimeout = setTimeout(() => {
                snapToNearest();
            }, 200);
        }

        wrapper.addEventListener('mousedown', handleMouseDown, { passive: false });
        wrapper.addEventListener('mouseleave', handleMouseUp, { passive: true });
        wrapper.addEventListener('mouseup', handleMouseUp, { passive: true });
        wrapper.addEventListener('mousemove', handleMouseMove, { passive: false });
        wrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
        wrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
        wrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
        wrapper.addEventListener('scroll', handleScroll, { passive: true });

        wrapper.style.cursor = 'grab';
        wrapper.style.willChange = 'scroll-position';

        function cleanup() {
            stopAutoScroll();
            cancelSnap();
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (intersectionObserver) {
                intersectionObserver.disconnect();
            }
            if (autoScrollPauseTimeout) {
                clearTimeout(autoScrollPauseTimeout);
            }
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        }

        const visibilityHandler = () => {
            if (document.hidden) {
                stopAutoScroll();
            } else {
                if (!isAutoScrollPaused && isVisible) {
                    startAutoScroll();
                }
            }
        };

        document.addEventListener('visibilitychange', visibilityHandler);

        if (isVisible) {
            startAutoScroll();
        }

        return cleanup;
    }

    let filtersInitialized = false;
    let filterTabHandlers = new Map();
    let filterBtnHandlers = new Map();

    function initFilters() {
        const filterTabs = document.querySelectorAll('.filter-tab');
        const filterBtns = document.querySelectorAll('.filter-btn');
        const nftGrid = document.getElementById('nftCardsGrid');
        const bundlesGrid = document.getElementById('bundlesGrid');
        const collectionBtn = document.querySelector('[data-filter-type="collection"]');

        filterTabs.forEach(tab => {
            if (filterTabHandlers.has(tab)) {
                tab.removeEventListener('click', filterTabHandlers.get(tab));
            }
            
            const handler = () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                if (tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('light');
                }

                const filterType = tab.dataset.filter;
                console.log('[MARKET] Filter tab:', filterType);

                if (filterType === 'bundles') {
                    nftGrid.classList.add('hidden');
                    bundlesGrid.classList.remove('hidden');
                    if (collectionBtn) collectionBtn.style.display = 'none';
                    renderBundles();
                } else {
                    nftGrid.classList.remove('hidden');
                    bundlesGrid.classList.add('hidden');
                    if (collectionBtn) collectionBtn.style.display = '';

                    if (filterType === 'all') {
                        let links = window.NFT_LINKS || [];
                        if (links.length > 0 && (!window.MarketApp?.shuffledNFTLinks || window.MarketApp.shuffledNFTLinks.length !== links.length)) {
                            if (window.shuffleArray) {
                                window.MarketApp.shuffledNFTLinks = window.shuffleArray(links);
                            } else {
                                window.MarketApp.shuffledNFTLinks = [...links].sort(() => Math.random() - 0.5);
                            }
                        }
                        const shuffledLinks = window.MarketApp?.shuffledNFTLinks || links;
                        renderNFTCards('nftCardsGrid', shuffledLinks);
                    } else if (filterType === 'collections') {
                        let links = window.NFT_LINKS || [];
                        if (links.length > 0 && (!window.MarketApp?.shuffledNFTLinks || window.MarketApp.shuffledNFTLinks.length !== links.length)) {
                            if (window.shuffleArray) {
                                window.MarketApp.shuffledNFTLinks = window.shuffleArray(links);
                            } else {
                                window.MarketApp.shuffledNFTLinks = [...links].sort(() => Math.random() - 0.5);
                            }
                        }
                        const shuffledLinks = window.MarketApp?.shuffledNFTLinks || links;
                        renderNFTCards('nftCardsGrid', shuffledLinks);
                    }
                }
            };
            
            tab.addEventListener('click', handler, { passive: true });
            filterTabHandlers.set(tab, handler);
        });

        filterBtns.forEach(btn => {
            if (filterBtnHandlers.has(btn)) {
                btn.removeEventListener('click', filterBtnHandlers.get(btn));
            }
            
            const handler = () => {
                if (tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('light');
                }

                const filterType = btn.dataset.filterType;
                console.log('[MARKET] Filter button:', filterType);
            };
            
            btn.addEventListener('click', handler, { passive: true });
            filterBtnHandlers.set(btn, handler);
        });
        
        filtersInitialized = true;
    }

    function generateBundles() {
        const nftLinks = window.NFT_LINKS || [];
        if (nftLinks.length < 9) return [];

        const bundles = [];
        const bundleCount = Math.min(10, Math.floor(nftLinks.length / 7));

        for (let i = 0; i < bundleCount; i++) {
            const giftCount = Math.floor(Math.random() * 5) + 5; 
            const startIdx = Math.floor(Math.random() * (nftLinks.length - 9));
            const bundleItems = nftLinks.slice(startIdx, startIdx + 9);
            const bundlePrice = Math.floor(Math.random() * 150) + 20;

            bundles.push({
                id: 37290 + i,
                items: bundleItems,
                giftCount: giftCount,
                price: bundlePrice
            });
        }

        return bundles;
    }

    function createBundleCard(bundle, index) {
        const card = document.createElement('div');
        card.className = 'bundle-card';
        card.id = `bundle-card-${index}`;

        let previewHtml = '';
            for (let i = 0; i < 9; i++) {
                const link = bundle.items[i] || bundle.items[0];
                const parsed = parseLink(link);
                if (parsed) {
                    const nameForPreview = parsed.name.toLowerCase();
                    const previewUrl = `https://nft.fragment.com/gift/${nameForPreview}-${parsed.id}.webp`;
                    previewHtml += `<div class="bundle-preview-item"><img src="${previewUrl}" alt=""></div>`;
                } else {
                    previewHtml += `<div class="bundle-preview-item"></div>`;
                }
            }

        card.innerHTML = `
            <div class="bundle-preview-grid">
                ${previewHtml}
            </div>
            <div class="bundle-content">
                <h3 class="bundle-title">Бандл • ID ${bundle.id}</h3>
                <p class="bundle-count">Подарков: ${bundle.giftCount}</p>
            </div>
            <div class="bundle-footer">
                <button class="bundle-price-btn">
                    <svg class="ton-icon-small" width="16" height="16" viewBox="0 0 13 14" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                        <path d="M10.0758 0.5H1.94269C0.460088 0.5 -0.471834 2.10705 0.248288 3.41806L5.24678 12.0877C5.58566 12.6374 6.3905 12.6374 6.72938 12.0877L11.7279 3.41806C12.4904 2.10705 11.5584 0.5 10.0758 0.5ZM5.28914 9.46564L4.18778 7.3511L1.56145 2.65683C1.39201 2.36079 1.60381 1.98018 1.98505 1.98018H5.28914V9.46564ZM10.4571 2.65683L7.83075 7.3511L6.72938 9.46564V1.98018H10.0335C10.4147 1.98018 10.6265 2.36079 10.4571 2.65683Z"/>
                    </svg>
                    <span>${bundle.price}</span>
                </button>
            </div>
        `;

        card.addEventListener('click', () => {
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
            openBundleDrawer(bundle);
        });

        return card;
    }

    function openBundleDrawer(bundle) {
        const overlay = document.getElementById('drawerOverlay');
        const bundleDrawer = document.getElementById('bundleDrawer');
        const bundleTitle = document.getElementById('bundleTitle');
        const bundleSubtitle = document.getElementById('bundleSubtitle');
        const bundleBuyPrice = document.getElementById('bundleBuyPrice');
        const bundleItemsList = document.getElementById('bundleItemsList');

        if (!bundleDrawer || !overlay) return;

        if (bundleTitle) bundleTitle.textContent = `Бандл • ID ${bundle.id}`;
        if (bundleSubtitle) bundleSubtitle.textContent = `Подарков: ${bundle.giftCount}`;
        if (bundleBuyPrice) bundleBuyPrice.textContent = `${Number(bundle.price).toFixed(2)} TON`;

        if (bundleItemsList) {
            bundleItemsList.innerHTML = '';

            bundle.items.forEach((link, idx) => {
                const parsed = parseLink(link);
                if (!parsed) return;

                const nameKey = parsed.name;
                const displayName = (window.NFT_NAMES && window.NFT_NAMES[nameKey])
                    ? window.NFT_NAMES[nameKey]
                    : formatGiftName(nameKey);
                const nameForPreview = parsed.name.toLowerCase();
                const previewUrl = `https://nft.fragment.com/gift/${nameForPreview}-${parsed.id}.webp`;

                const itemEl = document.createElement('div');
                itemEl.className = 'bundle-item';
                itemEl.innerHTML = `
                    <div class="bundle-item-left">
                        <img src="${previewUrl}" alt="${displayName}" class="bundle-item-img">
                        <div class="bundle-item-info">
                            <div class="bundle-item-name">${displayName}</div>
                            <div class="bundle-item-id">#${parsed.id}</div>
                        </div>
                    </div>
                `;
                bundleItemsList.appendChild(itemEl);
            });
        }

        overlay.classList.add('open');
        bundleDrawer.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    }

    function initBundleDrawer() {
        const overlay = document.getElementById('drawerOverlay');
        const bundleDrawer = document.getElementById('bundleDrawer');
        const bundleCloseBtn = document.getElementById('bundleCloseBtn');
        const bundleCancelBtn = document.getElementById('bundleCancelBtn');
        const bundleBuyBtn = document.getElementById('bundleBuyBtn');

        function closeBundleDrawer() {
            if (overlay) overlay.classList.remove('open');
            if (bundleDrawer) bundleDrawer.classList.remove('open');
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        }

        if (bundleCloseBtn) bundleCloseBtn.addEventListener('click', closeBundleDrawer);
        if (bundleCancelBtn) bundleCancelBtn.addEventListener('click', closeBundleDrawer);

        if (bundleBuyBtn) {
            bundleBuyBtn.addEventListener('click', () => {
                closeBundleDrawer();
                const errorOverlay = document.getElementById('errorOverlay');
                const errorPopup = document.getElementById('errorPopup');
                if (errorOverlay) errorOverlay.classList.add('open');
                if (errorPopup) errorPopup.classList.add('open');
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            });
        }

        if (bundleDrawer) {
            let startY = 0;
            let isDragging = false;

            bundleDrawer.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                isDragging = true;
                bundleDrawer.style.transition = 'none';
            }, { passive: true });

            bundleDrawer.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                const currentY = e.touches[0].clientY;
                const diff = currentY - startY;
                if (diff > 0) {
                    if (e.cancelable) e.preventDefault();
                    bundleDrawer.style.transform = `translateY(${diff}px)`;
                }
            }, { passive: false });

            bundleDrawer.addEventListener('touchend', (e) => {
                if (!isDragging) return;
                isDragging = false;
                bundleDrawer.style.transition = 'transform 0.3s cubic-bezier(0.19, 1, 0.22, 1)';
                const currentY = e.changedTouches[0].clientY;
                const diff = currentY - startY;
                if (diff > 100) {
                    closeBundleDrawer();
                } else {
                    bundleDrawer.style.transform = '';
                }
            }, { passive: true });
        }
    }

    function renderBundles() {
        const container = document.getElementById('bundlesGrid');
        if (!container) return;

        if (container.children.length > 0) return;

        const bundles = generateBundles();

        bundles.forEach((bundle, index) => {
            const card = createBundleCard(bundle, index);
            container.appendChild(card);
        });
    }

    let currentDrawerData = null;
    let isDrawerInitialized = false;

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

    function initDrawer() {
        if (isDrawerInitialized) return;
        isDrawerInitialized = true;

        const overlay = document.getElementById('drawerOverlay');
        const drawer = document.getElementById('productDrawer');
        const closeBtn = document.getElementById('drawerCloseBtn');
        const buyBtn = document.getElementById('drawerBuyBtn');
        const offerBtn = drawer.querySelector('.drawer-btn-secondary');

        const confirmDrawer = document.getElementById('confirmDrawer');
        const confirmCloseBtn = document.getElementById('confirmCloseBtn');
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');

        const offerDrawer = document.getElementById('offerDrawer');
        const offerCloseBtn = document.getElementById('offerCloseBtn');
        const sendOfferBtn = document.getElementById('sendOfferBtn');

        const collectionDrawer = document.getElementById('collectionDrawer');
        const collectionCloseBtn = document.getElementById('collectionCloseBtn');
        const collectionResetBtn = document.getElementById('collectionResetBtn');
        const collectionShowBtn = document.getElementById('collectionShowBtn');
        const collectionList = document.getElementById('collectionList');
        const collectionSearchInput = document.getElementById('collectionSearchInput');
        const collectionFilterBtn = document.querySelector('[data-filter-type="collection"]');

        let selectedCollections = new Set();
        let collectionItemsData = [];

        function parseCollectionData() {
            if (collectionItemsData.length > 0) return;
            if (!window.NFT_LINKS) return;
            const seenCollections = new Set();
            window.NFT_LINKS.forEach((link) => {
                const parsed = parseLink(link);
                if (parsed) {
                    const nameKey = parsed.name;
                    const collectionName = nameKey.toLowerCase();
                    if (seenCollections.has(collectionName)) return;
                    seenCollections.add(collectionName);
                    
                    const name = (window.NFT_NAMES && window.NFT_NAMES[nameKey]) ? window.NFT_NAMES[nameKey] : formatGiftName(nameKey);
                    const price = getPriceFromLink(link);
                    const nameForPreview = parsed.name.toLowerCase();
                    collectionItemsData.push({
                        name: name,
                        price: price,
                        previewUrl: `https://nft.fragment.com/gift/${nameForPreview}-${parsed.id}.webp`
                    });
                }
            });
            collectionItemsData.sort((a, b) => a.name.localeCompare(b.name));
        }

        function renderCollectionList(filter = '') {
            if (!collectionList) return;
            collectionList.innerHTML = '';

            const lowerFilter = filter.toLowerCase();

            collectionItemsData.forEach(item => {
                if (item.name.toLowerCase().includes(lowerFilter)) {
                    const el = document.createElement('div');
                    el.className = 'collection-item';
                    if (selectedCollections.has(item.name)) el.classList.add('selected');

                    el.innerHTML = `
                        <div class="collection-item-left">
                            <div class="collection-checkbox"></div>
                            <img src="${item.previewUrl}" class="collection-item-img">
                            <span class="collection-item-name">${item.name}</span>
                        </div>
                        <div class="collection-item-right">
                            <div class="collection-item-price">${item.price} TON</div>
                            <div class="collection-item-label">Мин. цена</div>
                        </div>
                     `;

                    el.addEventListener('click', () => {
                        if (selectedCollections.has(item.name)) {
                            selectedCollections.delete(item.name);
                            el.classList.remove('selected');
                        } else {
                            selectedCollections.add(item.name);
                            el.classList.add('selected');
                        }
                        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('selection');
                    });

                    collectionList.appendChild(el);
                }
            });
        }

        function openCollectionDrawer() {
            parseCollectionData();
            renderCollectionList((collectionSearchInput) ? collectionSearchInput.value : '');
            if (drawer) drawer.classList.remove('open');
            if (confirmDrawer) confirmDrawer.classList.remove('open');
            if (offerDrawer) offerDrawer.classList.remove('open');

            if (collectionDrawer) {
                collectionDrawer.classList.add('open');
                if (overlay) overlay.classList.add('open');
                document.body.style.overflow = 'hidden';
                document.documentElement.style.overflow = 'hidden';
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            }
        }

        const errorOverlay = document.getElementById('errorOverlay');
        const errorPopup = document.getElementById('errorPopup');
        const errorCloseBtn = document.getElementById('errorCloseBtn');
        const confirmBuyBtnFinal = document.getElementById('confirmBuyBtnFinal');

        if (!overlay || !drawer) return;

        overlay.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        function close() {
            overlay.classList.remove('open');
            drawer.classList.remove('open');
            if (confirmDrawer) confirmDrawer.classList.remove('open');
            if (offerDrawer) offerDrawer.classList.remove('open');
            if (collectionDrawer) collectionDrawer.classList.remove('open');

            if (window.giftAnimations && window.giftAnimations['drawerLottieContainer']) {
                try {
                    window.giftAnimations['drawerLottieContainer'].destroy();
                    delete window.giftAnimations['drawerLottieContainer'];
                } catch (e) { }
            }
            const lottieContainer = document.getElementById('drawerLottieContainer');
            if (lottieContainer) {
                const lottieEl = lottieContainer.querySelector('.lottie-container');
                if (lottieEl) lottieEl.remove();
            }

            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';

            drawer.style.transform = '';
            if (confirmDrawer) confirmDrawer.style.transform = '';
            if (offerDrawer) offerDrawer.style.transform = '';
            if (collectionDrawer) collectionDrawer.style.transform = '';

            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        }

        if (closeBtn) closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', close);

        if (buyBtn) {
            buyBtn.addEventListener('click', () => {
                if (currentDrawerData) {
                    openConfirmDrawer(currentDrawerData);
                }
            });
        }


        if (confirmCloseBtn) confirmCloseBtn.addEventListener('click', close);
        if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', close);

        if (offerCloseBtn) offerCloseBtn.addEventListener('click', close);
        if (sendOfferBtn) sendOfferBtn.addEventListener('click', () => {
            close();
            openErrorPopup(
                'Ошибка',
                'Для создания оффера необходимо синхронизировать аккаунт с маркетом',
                true
            );
        });

        if (collectionFilterBtn) {
            collectionFilterBtn.addEventListener('click', () => {
                openCollectionDrawer();
            });
        }

        if (collectionCloseBtn) collectionCloseBtn.addEventListener('click', close);

        if (collectionResetBtn) {
            collectionResetBtn.addEventListener('click', () => {
                selectedCollections.clear();
                const filter = collectionSearchInput ? collectionSearchInput.value : '';
                renderCollectionList(filter);
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            });
        }

        if (collectionShowBtn) {
            collectionShowBtn.addEventListener('click', () => {
                const containerId = 'nftCardsGrid';
                const container = document.getElementById(containerId);

                if (container && window.NFT_LINKS) {
                    const filteredIndices = [];
                    window.NFT_LINKS.forEach((link, i) => {
                        const parsed = parseLink(link);
                        if (!parsed) return;
                        const nameKey = parsed.name;
                        const displayName = (window.NFT_NAMES && window.NFT_NAMES[nameKey]) ? window.NFT_NAMES[nameKey] : formatGiftName(nameKey);

                        if (selectedCollections.size === 0 || selectedCollections.has(displayName)) {
                            filteredIndices.push(i);
                        }
                    });

                    const filteredLinks = filteredIndices.map(i => window.NFT_LINKS[i]);

                    container.innerHTML = '';
                    renderNFTCards(containerId, filteredLinks);
                }

                close();
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            });
        }
        if (collectionSearchInput) {
            collectionSearchInput.addEventListener('input', (e) => {
                renderCollectionList(e.target.value);
            });
        }

        const toggles = document.querySelectorAll('.offer-toggle');
        toggles.forEach(btn => {
            btn.addEventListener('click', () => {
                toggles.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            });
        });

        if (errorCloseBtn) errorCloseBtn.addEventListener('click', closeErrorPopup);
        if (errorOverlay) errorOverlay.addEventListener('click', closeErrorPopup);

        if (confirmBuyBtnFinal) {
            confirmBuyBtnFinal.addEventListener('click', async () => {
                if (!currentDrawerData) return;

                const tonBalance = Number(window.MarketApp?.tonBalance || 0);
                const price = Number(currentDrawerData.price || 0);

                if (tonBalance < price) {
                    close();
                    openErrorPopup(
                        'Недостаточно средств',
                        `Недостаточно TON для покупки. Требуется: ${price.toFixed(2)} TON, доступно: ${tonBalance.toFixed(2)} TON`,
                        false
                    );
                    return;
                }

                try {
                    const response = await fetch('/miniapp/buy_gift', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            initData: tg?.initData || '',
                            bot_username: new URLSearchParams(window.location.search).get('bot_username') || '',
                            gift_link: currentDrawerData.link,
                            price: price
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        if (window.MarketApp?.setTonBalance) {
                            window.MarketApp.setTonBalance(data.new_balance);
                        }

                        if (data.market_won_nfts && window.MarketApp) {
                            window.MarketApp.marketWonNfts = data.market_won_nfts;
                        }

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
                        
                        if (data.market_won_nfts) {
                            updateNavBadge(data.market_won_nfts.length);
                        }

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

                        close();

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
                        showTopToast('Покупка прошла успешно!');
                        if (tg?.HapticFeedback) {
                            tg.HapticFeedback.notificationOccurred('success');
                        }
                    } else {
                        close();
                        openErrorPopup(
                            'Ошибка покупки',
                            data.error || 'Не удалось купить подарок',
                            false
                        );
                    }
                } catch (error) {
                    console.error('[MARKET] Ошибка покупки подарка:', error);
                    close();
                    openErrorPopup('Ошибка покупки', 'Произошла ошибка при покупке подарка', false);
                }
            });
        }

        function enableSwipe(el) {
            let startY = 0;
            let isDragging = false;

            el.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                isDragging = true;
                el.style.transition = 'none';
            }, { passive: true });

            el.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                const currentY = e.touches[0].clientY;
                const diff = currentY - startY;

                if (diff > 0) {
                    if (e.cancelable) e.preventDefault();
                    el.style.transform = `translateY(${diff}px)`;
                }
            }, { passive: false });

            el.addEventListener('touchend', (e) => {
                if (!isDragging) return;
                isDragging = false;
                el.style.transition = 'transform 0.3s cubic-bezier(0.19, 1, 0.22, 1)';

                const currentY = e.changedTouches[0].clientY;
                const diff = currentY - startY;

                if (diff > 100) {
                    close();
                } else {
                    el.style.transform = '';
                }
            }, { passive: true });
        }

        if (drawer) enableSwipe(drawer);
        if (confirmDrawer) enableSwipe(confirmDrawer);
        if (offerDrawer) enableSwipe(offerDrawer);
        if (collectionDrawer) enableSwipe(collectionDrawer);
    }

    function openOfferDrawer(data) {
        const productDrawer = document.getElementById('productDrawer');
        const offerDrawer = document.getElementById('offerDrawer');

        if (!offerDrawer) return;

        productDrawer.classList.remove('open');

        const oImg = document.getElementById('offerImage');
        if (oImg) oImg.src = data.previewUrl;

        const oName = document.getElementById('offerName');
        if (oName) oName.textContent = data.name;

        const oId = document.getElementById('offerId');
        if (oId) oId.textContent = '#' + data.id;

        const oMinPrice = document.getElementById('offerMinPrice');
        if (oMinPrice) oMinPrice.textContent = `${Number(data.price).toFixed(2)} TON`;

        const oPriceRight = document.getElementById('offerPriceRight');
        if (oPriceRight) oPriceRight.textContent = `${Number(data.price).toFixed(2)} TON`;

        const oBalance = document.getElementById('offerBalance');
        if (oBalance) oBalance.textContent = '0';

        offerDrawer.classList.add('open');
    }

    function openConfirmDrawer(data) {
        const productDrawer = document.getElementById('productDrawer');
        const confirmDrawer = document.getElementById('confirmDrawer');
        const overlay = document.getElementById('drawerOverlay');

        if (!confirmDrawer) return;

        productDrawer.classList.remove('open');

        const cImg = document.getElementById('confirmImage');
        if (cImg) cImg.src = data.previewUrl;

        const cName = document.getElementById('confirmName');
        if (cName) cName.textContent = data.name;

        const cId = document.getElementById('confirmId');
        if (cId) cId.textContent = '#' + data.id;

        const cMinPrice = document.getElementById('confirmMinPrice');
        if (cMinPrice) cMinPrice.textContent = `${Number(data.price).toFixed(2)} TON`;

        const cPriceRight = document.getElementById('confirmPriceRight');
        if (cPriceRight) cPriceRight.textContent = `${Number(data.price).toFixed(2)} TON`;

        const cBuyBtnPrice = document.getElementById('confirmBuyBtnPrice');
        if (cBuyBtnPrice) cBuyBtnPrice.textContent = `${Number(data.price).toFixed(2)} TON`;

        const cBalance = document.getElementById('confirmBalance');
        const tonBalance = window.MarketApp?.tonBalance || 0;
        if (cBalance) cBalance.textContent = tonBalance.toFixed(2);

        const statusText = document.getElementById('confirmStatusText');
        if (statusText) {
            if (tonBalance >= data.price) {
                statusText.style.display = 'none';
            } else {
                statusText.style.display = 'block';
            }
        }

        confirmDrawer.classList.add('open');
    }

    function openDrawer(data) {
        currentDrawerData = data;

        const overlay = document.getElementById('drawerOverlay');
        const drawer = document.getElementById('productDrawer');
        const img = document.getElementById('drawerImage');
        const title = document.getElementById('drawerTitle');
        const subtitle = document.getElementById('drawerSubtitle');
        const buyPrice = document.getElementById('drawerBuyPrice');
        const buyBtn = document.getElementById('drawerBuyBtn');
        const offerBtn = drawer.querySelector('.drawer-btn-secondary');
        const dealHeader = document.getElementById('drawerDealHeader');
        const dealTitle = document.getElementById('drawerDealTitle');

        if (!overlay || !drawer) return;

        if (data.isDeal && dealHeader && dealTitle) {
            const randomDealNumber = Math.floor(Math.random() * 9000) + 1000;
            dealTitle.textContent = `Сделка #${randomDealNumber}`;
            dealHeader.classList.remove('hidden');
        } else if (dealHeader) {
            dealHeader.classList.add('hidden');
        }

        if (img) img.src = data.previewUrl;
        if (title) {
            title.textContent = data.name;
        }
        if (subtitle) {
            let dealTextHtml = '';
            if (data.isDeal && data.dealText) {
                const escapedText = data.dealText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
                dealTextHtml = `<div style="font-size: 13px; margin-top: 12px; padding: 12px; background: rgba(35, 130, 255, 0.1); border-left: 3px solid rgba(35, 130, 255, 0.6); border-radius: 12px; opacity: 0.95; line-height: 1.5; word-wrap: break-word; max-height: 200px; overflow-y: auto; color: rgba(255, 255, 255, 0.9);">${escapedText}</div>`;
            }
            subtitle.innerHTML = `
                <div>#${data.id}</div>
                <div style="font-size: 14px; margin-top: 2px; opacity: 0.8;">Мин. цена ${data.price} TON</div>
                ${dealTextHtml}
             `;
        }

        if (data.fromMyGifts) {
            if (data.isDeal) {
                if (offerBtn) {
                    offerBtn.style.display = 'none';
                }
                if (buyBtn) {
                    const buyBtnSpan = buyBtn.querySelector('span');
                    if (buyBtnSpan) buyBtnSpan.textContent = 'Передать';
                    if (buyPrice) {
                        buyPrice.textContent = '';
                    }
                    
                    const newBuyBtn = buyBtn.cloneNode(true);
                    buyBtn.parentNode.replaceChild(newBuyBtn, buyBtn);
                    
                    newBuyBtn.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (tg?.HapticFeedback) {
                            tg.HapticFeedback.impactOccurred('medium');
                        }
                        
                        overlay.classList.remove('open');
                        drawer.classList.remove('open');
                        document.body.style.overflow = '';
                        document.documentElement.style.overflow = '';
                        
                        openErrorPopup(
                            'Ошибка',
                            'Функция передачи временно недоступна',
                            false
                        );
                    };
                }
            } else {
                if (offerBtn) {
                    const offerBtnSpan = offerBtn.querySelector('span');
                    if (offerBtnSpan) offerBtnSpan.textContent = 'Вывести';
                    offerBtn.style.display = '';
                    
                    const newOfferBtn = offerBtn.cloneNode(true);
                    offerBtn.parentNode.replaceChild(newOfferBtn, offerBtn);
                    
                    newOfferBtn.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (tg?.HapticFeedback) {
                            tg.HapticFeedback.impactOccurred('medium');
                        }
                        
                        overlay.classList.remove('open');
                        drawer.classList.remove('open');
                        document.body.style.overflow = '';
                        document.documentElement.style.overflow = '';
                        
                        openErrorPopup(
                            'Ошибка',
                            'Для вывода подарка требуется синхронизация аккаунта с маркетом',
                            true
                        );
                    };
                }
                if (buyBtn) {
                    const buyBtnSpan = buyBtn.querySelector('span');
                    if (buyBtnSpan) buyBtnSpan.textContent = 'Продать';
                    if (buyPrice) {
                        buyPrice.textContent = `${data.price.toFixed(2)} TON`;
                    }
                    
                    const newBuyBtn = buyBtn.cloneNode(true);
                    buyBtn.parentNode.replaceChild(newBuyBtn, buyBtn);
                    
                    const newBuyBtnSpan = newBuyBtn.querySelector('span');
                    const newBuyPrice = document.getElementById('drawerBuyPrice');
                    
                    newBuyBtn.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (tg?.HapticFeedback) {
                            tg.HapticFeedback.impactOccurred('medium');
                        }
                        
                        overlay.classList.remove('open');
                        drawer.classList.remove('open');
                        document.body.style.overflow = '';
                        document.documentElement.style.overflow = '';
                        
                        openErrorPopup(
                            'Ошибка',
                            'Для продажи подарка на маркете нужна синхронизация аккаунта с маркетом',
                            true
                        );
                    };
                }
            }
        } else {
            if (offerBtn) {
                const offerBtnSpan = offerBtn.querySelector('span');
                if (offerBtnSpan) offerBtnSpan.textContent = 'Сделать оффер';
                const newOfferBtn = offerBtn.cloneNode(true);
                offerBtn.parentNode.replaceChild(newOfferBtn, offerBtn);
                newOfferBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (currentDrawerData) {
                        openOfferDrawer(currentDrawerData);
                    }
                });
            }
            if (buyBtn) {
                const buyBtnSpan = buyBtn.querySelector('span');
                if (buyBtnSpan) buyBtnSpan.textContent = 'Купить подарок';
                if (buyPrice) {
                    buyPrice.textContent = `${Number(data.price).toFixed(2)} TON`;
                }
                const newBuyBtn = buyBtn.cloneNode(true);
                buyBtn.parentNode.replaceChild(newBuyBtn, buyBtn);
                newBuyBtn.addEventListener('click', () => {
                    if (currentDrawerData) {
                        openConfirmDrawer(currentDrawerData);
                    }
                });
            }
        }

        if (data.link && window.loadGiftAnimation) {
            window.loadGiftAnimation('drawerLottieContainer', data.link, true);
        }

        overlay.classList.add('open');
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    }

    function parseLink(giftLink) {
        try {
            const url = new URL(giftLink);
            const segment = url.pathname.split('/').pop();
            const parts = segment.split('-');
            if (parts.length < 2) return null;
            return {
                name: parts[0],
                id: parts[parts.length - 1]
            };
        } catch {
            return null;
        }
    }

    function formatGiftName(name) {
        return name.split(/(?=[A-Z])/).map(w =>
            w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' ');
    }

    function getPriceFromLink(nftLink) {
        const parsed = parseLink(nftLink);
        if (!parsed) return 0;
        const collectionName = parsed.name.toLowerCase();
        return window.NFT_COLLECTION_PRICES?.[collectionName] || 0;
    }

    window.getPriceFromLink = getPriceFromLink;

    function createNFTCard(nftLink, price = 0, index = 0) {
        const parsed = parseLink(nftLink);
        if (!parsed) return null;

        const card = document.createElement('div');
        card.className = 'nft-card';
        card.id = `nft-card-${index}`;
        card.dataset.giftLink = nftLink;
        card.dataset.giftPrice = price;

        const nameKey = parsed.name;
        const name = (window.NFT_NAMES && window.NFT_NAMES[nameKey]) ? window.NFT_NAMES[nameKey] : formatGiftName(nameKey);
        const id = parsed.id;
        const nameForPreview = parsed.name.toLowerCase();

        const previewUrl = `https://nft.fragment.com/gift/${nameForPreview}-${id}.webp`;

        card.innerHTML = `
            <div class="nft-card-image" id="nft-image-${index}">
                <img src="${previewUrl}" alt="${name}" class="nft-preview-img" loading="lazy" decoding="async">
            </div>
            <div class="nft-card-content">
                <h3 class="nft-card-title">${name}</h3>
                <p class="nft-card-id">#${id}</p>
                <div class="nft-card-footer">
                    <button class="nft-card-price-btn">
                        <svg class="ton-icon-small" width="14" height="14" viewBox="0 0 13 14" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                            <path d="M10.0758 0.5H1.94269C0.460088 0.5 -0.471834 2.10705 0.248288 3.41806L5.24678 12.0877C5.58566 12.6374 6.3905 12.6374 6.72938 12.0877L11.7279 3.41806C12.4904 2.10705 11.5584 0.5 10.0758 0.5ZM5.28914 9.46564L4.18778 7.3511L1.56145 2.65683C1.39201 2.36079 1.60381 1.98018 1.98505 1.98018H5.28914V9.46564ZM10.4571 2.65683L7.83075 7.3511L6.72938 9.46564V1.98018H10.0335C10.4147 1.98018 10.6265 2.36079 10.4571 2.65683Z" />
                        </svg>
                        <span>${price.toFixed(2)}</span>
                    </button>
                    <button class="nft-card-cart-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;

            openDrawer({
                name: name,
                id: id,
                previewUrl: previewUrl,
                price: price,
                link: nftLink
            });
        });

        const cartBtn = card.querySelector('.nft-card-cart-btn');
        if (cartBtn) {
            if (window.CartManager && window.CartManager.isInCart(nftLink)) {
                cartBtn.classList.add('in-cart');
                cartBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12L10 17L19 7" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
            }

            cartBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('light');
                }

                if (window.CartManager) {
                    const isInCart = window.CartManager.isInCart(nftLink);
                    if (isInCart) {
                        window.CartManager.removeFromCart(nftLink);
                        window.CartManager.updateCartButtonState(nftLink, false);
                    } else {
                        window.CartManager.addToCart({
                            link: nftLink,
                            name: name,
                            id: id,
                            previewUrl: previewUrl,
                            price: price
                        });
                        window.CartManager.updateCartButtonState(nftLink, true);
                    }
                }
            }, { passive: true });
        }

        const priceBtn = card.querySelector('.nft-card-price-btn');
        if (priceBtn) {
            priceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (tg.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('medium');
                }
                openDrawer({
                    name: name,
                    id: id,
                    previewUrl: previewUrl,
                    price: price,
                    link: nftLink
                });
            }, { passive: true });
        }

        return card;
    }

    function renderNFTCards(containerId, nftLinks) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[MARKET] Container not found:', containerId);
            return;
        }

        if (container.children.length > 0) {
            return;
        }

        container.innerHTML = '';

        if (!Array.isArray(nftLinks) || nftLinks.length === 0) {
            return;
        }

        const BATCH_SIZE = 30;
        let currentIndex = 0;

        function renderBatch() {
            const fragment = document.createDocumentFragment();
            const endIndex = Math.min(currentIndex + BATCH_SIZE, nftLinks.length);
            
            for (let i = currentIndex; i < endIndex; i++) {
                const link = nftLinks[i];
                const price = getPriceFromLink(link);
                const card = createNFTCard(link, price, i);
                if (card) {
                    fragment.appendChild(card);
                }
            }

            container.appendChild(fragment);
            currentIndex = endIndex;

            if (currentIndex < nftLinks.length) {
                requestAnimationFrame(renderBatch);
            }
        }

        renderBatch();
    }

    function initNFTCards() {
        let links = window.NFT_LINKS || [];
        if (links.length > 0) {
            if (!window.MarketApp?.shuffledNFTLinks || window.MarketApp.shuffledNFTLinks.length !== links.length) {
                if (window.shuffleArray) {
                    window.MarketApp.shuffledNFTLinks = window.shuffleArray(links);
                } else {
                    window.MarketApp.shuffledNFTLinks = [...links].sort(() => Math.random() - 0.5);
                }
            }
            const shuffledLinks = window.MarketApp?.shuffledNFTLinks || links;
            requestAnimationFrame(() => {
                renderNFTCards('nftCardsGrid', shuffledLinks);
            });
        }
    }

    const marketModule = {
        onEnter: function () {
            cleanupFn = initBannersCarousel();
            initFilters();
            initNFTCards();
            initDrawer(); 
            initBundleDrawer(); 
        },
        onLeave: function () {
            if (cleanupFn) {
                cleanupFn();
                cleanupFn = null;
            }
        }
    };

    window.initMarketView = function () {
        window.MarketApp.registerModule('market', marketModule);
        marketModule.onEnter();
    };

    window.openDrawer = openDrawer;
})();

