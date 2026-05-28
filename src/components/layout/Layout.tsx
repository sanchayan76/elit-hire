import { Header } from "./Header";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function Layout({ children, fullWidth = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background image for glass effect */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(100px) saturate(150%)',
        }}
      />
      <div className="fixed inset-0 mesh-gradient z-0 pointer-events-none" />
      
      <div className="relative z-10">
        <Header />
        <motion.main
          className="pt-24 pb-12 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className={fullWidth ? "w-full" : "max-w-7xl mx-auto"}>
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  );
}
