import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Reusable SVG Icons
const CheckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
  </svg>
);

const SparkleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
  </svg>
);

const AlertIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
  </svg>
);

export default function CareerLensLanding() {
  // Hero Interactive States
  const [heroScore, setHeroScore] = useState(45);
  const [isScanning, setIsScanning] = useState(false);

  // Features (Optimize) Interactive State
  const [isRewritten, setIsRewritten] = useState(false);

  // Dashboard Tab State
  const [activeTab, setActiveTab] = useState('Overview');
  const [hoveredMetric, setHoveredMetric] = useState(null);

  // Simulate Hero Score Increment on load
  useEffect(() => {
    setTimeout(() => setIsScanning(true), 1000);
    setTimeout(() => {
      setIsScanning(false);
      let current = 45;
      const interval = setInterval(() => {
        if (current < 92) {
          current += 1;
          setHeroScore(current);
        } else {
          clearInterval(interval);
        }
      }, 20);
    }, 3500);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F8F9] text-[#111439] antialiased selection:bg-[#0FFCBE]/30 font-['CoFo_Sans',_Inter,_sans-serif] overflow-x-hidden relative z-0">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] max-w-[800px] h-[600px] bg-gradient-to-br from-[#106EBE]/10 to-[#0FFCBE]/10 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

      {/* 1. NAVIGATION */}
      <nav className="sticky top-0 z-50 w-full border-b border-[#111439]/5 bg-[#F8F8F9]/80 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] flex items-center justify-center shadow-md shadow-[#106EBE]/10 shrink-0">
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#111439]">
              Career<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#106EBE] to-[#0FFCBE]">Lens</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-[#111439]/70">
            <Link to="/dashboard" className="hover:text-[#111439] transition-colors duration-300">Platform</Link>
            <Link to="/ats" className="hover:text-[#111439] transition-colors duration-300">Solutions</Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <Link to="/login" className="hidden sm:block font-medium text-sm text-[#111439]/70 hover:text-[#111439] transition-colors duration-300">Sign In</Link>
            <Link 
              to="/signup" 
              className="relative inline-flex items-center justify-center px-4 sm:px-5 h-9 sm:h-10 text-xs sm:text-sm font-bold text-white rounded-xl overflow-hidden group shadow-lg shadow-[#106EBE]/20 hover:shadow-[#106EBE]/30 transition-all duration-300 shrink-0"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#106EBE] to-[#0FFCBE] transition-transform duration-500 group-hover:scale-105"></span>
              <span className="relative z-10">Start for free</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. REFINED HERO SECTION */}
      <section className="relative pt-12 pb-16 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#111439]/10 shadow-sm text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#106EBE] mb-6 md:mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0FFCBE] animate-pulse"></span> Meet your Career OS
        </div>
        
        <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-[#111439] leading-[1.1] mb-4 sm:mb-6">
          Stop sending your resume <br className="hidden sm:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#111439] via-[#106EBE] to-[#0FFCBE]">into the void.</span>
        </h1>
        
        <p className="text-sm sm:text-base lg:text-lg text-[#111439]/70 font-normal leading-relaxed max-w-2xl mx-auto mb-8 sm:mb-10 px-2 sm:px-0">
          CareerLens is the single platform to manage your entire job search. Uncover exactly why recruiters reject you, automatically optimize your phrasing, and turn applications into data-driven decisions.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-16 md:mb-20 px-4 sm:px-0">
          <Link to="/signup" className="w-full sm:w-auto inline-flex items-center justify-center px-8 h-12 sm:h-14 text-sm sm:text-base font-bold text-white rounded-xl bg-[#111439] hover:bg-[#1a1f54] transition-all duration-300 shadow-xl shadow-[#111439]/20">
            Analyze My Resume
          </Link>
          <Link to="/signup" className="w-full sm:w-auto inline-flex items-center justify-center px-8 h-12 sm:h-14 text-sm sm:text-base font-bold text-[#111439] rounded-xl bg-white border border-[#111439]/10 hover:bg-[#F8F8F9] transition-all duration-300 shadow-sm">
            Start Free Trial
          </Link>
        </div>

        {/* 2.5 REALISTIC PRODUCT MOCKUP HERO SHOWCASE */}
        <div className="relative w-full max-w-4xl mx-auto group perspective-[2000px] px-2 sm:px-4 md:px-0">
          <div className="relative rounded-2xl sm:rounded-3xl bg-white/60 backdrop-blur-2xl border border-white/80 shadow-2xl shadow-[#111439]/10 overflow-hidden transform transition-transform duration-700 md:hover:rotate-x-2 md:hover:-translate-y-2 text-left">
            
            {/* Window Header */}
            <div className="bg-white/40 border-b border-[#111439]/5 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-1.5 sm:gap-2 backdrop-blur-md">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#111439]/20"></div>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#111439]/20"></div>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#111439]/20"></div>
            </div>
            
            {/* Realistic UI Content */}
            <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gradient-to-b from-white/40 to-transparent">
              <div className="lg:col-span-2 space-y-5 sm:space-y-6">
                
                {/* Header Profile Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#111439]/5 pb-4 gap-3 sm:gap-0">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] p-[2px]">
                       <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-extrabold text-xs sm:text-sm text-[#111439]">JD</div>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-[#111439]">Senior Product Manager</h3>
                      <p className="text-[10px] sm:text-xs font-medium text-[#111439]/60">Targeting: FinTech • Remote</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="block text-[10px] sm:text-xs font-bold text-[#111439]/60">Last Scan</span>
                    <span className="block text-xs sm:text-sm font-medium text-[#111439]">Today, 09:41 AM</span>
                  </div>
                </div>

                {/* ATS Keyword Match Block */}
                <div className="space-y-2.5 sm:space-y-3">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#111439]/60">ATS Match Analysis</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-[#0D9476]/10 text-[#0D9476] text-[10px] sm:text-xs font-bold rounded-lg border border-[#0D9476]/20 flex items-center gap-1">
                      <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> Go-to-Market
                    </span>
                    <span className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-[#0D9476]/10 text-[#0D9476] text-[10px] sm:text-xs font-bold rounded-lg border border-[#0D9476]/20 flex items-center gap-1">
                      <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> Agile Leadership
                    </span>
                    <span className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-red-500/10 text-red-600 text-[10px] sm:text-xs font-bold rounded-lg border border-red-500/20 flex items-center gap-1">
                      <AlertIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> Missing: SQL
                    </span>
                  </div>
                </div>

                {/* Engagement Chart Mockup */}
                <div className="h-20 sm:h-28 w-full bg-[#F8F8F9] border border-[#111439]/5 rounded-xl flex items-end justify-between px-3 sm:px-6 pt-4 sm:pt-6 pb-2 relative overflow-hidden">
                   <div className="absolute top-2 sm:top-3 left-3 sm:left-4 text-[9px] sm:text-[10px] font-bold text-[#111439]/60">Resume Readability Curve</div>
                   {[40, 55, 45, 70, 85, 60, 92].map((h, i) => (
                     <div key={i} className="w-4 sm:w-8 bg-gradient-to-t from-[#106EBE] to-[#0FFCBE] rounded-t-sm sm:rounded-t-md opacity-80" style={{ height: `${h}%` }}></div>
                   ))}
                </div>

              </div>
              
              {/* Sidebar Recent Activity */}
              <div className="space-y-4 hidden lg:block border-l border-[#111439]/5 pl-6">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#111439]/60 mb-2">Recent Applications</p>
                
                <div className="bg-white rounded-xl border border-[#111439]/5 p-3 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-bold text-[#111439]">Stripe</p>
                    <span className="text-[9px] font-bold bg-[#0D9476]/10 text-[#0D9476] px-1.5 py-0.5 rounded">Viewed</span>
                  </div>
                  <p className="text-[10px] text-[#111439]/60">Product Lead</p>
                  <p className="text-[9px] text-[#111439]/40 mt-2">Oct 12, 10:00 AM</p>
                </div>

                <div className="bg-white rounded-xl border border-[#111439]/5 p-3 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-bold text-[#111439]">Vercel</p>
                    <span className="text-[9px] font-bold bg-[#111439]/5 text-[#111439]/60 px-1.5 py-0.5 rounded">Applied</span>
                  </div>
                  <p className="text-[10px] text-[#111439]/60">Senior PM</p>
                  <p className="text-[9px] text-[#111439]/40 mt-2">Oct 14, 2:30 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Score Card */}
          <div className="absolute -bottom-6 right-2 sm:-bottom-8 sm:-right-8 lg:-right-10 bg-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-[#106EBE]/20 border border-[#111439]/5 p-4 sm:p-6 w-48 sm:w-56 transform transition-transform duration-500 hover:-translate-y-2 z-20">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#111439]/60 mb-2 sm:mb-3 text-left">Overall Score</p>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-[#111439]/5" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#0FFCBE] transition-all duration-1000 ease-out" strokeDasharray={`${heroScore}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute text-lg sm:text-xl font-extrabold text-[#111439]">{heroScore}</div>
              </div>
              <div className="text-left">
                <span className="block text-xs sm:text-sm font-bold text-[#111439]">Excellent</span>
                <span className="block text-[9px] sm:text-[10px] text-[#0D9476] mt-0.5 font-medium">Top 8% candidate</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* 3. DATA-DRIVEN SOCIAL PROOF */}
      <section className="py-8 sm:py-12 border-y border-[#111439]/5 bg-white relative z-10 mt-8 sm:mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-[#111439]/5">
            <div className="py-4 md:py-0 flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#111439]">20,000+</span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#111439]/60 mt-1">Resumes Analyzed</span>
            </div>
            <div className="py-4 md:py-0 flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#106EBE]">80%</span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#111439]/60 mt-1">Interview Success Rate</span>
            </div>
            <div className="py-4 md:py-0 flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0D9476]">2x</span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#111439]/60 mt-1">Faster Job Placement</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE 3 CORE PILLARS */}
      <section className="py-16 sm:py-24 md:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 md:space-y-32">
          
          {/* Pillar 1: Analyze */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="space-y-5 sm:space-y-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-[#111439]/5 flex items-center justify-center text-[#106EBE]">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111439] tracking-tight">
                Uncover the blind spots killing your applications.
              </h2>
              <p className="text-sm sm:text-base text-[#111439]/70 leading-relaxed max-w-md">
                We scan your resume against live industry parameters to instantly highlight missing keywords, weak formatting, and critical gaps.
              </p>
              <ul className="space-y-2.5 sm:space-y-3 text-sm font-medium text-[#111439]">
                <li className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0FFCBE] shrink-0" />
                  <span>Instant Employer Perspective Scoring</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0FFCBE] shrink-0" />
                  <span>Missing Keyword Detection</span>
                </li>
              </ul>
            </div>
            
            {/* Visual Abstract UI for Analyze */}
            <div className="relative bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl shadow-[#111439]/5 border border-[#111439]/5 min-h-[280px] sm:min-h-[340px] flex flex-col justify-center">
               <div className="space-y-4 relative z-10 w-full">
                 {/* Mock error state */}
                 <div className="bg-[#F8F8F9] p-3 sm:p-4 rounded-xl border border-red-500/20 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                   <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                     <AlertIcon className="w-4 h-4 text-red-500 shrink-0" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-[#111439]">Missing Core Competency</p>
                     <p className="text-xs text-[#111439]/70 mt-1">Job description heavily requires "Agile Leadership". Found 0 mentions.</p>
                     <button className="mt-3 text-[10px] sm:text-xs font-bold text-white bg-red-500 px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-600 transition-colors w-full sm:w-auto">Fix Issue (-12pts)</button>
                   </div>
                 </div>
                 {/* Mock success state */}
                 <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#111439]/5 shadow-sm flex items-center justify-between opacity-70">
                   <div className="flex items-center gap-2 sm:gap-3">
                     <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D9476] shrink-0" />
                     <span className="text-xs sm:text-sm font-bold text-[#111439]">Action Verbs Density</span>
                   </div>
                   <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#0FFCBE]/20 text-[#0D9476] px-2 py-1 rounded">Optimal</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Pillar 2: Optimize */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="order-2 lg:order-1 relative bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl shadow-[#111439]/5 border border-[#111439]/5 min-h-[280px] sm:min-h-[340px] flex flex-col justify-center">
              {/* Interactive Toggle Showcase */}
              <div className="text-center mb-6">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#111439]/60 mb-3 sm:mb-4">Click to rewrite bullet point</p>
                <div 
                  onClick={() => setIsRewritten(!isRewritten)}
                  className="inline-flex flex-col sm:flex-row bg-[#F8F8F9] rounded-xl p-1 cursor-pointer shadow-inner border border-[#111439]/5 w-full sm:w-auto"
                >
                  <div className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-500 ease-in-out text-center ${!isRewritten ? 'bg-white shadow text-[#111439]' : 'text-[#111439]/50'}`}>Original</div>
                  <div className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-500 ease-in-out flex items-center justify-center gap-2 ${isRewritten ? 'bg-gradient-to-r from-[#106EBE] to-[#0FFCBE] shadow text-white' : 'text-[#111439]/50'}`}>
                    <SparkleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Optimized</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#F8F8F9] rounded-xl p-4 sm:p-6 border border-[#111439]/5 min-h-[100px] sm:min-h-[120px] flex items-center transition-all duration-500">
                <p className={`text-xs sm:text-sm md:text-base transition-all duration-500 ease-in-out ${isRewritten ? 'text-[#111439] font-medium' : 'text-[#111439]/60 line-through decoration-red-500/50'}`}>
                  {isRewritten 
                    ? "Spearheaded the development of tracking charts, increasing team workflow efficiency by 40% over Q3." 
                    : "Helped build some tracking charts for the team."}
                </p>
              </div>
            </div>
            
            <div className="order-1 lg:order-2 space-y-5 sm:space-y-6 lg:pl-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-[#111439]/5 flex items-center justify-center text-[#106EBE]">
                <SparkleIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111439] tracking-tight">
                Write like a top 1% candidate instantly.
              </h2>
              <p className="text-sm sm:text-base text-[#111439]/70 leading-relaxed max-w-md">
                Our smart engine rewrites standard bullet points into high-impact, metric-driven achievements tailored to your target role.
              </p>
              <ul className="space-y-2.5 sm:space-y-3 text-sm font-medium text-[#111439]">
                <li className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0FFCBE] shrink-0" />
                  <span>Dynamic Context Rewriting</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0FFCBE] shrink-0" />
                  <span>Auto-Generated Cover Letters</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pillar 3: Execute (Dashboard) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="space-y-5 sm:space-y-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-[#111439]/5 flex items-center justify-center text-[#106EBE]">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111439] tracking-tight">
                Your master control center for the job hunt.
              </h2>
              <p className="text-sm sm:text-base text-[#111439]/70 leading-relaxed max-w-md">
                Visually track applications, get automated follow-up reminders, and measure your daily momentum from a centralized Kanban board.
              </p>
              <ul className="space-y-2.5 sm:space-y-3 text-sm font-medium text-[#111439]">
                <li className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0FFCBE] shrink-0" />
                  <span>Visual Application Board</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#0FFCBE] shrink-0" />
                  <span>Automated Follow-up Alerts</span>
                </li>
              </ul>
            </div>
            
            {/* Visual Abstract UI for Execute */}
            <div className="relative bg-[#F8F8F9] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-inner border border-[#111439]/5 min-h-[300px] sm:min-h-[340px] overflow-hidden flex flex-col justify-center">
              {/* Realistic Kanban Board */}
              <div className="flex flex-col sm:flex-row gap-4 h-full relative z-10 overflow-hidden">
                {/* Column 1 */}
                <div className="flex-1 space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#111439]/60 mb-2 flex items-center justify-between">Applied <span className="bg-[#111439]/10 px-1.5 py-0.5 rounded text-[9px]">12</span></h4>
                  
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-[#111439]/5 shadow-sm space-y-1">
                    <div className="flex items-center justify-between">
                       <p className="text-xs font-bold text-[#111439]">Stripe</p>
                       <span className="text-[8px] font-bold text-[#111439]/40">1d ago</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-medium text-[#111439]/70">Frontend Engineer</p>
                    <div className="mt-2 flex items-center gap-2">
                       <div className="h-1.5 w-1/3 bg-[#106EBE] rounded-full"></div>
                       <span className="text-[8px] sm:text-[9px] text-[#111439]/60">Resume Sent</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-[#111439]/5 shadow-sm space-y-1 opacity-70 hidden sm:block">
                    <div className="flex items-center justify-between">
                       <p className="text-xs font-bold text-[#111439]">Shopify</p>
                       <span className="text-[8px] font-bold text-[#111439]/40">3d ago</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-medium text-[#111439]/70">UX Designer</p>
                    <div className="mt-2 flex items-center gap-2">
                       <div className="h-1.5 w-1/3 bg-[#111439]/20 rounded-full"></div>
                       <span className="text-[8px] sm:text-[9px] text-[#111439]/60">Under Review</span>
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="flex-1 space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#111439]/60 mb-2 flex items-center justify-between">Interviews <span className="bg-[#106EBE]/10 text-[#106EBE] px-1.5 py-0.5 rounded text-[9px]">3</span></h4>
                  
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border-2 border-[#106EBE]/20 shadow-md transform -translate-y-1 space-y-1 relative">
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0FFCBE] animate-pulse"></div>
                    <p className="text-xs font-bold text-[#111439]">Vercel</p>
                    <p className="text-[10px] sm:text-[11px] font-medium text-[#111439]/70">Product Engineer</p>
                    <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-[#111439]/5 flex items-center justify-between">
                      <p className="text-[9px] sm:text-[10px] font-bold text-[#106EBE]">Round 2: Tech</p>
                      <p className="text-[8px] sm:text-[9px] font-bold text-[#111439]/50">Today, 2:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-16 sm:h-24 bg-gradient-to-t from-[#F8F8F9] to-transparent pointer-events-none z-0"></div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. DEEP DIVE DASHBOARD PREVIEW */}
      <section className="py-16 sm:py-20 md:py-24 border-t border-[#111439]/5 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
             <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#111439]">
               Stop guessing. Start measuring.
             </h2>
             <p className="text-sm sm:text-base text-[#111439]/70 mt-3 sm:mt-4">
               Your complete analytics suite tracks your output, evaluates momentum, and intelligently suggests your next strategic move.
             </p>
          </div>

          {/* Interactive Live Dashboard */}
          <div className="bg-[#F8F8F9] rounded-2xl sm:rounded-3xl border border-[#111439]/5 shadow-2xl shadow-[#111439]/5 overflow-hidden">
             {/* Header */}
             <div className="bg-white border-b border-[#111439]/5 px-4 sm:px-6 py-3 sm:py-4 flex justify-start gap-1 sm:gap-2 overflow-x-auto hide-scrollbar">
               {['Overview', 'Performance', 'Documents'].map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${activeTab === tab ? 'bg-[#111439] text-white' : 'text-[#111439]/60 hover:bg-[#111439]/5'}`}
                 >
                   {tab}
                 </button>
               ))}
             </div>

             {/* Content */}
             <div className="p-4 sm:p-6 md:p-8 min-h-[280px] sm:min-h-[320px] flex items-center justify-center transition-all duration-500">
               {activeTab !== 'Overview' ? (
                 <div className="text-center animate-fade-in space-y-3 px-4">
                   <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-[#111439]/10 mx-auto flex items-center justify-center text-[#111439]/30">
                     <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                   </div>
                   <p className="text-xs sm:text-sm font-bold text-[#111439]">Create an account to access {activeTab}</p>
                   <p className="text-[10px] sm:text-xs text-[#111439]/60">This module is locked in the live preview.</p>
                   <Link to="/signup" className="inline-block mt-2 text-[10px] sm:text-xs font-bold text-[#106EBE] hover:underline">Sign up free →</Link>
                 </div>
               ) : (
                 <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
                   
                   {/* Next Steps Widget */}
                   <div className="md:col-span-1 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-[#111439]/5 shadow-sm">
                     <h4 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#111439]/60 mb-4 sm:mb-5">Suggested Actions</h4>
                     <div className="space-y-3 sm:space-y-4">
                       <div className="flex items-start gap-2.5 sm:gap-3">
                         <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-2 border-[#106EBE] mt-0.5 flex-shrink-0"></div>
                         <div>
                           <p className="text-xs sm:text-sm font-bold text-[#111439] leading-tight">Follow up with Airbnb</p>
                           <p className="text-[9px] sm:text-[10px] text-[#111439]/60 mt-0.5 sm:mt-1">It's been 5 days since interview.</p>
                         </div>
                       </div>
                       <div className="flex items-start gap-2.5 sm:gap-3 opacity-60">
                         <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-2 border-[#111439]/20 mt-0.5 flex-shrink-0"></div>
                         <div>
                           <p className="text-xs sm:text-sm font-bold text-[#111439] leading-tight">Submit Netflix App</p>
                           <p className="text-[9px] sm:text-[10px] text-[#111439]/60 mt-0.5 sm:mt-1">Draft is 90% complete.</p>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Data Visualization Graph Widget */}
                   <div className="md:col-span-2 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-[#111439]/5 shadow-sm flex flex-col justify-between overflow-hidden">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
                       <h4 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#111439]/60">Application Volume</h4>
                       <span className="text-[9px] sm:text-[10px] font-bold text-[#0D9476] bg-[#0FFCBE]/20 px-2 py-1 rounded">+14% vs last week</span>
                     </div>
                     
                     {/* Structured Bar Chart */}
                     <div className="h-32 sm:h-40 flex gap-2 sm:gap-3 pt-2">
                        {/* Y-Axis */}
                        <div className="flex flex-col justify-between text-[8px] sm:text-[9px] font-bold text-[#111439]/40 pb-5">
                          <span>20</span>
                          <span>15</span>
                          <span>10</span>
                          <span>5</span>
                          <span>0</span>
                        </div>
                        
                        {/* Chart Area */}
                        <div className="flex-1 relative flex items-end justify-between border-l border-b border-[#111439]/10 pl-1 sm:pl-2 pb-1">
                          
                          {/* Horizontal Gridlines */}
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
                            {[...Array(5)].map((_,i) => <div key={i} className="w-full border-t border-[#111439]/5"></div>)}
                          </div>

                          {/* Data Bars */}
                          {[
                            { day: 'Mon', h: '40%', val: 8 }, { day: 'Tue', h: '60%', val: 12 }, 
                            { day: 'Wed', h: '30%', val: 6 }, { day: 'Thu', h: '90%', val: 18 }, 
                            { day: 'Fri', h: '50%', val: 10 }, { day: 'Sat', h: '20%', val: 4 }
                          ].map((bar, i) => (
                            <div 
                              key={i} 
                              onMouseEnter={() => setHoveredMetric(i)}
                              onMouseLeave={() => setHoveredMetric(null)}
                              className="relative flex-1 flex flex-col items-center justify-end h-full group z-10 mx-0.5 sm:mx-1"
                            >
                              {/* Hover Tooltip */}
                              <div className={`absolute -top-5 sm:-top-6 bg-[#111439] text-white text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded transition-opacity duration-300 pointer-events-none ${hoveredMetric === i ? 'opacity-100' : 'opacity-0'}`}>
                                {bar.val}
                              </div>
                              <div 
                                className={`w-full max-w-[20px] sm:max-w-[32px] rounded-t-sm sm:rounded-t-md transition-all duration-500 ease-in-out ${hoveredMetric === i ? 'bg-gradient-to-t from-[#106EBE] to-[#0FFCBE]' : 'bg-[#111439]/10'}`} 
                                style={{ height: bar.h }}
                              ></div>
                              <span className="absolute -bottom-4 sm:-bottom-5 text-[8px] sm:text-[9px] font-bold text-[#111439]/60 group-hover:text-[#111439] transition-colors">{bar.day}</span>
                            </div>
                          ))}
                        </div>
                     </div>
                   </div>

                 </div>
               )}
             </div>
          </div>
        </div>
      </section>

      {/* 6. IMMERSIVE CTA */}
      <section className="py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-[1.5rem] sm:rounded-[2rem] bg-[#111439] p-6 sm:p-12 text-center text-white overflow-hidden shadow-2xl">
          
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
          <div className="absolute -top-16 -right-16 sm:-top-32 sm:-right-32 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-gradient-to-br from-[#106EBE] to-[#0FFCBE] opacity-20 blur-[60px] sm:blur-[100px] pointer-events-none"></div>

          <div className="relative z-10 space-y-4 sm:space-y-5 max-w-lg mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              Ready to command your career?
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-normal leading-relaxed px-2 sm:px-0">
              Join thousands of high-performing candidates who stopped guessing and started treating their applications like an exact science.
            </p>
            <div className="pt-4">
              <Link to="/signup" className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 h-12 sm:h-14 text-sm sm:text-base font-bold text-[#111439] rounded-xl bg-[#0FFCBE] hover:bg-[#0ae3aa] transition-all duration-300 shadow-xl shadow-[#0FFCBE]/10 transform hover:-translate-y-0.5">
                Start Using CareerLens Free
              </Link>
              <p className="text-[10px] sm:text-xs text-white/60 mt-3 sm:mt-4">No credit card required. Setup takes 2 minutes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. REFINED FOOTER */}
      <footer className="bg-white border-t border-[#111439]/5 pt-12 sm:pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 sm:gap-10 pb-12 sm:pb-16 border-b border-[#111439]/5">
            
            <div className="col-span-2 lg:col-span-2 space-y-4 pr-0 sm:pr-8">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#106EBE] flex items-center justify-center">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-white"></div>
                </div>
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-[#111439]">CareerLens</span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#111439]/60 leading-relaxed">
                The modern career operating system designed to turn your job search into a precise, data-driven journey to success.
              </p>
            </div>

            <div className="col-span-1 space-y-3">
              <h5 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#111439]">Product</h5>
              <ul className="space-y-2 flex flex-col">
                <li><Link to="/ats" className="text-[11px] sm:text-xs text-[#111439]/60 hover:text-[#106EBE] transition-colors">Analyzer</Link></li>
                <li><Link to="/tailor-resume" className="text-[11px] sm:text-xs text-[#111439]/60 hover:text-[#106EBE] transition-colors">Optimizer</Link></li>
                <li><Link to="/jobs" className="text-[11px] sm:text-xs text-[#111439]/60 hover:text-[#106EBE] transition-colors">Tracker</Link></li>
              </ul>
            </div>

            <div className="col-span-1 space-y-3">
              <h5 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#111439]">Company</h5>
              <ul className="space-y-2 flex flex-col">
                <li><Link to="/" className="text-[11px] sm:text-xs text-[#111439]/60 hover:text-[#106EBE] transition-colors">About Us</Link></li>
                <li><Link to="/" className="text-[11px] sm:text-xs text-[#111439]/60 hover:text-[#106EBE] transition-colors">Pricing</Link></li>
                <li><Link to="/" className="text-[11px] sm:text-xs text-[#111439]/60 hover:text-[#106EBE] transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div className="col-span-2 lg:col-span-2 space-y-3">
              <h5 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#111439]">Legal</h5>
              <ul className="space-y-2 flex flex-col">
                <li><Link to="/" className="text-[11px] sm:text-xs text-[#111439]/60 hover:text-[#106EBE] transition-colors">Privacy Policy</Link></li>
                <li><Link to="/" className="text-[11px] sm:text-xs text-[#111439]/60 hover:text-[#106EBE] transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

          </div>

          <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] sm:text-[11px] font-medium text-[#111439]/60">&copy; 2026 CareerLens Inc. All rights reserved.</p>
            <div className="flex items-center gap-5 sm:gap-6 opacity-60">
              <a href="#" className="hover:text-[#106EBE] transition-colors" aria-label="Twitter">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="hover:text-[#106EBE] transition-colors" aria-label="LinkedIn">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}