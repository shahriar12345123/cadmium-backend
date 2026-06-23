// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.static(require('path').join(__dirname, '../frontend')));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Upgrade Configuration for Cadmium Mining Core
const UPGRADES = [
  { level: 1, cost: 0, rate_add: 0.0, rate: 1.0, duration: 1 },
  { level: 2, cost: 10, rate_add: 0.5, rate: 1.5, duration: 2 },
  { level: 3, cost: 16, rate_add: 1.0, rate: 2.5, duration: 3 },
  { level: 4, cost: 20, rate_add: 1.5, rate: 4.0, duration: 4 },
  { level: 5, cost: 25, rate_add: 2.0, rate: 6.0, duration: 5 },
  { level: 6, cost: 32, rate_add: 2.5, rate: 8.5, duration: 6 },
  { level: 7, cost: 40, rate_add: 3.0, rate: 11.5, duration: 7 },
  { level: 8, cost: 50, rate_add: 3.6, rate: 15.1, duration: 8 },
  { level: 9, cost: 75, rate_add: 4.0, rate: 19.1, duration: 9 },
  { level: 10, cost: 80, rate_add: 4.5, rate: 23.6, duration: 10 },
  { level: 11, cost: 100, rate_add: 5.0, rate: 28.6, duration: 11 },
  { level: 12, cost: 120, rate_add: 5.8, rate: 34.4, duration: 12 },
  { level: 13, cost: 180, rate_add: 6.2, rate: 40.6, duration: 13 },
  { level: 14, cost: 250, rate_add: 8.0, rate: 48.6, duration: 14 },
  { level: 15, cost: 400, rate_add: 10.0, rate: 58.6, duration: 15 },
  { level: 16, cost: 500, rate_add: 12.0, rate: 70.6, duration: 16 },
  { level: 17, cost: 800, rate_add: 15.0, rate: 85.6, duration: 17 },
  { level: 18, cost: 1000, rate_add: 18.0, rate: 103.6, duration: 18 },
  { level: 19, cost: 1200, rate_add: 21.0, rate: 124.6, duration: 19 },
  { level: 20, cost: 1500, rate_add: 24.0, rate: 148.6, duration: 20 },
  { level: 21, cost: 1600, rate_add: 25.0, rate: 173.6, duration: 21 },
  { level: 22, cost: 2000, rate_add: 27.0, rate: 200.6, duration: 22 },
  { level: 23, cost: 2200, rate_add: 30.0, rate: 230.6, duration: 23 },
  { level: 24, cost: 2500, rate_add: 33.0, rate: 263.6, duration: 24 },
  { level: 25, cost: 3000, rate_add: 40.0, rate: 303.6, duration: 25 },
];

// Oxygen Forest Shop Configurations
const TAP_UPGRADES = [
  { level: 1, power: 1, cost: 0 },
  { level: 2, power: 2, cost: 2 },
  { level: 3, power: 4, cost: 6 },
  { level: 4, power: 8, cost: 15 },
  { level: 5, power: 15, cost: 30 },
  { level: 6, power: 30, cost: 70 },
  { level: 7, power: 60, cost: 150 },
  { level: 8, power: 120, cost: 350 },
  { level: 9, power: 250, cost: 800 },
  { level: 10, power: 500, cost: 1800 }
];

const PASSIVE_UPGRADES = [
  { level: 0, rate: 0.00, cost: 0 },
  { level: 1, rate: 0.20, cost: 4 },
  { level: 2, rate: 0.50, cost: 10 },
  { level: 3, rate: 1.20, cost: 25 },
  { level: 4, rate: 2.50, cost: 50 },
  { level: 5, rate: 5.00, cost: 100 },
  { level: 6, rate: 10.00, cost: 220 },
  { level: 7, rate: 20.00, cost: 450 },
  { level: 8, rate: 40.00, cost: 900 },
  { level: 9, rate: 80.00, cost: 1800 },
  { level: 10, rate: 150.00, cost: 3500 }
];

/**
 * Verify Telegram initData (hash) according to docs.
 * Returns payload object if valid, otherwise null.
 */
function verifyTelegramInitData(initData) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const result = {};
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') result[key] = decodeURIComponent(value);
  }
  const hash = params.get('hash');
  const dataCheckString = Object.keys(result)
    .sort()
    .map((k) => `${k}=${result[k]}`)
    .join('\n');
  const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return hmac === hash ? result : null;
}

// Check if we are running in local/development environment bypass mode
function isDevMode() {
  return !BOT_TOKEN || BOT_TOKEN.includes('MockBotToken');
}

// Telegram Join Check Helper
async function checkTelegramMembership(telegramId, chatUsername) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes('MockBotToken')) {
    console.log(`Mocking Telegram membership check for user ${telegramId} in ${chatUsername}`);
    return true;
  }
  try {
    const url = `https://api.telegram.org/bot${token}/getChatMember?chat_id=${chatUsername}&user_id=${telegramId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok && data.result) {
      const status = data.result.status;
      return ['creator', 'administrator', 'member'].includes(status);
    }
    return false;
  } catch (error) {
    console.error('Error checking telegram membership:', error);
    return false;
  }
}

// Handle User Authentication & Upsert (Includes Referrer logic)
async function handleUserAuth(payload, referrerIdStr) {
  const telegramId = parseInt(payload.id, 10);
  const name = payload.first_name || payload.username || 'Operator';

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', telegramId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // Handle Referrer if provided
  let referrerId = null;
  if (referrerIdStr) {
    const parsedRefId = parseInt(referrerIdStr, 10);
    if (!isNaN(parsedRefId) && parsedRefId !== telegramId) {
      // Verify referrer exists
      const { data: referrer } = await supabase
        .from('users')
        .select('*')
        .eq('id', parsedRefId)
        .single();

      if (referrer) {
        referrerId = parsedRefId;
      }
    }
  }

  // Create new user with defaults matching schema.sql
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      id: telegramId,
      name: name,
      referrer_id: referrerId,
      cadmium: 0.0,
      oxygen: 0.0,
      tree_level: 1,
      multiplier: 1.00,
      tap_power: 1,
      passive_rate: 0.00,
      mining_level: 1,
      boost_multiplier: 1.00,
      balance: 0.0000
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // If referred, credit referrer instantly with 5 Cadmium tokens
  if (referrerId) {
    // Fetch referrer's current cadmium balance
    const { data: referrer } = await supabase
      .from('users')
      .select('cadmium')
      .eq('id', referrerId)
      .single();

    if (referrer) {
      const newReferrerBal = parseFloat(referrer.cadmium || 0) + 5.0;
      await supabase
        .from('users')
        .update({ cadmium: newReferrerBal })
        .eq('id', referrerId);

      // Log transaction
      await supabase.from('transactions').insert({
        user_id: referrerId,
        amount: 5.0,
        type: 'referral_bonus'
      });

      // Record referral
      await supabase.from('referrals').insert({
        user_id: referrerId,
        referred_user_id: telegramId,
        bonus_earned: 5.0
      });
    }
  }

  return newUser;
}

// Middleware to authenticate via initData (with dev mode bypass)
async function authMiddleware(req, res, next) {
  const { initData, mockUser } = req.body;
  let payload = verifyTelegramInitData(initData);

  if (!payload && isDevMode()) {
    if (mockUser && mockUser.id) {
      payload = {
        id: mockUser.id.toString(),
        first_name: mockUser.first_name || 'Mock Operator',
        username: mockUser.username || 'mock_operator'
      };
    }
  }

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or missing authentication coordinates' });
  }

  try {
    const user = await handleUserAuth(payload, req.body.referrerId);
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ----------- API Endpoints -----------

// Auth endpoint
app.post('/api/auth', async (req, res) => {
  const { initData, referrerId, mockUser } = req.body;
  let payload = verifyTelegramInitData(initData);

  if (!payload && isDevMode()) {
    if (mockUser && mockUser.id) {
      payload = {
        id: mockUser.id.toString(),
        first_name: mockUser.first_name || 'Mock Operator',
        username: mockUser.username || 'mock_operator'
      };
    }
  }

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or missing authentication coordinates' });
  }

  try {
    const user = await handleUserAuth(payload, referrerId);
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// --- Oxygen Forest Core Mechanics ---

// Interactive Tap Endpoint
app.post('/api/tap', authMiddleware, async (req, res) => {
  const user = req.user;
  const taps = parseInt(req.body.taps || 1, 10);

  if (isNaN(taps) || taps <= 0) {
    return res.status(400).json({ error: 'Invalid taps quantity' });
  }

  // Enforce tapping limits
  const now = new Date();
  const lastTap = user.last_tap_at ? new Date(user.last_tap_at) : now;
  const elapsedMs = now.getTime() - lastTap.getTime();

  const maxAllowedTaps = (user.tap_rate_limit || 10) * Math.max(1, elapsedMs / 1000);
  // Add a threshold of 10 for latency spikes
  if (elapsedMs > 0 && taps > maxAllowedTaps + 10) {
    return res.status(429).json({ error: 'Core frequency anomaly detected: rate limit exceeded' });
  }

  const tapPower = parseFloat(user.tap_power || 1);
  const multiplier = parseFloat(user.multiplier || 1.0);
  const earned = taps * tapPower * multiplier;

  const newOxygen = parseFloat(user.oxygen || 0) + earned;

  const { data: updated, error } = await supabase
    .from('users')
    .update({
      oxygen: newOxygen,
      last_tap_at: now
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Log transaction asynchronously
  supabase.from('transactions').insert({
    user_id: user.id,
    amount: earned,
    type: 'tap'
  }).then(({ error }) => { if (error) console.error('Error logging tap transaction:', error); });

  res.json({ earned, user: updated });
});

// Passive Income Claim Endpoint
app.post('/api/claim_passive', authMiddleware, async (req, res) => {
  const user = req.user;
  const now = new Date();

  const lastClaim = user.last_passive_claim_at ? new Date(user.last_passive_claim_at) : (user.created_at ? new Date(user.created_at) : now);
  let elapsedSeconds = (now.getTime() - lastClaim.getTime()) / 1000;

  if (elapsedSeconds <= 0) {
    return res.json({ earned: 0, user });
  }

  // Cap passive accumulation at 12 hours
  const MAX_PASSIVE_SECONDS = 12 * 60 * 60;
  let capped = false;
  if (elapsedSeconds > MAX_PASSIVE_SECONDS) {
    elapsedSeconds = MAX_PASSIVE_SECONDS;
    capped = true;
  }

  const passiveRate = parseFloat(user.passive_rate || 0);
  if (passiveRate <= 0) {
    // Sync claim time if no passive synthesizers are unlocked
    const { data: updated, error } = await supabase
      .from('users')
      .update({ last_passive_claim_at: now })
      .eq('id', user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ earned: 0, user: updated });
  }

  const multiplier = parseFloat(user.multiplier || 1.0);
  const earned = elapsedSeconds * passiveRate * multiplier;
  const newOxygen = parseFloat(user.oxygen || 0) + earned;

  const { data: updated, error } = await supabase
    .from('users')
    .update({
      oxygen: newOxygen,
      last_passive_claim_at: now
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: earned,
    type: 'passive'
  });

  res.json({ earned, user: updated, capped });
});

// Upgrade Forest / Biosphere Items
app.post('/api/upgrade_forest', authMiddleware, async (req, res) => {
  const user = req.user;
  const { item } = req.body;

  if (!item) return res.status(400).json({ error: 'Upgrade item parameter is required' });

  const updates = {};
  let cost = 0;
  let currency = 'cadmium';

  if (item === 'tap_power') {
    const currentPower = parseInt(user.tap_power || 1, 10);
    const currentConfig = TAP_UPGRADES.find(u => u.power === currentPower) || TAP_UPGRADES[0];
    const nextConfig = TAP_UPGRADES.find(u => u.level === currentConfig.level + 1);

    if (!nextConfig) return res.status(400).json({ error: 'Quantum Tappers are at maximum level' });

    cost = nextConfig.cost;
    currency = 'cadmium';

    if (parseFloat(user.cadmium || 0) < cost) {
      return res.status(400).json({ error: `Insufficient Cadmium. Requires ${cost} Cd.` });
    }

    updates.cadmium = parseFloat(user.cadmium || 0) - cost;
    updates.tap_power = nextConfig.power;

  } else if (item === 'passive_rate') {
    const currentRate = parseFloat(user.passive_rate || 0);
    const currentConfig = PASSIVE_UPGRADES.reduce((prev, curr) =>
      Math.abs(curr.rate - currentRate) < Math.abs(prev.rate - currentRate) ? curr : prev
    );
    const nextConfig = PASSIVE_UPGRADES.find(u => u.level === currentConfig.level + 1);

    if (!nextConfig) return res.status(400).json({ error: 'Oxygen Synthesizers are at maximum level' });

    cost = nextConfig.cost;
    currency = 'cadmium';

    if (parseFloat(user.cadmium || 0) < cost) {
      return res.status(400).json({ error: `Insufficient Cadmium. Requires ${cost} Cd.` });
    }

    updates.cadmium = parseFloat(user.cadmium || 0) - cost;
    updates.passive_rate = nextConfig.rate;

  } else if (item === 'tree_level') {
    const currentLvl = parseInt(user.tree_level || 1, 10);
    cost = Math.round(100 * Math.pow(1.8, currentLvl - 1));
    currency = 'oxygen';

    if (parseFloat(user.oxygen || 0) < cost) {
      return res.status(400).json({ error: `Insufficient Oxygen. Requires ${cost.toFixed(1)} O₂.` });
    }

    updates.oxygen = parseFloat(user.oxygen || 0) - cost;
    updates.tree_level = currentLvl + 1;
    updates.multiplier = 1.0 + (updates.tree_level - 1) * 0.20; // 20% multiplier boost per level

  } else {
    return res.status(400).json({ error: 'Invalid upgrade category selected' });
  }

  const { data: updated, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: -cost,
    type: 'upgrade_cost'
  });

  res.json({ message: 'Biosphere upgrade successful', user: updated });
});


// --- Cadmium Mining Core Endpoints ---

// Start Mining Session
app.post('/api/start_mining', authMiddleware, async (req, res) => {
  const user = req.user;
  const now = new Date();

  // Check upgrade level parameters
  const lvlConfig = UPGRADES.find(u => u.level === (user.mining_level || 1)) || UPGRADES[0];
  const durationMs = lvlConfig.duration * 60 * 60 * 1000; // L hours in ms
  const end = new Date(now.getTime() + durationMs);

  const { data: updated, error } = await supabase
    .from('users')
    .update({
      mining_start_at: now,
      mining_end_at: end,
      boost_multiplier: 1.00
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: updated });
});

// Claim Mining Rewards
app.post('/api/claim', authMiddleware, async (req, res) => {
  const user = req.user;
  const now = new Date();

  if (!user.mining_start_at || !user.mining_end_at) {
    return res.status(400).json({ error: 'Mining session has not started' });
  }

  const end = new Date(user.mining_end_at);
  if (now < end) {
    return res.status(400).json({ error: 'Mining session is still active' });
  }

  const lvlConfig = UPGRADES.find(u => u.level === (user.mining_level || 1)) || UPGRADES[0];
  const baseRate = lvlConfig.rate; // Total rate/hr (already contains increments)
  const hours = lvlConfig.duration;

  // Calculate reward
  let earned = baseRate * hours * parseFloat(user.boost_multiplier || 1.0);

  // Referral commissions (0.5% for referee and 0.5% for referrer)
  let refereeBonus = 0;
  if (user.referrer_id) {
    refereeBonus = earned * 0.005; // 0.5% commission
    earned += refereeBonus;

    // Award 0.5% to referrer
    const referrerId = user.referrer_id;
    const { data: referrer } = await supabase
      .from('users')
      .select('cadmium')
      .eq('id', referrerId)
      .single();

    if (referrer) {
      const refComm = earned * 0.005;
      await supabase
        .from('users')
        .update({ cadmium: parseFloat(referrer.cadmium || 0) + refComm })
        .eq('id', referrerId);

      await supabase.from('transactions').insert({
        user_id: referrerId,
        amount: refComm,
        type: 'referral_bonus'
      });
    }
  }

  const newCadmium = parseFloat(user.cadmium || 0) + earned;

  // Reset mining session and award Cadmium
  const { data: updated, error } = await supabase
    .from('users')
    .update({
      cadmium: newCadmium,
      mining_start_at: null,
      mining_end_at: null,
      boost_multiplier: 1.00
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Log transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: earned,
    type: 'claim_reward'
  });

  res.json({ earned, user: updated });
});

// Upgrade Mining Core Level
app.post('/api/upgrade', authMiddleware, async (req, res) => {
  const user = req.user;
  const currentLvl = user.mining_level || 1;
  const nextLvlConfig = UPGRADES.find(u => u.level === currentLvl + 1);

  if (!nextLvlConfig) {
    return res.status(400).json({ error: 'Already at maximum level' });
  }

  const cost = nextLvlConfig.cost;
  const currentCadmium = parseFloat(user.cadmium || 0);

  if (currentCadmium < cost) {
    return res.status(400).json({ error: 'Insufficient Cadmium tokens' });
  }

  // Deduct cost and upgrade level
  const updates = {
    cadmium: currentCadmium - cost,
    mining_level: nextLvlConfig.level
  };

  // If user is currently mining, extend their end time by 1 hour
  if (user.mining_end_at && new Date() < new Date(user.mining_end_at)) {
    const oldEnd = new Date(user.mining_end_at);
    updates.mining_end_at = new Date(oldEnd.getTime() + 60 * 60 * 1000);
  }

  const { data: updated, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Log transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: -cost,
    type: 'upgrade_cost'
  });

  res.json({ message: 'Upgrade successful', user: updated });
});

// Boost Endpoint
app.post('/api/boost', authMiddleware, async (req, res) => {
  const user = req.user;
  const now = new Date();

  if (!user.mining_start_at || !user.mining_end_at) {
    return res.status(400).json({ error: 'Boost can only be applied during an active mining session' });
  }

  const end = new Date(user.mining_end_at);
  if (now >= end) {
    return res.status(400).json({ error: 'Mining session has already ended' });
  }

  const currentCadmium = parseFloat(user.cadmium || 0);
  if (currentCadmium < 1.0) {
    return res.status(400).json({ error: 'Insufficient Cadmium tokens (requires 1 token)' });
  }

  // Boost adds 20% of base mining duration to mining_end_at
  const lvlConfig = UPGRADES.find(u => u.level === (user.mining_level || 1)) || UPGRADES[0];
  const baseDurationMs = lvlConfig.duration * 60 * 60 * 1000;
  const extensionMs = baseDurationMs * 0.20;

  const newEnd = new Date(end.getTime() + extensionMs);
  const newMultiplier = parseFloat(user.boost_multiplier || 1.0) * 1.15;

  const { data: updated, error } = await supabase
    .from('users')
    .update({
      cadmium: currentCadmium - 1.0,
      mining_end_at: newEnd,
      boost_multiplier: newMultiplier
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Log transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: -1.0,
    type: 'boost_cost'
  });

  res.json({ message: 'Boost applied successfully', user: updated });
});

// Task Completion Endpoint (with actual check for Telegram channel join)
app.post('/api/task/complete', authMiddleware, async (req, res) => {
  const { taskId } = req.body;
  const user = req.user;

  // Simple check: task must exist
  const { data: task, error: tErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (tErr || !task) return res.status(400).json({ error: 'Invalid task' });

  // Perform custom task validation
  if (taskId === 'join_channel') {
    const isMember = await checkTelegramMembership(user.id, '@cadmium_news_channel');
    if (!isMember) {
      return res.status(400).json({ error: 'Failed to verify. Please make sure you have joined the channel.' });
    }
  }

  // If milestone task, verify referral count
  if (taskId.startsWith('ref_')) {
    const requiredRefs = parseInt(taskId.split('_')[1], 10);
    const { count, error: countErr } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countErr || count < requiredRefs) {
      return res.status(400).json({ error: `You need at least ${requiredRefs} referrals to complete this task.` });
    }
  }

  // Insert into user_tasks (idempotent if already completed)
  const { error: utErr } = await supabase
    .from('user_tasks')
    .upsert({ user_id: user.id, task_id: taskId, completed: true }, { onConflict: ['user_id', 'task_id'] });

  if (utErr) return res.status(500).json({ error: utErr.message });

  // Reward user Cadmium
  const newCadmium = parseFloat(user.cadmium || 0) + parseFloat(task.reward);
  const { data: updated, error } = await supabase
    .from('users')
    .update({ cadmium: newCadmium })
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: task.reward,
    type: 'task_reward'
  });

  res.json({ message: 'Task completed successfully', user: updated });
});

// Leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, cadmium')
    .order('cadmium', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ leaderboard: data });
});

// Wallet endpoint
app.get('/api/wallet', authMiddleware, async (req, res) => {
  const user = req.user;
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('id, amount, type, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ balance: user.balance, cadmium: user.cadmium, oxygen: user.oxygen, tree_level: user.tree_level, transactions: txs });
});

// Token Swap Endpoint (Oxygen -> OFT balance)
app.post('/api/wallet/swap', authMiddleware, async (req, res) => {
  const user = req.user;
  const amount = parseFloat(req.body.amount);

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid swap amount coordinates' });
  }

  if (parseFloat(user.oxygen || 0) < amount) {
    return res.status(400).json({ error: `Insufficient Oxygen. Swap requires ${amount} O₂.` });
  }

  // 1000 Oxygen = 1 OFT Token
  const SWAP_RATE = 1000;
  const oftEarned = amount / SWAP_RATE;

  const newOxygen = parseFloat(user.oxygen || 0) - amount;
  const newBalance = parseFloat(user.balance || 0) + oftEarned;

  const { data: updated, error } = await supabase
    .from('users')
    .update({
      oxygen: newOxygen,
      balance: newBalance
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('transactions').insert([
    { user_id: user.id, amount: -amount, type: 'swap_oxygen_out' },
    { user_id: user.id, amount: oftEarned, type: 'swap_oft_in' }
  ]);

  res.json({ message: 'Swap conversion successful', user: updated, oftEarned });
});

// Withdraw request (mock)
app.post('/api/wallet/withdraw', authMiddleware, async (req, res) => {
  const { amount } = req.body;
  const user = req.user;
  const balance = parseFloat(user.balance || 0);

  if (balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

  const { data: updated, error } = await supabase
    .from('users')
    .update({ balance: balance - amount })
    .eq('id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('transactions').insert({
    user_id: user.id,
    amount: -amount,
    type: 'withdraw_request'
  });

  res.json({ message: 'Withdraw request recorded', balance: updated.balance });
});

// Add Referral Count Endpoint
app.post('/api/referrals_count', authMiddleware, async (req, res) => {
  const user = req.user;
  const { count, error } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ referralsCount: count });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend listening on port ${PORT}`));
