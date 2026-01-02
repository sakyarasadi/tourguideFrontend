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
import { db } from '../../../../lib/firebase';

export interface ApplicationDetails {
  id: string;
  requestId: string;
  guideId: string;
  guideName?: string;
  guideEmail?: string;
  tourTitle: string;
  destination: string;
  touristName?: string;
  touristId?: string;
  startDate: string;
  endDate: string;
  proposedPrice?: number;
  touristBudget?: number;
  coverLetter?: string;
  status: 'pending' | 'selected' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
  agreedPrice?: number;
  tourType?: string;
  numberOfPeople?: number;
  description?: string;
  requirements?: string;
  languages?: string[];
}

interface GetApplicationResponse {
  success: boolean;
  code: number;
  data: ApplicationDetails;
}

interface UpdateApplicationResponse {
  success: boolean;
  code: number;
  data: ApplicationDetails;
  message?: string;
}

interface ErrorResponse {
  success: false;
  code: number;
  error: string;
  message?: string;
}

async function getApplication(
  req: NextApiRequest,
  res: NextApiResponse<GetApplicationResponse | ErrorResponse>,
) {
  try {
    const { id, requestId } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Application id is required',
      });
    }

    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Request id is required',
      });
    }

    const applicationRef = doc(db, 'tourRequests', requestId, 'applications', id);
    const applicationSnap = await getDoc(applicationRef);

    if (!applicationSnap.exists()) {
      return res.status(404).json({
        success: false,
        code: 404,
        error: 'Not found',
        message: 'Application not found',
      });
    }

    const applicationData = applicationSnap.data() as any;
    const requestRef = doc(db, 'tourRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    const requestData = requestSnap.exists() ? requestSnap.data() : {};

    const application: ApplicationDetails = {
      id: applicationSnap.id,
      requestId,
      guideId: applicationData.guideId,
      guideName: applicationData.guideName,
      guideEmail: applicationData.guideEmail,
      tourTitle: applicationData.tourTitle || requestData.title,
      destination: applicationData.destination || requestData.destination,
      touristName: applicationData.touristName || requestData.touristName,
      touristId: requestData.touristId,
      startDate: applicationData.startDate || requestData.startDate,
      endDate: applicationData.endDate || requestData.endDate,
      proposedPrice: applicationData.proposedPrice,
      touristBudget: applicationData.touristBudget || requestData.budget,
      coverLetter: applicationData.coverLetter,
      status: (applicationData.status ?? 'pending') as ApplicationDetails['status'],
      createdAt: applicationData.createdAt,
      updatedAt: applicationData.updatedAt,
      agreedPrice: applicationData.agreedPrice,
      tourType: applicationData.tourType || requestData.tourType,
      numberOfPeople: requestData.numberOfPeople,
      description: requestData.description,
      requirements: requestData.requirements,
      languages: requestData.languages || [],
    };

    return res.status(200).json({
      success: true,
      code: 200,
      data: application,
    });
  } catch (error: any) {
    console.error('Error fetching application:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to fetch application',
    });
  }
}
    
async function updateApplication(
  req: NextApiRequest,
  res: NextApiResponse<UpdateApplicationResponse | ErrorResponse>,
) {
  try {
    const { id, requestId } = req.query;
    const { proposedPrice, coverLetter, guideId } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Application id is required',
      });
    }

    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Request id is required',
      });
    }

    if (!guideId || typeof guideId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Guide id is required',
      });
    }

    const applicationRef = doc(db, 'tourRequests', requestId, 'applications', id);
    const applicationSnap = await getDoc(applicationRef);

    if (!applicationSnap.exists()) {
      return res.status(404).json({
        success: false,
        code: 404,
        error: 'Not found',
        message: 'Application not found',
      });
    }

    const applicationData = applicationSnap.data() as any;

    if (applicationData.guideId !== guideId) {
      return res.status(403).json({
        success: false,
        code: 403,
        error: 'Forbidden',
        message: 'You can only edit your own applications',
      });
    }

    if (applicationData.status !== 'pending') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad request',
        message: 'Can only edit pending applications',
      });
    }

    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (proposedPrice !== undefined) {
      const price = parseFloat(proposedPrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          code: 400,
          error: 'Bad request',
          message: 'Invalid proposed price',
        });
      }
      updateData.proposedPrice = price;
    }

    if (coverLetter !== undefined) {
      if (typeof coverLetter !== 'string') {
        return res.status(400).json({
          success: false,
          code: 400,
          error: 'Bad request',
          message: 'Cover letter must be a string',
        });
      }
      updateData.coverLetter = coverLetter.trim();
    }

    await updateDoc(applicationRef, updateData);

    const updatedSnap = await getDoc(applicationRef);
    const updatedData = updatedSnap.data() as any;
    const requestRef = doc(db, 'tourRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    const requestData = requestSnap.exists() ? requestSnap.data() : {};

    const updatedApplication: ApplicationDetails = {
      id: updatedSnap.id,
      requestId,
      guideId: updatedData.guideId,
      guideName: updatedData.guideName,
      guideEmail: updatedData.guideEmail,
      tourTitle: updatedData.tourTitle || requestData.title,
      destination: updatedData.destination || requestData.destination,
      touristName: updatedData.touristName || requestData.touristName,
      touristId: requestData.touristId,
      startDate: updatedData.startDate || requestData.startDate,
      endDate: updatedData.endDate || requestData.endDate,
      proposedPrice: updatedData.proposedPrice,
      touristBudget: updatedData.touristBudget || requestData.budget,
      coverLetter: updatedData.coverLetter,
      status: (updatedData.status ?? 'pending') as ApplicationDetails['status'],
      createdAt: updatedData.createdAt,
      updatedAt: updatedData.updatedAt,
      agreedPrice: updatedData.agreedPrice,
      tourType: updatedData.tourType || requestData.tourType,
      numberOfPeople: requestData.numberOfPeople,
      description: requestData.description,
      requirements: requestData.requirements,
      languages: requestData.languages || [],
    };

    return res.status(200).json({
      success: true,
      code: 200,
      data: updatedApplication,
      message: 'Application updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating application:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to update application',
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetApplicationResponse | UpdateApplicationResponse | ErrorResponse>,
) {
  if (req.method === 'GET') {
    return getApplication(req, res);
  } else if (req.method === 'PUT') {
    return updateApplication(req, res);
  } else {
    return res.status(405).json({
      success: false,
      code: 405,
      error: 'Method not allowed',
      message: 'Only GET and PUT methods are supported',
    });
  }
}

