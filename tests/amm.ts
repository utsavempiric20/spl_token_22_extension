import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  getAccount,
  getMint,
  getAssociatedTokenAddressSync,
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
const AIRDROP_AMOUNT_SOL = 2;
let mint2Keypair = Keypair.generate();
let mint2pubKey = mint2Keypair.publicKey;
let mint0Pda: PublicKey;
let mint1Pda: PublicKey;
let tokenAata: PublicKey;
let tokenBata: PublicKey;
let extraMetasAccountMint0: PublicKey;
let extraMetasAccountMint1: PublicKey;
let lp_poolPda: PublicKey;
let lp_poolBump: Number;
let vaultA_ata: PublicKey;
let vaultB_ata: PublicKey;
let lpMintPda: PublicKey;
let userMintPda: PublicKey;

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
      mint2pubKey,
      AIRDROP_AMOUNT_SOL * LAMPORTS_PER_SOL
    );
    console.log("Airdrop Successfully");

    [mint0Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), payer.publicKey.toBuffer()],
      program.programId
    );

    [mint1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), mint2Keypair.publicKey.toBuffer()],
      program.programId
    );
    [extraMetasAccountMint0] = PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mint0Pda.toBuffer()],
      program.programId
    );

    [extraMetasAccountMint1] = PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mint1Pda.toBuffer()],
      program.programId
    );

    tokenAata = associatedAddress({
      mint: mint0Pda,
      owner: provider.wallet.publicKey,
    });
    tokenBata = associatedAddress({
      mint: mint1Pda,
      owner: mint2Keypair.publicKey,
    });

    console.log("mint0Pda : ", mint0Pda.toString());
    console.log("mint1Pda : ", mint1Pda.toString());
    console.log("extraMetasAccountMint0 : ", extraMetasAccountMint0.toString());
    console.log("extraMetasAccountMint1 : ", extraMetasAccountMint1.toString());
    console.log("tokenAata : ", tokenAata.toString());
    console.log("tokenBata : ", tokenBata.toString());
  });

  it("createMintAccount: initializes mint + ATA with zero balance", async () => {
    await program.methods
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
        mint: mint0Pda,
        mintTokenAccount: tokenAata,
        extraMetasAccount: extraMetasAccountMint0,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([payer])
      .rpc();

    const acct = await getAccount(
      provider.connection,
      tokenAata,
      undefined,
      TOKEN_2022_ID
    );

    await program.methods
      .createMintAccount(
        decimals_1,
        TOKEN_NAME_1,
        TOKEN_SYMBOL_1,
        METADATA_URI_1
      )
      .accountsStrict({
        payer: mint2pubKey,
        authority: mint2pubKey,
        receiver: mint2pubKey,
        mint: mint1Pda,
        mintTokenAccount: tokenBata,
        extraMetasAccount: extraMetasAccountMint1,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([mint2Keypair])
      .rpc();

    const acct1 = await getAccount(
      provider.connection,
      tokenBata,
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
        mint: mint0Pda,
        to: tokenAata,
        authority: payer.publicKey,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([payer])
      .rpc();

    const acct = await getAccount(
      provider.connection,
      tokenAata,
      undefined,
      TOKEN_2022_ID
    );

    await program.methods
      .mintTokens(mintAmount)
      .accountsStrict({
        mint: mint1Pda,
        to: tokenBata,
        authority: mint2pubKey,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([mint2Keypair])
      .rpc();

    const acct1 = await getAccount(
      provider.connection,
      tokenBata,
      undefined,
      TOKEN_2022_ID
    );
    expect(acct.amount).to.eql(BigInt(1_000 * 10 ** decimals_0));
    expect(acct1.amount).to.eql(BigInt(1_000 * 10 ** decimals_0));
  });

  it("Initialize the Liquidity pool", async () => {
    [lp_poolPda, lp_poolBump] = PublicKey.findProgramAddressSync(
      [LIQUIDITY_POOL, mint0Pda.toBuffer(), mint1Pda.toBuffer()],
      program.programId
    );

    vaultA_ata = getAssociatedTokenAddressSync(
      mint0Pda,
      lp_poolPda,
      true,
      TOKEN_2022_ID,
      ASSOCIATED_PROGRAM_ID
    );

    vaultB_ata = getAssociatedTokenAddressSync(
      mint1Pda,
      lp_poolPda,
      true,
      TOKEN_2022_ID,
      ASSOCIATED_PROGRAM_ID
    );

    [lpMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp_mint"), lp_poolPda.toBuffer()],
      program.programId
    );

    userMintPda = getAssociatedTokenAddressSync(
      lpMintPda,
      payer.publicKey,
      true,
      TOKEN_2022_ID,
      ASSOCIATED_PROGRAM_ID
    );
    console.log("lp_poolPda : ", lp_poolPda.toString());
    console.log("vaultA_ata : ", vaultA_ata.toString());
    console.log("vaultB_ata : ", vaultB_ata.toString());
    console.log("lpMintPda : ", lpMintPda.toString());
    console.log("userMintPda : ", userMintPda.toString());

    await program.methods
      .initializeLiquidityPoolAmm("PBC/DBC", 30)
      .accountsStrict({
        admin: payer.publicKey,
        tokenAMint: mint0Pda,
        tokenBMint: mint1Pda,
        vaultTokenA: vaultA_ata,
        vaultTokenB: vaultB_ata,
        pool: lp_poolPda,
        lpMint: lpMintPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
      .rpc();
  });

  it("Add Liquidity", async () => {
    await program.methods
      .addLiquidityAmm(
        new anchor.BN(200).mul(new anchor.BN(10 ** 9)),
        new anchor.BN(200).mul(new anchor.BN(10 ** 9))
      )
      .accountsStrict({
        depositor: payer.publicKey,
        tokenAMint: mint0Pda,
        tokenBMint: mint1Pda,
        vaultA: vaultA_ata,
        vaultB: vaultB_ata,
        pool: lp_poolPda,
        lpMint: lpMintPda,
        userTokenAAccount: tokenAata,
        userTokenBAccount: tokenBata,
        userLpMintAccount: userMintPda,
        // systemProgram: SystemProgram.programId,
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
        pool: lp_poolPda,
      })
      .rpc();

    await program.methods
      .swapAmm(
        new anchor.BN(10).mul(new anchor.BN(10 ** 9)),
        new anchor.BN(amount_out)
      )
      .accountsStrict({
        swapper: payer.publicKey,
        pool: lp_poolPda,
        vaultIn: vaultA_ata,
        vaultOut: vaultB_ata,
        userIn: tokenAata,
        userOut: tokenBata,
        tokenAMint: mint0Pda,
        tokenBMint: mint1Pda,
        tokenProgram: TOKEN_2022_ID,
      })
      .signers([payer])
      .rpc();
  });

  it("Remove Liqudity", async () => {
    await program.methods
      .removeLiquidityAmm(new anchor.BN(10).mul(new anchor.BN(10 ** 9)))
      .accountsStrict({
        owner: payer.publicKey,
        vaultA: vaultA_ata,
        vaultB: vaultB_ata,
        tokenAMint: mint0Pda,
        tokenBMint: mint1Pda,
        pool: lp_poolPda,
        userTokenAAccount: tokenAata,
        userTokenBAccount: tokenBata,
        lpMint: lpMintPda,
        userLpMintAccount: userMintPda,
        tokenProgram: TOKEN_2022_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .signers([payer])
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
