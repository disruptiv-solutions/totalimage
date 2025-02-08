import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navigation() {
  const router = useRouter();
  const { user, logout, getUserProfile } = useAuth();
  const { subscription } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAdminStatus() {
      if (user) {
        const profile = await getUserProfile(user.uid);
        setIsAdmin(profile?.isAdmin === true);
      }
    }
    checkAdminStatus();
  }, [user, getUserProfile]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  if (!user) {
    return (
      <nav className="bg-black border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <span className="text-4xl font-black tracking-tighter text-white">
              TotalToons<span className="text-[#4CAF50]">34</span>
            </span>
            <div className="hidden md:flex gap-6">
              <button
                onClick={() => router.push('/signin')}
                className="px-6 py-2.5 text-white hover:text-[#4CAF50] transition-colors duration-200 text-lg font-semibold"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="px-6 py-2.5 bg-[#4CAF50] text-white rounded-md hover:bg-[#45a049] transition-colors duration-200 text-lg font-semibold"
              >
                Sign Up
              </button>
            </div>
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-white hover:text-[#4CAF50] transition-colors duration-200"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden bg-black" id="mobile-menu">
            <div className="px-4 pt-2 pb-3 space-y-2">
              <button
                onClick={() => {
                  router.push('/signin');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3 text-lg font-semibold text-white hover:text-[#4CAF50] hover:bg-neutral-900 rounded-md transition-colors duration-200"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  router.push('/signup');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3 text-lg font-semibold text-white bg-[#4CAF50] hover:bg-[#45a049] rounded-md transition-colors duration-200"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav className="bg-black border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <span className="text-4xl font-black tracking-tighter text-white">
            TotalToons<span className="text-[#4CAF50]">34</span>
          </span>
          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-white hover:text-[#4CAF50] transition-colors duration-200 text-lg font-semibold"
            >
              Home
            </button>
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-white hover:text-[#4CAF50] transition-colors duration-200 text-lg font-semibold"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => router.push('/subscription-details')}
              className="px-4 py-2 text-white hover:text-[#4CAF50] transition-colors duration-200 text-lg font-semibold flex items-center"
            >
              Subscription
              {subscription?.status === 'active' && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-[#4CAF50] text-black">
                  Active
                </span>
              )}
              {subscription?.status === 'trialing' && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-400 text-black">
                  Trial
                </span>
              )}
            </button>
            <button
              onClick={() => router.push('/account-settings')}
              className="px-4 py-2 text-white hover:text-[#4CAF50] transition-colors duration-200 text-lg font-semibold"
            >
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-red-500 hover:text-red-400 transition-colors duration-200 text-lg font-semibold"
            >
              Sign out
            </button>
          </div>
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-white hover:text-[#4CAF50] transition-colors duration-200"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black" id="mobile-menu">
          <div className="px-4 pt-2 pb-3 space-y-2">
            <button
              onClick={() => {
                router.push('/');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-3 text-lg font-semibold text-white hover:text-[#4CAF50] hover:bg-neutral-900 rounded-md transition-colors duration-200"
            >
              Home
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  router.push('/admin');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3 text-lg font-semibold text-white hover:text-[#4CAF50] hover:bg-neutral-900 rounded-md transition-colors duration-200"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => {
                router.push('/subscription-details');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-3 text-lg font-semibold text-white hover:text-[#4CAF50] hover:bg-neutral-900 rounded-md transition-colors duration-200"
            >
              Subscription
              {subscription?.status === 'active' && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-[#4CAF50] text-black">
                  Active
                </span>
              )}
              {subscription?.status === 'trialing' && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-400 text-black">
                  Trial
                </span>
              )}
            </button>
            <button
              onClick={() => {
                router.push('/account-settings');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-3 text-lg font-semibold text-white hover:text-[#4CAF50] hover:bg-neutral-900 rounded-md transition-colors duration-200"
            >
              Settings
            </button>
            <button
              onClick={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-3 text-lg font-semibold text-red-500 hover:text-red-400 hover:bg-neutral-900 rounded-md transition-colors duration-200"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}