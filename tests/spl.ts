import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Spl } from "../target/types/spl";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { assert, expect } from "chai";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getAccount } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

const TOKEN_2022_PROGRAM_ID = new anchor.web3.PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

export function associatedAddress({
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

describe("spl", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Spl as Program<Spl>;

  const nodeWallet = provider.wallet as NodeWallet;
  const payer = nodeWallet.payer;
  let mint = new Keypair();

  it("Create mint account test passes", async () => {
    const decimals = 9;
    const mintAmount = 1_000_000 * 10 ** decimals;
    const name = "Gwagon Mer";
    const symbol = "GWM";
    const uri =
      "https://amethyst-abstract-toad-183.mypinata.cloud/ipfs/bafkreibrbkoefb6icm52zo24bhem3kb27e2x35zn5slakcmgyxq2ucw2te";
    const [extraMetasAccount] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("extra-account-metas"),
        mint.publicKey.toBuffer(),
      ],
      program.programId
    );
    await program.methods
      .createMintAccount(decimals, name, symbol, uri)
      .accountsStrict({
        payer: payer.publicKey,
        authority: payer.publicKey,
        receiver: payer.publicKey,
        mint: mint.publicKey,
        mintTokenAccount: associatedAddress({
          mint: mint.publicKey,
          owner: payer.publicKey,
        }),
        extraMetasAccount: extraMetasAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([mint, payer])
      .rpc();
  });

  it("mint_tokens increases the ATA balance", async () => {
    const decimals = 9;
    const initialAmount = 1_000_000 * 10 ** decimals; // from createMintAccount
    const mintMore = 500 * 10 ** decimals; // extra to mint
    const ata = associatedAddress({
      mint: mint.publicKey,
      owner: payer.publicKey,
    });

    // mint extra tokens
    await program.methods
      .mintTokens(new BN(mintMore + initialAmount))
      .accountsStrict({
        mint: mint.publicKey,
        to: ata,
        authority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // fetch ATA and check new balance
    const account = await getAccount(
      provider.connection,
      ata,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    expect(account.amount).to.eql(BigInt(initialAmount + mintMore));
  });

  it("burn_tokens decreases the ATA balance", async () => {
    const decimals = 9;
    const initialAmount = 1_000_000 * 10 ** decimals;
    const burnAmount = 200 * 10 ** decimals;
    const ata = associatedAddress({
      mint: mint.publicKey,
      owner: payer.publicKey,
    });

    // burn some tokens
    await program.methods
      .burnTokens(new BN(burnAmount))
      .accountsStrict({
        mint: mint.publicKey,
        from: ata,
        authority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // fetch ATA and check decreased balance
    const account = await getAccount(
      provider.connection,
      ata,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    expect(account.amount).to.eql(BigInt(initialAmount - burnAmount));
  });

  it("freeze_token_account then thaw_token_account succeed", async () => {
    const ata = associatedAddress({
      mint: mint.publicKey,
      owner: payer.publicKey,
    });

    // freeze
    await program.methods
      .freezeTokenAccount()
      .accountsStrict({
        account: ata,
        mint: mint.publicKey,
        freezeAuthority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // thaw
    await program.methods
      .thawTokenAccount()
      .accountsStrict({
        account: ata,
        mint: mint.publicKey,
        freezeAuthority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();
  });

  it("close_token_account reclaims rent and ATA no longer exists", async () => {
    const decimals = 9;
    const initialAmount = 1_000_000 * 10 ** decimals;
    const ata = associatedAddress({
      mint: mint.publicKey,
      owner: payer.publicKey,
    });

    // burn all remaining tokens so ATA balance == 0
    await program.methods
      .burnTokens(new BN(initialAmount))
      .accountsStrict({
        mint: mint.publicKey,
        from: ata,
        authority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // now close the empty ATA
    await program.methods
      .closeTokenAccount()
      .accountsStrict({
        account: ata,
        destination: payer.publicKey,
        authority: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .rpc();

    // attempting to fetch it should now fail
    try {
      await getAccount(
        provider.connection,
        ata,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      assert.fail("Expected getAccount to throw for closed ATA");
    } catch (err: any) {
      expect(err.message).to.match(/failed to get account data/i);
    }
  });
});
