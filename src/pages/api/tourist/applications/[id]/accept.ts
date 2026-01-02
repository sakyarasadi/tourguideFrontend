import type { NextApiRequest, NextApiResponse } from 'next';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  addDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';

interface AcceptApplicationResponse {
  success: boolean;
  code: number;
  message: string;
  data?: {
    bookingId: string;
    requestId: string;
    applicationId: string;
  };
}

interface ErrorResponse {
  success: false;
  code: number;
  error: string;
  message?: string;
}

// POST - Accept a guide application for a tour request
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AcceptApplicationResponse | ErrorResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      code: 405,
      error: 'Method not allowed',
      message: 'Only POST method is supported',
    });
  }

  try {
    const { id: applicationId } = req.query;
    const { requestId } = req.body;

    if (!applicationId || typeof applicationId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Application ID is required',
      });
    }

    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Request ID is required in request body',
      });
    }

    // Get the tour request
    const requestRef = doc(db, 'tourRequests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      return res.status(404).json({
        success: false,
        code: 404,
        error: 'Not found',
        message: 'Tour request not found',
      });
    }

    const requestData = requestSnap.data();

    // Check if request is still open
    if (requestData.status !== 'open') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Tour request is no longer open',
      });
    }

    // Get the application
    const applicationRef = doc(db, 'tourRequests', requestId, 'applications', applicationId);
    const applicationSnap = await getDoc(applicationRef);

    if (!applicationSnap.exists()) {
      return res.status(404).json({
        success: false,
        code: 404,
        error: 'Not found',
        message: 'Application not found',
      });
    }

    const applicationData = applicationSnap.data();

    // Check if application is still pending
    if (applicationData.status !== 'pending') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Application has already been processed',
      });
    }

    // Get all applications for this request
    const applicationsRef = collection(db, 'tourRequests', requestId, 'applications');
    const applicationsSnapshot = await getDocs(applicationsRef);

    // Use batch to update all applications and the request atomically
    const batch = writeBatch(db);

    // Update all applications: selected for the chosen one, rejected for others
    applicationsSnapshot.forEach((appDoc) => {
      const isSelected = appDoc.id === applicationId;
      batch.update(appDoc.ref, {
        status: isSelected ? 'selected' : 'rejected',
        updatedAt: serverTimestamp(),
      });
    });

    // Update the tour request
    batch.update(requestRef, {
      status: 'accepted',
      selectedApplicationId: applicationId,
      selectedGuideId: applicationData.guideId,
      selectedGuideName: applicationData.guideName,
      selectedGuideEmail: applicationData.guideEmail || '',
      selectedPrice: applicationData.proposedPrice,
      updatedAt: serverTimestamp(),
    });

    // Commit the batch
    await batch.commit();

    // Create a booking
    const bookingRef = await addDoc(collection(db, 'bookings'), {
      requestId,
      touristId: requestData.touristId,
      touristName: requestData.touristName,
      guideId: applicationData.guideId,
      guideName: applicationData.guideName,
      status: 'pending',
      title: requestData.title,
      destination: requestData.destination,
      startDate: requestData.startDate,
      endDate: requestData.endDate,
      tourType: requestData.tourType,
      numberOfPeople: requestData.numberOfPeople,
      budget: requestData.budget,
      agreedPrice: applicationData.proposedPrice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Application accepted successfully. Booking created.',
      data: {
        bookingId: bookingRef.id,
        requestId,
        applicationId,
      },
    });
  } catch (error: any) {
    console.error('Error accepting application:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to accept application',
    });
  }
}

