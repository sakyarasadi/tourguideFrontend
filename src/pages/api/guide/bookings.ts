import type { NextApiRequest, NextApiResponse } from 'next';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface GuideBooking {
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

interface GetGuideBookingsResponse {
  success: boolean;
  code: number;
  data: GuideBooking[];
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
    touristId?: string;
    minPrice?: number;
    maxPrice?: number;
    startDateFrom?: string;
    startDateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

interface UpdateBookingResponse {
  success: boolean;
  code: number;
  message: string;
  data?: {
    bookingId: string;
    status: string;
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

const applySearchFilter = (bookings: GuideBooking[], searchTerm: string): GuideBooking[] => {
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

const applyFilters = (
  bookings: GuideBooking[],
  filters: {
    status?: string;
    touristId?: string;
    minPrice?: number;
    maxPrice?: number;
    startDateFrom?: string;
    startDateTo?: string;
  },
): GuideBooking[] => {
  return bookings.filter((booking) => {
    if (filters.status && booking.status !== filters.status) return false;
    if (filters.touristId && booking.touristId !== filters.touristId) return false;

    if (filters.minPrice !== undefined && (booking.agreedPrice || 0) < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && (booking.agreedPrice || 0) > filters.maxPrice) return false;

    if (filters.startDateFrom && booking.startDate < filters.startDateFrom) return false;
    if (filters.startDateTo && booking.startDate > filters.startDateTo) return false;

    return true;
  });
};

const sortBookings = (
  bookings: GuideBooking[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): GuideBooking[] => {
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
        aValue = a.agreedPrice || 0;
        bValue = b.agreedPrice || 0;
        break;
      case 'title':
        aValue = a.title || '';
        bValue = b.title || '';
        break;
      case 'destination':
        aValue = a.destination || '';
        bValue = b.destination || '';
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
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
  res: NextApiResponse<GetGuideBookingsResponse | UpdateBookingResponse | ErrorResponse>,
) {
  if (req.method === 'GET') {
    try {
      const {
        guideId,
        search,
        status,
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
        status: status as string | undefined,
        touristId: touristId as string | undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        startDateFrom: startDateFrom as string | undefined,
        startDateTo: startDateTo as string | undefined,
      };

      const validSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

      let firestoreQuery = query(collection(db, 'bookings'), where('guideId', '==', guideId));
      const firestoreFilters: any[] = [where('guideId', '==', guideId)];

      if (filters.status) {
        firestoreFilters.push(where('status', '==', filters.status));
      }
      if (filters.touristId) {
        firestoreFilters.push(where('touristId', '==', filters.touristId));
      }

      if (firestoreFilters.length > 1) {
        firestoreQuery = query(collection(db, 'bookings'), ...firestoreFilters);
      }

      const snapshot = await getDocs(firestoreQuery);

      let bookings: GuideBooking[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
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
      const paginated = bookings.slice(startIndex, endIndex);

      const response: GetGuideBookingsResponse = {
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
          ...(status && { status: status as string }),
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
      console.error('Error fetching guide bookings:', error);
      return res.status(500).json({
        success: false,
        code: 500,
        error: 'Internal server error',
        message: error.message || 'Failed to fetch bookings',
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      code: 405,
      error: 'Method not allowed',
      message: 'Only GET method is supported',
    });
  }
}

