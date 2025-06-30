#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

// Program ID for the SPL Token Platform
declare_id!("9Lj9S2iWdGVH8tcX1gbChc4cnChspm3G8gbDCBW4r3VA");

pub mod instructions;
pub use instructions::*;
pub mod utils;
pub use utils::*;
pub mod state;
pub use state::*;

#[program]
pub mod spl {
    use super::*;

    // TOKEN MANAGEMENT FUNCTIONS

    // Create new SPL Token-2022 with metadata
    pub fn create_mint_account(
        ctx: Context<CreateMintAccount>,
        decimals: u8,
        name: String,
        symbol: String,
        uri: String
    ) -> Result<()> {
        instructions::handler(ctx, decimals, name, symbol, uri)
    }

    // Validate mint extension constraints
    pub fn check_mint_extensions_constraints(
        _ctx: Context<CheckMintExtensionConstraints>
    ) -> Result<()> {
        Ok(())
    }

    // Mint new tokens to specified account
    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        instructions::mint_spl_tokens(ctx, amount)
    }

    // Burn tokens from specified account
    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        instructions::burn_spl_tokens(ctx, amount)
    }

    // Close token account and reclaim rent
    pub fn close_token_account(ctx: Context<CloseTokenAccount>) -> Result<()> {
        instructions::close_spl_token_account(ctx)
    }

    // Freeze token account (prevent transfers)
    pub fn freeze_token_account(ctx: Context<FreezeTokenAccount>) -> Result<()> {
        instructions::freeze_spl_token_account(ctx)
    }

    // Thaw token account (allow transfers)
    pub fn thaw_token_account(ctx: Context<ThawTokenAccount>) -> Result<()> {
        instructions::thaw_spl_token_account(ctx)
    }

    // STAKING FUNCTIONS

    // Initialize staking pool with reward rate
    pub fn initialize_pool_stake(
        ctx: Context<InitializePool>,
        reward_rate_per_second: u128
    ) -> Result<()> {
        instructions::initialize_pool(ctx, reward_rate_per_second)
    }

    // Stake tokens into the pool
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        instructions::stake_tokens(ctx, amount)
    }

    // Unstake tokens from the pool
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        instructions::unstake_tokens(ctx, amount)
    }

    // Claim accumulated rewards
    pub fn claim_rewards_stake(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards(ctx)
    }

    // Set new reward rate (admin only)
    pub fn set_reward_rate_stake(ctx: Context<SetRewardRate>, new_rate: u64) -> Result<()> {
        instructions::set_reward_rate(ctx, new_rate)
    }

    // Deposit rewards into pool (admin only)
    pub fn deposit_rewards_admin(ctx: Context<DepositRewards>, amount: u64) -> Result<()> {
        instructions::deposit_rewards(ctx, amount)
    }

    // Pause staking pool (admin only)
    pub fn pause_pool_admin(ctx: Context<PausePool>) -> Result<()> {
        instructions::pause_pool(ctx)
    }

    // Unpause staking pool (admin only)
    pub fn unpause_pool_admin(ctx: Context<PausePool>) -> Result<()> {
        instructions::unpause_pool(ctx)
    }

    // Emergency withdraw with penalty
    pub fn emergency_withdraw_stake(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        instructions::emergency_withdraw(ctx)
    }

    // AMM FUNCTIONS

    // Initialize liquidity pool for token pair
    pub fn initialize_liquidity_pool_amm(
        ctx: Context<LiquidityPool>,
        pool_name: String,
        pool_fee_bps: u16
    ) -> Result<()> {
        instructions::initialize_liquidity_pool(ctx, pool_name, pool_fee_bps)
    }

    // Add liquidity to pool
    pub fn add_liquidity_amm(
        ctx: Context<AddLiquidity>,
        amount_a_desired: u64,
        max_amount_b: u64
    ) -> Result<()> {
        instructions::add_liquidity(ctx, amount_a_desired, max_amount_b)
    }

    // Remove liquidity from pool
    pub fn remove_liquidity_amm(ctx: Context<RemoveLiquidity>, lp_amount: u64) -> Result<()> {
        instructions::remove_liquidity(ctx, lp_amount)
    }

    // Get quote for swap amount
    pub fn quote_amm(ctx: Context<Quote>, amount_in: u128) -> Result<u128> {
        instructions::quote(ctx, amount_in)
    }

    // Execute token swap
    pub fn swap_amm(ctx: Context<Swap>, amount_in: u64, min_out: u64) -> Result<()> {
        instructions::swap(ctx, amount_in, min_out)
    }
}
