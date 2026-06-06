(function() {
  console.log("[ConversaAI Widget] loaded");

  const scriptTag = document.currentScript;
  if (!scriptTag) {
    console.error('[ConversaAI Widget] error: Unable to find the current script tag (document.currentScript is null). If using React/Next.js, avoid standard injection and use raw HTML testing.');
    return;
  }

  const assistantId = scriptTag.getAttribute('data-assistant-id');
  if (!assistantId) {
    console.error('[ConversaAI Widget] error: Missing data-assistant-id attribute on the script tag.');
    return;
  }

  console.log("[ConversaAI Widget] assistantId:", assistantId);

  // Determine the base URL from the script src
  const src = scriptTag.getAttribute('src');
  const url = new URL(src, window.location.href);
  const baseUrl = url.origin;

  let config = null;
  let isOpen = false;
  let conversationId = localStorage.getItem(`conversaai_conversation_${assistantId}`) || null;
  let visitorId = localStorage.getItem('conversaai_visitor_id');
  
  if (!visitorId) {
    visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('conversaai_visitor_id', visitorId);
  }

  // Wait for DOM to be ready
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
    
    // Solo omitir el ping si fue exitoso en los últimos 5 minutos
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
        // Bloquear carga y mostrar error
        const messagesEl = document.getElementById('conversaai-messages');
        if (messagesEl) {
          messagesEl.innerHTML = `<div class="conversaai-widget-error">Este dominio no está autorizado para usar este asistente.</div>`;
        }
        return false;
      }

      if (res.ok) {
        sessionStorage.setItem(pingKey, now.toString());
      }
      return true; // Permitir continuar incluso si hay otros errores de red
    } catch (error) {
      console.warn('[ConversaAI Widget] Ping falló, continuando...', error);
      return true; // No bloquear si hay error de red
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
        z-index: 2147483647; /* Maximum z-index */
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .conversaai-widget-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #7c3aed, #06b6d4);
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
        border: none;
        outline: none;
        padding: 0;
      }
      .conversaai-widget-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(124, 58, 237, 0.5);
      }
      .conversaai-widget-button svg {
        width: 28px;
        height: 28px;
        fill: white;
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
        background: linear-gradient(90deg, rgba(124, 58, 237, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .conversaai-widget-header-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .conversaai-widget-avatar {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: linear-gradient(135deg, #7c3aed, #06b6d4);
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
      }
      .conversaai-widget-subtitle {
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .conversaai-widget-status-dot {
        width: 6px;
        height: 6px;
        background-color: #10b981;
        border-radius: 50%;
        display: inline-block;
      }
      .conversaai-widget-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background-color 0.2s, color 0.2s;
      }
      .conversaai-widget-close:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
      }
      .conversaai-widget-close svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }
      .conversaai-widget-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background-color: #050816;
      }
      .conversaai-widget-messages::-webkit-scrollbar {
        width: 6px;
      }
      .conversaai-widget-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      .conversaai-widget-messages::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }
      .conversaai-widget-message {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
      }
      .conversaai-widget-message.bot {
        align-self: flex-start;
        background-color: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-bottom-left-radius: 4px;
      }
      .conversaai-widget-message.user {
        align-self: flex-end;
        background: linear-gradient(135deg, #7c3aed, #06b6d4);
        color: white;
        border-bottom-right-radius: 4px;
      }
      .conversaai-widget-input-area {
        padding: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        background-color: #080f28;
      }
      .conversaai-widget-form {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }
      .conversaai-widget-input-wrapper {
        flex: 1;
        background-color: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        transition: border-color 0.2s;
      }
      .conversaai-widget-input-wrapper:focus-within {
        border-color: rgba(124, 58, 237, 0.5);
      }
      .conversaai-widget-input {
        width: 100%;
        background: transparent;
        border: none;
        color: white;
        font-size: 14px;
        font-family: inherit;
        outline: none;
        resize: none;
        max-height: 100px;
        padding: 0;
        margin: 0;
      }
      .conversaai-widget-input::placeholder {
        color: rgba(255, 255, 255, 0.3);
      }
      .conversaai-widget-send {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: linear-gradient(135deg, #7c3aed, #06b6d4);
        border: none;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: opacity 0.2s;
      }
      .conversaai-widget-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .conversaai-widget-send svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      .conversaai-widget-loading {
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        align-self: flex-start;
        width: fit-content;
      }
      .conversaai-widget-dot {
        width: 6px;
        height: 6px;
        background-color: rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        animation: conversaai-bounce 1.4s infinite ease-in-out both;
      }
      .conversaai-widget-dot:nth-child(1) { animation-delay: -0.32s; }
      .conversaai-widget-dot:nth-child(2) { animation-delay: -0.16s; }
      @keyframes conversaai-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      .conversaai-widget-error {
        text-align: center;
        color: #ec4899;
        font-size: 12px;
        padding: 8px;
      }
    `;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildUI() {
    const container = document.createElement('div');
    container.className = 'conversaai-widget-container';
    
    // Toggle Button
    const button = document.createElement('button');
    button.className = 'conversaai-widget-button';
    button.setAttribute('aria-label', 'Abrir chat');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
    `;
    button.addEventListener('click', toggleChat);

    // Chat Panel
    const panel = document.createElement('div');
    panel.className = 'conversaai-widget-panel';
    panel.id = 'conversaai-widget-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'conversaai-widget-header';
    header.innerHTML = `
      <div class="conversaai-widget-header-info">
        <div class="conversaai-widget-avatar" id="conversaai-avatar">AI</div>
        <div>
          <h3 class="conversaai-widget-title" id="conversaai-title">Asistente</h3>
          <p class="conversaai-widget-subtitle">
            <span class="conversaai-widget-status-dot"></span>
            En línea
          </p>
        </div>
      </div>
      <button class="conversaai-widget-close" aria-label="Cerrar chat" id="conversaai-close-btn">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    `;

    // Messages Area
    const messages = document.createElement('div');
    messages.className = 'conversaai-widget-messages';
    messages.id = 'conversaai-messages';

    // Input Area
    const inputArea = document.createElement('div');
    inputArea.className = 'conversaai-widget-input-area';
    
    const form = document.createElement('form');
    form.className = 'conversaai-widget-form';
    form.id = 'conversaai-form';
    
    form.innerHTML = `
      <div class="conversaai-widget-input-wrapper">
        <input type="text" class="conversaai-widget-input" id="conversaai-input" placeholder="Escribe tu mensaje..." autocomplete="off" disabled />
      </div>
      <button type="submit" class="conversaai-widget-send" id="conversaai-send-btn" disabled>
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    `;

    inputArea.appendChild(form);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputArea);

    container.appendChild(panel);
    container.appendChild(button);

    document.body.appendChild(container);

    // Event Listeners
    document.getElementById('conversaai-close-btn').addEventListener('click', toggleChat);
    form.addEventListener('submit', handleSend);
  }

  function toggleChat() {
    isOpen = !isOpen;
    const panel = document.getElementById('conversaai-widget-panel');
    if (isOpen) {
      panel.classList.add('conversaai-open');
      document.getElementById('conversaai-input').focus();
    } else {
      panel.classList.remove('conversaai-open');
    }
  }

  async function fetchConfig() {
    try {
      const res = await fetch(`${baseUrl}/api/widget/config?assistantId=${assistantId}`);
      if (!res.ok) {
        throw new Error('Asistente no disponible o inactivo.');
      }
      config = await res.json();
      
      // Update UI with config
      const titleEl = document.getElementById('conversaai-title');
      const avatarEl = document.getElementById('conversaai-avatar');
      
      const assistantName = config.name || 'Asistente';
      titleEl.textContent = assistantName;
      avatarEl.textContent = assistantName.charAt(0).toUpperCase();

      // Enable input
      document.getElementById('conversaai-input').disabled = false;
      document.getElementById('conversaai-send-btn').disabled = false;

      // Add welcome message
      if (config.welcomeMessage) {
        addMessage(config.welcomeMessage, 'bot');
      } else {
        addMessage('Hola, ¿en qué te puedo ayudar hoy?', 'bot');
      }
    } catch (error) {
      console.error('[ConversaAI Widget] config error:', error);
      const messagesEl = document.getElementById('conversaai-messages');
      messagesEl.innerHTML = `<div class="conversaai-widget-error">El chat no está disponible en este momento.</div>`;
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const input = document.getElementById('conversaai-input');
    const sendBtn = document.getElementById('conversaai-send-btn');
    const message = input.value.trim();
    
    if (!message || !config) return;

    // 1. Add user message to UI
    addMessage(message, 'user');
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    // 2. Add loading indicator
    const loadingId = addLoading();

    try {
      // 3. Send to API
      const res = await fetch(`${baseUrl}/api/widget/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId: assistantId,
          message: message,
          conversationId: conversationId,
          visitorId: visitorId
        })
      });

      removeMessage(loadingId);

      const data = await res.json();

      if (!res.ok) {
        addMessage(data.error || 'Ocurrió un error al enviar el mensaje.', 'bot');
        return;
      }

      if (data.conversationId) {
        conversationId = data.conversationId;
        localStorage.setItem(`conversaai_conversation_${assistantId}`, conversationId);
      }

      // 4. Add bot response
      addMessage(data.reply, 'bot');

    } catch (error) {
      removeMessage(loadingId);
      addMessage('Ocurrió un error de conexión.', 'bot');
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function addMessage(text, type) {
    const messagesEl = document.getElementById('conversaai-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `conversaai-widget-message ${type}`;
    msgDiv.textContent = text;
    messagesEl.appendChild(msgDiv);
    scrollToBottom();
  }

  function addLoading() {
    const messagesEl = document.getElementById('conversaai-messages');
    const id = 'conversaai-loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'conversaai-widget-loading';
    loadingDiv.id = id;
    loadingDiv.innerHTML = `
      <div class="conversaai-widget-dot"></div>
      <div class="conversaai-widget-dot"></div>
      <div class="conversaai-widget-dot"></div>
    `;
    messagesEl.appendChild(loadingDiv);
    scrollToBottom();
    return id;
  }

  function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function scrollToBottom() {
    const messagesEl = document.getElementById('conversaai-messages');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

})();
