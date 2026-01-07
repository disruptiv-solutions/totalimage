// components/UploadImages.tsx
import { useState, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { storage, db } from '../../lib/firebase';
import { AdminShell } from '../../components/admin/AdminShell';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { AlertTriangle, X } from 'lucide-react';

interface UploadFile {
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
}

export interface Set {
  id: string;
  name: string;
  imageCount: number;
  createdAt: Date;
}

export interface Gallery {
  id: string;
  name: string;
  setCount: number;
  createdAt: Date;
  sets: Set[];
}

const UploadImages: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<string>('');
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [showCreateGallery, setShowCreateGallery] = useState<boolean>(false);
  const [showCreateSet, setShowCreateSet] = useState<boolean>(false);
  const [newGalleryName, setNewGalleryName] = useState<string>('');
  const [newSetName, setNewSetName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!user?.uid) return;
    // Subscribe to real-time updates for galleries
    const galleriesRef = collection(db, 'users', user.uid, 'galleries');
    const unsubscribe = onSnapshot(galleriesRef, (galleriesSnap) => {
      const galleriesData: Gallery[] = [];
      galleriesSnap.forEach((galleryDoc) => {
        // Subscribe to sets within each gallery
        const setsRef = collection(
          db,
          'users',
          user.uid,
          'galleries',
          galleryDoc.id,
          'sets'
        );
        onSnapshot(setsRef, (setsSnap) => {
          const sets: Set[] = setsSnap.docs.map((setDoc) => ({
            id: setDoc.id,
            name: setDoc.data().name,
            imageCount: setDoc.data().imageCount || 0,
            createdAt: setDoc.data().createdAt?.toDate() || new Date(),
          }));
          setGalleries((currGalleries) => {
            const otherGalleries = currGalleries.filter(
              (g) => g.id !== galleryDoc.id
            );
            return [
              ...otherGalleries,
              {
                id: galleryDoc.id,
                name: galleryDoc.data().name,
                setCount: sets.length,
                createdAt: galleryDoc.data().createdAt?.toDate() || new Date(),
                sets,
              },
            ];
          });
        });
      });
    }, (err) => {
      console.error('Error fetching galleries:', err);
      setError('Failed to load galleries');
    });
    return () => unsubscribe();
  }, [user]);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files: UploadFile[] = Array.from(event.target.files).map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: URL.createObjectURL(file),
    }));
    setSelectedFiles(files);
  };

  const createGallery = async (): Promise<string | null> => {
    if (!user?.uid || !newGalleryName.trim()) return null;
    try {
      const galleryRef = collection(db, 'users', user.uid, 'galleries');
      const newGallery = await addDoc(galleryRef, {
        name: newGalleryName,
        setCount: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      setNewGalleryName('');
      setShowCreateGallery(false);
      return newGallery.id;
    } catch (err) {
      console.error('Error creating gallery:', err);
      setError('Failed to create gallery');
      return null;
    }
  };

  const createSet = async (): Promise<string | null> => {
    if (!user?.uid || !selectedGallery || !newSetName.trim()) return null;
    try {
      const setRef = collection(
        db,
        'users',
        user.uid,
        'galleries',
        selectedGallery,
        'sets'
      );
      const newSet = await addDoc(setRef, {
        name: newSetName,
        imageCount: 0,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      setNewSetName('');
      setShowCreateSet(false);
      return newSet.id;
    } catch (err) {
      console.error('Error creating set:', err);
      setError('Failed to create set');
      return null;
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (!user?.uid) return;
    if (selectedFiles.length === 0) return;
    if (!selectedGallery || !selectedSet) {
      setError('Please select both a gallery and a set');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const totalFiles = selectedFiles.length;
      let completedFiles = 0;

      for (const uploadFile of selectedFiles) {
        const safeFileName = uploadFile.name || 'untitled';
        const storageRef = ref(
          storage,
          `users/${user.uid}/galleries/${selectedGallery}/sets/${selectedSet}/${Date.now()}_${safeFileName}`
        );

        const uploadTask = uploadBytesResumable(storageRef, uploadFile.file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const fileProgress = snapshot.bytesTransferred / snapshot.totalBytes;
              const totalProgress = ((completedFiles + fileProgress) / totalFiles) * 100;
              setUploadProgress(Math.round(totalProgress));
            },
            (error) => {
              console.error('Upload error:', error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const imageRef = collection(
                  db,
                  'users',
                  user.uid,
                  'galleries',
                  selectedGallery,
                  'sets',
                  selectedSet,
                  'images'
                );

                await addDoc(imageRef, {
                  url: downloadURL,
                  name: safeFileName,
                  path: uploadTask.snapshot.ref.fullPath,
                  size: uploadFile.size,
                  type: uploadFile.type,
                  uploadedAt: serverTimestamp(),
                  uploadedBy: user.uid,
                });

                completedFiles++;
                resolve();
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      }

      // Revoke object URLs to free memory
      selectedFiles.forEach((uploadFile) => {
        if (uploadFile.preview) {
          URL.revokeObjectURL(uploadFile.preview);
        }
      });

      setSelectedFiles([]);
      setUploadProgress(0);
      setError('');
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <AdminShell sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} backgroundClassName="bg-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">Upload Images</h1>
              <Link
                href="/admin"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mt-8 bg-white shadow rounded-lg p-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Gallery
                    </label>
                    <div className="mt-1 flex gap-4">
                      <select
                        value={selectedGallery}
                        onChange={(e) => {
                          setSelectedGallery(e.target.value);
                          setSelectedSet('');
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select a gallery</option>
                        {galleries.map((gallery) => (
                          <option key={gallery.id} value={gallery.id}>
                            {gallery.name} ({gallery.setCount} sets)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowCreateGallery(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        New Gallery
                      </button>
                    </div>
                  </div>

                  {selectedGallery && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Select Set
                      </label>
                      <div className="mt-1 flex gap-4">
                        <select
                          value={selectedSet}
                          onChange={(e) => setSelectedSet(e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select a set</option>
                          {galleries
                            .find((g) => g.id === selectedGallery)
                            ?.sets.map((set) => (
                              <option key={set.id} value={set.id}>
                                {set.name} ({set.imageCount} images)
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => setShowCreateSet(true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          New Set
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                    Select Images
                  </label>
                  <div className="mt-1">
                    <input
                      type="file"
                      id="images"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                    />
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">
                      Selected Files ({selectedFiles.length})
                    </h3>
                    <ul className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {selectedFiles.map((uploadFile, index) => (
                        <li key={index} className="relative">
                          {uploadFile.preview && (
                            <img
                              src={uploadFile.preview}
                              alt={uploadFile.name}
                              className="h-24 w-24 object-cover rounded-lg"
                            />
                          )}
                          <p className="mt-1 text-xs text-gray-500 truncate">
                            {uploadFile.name || 'untitled'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {uploading && (
                  <div>
                    <div className="relative pt-1">
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div
                          style={{ width: `${uploadProgress}%` }}
                          className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                        />
                      </div>
                      <span className="mt-2 text-sm text-gray-600">
                        {uploadProgress}% complete
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={
                    selectedFiles.length === 0 ||
                    uploading ||
                    !selectedGallery ||
                    !selectedSet
                  }
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload Images'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Gallery Modal */}
        {showCreateGallery && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
              <h2 className="text-xl font-bold mb-4">Create New Gallery</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gallery Name
                  </label>
                  <input
                    type="text"
                    value={newGalleryName}
                    onChange={(e) => setNewGalleryName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter gallery name"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShowCreateGallery(false);
                      setNewGalleryName('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createGallery}
                    disabled={!newGalleryName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Set Modal */}
        {showCreateSet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
              <h2 className="text-xl font-bold mb-4">Create New Set</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Set Name
                  </label>
                  <input
                    type="text"
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter set name"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShowCreateSet(false);
                      setNewSetName('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createSet}
                    disabled={!newSetName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminShell>
    </ProtectedRoute>
  );
};

export default UploadImages;
