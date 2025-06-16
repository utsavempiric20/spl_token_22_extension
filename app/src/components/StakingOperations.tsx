import React, { useState } from "react";
import {
  useConnection,
  useWallet,
  type AnchorWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

import idl from "../idl/spl.json";
import type { Spl } from "../idl/spl";

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

const POOL_SEED = "staking_pool";
const USER_STAKE_SEED = "user_stake";

export const StakingOperations: React.FC = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [stakeMint, setStakeMint] = useState("");
  const [rewardRatePerDay, setRewardRatePerDay] = useState<string>("0");

  const [stakeAmount, setStakeAmount] = useState("0");
  const [unstakeAmount, setUnstakeAmount] = useState("0");
  const [depositAmt, setDepositAmt] = useState("0");
  const [newRewardRate, setNewRewardRate] = useState("0");
  const [isPaused, setIsPaused] = useState(false);

  const [status, setStatus] = useState<string>("");

  const getProvider = () => {
    if (!wallet.publicKey) throw new Error("Wallet not connected!");
    const anchorWallet = wallet as unknown as AnchorWallet;
    const opts = AnchorProvider.defaultOptions();
    return new AnchorProvider(connection, anchorWallet, opts);
  };

  const getProgram = (provider: AnchorProvider) => {
    return new Program(idl as Idl, provider) as unknown as Program<Spl>;
  };

  const showStatus = (msg: string, isErr = false) => {
    setStatus(`${isErr ? "❌" : "✅"} ${msg}`);
    setTimeout(() => setStatus(""), 8_000);
  };
  const PROGRAM_ID = (idl as Idl).address;

  const derivePoolPda = (mint: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from(POOL_SEED), mint.toBuffer()],
      new PublicKey(PROGRAM_ID)
    )[0];

  const deriveUserStakePda = (pool: PublicKey, staker: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from(USER_STAKE_SEED), pool.toBuffer(), staker.toBuffer()],
      new PublicKey(PROGRAM_ID)
    )[0];

  const initializePool = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const stakeVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const rewardVault = stakeVault;

      const tx = await program.methods
        .initializePoolStake(new BN(rewardRatePerDay))
        .accountsStrict({
          admin: wallet.publicKey,
          stakeMint: stakeMintPk,
          rewardMint: stakeMintPk,
          pool: poolPda,
          stakeVault,
          rewardVault,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      showStatus(`Pool initialised! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const stakeTokens = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet");
      if (!stakeMint) throw new Error("Enter stake mint");
      const amount = Number(stakeAmount);
      if (!amount || amount <= 0) throw new Error("Amount?");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const userStakePda = deriveUserStakePda(poolPda, wallet.publicKey);
      const stakeVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const userAta = associatedAddress({
        mint: stakeMintPk,
        owner: wallet.publicKey,
      });

      const tx = await program.methods
        .stake(new BN(amount))
        .accountsStrict({
          staker: wallet.publicKey,
          stakeMint: stakeMintPk,
          pool: poolPda,
          stakeVault,
          userStakeAccount: userAta,
          userStake: userStakePda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      showStatus(`Staked ${amount}! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const unstakeTokens = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet");
      if (!stakeMint) throw new Error("Enter stake mint");
      const amount = Number(unstakeAmount);
      if (!amount || amount <= 0) throw new Error("Amount?");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const userStakePda = deriveUserStakePda(poolPda, wallet.publicKey);
      const stakeVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const userStakeAta = associatedAddress({
        mint: stakeMintPk,
        owner: wallet.publicKey,
      });
      const rewardVault = stakeVault;
      const userRewardAta = userStakeAta;

      const tx = await program.methods
        .unstake(new BN(amount))
        .accountsStrict({
          staker: wallet.publicKey,
          stakeMint: stakeMintPk,
          rewardMint: stakeMintPk,
          pool: poolPda,
          stakeVault,
          userStakeAccount: userStakeAta,
          userStake: userStakePda,
          rewardVault,
          userRewardAccount: userRewardAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      showStatus(`Unstaked! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const claimRewards = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet");
      if (!stakeMint) throw new Error("Enter stake mint");
      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const userStakePda = deriveUserStakePda(poolPda, wallet.publicKey);
      const rewardVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const userRewardAta = associatedAddress({
        mint: stakeMintPk,
        owner: wallet.publicKey,
      });

      const tx = await program.methods
        .claimRewardsStake()
        .accountsStrict({
          staker: wallet.publicKey,
          stakeMint: stakeMintPk,
          rewardMint: stakeMintPk,
          pool: poolPda,
          userStake: userStakePda,
          rewardVault,
          userRewardAccount: userRewardAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        })
        .rpc();
      showStatus(`Rewards claimed! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const pausePool = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);

      const tx = await program.methods
        .pausePoolAdmin()
        .accountsStrict({
          admin: wallet.publicKey,
          pool: poolPda,
        })
        .rpc();

      setIsPaused(true);
      showStatus(`Pool paused! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const unpausePool = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);

      const tx = await program.methods
        .unpausePoolAdmin()
        .accountsStrict({
          admin: wallet.publicKey,
          pool: poolPda,
        })
        .rpc();

      setIsPaused(false);
      showStatus(`Pool unpaused! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const depositRewards = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");
      const amount = Number(depositAmt);
      if (!amount || amount <= 0) throw new Error("Amount?");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const rewardVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });

      const tx = await program.methods
        .depositRewardsAdmin(new BN(amount))
        .accountsStrict({
          admin: wallet.publicKey,
          pool: poolPda,
          rewardVault,
          rewardMint: stakeMintPk,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Rewards deposited! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const emergencyWithdraw = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);
      const userStakePda = deriveUserStakePda(poolPda, wallet.publicKey);
      const stakeVault = associatedAddress({
        mint: stakeMintPk,
        owner: poolPda,
      });
      const userStakeAta = associatedAddress({
        mint: stakeMintPk,
        owner: wallet.publicKey,
      });

      const tx = await program.methods
        .emergencyWithdrawStake()
        .accountsStrict({
          staker: wallet.publicKey,
          stakeMint: stakeMintPk,
          pool: poolPda,
          stakeVault,
          userStakeAccount: userStakeAta,
          userStake: userStakePda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      showStatus(`Emergency withdrawal successful! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  const setRewardRate = async () => {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      if (!stakeMint) throw new Error("Enter stake mint");
      const rate = Number(newRewardRate);
      if (!rate || rate < 0) throw new Error("Invalid reward rate");

      const provider = getProvider();
      const program = getProgram(provider);
      const stakeMintPk = new PublicKey(stakeMint);

      const poolPda = derivePoolPda(stakeMintPk);

      const tx = await program.methods
        .setRewardRateStake(new BN(rate))
        .accountsStrict({
          admin: wallet.publicKey,
          pool: poolPda,
          stakeMint: stakeMintPk,
        })
        .rpc();

      showStatus(`Reward rate updated! Tx: ${tx}`);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      showStatus(msg, true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center bg-white rounded-xl shadow-sm p-4">
          <h1 className="text-2xl font-bold text-slate-800">
            Staking Operations
          </h1>
          <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 !rounded-lg !px-4 !py-2" />
        </div>

        {/* Status Message */}
        {status && (
          <div
            className={`p-4 rounded-lg ${
              status.includes("❌")
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            <p className="text-sm font-medium">{status}</p>
          </div>
        )}

        {wallet.publicKey ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Initialize Pool (admin) */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Initialize Pool
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Stake mint address"
                  value={stakeMint}
                  onChange={(e) => setStakeMint(e.target.value.trim())}
                />
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Reward rate per day (raw units)"
                  type="number"
                  value={rewardRatePerDay}
                  onChange={(e) => setRewardRatePerDay(e.target.value)}
                />
                <button
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  onClick={initializePool}
                >
                  Initialize Pool
                </button>
              </div>
            </div>

            {/* Pool Management (admin) */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                Pool Management
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Stake mint address"
                  value={stakeMint}
                  onChange={(e) => setStakeMint(e.target.value.trim())}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isPaused
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                    onClick={pausePool}
                    disabled={isPaused}
                  >
                    Pause Pool
                  </button>
                  <button
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      !isPaused
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                    onClick={unpausePool}
                    disabled={!isPaused}
                  >
                    Unpause Pool
                  </button>
                </div>
              </div>
            </div>

            {/* Stake */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Stake Tokens
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Stake mint address"
                  value={stakeMint}
                  onChange={(e) => setStakeMint(e.target.value.trim())}
                />
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Amount"
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                />
                <button
                  className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  onClick={stakeTokens}
                >
                  Stake
                </button>
              </div>
            </div>

            {/* Unstake */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Unstake Tokens
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Stake mint address"
                  value={stakeMint}
                  onChange={(e) => setStakeMint(e.target.value.trim())}
                />
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Amount"
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                />
                <button
                  className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                  onClick={unstakeTokens}
                >
                  Unstake
                </button>
              </div>
            </div>

            {/* Deposit Rewards (admin) */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                Deposit Rewards
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Stake mint address"
                  value={stakeMint}
                  onChange={(e) => setStakeMint(e.target.value.trim())}
                />
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Amount to deposit"
                  type="number"
                  value={depositAmt}
                  onChange={(e) => setDepositAmt(e.target.value)}
                />
                <button
                  className="w-full bg-cyan-600 text-white py-2 px-4 rounded-lg hover:bg-cyan-700 transition-colors font-medium"
                  onClick={depositRewards}
                >
                  Deposit Rewards
                </button>
              </div>
            </div>

            {/* Set Reward Rate (admin) */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
                Set Reward Rate
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Stake mint address"
                  value={stakeMint}
                  onChange={(e) => setStakeMint(e.target.value.trim())}
                />
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="New reward rate per day"
                  type="number"
                  value={newRewardRate}
                  onChange={(e) => setNewRewardRate(e.target.value)}
                />
                <button
                  className="w-full bg-violet-600 text-white py-2 px-4 rounded-lg hover:bg-violet-700 transition-colors font-medium"
                  onClick={setRewardRate}
                >
                  Update Reward Rate
                </button>
              </div>
            </div>

            {/* Claim Rewards */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                Claim Rewards
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Stake mint address"
                  value={stakeMint}
                  onChange={(e) => setStakeMint(e.target.value.trim())}
                />
                <button
                  className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors font-medium"
                  onClick={claimRewards}
                >
                  Claim Rewards
                </button>
              </div>
            </div>

            {/* Emergency Withdraw */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 border-2 border-red-100">
              <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                Emergency Withdraw
              </h2>
              <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                Warning: This will withdraw all your staked tokens immediately
                without rewards.
              </p>
              <div className="space-y-3">
                <input
                  className="w-full px-4 py-2 rounded-lg border border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-colors"
                  placeholder="Stake mint address"
                  value={stakeMint}
                  onChange={(e) => setStakeMint(e.target.value.trim())}
                />
                <button
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  onClick={emergencyWithdraw}
                >
                  Emergency Withdraw
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-slate-600">
              Please connect your wallet to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
