import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  email: string;
  role?: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth() as { user: User | null };

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome, {user?.email}</p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/admin/upload-images"
                className="flex items-center justify-center px-4 py-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
              >
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900">Upload Images</h2>
                  <p className="mt-2 text-sm text-gray-600">Manage site images and media</p>
                </div>
              </Link>

              <Link
                href="/admin/manage-users"
                className="flex items-center justify-center px-4 py-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
              >
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900">Manage Users</h2>
                  <p className="mt-2 text-sm text-gray-600">View and manage user accounts</p>
                </div>
              </Link>

              <Link
                href="/admin/manage-galleries"
                className="flex items-center justify-center px-4 py-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
              >
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900">Manage Galleries</h2>
                  <p className="mt-2 text-sm text-gray-600">Organize and edit galleries</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;