/**
 * Aussie module — domain registry.
 *
 * The working-holiday-maker survival kit: one domain per world you'll
 * actually work or live in during a PVT in Australia. Each domain teaches
 * its own words before quizzing on them (see AussieDomainSession).
 */

import {
  Coffee,
  FileText,
  HardHat,
  Home,
  MessageCircle,
  Pickaxe,
  Warehouse,
  Wheat,
} from 'lucide-react'
import type { AussieDomain } from '@/types'
import { MINING_WORDS } from './mining'
import { FARM_AGRICULTURE_WORDS } from './farmAgriculture'
import { HOSPITALITY_WORDS } from './hospitality'
import { CONSTRUCTION_WORDS } from './construction'
import { RETAIL_WAREHOUSE_WORDS } from './retailWarehouse'
import { ADMIN_VISA_WORDS } from './adminVisa'
import { DAILY_LIFE_WORDS } from './dailyLife'
import { SLANG_WORDS } from './slang'

export const AUSSIE_DOMAINS: AussieDomain[] = [
  {
    id: 'mining',
    name: 'Mining',
    blurb: 'Rosters, PPE, the machines, and site-life slang.',
    icon: Pickaxe,
    ready: true,
    words: MINING_WORDS,
  },
  {
    id: 'farm-agriculture',
    name: 'Farm & agriculture',
    blurb: 'Fruit picking, packing sheds, seasonal work.',
    icon: Wheat,
    ready: true,
    words: FARM_AGRICULTURE_WORDS,
  },
  {
    id: 'hospitality',
    name: 'Hospitality',
    blurb: 'Cafés, bars, RSA, front-of-house shifts.',
    icon: Coffee,
    ready: true,
    words: HOSPITALITY_WORDS,
  },
  {
    id: 'construction',
    name: 'Construction',
    blurb: 'Sites, tools, trades, and apprenticeships.',
    icon: HardHat,
    ready: true,
    words: CONSTRUCTION_WORDS,
  },
  {
    id: 'retail-warehouse',
    name: 'Retail & warehouse',
    blurb: 'Stocktake, forklifts, casual shifts.',
    icon: Warehouse,
    ready: true,
    words: RETAIL_WAREHOUSE_WORDS,
  },
  {
    id: 'admin-visa',
    name: 'Visa & admin',
    blurb: 'Visas, TFN, superannuation, payslips.',
    icon: FileText,
    ready: true,
    words: ADMIN_VISA_WORDS,
  },
  {
    id: 'daily-life',
    name: 'Daily life',
    blurb: 'Renting, banking, Centrelink, getting around.',
    icon: Home,
    ready: true,
    words: DAILY_LIFE_WORDS,
  },
  {
    id: 'slang',
    name: 'Aussie slang',
    blurb: 'Arvo, servo, bottle-o: how people actually talk.',
    icon: MessageCircle,
    ready: true,
    words: SLANG_WORDS,
  },
]

export function getAussieDomain(id: string): AussieDomain | undefined {
  return AUSSIE_DOMAINS.find((d) => d.id === id)
}
