import type { NextApiRequest, NextApiResponse } from 'next';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
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

async function getBooking(
  req: NextApiRequest,
  res: NextApiResponse<GetBookingResponse | ErrorResponse>,
) {
  try {
    const { id, requestId, guideId } = req.query;

    let bookingData: any = null;
    let bookingId: string = '';

    if (id && typeof id === 'string' && id !== 'search' && id !== '0') {
      const bookingRef = doc(db, 'bookings', id);
      const bookingSnap = await getDoc(bookingRef);
      
      if (bookingSnap.exists()) {
        bookingData = bookingSnap.data();
        bookingId = bookingSnap.id;
      }
    }
    
    if (!bookingData && requestId && guideId && typeof requestId === 'string' && typeof guideId === 'string') {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('requestId', '==', requestId),
        where('guideId', '==', guideId)
      );
      const snapshot = await getDocs(bookingsQuery);
      
      if (!snapshot.empty) {
        const bookingDoc = snapshot.docs[0];
        bookingData = bookingDoc.data();
        bookingId = bookingDoc.id;
      }
    }
    
    if (!bookingData) {
      return res.status(404).json({
        success: false,
        code: 404,
        error: 'Not found',
        message: 'Booking not found',
      });
    }

    const requestRef = doc(db, 'tourRequests', bookingData.requestId);
    const requestSnap = await getDoc(requestRef);
    const requestData = requestSnap.exists() ? requestSnap.data() : {};

    const booking: BookingDetails = {
      id: bookingId,
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

  try {
    const { id } = req.query;
    const { status } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Booking ID is required',
      });
    }

    if (!status || !['pending', 'upcoming', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Valid status is required',
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

    await updateDoc(bookingRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Booking updated successfully',
      data: {
        bookingId: id,
        status,
      },
    });
  } catch (error: any) {
    console.error('Error updating booking:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to update booking',
    });
  }
}

