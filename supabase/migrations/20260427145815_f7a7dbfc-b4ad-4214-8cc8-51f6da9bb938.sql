DROP POLICY IF EXISTS "Users can subscribe to own season channel" ON realtime.messages;

CREATE POLICY "Users can subscribe to own season channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
