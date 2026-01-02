import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { logoutUser } from '@/lib/auth';

export default function GuideSideNav() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Get email from localStorage
    const email = localStorage.getItem('userEmail') || '';
    setUserEmail(email);
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/guide/dashboard', icon: '📊' },
    { name: 'Browse Requests', href: '/guide/browseRequests', icon: '🔍' },
    { name: 'My Applications', href: '/guide/applications', icon: '📝' },
    { name: 'Accepted Tours', href: '/guide/bookings', icon: '✅' },
    { name: 'Pricing', href: '/guide/pricing', icon: '💰' },
    { name: 'Reviews', href: '/guide/reviews', icon: '⭐' },
    { name: 'Payouts', href: '/guide/payouts', icon: '💳' },
    { name: 'AI Assistant', href: '/guide/aiAssistant', icon: '🤖' },
  ];

  const bottomNavItems = [
    { name: 'Settings', href: '/guide/setting', icon: '⚙️' },
  ];

  const isActive = (href: string) => {
    return router.pathname === href;
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      setIsLoggingOut(true);
      try {
        await logoutUser();
        await Swal.fire({
          title: 'Logged out!',
          text: 'You have been successfully logged out.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
        router.push('/');
      } catch (error: any) {
        setIsLoggingOut(false);
        await Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to logout. Please try again.',
          icon: 'error',
        });
      }
    }
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-md shadow-md"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-opacity-50 z-20"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`w-64 bg-gray-50 h-screen flex flex-col fixed left-0 top-0 z-20 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {userEmail[0]?.toUpperCase() || 'G'}
                </span>
              </div>
              <span className="text-xl font-bold text-gray-800">TourGuideAI</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.href)
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-4 border-t border-gray-200">
            {userEmail && (
              <div className="mb-3 px-4 py-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {userEmail[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {userEmail.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
              </div>
            )}
            <ul className="space-y-2">
              {bottomNavItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.href)
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-lg">🚪</span>
                  <span className="font-medium">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </>
  );
}
