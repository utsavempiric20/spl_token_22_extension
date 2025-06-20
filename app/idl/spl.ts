/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/spl.json`.
 */
export type Spl = {
  "address": "C1QrbSXfsm94jPzoucAa8ZX3EdxTUeDvJP9mV8NtZxx",
  "metadata": {
    "name": "spl",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addLiquidityAmm",
      "discriminator": [
        215,
        242,
        168,
        230,
        90,
        23,
        220,
        129
      ],
      "accounts": [
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAMint"
        },
        {
          "name": "tokenBMint"
        },
        {
          "name": "vaultA",
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "vaultB",
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "userTokenAAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "depositor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "pool.token_a_mint",
                "account": "liquidityPoolAmm"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userTokenBAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "depositor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "pool.token_b_mint",
                "account": "liquidityPoolAmm"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "lpMint",
          "writable": true
        },
        {
          "name": "userLpMintAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "depositor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "lpMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "amountADesired",
          "type": "u64"
        },
        {
          "name": "maxAmountB",
          "type": "u64"
        }
      ]
    },
    {
      "name": "burnTokens",
      "discriminator": [
        76,
        15,
        51,
        254,
        229,
        215,
        121,
        66
      ],
      "accounts": [
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "from",
          "docs": [
            "The token account to burn from (must have sufficient balance)"
          ],
          "writable": true
        },
        {
          "name": "authority",
          "docs": [
            "Must match the mint's authority (or the account's delegate)"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "checkMintExtensionsConstraints",
      "discriminator": [
        116,
        106,
        124,
        163,
        185,
        116,
        224,
        224
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        }
      ],
      "args": []
    },
    {
      "name": "claimRewardsStake",
      "discriminator": [
        98,
        55,
        228,
        16,
        71,
        157,
        66,
        97
      ],
      "accounts": [
        {
          "name": "staker",
          "writable": true,
          "signer": true,
          "relations": [
            "userStake"
          ]
        },
        {
          "name": "stakeMint"
        },
        {
          "name": "rewardMint"
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "userStake",
          "docs": [
            "The user's pdas where we track their stake data"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "rewardVault",
          "writable": true
        },
        {
          "name": "userRewardAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "closeTokenAccount",
      "discriminator": [
        132,
        172,
        24,
        60,
        100,
        156,
        135,
        97
      ],
      "accounts": [
        {
          "name": "account",
          "docs": [
            "The token account to close (must be empty)"
          ],
          "writable": true
        },
        {
          "name": "destination",
          "docs": [
            "Destination of the reclaimed SOL"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "docs": [
            "The close-authority of `account`"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "createMintAccount",
      "discriminator": [
        76,
        184,
        50,
        62,
        162,
        141,
        47,
        103
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "receiver"
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "mintTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "receiver"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "extraMetasAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  116,
                  114,
                  97,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  45,
                  109,
                  101,
                  116,
                  97,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "decimals",
          "type": "u8"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    },
    {
      "name": "depositRewardsAdmin",
      "discriminator": [
        91,
        3,
        65,
        103,
        90,
        165,
        21,
        199
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "rewardVault",
          "writable": true
        },
        {
          "name": "rewardMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "emergencyWithdrawStake",
      "discriminator": [
        41,
        32,
        19,
        239,
        45,
        11,
        201,
        237
      ],
      "accounts": [
        {
          "name": "staker",
          "writable": true,
          "signer": true,
          "relations": [
            "userStake"
          ]
        },
        {
          "name": "stakeMint"
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "writable": true
        },
        {
          "name": "userStakeAccount",
          "writable": true
        },
        {
          "name": "userStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "freezeTokenAccount",
      "discriminator": [
        138,
        168,
        178,
        109,
        205,
        224,
        209,
        93
      ],
      "accounts": [
        {
          "name": "account",
          "docs": [
            "The token account to freeze (must be initialized)"
          ],
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "The mint under which this account exists"
          ]
        },
        {
          "name": "freezeAuthority",
          "docs": [
            "Must match the mint's freeze_authority"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "initializeLiquidityPoolAmm",
      "discriminator": [
        98,
        116,
        99,
        14,
        47,
        245,
        129,
        17
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAMint"
        },
        {
          "name": "tokenBMint"
        },
        {
          "name": "vaultTokenA",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "tokenAMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vaultTokenB",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "tokenBMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  113,
                  117,
                  105,
                  100,
                  105,
                  116,
                  121,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "tokenAMint"
              },
              {
                "kind": "account",
                "path": "tokenBMint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "lpMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "poolName",
          "type": "string"
        },
        {
          "name": "poolFeeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "initializePoolStake",
      "discriminator": [
        32,
        30,
        163,
        44,
        201,
        173,
        205,
        208
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "stakeMint"
        },
        {
          "name": "rewardMint",
          "writable": true
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "docs": [
            "The associated token account owned by the pool PDA to hold stake tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "rewardVault",
          "docs": [
            "The associated token account owned by the pool PDA to hold reward tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "rewardMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "rewardRatePerSecond",
          "type": "u128"
        }
      ]
    },
    {
      "name": "mintTokens",
      "discriminator": [
        59,
        132,
        24,
        246,
        122,
        39,
        8,
        243
      ],
      "accounts": [
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "to",
          "docs": [
            "The token account to receive newly minted tokens"
          ],
          "writable": true
        },
        {
          "name": "authority",
          "docs": [
            "Must match the mint's authority"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "pausePoolAdmin",
      "discriminator": [
        160,
        149,
        182,
        171,
        253,
        140,
        154,
        152
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "quoteAmm",
      "discriminator": [
        3,
        187,
        210,
        7,
        80,
        12,
        58,
        101
      ],
      "accounts": [
        {
          "name": "pool"
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u128"
        }
      ],
      "returns": "u128"
    },
    {
      "name": "removeLiquidityAmm",
      "discriminator": [
        47,
        218,
        52,
        11,
        5,
        49,
        168,
        253
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultA",
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "vaultB",
          "writable": true,
          "relations": [
            "pool"
          ]
        },
        {
          "name": "tokenAMint"
        },
        {
          "name": "tokenBMint"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "userTokenAAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "pool.token_a_mint",
                "account": "liquidityPoolAmm"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userTokenBAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "pool.token_b_mint",
                "account": "liquidityPoolAmm"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "lpMint",
          "writable": true
        },
        {
          "name": "userLpMintAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "lpMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "lpAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setRewardRateStake",
      "discriminator": [
        35,
        43,
        178,
        216,
        161,
        19,
        23,
        74
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "The admin of the pool"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "stakeMint"
        }
      ],
      "args": [
        {
          "name": "newRate",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stake",
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "staker",
          "docs": [
            "The user who wants to stake"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "stakeMint"
        },
        {
          "name": "pool",
          "docs": [
            "The global pool"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "docs": [
            "The vault holding all stake tokens"
          ],
          "writable": true
        },
        {
          "name": "userStakeAccount",
          "docs": [
            "The user's token account holding stake tokens"
          ],
          "writable": true
        },
        {
          "name": "userStake",
          "docs": [
            "The user's pdas where we1000700000000030 track their stake data"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "swapAmm",
      "discriminator": [
        107,
        111,
        184,
        68,
        25,
        94,
        158,
        222
      ],
      "accounts": [
        {
          "name": "swapper",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "vaultIn",
          "writable": true
        },
        {
          "name": "vaultOut",
          "writable": true
        },
        {
          "name": "userIn",
          "writable": true
        },
        {
          "name": "userOut",
          "writable": true
        },
        {
          "name": "tokenAMint",
          "writable": true
        },
        {
          "name": "tokenBMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "minOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "thawTokenAccount",
      "discriminator": [
        199,
        172,
        96,
        93,
        244,
        252,
        137,
        171
      ],
      "accounts": [
        {
          "name": "account",
          "docs": [
            "The token account to thaw"
          ],
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "The same mint used when freezing"
          ]
        },
        {
          "name": "freezeAuthority",
          "docs": [
            "Must match the mint's freeze_authority"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "unpausePoolAdmin",
      "discriminator": [
        254,
        121,
        115,
        18,
        52,
        187,
        147,
        159
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "unstake",
      "discriminator": [
        90,
        95,
        107,
        42,
        205,
        124,
        50,
        225
      ],
      "accounts": [
        {
          "name": "staker",
          "writable": true,
          "signer": true,
          "relations": [
            "userStake"
          ]
        },
        {
          "name": "stakeMint"
        },
        {
          "name": "rewardMint"
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "stakeMint"
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "docs": [
            "The vault holding all stake tokens"
          ],
          "writable": true
        },
        {
          "name": "userStakeAccount",
          "docs": [
            "The user's token account holding stake tokens"
          ],
          "writable": true
        },
        {
          "name": "userStake",
          "docs": [
            "The user's pdas where we track their stake data"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "rewardVault",
          "writable": true
        },
        {
          "name": "userRewardAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "liquidityPoolAmm",
      "discriminator": [
        98,
        91,
        145,
        63,
        149,
        64,
        46,
        254
      ]
    },
    {
      "name": "stakingPool",
      "discriminator": [
        203,
        19,
        214,
        220,
        220,
        154,
        24,
        102
      ]
    },
    {
      "name": "userStake",
      "discriminator": [
        102,
        53,
        163,
        107,
        9,
        138,
        87,
        153
      ]
    }
  ],
  "events": [
    {
      "name": "emergencyWithdrawEvent",
      "discriminator": [
        177,
        61,
        254,
        20,
        145,
        18,
        188,
        237
      ]
    },
    {
      "name": "liquidityAdded",
      "discriminator": [
        154,
        26,
        221,
        108,
        238,
        64,
        217,
        161
      ]
    },
    {
      "name": "liquidityRemoved",
      "discriminator": [
        225,
        105,
        216,
        39,
        124,
        116,
        169,
        189
      ]
    },
    {
      "name": "poolCreated",
      "discriminator": [
        202,
        44,
        41,
        88,
        104,
        220,
        157,
        82
      ]
    },
    {
      "name": "poolPaused",
      "discriminator": [
        228,
        218,
        62,
        53,
        29,
        211,
        159,
        236
      ]
    },
    {
      "name": "poolUnpaused",
      "discriminator": [
        193,
        202,
        163,
        157,
        221,
        87,
        172,
        100
      ]
    },
    {
      "name": "rewardPaid",
      "discriminator": [
        132,
        160,
        190,
        117,
        215,
        177,
        19,
        95
      ]
    },
    {
      "name": "stakeEvent",
      "discriminator": [
        226,
        134,
        188,
        173,
        19,
        33,
        75,
        175
      ]
    },
    {
      "name": "swapExecuted",
      "discriminator": [
        150,
        166,
        26,
        225,
        28,
        89,
        38,
        79
      ]
    },
    {
      "name": "unstakeEvent",
      "discriminator": [
        162,
        104,
        137,
        228,
        81,
        3,
        79,
        197
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientStaked",
      "msg": "Not enough staked balance."
    },
    {
      "code": 6001,
      "name": "rewardOverflow",
      "msg": "Pending rewards exceed maximum payout limit."
    },
    {
      "code": 6002,
      "name": "poolPaused",
      "msg": "Pool is currently paused."
    },
    {
      "code": 6003,
      "name": "lockupNotExpired",
      "msg": "Cannot unstake before lock-up expires."
    }
  ],
  "types": [
    {
      "name": "emergencyWithdrawEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "staker",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "u64"
          },
          {
            "name": "slash",
            "type": "u64"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "liquidityAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amountA",
            "type": "u64"
          },
          {
            "name": "amountB",
            "type": "u64"
          },
          {
            "name": "lpMinted",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "liquidityPoolAmm",
      "docs": [
        "AMM"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poolName",
            "docs": [
              "Name of the pool like SOL/USDC"
            ],
            "type": "string"
          },
          {
            "name": "tokenAMint",
            "docs": [
              "Name of the token0 token like SOL"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenBMint",
            "docs": [
              "Name of the token1 token like USDC"
            ],
            "type": "pubkey"
          },
          {
            "name": "vaultA",
            "docs": [
              "it store the token0 tokens e.g SOL"
            ],
            "type": "pubkey"
          },
          {
            "name": "vaultB",
            "docs": [
              "it store the token1 tokens e.g USDC"
            ],
            "type": "pubkey"
          },
          {
            "name": "reserveA",
            "docs": [
              "it reserve the total tokens of token0 for swaps"
            ],
            "type": "u128"
          },
          {
            "name": "reserveB",
            "docs": [
              "it reserve the total tokens of token1 for swaps"
            ],
            "type": "u128"
          },
          {
            "name": "totalLpSupply",
            "docs": [
              "it's total supply of the mint tokens which provide to the LPs"
            ],
            "type": "u128"
          },
          {
            "name": "feeBps",
            "docs": [
              "Fees for the swaps"
            ],
            "type": "u16"
          },
          {
            "name": "bump",
            "docs": [
              "Initali Pool bump which represents between 0-255"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "liquidityRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amountA",
            "type": "u64"
          },
          {
            "name": "amountB",
            "type": "u64"
          },
          {
            "name": "lpBurned",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "poolCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "mintA",
            "type": "pubkey"
          },
          {
            "name": "mintB",
            "type": "pubkey"
          },
          {
            "name": "feeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "poolPaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "poolUnpaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "rewardPaid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "staker",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stakeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "staker",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stakingPool",
      "docs": [
        "staking"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stakeMint",
            "docs": [
              "The mint of the token users stake."
            ],
            "type": "pubkey"
          },
          {
            "name": "rewardMint",
            "docs": [
              "The mint of the token used for rewards."
            ],
            "type": "pubkey"
          },
          {
            "name": "stakeVault",
            "docs": [
              "Vault that holds all deposited stake tokens."
            ],
            "type": "pubkey"
          },
          {
            "name": "rewardVault",
            "docs": [
              "Vault that holds all reward tokens (funded in advance by admin)."
            ],
            "type": "pubkey"
          },
          {
            "name": "admin",
            "docs": [
              "Admin/owner of this pool (can change reward rate and top up rewards)."
            ],
            "type": "pubkey"
          },
          {
            "name": "totalStaked",
            "docs": [
              "Total amount of stake tokens currently staked."
            ],
            "type": "u128"
          },
          {
            "name": "rewardRatePerDay",
            "docs": [
              "Reward rate per second, scaled by 1e12 (to allow fractional).",
              "E.g. if you want to pay out 1 token per second, store 1_000_000_000_000."
            ],
            "type": "u128"
          },
          {
            "name": "rewardPerTokenStored",
            "docs": [
              "Accumulated reward per staked token, scaled by 1e12.",
              "Updated on each stake/unstake/claim."
            ],
            "type": "u128"
          },
          {
            "name": "lastUpdateTime",
            "docs": [
              "Last timestamp (in Unix seconds) when we updated `reward_per_token_stored`."
            ],
            "type": "i64"
          },
          {
            "name": "paused",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "swapExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "trader",
            "type": "pubkey"
          },
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "amountOut",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "unstakeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "staker",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "time",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userStake",
      "docs": [
        "Each user’s individual stake account"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "docs": [
              "Which staking pool this belongs to."
            ],
            "type": "pubkey"
          },
          {
            "name": "staker",
            "docs": [
              "The user who staked."
            ],
            "type": "pubkey"
          },
          {
            "name": "amountStaked",
            "docs": [
              "How many stake tokens this user has deposited."
            ],
            "type": "u128"
          },
          {
            "name": "rewardDebt",
            "docs": [
              "The user’s “reward debt” = `amount_staked * reward_per_token_stored` at the last update.",
              "When we accrue new rewards, we compare current vs. this to figure out “owed” rewards."
            ],
            "type": "u128"
          },
          {
            "name": "pendingRewards",
            "docs": [
              "Accumulated but unclaimed rewards."
            ],
            "type": "u128"
          },
          {
            "name": "lastStakeTime",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
