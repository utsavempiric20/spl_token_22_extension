use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{ burn, mint_to, transfer_checked, Burn, MintTo, TransferChecked },
    token_interface::{ Mint, Token2022, TokenAccount },
};
use std::mem::size_of;

// Initialize a new liquidity pool with two tokens
pub fn initialize_liquidity_pool(
    ctx: Context<LiquidityPool>,
    pool_name: String,
    pool_fee_bps: u16
) -> Result<()> {
    require!(pool_fee_bps < (FEE_DENOM as u16), AmmError::InvalidFee);

    let pool = &mut ctx.accounts.pool;
    pool.bump = ctx.bumps.pool;
    pool.pool_name = pool_name;
    pool.token_a_mint = ctx.accounts.token_a_mint.key();
    pool.token_b_mint = ctx.accounts.token_b_mint.key();
    pool.vault_a = ctx.accounts.vault_token_a.key();
    pool.vault_b = ctx.accounts.vault_token_b.key();
    pool.reserve_a = 0;
    pool.reserve_b = 0;
    pool.total_lp_supply = 0;
    pool.fee_bps = pool_fee_bps;

    emit!(PoolCreated {
        pool: pool.key(),
        mint_a: pool.token_a_mint,
        mint_b: pool.token_b_mint,
        fee_bps: pool_fee_bps,
    });
    Ok(())
}

// Fee denominator (10000 = 100%)
pub const FEE_DENOM: u128 = 10_000;

// Add liquidity to the pool
pub fn add_liquidity(
    ctx: Context<AddLiquidity>,
    amount_a_desired: u64,
    max_amount_b: u64
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let vault_a = &ctx.accounts.vault_a;
    let vault_b = &ctx.accounts.vault_b;

    let reserve_a: u128 = vault_a.amount.into();
    let reserve_b: u128 = vault_b.amount.into();

    // Calculate optimal amount of token B
    let amount_b_optimal: u64 = if reserve_a == 0 && reserve_b == 0 {
        max_amount_b
    } else {
        let q = checked_mul(amount_a_desired as u128, reserve_b)?
            .checked_div(reserve_a)
            .unwrap() as u64;
        require!(q <= max_amount_b, AmmError::ExcessiveB);
        q
    };

    let tp = ctx.accounts.token_program.to_account_info();
    let depositor = ctx.accounts.depositor.to_account_info();

    // Transfer token A from user to vault
    transfer_checked(
        CpiContext::new(tp.clone(), TransferChecked {
            from: ctx.accounts.user_token_a_account.to_account_info(),
            to: vault_a.to_account_info(),
            authority: depositor.clone(),
            mint: ctx.accounts.token_a_mint.to_account_info(),
        }),
        amount_a_desired,
        ctx.accounts.token_a_mint.decimals
    )?;

    // Transfer token B from user to vault
    transfer_checked(
        CpiContext::new(tp.clone(), TransferChecked {
            from: ctx.accounts.user_token_b_account.to_account_info(),
            to: vault_b.to_account_info(),
            authority: depositor,
            mint: ctx.accounts.token_b_mint.to_account_info(),
        }),
        amount_b_optimal,
        ctx.accounts.token_b_mint.decimals
    )?;

    // Calculate LP tokens to mint
    let lp_supply: u128 = ctx.accounts.lp_mint.supply.into();
    let lp_to_mint = if lp_supply == 0 {
        isqrt((amount_a_desired as u128) * (amount_b_optimal as u128))
    } else {
        let part_a = checked_mul(amount_a_desired as u128, lp_supply)? / reserve_a;
        let part_b = checked_mul(amount_b_optimal as u128, lp_supply)? / reserve_b;
        part_a.min(part_b) as u64
    };

    // Mint LP tokens to user
    let seeds: &[&[u8]] = &[
        LIQUIDITY_POOL_SEED,
        pool.token_a_mint.as_ref(),
        pool.token_b_mint.as_ref(),
        &[pool.bump],
    ];

    let signer_seeds: &[&[&[u8]]] = &[seeds];

    mint_to(
        CpiContext::new_with_signer(
            tp,
            MintTo {
                mint: ctx.accounts.lp_mint.to_account_info(),
                to: ctx.accounts.user_lp_mint_account.to_account_info(),
                authority: pool.to_account_info(),
            },
            signer_seeds
        ),
        lp_to_mint
    )?;

    // Update pool reserves
    pool.reserve_a = reserve_a + (amount_a_desired as u128);
    pool.reserve_b = reserve_b + (amount_b_optimal as u128);
    pool.total_lp_supply = lp_supply + (lp_to_mint as u128);

    emit!(LiquidityAdded {
        pool: pool.key(),
        depositor: ctx.accounts.depositor.key(),
        amount_a: amount_a_desired,
        amount_b: amount_b_optimal,
        lp_minted: lp_to_mint,
    });
    Ok(())
}

// Remove liquidity from the pool
pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, lp_amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let vault_a = &ctx.accounts.vault_a;
    let vault_b = &ctx.accounts.vault_b;

    let lp_supply: u128 = ctx.accounts.lp_mint.supply.into();
    require!(lp_amount > 0 && (lp_amount as u128) <= lp_supply, AmmError::InvalidLp);

    // Calculate amounts to return
    let amount_a = checked_mul(lp_amount as u128, pool.reserve_a)? / lp_supply;
    let amount_b = checked_mul(lp_amount as u128, pool.reserve_b)? / lp_supply;
    msg!("pool.reserve_a : {:?}", pool.reserve_a);
    msg!("pool.reserve_a : {:?}", pool.reserve_b);
    msg!("vault_b : {:?}", vault_b);
    msg!("amount_a : {}", amount_a);
    msg!("amount_b : {}", amount_b);
    msg!(
        "user_token_a_account before : {:?}",
        ctx.accounts.user_token_a_account.amount.to_string()
    );
    msg!(
        "user_token_b_account before : {:?}",
        ctx.accounts.user_token_b_account.amount.to_string()
    );

    // Burn LP tokens
    burn(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), Burn {
            mint: ctx.accounts.lp_mint.to_account_info(),
            from: ctx.accounts.user_lp_mint_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        }),
        lp_amount
    )?;

    /* vault → user transfers */
    let seeds: &[&[u8]] = &[
        LIQUIDITY_POOL_SEED,
        pool.token_a_mint.as_ref(),
        pool.token_b_mint.as_ref(),
        &[pool.bump],
    ];

    let signer_seeds: &[&[&[u8]]] = &[seeds];
    let tp = ctx.accounts.token_program.to_account_info();

    // Transfer token A from vault to user
    transfer_checked(
        CpiContext::new_with_signer(
            tp.clone(),
            TransferChecked {
                from: vault_a.to_account_info(),
                to: ctx.accounts.user_token_a_account.to_account_info(),
                authority: pool.to_account_info(),
                mint: ctx.accounts.token_a_mint.to_account_info(),
            },
            signer_seeds
        ),
        amount_a as u64,
        ctx.accounts.token_a_mint.decimals
    )?;
    // Transfer token B from vault to user
    transfer_checked(
        CpiContext::new_with_signer(
            tp,
            TransferChecked {
                from: vault_b.to_account_info(),
                to: ctx.accounts.user_token_b_account.to_account_info(),
                authority: pool.to_account_info(),
                mint: ctx.accounts.token_b_mint.to_account_info(),
            },
            signer_seeds
        ),
        amount_b as u64,
        ctx.accounts.token_b_mint.decimals
    )?;
    msg!(
        "user_token_a_account before : {:?}",
        ctx.accounts.user_token_a_account.amount.to_string()
    );
    msg!(
        "user_token_b_account before : {:?}",
        ctx.accounts.user_token_b_account.amount.to_string()
    );
    // Update pool reserves
    pool.reserve_a -= amount_a;
    pool.reserve_b -= amount_b;
    pool.total_lp_supply = lp_supply - (lp_amount as u128);

    emit!(LiquidityRemoved {
        pool: pool.key(),
        owner: ctx.accounts.owner.key(),
        amount_a: amount_a as u64,
        amount_b: amount_b as u64,
        lp_burned: lp_amount,
    });
    Ok(())
}

// Calculate swap output amount using constant product formula
pub fn calculate_quote_amount(
    reserve_in: u128,
    reserve_out: u128,
    amount_in: u128,
    pool_fee_bps: u16
) -> Result<u128> {
    let after_fee = checked_mul(amount_in, FEE_DENOM - (pool_fee_bps as u128))? / FEE_DENOM;
    let new_in: u128 = after_fee.checked_add(reserve_in).unwrap();
    let total_reserve = checked_mul(reserve_in, reserve_out).unwrap();
    let new_reserve_out = total_reserve.checked_div(new_in).ok_or(AmmError::MathOverflow)?;
    let amount_out: u128 = reserve_out.checked_sub(new_reserve_out).ok_or(AmmError::MathOverflow)?;
    Ok(amount_out)
}

// Get quote for swap amount
pub fn quote(ctx: Context<Quote>, amount_in: u128) -> Result<u128> {
    let pool = &ctx.accounts.pool;
    let token_in = ctx.accounts.token_in_mint.key();
    let token_out = ctx.accounts.token_out_mint.key();
    let mut swap_out_amount = 0;
    if token_in == pool.token_a_mint && token_out == pool.token_b_mint {
        swap_out_amount = calculate_quote_amount(
            pool.reserve_a,
            pool.reserve_b,
            amount_in,
            pool.fee_bps
        )?;
    } else if token_in == pool.token_b_mint && token_out == pool.token_a_mint {
        swap_out_amount = calculate_quote_amount(
            pool.reserve_b,
            pool.reserve_a,
            amount_in,
            pool.fee_bps
        )?;
    } else {
        Err(AmmError::InvalidMint)?;
    }
    Ok(swap_out_amount)
}

// Execute token swap
pub fn swap(ctx: Context<Swap>, amount_in: u64, min_out: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let tp = ctx.accounts.token_program.to_account_info();

    // Determine swap direction and setup variables
    let (
        vault_in,
        vault_out,
        user_in,
        user_out,
        mint_in_ai,
        mint_out_ai,
        dec_in,
        dec_out,
        reserve_in,
        reserve_out,
    ) = if ctx.accounts.vault_in.key() == pool.vault_a {
        (
            &ctx.accounts.vault_in,
            &ctx.accounts.vault_out,
            &ctx.accounts.user_in,
            &ctx.accounts.user_out,
            ctx.accounts.token_a_mint.to_account_info(),
            ctx.accounts.token_b_mint.to_account_info(),
            ctx.accounts.token_a_mint.decimals,
            ctx.accounts.token_b_mint.decimals,
            pool.reserve_a,
            pool.reserve_b,
        )
    } else {
        (
            &ctx.accounts.vault_in,
            &ctx.accounts.vault_out,
            &ctx.accounts.user_in,
            &ctx.accounts.user_out,
            ctx.accounts.token_b_mint.to_account_info(),
            ctx.accounts.token_a_mint.to_account_info(),
            ctx.accounts.token_b_mint.decimals,
            ctx.accounts.token_a_mint.decimals,
            pool.reserve_b,
            pool.reserve_a,
        )
    };

    require!(reserve_in > 0 && reserve_out > 0, AmmError::EmptyPool);

    // Compute swap using constant product formula
    let fee_bps = pool.fee_bps as u128;
    let amount_in_u128 = amount_in as u128;
    let after_fee = checked_mul(amount_in_u128, FEE_DENOM - fee_bps)? / FEE_DENOM;
    let new_in = reserve_in.checked_add(after_fee).unwrap();
    let k = checked_mul(reserve_in, reserve_out)?;
    let new_out = checked_div(k, new_in)?;
    let amount_out = (reserve_out - new_out) as u64;
    require!(amount_out >= min_out, AmmError::SlippageExceeded);

    // Transfer tokens from user to vault
    anchor_spl::token_2022::transfer_checked(
        CpiContext::new(tp.clone(), TransferChecked {
            from: user_in.to_account_info(),
            to: vault_in.to_account_info(),
            authority: ctx.accounts.swapper.to_account_info(),
            mint: mint_in_ai.clone(),
        }),
        amount_in,
        dec_in
    )?;

    // Transfer tokens from vault to user
    let seeds: &[&[u8]] = &[
        LIQUIDITY_POOL_SEED,
        pool.token_a_mint.as_ref(),
        pool.token_b_mint.as_ref(),
        &[pool.bump],
    ];
    anchor_spl::token_2022::transfer_checked(
        CpiContext::new_with_signer(
            tp,
            TransferChecked {
                from: vault_out.to_account_info(),
                to: user_out.to_account_info(),
                authority: pool.to_account_info(),
                mint: mint_out_ai.clone(),
            },
            &[seeds]
        ),
        amount_out,
        dec_out
    )?;

    // Update pool reserves
    if vault_in.key() == pool.vault_a {
        pool.reserve_a = new_in;
        pool.reserve_b = new_out;
    } else {
        pool.reserve_b = new_in;
        pool.reserve_a = new_out;
    }

    emit!(SwapExecuted {
        pool: pool.key(),
        trader: ctx.accounts.swapper.key(),
        amount_in,
        amount_out,
    });

    Ok(())
}

// Safe multiplication with overflow check
fn checked_mul(a: u128, b: u128) -> Result<u128> {
    a.checked_mul(b).ok_or(AmmError::MathOverflow.into())
}
// Safe division with overflow check
fn checked_div(a: u128, b: u128) -> Result<u128> {
    a.checked_div(b).ok_or(AmmError::MathOverflow.into())
}

// Integer square root function
fn isqrt(n: u128) -> u64 {
    (n as f64).sqrt() as u64
}

#[derive(Accounts)]
#[instruction(pool_name:String,pool_fee:u16)]
pub struct LiquidityPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_a_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_b_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub vault_token_a: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub vault_token_b: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        seeds = [LIQUIDITY_POOL_SEED, token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump,
        space = 8 + size_of::<LiquidityPoolAMM>(),
        payer = admin
    )]
    pub pool: Box<Account<'info, LiquidityPoolAMM>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
    #[account(
        init,
        seeds = [b"lp_mint", pool.key().as_ref()],
        bump,
        payer = admin,
        mint::decimals = 9,
        mint::authority = pool,
        mint::freeze_authority = pool,
        mint::token_program = token_program
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    pub token_a_mint: InterfaceAccount<'info, Mint>,
    pub token_b_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault_b: InterfaceAccount<'info, TokenAccount>,
    #[account(mut,has_one = vault_a, has_one = vault_b)]
    pub pool: Account<'info, LiquidityPoolAMM>,
    #[account(mut)]
    pub user_token_a_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_b_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub lp_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub user_lp_mint_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault_b: InterfaceAccount<'info, TokenAccount>,
    pub token_a_mint: InterfaceAccount<'info, Mint>,
    pub token_b_mint: InterfaceAccount<'info, Mint>,
    #[account(mut,has_one = vault_a, has_one = vault_b)]
    pub pool: Account<'info, LiquidityPoolAMM>,
    #[account(mut)]
    pub user_token_a_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_b_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub lp_mint: InterfaceAccount<'info, Mint>,
    #[account(mut,)]
    pub user_lp_mint_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub swapper: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, LiquidityPoolAMM>,
    #[account(mut)]
    pub vault_in: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault_out: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user_in: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_out: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub token_a_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub token_b_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct Quote<'info> {
    pub pool: Account<'info, LiquidityPoolAMM>,
    pub token_in_mint: InterfaceAccount<'info, Mint>,
    pub token_out_mint: InterfaceAccount<'info, Mint>,
}

#[event]
pub struct PoolCreated {
    pub pool: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub fee_bps: u16,
}

#[event]
pub struct LiquidityAdded {
    pub pool: Pubkey,
    pub depositor: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub lp_minted: u64,
}

#[event]
pub struct LiquidityRemoved {
    pub pool: Pubkey,
    pub owner: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub lp_burned: u64,
}

#[event]
pub struct SwapExecuted {
    pub pool: Pubkey,
    pub trader: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
}

#[error_code]
pub enum AmmError {
    #[msg("math overflow")]
    MathOverflow,
    #[msg("invalid fee")]
    InvalidFee,
    #[msg("token-b amount exceeds optimum")]
    ExcessiveB,
    #[msg("lp amount invalid")]
    InvalidLp,
    #[msg("pool reserves are zero")]
    EmptyPool,
    #[msg("slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("invalid mint address in pool")]
    InvalidMint,
}
