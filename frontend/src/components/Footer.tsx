import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Lock, ArrowRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-[#0B223D] border-t border-[#D9E3E8] dark:border-[#1E3A56] text-slate-600 dark:text-slate-300 text-sm mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              {/* Light Mode Logo */}
              <img
                src="/logo-transparent.png"
                alt="Khalil Academy"
                className="h-10 w-auto object-contain dark:hidden"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
              {/* Dark Mode Logo */}
              <img
                src="/logo-dark-mode.png"
                alt="Khalil Academy"
                className="h-10 w-auto object-contain hidden dark:block"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
              <div className="hidden w-9 h-9 rounded-xl bg-[#087F78] text-white items-center justify-center shadow-md">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-[#0B1F3A] dark:text-white">
                  KHALIL ACADEMY
                </span>
                <span className="text-[10px] text-[#087F78] dark:text-[#14B8A6] font-extrabold tracking-widest uppercase">
                  Learn • Grow • Succeed
                </span>
              </div>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Professional education academy dedicated to practical tech skills, real-world experience, and globally verifiable certifications.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 font-medium"><ShieldCheck className="w-4 h-4 text-[#10B981]" /> Verified Platform</span>
              <span className="flex items-center gap-1.5 font-medium"><Lock className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" /> 256-Bit SSL</span>
              <span className="flex items-center gap-1.5 text-[#10B981] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse inline-block" />
                All Systems Operational
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-extrabold text-[#0B1F3A] dark:text-white uppercase tracking-wider mb-4">Academy</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li><Link to="/courses" className="text-slate-600 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition">Course Catalog</Link></li>
              <li><Link to="/dashboard" className="text-slate-600 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition">Student Dashboard</Link></li>
              <li><Link to="/student/certificates" className="text-slate-600 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition">My Certificates</Link></li>
              <li><Link to="/register" className="text-slate-600 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition">Create Account</Link></li>
            </ul>
          </div>

          {/* Core Tracks */}
          <div>
            <h4 className="text-xs font-extrabold text-[#0B1F3A] dark:text-white uppercase tracking-wider mb-4">Learning Tracks</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li><Link to="/courses?category=Cloud+Computing" className="text-slate-600 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition">Cloud Architecture</Link></li>
              <li><Link to="/courses?category=DevOps" className="text-slate-600 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition">DevOps & Containers</Link></li>
              <li><Link to="/courses?category=DevSecOps" className="text-slate-600 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition">Security Engineering</Link></li>
              <li><Link to="/courses?category=Software+Engineering" className="text-slate-600 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition">Software Development</Link></li>
            </ul>
          </div>

          {/* Credential Verification */}
          <div>
            <h4 className="text-xs font-extrabold text-[#0B1F3A] dark:text-white uppercase tracking-wider mb-4">Certificate Registry</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Official certificates issued by Khalil Academy are cryptographically registered for instant validation.
            </p>
            <Link
              to="/certificates/verify/KHA-2026-000001"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#087F78] dark:text-[#14B8A6] hover:text-[#076E6A] transition group"
            >
              <span>Verify a Credential</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>

        <div className="border-t border-slate-200 dark:border-[#1E3A56] mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 dark:text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} Khalil Academy. All rights reserved.</p>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Professional Career Development & Certification
          </p>
        </div>
      </div>
    </footer>
  );
};
