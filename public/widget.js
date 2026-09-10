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
  let handoffStatus = 'ai';
  let lastHumanMessageAt = null;
  const seenHumanMessages = new Set();
  
  if (!visitorId) {
    visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('conversaai_visitor_id', visitorId);
  }

  // Icons
  const closeIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const chatIconSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5.001-1.339A9.954 9.954 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.482 0-2.883-.327-4.135-.911l-.296-.138-3.084.825.834-3.003-.153-.3A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>`;
  const sparklesIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5L12 3Z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/></svg>`;
  const supportIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a8 8 0 0 1 16 0"/><path d="M18 19c0 1.1-.9 2-2 2h-3"/><path d="M4 14v3a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2ZM20 14v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z"/></svg>`;
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
        const errorData = await res.json().catch(() => ({}));
        blockChat(errorData.error || "Este chat no está autorizado para este dominio.");
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
        --cai-surface: #ffffff;
        --cai-canvas: #f6f7fb;
        --cai-text: #172033;
        --cai-muted: #64748b;
        --cai-border: rgba(15, 23, 42, 0.1);
        --cai-assistant: #ffffff;
        --cai-input: #ffffff;
        --cai-header-text: #ffffff;
        color-scheme: light;
      }
      .conversaai-widget-container.cai-theme-premium {
        --cai-surface: #080b16;
        --cai-canvas: #0d1120;
        --cai-text: #f8fafc;
        --cai-muted: #a5b4c8;
        --cai-border: rgba(255, 255, 255, 0.1);
        --cai-assistant: #202433;
        --cai-input: #171b28;
        --cai-header-text: #ffffff;
        color-scheme: dark;
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
      .conversaai-widget-button-wrapper::before {
        content: '';
        position: absolute;
        right: 0;
        bottom: 0;
        width: 60px;
        height: 60px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--cai-primary) 30%, transparent);
        animation: cai-launcher-pulse 2.8s ease-out infinite;
        pointer-events: none;
      }
      .conversaai-widget-container.cai-pos-left .conversaai-widget-button-wrapper::before { right: auto; left: 0; }
      .conversaai-widget-container.cai-size-small .conversaai-widget-button-wrapper::before { width: 48px; height: 48px; }
      .conversaai-widget-container.cai-size-large .conversaai-widget-button-wrapper::before { width: 68px; height: 68px; }
      .conversaai-widget-container.cai-shape-rounded .conversaai-widget-button-wrapper::before { border-radius: 20px; }
      .conversaai-widget-container.cai-is-open .conversaai-widget-button-wrapper::before { animation: none; opacity: 0; }
      .conversaai-widget-container.cai-pos-left .conversaai-widget-button-wrapper {
        flex-direction: row-reverse;
      }
      .conversaai-widget-launcher-text {
        background: white;
        color: #111827;
        padding: 12px 20px;
        border-radius: 20px 20px 4px 20px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1);
        display: none;
        white-space: nowrap;
        position: relative;
        animation: cai-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        border: 1px solid rgba(255, 255, 255, 0.8);
      }
      .conversaai-widget-container.cai-pos-left .conversaai-widget-launcher-text {
        border-radius: 20px 20px 20px 4px;
      }
      .conversaai-widget-launcher-text.cai-show {
        display: block;
      }
      .conversaai-widget-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--cai-primary), var(--cai-secondary));
        box-shadow: 0 12px 30px color-mix(in srgb, var(--cai-primary) 35%, transparent), 0 4px 12px rgba(0, 0, 0, 0.16);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
        border: 2px solid rgba(255, 255, 255, 0.72);
        outline: none;
        padding: 0;
      }
      .conversaai-widget-launcher-status {
        position: absolute;
        right: 2px;
        top: 2px;
        z-index: 3;
        width: 13px;
        height: 13px;
        border: 3px solid white;
        border-radius: 999px;
        background: #22c55e;
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
        transition: opacity .2s ease, transform .2s ease;
      }
      .conversaai-widget-launcher-status::after {
        content: '';
        position: absolute;
        inset: -4px;
        border: 2px solid rgba(34, 197, 94, 0.45);
        border-radius: inherit;
        animation: cai-status-pulse 2s ease-out infinite;
      }
      .conversaai-widget-container.cai-pos-left .conversaai-widget-launcher-status { right: auto; left: 2px; }
      .conversaai-widget-container.cai-is-open .conversaai-widget-launcher-status { opacity: 0; transform: scale(.7); }
      .conversaai-widget-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
      }
      .conversaai-widget-container.cai-size-small .conversaai-widget-button { width: 48px; height: 48px; }
      .conversaai-widget-container.cai-size-small .conversaai-widget-button svg { width: 22px; height: 22px; }
      .conversaai-widget-container.cai-size-large .conversaai-widget-button { width: 68px; height: 68px; }
      .conversaai-widget-container.cai-size-large .conversaai-widget-button svg { width: 31px; height: 31px; }
      .conversaai-widget-container.cai-shape-rounded .conversaai-widget-button { border-radius: 18px; }
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
        background-color: var(--cai-surface);
        border: 1px solid var(--cai-border);
        border-radius: 24px;
        box-shadow: 0 28px 70px rgba(15, 23, 42, 0.2), 0 8px 24px rgba(15, 23, 42, 0.1);
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
      .conversaai-widget-container.cai-theme-minimal .conversaai-widget-panel {
        border-radius: 16px;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
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
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, var(--cai-primary), var(--cai-secondary));
        border-bottom: 1px solid rgba(255,255,255,0.05);
        position: relative;
        overflow: hidden;
      }
      .conversaai-widget-container.cai-theme-modern .conversaai-widget-header,
      .conversaai-widget-container.cai-theme-premium .conversaai-widget-header {
        background: linear-gradient(135deg, var(--cai-primary), var(--cai-secondary));
      }
      .conversaai-widget-container.cai-theme-minimal .conversaai-widget-header {
        background: var(--cai-surface);
        border-bottom: 2px solid var(--cai-primary);
        --cai-header-text: var(--cai-text);
      }
      .conversaai-widget-header::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+') repeat;
        opacity: 0.5;
        pointer-events: none;
      }
      .conversaai-widget-header-info {
        display: flex;
        align-items: center;
        gap: 14px;
        overflow: hidden;
        position: relative;
        z-index: 1;
      }
      .conversaai-widget-avatar {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--cai-primary);
        font-weight: 700;
        font-size: 18px;
        flex-shrink: 0;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      }
      .conversaai-widget-title {
        color: var(--cai-header-text);
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 2px 0;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .conversaai-widget-subtitle {
        color: color-mix(in srgb, var(--cai-header-text) 82%, transparent);
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
        width: 8px;
        height: 8px;
        background-color: #10b981;
        border-radius: 50%;
        display: inline-block;
        flex-shrink: 0;
      }
      .conversaai-widget-close {
        background: none;
        border: none;
        color: var(--cai-header-text);
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
        padding: 20px 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background-color: var(--cai-canvas);
        scroll-behavior: smooth;
        background-image: radial-gradient(circle at top right, color-mix(in srgb, var(--cai-primary) 8%, transparent), transparent 300px);
      }
      .conversaai-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
        animation: cai-fade-in 0.3s ease;
      }
      .conversaai-message-wrap {
        display: flex;
        flex-direction: column;
        max-width: 85%;
        animation: cai-fade-in 0.3s ease;
      }
      .conversaai-message-wrap.assistant { align-self: flex-start; }
      .conversaai-message-wrap.user { align-self: flex-end; align-items: flex-end; }
      .conversaai-message-wrap .conversaai-message { max-width: 100%; animation: none; }
      .conversaai-message.human {
        border-color: color-mix(in srgb, var(--cai-primary) 28%, var(--cai-border));
        box-shadow: 0 5px 16px color-mix(in srgb, var(--cai-primary) 10%, transparent);
      }
      .conversaai-message-meta {
        margin: 5px 6px 0;
        color: var(--cai-muted);
        font-size: 10px;
        font-weight: 600;
      }
      .conversaai-widget-presence {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 27px;
        padding: 5px 12px;
        background: color-mix(in srgb, var(--cai-primary) 7%, var(--cai-surface));
        border-bottom: 1px solid var(--cai-border);
        color: var(--cai-muted);
        font-size: 11px;
        font-weight: 600;
      }
      .conversaai-widget-presence-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 0 3px rgba(34,197,94,.12);
      }
      .conversaai-message.assistant {
        align-self: flex-start;
        background-color: var(--cai-assistant);
        border: 1px solid var(--cai-border);
        color: var(--cai-text);
        border-bottom-left-radius: 4px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .conversaai-message.user {
        align-self: flex-end;
        background: linear-gradient(135deg, var(--cai-primary), var(--cai-secondary));
        color: white;
        border-bottom-right-radius: 4px;
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
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
        background: rgba(124, 58, 237, 0.1);
        border: 1px solid rgba(124, 58, 237, 0.3);
        color: var(--cai-text);
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: right;
        max-width: 90%;
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      .conversaai-quick-question-btn:hover {
        background: rgba(124, 58, 237, 0.2);
        border-color: rgba(124, 58, 237, 0.5);
        transform: translateY(-1px);
        color: white;
      }
      .conversaai-quick-question-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .conversaai-widget-input-area {
        padding: 16px;
        background-color: var(--cai-surface);
        border-top: 1px solid var(--cai-border);
        display: flex;
        align-items: center;
      }
      .conversaai-widget-input-wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        background-color: var(--cai-input);
        border: 1px solid var(--cai-border);
        border-radius: 24px;
        padding: 6px 6px 6px 16px;
        transition: all 0.2s;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
      }
      .conversaai-widget-input-wrapper:focus-within {
        border-color: var(--cai-primary);
        background-color: var(--cai-input);
        box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2), inset 0 2px 4px rgba(0,0,0,0.1);
      }
      .conversaai-widget-input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--cai-text);
        font-size: 14px;
        outline: none;
        padding: 8px 0;
      }
      .conversaai-widget-input::placeholder {
        color: var(--cai-muted);
      }
      .conversaai-widget-input:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      .conversaai-widget-send {
        background: linear-gradient(135deg, var(--cai-primary), var(--cai-secondary));
        color: white;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 8px;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
      .conversaai-widget-send:hover {
        transform: scale(1.1) rotate(-5deg);
        box-shadow: 0 4px 10px rgba(124, 58, 237, 0.3);
      }
      .conversaai-widget-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      .conversaai-widget-send svg {
        width: 16px;
        height: 16px;
        margin-left: -2px;
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
        background-color: var(--cai-assistant);
        border: 1px solid var(--cai-border);
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        align-self: flex-start;
        width: fit-content;
      }
      .conversaai-dot {
        width: 6px;
        height: 6px;
        background-color: var(--cai-muted);
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
      @keyframes cai-launcher-pulse {
        0% { opacity: .5; transform: scale(.88); }
        65%, 100% { opacity: 0; transform: scale(1.45); }
      }
      @keyframes cai-status-pulse {
        0% { opacity: .7; transform: scale(.65); }
        75%, 100% { opacity: 0; transform: scale(1.35); }
      }
      @media (prefers-reduced-motion: reduce) {
        .conversaai-widget-button-wrapper::before,
        .conversaai-widget-launcher-status::after,
        .conversaai-message,
        .conversaai-typing { animation: none !important; }
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

    const presence = document.createElement('div');
    presence.className = 'conversaai-widget-presence';
    presence.id = 'conversaai-widget-presence';
    const presenceDot = document.createElement('span');
    presenceDot.className = 'conversaai-widget-presence-dot';
    const presenceText = document.createElement('span');
    presenceText.id = 'conversaai-widget-presence-text';
    presenceText.textContent = 'Disponible para ayudarte';
    presence.appendChild(presenceDot);
    presence.appendChild(presenceText);

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
    panel.appendChild(presence);
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

    const launcherStatus = document.createElement('span');
    launcherStatus.className = 'conversaai-widget-launcher-status';
    launcherStatus.setAttribute('aria-label', 'Asistente en línea');
    launcherStatus.setAttribute('title', 'En línea');

    buttonWrapper.appendChild(launcherText);
    buttonWrapper.appendChild(launcherBtn);
    buttonWrapper.appendChild(launcherStatus);

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

  function getLauncherIconSVG() {
    if (config && config.launcherIcon === 'sparkles') return sparklesIconSVG;
    if (config && config.launcherIcon === 'support') return supportIconSVG;
    return chatIconSVG;
  }

  function toggleWidget() {
    isOpen = !isOpen;
    const container = document.getElementById('conversaai-widget-container');
    const panel = document.getElementById('conversaai-widget-panel');
    const launcherBtn = document.getElementById('conversaai-launcher-btn');
    const input = document.getElementById('conversaai-input');
    
    if (isOpen) {
      panel.classList.add('conversaai-open');
      container.classList.add('cai-is-open');
      launcherBtn.innerHTML = closeIconSVG;
      const launcherTextEl = document.getElementById('conversaai-launcher-text');
      if (launcherTextEl) launcherTextEl.classList.remove('cai-show');
      if (!isChatBlocked) {
        setTimeout(() => input.focus(), 100);
        // Refresh config in case it was updated in the dashboard
        fetchConfig();
        pollHumanMessages();
      }
    } else {
      panel.classList.remove('conversaai-open');
      container.classList.remove('cai-is-open');
      launcherBtn.innerHTML = getLauncherIconSVG();
      const launcherTextEl = document.getElementById('conversaai-launcher-text');
      if (launcherTextEl && config && config.launcherMode === 'icon-text' && config.launcherText) {
        launcherTextEl.classList.add('cai-show');
      }
    }
  }

  async function fetchConfig() {
    try {
      const configUrl = `${baseUrl}/api/widget/config?assistantId=${assistantId}&t=${Date.now()}`;
      const res = await fetch(configUrl, { cache: 'no-store' });
      if (res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        blockChat(errorData.error || "El chat no está disponible en este momento.");
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
        launcherSize: wConfig.launcherSize || 'medium',
        launcherShape: wConfig.launcherShape || 'circle',
        launcherIcon: wConfig.launcherIcon || 'chat',
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
    const launcherBtn = document.getElementById('conversaai-launcher-btn');
    const launcherTextEl = document.getElementById('conversaai-launcher-text');
    const titleEl = document.getElementById('conversaai-widget-title');
    const subtitleEl = document.getElementById('conversaai-widget-subtitle');
    const avatarEl = document.getElementById('conversaai-widget-avatar');

    // CSS variables
    container.style.setProperty('--cai-primary', config.primaryColor);
    container.style.setProperty('--cai-secondary', config.secondaryColor);

    // Position
    container.classList.toggle('cai-pos-left', config.position === 'bottom-left');
    container.classList.remove('cai-size-small', 'cai-size-large', 'cai-shape-rounded');
    if (config.launcherSize === 'small') container.classList.add('cai-size-small');
    if (config.launcherSize === 'large') container.classList.add('cai-size-large');
    if (config.launcherShape === 'rounded') container.classList.add('cai-shape-rounded');
    if (!isOpen) launcherBtn.innerHTML = getLauncherIconSVG();

    // Apply the selected theme to the whole widget, not only the header.
    container.classList.remove('cai-theme-modern', 'cai-theme-minimal', 'cai-theme-premium');
    container.classList.add(`cai-theme-${config.theme}`);

    // Text content safely
    titleEl.textContent = config.displayName;
    subtitleEl.textContent = config.subtitle;
    
    // Avatar first letter
    const firstLetter = config.displayName.trim().charAt(0).toUpperCase();
    avatarEl.textContent = firstLetter || 'A';

    // Launcher text safely
    launcherTextEl.classList.remove('cai-show');
    if (config.launcherMode === 'icon-text' && config.launcherText && !isOpen) {
      launcherTextEl.textContent = config.launcherText;
      launcherTextEl.classList.add('cai-show');
    }

    // Render Welcome Message only if chat is empty
    const messages = document.getElementById('conversaai-messages');
    if (messages.children.length === 0) {
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
    } else {
      // Update welcome message text if it exists (it's always the first message)
      const firstMsgText = messages.querySelector('.conversaai-message.assistant');
      if (firstMsgText && !conversationId) { // Only update if no active conversation
         firstMsgText.textContent = config.welcomeMessage;
      }
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

      if (data.humanHandoff) {
        handoffStatus = data.handoffStatus || 'waiting';
        updatePresence();
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

  function appendMessage(text, sender, senderType) {
    const messages = document.getElementById('conversaai-messages');
    const wrap = document.createElement('div');
    wrap.className = `conversaai-message-wrap ${sender}`;
    const msgDiv = document.createElement('div');
    msgDiv.className = `conversaai-message ${sender}${senderType === 'human' ? ' human' : ''}`;
    // Secure text injection
    msgDiv.textContent = text;
    const meta = document.createElement('span');
    meta.className = 'conversaai-message-meta';
    meta.textContent = `${sender === 'user' ? 'Tú' : senderType === 'human' ? 'Equipo' : 'Asistente'} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    wrap.appendChild(msgDiv);
    wrap.appendChild(meta);
    messages.appendChild(wrap);
    scrollToBottom();
  }

  function updatePresence() {
    const text = document.getElementById('conversaai-widget-presence-text');
    const subtitle = document.getElementById('conversaai-widget-subtitle');
    if (!text) return;
    if (handoffStatus === 'human') {
      text.textContent = 'Una persona del equipo está contigo';
      if (subtitle) subtitle.textContent = 'Atención humana';
    } else if (handoffStatus === 'waiting') {
      text.textContent = 'Avisamos al equipo · puedes seguir escribiendo';
      if (subtitle) subtitle.textContent = 'Esperando al equipo';
    } else {
      text.textContent = 'Disponible para ayudarte';
      if (subtitle && config) subtitle.textContent = config.subtitle;
    }
  }

  async function pollHumanMessages() {
    if (!conversationId || isChatBlocked || document.hidden) return;
    try {
      const query = new URLSearchParams({ assistantId, conversationId, visitorId });
      if (lastHumanMessageAt) query.set('after', lastHumanMessageAt);
      const res = await fetch(`${baseUrl}/api/widget/messages?${query.toString()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      handoffStatus = data.handoffStatus || 'ai';
      updatePresence();
      (data.messages || []).forEach(message => {
        if (seenHumanMessages.has(message.id)) return;
        seenHumanMessages.add(message.id);
        appendMessage(message.content, 'assistant', 'human');
        lastHumanMessageAt = message.created_at;
      });
    } catch (error) {
      console.warn('[ConversaAI Widget] No se pudieron actualizar las respuestas humanas.', error);
    }
  }

  window.setInterval(() => {
    if (isOpen) pollHumanMessages();
  }, 4000);

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
