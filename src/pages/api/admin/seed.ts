import type { NextApiRequest, NextApiResponse } from 'next';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';

const ADMIN_CREDENTIALS = {
  email: 'admin@tourguide.com',
  password: 'Admin@123',
  firstName: 'System',
  lastName: 'Admin',
  phone: '+94771234567',
};

interface SeedResponse {
  success: boolean;
  code: number;
  message: string;
  data?: {
    email: string;
    password: string;
    uid?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SeedResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      code: 405,
      message: 'Only POST method is supported',
    });
  }

  try {
    // Create admin user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      ADMIN_CREDENTIALS.email,
      ADMIN_CREDENTIALS.password
    );

    const user = userCredential.user;

    // Create admin document in users collection
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: ADMIN_CREDENTIALS.email,
      firstName: ADMIN_CREDENTIALS.firstName,
      lastName: ADMIN_CREDENTIALS.lastName,
      phone: ADMIN_CREDENTIALS.phone,
      userType: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create admin document in admins collection
    await setDoc(doc(db, 'admins', user.uid), {
      userId: user.uid,
      email: ADMIN_CREDENTIALS.email,
      firstName: ADMIN_CREDENTIALS.firstName,
      lastName: ADMIN_CREDENTIALS.lastName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Admin user created successfully',
      data: {
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
        uid: user.uid,
      },
    });
  } catch (error: any) {
    console.error('Admin seed error:', error);

    if (error.code === 'auth/email-already-in-use') {
      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Admin user already exists',
        data: {
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        },
      });
    }

    return res.status(500).json({
      success: false,
      code: 500,
      message: error.message || 'Failed to create admin user',
    });
  }
}

