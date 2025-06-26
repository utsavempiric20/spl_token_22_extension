use anchor_lang::prelude::*;

use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{mint_to, transfer_checked, MintTo, TransferChecked},
    token_interface::{Mint, Token2022, TokenAccount},
};
use std::mem::size_of;

use crate::state::*;

const PRECISION: u128 = 1_000_000_000;
const SECONDS_PER_DAY: u128 = 86_400;
const LOCKUP_PERIOD: i64 = 5;

/// STAKING POOL FUNCTIONS
pub fn initialize_pool(ctx: Context<InitializePool>, reward_rate_per_day: u128) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.stake_mint = ctx.accounts.stake_mint.key();
    pool.reward_mint = ctx.accounts.reward_mint.key();
    pool.stake_vault = ctx.accounts.stake_vault.key();
    pool.reward_vault = ctx.accounts.reward_vault.key();
    pool.admin = ctx.accounts.admin.key();
    pool.total_staked = 0;
    pool.reward_rate_per_day = reward_rate_per_day
        .checked_mul(PRECISION)
        .unwrap()
        .checked_div(SECONDS_PER_DAY)
        .unwrap();
    pool.reward_per_token_stored = 0;
    pool.last_update_time = Clock::get()?.unix_timestamp;
    pool.paused = false;
    Ok(())
}

pub fn stake_tokens(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.pool.paused, StakingError::PoolPaused);

    let pool = &mut ctx.accounts.pool;
    let user = &mut ctx.accounts.user_stake;
    let now = Clock::get()?.unix_timestamp;
    let mint_decimals = ctx.accounts.stake_mint.decimals;

    if user.staker == Pubkey::default() {
        user.staker = ctx.accounts.staker.key();
    }

    if pool.total_staked > 0 {
        let elapsed = (now - pool.last_update_time) as u128;
        let reward: u128 = elapsed
            .checked_mul(pool.reward_rate_per_day)
            .ok_or(StakingError::RewardOverflow)?;
        let add_per_token = reward.checked_div(pool.total_staked).unwrap();
        pool.reward_per_token_stored = pool
            .reward_per_token_stored
            .checked_add(add_per_token)
            .unwrap();
    }
    pool.last_update_time = now;

    // 2) Update user pending rewards
    let stored = pool.reward_per_token_stored;
    if user.amount_staked > 0 {
        let owed = pending_reward(user.amount_staked, stored, user.reward_debt)?;
        user.pending_rewards = user.pending_rewards.checked_add(owed).unwrap();
    }

    // 3) Transfer stake tokens from user → vault
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.user_stake_account.to_account_info(),
        to: ctx.accounts.stake_vault.to_account_info(),
        authority: ctx.accounts.staker.to_account_info(),
        mint: ctx.accounts.stake_mint.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, amount, mint_decimals)?;

    // 4) Update balances
    pool.total_staked = pool.total_staked.checked_add(amount as u128).unwrap();
    user.amount_staked = user.amount_staked.checked_add(amount as u128).unwrap();
    user.reward_debt = user
        .amount_staked
        .checked_mul(pool.reward_per_token_stored)
        .unwrap()
        .checked_div(PRECISION)
        .unwrap();
    user.last_stake_time = now;
    emit!(StakeEvent {
        staker: user.staker,
        amount,
        time: now,
    });
    Ok(())
}

pub fn unstake_tokens(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.pool.paused, StakingError::PoolPaused);
    let user = &mut ctx.accounts.user_stake;
    let now = Clock::get()?.unix_timestamp;
    require!(
        now - user.last_stake_time >= LOCKUP_PERIOD,
        StakingError::LockupNotExpired
    );

    let pool_account_info = ctx.accounts.pool.to_account_info();
    let stake_mint_key = ctx.accounts.stake_mint.key();

    // We also need the PDA bump now, before taking a &mut:
    let (_pool_key, pool_bump) =
        Pubkey::find_program_address(&[POOL_SEED, stake_mint_key.as_ref()], ctx.program_id);
    let seeds: &[&[u8]] = &[POOL_SEED, stake_mint_key.as_ref(), &[pool_bump]];
    let signer_seeds = &[&seeds[..]];

    let pool = &mut ctx.accounts.pool;

    let now = Clock::get()?.unix_timestamp;

    require!(
        user.amount_staked >= (amount as u128),
        StakingError::InsufficientStaked
    );

    // 1) Update global reward_per_token_stored
    if pool.total_staked > 0 {
        let elapsed = (now - pool.last_update_time) as u128;
        let reward = elapsed
            .checked_mul(pool.reward_rate_per_day)
            .ok_or(StakingError::RewardOverflow)?;
        let add_per_token = reward.checked_div(pool.total_staked).unwrap();
        pool.reward_per_token_stored = pool
            .reward_per_token_stored
            .checked_add(add_per_token)
            .unwrap();
    }
    pool.last_update_time = now;

    // 2) Update user pending rewards
    let stored = pool.reward_per_token_stored;
    let owed = pending_reward(user.amount_staked, stored, user.reward_debt)?;
    user.pending_rewards = user.pending_rewards.checked_add(owed).unwrap();

    // 3) Decrease user stake and pool total
    user.amount_staked = user.amount_staked.checked_sub(amount as u128).unwrap();
    pool.total_staked = pool.total_staked.checked_sub(amount as u128).unwrap();

    // 4) Transfer stake tokens back: vault → user
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.stake_vault.to_account_info(),
        to: ctx.accounts.user_stake_account.to_account_info(),
        authority: pool_account_info.clone(),
        mint: ctx.accounts.stake_mint.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    transfer_checked(cpi_ctx, amount, ctx.accounts.stake_mint.decimals)?;

    // 5) Pay out pending rewards (if any)
    if user.pending_rewards > 0 {
        if user.pending_rewards > (u64::MAX as u128) {
            return err!(StakingError::RewardOverflow);
        }
        let reward_amount: u64 = user.pending_rewards as u64;

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: pool_account_info.clone(),
            mint: ctx.accounts.reward_mint.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        transfer_checked(cpi_ctx, reward_amount, ctx.accounts.reward_mint.decimals)?;
        user.pending_rewards = 0;
    }

    // 6) Update reward debt for any remaining stake
    user.reward_debt = user
        .amount_staked
        .checked_mul(pool.reward_per_token_stored)
        .unwrap()
        .checked_div(PRECISION)
        .unwrap();
    emit!(UnstakeEvent {
        staker: user.staker,
        amount,
        time: now,
    });

    Ok(())
}

pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    require!(!ctx.accounts.pool.paused, StakingError::PoolPaused);
    let mut reward_amount: u64 = 0;
    let pool_account_info: AccountInfo<'_> = ctx.accounts.pool.to_account_info();
    let stake_mint_key = ctx.accounts.stake_mint.key();

    let (_pool_key, pool_bump) =
        Pubkey::find_program_address(&[POOL_SEED, stake_mint_key.as_ref()], ctx.program_id);
    let seeds: &[&[u8]] = &[POOL_SEED, stake_mint_key.as_ref(), &[pool_bump]];
    let signer_seeds = &[&seeds[..]];

    let pool = &mut ctx.accounts.pool;
    let user = &mut ctx.accounts.user_stake;
    let now = Clock::get()?.unix_timestamp;

    // 1) Update global reward_per_token_stored
    if pool.total_staked > 0 {
        let elapsed = (now - pool.last_update_time) as u128;
        let reward = elapsed
            .checked_mul(pool.reward_rate_per_day)
            .ok_or(StakingError::RewardOverflow)?;
        let add_per_token = reward.checked_div(pool.total_staked).unwrap();
        pool.reward_per_token_stored = pool
            .reward_per_token_stored
            .checked_add(add_per_token)
            .unwrap();
    }
    pool.last_update_time = now;

    // 2) Update user pending rewards
    let stored = pool.reward_per_token_stored;
    let owed = pending_reward(user.amount_staked, stored, user.reward_debt)?;
    user.pending_rewards = user.pending_rewards.checked_add(owed).unwrap();

    // 3) Transfer out pending rewards (if > 0)
    if user.pending_rewards > 0 {
        if user.pending_rewards > (u64::MAX as u128) {
            return err!(StakingError::RewardOverflow);
        }
        reward_amount = user.pending_rewards as u64;

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: pool_account_info.clone(),
            mint: ctx.accounts.reward_mint.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        transfer_checked(cpi_ctx, reward_amount, ctx.accounts.reward_mint.decimals)?;
        user.pending_rewards = 0;
    }

    // 4) Update user reward debt
    user.reward_debt = user
        .amount_staked
        .checked_mul(pool.reward_per_token_stored)
        .unwrap()
        .checked_div(PRECISION)
        .unwrap();
    emit!(RewardPaid {
        staker: user.staker,
        amount: reward_amount,
        time: now,
    });

    Ok(())
}

pub fn set_reward_rate(ctx: Context<SetRewardRate>, new_rate_per_day: u64) -> Result<()> {
    require!(!ctx.accounts.pool.paused, StakingError::PoolPaused);
    let pool = &mut ctx.accounts.pool;
    let now = Clock::get()?.unix_timestamp;

    // Before changing rate, accrue rewards up to now
    if pool.total_staked > 0 {
        let elapsed = (now - pool.last_update_time) as u128;
        let reward = elapsed
            .checked_mul(pool.reward_rate_per_day)
            .ok_or(StakingError::RewardOverflow)?;
        let add_per_token = reward.checked_div(pool.total_staked).unwrap();
        pool.reward_per_token_stored = pool
            .reward_per_token_stored
            .checked_add(add_per_token)
            .unwrap();
    }
    pool.last_update_time = now;

    // Set the new reward rate (scale by PRECISION)
    pool.reward_rate_per_day = (new_rate_per_day as u128)
        .checked_mul(PRECISION)
        .unwrap()
        .checked_div(SECONDS_PER_DAY)
        .unwrap();
    Ok(())
}

pub fn deposit_rewards(ctx: Context<DepositRewards>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.pool.paused, StakingError::PoolPaused);
    let cpi_accounts = MintTo {
        mint: ctx.accounts.reward_mint.to_account_info(),
        to: ctx.accounts.reward_vault.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    mint_to(cpi_ctx, amount)?;
    Ok(())
}

pub fn pause_pool(ctx: Context<PausePool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.paused = true;
    emit!(PoolPaused {
        admin: ctx.accounts.admin.key(),
        time: Clock::get()?.unix_timestamp,
    });
    Ok(())
}

pub fn unpause_pool(ctx: Context<PausePool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.paused = false;
    emit!(PoolUnpaused {
        admin: ctx.accounts.admin.key(),
        time: Clock::get()?.unix_timestamp,
    });
    Ok(())
}

#[inline(always)]
fn pending_reward(
    amount_staked: u128,
    reward_per_token_stored: u128,
    reward_debt: u128,
) -> Result<u128> {
    if reward_per_token_stored <= reward_debt {
        return Ok(0);
    }
    let delta = reward_per_token_stored
        .checked_sub(reward_debt)
        .ok_or(StakingError::RewardOverflow)?;
    let gross = amount_staked
        .checked_mul(delta)
        .ok_or(StakingError::RewardOverflow)?;
    Ok(gross / PRECISION)
}

pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let stake_mint_key = ctx.accounts.stake_mint.key();
    let user = &mut ctx.accounts.user_stake;
    let now = Clock::get()?.unix_timestamp;

    require!(user.amount_staked > 0, StakingError::InsufficientStaked);

    let principal_u64: u64 = user.amount_staked as u64;
    let slash = principal_u64 / 10;
    msg!("principal_u64: {}", principal_u64);
    msg!("slash: {}", slash);
    let payout = principal_u64 - slash;
    msg!("payout: {}", payout);

    let (_pool_pda, bump) =
        Pubkey::find_program_address(&[POOL_SEED, stake_mint_key.as_ref()], ctx.program_id);
    let seeds: &[&[u8]] = &[POOL_SEED, stake_mint_key.as_ref()];
    let signer_seeds: &[&[&[u8]]] = &[&[seeds[0], seeds[1], &[bump]]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.stake_vault.to_account_info(),
            to: ctx.accounts.user_stake_account.to_account_info(),
            authority: pool.to_account_info(),
            mint: ctx.accounts.stake_mint.to_account_info(),
        },
        signer_seeds,
    );
    transfer_checked(cpi_ctx, payout, ctx.accounts.stake_mint.decimals)?;

    pool.total_staked = pool.total_staked.saturating_sub(user.amount_staked);
    user.amount_staked = 0;
    user.pending_rewards = 0;
    user.reward_debt = 0;
    emit!(EmergencyWithdrawEvent {
        staker: ctx.accounts.staker.key(),
        principal: principal_u64,
        slash,
        time: now,
    });
    Ok(())
}

/// STAKING POOL ACCOUNTS FUNCTIONS
#[derive(Accounts)]
#[instruction(reward_rate_per_day:u128)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, constraint = reward_mint.key() == stake_mint.key())]
    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init_if_needed,
        seeds = [POOL_SEED, stake_mint.key().as_ref()],
        bump,
        payer = admin,
        space = 8 + size_of::<StakingPool>(),
        constraint = reward_mint.key() == stake_mint.key()
    )]
    pub pool: Box<Account<'info, StakingPool>>,
    /// The associated token account owned by the pool PDA to hold stake tokens
    #[account(
        init_if_needed,
        associated_token::mint = stake_mint,
        associated_token::authority = pool,
        associated_token::token_program = token_program,
        payer = admin
    )]
    pub stake_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// The associated token account owned by the pool PDA to hold reward tokens
    #[account(
        init_if_needed,
        associated_token::mint = reward_mint,
        associated_token::authority = pool,
        associated_token::token_program = token_program,
        payer = admin
    )]
    pub reward_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    /// The user who wants to stake
    #[account(mut)]
    pub staker: Signer<'info>,

    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The global pool
    #[account(
        mut,    
        seeds = [POOL_SEED,stake_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,

    /// The vault holding all stake tokens
    #[account(mut)]
    pub stake_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The user's token account holding stake tokens
    #[account(mut)]
    pub user_stake_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The user's pdas where we1000700000000030 track their stake data
    #[account(
        init_if_needed,
        payer = staker,
        seeds = [USER_STAKE_SEED, pool.key().as_ref(), staker.key().as_ref()],
        bump,
        space = 8 + size_of::<UserStake>()
    )]
    pub user_stake: Account<'info, UserStake>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds = [POOL_SEED,stake_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,

    /// The vault holding all stake tokens
    #[account(mut)]
    pub stake_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The user's token account holding stake tokens
    #[account(mut)]
    pub user_stake_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The user's pdas where we track their stake data
    #[account(
        mut,
        seeds = [USER_STAKE_SEED, pool.key().as_ref(), staker.key().as_ref()],
        bump,
        has_one = staker
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(mut)]
    pub reward_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub user_reward_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token2022>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds = [POOL_SEED,stake_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,

    /// The user's pdas where we track their stake data
    #[account(
        mut,
        seeds = [USER_STAKE_SEED, pool.key().as_ref(), staker.key().as_ref()],
        bump,
        has_one = staker
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(mut)]
    pub reward_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub user_reward_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token2022>,

    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct SetRewardRate<'info> {
    /// The admin of the pool
    #[account(mut, constraint = pool.admin == admin.key())]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [POOL_SEED, stake_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,

    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
}

#[derive(Accounts)]
pub struct DepositRewards<'info> {
    #[account(mut, constraint = pool.admin == admin.key())]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub reward_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub reward_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct PausePool<'info> {
    #[account(mut, constraint = pool.admin == admin.key())]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, StakingPool>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds = [POOL_SEED, stake_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(mut)]
    pub stake_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub user_stake_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [USER_STAKE_SEED, pool.key().as_ref(), staker.key().as_ref()],
        bump,
        has_one = staker
    )]
    pub user_stake: Account<'info, UserStake>,

    pub token_program: Program<'info, Token2022>,
}

#[event]
pub struct PoolPaused {
    pub admin: Pubkey,
    pub time: i64,
}

#[event]
pub struct PoolUnpaused {
    pub admin: Pubkey,
    pub time: i64,
}

#[event]
pub struct StakeEvent {
    pub staker: Pubkey,
    pub amount: u64,
    pub time: i64,
}
#[event]
pub struct UnstakeEvent {
    pub staker: Pubkey,
    pub amount: u64,
    pub time: i64,
}
#[event]
pub struct RewardPaid {
    pub staker: Pubkey,
    pub amount: u64,
    pub time: i64,
}

#[event]
pub struct EmergencyWithdrawEvent {
    pub staker: Pubkey,
    pub principal: u64,
    pub slash: u64,
    pub time: i64,
}

#[error_code]
pub enum StakingError {
    #[msg("Not enough staked balance.")]
    InsufficientStaked,
    #[msg("Pending rewards exceed maximum payout limit.")]
    RewardOverflow,
    #[msg("Pool is currently paused.")]
    PoolPaused,
    #[msg("Cannot unstake before lock-up expires.")]
    LockupNotExpired,
}
