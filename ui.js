/* FinRead — ui.js: DOM helpers, toast, dialog, TTS */
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => Array.from(document.querySelectorAll(s));
    const show = (s) => $(s).classList.remove('hidden');
    const hide = (s) => $(s).classList.add('hidden');
    const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const hasChinese = (s) => /[\u4e00-\u9fa5]/.test(s);
    const isUrl = s => /^https?:\/\/.{4}/i.test(s.trim());

    function extractArticleText(html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // \u79fb\u9664\u566a\u97f3\u5143\u7d20
      ['script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside', 'iframe',
        '.nav', '.navigation', '.sidebar', '.ad', '.advertisement',
        '.breadcrumb', '.related', '.recommend', '.comment', '.share', '.social'].forEach(sel => {
          try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch { }
        });
      const cleanText = el => {
        el.querySelectorAll('script,style,noscript').forEach(e => e.remove());
        return el.textContent.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      };
      // \u4f18\u5148\u5c1d\u8bd5\u8bed\u4e49\u5316\u6b63\u6587\u5bb9\u5668
      const SELECTORS = [
        'article', 'main', '[role="main"]',
        '.article-content', '.article-body', '.article-detail', '#article-content',
        '.post-content', '.entry-content', '.content-body', '.news-content',
        '.detail-content', '#content', '#main', '.content',
      ];
      for (const sel of SELECTORS) {
        try {
          const el = doc.querySelector(sel);
          if (!el) continue;
          const t = cleanText(el);
          if (t.length > 150) return t;
        } catch { }
      }
      // \u56de\u9000\uff1a\u62fc\u63a5\u6240\u6709\u6bb5\u843d
      const paras = [...doc.querySelectorAll('p')]
        .map(p => p.textContent.trim()).filter(t => t.length > 25).join('\n\n');
      if (paras.length > 100) return paras;
      // \u6700\u7ec8\u515c\u5e95\uff1abody \u5168\u6587
      return cleanText(doc.body);
    }
    const getEnText = (original, translation) => hasChinese(original) ? translation : original;
    const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

    function toast(msg, type = '', duration = 2400) {
      const el = $('#toast');
      el.innerHTML = '';
      el.appendChild(document.createTextNode(msg));
      el.className = type ? type : '';
      el.classList.add('visible');
      clearTimeout(el._timer);
      el._timer = setTimeout(() => el.classList.remove('visible'), duration);
    }

    function toastWithUndo(msg, type, onUndo, duration = 5000) {
      const el = $('#toast');
      el.innerHTML = '';
      el.appendChild(document.createTextNode(msg));
      const btn = document.createElement('button');
      btn.className = 'toast-undo';
      btn.textContent = '↶ 撤销';
      btn.addEventListener('click', () => {
        clearTimeout(el._timer);
        el.classList.remove('visible');
        onUndo();
      });
      el.appendChild(btn);
      el.className = type ? type : '';
      el.classList.add('visible');
      clearTimeout(el._timer);
      el._timer = setTimeout(() => el.classList.remove('visible'), duration);
    }

    /* ============================================================
     *  UNIFIED DIALOG SYSTEM
     * ============================================================ */
    const DIALOG_ICONS = {
      info: { glyph: 'i', cls: 'info' },
      success: { glyph: '✓', cls: 'success' },
      warn: { glyph: '!', cls: 'warn' },
      danger: { glyph: '⚠', cls: 'danger' },
      question: { glyph: '?', cls: 'info' },
    };

    let _dialogResolve = null;
    function showDialog({ title = '提示', message = '', icon = 'question', confirmText = '确定', cancelText = '', danger = false, list = null }) {
      return new Promise(resolve => {
        _dialogResolve = resolve;
        const ic = DIALOG_ICONS[icon] || DIALOG_ICONS.question;
        const iconEl = $('#dialogIcon');
        iconEl.textContent = ic.glyph;
        iconEl.className = 'dialog-icon ' + ic.cls;
        $('#dialogTitle').textContent = title;
        $('#dialogMessage').textContent = message;
        const listEl = $('#dialogList');
        if (list && list.length) {
          listEl.innerHTML = list.map(item => `<div class="dialog-list-item">${item}</div>`).join('');
          listEl.classList.remove('hidden');
        } else {
          listEl.classList.add('hidden');
          listEl.innerHTML = '';
        }
        const actions = $('#dialogActions');
        actions.innerHTML = '';
        if (cancelText) {
          const cancelBtn = document.createElement('button');
          cancelBtn.className = 'dialog-btn';
          cancelBtn.textContent = cancelText;
          cancelBtn.addEventListener('click', () => closeDialog(false));
          actions.appendChild(cancelBtn);
        }
        const okBtn = document.createElement('button');
        okBtn.className = 'dialog-btn ' + (danger ? 'danger' : 'primary');
        okBtn.textContent = confirmText;
        okBtn.addEventListener('click', () => closeDialog(true));
        actions.appendChild(okBtn);
        $('#dialogOverlay').classList.add('visible');
        setTimeout(() => okBtn.focus(), 50);
      });
    }

    function closeDialog(result) {
      $('#dialogOverlay').classList.remove('visible');
      if (_dialogResolve) { _dialogResolve(result); _dialogResolve = null; }
    }

    function confirmDialog(message, options = {}) {
      return showDialog({
        title: options.title || '请确认',
        message,
        icon: options.danger ? 'danger' : 'warn',
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        danger: !!options.danger,
      });
    }

    function alertDialog(message, options = {}) {
      return showDialog({
        title: options.title || '提示',
        message,
        icon: options.icon || 'info',
        confirmText: options.confirmText || '知道了',
      });
    }

    /* ============================================================
     *  UTILITIES — debounce, throttle, idle
     * ============================================================ */
    function debounce(fn, ms) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
      };
    }

    function throttle(fn, ms) {
      let last = 0, timer;
      return function (...args) {
        const now = Date.now();
        const elapsed = now - last;
        if (elapsed >= ms) { last = now; fn.apply(this, args); }
        else { clearTimeout(timer); timer = setTimeout(() => { last = Date.now(); fn.apply(this, args); }, ms - elapsed); }
      };
    }

    const idle = window.requestIdleCallback || (cb => setTimeout(cb, 1));

    /* ============================================================
     *  CONFETTI CELEBRATION
     * ============================================================ */
    function celebrate(count = 24) {
      const colors = ['#6366F1', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#F97316'];
      for (let i = 0; i < count; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = (Math.random() * 100) + 'vw';
        piece.style.background = colors[i % colors.length];
        piece.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
        piece.style.animationDelay = (Math.random() * 0.4) + 's';
        piece.style.animationDuration = (1.4 + Math.random() * 0.8) + 's';
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 2600);
      }
    }

    let _voicesCache = [];
    function _loadVoices() { _voicesCache = speechSynthesis.getVoices(); }
    if ('speechSynthesis' in window) {
      _loadVoices();
      speechSynthesis.addEventListener('voiceschanged', _loadVoices);
    }
    function pickVoice(lang) {
      if (!_voicesCache.length) _voicesCache = speechSynthesis.getVoices();
      if (state.selectedVoice) {
        const manual = _voicesCache.find(v => v.name === state.selectedVoice);
        if (manual) return manual;
      }
      const isZh = lang.startsWith('zh');
      const enPriority = [
        /Microsoft .+ Online \(Natural\)/i,  // Windows Neural TTS — highest quality on Windows
        /\(Enhanced\)/i,                     // macOS / iOS Enhanced voices — highest quality on Apple
        /Google US English/i,
        /Samantha/i, /Nicky/i, /Daniel/i, /Karen/i, /Moira/i, /Tessa/i,
        /Google UK English/i, /Alex/i, /Fred/i,
        /en-US/i, /en-GB/i, /en-AU/i, /en/i,
      ];
      const zhPriority = [
        /Microsoft .+ Online \(Natural\)/i,  // Windows Neural TTS — e.g. Xiaoxiao, Yunxi
        /\(Enhanced\)/i,                     // macOS / iOS Enhanced — e.g. Tingting Enhanced
        /Tingting/i, /Mei-Jia/i, /Sin-ji/i,
        /Google 普通话/i, /Google .*Chinese/i,
        /zh-CN/i, /zh-TW/i, /zh-HK/i, /zh/i,
      ];
      const targetLangs = isZh ? ['zh-cn', 'zh-tw', 'zh-hk', 'zh'] : ['en-us', 'en-gb', 'en-au', 'en'];
      const langVoices = _voicesCache.filter(v => targetLangs.some(l => v.lang.toLowerCase().startsWith(l)));
      const priorities = isZh ? zhPriority : enPriority;
      for (const pat of priorities) {
        const match = langVoices.find(v => pat.test(v.name));
        if (match) return match;
      }
      return langVoices[0] || _voicesCache[0] || null;
    }
    function speak(text, rate = 0.95, btn = null) {
      if (!('speechSynthesis' in window)) { toast('当前浏览器不支持语音', 'warning'); return; }
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        document.querySelectorAll('.icon-btn.speaking, .btn-base.speaking').forEach(b => b.classList.remove('speaking'));
        return;
      }
      const cleanText = String(text || '').replace(/\*\*/g, '').trim();
      if (!cleanText) return;
      const lang = hasChinese(cleanText) ? 'zh-CN' : 'en-US';
      const voice = pickVoice(lang);
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = voice?.lang || lang;
      utter.rate = rate; utter.pitch = 1.0; utter.volume = 1.0;
      if (voice) utter.voice = voice;
      if (btn) btn.classList.add('speaking');
      utter.onend = () => btn && btn.classList.remove('speaking');
      utter.onerror = () => btn && btn.classList.remove('speaking');
      speechSynthesis.cancel();
      setTimeout(() => speechSynthesis.speak(utter), 30);
    }

