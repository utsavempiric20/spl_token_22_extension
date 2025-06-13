import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  getAccount,
  getMint,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import { Spl } from "../target/types/spl";

describe("staking_program", () => {
  // --- Anchors & constants ---
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Spl as Program<Spl>;
  const payer = (provider.wallet as NodeWallet).payer;
  const TOKEN_2022_PROGRAM_ID = new PublicKey(
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
  );

  // These must match your on‐chain constants
  const POOL_SEED = Buffer.from("staking_pool");
  const USER_STAKE_SEED = Buffer.from("user_stake");
  const SECONDS_PER_DAY = new BN(86_400);

  // PDAs we'll derive
  let stakeMintPda: PublicKey;
  let userAta: PublicKey;
  let poolPda: PublicKey;
  let stakeVaultAta: PublicKey;
  let rewardVaultAta: PublicKey;
  let userStakePda: PublicKey;

  before(async () => {
    // --- reuse the SPL mint from your SPL tests: ---
    [stakeMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );
    console.log({ stakeMintPda: stakeMintPda.toBase58() });

    // Derive the pool PDA
    [poolPda] = PublicKey.findProgramAddressSync(
      [POOL_SEED, stakeMintPda.toBuffer()],
      program.programId
    );
    console.log({ poolPda: poolPda.toBase58() });
    // Associated token accounts for the pool - use the same derivation method
    stakeVaultAta = getAssociatedTokenAddressSync(
      stakeMintPda,
      poolPda,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    userAta = getAssociatedTokenAddressSync(
      stakeMintPda,
      provider.wallet.publicKey,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log({ stakeVaultAta: stakeVaultAta.toBase58() });
    rewardVaultAta = stakeVaultAta; // same mint, same ATA
    console.log({ rewardVaultAta: rewardVaultAta.toBase58() });
    // Derive user‐stake‐PDA
    [userStakePda] = PublicKey.findProgramAddressSync(
      [
        USER_STAKE_SEED,
        poolPda.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
    console.log({ userStakePda: userStakePda.toBase58() });
  });

  it("initializePool + depositRewards", async () => {
    // First ensure we have mint authority
    const mintInfo = await getMint(
      provider.connection,
      stakeMintPda,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    expect(mintInfo.mintAuthority?.toBase58()).to.equal(
      payer.publicKey.toBase58()
    );

    // 1) initializePool with 100 tokens/day
    await program.methods
      .initializePoolStake(new BN(100))
      .accountsStrict({
        admin: payer.publicKey,
        stakeMint: stakeMintPda,
        rewardMint: stakeMintPda,
        pool: poolPda,
        stakeVault: stakeVaultAta,
        rewardVault: rewardVaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();

    // 2) depositRewards: mint 1_000 tokens into reward_vault
    const depositAmount = new BN(1_000).mul(new BN(10 ** 9)); // assume 9 decimals
    await program.methods
      .depositRewardsAdmin(depositAmount)
      .accountsStrict({
        admin: payer.publicKey,
        pool: poolPda,
        rewardVault: rewardVaultAta,
        rewardMint: stakeMintPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // Confirm rewardVault balance
    const vaultAcct = await getAccount(
      provider.connection,
      rewardVaultAta,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    expect(vaultAcct.amount).to.eql(BigInt(depositAmount.toString()));
  });

  it("stake + unstake principal", async () => {
    // First ensure we have tokens to stake
    const mintAmount = new BN(1_000_000 * 10 ** 9);
    await program.methods
      .mintTokens(mintAmount)
      .accountsStrict({
        mint: stakeMintPda,
        to: userAta,
        authority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const stakeAmount = new BN(100).mul(new BN(10 ** 9));
    // stake
    await program.methods
      .stake(stakeAmount)
      .accountsStrict({
        staker: payer.publicKey,
        stakeMint: stakeMintPda,
        pool: poolPda,
        stakeVault: stakeVaultAta,
        userStakeAccount: userAta,
        userStake: userStakePda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();

    // pool.totalStaked == stakeAmount
    const poolAcct = await program.account.stakingPool.fetch(poolPda);
    expect(poolAcct.totalStaked.toString()).to.eql(stakeAmount.toString());

    // unstake all
    await program.methods
      .unstake(stakeAmount)
      .accountsStrict({
        staker: payer.publicKey,
        stakeMint: stakeMintPda,
        rewardMint: stakeMintPda,
        pool: poolPda,
        stakeVault: stakeVaultAta,
        userStakeAccount: userAta,
        userStake: userStakePda,
        rewardVault: rewardVaultAta,
        userRewardAccount: userAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();

    // after unstake, pool.totalStaked == 0
    const poolAfter = await program.account.stakingPool.fetch(poolPda);
    expect(poolAfter.totalStaked.isZero()).to.be.true;
  });

  it("pause / unpause behaviour", async () => {
    // pause
    await program.methods
      .pausePoolAdmin()
      .accountsStrict({
        admin: payer.publicKey,
        pool: poolPda,
      })
      .signers([payer])
      .rpc();

    // try to stake while paused → should fail
    try {
      await program.methods
        .stake(new BN(1))
        .accountsStrict({
          staker: payer.publicKey,
          stakeMint: stakeMintPda,
          pool: poolPda,
          stakeVault: stakeVaultAta,
          userStakeAccount: userAta,
          userStake: userStakePda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([payer])
        .rpc();
      expect.fail("Expected stake to fail while paused");
    } catch (err: any) {
      // Check for the specific error message from StakingError
      expect(err.toString()).to.include("Pool is currently paused");
    }

    // unpause
    await program.methods
      .unpausePoolAdmin()
      .accountsStrict({
        admin: payer.publicKey,
        pool: poolPda,
      })
      .signers([payer])
      .rpc();

    // now staking should succeed
    await program.methods
      .stake(new BN(0))
      .accountsStrict({
        staker: payer.publicKey,
        stakeMint: stakeMintPda,
        pool: poolPda,
        stakeVault: stakeVaultAta,
        userStakeAccount: userAta,
        userStake: userStakePda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();
  });

  it("claimRewards (no error, no payout)", async () => {
    // First stake some tokens to initialize the user stake account
    const stakeAmount = new BN(100).mul(new BN(10 ** 9));
    await program.methods
      .stake(stakeAmount)
      .accountsStrict({
        staker: payer.publicKey,
        stakeMint: stakeMintPda,
        pool: poolPda,
        stakeVault: stakeVaultAta,
        userStakeAccount: userAta,
        userStake: userStakePda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();

    const before = (
      await getAccount(
        provider.connection,
        userAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
      )
    ).amount;
    console.log("before :", before);

    // Now claim rewards should succeed
    await program.methods
      .claimRewardsStake()
      .accountsStrict({
        staker: payer.publicKey,
        stakeMint: stakeMintPda,
        rewardMint: stakeMintPda,
        pool: poolPda,
        userStake: userStakePda,
        rewardVault: rewardVaultAta,
        userRewardAccount: userAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // reward account remains zero
    const after = (
      await getAccount(
        provider.connection,
        userAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
      )
    ).amount;
    console.log("after : ", after);

    expect(after - before).to.eql(BigInt(0));
  });
});
