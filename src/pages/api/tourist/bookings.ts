import type { NextApiRequest, NextApiResponse } from 'next';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface Booking {
  id: string;
  requestId: string;
  touristId: string;
  touristName?: string;
  guideId: string;
  guideName?: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'upcoming' | 'completed' | 'cancelled';
  agreedPrice?: number;
  numberOfPeople?: number;
  budget?: number;
  tourType?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface GetBookingsResponse {
  success: boolean;
  code: number;
  data: Booking[];
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
    status?: string;
    guideId?: string;
    touristId?: string;
    minPrice?: number;
    maxPrice?: number;
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

const applySearchFilter = (bookings: Booking[], searchTerm: string): Booking[] => {
  if (!searchTerm) return bookings;
  
  const lowerSearch = searchTerm.toLowerCase();
  return bookings.filter((booking) => {
    return (
      matchesSearch(booking.title, lowerSearch) ||
      matchesSearch(booking.destination, lowerSearch) ||
      matchesSearch(booking.touristName, lowerSearch) ||
      matchesSearch(booking.guideName, lowerSearch) ||
      matchesSearch(booking.tourType, lowerSearch)
    );
  });
};

const applyFilters = (bookings: Booking[], filters: {
  status?: string;
  guideId?: string;
  touristId?: string;
  minPrice?: number;
  maxPrice?: number;
  startDateFrom?: string;
  startDateTo?: string;
}): Booking[] => {
  return bookings.filter((booking) => {
    if (filters.status && booking.status !== filters.status) {
      return false;
    }

    if (filters.guideId && booking.guideId !== filters.guideId) {
      return false;
    }

    if (filters.touristId && booking.touristId !== filters.touristId) {
      return false;
    }

    if (filters.minPrice !== undefined && (booking.agreedPrice ?? 0) < filters.minPrice) {
      return false;
    }

    if (filters.maxPrice !== undefined && (booking.agreedPrice ?? 0) > filters.maxPrice) {
      return false;
    }

    if (filters.startDateFrom && booking.startDate < filters.startDateFrom) {
      return false;
    }

    if (filters.startDateTo && booking.startDate > filters.startDateTo) {
      return false;
    }

    return true;
  });
};

const sortBookings = (
  bookings: Booking[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Booking[] => {
  const sorted = [...bookings];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'startDate':
        aValue = a.startDate;
        bValue = b.startDate;
        break;
      case 'endDate':
        aValue = a.endDate;
        bValue = b.endDate;
        break;
      case 'agreedPrice':
        aValue = a.agreedPrice ?? 0;
        bValue = b.agreedPrice ?? 0;
        break;
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'destination':
        aValue = a.destination.toLowerCase();
        bValue = b.destination.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'createdAt':
        aValue = a.createdAt?.toMillis?.() || 0;
        bValue = b.createdAt?.toMillis?.() || 0;
        break;
      default:
        aValue = a.startDate;
        bValue = b.startDate;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetBookingsResponse | ErrorResponse>
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
      status,
      guideId,
      touristId,
      minPrice,
      maxPrice,
      startDateFrom,
      startDateTo,
      sortBy = 'startDate',
      sortOrder = 'asc',
      page = '1',
      limit: limitParam = '10',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 10));

    const filters = {
      status: status as string | undefined,
      guideId: guideId as string | undefined,
      touristId: touristId as string | undefined,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      startDateFrom: startDateFrom as string | undefined,
      startDateTo: startDateTo as string | undefined,
    };

    const validSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

    let firestoreQuery = query(collection(db, 'bookings'));

    const firestoreFilters: any[] = [];

    if (filters.status) {
      firestoreFilters.push(where('status', '==', filters.status));
    }
    if (filters.guideId) {
      firestoreFilters.push(where('guideId', '==', filters.guideId));
    }
    if (filters.touristId) {
      firestoreFilters.push(where('touristId', '==', filters.touristId));
    }
    if (filters.minPrice !== undefined) {
      firestoreFilters.push(where('agreedPrice', '>=', filters.minPrice));
    }
    if (filters.maxPrice !== undefined) {
      firestoreFilters.push(where('agreedPrice', '<=', filters.maxPrice));
    }
    if (filters.startDateFrom) {
      firestoreFilters.push(where('startDate', '>=', filters.startDateFrom));
    }
    if (filters.startDateTo) {
      firestoreFilters.push(where('startDate', '<=', filters.startDateTo));
    }

    if (firestoreFilters.length > 0) {
      firestoreQuery = query(collection(db, 'bookings'), ...firestoreFilters);
    }

    const snapshot = await getDocs(firestoreQuery);
    
    let bookings: Booking[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        requestId: data.requestId || '',
        touristId: data.touristId || '',
        touristName: data.touristName,
        guideId: data.guideId || '',
        guideName: data.guideName,
        title: data.title || '',
        destination: data.destination || '',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        status: data.status || 'pending',
        agreedPrice: data.agreedPrice,
        numberOfPeople: data.numberOfPeople,
        budget: data.budget,
        tourType: data.tourType,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    if (search) {
      bookings = applySearchFilter(bookings, search as string);
    }

    bookings = applyFilters(bookings, filters);

    bookings = sortBookings(bookings, sortBy as string, validSortOrder);

    const total = bookings.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedBookings = bookings.slice(startIndex, endIndex);

    const response: GetBookingsResponse = {
      success: true,
      code: 200,
      data: paginatedBookings,
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
        ...(status && { status: status as string }),
        ...(guideId && { guideId: guideId as string }),
        ...(touristId && { touristId: touristId as string }),
        ...(minPrice && { minPrice: parseFloat(minPrice as string) }),
        ...(maxPrice && { maxPrice: parseFloat(maxPrice as string) }),
        ...(startDateFrom && { startDateFrom: startDateFrom as string }),
        ...(startDateTo && { startDateTo: startDateTo as string }),
        sortBy: sortBy as string,
        sortOrder: validSortOrder,
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch bookings',
    });
  }
}

