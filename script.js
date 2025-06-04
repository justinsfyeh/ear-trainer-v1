// Check if Tone.js is loaded
if (typeof Tone === 'undefined') {
  console.error('Tone.js is not loaded!');
}

// Settings configuration
let settings = {
  selectedNotes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  startOctave: 4,
  endOctave: 5,
  includeEndOctaveC: true
};

// Dynamic note arrays based on settings
let notes = [];
let whiteKeys = [];
let blackKeys = [];

// All possible note names (without octave)
const allNoteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const whiteKeyNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const blackKeyNames = ['C#', 'D#', 'F#', 'G#', 'A#'];

// Generate notes based on current settings
function generateNoteArrays() {
  notes = [];
  whiteKeys = [];
  blackKeys = [];
  
  for (let octave = settings.startOctave; octave <= settings.endOctave; octave++) {
    for (let noteName of allNoteNames) {
      // Special case: if we're at the end octave and includeEndOctaveC is true,
      // only include C from the end octave
      if (octave === settings.endOctave && settings.includeEndOctaveC) {
        if (noteName !== 'C') continue;
      }
      
      // Check if this note is selected in settings
      if (settings.selectedNotes.includes(noteName)) {
        const fullNote = noteName + octave;
        notes.push(fullNote);
        
        if (whiteKeyNames.includes(noteName)) {
          whiteKeys.push(fullNote);
        } else {
          blackKeys.push(fullNote);
        }
      }
    }
  }
  
  // If we didn't include C from end octave, don't add it
  if (!settings.includeEndOctaveC && settings.endOctave > settings.startOctave) {
    // Remove any C notes from the end octave
    const endOctaveC = 'C' + settings.endOctave;
    notes = notes.filter(note => note !== endOctaveC);
    whiteKeys = whiteKeys.filter(note => note !== endOctaveC);
  }
  
  console.log('Generated notes:', notes);
  console.log('White keys:', whiteKeys);
  console.log('Black keys:', blackKeys);
}

// Initialize with default settings
generateNoteArrays();

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
      logMessage('Loading piano samples...');
      await Tone.start();
      
      // Try to create piano with samples first
      try {
        piano = new Tone.Sampler({
          urls: {
            A0: "A0.mp3",
            C1: "C1.mp3",
            "D#1": "Ds1.mp3",
            "F#1": "Fs1.mp3",
            A1: "A1.mp3",
            C2: "C2.mp3",
            "D#2": "Ds2.mp3",
            "F#2": "Fs2.mp3",
            A2: "A2.mp3",
            C3: "C3.mp3",
            "D#3": "Ds3.mp3",
            "F#3": "Fs3.mp3",
            A3: "A3.mp3",
            C4: "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            A4: "A4.mp3",
            C5: "C5.mp3",
            "D#5": "Ds5.mp3",
            "F#5": "Fs5.mp3",
            A5: "A5.mp3",
            C6: "C6.mp3",
            "D#6": "Ds6.mp3",
            "F#6": "Fs6.mp3",
            A6: "A6.mp3",
            C7: "C7.mp3",
            "D#7": "Ds7.mp3",
            "F#7": "Fs7.mp3",
            A7: "A7.mp3",
            C8: "C8.mp3"
          },
          release: 1,
          baseUrl: "https://tonejs.github.io/audio/salamander/",
          onload: () => {
            console.log('Piano samples loaded successfully');
            logMessage('🎹 Real piano loaded! Click "New Note" to start.');
          },
          onerror: (error) => {
            console.error('Error loading piano samples:', error);
            createFallbackPiano();
          }
        }).toDestination();
        
        // Set a timeout to detect loading issues
        setTimeout(() => {
          if (piano.loaded === false) {
            console.warn('Piano samples taking too long to load, using fallback');
            createFallbackPiano();
          }
        }, 15000); // 15 second timeout
        
      } catch (error) {
        console.error('Error creating sampler:', error);
        createFallbackPiano();
      }
      
      // Add some reverb for acoustic space
      const reverb = new Tone.Reverb({
        decay: 1.5,
        wet: 0.2
      }).toDestination();
      
      if (piano) {
        piano.connect(reverb);
      }
      
      audioInitialized = true;
      console.log('Audio context started successfully');
      console.log('Tone context state:', Tone.context.state);
      document.getElementById('initBtn').style.display = 'none';
      updateStatsDisplay();
      loadBestStreak();
    }
  } catch (error) {
    console.error('Error initializing audio:', error);
    logMessage('Error starting audio. Please try again.');
  }
}

function createFallbackPiano() {
  console.log('Creating fallback piano...');
  logMessage('⚠️ Using synthesized piano sound.');
  
  if (piano && piano.dispose) {
    piano.dispose();
  }
  
  piano = new Tone.PolySynth(Tone.Synth, {
    oscillator: { 
      type: "triangle"
    },
    envelope: { 
      attack: 0.02, 
      decay: 0.1, 
      sustain: 0.3, 
      release: 1 
    }
  }).toDestination();
  
  console.log('Fallback piano created successfully');
}

function setupKeyboard() {
  updateKeyboard();
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
    
    if (!piano) {
      console.error('Piano not initialized');
      logMessage('Error: Piano not ready. Please try "Start Audio" again.');
      return;
    }
    
    // Use triggerAttackRelease for both Sampler and PolySynth
    if (piano.triggerAttackRelease) {
      piano.triggerAttackRelease(note, "1n");
    } else {
      console.error('Piano triggerAttackRelease method not available');
      logMessage('Error playing sound. Please refresh and try again.');
      return;
    }
    
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
  console.log('showStatsTable called'); // Debug log
  const modal = document.getElementById('statsModal');
  const tableBody = document.getElementById('statsTableBody');
  const stats = JSON.parse(localStorage.getItem("detailedNoteStats") || "{}");
  
  console.log('Stats data:', stats); // Debug log
  
  // Clear existing table
  tableBody.innerHTML = '';
  
  // Prepare data for sorting and analysis
  const noteData = notes.map(note => {
    const noteStats = stats[note] || { timesHeard: 0, correctFirst: 0, missed: 0 };
    const accuracy = noteStats.timesHeard > 0 
      ? Math.round((noteStats.correctFirst / noteStats.timesHeard) * 100)
      : 0;
    
    return {
      note: note,
      timesHeard: noteStats.timesHeard,
      correctFirst: noteStats.correctFirst,
      missed: noteStats.missed,
      accuracy: accuracy
    };
  });
  
  console.log('Processed note data:', noteData); // Debug log
  
  // Find best performing note
  const bestNote = noteData.reduce((best, current) => 
    current.accuracy > best.accuracy ? current : best, noteData[0]);
  
  // Sort by accuracy (descending) by default
  noteData.sort((a, b) => b.accuracy - a.accuracy);
  
  // Populate table with enhanced visuals
  noteData.forEach((data, index) => {
    console.log(`Creating row ${index} for note ${data.note}`); // Debug log
    const row = tableBody.insertRow();
    
    // Note name with black key formatting
    const noteCell = row.insertCell(0);
    if (blackKeys.includes(data.note)) {
      const blackKeyLabels = {
        'C#4': 'C#/Db',
        'D#4': 'D#/Eb', 
        'F#4': 'F#/Gb',
        'G#4': 'G#/Ab',
        'A#4': 'A#/Bb'
      };
      noteCell.innerHTML = `<strong>${blackKeyLabels[data.note]}</strong>`;
    } else {
      noteCell.textContent = data.note.slice(0, -1); // Remove octave for white keys
    }
    
    // Times heard with icon
    const timesHeardCell = row.insertCell(1);
    timesHeardCell.innerHTML = `${data.timesHeard > 0 ? '🎵' : '⚪'} ${data.timesHeard}`;
    
    // Correct first try with success icon
    const correctCell = row.insertCell(2);
    correctCell.innerHTML = `${data.correctFirst > 0 ? '✅' : ''} ${data.correctFirst}`;
    
    // Missed/skipped with failure icon
    const missedCell = row.insertCell(3);
    missedCell.innerHTML = `${data.missed > 0 ? '❌' : ''} ${data.missed}`;
    
    // Accuracy with colored bar and best note indicator
    const accuracyCell = row.insertCell(4);
    const isBestNote = data.note === bestNote.note && data.accuracy > 0;
    
    // Create colored progress bar with improved DOM structure
    const progressContainer = document.createElement('div');
    progressContainer.className = 'accuracy-bar-container';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'accuracy-bar';
    progressBar.style.width = data.accuracy + '%';
    progressBar.style.backgroundColor = getAccuracyColor(data.accuracy);
    
    const progressText = document.createElement('span');
    progressText.className = 'accuracy-text';
    progressText.textContent = data.accuracy + '%' + (isBestNote ? ' 🥇' : '');
    
    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);
    accuracyCell.appendChild(progressContainer);
    
    // Apply background color gradient to the cell
    accuracyCell.style.backgroundColor = getAccuracyBackgroundColor(data.accuracy);
    
    // Add streak indicator for current best performing notes
    if (data.accuracy === 100 && data.timesHeard >= 3) {
      noteCell.innerHTML += ' 🔥';
    }
    
    console.log(`Row ${index} created successfully`); // Debug log
  });
  
  console.log('Table populated, showing modal'); // Debug log
  modal.style.display = 'block';
}

// Helper function to get accuracy bar color
function getAccuracyColor(accuracy) {
  if (accuracy >= 80) return '#4CAF50'; // Green
  if (accuracy >= 60) return '#FFC107'; // Yellow
  if (accuracy >= 40) return '#FF9800'; // Orange
  return '#F44336'; // Red
}

// Helper function to get background color gradient
function getAccuracyBackgroundColor(accuracy) {
  const red = Math.max(0, 255 - (accuracy * 2.55));
  const green = Math.min(255, accuracy * 2.55);
  return `rgba(${red}, ${green}, 0, 0.1)`;
}

// Function to sort table
function sortStatsTable(column) {
  const tableBody = document.getElementById('statsTableBody');
  const stats = JSON.parse(localStorage.getItem("detailedNoteStats") || "{}");
  
  // Prepare data
  const noteData = notes.map(note => {
    const noteStats = stats[note] || { timesHeard: 0, correctFirst: 0, missed: 0 };
    const accuracy = noteStats.timesHeard > 0 
      ? Math.round((noteStats.correctFirst / noteStats.timesHeard) * 100)
      : 0;
    
    return {
      note: note,
      timesHeard: noteStats.timesHeard,
      correctFirst: noteStats.correctFirst,
      missed: noteStats.missed,
      accuracy: accuracy
    };
  });
  
  // Sort based on column
  switch(column) {
    case 'accuracy':
      noteData.sort((a, b) => b.accuracy - a.accuracy);
      break;
    case 'timesHeard':
      noteData.sort((a, b) => b.timesHeard - a.timesHeard);
      break;
    case 'worst':
      noteData.sort((a, b) => {
        // Sort by lowest accuracy, but put unplayed notes last
        if (a.timesHeard === 0 && b.timesHeard === 0) return 0;
        if (a.timesHeard === 0) return 1;
        if (b.timesHeard === 0) return -1;
        return a.accuracy - b.accuracy;
      });
      break;
    case 'note':
      noteData.sort((a, b) => notes.indexOf(a.note) - notes.indexOf(b.note));
      break;
  }
  
  // Clear and repopulate table
  tableBody.innerHTML = '';
  
  // Find best performing note
  const bestNote = noteData.reduce((best, current) => 
    current.accuracy > best.accuracy ? current : best, noteData[0]);
  
  noteData.forEach(data => {
    const row = tableBody.insertRow();
    
    // Note name with black key formatting
    const noteCell = row.insertCell(0);
    if (blackKeys.includes(data.note)) {
      const blackKeyLabels = {
        'C#4': 'C#/Db',
        'D#4': 'D#/Eb', 
        'F#4': 'F#/Gb',
        'G#4': 'G#/Ab',
        'A#4': 'A#/Bb'
      };
      noteCell.innerHTML = `<strong>${blackKeyLabels[data.note]}</strong>`;
    } else {
      noteCell.textContent = data.note.slice(0, -1);
    }
    
    // Times heard with icon
    const timesHeardCell = row.insertCell(1);
    timesHeardCell.innerHTML = `${data.timesHeard > 0 ? '🎵' : '⚪'} ${data.timesHeard}`;
    
    // Correct first try with success icon
    const correctCell = row.insertCell(2);
    correctCell.innerHTML = `${data.correctFirst > 0 ? '✅' : ''} ${data.correctFirst}`;
    
    // Missed/skipped with failure icon
    const missedCell = row.insertCell(3);
    missedCell.innerHTML = `${data.missed > 0 ? '❌' : ''} ${data.missed}`;
    
    // Accuracy with colored bar and best note indicator
    const accuracyCell = row.insertCell(4);
    const isBestNote = data.note === bestNote.note && data.accuracy > 0;
    
    // Create colored progress bar with improved DOM structure
    const progressContainer = document.createElement('div');
    progressContainer.className = 'accuracy-bar-container';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'accuracy-bar';
    progressBar.style.width = data.accuracy + '%';
    progressBar.style.backgroundColor = getAccuracyColor(data.accuracy);
    
    const progressText = document.createElement('span');
    progressText.className = 'accuracy-text';
    progressText.textContent = data.accuracy + '%' + (isBestNote ? ' 🥇' : '');
    
    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);
    accuracyCell.appendChild(progressContainer);
    
    // Apply background color gradient to the cell
    accuracyCell.style.backgroundColor = getAccuracyBackgroundColor(data.accuracy);
    
    // Add streak indicator for perfect notes
    if (data.accuracy === 100 && data.timesHeard >= 3) {
      noteCell.innerHTML += ' 🔥';
    }
  });
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
  document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);
  document.getElementById('replayC').addEventListener('click', playReferenceNote);
  document.getElementById('replayTest').addEventListener('click', playTestNote);
  document.getElementById('newNote').addEventListener('click', generateTestNote);
  document.getElementById('skipNote').addEventListener('click', skipCurrentNote);
  document.getElementById('showTable').addEventListener('click', showStatsTable);
  
  // Modal event listeners
  document.querySelector('.close').addEventListener('click', closeStatsModal);
  document.querySelector('.settings-close').addEventListener('click', closeSettingsModal);
  window.addEventListener('click', function(event) {
    const statsModal = document.getElementById('statsModal');
    const settingsModal = document.getElementById('settingsModal');
    if (event.target === statsModal) {
      closeStatsModal();
    }
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });
  
  // Settings event listeners
  document.getElementById('startOctave').addEventListener('change', updateRangeDisplay);
  document.getElementById('endOctave').addEventListener('change', updateRangeDisplay);
  
  // Update range display when note checkboxes change
  allNoteNames.forEach(noteName => {
    const checkbox = document.getElementById(`note-${noteName.replace('#', '#')}`);
    if (checkbox) {
      checkbox.addEventListener('change', updateRangeDisplay);
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
  
  // Load saved settings
  loadSettings();
  
  logMessage('Click "Start Audio" first, then "New Note" to begin!');
  updateStatsDisplay();
  
  // Make functions globally accessible for Chrome compatibility
  window.toggleStatsView = toggleStatsView;
  window.showChart = showChart;
  window.sortStatsTable = sortStatsTable;
  window.downloadStatsLog = downloadStatsLog;
  window.resetAllStats = resetAllStats;
  window.testPiano = testPiano;
  window.saveSettings = saveSettings;
  window.resetToDefaults = resetToDefaults;
  window.selectPreset = selectPreset;
  
  console.log('All functions loaded and made globally accessible');
});

// Debug function to test piano
function testPiano() {
  console.log('Testing piano...');
  console.log('Piano object:', piano);
  console.log('Piano loaded:', piano ? piano.loaded : 'Piano not initialized');
  console.log('Audio context state:', Tone.context.state);
  console.log('Audio initialized:', audioInitialized);
  
  if (piano && piano.triggerAttackRelease) {
    try {
      piano.triggerAttackRelease("C4", "1n");
      console.log('Test note C4 triggered successfully');
    } catch (error) {
      console.error('Error triggering test note:', error);
    }
  } else {
    console.error('Piano not ready for testing');
  }
}

// Chart functionality
let currentChart = null;

function toggleStatsView() {
  console.log('toggleStatsView called'); // Debug log
  const tableView = document.getElementById('tableView');
  const chartView = document.getElementById('chartView');
  const toggleBtn = document.getElementById('viewToggle');
  
  if (!tableView || !chartView || !toggleBtn) {
    console.error('Missing elements for toggleStatsView');
    return;
  }
  
  if (tableView.style.display === 'none') {
    // Show table, hide chart
    tableView.style.display = 'block';
    chartView.style.display = 'none';
    toggleBtn.textContent = '📊 Show Charts';
  } else {
    // Show chart, hide table
    tableView.style.display = 'none';
    chartView.style.display = 'block';
    toggleBtn.textContent = '📋 Show Table';
    
    // Show default accuracy chart
    showChart('accuracy');
  }
}

function showChart(type) {
  console.log('showChart called with type:', type); // Debug log
  
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    alert('Chart.js library failed to load. Please refresh the page.');
    return;
  }
  
  const stats = JSON.parse(localStorage.getItem("detailedNoteStats") || "{}");
  const canvas = document.getElementById('statsChart');
  
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
  
  // Prepare data
  const noteData = notes.map(note => {
    const noteStats = stats[note] || { timesHeard: 0, correctFirst: 0, missed: 0 };
    const accuracy = noteStats.timesHeard > 0 
      ? Math.round((noteStats.correctFirst / noteStats.timesHeard) * 100)
      : 0;
    
    return {
      note: note,
      displayNote: blackKeys.includes(note) ? 
        ({'C#4': 'C#/Db', 'D#4': 'D#/Eb', 'F#4': 'F#/Gb', 'G#4': 'G#/Ab', 'A#4': 'A#/Bb'}[note]) : 
        note.slice(0, -1),
      timesHeard: noteStats.timesHeard,
      correctFirst: noteStats.correctFirst,
      missed: noteStats.missed,
      accuracy: accuracy
    };
  });
  
  try {
    switch(type) {
      case 'accuracy':
        createAccuracyChart(ctx, noteData);
        break;
      case 'performance':
        createPerformanceChart(ctx, noteData);
        break;
      case 'radar':
        createRadarChart(ctx, noteData);
        break;
      default:
        console.error('Unknown chart type:', type);
    }
  } catch (error) {
    console.error('Error creating chart:', error);
    alert('Error creating chart: ' + error.message);
  }
}

function createAccuracyChart(ctx, noteData) {
  const labels = noteData.map(d => d.displayNote);
  const accuracyData = noteData.map(d => d.accuracy);
  const backgroundColors = accuracyData.map(accuracy => {
    if (accuracy >= 80) return '#4CAF50';
    if (accuracy >= 60) return '#FFC107';
    if (accuracy >= 40) return '#FF9800';
    return '#F44336';
  });
  
  currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Accuracy %',
        data: accuracyData,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '📈 Note Accuracy Performance'
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Accuracy (%)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Notes'
          }
        }
      }
    }
  });
}

function createPerformanceChart(ctx, noteData) {
  const labels = noteData.map(d => d.displayNote);
  
  currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Correct First Try',
          data: noteData.map(d => d.correctFirst),
          backgroundColor: '#4CAF50',
          borderColor: '#4CAF50',
          borderWidth: 1
        },
        {
          label: 'Missed/Skipped',
          data: noteData.map(d => d.missed),
          backgroundColor: '#F44336',
          borderColor: '#F44336',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '📊 Correct vs Missed Attempts'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Attempts'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Notes'
          }
        }
      }
    }
  });
}

function createRadarChart(ctx, noteData) {
  // Only show notes that have been played
  const playedNotes = noteData.filter(d => d.timesHeard > 0);
  
  if (playedNotes.length === 0) {
    // Show message if no data
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No data available yet. Play some notes first!', ctx.canvas.width/2, ctx.canvas.height/2);
    return;
  }
  
  const labels = playedNotes.map(d => d.displayNote);
  const accuracyData = playedNotes.map(d => d.accuracy);
  
  currentChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Accuracy %',
        data: accuracyData,
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: '#4CAF50',
        borderWidth: 2,
        pointBackgroundColor: '#4CAF50',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#4CAF50'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '🎯 Note Familiarity Radar'
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Accuracy (%)'
          }
        }
      }
    }
  });
}

// ================================
// SETTINGS FUNCTIONALITY
// ================================

// Load settings from localStorage
function loadSettings() {
  const savedSettings = localStorage.getItem('earTrainerSettings');
  if (savedSettings) {
    settings = { ...settings, ...JSON.parse(savedSettings) };
  }
  generateNoteArrays();
  updateKeyboard();
}

// Save settings to localStorage
function saveSettings() {
  // Get selected notes from checkboxes
  const selectedNotes = [];
  allNoteNames.forEach(noteName => {
    const checkbox = document.getElementById(`note-${noteName.replace('#', '#')}`);
    if (checkbox && checkbox.checked) {
      selectedNotes.push(noteName);
    }
  });
  
  // Get octave range
  const startOctave = parseInt(document.getElementById('startOctave').value);
  const endOctave = parseInt(document.getElementById('endOctave').value);
  
  // Validate settings
  if (selectedNotes.length === 0) {
    alert('Please select at least one note!');
    return;
  }
  
  if (startOctave > endOctave) {
    alert('Start octave cannot be higher than end octave!');
    return;
  }
  
  // Update settings
  settings.selectedNotes = selectedNotes;
  settings.startOctave = startOctave;
  settings.endOctave = endOctave;
  settings.includeEndOctaveC = true; // Always include end octave C for now
  
  // Save to localStorage
  localStorage.setItem('earTrainerSettings', JSON.stringify(settings));
  
  // Regenerate note arrays and update keyboard
  generateNoteArrays();
  updateKeyboard();
  
  // Close modal
  closeSettingsModal();
  
  // Show confirmation
  logMessage(`⚙️ Settings saved! Now practicing with ${notes.length} notes from ${settings.selectedNotes.join(', ')} (octaves ${settings.startOctave}-${settings.endOctave})`);
}

// Reset settings to defaults
function resetToDefaults() {
  settings = {
    selectedNotes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    startOctave: 4,
    endOctave: 5,
    includeEndOctaveC: true
  };
  
  // Update UI to reflect defaults
  updateSettingsUI();
  updateRangeDisplay();
}

// Update the settings UI with current values
function updateSettingsUI() {
  // Update note checkboxes
  allNoteNames.forEach(noteName => {
    const checkbox = document.getElementById(`note-${noteName.replace('#', '#')}`);
    if (checkbox) {
      checkbox.checked = settings.selectedNotes.includes(noteName);
    }
  });
  
  // Update octave selects
  document.getElementById('startOctave').value = settings.startOctave;
  document.getElementById('endOctave').value = settings.endOctave;
  
  updateRangeDisplay();
}

// Update the range display information
function updateRangeDisplay() {
  const startOctave = parseInt(document.getElementById('startOctave').value);
  const endOctave = parseInt(document.getElementById('endOctave').value);
  
  // Count selected notes
  const selectedCount = allNoteNames.filter(noteName => {
    const checkbox = document.getElementById(`note-${noteName.replace('#', '#')}`);
    return checkbox && checkbox.checked;
  }).length;
  
  // Calculate total notes in range
  let totalNotesInRange;
  if (startOctave === endOctave) {
    totalNotesInRange = selectedCount;
  } else {
    const octaveSpan = endOctave - startOctave;
    totalNotesInRange = (selectedCount * octaveSpan) + (settings.selectedNotes.includes('C') ? 1 : 0);
  }
  
  document.getElementById('rangeDisplay').textContent = 
    `C${startOctave} to C${endOctave} (${totalNotesInRange} notes)`;
  document.getElementById('noteCount').textContent = totalNotesInRange;
}

// Select preset note combinations
function selectPreset(preset) {
  // Remove active class from all preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to clicked button
  event.target.classList.add('active');
  
  // Uncheck all notes first
  allNoteNames.forEach(noteName => {
    const checkbox = document.getElementById(`note-${noteName.replace('#', '#')}`);
    if (checkbox) {
      checkbox.checked = false;
    }
  });
  
  // Apply preset
  let notesToSelect = [];
  switch(preset) {
    case 'all':
      notesToSelect = allNoteNames;
      break;
    case 'white':
      notesToSelect = whiteKeyNames;
      break;
    case 'black':
      notesToSelect = blackKeyNames;
      break;
    case 'white-fs':
      notesToSelect = [...whiteKeyNames, 'F#'];
      break;
    case 'custom':
      // Don't auto-select anything for custom
      break;
  }
  
  // Check the selected notes
  notesToSelect.forEach(noteName => {
    const checkbox = document.getElementById(`note-${noteName.replace('#', '#')}`);
    if (checkbox) {
      checkbox.checked = true;
    }
  });
  
  updateRangeDisplay();
}

// Show settings modal
function showSettingsModal() {
  const modal = document.getElementById('settingsModal');
  updateSettingsUI();
  modal.style.display = 'block';
}

// Close settings modal
function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'none';
}

// Update keyboard to reflect current note selection
function updateKeyboard() {
  // First remove existing keyboard
  const container = document.getElementById("keyboard");
  container.innerHTML = '';
  
  // Only show keys for notes that are currently in our selection
  const currentNotes = [...notes];
  
  // Create a mapping of note names to positions for the current octave range
  const notePositions = {};
  let whiteKeyIndex = 0;
  
  // Calculate positions for all possible notes in the range
  for (let octave = settings.startOctave; octave <= settings.endOctave; octave++) {
    whiteKeyNames.forEach((noteName, index) => {
      const fullNote = noteName + octave;
      if (octave === settings.endOctave && noteName !== 'C') return; // Only C from end octave
      
      if (notes.includes(fullNote)) {
        notePositions[fullNote] = whiteKeyIndex * 70;
        whiteKeyIndex++;
      }
    });
  }
  
  // Create white keys
  currentNotes.filter(note => whiteKeyNames.includes(note.slice(0, -1))).forEach(note => {
    const btn = document.createElement("div");
    btn.className = "key white-key";
    btn.innerText = note.slice(0, -1); // Just the note name
    btn.onclick = () => handleAnswer(note);
    btn.id = `key-${note}`;
    btn.setAttribute('data-note', note);
    btn.style.left = notePositions[note] + 'px';
    container.appendChild(btn);
  });
  
  // Create black keys with proper positioning
  const blackKeyOffsets = { 'C#': 47.5, 'D#': 117.5, 'F#': 257.5, 'G#': 327.5, 'A#': 397.5 };
  let octaveOffset = 0;
  
  for (let octave = settings.startOctave; octave <= settings.endOctave; octave++) {
    blackKeyNames.forEach(noteName => {
      const fullNote = noteName + octave;
      if (octave === settings.endOctave) return; // No black keys from end octave
      
      if (notes.includes(fullNote)) {
        const btn = document.createElement("div");
        btn.className = "key black-key";
        btn.innerText = ({'C#': 'C#/Db', 'D#': 'D#/Eb', 'F#': 'F#/Gb', 'G#': 'G#/Ab', 'A#': 'A#/Bb'})[noteName.slice(0, -1)] || noteName;
        btn.onclick = () => handleAnswer(fullNote);
        btn.id = `key-${fullNote}`;
        btn.setAttribute('data-note', fullNote);
        btn.style.left = (blackKeyOffsets[noteName.slice(0, -1)] + octaveOffset) + 'px';
        container.appendChild(btn);
      }
    });
    
    // Calculate octave offset for next octave (8 white keys * 70px, but only if we have more octaves)
    if (octave < settings.endOctave) {
      const whiteKeysInOctave = whiteKeyNames.filter(name => {
        return settings.selectedNotes.includes(name);
      }).length;
      octaveOffset += whiteKeysInOctave * 70;
    }
  }
}

// Event listeners for settings
document.addEventListener('DOMContentLoaded', function() {
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);
  
  // Settings modal close buttons
  document.querySelector('.settings-close').addEventListener('click', closeSettingsModal);
  
  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const settingsModal = document.getElementById('settingsModal');
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });
  
  // Update range display when octave selects change
  document.getElementById('startOctave').addEventListener('change', updateRangeDisplay);
  document.getElementById('endOctave').addEventListener('change', updateRangeDisplay);
  
  // Update range display when note checkboxes change
  allNoteNames.forEach(noteName => {
    const checkbox = document.getElementById(`note-${noteName.replace('#', '#')}`);
    if (checkbox) {
      checkbox.addEventListener('change', updateRangeDisplay);
    }
  });
  
  // Load saved settings on page load
  loadSettings();
});
