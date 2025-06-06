#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("4E4Cxz3VT5fjPVTC7e6y6JC3WvDZ3F2LuN9StRHhiMS8");

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

    pub fn stake(ctx: Context<Stake>, amount: u64, decimals: u8) -> Result<()> {
        instructions::stake_tokens(ctx, amount, decimals)
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64, decimals: u8) -> Result<()> {
        instructions::unstake_tokens(ctx, amount, decimals)
    }

    pub fn claim_rewards_stake(ctx: Context<ClaimRewards>, decimals: u8) -> Result<()> {
        instructions::claim_rewards(ctx, decimals)
    }

    pub fn set_reward_rate_stake(ctx: Context<SetRewardRate>, new_rate: u64) -> Result<()> {
        instructions::set_reward_rate(ctx, new_rate)
    }
}
