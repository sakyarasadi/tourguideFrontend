import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';

export default function VerificationPending() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState({
    nicDocument: '',
    touristDeptIdDocument: '',
    policeReportDocument: '',
  });
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        await fetchGuideData(user.uid);
      } else {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchGuideData = async (uid: string) => {
    try {
      const guideDocRef = doc(db, 'guides', uid);
      const guideDocSnap = await getDoc(guideDocRef);

      if (guideDocSnap.exists()) {
        const data = guideDocSnap.data();
        setStatus(data.status || 'pending');
        setDocuments({
          nicDocument: data.nicDocument || '',
          touristDeptIdDocument: data.touristDeptIdDocument || '',
          policeReportDocument: data.policeReportDocument || '',
        });
        setRejectionReason(data.rejectionReason || '');

        // If approved, redirect to dashboard
        if (data.status === 'approved') {
          router.push('/guide/dashboard');
        }
      }
    } catch (error) {
      console.error('Error fetching guide data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: 'nicDocument' | 'touristDeptIdDocument' | 'policeReportDocument') => {
    if (!userId || !file) return;

    setUploading(documentType);
    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `guide-verifications/${userId}/${documentType}-${Date.now()}.${file.name.split('.').pop()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      const guideDocRef = doc(db, 'guides', userId);
      await updateDoc(guideDocRef, {
        [documentType]: downloadURL,
        updatedAt: serverTimestamp(),
      });

      setDocuments((prev) => ({
        ...prev,
        [documentType]: downloadURL,
      }));

      alert('Document uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document: ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {status === 'pending' && 'Verification Pending'}
              {status === 'approved' && 'Verification Approved'}
              {status === 'rejected' && 'Verification Rejected'}
            </h2>
            <p className="text-gray-600">
              {status === 'pending' && 'Please upload the required documents for verification'}
              {status === 'approved' && 'Your account has been approved! You can now access the guide dashboard.'}
              {status === 'rejected' && 'Your verification has been rejected. Please review the reason below.'}
            </p>
          </div>

          {status === 'rejected' && rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-red-800 mb-2">Rejection Reason:</h3>
              <p className="text-sm text-red-700">{rejectionReason}</p>
            </div>
          )}

          {status === 'pending' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Required Documents</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Please upload the following documents to complete your verification:
                </p>

                {/* NIC Document */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    National Identity Card (NIC) <span className="text-red-500">*</span>
                  </label>
                  {documents.nicDocument ? (
                    <div className="flex items-center gap-4">
                      <a
                        href={documents.nicDocument}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Uploaded Document
                      </a>
                      <label className="cursor-pointer">
                        <span className="text-sm text-blue-600 hover:text-blue-800">Replace</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'nicDocument');
                          }}
                          disabled={uploading === 'nicDocument'}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          {uploading === 'nicDocument' ? 'Uploading...' : 'Click to upload NIC document'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 10MB)</p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'nicDocument');
                          }}
                          disabled={uploading === 'nicDocument'}
                        />
                      </div>
                    </label>
                  )}
                </div>

                {/* Tourist Department ID */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tourist Department ID <span className="text-red-500">*</span>
                  </label>
                  {documents.touristDeptIdDocument ? (
                    <div className="flex items-center gap-4">
                      <a
                        href={documents.touristDeptIdDocument}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Uploaded Document
                      </a>
                      <label className="cursor-pointer">
                        <span className="text-sm text-blue-600 hover:text-blue-800">Replace</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'touristDeptIdDocument');
                          }}
                          disabled={uploading === 'touristDeptIdDocument'}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          {uploading === 'touristDeptIdDocument' ? 'Uploading...' : 'Click to upload Tourist Department ID'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 10MB)</p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'touristDeptIdDocument');
                          }}
                          disabled={uploading === 'touristDeptIdDocument'}
                        />
                      </div>
                    </label>
                  )}
                </div>

                {/* Police Report */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Police Report <span className="text-red-500">*</span>
                  </label>
                  {documents.policeReportDocument ? (
                    <div className="flex items-center gap-4">
                      <a
                        href={documents.policeReportDocument}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Uploaded Document
                      </a>
                      <label className="cursor-pointer">
                        <span className="text-sm text-blue-600 hover:text-blue-800">Replace</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'policeReportDocument');
                          }}
                          disabled={uploading === 'policeReportDocument'}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          {uploading === 'policeReportDocument' ? 'Uploading...' : 'Click to upload Police Report'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 10MB)</p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'policeReportDocument');
                          }}
                          disabled={uploading === 'policeReportDocument'}
                        />
                      </div>
                    </label>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> After uploading all required documents, please wait for admin approval. You will be notified once your verification is complete.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'approved' && (
            <div className="text-center">
              <Link
                href="/guide/dashboard"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

