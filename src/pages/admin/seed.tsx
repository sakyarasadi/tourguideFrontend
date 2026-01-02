import { useState } from 'react';

export default function SeedAdmin() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const seedAdmin = async () => {
    setStatus('loading');
    setMessage('Creating admin user...');

    try {
      const response = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setCredentials({ email: data.data.email, password: data.data.password });
      } else {
        setStatus('error');
        setMessage(data.message);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to create admin user');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">Admin Seed</h1>
        
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Warning:</strong> This creates an admin user. Only run once.
          </p>
        </div>

        {status === 'idle' && (
          <button
            onClick={seedAdmin}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            Create Admin User
          </button>
        )}

        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && credentials && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-semibold text-green-800 mb-2">{message}</p>
            <div className="p-3 bg-white rounded border">
              <p className="text-sm"><strong>Email:</strong> {credentials.email}</p>
              <p className="text-sm"><strong>Password:</strong> {credentials.password}</p>
            </div>
            <a href="/admin/login" className="mt-4 block text-center py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Go to Admin Login
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-semibold text-red-800">Error</p>
            <p className="text-sm text-red-700">{message}</p>
            <button onClick={() => setStatus('idle')} className="mt-4 w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
