import React from 'react';
import { Link } from 'react-router-dom';

const InteractiveLogo = () => {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <style>{`
        @keyframes floatNail1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        
        @keyframes floatNail2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(-5deg); }
        }
        
        @keyframes rotateBrush {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        .nail-1 {
          animation: floatNail1 3s ease-in-out infinite;
        }
        
        .nail-2 {
          animation: floatNail2 3.5s ease-in-out infinite;
        }
        
        .brush {
          animation: rotateBrush 2.5s ease-in-out infinite;
          transform-origin: center;
        }
        
        .sparkle-1 {
          animation: sparkle 2s ease-in-out infinite;
        }
        
        .sparkle-2 {
          animation: sparkle 2s ease-in-out infinite 0.5s;
        }
        
        .sparkle-3 {
          animation: sparkle 2s ease-in-out infinite 1s;
        }
        
        .logo-text {
          font-weight: 700;
          font-size: 28px;
          letter-spacing: -0.5px;
        }
      `}</style>
      
      <svg 
        width="120" 
        height="60" 
        viewBox="0 0 120 60" 
        className="group-hover:scale-110 transition-transform duration-300"
      >
        {/* Sparkles around the logo */}
        <circle cx="15" cy="10" r="2" fill="#FF8CAA" className="sparkle-1" />
        <circle cx="105" cy="15" r="1.5" fill="#FFC9D7" className="sparkle-2" />
        <circle cx="20" cy="50" r="1.5" fill="#FF8CAA" className="sparkle-3" />
        
        {/* Animated Nail 1 - Left */}
        <g className="nail-1">
          {/* Nail shape */}
          <rect x="8" y="15" width="6" height="20" rx="1" fill="#FFB6C1" stroke="#FF8CAA" strokeWidth="0.5" />
          {/* Nail polish shine */}
          <ellipse cx="11" cy="20" rx="2" ry="3" fill="#FF69B4" opacity="0.8" />
          {/* Nail tip */}
          <path d="M 8 35 Q 11 38 14 35" fill="none" stroke="#FFF" strokeWidth="0.5" />
        </g>
        
        {/* Animated Nail 2 - Right */}
        <g className="nail-2">
          {/* Nail shape */}
          <rect x="102" y="12" width="6" height="22" rx="1" fill="#FFC0CB" stroke="#FF8CAA" strokeWidth="0.5" />
          {/* Nail polish shine */}
          <ellipse cx="105" cy="18" rx="2" ry="3" fill="#FF69B4" opacity="0.8" />
          {/* Nail tip */}
          <path d="M 102 34 Q 105 37 108 34" fill="none" stroke="#FFF" strokeWidth="0.5" />
        </g>
        
        {/* Animated Brush - Center */}
        <g className="brush">
          {/* Brush handle */}
          <rect x="53" y="28" width="4" height="18" rx="1" fill="#8B4513" opacity="0.8" />
          {/* Brush bristles */}
          <ellipse cx="55" cy="27" rx="5" ry="4" fill="#FFB6C1" />
          <ellipse cx="53" cy="26" rx="3" ry="2" fill="#FF8CAA" opacity="0.6" />
          <ellipse cx="57" cy="26" rx="3" ry="2" fill="#FF8CAA" opacity="0.6" />
        </g>
        
        {/* Decorative dots */}
        <circle cx="40" cy="25" r="1" fill="#FF8CAA" opacity="0.6" />
        <circle cx="80" cy="28" r="1.2" fill="#FFC9D7" opacity="0.5" />
      </svg>
      
      {/* Logo Text */}
      <div className="flex flex-col">
        <span className="logo-text bg-gradient-to-r from-[#FF8CAA] to-[#FF69B4] bg-clip-text text-transparent leading-none">
          InLove
        </span>
        <span className="logo-text bg-gradient-to-r from-[#FF69B4] to-[#FFB6C1] bg-clip-text text-transparent leading-none">
          Nailz
        </span>
      </div>
    </Link>
  );
};

export default InteractiveLogo;
