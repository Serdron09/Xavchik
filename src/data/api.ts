import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { MenuItem, MenuOption, Order, OrderItem, Place, Poll, Role } from '../lib/types'

/* ------------------------------- members ------------------------------- */

export const membersQuery = () => query(collection(db, 'members'), orderBy('displayName'))

export const setMemberRole = (uid: string, role: Role) =>
  updateDoc(doc(db, 'members', uid), { role })

export const removeMember = (uid: string) => deleteDoc(doc(db, 'members', uid))

/* -------------------------------- places ------------------------------- */

export const placesQuery = (includeArchived: boolean) =>
  includeArchived
    ? query(collection(db, 'places'), orderBy('name'))
    : query(collection(db, 'places'), where('isArchived', '==', false), orderBy('name'))

export const placeRef = (id: string) => doc(db, 'places', id)

export async function createPlace(
  uid: string,
  data: Pick<Place, 'name'> & Partial<Omit<Place, 'id' | 'name'>>,
) {
  const ref = await addDoc(collection(db, 'places'), {
    nameNote: '',
    phone: '',
    url: '',
    tags: [],
    deliveryFee: null,
    minOrder: null,
    notes: '',
    isArchived: false,
    ...data,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updatePlace = (id: string, uid: string, patch: Partial<Place>) =>
  updateDoc(doc(db, 'places', id), { ...patch, updatedBy: uid, updatedAt: serverTimestamp() })

export async function deletePlace(id: string) {
  const items = await getDocs(collection(db, 'places', id, 'menuItems'))
  const batch = writeBatch(db)
  items.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'places', id))
  await batch.commit()
}

/* ------------------------------ menu items ----------------------------- */

export const menuQuery = (placeId: string) =>
  query(collection(db, 'places', placeId, 'menuItems'), orderBy('sortOrder'))

export const addMenuItem = (
  placeId: string,
  uid: string,
  data: Pick<MenuItem, 'name'> & Partial<Omit<MenuItem, 'id' | 'name'>>,
) =>
  addDoc(collection(db, 'places', placeId, 'menuItems'), {
    description: '',
    price: null,
    category: '',
    options: [] as MenuOption[],
    isAvailable: true,
    sortOrder: Date.now(),
    ...data,
    createdBy: uid,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  })

export const updateMenuItem = (
  placeId: string,
  itemId: string,
  uid: string,
  patch: Partial<MenuItem>,
) =>
  updateDoc(doc(db, 'places', placeId, 'menuItems', itemId), {
    ...patch,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  })

export const deleteMenuItem = (placeId: string, itemId: string) =>
  deleteDoc(doc(db, 'places', placeId, 'menuItems', itemId))

/** One line per dish: "name - 45", "name 45", "name" */
export function parseMenuLines(text: string): { name: string; price: number | null }[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.*?)[\s ]*[-–—:|]?[\s ]*(\d+(?:[.,]\d{1,2})?)[\s ]*(?:₪|ils|שח|ש"ח|ש״ח)?$/i)
      if (m && m[1].trim()) {
        return { name: m[1].replace(/[-–—:|]\s*$/, '').trim(), price: Number(m[2].replace(',', '.')) }
      }
      return { name: line, price: null }
    })
}

export async function bulkAddMenuItems(
  placeId: string,
  uid: string,
  rows: { name: string; price: number | null }[],
  category: string,
) {
  const batch = writeBatch(db)
  const base = Date.now()
  rows.forEach((row, i) => {
    const ref = doc(collection(db, 'places', placeId, 'menuItems'))
    batch.set(ref, {
      name: row.name,
      description: '',
      price: row.price,
      category,
      options: [],
      isAvailable: true,
      sortOrder: base + i,
      createdBy: uid,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
}

/* -------------------------------- orders ------------------------------- */

export const ordersQuery = (n = 20) =>
  query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(n))

export const openOrdersQuery = () =>
  query(collection(db, 'orders'), where('status', '==', 'open'), orderBy('createdAt', 'desc'))

export const orderRef = (id: string) => doc(db, 'orders', id)

export async function createOrder(
  uid: string,
  userName: string,
  place: Pick<Place, 'id' | 'name' | 'deliveryFee'>,
  extra: { title?: string; deadline?: Date | null; notes?: string; fromPollId?: string | null } = {},
) {
  const ref = await addDoc(collection(db, 'orders'), {
    placeId: place.id,
    placeNameSnapshot: place.name,
    title: extra.title ?? '',
    status: 'open',
    deadline: extra.deadline ? Timestamp.fromDate(extra.deadline) : null,
    notes: extra.notes ?? '',
    deliveryFee: place.deliveryFee ?? null,
    fromPollId: extra.fromPollId ?? null,
    createdBy: uid,
    createdByName: userName,
    createdAt: serverTimestamp(),
    lockedAt: null,
  })
  return ref.id
}

export const updateOrder = (id: string, patch: Partial<Order>) =>
  updateDoc(doc(db, 'orders', id), patch)

export const setOrderStatus = (id: string, status: Order['status']) =>
  updateDoc(doc(db, 'orders', id), {
    status,
    lockedAt: status === 'open' ? null : serverTimestamp(),
  })

export async function deleteOrder(id: string) {
  const items = await getDocs(collection(db, 'orders', id, 'items'))
  const batch = writeBatch(db)
  items.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'orders', id))
  await batch.commit()
}

/* ----------------------------- order items ----------------------------- */

export const orderItemsQuery = (orderId: string) =>
  query(collection(db, 'orders', orderId, 'items'), orderBy('createdAt'))

export const addOrderItem = (
  orderId: string,
  data: Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt'>,
) =>
  addDoc(collection(db, 'orders', orderId, 'items'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

export const updateOrderItem = (orderId: string, itemId: string, patch: Partial<OrderItem>) =>
  updateDoc(doc(db, 'orders', orderId, 'items', itemId), {
    ...patch,
    updatedAt: serverTimestamp(),
  })

export const deleteOrderItem = (orderId: string, itemId: string) =>
  deleteDoc(doc(db, 'orders', orderId, 'items', itemId))

/* --------------------------------- polls -------------------------------- */

export const pollsQuery = (n = 20) =>
  query(collection(db, 'polls'), orderBy('createdAt', 'desc'), limit(n))

export const openPollsQuery = () =>
  query(collection(db, 'polls'), where('status', '==', 'open'), orderBy('createdAt', 'desc'))

export const pollRef = (id: string) => doc(db, 'polls', id)
export const votesQuery = (pollId: string) => collection(db, 'polls', pollId, 'votes')

export async function createPoll(
  uid: string,
  userName: string,
  data: {
    title: string
    candidatePlaceIds: string[]
    allowMultiple: boolean
    deadline?: Date | null
  },
) {
  const ref = await addDoc(collection(db, 'polls'), {
    title: data.title,
    status: 'open',
    candidatePlaceIds: data.candidatePlaceIds,
    allowMultiple: data.allowMultiple,
    deadline: data.deadline ? Timestamp.fromDate(data.deadline) : null,
    createdBy: uid,
    createdByName: userName,
    createdAt: serverTimestamp(),
    resultOrderId: null,
  })
  return ref.id
}

export const updatePoll = (id: string, patch: Partial<Poll>) =>
  updateDoc(doc(db, 'polls', id), patch)

export const castVote = (pollId: string, uid: string, placeIds: string[], voterName: string) =>
  setDoc(doc(db, 'polls', pollId, 'votes', uid), {
    placeIds,
    voterName,
    votedAt: serverTimestamp(),
  })

export const clearVote = (pollId: string, uid: string) =>
  deleteDoc(doc(db, 'polls', pollId, 'votes', uid))

export async function deletePoll(id: string) {
  const votes = await getDocs(collection(db, 'polls', id, 'votes'))
  const batch = writeBatch(db)
  votes.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'polls', id))
  await batch.commit()
}
