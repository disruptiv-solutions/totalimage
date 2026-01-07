import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute';
import { db, storage } from '../../lib/firebase';
import { AdminShell } from '../../components/admin/AdminShell';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import {
  Trash2,
  Edit,
  Image as ImageIcon,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Pencil,
  Star
} from 'lucide-react';

interface ImageData {
  id: string;
  url: string;
  name: string;
  path: string;
}

interface SetData {
  id: string;
  name: string;
  imageCount: number;
  createdAt: Date;
  status: 'draft' | 'published';
  images: ImageData[];
  coverPhoto?: string;
}

interface Gallery {
  id: string;
  name: string;
  setCount: number;
  status: 'draft' | 'published';
  createdAt: Date;
  sets: SetData[];
}

const ManageGalleries: React.FC = () => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [expandedGallery, setExpandedGallery] = useState<string | null>(null);

  // Modals state
  const [showDeleteGalleryModal, setShowDeleteGalleryModal] = useState(false);
  const [showDeleteSetModal, setShowDeleteSetModal] = useState(false);
  const [showEditGalleryModal, setShowEditGalleryModal] = useState(false);
  const [showEditSetModal, setShowEditSetModal] = useState(false);

  // Selected items state
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [selectedSet, setSelectedSet] = useState<SetData | null>(null);

  // Edit state
  const [editingGalleryName, setEditingGalleryName] = useState('');
  const [editingSetName, setEditingSetName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID;
  if (!adminUid) {
    throw new Error('NEXT_PUBLIC_ADMIN_UID environment variable is not defined.');
  }

  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const galleriesRef = collection(db, 'users', adminUid, 'galleries');
      const galleriesQuery = query(galleriesRef, orderBy('createdAt', 'desc'));
      const galleriesSnap = await getDocs(galleriesQuery);

      const galleriesData: Gallery[] = [];

      for (const galleryDoc of galleriesSnap.docs) {
        const galleryData = galleryDoc.data();
        const galleryId = galleryDoc.id;

        // Fetch sets for this gallery
        const setsRef = collection(db, 'users', adminUid, 'galleries', galleryId, 'sets');
        const setsQuery = query(setsRef, orderBy('createdAt', 'desc'));
        const setsSnap = await getDocs(setsQuery);

        const setsData: SetData[] = [];

        for (const setDoc of setsSnap.docs) {
          const setData = setDoc.data();

          // Fetch images for this set
          const imagesRef = collection(
            db,
            'users',
            adminUid,
            'galleries',
            galleryId,
            'sets',
            setDoc.id,
            'images'
          );
          const imagesSnap = await getDocs(imagesRef);

          const images: ImageData[] = imagesSnap.docs.map((imgDoc) => {
            const data = imgDoc.data();
            return {
              id: imgDoc.id,
              url: data.url,
              name: data.name,
              path: data.path,
            };
          });

          setsData.push({
            id: setDoc.id,
            name: setData.name,
            imageCount: images.length,
            status: setData.status || 'draft',
            createdAt: setData.createdAt?.toDate() || new Date(),
            images,
            coverPhoto: setData.coverPhoto || ''
          });
        }

        galleriesData.push({
          id: galleryId,
          name: galleryData.name,
          setCount: setsData.length,
          status: galleryData.status || 'draft',
          createdAt: galleryData.createdAt?.toDate() || new Date(),
          sets: setsData,
        });
      }

      setGalleries(galleriesData);
    } catch (err) {
      console.error('Error fetching galleries:', err);
      setError('Failed to load galleries');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGallery = async (gallery: Gallery) => {
    try {
      setIsProcessing(true);
      setError('');

      const batch = writeBatch(db);

      // Delete all images from storage and Firestore for each set
      for (const set of gallery.sets) {
        for (const image of set.images) {
          try {
            if (image.path) {
              const storageRef = ref(storage, image.path);
              await deleteObject(storageRef);
            }
          } catch (storageErr) {
            console.error(`Error deleting image ${image.id} from storage:`, storageErr);
          }

          // Delete image document
          const imageRef = doc(
            db,
            'users',
            adminUid,
            'galleries',
            gallery.id,
            'sets',
            set.id,
            'images',
            image.id
          );
          batch.delete(imageRef);
        }

        // Delete set document
        const setRef = doc(db, 'users', adminUid, 'galleries', gallery.id, 'sets', set.id);
        batch.delete(setRef);
      }

      // Delete the gallery document
      const galleryRef = doc(db, 'users', adminUid, 'galleries', gallery.id);
      batch.delete(galleryRef);

      await batch.commit();

      setGalleries(galleries.filter(g => g.id !== gallery.id));
      setShowDeleteGalleryModal(false);
      setSelectedGallery(null);
    } catch (err) {
      console.error('Error deleting gallery:', err);
      setError('Failed to delete gallery');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSet = async (gallery: Gallery, set: SetData) => {
    try {
      setIsProcessing(true);
      setError('');

      const batch = writeBatch(db);

      // Delete all images from storage and Firestore
      for (const image of set.images) {
        try {
          if (image.path) {
            const storageRef = ref(storage, image.path);
            await deleteObject(storageRef);
          }
        } catch (storageErr) {
          console.error(`Error deleting image ${image.id} from storage:`, storageErr);
        }

        // Delete image document
        const imageRef = doc(
          db,
          'users',
          adminUid,
          'galleries',
          gallery.id,
          'sets',
          set.id,
          'images',
          image.id
        );
        batch.delete(imageRef);
      }

      // Delete set document
      const setRef = doc(db, 'users', adminUid, 'galleries', gallery.id, 'sets', set.id);
      batch.delete(setRef);

      await batch.commit();

      // Update local state
      setGalleries(galleries.map(g => {
        if (g.id === gallery.id) {
          return {
            ...g,
            setCount: g.setCount - 1,
            sets: g.sets.filter(s => s.id !== set.id)
          };
        }
        return g;
      }));

      setShowDeleteSetModal(false);
      setSelectedSet(null);
    } catch (err) {
      console.error('Error deleting set:', err);
      setError('Failed to delete set');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteImage = async (gallery: Gallery, set: SetData, image: ImageData) => {
    try {
      setIsProcessing(true);
      setError('');

      if (image.path) {
        try {
          const storageRef = ref(storage, image.path);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.error('Error deleting image from storage:', storageErr);
        }
      }

      const imageRef = doc(
        db,
        'users',
        adminUid,
        'galleries',
        gallery.id,
        'sets',
        set.id,
        'images',
        image.id
      );
      await deleteDoc(imageRef);

      // Update local state
      setGalleries(galleries.map(g => {
        if (g.id === gallery.id) {
          return {
            ...g,
            sets: g.sets.map(s => {
              if (s.id === set.id) {
                return {
                  ...s,
                  imageCount: s.imageCount - 1,
                  images: s.images.filter(img => img.id !== image.id)
                };
              }
              return s;
            })
          };
        }
        return g;
      }));
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Failed to delete image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGalleryStatusToggle = async (gallery: Gallery) => {
    try {
      setError('');
      const galleryRef = doc(db, 'users', adminUid, 'galleries', gallery.id);
      const newStatus = gallery.status === 'published' ? 'draft' : 'published';

      await updateDoc(galleryRef, {
        status: newStatus
      });

      setGalleries(galleries.map(g =>
        g.id === gallery.id ? { ...g, status: newStatus } : g
      ));
    } catch (err) {
      console.error('Error updating gallery status:', err);
      setError('Failed to update gallery status');
    }
  };

  const handleSetStatusToggle = async (gallery: Gallery, set: SetData) => {
    try {
      setError('');
      const setRef = doc(db, 'users', adminUid, 'galleries', gallery.id, 'sets', set.id);
      const newStatus = set.status === 'published' ? 'draft' : 'published';

      await updateDoc(setRef, {
        status: newStatus
      });

      setGalleries(galleries.map(g => {
        if (g.id === gallery.id) {
          return {
            ...g,
            sets: g.sets.map(s =>
              s.id === set.id ? { ...s, status: newStatus } : s
            )
          };
        }
        return g;
      }));
    } catch (err) {
      console.error('Error updating set status:', err);
      setError('Failed to update set status');
    }
  };

  const handleEditGallery = async (gallery: Gallery) => {
    if (!editingGalleryName.trim()) return;

    try {
      setIsProcessing(true);
      setError('');

      const galleryRef = doc(db, 'users', adminUid, 'galleries', gallery.id);
      await updateDoc(galleryRef, {
        name: editingGalleryName.trim()
      });

      setGalleries(galleries.map(g =>
        g.id === gallery.id ? { ...g, name: editingGalleryName.trim() } : g
      ));

      setShowEditGalleryModal(false);
      setSelectedGallery(null);
      setEditingGalleryName('');
    } catch (err) {
      console.error('Error updating gallery:', err);
      setError('Failed to update gallery');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSet = async (gallery: Gallery, set: SetData) => {
    if (!editingSetName.trim()) return;

    try {
      setIsProcessing(true);
      setError('');

      const setRef = doc(db, 'users', adminUid, 'galleries', gallery.id, 'sets', set.id);
      await updateDoc(setRef, {
        name: editingSetName.trim()
      });

      setGalleries(galleries.map(g => {
        if (g.id === gallery.id) {
          return {
            ...g,
            sets: g.sets.map(s =>
              s.id === set.id ? { ...s, name: editingSetName.trim() } : s
            )
          };
        }
        return g;
      }));

      setShowEditSetModal(false);
      setSelectedSet(null);
      setEditingSetName('');
    } catch (err) {
      console.error('Error updating set:', err);
      setError('Failed to update set');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetCoverPhoto = async (gallery: Gallery, set: SetData, image: ImageData) => {
    try {
      setIsProcessing(true);
      setError('');

      const setRef = doc(db, 'users', adminUid, 'galleries', gallery.id, 'sets', set.id);
      await updateDoc(setRef, {
        coverPhoto: image.url
      });

      setGalleries(galleries.map(g => {
        if (g.id === gallery.id) {
          return {
            ...g,
            sets: g.sets.map(s =>
              s.id === set.id ? { ...s, coverPhoto: image.url } : s
            )
          };
        }
        return g;
      }));
    } catch (err) {
      console.error('Error setting cover photo:', err);
      setError('Failed to set cover photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <AdminShell sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} backgroundClassName="bg-gray-50">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        </AdminShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <AdminShell sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} backgroundClassName="bg-gray-50">
      <div className="max-w-7xl mx-auto">
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
                <h1 className="text-3xl font-bold text-gray-900">Manage Galleries</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {galleries.length} galleries total
                </p>
              </div>
              <div className="flex gap-4">
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              {galleries.map((gallery) => (
                <div key={gallery.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <h2 className="text-xl font-semibold text-gray-900">{gallery.name}</h2>
                          <button
                            onClick={() => {
                              setSelectedGallery(gallery);
                              setEditingGalleryName(gallery.name);
                              setShowEditGalleryModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {gallery.setCount} sets • Created {gallery.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleGalleryStatusToggle(gallery)}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            gallery.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {gallery.status}
                        </button>
                        <button
                          onClick={() =>
                            setExpandedGallery(expandedGallery === gallery.id ? null : gallery.id)
                          }
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {expandedGallery === gallery.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedGallery(gallery);
                            setShowDeleteGalleryModal(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Delete Gallery"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedGallery === gallery.id && (
                    <div className="divide-y divide-gray-200">
                      {gallery.sets.map((set) => (
                        <div key={set.id} className="p-6 bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                  {set.name}
                                </h3>
                                <button
                                  onClick={() => {
                                    setSelectedGallery(gallery);
                                    setSelectedSet(set);
                                    setEditingSetName(set.name);
                                    setShowEditSetModal(true);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <p className="text-sm text-gray-600">
                                  {set.imageCount} images • Created {set.createdAt.toLocaleDateString()}
                                </p>
                                {set.coverPhoto && (
                                  <img
                                    src={set.coverPhoto}
                                    alt="Cover"
                                    className="w-8 h-8 object-cover rounded-full border border-gray-300"
                                    title="Cover Photo"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => handleSetStatusToggle(gallery, set)}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  set.status === 'published'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {set.status}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedGallery(gallery);
                                  setSelectedSet(set);
                                  setShowDeleteSetModal(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete Set"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4">
                            {set.images.length === 0 ? (
                              <div className="text-center py-8">
                                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600">
                                  No images in this set
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {set.images.map((image) => (
                                  <div key={image.id} className="relative group">
                                    <img
                                      src={image.url}
                                      alt={image.name}
                                      className="w-full h-24 object-cover rounded-lg"
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg space-y-2">
                                      <button
                                        onClick={() => handleSetCoverPhoto(gallery, set, image)}
                                        className="p-1 bg-white rounded-full"
                                        title="Set as Cover Photo"
                                      >
                                        <Star className="w-5 h-5 text-yellow-500" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteImage(gallery, set, image)}
                                        className="p-1 bg-white rounded-full"
                                        title="Delete Image"
                                      >
                                        <Trash2 className="w-5 h-5 text-red-600" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {gallery.sets.length === 0 && (
                        <div className="p-6 bg-gray-50 text-center">
                          <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            No sets in this gallery
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {galleries.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No galleries</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new gallery.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Gallery Modal */}
        {showEditGalleryModal && selectedGallery && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Edit Gallery</h2>
                <button
                  onClick={() => setShowEditGalleryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gallery Name
                  </label>
                  <input
                    type="text"
                    value={editingGalleryName}
                    onChange={(e) => setEditingGalleryName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter gallery name"
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowEditGalleryModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleEditGallery(selectedGallery)}
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={isProcessing || !editingGalleryName.trim()}
                  >
                    {isProcessing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Set Modal */}
        {showEditSetModal && selectedGallery && selectedSet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Edit Set</h2>
                <button
                  onClick={() => setShowEditSetModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Set Name
                  </label>
                  <input
                    type="text"
                    value={editingSetName}
                    onChange={(e) => setEditingSetName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter set name"
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowEditSetModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleEditSet(selectedGallery, selectedSet)}
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={isProcessing || !editingSetName.trim()}
                  >
                    {isProcessing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Gallery Modal */}
        {showDeleteGalleryModal && selectedGallery && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Delete Gallery</h2>
                <button
                  onClick={() => setShowDeleteGalleryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete "{selectedGallery.name}"? This action cannot be undone
                and will permanently delete all sets and images in this gallery.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteGalleryModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteGallery(selectedGallery)}
                  className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Deleting...' : 'Delete Gallery'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Set Modal */}
        {showDeleteSetModal && selectedGallery && selectedSet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Delete Set</h2>
                <button
                  onClick={() => setShowDeleteSetModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete the set "{selectedSet.name}"? This action cannot be undone
                and will permanently delete all {selectedSet.imageCount} images in this set.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteSetModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSet(selectedGallery, selectedSet)}
                  className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Deleting...' : 'Delete Set'}
                </button>
              </div>
            </div>
          </div>
        )}
    </AdminShell>
    </ProtectedRoute>
  );
};

export default ManageGalleries;
