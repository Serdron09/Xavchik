import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { Lang, Member } from '../lib/types'

type Status = 'loading' | 'signedOut' | 'needsJoin' | 'ready'

interface AuthCtx {
  status: Status
  user: User | null
  member: (Member & { id: string }) | null
  isAdmin: boolean
  signInGoogle: () => Promise<void>
  signInAnon: () => Promise<void>
  signOut: () => Promise<void>
  join: (code: string, displayName: string) => Promise<void>
  updateMe: (patch: { displayName?: string; lang?: Lang }) => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<(Member & { id: string }) | null>(null)

  useEffect(() => {
    let unsubMember: (() => void) | undefined
    const unsub = onAuthStateChanged(auth, (u) => {
      unsubMember?.()
      setUser(u)
      if (!u) {
        setMember(null)
        setStatus('signedOut')
        return
      }
      setStatus('loading')
      unsubMember = onSnapshot(
        doc(db, 'members', u.uid),
        (snap) => {
          if (snap.exists()) {
            setMember({ ...(snap.data() as Member), id: snap.id })
            setStatus('ready')
          } else {
            setMember(null)
            setStatus('needsJoin')
          }
        },
        () => {
          setMember(null)
          setStatus('needsJoin')
        },
      )
    })
    return () => {
      unsub()
      unsubMember?.()
    }
  }, [])

  async function join(code: string, displayName: string) {
    const u = auth.currentUser
    if (!u) throw new Error('not signed in')
    const trimmedCode = code.trim().toUpperCase()
    const name = displayName.trim() || u.displayName || 'אנונימי'
    const base = {
      displayName: name,
      photoURL: u.photoURL ?? null,
      inviteCode: trimmedCode,
      lang: (localStorage.getItem('havchik.lang') as Lang) ?? 'he',
      createdAt: serverTimestamp(),
    }

    // First member bootstraps themselves as admin: one batch that also marks the
    // invite doc as claimed. Rules allow it only while adminClaimed is still false,
    // so every later join falls through to the plain member path below.
    try {
      const batch = writeBatch(db)
      batch.set(doc(db, 'members', u.uid), { ...base, role: 'admin' })
      batch.update(doc(db, 'config', 'invite'), { adminClaimed: true })
      await batch.commit()
      return
    } catch {
      /* already claimed, or not permitted — join as a regular member */
    }
    await setDoc(doc(db, 'members', u.uid), { ...base, role: 'member' })
  }

  async function updateMe(patch: { displayName?: string; lang?: Lang }) {
    const u = auth.currentUser
    if (!u) return
    await updateDoc(doc(db, 'members', u.uid), patch)
  }

  const value: AuthCtx = {
    status,
    user,
    member,
    isAdmin: member?.role === 'admin',
    signInGoogle: async () => {
      await signInWithPopup(auth, new GoogleAuthProvider())
    },
    signInAnon: async () => {
      await signInAnonymously(auth)
    },
    signOut: async () => {
      await fbSignOut(auth)
    },
    join,
    updateMe,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
