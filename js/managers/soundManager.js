import { SoundGenerator } from '../generators/soundGenerator.js';

/**
 * Manages all game sounds and audio playback
 */
export class SoundManager {
    constructor() {
        this.initialized = false;
        this.audioContext = null;
        this.masterGainNode = null;
        this.soundEnabled = true;
        
        // Sound buffers
        this.sounds = {
            engine: null,
            horn: null,
            footstep: null,
            crash: null,
            vehicleStart: null
        };
        
        // Active sound sources
        this.activeSources = [];
    }
    
    /**
     * Initialize the sound manager
     */
    init() {
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create master gain node for volume control
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.gain.value = 0.5; // 50% volume
            this.masterGainNode.connect(this.audioContext.destination);
            
            // Generate sounds
            this.generateSounds();
            
            this.initialized = true;
            console.log('Sound manager initialized');
            
            // Add click handler to resume audio context on user interaction
            document.addEventListener('click', () => this.resumeAudioContext(), { once: true });
        } catch (error) {
            console.error('Failed to initialize sound manager:', error);
            this.soundEnabled = false;
        }
    }
    
    /**
     * Generate all game sounds using SoundGenerator
     */
    async generateSounds() {
        if (!this.audioContext) return;
        
        // Generate procedural sounds
        this.sounds.engine = SoundGenerator.createEngineSound(this.audioContext, 400, 2);
        this.sounds.horn = SoundGenerator.createHornSound(this.audioContext);
        this.sounds.footstep = SoundGenerator.createFootstepSound(this.audioContext, 'concrete');
        this.sounds.crash = SoundGenerator.createCrashSound(this.audioContext, 0.7);
        this.sounds.vehicleStart = SoundGenerator.createVehicleStartSound(this.audioContext);
        
        // Load any external sounds if needed
        // this.sounds.music = await SoundGenerator.loadSound(this.audioContext, 'sounds/music.mp3');
    }
    
    /**
     * Resume audio context (needed for browsers that suspend it until user interaction)
     */
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('Audio context resumed');
            });
        }
    }
    
    /**
     * Set master volume
     * @param {number} volume - Volume level from 0 to 1
     */
    setVolume(volume) {
        if (!this.initialized) return;
        
        // Clamp volume between 0 and 1
        volume = Math.max(0, Math.min(1, volume));
        
        // Set master gain
        this.masterGainNode.gain.value = volume;
    }
    
    /**
     * Toggle sound on/off
     * @returns {boolean} New sound state
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        
        if (this.initialized) {
            this.masterGainNode.gain.value = this.soundEnabled ? 0.5 : 0;
        }
        
        return this.soundEnabled;
    }
    
    /**
     * Play a sound
     * @param {string} soundName - Name of the sound to play
     * @param {number} volume - Volume for this sound (0-1)
     * @param {boolean} loop - Whether to loop the sound
     * @returns {Object} Sound control object
     */
    playSound(soundName, volume = 1, loop = false) {
        if (!this.initialized || !this.soundEnabled) {
            return { stop: () => {} };
        }
        
        // Get sound buffer
        const buffer = this.sounds[soundName];
        if (!buffer) {
            console.warn(`Sound "${soundName}" not found`);
            return { stop: () => {} };
        }
        
        // Create source
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        
        // Create gain node for this sound
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.masterGainNode);
        
        // Start playback
        source.start();
        
        // Add to active sources if looping
        if (loop) {
            const sourceInfo = { source, gainNode };
            this.activeSources.push(sourceInfo);
            
            // Remove from active sources when stopped
            source.onended = () => {
                const index = this.activeSources.indexOf(sourceInfo);
                if (index !== -1) {
                    this.activeSources.splice(index, 1);
                }
            };
            
            // Return control object
            return {
                stop: () => {
                    try {
                        source.stop();
                    } catch (e) {
                        console.warn('Error stopping sound:', e);
                    }
                },
                setVolume: (newVolume) => {
                    gainNode.gain.value = newVolume;
                },
                updateRPM: (rpm) => {
                    // Only for engine sounds
                    if (soundName === 'engine') {
                        source.playbackRate.value = rpm / 1000;
                    }
                }
            };
        }
        
        // Return simple control object for non-looping sounds
        return {
            stop: () => {
                try {
                    source.stop();
                } catch (e) {
                    console.warn('Error stopping sound:', e);
                }
            }
        };
    }
    
    /**
     * Play engine sound
     * @param {number} rpm - Initial RPM
     * @returns {Object} Sound control object
     */
    playEngineSound(rpm = 1000) {
        const sound = this.playSound('engine', 0.3, true);
        sound.updateRPM(rpm);
        return sound;
    }
    
    /**
     * Play horn sound
     */
    playHorn() {
        this.playSound('horn', 0.4);
    }
    
    /**
     * Play footstep sound
     */
    playFootstep() {
        // Slight random variation in volume
        const volume = 0.2 + Math.random() * 0.1;
        this.playSound('footstep', volume);
    }
    
    /**
     * Play crash sound
     * @param {number} intensity - Crash intensity from 0 to 1
     */
    playCrash(intensity = 0.7) {
        // Volume based on intensity
        const volume = 0.3 + intensity * 0.4;
        this.playSound('crash', volume);
    }
    
    /**
     * Play vehicle start sound
     */
    playVehicleStart() {
        this.playSound('vehicleStart', 0.4);
    }
    
    /**
     * Stop all sounds
     */
    stopAllSounds() {
        // Stop all active sources
        for (const sourceInfo of this.activeSources) {
            try {
                sourceInfo.source.stop();
            } catch (e) {
                console.warn('Error stopping sound:', e);
            }
        }
        
        // Clear active sources array
        this.activeSources = [];
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        this.stopAllSounds();
        
        if (this.audioContext) {
            this.audioContext.close().then(() => {
                console.log('Audio context closed');
            });
        }
    }
} 