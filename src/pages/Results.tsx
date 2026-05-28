import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Layout } from "@/components/layout/Layout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { toast } from "sonner";
import { candidateOperations } from "@/integrations/supabase/client";
import {
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Lightbulb,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  BarChart3,
  Sparkles,
  RefreshCw,
  Home,
  Briefcase
} from "lucide-react";

interface EvaluationResult {
  decision: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  psychometric_traits: Record<string, number>;
  reasoning: string;
}

interface ResultData {
  id: string;
  mcq_score: number;
  coding_score: number;
  penalty_score: number;
  final_score: number;
  evaluation_status: string;
  ai_evaluation: {
    decision: string;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    psychometric_traits: Record<string, number>;
    reasoning: string;
    suggested_role: string;
  } | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  improvements: string[] | null;
  decision: string | null;
  reasoning: string | null;
  candidate: {
    full_name: string;
    email: string;
  };
}

export default function Results() {
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('id');
  
  const [result, setResult] = useState<ResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const fetchResults = async () => {
    if (!testId || testId === 'null') {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Try to load from Supabase first
      try {
        const supabaseData = await candidateOperations.getById(testId);
        if (supabaseData) {
          const combinedResult: ResultData = {
            id: testId,
            mcq_score: 0,
            coding_score: supabaseData.coding_score || 0,
            penalty_score: supabaseData.penalty_score || 0,
            final_score: supabaseData.final_score || 0,
            evaluation_status: supabaseData.ai_evaluation ? 'completed' : (supabaseData.final_score > 0 ? 'pending' : 'not_started'),
            ai_evaluation: supabaseData.ai_evaluation || null,
            strengths: supabaseData.ai_evaluation?.strengths || null,
            weaknesses: supabaseData.ai_evaluation?.weaknesses || null,
            improvements: supabaseData.ai_evaluation?.improvements || null,
            decision: supabaseData.decision || null,
            reasoning: supabaseData.ai_evaluation?.reasoning || null,
            candidate: {
              full_name: supabaseData.full_name,
              email: supabaseData.email
            }
          };
          setResult(combinedResult);
          
          // If we have test data but no AI evaluation yet, trigger it
          if ((supabaseData.coding_score > 0 || supabaseData.final_score > 0) && !supabaseData.ai_evaluation) {
            // Need to format it for triggerAIEvaluation
            const testData = {
              codingScore: supabaseData.coding_score,
              penaltyScore: supabaseData.penalty_score,
              finalScore: supabaseData.final_score,
              evaluationStatus: 'pending',
              completedAt: supabaseData.completed_at
            };
            triggerAIEvaluation(testData, supabaseData);
          }
          
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Supabase results fetch failed:", err);
      }

      // 2. Try to load from system backend first
      try {
        const response = await fetch(`http://localhost:5000/api/results/${testId}`);
        if (response.ok) {
          const backendData = await response.json();
          if (backendData.candidate && backendData.result) {
            const combinedResult: ResultData = {
              id: testId,
              mcq_score: 0,
              coding_score: backendData.result.codingScore,
              penalty_score: backendData.result.penaltyScore,
              final_score: backendData.result.finalScore,
              evaluation_status: backendData.result.evaluationStatus,
              ai_evaluation: backendData.result.aiEvaluation || null,
              strengths: backendData.result.strengths || null,
              weaknesses: backendData.result.weaknesses || null,
              improvements: backendData.result.improvements || null,
              decision: backendData.result.decision || null,
              reasoning: backendData.result.reasoning || null,
              candidate: {
                full_name: backendData.candidate.full_name,
                email: backendData.candidate.email
              }
            };
            setResult(combinedResult);
            if (backendData.result.evaluationStatus === 'pending') {
              triggerAIEvaluation(backendData.result, backendData.candidate);
            }
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend results fetch failed, falling back to localStorage:", err);
      }

      // 2. Fallback to localStorage
      const storedTestResult = localStorage.getItem(`testResult_${testId}`);
      const storedCandidateData = localStorage.getItem(`candidateData_${testId}`) || localStorage.getItem('candidateData');
      
      if (storedTestResult && storedCandidateData) {
        const testData = JSON.parse(storedTestResult);
        const candidateData = JSON.parse(storedCandidateData);
        
        const combinedResult: ResultData = {
          id: testId,
          mcq_score: 0,
          coding_score: testData.codingScore,
          penalty_score: testData.penaltyScore,
          final_score: testData.finalScore,
          evaluation_status: testData.evaluationStatus,
          ai_evaluation: testData.aiEvaluation || null,
          strengths: testData.strengths || null,
          weaknesses: testData.weaknesses || null,
          improvements: testData.improvements || null,
          decision: testData.decision || null,
          reasoning: testData.reasoning || null,
          candidate: {
            full_name: candidateData.full_name,
            email: candidateData.email
          }
        };

        setResult(combinedResult);
        
        if (testData.evaluationStatus === 'pending') {
          triggerAIEvaluation(testData, candidateData);
        }
      } else {
        toast.error("Results not found");
      }
    } catch (error: any) {
      console.error("Error fetching results:", error);
      toast.error("Failed to load results");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAIEvaluation = async (testData?: any, candidateData?: any) => {
    if (!testId) return;
    setIsEvaluating(true);

    try {
      // Get data from localStorage if not provided
      if (!testData || !candidateData) {
        // Try backend first
        try {
          const response = await fetch(`http://localhost:5000/api/results/${testId}`);
          if (response.ok) {
            const backendData = await response.json();
            testData = backendData.result;
            candidateData = backendData.candidate;
          }
        } catch (err) {}

        if (!testData || !candidateData) {
          const storedTestResult = localStorage.getItem(`testResult_${testId}`);
          const storedCandidateData = localStorage.getItem('candidateData');
          if (!storedTestResult || !storedCandidateData) throw new Error("Missing data");
          testData = JSON.parse(storedTestResult);
          candidateData = JSON.parse(storedCandidateData);
        }
      }

      // Update local status to processing
      testData.evaluationStatus = 'processing';
      localStorage.setItem(`testResult_${testId}`, JSON.stringify(testData));
      
      // Save processing status to backend
      try {
        await fetch('http://localhost:5000/api/save-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId, data: testData, type: 'result' })
        });
      } catch (err) {}

      // Get API key from localStorage (custom override) or environment variables
      const customApiKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY');
      const geminiApiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        throw new Error("Gemini API key is not configured");
      }
      console.log(`Using ${customApiKey ? 'Custom' : 'System'} Gemini API Key (starts with):`, geminiApiKey.substring(0, 6) + "...");

      const systemPrompt = `You are a RIGOROUS and UNBIASED ELITE AI hiring evaluator. Your mission is to provide a HIGH-STAKES assessment of a candidate's performance. You must be CRITICALLY STRICT.

      EVALUATION STANDARDS:
      1. TECHNICAL SUPREMACY: The CODING TEST is the primary indicator of technical skill. Do not let a polite interview mask poor technical implementation. Analyze the code for logic, efficiency, and completeness.
      2. COGNITIVE DEPTH: The INTERVIEW must demonstrate technical depth, not just surface-level knowledge. Look for specific examples and clear communication of complex ideas.
      3. UNCOMPROMISING INTEGRITY: Proctoring violations (tab switches, face detection issues) must be penalized HEAVILY. Integrity is non-negotiable. 
      4. WEIGHTING:
         - Coding Performance: 50%
         - Technical Interview: 30%
         - Professionalism & Integrity: 20%

      DECISION TIERS (BE STRICT):
      - "HIRE": Exceptional. Must have 85+ in both Coding and Interview, and >90 in Integrity. This is for the top 5% of candidates.
      - "MAYBE": Solid. Has potential but shows clear gaps in either technical depth or communication. Coding score must be at least 65.
      - "NO HIRE": Fails to meet the technical bar, shows weak communication, or has significant proctoring violations (more than 2 tab switches or frequent face detection failures).

      You must return a JSON evaluation:
      {
        "decision": "HIRE" | "MAYBE" | "NO HIRE",
        "suggested_role": "string (e.g., Senior Full Stack Developer, Junior Frontend Engineer, DevOps Lead, etc. based on their resume and test performance)",
        "strengths": ["specific_strength1", "specific_strength2", "specific_strength3"],
        "weaknesses": ["specific_weakness1", "specific_weakness2"],
        "improvements": ["actionable_improvement1", "actionable_improvement2", "actionable_improvement3"],
        "psychometric_traits": {
          "technical_depth": 0-100,
          "problem_solving": 0-100,
          "communication": 0-100,
          "adaptability": 0-100,
          "integrity": 0-100
        },
        "reasoning": "A 3-4 sentence detailed explanation. Justify the decision by referencing specific coding patterns, interview answers, and integrity data. Be direct and objective."
      }`;

      // Truncate data to avoid payload size limits
      const truncatedHistory = (testData.chatHistory || []).slice(-10).map((m: any) => ({
        role: m.role,
        content: m.content?.substring(0, 500)
      }));

      const evaluationData = {
        candidate: {
          name: candidateData.full_name,
          resumeText: candidateData.resume_text?.substring(0, 2000),
        },
        test: {
          interviewHistory: truncatedHistory,
          codingScore: testData.codingScore,
          codingSubmission: testData.codingSubmission?.code?.substring(0, 3000),
          completedAt: testData.completedAt,
        },
        proctoring: {
          totalWarnings: testData.penaltyScore / 5, 
          faceWarnings: testData.faceWarnings || 0,
          tabSwitches: testData.tabSwitches || 0,
          violationSeverity: testData.tabSwitches > 2 ? "HIGH" : (testData.tabSwitches > 0 ? "MEDIUM" : "LOW")
        },
        scores: {
          coding: testData.codingScore,
          penalty: testData.penaltyScore,
          final: testData.finalScore,
        },
      };

      // Use v1beta for better compatibility with newer models and JSON output features
      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\nEvaluate this candidate's assessment performance and return ONLY a valid JSON object:\n\n${JSON.stringify(evaluationData, null, 2)}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        console.error("Gemini Evaluation API Error details:", JSON.stringify(errorData, null, 2));
        
        // Handle retryable errors (429 Quota or 503/504 Service Unavailable)
        if (aiResponse.status === 429 || aiResponse.status === 503 || aiResponse.status === 504) {
          const isQuota = aiResponse.status === 429;
          toast.error(isQuota ? "AI Evaluation Quota Exceeded" : "AI Engine Temporarily Unavailable", {
            description: "The evaluation engine is busy. Retrying in 30 seconds...",
          });
          setTimeout(() => triggerAIEvaluation(testData, candidateData), 30000);
          return;
        }
        
        throw new Error(`Gemini Evaluation error: ${aiResponse.status} ${aiResponse.statusText}${errorData.error?.message ? ` - ${errorData.error.message}` : ''}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error("No response from AI engine");
      }

      let evaluation;
      try {
        // Try to parse the response, cleaning up any markdown code blocks if present
        const cleanText = content.replace(/```json\n?|\n?```/g, '').trim();
        evaluation = JSON.parse(cleanText);
        
        // Validate basic structure
        if (!evaluation.decision || !evaluation.strengths) {
          throw new Error("AI response missing required fields");
        }
      } catch (e) {
        console.error("Failed to parse AI evaluation. Raw content:", content);
        throw new Error("Failed to parse AI evaluation result");
      }

      // Calculate holistic score from psychometric traits with weights
      const traits = evaluation.psychometric_traits;
      const weightedScore = (
        (traits.technical_depth || 0) * 0.4 +
        (traits.problem_solving || 0) * 0.2 +
        (traits.communication || 0) * 0.2 +
        (traits.integrity || 0) * 0.2
      );
      
      const holisticScore = Math.round(weightedScore);

      // Update the local result record with AI evaluation
      const updatedTestData = {
        ...testData,
        aiEvaluation: evaluation,
        evaluationStatus: "completed",
        finalScore: holisticScore, // Update with balanced AI score
        suggestedRole: evaluation.suggested_role,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        improvements: evaluation.improvements,
        psychometric_traits: evaluation.psychometric_traits,
        decision: evaluation.decision,
        reasoning: evaluation.reasoning,
      };

      localStorage.setItem(`testResult_${testId}`, JSON.stringify(updatedTestData));

      // Save completed evaluation to backend
      try {
        await fetch('http://localhost:5000/api/save-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId, data: updatedTestData, type: 'result' })
        });
      } catch (err) {}

      // Save to Supabase
      try {
        await candidateOperations.update(testId, {
          ai_evaluation: evaluation,
          final_score: holisticScore,
          decision: evaluation.decision,
          suggested_role: evaluation.suggested_role,
          completed_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Supabase evaluation save error:", err);
      }

      // Refresh results
      fetchResults();
      toast.success("AI evaluation complete!");
    } catch (error: any) {
      console.error("Evaluation error:", error);
      toast.error("AI evaluation failed. Please try again.");
      
      // Update local status to failed
      if (testData) {
        testData.evaluationStatus = 'failed';
        localStorage.setItem(`testResult_${testId}`, JSON.stringify(testData));
        fetchResults();
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [testId]);

  const getDecisionColor = (decision: string) => {
    switch (decision?.toLowerCase()) {
      case 'hire':
      case 'strong hire':
        return 'text-success';
      case 'no hire':
      case 'reject':
        return 'text-destructive';
      default:
        return 'text-warning';
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision?.toLowerCase()) {
      case 'hire':
      case 'strong hire':
        return <CheckCircle2 className="w-8 h-8 text-success" />;
      case 'no hire':
      case 'reject':
        return <XCircle className="w-8 h-8 text-destructive" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-warning" />;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <GlassCard className="p-12">
            <motion.div
              className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="mt-4 text-muted-foreground">Loading results...</p>
          </GlassCard>
        </div>
      </Layout>
    );
  }

  if (!result) {
    return (
      <Layout>
        <div className="text-center py-20">
          <GlassCard className="p-12 max-w-md mx-auto">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Results Found</h2>
            <p className="text-muted-foreground mb-6">
              Complete an assessment to view your results here.
            </p>
            <Link to="/apply">
              <GlassButton variant="primary">
                <Sparkles className="w-4 h-4" />
                Start Assessment
              </GlassButton>
            </Link>
          </GlassCard>
        </div>
      </Layout>
    );
  }

  const isEvaluationComplete = result.evaluation_status === 'completed' && result.ai_evaluation;

  const chartData = result.ai_evaluation?.psychometric_traits 
    ? Object.entries(result.ai_evaluation.psychometric_traits).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').toUpperCase(),
        value
      }))
    : [];

  const CHART_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-12 px-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Performance Report</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Assessment <span className="gradient-text">Results</span>
            </h1>
            <p className="text-muted-foreground mt-2 font-light">
              Candidate: <span className="text-foreground font-medium">{result.candidate.full_name}</span> • 
              Ref: <span className="font-mono text-xs">{testId?.slice(-8).toUpperCase()}</span>
            </p>
          </motion.div>

          <div className="flex items-center gap-3">
            <Link to="/">
              <GlassButton variant="secondary" size="sm" className="rounded-xl">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </GlassButton>
            </Link>
            <GlassButton 
              variant="primary" 
              size="sm" 
              className="rounded-xl"
              onClick={() => window.print()}
            >
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </GlassButton>
          </div>
        </div>

        {isEvaluating ? (
          <GlassCard className="p-16 text-center" variant="elevated">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <motion.div
                className="absolute inset-0 border-4 border-primary/20 rounded-full"
              />
              <motion.div
                className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-3">AI Engine Evaluating...</h2>
            <p className="text-muted-foreground max-w-sm mx-auto font-light leading-relaxed">
              Our advanced models are analyzing your coding patterns, 
              interview responses, and proctoring data.
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Scores & Traits */}
            <div className="lg:col-span-4 space-y-8">
              <GlassCard className="p-8 relative overflow-hidden group" variant="elevated">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingUp className="w-24 h-24" />
                </div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Overall Score</h3>
                
                {result.ai_evaluation?.suggested_role && (
                  <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                    <Briefcase className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {result.ai_evaluation.suggested_role}
                    </span>
                  </div>
                )}

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-7xl font-bold gradient-text">{result.final_score}</span>
                  <span className="text-xl text-muted-foreground">/100</span>
                </div>
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden mb-6">
                  <motion.div 
                    className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${result.final_score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Coding</p>
                    <p className="text-lg font-bold">{result.coding_score}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Penalties</p>
                    <p className="text-lg font-bold text-destructive">-{result.penalty_score}</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-8" variant="default">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-8">Psychometric Profile</h3>
                <div className="space-y-6">
                  {Object.entries(result.ai_evaluation?.psychometric_traits || {}).map(([trait, value], i) => (
                    <div key={trait}>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-bold uppercase tracking-wider text-muted-foreground">
                          {trait.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono font-bold">{value}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-primary/60"
                          initial={{ width: 0 }}
                          animate={{ width: `${value}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {chartData.length > 0 && (
                <GlassCard className="p-8" variant="default">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Trait Distribution</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          iconType="circle"
                          formatter={(value) => <span className="text-[10px] font-bold text-muted-foreground uppercase">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Right Column: AI Analysis */}
            <div className="lg:col-span-8 space-y-8">
              <GlassCard className="p-8 border-primary/20 bg-primary/5" variant="elevated">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">AI Final Decision</h3>
                      <p className="text-sm text-muted-foreground font-light">Based on multi-modal evaluation</p>
                    </div>
                  </div>
                  <div className={`px-6 py-2 rounded-2xl font-bold tracking-widest uppercase text-sm border ${
                    result.decision === 'HIRE' 
                      ? 'bg-success/20 text-success border-success/30 shadow-[0_0_20px_rgba(var(--success),0.2)]'
                      : result.decision === 'MAYBE'
                        ? 'bg-warning/20 text-warning border-warning/30'
                        : 'bg-destructive/20 text-destructive border-destructive/30'
                  }`}>
                    {result.decision}
                  </div>
                </div>
                <p className="text-lg leading-relaxed font-light italic text-foreground/90 mb-0">
                  "{result.reasoning}"
                </p>
              </GlassCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GlassCard className="p-8" variant="subtle">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-success mb-6">
                    <CheckCircle2 className="w-4 h-4" />
                    Key Strengths
                  </h4>
                  <ul className="space-y-4">
                    {result.strengths?.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm font-light leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </GlassCard>

                <GlassCard className="p-8" variant="subtle">
                  <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-destructive mb-6">
                    <AlertTriangle className="w-4 h-4" />
                    Weakness Areas
                  </h4>
                  <ul className="space-y-4">
                    {result.weaknesses?.map((w, i) => (
                      <li key={i} className="flex gap-3 text-sm font-light leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </div>

              <GlassCard className="p-8" variant="default">
                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary mb-6">
                  <Lightbulb className="w-4 h-4" />
                  Growth Recommendations
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.improvements?.map((imp, i) => (
                    <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-sm font-light leading-relaxed">
                      {imp}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
