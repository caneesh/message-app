import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Firestore,
  type DocumentReference,
  type CollectionReference,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore'

export interface QueryOptions {
  orderBy?: { field: string; direction: 'asc' | 'desc' }
  limit?: number
  where?: { field: string; op: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains'; value: unknown }[]
}

export interface MutationOptions {
  optimistic?: boolean
}

class APIClient {
  private db: Firestore
  private subscriptions: Map<string, Unsubscribe> = new Map()

  constructor(firestore: Firestore) {
    this.db = firestore
  }

  // Collection reference helper
  private getCollection(path: string): CollectionReference {
    return collection(this.db, path)
  }

  // Document reference helper
  private getDoc(path: string): DocumentReference {
    return doc(this.db, path)
  }

  // Build query with options
  private buildQuery(collectionPath: string, options?: QueryOptions): Query {
    let q: Query = this.getCollection(collectionPath)

    if (options?.where) {
      for (const condition of options.where) {
        q = query(q, where(condition.field, condition.op, condition.value))
      }
    }

    if (options?.orderBy) {
      q = query(q, orderBy(options.orderBy.field, options.orderBy.direction))
    }

    if (options?.limit) {
      q = query(q, limit(options.limit))
    }

    return q
  }

  // Fetch all documents from collection
  async fetchAll<T>(path: string, options?: QueryOptions): Promise<T[]> {
    const q = this.buildQuery(path, options)
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T)
  }

  // Fetch single document
  async fetchOne<T>(path: string): Promise<T | null> {
    const docRef = this.getDoc(path)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as T
  }

  // Subscribe to collection
  subscribe<T>(
    path: string,
    callback: (data: T[]) => void,
    options?: QueryOptions
  ): Unsubscribe {
    const q = this.buildQuery(path, options)
    const subscriptionKey = `${path}:${JSON.stringify(options)}`

    // Unsubscribe from existing subscription if any
    this.unsubscribe(subscriptionKey)

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T)
      callback(data)
    })

    this.subscriptions.set(subscriptionKey, unsubscribe)
    return unsubscribe
  }

  // Subscribe to single document
  subscribeToDoc<T>(
    path: string,
    callback: (data: T | null) => void
  ): Unsubscribe {
    const docRef = this.getDoc(path)

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null)
        return
      }
      callback({ id: snapshot.id, ...snapshot.data() } as T)
    })

    this.subscriptions.set(path, unsubscribe)
    return unsubscribe
  }

  // Unsubscribe from a specific subscription
  unsubscribe(key: string): void {
    const unsubscribe = this.subscriptions.get(key)
    if (unsubscribe) {
      unsubscribe()
      this.subscriptions.delete(key)
    }
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe())
    this.subscriptions.clear()
  }

  // Create document
  async create<T extends Record<string, unknown>>(
    path: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const collectionRef = this.getCollection(path)
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  }

  // Update document
  async update<T extends Record<string, unknown>>(
    path: string,
    data: Partial<T>
  ): Promise<void> {
    const docRef = this.getDoc(path)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  // Delete document
  async delete(path: string): Promise<void> {
    const docRef = this.getDoc(path)
    await deleteDoc(docRef)
  }
}

// Singleton instance
let apiClient: APIClient | null = null

export function initAPIClient(firestore: Firestore): APIClient {
  apiClient = new APIClient(firestore)
  return apiClient
}

export function getAPIClient(): APIClient {
  if (!apiClient) {
    throw new Error('API client not initialized. Call initAPIClient first.')
  }
  return apiClient
}

export { APIClient }
export default APIClient
