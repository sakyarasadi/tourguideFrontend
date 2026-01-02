import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminSideNav from '@/pages/components/adminSideNav';
import AdminTopNav from '@/pages/components/AdminTopNav';

interface EmergencyAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive';
  targetAudience: 'all' | 'tourists' | 'guides';
  createdAt: any;
  expiresAt?: any;
}

export default function EmergencyAlerts() {
  const router = useRouter();
  const [alerts] = useState<EmergencyAlert[]>([
    {
      id: '1',
      title: 'Weather Warning',
      message: 'Heavy rain expected in coastal areas. Please avoid beach activities and stay indoors.',
      severity: 'high',
      status: 'active',
      targetAudience: 'all',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 
    },
    {
      id: '2',
      title: 'Traffic Advisory',
      message: 'Major road closure on Highway 101 due to maintenance work. Expect delays.',
      severity: 'medium',
      status: 'active',
      targetAudience: 'tourists',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: '3',
      title: 'Security Alert',
      message: 'Increased security presence in downtown area. Please report any suspicious activity.',
      severity: 'critical',
      status: 'active',
      targetAudience: 'all',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      id: '4',
      title: 'Festival Information',
      message: 'Annual cultural festival starting this weekend. Special discounts for registered guides.',
      severity: 'low',
      status: 'active',
      targetAudience: 'guides',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: '5',
      title: 'System Maintenance',
      message: 'Scheduled maintenance on booking system tonight from 11 PM to 1 AM. Services will be temporarily unavailable.',
      severity: 'medium',
      status: 'inactive',
      targetAudience: 'all',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ]);
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    targetAudience: 'all' as 'all' | 'tourists' | 'guides',
    expiresAt: '',
  });

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/admin/login');
      return;
    }
  }, [router]);

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
    ) : (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Alert saved! (This is a demo)');
    setShowCreateModal(false);
    setFormData({
      title: '',
      message: '',
      severity: 'medium',
      targetAudience: 'all',
      expiresAt: '',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex">
      <AdminSideNav activeMenu="emergency-alerts" isOpen={isSideNavOpen} onClose={() => setIsSideNavOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-0">
        <AdminTopNav 
          title="Emergency Alerts" 
          onMenuClick={() => setIsSideNavOpen(!isSideNavOpen)}
        />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Emergency Alerts</h2>
                <p className="text-gray-600">Manage emergency notifications for users</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alerts.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No emergency alerts found
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500 hover:shadow-xl transition-all cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{alert.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-3">{alert.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        {getSeverityBadge(alert.severity)}
                        {getStatusBadge(alert.status)}
                      </div>
                      <span className="text-xs text-gray-500">
                        {alert.targetAudience.charAt(0).toUpperCase() + alert.targetAudience.slice(1)}
                      </span>
                    </div>
                    {alert.createdAt && (
                      <p className="text-xs text-gray-400 mt-2">
                        Created: {alert.createdAt.seconds 
                          ? new Date(alert.createdAt.seconds * 1000).toLocaleDateString()
                          : new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {showCreateModal && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-xl rounded-xl bg-white">
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Create Emergency Alert</h3>
                      <button
                        onClick={() => {
                          setShowCreateModal(false);
                          setFormData({
                            title: '',
                            message: '',
                            severity: 'medium',
                            targetAudience: 'all',
                            expiresAt: '',
                          });
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                          placeholder="Enter alert title"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                        <textarea
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                          placeholder="Enter alert message"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                          <select
                            value={formData.severity}
                            onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                          <select
                            value={formData.targetAudience}
                            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                          >
                            <option value="all">All Users</option>
                            <option value="tourists">Tourists Only</option>
                            <option value="guides">Guides Only</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expires At (Optional)</label>
                        <input
                          type="datetime-local"
                          value={formData.expiresAt}
                          onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-pink-600 shadow-md transition-all"
                        >
                          Create Alert
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateModal(false);
                            setFormData({
                              title: '',
                              message: '',
                              severity: 'medium',
                              targetAudience: 'all',
                              expiresAt: '',
                            });
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

