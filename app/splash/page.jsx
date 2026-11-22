'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Simulate checking auth or loading data for 2.5 seconds
    const timer = setTimeout(() => {
      // We will change this later to check if the user is logged in.
      // For now, it goes to onboarding.
      router.push('/onboarding');
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      
      {/* Top Left Blue Gradient Wave */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-gradient-to-br from-blue-100 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 opacity-70"></div>
      
      {/* Top Right Yellow Gradient Wave */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-yellow-200 to-transparent rounded-full translate-x-1/3 -translate-y-1/3 opacity-80"></div>

      {/* Center Logo & Text */}
      <div className="z-10 flex flex-col items-center mt-[-10vh]">
        {/* Replace this div with your actual logo image if you have it */}
        <div className="w-32 h-32 mb-4 relative flex items-center justify-center">
            <img src="/images/cresoa-logo.png" alt="Cresoa Logo" className="w-full h-full object-contain" />
        </div>
        
        <h1 className="text-5xl font-extrabold text-[#0B1B3D] tracking-tight mb-2">
          Cresoa
        </h1>
        
        <p className="text-sm font-medium text-[#0B1B3D] tracking-widest flex items-center gap-2">
          Run <span className="text-[#F5A623] text-xl leading-none">&bull;</span> 
          Grow <span className="text-[#F5A623] text-xl leading-none">&bull;</span> 
          Go Online
        </p>
      </div>

      {/* Loading Spinner */}
      <div className="z-10 mt-12">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#0B1B3D] rounded-full animate-spin"></div>
      </div>

      {/* Bottom Waves & Cityscape */}
      <div className="absolute bottom-0 left-0 w-full">
        {/* Cityscape Silhouette (Using a faint opacity) */}
        <div className="absolute bottom-0 left-0 w-full h-32 opacity-10 bg-[url('/images/cityscape.svg')] bg-contain bg-bottom bg-no-repeat z-0"></div>
        
        {/* Green Wave */}
        <svg className="w-full h-24 relative z-10" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#00A651" fillOpacity="1" d="M0,192L48,197.3C96,203,192,213,288,218.7C384,224,480,224,576,202.7C672,181,768,139,864,133.3C960,128,1056,160,1152,170.7C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
        
        {/* Dark Blue Wave (Overlaps the green) */}
        <svg className="w-full h-32 absolute bottom-0 left-0 z-20" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#0B1B3D" fillOpacity="1" d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,213.3C840,224,960,224,1080,208C1200,192,1320,160,1380,144L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
        </svg>
      </div>
    </div>
  );
        }
