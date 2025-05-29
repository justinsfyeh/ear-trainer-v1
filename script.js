// Check if Tone.js is loaded
if (typeof Tone === 'undefined') {
  console.error('Tone.js is not loaded!');
}

const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
let testNote = null;
let audioInitialized = false;

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
    container.appendChild(btn);
  });
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
  const randomIndex = Math.floor(Math.random() * notes.length);
  testNote = notes[randomIndex];
  await playNote(testNote);
  logMessage("Guess the note!");
}

async function playTestNote() {
  if (testNote) {
    await playNote(testNote);
  } else {
    logMessage("No test note to replay. Click 'New Note' first.");
  }
}

async function handleAnswer(selectedNote) {
  const correct = selectedNote === testNote;
  updateStats(selectedNote, correct);
  logMessage(correct ? `✅ Correct! It was ${testNote}` : `❌ Wrong. It was ${testNote}`);
  testNote = null; // Reset after answer
}

function updateStats(note, correct) {
  const stats = JSON.parse(localStorage.getItem("noteStats") || "{}");
  if (!stats[note]) stats[note] = { correct: 0, total: 0 };
  stats[note].total += 1;
  if (correct) stats[note].correct += 1;
  localStorage.setItem("noteStats", JSON.stringify(stats));
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
  
  logMessage('Click "Start Audio" first, then "New Note" to begin!');
});
