import React, { useState, useEffect } from 'react';
import SideNav from '../../components/SideNav';
import TopNav from '../../components/TopNav';
import { getBookings } from '../../../lib/api/tourist';
import Swal from 'sweetalert2';

type BookingDetails = {
  id: string;
  requestId: string;
  touristId: string;
  touristName?: string;
  guideId: string;
  guideName?: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'upcoming' | 'completed' | 'cancelled';
  agreedPrice?: number;
  numberOfPeople?: number;
  budget?: number;
  tourType?: string;
  description?: string;
  requirements?: string;
  languages?: string[];
  createdAt?: any;
  updatedAt?: any;
};

export default function MyBookings() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [viewingBooking, setViewingBooking] = useState<BookingDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    // Get uid from localStorage
    const uid = localStorage.getItem('userUid');
    setUserUid(uid);
  }, []);

  useEffect(() => {
    if (!userUid) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const loadBookings = async () => {
      setLoading(true);
      try {
        // For upcoming tab, fetch all bookings (pending and upcoming) and filter client-side
        // This ensures bookings show up as soon as they're created (pending) and when guide accepts (upcoming)
        const response = await getBookings({
          touristId: userUid,
          // Don't filter by status on server for upcoming tab - we'll filter client-side
          status: activeTab === 'past' ? 'completed' : undefined,
          sortBy: 'startDate',
          sortOrder: 'asc',
        });
        
        // Filter client-side based on active tab
        let filteredBookings = response.data;
        if (activeTab === 'upcoming') {
          // Show both pending and upcoming bookings
          filteredBookings = response.data.filter(
            (booking: any) => booking.status === 'upcoming' || booking.status === 'pending'
          );
        } else if (activeTab === 'ongoing') {
          // Show upcoming bookings (tours that are confirmed and happening)
          filteredBookings = response.data.filter(
            (booking: any) => booking.status === 'upcoming'
          );
        } else if (activeTab === 'past') {
          // Show completed bookings
          filteredBookings = response.data.filter(
            (booking: any) => booking.status === 'completed'
          );
        }
        
        setBookings(filteredBookings);
      } catch (error: any) {
        console.error('Failed to load bookings', error);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [userUid, activeTab]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'upcoming':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700';
      case 'Completed':
        return 'bg-gray-100 text-gray-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const canCancelBooking = (startDate: string): boolean => {
    const start = new Date(startDate);
    const now = new Date();
    const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilStart >= 24;
  };

  const handleViewDetails = async (booking: any) => {
    if (!userUid) return;
    
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/tourist/bookings/${booking.id}?touristId=${userUid}`);
      if (!response.ok) {
        throw new Error('Failed to load booking details');
      }
      const data = await response.json();
      if (data.success) {
        setViewingBooking(data.data);
      } else {
        throw new Error(data.message || 'Failed to load booking details');
      }
    } catch (error: any) {
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to load booking details',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCancelBooking = async (booking: any) => {
    if (!userUid) return;

    // Check if cancellation is allowed (24 hours before start)
    if (!canCancelBooking(booking.startDate)) {
      await Swal.fire({
        title: 'Cannot Cancel',
        text: 'Bookings can only be cancelled at least 24 hours before the start date.',
        icon: 'warning',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Cancel Booking?',
      text: 'Are you sure you want to cancel this booking? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Cancel Booking',
      cancelButtonText: 'No, Keep Booking',
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/tourist/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
          touristId: userUid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel booking');
      }

      const data = await response.json();
      if (data.success) {
        await Swal.fire({
          title: 'Booking Cancelled',
          text: 'Your booking has been cancelled successfully.',
          icon: 'success',
          confirmButtonColor: '#3085d6',
          timer: 2000,
          timerProgressBar: true,
        });

        // Refresh bookings
        const refreshResponse = await getBookings({
          touristId: userUid,
          status: activeTab === 'past' ? 'completed' : undefined,
          sortBy: 'startDate',
          sortOrder: 'asc',
        });
        
        let filteredBookings = refreshResponse.data;
        if (activeTab === 'upcoming') {
          filteredBookings = refreshResponse.data.filter(
            (b: any) => b.status === 'upcoming' || b.status === 'pending'
          );
        } else if (activeTab === 'ongoing') {
          filteredBookings = refreshResponse.data.filter(
            (b: any) => b.status === 'upcoming'
          );
        } else if (activeTab === 'past') {
          filteredBookings = refreshResponse.data.filter(
            (b: any) => b.status === 'completed'
          );
        }
        
        setBookings(filteredBookings);
      }
    } catch (error: any) {
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to cancel booking',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SideNav
        activeMenu="bookings"
        userType="tourist"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto lg:ml-0">
        <TopNav
          title="My Bookings"
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="p-4 lg:p-8">
          <div className="flex gap-2 lg:gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 lg:px-6 py-3 font-medium text-sm lg:text-base transition-colors relative whitespace-nowrap ${activeTab === 'upcoming'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Upcoming
              {activeTab === 'upcoming' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('ongoing')}
              className={`px-4 lg:px-6 py-3 font-medium text-sm lg:text-base transition-colors relative whitespace-nowrap ${activeTab === 'ongoing'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Ongoing
              {activeTab === 'ongoing' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 lg:px-6 py-3 font-medium text-sm lg:text-base transition-colors relative whitespace-nowrap ${activeTab === 'past'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Past
              {activeTab === 'past' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading bookings...</div>
          ) : (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 text-lg">No bookings found</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-md p-4 lg:p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex gap-3 lg:gap-4 flex-1">
                      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 lg:w-10 lg:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <h3 className="font-bold text-base lg:text-lg text-gray-800 flex-1">{booking.title}</h3>
                          <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(getStatusLabel(booking.status))}`}>
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">Guide: {booking.guideName || 'N/A'}</p>
                        <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs lg:text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(booking.startDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatTime(booking.startDate)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex lg:flex-col items-center lg:items-end gap-3 lg:gap-0 lg:text-right lg:ml-4">
                      <p className="text-xl lg:text-2xl font-bold text-blue-600 lg:mb-4">${booking.agreedPrice || booking.budget || 0}</p>
                      <div className="flex flex-row lg:flex-col gap-2 flex-1 lg:flex-none w-full lg:w-auto">
                        {activeTab === 'ongoing' && (
                          <>
                            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                              Call Guide
                            </button>
                            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                              View Details
                            </button>
                          </>
                        )}
                        {activeTab === 'upcoming' && (
                          <>
                            <button
                              onClick={() => handleViewDetails(booking)}
                              disabled={isLoadingDetails}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoadingDetails ? 'Loading...' : 'View Details'}
                            </button>
                            <button
                              onClick={() => handleCancelBooking(booking)}
                              disabled={isCancelling || !canCancelBooking(booking.startDate) || booking.status === 'cancelled'}
                              className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              title={!canCancelBooking(booking.startDate) ? 'Can only cancel at least 24 hours before start date' : ''}
                            >
                              {isCancelling ? 'Cancelling...' : 'Cancel'}
                            </button>
                          </>
                        )}
                        {activeTab === 'past' && (
                          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                            Book Again
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          )}

          {/* View Booking Details Modal */}
          {viewingBooking && (
            <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">Booking Details</h2>
                  <button
                    onClick={() => setViewingBooking(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{viewingBooking.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {viewingBooking.tourType || 'Tour'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        viewingBooking.status === 'completed' ? 'bg-green-100 text-green-700' :
                        viewingBooking.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                        viewingBooking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {getStatusLabel(viewingBooking.status)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                      <p className="text-gray-900">{viewingBooking.destination}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tour Dates</label>
                      <p className="text-gray-900">{viewingBooking.startDate} to {viewingBooking.endDate}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Guide Name</label>
                      <p className="text-gray-900">{viewingBooking.guideName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of People</label>
                      <p className="text-gray-900">{viewingBooking.numberOfPeople || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Price</label>
                      <p className="text-gray-900 font-semibold">${viewingBooking.agreedPrice || viewingBooking.budget || 'N/A'}</p>
                    </div>
                    {viewingBooking.budget && viewingBooking.agreedPrice && viewingBooking.budget !== viewingBooking.agreedPrice && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Original Budget</label>
                        <p className="text-gray-900">${viewingBooking.budget}</p>
                      </div>
                    )}
                  </div>

                  {viewingBooking.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tour Description</label>
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{viewingBooking.description}</p>
                    </div>
                  )}

                  {viewingBooking.requirements && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{viewingBooking.requirements}</p>
                    </div>
                  )}

                  {viewingBooking.languages && viewingBooking.languages.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Languages</label>
                      <div className="flex flex-wrap gap-2">
                        {viewingBooking.languages.map((lang: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

