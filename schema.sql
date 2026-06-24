-- SQL Schema Setup for Oxygen Forest (Supabase PostgreSQL)

-- 1. Enable UUID Extension if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS user_tasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Create users Table
CREATE TABLE users (
    id BIGINT PRIMARY KEY, -- Telegram User ID
    name TEXT NOT NULL,
    balance NUMERIC(20, 4) DEFAULT 0.0000, -- OFT tokens
    oxygen NUMERIC(20, 2) DEFAULT 0.00,
    tree_level INT DEFAULT 1,
    multiplier NUMERIC(5, 2) DEFAULT 1.00,
    referrer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    tap_power INT DEFAULT 1, -- base oxygen per tap
    passive_rate NUMERIC(10, 2) DEFAULT 0.00, -- oxygen generated per second
    rare_chance NUMERIC(5, 2) DEFAULT 1.00, -- 1.00 means 1% chance
    tap_rate_limit INT DEFAULT 10, -- max taps per second
    last_tap_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_passive_claim_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cadmium NUMERIC(20,2) DEFAULT 0.00,
    mining_start_at TIMESTAMP WITH TIME ZONE,
    mining_end_at TIMESTAMP WITH TIME ZONE,
    mining_level INT DEFAULT 1,
    boost_multiplier NUMERIC(5,2) DEFAULT 1.00,
    referral_code TEXT GENERATED ALWAYS AS (id::TEXT) STORED
);

-- Index for referrals
CREATE INDEX idx_users_referrer ON users(referrer_id);

-- Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: users can SELECT their own row
CREATE POLICY users_select_self ON users
  FOR SELECT
  USING (id = current_setting('app.current_telegram_id', true)::bigint);

-- Policy: users can INSERT a row only for themselves (id must match the Telegram ID set in session)
CREATE POLICY users_insert_self ON users
  FOR INSERT
  WITH CHECK (id = current_setting('app.current_telegram_id', true)::bigint);

-- 4. Create referrals Table
-- The referral system dynamically uses the Telegram User ID.
-- The user's Telegram ID serves directly as their referral code (appended to deep links: https://t.me/bot?start=TG_ID).
-- When a user registers, their referrer_id is mapped to the referrer's Telegram ID.
CREATE TABLE referrals (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The referrer
    referred_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The invited user
    bonus_earned NUMERIC(20, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_referral UNIQUE (user_id, referred_user_id)
);

CREATE INDEX idx_referrals_user ON referrals(user_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_user_id);

-- 5. Create tasks Table
CREATE TABLE tasks (
    id TEXT PRIMARY KEY, -- e.g., 'daily_login', 'join_channel', 'invite_3_friends'
    title TEXT NOT NULL,
    reward NUMERIC(20, 2) NOT NULL, -- Reward in oxygen or tokens (we'll award oxygen)
    type TEXT NOT NULL, -- 'daily', 'social', 'referral'
    requirement_value INT DEFAULT 0 -- e.g. number of friends needed
);

-- 6. Create user_tasks Table
CREATE TABLE user_tasks (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, task_id)
);

-- 7. Create transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(20, 4) NOT NULL,
    type TEXT NOT NULL, -- 'tap', 'passive', 'referral_bonus', 'task_reward', 'withdraw_request', 'upgrade_cost'
    status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);

-- 8. Seed Default Tasks
INSERT INTO tasks (id, title, reward, type, requirement_value) VALUES
('daily_login', 'Daily Login Bonus', 10.00, 'daily', 0),
('join_channel', 'Join Cadmium News Channel', 50.00, 'social', 0),
('ref_3', '3 Referrals Milestone', 150.00, 'referral', 3),
('ref_10', '10 Referrals Milestone', 300.00, 'referral', 10),
('ref_50', '50 Referrals Milestone', 600.00, 'referral', 50),
('ref_100', '100 Referrals Milestone', 1000.00, 'referral', 100),
('ref_500', '500 Referrals Milestone', 3000.00, 'referral', 500),
('ref_1000', '1000 Referrals Milestone', 5000.00, 'referral', 1000),
('ref_10000', '10000 Referrals Milestone', 25000.00, 'referral', 10000)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    reward = EXCLUDED.reward,
    type = EXCLUDED.type,
    requirement_value = EXCLUDED.requirement_value;
