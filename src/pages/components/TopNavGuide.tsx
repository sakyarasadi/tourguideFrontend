import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { logoutUser } from '@/lib/auth';
import Swal from 'sweetalert2';

interface GuideTopNavProps {
  title: string;
  subtitle?: string;
}

export default function GuideTopNav({ title, subtitle }: GuideTopNavProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3); // Mock notification count
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Get email from localStorage
    const email = localStorage.getItem('userEmail') || '';
    setUserEmail(email);
  }, []);

  const getUserInitials = () => {
    if (userEmail) {
      return userEmail[0]?.toUpperCase() || 'G';
    }
    return 'G';
  };

  const getUserName = () => {
    if (userEmail) {
      return userEmail.split('@')[0] || 'Guide';
    }
    return 'Guide';
  };

  const handleLogout = async () => {
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
  return (
    <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 fixed top-0 right-0 left-0 lg:left-64 z-20">
      <div className="flex items-center justify-between">
        <div className="ml-12 lg:ml-0">
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm lg:text-base text-gray-600 mt-1 hidden lg:block">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4">
          <button
            onClick={() => setNotificationCount(0)}
            className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
            title="Notifications"
          >
            <span className="text-lg lg:text-xl">🔔</span>
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 lg:space-x-3 hover:bg-gray-100 rounded-lg p-1 transition-colors"
            >
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xs lg:text-sm font-medium text-white">{getUserInitials()}</span>
              </div>
              <span className="text-xs lg:text-sm text-gray-700 hidden sm:block">{getUserName()}</span>
              <span className="text-gray-400 hidden lg:block">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-4 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-800">{getUserName()}</p>
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/guide/setting');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/profile');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Profile
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
