// Types de la base, écrits à la main pour le socle.
// À remplacer par `npx supabase gen types typescript --project-id <id> > types/database.ts`
// dès que le projet Supabase existe.

export type DomainKey =
  | 'sante' | 'relations' | 'finances' | 'temps'
  | 'responsabilites' | 'croissance' | 'spiritualite'

export interface DomainRow {
  id: string
  user_id: string
  key: DomainKey
  label: string
  color: string
  position: number
  is_active: boolean
}

export interface CheckinRow {
  id: string
  user_id: string
  day: string
  energy: number | null
  peace: number | null
  sleep_hours: number | null
  gratitude: string | null
  note: string | null
}

export interface ProfileRow {
  user_id: string
  display_name: string | null
  timezone: string
  week_starts_on: 0 | 1
  review_weekday: number
  max_active_commitments: number
  focus_domains: DomainKey[]
}

export interface SignalRow {
  user_id: string
  domain_key: DomainKey | null
  level: 'info' | 'attention'
  rule: string
  message: string
}

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] }

export interface Database {
  public: {
    Tables: {
      domain: Table<DomainRow>
      checkin: Table<CheckinRow>
      profile: Table<ProfileRow>
    }
    Views: {
      signals: { Row: SignalRow; Relationships: [] }
    }
    Functions: Record<string, never>
    Enums: { domain_key: DomainKey }
    CompositeTypes: Record<string, never>
  }
}
