import { type FC, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Program,
  AnchorProvider,
  web3,
  utils,
  type Idl,
} from "@project-serum/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import idl from "../idl/spl.json";
import * as anchor from "@coral-xyz/anchor";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import type { Spl } from "../idl/spl";

const programID = new PublicKey("HqhTizn571FCHJ2pd6sLSJqKc5dAUVAu96dz4g4mURAN");

// Helper function to derive associated token address
function associatedAddress({
  mint,
  owner,
}: {
  mint: PublicKey;
  owner: PublicKey;
}): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export const TokenOperations: FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenUri, setTokenUri] = useState("");
  const [decimals, setDecimals] = useState("9");
  const [amount, setAmount] = useState("");
  const [mintAddress, setMintAddress] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getProvider = () => {
    if (!wallet.publicKey) throw new Error("Wallet not connected!");
    const opts = AnchorProvider.defaultOptions();
    const provider = new AnchorProvider(connection, wallet as any, opts);

    return provider;
  };

  const showStatus = (message: string, isError = false) => {
    setStatus(`${isError ? "❌ " : "✅ "}${message}`);
    setTimeout(() => setStatus(""), 5000);
  };

  const handleTransaction = async (callback: () => Promise<string>) => {
    setIsLoading(true);
    try {
      const signature = await callback();
      const confirmation = await connection.confirmTransaction(
        signature,
        "confirmed"
      );
      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${confirmation.value.err.toString()}`
        );
      }
      return signature;
    } finally {
      setIsLoading(false);
    }
  };

  const createToken = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Wallet not connected!");
      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);

      // Parse decimals before using it
      const tokenDecimals = parseInt(decimals) || 9;

      // Derive the mint PDA
      const [mintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint"), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      // Get the associated token account address
      const ata = await getAssociatedTokenAddress(
        mintPda,
        provider.wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Create the token with proper decimals
      const tx = await program.methods
        .createMintAccount(tokenDecimals, tokenName, tokenSymbol, tokenUri)
        .accounts({
          payer: provider.wallet.publicKey,
          authority: provider.wallet.publicKey,
          receiver: provider.wallet.publicKey,
          mint: mintPda,
          mint_token_account: ata,
          extra_metas_account: {
            pubkey: PublicKey.findProgramAddressSync(
              [Buffer.from("extra-account-metas"), mintPda.toBuffer()],
              program.programId
            )[0],
          },
          system_program: SystemProgram.programId,
          associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
          token_program: TOKEN_2022_PROGRAM_ID,
        })
        .preInstructions([
          anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
            units: 300000,
          }),
        ])
        .rpc();

      setMintAddress(mintPda.toString());
      showStatus(
        `✅ Token created!\nMint PDA: ${mintPda.toString()}\nTx: ${tx}`
      );
    } catch (error: unknown) {
      console.error("Program execution error:", error);
      if (error instanceof Error && "logs" in error) {
        console.error("Transaction logs:", (error as any).logs);
      }
      const errMsg =
        error instanceof Error ? error.message : JSON.stringify(error);
      showStatus(`Error creating token: ${errMsg}`, true);
    }
  };

  const mintTokens = async () => {
    try {
      if (!mintAddress) throw new Error("Please enter a mint address");

      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);
      const mintPubkey = new PublicKey(mintAddress);

      const associatedTokenAddress = await utils.token.associatedAddress({
        mint: mintPubkey,
        owner: provider.wallet.publicKey,
      });
      const tx = await program.methods
        .mintTokens(new anchor.BN(amount))
        .accounts({
          mint: mintPubkey,
          to: associatedTokenAddress,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Tokens minted successfully!`);
    } catch (error: unknown) {
      console.error("Error minting tokens:", error);
      showStatus(
        `Error minting tokens: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        true
      );
    }
  };

  const burnTokens = async () => {
    try {
      if (!mintAddress) throw new Error("Please enter a mint address");

      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);
      const mintPubkey = new PublicKey(mintAddress);

      const associatedTokenAddress = await utils.token.associatedAddress({
        mint: mintPubkey,
        owner: provider.wallet.publicKey,
      });

      const tx = await program.methods
        .burnTokens(new anchor.BN(amount))
        .accounts({
          mint: mintPubkey,
          from: associatedTokenAddress,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Tokens burned successfully!`);
    } catch (error: unknown) {
      console.error("Error burning tokens:", error);
      showStatus(
        `Error burning tokens: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        true
      );
    }
  };

  const freezeAccount = async () => {
    try {
      if (!mintAddress || !targetAddress)
        throw new Error("Please enter both mint and target addresses");

      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);

      const tx = await program.methods
        .freezeTokenAccount()
        .accounts({
          account: new PublicKey(targetAddress),
          mint: new PublicKey(mintAddress),
          freezeAuthority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Account frozen successfully!`);
    } catch (error: unknown) {
      console.error("Error freezing account:", error);
      showStatus(
        `Error freezing account: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        true
      );
    }
  };

  const thawAccount = async () => {
    try {
      if (!mintAddress || !targetAddress)
        throw new Error("Please enter both mint and target addresses");

      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);

      const tx = await program.methods
        .thawTokenAccount()
        .accounts({
          account: new PublicKey(targetAddress),
          mint: new PublicKey(mintAddress),
          freezeAuthority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Account thawed successfully!`);
    } catch (error: unknown) {
      console.error("Error thawing account:", error);
      showStatus(
        `Error thawing account: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        true
      );
    }
  };

  const closeAccount = async () => {
    try {
      if (!targetAddress) throw new Error("Please enter a target address");

      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);

      const tx = await program.methods
        .closeTokenAccount()
        .accounts({
          account: new PublicKey(targetAddress),
          destination: provider.wallet.publicKey,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Account closed successfully!`);
    } catch (error: unknown) {
      console.error("Error closing account:", error);
      showStatus(
        `Error closing account: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
        true
      );
    }
  };

  return (
    <div className="token-operations">
      <WalletMultiButton />

      {status && <div className="status-message">{status}</div>}

      {wallet.publicKey ? (
        <div className="operations">
          <div className="section">
            <h2>Create Token</h2>
            <input
              type="text"
              placeholder="Token Name"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Token Symbol"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
            />
            <input
              type="text"
              placeholder="Token URI"
              value={tokenUri}
              onChange={(e) => setTokenUri(e.target.value)}
            />
            <input
              type="number"
              placeholder="Decimals"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
            />
            <button onClick={createToken}>Create Token</button>
          </div>

          <div className="section">
            <h2>Token Operations</h2>
            <input
              type="text"
              placeholder="Mint Address"
              value={mintAddress}
              onChange={(e) => setMintAddress(e.target.value)}
            />
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="button-group">
              <button onClick={mintTokens}>Mint</button>
              <button onClick={burnTokens}>Burn</button>
            </div>
          </div>

          <div className="section">
            <h2>Account Management</h2>
            <input
              type="text"
              placeholder="Target Token Account Address"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
            />
            <div className="button-group">
              <button onClick={freezeAccount}>Freeze</button>
              <button onClick={thawAccount}>Thaw</button>
              <button onClick={closeAccount}>Close</button>
            </div>
          </div>
        </div>
      ) : (
        <p>Please connect your wallet to continue</p>
      )}
    </div>
  );
};
