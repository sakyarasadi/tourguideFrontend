import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminSideNav from '@/pages/components/adminSideNav';
import AdminTopNav from '@/pages/components/AdminTopNav';

interface GuideVerification {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  nicDocument?: string;
  touristDeptIdDocument?: string;
  policeReportDocument?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export default function GuideVerification() {
  const router = useRouter();
  const [verifications, setVerifications] = useState<GuideVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<GuideVerification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/admin/login');
      return;
    }
  }, [router]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchVerifications = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/guide-verifications?${params}`);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API endpoint not found or returned invalid response');
      }

      const data = await response.json();

      if (data.success) {
        setVerifications(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } else {
        setError(data.message || 'Failed to fetch verifications');
      }
    } catch (err: any) {
      console.error('Error fetching verifications:', err);
      setError(err.message || 'An error occurred. Please check if the API endpoint exists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [page, search, statusFilter, sortBy, sortOrder]);

  const handleApprove = async (verification: GuideVerification) => {
    if (!confirm(`Are you sure you want to approve ${verification.firstName} ${verification.lastName}?`)) {
      return;
    }

    setProcessing(verification.id);
    try {
      const response = await fetch(`/api/admin/guide-verifications/${verification.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewedBy: 'admin', 
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API endpoint not found');
      }

      const data = await response.json();

      if (data.success) {
        alert('Guide approved successfully!');
        fetchVerifications();
        if (selectedVerification?.id === verification.id) {
          setSelectedVerification(null);
        }
      } else {
        alert(data.message || 'Failed to approve guide');
      }
    } catch (err: any) {
      console.error('Error approving guide:', err);
      alert(err.message || 'An error occurred. Please check if the API endpoint exists.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(selectedVerification.id);
    try {
      const response = await fetch(`/api/admin/guide-verifications/${selectedVerification.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason,
          reviewedBy: 'admin',
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API endpoint not found');
      }

      const data = await response.json();

      if (data.success) {
        alert('Guide rejected successfully!');
        setShowRejectModal(false);
        setRejectionReason('');
        fetchVerifications();
        setSelectedVerification(null);
      } else {
        alert(data.message || 'Failed to reject guide');
      }
    } catch (err: any) {
      console.error('Error rejecting guide:', err);
      alert(err.message || 'An error occurred. Please check if the API endpoint exists.');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex">
      <AdminSideNav activeMenu="guide-verification" isOpen={isSideNavOpen} onClose={() => setIsSideNavOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-0">
        <AdminTopNav 
          title="Guide Verification" 
          onMenuClick={() => setIsSideNavOpen(!isSideNavOpen)}
          showSearch={true}
          searchPlaceholder="Search by name, email, phone..."
          onSearch={(query) => {
            setSearch(query);
                  setPage(1);
                }}
              />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Guide Verification</h2>
              <p className="text-gray-600">Review and approve guide applications</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option value="createdAt">Created Date</option>
                <option value="firstName">First Name</option>
                <option value="lastName">Last Name</option>
                <option value="email">Email</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : verifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No verifications found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {verifications.map((verification) => (
                      <tr key={verification.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {verification.firstName} {verification.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{verification.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{verification.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(verification.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {verification.nicDocument && (
                              <a
                                href={verification.nicDocument}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                NIC
                              </a>
                            )}
                            {verification.touristDeptIdDocument && (
                              <a
                                href={verification.touristDeptIdDocument}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Tourist Dept ID
                              </a>
                            )}
                            {verification.policeReportDocument && (
                              <a
                                href={verification.policeReportDocument}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Police Report
                              </a>
                            )}
                            {!verification.nicDocument && !verification.touristDeptIdDocument && !verification.policeReportDocument && (
                              <span className="text-gray-400 text-sm">No documents</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                console.log('Selected verification:', verification);
                                console.log('NIC Document:', verification.nicDocument);
                                console.log('Tourist Dept ID:', verification.touristDeptIdDocument);
                                console.log('Police Report:', verification.policeReportDocument);
                                setSelectedVerification(verification);
                                setLoadingImages({ nic: true, tourist: true, police: true });
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                            {verification.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(verification)}
                                  disabled={processing === verification.id}
                                  className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                                >
                                  {processing === verification.id ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedVerification(verification);
                                    setShowRejectModal(true);
                                  }}
                                  disabled={processing === verification.id}
                                  className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                      <span className="font-medium">{total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {selectedVerification && !showRejectModal && (
              <div className="fixed inset-0 bg-opacity-75 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl flex justify-between items-center z-10">
                    <h3 className="text-xl font-bold text-white">
                    Guide Verification Details
                  </h3>
                  <button
                    onClick={() => setSelectedVerification(null)}
                      className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
                        <p className="text-base font-medium text-gray-900">
                      {selectedVerification.firstName} {selectedVerification.lastName}
                    </p>
                  </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                        <p className="text-base font-medium text-gray-900">{selectedVerification.email}</p>
                  </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
                        <p className="text-base font-medium text-gray-900">{selectedVerification.phone}</p>
                  </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedVerification.status)}</div>
                      </div>
                  </div>

                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Verification Documents
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedVerification.nicDocument ? (
                          <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                            <div className="mb-3">
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">NIC Document</h5>
                              <div className="relative w-full h-48 bg-white rounded-lg overflow-hidden group border-2 border-gray-300 flex items-center justify-center">
                                {loadingImages['nic'] && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                                  </div>
                                )}
                                <img
                                  src={selectedVerification.nicDocument}
                                  alt="NIC Document"
                                  className={`max-w-full max-h-full w-auto h-auto object-contain ${loadingImages['nic'] ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                                  style={{ maxHeight: '192px' }}
                                  onLoad={() => {
                                    console.log('NIC Document loaded:', selectedVerification.nicDocument);
                                    setLoadingImages(prev => ({ ...prev, nic: false }));
                                  }}
                                  onLoadStart={() => {
                                    console.log('Loading NIC Document:', selectedVerification.nicDocument);
                                    setLoadingImages(prev => ({ ...prev, nic: true }));
                                  }}
                                  onError={(e) => {
                                    console.error('Error loading NIC Document:', selectedVerification.nicDocument, e);
                                    setLoadingImages(prev => ({ ...prev, nic: false }));
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    if (!target.parentElement?.querySelector('.error-message')) {
                                      const errorDiv = document.createElement('div');
                                      errorDiv.className = 'error-message absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm p-4 text-center';
                                      errorDiv.textContent = 'Image failed to load. Click "Open in New Tab" to view.';
                                      target.parentElement?.appendChild(errorDiv);
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center pointer-events-none z-10">
                                  <a
                                    href={selectedVerification.nicDocument}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="opacity-0 group-hover:opacity-100 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium text-sm transition-opacity pointer-events-auto hover:bg-blue-50 shadow-md"
                                  >
                                    View Full Size
                                  </a>
                                </div>
                              </div>
                            </div>
                          <a
                            href={selectedVerification.nicDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2 justify-center font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Open in New Tab
                            </a>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm text-gray-500">NIC Document not uploaded</p>
                          </div>
                        )}

                        {selectedVerification.touristDeptIdDocument ? (
                          <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                            <div className="mb-3">
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">Tourist Department ID</h5>
                              <div className="relative w-full h-48 bg-white rounded-lg overflow-hidden group border-2 border-gray-300 flex items-center justify-center">
                                {loadingImages['tourist'] && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                                  </div>
                                )}
                                <img
                                  src={selectedVerification.touristDeptIdDocument}
                                  alt="Tourist Department ID"
                                  className={`max-w-full max-h-full w-auto h-auto object-contain ${loadingImages['tourist'] ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                                  style={{ maxHeight: '192px' }}
                                  onLoad={() => {
                                    console.log('Tourist Dept ID loaded:', selectedVerification.touristDeptIdDocument);
                                    setLoadingImages(prev => ({ ...prev, tourist: false }));
                                  }}
                                  onLoadStart={() => {
                                    console.log('Loading Tourist Dept ID:', selectedVerification.touristDeptIdDocument);
                                    setLoadingImages(prev => ({ ...prev, tourist: true }));
                                  }}
                                  onError={(e) => {
                                    console.error('Error loading Tourist Dept ID:', selectedVerification.touristDeptIdDocument, e);
                                    setLoadingImages(prev => ({ ...prev, tourist: false }));
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    if (!target.parentElement?.querySelector('.error-message')) {
                                      const errorDiv = document.createElement('div');
                                      errorDiv.className = 'error-message absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm p-4 text-center';
                                      errorDiv.textContent = 'Image failed to load. Click "Open in New Tab" to view.';
                                      target.parentElement?.appendChild(errorDiv);
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center pointer-events-none z-10">
                                  <a
                                    href={selectedVerification.touristDeptIdDocument}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="opacity-0 group-hover:opacity-100 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium text-sm transition-opacity pointer-events-auto hover:bg-blue-50 shadow-md"
                                  >
                                    View Full Size
                                  </a>
                                </div>
                              </div>
                            </div>
                          <a
                            href={selectedVerification.touristDeptIdDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2 justify-center font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Open in New Tab
                            </a>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm text-gray-500">Tourist Department ID not uploaded</p>
                          </div>
                        )}

                        {selectedVerification.policeReportDocument ? (
                          <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                            <div className="mb-3">
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">Police Report</h5>
                              <div className="relative w-full h-48 bg-white rounded-lg overflow-hidden group border-2 border-gray-300 flex items-center justify-center">
                                {loadingImages['police'] && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                                  </div>
                                )}
                                <img
                                  src={selectedVerification.policeReportDocument}
                                  alt="Police Report"
                                  className={`max-w-full max-h-full w-auto h-auto object-contain ${loadingImages['police'] ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                                  style={{ maxHeight: '192px' }}
                                  onLoad={() => {
                                    console.log('Police Report loaded:', selectedVerification.policeReportDocument);
                                    setLoadingImages(prev => ({ ...prev, police: false }));
                                  }}
                                  onLoadStart={() => {
                                    console.log('Loading Police Report:', selectedVerification.policeReportDocument);
                                    setLoadingImages(prev => ({ ...prev, police: true }));
                                  }}
                                  onError={(e) => {
                                    console.error('Error loading Police Report:', selectedVerification.policeReportDocument, e);
                                    setLoadingImages(prev => ({ ...prev, police: false }));
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    if (!target.parentElement?.querySelector('.error-message')) {
                                      const errorDiv = document.createElement('div');
                                      errorDiv.className = 'error-message absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm p-4 text-center';
                                      errorDiv.textContent = 'Image failed to load. Click "Open in New Tab" to view.';
                                      target.parentElement?.appendChild(errorDiv);
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center pointer-events-none z-10">
                                  <a
                                    href={selectedVerification.policeReportDocument}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="opacity-0 group-hover:opacity-100 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium text-sm transition-opacity pointer-events-auto hover:bg-blue-50 shadow-md"
                                  >
                                    View Full Size
                                  </a>
                                </div>
                              </div>
                            </div>
                          <a
                            href={selectedVerification.policeReportDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2 justify-center font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Open in New Tab
                            </a>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm text-gray-500">Police Report not uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedVerification.rejectionReason && (
                      <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <label className="block text-sm font-semibold text-red-800 mb-2">Rejection Reason</label>
                        <p className="text-sm text-red-900">{selectedVerification.rejectionReason}</p>
                    </div>
                  )}

                  {selectedVerification.status === 'pending' && (
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleApprove(selectedVerification)}
                        disabled={processing === selectedVerification.id}
                          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 disabled:bg-gray-400 shadow-md transition-all font-medium"
                      >
                          {processing === selectedVerification.id ? 'Processing...' : 'Approve Guide'}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={processing === selectedVerification.id}
                          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-red-700 disabled:bg-gray-400 shadow-md transition-all font-medium"
                      >
                          Reject Application
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {showRejectModal && selectedVerification && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-xl rounded-xl bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Guide Application</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-black placeholder-gray-400"
                    placeholder="Please provide a reason for rejection..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={!rejectionReason.trim() || processing === selectedVerification.id}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 disabled:bg-gray-400 shadow-md transition-all"
                  >
                    {processing === selectedVerification.id ? 'Processing...' : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReason('');
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
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

