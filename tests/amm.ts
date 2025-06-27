import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  getAccount,
  getMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountIdempotent,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import chai, { expect } from "chai";
import chaiBn from "chai-bn";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import { Spl } from "../app/idl/spl";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

chai.use(chaiBn(BN));

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.Spl as Program<Spl>;
const payer = (provider.wallet as NodeWallet).payer;
const TOKEN_2022_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

const LIQUIDITY_POOL = Buffer.from("liquidity_pool");
const MINT_SEEDS = Buffer.from("mint");
const PRECISION = new BN(10).pow(new BN(9));

const bal = async (pk: PublicKey) =>
  new BN(
    (
      await getAccount(provider.connection, pk, undefined, TOKEN_2022_ID)
    ).amount.toString()
  );

const extraPda = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), mint.toBuffer()],
    program.programId
  )[0];

const AIRDROP_AMOUNT_SOL = 2;
let mintA: PublicKey,
  mintB: PublicKey,
  userA: PublicKey,
  userB: PublicKey,
  poolPda: PublicKey,
  vaultA: PublicKey,
  vaultB: PublicKey,
  lpMint: PublicKey,
  userLp: PublicKey,
  xMetasA: PublicKey,
  xMetasB: PublicKey,
  payerBata: PublicKey;
const other = Keypair.generate();

let decimals_0 = 9;
let TOKEN_NAME_0 = "Pengu B Coin";
let TOKEN_SYMBOL_0 = "PBC";
let METADATA_URI_0 =
  "https://amethyst-abstract-toad-183.mypinata.cloud/ipfs/bafkreihlci7e65qwwyf53muoww2geeqr55vvhpcpt2vfo6f7xp6zcnh7su";

let decimals_1 = 9;
let TOKEN_NAME_1 = "Doge B Coin";
let TOKEN_SYMBOL_1 = "DBC";
let METADATA_URI_1 =
  "https://amethyst-abstract-toad-183.mypinata.cloud/ipfs/bafkreick6xv6d4ufncdw4y4ad4e5jf3vkx6cpt5uaevkwrjzmc7ccy5rwa";

describe("Amm_Program", () => {
  before("derive PDAs", async () => {
    await provider.connection.requestAirdrop(
      other.publicKey,
      AIRDROP_AMOUNT_SOL * LAMPORTS_PER_SOL
    );
    console.log("Airdrop Successfully");

    [mintA] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), payer.publicKey.toBuffer()],
      program.programId
    );

    [mintB] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), other.publicKey.toBuffer()],
      program.programId
    );
    [xMetasA] = PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mintA.toBuffer()],
      program.programId
    );

    [xMetasB] = PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mintB.toBuffer()],
      program.programId
    );

    userA = associatedAddress({
      mint: mintA,
      owner: provider.wallet.publicKey,
    });
    userB = associatedAddress({
      mint: mintB,
      owner: other.publicKey,
    });

    console.log("mintA : ", mintA.toString());
    console.log("mintB : ", mintB.toString());
    console.log("xMetasA : ", xMetasA.toString());
    console.log("xMetasB : ", xMetasB.toString());
    console.log("userA : ", userA.toString());
    console.log("userB : ", userB.toString());
  });

  it("createMintAccount: initializes mint + ATA with zero balance", async () => {
    const sigA = await program.methods
      .createMintAccount(
        decimals_0,
        TOKEN_NAME_0,
        TOKEN_SYMBOL_0,
        METADATA_URI_0
      )
      .accountsStrict({
        payer: payer.publicKey,
        authority: payer.publicKey,
        receiver: payer.publicKey,
        mint: mintA,
        mintTokenAccount: userA,
        extraMetasAccount: xMetasA,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([payer])
      .rpc();
    await provider.connection.confirmTransaction(sigA, "confirmed");

    const acct = await getAccount(
      provider.connection,
      userA,
      undefined,
      TOKEN_2022_ID
    );

    const sigB = await program.methods
      .createMintAccount(
        decimals_1,
        TOKEN_NAME_1,
        TOKEN_SYMBOL_1,
        METADATA_URI_1
      )
      .accountsStrict({
        payer: other.publicKey,
        authority: other.publicKey,
        receiver: other.publicKey,
        mint: mintB,
        mintTokenAccount: userB,
        extraMetasAccount: xMetasB,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([other])
      .rpc();
    await provider.connection.confirmTransaction(sigB, "confirmed");

    const acct1 = await getAccount(
      provider.connection,
      userB,
      undefined,
      TOKEN_2022_ID
    );
    expect(acct.amount).to.eql(BigInt(0));
    expect(acct1.amount).to.eql(BigInt(0));
  });

  it("mint_tokens: mints fresh supply into the ATA", async () => {
    const mintAmount = new BN(1_000 * 10 ** decimals_0);

    await program.methods
      .mintTokens(mintAmount)
      .accountsStrict({
        mint: mintA,
        to: userA,
        authority: payer.publicKey,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([payer])
      .rpc();

    const acct = await getAccount(
      provider.connection,
      userA,
      undefined,
      TOKEN_2022_ID
    );

    payerBata = getAssociatedTokenAddressSync(
      mintB,
      payer.publicKey,
      true,
      TOKEN_2022_ID,
      ASSOCIATED_PROGRAM_ID
    );
    // create & mint into it:
    await createAssociatedTokenAccountIdempotent(
      provider.connection,
      payer,
      mintB,
      payer.publicKey /* owner = payer */,
      undefined,
      TOKEN_2022_ID,
      ASSOCIATED_PROGRAM_ID,
      /*allowOffCurve=*/ false
    );

    await program.methods
      .mintTokens(mintAmount)
      .accountsStrict({
        mint: mintB,
        to: payerBata,
        authority: other.publicKey,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([other])
      .rpc();

    const acct1 = await getAccount(
      provider.connection,
      payerBata,
      undefined,
      TOKEN_2022_ID
    );
    expect(acct.amount).to.eql(BigInt(1_000 * 10 ** decimals_0));
    expect(acct1.amount).to.eql(BigInt(1_000 * 10 ** decimals_0));
  });

  it("Initialize the Liquidity pool", async () => {
    [poolPda] = PublicKey.findProgramAddressSync(
      [LIQUIDITY_POOL, mintA.toBuffer(), mintB.toBuffer()],
      program.programId
    );

    vaultA = getAssociatedTokenAddressSync(mintA, poolPda, true, TOKEN_2022_ID);
    await createAssociatedTokenAccountIdempotent(
      provider.connection,
      payer,
      mintA,
      poolPda,
      undefined,
      TOKEN_2022_ID,
      ASSOCIATED_PROGRAM_ID,
      true
    );

    vaultB = getAssociatedTokenAddressSync(mintB, poolPda, true, TOKEN_2022_ID);
    await createAssociatedTokenAccountIdempotent(
      provider.connection,
      payer,
      mintB,
      poolPda,
      undefined,
      TOKEN_2022_ID,
      ASSOCIATED_PROGRAM_ID,
      true
    );

    [lpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp_mint"), poolPda.toBuffer()],
      program.programId
    );

    console.log("poolPda : ", poolPda.toString());
    console.log("vaultA_ata : ", vaultA.toString());
    console.log("vaultB_ata : ", vaultB.toString());
    console.log("lpMintPda : ", lpMint.toString());

    await program.methods
      .initializeLiquidityPoolAmm("PBC/DBC", 30)
      .accountsStrict({
        admin: payer.publicKey,
        tokenAMint: mintA,
        tokenBMint: mintB,
        vaultTokenA: vaultA,
        vaultTokenB: vaultB,
        pool: poolPda,
        lpMint: lpMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();

    userLp = getAssociatedTokenAddressSync(
      lpMint,
      payer.publicKey,
      false,
      TOKEN_2022_ID,
      ASSOCIATED_PROGRAM_ID
    );
    console.log("userMintPda : ", userLp.toString());
    await createAssociatedTokenAccountIdempotent(
      provider.connection,
      payer,
      lpMint,
      payer.publicKey,
      undefined,
      TOKEN_2022_ID,
      ASSOCIATED_PROGRAM_ID,
      false
    );
  });

  it("Add Liquidity", async () => {
    const tokenA = new anchor.BN(100).mul(PRECISION);
    const tokenB = new anchor.BN(400).mul(PRECISION);

    const beforeA = await bal(userA);
    const beforeB = await bal(payerBata);
    const beforeVaultA = await bal(vaultA);
    const beforeVaultB = await bal(vaultB);
    const beforeLpSupply = (
      await getMint(provider.connection, lpMint, undefined, TOKEN_2022_ID)
    ).supply;

    console.log("beforeA: ", beforeA.toNumber());
    console.log("beforeB: ", beforeB.toNumber());
    console.log("beforeVaultA: ", beforeVaultA.toNumber());
    console.log("beforeVaultB: ", beforeVaultB.toNumber());
    console.log("beforeLpSupply: ", beforeLpSupply.toString());

    await program.methods
      .addLiquidityAmm(tokenA, tokenB)
      .accountsStrict({
        depositor: payer.publicKey,
        tokenAMint: mintA,
        tokenBMint: mintB,
        vaultA: vaultA,
        vaultB: vaultB,
        pool: poolPda,
        lpMint: lpMint,
        userTokenAAccount: userA,
        userTokenBAccount: payerBata,
        userLpMintAccount: userLp,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const afterA = await bal(userA);
    const afterB = await bal(payerBata);
    const afterVaultA = await bal(vaultA);
    const afterVaultB = await bal(vaultB);
    const afterLpSupply = (
      await getMint(provider.connection, lpMint, undefined, TOKEN_2022_ID)
    ).supply;

    console.log("afterA: ", afterA.toNumber());
    console.log("afterB: ", afterB.toNumber());
    console.log("afterVaultA: ", afterVaultA.toNumber());
    console.log("afterVaultB: ", afterVaultB.toNumber());
    console.log("afterLpSupply: ", afterLpSupply.toString());

    expect(afterA).to.be.bignumber.eq(beforeA.sub(tokenA));
    expect(afterB).to.be.bignumber.eq(beforeB.sub(tokenB));

    expect(afterVaultA).to.be.bignumber.eq(beforeVaultA.add(tokenA));
    expect(afterVaultB).to.be.bignumber.eq(beforeVaultB.add(tokenB));

    // const expectedLp = tokenA.mul(tokenB).sqr();
    // expect(new anchor.BN(afterLpSupply.toString())).to.be.bignumber.eq(
    //   new anchor.BN(beforeLpSupply.toString()).add(expectedLp)
    // );
  });

  it("Swap Tokens", async () => {
    const amount_to_swap = new anchor.BN(10).mul(PRECISION);
    const amount_out = await program.methods
      .quoteAmm(amount_to_swap)
      .accountsStrict({
        pool: poolPda,
      })
      .view();

    const userA_beforeSwap = await bal(userA);
    const userB_beforeSwap = await bal(userB);
    const vaultA_beforeSwap = await bal(vaultA);
    const vaultB_beforeSwap = await bal(vaultB);

    console.log("userA_beforeSwap : ", userA_beforeSwap.toNumber());
    console.log("userB_beforeSwap : ", userB_beforeSwap.toNumber());
    console.log("vaultA_beforeSwap : ", vaultA_beforeSwap.toNumber());
    console.log("vaultB_beforeSwap : ", vaultB_beforeSwap.toNumber());

    await program.methods
      .swapAmm(amount_to_swap, new anchor.BN(amount_out))
      .accountsStrict({
        swapper: payer.publicKey,
        pool: poolPda,
        vaultIn: vaultA,
        vaultOut: vaultB,
        userIn: userA,
        userOut: userB,
        tokenAMint: mintA,
        tokenBMint: mintB,
        tokenProgram: TOKEN_2022_ID,
      })
      .rpc();

    const userA_afterSwap = await bal(userA);
    const userB_afterSwap = await bal(userB);
    const vaultA_afterSwap = await bal(vaultA);
    const vaultB_afterSwap = await bal(vaultB);

    console.log("userA_afterSwap : ", userA_afterSwap.toNumber());
    console.log("userB_afterSwap : ", userB_afterSwap.toNumber());
    console.log("vaultA_afterSwap : ", vaultA_afterSwap.toNumber());
    console.log("vaultB_afterSwap : ", vaultB_afterSwap.toNumber());

    expect(userA_afterSwap).to.be.bignumber.eq(
      userA_beforeSwap.sub(amount_to_swap)
    );
    expect(userB_afterSwap).to.be.bignumber.eq(
      userB_beforeSwap.add(amount_out)
    );
    expect(vaultA_afterSwap).to.be.bignumber.eq(
      vaultA_beforeSwap.add(amount_to_swap)
    );
    expect(vaultB_afterSwap).to.be.bignumber.eq(
      vaultB_beforeSwap.sub(amount_out)
    );
  });

  it("Remove Liqudity", async () => {
    const remove_liquidity_amount = new anchor.BN(10).mul(PRECISION);
    const pool = await program.account.liquidityPoolAmm.fetch(poolPda);
    const userA_before = await bal(userA);
    const userB_before = await bal(userB);
    const vaultA_before = await bal(vaultA);
    const vaultB_before = await bal(vaultB);
    const liqudity_before = (
      await getMint(provider.connection, lpMint, undefined, TOKEN_2022_ID)
    ).supply;
    const reserveA = new anchor.BN(pool.reserveA);
    const reserveB = new anchor.BN(pool.reserveB);

    console.log("reserveA : ", reserveA.toNumber());
    console.log("reserveB : ", reserveB.toNumber());
    console.log("userA_before : ", userA_before.toNumber());
    console.log("userB_before : ", userB_before.toNumber());
    console.log("vaultA_before : ", vaultA_before.toNumber());
    console.log("vaultB_before : ", vaultB_before.toNumber());
    console.log("liqudity_before : ", liqudity_before.toString());

    await program.methods
      .removeLiquidityAmm(remove_liquidity_amount)
      .accountsStrict({
        owner: payer.publicKey,
        vaultA: vaultA,
        vaultB: vaultB,
        tokenAMint: mintA,
        tokenBMint: mintB,
        pool: poolPda,
        userTokenAAccount: userA,
        userTokenBAccount: userB,
        lpMint: lpMint,
        userLpMintAccount: userLp,
        tokenProgram: TOKEN_2022_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .rpc();

    const userA_after = await bal(userA);
    const userB_after = await bal(userB);
    const vaultA_after = await bal(vaultA);
    const vaultB_after = await bal(vaultB);
    const liqudity_after = (
      await getMint(provider.connection, lpMint, undefined, TOKEN_2022_ID)
    ).supply;

    console.log("userA_after : ", userA_after.toNumber());
    console.log("userB_after : ", userB_after.toNumber());
    console.log("vaultA_after : ", vaultA_after.toNumber());
    console.log("vaultB_after : ", vaultB_after.toNumber());
    console.log("liqudity_after : ", liqudity_after.toString());

    const amountAout = remove_liquidity_amount
      .mul(reserveA)
      .div(new anchor.BN(liqudity_before.toString()));
    const amountBout = remove_liquidity_amount
      .mul(reserveB)
      .div(new anchor.BN(liqudity_before.toString()));

    console.log("amountAout : ", amountAout.toNumber());
    console.log("amountBout : ", amountBout.toNumber());

    expect(userA_after).to.be.bignumber.eq(userA_before.add(amountAout));
    expect(userB_after).to.be.bignumber.eq(userB_before.add(amountBout));
    expect(vaultA_after).to.be.bignumber.eq(vaultA_before.sub(amountAout));
    expect(vaultB_after).to.be.bignumber.eq(vaultB_before.sub(amountBout));
    expect(new anchor.BN(liqudity_after.toString())).to.be.bignumber.eq(
      new anchor.BN(liqudity_before.toString()).sub(remove_liquidity_amount)
    );
  });
});

function associatedAddress({
  mint,
  owner,
}: {
  mint: PublicKey;
  owner: PublicKey;
}): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_PROGRAM_ID
  )[0];
}
