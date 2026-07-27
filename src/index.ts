export * from "./Rarime";
export * from "./RarimeUtils";
export * from "./RarimePassport";
export * from "./Freedomtool";
export type { QueryProofParams } from "./types";

// Broadened 2026-07-27. These were always part of the package's real surface - consumers need the
// Noir prover bindings, the hash/signature helpers, the ethers contract typings and the byte utils
// to use anything above - but none were re-exported, so a consumer's only options were deep paths
// into build/ or vendoring a copy of src/. quidmints/ibiza took the second and it drifted.
export * from "./RnNoirModule";
export * from "./helpers/HashAlgorithm";
export * from "./helpers/SignatureAlgorithm";
export * from "./helpers/contracts";
export * from "./utils";
export * from "./types/contracts";
