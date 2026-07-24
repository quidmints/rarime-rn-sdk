import { PRIVATE_KEY, DG1, SOD, DG15 } from "@env";
import {
  FreedomTool,
  FreedomToolConfiguration,
  QueryProofParams,
  Rarime,
  RarimeConfiguration,
  RarimePassport,
  RarimeUtils,
} from "@rarimo/rarime-rn-sdk";

export async function liteRegistration() {
  const userPrivateKey =
    PRIVATE_KEY && PRIVATE_KEY.length > 0 ? PRIVATE_KEY : "";

  console.log(userPrivateKey);

   const rarimeConfig: RarimeConfiguration = {
    contractsConfiguration: {
      stateKeeperAddress: "0x61aa5b68D811884dA4FEC2De4a7AA0464df166E1",
      registerSimpleContractAddress:
        "0x497D6957729d3a39D43843BD27E6cbD12310F273",
      poseidonSmtAddress: "0x479F84502Db545FA8d2275372E0582425204A879",
    },
    apiConfiguration: {
      jsonRpcEvmUrl: "https://l2.rarimo.com",
      rarimeApiUrl: "https://api.app.rarime.com",
    },
    userConfiguration: {
      userPrivateKey: userPrivateKey,
    },
  };

  console.log(rarimeConfig);

  const rarime = new Rarime(rarimeConfig);

  const passport = new RarimePassport({
    dataGroup1: DG1 ? Buffer.from(DG1, "base64") : Buffer.from("", "base64"),
    sod: SOD ? Buffer.from(SOD, "base64") : Buffer.from("", "base64"),
    ...(DG15 && DG15.length > 0
      ? { dataGroup15: Buffer.from(DG15, "base64") }
      : {}),
  });

  console.log("passport", passport);

  const pub_key = passport.getPassportKey();
  console.log("Pub key: ", pub_key);

  const liteRegisterResult = await rarime.registerIdentity(passport);
  console.log("liteRegisterResult", liteRegisterResult);

  return liteRegisterResult;
}

export async function generateQueryProof() {
  const userPrivateKey =
    PRIVATE_KEY && PRIVATE_KEY.length > 0
      ? PRIVATE_KEY
      : RarimeUtils.generateBJJPrivateKey();

  console.log(userPrivateKey);

  const rarimeConfig: RarimeConfiguration = {
    contractsConfiguration: {
      stateKeeperAddress: "0x12883d5F530AF7EC2adD7cEC29Cf84215efCf4D8",
      registerSimpleContractAddress:
        "0x1b6ae4b80F0f26DC53731D1d7aA31fc3996B513B",
      poseidonSmtAddress: "0xb8bAac4C443097d697F87CC35C5d6B06dDe64D60",
    },
    apiConfiguration: {
      jsonRpcEvmUrl: "https://rpc.qtestnet.org",
      rarimeApiUrl: "https://api.orgs.app.stage.rarime.com",
    },
    userConfiguration: {
      userPrivateKey: userPrivateKey,
    },
  };

  console.log(rarimeConfig);

  const rarime = new Rarime(rarimeConfig);

  const passport = new RarimePassport({
    dataGroup1: DG1 ? Buffer.from(DG1, "base64") : Buffer.from("", "base64"),
    sod: SOD ? Buffer.from(SOD, "base64") : Buffer.from("", "base64"),
    ...(DG15 && DG15.length > 0
      ? { dataGroup15: Buffer.from(DG15, "base64") }
      : {}),
  });

  console.log("passport", passport);

  const queryProofParams: QueryProofParams = {
    eventId: "43580365239758335475",
    eventData:
      "270038666511201875208172000617689023489105079510191335498520083214634616239",
    selector: "0",
    timestampLowerbound: "0",
    timestampUpperbound: "0",
    identityCountLowerbound: "0",
    identityCountUpperbound: "0",
    birthDateLowerbound: "52983525027888",
    birthDateUpperbound: "52983525027888",
    expirationDateLowerbound: "52983525027888",
    expirationDateUpperbound: "52983525027888",
    citizenshipMask: "0",
  };

  const queryProof = await rarime.generateQueryProof(
    queryProofParams,
    passport
  );

  console.log("queryProof", queryProof);

  return queryProof;
}

export async function getProposalInfo(proposalId: string) {
  const freedomtoolConfig: FreedomToolConfiguration = {
    contracts: {
      proposalStateAddress: "0x9C4b84a940C9D3140a1F40859b3d4367DC8d099a",
    },
    api: {
      ipfsUrl: "https://ipfs.rarimo.com",
      votingRelayerUrl: "https://api.freedomtool.org",
      votingRpcUrl: "https://l2.rarimo.com",
    },
  };

  const freedomtool = new FreedomTool(freedomtoolConfig);

  return freedomtool.getProposalInfo(proposalId);
}

export async function isAlreadyVoted(proposalId: string): Promise<boolean> {
  const userPrivateKey =
    PRIVATE_KEY && PRIVATE_KEY.length > 0 ? PRIVATE_KEY : "";

  console.log(userPrivateKey);

  const freedomtoolConfig: FreedomToolConfiguration = {
    contracts: {
      proposalStateAddress: "0x4C61d7454653720DAb9e26Ca25dc7B8a5cf7065b",
    },
    api: {
      ipfsUrl: "https://ipfs.rarimo.com",
      votingRelayerUrl: "",
      votingRpcUrl: "https://rpc.qtestnet.org",
    },
  };

  const freedomtool = new FreedomTool(freedomtoolConfig);

  const rarimeConfig: RarimeConfiguration = {
    contractsConfiguration: {
      stateKeeperAddress: "0x12883d5F530AF7EC2adD7cEC29Cf84215efCf4D8",
      registerSimpleContractAddress:
        "0x1b6ae4b80F0f26DC53731D1d7aA31fc3996B513B",
      poseidonSmtAddress: "0xb8bAac4C443097d697F87CC35C5d6B06dDe64D60",
    },
    apiConfiguration: {
      jsonRpcEvmUrl: "https://rpc.qtestnet.org",
      rarimeApiUrl: "https://api.orgs.app.stage.rarime.com",
    },
    userConfiguration: {
      userPrivateKey: userPrivateKey,
    },
  };

  console.log("rarimeConfig", rarimeConfig);

  const rarime = new Rarime(rarimeConfig);
  const proposalInfo = await freedomtool.getProposalInfo(proposalId);

  return freedomtool.isAlreadyVoted(proposalInfo, rarime);
}

export async function validate(proposalId: string) {
  const userPrivateKey =
    PRIVATE_KEY && PRIVATE_KEY.length > 0 ? PRIVATE_KEY : "";

  console.log(userPrivateKey);

  const freedomtoolConfig: FreedomToolConfiguration = {
    contracts: {
      proposalStateAddress: "0x4C61d7454653720DAb9e26Ca25dc7B8a5cf7065b",
    },
    api: {
      ipfsUrl: "https://ipfs.rarimo.com",
      votingRelayerUrl: "",
      votingRpcUrl: "https://rpc.qtestnet.org",
    },
  };

  const freedomtool = new FreedomTool(freedomtoolConfig);

  const rarimeConfig: RarimeConfiguration = {
    contractsConfiguration: {
      stateKeeperAddress: "0x12883d5F530AF7EC2adD7cEC29Cf84215efCf4D8",
      registerSimpleContractAddress:
        "0x1b6ae4b80F0f26DC53731D1d7aA31fc3996B513B",
      poseidonSmtAddress: "0xb8bAac4C443097d697F87CC35C5d6B06dDe64D60",
    },
    apiConfiguration: {
      jsonRpcEvmUrl: "https://rpc.qtestnet.org",
      rarimeApiUrl: "https://api.orgs.app.stage.rarime.com",
    },
    userConfiguration: {
      userPrivateKey: userPrivateKey,
    },
  };

  const passport = new RarimePassport({
    dataGroup1: DG1 ? Buffer.from(DG1, "base64") : Buffer.from("", "base64"),
    sod: SOD ? Buffer.from(SOD, "base64") : Buffer.from("", "base64"),
    ...(DG15 && DG15.length > 0
      ? { dataGroup15: Buffer.from(DG15, "base64") }
      : {}),
  });

  console.log("rarimeConfig", rarimeConfig);

  const rarime = new Rarime(rarimeConfig);
  const pollData = await getProposalInfo(proposalId);

  await freedomtool.verify(pollData, passport, rarime);
  console.log("freedomtool validate: valid");
}

export async function submitVote(proposalId: string) {
  const userPrivateKey =
    PRIVATE_KEY && PRIVATE_KEY.length > 0 ? PRIVATE_KEY : "";

  console.log(userPrivateKey);

  const freedomtoolConfig: FreedomToolConfiguration = {
    contracts: {
      proposalStateAddress: "0x9C4b84a940C9D3140a1F40859b3d4367DC8d099a",
    },
    api: {
      ipfsUrl: "https://ipfs.rarimo.com",
      votingRelayerUrl: "https://api.freedomtool.org",
      votingRpcUrl: "https://l2.rarimo.com",
    },
  };

  const freedomtool = new FreedomTool(freedomtoolConfig);

  const rarimeConfig: RarimeConfiguration = {
    contractsConfiguration: {
      stateKeeperAddress: "0x61aa5b68D811884dA4FEC2De4a7AA0464df166E1",
      registerSimpleContractAddress:
        "0x497D6957729d3a39D43843BD27E6cbD12310F273",
      poseidonSmtAddress: "0x479F84502Db545FA8d2275372E0582425204A879",
    },
    apiConfiguration: {
      jsonRpcEvmUrl: "https://l2.rarimo.com",
      rarimeApiUrl: "https://api.app.rarime.com",
    },
    userConfiguration: {
      userPrivateKey: userPrivateKey,
    },
  };

  const passport = new RarimePassport({
    dataGroup1: DG1 ? Buffer.from(DG1, "base64") : Buffer.from("", "base64"),
    sod: SOD ? Buffer.from(SOD, "base64") : Buffer.from("", "base64"),
    ...(DG15 && DG15.length > 0
      ? { dataGroup15: Buffer.from(DG15, "base64") }
      : {}),
  });

  console.log("rarimeConfig", rarimeConfig);

  const rarime = new Rarime(rarimeConfig);
  const proposalInfo = await getProposalInfo(proposalId);

  console.log("pollData", proposalInfo);

  const submitVoteResult = await freedomtool.submitProposal({
    answers: [0],
    proposalInfo,
    rarime,
    passport,
  });

  console.log("submitVoteResult", submitVoteResult);
}
