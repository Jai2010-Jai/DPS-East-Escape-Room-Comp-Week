// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });
}

// Active link highlight on scroll
const sections = [...document.querySelectorAll('section.section')];
const navAnchors = [...document.querySelectorAll('.nav-link')];

function setActive(hash) {
  navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === hash));
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = `#${entry.target.id}`;
      setActive(id);
      entry.target.querySelectorAll('[data-reveal]')?.forEach(el => el.classList.add('visible'));
    }
  });
}, { threshold: 0.5 });

sections.forEach(sec => observer.observe(sec));

// Add data-reveal to hero text blocks for animation
document.querySelectorAll('.hero-text > *').forEach(el => el.setAttribute('data-reveal', ''));
document.querySelectorAll('.placeholder > *').forEach(el => el.setAttribute('data-reveal', ''));

// Modal logic for questions page
const modalOverlay = document.getElementById('question-modal');
const modalTitle = modalOverlay ? modalOverlay.querySelector('#modal-title') : null;
const modalContent = modalOverlay ? modalOverlay.querySelector('.modal-content') : null;
const modalClose = modalOverlay ? modalOverlay.querySelector('.modal-close') : null;

function openModal(title, body) {
  if (!modalOverlay || !modalTitle || !modalContent) return;
  modalTitle.textContent = title || 'Question';
  modalContent.innerHTML = `<p>${(body || '').replace(/\n/g, '<br/>')}</p>`;
  modalOverlay.classList.add('open');
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove('open');
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}
if (modalClose) modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// Bind cards
document.querySelectorAll('.card[data-question-title]').forEach(card => {
  card.addEventListener('click', (e) => {
    e.preventDefault();
    const title = card.getAttribute('data-question-title');
    const body = card.getAttribute('data-question-body');
    // If dynamic content loaded, prefer it
    const dynamicBody = card.dataset.bodyLoaded;
    openModal(title, dynamicBody || body);
  });
});

// ---------------- Firebase + Dynamic Questions -----------------
// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBf1vEgmJ_pu4PbLHxn_I_jXFOjmnfvKzU",
  authDomain: "dpsbe-escape-room-comp-week.firebaseapp.com",
  databaseURL: "https://dpsbe-escape-room-comp-week-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dpsbe-escape-room-comp-week",
  storageBucket: "dpsbe-escape-room-comp-week.firebasestorage.app",
  messagingSenderId: "743129274203",
  appId: "1:743129274203:web:409a0d83db0de531266c7e"
};

// Wait for Firebase to load, then initialize
let db = null;

function initializeFirebase() {
  if (window.firebase && !window.firebase.apps?.length) {
    try {
      firebase.initializeApp(firebaseConfig);
      db = firebase.database();
      console.log('Firebase initialized successfully');
      return true;
    } catch (err) {
      console.error('Firebase initialization failed:', err);
      return false;
    }
  } else if (window.firebase && window.firebase.apps?.length > 0) {
    db = firebase.database();
    console.log('Firebase already initialized');
    return true;
  }
  return false;
}

// Try to initialize Firebase immediately
if (!initializeFirebase()) {
  // If Firebase isn't loaded yet, wait for it
  const checkFirebase = setInterval(() => {
    if (window.firebase) {
      clearInterval(checkFirebase);
      if (initializeFirebase()) {
        // Firebase is now ready, initialize navbar points display
        initializeNavbarWithFirebase();
      }
    }
  }, 100);
  
  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkFirebase);
    if (!db) {
      console.error('Firebase failed to load after 10 seconds');
    }
  }, 10000);
} else {
  // Firebase initialized immediately, set up navbar points
  initializeNavbarWithFirebase();
}

// Test Firebase connection
async function testFirebaseConnection() {
  if (!db) {
    console.error('Firebase not initialized');
    return false;
  }
  
  try {
    const testRef = db.ref('users');
    const snapshot = await testRef.limitToFirst(1).get();
    console.log('Firebase connection test successful');
    return true;
  } catch (err) {
    console.error('Firebase connection test failed:', err);
    return false;
  }
}

// Test connection on load
testFirebaseConnection();

// Debug function to list available teams
async function listAvailableTeams() {
  if (!db) return;
  try {
    const snapshot = await db.ref('users').get();
    const teams = Object.keys(snapshot.val() || {});
    console.log('Available teams in database:', teams);
    return teams;
  } catch (err) {
    console.error('Error listing teams:', err);
    return [];
  }
}

// Session helpers
function getSessionTeam() {
  try { return localStorage.getItem('teamName'); } catch(e) { return null; }
}
function setSessionTeam(team) {
  try { localStorage.setItem('teamName', team); } catch(e) {}
}

// Timer system - Level-based timers
let currentLevelTimer = null;
let currentLevel = null;
let levelStartTimes = {};
let levelCompletionStatus = { 1: false, 2: false, 3: false }; // Track which levels have been completed

function startLevelTimer(level) {
  // Stop any existing timer
  stopCurrentTimer();
  
  // Save previous level time if it exists
  if (currentLevel && levelStartTimes[currentLevel]) {
    const elapsed = Date.now() - levelStartTimes[currentLevel];
    saveLevelTime(currentLevel, elapsed);
    displayCompletedLevelTime(currentLevel, elapsed);
  }
  
  // Start new level timer
  currentLevel = level;
  levelStartTimes[level] = Date.now();
  
  // Show timer in navbar
  updateTimerDisplay();
  
  // Update timer every second
  currentLevelTimer = setInterval(updateTimerDisplay, 1000);
  
  console.log(`Started timer for Level ${level}`);
}

function stopCurrentTimer() {
  if (currentLevelTimer) {
    clearInterval(currentLevelTimer);
    currentLevelTimer = null;
  }
}

function updateTimerDisplay() {
  if (!currentLevel || !levelStartTimes[currentLevel]) return;
  
  const elapsed = Date.now() - levelStartTimes[currentLevel];
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Update navbar timer
  const timerDisplay = document.getElementById('timer-display');
  const timerValue = document.querySelector('.timer-value');
  if (timerDisplay && timerValue) {
    timerValue.textContent = timeString;
    timerDisplay.style.display = 'flex';
  }
  
  // Update current level time display
  const levelTimeDisplay = document.getElementById(`level${currentLevel}-time-display`);
  const levelTimeValue = document.getElementById(`level${currentLevel}-time-value`);
  if (levelTimeDisplay && levelTimeValue) {
    levelTimeValue.textContent = timeString;
    levelTimeDisplay.style.display = 'flex';
  }
}

function displayCompletedLevelTime(level, timeMs) {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const levelTimeDisplay = document.getElementById(`level${level}-time-display`);
  const levelTimeValue = document.getElementById(`level${level}-time-value`);
  if (levelTimeDisplay && levelTimeValue) {
    levelTimeValue.textContent = timeString;
    levelTimeDisplay.style.display = 'flex';
    // Add a class to indicate this level is completed
    levelTimeDisplay.classList.add('completed-time');
  }
}

function saveLevelTime(level, timeMs) {
  const team = getSessionTeam();
  if (!team || !db) return;
  
  const timeSeconds = Math.floor(timeMs / 1000);
  db.ref(`users/${team}/levelTimes/${level}`).set(timeSeconds);
}

function getLevelTime(level) {
  const team = getSessionTeam();
  if (!team || !db) return Promise.resolve(null);
  
  return db.ref(`users/${team}/levelTimes/${level}`).get().then(snap => {
    return snap.exists() ? snap.val() : null;
  });
}

async function loadAndDisplayAllLevelTimes(team) {
  if (!db || !team) return;
  
  try {
    // Load times for all levels
    for (let level = 1; level <= 3; level++) {
      const levelTime = await getLevelTime(level);
      if (levelTime) {
        const minutes = Math.floor(levelTime / 60);
        const seconds = levelTime % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const levelTimeDisplay = document.getElementById(`level${level}-time-display`);
        const levelTimeValue = document.getElementById(`level${level}-time-value`);
        if (levelTimeDisplay && levelTimeValue) {
          levelTimeValue.textContent = timeString;
          levelTimeDisplay.style.display = 'flex';
          levelTimeDisplay.classList.add('completed-time');
        }
      }
    }
  } catch (err) {
    console.error('Error loading level times:', err);
  }
}

// Login page logic
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const team = document.getElementById('team').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    const successEl = document.getElementById('login-success');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    try {
      if (!db) {
        throw new Error('Database not ready. Please wait and try again.');
      }
      const snap = await db.ref(`users/${team}`).get();
      if (!snap.exists()) throw new Error('Team not found');
      const user = snap.val();
      if (user.password !== password) throw new Error('Invalid password');
      setSessionTeam(team);
      successEl.textContent = 'Login successful! Redirecting...';
      successEl.style.display = 'block';
      setTimeout(() => {
        window.location.href = 'questions.html';
      }, 1000);
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed';
      errorEl.style.display = 'block';
    }
  });
}

// Questions page: dynamic load and realtime points
async function loadQuestionsJson() {
  try {
    const res = await fetch('questions.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load questions');
    return await res.json();
  } catch (e) { console.error(e); return null; }
}

function renderCardsFromJson(json) {
  if (!json) return;
  const levels = json.levels || {};
  const mapping = { 1: '#level-1 .card-grid', 2: '#level-2 .card-grid', 3: '#level-3 .card-grid' };
  
  Object.keys(mapping).forEach(level => {
    const container = document.querySelector(mapping[level]);
    if (!container || !levels[level]) return;
    container.innerHTML = '';
    levels[level].forEach(q => {
      const a = document.createElement('a');
      a.className = 'card';
      a.href = `#${q.id}`;
      a.setAttribute('data-question-title', q.title);
      a.setAttribute('data-question-id', q.id);
      a.innerHTML = `<span class="chip">L${level}</span><h3>${q.title}</h3>`;
      container.appendChild(a);
    });
  });

  // rebind card clicks with modal + answer form
  bindCardsWithAnswer(json);
}

function bindCardsWithAnswer(json) {
  document.querySelectorAll('.card[data-question-title]').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Check if card is disabled (completed or locked)
      if (card.classList.contains('completed') || card.closest('.level.locked')) {
        return; // Don't open modal for disabled cards
      }
      
      // Check if this is the first question of a level and start timer
      const qid = card.getAttribute('data-question-id');
      const level = Object.keys(json.levels).find(l => json.levels[l].some(q => q.id === qid));
      const isFirstQuestionOfLevel = json.levels[level] && json.levels[level][0] && json.levels[level][0].id === qid;
      
      // Only start timer if this is the first question of a level AND we're not already timing that level
      if (isFirstQuestionOfLevel && currentLevel !== parseInt(level)) {
        const confirmed = confirm(`Would you like to begin Level ${level}? The timer will start now.`);
        if (confirmed) {
          startLevelTimer(parseInt(level));
        } else {
          return; // Don't open modal if user cancels
        }
      }
      
      const q = json.levels[level].find(x => x.id === qid);
      if (!q) return;
      
      // Format the question body with better styling
      const formattedBody = formatQuestionBody(q.body);
      
      const bodyHtml = `
        <div class="q-body">${formattedBody}</div>
        <div class="hint-section" style="margin-top: 16px;">
          <button class="btn hint-btn" id="hint-btn" type="button">Get Hint (-10 pts)</button>
          <div class="hint-content" id="hint-content" style="display: none; margin-top: 12px; padding: 12px; background: rgba(193,161,255,0.1); border-radius: 8px; border: 1px solid rgba(193,161,255,0.3);">
            <strong>Hint:</strong> <span id="hint-text">${q.hint || 'No hint available.'}</span>
          </div>
        </div>
        <form id="answer-form" class="form-row${q.fileUrl ? ' has-download' : ''}" style="margin-top:12px;">
          <input class="input" id="answer" placeholder="Your answer" required autocomplete="off" />
          ${q.fileUrl ? `<a class="btn ghost" id="download-btn" href="${q.fileUrl}" download target="_blank" rel="noopener">Download File</a>` : ''}
          <button class="btn primary" type="submit">Submit</button>
        </form>
        <div class="hint" id="answer-hint"></div>
      `;
      openModal(q.title, bodyHtml);

      // Attach hint handler
      const hintBtn = document.getElementById('hint-btn');
      if (hintBtn) {
        hintBtn.addEventListener('click', async () => {
          const team = getSessionTeam();
          if (!team || !db) {
            alert('Please login first.');
            return;
          }
          
          // Check if user has enough points
          const userRef = db.ref(`users/${team}`);
          const snapshot = await userRef.get();
          const user = snapshot.val();
          const currentPoints = user.points || 0;
          
          if (currentPoints < 10) {
            alert('Not enough points! You need at least 10 points to buy a hint.');
            return;
          }
          
          // Deduct points and show hint
          await userRef.child('points').set(currentPoints - 10);
          document.getElementById('hint-content').style.display = 'block';
          hintBtn.style.display = 'none';
          
          // Update points display
          updatePointsDisplay(team);
        });
      }

      // Attach submit handler
      const form = document.getElementById('answer-form');
      if (form) {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const input = document.getElementById('answer');
          const userAnswer = (input.value || '').trim().toLowerCase();
          const correct = (q.answer || '').trim().toLowerCase();
          const team = getSessionTeam();
          const hintEl = document.getElementById('answer-hint');
          if (!team) { hintEl.textContent = 'Please login first.'; return; }
          if (!db) { hintEl.textContent = 'Database not ready. Please wait and try again.'; return; }
          if (userAnswer !== correct) { hintEl.textContent = 'Incorrect. Try again.'; return; }

          // Correct: award points and mark completion if not already
          try {
            const pointsForLevel = (json.points && json.points[level]) || 0;
            console.log('Attempting to update score for team:', team, 'points:', pointsForLevel);
            
            // Check if team exists first
            const userRef = db.ref(`users/${team}`);
            const snapshot = await userRef.get();
            
            if (!snapshot.exists()) {
              throw new Error('Team not found in database');
            }
            
            const user = snapshot.val();
            console.log('Current user data:', user);
            
            const completed = (user.progress && user.progress[qid]) || false;
            if (completed) { 
              hintEl.textContent = 'Already solved!'; 
              hintEl.style.color = '#ffa500';
              return; 
            }

            // Update progress and points
            const currentPoints = user.points || 0;
            const newPoints = currentPoints + pointsForLevel;
            
            console.log('Updating points from', currentPoints, 'to', newPoints);
            
            const updates = {};
            updates[`users/${team}/progress/${qid}`] = true;
            updates[`users/${team}/points`] = newPoints;
            
            await db.ref().update(updates);
            console.log('Score update successful');
            
            hintEl.textContent = `Correct! +${pointsForLevel} pts awarded.`;
            hintEl.style.color = '#4ade80';

            // Update points display in navbar
            updatePointsDisplay(team);

            // Update card states and locks
            updateCardStates(json, team);
          } catch (err) {
            console.error('Score update error:', err);
            hintEl.textContent = `Error: ${err.message || 'Failed to update score'}`;
            hintEl.style.color = '#ff6b6b';
          }
        });
      }
    });
  });
}

// Format question body with better styling
function formatQuestionBody(body) {
  if (!body) return '<p>No content available.</p>';
  
  // Convert markdown-style formatting to HTML
  let formatted = body
    // Convert **text** to <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert *text* to <em>text</em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert line breaks to <br> tags
    .replace(/\n/g, '<br>');
  
  // Wrap in paragraphs if it's not already structured
  if (!formatted.includes('<p>') && !formatted.includes('<div>')) {
    // Split by double line breaks and wrap each in <p> tags
    const paragraphs = formatted.split('<br><br>');
    formatted = paragraphs.map(p => `<p>${p.replace(/<br>/g, '')}</p>`).join('');
  }
  
  return formatted;
}

function updateCardStates(json, team) {
  if (!db) return;
  
  // Remove any existing listeners to prevent duplicates
  db.ref(`users/${team}/progress`).off();
  
  db.ref(`users/${team}/progress`).on('value', (snap) => {
    const progress = snap.val() || {};
    console.log('Progress updated for', team, ':', progress);
    
    // Update individual card states
    document.querySelectorAll('.card[data-question-id]').forEach(card => {
      const qid = card.getAttribute('data-question-id');
      const isCompleted = !!progress[qid];
      
      if (isCompleted) {
        card.classList.add('completed');
        if (!card.querySelector('.passed-overlay')) {
          const overlay = document.createElement('div');
          overlay.className = 'passed-overlay';
          overlay.innerHTML = '<div class="passed-text">PASSED</div>';
          card.appendChild(overlay);
        }
      } else {
        card.classList.remove('completed');
        const overlay = card.querySelector('.passed-overlay');
        if (overlay) overlay.remove();
      }
    });
    
    // Update level locks
    updateLevelLocks(json, team, progress);
  });
}

function updateLevelLocks(json, team, progress = null) {
  if (!db) return;
  const rules = json.unlockRules || {};
  const l2Rule = rules['2'];
  const l3Rule = rules['3'];
  
  const getProgress = () => {
    if (progress) return progress;
    // If progress not provided, get it from current state
    const progressEl = document.querySelector('.card[data-question-id]');
    if (progressEl) {
      // This is a simplified approach - in real implementation, you'd get from Firebase
      return {};
    }
    return {};
  };
  
  const currentProgress = getProgress();
  
  const countSolved = (level) => {
    const ids = (json.levels[level] || []).map(q => q.id);
    return ids.filter(id => !!currentProgress[id]).length;
  };
  
  const l2Unlocked = !l2Rule || countSolved(String(l2Rule.requireLevel)) >= l2Rule.requireCount;
  const l3Unlocked = !l3Rule || countSolved(String(l3Rule.requireLevel)) >= l3Rule.requireCount;
  
  // Update UI locks
  document.getElementById('level-2')?.classList.toggle('locked', !l2Unlocked);
  document.getElementById('level-3')?.classList.toggle('locked', !l3Unlocked);
  
  // Check for level completions and handle timer transitions
  checkLevelCompletions(l2Unlocked, l3Unlocked);
}

function checkLevelCompletions(l2Unlocked, l3Unlocked) {
  // Level 2 completion: When Level 2 is unlocked, Level 1 is complete
  if (l2Unlocked && !levelCompletionStatus[1] && currentLevel === 1) {
    levelCompletionStatus[1] = true;
    console.log('Level 1 completed - stopping timer');
    stopCurrentTimer();
    // Save Level 1 time
    if (levelStartTimes[1]) {
      const elapsed = Date.now() - levelStartTimes[1];
      saveLevelTime(1, elapsed);
      displayCompletedLevelTime(1, elapsed);
    }
    alert('Level 1 completed! Level 2 is now unlocked.');
  }
  
  // Level 3 completion: When Level 3 is unlocked, Level 2 is complete
  if (l3Unlocked && !levelCompletionStatus[2] && currentLevel === 2) {
    levelCompletionStatus[2] = true;
    console.log('Level 2 completed - stopping timer');
    stopCurrentTimer();
    // Save Level 2 time
    if (levelStartTimes[2]) {
      const elapsed = Date.now() - levelStartTimes[2];
      saveLevelTime(2, elapsed);
      displayCompletedLevelTime(2, elapsed);
    }
    alert('Level 2 completed! Level 3 is now unlocked.');
  }
}

// Update navbar based on login state
function updateNavbarState() {
  const team = getSessionTeam();
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  const teamName = document.getElementById('team-name');
  
  if (team) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (teamName) teamName.textContent = team;
    // Try to update points display, but don't fail if Firebase isn't ready yet
    updatePointsDisplay(team);
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
  }
}

// Initialize navbar with Firebase when ready
function initializeNavbarWithFirebase() {
  const team = getSessionTeam();
  console.log('initializeNavbarWithFirebase called - team:', team, 'db available:', !!db);
  if (team && db) {
    console.log('initializeNavbarWithFirebase: Calling updatePointsDisplay');
    updatePointsDisplay(team);
  } else {
    console.log('initializeNavbarWithFirebase: Not calling updatePointsDisplay - team:', team, 'db:', !!db);
  }
}

// Update points display in navbar
function updatePointsDisplay(team) {
  console.log('updatePointsDisplay called with team:', team, 'db available:', !!db);
  if (!db || !team) {
    console.log('updatePointsDisplay: Early return - db:', !!db, 'team:', team);
    return;
  }
  const pointsValue = document.getElementById('points-value');
  if (!pointsValue) {
    console.log('updatePointsDisplay: No points-value element found');
    return;
  }
  
  console.log('updatePointsDisplay: Setting up Firebase listener for team:', team);
  
  // Remove any existing listeners to prevent duplicates
  db.ref(`users/${team}/points`).off();
  
  db.ref(`users/${team}/points`).on('value', (snap) => {
    const points = snap.val() || 0;
    pointsValue.textContent = points;
    console.log('Points updated for', team, ':', points);
  });
}

async function setupQuestionsPage() {
  const onQuestions = !!document.getElementById('levels');
  if (!onQuestions) return;
  
  const json = await loadQuestionsJson();
  if (!json) return;
  
  const team = getSessionTeam();
  if (!team) {
    console.log('No team logged in, redirecting to login');
    window.location.href = 'login.html';
    return;
  }
  
  if (!db) {
    console.log('Database not ready, waiting...');
    // Wait for database to be ready
    const waitForDb = setInterval(() => {
      if (db) {
        clearInterval(waitForDb);
        setupQuestionsPage();
      }
    }, 100);
    return;
  }
  
  console.log('Setting up questions page for team:', team);
  
  // Reset level completion status
  levelCompletionStatus = { 1: false, 2: false, 3: false };
  
  // Render cards first
  renderCardsFromJson(json);
  
  // Then set up real-time listeners
  updateCardStates(json, team);
  updatePointsDisplay(team);
  
  // Load and display saved times for all levels
  loadAndDisplayAllLevelTimes(team);
}

// Leaderboard functionality
async function setupLeaderboard() {
  const onLeaderboard = !!document.getElementById('leaderboard');
  if (!onLeaderboard) return;
  
  if (!db) {
    console.log('Database not ready for leaderboard, waiting...');
    const waitForDb = setInterval(() => {
      if (db) {
        clearInterval(waitForDb);
        setupLeaderboard();
      }
    }, 100);
    return;
  }
  
  console.log('Setting up leaderboard');
  
  // Listen for all users data
  db.ref('users').on('value', (snap) => {
    const users = snap.val() || {};
    const currentTeam = getSessionTeam();
    
    // Convert to array and sort by points
    const leaderboard = Object.keys(users)
      .map(teamName => ({
        name: teamName,
        points: users[teamName].points || 0,
        progress: users[teamName].progress || {}
      }))
      .sort((a, b) => b.points - a.points);
    
    renderLeaderboard(leaderboard, currentTeam);
  });
}

function renderLeaderboard(leaderboard, currentTeam) {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;
  
  if (leaderboard.length === 0) {
    container.innerHTML = '<div class="loading">No teams found</div>';
    return;
  }
  
  container.innerHTML = leaderboard.map((team, index) => {
    const rank = index + 1;
    const isCurrentTeam = team.name === currentTeam;
    const completedCount = Object.keys(team.progress).filter(q => team.progress[q]).length;
    const totalQuestions = 15; // Total questions in the game (7+5+3)
    const progressPercent = Math.round((completedCount / totalQuestions) * 100);
    
    let rankClass = '';
    if (rank === 1) rankClass = 'first';
    else if (rank === 2) rankClass = 'second';
    else if (rank === 3) rankClass = 'third';
    
    return `
      <div class="leaderboard-item ${isCurrentTeam ? 'current-team' : ''}">
        <div class="rank ${rankClass}">${rank}</div>
        <div class="team-name">${team.name}</div>
        <div class="points">${team.points}</div>
        <div class="progress">${completedCount}/${totalQuestions} (${progressPercent}%)</div>
      </div>
    `;
  }).join('');
}

// Logout functionality
function logout() {
  try {
    localStorage.removeItem('teamName');
    updateNavbarState();
    // Redirect to login page if on questions page
    if (window.location.pathname.includes('questions.html')) {
      window.location.href = 'login.html';
    }
  } catch (e) {
    console.error('Logout error:', e);
  }
}


// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize navbar state on all pages
  updateNavbarState();
  
  // Set up questions page if we're on it
  setupQuestionsPage();
  
  // Set up leaderboard if we're on it
  setupLeaderboard();
  
  // Bind logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  // Ensure points display is set up when DOM is ready (in case Firebase was already initialized)
  setTimeout(() => {
    initializeNavbarWithFirebase();
  }, 100);
});


