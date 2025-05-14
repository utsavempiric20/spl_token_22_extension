use anchor_lang::prelude::*;

declare_id!("59JLGsNy5u2rzooVy4Syc2vBMVLo533AGKYAVcvtytLB");

pub mod instructions;
pub use instructions::*;
pub mod utils;
pub use utils::*;

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
        instructions::mint_tokens(ctx, amount)
    }

    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        instructions::burn_tokens(ctx, amount)
    }

    pub fn close_token_account(ctx: Context<CloseTokenAccount>) -> Result<()> {
        instructions::close_token_account(ctx)
    }

    pub fn freeze_token_account(ctx: Context<FreezeTokenAccount>) -> Result<()> {
        instructions::freeze_token_account(ctx)
    }

    pub fn thaw_token_account(ctx: Context<ThawTokenAccount>) -> Result<()> {
        instructions::thaw_token_account(ctx)
    }
}
