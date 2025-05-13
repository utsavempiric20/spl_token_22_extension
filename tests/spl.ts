import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Spl } from "../target/types/spl";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { assert, expect } from "chai";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getAccount } from "@solana/spl-token";

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

    const ata = await getAccount(
      provider.connection,
      associatedAddress({ mint: mint.publicKey, owner: payer.publicKey }),
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    expect(ata.amount).eql(BigInt(mintAmount));
  });

  it("mint extension constraints test passes", async () => {
    try {
      const tx = await program.methods
        .checkMintExtensionsConstraints()
        .accountsStrict({
          authority: payer.publicKey,
          mint: mint.publicKey,
        })
        .signers([payer])
        .rpc();
      assert.ok(tx, "transaction should be processed without error");
    } catch (e) {
      assert.fail("should not throw error");
    }
  });
  it("mint extension constraints fails with invalid authority", async () => {
    const wrongAuth = Keypair.generate();
    try {
      const x = await program.methods
        .checkMintExtensionsConstraints()
        .accountsStrict({
          authority: wrongAuth.publicKey,
          mint: mint.publicKey,
        })
        .signers([payer, wrongAuth])
        .rpc();
      assert.fail("should have thrown an error");
    } catch (e) {
      expect(e, "should throw error");
    }
  });
});
