import React, { useState, useRef, useEffect } from 'react';
import { MessageRole, ChatMessage as ChatMessageType, AppState } from './types';
import { chatWithGemini, generateImage } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

interface ImageFilters {
  brightness: number;
  contrast: number;
  saturation: number;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState & { capturedImage: string | null }>({
    messages: [
      {
        id: '1',
        role: MessageRole.MODEL,
        content: "Welcome, Son of St. Peters. I am BOADI LISTOWEL AI. The Persco Quantum core is online and tuned to your frequency. Ready for academic or general directives.",
        timestamp: Date.now(),
        type: 'text'
      }
    ],
    isThinking: false,
    mode: 'chat',
    capturedImage: null
  });

  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
  });

  const [inputValue, setInputValue] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const PERSCO_LOGO_URL = "https://upload.wikimedia.org/wikipedia/en/3/3a/St_Peters_SHS_Logo.png";

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.isThinking]);

  useEffect(() => {
    if (isCameraOpen && videoRef.current) {
      startCamera();
    }
  }, [isCameraOpen, cameraFacingMode]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInputValue(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  };

  const startCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const toggleCameraFacing = () => {
    setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleCamera = () => {
    if (isCameraOpen) {
      stopCamera();
    } else {
      setCameraFacingMode('user'); // Force front camera by default when opening
      setIsCameraOpen(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Handle mirroring for captured photo if using front camera
        if (cameraFacingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setState(prev => ({ ...prev, capturedImage: dataUrl }));
        setFilters({ brightness: 100, contrast: 100, saturation: 100 });
        setIsEnhancing(true);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setState(prev => ({ ...prev, capturedImage: dataUrl }));
        setFilters({ brightness: 100, contrast: 100, saturation: 100 });
        setIsEnhancing(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyFiltersToImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } else {
          resolve(base64);
        }
      };
      img.src = base64;
    });
  };

  const removeCapturedImage = () => {
    setState(prev => ({ ...prev, capturedImage: null }));
    setIsEnhancing(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputValue.trim() && !state.capturedImage) || state.isThinking) return;

    let currentImage = state.capturedImage;
    if (currentImage && isEnhancing) {
      currentImage = await applyFiltersToImage(currentImage);
    }

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content: inputValue || (currentImage ? "Analyze this enhanced visual data" : ""),
      timestamp: Date.now(),
      type: currentImage ? 'image' : 'text',
      imageUrl: currentImage || undefined
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isThinking: true,
      capturedImage: null
    }));
    
    setIsEnhancing(false);
    const currentInput = inputValue;
    setInputValue('');

    try {
      if (state.mode === 'image') {
        const imageUrl = await generateImage(currentInput || "Academic excellence symbolic art St. Peters SHS style");
        const imageMessage: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          role: MessageRole.MODEL,
          content: `Genesis Visual Manifestation: "${currentInput || "Dignitati"}"`,
          timestamp: Date.now(),
          type: 'image',
          imageUrl
        };
        setState(prev => ({ ...prev, messages: [...prev.messages, imageMessage], isThinking: false }));
      } else {
        const history = state.messages
          .filter(m => m.type === 'text')
          .slice(-10)
          .map(m => ({ 
            role: m.role, 
            parts: [{ text: m.content }] 
          }));

        let imagePart;
        if (currentImage) {
          const base64Data = currentImage.split(',')[1];
          imagePart = {
            mimeType: 'image/jpeg',
            data: base64Data
          };
        }

        const result = await chatWithGemini(currentInput || "Analyze and interpret this visual data", history, state.mode, imagePart);
        
        const aiMessage: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          role: MessageRole.MODEL,
          content: result.text,
          timestamp: Date.now(),
          type: 'text',
          sources: result.sources
        };

        setState(prev => ({ ...prev, messages: [...prev.messages, aiMessage], isThinking: false }));
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        content: `Transmission error in Persco network core. Interface disrupted.`,
        timestamp: Date.now(),
        type: 'error'
      };
      setState(prev => ({ ...prev, messages: [...prev.messages, errorMessage], isThinking: false }));
    }
  };

  return (
    <div className="h-screen flex flex-col relative text-slate-100">
      {/* Header */}
      <header className="glass-card z-50 px-8 py-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center space-x-5">
          <div className="w-12 h-12 flex items-center justify-center p-1 bg-white/5 rounded-xl border border-white/10 shadow-lg shadow-green-950/40 group overflow-hidden">
            <img 
              src={PERSCO_LOGO_URL} 
              alt="Persco Logo" 
              className="w-full h-full object-contain filter drop-shadow(0 0 8px rgba(16, 185, 129, 0.5)) transition-transform duration-500 group-hover:scale-110" 
            />
          </div>
          <div>
            <h1 className="brand-font text-sm font-black tracking-widest text-white uppercase flex items-center">
              BOADI LISTOWEL AI <span className="ml-2 px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded border border-green-500/20">PERSCO 3.0</span>
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
              <div className="status-dot"></div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mono-font">Quantum Core Online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-200">Active Academic Session</span>
              <div className="w-7 h-7 bg-indigo-600/20 border border-indigo-500/30 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto z-10 px-4 md:px-0 py-10">
        <div className="max-w-4xl mx-auto space-y-4">
          {state.messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {state.isThinking && (
            <div className="flex justify-start animate-in fade-in slide-in-from-left-4">
              <div className="glass-card px-6 py-4 rounded-2xl border-white/5 flex items-center space-x-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs font-black text-green-400 uppercase tracking-[0.2em] mono-font">Processing Neural Command...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Input Section */}
      <div className="glass-card z-50 border-t border-white/5 px-6 py-6 pb-10">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Mode Selectors */}
          <div className="flex items-center justify-between">
            <div className="flex items-center p-1 bg-black/20 rounded-xl border border-white/5">
              {(['chat', 'research', 'image'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setState(prev => ({ ...prev, mode: m }))}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 border border-transparent ${
                    state.mode === m ? 'mode-toggle-active' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m === 'chat' && 'Standard'}
                  {m === 'research' && 'Grounding'}
                  {m === 'image' && 'Visual Gen'}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <button 
                onClick={toggleVoiceInput}
                className={`p-2.5 rounded-xl border transition-all ${isListening ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                title="Voice Input"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </button>
              <button 
                onClick={toggleCamera}
                className={`p-2.5 rounded-xl border transition-all ${isCameraOpen ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                title="Camera Interface"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                title="Upload Visual"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="relative group">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isListening ? "Listening..." : (state.mode === 'image' ? "Describe the vision to generate..." : "Transmit directive to core...")}
              className={`w-full bg-black/40 border rounded-2xl py-5 pl-7 pr-32 text-slate-200 placeholder-slate-600 focus:outline-none transition-all font-medium ${isListening ? 'border-amber-500/40 ring-2 ring-amber-500/20' : 'border-white/10 focus:ring-2 focus:ring-green-500/30 focus:border-green-500/40'}`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              {state.capturedImage && (
                <div className="relative group/thumb">
                  <img src={state.capturedImage} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-green-500/40 shadow-lg" />
                  <button 
                    onClick={removeCapturedImage}
                    className="absolute -top-2 -right-2 bg-red-600 rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              )}
              <button 
                type="submit"
                disabled={state.isThinking || (!inputValue.trim() && !state.capturedImage)}
                className="bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </form>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </div>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="max-w-3xl w-full glass-card rounded-[3rem] overflow-hidden border-white/10 shadow-2xl relative">
            <div className="absolute top-6 right-6 z-10 flex space-x-3">
              <button 
                onClick={toggleCameraFacing} 
                className="p-3 bg-black/40 border border-white/10 rounded-2xl text-white hover:bg-black/60 transition-all flex items-center space-x-2"
                title="Switch Camera"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"></path><path d="m4.93 4.93 2.83 2.83"></path><path d="M2 12h4"></path><path d="m4.93 19.07 2.83-2.83"></path><path d="M12 22v-4"></path><path d="m19.07 19.07-2.83-2.83"></path><path d="M22 12h-4"></path><path d="m19.07 4.93-2.83 2.83"></path></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">{cameraFacingMode === 'user' ? 'Front' : 'Back'}</span>
              </button>
              <button onClick={stopCamera} className="p-3 bg-red-600/20 border border-red-500/40 rounded-2xl text-red-500 hover:bg-red-600/30 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="relative aspect-video bg-black overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover transition-transform ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
              />
              <div className="absolute inset-0 pointer-events-none border-4 border-green-500/20 m-8 rounded-3xl flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-white/20 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="p-10 text-center">
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full p-1.5 shadow-2xl transition-transform active:scale-90"
              >
                <div className="w-full h-full border-4 border-green-600 rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 bg-green-600 rounded-full"></div>
                </div>
              </button>
              <p className="mt-6 text-[11px] font-black text-slate-500 uppercase tracking-widest">Capture Visual Intelligence</p>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Image Enhancement Panel */}
      {isEnhancing && state.capturedImage && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-10">
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-card rounded-[2rem] overflow-hidden border-white/10 shadow-2xl">
              <img 
                src={state.capturedImage} 
                alt="Captured" 
                className="w-full h-auto object-contain bg-slate-900" 
                style={{ filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)` }}
              />
            </div>
            <div className="glass-card rounded-[2rem] p-8 border-white/10 flex flex-col justify-between">
              <div className="space-y-10">
                <h3 className="brand-font text-2xl font-black text-white tracking-tight uppercase">Enhance <span className="text-green-500">Visuals</span></h3>
                
                <div className="space-y-6">
                  {Object.entries(filters).map(([key, value]) => (
                    <div key={key} className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{key}</span>
                        <span className="text-xs font-bold text-green-400">{value}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="150" 
                        value={value}
                        onChange={(e) => setFilters(f => ({ ...f, [key]: parseInt(e.target.value) }))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mt-10">
                <button 
                  onClick={() => setIsEnhancing(false)}
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black text-xs tracking-widest uppercase transition-all shadow-lg"
                >
                  Confirm & Process
                </button>
                <button 
                  onClick={removeCapturedImage}
                  className="w-full bg-white/5 hover:bg-white/10 text-slate-400 py-4 rounded-xl font-black text-xs tracking-widest uppercase transition-all"
                >
                  Discard Feed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;