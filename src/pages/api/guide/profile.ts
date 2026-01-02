import type { NextApiRequest, NextApiResponse } from 'next';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export interface GuideProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  languages?: string[];
  specialties?: string[];
  profilePicture?: string;
  location?: string;
  experience?: string;
  certifications?: string[];
  nicDocument?: string;
  policeReportDocument?: string;
  touristDeptIdDocument?: string;
  notificationSettings?: {
    email?: boolean;
    push?: boolean;
  };
  updatedAt?: any;
}

interface GetProfileResponse {
  success: boolean;
  code: number;
  data: GuideProfile;
}

interface UpdateProfileResponse {
  success: boolean;
  code: number;
  message: string;
  data?: GuideProfile;
}

interface ErrorResponse {
  success: false;
  code: number;
  error: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetProfileResponse | UpdateProfileResponse | ErrorResponse>,
) {
  if (req.method === 'GET') {
    try {
      const { guideId } = req.query;

      if (!guideId || typeof guideId !== 'string') {
        return res.status(400).json({
          success: false,
          code: 400,
          error: 'Bad Request',
          message: 'guideId is required',
        });
      }

      // Get user data
      const userRef = doc(db, 'users', guideId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return res.status(404).json({
          success: false,
          code: 404,
          error: 'Not Found',
          message: 'Guide not found',
        });
      }

      const userData = userSnap.data();

      // Get guide-specific data
      const guideRef = doc(db, 'guides', guideId);
      const guideSnap = await getDoc(guideRef);
      const guideData = guideSnap.exists() ? guideSnap.data() : {};

      const profile: GuideProfile = {
        userId: guideId,
        firstName: userData.firstName || guideData.firstName,
        lastName: userData.lastName || guideData.lastName,
        email: userData.email,
        phone: userData.phone || guideData.phone,
        bio: guideData.bio,
        languages: guideData.languages || [],
        specialties: guideData.specialties || [],
        profilePicture: guideData.profilePicture,
        location: guideData.location,
        experience: guideData.experience,
        certifications: guideData.certifications || [],
        nicDocument: guideData.documents?.nicDocument,
        policeReportDocument: guideData.documents?.policeReportDocument,
        touristDeptIdDocument: guideData.documents?.touristDeptIdDocument,
        notificationSettings: guideData.notificationSettings || {
          email: true,
          push: false,
        },
        updatedAt: guideData.updatedAt || userData.updatedAt,
      };

      return res.status(200).json({
        success: true,
        code: 200,
        data: profile,
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({
        success: false,
        code: 500,
        error: 'Internal server error',
        message: error.message || 'Failed to fetch profile',
      });
    }
  } else if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { guideId } = req.query;
      const profileData = req.body;

      if (!guideId || typeof guideId !== 'string') {
        return res.status(400).json({
          success: false,
          code: 400,
          error: 'Bad Request',
          message: 'guideId is required',
        });
      }

      // Update user data
      const userRef = doc(db, 'users', guideId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return res.status(404).json({
          success: false,
          code: 404,
          error: 'Not Found',
          message: 'Guide not found',
        });
      }

      const userUpdateData: any = {};
      if (profileData.firstName !== undefined) userUpdateData.firstName = profileData.firstName;
      if (profileData.lastName !== undefined) userUpdateData.lastName = profileData.lastName;
      if (profileData.phone !== undefined) userUpdateData.phone = profileData.phone;
      userUpdateData.updatedAt = serverTimestamp();

      if (Object.keys(userUpdateData).length > 1) {
        await updateDoc(userRef, userUpdateData);
      }

      // Update guide-specific data
      const guideRef = doc(db, 'guides', guideId);
      const guideUpdateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (profileData.bio !== undefined) guideUpdateData.bio = profileData.bio;
      if (profileData.languages !== undefined) guideUpdateData.languages = profileData.languages;
      if (profileData.specialties !== undefined) guideUpdateData.specialties = profileData.specialties;
      if (profileData.profilePicture !== undefined) guideUpdateData.profilePicture = profileData.profilePicture;
      if (profileData.location !== undefined) guideUpdateData.location = profileData.location;
      if (profileData.experience !== undefined) guideUpdateData.experience = profileData.experience;
      if (profileData.certifications !== undefined) guideUpdateData.certifications = profileData.certifications;
      if (profileData.notificationSettings !== undefined) {
        guideUpdateData.notificationSettings = profileData.notificationSettings;
      }

      await updateDoc(guideRef, guideUpdateData);

      
      // Fetch updated data
      const updatedGuideSnap = await getDoc(guideRef);
      const updatedGuideData = updatedGuideSnap.exists() ? updatedGuideSnap.data() : {};
      const updatedUserSnap = await getDoc(userRef);
      const updatedUserData = updatedUserSnap.exists() ? updatedUserSnap.data() : {};

      const updatedProfile: GuideProfile = {
        userId: guideId,
        firstName: updatedUserData.firstName || updatedGuideData.firstName,
        lastName: updatedUserData.lastName || updatedGuideData.lastName,
        email: updatedUserData.email,
        phone: updatedUserData.phone || updatedGuideData.phone,
        bio: updatedGuideData.bio,
        languages: updatedGuideData.languages || [],
        specialties: updatedGuideData.specialties || [],
        profilePicture: updatedGuideData.profilePicture,
        location: updatedGuideData.location,
        experience: updatedGuideData.experience,
        certifications: updatedGuideData.certifications || [],
        notificationSettings: updatedGuideData.notificationSettings || {
          email: true,
          push: false,
        },
        updatedAt: updatedGuideData.updatedAt,
      };

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Profile updated successfully',
        data: updatedProfile,
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return res.status(500).json({
        success: false,
        code: 500,
        error: 'Internal server error',
        message: error.message || 'Failed to update profile',
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      code: 405,
      error: 'Method not allowed',
      message: 'Only GET, PUT, and PATCH methods are supported',
    });
  }
}

