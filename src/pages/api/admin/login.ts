import type { NextApiRequest, NextApiResponse } from 'next';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

interface AdminLoginResponse {
  success: boolean;
  code: number;
  message: string;
  data?: {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: string;
    token?: string;
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
  res: NextApiResponse<AdminLoginResponse | ErrorResponse>,
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        code: 400,
        error: 'Bad Request',
        message: 'Email and password are required',
      });
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid);
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

    if (userData.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 403,
        error: 'Forbidden',
        message: 'Access denied. Admin privileges required.',
      });
    }

    const adminDocRef = doc(db, 'admins', user.uid);
    const adminDocSnap = await getDoc(adminDocRef);
    const adminData = adminDocSnap.exists() ? adminDocSnap.data() : {};

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Login successful',
      data: {
        uid: user.uid,
        email: userData.email || user.email || '',
        firstName: userData.firstName || adminData.firstName || '',
        lastName: userData.lastName || adminData.lastName || '',
        userType: userData.userType,
      },
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    
    let errorMessage = 'An error occurred during login';
    let statusCode = 500;

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
      statusCode = 404;
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
      statusCode = 401;
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
      statusCode = 400;
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
      statusCode = 403;
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later';
      statusCode = 429;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      code: statusCode,
      error: statusCode === 500 ? 'Internal server error' : 'Authentication failed',
      message: errorMessage,
    });
  }
}

