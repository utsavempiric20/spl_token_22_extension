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
    await program.methods
      .addLiquidityAmm(
        new anchor.BN(200).mul(PRECISION),
        new anchor.BN(200).mul(PRECISION)
      )
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
  });

  it("Swap Tokens", async () => {
    const amount_out = await program.methods
      .quoteAmm(new anchor.BN(10).mul(new anchor.BN(10 ** 9)))
      .accountsStrict({
        pool: poolPda,
      })
      .view();
    console.log("amount_out : ", amount_out);

    await program.methods
      .swapAmm(
        new anchor.BN(10).mul(new anchor.BN(10 ** 9)),
        new anchor.BN(amount_out)
      )
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
  });

  it("Remove Liqudity", async () => {
    await program.methods
      .removeLiquidityAmm(new anchor.BN(10).mul(new anchor.BN(10 ** 9)))
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
