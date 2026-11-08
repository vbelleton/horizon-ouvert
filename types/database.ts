// Types de la base, écrits à la main pour le socle.
// À remplacer par `npx supabase gen types typescript --project-id <id> > types/database.ts`
// dès que le projet Supabase existe.

export type DomainKey =
  | 'sante' | 'relations' | 'finances' | 'temps'
  | 'responsabilites' | 'croissance' | 'spiritualite'

export type Circle = 'intime' | 'proche' | 'communaute'
export type CommitmentKind = 'role' | 'projet' | 'responsabilite'
export type CommitmentStatus = 'actif' | 'en_pause' | 'termine' | 'abandonne'

export type DomainRow = {
  id: string
  user_id: string
  key: DomainKey
  label: string
  color: string
  position: number
  is_active: boolean
}

export type CheckinRow = {
  id: string
  user_id: string
  day: string
  energy: number | null
  peace: number | null
  sleep_hours: number | null
  gratitude: string | null
  note: string | null
}

export type ProfileRow = {
  user_id: string
  display_name: string | null
  timezone: string
  week_starts_on: 0 | 1
  review_weekday: number
  max_active_commitments: number
  focus_domains: DomainKey[]
}

export type ReviewRow = {
  id: string
  user_id: string
  week_start: string
  highlights: string | null
  gratitude: string | null
  concerns: string | null
  decisions: string | null
  focus_next: string | null
  family_time: boolean | null
  rest_day: boolean | null
  completed_at: string | null
}

export type DomainPulseRow = {
  review_id: string
  domain_id: string
  user_id: string
  score: number | null
  word: string | null
  hours_estimate: number | null
}

export type CommitmentRow = {
  id: string
  user_id: string
  domain_id: string
  title: string
  kind: CommitmentKind
  status: CommitmentStatus
  next_step: string | null
  review_on: string | null
  note: string | null
}

export type PersonRow = {
  id: string
  user_id: string
  name: string
  circle: Circle
  cadence_days: number | null
  last_contact_on: string | null
  note: string | null
}

export type InteractionRow = {
  id: string
  user_id: string
  person_id: string
  day: string
  kind: string
  note: string | null
}

export type IndicatorRow = {
  id: string
  user_id: string
  domain_id: string
  key: string
  label: string
  unit: string | null
  direction: 'up' | 'down' | 'range'
  target: number | null
  target_max: number | null
  source: 'manual' | 'import'
  is_active: boolean
  position: number
}

export type MeasurementRow = {
  indicator_id: string
  user_id: string
  day: string
  value: number
  note: string | null
}

export type JournalEntryRow = {
  id: string
  user_id: string
  day: string
  domain_id: string | null
  body: string
  created_at?: string
}

export type IngestTokenRow = {
  user_id: string
  created_at: string
  last_used_at: string | null
}

export type SignalRow = {
  user_id: string
  domain_key: DomainKey | null
  level: 'info' | 'attention'
  rule: string
  message: string
}

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] }

export type Database = {
  public: {
    Tables: {
      domain: Table<DomainRow>
      checkin: Table<CheckinRow>
      profile: Table<ProfileRow>
      review: Table<ReviewRow>
      domain_pulse: Table<DomainPulseRow>
      commitment: Table<CommitmentRow>
      person: Table<PersonRow>
      interaction: Table<InteractionRow>
      indicator: Table<IndicatorRow>
      measurement: Table<MeasurementRow>
      journal_entry: Table<JournalEntryRow>
      ingest_token: Table<IngestTokenRow>
    }
    Views: {
      signals: { Row: SignalRow; Relationships: [] }
    }
    Functions: {
      create_ingest_token: { Args: Record<string, never>; Returns: string }
      revoke_ingest_token: { Args: Record<string, never>; Returns: undefined }
    }
    Enums: { domain_key: DomainKey }
    CompositeTypes: { [_ in never]: never }
  }
}
