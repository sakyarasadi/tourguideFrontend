import type { NextApiRequest, NextApiResponse } from 'next';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface TourApplication {
  id: string;
  requestId: string;
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
}

interface GetApplicationsResponse {
  success: boolean;
  code: number;
  data: TourApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters?: {
    requestId?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: string;
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

const applyFilters = (applications: TourApplication[], filters: {
  status?: string;
  minPrice?: number;
  maxPrice?: number;
}): TourApplication[] => {
  return applications.filter((application) => {
    if (filters.status && application.status !== filters.status) {
      return false;
    }

    if (filters.minPrice !== undefined && application.proposedPrice < filters.minPrice) {
      return false;
    }

    if (filters.maxPrice !== undefined && application.proposedPrice > filters.maxPrice) {
      return false;
    }

    return true;
  });
};

const sortApplications = (
  applications: TourApplication[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): TourApplication[] => {
  const sorted = [...applications];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'proposedPrice':
        aValue = a.proposedPrice;
        bValue = b.proposedPrice;
        break;
      case 'rating':
        aValue = a.rating ?? 0;
        bValue = b.rating ?? 0;
        break;
      case 'createdAt':
        aValue = a.createdAt?.toMillis?.() || 0;
        bValue = b.createdAt?.toMillis?.() || 0;
        break;
      case 'updatedAt':
        aValue = a.updatedAt?.toMillis?.() || 0;
        bValue = b.updatedAt?.toMillis?.() || 0;
        break;
      case 'guideName':
        aValue = a.guideName.toLowerCase();
        bValue = b.guideName.toLowerCase();
        break;
      default:
        aValue = a.updatedAt?.toMillis?.() || 0;
        bValue = b.updatedAt?.toMillis?.() || 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetApplicationsResponse | ErrorResponse>,
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
      requestId,
      status,
      minPrice,
      maxPrice,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      page = '1',
      limit: limitParam = '10',
    } = req.query;

    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'requestId is required as a query parameter',
      });
    }

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 10));

    const filters = {
      status: status as string | undefined,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
    };

    const validSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get applications from subcollection
    const applicationsRef = collection(doc(db, 'tourRequests', requestId), 'applications');
    const appsQuery = query(applicationsRef, orderBy('updatedAt', 'desc'));
    const appsSnapshot = await getDocs(appsQuery);

    let applications: TourApplication[] = appsSnapshot.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        requestId,
        guideId: data.guideId,
        guideName: data.guideName,
        guideEmail: data.guideEmail,
        proposedPrice: data.proposedPrice,
        coverLetter: data.coverLetter,
        status: (data.status ?? 'pending') as TourApplication['status'],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        experience: data.experience,
        languages: data.languages,
        rating: data.rating,
        reviews: data.reviews,
      };
    });

    applications = applyFilters(applications, filters);
    applications = sortApplications(applications, sortBy as string, validSortOrder);

    const total = applications.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = applications.slice(startIndex, endIndex);

    const response: GetApplicationsResponse = {
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
      filters: {
        requestId,
        ...(status && { status: status as string }),
        ...(minPrice && { minPrice: parseFloat(minPrice as string) }),
        ...(maxPrice && { maxPrice: maxPrice as string }),
        sortBy: sortBy as string,
        sortOrder: validSortOrder,
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch applications',
    });
  }
}

