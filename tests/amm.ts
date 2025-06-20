import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  getAccount,
  getMint,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import chai, { expect } from "chai";
import chaiBn from "chai-bn";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import { Spl } from "../app/src/idl/spl";

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

let mintPda: PublicKey;
let poolPda: PublicKey;

describe("staking_program", () => {
  before("derive PDAs", async () => {
    [mintPda] = PublicKey.findProgramAddressSync(
      [LIQUIDITY_POOL],
      program.programId
    );

    [poolPda] = PublicKey.findProgramAddressSync(
      [LIQUIDITY_POOL],
      program.programId
    );
  });
});
