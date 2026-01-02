import type { NextApiRequest, NextApiResponse } from 'next';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'tourist' | 'guide' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: any;
  lastLogin?: any;
}

interface GetUsersResponse {
  success: boolean;
  code: number;
  data: User[];
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
    status?: string;
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

const applySearchFilter = (users: User[], searchTerm: string): User[] => {
  if (!searchTerm) return users;

  const lowerSearch = searchTerm.toLowerCase();
  return users.filter((user) => {
    return (
      matchesSearch(user.name, lowerSearch) ||
      matchesSearch(user.email, lowerSearch)
    );
  });
};

const applyFilters = (
  users: User[],
  filters: {
    role?: string;
    status?: string;
  },
): User[] => {
  return users.filter((user) => {
    if (filters.role && user.role !== filters.role) return false;
    if (filters.status && user.status !== filters.status) return false;
    return true;
  });
};

const sortUsers = (
  users: User[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): User[] => {
  const sorted = [...users];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'role':
        aValue = a.role || '';
        bValue = b.role || '';
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
      case 'createdAt':
        aValue = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        bValue = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        break;
      default:
        aValue = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        bValue = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetUsersResponse | ErrorResponse>,
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
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit: limitParam = '10',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limitParam as string, 10) || 10));

    const filters = {
      role: role as string | undefined,
      status: status as string | undefined,
    };

    const validSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    const firestoreFilters: any[] = [];
    
    if (filters.role && filters.role !== 'all') {
      firestoreFilters.push(where('userType', '==', filters.role));
    } else {
      firestoreFilters.push(where('userType', 'in', ['tourist', 'guide']));
    }

    let firestoreQuery;
    if (firestoreFilters.length > 0) {
      firestoreQuery = query(collection(db, 'users'), ...firestoreFilters);
    } else {
      firestoreQuery = query(collection(db, 'users'), where('userType', 'in', ['tourist', 'guide']));
    }

    const snapshot = await getDocs(firestoreQuery);

    const users: User[] = [];
    for (const docSnap of snapshot.docs) {
      const userData = docSnap.data();
      const userId = docSnap.id;

      let userStatus: 'active' | 'inactive' | 'suspended' = 'active';
      
      if (userData.status) {
        if (userData.status === 'approved') {
          userStatus = 'active';
        } else if (userData.status === 'rejected') {
          userStatus = 'suspended';
        } else if (userData.status === 'pending') {
          userStatus = 'inactive';
        }
      }

      const userRole = (userData.userType || 'tourist') as 'tourist' | 'guide' | 'admin';

      users.push({
        id: userId,
        email: userData.email || '',
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email?.split('@')[0] || 'Unknown',
        role: userRole,
        status: userStatus,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
      });
    }

    let filteredUsers = users;
    if (search) {
      filteredUsers = applySearchFilter(filteredUsers, search as string);
    }

    filteredUsers = applyFilters(filteredUsers, filters);

    filteredUsers = sortUsers(filteredUsers, sortBy as string, validSortOrder);

    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filteredUsers.slice(startIndex, endIndex);

    const response: GetUsersResponse = {
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
        ...(status && { status: status as string }),
      },
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch users',
    });
  }
}

