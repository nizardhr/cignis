import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated';
  hover?: boolean;
}

export const Card = ({ 
  children, 
  className = '', 
  variant = 'default', 
  hover = false 
}: CardProps) => {
  const baseClasses = "rounded-2xl overflow-hidden transition-all duration-300";
  
  const variantClasses = {
    default: "bg-white border border-gray-200 text-gray-900",
    glass: "bg-white/80 backdrop-blur-xl border border-white/20 text-gray-900",
    elevated: "bg-white shadow-xl border border-gray-200 text-gray-900"
  };

  return (
    <motion.div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        hover && "hover:shadow-2xl hover:scale-[1.02]",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};