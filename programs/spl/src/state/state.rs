use anchor_lang::prelude::*;

// Seed for staking pool PDA
pub const POOL_SEED: &[u8] = b"staking_pool";
// Seed for user stake PDA
pub const USER_STAKE_SEED: &[u8] = b"user_stake";
// Seed for liquidity pool PDA
pub const LIQUIDITY_POOL_SEED: &[u8] = b"liquidity_pool";

/// STAKING POOL STATE
#[account]
pub struct StakingPool {
    /// The mint of the token users stake
    pub stake_mint: Pubkey,

    /// The mint of the token used for rewards
    pub reward_mint: Pubkey,

    /// Vault that holds all deposited stake tokens
    pub stake_vault: Pubkey,

    /// Vault that holds all reward tokens (funded in advance by admin)
    pub reward_vault: Pubkey,

    /// Admin/owner of this pool (can change reward rate and top up rewards)
    pub admin: Pubkey,

    /// Total amount of stake tokens currently staked
    pub total_staked: u128,

    /// Reward rate per second (scaled by PRECISION)
    pub reward_rate_per_day: u128,

    /// Accumulated reward per token (updated on each stake/unstake/claim)
    pub reward_per_token_stored: u128,

    /// Last timestamp when reward_per_token_stored was updated
    pub last_update_time: i64,
    /// Whether the pool is paused
    pub paused: bool,
}

/// Each user's individual stake account
#[account]
pub struct UserStake {
    /// Which staking pool this belongs to
    pub pool: Pubkey,

    /// The user who staked
    pub staker: Pubkey,

    /// How many stake tokens this user has deposited
    pub amount_staked: u128,

    /// User's reward debt = amount_staked * reward_per_token_stored at last update
    /// Used to calculate owed rewards when accruing new rewards
    pub reward_debt: u128,

    /// Accumulated but unclaimed rewards
    pub pending_rewards: u128,

    /// Timestamp of last stake action (for lockup period)
    pub last_stake_time: i64,
}

/// AMM LIQUIDITY POOL STATE
#[account]
pub struct LiquidityPoolAMM {
    /// Name of the pool (e.g., "SOL/USDC")
    pub pool_name: String,

    /// Mint address of token A (e.g., SOL)
    pub token_a_mint: Pubkey,

    /// Mint address of token B (e.g., USDC)
    pub token_b_mint: Pubkey,

    /// Vault that stores token A tokens
    pub vault_a: Pubkey,

    /// Vault that stores token B tokens
    pub vault_b: Pubkey,

    /// Total reserves of token A for swaps
    pub reserve_a: u128,

    /// Total reserves of token B for swaps
    pub reserve_b: u128,

    /// Total supply of LP tokens minted to liquidity providers
    pub total_lp_supply: u128,

    /// Swap fee in basis points (e.g., 30 = 0.3%)
    pub fee_bps: u16,

    /// PDA bump for pool authority
    pub bump: u8,
}
