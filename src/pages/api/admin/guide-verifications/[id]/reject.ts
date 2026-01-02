import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';

interface RejectGuideResponse {
  success: boolean;
  code: number;
  message: string;
  data?: {
    userId: string;
    status: string;
  };
}

interface ErrorResponse {
  success: false;
  code: number;
  error: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RejectGuideResponse | ErrorResponse>,
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
    const { id } = req.query;
    const { rejectionReason, reviewedBy } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Guide ID is required',
      });
    }

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Rejection reason is required',
      });
    }

    const guideDocRef = doc(db, 'guides', id);
    const guideDocSnap = await getDoc(guideDocRef);

    if (!guideDocSnap.exists()) {
      return res.status(404).json({
        success: false,
        code: 404,
        error: 'Not Found',
        message: 'Guide not found',
      });
    }

    await updateDoc(guideDocRef, {
      status: 'rejected',
      rejectionReason: rejectionReason,
      reviewedBy: reviewedBy || 'admin',
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const userDocRef = doc(db, 'users', id);
    await updateDoc(userDocRef, {
      status: 'rejected',
      updatedAt: serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Guide rejected successfully',
      data: {
        userId: id,
        status: 'rejected',
      },
    });
  } catch (error: any) {
    console.error('Error rejecting guide:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to reject guide',
    });
  }
}

