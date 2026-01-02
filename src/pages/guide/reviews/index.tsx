import { useState, useEffect } from 'react';
import GuideSideNav from '../../components/SideNavguide';
import GuideTopNav from '../../components/TopNavGuide';

interface Review {
  id: string;
  tourist: string;
  rating: number;
  comment?: string;
  date: string;
  actions: string[];
}

export default function GuideReviews() {
  const [sortBy, setSortBy] = useState('newest');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    rating: 0,
    totalReviews: 0,
    fiveStarReviews: 0,
    responseRate: 0,
  });
  const [ratingBreakdown, setRatingBreakdown] = useState([
    { stars: 5, count: 0, percentage: 0 },
    { stars: 4, count: 0, percentage: 0 },
    { stars: 3, count: 0, percentage: 0 },
    { stars: 2, count: 0, percentage: 0 },
    { stars: 1, count: 0, percentage: 0 },
  ]);
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
    // Get uid from localStorage
    const uid = localStorage.getItem('userUid');
    setUserUid(uid);
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!userUid) {
        setLoading(false);
        return;
      }

      try {
        const sortMap: Record<string, { sortBy: string; sortOrder: string }> = {
          newest: { sortBy: 'createdAt', sortOrder: 'desc' },
          oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
          rating: { sortBy: 'rating', sortOrder: 'desc' },
        };

        const sortParams = sortMap[sortBy] || sortMap.newest;
        const response = await fetch(
          `/api/guide/reviews?guideId=${userUid}&${new URLSearchParams(sortParams).toString()}&limit=50`
        );
        
        if (!response.ok) throw new Error('Failed to fetch reviews');
        const data = await response.json();
        
        if (data.success) {
          const formattedReviews: Review[] = data.data.map((r: any) => ({
            id: r.id,
            tourist: r.touristName || 'Tourist',
            rating: r.rating || 0,
            comment: r.comment,
            date: r.createdAt?.toDate
              ? new Date(r.createdAt.toDate()).toLocaleDateString()
              : 'Recently',
            actions: ['View', 'Reply'],
          }));

          setReviews(formattedReviews);

          if (data.stats) {
            setStats({
              rating: data.stats.averageRating || 0,
              totalReviews: data.stats.totalReviews || 0,
              fiveStarReviews: data.stats.ratingBreakdown?.find((r: any) => r.stars === 5)?.count || 0,
              responseRate: 95, // Calculate from reviews with responses
            });

            if (data.stats.ratingBreakdown) {
              setRatingBreakdown(data.stats.ratingBreakdown);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [userUid, sortBy]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <GuideSideNav />

      <div className="flex-1 flex flex-col lg:ml-64">
        <GuideTopNav
          title="Reviews & Ratings"
          subtitle="Manage tourist feedback and your guide reputation."
        />

        <main className="flex-1 p-4 lg:p-6 pt-20 lg:pt-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Rating</h3>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-4xl font-bold text-gray-900">{overallStats.rating}</span>
                    <div className="ml-2 text-2xl">⭐</div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Total Reviews: {overallStats.totalReviews}</p>
                  <p className="text-sm text-gray-600 mb-4">5-Star Reviews: {overallStats.fiveStarReviews}</p>
                  <p className="text-sm text-gray-600">Response Rate: {overallStats.responseRate}%</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Reviews</h3>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option value="newest">Sort by: Newest</option>
                      <option value="oldest">Sort by: Oldest</option>
                      <option value="rating">Sort by: Rating</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tourist</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            Loading reviews...
                          </td>
                        </tr>
                      ) : reviews.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            No reviews yet
                          </td>
                        </tr>
                      ) : (
                        reviews.map((review) => (
                        <tr key={review.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {review.tourist}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {renderStars(review.rating)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {review.comment}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {review.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {review.actions.map((action, index) => (
                              <button
                                key={index}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                {action}
                              </button>
                            ))}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Rating Breakdown</h3>
                  <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                    View All
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {ratingBreakdown.map((breakdown) => (
                    <div key={breakdown.stars} className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 w-16">
                        <span className="text-sm font-medium text-gray-900">{breakdown.stars}</span>
                        <span className="text-yellow-400">★</span>
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${breakdown.stars >= 4 ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                            style={{ width: `${breakdown.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 w-12 text-right">
                        {breakdown.count}
                      </div>
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
