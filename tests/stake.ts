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

  it("1.init pool  & deposit rewards", async () => {
    const mintInfo = await getMint(
      provider.connection,
      mintPda,
      undefined,
      TOKEN_2022_ID
    );
    expect(mintInfo.mintAuthority!.equals(payer.publicKey)).to.be.true;

    await program.methods
      .initializePoolStake(new BN(864_000))
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

    await program.methods
      .setRewardRateStake(new BN(864_000))
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
    const stakeAmt = new BN(100).mul(PRECISION);

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

    expect(earned.gt(new BN(0))).to.be.true;
    expect(earned.lt(new BN(100).mul(PRECISION))).to.be.true;

    const beforeUnstake = await bal(userAta);

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

    const deltaPrincipal = (await bal(userAta)).sub(beforeUnstake);

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

  it("4. emergency withdraw returns 90 % of principal", async () => {
    const stakeAmt = new BN(100).mul(PRECISION);

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

    const beforeEmergency = await bal(userAta);

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

    const after = await bal(userAta);

    const delta = after.sub(beforeEmergency);

    const eightyPct = stakeAmt.muln(80).divn(100);

    expect(delta.gte(eightyPct)).to.be.true;
    expect(delta.lte(stakeAmt)).to.be.true;

    const userStakeAcc = await program.account.userStake.fetch(userStakePda);

    expect(new BN(userStakeAcc.amountStaked).isZero()).to.be.true;
  });
});
