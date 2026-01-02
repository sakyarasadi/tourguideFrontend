import React, { useEffect, useMemo, useState } from 'react';
import GuideSideNav from '../../components/SideNavguide';
import GuideTopNav from '../../components/TopNavGuide';
import Swal from 'sweetalert2';
import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

type TourRequest = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  numberOfPeople: number;
  tourType: string;
  languages: string[];
  description: string;
  requirements?: string;
  touristId: string;
  touristName?: string;
  applicationCount?: number;
  createdAt?: any;
};

const categories = [
  { id: 'all', name: 'All Requests' },
  { id: 'cultural', name: 'Cultural Heritage' },
  { id: 'wildlife', name: 'Wildlife Safari' },
  { id: 'adventure', name: 'Adventure & Trekking' },
  { id: 'beach', name: 'Beach & Coastal' },
  { id: 'hill', name: 'Hill Country' },
];

export default function BrowseTourRequests() {
  const PAGE_SIZE = 10;

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [applicationData, setApplicationData] = useState({
    proposedPrice: '',
    coverLetter: '',
  });
  const [requests, setRequests] = useState<TourRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [page, setPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting'>('idle');
  const [userUid, setUserUid] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Get uid from localStorage
    const uid = localStorage.getItem('userUid');
    setUserUid(uid);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoadingRequests(true);

        // Get request IDs the guide has already applied to
        let appliedRequestIds: Set<string> = new Set();
        if (userUid) {
          try {
            const appsResponse = await fetch(`/api/guide/applications?guideId=${userUid}&limit=1000`);
            if (appsResponse.ok) {
              const appsJson = await appsResponse.json();
              appliedRequestIds = new Set(
                (appsJson.data ?? []).map((app: any) => app.requestId)
              );
            }
          } catch (err) {
            console.error('Failed to fetch guide applications', err);
          }
        }

        const params = new URLSearchParams();
        params.set('status', 'open');
        if (selectedCategory !== 'all') {
          params.set('tourType', selectedCategory);
        }
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim());
        }

        // Map UI sort option to API sortBy/sortOrder
        switch (sortBy) {
          case 'budget-high':
            params.set('sortBy', 'budget');
            params.set('sortOrder', 'desc');
            break;
          case 'budget-low':
            params.set('sortBy', 'budget');
            params.set('sortOrder', 'asc');
            break;
          case 'applications':
            params.set('sortBy', 'applicationCount');
            params.set('sortOrder', 'asc');
            break;
          case 'recent':
          default:
            params.set('sortBy', 'createdAt');
            params.set('sortOrder', 'desc');
            break;
        }

        params.set('page', page.toString());
        params.set('limit', PAGE_SIZE.toString());

        const response = await fetch(`/api/guide/requests?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to load tour requests (${response.status})`);
        }

        const json = await response.json();

        const nextRequests: TourRequest[] = (json.data ?? [])
          .filter((data: any) => !appliedRequestIds.has(data.id))
          .map((data: any) => ({
            id: data.id,
            title: data.title,
            destination: data.destination,
            startDate: data.startDate,
            endDate: data.endDate,
            budget: data.budget,
            numberOfPeople: data.numberOfPeople,
            tourType: data.tourType,
            languages: data.languages ?? [],
            description: data.description,
            requirements: data.requirements,
            touristId: data.touristId,
            touristName: data.touristName,
            applicationCount: data.applicationCount ?? 0,
            createdAt: data.createdAt,
          }));

        setRequests(nextRequests);
        setTotalRequests(json.pagination?.total ?? nextRequests.length);
      } catch (error) {
        console.error('Failed to load tour requests', error);
        setRequests([]);
        setTotalRequests(0);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchRequests();
  }, [selectedCategory, searchQuery, sortBy, page, userUid]);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  );

  const filteredRequests = useMemo(() => {
    // Still make sure guide doesn't see their own tourist requests (edge case)
    return requests.filter((request) => request.touristId !== userUid);
  }, [requests, userUid]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userUid) {
      await Swal.fire({
        title: 'Sign In Required',
        text: 'Please sign in as a guide to submit an application.',
        icon: 'warning',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (authLoading) {
      return;
    }

    if (!selectedRequest) {
      await Swal.fire({
        title: 'Error!',
        text: 'No tour request selected.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const userEmail = localStorage.getItem('userEmail') || '';

    try {
      setSubmitState('submitting');

      const applicationRef = doc(
        db,
        'tourRequests',
        selectedRequest.id,
        'applications',
        userUid,
      );
      const existingApplication = await getDoc(applicationRef);
      const isNewApplication = !existingApplication.exists();

      await setDoc(
        applicationRef,
        {
          guideId: userUid,
          guideName: userEmail.split('@')[0],
          guideEmail: userEmail,
          proposedPrice: Number(applicationData.proposedPrice),
          coverLetter: applicationData.coverLetter.trim(),
          status: 'pending',
          requestId: selectedRequest.id,
          tourTitle: selectedRequest.title,
          destination: selectedRequest.destination,
          startDate: selectedRequest.startDate,
          endDate: selectedRequest.endDate,
          tourType: selectedRequest.tourType,
          touristId: selectedRequest.touristId,
          touristName: selectedRequest.touristName,
          touristBudget: selectedRequest.budget,
          createdAt: existingApplication.exists()
            ? existingApplication.data()?.createdAt
            : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      if (isNewApplication) {
        await updateDoc(doc(db, 'tourRequests', selectedRequest.id), {
          applicationCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      }

      // Remove the request from the list after applying
      setRequests((prev) => prev.filter((req) => req.id !== selectedRequest.id));
      setTotalRequests((prev) => prev - 1);

      await Swal.fire({
        title: 'Success!',
        text: 'Application submitted successfully! The tourist will review your proposal.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        timer: 3000,
        timerProgressBar: true,
      });
      setApplicationData({ proposedPrice: '', coverLetter: '' });
      setSelectedRequestId(null);
    } catch (error) {
      console.error('Failed to submit application', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to submit application. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setSubmitState('idle');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <GuideSideNav />

      <div className="flex-1 flex flex-col lg:ml-64">
        <GuideTopNav
          title="Browse Tour Requests"
          subtitle="Find and apply to tour requests that match your expertise."
        />

        <main className="flex-1 p-4 lg:p-6 pt-20 lg:pt-24">
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by destination, tour type..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              >
                <option value="recent">Most Recent</option>
                <option value="budget-high">Highest Budget</option>
                <option value="budget-low">Lowest Budget</option>
                <option value="applications">Fewest Applications</option>
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-800">{filteredRequests.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">New Today</p>
                  <p className="text-2xl font-bold text-gray-800">3</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Budget</p>
                  <p className="text-2xl font-bold text-gray-800">$170</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Urgent</p>
                  <p className="text-2xl font-bold text-gray-800">2</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {loadingRequests ? (
            <div className="text-center py-12 text-gray-500">Loading tour requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No tour requests match your filters.</div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-gray-800 mb-2">{request.title}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {request.tourType}
                          </span>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              Open
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-3xl font-bold text-blue-600">${request.budget}</div>
                        <div className="text-xs text-gray-500">
                          {request.createdAt?.toDate
                            ? request.createdAt.toDate().toLocaleDateString()
                            : ''}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>{request.destination}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{request.startDate} - {request.endDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{request.numberOfPeople} people</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        <span>{request.languages.join(', ')}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{request.description}</p>

                    {request.requirements && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                        <p className="text-xs font-medium text-yellow-800 mb-1">Special Requirements:</p>
                        <p className="text-sm text-yellow-700">{request.requirements}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Posted by {request.touristName ?? 'Tourist'}</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1 text-orange-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{request.applicationCount ?? 0} applications</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[140px]">
                    <button
                      onClick={() => {
                        setSelectedRequestId(request.id);
                        setApplicationData({ proposedPrice: '', coverLetter: '' });
                      }}
                      className="flex-1 lg:flex-none px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      Apply Now
                    </button>
                    <button className="flex-1 lg:flex-none px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                      Save
                    </button>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loadingRequests && filteredRequests.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * PAGE_SIZE + 1}-
                {Math.min(page * PAGE_SIZE, totalRequests)} of {totalRequests} requests
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    const totalPages = Math.max(1, Math.ceil(totalRequests / PAGE_SIZE));
                    setPage((prev) => (prev < totalPages ? prev + 1 : prev));
                  }}
                  disabled={page * PAGE_SIZE >= totalRequests}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-opacity-50 sm:backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Submit Your Application</h2>
              <button
                onClick={() => {
                  setSelectedRequestId(null);
                  setApplicationData({ proposedPrice: '', coverLetter: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-2">
                    {selectedRequest.title}
                  </h3>
                  <div className="text-sm text-gray-600">
                    <p>Destination: {selectedRequest.destination}</p>
                    <p>Budget: ${selectedRequest.budget}</p>
                    <p>Dates: {selectedRequest.startDate} - {selectedRequest.endDate}</p>
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Proposed Price (USD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={applicationData.proposedPrice}
                    onChange={(e) => setApplicationData({ ...applicationData, proposedPrice: e.target.value })}
                    placeholder="Enter your price"
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tourist's budget: ${selectedRequest.budget}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cover Letter <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={applicationData.coverLetter}
                    onChange={(e) => setApplicationData({ ...applicationData, coverLetter: e.target.value })}
                    placeholder="Explain why you're the perfect guide for this tour. Mention your relevant experience, knowledge, and what makes you stand out..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 100 characters. Be specific about your qualifications and experience.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Application Tips:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Be competitive with your pricing</li>
                        <li>Highlight your relevant experience</li>
                        <li>Respond quickly to stand out</li>
                        <li>Be professional and detailed</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequestId(null);
                      setApplicationData({ proposedPrice: '', coverLetter: '' });
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitState === 'submitting'}
                    className={`flex-1 px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                      submitState === 'submitting'
                        ? 'bg-blue-300 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {submitState === 'submitting' ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


