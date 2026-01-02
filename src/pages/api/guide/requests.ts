import type { NextApiRequest, NextApiResponse } from 'next';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface TourRequest {
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
  status?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface GetTourRequestsResponse {
  success: boolean;
  code: number;
  data: TourRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters?: {
    search?: string;
    tourType?: string;
    status?: string;
    touristId?: string;
    minBudget?: number;
    maxBudget?: number;
    minPeople?: number;
    maxPeople?: number;
    startDateFrom?: string;
    startDateTo?: string;
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

const applySearchFilter = (requests: TourRequest[], searchTerm: string): TourRequest[] => {
  if (!searchTerm) return requests;

  const lowerSearch = searchTerm.toLowerCase();
  return requests.filter((request) => {
    return (
      matchesSearch(request.title, lowerSearch) ||
      matchesSearch(request.destination, lowerSearch) ||
      matchesSearch(request.description, lowerSearch) ||
      matchesSearch(request.tourType, lowerSearch) ||
      matchesSearch(request.touristName, lowerSearch)
    );
  });
};

const applyFilters = (
  requests: TourRequest[],
  filters: {
    tourType?: string;
    status?: string;
    touristId?: string;
    minBudget?: number;
    maxBudget?: number;
    minPeople?: number;
    maxPeople?: number;
    startDateFrom?: string;
    startDateTo?: string;
  },
): TourRequest[] => {
  return requests.filter((request) => {
    if (filters.tourType && request.tourType !== filters.tourType) return false;
    if (filters.status && request.status && request.status !== filters.status) return false;
    if (filters.touristId && request.touristId !== filters.touristId) return false;

    if (filters.minBudget !== undefined && request.budget < filters.minBudget) return false;
    if (filters.maxBudget !== undefined && request.budget > filters.maxBudget) return false;

    if (filters.minPeople !== undefined && request.numberOfPeople < filters.minPeople) return false;
    if (filters.maxPeople !== undefined && request.numberOfPeople > filters.maxPeople) return false;

    if (filters.startDateFrom && request.startDate < filters.startDateFrom) return false;
    if (filters.startDateTo && request.startDate > filters.startDateTo) return false;

    return true;
  });
};

const sortRequests = (
  requests: TourRequest[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): TourRequest[] => {
  const sorted = [...requests];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'budget':
        aValue = a.budget;
        bValue = b.budget;
        break;
      case 'startDate':
        aValue = a.startDate;
        bValue = b.startDate;
        break;
      case 'applicationCount':
        aValue = a.applicationCount || 0;
        bValue = b.applicationCount || 0;
        break;
      case 'createdAt':
        aValue = a.createdAt?.toMillis?.() || 0;
        bValue = b.createdAt?.toMillis?.() || 0;
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
  res: NextApiResponse<GetTourRequestsResponse | ErrorResponse>,
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
      search,
      tourType,
      status,
      touristId,
      minBudget,
      maxBudget,
      minPeople,
      maxPeople,
      startDateFrom,
      startDateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit: limitParam = '10',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 10));

    const filters = {
      tourType: tourType as string | undefined,
      status: status as string | undefined,
      touristId: touristId as string | undefined,
      minBudget: minBudget ? parseFloat(minBudget as string) : undefined,
      maxBudget: maxBudget ? parseFloat(maxBudget as string) : undefined,
      minPeople: minPeople ? parseInt(minPeople as string, 10) : undefined,
      maxPeople: maxPeople ? parseInt(maxPeople as string, 10) : undefined,
      startDateFrom: startDateFrom as string | undefined,
      startDateTo: startDateTo as string | undefined,
    };

    const validSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    let firestoreQuery = query(collection(db, 'tourRequests'));
    const firestoreFilters: any[] = [];

    if (filters.status) {
      firestoreFilters.push(where('status', '==', filters.status));
    }
    if (filters.tourType) {
      firestoreFilters.push(where('tourType', '==', filters.tourType));
    }
    if (filters.touristId) {
      firestoreFilters.push(where('touristId', '==', filters.touristId));
    }
    if (filters.minBudget !== undefined) {
      firestoreFilters.push(where('budget', '>=', filters.minBudget));
    }
    if (filters.maxBudget !== undefined) {
      firestoreFilters.push(where('budget', '<=', filters.maxBudget));
    }
    if (filters.startDateFrom) {
      firestoreFilters.push(where('startDate', '>=', filters.startDateFrom));
    }
    if (filters.startDateTo) {
      firestoreFilters.push(where('startDate', '<=', filters.startDateTo));
    }

    if (firestoreFilters.length > 0) {
      firestoreQuery = query(collection(db, 'tourRequests'), ...firestoreFilters);
    }

    const snapshot = await getDocs(firestoreQuery);

    let requests: TourRequest[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
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
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    if (search) {
      requests = applySearchFilter(requests, search as string);
    }

    requests = applyFilters(requests, filters);
    requests = sortRequests(requests, sortBy as string, validSortOrder);

    const total = requests.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = requests.slice(startIndex, endIndex);

    const response: GetTourRequestsResponse = {
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
        ...(search && { search: search as string }),
        ...(tourType && { tourType: tourType as string }),
        ...(status && { status: status as string }),
        ...(touristId && { touristId: touristId as string }),
        ...(minBudget && { minBudget: parseFloat(minBudget as string) }),
        ...(maxBudget && { maxBudget: parseFloat(maxBudget as string) }),
        ...(minPeople && { minPeople: parseInt(minPeople as string, 10) }),
        ...(maxPeople && { maxPeople: parseInt(maxPeople as string, 10) }),
        ...(startDateFrom && { startDateFrom: startDateFrom as string }),
        ...(startDateTo && { startDateTo: startDateTo as string }),
        sortBy: sortBy as string,
        sortOrder: validSortOrder,
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching tour requests:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch tour requests',
    });
  }
}


