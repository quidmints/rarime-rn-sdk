import { Buffer } from "buffer";
import * as asn1js from "asn1js";
import { Poseidon } from "@iden3/js-crypto";
import { HashAlgorithm } from "./helpers/HashAlgorithm";
import { Sod } from "./utils";
import { DG1, DG15, SOD } from "@li0ard/tsemrtd";
import { CertificateSet } from "@peculiar/asn1-cms";
import { type ProposalInfo } from "./types";
import { MRZ_ZERO_DATE } from "./Freedomtool";

/** ICAO 9303 MRZ lengths, all lines concatenated - what DG1.load returns. */
const TD1_MRZ_LENGTH = 90; // 3 x 30, ID cards
const TD3_MRZ_LENGTH = 88; // 2 x 44, passports

export interface MRZData {
  documentType: string;
  issuingCountry: string;
  documentNumber: string;
  birthDate: string;
  sex: string;
  expiryDate: string;
  lastName: string;
  firstName: string;
}

export type ActiveAuthKey =
  | { type: "Rsa"; modulus: bigint; exponent: bigint }
  | { type: "Ecdsa"; keyBytes: Uint8Array };

export enum DocumentStatus {
  NotRegistered = "NOT_REGISTERED",
  RegisteredWithThisPk = "REGISTERED_WITH_THIS_PK",
  RegisteredWithOtherPk = "REGISTERED_WITH_OTHER_PK",
}

export interface RarimePassportProps {
  dataGroup1: Uint8Array;
  sod: Uint8Array;
  dataGroup15?: Uint8Array;
  aaSignature?: Uint8Array;
  aaChallenge?: Uint8Array;
}

export interface VotingCriteria {
  citizenshipWhitelist: string[];
  sex: string;
  birthDateLowerbound: string;
  birthDateUpperbound: string;
  expirationDateLowerbound: string;
}

export class RarimePassport {
  public dataGroup1: Uint8Array;
  public dataGroup15?: Uint8Array;
  public aaSignature?: Uint8Array;
  public aaChallenge?: Uint8Array;
  public sod: Uint8Array;

  constructor(props: RarimePassportProps) {
    this.dataGroup1 = props.dataGroup1;
    this.sod = props.sod;
    this.dataGroup15 = props.dataGroup15;
    this.aaSignature = props.aaSignature;
    this.aaChallenge = props.aaChallenge;
  }

  public getPassportKey(): bigint {
    if (this.dataGroup15) {
      const key = this.parseDg15Pubkey();

      if (key.type === "Ecdsa") {
        return this.extractEcdsaPassportKey(key.keyBytes);
      } else {
        return this.extractRsaPassportKey(key.modulus, key.exponent);
      }
    }

    return this.getPassportHash();
  }

  public getPassportHash(): bigint {
    const signedAttributes = this.extractSignedAttributes();

    let hashBlock = HashAlgorithm.fromOID(this.getSignatureAlgorithm());

    let hashBytes = hashBlock.getHashFixed32(signedAttributes);

    let out = 0n;
    let acc = 0n;
    let accBits = 0;

    // Bits 0..251 are read, so byteIndex reaches 31 - the loop REQUIRES at least 32 bytes.
    // Asserting once here is what makes every hashBytes[byteIndex] below in-bounds by
    // construction, rather than silently reading undefined off the end of a short hash.
    if (hashBytes.length < 32) {
      throw new Error(`Expected a >=32-byte hash, got ${hashBytes.length}`);
    }

    for (let i = 251; i >= 0; i--) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8);
      const bit = (BigInt(hashBytes[byteIndex]!) >> BigInt(bitIndex)) & 1n;

      // acc = (acc << 1) | bit
      acc = (acc << 1n) | bit;
      accBits += 1;

      if (accBits === 64) {
        out = (out << 64n) | acc;
        acc = 0n;
        accBits = 0;
      }
    }

    if (accBits > 0) {
      out = (out << BigInt(accBits)) | acc;
    }

    return Poseidon.hash([out]);
  }

  public extractSignedAttributes(): Uint8Array {
    const buffer = this.sod;
    const sod = new Sod(buffer);
    const signedAttributes = sod.signedAttributes;
    return signedAttributes;
  }

  public extractDGHashAlgo(): string {
    const buffer = Buffer.from(this.sod); // Use tsmrtd's SOD parser
    const sod = SOD.load(buffer);
    return sod.ldsObject.algorithm.algorithm;
  }

  public getSignatureAlgorithm(): string {
    const buffer = Buffer.from(this.sod);
    const sod = SOD.load(buffer);

    const firstSignature = sod.signatures[0];
    if (!firstSignature) {
      throw new Error('SOD contains no signatures');
    }

    const signatureAlgorithmOID = firstSignature.signatureAlgorithm.algorithm;

    if (!signatureAlgorithmOID.startsWith("1.2.840.")) {
      throw new Error("Signature algorithm OID does not start with 1.2.840.");
    }

    return signatureAlgorithmOID;
  }

  public extractEncapsulatedContent(): Uint8Array {
    const buffer = this.sod;
    const sod = new Sod(buffer);
    const encapsulatedContent = sod.encapsulatedContent;
    return encapsulatedContent;
  }

  public extractSignature(): Uint8Array {
    const buffer = this.sod;
    const sod = new Sod(buffer);
    const signature = sod.signature;
    return signature;
  }

  /**
   * Parse DG1's MRZ.
   *
   * DISPATCHES ON LENGTH. This previously applied TD1 (ID card) offsets unconditionally with no
   * length check, so a TD3 PASSPORT - the primary document this SDK exists for - silently produced
   * a wrong document number, birth date, expiry and name. No error and no warning: the identity
   * commitment would simply be built from the wrong fields.
   *
   * `DG1.load` returns the RAW MRZ ASCII straight out of the DG1 TLV (it does no normalising or
   * reordering), so these are the ICAO 9303 layouts as printed on the document:
   *   TD1, ID cards   3 lines x 30 = 90 chars
   *   TD3, passports  2 lines x 44 = 88 chars
   * Anything else is rejected rather than guessed at.
   *
   * Both branches are verified against the ICAO 9303 published specimens.
   */
  public getMRZData(): MRZData {
    const mrz = DG1.load(this.dataGroup1);

    if (mrz.length === TD1_MRZ_LENGTH) return RarimePassport.parseTd1(mrz);
    if (mrz.length === TD3_MRZ_LENGTH) return RarimePassport.parseTd3(mrz);

    throw new Error(
      `Unrecognised MRZ length ${mrz.length}: expected ${TD1_MRZ_LENGTH} (TD1, ID card) ` +
        `or ${TD3_MRZ_LENGTH} (TD3, passport)`,
    );
  }

  /**
   * TD1 - 3 lines of 30, concatenated. Offsets unchanged from the original implementation, which
   * was CORRECT; only the worked example in its comment was wrong, and that is what made the
   * defect hard to see. Verified against the ICAO specimen:
   *
   *   I<UTOD231458907<<<<<<<<<<<<<<<
   *   7408122F1204159UTO<<<<<<<<<<<6
   *   ERIKSSON<<ANNA<MARIA<<<<<<<<<<
   *
   * -> D23145890 / 740812 / F / 120415 / ERIKSSON, ANNA MARIA
   */
  private static parseTd1(mrz: string): MRZData {
    const namesPart = mrz.slice(60);
    // split by '<<' like in Rust .split("<<")
    const [firstName = "", lastName = ""] = namesPart.split("<<");

    return {
      documentType: mrz.slice(0, 2),
      issuingCountry: mrz.slice(2, 5),
      documentNumber: mrz.slice(5, 14),
      birthDate: mrz.slice(30, 36),
      sex: mrz.charAt(37),
      expiryDate: mrz.slice(38, 44),
      lastName: firstName,
      firstName: lastName,
    };
  }

  /**
   * TD3 - 2 lines of 44, concatenated. The NAME is on line 1 and the number/dates on line 2, the
   * exact inverse of TD1 - which is why running a passport through the TD1 offsets yielded
   * plausible-looking nonsense instead of an obvious failure. Verified against the ICAO specimen:
   *
   *   P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
   *   L898902C36UTO7408122F1204159ZE184226B<<<<<10
   *
   * -> L898902C3 / 740812 / F / 120415 / ERIKSSON, ANNA MARIA
   */
  private static parseTd3(mrz: string): MRZData {
    const namesPart = mrz.slice(5, 44);
    const [firstName = "", lastName = ""] = namesPart.split("<<");

    return {
      documentType: mrz.slice(0, 2),
      issuingCountry: mrz.slice(2, 5),
      documentNumber: mrz.slice(44, 53),
      birthDate: mrz.slice(57, 63),
      sex: mrz.charAt(64),
      expiryDate: mrz.slice(65, 71),
      lastName: firstName,
      firstName: lastName,
    };
  }

  public getCertificate(): CertificateSet {
    const buffer = Buffer.from(this.sod);
    const sod = SOD.load(buffer);
    const certificates = sod.certificates;
    return certificates;
  }

  public verifyPassport(proposalInfo: ProposalInfo) {
    const mrz = this.getMRZData();

    if (
      proposalInfo.criteria.citizenshipWhitelist.length &&
      !proposalInfo.criteria.citizenshipWhitelist.includes(
        BigInt("0x" + Buffer.from(mrz.issuingCountry).toString("hex"))
      )
    ) {
      throw new Error("Citizen is not in whitelist");
    }

    if (
      proposalInfo.criteria.sex !== 0n &&
      proposalInfo.criteria.sex !== BigInt(mrz.sex)
    ) {
      throw new Error(
        `Sex mismatch, expected ${proposalInfo.criteria.sex}, received ${BigInt(
          mrz.sex
        )}`
      );
    }

    if (
      proposalInfo.criteria.birthDateLowerbound !== MRZ_ZERO_DATE &&
      proposalInfo.criteria.birthDateLowerbound > BigInt(mrz.birthDate)
    ) {
      throw new Error("Birth date is lower than lowerbound");
    }

    if (
      proposalInfo.criteria.birthDateUpperbound !== MRZ_ZERO_DATE &&
      proposalInfo.criteria.birthDateUpperbound < BigInt(mrz.birthDate)
    ) {
      throw new Error("Birth date is higher than upperbound");
    }

    if (
      proposalInfo.criteria.expirationDateLowerbound !== MRZ_ZERO_DATE &&
      proposalInfo.criteria.expirationDateLowerbound >
        BigInt("0x" + Buffer.from(mrz.expiryDate).toString("hex"))
    ) {
      throw new Error("Expiration date is lower than lowerbound");
    }
  }

  private extractEcdsaPassportKey(keyBytes: Uint8Array): bigint {
    if (keyBytes.length !== 65 || keyBytes[0] !== 0x04) {
      throw new Error("UnsupportedPassportKey: Invalid ECDSA key format");
    }

    const xBytes = keyBytes.slice(1, 33);
    const yBytes = keyBytes.slice(33, 65);

    const xHex = Array.from(xBytes, (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    const yHex = Array.from(yBytes, (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");

    const x = BigInt("0x" + xHex);
    const y = BigInt("0x" + yHex);

    // 2^248
    const modulus = 1n << 248n;

    const xMod = x % modulus;
    const yMod = y % modulus;

    return Poseidon.hash([xMod, yMod]);
  }

  private extractRsaPassportKey(modulus: bigint, exponent: bigint): bigint {
    const bitLen = modulus.toString(2).length;
    const requiredBits = 200 * 4 + 224; // 1024

    if (bitLen < requiredBits) {
      throw new Error("UnsupportedPassportKey: Modulus too short");
    }

    const shift = BigInt(bitLen - requiredBits);
    let topBits = modulus >> shift;

    const chunkSizes = [224, 200, 200, 200, 200];
    const chunks: bigint[] = [];

    for (const size of chunkSizes) {
      const mask = (1n << BigInt(size)) - 1n;
      const chunk = topBits & mask;
      chunks.push(chunk);

      topBits >>= BigInt(size);
    }

    chunks.reverse();

    return Poseidon.hash(chunks);
  }

  private parseDg15Pubkey(): ActiveAuthKey {
    if (!this.dataGroup15) {
      throw new Error("DG15 data is not provided");
    }

    // DG15 contains SubjectPublicKeyInfo (SPKI)
    const spki = DG15.load(Buffer.from(this.dataGroup15));
    const algorithmOid = spki.algorithm.algorithm; // OID string

    // BIT STRING in SPKI: first octet is 'unused bits' count (usually 0)
    let spkBytes = new Uint8Array(spki.subjectPublicKey);
    if (spkBytes.length > 0 && spkBytes[0] === 0x00) {
      spkBytes = spkBytes.slice(1);
    }

    // RSA public key
    if (algorithmOid === "1.2.840.113549.1.1.1") {
      const der = spkBytes.buffer.slice(
        spkBytes.byteOffset,
        spkBytes.byteOffset + spkBytes.byteLength
      );
      const asn = asn1js.fromBER(der);
      if (asn.offset === -1 || !(asn.result instanceof asn1js.Sequence)) {
        throw new Error("Failed to parse RSA public key from DG15");
      }

      const seq = asn.result as asn1js.Sequence;
      const values = (seq.valueBlock as any).value as any[];
      if (!values || values.length < 2) {
        throw new Error("Invalid RSA public key structure");
      }

      const modulusBlock = values[0] as asn1js.Integer;
      const exponentBlock = values[1] as asn1js.Integer;

      const modBuf = Buffer.from(
        (modulusBlock.valueBlock as any).valueHex as ArrayBuffer
      );
      const expBuf = Buffer.from(
        (exponentBlock.valueBlock as any).valueHex as ArrayBuffer
      );

      const modulus = BigInt("0x" + modBuf.toString("hex"));
      const exponent = BigInt("0x" + expBuf.toString("hex"));

      return { type: "Rsa", modulus, exponent };
    }

    // EC public key (uncompressed EC point)
    if (algorithmOid === "1.2.840.10045.2.1") {
      return { type: "Ecdsa", keyBytes: spkBytes };
    }

    throw new Error(`Unsupported public key algorithm OID: ${algorithmOid}`);
  }
}
