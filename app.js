const CATEGORY_STUDY_ORDER = {
  'Biologia': ['bio-09','bio-07','bio-05','bio-06','bio-08','bio-21','bio-22','bio-23','bio-24','bio-25','bio-10','bio-03','bio-11','bio-12','bio-13','bio-14','bio-16','bio-17','bio-19','bio-18','bio-20','bio-26','bio-01','bio-02','bio-04','bio-15'],
  'Química': ['qui-01','qui-02','qui-03','qui-04','qui-05','qui-06','qui-07','qui-08','qui-09','qui-10','qui-11','qui-12','qui-13','qui-14','qui-15','qui-16','qui-17','qui-18','qui-19','qui-20','qui-21','qui-22','qui-23','qui-24'],
  'Física': ['fis-15','fis-17','fis-16','fis-19','fis-20','fis-18','fis-11','fis-12','fis-14','fis-13','fis-09','fis-10','fis-06','fis-07','fis-08','fis-01','fis-02','fis-03','fis-04','fis-05'],
  'Geografia': ['geo-01','geo-02','geo-03','geo-04','geo-05','geo-06','geo-13','geo-14','geo-12','geo-08','geo-09','geo-10','geo-11','geo-07','geo-25','geo-26','geo-24','geo-17','geo-18','geo-19','geo-20','geo-21','geo-22','geo-23','geo-15','geo-16'],
  'Linguagens': ['lin-23','lin-01','lin-02','lin-06','lin-07','lin-08','lin-09','lin-04','lin-05','lin-03','lin-10','lin-14','lin-11','lin-12','lin-13','lin-15','lin-16','lin-17','lin-18','lin-20','lin-21','lin-19','lin-22'],
  'História': ['his-01','his-02','his-03','his-04','his-05','his-06','his-07','his-09','his-08','his-12','his-13','his-14','his-15','his-10','his-11','his-17','his-19','his-18','his-20','his-21','his-24','his-22','his-25','his-23','his-26','his-27','his-28','his-16'],
  'Matemática': ['mat-01','mat-02','mat-13','mat-03','mat-04','mat-05','mat-09','mat-06','mat-08','mat-14','mat-07','mat-11','mat-12','mat-15','mat-16','mat-17','mat-18','mat-19','mat-10','mat-20','mat-21','mat-22']
};

const App = {
  state: null,
  charts: {},
  currentWeek: 0,

  init() {
    this.loadState();
    this.initTheme();
    this.render();
    this.bindEvents();
  },

  loadState() {
    const saved = localStorage.getItem('estudoAppENEM');
    if (saved) {
      this.state = JSON.parse(saved);
    } else {
      this.state = this.getDefaultState();
      this.saveState();
    }
  },

  getDefaultState() {
    const now = new Date().toISOString();
    const topics = {};
    EXAM_DATA.categories.forEach(cat => {
      cat.topics.forEach(t => {
        topics[t.id] = {
          ...t,
          category: cat.name,
          timeSpent: 0,
          questionsAnswered: 0,
          questionsCorrect: 0,
          selfDifficulty: null,
          lastStudied: null,
          completed: false,
          studiedSubtopics: []
        };
      });
    });
    return {
      topics,
      config: { examDate: null, dailyHours: 0, studyDays: [1, 2, 3, 4, 5], lastAccess: null, trimmed: false, trimmedTopics: [] },
      streak: { count: 0, lastDate: null },
      firstAccess: now
    };
  },

  saveState() {
    localStorage.setItem('estudoAppENEM', JSON.stringify(this.state));
  },

  getConfig() {
    return this.state.config;
  },

  getTopics() {
    const result = [];
    EXAM_DATA.categories.forEach(cat => {
      cat.topics.forEach(t => {
        result.push(this.state.topics[t.id]);
      });
    });
    return result;
  },

  getTopicState(topicId) {
    return this.state.topics[topicId];
  },

  getElo(accuracy) {
    if (accuracy == null || isNaN(accuracy)) return ELO_THRESHOLDS[0];
    for (let i = ELO_THRESHOLDS.length - 1; i >= 0; i--) {
      if (accuracy >= ELO_THRESHOLDS[i].min) return ELO_THRESHOLDS[i];
    }
    return ELO_THRESHOLDS[0];
  },

  getEloForTopic(topicId) {
    const t = this.getTopicState(topicId);
    const acc = t.questionsAnswered > 0 ? (t.questionsCorrect / t.questionsAnswered) * 100 : null;
    return this.getElo(acc);
  },

  calcAccuracy(topicId) {
    const t = this.getTopicState(topicId);
    if (t.questionsAnswered === 0) return null;
    return (t.questionsCorrect / t.questionsAnswered) * 100;
  },

  calcCategoryStats() {
    const result = [];
    EXAM_DATA.categories.forEach(cat => {
      let totalEst = 0, totalCompleted = 0, totalQ = 0, totalC = 0, count = 0, completedCount = 0;
      cat.topics.forEach(t => {
        const ts = this.state.topics[t.id];
        totalEst += ts.estHours || t.estHours;
        if (ts.completed) {
          totalCompleted += ts.estHours || t.estHours;
          completedCount++;
        }
        totalQ += ts.questionsAnswered || 0;
        totalC += ts.questionsCorrect || 0;
        count++;
      });
      const acc = totalQ > 0 ? (totalC / totalQ) * 100 : null;
      result.push({
        name: cat.name,
        icon: cat.icon,
        info: cat.info,
        totalTopics: count,
        completedTopics: completedCount,
        totalEstHours: totalEst,
        completedEstHours: totalCompleted,
        progress: totalEst > 0 ? (totalCompleted / totalEst) * 100 : 0,
        questionsAnswered: totalQ,
        questionsCorrect: totalC,
        accuracy: acc
      });
    });
    return result;
  },

  getOverallProgress() {
    const cats = this.calcCategoryStats();
    let totalEst = 0, totalDone = 0;
    cats.forEach(c => { totalEst += c.totalEstHours; totalDone += c.completedEstHours; });
    return totalEst > 0 ? (totalDone / totalEst) * 100 : 0;
  },

  getProgressLevel(progress) {
    if (progress >= 90) return { name: 'Diamante', icon: '💎', color: '#00d4ff', bg: 'rgba(0,212,255,0.15)', glow: true };
    if (progress >= 75) return { name: 'Platina', icon: '⭐', color: '#e5e4e2', bg: 'rgba(229,228,226,0.15)', glow: false };
    if (progress >= 50) return { name: 'Ouro', icon: '🥇', color: '#FFD700', bg: 'rgba(255,215,0,0.15)', glow: false };
    if (progress >= 25) return { name: 'Prata', icon: '🥈', color: '#A8A8A8', bg: 'rgba(168,168,168,0.15)', glow: false };
    if (progress >= 10) return { name: 'Bronze', icon: '🥉', color: '#CD7F32', bg: 'rgba(205,127,50,0.15)', glow: false };
    return { name: 'Ferro', icon: '🪨', color: '#8B7355', bg: 'rgba(139,115,85,0.15)', glow: false };
  },

  getZonaRisco() {
    const now = new Date();
    const result = [];
    EXAM_DATA.categories.forEach(cat => {
      cat.topics.forEach(t => {
        const ts = this.state.topics[t.id];
        if (ts.lastStudied && ts.questionsAnswered > 0) {
          const acc = (ts.questionsCorrect / ts.questionsAnswered) * 100;
          if (acc >= 60) {
            const lastDate = new Date(ts.lastStudied);
            const daysDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
            if (daysDiff >= 15) {
              result.push({ ...ts, daysSinceStudy: daysDiff });
            }
          }
        }
      });
    });
    return result.sort((a, b) => b.daysSinceStudy - a.daysSinceStudy);
  },

  getFluencyAlerts() {
    const alerts = [];
    EXAM_DATA.categories.forEach(cat => {
      cat.topics.forEach(t => {
        const ts = this.state.topics[t.id];
        if (ts.selfDifficulty === 'easy' && ts.questionsAnswered >= 3) {
          const acc = (ts.questionsCorrect / ts.questionsAnswered) * 100;
          if (acc < 60) {
            alerts.push({
              topicId: ts.id,
              name: ts.name,
              category: cat.name,
              accuracy: acc,
              elo: this.getElo(acc).name
            });
          }
        }
      });
    });
    return alerts;
  },

  logStudy(topicId, hours, difficulty) {
    const ts = this.state.topics[topicId];
    ts.timeSpent = (ts.timeSpent || 0) + hours;
    ts.lastStudied = new Date().toISOString();
    if (difficulty) ts.selfDifficulty = difficulty;
    if (!ts.completed) {
      const estTotal = ts.estHours;
      if (ts.timeSpent >= estTotal) ts.completed = true;
    }
    this.checkDailyStreak();
    this.saveState();
    this.render();
  },

  logQuestions(topicId, correct, total) {
    const ts = this.state.topics[topicId];
    ts.questionsAnswered = (ts.questionsAnswered || 0) + total;
    ts.questionsCorrect = (ts.questionsCorrect || 0) + correct;
    ts.lastStudied = new Date().toISOString();
    this.checkDailyStreak();
    this.saveState();
    this.render();
  },

  checkDailyStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (this.state.streak.lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (this.state.streak.lastDate === yesterday) {
        this.state.streak.count++;
      } else if (this.state.streak.lastDate !== today) {
        this.state.streak.count = 1;
      }
      this.state.streak.lastDate = today;
    }
  },

  getStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (this.state.streak.lastDate === today) return this.state.streak.count;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (this.state.streak.lastDate === yesterday) return this.state.streak.count;
    return 0;
  },

  calcViability() {
    const cfg = this.getConfig();
    if (!cfg.examDate || !cfg.dailyHours) return null;

    const examDate = new Date(cfg.examDate);
    const today = new Date();
    const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntilExam <= 0) return { feasible: false, daysRemaining: 0, msg: 'A data da prova já passou!', cuts: [] };

    const topics = this.getTopics();
    let remainingHours = 0;
    const pendingTopics = [];
    topics.forEach(t => {
      if (!t.completed) {
        const remaining = Math.max(0, (t.estHours || 0) - (t.timeSpent || 0));
        remainingHours += remaining;
        pendingTopics.push({ ...t, remaining });
      }
    });

    const studyDaysArr = cfg.studyDays || [1, 2, 3, 4, 5];
    let studyDays = 0;
    const cursor = new Date(today);
    for (let i = 0; i < daysUntilExam; i++) {
      if (studyDaysArr.includes(cursor.getDay())) studyDays++;
      cursor.setDate(cursor.getDate() + 1);
    }
    const availableHours = cfg.dailyHours * studyDays;
    const feasible = remainingHours <= availableHours;

    const cuts = [];
    if (!feasible && remainingHours > 0) {
      const sorted = pendingTopics.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      let cumHours = 0;
      let targetHours = availableHours * 0.9;
      sorted.forEach(t => {
        if (cumHours + t.remaining <= targetHours) {
          cumHours += t.remaining;
          cuts.push({ ...t, keep: true });
        } else {
          cuts.push({ ...t, keep: false, cut: true });
        }
      });
    }

    return {
      feasible,
      daysRemaining: daysUntilExam,
      remainingHours: Math.round(remainingHours),
      availableHours: Math.round(availableHours),
      dailyHours: cfg.dailyHours,
      deficit: Math.round(remainingHours - availableHours),
      cuts: cuts.filter(c => c.cut)
    };
  },

  getYouTubeUrl(topicName) {
    const query = encodeURIComponent(topicName + ' aula');
    return `https://www.youtube.com/results?search_query=${query}`;
  },

  getRecurrenceData(category) {
    const data = [];
    EXAM_DATA.categories.forEach(cat => {
      if (category && cat.name !== category) return;
      cat.topics.forEach(t => {
        data.push({
          name: t.name,
          category: cat.name,
          icon: cat.icon,
          recurrenceScore: t.recurrenceScore || t.weight * 10 || 50
        });
      });
    });
    return data.sort((a, b) => b.recurrenceScore - a.recurrenceScore);
  },

  getTopicData(topicId) {
    for (const cat of EXAM_DATA.categories) {
      const t = cat.topics.find(t => t.id === topicId);
      if (t) return t;
    }
    return null;
  },

  getSubtopicNames(topicId) {
    for (const cat of EXAM_DATA.categories) {
      const t = cat.topics.find(t => t.id === topicId);
      if (t && t.subtopics) return t.subtopics;
    }
    return [];
  },

  getEloDistribution() {
    const dist = { Ferro: 0, Bronze: 0, Prata: 0, Ouro: 0, Desafiante: 0 };
    EXAM_DATA.categories.forEach(cat => {
      cat.topics.forEach(t => {
        const ts = this.state.topics[t.id];
        if (ts.questionsAnswered > 0) {
          const acc = (ts.questionsCorrect / ts.questionsAnswered) * 100;
          const elo = this.getElo(acc);
          dist[elo.name]++;
        }
      });
    });
    return dist;
  },

  getExamStats() {
    const topics = this.getTopics();
    let totalQ = 0, totalC = 0, studied = 0, completed = 0, totalHours = 0, spentHours = 0;
    topics.forEach(t => {
      if (t.questionsAnswered > 0) studied++;
      if (t.completed) completed++;
      totalQ += t.questionsAnswered || 0;
      totalC += t.questionsCorrect || 0;
      totalHours += t.estHours || 0;
      spentHours += t.timeSpent || 0;
    });
    return {
      totalTopics: topics.length,
      studied,
      completed,
      totalQ,
      totalC,
      accuracy: totalQ > 0 ? (totalC / totalQ) * 100 : null,
      totalHours,
      spentHours,
      progress: totalHours > 0 ? (completed / topics.length) * 100 : 0
    };
  },

  bindEvents() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      switch (action) {
        case 'tab':
          this.switchTab(btn.dataset.tab);
          break;
        case 'open-modal':
          this.openModal(btn.dataset.modal, btn.dataset.topic);
          break;
        case 'close-modal':
          this.closeModal();
          break;
        case 'overlay-click':
          if (e.target.classList.contains('modal-overlay')) this.closeModal();
          break;
        case 'log-questions':
          this.handleLogQuestions(btn);
          break;
        case 'crono-log-questions':
          this.handleCronoLogQuestions(btn);
          break;
        case 'set-difficulty':
          this.handleSetDifficulty(btn);
          break;
        case 'youtube':
          window.open(this.getYouTubeUrl(btn.dataset.topic), '_blank');
          break;
        case 'toggle-theme':
          this.toggleTheme();
          break;
        case 'save-config':
          this.handleSaveConfig(btn);
          break;
        case 'reset':
          if (confirm('Tem certeza? Todo progresso será perdido.')) {
            this.state = this.getDefaultState();
            this.saveState();
            this.render();
          }
          break;
        case 'start-study':
          e.preventDefault();
          document.querySelector('[data-tab="assuntos"]')?.click();
          break;
        case 'toggle-subtopics':
          const subEl = document.getElementById('sub-' + btn.dataset.topic);
          if (subEl) subEl.classList.toggle('open');
          break;
        case 'clear-subtopics':
          if (confirm('Limpar todos os subtópicos marcados deste tópico?')) {
            const clearTs = this.state.topics[btn.dataset.topic];
            if (clearTs) {
              clearTs.studiedSubtopics = [];
              this.saveState();
              this.render();
            }
          }
          break;
        case 'reset-topic':
          if (confirm('Tem certeza? Todo progresso neste tópico será perdido.')) {
            const resetId = btn.closest('.modal-overlay').dataset.topic;
            const resetTs = this.state.topics[resetId];
            if (resetTs) {
              resetTs.timeSpent = 0;
              resetTs.questionsAnswered = 0;
              resetTs.questionsCorrect = 0;
              resetTs.selfDifficulty = null;
              resetTs.lastStudied = null;
              resetTs.completed = false;
              resetTs.studiedSubtopics = [];
              this.saveState();
              this.closeModal();
              this.render();
            }
          }
          break;
        case 'trim-cronograma':
          {
            const removed = this.trimCronograma();
            if (removed.length > 0) {
              const names = removed.map(t => t.name).join(', ');
              alert(`✂️ ${removed.length} tópico(s) removido(s) do cronograma por baixa prioridade:\n\n${names}\n\nVocê pode restaurá-los depois clicando em "Restaurar todos".`);
            } else {
              alert('✅ Todos os tópicos cabem no tempo disponível. Nenhum ajuste necessário.');
            }
            this.render();
          }
          break;
        case 'restore-trimmed':
          this.state.config.trimmed = false;
          this.state.config.trimmedTopics = [];
          this.saveState();
          this.render();
          break;
        case 'crono-nav':
          if (btn.disabled) break;
          this.currentWeek = (this.currentWeek || 0) + parseInt(btn.dataset.dir);
          this.renderCronograma();
          break;
        case 'toggle-subtopic':
          setTimeout(() => {
            const cb = btn.querySelector('input[type="checkbox"]');
            const newChecked = cb ? cb.checked : false;
            const topicId = btn.dataset.topic;
            const ts = this.state.topics[topicId];
            if (!ts) return;
            if (!ts.studiedSubtopics) ts.studiedSubtopics = [];
            const idx = ts.studiedSubtopics.indexOf(btn.dataset.subtopic);
            if (newChecked) {
              if (idx === -1) ts.studiedSubtopics.push(btn.dataset.subtopic);
            } else {
              if (idx !== -1) ts.studiedSubtopics.splice(idx, 1);
            }
            const subs = this.getSubtopicNames(topicId);
            const allDone = subs.length > 0 && subs.every(s => ts.studiedSubtopics.indexOf(s) !== -1);
            ts.completed = allDone;
            this.saveState();
            const span = btn.querySelector('span');
            if (span) span.classList.toggle('studied', newChecked);
            this.render();
          }, 0);
          break;
        case 'toggle-subtopic-crono':
          setTimeout(() => {
            const cb = btn.querySelector('input[type="checkbox"]');
            const newChecked = cb ? cb.checked : false;
            const topicId2 = btn.dataset.topic;
            const ts2 = this.state.topics[topicId2];
            if (!ts2) return;
            if (!ts2.studiedSubtopics) ts2.studiedSubtopics = [];
            const idx2 = ts2.studiedSubtopics.indexOf(btn.dataset.subtopic);
            if (newChecked) {
              if (idx2 === -1) ts2.studiedSubtopics.push(btn.dataset.subtopic);
            } else {
              if (idx2 !== -1) ts2.studiedSubtopics.splice(idx2, 1);
            }
            const subs2 = this.getSubtopicNames(topicId2);
            const allDone2 = subs2.length > 0 && subs2.every(s => ts2.studiedSubtopics.indexOf(s) !== -1);
            ts2.completed = allDone2;
            this.saveState();
            const span2 = btn.querySelector('span');
            if (span2) span2.classList.toggle('studied', newChecked);
            this.render();
          }, 0);
          break;
      }
    });

    document.addEventListener('submit', e => {
      if (e.target.id === 'viability-form') {
        e.preventDefault();
        this.handleViability();
      }
    });
  },

  switchTab(tabId) {
    document.querySelectorAll('.tabs-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
    const content = document.getElementById(`tab-${tabId}`);
    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    if (content) content.classList.add('active');
    if (btn) btn.classList.add('active');
    this.renderTabContent(tabId);
  },

  renderTabContent(tabId) {
    if (tabId === 'dashboard') {
      this.renderDashboard();
    } else if (tabId === 'assuntos') {
      this.renderTopics();
    } else if (tabId === 'cronograma') {
      this.renderCronograma();
    }
  },

  openModal(modalId, topicId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('open');

    if (modalId === 'config-modal') {
      const cfg = this.getConfig();
      const dateInput = document.getElementById('exam-date');
      const hoursInput = document.getElementById('exam-hours');
      const dayCbs = document.querySelectorAll('.exam-day');
      if (dateInput) dateInput.value = cfg.examDate || '';
      if (hoursInput) hoursInput.value = cfg.dailyHours || '';
      const studyDays = cfg.studyDays || [1, 2, 3, 4, 5];
      dayCbs.forEach(cb => { cb.checked = studyDays.includes(parseInt(cb.value)); });
      return;
    }

    if (modalId === 'crono-subtopic-modal' && topicId) {
      modal.dataset.topic = topicId;
      const ts = this.state.topics[topicId];
      const topicData = this.getTopicData(topicId);
      document.getElementById('crono-subtopic-name').textContent = ts.name;
      document.getElementById('crono-subtopic-category').textContent = `${EXAM_DATA.icon} ${ts.category}`;

      // Subtopics checklist
      const subs = this.getSubtopicNames(topicId);
      const studiedSet = new Set(ts.studiedSubtopics || []);
      const list = document.getElementById('crono-subtopic-list');
      if (subs.length === 0) {
        list.innerHTML = '<p style="color:var(--text2)">Este tópico não possui subtópicos detalhados.</p>';
      } else {
        list.innerHTML = `<ul class="subtopic-list">
          ${subs.map(s => `<li>
            <label data-action="toggle-subtopic-crono" data-topic="${topicId}" data-subtopic="${s}">
              <input type="checkbox" ${studiedSet.has(s) ? 'checked' : ''}>
              <span class="${studiedSet.has(s) ? 'studied' : ''}">${s}</span>
            </label>
          </li>`).join('')}
        </ul>
        <button class="btn btn-outline btn-sm" style="margin-top:8px" data-action="clear-subtopics" data-topic="${topicId}">✕ Limpar marcados</button>`;
      }

      // Elo + questions preview + fluency alert
      const acc = this.calcAccuracy(topicId);
      const elo = this.getEloForTopic(topicId);
      document.getElementById('crono-subtopic-elo').innerHTML = `Elo atual: <span class="elo-badge" style="background:${elo.color}22;color:${elo.color}">${elo.icon} ${elo.name}</span>`;

      const qPrev = document.getElementById('crono-subtopic-questions-preview');
      if (ts.questionsAnswered > 0) {
        qPrev.innerHTML = `<span style="font-size:0.85rem;color:var(--text2)">Questões feitas: ${ts.questionsAnswered} | Acertos: ${ts.questionsCorrect} (${(acc || 0).toFixed(1)}%)</span>`;
      } else {
        qPrev.innerHTML = `<span style="font-size:0.85rem;color:var(--text2)">Nenhuma questão registrada ainda.</span>`;
      }

      this.renderFluencyAlertFor('crono-subtopic-fluency-alert', topicId);

      // Difficulty buttons
      const diffBtns = modal.querySelectorAll('.difficulty-btn');
      diffBtns.forEach(b => b.classList.remove('selected'));
      if (ts.selfDifficulty) {
        const selected = modal.querySelector(`.difficulty-btn.${ts.selfDifficulty}`);
        if (selected) selected.classList.add('selected');
      }

      // Clear question inputs
      const qCorrect = document.getElementById('crono-q-correct');
      const qTotal = document.getElementById('crono-q-total');
      if (qCorrect) qCorrect.value = '';
      if (qTotal) qTotal.value = '';

      // YouTube button
      const ytBtn = modal.querySelector('[data-action="youtube"]');
      if (ytBtn) ytBtn.dataset.topic = ts.name;

      return;
    }

    if (topicId) {
      modal.dataset.topic = topicId;
      const ts = this.state.topics[topicId];
      document.getElementById('modal-topic-name').textContent = `${ts.name}`;
      document.getElementById('modal-topic-category').textContent = `${EXAM_DATA.icon} ${ts.category}`;
      const diffBtns = modal.querySelectorAll('.difficulty-btn');
      diffBtns.forEach(b => b.classList.remove('selected'));
      if (ts.selfDifficulty) {
        const selected = modal.querySelector(`.difficulty-btn.${ts.selfDifficulty}`);
        if (selected) selected.classList.add('selected');
      }

      document.getElementById('q-correct').value = '';
      document.getElementById('q-total').value = '';

      const acc = this.calcAccuracy(topicId);
      const elo = this.getEloForTopic(topicId);
      document.getElementById('modal-current-elo').innerHTML = `Elo atual: <span class="elo-badge" style="background:${elo.color}22;color:${elo.color}">${elo.icon} ${elo.name}</span>`;

      this.renderFluencyAlert(topicId);
      this.updateQuestionsPreview(topicId);

      const ytBtn = modal.querySelector('[data-action="youtube"]');
      if (ytBtn) ytBtn.dataset.topic = ts.name;
    }
  },

  closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('open'));
  },

  renderFluencyAlertFor(containerId, topicId) {
    const container = document.getElementById(containerId);
    const ts = this.state.topics[topicId];
    if (!container || !ts) return;
    if (ts.selfDifficulty === 'easy' && ts.questionsAnswered >= 3) {
      const acc = (ts.questionsCorrect / ts.questionsAnswered) * 100;
      if (acc < 60) {
        container.innerHTML = `<div class="fluency-alert danger">⚠️ Ilusão de Fluência! Você marcou como <strong>Fácil</strong> mas sua taxa de acerto é de <strong>${acc.toFixed(1)}%</strong> (${this.getElo(acc).name}). Reveja este tópico!</div>`;
        return;
      }
    }
    if (ts.selfDifficulty) {
      container.innerHTML = `<div class="fluency-alert success">✅ Autoavaliação registrada: <strong>${ts.selfDifficulty === 'easy' ? 'Fácil' : ts.selfDifficulty === 'medium' ? 'Médio' : 'Difícil'}</strong></div>`;
    } else {
      container.innerHTML = '';
    }
  },

  renderFluencyAlert(topicId) {
    const container = document.getElementById('fluency-alert');
    const ts = this.state.topics[topicId];
    if (!container || !ts) return;
    if (ts.selfDifficulty === 'easy' && ts.questionsAnswered >= 3) {
      const acc = (ts.questionsCorrect / ts.questionsAnswered) * 100;
      if (acc < 60) {
        container.innerHTML = `<div class="fluency-alert danger">⚠️ Ilusão de Fluência! Você marcou como <strong>Fácil</strong> mas sua taxa de acerto é de <strong>${acc.toFixed(1)}%</strong> (${this.getElo(acc).name}). Reveja este tópico!</div>`;
        return;
      }
    }
    if (ts.selfDifficulty) {
      container.innerHTML = `<div class="fluency-alert success">✅ Autoavaliação registrada: <strong>${ts.selfDifficulty === 'easy' ? 'Fácil' : ts.selfDifficulty === 'medium' ? 'Médio' : 'Difícil'}</strong></div>`;
    } else {
      container.innerHTML = '';
    }
  },

  initTheme() {
    const saved = localStorage.getItem('estudoAppENEM-theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      const btn = document.querySelector('.theme-toggle');
      if (btn) btn.textContent = '☀️';
    }
  },

  toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    if (isDark) {
      html.removeAttribute('data-theme');
      localStorage.setItem('estudoAppENEM-theme', 'light');
    } else {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('estudoAppENEM-theme', 'dark');
    }
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = isDark ? '🌙' : '☀️';
  },

  updateQuestionsPreview(topicId) {
    const ts = this.state.topics[topicId];
    const el = document.getElementById('questions-preview');
    if (!el) return;
    if (ts.questionsAnswered > 0) {
      const acc = (ts.questionsCorrect / ts.questionsAnswered) * 100;
      el.innerHTML = `<span style="font-size:0.85rem;color:var(--text2)">Questões feitas: ${ts.questionsAnswered} | Acertos: ${ts.questionsCorrect} (${acc.toFixed(1)}%)</span>`;
    } else {
      el.innerHTML = `<span style="font-size:0.85rem;color:var(--text2)">Nenhuma questão registrada ainda.</span>`;
    }
  },

  handleLogQuestions(btn) {
    const modal = btn.closest('.modal-overlay');
    const topicId = modal.dataset.topic;
    const correct = parseInt(document.getElementById('q-correct').value) || 0;
    const total = parseInt(document.getElementById('q-total').value) || 0;
    if (total <= 0 || correct < 0 || correct > total) return;
    this.logQuestions(topicId, correct, total);
    this.updateStudyUI(topicId);
  },

  handleCronoLogQuestions(btn) {
    const modal = btn.closest('.modal-overlay');
    const topicId = modal.dataset.topic;
    const correct = parseInt(document.getElementById('crono-q-correct').value) || 0;
    const total = parseInt(document.getElementById('crono-q-total').value) || 0;
    if (total <= 0 || correct < 0 || correct > total) return;
    this.logQuestions(topicId, correct, total);
    this.updateCronoStudyUI(topicId);
  },

  updateCronoStudyUI(topicId) {
    const ts = this.state.topics[topicId];
    const modal = document.getElementById('crono-subtopic-modal');
    if (modal && modal.classList.contains('open')) {
      const acc = this.calcAccuracy(topicId);
      const elo = this.getEloForTopic(topicId);
      document.getElementById('crono-subtopic-elo').innerHTML = `Elo atual: <span class="elo-badge" style="background:${elo.color}22;color:${elo.color}">${elo.icon} ${elo.name}</span>`;
      const qPrev = document.getElementById('crono-subtopic-questions-preview');
      if (ts.questionsAnswered > 0) {
        qPrev.innerHTML = `<span style="font-size:0.85rem;color:var(--text2)">Questões feitas: ${ts.questionsAnswered} | Acertos: ${ts.questionsCorrect} (${(acc || 0).toFixed(1)}%)</span>`;
      } else {
        qPrev.innerHTML = `<span style="font-size:0.85rem;color:var(--text2)">Nenhuma questão registrada ainda.</span>`;
      }
      this.renderFluencyAlertFor('crono-subtopic-fluency-alert', topicId);
    }
    this.render();
  },

  handleSetDifficulty(btn) {
    const modal = btn.closest('.modal-overlay');
    const topicId = modal.dataset.topic;
    const difficulty = btn.dataset.value;
    modal.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const ts = this.state.topics[topicId];
    ts.selfDifficulty = difficulty;
    this.saveState();
    if (modal.id === 'study-modal') {
      this.renderFluencyAlert(topicId);
    } else {
      this.renderFluencyAlertFor('crono-subtopic-fluency-alert', topicId);
    }
  },

  updateStudyUI(topicId) {
    const ts = this.state.topics[topicId];
    const modal = document.querySelector('.modal-overlay.open');
    if (modal) {
      const acc = this.calcAccuracy(topicId);
      const elo = this.getEloForTopic(topicId);
      document.getElementById('modal-current-elo').innerHTML = `Elo atual: <span class="elo-badge" style="background:${elo.color}22;color:${elo.color}">${elo.icon} ${elo.name}</span>`;
      this.renderFluencyAlert(topicId);
      this.updateQuestionsPreview(topicId);
    }
    this.render();
  },

  handleSaveConfig(btn) {
    const date = document.getElementById('exam-date').value;
    const hours = parseFloat(document.getElementById('exam-hours').value) || 0;
    const dayCbs = document.querySelectorAll('.exam-day:checked');
    this.state.config.examDate = date || null;
    this.state.config.dailyHours = hours;
    this.state.config.studyDays = Array.from(dayCbs).map(cb => parseInt(cb.value)).sort();
    this.saveState();
    this.closeModal();
    this.render();
  },

  handleViability() {
    const result = this.calcViability();
    const container = document.getElementById('viability-result');
    if (!result) {
      container.innerHTML = `<div class="viability-result" style="background:var(--surface2);color:var(--text2)">Configure a data da prova e horas diárias no painel de configurações.</div>`;
      return;
    }
    const cfg = this.getConfig();
    if (result.feasible) {
      container.innerHTML = `
        <div class="viability-result ok">
          ✅ <span class="highlight">Viável!</span> Faltam ${result.daysRemaining} dias.<br>
          ⏱ Você precisa de <strong>${result.remainingHours}h</strong> e tem disponíveis <strong>${result.availableHours}h</strong> (${cfg.dailyHours}h/dia, ${(cfg.studyDays || [1,2,3,4,5]).length} dias/semana).<br>
          📊 Estude ${Math.round(result.remainingHours / result.daysRemaining)}h por dia para cobrir tudo.
        </div>`;
    } else {
      let cutsHtml = '';
      if (result.cuts.length > 0) {
        cutsHtml = `<div class="cut-suggestion"><strong>✂️ Sugestão de corte:</strong> Foque apenas nos assuntos de maior peso (${result.cuts.length} tópicos sugeridos para deixar de lado):<br>`;
        result.cuts.slice(0, 10).forEach(c => {
          cutsHtml += `<span class="topic-rec">${c.name}</span> (peso ${c.weight}), `;
        });
        cutsHtml = cutsHtml.slice(0, -2) + '</div>';
      }
      container.innerHTML = `
        <div class="viability-result not-ok">
          ❌ <span class="highlight">Inviável no prazo!</span> Faltam ${result.daysRemaining} dias.<br>
          ⏱ Necessário: <strong>${result.remainingHours}h</strong> | Disponível: <strong>${result.availableHours}h</strong> (${cfg.dailyHours}h/dia, ${(cfg.studyDays || [1,2,3,4,5]).length} dias/semana)<br>
          📈 Déficit de <strong>${result.deficit}h</strong>. Aumente para ${Math.ceil(result.remainingHours / result.daysRemaining)}h/dia ou estenda o prazo.
        </div>
        ${cutsHtml}
        <div style="margin-top:12px;text-align:center">
          <button class="btn btn-primary" data-action="trim-cronograma" style="background:var(--accent);color:#fff;padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-size:0.95rem">🔧 Ajustar cronograma automaticamente (remover tópicos menos importantes)</button>
        </div>`;
    }
  },

  calculateTopicImportance(topicId) {
    const ts = this.state.topics[topicId];
    if (!ts) return 0;
    const w = ts.weight || 0;
    const r = ts.recurrenceScore || 0;
    return w * r;
  },

  trimCronograma() {
    const cfg = this.getConfig();
    if (!cfg.examDate || !cfg.dailyHours) return [];

    const examDate = new Date(cfg.examDate);
    const today = new Date();
    const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    const studyDaysArr = cfg.studyDays || [1, 2, 3, 4, 5];
    let studyDays = 0;
    const cursor = new Date(today);
    for (let i = 0; i < daysUntilExam; i++) {
      if (studyDaysArr.includes(cursor.getDay())) studyDays++;
      cursor.setDate(cursor.getDate() + 1);
    }
    const totalAvailableHours = cfg.dailyHours * studyDays;

    const allTopics = [];
    for (const cat of EXAM_DATA.categories) {
      for (const t of cat.topics) {
        const ts = this.state.topics[t.id];
        const remaining = Math.max(0, (t.estHours || 0) - (ts.timeSpent || 0));
        allTopics.push({
          id: t.id,
          name: t.name,
          category: cat.name,
          estHours: t.estHours,
          remainingHours: remaining,
          weight: t.weight || 0,
          recurrenceScore: t.recurrenceScore || 0,
          importance: this.calculateTopicImportance(t.id)
        });
      }
    }

    const totalNeededHours = allTopics.reduce((s, t) => s + t.remainingHours, 0);
    if (totalNeededHours <= totalAvailableHours) {
      this.state.config.trimmed = false;
      this.state.config.trimmedTopics = [];
      this.saveState();
      return [];
    }

    const sorted = [...allTopics].sort((a, b) => a.importance - b.importance);
    let currentTotal = totalNeededHours;
    const removed = [];
    for (const topic of sorted) {
      if (currentTotal <= totalAvailableHours) break;
      if (topic.remainingHours <= 0) continue;
      currentTotal -= topic.remainingHours;
      removed.push(topic);
    }

    this.state.config.trimmed = true;
    this.state.config.trimmedTopics = removed.map(t => t.id);
    this.saveState();
    return removed;
  },

  generateCronograma() {
    const cfg = this.getConfig();
    if (!cfg.examDate || !cfg.dailyHours) return [];

    const dailyHours = cfg.dailyHours;
    const dpw = (cfg.studyDays || [1,2,3,4,5]).length;
    const numSubjects = EXAM_DATA.categories.length; // all subjects each week

    // Build per-category queues (ordered by prerequisites)
    const trimmedSet = new Set(cfg.trimmedTopics || []);
    const queues = EXAM_DATA.categories.map(cat => {
      const order = CATEGORY_STUDY_ORDER[cat.name] || [];
      const sorted = [...cat.topics].sort((a, b) => {
        const ai = order.indexOf(a.id);
        const bi = order.indexOf(b.id);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
      const items = sorted.map(t => {
        const ts = this.state.topics[t.id];
        const remaining = Math.max(0, (t.estHours || 0) - (ts.timeSpent || 0));
        return {
          id: t.id, name: t.name,
          category: cat.name, categoryIcon: cat.icon,
          estHours: t.estHours, recurrenceScore: t.recurrenceScore,
          remainingHours: remaining,
          subtopics: t.subtopics || [],
          timeSpent: ts.timeSpent || 0,
          questionsAnswered: ts.questionsAnswered || 0,
          questionsCorrect: ts.questionsCorrect || 0,
          selfDifficulty: ts.selfDifficulty || null,
          lastStudied: ts.lastStudied || null,
          completed: ts.completed || false,
          studiedSubtopics: ts.studiedSubtopics || []
        };
      }).filter(t => !trimmedSet.has(t.id));
      return { name: cat.name, icon: cat.icon, items, pointer: 0 };
    });

    if (queues.every(q => q.pointer >= q.items.length)) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeks = [];

    for (let weekIdx = 0; weekIdx < 104; weekIdx++) {
      if (queues.every(q => q.pointer >= q.items.length)) break;

      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + weekIdx * 7 + 1);
      const weeklyCap = dailyHours * dpw;
      const pool = [];
      let poolHours = 0;

      // Round-robin through ALL subjects: one topic per subject per pass
      let changed = true;
      while (changed && poolHours < weeklyCap - 0.25) {
        changed = false;
        for (let si = 0; si < numSubjects; si++) {
          const q = queues[si];
          if (q.pointer < q.items.length) {
            const t = q.items[q.pointer];
            if (poolHours + t.remainingHours <= weeklyCap + 0.1) {
              pool.push(t);
              poolHours += t.remainingHours;
              q.pointer++;
              changed = true;
            }
          }
        }
      }

      // Force-include at least one topic even if it exceeds weekly cap
      if (pool.length === 0) {
        for (let si = 0; si < numSubjects; si++) {
          const q = queues[si];
          if (q.pointer < q.items.length) {
            pool.push(q.items[q.pointer]);
            poolHours += q.items[q.pointer].remainingHours;
            q.pointer++;
            break;
          }
        }
      }

      // Distribute across study days respecting daily limits (best-fit)
      const studyDaysArr = cfg.studyDays || [1, 2, 3, 4, 5];
      const days = [];
      const weekDate = new Date(weekStart);
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekDate);
        dayDate.setDate(weekDate.getDate() + d);
        if (studyDaysArr.includes(dayDate.getDay())) {
          days.push({ dayOfWeek: dayDate.getDay(), date: dayDate, topics: [], hoursUsed: 0 });
        }
      }

      const unassigned = [...pool];
      for (let dayIdx = 0; dayIdx < days.length && unassigned.length > 0; dayIdx++) {
        const day = days[dayIdx];
        let dayRemaining = dailyHours;
        let i = 0;
        while (i < unassigned.length && dayRemaining > 0.25) {
          if (unassigned[i].remainingHours <= dayRemaining + 0.1) {
            day.topics.push(unassigned[i]);
            dayRemaining -= unassigned[i].remainingHours;
            day.hoursUsed = Math.round((dailyHours - dayRemaining) * 10) / 10;
            unassigned.splice(i, 1);
          } else i++;
        }
      }

      unassigned.forEach(t => {
        let bestDay = 0, minLoad = Infinity;
        for (let i = 0; i < days.length; i++) {
          if (days[i].hoursUsed < minLoad) { minLoad = days[i].hoursUsed; bestDay = i; }
        }
        days[bestDay].topics.push(t);
        days[bestDay].hoursUsed = Math.round((days[bestDay].hoursUsed + t.remainingHours) * 10) / 10;
      });

      weeks.push({ week: weekIdx + 1, startDate: weekStart, days });
    }

    return weeks;
  },

  renderCronograma() {
    const container = document.getElementById('tab-cronograma');
    if (!container || !container.classList.contains('active')) return;

    const cfg = this.getConfig();
    if (!cfg.examDate || !cfg.dailyHours) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📋</div><h3>Configure sua prova primeiro</h3><p>Vá em <strong>Assuntos</strong> e clique em "Configurar Prova" para definir a data e horas diárias.</p></div>`;
      return;
    }

    const examDate = new Date(cfg.examDate);
    const today = new Date();
    const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    const weeks = this.generateCronograma();
    const totalDays = weeks.reduce((s, w) => s + w.days.filter(d => d.topics.length > 0).length, 0);

    if (this.currentWeek === undefined) this.currentWeek = 0;
    if (this.currentWeek >= weeks.length) this.currentWeek = Math.max(0, weeks.length - 1);
    if (this.currentWeek < 0) this.currentWeek = 0;

    const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dpw = (cfg.studyDays || [1,2,3,4,5]).length;

    let html = `
      <div class="dashboard-welcome">
        <h1>📋 Cronograma Semanal</h1>
        <p>${cfg.dailyHours}h/dia • ${dpw} dias/semana • ${daysUntilExam} dias até prova • ${weeks.length} semanas no total</p>
      </div>

      <div class="crono-legend">
        <span class="crono-legend-item"><span class="crono-dot completed"></span> Concluído</span>
        <span class="crono-legend-item"><span class="crono-dot pending"></span> Pendente</span>
        <span class="crono-legend-item"><span class="crono-dot in-progress"></span> Em andamento</span>
      </div>
    `;

    if (totalDays > daysUntilExam || totalDays > dpw * weeks.length) {
      const maxPossible = Math.min(daysUntilExam, dpw * weeks.length);
      html += `<div class="alert-bar danger">⚠️ O cronograma precisa de ${totalDays} dias, mas você só tem ${maxPossible} dias de estudo disponíveis (${cfg.dailyHours}h/dia, ${dpw} dias/semana). Aumente as horas ou dias.</div>`;
    }

    if (cfg.trimmed && cfg.trimmedTopics && cfg.trimmedTopics.length > 0) {
      const trimmedNames = cfg.trimmedTopics.map(id => {
        const ts = this.state.topics[id];
        return ts ? ts.name : id;
      }).join(', ');
      html += `<div class="alert-bar info" style="background:var(--surface2);border-left:4px solid var(--accent)">✂️ Cronograma ajustado automaticamente. Tópicos removidos por baixa prioridade: <strong>${trimmedNames}</strong>. <button class="btn btn-outline btn-sm" data-action="restore-trimmed" style="margin-left:8px">↩ Restaurar todos</button></div>`;
    }

    if (weeks.length > 0) {
      const w = weeks[this.currentWeek];
      const weekEnd = new Date(w.startDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const dateRange = `${w.startDate.toLocaleDateString('pt-BR')} — ${weekEnd.toLocaleDateString('pt-BR')}`;

      html += `<div class="crono-slide-container">
        <div class="crono-slide-nav">
          <button class="crono-nav-btn" data-action="crono-nav" data-dir="-1" ${this.currentWeek === 0 ? 'disabled' : ''}>◀ Anterior</button>
          <div class="crono-slide-info">
            <span class="crono-slide-week">Semana ${w.week}</span>
            <span class="crono-slide-date">${dateRange}</span>
            <span class="crono-slide-counter">${this.currentWeek + 1} de ${weeks.length}</span>
          </div>
          <button class="crono-nav-btn" data-action="crono-nav" data-dir="1" ${this.currentWeek >= weeks.length - 1 ? 'disabled' : ''}>Próximo ▶</button>
        </div>

        <div class="crono-slide-body">
        <table class="crono-table">
          <thead>
            <tr><th class="crono-th-day">Dia</th><th>Matérias para Estudar</th><th class="crono-th-hours">Horas</th></tr>
          </thead>
          <tbody>`;

      w.days.forEach(d => {
        const dayName = DAY_NAMES[d.date.getDay()];
        const dateStr = d.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' });
        const isToday = d.date.toDateString() === today.toDateString();

        let topicsHtml = '';
        let totalDayHours = 0;

        d.topics.forEach(t => {
          totalDayHours += t.remainingHours;
          let statusClass = 'pending';
          const subsList = t.subtopics || [];
          const studiedList = t.studiedSubtopics || [];
          if (subsList.length > 0 && studiedList.length >= subsList.length) statusClass = 'completed';
          else if (studiedList.length > 0) statusClass = 'in-progress';
          else if (t.completed) statusClass = 'completed';
          else if ((t.timeSpent || 0) > 0) statusClass = 'in-progress';

          const subs = subsList.length > 0
            ? subsList.slice(0, 4).join(' • ')
            : '';

          topicsHtml += `<div class="crono-cell-topic ${statusClass}" onclick="App.openModal('crono-subtopic-modal','${t.id}')">
            <span class="crono-cell-icon">${t.categoryIcon}</span>
            <span class="crono-cell-name">${t.name}</span>
            ${subs ? `<span class="crono-cell-subs">${subs}${t.subtopics.length > 4 ? ' …' : ''}</span>` : ''}
            <span class="crono-cell-hours">${t.remainingHours.toFixed(1)}h</span>
          </div>`;
        });

        if (!topicsHtml) topicsHtml = '<span class="crono-empty">—</span>';

        const barPct = Math.min(100, (totalDayHours / cfg.dailyHours) * 100);

        html += `<tr class="${isToday ? 'crono-today-row' : ''}">
          <td class="crono-td-day"><div class="crono-day-label">${dayName}</div><div class="crono-day-date-label">${dateStr}</div></td>
          <td class="crono-td-topics">${topicsHtml}</td>
          <td class="crono-td-hours">
            <div class="crono-cell-hours-bar">
              <div class="crono-cell-hours-fill" style="width:${barPct}%"></div>
            </div>
            <span class="crono-cell-hours-text">${totalDayHours.toFixed(1)}h / ${cfg.dailyHours}h</span>
          </td>
        </tr>`;
      });

      html += `</tbody></table></div></div>`;
    } else {
      html += `<div class="empty-state"><div class="icon">✅</div><h3>Todos os tópicos concluídos!</h3><p>Não há pendências para o cronograma.</p></div>`;
    }

    container.innerHTML = html;
  },

  render() {
    try {
      this.renderHeader();
      this.renderZonaRisco();
      this.renderDashboard();
      this.renderTopics();
      this.renderCronograma();
    } catch (e) {
      console.error('Render error:', e);
    }
  },

  renderHeader() {
    const streak = this.getStreak();
    const stats = this.getExamStats();

    document.getElementById('streak-count').textContent = streak;
    document.getElementById('streak-display').style.display = streak > 0 ? 'inline-flex' : 'none';

    const overallAcc = stats.accuracy !== null ? stats.accuracy.toFixed(1) : '—';
    document.getElementById('header-accuracy').textContent = `${overallAcc}%`;

    document.getElementById('header-topics').textContent = `${stats.completed}/${stats.totalTopics}`;
  },

  renderZonaRisco() {
    const container = document.getElementById('zona-risco-bar');
    const items = this.getZonaRisco();

    if (items.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';
    container.innerHTML = `
      <span class="label">🚨 Zona de Risco (${items.length})</span>
      ${items.slice(0, 8).map(t => `<span class="zona-risco-item" onclick="App.openModal('study-modal','${t.id}')">${t.name} (${t.daysSinceStudy}d)</span>`).join('')}
      ${items.length > 8 ? `<span class="zona-risco-item">+${items.length - 8} mais</span>` : ''}
    `;
  },

  renderDashboard() {
    const container = document.getElementById('tab-dashboard');
    if (!container.classList.contains('active')) return;

    const stats = this.getExamStats();
    const progress = this.getOverallProgress();
    const cats = this.calcCategoryStats();
    const cfg = this.getConfig();
    const level = this.getProgressLevel(progress);

    const glowClass = level.glow ? ' glow' : '';

    let html = `
      <div class="dashboard-welcome" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div class="progress-badge${glowClass}" style="display:flex;align-items:center;gap:12px;background:${level.bg};border:2px solid ${level.color};border-radius:16px;padding:12px 20px;--level-color:${level.color}">
          <span style="font-size:2.2rem">${level.icon}</span>
          <div>
            <div style="font-size:1.2rem;font-weight:700;color:${level.color}">${level.name}</div>
            <div style="font-size:0.85rem;color:var(--text2)">${progress.toFixed(0)}% de progresso geral</div>
          </div>
        </div>
        <div>
          <h1 style="margin:0">📊 Painel de Metacognição</h1>
          <p style="margin:0;color:var(--text2)">Acompanhe seu progresso, ranqueamento e viabilidade nos estudos.</p>
        </div>
      </div>

      ${!cfg || !cfg.examDate ? `
      <div class="config-cta">
        <div class="config-cta-icon">⚙️</div>
        <div class="config-cta-text">
          <strong>Configure sua prova</strong> para ativar o cronograma, calculadora de viabilidade e acompanhamento completo.
        </div>
        <button class="btn btn-config btn-lg" data-action="open-modal" data-modal="config-modal">Configurar Agora</button>
      </div>
      ` : ''}

      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">${progress.toFixed(0)}%</div><div class="stat-label">📚 Progresso</div></div>
        <div class="stat-card"><div class="stat-value">${stats.accuracy !== null ? stats.accuracy.toFixed(1) + '%' : '—'}</div><div class="stat-label">🎯 Precisão</div></div>
      </div>

      <div class="chart-row">
        <div class="chart-container">
          <h3>📈 Progresso por Matéria</h3>
          <div class="chart-wrapper"><canvas id="chart-cats"></canvas></div>
        </div>
        <div class="chart-container">
          <h3>📊 Recorrência</h3>
          <div class="rec-cat-btns" id="rec-btns"></div>
          <div class="chart-wrapper"><canvas id="chart-rec"></canvas></div>
        </div>
      </div>

      <div class="chart-row">
        <div class="chart-container">
          <h3>⚠️ Ilusão de Fluência</h3>
          <div id="fluency-alerts">${this.renderFluencyTable()}</div>
          <p style="font-size:0.78rem;color:var(--text2);margin-top:8px;padding:8px;background:var(--surface2);border-radius:var(--radius-sm)">
            💡 <strong>Ilusão de Fluência</strong> acontece quando você <strong>marca um tópico como "Fácil"</strong> mas sua taxa de acerto em questões é <strong>menor que 60%</strong>. 
            Isso indica que você <em>acha</em> que domina o assunto, mas na prática ainda erra muito. 
            O cálculo considera: dificuldade autoavaliada como "Fácil" + mínimo 3 questões respondidas + acerto abaixo de 60%.
          </p>
        </div>
      </div>
    `;

    container.innerHTML = html;

    setTimeout(() => {
      this.buildCategoryChart();
      this.buildRecurrenceChart();
    }, 50);
  },

  renderFluencyTable() {
    const alerts = this.getFluencyAlerts();
    if (alerts.length === 0) {
      return '<p style="color:var(--text2);font-size:0.85rem">✅ Nenhum alerta de ilusão de fluência.</p>';
    }
    return alerts.map(a => `
      <div class="fluency-alert danger" style="cursor:pointer" onclick="App.openModal('study-modal','${a.topicId}')">
        ⚠️ <strong>${a.name}</strong> (${a.category}) — Acerto: ${a.accuracy.toFixed(1)}% (${a.elo})
      </div>
    `).join('');
  },

  buildCategoryChart() {
    const canvas = document.getElementById('chart-cats');
    if (!canvas) return;
    const cats = this.calcCategoryStats();
    if (this.charts['cats']) this.charts['cats'].destroy();
    this.charts['cats'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: cats.map(c => c.name),
        datasets: [{
          label: '% Concluído',
          data: cats.map(c => c.progress.toFixed(1)),
          backgroundColor: cats.map(c => c.progress > 75 ? '#06d6a0' : c.progress > 50 ? '#4361ee' : c.progress > 25 ? '#ffd166' : '#ef476f'),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
      }
    });
  },

  buildEloChart() {
    const canvas = document.getElementById('chart-elo');
    if (!canvas) return;
    const dist = this.getEloDistribution();
    if (this.charts['elo']) this.charts['elo'].destroy();
    const labels = ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Desafiante'];
    const colors = ['#8B7355', '#CD7F32', '#A8A8A8', '#FFD700', '#FF6B35'];
    this.charts['elo'] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels.map((l, i) => `${l} (${dist[labels[i]]})`),
        datasets: [{
          data: labels.map(l => dist[l] || 0),
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 } } }
        }
      }
    });
  },

  buildRecurrenceChart() {
    const container = document.getElementById('rec-btns');
    const canvas = document.getElementById('chart-rec');
    if (!container || !canvas) return;

    const cats = EXAM_DATA.categories;
    const selectedCat = cats[0].name;

    container.innerHTML = cats.map(c => `
      <span class="rec-cat-btn ${c.name === selectedCat ? 'active' : ''}" data-category="${c.name}">
        ${c.icon} ${c.name}
      </span>
    `).join('');

    this._renderRecChart(selectedCat);

    container.querySelectorAll('.rec-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.rec-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderRecChart(btn.dataset.category);
      });
    });
  },

  _renderRecChart(category) {
    const canvas = document.getElementById('chart-rec');
    if (!canvas) return;
    if (this.charts['rec']) { this.charts['rec'].destroy(); delete this.charts['rec']; }
    const data = this.getRecurrenceData(category);
    const colors = data.map(d => {
      if (d.recurrenceScore >= 90) return '#FF6B35';
      if (d.recurrenceScore >= 75) return '#FFD700';
      if (d.recurrenceScore >= 60) return '#4361ee';
      if (d.recurrenceScore >= 40) return '#A8A8A8';
      return '#8B7355';
    });
    this.charts['rec'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.icon + ' ' + d.name),
        datasets: [{
          label: 'Recorrência',
          data: data.map(d => d.recurrenceScore),
          backgroundColor: colors,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `${ctx.raw}/100` } }
        },
        scales: {
          x: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { grid: { display: false }, ticks: { font: { size: 9 } } }
        }
      }
    });
  },

  renderTopics() {
    const container = document.getElementById('tab-assuntos');
    if (!container.classList.contains('active')) return;

    const cats = this.calcCategoryStats();

    const cfg = this.getConfig();
    const viab = this.calcViability();
    const overallPct = this.getOverallProgress();
    const stats = this.getExamStats();

    let alertsHtml = '';
    const fluencyAlerts = this.getFluencyAlerts();
    if (fluencyAlerts.length > 0) {
      alertsHtml = `<div class="alert-bar danger">⚠️ <strong>Ilusão de Fluência:</strong> ${fluencyAlerts.length} tópicos marcados como fáceis com baixo desempenho.</div>`;
    }

    let viabResultHtml = '';
    if (cfg.examDate && cfg.dailyHours > 0) {
      if (viab && !viab.feasible) {
        let cutsHtml = '';
        if (viab.cuts.length > 0) {
          cutsHtml = `<div class="cut-suggestion"><strong>✂️ Sugestão de corte:</strong> Foque apenas nos assuntos de maior peso (${viab.cuts.length} tópicos sugeridos para deixar de lado):<br>`;
          viab.cuts.slice(0, 10).forEach(c => {
            cutsHtml += `<span class="topic-rec">${c.name}</span> (peso ${c.weight}), `;
          });
          cutsHtml = cutsHtml.slice(0, -2) + '</div>';
        }
        viabResultHtml = `
        <div class="viability-result not-ok">
          ❌ <span class="highlight">Inviável no prazo!</span> Faltam ${viab.daysRemaining} dias.<br>
          ⏱ Necessário: <strong>${viab.remainingHours}h</strong> | Disponível: <strong>${viab.availableHours}h</strong> (${cfg.dailyHours}h/dia, ${(cfg.studyDays || [1,2,3,4,5]).length} dias/semana)<br>
          📈 Déficit de <strong>${viab.deficit}h</strong>. Aumente para ${Math.ceil(viab.remainingHours / viab.daysRemaining)}h/dia ou estenda o prazo.
        </div>
        ${cutsHtml}
        <div style="margin-top:12px;text-align:center">
          <button class="btn btn-primary" data-action="trim-cronograma" style="background:var(--accent);color:#fff;padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-size:0.95rem">🔧 Ajustar cronograma automaticamente (remover tópicos menos importantes)</button>
        </div>`;
      } else if (viab && viab.feasible) {
        viabResultHtml = `
        <div class="viability-result ok">
          ✅ <span class="highlight">Viável!</span> Faltam ${viab.daysRemaining} dias.<br>
          ⏱ Você precisa de <strong>${viab.remainingHours}h</strong> e tem disponíveis <strong>${viab.availableHours}h</strong> (${cfg.dailyHours}h/dia, ${(cfg.studyDays || [1,2,3,4,5]).length} dias/semana).<br>
          📊 Estude ${Math.round(viab.remainingHours / viab.daysRemaining)}h por dia para cobrir tudo.
        </div>`;
      }
    }

    let html = `
      <div class="dashboard-welcome">
        <h1>${EXAM_DATA.icon} ${EXAM_DATA.name}</h1>
        <p>${stats.totalTopics} tópicos • ${stats.completed} concluídos • ${stats.studied} estudados</p>
      </div>

      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">${overallPct.toFixed(0)}%</div><div class="stat-label">📊 Cobertura</div></div>
        <div class="stat-card"><div class="stat-value">${stats.accuracy !== null ? stats.accuracy.toFixed(1) + '%' : '—'}</div><div class="stat-label">🎯 Precisão Geral</div></div>
        <div class="stat-card"><div class="stat-value">${stats.totalQ}</div><div class="stat-label">📝 Questões Feitas</div></div>
        <div class="stat-card"><div class="stat-value">${Math.round(stats.spentHours)}h</div><div class="stat-label">⏱ Horas Estudadas</div></div>
      </div>

      <div class="top-bar">
        <button class="btn btn-config" data-action="open-modal" data-modal="config-modal">⚙️ Configurar Prova</button>
        <span style="font-size:0.85rem;color:var(--text2)">
          ${cfg.examDate ? `📅 Prova: ${new Date(cfg.examDate).toLocaleDateString('pt-BR')}` : '📅 Data não configurada'}
          ${cfg.dailyHours > 0 ? ` | ⏱ ${cfg.dailyHours}h/dia` : ''}
          ${cfg.studyDays ? ` | 📅 ${cfg.studyDays.length} dias/semana` : ''}
        </span>
      </div>

      ${alertsHtml}

      <div class="chart-container">
        <h3>⏱ Calculadora de Viabilidade</h3>
        <form id="viability-form">
          <div class="study-input-row" style="margin-bottom:10px">
            <button type="submit" class="btn btn-primary">Calcular Viabilidade</button>
          </div>
        </form>
        <div id="viability-result">${viabResultHtml}</div>
      </div>

      <div style="margin:16px 0">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.85rem;font-weight:600">
          <span>Progresso Geral</span>
          <span>${overallPct.toFixed(0)}%</span>
        </div>
        <div class="progress-bar" style="height:10px">
          <div class="progress-fill ${overallPct >= 80 ? 'success' : overallPct >= 40 ? '' : 'warning'}" style="width:${overallPct}%"></div>
        </div>
      </div>
    `;

    cats.forEach(cat => {
      const catTopics = EXAM_DATA.categories.find(c => c.name === cat.name).topics;
      const catProgress = cat.totalEstHours > 0 ? (cat.completedEstHours / cat.totalEstHours) * 100 : 0;

      html += `<div class="category-section">
        <div class="category-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
          <h3>${cat.icon} ${cat.name}</h3>
          <div class="cat-stats">
            <span>${cat.completedTopics}/${cat.totalTopics}</span>
            <span>${cat.accuracy !== null ? cat.accuracy.toFixed(0) + '%' : '—'}</span>
            <div style="width:80px"><div class="progress-bar"><div class="progress-fill" style="width:${catProgress}%"></div></div></div>
            <span class="cat-toggle">▼</span>
          </div>
        </div>
        <div class="category-body collapsed">`;

      catTopics.forEach(t => {
        const ts = this.state.topics[t.id];
        const acc = ts.questionsAnswered > 0 ? (ts.questionsCorrect / ts.questionsAnswered) * 100 : null;
        const elo = this.getElo(acc);
        const topicProgress = ts.estHours > 0 ? Math.min(100, ((ts.timeSpent || 0) / ts.estHours) * 100) : 0;
        const isFluency = ts.selfDifficulty === 'easy' && acc !== null && acc < 60 && ts.questionsAnswered >= 3;

        const subs = t.subtopics || [];
        const studiedSet = new Set(ts.studiedSubtopics || []);
        const subHtml = subs.length > 0 ? `<div class="topic-subtopics" id="sub-${t.id}">
          <ul class="subtopic-list">
            ${subs.map(s => `<li>
              <label data-action="toggle-subtopic" data-topic="${t.id}" data-subtopic="${s}">
                <input type="checkbox" ${studiedSet.has(s) ? 'checked' : ''}>
                <span class="${studiedSet.has(s) ? 'studied' : ''}">${s}</span>
              </label>
            </li>`).join('')}
          </ul>
          <button class="btn btn-outline btn-sm" style="margin-top:6px" data-action="clear-subtopics" data-topic="${t.id}">✕ Limpar marcados</button>
        </div>` : '';

        html += `<div class="topic-item">
          <div class="topic-info">
            <div class="topic-name">
              ${ts.completed ? '✅ ' : ''}${t.name}
              ${isFluency ? '<span style="color:var(--danger);font-size:0.7rem;margin-left:4px">⚠️</span>' : ''}
              ${subs.length > 0 ? '<span class="sub-toggle" data-action="toggle-subtopics" data-topic="' + t.id + '">📋 detalhes</span>' : ''}
            </div>
            <div class="topic-meta">
              <span>⏱ ${ts.timeSpent || 0}/${ts.estHours}h</span>
              ${acc !== null ? `<span>🎯 ${acc.toFixed(0)}%</span>` : ''}
              <span class="elo-badge" style="background:${elo.color}22;color:${elo.color};font-size:0.65rem">${elo.icon} ${elo.name}</span>
              ${ts.lastStudied ? `<span>📅 ${new Date(ts.lastStudied).toLocaleDateString('pt-BR')}</span>` : ''}
              <span style="font-size:0.7rem;color:var(--text2)">📊 ${t.recurrenceScore || ''}/100</span>
              ${subs.length > 0 ? `<span style="font-size:0.65rem;color:var(--text2)">${studiedSet.size}/${subs.length} ✓</span>` : ''}
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${topicProgress}%"></div></div>
          </div>
          ${subHtml}
          <div class="topic-actions">
            <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="study-modal" data-topic="${t.id}">Estudar</button>
            <button class="btn btn-outline btn-sm" data-action="youtube" data-topic="${t.name}">▶ Aula</button>
          </div>
        </div>`;
      });

      html += `</div></div>`;
    });

    container.innerHTML = html;

    document.querySelectorAll('.category-body').forEach(el => {
      if (el.querySelectorAll('.topic-item').length <= 5) {
        el.classList.remove('collapsed');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
