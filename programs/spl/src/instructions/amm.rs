use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::Token2022,
    token_interface::{ Mint, TokenAccount },
};
use std::mem::size_of;

pub fn initialize_liquidity_pool(
    ctx: Context<LiquidityPool>,
    pool_name: String,
    pool_fee: f32
) -> Result<()> {
    let liquidity_pool = &mut ctx.accounts.pool;
    liquidity_pool.pool_name = pool_name;
    liquidity_pool.token_a_mint = ctx.accounts.token_a_mint.key();
    liquidity_pool.token_b_mint = ctx.accounts.token_b_mint.key();
    liquidity_pool.vault_a = ctx.accounts.vault_token_a.key();
    liquidity_pool.vault_b = ctx.accounts.vault_token_b.key();
    liquidity_pool.amount0 = 0;
    liquidity_pool.amount1 = 0;
    liquidity_pool.total_liquidity = 0;
    liquidity_pool.pool_fee = pool_fee;
    Ok(())
}

#[derive(Accounts)]
#[instruction(pool_name:String,pool_fee:f32)]
pub struct LiquidityPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_a_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_b_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init_if_needed,
        associated_token::mint = token_a_mint,
        associated_token::authority = pool,
        associated_token::token_program = token_program,
        payer = admin
    )]
    pub vault_token_a: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        associated_token::mint = token_b_mint,
        associated_token::authority = pool,
        associated_token::token_program = token_program,
        payer = admin
    )]
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
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub depositer: Signer<'info>,
    #[account(mut)]
    pub vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault_b: InterfaceAccount<'info, TokenAccount>,
    #[account(mut,has_one = vault_a, has_one = vault_b)]
    pub pool: Account<'info, LiquidityPoolAMM>,
    #[account(mut, associated_token::mint = pool.token_a_mint, associated_token::authority = depositer)]
    pub user_token_a_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, associated_token::mint = pool.token_b_mint, associated_token::authority = depositer)]
    pub user_token_b_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub lp_mint: InterfaceAccount<'info, Mint>,
    #[account(mut,associated_token::mint = lp_mint, associated_token::authority = depositer)]
    pub user_lp_mint_account: InterfaceAccount<'info, TokenAccount>,
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
    #[account(mut,has_one = vault_a, has_one = vault_b)]
    pub pool: Account<'info, LiquidityPoolAMM>,
    #[account(mut, associated_token::mint = pool.token_a_mint, associated_token::authority = owner)]
    pub user_token_a_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, associated_token::mint = pool.token_b_mint, associated_token::authority = owner)]
    pub user_token_b_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub lp_mint: InterfaceAccount<'info, Mint>,
    #[account(mut,associated_token::mint = lp_mint, associated_token::authority = owner)]
    pub user_lp_mint_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub swapper: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, LiquidityPoolAMM>,
    #[account(mut)]
    pub vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub vault_b: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub token_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub token_b: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Program<'info, Token2022>,
}
