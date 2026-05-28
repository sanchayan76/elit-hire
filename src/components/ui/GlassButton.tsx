import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "btn-liquid text-primary-foreground",
      secondary: "bg-secondary/50 backdrop-blur-xl border border-border/50 text-foreground hover:bg-secondary/70",
      ghost: "bg-transparent hover:bg-secondary/30 text-foreground",
      danger: "bg-destructive/80 backdrop-blur-xl border border-destructive/50 text-destructive-foreground hover:bg-destructive",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm rounded-xl",
      md: "px-6 py-3 text-base rounded-2xl",
      lg: "px-8 py-4 text-lg rounded-2xl",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none",
          variant !== "primary" && sizes[size],
          variants[variant],
          variant === "primary" && size === "sm" && "px-4 py-2 text-sm",
          variant === "primary" && size === "lg" && "px-8 py-4 text-lg",
          className
        )}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);

GlassButton.displayName = "GlassButton";
