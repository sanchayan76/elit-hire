import { useState, useEffect, useRef, useCallback } from "react";
import * as faceapi from 'face-api.js';
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { toast } from "sonner";
import { candidateOperations } from "@/integrations/supabase/client";
import { 
  Camera, 
  CameraOff, 
  Clock, 
  CheckCircle2, 
  Code, 
  ListChecks,
  AlertTriangle,
  Play,
  ChevronRight,
  ChevronLeft,
  Eye,
  Send,
  User as UserIcon,
  Bot,
  Shield,
  FileText,
  Loader2
} from "lucide-react";

const codingChallenge = {
  title: "Two Sum Problem",
  description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example:
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] = 2 + 7 = 9`,
  starterCode: `function twoSum(nums, target) {
  // Your solution here
  
}`,
};

type TestPhase = "intro" | "interview" | "coding" | "submitting" | "complete";

export default function Test() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('id');
  
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [candidateData, setCandidateData] = useState<any>(null);
  const [code, setCode] = useState(codingChallenge.starterCode);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [faceAlertMessage, setFaceAlertMessage] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [showFaceOverlay, setShowFaceOverlay] = useState(false);
  const detectionIntervalRef = useRef<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [retryCount, setRetryCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch candidate data and verify test ID
  useEffect(() => {
    const verifyAndFetch = () => {
      try {
        if (!testId) {
          toast.error("Invalid test session. Please apply again.");
          navigate('/apply');
          return;
        }

        const storedData = localStorage.getItem(`candidateData_${testId}`) || localStorage.getItem('candidateData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setCandidateData(parsedData);
        } else {
          toast.error("Candidate data not found. Please apply again.");
          navigate('/apply');
        }
      } catch (error) {
        console.error("Error verifying test session:", error);
        toast.error("Failed to load application data.");
        navigate('/apply');
      }
    };
    verifyAndFetch();
  }, [navigate, testId]);

  // Load face detection models
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("Loading face-api models from /models...");
        // Use a base URL for models to ensure they are found
        const MODEL_URL = '/models';
        
        // Load models sequentially to track progress and handle failures better
        console.log("Loading TinyFaceDetector...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        console.log("TinyFaceDetector loaded");
        
        console.log("Loading SsdMobilenetv1...");
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        console.log("SsdMobilenetv1 loaded");

        setModelsLoaded(true);
        console.log("Face detection models loaded successfully");
        toast.success("AI Proctoring System Ready", { icon: "🛡️" });
      } catch (error) {
        console.error("Error loading face detection models:", error);
        toast.error("Proctoring AI failed to load. Please ensure /models folder exists in public directory.");
      }
    };
    loadModels();
  }, []);

  const stopFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  const startFaceDetection = useCallback(() => {
    if (!modelsLoaded || !videoRef.current || detectionIntervalRef.current) {
      console.log("Cannot start face detection loop yet:", { 
        modelsLoaded, 
        videoReadyState: videoRef.current?.readyState, 
        hasInterval: !!detectionIntervalRef.current 
      });
      return;
    }

    console.log("Starting face detection loop (every 2s)...");
    detectionIntervalRef.current = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video) return;

      // Force video to play if it's paused but has a stream
      if (video.paused && video.srcObject) {
        try {
          await video.play();
        } catch (e) {
          console.error("Failed to auto-play video in detection loop:", e);
        }
      }

      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          // Use a larger input size for better detection at a distance
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });
          const detections = await faceapi.detectAllFaces(video, options);
          
          const currentFaceCount = detections.length;
          
          // Log detection result for debugging
          if (currentFaceCount !== faceCount) {
            console.log(`[Face AI] Detection update: ${currentFaceCount} faces (Video: ${video.videoWidth}x${video.videoHeight})`);
          }
          
          setFaceCount(currentFaceCount);

          if (currentFaceCount > 1) {
            console.warn("[Face AI] ALERT: Multiple faces!");
            setFaceAlertMessage("Multiple faces detected! Please ensure only you are visible.");
            setShowFaceOverlay(true);
            setWarnings(prev => {
              console.log("Face AI: Incrementing warnings (multiple faces). New count:", prev + 1);
              return prev + 1;
            });
          } else if (currentFaceCount === 0) {
            console.warn("[Face AI] ALERT: No face!");
            setFaceAlertMessage("No face detected! Please ensure you are visible to the camera.");
            setShowFaceOverlay(true);
            // Count "no face" as a violation
            setWarnings(prev => {
              console.log("Face AI: Incrementing warnings (no face). New count:", prev + 1);
              return prev + 1;
            });
          } else {
            setShowFaceOverlay(false);
          }
        } catch (err) {
          console.error("[Face AI] Detection loop error:", err);
          // If detection fails, it might be due to model loading or video issues
          if (err instanceof Error && err.message.includes('not loaded')) {
             console.log("Models might not be ready, attempting to reload...");
          }
        }
      } else {
        console.log(`[Face AI] Video not ready (readyState: ${video.readyState})`);
      }
    }, 2000);
  }, [modelsLoaded, faceCount]);

  // Camera setup
  const enableCamera = useCallback(async () => {
    try {
      console.log("Enabling camera...");
      
      // Stop any existing tracks first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = { 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Camera stream obtained:", stream.id);
      streamRef.current = stream;
      
      // Direct attachment if video element is ready
      if (videoRef.current) {
        console.log("Directly attaching stream to video element");
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          console.log("Video playing via direct attachment");
        } catch (e) {
          console.warn("Direct play failed, relying on useEffect fallback:", e);
        }
      }

      setCameraEnabled(true);
      toast.success("Camera initialized");
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Failed to access camera. Please ensure you have given permission.");
    }
  }, []);

  // Effect to attach stream to video element when it becomes available
   useEffect(() => {
     if (cameraEnabled && videoRef.current && streamRef.current) {
       console.log("Attaching stream to video element...", {
         hasStream: !!streamRef.current,
         videoElement: !!videoRef.current,
         alreadyHasSrc: !!videoRef.current.srcObject
       });
       
       const video = videoRef.current;
       
       if (video.srcObject !== streamRef.current) {
         video.srcObject = streamRef.current;
       }
       
       const playVideo = async () => {
         try {
           console.log("Attempting to play video...");
           await video.play();
           console.log("Video playing successfully:", {
             width: video.videoWidth,
             height: video.videoHeight,
             readyState: video.readyState
           });
           startFaceDetection();
         } catch (playError) {
           console.error("Error playing video:", playError);
           // Try again after a short delay if it failed (e.g. browser policy)
           setTimeout(playVideo, 1000);
         }
       };

       video.onloadedmetadata = () => {
         console.log("Video metadata loaded");
         playVideo();
       };
       
       // If readyState is already enough, play immediately
       if (video.readyState >= 1) {
         playVideo();
       }
     }
   }, [cameraEnabled, startFaceDetection]);

  const disableCamera = useCallback(() => {
    stopFaceDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraEnabled(false);
  }, [stopFaceDetection]);

  // Auto-start detection when conditions met
  useEffect(() => {
    if (modelsLoaded && cameraEnabled && phase !== "submitting" && phase !== "complete") {
      console.log("Auto-starting face detection loop...");
      startFaceDetection();
    }
    return () => {
      // Only stop if we're actually leaving the test or if models/camera are disabled
      if (!cameraEnabled || phase === "complete") {
        console.log("Stopping face detection loop...");
        stopFaceDetection();
      }
    };
  }, [modelsLoaded, cameraEnabled, phase, startFaceDetection, stopFaceDetection]);

  // Handle phase transitions and auto-starts
  useEffect(() => {
    if (phase === "interview") {
      const initInterview = async () => {
        // First ensure camera is enabled
        if (!cameraEnabled) {
          console.log("Interview started: enabling camera...");
          await enableCamera();
        } else {
          console.log("Interview started: camera already enabled, starting detection...");
          startFaceDetection();
        }
        
        // Trigger initial question if no messages yet
        if (messages.length === 0 && !isTyping) {
          setIsTyping(true);
          try {
            const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!geminiApiKey) {
              throw new Error("Gemini API key is not configured");
            }
            console.log("Using Gemini API Key (starts with):", geminiApiKey.substring(0, 6) + "...");
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
            console.log("Calling Gemini API URL:", url.split('?')[0]);

            const systemPrompt = `You are an expert AI interviewer for ELITEHIRE AI platform. 
            Your goal is to conduct a professional, technical interview with a candidate.
            
            Candidate Name: ${candidateData?.full_name || 'Candidate'}
            Candidate Email: ${candidateData?.email || 'N/A'}
            Resume Text: ${candidateData?.resume_text?.substring(0, 2000) || "Not available"}

            Interview Guidelines:
            1. Ask exactly 5 questions in total, one at a time.
            2. Questions should be based on the candidate's background and skills mentioned in their resume.
            3. Be professional, encouraging, but rigorous.
            4. Keep your responses concise. 
            5. After the candidate answers the 5th question, thank them and inform them that the interview phase is complete.

            This is the start of the interview. Please introduce yourself and ask the first question.
            `;

            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [
                  { 
                    role: "user", 
                    parts: [{ text: systemPrompt }] 
                  }
                ],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 800,
                },
              }),
            });

            if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Gemini API Error details:", JSON.stringify(errorData, null, 2));
        if (response.status === 429 || response.status === 503 || response.status === 504) {
          const isQuota = response.status === 429;
          toast.error(isQuota ? "AI Quota Exceeded" : "AI Engine Temporarily Unavailable", {
            description: "The AI is currently busy. Please wait 30 seconds and try again.",
            duration: 6000
          });
          // Retry logic if applicable or just let user try again
        }
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}${errorData.error?.message ? ` - ${errorData.error.message}` : ''}`);
      }

            const data = await response.json();
            const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (aiContent) {
              setMessages([{ role: 'assistant', content: aiContent }]);
            }
          } catch (error) {
            console.error("Initial question error:", error);
            toast.error("Failed to start AI interview");
          } finally {
            setIsTyping(false);
          }
        }
      };
      
      initInterview();
    }
  }, [phase, cameraEnabled, enableCamera, messages.length, isTyping, candidateData, retryCount]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setPhase("submitting");

    try {
      // More accurate and strict scoring logic
      const starterLength = codingChallenge.starterCode.trim().length;
      const currentLength = code.trim().length;
      const addedContent = currentLength - starterLength;
      
      // 1. Basic completion score (0-100)
      // More lenient scoring for coding attempt
      const hasKeywords = ["function", "const", "let", "return", "for", "if"].some(k => code.includes(k));
      let codingScore = 0;
      if (addedContent > 20 && hasKeywords) {
        codingScore = Math.min(100, (addedContent / 150) * 100);
      }

      // 2. Logic penalty
      // If code is extremely short, it's likely no attempt was made
      if (currentLength < 50) codingScore = 0;

      // 3. Proctoring Penalties (Strict)
      // Each face detection warning: -10 points
      // Each tab switch: -15 points
      const faceWarnings = warnings - tabSwitches;
      const facePenalty = faceWarnings * 10;
      const switchPenalty = tabSwitches * 15;
      const totalPenalty = facePenalty + switchPenalty;

      // Final score calculation (0-100 scale)
      const finalScore = Math.max(0, codingScore - totalPenalty);

      // Store test results locally
      const testResults = {
        testId,
        status: 'completed',
        chatHistory: messages,
        codingSubmission: { 
          code, 
          length: currentLength,
          addedContent,
          submittedAt: new Date().toISOString() 
        },
        codingScore: codingScore,
        penaltyScore: totalPenalty,
        tabSwitches,
        faceWarnings,
        finalScore,
        completedAt: new Date().toISOString(),
        evaluationStatus: 'pending'
      };

      localStorage.setItem(`testResult_${testId}`, JSON.stringify(testResults));

      // Save to Supabase
      try {
        await candidateOperations.update(testId, {
          final_score: finalScore,
          coding_score: codingScore,
          penalty_score: totalPenalty,
          decision: finalScore >= 70 ? 'PASS' : finalScore >= 40 ? 'REVIEW' : 'FAIL',
          completed_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Supabase update error:", err);
        // If update fails, it might be because the record wasn't created in Apply.tsx
        // Try to create/upsert it as a fallback
        try {
          const candidateInfo = localStorage.getItem('candidateData');
          const candidateParsed = candidateInfo ? JSON.parse(candidateInfo) : null;
          if (candidateParsed) {
            await candidateOperations.create({
              test_id: testId,
              full_name: candidateParsed.full_name,
              email: candidateParsed.email,
              resume_text: candidateParsed.resume_text,
              final_score: finalScore,
              coding_score: codingScore,
              penalty_score: totalPenalty,
              decision: finalScore >= 70 ? 'PASS' : finalScore >= 40 ? 'REVIEW' : 'FAIL',
              completed_at: new Date().toISOString()
            });
          }
        } catch (upsertErr) {
          console.error("Supabase fallback upsert error:", upsertErr);
        }
      }

      // Save to system backend
      try {
        await fetch('http://localhost:5000/api/save-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId, data: testResults, type: 'result' })
        });
      } catch (err) {
        console.error("Backend save error:", err);
      }

      disableCamera();
      setPhase("complete");
      
      toast.success("Test submitted successfully!");
      
      // Navigate to results after a delay
      setTimeout(() => {
        if (testId) {
          navigate(`/results?id=${testId}`);
        } else {
          toast.error("Test ID missing. Please contact support.");
          navigate('/apply');
        }
      }, 2000);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error("Failed to submit test");
      setPhase("coding");
      setIsSubmitting(false);
    }
  }, [isSubmitting, code, warnings, tabSwitches, testId, messages, navigate, disableCamera]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMessage = { role: 'user' as const, content: chatInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setChatInput("");
    setIsTyping(true);

    try {
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error("Gemini API key is not configured");
      }
      console.log("Using Gemini API Key (starts with):", geminiApiKey.substring(0, 6) + "...");
      
      const systemPrompt = `You are an expert AI interviewer for ELITEHIRE AI platform. 
      Your goal is to conduct a professional, technical interview with a candidate.
      
      Candidate Name: ${candidateData?.full_name || 'Candidate'}
      Candidate Email: ${candidateData?.email || 'N/A'}
      Resume Text: ${candidateData?.resume_text?.substring(0, 2000) || "Not available"}

      Interview Guidelines:
      1. Ask exactly 5 questions in total, one at a time.
      2. Questions should be based on the candidate's background and skills mentioned in their resume.
      3. Be professional, encouraging, but rigorous.
      4. Keep your responses concise. 
      5. After the candidate answers the 5th question, thank them and inform them that the interview phase is complete.

      Current interview state:
      - Questions asked so far: ${updatedMessages.filter(m => m.role === 'assistant').length}
      - Total questions to ask: 5
      `;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      console.log("Calling Gemini API URL:", url.split('?')[0]);

      // Truncate message history to stay within context limits
      const truncatedMessages = updatedMessages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content?.substring(0, 1000) }]
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            ...truncatedMessages
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Gemini API Error details:", JSON.stringify(errorData, null, 2));
        if (response.status === 429 || response.status === 503 || response.status === 504) {
          const isQuota = response.status === 429;
          toast.error(isQuota ? "AI Quota Exceeded" : "AI Engine Temporarily Unavailable", {
            description: "The AI is currently busy. Please wait 30 seconds and try again.",
            duration: 6000
          });
          // Retry logic if applicable or just let user try again
        }
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}${errorData.error?.message ? ` - ${errorData.error.message}` : ''}`);
      }

      const data = await response.json();
      const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiContent) {
        throw new Error("No response from AI");
      }

      setMessages([...updatedMessages, { role: 'assistant', content: aiContent }]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI interviewer");
    } finally {
      setIsTyping(false);
    }
  };

  // Tab visibility detection
  useEffect(() => {
    if (phase !== "interview" && phase !== "coding") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("Proctoring: Tab switch detected.");
        setWarnings(w => {
          console.log("Proctoring: Incrementing total warnings (tab switch). New count:", w + 1);
          return w + 1;
        });
        setTabSwitches(prev => prev + 1);
        toast.warning("Tab switch detected! This has been logged.", {
          duration: 3000,
        });
        
        // Local logging instead of Supabase
        const currentLogs = JSON.parse(localStorage.getItem('proctorLogs') || '[]');
        currentLogs.push({
          test_id: testId,
          event_type: 'tab_switch',
          event_data: { timestamp: new Date().toISOString() },
          severity: 'medium',
        });
        localStorage.setItem('proctorLogs', JSON.stringify(currentLogs));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [phase, testId]);

  // Timer
  useEffect(() => {
    if (phase !== "interview" && phase !== "coding") return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, handleSubmit]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disableCamera();
    };
  }, [disableCamera]);

  const startTest = async () => {
    // Force set phase first to ensure video element is rendered
    setPhase("interview");
    
    // Update local status
    const currentTestId = localStorage.getItem('currentTestId');
    localStorage.setItem(`testStatus_${currentTestId}`, 'in_progress');
  };

  return (
    <Layout fullWidth>
      <div className="flex flex-col min-h-[calc(100vh-12rem)] max-w-[1800px] mx-auto gap-6 px-6">
        {/* Header Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex flex-col">
              <h1 className="text-3xl font-black flex items-center gap-3">
                <span className="gradient-text tracking-tighter">AI ASSESSMENT</span>
                <span className="text-[10px] px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary uppercase tracking-[0.2em] font-black animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                  LIVE SESSION
                </span>
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                <UserIcon className="w-3 h-3 text-primary/60" />
                CANDIDATE: <span className="text-foreground font-bold tracking-wide uppercase">{candidateData?.full_name}</span>
              </p>
            </div>
          </motion.div>

          <div className="flex items-center gap-4">
            <GlassCard className="flex items-center gap-4 px-6 py-3 border-primary/20" variant="elevated">
              <div className="p-2 rounded-xl bg-primary/10">
                <Clock className={`w-5 h-5 ${timeLeft < 300 ? "text-destructive animate-pulse" : "text-primary"}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Time Remaining</span>
                <span className={`font-mono text-2xl font-black tabular-nums ${timeLeft < 300 ? "text-destructive" : "text-foreground"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-4 px-6 py-3 border-warning/20" variant="elevated">
              <div className="p-2 rounded-xl bg-warning/10">
                <AlertTriangle className={`w-5 h-5 ${warnings > 0 ? "text-warning" : "text-muted-foreground"}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">AI Violations</span>
                <span className="text-2xl font-black">
                  {warnings}
                </span>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
          {/* Left Column: Proctoring & Tasks */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Camera Feed */}
            <GlassCard className="relative aspect-[4/3] overflow-hidden group border-white/5 bg-black" variant="elevated">
              {/* Video Element - Always in DOM for stable Ref */}
              <div className={`relative h-full w-full ${!cameraEnabled ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1] z-0"
                />
                {/* Liquid Overlay Effects */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none z-1" />
                
                {/* Face detection overlay */}
                <AnimatePresence>
                  {showFaceOverlay && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 border-[6px] border-destructive/30 flex items-end justify-center p-6 bg-destructive/5 backdrop-blur-[2px] z-20"
                    >
                      <motion.div 
                        initial={{ y: 20 }}
                        animate={{ y: 0 }}
                        className="bg-destructive text-white text-[10px] px-6 py-3 rounded-2xl font-black flex items-center gap-3 shadow-2xl shadow-destructive/40 uppercase tracking-[0.1em]"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        {faceAlertMessage}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Status Badges */}
                <div className="absolute top-6 left-6 flex flex-col gap-3 z-20">
                  <div className="flex items-center gap-3 bg-black/60 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
                    <div className={`w-2.5 h-2.5 rounded-full ${faceCount === 1 ? "bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-warning shadow-[0_0_10px_rgba(234,179,8,0.5)]"} animate-pulse`} />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                      {faceCount === 1 ? "AI TRACKING ACTIVE" : "SIGNAL UNSTABLE"}
                    </span>
                  </div>
                  
                  {/* Manual Refresh Button */}
                  <button 
                    onClick={enableCamera}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 transition-colors text-[8px] font-black text-white/50 uppercase tracking-widest"
                  >
                    <Camera className="w-3 h-3" />
                    Reset Feed
                  </button>
                </div>
              </div>

              {/* Placeholder UI - Shown when camera not enabled */}
              {!cameraEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl transition-all z-10">
                  <motion.div 
                    className="w-20 h-20 rounded-[2rem] bg-secondary/50 flex items-center justify-center mb-6 border border-white/10"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <CameraOff className="w-10 h-10 text-muted-foreground/50" />
                  </motion.div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">Camera Offline</p>
                  <GlassButton size="lg" onClick={enableCamera} className="rounded-2xl">
                    <Camera className="w-4 h-4 mr-2" />
                    Initialize AI Proctor
                  </GlassButton>
                </div>
              )}
            </GlassCard>

            {/* Steps/Tasks */}
            <GlassCard className="flex-1 p-8 overflow-hidden flex flex-col border-white/5" variant="default">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-8">ASSESSMENT PIPELINE</h3>
              <div className="space-y-6">
                {[
                  { id: "intro", label: "Verification", icon: ListChecks },
                  { id: "interview", label: "Cognitive AI", icon: Bot },
                  { id: "coding", label: "Technical Lab", icon: Code },
                  { id: "complete", label: "Final Review", icon: CheckCircle2 },
                ].map((s, i) => (
                  <div key={s.id} className="relative group">
                    <div className={`flex items-center gap-5 p-4 rounded-[1.5rem] transition-all duration-500 border ${
                      phase === s.id 
                        ? "bg-primary/10 border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.15)] scale-[1.02]" 
                        : "opacity-40 border-transparent hover:opacity-60"
                    }`}>
                      <div className={`w-10 h-10 rounded-[1rem] flex items-center justify-center transition-transform duration-500 ${
                        phase === s.id ? "bg-primary text-primary-foreground rotate-6" : "bg-secondary"
                      }`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${phase === s.id ? "text-primary" : "text-muted-foreground"}`}>
                          Step {i + 1}
                        </span>
                        <span className={`text-sm font-bold tracking-tight ${phase === s.id ? "text-foreground" : "text-muted-foreground"}`}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {phase === "intro" && (
                <div className="mt-auto pt-8">
                  <GlassButton 
                    className="w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20" 
                    variant="primary" 
                    onClick={() => {
                      if (!cameraEnabled) {
                        toast.error("Please initialize AI Proctor before starting");
                        return;
                      }
                      startTest();
                    }}
                  >
                    Initiate Assessment
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </GlassButton>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right Column: Dynamic Content */}
          <div className="lg:col-span-9 flex flex-col min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {phase === "intro" ? (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -30, filter: "blur(10px)" }}
                  transition={{ duration: 0.6, ease: "circOut" }}
                  className="h-full overflow-y-auto"
                >
                  <GlassCard className="h-full p-12 flex flex-col items-center justify-center text-center border-white/5" variant="elevated">
                    <motion.div 
                      className="w-24 h-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center mb-10 border border-primary/20 shadow-2xl shadow-primary/10"
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        y: [0, -10, 0]
                      }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Shield className="w-12 h-12 text-primary" />
                    </motion.div>
                    <h2 className="text-5xl font-black mb-6 gradient-text tracking-tighter">INTEGRITY PROTOCOL</h2>
                    <p className="text-muted-foreground max-w-md mb-12 text-sm font-medium leading-relaxed">
                      Our advanced AI monitoring system is active. Please adhere to the following guidelines to ensure a valid assessment.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                      {[
                        { title: "VISUAL", text: "Maintain constant eye contact. Multi-face or no-face detection triggers warnings." },
                        { title: "FOCUS", text: "Tab switching or window minimization is strictly prohibited and logged." },
                        { title: "ENVIRONMENT", text: "Ensure a quiet, well-lit space. Audio and video are analyzed in real-time." }
                      ].map((item, idx) => (
                        <div key={idx} className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-left hover:bg-white/10 transition-colors duration-500">
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 block">0{idx + 1} {item.title}</span>
                          <p className="text-xs text-muted-foreground leading-relaxed font-bold">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              ) : phase === "interview" ? (
                <motion.div
                  key="interview"
                  initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.6 }}
                  className="h-full flex flex-col"
                >
                  <GlassCard className="flex-1 flex flex-col overflow-hidden border-white/5" variant="default">
                    <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] backdrop-blur-3xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/20">
                          <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black tracking-tight">GEMINI 2.5 FLASH</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expert Technical Interviewer</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-2 bg-success/10 rounded-xl border border-success/20">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-success">ENCRYPTED STREAM</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                      {messages.length === 0 && isTyping ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-60">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            <Bot className="w-6 h-6 text-primary absolute inset-0 m-auto" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Establishing Neural Link...</p>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                           <Bot className="w-12 h-12" />
                           <p className="text-sm font-bold uppercase tracking-widest">Awaiting AI Initialization</p>
                           <GlassButton variant="secondary" size="sm" onClick={() => setRetryCount(prev => prev + 1)} className="rounded-xl">
                             Retry Connection
                           </GlassButton>
                         </div>
                      ) : (
                        messages.map((msg, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, y: 0, x: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%] p-6 rounded-[2rem] relative group ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground shadow-[0_10px_40px_rgba(var(--primary),0.3)] rounded-tr-none font-bold text-sm' 
                              : 'bg-white/5 backdrop-blur-2xl border border-white/10 rounded-tl-none text-sm leading-relaxed font-medium shadow-[0_5px_20px_rgba(0,0,0,0.2)] hover:bg-white/10 transition-colors'
                          }`}>
                            {msg.role === 'assistant' && (
                              <div className="absolute -left-3 -top-3 w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 backdrop-blur-xl shadow-lg">
                                <Bot className="w-4 h-4 text-primary" />
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          </motion.div>
                        ))
                      )}
                      {messages.length > 0 && isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white/5 px-6 py-4 rounded-[2rem] rounded-tl-none border border-white/10 flex gap-2">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-6 bg-white/[0.02] border-t border-white/10 backdrop-blur-3xl">
                      <div className="flex gap-4 max-w-5xl mx-auto">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type your professional response..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all placeholder:text-muted-foreground/50"
                        />
                        <GlassButton 
                          type="submit" 
                          size="icon" 
                          disabled={!chatInput || isTyping}
                          className="w-14 h-14 rounded-[1.5rem] shadow-xl shadow-primary/20"
                        >
                          <Send className="w-5 h-5" />
                        </GlassButton>
                      </div>
                    </form>
                  </GlassCard>
                  
                  <div className="mt-6 flex justify-end">
                    <GlassButton 
                      variant="secondary" 
                      onClick={() => setPhase("coding")}
                      className="rounded-2xl px-8 h-12 text-xs font-black uppercase tracking-widest border-white/10 hover:bg-white/10"
                    >
                      Proceed to Technical Lab
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </GlassButton>
                  </div>
                </motion.div>
              ) : phase === "coding" ? (
                <motion.div
                  key="coding"
                  initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.6 }}
                  className="h-full flex flex-col gap-6"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                    <GlassCard className="p-8 overflow-y-auto border-white/5 flex flex-col" variant="default">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-black text-2xl tracking-tight">{codingChallenge.title}</h3>
                      </div>
                      <div className="flex-1 min-h-0">
                        <pre className="bg-black/40 p-8 rounded-[2.5rem] text-xs leading-relaxed font-mono border border-white/5 shadow-inner whitespace-pre-wrap break-words h-full overflow-y-auto">
                          {codingChallenge.description}
                        </pre>
                      </div>
                    </GlassCard>
                    
                    <GlassCard className="flex flex-col overflow-hidden border-white/5" variant="default">
                      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <Code className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">SOLUTION_LAB.JS</span>
                        </div>
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
                          <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
                          <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
                        </div>
                      </div>
                      <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="flex-1 w-full bg-black/30 p-10 font-mono text-sm leading-relaxed resize-none focus:outline-none custom-scrollbar text-white selection:bg-primary/30"
                        spellCheck={false}
                        placeholder="// Write your code here..."
                      />
                    </GlassCard>
                  </div>
                  <div className="flex justify-between items-center mt-2 bg-white/5 p-4 rounded-[2rem] border border-white/10">
                    <GlassButton 
                      variant="secondary" 
                      onClick={() => setPhase("interview")}
                      className="rounded-xl px-6 border-transparent hover:bg-white/5"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Back to Interview
                    </GlassButton>
                    <GlassButton 
                      variant="primary" 
                      onClick={handleSubmit} 
                      disabled={isSubmitting}
                      className="rounded-xl px-8 shadow-lg shadow-primary/20"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          VALIDATING SUBMISSION...
                        </>
                      ) : (
                        <>
                          SUBMIT FINAL ASSESSMENT
                          <CheckCircle2 className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </GlassButton>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}
