import { type FC, useState } from "react";
import {
  useConnection,
  useWallet,
  type AnchorWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import idl from "../idl/spl.json";
import type { Spl } from "../idl/spl";

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
    ASSOCIATED_PROGRAM_ID
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

  const getProvider = () => {
    if (!wallet.publicKey) throw new Error("Wallet not connected!");
    const anchorWallet = wallet as unknown as AnchorWallet;
    const opts = AnchorProvider.defaultOptions();
    const provider = new AnchorProvider(connection, anchorWallet, opts);
    return provider;
  };

  const getProgram = (provider: AnchorProvider) => {
    const program = new Program(idl as Idl, provider);
    return program as unknown as Program<Spl>;
  };

  const showStatus = (message: string, isError = false) => {
    setStatus(`${isError ? "❌ " : "✅ "}${message}`);
    setTimeout(() => setStatus(""), 5000);
  };

  const createToken = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Wallet not connected!");
      const provider = getProvider();
      const program = getProgram(provider);

      const tokenDecimals = parseInt(decimals) || 9;

      const [mintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint"), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      const [extraMetasPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("extra-account-metas"), mintPda.toBuffer()],
        program.programId
      );

      const ata = associatedAddress({
        mint: mintPda,
        owner: provider.wallet.publicKey,
      });

      const tx = await program.methods
        .createMintAccount(tokenDecimals, tokenName, tokenSymbol, tokenUri)
        .accountsStrict({
          payer: provider.wallet.publicKey,
          authority: provider.wallet.publicKey,
          receiver: provider.wallet.publicKey,
          mint: mintPda,
          mintTokenAccount: ata,
          extraMetasAccount: extraMetasPda,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      setMintAddress(mintPda.toString());
      showStatus(
        `✅ Token created!\nMint PDA: ${mintPda.toString()}\nTx: ${tx}`
      );
    } catch (error: unknown) {
      console.error("Program execution error:", error);
      if (error instanceof Error && "logs" in error) {
        console.error("Transaction logs:", error.logs);
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
      const program = getProgram(provider);
      const mintPubkey = new PublicKey(mintAddress);

      const ata = associatedAddress({
        mint: mintPubkey,
        owner: provider.wallet.publicKey,
      });

      const tx = await program.methods
        .mintTokens(new BN(amount))
        .accountsStrict({
          mint: mintPubkey,
          to: ata,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Tokens minted successfully!\nTx: ${tx}`);
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
      const program = getProgram(provider);
      const mintPubkey = new PublicKey(mintAddress);

      const ata = associatedAddress({
        mint: mintPubkey,
        owner: provider.wallet.publicKey,
      });

      const tx = await program.methods
        .burnTokens(new BN(amount))
        .accountsStrict({
          mint: mintPubkey,
          from: ata,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Tokens burned successfully!\nTx: ${tx}`);
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
      const program = getProgram(provider);

      const tx = await program.methods
        .freezeTokenAccount()
        .accountsStrict({
          account: new PublicKey(targetAddress),
          mint: new PublicKey(mintAddress),
          freezeAuthority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Account frozen successfully!\nTx: ${tx}`);
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
      const program = getProgram(provider);

      const tx = await program.methods
        .thawTokenAccount()
        .accountsStrict({
          account: new PublicKey(targetAddress),
          mint: new PublicKey(mintAddress),
          freezeAuthority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Account thawed successfully!\nTx: ${tx}`);
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
      const program = getProgram(provider);

      const tx = await program.methods
        .closeTokenAccount()
        .accountsStrict({
          account: new PublicKey(targetAddress),
          destination: provider.wallet.publicKey,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Account closed successfully!\nTx: ${tx}`);
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
