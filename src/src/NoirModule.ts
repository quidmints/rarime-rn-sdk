import {NativeModule, requireNativeModule} from 'expo';

declare class RnNoirModule extends NativeModule {
  provePlonk: (
      trustedSetupUri: string,
      inputs: string,
      byteCode: string,
  ) => Promise<string>;
  // Same native circuit binding as provePlonk, different proofType ("honk" vs "plonk") - see
  // RnNoirModule.kt's own comment for why no dependency/binary bump was needed for this.
  proveHonk: (
      trustedSetupUri: string,
      inputs: string,
      byteCode: string,
  ) => Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<RnNoirModule>('RnNoir');