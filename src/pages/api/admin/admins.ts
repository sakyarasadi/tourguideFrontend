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

export interface Admin {
  id: string;
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: string;
  role?: string;
  isActive?: boolean;
  createdAt: any;
  updatedAt: any;
}

interface GetAdminsResponse {
  success: boolean;
  code: number;
  data: Admin[];
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
    role?: string;
    isActive?: boolean;
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

const applySearchFilter = (admins: Admin[], searchTerm: string): Admin[] => {
  if (!searchTerm) return admins;

  const lowerSearch = searchTerm.toLowerCase();
  return admins.filter((admin) => {
    return (
      matchesSearch(admin.firstName, lowerSearch) ||
      matchesSearch(admin.lastName, lowerSearch) ||
      matchesSearch(admin.email, lowerSearch) ||
      matchesSearch(admin.phone, lowerSearch) ||
      matchesSearch(admin.role, lowerSearch) ||
      matchesSearch(`${admin.firstName} ${admin.lastName}`, lowerSearch)
    );
  });
};

const applyFilters = (
  admins: Admin[],
  filters: {
    role?: string;
    isActive?: boolean;
  },
): Admin[] => {
  return admins.filter((admin) => {
    if (filters.role && admin.role !== filters.role) return false;
    if (filters.isActive !== undefined && admin.isActive !== filters.isActive) return false;
    return true;
  });
};

const sortAdmins = (
  admins: Admin[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Admin[] => {
  const sorted = [...admins];

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
      case 'role':
        aValue = a.role || '';
        bValue = b.role || '';
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
  res: NextApiResponse<GetAdminsResponse | ErrorResponse>,
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
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit: limitParam = '10',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 10));

    const filters = {
      role: role as string | undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    };

    const validSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    const firestoreQuery = query(collection(db, 'users'), where('userType', '==', 'admin'));

    const snapshot = await getDocs(firestoreQuery);

    const admins: Admin[] = [];
    for (const docSnap of snapshot.docs) {
      const userData = docSnap.data();
      const uid = docSnap.id;

      let adminData = {};
      try {
        const adminDocRef = doc(db, 'admins', uid);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          adminData = adminDocSnap.data();
        }
      } catch (error) {
      }

      admins.push({
        id: uid,
        uid: uid,
        email: userData.email || '',
        firstName: userData.firstName || (adminData as any).firstName || '',
        lastName: userData.lastName || (adminData as any).lastName || '',
        phone: userData.phone || (adminData as any).phone,
        userType: userData.userType || 'admin',
        role: (adminData as any).role || 'admin',
        isActive: (adminData as any).isActive !== undefined ? (adminData as any).isActive : true,
        createdAt: userData.createdAt || (adminData as any).createdAt,
        updatedAt: userData.updatedAt || (adminData as any).updatedAt,
      });
    }

    let filteredAdmins = admins;
    if (search) {
      filteredAdmins = applySearchFilter(filteredAdmins, search as string);
    }

    filteredAdmins = applyFilters(filteredAdmins, filters);

    filteredAdmins = sortAdmins(filteredAdmins, sortBy as string, validSortOrder);

    const total = filteredAdmins.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filteredAdmins.slice(startIndex, endIndex);

    const response: GetAdminsResponse = {
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
        ...(role && { role: role as string }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        sortBy: sortBy as string,
        sortOrder: validSortOrder,
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching admins:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch admins',
    });
  }
}

