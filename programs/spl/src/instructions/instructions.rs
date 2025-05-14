use anchor_lang::{ prelude::* };

use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{
        mint_to,
        spl_token_2022::extension::{
            group_member_pointer::GroupMemberPointer,
            metadata_pointer::MetadataPointer,
            mint_close_authority::MintCloseAuthority,
            permanent_delegate::PermanentDelegate,
            transfer_hook::TransferHook,
        },
        Burn,
        burn,
        close_account,
        CloseAccount,
        FreezeAccount,
        freeze_account,
        ThawAccount,
        thaw_account,
        MintTo,
    },
    token_interface::{
        spl_token_metadata_interface::state::TokenMetadata,
        token_metadata_initialize,
        Mint,
        Token2022,
        TokenAccount,
        TokenMetadataInitialize,
    },
};
use spl_pod::optional_keys::OptionalNonZeroPubkey;

use crate::utils::*;

pub fn handler(
    ctx: Context<CreateMintAccount>,
    _decimals: u8,
    name: String,
    symbol: String,
    uri: String
) -> Result<()> {
    ctx.accounts.initialize_token_metadata(name.clone(), symbol.clone(), uri.clone())?;
    ctx.accounts.mint.reload()?;

    update_account_lamports_to_minimum_balance(
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.system_program.to_account_info()
    )?;

    Ok(())
}

pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    mint_to(cpi_ctx, amount)?;
    Ok(())
}

/// Burn `amount` tokens from `from`.
pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.from.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    burn(cpi_ctx, amount)?;
    Ok(())
}

/// Close `account`, sending its lamports to `destination`.
pub fn close_token_account(ctx: Context<CloseTokenAccount>) -> Result<()> {
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.account.to_account_info(),
        destination: ctx.accounts.destination.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    close_account(cpi_ctx)?;
    Ok(())
}

/// Freeze `account` (preventing transfers/burns) under `mint`.
pub fn freeze_token_account(ctx: Context<FreezeTokenAccount>) -> Result<()> {
    let cpi_accounts = FreezeAccount {
        account: ctx.accounts.account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.freeze_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    freeze_account(cpi_ctx)?;
    Ok(())
}

/// Thaw (unfreeze) `account` under `mint`.
pub fn thaw_token_account(ctx: Context<ThawTokenAccount>) -> Result<()> {
    let cpi_accounts = ThawAccount {
        account: ctx.accounts.account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.freeze_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    thaw_account(cpi_ctx)?;
    Ok(())
}

impl<'info> CreateMintAccount<'info> {
    fn initialize_token_metadata(&self, name: String, symbol: String, uri: String) -> Result<()> {
        let cpi_accounts = TokenMetadataInitialize {
            token_program_id: self.token_program.to_account_info(),
            mint: self.mint.to_account_info(),
            metadata: self.mint.to_account_info(),
            mint_authority: self.authority.to_account_info(),
            update_authority: self.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), cpi_accounts);
        token_metadata_initialize(cpi_ctx, name, symbol, uri)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(decimals: u8, name: String, symbol: String, uri: String)]
pub struct CreateMintAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    /// CHECK: can be any account
    pub authority: Signer<'info>,
    #[account()]
    /// CHECK: can be any account
    pub receiver: UncheckedAccount<'info>,
    #[account(
        init,
        signer,
        payer = payer,
        mint::token_program = token_program,
        mint::decimals = decimals,
        mint::authority = authority,
        mint::freeze_authority = authority,
        extensions::metadata_pointer::authority = authority,
        extensions::metadata_pointer::metadata_address = mint,
        extensions::group_member_pointer::authority = authority,
        extensions::group_member_pointer::member_address = mint,
        extensions::transfer_hook::authority = authority,
        extensions::transfer_hook::program_id = crate::ID,
        extensions::close_authority::authority = authority,
        extensions::permanent_delegate::delegate = authority
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init,
        payer = payer,
        associated_token::token_program = token_program,
        associated_token::mint = mint,
        associated_token::authority = receiver
    )]
    pub mint_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: This account's data is a buffer of TLV data
    #[account(
        init,
        space = get_meta_list_size(None),
        seeds = [META_LIST_ACCOUNT_SEED, mint.key().as_ref()],
        bump,
        payer = payer
    )]
    pub extra_metas_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct CheckMintExtensionConstraints<'info> {
    #[account(mut)]
    /// CHECK: can be any account
    pub authority: Signer<'info>,
    #[account(
        extensions::metadata_pointer::authority = authority,
        extensions::metadata_pointer::metadata_address = mint,
        extensions::group_member_pointer::authority = authority,
        extensions::group_member_pointer::member_address = mint,
        extensions::transfer_hook::authority = authority,
        extensions::transfer_hook::program_id = crate::ID,
        extensions::close_authority::authority = authority,
        extensions::permanent_delegate::delegate = authority
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    /// The token account to receive newly minted tokens
    #[account(mut)]
    pub to: Box<InterfaceAccount<'info, TokenAccount>>,
    /// Must match the mint’s authority
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    /// The token account to burn from (must have sufficient balance)
    #[account(mut)]
    pub from: Box<InterfaceAccount<'info, TokenAccount>>,
    /// Must match the mint’s authority (or the account’s delegate)
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct CloseTokenAccount<'info> {
    /// The token account to close (must be empty)
    #[account(mut)]
    pub account: Box<InterfaceAccount<'info, TokenAccount>>,
    /// Destination of the reclaimed SOL
    #[account(mut)]
    pub destination: Signer<'info>,
    /// The close-authority of `account`
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct FreezeTokenAccount<'info> {
    /// The token account to freeze (must be initialized)
    #[account(mut)]
    pub account: Box<InterfaceAccount<'info, TokenAccount>>,
    /// The mint under which this account exists
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    /// Must match the mint’s freeze_authority
    pub freeze_authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct ThawTokenAccount<'info> {
    /// The token account to thaw
    #[account(mut)]
    pub account: Box<InterfaceAccount<'info, TokenAccount>>,
    /// The same mint used when freezing
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    /// Must match the mint’s freeze_authority
    pub freeze_authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}
