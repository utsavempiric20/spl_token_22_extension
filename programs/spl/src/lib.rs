use anchor_lang::prelude::*;

declare_id!("FPV9rj8nYNDA9We4PRxYcQUkHxTWxzjFsMr6id6H5XDi");

pub mod instructions;
pub mod utils;
pub use instructions::*;
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
        let _ = instructions::handler(ctx, decimals, name, symbol, uri);
        Ok(())
    }

    pub fn check_mint_extensions_constraints(
        _ctx: Context<CheckMintExtensionConstraints>
    ) -> Result<()> {
        Ok(())
    }
}
