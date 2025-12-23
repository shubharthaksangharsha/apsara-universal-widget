import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './ApsaraWidget.css';
import './themes.css';
import GeneratedImageViewer from './GeneratedImageViewer'; // Import theme system

// Debug logging toggle
const DEBUG_LOG = true; // Set to false to disable debug logging

// Debug log helper - only logs when DEBUG_LOG is true
const debugLog = (...args) => {
  if (DEBUG_LOG) console.log(...args);
};

// Configuration - automatically switch between local and production
const BACKEND_WS_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:3000'  // Local backend for testing
    : 'wss://apsara-devshubh.devshubh.me';  // Production backend

const ApsaraWidget = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [statusText, setStatusText] = useState('Talk to Apsara');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState(() => {
    return localStorage.getItem('apsara-screen-resolution') || '3072x1920';
  }); // Default screen resolution
  const [selectedCameraResolution, setSelectedCameraResolution] = useState(() => {
    return localStorage.getItem('apsara-camera-resolution') || '1280x720';
  }); // Default camera resolution
  const [showResolutionMenu, setShowResolutionMenu] = useState(false); // Screen resolution dropdown
  const [showCameraResolutionMenu, setShowCameraResolutionMenu] = useState(false); // Camera resolution dropdown
  const [currentTheme, setCurrentTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('apsara-theme');
      console.log('🔍 React initialization - localStorage available:', typeof localStorage !== 'undefined');
      console.log('🔍 React initialization - Theme from localStorage:', saved);
      console.log('🔍 React initialization - All localStorage keys:', Object.keys(localStorage));
      const theme = saved || 'light';
      console.log('🎨 React - Initializing theme state:', theme);
      return theme;
    } catch (e) {
      console.error('❌ React - Failed to read theme from localStorage:', e);
      return 'light';
    }
  }); // Theme state
  const [showThemeSelector, setShowThemeSelector] = useState(false); // Theme selector visibility
  const [availableTools, setAvailableTools] = useState([]); // Available tools from backend
  const [showToolsSelector, setShowToolsSelector] = useState(false); // Tools selector visibility
  const [generatedImage, setGeneratedImage] = useState(null); // Generated image data for viewer

  // Refs
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const microphoneRef = useRef(null);
  const processorRef = useRef(null);
  const analyserRef = useRef(null);
  const playbackAnalyserRef = useRef(null); // Analyser for playback audio
  const canvasRef = useRef(null);
  const playbackContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const nextPlayTimeRef = useRef(0);
  const scheduledSourcesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const audioIntervalRef = useRef(null);
  const isMutedRef = useRef(false); // Track mute state in ref for callback
  const isListeningRef = useRef(false); // Track listening state in ref for animation
  const isPlayingRef = useRef(false); // Track playing state in ref for visualization
  const screenStreamRef = useRef(null); // Screen capture stream
  const screenCaptureIntervalRef = useRef(null); // Interval for capturing frames
  const cameraStreamRef = useRef(null); // Camera stream
  const cameraCaptureIntervalRef = useRef(null); // Interval for camera frames
  const resolutionSelectorRef = useRef(null); // Ref for screen resolution selector button
  const cameraResolutionSelectorRef = useRef(null); // Ref for camera resolution selector button
  
  // Available screen resolutions
  const availableResolutions = [
    { label: '3072x1920 (Default)', value: '3072x1920', width: 3072, height: 1920 },
    { label: '1920x1080 (Full HD)', value: '1920x1080', width: 1920, height: 1080 },
    { label: '2560x1440 (2K)', value: '2560x1440', width: 2560, height: 1440 },
    { label: '3840x2160 (4K)', value: '3840x2160', width: 3840, height: 2160 },
    { label: '1366x768 (HD)', value: '1366x768', width: 1366, height: 768 },
    { label: '1280x720 (HD)', value: '1280x720', width: 1280, height: 720 },
  ];
  
  // Available camera resolutions (lower resolutions for better performance)
  const availableCameraResolutions = [
    { label: '1280x720 (HD - Default)', value: '1280x720', width: 1280, height: 720 },
    { label: '1920x1080 (Full HD)', value: '1920x1080', width: 1920, height: 1080 },
    { label: '640x480 (VGA)', value: '640x480', width: 640, height: 480 },
    { label: '960x540 (qHD)', value: '960x540', width: 960, height: 540 },
  ];

  // Detect mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Theme definitions
  const themes = [
    { name: 'light', class: 'light' },
    { name: 'dark', class: 'dark' },
    { name: 'nightly', class: 'nightly' },
    { name: 'dracula', class: 'dracula' },
    { name: 'monokai', class: 'monokai' },
    { name: 'nord', class: 'nord' },
    { name: 'solarized-light', class: 'solarized-light' },
    { name: 'solarized-dark', class: 'solarized-dark' },
  ];

  // Theme change handler
  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    setShowThemeSelector(false);
    debugLog(`🎨 Theme changed to: ${themeName}`);
  };

  // Initialize visualizer (extra small for minimal look)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 42;
      canvas.height = 42;
    }
  }, []);

  // Remove preload theme class from body on mount (added in index.html to prevent white flash)
  useEffect(() => {
    document.body.className = '';
    debugLog('🎨 Theme state initialized:', currentTheme);
    debugLog('📺 Screen resolution initialized:', selectedResolution);
    debugLog('📹 Camera resolution initialized:', selectedCameraResolution);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount to log initial values

  // Save theme to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem('apsara-theme', currentTheme);
      const verification = localStorage.getItem('apsara-theme');
      console.log('💾 Saved theme:', currentTheme);
      console.log('✅ Verified saved theme:', verification);
      console.log('🔍 All localStorage after save:', Object.keys(localStorage));
    } catch (e) {
      console.error('❌ Failed to save theme:', e);
    }
  }, [currentTheme]);

  // Save screen resolution to localStorage when changed
  useEffect(() => {
    localStorage.setItem('apsara-screen-resolution', selectedResolution);
    debugLog('💾 Saved screen resolution:', selectedResolution);
  }, [selectedResolution]);

  // Save camera resolution to localStorage when changed
  useEffect(() => {
    localStorage.setItem('apsara-camera-resolution', selectedCameraResolution);
    debugLog('💾 Saved camera resolution:', selectedCameraResolution);
  }, [selectedCameraResolution]);

  // Fetch available tools from backend on mount
  useEffect(() => {
    const fetchTools = async () => {
      try {
        // Load saved tools state from localStorage
        const savedToolsState = localStorage.getItem('apsara-enabled-tools');
        
        // If we have saved state, apply it to backend first
        if (savedToolsState) {
          try {
            const toolsState = JSON.parse(savedToolsState);
            debugLog('📦 Restoring saved tools state:', toolsState);
            
            await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/tools/update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ enabled: toolsState })
            });
          } catch (e) {
            console.error('❌ Error restoring tools state:', e);
          }
        }
        
        // Fetch current tools from backend
        const response = await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/tools`);
        const data = await response.json();
        if (data.success) {
          setAvailableTools(data.tools);
          debugLog('🔧 Loaded available tools:', data.tools);
        } else {
          // Backend responded but with error
          setAvailableTools([]);
          console.error('❌ Backend returned error:', data.error);
        }
      } catch (error) {
        // Backend is not running or not reachable
        console.error('❌ Error fetching tools:', error);
        setAvailableTools([]); // Set empty array to show error message in UI
      }
    };
    
    fetchTools();
  }, []);

  // Close resolution menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showResolutionMenu) {
        const menu = document.querySelector('.resolution-menu');
        const button = resolutionSelectorRef.current;
        
        // Close if clicking outside both menu and button
        if ((!menu || !menu.contains(e.target)) && (!button || !button.contains(e.target))) {
          setShowResolutionMenu(false);
        }
      }
    };

    if (showResolutionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showResolutionMenu]);

  // Close camera resolution menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showCameraResolutionMenu) {
        const menu = document.querySelector('.camera-resolution-menu');
        const button = cameraResolutionSelectorRef.current;
        
        // Close if clicking outside both menu and button
        if ((!menu || !menu.contains(e.target)) && (!button || !button.contains(e.target))) {
          setShowCameraResolutionMenu(false);
        }
      }
    };

    if (showCameraResolutionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCameraResolutionMenu]);

  // Close theme selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showThemeSelector) {
        const panel = document.querySelector('.theme-selector-panel');
        const button = document.querySelector('.settings-button');
        
        // Close if clicking outside both panel and button
        if ((!panel || !panel.contains(e.target)) && (!button || !button.contains(e.target))) {
          setShowThemeSelector(false);
        }
      }
    };

    if (showThemeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showThemeSelector]);

  // Close tools selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showToolsSelector) {
        const panel = document.querySelector('.tools-selector-panel');
        const button = document.querySelector('.tools-button');
        
        // Close if clicking outside both panel and button
        if ((!panel || !panel.contains(e.target)) && (!button || !button.contains(e.target))) {
          setShowToolsSelector(false);
        }
      }
    };

    if (showToolsSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showToolsSelector]);

  // Resize Electron window when dropdown opens/closes
  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
    
    if (isElectron && typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        
        // Check if ANY dropdown is open
        const anyDropdownOpen = showResolutionMenu || showCameraResolutionMenu || showThemeSelector || showToolsSelector;
        
        if (anyDropdownOpen) {
          // Opening: resize immediately, but keep window at bottom
          ipcRenderer.send('resize-for-dropdown', { show: true });
          debugLog('📐 Window expanded for dropdown');
        } else {
          // Closing: delay resize to allow animation to complete
          setTimeout(() => {
            ipcRenderer.send('resize-for-dropdown', { show: false });
            debugLog('📐 Window collapsed after dropdown closed');
          }, 250); // Wait for animation (200ms) + small buffer
        }
      } catch (err) {
        debugLog('Error resizing window:', err);
      }
    }
  }, [showResolutionMenu, showCameraResolutionMenu, showThemeSelector, showToolsSelector]);

  // Connect to backend
  const connectToBackend = async () => {
    return new Promise((resolve, reject) => {
      try {
        debugLog('🔌 Connecting to backend:', BACKEND_WS_URL);
        const ws = new WebSocket(BACKEND_WS_URL);

        ws.onopen = () => {
          debugLog('✅ Connected to backend');
          setStatusText('Connected');
          setIsConnected(true);
          wsRef.current = ws;
          resolve();
        };

        ws.onmessage = async (event) => {
          const message = JSON.parse(event.data);
          handleBackendMessage(message);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setStatusText('Connection Error');
          reject(error);
        };

        ws.onclose = () => {
          debugLog('Disconnected from backend');
          setIsConnected(false);
          setIsListening(false);
          setIsPlaying(false); // Reset playing state
          isPlayingRef.current = false; // Reset playing ref
          isListeningRef.current = false; // Reset listening ref
          setIsMicMuted(false); // Reset mute state
          isMutedRef.current = false; // Reset mute ref
          setStatusText('Talk to Apsara'); // Reset status immediately
          stopMicrophone();
          stopAudioPlayback(); // Stop any audio playback
          
          // Clear the visualizer canvas
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  };

  // Handle backend messages
  const handleBackendMessage = (message) => {
    switch (message.type) {
      case 'status':
        if (message.status === 'connected') {
          setStatusText('Ready');
        }
        break;

      case 'gemini_message':
        handleGeminiMessage(message.data);
        break;

      case 'generated_image':
        // Display generated image in viewer
        debugLog('🎨 Received generated image from backend');
        setGeneratedImage(message.data);
        break;

      case 'error':
        console.error('Backend error:', message.error);
        setStatusText('Error: ' + message.error);
        break;

      default:
        break;
    }
  };

  // Handle Gemini message
  const handleGeminiMessage = (data) => {
    if (data.data) {
      addAudioToQueue(data.data);
    }

    if (data.serverContent) {
      if (data.serverContent.interrupted) {
        stopAudioPlayback();
        setStatusText('Listening...');
      }

      if (data.serverContent.turnComplete) {
        setIsPlaying(false);
      }
    }
  };

  // Start microphone
  const startMicrophone = async () => {
    try {
      debugLog('🎤 Starting microphone...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support microphone access');
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;
      debugLog('✅ AudioContext created, sample rate:', audioContext.sampleRate);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      debugLog('✅ Microphone access granted:', stream.getTracks()[0].label);

      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;

      // Set up analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      microphone.connect(analyser);

      // Set up processor
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      microphone.connect(processor);
      processor.connect(audioContext.destination);

      // IMPORTANT: Keep reference to avoid garbage collection
      let isCapturing = true;
      
      processor.onaudioprocess = (e) => {
        if (!isCapturing) return;
        
        // Check mute status FIRST before anything else
        const muted = isMutedRef.current;
        if (muted) {
          // Don't even process the audio when muted
          return;
        }
        
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = convertToPCM16(inputData);
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData)));

        // 🔍 DEBUG: Log audio being sent
        debugLog('🎤 Sending audio chunk:', base64Audio.length, 'bytes');

        try {
          ws.send(JSON.stringify({
            type: 'audio',
            data: base64Audio
          }));
        } catch (error) {
          console.error('Error sending audio:', error);
        }
      };

      // Store the capturing state
      processorRef.current.isCapturing = isCapturing;

      setIsListening(true);
      isListeningRef.current = true; // Update ref for animation
      startVisualization();
      setStatusText('Listening...');
      
      debugLog('✅ Audio processor ready, waiting for audio data...');

    } catch (error) {
      console.error('Microphone error:', error);
      setStatusText('Microphone Error');
    }
  };

  // Stop microphone
  const stopMicrophone = () => {
    debugLog('🛑 Stopping microphone...');
    
    isListeningRef.current = false; // Stop animation loop
    
    if (processorRef.current) {
      if (processorRef.current.isCapturing !== undefined) {
        processorRef.current.isCapturing = false;
      }
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      if (microphoneRef.current.mediaStream) {
        microphoneRef.current.mediaStream.getTracks().forEach(track => track.stop());
      }
      microphoneRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    setIsListening(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Convert to PCM16
  const convertToPCM16 = (float32Array) => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  // Audio playback
  const initPlaybackContext = async () => {
    if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
      playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000,
        latencyHint: isMobile ? 'playback' : 'interactive'
      });
      nextPlayTimeRef.current = 0;
      
      // Create analyser for playback audio visualization - connect to destination once
      const playbackAnalyser = playbackContextRef.current.createAnalyser();
      playbackAnalyser.fftSize = 128; // Balance between frequency resolution and responsiveness
      playbackAnalyser.smoothingTimeConstant = 0; // NO smoothing for instant, dramatic response
      playbackAnalyserRef.current = playbackAnalyser;
      
      // Connect analyser to destination once
      playbackAnalyser.connect(playbackContextRef.current.destination);
      
      debugLog('✅ Playback analyser created and connected (fftSize=128, smoothing=0 for instant response)');
    }

    if (playbackContextRef.current.state === 'suspended') {
      await playbackContextRef.current.resume();
    }

    return playbackContextRef.current;
  };

  const addAudioToQueue = (base64Audio) => {
    audioQueueRef.current.push(base64Audio);
    if (!isPlaying) {
      processAudioQueue();
    }
  };

  const processAudioQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      if (scheduledSourcesRef.current.length > 0 && playbackContextRef.current) {
        const currentTime = playbackContextRef.current.currentTime;
        const hasActiveAudio = scheduledSourcesRef.current.some(item => item.endTime > currentTime);
        if (hasActiveAudio) {
          setTimeout(() => processAudioQueue(), 50);
          return;
        }
      }
      setIsPlaying(false);
      isPlayingRef.current = false; // Update ref for visualization
      setStatusText('Listening...');
      return;
    }

    setIsPlaying(true);
    isPlayingRef.current = true; // Update ref for visualization
    setStatusText('Talk to interrupt');

    await initPlaybackContext();

    const base64Audio = audioQueueRef.current.shift();

    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = playbackContextRef.current.createBuffer(1, bytes.length / 2, 24000);
      const channelData = audioBuffer.getChannelData(0);

      const dataView = new DataView(bytes.buffer);
      for (let i = 0; i < channelData.length; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        channelData[i] = int16 / 32768.0;
      }

      scheduleAudioBuffer(audioBuffer);
    } catch (error) {
      console.error('Audio decode error:', error);
    }

    setTimeout(() => processAudioQueue(), 5);
  };

  const scheduleAudioBuffer = (audioBuffer) => {
    if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') return;

    const source = playbackContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    
    // Connect to analyser for visualization (analyser already connected to destination)
    if (playbackAnalyserRef.current) {
      source.connect(playbackAnalyserRef.current);
      debugLog('🔊 Audio source connected to analyser');
    } else {
      source.connect(playbackContextRef.current.destination);
    }

    const currentTime = playbackContextRef.current.currentTime;

    if (nextPlayTimeRef.current <= currentTime) {
      nextPlayTimeRef.current = currentTime + 0.01;
    }

    const scheduleTime = nextPlayTimeRef.current;

    try {
      source.start(scheduleTime);
    } catch (e) {
      console.error('Audio start error:', e);
      return;
    }

    const endTime = scheduleTime + audioBuffer.duration;

    scheduledSourcesRef.current.push({
      source: source,
      endTime: endTime
    });

    nextPlayTimeRef.current = endTime;

    scheduledSourcesRef.current = scheduledSourcesRef.current.filter(item => item.endTime > currentTime);
  };

  const stopAudioPlayback = () => {
    audioQueueRef.current = [];
    setIsPlaying(false);

    scheduledSourcesRef.current.forEach(item => {
      try {
        item.source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    scheduledSourcesRef.current = [];

    if (playbackContextRef.current) {
      nextPlayTimeRef.current = playbackContextRef.current.currentTime;
    }
  };

  // Visualization - Dynamic colors based on who's speaking with smooth animation
  const startVisualization = () => {
    const draw = () => {
      // Check ref instead of state to avoid closure issues
      if (!isListeningRef.current) {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 42, 42);
        }
        return;
      }

      // IMPORTANT: Request next frame FIRST to ensure continuous loop
      animationFrameRef.current = requestAnimationFrame(draw);

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, 42, 42);

      // Choose which analyser to use based on who's speaking
      const isSpeaking = isPlayingRef.current; // Use ref to get real-time value
      
      // Don't visualize USER microphone when muted - but still show Apsara's visualizer
      if (isMutedRef.current && !isSpeaking) {
        return; // Skip visualization only for user when muted
      }
      
      const activeAnalyser = isSpeaking ? playbackAnalyserRef.current : analyserRef.current;
      
      if (!activeAnalyser) return;

      const bufferLength = activeAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      activeAnalyser.getByteFrequencyData(dataArray);

      // Debug: Log max amplitude occasionally to verify data is flowing
      if (Math.random() < 0.05) { // Log ~5% of frames
        const maxVal = Math.max(...dataArray);
        debugLog(`🎵 Visualizer: ${isSpeaking ? 'Apsara' : 'User'} - Max amplitude: ${maxVal}, BufferLength: ${bufferLength}`);
      }

      const centerX = 42 / 2;
      const centerY = 42 / 2;
      const radius = 15;
      const bars = 20;

      // Different colors and height multiplier based on who's speaking
      // Make Apsara's spikes MUCH bigger and more dramatic
      const heightMultiplier = isSpeaking ? 20 : 8; // 2.5x bigger when Apsara speaks!

      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2;
        
        // For playback (Apsara), sample from lower frequencies where speech has more energy
        // This makes the bars more reactive and dramatic
        let dataIndex;
        if (isSpeaking) {
          // Map to lower 50% of frequency bins for speech frequencies
          dataIndex = Math.floor((i / bars) * (bufferLength * 0.5));
        } else {
          // User mic - use full spectrum
          dataIndex = Math.floor((i / bars) * bufferLength);
        }
        
        // Get the frequency value and apply multiplier
        const value = dataArray[dataIndex];
        const height = (value / 255) * heightMultiplier;

        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + height);
        const y2 = centerY + Math.sin(angle) * (radius + height);

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        
        if (isSpeaking) {
          // Apsara speaking - Orange gradient (spreads more)
          gradient.addColorStop(0, '#e8832a');   // Wyndham Orange
          gradient.addColorStop(0.5, '#f5a54a'); // Light Orange
          gradient.addColorStop(1, '#d46e1a');   // Dark Orange
        } else {
          // You speaking - Original gold/orange/green gradient
          gradient.addColorStop(0, '#FFD700');   // Gold
          gradient.addColorStop(0.5, '#FFA500'); // Orange
          gradient.addColorStop(1, '#32CD32');   // Green
        }

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    // Start the animation loop
    draw();
  };

  // Event handlers
  const handleWidgetClick = async (e) => {
    if (e.target.closest('.end-button') || 
        e.target.closest('.mute-button') || 
        e.target.closest('.screen-share-button') || 
        e.target.closest('.video-button')) {
      return;
    }

    if (!isConnected) {
      handleStartClick();
    }
  };

  const handleStartClick = async () => {
    try {
      setStatusText('Connecting...');

      await initPlaybackContext();
      await connectToBackend();
      await startMicrophone();
      setStatusText('Listening...');
    } catch (error) {
      console.error('Failed to start:', error);
      setStatusText('Error - Try again');
    }
  };

  const handleMuteToggle = async (e) => {
    e.stopPropagation();
    
    // Only toggle mute if connected
    if (!isConnected) {
      debugLog('🔇 Cannot mute: Not connected');
      return;
    }
    
    // Toggle mute
    const newMutedState = !isMicMuted;
    setIsMicMuted(newMutedState);
    isMutedRef.current = newMutedState; // Update ref immediately - audio processor will check this
    
    console.log('🔇 Mute toggled:', newMutedState ? 'MUTED ✓' : 'UNMUTED', '| isMutedRef.current =', isMutedRef.current);
    debugLog('🔇 Mute toggled:', newMutedState ? 'MUTED' : 'UNMUTED');
  };

  const handleEndClick = async (e) => {
    e.stopPropagation();

    // If not connected, start the connection (button acts as "Start")
    if (!isConnected) {
      await handleStartClick();
      return;
    }

    // If already connected, end the call (button acts as "End")
    stopMicrophone();
    stopAudioPlayback();

    if (wsRef.current) {
      wsRef.current.close();
    }

    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }

    // Clear the visualizer canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    setStatusText('Talk to Apsara');
    setIsConnected(false);
    setIsMicMuted(false);
    setIsPlaying(false); // Reset playing state
    isPlayingRef.current = false; // Reset playing ref
    isMutedRef.current = false; // Reset mute ref
  };

  // Handle close button (for Electron)
  const handleCloseClick = (e) => {
    e.stopPropagation();

    // Send IPC message to close window (Electron).
    // Pass { forceQuit: true } so Windows will quit instead of just hiding.
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('close-window', { forceQuit: true });
      } catch (err) {
        debugLog('Not running in Electron');
      }
    }
  };

  // Screen sharing functions
  const startScreenShare = async () => {
    // Check if running in Electron (define at top of function)
    const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
    
    try {
      debugLog('🖥️ Starting screen share...');
      
      // Get selected resolution (declare once at the top)
      const resolution = availableResolutions.find(r => r.value === selectedResolution) || availableResolutions[0];
      debugLog(`📐 Screen capture resolution: ${resolution.label} (${resolution.width}x${resolution.height})`);
      
      let stream;
      
      if (isElectron) {
        // Use Electron's desktopCapturer for screen sharing
        debugLog('🖥️ Using Electron desktopCapturer...');
        
        const { ipcRenderer } = window.require('electron');
        const sources = await ipcRenderer.invoke('get-screen-sources');
        
        if (!sources || sources.length === 0) {
          throw new Error('No screen sources available');
        }
        
        // Use the first screen (primary display)
        const primarySource = sources[0];
        debugLog('📺 Selected screen:', primarySource.name);
        
        // Get stream using Electron's source with selected resolution
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: primarySource.id,
              minWidth: resolution.width,
              maxWidth: resolution.width,
              minHeight: resolution.height,
              maxHeight: resolution.height,
              minFrameRate: 2,
              maxFrameRate: 5
            }
          }
        });
      } else {
        // Use standard getDisplayMedia for web browsers
        debugLog('🌐 Using browser getDisplayMedia...');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Screen sharing not supported in this browser');
        }
        
        const displayMediaOptions = {
          video: {
            displaySurface: 'monitor', // Force entire screen only
            width: { ideal: resolution.width },
            height: { ideal: resolution.height },
            frameRate: { ideal: 2, max: 5 }
          },
          audio: false,
          surfaceSwitching: 'exclude',
          selfBrowserSurface: 'exclude',
          systemAudio: 'exclude'
        };

        stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      }

      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      setStatusText('Sharing screen...');
      
      // Use fullscreen border overlay in Electron, body border in browser
      if (isElectron) {
        // In Electron: Show fullscreen red border overlay
        try {
          const { ipcRenderer } = window.require('electron');
          ipcRenderer.send('show-screen-border');
          debugLog('✅ Fullscreen border overlay activated');
        } catch (err) {
          console.error('Error showing border overlay:', err);
        }
      } else {
        // In browser: Add red border to body
        document.body.classList.add('screen-sharing-active');
      }
      
      // Create a canvas for capturing frames with selected resolution
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(reject);
        };
        setTimeout(() => reject(new Error('Video load timeout')), 5000);
      });
      
      const canvas = document.createElement('canvas');
      // Use selected resolution for canvas
      canvas.width = resolution.width;
      canvas.height = resolution.height;
      const ctx = canvas.getContext('2d');
      debugLog(`✅ Canvas created at ${canvas.width}x${canvas.height}`);
      
      // Log screen sharing start with resolution (always visible in terminal)
      console.log(`✅ Screen sharing started: ${resolution.label} (${canvas.width}x${canvas.height})`);
      
      // Capture and send frames at ~2 fps
      screenCaptureIntervalRef.current = setInterval(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          debugLog('⚠️ WebSocket not ready, stopping screen share');
          stopScreenShare();
          return;
        }
        
        try {
          // Draw current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64 JPEG
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          const base64data = dataURL.split(',')[1];
          
          // Send frame to backend
          wsRef.current.send(JSON.stringify({
            type: 'video',
            data: base64data,
            mimeType: 'image/jpeg'
          }));
          
          debugLog('📹 Sent screen frame');
        } catch (err) {
          console.error('Error capturing frame:', err);
        }
      }, 500); // 2 fps
      
      // Handle stream end (user clicks "Stop sharing")
      stream.getVideoTracks()[0].onended = () => {
        debugLog('📹 User stopped screen sharing');
        stopScreenShare();
      };
      
      debugLog(`✅ Screen share started successfully at ${resolution.label} (${resolution.width}x${resolution.height})`);
    } catch (error) {
      console.error('❌ Screen share error:', error);
      setStatusText(isConnected ? 'Listening...' : 'Talk to Apsara');
      setIsScreenSharing(false);
      
      // Cleanup border overlay or body class
      if (isElectron) {
        try {
          const { ipcRenderer } = window.require('electron');
          ipcRenderer.send('hide-screen-border');
        } catch (err) {
          // Ignore
        }
      } else {
        document.body.classList.remove('screen-sharing-active');
      }
    }
  };

  const stopScreenShare = () => {
    debugLog('🛑 Stopping screen share...');
    
    // Log screen sharing stop (always visible in terminal)
    console.log('🛑 Screen sharing stopped');
    
    if (screenCaptureIntervalRef.current) {
      clearInterval(screenCaptureIntervalRef.current);
      screenCaptureIntervalRef.current = null;
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    // Check if running in Electron
    const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
    
    if (isElectron) {
      // In Electron: Hide fullscreen red border overlay
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('hide-screen-border');
        debugLog('❌ Fullscreen border overlay deactivated');
      } catch (err) {
        console.error('Error hiding border overlay:', err);
      }
    } else {
      // In browser: Remove red border from body
      document.body.classList.remove('screen-sharing-active');
    }
    
    setIsScreenSharing(false);
    if (isConnected) {
      setStatusText('Listening...');
    } else {
      setStatusText('Talk to Apsara');
    }
    
    debugLog('✅ Screen share stopped');
  };

  const handleScreenShareToggle = async (e) => {
    e.stopPropagation();
    
    debugLog('🖱️ Screen share button clicked');
    debugLog('📊 Current state:', {
      isConnected,
      isScreenSharing,
      wsState: wsRef.current?.readyState
    });
    
    if (!isConnected) {
      debugLog('🚫 Cannot share screen: Not connected');
      setStatusText('Connect first!');
      setTimeout(() => {
        setStatusText('Talk to Apsara');
      }, 2000);
      return;
    }
    
    if (isScreenSharing) {
      debugLog('🛑 Stopping screen share...');
      stopScreenShare();
    } else {
      debugLog('▶️ Starting screen share...');
      await startScreenShare();
    }
  };

  // Camera sharing functions
  const startCamera = async () => {
    try {
      debugLog('📷 Starting camera...');
      
      // Get selected resolution
      const resolution = availableCameraResolutions.find(r => r.value === selectedCameraResolution) || availableCameraResolutions[0];
      debugLog(`📐 Camera capture resolution: ${resolution.label} (${resolution.width}x${resolution.height})`);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: resolution.width },
          height: { ideal: resolution.height },
          frameRate: { ideal: 2, max: 5 }
        },
        audio: false
      });
      
      cameraStreamRef.current = stream;
      setIsCameraActive(true);
      setStatusText('Camera active...');
      
      // Log camera start with resolution (always visible in terminal)
      console.log(`✅ Camera started: ${resolution.label} (${resolution.width}x${resolution.height})`);
      
      // Create a canvas for capturing frames with selected resolution
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(reject);
        };
        setTimeout(() => reject(new Error('Video load timeout')), 5000);
      });
      
      const canvas = document.createElement('canvas');
      // Use selected resolution for canvas
      canvas.width = resolution.width;
      canvas.height = resolution.height;
      const ctx = canvas.getContext('2d');
      debugLog(`✅ Camera canvas created at ${canvas.width}x${canvas.height}`);
      
      // Capture and send frames at ~2 fps
      cameraCaptureIntervalRef.current = setInterval(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          debugLog('⚠️ WebSocket not ready, stopping camera');
          stopCamera();
          return;
        }
        
        try {
          // Draw current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64 JPEG
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          const base64data = dataURL.split(',')[1];
          
          // Send frame to backend
          wsRef.current.send(JSON.stringify({
            type: 'camera',
            data: base64data,
            mimeType: 'image/jpeg'
          }));
          
          debugLog('📷 Sent camera frame');
        } catch (err) {
          console.error('Error capturing camera frame:', err);
        }
      }, 500); // 2 fps
      
      // Handle stream end (permissions revoked or camera disconnected)
      stream.getVideoTracks()[0].onended = () => {
        debugLog('📷 Camera stream ended');
        stopCamera();
      };
      
      debugLog(`✅ Camera started successfully at ${resolution.label} (${resolution.width}x${resolution.height})`);
    } catch (error) {
      console.error('❌ Camera error:', error);
      setStatusText(isConnected ? 'Listening...' : 'Talk to Apsara');
      setIsCameraActive(false);
      
      // Show user-friendly error
      if (error.name === 'NotAllowedError') {
        alert('Camera access denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        alert('No camera found. Please connect a camera and try again.');
      }
    }
  };

  const stopCamera = () => {
    debugLog('🛑 Stopping camera...');
    
    // Log camera stop (always visible in terminal)
    console.log('🛑 Camera stopped');
    
    if (cameraCaptureIntervalRef.current) {
      clearInterval(cameraCaptureIntervalRef.current);
      cameraCaptureIntervalRef.current = null;
    }
    
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    
    setIsCameraActive(false);
    if (isConnected) {
      setStatusText('Listening...');
    } else {
      setStatusText('Talk to Apsara');
    }
    
    debugLog('✅ Camera stopped');
  };

  const handleCameraToggle = async (e) => {
    e.stopPropagation();
    
    debugLog('🖱️ Camera button clicked');
    debugLog('📊 Current state:', {
      isConnected,
      isCameraActive,
      wsState: wsRef.current?.readyState
    });
    
    if (!isConnected) {
      debugLog('🚫 Cannot start camera: Not connected');
      setStatusText('Connect first!');
      setTimeout(() => {
        setStatusText('Talk to Apsara');
      }, 2000);
      return;
    }
    
    if (isCameraActive) {
      debugLog('🛑 Stopping camera...');
      stopCamera();
    } else {
      debugLog('▶️ Starting camera...');
      await startCamera();
    }
  };

  // Handle tool toggle
  const handleToolToggle = async (toolId) => {
    // Prevent changing tools when connected
    if (isConnected) {
      setStatusText('Stop session first!');
      setTimeout(() => {
        setStatusText('Talk to Apsara');
      }, 2000);
      debugLog('🚫 Cannot change tools while connected');
      return;
    }

    try {
      // Update local state optimistically
      const updatedTools = availableTools.map(tool => 
        tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
      );
      setAvailableTools(updatedTools);

      // Prepare tools config for backend
      const toolsConfig = {};
      updatedTools.forEach(tool => {
        toolsConfig[tool.id] = tool.enabled;
      });

      // Send update to backend
      const response = await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/tools/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tools: toolsConfig })
      });

      const data = await response.json();
      
      if (data.success) {
        debugLog('✅ Tools configuration updated:', data.tools);
        
        // Save to localStorage
        const toolsState = {};
        updatedTools.forEach(tool => {
          toolsState[tool.id] = tool.enabled;
        });
        localStorage.setItem('apsara-enabled-tools', JSON.stringify(toolsState));
      } else {
        console.error('❌ Failed to update tools:', data.error);
        // Revert on error - refetch tools
        const fetchResponse = await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/tools`);
        const fetchData = await fetchResponse.json();
        if (fetchData.success) {
          setAvailableTools(fetchData.tools);
        }
      }
    } catch (error) {
      console.error('❌ Error toggling tool:', error);
    }
  };

  // Handle async toggle
  const handleAsyncToggle = async (toolId, e) => {
    e.stopPropagation(); // Prevent tool toggle
    
    if (isConnected) {
      setStatusText('Stop session first!');
      setTimeout(() => {
        setStatusText('Talk to Apsara');
      }, 2000);
      debugLog('🚫 Cannot change async settings while connected');
      return;
    }

    try {
      // Update local state optimistically
      const updatedTools = availableTools.map(tool => 
        tool.id === toolId ? { ...tool, async: !tool.async } : tool
      );
      setAvailableTools(updatedTools);

      // Prepare async settings for backend
      const asyncSettings = {};
      updatedTools.forEach(tool => {
        asyncSettings[tool.id] = tool.async;
      });

      // Send update to backend
      const response = await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/tools/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ asyncSettings })
      });

      const data = await response.json();
      
      if (data.success) {
        debugLog('✅ Async settings updated');
      } else {
        console.error('❌ Failed to update async settings:', data.error);
      }
    } catch (error) {
      console.error('❌ Error toggling async:', error);
    }
  };

  // Handle image model toggle
  const handleImageModelToggle = async (e) => {
    e.stopPropagation();
    
    if (isConnected) {
      return; // Don't allow changes during session
    }
    
    try {
      // Get current model
      const currentTool = availableTools.find(t => t.id === 'generate_image');
      const currentModel = currentTool?.model || 'flash';
      const newModel = currentModel === 'flash' ? 'pro' : 'flash';
      
      debugLog(`🎨 Toggling image generation model: ${currentModel} → ${newModel}`);
      
      // Update local state
      const updatedTools = availableTools.map(tool => 
        tool.id === 'generate_image' ? { ...tool, model: newModel } : tool
      );
      setAvailableTools(updatedTools);

      // Send update to backend
      const response = await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/tools/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageModel: newModel })
      });

      const data = await response.json();
      
      if (data.success) {
        debugLog('✅ Image model toggled:', newModel);
      } else {
        console.error('❌ Failed to toggle image model:', data.error);
      }
    } catch (error) {
      console.error('❌ Error toggling image model:', error);
    }
  };

  // Handle Select All
  const handleSelectAll = async () => {
    if (isConnected) {
      setStatusText('Stop session first!');
      setTimeout(() => {
        setStatusText('Talk to Apsara');
      }, 2000);
      debugLog('🚫 Cannot change tools while connected');
      return;
    }

    try {
      console.log('🔄 Enabling all tools...');
      // Enable all tools
      const enabled = {};
      availableTools.forEach(tool => {
        enabled[tool.id] = true;
      });

      console.log('📤 Sending to backend:', enabled);

      // Send update to backend (backend expects 'tools' not 'enabled')
      const response = await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/tools/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tools: enabled })
      });

      const data = await response.json();
      console.log('📥 Backend response:', data);
      
      if (data.success) {
        // Refresh tools from backend
        console.log('🔄 Refreshing tools list...');
        const fetchResponse = await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/tools`);
        const fetchData = await fetchResponse.json();
        console.log('📥 Fetched tools:', fetchData);
        
        if (fetchData.success) {
          // Create completely new object instances to force React re-render
          const freshTools = fetchData.tools.map(tool => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            enabled: tool.enabled,
            async: tool.async
          }));
          setAvailableTools(freshTools);
          console.log('✅ All tools enabled', freshTools);
          
          // Save enabled tools to localStorage
          const toolsState = {};
          freshTools.forEach(tool => {
            toolsState[tool.id] = tool.enabled;
          });
          localStorage.setItem('apsara-enabled-tools', JSON.stringify(toolsState));
        }
      } else {
        console.error('❌ Backend returned error:', data);
      }
    } catch (error) {
      console.error('❌ Error selecting all tools:', error);
    }
  };

  // Handle Clear All
  const handleClearAll = async () => {
    if (isConnected) {
      setStatusText('Stop session first!');
      setTimeout(() => {
        setStatusText('Talk to Apsara');
      }, 2000);
      debugLog('🚫 Cannot change tools while connected');
      return;
    }

    try {
      console.log('🔄 Disabling all tools...');
      // Disable all tools
      const enabled = {};
      availableTools.forEach(tool => {
        enabled[tool.id] = false;
      });

      console.log('📤 Sending to backend:', enabled);

      // Send update to backend (backend expects 'tools' not 'enabled')
      const response = await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/tools/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tools: enabled })
      });

      const data = await response.json();
      console.log('📥 Backend response:', data);
      
      if (data.success) {
        // Refresh tools from backend
        console.log('🔄 Refreshing tools list...');
        const fetchResponse = await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/tools`);
        const fetchData = await fetchResponse.json();
        console.log('📥 Fetched tools:', fetchData);
        
        if (fetchData.success) {
          // Create completely new object instances to force React re-render
          const freshTools = fetchData.tools.map(tool => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            enabled: tool.enabled,
            async: tool.async
          }));
          setAvailableTools(freshTools);
          console.log('✅ All tools disabled', freshTools);
          
          // Save enabled tools to localStorage
          const toolsState = {};
          freshTools.forEach(tool => {
            toolsState[tool.id] = tool.enabled;
          });
          localStorage.setItem('apsara-enabled-tools', JSON.stringify(toolsState));
        }
      } else {
        console.error('❌ Backend returned error:', data);
      }
    } catch (error) {
      console.error('❌ Error clearing all tools:', error);
    }
  };

  // Handle image viewer actions
  const handleEmailImage = async (imageData) => {
    try {
      debugLog('📧 Emailing generated image...');
      const response = await fetch(`${BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/email-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base64Image: imageData.base64Image,
          filename: imageData.filename,
          mimeType: imageData.mimeType
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to send email');
      }
      
      debugLog('✅ Image emailed successfully');
    } catch (error) {
      console.error('❌ Error emailing image:', error);
      throw error;
    }
  };

  const handleSaveImage = async (imageData) => {
    try {
      debugLog('💾 Saving generated image...');
      // Create download link
      const link = document.createElement('a');
      link.href = `data:${imageData.mimeType};base64,${imageData.base64Image}`;
      link.download = imageData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      debugLog('✅ Image saved successfully');
    } catch (error) {
      console.error('❌ Error saving image:', error);
      throw error;
    }
  };

  const handleCopyImage = async (imageData) => {
    try {
      debugLog('📋 Copying generated image to clipboard...');
      
      // Convert base64 to blob
      const byteString = atob(imageData.base64Image);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: imageData.mimeType });
      
      // Copy to clipboard using Clipboard API
      await navigator.clipboard.write([
        new ClipboardItem({
          [imageData.mimeType]: blob
        })
      ]);
      
      debugLog('✅ Image copied to clipboard');
    } catch (error) {
      console.error('❌ Error copying image:', error);
      throw error;
    }
  };

  const handleCloseImageViewer = () => {
    setGeneratedImage(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicrophone();
      stopAudioPlayback();
      stopScreenShare();
      stopCamera();
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (playbackContextRef.current) {
        playbackContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps intentional - cleanup only on unmount

  return (
    <div className={`apsara-widget theme-${currentTheme}`}>
      {/* Close button for Electron */}
      <button className="close-button" onClick={handleCloseClick} title="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div className="widget-panel" onClick={handleWidgetClick}>
        <div className="visualizer-container">
          <canvas ref={canvasRef} id="miniVisualizer"></canvas>
          <div className={`visualizer-orb ${isListening ? 'listening' : ''} ${isPlaying ? 'speaking' : ''}`}>
            <div className="orb-inner"></div>
          </div>
        </div>

        <div className="widget-content">
          <span className="widget-text">{statusText}</span>
        </div>

        {/* Control buttons */}
        <button
          className={`mute-button ${isMicMuted ? 'muted' : ''}`}
          onClick={handleMuteToggle}
          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <svg className="mic-on" style={{ display: isMicMuted ? 'none' : 'block' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
          <svg className="mic-off" style={{ display: isMicMuted ? 'block' : 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>

        {/* Screen Share button with resolution selector */}
        <div className="screen-share-container">
          <button
            className={`screen-share-button ${isScreenSharing ? 'sharing' : ''}`}
            onClick={handleScreenShareToggle}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
              <polyline points="7 10 12 7 17 10"></polyline>
              <line x1="12" y1="7" x2="12" y2="13"></line>
            </svg>
            {isScreenSharing && <span className="screen-share-indicator"></span>}
          </button>
          
          {/* Resolution selector dropdown */}
          <button
            className="resolution-selector-btn"
            onClick={(e) => { e.stopPropagation(); setShowResolutionMenu(!showResolutionMenu); }}
            title="Select screen resolution"
            ref={resolutionSelectorRef}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 15 12 9 18 15"></polyline>
            </svg>
          </button>
          
          {/* Resolution dropdown menu - Always opens UPWARD for consistency */}
          {showResolutionMenu && ReactDOM.createPortal(
            <div className={`apsara-widget theme-${currentTheme}`}>
              <div 
                className="resolution-menu" 
                onClick={(e) => e.stopPropagation()}
                style={(() => {
                  // Calculate position - always show ABOVE the button
                  const button = resolutionSelectorRef.current;
                  if (!button) return {};
                  const rect = button.getBoundingClientRect();
                  const spacing = 5;
                  
                  // Always position above the button (consistent upward opening)
                  return {
                    position: 'fixed',
                    bottom: `${window.innerHeight - rect.top + spacing}px`,
                    right: `${window.innerWidth - rect.right}px`,
                    maxHeight: '400px',
                    overflowY: 'auto',
                  };
                })()}
              >
                {availableResolutions.map((res) => (
                  <div
                    key={res.value}
                    className={`resolution-option ${selectedResolution === res.value ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedResolution(res.value);
                      setShowResolutionMenu(false);
                      debugLog(`📐 Resolution changed to: ${res.label}`);
                    }}
                  >
                    {selectedResolution === res.value && <span className="checkmark">✓</span>}
                    {res.label}
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Camera button with resolution selector */}
        <div className="camera-container">
          <button
            className={`video-button ${isCameraActive ? 'active' : ''}`}
            onClick={handleCameraToggle}
            title={isCameraActive ? 'Stop camera' : 'Start camera'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            {/* Green indicator light when camera is active */}
            {isCameraActive && <span className="camera-indicator"></span>}
          </button>
          
          {/* Camera resolution selector dropdown */}
          <button
            className="camera-resolution-selector-btn"
            onClick={(e) => { e.stopPropagation(); setShowCameraResolutionMenu(!showCameraResolutionMenu); }}
            title="Select camera resolution"
            ref={cameraResolutionSelectorRef}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 15 12 9 18 15"></polyline>
            </svg>
          </button>
          
          {/* Camera resolution dropdown menu - Always opens UPWARD for consistency */}
          {showCameraResolutionMenu && ReactDOM.createPortal(
            <div className={`apsara-widget theme-${currentTheme}`}>
              <div 
                className="camera-resolution-menu resolution-menu" 
                onClick={(e) => e.stopPropagation()}
                style={(() => {
                  // Calculate position - always show ABOVE the button
                  const button = cameraResolutionSelectorRef.current;
                  if (!button) return {};
                  const rect = button.getBoundingClientRect();
                  const spacing = 5;
                  
                  // Always position above the button (consistent upward opening)
                  return {
                    position: 'fixed',
                    bottom: `${window.innerHeight - rect.top + spacing}px`,
                    right: `${window.innerWidth - rect.right}px`,
                    maxHeight: '400px',
                    overflowY: 'auto',
                  };
                })()}
              >
                {availableCameraResolutions.map((res) => (
                  <div
                    key={res.value}
                    className={`resolution-option ${selectedCameraResolution === res.value ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedCameraResolution(res.value);
                      setShowCameraResolutionMenu(false);
                      debugLog(`📐 Camera resolution changed to: ${res.label}`);
                    }}
                  >
                    {selectedCameraResolution === res.value && <span className="checkmark">✓</span>}
                    {res.label}
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Tools selector button */}
        <button
          className="tools-button"
          onClick={(e) => { e.stopPropagation(); setShowToolsSelector(!showToolsSelector); }}
          title="Configure tools"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </button>

        {/* Settings/Theme button */}
        <button
          className="settings-button"
          onClick={(e) => { e.stopPropagation(); setShowThemeSelector(!showThemeSelector); }}
          title="Change theme"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m8.66-13.66l-4.24 4.24M7.58 16.42l-4.24 4.24M1 12h6m6 0h6m-1.34 8.66l-4.24-4.24M7.58 7.58L3.34 3.34"></path>
          </svg>
        </button>

        {/* Theme selector panel - Opens upward */}
        {showThemeSelector && ReactDOM.createPortal(
          <div className={`apsara-widget theme-${currentTheme}`}>
            <div 
              className="theme-selector-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="panel-title">
                Choose Theme
              </div>
              <div className="button-container">
                {themes.map((theme) => (
                  <button
                    key={theme.class}
                    onClick={() => handleThemeChange(theme.class)}
                    className={currentTheme === theme.class ? 'active' : ''}
                  >
                    {currentTheme === theme.class && '✓ '}{theme.name}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Tools selector panel - Opens upward */}
        {showToolsSelector && ReactDOM.createPortal(
          <div className={`apsara-widget theme-${currentTheme}`}>
            <div 
              className="tools-selector-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="panel-header">
                <div className="panel-title">
                  Configure Tools {isConnected && <span className="warning-text">(Stop session first)</span>}
                </div>
                {availableTools.length > 0 && (
                  <div className="panel-actions">
                    <button 
                      className="action-button select-all" 
                      onClick={handleSelectAll}
                      disabled={isConnected}
                      title="Enable all tools"
                    >
                      ✓ All
                    </button>
                    <button 
                      className="action-button clear-all" 
                      onClick={handleClearAll}
                      disabled={isConnected}
                      title="Disable all tools"
                    >
                      ✗ Clear
                    </button>
                  </div>
                )}
              </div>
              {availableTools.length === 0 ? (
                <div className="tools-error">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <div className="error-text">Backend not running</div>
                  <div className="error-hint">Start the backend server to configure tools</div>
                </div>
              ) : (
                <>
                  <div className="tools-list">
                    {availableTools.map((tool) => (
                      <div
                        key={`${tool.id}-${tool.enabled}-${tool.async}-${tool.model || ''}`}
                        className={`tool-item ${tool.enabled ? 'enabled' : 'disabled'} ${isConnected ? 'locked' : ''}`}
                        onClick={() => handleToolToggle(tool.id)}
                      >
                        <div className="tool-checkbox">
                          {tool.enabled ? '✓' : ''}
                        </div>
                        <div className="tool-info">
                          <div className="tool-name">
                            {tool.name}
                            <span 
                              className={`async-badge ${tool.async ? 'async' : 'sync'} ${isConnected ? 'locked' : ''}`}
                              onClick={(e) => handleAsyncToggle(tool.id, e)}
                              title={tool.async ? 'Non-blocking (click to make blocking)' : 'Blocking (click to make non-blocking)'}
                            >
                              {tool.async ? 'ASYNC' : 'SYNC'}
                            </span>
                            {tool.id === 'generate_image' && tool.enabled && (
                              <span 
                                className={`model-badge ${tool.model === 'pro' ? 'pro' : 'flash'} ${isConnected ? 'locked' : ''}`}
                                onClick={handleImageModelToggle}
                                title={tool.model === 'pro' ? '3.0 Pro (click for 2.5 Flash)' : '2.5 Flash (click for 3.0 Pro)'}
                              >
                                {tool.model === 'pro' ? '3.0 PRO' : '2.5 FLASH'}
                              </span>
                            )}
                          </div>
                          <div className="tool-description">{tool.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isConnected && (
                    <div className="tools-hint">
                      Select tools before starting a session
                    </div>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body
        )}

        <button className="end-button" onClick={handleEndClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          {isConnected ? 'End' : 'Start'}
        </button>
      </div>

      {/* Generated Image Viewer */}
      {generatedImage && (
        <GeneratedImageViewer
          imageData={generatedImage}
          onClose={handleCloseImageViewer}
          onEmailImage={handleEmailImage}
          onSaveImage={handleSaveImage}
          onCopyImage={handleCopyImage}
        />
      )}
    </div>
  );
};

export default ApsaraWidget;
