#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("C1QrbSXfsm94jPzoucAa8ZX3EdxTUeDvJP9mV8NtZxx");

pub mod instructions;
pub use instructions::*;
pub mod utils;
pub use utils::*;
pub mod state;
pub use state::*;

#[program]
pub mod spl {
    use super::*;

    pub fn create_mint_account(
        ctx: Context<CreateMintAccount>,
        decimals: u8,
        name: String,
        symbol: String,
        uri: String
    ) -> Result<()> {
        instructions::handler(ctx, decimals, name, symbol, uri)
    }

    pub fn check_mint_extensions_constraints(
        _ctx: Context<CheckMintExtensionConstraints>
    ) -> Result<()> {
        Ok(())
    }

    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        instructions::mint_spl_tokens(ctx, amount)
    }

    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        instructions::burn_spl_tokens(ctx, amount)
    }

    pub fn close_token_account(ctx: Context<CloseTokenAccount>) -> Result<()> {
        instructions::close_spl_token_account(ctx)
    }

    pub fn freeze_token_account(ctx: Context<FreezeTokenAccount>) -> Result<()> {
        instructions::freeze_spl_token_account(ctx)
    }

    pub fn thaw_token_account(ctx: Context<ThawTokenAccount>) -> Result<()> {
        instructions::thaw_spl_token_account(ctx)
    }

    pub fn initialize_pool_stake(
        ctx: Context<InitializePool>,
        reward_rate_per_second: u128
    ) -> Result<()> {
        instructions::initialize_pool(ctx, reward_rate_per_second)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        instructions::stake_tokens(ctx, amount)
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        instructions::unstake_tokens(ctx, amount)
    }

    pub fn claim_rewards_stake(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards(ctx)
    }

    pub fn set_reward_rate_stake(ctx: Context<SetRewardRate>, new_rate: u64) -> Result<()> {
        instructions::set_reward_rate(ctx, new_rate)
    }

    pub fn deposit_rewards_admin(ctx: Context<DepositRewards>, amount: u64) -> Result<()> {
        instructions::deposit_rewards(ctx, amount)
    }

    pub fn pause_pool_admin(ctx: Context<PausePool>) -> Result<()> {
        instructions::pause_pool(ctx)
    }

    pub fn unpause_pool_admin(ctx: Context<PausePool>) -> Result<()> {
        instructions::unpause_pool(ctx)
    }

    pub fn emergency_withdraw_stake(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        instructions::emergency_withdraw(ctx)
    }
}
