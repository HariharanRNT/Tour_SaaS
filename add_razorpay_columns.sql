-- Add Razorpay subscription fields to subscriptions table

-- Add razorpay_subscription_id column
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);

-- Add unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription_id 
ON subscriptions(razorpay_subscription_id);

-- Add razorpay_payment_id column  
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);

-- Display current schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;
