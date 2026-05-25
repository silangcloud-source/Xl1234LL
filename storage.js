/* FinRead — storage.js: constants, state, persistence layer */
    const PATTERN_GOAL = 80;
    const PHRASE_GOAL = 150;
    const DEFAULT_CHUNK_THRESHOLD = 5200;
    const VOCAB_PAGE_SIZE = 60;
    const REQUEST_TIMEOUT_MS = 90000;
    const IDB_NAME = 'finread-local-db';
    const IDB_VERSION = 1;
    const IDB_STORE = 'kv';
    const LOCAL_SHADOW_MAX = 240000;
    const POMO_DURATION = 25 * 60; // seconds
    const POMO_LIMIT = 50;         // max cards per session
    const LEARNING_STEPS = [60_000, 10 * 60_000]; // 1min, 10min
    const MODEL_PRESETS = {
      deepseek: {
        label: 'DeepSeek',
        recommended: false,
        defaultModel: 'deepseek-chat',
        providerHint: '适合使用原生 DeepSeek Key 的用户，直连简单。',
        models: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat / V3', group: '推荐模型', badge: '推荐 · 性价比首选', costLevel: '低成本', speed: '快', quality: '日常解析足够', useCase: '适合大多数财经文章、新闻精读、词卡生成' },
          { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner / R1', group: '深度推理', badge: '推理增强', costLevel: '中等成本', speed: '较慢', quality: '复杂语法更强', useCase: '适合长难句、复杂逻辑、深度语法分析' },
        ],
      },
      openrouter: {
        label: 'OpenRouter',
        recommended: true,
        defaultModel: 'deepseek/deepseek-chat',
        providerHint: '主推通道。使用 DeepSeek Chat via OpenRouter，兼顾速度、稳定性和灵活切换。',
        models: [
          { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat via OpenRouter', group: '推荐模型', badge: '推荐 · 聚合通道首选', costLevel: '低成本', speed: '快', quality: '日常解析足够', useCase: '适合大多数财经文章解析、词卡生成与移动端日常精读' },
          { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet', group: '高质量备用', badge: '高质量备用', costLevel: '较高成本', speed: '中等', quality: '解释质量更强', useCase: '适合重要文章、高质量解释、复杂文本' },
          { id: 'google/gemini-2.5-flash', name: 'Gemini Flash', group: '聚合通道', badge: '速度备用', costLevel: '中等成本', speed: '快', quality: '平衡', useCase: '适合速度优先的文章解析' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', group: '聚合通道', badge: '轻量备用', costLevel: '中等成本', speed: '快', quality: '平衡', useCase: '适合轻量解析和备用通道' },
        ],
      },
      anthropic: {
        label: 'Anthropic',
        recommended: false,
        defaultModel: 'claude-haiku-4-5-20251001',
        providerHint: '适合已有 Anthropic 账号、重视解释质量的用户。',
        models: [
          { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku', group: '推荐模型', badge: '速度优先', costLevel: '中等成本', speed: '快', quality: '日常解析足够', useCase: '适合快速解析和轻量精读' },
          { id: 'claude-sonnet-4-6', name: 'Claude Sonnet', group: '高质量备用', badge: '高质量备用', costLevel: '较高成本', speed: '中等', quality: '复杂分析更强', useCase: '适合重要文章、高质量解释、复杂文本' },
          { id: 'claude-opus-4-7', name: 'Claude Opus', group: '深度推理', badge: '深度分析', costLevel: '较高成本', speed: '较慢', quality: '复杂分析更强', useCase: '适合长难句和高质量深度解析' },
        ],
      },
    };
    const MODELS = Object.fromEntries(Object.entries(MODEL_PRESETS).map(([provider, preset]) => [
      provider,
      preset.models.map(m => ({ ...m, label: `${m.name} · ${m.badge}`, cost: `${m.costLevel} · ${m.speed} · ${m.quality}`, recommended: m.id === preset.defaultModel })),
    ]));

    const STORE = {
      vocab: 'finread:vocab:v5',
      vocabLegacy: 'finread:vocab:v3',
      articles: 'finread:articles:v5',
      wordHistory: 'finread:wordHistory:v5',
      reviewLog: 'finread:reviewLog:v5',
      apiKey: 'finread:apikey',
      provider: 'finread:provider',
      model: 'finread:model',
      theme: 'finread:theme',
      streaming: 'finread:streaming',
      chunkThreshold: 'finread:chunkThreshold',
      jsonbin: 'finread:jsonbin',
      webdav: 'finread:webdav',
      studyMode: 'finread:studyMode',
      voice: 'finread:voice',
      reminderTime: 'finread:reminderTime',
      notifications: 'finread:notifications',
      draft: 'finread:draft',
      dailyGoals: 'finread:dailyGoals',
      apiKeyMode: 'finread:apiKeyMode',
      gestureHintSeen: 'finread:gestureHintSeen:v6',
      recallGate: 'finread:settings:recallGate',
      secureApiKey: 'finread:secureApiKey:v1',
      aiErrorLog: 'finread:aiErrorLog:v7',
    };

    const IDB_DATA_KEYS = new Set([STORE.vocab, STORE.articles, STORE.wordHistory, STORE.reviewLog]);

    const _parseCache = new Map(); // key: content hash → parsed result
    function _hashText(text) {
      let h = 0;
      for (let i = 0; i < Math.min(text.length, 2000); i++) { h = (h * 31 + text.charCodeAt(i)) | 0; }
      return h + '_' + text.length;
    }

    const PROPER_TYPE_LABELS = {
      organization: '机构', person: '人物', place: '地点',
      index: '指数', event: '事件', currency: '货币',
      instrument: '工具', company: '公司', country: '国家',
      other: '其他'
    };

    let state = {
      view: 'input', analysis: null, currentArticleId: null,
      vocab: [], articles: [], wordHistory: {}, reviewLog: [],
      apiKey: '', provider: 'openrouter', model: 'deepseek/deepseek-chat',
      streaming: true, chunkThreshold: DEFAULT_CHUNK_THRESHOLD,
      jsonbin: { apiKey: '', binId: '', lastSync: 0 },
      webdav: { url: 'https://dav.jianguoyun.com/dav/', username: '', password: '', path: '/finread-sync.json', lastSync: 0 },
      studyMode: 'en2zh',
      activeId: null, flipIdx: 0, flipped: false,
      showZh: true, showGr: false, showFullTrans: false,
      currentRequest: null,
      vocabFilter: 'all', vocabSearch: '',
      sideTab: 'pattern', customAddTier: 'vocab',
      currentSelection: { text: '', context: '' },
      parseSession: null,
      selectedVoice: '',
      reminderTime: '09:00',
      notificationsEnabled: false,
      storageStatus: { mode: 'localStorage', migrated: false, lastError: '' },
      dailyGoals: { reviewTarget: 20, articleTarget: 1 },
      historySearch: '',
      apiKeyMode: 'local',
      trainingMode: 'full',
      session: { active: false, startTs: null, reviewed: 0, good: 0, hard: 0, again: 0, mode: 'full' },
      confuseQuiz: { deck: [], idx: 0, current: null, answered: false },
      mistakeFilter: { reason: 'all', sort: 'wrongCount', recentOnly: false, highOnly: false },
      pendingMistake: null,
      recallGate: true,
      recallGateReady: true,
      recallGateTimer: null,
      clozeActive: false,
      clozeHintUsed: false,
      clozeForce: false,
      clozeDeckOverride: null,
      v69Training: { mode: '', queue: [], idx: 0, current: null, answered: false, stats: { total: 0, correct: 0, hard: 0, wrong: 0 } },
      v69SecureUnlocked: false,
      aiErrorLog: [],
      aiRecovery: { stage: '', message: '', collapsed: false },
      chunkStatus: [],
      lastAIError: null,
      lastFailedChunks: [],
    };


    function safeLocalStorageSet(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          console.warn('localStorage quota exceeded:', key);
          toast('存储空间已满，正在清理旧数据...', 'warning');
          // 尝试清理策略：保留最近的数据
          if (key === STORE.reviewLog) {
            const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 只保留30天
            state.reviewLog = state.reviewLog.filter(r => r.ts > cutoff);
            try { localStorage.setItem(key, JSON.stringify(state.reviewLog)); return true; }
            catch { return false; }
          } else if (key === STORE.articles) {
            state.articles = state.articles.slice(0, 50); // 只保留最近50篇
            try { localStorage.setItem(key, JSON.stringify(state.articles)); return true; }
            catch { return false; }
          }
          return false;
        }
        console.error('localStorage error:', e);
        return false;
      }
    }

    function safeLocalStorageRemove(key) {
      try { localStorage.removeItem(key); } catch { }
    }

    let _idbPromise = null;
    function openFinreadDb() {
      if (!('indexedDB' in window)) return Promise.resolve(null);
      if (_idbPromise) return _idbPromise;
      _idbPromise = new Promise(resolve => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'key' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          state.storageStatus.lastError = req.error?.message || 'IndexedDB open failed';
          resolve(null);
        };
        req.onblocked = () => {
          state.storageStatus.lastError = 'IndexedDB upgrade blocked';
          resolve(null);
        };
      });
      return _idbPromise;
    }

    async function idbGet(key) {
      const db = await openFinreadDb();
      if (!db) return undefined;
      state.storageStatus.mode = 'IndexedDB';
      return new Promise(resolve => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : undefined);
        req.onerror = () => {
          state.storageStatus.lastError = req.error?.message || 'IndexedDB read failed';
          resolve(undefined);
        };
      });
    }

    async function idbSet(key, value) {
      const db = await openFinreadDb();
      if (!db) return false;
      return new Promise(resolve => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put({ key, value, updatedAt: Date.now() });
        tx.oncomplete = () => { state.storageStatus.mode = 'IndexedDB'; resolve(true); };
        tx.onerror = () => {
          state.storageStatus.lastError = tx.error?.message || 'IndexedDB write failed';
          resolve(false);
        };
      });
    }

    async function idbDelete(key) {
      const db = await openFinreadDb();
      if (!db) return false;
      return new Promise(resolve => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }

    async function clearFinreadDb() {
      const db = await openFinreadDb();
      if (!db) return false;
      return new Promise(resolve => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }

    function jsonSize(value) {
      try { return JSON.stringify(value).length; } catch { return 0; }
    }

    function summarizeDataPayload(data) {
      const vocab = data?.vocab || [];
      const byTier = vocab.reduce((acc, w) => {
        const tier = w.tier || 'vocab';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {});
      const reviewed = vocab.filter(w => w.lastReview).length;
      return {
        vocab: vocab.length,
        articles: (data?.articles || []).length,
        wordHistory: Object.keys(data?.wordHistory || {}).length,
        reviewLog: (data?.reviewLog || []).length,
        reviewed,
        byTier,
        size: jsonSize(data),
      };
    }

    function formatBytes(bytes) {
      if (!bytes) return '0 B';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    }

    function tierSummaryText(byTier = {}) {
      const labels = { pattern: '句式', phrase: '短语', proper: '专名', vocab: '词汇' };
      return Object.entries(labels)
        .map(([k, label]) => `${label} ${byTier[k] || 0}`)
        .join(' · ');
    }

    function estimateImportMerge(remote) {
      const localMap = new Map(state.vocab.map(v => [`${v.tier}::${v.word}`, v]));
      let add = 0, update = 0, same = 0;
      (remote.vocab || []).forEach(rv => {
        const lv = localMap.get(`${rv.tier}::${rv.word}`);
        if (!lv) add++;
        else if ((rv.lastReview || 0) > (lv.lastReview || 0)) update++;
        else same++;
      });
      const localArticleIds = new Set(state.articles.map(a => a.id));
      const articleAdd = (remote.articles || []).filter(a => !localArticleIds.has(a.id)).length;
      return { add, update, same, articleAdd };
    }

    function buildImportPreview(data) {
      const incoming = summarizeDataPayload(data);
      const local = summarizeDataPayload({
        vocab: state.vocab,
        articles: state.articles,
        wordHistory: state.wordHistory,
        reviewLog: state.reviewLog,
      });
      const merge = estimateImportMerge(data);
      return [
        `<b>备份内容</b>：${incoming.vocab} 张卡 · ${incoming.articles} 篇文章 · ${incoming.reviewLog} 条复习记录 · ${formatBytes(incoming.size)}`,
        `<b>备份层级</b>：${tierSummaryText(incoming.byTier)}`,
        `<b>当前本机</b>：${local.vocab} 张卡 · ${local.articles} 篇文章 · ${local.reviewLog} 条复习记录`,
        `<b>预计合并</b>：新增 ${merge.add} 张卡 · 更新 ${merge.update} 张卡 · 跳过 ${merge.same} 张重复卡 · 新增 ${merge.articleAdd} 篇文章`,
      ];
    }

    async function loadJsonStore(key, fallback) {
      if (IDB_DATA_KEYS.has(key)) {
        const idbValue = await idbGet(key);
        if (idbValue !== undefined) {
          state.storageStatus.mode = 'IndexedDB';
          return idbValue;
        }
      }
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      try {
        const parsed = JSON.parse(raw);
        if (IDB_DATA_KEYS.has(key)) {
          const ok = await idbSet(key, parsed);
          state.storageStatus.migrated = state.storageStatus.migrated || ok;
        }
        return parsed;
      } catch (e) {
        console.warn('store parse failed:', key, e);
        return fallback;
      }
    }

    function writeStorageMeta(key, value, size) {
      const meta = {
        updatedAt: Date.now(),
        size,
        count: Array.isArray(value) ? value.length : Object.keys(value || {}).length,
        mode: state.storageStatus.mode,
      };
      safeLocalStorageSet(`${key}:meta`, JSON.stringify(meta));
    }

    function persistJsonStore(key, value) {
      const raw = JSON.stringify(value);
      if (!IDB_DATA_KEYS.has(key)) return safeLocalStorageSet(key, raw);
      idbSet(key, value).then(ok => {
        if (!ok) {
          state.storageStatus.mode = 'localStorage';
          safeLocalStorageSet(key, raw);
          return;
        }
        writeStorageMeta(key, value, raw.length);
        if (raw.length <= LOCAL_SHADOW_MAX) safeLocalStorageSet(key, raw);
        else safeLocalStorageRemove(key);
      });
      return true;
    }

    async function flushJsonStore(key, value) {
      if (!IDB_DATA_KEYS.has(key)) return safeLocalStorageSet(key, JSON.stringify(value));
      const ok = await idbSet(key, value);
      if (!ok) safeLocalStorageSet(key, JSON.stringify(value));
      return ok;
    }

    let _persistVocabTimer = null;
    function persistVocab() {
      updateAllCounts();
      invalidateHighlightCache();
      clearTimeout(_persistVocabTimer);
      _persistVocabTimer = setTimeout(() => {
        persistJsonStore(STORE.vocab, state.vocab);
      }, 200);
    }
    function flushPersistVocab() {
      if (_persistVocabTimer === null) return;
      clearTimeout(_persistVocabTimer);
      _persistVocabTimer = null;
      flushJsonStore(STORE.vocab, state.vocab);
    }
    function persistArticles() {
      persistJsonStore(STORE.articles, state.articles);
      $('#articleCount').textContent = state.articles.length;
      renderV64Dashboard();
    }
    function persistWordHistory() {
      persistJsonStore(STORE.wordHistory, state.wordHistory);
    }
    function persistReviewLog() {
      const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
      state.reviewLog = state.reviewLog.filter(r => r.ts > cutoff);
      persistJsonStore(STORE.reviewLog, state.reviewLog);
      renderV64Dashboard();
    }
    function persistJsonbin() { safeLocalStorageSet(STORE.jsonbin, JSON.stringify(state.jsonbin)); }
    function persistWebdav() { safeLocalStorageSet(STORE.webdav, JSON.stringify(state.webdav)); }

    function countByTier(tier) { return state.vocab.filter(v => v.tier === tier).length; }
    function getReviewPool() { return state.vocab.filter(v => !v.lastReview || v.due <= Date.now()); }
    function updateAllCounts() {
      const total = state.vocab.length;
      $('#vocabCount').textContent = total;
      $('#vocabTotal').textContent = total;
      const due = getReviewPool().length;
      $('#dueToday').textContent = due;
      // Bottom tab bar due badge
      const badge = $('#btVocabBadge');
      if (badge) {
        if (due > 0) { badge.textContent = due > 99 ? '99+' : due; badge.classList.remove('hidden'); }
        else badge.classList.add('hidden');
      }
      const reviewBadge = $('#btReviewBadge');
      if (reviewBadge) {
        if (due > 0) { reviewBadge.textContent = due > 99 ? '99+' : due; reviewBadge.classList.remove('hidden'); }
        else reviewBadge.classList.add('hidden');
      }
      const pCount = countByTier('pattern');
      const phCount = countByTier('phrase');
      $('#headerPatternCount').textContent = pCount;
      $('#statPattern').textContent = pCount;
      $('#statPhrase').textContent = phCount;
      $('#statProper').textContent = countByTier('proper');
      $('#statVocab').textContent = countByTier('vocab');
      $('#statDue').textContent = getReviewPool().length;
      const pPct = Math.min(100, Math.round(pCount / PATTERN_GOAL * 100));
      $('#patternProgressFill').style.width = pPct + '%';
      $('#patternProgressLabel').textContent = `完成度 ${pPct}%`;
      const phPct = Math.min(100, Math.round(phCount / PHRASE_GOAL * 100));
      $('#phraseProgressFill').style.width = phPct + '%';
      $('#phraseProgressLabel').textContent = `完成度 ${phPct}%`;
      pomoUpdateStartHint();
      renderV64Dashboard();
      if (typeof updateHomeStats === 'function') updateHomeStats();
    }

    async function ensureNotificationPermission() {
      if (!state.notificationsEnabled) return false;
      if (!('Notification' in window)) {
        state.notificationsEnabled = false;
        safeLocalStorageSet(STORE.notifications, 'false');
        toast('当前浏览器不支持系统通知', 'warning');
        return false;
      }
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          state.notificationsEnabled = false;
          safeLocalStorageSet(STORE.notifications, 'false');
          toast('系统通知未开启，已保持 App 内提醒', 'warning');
          return false;
        }
      }
      return Notification.permission === 'granted';
    }

    function maybeShowReviewNotification() {
      if (!state.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
      const due = getReviewPool().length;
      if (due <= 0) return;
      const [rh, rm] = (state.reminderTime || '09:00').split(':').map(Number);
      const now = new Date();
      const pastReminder = now.getHours() > rh || (now.getHours() === rh && now.getMinutes() >= rm);
      const todayKey = now.toDateString();
      const lastNotif = localStorage.getItem('finread:lastNotif');
      if (pastReminder && lastNotif !== todayKey) {
        safeLocalStorageSet('finread:lastNotif', todayKey);
        new Notification('FinRead 复习提醒', {
          body: `今日有 ${due} 张卡片待复习。`,
          icon: './icon-192.png',
          tag: 'finread-review',
        });
      }
    }

    function extractArrayItems(text, key) {
      const startMatch = text.match(new RegExp(`"${key}"\\s*:\\s*\\[`));
      if (!startMatch) return [];
      let i = startMatch.index + startMatch[0].length;
      const items = [];
      let depth = 0, start = i, inStr = false, esc = false;
      while (i < text.length) {
        const c = text[i];
        if (esc) { esc = false; i++; continue; }
        if (c === '\\') { esc = true; i++; continue; }
        if (c === '"') { inStr = !inStr; i++; continue; }
        if (!inStr) {
          if (c === '{') { if (depth === 0) start = i; depth++; }
          else if (c === '}') {
            depth--;
            if (depth === 0) { try { items.push(JSON.parse(text.slice(start, i + 1))); } catch { } }
          } else if (c === ']' && depth === 0) break;
        }
        i++;
      }
      return items;
    }
    function extractStringField(text, key) {
      const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
      const m = text.match(re);
      if (!m) return null;
      try { return JSON.parse('"' + m[1] + '"'); } catch { return m[1]; }
    }

