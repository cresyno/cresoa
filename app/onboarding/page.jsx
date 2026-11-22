'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BarChart3, ShoppingCart, Wallet, Globe } from 'lucide-react';

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentSlide < 2) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push('/signup');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden relative font-sans">
      
      {/* Top Skip Button */}
      <div className="flex justify-end p-6 pt-12 z-20 relative">
        <button 
          onClick={() => router.push('/login')} 
          className="text-[#0B1B3D] font-medium text-base"
        >
          Skip
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col px-8 z-10 relative">
        
        {/* Slide 1 */}
        {currentSlide === 0 && (
          <div className="flex flex-col h-full animate-fade-in">
            <h1 className="text-[40px] leading-[1.1] font-bold text-[#0B1B3D]">
              Your business.<br/>Better, with<br/><span className="text-[#F5A623]">Cresoa.</span>
            </h1>
            <p className="text-gray-600 mt-4 text-base leading-relaxed pr-4">
              Manage your orders, customers, inventory and payments — all in one powerful app.
            </p>
            <div className="flex-1 relative mt-8 flex justify-center items-center">
               {/* Replace with your actual 3D mockup image */}
               <img src="/images/onboarding-1.png" alt="Dashboard Mockup" className="w-full h-auto object-contain max-h-[350px]" />
            </div>
          </div>
        )}

        {/* Slide 2 */}
        {currentSlide === 1 && (
          <div className="flex flex-col h-full animate-fade-in">
            <h1 className="text-[40px] leading-[1.1] font-bold text-[#0B1B3D]">
              Your business<br/>deserves its own<br/><span className="text-[#F5A623]">website.</span>
            </h1>
            <p className="text-gray-600 mt-4 text-base leading-relaxed pr-4">
              Create a stunning online store and reach more customers.
            </p>
            <div className="flex-1 relative mt-8 flex justify-center items-center">
               {/* Replace with your actual 3D mockup image */}
               <img src="/images/onboarding-2.png" alt="Website Mockup" className="w-full h-auto object-contain max-h-[350px]" />
            </div>
          </div>
        )}

        {/* Slide 3 */}
        {currentSlide === 2 && (
          <div className="flex flex-col h-full animate-fade-in">
            <h1 className="text-[40px] leading-[1.1] font-bold text-[#0B1B3D]">
              Less chasing.<br/><span className="text-[#F5A623]">More growing.</span>
            </h1>
            <p className="text-gray-600 mt-4 text-base leading-relaxed pr-4">
              Track performance, manage operations and take your business further.
            </p>
            
            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="bg-[#0B1B3D] p-3 rounded-full text-white"><BarChart3 size={20} /></div>
                <div>
                  <h3 className="font-semibold text-[#0B1B3D] text-sm">Business Analytics</h3>
                  <p className="text-xs text-gray-500">Know your numbers</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="bg-[#00A651] p-3 rounded-full text-white"><ShoppingCart size={20} /></div>
                <div>
                  <h3 className="font-semibold text-[#0B1B3D] text-sm">Order Management</h3>
                  <p className="text-xs text-gray-500">Stay on top of orders</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="bg-[#F5A623] p-3 rounded-full text-white"><Wallet size={20} /></div>
                <div>
                  <h3 className="font-semibold text-[#0B1B3D] text-sm">Payments & Invoices</h3>
                  <p className="text-xs text-gray-500">Get paid, effortlessly</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="bg-blue-500 p-3 rounded-full text-white"><Globe size={20} /></div>
                <div>
                  <h3 className="font-semibold text-[#0B1B3D] text-sm">Online Presence</h3>
                  <p className="text-xs text-gray-500">Grow beyond limits</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area (Waves, Dots, Buttons) */}
      <div className="relative pt-10 pb-8 px-8">
        
        {/* Decorative Background Waves */}
        <div className="absolute bottom-0 left-0 w-full h-40 bg-[#0B1B3D] rounded-t-[100%] scale-x-150 translate-y-12 -z-10"></div>
        <div className="absolute bottom-0 left-0 w-full h-36 bg-[#00A651] rounded-t-[100%] scale-x-150 translate-y-14 -z-20 opacity-80"></div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mb-8 relative z-10">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'w-8 bg-[#F5A623]' : 'w-2.5 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="relative z-10 flex flex-col gap-3">
          <button
            onClick={handleNext}
            className={`w-full font-semibold py-4 rounded-full flex items-center justify-center gap-2 transition-colors ${
              currentSlide === 2 
                ? 'bg-[#F5A623] text-[#0B1B3D] hover:bg-yellow-500' 
                : 'bg-[#0B1B3D] text-white hover:bg-[#1a2e5c]'
            }`}
          >
            {currentSlide === 2 ? 'Create an Account' : 'Next'}
            {currentSlide < 2 && <ArrowRight size={20} />}
          </button>
          
          {currentSlide === 2 && (
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-white text-[#0B1B3D] font-semibold py-4 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
