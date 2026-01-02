import React, { useEffect, useMemo, useState } from 'react';
import GuideSideNav from '../../components/SideNavguide';
import GuideTopNav from '../../components/TopNavGuide';
import Swal from 'sweetalert2';

type GuideApplication = {
  id: string;
  requestId: string;
  tourTitle: string;
  destination: string;
  touristName?: string;
  startDate: string;
  endDate: string;
  proposedPrice?: number;
  touristBudget?: number;
  status: 'pending' | 'selected' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
  agreedPrice?: number;
  competitorCount?: number;
  tourType?: string;
  coverLetter?: string;
};

type ApplicationDetails = {
  id: string;
  requestId: string;
  guideId: string;
  guideName?: string;
  guideEmail?: string;
  tourTitle: string;
  destination: string;
  touristName?: string;
  touristId?: string;
  startDate: string;
  endDate: string;
  proposedPrice?: number;
  touristBudget?: number;
  coverLetter?: string;
  status: 'pending' | 'selected' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
  agreedPrice?: number;
  tourType?: string;
  numberOfPeople?: number;
  description?: string;
  requirements?: string;
  languages?: string[];
};

export default function MyApplications() {
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [applications, setApplications] = useState<GuideApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewingApplication, setViewingApplication] = useState<ApplicationDetails | null>(null);
  const [editingApplication, setEditingApplication] = useState<GuideApplication | null>(null);
  const [editFormData, setEditFormData] = useState({ proposedPrice: '', coverLetter: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<any>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);

  useEffect(() => {
    // Get uid from localStorage
    const uid = localStorage.getItem('userUid');
    setUserUid(uid);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    if (!userUid) {
      setApplications([]);
      setLoadingApplications(false);
      return;
    }

    setLoadingApplications(true);

    const fetchApplications = async () => {
      try {
        const params = new URLSearchParams();
        params.set('guideId', userUid);
        params.set('sortBy', 'updatedAt');
        params.set('sortOrder', 'desc');
        // Fetch a reasonably large page so guide sees most recent applications
        params.set('page', '1');
        params.set('limit', '200');

        const response = await fetch(`/api/guide/applications?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to load guide applications (${response.status})`);
        }

        const json = await response.json();

        const nextApplications: GuideApplication[] = (json.data ?? []).map((data: any) => ({
          id: data.id,
          requestId: data.requestId,
          tourTitle: data.tourTitle,
          destination: data.destination,
          touristName: data.touristName,
          startDate: data.startDate,
          endDate: data.endDate,
          proposedPrice: data.proposedPrice,
          touristBudget: data.touristBudget,
          status: data.status ?? 'pending',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          agreedPrice: data.agreedPrice,
          competitorCount: data.competitorCount,
          tourType: data.tourType,
          coverLetter: data.coverLetter,
        }));

        setApplications(nextApplications);
      } catch (error) {
        console.error('Failed to load guide applications', error);
        setApplications([]);
      } finally {
        setLoadingApplications(false);
      }
    };

    fetchApplications();
  }, [userUid]);

  const pendingApplications = useMemo(
    () => applications.filter((application) => application.status === 'pending'),
    [applications],
  );

  const acceptedApplications = useMemo(
    () => applications.filter((application) => application.status === 'selected'),
    [applications],
  );

  const rejectedApplications = useMemo(
    () => applications.filter((application) => application.status === 'rejected'),
    [applications],
  );

  const getApplications = () => {
    switch (activeTab) {
      case 'accepted':
        return acceptedApplications;
      case 'rejected':
        return rejectedApplications;
      case 'pending':
      default:
        return pendingApplications;
    }
  };

  const getStatusColor = (status: GuideApplication['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'selected':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const successRate = () => {
    if (applications.length === 0) {
      return 0;
    }
    return Math.round((acceptedApplications.length / applications.length) * 100);
  };

  const handleViewDetails = async (application: GuideApplication) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/guide/applications/${application.id}?requestId=${application.requestId}`);
      if (!response.ok) {
        throw new Error('Failed to load application details');
      }
      const data = await response.json();
      if (data.success) {
        setViewingApplication(data.data);
      } else {
        throw new Error(data.message || 'Failed to load application details');
      }
    } catch (error: any) {
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to load application details',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleEdit = async (application: GuideApplication) => {
    setIsLoadingDetails(true);
    try {
      // Fetch full application details to get coverLetter
      const response = await fetch(`/api/guide/applications/${application.id}?requestId=${application.requestId}`);
      if (!response.ok) {
        throw new Error('Failed to load application details');
      }
      const data = await response.json();
      if (data.success) {
        const appDetails = data.data;
        setEditingApplication(application);
        setEditFormData({
          proposedPrice: appDetails.proposedPrice?.toString() || '',
          coverLetter: appDetails.coverLetter || '',
        });
      } else {
        throw new Error(data.message || 'Failed to load application details');
      }
    } catch (error: any) {
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to load application details',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleViewBooking = async (application: GuideApplication) => {
    if (!userUid) return;
    
    setIsLoadingBooking(true);
    try {
      // Find booking by requestId and guideId (using 'search' as placeholder ID)
      const response = await fetch(`/api/guide/bookings/search?requestId=${application.requestId}&guideId=${userUid}`);
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
      setIsLoadingBooking(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingApplication || !userUid) return;

    if (!editFormData.proposedPrice || parseFloat(editFormData.proposedPrice) <= 0) {
      await Swal.fire({
        title: 'Validation Error',
        text: 'Please enter a valid proposed price',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (!editFormData.coverLetter.trim()) {
      await Swal.fire({
        title: 'Validation Error',
        text: 'Please enter a cover letter',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/guide/applications/${editingApplication.id}?requestId=${editingApplication.requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guideId: userUid,
          proposedPrice: parseFloat(editFormData.proposedPrice),
          coverLetter: editFormData.coverLetter.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update application');
      }

      const data = await response.json();
      if (data.success) {
        await Swal.fire({
          title: 'Success!',
          text: 'Application updated successfully',
          icon: 'success',
          confirmButtonColor: '#3085d6',
          timer: 2000,
          timerProgressBar: true,
        });

        // Refresh applications
        const refreshResponse = await fetch(`/api/guide/applications?guideId=${userUid}&sortBy=updatedAt&sortOrder=desc&page=1&limit=200`);
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.success) {
            const nextApplications: GuideApplication[] = (refreshData.data ?? []).map((data: any) => ({
              id: data.id,
              requestId: data.requestId,
              tourTitle: data.tourTitle,
              destination: data.destination,
              touristName: data.touristName,
              startDate: data.startDate,
              endDate: data.endDate,
              proposedPrice: data.proposedPrice,
              touristBudget: data.touristBudget,
              status: data.status ?? 'pending',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              agreedPrice: data.agreedPrice,
              competitorCount: data.competitorCount,
              tourType: data.tourType,
              coverLetter: data.coverLetter,
            }));
            setApplications(nextApplications);
          }
        }

        setEditingApplication(null);
        setEditFormData({ proposedPrice: '', coverLetter: '' });
      }
    } catch (error: any) {
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to update application',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <GuideSideNav />

      <div className="flex-1 flex flex-col lg:ml-64">
        <GuideTopNav
          title="My Applications"
          subtitle="Track the status of your tour applications."
        />

        <main className="flex-1 p-4 lg:p-6 pt-20 lg:pt-24">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {applications.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingApplications.length}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Accepted</p>
                  <p className="text-2xl font-bold text-green-600">{acceptedApplications.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {successRate()}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 lg:gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 lg:px-6 py-3 font-medium text-sm lg:text-base transition-colors relative whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pending ({pendingApplications.length})
              {activeTab === 'pending' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('accepted')}
              className={`px-4 lg:px-6 py-3 font-medium text-sm lg:text-base transition-colors relative whitespace-nowrap ${
                activeTab === 'accepted'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Accepted ({acceptedApplications.length})
              {activeTab === 'accepted' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 lg:px-6 py-3 font-medium text-sm lg:text-base transition-colors relative whitespace-nowrap ${
                activeTab === 'rejected'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Not Selected ({rejectedApplications.length})
              {activeTab === 'rejected' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {authLoading || loadingApplications ? (
              <div className="text-center py-12 text-gray-500">Loading applications...</div>
            ) : !userUid ? (
              <div className="text-center py-12 text-gray-500">Please sign in to track your applications.</div>
            ) : getApplications().length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-lg">No applications found</p>
              </div>
            ) : (
              getApplications().map((application) => (
                <div key={`${application.requestId}-${application.id}`} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 mb-2">{application.tourTitle}</h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              {application.tourType ?? 'Tour'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                              {application.status === 'pending'
                                ? 'Pending Review'
                                : application.status === 'selected'
                                  ? 'Accepted'
                                  : 'Not Selected'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span>{application.destination}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{application.startDate} - {application.endDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Tourist: {application.touristName ?? 'Tourist'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            Applied{' '}
                            {application.createdAt?.toDate
                              ? application.createdAt.toDate().toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                      </div>

                      {activeTab === 'pending' && typeof application.proposedPrice === 'number' && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <span className="text-gray-600">Your price: </span>
                              <span className="font-bold text-blue-600">${application.proposedPrice}</span>
                              <span className="text-gray-600"> / Tourist budget: </span>
                              <span className="font-medium text-gray-700">
                                ${application.touristBudget ?? '—'}
                              </span>
                            </div>
                            {typeof application.competitorCount === 'number' && (
                              <div className="text-orange-600 font-medium">
                                {application.competitorCount} other{' '}
                                {application.competitorCount === 1 ? 'applicant' : 'applicants'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === 'accepted' && typeof application.agreedPrice === 'number' && (
                        <div className="bg-green-50 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-600">
                              Accepted{' '}
                              {application.updatedAt?.toDate
                                ? application.updatedAt.toDate().toLocaleDateString()
                                : ''}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-600">Agreed price: </span>
                            <span className="font-bold text-green-600">${application.agreedPrice}</span>
                          </div>
                        </div>
                      )}

                      {activeTab === 'rejected' && (
                        <div className="bg-red-50 rounded-lg p-3 mb-3 text-sm text-red-700">
                          Not selected{' '}
                          {application.updatedAt?.toDate
                            ? application.updatedAt.toDate().toLocaleDateString()
                            : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[140px]">
                      {activeTab === 'pending' && (
                        <>
                          <button
                            onClick={() => handleViewDetails(application)}
                            disabled={isLoadingDetails}
                            className="flex-1 lg:flex-none px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingDetails ? 'Loading...' : 'View Details'}
                          </button>
                          <button
                            onClick={() => handleEdit(application)}
                            disabled={isLoadingDetails}
                            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingDetails ? 'Loading...' : 'Edit'}
                          </button>
                        </>
                      )}
                      {activeTab === 'accepted' && (
                        <>
                          <button
                            onClick={() => handleViewBooking(application)}
                            disabled={isLoadingBooking}
                            className="flex-1 lg:flex-none px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingBooking ? 'Loading...' : 'View Booking'}
                          </button>
                        </>
                      )}
                      {activeTab === 'rejected' && (
                        <button
                          onClick={() => handleViewDetails(application)}
                          disabled={isLoadingDetails}
                          className="flex-1 lg:flex-none px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoadingDetails ? 'Loading...' : 'View Details'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {activeTab === 'pending' && pendingApplications.length > 0 && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Increase Your Chances:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Follow up on applications older than 2 days by messaging the tourist</li>
                    <li>Keep your profile updated with recent reviews and photos</li>
                    <li>Be flexible with pricing for tourists with tight budgets</li>
                    <li>Respond quickly if tourists reach out with questions</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* View Details Modal */}
          {viewingApplication && (
            <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">Application Details</h2>
                  <button
                    onClick={() => setViewingApplication(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{viewingApplication.tourTitle}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {viewingApplication.tourType || 'Tour'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingApplication.status)}`}>
                        {viewingApplication.status === 'pending' ? 'Pending Review' : viewingApplication.status === 'selected' ? 'Accepted' : 'Not Selected'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                      <p className="text-gray-900">{viewingApplication.destination}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tour Dates</label>
                      <p className="text-gray-900">{viewingApplication.startDate} to {viewingApplication.endDate}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tourist Name</label>
                      <p className="text-gray-900">{viewingApplication.touristName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of People</label>
                      <p className="text-gray-900">{viewingApplication.numberOfPeople || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tourist Budget</label>
                      <p className="text-gray-900">${viewingApplication.touristBudget || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Proposed Price</label>
                      <p className="text-gray-900 font-semibold">${viewingApplication.proposedPrice || 'N/A'}</p>
                    </div>
                  </div>

                  {viewingApplication.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tour Description</label>
                      <p className="text-gray-900 whitespace-pre-wrap">{viewingApplication.description}</p>
                    </div>
                  )}

                  {viewingApplication.requirements && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                      <p className="text-gray-900 whitespace-pre-wrap">{viewingApplication.requirements}</p>
                    </div>
                  )}

                  {viewingApplication.languages && viewingApplication.languages.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Languages</label>
                      <div className="flex flex-wrap gap-2">
                        {viewingApplication.languages.map((lang, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingApplication.coverLetter && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Cover Letter</label>
                      <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{viewingApplication.coverLetter}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {editingApplication && (
            <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">Edit Application</h2>
                  <button
                    onClick={() => {
                      setEditingApplication(null);
                      setEditFormData({ proposedPrice: '', coverLetter: '' });
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{editingApplication.tourTitle}</h3>
                    <p className="text-sm text-gray-600">{editingApplication.destination}</p>
                  </div>

                  <div>
                    <label htmlFor="proposedPrice" className="block text-sm font-medium text-gray-700 mb-2">
                      Proposed Price (USD) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="proposedPrice"
                      min="0"
                      step="0.01"
                      required
                      value={editFormData.proposedPrice}
                      onChange={(e) => setEditFormData({ ...editFormData, proposedPrice: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter your proposed price"
                    />
                    {editingApplication.touristBudget && (
                      <p className="mt-1 text-sm text-gray-500">Tourist budget: ${editingApplication.touristBudget}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Letter <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="coverLetter"
                      required
                      rows={8}
                      value={editFormData.coverLetter}
                      onChange={(e) => setEditFormData({ ...editFormData, coverLetter: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Explain why you're the perfect guide for this tour. Mention your relevant experience, knowledge, and what makes you stand out..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setEditingApplication(null);
                        setEditFormData({ proposedPrice: '', coverLetter: '' });
                      }}
                      disabled={isSaving}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View Booking Modal */}
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
                        {viewingBooking.status === 'completed' ? 'Completed' :
                         viewingBooking.status === 'upcoming' ? 'Upcoming' :
                         viewingBooking.status === 'cancelled' ? 'Cancelled' :
                         'Pending'}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tourist Name</label>
                      <p className="text-gray-900">{viewingBooking.touristName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of People</label>
                      <p className="text-gray-900">{viewingBooking.numberOfPeople || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Price</label>
                      <p className="text-gray-900 font-semibold">${viewingBooking.agreedPrice || 'N/A'}</p>
                    </div>
                    {viewingBooking.budget && (
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
        </main>
      </div>
    </div>
  );
}

