import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';

interface ApproveGuideResponse {
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
  res: NextApiResponse<ApproveGuideResponse | ErrorResponse>,
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
    const { reviewedBy } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Guide ID is required',
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
      status: 'approved',
      reviewedBy: reviewedBy || 'admin',
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const userDocRef = doc(db, 'users', id);
    await updateDoc(userDocRef, {
      status: 'approved',
      updatedAt: serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Guide approved successfully',
      data: {
        userId: id,
        status: 'approved',
      },
    });
  } catch (error: any) {
    console.error('Error approving guide:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to approve guide',
    });
  }
}

