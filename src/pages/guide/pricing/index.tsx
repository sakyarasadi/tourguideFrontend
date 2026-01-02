import { useState, useEffect } from 'react';
import GuideSideNav from '../../components/SideNavguide';
import GuideTopNav from '../../components/TopNavGuide';
import Swal from 'sweetalert2';

export default function GuidePricing() {
  const [editingRates, setEditingRates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState({
    hourlyRate: 0,
    dailyRate: 0,
    extraPersonFee: 0,
    packages: [] as any[],
    seasonalAdjustments: [] as any[],
  });
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
    // Get uid from localStorage
    const uid = localStorage.getItem('userUid');
    setUserUid(uid);
  }, []);

  useEffect(() => {
    const fetchPricing = async () => {
      if (!userUid) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/guide/pricing?guideId=${userUid}`);
        if (!response.ok) throw new Error('Failed to fetch pricing');
        const data = await response.json();
        
        if (data.success && data.data) {
          setPricing({
            hourlyRate: data.data.hourlyRate || 0,
            dailyRate: data.data.dailyRate || 0,
            extraPersonFee: data.data.extraPersonFee || 0,
            packages: data.data.packages || [],
            seasonalAdjustments: data.data.seasonalAdjustments || [],
          });
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [userUid]);

  const handleSaveRates = async () => {
    if (!userUid) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/guide/pricing?guideId=${userUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pricing),
      });

      if (!response.ok) throw new Error('Failed to save pricing');

      await Swal.fire({
        title: 'Success!',
        text: 'Pricing updated successfully',
        icon: 'success',
        confirmButtonColor: '#3085d6',
      });

      setEditingRates(false);
    } catch (error) {
      console.error('Error saving pricing:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to save pricing. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setSaving(false);
    }
  };

  const baseRates = [
    { name: 'Hourly Rate', rate: `$${pricing.hourlyRate}`, unit: '/ hour', key: 'hourlyRate' },
    { name: 'Daily Rate (8 hours)', rate: `$${pricing.dailyRate}`, unit: '/ day', key: 'dailyRate' },
    { name: 'Extra Person Fee', rate: `$${pricing.extraPersonFee}`, unit: '/ person', key: 'extraPersonFee' }
  ];

  const customPackages = pricing.packages.map((pkg, index) => ({
    id: pkg.id || index + 1,
    name: pkg.name,
    duration: pkg.duration,
    price: `$${pkg.price}`,
    status: pkg.status === 'active' ? 'Active' : 'Paused',
    statusColor: pkg.status === 'active' ? 'green' : 'orange'
  }));

  const seasonalAdjustments = pricing.seasonalAdjustments.map((adj, index) => ({
    id: adj.id || index + 1,
    name: adj.name,
    adjustment: adj.adjustment
  }));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <GuideSideNav />

      <div className="flex-1 flex flex-col lg:ml-64">
        <GuideTopNav
          title="Pricing & Services"
          subtitle="Manage your rates and package deals."
        />

        <main className="flex-1 p-4 lg:p-6 pt-20 lg:pt-24">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Base Rates</h3>
                  <button
                    onClick={editingRates ? handleSaveRates : () => setEditingRates(true)}
                    disabled={saving}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingRates ? 'Save Changes' : 'Edit Rates'}
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {baseRates.map((rate, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{rate.name}</p>
                          {editingRates ? (
                            <input
                              type="number"
                              min="0"
                              value={pricing[rate.key as keyof typeof pricing] as number}
                              onChange={(e) => setPricing({
                                ...pricing,
                                [rate.key]: parseFloat(e.target.value) || 0,
                              })}
                              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          ) : (
                            <div className="flex items-baseline mt-2">
                              <span className="text-2xl font-bold text-gray-900">{rate.rate}</span>
                              <span className="text-sm text-gray-500 ml-1">{rate.unit}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Custom Package Deals</h3>
                  <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
                    Create Package
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customPackages.map((pkg) => (
                      <tr key={pkg.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pkg.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pkg.duration}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pkg.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${pkg.statusColor === 'green'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                            }`}>
                            {pkg.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button className={`${pkg.status === 'Active'
                              ? 'text-orange-600 hover:text-orange-900'
                              : 'text-green-600 hover:text-green-900'
                            }`}>
                            {pkg.status === 'Active' ? 'Pause' : 'Resume'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Seasonal Adjustments</h3>
                  <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
                    Add New
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {seasonalAdjustments.map((adjustment) => (
                    <div key={adjustment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{adjustment.name}</p>
                        <p className="text-sm text-gray-600">{adjustment.adjustment}</p>
                      </div>
                      <button className="text-red-600 hover:text-red-900 p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
