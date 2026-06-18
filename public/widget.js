(function() {
  console.log("[ConversaAI Widget] loading...");

  // Prevent duplicate initialization
  if (document.getElementById('conversaai-widget-container')) {
    console.warn('[ConversaAI Widget] Widget is already loaded on this page.');
    return;
  }

  const scriptTag = document.currentScript;
  if (!scriptTag) {
    console.error('[ConversaAI Widget] error: Unable to find the current script tag (document.currentScript is null).');
    return;
  }

  const assistantId = scriptTag.getAttribute('data-assistant-id');
  if (!assistantId) {
    console.error('[ConversaAI Widget] error: Missing data-assistant-id attribute on the script tag.');
    return;
  }

  const src = scriptTag.getAttribute('src');
  const url = new URL(src, window.location.href);
  const baseUrl = url.origin;

  let config = null;
  let isOpen = false;
  let conversationId = localStorage.getItem(`conversaai_conversation_${assistantId}`) || null;
  let visitorId = localStorage.getItem('conversaai_visitor_id');
  let isChatBlocked = false;
  let quickQuestionsUsed = false;
  
  if (!visitorId) {
    visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('conversaai_visitor_id', visitorId);
  }

  // Icons
  const closeIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const chatIconSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5.001-1.339A9.954 9.954 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.482 0-2.883-.327-4.135-.911l-.296-.138-3.084.825.834-3.003-.153-.3A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>`;
  const sendIconSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  function initWidget() {
    injectStyles();
    buildUI();
    verifyInstallation().then(verified => {
      if (verified) {
        fetchConfig();
      }
    });
  }

  async function verifyInstallation() {
    const pingKey = `conversaai_widget_ping_${assistantId}`;
    const lastPing = sessionStorage.getItem(pingKey);
    const now = Date.now();
    
    if (lastPing && (now - parseInt(lastPing)) < 300000) {
      return true;
    }

    try {
      const res = await fetch(`${baseUrl}/api/widget/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId: assistantId,
          pageUrl: window.location.href,
          visitorId: visitorId
        })
      });

      if (res.status === 403) {
        blockChat("Este chat no está autorizado para este dominio.");
        return false;
      }

      if (res.ok) {
        sessionStorage.setItem(pingKey, now.toString());
      }
      return true;
    } catch (error) {
      console.warn('[ConversaAI Widget] Ping falló, continuando...', error);
      return true;
    }
  }

  function injectStyles() {
    const styleId = 'conversaai-widget-styles';
    if (document.getElementById(styleId)) return;

    const css = `
      .conversaai-widget-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        --cai-primary: #7c3aed;
        --cai-secondary: #06b6d4;
      }
      .conversaai-widget-container.cai-pos-left {
        right: auto;
        left: 24px;
      }
      .conversaai-widget-button-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        position: relative;
      }
      .conversaai-widget-container.cai-pos-left .conversaai-widget-button-wrapper {
        flex-direction: row-reverse;
      }
      .conversaai-widget-launcher-text {
        background: white;
        color: black;
        padding: 10px 16px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        display: none;
        white-space: nowrap;
        position: relative;
        animation: cai-fade-in 0.3s ease;
      }
      .conversaai-widget-container:not(.cai-pos-left) .conversaai-widget-launcher-text::after {
        content: '';
        position: absolute;
        right: -6px;
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 2px;
      }
      .conversaai-widget-container.cai-pos-left .conversaai-widget-launcher-text::after {
        content: '';
        position: absolute;
        left: -6px;
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 2px;
      }
      .conversaai-widget-launcher-text.cai-show {
        display: block;
      }
      .conversaai-widget-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--cai-primary), var(--cai-secondary));
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
        border: 2px solid transparent;
        outline: none;
        padding: 0;
      }
      .conversaai-widget-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
      }
      .conversaai-widget-button svg {
        width: 28px;
        height: 28px;
        fill: white;
        color: white;
        transition: transform 0.3s ease;
      }
      .conversaai-widget-panel {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 360px;
        height: 520px;
        max-height: calc(100vh - 120px);
        background-color: #050816;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px) scale(0.95);
        transition: opacity 0.3s ease, transform 0.3s ease;
        transform-origin: bottom right;
      }
      .conversaai-widget-container.cai-pos-left .conversaai-widget-panel {
        right: auto;
        left: 0;
        transform-origin: bottom left;
      }
      .conversaai-widget-panel.conversaai-open {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }
      @media (max-width: 480px) {
        .conversaai-widget-panel {
          position: fixed;
          bottom: 0;
          right: 0;
          left: 0;
          top: 0;
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          border-radius: 0;
          border: none;
        }
        .conversaai-widget-button {
          bottom: 16px;
          right: 16px;
        }
      }
      .conversaai-widget-header {
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--cai-primary);
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .conversaai-widget-header-info {
        display: flex;
        align-items: center;
        gap: 12px;
        overflow: hidden;
      }
      .conversaai-widget-avatar {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 18px;
        flex-shrink: 0;
      }
      .conversaai-widget-title {
        color: white;
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 2px 0;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .conversaai-widget-subtitle {
        color: rgba(255, 255, 255, 0.8);
        font-size: 12px;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .conversaai-widget-status-dot {
        width: 6px;
        height: 6px;
        background-color: #10b981;
        border-radius: 50%;
        display: inline-block;
        flex-shrink: 0;
      }
      .conversaai-widget-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        opacity: 0.7;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s;
      }
      .conversaai-widget-close:hover {
        opacity: 1;
      }
      .conversaai-widget-close svg {
        width: 20px;
        height: 20px;
      }
      .conversaai-widget-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background-color: #0A0D1A;
        scroll-behavior: smooth;
      }
      .conversaai-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
        animation: cai-fade-in 0.3s ease;
      }
      .conversaai-message.assistant {
        align-self: flex-start;
        background-color: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #f1f5f9;
        border-bottom-left-radius: 4px;
      }
      .conversaai-message.user {
        align-self: flex-end;
        background-color: var(--cai-primary);
        color: white;
        border-bottom-right-radius: 4px;
      }
      .conversaai-widget-quick-questions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-end;
        margin-top: 4px;
        animation: cai-fade-in 0.4s ease;
      }
      .conversaai-quick-question-btn {
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: right;
        max-width: 90%;
        backdrop-filter: blur(4px);
      }
      .conversaai-quick-question-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: var(--cai-primary);
      }
      .conversaai-quick-question-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .conversaai-widget-input-area {
        padding: 12px;
        background-color: #050816;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
      }
      .conversaai-widget-input-wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        background-color: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 4px 4px 4px 12px;
        transition: border-color 0.2s;
      }
      .conversaai-widget-input-wrapper:focus-within {
        border-color: var(--cai-primary);
      }
      .conversaai-widget-input {
        flex: 1;
        background: transparent;
        border: none;
        color: white;
        font-size: 14px;
        outline: none;
        padding: 8px 0;
      }
      .conversaai-widget-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }
      .conversaai-widget-input:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      .conversaai-widget-send {
        background-color: var(--cai-primary);
        color: white;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 8px;
        transition: transform 0.2s, background-color 0.2s;
      }
      .conversaai-widget-send:hover {
        transform: scale(1.05);
      }
      .conversaai-widget-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      .conversaai-widget-send svg {
        width: 16px;
        height: 16px;
      }
      .conversaai-widget-error-notice {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #fca5a5;
        padding: 12px;
        border-radius: 12px;
        font-size: 13px;
        text-align: center;
        margin: 10px;
      }
      .conversaai-typing {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        align-self: flex-start;
        width: fit-content;
      }
      .conversaai-dot {
        width: 6px;
        height: 6px;
        background-color: rgba(255,255,255,0.6);
        border-radius: 50%;
        animation: cai-bounce 1.4s infinite ease-in-out both;
      }
      .conversaai-dot:nth-child(1) { animation-delay: -0.32s; }
      .conversaai-dot:nth-child(2) { animation-delay: -0.16s; }
      @keyframes cai-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      @keyframes cai-fade-in {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildUI() {
    const container = document.createElement('div');
    container.id = 'conversaai-widget-container';
    container.className = 'conversaai-widget-container';

    // Panel
    const panel = document.createElement('div');
    panel.className = 'conversaai-widget-panel';
    panel.id = 'conversaai-widget-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat con asistente');

    const header = document.createElement('div');
    header.className = 'conversaai-widget-header';
    header.id = 'conversaai-widget-header';

    const headerInfo = document.createElement('div');
    headerInfo.className = 'conversaai-widget-header-info';

    const avatar = document.createElement('div');
    avatar.className = 'conversaai-widget-avatar';
    avatar.id = 'conversaai-widget-avatar';
    // Default avatar letter
    avatar.textContent = 'A';

    const titleBox = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'conversaai-widget-title';
    title.id = 'conversaai-widget-title';
    
    const subtitleBox = document.createElement('div');
    subtitleBox.className = 'conversaai-widget-subtitle';
    const statusDot = document.createElement('span');
    statusDot.className = 'conversaai-widget-status-dot';
    const subtitleText = document.createElement('span');
    subtitleText.id = 'conversaai-widget-subtitle';

    subtitleBox.appendChild(statusDot);
    subtitleBox.appendChild(subtitleText);

    titleBox.appendChild(title);
    titleBox.appendChild(subtitleBox);

    headerInfo.appendChild(avatar);
    headerInfo.appendChild(titleBox);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'conversaai-widget-close';
    closeBtn.setAttribute('aria-label', 'Cerrar chat');
    closeBtn.innerHTML = closeIconSVG; // Safe SVG
    closeBtn.onclick = toggleWidget;

    header.appendChild(headerInfo);
    header.appendChild(closeBtn);

    const messages = document.createElement('div');
    messages.className = 'conversaai-widget-messages';
    messages.id = 'conversaai-messages';
    messages.setAttribute('aria-live', 'polite');

    const inputArea = document.createElement('div');
    inputArea.className = 'conversaai-widget-input-area';

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'conversaai-widget-input-wrapper';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'conversaai-widget-input';
    input.id = 'conversaai-input';
    input.placeholder = 'Cargando...';
    input.disabled = true;

    const sendBtn = document.createElement('button');
    sendBtn.className = 'conversaai-widget-send';
    sendBtn.id = 'conversaai-send-btn';
    sendBtn.setAttribute('aria-label', 'Enviar mensaje');
    sendBtn.innerHTML = sendIconSVG; // Safe SVG
    sendBtn.disabled = true;

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(sendBtn);
    inputArea.appendChild(inputWrapper);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputArea);

    // Launcher Wrapper
    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'conversaai-widget-button-wrapper';

    const launcherText = document.createElement('div');
    launcherText.className = 'conversaai-widget-launcher-text';
    launcherText.id = 'conversaai-launcher-text';

    const launcherBtn = document.createElement('button');
    launcherBtn.className = 'conversaai-widget-button';
    launcherBtn.id = 'conversaai-launcher-btn';
    launcherBtn.setAttribute('aria-label', 'Abrir chat');
    launcherBtn.innerHTML = chatIconSVG; // Safe SVG

    buttonWrapper.appendChild(launcherText);
    buttonWrapper.appendChild(launcherBtn);

    container.appendChild(panel);
    container.appendChild(buttonWrapper);

    document.body.appendChild(container);

    // Events
    launcherBtn.addEventListener('click', toggleWidget);
    sendBtn.addEventListener('click', () => handleSend());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        toggleWidget();
      }
    });
  }

  function toggleWidget() {
    isOpen = !isOpen;
    const panel = document.getElementById('conversaai-widget-panel');
    const launcherBtn = document.getElementById('conversaai-launcher-btn');
    const input = document.getElementById('conversaai-input');
    
    if (isOpen) {
      panel.classList.add('conversaai-open');
      launcherBtn.innerHTML = closeIconSVG;
      if (!isChatBlocked) {
        setTimeout(() => input.focus(), 100);
      }
    } else {
      panel.classList.remove('conversaai-open');
      launcherBtn.innerHTML = chatIconSVG;
    }
  }

  async function fetchConfig() {
    try {
      const res = await fetch(`${baseUrl}/api/widget/config?id=${assistantId}`);
      if (res.status === 403) {
        blockChat("El chat no está disponible en este momento.");
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch config');
      
      const data = await res.json();
      
      // Robust Defaults
      const wConfig = data.widgetConfig || {};
      config = {
        displayName: wConfig.displayName || data.name || 'Asistente',
        subtitle: wConfig.subtitle || 'En línea',
        welcomeMessage: wConfig.welcomeMessage || data.welcomeMessage || 'Hola, ¿en qué puedo ayudarte?',
        primaryColor: wConfig.primaryColor || '#7c3aed',
        secondaryColor: wConfig.secondaryColor || '#06b6d4',
        theme: wConfig.theme || 'modern',
        position: wConfig.position || 'bottom-right',
        launcherMode: wConfig.launcherMode || 'icon-text',
        launcherText: wConfig.launcherText || '¿Necesitas ayuda?',
        quickQuestions: wConfig.quickQuestions || []
      };

      applyConfig();
      
      // Enable input if not blocked
      if (!isChatBlocked) {
        document.getElementById('conversaai-input').disabled = false;
        document.getElementById('conversaai-input').placeholder = 'Escribe un mensaje...';
        document.getElementById('conversaai-send-btn').disabled = false;
      }
    } catch (error) {
      console.error('[ConversaAI Widget] Config fetch error:', error);
      blockChat("No pudimos cargar el chat. Intenta más tarde.");
    }
  }

  function applyConfig() {
    if (!config) return;

    const container = document.getElementById('conversaai-widget-container');
    const header = document.getElementById('conversaai-widget-header');
    const launcherBtn = document.getElementById('conversaai-launcher-btn');
    const launcherTextEl = document.getElementById('conversaai-launcher-text');
    const titleEl = document.getElementById('conversaai-widget-title');
    const subtitleEl = document.getElementById('conversaai-widget-subtitle');
    const avatarEl = document.getElementById('conversaai-widget-avatar');

    // CSS variables
    container.style.setProperty('--cai-primary', config.primaryColor);
    container.style.setProperty('--cai-secondary', config.secondaryColor);

    // Position
    if (config.position === 'bottom-left') {
      container.classList.add('cai-pos-left');
    }

    // Theme logic
    if (config.theme === 'minimal') {
      header.style.background = '#111';
      header.style.borderBottom = `2px solid ${config.primaryColor}`;
    } else if (config.theme === 'premium') {
      header.style.background = `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})`;
    } else {
      // modern
      header.style.background = config.primaryColor;
    }

    // Text content safely
    titleEl.textContent = config.displayName;
    subtitleEl.textContent = config.subtitle;
    
    // Avatar first letter
    const firstLetter = config.displayName.trim().charAt(0).toUpperCase();
    avatarEl.textContent = firstLetter || 'A';

    // Launcher text safely
    if (config.launcherMode === 'icon-text' && config.launcherText) {
      launcherTextEl.textContent = config.launcherText;
      launcherTextEl.classList.add('cai-show');
    }

    // Render Welcome Message
    const messages = document.getElementById('conversaai-messages');
    messages.innerHTML = ''; // safe clear
    appendMessage(config.welcomeMessage, 'assistant');

    // Quick questions safely
    if (config.quickQuestions && config.quickQuestions.length > 0 && !quickQuestionsUsed) {
      const qqContainer = document.createElement('div');
      qqContainer.className = 'conversaai-widget-quick-questions';
      qqContainer.id = 'conversaai-qq-container';
      
      config.quickQuestions.forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'conversaai-quick-question-btn';
        btn.textContent = q;
        btn.onclick = () => handleQuickQuestion(q, btn);
        qqContainer.appendChild(btn);
      });
      
      messages.appendChild(qqContainer);
    }
  }

  function blockChat(reasonText) {
    isChatBlocked = true;
    const input = document.getElementById('conversaai-input');
    const btn = document.getElementById('conversaai-send-btn');
    if (input) {
      input.disabled = true;
      input.placeholder = 'Chat no disponible';
    }
    if (btn) btn.disabled = true;

    const messages = document.getElementById('conversaai-messages');
    if (messages) {
      const errorEl = document.createElement('div');
      errorEl.className = 'conversaai-widget-error-notice';
      errorEl.textContent = reasonText;
      messages.appendChild(errorEl);
    }
  }

  function handleQuickQuestion(text, btnElement) {
    if (isChatBlocked || quickQuestionsUsed) return;
    quickQuestionsUsed = true;
    
    // Disable all QQ buttons to prevent double click
    const qqContainer = document.getElementById('conversaai-qq-container');
    if (qqContainer) {
      const btns = qqContainer.querySelectorAll('button');
      btns.forEach(b => b.disabled = true);
    }
    
    document.getElementById('conversaai-input').value = text;
    handleSend();
    
    // Remove QQ container after a short delay
    setTimeout(() => {
      if (qqContainer && qqContainer.parentNode) {
        qqContainer.parentNode.removeChild(qqContainer);
      }
    }, 300);
  }

  async function handleSend() {
    if (isChatBlocked) return;
    
    const input = document.getElementById('conversaai-input');
    const sendBtn = document.getElementById('conversaai-send-btn');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    
    // Hide launcher text when user interacts
    const launcherTextEl = document.getElementById('conversaai-launcher-text');
    if (launcherTextEl) launcherTextEl.classList.remove('cai-show');

    appendMessage(text, 'user');
    
    // Hide QQs if user types manually before clicking one
    const qqContainer = document.getElementById('conversaai-qq-container');
    if (qqContainer && !quickQuestionsUsed) {
      quickQuestionsUsed = true;
      qqContainer.parentNode.removeChild(qqContainer);
    }

    const typingId = showTyping();

    try {
      const res = await fetch(`${baseUrl}/api/widget/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId: assistantId,
          message: text,
          conversationId: conversationId,
          pageUrl: window.location.href,
          visitorId: visitorId
        })
      });

      removeTyping(typingId);

      if (res.status === 403) {
        blockChat("Este chat ya no está disponible.");
        return;
      }

      if (!res.ok) {
        throw new Error('Error de red al enviar el mensaje.');
      }

      const data = await res.json();
      if (data.conversationId) {
        conversationId = data.conversationId;
        localStorage.setItem(`conversaai_conversation_${assistantId}`, conversationId);
      }

      if (data.reply) {
        appendMessage(data.reply, 'assistant');
      } else {
        appendMessage('Lo siento, no pude procesar tu mensaje.', 'assistant');
      }

    } catch (error) {
      console.error('[ConversaAI Widget] Send error:', error);
      removeTyping(typingId);
      appendMessage('Ocurrió un error de conexión. Intenta de nuevo.', 'assistant');
    } finally {
      if (!isChatBlocked) {
        input.disabled = false;
        sendBtn.disabled = false;
        setTimeout(() => input.focus(), 100);
      }
    }
  }

  function appendMessage(text, sender) {
    const messages = document.getElementById('conversaai-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `conversaai-message ${sender}`;
    // Secure text injection
    msgDiv.textContent = text;
    messages.appendChild(msgDiv);
    scrollToBottom();
  }

  function showTyping() {
    const messages = document.getElementById('conversaai-messages');
    const typingId = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'conversaai-typing';
    typingDiv.id = typingId;
    
    typingDiv.appendChild(document.createElement('div')).className = 'conversaai-dot';
    typingDiv.appendChild(document.createElement('div')).className = 'conversaai-dot';
    typingDiv.appendChild(document.createElement('div')).className = 'conversaai-dot';
    
    messages.appendChild(typingDiv);
    scrollToBottom();
    return typingId;
  }

  function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.parentNode.removeChild(el);
  }

  function scrollToBottom() {
    const messages = document.getElementById('conversaai-messages');
    messages.scrollTop = messages.scrollHeight;
  }

})();
