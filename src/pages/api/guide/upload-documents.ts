import type { NextApiRequest, NextApiResponse } from 'next';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../../../lib/firebase';

interface UploadDocumentsResponse {
  success: boolean;
  code: number;
  message: string;
  data?: {
    nicDocument?: string;
    touristDeptIdDocument?: string;
    policeReportDocument?: string;
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
  res: NextApiResponse<UploadDocumentsResponse | ErrorResponse>,
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
    const { userId, nicDocument, touristDeptIdDocument, policeReportDocument } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'userId is required',
      });
    }

    // Verify user exists and is a guide
    const userDocRef = doc(db, 'users', userId as string);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return res.status(404).json({
        success: false,
        code: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const userData = userDocSnap.data();
    if (userData.userType !== 'guide') {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'User is not a guide',
      });
    }

    const guideDocRef = doc(db, 'guides', userId as string);
    const uploadedUrls: {
      nicDocument?: string;
      touristDeptIdDocument?: string;
      policeReportDocument?: string;
    } = {};

    // If documents are provided as base64 strings, convert and upload
    // Otherwise, if they're already URLs, just use them
    if (nicDocument) {
      if (nicDocument.startsWith('data:')) {
        // Base64 data URL - convert and upload
        const base64Data = nicDocument.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const storageRef = ref(storage, `guide-verifications/${userId}/nic-${Date.now()}.pdf`);
        await uploadBytes(storageRef, buffer);
        uploadedUrls.nicDocument = await getDownloadURL(storageRef);
      } else {
        // Already a URL
        uploadedUrls.nicDocument = nicDocument;
      }
    }

    if (touristDeptIdDocument) {
      if (touristDeptIdDocument.startsWith('data:')) {
        const base64Data = touristDeptIdDocument.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const storageRef = ref(storage, `guide-verifications/${userId}/tourist-dept-${Date.now()}.pdf`);
        await uploadBytes(storageRef, buffer);
        uploadedUrls.touristDeptIdDocument = await getDownloadURL(storageRef);
      } else {
        uploadedUrls.touristDeptIdDocument = touristDeptIdDocument;
      }
    }

    if (policeReportDocument) {
      if (policeReportDocument.startsWith('data:')) {
        const base64Data = policeReportDocument.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const storageRef = ref(storage, `guide-verifications/${userId}/police-report-${Date.now()}.pdf`);
        await uploadBytes(storageRef, buffer);
        uploadedUrls.policeReportDocument = await getDownloadURL(storageRef);
      } else {
        uploadedUrls.policeReportDocument = policeReportDocument;
      }
    }

    // Update guide document with uploaded URLs
    await updateDoc(guideDocRef, {
      ...uploadedUrls,
      updatedAt: serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Documents uploaded successfully',
      data: uploadedUrls,
    });
  } catch (error: any) {
    console.error('Error uploading documents:', error);
    return res.status(500).json({
      success: false,
      code: 500,
      error: 'Internal server error',
      message: error.message || 'Failed to upload documents',
    });
  }
}

