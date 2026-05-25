    function recordMistake(card, reasons = [], meta = {}) {
      ensureMemoryFields(card);
      const cleanReasons = [...new Set((reasons || []).filter(Boolean))];
      const finalReasons = cleanReasons.length ? cleanReasons : ['含义不熟'];
      card.wrongCount = (card.wrongCount || 0) + 1;
      card.lastWrongAt = Date.now();
      card.recoveryStreak = 0;
      card.masteredManually = false;
      addUniqueTags(card, finalReasons);
      card.mistakeHistory.push({
        time: Date.now(),
        reason: finalReasons,
        mode: meta.mode || state.trainingMode || state.studyMode || 'review',
        userAnswer: meta.userAnswer || '',
        correctAnswer: meta.correctAnswer || card.word || ''
      });
      card.mistakeHistory = card.mistakeHistory.slice(-10);
    }

    function recordRecovery(card) {
      ensureMemoryFields(card);
      if ((card.wrongCount || 0) <= 0) return;
      card.recoveryStreak = (card.recoveryStreak || 0) + 1;
      if (card.recoveryStreak >= 3) card.resolvedAt = Date.now();
    }

    function mistakeStatus(card) {
      ensureMemoryFields(card);
      if (card.masteredManually || card.recoveryStreak >= 3) return '已解决';
      if ((card.wrongCount || 0) >= 3 && (card.recoveryStreak || 0) === 0) return '反复错';
      if ((card.recoveryStreak || 0) > 0) return '正在恢复';
      return '新错题';
    }

    function isHighFrequencyMistake(card) {
      ensureMemoryFields(card);
      return (card.wrongCount || 0) >= 3 && (card.recoveryStreak || 0) < 2 && !card.masteredManually;
    }

    function mistakeCards() {
      return state.vocab.filter(c => {
        ensureMemoryFields(c);
        return (c.wrongCount || 0) > 0 || (c.mistakeHistory || []).length > 0;
      });
    }

    function mostCommonReason(cards) {
      const counts = {};
      cards.forEach(c => (c.errorTags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    }

    function recommendedTraining(card) {
      const tags = card.errorTags || [];
      if (tags.includes('拼写错误')) return '拼写默写';
      if (tags.includes('搭配不会')) return '搭配选择 / 例句挖空';
      if (tags.includes('近义混淆')) return '易混词对比测验';
      if (tags.includes('句中认不出')) return '原文语境挖空';
      if (tags.includes('发音不熟')) return '听音辨词';
      if (tags.includes('语法结构不懂')) return '语法拆解';
      return '英译中 / 中译英';
    }

    function fmtMemoryTime(ts) {
      if (!ts) return '—';
      const diff = Date.now() - ts;
      if (diff < 3600000) return Math.max(1, Math.round(diff / 60000)) + ' 分钟前';
      if (diff < 86400000) return Math.round(diff / 3600000) + ' 小时前';
      if (diff < 7 * 86400000) return Math.round(diff / 86400000) + ' 天前';
      return new Date(ts).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }

    function extractExample(card) {
      const hist = getWordHistory(card);
      if (hist.length) return hist[0].sentence || '';
      const ex = Array.isArray(card.examples) ? card.examples[0] : null;
      if (typeof ex === 'string') return ex;
      return ex?.en || '';
    }

    function stripWordFromExample(card, fallback) {
      const word = String(card.word || '').trim();
      const source = extractExample(card) || fallback || `Analysts used "${word}" in a market update about earnings, guidance, regulation, or investor risk.`;
      if (!word) return source;
      try {
        const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        return source.replace(re, '_____');
      } catch {
        return source.replace(word, '_____');
      }
    }

    function shuffleArray(arr) {
      return [...arr].sort(() => Math.random() - .5);
    }

    function v69_sentencePool() {
      const fromAnalysis = (state.analysis?.sentences || []).map(s => ({
        en: (s.original || '').replace(/\*\*/g, ''),
        zh: s.translation || '',
        grammar: s.grammar || s.grammar_analysis || null,
        articleTitle: state.analysis?.title || 'Current Article'
      }));
      const fromHistory = Object.values(state.wordHistory || {}).flat().map(h => ({
        en: h.sentence || '',
        zh: h.translation || '',
        articleTitle: h.articleTitle || 'Archived Article'
      }));
      const fromArticles = (state.articles || []).flatMap(a => {
        const parts = String(a.raw || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [];
        return parts.slice(0, 8).map(en => ({ en: en.trim(), zh: '', articleTitle: a.title || 'Archived Article' }));
      });
      const seen = new Set();
      return [...fromAnalysis, ...fromHistory, ...fromArticles]
        .filter(s => s.en && s.en.length > 40 && s.en.length < 260)
        .filter(s => { const k = s.en.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    }

    function v69_pickMeaningOptions(card) {
      const pool = shuffleArray(state.vocab.filter(v => v !== card && (v.translation || v.note))).slice(0, 3)
        .map(v => v.translation || v.note || '');
      return shuffleArray([card.translation || card.note || '查看原词卡释义', ...pool]).slice(0, 4);
    }

    function v69_maskKeyword(sentence) {
      const words = sentence.match(/\b[A-Za-z][A-Za-z-]{3,}\b/g) || [];
      const pick = words.sort((a, b) => b.length - a.length)[0] || '';
      if (!pick) return { masked: sentence, answer: '' };
      const re = new RegExp(`\\b${pick.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return { masked: sentence.replace(re, pick[0] + '_'.repeat(Math.max(2, pick.length - 1))), answer: pick };
    }

    function v69_skeleton(sentence) {
      return sentence
        .replace(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g, '[名词/机构]')
        .replace(/\b(rose|fell|held|said|reported|warned|signaled|announced|expects|cuts|raise|lower|expand|tighten|ease)\b/gi, '[谓语]')
        .replace(/\b\d+(?:\.\d+)?%?\b/g, '[数字]')
        .replace(/\b(on|in|at|after|before|while|as|because|although|if|amid|despite)\b/gi, '[连接/介词]')
        .slice(0, 220);
    }

    function v69_questionForCard(card) {
      const tags = card.errorTags || [];
      const colloc = collocationItems(card)[0]?.phrase || '';
      const sim = confusableItems(card)[0];
      const source = card.sourceSentence || extractExample(card) || getWordHistory(card)[0]?.sentence || '';
      if (tags.includes('拼写错误')) return { kind: 'spelling', card, prompt: `拼写默写：${card.translation || card.note || card.pos || ''}`, answer: card.word, input: true, reason: '拼写错误' };
      if (tags.includes('搭配不会') && colloc) return { kind: 'collocation', card, prompt: `搭配填空：${colloc.replace(new RegExp(card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '_____')}`, answer: card.word, input: true, reason: '搭配不会' };
      if (tags.includes('近义混淆') && sim) return { kind: 'synonym', card, prompt: `${card.word} 与 ${sim.term} 的核心区别是？`, options: shuffleArray([sim.diff || `${card.word} 更贴近本卡语境`, '二者任何财经语境都可互换', `${sim.term} 只能作专有名词使用`, `${card.word} 只用于口语闲聊`]), answer: sim.diff || `${card.word} 更贴近本卡语境`, reason: '近义混淆' };
      if (tags.includes('句中认不出') && source) return { kind: 'source', card, prompt: stripWordFromExample(card, source), answer: card.word, input: true, reason: '句中认不出' };
      if (tags.includes('语法结构不懂') && source) return { kind: 'grammar', card, prompt: `补全句子骨架：${v69_skeleton(source)}`, answer: source, input: true, fuzzy: true, reason: '语法结构不懂' };
      return { kind: 'meaning', card, prompt: `含义选择：${card.word}`, options: v69_pickMeaningOptions(card), answer: card.translation || card.note || '查看原词卡释义', reason: tags[0] || '含义不熟' };
    }

    function v69_recallQuestion() {
      const s = shuffleArray(v69_sentencePool())[0];
      if (!s) return null;
      const type = shuffleArray(['keyword', 'translate', 'skeleton'])[0];
      if (type === 'keyword') {
        const m = v69_maskKeyword(s.en);
        return { kind: 'recall-keyword', sentence: s, prompt: m.masked, answer: m.answer, input: true, reason: '原文关键词回忆' };
      }
      if (type === 'translate') return { kind: 'recall-translate', sentence: s, prompt: s.zh || `回译这句财经英文：${s.articleTitle}`, context: s.en, answer: s.en, input: true, fuzzy: true, reason: '中文回译英文' };
      return { kind: 'recall-skeleton', sentence: s, prompt: v69_skeleton(s.en), answer: s.en, input: true, fuzzy: true, reason: '句式骨架补全' };
    }

    function v69_startTraining(mode, cards = null) {
      const queue = mode === 'recall'
        ? shuffleArray(v69_sentencePool()).slice(0, 12)
        : shuffleArray(cards || filteredMistakeCards()).slice(0, 20);
      if (!queue.length) { toast(mode === 'recall' ? '暂无可用于原文回忆的句子' : '暂无可诊断错题', 'info'); return; }
      state.v69Training = { mode, queue, idx: 0, current: null, answered: false, stats: { total: 0, correct: 0, hard: 0, wrong: 0 } };
      setView('recallEngine');
    }

    function v69_renderRecallEngine() {
      const box = $('#recallEngineBox');
      if (!box) return;
      const tr = state.v69Training;
      $('#recallEngineTitle').textContent = tr.mode === 'recall' ? '原文回忆训练' : '错因诊断训练';
      $('#recallEngineStats').innerHTML = [
        ['题目', `${Math.min(tr.idx + 1, tr.queue.length)}/${tr.queue.length}`],
        ['正确', tr.stats.correct],
        ['困难', tr.stats.hard],
        ['错误', tr.stats.wrong],
        ['模式', tr.mode === 'recall' ? '原文' : '诊断'],
      ].map(([label, value]) => `<div class="mistake-stat"><div class="value">${escapeHtml(value)}</div><div class="label">${escapeHtml(label)}</div></div>`).join('');
      if (tr.idx >= tr.queue.length) {
        box.innerHTML = `<div class="memory-empty"><div class="em">训练完成</div><div>正确 ${tr.stats.correct} · 困难 ${tr.stats.hard} · 错误 ${tr.stats.wrong}</div><button class="btn-primary" onclick="v69_exitRecallEngine()" style="margin-top:14px;">返回训练中心</button></div>`;
        return;
      }
      if (!tr.current || tr.answered) {
        tr.current = tr.mode === 'recall' ? v69_recallQuestion() : v69_questionForCard(tr.queue[tr.idx]);
        tr.answered = false;
      }
      const q = tr.current;
      if (!q) { box.innerHTML = `<div class="memory-empty">当前没有可生成的训练题。</div>`; return; }
      box.innerHTML = `<div class="memory-card">
        <div class="confuse-meta"><span>${escapeHtml(q.kind)}</span><span>${escapeHtml(q.reason || '')}</span></div>
        <div class="confuse-question">${escapeHtml(q.prompt)}</div>
        ${q.context ? `<div class="confuse-context">${escapeHtml(q.context)}</div>` : ''}
        ${q.input ? `<input class="spell-input active" id="recallAnswerInput" placeholder="输入答案，按 Enter 提交..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />` : `<div class="confuse-options">${(q.options || []).map(o => `<button class="confuse-option" data-answer="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}</div>`}
        <div class="confuse-feedback hidden" id="recallFeedback"></div>
      </div>
      <div class="memory-actions"><button class="btn-primary" id="recallSubmitBtn">提交</button><button class="btn-base" id="recallSkipBtn">跳过</button></div>`;
      $('#recallAnswerInput')?.focus();
      $('#recallAnswerInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') v69_answerRecall(); });
      $$('.confuse-option').forEach(b => b.addEventListener('click', () => v69_answerRecall(b.dataset.answer)));
      $('#recallSubmitBtn')?.addEventListener('click', () => v69_answerRecall());
      $('#recallSkipBtn')?.addEventListener('click', () => v69_answerRecall('', true));
    }

    function v69_answerRecall(value = null, skipped = false) {
      const tr = state.v69Training;
      const q = tr.current;
      if (!q || tr.answered) return;
      const raw = value ?? ($('#recallAnswerInput')?.value || '');
      const ans = v68_normalizeAnswer(raw);
      const correct = v68_normalizeAnswer(q.answer || '');
      const ok = !skipped && (q.fuzzy ? ans.length >= Math.min(18, Math.max(6, correct.length * .25)) : ans === correct);
      tr.answered = true; tr.stats.total++;
      const quality = ok ? 4 : skipped ? 3 : 2;
      if (ok) tr.stats.correct++; else if (skipped) tr.stats.hard++; else tr.stats.wrong++;
      if (q.card) {
        if (ok) recordRecovery(q.card); else recordMistake(q.card, [q.reason || '含义不熟'], { mode: `v69-${q.kind}`, userAnswer: raw, correctAnswer: q.answer || '' });
        const updates = sm2(q.card, quality);
        Object.assign(q.card, updates);
        persistVocab();
      }
      state.reviewLog.push({ ts: Date.now(), tier: q.card?.tier || 'article', word: q.card?.word || q.kind, quality, mode: `v69-${q.kind}` });
      persistReviewLog();
      const fb = $('#recallFeedback');
      if (fb) {
        fb.className = `confuse-feedback ${ok ? 'good' : 'bad'}`;
        fb.innerHTML = `<div class="confuse-feedback-title">${ok ? '答对了' : skipped ? '已跳过' : '需要再练'} · 参考答案：${escapeHtml(q.answer || '')}</div>`;
        fb.classList.remove('hidden');
      }
      setTimeout(() => { tr.idx++; tr.current = null; tr.answered = false; v69_renderRecallEngine(); }, 900);
    }

    function v69_exitRecallEngine() {
      state.v69Training.current = null;
      setView('training');
    }
    window.v69_exitRecallEngine = v69_exitRecallEngine;
    window.v69_answerRecall = v69_answerRecall;

    function confusableItems(card) {
      const items = [];
      if (Array.isArray(card.similar)) {
        card.similar.forEach(s => {
          const term = s.phrase || s.word || s.term;
          if (term) items.push({ term, diff: s.diff || s.note || '', source: 'similar' });
        });
      }
      if (Array.isArray(card.synonyms)) {
        card.synonyms.forEach(s => {
          const term = s.word || s.phrase || s.term;
          if (term) items.push({ term, diff: s.diff || s.zh || '', source: 'synonyms' });
        });
      }
      return items.filter(i => i.term && i.term.toLowerCase() !== String(card.word || '').toLowerCase());
    }

    function collocationItems(card) {
      if (!Array.isArray(card.collocations)) return [];
      return card.collocations.map(c => {
        if (typeof c === 'string') return { phrase: c, example: '' };
        return { phrase: c.phrase || c.collocation || c.text || '', example: c.example || c.en || '' };
      }).filter(c => c.phrase);
    }

    function getConfusableCards(base = state.vocab) {
      return base.filter(card => confusableItems(card).length > 0 || collocationItems(card).length > 0);
    }

    function makeConfuseQuestion(deck) {
      const viable = getConfusableCards(deck);
      if (!viable.length) return null;
      const card = viable[Math.floor(Math.random() * viable.length)];
      const sims = confusableItems(card);
      const collocs = collocationItems(card);
      const typePool = [];
      if (sims.length) typePool.push('binary', 'diff');
      if (sims.length >= 2) typePool.push('multi');
      if (collocs.length) typePool.push('collocation');
      const type = typePool[Math.floor(Math.random() * typePool.length)];
      const word = card.word || '';
      const example = stripWordFromExample(card);

      if (type === 'collocation') {
        const natural = Math.random() > .35;
        const good = collocs[Math.floor(Math.random() * collocs.length)];
        const otherCards = state.vocab.filter(c => c !== card && collocationItems(c).length);
        const badPhrase = otherCards.length
          ? collocationItems(otherCards[Math.floor(Math.random() * otherCards.length)])[0]?.phrase
          : `${word} quarterly earnings`;
        const phrase = natural ? good.phrase : badPhrase;
        return {
          card, type, answer: natural ? '自然' : '不自然',
          prompt: `搭配判断：在财经新闻里，"${phrase}" 和 "${word}" 的用法是否自然？`,
          context: good.example || `Financial reporters often rely on stable collocations when describing markets, policy and corporate results.`,
          options: ['自然', '不自然'],
          diff: natural ? `该搭配来自原词卡：${good.phrase}` : `更可靠的原词卡搭配是：${good.phrase}`,
          example: good.example || `${good.phrase} appeared in a market commentary.`
        };
      }

      const pick = sims[Math.floor(Math.random() * sims.length)];
      if (type === 'diff') {
        const distractors = [
          '两者没有明显区别，可以在所有语境中互换。',
          `${pick.term} 只用于口语闲聊，不适合财经新闻。`,
          `${word} 只表示人，而 ${pick.term} 只表示机构。`
        ];
        return {
          card, type, answer: pick.diff || `${word} 更贴近原词卡语境，${pick.term} 的语义或语体不同。`,
          prompt: `区别解释：${word} 与 ${pick.term} 的核心区别是什么？`,
          context: example,
          options: shuffleArray([pick.diff || `${word} 更贴近原词卡语境，${pick.term} 的语义或语体不同。`, ...distractors]).slice(0, 4),
          diff: pick.diff || '',
          example: extractExample(card) || `In financial news, ${word} is chosen when the writer needs the more precise meaning from this card.`
        };
      }

      const candidates = shuffleArray([word, ...sims.map(s => s.term)]).slice(0, type === 'binary' ? 2 : 4);
      if (!candidates.includes(word)) candidates[0] = word;
      return {
        card, type, answer: word,
        prompt: type === 'binary'
          ? '二选一：根据句子语境选择更合适的词。'
          : '多选一：从近义表达中选择最贴合财经语境的一项。',
        context: example || `In a market note, analysts needed a term meaning "${card.translation || card.note || word}" in a discussion of policy, risk, earnings or liquidity.`,
        options: shuffleArray(candidates),
        diff: pick.diff || `${word} 更贴近本卡含义：${card.translation || card.note || ''}`,
        example: extractExample(card) || `Analysts used ${word} to describe a financial development precisely.`
      };
    }

    function renderConfuseQuiz() {
      const box = $('#confuseQuizBox');
      if (!box) return;
      const deck = state.confuseQuiz.deck.length ? state.confuseQuiz.deck : getConfusableCards();
      if (!deck.length) {
        box.innerHTML = `<div class="memory-empty">暂无足够的 synonyms / similar / collocations 数据，先精读或补充词卡后再训练。</div>`;
        return;
      }
      if (!state.confuseQuiz.current || state.confuseQuiz.answered) {
        state.confuseQuiz.current = makeConfuseQuestion(deck);
        state.confuseQuiz.answered = false;
      }
      const q = state.confuseQuiz.current;
      if (!q) {
        box.innerHTML = `<div class="memory-empty">当前筛选下没有可生成的易混词题。</div>`;
        return;
      }
      box.innerHTML = `<div class="memory-card">
        <div class="confuse-meta"><span>${escapeHtml(q.type)}</span><span>${getConfusableCards(deck).length} 张可训练</span></div>
        <div class="confuse-question">${escapeHtml(q.prompt)}</div>
        <div class="confuse-context">${escapeHtml(q.context)}</div>
        <div class="confuse-options">
          ${q.options.map(opt => `<button class="confuse-option" data-answer="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}
        </div>
        <div class="confuse-feedback hidden" id="confuseFeedback"></div>
      </div>
      <div class="memory-actions">
        <button class="btn-primary" id="confuseNextBtn">下一题</button>
        <button class="btn-base" onclick="openMistakeBook('近义混淆')">查看近义混淆错题</button>
      </div>`;
      $$('.confuse-option').forEach(btn => btn.addEventListener('click', () => answerConfuseQuiz(btn.dataset.answer)));
      $('#confuseNextBtn')?.addEventListener('click', () => {
        state.confuseQuiz.current = makeConfuseQuestion(deck);
        state.confuseQuiz.answered = false;
        renderConfuseQuiz();
      });
    }

    function answerConfuseQuiz(answer) {
      const q = state.confuseQuiz.current;
      if (!q || state.confuseQuiz.answered) return;
      state.confuseQuiz.answered = true;
      const ok = answer === q.answer;
      $$('.confuse-option').forEach(btn => {
        const val = btn.dataset.answer;
        btn.disabled = true;
        btn.classList.toggle('correct', val === q.answer);
        btn.classList.toggle('wrong', val === answer && !ok);
      });
      ensureMemoryFields(q.card);
      if (ok) {
        q.card.memoryBoost = (q.card.memoryBoost || 0) + 1;
        q.card.easeFactor = Math.min(3.2, +(Number(q.card.easeFactor || 2.5) + 0.02).toFixed(2));
        recordRecovery(q.card);
      } else {
        recordMistake(q.card, ['近义混淆'], { mode: 'confusable-quiz', userAnswer: answer, correctAnswer: q.answer });
      }
      persistVocab();
      const feedback = $('#confuseFeedback');
      feedback.className = `confuse-feedback ${ok ? 'good' : 'bad'}`;
      feedback.innerHTML = `<div class="confuse-feedback-title">${ok ? '答对了' : '答错了'} · 正确答案：${escapeHtml(q.answer)}</div>
        <div class="confuse-feedback-body">
          <b>区别：</b>${escapeHtml(q.diff || '参考原词卡辨析。')}<br>
          <b>例句：</b>${escapeHtml(q.example || '')}
        </div>`;
      feedback.classList.remove('hidden');
      toast(ok ? '易混辨析 +1' : '已加入错题本 · 近义混淆', ok ? 'success' : 'warning');
      renderTrainingCenter();
    }

    function launchConfuseQuiz(cards = null) {
      const deck = getConfusableCards(cards || state.vocab);
      if (!deck.length) { toast('暂无足够的易混词或搭配数据', 'info'); return; }
      state.confuseQuiz = { deck, idx: 0, current: makeConfuseQuestion(deck), answered: false };
      setView('confuseQuiz');
    }

    function renderMistakeBook() {
      const statsBox = $('#mistakeStats');
      const listBox = $('#mistakeList');
      if (!statsBox || !listBox) return;
      const all = mistakeCards();
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      const high = all.filter(isHighFrequencyMistake);
      const recent = all.filter(c => (c.lastWrongAt || 0) >= sevenDaysAgo);
      const solved = all.filter(c => mistakeStatus(c) === '已解决');
      statsBox.innerHTML = [
        ['总错题数', all.length],
        ['高频错题数', high.length],
        ['近 7 天新增', recent.length],
        ['最常见错因', mostCommonReason(all)],
        ['已解决错题', solved.length],
      ].map(([label, value]) => `<div class="mistake-stat"><div class="value">${escapeHtml(value)}</div><div class="label">${escapeHtml(label)}</div></div>`).join('');

      const reasonSel = $('#mistakeReasonFilter');
      if (reasonSel && !reasonSel.dataset.ready) {
        reasonSel.innerHTML = `<option value="all">全部错因</option>` + MEMORY_ERROR_REASONS.map(r => `<option value="${r}">${r}</option>`).join('');
        reasonSel.dataset.ready = '1';
      }
      if (reasonSel) reasonSel.value = state.mistakeFilter.reason;
      if ($('#mistakeSort')) $('#mistakeSort').value = state.mistakeFilter.sort;
      if ($('#mistakeRecentOnly')) $('#mistakeRecentOnly').checked = state.mistakeFilter.recentOnly;
      if ($('#mistakeHighOnly')) $('#mistakeHighOnly').checked = state.mistakeFilter.highOnly;

      let cards = [...all];
      if (state.mistakeFilter.reason !== 'all') cards = cards.filter(c => (c.errorTags || []).includes(state.mistakeFilter.reason));
      if (state.mistakeFilter.recentOnly) cards = cards.filter(c => (c.lastWrongAt || 0) >= sevenDaysAgo);
      if (state.mistakeFilter.highOnly) cards = cards.filter(isHighFrequencyMistake);
      cards.sort((a, b) => state.mistakeFilter.sort === 'recent'
        ? (b.lastWrongAt || 0) - (a.lastWrongAt || 0)
        : (b.wrongCount || 0) - (a.wrongCount || 0));

      if (!cards.length) {
        listBox.innerHTML = `<div class="memory-empty">当前没有错题记录。复习中选择“不认识 / 不确定”，或易混词对比答错后会自动出现在这里。</div>`;
        return;
      }
      listBox.innerHTML = cards.map(card => {
        const tags = (card.errorTags || []).slice(0, 4).map(t => `<span class="mistake-tag">${escapeHtml(t)}</span>`).join('');
        return `<div class="mistake-card" data-key="${escapeHtml(cardKey(card))}">
          <div>
            <div class="mistake-word">${escapeHtml(card.word || '')}<span class="mistake-status">${mistakeStatus(card)}</span></div>
            <div class="mistake-zh">${escapeHtml(card.translation || card.note || '')}</div>
            <div class="mistake-tags">${tags || '<span class="mistake-tag">未标注错因</span>'}</div>
            <div class="mistake-meta">错误 ${card.wrongCount || 0} 次 · 最近 ${fmtMemoryTime(card.lastWrongAt)} · 推荐：${recommendedTraining(card)}</div>
          </div>
          <div class="mistake-card-actions">
            <button class="btn-primary" data-act="train">开始训练</button>
            <button class="btn-base" data-act="master">标记已掌握</button>
          </div>
        </div>`;
      }).join('');
      $$('.mistake-card button').forEach(btn => btn.addEventListener('click', () => {
        const card = findCardByKey(btn.closest('.mistake-card')?.dataset.key);
        if (!card) return;
        if (btn.dataset.act === 'master') markMistakeMastered(card);
        else startMistakeTraining([card]);
      }));
    }

    function findCardByKey(key) {
      return state.vocab.find(c => cardKey(c) === key);
    }

    function openMistakeBook(reason = null) {
      if (reason) state.mistakeFilter.reason = reason;
      setView('mistakes');
    }
    window.openMistakeBook = openMistakeBook;

    function markMistakeMastered(card) {
      ensureMemoryFields(card);
      card.masteredManually = true;
      card.recoveryStreak = Math.max(3, card.recoveryStreak || 0);
      card.resolvedAt = Date.now();
      persistVocab();
      renderMistakeBook();
      renderTrainingCenter();
      toast('已标记为掌握，历史记录仍会保留', 'success');
    }

    function filteredMistakeCards() {
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      let cards = mistakeCards();
      if (state.mistakeFilter.reason !== 'all') cards = cards.filter(c => (c.errorTags || []).includes(state.mistakeFilter.reason));
      if (state.mistakeFilter.recentOnly) cards = cards.filter(c => (c.lastWrongAt || 0) >= sevenDaysAgo);
      if (state.mistakeFilter.highOnly) cards = cards.filter(isHighFrequencyMistake);
      return cards;
    }

    function startMistakeTraining(cards = null) {
      const target = cards || filteredMistakeCards();
      if (!target.length) { toast('当前筛选下没有可训练错题', 'info'); return; }
      if (target.some(c => (c.errorTags || []).length)) {
        v69_startTraining('diagnosis', target);
        return;
      }
      if (target.some(c => (c.errorTags || []).includes('句中认不出')) && v68_clozeCards(target).length) {
        state.clozeDeckOverride = target;
        launchTrainingMode('cloze');
        return;
      }
      if (target.some(c => (c.errorTags || []).includes('近义混淆')) && getConfusableCards(target).length) {
        launchConfuseQuiz(target);
        return;
      }
      state.trainingMode = 'mistakes';
      state.vocabFilter = 'all';
      state.studyMode = target.some(c => (c.errorTags || []).includes('拼写错误')) ? 'spell' : 'en2zh';
      $$('.flip-mode-toggle button').forEach(b => b.classList.toggle('active', b.dataset.mode === state.studyMode));
      enterReviewFocus();
      _pomo.active = true; _pomo.queue = [...target].sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0)).slice(0, POMO_LIMIT);
      _pomo.idx = 0; _pomo.round = 1; _pomo.againQueue = [];
      _pomo.remaining = POMO_DURATION; _pomo.startedAt = null;
      state.flipIdx = 0;
      show('#pomoBar'); hide('#pomoStart');
      $('#pomoTimer').textContent = pomoFmt(_pomo.remaining);
      $('#pomoTimer').classList.remove('urgent');
      pomoUpdateProgress();
      renderFlipCard();
      if (target.some(c => (c.errorTags || []).includes('发音不熟'))) speak(_pomo.queue[0]?.word || '');
      toast(`错题专项训练 · ${_pomo.queue.length} 张`, 'info');
    }

    function showMistakeReasonPanel(card, quality, meta = {}) {
      ensureMemoryFields(card);
      state.pendingMistake = { card, quality, meta };
      const grid = $('#mistakeReasonGrid');
      if (!grid) return;
      $('#mistakeReasonSub').textContent = `${card.word || '当前卡片'} · ${quality === 3 ? '不确定' : '不认识'}，可多选或跳过。`;
      grid.innerHTML = MEMORY_ERROR_REASONS.map(r => `<button class="mistake-reason-pill" data-reason="${r}">${r}</button>`).join('');
      $$('.mistake-reason-pill').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('active')));
      $('#memorySheetBackdrop')?.classList.add('visible');
      $('#mistakeReasonSheet')?.classList.add('visible');
    }

    function closeMistakeReasonPanel() {
      $('#memorySheetBackdrop')?.classList.remove('visible');
      $('#mistakeReasonSheet')?.classList.remove('visible');
      state.pendingMistake = null;
    }

    function submitMistakeReasons(skip = false) {
      const pending = state.pendingMistake;
      if (!pending) return;
      const reasons = skip ? [] : $$('.mistake-reason-pill.active').map(b => b.dataset.reason);
      const { quality, meta } = pending;
      closeMistakeReasonPanel();
      reviewCard(quality, { ...meta, reasons, skipReasonPanel: true });
    }

    function maybeShowGestureOnboarding() {
      if (localStorage.getItem(STORE.gestureHintSeen) === 'true') return;
      if (!window.matchMedia('(pointer: coarse)').matches) return;
      const box = $('#gestureOnboarding');
      if (box) box.classList.remove('hidden');
    }

    function completeGestureOnboarding() {
      safeLocalStorageSet(STORE.gestureHintSeen, 'true');
      $('#gestureOnboarding')?.classList.add('hidden');
    }

    function v68_isEnToZhMode() {
      return state.studyMode === 'en2zh' && !state.clozeActive;
    }

    function v68_setRecallGateReady(ready) {
      state.recallGateReady = ready;
      const btn = $('#flipRevealBtn');
      if (!btn) return;
      const locked = state.recallGate && v68_isEnToZhMode() && !ready;
      btn.disabled = locked;
      btn.classList.toggle('recall-locked', locked);
      btn.textContent = locked ? '…' : '翻面';
    }

    function v68_resetRecallGate() {
      if (state.recallGateTimer) {
        clearTimeout(state.recallGateTimer);
        state.recallGateTimer = null;
      }
      if (state.recallGate && v68_isEnToZhMode()) {
        v68_setRecallGateReady(false);
        state.recallGateTimer = setTimeout(() => v68_setRecallGateReady(true), 1000);
      } else {
        v68_setRecallGateReady(true);
      }
    }

    function v68_canRevealNow() {
      return !state.recallGate || !v68_isEnToZhMode() || state.recallGateReady;
    }

    function v68_tryRevealCard(e = null) {
      if (state.clozeActive) return false;
      if (!v68_canRevealNow()) {
        if (e) e.preventDefault();
        toast('先想 1 秒，再翻面', 'info', 900);
        return false;
      }
      state.flipped = !state.flipped;
      $('#flipInner').classList.toggle('flipped', state.flipped);
      return true;
    }

    function setupReviewGestures() {
      const card = $('.flip-card');
      const overlay = $('#gestureOverlay');
      if (!card || !overlay) return;
      card.classList.add('gesture-ready');
      let startX = 0, startY = 0, startT = 0, lastTap = 0, longTimer = null;
      let tracking = false, gestureLocked = false, longPressed = false;

      const resetOverlay = () => {
        overlay.className = 'gesture-overlay';
        overlay.textContent = '';
        card.style.transform = '';
        card.classList.remove('swiping', 'gesture-longpress');
      };
      const showOverlay = (kind, label) => {
        overlay.className = `gesture-overlay visible ${kind}`;
        overlay.textContent = label;
      };
      const gestureKind = (dx, dy) => {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        if (Math.max(ax, ay) < 18 || Math.max(ax, ay) < Math.min(ax, ay) * 1.35) return null;
        if (ax > ay) return dx < 0 ? ['again', '不认识'] : ['good', '认识'];
        return dy < 0 ? ['hard', '不确定'] : ['easy', state.flipped ? '认识' : '显示答案'];
      };
      const markLongPress = () => {
        const w = currentFlipCard();
        if (!w || !tracking) return;
        longPressed = true;
        ensureMemoryFields(w);
        addUniqueTags(w, ['近义混淆']);
        w.hardCount = Math.max(3, w.hardCount || 0);
        persistVocab();
        card.classList.add('gesture-longpress');
        showOverlay('hard', '重点复习');
        toast('已标记为易混 / 重点复习', 'warning');
      };

      card.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || state.view !== 'review') return;
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY; startT = Date.now();
        tracking = true; gestureLocked = false; longPressed = false;
        card.classList.add('swiping');
        clearTimeout(longTimer);
        longTimer = setTimeout(markLongPress, 500);
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        if (!tracking || e.touches.length !== 1 || state.view !== 'review') return;
        const t = e.touches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        const kind = gestureKind(dx, dy);
        if (kind) {
          gestureLocked = true;
          clearTimeout(longTimer);
          card.style.transform = `translate(${dx * .18}px, ${dy * .18}px) rotate(${dx * .015}deg)`;
          showOverlay(kind[0], kind[1]);
          e.preventDefault();
        }
      }, { passive: false });

      card.addEventListener('touchend', (e) => {
        if (!tracking || state.view !== 'review') return;
        clearTimeout(longTimer);
        const touch = e.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        const ax = Math.abs(dx), ay = Math.abs(dy);
        const duration = Date.now() - startT;
        const isTap = ax < 12 && ay < 12 && duration < 260;
        if (longPressed) {
          setTimeout(resetOverlay, 260);
          tracking = false;
          return;
        }
        if (isTap) {
          const now = Date.now();
          if (now - lastTap < 300) {
            const w = currentFlipCard();
            if (w?.word) speak(w.word);
            showOverlay('easy', '发音');
            setTimeout(resetOverlay, 260);
            e.preventDefault();
          } else {
            resetOverlay();
          }
          lastTap = now;
          tracking = false;
          return;
        }
        if (gestureLocked && Math.max(ax, ay) > 60 && Math.max(ax, ay) > Math.min(ax, ay) * 1.25) {
          if (ax > ay) {
            reviewCard(dx < 0 ? 0 : 4);
          } else if (dy < 0) {
            reviewCard(3);
          } else if (state.flipped) {
            reviewCard(4);
          } else {
            if (v68_tryRevealCard(e)) toast('已显示答案', 'info');
          }
          e.preventDefault();
        }
        setTimeout(resetOverlay, 160);
        tracking = false;
      }, { passive: false });

      card.addEventListener('touchcancel', () => {
        clearTimeout(longTimer);
        tracking = false;
        resetOverlay();
      }, { passive: true });
    }

    function enterReviewFocus() {
      if (!state.vocab.length) {
        toast('先精读一篇文章并存入卡片', 'warning');
        setView('training');
        return;
      }
      closeReviewOverlays();
      state.session = { active: true, startTs: Date.now(), reviewed: 0, good: 0, hard: 0, again: 0, mode: state.trainingMode || 'full' };
      setView('review');
      maybeShowGestureOnboarding();
    }

    function exitReviewFocus() {
      const sess = state.session;
      state.session = { active: false, startTs: null, reviewed: 0, good: 0, hard: 0, again: 0, mode: 'full' };
      if (sess.active && sess.reviewed > 0) {
        showSessionReport(sess);
      } else {
        setView('training');
      }
    }

    /* ── Training Center ── */

    function renderTrainingCenter() {
      const ts = v64TodayStartTs();
      const due = getReviewPool().length;
      const doneToday = state.reviewLog.filter(r => r.ts >= ts).length;
      const todayLogs = state.reviewLog.filter(r => r.ts >= ts);
      const accuracy = todayLogs.length > 0
        ? Math.round(todayLogs.filter(r => r.quality >= 3).length / todayLogs.length * 100)
        : null;
      const streak = calculateStreak();
      const leechCount = state.vocab.filter(v => (v.hardCount || 0) >= 3).length;
      const patternCount = state.vocab.filter(v => v.tier === 'pattern').length;
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      const recentAgainWords = new Set(
        state.reviewLog.filter(r => r.ts >= sevenDaysAgo && r.quality === 0).map(r => r.word)
      );
      const retryCount = state.vocab.filter(v => recentAgainWords.has(v.word)).length;
      const confuseCount = getConfusableCards().length;
      const mistakeCount = mistakeCards().filter(v => mistakeStatus(v) !== '已解决').length;
      const diagnosisCount = mistakeCards().filter(v => (v.errorTags || []).length && mistakeStatus(v) !== '已解决').length;
      const recallCount = v69_sentencePool().length;
      const isEmpty = state.vocab.length === 0;

      $('#tcDue').textContent = due;
      $('#tcDue').classList.toggle('tc-highlight', due > 0);
      $('#tcDoneToday').textContent = doneToday;
      $('#tcAccuracy').textContent = accuracy !== null ? accuracy + '%' : '--%';
      $('#tcStreak').textContent = streak;

      // badges
      const setB = (id, n) => {
        const el = $('#' + id);
        if (!el) return;
        el.textContent = n;
        el.classList.toggle('zero', n === 0);
      };
      setB('tcDailyBadge', due);
      setB('tcLeechBadge', leechCount);
      setB('tcPatternBadge', patternCount);
      setB('tcRetryBadge', retryCount);
      setB('tcConfuseBadge', confuseCount);
      setB('tcMistakeBadge', mistakeCount);
      setB('tcDiagnosisBadge', diagnosisCount);
      setB('tcRecallBadge', recallCount);
      $('#tcFullDue').textContent = `共 ${state.vocab.length} 词`;

      // disable empty modes
      const daily = $('#tcModeDaily');
      if (daily) daily.style.opacity = '';
      const leech = $('#tcModeLeech');
      if (leech) leech.classList.toggle('tc-soon', leechCount === 0);
      const pattern = $('#tcModePattern');
      if (pattern) pattern.classList.toggle('tc-soon', patternCount === 0);
      const retry = $('#tcModeRetry');
      if (retry) retry.classList.toggle('tc-soon', retryCount === 0);
      const confuse = $('#tcModeConfuse');
      if (confuse) confuse.classList.toggle('tc-soon', confuseCount === 0);
      const mistakes = $('#tcModeMistakes');
      if (mistakes) mistakes.classList.toggle('tc-soon', mistakeCards().length === 0);
      const diagnosis = $('#tcModeDiagnosis');
      if (diagnosis) diagnosis.classList.toggle('tc-soon', diagnosisCount === 0);
      const recall = $('#tcModeRecall');
      if (recall) recall.classList.toggle('tc-soon', recallCount === 0);

      $('#tcModes')?.classList.toggle('hidden', isEmpty);
      $('#tcQuick')?.classList.toggle('hidden', isEmpty);
      $('#tcEmpty')?.classList.toggle('hidden', !isEmpty);
    }
    window.renderTrainingCenter = renderTrainingCenter;

    function launchTrainingMode(mode) {
      if (!state.vocab.length) { toast('卡组为空，先精读一篇文章', 'warning'); return; }
      state.trainingMode = mode;
      state.flipped = false;
      if (mode !== 'cloze') state.clozeForce = false;

      if (mode === 'daily10') {
        const due = getReviewPool();
        const queue = due.length > 0
          ? [...due].sort((a, b) => (a.due || 0) - (b.due || 0)).slice(0, 10)
          : [...state.vocab].sort(() => Math.random() - .5).slice(0, 10);
        if (!queue.length) { toast('暂无可复习词汇', 'warning'); return; }
        state.vocabFilter = 'all';
        state.studyMode = 'en2zh';
        $$('.flip-mode-toggle button').forEach(b => b.classList.toggle('active', b.dataset.mode === 'en2zh'));
        enterReviewFocus();
        // Override pool with limited queue via pomo mechanism
        _pomo.active = true; _pomo.queue = queue; _pomo.idx = 0; _pomo.round = 1;
        _pomo.againQueue = []; _pomo.remaining = POMO_DURATION; _pomo.startedAt = null;
        state.flipIdx = 0;
        show('#pomoBar'); hide('#pomoStart');
        $('#pomoTimer').textContent = pomoFmt(_pomo.remaining);
        $('#pomoTimer').classList.remove('urgent');
        pomoUpdateProgress();
        renderFlipCard();
        toast(`今日 10 词 · 共 ${queue.length} 张 · 加油！`, 'success');

      } else if (mode === 'leech') {
        const leeches = state.vocab.filter(v => (v.hardCount || 0) >= 3);
        if (!leeches.length) { toast('暂无易混词，继续积累吧', 'info'); return; }
        state.vocabFilter = 'all';
        state.studyMode = 'en2zh';
        enterReviewFocus();
        _pomo.active = true; _pomo.queue = [...leeches].sort(() => Math.random() - .5).slice(0, POMO_LIMIT);
        _pomo.idx = 0; _pomo.round = 1; _pomo.againQueue = [];
        _pomo.remaining = POMO_DURATION; _pomo.startedAt = null;
        state.flipIdx = 0;
        show('#pomoBar'); hide('#pomoStart');
        $('#pomoTimer').textContent = pomoFmt(_pomo.remaining);
        $('#pomoTimer').classList.remove('urgent');
        pomoUpdateProgress();
        renderFlipCard();
        toast(`易混词专项 · ${_pomo.queue.length} 词`, 'info');

      } else if (mode === 'pattern') {
        const patterns = state.vocab.filter(v => v.tier === 'pattern');
        if (!patterns.length) { toast('暂无句式卡片', 'info'); return; }
        state.vocabFilter = 'pattern';
        state.studyMode = 'spell';
        $$('.flip-mode-toggle button').forEach(b => b.classList.toggle('active', b.dataset.mode === 'spell'));
        enterReviewFocus();
        renderFlipCard();
        toast(`财经句式默写 · ${patterns.length} 句式`, 'info');

      } else if (mode === 'retry') {
        const sevenDaysAgo = Date.now() - 7 * 86400000;
        const againWords = new Set(state.reviewLog.filter(r => r.ts >= sevenDaysAgo && r.quality === 0).map(r => r.word));
        const retryCards = state.vocab.filter(v => againWords.has(v.word));
        if (!retryCards.length) { toast('近 7 天无错题记录，继续加油', 'info'); return; }
        state.vocabFilter = 'all';
        state.studyMode = 'en2zh';
        enterReviewFocus();
        _pomo.active = true; _pomo.queue = [...retryCards].sort(() => Math.random() - .5).slice(0, POMO_LIMIT);
        _pomo.idx = 0; _pomo.round = 1; _pomo.againQueue = [];
        _pomo.remaining = POMO_DURATION; _pomo.startedAt = null;
        state.flipIdx = 0;
        show('#pomoBar'); hide('#pomoStart');
        $('#pomoTimer').textContent = pomoFmt(_pomo.remaining);
        $('#pomoTimer').classList.remove('urgent');
        pomoUpdateProgress();
        renderFlipCard();
        toast(`错题回顾 · ${_pomo.queue.length} 词`, 'info');

      } else if (mode === 'confuse') {
        launchConfuseQuiz();

      } else if (mode === 'cloze') {
        v68_startClozeMode();

      } else if (mode === 'diagnosis') {
        v69_startTraining('diagnosis');

      } else if (mode === 'recall') {
        v69_startTraining('recall');

      } else {
        // 'full' — normal pomo start
        state.vocabFilter = 'all';
        state.studyMode = 'en2zh';
        $$('.flip-mode-toggle button').forEach(b => b.classList.toggle('active', b.dataset.mode === 'en2zh'));
        enterReviewFocus();
        pomoStart();
      }
    }
    window.launchTrainingMode = launchTrainingMode;

    function showSessionReport(sess) {
      const total = sess.reviewed;
      const good = sess.good;
      const fuzzy = sess.hard;
      const bad = sess.again;
      const pct = total > 0 ? Math.round((good + fuzzy * 0.5) / total * 100) : 0;

      const modeLabel = { daily10: '今日 10 词', leech: '易混词专项', pattern: '财经句式默写', retry: '错题回顾', mistakes: '错题专项', full: '全库复习' }[sess.mode] || '专注复习';

      $('#srEmoji').textContent = pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📖';
      $('#srTitle').textContent = pct >= 80 ? '掌握得不错！' : pct >= 50 ? '继续努力！' : '再练一练';
      $('#srSubtitle').textContent = `${modeLabel} · ${total} 张卡片`;
      $('#srTotal').textContent = total;
      $('#srGood').textContent = good;
      $('#srFuzzy').textContent = fuzzy;
      $('#srBad').textContent = bad;
      $('#srBarFill').style.width = pct + '%';

      let suggest = '';
      if (bad > 0) suggest = `${bad} 词需加强 — 明日优先复习这些词汇。`;
      else if (fuzzy > 0) suggest = `模糊词 ${fuzzy} 个，明天安排一次强化复习。`;
      else suggest = '全部掌握！今天的复习做得很好。';
      if (good === total) suggest = '完美！全部掌握，继续精读积累新词。';
      $('#srSuggest').textContent = suggest;

      $('#sessionReportBackdrop').classList.remove('hidden');
      $('#sessionReport').classList.remove('hidden');
    }

    function closeSessionReport() {
      $('#sessionReportBackdrop').classList.add('hidden');
      $('#sessionReport').classList.add('hidden');
    }
    window.closeSessionReport = closeSessionReport;

    /* ── end Training Center ── */


    /* ============================================================
     *  ✦ ENHANCED MISTAKE TRACKING — Targeted Training (v7.1)
     * ============================================================ */

    const MISTAKE_ERROR_TYPES = [
      { id: 'spelling',  label: '拼写错误',   icon: '✏️', desc: '字母顺序、双写、相似字母混淆' },
      { id: 'meaning',   label: '含义模糊',   icon: '❓', desc: '中文释义记忆不准，或多义混淆' },
      { id: 'colloc',    label: '搭配错误',   icon: '🔗', desc: '固定搭配、介词、动词短语用法' },
      { id: 'context',   label: '语境判断',   icon: '📰', desc: '财经语境下的精确用法和语气' },
      { id: 'polysemy',  label: '一词多义',   icon: '🔀', desc: '熟词在金融语境下的专业含义' },
    ];

    function showErrorTypeSelector(card, onSelect) {
      const sheet = $('#mistakeReasonSheet');
      const grid = $('#mistakeReasonGrid');
      const sub = $('#mistakeReasonSub');
      if (!sheet || !grid) return;
      if (sub) sub.textContent = `「${card.word}」— 选择错误类型以生成针对性训练`;
      grid.innerHTML = MISTAKE_ERROR_TYPES.map(t => `
        <button class="mistake-reason-btn" data-type="${t.id}"
          style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 14px;background:var(--bg-soft);border:1.5px solid var(--border);border-radius:12px;cursor:pointer;font-family:inherit;text-align:left;transition:all .18s;width:100%;">
          <div style="font-size:18px;">${t.icon}</div>
          <div style="font-size:13px;font-weight:700;color:var(--text-main);">${t.label}</div>
          <div style="font-size:11px;color:var(--text-muted);line-height:1.4;">${t.desc}</div>
        </button>`).join('');
      grid.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', () => {
          $('#memorySheetBackdrop')?.classList.remove('visible');
          sheet.classList.remove('visible');
          onSelect(btn.dataset.type);
        });
      });
      $('#memorySheetBackdrop')?.classList.add('visible');
      sheet.classList.add('visible');
    }

    function recordMistakeWithType(card, quality, meta = {}) {
      if (quality <= 3 && !meta.errorType) {
        showErrorTypeSelector(card, (typeId) => {
          recordMistakeWithType(card, quality, { ...meta, errorType: typeId });
        });
        return;
      }
      ensureMemoryFields(card);
      if (!card.errorTypes) card.errorTypes = {};
      if (meta.errorType) {
        card.errorTypes[meta.errorType] = (card.errorTypes[meta.errorType] || 0) + 1;
      }
      recordMistake(card, meta.reasons || [], {
        mode: meta.mode || 'review',
        userAnswer: meta.userAnswer || '',
        correctAnswer: meta.correctAnswer || card.word || '',
        errorType: meta.errorType || '',
      });
    }

    function generateTargetedQuiz(card, errorType) {
      const typeMap = {
        spelling: {
          instruction: `请拼写这个单词（不要看答案）：`,
          prompt: `给出「${card.word}」的3个拼写陷阱（容易混淆的地方）和记忆技巧，用中文简洁说明，每条一行。`,
        },
        meaning: {
          instruction: `请回忆这个词在财经语境中的精确含义：`,
          prompt: `解释「${card.word}」在财经英语中的精确含义，列出3个常见误解或混淆点，用中文说明。`,
        },
        colloc: {
          instruction: `请列举这个词最重要的3个固定搭配：`,
          prompt: `列出「${card.word}」最重要的5个财经英语固定搭配，每个搭配附带一句例句，用中英对照。`,
        },
        context: {
          instruction: `在财经新闻语境中，这个词传达什么语气或立场？`,
          prompt: `分析「${card.word}」在彭博/路透社报道中的典型语境和语气含义，举2-3个实例，用中文解释。`,
        },
        polysemy: {
          instruction: `这个词在金融语境 vs 普通语境下的含义有何不同？`,
          prompt: `对比「${card.word}」在日常英语和金融英语中的不同含义，用表格或对比列表形式，中英对照。`,
        },
      };
      return typeMap[errorType] || typeMap.meaning;
    }

    function showTargetedTraining(card, errorType) {
      const quiz = generateTargetedQuiz(card, errorType);
      const typeInfo = MISTAKE_ERROR_TYPES.find(t => t.id === errorType) || MISTAKE_ERROR_TYPES[1];
      const container = document.createElement('div');
      container.className = 'memory-card';
      container.style.cssText = 'margin-top:16px;padding:20px;border:2px solid var(--accent);border-radius:16px;background:var(--bg-card);';
      container.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <span style="font-size:24px;">${typeInfo.icon}</span>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--accent);">${typeInfo.label} · 针对性训练</div>
            <div style="font-size:12px;color:var(--text-muted);">${typeInfo.desc}</div>
          </div>
        </div>
        <div style="font-size:15px;font-weight:700;color:var(--text-main);margin-bottom:8px;">「${escapeHtml(card.word)}」</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;font-style:italic;">${quiz.instruction}</div>
        <div id="targetedTrainingOutput" style="min-height:60px;font-size:13px;line-height:1.7;color:var(--text-main);">
          <span style="opacity:.5">点击「开始训练」生成针对性讲解…</span>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-primary" id="btnStartTargetedTraining" style="font-size:13px;padding:8px 16px;">✦ 开始训练</button>
          <button class="btn-base" id="btnCloseTargetedTraining" style="font-size:13px;padding:8px 14px;">关闭</button>
        </div>`;
      const mistakeList = $('#mistakeList');
      if (mistakeList) mistakeList.prepend(container);
      container.querySelector('#btnCloseTargetedTraining').addEventListener('click', () => container.remove());
      container.querySelector('#btnStartTargetedTraining').addEventListener('click', async () => {
        const output = container.querySelector('#targetedTrainingOutput');
        const btn = container.querySelector('#btnStartTargetedTraining');
        if (!state.apiKey) { output.textContent = '请先在设置中配置 API Key'; return; }
        btn.disabled = true;
        btn.textContent = '生成中…';
        output.innerHTML = '<span style="opacity:.5">AI 生成针对性讲解中…</span>';
        try {
          const ctrl = new AbortController();
          await streamRequestProgressive(quiz.prompt, ctrl, full => {
            output.textContent = full;
          });
        } catch (e) {
          output.textContent = 'AI 生成失败：' + e.message;
        } finally {
          btn.disabled = false;
          btn.textContent = '✦ 重新生成';
        }
      });
    }

    function getMistakesByType(typeId) {
      return state.vocab.filter(v => v.errorTypes && v.errorTypes[typeId] > 0)
        .sort((a, b) => (b.errorTypes[typeId] || 0) - (a.errorTypes[typeId] || 0));
    }

    function renderMistakeTypeSummary(container) {
      if (!container) return;
      const summary = MISTAKE_ERROR_TYPES.map(t => {
        const count = getMistakesByType(t.id).length;
        return { ...t, count };
      }).filter(t => t.count > 0);
      if (!summary.length) return;
      const html = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
        ${summary.map(t => `
          <button class="fr-more-chip" data-error-type="${t.id}"
            style="display:flex;align-items:center;gap:6px;border-color:var(--accent);">
            <span>${t.icon}</span>
            <span>${t.label}</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;background:var(--accent);color:white;padding:1px 6px;border-radius:99px;">${t.count}</span>
          </button>`).join('')}
      </div>`;
      const div = document.createElement('div');
      div.innerHTML = html;
      div.querySelectorAll('[data-error-type]').forEach(btn => {
        btn.addEventListener('click', () => startMistakeTrainingByType(btn.dataset.errorType));
      });
      container.prepend(div);
    }

    function startMistakeTrainingByType(typeId) {
      const cards = getMistakesByType(typeId);
      const typeInfo = MISTAKE_ERROR_TYPES.find(t => t.id === typeId);
      if (!cards.length) { toast(`没有${typeInfo?.label || ''}错题`, 'info'); return; }
      state.trainingMode = 'mistakes';
      state.clozeDeckOverride = cards;
      launchTrainingMode('mistakes');
      toast(`已加载 ${cards.length} 张${typeInfo?.label || ''}错题`, 'success');
    }

    /* ============================================================
     *  MISTAKE BOOK — Error-type diagnosis & targeted 2nd-pass
     * ============================================================ */

    const MISTAKE_ERROR_TYPES = [
      {
        id: 'spelling',
        label: '拼写错误',
        desc: '写错字母或字母顺序，但知道意思',
        icon: '✏️',
        quizType: 'spelling',
        tip: '多做拼写默写，写3遍再测'
      },
      {
        id: 'meaning',
        label: '意思混淆',
        desc: '认识这个词但记错了含义',
        icon: '🔀',
        quizType: 'meaning',
        tip: '做含义选择题，对比近义词卡'
      },
      {
        id: 'collocation',
        label: '搭配不会',
        desc: '单词认识，但不知道怎么搭配使用',
        icon: '🔗',
        quizType: 'collocation',
        tip: '重点练例句中的搭配填空'
      },
      {
        id: 'context',
        label: '句中认不出',
        desc: '单独看认识，放在句子里就不认了',
        icon: '🔍',
        quizType: 'cloze',
        tip: '做原文挖空练习，练习语境识别'
      },
      {
        id: 'obscure',
        label: '熟词僻义',
        desc: '熟悉常见义，但不知道财经特殊含义',
        icon: '📚',
        quizType: 'meaning',
        tip: '重点记忆财经专项释义'
      },
    ];

    function getMistakesByType(typeId) {
      return mistakeCards().filter(c => {
        const tags = c.errorTags || [];
        if (typeId === 'spelling') return tags.includes('拼写错误');
        if (typeId === 'meaning') return tags.includes('意思混淆') || tags.includes('含义不熟');
        if (typeId === 'collocation') return tags.includes('搭配不会');
        if (typeId === 'context') return tags.includes('句中认不出');
        if (typeId === 'obscure') return tags.includes('熟词僻义');
        return false;
      });
    }

    function renderMistakeTypeSummary() {
      const box = $('#mistakeTypeSummary');
      if (!box) return;
      const all = mistakeCards();
      if (!all.length) { box.innerHTML = ''; return; }
      box.innerHTML = `<div class="mistake-type-grid">` +
        MISTAKE_ERROR_TYPES.map(t => {
          const count = getMistakesByType(t.id).filter(c => mistakeStatus(c) !== '已解决').length;
          return `<button class="mistake-type-chip ${count ? '' : 'zero'}" data-type="${t.id}" title="${t.tip}">
            <span class="mtc-icon">${t.icon}</span>
            <span class="mtc-label">${t.label}</span>
            <span class="mtc-count">${count}</span>
          </button>`;
        }).join('') +
        `</div>`;
      box.querySelectorAll('.mistake-type-chip').forEach(btn => {
        btn.addEventListener('click', () => startMistakeTrainingByType(btn.dataset.type));
      });
    }
    window.renderMistakeTypeSummary = renderMistakeTypeSummary;

    function startMistakeTrainingByType(typeId) {
      const typeInfo = MISTAKE_ERROR_TYPES.find(t => t.id === typeId);
      if (!typeInfo) return;
      const cards = getMistakesByType(typeId).filter(c => mistakeStatus(c) !== '已解决');
      if (!cards.length) { toast(`${typeInfo.label}：暂无待练词`, 'info'); return; }

      if (typeId === 'spelling') {
        state.trainingMode = 'mistakes';
        state.studyMode = 'spell';
        $$('.flip-mode-toggle button').forEach(b => b.classList.toggle('active', b.dataset.mode === 'spell'));
        enterReviewFocus();
        _pomo.active = true;
        _pomo.queue = [...cards].sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0)).slice(0, POMO_LIMIT);
        _pomo.idx = 0; _pomo.round = 1; _pomo.againQueue = [];
        _pomo.remaining = POMO_DURATION; _pomo.startedAt = null;
        state.flipIdx = 0;
        show('#pomoBar'); hide('#pomoStart');
        $('#pomoTimer').textContent = pomoFmt(_pomo.remaining);
        $('#pomoTimer').classList.remove('urgent');
        pomoUpdateProgress();
        renderFlipCard();
        toast(`拼写专项 · ${_pomo.queue.length} 词`, 'info');
        return;
      }
      if (typeId === 'context' && v68_clozeCards(cards).length) {
        state.clozeDeckOverride = cards;
        launchTrainingMode('cloze');
        return;
      }
      if ((typeId === 'meaning' || typeId === 'collocation' || typeId === 'obscure') && cards.some(c => (c.errorTags || []).length)) {
        v69_startTraining('diagnosis', cards);
        return;
      }
      startMistakeTraining(cards);
    }
    window.startMistakeTrainingByType = startMistakeTrainingByType;

    function generateTargetedQuiz(card) {
      const tags = card.errorTags || [];
      if (tags.includes('拼写错误')) {
        return {
          kind: 'spelling', card,
          prompt: `拼写默写：${card.translation || card.note || card.pos || ''}`,
          answer: card.word, input: true, reason: '拼写错误'
        };
      }
      if (tags.includes('搭配不会')) {
        const colloc = collocationItems(card)[0]?.phrase || '';
        if (colloc) {
          const blanked = colloc.replace(
            new RegExp(card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '_____'
          );
          return {
            kind: 'collocation', card,
            prompt: `搭配填空：${blanked}`,
            answer: card.word, input: true, reason: '搭配不会'
          };
        }
      }
      if (tags.includes('句中认不出')) {
        const source = card.sourceSentence || extractExample(card) || getWordHistory(card)[0]?.sentence || '';
        if (source) {
          return {
            kind: 'cloze', card,
            prompt: stripWordFromExample(card, source),
            answer: card.word, input: true, reason: '句中认不出'
          };
        }
      }
      if (tags.includes('意思混淆') || tags.includes('熟词僻义') || tags.includes('含义不熟')) {
        return {
          kind: 'meaning', card,
          prompt: `含义选择：${card.word}`,
          options: v69_pickMeaningOptions(card),
          answer: card.translation || card.note || '',
          reason: tags[0] || '意思混淆'
        };
      }
      return v69_questionForCard(card);
    }
    window.generateTargetedQuiz = generateTargetedQuiz;

    window.getMistakesByType = getMistakesByType;
    window.MISTAKE_ERROR_TYPES = MISTAKE_ERROR_TYPES;
