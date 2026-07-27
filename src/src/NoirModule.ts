import {NativeModule, requireNativeModule} from 'expo';

declare class RnNoirModule extends NativeModule {
  provePlonk: (
      trustedSetupUri: string,
      inputs: string,
      byteCode: string,
  ) => Promise<string>;
  // Same native circuit binding as provePlonk, different proofType ("honk" vs "plonk") - see
  // RnNoirModule.kt's own comment for why no dependency/binary bump was needed for this.
  //
  // ANDROID ONLY. android/.../RnNoirModule.kt:69 implements AsyncFunction("proveHonk"), but
  // ios/RnNoirModule.swift exposes only provePlonk and hardcodes proof_type: "plonk", so on iOS
  // this rejects with an unknown-native-function error. Every Honk circuit in this fusion
  // (withdraw_identity, title_holder) is therefore Android-only until Swoirenberg's Honk entry
  // point is exposed on the Swift side. See TODO.md sec. 2.1a.
  proveHonk: (
      trustedSetupUri: string,
      inputs: string,
      byteCode: string,
  ) => Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<RnNoirModule>('RnNoir');