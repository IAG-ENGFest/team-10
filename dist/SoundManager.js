// Classic 80s game sound effects using Web Audio API
export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.soundsEnabled = true;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        catch (e) {
            console.warn('Web Audio API not supported');
            this.soundsEnabled = false;
        }
    }
    playTone(frequency, duration, type = 'square', volume = 0.3) {
        if (!this.audioContext || !this.soundsEnabled)
            return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    playChord(frequencies, duration, type = 'square', volume = 0.2) {
        if (!this.audioContext || !this.soundsEnabled)
            return;
        frequencies.forEach(freq => {
            this.playTone(freq, duration, type, volume / frequencies.length);
        });
    }
    // Classic 80s game sounds
    playSpawn() {
        // Rising tone - like Pac-Man power pellet
        this.playTone(200, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(300, 0.1, 'square', 0.2), 50);
    }
    playPowerActivate() {
        // Power-up sound - like Mario power-up
        this.playTone(400, 0.15, 'square', 0.3);
        setTimeout(() => this.playTone(600, 0.15, 'square', 0.3), 100);
        setTimeout(() => this.playTone(800, 0.2, 'square', 0.3), 200);
    }
    playBridgeBuild() {
        // Building sound - ascending notes
        this.playTone(300, 0.1, 'square', 0.25);
        setTimeout(() => this.playTone(400, 0.1, 'square', 0.25), 80);
        setTimeout(() => this.playTone(500, 0.1, 'square', 0.25), 160);
    }
    playDoorBreak() {
        // Breaking sound - descending notes
        this.playTone(500, 0.1, 'square', 0.3);
        setTimeout(() => this.playTone(300, 0.1, 'square', 0.3), 80);
        setTimeout(() => this.playTone(150, 0.15, 'square', 0.3), 160);
    }
    playBribe() {
        // Money/coin sound - like coin collection
        this.playTone(800, 0.1, 'square', 0.3);
        setTimeout(() => this.playTone(1000, 0.15, 'square', 0.3), 100);
    }
    playCollision() {
        // Bump sound - like hitting a wall
        this.playTone(150, 0.1, 'square', 0.2);
    }
    playPassengerStolen() {
        // Negative sound - like losing a life
        this.playTone(200, 0.2, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.3), 150);
    }
    playReachGate() {
        // Success sound - like collecting item
        this.playTone(600, 0.1, 'square', 0.3);
        setTimeout(() => this.playTone(800, 0.1, 'square', 0.3), 100);
        setTimeout(() => this.playTone(1000, 0.15, 'square', 0.3), 200);
    }
    playLevelComplete() {
        // Victory fanfare - classic 80s style
        this.playTone(523, 0.2, 'square', 0.3); // C
        setTimeout(() => this.playTone(659, 0.2, 'square', 0.3), 200); // E
        setTimeout(() => this.playTone(784, 0.2, 'square', 0.3), 400); // G
        setTimeout(() => this.playTone(1047, 0.4, 'square', 0.4), 600); // C (high)
    }
    playGameOver() {
        // Game over sound - descending sad notes
        this.playTone(400, 0.3, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(300, 0.3, 'sawtooth', 0.3), 300);
        setTimeout(() => this.playTone(200, 0.4, 'sawtooth', 0.3), 600);
    }
    playClick() {
        // UI click sound
        this.playTone(800, 0.05, 'square', 0.15);
    }
    playSelect() {
        // Selection sound
        this.playTone(600, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(700, 0.1, 'square', 0.2), 50);
    }
    playWarning() {
        // Warning sound - like alert
        this.playTone(400, 0.1, 'square', 0.25);
        setTimeout(() => this.playTone(400, 0.1, 'square', 0.25), 150);
    }
    toggleSounds() {
        this.soundsEnabled = !this.soundsEnabled;
    }
    setSoundsEnabled(enabled) {
        this.soundsEnabled = enabled;
    }
}
//# sourceMappingURL=SoundManager.js.map