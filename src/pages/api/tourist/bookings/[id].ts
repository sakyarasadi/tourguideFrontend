import type { NextApiRequest, NextApiResponse } from 'next';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export interface BookingDetails {
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
  description?: string;
  requirements?: string;
  languages?: string[];
  createdAt?: any;
  updatedAt?: any;
}

interface GetBookingResponse {
  success: boolean;
  code: number;
  data: BookingDetails;
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

// GET - Get booking by ID
async function getBooking(
  req: NextApiRequest,
  res: NextApiResponse<GetBookingResponse | ErrorResponse>,
) {
  try {
    const { id } = req.query;
    const { touristId } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Booking ID is required',
      });
    }

    if (!touristId || typeof touristId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Tourist ID is required',
      });
    }

    const bookingRef = doc(db, 'bookings', id);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      return res.status(404).json({
        success: false,
        code: 404,
        error: 'Not found',
        message: 'Booking not found',
      });
    }

    const bookingData = bookingSnap.data();

    // Verify booking belongs to the tourist
    if (bookingData.touristId !== touristId) {
      return res.status(403).json({
        success: false,
        code: 403,
        error: 'Forbidden',
        message: 'You do not have permission to view this booking',
      });
    }

    // Get tour request details for additional info
    const requestRef = doc(db, 'tourRequests', bookingData.requestId);
    const requestSnap = await getDoc(requestRef);
    const requestData = requestSnap.exists() ? requestSnap.data() : {};

    const booking: BookingDetails = {
      id: bookingSnap.id,
      requestId: bookingData.requestId,
      touristId: bookingData.touristId,
      touristName: bookingData.touristName,
      guideId: bookingData.guideId,
      guideName: bookingData.guideName,
      title: bookingData.title,
      destination: bookingData.destination,
      startDate: bookingData.startDate,
      endDate: bookingData.endDate,
      status: bookingData.status || 'pending',
      agreedPrice: bookingData.agreedPrice,
      numberOfPeople: bookingData.numberOfPeople,
      budget: bookingData.budget,
      tourType: bookingData.tourType,
      description: requestData.description,
      requirements: requestData.requirements,
      languages: requestData.languages || [],
      createdAt: bookingData.createdAt,
      updatedAt: bookingData.updatedAt,
    };

    return res.status(200).json({
      success: true,
      code: 200,
      data: booking,
    });
  } catch (error: any) {
    console.error('Error fetching booking:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch booking',
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetBookingResponse | UpdateBookingResponse | ErrorResponse>,
) {
  if (req.method === 'GET') {
    return getBooking(req, res);
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({
      success: false,
      code: 405,
      error: 'Method not allowed',
      message: 'Only GET and PATCH methods are supported',
    });
  }

  // PATCH - Cancel booking
  try {
    const { id } = req.query;
    const { status, touristId } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Booking ID is required',
      });
    }

    if (!touristId || typeof touristId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Tourist ID is required',
      });
    }

    if (!status || status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Only cancellation is allowed for tourists',
      });
    }

    const bookingRef = doc(db, 'bookings', id);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      return res.status(404).json({
        success: false,
        code: 404,
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const bookingData = bookingSnap.data();

    // Verify booking belongs to the tourist
    if (bookingData.touristId !== touristId) {
      return res.status(403).json({
        success: false,
        code: 403,
        error: 'Forbidden',
        message: 'You do not have permission to cancel this booking',
      });
    }

    // Check if booking is already cancelled or completed
    if (bookingData.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Booking is already cancelled',
      });
    }

    if (bookingData.status === 'completed') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Cannot cancel a completed booking',
      });
    }

    // Check if cancellation is allowed (at least 24 hours before start date)
    const startDate = new Date(bookingData.startDate);
    const now = new Date();
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < 24) {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Bookings can only be cancelled at least 24 hours before the start date',
      });
    }

    await updateDoc(bookingRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Booking cancelled successfully',
      data: {
        bookingId: id,
        status: 'cancelled',
      },
    });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to cancel booking',
    });
  }
}

