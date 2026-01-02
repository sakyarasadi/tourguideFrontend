import React, { useState } from 'react';
import SideNav from '../../components/SideNav';
import TopNav from '../../components/TopNav';

export default function TouristDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const recommendedGuides = [
    {
      id: 1,
      name: 'Kasun Perera',
      specialties: 'Hill country & ancient cities',
      image: '/api/placeholder/guide1',
    },
    {
      id: 2,
      name: 'Nayani Silva',
      specialties: 'Scenic sites in wildlife safaris',
      image: '/api/placeholder/guide2',
    },
    {
      id: 3,
      name: 'Rajitha Fernando',
      specialties: 'Hill country & tea plantations',
      image: '/api/placeholder/guide3',
    },
  ];

  const upcomingBooking = {
    title: 'Sigiriya Rock Fortress & Dambulla Cave Temple',
    guide: 'Kasun Perera',
    date: 'Nov 22, 2024, 08:00 AM',
    image: '/api/placeholder/sigiriya',
  };

  const ongoingBooking = {
    title: 'Yala National Park Safari',
    guide: 'Nayani Silva',
    status: 'Ongoing',
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SideNav
        activeMenu="dashboard"
        userType="tourist"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto lg:ml-0">
        <TopNav
          title="Tourist Dashboard"
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          showSearch={true}
          searchPlaceholder="Search guides..."
        />

        <div className="p-4 lg:p-8">
          <div className="mb-6 lg:mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Looking for a Guide?</h2>
              <p className="mb-4 text-blue-50">Post your tour request and let experienced guides apply to you!</p>
              <button 
                onClick={() => window.location.href = '/tourist/postRequest'}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Post Tour Request
              </button>
            </div>
          </div>

          <section className="mb-6 lg:mb-8">
            <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-4">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="bg-white rounded-lg overflow-hidden shadow-md p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-gray-800 mb-2 text-center">1. Post Your Request</h3>
                <p className="text-gray-600 text-sm text-center">Share your tour requirements, budget, and preferences</p>
              </div>
              <div className="bg-white rounded-lg overflow-hidden shadow-md p-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-gray-800 mb-2 text-center">2. Receive Applications</h3>
                <p className="text-gray-600 text-sm text-center">Qualified guides will apply with their proposals</p>
              </div>
              <div className="bg-white rounded-lg overflow-hidden shadow-md p-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-gray-800 mb-2 text-center">3. Select the Best</h3>
                <p className="text-gray-600 text-sm text-center">Review profiles and choose your perfect guide</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-4">My Active Requests</h2>
            <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base lg:text-lg text-gray-800 mb-1 truncate">{upcomingBooking.title}</h3>
                  <p className="text-gray-600 text-sm mb-1">With {upcomingBooking.guide}</p>
                  <p className="text-blue-600 text-sm font-medium">{upcomingBooking.date}</p>
                </div>
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <p className="text-gray-500 text-sm text-center mt-4">No other active trips right now.</p>
          </section>
        </div>
      </main>

      <aside className="hidden xl:block w-80 bg-white border-l border-gray-200 p-6">
        <h2 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ongoing Booking
        </h2>
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 mb-1">{ongoingBooking.title}</h3>
              <p className="text-gray-600 text-sm mb-2">With {ongoingBooking.guide}</p>
              <span className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                {ongoingBooking.status}
              </span>
            </div>
          </div>
          <div className="space-y-2 mt-6">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="font-medium">Call Guide</span>
            </button>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">View Itinerary</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

