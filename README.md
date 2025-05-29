# Ear Trainer v1.0

A comprehensive web-based ear training application with a realistic piano interface that helps you identify musical notes across a full chromatic octave.

## 🎹 Features

### Core Training
- **Full chromatic scale** from C4 to C5 (13 notes including sharps/flats)
- **Realistic piano keyboard** with proper white and black key layout
- **Piano-quality sound** using advanced audio synthesis with reverb
- **Auto-progression** to next note after correct answers
- **Smart wrong answer handling** - keys turn red, keep trying until correct

### Progress Tracking
- **Live stats display** with accuracy percentage
- **Streak tracking** - current and best streaks with fire emoji
- **Detailed per-note statistics** in a beautiful modal table
- **Offline stats logging** - download your progress as JSON files
- **Persistent best streak** saved across sessions

### User Experience
- **Visual feedback** - green flash for correct, red highlight for wrong
- **Keyboard shortcuts** - Space (play/new), S (skip), D (download stats)
- **Professional UI** with gradients, shadows, and smooth animations
- **Responsive design** works on desktop and mobile

## 🎯 How to Use

1. **Start Audio** → Initialize the piano synthesizer
2. **New Note** → Generate a random note to identify
3. **Click piano keys** to guess:
   - ✅ **Correct**: Green flash, streak continues, auto-play next note
   - ❌ **Wrong**: Red highlight, keep trying or skip
4. **Track progress** in real-time with accuracy and streaks
5. **View detailed stats** with the stats table button
6. **Download your data** for offline analysis

## ⌨️ Keyboard Shortcuts

- **Space**: Play new note / Replay current note
- **S**: Skip current note
- **D**: Download stats file

## 🎵 Audio Features

- **Piano synthesizer** with triangle wave oscillators
- **Realistic envelope** (attack, decay, sustain, release)
- **Reverb effect** for authentic piano sound
- **Polyphonic capability** for future chord training

## 📊 Stats Tracking

### Session Stats
- Correct first try count
- Wrong/skipped count  
- Overall accuracy percentage
- Current and best streaks

### Detailed Analytics
- Per-note performance breakdown
- Times each note was heard
- First-try success rate per note
- Individual note accuracy percentages

### Data Export
- Download complete session logs as JSON
- Includes timestamps and detailed statistics
- Perfect for tracking long-term progress

## 🎨 Visual Design

- **Realistic piano appearance** with proper key proportions
- **Gradient backgrounds** and subtle shadows
- **Smooth animations** for key presses and feedback
- **Color-coded feedback** (green=correct, red=wrong, orange=streak)
- **Professional typography** and spacing

## 🛠️ Technologies Used

- **HTML5** - Semantic structure
- **CSS3** - Advanced styling with gradients, animations, flexbox
- **JavaScript ES6+** - Modern async/await, classes, modules
- **Tone.js** - Professional audio synthesis and effects
- **Local Storage** - Persistent data without server dependency

## 🚀 Setup

No installation required! Just open `index.html` in any modern web browser.

## 🌐 Live Demo

🎵 **[Try the Ear Trainer Live!](https://justinsfyeh.github.io/ear-trainer-v1)** 🎵



## 📈 Perfect For

- **Music students** learning note identification
- **Musicians** maintaining and improving ear training skills  
- **Teachers** tracking student progress with downloadable stats
- **Anyone** interested in developing musical ear training

## 🎼 Future Enhancements

- Interval training mode
- Chord identification
- Scale recognition
- Difficulty levels
- Online leaderboards

## 📄 License

MIT License 