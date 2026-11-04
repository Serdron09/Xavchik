import type { Timestamp } from 'firebase/firestore'

export type Lang = 'he' | 'ru'
export type Role = 'admin' | 'member'

export interface Member {
  id: string
  displayName: string
  photoURL?: string | null
  role: Role
  lang?: Lang
  createdAt?: Timestamp | null
}

export interface Place {
  id: string
  name: string
  nameNote?: string
  phone?: string
  url?: string
  tags: string[]
  deliveryFee?: number | null
  minOrder?: number | null
  notes?: string
  isArchived: boolean
  createdBy: string
  createdAt?: Timestamp | null
  updatedBy?: string
  updatedAt?: Timestamp | null
}

export interface MenuChoice {
  id: string
  label: string
  priceDelta: number
}

export interface MenuOption {
  id: string
  label: string
  type: 'single' | 'multi'
  required: boolean
  choices: MenuChoice[]
}

export interface MenuItem {
  id: string
  name: string
  description?: string
  price?: number | null
  category?: string
  options: MenuOption[]
  isAvailable: boolean
  sortOrder: number
  createdBy?: string
  updatedBy?: string
  updatedAt?: Timestamp | null
}

export type PollStatus = 'open' | 'closed'

export interface Poll {
  id: string
  title: string
  status: PollStatus
  candidatePlaceIds: string[]
  allowMultiple: boolean
  deadline?: Timestamp | null
  createdBy: string
  createdByName?: string
  createdAt?: Timestamp | null
  resultOrderId?: string | null
}

export interface Vote {
  id: string
  placeIds: string[]
  voterName?: string
  votedAt?: Timestamp | null
}

export type OrderStatus = 'open' | 'locked' | 'done'

export interface Order {
  id: string
  placeId: string
  placeNameSnapshot: string
  title?: string
  status: OrderStatus
  deadline?: Timestamp | null
  notes?: string
  deliveryFee?: number | null
  fromPollId?: string | null
  createdBy: string
  createdByName?: string
  createdAt?: Timestamp | null
  lockedAt?: Timestamp | null
}

export interface SelectedOption {
  optionLabel: string
  choiceLabels: string[]
  priceDelta: number
}

export interface OrderItem {
  id: string
  userId: string
  userNameSnapshot: string
  menuItemId?: string | null
  nameSnapshot: string
  freeText?: string
  selectedOptions: SelectedOption[]
  specialRequest?: string
  qty: number
  priceEstimate?: number | null
  createdAt?: Timestamp | null
  updatedAt?: Timestamp | null
}
