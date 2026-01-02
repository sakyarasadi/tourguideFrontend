import type { NextApiRequest, NextApiResponse } from 'next';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface GuideApplication {
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
}

interface GetGuideApplicationsResponse {
  success: boolean;
  code: number;
  data: GuideApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters?: {
    guideId: string;
    search?: string;
    status?: string;
    minProposedPrice?: number;
    maxProposedPrice?: number;
    minAgreedPrice?: number;
    maxAgreedPrice?: number;
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

const applySearchFilter = (applications: GuideApplication[], searchTerm: string): GuideApplication[] => {
  if (!searchTerm) return applications;

  const lowerSearch = searchTerm.toLowerCase();
  return applications.filter((application) => {
    return (
      matchesSearch(application.tourTitle, lowerSearch) ||
      matchesSearch(application.destination, lowerSearch) ||
      matchesSearch(application.tourType, lowerSearch) ||
      matchesSearch(application.touristName, lowerSearch)
    );
  });
};

const applyFilters = (
  applications: GuideApplication[],
  filters: {
    status?: string;
    minProposedPrice?: number;
    maxProposedPrice?: number;
    minAgreedPrice?: number;
    maxAgreedPrice?: number;
  },
): GuideApplication[] => {
  return applications.filter((application) => {
    if (filters.status && application.status !== filters.status) return false;

    if (filters.minProposedPrice !== undefined && (application.proposedPrice || 0) < filters.minProposedPrice) {
      return false;
    }
    if (filters.maxProposedPrice !== undefined && (application.proposedPrice || 0) > filters.maxProposedPrice) {
      return false;
    }

    if (filters.minAgreedPrice !== undefined && (application.agreedPrice || 0) < filters.minAgreedPrice) {
      return false;
    }
    if (filters.maxAgreedPrice !== undefined && (application.agreedPrice || 0) > filters.maxAgreedPrice) {
      return false;
    }

    return true;
  });
};

const sortApplications = (
  applications: GuideApplication[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): GuideApplication[] => {
  const sorted = [...applications];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'startDate':
        aValue = a.startDate;
        bValue = b.startDate;
        break;
      case 'proposedPrice':
        aValue = a.proposedPrice || 0;
        bValue = b.proposedPrice || 0;
        break;
      case 'agreedPrice':
        aValue = a.agreedPrice || 0;
        bValue = b.agreedPrice || 0;
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
  res: NextApiResponse<GetGuideApplicationsResponse | ErrorResponse>,
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
      status,
      minProposedPrice,
      maxProposedPrice,
      minAgreedPrice,
      maxAgreedPrice,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      page = '1',
      limit: limitParam = '10',
    } = req.query;

    if (!guideId || typeof guideId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'guideId is required as a query parameter',
      });
    }

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 10));

    const filters = {
      status: status as string | undefined,
      minProposedPrice: minProposedPrice ? parseFloat(minProposedPrice as string) : undefined,
      maxProposedPrice: maxProposedPrice ? parseFloat(maxProposedPrice as string) : undefined,
      minAgreedPrice: minAgreedPrice ? parseFloat(minAgreedPrice as string) : undefined,
      maxAgreedPrice: maxAgreedPrice ? parseFloat(maxAgreedPrice as string) : undefined,
    };

    const validSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    const requestsSnapshot = await getDocs(collection(db, 'tourRequests'));

    const applicationsArrays = await Promise.all(
      requestsSnapshot.docs.map(async (requestDoc) => {
        const requestId = requestDoc.id;
        const applicationsRef = collection(doc(db, 'tourRequests', requestId), 'applications');
        const q = query(applicationsRef, where('guideId', '==', guideId));
        const appsSnapshot = await getDocs(q);

        return appsSnapshot.docs.map((appDoc) => {
          const data = appDoc.data() as any;
          return {
            id: appDoc.id,
            requestId,
            tourTitle: data.tourTitle,
            destination: data.destination,
            touristName: data.touristName,
            startDate: data.startDate,
            endDate: data.endDate,
            proposedPrice: data.proposedPrice,
            touristBudget: data.touristBudget,
            status: (data.status ?? 'pending') as GuideApplication['status'],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            agreedPrice: data.agreedPrice,
            competitorCount: data.competitorCount,
            tourType: data.tourType,
            coverLetter: data.coverLetter,
          } as GuideApplication;
        });
      }),
    );

    let applications: GuideApplication[] = applicationsArrays.flat();

    if (search) {
      applications = applySearchFilter(applications, search as string);
    }

    applications = applyFilters(applications, filters);
    applications = sortApplications(applications, sortBy as string, validSortOrder);

    const total = applications.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = applications.slice(startIndex, endIndex);

    const response: GetGuideApplicationsResponse = {
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
        guideId,
        ...(search && { search: search as string }),
        ...(status && { status: status as string }),
        ...(minProposedPrice && { minProposedPrice: parseFloat(minProposedPrice as string) }),
        ...(maxProposedPrice && { maxProposedPrice: parseFloat(maxProposedPrice as string) }),
        ...(minAgreedPrice && { minAgreedPrice: parseFloat(minAgreedPrice as string) }),
        ...(maxAgreedPrice && { maxAgreedPrice: parseFloat(maxAgreedPrice as string) }),
        sortBy: sortBy as string,
        sortOrder: validSortOrder,
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching guide applications:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch guide applications',
    });
  }
}


