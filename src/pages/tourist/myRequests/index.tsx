import React, { useEffect, useMemo, useState } from 'react';
import SideNav from '../../components/SideNav';
import TopNav from '../../components/TopNav';
import { getTourRequests, getApplications, acceptApplication, cancelTourRequest, updateTourRequest } from '../../../lib/api/tourist';
import Swal from 'sweetalert2';
import Image from 'next/image';

type TourRequest = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  numberOfPeople: number;
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  applicationCount?: number;
  tourType: string;
  description?: string;
  requirements?: string;
  languages?: string[];
  touristId: string;
  touristName?: string;
  selectedGuideName?: string;
  selectedGuideId?: string;
  selectedPrice?: number;
  guideRating?: number;
  createdAt?: any;
};

type TourApplication = {
  id: string;
  guideId: string;
  guideName: string;
  guideEmail?: string;
  proposedPrice: number;
  coverLetter: string;
  status: 'pending' | 'selected' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
  experience?: string;
  languages?: string[];
  rating?: number;
  reviews?: number;
};

export default function MyTourRequests() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'accepted' | 'completed'>('active');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requests, setRequests] = useState<TourRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [applications, setApplications] = useState<TourApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [viewingGuideId, setViewingGuideId] = useState<string | null>(null);
  const [guideProfile, setGuideProfile] = useState<any>(null);
  const [guideProfileLoading, setGuideProfileLoading] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewingRequest, setViewingRequest] = useState<TourRequest | null>(null);
  const [isLoadingRequestDetails, setIsLoadingRequestDetails] = useState(false);

  useEffect(() => {
    // Get uid from localStorage
    const uid = localStorage.getItem('userUid');
    setUserUid(uid);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    if (!userUid) {
      setRequests([]);
      setRequestsLoading(false);
      return;
    }

    const loadRequests = async () => {
      setRequestsLoading(true);
      try {
        const response = await getTourRequests({
          touristId: userUid,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        setRequests(response.data.map((req: any) => ({
          ...req,
          status: req.status as 'open' | 'accepted' | 'completed' | 'cancelled',
        })));
      } catch (error: any) {
        console.error('Failed to load tour requests', error);
        await Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to load tour requests',
          icon: 'error',
          confirmButtonColor: '#3085d6',
        });
        setRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    };

    loadRequests();
    
    // Refresh every 30 seconds to get updates
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [userUid]);

  useEffect(() => {
    if (!selectedRequestId) {
      setApplications([]);
      setApplicationsLoading(false);
      return;
    }

    const loadApplications = async () => {
      setApplicationsLoading(true);
      try {
        const response = await getApplications(selectedRequestId, {
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        });
        setApplications(response.data);
      } catch (error: any) {
        console.error('Failed to load applications', error);
        await Swal.fire({
          title: 'Error!',
          text: error.message || 'Failed to load applications',
          icon: 'error',
          confirmButtonColor: '#3085d6',
        });
        setApplications([]);
      } finally {
        setApplicationsLoading(false);
      }
    };

    loadApplications();
    
    // Refresh every 10 seconds to get new applications
    const interval = setInterval(loadApplications, 10000);
    return () => clearInterval(interval);
  }, [selectedRequestId]);

  const filteredRequests = useMemo(() => {
    switch (activeTab) {
      case 'accepted':
        return requests.filter((request) => request.status === 'accepted');
      case 'completed':
        return requests.filter((request) => request.status === 'completed');
      case 'active':
      default:
        return requests.filter((request) => request.status === 'open');
    }
  }, [activeTab, requests]);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  );

  const getStatusColor = (status: TourRequest['status']) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-700';
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
      default:
        return 'bg-red-100 text-red-700';
    }
  };

  const handleCancelRequest = async (request: TourRequest) => {
    const result = await Swal.fire({
      title: 'Cancel Request?',
      text: 'Are you sure you want to cancel this tour request? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, cancel it',
      cancelButtonText: 'No, keep it',
    });

    if (!result.isConfirmed) return;

    try {
      await cancelTourRequest(request.id);
      await Swal.fire({
        title: 'Cancelled!',
        text: 'Your tour request has been cancelled.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        timer: 2000,
        timerProgressBar: true,
      });

      // Refresh requests
      if (userUid) {
        const response = await getTourRequests({
          touristId: userUid,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        setRequests(response.data.map((req: any) => ({
          ...req,
          status: req.status as 'open' | 'accepted' | 'completed' | 'cancelled',
        })));
      }
    } catch (error: any) {
      console.error('Failed to cancel request', error);
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to cancel request. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const handleEditRequest = async (request: TourRequest) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Tour Request',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Title</label>
          <input id="swal-title" class="swal2-input" style="width: 100%; margin: 0 0 12px 0;" value="${request.title}">
          
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Destination</label>
          <input id="swal-destination" class="swal2-input" style="width: 100%; margin: 0 0 12px 0;" value="${request.destination}">
          
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Budget ($)</label>
          <input id="swal-budget" type="number" class="swal2-input" style="width: 100%; margin: 0 0 12px 0;" value="${request.budget}">
          
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Number of People</label>
          <input id="swal-people" type="number" class="swal2-input" style="width: 100%; margin: 0 0 12px 0;" value="${request.numberOfPeople}">
          
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Description</label>
          <textarea id="swal-description" class="swal2-textarea" style="width: 100%; margin: 0;">${request.description || ''}</textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      confirmButtonColor: '#3085d6',
      preConfirm: () => {
        return {
          title: (document.getElementById('swal-title') as HTMLInputElement).value,
          destination: (document.getElementById('swal-destination') as HTMLInputElement).value,
          budget: Number((document.getElementById('swal-budget') as HTMLInputElement).value),
          numberOfPeople: Number((document.getElementById('swal-people') as HTMLInputElement).value),
          description: (document.getElementById('swal-description') as HTMLTextAreaElement).value,
        };
      },
    });

    if (!formValues) return;

    try {
      await updateTourRequest(request.id, formValues);
      await Swal.fire({
        title: 'Updated!',
        text: 'Your tour request has been updated.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        timer: 2000,
        timerProgressBar: true,
      });

      // Refresh requests
      if (userUid) {
        const response = await getTourRequests({
          touristId: userUid,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        setRequests(response.data.map((req: any) => ({
          ...req,
          status: req.status as 'open' | 'accepted' | 'completed' | 'cancelled',
        })));
      }
    } catch (error: any) {
      console.error('Failed to update request', error);
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to update request. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const handleViewProfile = async (guideId: string) => {
    setViewingGuideId(guideId);
    setGuideProfileLoading(true);
    try {
      const response = await fetch(`/api/guide/profile?guideId=${guideId}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      const json = await response.json();
      setGuideProfile(json.data);
    } catch (error) {
      console.error('Failed to load guide profile', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to load guide profile.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
      setViewingGuideId(null);
    } finally {
      setGuideProfileLoading(false);
    }
  };

  const handleViewDetails = async (request: TourRequest) => {
    setIsLoadingRequestDetails(true);
    try {
      const response = await fetch(`/api/tourist/requests/${request.id}`);
      if (!response.ok) {
        throw new Error('Failed to load request details');
      }
      const data = await response.json();
      if (data.success) {
        setViewingRequest(data.data);
      } else {
        throw new Error(data.message || 'Failed to load request details');
      }
    } catch (error: any) {
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to load request details',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setIsLoadingRequestDetails(false);
    }
  };

  const handleAcceptApplication = async (application: TourApplication) => {
    if (!selectedRequest || !userUid || selectedRequest.status !== 'open') {
      return;
    }

    setSelectedActionId(application.id);

    try {
      await acceptApplication(application.id, selectedRequest.id);

      await Swal.fire({
        title: 'Success!',
        text: 'Guide accepted successfully. Awaiting guide confirmation.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        timer: 3000,
        timerProgressBar: true,
      });

      // Refresh requests and applications
      if (userUid) {
        const response = await getTourRequests({
          touristId: userUid,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        setRequests(response.data.map((req: any) => ({
          ...req,
          status: req.status as 'open' | 'accepted' | 'completed' | 'cancelled',
        })));
      }

      if (selectedRequestId) {
        const appsResponse = await getApplications(selectedRequestId, {
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        });
        setApplications(appsResponse.data);
      }
    } catch (error: any) {
      console.error('Failed to accept application', error);
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Failed to accept application. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setSelectedActionId(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SideNav
        activeMenu="my-requests"
        userType="tourist"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto lg:ml-0">
        <TopNav
          title="My Tour Requests"
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="p-4 lg:p-8">
          <div className="flex gap-2 lg:gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 lg:px-6 py-3 font-medium text-sm lg:text-base transition-colors relative whitespace-nowrap ${
                activeTab === 'active'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Active Requests
              {activeTab === 'active' && (
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
              Accepted
              {activeTab === 'accepted' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 lg:px-6 py-3 font-medium text-sm lg:text-base transition-colors relative whitespace-nowrap ${
                activeTab === 'completed'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Completed
              {activeTab === 'completed' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          </div>

          {!userUid && !authLoading && (
            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              Please sign in to view and manage your tour requests.
            </div>
          )}

          {requestsLoading ? (
            <div className="text-center py-12 text-gray-500">Loading your tour requests...</div>
          ) : (
            filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 text-lg">No requests found</p>
              </div>
            ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-md p-4 lg:p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-base lg:text-lg text-gray-800 mb-2">{request.title}</h3>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status === 'open'
                              ? 'Open'
                              : request.status === 'accepted'
                                ? 'Accepted'
                                : request.status === 'completed'
                                  ? 'Completed'
                                  : 'Cancelled'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs lg:text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span>{request.destination}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{request.startDate} - {request.endDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>{request.numberOfPeople} people</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-blue-600 font-semibold">${request.budget}</span>
                        </div>
                      </div>

                      {'description' in request && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{request.description}</p>
                      )}

                      {request.status === 'open' && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{request.applicationCount ?? 0} Applications</span>
                          </div>
                        </div>
                      )}

                      {request.status !== 'open' && request.selectedGuideName && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">Guide:</span>
                          <span className="font-medium text-gray-800">{request.selectedGuideName}</span>
                          {request.guideRating && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-gray-600">{request.guideRating}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[140px]">
                      {request.status === 'open' && (
                        <>
                          <button
                            onClick={() => setSelectedRequestId(request.id)}
                            className="flex-1 lg:flex-none px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                          >
                            View Applications
                          </button>
                          <button
                            onClick={() => handleEditRequest(request)}
                            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancelRequest(request)}
                            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {request.status === 'accepted' && (
                        <>
                          <button
                            onClick={() => handleViewDetails(request)}
                            disabled={isLoadingRequestDetails}
                            className="flex-1 lg:flex-none px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingRequestDetails ? 'Loading...' : 'View Details'}
                          </button>
                        </>
                      )}
                      {request.status === 'completed' && (
                        <>
                          <button
                            onClick={() => handleViewDetails(request)}
                            disabled={isLoadingRequestDetails}
                            className="flex-1 lg:flex-none px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingRequestDetails ? 'Loading...' : 'View Details'}
                          </button>
                          {(request as any).yourRating ? (
                            <div className="flex items-center justify-center gap-1 px-4 py-2 bg-gray-50 rounded-lg">
                              <span className="text-sm text-gray-600">Your rating:</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <svg key={i} className={`w-4 h-4 ${i < ((request as any).yourRating as number) ? 'text-yellow-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <button className="flex-1 lg:flex-none px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium">
                              Rate Guide
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )
          )}
        </div>
      </main>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Guide Applications</h2>
              <button
                onClick={() => {
                  setSelectedRequestId(null);
                  setApplications([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {applicationsLoading ? (
                <div className="text-center py-12 text-gray-500">Loading applications...</div>
              ) : (
                applications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No applications yet.</div>
                ) : (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div key={application.id} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-gray-800">{application.guideName}</h3>
                                {application.status === 'selected' && (
                                  <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                                    Selected
                                  </span>
                                )}
                                {application.status === 'rejected' && (
                                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                                    Not Selected
                                  </span>
                                )}
                              </div>
                              {application.experience && (
                                <p className="text-sm text-gray-600">{application.experience}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">${application.proposedPrice}</div>
                              <div className="text-xs text-gray-500">
                                {application.updatedAt?.toDate
                                  ? application.updatedAt.toDate().toLocaleString()
                                  : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                            {typeof application.rating === 'number' && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="font-medium">{application.rating}</span>
                                <span>({application.reviews ?? 0} reviews)</span>
                              </div>
                            )}
                            {application.experience && (
                              <>
                                <span>•</span>
                                <span>{application.experience}</span>
                              </>
                            )}
                            {application.languages && application.languages.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{application.languages.join(', ')}</span>
                              </>
                            )}
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <h4 className="font-medium text-gray-800 mb-2">Cover Letter</h4>
                            <p className="text-sm text-gray-600 whitespace-pre-line">{application.coverLetter}</p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              disabled={selectedRequest.status !== 'open' || application.status !== 'pending' || selectedActionId === application.id}
                              onClick={() => handleAcceptApplication(application)}
                              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                selectedRequest.status !== 'open' || application.status !== 'pending'
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              {selectedActionId === application.id ? 'Accepting...' : 'Accept Application'}
                            </button>
                            <button
                              onClick={() => handleViewProfile(application.guideId)}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                              View Profile
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guide Profile Modal */}
      {viewingGuideId && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Guide Profile</h2>
              <button
                onClick={() => {
                  setViewingGuideId(null);
                  setGuideProfile(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {guideProfileLoading ? (
                <div className="text-center py-12 text-gray-500">Loading profile...</div>
              ) : guideProfile ? (
                <div className="space-y-6">
                  {/* Profile Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      {guideProfile.profilePicture ? (
                        <img src={guideProfile.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {guideProfile.firstName} {guideProfile.lastName}
                      </h3>
                      {guideProfile.location && (
                        <p className="text-gray-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {guideProfile.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  {(guideProfile.nicDocument || guideProfile.policeReportDocument || guideProfile.touristDeptIdDocument) && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Verified Documents</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {guideProfile.nicDocument && (
                          <a
                            href={guideProfile.nicDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <p className="text-sm font-medium text-gray-700 mb-1">NIC Document</p>
                            <Image
                              src={guideProfile.nicDocument}
                              alt="NIC Document"
                              width={200}
                              height={150}
                              className="rounded-lg border border-gray-200 object-cover hover:opacity-80 transition-opacity"
                            />
                          </a>
                        )}
                        {guideProfile.policeReportDocument && (
                          <a
                            href={guideProfile.policeReportDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <p className="text-sm font-medium text-gray-700 mb-1">Police Report</p>
                            <Image
                              src={guideProfile.policeReportDocument}
                              alt="Police Report"
                              width={200}
                              height={150}
                              className="rounded-lg border border-gray-200 object-cover hover:opacity-80 transition-opacity"
                            />
                          </a>
                        )}
                        {guideProfile.touristDeptIdDocument && (
                          <a
                            href={guideProfile.touristDeptIdDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <p className="text-sm font-medium text-gray-700 mb-1">Tourist Dept. ID</p>
                            <Image
                              src={guideProfile.touristDeptIdDocument}
                              alt="Tourist Dept. ID"
                              width={200}
                              height={150}
                              className="rounded-lg border border-gray-200 object-cover hover:opacity-80 transition-opacity"
                            />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Contact</h4>
                    <div className="space-y-1 text-gray-600">
                      {guideProfile.email && (
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {guideProfile.email}
                        </p>
                      )}
                      {guideProfile.phone && (
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {guideProfile.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">Profile not found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingRequest && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Tour Request Details</h2>
              <button
                onClick={() => setViewingRequest(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{viewingRequest.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {viewingRequest.tourType || 'Tour'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    viewingRequest.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    viewingRequest.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    viewingRequest.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {viewingRequest.status === 'accepted' ? 'Accepted' :
                     viewingRequest.status === 'completed' ? 'Completed' :
                     viewingRequest.status === 'cancelled' ? 'Cancelled' :
                     'Open'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <p className="text-gray-900">{viewingRequest.destination}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tour Dates</label>
                  <p className="text-gray-900">{viewingRequest.startDate} to {viewingRequest.endDate}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                  <p className="text-gray-900 font-semibold">${viewingRequest.budget}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of People</label>
                  <p className="text-gray-900">{viewingRequest.numberOfPeople}</p>
                </div>
                {viewingRequest.selectedGuideName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selected Guide</label>
                    <p className="text-gray-900">{viewingRequest.selectedGuideName}</p>
                  </div>
                )}
                {viewingRequest.selectedPrice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Price</label>
                    <p className="text-gray-900 font-semibold">${viewingRequest.selectedPrice}</p>
                  </div>
                )}
                {viewingRequest.applicationCount !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Applications Received</label>
                    <p className="text-gray-900">{viewingRequest.applicationCount}</p>
                  </div>
                )}
              </div>

              {viewingRequest.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tour Description</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{viewingRequest.description}</p>
                </div>
              )}

              {viewingRequest.requirements && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{viewingRequest.requirements}</p>
                </div>
              )}

              {viewingRequest.languages && viewingRequest.languages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {viewingRequest.languages.map((lang: string, idx: number) => (
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
  );
}
