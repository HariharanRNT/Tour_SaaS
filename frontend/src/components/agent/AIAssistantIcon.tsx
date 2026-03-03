import { useState, useEffect } from "react";
import { Sparkles, Bot } from "lucide-react";

interface AIAssistantIconProps {
  onClick?: () => void;
  size?: number;
}

export default function AIAssistantIcon({ onClick, size = 48 }: AIAssistantIconProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex items-center justify-center transition-all duration-300 active:scale-95"
        style={{ width: size, height: size }}
      >
        {/* Glassmorphic Background */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          {/* Animated Glow Gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-transparent to-purple-500/20 animate-pulse" />
        </div>

        {/* Hover Glow Effect */}
        <div className="absolute inset-0 rounded-2xl bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors duration-300 blur-xl" />

        {/* Icons */}
        <div className="relative flex items-center justify-center">
          <Bot
            size={size * 0.55}
            className={`text-blue-500 transition-all duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
          />
          <Sparkles
            size={size * 0.25}
            className={`absolute -top-1 -right-1 text-amber-400 transition-all duration-700 ${isHovered ? 'rotate-12 scale-125' : 'rotate-0 scale-100'} animate-pulse`}
          />
        </div>

        {/* Inner Border Glow */}
        <div className="absolute inset-0 rounded-2xl border border-blue-400/20 group-hover:border-blue-400/40 transition-colors duration-300" />
      </button>

      {/* Tooltip */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900/90 text-[10px] text-blue-200 font-bold tracking-widest uppercase rounded-lg border border-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap backdrop-blur-sm z-50">
        AI Assistant
      </div>
    </div>
  );
}
