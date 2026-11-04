import { parseMenuLines } from '../src/data/api'
import { buildText, buildCsv, groupByDish, groupByPerson, totals } from '../src/lib/summary'
import type { Order, OrderItem } from '../src/lib/types'

let failed = 0
function eq(name: string, got: unknown, want: unknown) {
  const a = JSON.stringify(got)
  const b = JSON.stringify(want)
  if (a !== b) {
    failed++
    console.log(`FAIL ${name}\n  got  ${a}\n  want ${b}`)
  } else console.log(`ok   ${name}`)
}

// --- menu bulk paste parsing
eq('parse "name - 45"', parseMenuLines('פיצה משפחתית - 68'), [{ name: 'פיצה משפחתית', price: 68 }])
eq('parse "name 45"', parseMenuLines('שווארמה בלאפה 55'), [{ name: 'שווארמה בלאפה', price: 55 }])
eq('parse with shekel', parseMenuLines('קולה זירו 10 ₪'), [{ name: 'קולה זירו', price: 10 }])
eq('parse no price', parseMenuLines('מרק היום'), [{ name: 'מרק היום', price: null }])
eq('parse decimal comma', parseMenuLines('סלט — 32,50'), [{ name: 'סלט', price: 32.5 }])
eq('parse skips blanks', parseMenuLines('a 5\n\n  \nb 6').length, 2)

// --- summary
const item = (o: Partial<OrderItem>): OrderItem => ({
  id: Math.random().toString(36).slice(2),
  userId: 'u1',
  userNameSnapshot: 'Дима',
  menuItemId: 'm1',
  nameSnapshot: 'פיצה',
  selectedOptions: [],
  qty: 1,
  priceEstimate: 50,
  ...o,
})

const order = {
  id: 'o1',
  placeId: 'p1',
  placeNameSnapshot: 'Pizza Shmil',
  status: 'open',
  deliveryFee: 15,
  createdByName: 'Дима',
} as Order

const items: OrderItem[] = [
  item({ userId: 'u1', userNameSnapshot: 'Дима', priceEstimate: 68, specialRequest: 'без лука' }),
  item({ userId: 'u1', userNameSnapshot: 'Дима', nameSnapshot: 'קולה', priceEstimate: 10 }),
  item({ userId: 'u2', userNameSnapshot: 'Саша', nameSnapshot: 'פיצה', priceEstimate: 68 }),
  item({ userId: 'u3', userNameSnapshot: 'Миша', menuItemId: null, nameSnapshot: 'что-то вегетарианское', priceEstimate: null, qty: 2 }),
]

const t = totals(order, items)
eq('totals.items counts qty', t.items, 5)
eq('totals.people', t.people, 3)
eq('totals.sum', t.sum, 146)
eq('totals.grand adds fee', t.grand, 161)
eq('totals.hasUnpriced', t.hasUnpriced, true)

const people = groupByPerson(items)
eq('groupByPerson count', people.length, 3)
eq('groupByPerson sums one person', people.find((p) => p.userId === 'u1')!.sum, 78)
eq('groupByPerson flags unpriced', people.find((p) => p.userId === 'u3')!.hasUnpriced, true)

const dishes = groupByDish(items)
const pizza = dishes.find((d) => d.name === 'פיצה')!
eq('groupByDish merges same dish', !!pizza, true)
eq('groupByDish qty merged', pizza.qty, 2)
eq('groupByDish sums merged', pizza.sum, 136)
eq('groupByDish keeps special requests', pizza.notes, [{ who: 'Дима', text: 'без лука' }])
eq('groupByDish separate free-text line', dishes.some((d) => d.name === 'что-то вегетарианское'), true)

const labels = { deliveryFee: 'Доставка', grandTotal: 'Итого ≈', items: 'позиций', people: 'участников', responsible: 'Ответственный' }
const txt = buildText(order, items, 'person', labels)
eq('text has place', txt.includes('Pizza Shmil'), true)
eq('text has special request', txt.includes('без лука'), true)
eq('text has grand total', txt.includes('161 ₪'), true)
eq('text by dish aggregates', buildText(order, items, 'dish', labels).includes('2× פיצה'), true)

const csv = buildCsv(items)
eq('csv header', csv.split('\n')[0], 'name,dish,options,special,qty,price')
eq('csv rows', csv.split('\n').length, 5)

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
