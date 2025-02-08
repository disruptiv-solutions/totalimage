import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  query,
  orderBy,
  deleteDoc,
  Timestamp,
  collectionGroup
} from 'firebase/firestore';
import { AlertTriangle, UserX, User, Shield, X, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

interface SubscriptionData {
  cancelAt: Timestamp | null;
  cancelAtPeriodEnd: boolean;
  createdAt: Timestamp;
  currentPeriodEnd: Timestamp;
  currentPeriodStart: Timestamp;
  priceId: string;
  startDate: Timestamp;
  status: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  updatedAt: Timestamp;
}

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt?: string;
  subscription?: SubscriptionData;
}

const ManageUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, ]);

  const fetchUserSubscription = async (userId: string) => {
    try {
      const subCollectionRef = collection(db, 'users', userId, 'subscription');
      const subSnapshot = await getDocs(subCollectionRef);

      if (!subSnapshot.empty) {
        const subDoc = subSnapshot.docs[0];
        return {
          ...subDoc.data(),
          id: subDoc.id,
          cancelAt: subDoc.data().cancelAt,
          cancelAtPeriodEnd: subDoc.data().cancelAtPeriodEnd,
          createdAt: subDoc.data().createdAt,
          currentPeriodEnd: subDoc.data().currentPeriodEnd,
          currentPeriodStart: subDoc.data().currentPeriodStart,
          priceId: subDoc.data().priceId,
          startDate: subDoc.data().startDate,
          status: subDoc.data().status,
          stripeCustomerId: subDoc.data().stripeCustomerId,
          stripeSubscriptionId: subDoc.data().stripeSubscriptionId,
          updatedAt: subDoc.data().updatedAt,
        } as SubscriptionData;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching subscription for user ${userId}:`, err);
      return null;
    }
  };

  const fetchUsers = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // First verify current user is admin
      const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
      const currentUserData = currentUserDoc.data();

      if (!currentUserData?.isAdmin) {
        throw new Error('Unauthorized access');
      }

      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
      const usersSnap = await getDocs(usersQuery);

      const usersPromises = usersSnap.docs.map(async (doc) => {
        const subscription = await fetchUserSubscription(doc.id);
        return {
          id: doc.id,
          email: doc.data().email || '',
          firstName: doc.data().firstName || '',
          lastName: doc.data().lastName || '',
          isAdmin: doc.data().isAdmin || false,
          createdAt: doc.data().createdAt || '',
          updatedAt: doc.data().updatedAt,
          subscription: subscription || undefined
        };
      });

      const usersData = await Promise.all(usersPromises);
      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdminStatus = async (userData: UserData) => {
    if (!user) return;

    if (userData.id === user.uid) {
      setError('Cannot modify your own admin status');
      return;
    }

    try {
      setIsProcessing(true);
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, {
        isAdmin: !userData.isAdmin,
        updatedAt: new Date().toISOString()
      });

      setUsers(users.map(u => 
        u.id === userData.id ? { ...u, isAdmin: !userData.isAdmin } : u
      ));
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Failed to update user status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (userData: UserData) => {
    if (!user) return;

    if (userData.id === user.uid) {
      setError('Cannot delete your own account');
      setShowDeleteModal(false);
      return;
    }

    try {
      setIsProcessing(true);
      const userRef = doc(db, 'users', userData.id);
      await deleteDoc(userRef);

      setUsers(users.filter(u => u.id !== userData.id));
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleUserExpansion = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">Error</p>
              </div>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {users.length} users total
                </p>
              </div>
              <Link
                href="/admin"
                className="px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>

            <div className="mt-8">
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userData) => (
                      <>
                        <tr 
                          key={userData.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleUserExpansion(userData.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <User className="h-6 w-6 text-gray-500" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {userData.firstName} {userData.lastName}
                                </div>
                                <div className="text-sm text-gray-500">{userData.email}</div>
                              </div>
                              {expandedUser === userData.id ? (
                                <ChevronUp className="ml-2 h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAdminStatus(userData);
                              }}
                              disabled={userData.id === user?.uid || isProcessing}
                              className="inline-flex items-center"
                            >
                              <Shield className={`h-4 w-4 mr-1 ${
                                userData.isAdmin ? 'text-blue-600' : 'text-gray-400'
                              }`} />
                              <span className="text-sm text-gray-900">
                                {userData.isAdmin ? 'Admin' : 'User'}
                              </span>
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(userData.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(userData);
                                setShowDeleteModal(true);
                              }}
                              disabled={userData.id === user?.uid || isProcessing}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                        {expandedUser === userData.id && (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 bg-gray-50">
                              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                  <CreditCard className="h-5 w-5 mr-2" />
                                  Subscription Details
                                </h4>
                                {userData.subscription ? (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Status</p>
                                      <p className="text-sm text-gray-900">{userData.subscription.status}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Price ID</p>
                                      <p className="text-sm text-gray-900">{userData.subscription.priceId}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Current Period Start</p>
                                      <p className="text-sm text-gray-900">{formatDate(userData.subscription.currentPeriodStart)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Current Period End</p>
                                      <p className="text-sm text-gray-900">{formatDate(userData.subscription.currentPeriodEnd)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Created At</p>
                                      <p className="text-sm text-gray-900">{formatDate(userData.subscription.createdAt)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Cancel At Period End</p>
                                      <p className="text-sm text-gray-900">{userData.subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Stripe Customer ID</p>
                                      <p className="text-sm text-gray-900">{userData.subscription.stripeCustomerId}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Stripe Subscription ID</p>
                                      <p className="text-sm text-gray-900">{userData.subscription.stripeSubscriptionId}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">No active subscription</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

                {users.length === 0 && (
                  <div className="text-center py-12">
                    <UserX className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by inviting new users.</p>
                  </div>
                )}
                </div>
                </div>
                </div>

                {/* Delete User Modal */}
                {showDeleteModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Delete User</h2>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete the user "{selectedUser.firstName} {selectedUser.lastName}"? 
                  This action cannot be undone.
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteUser(selectedUser)}
                    className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>
                </div>
                </div>
                )}
                </div>
                </ProtectedRoute>
                );
                };

                export default ManageUsers;