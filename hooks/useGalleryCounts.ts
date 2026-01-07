//hooks/useGalleryCounts.ts
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  onSnapshot,
  Unsubscribe,
  DocumentData
} from 'firebase/firestore';

export interface Set {
  id: string;
  name: string;
  imageCount: number;
  coverPhoto?: string;
  createdAt?: Date;
}

export interface Gallery {
  id: string;
  name: string;
  setCount: number;
  sets: Set[];
}

export function useGalleryCounts(): Gallery[] {
  const [galleries, setGalleries] = useState<Gallery[]>([]);

  useEffect(() => {
    if (!db) {
      console.error('Firestore is not initialized (missing NEXT_PUBLIC_FIREBASE_* env vars)');
      return;
    }

    const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID;
    if (!adminUid) {
      console.error('NEXT_PUBLIC_ADMIN_UID is not set');
      return;
    }

    const galleryUnsub: Unsubscribe = onSnapshot(
      collection(db, 'users', adminUid, 'galleries'),
      (gallerySnap) => {
        const galleryList: Gallery[] = [];
        const setUnsubs: Unsubscribe[] = [];

        gallerySnap.forEach((galleryDoc) => {
          const galleryId = galleryDoc.id;
          const galleryName = (galleryDoc.data() as DocumentData).name;
          const galleryData: Gallery = {
            id: galleryId,
            name: galleryName,
            setCount: 0,
            sets: []
          };

          const setsRef = collection(db, 'users', adminUid, 'galleries', galleryId, 'sets');
          const setsUnsub: Unsubscribe = onSnapshot(setsRef, (setsSnap) => {
            const sets: Set[] = [];
            const imageUnsubs: Unsubscribe[] = [];

            setsSnap.forEach((setDoc) => {
              const setId = setDoc.id;
              const setData = setDoc.data() as DocumentData;
              let imageCount = 0;

              const imagesRef = collection(
                db,
                'users',
                adminUid,
                'galleries',
                galleryId,
                'sets',
                setId,
                'images'
              );

              const imagesUnsub: Unsubscribe = onSnapshot(imagesRef, (imagesSnap) => {
                imageCount = imagesSnap.size;
                setGalleries((prevGalleries) => {
                  return prevGalleries.map((g) => {
                    if (g.id !== galleryId) return g;
                    const updatedSets = g.sets.map((s) =>
                      s.id === setId ? { ...s, imageCount } : s
                    );
                    return { ...g, sets: updatedSets };
                  });
                });
              });

              imageUnsubs.push(imagesUnsub);
              sets.push({
                id: setId,
                name: setData.name,
                imageCount,
                coverPhoto: setData.coverPhoto,
                createdAt: setData.createdAt?.toDate()
              });
            });

            galleryData.sets = sets;
            galleryData.setCount = sets.length;
            setGalleries((prevGalleries) => {
              const withoutGallery = prevGalleries.filter((g) => g.id !== galleryId);
              return [...withoutGallery, galleryData];
            });

            return () => {
              imageUnsubs.forEach((unsub) => unsub());
            };
          });

          setUnsubs.push(setsUnsub);
          galleryList.push(galleryData);
        });

        setGalleries(galleryList);
        return () => {
          setUnsubs.forEach((unsub) => unsub());
        };
      },
      (error) => {
        // Handle permission errors gracefully
        if (error.code === 'permission-denied') {
          console.warn('Permission denied accessing galleries. User may not have access.');
          setGalleries([]);
        } else {
          console.error('Error fetching galleries:', error);
        }
      }
    );

    return () => {
      galleryUnsub();
    };
  }, []);

  return galleries;
}