// Classic 80s game sound effects using Web Audio API
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private soundsEnabled: boolean = true;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.soundsEnabled = false;
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'square', volume: number = 0.3): void {
    if (!this.audioContext || !this.soundsEnabled) return;

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

  private playChord(frequencies: number[], duration: number, type: OscillatorType = 'square', volume: number = 0.2): void {
    if (!this.audioContext || !this.soundsEnabled) return;

    frequencies.forEach(freq => {
      this.playTone(freq, duration, type, volume / frequencies.length);
    });
  }

  // Classic 80s game sounds
  public playSpawn(): void {
    // Rising tone - like Pac-Man power pellet
    this.playTone(200, 0.1, 'square', 0.2);
    setTimeout(() => this.playTone(300, 0.1, 'square', 0.2), 50);
  }

  public playPowerActivate(): void {
    // Power-up sound - like Mario power-up
    this.playTone(400, 0.15, 'square', 0.3);
    setTimeout(() => this.playTone(600, 0.15, 'square', 0.3), 100);
    setTimeout(() => this.playTone(800, 0.2, 'square', 0.3), 200);
  }

  public playBridgeBuild(): void {
    // Building sound - ascending notes
    this.playTone(300, 0.1, 'square', 0.25);
    setTimeout(() => this.playTone(400, 0.1, 'square', 0.25), 80);
    setTimeout(() => this.playTone(500, 0.1, 'square', 0.25), 160);
  }

  public playDoorBreak(): void {
    // Breaking sound - descending notes
    this.playTone(500, 0.1, 'square', 0.3);
    setTimeout(() => this.playTone(300, 0.1, 'square', 0.3), 80);
    setTimeout(() => this.playTone(150, 0.15, 'square', 0.3), 160);
  }

  public playBribe(): void {
    // Money/coin sound - like coin collection
    this.playTone(800, 0.1, 'square', 0.3);
    setTimeout(() => this.playTone(1000, 0.15, 'square', 0.3), 100);
  }

  public playCollision(): void {
    // Bump sound - like hitting a wall
    this.playTone(150, 0.1, 'square', 0.2);
  }

  public playPassengerStolen(): void {
    // Negative sound - like losing a life
    this.playTone(200, 0.2, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.3), 150);
  }

  public playReachGate(): void {
    // Success sound - like collecting item
    this.playTone(600, 0.1, 'square', 0.3);
    setTimeout(() => this.playTone(800, 0.1, 'square', 0.3), 100);
    setTimeout(() => this.playTone(1000, 0.15, 'square', 0.3), 200);
  }

  public playLevelComplete(): void {
    // Victory fanfare - classic 80s style
    this.playTone(523, 0.2, 'square', 0.3); // C
    setTimeout(() => this.playTone(659, 0.2, 'square', 0.3), 200); // E
    setTimeout(() => this.playTone(784, 0.2, 'square', 0.3), 400); // G
    setTimeout(() => this.playTone(1047, 0.4, 'square', 0.4), 600); // C (high)
  }

  public playGameOver(): void {
    // Game over sound - descending sad notes
    this.playTone(400, 0.3, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(300, 0.3, 'sawtooth', 0.3), 300);
    setTimeout(() => this.playTone(200, 0.4, 'sawtooth', 0.3), 600);
  }

  public playClick(): void {
    // UI click sound
    this.playTone(800, 0.05, 'square', 0.15);
  }

  public playSelect(): void {
    // Selection sound
    this.playTone(600, 0.1, 'square', 0.2);
    setTimeout(() => this.playTone(700, 0.1, 'square', 0.2), 50);
  }

  public playWarning(): void {
    // Warning sound - like alert
    this.playTone(400, 0.1, 'square', 0.25);
    setTimeout(() => this.playTone(400, 0.1, 'square', 0.25), 150);
  }

  public toggleSounds(): void {
    this.soundsEnabled = !this.soundsEnabled;
  }

  public setSoundsEnabled(enabled: boolean): void {
    this.soundsEnabled = enabled;
  }
}

