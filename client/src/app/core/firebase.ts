import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';

const app = initializeApp(environment.firebase);

export const auth = getAuth(app);

// Persistent local cache: once a document has been read, it stays available
// from IndexedDB even if the connection drops (common on mobile data) - the
// SDK serves cached data immediately and syncs when connectivity returns,
// instead of every read failing outright during a network blip.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
