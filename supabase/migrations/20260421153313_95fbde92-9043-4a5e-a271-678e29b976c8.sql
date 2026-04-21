-- Enable RLS on realtime.messages (it should already be, but ensure it)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present so this migration is idempotent
DROP POLICY IF EXISTS "Users can subscribe to own season channel" ON realtime.messages;

-- Allow authenticated users to receive realtime messages ONLY on their personal topic
CREATE POLICY "Users can subscribe to own season channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'season-' || auth.uid()::text
);
