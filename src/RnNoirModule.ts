import {Directory, File, Paths} from 'expo-file-system';
import {default as NoirModule} from './src/NoirModule';

export type NoirZKProof = {
    proof: string;
    pub_signals: string[];
};

export class NoirCircuitParams {
    // expo-file-system 57's File/Directory API REPLACED the old string-path API
    // (documentDirectory / getInfoAsync / createDownloadResumable / readAsStringAsync /
    // makeDirectoryAsync) entirely - those exports do not exist in 57. package.json has declared
    // `expo-file-system: ~57.0.1` since the dependency bump, so the previous string-path
    // implementation in this file could not run against its own declared dependency: any consumer
    // on 57 hit `undefined is not a function` the first time it touched the trusted setup.
    // Migrated 2026-07-27 from the downstream copy in quidmints/ibiza's identity-wallet, which had
    // already done this work.
    //
    // The migration also removes a latent path bug the string-building carried: TrustedSetupFileName
    // was `${documentDirectory}/noir/...` while downloadTrustedSetup wrote to
    // `${documentDirectory}noir` - documentDirectory already ends in a slash, so the reader and the
    // writer were not guaranteed to agree on a path. `new File(directory, name)` cannot express
    // that mismatch.
    //
    // `exists` / `create` are synchronous properties/methods on File/Directory instances, not async
    // calls. getTrustedSetupUri/getByteCodeUri stay `async` so existing call sites keep working.
    static readonly NoirDir = new Directory(Paths.document, 'noir');

    // Shared by BOTH provePlonk and proveHonk (proveHonk calls the same getTrustedSetupUri()).
    // Barretenberg's structured reference string is a universal, curve-level KZG setup shared
    // across its proof systems rather than Plonk-specific, so this should be correct for Honk too
    // despite the filename. Not empirically confirmed - if Honk proving fails against this file, a
    // Honk-specific SRS download is the first thing to check.
    static readonly TrustedSetupFile = new File(NoirCircuitParams.NoirDir, 'ultraPlonkTrustedSetup.dat');

    constructor(
        public name: string,
        public byteCodeUri: string,
        public pub_signals_count: number,
    ) {
    }

    static fromName(circuitName: string): NoirCircuitParams {
        const found = supportedNoirCircuits.find((el) => el.name === circuitName);

        if (!found) {
            throw new Error(`Noir Circuit with name ${circuitName} not found`);
        }

        return found;
    }

    static async getTrustedSetupUri() {
        if (!NoirCircuitParams.TrustedSetupFile.exists) {
            return null;
        }

        return NoirCircuitParams.TrustedSetupFile.uri;
    }

    static async downloadTrustedSetup(opts?: {
        onDownloadingProgress?: (p: {bytesWritten: number; totalBytes: number}) => void;
    }) {
        if (!NoirCircuitParams.NoirDir.exists) {
            NoirCircuitParams.NoirDir.create({intermediates: true});
        }

        const url =
            'https://storage.googleapis.com/rarimo-store/trusted-setups/ultraPlonkTrustedSetup.dat';

        if (!(await NoirCircuitParams.getTrustedSetupUri())) {
            const task = File.createDownloadTask(url, NoirCircuitParams.TrustedSetupFile, {
                onProgress: opts?.onDownloadingProgress,
            });
            await task.downloadAsync();
        }

        const uri = await NoirCircuitParams.getTrustedSetupUri();

        if (!uri) {
            throw new Error('Failed to download trusted setup');
        }

        return uri;
    }

    public static formatArray(
        arr: string[] = [],
        useHex: boolean,
    ): string[] {
        const ensureHexPrefix = (val: string): string => {
            return val.startsWith('0x') ? val : `0x${val}`;
        };

        return arr.map(item => {
            const bigIntValue = BigInt(item);

            if (useHex) {
                return ensureHexPrefix(bigIntValue.toString(16));
            } else {
                return bigIntValue.toString(10);
            }
        })
    }

    static async getByteCodeUri(file: File) {
        if (!file.exists) {
            return null;
        }

        return file.uri;
    }

    async downloadByteCode(opts?: {
        onDownloadingProgress?: (p: {bytesWritten: number; totalBytes: number}) => void;
    }): Promise<string> {
        if (!NoirCircuitParams.NoirDir.exists) {
            NoirCircuitParams.NoirDir.create({intermediates: true});
        }

        const file = new File(NoirCircuitParams.NoirDir, `${this.name}-bytecode.json`);

        if (!(await NoirCircuitParams.getByteCodeUri(file))) {
            const task = File.createDownloadTask(this.byteCodeUri, file, {
                onProgress: opts?.onDownloadingProgress,
            });
            await task.downloadAsync();
        }

        const uri = await NoirCircuitParams.getByteCodeUri(file);

        if (!uri) {
            throw new Error(
                `Failed to download bytecode for noir circuit ${this.name}`,
            );
        }

        const byteCode = await file.text();

        if (!byteCode) {
            throw new Error(`Failed to read bytecode for noir circuit ${this.name}`);
        }

        return byteCode;
    }

    async prove(inputs: string, byteCodeString: string): Promise<NoirZKProof> {
        const trustedSetupUri = await NoirCircuitParams.getTrustedSetupUri();

        if (!trustedSetupUri) {
            throw new Error('Trusted setup not found. Please download it first.');
        }

        const proof: string = await NoirModule.provePlonk(
            trustedSetupUri,
            inputs,
            byteCodeString,
        );

        if (!proof) {
            throw new Error(`Failed to generate proof for noir circuit ${this.name}`);
        }

        const pubSignalDataLength = 64; // hex

        const pubSignals: string[] = [];
        for (let i = 0; i < this.pub_signals_count; i++) {
            const start = i * pubSignalDataLength;
            const end = start + pubSignalDataLength;
            pubSignals.push(proof.substring(start, end));
        }

        const actualProof = proof.substring(
            pubSignalDataLength * this.pub_signals_count,
        );

        return {
            pub_signals: pubSignals,
            proof: actualProof,
        };
    }

    /**
     * Generates an UltraHonk proof (see RnNoirModule.kt's proveHonk for the native side - the same
     * already-vendored native module `provePlonk` uses, just a different `proofType`).
     *
     * ANDROID ONLY. android/.../RnNoirModule.kt implements AsyncFunction("proveHonk"), but
     * ios/RnNoirModule.swift exposes only provePlonk and hardcodes proof_type: "plonk", so on iOS
     * this rejects with an unknown-native-function error. Exposing Swoirenberg's Honk entry point
     * on the Swift side is what would lift that.
     *
     * Deliberately does NOT slice the raw output into {proof, pub_signals} the way `prove()` does
     * for Plonk: that slicing assumes public signals are serialized as a fixed-width
     * (pub_signals_count * 64 hex chars) prefix before the proof bytes, a Plonk-specific convention
     * of this binding, and whether Honk's raw output uses the SAME framing has not been empirically
     * confirmed. Returning the raw proof avoids guessing at a slicing convention that may be wrong;
     * the caller already knows its own public inputs, having built them as circuit inputs before
     * proving.
     */
    async proveHonk(inputs: string, byteCodeString: string): Promise<string> {
        const trustedSetupUri = await NoirCircuitParams.getTrustedSetupUri();

        if (!trustedSetupUri) {
            throw new Error('Trusted setup not found. Please download it first.');
        }

        const proof: string = await NoirModule.proveHonk(
            trustedSetupUri,
            inputs,
            byteCodeString,
        );

        if (!proof) {
            throw new Error(`Failed to generate Honk proof for noir circuit ${this.name}`);
        }

        return proof;
    }
}

const supportedNoirCircuits: NoirCircuitParams[] = [
    new NoirCircuitParams(
        'query_identity',
        'https://storage.googleapis.com/rarimo-store/passport-zk-circuits-noir/id_cards/query_identity_td1.json',
        24,
    ),
    new NoirCircuitParams(
        'register_light_160',
        'https://storage.googleapis.com/rarimo-store/passport-zk-circuits-noir/id_cards/register_lite_160.json',
        3,
    ),
    new NoirCircuitParams(
        'register_light_224',
        'https://storage.googleapis.com/rarimo-store/passport-zk-circuits-noir/id_cards/register_lite_224.json',
        3,
    ),
    new NoirCircuitParams(
        'register_light_256',
        'https://storage.googleapis.com/rarimo-store/passport-zk-circuits-noir/id_cards/register_lite_256.json',
        3,
    ),
    new NoirCircuitParams(
        'register_light_384',
        'https://storage.googleapis.com/rarimo-store/passport-zk-circuits-noir/id_cards/register_lite_384.json',
        3,
    ),
    new NoirCircuitParams(
        'register_light_512',
        'https://storage.googleapis.com/rarimo-store/passport-zk-circuits-noir/id_cards/register_lite_512.json',
        3,
    ),
]

export default NoirModule;
