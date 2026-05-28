import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import heroBg from "@/assets/hero-bg.jpg";
import { 
  Sparkles, 
  FileText, 
  Brain, 
  Shield, 
  BarChart3, 
  Zap,
  ArrowRight,
  CheckCircle2,
  Eye
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Resume Analysis",
    description: "AI-powered resume parsing and skill extraction with instant scoring",
  },
  {
    icon: Brain,
    title: "Adaptive Testing",
    description: "MCQ and coding challenges tailored to candidate expertise level",
  },
  {
    icon: Eye,
    title: "AI Proctoring",
    description: "Real-time webcam monitoring with face detection and behavior analysis",
  },
  {
    icon: Shield,
    title: "Fraud Prevention",
    description: "Tab switching detection, copy-paste blocking, and anomaly alerts",
  },
  {
    icon: BarChart3,
    title: "XAI Reports",
    description: "Explainable AI decisions with transparent scoring breakdowns",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Real-time evaluation with actionable insights and recommendations",
  },
];

const stats = [
  { value: "99.2%", label: "Accuracy Rate" },
  { value: "<3min", label: "Evaluation Time" },
  { value: "50+", label: "Skill Categories" },
  { value: "24/7", label: "AI Availability" },
];

export default function Index() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center text-center relative overflow-hidden px-6">
        <motion.div
          className="relative z-10 max-w-5xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-bold text-primary uppercase tracking-widest">Powered by Gemini 2.5 Flash</span>
          </motion.div>

          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-[1.1] tracking-tight">
            <span className="text-foreground">The Future of</span>
            <br />
            <span className="gradient-text drop-shadow-[0_0_30px_rgba(var(--primary),0.3)]">AI Hiring</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            Experience the next generation of recruitment with <span className="text-foreground font-medium">liquid-glass</span> AI assessments, 
            real-time proctoring, and bias-free evaluation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/apply">
              <GlassButton variant="primary" size="lg" className="px-10 h-16 text-lg rounded-2xl group">
                Start Assessment
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </GlassButton>
            </Link>
            <Link to="/results">
              <GlassButton variant="secondary" size="lg" className="px-10 h-16 text-lg rounded-2xl">
                View Reports
              </GlassButton>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-24 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-8 text-center group" variant="subtle">
                <div className="text-4xl md:text-5xl font-bold gradient-text mb-2 group-hover:scale-110 transition-transform duration-500">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            Enterprise Assessment <span className="gradient-text">Redefined</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
            Built with cutting-edge AI to deliver fair, transparent, and efficient hiring decisions 
            without compromising on security or user experience.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard 
                  className="p-8 h-full group transition-all duration-500 hover:border-primary/50"
                  glow
                  whileHover={{ y: -10 }}
                >
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed font-light">{feature.description}</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A seamless assessment experience from application to results.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Upload Resume", desc: "Submit your PDF resume for AI analysis" },
            { step: "02", title: "Take Assessment", desc: "Complete MCQ and coding challenges" },
            { step: "03", title: "AI Proctoring", desc: "Monitored session ensures fairness" },
            { step: "04", title: "Get Results", desc: "Receive detailed XAI evaluation report" },
          ].map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative"
            >
              <GlassCard className="p-6 text-center relative overflow-visible">
                <div className="text-5xl font-bold text-primary/20 mb-4">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary/40" />
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <GlassCard variant="elevated" className="p-12 text-center relative overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Experience AI-Powered Hiring?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Join thousands of companies using ELITEHIRE AI for fair, 
              transparent, and efficient candidate evaluation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/apply">
                <GlassButton variant="primary" size="lg">
                  <CheckCircle2 className="w-5 h-5" />
                  Start Assessment Now
                </GlassButton>
              </Link>
            </div>
          </div>
        </GlassCard>
      </section>
    </Layout>
  );
}
