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

interface DashboardStats {
  totalBookings: number;
  earnings: number;
  averageRating: number;
  completedTours: number;
  pendingBookings: number;
  upcomingBookings: number;
  totalApplications: number;
  acceptedApplications: number;
}

interface DashboardResponse {
  success: boolean;
  code: number;
  data: DashboardStats;
}

interface ErrorResponse {
  success: false;
  code: number;
  error: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardResponse | ErrorResponse>,
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
    const { guideId } = req.query;

    if (!guideId || typeof guideId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'guideId is required',
      });
    }

    const bookingsQuery = query(collection(db, 'bookings'), where('guideId', '==', guideId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookings = bookingsSnapshot.docs.map((doc) => doc.data());

    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
    const upcomingBookings = bookings.filter((b) => b.status === 'upcoming').length;
    const completedTours = bookings.filter((b) => b.status === 'completed').length;

    const earnings = bookings
      .filter((b) => b.status === 'completed' && typeof b.agreedPrice === 'number')
      .reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

    const applicationsQuery = query(
      collection(db, 'tourRequests'),
    );
    const requestsSnapshot = await getDocs(applicationsQuery);
    
    let totalApplications = 0;
    let acceptedApplications = 0;
    
    for (const requestDoc of requestsSnapshot.docs) {
      const applicationsRef = collection(db, 'tourRequests', requestDoc.id, 'applications');
      const applicationsSnapshot = await getDocs(
        query(applicationsRef, where('guideId', '==', guideId))
      );
      totalApplications += applicationsSnapshot.size;
      acceptedApplications += applicationsSnapshot.docs.filter(
        (doc) => doc.data().status === 'selected'
      ).length;
    }

    const reviewsQuery = query(collection(db, 'reviews'), where('guideId', '==', guideId));
    const reviewsSnapshot = await getDocs(reviewsQuery);
    const reviews = reviewsSnapshot.docs.map((doc) => doc.data());
    
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

    const stats: DashboardStats = {
      totalBookings,
      earnings,
      averageRating: Math.round(averageRating * 10) / 10,
      completedTours,
      pendingBookings,
      upcomingBookings,
      totalApplications,
      acceptedApplications,
    };

    return res.status(200).json({
      success: true,
      code: 200,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch dashboard stats',
    });
  }
}

