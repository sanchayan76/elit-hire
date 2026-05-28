import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { toast } from "sonner";
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { candidateOperations } from "@/integrations/supabase/client";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { 
  FileText, 
  Upload, 
  User, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  X
} from "lucide-react";

export default function Apply() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        toast.error("Please upload a PDF file");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
      } else {
        toast.error("Please upload a PDF file");
      }
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText;
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!file) {
      toast.error("Please upload your resume");
      return;
    }

    setIsLoading(true);

    try {
      // Extract text from PDF
      const resumeText = await extractTextFromPDF(file);
      
      // Store everything in localStorage and Supabase
      const testId = `test_${Date.now()}`;
      const candidateData = {
        id: `cand_${Date.now()}`,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        resume_text: resumeText,
      };

      localStorage.setItem('currentTestId', testId);
      localStorage.setItem(`candidateData_${testId}`, JSON.stringify(candidateData));
      // Keep a reference to the latest for the current session flow
      localStorage.setItem('candidateData', JSON.stringify(candidateData));

      // Save to Supabase
      try {
        await candidateOperations.create({
          test_id: testId,
          full_name: candidateData.full_name,
          email: candidateData.email,
          resume_text: candidateData.resume_text,
          decision: 'PENDING',
          completed_at: null
        });
      } catch (err) {
        console.warn("Supabase save error:", err);
      }

      // Save to system backend
      try {
        await fetch('http://localhost:5000/api/save-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId, data: candidateData, type: 'candidate' })
        });
      } catch (err) {
        console.error("Backend save error:", err);
      }
      
      toast.success("Application submitted successfully!");
      navigate(`/test?id=${testId}`);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to process resume. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-12 px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Candidate Registration</span>
          </motion.div>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            <span className="gradient-text">Join the Elite</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto font-light leading-relaxed">
            Take the first step towards your dream role with our 
            <span className="text-foreground font-medium"> AI-driven </span> 
            recruitment process.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-16 gap-4">
          {[
            { id: 1, label: "Profile" },
            { id: 2, label: "Resume" }
          ].map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold transition-all duration-500 shadow-lg ${
                    step >= s.id 
                      ? "bg-primary text-primary-foreground shadow-primary/20" 
                      : "bg-secondary/50 text-muted-foreground border border-white/5"
                  }`}
                  animate={{ 
                    scale: step === s.id ? 1.1 : 1,
                    rotate: step === s.id ? [0, -5, 5, 0] : 0
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {step > s.id ? <CheckCircle2 className="w-7 h-7" /> : <span className="text-lg">{s.id}</span>}
                </motion.div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${step >= s.id ? "text-primary" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
              {i === 0 && (
                <div className="w-24 h-px mx-4 mb-6 bg-gradient-to-r from-primary/50 to-transparent" />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <GlassCard className="p-10 border-white/5" variant="elevated">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Personal Profile</h2>
                    <p className="text-sm text-muted-foreground">Tell us about yourself</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <GlassInput
                    id="fullName"
                    name="fullName"
                    label="Full Name *"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="h-14 text-lg rounded-2xl"
                  />

                  <GlassInput
                    id="email"
                    name="email"
                    type="email"
                    label="Email Address *"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-14 text-lg rounded-2xl"
                  />

                  <GlassInput
                    id="phone"
                    name="phone"
                    label="Phone Number"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="h-14 text-lg rounded-2xl"
                  />

                  <div className="pt-4">
                    <GlassButton 
                      className="w-full h-16 text-lg rounded-2xl" 
                      variant="primary"
                      onClick={() => {
                        if (formData.fullName && formData.email) setStep(2);
                        else toast.error("Please fill in required fields");
                      }}
                    >
                      Continue to Resume
                      <ArrowRight className="w-5 h-5" />
                    </GlassButton>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <GlassCard className="p-10 border-white/5" variant="elevated">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Experience Record</h2>
                    <p className="text-sm text-muted-foreground">Upload your latest professional resume (PDF)</p>
                  </div>
                </div>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative group cursor-pointer rounded-[2.5rem] border-2 border-dashed transition-all duration-500 min-h-[300px] flex flex-col items-center justify-center p-8 ${
                    dragActive 
                      ? "border-primary bg-primary/5 scale-[0.98]" 
                      : file 
                        ? "border-success/50 bg-success/5" 
                        : "border-white/10 hover:border-primary/30 hover:bg-white/5"
                  }`}
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleFileSelect}
                  />

                  <AnimatePresence mode="wait">
                    {file ? (
                      <motion.div 
                        key="file-ready"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-20 h-20 rounded-3xl bg-success/20 flex items-center justify-center mb-6 text-success shadow-lg shadow-success/10">
                          <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <p className="text-xl font-bold mb-2">{file.name}</p>
                        <p className="text-sm text-muted-foreground mb-6">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
                        </p>
                        <GlassButton 
                          variant="secondary" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                          className="rounded-full px-6"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Change File
                        </GlassButton>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="upload-prompt"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl">
                          <Upload className="w-10 h-10 text-primary" />
                        </div>
                        <p className="text-xl font-bold mb-2">Drop your resume here</p>
                        <p className="text-sm text-muted-foreground text-center max-w-xs">
                          or click to browse from your computer. 
                          Only <span className="text-foreground font-medium">PDF files</span> are supported.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-12 flex flex-col sm:flex-row gap-4">
                  <GlassButton
                    variant="secondary"
                    className="flex-1 h-16 text-lg rounded-2xl"
                    onClick={() => setStep(1)}
                  >
                    Go Back
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    className="flex-[2] h-16 text-lg rounded-2xl"
                    onClick={handleSubmit}
                    isLoading={isLoading}
                    disabled={!file}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing Resume...
                      </>
                    ) : (
                      <>
                        Submit & Start Assessment
                        <Sparkles className="w-5 h-5" />
                      </>
                    )}
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
