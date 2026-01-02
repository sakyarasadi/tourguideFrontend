import type { NextApiRequest, NextApiResponse } from 'next';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface GuideReview {
  id: string;
  guideId: string;
  touristId: string;
  touristName?: string;
  bookingId?: string;
  rating: number;
  comment?: string;
  response?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface GetGuideReviewsResponse {
  success: boolean;
  code: number;
  data: GuideReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats?: {
    averageRating: number;
    totalReviews: number;
    ratingBreakdown: {
      stars: number;
      count: number;
      percentage: number;
    }[];
  };
  filters?: {
    search?: string;
    minRating?: number;
    maxRating?: number;
    touristId?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

interface ErrorResponse {
  success: false;
  code: number;
  error: string;
  message?: string;
}

const matchesSearch = (text: string | undefined, searchTerm: string): boolean => {
  if (!text) return false;
  return text.toLowerCase().includes(searchTerm.toLowerCase());
};

const applySearchFilter = (reviews: GuideReview[], searchTerm: string): GuideReview[] => {
  if (!searchTerm) return reviews;

  const lowerSearch = searchTerm.toLowerCase();
  return reviews.filter((review) => {
    return (
      matchesSearch(review.comment, lowerSearch) ||
      matchesSearch(review.touristName, lowerSearch) ||
      matchesSearch(review.response, lowerSearch)
    );
  });
};

const applyFilters = (
  reviews: GuideReview[],
  filters: {
    minRating?: number;
    maxRating?: number;
    touristId?: string;
  },
): GuideReview[] => {
  return reviews.filter((review) => {
    if (filters.minRating !== undefined && review.rating < filters.minRating) return false;
    if (filters.maxRating !== undefined && review.rating > filters.maxRating) return false;
    if (filters.touristId && review.touristId !== filters.touristId) return false;
    return true;
  });
};

const sortReviews = (
  reviews: GuideReview[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): GuideReview[] => {
  const sorted = [...reviews];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'rating':
        aValue = a.rating || 0;
        bValue = b.rating || 0;
        break;
      case 'createdAt':
        aValue = a.createdAt?.toMillis?.() || 0;
        bValue = b.createdAt?.toMillis?.() || 0;
        break;
      case 'updatedAt':
        aValue = a.updatedAt?.toMillis?.() || 0;
        bValue = b.updatedAt?.toMillis?.() || 0;
        break;
      default:
        aValue = a.createdAt?.toMillis?.() || 0;
        bValue = b.createdAt?.toMillis?.() || 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetGuideReviewsResponse | ErrorResponse>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      code: 405,
      error: 'Method not allowed',
      message: 'Only GET method is supported',
    });
  }

  try {
    const {
      guideId,
      search,
      minRating,
      maxRating,
      touristId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit: limitParam = '10',
    } = req.query;

    if (!guideId || typeof guideId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'guideId is required',
      });
    }

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 10));

    const filters = {
      minRating: minRating ? parseInt(minRating as string, 10) : undefined,
      maxRating: maxRating ? parseInt(maxRating as string, 10) : undefined,
      touristId: touristId as string | undefined,
    };

    const validSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get reviews for this guide
    const reviewsQuery = query(collection(db, 'reviews'), where('guideId', '==', guideId));
    const snapshot = await getDocs(reviewsQuery);

    let reviews: GuideReview[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        guideId: data.guideId || '',
        touristId: data.touristId || '',
        touristName: data.touristName,
        bookingId: data.bookingId,
        rating: data.rating || 0,
        comment: data.comment,
        response: data.response,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // Calculate stats
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
      : 0;

    const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => {
      const count = reviews.filter((r) => r.rating === stars).length;
      return {
        stars,
        count,
        percentage: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
      };
    });

    // Apply search filter
    if (search) {
      reviews = applySearchFilter(reviews, search as string);
    }

    // Apply other filters
    reviews = applyFilters(reviews, filters);

    // Sort
    reviews = sortReviews(reviews, sortBy as string, validSortOrder);

    // Paginate
    const total = reviews.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = reviews.slice(startIndex, endIndex);

    const response: GetGuideReviewsResponse = {
      success: true,
      code: 200,
      data: paginated,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
      stats: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingBreakdown,
      },
      filters: {
        ...(search && { search: search as string }),
        ...(minRating && { minRating: parseInt(minRating as string, 10) }),
        ...(maxRating && { maxRating: parseInt(maxRating as string, 10) }),
        ...(touristId && { touristId: touristId as string }),
        sortBy: sortBy as string,
        sortOrder: validSortOrder,
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching guide reviews:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch reviews',
    });
  }
}

