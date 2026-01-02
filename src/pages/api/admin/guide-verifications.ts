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
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface GuideVerification {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  nicDocument?: string;
  touristDeptIdDocument?: string;
  policeReportDocument?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: any;
  createdAt: any;
  updatedAt: any;
}

interface GetGuideVerificationsResponse {
  success: boolean;
  code: number;
  data: GuideVerification[];
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

const applySearchFilter = (verifications: GuideVerification[], searchTerm: string): GuideVerification[] => {
  if (!searchTerm) return verifications;

  const lowerSearch = searchTerm.toLowerCase();
  return verifications.filter((verification) => {
    return (
      matchesSearch(verification.firstName, lowerSearch) ||
      matchesSearch(verification.lastName, lowerSearch) ||
      matchesSearch(verification.email, lowerSearch) ||
      matchesSearch(verification.phone, lowerSearch) ||
      matchesSearch(`${verification.firstName} ${verification.lastName}`, lowerSearch)
    );
  });
};

const applyFilters = (
  verifications: GuideVerification[],
  filters: {
    status?: string;
  },
): GuideVerification[] => {
  return verifications.filter((verification) => {
    if (filters.status && verification.status !== filters.status) return false;
    return true;
  });
};

const sortVerifications = (
  verifications: GuideVerification[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): GuideVerification[] => {
  const sorted = [...verifications];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'firstName':
        aValue = a.firstName || '';
        bValue = b.firstName || '';
        break;
      case 'lastName':
        aValue = a.lastName || '';
        bValue = b.lastName || '';
        break;
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
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
  res: NextApiResponse<GetGuideVerificationsResponse | ErrorResponse>,
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
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit: limitParam = '10',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 10));

    const filters = {
      status: status as string | undefined,
    };

    const validSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    let firestoreQuery = query(collection(db, 'guides'));
    const firestoreFilters: any[] = [];

    if (filters.status) {
      firestoreFilters.push(where('status', '==', filters.status));
    }

    if (firestoreFilters.length > 0) {
      firestoreQuery = query(collection(db, 'guides'), ...firestoreFilters);
    }

    const snapshot = await getDocs(firestoreQuery);

    const verifications: GuideVerification[] = [];
    for (const docSnap of snapshot.docs) {
      const guideData = docSnap.data();
      const userId = docSnap.id;

      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const documents = guideData.documents || {};
        verifications.push({
          id: docSnap.id,
          userId: userId,
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          status: guideData.status || 'pending',
          nicDocument: documents.nicDocument || guideData.nicDocument,
          touristDeptIdDocument: documents.touristDeptIdDocument || guideData.touristDeptIdDocument,
          policeReportDocument: documents.policeReportDocument || guideData.policeReportDocument,
          rejectionReason: guideData.rejectionReason,
          reviewedBy: guideData.reviewedBy,
          reviewedAt: guideData.reviewedAt,
          createdAt: guideData.createdAt,
          updatedAt: guideData.updatedAt,
        });
      }
    }

    let filteredVerifications = verifications;
    if (search) {
      filteredVerifications = applySearchFilter(filteredVerifications, search as string);
    }

    filteredVerifications = applyFilters(filteredVerifications, filters);

    filteredVerifications = sortVerifications(filteredVerifications, sortBy as string, validSortOrder);

    const total = filteredVerifications.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filteredVerifications.slice(startIndex, endIndex);

    const response: GetGuideVerificationsResponse = {
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
        sortBy: sortBy as string,
        sortOrder: validSortOrder,
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching guide verifications:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch guide verifications',
    });
  }
}

