import React, { useEffect, useMemo, useState } from 'react';
import GuideSideNav from '../../components/SideNavguide';
import GuideTopNav from '../../components/TopNavGuide';
import Swal from 'sweetalert2';

type Booking = {
  id: string;
  requestId: string;
  touristName?: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'upcoming' | 'completed' | 'cancelled';
  agreedPrice?: number;
  numberOfPeople?: number;
};

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number') {
    return '—';
  }
  return `$${value.toFixed(0)}`;
};

export default function GuideBookings() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
    // Get uid from localStorage
    const uid = localStorage.getItem('userUid');
    setUserUid(uid);
  }, []);

  useEffect(() => {
    if (!userUid) {
      setBookings([]);
      setBookingsLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        setBookingsLoading(true);
        const response = await fetch(`/api/guide/bookings?guideId=${userUid}&limit=200`);
        if (!response.ok) throw new Error('Failed to fetch bookings');
        const data = await response.json();
        if (data.success) {
          const nextBookings: Booking[] = data.data.map((b: any) => ({
            id: b.id,
            requestId: b.requestId,
            touristName: b.touristName,
            title: b.title,
            destination: b.destination,
            startDate: b.startDate,
            endDate: b.endDate,
            status: b.status ?? 'pending',
            agreedPrice: b.agreedPrice,
            numberOfPeople: b.numberOfPeople,
          }));
          setBookings(nextBookings);
        }
      } catch (error) {
        console.error('Failed to load bookings', error);
        setBookings([]);
      } finally {
        setBookingsLoading(false);
      }
    };

    fetchBookings();
  }, [userUid]);

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending'),
    [bookings],
  );

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'upcoming'),
    [bookings],
  );

  const pastBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'completed' || booking.status === 'cancelled'),
    [bookings],
  );

  const calendarDays = useMemo(() => {
    const activeDate = new Date(selectedDate);
    const year = activeDate.getFullYear();
    const month = activeDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const toIso = (day: number) => {
      const date = new Date(Date.UTC(year, month, day));
      return date.toISOString().slice(0, 10);
    };

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const isoDate = toIso(day);
      const hasBooking = upcomingBookings.some((booking) => booking.startDate === isoDate);
      return {
        date: day,
        isoDate,
        hasBooking,
        selected: isoDate === selectedDate,
      };
    });
  }, [selectedDate, upcomingBookings]);

  const handleBookingDecision = async (bookingId: string, nextStatus: 'upcoming' | 'cancelled') => {
    const result = await Swal.fire({
      title: nextStatus === 'upcoming' ? 'Accept Booking?' : 'Decline Booking?',
      text: nextStatus === 'upcoming' 
        ? 'Are you sure you want to accept this booking?'
        : 'Are you sure you want to decline this booking?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: nextStatus === 'upcoming' ? '#3085d6' : '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: nextStatus === 'upcoming' ? 'Yes, Accept' : 'Yes, Decline',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
      return;
    }

    setDecisionId(bookingId);
    try {
      const response = await fetch(`/api/guide/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) throw new Error('Failed to update booking');

      await Swal.fire({
        title: nextStatus === 'upcoming' ? 'Booking Accepted!' : 'Booking Declined',
        text: nextStatus === 'upcoming' 
          ? 'The booking has been accepted successfully.'
          : 'The booking has been declined.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        timer: 2000,
        timerProgressBar: true,
      });

      // Refresh bookings
      if (userUid) {
        const refreshResponse = await fetch(`/api/guide/bookings?guideId=${userUid}&limit=200`);
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.success) {
            const nextBookings: Booking[] = refreshData.data.map((b: any) => ({
              id: b.id,
              requestId: b.requestId,
              touristName: b.touristName,
              title: b.title,
              destination: b.destination,
              startDate: b.startDate,
              endDate: b.endDate,
              status: b.status ?? 'pending',
              agreedPrice: b.agreedPrice,
              numberOfPeople: b.numberOfPeople,
            }));
            setBookings(nextBookings);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update booking status', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to update booking. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setDecisionId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <GuideSideNav />

      <div className="flex-1 flex flex-col lg:ml-64">
        <GuideTopNav
          title="Accepted Tours & Bookings"
          subtitle="Manage your accepted tours and availability."
        />

        <main className="flex-1 p-4 lg:p-6 pt-20 lg:pt-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {new Date(selectedDate).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex space-x-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg" disabled>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg" disabled>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => (
                    <button
                      key={day.isoDate}
                      onClick={() => setSelectedDate(day.isoDate)}
                      className={`p-2 text-sm rounded-lg transition-colors ${day.selected
                          ? 'bg-blue-500 text-white'
                          : day.hasBooking
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'hover:bg-gray-100'
                        }`}
                    >
                      <div className="flex flex-col items-center">
                        <span>{day.date}</span>
                        {day.hasBooking && !day.selected && (
                          <div className="w-1 h-1 bg-green-500 rounded-full mt-1"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Pending Booking Requests</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tourist</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tour Dates</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingBookings.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            {bookingsLoading ? 'Loading...' : 'No pending booking requests'}
                          </td>
                        </tr>
                      ) : (
                        pendingBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {booking.touristName ?? 'Tourist'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.startDate} - {booking.endDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.title} • {booking.destination}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleBookingDecision(booking.id, 'upcoming')}
                                disabled={decisionId === booking.id}
                                className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 disabled:opacity-50"
                              >
                                {decisionId === booking.id ? 'Accepting...' : 'Accept'}
                              </button>
                              <button
                                onClick={() => handleBookingDecision(booking.id, 'cancelled')}
                                disabled={decisionId === booking.id}
                                className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 disabled:opacity-50"
                              >
                                {decisionId === booking.id ? 'Declining...' : 'Decline'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tourist</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tour Dates</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {upcomingBookings.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            {bookingsLoading ? 'Loading...' : 'No upcoming bookings yet'}
                          </td>
                        </tr>
                      ) : (
                        upcomingBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {booking.touristName ?? 'Tourist'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.startDate} - {booking.endDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.title} • {booking.destination}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              {formatCurrency(booking.agreedPrice)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Booking History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tourist</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pastBookings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                          {bookingsLoading ? 'Loading...' : 'No completed bookings yet'}
                        </td>
                      </tr>
                    ) : (
                      pastBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {booking.touristName ?? 'Tourist'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.startDate} - {booking.endDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {booking.status === 'completed' ? 'Completed' : 'Cancelled'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(booking.agreedPrice)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

