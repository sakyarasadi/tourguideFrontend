import type { NextApiRequest, NextApiResponse } from 'next';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface GuidePayout {
  id: string;
  guideId: string;
  bookingId?: string;
  amount: number;
  type: 'earning' | 'payout' | 'refund';
  status: 'pending' | 'cleared' | 'completed' | 'failed';
  description?: string;
  payoutMethod?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface GetGuidePayoutsResponse {
  success: boolean;
  code: number;
  data: GuidePayout[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary?: {
    availableBalance: number;
    pendingPayouts: number;
    totalEarnings: number;
    lastPayout?: number;
  };
  filters?: {
    search?: string;
    type?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: string;
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

const applySearchFilter = (payouts: GuidePayout[], searchTerm: string): GuidePayout[] => {
  if (!searchTerm) return payouts;

  const lowerSearch = searchTerm.toLowerCase();
  return payouts.filter((payout) => {
    return (
      matchesSearch(payout.description, lowerSearch) ||
      matchesSearch(payout.bookingId, lowerSearch) ||
      matchesSearch(payout.payoutMethod, lowerSearch)
    );
  });
};

const applyFilters = (
  payouts: GuidePayout[],
  filters: {
    type?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
  },
): GuidePayout[] => {
  return payouts.filter((payout) => {
    if (filters.type && payout.type !== filters.type) return false;
    if (filters.status && payout.status !== filters.status) return false;
    if (filters.minAmount !== undefined && payout.amount < filters.minAmount) return false;
    if (filters.maxAmount !== undefined && payout.amount > filters.maxAmount) return false;
    return true;
  });
};

const sortPayouts = (
  payouts: GuidePayout[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): GuidePayout[] => {
  const sorted = [...payouts];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'amount':
        aValue = a.amount || 0;
        bValue = b.amount || 0;
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
  res: NextApiResponse<GetGuidePayoutsResponse | ErrorResponse>,
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
      type,
      status,
      minAmount,
      maxAmount,
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
      type: type as string | undefined,
      status: status as string | undefined,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
    };

    const validSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    let payoutsQuery = query(collection(db, 'payouts'), where('guideId', '==', guideId));
    const payoutsSnapshot = await getDocs(payoutsQuery);
    
    let payouts: GuidePayout[] = payoutsSnapshot.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        guideId: data.guideId || '',
        bookingId: data.bookingId,
        amount: data.amount || 0,
        type: data.type || 'earning',
        status: data.status || 'pending',
        description: data.description,
        payoutMethod: data.payoutMethod,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('guideId', '==', guideId),
      where('status', '==', 'completed')
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    
    const earningsFromBookings: GuidePayout[] = bookingsSnapshot.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: `earning-${docSnap.id}`,
        guideId: data.guideId || '',
        bookingId: docSnap.id,
        amount: data.agreedPrice || 0,
        type: 'earning' as const,
        status: 'cleared' as const,
        description: `Earnings from "${data.title || 'Tour'}"`,
        createdAt: data.updatedAt || data.createdAt,
        updatedAt: data.updatedAt || data.createdAt,
      };
    });

    payouts = [...payouts, ...earningsFromBookings];

    const availableBalance = payouts
      .filter((p) => p.type === 'earning' && p.status === 'cleared')
      .reduce((sum, p) => sum + p.amount, 0) -
      payouts
        .filter((p) => p.type === 'payout' && p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayouts = payouts
      .filter((p) => p.type === 'payout' && p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalEarnings = payouts
      .filter((p) => p.type === 'earning')
      .reduce((sum, p) => sum + p.amount, 0);

    const lastPayout = payouts
      .filter((p) => p.type === 'payout' && p.status === 'completed')
      .sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      })[0]?.amount;

    if (search) {
      payouts = applySearchFilter(payouts, search as string);
    }

    payouts = applyFilters(payouts, filters);

    payouts = sortPayouts(payouts, sortBy as string, validSortOrder);

    const total = payouts.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = payouts.slice(startIndex, endIndex);

    const response: GetGuidePayoutsResponse = {
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
      summary: {
        availableBalance,
        pendingPayouts,
        totalEarnings,
        lastPayout,
      },
      filters: {
        ...(search && { search: search as string }),
        ...(type && { type: type as string }),
        ...(status && { status: status as string }),
        ...(minAmount && { minAmount: parseFloat(minAmount as string) }),
        ...(maxAmount && { maxAmount: maxAmount as string }),
        sortBy: sortBy as string,
        sortOrder: validSortOrder,
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching guide payouts:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch payouts',
    });
  }
}

