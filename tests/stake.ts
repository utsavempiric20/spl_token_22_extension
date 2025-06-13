// import * as anchor from "@coral-xyz/anchor";
// import { Program, BN } from "@coral-xyz/anchor";
// import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
// import {
//   getAccount,
//   getMint,
//   getAssociatedTokenAddressSync,
//   ASSOCIATED_TOKEN_PROGRAM_ID,
//   createAssociatedTokenAccount,
// } from "@solana/spl-token";
// import { expect } from "chai";
// import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

// import { Spl } from "../target/types/spl";

// describe("staking_program", () => {
//   // --- Anchors & constants ---
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);
//   const program = anchor.workspace.Spl as Program<Spl>;
//   const payer = (provider.wallet as NodeWallet).payer;
//   const TOKEN_2022_PROGRAM_ID = new PublicKey(
//     "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
//   );

//   // These must match your on‐chain constants
//   const POOL_SEED = Buffer.from("staking_pool");
//   const USER_STAKE_SEED = Buffer.from("user_stake");
//   const SECONDS_PER_DAY = new BN(86_400);

//   // PDAs we'll derive
//   let stakeMintPda: PublicKey;
//   let userAta: PublicKey;
//   let poolPda: PublicKey;
//   let stakeVaultAta: PublicKey;
//   let rewardVaultAta: PublicKey;
//   let userStakePda: PublicKey;

//   before(async () => {
//     // --- reuse the SPL mint from your SPL tests: ---
//     [stakeMintPda] = PublicKey.findProgramAddressSync(
//       [Buffer.from("mint"), provider.wallet.publicKey.toBuffer()],
//       program.programId
//     );
//     console.log({ stakeMintPda: stakeMintPda.toBase58() });

//     // Derive the pool PDA
//     [poolPda] = PublicKey.findProgramAddressSync(
//       [POOL_SEED, stakeMintPda.toBuffer()],
//       program.programId
//     );
//     console.log({ poolPda: poolPda.toBase58() });
//     // Associated token accounts for the pool - use the same derivation method
//     stakeVaultAta = getAssociatedTokenAddressSync(
//       stakeMintPda,
//       poolPda,
//       true,
//       TOKEN_2022_PROGRAM_ID,
//       ASSOCIATED_TOKEN_PROGRAM_ID
//     );

//     userAta = getAssociatedTokenAddressSync(
//       stakeMintPda,
//       provider.wallet.publicKey,
//       false,
//       TOKEN_2022_PROGRAM_ID,
//       ASSOCIATED_TOKEN_PROGRAM_ID
//     );

//     console.log({ stakeVaultAta: stakeVaultAta.toBase58() });
//     rewardVaultAta = stakeVaultAta; // same mint, same ATA
//     console.log({ rewardVaultAta: rewardVaultAta.toBase58() });
//     // Derive user‐stake‐PDA
//     [userStakePda] = PublicKey.findProgramAddressSync(
//       [
//         USER_STAKE_SEED,
//         poolPda.toBuffer(),
//         provider.wallet.publicKey.toBuffer(),
//       ],
//       program.programId
//     );
//     console.log({ userStakePda: userStakePda.toBase58() });
//   });

//   it("initializePool + depositRewards", async () => {
//     // First ensure we have mint authority
//     const mintInfo = await getMint(
//       provider.connection,
//       stakeMintPda,
//       undefined,
//       TOKEN_2022_PROGRAM_ID
//     );
//     expect(mintInfo.mintAuthority?.toBase58()).to.equal(
//       payer.publicKey.toBase58()
//     );

//     // 1) initializePool with 100 tokens/day
//     await program.methods
//       .initializePoolStake(new BN(100))
//       .accountsStrict({
//         admin: payer.publicKey,
//         stakeMint: stakeMintPda,
//         rewardMint: stakeMintPda,
//         pool: poolPda,
//         stakeVault: stakeVaultAta,
//         rewardVault: rewardVaultAta,
//         systemProgram: SystemProgram.programId,
//         tokenProgram: TOKEN_2022_PROGRAM_ID,
//         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//       })
//       .signers([payer])
//       .rpc();

//     // 2) depositRewards: mint 1_000 tokens into reward_vault
//     const depositAmount = new BN(1_000).mul(new BN(10 ** 9)); // assume 9 decimals
//     await program.methods
//       .depositRewardsAdmin(depositAmount)
//       .accountsStrict({
//         admin: payer.publicKey,
//         pool: poolPda,
//         rewardVault: rewardVaultAta,
//         rewardMint: stakeMintPda,
//         tokenProgram: TOKEN_2022_PROGRAM_ID,
//       })
//       .signers([payer])
//       .rpc();

//     // Confirm rewardVault balance
//     const vaultAcct = await getAccount(
//       provider.connection,
//       rewardVaultAta,
//       undefined,
//       TOKEN_2022_PROGRAM_ID
//     );
//     expect(vaultAcct.amount).to.eql(BigInt(depositAmount.toString()));
//   });

//   it("stake + unstake principal", async () => {
//     // First ensure we have tokens to stake
//     const mintAmount = new BN(1_000_000 * 10 ** 9);
//     await program.methods
//       .mintTokens(mintAmount)
//       .accountsStrict({
//         mint: stakeMintPda,
//         to: userAta,
//         authority: payer.publicKey,
//         tokenProgram: TOKEN_2022_PROGRAM_ID,
//       })
//       .signers([payer])
//       .rpc();

//     const stakeAmount = new BN(100).mul(new BN(10 ** 9));
//     // stake
//     await program.methods
//       .stake(stakeAmount)
//       .accountsStrict({
//         staker: payer.publicKey,
//         stakeMint: stakeMintPda,
//         pool: poolPda,
//         stakeVault: stakeVaultAta,
//         userStakeAccount: userAta,
//         userStake: userStakePda,
//         systemProgram: SystemProgram.programId,
//         tokenProgram: TOKEN_2022_PROGRAM_ID,
//         associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//       })
//       .signers([payer])
//       .rpc();

//     // pool.totalStaked == stakeAmount
//     const poolAcct = await program.account.stakingPool.fetch(poolPda);
//     expect(poolAcct.totalStaked.toString()).to.eql(stakeAmount.toString());

//     // unstake all
//     await program.methods
//       .unstake(stakeAmount)
//       .accountsStrict({
//         staker: payer.publicKey,
//         stakeMint: stakeMintPda,
//         rewardMint: stakeMintPda,
//         pool: poolPda,
//         stakeVault: stakeVaultAta,
//         userStakeAccount: userAta,
//         userStake: userStakePda,
//         rewardVault: rewardVaultAta,
//         userRewardAccount: userAta,
//         systemProgram: SystemProgram.programId,
//         tokenProgram: TOKEN_2022_PROGRAM_ID,
//         associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//       })
//       .signers([payer])
//       .rpc();

//     // after unstake, pool.totalStaked == 0
//     const poolAfter = await program.account.stakingPool.fetch(poolPda);
//     expect(poolAfter.totalStaked.isZero()).to.be.true;
//   });

//   it("pause / unpause behaviour", async () => {
//     // pause
//     await program.methods
//       .pausePoolAdmin()
//       .accountsStrict({
//         admin: payer.publicKey,
//         pool: poolPda,
//       })
//       .signers([payer])
//       .rpc();

//     // try to stake while paused → should fail
//     try {
//       await program.methods
//         .stake(new BN(1))
//         .accountsStrict({
//           staker: payer.publicKey,
//           stakeMint: stakeMintPda,
//           pool: poolPda,
//           stakeVault: stakeVaultAta,
//           userStakeAccount: userAta,
//           userStake: userStakePda,
//           systemProgram: SystemProgram.programId,
//           tokenProgram: TOKEN_2022_PROGRAM_ID,
//           associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
//           rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//         })
//         .signers([payer])
//         .rpc();
//       expect.fail("Expected stake to fail while paused");
//     } catch (err: any) {
//       // Check for the specific error message from StakingError
//       expect(err.toString()).to.include("Pool is currently paused");
//     }

//     // unpause
//     await program.methods
//       .unpausePoolAdmin()
//       .accountsStrict({
//         admin: payer.publicKey,
//         pool: poolPda,
//       })
//       .signers([payer])
//       .rpc();

//     // now staking should succeed
//     await program.methods
//       .stake(new BN(0))
//       .accountsStrict({
//         staker: payer.publicKey,
//         stakeMint: stakeMintPda,
//         pool: poolPda,
//         stakeVault: stakeVaultAta,
//         userStakeAccount: userAta,
//         userStake: userStakePda,
//         systemProgram: SystemProgram.programId,
//         tokenProgram: TOKEN_2022_PROGRAM_ID,
//         associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//       })
//       .signers([payer])
//       .rpc();
//   });

//   it("claimRewards (no error, no payout)", async () => {
//     // First stake some tokens to initialize the user stake account
//     const stakeAmount = new BN(100).mul(new BN(10 ** 9));
//     await program.methods
//       .stake(stakeAmount)
//       .accountsStrict({
//         staker: payer.publicKey,
//         stakeMint: stakeMintPda,
//         pool: poolPda,
//         stakeVault: stakeVaultAta,
//         userStakeAccount: userAta,
//         userStake: userStakePda,
//         systemProgram: SystemProgram.programId,
//         tokenProgram: TOKEN_2022_PROGRAM_ID,
//         associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
//         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//       })
//       .signers([payer])
//       .rpc();

//     const before = (
//       await getAccount(
//         provider.connection,
//         userAta,
//         undefined,
//         TOKEN_2022_PROGRAM_ID
//       )
//     ).amount;

//     // Now claim rewards should succeed
//     await program.methods
//       .claimRewardsStake()
//       .accountsStrict({
//         staker: payer.publicKey,
//         stakeMint: stakeMintPda,
//         rewardMint: stakeMintPda,
//         pool: poolPda,
//         userStake: userStakePda,
//         rewardVault: rewardVaultAta,
//         userRewardAccount: userAta,
//         tokenProgram: TOKEN_2022_PROGRAM_ID,
//         associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
//       })
//       .signers([payer])
//       .rpc();

//     // reward account remains zero
//     const after = (
//       await getAccount(
//         provider.connection,
//         userAta,
//         undefined,
//         TOKEN_2022_PROGRAM_ID
//       )
//     ).amount;
//     expect(after - before).to.eql(BigInt(0));
//   });
// });

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
const TOKEN_2022_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

const POOL_SEED = Buffer.from("staking_pool");
const USER_STAKE_SEED = Buffer.from("user_stake");
const PRECISION = new BN(10).pow(new BN(9)); // 10^9

const bal = async (pk: PublicKey) =>
  new BN(
    (
      await getAccount(provider.connection, pk, undefined, TOKEN_2022_ID)
    ).amount.toString()
  );

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let mintPda: PublicKey,
  poolPda: PublicKey,
  vaultAta: PublicKey,
  userAta: PublicKey,
  userStakePda: PublicKey;

describe("staking_program", () => {
  before("derive PDAs", async () => {
    [mintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), payer.publicKey.toBuffer()],
      program.programId
    );

    [poolPda] = PublicKey.findProgramAddressSync(
      [POOL_SEED, mintPda.toBuffer()],
      program.programId
    );

    vaultAta = getAssociatedTokenAddressSync(
      mintPda,
      poolPda,
      true,
      TOKEN_2022_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    userAta = getAssociatedTokenAddressSync(
      mintPda,
      payer.publicKey,
      true,
      TOKEN_2022_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    [userStakePda] = PublicKey.findProgramAddressSync(
      [USER_STAKE_SEED, poolPda.toBuffer(), payer.publicKey.toBuffer()],
      program.programId
    );
  });

  /* -------------------------------------------------------------- */
  it("1.init pool (10 tokens/sec) & deposit rewards", async () => {
    const mintInfo = await getMint(
      provider.connection,
      mintPda,
      undefined,
      TOKEN_2022_ID
    );
    expect(mintInfo.mintAuthority!.equals(payer.publicKey)).to.be.true;

    await program.methods
      .initializePoolStake(new BN(864_000)) // dummy 100/day, value overwritten below
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

    /* bump to 10 tokens / second so only a short wait needed */
    await program.methods
      .setRewardRateStake(new BN(864_000 /* ⇢ 10/sec */))
      .accountsStrict({
        admin: payer.publicKey,
        pool: poolPda,
        stakeMint: mintPda,
      })
      .signers([payer])
      .rpc();

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

    expect(await bal(vaultAta)).to.be.a.bignumber.equal(deposit);
  });

  it("2. stake, wait 3 s, claim reward, unstake", async () => {
    await program.methods
      .mintTokens(new BN(1_000).mul(PRECISION))
      .accountsStrict({
        mint: mintPda,
        to: userAta,
        authority: payer.publicKey,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([payer])
      .rpc();

    const stakeAmt = new BN(100).mul(PRECISION);

    const beforeStake = await bal(userAta);
    console.log("beforeStake : ", beforeStake.toNumber());

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

    await sleep(10_000);

    const before = await bal(userAta);
    console.log("before : ", before.toNumber());

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

    const after = await bal(userAta);
    const earned = after.sub(before);
    console.log("claimed:", earned.toString());

    expect(earned.gt(new BN(0))).to.be.true; // > 0 reward
    expect(earned.lt(new BN(100).mul(PRECISION))).to.be.true; // < stake

    /* ---------- unstake ----------------------------------------- */
    const beforeUnstake = await bal(userAta);
    console.log("beforeUnstake :", beforeUnstake.toNumber());

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
    const afterUnstake = await bal(userAta);
    console.log("afterUnstake :", afterUnstake.toNumber());

    const deltaPrincipal = (await bal(userAta)).sub(beforeUnstake);
    console.log("deltaPrincipal : ", deltaPrincipal.toNumber());

    expect(deltaPrincipal.gte(stakeAmt)).to.be.true;

    const tolerance = PRECISION;
    expect(deltaPrincipal.sub(stakeAmt).lt(tolerance)).to.be.true;
  });

  it("3. pause / unpause guard", async () => {
    await program.methods
      .pausePoolAdmin()
      .accountsStrict({ admin: payer.publicKey, pool: poolPda })
      .signers([payer])
      .rpc();

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

    await program.methods
      .unpausePoolAdmin()
      .accountsStrict({ admin: payer.publicKey, pool: poolPda })
      .signers([payer])
      .rpc();
  });
});
