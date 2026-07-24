# Rarime React Native SDK

React Native integration SDK for the **Rarimo protocol**, enabling seamless ZK identity verification and passport
interaction
on **iOS and Android**.

Powered by the **Expo Modules**.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/rarimo/rarime-rn-sdk)

---

## ✨ Features

- **Cross-Platform Support** – Works natively on both iOS and Android via Expo Modules.
- **Zero-Knowledge Proofs** – Efficient client-side generation of ZK proofs (Noir) for identity verification.
- **Passport Interaction** – Tools for handling and verifying passport data securely.
- **FreedomTool Integration** - Tools for allowing users to submit proposals using FreedomTool.

---

## 📦 Installation

### Prerequisites

This library includes native code. You generally need to use a Development Build if you are using Expo.

> **Note:** Native code is not used by Expo Web or by iOS/Android simulators that run JS-only. Native modules only apply on real Android and iOS devices. If you plan to test on web or JS-only simulators, native libs will be ignored.

### 1. Install the package

```bash
npm install @rarimo/rarime-rn-sdk
```

### 2. Install Polyfills

React Native does not include certain Node.js core modules by default. To ensure compatibility with the Rarime SDK, you need to install polyfills for these modules.

#### Install the required polyfill packages

```bash
npm install crypto-browserify readable-stream buffer react-native-get-random-values react-native-url-polyfill
```

#### Import polyfills

Create file polifills.ts and add the following code:

```typescript
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { Buffer } from "buffer";

global.Buffer = Buffer;
```

Import this file at the entry point of your application (e.g. `App.tsx` or `index.ts`):

```typescript
import "./polyfills";
```

#### Add polyfills to your metro.config.js

```javascript
config.resolver.extraNodeModules = {
  crypto: require.resolve("crypto-browserify"),
  stream: require.resolve("readable-stream"),
  buffer: require.resolve("buffer"),
};
```

### 3. Configuration

#### For Managed Expo Projects

You need to add our SDK to the `expo.plugins` array in your `app.json` or `app.config.js` file:

```json
{
  "expo": {
    "plugins": ["@rarimo/rarime-rn-sdk"]
  }
}
```

> **Note**: This step is necessary because the Gradle relies on additional build-time configuration to properly resolve and integrate native Android dependencies.

No extra steps are usually required if you are using the latest Expo SDK. Simply rebuild your development client:

```bash
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

#### For Bare React Native Projects

Ensure you have installed and configured the **expo** package.

**iOS:** Run `pod install` in the `ios` directory:

```bash
cd ios && pod install
```

---

## 🚀 Example Usage

### Initialize the SDK

```typescript
import * from '@rarimo/rarime-rn-sdk';

async () => {
    try {
        /** Generate private key for user */
        const userPrivateKey: string = RarimeUtils.generateBJJPrivateKey();

        /** Setup configuration */
        const rarimeConfiguration: RarimeConfiguration = {
            contractsConfiguration: {
                stateKeeperAddress:
                    '<STATE_KEEPER_CONTRACT_ADDRESS>',
                registerSimpleContractAddress:
                    '<REGISTER_CONTRACT_ADDRESS>',
                poseidonSmtAddress:
                    '<POSEIDON_SMT_ADDRESS>',
            },
            apiConfiguration: {
                jsonRpcEvmUrl: '<JSON_RPC_URL>',
                rarimeApiUrl: '<API_URL>',
            },
            userConfiguration: {
                userPrivateKey,
            },
        };

        /** Setup SDK */
        const rarime = new Rarime(rarimeConfiguration);

        /** Setup passport */
        const passport = new RarimePassport({
                dataGroup1: Uint8Array;
                sod: Uint8Array;
                dataGroup15? : Uint8Array;
                aaSignature? : Uint8Array;
                aaChallenge? : Uint8Array;
            })
        ;

    }
    catch (e) {
        console.error(e);
    }
}
```

### Register identity with SDK

```typescript
async () => {
  try {
    /**
     * Checks the passport registration status.
     *
     * Possible statuses:
     * - NOT_REGISTERED – the document is not registered.
     * - REGISTERED_WITH_THIS_PK – the document is registered with this user's private key.
     * - REGISTERED_WITH_OTHER_PK – the document is registered with a different user's private key.
     */
    const documentStatus: DocumentStatus = await rarime.getDocumentStatus(
      passport
    );

    /** Light registration
     * Returned hash of register transaction from blockchain
     *
     *  Performs a zero-knowledge proof generation.
     *
     * ⚠️ This is a computationally intensive cryptographic operation.
     * Expected execution time: up to ~5 seconds depending on hardware.
     * Memory usage may be significant (hundreds of MB or more).
     */
    const registerTxHash = await rarime.registerIdentity(passport);
  } catch (e) {
    console.error(e);
  }
};
```

### Query Proof Generation Example

```typescript
async () => {
  try {
    /**
     * ---------------------------------------------
     *  Query Proof Parameters
     * ---------------------------------------------
     * Replace placeholder values with real data.
     *
     * ⚠️ IMPORTANT:
     * - All values must be valid BigInt-castable strings.
     * - Supplying invalid values will cause proof generation to fail.
     */
    const queryProofParams: QueryProofParams = {
      eventId: "43580365239758335475",
      eventData:
        "270038666511201875208172000617689023489105079510191335498520083214634616239",
      selector: "0",

      // Timestamp boundaries (Unix time, BigInt format)
      timestampLowerbound: "0",
      timestampUpperbound: "0",

      // Identity count range
      identityCountLowerbound: "0",
      identityCountUpperbound: "0",

      // Birthdate range (BigInt-encoded date)
      birthDateLowerbound: "52983525027888",
      birthDateUpperbound: "52983525027888",

      // Expiration date range
      expirationDateLowerbound: "52983525027888",
      expirationDateUpperbound: "52983525027888",

      // Citizenship bitmask filter (0 = disabled)
      citizenshipMask: "0",
    };

    /**
     * ---------------------------------------------
     *  Generate Query Proof
     * ---------------------------------------------
     * Performs a zero-knowledge proof generation using the
     * provided query parameters and the user passport.
     *
     * ⏱ Execution time:
     *    ~1–5 seconds depending on device performance.
     *
     * 🧠 Resource usage:
     *    This operation is cryptographically heavy and may
     *    consume significant CPU and memory during execution.
     */
    const queryProof = await rarime.generateQueryProof(
      queryProofParams,
      passport
    );
  } catch (e) {
    console.error(e);
  }
};
```

---

## FreedomTool integration

### Setup FreedomTool integration

```typescript
async () => {
  const freedomTool = new FreedomTool({
    contracts: {
      proposalStateAddress: "<PROPOSAL_STATE_CONTRACT_ADDRESS>",
    },
    api: {
      ipfsUrl: "<IPFS_URL>",
      votingRelayerUrl: "<VOTING_RELAYER_URL>",
      votingRpcUrl: "<VOTING_RPC_URL>",
    },
  });
};
```

### Get proposal info example

```typescript
async () => {
  try {
    //proposalId may be parse from QR-code uri
    const proposalInfo = await freedomtool.getProposalInfo(proposalId);
  } catch (e) {
    console.error(e);
  }
};
```

### Verify that an identity is eligible to vote under this proposal

```typescript
async () => {
  try {
    /**
     * Throws an error only when the user is not allowed to vote on this proposal.
     *
     * Checks that the proposal has started and not yet ended,
     * verifies that the user's identity is eligible,
     * and confirms passport verification.
     */
    await freedomtool.verify(proposalInfo, passport, rarime);
  } catch (e) {
    console.error(e);
  }
};
```

### Check if the user has already voted

```typescript
async () => {
  try {
    /**
     * Returns true only if the user has already voted.
     */
    const isVoted = await freedomtool.isAlreadyVoted(proposalInfo, rarime);
  } catch (e) {
    console.error(e);
  }
};
```

### Submitting a vote

```typescript
async () => {
  try {
    /**
     * Array of answer indices selected by the user for the proposal.
     *
     * Each number corresponds to the index of the chosen option
     * in the proposal's list of possible answers.
     */
    const answers: number[] = [0];

    /**
     * ---------------------------------------------
     *  Submitting a vote
     * ---------------------------------------------
     * Generates a zero-knowledge query proof for submitting a proposal.
     *
     * ⏱ Execution time:
     *    ~1–5 seconds depending on device performance.
     *
     * 🧠 Resource usage:
     *    Query-proof generation is cryptographically heavy
     *    and may require noticeable CPU and memory.
     *
     * 🔁 Returns:
     *    Transaction hash of the submitted vote.
     */
    const submitProposalTxHash = await freedomtool.submitProposal({
      answers,
      proposalInfo,
      rarime,
      passport,
    });
  } catch (e) {
    console.error(e);
  }
};
```

---

## ⚙️ Configuration & Constants

We support two chains:

- **MainNet** — for releases and production use
- **TestNet** — for development and testing

> **Note:** You can also use your own addresses and resources.

---

## API Addresses

| Name                 | MainNet Address               | TestNet Address                         |
| -------------------- | ----------------------------- | --------------------------------------- |
| `JSON_RPC_URL`       | `https://l2.rarimo.com`       | `https://rpc.qtestnet.org`              |
| `API_URL`            | `https://api.app.rarime.com`  | `https://api.orgs.app.stage.rarime.com` |
| `IPFS_URL`           | `https://ipfs.rarimo.com`     | `https://ipfs.rarimo.com`               |
| `VOTING_RELAYER_URL` | `https://api.freedomtool.org` | `https://api.stage.freedomtool.org`     |
| `FREEDOMTOOL_URL`    | `https://freedomtool.org`     | `https://stage.voting.freedomtool.org/` |
| `VOTING_RPC_URL`     | `https://l2.rarimo.com`       | `https://rpc.qtestnet.org`              |

---

## Contract Addresses

| Name                              | MainNet Address                              | TestNet Address                              |
| --------------------------------- | -------------------------------------------- | -------------------------------------------- |
| `STATE_KEEPER_CONTRACT_ADDRESS`   | `0x61aa5b68D811884dA4FEC2De4a7AA0464df166E1` | `0x12883d5F530AF7EC2adD7cEC29Cf84215efCf4D8` |
| `REGISTER_CONTRACT_ADDRESS`       | `0x497D6957729d3a39D43843BD27E6cbD12310F273` | `0x1b6ae4b80F0f26DC53731D1d7aA31fc3996B513B` |
| `POSEIDON_SMT_ADDRESS`            | `0x479F84502Db545FA8d2275372E0582425204A879` | `0xb8bAac4C443097d697F87CC35C5d6B06dDe64D60` |
| `PROPOSAL_STATE_CONTRACT_ADDRESS` | `0x9C4b84a940C9D3140a1F40859b3d4367DC8d099a` | `0x4C61d7454653720DAb9e26Ca25dc7B8a5cf7065b` |

---

## 🤝 Contributing

Contributions are very welcome! Please follow the guidelines described in the contributing guide.

1. Fork the repository
2. Create your feature branch:

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. Commit your changes:

   ```bash
   git commit -m "Add some amazing feature"
   ```

4. Push to the branch:

   ```bash
   git push origin feature/amazing-feature
   ```

5. Open a Pull Request

---

## 📝 License

This project is licensed under the **[MIT License](./LICENSE)**.

## 💬 Community

We encourage open collaboration — discussions, suggestions, and feedback are always welcome!  
Join us in improving the React Native and JavaScript/TypeScript ecosystem around the Rarimo protocol.

**Telegram:** [Join Rarimo Community](https://t.me/+pWugh5xgDiE3Y2Jk)
