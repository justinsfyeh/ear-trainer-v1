// Check if Tone.js is loaded
if (typeof Tone === 'undefined') {
  console.error('Tone.js is not loaded!');
}

const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
let testNote = null;
let audioInitialized = false;
let gameState = 'waiting'; // 'waiting', 'guessing', 'answered'
let wrongKeys = new Set();
let isFirstGuess = true;

// Stats tracking
let sessionStats = {
  correctFirst: 0,
  wrongSkipped: 0,
  totalNotes: 0
};

async function initializeAudio() {
  try {
    if (!audioInitialized) {
      console.log('Starting Tone.js audio context...');
      await Tone.start();
      audioInitialized = true;
      console.log('Audio context started successfully');
      console.log('Tone context state:', Tone.context.state);
      document.getElementById('initBtn').style.display = 'none';
      logMessage('Audio initialized! Click "New Note" to start.');
      updateStatsDisplay();
    }
  } catch (error) {
    console.error('Error initializing audio:', error);
    logMessage('Error starting audio. Please try again.');
  }
}

function setupKeyboard() {
  const container = document.getElementById("keyboard");
  notes.forEach(note => {
    const btn = document.createElement("div");
    btn.className = "key";
    btn.innerText = note.slice(0, -1); // Just the note name
    btn.onclick = () => handleAnswer(note);
    btn.id = `key-${note}`;
    container.appendChild(btn);
  });
}

function clearKeyStyles() {
  notes.forEach(note => {
    const key = document.getElementById(`key-${note}`);
    key.classList.remove('wrong', 'correct');
  });
  wrongKeys.clear();
}

async function playNote(note) {
  try {
    if (!audioInitialized) {
      await initializeAudio();
    }
    const synth = new Tone.Synth().toDestination();
    await synth.triggerAttackRelease(note, "1n");
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
    key.classList.add('correct');
    gameState = 'answered';
    
    // Update stats
    updateNoteStats(testNote, isFirstGuess);
    if (isFirstGuess) {
      sessionStats.correctFirst++;
    } else {
      sessionStats.wrongSkipped++;
    }
    sessionStats.totalNotes++;
    
    logMessage(`✅ Correct! It was ${testNote}`);
    updateStatsDisplay();
    
    // Reset button text
    document.getElementById('newNote').textContent = 'New Note';
    
    // Auto-play next note after 1.5 seconds
    setTimeout(async () => {
      await generateTestNote();
    }, 1500);
    
  } else {
    // Wrong answer
    key.classList.add('wrong');
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
  
  // Update stats
  updateNoteStats(testNote, false);
  sessionStats.wrongSkipped++;
  sessionStats.totalNotes++;
  
  // Show correct answer
  const correctKey = document.getElementById(`key-${testNote}`);
  correctKey.classList.add('correct');
  
  logMessage(`⏭️ Skipped! The answer was ${testNote}`);
  updateStatsDisplay();
  
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
  
  const accuracy = sessionStats.totalNotes > 0 
    ? Math.round((sessionStats.correctFirst / sessionStats.totalNotes) * 100)
    : 0;
  document.getElementById('accuracy').textContent = accuracy + '%';
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
    row.insertCell(0).textContent = note.slice(0, -1); // Note name without octave
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
  
  logMessage('Click "Start Audio" first, then "New Note" to begin!');
  updateStatsDisplay();
});
