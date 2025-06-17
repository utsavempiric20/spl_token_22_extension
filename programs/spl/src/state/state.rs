use anchor_lang::prelude::*;

pub const POOL_SEED: &[u8] = b"staking_pool";
pub const USER_STAKE_SEED: &[u8] = b"user_stake";
pub const LIQUIDITY_POOL_SEED: &[u8] = b"liquidity_pool";
/// staking
#[account]
pub struct StakingPool {
    /// The mint of the token users stake.
    pub stake_mint: Pubkey,

    /// The mint of the token used for rewards.
    pub reward_mint: Pubkey,

    /// Vault that holds all deposited stake tokens.
    pub stake_vault: Pubkey,

    /// Vault that holds all reward tokens (funded in advance by admin).
    pub reward_vault: Pubkey,

    /// Admin/owner of this pool (can change reward rate and top up rewards).
    pub admin: Pubkey,

    /// Total amount of stake tokens currently staked.
    pub total_staked: u128,

    /// Reward rate per second, scaled by 1e12 (to allow fractional).
    /// E.g. if you want to pay out 1 token per second, store 1_000_000_000_000.
    pub reward_rate_per_day: u128,

    /// Accumulated reward per staked token, scaled by 1e12.
    /// Updated on each stake/unstake/claim.
    pub reward_per_token_stored: u128,

    /// Last timestamp (in Unix seconds) when we updated `reward_per_token_stored`.
    pub last_update_time: i64,
    pub paused: bool,
}

/// Each user’s individual stake account
#[account]
pub struct UserStake {
    /// Which staking pool this belongs to.
    pub pool: Pubkey,

    /// The user who staked.
    pub staker: Pubkey,

    /// How many stake tokens this user has deposited.
    pub amount_staked: u128,

    /// The user’s “reward debt” = `amount_staked * reward_per_token_stored` at the last update.
    /// When we accrue new rewards, we compare current vs. this to figure out “owed” rewards.
    pub reward_debt: u128,

    /// Accumulated but unclaimed rewards.
    pub pending_rewards: u128,

    pub last_stake_time: i64,
}

/// AMM
#[account]
pub struct LiquidityPoolAMM {
    pub pool_name: String,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    pub amount0: u128,
    pub amount1: u128,
    pub total_liquidity: u128,
    pub pool_fee: f32,
}
