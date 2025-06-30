import React, { useEffect, useState } from "react";
import { Navigation } from "./Navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  useConnection,
  useWallet,
  type AnchorWallet,
} from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import idl from "../idl/spl.json";
import type { Spl } from "../idl/spl.ts";
import "../styles/AMMOperations.css";

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
async function ensureAta(
  provider: AnchorProvider,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_PROGRAM_ID
  );

  try {
    await getAccount(
      provider.connection,
      ata,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    return ata;
  } catch {
    const ix = createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      ata,
      owner,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_PROGRAM_ID
    );

    const tx = new Transaction().add(ix);
    await provider.sendAndConfirm(tx);

    return ata;
  }
}
const LIQUIDITY_POOL = Buffer.from("liquidity_pool");

export const AMMOperations: React.FC = () => {
  const { connection } = useConnection();
  const solanaWallet = useWallet();
  const [activeTab, setActiveTab] = useState<
    "initialize" | "swap" | "addLiquidity" | "removeLiquidity"
  >("initialize");
  const [status, setStatus] = useState("");

  const [poolName, setPoolName] = useState("");
  const [feePercentage, setFeePercentage] = useState("30");
  const [tokenAMint, setTokenAMint] = useState("");
  const [tokenBMint, setTokenBMint] = useState("");

  const [swapTokenIn, setSwapTokenIn] = useState("");
  const [swapTokenOut, setSwapTokenOut] = useState("");
  const [swapAmount, setSwapAmount] = useState("");
  const [poolAddress, setPoolAddress] = useState("");
  const [quotedAmountOut, setQuotedAmountOut] = useState<string>("");
  const [isQuoting, setIsQuoting] = useState(false);

  const [addTokenA, setAddTokenA] = useState("");
  const [addTokenB, setAddTokenB] = useState("");
  const [addAmountA, setAddAmountA] = useState("");
  const [addAmountB, setAddAmountB] = useState("");
  const [addPoolAddress, setAddPoolAddress] = useState("");

  const [removePoolAddress, setRemovePoolAddress] = useState("");
  const [removeAmount, setRemoveAmount] = useState("");

  const getProvider = () => {
    if (!solanaWallet.publicKey) throw new Error("Wallet not connected!");
    const anchorWallet = solanaWallet as unknown as AnchorWallet;
    const opts = AnchorProvider.defaultOptions();
    return new AnchorProvider(connection, anchorWallet, opts);
  };

  const getProgram = (provider: AnchorProvider) => {
    return new Program(idl as Idl, provider) as unknown as Program<Spl>;
  };

  const showStatus = (message: string, isError = false) => {
    setStatus(`${isError ? "❌ " : "✅ "}${message}`);
    setTimeout(() => setStatus(""), 8000);
  };

  const autoQuote = async () => {
    if (!poolAddress || !swapAmount || !solanaWallet.publicKey) {
      setQuotedAmountOut("");
      return;
    }

    try {
      setIsQuoting(true);
      const provider = getProvider();
      const program = getProgram(provider);
      const poolPk = new PublicKey(poolAddress);
      const amountIn = new BN(parseFloat(swapAmount) * 10 ** 9);

      const amountOut = await program.methods
        .quoteAmm(amountIn)
        .accountsStrict({
          pool: poolPk,
          tokenInMint: swapTokenIn,
          tokenOutMint: swapTokenOut,
        })
        .view();

      const amountOutFormatted = (amountOut.toNumber() / 10 ** 9).toFixed(9);
      setQuotedAmountOut(amountOutFormatted);
    } catch (error) {
      console.error("Quote error:", error);
      setQuotedAmountOut("Error getting quote");
    } finally {
      setIsQuoting(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      autoQuote();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolAddress, swapAmount]);

  const initializeLiquidityPool = async () => {
    try {
      if (!solanaWallet.publicKey)
        throw new Error("Please connect your wallet first");
      if (!poolName) throw new Error("Please enter pool name");
      if (!tokenAMint || !tokenBMint)
        throw new Error("Please enter both token mint addresses");
      if (!feePercentage) throw new Error("Please enter fee percentage");

      const provider = getProvider();
      const program = getProgram(provider);
      const tokenAMintPk = new PublicKey(tokenAMint);
      const tokenBMintPk = new PublicKey(tokenBMint);

      const [poolPda] = PublicKey.findProgramAddressSync(
        [LIQUIDITY_POOL, tokenAMintPk.toBuffer(), tokenBMintPk.toBuffer()],
        program.programId
      );

      const vaultA = await ensureAta(provider, tokenAMintPk, poolPda);
      const vaultB = await ensureAta(provider, tokenBMintPk, poolPda);

      const [lpMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_mint"), poolPda.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .initializeLiquidityPoolAmm(poolName, parseInt(feePercentage))
        .accountsStrict({
          admin: solanaWallet.publicKey,
          tokenAMint: tokenAMintPk,
          tokenBMint: tokenBMintPk,
          vaultTokenA: vaultA,
          vaultTokenB: vaultB,
          pool: poolPda,
          lpMint: lpMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      showStatus(
        `Liquidity pool initialized successfully!\nPool Address: ${poolPda.toString()}\nTransaction: ${tx}`
      );
      setPoolAddress(poolPda.toString());
    } catch (error: unknown) {
      console.error("Initialize pool error:", error);
      showStatus(
        `Error initializing pool: ${
          error instanceof Error ? error.message : String(error)
        }`,
        true
      );
    }
  };

  const handleSwap = async () => {
    try {
      if (!solanaWallet.publicKey)
        throw new Error("Please connect your wallet first");
      if (!poolAddress) throw new Error("Please enter pool address");
      if (!swapTokenIn || !swapTokenOut)
        throw new Error("Please enter both token addresses");
      if (!swapAmount) throw new Error("Please enter swap amount");
      if (!quotedAmountOut || quotedAmountOut === "Error getting quote")
        throw new Error("Please wait for quote to complete");

      const provider = getProvider();
      const program = getProgram(provider);
      const poolPk = new PublicKey(poolAddress);
      const tokenInPk = new PublicKey(swapTokenIn);
      const tokenOutPk = new PublicKey(swapTokenOut);
      const amountIn = new BN(parseFloat(swapAmount) * 10 ** 9);
      const amountOut = new BN(parseFloat(quotedAmountOut) * 10 ** 9);

      const vaultIn = associatedAddress({
        mint: tokenInPk,
        owner: poolPk,
      });

      const vaultOut = associatedAddress({
        mint: tokenOutPk,
        owner: poolPk,
      });

      const userIn = await ensureAta(
        provider,
        tokenInPk,
        solanaWallet.publicKey
      );

      const userOut = await ensureAta(
        provider,
        tokenOutPk,
        solanaWallet.publicKey
      );

      const tx = await program.methods
        .swapAmm(amountIn, amountOut)
        .accountsStrict({
          swapper: solanaWallet.publicKey,
          pool: poolPk,
          vaultIn: vaultIn,
          vaultOut: vaultOut,
          userIn: userIn,
          userOut: userOut,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(
        `Swap completed successfully!\nAmount Out: ${quotedAmountOut}\nTransaction: ${tx}`
      );
    } catch (error: unknown) {
      console.error("Swap error:", error);
      showStatus(
        `Error swapping tokens: ${
          error instanceof Error ? error.message : String(error)
        }`,
        true
      );
    }
  };

  const handleAddLiquidity = async () => {
    try {
      if (!solanaWallet.publicKey)
        throw new Error("Please connect your wallet first");
      if (!addPoolAddress) throw new Error("Please enter pool address");
      if (!addTokenA || !addTokenB)
        throw new Error("Please enter both token addresses");
      if (!addAmountA || !addAmountB)
        throw new Error("Please enter both amounts");

      const provider = getProvider();
      const program = getProgram(provider);
      const poolPk = new PublicKey(addPoolAddress);
      const tokenAPk = new PublicKey(addTokenA);
      const tokenBPk = new PublicKey(addTokenB);
      const amountA = new BN(parseFloat(addAmountA) * 10 ** 9);
      const amountB = new BN(parseFloat(addAmountB) * 10 ** 9);

      const vaultA = associatedAddress({
        mint: tokenAPk,
        owner: poolPk,
      });

      const vaultB = associatedAddress({
        mint: tokenBPk,
        owner: poolPk,
      });

      const [lpMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_mint"), poolPk.toBuffer()],
        program.programId
      );

      const userTokenA = await ensureAta(
        provider,
        tokenAPk,
        solanaWallet.publicKey
      );

      const userTokenB = await ensureAta(
        provider,
        tokenBPk,
        solanaWallet.publicKey
      );

      const userLp = await ensureAta(provider, lpMint, solanaWallet.publicKey);

      const tx = await program.methods
        .addLiquidityAmm(amountA, amountB)
        .accountsStrict({
          depositor: solanaWallet.publicKey,
          tokenAMint: tokenAPk,
          tokenBMint: tokenBPk,
          vaultA: vaultA,
          vaultB: vaultB,
          pool: poolPk,
          lpMint: lpMint,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          userLpMintAccount: userLp,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      showStatus(`Liquidity added successfully!\nTransaction: ${tx}`);
    } catch (error: unknown) {
      console.error("Add liquidity error:", error);
      showStatus(
        `Error adding liquidity: ${
          error instanceof Error ? error.message : String(error)
        }`,
        true
      );
    }
  };

  const handleRemoveLiquidity = async () => {
    try {
      if (!solanaWallet.publicKey)
        throw new Error("Please connect your wallet first");
      if (!removePoolAddress) throw new Error("Please enter pool address");
      if (!removeAmount) throw new Error("Please enter remove amount");

      const provider = getProvider();
      const program = getProgram(provider);
      const poolPk = new PublicKey(removePoolAddress);
      const removeAmountBN = new BN(parseFloat(removeAmount) * 10 ** 9);

      const pool = await program.account.liquidityPoolAmm.fetch(poolPk);
      const tokenAPk = new PublicKey(pool.tokenAMint);
      const tokenBPk = new PublicKey(pool.tokenBMint);

      const vaultA = associatedAddress({
        mint: tokenAPk,
        owner: poolPk,
      });

      const vaultB = associatedAddress({
        mint: tokenBPk,
        owner: poolPk,
      });

      const [lpMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_mint"), poolPk.toBuffer()],
        program.programId
      );

      const userTokenA = await ensureAta(
        provider,
        tokenAPk,
        solanaWallet.publicKey
      );

      const userTokenB = await ensureAta(
        provider,
        tokenBPk,
        solanaWallet.publicKey
      );

      const userLp = await ensureAta(provider, lpMint, solanaWallet.publicKey);

      const tx = await program.methods
        .removeLiquidityAmm(removeAmountBN)
        .accountsStrict({
          owner: solanaWallet.publicKey,
          vaultA: vaultA,
          vaultB: vaultB,
          tokenAMint: tokenAPk,
          tokenBMint: tokenBPk,
          pool: poolPk,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          lpMint: lpMint,
          userLpMintAccount: userLp,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Liquidity removed successfully!\nTransaction: ${tx}`);
    } catch (error: unknown) {
      console.error("Remove liquidity error:", error);
      showStatus(
        `Error removing liquidity: ${
          error instanceof Error ? error.message : String(error)
        }`,
        true
      );
    }
  };

  const renderInitializeTab = () => (
    <div className="amm-tab-content">
      <div className="amm-card">
        <h3>Initialize Liquidity Pool</h3>
        <div className="liquidity-container">
          <div className="liquidity-input-group">
            <label>Pool Name</label>
            <input
              type="text"
              placeholder="e.g., SOL/USDC"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token A Mint Address</label>
            <input
              type="text"
              placeholder="Enter Token A mint address"
              value={tokenAMint}
              onChange={(e) => setTokenAMint(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token B Mint Address</label>
            <input
              type="text"
              placeholder="Enter Token B mint address"
              value={tokenBMint}
              onChange={(e) => setTokenBMint(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Fee Percentage (basis points)</label>
            <input
              type="number"
              placeholder="30"
              value={feePercentage}
              onChange={(e) => setFeePercentage(e.target.value)}
              min="1"
              max="1000"
            />
          </div>

          <button
            className="amm-button primary"
            onClick={initializeLiquidityPool}
          >
            Initialize Pool
          </button>
        </div>
      </div>
    </div>
  );

  const renderSwapTab = () => (
    <div className="amm-tab-content">
      <div className="amm-card">
        <h3>Swap Tokens</h3>
        <div className="swap-container">
          <div className="swap-input-group">
            <label>Pool Address</label>
            <input
              type="text"
              placeholder="Enter pool address"
              value={poolAddress}
              onChange={(e) => setPoolAddress(e.target.value)}
            />
          </div>

          <div className="swap-input-group">
            <label>Token In Address</label>
            <input
              type="text"
              placeholder="Enter token in mint address"
              value={swapTokenIn}
              onChange={(e) => setSwapTokenIn(e.target.value)}
            />
          </div>

          <div className="swap-input-group">
            <label>Token Out Address</label>
            <input
              type="text"
              placeholder="Enter token out mint address"
              value={swapTokenOut}
              onChange={(e) => setSwapTokenOut(e.target.value)}
            />
          </div>

          <div className="swap-input-group">
            <label>Amount to Swap</label>
            <input
              type="number"
              placeholder="0.0"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              step="0.000000001"
            />
          </div>

          {/* Quote Display */}
          <div className="quote-display">
            <label>Estimated Amount Out</label>
            <div className="quote-amount">
              {isQuoting ? (
                <span className="quote-loading">Calculating quote...</span>
              ) : quotedAmountOut ? (
                <span
                  className={`quote-value ${
                    quotedAmountOut === "Error getting quote"
                      ? "error"
                      : "success"
                  }`}
                >
                  {quotedAmountOut === "Error getting quote"
                    ? "Error getting quote"
                    : `${quotedAmountOut} tokens`}
                </span>
              ) : (
                <span className="quote-placeholder">
                  Enter pool address and amount to see quote
                </span>
              )}
            </div>
          </div>

          <button
            className="amm-button primary"
            onClick={handleSwap}
            disabled={
              !quotedAmountOut ||
              quotedAmountOut === "Error getting quote" ||
              isQuoting
            }
          >
            {isQuoting ? "Getting Quote..." : "Swap Tokens"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderAddLiquidityTab = () => (
    <div className="amm-tab-content">
      <div className="amm-card">
        <h3>Add Liquidity</h3>
        <div className="liquidity-container">
          <div className="liquidity-input-group">
            <label>Pool Address</label>
            <input
              type="text"
              placeholder="Enter pool address"
              value={addPoolAddress}
              onChange={(e) => setAddPoolAddress(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token A Address</label>
            <input
              type="text"
              placeholder="Enter Token A mint address"
              value={addTokenA}
              onChange={(e) => setAddTokenA(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token B Address</label>
            <input
              type="text"
              placeholder="Enter Token B mint address"
              value={addTokenB}
              onChange={(e) => setAddTokenB(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token A Amount</label>
            <input
              type="number"
              placeholder="0.0"
              value={addAmountA}
              onChange={(e) => setAddAmountA(e.target.value)}
              step="0.000000001"
            />
          </div>

          <div className="liquidity-input-group">
            <label>Token B Amount</label>
            <input
              type="number"
              placeholder="0.0"
              value={addAmountB}
              onChange={(e) => setAddAmountB(e.target.value)}
              step="0.000000001"
            />
          </div>

          <button className="amm-button primary" onClick={handleAddLiquidity}>
            Add Liquidity
          </button>
        </div>
      </div>
    </div>
  );

  const renderRemoveLiquidityTab = () => (
    <div className="amm-tab-content">
      <div className="amm-card">
        <h3>Remove Liquidity</h3>
        <div className="liquidity-container">
          <div className="liquidity-input-group">
            <label>Pool Address</label>
            <input
              type="text"
              placeholder="Enter pool address"
              value={removePoolAddress}
              onChange={(e) => setRemovePoolAddress(e.target.value)}
            />
          </div>

          <div className="liquidity-input-group">
            <label>LP Token Amount</label>
            <input
              type="number"
              placeholder="0.0"
              value={removeAmount}
              onChange={(e) => setRemoveAmount(e.target.value)}
              step="0.000000001"
            />
          </div>

          <button
            className="amm-button secondary"
            onClick={handleRemoveLiquidity}
          >
            Remove Liquidity
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="amm-operations">
      <Navigation />
      <div className="amm-header">
        <h2>Automated Market Maker (AMM)</h2>
        <p>Trade tokens, provide liquidity, and earn fees</p>
      </div>

      <div className="amm-content">
        <WalletMultiButton />

        {status && (
          <div
            className={`status-message ${
              status.includes("❌") ? "error" : "success"
            }`}
          >
            <p>{status}</p>
          </div>
        )}

        {solanaWallet.publicKey ? (
          <>
            <div className="amm-tabs">
              <button
                className={`amm-tab ${
                  activeTab === "initialize" ? "active" : ""
                }`}
                onClick={() => setActiveTab("initialize")}
              >
                🏗️ Initialize Pool
              </button>
              <button
                className={`amm-tab ${activeTab === "swap" ? "active" : ""}`}
                onClick={() => setActiveTab("swap")}
              >
                💱 Swap
              </button>
              <button
                className={`amm-tab ${
                  activeTab === "addLiquidity" ? "active" : ""
                }`}
                onClick={() => setActiveTab("addLiquidity")}
              >
                ➕ Add Liquidity
              </button>
              <button
                className={`amm-tab ${
                  activeTab === "removeLiquidity" ? "active" : ""
                }`}
                onClick={() => setActiveTab("removeLiquidity")}
              >
                ➖ Remove Liquidity
              </button>
            </div>

            {activeTab === "initialize" && renderInitializeTab()}
            {activeTab === "swap" && renderSwapTab()}
            {activeTab === "addLiquidity" && renderAddLiquidityTab()}
            {activeTab === "removeLiquidity" && renderRemoveLiquidityTab()}
          </>
        ) : (
          <div className="connect-wallet">
            <p>Please connect your wallet to continue.</p>
          </div>
        )}
      </div>
    </div>
  );
};
