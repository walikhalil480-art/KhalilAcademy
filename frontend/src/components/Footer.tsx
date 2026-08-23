import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Lock, Award, ArrowRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0A1322] border-t border-[#23426A] text-[#CBD5E1] text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-white/95 p-1 border border-[#4FD1C5]/40 flex items-center justify-center shadow-lg shadow-[#1A365D]/30 group-hover:border-[#4FD1C5] transition-all">
                <img
                  src="/logo.png"
                  alt="Khalil Academy"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black text-[#F8FAFC] leading-tight">Khalil Academy</span>
                <span className="text-[9px] text-[#4FD1C5] font-extrabold uppercase tracking-wider">Learn • Grow • Succeed</span>
              </div>
            </Link>
            <p className="text-xs text-[#94A3B8] leading-relaxed max-w-sm">
              Professional education academy dedicated to practical tech skills, real-world experience, and globally verifiable certifications.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#CBD5E1] pt-1">
              <span className="flex items-center gap-1.5 font-medium"><ShieldCheck className="w-4 h-4 text-[#22C55E]" /> Verified Platform</span>
              <span className="flex items-center gap-1.5 font-medium"><Lock className="w-4 h-4 text-[#4FD1C5]" /> 256-Bit SSL</span>
              <span className="flex items-center gap-1.5 text-[#22C55E] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse inline-block" />
                All Systems Operational
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-extrabold text-[#F8FAFC] uppercase tracking-wider mb-4">Academy</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/courses" className="hover:text-[#4FD1C5] transition font-medium">Course Catalog</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#4FD1C5] transition font-medium">Student Dashboard</Link></li>
              <li><Link to="/student/certificates" className="hover:text-[#4FD1C5] transition font-medium">My Certificates</Link></li>
              <li><Link to="/register" className="hover:text-[#4FD1C5] transition font-medium">Create Account</Link></li>
            </ul>
          </div>

          {/* Core Tracks */}
          <div>
            <h4 className="text-xs font-extrabold text-[#F8FAFC] uppercase tracking-wider mb-4">Learning Tracks</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/courses?category=Cloud+Computing" className="hover:text-[#4FD1C5] transition font-medium">Cloud Architecture</Link></li>
              <li><Link to="/courses?category=DevOps" className="hover:text-[#4FD1C5] transition font-medium">DevOps & Containers</Link></li>
              <li><Link to="/courses?category=DevSecOps" className="hover:text-[#4FD1C5] transition font-medium">Security Engineering</Link></li>
              <li><Link to="/courses?category=Software+Engineering" className="hover:text-[#4FD1C5] transition font-medium">Software Development</Link></li>
            </ul>
          </div>

          {/* Credential Verification */}
          <div>
            <h4 className="text-xs font-extrabold text-[#F8FAFC] uppercase tracking-wider mb-4">Certificate Registry</h4>
            <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">
              Official certificates issued by Khalil Academy are cryptographically registered for instant validation.
            </p>
            <Link
              to="/certificates/verify/KHA-2026-000001"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#4FD1C5] hover:text-white transition group"
            >
              <span>Verify a Credential</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>

        <div className="border-t border-[#23426A] mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-[#94A3B8] gap-4">
          <p>© {new Date().getFullYear()} Khalil Academy. All rights reserved.</p>
          <p className="text-[#94A3B8]">
            Professional Career Development & Certification
          </p>
        </div>
      </div>
    </footer>
  );
};
