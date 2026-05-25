/* FinRead — app.js: AI parsing, vocab/review rendering, init */
    const SAMPLE = `The Federal Reserve held interest rates steady on Wednesday, signaling a more cautious approach as policymakers grapple with persistent inflation and a softening labor market. Chair Jerome Powell emphasized that the central bank's decisions would remain data-dependent, with markets now pricing in only one rate cut by year-end. The yield on the 10-year U.S. Treasury note climbed 8 basis points to 4.32%, while the S&P 500 pared earlier gains to close marginally lower. European Central Bank officials are expected to follow suit, maintaining their hawkish stance amid rising commodity prices.`;

    const VERSION_CONFIG = {
      current: 'v7.1',
      name: 'Guided Setup & AI Resilience Pipeline',
      changelog: [
        '2026-05-24  v7.1  OpenRouter 推荐配置 · 精简同步入口 · 三档闪卡复习 · 移动端词卡抽屉优化 · iPad/Safari 解析兼容改进',
        '2026-05-24  v7.1 · Guided Setup & AI Resilience Pipeline：必填标识 · 配置 Checklist · OpenRouter 推荐配置 · AI 预检 · 自动重试/精简解析 · JSON 修复 · Schema 兜底 · 分块失败恢复 · 本地阅读兜底 · Recovery/Error Panel · AI 错误日志导出',
        '2026-05-24  v6.9 · Recall Training & Mistake Diagnosis',
        '2026-05-23  v6.8  Learning Steps + Interval Fuzz · 翻面 Recall Gate · Cloze 语境填空卡型',
        '2026-05-23  v6.7  Memory Upgrade：易混词对比测验 · 手机复习手势 · 错题本系统',
        '2026-05-23  v6.5.4  专注复习界面：隐藏词库列表/统计/导航/浮窗干扰 · 独立复习入口 · ESC 退出专注',
        '2026-05-23  v6.5.3  修复语法功能：兼容多种 grammar 字段 · 本地兜底句法分析 · 空白语法提示',
        '2026-05-23  v6.5.2  数据层优化：IndexedDB 主存储 · localStorage 兼容迁移 · 导入预览摘要 · 存储状态自检',
        '2026-05-23  v6.5.1  体验优化：不打扰通知 · 离线打开更稳 · 词库渲染防旧批次覆盖 · 请求超时保护 · 低动态效果支持',
        '2026-05-23  v6.5  二阶段智能升级：AI 解析模式 · 输入预检 · 导师 Prompt · 学习包导出 · 数据健康中心 · 备份导入入口',
        '2026-05-23  v6.4.1  一阶段产品升级：学习指挥台 · 今日评分 · 任务清单 · 学习报告 · 本地备份 · 专注模式 · 移动端细节优化',
        '2026-05-23  v6.4  学习闭环：今日首页 · 学习路径 · 金融主题库 · GPT-5.5 通道选项',
        '2026-05-22  v6.3  布局优化：1440px 大屏支持 · 译文/语法标签触摸优化 · 顶栏图标化收纳 · 移除 Gist 与快讯',
        '2026-05-22  v6.2  FXStreet 内嵌新闻源：📰 按钮直接拉取最新头条 · 一键载入到输入框 · 5分钟缓存',
        '2026-05-22  v6.1  番茄复习：25分钟倒计时 · 50词单次上限 · 快速多轮巩固未掌握词 · 自动翻面重置',
        '2026-05-22  v6.0  GitHub Gist 跨设备同步：卡组/档案/复习日志 · 智能合并 · 启动拉取+变化推送',
        '2026-05-22  v5.9  修复电脑/手机精读空白：两处lookbehind正则兼容旧Safari · finalizeAnalysis容错保护',
        '2026-05-22  v5.8  AI造句：自动将10个词编成金融英语例句 · 词语高亮 · 一键重新生成',
        '2026-05-22  v5.7  Premium iOS质感：暖色调 · Inter字体 · 大圆角 · 底部TabBar · 按压反馈 · 光泽按钮',
        '2026-05-22  v5.6  词汇写作挑战：随机抽10词 · 实时高亮已用词 · AI流式点评打分',
        '2026-05-22  v5.5  连接等待计时器 · URL自动识别 · 链接按钮从URL中提取地址',
        '2026-05-22  v5.4  统一弹窗 · 撤销删除 · ESC关闭 · 快捷键面板(?) · 目标庆祝 · 90天热力图 · 分页 · 防抖搜索',
        '2026-05-22  v5.3  连续打卡 · 每日目标 · 草稿保存 · 单词联动 · 历史搜索 · 一键复制',
        '2026-05-22  v5.2  词族网络 · AI写作评批 · Anki导出 · 复习通知',
        '2026-05-22  v5.1  首屏极简主义重构，优化视觉重心',
        '2026-05-22  v5.0  深度学习模块 · 考点标签 · TTS 语音选择器',
      ],
    };


    function v68_learningStep(card) {
      return typeof card?.learningStep === 'number' ? card.learningStep : LEARNING_STEPS.length;
    }
    function v68_intervalLabel(interval) {
      if (interval < 1) return '<1d';
      if (interval < 30) return interval + 'd';
      if (interval < 365) return Math.round(interval / 30) + 'mo';
      return Math.round(interval / 365) + 'y';
    }
    function v68_dueLabelFromMs(dueMs) {
      if (dueMs <= 90_000) return '1m';
      if (dueMs <= 11 * 60_000) return '10m';
      return v68_intervalLabel(Math.max(1, Math.round(dueMs / 86400000)));
    }
    function sm2(card, quality) {
      let { interval = 0, easeFactor = 2.5, reps = 0 } = card;
      let learningStep = v68_learningStep(card);
      let dueMs;
      if (quality < 3) {
        reps = 0;
        interval = 0;
        learningStep = 0;
        dueMs = LEARNING_STEPS[0];
      } else if (learningStep < LEARNING_STEPS.length) {
        learningStep += 1;
        if (learningStep < LEARNING_STEPS.length) {
          dueMs = LEARNING_STEPS[learningStep];
        } else {
          reps = 1;
          interval = 1;
          dueMs = 24 * 60 * 60 * 1000;
        }
      } else {
        if (reps === 0) interval = 1;
        else if (reps === 1) interval = 3;
        else interval = Math.round(interval * easeFactor);
        reps += 1;
        easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
        dueMs = interval * 24 * 60 * 60 * 1000;
      }
      if (interval >= 1 && dueMs >= 24 * 60 * 60 * 1000) {
        const fuzz = 1 + (Math.random() * 0.1 - 0.05);
        dueMs = Math.round(dueMs * fuzz);
      }
      return { interval, easeFactor: +easeFactor.toFixed(2), reps, learningStep, due: Date.now() + dueMs, lastReview: Date.now() };
    }
    function previewInterval(card, quality) {
      const { interval = 0, easeFactor = 2.5, reps = 0 } = card;
      const learningStep = v68_learningStep(card);
      if (quality < 3) return '1m';
      if (learningStep < LEARNING_STEPS.length) {
        const nextStep = learningStep + 1;
        if (nextStep < LEARNING_STEPS.length) return v68_dueLabelFromMs(LEARNING_STEPS[nextStep]);
        return '1d';
      }
      let newInt;
      if (reps === 0) newInt = 1;
      else if (reps === 1) newInt = 3;
      else newInt = Math.round(interval * easeFactor);
      return v68_intervalLabel(newInt);
    }
    function cardStatus(card) {
      if (!card.lastReview) return 'new';
      if (card.due <= Date.now()) return 'due';
      if (card.reps >= 5 && card.interval >= 21) return 'mature';
      return 'learning';
    }

    /* ============================================================
     *  ✦ STORAGE OVERFLOW PROTECTION
     * ============================================================ */

    function buildPrompt(text, isChunk = false, chunkInfo = null) {
      const chunkNote = isChunk ? `\n【分块说明】本片段是长文的第 ${chunkInfo.idx + 1}/${chunkInfo.total} 块。仅处理本片段内容，最终结果会合并。\n` : '';
      return `你是资深双语金融精读老师。请自动识别文本语言，全文对译，逐句精读分析。严格输出 JSON 对象，不要任何解释，不要 markdown 包裹。
${chunkNote}
【核心要求 · 四层词库分类】

1. 侦测语言并互译。
2. 给出【全文翻译】(fullTranslation)。
3. 按句切分原文（引号内不切）。先识别文中所有专有名词，在 sentences[].original 中用 ** 完整包裹对应词语，再将其提取到 properNouns 列表——先标注、后提取，方向不可倒置。
4. 每句精准互译 (translation)。
5. 每句结构化语法分析 grammar: { skeleton, notes, rule_summary }。notes 必须用【时态/语态】、【非谓语】、【三大从句】等【中括号标签】开头。rule_summary 用 1-2 句概括该句最核心的语法亮点。

【四层分类排他性约束 — 严格遵守，不得跨层污染】

▎Tier 1 · 句式 (patterns) — 含变量占位符的可复用句型骨架
· 必须含至少一个变量占位符（如 [index]、X%、[subject]），体现结构中可替换的位置
· 禁止：不含占位符的固定搭配、单个词汇、专有名词进入此层
{ "pattern": "[index] climbed/fell X basis points to Y%", "meaning": "...", "example": "原句", "translation": "原译" }

▎Tier 2 · 短语 (phrases) — 两词及以上的固定搭配／词组，无占位符变量
· 必须是 2 个或以上真实词语构成的固定搭配，整体作为语义单元使用
· 禁止：单个词进入此层（单词归 vocab）；含变量的骨架进入此层（归 patterns）
对每个必须给 collocations（高频搭配示例）和 similar（近义短语+辨析），并评估备考价值：
  · examTags: 从 ["CET-4","CET-6","考研","雅思"] 中选适用标签，无考点价值则留空数组
  · freq: "高频"/"中频"/"低频"，无把握则省略此字段
{ "phrase": "in response to", "type": "介词短语", "translation": "为回应；针对", "note": "...",
  "examTags": ["CET-6"], "freq": "高频",
  "collocations": ["in response to criticism", "..."],
  "similar": [{"phrase":"in reply to","diff":"更书面"}, ...],
  "examples": [{"en":"...","zh":"..."}] }

▎Tier 3 · 专名 (properNouns) — 文中已被 ** 标注的专有名词
· type 必须是 organization/person/place/index/event/currency/instrument/company/country/other
· 禁止：普通词汇、固定短语、句式进入此层
{ "name": "Federal Reserve", "type": "organization", "translation": "美联储", "note": "..." }

▎Tier 4 · 词汇 (vocab) — CET-4 以上的单个金融／学术词汇
· 必须是单个词（含连字符合成词如 risk-averse），不可是短语或句型
· 仅收录文本中实际出现、具有学习价值的专业词，不得凑数
· 禁止：多词短语进入此层（归 phrases）；专有名词进入此层（归 properNouns）
对每个必须给 synonyms 数组（2-4 个近义词，每个附朗文/Collins 风格辨析）、deep_analysis（词根分析或深度语境解析，1-2 句），并评估备考价值。
synonyms.diff 要求：1-2 句，说明该词与主词的核心语义差异、语体色彩、使用场合。仿照词典辨析风格，如：
  read: 最普通用词，含义广泛，既指朗读又可指默读。
  devour: 指贪婪地读，暗含对某些作者或作品迷恋之意。
  scan: 指快速扫视文章等以抓住其要旨。
  · examTags: 从 ["CET-4","CET-6","考研","雅思"] 中选适用标签，无考点价值则留空数组
  · freq: "高频"/"中频"/"低频"，无把握则省略此字段
  · wordFamily: 同根词数组，每项 {"word":"...","pos":"..."}，最多 4 个，仅列真实存在的英语词（如 regulate→regulation/regulatory/deregulate）
  · collocations: 若该词为动词，列出 2-4 个常见动词短语或固定搭配，每项必须含地道例句（宁缺毋滥，非动词可省略）
    格式：{"phrase":"read out","meaning":"大声朗读","example":"The judge read out the verdict.","example_zh":"法官宣读了判决。"}
{ "word": "tighten", "phonetic": "/ˈtaɪtən/", "pos": "v.", "translation": "收紧；加强", "note": "...",
  "examTags": ["CET-6", "考研"], "freq": "高频",
  "synonyms": [{"word":"strengthen","zh":"加强","diff":"语气更中性"}, ...],
  "examples": [{"en":"The Fed is expected to tighten monetary policy.","zh":"美联储预计将收紧货币政策。"}],
  "collocations": [
    {"phrase":"tighten up","meaning":"进一步收紧；整顿","example":"The regulator moved to tighten up oversight of crypto assets.","example_zh":"监管机构着手加强对加密资产的监管。"},
    {"phrase":"tighten the grip","meaning":"加强控制","example":"The central bank tightened its grip on inflation.","example_zh":"央行加强了对通胀的管控。"}
  ],
  "wordFamily": [{"word":"tight","pos":"adj."},{"word":"tightly","pos":"adv."},{"word":"tightening","pos":"n."}],
  "deep_analysis": "词根 tight（紧绷）+ -en（使动化），金融语境中专指货币政策收紧（monetary tightening），与 loosen/ease 对应。" }

【宁缺毋滥原则】各层提取数量不设上下限，完全由文本实际词汇密度决定。文中若无合格素材，对应数组可为空，严禁为凑数而降低标准或跨层混入。

【输出 JSON】
sentences 每项必须使用以下结构：
{ "id": 1, "original": "原句", "translation": "译文", "grammar": { "skeleton": "主干骨架", "notes": ["【时态/语态】...", "【三大从句】..."], "rule_summary": "核心语法亮点" } }

根对象结构：
{ "title": "...", "fullTranslation": "...", "sentences": [...], "patterns": [...], "phrases": [...], "properNouns": [...], "vocab": [...] }

【待分析原文】
${text}`;
    }

    function chunkText(text, threshold) {
      if (text.length <= threshold) return [text];
      const paragraphs = text.split(/\n\s*\n/);
      const chunks = [];
      let cur = '';
      for (const p of paragraphs) {
        if ((cur + '\n\n' + p).length > threshold && cur) { chunks.push(cur.trim()); cur = p; }
        else { cur = cur ? cur + '\n\n' + p : p; }
      }
      if (cur) chunks.push(cur.trim());
      const final = [];
      for (const ch of chunks) {
        if (ch.length <= threshold) { final.push(ch); continue; }
        const sentences = ch.match(/[^.!?。！？]+[.!?。！？]+/g) || [ch];
        let acc = '';
        for (const s of sentences) {
          if ((acc + s).length > threshold && acc) { final.push(acc); acc = s; }
          else acc += s;
        }
        if (acc) final.push(acc);
      }
      return final;
    }

    function mergeAnalyses(parts) {
      const merged = {
        title: parts[0]?.title || 'Untitled',
        fullTranslation: parts.map(p => p.fullTranslation || '').filter(Boolean).join('\n\n'),
        sentences: [], patterns: [], phrases: [], properNouns: [], vocab: [],
      };
      let sentenceOffset = 0;
      for (const p of parts) {
        if (!p) continue;
        (p.sentences || []).forEach((s, i) => merged.sentences.push({ ...s, id: sentenceOffset + i + 1 }));
        sentenceOffset += (p.sentences || []).length;
        (p.patterns || []).forEach(x => { if (!merged.patterns.find(y => y.pattern === x.pattern)) merged.patterns.push(x); });
        (p.phrases || []).forEach(x => { if (!merged.phrases.find(y => y.phrase === x.phrase)) merged.phrases.push(x); });
        (p.properNouns || []).forEach(x => { if (!merged.properNouns.find(y => y.name === x.name)) merged.properNouns.push(x); });
        (p.vocab || []).forEach(x => { if (!merged.vocab.find(y => y.word === x.word)) merged.vocab.push(x); });
      }
      return merged;
    }

    function buildRequest(prompt, stream) {
      let url, headers = { 'Content-Type': 'application/json' };
      const maxTokens = isAppleMobileBrowser() ? 4200 : (state.provider === 'openrouter' ? 5200 : 6000);
      let payload = { model: state.model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens, stream };
      if (state.provider === 'openrouter') {
        url = 'https://openrouter.ai/api/v1/chat/completions';
        headers['Authorization'] = `Bearer ${state.apiKey}`;
        headers['HTTP-Referer'] = location.origin && location.origin !== 'null' ? location.origin : 'http://localhost';
        headers['X-Title'] = 'FinRead';
        if (!stream) payload.response_format = { type: 'json_object' };
      } else if (state.provider === 'deepseek') {
        url = 'https://api.deepseek.com/chat/completions';
        headers['Authorization'] = `Bearer ${state.apiKey}`;
        if (!stream) payload.response_format = { type: 'json_object' };
      } else if (state.provider === 'anthropic') {
        url = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = state.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        payload.stream = false;
      }
      return { url, headers, payload };
    }

    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    function currentApiKeyInputValue() {
      return ($('#scApiKey')?.value || $('#apiKeyInput')?.value || state.apiKey || '').trim();
    }

    function isAppleMobileBrowser() {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
      const isWebKitSafariLike = /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
      return isIOS || isWebKitSafariLike;
    }

    function shouldUseStreaming() {
      if (state.provider === 'anthropic') return false;
      if (isAppleMobileBrowser()) return false;
      return !!state.streaming;
    }

    function getModelMeta(provider = state.provider, model = state.model) {
      return (MODEL_PRESETS[provider]?.models || []).find(m => m.id === model) || null;
    }

    function getDefaultModel(provider = state.provider) {
      return MODEL_PRESETS[provider]?.defaultModel || (MODEL_PRESETS[provider]?.models?.[0]?.id || '');
    }

    function validateAIConfig(options = {}) {
      const provider = ($('#scProvider')?.value || $('#providerSelect')?.value || state.provider || '').trim();
      const model = ($('#scModel')?.value || $('#modelSelect')?.value || state.model || '').trim();
      const apiKey = currentApiKeyInputValue();
      const secureLocked = state.apiKeyMode === 'secure' && !!localStorage.getItem(STORE.secureApiKey) && !apiKey;
      const errors = [];
      const warnings = [];
      if (!provider) errors.push({ type: 'provider_not_configured', message: '还不能开始解析：请先选择 AI Provider。', field: 'provider' });
      if (!model) errors.push({ type: 'model_not_selected', message: '还不能开始解析：请先选择解析模型。', field: 'model' });
      if (provider && model && !getModelMeta(provider, model)) errors.push({ type: 'model_not_found', message: '当前模型不可用，建议使用推荐配置。', field: 'model' });
      if (!apiKey) errors.push({ type: 'missing_api_key', message: secureLocked ? '安全模式需要输入本地密码解锁 API Key。' : '还不能开始解析：请先填写 API Key。', field: 'apiKey' });
      if (provider === 'deepseek' && apiKey && /^sk-or-/i.test(apiKey)) warnings.push('你选择的是 DeepSeek，但 API Key 看起来像 OpenRouter Key。请确认是否填错平台。');
      if (provider === 'openrouter' && apiKey && /^sk-(?!or-)/i.test(apiKey)) warnings.push('你选择的是 OpenRouter，但 API Key 看起来不像 OpenRouter Key。请确认是否填错平台。');
      const result = { ok: !errors.length, provider, model, apiKey, errors, warnings };
      if (!result.ok && options.showGuide !== false) showAIConfigGuide(result);
      if (warnings.length && options.toastWarnings) warnings.forEach(w => toast(w, 'warning'));
      return result;
    }

    function showAIConfigGuide(result) {
      const first = result.errors?.[0];
      $('#errBox').innerHTML = `<div class="ai-error-panel">
        <div class="ai-error-title">配置还没完成</div>
        <div class="ai-error-reason">${escapeHtml(first?.message || '请先完成 AI 配置。')}</div>
        <div class="ai-error-actions">
          <button class="btn-primary" onclick="openSettings()">打开设置中心</button>
          <button class="btn-base" onclick="applyRecommendedConfig()">使用推荐配置</button>
          <button class="btn-base" onclick="closeAIConfigGuide()">我知道了</button>
        </div>
      </div>`;
      show('#errBox');
      renderSettingsPage();
    }

    function closeAIConfigGuide() { hide('#errBox'); }

    function diagnoseAIError(error, context = {}) {
      const msg = String(error?.message || error || '');
      const status = error?.status || error?.httpStatus || 0;
      let type = error?.errorType || 'unknown';
      if (error?.name === 'AbortError') type = context.userAbort ? 'user_abort' : 'timeout';
      else if (!state.provider) type = 'provider_not_configured';
      else if (!state.model) type = 'model_not_selected';
      else if (!state.apiKey && !currentApiKeyInputValue()) type = 'missing_api_key';
      else if (status === 401 || status === 403 || /unauthorized|invalid api key|forbidden|authentication/i.test(msg)) type = 'auth_failed';
      else if (status === 404 || /model.*not.*found|model_not_found|does not exist/i.test(msg)) type = 'model_not_found';
      else if (status === 408 || /timeout|timed out|超时/i.test(msg)) type = 'timeout';
      else if (status === 429 || /rate limit|quota|insufficient|too many/i.test(msg)) type = 'rate_limited';
      else if (status >= 500) type = 'provider_error';
      else if (/failed to fetch|network|dns|cors|load failed/i.test(msg)) type = 'network_error';
      else if (/empty response|空内容/i.test(msg)) type = 'empty_response';
      else if (/json|parse|格式/i.test(msg)) type = 'json_parse_error';
      else if (/schema|字段|缺少/i.test(msg)) type = 'schema_error';
      else if (/context|too long|maximum|token|length/i.test(msg)) type = 'content_too_long';
      const map = {
        missing_api_key: ['缺少 API Key', '你已经选择了 Provider 和 Model，但还没有填写 API Key。', '进入设置中心填写 API Key，或点击“使用推荐配置”。'],
        invalid_api_key: ['API Key 可能无效', 'API Key 可能填错、过期，或不属于当前 Provider。', '检查你是否把 OpenRouter Key 填到了 DeepSeek Provider 下。'],
        provider_not_configured: ['缺少 AI Provider', '还没有选择 AI 服务通道。', '进入设置中心选择 OpenRouter，或选择你已有账号的 Provider。'],
        model_not_selected: ['缺少解析模型', '还没有选择用于解析文章的模型。', '点击“使用推荐配置”可自动选择 OpenRouter · DeepSeek Chat。'],
        model_not_found: ['模型不可用', '当前模型 ID 可能不存在、被服务商下线，或当前账号无权限。', '点击“使用推荐模型重试”，切换到 OpenRouter 推荐模型。'],
        auth_failed: ['API Key 可能无效', '认证失败，Key 可能填错、过期，或不属于当前 Provider。', '检查 Provider 与 Key 是否匹配，然后重新保存。'],
        rate_limited: ['额度不足或请求过快', '当前账号额度不足，或短时间内请求太多。', '稍后重试，或切换其他 Provider。'],
        timeout: ['请求超时', '模型响应太慢，或文章过长。', '使用精简解析、分块解析，或切换到 OpenRouter · DeepSeek Chat。'],
        network_error: ['网络连接失败', '可能是断网、代理异常、CORS、DNS 或服务商接口无法访问。', '检查网络后重试。'],
        empty_response: ['AI 返回空内容', '服务商返回成功但内容为空。', '系统会尝试重试；仍失败时可进入本地阅读模式。'],
        json_parse_error: ['AI 返回格式异常', 'AI 返回了内容，但不是合法 JSON。', '系统将尝试自动修复；如果仍失败，可进入本地阅读模式。'],
        schema_error: ['AI 返回字段不完整', 'AI 返回的 JSON 缺少必要字段。', '系统将补默认值，尽量保留可用结果。'],
        content_too_long: ['文章过长', '当前文章可能超过模型上下文限制。', '启用分块解析，或使用精简解析模式。'],
        provider_error: ['服务商临时异常', 'AI 服务商返回内部错误。', '稍后重试，或切换推荐模型。'],
        user_abort: ['已中止解析', '你主动取消了本次请求。', '可以保留当前结果，或重新解析。'],
        unknown: ['未知错误', '系统无法识别这次失败的具体类型。', '复制错误详情给开发者排查，或进入本地阅读模式。'],
      };
      const [title, reason, suggestion] = map[type] || map.unknown;
      return {
        timestamp: Date.now(),
        taskName: context.taskName || 'AI Request',
        provider: context.provider || state.provider,
        model: context.model || state.model,
        errorType: type,
        httpStatus: status || '',
        title,
        reason,
        suggestion,
        message: msg,
        articleLength: context.articleLength || state.parseSession?.raw?.length || ($('#newsInput')?.value || '').length,
        chunkIndex: context.chunkIndex,
        totalChunks: context.totalChunks,
        retryCount: context.retryCount || 0,
        mode: context.mode || 'full',
        recoveredBy: context.recoveredBy || '',
        rawErrorSummary: msg.slice(0, 1000),
      };
    }

    function persistAIErrorLog() {
      state.aiErrorLog = (state.aiErrorLog || []).slice(-50);
      safeLocalStorageSet(STORE.aiErrorLog, JSON.stringify(state.aiErrorLog));
    }

    function recordAIError(error, context = {}) {
      const diag = diagnoseAIError(error, context);
      state.aiErrorLog = [...(state.aiErrorLog || []), diag].slice(-50);
      state.lastAIError = diag;
      persistAIErrorLog();
      return diag;
    }

    function setAIRecovery(stage, message, compact = false) {
      state.aiRecovery = { stage, message, collapsed: !!compact };
      const el = $('#aiRecoveryPanel');
      if (!el) return;
      if (!stage && !message) { el.classList.add('hidden'); return; }
      el.className = `ai-recovery-panel${compact ? ' compact' : ''}`;
      el.innerHTML = `<div class="ai-stage-row"><strong>${escapeHtml(message || 'AI 恢复管线运行中')}</strong><span class="ai-stage-pill">${escapeHtml(stage || 'READY')}</span></div>${renderChunkRecoveryList()}`;
      el.classList.remove('hidden');
    }

    function renderChunkRecoveryList() {
      const list = state.chunkStatus || [];
      if (!list.length) return '';
      return `<div class="chunk-recovery-list">${list.map((s, i) => `<span class="${escapeHtml(s.status || '')}">#${i + 1} ${escapeHtml(s.status || 'pending')}</span>`).join('')}</div>`;
    }

    async function aiRawRequest(prompt, options = {}) {
      const stream = !!options.stream;
      const { url, headers, payload } = buildRequest(prompt, stream);
      if (!url) throw Object.assign(new Error('Provider 未选择或不可用'), { errorType: 'provider_not_configured' });
      const controller = new AbortController();
      let timedOut = false;
      const timeoutMs = options.timeoutMs || 45000;
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      if (options.signal) {
        if (options.signal.aborted) controller.abort();
        else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
      try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw Object.assign(new Error(`HTTP ${res.status}: ${errText.slice(0, 500)}`), { status: res.status, body: errText });
        }
        if (stream && res.body?.getReader) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '', fullText = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data:')) continue;
              const dataStr = line.slice(5).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const obj = JSON.parse(dataStr);
                const delta = obj.choices?.[0]?.delta?.content || '';
                if (delta) { fullText += delta; options.onProgress && options.onProgress(fullText); }
              } catch { }
            }
          }
          if (!fullText.trim()) throw Object.assign(new Error('empty response'), { errorType: 'empty_response' });
          return fullText;
        }
        const data = await res.json();
        const text = state.provider === 'anthropic' ? data.content?.[0]?.text : data.choices?.[0]?.message?.content;
        if (!String(text || '').trim()) throw Object.assign(new Error('empty response'), { errorType: 'empty_response' });
        return text;
      } catch (e) {
        if (e.name === 'AbortError' && timedOut) throw Object.assign(new Error('请求超时'), { errorType: 'timeout', name: 'AbortError' });
        throw e;
      } finally {
        clearTimeout(timer);
      }
    }

    async function requestAIWithResilience(prompt, options = {}) {
      const cfg = validateAIConfig({ showGuide: options.showGuide !== false, toastWarnings: options.taskName === '文章解析' });
      if (!cfg.ok) throw Object.assign(new Error(cfg.errors[0]?.message || 'AI 配置不完整'), { errorType: cfg.errors[0]?.type || 'provider_not_configured' });
      state.provider = cfg.provider; state.model = cfg.model; state.apiKey = cfg.apiKey;
      const retries = options.retries ?? 2;
      const retryDelay = options.retryDelay ?? 800;
      let lastError = null;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (attempt > 0) {
            setAIRecovery('重试中', `第 ${attempt} 次重试中……`);
            await sleep(retryDelay * Math.pow(2, attempt - 1));
          } else {
            setAIRecovery(options.mode === 'repair' ? '修复 JSON' : '请求中', options.taskName ? `${options.taskName} 请求中...` : 'AI 请求中...');
          }
          const raw = await aiRawRequest(prompt, options);
          setAIRecovery('成功', 'AI 请求成功，正在整理结果...', true);
          return raw;
        } catch (e) {
          lastError = e;
          if (e.errorType === 'user_abort' || e.name === 'AbortError' && options.signal?.aborted) throw e;
          recordAIError(e, { ...options, retryCount: attempt, provider: cfg.provider, model: cfg.model });
        }
      }
      if (options.compactPrompt && options.mode !== 'compact') {
        try {
          setAIRecovery('精简解析', '正在使用精简模式恢复……');
          return await aiRawRequest(options.compactPrompt, { ...options, stream: false, timeoutMs: Math.min(options.timeoutMs || 45000, 45000) });
        } catch (e) {
          lastError = e;
          recordAIError(e, { ...options, mode: 'compact', retryCount: retries, provider: cfg.provider, model: cfg.model });
        }
      }
      throw lastError || new Error('AI 请求失败');
    }

    async function streamRequestProgressive(prompt, controller, onChunk) {
      return requestAIWithResilience(prompt, {
        taskName: '流式 AI 请求',
        stream: shouldUseStreaming(),
        signal: controller?.signal,
        timeoutMs: REQUEST_TIMEOUT_MS,
        retries: 1,
        onProgress: onChunk,
        showGuide: true,
      });
    }

    async function regularRequest(prompt, controller) {
      return requestAIWithResilience(prompt, {
        taskName: 'AI 请求',
        stream: false,
        signal: controller?.signal,
        timeoutMs: REQUEST_TIMEOUT_MS,
        retries: 2,
        showGuide: true,
      });
    }

    function extractJson(rawText) {
      let cleaned = String(rawText || '').trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .replace(/,\s*([}\]])/g, '$1');
      try { JSON.parse(cleaned); return cleaned; } catch { }
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        cleaned = cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1');
        try { JSON.parse(cleaned); return cleaned; } catch { }
      }
      const open = (cleaned.match(/{/g) || []).length;
      const close = (cleaned.match(/}/g) || []).length;
      if (open > close) {
        const fixed = cleaned + '}'.repeat(open - close);
        try { JSON.parse(fixed); return fixed; } catch { }
      }
      throw Object.assign(new Error('AI 返回内容不是合法 JSON'), { errorType: 'json_parse_error', rawText });
    }

    async function repairJsonStructure(rawText, expectedSchema = 'analysis') {
      const repairPrompt = `请把下面内容修复成合法 JSON 对象，只输出 JSON，不要解释。必须包含字段：title, fullTranslation, sentences, patterns, phrases, properNouns, vocab。\n\n原始内容：\n${String(rawText || '').slice(0, 12000)}`;
      const repaired = await requestAIWithResilience(repairPrompt, { taskName: 'JSON 修复', mode: 'repair', retries: 0, timeoutMs: 30000, showGuide: false });
      return extractJson(repaired);
    }

    function normalizeSentenceObject(s, i) {
      const original = String(s?.original || s?.en || s?.sentence || '').replace(/\*\*/g, '').trim();
      return {
        id: i + 1,
        original,
        translation: s?.translation || s?.zh || '暂无译文，可稍后单独生成',
        grammar: s?.grammar || { skeleton: '', notes: [], rule_summary: '' },
        source: s?.source || '',
      };
    }

    function ensureAnalysisSchema(parsed, rawText = '', context = {}) {
      const fallback = localFallbackParse(rawText || state.parseSession?.raw || $('#newsInput')?.value || '', { silent: true, source: 'schema_fallback' });
      const obj = parsed && typeof parsed === 'object' ? parsed : {};
      const sentences = Array.isArray(obj.sentences) && obj.sentences.length ? obj.sentences.map(normalizeSentenceObject).filter(s => s.original) : fallback.sentences;
      if (!sentences.length) throw Object.assign(new Error('AI 返回字段不完整：缺少 sentences'), { errorType: 'schema_error' });
      return {
        title: obj.title || fallback.title,
        summary: obj.summary || '',
        fullTranslation: obj.fullTranslation || obj.translation || '',
        sentences,
        patterns: Array.isArray(obj.patterns) ? obj.patterns : [],
        phrases: Array.isArray(obj.phrases) ? obj.phrases : [],
        properNouns: Array.isArray(obj.properNouns) ? obj.properNouns : [],
        vocab: Array.isArray(obj.vocab || obj.coreVocab) ? (obj.vocab || obj.coreVocab) : [],
        source: obj.source || context.source || '',
      };
    }

    async function parseAIJsonWithRecovery(rawText, sourceText, context = {}) {
      try {
        return ensureAnalysisSchema(JSON.parse(extractJson(rawText)), sourceText, context);
      } catch (e) {
        recordAIError(e, { ...context, taskName: 'JSON 解析', rawErrorSummary: String(rawText || '').slice(0, 1000) });
        try {
          setAIRecovery('修复 JSON', 'AI 返回格式异常，正在自动修复……');
          const repaired = await repairJsonStructure(rawText);
          toast('已自动修复 AI 返回格式。', 'success');
          return ensureAnalysisSchema(JSON.parse(repaired), sourceText, { ...context, recoveredBy: 'json_repair' });
        } catch (repairErr) {
          recordAIError(repairErr, { ...context, mode: 'repair' });
          throw repairErr;
        }
      }
    }

    function robustJsonParse(text) {
      let cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      try { return JSON.parse(cleaned); } catch (e) { }
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) {
        const candidate = cleaned.slice(start, end + 1);
        try { return JSON.parse(candidate); } catch (e) { }
      }
      try {
        return {
          title: extractStringField(cleaned, 'title') || 'Recovered',
          fullTranslation: extractStringField(cleaned, 'fullTranslation') || '',
          sentences: extractArrayItems(cleaned, 'sentences'),
          patterns: extractArrayItems(cleaned, 'patterns'),
          phrases: extractArrayItems(cleaned, 'phrases'),
          properNouns: extractArrayItems(cleaned, 'properNouns'),
          vocab: extractArrayItems(cleaned, 'vocab'),
        };
      } catch (e) { }
      throw new Error('JSON 解析失败，模型可能返回了非结构化内容');
    }

    function localSentenceSplit(text) {
      return String(text || '').replace(/\s+/g, ' ').match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)?.map(s => s.trim()).filter(Boolean) || [];
    }

    function hashText(text) {
      let h = 0;
      for (let i = 0; i < String(text || '').length; i++) h = Math.imul(31, h) + text.charCodeAt(i) | 0;
      return Math.abs(h).toString(36);
    }

    function localFallbackParse(text, options = {}) {
      const raw = String(text || '').trim();
      const sentences = localSentenceSplit(raw);
      const financeWords = new Set('inflation liquidity earnings guidance margin revenue regulation compliance disclosure liability asset equity debt credit default hedge exposure volatility tighten ease yield policy rate recession resilient persistent scrutiny forecast outlook tariff commodity currency'.split(/\s+/));
      const properMap = new Map();
      const vocabMap = new Map();
      const properRe = /\b(?:[A-Z]{2,}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}|[A-Z][A-Za-z&.-]+\s+(?:Inc\.|Corp\.|Ltd\.|Group|Bank|Reserve|Commission|Treasury))\b/g;
      sentences.forEach(sent => {
        (sent.match(properRe) || []).forEach(name => {
          const key = name.toLowerCase();
          if (!properMap.has(key)) properMap.set(key, { name, type: /Inc\.|Corp\.|Ltd\.|Group/i.test(name) ? 'company' : /[A-Z]{2,}/.test(name) ? 'organization' : 'other', translation: '', note: '本地规则识别，待 AI 补全', source: 'local_fallback' });
        });
        (sent.match(/\b[A-Za-z][A-Za-z-]{5,}\b/g) || []).forEach(word => {
          const w = word.toLowerCase();
          const valuable = financeWords.has(w) || /(?:tion|ment|ity|ive|ous|al|ance|ence|ure|ing)$/i.test(word) || word.includes('-') || word.length >= 10;
          if (valuable && !vocabMap.has(w)) vocabMap.set(w, { word: w, translation: '待补全', note: '本地兜底识别，未生成假翻译', source: 'local_fallback' });
        });
      });
      return {
        title: sentences[0]?.slice(0, 80) || 'Local Reading Mode',
        summary: '',
        fullTranslation: '',
        source: options.source || 'local_fallback',
        sentences: sentences.map((s, i) => ({ id: i + 1, original: s, translation: '暂无译文，可稍后单独生成', grammar: { skeleton: '', notes: [], rule_summary: '' }, source: 'local_fallback' })),
        patterns: [],
        phrases: [],
        properNouns: [...properMap.values()].slice(0, 30),
        vocab: [...vocabMap.values()].slice(0, 50),
      };
    }

    function buildCompactPrompt(text, isChunk = false, chunkInfo = null) {
      const chunkNote = isChunk ? `本片段是第 ${chunkInfo.idx + 1}/${chunkInfo.total} 块，只处理本片段。` : '';
      return `你是财经英语精读助手。请用精简模式解析文本。严格输出 JSON，不要 markdown。${chunkNote}
JSON 字段只需要：
{ "title": "", "summary": "", "fullTranslation": "", "sentences": [{"id":1,"original":"","translation":"","grammar":{"skeleton":"","notes":[],"rule_summary":""}}], "vocab": [], "phrases": [], "properNouns": [], "patterns": [] }
要求：不确定的数组留空，不要编造。原文：
${text}`;
    }

    function renderAIErrorPanel(errorLog) {
      const log = errorLog || state.lastAIError || {};
      const fullLog = JSON.stringify(log, null, 2);
      $('#errBox').innerHTML = `<div class="ai-error-panel">
        <div class="ai-error-title">文章解析失败</div>
        <div class="ai-error-reason"><strong>可能原因：${escapeHtml(log.title || '未知错误')}</strong><br>${escapeHtml(log.reason || '')}<br>建议：${escapeHtml(log.suggestion || '可以重试或进入本地阅读模式。')}</div>
        <div class="ai-error-actions">
          <button class="btn-primary" onclick="doAnalyze()">重新解析</button>
          <button class="btn-base" onclick="retryWithRecommendedModel()">使用推荐模型重试</button>
          <button class="btn-base" onclick="doAnalyze({mode:'compact'})">精简解析</button>
          <button class="btn-base" onclick="retryFailedChunks()">只重试失败分块</button>
          <button class="btn-base" onclick="enterLocalFallbackMode()">进入本地阅读模式</button>
          <button class="btn-base" onclick="openSettingsFromAIError()">打开设置中心</button>
          <button class="btn-base" onclick="copyAIErrorDetail()">复制错误详情</button>
        </div>
        <details class="ai-error-details">
          <summary>技术信息</summary>
          <pre>${escapeHtml(fullLog)}</pre>
        </details>
      </div>`;
      show('#errBox');
      setAIRecovery('等待操作', '解析遇到问题，已保留原文和已有结果。');
    }

    function copyAIErrorDetail() {
      const data = JSON.stringify(state.lastAIError || state.aiErrorLog?.slice(-1)?.[0] || {}, null, 2);
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(data).then(() => toast('错误详情已复制', 'success')).catch(() => toast('复制失败，请手动复制技术信息', 'warning'));
      else { const ta = document.createElement('textarea'); ta.value = data; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('错误详情已复制', 'success'); }
    }

    function openSettingsFromAIError() {
      openSettings();
      setTimeout(() => {
        const cfg = validateAIConfig({ showGuide: false });
        ['scProvider', 'scModel', 'scApiKey'].forEach(id => $('#' + id)?.classList.remove('field-attention'));
        cfg.errors.forEach(e => {
          const id = e.field === 'provider' ? 'scProvider' : e.field === 'model' ? 'scModel' : 'scApiKey';
          $('#' + id)?.classList.add('field-attention');
        });
      }, 50);
      toast('已打开设置中心，请检查高亮项', 'info');
    }

    function enterLocalFallbackMode() {
      const text = state.parseSession?.raw || $('#newsInput').value.trim();
      if (!text) return toast('没有可进入本地模式的原文', 'warning');
      state.currentArticleId = state.currentArticleId || uid();
      state.parseSession = { raw: text, chunks: [text], completed: [localFallbackParse(text)] };
      finalizeAnalysis({ recoveredBy: 'local_fallback' });
      hide('#progressBox');
      $('#tabAnalysis').classList.remove('hidden'); $('#btTabAnalysis').classList.remove('hidden');
      setView('analysis');
      setAIRecovery('本地兜底', 'AI 解析暂时不可用，已进入本地阅读模式。稍后可重新解析补全译文、词卡和语法。', true);
      toast('已进入本地阅读模式', 'warning');
    }

    function retryWithRecommendedModel() {
      applyRecommendedConfig(false);
      if (!currentApiKeyInputValue() && !state.apiKey) {
        openSettings();
        toast('请先填写 OpenRouter API Key。', 'warning');
        return;
      }
      toast('已切换到推荐模型，重新解析中...', 'info');
      doAnalyze();
    }

    async function retryFailedChunks() {
      const session = state.parseSession;
      const failed = (state.chunkStatus || []).map((s, i) => s.status === 'failed' || s.status === 'fallback' ? i : -1).filter(i => i >= 0);
      if (!session?.chunks?.length || !failed.length) return toast('没有失败分块可重试', 'info');
      const controller = new AbortController();
      state.currentRequest = controller;
      state.lastFailedChunks = state.lastFailedChunks.filter(i => !failed.includes(i));
      show('#progressBox');
      for (const idx of failed) await processChunk(idx, controller, { mode: 'retry' });
      finalizeAnalysis({ recoveredBy: 'retry_failed_chunks' });
      hide('#progressBox');
      setView('analysis');
      toast('失败分块已重试完成', 'success');
    }

    function exportAIErrorLog() {
      const data = { exportedAt: new Date().toISOString(), appVersion: VERSION_CONFIG.current, aiErrorLog: state.aiErrorLog || [] };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finread-ai-error-log-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('AI 错误日志已导出', 'success');
    }

    async function clearAIErrorLog() {
      const ok = await confirmDialog('清空最近 50 条 AI 错误日志？学习数据不受影响。', { title: '清空 AI 错误日志', danger: true, confirmText: '清空' });
      if (!ok) return;
      state.aiErrorLog = [];
      safeLocalStorageRemove(STORE.aiErrorLog);
      toast('AI 错误日志已清空', 'success');
    }

    async function doAnalyze(options = {}) {
      hide('#errBox');
      const cfg = validateAIConfig({ showGuide: true, toastWarnings: true });
      if (!cfg.ok) return;
      state.provider = cfg.provider; state.model = cfg.model; state.apiKey = cfg.apiKey;
      const text = $('#newsInput').value.trim();
      if (!text) return;
      // Check parse cache
      const cacheKey = _hashText(text);
      if (_parseCache.has(cacheKey)) {
        const cached = _parseCache.get(cacheKey);
        state.analysis = cached;
        state.currentArticleId = uid();
        $('#tabAnalysis').classList.remove('hidden'); $('#btTabAnalysis').classList.remove('hidden');
        setView('analysis');
        toast('已使用缓存解析结果', 'info');
        return;
      }
      state.parseSession = {
        raw: text, chunks: chunkText(text, state.chunkThreshold),
        completed: [], title: '',
        sentences: [], patterns: [], phrases: [], properNouns: [], vocab: [],
      };
      state.chunkStatus = state.parseSession.chunks.map(() => ({ status: 'pending' }));
      state.lastFailedChunks = [];
      $('#btnAnalyze').disabled = true;
      $('#btnAnalyze').textContent = '解析中...';
      show('#progressBox');
      $('#progressFill').style.width = '5%';
      $('#progressPct').textContent = '5%';
      $('#progressLabel').textContent = '建立连接';
      $('#progressDetail').textContent = '发送请求至 ' + state.provider + '...';
      $('#progressTokens').textContent = '';
      state.analysis = { title: 'Analyzing...', fullTranslation: '', sentences: [], patterns: [], phrases: [], properNouns: [], vocab: [] };
      state.currentArticleId = uid();
      const chunkBox = $('#chunkIndicator');
      if (state.parseSession.chunks.length > 1) {
        chunkBox.classList.remove('hidden');
        chunkBox.innerHTML = state.parseSession.chunks.map((_, i) => `<span class="chunk-dot" data-chunk-idx="${i}">${i + 1}</span>`).join('');
      } else { chunkBox.classList.add('hidden'); }
      const controller = new AbortController();
      controller._timeout = false;
      const requestTimeout = setTimeout(() => {
        controller._timeout = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
      state.currentRequest = controller;
      try {
        if (state.parseSession.chunks.length === 1) await processChunk(0, controller, options);
        else { for (let i = 0; i < state.parseSession.chunks.length; i++) { if (controller.signal.aborted) break; await processChunk(i, controller, options); } }
        finalizeAnalysis({ recoveredBy: state.lastFailedChunks.length ? 'partial_fallback' : '' });
        setTimeout(() => {
          hide('#progressBox');
          $('#tabAnalysis').classList.remove('hidden'); $('#btTabAnalysis').classList.remove('hidden');
          if (state.view !== 'analysis') setView('analysis');
        }, 400);
        if (state.lastFailedChunks.length) {
          renderAIErrorPanel(state.lastAIError);
          toast(`部分解析完成：${state.parseSession.chunks.length - state.lastFailedChunks.length}/${state.parseSession.chunks.length} 段成功`, 'warning');
        } else {
          setAIRecovery('完成', 'AI 解析已完成。', true);
        }
      } catch (e) {
        hide('#progressBox');
        if (e.name === 'AbortError') toast(controller._timeout ? '请求超时，请稍后重试或换用更快模型' : '已中止', 'warning');
        else {
          const diag = recordAIError(e, { taskName: '文章解析', articleLength: text.length, mode: options.mode || 'full' });
          renderAIErrorPanel(diag);
          if (!state.analysis?.sentences?.length) enterLocalFallbackMode();
        }
      } finally {
        clearTimeout(requestTimeout);
        state.currentRequest = null;
        $('#btnAnalyze').disabled = false;
        $('#btnAnalyze').textContent = '启动引擎 →';
      }
    }

    async function processChunk(idx, controller, options = {}) {
      const session = state.parseSession;
      const total = session.chunks.length;
      const ct = session.chunks[idx];
      const isChunk = total > 1;
      const dot = $(`.chunk-dot[data-chunk-idx="${idx}"]`);
      if (dot) dot.classList.add('processing');
      if (state.chunkStatus[idx]) state.chunkStatus[idx].status = 'processing';
      $('#progressLabel').textContent = total > 1 ? `解析第 ${idx + 1}/${total} 块` : '解析中';
      $('#progressDetail').textContent = '建立连接...';

      // 连接等待计时器 — 若超过 12s 未收到第一个 token，更新提示
      let _firstChunk = false;
      const _connStart = Date.now();
      const _connTimer = setInterval(() => {
        if (_firstChunk) { clearInterval(_connTimer); return; }
        const s = Math.floor((Date.now() - _connStart) / 1000);
        if (s < 12) { $('#progressDetail').textContent = `建立连接... (${s}s)`; return; }
        if (s < 35) { $('#progressDetail').textContent = `模型正在思考，请稍候… (${s}s)`; return; }
        $('#progressDetail').textContent = `响应较慢 (${s}s)，可点击【中止】后重试`;
      }, 1000);

      const prompt = options.mode === 'compact' ? buildCompactPrompt(ct, isChunk, { idx, total }) : buildPrompt(ct, isChunk, { idx, total });
      const compactPrompt = buildCompactPrompt(ct, isChunk, { idx, total });
      let rawText = '';
      try {
      if (state.streaming && state.provider !== 'anthropic' && options.mode !== 'compact') {
        try {
          rawText = await requestAIWithResilience(prompt, {
            taskName: '文章解析',
            stream: true,
            signal: controller.signal,
            timeoutMs: REQUEST_TIMEOUT_MS,
            retries: 2,
            compactPrompt,
            mode: 'full',
            chunkIndex: idx + 1,
            totalChunks: total,
            articleLength: session.raw.length,
            onProgress: (partial) => {
            if (!_firstChunk) { _firstChunk = true; clearInterval(_connTimer); }
            processStreamPartial(partial, idx);
            const pct = Math.min(85, 10 + (partial.length / Math.max(2000, ct.length * 4)) * 70);
            $('#progressFill').style.width = pct + '%';
            $('#progressPct').textContent = Math.floor(pct) + '%';
            $('#progressTokens').textContent = `~${partial.length} chars`;
            },
          });
        } catch (e) { clearInterval(_connTimer); throw e; }
      } else {
        $('#progressFill').style.width = '40%';
        $('#progressPct').textContent = '40%';
        try {
          rawText = await requestAIWithResilience(prompt, {
            taskName: '文章解析',
            stream: false,
            signal: controller.signal,
            timeoutMs: REQUEST_TIMEOUT_MS,
            retries: 2,
            compactPrompt,
            mode: options.mode || 'full',
            chunkIndex: idx + 1,
            totalChunks: total,
            articleLength: session.raw.length,
          });
        } finally {
          clearInterval(_connTimer);
        }
        $('#progressFill').style.width = '85%';
      }
      clearInterval(_connTimer);
      sessionStorage.setItem('finread:lastRawOutput', rawText);
      const parsed = await parseAIJsonWithRecovery(rawText, ct, { chunkIndex: idx + 1, totalChunks: total, articleLength: session.raw.length });
      if (parsed.coreVocab && !parsed.vocab) parsed.vocab = parsed.coreVocab;
      session.completed[idx] = parsed;
      if (state.chunkStatus[idx]) state.chunkStatus[idx].status = 'success';
      if (dot) { dot.classList.remove('processing'); dot.classList.add('done'); }
      } catch (e) {
        clearInterval(_connTimer);
        if (e.name === 'AbortError' && controller.signal.aborted) throw e;
        const diag = recordAIError(e, { taskName: '文章解析', chunkIndex: idx + 1, totalChunks: total, articleLength: session.raw.length, mode: options.mode || 'full', recoveredBy: 'local_fallback' });
        if (!state.lastFailedChunks.includes(idx)) state.lastFailedChunks.push(idx);
        state.lastAIError = diag;
        session.completed[idx] = localFallbackParse(ct, { source: 'local_fallback' });
        if (state.chunkStatus[idx]) state.chunkStatus[idx].status = 'fallback';
        if (dot) { dot.classList.remove('processing'); dot.classList.add('failed'); }
        setAIRecovery('分块恢复', `第 ${idx + 1}/${total} 段解析失败，已使用本地兜底保留阅读内容。`);
      }
    }

    function processStreamPartial(text, chunkIdx) {
      const session = state.parseSession;
      const sentencesNew = extractArrayItems(text, 'sentences');
      const title = extractStringField(text, 'title');
      if (title && state.analysis.title === 'Analyzing...') {
        state.analysis.title = title;
        if (state.view === 'analysis') $('#artTitle').textContent = title;
      }
      let offset = 0;
      for (let i = 0; i < chunkIdx; i++) offset += (session.completed[i]?.sentences || []).length;
      while (state.analysis.sentences.length < offset + sentencesNew.length) {
        const localIdx = state.analysis.sentences.length - offset;
        if (localIdx < 0 || localIdx >= sentencesNew.length) break;
        const s = sentencesNew[localIdx];
        if (s && s.original && s.translation) {
          state.analysis.sentences.push({ ...s, id: state.analysis.sentences.length + 1 });
          if (state.view === 'analysis') appendSingleSentence(state.analysis.sentences[state.analysis.sentences.length - 1]);
        } else break;
      }
      ['patterns', 'phrases', 'properNouns', 'vocab'].forEach(key => {
        const items = extractArrayItems(text, key);
        const before = state.analysis[key].length;
        items.forEach(it => {
          const keyField = key === 'patterns' ? 'pattern' : key === 'phrases' ? 'phrase' : key === 'properNouns' ? 'name' : 'word';
          if (it[keyField] && !state.analysis[key].find(x => x[keyField] === it[keyField])) state.analysis[key].push(it);
        });
        if (state.analysis[key].length > before && state.view === 'analysis') renderSidebars();
      });
    }

    function finalizeAnalysis(meta = {}) {
      const session = state.parseSession;
      try { state.analysis = mergeAnalyses(session.completed); } catch (e) { console.warn('mergeAnalyses:', e); }
      if (!state.analysis?.sentences?.length && session?.raw) state.analysis = localFallbackParse(session.raw);
      if (meta.recoveredBy) state.analysis.recoveredBy = meta.recoveredBy;
      try { archiveArticle(session.raw, state.analysis); } catch (e) { console.warn('archiveArticle:', e); }
      try { updateWordHistoryFromAnalysis(state.currentArticleId, state.analysis); } catch (e) { console.warn('wordHistory:', e); }
      try { if (session.raw && state.analysis?.sentences?.length) _parseCache.set(_hashText(session.raw), state.analysis); } catch (e) { }
      $('#progressFill').style.width = '100%';
      $('#progressPct').textContent = '100%';
      $('#progressLabel').textContent = '完成';
      $('#progressDetail').textContent = `${state.analysis.sentences.length} 句 · ${state.analysis.patterns.length} 句式 · ${state.analysis.phrases.length} 短语 · ${state.analysis.properNouns.length} 专名 · ${state.analysis.vocab.length} 词`;
      if (state.view === 'analysis') renderAnalysis();
      if (state.analysis.source === 'local_fallback' || state.analysis.recoveredBy === 'partial_fallback') {
        toast('AI 解析暂时不可用，已保留可阅读内容，可稍后重新解析补全。', 'warning');
      }
    }

    function retryFromCache() {
      const cached = sessionStorage.getItem('finread:lastRawOutput');
      if (!cached) { toast('无缓存数据', 'error'); return; }
      try {
        const parsed = robustJsonParse(cached);
        state.analysis = parsed;
        state.currentArticleId = uid();
        archiveArticle(state.parseSession?.raw || $('#newsInput').value, parsed);
        updateWordHistoryFromAnalysis(state.currentArticleId, parsed);
        hide('#errBox');
        setView('analysis');
        toast('已从缓存恢复', 'success');
      } catch (e) { toast('缓存解析失败: ' + e.message, 'error'); }
    }
    window.retryFromCache = retryFromCache;
    function cancelAnalyze() { if (state.currentRequest) { state.currentRequest.abort(); state.currentRequest = null; } }

    function archiveArticle(rawText, analysis) {
      const article = {
        id: state.currentArticleId,
        title: analysis.title || 'Untitled',
        raw: rawText.slice(0, 5000),
        preview: (analysis.sentences[0]?.original || rawText).slice(0, 200),
        addedAt: Date.now(),
        lang: hasChinese(rawText) ? 'zh' : 'en',
        stats: {
          sentences: analysis.sentences.length, patterns: analysis.patterns.length,
          phrases: analysis.phrases.length, properNouns: analysis.properNouns.length,
          vocab: analysis.vocab.length,
        },
      };
      state.articles.unshift(article);
      if (state.articles.length > 200) state.articles = state.articles.slice(0, 200);
      persistArticles();
      safeLocalStorageRemove(STORE.draft);
      updateGoalsBanner();
      renderV64Dashboard();
    }

    function updateWordHistoryFromAnalysis(articleId, analysis) {
      if (!articleId || !analysis) return;
      const allTerms = [];
      (analysis.patterns || []).forEach(p => allTerms.push({ tier: 'pattern', word: p.pattern, abstract: true }));
      (analysis.phrases || []).forEach(p => allTerms.push({ tier: 'phrase', word: p.phrase }));
      (analysis.properNouns || []).forEach(p => allTerms.push({ tier: 'proper', word: p.name }));
      (analysis.vocab || []).forEach(p => allTerms.push({ tier: 'vocab', word: p.word }));
      state.vocab.forEach(v => {
        if (!allTerms.find(x => x.tier === v.tier && x.word === v.word))
          allTerms.push({ tier: v.tier, word: v.word, abstract: v.tier === 'pattern' });
      });
      (analysis.sentences || []).forEach(s => {
        const cleanOrig = (s.original || '').replace(/\*\*/g, '');
        allTerms.forEach(term => {
          if (term.abstract) return;
          const safeWord = term.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          let re;
          try {
            re = new RegExp(`(?<![\\w])${safeWord}(?![\\w])`, 'i');
          } catch (e) {
            re = new RegExp(`\\b${safeWord}\\b`, 'i');
          }
          if (re.test(cleanOrig)) {
            const key = term.tier + '::' + term.word;
            if (!state.wordHistory[key]) state.wordHistory[key] = [];
            if (!state.wordHistory[key].find(h => h.articleId === articleId && h.sentenceId === s.id)) {
              state.wordHistory[key].push({
                articleId, sentenceId: s.id, sentence: cleanOrig,
                translation: s.translation, articleTitle: analysis.title || 'Untitled', ts: Date.now(),
              });
              if (state.wordHistory[key].length > 30) state.wordHistory[key] = state.wordHistory[key].slice(-30);
            }
          }
        });
      });
      persistWordHistory();
    }

    function getWordHistory(card) {
      const key = card.tier + '::' + card.word;
      return state.wordHistory[key] || [];
    }

    function v68_extractSourceSentence(card) {
      if (card.sourceSentence) return String(card.sourceSentence);
      if (card.context) return String(card.context);
      const examples = Array.isArray(card.examples) ? card.examples : [];
      const first = examples.find(Boolean);
      if (typeof first === 'string') return first;
      return first?.en || first?.sentence || '';
    }
    function v68_prepareCardForAdd(card) {
      const sourceSentence = v68_extractSourceSentence(card);
      return sourceSentence ? { ...card, sourceSentence } : { ...card };
    }
    function v68_cardHasSourceSentence(card) {
      return !!(card?.sourceSentence && String(card.sourceSentence).trim());
    }
    function v68_findTargetInSentence(card) {
      const sentence = String(card?.sourceSentence || '');
      const word = String(card?.word || '').trim();
      if (!sentence || !word) return null;
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const needsBoundary = /^[A-Za-z]+$/.test(word);
      const re = new RegExp(needsBoundary ? `\\b${escaped}\\b` : escaped, 'i');
      const match = sentence.match(re);
      return match ? { text: match[0], index: match.index } : null;
    }
    function v68_isClozeEligible(card) {
      return v68_cardHasSourceSentence(card) && !!v68_findTargetInSentence(card) && cardStatus(card) !== 'new';
    }
    function v68_clozeCards(cards = state.vocab) {
      return cards.filter(v68_isClozeEligible);
    }
    function v68_shouldUseCloze(card) {
      if (!v68_isClozeEligible(card)) return false;
      if (!state.clozeForce && state.view !== 'review') return false;
      return state.clozeForce || Math.random() < 0.2;
    }
    function v68_maskClozeSentence(card) {
      const sentence = String(card.sourceSentence || '');
      const match = v68_findTargetInSentence(card);
      if (!match) return escapeHtml(sentence);
      const maskLen = Math.max(1, match.text.replace(/\s+/g, '').length - 1);
      const masked = escapeHtml(match.text[0] + '_'.repeat(maskLen));
      return escapeHtml(sentence.slice(0, match.index)) + `<span class="cloze-blank">${masked}</span>` + escapeHtml(sentence.slice(match.index + match.text.length));
    }
    function v68_normalizeAnswer(text) {
      return String(text || '').trim().toLowerCase().replace(/[.,;:!?，。；：！？]+$/g, '').trim();
    }
    function v68_clearClozeState() {
      state.clozeActive = false;
      state.clozeHintUsed = false;
      $('.flip-card')?.classList.remove('cloze-mode');
      $('#srsRating')?.classList.remove('hidden');
      $('#flipHintBtn')?.classList.remove('hidden');
    }
    function v68_renderClozeCard(card, tierLabel) {
      state.clozeActive = true;
      state.clozeHintUsed = false;
      state.flipped = false;
      $('#flipInner').classList.remove('flipped');
      $('.flip-card')?.classList.add('cloze-mode');
      $('#srsRating')?.classList.add('hidden');
      $('#flipHintBtn')?.classList.add('hidden');
      $('#flipTierMark').textContent = tierLabel;
      $('#flipTierMark').className = `flip-tier-mark t-${card.tier}`;
      $('#flipModeMarkFront').textContent = 'CLOZE';
      $('#flipWord').className = 'flip-word';
      $('#flipWord').innerHTML = `<div class="cloze-sentence">${v68_maskClozeSentence(card)}</div>`;
      $('#flipPhonetic').textContent = '输入缺失词，按 Enter 提交';
      $('#flipPos').textContent = card.pos || tierLabel;
      $('#flipClickHint').innerHTML = `<div class="cloze-tip" id="clozeTip">中文释义已遮蔽</div>`;
      const reveal = $('#flipRevealBtn');
      if (reveal) {
        reveal.disabled = false;
        reveal.classList.remove('recall-locked');
        reveal.textContent = '显示提示';
      }
      $('#flipZh').textContent = card.translation || '';
      $('#flipNote').textContent = card.note || '';
      $('#flipExampleContainer').classList.add('hidden');
      $('#flipBackExtra').innerHTML = '';
      const sw = $('#spellWrap');
      sw?.classList.add('active');
      const si = $('#spellInput');
      if (si) {
        si.value = '';
        si.className = 'spell-input';
        si.placeholder = '输入句中缺失的英文...';
        si.focus();
      }
      $('#spellFeedback').textContent = 'Cloze 语境填空 · 回车提交';
      if (state.recallGateTimer) {
        clearTimeout(state.recallGateTimer);
        state.recallGateTimer = null;
      }
      state.recallGateReady = true;
    }
    function v68_showClozeHint() {
      if (!state.clozeActive) return;
      const card = currentFlipCard();
      state.clozeHintUsed = true;
      const tip = $('#clozeTip');
      if (tip) tip.textContent = `提示：${card?.translation || card?.note || '查看中文释义后，本题按 Hard 记录'}`;
      toast('已显示提示，本题将按 Hard 记录', 'warning');
    }
    function v68_advanceAfterReview(quality) {
      updateStreakBadge(); updateGoalsBanner(); renderV64Dashboard();
      if (_pomo.active) {
        if (quality < 3) _pomo.againQueue.push(_pomo.queue[_pomo.idx]);
        _pomo.idx++;
        pomoUpdateProgress();
        if (_pomo.idx >= _pomo.queue.length) {
          state.flipIdx = 0;
          renderFlipCard(); renderVocabBook();
          pomoShowRoundSummary(false);
        } else {
          state.flipIdx = _pomo.idx;
          renderFlipCard(); renderVocabBook();
        }
      } else {
        const pool = getFlipPool();
        state.flipIdx = pool.length ? (state.flipIdx + 1) % pool.length : 0;
        renderFlipCard(); renderVocabBook();
      }
    }
    function v68_finishClozeReview(card, quality, meta = {}) {
      const updates = sm2(card, quality);
      const nextLabel = v68_dueLabelFromMs(Math.max(0, updates.due - Date.now()));
      Object.assign(card, updates);
      if (quality <= 3) card.hardCount = (card.hardCount || 0) + 1;
      else card.hardCount = Math.max(0, (card.hardCount || 0) - 1);
      if (quality < 3) recordMistake(card, ['句中认不出'], { mode: 'cloze', userAnswer: meta.userAnswer || '', correctAnswer: card.word || '' });
      else recordRecovery(card);
      state.reviewLog.push({ ts: Date.now(), tier: card.tier, word: card.word, quality, mode: 'cloze' });
      if (state.session?.active) {
        state.session.reviewed++;
        if (quality === 4) state.session.good++;
        else if (quality === 3) state.session.hard++;
        else state.session.again++;
      }
      persistReviewLog(); persistVocab();
      const labels = { 2: '不认识', 3: '不确定', 4: '认识' };
      toast(`${labels[quality] || 'Cloze'} · 下次 ${nextLabel}`, quality < 3 ? 'warning' : 'success');
      v68_clearClozeState();
      v68_advanceAfterReview(quality);
    }
    function v68_submitClozeAnswer() {
      if (!state.clozeActive) return;
      const card = currentFlipCard();
      if (!card) return;
      const typed = $('#spellInput').value;
      const ok = v68_normalizeAnswer(typed) === v68_normalizeAnswer(card.word);
      const si = $('#spellInput');
      const sf = $('#spellFeedback');
      if (state.clozeHintUsed) {
        si?.classList.add(ok ? 'correct' : 'wrong');
        sf.innerHTML = `提示后按 Hard · 正确：<strong>${escapeHtml(card.word)}</strong>`;
        setTimeout(() => v68_finishClozeReview(card, 3, { userAnswer: typed }), 650);
      } else if (ok) {
        si?.classList.add('correct');
        sf.textContent = '✓ 正确！';
        setTimeout(() => v68_finishClozeReview(card, 4, { userAnswer: typed }), 450);
      } else {
        si?.classList.add('wrong');
        sf.innerHTML = `✗ 正确：<strong>${escapeHtml(card.word)}</strong>`;
        setTimeout(() => v68_finishClozeReview(card, 2, { userAnswer: typed }), 900);
      }
    }
    function v68_startClozeMode(cards = null) {
      const base = cards || state.clozeDeckOverride || getReviewPool();
      let queue = v68_clozeCards(base);
      if (!queue.length && !cards && !state.clozeDeckOverride) queue = v68_clozeCards(state.vocab);
      state.clozeDeckOverride = null;
      if (!queue.length) { toast('暂无可用 sourceSentence 的语境填空卡', 'info'); return; }
      state.vocabFilter = 'all';
      state.studyMode = 'en2zh';
      state.clozeForce = true;
      $$('.flip-mode-toggle button').forEach(b => b.classList.toggle('active', b.dataset.mode === 'en2zh'));
      enterReviewFocus();
      _pomo.active = true; _pomo.queue = queue.sort((a, b) => (a.due || 0) - (b.due || 0)).slice(0, POMO_LIMIT);
      _pomo.idx = 0; _pomo.round = 1; _pomo.againQueue = [];
      _pomo.remaining = POMO_DURATION; _pomo.startedAt = null;
      state.flipIdx = 0;
      show('#pomoBar'); hide('#pomoStart');
      $('#pomoTimer').textContent = pomoFmt(_pomo.remaining);
      $('#pomoTimer').classList.remove('urgent');
      pomoUpdateProgress();
      renderFlipCard();
      toast(`Cloze 语境填空 · ${_pomo.queue.length} 张`, 'info');
    }
    function patternToVocab(p) { return { tier: 'pattern', word: p.pattern, pos: '句式', translation: p.meaning, note: '高频金融句式模板', examples: p.example ? [{ en: p.example, zh: p.translation }] : [], sourceArticleId: state.currentArticleId, addedAt: Date.now() }; }
    function phraseToVocab(p) { return { tier: 'phrase', word: p.phrase, pos: p.type || '短语', phraseType: p.type || '其他', translation: p.translation, note: p.note || '', collocations: p.collocations || [], similar: p.similar || [], examples: p.examples || [], sourceArticleId: state.currentArticleId, addedAt: Date.now() }; }
    function properToVocab(pn) { return { tier: 'proper', word: pn.name, pos: PROPER_TYPE_LABELS[pn.type] || pn.type || '专名', properType: pn.type || 'other', translation: pn.translation, note: pn.note || '', sourceArticleId: state.currentArticleId, addedAt: Date.now() }; }
    function vocabToCard(v) { return { tier: 'vocab', ...v, sourceArticleId: state.currentArticleId, addedAt: Date.now() }; }
    function addVocabInternal(card) { state.vocab.push({ ...v68_prepareCardForAdd(card), due: Date.now(), interval: 0, easeFactor: 2.5, reps: 0, learningStep: 0 }); }


    /* ============================================================
     *  FINREAD v6.4 — Learning Loop helpers
     * ============================================================ */
    const V64_TOPIC_SAMPLES = {
      fed: `The Federal Reserve signaled that interest-rate cuts may take longer than investors expect, as officials wait for clearer evidence that inflation is moving sustainably toward the 2% target. Chair Jerome Powell said policy remains restrictive, but emphasized that the committee would need greater confidence before easing financial conditions. Treasury yields rose after the statement, while bank stocks slipped on concerns that higher funding costs could weigh on net interest margins.`,
      compliance: `The Securities and Exchange Commission charged a listed company with misleading risk disclosures after executives allegedly failed to warn investors about weaknesses in internal controls. The settlement requires enhanced compliance reporting, an independent review of disclosure procedures, and a civil penalty. Analysts said the case shows regulators are scrutinizing governance language, not only headline financial results.`,
      aml: `Global banks are expanding anti-money-laundering controls as regulators intensify reviews of cross-border payment flows. Compliance teams are using transaction monitoring, sanctions screening and enhanced customer due diligence to identify suspicious activity. Industry executives said the cost of KYC operations is rising, but weak controls could expose institutions to enforcement action and reputational damage.`,
      earnings: `The company reported stronger-than-expected quarterly earnings, helped by resilient consumer demand and disciplined cost controls. Revenue rose 8% from a year earlier, while operating margin expanded despite higher financing expenses. Management raised its full-year guidance, but warned that currency volatility and slower overseas growth could pressure results in the second half.`,
      crypto: `Lawmakers advanced a crypto market-structure bill designed to clarify when digital assets should be regulated as securities or commodities. The proposal would require stablecoin issuers to hold high-quality reserves and submit to regular audits. Exchanges said clearer rules could support institutional adoption, while consumer groups warned that enforcement gaps remain.`
    };

    function v64TodayStartTs() {
      const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
    }

    function v64LearningStage() {
      const p = countByTier('pattern');
      const ph = countByTier('phrase');
      const v = countByTier('vocab');
      const mature = state.vocab.filter(card => cardStatus(card) === 'mature').length;
      if (p < 20) return { level: 'Lv.1', title: '金融新闻基础句式', active: 0, next: '先积累 20 个高频财经句式。' };
      if (p < 60) return { level: 'Lv.2', title: '利率 / 通胀 / 市场表达', active: 1, next: '继续把句式池扩展到 60 个。' };
      if (ph < 100 || v < 160) return { level: 'Lv.3', title: '合规与监管语块', active: 2, next: '重点补足监管、披露、AML/KYC 短语。' };
      return { level: 'Lv.4', title: mature >= 80 ? '输出型金融英语' : '复习巩固与输出训练', active: 3, next: '用摘要、仿写和问答把输入转成输出。' };
    }

    function renderV64Dashboard() {
      if (!$('#v64Dashboard')) return;
      const ts = v64TodayStartTs();
      const reviewsToday = state.reviewLog.filter(r => r.ts >= ts).length;
      const articlesToday = state.articles.filter(a => a.addedAt >= ts).length;
      const due = getReviewPool().length;
      const stage = v64LearningStage();
      $('#v64DueCards').textContent = due;
      $('#v64ReadsToday').textContent = `${articlesToday}/${state.dailyGoals.articleTarget || 1}`;
      $('#v64DeckSize').textContent = state.vocab.length;
      $('#v64DailyHint').textContent = due > 0
        ? `今日建议：先复习 ${due} 张卡，再精读 1 篇。`
        : `今日建议：完成 1 篇精读，积累词库卡片。`;
      $('#hsDueCard')?.classList.toggle('hs-active', due > 0);
      const reviewCta = $('#btnV64StartReview');
      if (reviewCta) reviewCta.classList.toggle('hidden', due === 0);
      $('#v64PathTitle').textContent = stage.title;
      $('#v64PathLevel').textContent = stage.level;
      const steps = [
        ['句式地基', `${countByTier('pattern')}/20 核心句式`],
        ['市场表达', `${countByTier('pattern')}/60 进阶句式`],
        ['监管语块', `${countByTier('phrase')}/100 短语池`],
        ['综合应用', `${reviewsToday} 次复习 · ${articlesToday} 篇精读`],
      ];
      $('#v64PathSteps').innerHTML = steps.map((s, i) =>
        `<div class="v64-path-step ${i < stage.active ? 'done' : i === stage.active ? 'active' : ''}"><strong>${s[0]}</strong><span>${s[1]}</span></div>`
      ).join('');
      if (state.view === 'training') renderTrainingCenter();
    }



    let _draftTimer = null;
    function onInputChange() {
      const v = $('#newsInput').value.trim();
      $('#wordCount').textContent = v.length;
      $('#btnAnalyze').disabled = !v;
      $('#btnClear').classList.toggle('hidden', !v);
      // 检测 URL — 显示抓取提示
      const looksLikeUrl = isUrl(v) || /^https?:\/\//i.test(v);
      $('#urlHint').classList.toggle('hidden', !looksLikeUrl);
      if (!v) {
        $('#lang-detect').textContent = '--'; $('#estTime').textContent = '--';
        $('#chunkWarn').classList.add('hidden');
      } else {
        $('#lang-detect').textContent = hasChinese(v) ? '中文 → 英' : 'English → 中';
        const seconds = Math.max(8, Math.ceil(v.length / (state.streaming ? 80 : 40)));
        $('#estTime').textContent = seconds + 's';
        const chunks = chunkText(v, state.chunkThreshold);
        if (chunks.length > 1) { $('#chunkWarn').textContent = `将分 ${chunks.length} 块`; $('#chunkWarn').classList.remove('hidden'); }
        else { $('#chunkWarn').classList.add('hidden'); }
      }
      clearTimeout(_draftTimer);
      _draftTimer = setTimeout(() => {
        const raw = $('#newsInput').value;
        if (raw.length > 10) safeLocalStorageSet(STORE.draft, raw);
        else safeLocalStorageRemove(STORE.draft);
      }, 800);
    }

    function closeReviewOverlays() {
      ['#settingsModal', '#storyModal', '#customAddModal', '#scanUnmarkedModal'].forEach(sel => hide(sel));
      $('#wordTooltip')?.classList.add('hidden');
      $('#selectionAdd')?.classList.remove('visible');
      v69_hideSelectionUI();
      if (typeof closeWordDetailPopup === 'function') closeWordDetailPopup();
    }

    /* FinRead v6.8 Memory Upgrade */
    const MEMORY_ERROR_REASONS = ['含义不熟', '拼写错误', '搭配不会', '近义混淆', '句中认不出', '发音不熟', '语法结构不懂'];

    function ensureMemoryFields(card) {
      if (!card) return card;
      if (!Array.isArray(card.errorTags)) card.errorTags = [];
      if (typeof card.wrongCount !== 'number') card.wrongCount = Number(card.wrongCount || 0);
      if (!card.lastWrongAt) card.lastWrongAt = 0;
      if (!Array.isArray(card.mistakeHistory)) card.mistakeHistory = [];
      if (typeof card.recoveryStreak !== 'number') card.recoveryStreak = Number(card.recoveryStreak || 0);
      if (typeof card.masteredManually !== 'boolean') card.masteredManually = !!card.masteredManually;
      if (card.mistakeHistory.length > 10) card.mistakeHistory = card.mistakeHistory.slice(-10);
      return card;
    }

    function normalizeMemoryFields() {
      let changed = false;
      state.vocab.forEach(card => {
        const before = JSON.stringify({
          errorTags: card.errorTags, wrongCount: card.wrongCount, lastWrongAt: card.lastWrongAt,
          mistakeHistory: card.mistakeHistory, recoveryStreak: card.recoveryStreak, masteredManually: card.masteredManually
        });
        ensureMemoryFields(card);
        const after = JSON.stringify({
          errorTags: card.errorTags, wrongCount: card.wrongCount, lastWrongAt: card.lastWrongAt,
          mistakeHistory: card.mistakeHistory, recoveryStreak: card.recoveryStreak, masteredManually: card.masteredManually
        });
        if (before !== after) changed = true;
      });
      return changed;
    }

    function cardKey(card) {
      return `${card.tier || 'card'}::${String(card.word || '').toLowerCase()}`;
    }

    function addUniqueTags(card, reasons) {
      ensureMemoryFields(card);
      (reasons || []).forEach(r => {
        if (r && !card.errorTags.includes(r)) card.errorTags.push(r);
      });
    }


    function setView(name) {
      state.view = name;
      document.body.classList.toggle('review-focus', name === 'review');
      document.body.classList.toggle('view-analysis', name === 'analysis');
      hide('#viewInput'); hide('#viewAnalysis'); hide('#viewVocab'); hide('#viewTraining'); hide('#viewRecallEngine'); hide('#viewConfuseQuiz'); hide('#viewMistakes'); hide('#viewMine'); hide('#viewHistory'); hide('#viewStats'); hide('#viewSettings');
      $$('nav.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === name));
      $$('.bottom-tabbar .bt-btn').forEach(b => {
        const mineActive = b.dataset.view === 'mine' && (name === 'mine');
        const reviewActive = b.dataset.view === 'review' && (name === 'review' || name === 'training');
        b.classList.toggle('active', b.dataset.view === name || mineActive || reviewActive);
      });
      if (name === 'input') { show('#viewInput'); if (!state.currentRequest) hide('#progressBox'); }
      else if (name === 'analysis') { show('#viewAnalysis'); renderAnalysis(); }
      else if (name === 'vocab') { show('#viewVocab'); renderVocabBook(); }
      else if (name === 'review') { show('#viewVocab'); renderVocabBook(); }
      else if (name === 'training') { show('#viewTraining'); renderTrainingCenter(); }
      else if (name === 'recallEngine') { show('#viewRecallEngine'); v69_renderRecallEngine(); }
      else if (name === 'confuseQuiz') { show('#viewConfuseQuiz'); renderConfuseQuiz(); }
      else if (name === 'mistakes') { show('#viewMistakes'); renderMistakeBook(); }
      else if (name === 'history') { show('#viewHistory'); renderHistoryView(); }
      else if (name === 'stats') { show('#viewStats'); renderStatsView(); }
      else if (name === 'mine') { show('#viewMine'); setMineTab(state.mineTab || 'history'); }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function setMineTab(tab) {
      state.mineTab = tab;
      $$('.mine-itab').forEach(b => b.classList.toggle('active', b.dataset.mine === tab));
      hide('#viewHistory'); hide('#viewStats'); hide('#viewSettings');
      if (tab === 'history') { show('#viewHistory'); renderHistoryView(); }
      else if (tab === 'stats') { show('#viewStats'); renderStatsView(); }
      else if (tab === 'settings') { show('#viewSettings'); renderSettingsPage(); }
    }
    window.setMineTab = setMineTab;

    function renderAnalysis() {
      if (!state.analysis) return;
      const a = state.analysis;
      $('#artTitle').textContent = a.title || 'Document Output';
      $('#artMeta').textContent = `${(a.sentences || []).length} 段 · ${(a.patterns || []).length} 句式 · ${(a.phrases || []).length} 短语 · ${(a.properNouns || []).length} 专名 · ${(a.vocab || []).length} 词`;
      if (a.fullTranslation) { $('#fullTranslationText').textContent = a.fullTranslation; $('#fullTranslationWrapper').classList.toggle('hidden', !state.showFullTrans); }
      else hide('#fullTranslationWrapper');
      if (a.source === 'local_fallback' || a.recoveredBy) {
        $('#artMeta').textContent += ` · ${a.source === 'local_fallback' ? '本地阅读模式' : '部分恢复'}`;
      }
      $('#sideCountPattern').textContent = (a.patterns || []).length;
      $('#sideCountPhrase').textContent = (a.phrases || []).length;
      $('#sideCountProper').textContent = (a.properNouns || []).length;
      $('#sideCountVocab').textContent = (a.vocab || []).length;
      renderSentences();
      renderSidebars();
    }

    let _highlightCache = null;
    function invalidateHighlightCache() { _highlightCache = null; }

    function getHighlightContext(a) {
      if (_highlightCache && _highlightCache.analysis === a) return _highlightCache;
      const savedVocab = new Set();
      const savedPhrase = new Set();
      const savedProper = new Set();
      state.vocab.forEach(v => {
        const key = v.word.toLowerCase();
        if (v.tier === 'vocab') savedVocab.add(key);
        else if (v.tier === 'phrase') savedPhrase.add(key);
        else if (v.tier === 'proper') savedProper.add(key);
      });
      const properMap = new Map();
      (a.properNouns || []).forEach((pn, i) => properMap.set(pn.name.toLowerCase(), i));
      const sortedPhrases = (a.phrases || []).map((p, i) => ({ ...p, originalIndex: i })).sort((x, y) => y.phrase.length - x.phrase.length);
      const sortedVocab = (a.vocab || []).map((v, i) => ({ ...v, originalIndex: i })).sort((x, y) => y.word.length - x.word.length);
      _highlightCache = { analysis: a, savedVocab, savedPhrase, savedProper, properMap, sortedPhrases, sortedVocab };
      return _highlightCache;
    }

    /* ============================================================
     *  ✦ SAFARI COMPATIBILITY NOTES
     *  - Safari < 16.4 不支持 lookbehind (?<=...) 和 negative lookbehind (?<!...)
     *  - 所有涉及 lookbehind 的正则都需要 try-catch 降级到 \b 边界匹配
     *  - 影响：highlightSentenceHTML, updateWordHistoryFromAnalysis 等函数
     * ============================================================ */

    function highlightSentenceHTML(s, a) {
      const ctx = getHighlightContext(a);
      let textHtml = escapeHtml(s.original);
      textHtml = textHtml.replace(/\*\*(.*?)\*\*/g, (match, name) => {
        const idx = ctx.properMap.get(name.toLowerCase());
        if (idx !== undefined) {
          const isSaved = ctx.savedProper.has(name.toLowerCase());
          return `<b class="proper-noun${isSaved ? ' saved' : ''}" data-pn-idx="${idx}">${name}</b>`;
        }
        return `<b class="proper-noun no-data">${name}</b>`;
      });
      const phraseSlots = [];
      ctx.sortedPhrases.forEach(p => {
        const isSaved = ctx.savedPhrase.has(p.phrase.toLowerCase());
        const safe = p.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let phraseRe;
        try {
          // ⚠️ Safari 兼容：lookbehind 不支持则降级到 \b
          phraseRe = new RegExp(`(?<![\\w])(${safe})(?![\\w])`, 'gi');
        } catch (e) {
          phraseRe = new RegExp(`\\b(${safe})\\b`, 'gi');
        }
        textHtml = textHtml.replace(phraseRe, (match) => {
          const placeholder = `§PHRASE§${phraseSlots.length}§`;
          phraseSlots.push(`<span class="hover-phrase${isSaved ? ' saved' : ''}" data-ph-idx="${p.originalIndex}">${match}</span>`);
          return placeholder;
        });
      });
      ctx.sortedVocab.forEach(v => {
        const isSaved = ctx.savedVocab.has(v.word.toLowerCase());
        const safeWord = v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${safeWord})\\b`, 'gi');
        textHtml = textHtml.replace(regex, (match) => `<span class="hover-word${isSaved ? ' saved' : ''}" data-idx="${v.originalIndex}">${match}</span>`);
      });
      phraseSlots.forEach((html, i) => { textHtml = textHtml.replace(`§PHRASE§${i}§`, html); });
      return textHtml;
    }

    function renderGrammarNote(note) {
      const text = typeof note === 'string'
        ? note
        : [note?.tag ? `【${note.tag}】` : '', note?.text || note?.note || note?.content || ''].join('');
      return escapeHtml(text || '').replace(/【([^】]+)】/g, '<span class="gr-tag">$1</span>');
    }

    function localGrammarFallback(s) {
      const en = getEnText(s.original || '', s.translation || '').replace(/\*\*/g, '').trim();
      if (!en) return null;
      const lower = en.toLowerCase();
      const notes = [];
      if (/\b(was|were|is|are|been|be|being)\s+\w+(ed|en)\b/i.test(en)) {
        notes.push('【语态】句中疑似含 be + 过去分词结构，优先判断是否为被动语态。');
      } else if (/\b(will|would|may|might|could|should|can)\b/i.test(en)) {
        notes.push('【情态动词】句中含情态动词，注意它表达预测、可能性或政策立场。');
      } else if (/\b(has|have|had)\s+\w+(ed|en)\b/i.test(en)) {
        notes.push('【时态】句中疑似含完成时，强调动作对当前结果或后续判断的影响。');
      } else if (/\b(rose|fell|held|said|reported|warned|signaled|announced)\b/i.test(en)) {
        notes.push('【时态】财经新闻常用一般过去时报道已发生事件或机构表态。');
      }
      if (/\b(which|that|who|whose|where|when)\b/i.test(en)) notes.push('【三大从句】句中含关系词，注意其引导的定语从句或名词性从句修饰对象。');
      if (/\b(while|as|because|although|if|when|after|before)\b/i.test(en)) notes.push('【状语从句】句中含从属连词，注意主句与背景、原因、让步或时间关系。');
      if (/\b(to\s+\w+|ing\b|ed\b)\b/i.test(en)) notes.push('【非谓语】句中可能含 to do / doing / done 结构，用来压缩动作、目的或背景信息。');
      if (/,/.test(en) && en.length > 120) notes.push('【长难句】该句逗号分层明显，建议先抓主谓宾，再处理插入语和后置信息。');
      if (!notes.length) notes.push('【句子主干】先找主语、谓语和宾语/表语，再把时间、原因、让步等附加信息拆开。');
      const skeleton = en
        .replace(/\*\*/g, '')
        .replace(/\b(the|a|an)\b/gi, '')
        .replace(/\s+/g, ' ')
        .slice(0, 160);
      return {
        skeleton,
        notes,
        rule_summary: lower.includes('said') || lower.includes('signaled') || lower.includes('warned')
          ? '本地兜底分析：该句可能是财经新闻常见的“机构/人物 + 表态动词 + that 从句/补充信息”结构。'
          : '本地兜底分析：AI 未返回完整 grammar 字段，已根据句面结构生成基础拆解。',
        fallback: true,
      };
    }

    function normalizeGrammar(s) {
      const g = s.grammar || s.grammar_analysis || s.grammarAnalysis || s.syntax || s.structure;
      if (!g) return localGrammarFallback(s);
      if (typeof g === 'string') {
        const trimmed = g.trim();
        return trimmed ? { skeleton: '', notes: [trimmed], rule_summary: '', fallback: false } : localGrammarFallback(s);
      }
      const notesRaw = g.notes || g.points || g.analysis || g.explanations || [];
      const notes = Array.isArray(notesRaw) ? notesRaw : [notesRaw];
      const normalized = {
        skeleton: g.skeleton || g.structure || g.main_structure || g.mainStructure || g.sentence_pattern || '',
        notes: notes.filter(Boolean),
        rule_summary: g.rule_summary || g.ruleSummary || g.summary || g.core || '',
        fallback: false,
      };
      if (!normalized.skeleton && !normalized.notes.length && !normalized.rule_summary) return localGrammarFallback(s);
      return normalized;
    }

    function buildGrammarHTML(s) {
      const grammar = normalizeGrammar(s);
      if (!grammar) return '<div class="gr-empty">暂无语法数据。请重新解析，或检查模型是否返回 sentences[].grammar。</div>';
      const skeletonHtml = grammar.skeleton
        ? `<div class="gr-skeleton"><span class="gr-skeleton-label">${grammar.fallback ? 'Local' : 'Skeleton'}</span>${escapeHtml(grammar.skeleton)}</div>`
        : '';
      const notesHtml = (grammar.notes || []).map(n => `<li>${renderGrammarNote(n)}</li>`).join('');
      const listHtml = notesHtml ? `<ul class="gr-list">${notesHtml}</ul>` : '';
      const ruleSummaryHtml = grammar.rule_summary
        ? `<div class="rule-summary"><span class="rule-summary-label">${grammar.fallback ? 'LOCAL' : 'RULE'}</span>${escapeHtml(grammar.rule_summary)}</div>`
        : '';
      return skeletonHtml + listHtml + ruleSummaryHtml || '<div class="gr-empty">暂无语法数据。</div>';
    }

    function buildSentenceHTML(s, a) {
      const grHtml = buildGrammarHTML(s);
      const textHtml = highlightSentenceHTML(s, a);
      return `<div class="sent-inner">
    <span class="sent-num">${s.id}</span>
    <div class="sent-body">
      <span class="sent-en">${textHtml}</span>
      <span class="sent-actions">
        <button class="icon-btn" data-act="tts" title="朗读">🔊</button>
        <button class="icon-btn" data-act="toggle" title="展开/收起">▾</button>
      </span>
      ${state.showZh ? `<div class="zh-box">${escapeHtml(s.translation)}</div>` : ''}
      ${state.showGr || state.activeId === s.id ? `<div class="gr-box">${grHtml}</div>` : ''}
    </div>
  </div>`;
    }

    function appendSingleSentence(s) {
      const box = $('#sentencesBox');
      const row = document.createElement('div');
      row.className = 'sent streaming-in';
      row.dataset.sid = s.id;
      row.innerHTML = buildSentenceHTML(s, state.analysis);
      attachSentenceEvents(row, s);
      box.appendChild(row);
    }

    function attachSentenceEvents(row, s) {
      row.addEventListener('click', (e) => {
        if (window.getSelection().toString().length > 0) return;
        const btn = e.target.closest('button');
        const act = btn?.dataset.act;
        if (act === 'tts') {
          e.stopPropagation();
          const cleanText = getEnText(s.original.replace(/\*\*/g, ''), s.translation);
          speak(cleanText, 0.9, btn);
        } else if (act === 'toggle' || !act) {
          const tgt = e.target;
          if (tgt.classList.contains('hover-word') && tgt.classList.contains('saved')) {
            const idx = tgt.dataset.idx;
            const vocabEntry = state.analysis?.vocab?.[idx];
            if (vocabEntry) {
              const savedCard = state.vocab.find(v => v.tier === 'vocab' && v.word.toLowerCase() === vocabEntry.word.toLowerCase());
              if (savedCard) { showWordDetailPopup(savedCard); return; }
            }
          }
          if (tgt.classList.contains('hover-phrase') && tgt.classList.contains('saved')) {
            const idx = tgt.dataset.phIdx;
            const phraseEntry = state.analysis?.phrases?.[idx];
            if (phraseEntry) {
              const savedCard = state.vocab.find(v => v.tier === 'phrase' && v.word.toLowerCase() === phraseEntry.phrase.toLowerCase());
              if (savedCard) { showWordDetailPopup(savedCard); return; }
            }
          }
          if (tgt.classList.contains('hover-word') || tgt.classList.contains('hover-phrase') || tgt.classList.contains('proper-noun')) return;
          state.activeId = state.activeId === s.id ? null : s.id;
          renderSentences();
        }
      });
    }

    function renderSentences() {
      if (!state.analysis) return;
      const a = state.analysis;
      const box = $('#sentencesBox');
      box.innerHTML = '';
      const frag = document.createDocumentFragment();
      (a.sentences || []).forEach(s => {
        const row = document.createElement('div');
        row.className = 'sent' + (state.activeId === s.id ? ' active' : '');
        row.dataset.sid = s.id;
        try { row.innerHTML = buildSentenceHTML(s, a); } catch (e) { row.innerHTML = `<div class="sent-inner"><span class="sent-num">${s.id}</span><div class="sent-body"><span class="sent-en">${escapeHtml(s.original || '')}</span></div></div>`; }
        attachSentenceEvents(row, s);
        frag.appendChild(row);
      });
      box.appendChild(frag);
    }

    function buildVocabCardHTML(w, isSaved, showSrs = false, showHistory = false) {
      const tier = w.tier || 'vocab';
      const isPattern = tier === 'pattern';
      const wordFontSize = isPattern ? '15px' : '20px';
      let phoneticHtml = w.phonetic ? `<span class="phonetic">${escapeHtml(w.phonetic)}</span>` : '';
      let posHtml = w.pos && !isPattern ? `<span class="pos">${escapeHtml(w.pos)}</span>` : '';
      let synHtml = '';
      if (w.synonyms && Array.isArray(w.synonyms) && w.synonyms.length) {
        synHtml = `<div class="syn-block">
      <div class="syn-head">近义辨析</div>
      ${w.synonyms.map(s => {
          const alreadySaved = state.vocab.some(v => v.word === s.word);
          return `<div class="syn-item">
          <div class="syn-row">
            <span class="syn-word">${escapeHtml(s.word)}</span>
            ${s.zh ? `<span class="syn-zh">${escapeHtml(s.zh)}</span>` : ''}
            <button class="syn-add-btn" data-act="syn-save"
              data-word="${escapeHtml(s.word)}"
              data-zh="${escapeHtml(s.zh || '')}"
              data-pos="${escapeHtml(w.pos || '')}"
              data-diff="${escapeHtml(s.diff || '')}"
              ${alreadySaved ? 'disabled' : ''}>
              ${alreadySaved ? '✓ 已收藏' : '+ 收藏'}
            </button>
          </div>
          ${s.diff ? `<div class="syn-diff">${escapeHtml(s.diff)}</div>` : ''}
        </div>`;
        }).join('')}
    </div>`;
      } else if (w.replacements) {
        synHtml = `<div class="syn-block"><div class="syn-head">同义词</div><div style="font-size:12px;color:var(--text-soft);">${escapeHtml(w.replacements)}</div></div>`;
      }
      let collocHtml = '';
      if (tier === 'phrase' && Array.isArray(w.collocations) && w.collocations.length) {
        collocHtml = `<div class="colloc-block">
      <div class="colloc-head">常见搭配 <span class="colloc-count">${w.collocations.length}</span></div>
      <div class="colloc-list">
        ${w.collocations.map(c => `<span class="colloc-chip" data-tts="${escapeHtml(c)}">${escapeHtml(c)}</span>`).join('')}
      </div>
    </div>`;
      } else if (tier === 'vocab' && Array.isArray(w.collocations) && w.collocations.length && w.collocations[0]?.phrase) {
        collocHtml = `<div class="vocab-colloc-block">
      <div class="vocab-colloc-head">词组搭配 <span class="vocab-colloc-count">${w.collocations.length}</span></div>
      ${w.collocations.map(c => `<div class="vocab-colloc-item">
        <span class="vocab-colloc-phrase" data-tts="${escapeHtml(c.phrase)}">${escapeHtml(c.phrase)}</span>
        ${c.meaning ? `<span class="vocab-colloc-meaning">${escapeHtml(c.meaning)}</span>` : ''}
        ${c.example ? `<div class="vocab-colloc-example">"${escapeHtml(c.example)}"</div>` : ''}
        ${c.example_zh ? `<div class="vocab-colloc-example-zh">${escapeHtml(c.example_zh)}</div>` : ''}
      </div>`).join('')}
    </div>`;
      }
      let similarHtml = '';
      if (tier === 'phrase' && Array.isArray(w.similar) && w.similar.length) {
        similarHtml = `<div class="similar-block">
      <div class="similar-head">同类短语辨析</div>
      ${w.similar.map(s => `<div class="similar-item">
        <div class="similar-phrase">${escapeHtml(s.phrase)}</div>
        <div class="similar-diff">${escapeHtml(s.diff || '')}</div>
      </div>`).join('')}
    </div>`;
      }
      let historyHtml = '';
      if (showHistory) {
        const hist = getWordHistory(w);
        if (hist.length > 0) {
          historyHtml = `<div class="history-block">
        <div class="history-block-head">📚 出现于 ${hist.length} 处</div>
        ${hist.slice(-3).reverse().map(h => `<div class="history-occur">${escapeHtml(h.sentence.slice(0, 120))}${h.sentence.length > 120 ? '…' : ''}
          <div class="src">— ${escapeHtml(h.articleTitle)}</div>
        </div>`).join('')}
      </div>`;
        }
      }
      let examplesHtml = '';
      if (w.examples?.length) {
        examplesHtml = `<div class="examples-box">
      ${w.examples.map(ex => `<div class="ex-item">
        <button class="ex-tts" data-tts="${escapeHtml(ex.en)}">🔊</button>${escapeHtml(ex.en)}
        ${ex.zh ? `<div class="ex-zh">${escapeHtml(ex.zh)}</div>` : ''}
      </div>`).join('')}
    </div>`;
      }
      let srsBadgeHtml = '';
      if (showSrs && w.lastReview) {
        const st = cardStatus(w);
        const labels = { new: 'NEW', learning: 'LEARN', mature: 'MATURE', due: 'DUE!' };
        srsBadgeHtml = `<span class="srs-badge ${st}">${labels[st]}</span>`;
      } else if (showSrs) srsBadgeHtml = `<span class="srs-badge new">NEW</span>`;
      let historyBadgeHtml = '';
      if (showSrs) {
        const hist = getWordHistory(w);
        if (hist.length > 0) historyBadgeHtml = `<span class="history-badge" data-act="show-history">📚 ${hist.length}</span>`;
      }
      const TAG_CLASS = { 'CET-4': 'cet4', 'CET-6': 'cet6', '考研': 'kaoyan', '雅思': 'ielts' };
      const FREQ_ICON = { '高频': '⭐', '中频': '★', '低频': '' };
      const examTagsArr = Array.isArray(w.examTags) ? w.examTags : (w.examTags ? [w.examTags] : []);
      const freqIcon = FREQ_ICON[w.freq] ?? '';
      const freqLabel = w.freq ? ` ${w.freq}考点` : '';
      const examTagsHtml = examTagsArr.map(tag =>
        `<span class="exam-tag ${TAG_CLASS[tag] || 'other'}">${freqIcon} ${escapeHtml(tag)}${freqLabel}</span>`
      ).join('');
      const actionLabel = isSaved ? '已存入' : '+ 收藏';
      // Root & Affix Memory
      const ra = w.rootAffixMemory || {};
      let rootAffixHtml = '';
      if (ra.explanation || ra.memoryTip || ra.root || ra.prefix || ra.suffix) {
        const chips = [];
        if (ra.prefix) chips.push(`<span class="root-affix-chip">前缀 <em>${escapeHtml(ra.prefix)}</em></span>`);
        if (ra.root) chips.push(`<span class="root-affix-chip">词根 <em>${escapeHtml(ra.root)}</em></span>`);
        if (ra.suffix) chips.push(`<span class="root-affix-chip">后缀 <em>${escapeHtml(ra.suffix)}</em></span>`);
        rootAffixHtml = `<div class="root-affix-box">
          <div class="root-affix-label">词根词缀记忆 <button class="btn-fill-root" data-act="edit-root-affix">编辑</button></div>
          ${chips.length ? `<div class="root-affix-row">${chips.join('')}</div>` : ''}
          ${ra.explanation ? `<div class="root-affix-tip">${escapeHtml(ra.explanation)}</div>` : ''}
          ${ra.memoryTip ? `<div class="root-affix-tip" style="margin-top:4px;font-style:italic;">${escapeHtml(ra.memoryTip)}</div>` : ''}
        </div>`;
      } else {
        rootAffixHtml = `<div class="root-affix-box">
          <div class="root-affix-empty">
            <span>暂无词根词缀解析</span>
            <button class="btn-fill-root" data-act="edit-root-affix">点击补充</button>
          </div>
        </div>`;
      }
      // Completeness
      const missingFields = [];
      if (!w.translation) missingFields.push('中文释义');
      if (!w.phonetic && (w.tier === 'vocab')) missingFields.push('音标');
      if (!w.examples?.length) missingFields.push('例句');
      if (!(w.rootAffixMemory?.explanation) && w.tier === 'vocab') missingFields.push('词根词缀');
      const completenessHtml = missingFields.length === 0
        ? `<span class="completeness-tag ok">内容完整</span>`
        : missingFields.map(f => `<span class="completeness-tag miss">缺 ${f}</span>`).join('') +
          `<button class="btn-fill-root" data-act="supplement" style="margin-left:4px;">补充</button>`;
      return `<div class="row">
    <div class="main">
      <div class="head">
        <div class="word" style="font-size:${wordFontSize};">${escapeHtml(w.word)}</div>
        ${phoneticHtml} ${posHtml} ${srsBadgeHtml} ${historyBadgeHtml} ${examTagsHtml}
      </div>
      <div class="zh">${escapeHtml(w.translation || '')}</div>
      ${w.deep_analysis ? `<div class="deep-analysis"><span class="deep-analysis-label">DEEP</span>${escapeHtml(w.deep_analysis)}</div>` : ''}
      ${Array.isArray(w.wordFamily) && w.wordFamily.length ? `<div class="word-family">${w.wordFamily.map(f => `<span class="wf-chip">${escapeHtml(f.word)} <em>${escapeHtml(f.pos || '')}</em></span>`).join('')}</div>` : ''}
      ${w.note ? `<div class="note">${escapeHtml(w.note)}</div>` : ''}
      ${synHtml} ${collocHtml} ${similarHtml} ${historyHtml} ${examplesHtml} ${rootAffixHtml}
      ${showSrs ? `<div class="completeness-bar">${completenessHtml}</div>` : ''}
    </div>
    <div class="actions">
      <button class="btn-base" data-act="save">${actionLabel}</button>
      <button class="btn-base" data-act="tts">🔊</button>
      <button class="btn-base" data-act="copy" title="复制单词信息">📋</button>
      ${isSaved && showSrs ? `<button class="btn-base" data-act="delete" style="color:var(--bear);">✕</button>` : ''}
    </div>
  </div>`;
    }

    function bindVocabEvents(card, w, mode) {
      card.querySelectorAll('[data-act]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;
          if (act === 'save') {
            const exists = state.vocab.find(v => v.tier === w.tier && v.word === w.word);
            if (exists) {
              const ok = await confirmDialog(`将「${w.word}」从词库中移除？\n\n该词的复习进度（间隔、易度、复习次数）会一并清除。`, { title: '移除卡片', danger: true, confirmText: '移除' });
              if (ok) {
                const backup = { ...exists };
                state.vocab = state.vocab.filter(v => !(v.tier === w.tier && v.word === w.word));
                persistVocab();
                if (state.view === 'analysis') renderSidebars();
                else if (state.view === 'vocab') renderVocabBook();
                toastWithUndo(`已移除「${w.word}」`, 'warning', () => {
                  state.vocab.push(backup);
                  persistVocab();
                  if (state.view === 'analysis') renderSidebars();
                  else if (state.view === 'vocab') renderVocabBook();
                  toast('已恢复', 'success');
                });
              }
            } else {
              addVocabInternal(w);
              persistVocab();
              if (state.analysis) updateWordHistoryFromAnalysis(state.currentArticleId, state.analysis);
              if (state.view === 'analysis') { renderSidebars(); renderSentences(); }
              else if (state.view === 'vocab') renderVocabBook();
              toast(`已收藏 「${w.word}」`, 'success');
            }
          } else if (act === 'tts') { speak(w.word, 0.9, btn); }
          else if (act === 'copy') {
            const parts = [w.word];
            if (w.phonetic) parts.push(`[${w.phonetic}]`);
            if (w.pos) parts.push(`(${w.pos})`);
            parts.push(w.translation || '');
            if (w.note) parts.push(w.note);
            const text = parts.filter(Boolean).join('  ');
            navigator.clipboard.writeText(text).then(() => {
              btn.textContent = '✓';
              setTimeout(() => { btn.textContent = '📋'; }, 1500);
              toast('已复制到剪贴板', 'success');
            }).catch(() => toast('复制失败', 'error'));
          } else if (act === 'edit-root-affix') {
            openSupplementModal(w, 'rootAffix');
          } else if (act === 'supplement') {
            openSupplementModal(w, 'all');
          } else if (act === 'delete') {
            const ok = await confirmDialog(`删除卡片「${w.word}」？\n\n该卡的所有复习进度也会一同删除。可在 5 秒内撤销。`, { title: '删除卡片', danger: true, confirmText: '删除' });
            if (ok) {
              const backup = { ...w };
              state.vocab = state.vocab.filter(v => !(v.tier === w.tier && v.word === w.word));
              persistVocab();
              renderVocabBook();
              toastWithUndo(`已删除「${w.word}」`, 'warning', () => {
                state.vocab.push(backup);
                persistVocab();
                renderVocabBook();
                toast('已恢复', 'success');
              });
            }
          } else if (act === 'show-history') showHistoryPopup(w);
          else if (act === 'syn-save') {
            const sword = btn.dataset.word;
            if (state.vocab.some(v => v.word === sword)) {
              btn.textContent = '✓ 已收藏'; btn.disabled = true; return;
            }
            addVocabInternal({
              tier: 'vocab',
              word: sword,
              pos: btn.dataset.pos || '',
              translation: btn.dataset.zh || '',
              note: btn.dataset.diff || '',
              phonetic: '', examples: [], synonyms: [], examTags: [],
              sourceArticleId: state.currentArticleId,
              addedAt: Date.now(),
            });
            persistVocab();
            btn.textContent = '✓ 已收藏';
            btn.disabled = true;
            toast(`已收藏「${sword}」`, 'success');
          }
        });
      });
      card.querySelectorAll('.ex-tts').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); speak(b.dataset.tts, 0.9, b); }));
      card.querySelectorAll('.colloc-chip').forEach(c => c.addEventListener('click', (e) => { e.stopPropagation(); speak(c.dataset.tts, 0.9); }));
      card.querySelectorAll('.vocab-colloc-phrase[data-tts]').forEach(c => c.addEventListener('click', (e) => { e.stopPropagation(); speak(c.dataset.tts, 0.9); c.style.cursor = 'pointer'; }));
    }

    let _supplementCard = null;
    let _supplementMode = 'all';

    function openSupplementModal(w, mode = 'all') {
      _supplementCard = w;
      _supplementMode = mode;
      const modal = $('#supplementModal');
      const title = $('#supplementTitle');
      const fields = $('#supplementFields');
      if (!modal) return;
      title.textContent = `补充「${w.word}」的信息`;
      const ra = w.rootAffixMemory || {};
      let html = '';
      if (mode === 'all' || mode === 'basic') {
        if (!w.phonetic) html += `<div class="supplement-field"><label>音标 / Phonetic</label><input id="sup-phonetic" value="${escapeHtml(w.phonetic || '')}" placeholder="e.g. /ˈpɒlɪsi/" /></div>`;
        if (!w.translation) html += `<div class="supplement-field"><label>中文释义</label><input id="sup-translation" value="${escapeHtml(w.translation || '')}" placeholder="e.g. 政策；方针" /></div>`;
        if (!w.note) html += `<div class="supplement-field"><label>备注 / Note</label><textarea id="sup-note" placeholder="用法说明、语境等">${escapeHtml(w.note || '')}</textarea></div>`;
        if (!w.examples?.length) html += `<div class="supplement-field"><label>例句 (英文)</label><textarea id="sup-example-en" placeholder="e.g. The policy was implemented last quarter."></textarea></div><div class="supplement-field"><label>例句 (中文)</label><textarea id="sup-example-zh" placeholder="e.g. 该政策于上季度实施。"></textarea></div>`;
      }
      if (mode === 'all' || mode === 'rootAffix') {
        html += `<div class="supplement-field"><label>前缀 (prefix) + 含义</label><input id="sup-prefix" value="${escapeHtml(ra.prefix || '')}" placeholder="e.g. pre- = before，提前" /></div>`;
        html += `<div class="supplement-field"><label>词根 (root) + 含义</label><input id="sup-root" value="${escapeHtml(ra.root || '')}" placeholder="e.g. dict = say，说" /></div>`;
        html += `<div class="supplement-field"><label>后缀 (suffix) + 含义</label><input id="sup-suffix" value="${escapeHtml(ra.suffix || '')}" placeholder="e.g. -tion = 名词化" /></div>`;
        html += `<div class="supplement-field"><label>词根词缀解析</label><textarea id="sup-ra-explanation" placeholder="e.g. predict = 提前说出 → 预测">${escapeHtml(ra.explanation || '')}</textarea></div>`;
        html += `<div class="supplement-field"><label>记忆提示</label><textarea id="sup-ra-tip" placeholder="联想记忆法...">${escapeHtml(ra.memoryTip || '')}</textarea></div>`;
      }
      if (!html) {
        html = `<div class="supplement-field"><label>备注 / Note</label><textarea id="sup-note" placeholder="补充任何信息">${escapeHtml(w.note || '')}</textarea></div>`;
      }
      fields.innerHTML = html;
      modal.classList.remove('hidden');
    }

    function saveSupplementModal() {
      const w = _supplementCard;
      if (!w) return;
      const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : null; };
      const phonetic = g('sup-phonetic');
      const translation = g('sup-translation');
      const note = g('sup-note');
      const exEn = g('sup-example-en');
      const exZh = g('sup-example-zh');
      const prefix = g('sup-prefix');
      const root = g('sup-root');
      const suffix = g('sup-suffix');
      const raExp = g('sup-ra-explanation');
      const raTip = g('sup-ra-tip');
      if (phonetic !== null && phonetic) w.phonetic = phonetic;
      if (translation !== null && translation) w.translation = translation;
      if (note !== null && note) w.note = note;
      if (exEn !== null && exEn) {
        if (!Array.isArray(w.examples)) w.examples = [];
        w.examples.push({ en: exEn, zh: exZh || '' });
      }
      if (prefix !== null || root !== null || suffix !== null || raExp !== null || raTip !== null) {
        if (!w.rootAffixMemory) w.rootAffixMemory = {};
        if (prefix) w.rootAffixMemory.prefix = prefix;
        if (root) w.rootAffixMemory.root = root;
        if (suffix) w.rootAffixMemory.suffix = suffix;
        if (raExp) w.rootAffixMemory.explanation = raExp;
        if (raTip) w.rootAffixMemory.memoryTip = raTip;
      }
      persistVocab();
      closeSupplementModal();
      toast('已保存', 'success');
      if (state.view === 'vocab') renderVocabBook();
      else if (state.view === 'analysis') renderSidebars();
    }

    function closeSupplementModal() {
      $('#supplementModal')?.classList.add('hidden');
      _supplementCard = null;
    }

    function showHistoryPopup(w) {
      const hist = getWordHistory(w);
      if (!hist.length) return toast('暂无历史出现记录');
      const items = hist.slice(-8).reverse().map((h) => {
        const sent = (h.sentence || '').length > 120 ? h.sentence.slice(0, 120) + '...' : h.sentence;
        return `<b>${escapeHtml(h.articleTitle)}</b><br/><span style="color:var(--text-muted);font-family:inherit;">${escapeHtml(sent)}</span>`;
      });
      showDialog({
        title: `「${w.word}」的出现历史`,
        message: `该词在 ${hist.length} 篇文章中出现过。展示最近 ${Math.min(8, hist.length)} 次：`,
        icon: 'info',
        confirmText: '关闭',
        list: items,
      });
    }

    function showWordDetailPopup(savedCard) {
      const TIER_LABEL = { vocab: '词汇', pattern: '句式', phrase: '短语', proper: '专名' };
      const TIER_COLOR = { vocab: 'var(--vocab-color)', pattern: 'var(--pattern-color)', phrase: 'var(--phrase-color)', proper: 'var(--proper-color)' };
      $('#wdpTier').textContent = TIER_LABEL[savedCard.tier] || savedCard.tier;
      $('#wdpTier').style.color = TIER_COLOR[savedCard.tier] || 'var(--accent)';
      $('#wdpWord').textContent = savedCard.word;
      $('#wdpPhonetic').textContent = savedCard.phonetic ? `[${savedCard.phonetic}]` : '';
      $('#wdpZh').textContent = savedCard.translation || '';
      $('#wdpNote').textContent = savedCard.note || '';
      const ex = savedCard.examples?.[0];
      $('#wdpEx').textContent = ex ? `${ex.en}${ex.zh ? '\n' + ex.zh : ''}` : '';
      $('#wdpEx').classList.toggle('hidden', !ex);
      const actionsEl = $('#wdpActions');
      actionsEl.innerHTML = '';
      const ttsBtn = document.createElement('button');
      ttsBtn.className = 'btn-base'; ttsBtn.textContent = '🔊 朗读';
      ttsBtn.addEventListener('click', () => speak(savedCard.word, 0.9, ttsBtn));
      actionsEl.appendChild(ttsBtn);
      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn-base'; copyBtn.textContent = '📋 复制';
      copyBtn.addEventListener('click', () => {
        const t = [savedCard.word, savedCard.phonetic ? `[${savedCard.phonetic}]` : '', savedCard.translation].filter(Boolean).join('  ');
        navigator.clipboard.writeText(t).then(() => { copyBtn.textContent = '✓ 已复制'; setTimeout(() => { copyBtn.textContent = '📋 复制'; }, 1500); });
      });
      actionsEl.appendChild(copyBtn);
      $('#wordDetailPopup').classList.add('visible');
      $('#wordDetailOverlay').classList.add('visible');
    }

    function closeWordDetailPopup() {
      $('#wordDetailPopup').classList.remove('visible');
      $('#wordDetailOverlay').classList.remove('visible');
    }

    function renderSidebars() {
      const a = state.analysis;
      if (!a) return;
      const sections = [
        { id: '#sidePatterns', items: a.patterns, klass: 't-pattern', emptyText: '本文无句式', toCard: patternToVocab, tier: 'pattern', keyField: 'pattern' },
        { id: '#sidePhrases', items: a.phrases, klass: 't-phrase', emptyText: '本文无短语', toCard: phraseToVocab, tier: 'phrase', keyField: 'phrase' },
        { id: '#sideProperNouns', items: a.properNouns, klass: 't-proper', emptyText: '本文无专名', toCard: properToVocab, tier: 'proper', keyField: 'name' },
        { id: '#sideVocab', items: a.vocab, klass: 't-vocab', emptyText: '本文无新词', toCard: vocabToCard, tier: 'vocab', keyField: 'word' },
      ];
      sections.forEach(sec => {
        const box = $(sec.id);
        box.innerHTML = '';
        if (!sec.items?.length) {
          box.innerHTML = `<div class="empty" style="padding:40px 20px;"><div class="em">${sec.emptyText}</div></div>`;
          return;
        }
        sec.items.forEach(it => {
          const obj = sec.toCard(it);
          const isSaved = state.vocab.some(v => v.tier === sec.tier && v.word === it[sec.keyField]);
          const card = document.createElement('div');
          card.className = `vocab-card ${sec.klass}`;
          card.innerHTML = buildVocabCardHTML(obj, isSaved);
          bindVocabEvents(card, obj, 'toggle');
          box.appendChild(card);
        });
      });
      // Update FAB count and sheet tab counts
      const total = (a.patterns?.length||0)+(a.phrases?.length||0)+(a.properNouns?.length||0)+(a.vocab?.length||0);
      const fabCount = $('#articleFabCount'); if (fabCount) fabCount.textContent = total;
      const csp = $('#csCountPattern'); if (csp) csp.textContent = a.patterns?.length||0;
      const csph = $('#csCountPhrase'); if (csph) csph.textContent = a.phrases?.length||0;
      const cspr = $('#csCountProper'); if (cspr) cspr.textContent = a.properNouns?.length||0;
      const csv = $('#csCountVocab'); if (csv) csv.textContent = a.vocab?.length||0;
    }

    function renderCardSheetTab(tier) {
      const a = state.analysis;
      if (!a) return;
      const map = {
        pattern: { id: '#sheetPatterns', items: a.patterns, klass: 't-pattern', empty: '本文无句式', toCard: patternToVocab, keyField: 'pattern' },
        phrase:  { id: '#sheetPhrases',  items: a.phrases,  klass: 't-phrase',  empty: '本文无短语', toCard: phraseToVocab,  keyField: 'phrase'  },
        proper:  { id: '#sheetProperNouns', items: a.properNouns, klass: 't-proper', empty: '本文无专名', toCard: properToVocab, keyField: 'name' },
        vocab:   { id: '#sheetVocab',   items: a.vocab,    klass: 't-vocab',   empty: '本文无新词', toCard: vocabToCard,    keyField: 'word'    },
      };
      const sec = map[tier];
      if (!sec) return;
      const box = $(sec.id);
      if (!box || box.childElementCount > 0) return; // already rendered
      if (!sec.items?.length) {
        box.innerHTML = `<div class="empty" style="padding:40px 20px;text-align:center;"><div class="em">${sec.empty}</div></div>`;
        return;
      }
      sec.items.forEach(it => {
        const obj = sec.toCard(it);
        const isSaved = state.vocab.some(v => v.tier === tier && v.word === it[sec.keyField]);
        const card = document.createElement('div');
        card.className = `vocab-card ${sec.klass}`;
        card.innerHTML = buildVocabCardHTML(obj, isSaved);
        bindVocabEvents(card, obj, 'toggle');
        box.appendChild(card);
      });
    }

    function openCardSheet() {
      $('#cardSheet').classList.add('open');
      $('#cardSheetBackdrop').classList.add('open');
      const tier = state.cardSheetTier || 'pattern';
      setCardSheetTab(tier);
    }

    function closeCardSheet() {
      $('#cardSheet').classList.remove('open');
      $('#cardSheetBackdrop').classList.remove('open');
    }

    function setCardSheetTab(tier) {
      state.cardSheetTier = tier;
      $$('.cs-tab').forEach(b => b.classList.toggle('active', b.dataset.sheetTier === tier));
      $$('.sheet-panel').forEach(p => p.classList.remove('active'));
      const panelMap = { pattern: '#sheetPatterns', phrase: '#sheetPhrases', proper: '#sheetProperNouns', vocab: '#sheetVocab' };
      $(panelMap[tier])?.classList.add('active');
      renderCardSheetTab(tier);
    }

    window.openCardSheet = openCardSheet;
    window.closeCardSheet = closeCardSheet;
    window.setCardSheetTab = setCardSheetTab;

    let _vocabPage = 1;
    let _vocabRenderToken = 0;

    function renderVocabBook() {
      const renderToken = ++_vocabRenderToken;
      updateAllCounts();
      const total = state.vocab.length;
      if (total === 0) { show('#vocabEmpty'); hide('#vocabContent'); return; }
      hide('#vocabEmpty'); show('#vocabContent');
      const list = $('#vocabGrid');
      const now = Date.now();
      let filtered = state.vocab.filter(w => {
        if (state.vocabFilter === 'due') return !w.lastReview || w.due <= now;
        if (['pattern', 'phrase', 'proper', 'vocab'].includes(state.vocabFilter)) return w.tier === state.vocabFilter;
        return true;
      });
      if (state.vocabSearch) {
        const q = state.vocabSearch.toLowerCase();
        filtered = filtered.filter(w => (w.word || '').toLowerCase().includes(q) || (w.translation || '').toLowerCase().includes(q) || (w.note || '').toLowerCase().includes(q));
      }
      filtered.sort((a, b) => {
        const aDue = (!a.lastReview || a.due <= now) ? 0 : 1;
        const bDue = (!b.lastReview || b.due <= now) ? 0 : 1;
        if (aDue !== bDue) return aDue - bDue;
        return (b.addedAt || 0) - (a.addedAt || 0);
      });
      if (!filtered.length) {
        list.innerHTML = `<div class="empty" style="padding:42px 20px;"><div class="em">没有匹配卡片</div><p>换个关键词或筛选条件再试。</p></div>`;
        renderVocabPagination(list, 1, 0);
        renderFlipCard();
        return;
      }
      // 分页：超过 60 张时分页
      const totalPages = Math.max(1, Math.ceil(filtered.length / VOCAB_PAGE_SIZE));
      if (_vocabPage > totalPages) _vocabPage = 1;
      const pageItems = filtered.slice((_vocabPage - 1) * VOCAB_PAGE_SIZE, _vocabPage * VOCAB_PAGE_SIZE);

      // 优化：使用骨架屏 + requestIdleCallback 批量渲染
      list.innerHTML = '';
      if (pageItems.length > 10) {
        // 显示骨架屏
        const skeletonHtml = Array(Math.min(pageItems.length, 5)).fill().map(() =>
          '<div class="vocab-card skeleton"><div class="skeleton-sent"></div></div>'
        ).join('');
        list.innerHTML = skeletonHtml;

        // 使用 requestIdleCallback 分批渲染，避免阻塞主线程
        idle(() => renderVocabCardsInBatches(list, pageItems, 15, renderToken));
      } else {
        // 少量卡片直接渲染
        const frag = document.createDocumentFragment();
        pageItems.forEach(w => {
          const card = document.createElement('div');
          card.className = `vocab-card t-${w.tier}`;
          card.innerHTML = buildVocabCardHTML(w, true, true, false);
          bindVocabEvents(card, w, 'manage');
          frag.appendChild(card);
        });
        list.appendChild(frag);
      }

      renderVocabPagination(list, totalPages, filtered.length);
      renderFlipCard();
    }

    function renderVocabCardsInBatches(container, items, batchSize = 15, token = _vocabRenderToken) {
      const frag = document.createDocumentFragment();
      let index = 0;

      function processBatch() {
        if (token !== _vocabRenderToken) return;
        const end = Math.min(index + batchSize, items.length);
        for (let i = index; i < end; i++) {
          const w = items[i];
          const card = document.createElement('div');
          card.className = `vocab-card t-${w.tier}`;
          card.innerHTML = buildVocabCardHTML(w, true, true, false);
          bindVocabEvents(card, w, 'manage');
          frag.appendChild(card);
        }
        index = end;

        if (index < items.length) {
          idle(() => processBatch());
        } else {
          if (token !== _vocabRenderToken) return;
          container.innerHTML = '';
          container.appendChild(frag);
        }
      }

      processBatch();
    }

    function renderVocabPagination(container, totalPages, totalItems) {
      const existing = container.parentNode.querySelector('.pagination');
      if (existing) existing.remove();
      if (totalPages <= 1) return;
      const nav = document.createElement('div');
      nav.className = 'pagination';
      const prev = document.createElement('button');
      prev.className = 'page-btn'; prev.textContent = '‹'; prev.disabled = _vocabPage === 1;
      prev.addEventListener('click', () => { _vocabPage--; renderVocabBook(); window.scrollTo({ top: container.offsetTop - 80, behavior: 'smooth' }); });
      nav.appendChild(prev);
      // 紧凑分页：首页 ... 当前-1 当前 当前+1 ... 末页
      const pages = new Set([1, totalPages, _vocabPage, _vocabPage - 1, _vocabPage + 1]);
      const ordered = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
      let lastShown = 0;
      ordered.forEach(p => {
        if (p - lastShown > 1) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'page-info'; ellipsis.textContent = '…';
          nav.appendChild(ellipsis);
        }
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (p === _vocabPage ? ' active' : '');
        btn.textContent = p;
        btn.addEventListener('click', () => { _vocabPage = p; renderVocabBook(); window.scrollTo({ top: container.offsetTop - 80, behavior: 'smooth' }); });
        nav.appendChild(btn);
        lastShown = p;
      });
      const next = document.createElement('button');
      next.className = 'page-btn'; next.textContent = '›'; next.disabled = _vocabPage === totalPages;
      next.addEventListener('click', () => { _vocabPage++; renderVocabBook(); window.scrollTo({ top: container.offsetTop - 80, behavior: 'smooth' }); });
      nav.appendChild(next);
      const info = document.createElement('span');
      info.className = 'page-info'; info.textContent = `共 ${totalItems} 张`;
      nav.appendChild(info);
      container.parentNode.insertBefore(nav, container.nextSibling);
    }

    /* ============================================================
     *  PROGRESSIVE HINT
     * ============================================================ */
    let _hintLevel = 0;
    function resetHint() {
      _hintLevel = 0;
      const hd = $('#flipHintDisplay');
      if (hd) hd.textContent = '';
      const hb = $('#flipHintBtn');
      if (hb) hb.textContent = '💡 提示';
    }
    function showHint(w) {
      const word = (w.word || '').replace(/\(.*?\)/g, '').trim();
      const hd = $('#flipHintDisplay');
      const hb = $('#flipHintBtn');
      if (!hd || !word) return;
      _hintLevel++;
      if (_hintLevel === 1) {
        hd.textContent = word[0] + '_'.repeat(Math.max(0, word.length - 1));
        if (hb) hb.textContent = '💡 再多一点';
      } else if (_hintLevel === 2) {
        const half = Math.ceil(word.length / 2);
        hd.textContent = word.slice(0, half) + '_'.repeat(word.length - half);
        if (hb) hb.textContent = '💡 揭晓';
      } else {
        hd.textContent = word;
        _hintLevel = 0;
        if (hb) hb.textContent = '💡 提示';
      }
    }

    /* ============================================================
     *  POMODORO SESSION
     * ============================================================ */
    let _pomo = {
      active: false, queue: [], idx: 0, round: 1,
      againQueue: [], remaining: POMO_DURATION, intervalId: null,
      startedAt: null, baseRemaining: 0,
    };

    function pomoFmt(secs) {
      const m = Math.floor(secs / 60), s = secs % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function pomoTick() {
      if (!_pomo.startedAt) return;
      _pomo.remaining = Math.max(0, _pomo.baseRemaining - Math.floor((Date.now() - _pomo.startedAt) / 1000));
      const el = $('#pomoTimer');
      if (el) { el.textContent = pomoFmt(_pomo.remaining); el.classList.toggle('urgent', _pomo.remaining <= 60); }
      if (_pomo.remaining <= 0) { pomoPause(); pomoOnTimerEnd(); }
    }

    function pomoOnTimerEnd() {
      toast('⏰ 25分钟到！休息5分钟再继续', 'success');
      pomoShowRoundSummary(true);
    }

    function pomoUpdateProgress() {
      const el = $('#pomoProg');
      if (el) el.textContent = `${_pomo.idx} / ${_pomo.queue.length} 已复习`;
      const re = $('#pomoRound');
      if (re) re.textContent = `第 ${_pomo.round} 轮`;
    }

    function pomoUpdateStartHint() {
      const dueCount = getReviewPool().length;
      const hint = $('#pomoDueHint');
      if (!hint) return;
      if (dueCount > 0) {
        hint.textContent = `· ${Math.min(dueCount, POMO_LIMIT)} 词`;
        hint.style.opacity = '.7';
      } else {
        hint.textContent = '';
      }
    }

    function pomoStart() {
      if (!state.vocab.length) { toast('卡组为空，请先添加词汇', 'warning'); return; }
      if (state.trainingMode !== 'cloze') state.clozeForce = false;
      const due = getReviewPool();
      let queue;
      if (due.length > 0) {
        queue = [...due].sort((a, b) => (a.due || 0) - (b.due || 0)).slice(0, POMO_LIMIT);
      } else {
        // No due cards — shuffle all for a free review round
        queue = [...state.vocab].sort(() => Math.random() - .5).slice(0, POMO_LIMIT);
        toast(`当前没有到期词汇，随机抽取 ${queue.length} 词复习`, 'info');
      }
      _pomo.active = true;
      _pomo.queue = queue;
      _pomo.idx = 0;
      _pomo.round = 1;
      _pomo.againQueue = [];
      _pomo.remaining = POMO_DURATION;
      state.flipIdx = 0;
      state.flipped = false;
      $('#flipInner').classList.remove('flipped');
      show('#pomoBar');
      hide('#pomoStart');
      $('#pomoTimer').textContent = pomoFmt(_pomo.remaining);
      $('#pomoTimer').classList.remove('urgent');
      pomoUpdateProgress();
      _pomo.startedAt = Date.now();
      _pomo.baseRemaining = POMO_DURATION;
      _pomo.intervalId = setInterval(pomoTick, 1000);
      renderFlipCard();
      if (due.length > 0) toast(`开始复习！${queue.length} 词 · 25分钟番茄钟 · 加油`, 'success');
    }

    function pomoPause() {
      if (_pomo.intervalId) {
        clearInterval(_pomo.intervalId);
        _pomo.intervalId = null;
        if (_pomo.startedAt) {
          _pomo.remaining = Math.max(0, _pomo.baseRemaining - Math.floor((Date.now() - _pomo.startedAt) / 1000));
          _pomo.startedAt = null;
        }
      }
    }

    function pomoStop() {
      pomoPause();
      _pomo.active = false;
      _pomo.queue = [];
      state.clozeForce = false;
      state.clozeDeckOverride = null;
      v68_clearClozeState();
      hide('#pomoBar');
      show('#pomoStart');
      state.flipIdx = 0;
      state.flipped = false;
      $('#flipInner').classList.remove('flipped');
      pomoUpdateStartHint();
      renderFlipCard();
    }

    function pomoShowRoundSummary(timerExpired) {
      pomoPause();
      const total = _pomo.queue.length;
      const againCount = _pomo.againQueue.length;
      const goodCount = total - againCount;
      const prefix = timerExpired ? '⏰ 时间到！\n' : '';
      if (againCount > 0) {
        showDialog({
          title: `第 ${_pomo.round} 轮完成`,
          message: `${prefix}✓ 掌握 ${goodCount} 词　✗ 待巩固 ${againCount} 词\n\n继续第 ${_pomo.round + 1} 轮复习这 ${againCount} 个词，或结束本次番茄？`,
          icon: 'success',
          confirmText: `开始第 ${_pomo.round + 1} 轮（${againCount} 词）`,
          cancelText: '结束本次复习',
        }).then(ok => { if (ok) pomoNextRound(); else pomoStop(); });
      } else {
        showDialog({
          title: '全部掌握！',
          message: `${prefix}🎉 ${total} 词全部掌握！\n本次番茄复习圆满完成。`,
          icon: 'success',
          confirmText: '太棒了',
        }).then(() => pomoStop());
      }
    }

    function pomoNextRound() {
      _pomo.round++;
      _pomo.queue = [..._pomo.againQueue];
      _pomo.againQueue = [];
      _pomo.idx = 0;
      _pomo.remaining = POMO_DURATION;
      state.flipIdx = 0;
      state.flipped = false;
      $('#flipInner').classList.remove('flipped');
      $('#pomoTimer').textContent = pomoFmt(_pomo.remaining);
      $('#pomoTimer').classList.remove('urgent');
      pomoUpdateProgress();
      _pomo.startedAt = Date.now();
      _pomo.baseRemaining = POMO_DURATION;
      _pomo.intervalId = setInterval(pomoTick, 1000);
      renderFlipCard();
      toast(`第 ${_pomo.round} 轮开始！${_pomo.queue.length} 词需要巩固`, 'warning');
    }

    function getFlipPool() {
      if (_pomo.active) return _pomo.queue;
      return state.vocab.filter(w => {
        if (state.vocabFilter === 'due') return !w.lastReview || w.due <= Date.now();
        if (['pattern', 'phrase', 'proper', 'vocab'].includes(state.vocabFilter)) return w.tier === state.vocabFilter;
        return true;
      });
    }

    function currentFlipCard() {
      const pool = getFlipPool();
      if (!pool.length) return null;
      if (state.flipIdx >= pool.length) state.flipIdx = 0;
      return pool[state.flipIdx];
    }

    function renderFlipCard() {
      const pool = getFlipPool();
      $('#flipCount').textContent = `${state.flipIdx + 1} / ${pool.length || 0}`;
      resetHint();
      v68_clearClozeState();
      if (!pool.length) {
        $('#flipWord').textContent = '— 空 —';
        $('#flipZh').textContent = '当前筛选下没有卡片';
        $('#flipPhonetic').textContent = ''; $('#flipPos').textContent = ''; $('#flipNote').textContent = '';
        $('#flipTierMark').textContent = '--'; $('#flipTierMarkBack').textContent = '--';
        $('#flipExampleContainer').classList.add('hidden');
        $('#flipBackExtra').innerHTML = '';
        const lb = $('#flipLeechBadge'); if (lb) lb.classList.add('hidden');
        $('#spellWrap')?.classList.remove('active');
        return;
      }
      const w = pool[state.flipIdx % pool.length];
      const tierLabel = { pattern: 'PATTERN', phrase: 'PHRASE', proper: 'PROPER', vocab: 'VOCAB' }[w.tier] || 'CARD';
      if (v68_shouldUseCloze(w)) {
        v68_renderClozeCard(w, tierLabel);
        return;
      }
      $('#flipTierMark').textContent = tierLabel;
      $('#flipTierMark').className = `flip-tier-mark t-${w.tier}`;
      $('#flipTierMarkBack').textContent = tierLabel;
      $('#flipTierMarkBack').className = `flip-tier-mark t-${w.tier}`;

      // Leech badge
      const lb = $('#flipLeechBadge');
      if (lb) {
        const hc = w.hardCount || 0;
        if (hc >= 5) { lb.textContent = `🔥 难词 ×${hc}`; lb.classList.remove('hidden'); }
        else lb.classList.add('hidden');
      }

      const isSpell = state.studyMode === 'spell';
      const isZh2En = state.studyMode === 'zh2en' || isSpell;
      $('#flipModeMarkFront').textContent = isSpell ? 'SPELL' : isZh2En ? 'ZH→EN' : 'EN→ZH';
      $('#flipModeMarkBack').textContent = 'ANSWER';
      $('#flipClickHint').textContent = isSpell ? '输入单词后翻面查看答案' : '点击翻面查看答案';

      // Spell mode input
      const sw = $('#spellWrap');
      if (sw) {
        sw.classList.toggle('active', isSpell);
        if (isSpell) {
          const si = $('#spellInput');
          if (si) { si.value = ''; si.className = 'spell-input'; si.focus(); }
          $('#spellFeedback').textContent = '输入英文单词，按 Enter 提交';
        }
      }

      const flipWordEl = $('#flipWord');
      flipWordEl.className = 'flip-word';
      if (w.tier === 'pattern') flipWordEl.classList.add('pattern');
      else if (w.word.length > 18) flipWordEl.classList.add('long');
      if (isZh2En) {
        flipWordEl.classList.add('front-zh');
        flipWordEl.textContent = w.translation || '—';
        $('#flipPhonetic').textContent = isSpell
          ? (w.phonetic ? w.phonetic + ' · 请拼写' : '请拼写英文')
          : (w.pos ? `[${w.pos}] · 默写英文` : '默写英文');
        $('#flipPos').textContent = tierLabel;
        let backHtml = `<div style="font-family:'Fraunces',serif;font-size:${w.tier === 'pattern' ? '20px' : '32px'};font-weight:700;color:var(--text-main);margin-bottom:10px;word-break:break-word;line-height:1.3;">${escapeHtml(w.word)}</div>`;
        if (w.phonetic) backHtml += `<div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text-muted);margin-bottom:8px;">${escapeHtml(w.phonetic)}</div>`;
        $('#flipZh').innerHTML = backHtml;
        $('#flipNote').textContent = w.note || '';
      } else {
        flipWordEl.classList.remove('front-zh');
        flipWordEl.textContent = w.word;
        $('#flipPhonetic').textContent = w.phonetic || '';
        $('#flipPos').textContent = w.pos || tierLabel;
        $('#flipZh').textContent = w.translation || '';
        $('#flipNote').textContent = w.note || '';
      }
      const hist = getWordHistory(w);
      let exHtml = '';
      if (hist.length > 0) {
        const pick = hist[Math.floor(Math.random() * hist.length)];
        let displaySent = pick.sentence;
        if (isZh2En && w.tier !== 'pattern') {
          const safe = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          displaySent = displaySent.replace(new RegExp(`\\b${safe}\\b`, 'gi'), '_____');
        }
        exHtml = `<div style="font-size:13.5px;line-height:1.6;color:var(--text-main);">${escapeHtml(displaySent)}</div>
      ${pick.translation ? `<div style="color:var(--text-muted);font-size:12px;margin-top:6px;">${escapeHtml(pick.translation)}</div>` : ''}
      <div class="ex-history">📚 历史例句 · ${escapeHtml(pick.articleTitle)} · 共 ${hist.length} 次出现</div>`;
      } else if (w.examples?.length) {
        const ex = w.examples[0];
        let displayEn = ex.en;
        if (isZh2En && w.tier !== 'pattern') {
          const safe = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          displayEn = displayEn.replace(new RegExp(`\\b${safe}\\b`, 'gi'), '_____');
        }
        exHtml = `<div style="font-size:13.5px;line-height:1.6;">${escapeHtml(displayEn)}</div>
      ${ex.zh ? `<div style="color:var(--text-muted);font-size:12px;margin-top:6px;">${escapeHtml(ex.zh)}</div>` : ''}`;
      }
      if (exHtml) { $('#flipExampleContainer').innerHTML = exHtml; $('#flipExampleContainer').classList.remove('hidden'); }
      else $('#flipExampleContainer').classList.add('hidden');

      // Back extra: deep analysis + word family + root-affix
      const fbe = $('#flipBackExtra');
      if (fbe) {
        let extra = '';
        if (w.deep_analysis) extra += `<div class="flip-deep">${escapeHtml(w.deep_analysis)}</div>`;
        if (w.wordFamily?.length) extra += `<div class="flip-wf">${w.wordFamily.map(f => `<span class="wf-chip">${escapeHtml(f.word)} <em>${escapeHtml(f.pos||'')}</em></span>`).join('')}</div>`;
        const ra2 = w.rootAffixMemory;
        if (ra2?.explanation || ra2?.memoryTip) {
          extra += `<div class="flip-root-affix">🔤 ${escapeHtml(ra2.explanation || ra2.memoryTip || '')}</div>`;
        }
        fbe.innerHTML = extra;
      }

      $('#int3').textContent = previewInterval(w, 3);
      $('#int4').textContent = previewInterval(w, 4);
      state.flipped = false;
      $('#flipInner').classList.remove('flipped');
      const fc = $('.flip-card');
      if (fc) fc.style.transform = '';
      const go = $('#gestureOverlay');
      if (go) go.className = 'gesture-overlay';
      v68_resetRecallGate();
    }

    function reviewCard(quality, meta = {}) {
      const pool = getFlipPool();
      if (!pool.length) return;
      const w = pool[state.flipIdx % pool.length];
      ensureMemoryFields(w);
      if (quality <= 3 && !meta.skipReasonPanel && !meta.reasons) {
        showMistakeReasonPanel(w, quality, meta);
        return;
      }
      const updates = sm2(w, quality);
      const nextLabel = v68_dueLabelFromMs(Math.max(0, updates.due - Date.now()));
      Object.assign(w, updates);
      // Track difficulty: leech threshold = hardCount >= 5
      if (quality <= 3) w.hardCount = (w.hardCount || 0) + 1;
      else w.hardCount = Math.max(0, (w.hardCount || 0) - 1);
      if (quality <= 3) recordMistake(w, meta.reasons || [], { mode: state.trainingMode || state.studyMode || 'review', userAnswer: meta.userAnswer || '', correctAnswer: meta.correctAnswer || w.word || '' });
      else recordRecovery(w);
      state.reviewLog.push({ ts: Date.now(), tier: w.tier, word: w.word, quality });
      if (state.session?.active) {
        state.session.reviewed++;
        if (quality === 4) state.session.good++;
        else if (quality === 3) state.session.hard++;
        else state.session.again++;
      }
      persistReviewLog(); persistVocab();
      const labels = { 0: '不认识', 3: '不确定', 4: '认识' };
      toast(`${labels[quality]} · 下次 ${nextLabel}`, quality <= 3 ? 'warning' : 'success');
      state.flipped = false;
      $('#flipInner').classList.remove('flipped');
      updateStreakBadge(); updateGoalsBanner(); renderV64Dashboard();
      if (_pomo.active) {
        if (quality < 3) _pomo.againQueue.push(w);
        _pomo.idx++;
        pomoUpdateProgress();
        if (_pomo.idx >= _pomo.queue.length) {
          state.flipIdx = 0;
          renderFlipCard(); renderVocabBook();
          pomoShowRoundSummary(false);
        } else {
          state.flipIdx = _pomo.idx;
          renderFlipCard(); renderVocabBook();
        }
      } else {
        state.flipIdx = (state.flipIdx + 1) % pool.length;
        renderFlipCard(); renderVocabBook();
      }
    }
    function nextCard() { const pool = getFlipPool(); if (!pool.length) return; state.flipIdx = (state.flipIdx + 1) % pool.length; renderFlipCard(); }
    function prevCard() { const pool = getFlipPool(); if (!pool.length) return; state.flipIdx = (state.flipIdx - 1 + pool.length) % pool.length; renderFlipCard(); }

    function calculateStreak() {
      const reviewDays = new Set(state.reviewLog.map(r => {
        const d = new Date(r.ts); d.setHours(0, 0, 0, 0); return d.getTime();
      }));
      const today = new Date(); today.setHours(0, 0, 0, 0);
      let streak = 0;
      let cur = today.getTime();
      while (reviewDays.has(cur)) { streak++; cur -= 86400000; }
      return streak;
    }

    function updateGoalsBanner() {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const ts = todayStart.getTime();
      const reviewsToday = state.reviewLog.filter(r => r.ts >= ts).length;
      const articlesToday = state.articles.filter(a => a.addedAt >= ts).length;
      const rTarget = state.dailyGoals.reviewTarget;
      const aTarget = state.dailyGoals.articleTarget;
      const rPct = Math.min(100, Math.round(reviewsToday / rTarget * 100));
      const aPct = Math.min(100, Math.round(articlesToday / aTarget * 100));
      const rBar = $('#goalsReviewBar'); const aBar = $('#goalsArticleBar');
      if (!rBar) return;
      const rWasDone = rBar.classList.contains('done');
      const aWasDone = aBar.classList.contains('done');
      rBar.style.width = rPct + '%';
      rBar.classList.toggle('done', rPct >= 100);
      aBar.style.width = aPct + '%';
      aBar.classList.toggle('done', aPct >= 100);
      $('#goalsReviewVal').textContent = `${reviewsToday}/${rTarget}`;
      $('#goalsArticleVal').textContent = `${articlesToday}/${aTarget}`;
      // 庆祝目标达成（仅在状态从未完成切到完成时触发）
      const todayKey = new Date().toDateString();
      const celebrated = sessionStorage.getItem('finread:celebrated:' + todayKey) || '';
      if (rPct >= 100 && !rWasDone && !celebrated.includes('r')) {
        celebrate(32);
        toast('🎉 今日复习目标达成！', 'success');
        sessionStorage.setItem('finread:celebrated:' + todayKey, celebrated + 'r');
      }
      if (aPct >= 100 && !aWasDone && !celebrated.includes('a')) {
        celebrate(24);
        toast('🎉 今日精读目标达成！', 'success');
        sessionStorage.setItem('finread:celebrated:' + todayKey, (sessionStorage.getItem('finread:celebrated:' + todayKey) || '') + 'a');
      }
    }

    function updateStreakBadge() {
      const streak = calculateStreak();
      const el = $('#streakBadge');
      if (el) {
        el.textContent = `🔥 ${streak}天`;
        el.title = streak > 0 ? `连续打卡 ${streak} 天！` : '今天还没有复习，加油！';
        el.classList.toggle('streak-0', streak === 0);
      }
      const hsEl = $('#hsStreak');
      if (hsEl) hsEl.textContent = streak;
    }

    function renderHistoryView() {
      const total = state.articles.length;
      $('#articleTotal').textContent = total;
      if (!total) { show('#historyEmpty'); $('#historyGrid').innerHTML = ''; return; }
      const q = state.historySearch.trim().toLowerCase();
      let articles = state.articles;
      if (q) {
        articles = articles.filter(a =>
          (a.title || '').toLowerCase().includes(q) ||
          (a.preview || '').toLowerCase().includes(q) ||
          (a.raw || '').toLowerCase().includes(q)
        );
      }
      if (!articles.length) {
        show('#historyEmpty');
        $('#historyEmpty').querySelector('.em').textContent = `无匹配结果：「${q}」`;
        $('#historyGrid').innerHTML = '';
        return;
      }
      $('#historyEmpty').querySelector('.em').textContent = '尚无归档文章';
      hide('#historyEmpty');
      const grid = $('#historyGrid');
      grid.innerHTML = '';
      const frag = document.createDocumentFragment();
      articles.forEach(a => {
        const date = new Date(a.addedAt);
        const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `<div class="a-body">
      <div class="a-title">${escapeHtml(a.title)}</div>
      <div class="a-meta">${dateStr} · ${a.lang === 'zh' ? '中文' : 'EN'} · ${a.raw.length} chars · ${a.stats.sentences} 句</div>
      <div class="a-preview">${escapeHtml(a.preview)}</div>
      <div class="a-tags">
        <span class="a-tag pattern">${a.stats.patterns} 句式</span>
        <span class="a-tag phrase">${a.stats.phrases} 短语</span>
        <span class="a-tag proper">${a.stats.properNouns} 专名</span>
        <span class="a-tag vocab">${a.stats.vocab} 词</span>
      </div>
    </div>
    <div class="a-actions">
      <button class="btn-base" data-act="reload">↺ 重新载入</button>
      <button class="btn-base" data-act="delete" style="color:var(--bear);">✕ 删除</button>
    </div>`;
        card.querySelector('[data-act="reload"]').addEventListener('click', () => {
          $('#newsInput').value = a.raw;
          onInputChange();
          setView('input');
          toast('已载入到输入区', 'success');
        });
        card.querySelector('[data-act="delete"]').addEventListener('click', async () => {
          const ok = await confirmDialog(`删除文章「${a.title}」？\n\n该文章相关的词汇出现记录也会一同清除。可在 5 秒内撤销。`, { title: '删除文章', danger: true, confirmText: '删除' });
          if (!ok) return;
          const articleBackup = { ...a };
          const historyBackup = {};
          Object.keys(state.wordHistory).forEach(k => {
            const removed = state.wordHistory[k].filter(h => h.articleId === a.id);
            if (removed.length) historyBackup[k] = removed;
            state.wordHistory[k] = state.wordHistory[k].filter(h => h.articleId !== a.id);
            if (state.wordHistory[k].length === 0) delete state.wordHistory[k];
          });
          state.articles = state.articles.filter(x => x.id !== a.id);
          persistArticles(); persistWordHistory();
          renderHistoryView();
          toastWithUndo(`已删除「${a.title.slice(0, 28)}」`, 'warning', () => {
            state.articles.unshift(articleBackup);
            state.articles.sort((x, y) => (y.addedAt || 0) - (x.addedAt || 0));
            Object.keys(historyBackup).forEach(k => {
              state.wordHistory[k] = (state.wordHistory[k] || []).concat(historyBackup[k]);
            });
            persistArticles(); persistWordHistory();
            renderHistoryView();
            toast('已恢复', 'success');
          });
        });
        frag.appendChild(card);
      });
      grid.appendChild(frag);
    }

    function renderStatsView() {
      const total = state.vocab.length;
      const due = getReviewPool().length;
      const mature = state.vocab.filter(v => cardStatus(v) === 'mature').length;
      const learning = state.vocab.filter(v => cardStatus(v) === 'learning').length;
      const newCards = state.vocab.filter(v => !v.lastReview).length;
      const totalReviews = state.reviewLog.length;
      const last7 = state.reviewLog.filter(r => r.ts > Date.now() - 7 * 86400000).length;
      const last30 = state.reviewLog.filter(r => r.ts > Date.now() - 30 * 86400000).length;
      const retention = totalReviews > 0 ? Math.round(state.reviewLog.filter(r => r.quality >= 3).length / totalReviews * 100) : 0;
      const totalArticles = state.articles.length;
      const totalHistoryEntries = Object.values(state.wordHistory).reduce((a, b) => a + b.length, 0);
      const streak = calculateStreak();
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const reviewsToday = state.reviewLog.filter(r => r.ts >= todayStart.getTime()).length;
      const blocks = [
        { label: '🔥 连续打卡', value: streak + ' 天', sub: streak > 0 ? `今日已复习 ${reviewsToday} 张` : '今天还未打卡', subClass: streak > 0 ? 'up' : 'down' },
        { label: '卡片总量', value: total, sub: `+${newCards} 新卡` },
        { label: '今日待复习', value: due, sub: due > 0 ? '⏰ 立即开始' : '✓ 已清空', subClass: due > 0 ? 'down' : 'up' },
        { label: '熟练卡', value: mature, sub: `${Math.round(mature / Math.max(1, total) * 100)}% of total` },
        { label: '学习中', value: learning, sub: `+${learning - mature} growing` },
        { label: '近 7 日复习', value: last7, sub: `近 30 日 ${last30}` },
        { label: '记忆保持率', value: retention + '%', sub: `${state.reviewLog.filter(r => r.quality < 3).length} 次未掌握` },
        { label: '已归档文章', value: totalArticles, sub: `${totalHistoryEntries} 历史例句` },
        { label: '句式 / 目标', value: `${countByTier('pattern')}/${PATTERN_GOAL}`, sub: `${Math.round(countByTier('pattern') / PATTERN_GOAL * 100)}%` },
      ];
      $('#statsTopBlocks').innerHTML = blocks.map(b => `<div class="stat-block">
    <div class="label">${b.label}</div>
    <div class="big">${b.value}</div>
    <div class="delta ${b.subClass || ''}">${b.sub}</div>
  </div>`).join('');
      const days = 14;
      const reviewBuckets = new Array(days).fill(0);
      const growthBuckets = new Array(days).fill(0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      state.reviewLog.forEach(r => {
        const d = new Date(r.ts); d.setHours(0, 0, 0, 0);
        const diff = Math.round((today - d) / 86400000);
        if (diff >= 0 && diff < days) reviewBuckets[days - 1 - diff]++;
      });
      state.vocab.forEach(v => {
        if (!v.addedAt) return;
        const d = new Date(v.addedAt); d.setHours(0, 0, 0, 0);
        const diff = Math.round((today - d) / 86400000);
        if (diff >= 0 && diff < days) growthBuckets[days - 1 - diff]++;
      });
      const renderBarChart = (id, buckets) => {
        const maxVal = Math.max(...buckets, 1);
        const html = buckets.map((v, i) => {
          const h = (v / maxVal * 100).toFixed(1);
          const dayOffset = days - 1 - i;
          const date = new Date(today.getTime() - dayOffset * 86400000);
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          return `<div class="bar-col">
        <div class="bar-tooltip">${label} · ${v}</div>
        <div class="bar" style="height:${h}%"></div>
        <div class="bar-label">${label}</div>
      </div>`;
        }).join('');
        $('#' + id).innerHTML = html;
      };
      renderBarChart('reviewChart', reviewBuckets);
      renderBarChart('growthChart', growthBuckets);
      idle(() => renderHeatmap());
    }

    function renderHeatmap() {
      const days = 90;
      const buckets = new Array(days).fill(0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      state.reviewLog.forEach(r => {
        const d = new Date(r.ts); d.setHours(0, 0, 0, 0);
        const diff = Math.round((today - d) / 86400000);
        if (diff >= 0 && diff < days) buckets[days - 1 - diff]++;
      });
      const max = Math.max(...buckets, 1);
      const level = v => v === 0 ? '' : v <= max * 0.25 ? 'l1' : v <= max * 0.5 ? 'l2' : v <= max * 0.75 ? 'l3' : 'l4';
      const frag = document.createDocumentFragment();
      buckets.forEach((v, i) => {
        const dayOffset = days - 1 - i;
        const date = new Date(today.getTime() - dayOffset * 86400000);
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell ' + level(v);
        cell.title = `${date.getMonth() + 1}/${date.getDate()} · ${v} 次复习`;
        frag.appendChild(cell);
      });
      const grid = $('#reviewHeatmap');
      grid.innerHTML = '';
      grid.appendChild(frag);
    }

    /* ============================================================
     *  SHARED SYNC HELPERS  (used by both Notion and JSONBin)
     * ============================================================ */
    // Append a timestamped log line to a sync-log textarea
    function appendSyncLog(selector, msg) {
      const el = $(selector);
      if (!el) return;
      el.value = `[${new Date().toLocaleTimeString()}] ${msg}\n` + el.value;
    }

    // Smart-merge a remote sync payload into local state.
    // Returns { added, updated, articleAdded } so callers can report.
    function mergeRemoteData(remote) {
      const localMap = new Map(state.vocab.map(v => [`${v.tier}::${v.word}`, v]));
      let added = 0, updated = 0;
      (remote.vocab || []).forEach(rv => {
        const k = `${rv.tier}::${rv.word}`;
        const lv = localMap.get(k);
        if (!lv) { state.vocab.push(rv); added++; }
        else if ((rv.lastReview || 0) > (lv.lastReview || 0)) { Object.assign(lv, rv); updated++; }
      });
      const articleIds = new Set(state.articles.map(a => a.id));
      let articleAdded = 0;
      (remote.articles || []).forEach(ra => { if (!articleIds.has(ra.id)) { state.articles.push(ra); articleAdded++; } });
      if (articleAdded) state.articles.sort((a, b) => b.addedAt - a.addedAt);
      Object.entries(remote.wordHistory || {}).forEach(([k, v]) => {
        if (!state.wordHistory[k]) state.wordHistory[k] = [];
        v.forEach(rh => {
          if (!state.wordHistory[k].find(lh => lh.articleId === rh.articleId && lh.sentenceId === rh.sentenceId)) {
            state.wordHistory[k].push(rh);
          }
        });
      });
      const tsSet = new Set(state.reviewLog.map(r => r.ts));
      (remote.reviewLog || []).forEach(r => { if (!tsSet.has(r.ts)) state.reviewLog.push(r); });
      state.reviewLog.sort((a, b) => a.ts - b.ts);
      persistVocab(); persistArticles(); persistWordHistory(); persistReviewLog();
      return { added, updated, articleAdded };
    }

    // Re-render whichever data view the user is currently looking at
    function rerenderActiveDataView() {
      if (state.view === 'vocab') renderVocabBook();
      else if (state.view === 'history') renderHistoryView();
      else if (state.view === 'stats') renderStatsView();
    }

    function buildSyncPayload({
      articleRaw = false, includeArticles = true,
      limitReviewLog = 0, version = 6,
      withWordHistory = false, withStats = false,
    } = {}) {
      const payload = {
        version, updatedAt: Date.now(),
        vocab: state.vocab,
        reviewLog: limitReviewLog > 0 ? state.reviewLog.slice(-limitReviewLog) : state.reviewLog,
      };
      if (includeArticles) {
        payload.articles = state.articles.map(a => articleRaw
          ? { ...a, raw: a.raw.slice(0, 1500) }
          : { id: a.id, title: a.title, url: a.url || '', addedAt: a.addedAt, source: a.source || '', wordCount: a.wordCount || 0 }
        );
      }
      if (withWordHistory) payload.wordHistory = state.wordHistory;
      if (withStats) payload.stats = {
        vocab: state.vocab.length, articles: state.articles.length,
        wordHistoryKeys: Object.keys(state.wordHistory).length, reviewLog: state.reviewLog.length,
      };
      return payload;
    }
    /* ============================================================
     *  TOOLTIPS
     * ============================================================ */
    function positionTooltip(tt, target) {
      tt.classList.remove('hidden');
      const rect = target.getBoundingClientRect();
      const ttWidth = 340;
      let left = rect.left + window.scrollX;
      if (left + ttWidth > window.innerWidth - 20) left = window.innerWidth - ttWidth - 20;
      let top = rect.bottom + window.scrollY + 8;
      tt.style.left = left + 'px';
      tt.style.top = top + 'px';
      setTimeout(() => tt.classList.add('visible'), 10);
    }

    function showVocabTooltip(target, data) {
      const tt = $('#wordTooltip');
      tt.innerHTML = `<div class="tt-head">
      <div>
        <span class="tt-word">${escapeHtml(data.word)}</span>
        ${data.phonetic ? `<span class="tt-phonetic">${escapeHtml(data.phonetic)}</span>` : ''}
      </div>
      <button class="ex-tts" data-tts="${escapeHtml(data.word)}">🔊</button>
    </div>
    ${data.pos ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);margin-bottom:6px;">${escapeHtml(data.pos)}</div>` : ''}
    <div class="tt-zh">${escapeHtml(data.translation || '')}</div>
    ${data.note ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.5;">${escapeHtml(data.note)}</div>` : ''}
    ${data.replacements ? `<div class="tt-rep">SYN: ${escapeHtml(data.replacements)}</div>` : ''}
    ${data.examples?.[0] ? `<div class="tt-ex">${escapeHtml(data.examples[0].en)}<div class="tt-ex-zh">${escapeHtml(data.examples[0].zh || '')}</div></div>` : ''}`;
      tt.querySelector('.ex-tts')?.addEventListener('click', (e) => { e.stopPropagation(); speak(data.word, 0.9, e.target); });
      positionTooltip(tt, target);
    }

    function showPhraseTooltip(target, data) {
      const tt = $('#wordTooltip');
      const colloc = (data.collocations || []).slice(0, 4).map(c => `<span class="colloc-chip-mini">${escapeHtml(c)}</span>`).join('');
      const similar = (data.similar || []).slice(0, 2).map(s => `<div class="tt-similar-row"><b>${escapeHtml(s.phrase)}</b> · ${escapeHtml(s.diff || '')}</div>`).join('');
      tt.innerHTML = `<div class="tt-head">
      <div>
        <div class="tt-type-icon" style="background:var(--phrase-bg);color:var(--phrase-color);">${escapeHtml(data.type || 'phrase')}</div>
        <div class="tt-word">${escapeHtml(data.phrase)}</div>
      </div>
    </div>
    <div class="tt-zh">${escapeHtml(data.translation)}</div>
    ${data.note ? `<div class="tt-rep" style="background:var(--phrase-bg);color:var(--phrase-color);">${escapeHtml(data.note)}</div>` : ''}
    ${colloc ? `<div class="tt-section-label">搭配</div><div class="tt-colloc-row">${colloc}</div>` : ''}
    ${similar ? `<div class="tt-section-label">辨析</div>${similar}` : ''}`;
      positionTooltip(tt, target);
    }

    function showProperTooltip(target, data) {
      const tt = $('#wordTooltip');
      tt.innerHTML = `<div class="tt-type-icon">${escapeHtml(PROPER_TYPE_LABELS[data.type] || data.type)}</div>
    <div class="tt-word">${escapeHtml(data.name)}</div>
    <div class="tt-zh" style="margin-top:6px;">${escapeHtml(data.translation || '')}</div>
    ${data.note ? `<div style="font-size:13px;color:var(--text-soft);line-height:1.5;margin-top:6px;">${escapeHtml(data.note)}</div>` : ''}`;
      positionTooltip(tt, target);
    }

    /* ============================================================
     *  SELECTION ADD
     * ============================================================ */
    function v69_isMobileSelectUI() {
      return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 700;
    }

    function v69_selectionContextFromNode(node) {
      let parent = node?.nodeType === 1 ? node : node?.parentNode;
      while (parent && !parent.classList?.contains('sent')) parent = parent.parentNode;
      return {
        sent: parent,
        context: parent ? parent.querySelector('.sent-en')?.textContent || '' : '',
        sentenceId: parent?.dataset?.sid || '',
      };
    }

    function v69_setCurrentSelection(text, node) {
      const clean = String(text || '').replace(/\s+/g, ' ').trim();
      if (clean.length < 2 || clean.length > 90) return false;
      if (!/^[A-Za-z][A-Za-z\s.'’&-]*$/.test(clean)) return false;
      const ctx = v69_selectionContextFromNode(node);
      if (!ctx.context) return false;
      state.currentSelection = {
        text: clean,
        context: ctx.context,
        sourceSentence: ctx.context,
        sourceArticleId: state.currentArticleId,
        sentenceId: ctx.sentenceId,
      };
      return true;
    }

    function v69_showSelectionUI(rect = null) {
      const sel = state.currentSelection;
      if (!sel?.text) return;
      $('#selectionSheetWord').textContent = sel.text;
      $('#selectionSheetContext').textContent = sel.context || '(无上下文)';
      if (v69_isMobileSelectUI()) {
        $('#selectionToolbar')?.classList.remove('visible');
        $('#selectionSheetBackdrop')?.classList.add('visible');
        $('#selectionSheet')?.classList.add('visible');
      } else {
        const bar = $('#selectionToolbar');
        const x = rect ? rect.left + window.scrollX : window.innerWidth / 2;
        const y = rect ? rect.top + window.scrollY - 46 : window.scrollY + 120;
        bar.style.left = Math.max(12, x) + 'px';
        bar.style.top = Math.max(12, y) + 'px';
        bar.classList.add('visible');
      }
      $('#selectionAdd')?.classList.remove('visible');
    }

    function v69_hideSelectionUI() {
      $('#selectionToolbar')?.classList.remove('visible');
      $('#selectionSheetBackdrop')?.classList.remove('visible');
      $('#selectionSheet')?.classList.remove('visible');
      $('#selectionAdd')?.classList.remove('visible');
    }

    function v69_findExistingSelectionCard() {
      const text = String(state.currentSelection?.text || '').toLowerCase();
      return state.vocab.find(v => String(v.word || '').toLowerCase() === text);
    }

    function v69_addSelectionToVocab(extra = {}) {
      const sel = state.currentSelection;
      if (!sel?.text) return null;
      const exists = v69_findExistingSelectionCard();
      if (exists) {
        toast(`「${sel.text}」已在词库中`, 'info');
        return exists;
      }
      const card = {
        tier: 'vocab',
        word: sel.text,
        sourceSentence: sel.sourceSentence || sel.context || '',
        sourceArticleId: sel.sourceArticleId || state.currentArticleId,
        addedAt: Date.now(),
        translation: '待补全',
        note: '用户划词添加',
        needsAiFill: true,
        examples: sel.context ? [{ en: sel.context, zh: '' }] : [],
        ...extra,
      };
      addVocabInternal(card);
      persistVocab();
      if (state.analysis) updateWordHistoryFromAnalysis(state.currentArticleId, state.analysis);
      if (state.view === 'analysis') { renderSentences(); renderSidebars(); }
      toast(`已加入词库：${sel.text}`, 'success');
      return state.vocab[state.vocab.length - 1];
    }

    function v69_lookupSelection() {
      const sel = state.currentSelection;
      if (!sel?.text) return;
      const existing = v69_findExistingSelectionCard();
      $('#selectionSheetWord').textContent = sel.text;
      $('#selectionSheetContext').textContent = existing
        ? `${existing.translation || ''} ${existing.note || ''}`.trim() || '已在词库中。'
        : `未入库。上下文：${sel.context || '(无上下文)'}`;
      if (!v69_isMobileSelectUI()) {
        $('#selectionSheetBackdrop')?.classList.add('visible');
        $('#selectionSheet')?.classList.add('visible');
      }
    }

    async function v69_aiFillCard(card) {
      if (!card) card = v69_addSelectionToVocab();
      if (!card) return;
      if (!state.apiKey) { openSettings(); return; }
      const prompt = `你是资深财经英语精读老师。请补全这个用户划词加入的词卡。严格输出 JSON，不要 markdown。
{
  "phonetic": "/.../",
  "pos": "n./v./adj.",
  "translation": "中文释义",
  "note": "财经语境用法说明",
  "examples": [{"en":"财经例句","zh":"中文"}],
  "synonyms": [{"word":"近义词","zh":"中文","diff":"辨析"}],
  "collocations": [{"phrase":"高频搭配","example":"例句"}],
  "examTags": ["熟词僻义/抽象动词/高频搭配/财经核心词"]
}
词/短语: ${card.word}
原文上下文: ${card.sourceSentence || state.currentSelection?.context || '(无)'}`;
      try {
        toast('AI 补全中...', 'info');
        const raw = await regularRequest(prompt, new AbortController());
        const data = robustJsonParse(raw);
        Object.assign(card, {
          phonetic: data.phonetic || card.phonetic || '',
          pos: data.pos || card.pos || '',
          translation: data.translation || card.translation || '待补全',
          note: data.note || card.note || '用户划词添加',
          examples: Array.isArray(data.examples) ? data.examples : card.examples || [],
          synonyms: Array.isArray(data.synonyms) ? data.synonyms : card.synonyms || [],
          collocations: Array.isArray(data.collocations) ? data.collocations : card.collocations || [],
          examTags: Array.isArray(data.examTags) ? data.examTags : card.examTags || [],
          needsAiFill: false,
        });
        persistVocab();
        if (state.view === 'analysis') { renderSentences(); renderSidebars(); }
        toast(`已补全：${card.word}`, 'success');
      } catch (e) {
        toast('AI 补全失败：' + e.message.slice(0, 80), 'error');
      }
    }

    function v69_markSelectionConfusable() {
      const card = v69_addSelectionToVocab();
      if (!card) return;
      ensureMemoryFields(card);
      addUniqueTags(card, ['近义混淆']);
      card.needsAiFill = true;
      persistVocab();
      toast(`已标为易混词：${card.word}`, 'warning');
    }

    function v69_handleSelectionAction(act) {
      if (act === 'lookup') v69_lookupSelection();
      else if (act === 'add') { v69_addSelectionToVocab(); v69_hideSelectionUI(); }
      else if (act === 'ai') v69_aiFillCard(v69_addSelectionToVocab());
      else if (act === 'confuse') { v69_markSelectionConfusable(); v69_hideSelectionUI(); }
    }

    function v69_wordAtPoint(x, y) {
      let range = null;
      if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(x, y);
      else if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(x, y);
        if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); }
      }
      const node = range?.startContainer;
      if (!node || node.nodeType !== 3) return null;
      const text = node.textContent || '';
      let i = range.startOffset;
      let start = i, end = i;
      while (start > 0 && /[A-Za-z'-]/.test(text[start - 1])) start--;
      while (end < text.length && /[A-Za-z'-]/.test(text[end])) end++;
      const word = text.slice(start, end).trim();
      return word ? { word, node } : null;
    }

    function setupSelectionListener() {
      const btn = $('#selectionAdd');
      let lastSelection = '';
      let selectionTimer = null;
      let longPressTimer = null;
      const inspectSelection = () => {
        if (state.view !== 'analysis') { v69_hideSelectionUI(); return; }
        setTimeout(() => {
          const sel = window.getSelection();
          const text = sel.toString().trim();
          if (text.length < 2 || text.length > 80 || text === lastSelection) {
            if (!text) v69_hideSelectionUI();
            return;
          }
          if (!sel.anchorNode || !$('#sentencesBox').contains(sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode)) {
            v69_hideSelectionUI(); return;
          }
          lastSelection = text;
          if (!v69_setCurrentSelection(text, sel.anchorNode)) return;
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          v69_showSelectionUI(rect);
        }, 10);
      };
      document.addEventListener('selectionchange', () => {
        clearTimeout(selectionTimer);
        selectionTimer = setTimeout(inspectSelection, 180);
      });
      document.addEventListener('mouseup', (e) => {
        if (e.target.closest('.selection-toolbar') || e.target.closest('.selection-sheet') || e.target.closest('.modal')) return;
        inspectSelection();
      });
      document.addEventListener('touchend', () => setTimeout(inspectSelection, 120), { passive: true });
      $('#sentencesBox')?.addEventListener('dblclick', (e) => {
        if (e.target.closest('.hover-word,.hover-phrase,.proper-noun,.sent-actions')) return;
        const hit = v69_wordAtPoint(e.clientX, e.clientY);
        if (hit && v69_setCurrentSelection(hit.word, hit.node)) v69_showSelectionUI({ left: e.clientX, top: e.clientY, width: 1, height: 1 });
      });
      $('#sentencesBox')?.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          const hit = v69_wordAtPoint(t.clientX, t.clientY);
          if (hit && v69_setCurrentSelection(hit.word, hit.node)) v69_showSelectionUI({ left: t.clientX, top: t.clientY, width: 1, height: 1 });
        }, 520);
      }, { passive: true });
      $('#sentencesBox')?.addEventListener('touchmove', () => clearTimeout(longPressTimer), { passive: true });
      $('#sentencesBox')?.addEventListener('touchend', () => clearTimeout(longPressTimer), { passive: true });
      $$('#selectionToolbar [data-sel-act], #selectionSheet [data-sel-act]').forEach(b => {
        b.addEventListener('click', e => {
          e.stopPropagation();
          v69_handleSelectionAction(b.dataset.selAct);
        });
      });
      document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('.selection-add-btn,.selection-toolbar,.selection-sheet')) {
          const sel = window.getSelection();
          if (!sel.toString().trim()) { v69_hideSelectionUI(); lastSelection = ''; }
        }
      });
      $('#selectionSheetBackdrop')?.addEventListener('click', v69_hideSelectionUI);
    }

    function openCustomAddModal() {
      $('#selectionAdd').classList.remove('visible');
      const sel = state.currentSelection;
      $('#caSelectedText').textContent = sel.text;
      $('#caContextText').textContent = sel.context || '(无上下文)';
      const text = sel.text.trim();
      const isMultiWord = /\s/.test(text);
      const isCapitalized = /^[A-Z]/.test(text);
      let suggestedTier = 'vocab';
      if (isCapitalized && isMultiWord && text.split(/\s+/).every(w => /^[A-Z&]/.test(w[0]))) suggestedTier = 'proper';
      else if (isMultiWord) suggestedTier = /\[|\]|X%|Y%/.test(text) ? 'pattern' : 'phrase';
      setCustomAddTier(suggestedTier);
      const exists = state.vocab.find(v => v.word.toLowerCase() === text.toLowerCase() || (v.tier === 'pattern' && v.word.toLowerCase().includes(text.toLowerCase())));
      if (exists) {
        $('#caExistsWarn').textContent = `⚠ 已存在: 「${exists.word}」 (${exists.tier})。继续添加将创建重复条目。`;
        $('#caExistsWarn').classList.remove('hidden');
      } else $('#caExistsWarn').classList.add('hidden');
      $('#caTranslation').value = '';
      $('#caPhonetic').value = '';
      $('#caPos').value = '';
      $('#caNote').value = '';
      $('#caPatternAbstract').value = suggestedTier === 'pattern' ? text : '';
      show('#customAddModal');
    }

    function setCustomAddTier(tier) {
      state.customAddTier = tier;
      $$('.tier-radio').forEach(r => r.classList.toggle('active', r.dataset.tier === tier));
      $$('.tier-specific').forEach(el => el.classList.toggle('active', el.dataset.for === tier));
    }

    async function aiFillCustomAdd() {
      if (!state.apiKey) { openSettings(); return; }
      const btn = $('#caAiFill');
      btn.disabled = true;
      btn.classList.add('loading');
      $('#caAiFillText').textContent = 'AI 查询中...';
      const text = state.currentSelection.text;
      const context = state.currentSelection.context;
      const tier = state.customAddTier;
      let tierInstruction = '';
      if (tier === 'pattern') {
        tierInstruction = `Tier=pattern (句式模板)。返回:
{ "abstract": "[X] climbed Y basis points to Z%", "meaning": "中文含义", "note": "用法说明" }`;
      } else if (tier === 'phrase') {
        tierInstruction = `Tier=phrase (固定短语)。返回:
{ "translation": "中文翻译", "type": "介词短语/动词短语/...", "note": "用法说明",
  "collocations": ["最高频搭配1", "搭配2", "搭配3", "搭配4"],
  "similar": [{"phrase":"近义短语","diff":"辨析"}, ...],
  "examples": [{"en":"...","zh":"..."},{"en":"...","zh":"..."}] }`;
      } else if (tier === 'proper') {
        tierInstruction = `Tier=proper (专有名词)。返回:
{ "translation": "中文名", "type": "organization/person/place/index/event/currency/instrument/company/country/other", "note": "背景说明" }`;
      } else {
        tierInstruction = `Tier=vocab (学习单词)。返回:
{ "translation": "中文翻译", "phonetic": "/.../", "pos": "n./v./adj.", "note": "用法说明",
  "replacements": "近义词逗号分隔",
  "synonyms": [{"word":"...","zh":"...","diff":"辨析说明"}, ...],
  "examples": [{"en":"...","zh":"..."}] }`;
      }
      const prompt = `你是资深财经英语精读老师。请为以下选中文本生成结构化释义。严格输出 JSON，不要任何说明，不要 markdown 包裹。

选中文本: ${text}
原文上下文: ${context || '(无)'}
${tierInstruction}`;
      try {
        const controller = new AbortController();
        const rawText = await regularRequest(prompt, controller);
        const parsed = robustJsonParse(rawText);
        $('#caTranslation').value = parsed.translation || parsed.meaning || '';
        $('#caNote').value = parsed.note || '';
        if (tier === 'pattern') {
          $('#caPatternAbstract').value = parsed.abstract || text;
        } else if (tier === 'vocab') {
          $('#caPhonetic').value = parsed.phonetic || '';
          $('#caPos').value = parsed.pos || '';
          $('#customAddModal').dataset.aiData = JSON.stringify(parsed);
        } else if (tier === 'phrase') {
          if (parsed.type) $('#caPhraseType').value = parsed.type;
          $('#customAddModal').dataset.aiData = JSON.stringify(parsed);
        } else if (tier === 'proper') {
          if (parsed.type) $('#caProperType').value = parsed.type;
        }
        toast('AI 填充完成', 'success');
      } catch (e) {
        toast('AI 填充失败: ' + e.message.slice(0, 80), 'error', 4000);
      } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        $('#caAiFillText').textContent = '✦ AI 自动查询填充';
      }
    }

    function submitCustomAdd() {
      const tier = state.customAddTier;
      const text = state.currentSelection.text;
      const translation = $('#caTranslation').value.trim();
      if (!translation) { toast('请填写翻译', 'error'); return; }
      const note = $('#caNote').value.trim();
      const context = state.currentSelection.context || '';
      const aiData = (() => { try { return JSON.parse($('#customAddModal').dataset.aiData || '{}'); } catch { return {}; } })();
      let card;
      if (tier === 'pattern') {
        const abstract = $('#caPatternAbstract').value.trim() || text;
        card = { tier: 'pattern', word: abstract, pos: '句式', translation, note: note || '用户自定义句式', examples: [{ en: text, zh: translation }], sourceSentence: context || text, sourceArticleId: state.currentArticleId, addedAt: Date.now() };
      } else if (tier === 'phrase') {
        card = { tier: 'phrase', word: text, pos: $('#caPhraseType').value, phraseType: $('#caPhraseType').value, translation, note, collocations: aiData.collocations || [], similar: aiData.similar || [], examples: aiData.examples || [], sourceSentence: context, sourceArticleId: state.currentArticleId, addedAt: Date.now() };
      } else if (tier === 'proper') {
        card = { tier: 'proper', word: text, pos: PROPER_TYPE_LABELS[$('#caProperType').value] || '专名', properType: $('#caProperType').value, translation, note, sourceSentence: context, sourceArticleId: state.currentArticleId, addedAt: Date.now() };
      } else {
        card = { tier: 'vocab', word: text, phonetic: $('#caPhonetic').value.trim(), pos: $('#caPos').value.trim(), translation, note, replacements: aiData.replacements || '', synonyms: aiData.synonyms || [], examples: aiData.examples || [], sourceSentence: context, sourceArticleId: state.currentArticleId, addedAt: Date.now() };
      }
      addVocabInternal(card);
      persistVocab();
      if (state.analysis) updateWordHistoryFromAnalysis(state.currentArticleId, state.analysis);
      hide('#customAddModal');
      delete $('#customAddModal').dataset.aiData;
      if (state.view === 'analysis') { renderSentences(); renderSidebars(); }
      toast(`已存入 「${text.slice(0, 30)}」`, 'success');
    }

    function v69_scanUnmarkedCandidates() {
      if (!state.analysis?.sentences?.length) return [];
      const saved = new Set(state.vocab.map(v => String(v.word || '').toLowerCase()));
      const aiMarked = new Set([
        ...(state.analysis.vocab || []).map(v => v.word),
        ...(state.analysis.phrases || []).map(v => v.phrase),
        ...(state.analysis.properNouns || []).map(v => v.name),
      ].filter(Boolean).map(v => String(v).toLowerCase()));
      const stop = new Set('about above after again against along also among around because before between during every from have into more most only other over same some such than that their there these those through under until while which would could should market markets company companies said says year years'.split(/\s+/));
      const financeHints = /\b(policy|rate|yield|inflation|liquidity|earnings|guidance|margin|revenue|regulation|compliance|disclosure|liability|asset|equity|debt|credit|default|hedge|exposure|volatility|tighten|ease|weigh|signal|scrutinize|underscore|offset|bolster|curb|dampen|stoke|resilient|persistent)\b/i;
      const counts = new Map();
      const contexts = new Map();
      (state.analysis.sentences || []).forEach(s => {
        const en = (s.original || '').replace(/\*\*/g, '');
        const words = en.match(/\b[A-Za-z][A-Za-z-]{3,}\b/g) || [];
        words.forEach(w => {
          const key = w.toLowerCase();
          if (stop.has(key) || saved.has(key) || aiMarked.has(key)) return;
          const score = (financeHints.test(w) ? 4 : 0) + (w.length >= 8 ? 2 : 0) + (/(tion|ment|ity|ure|ing|ive|al|ize|ise|ate|fy)$/i.test(w) ? 1 : 0);
          if (score < 2) return;
          counts.set(key, (counts.get(key) || 0) + score);
          if (!contexts.has(key)) contexts.set(key, en);
        });
        const phrases = en.match(/\b[A-Za-z][A-Za-z-]{3,}\s+(?:risk|controls|costs|pressure|growth|demand|rules|flows|results|guidance|exposure|margin|yields|rates)\b/gi) || [];
        phrases.forEach(p => {
          const key = p.toLowerCase();
          if (saved.has(key) || aiMarked.has(key)) return;
          counts.set(key, (counts.get(key) || 0) + 5);
          if (!contexts.has(key)) contexts.set(key, en);
        });
      });
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([word, score]) => ({ word, score, context: contexts.get(word) || '' }));
    }

    function v69_openScanUnmarked() {
      const list = v69_scanUnmarkedCandidates();
      $('#scanUnmarkedSummary').textContent = list.length
        ? `发现 ${list.length} 个候选。已自动排除现有词库和 AI 已标记词。`
        : '暂未发现明显未标记候选。你仍可在正文中直接划词加入。';
      $('#scanCandidateList').innerHTML = list.length ? list.map((c, i) => `<label class="scan-candidate">
        <input type="checkbox" data-scan-idx="${i}" checked />
        <span><b>${escapeHtml(c.word)}</b><span>${escapeHtml(c.context.slice(0, 180))}${c.context.length > 180 ? '…' : ''}</span></span>
      </label>`).join('') : `<div class="memory-empty">没有候选。</div>`;
      $('#scanUnmarkedModal').dataset.candidates = JSON.stringify(list);
      show('#scanUnmarkedModal');
    }

    function v69_addScannedCandidates() {
      const list = (() => { try { return JSON.parse($('#scanUnmarkedModal').dataset.candidates || '[]'); } catch { return []; } })();
      const chosen = $$('#scanCandidateList input[type="checkbox"]:checked').map(cb => list[parseInt(cb.dataset.scanIdx)]).filter(Boolean);
      if (!chosen.length) { toast('请选择至少一个候选词', 'warning'); return; }
      let added = 0;
      chosen.forEach(c => {
        if (state.vocab.some(v => String(v.word || '').toLowerCase() === c.word.toLowerCase())) return;
        addVocabInternal({
          tier: 'vocab',
          word: c.word,
          sourceSentence: c.context,
          sourceArticleId: state.currentArticleId,
          addedAt: Date.now(),
          translation: '待补全',
          note: '扫描未标记生词添加',
          needsAiFill: true,
          examples: c.context ? [{ en: c.context, zh: '' }] : [],
          examTags: ['未标记候选'],
        });
        added++;
      });
      persistVocab();
      if (state.analysis) updateWordHistoryFromAnalysis(state.currentArticleId, state.analysis);
      hide('#scanUnmarkedModal');
      if (state.view === 'analysis') { renderSentences(); renderSidebars(); }
      toast(`已加入 ${added} 个候选词`, added ? 'success' : 'info');
    }

    /* ============================================================
     *  IMPORT / EXPORT / SETTINGS / NOTION MODAL
     * ============================================================ */
    function exportVocab() {
      const data = {
        version: 6,
        appVersion: VERSION_CONFIG.current,
        exportedAt: new Date().toISOString(),
        storageMode: state.storageStatus.mode,
        vocab: state.vocab,
        articles: state.articles,
        wordHistory: state.wordHistory,
        reviewLog: state.reviewLog,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finread-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`已导出 ${state.vocab.length} 张词卡和 ${state.articles.length} 篇文章，可直接传到另一台设备后导入`, 'success');
    }

    function importVocab() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!Array.isArray(data.vocab)) throw new Error('文件格式不正确');
          const ok = await showDialog({
            title: '导入预览',
            message: '适合跨设备迁移。合并策略：新卡直接加入，已有卡片仅在备份复习时间更新时覆盖。',
            icon: 'info',
            confirmText: '开始合并',
            cancelText: '取消',
            list: buildImportPreview(data),
          });
          if (!ok) return;
          const { added, updated, articleAdded } = mergeRemoteData(data);
          toast(`已合并 +${added} 卡，更新 ${updated} 卡，新增 ${articleAdded} 篇文章`, 'success');
          rerenderActiveDataView();
        } catch (e) { toast('导入失败: ' + e.message, 'error'); }
      };
      input.click();
    }

    /* ============================================================
     *  TODAY'S STORY
     * ============================================================ */
    let _storyCtrl = null;

    function boldMarkdown(text) {
      return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }

    async function openStoryModal() {
      if (!state.apiKey) { toast('请先配置 API Key', 'error'); return; }
      const due = getReviewPool().slice(0, 8);
      const words = due.length >= 3 ? due : [...state.vocab].sort(() => Math.random() - .5).slice(0, 8);
      if (words.length < 3) { toast('至少需要 3 张词卡才能生成故事', 'warning'); return; }
      show('#storyModal');
      const subtitle = $('#storySubtitle');
      const output = $('#storyOutput');
      if (subtitle) subtitle.textContent = `融合 ${words.length} 个${due.length >= 3 ? '今日到期' : '随机'}词汇`;
      if (output) { output.className = 'story-output'; output.innerHTML = '<span style="opacity:.5">生成中...</span>'; }
      if (_storyCtrl) _storyCtrl.abort();
      const wordList = words.map(w => `${w.word}（${w.translation || w.zh || ''}）`).join('、');
      const prompt = `请用以下金融英语词汇写一段 130-160 字的财经英语新闻段落，每个词汇必须自然融入。
词汇：${wordList}
要求：
- 模拟彭博/路透风格，逻辑连贯
- 每个词汇用 **词** 加粗标出
- 直接输出英文段落，不加任何前缀或说明`;
      _storyCtrl = new AbortController();
      try {
        await streamRequestProgressive(prompt, _storyCtrl, full => {
          if (output) output.innerHTML = boldMarkdown(full);
        });
      } catch (e) {
        if (e.name !== 'AbortError' && output) output.textContent = '生成失败：' + e.message;
      }
    }

    function closeStoryModal() {
      hide('#storyModal');
      if (_storyCtrl) { _storyCtrl.abort(); _storyCtrl = null; }
    }

    /* ── Settings Center (Phase 5) ── */

    window._deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window._deferredInstallPrompt = e; });

    function detectEnvironment() {
      const proto = location.protocol;
      let envType;
      if (proto === 'file:') envType = 'file';
      else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') envType = 'localhost';
      else if (proto === 'https:') envType = 'https';
      else envType = 'http';
      const hasLS = (() => { try { localStorage.setItem('__ft', '1'); localStorage.removeItem('__ft'); return true; } catch { return false; } })();
      // SW only registers on http/https — file:// won't work even if the API exists
      const swEligible = 'serviceWorker' in navigator && (proto === 'http:' || proto === 'https:');
      return {
        envType,
        proto,
        hasSW: swEligible,
        swActive: !!(swEligible && navigator.serviceWorker.controller),
        hasPWA: !!window._deferredInstallPrompt,
        hasClipboard: !!(navigator.clipboard && navigator.clipboard.writeText),
        notifPerm: 'Notification' in window ? Notification.permission : 'unavailable',
        hasLS,
        hasIDB: 'indexedDB' in window,
      };
    }

    function renderScEnvGrid() {
      const grid = $('#scEnvGrid'); if (!grid) return;
      const e = detectEnvironment();
      const envLabel = { file: 'file:// 本地文件', localhost: '本地服务器 (localhost)', https: 'HTTPS 安全', http: 'HTTP 非安全' }[e.envType] || e.proto;
      const envDot = { file: 'yellow', localhost: 'yellow', https: 'green', http: 'red' }[e.envType] || 'gray';
      const notifLabel = { granted: '已授权', denied: '已拒绝', default: '待请求', unavailable: '不支持' }[e.notifPerm] || e.notifPerm;
      const notifDot = { granted: 'green', denied: 'red', default: 'yellow', unavailable: 'gray' }[e.notifPerm] || 'gray';
      const items = [
        { name: '运行协议', val: envLabel, dot: envDot },
        { name: 'Service Worker', val: e.hasSW ? (e.swActive ? '已激活' : '可用·未激活') : '不可用', dot: e.hasSW ? (e.swActive ? 'green' : 'yellow') : 'red' },
        { name: 'PWA 安装', val: e.hasPWA ? '可安装' : '已安装或不支持', dot: e.hasPWA ? 'green' : 'gray' },
        { name: '剪贴板 API', val: e.hasClipboard ? '可用' : '受限或不可用', dot: e.hasClipboard ? 'green' : 'yellow' },
        { name: '通知权限', val: notifLabel, dot: notifDot },
        { name: '本地存储', val: e.hasLS ? '正常' : '不可用', dot: e.hasLS ? 'green' : 'red' },
      ];
      grid.innerHTML = items.map(it =>
        `<div class="sc-env-item"><div class="sc-env-dot ${it.dot}"></div><div><div class="sc-env-name">${escapeHtml(it.name)}</div><div class="sc-env-val">${escapeHtml(it.val)}</div></div></div>`
      ).join('');
      const advice = { file: '基础精读、卡组和复习均可用。PWA 和剪贴板 API 在 file:// 下受浏览器限制，建议改用 localhost 或 HTTPS 以获得完整体验。', localhost: '适合本地开发调试。PWA 部分能力可用。推荐上线后切换至 HTTPS。', https: '完整体验。所有功能均处于最优状态。', http: '部分安全 API（剪贴板、通知、Service Worker）可能不可用。建议切换至 HTTPS。' }[e.envType] || '';
      const advEl = $('#scEnvAdvice');
      if (advEl) advEl.textContent = advice;
    }

    function populateScModelSelect() {
      const el = $('#scModel'); if (!el) return;
      const preset = MODEL_PRESETS[state.provider] || MODEL_PRESETS.deepseek;
      const groups = {};
      preset.models.forEach(m => { (groups[m.group] = groups[m.group] || []).push(m); });
      el.innerHTML = Object.entries(groups).map(([group, list]) => `<optgroup label="${escapeHtml(group)}">${list.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)} · ${escapeHtml(m.badge)}</option>`).join('')}</optgroup>`).join('');
      if (!preset.models.find(m => m.id === state.model)) {
        state.model = preset.defaultModel || preset.models[0]?.id || '';
        toast('当前模型不可用，已建议使用推荐配置', 'warning');
      }
      el.value = state.model;
    }

    function updateScPricingHint() {
      const pEl = $('#scPricingHint'); if (!pEl) return;
      const provider = $('#scProvider')?.value || state.provider;
      const model = $('#scModel')?.value;
      const preset = MODEL_PRESETS[provider] || MODEL_PRESETS.deepseek;
      const m = getModelMeta(provider, model);
      pEl.textContent = preset.providerHint || '';
      const detail = $('#scModelDetail');
      if (detail) detail.innerHTML = m ? `<span class="badge">${escapeHtml(m.badge)}</span><br>${escapeHtml(m.useCase)}<br>成本：${escapeHtml(m.costLevel)} · 速度：${escapeHtml(m.speed)} · 质量：${escapeHtml(m.quality)}` : '当前模型不可用，建议点击“使用推荐配置”。';
    }

    function setupChecklistState() {
      const provider = ($('#scProvider')?.value || state.provider || '').trim();
      const model = ($('#scModel')?.value || state.model || '').trim();
      const apiKey = currentApiKeyInputValue();
      const hasSecureKey = state.apiKeyMode === 'secure' && !!localStorage.getItem(STORE.secureApiKey);
      const ready = !!(provider && model && apiKey && getModelMeta(provider, model));
      const missing = [];
      if (!provider) missing.push('AI Provider');
      if (!model || !getModelMeta(provider, model)) missing.push('解析模型');
      if (!apiKey) missing.push(hasSecureKey ? '本地密码解锁 API Key' : 'API Key');
      return { provider, model, apiKey, hasSecureKey, ready, missing };
    }

    function cryptoAvailable() {
      return !!(window.crypto?.subtle && window.crypto?.getRandomValues && window.TextEncoder && window.TextDecoder);
    }
    function bytesToB64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
    function b64ToBytes(text) { return Uint8Array.from(atob(text), c => c.charCodeAt(0)); }
    async function deriveLocalKey(password, salt, iterations = 120000) {
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
    async function encryptApiKeyLocal(apiKey, password) {
      if (!cryptoAvailable()) throw new Error('当前浏览器不支持 Web Crypto 安全模式');
      if (!password || password.length < 4) throw new Error('安全模式需要设置本地密码，用于加密 API Key。');
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveLocalKey(password, salt);
      const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(apiKey));
      return JSON.stringify({ v: 1, alg: 'AES-GCM', kdf: 'PBKDF2-SHA256', iterations: 120000, salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(data), savedAt: Date.now() });
    }
    async function decryptApiKeyLocal(payload, password) {
      if (!payload) throw new Error('尚未保存加密 API Key');
      if (!password) throw new Error('请输入本地密码解锁 API Key');
      const box = JSON.parse(payload);
      const key = await deriveLocalKey(password, b64ToBytes(box.salt), box.iterations || 120000);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(box.iv) }, key, b64ToBytes(box.data));
      return new TextDecoder().decode(plain);
    }
    async function saveApiKeyByMode(apiKey, password) {
      const mode = state.apiKeyMode || 'local';
      safeLocalStorageSet(STORE.apiKeyMode, mode);
      if (mode === 'temp') {
        state.apiKey = apiKey;
        safeLocalStorageRemove(STORE.apiKey);
        safeLocalStorageRemove(STORE.secureApiKey);
        return '临时模式已保存';
      }
      if (mode === 'secure') {
        if (apiKey) {
          safeLocalStorageSet(STORE.secureApiKey, await encryptApiKeyLocal(apiKey, password));
          safeLocalStorageRemove(STORE.apiKey);
          state.apiKey = apiKey;
          state.v69SecureUnlocked = true;
          return '安全模式已加密保存';
        }
        state.apiKey = await decryptApiKeyLocal(localStorage.getItem(STORE.secureApiKey), password);
        state.v69SecureUnlocked = true;
        return '安全模式已解锁';
      }
      state.apiKey = apiKey;
      safeLocalStorageSet(STORE.apiKey, apiKey);
      safeLocalStorageRemove(STORE.secureApiKey);
      return '本机模式已保存';
    }

    function renderSetupChecklist() {
      const box = $('#setupChecklist');
      const sum = $('#setupStatusSummary');
      if (!box || !sum) return;
      const s = setupChecklistState();
      if (s.ready) sum.textContent = 'AI 解析已就绪，可以开始使用。跨设备迁移请使用“导出全部数据 (JSON)”。';
      else if (state.apiKeyMode === 'secure' && s.hasSecureKey && !s.apiKey) sum.textContent = '你开启了安全模式，请输入本地密码解锁 API Key 后开始解析。';
      else sum.textContent = `还差 ${s.missing.length} 项即可使用：请填写 ${s.missing.join('、')}。`;
      const items = [
        ['AI Provider', s.provider ? `已配置 · ${MODEL_PRESETS[s.provider]?.label || s.provider}` : '未配置', s.provider ? 'ok' : 'bad'],
        ['模型', s.model && getModelMeta(s.provider, s.model) ? '已选择' : '未选择', s.model && getModelMeta(s.provider, s.model) ? 'ok' : 'bad'],
        ['API Key', s.apiKey ? '已保存 / 已填写' : s.hasSecureKey ? '已加密保存 / 待解锁' : '未保存', s.apiKey || s.hasSecureKey ? 'ok' : 'bad'],
        ['保存方式', state.apiKeyMode === 'secure' ? '安全模式' : state.apiKeyMode === 'temp' ? '临时' : '本机', 'ok'],
        ['跨平台迁移', '使用导出全部数据 (JSON)', 'ok'],
        ['解析状态', s.ready ? '可以开始解析文章' : '暂不可用', s.ready ? 'ok' : 'bad'],
      ];
      box.innerHTML = items.map(([label, val, cls]) => `<div class="setup-status-item ${cls}"><b>${escapeHtml(label)}</b><span>${escapeHtml(val)}</span></div>`).join('');
    }

    function applyRecommendedConfig(runToast = true) {
      state.provider = 'openrouter';
      state.model = MODEL_PRESETS.openrouter.defaultModel;
      if (!state.apiKeyMode) state.apiKeyMode = 'local';
      safeLocalStorageSet(STORE.provider, state.provider);
      safeLocalStorageSet(STORE.model, state.model);
      safeLocalStorageSet(STORE.apiKeyMode, state.apiKeyMode);
      if ($('#scProvider')) $('#scProvider').value = state.provider;
      populateScModelSelect();
      if ($('#scModel')) $('#scModel').value = state.model;
      if ($('#providerSelect')) { $('#providerSelect').value = state.provider; populateModelSelect(); if ($('#modelSelect')) $('#modelSelect').value = state.model; }
      updateScPricingHint();
      renderSetupChecklist();
      renderModelBadge();
      if (runToast) {
        toast('已切换到推荐配置：OpenRouter · DeepSeek Chat。', 'success');
        if (!currentApiKeyInputValue()) toast('还差一步：请填写 OpenRouter API Key。', 'warning');
      }
    }
    window.applyRecommendedConfig = applyRecommendedConfig;

    function populateScVoiceSelect() {
      const sel = $('#scVoice'); if (!sel) return;
      if (!('speechSynthesis' in window)) { sel.innerHTML = '<option value="">当前浏览器不支持 TTS</option>'; return; }
      const voices = speechSynthesis.getVoices();
      if (voices.length) _voicesCache = voices;
      const grouped = {};
      _voicesCache.forEach(v => { (grouped[v.lang] = grouped[v.lang] || []).push(v); });
      let html = '<option value="">自动（优先级智能匹配）</option>';
      Object.keys(grouped).sort().forEach(lang => {
        html += `<optgroup label="${escapeHtml(lang)}">`;
        grouped[lang].forEach(v => { html += `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`; });
        html += '</optgroup>';
      });
      sel.innerHTML = html;
      sel.value = state.selectedVoice || '';
      const hint = $('#scVoiceHint');
      if (hint) hint.textContent = _voicesCache.length ? `共 ${_voicesCache.length} 个系统声音` : '';
    }

    function setApiKeyMode(mode) {
      state.apiKeyMode = mode;
      $$('#scKeyModeGroup .sc-km-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      const note = $('#scApiKeyModeNote');
      if (!note) return;
      const notes = {
        temp: '临时模式：API Key 仅保留在当前页面内存，关闭标签页或刷新后自动清除。',
        local: '本机模式：API Key 保存于当前浏览器 localStorage，下次访问时自动读取。⚠️ 明文存储，仅供个人设备使用。',
        secure: cryptoAvailable() ? '安全模式：使用 Web Crypto + 本地密码加密保存。密码不会上传，也无法找回。' : '当前浏览器不支持 Web Crypto，安全模式不可用。',
      };
      note.textContent = notes[mode] || '';
      renderSetupChecklist();
    }
    window.setApiKeyMode = setApiKeyMode;

    function renderSettingsPage() {
      if ($('#scProvider')) { $('#scProvider').value = state.provider; }
      populateScModelSelect();
      if ($('#scModel')) $('#scModel').value = state.model;
      updateScPricingHint();
      if ($('#scStreaming')) $('#scStreaming').value = String(state.streaming);
      if ($('#scChunk')) $('#scChunk').value = state.chunkThreshold;
      if ($('#scApiKey')) {
        const hasSecureKey = !!localStorage.getItem(STORE.secureApiKey);
        $('#scApiKey').value = state.apiKeyMode === 'secure' ? '' : state.apiKey;
        $('#scApiKey').placeholder = state.apiKeyMode === 'secure' && hasSecureKey
          ? (state.v69SecureUnlocked ? '安全模式已解锁；输入新 Key 可覆盖' : '已加密保存，输入本地密码解锁')
          : 'sk-...';
      }
      setApiKeyMode(state.apiKeyMode || 'local');
      populateScVoiceSelect();
      if ($('#scReminder')) $('#scReminder').value = state.reminderTime || '09:00';
      if ($('#scNotifications')) $('#scNotifications').value = String(state.notificationsEnabled);
      if ($('#scRecallGate')) $('#scRecallGate').value = String(state.recallGate !== false);
      // Sync status
      const jbEl = $('#scJsonbinStatus');
      if (jbEl) jbEl.textContent = state.jsonbin.binId ? (state.jsonbin.lastSync > 0 ? `已配置 · 上次同步 ${new Date(state.jsonbin.lastSync).toLocaleDateString()}` : '已配置，未同步') : '未配置';
      const wdEl = $('#scWebdavStatus');
      if (wdEl) wdEl.textContent = (state.webdav.url && state.webdav.username) ? (state.webdav.lastSync > 0 ? `已配置 · 上次同步 ${new Date(state.webdav.lastSync).toLocaleDateString()}` : '已配置，未同步') : '未配置';
      // Data summary
      const sumEl = $('#scDataSummary');
      if (sumEl) { const s = state.storageStatus; sumEl.textContent = `${state.vocab.length} 张词卡 · ${state.articles.length} 篇文章 · ${state.reviewLog.length} 条复习记录 · 存储：${s.mode}`; }
      renderScEnvGrid();
      renderSetupChecklist();
    }
    window.renderSettingsPage = renderSettingsPage;

    function saveScAI() {
      if (!$('#scProvider')) return;
      state.provider = $('#scProvider').value;
      state.model = $('#scModel').value;
      state.streaming = $('#scStreaming').value === 'true';
      state.chunkThreshold = parseInt($('#scChunk').value) || DEFAULT_CHUNK_THRESHOLD;
      safeLocalStorageSet(STORE.provider, state.provider);
      safeLocalStorageSet(STORE.model, state.model);
      safeLocalStorageSet(STORE.streaming, String(state.streaming));
      safeLocalStorageSet(STORE.chunkThreshold, String(state.chunkThreshold));
      // keep old modal in sync
      if ($('#providerSelect')) { $('#providerSelect').value = state.provider; populateModelSelect(); if ($('#modelSelect')) $('#modelSelect').value = state.model; updatePricingHint(); }
      renderModelBadge();
      renderSetupChecklist();
      validateAIConfig({ showGuide: false, toastWarnings: true });
      toast('AI 配置已保存', 'success');
      onInputChange();
    }

    async function saveScApiKey() {
      if (!$('#scApiKey')) return;
      const apiKey = $('#scApiKey').value.trim();
      const password = $('#scSecurePass')?.value || '';
      try {
        const msg = await saveApiKeyByMode(apiKey, password);
        if ($('#apiKeyInput')) $('#apiKeyInput').value = state.apiKeyMode === 'secure' ? '' : state.apiKey;
        if ($('#scApiKey')) {
          $('#scApiKey').value = state.apiKeyMode === 'secure' ? '' : state.apiKey;
          $('#scApiKey').placeholder = state.apiKeyMode === 'secure'
            ? '安全模式已解锁；输入新 Key 可覆盖'
            : 'sk-...';
          $('#scApiKey').classList.remove('field-attention');
        }
        if ($('#scSecurePass')) {
          $('#scSecurePass').value = '';
          $('#scSecurePass').classList.remove('field-attention');
        }
        renderModelBadge();
        renderSetupChecklist();
        toast(msg, 'success');
      } catch (err) {
        $('#scSecurePass')?.classList.add('field-attention');
        toast(err.message || 'API Key 保存失败', 'error');
        return;
      }
    }

    async function saveScPrefs() {
      if (!$('#scVoice')) return;
      state.selectedVoice = $('#scVoice').value;
      state.reminderTime = $('#scReminder').value || '09:00';
      state.notificationsEnabled = $('#scNotifications').value === 'true';
      state.recallGate = $('#scRecallGate') ? $('#scRecallGate').value !== 'false' : state.recallGate;
      if (state.notificationsEnabled) await ensureNotificationPermission();
      safeLocalStorageSet(STORE.voice, state.selectedVoice);
      safeLocalStorageSet(STORE.reminderTime, state.reminderTime);
      safeLocalStorageSet(STORE.notifications, String(state.notificationsEnabled));
      safeLocalStorageSet(STORE.recallGate, String(state.recallGate !== false));
      if ($('#reminderTimeInput')) $('#reminderTimeInput').value = state.reminderTime;
      if ($('#notificationSelect')) $('#notificationSelect').value = String(state.notificationsEnabled);
      if ($('#recallGateSelect')) $('#recallGateSelect').value = String(state.recallGate !== false);
      v68_resetRecallGate();
      toast('偏好已保存', 'success');
      maybeShowReviewNotification();
    }

    async function clearSyncConfig() {
      const ok = await confirmDialog('清除所有同步配置（JSONBin 和 WebDAV 账户信息）？\n学习数据不受影响。', { title: '清除同步配置', danger: true, confirmText: '清除' });
      if (!ok) return;
      state.jsonbin = { apiKey: '', binId: '', lastSync: 0 };
      state.webdav = { url: '', username: '', password: '', path: '/finread-sync.json', lastSync: 0 };
      safeLocalStorageRemove(STORE.jsonbin);
      safeLocalStorageRemove(STORE.webdav);
      renderSettingsPage();
      toast('同步配置已清除', 'success');
    }

    async function clearApiKeyOnly() {
      const ok = await confirmDialog('清除 API Key？学习数据不受影响。', { title: '清除 API Key', danger: true, confirmText: '清除' });
      if (!ok) return;
      state.apiKey = '';
      state.v69SecureUnlocked = false;
      safeLocalStorageRemove(STORE.apiKey);
      safeLocalStorageRemove(STORE.secureApiKey);
      if ($('#scApiKey')) {
        $('#scApiKey').value = '';
        $('#scApiKey').placeholder = 'sk-...';
      }
      if ($('#apiKeyInput')) $('#apiKeyInput').value = '';
      renderModelBadge();
      renderSetupChecklist();
      toast('API Key 已清除', 'success');
    }

    /* ── end Settings Center ── */

    function updateStorageStatusHint() {
      const el = $('#storageStatusHint');
      if (!el) return;
      const summary = summarizeDataPayload({
        vocab: state.vocab,
        articles: state.articles,
        wordHistory: state.wordHistory,
        reviewLog: state.reviewLog,
      });
      const migrated = state.storageStatus.migrated ? ' · 已从 localStorage 兼容迁移' : '';
      const err = state.storageStatus.lastError ? ` · 兜底原因：${state.storageStatus.lastError}` : '';
      el.textContent = `存储：${state.storageStatus.mode} · ${summary.vocab} 卡 · ${summary.articles} 文 · ${formatBytes(summary.size)}${migrated}${err}`;
    }

    function openSettings() {
      state.mineTab = 'settings';
      setView('mine');
    }
    function closeSettings() { hide('#settingsModal'); }

    function populateModelSelect() {
      const preset = MODEL_PRESETS[state.provider] || MODEL_PRESETS.openrouter;
      $('#modelSelect').innerHTML = preset.models.map(m => `<option value="${m.id}">${m.name} · ${m.badge}</option>`).join('');
      if (!preset.models.find(m => m.id === state.model)) state.model = preset.defaultModel || preset.models[0]?.id || '';
      $('#modelSelect').value = state.model;
    }
    function updatePricingHint() {
      const m = getModelMeta(state.provider, $('#modelSelect').value);
      $('#pricingHint').textContent = m ? `${m.badge} · ${m.costLevel} · ${m.useCase}` : '当前模型不可用，建议使用推荐配置';
    }
    function populateVoiceSelect() {
      const sel = $('#voiceSelect');
      if (!sel) return;
      if (!('speechSynthesis' in window)) {
        sel.innerHTML = '<option value="">当前浏览器不支持 TTS</option>';
        sel.value = '';
        updateVoiceHint();
        return;
      }
      const voices = speechSynthesis.getVoices();
      if (voices.length) _voicesCache = voices;
      const all = _voicesCache;
      const grouped = {};
      all.forEach(v => { (grouped[v.lang] = grouped[v.lang] || []).push(v); });
      let html = '<option value="">自动（优先级智能匹配）</option>';
      Object.keys(grouped).sort().forEach(lang => {
        html += `<optgroup label="${escapeHtml(lang)}">`;
        grouped[lang].forEach(v => {
          html += `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`;
        });
        html += '</optgroup>';
      });
      sel.innerHTML = html;
      sel.value = state.selectedVoice;
      updateVoiceHint();
    }
    function updateVoiceHint() {
      const hint = $('#voiceHint');
      if (!hint) return;
      if (!('speechSynthesis' in window)) {
        hint.textContent = '当前浏览器不支持系统朗读';
        return;
      }
      const sel = $('#voiceSelect');
      if (sel && sel.value) {
        hint.textContent = '';
      } else {
        const total = _voicesCache.length;
        hint.textContent = total
          ? `系统共检测到 ${total} 个声音，留空则按平台优先级自动匹配`
          : '声音列表加载中，请稍后重新打开配置...';
      }
    }
    function onProviderChange() {
      state.provider = $('#providerSelect').value;
      populateModelSelect();
      state.model = getDefaultModel(state.provider);
      $('#modelSelect').value = state.model;
      updatePricingHint();
      renderSetupChecklist();
    }
    async function saveSettings() {
      state.provider = $('#providerSelect').value;
      state.model = $('#modelSelect').value;
      const enteredApiKey = $('#apiKeyInput').value.trim();
      const enteredPass = $('#securePassInput')?.value || '';
      state.streaming = $('#streamingSelect').value === 'true';
      state.chunkThreshold = parseInt($('#chunkThresholdInput').value) || DEFAULT_CHUNK_THRESHOLD;
      state.selectedVoice = $('#voiceSelect').value;
      state.reminderTime = $('#reminderTimeInput').value || '09:00';
      state.notificationsEnabled = $('#notificationSelect').value === 'true';
      state.recallGate = $('#recallGateSelect') ? $('#recallGateSelect').value !== 'false' : state.recallGate;
      if (state.notificationsEnabled) await ensureNotificationPermission();
      safeLocalStorageSet(STORE.reminderTime, state.reminderTime);
      safeLocalStorageSet(STORE.provider, state.provider);
      safeLocalStorageSet(STORE.model, state.model);
      try {
        if (state.apiKeyMode !== 'secure' || enteredApiKey || enteredPass) {
          await saveApiKeyByMode(enteredApiKey, enteredPass);
        }
      } catch (err) {
        toast(err.message || 'API Key 保存失败', 'error');
        return;
      }
      safeLocalStorageSet(STORE.streaming, String(state.streaming));
      safeLocalStorageSet(STORE.chunkThreshold, String(state.chunkThreshold));
      safeLocalStorageSet(STORE.voice, state.selectedVoice);
      safeLocalStorageSet(STORE.notifications, String(state.notificationsEnabled));
      safeLocalStorageSet(STORE.recallGate, String(state.recallGate !== false));
      v68_resetRecallGate();
      renderModelBadge();
      renderSetupChecklist();
      closeSettings();
      toast('已保存', 'success');
      onInputChange();
      maybeShowReviewNotification();
    }

    function renderModelBadge() {
      const el = $('#modelBadge');
      if (!state.apiKey) { el.textContent = '未配置'; el.classList.add('disconnected'); return; }
      const list = MODELS[state.provider] || [];
      const m = list.find(x => x.id === state.model);
      el.textContent = m ? m.label.split(' ·')[0] : state.model;
      el.classList.remove('disconnected');
    }
    /* ============================================================
     *  EVENT BINDINGS
     * ============================================================ */
    function bindEvents() {
      $$('nav.tabs button').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
      $$('.bottom-tabbar .bt-btn').forEach(btn => btn.addEventListener('click', () => {
        if (btn.dataset.view === 'review') { setView('training'); return; }
        setView(btn.dataset.view);
      }));
      $('#newsInput').addEventListener('input', onInputChange);
      $('#btnPaste').addEventListener('click', async () => {
        try { $('#newsInput').value = await navigator.clipboard.readText(); onInputChange(); }
        catch (e) { toast('粘贴失败，请手动 Ctrl+V'); }
      });
      $('#btnSample').addEventListener('click', () => { $('#newsInput').value = SAMPLE; onInputChange(); });
      $('#btnV64LoadDaily')?.addEventListener('click', () => { $('#newsInput').value = V64_TOPIC_SAMPLES.fed; onInputChange(); $('#newsInput').focus(); toast('已载入 Fed 专题样例', 'success'); });
      $('#btnV64StartReview')?.addEventListener('click', () => setView('training'));
      $('#btnFetchLink').addEventListener('click', async () => {
        const raw = $('#newsInput').value.trim();
        // 优先从文本中提取第一个 URL（兼容前后有 UTM 参数、换行等情况）
        const urlMatch = raw.match(/https?:\/\/[^\s"'<>]+/i);
        const targetUrl = urlMatch ? urlMatch[0] : raw;
        if (!isUrl(targetUrl)) {
          toast('请先在输入框中粘贴文章链接（以 http 开头）', 'error');
          $('#newsInput').focus();
          return;
        }
        const btn = $('#btnFetchLink');
        btn.disabled = true;
        btn.textContent = '获取中...';
        try {
          const PROXIES = [
            u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
            u => 'https://corsproxy.io/?' + encodeURIComponent(u),
          ];
          const fetchTO = (url, ms = 12000) => {
            const ctrl = new AbortController();
            const id = setTimeout(() => ctrl.abort(), ms);
            return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(id));
          };
          let html = null;
          for (const mkProxy of PROXIES) {
            try {
              const res = await fetchTO(mkProxy(targetUrl));
              if (res.ok) { html = await res.text(); break; }
            } catch { }
          }
          if (!html) throw new Error('无法获取页面，请确认链接可访问');
          const text = extractArticleText(html);
          if (!text || text.length < 80) throw new Error('未能提取到有效正文，该网站可能需要登录或有反爬限制');
          $('#newsInput').value = text;
          onInputChange();
          toast(`文章获取成功（${text.length} 字符）`, 'success');
        } catch (err) {
          toast('获取失败：' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = '🔗 链接';
        }
      });
      $('#urlHintFetch').addEventListener('click', () => $('#btnFetchLink').click());
      $('#btnClear').addEventListener('click', () => { $('#newsInput').value = ''; onInputChange(); });
      $('#btnAnalyze').addEventListener('click', doAnalyze);
      $('#btnCancel').addEventListener('click', cancelAnalyze);
      $('#btnGotoAnalysis').addEventListener('click', () => { $('#tabAnalysis').classList.remove('hidden'); $('#btTabAnalysis').classList.remove('hidden'); setView('analysis'); });
      $('#btnBack').addEventListener('click', () => setView('input'));
      $('#btnCopyTrans').addEventListener('click', () => {
        if (state.analysis?.fullTranslation) {
          navigator.clipboard.writeText(state.analysis.fullTranslation);
          toast('全文翻译已复制', 'success');
        }
      });
      $('#btnSaveAllPatterns').addEventListener('click', () => {
        if (!state.analysis?.patterns?.length) return toast('当前文章无句式');
        let added = 0;
        state.analysis.patterns.forEach(p => {
          const obj = patternToVocab(p);
          if (!state.vocab.find(v => v.tier === 'pattern' && v.word === obj.word)) { addVocabInternal(obj); added++; }
        });
        persistVocab();
        if (state.analysis) updateWordHistoryFromAnalysis(state.currentArticleId, state.analysis);
        renderAnalysis();
        toast(`已存入 ${added} 句式 · 累计 ${countByTier('pattern')}/${PATTERN_GOAL}`, 'success');
      });
      $('#btnSaveAllPhrases').addEventListener('click', () => {
        if (!state.analysis?.phrases?.length) return toast('当前文章无短语');
        let added = 0;
        state.analysis.phrases.forEach(p => {
          const obj = phraseToVocab(p);
          if (!state.vocab.find(v => v.tier === 'phrase' && v.word === obj.word)) { addVocabInternal(obj); added++; }
        });
        persistVocab();
        if (state.analysis) updateWordHistoryFromAnalysis(state.currentArticleId, state.analysis);
        renderAnalysis();
        toast(`已存入 ${added} 短语 · 累计 ${countByTier('phrase')}/${PHRASE_GOAL}`, 'success');
      });
      $('#btnScanUnmarked')?.addEventListener('click', v69_openScanUnmarked);
      $$('.toggle-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const key = pill.dataset.key;
          if (key === 'zh') state.showZh = !state.showZh;
          else if (key === 'gr') state.showGr = !state.showGr;
          else if (key === 'full') state.showFullTrans = !state.showFullTrans;
          pill.classList.toggle('on');
          renderSentences();
          $('#fullTranslationWrapper').classList.toggle('hidden', !state.showFullTrans);
        });
      });
      $$('.side-tabs button').forEach(b => b.addEventListener('click', () => {
        $$('.side-tabs button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.sideTab = b.dataset.tier;
        $('#sidePatterns').classList.toggle('hidden', state.sideTab !== 'pattern');
        $('#sidePhrases').classList.toggle('hidden', state.sideTab !== 'phrase');
        $('#sideProperNouns').classList.toggle('hidden', state.sideTab !== 'proper');
        $('#sideVocab').classList.toggle('hidden', state.sideTab !== 'vocab');
        // 移动端：切换 tab 后滚动到内容区顶部
        if (window.innerWidth <= 900) {
          requestAnimationFrame(() => {
            b.closest('aside')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      }));
      $('#flipInner').addEventListener('click', (e) => {
        if (window.getSelection().toString().length > 0) return;
        if (e.target.tagName !== 'BUTTON') {
          v68_tryRevealCard(e);
        }
      });
      $('#flipRevealBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.clozeActive) { v68_showClozeHint(); return; }
        v68_tryRevealCard(e);
      });

      // Progressive hint button
      $('#flipHintBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const pool = getFlipPool();
        if (!pool.length) return;
        showHint(pool[state.flipIdx % pool.length]);
      });

      // Spell mode input
      $('#spellInput').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (state.clozeActive) {
          v68_submitClozeAnswer();
          return;
        }
        const pool = getFlipPool();
        if (!pool.length) return;
        const w = pool[state.flipIdx % pool.length];
        const typed = $('#spellInput').value.trim().toLowerCase();
        const correct = (w.word || '').trim().toLowerCase();
        const si = $('#spellInput');
        const sf = $('#spellFeedback');
        if (typed === correct) {
          si.classList.add('correct');
          sf.textContent = '✓ 正确！';
          setTimeout(() => { state.flipped = true; $('#flipInner').classList.add('flipped'); }, 400);
        } else {
          si.classList.add('wrong');
          sf.innerHTML = `✗ 正确：<strong>${escapeHtml(w.word)}</strong>`;
          setTimeout(() => {
            si.value = ''; si.className = 'spell-input';
            sf.textContent = '再试一次，或点击卡片翻面查看';
            state.flipped = true; $('#flipInner').classList.add('flipped');
          }, 1400);
        }
      });

      // Story button
      $('#storyBtn').addEventListener('click', openStoryModal);
      $('#storyRegenBtn').addEventListener('click', openStoryModal);
      $$('.flip-mode-toggle button').forEach(b => {
        b.addEventListener('click', () => {
          state.studyMode = b.dataset.mode;
          safeLocalStorageSet(STORE.studyMode, state.studyMode);
          $$('.flip-mode-toggle button').forEach(x => x.classList.toggle('active', x === b));
          renderFlipCard();
        });
      });
      $$('.srs-btn').forEach(btn => { btn.addEventListener('click', () => reviewCard(parseInt(btn.dataset.quality))); });
      $('#btnReviewFocus')?.addEventListener('click', () => { state.trainingMode = 'full'; enterReviewFocus(); });
      $('#btnExitReview')?.addEventListener('click', exitReviewFocus);
      $('#pomoStart').addEventListener('click', () => { if (state.view !== 'review') { state.trainingMode = 'full'; enterReviewFocus(); } pomoStart(); });
      $('#srBtnDone')?.addEventListener('click', () => { closeSessionReport(); setView('training'); });
      $('#srBtnContinue')?.addEventListener('click', () => { closeSessionReport(); launchTrainingMode(state.trainingMode || 'full'); });
      $('#sessionReportBackdrop')?.addEventListener('click', () => { closeSessionReport(); setView('training'); });
      $('#mistakeReasonSkip')?.addEventListener('click', () => submitMistakeReasons(true));
      $('#mistakeReasonConfirm')?.addEventListener('click', () => submitMistakeReasons(false));
      $('#memorySheetBackdrop')?.addEventListener('click', () => {
        if (state.pendingMistake) submitMistakeReasons(true);
      });
      $('#gestureOnboardingOk')?.addEventListener('click', completeGestureOnboarding);
      $('#mistakeReasonFilter')?.addEventListener('change', e => { state.mistakeFilter.reason = e.target.value; renderMistakeBook(); });
      $('#mistakeSort')?.addEventListener('change', e => { state.mistakeFilter.sort = e.target.value; renderMistakeBook(); });
      $('#mistakeRecentOnly')?.addEventListener('change', e => { state.mistakeFilter.recentOnly = e.target.checked; renderMistakeBook(); });
      $('#mistakeHighOnly')?.addEventListener('change', e => { state.mistakeFilter.highOnly = e.target.checked; renderMistakeBook(); });
      $('#btnStartMistakeTraining')?.addEventListener('click', () => startMistakeTraining());
      setupReviewGestures();
      $('#pomoStop').addEventListener('click', () => {
        showDialog({ title: '结束番茄复习', message: '确定要结束本次番茄复习吗？当前进度将不被保存。', icon: 'warn', confirmText: '结束', cancelText: '继续', danger: true })
          .then(ok => { if (ok) pomoStop(); });
      });
      $('#searchInput').addEventListener('input', debounce((e) => { state.vocabSearch = e.target.value.toLowerCase(); _vocabPage = 1; renderVocabBook(); }, 220));
      $$('.filter-pill').forEach(p => {
        p.addEventListener('click', () => {
          $$('.filter-pill').forEach(x => x.classList.remove('on'));
          p.classList.add('on');
          state.vocabFilter = p.dataset.filter;
          state.flipIdx = 0;
          _vocabPage = 1;
          renderVocabBook();
        });
      });
      $('#btnExport').addEventListener('click', exportVocab);
      // ── More drawer ──
      function openMoreDrawer() {
        $('#moreDrawer').classList.add('open');
        $('#moreBackdrop').classList.add('open');
      }
      function closeMoreDrawer() {
        $('#moreDrawer').classList.remove('open');
        $('#moreBackdrop').classList.remove('open');
      }
      $('#btnMore').addEventListener('click', openMoreDrawer);
      $('#moreBackdrop').addEventListener('click', closeMoreDrawer);
      $('#moreImport').addEventListener('click', () => { closeMoreDrawer(); importVocab(); });
      $('#moreSettings').addEventListener('click', () => { closeMoreDrawer(); openSettings(); });
      $('#moreClear').addEventListener('click', () => { closeMoreDrawer(); $('#btnClearAll').click(); });
      // ── Mine inner tabs ──
      $$('.mine-itab').forEach(btn => btn.addEventListener('click', () => setMineTab(btn.dataset.mine)));

      // ── Card sheet (本篇词卡) ──
      $('#articleFab').addEventListener('click', openCardSheet);
      $('#cardSheetBackdrop').addEventListener('click', closeCardSheet);
      $('#cardSheetClose').addEventListener('click', closeCardSheet);
      $$('.cs-tab').forEach(btn => btn.addEventListener('click', () => setCardSheetTab(btn.dataset.sheetTier)));
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCardSheet(); });

      $('#btnImport').addEventListener('click', importVocab);
      $('#themeToggle').addEventListener('click', toggleTheme);
      $('#btnSettings').addEventListener('click', openSettings);
      $('#btnSettingsCancel').addEventListener('click', closeSettings);
      $('#btnSettingsSave').addEventListener('click', saveSettings);
      $('#providerSelect').addEventListener('change', onProviderChange);
      $('#modelSelect').addEventListener('change', updatePricingHint);
      $('#voiceSelect').addEventListener('change', updateVoiceHint);

      // ── Settings Center Page buttons ──
      $('#scBtnSaveAI')?.addEventListener('click', saveScAI);
      $('#scBtnSaveKey')?.addEventListener('click', saveScApiKey);
      $('#scBtnSavePrefs')?.addEventListener('click', saveScPrefs);
      $('#scBtnUseRecommended')?.addEventListener('click', () => applyRecommendedConfig(true));
      $('#scBtnExport')?.addEventListener('click', exportVocab);
      $('#scBtnImport')?.addEventListener('click', importVocab);
      $('#scBtnExportAiErrors')?.addEventListener('click', exportAIErrorLog);
      $('#scBtnClearAiErrors')?.addEventListener('click', clearAIErrorLog);
      $('#scBtnClearKey')?.addEventListener('click', clearApiKeyOnly);
      $('#scBtnClearAll')?.addEventListener('click', async () => {
        const ok = await confirmDialog(
          `此操作将清除：\n• ${state.vocab.length} 张词卡及复习进度\n• ${state.articles.length} 篇归档文章\n• 所有本地学习数据\n\n⚠️ 不可恢复！建议先导出备份。`,
          { title: '清除全部本地数据', danger: true, confirmText: '全部清除' }
        );
        if (!ok) return;
        await clearFinreadDb();
        Object.values(STORE).forEach(k => safeLocalStorageRemove(k));
        [STORE.vocab, STORE.articles, STORE.wordHistory, STORE.reviewLog].forEach(k => safeLocalStorageRemove(`${k}:meta`));
        sessionStorage.clear();
        location.reload();
      });
      $('#scProvider')?.addEventListener('change', () => {
        state.provider = $('#scProvider').value;
        state.model = getDefaultModel(state.provider);
        populateScModelSelect();
        if ($('#scModel')) $('#scModel').value = state.model;
        updateScPricingHint();
        renderSetupChecklist();
      });
      $('#scModel')?.addEventListener('change', () => { state.model = $('#scModel').value; updateScPricingHint(); renderSetupChecklist(); });
      $('#scApiKey')?.addEventListener('input', renderSetupChecklist);
      $$('#scKeyModeGroup .sc-km-btn').forEach(b => b.addEventListener('click', () => setApiKeyMode(b.dataset.mode)));
      $('#btnClearAll').addEventListener('click', async () => {
        const ok = await confirmDialog(
          `此操作将清除：\n• ${state.vocab.length} 张词卡及复习进度\n• ${state.articles.length} 篇归档文章\n• 所有本地学习数据\n\n⚠️ 不可恢复！建议先导出备份。`,
          { title: '清除全部本地数据', danger: true, confirmText: '全部清除' }
        );
        if (!ok) return;
        await clearFinreadDb();
        Object.values(STORE).forEach(k => safeLocalStorageRemove(k));
        [STORE.vocab, STORE.articles, STORE.wordHistory, STORE.reviewLog].forEach(k => safeLocalStorageRemove(`${k}:meta`));
        sessionStorage.clear();
        location.reload();
      });
      $('#historySearch').addEventListener('input', debounce((e) => {
        state.historySearch = e.target.value;
        renderHistoryView();
      }, 220));
      $('#dialogOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'dialogOverlay') closeDialog(false);
      });
      $('#wdpClose').addEventListener('click', closeWordDetailPopup);
      $('#wordDetailOverlay').addEventListener('click', closeWordDetailPopup);
      setupSelectionListener();
      $('#selectionAdd').addEventListener('click', (e) => { e.stopPropagation(); v69_addSelectionToVocab(); });
      $$('.tier-radio').forEach(r => r.addEventListener('click', () => setCustomAddTier(r.dataset.tier)));
      $('#caAiFill').addEventListener('click', aiFillCustomAdd);
      $('#caCancel').addEventListener('click', () => hide('#customAddModal'));
      $('#caSubmit').addEventListener('click', submitCustomAdd);
      $('#scanCloseBtn')?.addEventListener('click', () => hide('#scanUnmarkedModal'));
      $('#scanAddSelectedBtn')?.addEventListener('click', v69_addScannedCandidates);
      const tooltip = $('#wordTooltip');
      let tooltipTimeout;
      document.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('hover-word')) {
          clearTimeout(tooltipTimeout);
          const idx = e.target.dataset.idx;
          const data = state.analysis?.vocab?.[idx];
          if (data) showVocabTooltip(e.target, data);
        } else if (e.target.classList.contains('hover-phrase')) {
          clearTimeout(tooltipTimeout);
          const idx = e.target.dataset.phIdx;
          const data = state.analysis?.phrases?.[idx];
          if (data) showPhraseTooltip(e.target, data);
        } else if (e.target.classList.contains('proper-noun') && !e.target.classList.contains('no-data')) {
          clearTimeout(tooltipTimeout);
          const idx = e.target.dataset.pnIdx;
          const data = state.analysis?.properNouns?.[idx];
          if (data) showProperTooltip(e.target, data);
        } else if (e.target.closest('#wordTooltip')) {
          clearTimeout(tooltipTimeout);
        }
      });
      document.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('hover-word')
          || e.target.classList.contains('hover-phrase')
          || e.target.classList.contains('proper-noun')
          || e.target.closest('#wordTooltip')) {
          tooltipTimeout = setTimeout(() => tooltip.classList.remove('visible'), 250);
        }
      });
      window.addEventListener('scroll', throttle(() => {
        const h = document.documentElement;
        const scrolled = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
        $('#readingProgress').style.width = (scrolled * 100) + '%';
      }, 16), { passive: true });
    }

    function bindKeyboard() {
      document.addEventListener('keydown', (e) => {
        // ESC closes any open modal/panel
        if (e.key === 'Escape') {
          if ($('#dialogOverlay').classList.contains('visible')) { closeDialog(false); return; }
          if ($('#mistakeReasonSheet')?.classList.contains('visible')) { submitMistakeReasons(true); return; }
          if (!$('#gestureOnboarding')?.classList.contains('hidden')) { completeGestureOnboarding(); return; }
          if ($('#wordDetailPopup')?.classList.contains('visible')) { closeWordDetailPopup(); return; }
          if (!$('#settingsModal')?.classList.contains('hidden')) { closeSettings(); return; }
          if (!$('#customAddModal')?.classList.contains('hidden')) { hide('#customAddModal'); return; }
          if (!$('#sessionReport')?.classList.contains('hidden')) { closeSessionReport(); setView('training'); return; }
          if (state.view === 'review') { exitReviewFocus(); return; }
        }
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          if (state.view === 'input' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            if (!$('#btnAnalyze').disabled) doAnalyze();
          }
          return;
        }
        if (e.key === 'D' && e.shiftKey) { toggleTheme(); return; }
        if ((state.view === 'vocab' || state.view === 'review') && getFlipPool().length) {
          if (e.code === 'Space' && document.activeElement !== $('#spellInput')) {
            e.preventDefault();
            v68_tryRevealCard(e);
          } else if (state.flipped) {
            if (e.key === '1') reviewCard(0);
            else if (e.key === '2') reviewCard(3);
            else if (e.key === '3') reviewCard(4);
          }
          if (e.key === 'ArrowRight') nextCard();
          if (e.key === 'ArrowLeft') prevCard();
        }
      });
    }

    function toggleTheme() {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      safeLocalStorageSet(STORE.theme, next);
    }

    /* ============================================================
     *  INIT
     * ============================================================ */
    async function init() {
      // 全局错误捕获
      window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
        toast('发生错误，已自动记录', 'error');
      });

      window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        toast('操作失败，请重试', 'error');
      });

      document.addEventListener('visibilitychange', () => { if (document.hidden) flushPersistVocab(); });
      window.addEventListener('beforeunload', flushPersistVocab);

      state.vocab = await loadJsonStore(STORE.vocab, []);
      if (state.vocab.length === 0) {
        try {
          const legacy = localStorage.getItem(STORE.vocabLegacy);
          if (legacy) {
            const arr = JSON.parse(legacy);
            state.vocab = arr.map(w => ({ ...w, tier: w.tier || (w.pos === '句式' ? 'pattern' : 'vocab'), addedAt: w.addedAt || Date.now() }));
            await flushJsonStore(STORE.vocab, state.vocab);
            if (state.vocab.length) toast(`已从 v3 迁移 ${state.vocab.length} 卡到 v5`, 'success');
          }
        } catch (e) { console.warn('v3 migration failed', e); }
      } else {
        let needsSave = false;
        state.vocab.forEach(w => {
          if (!w.tier) { w.tier = w.pos === '句式' ? 'pattern' : 'vocab'; needsSave = true; }
          if (!w.addedAt) { w.addedAt = Date.now(); needsSave = true; }
        });
        if (needsSave) await flushJsonStore(STORE.vocab, state.vocab);
      }
      if (normalizeMemoryFields()) await flushJsonStore(STORE.vocab, state.vocab);
      state.articles = await loadJsonStore(STORE.articles, []);
      state.wordHistory = await loadJsonStore(STORE.wordHistory, {});
      state.reviewLog = await loadJsonStore(STORE.reviewLog, []);
      state.apiKeyMode = localStorage.getItem(STORE.apiKeyMode) || 'local';
      state.apiKey = state.apiKeyMode === 'secure' ? '' : (localStorage.getItem(STORE.apiKey) || '');
      state.provider = localStorage.getItem(STORE.provider) || 'openrouter';
      state.model = localStorage.getItem(STORE.model) || getDefaultModel(state.provider);
      if (!getModelMeta(state.provider, state.model)) state.model = getDefaultModel(state.provider);
      state.streaming = localStorage.getItem(STORE.streaming) ? localStorage.getItem(STORE.streaming) !== 'false' : !isAppleMobileBrowser();
      state.chunkThreshold = parseInt(localStorage.getItem(STORE.chunkThreshold)) || DEFAULT_CHUNK_THRESHOLD;
      state.selectedVoice = localStorage.getItem(STORE.voice) || '';
      state.studyMode = localStorage.getItem(STORE.studyMode) || 'en2zh';
      state.reminderTime = localStorage.getItem(STORE.reminderTime) || '09:00';
      state.notificationsEnabled = localStorage.getItem(STORE.notifications) === 'true';
      state.recallGate = localStorage.getItem(STORE.recallGate) !== 'false';
      try { const g = JSON.parse(localStorage.getItem(STORE.dailyGoals) || '{}'); state.dailyGoals = { ...state.dailyGoals, ...g }; } catch { }
      try { state.aiErrorLog = JSON.parse(localStorage.getItem(STORE.aiErrorLog) || '[]').slice(-50); } catch { state.aiErrorLog = []; }
      const savedDraft = localStorage.getItem(STORE.draft);
      if (savedDraft) {
        $('#newsInput').value = savedDraft;
        onInputChange();
      }
      const savedTheme = localStorage.getItem(STORE.theme);
      if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme', 'dark');
      const verEl = $('#verBadge');
      if (verEl) {
        verEl.textContent = VERSION_CONFIG.current;
        verEl.dataset.tip = VERSION_CONFIG.changelog.join('\n');
      }
      $('#footerBrand').textContent = `FINREAD ${VERSION_CONFIG.current} · Guided Setup · AI Resilience`;
      $('#dateLabel').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
      $$('.flip-mode-toggle button').forEach(b => b.classList.toggle('active', b.dataset.mode === state.studyMode));
      if ($('#recallGateSelect')) $('#recallGateSelect').value = String(state.recallGate !== false);
      updateAllCounts();
      $('#articleCount').textContent = state.articles.length;
      renderModelBadge();
      updateStreakBadge();
      updateGoalsBanner();
      renderV64Dashboard();
      bindEvents();
      bindKeyboard();
      if (!state.apiKey) openSettings();

      maybeShowReviewNotification();
    }

    init().catch(e => {
      console.error('Init failed:', e);
      toast('启动失败，请刷新重试', 'error');
    });
  
  </script>

    /* ============================================================
     *  ✦ HOME STATS UPDATE (v7.1 Home Redesign)
     * ============================================================ */
    function updateHomeStats() {
      const due = (typeof getReviewPool === 'function' ? getReviewPool() : []).length;
      const frDue = document.getElementById('frDueCount');
      if (frDue) frDue.textContent = due > 0 ? `${due} 张待复习` : '暂无待复习';
      const frVocab = document.getElementById('frVocabCount');
      if (frVocab) frVocab.textContent = `${(state?.vocab?.length || 0)} 个词卡`;
      const frReview = document.getElementById('frBtnReview');
      if (frReview) {
        frReview.style.opacity = due > 0 ? '1' : '.65';
      }
      const btnSettingsHome = document.getElementById('btnSettingsHome');
      if (btnSettingsHome && !btnSettingsHome._bound) {
        btnSettingsHome._bound = true;
        btnSettingsHome.addEventListener('click', () => setView('settings'));
      }
    }
