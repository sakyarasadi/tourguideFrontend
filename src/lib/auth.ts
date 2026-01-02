import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';

export interface UserData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: 'tourist' | 'guide' | 'admin';
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  updatedAt: any;
}

export interface GuideDocuments {
  touristDeptIdDocument?: File;
  policeReportDocument?: File;
  nicDocument?: File;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  userType: 'tourist' | 'guide';
  documents?: GuideDocuments;
}

export interface LoginData {
  email: string;
  password: string;
}

const uploadDocument = async (
  file: File,
  userId: string,
  documentType: string
): Promise<string> => {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${documentType}_${Date.now()}.${fileExtension}`;
  const storageRef = ref(storage, `guides/${userId}/documents/${fileName}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};

export const registerUser = async (data: RegisterData): Promise<{ user: User; userData: UserData }> => {
  try {
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Validate guide documents
    if (data.userType === 'guide') {
      if (!data.documents?.touristDeptIdDocument) {
        throw new Error('Tourist Department ID document is required');
      }
      if (!data.documents?.policeReportDocument) {
        throw new Error('Police Report document is required');
      }
      if (!data.documents?.nicDocument) {
        throw new Error('NIC document is required');
      }
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    const user = userCredential.user;

    const userData: Omit<UserData, 'status'> & { status?: 'pending' | 'approved' | 'rejected' } = {
      uid: user.uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      userType: data.userType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only add status field for guides
    if (data.userType === 'guide') {
      userData.status = 'pending';
    }

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, userData);

    if (data.userType === 'guide' && data.documents) {
      // Upload documents to Firebase Storage
      const documentUrls: Record<string, string> = {};
      
      if (data.documents.touristDeptIdDocument) {
        documentUrls.touristDeptIdDocument = await uploadDocument(
          data.documents.touristDeptIdDocument,
          user.uid,
          'touristDeptId'
        );
      }
      
      if (data.documents.policeReportDocument) {
        documentUrls.policeReportDocument = await uploadDocument(
          data.documents.policeReportDocument,
          user.uid,
          'policeReport'
        );
      }
      
      if (data.documents.nicDocument) {
        documentUrls.nicDocument = await uploadDocument(
          data.documents.nicDocument,
          user.uid,
          'nic'
        );
      }

      const guideDocRef = doc(collection(db, 'guides'), user.uid);
      await setDoc(guideDocRef, {
        userId: user.uid,
        status: 'pending',
        documents: documentUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const touristDocRef = doc(collection(db, 'tourists'), user.uid);
      await setDoc(touristDocRef, {
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Save email and uid to localStorage
    localStorage.setItem('userEmail', user.email || '');
    localStorage.setItem('userUid', user.uid);

    return { user, userData };
  } catch (error: any) {
    let errorMessage = 'An error occurred during registration';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

export const loginUser = async (data: LoginData): Promise<{ user: User; userData: UserData }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error('User data not found');
    }

    const userData = userDocSnap.data() as UserData;

    // Check if guide is approved before allowing login
    if (userData.userType === 'guide' && userData.status !== 'approved') {
      throw new Error('Your guide account is pending approval. Please wait for admin approval.');
    }

    // Save email and uid to localStorage
    localStorage.setItem('userEmail', user.email || '');
    localStorage.setItem('userUid', user.uid);

    return { user, userData };
  } catch (error: any) {
    let errorMessage = 'An error occurred during login';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    // Clear localStorage on logout
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userUid');
  } catch (error: any) {
    throw new Error('An error occurred during logout');
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    let errorMessage = 'An error occurred while sending reset email';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    }
    
    throw new Error(errorMessage);
  }
};

export const getCurrentUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      return userDocSnap.data() as UserData;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};
