import type { NextApiRequest, NextApiResponse } from 'next';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

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

interface GetTourRequestResponse {
  success: boolean;
  code: number;
  data: TourRequest;
}

interface UpdateTourRequestResponse {
  success: boolean;
  code: number;
  data: TourRequest;
  message?: string;
}

interface DeleteTourRequestResponse {
  success: boolean;
  code: number;
  message: string;
}

interface ErrorResponse {
  success: false;
  code: number;
  error: string;
  message?: string;
}

// GET - Get single tour request
// PUT - Update tour request
// DELETE - Cancel/Delete tour request
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetTourRequestResponse | UpdateTourRequestResponse | DeleteTourRequestResponse | ErrorResponse>,
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      code: 400,
      error: 'Bad request',
      message: 'Request ID is required',
    });
  }

  if (req.method === 'GET') {
    try {
      const docRef = doc(db, 'tourRequests', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).json({
          success: false,
          code: 404,
          error: 'Not found',
          message: 'Tour request not found',
        });
      }

      const data = docSnap.data() as any;
      const request: TourRequest = {
        id: docSnap.id,
        title: data.title,
        destination: data.destination,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: data.budget,
        numberOfPeople: data.numberOfPeople,
        tourType: data.tourType,
        languages: data.languages ?? [],
        description: data.description,
        requirements: data.requirements,
        touristId: data.touristId,
        touristName: data.touristName,
        applicationCount: data.applicationCount ?? 0,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      return res.status(200).json({
        success: true,
        code: 200,
        data: request,
      });
    } catch (error: any) {
      console.error('Error fetching tour request:', error);
      return res.status(500).json({
        success: false,
        code: 500,
        error: 'Internal server error',
        message: error.message || 'Failed to fetch tour request',
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const docRef = doc(db, 'tourRequests', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).json({
          success: false,
          code: 404,
          error: 'Not found',
          message: 'Tour request not found',
        });
      }

      const existingData = docSnap.data();
      const {
        title,
        destination,
        startDate,
        endDate,
        budget,
        numberOfPeople,
        tourType,
        languages,
        description,
        requirements,
      } = req.body;

      // Only allow updates if request is still open
      if (existingData.status !== 'open') {
        return res.status(400).json({
          success: false,
          code: 400,
          error: 'Bad request',
          message: 'Cannot update tour request that is not open',
        });
      }

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (title !== undefined) updateData.title = title.trim();
      if (destination !== undefined) updateData.destination = destination.trim();
      if (startDate !== undefined) updateData.startDate = startDate;
      if (endDate !== undefined) updateData.endDate = endDate;
      if (budget !== undefined) {
        const budgetNum = Number(budget);
        if (budgetNum <= 0) {
          return res.status(400).json({
            success: false,
            code: 400,
            error: 'Bad request',
            message: 'Budget must be greater than 0',
          });
        }
        updateData.budget = budgetNum;
      }
      if (numberOfPeople !== undefined) {
        const peopleNum = Number(numberOfPeople);
        if (peopleNum <= 0) {
          return res.status(400).json({
            success: false,
            code: 400,
            error: 'Bad request',
            message: 'Number of people must be greater than 0',
          });
        }
        updateData.numberOfPeople = peopleNum;
      }
      if (tourType !== undefined) updateData.tourType = tourType;
      if (languages !== undefined) updateData.languages = Array.isArray(languages) ? languages : [];
      if (description !== undefined) updateData.description = description.trim();
      if (requirements !== undefined) updateData.requirements = requirements?.trim() || '';

      // Validate dates if both are provided
      if (updateData.startDate && updateData.endDate) {
        if (new Date(updateData.startDate) > new Date(updateData.endDate)) {
          return res.status(400).json({
            success: false,
            code: 400,
            error: 'Bad request',
            message: 'Start date must be before or equal to end date',
          });
        }
      } else if (updateData.startDate && existingData.endDate) {
        if (new Date(updateData.startDate) > new Date(existingData.endDate)) {
          return res.status(400).json({
            success: false,
            code: 400,
            error: 'Bad request',
            message: 'Start date must be before or equal to end date',
          });
        }
      } else if (updateData.endDate && existingData.startDate) {
        if (new Date(existingData.startDate) > new Date(updateData.endDate)) {
          return res.status(400).json({
            success: false,
            code: 400,
            error: 'Bad request',
            message: 'Start date must be before or equal to end date',
          });
        }
      }

      await updateDoc(docRef, updateData);

      const updatedDoc = await getDoc(docRef);
      const updatedData = updatedDoc.data() as any;

      const response: UpdateTourRequestResponse = {
        success: true,
        code: 200,
        data: {
          id: updatedDoc.id,
          title: updatedData.title,
          destination: updatedData.destination,
          startDate: updatedData.startDate,
          endDate: updatedData.endDate,
          budget: updatedData.budget,
          numberOfPeople: updatedData.numberOfPeople,
          tourType: updatedData.tourType,
          languages: updatedData.languages ?? [],
          description: updatedData.description,
          requirements: updatedData.requirements,
          touristId: updatedData.touristId,
          touristName: updatedData.touristName,
          applicationCount: updatedData.applicationCount ?? 0,
          status: updatedData.status,
          createdAt: updatedData.createdAt,
          updatedAt: updatedData.updatedAt,
        },
        message: 'Tour request updated successfully',
      };

      return res.status(200).json(response);
    } catch (error: any) {
      console.error('Error updating tour request:', error);
      return res.status(500).json({
        success: false,
        code: 500,
        error: 'Internal server error',
        message: error.message || 'Failed to update tour request',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const docRef = doc(db, 'tourRequests', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).json({
          success: false,
          code: 404,
          error: 'Not found',
          message: 'Tour request not found',
        });
      }

      const data = docSnap.data();
      
      // Instead of deleting, mark as cancelled
      await updateDoc(docRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Tour request cancelled successfully',
      });
    } catch (error: any) {
      console.error('Error cancelling tour request:', error);
      return res.status(500).json({
        success: false,
        code: 500,
        error: 'Internal server error',
        message: error.message || 'Failed to cancel tour request',
      });
    }
  }

  return res.status(405).json({
    success: false,
    code: 405,
    error: 'Method not allowed',
    message: 'Only GET, PUT, and DELETE methods are supported',
  });
}

