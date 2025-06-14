use anchor_lang::prelude::*;

use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{
        burn,
        close_account,
        freeze_account,
        mint_to,
        thaw_account,
        transfer_checked,
        Burn,
        CloseAccount,
        FreezeAccount,
        MintTo,
        ThawAccount,
        TransferChecked,
    },
    token_interface::{
        token_metadata_initialize,
        Mint,
        Token2022,
        TokenAccount,
        TokenMetadataInitialize,
    },
};
use std::mem::size_of;

use crate::state::*;
use crate::utils::*;
const PRECISION: u128 = 1_000_000_000_000;
const SECONDS_PER_DAY: u128 = 86_400;

/// SPL TOKEN FUNCTIONS
pub fn handler(
    ctx: Context<CreateMintAccount>,
    _decimals: u8,
    name: String,
    symbol: String,
    uri: String
) -> Result<()> {
    ctx.accounts.initialize_token_metadata(name, symbol, uri)?;
    ctx.accounts.mint.reload()?;

    update_account_lamports_to_minimum_balance(
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.system_program.to_account_info()
    )?;

    Ok(())
}

pub fn mint_spl_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
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
pub fn burn_spl_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
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
pub fn close_spl_token_account(ctx: Context<CloseTokenAccount>) -> Result<()> {
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
pub fn freeze_spl_token_account(ctx: Context<FreezeTokenAccount>) -> Result<()> {
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
pub fn thaw_spl_token_account(ctx: Context<ThawTokenAccount>) -> Result<()> {
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

/// SPL TOKEN ACCOUNTS FUNCTIONS
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
        seeds = [b"mint", authority.key().as_ref()],
        bump,
        payer = payer,
        mint::token_program = token_program,
        mint::decimals = decimals,
        mint::authority = authority,
        mint::freeze_authority = authority,
        extensions::metadata_pointer::authority = authority,
        extensions::metadata_pointer::metadata_address = mint,
        extensions::close_authority::authority = authority
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::token_program = token_program,
        associated_token::mint = mint,
        associated_token::authority = receiver
    )]
    pub mint_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: This account's data is a buffer of TLV data
    #[account(
        init_if_needed,
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
        extensions::close_authority::authority = authority
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
    /// Must match the mint's authority
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
    /// Must match the mint's authority (or the account's delegate)
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
    /// Must match the mint's freeze_authority
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
    /// Must match the mint's freeze_authority
    pub freeze_authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

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

    // 1) Update global reward_per_token_stored
    if pool.total_staked > 0 {
        let elapsed = (now - pool.last_update_time) as u128;
        let reward: u128 = elapsed.checked_mul(pool.reward_rate_per_day).unwrap();
        let add_per_token = reward.checked_div(pool.total_staked).unwrap();
        pool.reward_per_token_stored = pool.reward_per_token_stored
            .checked_add(add_per_token)
            .unwrap();
    }
    pool.last_update_time = now;

    // 2) Update user pending rewards
    let stored = pool.reward_per_token_stored;
    if user.amount_staked > 0 {
        let owed = user.amount_staked
            .checked_mul(stored.checked_sub(user.reward_debt).unwrap())
            .unwrap()
            .checked_div(PRECISION)
            .unwrap();
        user.pending_rewards = user.pending_rewards.checked_add(owed).unwrap();
    }

    // 3) Transfer stake tokens from user → vault
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.user_stake_account.to_account_info(),
        to: ctx.accounts.stake_vault.to_account_info(),
        authority: ctx.accounts.staker.to_account_info(),
        mint: ctx.accounts.stake_mint.to_account_info(),
    };
    msg!(
        "mint PDA: mint={}, decimals={}",
        ctx.accounts.stake_mint.key(),
        ctx.accounts.stake_mint.decimals
    );
    msg!(
        "pool PDA: from={}, to={}, authority={}, mint={}",
        ctx.accounts.user_stake_account.key(),
        ctx.accounts.stake_vault.key(),
        ctx.accounts.staker.key(),
        ctx.accounts.stake_mint.key()
    );
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, amount, mint_decimals)?;

    // 4) Update balances
    pool.total_staked = pool.total_staked.checked_add(amount as u128).unwrap();
    user.amount_staked = user.amount_staked.checked_add(amount as u128).unwrap();
    user.reward_debt = user.amount_staked
        .checked_mul(pool.reward_per_token_stored)
        .unwrap()
        .checked_div(PRECISION)
        .unwrap();
    Ok(())
}

pub fn unstake_tokens(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.pool.paused, StakingError::PoolPaused);

    let pool_account_info = ctx.accounts.pool.to_account_info();
    let stake_mint_key = ctx.accounts.stake_mint.key();

    // We also need the PDA bump now, before taking a &mut:
    let (_pool_key, pool_bump) = Pubkey::find_program_address(
        &[POOL_SEED, stake_mint_key.as_ref()],
        ctx.program_id
    );
    let seeds: &[&[u8]] = &[POOL_SEED, stake_mint_key.as_ref(), &[pool_bump]];
    let signer_seeds = &[&seeds[..]];

    let pool = &mut ctx.accounts.pool;
    let user = &mut ctx.accounts.user_stake;
    let now = Clock::get()?.unix_timestamp;

    require!(user.amount_staked >= (amount as u128), StakingError::InsufficientStaked);

    // 1) Update global reward_per_token_stored
    if pool.total_staked > 0 {
        let elapsed = (now - pool.last_update_time) as u128;
        let reward = elapsed.checked_mul(pool.reward_rate_per_day).unwrap();
        let add_per_token = reward.checked_div(pool.total_staked).unwrap();
        pool.reward_per_token_stored = pool.reward_per_token_stored
            .checked_add(add_per_token)
            .unwrap();
    }
    pool.last_update_time = now;

    // 2) Update user pending rewards
    let stored = pool.reward_per_token_stored;
    let owed = user.amount_staked
        .checked_mul(stored.checked_sub(user.reward_debt).unwrap())
        .unwrap()
        .checked_div(PRECISION)
        .unwrap();
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
        signer_seeds
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
            signer_seeds
        );
        transfer_checked(cpi_ctx, reward_amount, ctx.accounts.reward_mint.decimals)?;
        user.pending_rewards = 0;
    }

    // 6) Update reward debt for any remaining stake
    user.reward_debt = user.amount_staked
        .checked_mul(pool.reward_per_token_stored)
        .unwrap()
        .checked_div(PRECISION)
        .unwrap();

    Ok(())
}

pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    require!(!ctx.accounts.pool.paused, StakingError::PoolPaused);

    let pool_account_info = ctx.accounts.pool.to_account_info();
    let stake_mint_key = ctx.accounts.stake_mint.key();

    let (_pool_key, pool_bump) = Pubkey::find_program_address(
        &[POOL_SEED, stake_mint_key.as_ref()],
        ctx.program_id
    );
    let seeds: &[&[u8]] = &[POOL_SEED, stake_mint_key.as_ref(), &[pool_bump]];
    let signer_seeds = &[&seeds[..]];

    let pool = &mut ctx.accounts.pool;
    let user = &mut ctx.accounts.user_stake;
    let now = Clock::get()?.unix_timestamp;

    // 1) Update global reward_per_token_stored
    if pool.total_staked > 0 {
        let elapsed = (now - pool.last_update_time) as u128;
        let reward = elapsed.checked_mul(pool.reward_rate_per_day).unwrap();
        let add_per_token = reward.checked_div(pool.total_staked).unwrap();
        pool.reward_per_token_stored = pool.reward_per_token_stored
            .checked_add(add_per_token)
            .unwrap();
    }
    pool.last_update_time = now;

    // 2) Update user pending rewards
    let stored = pool.reward_per_token_stored;
    let owed = user.amount_staked
        .checked_mul(stored.checked_sub(user.reward_debt).unwrap())
        .unwrap()
        .checked_div(PRECISION)
        .unwrap();
    user.pending_rewards = user.pending_rewards.checked_add(owed).unwrap();

    // 3) Transfer out pending rewards (if > 0)
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
            signer_seeds
        );
        transfer_checked(cpi_ctx, reward_amount, ctx.accounts.reward_mint.decimals)?;
        user.pending_rewards = 0;
    }

    // 4) Update user reward debt
    user.reward_debt = user.amount_staked
        .checked_mul(pool.reward_per_token_stored)
        .unwrap()
        .checked_div(PRECISION)
        .unwrap();

    Ok(())
}

pub fn set_reward_rate(ctx: Context<SetRewardRate>, new_rate_per_day: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let now = Clock::get()?.unix_timestamp;

    // Before changing rate, accrue rewards up to now
    if pool.total_staked > 0 {
        let elapsed = (now - pool.last_update_time) as u128;
        let reward = elapsed.checked_mul(pool.reward_rate_per_day).unwrap();
        let add_per_token = reward.checked_div(pool.total_staked).unwrap();
        pool.reward_per_token_stored = pool.reward_per_token_stored
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

#[error_code]
pub enum StakingError {
    #[msg("Not enough staked balance.")]
    InsufficientStaked,
    #[msg("Pending rewards exceed maximum payout limit.")]
    RewardOverflow,
    #[msg("Pool is currently paused.")]
    PoolPaused,
}
