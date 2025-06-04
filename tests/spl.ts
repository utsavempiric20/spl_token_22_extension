import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Spl } from "../target/types/spl";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getAccount } from "@solana/spl-token";
import { expect, assert } from "chai";

const TOKEN_2022_PROGRAM_ID = new anchor.web3.PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

function associatedAddress({
  mint,
  owner,
}: {
  mint: PublicKey;
  owner: PublicKey;
}): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_PROGRAM_ID
  )[0];
}

describe("spl_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Spl as Program<Spl>;

  const nodeWallet = provider.wallet as NodeWallet;
  const payer = nodeWallet.payer;

  let mintPda;
  let mintBump;
  let ata: PublicKey;
  let extraMetasAccount: PublicKey;

  const decimals = 9;
  const METADATA_URI =
    "https://amethyst-abstract-toad-183.mypinata.cloud/ipfs/bafkreibdcplpnxbet4kfzk2qo33yn6xi3l4hlppudmr742kvjsc5mafkh4";
  const TOKEN_NAME = "MetaWin";
  const TOKEN_SYMBOL = "MW";

  before(async () => {
    [mintPda, mintBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    // Derive the extra metas account PDA using the mint PDA
    [extraMetasAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mintPda.toBuffer()],
      program.programId
    );

    // Derive the associated token account (ATA) for the mint PDA
    ata = associatedAddress({
      mint: mintPda,
      owner: provider.wallet.publicKey,
    });
  });

  it("createMintAccount: initializes mint + ATA with zero balance", async () => {
    await program.methods
      .createMintAccount(decimals, TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI)
      .accountsStrict({
        payer: payer.publicKey,
        authority: payer.publicKey,
        receiver: payer.publicKey,
        mint: mintPda,
        mintTokenAccount: ata,
        extraMetasAccount: extraMetasAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // Check ATA balance is zero
    const acct = await getAccount(
      provider.connection,
      ata,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    expect(acct.amount).to.eql(BigInt(0));
  });

  it("mint_tokens: mints fresh supply into the ATA", async () => {
    const mintAmount = new BN(1_000_000 * 10 ** decimals);

    await program.methods
      .mintTokens(mintAmount)
      .accountsStrict({
        mint: mintPda,
        to: ata,
        authority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const acct = await getAccount(
      provider.connection,
      ata,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    expect(acct.amount).to.eql(BigInt(1_000_000 * 10 ** decimals));
  });

  it("burn_tokens: burns a portion of the supply", async () => {
    const burnAmount = new BN(200 * 10 ** decimals);

    await program.methods
      .burnTokens(burnAmount)
      .accountsStrict({
        mint: mintPda,
        from: ata,
        authority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    const acct = await getAccount(
      provider.connection,
      ata,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    expect(acct.amount).to.eql(BigInt((1_000_000 - 200) * 10 ** decimals));
  });

  it("freeze and thaw the token account", async () => {
    // Freeze
    await program.methods
      .freezeTokenAccount()
      .accountsStrict({
        account: ata,
        mint: mintPda,
        freezeAuthority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // Thaw
    await program.methods
      .thawTokenAccount()
      .accountsStrict({
        account: ata,
        mint: mintPda,
        freezeAuthority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();
  });

  // it("close_token_account: burns remaining and reclaims rent", async () => {
  //   // Burn the remainder so ATA balance = 0
  //   const remaining = (1_000_000 - 200) * 10 ** decimals;
  //   await program.methods
  //     .burnTokens(new BN(remaining))
  //     .accountsStrict({
  //       mint: mintPda,
  //       from: ata,
  //       authority: payer.publicKey,
  //       tokenProgram: TOKEN_2022_PROGRAM_ID,
  //     })
  //     .signers([payer])
  //     .rpc();

  //   // Close the ATA
  //   await program.methods
  //     .closeTokenAccount()
  //     .accountsStrict({
  //       account: ata,
  //       destination: payer.publicKey,
  //       authority: payer.publicKey,
  //       tokenProgram: TOKEN_2022_PROGRAM_ID,
  //     })
  //     .signers([payer])
  //     .rpc();

  //   // Now fetching it should fail
  //   try {
  //     await getAccount(
  //       provider.connection,
  //       ata,
  //       undefined,
  //       TOKEN_2022_PROGRAM_ID
  //     );
  //     assert.fail("Expected getAccount to throw after closing");
  //   } catch (err: any) {
  //     expect(err.message).to.match(/failed to get account data/i);
  //   }
  // });
});
