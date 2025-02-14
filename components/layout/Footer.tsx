import React from 'react';
import { Mail } from 'lucide-react';
import { useRouter } from 'next/router';

const Footer = () => {
  const router = useRouter();

  return (
    <footer className="w-full bg-neutral-900 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          {/* Left side - Copyright */}
          <div className="text-neutral-500 text-sm">
            © {new Date().getFullYear()} TotalToons34. All rights reserved.
          </div>

          {/* Right side - Links */}
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6">
            <button 
              className="text-neutral-400 hover:text-white text-sm transition-colors duration-200"
              onClick={() => window.open('/terms', '_blank')}
            >
              Terms of Service
            </button>

            <button 
              className="text-neutral-400 hover:text-white text-sm transition-colors duration-200"
              onClick={() => window.open('/privacy', '_blank')}
            >
              Privacy Policy
            </button>

            <button 
              className="flex items-center space-x-2 text-[#4CAF50] hover:text-[#45a049] text-sm transition-colors duration-200"
              onClick={() => router.push('/contact')}
            >
              <Mail className="h-4 w-4" />
              <span>Contact Us</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;