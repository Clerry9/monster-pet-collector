
-- subscriptions
ALTER TABLE public.subscriptions RENAME COLUMN paddle_subscription_id TO stripe_subscription_id;
ALTER TABLE public.subscriptions RENAME COLUMN paddle_customer_id TO stripe_customer_id;
ALTER INDEX IF EXISTS idx_subscriptions_paddle_id RENAME TO idx_subscriptions_stripe_id;
ALTER TABLE public.subscriptions RENAME CONSTRAINT subscriptions_paddle_subscription_id_key TO subscriptions_stripe_subscription_id_key;

-- purchases
ALTER TABLE public.purchases RENAME COLUMN paddle_transaction_id TO stripe_transaction_id;
ALTER INDEX IF EXISTS idx_purchases_transaction RENAME TO idx_purchases_stripe_transaction;
ALTER TABLE public.purchases RENAME CONSTRAINT purchases_paddle_transaction_id_key TO purchases_stripe_transaction_id_key;

-- pack_analytics
ALTER TABLE public.pack_analytics RENAME COLUMN paddle_transaction_id TO stripe_transaction_id;
