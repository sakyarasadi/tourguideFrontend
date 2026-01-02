import React, { useState, useEffect } from 'react';
import SideNav from '../../components/SideNav';
import TopNav from '../../components/TopNav';
import { createTourRequest } from '../../../lib/api/tourist';
import Swal from 'sweetalert2';

export default function PostTourRequest() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    numberOfPeople: '1',
    budget: '',
    tourType: 'cultural',
    description: '',
    requirements: '',
    languages: [] as string[],
  });

  useEffect(() => {
    // Get uid and email from localStorage
    const uid = localStorage.getItem('userUid');
    const email = localStorage.getItem('userEmail') || '';
    setUserUid(uid);
    setUserEmail(email);
    setAuthLoading(false);
  }, []);

  const tourTypes = [
    { id: 'cultural', name: 'Cultural Heritage' },
    { id: 'wildlife', name: 'Wildlife Safari' },
    { id: 'adventure', name: 'Adventure & Trekking' },
    { id: 'beach', name: 'Beach & Coastal' },
    { id: 'hill', name: 'Hill Country' },
    { id: 'city', name: 'City Tours' },
  ];

  const languageOptions = ['English', 'Sinhala', 'Tamil', 'French', 'German', 'Chinese'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authLoading) {
      return;
    }

    if (!userUid) {
      await Swal.fire({
        title: 'Sign In Required',
        text: 'Please sign in as a tourist to post a request.',
        icon: 'warning',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createTourRequest({
        title: formData.title.trim(),
        destination: formData.destination.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        numberOfPeople: Number(formData.numberOfPeople),
        budget: Number(formData.budget),
        tourType: formData.tourType,
        description: formData.description.trim(),
        requirements: formData.requirements.trim(),
        languages: formData.languages,
        touristId: userUid,
        touristName: userEmail.split('@')[0],
        touristEmail: userEmail || undefined,
      });

      await Swal.fire({
        title: 'Success!',
        text: 'Tour request posted successfully! Guides will start applying soon.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        timer: 3000,
        timerProgressBar: true,
      });
      setFormData({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        numberOfPeople: '1',
        budget: '',
        tourType: 'cultural',
        description: '',
        requirements: '',
        languages: [],
      });
    } catch (error: any) {
      console.error('Failed to post tour request', error);
      await Swal.fire({
        title: 'Error!',
        text: error?.message ?? 'Failed to post tour request. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageToggle = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SideNav
        activeMenu="post-request"
        userType="tourist"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto lg:ml-0">
        <TopNav
          title="Post Tour Request"
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 lg:p-8 mb-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Post Your Tour Request</h2>
                <p className="text-gray-600">
                  Share your tour requirements and let expert guides bid for your trip. You'll receive applications from qualified guides and can choose the perfect one for your journey.
                </p>
              </div>

              {!userUid && !authLoading && (
                <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  Please sign in as a tourist to post and manage tour requests.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tour Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., 5-Day Cultural Tour of Ancient Cities"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="e.g., Sigiriya, Kandy, Ella"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tour Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.tourType}
                      onChange={(e) => setFormData({ ...formData, tourType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {tourTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of People <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.numberOfPeople}
                      onChange={(e) => setFormData({ ...formData, numberOfPeople: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget (USD) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="Your budget for the guide"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Preferred Languages <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {languageOptions.map((language) => (
                      <button
                        key={language}
                        type="button"
                        onClick={() => handleLanguageToggle(language)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          formData.languages.includes(language)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tour Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what you want to see and experience..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requirements (Optional)
                  </label>
                  <textarea
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder="Any special needs, accessibility requirements, dietary restrictions, etc."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setFormData({
                      title: '',
                      destination: '',
                      startDate: '',
                      endDate: '',
                      numberOfPeople: '1',
                      budget: '',
                      tourType: 'cultural',
                      description: '',
                      requirements: '',
                      languages: [],
                    })}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !userUid}
                    className={`px-6 py-3 rounded-lg text-white transition-colors font-medium ${isSubmitting || !userUid
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isSubmitting ? 'Posting...' : 'Post Tour Request'}
                  </button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Quick Response</h3>
                <p className="text-sm text-gray-600">
                  Receive applications from qualified guides within 24 hours of posting your request.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Verified Guides</h3>
                <p className="text-sm text-gray-600">
                  All applicants are verified guides with proven experience and customer reviews.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Best Value</h3>
                <p className="text-sm text-gray-600">
                  Compare multiple guide proposals and choose the best fit for your budget and needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

