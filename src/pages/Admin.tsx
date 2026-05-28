import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import emailjs from '@emailjs/browser';
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { 
  Users, 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Search,
  Filter,
  Eye,
  Trash2,
  ChevronRight,
  User,
  ShieldCheck,
  Code,
  Lock,
  Key,
  Briefcase,
  Plus,
  Target,
  CheckCircle2,
  Clock,
  Settings,
  Database,
  AlertTriangle,
  Mail,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { GlassInput } from "@/components/ui/GlassInput";
import { candidateOperations, jobOperations } from "@/integrations/supabase/client";

interface CandidateResult {
  testId: string;
  fullName: string;
  email: string;
  finalScore: number;
  codingScore: number;
  penaltyScore: number;
  decision: string;
  suggestedRole?: string;
  completedAt: string;
  createdAt?: string;
}

interface JobOpening {
  id: string;
  role: string;
  description: string;
  requirements: string[];
  createdAt: string;
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [activeTab, setActiveTab] = useState<"candidates" | "jobs" | "settings">("candidates");
  
  // Candidates State
  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"highest" | "lowest" | "newest">("highest");
  const [isLoading, setIsLoading] = useState(true);

  // Job Openings State
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [newJob, setNewJob] = useState({ role: "", description: "", requirements: "" });

  // Settings State
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [emailServiceId, setEmailServiceId] = useState("");
  const [emailTemplateId, setEmailTemplateId] = useState("");
  const [emailPublicKey, setEmailPublicKey] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadCandidates();
      loadJobs();
      loadSettings();
    }
  }, [isAuthenticated]);

  const loadSettings = () => {
    const storedKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY');
    if (storedKey) {
      setGeminiApiKey(storedKey);
    }
    setEmailServiceId(localStorage.getItem('EMAILJS_SERVICE_ID') || "service_42yp80o");
    setEmailTemplateId(localStorage.getItem('EMAILJS_TEMPLATE_ID') || "template_rmbj45u");
    setEmailPublicKey(localStorage.getItem('EMAILJS_PUBLIC_KEY') || "rGfG4dx_UOIkTSFbW");
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      if (geminiApiKey) {
        localStorage.setItem('CUSTOM_GEMINI_API_KEY', geminiApiKey);
      } else {
        localStorage.removeItem('CUSTOM_GEMINI_API_KEY');
      }
      
      localStorage.setItem('EMAILJS_SERVICE_ID', emailServiceId);
      localStorage.setItem('EMAILJS_TEMPLATE_ID', emailTemplateId);
      localStorage.setItem('EMAILJS_PUBLIC_KEY', emailPublicKey);
      
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleHireCandidate = async (candidate: CandidateResult) => {
    // Ensure we have the latest keys from state, and trim them
    const sId = emailServiceId.trim();
    const tId = emailTemplateId.trim();
    const pKey = emailPublicKey.trim();

    if (!sId || !tId || !pKey) {
      toast.error("Configuration Missing", {
        description: "Please ensure Service ID, Template ID, and Public Key are all filled in Settings."
      });
      return;
    }

    if (!candidate.email || candidate.email === 'N/A' || !candidate.email.includes('@')) {
      toast.error("Invalid Email", {
        description: `The candidate ${candidate.fullName} does not have a valid email address (${candidate.email}).`
      });
      return;
    }

    toast.info(`Attempting to send offer to ${candidate.fullName}...`);
    
    try {
      // Initialize EmailJS with the public key
      emailjs.init(pKey);

      console.log("Sending email with params:", {
        serviceId: sId,
        templateId: tId,
        to_email: candidate.email,
        publicKey: pKey
      });

      const response = await emailjs.send(
        sId, 
        tId, 
        {
          to_name: candidate.fullName,
          to_email: candidate.email,
          suggested_role: candidate.suggestedRole || "Developer",
          final_score: candidate.finalScore,
          message: `Congratulations! We are impressed with your performance in the Aura Hire assessment. We would like to officially offer you the position of ${candidate.suggestedRole || "Developer"}.`
        }
      );
      
      console.log("EmailJS Response:", response);
      
      if (response.status === 200) {
        toast.success(`Hiring email sent successfully to ${candidate.email}`);
      }
    } catch (error: any) {
      console.error("Detailed EmailJS Error Object:", error);
      
      let errorMessage = "Check your EmailJS dashboard settings.";
      if (error?.status === 400) errorMessage = "Invalid Public Key or Service ID.";
      if (error?.status === 404) errorMessage = "Template ID not found.";
      if (error?.status === 403) errorMessage = "Domain not whitelisted in EmailJS.";
      
      toast.error("Email Failed to Send", {
        description: error?.text || errorMessage
      });
    }
  };

  const loadCandidates = async () => {
    setIsLoading(true);
    try {
      // 1. Try to load from Supabase first
      try {
        const supabaseCandidates = await candidateOperations.getAll();
        if (supabaseCandidates && supabaseCandidates.length > 0) {
          const formattedData: CandidateResult[] = supabaseCandidates.map((cand: any) => ({
            testId: cand.test_id,
            fullName: cand.full_name,
            email: cand.email,
            finalScore: cand.final_score || 0,
            codingScore: cand.coding_score || 0,
            penaltyScore: cand.penalty_score || 0,
            decision: cand.decision || 'PENDING',
            suggestedRole: cand.suggested_role,
            completedAt: cand.completed_at || cand.created_at,
            createdAt: cand.created_at
          }));
          setCandidates(formattedData);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Supabase fetch failed, trying backend:", err);
      }

      // 2. Try to load from system backend
      try {
        const response = await fetch('http://localhost:5000/api/candidates');
        if (response.ok) {
          const backendData = await response.json();
          if (backendData && backendData.length > 0) {
            // Save to Supabase for future use (sync)
            for (const candidate of backendData) {
              try {
                await candidateOperations.create({
                  test_id: candidate.testId,
                  full_name: candidate.fullName,
                  email: candidate.email,
                  final_score: candidate.finalScore,
                  coding_score: candidate.codingScore,
                  penalty_score: candidate.penaltyScore,
                  decision: candidate.decision,
                  suggested_role: candidate.suggestedRole,
                  completed_at: candidate.completedAt
                });
              } catch (createErr) {
                console.warn("Could not save to Supabase during sync:", createErr);
              }
            }
            setCandidates(backendData);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend fetch failed, falling back to localStorage:", err);
      }

      // 3. Fallback to localStorage
      const allResults: CandidateResult[] = [];
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith('testResult_')) {
          const testId = key.replace('testResult_', '');
          const resultData = JSON.parse(localStorage.getItem(key) || '{}');
          const storedCandidate = localStorage.getItem(`candidateData_${testId}`);
          const candidateInfo = storedCandidate ? JSON.parse(storedCandidate) : null;

          if (resultData.status === 'completed' || resultData.evaluationStatus === 'completed' || resultData.finalScore > 0) {
            allResults.push({
              testId: testId,
              fullName: candidateInfo?.full_name || 'Unknown Candidate',
              email: candidateInfo?.email || 'N/A',
              finalScore: resultData.finalScore || 0,
              codingScore: resultData.codingScore || 0,
              penaltyScore: resultData.penaltyScore || 0,
              decision: resultData.decision || 'PENDING',
              suggestedRole: resultData.suggestedRole || resultData.aiEvaluation?.suggested_role,
              completedAt: resultData.completedAt || new Date().toISOString()
            });
          }
        }
      });

      if (allResults.length > 0) {
        // Save localStorage data to Supabase (sync)
        for (const candidate of allResults) {
          try {
            await candidateOperations.create({
              test_id: candidate.testId,
              full_name: candidate.fullName,
              email: candidate.email,
              final_score: candidate.finalScore,
              coding_score: candidate.codingScore,
              penalty_score: candidate.penaltyScore,
              decision: candidate.decision,
              suggested_role: candidate.suggestedRole,
              completed_at: candidate.completedAt
            });
          } catch (createErr) {
            console.warn("Could not save to Supabase during localStorage sync:", createErr);
          }
        }
      }

      setCandidates(allResults);
    } catch (error) {
      console.error("Error loading candidates:", error);
      toast.error("Failed to load candidate results");
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      // 1. Try to load from Supabase first
      try {
        const supabaseJobs = await jobOperations.getAll();
        if (supabaseJobs && supabaseJobs.length > 0) {
          const formattedData: JobOpening[] = supabaseJobs.map((job: any) => ({
            id: job.id,
            role: job.role,
            description: job.description,
            requirements: Array.isArray(job.requirements) ? job.requirements : [],
            createdAt: job.created_at
          }));
          setJobs(formattedData);
          return;
        }
      } catch (err) {
        console.warn("Supabase jobs fetch failed, trying backend:", err);
      }

      // 2. Try backend API
      try {
        const response = await fetch('http://localhost:5000/api/jobs');
        if (response.ok) {
          const backendJobs = await response.json();
          if (backendJobs && backendJobs.length > 0) {
            // Save to Supabase
            for (const job of backendJobs) {
              try {
                await jobOperations.create({
                  role: job.role,
                  description: job.description,
                  requirements: Array.isArray(job.requirements) ? job.requirements : []
                });
              } catch (createErr) {
                console.warn("Could not save job to Supabase:", createErr);
              }
            }
            setJobs(backendJobs);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend jobs fetch failed, falling back to localStorage:", err);
      }

      // 3. Fallback to localStorage
      const storedJobs = localStorage.getItem('jobOpenings');
      if (storedJobs) {
        const jobs = JSON.parse(storedJobs);
        // Save to Supabase
        for (const job of jobs) {
          try {
            await jobOperations.create({
              role: job.role,
              description: job.description,
              requirements: Array.isArray(job.requirements) ? job.requirements : []
            });
          } catch (createErr) {
            console.warn("Could not save job to Supabase:", createErr);
          }
        }
        setJobs(jobs);
      }
    } catch (err) {
      console.error("Error loading jobs:", err);
    }
  };

  const deleteCandidate = async (testId: string) => {
    if (confirm("Are you sure you want to delete this candidate result?")) {
      try {
        // Delete from Supabase
        try {
          await candidateOperations.delete(testId);
        } catch (err) {
          console.warn("Supabase delete error:", err);
        }

        // Delete from system backend
        try {
          await fetch(`http://localhost:5000/api/candidates/${testId}`, {
            method: 'DELETE'
          });
        } catch (err) {
          console.error("Backend delete error:", err);
        }

        localStorage.removeItem(`testResult_${testId}`);
        localStorage.removeItem(`candidateData_${testId}`);
        toast.success("Result deleted");
        loadCandidates();
      } catch (err) {
        toast.error("Failed to delete candidate");
      }
    }
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.role || !newJob.description) {
      toast.error("Please fill in role and description");
      return;
    }

    try {
      const requirements = newJob.requirements.split(',').map(r => r.trim()).filter(r => r);
      
      // Create in Supabase first
      const supabaseJob = await jobOperations.create({
        role: newJob.role,
        description: newJob.description,
        requirements: requirements
      });

      const job: JobOpening = {
        id: supabaseJob?.id || `job_${Date.now()}`,
        role: newJob.role,
        description: newJob.description,
        requirements: requirements,
        createdAt: new Date().toISOString()
      };

      const updatedJobs = [...jobs, job];
      setJobs(updatedJobs);
      localStorage.setItem('jobOpenings', JSON.stringify(updatedJobs));
      
      // Save to system backend
      try {
        await fetch('http://localhost:5000/api/save-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId: 'jobs', data: updatedJobs, type: 'job' })
        });
      } catch (err) {
        console.error("Backend save error:", err);
      }

      setNewJob({ role: "", description: "", requirements: "" });
      setIsAddingJob(false);
      toast.success("Job opening added successfully");
    } catch (error) {
      console.error("Error adding job:", error);
      toast.error("Failed to add job opening");
    }
  };

  const deleteJob = async (id: string) => {
    if (confirm("Are you sure you want to delete this job opening?")) {
      try {
        // Delete from Supabase
        try {
          await jobOperations.delete(id);
        } catch (err) {
          console.warn("Supabase delete error:", err);
        }

        const updatedJobs = jobs.filter(j => j.id !== id);
        setJobs(updatedJobs);
        localStorage.setItem('jobOpenings', JSON.stringify(updatedJobs));
        toast.success("Job opening deleted");
      } catch (error) {
        console.error("Error deleting job:", error);
        toast.error("Failed to delete job opening");
      }
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey === "potato") {
      setIsAuthenticated(true);
      toast.success("Admin access granted");
    } else {
      toast.error("Invalid admin key");
    }
  };

  const getAIsuggestions = (jobRole: string) => {
    // Simple logic: filter candidates whose suggested role matches or contains the job role keyword
    return candidates.filter(c => 
      c.suggestedRole?.toLowerCase().includes(jobRole.toLowerCase()) ||
      jobRole.toLowerCase().includes(c.suggestedRole?.toLowerCase() || "")
    ).sort((a, b) => b.finalScore - a.finalScore);
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-24 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-12 text-center" variant="elevated">
              <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto mb-8 border border-primary/20">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Admin Access</h2>
              <p className="text-muted-foreground mb-10 text-sm font-light leading-relaxed">
                This page is restricted. Please enter the administrator key to continue.
              </p>
              
              <form onSubmit={handleAuth} className="space-y-6">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="Enter admin key..."
                    className="w-full pl-12 pr-4 py-4 bg-secondary/30 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    autoFocus
                  />
                </div>
                <GlassButton type="submit" variant="primary" className="w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest">
                  Unlock Dashboard
                  <ChevronRight className="w-4 h-4 ml-2" />
                </GlassButton>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const filteredCandidates = candidates
    .filter(c => 
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === "highest") return b.finalScore - a.finalScore;
      if (sortOrder === "lowest") return a.finalScore - b.finalScore;
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Admin Control Center</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Recruitment <span className="gradient-text">Management</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage job openings and evaluate candidate performance with AI insights.
            </p>
          </div>

          <div className="flex items-center bg-secondary/30 border border-white/5 rounded-2xl p-1">
            <button 
              onClick={() => setActiveTab("candidates")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'candidates' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Users className="w-4 h-4" />
              Candidates
            </button>
            <button 
              onClick={() => setActiveTab("jobs")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'jobs' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Briefcase className="w-4 h-4" />
              Job Openings
            </button>
            <button 
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {activeTab === "candidates" ? (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search candidates..." 
                  className="pl-10 pr-4 py-2 bg-secondary/30 border border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 text-sm transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center bg-secondary/30 border border-white/5 rounded-xl p-1">
                <button 
                  onClick={() => setSortOrder("highest")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${sortOrder === 'highest' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <TrendingUp className="w-3 h-3" />
                  Highest
                </button>
                <button 
                  onClick={() => setSortOrder("lowest")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${sortOrder === 'lowest' ? 'bg-destructive/20 text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <TrendingDown className="w-3 h-3" />
                  Lowest
                </button>
              </div>
            </div>

            <GlassCard className="overflow-hidden border-white/5" variant="elevated">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Candidate</th>
                      <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Final Score</th>
                      <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Suggested Role</th>
                      <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Coding</th>
                      <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Penalties</th>
                      <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Decision</th>
                      <th className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence mode="popLayout">
                      {filteredCandidates.length > 0 ? (
                        filteredCandidates.map((candidate, index) => (
                          <motion.tr 
                            key={candidate.testId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group hover:bg-white/5 transition-colors"
                          >
                            <td className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{candidate.fullName}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">{candidate.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-6 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-2xl font-black ${candidate.finalScore >= 70 ? 'text-success' : candidate.finalScore >= 40 ? 'text-warning' : 'text-destructive'}`}>
                                  {candidate.finalScore}
                                </span>
                                <div className="w-16 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                  <div 
                                    className={`h-full ${candidate.finalScore >= 70 ? 'bg-success' : candidate.finalScore >= 40 ? 'bg-warning' : 'bg-destructive'}`}
                                    style={{ width: `${candidate.finalScore}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-6 text-center">
                              {candidate.suggestedRole ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                                  <Briefcase className="w-3 h-3" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">{candidate.suggestedRole}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">N/A</span>
                              )}
                            </td>
                            <td className="p-6 text-center">
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500">
                                <Code className="w-3 h-3" />
                                <span className="text-xs font-bold">{candidate.codingScore}</span>
                              </div>
                            </td>
                            <td className="p-6 text-center">
                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${candidate.penaltyScore > 20 ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-white/5 border-white/10 text-muted-foreground'}`}>
                                <ShieldCheck className="w-3 h-3" />
                                <span className="text-xs font-bold">-{candidate.penaltyScore}</span>
                              </div>
                            </td>
                            <td className="p-6 text-center">
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${
                                candidate.decision.toLowerCase().includes('hire') 
                                  ? 'bg-success/10 border-success/30 text-success' 
                                  : candidate.decision.toLowerCase().includes('maybe')
                                  ? 'bg-warning/10 border-warning/30 text-warning'
                                  : 'bg-destructive/10 border-destructive/30 text-destructive'
                              }`}>
                                {candidate.decision}
                              </span>
                            </td>
                            <td className="p-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <GlassButton 
                                  variant="primary" 
                                  size="sm" 
                                  className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                                  onClick={() => handleHireCandidate(candidate)}
                                >
                                  <Send className="w-3 h-3" />
                                  Hire
                                </GlassButton>
                                <Link to={`/results?id=${candidate.testId}`}>
                                  <GlassButton variant="secondary" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                    <Eye className="w-3.5 h-3.5" />
                                  </GlassButton>
                                </Link>
                                <GlassButton 
                                  variant="secondary" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 border-destructive/10"
                                  onClick={() => deleteCandidate(candidate.testId)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </GlassButton>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-muted-foreground">
                            {isLoading ? "Loading candidates..." : "No candidates found."}
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        ) : activeTab === "jobs" ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Job Openings</h2>
              <GlassButton 
                variant="primary" 
                className="rounded-xl px-6"
                onClick={() => setIsAddingJob(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Role
              </GlassButton>
            </div>

            {isAddingJob && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
              >
                <GlassCard className="p-8 mb-8" variant="default">
                  <form onSubmit={handleAddJob} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Job Role</label>
                        <GlassInput 
                          placeholder="e.g. Senior Full Stack Developer"
                          value={newJob.role}
                          onChange={(e) => setNewJob({...newJob, role: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Requirements (comma separated)</label>
                        <GlassInput 
                          placeholder="e.g. React, Node.js, TypeScript"
                          value={newJob.requirements}
                          onChange={(e) => setNewJob({...newJob, requirements: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Job Description</label>
                      <textarea 
                        className="w-full bg-secondary/30 border border-white/5 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm min-h-[100px]"
                        placeholder="Briefly describe the role and what you're looking for..."
                        value={newJob.description}
                        onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <GlassButton type="button" variant="secondary" onClick={() => setIsAddingJob(false)}>Cancel</GlassButton>
                      <GlassButton type="submit" variant="primary">Create Job Opening</GlassButton>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => {
                const suggestions = getAIsuggestions(job.role);
                return (
                  <GlassCard key={job.id} className="p-6 group relative overflow-hidden" variant="elevated">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Briefcase className="w-16 h-16" />
                    </div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Target className="w-6 h-6 text-primary" />
                      </div>
                      <GlassButton 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 border-destructive/10"
                        onClick={() => deleteJob(job.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </GlassButton>
                    </div>

                    <h3 className="text-xl font-bold mb-2">{job.role}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {job.requirements.slice(0, 3).map((req, i) => (
                        <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-muted-foreground uppercase">
                          {req}
                        </span>
                      ))}
                      {job.requirements.length > 3 && (
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-muted-foreground">
                          +{job.requirements.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Target className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest">AI Suggestions</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                          {suggestions.length} Found
                        </span>
                      </div>

                      <div className="space-y-3">
                        {suggestions.length > 0 ? (
                          suggestions.slice(0, 3).map((cand) => (
                            <Link key={cand.testId} to={`/results?id=${cand.testId}`}>
                              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                    {cand.fullName.charAt(0)}
                                  </div>
                                  <span className="text-xs font-bold">{cand.fullName}</span>
                                </div>
                                <span className="text-[10px] font-black text-primary">{cand.finalScore}%</span>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <div className="text-[10px] text-center py-4 text-muted-foreground border border-dashed border-white/10 rounded-xl">
                            No matching candidates found yet
                          </div>
                        )}
                        
                        {suggestions.length > 3 && (
                          <button 
                            onClick={() => {
                              setActiveTab("candidates");
                              setSearchQuery(job.role);
                            }}
                            className="w-full text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors text-center py-2"
                          >
                            View All Suggestions
                          </button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}

              {jobs.length === 0 && !isAddingJob && (
                <div className="col-span-full py-24 text-center">
                  <div className="w-20 h-20 rounded-[2rem] bg-secondary/30 flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Job Openings</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
                    Start by adding a job opening to get AI-powered candidate suggestions.
                  </p>
                  <GlassButton 
                    variant="primary" 
                    className="rounded-xl px-8"
                    onClick={() => setIsAddingJob(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Role
                  </GlassButton>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">System Settings</h2>
              <p className="text-muted-foreground text-sm">Configure global AI parameters and API keys.</p>
            </div>

            <GlassCard className="p-8" variant="elevated">
              <form onSubmit={handleSaveSettings} className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Database className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest">Gemini API Configuration</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Custom API Key</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="password"
                        placeholder="Paste your Gemini API key here..."
                        className="w-full pl-12 pr-4 py-4 bg-secondary/30 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
                      If provided, this key will override the default system API key. Your key is stored locally in your browser and never sent to our servers.
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest">Email Notification (EmailJS)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Service ID</label>
                      <GlassInput 
                        placeholder="e.g. service_xxxxxx"
                        value={emailServiceId}
                        onChange={(e) => setEmailServiceId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Template ID</label>
                      <GlassInput 
                        placeholder="e.g. template_xxxxxx"
                        value={emailTemplateId}
                        onChange={(e) => setEmailTemplateId(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Public Key</label>
                    <GlassInput 
                      placeholder="e.g. xxxxxxxxxxxxxxxx"
                      value={emailPublicKey}
                      onChange={(e) => setEmailPublicKey(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-4 italic">
                      * Used to send hiring offers via EmailJS.
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <GlassButton 
                    type="submit" 
                    variant="primary" 
                    className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    disabled={isSavingSettings}
                  >
                    {isSavingSettings ? "Saving..." : "Save Configuration"}
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  </GlassButton>
                </div>
              </form>
            </GlassCard>

            <GlassCard className="p-6 bg-warning/5 border-warning/10" variant="subtle">
              <div className="flex gap-4">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-warning mb-1">Developer Notice</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Changing the API key will affect all subsequent candidate evaluations. Ensure the new key has sufficient quota and permissions for the Gemini Pro model.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </Layout>
  );
}
