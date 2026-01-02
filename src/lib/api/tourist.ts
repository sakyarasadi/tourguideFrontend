// API helper functions for tourist operations

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

interface ApiResponse<T> {
  success: boolean;
  code: number;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface ListResponse<T> {
  success: boolean;
  code: number;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters?: any;
}

// Get tour requests with filters
export async function getTourRequests(params?: {
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
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<ListResponse<TourRequest>> {
  const queryParams = new URLSearchParams();
  
  if (params?.search) queryParams.append('search', params.search);
  if (params?.tourType) queryParams.append('tourType', params.tourType);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.touristId) queryParams.append('touristId', params.touristId);
  if (params?.minBudget !== undefined) queryParams.append('minBudget', params.minBudget.toString());
  if (params?.maxBudget !== undefined) queryParams.append('maxBudget', params.maxBudget.toString());
  if (params?.minPeople !== undefined) queryParams.append('minPeople', params.minPeople.toString());
  if (params?.maxPeople !== undefined) queryParams.append('maxPeople', params.maxPeople.toString());
  if (params?.startDateFrom) queryParams.append('startDateFrom', params.startDateFrom);
  if (params?.startDateTo) queryParams.append('startDateTo', params.startDateTo);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await fetch(`/api/tourist/requests?${queryParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch tour requests');
  }
  return response.json();
}

// Get single tour request
export async function getTourRequest(id: string): Promise<ApiResponse<TourRequest>> {
  const response = await fetch(`/api/tourist/requests/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch tour request');
  }
  return response.json();
}

// Create tour request
export async function createTourRequest(data: {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  numberOfPeople: number;
  tourType: string;
  languages?: string[];
  description: string;
  requirements?: string;
  touristId: string;
  touristName?: string;
  touristEmail?: string;
}): Promise<ApiResponse<TourRequest>> {
  const response = await fetch('/api/tourist/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create tour request');
  }
  return response.json();
}

// Update tour request
export async function updateTourRequest(
  id: string,
  data: Partial<{
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    budget: number;
    numberOfPeople: number;
    tourType: string;
    languages: string[];
    description: string;
    requirements: string;
  }>
): Promise<ApiResponse<TourRequest>> {
  const response = await fetch(`/api/tourist/requests/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update tour request');
  }
  return response.json();
}

// Cancel tour request
export async function cancelTourRequest(id: string): Promise<{ success: boolean; code: number; message: string }> {
  const response = await fetch(`/api/tourist/requests/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to cancel tour request');
  }
  return response.json();
}

// Get bookings
export async function getBookings(params?: {
  search?: string;
  status?: string;
  guideId?: string;
  touristId?: string;
  minPrice?: number;
  maxPrice?: number;
  startDateFrom?: string;
  startDateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<ListResponse<Booking>> {
  const queryParams = new URLSearchParams();
  
  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.guideId) queryParams.append('guideId', params.guideId);
  if (params?.touristId) queryParams.append('touristId', params.touristId);
  if (params?.minPrice !== undefined) queryParams.append('minPrice', params.minPrice.toString());
  if (params?.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice.toString());
  if (params?.startDateFrom) queryParams.append('startDateFrom', params.startDateFrom);
  if (params?.startDateTo) queryParams.append('startDateTo', params.startDateTo);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await fetch(`/api/tourist/bookings?${queryParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch bookings');
  }
  return response.json();
}

// Get applications for a request
export async function getApplications(requestId: string, params?: {
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<ListResponse<TourApplication>> {
  const queryParams = new URLSearchParams();
  queryParams.append('requestId', requestId);
  
  if (params?.status) queryParams.append('status', params.status);
  if (params?.minPrice !== undefined) queryParams.append('minPrice', params.minPrice.toString());
  if (params?.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice.toString());
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await fetch(`/api/tourist/applications?${queryParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch applications');
  }
  return response.json();
}

// Accept application
export async function acceptApplication(
  applicationId: string,
  requestId: string
): Promise<{ success: boolean; code: number; message: string; data?: { bookingId: string; requestId: string; applicationId: string } }> {
  const response = await fetch(`/api/tourist/applications/${applicationId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requestId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to accept application');
  }
  return response.json();
}

