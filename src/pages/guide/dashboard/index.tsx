import { useState, useEffect } from 'react';
import GuideSideNav from '../../components/SideNavguide';
import GuideTopNav from '../../components/TopNavGuide';

interface DashboardStats {
  totalBookings: number;
  earnings: number;
  averageRating: number;
  completedTours: number;
  pendingBookings: number;
  upcomingBookings: number;
  totalApplications: number;
  acceptedApplications: number;
}

export default function GuideDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
    // Get uid from localStorage
    const uid = localStorage.getItem('userUid');
    setUserUid(uid);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userUid) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/guide/dashboard?guideId=${userUid}`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userUid]);

  const metrics = stats ? [
    {
      title: 'Total Bookings',
      value: stats.totalBookings.toString(),
      icon: '📋',
      change: '+15%',
      changeType: 'positive' as const
    },
    {
      title: 'Earnings',
      value: `$${stats.earnings.toLocaleString()}`,
      icon: '💰',
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      title: 'Average Rating',
      value: stats.averageRating.toFixed(1),
      icon: '⭐',
      change: '+0.2',
      changeType: 'positive' as const
    },
    {
      title: 'Completed Tours',
      value: stats.completedTours.toString(),
      icon: '🏁',
      change: '+8%',
      changeType: 'positive' as const
    }
  ] : [
    {
      title: 'Total Bookings',
      value: '0',
      icon: '📋',
      change: '+0%',
      changeType: 'positive' as const
    },
    {
      title: 'Earnings',
      value: '$0',
      icon: '💰',
      change: '+0%',
      changeType: 'positive' as const
    },
    {
      title: 'Average Rating',
      value: '0.0',
      icon: '⭐',
      change: '+0',
      changeType: 'positive' as const
    },
    {
      title: 'Completed Tours',
      value: '0',
      icon: '🏁',
      change: '+0%',
      changeType: 'positive' as const
    }
  ];

  const bookingTrends = [
    { month: 'Jan', bookings: 8 },
    { month: 'Feb', bookings: 12 },
    { month: 'Mar', bookings: 15 },
    { month: 'Apr', bookings: 18 },
    { month: 'May', bookings: 22 },
    { month: 'Jun', bookings: 25 }
  ];

  const popularServices = [
    'Walking Tour',
    'Museum Visit',
    'Food Tour',
    'Historical Sites'
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <GuideSideNav />

      <div className="flex-1 flex flex-col lg:ml-64">
        <GuideTopNav
          title="Analytics Dashboard"
          subtitle="Welcome back, Sarah. Here's your performance overview."
        />

        <main className="flex-1 p-4 lg:p-6 pt-20 lg:pt-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            {metrics.map((metric, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
                  </div>
                  <div className="text-2xl">{metric.icon}</div>
                </div>
                <div className="mt-4">
                  <span className={`text-sm font-medium ${metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {metric.change} vs previous 30 days
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Booking Trends</h3>
                  <p className="text-sm text-gray-600">Last 30 Days</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-600">+15%</span>
                  <p className="text-sm text-green-600">+15% vs previous 30 days</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-end space-x-2 h-32">
                  {bookingTrends.map((trend, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-blue-200 rounded-t"
                        style={{ height: `${(trend.bookings / 25) * 100}%` }}
                      ></div>
                      <span className="text-xs text-gray-600 mt-2">{trend.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Popular Services</h3>
                  <p className="text-sm text-gray-600">Last 30 Days</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-600">+8%</span>
                  <p className="text-sm text-green-600">+8% vs previous 30 days</p>
                </div>
              </div>

              <div className="space-y-3">
                {popularServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{service}</span>
                    <span className="text-sm text-gray-600">Popular</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
