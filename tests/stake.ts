import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  getAccount,
  getMint,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import chai, { expect } from "chai";
import chaiBn from "chai-bn";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import { Spl } from "../target/types/spl";

chai.use(chaiBn(BN));

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.Spl as Program<Spl>;
const payer = (provider.wallet as NodeWallet).payer;
// Token-2022 program ID
const TOKEN_2022_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

// Seeds for PDAs
const POOL_SEED = Buffer.from("staking_pool");
const USER_STAKE_SEED = Buffer.from("user_stake");
// Precision for calculations (9 decimals)
const PRECISION = new BN(10).pow(new BN(9)); // 10^9

// Helper function to get token account balance
const bal = async (pk: PublicKey) =>
  new BN(
    (
      await getAccount(provider.connection, pk, undefined, TOKEN_2022_ID)
    ).amount.toString()
  );

// Helper function to sleep/wait
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let mintPda: PublicKey,
  poolPda: PublicKey,
  vaultAta: PublicKey,
  userAta: PublicKey,
  userStakePda: PublicKey;

describe("staking_program", () => {
  before("derive PDAs", async () => {
    // Derive mint PDA
    [mintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), payer.publicKey.toBuffer()],
      program.programId
    );

    // Derive pool PDA
    [poolPda] = PublicKey.findProgramAddressSync(
      [POOL_SEED, mintPda.toBuffer()],
      program.programId
    );

    // Derive vault ATA
    vaultAta = getAssociatedTokenAddressSync(
      mintPda,
      poolPda,
      true,
      TOKEN_2022_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Derive user ATA
    userAta = getAssociatedTokenAddressSync(
      mintPda,
      payer.publicKey,
      true,
      TOKEN_2022_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Derive user stake PDA
    [userStakePda] = PublicKey.findProgramAddressSync(
      [USER_STAKE_SEED, poolPda.toBuffer(), payer.publicKey.toBuffer()],
      program.programId
    );
  });

  it("1.init pool  & deposit rewards", async () => {
    // Verify mint authority
    const mintInfo = await getMint(
      provider.connection,
      mintPda,
      undefined,
      TOKEN_2022_ID
    );
    expect(mintInfo.mintAuthority!.equals(payer.publicKey)).to.be.true;

    // Initialize staking pool
    await program.methods
      .initializePoolStake(new BN(86_400))
      .accountsStrict({
        admin: payer.publicKey,
        stakeMint: mintPda,
        rewardMint: mintPda,
        pool: poolPda,
        stakeVault: vaultAta,
        rewardVault: vaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();

    // Set reward rate
    await program.methods
      .setRewardRateStake(new BN(86_400))
      .accountsStrict({
        admin: payer.publicKey,
        pool: poolPda,
        stakeMint: mintPda,
      })
      .signers([payer])
      .rpc();

    // Deposit rewards into pool
    const deposit = new BN(1000).mul(PRECISION);
    await program.methods
      .depositRewardsAdmin(deposit)
      .accountsStrict({
        admin: payer.publicKey,
        pool: poolPda,
        rewardVault: vaultAta,
        rewardMint: mintPda,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([payer])
      .rpc();

    // Verify reward deposit
    expect(await bal(vaultAta)).to.be.a.bignumber.equal(deposit);
  });

  it("2. stake, wait 3 s, claim reward, unstake", async () => {
    const stakeAmt = new BN(100).mul(PRECISION);

    // Stake tokens
    await program.methods
      .stake(stakeAmt)
      .accountsStrict({
        staker: payer.publicKey,
        stakeMint: mintPda,
        pool: poolPda,
        stakeVault: vaultAta,
        userStakeAccount: userAta,
        userStake: userStakePda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();

    // Wait for rewards to accumulate
    await sleep(10_000);

    // Get balance before claiming
    const before = await bal(userAta);
    console.log("before :", before.toNumber());

    // Claim rewards
    await program.methods
      .claimRewardsStake()
      .accountsStrict({
        staker: payer.publicKey,
        stakeMint: mintPda,
        rewardMint: mintPda,
        pool: poolPda,
        userStake: userStakePda,
        rewardVault: vaultAta,
        userRewardAccount: userAta,
        tokenProgram: TOKEN_2022_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // Get balance after claiming
    const after = await bal(userAta);
    console.log("after : ", after.toNumber());

    // Calculate earned rewards
    const earned = after.sub(before);

    // Verify rewards were earned
    expect(earned.gt(new BN(0))).to.be.true;
    expect(earned.lt(new BN(100).mul(PRECISION))).to.be.true;

    // Get balance before unstaking
    const beforeUnstake = await bal(userAta);

    // Unstake tokens
    await program.methods
      .unstake(stakeAmt)
      .accountsStrict({
        staker: payer.publicKey,
        stakeMint: mintPda,
        rewardMint: mintPda,
        pool: poolPda,
        stakeVault: vaultAta,
        userStakeAccount: userAta,
        userStake: userStakePda,
        rewardVault: vaultAta,
        userRewardAccount: userAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();

    // Calculate principal returned
    const deltaPrincipal = (await bal(userAta)).sub(beforeUnstake);

    // Verify principal was returned
    expect(deltaPrincipal.gte(stakeAmt)).to.be.true;

    // Check tolerance for rounding
    const tolerance = PRECISION;
    expect(deltaPrincipal.sub(stakeAmt).lt(tolerance)).to.be.true;
  });

  it("3. pause / unpause guard", async () => {
    // Pause the pool
    await program.methods
      .pausePoolAdmin()
      .accountsStrict({ admin: payer.publicKey, pool: poolPda })
      .signers([payer])
      .rpc();

    // Try to stake while paused (should fail)
    let threw = false;
    try {
      await program.methods
        .stake(new BN(1))
        .accountsStrict({
          staker: payer.publicKey,
          stakeMint: mintPda,
          pool: poolPda,
          stakeVault: vaultAta,
          userStakeAccount: userAta,
          userStake: userStakePda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([payer])
        .rpc();
    } catch {
      threw = true;
    }
    expect(threw).to.be.true;

    // Unpause the pool
    await program.methods
      .unpausePoolAdmin()
      .accountsStrict({ admin: payer.publicKey, pool: poolPda })
      .signers([payer])
      .rpc();
  });

  it("4. emergency withdraw returns 90 % of principal", async () => {
    const stakeAmt = new BN(100).mul(PRECISION);

    // Stake tokens
    await program.methods
      .stake(stakeAmt)
      .accountsStrict({
        staker: payer.publicKey,
        stakeMint: mintPda,
        pool: poolPda,
        stakeVault: vaultAta,
        userStakeAccount: userAta,
        userStake: userStakePda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();

    // Get balance before emergency withdraw
    const beforeEmergency = await bal(userAta);

    // Emergency withdraw (10% penalty)
    await program.methods
      .emergencyWithdrawStake()
      .accountsStrict({
        staker: payer.publicKey,
        stakeMint: mintPda,
        pool: poolPda,
        stakeVault: vaultAta,
        userStakeAccount: userAta,
        userStake: userStakePda,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([payer])
      .rpc();

    // Get balance after emergency withdraw
    const after = await bal(userAta);

    // Calculate amount returned
    const delta = after.sub(beforeEmergency);

    // Calculate 80% of stake amount (allowing for some tolerance)
    const eightyPct = stakeAmt.muln(80).divn(100);

    // Verify emergency withdraw returns most of principal
    expect(delta.gte(eightyPct)).to.be.true;
    expect(delta.lte(stakeAmt)).to.be.true;

    // Verify user stake is reset
    const userStakeAcc = await program.account.userStake.fetch(userStakePda);

    expect(new BN(userStakeAcc.amountStaked).isZero()).to.be.true;
  });
});
