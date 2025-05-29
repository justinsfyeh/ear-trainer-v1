// Check if Tone.js is loaded
if (typeof Tone === 'undefined') {
  console.error('Tone.js is not loaded!');
}

const notes = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5'];
const whiteKeys = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
const blackKeys = ['C#4', 'D#4', 'F#4', 'G#4', 'A#4'];

let testNote = null;
let audioInitialized = false;
let gameState = 'waiting'; // 'waiting', 'guessing', 'answered'
let wrongKeys = new Set();
let isFirstGuess = true;

// Stats tracking
let sessionStats = {
  correctFirst: 0,
  wrongSkipped: 0,
  totalNotes: 0,
  currentStreak: 0,
  bestStreak: 0
};

// Piano synth for better sound
let piano = null;

async function initializeAudio() {
  try {
    if (!audioInitialized) {
      console.log('Starting Tone.js audio context...');
      await Tone.start();
      
      // Create a piano-like synth
      piano = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "fatsawtooth",
          count: 3,
          spread: 30
        },
        envelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.2,
          release: 1.5
        },
        filter: {
          type: "lowpass",
          frequency: 3000,
          rolloff: -12
        }
      }).toDestination();
      
      // Add some reverb and EQ for a more realistic piano sound
      const reverb = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3
      }).toDestination();
      
      const eq = new Tone.EQ3({
        low: -2,
        mid: 1,
        high: -1
      }).connect(reverb);
      
      piano.connect(eq);
      
      audioInitialized = true;
      console.log('Audio context started successfully');
      console.log('Tone context state:', Tone.context.state);
      document.getElementById('initBtn').style.display = 'none';
      logMessage('Audio initialized! Click "New Note" to start.');
      updateStatsDisplay();
      loadBestStreak();
    }
  } catch (error) {
    console.error('Error initializing audio:', error);
    logMessage('Error starting audio. Please try again.');
  }
}

function setupKeyboard() {
  const container = document.getElementById("keyboard");
  
  // Create white keys first
  whiteKeys.forEach(note => {
    const btn = document.createElement("div");
    btn.className = "key white-key";
    btn.innerText = note.slice(0, -1); // Just the note name
    btn.onclick = () => handleAnswer(note);
    btn.id = `key-${note}`;
    btn.setAttribute('data-note', note);
    container.appendChild(btn);
  });
  
  // Create black keys
  blackKeys.forEach(note => {
    const btn = document.createElement("div");
    btn.className = "key black-key";
    btn.innerText = note.slice(0, -2); // Note name without octave and #
    btn.onclick = () => handleAnswer(note);
    btn.id = `key-${note}`;
    btn.setAttribute('data-note', note);
    container.appendChild(btn);
  });
}

function clearKeyStyles() {
  notes.forEach(note => {
    const key = document.getElementById(`key-${note}`);
    if (key) {
      key.classList.remove('wrong', 'correct');
    }
  });
  wrongKeys.clear();
}

async function playNote(note) {
  try {
    if (!audioInitialized) {
      await initializeAudio();
    }
    piano.triggerAttackRelease(note, "1n");
    console.log(`Played note: ${note}`);
  } catch (error) {
    console.error('Error playing note:', error);
    logMessage('Error playing sound. Make sure audio is initialized.');
  }
}

async function playReferenceNote() {
  await playNote("C4");
}

async function generateTestNote() {
  if (gameState === 'guessing') {
    // If currently guessing, treat this as skip
    skipCurrentNote();
    return;
  }
  
  clearKeyStyles();
  const randomIndex = Math.floor(Math.random() * notes.length);
  testNote = notes[randomIndex];
  gameState = 'guessing';
  isFirstGuess = true;
  
  await playNote(testNote);
  logMessage("🎵 Guess the note! (Click a key or Skip)");
  
  // Update button states
  document.getElementById('newNote').textContent = 'Skip Note';
  document.getElementById('skipNote').style.display = 'none';
}

async function playTestNote() {
  if (testNote && gameState === 'guessing') {
    await playNote(testNote);
  } else {
    logMessage("No test note to replay. Click 'New Note' first.");
  }
}

async function handleAnswer(selectedNote) {
  if (gameState !== 'guessing' || !testNote) {
    logMessage("Click 'New Note' to start guessing!");
    return;
  }
  
  const key = document.getElementById(`key-${selectedNote}`);
  
  if (selectedNote === testNote) {
    // Correct answer
    const keyType = whiteKeys.includes(selectedNote) ? 'white-key' : 'black-key';
    key.classList.add('correct', keyType);
    gameState = 'answered';
    
    // Update streak
    if (isFirstGuess) {
      sessionStats.currentStreak++;
      if (sessionStats.currentStreak > sessionStats.bestStreak) {
        sessionStats.bestStreak = sessionStats.currentStreak;
        saveBestStreak();
      }
    } else {
      sessionStats.currentStreak = 0;
    }
    
    // Update stats
    updateNoteStats(testNote, isFirstGuess);
    if (isFirstGuess) {
      sessionStats.correctFirst++;
    } else {
      sessionStats.wrongSkipped++;
    }
    sessionStats.totalNotes++;
    
    logMessage(`✅ Correct! It was ${testNote} ${sessionStats.currentStreak > 0 ? '🔥 Streak: ' + sessionStats.currentStreak : ''}`);
    updateStatsDisplay();
    logStatsToFile();
    
    // Reset button text
    document.getElementById('newNote').textContent = 'New Note';
    
    // Auto-play next note after 1.5 seconds
    setTimeout(async () => {
      await generateTestNote();
    }, 1500);
    
  } else {
    // Wrong answer
    const keyType = whiteKeys.includes(selectedNote) ? 'white-key' : 'black-key';
    key.classList.add('wrong', keyType);
    wrongKeys.add(selectedNote);
    isFirstGuess = false;
    
    logMessage(`❌ Try again! (or Skip to see the answer)`);
  }
}

function skipCurrentNote() {
  if (gameState !== 'guessing' || !testNote) {
    return;
  }
  
  gameState = 'answered';
  sessionStats.currentStreak = 0; // Reset streak on skip
  
  // Update stats
  updateNoteStats(testNote, false);
  sessionStats.wrongSkipped++;
  sessionStats.totalNotes++;
  
  // Show correct answer
  const correctKey = document.getElementById(`key-${testNote}`);
  const keyType = whiteKeys.includes(testNote) ? 'white-key' : 'black-key';
  correctKey.classList.add('correct', keyType);
  
  logMessage(`⏭️ Skipped! The answer was ${testNote}`);
  updateStatsDisplay();
  logStatsToFile();
  
  // Reset button text
  document.getElementById('newNote').textContent = 'New Note';
  
  testNote = null;
}

function updateNoteStats(note, correctFirstTry) {
  const stats = JSON.parse(localStorage.getItem("detailedNoteStats") || "{}");
  
  if (!stats[note]) {
    stats[note] = { 
      timesHeard: 0, 
      correctFirst: 0, 
      missed: 0 
    };
  }
  
  stats[note].timesHeard++;
  
  if (correctFirstTry) {
    stats[note].correctFirst++;
  } else {
    stats[note].missed++;
  }
  
  localStorage.setItem("detailedNoteStats", JSON.stringify(stats));
}

function updateStatsDisplay() {
  document.getElementById('correctFirst').textContent = sessionStats.correctFirst;
  document.getElementById('wrongSkipped').textContent = sessionStats.wrongSkipped;
  document.getElementById('totalNotes').textContent = sessionStats.totalNotes;
  document.getElementById('currentStreak').textContent = sessionStats.currentStreak;
  document.getElementById('bestStreak').textContent = sessionStats.bestStreak;
  
  const accuracy = sessionStats.totalNotes > 0 
    ? Math.round((sessionStats.correctFirst / sessionStats.totalNotes) * 100)
    : 0;
  document.getElementById('accuracy').textContent = accuracy + '%';
}

function saveBestStreak() {
  localStorage.setItem('bestStreak', sessionStats.bestStreak.toString());
}

function loadBestStreak() {
  const saved = localStorage.getItem('bestStreak');
  if (saved) {
    sessionStats.bestStreak = parseInt(saved);
    updateStatsDisplay();
  }
}

function showStatsTable() {
  const modal = document.getElementById('statsModal');
  const tableBody = document.getElementById('statsTableBody');
  const stats = JSON.parse(localStorage.getItem("detailedNoteStats") || "{}");
  
  // Clear existing table
  tableBody.innerHTML = '';
  
  // Populate table
  notes.forEach(note => {
    const noteStats = stats[note] || { timesHeard: 0, correctFirst: 0, missed: 0 };
    const accuracy = noteStats.timesHeard > 0 
      ? Math.round((noteStats.correctFirst / noteStats.timesHeard) * 100)
      : 0;
    
    const row = tableBody.insertRow();
    row.insertCell(0).textContent = note; // Full note name with octave
    row.insertCell(1).textContent = noteStats.timesHeard;
    row.insertCell(2).textContent = noteStats.correctFirst;
    row.insertCell(3).textContent = noteStats.missed;
    row.insertCell(4).textContent = accuracy + '%';
  });
  
  modal.style.display = 'block';
}

function closeStatsModal() {
  document.getElementById('statsModal').style.display = 'none';
}

// File logging function for offline stats tracking
function logStatsToFile() {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp: timestamp,
    sessionStats: { ...sessionStats },
    detailedStats: JSON.parse(localStorage.getItem("detailedNoteStats") || "{}"),
    lastNote: testNote,
    wasCorrectFirstTry: isFirstGuess
  };
  
  // Create downloadable file content
  const logContent = JSON.stringify(logEntry, null, 2) + '\n';
  
  // Store in localStorage for now (since we can't write files directly from browser)
  const existingLogs = localStorage.getItem('statsLogs') || '';
  localStorage.setItem('statsLogs', existingLogs + logContent);
  
  console.log('Stats logged:', logEntry);
}

// Function to download all logged stats
function downloadStatsLog() {
  const logs = localStorage.getItem('statsLogs') || '';
  if (!logs) {
    alert('No stats to download yet!');
    return;
  }
  
  const blob = new Blob([logs], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ear-trainer-stats-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Function to reset all statistics
function resetAllStats() {
  if (confirm('Are you sure you want to reset ALL statistics? This cannot be undone!')) {
    // Clear all localStorage data
    localStorage.removeItem('detailedNoteStats');
    localStorage.removeItem('statsLogs');
    localStorage.removeItem('bestStreak');
    
    // Reset session stats
    sessionStats = {
      correctFirst: 0,
      wrongSkipped: 0,
      totalNotes: 0,
      currentStreak: 0,
      bestStreak: 0
    };
    
    // Update display
    updateStatsDisplay();
    logMessage('All statistics have been reset!');
    
    console.log('All stats reset');
  }
}

function logMessage(msg) {
  document.getElementById("log").innerText = msg;
}

// Setup event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setupKeyboard();
  
  // Add event listeners for buttons
  document.getElementById('initBtn').addEventListener('click', initializeAudio);
  document.getElementById('replayC').addEventListener('click', playReferenceNote);
  document.getElementById('replayTest').addEventListener('click', playTestNote);
  document.getElementById('newNote').addEventListener('click', generateTestNote);
  document.getElementById('skipNote').addEventListener('click', skipCurrentNote);
  document.getElementById('showTable').addEventListener('click', showStatsTable);
  
  // Modal event listeners
  document.querySelector('.close').addEventListener('click', closeStatsModal);
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('statsModal');
    if (event.target === modal) {
      closeStatsModal();
    }
  });
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
      event.preventDefault();
      if (gameState === 'waiting') {
        generateTestNote();
      } else if (gameState === 'guessing') {
        playTestNote();
      }
    } else if (event.code === 'KeyS') {
      event.preventDefault();
      if (gameState === 'guessing') {
        skipCurrentNote();
      }
    } else if (event.code === 'KeyD') {
      event.preventDefault();
      downloadStatsLog();
    }
  });
  
  logMessage('Click "Start Audio" first, then "New Note" to begin!');
  updateStatsDisplay();
});
