-- Felippe's Log — Coach decisions audit trail.
--
-- Every AI-generated proposal is logged here with the context that drove
-- it, the full proposal JSON, the reasoning text, and whether the user
-- accepted it. This lets you look back at what the coach suggested over
-- time and correlate with actual training outcomes.

CREATE TABLE IF NOT EXISTS coach_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  decision_type TEXT NOT NULL,
  context_summary TEXT,
  proposal JSONB,
  reasoning TEXT,
  applied BOOLEAN NOT NULL DEFAULT false,
  user_modifications JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_decisions_user_date
  ON coach_decisions(user_id, created_at DESC);

ALTER TABLE coach_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own coach decisions" ON coach_decisions
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
