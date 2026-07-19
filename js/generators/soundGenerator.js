/**
 * Sound Generator class for creating and loading game sounds
 * Works alongside SoundManager for sound playback and control
 */
export class SoundGenerator {
  /**
   * Create an engine sound with adjustable parameters
   * @param {AudioContext} audioContext - The audio context to use
   * @param {number} baseFrequency - Base frequency for the engine sound
   * @param {number} duration - Duration of the sound in seconds
   * @returns {AudioBuffer} The generated engine sound buffer
   */
  static createEngineSound(audioContext, baseFrequency = 400, duration = 2) {
    // Create an audio buffer for the engine sound
    const sampleRate = audioContext.sampleRate;
    const bufferSize = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate engine sound waveform
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;

      // Base engine tone (sine wave)
      const baseTone = Math.sin(2 * Math.PI * baseFrequency * t);

      // Add harmonics for richer sound
      const harmonic1 = 0.5 * Math.sin(2 * Math.PI * baseFrequency * 2 * t);
      const harmonic2 = 0.25 * Math.sin(2 * Math.PI * baseFrequency * 3 * t);

      // Add some noise for realism
      const noise = 0.1 * (Math.random() * 2 - 1);

      // Combine components
      data[i] = baseTone + harmonic1 + harmonic2 + noise;

      // Apply slight amplitude modulation for variation
      data[i] *= 0.9 + 0.1 * Math.sin(2 * Math.PI * 10 * t);
    }

    return buffer;
  }

  /**
   * Create a horn sound
   * @param {AudioContext} audioContext - The audio context to use
   * @returns {AudioBuffer} The generated horn sound buffer
   */
  static createHornSound(audioContext) {
    const sampleRate = audioContext.sampleRate;
    const duration = 0.5; // Half second horn
    const bufferSize = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Horn frequencies (main tone and harmonics)
    const mainFreq = 440; // A4 note
    const harmonicFreq = 660; // E5 note

    // Generate horn waveform
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;

      // Main tone with harmonics
      const mainTone = Math.sin(2 * Math.PI * mainFreq * t);
      const harmonic = 0.5 * Math.sin(2 * Math.PI * harmonicFreq * t);

      // Add some distortion for a more realistic horn sound
      const distortion = 0.2 * Math.tanh(3 * (mainTone + harmonic));

      // Combine components
      data[i] = mainTone + harmonic + distortion;

      // Apply envelope (attack and decay)
      let envelope = 1;
      if (t < 0.05) {
        // Attack phase
        envelope = t / 0.05;
      } else if (t > duration - 0.1) {
        // Decay phase
        envelope = (duration - t) / 0.1;
      }

      data[i] *= envelope;
    }

    return buffer;
  }

  /**
   * Create a footstep sound
   * @param {AudioContext} audioContext - The audio context to use
   * @param {string} surface - The surface type (concrete, grass, etc.)
   * @returns {AudioBuffer} The generated footstep sound buffer
   */
  static createFootstepSound(audioContext, surface = 'concrete') {
    const sampleRate = audioContext.sampleRate;
    const duration = 0.2; // Short footstep sound
    const bufferSize = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Different parameters based on surface type
    let attackTime = 0.01;
    let decayTime = 0.19;
    let noiseAmount = 0.8;
    let lowPassFreq = 1000;

    if (surface === 'grass') {
      attackTime = 0.02;
      decayTime = 0.15;
      noiseAmount = 0.9;
      lowPassFreq = 800;
    } else if (surface === 'metal') {
      attackTime = 0.005;
      decayTime = 0.3;
      noiseAmount = 0.6;
      lowPassFreq = 3000;
    }

    // Generate footstep waveform
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;

      // Create noise component
      const noise = noiseAmount * (Math.random() * 2 - 1);

      // Apply low-pass filter effect (simplified)
      const filterFactor = Math.exp(-t * lowPassFreq);
      if (i > 0) {
        data[i] = data[i - 1] * filterFactor + noise * (1 - filterFactor);
      } else {
        data[i] = noise;
      }

      // Apply envelope
      let envelope = 1;
      if (t < attackTime) {
        // Attack phase
        envelope = t / attackTime;
      } else {
        // Decay phase
        envelope = Math.pow((duration - t) / decayTime, 0.5);
      }

      data[i] *= envelope;
    }

    return buffer;
  }

  /**
   * Create a crash/collision sound
   * @param {AudioContext} audioContext - The audio context to use
   * @param {number} intensity - Crash intensity from 0 to 1
   * @returns {AudioBuffer} The generated crash sound buffer
   */
  static createCrashSound(audioContext, intensity = 0.7) {
    const sampleRate = audioContext.sampleRate;
    const duration = 0.5 + intensity * 0.5; // Longer for more intense crashes
    const bufferSize = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Scale intensity to useful range
    intensity = Math.max(0.1, Math.min(1, intensity));

    // Generate crash waveform
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;

      // Create noise burst with metallic resonance
      const noise = Math.random() * 2 - 1;
      const resonance1 = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 8);
      const resonance2 = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 10);
      const resonance3 = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 12);

      // Combine components with intensity-based weighting
      data[i] =
        noise * Math.exp(-t * 5) * intensity * 0.6 +
        resonance1 * intensity * 0.3 +
        resonance2 * intensity * 0.2 +
        resonance3 * intensity * 0.1;

      // Apply envelope
      const envelope = Math.exp(-t * (5 - intensity * 3));
      data[i] *= envelope;
    }

    return buffer;
  }

  /**
   * Create a vehicle start sound
   * @param {AudioContext} audioContext - The audio context to use
   * @returns {AudioBuffer} The generated vehicle start sound buffer
   */
  static createVehicleStartSound(audioContext) {
    const sampleRate = audioContext.sampleRate;
    const duration = 1.5;
    const bufferSize = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate vehicle start waveform
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;

      // Frequency ramp up (engine starting)
      const startFreq = 50 + Math.min(t * 2, 1) * 350;

      // Base engine tone with frequency ramp
      const baseTone = Math.sin(2 * Math.PI * startFreq * t);

      // Add harmonics
      const harmonic1 = 0.5 * Math.sin(2 * Math.PI * startFreq * 2 * t);
      const harmonic2 = 0.25 * Math.sin(2 * Math.PI * startFreq * 3 * t);

      // Add noise and roughness
      const noise = 0.2 * (Math.random() * 2 - 1);
      const roughness = 0.1 * Math.sin(2 * Math.PI * 30 * t);

      // Combine components
      data[i] = baseTone + harmonic1 + harmonic2 + noise + roughness;

      // Apply envelope and RPM variation
      let envelope = 1;
      if (t < 0.1) {
        // Initial crank
        envelope = (t / 0.1) * 0.7;
      } else if (t < 0.5) {
        // Engine catches
        envelope = 0.7 + ((t - 0.1) / 0.4) * 0.3;
        // Add some sputtering during catch phase
        if (Math.random() > 0.9) {
          envelope *= 0.7;
        }
      } else {
        // Settled idle
        envelope = 1.0 + 0.1 * Math.sin(2 * Math.PI * 8 * t);
      }

      data[i] *= envelope;
    }

    return buffer;
  }

  /**
   * Load a sound file from URL
   * @param {AudioContext} audioContext - The audio context to use
   * @param {string} url - URL of the sound file to load
   * @returns {Promise<AudioBuffer>} Promise resolving to the loaded audio buffer
   */
  static async loadSound(audioContext, url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error loading sound:', error);
      // Return a silent buffer as fallback
      return audioContext.createBuffer(1, audioContext.sampleRate * 0.5, audioContext.sampleRate);
    }
  }
}
