// Filename: .github/scripts/check-pr.js
const axios = require('axios');

const githubToken = process.env.GITHUB_TOKEN;
const { GITHUB_REPOSITORY, GITHUB_PR_NUMBER } = process.env;

const [owner, repo] = GITHUB_REPOSITORY.split('/');

async function getPRDetails(prNumber) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `token ${githubToken}`,
            },
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(`PR #${prNumber} not found in repository ${owner}/${repo}, skipping...`);
            return null;
        } else {
            throw error;
        }
    }
}

async function getIssueDetails(issueOwner, issueRepo, issueNumber) {
    try {
        const url = `https://api.github.com/repos/${issueOwner}/${issueRepo}/issues/${issueNumber}`;
        const response = await axios.get(url, {
            headers: {
                Authorization: `token ${githubToken}`,
            },
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(`Issue #${issueNumber} not found in repository ${issueOwner}/${issueRepo}, skipping...`);
            return null;
        } else {
            throw error;
        }
    }
}

async function getContributors() {
    const url = `https://api.github.com/repos/${owner}/${repo}/contributors`;
    const response = await axios.get(url, {
        headers: {
            Authorization: `token ${githubToken}`,
        },
    });
    return response.data;
}

function stripHTMLTags(text) {
    return text.replace(/<\/?[^>]+(>|$)/g, '');
}

function removeCodeBlocks(text) {
    // Remove fenced code blocks (triple backticks or tildes)
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/~~~[\s\S]*?~~~/g, '');
    // Remove inline code (single backticks)
    text = text.replace(/`[^`]*`/g, '');
    return text;
}

function extractPRReferences(text) {
    // Regex to match PR references with any number of digits
    const prRegex =
        /(?:^|\s)(?:Fixes|Closes|Resolves|See|PR|Pull Request)?\s*(?:https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)|([\w.-]+)\/([\w.-]+)#(\d+)|#(\d+))(?!\w)/gm;
    const matches = [];
    let match;
    while ((match = prRegex.exec(text)) !== null) {
        const refOwner = match[1] || match[4] || owner;
        const refRepo = match[2] || match[5] || repo;
        const prNumber = match[3] || match[6] || match[7];
        matches.push({
            owner: refOwner,
            repo: refRepo,
            prNumber,
        });
    }
    return matches;
}

function extractIssueReferences(text) {
    // Regex to match issue references with any number of digits
    // Supports 'Fixes #123', 'owner/repo#123', 'https://github.com/owner/repo/issues/123'
    const issueRegex =
        /(?:^|\s)(?:Fixes|Closes|Resolves|See|Issue)?\s*(?:(?:https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+))|([\w.-]+)\/([\w.-]+)#(\d+)|#(\d+))(?!\w)/gm;
    const issues = [];
    let match;
    while ((match = issueRegex.exec(text)) !== null) {
        const issueOwner = match[1] || match[4] || owner;
        const issueRepo = match[2] || match[5] || repo;
        const issueNumber = match[3] || match[6] || match[7];
        issues.push({
            owner: issueOwner,
            repo: issueRepo,
            issueNumber,
        });
    }
    return issues;
}

function cleanText(text) {
    let cleanText = text;
    cleanText = stripHTMLTags(cleanText);
    cleanText = removeCodeBlocks(cleanText);
    return cleanText;
}

async function checkPRLabelsAndMilestone(pr) {
    const { labels: prLabels, milestone: prMilestone } = pr;

    if (!prLabels || prLabels.length === 0) {
        throw new Error('The PR has no labels.');
    }
    if (!prMilestone) {
        throw new Error('The PR has no milestone.');
    }
}

function isDependabotOrSnykPR(pr) {
    return ((pr.user.login === 'dependabot[bot]') || (pr.user.login === 'swirlds-automation'));
}

async function processIssueReferencesInText(text) {
    const issueReferences = extractIssueReferences(text);

    let hasValidIssueReference = false;

    if (issueReferences.length > 0) {
        for (const issueRef of issueReferences) {
            // Only process issues from the same repository
            if (issueRef.owner === owner && issueRef.repo === repo) {
                hasValidIssueReference = true;
                const issue = await getIssueDetails(issueRef.owner, issueRef.repo, issueRef.issueNumber);
                if (issue) {
                    const { labels: issueLabels, milestone: issueMilestone } = issue;

                    if (!issueLabels || issueLabels.length === 0) {
                        throw new Error(`Associated issue #${issueRef.issueNumber} has no labels.`);
                    }
                    if (!issueMilestone) {
                        throw new Error(`Associated issue #${issueRef.issueNumber} has no milestone.`);
                    }
                }
            } else {
                console.log(
                    `Issue #${issueRef.issueNumber} is from a different repository (${issueRef.owner}/${issueRef.repo}), skipping...`
                );
            }
        }

        if (!hasValidIssueReference) {
            throw new Error('The PR description must reference at least one issue from the current repository.');
        } else {
            console.log('All associated issues have labels and milestones.');
        }
    } else {
        throw new Error('The PR description must reference at least one issue from the current repository.');
    }
}

async function processPRReferencesInText(text, contributors) {
    const prReferences = extractPRReferences(text);

    if (prReferences.length === 0) {
        console.log('No associated PRs found in PR description.');
    } else {
        for (const prRef of prReferences) {
            // Only process PRs from the same repository
            if (prRef.owner === owner && prRef.repo === repo) {
                await processReferencedPR(prRef, contributors);
            } else {
                console.log(
                    `PR #${prRef.prNumber} is from a different repository (${prRef.owner}/${prRef.repo}), skipping...`
                );
                // Skip processing issue references from external PRs
            }
        }
    }
}

async function processReferencedPR(prRef, contributors) {
    // Attempt to fetch the PR to validate its existence
    const referencedPR = await getPRDetails(prRef.prNumber);
    if (!referencedPR) {
        console.log(`PR #${prRef.prNumber} does not exist, skipping...`);
        return; // Skip if PR not found
    }

    const authorLogin = referencedPR.user.login;

    const isContributor = contributors.some((contributor) => contributor.login === authorLogin);

    if (!isContributor) {
        console.log(
            `PR author ${authorLogin} is not a contributor, skipping issue matching for PR #${prRef.prNumber}.`
        );
        return;
    }

    // Clean the referenced PR body
    const refPrBody = cleanText(referencedPR.body);

    // Extract issue references from the referenced PR description
    const refIssueReferences = extractIssueReferences(refPrBody);

    if (refIssueReferences.length === 0) {
        console.log(`No associated issues found in PR #${prRef.prNumber} description.`);
    } else {
        for (const issueRef of refIssueReferences) {
            // Only process issues from the same repository
            if (issueRef.owner === owner && issueRef.repo === repo) {
                const issue = await getIssueDetails(
                    issueRef.owner,
                    issueRef.repo,
                    issueRef.issueNumber
                );
                if (issue) {
                    const { labels: issueLabels, milestone: issueMilestone } = issue;

                    if (!issueLabels || issueLabels.length === 0) {
                        throw new Error(
                            `Associated issue #${issueRef.issueNumber} has no labels.`
                        );
                    }
                    if (!issueMilestone) {
                        throw new Error(
                            `Associated issue #${issueRef.issueNumber} has no milestone.`
                        );
                    }
                }
            } else {
                console.log(
                    `Issue #${issueRef.issueNumber} is from a different repository (${issueRef.owner}/${issueRef.repo}), skipping...`
                );
            }
        }
        console.log(
            `PR #${prRef.prNumber} and all associated issues have labels and milestones.`
        );
    }
}

async function run() {
    try {
        const pr = await getPRDetails(GITHUB_PR_NUMBER);
        if (!pr) {
            throw new Error(`PR #${GITHUB_PR_NUMBER} not found.`);
        }

        await checkPRLabelsAndMilestone(pr);

        if (isDependabotOrSnykPR(pr)) {
            console.log('Dependabot or snyk PR detected. Skipping issue reference requirement.');
            return;
        } else {
            const cleanBody = cleanText(pr.body);
            await processIssueReferencesInText(cleanBody);
        }

        const contributors = await getContributors();

        const cleanBody = cleanText(pr.body);
        await processPRReferencesInText(cleanBody, contributors);

        console.log('All checks completed.');
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

run();// Filename: hardhat.config.js
// SPDX-License-Identifier: Apache-2.0

require('hardhat-abi-exporter');
require('@openzeppelin/hardhat-upgrades');
require('@nomicfoundation/hardhat-foundry');
require('@nomicfoundation/hardhat-chai-matchers');
require('solidity-coverage');

const {
  OPERATOR_ID_A,
  OPERATOR_KEY_A,
  NETWORKS,
  PRIVATE_KEYS,
} = require('./utils/constants');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  mocha: {
    timeout: 3600000,
    color: true,
    failZero: Boolean(process.env.CI),
    forbidOnly: Boolean(process.env.CI),
    reporter: 'mocha-multi-reporters',
    reporterOption: {
      reporterEnabled: 'spec, mocha-junit-reporter',
      mochaJunitReporterReporterOptions: {
        mochaFile: 'test-results.[hash].xml',
        includePending: true,
        outputs: true,
      },
    },
  },
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 500,
      },
      evmVersion: 'cancun',
    },
  },
  abiExporter: {
    path: './contracts-abi',
    runOnCompile: true,
  },
  defaultNetwork: NETWORKS.local.name,
  networks: {
    local: {
      url: NETWORKS.local.url,
      accounts: PRIVATE_KEYS,
      chainId: NETWORKS.local.chainId,
      sdkClient: {
        operatorId: OPERATOR_ID_A,
        operatorKey: OPERATOR_KEY_A,
        networkNodeUrl: NETWORKS.local.networkNodeUrl,
        nodeId: NETWORKS.local.nodeId,
        mirrorNode: NETWORKS.local.mirrorNode,
      },
    },
    testnet: {
      url: NETWORKS.testnet.url,
      accounts: PRIVATE_KEYS,
      chainId: NETWORKS.testnet.chainId,
      sdkClient: {
        operatorId: OPERATOR_ID_A,
        operatorKey: OPERATOR_KEY_A,
        networkNodeUrl: NETWORKS.testnet.networkNodeUrl,
        nodeId: NETWORKS.testnet.nodeId,
        mirrorNode: NETWORKS.testnet.mirrorNode,
      },
    },
    previewnet: {
      url: NETWORKS.previewnet.url,
      accounts: PRIVATE_KEYS,
      chainId: NETWORKS.previewnet.chainId,
      sdkClient: {
        operatorId: OPERATOR_ID_A,
        operatorKey: OPERATOR_KEY_A,
        networkNodeUrl: NETWORKS.previewnet.networkNodeUrl,
        nodeId: NETWORKS.previewnet.nodeId,
        mirrorNode: NETWORKS.previewnet.mirrorNode,
      },
    },
    besu_local: {
      url: NETWORKS.besu.url,
      allowUnlimitedContractSize: NETWORKS.besu.allowUnlimitedContractSize,
      blockGasLimit: NETWORKS.besu.blockGasLimit,
      gas: NETWORKS.besu.gas,
      timeout: NETWORKS.besu.timeout,
      chainId: NETWORKS.besu.chainId,
      accounts: [
        // private keys are configured in the genesis file https://github.com/hyperledger/besu/blob/main/config/src/main/resources/dev.json#L20
        '0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f',
        '0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
        '0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63'
      ],
    },
  },
};
// Filename: scripts/freeze-network-node.js
// SPDX-License-Identifier: Apache-2.0

/**
 * @notice this scripts is mainly designed to freeze the local network node to prepare for network migration (mono to mod)
 */
const {
  FreezeTransaction,
  Client,
  Timestamp,
  FreezeType,
} = require('@hashgraph/sdk');
const { OPERATOR_ID_A, OPERATOR_KEY_A } = require('../utils/constants');

async function main() {
  try {
    // notice: currently this setup is only used to freeze a single network node locally.
    const genesisClient = Client.forNetwork({
      '127.0.0.1:50211': '0.0.3',
    }).setOperator(OPERATOR_ID_A, OPERATOR_KEY_A);

    const validStart = new Timestamp(Math.round((Date.now() + 5000) / 1000), 0); // timestamp now +  5 sec
    const tx = new FreezeTransaction()
      .setStartTimestamp(validStart)
      .setFreezeType(new FreezeType(1)) // FreezeOnly
      .freezeWith(genesisClient);
    const execTx = await tx.execute(genesisClient);
    await execTx.getReceipt(genesisClient);
  } catch (e) {
    if (e.message.includes('GrpcServiceError: read ECONNRESET')) {
      console.log('The platform has been frozen successfully.');
    } else {
      throw new Error(e);
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.log(error);
  process.exit(-1);
});
// Filename: scripts/hedera-response-codes-protobuf-parser.js
// SPDX-License-Identifier: Apache-2.0

const fs = require('fs');
const axios = require('axios');
const protobufjs = require('protobufjs');

async function main() {
  const version = (await axios.get('https://raw.githubusercontent.com/hashgraph/hedera-services/refs/heads/main/version.txt')).data.replace('\n', '');
  const res = (await axios.get('https://raw.githubusercontent.com/hashgraph/hedera-services/refs/heads/main/hapi/hedera-protobufs/services/response_code.proto')).data;
  const parsedProto = protobufjs.parse(res, {
    keepCase: true,
    alternateCommentMode: true,
    preferTrailingComment: true
  });
  const responseCodes = parsedProto.root.nested.proto.nested.ResponseCodeEnum;

  let contract =
      `// SPDX-License-Identifier: Apache-2.0\n` +
      `pragma solidity >=0.4.9 <0.9.0;\n` +
      `\n// this contract is auto-generated by a manual triggered script in utils/hedera-response-codes-protobuf-parser.js` +
      `\n// the generated contract is using hedera response codes from services version ${version}` +
      `\n// https://github.com/hashgraph/hedera-services/blob/main/hapi/hedera-protobufs/services/response_code.proto\n\n` +
      `library HederaResponseCodes {\n`;
  for (const [name, code] of Object.entries(responseCodes.values)) {
    const comment = responseCodes?.comments[name];
    if (comment) {
      contract += `    /// ${comment.replaceAll('\n', ' ') ?? ''}\n`;
    }
    contract += `    int32 internal constant ${name} = ${code};\n\n`;
  }
  contract += '}\n';

  console.log(`The generated contract is using hedera response codes from services version ${version}`);

  fs.writeFileSync('./contracts/system-contracts/HederaResponseCodes.sol', contract);
}

main();
// Filename: system-contract-dapp-playground/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
// Filename: system-contract-dapp-playground/postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
// Filename: system-contract-dapp-playground/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/**/*.{js,ts,jsx,tsx,mdx}',
    './src/sections/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        styrene: ['var(--font-styrene)', 'sans-serif'],
      },
      colors: {
        primary: '#1A232E',
        secondary: '#303337',
        'landing-text-hero': '#8C8C8C',
        'button-stroke': {
          violet: '#82ACF9',
          green: '#07E78E',
        },
        panel: '#374151',
        button: '#202225',
        hedera: {
          green: '#07E78E',
          purple: '#A98DF4',
          'gradient-1': {
            blue: '#2D84EB',
            purple: '#8259EF',
          },
          'gradient-2': {
            lime: '#D4F392',
            teal: '#00BDC9',
          },
        },
      },
    },
  },
  plugins: [],
};
// Filename: test/bls-bn254-signatures/bls-bn254-signatures.js
// SPDX-License-Identifier: Apache-2.0

const {expect} = require('chai');
const {ethers} = require('hardhat');
const mcl = require('mcl-wasm');

const BlsHelper = require('./blsHelper');
const Constants = require('../constants');

describe('BLS BN254 signatures', function () {
  let signers;
  let contract;
  let blsBn254Helper;

  let validSingleG1PubKeyCallData;
  let validSingleG1SigAndMsgCallData;

  const MAX_PERCENTAGE_DIFFERENCE = 1;

  before(async function () {
    signers = await ethers.getSigners();

    await mcl.init(mcl.BN_SNARK1);
    mcl.setETHserialization(true);
    mcl.setMapToMode(0);

    blsBn254Helper = new BlsHelper();

    const factory = await ethers.getContractFactory(Constants.Contract.BlsBn254);
    contract = await factory.deploy();
    await contract.waitForDeployment();
  });

  it('single verification using G1 for public key and G2 for signature and message', async () => {
    const {secretKeyFr, pubKeyG1} = blsBn254Helper.createKeyPairG1PubKey();
    const msgG2 = blsBn254Helper.g2FromHex(ethers.keccak256('0x160c'));
    const sigG2 = blsBn254Helper.signG2(msgG2, secretKeyFr);

    const pubKeyG1Ser = blsBn254Helper.serializeG1Point(pubKeyG1);
    const msgG2Ser = blsBn254Helper.serializeG2Point(msgG2);
    const sigG2Ser = blsBn254Helper.serializeG2Point(sigG2);

    validSingleG1PubKeyCallData = [
      pubKeyG1Ser,
      msgG2Ser,
      sigG2Ser
    ];

    const isEcPairingValid = await contract.verifySingleG1PubKeyG2SigAndMsg(...validSingleG1PubKeyCallData);
    expect(isEcPairingValid).to.be.true;
  });

  it('single verification using G1 for signature and message and G2 for public key', async () => {
    const {secretKeyFr, pubKeyG2} = blsBn254Helper.createKeyPairG2PubKey();
    const msgG1 = blsBn254Helper.g1FromHex(ethers.keccak256('0x160c'));
    const sigG1 = blsBn254Helper.signG1(msgG1, secretKeyFr);

    const pubKeyG2Ser = blsBn254Helper.serializeG2Point(pubKeyG2);
    const msgG1Ser = blsBn254Helper.serializeG1Point(msgG1);
    const sigG1Ser = blsBn254Helper.serializeG1Point(sigG1);

    validSingleG1SigAndMsgCallData = [
      pubKeyG2Ser,
      msgG1Ser,
      sigG1Ser
    ];

    const isEcPairingValid = await contract.verifySingleG1SigAndMsgG2PubKey(...validSingleG1SigAndMsgCallData);
    expect(isEcPairingValid).to.be.true;
  });

  it('gas estimation for single verification should be within a range', async () => {
    const pubKeyG1Gas = await contract.verifySingleG1PubKeyG2SigAndMsg.estimateGas(...validSingleG1PubKeyCallData);
    const sigAndMsgG1Gas = await contract.verifySingleG1SigAndMsgG2PubKey.estimateGas(...validSingleG1SigAndMsgCallData);

    const percentageDiff = 100 * Math.abs((Number(pubKeyG1Gas) - Number(sigAndMsgG1Gas)) / ((Number(pubKeyG1Gas) + Number(sigAndMsgG1Gas)) / 2));
    expect(percentageDiff).to.be.lessThanOrEqual(MAX_PERCENTAGE_DIFFERENCE);
  });

  for (const actors of [5, 10, 50, 100, 200]) {
    let g1PubKeyCallData;
    let g1SigAndMsgCallData;

    it(`single verification using G1 for ${actors} aggregated public key and G2 for ${actors} aggregated signature and same message`, async () => {
      let pubKeysG1Aggregated;
      let sigG2Aggregated;

      const msgG2 = blsBn254Helper.g2FromHex(ethers.keccak256('0x160c'));
      for (let i = 0; i < actors; i++) {
        const signer = blsBn254Helper.createKeyPairG1PubKey();
        const pubKeyG1 = signer.pubKeyG1;
        const sigG2 = blsBn254Helper.signG2(msgG2, signer.secretKeyFr);

        pubKeysG1Aggregated = (i === 0) ? pubKeyG1 : blsBn254Helper.pAdd(pubKeysG1Aggregated, pubKeyG1);
        sigG2Aggregated = (i === 0) ? sigG2 : blsBn254Helper.pAdd(sigG2Aggregated, sigG2);
      }

      g1PubKeyCallData = [
        blsBn254Helper.serializeG1Point(pubKeysG1Aggregated),
        blsBn254Helper.serializeG2Point(msgG2),
        blsBn254Helper.serializeG2Point(sigG2Aggregated)
      ]
      const isEcPairingValid = await contract.verifySingleG1PubKeyG2SigAndMsg(...g1PubKeyCallData);
      expect(isEcPairingValid).to.be.true;
    });

    it(`single verification using G1 for ${actors} signature and same message and G2 for ${actors} public key`, async () => {
      let pubKeysG2Aggregated;
      let sigG1Aggregated;

      const msgG1 = blsBn254Helper.g1FromHex(ethers.keccak256('0x160c'));
      for (let i = 0; i < actors; i++) {
        const signer = blsBn254Helper.createKeyPairG2PubKey();
        const pubKeyG2 = signer.pubKeyG2;
        const sigG1 = blsBn254Helper.signG1(msgG1, signer.secretKeyFr);

        pubKeysG2Aggregated = (i === 0) ? pubKeyG2 : blsBn254Helper.pAdd(pubKeysG2Aggregated, pubKeyG2);
        sigG1Aggregated = (i === 0) ? sigG1 : blsBn254Helper.pAdd(sigG1Aggregated, sigG1);
      }

      g1SigAndMsgCallData = [
        blsBn254Helper.serializeG2Point(pubKeysG2Aggregated),
        blsBn254Helper.serializeG1Point(msgG1),
        blsBn254Helper.serializeG1Point(sigG1Aggregated)
      ];

      const isEcPairingValid = await contract.verifySingleG1SigAndMsgG2PubKey(...g1SigAndMsgCallData);
      expect(isEcPairingValid).to.be.true;
    });

    it(`gas estimation for ${actors} aggregated signatures and public keys should be within a range`, async () => {
      const pubKeyG1Gas = await contract.verifySingleG1PubKeyG2SigAndMsg.estimateGas(...g1PubKeyCallData);
      const sigAndMsgG1Gas = await contract.verifySingleG1SigAndMsgG2PubKey.estimateGas(...g1SigAndMsgCallData);

      const percentageDiff = 100 * Math.abs((Number(pubKeyG1Gas) - Number(sigAndMsgG1Gas)) / ((Number(pubKeyG1Gas) + Number(sigAndMsgG1Gas)) / 2));
      expect(percentageDiff).to.be.lessThanOrEqual(MAX_PERCENTAGE_DIFFERENCE);
    });
  }

  for (const pairs of [2, 10, 20, 50, 75]) {
    let g1PubKeyCallData;
    let g1SigAndMsgCallData;

    it(`${pairs} verifications using G1 for public key G2 for signature and message`, async () => {
      let pubKeysG1Arr = [];
      let msgsG2Arr = [];
      let sigG2Aggregated;
      for (let i = 0; i < pairs; i++) {
        const signer = blsBn254Helper.createKeyPairG1PubKey();
        const msgG2 = blsBn254Helper.g2FromHex(ethers.keccak256('0x' + (5644 + i).toString()));
        const sigG2 = blsBn254Helper.signG2(msgG2, signer.secretKeyFr);

        pubKeysG1Arr.push(blsBn254Helper.serializeG1Point(signer.pubKeyG1));
        msgsG2Arr.push(blsBn254Helper.serializeG2Point(msgG2));

        sigG2Aggregated = (i === 0) ? sigG2 : blsBn254Helper.pAdd(sigG2Aggregated, sigG2);
      }

      g1PubKeyCallData = [
        pubKeysG1Arr,
        msgsG2Arr,
        blsBn254Helper.serializeG2Point(sigG2Aggregated)
      ];

      const isEcPairingValid = await contract.verifyMultipleG1PubKeyG2SigAndMsg(...g1PubKeyCallData);
      expect(isEcPairingValid).to.be.true;
    });

    it(`${pairs} verification using G1 for signature and message and G2 for public key`, async () => {
      let pubKeysG2Arr = [];
      let msgsG1Arr = [];
      let sigG1Aggregated;
      for (let i = 0; i < pairs; i++) {
        const signer = blsBn254Helper.createKeyPairG2PubKey();
        const msgG1 = blsBn254Helper.g1FromHex(ethers.keccak256('0x' + (5644 + i).toString()));
        const sigG1 = blsBn254Helper.signG1(msgG1, signer.secretKeyFr);

        pubKeysG2Arr.push(blsBn254Helper.serializeG2Point(signer.pubKeyG2));
        msgsG1Arr.push(blsBn254Helper.serializeG1Point(msgG1));

        sigG1Aggregated = (i === 0) ? sigG1 : blsBn254Helper.pAdd(sigG1Aggregated, sigG1);
      }

      g1SigAndMsgCallData = [
        pubKeysG2Arr,
        msgsG1Arr,
        blsBn254Helper.serializeG1Point(sigG1Aggregated)
      ];

      const isEcPairingValid = await contract.verifyMultipleG1SigAndMsgG2PubKey(...g1SigAndMsgCallData);
      expect(isEcPairingValid).to.be.true;
    });

    it(`gas estimation for ${pairs} verifications should be within a range`, async () => {
      const pubKeyG1Gas = await contract.verifyMultipleG1PubKeyG2SigAndMsg.estimateGas(...g1PubKeyCallData);
      const sigAndMsgG1Gas = await contract.verifyMultipleG1SigAndMsgG2PubKey.estimateGas(...g1SigAndMsgCallData);

      const percentageDiff = 100 * Math.abs((Number(pubKeyG1Gas) - Number(sigAndMsgG1Gas)) / ((Number(pubKeyG1Gas) + Number(sigAndMsgG1Gas)) / 2));
      expect(percentageDiff).to.be.lessThanOrEqual(MAX_PERCENTAGE_DIFFERENCE);
    });
  }
});
// Filename: test/bls-bn254-signatures/blsHelper.js
// SPDX-License-Identifier: Apache-2.0

const {ethers} = require('hardhat');
const mcl = require('mcl-wasm');

module.exports = class BLSHelper {
  constructor() {
    this.G1 = new mcl.G1();
    const g1x = new mcl.Fp();
    const g1y = new mcl.Fp();
    const g1z = new mcl.Fp();
    g1x.setStr('01', 16);
    g1y.setStr('02', 16);
    g1z.setInt(1);
    this.G1.setX(g1x);
    this.G1.setY(g1y);
    this.G1.setZ(g1z);

    this.G2 = new mcl.G2();
    this.G2.setX(this.createFp2(
        '0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed',
        '0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2'
    ));
    this.G2.setY(this.createFp2(
        '0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa',
        '0x090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b'
    ));
    this.G2.setZ(this.createFp2('0x01', '0x00'));
  }

  createFp2(a, b) {
    const fp2a = new mcl.Fp();
    fp2a.setStr(a);
    const fp2b = new mcl.Fp();
    fp2b.setStr(b);

    const fp2 = new mcl.Fp2();
    fp2.set_a(fp2a);
    fp2.set_b(fp2b);

    return fp2;
  }

  createKeyPairG1PubKey() {
    const generatedPrivateKey = ethers.Wallet.createRandom().privateKey;

    const secretKeyFr = new mcl.Fr();
    secretKeyFr.setHashOf(generatedPrivateKey);

    const pubKeyG1 = mcl.mul(this.G1, secretKeyFr);
    pubKeyG1.normalize();

    return {
      secretKeyFr,
      pubKeyG1
    };
  }

  createKeyPairG2PubKey() {
    const generatedPrivateKey = ethers.Wallet.createRandom().privateKey;

    const secretKeyFr = new mcl.Fr();
    secretKeyFr.setHashOf(generatedPrivateKey);

    const pubKeyG2 = mcl.mul(this.G2, secretKeyFr);
    pubKeyG2.normalize();

    return {
      secretKeyFr,
      pubKeyG2
    };
  }

  g1FromHex(hex) {
    const frRep = new mcl.Fr();
    frRep.setHashOf(hex);

    const g1Point = mcl.mul(this.G1, frRep);
    g1Point.normalize();

    return g1Point;
  }

  g2FromHex(hex) {
    const frRep = new mcl.Fr();
    frRep.setHashOf(hex);

    const g2Point = mcl.mul(this.G2, frRep);
    g2Point.normalize();

    return g2Point;
  }

  signG1(messageG1, secretFr) {
    const signatureG1 = mcl.mul(messageG1, secretFr);
    signatureG1.normalize();

    return signatureG1;
  }

  signG2(messageG2, secretFr) {
    const signatureG2 = mcl.mul(messageG2, secretFr);
    signatureG2.normalize();

    return signatureG2;
  }

  serializeFp(p) {
    return ('0x' +
        Array.from(p.serialize())
            .reverse()
            .map((value) => value.toString(16).padStart(2, '0'))
            .join(''));
  }

  serializeG1Point(pG1) {
    pG1.normalize();

    return [BigInt(this.serializeFp(pG1.getX())), BigInt(this.serializeFp(pG1.getY()))];
  }

  serializeG2Point(pG2) {
    const x = this.serializeFp(pG2.getX());
    const y = this.serializeFp(pG2.getY());

    return [
      BigInt(ethers.dataSlice(x, 32)),
      BigInt(ethers.dataSlice(x, 0, 32)),
      BigInt(ethers.dataSlice(y, 32)),
      BigInt(ethers.dataSlice(y, 0, 32))
    ];
  }

  pAdd(p1, p2) {
    return mcl.normalize(mcl.add(p1, p2));
  }
}
// Filename: test/bls-signature/bls-signature-verification.js
// SPDX-License-Identifier: Apache-2.0

const { assert } = require('chai');
const { ethers } = require('hardhat');

const Constants = require('../constants');

describe('BLSSignature Test Suite', function () {
  const message =
    '0x7b0a2020226f70656e223a207b0a20202020227072696365223a2039353931372c0a202020202274696d65223a207b0a20202020202022756e6978223a20313438333134323430302c0a2020202020202269736f223a2022323031362d31322d33315430303a30303a30302e3030305a220a202020207d0a20207d2c0a202022636c6f7365223a207b0a20202020227072696365223a2039363736302c0a202020202274696d65223a207b0a20202020202022756e6978223a20313438333232383830302c0a2020202020202269736f223a2022323031372d30312d30315430303a30303a30302e3030305a220a202020207d0a20207d2c0a2020226c6f6f6b7570223a207b0a20202020227072696365223a2039363736302c0a20202020226b223a20312c0a202020202274696d65223a207b0a20202020202022756e6978223a20313438333232383830302c0a2020202020202269736f223a2022323031372d30312d30315430303a30303a30302e3030305a220a202020207d0a20207d0a7d0a6578616d706c652e636f6d2f6170692f31';
  let BLS;
  let signers;

  before(async function () {
    signers = await ethers.getSigners();
    const BLSTestFactory = await ethers.getContractFactory(
      Constants.Contract.BLSTest
    );

    BLS = await BLSTestFactory.deploy();

    console.log(
      `${Constants.Contract.BLSTest} deployed: ${await BLS.getAddress()}`
    );
  });

  it('should verify a valid signature', async () => {
    let signatureX =
      '11181692345848957662074290878138344227085597134981019040735323471731897153462';
    let signatureY =
      '6479746447046570360435714249272776082787932146211764251347798668447381926167';
    let result = await BLS.verify(message, signatureX, signatureY);
    assert.equal(result, true, 'Verification failed.');    
  });

  it('should not verify a invalid signature', async () => {
    try {
      let signatureX =
        '11181692345848957662074290878138344227085597134981019040735323471731897153462';
      let signatureY = '12345';
      let result = await BLS.verify(message, signatureX, signatureY);
      assert.equal(result, false, 'Verification succeded when should have failed.');
    } catch (err) {      
      assert.include(
        err.message,
        'Pairing operation failed',
        'Verification failed.'
      );
    }
  });

  it('should not verify a invalid message', async () => {
    try {
      let signatureX =
        '11181692345848957662074290878138344227085597134981019040735323471731897153462';
      let signatureY =
        '6479746447046570360435714249272776082787932146211764251347798668447381926167';
      const result = await BLS.verify('0x123456', signatureX, signatureY);
      assert.equal(result, false, 'Verification succeded when should have failed.');

    } catch (err) {            
      assert.include(
        err.message,
        'Pairing operation failed',
        'Verification failed.'
      );
    }
  });
});
// Filename: test/cancun/cancun-opcodes/transientStorage.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@cancun Transient Storage Test Suite', function () {
  const VALUE = 7;
  const TRANSIENT_SLOT = 3;
  const REGULAR_SLOT = 9;
  let cancunOpcodeContract;

  before(async () => {
    const cancunOpcodeFac = await ethers.getContractFactory(
      Constants.Contract.CancunOpcodes
    );
    cancunOpcodeContract = await cancunOpcodeFac.deploy();
  });

  it('Should read/write value to transient storage using tstore/tload', async () => {
    // .transientStorage() will write `VALUE` to transient storage at `TRANSIENT_SLOT` using tstore,
    // then read `VALUE` from transient storage, using tload, into memory variable, val,
    // and finally write `val` to regular storage at `REGULAR_SLOT`
    const tx = await cancunOpcodeContract.transientStorage(
      VALUE,
      TRANSIENT_SLOT,
      REGULAR_SLOT,
      Constants.GAS_LIMIT_1_000_000
    );
    await tx.wait();

    const valueFromTransientStorage =
      await cancunOpcodeContract.getStorageAt(TRANSIENT_SLOT);
    const valueFromRegularStorage =
      await cancunOpcodeContract.getStorageAt(REGULAR_SLOT);

    expect(valueFromTransientStorage).to.eq(0n);
    expect(valueFromRegularStorage).to.eq(VALUE);
  });

  it('Should execute execute memoryCopy() to retrieve the contract address', async () => {
    // .memoryCopy() stores the address of this contract at the next available pointer, then copy the address from that pointer offset to offset 0x0.
    // Eventually, return the value at offset 0x0, the address of the contract.
    const tx = await cancunOpcodeContract.memoryCopy(
      Constants.GAS_LIMIT_1_000_000
    );

    const receipt = await tx.wait();

    const actualContractAddress = receipt.logs.find(
      (e) => e.fragment.name === 'ContractAddress'
    ).args[0];
    const expectedContractAddress = cancunOpcodeContract.target;

    expect(actualContractAddress).to.eq(expectedContractAddress);
  });
});
// Filename: test/cancun/kzg-point-evaluation/KZGPointEvaluation.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@cancun KZG Point Evaluation Test Suite', () => {
  let kzgPointEvalContract;

  before(async () => {
    const kzgPointEvalFac = await ethers.getContractFactory(
      Constants.Contract.KZGPointEvaluation
    );
    kzgPointEvalContract = await kzgPointEvalFac.deploy();
  });

  it('Should successfully execute evaluateKZGProof() with valid parameters', async () => {
    // example input and expected output from https://github.com/hashgraph/hedera-services/blob/develop/hedera-node/test-clients/src/main/resource/contract/contracts/Module050OpcodesExist/Module050OpcodesExist.sol#L34C34-L34C418
    const INPUT =
      '010657f37554c781402a22917dee2f75def7ab966d7b770905398eba3c444014623ce31cf9759a5c8daf3a357992f9f3dd7f9339d8998bc8e68373e54f00b75e0000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    const EXPECTED_OUTPUT =
      '0x000000000000000000000000000000000000000000000000000000000000100073eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001';

    // input broke down logic based on EIP-4844 https://eips.ethereum.org/EIPS/eip-4844#point-evaluation-precompile
    const VERSIONED_HASH = `0x${INPUT.slice(0, 64)}`;
    const Z = `0x${INPUT.slice(64, 128)}`;
    const Y = `0x${INPUT.slice(128, 192)}`;
    const COMMITMENT = `0x${INPUT.slice(192, 288)}`;
    const PROOF = `0x${INPUT.slice(288)}`;

    // contract call
    const tx = await kzgPointEvalContract.evaluateKZGProof(
      VERSIONED_HASH,
      Z,
      Y,
      COMMITMENT,
      PROOF,
      Constants.GAS_LIMIT_1_000_000
    );

    // wait for a receipt
    const receipt = await tx.wait();

    // extract log
    const result = receipt.logs.find(
      (e) => e.fragment.name === 'ExpectedOutput'
    ).args[0];

    // assertion
    expect(result).to.eq(EXPECTED_OUTPUT);
  });

  it('Should failingly execute evaluateKZGProof() with invalid parameters', async () => {
    // prepare params
    const VERSIONED_HASH =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const Z =
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const Y =
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
    const COMMITMENT =
      '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
    const PROOF =
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const EXPECTED_FAILURE_OUTPUT = 'KZGPointEvalFailure';

    // contract call
    const tx = await kzgPointEvalContract.evaluateKZGProof(
      VERSIONED_HASH,
      Z,
      Y,
      COMMITMENT,
      PROOF,
      Constants.GAS_LIMIT_1_000_000
    );

    // wait for receipt
    const receipt = await tx.wait();

    // extract log
    const result = receipt.logs.find(
      (e) => e.fragment.name === 'ExpectedOutput'
    ).args[0];

    // assertion
    expect(ethers.toUtf8String(result)).to.eq(EXPECTED_FAILURE_OUTPUT);
  });
});
// Filename: test/constants.js
// SPDX-License-Identifier: Apache-2.0

const Events = {
  Success: 'success',
  ResponseCode: 'ResponseCode',
  AllowanceValue: 'AllowanceValue',
  ApprovedAddress: 'ApprovedAddress',
  Approved: 'Approved',
  Frozen: 'Frozen',
  KycGranted: 'KycGranted',
  TokenCustomFees: 'TokenCustomFees',
  TokenDefaultFreezeStatus: 'TokenDefaultFreezeStatus',
  TokenDefaultKycStatus: 'TokenDefaultKycStatus',
  TokenExpiryInfo: 'TokenExpiryInfo',
  FungibleTokenInfo: 'FungibleTokenInfo',
  TokenInfo: 'TokenInfo',
  TokenKey: 'TokenKey',
  NonFungibleTokenInfo: 'NonFungibleTokenInfo',
  IsToken: 'IsToken',
  TokenType: 'TokenType',
  Approval: 'Approval',
  ApprovalForAll: 'ApprovalForAll',
  TokenCreated: 'TokenCreated',
  TokenCreatedEvent: 'tokenCreatedEvent',
  TokenInfoEvent: 'TokenInfoEvent',
  FungibleTokenInfoEvent: 'FungibleTokenInfoEvent',
  NftMinted: 'NftMinted',
  PausedToken: 'PausedToken',
  UnpausedToken: 'UnpausedToken',
  CreatedToken: 'CreatedToken',
  TransferToken: 'TransferToken',
  MintedToken: 'MintedToken',
  CallResponseEvent: 'CallResponseEvent',
  GetTokenInfo: 'GetTokenInfo',
  MintedNft: 'MintedNft',
  GetFungibleTokenInfo: 'GetFungibleTokenInfo',
  GetNonFungibleTokenInfo: 'GetNonFungibleTokenInfo',
  TinyBars: 'TinyBars',
  TinyCents: 'TinyCents',
  PseudoRandomSeed: 'PseudoRandomSeed',
  CryptoAllowance: 'CryptoAllowance',
  IsAssociated: 'IsAssociated',
};

const Path = {
  BLOCK_INFO: 'contracts/solidity/block/BlockInfo.sol:BlockInfo',
  CRYPTO_MATH: 'contracts/solidity/cryptomath/CryptoMath.sol:CryptoMath',
  HIP583_ERC20Mock: 'contracts/hip-583/ERC20Mock.sol:ERC20Mock',
  HIP583_ERC721Mock: 'contracts/hip-583/ERC721Mock.sol:ERC721Mock',
  HRC: 'contracts/hrc/HRC.sol:HRC',
  TYPE_OPS: 'contracts/solidity/typeops/TypeOps.sol:TypeOps',
  RECEIVER_PAYS:
    'contracts/solidity/signature-example/ReceiverPays.sol:ReceiverPays',
  RECEIVER: 'contracts/solidity/encoding/Receiver.sol:Receiver',
};

const Contract = {
  ERC20Mock: 'ERC20Mock',
  OZERC20Mock: 'OZERC20Mock',
  OZERC721Mock: 'OZERC721Mock',
  TokenCreateContract: 'TokenCreateContract',
  TokenCreateOpcodeLogger: 'TokenCreateOpcodeLogger',
  DiamondCutFacet: 'DiamondCutFacet',
  Diamond: 'Diamond',
  DiamondInit: 'DiamondInit',
  IDiamondCut: 'IDiamondCut',
  DiamondLoupeFacet: 'DiamondLoupeFacet',
  OwnershipFacet: 'OwnershipFacet',
  Test1Facet: 'Test1Facet',
  Test2Facet: 'Test2Facet',
  ERC1155Mock: 'ERC1155Mock',
  ContractTransferTx: 'ContractTransferTx',
  ERC721Contract: 'ERC721Contract',
  TokenCreateCustomContract: 'TokenCreateCustomContract',
  TokenManagementContract: 'TokenManagementContract',
  TokenQueryContract: 'TokenQueryContract',
  TokenTransferContract: 'TokenTransferContract',
  ERC20Contract: 'ERC20Contract',
  Exchange: 'Exchange',
  ExchangeV2: 'ExchangeV2',
  CounterV2: 'CounterV2',
  CounterV1: 'CounterV1',
  SafeOperations: 'SafeOperations',
  SafeViewOperations: 'SafeViewOperations',
  SafeHTS: 'SafeHTS',
  ERC20BurnableMock: 'ERC20BurnableMock',
  ERC20CappedMock: 'ERC20CappedMock',
  ERC20PausableMock: 'ERC20PausableMock',
  HRC719Contract: 'HRC719Contract',
  ExchangeRateMock: 'ExchangeRateMock',
  PrngSystemContract: 'PrngSystemContract',
  Concatenation: 'Concatenation',
  Transaction: 'Transaction',
  MessageFrameAddresses: 'MessageFrameAddresses',
  New: 'New',
  AssemblyAddress: 'AssemblyAddress',
  AddressContract: 'AddressContract',
  Recipient: 'Recipient',
  Inheritance: 'Inheritance',
  Functions: 'Functions',
  FunctionsChild: 'FunctionsChild',
  OpcodeLogger: 'OpcodeLogger',
  FunctionsParent: 'FunctionsParent',
  Scoping: 'Scoping',
  Arithmetic: 'Arithmetic',
  Defaults: 'Defaults',
  NonExisting: 'NonExisting',
  NonExtDup: 'NonExtDup',
  ControlStructures: 'ControlStructures',
  AssignmentReferenceTypes: 'AssignmentReferenceTypes',
  DestructuringReturns: 'DestructuringReturns',
  Panic: 'Panic',
  ReentrancyGuardTestSender: 'ReentrancyGuardTestSender',
  ReentrancyGuardTestReceiver: 'ReentrancyGuardTestReceiver',
  BlindAuction: 'BlindAuction',
  SimpleAuction: 'SimpleAuction',
  MyCustomTransparentUpgradeableProxy: 'MyCustomTransparentUpgradeableProxy',
  Box: 'Box',
  BoxV2: 'BoxV2',
  Encoding: 'Encoding',
  Sender: 'Sender',
  ErrorsExternal: 'ErrorsExternal',
  Errors: 'Errors',
  Main: 'Main',
  Base: 'Base',
  Modifiers: 'Modifiers',
  DerivedContract: 'DerivedContract',
  Token: 'Token',
  PaymentChannel: 'PaymentChannel',
  Precompiles: 'Precompiles',
  CryptoUnits: 'CryptoUnits',
  TimeUnits: 'TimeUnits',
  Ballot: 'Ballot',
  Bitwise: 'Bitwise',
  ContractCaller: 'ContractCaller',
  Target: 'Target',
  TargetContract: 'TargetContract',
  ContractCreator: 'ContractCreator',
  DataAllocation: 'DataAllocation',
  MathCoverage: 'MathCoverage',
  TransactionInfo: 'TransactionInfo',
  AccessControlContract: 'AccessControlContract',
  BeaconContract: 'MyBeacon',
  LogicContractV1: 'LogicContractV1',
  LogicContractV2: 'LogicContractV2',
  BeaconProxyContract: 'MyProxy',
  ContractCreatorOZCreate2: 'ContractCreatorOZCreate2',
  ERC20VotesTest: 'ERC20VotesTest',
  Test_ERC165: 'Test_ERC165',
  ClimberSelector: 'ClimberSelector',
  ERC1820Registry: 'ERC1820Registry',
  ERC777SenderHookImpl: 'ERC777SenderHookImpl',
  ERC777RecipientHookImpl: 'ERC777RecipientHookImpl',
  ERC777Token: 'ERC777Token',
  ERC777ContractAccount: 'ERC777ContractAccount',
  ERC1155Token: 'ERC1155Token',
  VoteV1: 'VoteV1',
  VoteV2: 'VoteV2',
  VoteProxy: 'VoteProxy',
  ERC2612Test: 'ERC2612Test',
  ERC2771ContextTest: 'ERC2771ContextTest',
  ERC2771ForwardTest: 'ERC2771ForwardTest',
  ERC2981Test: 'ERC2981Test',
  TokenVault: 'TokenVault',
  VestingWallet: 'VestingWallet',
  MulticallTest: 'MulticallTest',
  CrowdFund: 'CrowdFund',
  PausableTest: 'PausableTest',
  SafeCastTest: 'SafeCastTest',
  VaultV1: 'VaultV1',
  VaultV2: 'VaultV2',
  ShanghaiOpcodes: 'ShanghaiOpcodes',
  Counter: 'Counter',
  EcrecoverCaller: 'EcrecoverCaller',
  InvalidERC721Receiver: 'InvalidERC721Receiver',
  ValidERC721Receiver: 'ValidERC721Receiver',
  ExampleGovernor: 'ExampleGovernor',
  ExampleTokenVote: 'ExampleTokenVote',
  Purchase: 'Purchase',
  InternalCallee: 'InternalCallee',
  InternalCaller: 'InternalCaller',
  EthNativePrecompileCaller: 'EthNativePrecompileCaller',
  AtomicHTS: 'AtomicHTS',
  BLSTest: 'BLSTest',
  BlsBn254: 'BlsBn254',
  CryptoAllowance: 'CryptoAllowance',
  CryptoOwner: 'CryptoOwner',
  CancunOpcodes: 'CancunOpcodes',
  KZGPointEvaluation: 'KZGPointEvaluation',
  StateRegistry: 'StateRegistry',
  Airdrop: 'Airdrop',
  ClaimAirdrop: 'ClaimAirdrop',
  TokenReject: 'TokenReject',
  AliasAccountUtility: 'AliasAccountUtility',
  CancelAirdrop: 'CancelAirdrop',
};

const CALL_EXCEPTION = 'CALL_EXCEPTION';
const CONTRACT_REVERT_EXECUTED_CODE = 3;
const GAS_LIMIT_1_000_000 = { gasLimit: 1_000_000 };
const GAS_LIMIT_2_000_000 = { gasLimit: 2_000_000 };
const GAS_LIMIT_5_000_000 = { gasLimit: 5_000_000 };
const GAS_LIMIT_10_000_000 = { gasLimit: 10_000_000 };
const GAS_LIMIT_800000 = { gasLimit: 800000 };
const GAS_LIMIT_8000000 = { gasLimit: 8000000 };
const ONE_HBAR = ethers.parseEther('1');
const TOKEN_NAME = 'tokenName';
const TOKEN_SYMBOL = 'tokenSymbol';
const TOKEN_URL = 'tokenUrl';
const TX_SUCCESS_CODE = 22;
const SECOND = (WEI = 1);
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const GWEI = 1e9;
const HTS_SYSTEM_CONTRACT_ID = '0.0.359';
const HAS_SYSTEM_CONTRACT_ID = '0.0.362';

module.exports = {
  Events,
  Path,
  Contract,
  CALL_EXCEPTION,
  CONTRACT_REVERT_EXECUTED_CODE,
  GAS_LIMIT_1_000_000,
  GAS_LIMIT_2_000_000,
  GAS_LIMIT_5_000_000,
  GAS_LIMIT_10_000_000,
  GAS_LIMIT_800000,
  GAS_LIMIT_8000000,
  ONE_HBAR,
  TOKEN_URL,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  TX_SUCCESS_CODE,
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  WEEK,
  WEI,
  GWEI,
  HTS_SYSTEM_CONTRACT_ID,
  HAS_SYSTEM_CONTRACT_ID,
  ONE_HBAR,
};
// Filename: test/contract-admin-id/contractAdminId.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../system-contracts/hedera-token-service/utils');
const Constants = require('../constants');

describe('Admin Key and Contract ID Validation', function () {
  let signers;
  let sdkClient;
  let hollowWallet;

  before(async function () {
    signers = await ethers.getSigners();
    sdkClient = await utils.createSDKClient();
    hollowWallet = ethers.Wallet.createRandom().connect(ethers.provider);

    await (
      await signers[0].sendTransaction({
        to: hollowWallet.address,
        value: ethers.parseEther('100'),
        gasLimit: 1_000_000,
      })
    ).wait();
  });

  it('should ensure that the admin key matches the contract ID after deploying the contract with the hollow account', async function () {
    const factory = await ethers.getContractFactory(
      Constants.Contract.Base,
      hollowWallet
    );
    const contract = await factory.deploy();
    const info = await utils.getContractInfo(contract.target, sdkClient);

    const adminkey = info.adminKey.num;
    const contractId = info.contractId.num;

    expect(adminkey.equals(contractId)).to.be.true;
  });

  it('should ensure that the admin key matches the contract ID after deploying a contract', async function () {
    const factory = await ethers.getContractFactory(Constants.Contract.Base);
    const contract = await factory.deploy();
    
    await contract.waitForDeployment();

    const info = await utils.getContractInfo(contract.target, sdkClient);

    const adminkey = info.adminKey.num;
    const contractId = info.contractId.num;

    expect(adminkey.equals(contractId)).to.be.true;
  });
});
// Filename: test/diamond-pattern/diamond.helper.js
// SPDX-License-Identifier: Apache-2.0

let DiamondHelper = {
  FacetCutAction: { Add: 0, Replace: 1, Remove: 2 },

  getSelectors: function (contract) {
    const selectors = contract.interface.fragments.reduce((acc, val) => {
      if (val.type === 'function' && val.name !== 'init(bytes)') {
        acc.push(contract.interface.getFunction(val.name).selector);
      }
      return acc;
    }, []);

    selectors.contract = contract;
    selectors.remove = this.remove;
    selectors.get = this.get;

    return selectors;
  },

  remove: function (functionNames) {
    const selectors = this.filter((v) => {
      for (const functionName of functionNames) {
        if (v === this.contract.interface.getFunction(functionName).selector) {
          return false;
        }
      }

      return true;
    });

    selectors.contract = this.contract;
    selectors.remove = this.remove;
    selectors.get = this.get;

    return selectors;
  },

  get: function (functionNames) {
    const selectors = this.filter((v) => {
      for (const functionName of functionNames) {
        if (v === this.contract.interface.getFunction(functionName).selector) {
          return true;
        }
      }

      return false;
    });

    selectors.contract = this.contract;
    selectors.remove = this.remove;
    selectors.get = this.get;

    return selectors;
  },

  removeSelectors: function (selectors, signatures) {
    const iface = new ethers.Interface(signatures.map((v) => 'function ' + v));
    const removeSelectors = signatures.map(
      (v) => iface.getFunction(v).selector
    );
    selectors = selectors.filter((v) => !removeSelectors.includes(v));

    return selectors;
  },

  findAddressPositionInFacets: function (facetAddress, facets) {
    for (let i = 0; i < facets.length; i++) {
      if (facets[i].facetAddress === facetAddress) {
        return i;
      }
    }
  },
};

module.exports = {
  DiamondHelper,
};
// Filename: test/diamond-pattern/diamond.js
// SPDX-License-Identifier: Apache-2.0

const { assert } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../constants');
const Helper = require('../diamond-pattern/diamond.helper');

describe('DiamondFacet Test Suite', async function () {
  let signers;
  let diamondCutFacet;
  let diamondLoupeFacet;
  let ownershipFacet;
  let diamond;
  let diamondInit;

  const addresses = [];

  before(async function () {
    signers = await ethers.getSigners();

    const DiamondCutFacetFactory = await ethers.getContractFactory(
      Constants.Contract.DiamondCutFacet
    );

    diamondCutFacet = await DiamondCutFacetFactory.deploy();

    console.log(
      `${
        Constants.Contract.DiamondCutFacet
      } deployed: ${await diamondCutFacet.getAddress()}`
    );

    const DiamondFactory = await ethers.getContractFactory(
      Constants.Contract.Diamond
    );
    diamond = await DiamondFactory.deploy(
      await signers[0].getAddress(),
      await diamondCutFacet.getAddress()
    );
    console.log(
      `${Constants.Contract.Diamond} deployed: ${await diamond.getAddress()}`
    );

    const DiamondInitFactory = await ethers.getContractFactory(
      Constants.Contract.DiamondInit
    );
    diamondInit = await DiamondInitFactory.deploy();
    console.log(
      `${
        Constants.Contract.DiamondInit
      } deployed: ${await diamondInit.getAddress()}`
    );

    console.log(`\nDeploying facets`);
    const cuts = [];
    for (const facetName of ['DiamondLoupeFacet', 'OwnershipFacet']) {
      const FacetFactory = await ethers.getContractFactory(facetName);
      const facet = await FacetFactory.deploy();
      console.log(`${facetName} deployed: ${await facet.getAddress()}`);

      cuts.push({
        facetAddress: await facet.getAddress(),
        action: Helper.DiamondHelper.FacetCutAction.Add,
        functionSelectors: Helper.DiamondHelper.getSelectors(facet),
      });
    }

    console.log(`\nDiamond Cut:`, cuts);
    const diamondCut = await ethers.getContractAt(
      Constants.Contract.IDiamondCut,
      await diamond.getAddress()
    );
    const diamondCutTx = await diamondCut.diamondCut(
      cuts,
      await diamondInit.getAddress(),
      diamondInit.interface.encodeFunctionData('init'),
      Constants.GAS_LIMIT_10_000_000
    );

    if (!(await diamondCutTx.wait()).status) {
      await assert.Fail(`Diamond upgrade failed: ${diamondCutTx.hash}`);
    }

    diamondCutFacet = await ethers.getContractAt(
      Constants.Contract.DiamondCutFacet,
      await diamond.getAddress()
    );
    diamondLoupeFacet = await ethers.getContractAt(
      Constants.Contract.DiamondLoupeFacet,
      await diamond.getAddress()
    );
    ownershipFacet = await ethers.getContractAt(
      Constants.Contract.OwnershipFacet,
      await diamond.getAddress()
    );
  });

  it('should have three facets -- call to facetAddresses function', async () => {
    for (const address of await diamondLoupeFacet.facetAddresses()) {
      addresses.push(address);
    }

    assert.equal(addresses.length, 3);
  });

  it('facets should have the right function selectors -- call to facetFunctionSelectors function', async () => {
    let result, selectors;

    selectors = Helper.DiamondHelper.getSelectors(diamondCutFacet);
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0]);
    assert.sameMembers(Array.from(result), selectors);

    selectors = Helper.DiamondHelper.getSelectors(diamondLoupeFacet);
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[1]);
    assert.sameMembers(Array.from(result), selectors);

    selectors = Helper.DiamondHelper.getSelectors(ownershipFacet);
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[2]);
    assert.sameMembers(Array.from(result), selectors);
  });

  it('selectors should be associated to facets correctly -- multiple calls to facetAddress function', async () => {
    assert.equal(
      addresses[0],
      await diamondLoupeFacet.facetAddress('0x1f931c1c')
    );
    assert.equal(
      addresses[1],
      await diamondLoupeFacet.facetAddress('0xcdffacc6')
    );
    assert.equal(
      addresses[1],
      await diamondLoupeFacet.facetAddress('0x01ffc9a7')
    );
    assert.equal(
      addresses[2],
      await diamondLoupeFacet.facetAddress('0xf2fde38b')
    );
  });

  it('should add test1 functions', async () => {
    const Test1Facet = await ethers.getContractFactory(
      Constants.Contract.Test1Facet
    );
    const test1Facet = await Test1Facet.deploy();
    addresses.push(await test1Facet.getAddress());

    const selectors = Helper.DiamondHelper.getSelectors(test1Facet).remove([
      'supportsInterface(bytes4)',
    ]);
    const tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: await test1Facet.getAddress(),
          action: Helper.DiamondHelper.FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      Constants.GAS_LIMIT_1_000_000
    );

    if (!(await tx.wait()).status) {
      await assert.Fail(`Diamond upgrade failed: ${tx.hash}`);
    }

    assert.sameMembers(
      Array.from(
        await diamondLoupeFacet.facetFunctionSelectors(
          await test1Facet.getAddress()
        )
      ),
      selectors
    );
  });

  it('should test function call', async () => {
    const test1Facet = await ethers.getContractAt(
      Constants.Contract.Test1Facet,
      await diamond.getAddress()
    );
    const tx = await test1Facet.test1Func10();

    if (!(await tx.wait()).status) {
      await assert.Fail(`Function call failed: ${tx.hash}`);
    }
  });

  it('should replace supportsInterface function', async () => {
    const Test1Facet = await ethers.getContractFactory(
      Constants.Contract.Test1Facet
    );
    const selectors = Helper.DiamondHelper.getSelectors(Test1Facet).get([
      'supportsInterface(bytes4)',
    ]);
    const testFacetAddress = addresses[3];

    const tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: testFacetAddress,
          action: Helper.DiamondHelper.FacetCutAction.Replace,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      Constants.GAS_LIMIT_800000
    );

    if (!(await tx.wait()).status) {
      await assert.Fail(`Diamond upgrade failed: ${tx.hash}`);
    }

    assert.sameMembers(
      Array.from(
        await diamondLoupeFacet.facetFunctionSelectors(testFacetAddress)
      ),
      Helper.DiamondHelper.getSelectors(Test1Facet)
    );
  });

  it('should add test2 functions', async () => {
    const Test2Facet = await ethers.getContractFactory(
      Constants.Contract.Test2Facet
    );
    const test2Facet = await Test2Facet.deploy();
    addresses.push(await test2Facet.getAddress());

    const selectors = Helper.DiamondHelper.getSelectors(test2Facet);
    const tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: await test2Facet.getAddress(),
          action: Helper.DiamondHelper.FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      Constants.GAS_LIMIT_800000
    );

    if (!(await tx.wait()).status) {
      await assert.Fail(`Diamond upgrade failed: ${tx.hash}`);
    }

    assert.sameMembers(
      Array.from(
        await diamondLoupeFacet.facetFunctionSelectors(
          await test2Facet.getAddress()
        )
      ),
      selectors
    );
  });

  it('should remove some test2 functions', async () => {
    const test2Facet = await ethers.getContractAt(
      Constants.Contract.Test2Facet,
      await diamond.getAddress()
    );
    const functionsToKeep = ['test2Func1()', 'test2Func5()', 'test2Func6()'];
    const selectors =
      Helper.DiamondHelper.getSelectors(test2Facet).remove(functionsToKeep);

    const tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: ethers.ZeroAddress,
          action: Helper.DiamondHelper.FacetCutAction.Remove,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      Constants.GAS_LIMIT_1_000_000
    );

    if (!(await tx.wait()).status) {
      await assert.Fail(
        `${Constants.Contract.Diamond} upgrade failed: ${tx.hash}`
      );
    }

    assert.sameMembers(
      Array.from(await diamondLoupeFacet.facetFunctionSelectors(addresses[4])),
      Helper.DiamondHelper.getSelectors(test2Facet).get(functionsToKeep)
    );
  });

  it('should remove some test1 functions', async () => {
    const test1Facet = await ethers.getContractAt(
      Constants.Contract.Test1Facet,
      await diamond.getAddress()
    );
    const functionsToKeep = ['test1Func2()', 'test1Func11()', 'test1Func12()'];
    const selectors =
      Helper.DiamondHelper.getSelectors(test1Facet).remove(functionsToKeep);

    const tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: ethers.ZeroAddress,
          action: Helper.DiamondHelper.FacetCutAction.Remove,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      Constants.GAS_LIMIT_800000
    );

    if (!(await tx.wait()).status) {
      await assert.Fail(
        `${Constants.Contract.Diamond} upgrade failed: ${tx.hash}`
      );
    }

    assert.sameMembers(
      Array.from(await diamondLoupeFacet.facetFunctionSelectors(addresses[3])),
      Helper.DiamondHelper.getSelectors(test1Facet).get(functionsToKeep)
    );
  });

  it("remove all functions and facets except 'diamondCut' and 'facets'", async () => {
    let selectors = [];
    let facets = await diamondLoupeFacet.facets();
    for (let i = 0; i < facets.length; i++) {
      selectors.push(...facets[i].functionSelectors);
    }
    selectors = Helper.DiamondHelper.removeSelectors(selectors, [
      'facets()',
      'diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)',
    ]);

    const tx = await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: ethers.ZeroAddress,
          action: Helper.DiamondHelper.FacetCutAction.Remove,
          functionSelectors: selectors,
        },
      ],
      ethers.ZeroAddress,
      '0x',
      Constants.GAS_LIMIT_800000
    );

    if (!(await tx.wait()).status) {
      await assert.Fail(
        `${Constants.Contract.Diamond} upgrade failed: ${tx.hash}`
      );
    }

    facets = await diamondLoupeFacet.facets();

    assert.equal(facets.length, 2);
    assert.equal(facets[0][0], addresses[0]);
    assert.sameMembers(Array.from(facets[0][1]), ['0x1f931c1c']);
    assert.equal(facets[1][0], addresses[1]);
    assert.sameMembers(Array.from(facets[1][1]), ['0x7a0ed627']);
  });

  it('add most functions and facets', async () => {
    const diamondLoupeFacetSelectors = Helper.DiamondHelper.getSelectors(
      diamondLoupeFacet
    ).remove(['supportsInterface(bytes4)']);
    const Test1Facet = await ethers.getContractFactory(
      Constants.Contract.Test1Facet
    );
    const Test2Facet = await ethers.getContractFactory(
      Constants.Contract.Test2Facet
    );

    const cuts = [
      {
        facetAddress: addresses[1],
        action: Helper.DiamondHelper.FacetCutAction.Add,
        functionSelectors: diamondLoupeFacetSelectors.remove(['facets()']),
      },
      {
        facetAddress: addresses[2],
        action: Helper.DiamondHelper.FacetCutAction.Add,
        functionSelectors: Helper.DiamondHelper.getSelectors(ownershipFacet),
      },
      {
        facetAddress: addresses[3],
        action: Helper.DiamondHelper.FacetCutAction.Add,
        functionSelectors: Helper.DiamondHelper.getSelectors(Test1Facet),
      },
      {
        facetAddress: addresses[4],
        action: Helper.DiamondHelper.FacetCutAction.Add,
        functionSelectors: Helper.DiamondHelper.getSelectors(Test2Facet),
      },
    ];

    const tx = await diamondCutFacet.diamondCut(
      cuts,
      ethers.ZeroAddress,
      '0x',
      Constants.GAS_LIMIT_8000000
    );
    if (!(await tx.wait()).status) {
      await assert.Fail(
        `${Constants.Contract.Diamond} upgrade failed: ${tx.hash}`
      );
    }

    const facets = await diamondLoupeFacet.facets();

    const facetAddresses = await diamondLoupeFacet.facetAddresses();
    assert.equal(facetAddresses.length, 5);
    assert.equal(facets.length, 5);
    assert.sameMembers(Array.from(facetAddresses), addresses);
    assert.equal(facets[0][0], facetAddresses[0], 'first facet');
    assert.equal(facets[1][0], facetAddresses[1], 'second facet');
    assert.equal(facets[2][0], facetAddresses[2], 'third facet');
    assert.equal(facets[3][0], facetAddresses[3], 'fourth facet');
    assert.equal(facets[4][0], facetAddresses[4], 'fifth facet');
    assert.sameMembers(
      Array.from(
        facets[
          Helper.DiamondHelper.findAddressPositionInFacets(addresses[0], facets)
        ][1]
      ),
      Helper.DiamondHelper.getSelectors(diamondCutFacet)
    );
    assert.sameMembers(
      Array.from(
        facets[
          Helper.DiamondHelper.findAddressPositionInFacets(addresses[1], facets)
        ][1]
      ),
      diamondLoupeFacetSelectors
    );
    assert.sameMembers(
      Array.from(
        facets[
          Helper.DiamondHelper.findAddressPositionInFacets(addresses[2], facets)
        ][1]
      ),
      Helper.DiamondHelper.getSelectors(ownershipFacet)
    );
    assert.sameMembers(
      Array.from(
        facets[
          Helper.DiamondHelper.findAddressPositionInFacets(addresses[3], facets)
        ][1]
      ),
      Helper.DiamondHelper.getSelectors(Test1Facet)
    );
    assert.sameMembers(
      Array.from(
        facets[
          Helper.DiamondHelper.findAddressPositionInFacets(addresses[4], facets)
        ][1]
      ),
      Helper.DiamondHelper.getSelectors(Test2Facet)
    );
  });
});
// Filename: test/discrepancies/Nonce.js
// SPDX-License-Identifier: Apache-2.0

const Constants = require('../constants');
const Utils = require('../system-contracts/hedera-token-service/utils');
const {expect} = require('chai');
const {ethers} = require('hardhat');
const TestUtils = require("../utils");

describe('@discrepancies - Nonce Test Suite', async () => {
  let signers;
  let sdkClient;
  let internalCalleeContract;
  let internalCallerContract;
  let tooLowGasPrice;
  let enoughGasPrice;
  let tokenCreateContract;
  let tokenTransferContract;
  let tokenAddress;
  let erc20Contract;
  let erc721Contract;
  let mintedTokenSerialNumber;

  before(async () => {
    signers = await ethers.getSigners();
    sdkClient = await Utils.createSDKClient();

    const {gasPrice} = await ethers.provider.getFeeData();
    tooLowGasPrice = gasPrice - BigInt(1);
    enoughGasPrice = gasPrice + BigInt(1);

    const internalCalleeContractFactory = await ethers.getContractFactory(Constants.Contract.InternalCallee);
    internalCalleeContract = await internalCalleeContractFactory.deploy();

    const internalCallerContractFactory = await ethers.getContractFactory(Constants.Contract.InternalCaller);
    internalCallerContract = await internalCallerContractFactory.deploy();

    tokenCreateContract = await Utils.deployTokenCreateContract();
    tokenTransferContract = await Utils.deployTokenTransferContract();
    await Utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    erc20Contract = await Utils.deployERC20Contract();
    tokenAddress = await Utils.createFungibleToken(
        tokenCreateContract,
        signers[0].address
    );

    await Utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    await Utils.associateToken(
        tokenCreateContract,
        tokenAddress,
        Constants.Contract.TokenCreateContract
    );
    await Utils.grantTokenKyc(tokenCreateContract, tokenAddress);
  });

  async function getServicesNonce(evmAddress) {
    try {
      const info = await Utils.getAccountInfo(evmAddress, sdkClient);
      return info?.ethereumNonce?.toNumber();
    } catch (e) {
      return null;
    }
  }

  async function getMirrorNodeNonce(evmAddress) {
    try {
      return await ethers.provider.getTransactionCount(evmAddress, 'latest');
    } catch (e) {
      return null;
    }
  }

  async function createNewAccountWithBalance(initialBalance = Utils.tinybarToWeibarCoef) {
    const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    const newAccTx = await signers[0].sendTransaction({
      to: wallet.address,
      value: initialBalance,
    });
    await newAccTx.wait();

    return wallet;
  }

  function expectNonIncrementedNonce(servicesNonceBefore, mirrorNodeNonceBefore, servicesNonceAfter, mirrorNodeNonceAfter) {
    expect(servicesNonceBefore).to.equal(mirrorNodeNonceBefore);
    expect(servicesNonceBefore).to.equal(servicesNonceAfter);
    expect(mirrorNodeNonceBefore).to.equal(mirrorNodeNonceAfter);
  }

  function expectIncrementedNonce(servicesNonceBefore, mirrorNodeNonceBefore, servicesNonceAfter, mirrorNodeNonceAfter) {
    expect(servicesNonceBefore).to.equal(mirrorNodeNonceBefore);
    expect(servicesNonceAfter).to.equal(servicesNonceBefore + 1);
    expect(mirrorNodeNonceAfter).to.equal(mirrorNodeNonceBefore + 1);
  }

  it('should not update nonce when intrinsic gas handler check failed', async function () {
    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        internalCalleeContract.externalFunction({
          gasLimit: 21_001,
        })
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectNonIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should not update nonce when offered gas price and allowance are zero handler check failed', async function () {
    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        internalCalleeContract.externalFunction({
          gasPrice: tooLowGasPrice,
          maxGasAllowance: 0
        })
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectNonIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should not update nonce when offered gas price is less than current and sender does not have enough balance handler check failed', async function () {
    const newAccountWithInsufficientBalance = await createNewAccountWithBalance();

    const snBefore = await getServicesNonce(newAccountWithInsufficientBalance.address);
    const mnBefore = await getMirrorNodeNonce(newAccountWithInsufficientBalance.address);

    const internalCalleeContractWithNewSigner = internalCalleeContract.connect(newAccountWithInsufficientBalance);
    await Utils.expectToFail(
        internalCalleeContractWithNewSigner.externalFunction({
          gasPrice: tooLowGasPrice
        })
    );

    const snAfter = await getServicesNonce(newAccountWithInsufficientBalance.address);
    const mnAfter = await getMirrorNodeNonce(newAccountWithInsufficientBalance.address);

    expectNonIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should not update nonce when offered gas price is less than current and gas allowance is less than remaining fee handler check failed', async function () {
    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        internalCalleeContract.externalFunction({
          gasPrice: tooLowGasPrice,
          maxGasAllowance: 0
        })
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectNonIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should not update nonce when offered gas price is bigger than current and sender does not have enough balance handler check failed', async function () {
    const newAccountWithInsufficientBalance = await createNewAccountWithBalance();

    const snBefore = await getServicesNonce(newAccountWithInsufficientBalance.address);
    const mnBefore = await getMirrorNodeNonce(newAccountWithInsufficientBalance.address);

    const internalCalleeContractWithNewSigner = internalCalleeContract.connect(newAccountWithInsufficientBalance);
    await Utils.expectToFail(
        internalCalleeContractWithNewSigner.externalFunction({
          gasPrice: enoughGasPrice
        })
    );

    const snAfter = await getServicesNonce(newAccountWithInsufficientBalance.address);
    const mnAfter = await getMirrorNodeNonce(newAccountWithInsufficientBalance.address);

    expectNonIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should not update nonce  when sender does not have enough balance handler check failed', async function () {
    const newAccountWithInsufficientBalance = await createNewAccountWithBalance();

    const snBefore = await getServicesNonce(newAccountWithInsufficientBalance.address);
    const mnBefore = await getMirrorNodeNonce(newAccountWithInsufficientBalance.address);

    const internalCalleeContractWithNewSigner = internalCalleeContract.connect(
        newAccountWithInsufficientBalance
    );
    await Utils.expectToFail(
        internalCalleeContractWithNewSigner.externalFunction({
          value: 2 * Utils.tinybarToWeibarCoef // 2 tinybars
        })
    );

    const snAfter = await getServicesNonce(newAccountWithInsufficientBalance.address);
    const mnAfter = await getMirrorNodeNonce(newAccountWithInsufficientBalance.address);

    expectNonIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after evm reversion due contract logic', async function () {
    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        internalCalleeContract.revertWithRevertReason({gasLimit: 500_000})
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after evm reversion due insufficient gas', async function () {
    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        internalCalleeContract.externalFunction({gasLimit: 21_064})
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after evm reversion due insufficient transfer amount', async function () {
    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        internalCallerContract.transferTo(signers[1].address, {gasLimit: 500_000})
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after evm reversion due sending value to ethereum precompile 0x2', async function () {
    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        internalCallerContract.transferTo('0x0000000000000000000000000000000000000002', {gasLimit: 500_000})
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after evm reversion due sending value to hedera precompile0 x167', async function () {
    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        internalCallerContract.transferTo('0x0000000000000000000000000000000000000167', {gasLimit: 500_000})
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after successful internal call', async function () {
    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    const tx = await internalCalleeContract.externalFunction({gasLimit: 500_000});
    await tx.wait();

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after successful internal transfer', async function () {
    const fundTx = await signers[0].sendTransaction({
      to: internalCallerContract.target,
      value: Utils.tinybarToWeibarCoef, // 1 tinybar
    });
    await fundTx.wait();

    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    const tx = await internalCallerContract.transferTo(signers[0].address, {gasLimit: 500_000});
    await tx.wait();

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after successful internal contract deployment', async function () {
    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    const tx = await internalCalleeContract.factorySample({gasLimit: 500_000});
    await tx.wait();

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after successful ERC20 token call', async function () {
    const signers = await ethers.getSigners();
    const amount = 200;

    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        erc20Contract.transfer(tokenAddress, signers[1].address, amount, Constants.GAS_LIMIT_1_000_000)
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  })

  it('should update nonce after successful ERC721 token call', async function () {
    erc721Contract = await Utils.deployERC721Contract();
    await Utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);

    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    mintedTokenSerialNumber = await Utils.mintNFT(
        tokenCreateContract,
        tokenAddress
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after successful call to Ethereum Precompiles', async function () {
    const contractFactory = await ethers.getContractFactory(Constants.Contract.EthNativePrecompileCaller);
    const contract = await contractFactory.deploy({
      gasLimit: 15_000_000,
    });

    const UNSIGNED_DATA = 'Hello Eth Native Precompiles!';
    let signer = (await ethers.getSigners())[0];
    let hashedData = ethers.hashMessage(UNSIGNED_DATA);
    let signedData = await signer.signMessage(UNSIGNED_DATA);
    let signerAddr = signer.address.toLowerCase().replace('0x', '');

    const splitSignature = ethers.Signature.from(signedData);

    let v = splitSignature.v;
    let r = splitSignature.r;
    let s = splitSignature.s;

    const callData = `0x${TestUtils.to32ByteString(hashedData)}${TestUtils.to32ByteString(v)}${TestUtils.to32ByteString(r)}${TestUtils.to32ByteString(s)}`;

    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    const result = await contract.call0x01(callData);
    const rec = await result.wait();
    expect(rec.logs[0].data).to.contain(signerAddr);

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should update nonce after unsuccessful contract deploy with CREATE2 ', async function () {
    const firstTx = await internalCalleeContract.deployViaCreate2(1);
    await firstTx.wait();

    const snBefore = await getServicesNonce(signers[0].address);
    const mnBefore = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        internalCalleeContract.deployViaCreate2(1, {gasLimit: 500000})
    );

    const snAfter = await getServicesNonce(signers[0].address);
    const mnAfter = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBefore, mnBefore, snAfter, mnAfter);
  });

  it('should reset nonce when an account has been deleted and created again', async function () {
    // create a hollow account
    const wallet = await createNewAccountWithBalance(ethers.parseEther('3.1'));
    const snAfterCreate = await getServicesNonce(wallet.address);
    const mnAfterCreate = await getMirrorNodeNonce(wallet.address);
    // verify that the hollow account nonce is 0
    expectNonIncrementedNonce(snAfterCreate, mnAfterCreate, 0, 0);

    // send hbars to signers[0] address
    const signerFundTx = await wallet.sendTransaction({
      to: signers[0].address,
      value: Utils.tinybarToWeibarCoef // 1 tinybar
    });
    await signerFundTx.wait();

    // verify that the nonce has been incremented and is set to 1
    const snAfterSendTx = await getServicesNonce(wallet.address);
    const mnAfterSendTx = await getMirrorNodeNonce(wallet.address);
    expectIncrementedNonce(snAfterCreate, mnAfterCreate, snAfterSendTx, mnAfterSendTx);

    // delete the newly created account
    const info = await Utils.getAccountInfo(wallet.address, sdkClient);
    await Utils.deleteAccount(wallet, sdkClient, info.accountId);

    // send hbars to the same address
    const fundTx2 = await signers[0].sendTransaction({
      to: wallet.address,
      value: Utils.tinybarToWeibarCoef // 1 tinybar
    });
    await fundTx2.wait();

    // verify that the hollow account nonce is 0
    const snAfterNewCreate = await getServicesNonce(wallet.address);
    const mnAfterNewCreate = await getMirrorNodeNonce(wallet.address);

    expectNonIncrementedNonce(snAfterNewCreate, mnAfterNewCreate, 0, 0);
  });

  it('should not increment nonce upon static call', async function () {
    const snBeforeTransfer = await getServicesNonce(signers[0].address);
    const mnBeforeTransfer = await getMirrorNodeNonce(signers[0].address);
    const tx = await internalCallerContract.staticCallExternalFunction.staticCall(signers[1].address)

    const snAfterTransfer = await getServicesNonce(signers[0].address);
    const mnAfterTransfer = await getMirrorNodeNonce(signers[0].address);

    expectNonIncrementedNonce(snBeforeTransfer, mnBeforeTransfer, snAfterTransfer, mnAfterTransfer)
  });

  it('should not increment nonce upon unsuccessful sent with direct call - not enough balance', async function () {
    const initialWalletBalance = Utils.tinybarToWeibarCoef;

    const newWallet = await createNewAccountWithBalance(initialWalletBalance);
    const newWallet2 = await createNewAccountWithBalance(initialWalletBalance);

    const snWallet1Before = await getServicesNonce(newWallet.address);
    const mnWallet1Before = await getMirrorNodeNonce(newWallet.address);

    await Utils.expectToFail(
        newWallet.sendTransaction({
          to: newWallet2.address,
          value: 20000000000,
        })
    );

    const snWallet1After = await getServicesNonce(newWallet.address);
    const mnWallet1After = await getMirrorNodeNonce(newWallet.address);

    expectNonIncrementedNonce(snWallet1Before, mnWallet1Before, snWallet1After, mnWallet1After)
  });

  it('should update nonce upon transfer to non-existing account with enough gas limit > 600k (hollow account creation)', async function () {
    const snBeforeTransfer = await getServicesNonce(signers[0].address);
    const mnBeforeTransfer = await getMirrorNodeNonce(signers[0].address);

    const wallet1 = ethers.Wallet.createRandom();
    const newAccTx = await signers[0].sendTransaction({
      to: wallet1.address,
      value: ethers.parseEther('1'),
      gasLimit: 650_000,
    });
    await newAccTx.wait();

    const snAfterCreate = await getServicesNonce(signers[0].address);
    const mnAfterCreate = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBeforeTransfer, mnBeforeTransfer, snAfterCreate, mnAfterCreate);
  });

  it('should not update nonce upon unsuccessful transaction due to wrong chain id', async function () {
    const wallet1 = ethers.Wallet.createRandom();
    const snBeforeTransfer = await getServicesNonce(signers[0].address);
    const mnBeforeTransfer = await getMirrorNodeNonce(signers[0].address);

    await Utils.expectToFail(
        signers[0].sendTransaction({
          to: wallet1.address,
          value: ethers.parseEther('1'),
          gasLimit: 650_000,
          chainId: 8n
        })
    );

    const snAfterCreate = await getServicesNonce(signers[0].address);
    const mnAfterCreate = await getMirrorNodeNonce(signers[0].address);

    expectNonIncrementedNonce(snBeforeTransfer, mnBeforeTransfer, snAfterCreate, mnAfterCreate)
  });

  it('should update nonce upon transaction of type 0', async function () {
    const wallet1 = ethers.Wallet.createRandom();

    const defaultTransactionFields = {
      to: wallet1.address,
      value: ethers.parseEther('1'),
      gasLimit: 650_000
    };


    const snBeforeTransfer = await getServicesNonce(signers[0].address);
    const mnBeforeTransfer = await getMirrorNodeNonce(signers[0].address);

    const newAccTx1 = await signers[0].sendTransaction({
      ...defaultTransactionFields,
      type: 0,
      nonce: snBeforeTransfer,
      gasPrice: enoughGasPrice,
    });
    await newAccTx1.wait();

    const snAfterCreate = await getServicesNonce(signers[0].address);
    const mnAfterCreate = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBeforeTransfer, mnBeforeTransfer, snAfterCreate, mnAfterCreate);
  });

  it('should update nonce upon transaction of type 1', async function () {
    const wallet1 = ethers.Wallet.createRandom();

    const defaultTransactionFields = {
      to: wallet1.address,
      value: ethers.parseEther('1'),
      gasLimit: 650_000
    };

    const snBeforeTransfer = await getServicesNonce(signers[0].address);
    const mnBeforeTransfer = await getMirrorNodeNonce(signers[0].address);

    const newAccTx1 = await signers[0].sendTransaction({
      ...defaultTransactionFields,
      type: 1,
      nonce: snBeforeTransfer,
      gasPrice: enoughGasPrice,
      accessList: [],
    });
    await newAccTx1.wait();

    const snAfterCreate = await getServicesNonce(signers[0].address);
    const mnAfterCreate = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBeforeTransfer, mnBeforeTransfer, snAfterCreate, mnAfterCreate);
  });

  it('should update nonce upon transaction of type 2', async function () {
    const wallet1 = ethers.Wallet.createRandom();

    const defaultTransactionFields = {
      to: wallet1.address,
      value: ethers.parseEther('1'),
      gasLimit: 650_000
    };

    const snBeforeTransfer = await getServicesNonce(signers[0].address);
    const mnBeforeTransfer = await getMirrorNodeNonce(signers[0].address);

    const newAccTx1 = await signers[0].sendTransaction({
      ...defaultTransactionFields,
      type: 2,
      nonce: snBeforeTransfer,
      maxFeePerGas: enoughGasPrice,
      maxPriorityFeePerGas: enoughGasPrice,
    });
    await newAccTx1.wait();

    const snAfterCreate = await getServicesNonce(signers[0].address);
    const mnAfterCreate = await getMirrorNodeNonce(signers[0].address);

    expectIncrementedNonce(snBeforeTransfer, mnBeforeTransfer, snAfterCreate, mnAfterCreate);
  });

  it('should update nonce on hollow account finalization', async function () {
    const wallet = await createNewAccountWithBalance(ethers.parseEther('10'));
    const wallet2 = ethers.Wallet.createRandom().connect(ethers.provider);

    let infoBefore = await Utils.getAccountInfo(wallet.address, sdkClient);
    expect(infoBefore.key._key).to.equal(undefined);

    const snBeforeTransfer = await getServicesNonce(wallet.address);
    const mnBeforeTransfer = await getMirrorNodeNonce(wallet.address);

    const newAccTx1 = await wallet.sendTransaction({
      to: wallet2.address,
      value: Utils.tinybarToWeibarCoef,
      gasLimit: 650_000,
    });
    await newAccTx1.wait();

    let infoAfter = await Utils.getAccountInfo(wallet.address, sdkClient);
    expect(infoAfter.key._key).to.not.equal(undefined);

    const snAfterCreate = await getServicesNonce(wallet.address);
    const mnAfterCreate = await getMirrorNodeNonce(wallet.address);

    expectIncrementedNonce(snBeforeTransfer, mnBeforeTransfer, snAfterCreate, mnAfterCreate);
  });

  it('should not update nonce on hollow account finalization due to reversion when offered gas price and allowance fail check', async function () {
    const wallet = await createNewAccountWithBalance(ethers.parseEther('10'));

    let infoBefore = await Utils.getAccountInfo(wallet.address, sdkClient);
    expect(infoBefore.key._key).to.equal(undefined);

    const snBeforeTransfer = await getServicesNonce(wallet.address);
    const mnBeforeTransfer = await getMirrorNodeNonce(wallet.address);

    await Utils.expectToFail(
        wallet.sendTransaction({
          to: signers[0].address,
          value: Utils.tinybarToWeibarCoef,
          gasPrice: tooLowGasPrice,
          maxGasAllowance: 0,
          gasLimit: 650_000,
        })
    );

    let infoAfter = await Utils.getAccountInfo(wallet.address, sdkClient);
    expect(infoAfter.key._key).to.not.equal(undefined);

    const snAfterCreate = await getServicesNonce(wallet.address);
    const mnAfterCreate = await getMirrorNodeNonce(wallet.address);

    expectNonIncrementedNonce(snBeforeTransfer, mnBeforeTransfer, snAfterCreate, mnAfterCreate);

  });
});
// Filename: test/hip-583/HIP583.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../system-contracts/hedera-token-service/utils');
const Constants = require('../constants');
const {
  pollForNewBalance,
  pollForNewERC721Balance,
  pollForNewHollowWalletBalance,
  pollForNewERC721HollowWalletOwner,
  pollForNewWalletBalance,
} = require('../../utils/helpers');

describe('HIP583 Test Suite', function () {
  let signers;
  let hollowWallet;
  let tokenCreateContract;
  let tokenTransferContract;
  let erc20Contract;
  let erc721Contract;
  let tokenAddress;
  let nftTokenAddress;
  let mintedTokenSerialNumber;
  let mintedTokenSerialNumber1;

  before(async function () {
    signers = await ethers.getSigners();
    tokenCreateContract = await utils.deployTokenCreateContract();
    tokenTransferContract = await utils.deployTokenTransferContract();
    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    erc20Contract = await utils.deployERC20Contract();
    erc721Contract = await utils.deployERC721Contract();
    tokenAddress =
      await utils.createFungibleTokenWithSECP256K1AdminKeyWithoutKYC(
        tokenCreateContract,
        signers[0].address,
        utils.getSignerCompressedPublicKey()
      );
    await utils.updateTokenKeysViaHapi(
      tokenAddress,
      [
        await tokenCreateContract.getAddress(),
        await tokenTransferContract.getAddress(),
      ],
      true,
      true,
      false,
      true,
      true,
      true,
      false
    );
    nftTokenAddress =
      await utils.createNonFungibleTokenWithSECP256K1AdminKeyWithoutKYC(
        tokenCreateContract,
        signers[0].address,
        utils.getSignerCompressedPublicKey()
      );

    await utils.updateTokenKeysViaHapi(
      nftTokenAddress,
      [
        await tokenCreateContract.getAddress(),
        await tokenTransferContract.getAddress(),
      ],
      true,
      true,
      false,
      true,
      true,
      true,
      false
    );
    await utils.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.associateToken(
      tokenCreateContract,
      nftTokenAddress,
      Constants.Contract.TokenCreateContract
    );
  });

  describe('Direct Ethereum Tx', function () {
    describe('Positive', function () {
      describe('HBAR Test', function () {
        let amount;
        let hollowWalletAddress;

        before(async function () {
          hollowWallet = ethers.Wallet.createRandom().connect(ethers.provider);

          hollowWalletAddress = hollowWallet.address;
          amount = ethers.parseEther('0.1');
        });

        it('should be able to create hollow account and transfer HBARs', async function () {
          const hollowWalletBalanceBefore =
            await ethers.provider.getBalance(hollowWalletAddress);

          await signers[0].sendTransaction({
            to: hollowWalletAddress,
            value: amount,
            gasLimit: 1_000_000,
          });

          const hollowWalletBalanceAfter =
            await ethers.provider.getBalance(hollowWalletAddress);

          expect(hollowWalletBalanceBefore).to.eq(0);
          expect(hollowWalletBalanceAfter).to.eq(amount);
        });

        it('should be able to make second HBARs transfer', async function () {
          const hollowWalletBalanceBefore =
            await ethers.provider.getBalance(hollowWalletAddress);

          await signers[0].sendTransaction({
            to: hollowWalletAddress,
            value: amount,
          });

          const hollowWalletBalanceAfter = await pollForNewHollowWalletBalance(
            ethers.provider,
            hollowWallet.address,
            hollowWalletBalanceBefore
          );

          expect(hollowWalletBalanceAfter).to.eq(
            hollowWalletBalanceBefore + amount
          );
        });

        it('should be able to make HBARs transfer and sign it with hollow account', async function () {
          const hollowWalletBalanceBefore =
            await ethers.provider.getBalance(hollowWalletAddress);

          await hollowWallet.sendTransaction({
            to: signers[1].address,
            value: amount,
          });

          const hollowWalletBalanceAfter = await pollForNewHollowWalletBalance(
            ethers.provider,
            hollowWallet.address,
            hollowWalletBalanceBefore
          );

          expect(hollowWalletBalanceAfter).to.lessThanOrEqual(
            hollowWalletBalanceBefore - amount
          );
        });
      });

      describe('Fungible Token Test', function () {
        let hollowWalletAddress;
        let amount;

        before(async function () {
          hollowWallet = ethers.Wallet.createRandom().connect(ethers.provider);

          hollowWalletAddress = hollowWallet.address;
          amount = BigInt(30);
        });

        it('should create hollow account and transfer Fungible Tokens', async function () {
          let signerBalanceBefore = BigInt(
            await erc20Contract.balanceOf(tokenAddress, signers[0].address)
          );

          await tokenTransferContract.transferTokenPublic(
            tokenAddress,
            signers[0].address,
            hollowWalletAddress,
            amount,
            Constants.GAS_LIMIT_10_000_000
          );

          const signerBalanceAfter = await pollForNewWalletBalance(
            erc20Contract,
            tokenAddress,
            signers[0].address,
            signerBalanceBefore
          );

          let hollowalletBalance = await erc20Contract.balanceOf(
            tokenAddress,
            hollowWalletAddress
          );

          expect(signerBalanceAfter).to.eq(signerBalanceBefore - amount);
          expect(hollowalletBalance).to.eq(amount);
        });

        it('should be able to make second Fungible Tokens transfer', async function () {
          let signerBalanceBefore = BigInt(
            await erc20Contract.balanceOf(tokenAddress, signers[0].address)
          );

          let hollowalletBalanceBefore = await erc20Contract.balanceOf(
            tokenAddress,
            hollowWalletAddress
          );

          await tokenTransferContract.transferTokenPublic(
            tokenAddress,
            signers[0].address,
            hollowWalletAddress,
            amount
          );

          const signerBalanceAfter = await pollForNewWalletBalance(
            erc20Contract,
            tokenAddress,
            signers[0].address,
            signerBalanceBefore
          );

          let hollowalletBalanceAfter = await erc20Contract.balanceOf(
            tokenAddress,
            hollowWalletAddress
          );

          expect(signerBalanceAfter).to.eq(signerBalanceBefore - amount);
          expect(hollowalletBalanceAfter).to.eq(
            hollowalletBalanceBefore + amount
          );
        });

        it('should be able to make Fungible Tokens transfer and sign with hollow account', async function () {
          let signerBalanceBefore = BigInt(
            await erc20Contract.balanceOf(tokenAddress, signers[0].address)
          );

          let hollowalletBalanceBefore = await erc20Contract.balanceOf(
            tokenAddress,
            hollowWalletAddress
          );

          //sending some HBARs, so the hollow account have some to cover the transaction
          await signers[0].sendTransaction({
            to: hollowWalletAddress,
            value: ethers.parseEther('14'),
          });

          await utils.updateAccountKeysViaHapi(
            [
              await tokenCreateContract.getAddress(),
              await tokenTransferContract.getAddress(),
            ],
            [hollowWallet.privateKey]
          );

          await tokenTransferContract
            .connect(hollowWallet)
            .transferTokenPublic(
              tokenAddress,
              hollowWalletAddress,
              signers[0].address,
              amount
            );

          const signerBalanceAfter = await pollForNewWalletBalance(
            erc20Contract,
            tokenAddress,
            signers[0].address,
            signerBalanceBefore
          );

          let hollowalletBalanceAfter = await erc20Contract.balanceOf(
            tokenAddress,
            hollowWalletAddress
          );

          expect(signerBalanceAfter).to.eq(signerBalanceBefore + amount);
          expect(hollowalletBalanceAfter).to.eq(
            hollowalletBalanceBefore - amount
          );
        });
      });

      describe('Non-Fungible Token Test', function () {
        let hollowWalletAddress;

        before(async function () {
          hollowWallet = ethers.Wallet.createRandom().connect(ethers.provider);

          hollowWalletAddress = hollowWallet.address;

          mintedTokenSerialNumber = await utils.mintNFTToAddress(
            tokenCreateContract,
            nftTokenAddress
          );

          mintedTokenSerialNumber1 = await utils.mintNFTToAddress(
            tokenCreateContract,
            nftTokenAddress
          );
        });

        it('should create hollow account and transfer Non-Fungible Token', async function () {
          const signerBalanceBefore = await erc721Contract.balanceOf(
            nftTokenAddress,
            signers[0].address
          );

          await tokenTransferContract.transferNFTPublic(
            nftTokenAddress,
            signers[0].address,
            hollowWalletAddress,
            mintedTokenSerialNumber,
            Constants.GAS_LIMIT_10_000_000
          );

          const signerBalanceAfter = await pollForNewERC721Balance(
            erc721Contract,
            nftTokenAddress,
            signers[0].address,
            signerBalanceBefore
          );

          const hollowWalletBalance = await erc721Contract.balanceOf(
            nftTokenAddress,
            hollowWalletAddress
          );

          expect(signerBalanceAfter).to.lessThan(signerBalanceBefore);
          expect(hollowWalletBalance).to.greaterThan(0);
        });

        it('should be able to make second Non-Fungible Token transfer', async function () {
          const signerBalanceBefore = await erc721Contract.balanceOf(
            nftTokenAddress,
            signers[0].address
          );

          const hollowWalletBalanceBefore = await erc721Contract.balanceOf(
            nftTokenAddress,
            hollowWalletAddress
          );

          await tokenTransferContract.transferNFTPublic(
            nftTokenAddress,
            signers[0].address,
            hollowWalletAddress,
            mintedTokenSerialNumber1,
            Constants.GAS_LIMIT_1_000_000
          );

          const signerBalanceAfter = await pollForNewERC721Balance(
            erc721Contract,
            nftTokenAddress,
            signers[0].address,
            signerBalanceBefore
          );

          const hollowWalletBalanceAfter = await erc721Contract.balanceOf(
            nftTokenAddress,
            hollowWalletAddress
          );

          expect(signerBalanceAfter).to.lessThan(signerBalanceBefore);
          expect(hollowWalletBalanceAfter).to.greaterThan(
            hollowWalletBalanceBefore
          );
        });

        it('should be able to make Non-Fungible Token transfer and sign it with hollow account', async function () {
          const signerBalanceBefore = await erc721Contract.balanceOf(
            nftTokenAddress,
            signers[0].address
          );

          const hollowWalletBalanceBefore = await erc721Contract.balanceOf(
            nftTokenAddress,
            hollowWalletAddress
          );

          //sending some HBARs, so the hollow account have some to cover the transaction
          await signers[0].sendTransaction({
            to: hollowWalletAddress,
            value: ethers.parseEther('2'),
          });

          await utils.updateAccountKeysViaHapi(
            [
              await tokenCreateContract.getAddress(),
              await tokenTransferContract.getAddress(),
            ],
            [hollowWallet.privateKey]
          );

          await tokenTransferContract
            .connect(hollowWallet)
            .transferNFTPublic(
              nftTokenAddress,
              hollowWalletAddress,
              signers[0].address,
              mintedTokenSerialNumber1,
              Constants.GAS_LIMIT_1_000_000
            );

          const signerBalanceAfter = await pollForNewERC721Balance(
            erc721Contract,
            nftTokenAddress,
            signers[0].address,
            signerBalanceBefore
          );

          const hollowWalletBalanceAfter = await erc721Contract.balanceOf(
            nftTokenAddress,
            hollowWalletAddress
          );

          expect(signerBalanceAfter).to.greaterThan(signerBalanceBefore);
          expect(hollowWalletBalanceAfter).to.lessThan(
            hollowWalletBalanceBefore
          );
        });
      });
    });

    describe('Negative', function () {
      let hollowWalletAddress;
      let amount;

      before(async function () {
        hollowWallet = ethers.Wallet.createRandom().connect(ethers.provider);

        hollowWalletAddress = hollowWallet.address;
        amount = 30;
      });

      it("shouldn't be able to get balance of hollow account with no prior transfer", async function () {
        try {
          await erc20Contract.balanceOf(tokenAddress, hollowWalletAddress);
        } catch (e) {
          expect(e).to.exist;
          expect(e.code).to.eq(Constants.CALL_EXCEPTION);
        }
      });

      it("shouldn't be able to make transfer from hollow account with no prior transfer", async function () {
        try {
          await hollowWallet.sendTransaction({
            to: signers[0].address,
            value: amount,
          });
        } catch (e) {
          expect(e).to.exist;
        }
      });
    });
  });
});

describe('HIP583 Test Suite - Contract Transfer TX', function () {
  let signers;
  let contractTransferTx;
  const totalAmount = ethers.parseEther('100');
  const amount = ethers.parseEther('1');
  const tokenAmount = 30n;

  before(async function () {
    signers = await ethers.getSigners();
    const contractTransferTxFactory = await ethers.getContractFactory(
      Constants.Contract.ContractTransferTx
    );
    contractTransferTx = await contractTransferTxFactory.deploy();

    await (
      await signers[0].sendTransaction({
        to: await contractTransferTx.getAddress(),
        value: totalAmount,
        gasLimit: 1_000_000,
      })
    ).wait();
  });

  describe('HBAR Test', function () {
    let hollowWallet;

    before(async function () {
      hollowWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    });

    it('should test that hollow account is created and the amount of HBARs is correctly transferred via contract', async function () {
      const hollowWalletBalanceBefore = await ethers.provider.getBalance(
        hollowWallet.address
      );
      const tx = await contractTransferTx.transferTo(
        hollowWallet.address,
        amount / BigInt(utils.tinybarToWeibarCoef),
        Constants.GAS_LIMIT_1_000_000
      );
      await tx.wait();
      const hollowWalletBalanceAfter = await ethers.provider.getBalance(
        hollowWallet.address
      );

      expect(hollowWalletBalanceBefore).to.eq(0);
      expect(hollowWalletBalanceAfter).to.eq(amount);
    });

    it('should test that second transfer HBARs via contract to the hollow account is successful', async function () {
      const hollowWalletBalanceBefore = await ethers.provider.getBalance(
        hollowWallet.address
      );
      const tx = await contractTransferTx.transferTo(
        hollowWallet.address,
        amount / BigInt(utils.tinybarToWeibarCoef),
        Constants.GAS_LIMIT_1_000_000
      );
      await tx.wait();
      const hollowWalletBalanceAfter = await pollForNewHollowWalletBalance(
        ethers.provider,
        hollowWallet.address,
        hollowWalletBalanceBefore
      );

      expect(hollowWalletBalanceAfter).to.eq(
        hollowWalletBalanceBefore + amount
      );
    });

    it('should test that can make HBAR transfer via contract from hollow account to another', async function () {
      const secondHollowWallet = ethers.Wallet.createRandom().connect(
        ethers.provider
      );
      const contractTransferTxWithHollowAccount =
        await contractTransferTx.connect(hollowWallet);
      const secondHollowWalletBefore = await ethers.provider.getBalance(
        secondHollowWallet.address
      );
      const tx = await contractTransferTxWithHollowAccount.transferTo(
        secondHollowWallet.address,
        amount / BigInt(utils.tinybarToWeibarCoef),
        Constants.GAS_LIMIT_1_000_000
      );
      await tx.wait();
      const secondHollowWalletAfter = await ethers.provider.getBalance(
        secondHollowWallet.address
      );

      expect(secondHollowWalletBefore).to.eq(0);
      expect(secondHollowWalletAfter).to.eq(amount);
    });
  });

  describe('Fungible Token Test', function () {
    let hollowWallet;
    let erc20Mock;
    const initialHollowWalletAmount = ethers.parseEther('14');

    before(async function () {
      hollowWallet = ethers.Wallet.createRandom().connect(ethers.provider);

      await (
        await contractTransferTx.transferTo(
          hollowWallet.address,
          initialHollowWalletAmount / BigInt(utils.tinybarToWeibarCoef),
          Constants.GAS_LIMIT_1_000_000
        )
      ).wait();

      erc20Mock = await utils.deployERC20Mock();
      await erc20Mock.mint(await contractTransferTx.getAddress(), 1000);
    });

    it('should create hollow account and transfer Fungible Tokens', async function () {
      const balanceBefore = await erc20Mock.balanceOf(hollowWallet.address);
      const tx = await contractTransferTx.transferFungibleTokenTo(
        await erc20Mock.getAddress(),
        hollowWallet.address,
        tokenAmount
      );
      await tx.wait();
      const balanceAfter = await erc20Mock.balanceOf(hollowWallet.address);

      expect(balanceBefore).to.eq(0);
      expect(balanceAfter).to.eq(tokenAmount);
    });

    it('should test that second transfer fungible tokens via contract to the hollow account is successful', async function () {
      const balanceBefore = await erc20Mock.balanceOf(hollowWallet.address);
      const tx = await contractTransferTx.transferFungibleTokenTo(
        await erc20Mock.getAddress(),
        hollowWallet.address,
        tokenAmount
      );
      await tx.wait();

      const balanceAfter = await pollForNewBalance(
        erc20Mock,
        hollowWallet.address,
        balanceBefore
      );
      expect(balanceAfter).to.eq(balanceBefore + tokenAmount);
    });

    it('should test that can make fungible token transfer via contract from hollow account to another', async function () {
      const secondHollowWallet = ethers.Wallet.createRandom().connect(
        ethers.provider
      );
      const secondHollowWalletBefore = await erc20Mock.balanceOf(
        secondHollowWallet.address
      );
      const contractTransferTxWithHollowAccount =
        await contractTransferTx.connect(hollowWallet);
      const tx =
        await contractTransferTxWithHollowAccount.transferFungibleTokenTo(
          await erc20Mock.getAddress(),
          secondHollowWallet.address,
          tokenAmount
        );
      await tx.wait();

      const secondHollowWalletAfter = await erc20Mock.balanceOf(
        secondHollowWallet.address
      );

      expect(secondHollowWalletBefore).to.eq(0);
      expect(secondHollowWalletAfter).to.eq(tokenAmount);
    });
  });

  describe('Non-fungible Token Test', function () {
    const tokenId = 27;
    let hollowWallet;
    let erc721Mock;
    const initialHollowWalletAmount = ethers.parseEther('20');

    before(async function () {
      hollowWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await (
        await contractTransferTx.transferTo(
          hollowWallet.address,
          initialHollowWalletAmount / BigInt(utils.tinybarToWeibarCoef),
          Constants.GAS_LIMIT_1_000_000
        )
      ).wait();

      erc721Mock = await utils.deployERC721Mock();
      await erc721Mock.mint(await contractTransferTx.getAddress(), tokenId);
    });

    it('should create hollow account and transfer NFT', async function () {
      const ownerBefore = await erc721Mock.ownerOf(tokenId);
      const tx = await contractTransferTx.transferFromNonFungibleTokenTo(
        await erc721Mock.getAddress(),
        await contractTransferTx.getAddress(),
        hollowWallet.address,
        tokenId
      );
      await tx.wait();

      const ownerAfter = await pollForNewERC721HollowWalletOwner(
        erc721Mock,
        tokenId,
        ownerBefore
      );

      expect(ownerBefore).to.not.eq(ownerAfter);
      expect(ownerAfter).to.eq(hollowWallet.address);
    });

    it('should test that second transfer of NFT via contract to the hollow account is successful', async function () {
      const secondTokenId = 31;
      const mintTx = await erc721Mock.mint(
        await contractTransferTx.getAddress(),
        secondTokenId
      );
      await mintTx.wait();

      const tx = await contractTransferTx.transferFromNonFungibleTokenTo(
        await erc721Mock.getAddress(),
        await contractTransferTx.getAddress(),
        hollowWallet.address,
        secondTokenId
      );
      await tx.wait();

      const owner = await erc721Mock.ownerOf(secondTokenId);

      expect(owner).to.eq(hollowWallet.address);
    });

    it('should test that can make NFT transfer via contract from hollow account to another', async function () {
      const secondHollowWallet = ethers.Wallet.createRandom().connect(
        ethers.provider
      );
      const erc721MockHollow = erc721Mock.connect(hollowWallet);
      await (
        await erc721MockHollow.approve(
          await contractTransferTx.getAddress(),
          tokenId
        )
      ).wait();

      const ownerBefore = await erc721Mock.ownerOf(tokenId);
      expect(ownerBefore).to.eq(hollowWallet.address);

      const contractTransferTxWithHollowAccount =
        await contractTransferTx.connect(hollowWallet);

      await (
        await contractTransferTxWithHollowAccount.transferFromNonFungibleTokenTo(
          await erc721Mock.getAddress(),
          hollowWallet.address,
          secondHollowWallet.address,
          tokenId
        )
      ).wait();

      const ownerAfter = await pollForNewERC721HollowWalletOwner(
        erc721Mock,
        tokenId,
        ownerBefore
      );
      expect(ownerAfter).to.eq(secondHollowWallet.address);
    });
  });
});

describe('HIP583 Test Suite - Ethereum Transfer TX via system-contracts', function () {
  let signers;
  let tokenCreateContract;
  let tokenTransferContract;
  let tokenQueryContract;
  let erc20Contract;
  let erc721Contract;

  before(async function () {
    signers = await ethers.getSigners();
    tokenCreateContract = await utils.deployTokenCreateContract();
    tokenQueryContract = await utils.deployTokenQueryContract();
    tokenTransferContract = await utils.deployTokenTransferContract();
    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
      await tokenQueryContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    erc20Contract = await utils.deployERC20Contract();
    erc721Contract = await utils.deployERC721Contract();
  });

  const bootstrapHollowAccount = async function (
    signer,
    hollowWallet,
    tokenCreateContract,
    tokenAddress
  ) {
    await signer.sendTransaction({
      to: hollowWallet.address,
      value: ethers.parseEther('100'),
      gasLimit: 1_000_000,
    });
    await utils.updateAccountKeysViaHapi(
      [await tokenCreateContract.getAddress()],
      [hollowWallet.privateKey]
    );
    const hollowWalletTokenCreateContract =
      await tokenCreateContract.connect(hollowWallet);
    await (
      await hollowWalletTokenCreateContract.associateTokenPublic(
        hollowWallet.address,
        tokenAddress,
        Constants.GAS_LIMIT_1_000_000
      )
    ).wait();
    await (
      await tokenCreateContract.grantTokenKycPublic(
        tokenAddress,
        hollowWallet.address
      )
    ).wait();
  };

  describe('Fungible Token Test', function () {
    const amount = BigInt(27);
    let tokenAddress;
    let hollowWallet;

    before(async function () {
      tokenAddress = await utils.createFungibleTokenWithSECP256K1AdminKey(
        tokenCreateContract,
        signers[0].address,
        utils.getSignerCompressedPublicKey()
      );
      await utils.updateTokenKeysViaHapi(tokenAddress, [
        await tokenCreateContract.getAddress(),
        await tokenTransferContract.getAddress(),
      ]);
      await utils.associateToken(
        tokenCreateContract,
        tokenAddress,
        Constants.Contract.TokenCreateContract
      );
      await utils.grantTokenKyc(tokenCreateContract, tokenAddress);

      hollowWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await bootstrapHollowAccount(
        signers[0],
        hollowWallet,
        tokenCreateContract,
        tokenAddress
      );
    });

    it('should test that hollow account is created and the amount of fungible tokens is correctly transferred via system-contracts', async function () {
      const hollowBalanceBefore = await erc20Contract.balanceOf(
        tokenAddress,
        hollowWallet.address
      );
      await tokenTransferContract.transferTokensPublic(
        tokenAddress,
        [signers[0].address, hollowWallet.address],
        [-amount, amount],
        Constants.GAS_LIMIT_1_000_000
      );

      const hollowBalanceAfter = await pollForNewWalletBalance(
        erc20Contract,
        tokenAddress,
        hollowWallet.address,
        hollowBalanceBefore
      );

      expect(hollowBalanceBefore).to.eq(0);
      expect(hollowBalanceAfter).to.eq(amount);
    });

    it('should test that second transfer fungible tokens via system-contracts to the hollow account is successful', async function () {
      const hollowBalanceBefore = await erc20Contract.balanceOf(
        tokenAddress,
        hollowWallet.address
      );
      await tokenTransferContract.transferTokensPublic(
        tokenAddress,
        [signers[0].address, hollowWallet.address],
        [-amount, amount],
        Constants.GAS_LIMIT_1_000_000
      );

      const hollowBalanceAfter = await pollForNewWalletBalance(
        erc20Contract,
        tokenAddress,
        hollowWallet.address,
        hollowBalanceBefore
      );
      expect(hollowBalanceAfter).to.eq(hollowBalanceBefore + amount);
    });

    it('should test that can make fungible token transfer via system-contracts from hollow account to another', async function () {
      const secondHollowWallet = ethers.Wallet.createRandom().connect(
        ethers.provider
      );
      await bootstrapHollowAccount(
        signers[0],
        secondHollowWallet,
        tokenCreateContract,
        tokenAddress
      );

      await utils.updateAccountKeysViaHapi(
        [await tokenTransferContract.getAddress()],
        [hollowWallet.privateKey]
      );

      const secondHollowBalanceBefore = await erc20Contract.balanceOf(
        tokenAddress,
        secondHollowWallet.address
      );

      const hollowTokenTransferContract =
        await tokenTransferContract.connect(hollowWallet);

      await hollowTokenTransferContract.transferTokensPublic(
        tokenAddress,
        [hollowWallet.address, secondHollowWallet.address],
        [-amount, amount],
        Constants.GAS_LIMIT_1_000_000
      );

      const secondHollowBalanceAfter = await pollForNewWalletBalance(
        erc20Contract,
        tokenAddress,
        secondHollowWallet.address,
        secondHollowBalanceBefore
      );

      expect(secondHollowBalanceBefore).to.eq(0);
      expect(secondHollowBalanceAfter).to.eq(amount);
    });
  });

  describe('Non-Fungible Token Test', function () {
    let nftTokenAddress;
    let hollowWallet;
    let mintedTokenSerialNumber;

    before(async function () {
      nftTokenAddress = await utils.createNonFungibleTokenWithSECP256K1AdminKey(
        tokenCreateContract,
        signers[0].address,
        utils.getSignerCompressedPublicKey()
      );

      await utils.updateTokenKeysViaHapi(nftTokenAddress, [
        await tokenCreateContract.getAddress(),
        await tokenTransferContract.getAddress(),
      ]);

      await utils.associateToken(
        tokenCreateContract,
        nftTokenAddress,
        Constants.Contract.TokenCreateContract
      );

      await utils.grantTokenKyc(tokenCreateContract, nftTokenAddress);

      hollowWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await bootstrapHollowAccount(
        signers[0],
        hollowWallet,
        tokenCreateContract,
        nftTokenAddress
      );

      mintedTokenSerialNumber = await utils.mintNFTToAddress(
        tokenCreateContract,
        nftTokenAddress
      );
    });

    it('should test that hollow account is created and the amount of non-fungible tokens is correctly transferred via system-contracts', async function () {
      const ownerBefore = await erc721Contract.ownerOf(
        nftTokenAddress,
        mintedTokenSerialNumber
      );

      await tokenTransferContract.transferNFTPublic(
        nftTokenAddress,
        signers[0].address,
        hollowWallet.address,
        mintedTokenSerialNumber,
        Constants.GAS_LIMIT_1_000_000
      );

      const ownerAfter = await erc721Contract.ownerOf(
        nftTokenAddress,
        mintedTokenSerialNumber
      );

      expect(ownerBefore).to.eq(signers[0].address);
      expect(ownerAfter).to.eq(hollowWallet.address);
    });

    it('should test that second transfer non-fungible tokens via system-contracts to the hollow account is successful', async function () {
      const newMintedTokenSerialNumber = await utils.mintNFTToAddress(
        tokenCreateContract,
        nftTokenAddress
      );

      const ownerBefore = await erc721Contract.ownerOf(
        nftTokenAddress,
        newMintedTokenSerialNumber
      );

      await tokenTransferContract.transferNFTPublic(
        nftTokenAddress,
        signers[0].address,
        hollowWallet.address,
        newMintedTokenSerialNumber,
        Constants.GAS_LIMIT_1_000_000
      );

      const ownerAfter = await erc721Contract.ownerOf(
        nftTokenAddress,
        newMintedTokenSerialNumber
      );

      expect(ownerBefore).to.eq(signers[0].address);
      expect(ownerAfter).to.eq(hollowWallet.address);
    });

    it('should test that can make non-fungible token transfer via system-contracts from hollow account to another', async function () {
      const secondHollowWallet = ethers.Wallet.createRandom().connect(
        ethers.provider
      );
      await bootstrapHollowAccount(
        signers[0],
        secondHollowWallet,
        tokenCreateContract,
        nftTokenAddress
      );

      const newMintedTokenSerialNumber = await utils.mintNFTToAddress(
        tokenCreateContract,
        nftTokenAddress
      );

      await tokenTransferContract.transferNFTPublic(
        nftTokenAddress,
        signers[0].address,
        hollowWallet.address,
        newMintedTokenSerialNumber,
        Constants.GAS_LIMIT_1_000_000
      );

      const ownerBefore = await erc721Contract.ownerOf(
        nftTokenAddress,
        newMintedTokenSerialNumber
      );
      await utils.updateAccountKeysViaHapi(
        [await tokenTransferContract.getAddress()],
        [hollowWallet.privateKey]
      );

      const hollowTokenTransferContract =
        await tokenTransferContract.connect(hollowWallet);
      await (
        await hollowTokenTransferContract.transferNFTPublic(
          nftTokenAddress,
          hollowWallet.address,
          secondHollowWallet.address,
          newMintedTokenSerialNumber,
          Constants.GAS_LIMIT_1_000_000
        )
      ).wait();

      const ownerAfter = await erc721Contract.ownerOf(
        nftTokenAddress,
        newMintedTokenSerialNumber
      );

      expect(ownerBefore).to.eq(hollowWallet.address);
      expect(ownerAfter).to.eq(secondHollowWallet.address);
    });
  });
});
// Filename: test/multicall/Multicall.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { defaultAbiCoder } = require('@ethersproject/abi');

describe('Multicall Test Suite', function () {
  let multicaller, receiver, reverter, receiverAddress;

  const INVALID_ARGUMENT = 'INVALID_ARGUMENT';
  const RESULT_FIVE =
    '0x0000000000000000000000000000000000000000000000000000000000000005';
  const INPUT_ELEMENT_LENGTH = 266;
  const LONG_INPUT_ABI = 'processLongInput()';
  const LONG_INPUT_PARAMS = ['uint256', 'uint256', 'uint256', 'uint256'];
  const LONG_INPUT_TX_ABI = 'processLongInputTx()';
  const LONG_INPUT_TX_PARAMS = ['uint256', 'uint256', 'uint256', 'uint256'];
  const LONG_OUTPUT_ABI = 'processLongOutput(uint24)';
  const LONG_OUTPUT_PARAMS = ['uint24'];
  const LONG_OUTPUT_TX_ABI = 'processLongOutputTx(uint24)';
  const LONG_OUTPUT_TX_PARAMS = ['uint24'];

  async function deployContract(contractName) {
    const Contract = await ethers.getContractFactory(contractName);
    const _contract = await Contract.deploy({
      gasLimit: 8_000_000,
    });

    return Contract.attach(await _contract.getAddress());
  }

  function encodeCallData(params, abi, paramsEncoding) {
    return ethers.solidityPacked(
      ['bytes4', 'bytes'],
      [
        receiver.interface.getFunction(abi).selector,
        defaultAbiCoder.encode(paramsEncoding, params),
      ]
    );
  }

  function prepareLongInputData(
    iterations,
    abi,
    paramsEncoding,
    callReverter = false
  ) {
    const data = [];
    const addresses = [];
    for (let i = 0; i < iterations; i++) {
      const [a, b, c, d] = [1, 2, 3, 4].map((num) => num * i);
      data.push(encodeCallData([a, b, c, d], abi, paramsEncoding));
      addresses.push(receiverAddress);
    }

    if (callReverter) {
      data.push(encodeCallData([1, 2, 3, 4], abi, paramsEncoding));
      addresses.push(reverter.address);
    }

    const callData = addresses.map((addr, i) => {
      return {
        target: addr,
        callData: data[i],
        allowFailure: false,
      };
    });

    return { callData, data };
  }

  async function multicallProcessLongInput(callData, overrides = {}) {
    return await multicaller.aggregate3.staticCall(callData, {
      gasLimit: 15_000_000,
      ...overrides,
    });
  }

  async function multicallProcessLongInputTx(callData, overrides = {}) {
    return await multicaller.aggregate3(callData, {
      gasLimit: 15_000_000,
      ...overrides,
    });
  }

  async function multicallProcessLongOutput(n) {
    const callData = [];
    for (let i = 0; i < n; i++) {
      callData.push({
        callData: encodeCallData([n], LONG_OUTPUT_ABI, LONG_OUTPUT_PARAMS),
        target: receiverAddress,
        allowFailure: false,
      });
    }

    return multicaller.aggregate3.staticCall(callData, {
      gasLimit: 15_000_000,
    });
  }

  async function multicallProcessLongOutputTx(n) {
    const callData = [];
    for (let i = 0; i < n; i++) {
      callData.push({
        callData: encodeCallData(
          [n],
          LONG_OUTPUT_TX_ABI,
          LONG_OUTPUT_TX_PARAMS
        ),
        target: receiverAddress,
        allowFailure: false,
      });
    }

    return multicaller.aggregate3(callData, {
      gasLimit: 15_000_000,
    });
  }

  function getOutputLengthInBytes(res) {
    let charSum = res.reduce(
      (acc, value) => acc + value.length - 2, // do not count 0x
      0
    );

    // 1 byte = 2 characters
    return Math.floor(charSum / 2);
  }

  function getInputLengthInBytes(res) {
    // 1 byte = 1 character
    return res.reduce((acc, value) => acc + value.length, 0);
  }

  before(async () => {
    multicaller = await deployContract('Multicall3');
    receiver = await deployContract(
      'contracts/multicaller/Receiver.sol:Receiver'
    );
    reverter = await deployContract('Reverter');
    receiverAddress = await receiver.getAddress();
  });

  describe('static calls with large input', async function () {
    it('should be able to aggregate 10 calls to processLongInput', async function () {
      const n = 10;
      const { callData, data } = prepareLongInputData(
        n,
        LONG_INPUT_ABI,
        LONG_INPUT_PARAMS
      );

      const dataSize = getInputLengthInBytes(data);
      expect(dataSize).to.be.eq(n * INPUT_ELEMENT_LENGTH); // data is 2.6 kb

      const res = await multicallProcessLongInput(callData);
      expect(res).to.exist;
      expect(res.length).to.eq(n);
      for (let i = 0; i < n; i++) {
        expect(res[i].success).to.eq(true);
        expect(res[i].returnData).to.eq(RESULT_FIVE);
      }
    });

    // should be able to aggregate 1000 calls to processLongInput - mirror node issue #6731
    it('can currently aggregate 18 calls to processLongInput', async function () {
      const n = 18;
      const { callData, data } = prepareLongInputData(
        n,
        LONG_INPUT_ABI,
        LONG_INPUT_PARAMS
      );

      const dataSize = getInputLengthInBytes(data);
      expect(dataSize).to.be.eq(n * INPUT_ELEMENT_LENGTH); // data is 260 kb

      const res = await multicallProcessLongInput(callData);
      expect(res).to.exist;
      expect(res.length).to.eq(n);
      for (let i = 0; i < n; i++) {
        expect(res[i].success).to.eq(true);
        expect(res[i].returnData).to.eq(RESULT_FIVE);
      }
    });

    it('should NOT be able to aggregate 5000 calls to processLongInput', async function () {
      const n = 5000;
      const { callData, data } = prepareLongInputData(
        n,
        LONG_INPUT_ABI,
        LONG_INPUT_PARAMS
      );

      const dataSize = getInputLengthInBytes(data);
      expect(dataSize).to.be.eq(1330000); // data is 1,3 mb

      // Input size is larger than 1 mb and the call is rejected by the relay
      let hasError = false;
      try {
        await multicallProcessLongInput(callData);
      } catch (e) {
        hasError = true;
      }

      expect(hasError).to.eq(true);
    });

    it('should be able to aggregate 11 calls to processLongInput and handles a revert', async function () {
      let hasError = false;
      try {
        const { callData } = prepareLongInputData(
          10,
          LONG_INPUT_ABI,
          LONG_INPUT_PARAMS,
          true
        );
        await multicallProcessLongInput(callData);
      } catch (e) {
        hasError = true;
        expect(e.code).to.exist;
        expect(e.code).to.eq(INVALID_ARGUMENT);
      }

      expect(hasError).to.eq(true);
    });
  });

  describe('static calls with large output', async function () {
    it('should be able to aggregate 10 calls to processLongOutput and handle 13 kb of output data', async function () {
      const n = 10;
      const res = await multicallProcessLongOutput(n);
      expect(res).to.exist;
      expect(res.length).to.eq(n);
      const bytes = getOutputLengthInBytes(res.map((r) => r.returnData));
      expect(bytes).to.gte(13000); // 13 kb
    });

    // should be able to aggregate 80 calls to processLongOutput and handle 820 kb of output data - mirror node issue #6731
    it('can aggregate 18 calls to processLongOutput and handle 42624 bytes of output data', async function () {
      const n = 18;
      const res = await multicallProcessLongOutput(n);
      expect(res).to.exist;
      expect(res.length).to.eq(n);
      const bytes = getOutputLengthInBytes(res.map((r) => r.returnData));
      expect(bytes).to.gte(42624);
    });

    it('should NOT be able to aggregate 585 calls to processLongOutput', async function () {
      // @note: since mirror-node@v0.105.0, the maximum data size was increased to 128 KiB.
      const maxDataSize = 128 * 1024 * 2; // 262144 characters - 128 KiB
      const n = 585; // 262218 characters ~ 128.03 KiB

      let hasError = false;
      try {
        await multicallProcessLongOutput(n);
      } catch (e) {
        hasError = true;
        expect(e).to.exist;
        expect(e.message).to.exist;

        // Output is too large and the call is reverted.
        // The call exceeded the call size limit of 128 KiB
        const EXPECTED_ERROR_MESSAGE = `exceeds ${maxDataSize} characters`;
        expect(e.message).to.contain(EXPECTED_ERROR_MESSAGE);
      }
      expect(hasError).to.eq(true);
    });
  });

  describe('payable calls with large input', async function () {
    const overrides = { value: 10000000000000 };

    it('should be able to aggregate 10 calls to processLongInputTx', async function () {
      const n = 10;
      const { callData, data } = prepareLongInputData(
        n,
        LONG_INPUT_TX_ABI,
        LONG_INPUT_TX_PARAMS
      );

      const dataSize = getInputLengthInBytes(data);
      expect(dataSize).to.be.eq(n * INPUT_ELEMENT_LENGTH); // input data is 2.6 kb

      const res = await multicallProcessLongInputTx(callData, overrides);
      expect(res).to.exist;
      const receipt = await res.wait();
      expect(receipt).to.exist;
      expect(receipt.status).to.eq(1);
    });

    it('should be able to aggregate 130 calls to processLongInputTx', async function () {
      const n = 130;
      const { callData, data } = prepareLongInputData(
        n,
        LONG_INPUT_TX_ABI,
        LONG_INPUT_TX_PARAMS
      );

      const dataSize = getInputLengthInBytes(data);
      expect(dataSize).to.be.eq(n * INPUT_ELEMENT_LENGTH); // input data is 34 kb

      const res = await multicallProcessLongInputTx(callData, overrides);
      expect(res).to.exist;
      const receipt = await res.wait();
      expect(receipt).to.exist;
      expect(receipt.status).to.eq(1);
    });

    it('should NOT be able to aggregate 200 calls to processLongInputTx', async function () {
      const n = 200;
      const { callData, data } = prepareLongInputData(
        n,
        LONG_INPUT_TX_ABI,
        LONG_INPUT_TX_PARAMS
      );

      const dataSize = getInputLengthInBytes(data);
      expect(dataSize).to.be.eq(n * INPUT_ELEMENT_LENGTH); // input data is 53 kb

      // Call is reverted because the input data exceeds the maximum transaction size
      let hasError = false;
      try {
        await multicallProcessLongInputTx(callData, overrides);
      } catch (e) {
        hasError = true;
      }

      expect(hasError).to.eq(true);
    });
  });

  describe('executes multiple state-changing methods', async function () {
    it('should be able to aggregate 10 calls to processLongOutputTx', async function () {
      const n = 10;
      const receiverCounterAtStart = await receiver.counter();
      const res = await multicallProcessLongOutputTx(n);
      expect(res).to.exist;
      const receipt = await res.wait();
      expect(receipt).to.exist;
      expect(receipt.status).to.eq(1);
      expect(receipt.logs).to.exist;

      // Every processLongOutputTx call emits an event
      expect(receipt.logs.length).to.eq(n);
      for (let i = 0n; i < n; i++) {
        expect(receipt.logs[i].data).to.eq(
          '0x' +
            Number(receiverCounterAtStart + i + 1n)
              .toString(16)
              .padStart(64, '0')
        );
      }

      // Note: It is not possible to measure the returned data from a state modifying method
    });
  });
});
// Filename: test/network/key-rotation.js
// SPDX-License-Identifier: Apache-2.0

const {
  Hbar,
  Status,
  PrivateKey,
  AccountInfoQuery,
  AccountCreateTransaction,
  AccountUpdateTransaction,
} = require('@hashgraph/sdk');
const { expect } = require('chai');
const Utils = require('../system-contracts/hedera-token-service/utils');

describe('Key Rotation Test Suite', function () {
  let client;
  let accountId_Alpha;
  let accountPrivateKey_Alpha;
  let accountPublicKey_Alpha;
  let accountEvmAddress_Alpha;

  beforeEach(async function () {
    client = await Utils.createSDKClient();

    // Generate a new ECDSA keys
    accountPrivateKey_Alpha = PrivateKey.generateECDSA();
    accountPublicKey_Alpha = accountPrivateKey_Alpha.publicKey;
    accountEvmAddress_Alpha = accountPublicKey_Alpha.toEvmAddress();

    // Create new account and assign the ECDSA public key as admin key
    const newAccountAlphaTx = await new AccountCreateTransaction()
      .setKey(accountPublicKey_Alpha)
      .setInitialBalance(Hbar.fromTinybars(1000))
      .setAlias(accountEvmAddress_Alpha)
      .execute(client);

    // Get the new account ID
    const newAccountAlphaTxRceipt = await newAccountAlphaTx.getReceipt(client);
    accountId_Alpha = newAccountAlphaTxRceipt.accountId;

    console.log('\n>>>>>>> accountId_Alpha <<<<<<<');
    console.log(`- accountId: ${accountId_Alpha}`);
    console.log(`- public key: ${accountPublicKey_Alpha}`);
    console.log(`- evm address: ${accountEvmAddress_Alpha}`);
  });

  it('Should remain the same EVM key alias after key rotation with a different ECDSA key', async function () {
    // Generate a new ECDSA key
    const accountPrivateKey_Beta = PrivateKey.generateECDSA();
    const accountPublicKey_Beta = accountPrivateKey_Beta.publicKey;
    const accountEvmAddress_Beta = accountPublicKey_Beta.toEvmAddress();

    // Create the transaction to rotate and change the key to a different ECDSA key
    const accountUpdateTransaction = new AccountUpdateTransaction()
      .setAccountId(accountId_Alpha)
      .setKey(accountPublicKey_Beta)
      .freezeWith(client);

    // Sign with the old key
    const signTxByAlpha = await accountUpdateTransaction.sign(
      accountPrivateKey_Alpha
    );

    // Sign with the new key
    const signTxByBeta = await signTxByAlpha.sign(accountPrivateKey_Beta);

    // Submit the transaction
    const txResponse = await signTxByBeta.execute(client);

    // Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    // Get the transaction consensus status
    const transactionStatus = receipt.status;
    expect(transactionStatus).to.equal(Status.Success);

    // Check the account info after key rotation
    const accountInfoAfterKeyRotation = await new AccountInfoQuery()
      .setAccountId(accountId_Alpha)
      .execute(client);

    console.log('>>>>>>> accountInfoAfterKeyRotation - ECDSA <<<<<<<');
    console.log(`- accountId: ${accountInfoAfterKeyRotation.accountId}`);
    console.log(`- public key: ${accountInfoAfterKeyRotation.key}`);
    console.log(
      `- evm address: ${accountInfoAfterKeyRotation.contractAccountId}`
    );

    // expect the account ID to be the same
    expect(accountInfoAfterKeyRotation.accountId).to.deep.equal(
      accountId_Alpha
    );

    // expect the key to be the new key
    expect(accountInfoAfterKeyRotation.key).to.deep.equal(
      accountPublicKey_Beta
    );

    // expect the key to not be the old key
    expect(accountInfoAfterKeyRotation.key).to.not.deep.equal(
      accountPublicKey_Alpha
    );

    // expect the contract account ID to be the same
    expect(accountInfoAfterKeyRotation.contractAccountId).to.equal(
      accountEvmAddress_Alpha
    );

    // expect the contract account ID to not be the old EVM address
    expect(accountInfoAfterKeyRotation.contractAccountId).to.not.equal(
      accountEvmAddress_Beta
    );
  });

  it('Should remain the same EVM key alias after key rotation with a different ED25519 key', async function () {
    // Generate a new ECDSA key
    const accountPrivateKey_Charlie = PrivateKey.generateED25519();
    const accountPublicKey_Charlie =
      accountPrivateKey_Charlie.publicKey.toStringDer();

    // Create the transaction to rotate and change the key to a different ED25519 key
    const accountUpdateTransaction = new AccountUpdateTransaction()
      .setAccountId(accountId_Alpha)
      .setKey(accountPrivateKey_Charlie.publicKey)
      .freezeWith(client);

    // Sign with the old key
    const signTxByAlpha = await accountUpdateTransaction.sign(
      accountPrivateKey_Alpha
    );

    // Sign with the new key
    const signTxByCharlie = await signTxByAlpha.sign(accountPrivateKey_Charlie);

    // Submit the transaction
    const txResponse = await signTxByCharlie.execute(client);

    // Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    // Get the transaction consensus status
    const transactionStatus = receipt.status;
    expect(transactionStatus).to.equal(Status.Success);

    // Check the account info after key rotation
    const accountInfoAfterKeyRotation = await new AccountInfoQuery()
      .setAccountId(accountId_Alpha)
      .execute(client);

    console.log('>>>>>>> accountInfoAfterKeyRotation - ED25519 <<<<<<<');
    console.log(`- accountId: ${accountInfoAfterKeyRotation.accountId}`);
    console.log(`- public key: ${accountInfoAfterKeyRotation.key}`);
    console.log(
      `- evm address: ${accountInfoAfterKeyRotation.contractAccountId}`
    );

    // expect the account ID to be the same
    expect(accountInfoAfterKeyRotation.accountId).to.deep.equal(
      accountId_Alpha
    );

    // expect the key to be the new key
    expect(accountInfoAfterKeyRotation.key.toStringDer()).to.deep.equal(
      accountPublicKey_Charlie
    );

    // expect the key to not be the old key
    expect(accountInfoAfterKeyRotation.key).to.not.deep.equal(
      accountPublicKey_Alpha
    );

    // expect the contract account ID to be the same
    expect(accountInfoAfterKeyRotation.contractAccountId).to.equal(
      accountEvmAddress_Alpha
    );
  });
});
// Filename: test/openzeppelin/ERC-1155/ERC1155.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZERC1155 Test Suite', function () {
  const uri = 'testuri';
  const tokenId1 = 1;
  const tokenId2 = 33;
  const token1InitialMint = 100;
  const token2InitialMint = 300;
  const tradeableAmount = 10;
  let signers;
  let erc1155;

  before(async function () {
    signers = await ethers.getSigners();

    const factory = await ethers.getContractFactory(
      Constants.Contract.ERC1155Mock
    );
    erc1155 = await factory.deploy(uri);
    await erc1155.mintBatch(
      signers[0].address,
      [tokenId1, tokenId2],
      [token1InitialMint, token2InitialMint],
      '0x'
    );
  });

  it('should be able to execute uri(uint256) and returns the same URI for all token types', async function () {
    const res1 = await erc1155.uri(tokenId1);
    const res2 = await erc1155.uri(tokenId2);
    const res3 = await erc1155.uri(3);
    expect(res1).to.eq(res2).to.eq(res3);
  });

  it('should be able to execute balanceOf(address,uint256)', async function () {
    const res = await erc1155.balanceOf(signers[0].address, tokenId1);
    expect(res).to.eq(token1InitialMint);
    const res2 = await erc1155.balanceOf(signers[0].address, tokenId2);
    expect(res2).to.eq(token2InitialMint);
  });

  it('should be able to execute balanceOfBatch(address[],uint256[])', async function () {
    const res = await erc1155.balanceOfBatch(
      [signers[0].address, signers[0].address],
      [tokenId1, tokenId2]
    );
    expect(res[0]).to.eq(token1InitialMint);
    expect(res[1]).to.eq(token2InitialMint);
  });

  it('should be able to execute setApprovalForAll(address,bool)', async function () {
    const res = await erc1155.setApprovalForAll(signers[1].address, true);
    expect(
      (await res.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ApprovalForAll
      )
    ).to.not.be.empty;
  });

  it('should be able to execute isApprovedForAll(address,address)', async function () {
    const res = await erc1155.isApprovedForAll(
      signers[0].address,
      signers[1].address
    );
    expect(res).to.eq(true);
  });

  it('should be able to execute safeTransferFrom(address,address,uint256,uint256,bytes)', async function () {
    const balanceBefore = await erc1155.balanceOf(signers[1].address, tokenId1);
    const tx = await erc1155.safeTransferFrom(
      signers[0].address,
      signers[1].address,
      tokenId1,
      tradeableAmount,
      '0x'
    );
    await tx.wait();
    const balanceAfter = await erc1155.balanceOf(signers[1].address, tokenId1);

    expect(balanceBefore).to.not.eq(balanceAfter);
    expect(balanceAfter).to.eq(parseInt(balanceBefore) + tradeableAmount);
  });

  it('should be able to execute safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)', async function () {
    const balanceBefore1 = await erc1155.balanceOf(
      signers[1].address,
      tokenId1
    );
    const balanceBefore33 = await erc1155.balanceOf(
      signers[1].address,
      tokenId2
    );
    const tx = await erc1155.safeBatchTransferFrom(
      signers[0].address,
      signers[1].address,
      [tokenId1, tokenId2],
      [tradeableAmount, tradeableAmount],
      '0x',
      Constants.GAS_LIMIT_1_000_000
    );
    await tx.wait();

    const balanceAfter1 = await erc1155.balanceOf(signers[1].address, tokenId1);
    const balanceAfter33 = await erc1155.balanceOf(
      signers[1].address,
      tokenId2
    );

    expect(balanceBefore1).to.not.eq(balanceAfter1);
    expect(balanceAfter1).to.eq(parseInt(balanceBefore1) + tradeableAmount);
    expect(balanceBefore33).to.not.eq(balanceAfter33);
    expect(balanceAfter33).to.eq(parseInt(balanceBefore33) + tradeableAmount);
  });
});
// Filename: test/openzeppelin/ERC-1155/ERC1155Token.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const { CALL_EXCEPTION } = require('../../constants');

describe('@OZERC1155Token Test Suite', () => {
  let erc1155Token, wallet1, wallet2;

  const TOKEN_URI = '_token_uri_';
  const NEW_TOKEN_URI = '_new_token_uri_';
  const TOKEN_ID = 3679;
  const MINTED_AMOUNT = 79;
  const TRANSFER_AMOUNT = 30;
  const BURNT_AMOUNT = 39;
  const EMPTY_DATA = '0x';
  const TOKEN_IDS = [3, 6, 9];
  const MINTED_AMOUNTS = [30, 60, 90];
  const BURNT_AMOUNTS = [3, 6, 9];
  const TRANSFER_AMOUNTS = [12, 15, 18];

  beforeEach(async () => {
    [wallet1, wallet2] = await ethers.getSigners();

    const erc1155TokenFac = await ethers.getContractFactory(
      Constants.Contract.ERC1155Token
    );
    erc1155Token = await erc1155TokenFac.deploy(TOKEN_URI);
  });

  it('Should deploy erc1155Token', async () => {
    expect(await erc1155Token.owner()).to.eq(wallet1.address);
    expect(ethers.isAddress(await erc1155Token.getAddress())).to.be.true;
  });

  it('Should be able to mint a new token', async () => {
    const tx = await erc1155Token
      .connect(wallet1)
      .mint(wallet2.address, TOKEN_ID, MINTED_AMOUNT, EMPTY_DATA);
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment.name === 'Minted');

    expect(event.args.id).to.eq(TOKEN_ID);
    expect(event.args.data).to.eq(EMPTY_DATA);
    expect(event.args.amount).to.eq(MINTED_AMOUNT);
    expect(event.args.account).to.eq(wallet2.address);
  });

  it('Should be able to mint new tokens in batch', async () => {
    const tx = await erc1155Token
      .connect(wallet1)
      .mintBatch(wallet2.address, TOKEN_IDS, MINTED_AMOUNTS, EMPTY_DATA);
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment.name === 'MintedBatch');

    expect(event.args.data).to.eq(EMPTY_DATA);
    expect(event.args.to).to.eq(wallet2.address);
    expect(event.args.ids.length).to.eq(TOKEN_IDS.length);
    expect(event.args.amounts.length).to.eq(MINTED_AMOUNTS.length);

    event.args.ids.forEach((id, index) => {
      expect(id).to.eq(TOKEN_IDS[index]);
    });
    event.args.amounts.forEach((amount, index) => {
      expect(amount).to.eq(MINTED_AMOUNTS[index]);
    });
  });

  it('Should check the balance of an address in batch', async () => {
    const mint1Tx = await erc1155Token.mint(
      wallet1.address,
      TOKEN_IDS[0],
      MINTED_AMOUNTS[0],
      EMPTY_DATA
    );
    await mint1Tx.wait();

    const mint2Tx = await erc1155Token.mint(
      wallet2.address,
      TOKEN_IDS[1],
      MINTED_AMOUNTS[1],
      EMPTY_DATA
    );
    await mint2Tx.wait();

    const balanceBatch = await erc1155Token.balanceOfBatch(
      [wallet1.address, wallet2.address],
      [TOKEN_IDS[0], TOKEN_IDS[1]]
    );
    expect(balanceBatch.length).to.eq(2);
    balanceBatch.forEach((bal, index) => {
      expect(bal).to.eq(BigInt(MINTED_AMOUNTS[index]));
    });
  });

  it('Should check the existance of a token ID', async () => {
    const beforeMintExisted = await erc1155Token.exists(TOKEN_ID);
    const mintTx = await erc1155Token
      .connect(wallet1)
      .mint(wallet2.address, TOKEN_ID, MINTED_AMOUNT, EMPTY_DATA);
    await mintTx.wait();

    const afterMintExisted = await erc1155Token.exists(TOKEN_ID);

    expect(beforeMintExisted).to.be.false;
    expect(afterMintExisted).to.be.true;
  });

  it('Should retireve the total supply of a token ID', async () => {
    /**
     * @notice as there are two different selectors with the same interfaceID, it's needed to specify the interfaceID as bellow
     */
    const beforeMintBalance = await erc1155Token['totalSupply(uint256)'](
      TOKEN_ID
    );
    const mintTx = await erc1155Token
      .connect(wallet1)
      .mint(wallet2.address, TOKEN_ID, MINTED_AMOUNT, EMPTY_DATA);
    await mintTx.wait();

    /**
     * @notice as there are two different selectors with the same interfaceID, it's needed to specify the interfaceID as bellow
     */
    const afterMintBalance = await erc1155Token['totalSupply(uint256)'](
      TOKEN_ID
    );

    expect(beforeMintBalance).to.eq(0);
    expect(afterMintBalance).to.eq(MINTED_AMOUNT);
  });

  it('Should retrieve the total supply of the whole contract', async () => {
    const mintBatchTx = await erc1155Token
      .connect(wallet1)
      .mintBatch(wallet2.address, TOKEN_IDS, MINTED_AMOUNTS, EMPTY_DATA);
    await mintBatchTx.wait();

    const expectedTotalySupply = MINTED_AMOUNTS.reduce((a, c) => a + c, 0);

    /**
     * @notice as there are two different selectors with the same interfaceID, it's needed to specify the interfaceID as bellow
     */
    const totalSupply = await erc1155Token['totalSupply()']();

    expect(totalSupply).to.eq(expectedTotalySupply);
  });

  it('Should set approval for all tokens for an operator', async () => {
    const tx = await erc1155Token
      .connect(wallet1)
      .setApprovalForAll(wallet2.address, true);
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (e) => e.fragment.name === 'ApprovalForAll'
    );

    expect(event.args.account).to.eq(wallet1.address);
    expect(event.args.operator).to.eq(wallet2.address);
    expect(event.args.approved).to.eq(true);
  });

  it("Should check if an address is another address's operator", async () => {
    const beforeApproval = await erc1155Token.isApprovedForAll(
      wallet1.address,
      wallet2.address
    );
    await erc1155Token
      .connect(wallet1)
      .setApprovalForAll(wallet2.address, true);
    const afterApproval = await erc1155Token.isApprovedForAll(
      wallet1.address,
      wallet2.address
    );

    expect(beforeApproval).to.be.false;
    expect(afterApproval).to.be.true;
  });

  it('Should transfer the ownership to another account', async () => {
    const tx = await erc1155Token
      .connect(wallet1)
      .transferOwnership(wallet2.address);
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (e) => (e.fragment.name = 'OwnershipTransferred')
    );

    expect(event.args.previousOwner).to.eq(wallet1.address);
    expect(event.args.newOwner).to.eq(wallet2.address);
  });

  it('Should NOT transfer the ownership to another account if the caller is not owner', async () => {
    const currentOwner = await erc1155Token.owner();
    expect(currentOwner).to.not.eq(wallet2.address);

    expect(
      erc1155Token.connect(wallet2).transferOwnership(wallet2.address)
    ).to.eventually.be.rejected.and.have.property('code', CALL_EXCEPTION);
  });

  it('Should retrieve the token uri of a tokenID', async () => {
    expect(await erc1155Token.uri(TOKEN_ID)).to.eq(TOKEN_URI);
  });

  it('Should set a new token URI', async () => {
    const tx = await erc1155Token.setURI(NEW_TOKEN_URI);
    await tx.wait();
    expect(await erc1155Token.uri(TOKEN_ID)).to.eq(NEW_TOKEN_URI);
  });

  it('Should burn token', async () => {
    const mintTx = await erc1155Token.mint(
      wallet2.address,
      TOKEN_ID,
      MINTED_AMOUNT,
      EMPTY_DATA,
      Constants.GAS_LIMIT_1_000_000
    );
    await mintTx.wait();

    const burnTx = await erc1155Token
      .connect(wallet2)
      .burn(
        wallet2.address,
        TOKEN_ID,
        BURNT_AMOUNT,
        Constants.GAS_LIMIT_1_000_000
      );
    await burnTx.wait();

    const balance = await erc1155Token.balanceOf(wallet2.address, TOKEN_ID);
    expect(balance).to.eq(BigInt(MINTED_AMOUNT - BURNT_AMOUNT));
  });

  it('Should NOT burn insufficient amount of token', async () => {
    expect(
      erc1155Token
        .connect(wallet2)
        .burn(wallet2.address, TOKEN_ID, BURNT_AMOUNT)
    ).to.eventually.be.rejected.and.have.property('code', CALL_EXCEPTION);
  });

  it('Should burn token in batch', async () => {
    const mintBatchTx = await erc1155Token
      .connect(wallet1)
      .mintBatch(
        wallet2.address,
        TOKEN_IDS,
        MINTED_AMOUNTS,
        EMPTY_DATA,
        Constants.GAS_LIMIT_1_000_000
      );
    await mintBatchTx.wait();

    const burnBatchTx = await erc1155Token
      .connect(wallet2)
      .burnBatch(
        wallet2.address,
        TOKEN_IDS,
        BURNT_AMOUNTS,
        Constants.GAS_LIMIT_1_000_000
      );
    await burnBatchTx.wait();

    const balanceBatch = await erc1155Token.balanceOfBatch(
      [wallet2.address, wallet2.address, wallet2.address],
      TOKEN_IDS
    );

    balanceBatch.forEach((b, i) => {
      expect(b).to.eq(BigInt(MINTED_AMOUNTS[i] - BURNT_AMOUNTS[i]));
    });
  });

  it('Should allow an operator to transfer a token to another account', async () => {
    const mintTx = await erc1155Token.mint(
      wallet2.address,
      TOKEN_ID,
      MINTED_AMOUNT,
      EMPTY_DATA
    );
    await mintTx.wait();

    const setApprovalTx = await erc1155Token
      .connect(wallet2)
      .setApprovalForAll(wallet1.address, true);

    await setApprovalTx.wait();

    const tx = await erc1155Token.safeTransferFrom(
      wallet2.address,
      wallet1.address,
      TOKEN_ID,
      TRANSFER_AMOUNT,
      EMPTY_DATA
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (e) => e.fragment.name === 'TransferSingle'
    );

    expect(event.args.operator).to.eq(wallet1.address);
    expect(event.args.from).to.eq(wallet2.address);
    expect(event.args.to).to.eq(wallet1.address);
    expect(event.args.id).to.eq(TOKEN_ID);
    expect(event.args.value).to.eq(TRANSFER_AMOUNT);

    const wallet1Balance = await erc1155Token.balanceOf(
      wallet1.address,
      TOKEN_ID
    );
    const wallet2Balance = await erc1155Token.balanceOf(
      wallet2.address,
      TOKEN_ID
    );

    expect(wallet1Balance).to.eq(TRANSFER_AMOUNT);
    expect(wallet2Balance).to.eq(MINTED_AMOUNT - TRANSFER_AMOUNT);
  });

  it('Should allow an operator to transfer tokens in batch to another account', async () => {
    const mintBatchTx = await erc1155Token
      .connect(wallet1)
      .mintBatch(wallet2.address, TOKEN_IDS, MINTED_AMOUNTS, EMPTY_DATA);
    await mintBatchTx.wait();

    const setApprovalForAllTx = await erc1155Token
      .connect(wallet2)
      .setApprovalForAll(wallet1.address, true);
    await setApprovalForAllTx.wait();

    const tx = await erc1155Token.safeBatchTransferFrom(
      wallet2.address,
      wallet1.address,
      TOKEN_IDS,
      TRANSFER_AMOUNTS,
      EMPTY_DATA
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment.name === 'TransferBatch');

    expect(event.args.operator).to.eq(wallet1.address);
    expect(event.args.from).to.eq(wallet2.address);
    expect(event.args.to).to.eq(wallet1.address);
    expect(event.args.ids.length).to.eq(TOKEN_IDS.length);
    expect(event.args[4].length).to.eq(TRANSFER_AMOUNTS.length);

    event.args.ids.forEach((id, index) => {
      expect(id).to.eq(TOKEN_IDS[index]);
    });
    event.args[4].forEach((amount, index) => {
      expect(amount).to.eq(TRANSFER_AMOUNTS[index]);
    });
  });

  it('Should NOT allow a non-operator to transfer tokens to another account', async () => {
    const mintTx = await erc1155Token.mint(
      wallet2.address,
      TOKEN_ID,
      MINTED_AMOUNT,
      EMPTY_DATA
    );
    await mintTx.wait();

    expect(
      erc1155Token.safeTransferFrom(
        wallet2.address,
        wallet1.address,
        TOKEN_ID,
        TRANSFER_AMOUNT,
        EMPTY_DATA
      )
    ).to.eventually.be.rejected.and.have.property('code', CALL_EXCEPTION);
  });
});
// Filename: test/openzeppelin/ERC-165/erc165.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZERC165 Support Interface Test Suite', function () {
  let contract, climberSelectorContract;

  before(async function () {
    signers = await ethers.getSigners();

    const factory = await ethers.getContractFactory(
      Constants.Contract.Test_ERC165
    );
    contract = await factory.deploy();

    const ClimberSelectorFactory = await ethers.getContractFactory(
      Constants.Contract.ClimberSelector
    );
    climberSelectorContract = await ClimberSelectorFactory.deploy();

    climberInterface = new ethers.Interface([
      'function hasHarness()',
      'function hasChalk()',
      'function hasClimbingShoes()',
    ]);
  });

  it('should confirm support for: ERC-165', async function () {
    const selector = climberSelectorContract.calculateSelector();
    const supports = await contract.supportsInterface(selector);
    expect(supports).to.equal(true);
  });

  it('should confirm support for: ERC-165 -> Selector not suported', async function () {
    const selector = climberSelectorContract.calculateSelectorNotSupported();
    const supports = await contract.supportsInterface(selector);
    expect(supports).to.equal(false);
  });
});
// Filename: test/openzeppelin/ERC-1967-Upgrade/Vote.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
const Constants = require('../../constants');
const { GAS_LIMIT_1_000_000, CALL_EXCEPTION } = require('../../constants');
const HederaSmartContractsRootPath = path.resolve(__dirname, '..', '..', '..');

const VoteV1Artifact = JSON.parse(
  fs.readFileSync(
    `${HederaSmartContractsRootPath}/artifacts/contracts/openzeppelin/ERC-1967-Upgrade/VoteV1.sol/VoteV1.json`
  )
);

const VoteV2Artifact = JSON.parse(
  fs.readFileSync(
    `${HederaSmartContractsRootPath}/artifacts/contracts/openzeppelin/ERC-1967-Upgrade/VoteV2.sol/VoteV2.json`
  )
);

describe('@OZERC1967Upgrade Upgradable Vote Test Suite', () => {
  let admin, voter1, voter2;
  let voteV1, voteV2, proxiedVoteV1, proxiedVoteV2, voteProxy;
  const EMPTY_DATA = '0x';

  before(async () => {
    [admin, voter1, voter2] = await ethers.getSigners();

    const VoteV1Fac = await ethers.getContractFactory(
      Constants.Contract.VoteV1
    );
    voteV1 = await VoteV1Fac.deploy();
    await voteV1.waitForDeployment();

    const VoteV2Fac = await ethers.getContractFactory(
      Constants.Contract.VoteV2
    );
    voteV2 = await VoteV2Fac.deploy();
    await voteV2.waitForDeployment();

    const VoteProxyFac = await ethers.getContractFactory(
      Constants.Contract.VoteProxy
    );
    voteProxy = await VoteProxyFac.deploy(await voteV1.getAddress());
    await voteProxy.waitForDeployment();
  });

  describe('Proxy Contract tests', () => {
    it('Should deploy vote proxy contract with the with voteV1 being the current logic contract', async () => {
      expect(await voteProxy.implementation()).to.eq(await voteV1.getAddress());
    });

    it('Should upgrade proxy vote to point to voteV2', async () => {
      const tx = await voteProxy.upgradeToAndCall(
        await voteV2.getAddress(),
        EMPTY_DATA
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find((e) => e.fragment.name === 'Upgraded');

      expect(event.args.implementation).to.eq(await voteV2.getAddress());
      expect(await voteProxy.implementation()).to.eq(await voteV2.getAddress());
    });

    it('Should be able to get the predefined ERC1967 IMPLEMENTATION_SLOT', async () => {
      // @logic ERC1967.IMPLEMENTATION_SLOT is obtained as bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)

      // keccak256('eip1967.proxy.implementation')
      const eip1967ImplByte32 = ethers.keccak256(
        ethers.toUtf8Bytes('eip1967.proxy.implementation')
      );

      // uint256(keccak256('eip1967.proxy.implementation')) - 1
      const eip1967ImplUint256 = BigInt(eip1967ImplByte32) - 1n;

      // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
      const expectedImplementationSlot = ethers.zeroPadValue(
        '0x' + eip1967ImplUint256.toString(16),
        32
      );

      expect(await voteProxy.getImplementationSlot()).to.eq(
        expectedImplementationSlot
      );
    });

    it('Should deploy vote proxy contract with a new proxy admin', async () => {
      expect(await voteProxy.getCurrentAdmin()).to.eq(await admin.getAddress());
    });

    it('Should be able to get the predefined ERC1967 ADMIN_SLOT', async () => {
      // @logic ERC1967.ADMIN_SLOT is obtained as bytes32(uint256(keccak256('eip1967.proxy.admin')) - 1)

      // keccak256('eip1967.proxy.admin')
      const eip1967ImplByte32 = ethers.keccak256(
        ethers.toUtf8Bytes('eip1967.proxy.admin')
      );

      // uint256(keccak256('eip1967.proxy.admin')) - 1
      const eip1967AdminUint256 = BigInt(eip1967ImplByte32) - 1n;

      // bytes32(uint256(keccak256('eip1967.proxy.admin')) - 1)
      const expectedAdminSlot = ethers.zeroPadValue(
        '0x' + eip1967AdminUint256.toString(16),
        32
      );

      expect(await voteProxy.getAdminSlot()).to.eq(expectedAdminSlot);
    });

    it('Should be able to change the current proxy admin to a new address', async () => {
      const tx = await voteProxy.changeAdmin(await voter1.getAddress());
      const receipt = await tx.wait();

      const [previousAdmin, newAdmin] = receipt.logs.map(
        (e) => e.fragment.name === 'AdminChanged' && e
      )[0].args;

      expect(previousAdmin).to.eq(await admin.getAddress());
      expect(newAdmin).to.eq(await voter1.getAddress());
    });

    it('Should NOT be able to change the current proxy admin if the caller is not an admin', async () => {
      expect(await voteProxy.getCurrentAdmin()).to.eq(await voter1.getAddress());

      const txPromise = voteProxy
        .connect(voter2)
        .changeAdmin(await voter1.getAddress());

      expect(txPromise).to.eventually.be.rejected.and.have.property(
        'code',
        CALL_EXCEPTION
      );
    });
  });

  describe('Implementation contract', () => {
    before(async () => {
      const tx = await voteProxy
        .connect(voter1)
        .changeAdmin(await admin.getAddress());
      await tx.wait();

      expect(await voteProxy.getCurrentAdmin()).to.eq(await admin.getAddress());
    });

    it('V1: Should load VoteV1 into proxy address', async () => {
      proxiedVoteV1 = new ethers.Contract(
        await voteProxy.getAddress(),
        VoteV1Artifact.abi,
        admin
      );
      await proxiedVoteV1.initialize();

      expect(await proxiedVoteV1.version()).to.eq(1);
      expect(await proxiedVoteV1.getAddress()).to.eq(
        await voteProxy.getAddress()
      );
    });

    it('V1: Should cast votes to the system', async () => {
      const vote1Tx = await proxiedVoteV1.connect(voter1).vote();
      await vote1Tx.wait();

      const vote2Tx = await proxiedVoteV1.connect(voter2).vote();
      await vote2Tx.wait();

      const voters = await proxiedVoteV1.voters();

      expect(voters[0]).to.eq(voter1.address);
      expect(voters[1]).to.eq(voter2.address);
    });

    it('V1: Should check if an account has already voted', async () => {
      const votedStatus = await proxiedVoteV1.voted(voter1.address);
      expect(votedStatus).to.be.true;
    });

    it('V1: Should NOT let an already voted account to cast another vote', async () => {
      const invalidVoteTx = await proxiedVoteV1
        .connect(voter1)
        .vote(GAS_LIMIT_1_000_000);

      expect(invalidVoteTx.wait()).to.eventually.be.rejected.and.have.property(
        'code',
        CALL_EXCEPTION
      );
    });

    it('V2: Should load VoteV2 into proxy address', async () => {
      const tx = await voteProxy.upgradeToAndCall(
        await voteV2.getAddress(),
        EMPTY_DATA,
        GAS_LIMIT_1_000_000
      );
      await tx.wait();

      proxiedVoteV2 = new ethers.Contract(
        await voteProxy.getAddress(),
        VoteV2Artifact.abi,
        admin
      );
      const initTx = await proxiedVoteV2.initializeV2();
      await initTx.wait();

      expect(await proxiedVoteV2.version()).to.eq(2);
      expect(await proxiedVoteV2.getAddress()).to.eq(
        await voteProxy.getAddress()
      );
    });

    it('V2: Should correctly inherit the storage states from version 1', async () => {
      const voters = await proxiedVoteV2.voters();

      expect(voters[0]).to.eq(voter1.address);
      expect(voters[1]).to.eq(voter2.address);
    });

    it('V2: Should let voters withdraw their votes which is only available in VoteV2', async () => {
      await proxiedVoteV2.connect(voter1).withdrawVote(GAS_LIMIT_1_000_000);
      expect(await proxiedVoteV2.voted(voter1.address)).to.be.false;
    });
  });
});
// Filename: test/openzeppelin/ERC-20-extensions/ERC20Extensions.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const {
  pollForERC20BurnableChangedSupply,
  pauseAndPoll,
  unPauseAndPoll,
} = require('../../../utils/helpers');

describe('@OZERC20Extensions Test Suite', function () {
  let owner, addr1;
  let ERC20Burnable;
  let ERC20Capped;
  let ERC20Pausable;
  const amount = 1000;
  const cap = 10000;
  const burnAmount = 100;

  before(async function () {
    // Set up signers
    [owner, addr1] = await ethers.getSigners();

    // Deploy ERC20BurnableMock contract
    const burnableFactory = await ethers.getContractFactory(
      Constants.Contract.ERC20BurnableMock
    );
    ERC20Burnable = await burnableFactory.deploy(
      Constants.TOKEN_NAME,
      Constants.TOKEN_SYMBOL
    );
    await ERC20Burnable.mint(owner.address, amount);

    // Deploy ERC20CappedMock contract
    const cappedFactory = await ethers.getContractFactory(
      Constants.Contract.ERC20CappedMock
    );
    ERC20Capped = await cappedFactory.deploy(
      Constants.TOKEN_NAME,
      Constants.TOKEN_SYMBOL,
      cap
    );
    await ERC20Capped.mint(owner.address, amount);

    // Deploy ERC20PausableMock contract
    const pausableFactory = await ethers.getContractFactory(
      Constants.Contract.ERC20PausableMock
    );
    ERC20Pausable = await pausableFactory.deploy(
      Constants.TOKEN_NAME,
      Constants.TOKEN_SYMBOL
    );
    await ERC20Pausable.mint(owner.address, amount);
  });

  describe('ERC20Burnable tests', function () {
    it('should be able to execute burn(amount)', async function () {
      const initialSupply = await ERC20Burnable.totalSupply();
      const initialBalance = await ERC20Burnable.balanceOf(owner.address);

      // Execute burn and get the transaction receipt
      const burnTx = await ERC20Burnable.burn(burnAmount);
      const burnReceipt = await burnTx.wait();

      // Get updated values
      const newSupply = await pollForERC20BurnableChangedSupply(
        ERC20Burnable,
        initialSupply
      );
      const newBalance = await ERC20Burnable.balanceOf(owner.address);

      // Check if the Transfer event was emitted to AddressZero
      expect(burnReceipt.logs[0].fragment.name).to.equal('Transfer');
      expect(burnReceipt.logs[0].args.to).to.equal(ethers.ZeroAddress);

      // Verify the new supply and new balance of the user
      expect(newSupply).to.equal(initialSupply - BigInt(burnAmount));
      expect(newBalance).to.equal(initialBalance - BigInt(burnAmount));
    });

    it('should be able to execute burnFrom(address, amount)', async function () {
      const initialBalance = await ERC20Burnable.balanceOf(owner.address);

      // Approve allowance and burn tokens from owner's address
      await ERC20Burnable.approve(addr1.address, burnAmount);

      const erc20Signer2 = await ERC20Burnable.connect(addr1);
      await erc20Signer2.burnFrom(
        owner.address,
        burnAmount,
        Constants.GAS_LIMIT_1_000_000
      );

      const newBalance = await ERC20Burnable.balanceOf(owner.address);

      //check updated balance
      expect(newBalance).to.equal(initialBalance - BigInt(burnAmount));
    });

    it("should fail to burn tokens if the user doesn't have enough balance", async function () {
      const balance = await ERC20Burnable.balanceOf(owner.address);

      // Expect burn to be reverted due to insufficient balance
      await expect(ERC20Burnable.burn(balance + 1n)).to.be.reverted;
    });

    it('should revert when trying to burn tokens from another account more than accepted allowance', async function () {
      // Approve the allowance for addr1 to burn tokens on behalf of owner
      await ERC20Burnable.approve(addr1.address, burnAmount);
      const erc20Signer2 = ERC20Burnable.connect(addr1);

      expect(erc20Signer2.burnFrom(owner.address, burnAmount + 1)).to.be
        .reverted;
    });

    it('should revert when trying to burn tokens from another account without allowance', async function () {
      expect(ERC20Burnable.connect(addr1).burnFrom(owner.address, amount)).to.be
        .reverted;
    });
  });

  describe('ERC20Cap tests', function () {
    it('should be able to execute cap()', async function () {
      const contractCap = await ERC20Capped.cap();
      expect(contractCap).to.equal(cap);
    });

    it('should fail to mint when trying to mint tokens exceeding the cap', async function () {
      // Get the initial total supply and balance of the owner
      const initialSupply = await ERC20Capped.totalSupply();
      const initialBalance = await ERC20Capped.balanceOf(owner.address);

      // Expect the mint function to be reverted due to exceeding the cap
      await expect(ERC20Capped.mint(owner.address, cap + 1)).to.be.reverted;

      // Check that the total supply and owner's balance haven't changed
      expect(await ERC20Capped.totalSupply()).to.equal(initialSupply);
      expect(await ERC20Capped.balanceOf(owner.address)).to.equal(
        initialBalance
      );
    });
  });

  describe('ERC20Pause tests', function () {
    it('should pause and unpause the token', async function () {
      // Check if the token is not paused initially
      expect(await ERC20Pausable.paused()).to.be.false;

      // Pause the token and verify it is paused
      expect(await pauseAndPoll(ERC20Pausable)).to.be.true;

      // Unpause the token and verify it is not paused anymore
      expect(await unPauseAndPoll(ERC20Pausable)).to.be.true;
    });

    it('should not allow transfers when paused', async function () {
      await ERC20Pausable.pause();

      await expect(ERC20Pausable.transfer(addr1.address, amount)).to.be
        .reverted;
    });

    it("should revert when trying to pause the contract when it's already paused", async function () {
      await expect(ERC20Pausable.pause()).to.be.reverted;
    });

    it('should revert when trying to mint tokens while paused', async function () {
      await expect(ERC20Pausable.mint(addr1.address, amount)).to.be.reverted;
    });

    it('should revert when a non-owner tries to pause or unpause the contract', async function () {
      // Expect pause to be reverted when called by a non-owner
      await expect(ERC20Pausable.connect(addr1).pause()).to.be.reverted;

      // Expect unpause to be reverted when called by a non-owner
      await expect(ERC20Pausable.connect(addr1).unpause()).to.be.reverted;
    });
  });
});
// Filename: test/openzeppelin/ERC-20-votes/erc20Votes.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

const AMOUNT_TO_MINT = 100n;
const sleep = (timeToSleep) => new Promise((r) => setTimeout(r, timeToSleep));
const FUTURE_LOOKUP_ERROR = 'ERC5805FutureLookup';

describe('@OZERC20Votes Test Suite', function () {
  let contract, wallet, wallet2;
  const TIME_INCREMENT = 10000n;

  before(async function () {
    const signers = await ethers.getSigners();
    wallet = signers[0];
    wallet2 = signers[1];
    const votesFactory = await ethers.getContractFactory(
      Constants.Contract.ERC20VotesTest
    );
    contract = await votesFactory.deploy(AMOUNT_TO_MINT, {
      gasLimit: 8000000,
    });
  });

  it('should check if create/mint the erc20 tokens happened when contract created', async function () {
    const supply = await contract.totalSupply();
    const balance = await contract.balanceOf(wallet.address);

    expect(balance).to.equal(AMOUNT_TO_MINT);
    expect(supply).to.equal(AMOUNT_TO_MINT);
  });

  it('should be able to delegate votes', async function () {
    await contract.delegate(wallet2.address);
    const balance = await contract.getVotes(wallet2.address);

    expect(balance).to.equal(AMOUNT_TO_MINT);
  });

  it('should return the delegate that `account` has chosen.', async function () {
    const addr = await contract.delegates(wallet.address);

    expect(addr).to.equal(wallet2.address);
  });

  it('should get the time: clock()', async function () {
    const time = await contract.clock();

    expect(time).to.exist;
  });

  it('should return the correct value for CLOCK_MODE ', async function () {
    const time = await contract.CLOCK_MODE();

    expect(time).to.equal('mode=blocknumber&from=default');
  });

  it('should return the current amount of votes that `account` has ', async function () {
    const votes = await contract.getVotes(wallet2.address);

    expect(votes).to.equal(AMOUNT_TO_MINT);
  });

  it('should return the current amount of votes that `account` has in the past (getPastVotes) ', async function () {
    const timeTick = await contract.clock();
    await contract.delegate(wallet.address, Constants.GAS_LIMIT_1_000_000);

    const votesPast = await contract.getPastVotes(wallet.address, timeTick);
    const timeTick2 = await contract.clock();
    await sleep(3000);
    const votesPast2 = await contract.getPastVotes(wallet.address, timeTick2);

    expect(votesPast).to.equal(0);
    expect(votesPast2).to.equal(AMOUNT_TO_MINT);
  });

  it('should produce an error when looking up votes in the future (getPastVotes) ', async function () {
    const timeTick = await contract.clock();
    expect(
      contract.getPastVotes(wallet.address, timeTick + TIME_INCREMENT)
    ).to.eventually.be.rejected.and.have.property(
      'errorName',
      FUTURE_LOOKUP_ERROR
    );
  });

  it('should produce an error when looking up tottle supply in the future (getPastTotalSupply) ', async function () {
    const timeTick = await contract.clock();
    const supply = await contract.getPastTotalSupply(timeTick - 1n);
    expect(supply).to.equal(AMOUNT_TO_MINT);
  });
});
// Filename: test/openzeppelin/ERC-20/ERC20.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZERC20 Test Suite', function () {
  const amount = 33;
  let signers;
  let erc20;

  before(async function () {
    signers = await ethers.getSigners();

    const factory = await ethers.getContractFactory(
      Constants.Contract.OZERC20Mock
    );
    erc20 = await factory.deploy(Constants.TOKEN_NAME, 'TOKENSYMBOL');
    await erc20.mint(signers[0].address, 1000);
  });

  it('should be able to execute name()', async function () {
    const res = await erc20.name();
    expect(res).to.equal(Constants.TOKEN_NAME);
  });

  it('should be able to execute symbol()', async function () {
    const res = await erc20.symbol();
    expect(res).to.equal('TOKENSYMBOL');
  });

  it('should be able to execute decimals()', async function () {
    const res = await erc20.decimals();
    expect(res).to.equal(18);
  });

  it('should be able to execute totalSupply()', async function () {
    const res = await erc20.totalSupply();
    expect(res).to.equal(1000);
  });

  it('should be able to get execute balanceOf(address)', async function () {
    const res1 = await erc20.balanceOf(signers[0].address);
    expect(res1).to.equal(1000);

    const res2 = await erc20.balanceOf(signers[1].address);
    expect(res2).to.equal(0);
  });

  it('should be able to execute transfer(address,uint256)', async function () {
    const balanceBefore = await erc20.balanceOf(signers[1].address);
    await erc20.transfer(signers[1].address, 33);
    const balanceAfter = await erc20.balanceOf(signers[1].address);
    expect(balanceBefore).to.not.eq(balanceAfter);
    expect(balanceAfter).to.eq(parseInt(balanceBefore) + amount);
  });

  it('should be able to execute transferFrom(address,address,uint256)', async function () {
    await erc20.approve(signers[1].address, amount);
    const erc20Signer2 = erc20.connect(signers[1]);

    const balanceBefore = await erc20.balanceOf(await erc20.getAddress());
    await erc20Signer2.transferFrom(
      signers[0].address,
      await erc20.getAddress(),
      33
    );
    const balanceAfter = await erc20.balanceOf(await erc20.getAddress());

    expect(balanceBefore).to.not.eq(balanceAfter);
    expect(balanceAfter).to.eq(parseInt(balanceBefore) + amount);
  });

  describe('should be able to approve an amount and read a corresponding allowance', function () {
    it('should be able to execute approve(address,uint256)', async function () {
      const res = await erc20.approve(await erc20.getAddress(), amount);
      expect(
        (await res.wait()).logs.filter(
          (e) => e.fragment.name === Constants.Events.Approval
        )
      ).to.not.be.empty;
    });

    it('should be able to execute allowance(address,address)', async function () {
      const res = await erc20.allowance(
        signers[0].address,
        await erc20.getAddress()
      );
      expect(res).to.eq(amount);
    });
  });
});
// Filename: test/openzeppelin/ERC-2612/erc-2612.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const { getDomain } = require('../helpers/eip712');

function permitRequestType() {
  return [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ];
}

describe('@OZERC2612 Test Suite', function () {
  let signers, wallet, wallet2, permitRequest;
  let contract, splitSignature, mismatchedSplitSignature;

  const FUTURE_TIMESTAMP = new Date(
    new Date().setFullYear(new Date().getFullYear() + 1)
  ).getTime();
  const MINT_AMOUNT = '10000000000000000000';
  const PERMIT_AMOUNT = 10000000000000;

  before(async function () {
    signers = await ethers.getSigners();
    wallet = signers[0];
    wallet2 = signers[1];

    const factory = await ethers.getContractFactory(
      Constants.Contract.ERC2612Test
    );
    contract = await factory.deploy();
    await contract.connect(wallet).mint(MINT_AMOUNT);

    permitRequest = {
      owner: wallet.address,
      spender: wallet2.address,
      value: PERMIT_AMOUNT,
      nonce: 0,
      deadline: FUTURE_TIMESTAMP,
    };

    const domain = await getDomain(contract);
    const types = {
      Permit: permitRequestType(),
    };
    const signature = await wallet.signTypedData(domain, types, permitRequest);
    const mismatchedSignature = await wallet2.signTypedData(
      domain,
      types,
      permitRequest
    );
    splitSignature = ethers.Signature.from(signature);
    mismatchedSplitSignature = ethers.Signature.from(mismatchedSignature);
  });

  it('should revert permit call with "Permit deadline has expired"', async function () {
    const { v, r, s } = splitSignature;
    await expect(
      contract.permitTest.staticCall(
        wallet.address,
        wallet2.address,
        1,
        1,
        v,
        r,
        s
      )
    ).to.eventually.be.rejected.and.have.property('code', -32008);
  });

  it('should revert permit call with "Mismatched signature"', async function () {
    const { v, r, s } = mismatchedSplitSignature;

    await expect(
      contract.permitTest.staticCall(
        permitRequest.owner,
        permitRequest.spender,
        permitRequest.value,
        permitRequest.deadline,
        v,
        r,
        s
      )
    ).to.eventually.be.rejected.and.have.property('code', -32008);
  });

  it('should permit', async function () {
    const { v, r, s } = splitSignature;
    const trx = await contract.permit(
      permitRequest.owner,
      permitRequest.spender,
      permitRequest.value,
      permitRequest.deadline,
      v,
      r,
      s
    );
    await trx.wait();
    const allowance = await contract.allowance(wallet.address, wallet2.address);
    expect(allowance).to.equal(PERMIT_AMOUNT);
  });
});
// Filename: test/openzeppelin/ERC-2771/context.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZERC2771 Context Test Suite', function () {
  let signers, wallet2, wallet;
  let contract, msgDataTestFuncSig;

  before(async function () {
    signers = await ethers.getSigners();
    wallet2 = signers[1];
    wallet = signers[0];

    const factory = await ethers.getContractFactory(
      Constants.Contract.ERC2771ContextTest
    );
    contract = await factory.deploy(wallet2.address);

    const iface = new ethers.Interface(['function msgDataTest()']);
    msgDataTestFuncSig = iface.getFunction('msgDataTest').selector;
  });

  it('should have the correct trusted forwarder', async function () {
    const res2 = await contract.isTrustedForwarder(wallet2.address);
    const res = await contract.isTrustedForwarder(wallet.address);

    expect(res2).to.be.true;
    expect(res).to.be.false;
  });

  it('should return Pure message sender when incorrect request is sent to _msgSender', async function () {
    const res = await contract.msgSenderTest.staticCall();

    expect(res).to.be.equal(wallet.address);
  });

  it('should return Pure message data when incorrect request is sent to _msgData', async function () {
    const res = await contract.msgDataTest.staticCall();

    expect(res).to.be.equal(msgDataTestFuncSig);
  });

  it('should extract message sender from the request', async function () {
    const trx = await contract
      .connect(wallet2)
      .msgSenderTest.populateTransaction();
    trx.data = trx.data + wallet2.address.substring(2);

    const signedTrx = await wallet2.sendTransaction(trx);
    await signedTrx.wait();

    const msgData = await contract.sender();
    expect(msgData).to.be.equal(wallet2.address);
  });

  it('should extract message data from the request', async function () {
    const trx = await contract
      .connect(wallet2)
      .msgDataTest.populateTransaction();
    const initialData = trx.data;
    trx.data = initialData + wallet2.address.substring(2);

    const signedTrx = await wallet2.sendTransaction(trx);
    await signedTrx.wait();

    const msgData = await contract.msgData();
    expect(msgData).to.be.equal(initialData);
  });

  it('should return an event for [changeMessageTestRequest]', async function () {
    const signedTrx = await contract.changeMessageTestRequest('test', {
      value: 100,
    });
    const rec = await signedTrx.wait();
    const eventName = rec.logs[0].fragment.name;

    expect(eventName).to.be.equal('MessageChanged');
  });
});
// Filename: test/openzeppelin/ERC-2771/forward.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const { getDomain } = require('../helpers/eip712');

const FORWARDER_NAME = 'ForwardRequest';
const ERC2771_FORWARDER_MISMATCHED_VALUE = 'ERC2771ForwarderMismatchedValue';

function forwardRequestType() {
  return [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint48' },
    { name: 'data', type: 'bytes' },
  ];
}

describe('@OZERC-2771 Fоrward Test Suite', function () {
  let signers,
    wallet2,
    forwarderAddress,
    trx,
    contractForwarder,
    contractRegestry,
    domain,
    types,
    transactionObject;
  const TEST_MESSAGE = 'test message';
  const deadlineFuture = BigInt(
    new Date(new Date().setFullYear(new Date().getFullYear() + 1)).getTime()
  );
  const STARTING_GAS_LIMIT = 15000000;
  const FUND_AMOUNT = '10000000000000000000';

  before(async function () {
    signers = await ethers.getSigners();
    wallet2 = signers[1];
    wallet = signers[0];

    const factoryForwarder = await ethers.getContractFactory(
      Constants.Contract.ERC2771ForwardTest
    );
    contractForwarder = await factoryForwarder.deploy(FORWARDER_NAME, {
      gasLimit: BigInt(STARTING_GAS_LIMIT),
    });
    forwarderAddress = await contractForwarder.getAddress();

    const transaction = await contractForwarder.fund({
      value: FUND_AMOUNT,
    });

    const res = await transaction.wait();

    const factoryContext = await ethers.getContractFactory(
      Constants.Contract.ERC2771ContextTest
    );

    contractRegestry = await factoryContext.deploy(forwarderAddress, {
      gasLimit: BigInt(STARTING_GAS_LIMIT),
    });

    domain = await getDomain(contractForwarder);
    types = {
      ForwardRequest: forwardRequestType(),
    };
  });

  beforeEach(async function () {
    transactionObject = await contractRegestry
      .connect(wallet2)
      .changeMessageTestRequest.populateTransaction(TEST_MESSAGE);

    const forwardRequest = {
      ...transactionObject,
      from: wallet2.address,
      gas: 1_000_000,
      deadline: deadlineFuture,
      nonce: await contractForwarder.nonces(wallet2.address),
      value: 0,
    };

    delete forwardRequest.gasLimit;

    const signature = await wallet2.signTypedData(
      {
        ...domain,
      },
      types,
      forwardRequest
    );

    trx = {
      ...forwardRequest,
      signature,
    };
  });

  it('should execute forward request', async function () {
    const prevMessage = await contractRegestry.message();
    expect(prevMessage).to.equal('');

    const trxCall = await contractForwarder.execute(trx, {
      value: 0,
    });
    const rec = await trxCall.wait();
    const eventExecuted = rec.logs[1];
    const message = await contractRegestry.message();

    expect(eventExecuted.fragment.name).to.equal('ExecutedForwardRequest');
    expect(message).to.equal(TEST_MESSAGE);
  });

  it('should execute forward request with [ERC2771ForwarderMismatchedValue] error', async function () {
    expect(
      contractForwarder.execute.staticCall(trx)
    ).to.eventually.be.rejected.and.have.property(
      'errorName',
      ERC2771_FORWARDER_MISMATCHED_VALUE
    );
  });

  it('should verify the request sender by external API function', async function () {
    const verified = await contractForwarder.verify(trx);
    expect(verified).to.be.true;
  });

  it('should validate the request sender in more detail', async function () {
    const verifiedStatic = await contractForwarder.validateTest.staticCall(trx);
    const verifiedTrx = await contractForwarder.validateTest(trx);
    const rec = await verifiedTrx.wait();
    const verifiedTrxResult = rec.logs[0].args;

    expect(verifiedStatic[0]).to.be.true;
    expect(verifiedStatic[1]).to.be.true;
    expect(verifiedStatic[2]).to.be.true;

    expect(verifiedTrxResult[0]).to.be.true;
    expect(verifiedTrxResult[1]).to.be.true;
    expect(verifiedTrxResult[2]).to.be.true;
  });

  it('should invalidate the request sender when called with tampered values [from]', async function () {
    const tamperedTrx = {
      ...trx,
      from: ethers.Wallet.createRandom().address,
    };
    const verifiedStatic = await contractForwarder.validateTest.staticCall(
      tamperedTrx
    );
    const verifiedTrx = await contractForwarder.validateTest(tamperedTrx);
    const rec = await verifiedTrx.wait();
    const verifiedTrxResult = rec.logs[0].args;

    expect(verifiedStatic[0]).to.be.true;
    expect(verifiedStatic[1]).to.be.true;
    expect(verifiedStatic[2]).to.be.false;

    expect(verifiedTrxResult[0]).to.be.true;
    expect(verifiedTrxResult[1]).to.be.true;
    expect(verifiedTrxResult[2]).to.be.false;
  });

  it('should invalidate the request sender when called with tampered values [deadline]', async function () {
    const tamperedTrx = {
      ...trx,
      deadline: 0,
    };
    const verifiedStatic = await contractForwarder.validateTest.staticCall(
      tamperedTrx
    );
    const verifiedTrx = await contractForwarder.validateTest(tamperedTrx);
    const rec = await verifiedTrx.wait();
    const verifiedTrxResult = rec.logs[0].args;

    expect(verifiedStatic[0]).to.be.true;
    expect(verifiedStatic[1]).to.be.false;
    expect(verifiedStatic[2]).to.be.false;

    expect(verifiedTrxResult[0]).to.be.true;
    expect(verifiedTrxResult[1]).to.be.false;
    expect(verifiedTrxResult[2]).to.be.false;
  });
});
// Filename: test/openzeppelin/ERC-2981/erc2981.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZERC29821 Royalty Info Test Suite', function () {
  let signers, wallet, wallet2;
  let contract;
  const TOKEN_ID = 666;
  const DEFAULT_FEE_NUMERATOR = 20;
  const DEFAULT_FEE_DENOMINATOR = 10000;

  before(async function () {
    signers = await ethers.getSigners();
    wallet = signers[0];
    wallet2 = signers[1];

    const factory = await ethers.getContractFactory(
      Constants.Contract.ERC2981Test
    );
    contract = await factory.deploy();
  });

  it('should return the default Fee Denominator', async function () {
    const res = await contract.feeDenominator();

    expect(res).to.equal(DEFAULT_FEE_DENOMINATOR);
  });

  it('should set the Default Royalty', async function () {
    const trx = await contract.setDefaultRoyalty(
      wallet2.address,
      DEFAULT_FEE_NUMERATOR,
      { gasLimit: 10_000_000 }
    );
    await trx.wait();
    const royaltyInfoDefault = await contract.royaltyInfo(
      ethers.ZeroAddress,
      10000
    );

    expect(royaltyInfoDefault[0]).to.equal(wallet2.address);
    expect(royaltyInfoDefault[1]).to.equal(DEFAULT_FEE_NUMERATOR);
  });

  it('should return error for setting ZERO Address for receiver', async function () {
    let hasError = false;
    try {
      const trx = await contract.setDefaultRoyalty(
        ethers.ZeroAddress,
        DEFAULT_FEE_NUMERATOR
      );
      await trx.wait();
    } catch (error) {
      hasError = true;
    }

    expect(hasError).to.equal(true);
  });

  it('should return error for setting too big of feeNumerator', async function () {
    let hasError = false;
    try {
      const trx = await contract.setDefaultRoyalty(
        wallet.address,
        DEFAULT_FEE_DENOMINATOR + 1
      );
      await trx.wait();
    } catch (error) {
      hasError = true;
    }

    expect(hasError).to.equal(true);
  });

  it('should return Royalty info for token', async function () {
    const salePrice = 200n;
    const royaltyFraction = 400n;
    const feeDenominator = await contract.feeDenominator();
    const calculatedRoyalty = (salePrice * royaltyFraction) / feeDenominator;
    const trx = await contract.setTokenRoyalty(
      TOKEN_ID,
      wallet.address,
      royaltyFraction
    );
    trx.wait();
    const royaltyInfoDefault = await contract.royaltyInfo(TOKEN_ID, salePrice);

    expect(royaltyInfoDefault[0]).to.equal(wallet.address);
    expect(royaltyInfoDefault[1]).to.equal(calculatedRoyalty);
  });

  it('should reset Royalty Info', async function () {
    const trx = await contract.resetTokenRoyalty(TOKEN_ID);
    await trx.wait();
    const royaltyInfoDefault = await contract.royaltyInfo(
      TOKEN_ID,
      DEFAULT_FEE_NUMERATOR
    );

    expect(royaltyInfoDefault[0]).to.equal(wallet2.address);
    expect(royaltyInfoDefault[1]).to.equal(0);
  });
});
// Filename: test/openzeppelin/ERC-4626/TokenVault.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZTokenVault Test Suite', function () {
  let TokenVault;
  let tokenVault;
  let ERC20Mock;
  let asset;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    ERC20Mock = await ethers.getContractFactory(Constants.Contract.OZERC20Mock);
    asset = await ERC20Mock.deploy(
      'MockToken',
      'MTK',
      Constants.GAS_LIMIT_1_000_000
    );

    TokenVault = await ethers.getContractFactory(Constants.Contract.TokenVault);
    tokenVault = await TokenVault.deploy(
      await asset.getAddress(),
      'MockToken',
      'MTK',
      Constants.GAS_LIMIT_1_000_000
    );

    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    await asset.mint(addr1.address, ethers.parseUnits('1000', 18));
    await asset.mint(addr2.address, ethers.parseUnits('10', 18));
  });

  describe('Deployment', function () {
    it('Should assign the total supply of tokens to the owner', async function () {
      const ownerBalance = await tokenVault.balanceOf(owner.address);
      expect(await tokenVault.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe('Transactions', function () {
    it('Should deposit tokens and update shareHolders mapping', async function () {
      const depositAmount = ethers.parseEther('10');
      await asset
        .connect(addr1)
        .approve(await tokenVault.getAddress(), depositAmount);
      await expect(tokenVault.connect(addr1)._deposit(depositAmount))
        .to.emit(tokenVault, 'Deposit')
        .withArgs(addr1.address, addr1.address, depositAmount, depositAmount);

      expect(await tokenVault.shareHolders(addr1.address)).to.equal(
        depositAmount
      );
    });

    it('Should withdraw tokens and update shareHolders mapping', async function () {
      const depositAmount = ethers.parseEther('10');
      const withdrawAmount = ethers.parseEther('5');
      const redemedAmount = ethers.parseEther('5.5');

      await asset
        .connect(addr2)
        .approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(addr2)._deposit(depositAmount);

      const tx = await tokenVault
        .connect(addr2)
        ._withdraw(
          withdrawAmount,
          addr2.address,
          Constants.GAS_LIMIT_1_000_000
        );
      const rec = await tx.wait();

      const withDrawLog = rec.logs.find((e) => e.fragment.name === 'Withdraw');

      expect(withDrawLog.args[0]).to.eq(addr2.address);
      expect(withDrawLog.args[1]).to.eq(addr2.address);
      expect(withDrawLog.args[2]).to.eq(addr2.address);
      expect(withDrawLog.args[3]).to.eq(redemedAmount);
      expect(withDrawLog.args[4]).to.eq(redemedAmount);

      expect(await tokenVault.totalAssetsOfUser(addr2.address)).to.equal(
        depositAmount - withdrawAmount
      );
    });

    it('Should fail if withdraw is to zero address', async function () {
      expect(
        tokenVault.connect(addr1)._withdraw(1, ethers.ZeroAddress)
      ).to.be.revertedWith('Zero Address');
    });

    it('Should fail if not a shareholder', async function () {
      expect(
        tokenVault.connect(addr2)._withdraw(1, addr2.address)
      ).to.be.revertedWith('Not a shareHolder');
    });

    it('Should fail if not enough shares', async function () {
      const depositAmount = ethers.parseEther('10');
      await asset
        .connect(addr1)
        .approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(addr1)._deposit(depositAmount);
      expect(
        tokenVault.connect(addr1)._withdraw(depositAmount + 1n, addr1.address)
      ).to.be.revertedWith('Not enough shares');
    });
  });

  describe('Views', function () {
    it('Should return the total assets of a user', async function () {
      const depositAmount = ethers.parseEther('10');
      await asset
        .connect(addr1)
        .approve(await tokenVault.getAddress(), depositAmount);
      await tokenVault.connect(addr1)._deposit(depositAmount);

      expect(await tokenVault.totalAssetsOfUser(addr1.address)).to.equal(
        depositAmount
      );
    });
  });
});
// Filename: test/openzeppelin/ERC-721-Receiver/ERC721Receiver.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZIERC721Receiver Test Suite', () => {
  let wallet, invalidErc721Receiver, validErc721Receiver, erc721Token;

  const ERC721_NAME = 'Token';
  const ERC721_SYMBOL = 'T';

  before(async () => {
    wallet = (await ethers.getSigners())[0];

    const invalidErc721ReceiverFac = await ethers.getContractFactory(
      Constants.Contract.InvalidERC721Receiver
    );
    const validErc721ReceiverFac = await ethers.getContractFactory(
      Constants.Contract.ValidERC721Receiver
    );
    const erc721TokenFac = await ethers.getContractFactory(
      Constants.Contract.OZERC721Mock
    );

    invalidErc721Receiver = await invalidErc721ReceiverFac.deploy();
    validErc721Receiver = await validErc721ReceiverFac.deploy();
    erc721Token = await erc721TokenFac.deploy(ERC721_NAME, ERC721_SYMBOL);
  });

  it('Should deploy contracts to proper addresses', async () => {
    expect(ethers.isAddress(await invalidErc721Receiver.getAddress())).to.be
      .true;
    expect(ethers.isAddress(await validErc721Receiver.getAddress())).to.be.true;
    expect(ethers.isAddress(await erc721Token.getAddress())).to.be.true;
  });

  it('Should be able to send ERC721 token to validErc721Receiver via safeTransferFrom', async () => {
    const tokenID = 3;
    await erc721Token.mint(wallet.address, tokenID);

    const tx = await erc721Token[
      'safeTransferFrom(address,address,uint256,bytes)'
    ](
      wallet.address,
      await validErc721Receiver.getAddress(),
      tokenID,
      '0x',
      Constants.GAS_LIMIT_1_000_000
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment.name === 'Transfer');

    expect(event.args.from).to.eq(wallet.address);
    expect(event.args.to).to.eq(await validErc721Receiver.getAddress());
    expect(event.args.tokenId).to.eq(tokenID);
  });

  it('Should NOT be able to send ERC721 token to invalidErc721Receiver via safeTransferFrom', async () => {
    const tokenID = 3;
    await erc721Token.mint(
      wallet.address,
      tokenID,
      Constants.GAS_LIMIT_1_000_000
    );

    const tx = await erc721Token[
      'safeTransferFrom(address,address,uint256,bytes)'
    ](
      wallet.address,
      await invalidErc721Receiver.getAddress(),
      tokenID,
      '0x',
      Constants.GAS_LIMIT_1_000_000
    );

    expect(tx.wait()).to.eventually.rejected.and.have.property(
      'code',
      Constants.CALL_EXCEPTION
    );
  });
});
// Filename: test/openzeppelin/ERC-721/ERC721.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const { pollForNewERC721Owner } = require('../../../utils/helpers');

describe('@OZERC721 Test Suite', function () {
  const tokenId = 33;
  let signers;
  let erc721;

  before(async function () {
    signers = await ethers.getSigners();

    const factory = await ethers.getContractFactory(
      Constants.Contract.OZERC721Mock
    );
    erc721 = await factory.deploy(Constants.TOKEN_NAME, 'TOKENSYMBOL');
    await erc721.mint(signers[0].address, tokenId);
  });

  it('should be able to execute name()', async function () {
    const res = await erc721.name();
    expect(res).to.equal(Constants.TOKEN_NAME);
  });

  it('should be able to execute symbol()', async function () {
    const res = await erc721.symbol();
    expect(res).to.equal('TOKENSYMBOL');
  });

  it('should be able to execute balanceOf(address)', async function () {
    const res = await erc721.balanceOf(signers[0].address);
    expect(res).to.eq(1);
  });

  it('should be able to execute ownerOf(uint256)', async function () {
    const res = await erc721.ownerOf(tokenId);
    expect(res).to.eq(signers[0].address);
  });

  it('should be able to execute approve(address,uint256)', async function () {
    const res = await erc721.approve(signers[1].address, tokenId);
    expect(
      (await res.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.Approval
      )
    ).to.not.be.empty;
  });

  it('should be able to execute getApproved(uint256)', async function () {
    const res = await erc721.getApproved(tokenId);
    expect(res).to.eq(signers[1].address);
  });

  it('should be able to execute setApprovalForAll(address,bool)', async function () {
    const res = await erc721.setApprovalForAll(signers[1].address, true);
    expect(
      (await res.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ApprovalForAll
      )
    ).to.not.be.empty;
  });

  it('should be able to execute isApprovedForAll(address,address)', async function () {
    const res = await erc721.isApprovedForAll(
      signers[0].address,
      signers[1].address
    );
    expect(res).to.eq(true);
  });

  it('should be able to execute transferFrom(address,address,uint256)', async function () {
    const ownerBefore = await erc721.ownerOf(tokenId);
    await erc721.transferFrom(signers[0].address, signers[1].address, tokenId);

    const ownerAfter = await pollForNewERC721Owner(
      erc721,
      tokenId,
      ownerBefore
    );
    expect(ownerBefore).to.not.eq(ownerAfter);
    expect(ownerAfter).to.eq(signers[1].address);
  });
});
// Filename: test/openzeppelin/ERC-777/ERC777ContractAccount.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZERC777ContractAccount Test Suite', () => {
  let erc1820registry,
    erc777SenderHookImpl,
    erc777RecipientHookImpl,
    erc777Token,
    erc777ContractAccount,
    wallet1;

  const TOKENS_SENDER_INTERFACE_HASH = ethers.keccak256(
    ethers.toUtf8Bytes('ERC777TokensSender')
  );
  const TOKENS_RECIPIENT_INTERFACE_HASH = ethers.keccak256(
    ethers.toUtf8Bytes('ERC777TokensRecipient')
  );

  const TOKEN_NAME = 'Uranium Token';
  const TOKEN_SYMBOL = 'UT';
  const SENT_TOKEN_AMOUNT = 600;
  const TOTAL_TOKEN_AMOUNT = 3_000;
  const EMPTY_DATA = '0x';

  beforeEach(async () => {
    wallet1 = (await ethers.getSigners())[0];

    const ERC1820registryFac = await ethers.getContractFactory(
      Constants.Contract.ERC1820Registry
    );
    const ERC777SenderHookImplFac = await ethers.getContractFactory(
      Constants.Contract.ERC777SenderHookImpl
    );
    const ERC777RecipientHookImplFac = await ethers.getContractFactory(
      Constants.Contract.ERC777RecipientHookImpl
    );
    const ERC777TokenFac = await ethers.getContractFactory(
      Constants.Contract.ERC777Token
    );
    const ERC777ContractAccountFac = await ethers.getContractFactory(
      Constants.Contract.ERC777ContractAccount
    );

    erc1820registry = await ERC1820registryFac.deploy();
    erc777ContractAccount = await ERC777ContractAccountFac.deploy(
      await erc1820registry.getAddress()
    );

    erc1820registry = await ERC1820registryFac.deploy();
    erc777SenderHookImpl = await ERC777SenderHookImplFac.deploy();
    erc777RecipientHookImpl = await ERC777RecipientHookImplFac.deploy();
    erc777Token = await ERC777TokenFac.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      await erc1820registry.getAddress(),
      [],
      { gasLimit: 1_000_000 }
    );
    erc777ContractAccount = await ERC777ContractAccountFac.deploy(
      await erc1820registry.getAddress()
    );
  });

  it('Should deploy contracts properly', async () => {
    expect(ethers.isAddress(await erc1820registry.getAddress())).to.be.true;
    expect(ethers.isAddress(await erc777SenderHookImpl.getAddress())).to.be
      .true;
    expect(ethers.isAddress(await erc777RecipientHookImpl.getAddress())).to.be
      .true;
    expect(ethers.isAddress(await erc777Token.getAddress())).to.be.true;
    expect(ethers.isAddress(await erc777ContractAccount.getAddress())).to.be
      .true;
  });

  it('Should register ERC777TokensSender interface', async () => {
    await erc777ContractAccount.registerERC777TokensSender(
      await erc777SenderHookImpl.getAddress()
    );

    const implementer = await erc1820registry.getInterfaceImplementer(
      await erc777ContractAccount.getAddress(),
      TOKENS_SENDER_INTERFACE_HASH
    );

    expect(implementer).to.eq(await erc777SenderHookImpl.getAddress());
  });

  it('Should register ERC777TokensRecipient interface', async () => {
    await erc777ContractAccount.registerERC777TokensRecipient(
      await erc777RecipientHookImpl.getAddress()
    );

    const implementer = await erc1820registry.getInterfaceImplementer(
      await erc777ContractAccount.getAddress(),
      TOKENS_RECIPIENT_INTERFACE_HASH
    );

    expect(implementer).to.eq(await erc777RecipientHookImpl.getAddress());
  });

  it('Should send an amount of ERC777 token to a recipient', async () => {
    await erc777ContractAccount.registerERC777TokensSender(
      await erc777SenderHookImpl.getAddress()
    );

    await erc777ContractAccount.registerERC777TokensRecipient(
      await erc777RecipientHookImpl.getAddress()
    );

    await erc777Token
      .connect(wallet1)
      .mint(
        await erc777ContractAccount.getAddress(),
        TOTAL_TOKEN_AMOUNT,
        EMPTY_DATA,
        EMPTY_DATA
      );

    const initialErc777ContractAccountBalance = await erc777Token.balanceOf(
      await erc777ContractAccount.getAddress()
    );
    const initialWallet1Balance = await erc777Token.balanceOf(wallet1.address);

    const tx = await erc777ContractAccount.send(
      await erc777Token.getAddress(),
      wallet1.address,
      SENT_TOKEN_AMOUNT,
      EMPTY_DATA
    );

    await tx.wait();

    const currentErc777ContractAccountBalance = await erc777Token.balanceOf(
      await erc777ContractAccount.getAddress()
    );
    const currentWallet1Balance = await erc777Token.balanceOf(wallet1.address);

    expect(initialErc777ContractAccountBalance).to.eq(
      BigInt(TOTAL_TOKEN_AMOUNT)
    );
    expect(initialWallet1Balance).to.eq(BigInt(0));
    expect(currentErc777ContractAccountBalance).to.eq(
      BigInt(TOTAL_TOKEN_AMOUNT - SENT_TOKEN_AMOUNT)
    );
    expect(currentWallet1Balance).to.eq(BigInt(SENT_TOKEN_AMOUNT));
  });
});
// Filename: test/openzeppelin/ERC-777/ERC777Token.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZERC777 Test Suite', () => {
  let erc1820registry,
    erc777SenderHookImpl,
    erc777RecipientHookImpl,
    erc777Token,
    erc777ContractAccount;

  let wallet1, wallet2, wallet3, wallet4, defaultOperators;

  const TOKEN_NAME = 'Uranium Token';
  const TOKEN_SYMBOL = 'UT';
  const SENT_TOKEN_AMOUNT = 600;
  const BURNT_TOKEN_AMOUNT = 900;
  const TOTAL_TOKEN_AMOUNT = 3_000;
  const EMPTY_DATA = '0x';
  const ADDRESS_ZERO = ethers.ZeroAddress;

  beforeEach(async () => {
    [wallet1, wallet2, wallet3, wallet4] = await ethers.getSigners();
    defaultOperators = [wallet3.address, wallet4.address];

    const ERC1820registryFac = await ethers.getContractFactory(
      Constants.Contract.ERC1820Registry
    );
    const ERC777SenderHookImplFac = await ethers.getContractFactory(
      Constants.Contract.ERC777SenderHookImpl
    );
    const ERC777RecipientHookImplFac = await ethers.getContractFactory(
      Constants.Contract.ERC777RecipientHookImpl
    );
    const ERC777TokenFac = await ethers.getContractFactory(
      Constants.Contract.ERC777Token
    );
    const ERC777ContractAccountFac = await ethers.getContractFactory(
      Constants.Contract.ERC777ContractAccount
    );

    erc1820registry = await ERC1820registryFac.deploy();
    erc777SenderHookImpl = await ERC777SenderHookImplFac.deploy();
    erc777RecipientHookImpl = await ERC777RecipientHookImplFac.deploy();
    erc777Token = await ERC777TokenFac.deploy(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      await erc1820registry.getAddress(),
      defaultOperators,
      { gasLimit: 1_000_000 }
    );
    erc777ContractAccount = await ERC777ContractAccountFac.deploy(
      await erc1820registry.getAddress()
    );
  });

  it('Should deploy contracts properly', async () => {
    expect(ethers.isAddress(await erc1820registry.getAddress())).to.be.true;
    expect(ethers.isAddress(await erc777SenderHookImpl.getAddress())).to.be
      .true;
    expect(ethers.isAddress(await erc777RecipientHookImpl.getAddress())).to.be
      .true;
    expect(ethers.isAddress(await erc777Token.getAddress())).to.be.true;
    expect(ethers.isAddress(await erc777ContractAccount.getAddress())).to.be
      .true;
  });

  it('Should call token information view functions in ERC777Token', async () => {
    const tokenName = await erc777Token.name();
    const tokenSymbol = await erc777Token.symbol();
    const totalSupply = await erc777Token.totalSupply();
    const granularity = await erc777Token.granularity();

    expect(tokenName).to.eq(TOKEN_NAME);
    expect(tokenSymbol).to.eq(TOKEN_SYMBOL);
    expect(totalSupply).to.eq(0);
    expect(granularity).to.eq(1);
  });

  it('Should mint an amount of token to address', async () => {
    const tx = await erc777Token
      .connect(wallet1)
      .mint(wallet2.address, TOTAL_TOKEN_AMOUNT, EMPTY_DATA, EMPTY_DATA);
    const receipt = await tx.wait();
    const mintedEvent = receipt.logs.find((e) => e.fragment.name === 'Minted');

    expect(mintedEvent.args.operator).to.eq(wallet1.address);
    expect(mintedEvent.args.to).to.eq(wallet2.address);
    expect(mintedEvent.args.amount).to.eq(BigInt(TOTAL_TOKEN_AMOUNT));
    expect(mintedEvent.args.data).to.eq(EMPTY_DATA);
    expect(mintedEvent.args.operatorData).to.eq(EMPTY_DATA);
  });

  it('Should check the balance of an address', async () => {
    const initBalance = await erc777Token.balanceOf(wallet1.address);
    await erc777Token.mint(
      wallet1.address,
      TOTAL_TOKEN_AMOUNT,
      EMPTY_DATA,
      EMPTY_DATA
    );
    const currentBalance = await erc777Token.balanceOf(wallet1.address);

    expect(initBalance).to.eq(0);
    expect(currentBalance).to.eq(TOTAL_TOKEN_AMOUNT);
  });

  it('Should send token from an EOA to another EOA', async () => {
    await erc777Token.mint(
      wallet1.address,
      TOTAL_TOKEN_AMOUNT,
      EMPTY_DATA,
      EMPTY_DATA
    );

    const tx = await erc777Token
      .connect(wallet1)
      .send(wallet2.address, SENT_TOKEN_AMOUNT, EMPTY_DATA);
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment.name === 'Sent');

    expect(event.args.operator).to.eq(wallet1.address);
    expect(event.args.from).to.eq(wallet1.address);
    expect(event.args.to).to.eq(wallet2.address);
    expect(event.args.amount).to.eq(BigInt(SENT_TOKEN_AMOUNT));
    expect(event.args.data).to.eq(EMPTY_DATA);
    expect(event.args.operatorData).to.eq(EMPTY_DATA);
  });

  it('Should NOT allow an EOA to send insufficient tokens to another EOA', async () => {
    await erc777Token.mint(
      wallet1.address,
      TOTAL_TOKEN_AMOUNT,
      EMPTY_DATA,
      EMPTY_DATA
    );

    expect(
      erc777Token
        .connect(wallet1)
        .send(wallet2.address, TOTAL_TOKEN_AMOUNT + 1, EMPTY_DATA)
    ).to.eventually.be.rejected.and.have.property(
      'code',
      Constants.CALL_EXCEPTION
    );
  });

  it('Should NOT allow an EOA to send tokens to address zero', async () => {
    await erc777Token.mint(
      wallet1.address,
      TOTAL_TOKEN_AMOUNT,
      EMPTY_DATA,
      EMPTY_DATA
    );

    expect(
      erc777Token
        .connect(wallet1)
        .send(ADDRESS_ZERO, TOTAL_TOKEN_AMOUNT + 1, EMPTY_DATA)
    ).to.eventually.be.rejected.and.have.property(
      'code',
      Constants.CALL_EXCEPTION
    );
  });

  it('Should burn tokens', async () => {
    await erc777Token.mint(
      wallet1.address,
      TOTAL_TOKEN_AMOUNT,
      EMPTY_DATA,
      EMPTY_DATA
    );

    const tx = await erc777Token
      .connect(wallet1)
      .burn(BURNT_TOKEN_AMOUNT, EMPTY_DATA);
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment.name === 'Burned');

    expect(event.args.operator).to.eq(wallet1.address);
    expect(event.args.from).to.eq(wallet1.address);
    expect(event.args.amount).to.eq(BigInt(BURNT_TOKEN_AMOUNT));
    expect(event.args.data).to.eq(EMPTY_DATA);
    expect(event.args.operatorData).to.eq(EMPTY_DATA);
  });

  it('Should authorize operator', async () => {
    const tx = await erc777Token
      .connect(wallet2)
      .authorizeOperator(wallet1.address);
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (e) => e.fragment.name === 'AuthorizedOperator'
    );

    expect(event.args.operator).to.eq(wallet1.address);
    expect(event.args.tokenHolder).to.eq(wallet2.address);
  });

  it('Should NOT authorize self as operator', async () => {
    expect(
      erc777Token.connect(wallet2).authorizeOperator(wallet2.address)
    ).to.eventually.be.rejected.and.have.property(
      'code',
      Constants.CALL_EXCEPTION
    );
  });

  it('Should check if an address is the operator for another address', async () => {
    const falsyOperator = await erc777Token.isOperatorFor(
      wallet1.address,
      wallet2.address
    );

    await erc777Token.connect(wallet2).authorizeOperator(wallet1.address);

    const truthyOperator = await erc777Token.isOperatorFor(
      wallet1.address,
      wallet2.address
    );

    expect(falsyOperator).to.be.false;
    expect(truthyOperator).to.be.true;
  });

  it('Should revoke operator', async () => {
    const tx = await erc777Token
      .connect(wallet2)
      .revokeOperator(wallet1.address);
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (e) => e.fragment.name === 'RevokedOperator'
    );

    expect(event.args.operator).to.eq(wallet1.address);
    expect(event.args.tokenHolder).to.eq(wallet2.address);
  });

  it('Should NOT revoke self as operator', async () => {
    expect(
      erc777Token.connect(wallet2).revokeOperator(wallet2.address)
    ).to.eventually.be.rejected.and.have.property(
      'code',
      Constants.CALL_EXCEPTION
    );
  });

  it('Should get default operators', async () => {
    const storageDefaultOperators = await erc777Token.defaultOperators();

    expect(storageDefaultOperators[0]).to.eq(wallet3.address);
    expect(storageDefaultOperators[1]).to.eq(wallet4.address);
    expect(storageDefaultOperators.length).to.eq(defaultOperators.length);
  });

  it('Should allow an operator to send tokens to a recipient on token holder behalf', async () => {
    await erc777Token
      .connect(wallet2)
      .mint(wallet2.address, TOTAL_TOKEN_AMOUNT, EMPTY_DATA, EMPTY_DATA);

    await erc777Token.connect(wallet2).authorizeOperator(wallet1.address);

    const tx = await erc777Token.connect(wallet1).operatorSend(
      wallet2.address, //sender
      wallet3.address, // recipient
      SENT_TOKEN_AMOUNT, //amount
      EMPTY_DATA, // data
      EMPTY_DATA // operator Data
    );

    const receipt = await tx.wait();

    const event = receipt.logs.find((e) => e.fragment.name === 'Sent');

    expect(event.args.operator).to.eq(wallet1.address);
    expect(event.args.from).to.eq(wallet2.address);
    expect(event.args.to).to.eq(wallet3.address);
    expect(event.args.amount).to.eq(BigInt(SENT_TOKEN_AMOUNT));
    expect(event.args.data).to.eq(EMPTY_DATA);
    expect(event.args.operatorData).to.eq(EMPTY_DATA);
  });

  it('Should NOT allow non-operator to send tokens to recipient on token holder behalf', async () => {
    await erc777Token
      .connect(wallet2)
      .mint(wallet2.address, TOTAL_TOKEN_AMOUNT, EMPTY_DATA, EMPTY_DATA);

    expect(
      erc777Token
        .connect(wallet1)
        .operatorSend(
          wallet2.address,
          wallet3.address,
          SENT_TOKEN_AMOUNT,
          EMPTY_DATA,
          EMPTY_DATA
        )
    ).to.eventually.be.rejected.and.have.property(
      'code',
      Constants.CALL_EXCEPTION
    );
  });

  it('Should allow an operator to burn token on token holder behalf', async () => {
    await erc777Token
      .connect(wallet2)
      .mint(wallet2.address, TOTAL_TOKEN_AMOUNT, EMPTY_DATA, EMPTY_DATA);

    await erc777Token.connect(wallet2).authorizeOperator(wallet1.address);

    const tx = await erc777Token.operatorBurn(
      wallet2.address, //token holder
      BURNT_TOKEN_AMOUNT, //amount
      EMPTY_DATA, // data
      EMPTY_DATA // operator Data
    );

    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment.name === 'Burned');

    expect(event.args.operator).to.eq(wallet1.address);
    expect(event.args.from).to.eq(wallet2.address);
    expect(event.args.amount).to.eq(BigInt(BURNT_TOKEN_AMOUNT));
    expect(event.args.data).to.eq(EMPTY_DATA);
    expect(event.args.operatorData).to.eq(EMPTY_DATA);
  });

  it('Should not allow a non-operator to burn token on token holder behalf', async () => {
    await erc777Token
      .connect(wallet2)
      .mint(wallet2.address, TOTAL_TOKEN_AMOUNT, EMPTY_DATA, EMPTY_DATA);

    expect(
      erc777Token.operatorBurn(
        wallet2.address, //token holder
        BURNT_TOKEN_AMOUNT, //amount
        EMPTY_DATA, // data
        EMPTY_DATA // operator Data
      )
    ).to.eventually.be.rejected.and.have.property(
      'code',
      Constants.CALL_EXCEPTION
    );
  });

  it('Should NOT be able to send ERC777 token to a contract that DOES NOT register ERC777TokensRecipient interafce', async () => {
    await erc777Token
      .connect(wallet1)
      .mint(wallet1.address, TOTAL_TOKEN_AMOUNT, EMPTY_DATA, EMPTY_DATA);

    expect(
      erc777Token
        .connect(wallet1)
        .send(
          await erc777ContractAccount.getAddress(),
          SENT_TOKEN_AMOUNT,
          EMPTY_DATA
        )
    ).to.eventually.be.rejected.and.have.property(
      'code',
      Constants.CALL_EXCEPTION
    );
  });

  it('Should be able to send ERC777 token to a contract that DOES register ERC777TokensRecipient interafce', async () => {
    await erc777Token
      .connect(wallet1)
      .mint(wallet1.address, TOTAL_TOKEN_AMOUNT, EMPTY_DATA, EMPTY_DATA);

    await erc777ContractAccount.registerERC777TokensRecipient(
      await erc777RecipientHookImpl.getAddress()
    );

    const tx = await erc777Token
      .connect(wallet1)
      .send(
        await erc777ContractAccount.getAddress(),
        SENT_TOKEN_AMOUNT,
        EMPTY_DATA
      );

    const receipt = await tx.wait();

    const event = receipt.logs.find((e) => e.fragment.name === 'Sent');

    expect(event.args.operator).to.eq(wallet1.address);
    expect(event.args.from).to.eq(wallet1.address);
    expect(event.args.to).to.eq(await erc777ContractAccount.getAddress());
    expect(event.args.amount).to.eq(BigInt(SENT_TOKEN_AMOUNT));
    expect(event.args.data).to.eq(EMPTY_DATA);
    expect(event.args.operatorData).to.eq(EMPTY_DATA);
  });

  it('Should NOT be able to send ERC777 token from a contract that DOES NOT register ERC777TokensSender interface', async () => {
    await erc777ContractAccount.registerERC777TokensRecipient(
      await erc777RecipientHookImpl.getAddress()
    );

    await erc777Token
      .connect(wallet1)
      .mint(
        await erc777ContractAccount.getAddress(),
        TOTAL_TOKEN_AMOUNT,
        EMPTY_DATA,
        EMPTY_DATA
      );

    expect(
      erc777ContractAccount.send(
        await erc777Token.getAddress(),
        wallet2.address,
        SENT_TOKEN_AMOUNT,
        EMPTY_DATA
      )
    ).to.eventually.be.rejected.and.have.property(
      'code',
      Constants.CALL_EXCEPTION
    );
  });

  it('Should be able to send ERC777 token from a contract that DOES register ERC777TokensSender interface', async () => {
    await erc777ContractAccount.registerERC777TokensRecipient(
      await erc777RecipientHookImpl.getAddress()
    );

    await erc777ContractAccount.registerERC777TokensSender(
      await erc777SenderHookImpl.getAddress()
    );

    await erc777Token
      .connect(wallet1)
      .mint(
        await erc777ContractAccount.getAddress(),
        TOTAL_TOKEN_AMOUNT,
        EMPTY_DATA,
        EMPTY_DATA,
        Constants.GAS_LIMIT_1_000_000
      );

    await erc777ContractAccount.send(
      await erc777Token.getAddress(),
      wallet2.address,
      SENT_TOKEN_AMOUNT,
      EMPTY_DATA,
      Constants.GAS_LIMIT_1_000_000
    );

    const erc777ContractAccountBalance = await erc777Token.balanceOf(
      await erc777ContractAccount.getAddress()
    );
    const wallet2Balance = await erc777Token.balanceOf(wallet2.address);

    expect(erc777ContractAccountBalance).to.eq(
      BigInt(TOTAL_TOKEN_AMOUNT - SENT_TOKEN_AMOUNT)
    );
    expect(wallet2Balance).to.eq(BigInt(SENT_TOKEN_AMOUNT));
  });
});
// Filename: test/openzeppelin/ERC-777/introspection/ERC1820Registry.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../../constants');

describe('@OZERC1820 Test Suite', () => {
  let erc1820registry, wallet1, wallet2;

  const ERC777TOKEN_HASH = ethers.keccak256(
    ethers.toUtf8Bytes('ERC777TOKEN_HASH')
  );

  beforeEach(async () => {
    [wallet1, wallet2] = await ethers.getSigners();

    const erc1820RegistryFac = await ethers.getContractFactory(
      Constants.Contract.ERC1820Registry
    );
    erc1820registry = await erc1820RegistryFac.deploy();
  });

  it('Should deploy the registry', async () => {
    expect(erc1820registry).to.not.null;
    expect(ethers.isAddress(await erc1820registry.getAddress())).to.be.true;
  });

  it('Should get a manager of an address', async () => {
    const manager = await erc1820registry.getManager(wallet2.address);
    expect(manager).to.eq(wallet2.address);
  });

  it('Should set a new manager for an address', async () => {
    await erc1820registry
      .connect(wallet2)
      .setManager(wallet2.address, wallet1.address);

    const newManager = await erc1820registry.getManager(wallet2.address);
    expect(newManager).to.eq(wallet1.address);
  });

  it('Should NOT allow a non-manager to set a new manager', async () => {
    expect(
      erc1820registry
        .connect(wallet1)
        .setManager(wallet2.address, wallet1.address)
    ).to.eventually.be.rejected.and.have.property(
      'code',
      Constants.CALL_EXCEPTION
    );
  });

  it('Should get the implementer of an interface', async () => {
    const implementer = await erc1820registry.getInterfaceImplementer(
      wallet1.address,
      ERC777TOKEN_HASH
    );

    expect(implementer).to.eq(ethers.ZeroAddress);
  });

  it('Should set a new implementer for an interface', async () => {
    await erc1820registry.setInterfaceImplementer(
      wallet1.address,
      ERC777TOKEN_HASH,
      wallet1.address
    );

    const implementer = await erc1820registry.getInterfaceImplementer(
      wallet1.address,
      ERC777TOKEN_HASH
    );

    expect(implementer).to.eq(wallet1.address);
  });
});
// Filename: test/openzeppelin/access-control/accessControl.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZAccessControlContract Test Suite', function () {
  let admin;
  let manager;
  let user;
  let accessContract;

  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE'));
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MANAGER_ROLE'));

  // Deploy the contract and set up roles before each test
  beforeEach(async function () {
    [admin, manager, user] = await ethers.getSigners();

    const AccessControlContract = await ethers.getContractFactory(
      Constants.Contract.AccessControlContract
    );
    accessContract = await AccessControlContract.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    // Grant the MANAGER_ROLE to the manager address
    await accessContract.connect(admin).grantManagerRole(manager.address);
  });

  it('admin should call adminFunction successfully', async function () {
    const result = await accessContract.connect(admin).adminFunction();
    expect(result).to.equal(
      'This function can only be called by administrators'
    );
  });

  it('manager should call managerFunction successfully', async function () {
    const result = await accessContract.connect(manager).managerFunction();
    expect(result).to.equal('This function can only be called by managers');
  });

  it('user should not be able to call adminFunction', async function () {
    await expect(accessContract.connect(user).adminFunction())
      .to.be.revertedWithCustomError(
        accessContract,
        'AccessControlUnauthorizedAccount'
      )
      .withArgs(user.address, ADMIN_ROLE);
  });

  it('user should not be able to call managerFunction', async function () {
    await expect(accessContract.connect(user).managerFunction())
      .to.be.revertedWithCustomError(
        accessContract,
        'AccessControlUnauthorizedAccount'
      )
      .withArgs(user.address, MANAGER_ROLE);
  });
});
// Filename: test/openzeppelin/beacon-proxy/beaconProxy.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Utils = require('../../utils');
const Constants = require('../../constants');

describe('@OZBeaconProxy Test Suite', function () {
  let owner, signer;
  let contractLogicContractV1, factoryLogicContractV1, contractLogicContractV2;
  let beaconFactory, beaconProxyFactory, beacon, beaconProxy, beaconProxy2;

  before(async function () {
    [owner, signer] = await ethers.getSigners();
    factoryLogicContractV1 = await ethers.getContractFactory(
      Constants.Contract.LogicContractV1
    );
    const initialValue = 1;
    contractLogicContractV1 = await factoryLogicContractV1.deploy(initialValue);

    beaconFactory = await ethers.getContractFactory(
      Constants.Contract.BeaconContract
    );
    beacon = await beaconFactory.deploy(
      await contractLogicContractV1.getAddress(),
      owner.address
    );

    beaconProxyFactory = await ethers.getContractFactory(
      Constants.Contract.BeaconProxyContract
    );
    beaconProxy = await beaconProxyFactory.deploy(await beacon.getAddress());
  });

  it('verifies several proxies can be created and used', async function () {
    const beaconProxyFactory2 = await ethers.getContractFactory(
      Constants.Contract.BeaconProxyContract
    );
    beaconProxy2 = await beaconProxyFactory2.deploy(await beacon.getAddress());
    const eventValueHashed = ethers.keccak256(
      ethers.toUtf8Bytes('Value(uint256)')
    );
    const signedTx = await owner.sendTransaction({
      to: await beaconProxy.getAddress(),
      data: '0x2e64cec1',
      gasLimit: 5000000,
    });

    const receipt = await signedTx.wait();
    expect(receipt.logs[0].topics[0]).to.eq(eventValueHashed);

    const signedTx2 = await owner.sendTransaction({
      to: await beaconProxy2.getAddress(),
      data: '0x2e64cec1',
      gasLimit: 5000000,
    });

    const receipt2 = await signedTx2.wait();
    expect(receipt2.logs[0].topics[0]).to.eq(eventValueHashed);
  });

  it('verifies contract can be called via beacon proxy', async function () {
    const signedTx = await owner.sendTransaction({
      to: await beaconProxy.getAddress(),
      data: '0x2e64cec1',
      gasLimit: 5000000,
    });
    const eventValueHashed = ethers.keccak256(
      ethers.toUtf8Bytes('Value(uint256)')
    );
    const receipt = await signedTx.wait();

    expect(receipt.logs[0].topics[0]).to.eq(eventValueHashed);
  });

  it('verifies underlying contract can be changed', async function () {
    const contractFactoryV2 = await ethers.getContractFactory(
      Constants.Contract.LogicContractV2
    );
    const initialValue = 2;
    contractLogicContractV2 = await contractFactoryV2.deploy(initialValue);

    const getImplementationBeforeUpgrade = await beacon.implementation();
    const functionSelectorUpgradeTo =
      Utils.functionSelector('upgradeTo(address)');
    const abi = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abi.encode(
      ['address'],
      [await contractLogicContractV2.getAddress()]
    );

    const signedTx = await owner.sendTransaction({
      to: await beacon.getAddress(),
      data: functionSelectorUpgradeTo + encoded.replace('0x', ''),
      gasLimit: 5000000,
    });
    const receipt = await signedTx.wait();

    const topics = receipt.logs[0].topics;
    const eventUpgradedNameHashed = ethers.keccak256(
      ethers.toUtf8Bytes('Upgraded(address)')
    );
    const newContractAddressEncoded =
      '0x000000000000000000000000' +
      (await contractLogicContractV2.getAddress()).replace('0x', '');
    expect(eventUpgradedNameHashed).to.eq(topics[0]);
    expect(newContractAddressEncoded.toLowerCase()).to.eq(topics[1]);

    const getImplementationAfterUpgrade = await beacon.implementation();
    const functionSelectorSquare = Utils.functionSelector('square(uint256)');
    const encoded2 = abi.encode(['uint256'], [2]);

    const eventSquaredNameHashed = ethers.keccak256(
      ethers.toUtf8Bytes('Squared(uint256)')
    );
    const signedTxToNewContract = await owner.sendTransaction({
      to: await beaconProxy.getAddress(),
      data: functionSelectorSquare + encoded2.replace('0x', ''),
      gasLimit: 5000000,
    });
    const receipt2 = await signedTxToNewContract.wait();

    expect(eventSquaredNameHashed).to.eq(receipt2.logs[0].topics[0]);
    expect(getImplementationBeforeUpgrade).to.eq(
      await contractLogicContractV1.getAddress()
    );
    expect(getImplementationAfterUpgrade).to.eq(
      await contractLogicContractV2.getAddress()
    );
  });

  describe('logicContractV2', function () {
    before(async function () {
      const contractFactoryV2 = await ethers.getContractFactory(
        Constants.Contract.LogicContractV2
      );
      const initialValue = 2;
      contractLogicContractV2 = await contractFactoryV2.deploy(initialValue);
    });

    it('verifies underlying contract can be changed only by owner', async function () {
      const functionSelectorUpgradeTo =
        Utils.functionSelector('upgradeTo(address)');
      const abi = ethers.AbiCoder.defaultAbiCoder();
      const encoded = abi.encode(
        ['address'],
        [await contractLogicContractV2.getAddress()]
      );

      const signedTx = await signer.sendTransaction({
        to: await beacon.getAddress(),
        data: functionSelectorUpgradeTo + encoded.replace('0x', ''),
        gasLimit: 5000000,
      });

      await expect(signedTx.wait()).to.eventually.be.rejected.and.have.property(
        'code',
        'CALL_EXCEPTION'
      );
    });

    it('verifies underlying contract cannot be changed to EOA address', async function () {
      const functionSelectorUpgradeTo =
        Utils.functionSelector('upgradeTo(address)');
      const abi = ethers.AbiCoder.defaultAbiCoder();
      const encoded = abi.encode(['address'], [owner.address]);

      const signedTx = await signer.sendTransaction({
        to: await beacon.getAddress(),
        data: functionSelectorUpgradeTo + encoded.replace('0x', ''),
        gasLimit: 5000000,
      });

      await expect(signedTx.wait()).to.eventually.be.rejected.and.have.property(
        'code',
        'CALL_EXCEPTION'
      );
    });
  });
});
// Filename: test/openzeppelin/create2/ContractCreatorOZCreate2.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZCreate2 Test Suite', async () => {
  let contractCreatorOZCreate2;
  const INITIAL_VALUE = 30_000_000_000;
  const NEW_CONTRACT_EVENT = 'NewContractDeployedAt';
  const TARGET_CONTRACT_CREATION_CODE =
    '0x6080604052610143806100115f395ff3fe608060405234801561000f575f80fd5b5060043610610034575f3560e01c8063a87d942c14610038578063d14e62b814610056575b5f80fd5b610040610072565b60405161004d919061009b565b60405180910390f35b610070600480360381019061006b91906100e2565b61007a565b005b5f8054905090565b805f8190555050565b5f819050919050565b61009581610083565b82525050565b5f6020820190506100ae5f83018461008c565b92915050565b5f80fd5b6100c181610083565b81146100cb575f80fd5b50565b5f813590506100dc816100b8565b92915050565b5f602082840312156100f7576100f66100b4565b5b5f610104848285016100ce565b9150509291505056fea264697066735822122067b162261c6513cb39839cd539597b324277f8ea3c28108d2ad498475dfa578064736f6c63430008140033';
  const TARGET_CONTRACT_CODE_HASH =
    '0xfe131e3071808ee9d140a8930ecf11a0f2dda60e626df1983bc19ea581f00d4b';

  before(async () => {
    const factory = await ethers.getContractFactory(
      Constants.Contract.ContractCreatorOZCreate2
    );
    contractCreatorOZCreate2 = await factory.deploy({
      gasLimit: 1000000,
      value: INITIAL_VALUE,
    });
  });

  it('Should deployed contractCreatorOZCreate2 with correct deployed arguments', async () => {
    const balance = await ethers.provider.getBalance(
      await contractCreatorOZCreate2.getAddress()
    );

    expect(balance).to.eq(INITIAL_VALUE);
    expect(ethers.isAddress(await contractCreatorOZCreate2.getAddress())).to.be
      .true;
  });

  it('Should deploy contract using OZ/Create2 library', async () => {
    const DEPLOYED_AMOUNT = 1;
    const SALT = 3;
    const tx = await contractCreatorOZCreate2.deploy(
      DEPLOYED_AMOUNT,
      SALT,
      TARGET_CONTRACT_CREATION_CODE
    );

    const receipt = await tx.wait();

    const [address] = receipt.logs.map(
      (e) => e.fragment.name === NEW_CONTRACT_EVENT && e
    )[0].args;

    expect(ethers.isAddress(address)).to.be.true;
  });

  it("Should NOT deploy if `amount` is greater than factory's balance", async () => {
    const SALT = 6;
    const DEPLOYED_AMOUNT = 4;
    const tx = await contractCreatorOZCreate2.deploy(
      DEPLOYED_AMOUNT,
      SALT,
      TARGET_CONTRACT_CREATION_CODE,
      Constants.GAS_LIMIT_1_000_000
    );

    try {
      await tx.wait();
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('Should NOT deploy if `salt` is not unique', async () => {
    const SALT = 9;
    const DEPLOYED_AMOUNT = 1;
    const tx1 = await contractCreatorOZCreate2.deploy(
      DEPLOYED_AMOUNT,
      SALT,
      TARGET_CONTRACT_CREATION_CODE,
      Constants.GAS_LIMIT_1_000_000
    );

    const receipt1 = await tx1.wait();
    const [address] = receipt1.logs.map(
      (e) => e.fragment.name === NEW_CONTRACT_EVENT && e
    )[0].args;

    expect(ethers.isAddress(address)).to.be.true;

    const tx2 = await contractCreatorOZCreate2.deploy(
      DEPLOYED_AMOUNT,
      SALT, // same salt
      TARGET_CONTRACT_CREATION_CODE,
      Constants.GAS_LIMIT_1_000_000
    );

    try {
      await tx2.wait();
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('Should NOT deploy if `bytecode` is empty', async () => {
    const SALT = 12;
    const DEPLOYED_AMOUNT = 1;
    const EMPTY_BYTECODE = '0x';
    const tx = await contractCreatorOZCreate2.deploy(
      DEPLOYED_AMOUNT,
      SALT,
      EMPTY_BYTECODE,
      Constants.GAS_LIMIT_1_000_000
    );

    try {
      await tx.wait();
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('Should compute the address using `salt` and `bytecodehash`', async () => {
    const SALT = 15;
    const address = await contractCreatorOZCreate2.computeAddress(
      SALT,
      TARGET_CONTRACT_CODE_HASH
    );

    const DEPLOYED_AMOUNT = 1;
    const deployedTx = await contractCreatorOZCreate2.deploy(
      DEPLOYED_AMOUNT,
      SALT,
      TARGET_CONTRACT_CREATION_CODE
    );
    const receipt = await deployedTx.wait();

    const [expectedAddress] = receipt.logs.map(
      (e) => e.fragment.name === NEW_CONTRACT_EVENT && e
    )[0].args;

    expect(address).to.eq(expectedAddress);
  });
});
// Filename: test/openzeppelin/finanace/VestingWallet.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZVestingWallet Test Suite', () => {
  let vestingWallet, erc20Mock, signers, beneficiaryAddress;
  const DURATION = 3; // seconds
  const GAS_LIMIT = 1_000_000;
  const INITIAL_FUND = 30_000_000_000;
  const TINY_BAR_TO_WEI_COEF = 10_000_000_000;
  const START = Math.round(Date.now() / 1000);
  const INITIAL_ERC20TOKEN_AMOUNT = 3_000_000;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    beneficiaryAddress = await signers[1].getAddress();

    const vestingWalletFactory = await ethers.getContractFactory(
      Constants.Contract.VestingWallet
    );
    vestingWallet = await vestingWalletFactory.deploy(
      beneficiaryAddress,
      START,
      DURATION,
      { value: INITIAL_FUND, gasLimit: GAS_LIMIT }
    );

    const erc20MockFactory = await ethers.getContractFactory(
      Constants.Contract.OZERC20Mock
    );

    erc20Mock = await erc20MockFactory.deploy('Hedera', 'HBAR');

    await erc20Mock.mint(
      await vestingWallet.getAddress(),
      INITIAL_ERC20TOKEN_AMOUNT
    );
  });

  it('Deployment', async () => {
    const vestingWalletEnd = await vestingWallet.end();
    const vestingWalletStart = await vestingWallet.start();
    const vestingWalletBeneficiary = await vestingWallet.owner();
    const vestingWalletDuration = await vestingWallet.duration();
    const vestingWalletBalance = await ethers.provider.getBalance(
      await vestingWallet.getAddress()
    );
    const vestingWalletErc20Balance = await erc20Mock.balanceOf(
      await vestingWallet.getAddress()
    );

    expect(vestingWalletStart).to.eq(START);
    expect(vestingWalletDuration).to.eq(DURATION);
    expect(vestingWalletBalance).to.eq(INITIAL_FUND);
    expect(vestingWalletEnd).to.eq(START + DURATION);
    expect(vestingWalletBeneficiary).to.eq(beneficiaryAddress);
    expect(vestingWalletErc20Balance).to.eq(INITIAL_ERC20TOKEN_AMOUNT);
  });

  it('Should get the amount of releasable hbar', async () => {
    const releasableHbar = await vestingWallet['releasable()']();
    expect(releasableHbar).to.eq(
      Math.round(INITIAL_FUND / TINY_BAR_TO_WEI_COEF)
    );
  });

  it('Should get the amount of releasable erc20 tokens', async () => {
    const releasableTokens = await vestingWallet['releasable(address)'](
      await erc20Mock.getAddress()
    );
    expect(releasableTokens).to.eq(INITIAL_ERC20TOKEN_AMOUNT);
  });

  it('Should release the native token that have already vested', async () => {
    const tx = await vestingWallet['release()']();

    const receipt = await tx.wait();

    const [receiverAddress, releasedAmount] = receipt.logs.map(
      (e) => e.fragment.name === 'HbarReleased' && e
    )[0].args;

    expect(receiverAddress).to.eq(beneficiaryAddress);
    expect(releasedAmount).to.eq(
      Math.round(INITIAL_FUND / TINY_BAR_TO_WEI_COEF)
    );
  });

  it('Should release the erc20 tokens that have already vested', async () => {
    const tx = await vestingWallet['release(address)'](
      await erc20Mock.getAddress()
    );

    const receipt = await tx.wait();

    const [receiverAddress, releasedTokenAddress, releasedTokenAmount] =
      receipt.logs.find((e) => e.fragment.name === 'ERC20Released').args;

    expect(receiverAddress).to.eq(beneficiaryAddress);
    expect(releasedTokenAddress).to.eq(await erc20Mock.getAddress());
    expect(releasedTokenAmount).to.eq(INITIAL_ERC20TOKEN_AMOUNT);
  });

  it('Should get the amount of hbar already released', async () => {
    await vestingWallet['release()']();

    const hbarReleased = await vestingWallet['released()']();

    expect(hbarReleased).to.eq(Math.round(INITIAL_FUND / TINY_BAR_TO_WEI_COEF));
  });

  it('Should get the amount of erc20 token already released', async () => {
    await vestingWallet['release(address)'](await erc20Mock.getAddress());

    const tokenReleased = await vestingWallet['released(address)'](
      await erc20Mock.getAddress()
    );

    expect(tokenReleased).to.eq(INITIAL_ERC20TOKEN_AMOUNT);
  });
});
// Filename: test/openzeppelin/governor/ExampleGovernor.js


const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZGovernor Test Suite', function () {
  let actions, exampleToken, governor, projectTeam, deployer, proposalId;
  const GAS_LIMIT = 1_000_000;
  const VOTE_WEIGHT = 1000;
  const VOTE_SUPPORT = 1; // 1 = For, 0 = Against, 2 = Abstain
  const GRANT_AMOUNT = 100;

  const description = 'Proposal #1: ';
  const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

  before(async function () {
    [deployer, projectTeam] = await ethers.getSigners();

    // Deploy the token contract
    const ExampleToken = await ethers.getContractFactory(
      Constants.Contract.ExampleTokenVote
    );
    exampleToken = await ExampleToken.deploy({ gasLimit: GAS_LIMIT });

    await exampleToken.mint(deployer.address, VOTE_WEIGHT);

    // Deploy the ExampleGovernor
    const ExampleGovernor = await ethers.getContractFactory(
      Constants.Contract.ExampleGovernor
    );
    governor = await ExampleGovernor.deploy(await exampleToken.getAddress(), {
      gasLimit: GAS_LIMIT,
    });

    const teamAddress = await projectTeam.getAddress();
    const transferCalldata = exampleToken.interface.encodeFunctionData(
      'transfer',
      [teamAddress, GRANT_AMOUNT]
    );

    actions = {
      targets: [await exampleToken.getAddress()],
      values: [0], // ETH value for the transaction, typically 0 for non-payable functions
      calldatas: [transferCalldata],
    };
  });

  it('Should allow creating proposals', async function () {
    await exampleToken.connect(deployer).delegate(deployer.address); // Delegate votes
    const tx = await governor
      .connect(deployer)
      .propose(actions.targets, actions.values, actions.calldatas, description);
    const receipt = await tx.wait();

    const event = receipt.logs.find(
      (event) => event.fragment.name === 'ProposalCreated'
    );

    proposalId = event.args.proposalId;

    expect(proposalId).to.not.be.undefined;
    expect(event.args.description).to.eq(description);
    expect(event.args.targets[0]).to.eq(await exampleToken.getAddress());
    expect(event.args.proposer).to.eq(await deployer.getAddress());
  });

  it('Should allow voting on a proposal', async function () {
    const tx = await governor
      .connect(deployer)
      .castVote(proposalId, VOTE_SUPPORT, Constants.GAS_LIMIT_1_000_000);
    const receipt = await tx.wait();
    const event = receipt.logs.find((e) => e.fragment.name === 'VoteCast');
    const proposalDeadline = await governor.proposalDeadline(proposalId);

    const proposalState = await governor.state(proposalId);

    expect(proposalState).to.eq(1); // active
    expect(event.args.support).to.eq(VOTE_SUPPORT);
    expect(event.args.proposalId).to.eq(proposalId);
    expect(event.blockNumber).to.lte(proposalDeadline);
    expect(event.args.voter).to.eq(await deployer.getAddress());
    expect(event.args.weight).to.eq(BigInt(VOTE_WEIGHT));
  });

  it('Should wait until the Vote Period passes and return a successful state on the proposal', async () => {
    // wait for voting period to be over => Proposal Succeeded as the quorum has reached and the majority of the vote is in favor
    let blockNum = await ethers.provider.getBlockNumber();
    const proposalDeadline = await governor.proposalDeadline(proposalId);

    while (blockNum <= proposalDeadline) {
      new Promise((r) => setTimeout(r, 500));
      blockNum = await ethers.provider.getBlockNumber();
    }

    const proposalState = await governor.state(proposalId);
    expect(proposalState).to.equal(4); // 4 = Succeeded
  });

  it('Should execute a proposal', async () => {
    // in production, there should be a treasury account for this task
    // funding governor contract
    await exampleToken
      .connect(deployer)
      .transfer(await governor.getAddress(), GRANT_AMOUNT);

    expect(await exampleToken.balanceOf(await governor.getAddress())).to.eq(
      GRANT_AMOUNT
    );

    // execute proposal
    const tx = await governor
      .connect(deployer)
      .execute(
        actions.targets,
        actions.values,
        actions.calldatas,
        descriptionHash
      );
    await tx.wait();

    expect(await exampleToken.balanceOf(deployer.address)).to.eq(
      BigInt(VOTE_WEIGHT - GRANT_AMOUNT)
    );
    expect(await exampleToken.balanceOf(await governor.getAddress())).to.eq(
      BigInt(0)
    );
    expect(await exampleToken.balanceOf(projectTeam.address)).to.eq(
      BigInt(GRANT_AMOUNT)
    );

    const proposalState = await governor.state(proposalId);
    expect(proposalState).to.eq(7); // 7 = Executed
  });
});
// Filename: test/openzeppelin/governor/ExampleTokenVote.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('ExampleToken Test Suite', function () {
  let ExampleToken;
  let token;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    ExampleToken = await ethers.getContractFactory(
      Constants.Contract.ExampleTokenVote
    );
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a new ExampleToken contract before each test.
    token = await ExampleToken.deploy(Constants.GAS_LIMIT_1_000_000);

    await token.mint(owner.address, ethers.parseEther('1000'));
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it('Should assign the total supply of tokens to the owner', async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe('Transactions', function () {
    it('Should transfer tokens between accounts', async function () {
      // Transfer 50 tokens from owner to addr1
      await token.transfer(addr1.address, 50);
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);

      // Transfer 50 tokens from addr1 to addr2
      await token.connect(addr1).transfer(addr2.address, 50);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });

    it('Should fail if sender doesn’t have enough tokens', async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      const addr1Balance = await token.balanceOf(addr1.address);

      // Try to send 1 token from addr1 (0 tokens) to owner (1000 tokens).
      // `require` will evaluate false and revert the transaction.
      // await expect(await token.connect(addr1).transfer(owner.address, 51)).to.be.
      // revertedWithCustomError(token, 'ERC20InsufficientBalance').withArgs('0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 0, 1);
      try {
        await token
          .connect(addr1)
          .transfer(owner.address, 1, Constants.GAS_LIMIT_800000);
      } catch (error) {
        const errorData = error.data;
        const errorSignature = ethers
          .id('ERC20InsufficientBalance(address,uint256,uint256)')
          .substring(0, 10);
        if (errorData.data.startsWith(errorSignature)) {
          // Check if the error data starts with the custom error signature
          expect(errorData.data.substring(0, 10)).to.equal(errorSignature);
        }
      }

      // Owner balance shouldn't have changed.
      expect(await token.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });
  });

  describe('Permit', function () {
    it('Should allow permit-based token transfer', async function () {
      // Your permit functionality test here
    });
  });

  describe('Votes', function () {
    it('Should correctly tally votes after transfer', async function () {
      // Your voting power test here
    });
  });
});
// Filename: test/openzeppelin/helpers/eip712.js
// SPDX-License-Identifier: Apache-2.0
const { ethers } = require('ethers');

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
];

const Permit = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
];

async function getDomain(contract) {
  const {
    fields,
    name,
    version,
    chainId,
    verifyingContract,
    salt,
    extensions,
  } = await contract.eip712Domain();

  if (extensions.length > 0) {
    throw Error('Extensions not implemented');
  }

  const domain = {
    name,
    version,
    // TODO: remove check when contracts are all migrated to ethers
    chainId: chainId,
    verifyingContract,
    salt,
  };

  for (const [i, { name }] of EIP712Domain.entries()) {
    if (!(fields & (1 << i))) {
      delete domain[name];
    }
  }

  return domain;
}

function domainType(domain) {
  return EIP712Domain.filter(({ name }) => domain[name] !== undefined);
}

function hashTypedData(domain, structHash) {
  return ethers.keccak256(
    Buffer.concat(
      [
        '0x1901',
        ethers.utils._TypedDataEncoder.hashDomain(domain),
        structHash,
      ].map(ethers.toBeArray)
    )
  );
}

module.exports = {
  Permit,
  getDomain,
  domainType,
  domainSeparator: ethers.TypedDataEncoder.hashDomain,
  hashTypedData,
};
// Filename: test/openzeppelin/multicall/multicall.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZMulticall Test Suite', function () {
  let contract;

  before(async function () {
    const factoryErrorsExternal = await ethers.getContractFactory(
      Constants.Contract.MulticallTest
    );
    contract = await factoryErrorsExternal.deploy();
  });

  it('should perform a multicall', async function () {
    const foo = await contract.foo.populateTransaction();
    const bar = await contract.bar.populateTransaction();
    const res = await contract.multicall.staticCall([foo.data, bar.data]);

    expect(BigInt(res[0])).to.be.equal(BigInt(123));
    expect(BigInt(res[1])).to.be.equal(BigInt(456));
  });
});
// Filename: test/openzeppelin/ownable/CrowdFund.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZOwnable Crowd Fund Test Suite', () => {
  const FUND_AMOUNT = 30000000000;
  const TINY_BAR_TO_WEI_COEF = 10_000_000_000;

  let crowdFund, signers, ownerAddress;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const crowdFundFactory = await ethers.getContractFactory(
      Constants.Contract.CrowdFund
    );

    crowdFund = await crowdFundFactory.deploy(ownerAddress);
  });

  it('Deployment', async () => {
    const contractOwner = await crowdFund.owner();
    const contractBalance = await crowdFund.balance();

    expect(contractBalance).to.eq(0);
    expect(contractOwner).to.eq(ownerAddress);
    expect(ethers.isAddress(await crowdFund.getAddress())).to.be.true;
  });

  it('Should deposit an amount of HBAR', async () => {
    // prepare funder
    const funder = signers[1];

    // prepare transaction
    const tx = await crowdFund.connect(funder).deposit({ value: FUND_AMOUNT });

    // wait for receipt
    const receipt = await tx.wait();

    // extract event arguments
    const [funderAddress, fundedAmount] = receipt.logs.map(
      (e) => e.fragment.name === 'Deposit' && e
    )[0].args;

    // retrieve contract balance
    const contractBalance = await crowdFund.balance();

    // assertions
    expect(funderAddress).to.eq(await funder.getAddress());
    expect(fundedAmount).to.eq(Math.round(FUND_AMOUNT / TINY_BAR_TO_WEI_COEF));
    expect(contractBalance).to.eq(
      Math.round(FUND_AMOUNT / TINY_BAR_TO_WEI_COEF)
    );
  });

  it('Should allow owner to withdraw an amount which is less than contract balance', async () => {
    // prepare signers
    const owner = signers[0];
    const funder = signers[1];

    // fund the contract by the funder
    await crowdFund.connect(funder).deposit({ value: FUND_AMOUNT });

    // prepare transaction to withdraw an amount by owner
    const WITHDRAWN_AMOUNT = 10000000000;
    const tx = await crowdFund
      .connect(owner)
      .withdraw(
        WITHDRAWN_AMOUNT / TINY_BAR_TO_WEI_COEF,
        Constants.GAS_LIMIT_1_000_000
      );

    // wait for receipt
    const receipt = await tx.wait();

    // extract event arguments
    const [ownerAddress, withdrawnAmount] = receipt.logs.map(
      (e) => e.fragment.name === 'Withdraw' && e
    )[0].args;

    // retrieve contract balance
    const contractBalance = await crowdFund.balance();

    // assertions
    expect(ownerAddress).to.eq(await owner.getAddress());
    expect(withdrawnAmount).to.eq(
      Math.floor(WITHDRAWN_AMOUNT / TINY_BAR_TO_WEI_COEF)
    );
    expect(contractBalance).to.eq(
      Math.floor((FUND_AMOUNT - WITHDRAWN_AMOUNT) / TINY_BAR_TO_WEI_COEF)
    );
  });

  it('Should NOT allow owner to withdraw an amount which is greater than the contract balance', async () => {
    let error;
    // prepare signers
    const owner = signers[0];
    const funder = signers[1];

    // fund the contract by the funder
    await crowdFund.connect(funder).deposit({ value: FUND_AMOUNT });

    // prepare transaction to withdraw an amount by owner
    const WITHDRAWN_AMOUNT = 40000000000; // > FUND_AMOUNT

    expect(
      crowdFund.connect(owner).withdraw(WITHDRAWN_AMOUNT / TINY_BAR_TO_WEI_COEF)
    ).to.be.reverted;

    const balance = await crowdFund.balance();
    expect(balance).to.eq(Math.round(FUND_AMOUNT / TINY_BAR_TO_WEI_COEF));
  });

  it('Should NOT allow non-owner address to withdraw', async () => {
    let error;
    try {
      const funder = signers[1];
      const tx = await crowdFund.connect(funder).withdraw(0);
      await tx.wait();
    } catch (e) {
      error = e;
    }

    expect(error).to.not.null;
  });

  it('Should transfer ownership to another owner', async () => {
    // prepare signers
    const currentOwnerAddress = ownerAddress;
    const newDesignatedOwnerAddress = await signers[1].getAddress();

    // prepare transferOwnership transaction
    const tx = await crowdFund.transferOwnership(newDesignatedOwnerAddress);

    // wait for receipt
    const receipt = await tx.wait();

    // extra event's args
    const [oldOwner, newOwner] = receipt.logs.map(
      (e) => e.fragment.name === 'OwnershipTransferred' && e
    )[0].args;

    // retrieve current contract owner
    const contractOwner = await crowdFund.owner();

    // assertions
    expect(oldOwner).to.eq(currentOwnerAddress);
    expect(newOwner).to.eq(newDesignatedOwnerAddress);
    expect(contractOwner).to.eq(newDesignatedOwnerAddress);
  });

  it('Should renounce ownership', async () => {
    // prepare renounceOwnership transaction
    const tx = await crowdFund.renounceOwnership(Constants.GAS_LIMIT_1_000_000);

    // wait for receipt
    const receipt = await tx.wait();

    // extra event's args
    const [oldOwner, newOwner] = receipt.logs.map(
      (e) => e.fragment.name === 'OwnershipTransferred' && e
    )[0].args;

    // retrieve current contract owner
    const contractOwner = await crowdFund.owner();

    // assertion
    expect(oldOwner).to.eq(ownerAddress);
    expect(newOwner).to.eq(ethers.ZeroAddress);
    expect(contractOwner).to.eq(ethers.ZeroAddress);
  });
});
// Filename: test/openzeppelin/pausable/pausable.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZPausable Test Suite', function () {
  let signers, wallet;
  let contract;
  const CALL_EXCEPTION = 'CALL_EXCEPTION';

  before(async function () {
    signers = await ethers.getSigners();
    wallet = signers[0];

    const factory = await ethers.getContractFactory(
      Constants.Contract.PausableTest
    );
    contract = await factory.deploy();
    await contract.waitForDeployment();
  });

  it('should BE able to call function "setPausedMessage" with "whenNotPaused" modifier when unpaused', async function () {
    const tx = await contract.setPausedMessage('Hello World');
    await tx.wait();
    const message = await contract.message();

    expect(message).to.equal('Hello World');
  });

  it('should NOT be able to call function "setPausedMessage" with "whenNotPaused" modifier when paused', async function () {
    const tx = await contract.pause();
    await tx.wait()

    expect(
      contract.setPausedMessage('some other message')
    ).to.eventually.be.rejected.and.have.property('code', CALL_EXCEPTION);
  });

  it('should BE able to call function "getPausedMessage" with "whenNotPaused" modifier when unpaused', async function () {
    expect(await contract.getPausedMessage()).to.be.equal('Hello World');
  });

  it('should NOT be able to call function "getPausedMessage" with "whenNotPaused" modifier when paused', async function () {
    const tx = await contract.unpause();
    await tx.wait();

    expect(
      contract.getPausedMessage()
    ).to.eventually.be.rejected.and.have.property('code', CALL_EXCEPTION);
  });

  it('should fire event when Paused', async function () {
    const tx = await contract.pause(Constants.GAS_LIMIT_1_000_000);
    const rec = await tx.wait();
    const event = rec.logs[0];
    const account = event.args.account;

    expect(event.fragment.name).to.be.equal('Paused');
    expect(account).to.be.equal(wallet.address);
  });

  it('should fire event when Unpaused', async function () {
    const tx = await contract.unpause(Constants.GAS_LIMIT_1_000_000);
    const rec = await tx.wait();
    const event = rec.logs[0];
    const account = event.args.account;

    expect(event.fragment.name).to.be.equal('Unpaused');
    expect(account).to.be.equal(wallet.address);
  });

  it('should Not be able to pause when paused', async function () {
    const tx = await contract.pause(Constants.GAS_LIMIT_1_000_000);
    await tx.wait();

    expect(contract.pause()).to.eventually.be.rejected.and.have.property(
      'code',
      CALL_EXCEPTION
    );
  });

  it('should Not be able to Unpause when Unpaused', async function () {
    const tx = await contract.unpause();
    await tx.wait();

    expect(contract.unpause()).to.eventually.be.rejected.and.have.property(
      'code',
      CALL_EXCEPTION
    );
  });
});
// Filename: test/openzeppelin/proxy-upgrade/proxyUpgradeContracts.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const utils = require('../../system-contracts/hedera-token-service/utils');
const Constants = require('../../constants');
const { pollForNewCounterValue } = require('../../../utils/helpers');

describe('Proxy Upgrade Contracts Test Suite', function () {
  let signers;

  before(async function () {
    signers = await ethers.getSigners();
  });

  describe('DEX Upgradable Contract Test Suite', function () {
    let tokenCreateContract;
    let erc20Contract;
    let tokenAddress;
    let proxyContract;
    let proxyAddress;
    let exchangeTokenBalance;

    before(async function () {
      tokenCreateContract = await utils.deployTokenCreateContract();
      await utils.updateAccountKeysViaHapi([
        await tokenCreateContract.getAddress(),
      ]);
      tokenAddress = await utils.createFungibleTokenWithSECP256K1AdminKey(
        tokenCreateContract,
        signers[0].address,
        utils.getSignerCompressedPublicKey()
      );
      await utils.updateTokenKeysViaHapi(tokenAddress, [
        await tokenCreateContract.getAddress(),
      ]);

      erc20Contract = await utils.deployERC20Contract();
      proxyContract = await deployDEXProxyContract(tokenAddress);
      proxyAddress = await proxyContract.getAddress();

      await proxyContract.associateToken(Constants.GAS_LIMIT_1_000_000);

      await tokenCreateContract.grantTokenKycPublic(
        tokenAddress,
        proxyAddress,
        Constants.GAS_LIMIT_1_000_000
      );

      exchangeTokenBalance = 500;
      await proxyContract.depositTokens(`${exchangeTokenBalance}`);
    });

    async function deployDEXProxyContract(token) {
      const contract = await ethers.getContractFactory(
        Constants.Contract.Exchange
      );

      const proxy = await upgrades.deployProxy(contract, [token], {
        kind: 'uups',
        initializer: 'initialize',
      });
      await proxy.waitForDeployment();

      return proxy;
    }

    async function updateDEXProxyContract() {
      const contract = await ethers.getContractFactory(
        Constants.Contract.ExchangeV2
      );

      const proxy = await upgrades.upgradeProxy(
        proxyAddress,
        contract,
        {
          kind: 'uups',
        },
        Constants.GAS_LIMIT_1_000_000
      );

      // wait for the upgrade transaction to completely be done
      await proxy.deployTransaction.wait();

      return proxy;
    }

    //Disabled due to a change that prevents a smart contract from using a delegate call to call a precompiled contracts.
    xit('should deposit, buy and sell tokens from ExchangeV1', async function () {
      //deposit funds
      {
        const balanceBefore = await proxyContract.getNativeBalance();
        await proxyContract.deposit({
          value: ethers.parseEther('0.5'),
        });
        const balanceAfter = await proxyContract.getNativeBalance();

        expect(
          balanceAfter,
          'Asserting new balance is greater'
        ).to.be.greaterThan(balanceBefore);
      }

      //buy token
      {
        const tokenBalanceBefore = await proxyContract.getTokenBalance();
        const nativeBalanceBefore = await proxyContract.getNativeBalance();

        await proxyContract.buy({
          value: ethers.parseEther('0.000001'),
        });

        const tokenBalanceAfter = await proxyContract.getTokenBalance();
        const nativeBalanceAfter = await proxyContract.getNativeBalance();

        expect(
          tokenBalanceAfter,
          'Asserting new token balance is lesser'
        ).to.be.lessThan(tokenBalanceBefore);

        expect(
          nativeBalanceAfter,
          'Asserting new balance is greater'
        ).to.be.greaterThan(nativeBalanceBefore);
      }

      //sell token
      {
        const amount = '10';

        const allowanceBefore = await erc20Contract.allowance(
          tokenAddress,
          signers[0].address,
          proxyAddress
        );
        const tokenBalanceBefore = await proxyContract.getTokenBalance();

        await erc20Contract.delegateApprove(
          tokenAddress,
          proxyAddress,
          amount,
          Constants.GAS_LIMIT_1_000_000
        );
        const allowanceAfter = await erc20Contract.allowance(
          tokenAddress,
          signers[0].address,
          proxyAddress
        );
        await proxyContract.sell(amount);
        const tokenBalanceAfter = await proxyContract.getTokenBalance();

        expect(
          allowanceAfter,
          'Asserting that certain amount was approved to be spend'
        ).to.be.greaterThan(allowanceBefore);

        expect(
          tokenBalanceBefore.add(amount),
          'Asserting that certain amount was sold'
        ).to.be.eq(tokenBalanceAfter);
      }
    });

    it('should not be able to get version', async function () {
      try {
        await proxyContract.version();
      } catch (e) {
        expect(e).to.exist;
        expect(e.toString()).to.contain(
          'proxyContract.version is not a function'
        );
      }
    });

    it('should upgrade contract to V2', async function () {
      const addressV1 = await proxyContract.getImplementationAddress();
      proxyContract = await updateDEXProxyContract();
      // await new Promise((r) => setTimeout(r, 2000));
      const addressV2 = await proxyContract.getImplementationAddress();

      expect(
        addressV1,
        'Asserting implementation address is different'
      ).to.not.eq(addressV2);
    });

    //Disabled due to a change that prevents a smart contract from using a delegate call to call a precompiled contracts.
    xit('should deposit, buy and withdraw tokens from ExchangeV2', async function () {
      //checkVersion
      {
        const version = await proxyContract.version();
        expect(version, 'Asserting contract version is V2').to.eq('V2');
      }

      //deposit funds
      {
        const balanceBefore = await proxyContract.getNativeBalance();
        await proxyContract.deposit({
          value: ethers.parseEther('0.5'),
        });
        const balanceAfter = await proxyContract.getNativeBalance();

        expect(
          balanceAfter,
          'Asserting new balance is greater'
        ).to.be.greaterThan(balanceBefore);
      }

      //buy token
      {
        const tokenBalanceBefore = await proxyContract.getTokenBalance();
        const nativeBalanceBefore = await proxyContract.getNativeBalance();

        await proxyContract.buy({
          value: ethers.parseEther('0.000001'),
        });

        const tokenBalanceAfter = await proxyContract.getTokenBalance();
        const nativeBalanceAfter = await proxyContract.getNativeBalance();

        expect(
          tokenBalanceAfter,
          'Asserting new token balance is lesser'
        ).to.be.lessThan(tokenBalanceBefore);

        expect(
          nativeBalanceAfter,
          'Asserting new balance is greater'
        ).to.be.greaterThan(nativeBalanceBefore);
      }

      //sell token
      {
        const amount = '10';

        const allowanceBefore = await erc20Contract.allowance(
          tokenAddress,
          signers[0].address,
          proxyAddress
        );
        const tokenBalanceBefore = await proxyContract.getTokenBalance();

        await erc20Contract.delegateApprove(
          tokenAddress,
          proxyAddress,
          amount,
          Constants.GAS_LIMIT_1_000_000
        );
        const allowanceAfter = await erc20Contract.allowance(
          tokenAddress,
          signers[0].address,
          proxyAddress
        );
        await proxyContract.sell(amount);
        const tokenBalanceAfter = await proxyContract.getTokenBalance();

        expect(
          allowanceAfter,
          'Asserting that certain amount was approved to be spend'
        ).to.be.greaterThan(allowanceBefore);

        expect(
          tokenBalanceBefore.add(amount),
          'Asserting that certain amount was sold'
        ).to.be.eq(tokenBalanceAfter);
      }
    });
  });

  describe('Counter Upgradable Contract Test Suite', function () {
    const nameV1 = 'Counter';
    const nameV2 = 'CounterV2';
    let proxyContract;
    let proxyAddress;

    before(async function () {
      proxyContract = await deployCounterProxyContract();
      proxyAddress = await proxyContract.getAddress();
    });

    async function deployCounterProxyContract() {
      const contract = await ethers.getContractFactory(
        Constants.Contract.Counter
      );

      const proxy = await upgrades.deployProxy(contract, [nameV1], {
        kind: 'uups',
        initializer: 'initialize',
      });
      await proxy.waitForDeployment();

      return proxy;
    }

    async function updateCounterProxyContract() {
      const contract = await ethers.getContractFactory(
        Constants.Contract.CounterV2
      );

      const proxy = await upgrades.upgradeProxy(proxyAddress, contract, {
        kind: 'uups',
      });

      return proxy;
    }

    it('should be able to increase and decrease counter on V1', async function () {
      //increment counter
      {
        const counterBefore = await proxyContract.count();
        await (await proxyContract.increment()).wait();
        const counterAfter = await proxyContract.count();
        expect(counterAfter, 'Asserting counter increment').to.be.greaterThan(
          counterBefore
        );
      }

      //decrement counter
      {
        const counterBefore = await proxyContract.count();
        await (await proxyContract.decrement()).wait();
        const counterAfter = await proxyContract.count();
        expect(
          counterAfter,
          'Asserting counter decrement'
        ).to.be.lessThanOrEqual(counterBefore);
      }
    });

    it('should not be able to change name', async function () {
      try {
        await proxyContract.changeName(Constants.Contract.CounterV1);
      } catch (e) {
        expect(e).to.exist;
        expect(e.toString()).to.contain(
          'proxyContract.changeName is not a function'
        );
      }
    });

    it('should be able to upgrade contract to V2', async function () {
      const addressV1 =
        await upgrades.erc1967.getImplementationAddress(proxyAddress);

      proxyContract = await updateCounterProxyContract();

      const addressV2 =
        await upgrades.erc1967.getImplementationAddress(proxyAddress);

      expect(
        addressV1,
        'Asserting implementation address is different'
      ).to.not.eq(addressV2);
    });

    it('should be able to increase and decrease counter on V2', async function () {
      //increment counter
      {
        const counterBefore = await proxyContract.count();
        const tx = await proxyContract.increment();
        await tx.wait();

        const counterAfter = await pollForNewCounterValue(
          proxyContract,
          counterBefore
        );
        expect(counterAfter, 'Asserting counter increment').to.be.greaterThan(
          counterBefore
        );
      }

      //decrement counter
      {
        const counterBefore = await proxyContract.count();
        const tx = await proxyContract.decrement();
        await tx.wait();
        const counterAfter = await proxyContract.count();
        expect(
          counterAfter,
          'Asserting counter decrement'
        ).to.be.lessThanOrEqual(counterBefore);
      }

      //change name
      {
        const tx = await proxyContract.changeName(
          nameV2,
          Constants.GAS_LIMIT_1_000_000
        );
        await tx.wait();
        const name = await proxyContract.name();
        expect(name, 'Asserting counter name is different').to.eq(nameV2);
      }
    });
  });
});
// Filename: test/openzeppelin/safe-cast/safeCast.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@OZSafeCast Test Suite', function () {
  let contract;

  const SAFE_CAST_OVERLOW_UINT = 'SafeCastOverflowedUintDowncast';
  const SAFE_CAST_OVERLOW_INT = 'SafeCastOverflowedIntDowncast';
  const SAFE_CATS_OVERLOW_UINT_TO_INT = 'SafeCastOverflowedUintToInt';
  const SAFE_CATS_OVERLOW_INT_TO_UINT = 'SafeCastOverflowedIntToUint';

  const conversions = [
    { func: 'toUint256', error: SAFE_CATS_OVERLOW_INT_TO_UINT },
    { func: 'toUint248', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint240', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint232', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint224', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint216', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint208', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint200', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint192', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint184', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint176', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint168', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint160', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint152', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint144', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint136', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint128', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint120', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint112', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint104', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint96', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint88', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint80', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint72', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint64', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint56', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint48', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint40', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint32', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint24', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint16', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toUint8', error: SAFE_CAST_OVERLOW_UINT },
    { func: 'toInt256', error: SAFE_CATS_OVERLOW_UINT_TO_INT },
    { func: 'toInt248', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt240', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt232', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt224', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt216', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt208', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt200', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt192', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt184', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt176', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt168', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt160', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt152', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt144', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt136', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt128', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt120', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt112', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt104', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt96', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt88', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt80', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt72', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt64', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt56', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt48', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt40', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt32', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt24', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt16', error: SAFE_CAST_OVERLOW_INT },
    { func: 'toInt8', error: SAFE_CAST_OVERLOW_INT },
  ];

  before(async function () {
    const factory = await ethers.getContractFactory(
      Constants.Contract.SafeCastTest
    );
    contract = await factory.deploy({
      gasLimit: 10000000,
    });
  });

  for (const { func, error } of conversions) {
    it(`should return correct value and revert for: "${func}"`, async function () {
      const res = await contract[func](0);
      expect(res).to.exist;
      const revertVal = func === 'toUint256' ? -1 : 1;

      await expect(contract[func](revertVal)).to.eventually.be.rejected;
    });
  }
});
// Filename: test/openzeppelin/transparent-upgradeable-proxy/transparentProxy.js
// SPDX-License-Identifier: Apache-2.0

const chai = require('chai');
const { expect } = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const Utils = require('../../utils');
chai.use(chaiAsPromised);

describe('@OZTransparentUpgradeableProxy Test Suite', function () {
  let contractProxy, contractBox, contractBoxV2;
  let owner, signer, proxyAdminAddress;
  before(async function () {
    [owner, signer] = await ethers.getSigners();
    const factoryBox = await ethers.getContractFactory(Constants.Contract.Box);
    contractBox = await factoryBox.deploy();

    const factory = await ethers.getContractFactory(
      Constants.Contract.MyCustomTransparentUpgradeableProxy
    );
    contractProxy = await factory.deploy(
      await contractBox.getAddress(),
      owner.address,
      '0x',
      Constants.GAS_LIMIT_1_000_000
    );

    const upgradeLogs = (await contractProxy.deploymentTransaction().wait())
      .logs;

    proxyAdminAddress = upgradeLogs[2].args.newAdmin;
  });

  it('should verify it calls the correct contract and method via proxy', async function () {
    const storeFunctionData =
      '0x6057361d0000000000000000000000000000000000000000000000000000000000000008';
    const signedTx = await owner.sendTransaction({
      to: await contractProxy.getAddress(),
      data: storeFunctionData,
      gasLimit: 5000000,
    });
    const receipt = await signedTx.wait();
    const encodedInt =
      '0x0000000000000000000000000000000000000000000000000000000000000008';
    expect(receipt.to).to.eq(await contractProxy.getAddress());
    expect(receipt.from).to.eq(owner.address);
    expect(receipt.logs[0].data).to.eq(encodedInt);
  });

  it('should verify it can change the underlying contract', async function () {
    const factoryBoxV2 = await ethers.getContractFactory(
      Constants.Contract.BoxV2
    );
    contractBoxV2 = await factoryBoxV2.deploy();

    const functionSelectorUpgradeAndCall = Utils.functionSelector(
      'upgradeAndCall(address,address,bytes)'
    );

    const abi = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abi.encode(
      ['address', 'address', 'bytes'],
      [await contractProxy.getAddress(), await contractBoxV2.getAddress(), '0x']
    );

    const signedTx = await owner.sendTransaction({
      to: proxyAdminAddress,
      data: functionSelectorUpgradeAndCall + encoded.replace('0x', ''),
      gasLimit: 5000000,
    });

    const receipt = await signedTx.wait();

    const topics = receipt.logs[0].topics;
    const eventUpgradedNameHashed = ethers.keccak256(
      ethers.toUtf8Bytes('Upgraded(address)')
    );
    const newContractAddressEncoded =
      '0x000000000000000000000000' +
      (await contractBoxV2.getAddress()).replace('0x', '');
    expect(eventUpgradedNameHashed).to.eq(topics[0]);
    expect(newContractAddressEncoded.toLowerCase()).to.eq(topics[1]);

    const functionSelectorIncrement = Utils.functionSelector('increment()');
    const eventValueChangedNameHashed = ethers.keccak256(
      ethers.toUtf8Bytes('ValueChanged(uint256)')
    );
    const signedTxToNewContract = await owner.sendTransaction({
      to: await contractProxy.getAddress(),
      data: functionSelectorIncrement,
      gasLimit: 5000000,
    });

    const receipt2 = await signedTxToNewContract.wait();

    expect(eventValueChangedNameHashed).to.eq(receipt2.logs[0].topics[0]);
  });

  it('should verify proxy admin cannot be called by anyone other than owner', async function () {
    const factoryBoxV2 = await ethers.getContractFactory(
      Constants.Contract.BoxV2
    );
    contractBoxV2 = await factoryBoxV2.deploy();
    const functionSelectorUpgradeAndCall = ethers
      .keccak256(ethers.toUtf8Bytes('upgradeAndCall(address,address,bytes)'))
      .substring(0, 10);
    const abi = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abi.encode(
      ['address', 'address', 'bytes'],
      [await contractProxy.getAddress(), await contractBoxV2.getAddress(), '0x']
    );
    const tx = await signer.sendTransaction({
      to: proxyAdminAddress,
      data: functionSelectorUpgradeAndCall + encoded.replace('0x', ''),
      gasLimit: 5000000,
    });
    await expect(tx.wait()).to.eventually.be.rejected.and.have.property(
      'code',
      'CALL_EXCEPTION'
    );
  });
});
// Filename: test/openzeppelin/uups-upgradable/Vault.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const Constants = require('../../constants');
const { ethers, upgrades } = require('hardhat');

describe('@OZUUPSUpgradable Upgradable Vaults Test Suite', () => {
  const DEPOSIT_AMOUNT = ethers.parseEther('3.0');
  const TINY_BAR_TO_WEI_COEF = 10_000_000_000n;
  const CALL_EXCEPTION = 'CALL_EXCEPTION';
  let vaultV1, vaultV2, owner, beneficiary;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0];
    beneficiary = signers[1];

    const VaultV1 = await ethers.getContractFactory(Constants.Contract.VaultV1);
    vaultV1 = await upgrades.deployProxy(VaultV1, {
      kind: 'uups',
    });
    await vaultV1.waitForDeployment();
  });

  it('V1: Should deploy the proxy', async () => {
    expect(vaultV1).to.exist;
    expect(await vaultV1.version()).to.eq(1);
    expect(await vaultV1.totalBalance()).to.eq(0);
  });

  it('V1: Should deposit Hbar into vaultV1', async () => {
    await (await vaultV1.deposit({ value: DEPOSIT_AMOUNT })).wait();

    const totalBalance = await vaultV1.totalBalance();

    expect(totalBalance).to.eq(DEPOSIT_AMOUNT / TINY_BAR_TO_WEI_COEF);
  });

  it('V1: Should allow owner to withdraw an amount of Hbar', async () => {
    await (await vaultV1.deposit({ value: DEPOSIT_AMOUNT })).wait();
    const WITHDRAW_AMOUNT = ethers.parseEther('1.0') / TINY_BAR_TO_WEI_COEF;

    const tx = await vaultV1.withdraw(WITHDRAW_AMOUNT);
    const receipt = await tx.wait();
    const [withdrawer, amount] = receipt.logs[0].args;

    const totalLeftBalance = await vaultV1.totalBalance();

    expect(withdrawer).to.eq(await owner.getAddress());
    expect(amount).to.eq(WITHDRAW_AMOUNT);
    expect(totalLeftBalance).to.eq(
      DEPOSIT_AMOUNT / TINY_BAR_TO_WEI_COEF - WITHDRAW_AMOUNT
    );
  });

  it('V1: Should NOT allow owner to withdraw an amount of Hbar which is greater than current balance', async () => {
    const WITHDRAW_AMOUNT = ethers.parseEther('4.0') / TINY_BAR_TO_WEI_COEF;

    expect(
      vaultV1.withdraw(WITHDRAW_AMOUNT)
    ).to.eventually.be.rejected.and.have.property('code', CALL_EXCEPTION);
  });

  it('V1: Should NOT allow non-owner account to withdraw an amount of Hbar', async () => {
    const WITHDRAW_AMOUNT = ethers.parseEther('2.0') / TINY_BAR_TO_WEI_COEF;

    expect(
      vaultV1.connect(beneficiary).withdraw(WITHDRAW_AMOUNT)
    ).to.eventually.be.rejected.and.have.property('code', CALL_EXCEPTION);
  });

  describe('Vault V2 upgrade', () => {
    beforeEach(async () => {
      const VaultV2 = await ethers.getContractFactory(
        Constants.Contract.VaultV2
      );
      vaultV2 = await upgrades.upgradeProxy(
        await vaultV1.getAddress(),
        VaultV2,
        {
          kind: 'uups',
        }
      );
      // wait for the upgrade transaction to completely be done
      await vaultV2.deployTransaction.wait();

      const initTx = await vaultV2.initializeV2(await beneficiary.getAddress());
      await initTx.wait();
    });

    it('V2: Should upgrade vaultV1 to VaultV2', async () => {
      expect(await vaultV2.getAddress()).to.eq(await vaultV1.getAddress());
      expect(await vaultV2.version()).to.eq(2);
      expect(await vaultV2.getCurrentBeneficiary()).to.eq(
        await beneficiary.getAddress()
      );
    });

    it('V2: Should deposit Hbar into vaultV2', async () => {
      await (await vaultV2.deposit({ value: DEPOSIT_AMOUNT })).wait();

      const totalBalance = await vaultV1.totalBalance();

      expect(totalBalance).to.eq(DEPOSIT_AMOUNT / TINY_BAR_TO_WEI_COEF);
    });

    it('V2: Should allow the rightful beneficiary to withdraw an amount of Hbar', async () => {
      await (await vaultV2.deposit({ value: DEPOSIT_AMOUNT })).wait();

      const WITHDRAW_AMOUNT = ethers.parseEther('1.0') / TINY_BAR_TO_WEI_COEF;

      const tx = await vaultV2.connect(beneficiary).withdraw(WITHDRAW_AMOUNT);
      const receipt = await tx.wait();
      const [withdrawer, amount] = receipt.logs[0].args;
      const totalLeftBalance = await vaultV2.totalBalance();

      expect(withdrawer).to.eq(await beneficiary.getAddress());
      expect(amount).to.eq(WITHDRAW_AMOUNT);
      expect(totalLeftBalance).to.eq(
        DEPOSIT_AMOUNT / TINY_BAR_TO_WEI_COEF - WITHDRAW_AMOUNT
      );
    });

    it('V2: Should NOT allow beneficiary to withdraw an amount of Hbar which is greater than current balance', async () => {
      const WITHDRAW_AMOUNT = ethers.parseEther('4.0') / TINY_BAR_TO_WEI_COEF;

      expect(
        vaultV2.connect(beneficiary).withdraw(WITHDRAW_AMOUNT)
      ).to.eventually.be.rejected.and.have.property('code', CALL_EXCEPTION);
    });

    it('V2: Should NOT allow non-beneficial account to withdraw an amount of Hbar', async () => {
      const WITHDRAW_AMOUNT = ethers.parseEther('2.0') / TINY_BAR_TO_WEI_COEF;

      expect(
        vaultV1.connect(owner).withdraw(WITHDRAW_AMOUNT)
      ).to.eventually.be.rejected.and.have.property('code', CALL_EXCEPTION);
    });
  });
});
// Filename: test/safe-hts-precompile/SafeHTS.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../constants');
const utils = require('../system-contracts/hedera-token-service/utils');
const {
  pollForNewBalance,
  pollForNewHBarBalance,
} = require('../../utils/helpers');

describe('SafeHTS library Test Suite', function () {
  let safeOperationsContract;
  let fungibleTokenAddress;
  let nonFungibleTokenAddress;
  let safeViewOperationsContract;
  let signers;
  const nftSerial = '0x01';

  before(async function () {
    signers = await ethers.getSigners();
    safeOperationsContract = await deploySafeOperationsContract();
    safeViewOperationsContract = await deploySafeViewOperationsContract();
    await utils.updateAccountKeysViaHapi([
      await safeOperationsContract.getAddress(),
      await safeViewOperationsContract.getAddress(),
    ]);
    fungibleTokenAddress = await createFungibleToken();
    await utils.updateTokenKeysViaHapi(fungibleTokenAddress, [
      await safeOperationsContract.getAddress(),
      await safeViewOperationsContract.getAddress(),
    ]);
    nonFungibleTokenAddress = await createNonFungibleToken();
    await utils.updateTokenKeysViaHapi(nonFungibleTokenAddress, [
      await safeOperationsContract.getAddress(),
      await safeViewOperationsContract.getAddress(),
    ]);
  });

  async function deploySafeOperationsContract() {
    const safeOperationsFactory = await ethers.getContractFactory(
      Constants.Contract.SafeOperations
    );
    const safeOperations = await safeOperationsFactory
      .connect(signers[1])
      .deploy(Constants.GAS_LIMIT_1_000_000);

    return await ethers.getContractAt(
      Constants.Contract.SafeOperations,
      await safeOperations.getAddress()
    );
  }

  async function deploySafeViewOperationsContract() {
    const safeOperationsFactory = await ethers.getContractFactory(
      Constants.Contract.SafeViewOperations
    );
    const safeOperations = await safeOperationsFactory.deploy(
      Constants.GAS_LIMIT_10_000_000
    );

    return await ethers.getContractAt(
      Constants.Contract.SafeViewOperations,
      await safeOperations.getAddress()
    );
  }

  async function createFungibleToken() {
    const tokenAddressTx =
      await safeOperationsContract.safeCreateFungibleTokenPublic({
        value: BigInt('20000000000000000000'),
        gasLimit: 1_000_000,
      });

    const tokenAddressReceipt = await tokenAddressTx.wait();
    // token address
    return tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenCreated
    )[0].args[0];
  }

  async function createNonFungibleToken() {
    const tokenAddressTx =
      await safeOperationsContract.safeCreateNonFungibleTokenPublic({
        value: BigInt('50000000000000000000'),
        gasLimit: 10_000_000,
      });

    const tokenAddressReceipt = await tokenAddressTx.wait();
    // token address
    return tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenCreated
    )[0].args[0];
  }

  it('should be able to get token info', async function () {
    const tokenInfoTx =
      await safeViewOperationsContract.safeGetTokenInfoPublic(
        fungibleTokenAddress
      );
    const tokenInfoReceipt = await tokenInfoTx.wait();
    const tokenInfo = tokenInfoReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.GetTokenInfo
    )[0].args[0];

    expect(tokenInfo.token.name).to.equal(Constants.TOKEN_NAME);
    expect(tokenInfo.token.symbol).to.equal(Constants.TOKEN_SYMBOL);
    expect(tokenInfo.totalSupply).to.equal(200);
  });

  it('should be able to get fungible token info', async function () {
    const fungibleTokenInfoTx =
      await safeViewOperationsContract.safeGetFungibleTokenInfoPublic(
        fungibleTokenAddress
      );
    const fungibleTokenInfoReceipt = await fungibleTokenInfoTx.wait();
    const fungibleTokenInfo = fungibleTokenInfoReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.GetFungibleTokenInfo
    )[0].args[0];

    expect(fungibleTokenInfo.tokenInfo.token.name).to.equal(
      Constants.TOKEN_NAME
    );
    expect(fungibleTokenInfo.tokenInfo.token.symbol).to.equal(
      Constants.TOKEN_SYMBOL
    );
    expect(fungibleTokenInfo.tokenInfo.totalSupply).to.equal(200);
    expect(fungibleTokenInfo.decimals).to.equal(8);
  });

  it('should be able to get Non fungible token info', async function () {
    const amount = 0;

    const mintedTokenInfo = await safeOperationsContract.safeMintTokenPublic(
      nonFungibleTokenAddress,
      amount,
      [nftSerial],
      Constants.GAS_LIMIT_1_000_000
    );
    const nonFungibleTokenMintedReceipt = await mintedTokenInfo.wait();
    const nonFungibleTokeMintedInfo = nonFungibleTokenMintedReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.MintedNft
    )[0].args[0];
    expect(nonFungibleTokeMintedInfo[0]).to.equal(nftSerial);

    const nonFungibleTokenInfoTx =
      await safeViewOperationsContract.safeGetNonFungibleTokenInfoPublic(
        nonFungibleTokenAddress,
        nftSerial
      );
    const nonFungibleTokenInfoReceipt = await nonFungibleTokenInfoTx.wait();
    const nonFungibleTokenInfo = nonFungibleTokenInfoReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.GetNonFungibleTokenInfo
    )[0].args;

    expect(nonFungibleTokenInfo[0][1]).to.equal(nftSerial);

    expect(nonFungibleTokenInfo[0][2]).to.equal(signers[0].address);
  });

  it('should be able to transfer tokens and hbars atomically', async function () {
    const signer0AccountID = signers[0].address;
    const signer1AccountID = signers[1].address;

    const amount = 0;
    const signer1initialAmount = 100;
    const transferredAmount = 10n;
    const mintedTokenInfo = await safeOperationsContract.safeMintTokenPublic(
      nonFungibleTokenAddress,
      amount,
      [nftSerial],
      Constants.GAS_LIMIT_1_000_000
    );

    const nonFungibleTokenMintedReceipt = await mintedTokenInfo.wait();

    const nonFungibleTokeMintedSerialNumbers =
      nonFungibleTokenMintedReceipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.MintedNft
      )[0].args[0];

    let signer0PrivateKey =
      config.networks[utils.getCurrentNetwork()].accounts[0];
    await utils.associateWithSigner(signer0PrivateKey, fungibleTokenAddress);
    let signer1PrivateKey =
      config.networks[utils.getCurrentNetwork()].accounts[1];
    await utils.associateWithSigner(signer1PrivateKey, fungibleTokenAddress);
    await utils.associateWithSigner(signer1PrivateKey, nonFungibleTokenAddress);

    await safeOperationsContract.safeGrantTokenKycPublic(
      nonFungibleTokenAddress,
      signer0AccountID
    );

    await safeOperationsContract.safeGrantTokenKycPublic(
      nonFungibleTokenAddress,
      signer1AccountID
    );

    await safeOperationsContract.safeTransferTokenPublic(
      fungibleTokenAddress,
      await safeOperationsContract.getAddress(),
      signer0AccountID,
      signer1initialAmount,
      Constants.GAS_LIMIT_1_000_000
    );

    const signers0BeforeHbarBalance =
      await signers[0].provider.getBalance(signer0AccountID);
    const signers1BeforeHbarBalance =
      await signers[0].provider.getBalance(signer1AccountID);

    const erc20Mock = await ethers.getContractAt(
      Constants.Contract.OZERC20Mock,
      fungibleTokenAddress
    );
    const signers0BeforeTokenBalance =
      await erc20Mock.balanceOf(signer0AccountID);
    const signers1BeforeTokenBalance =
      await erc20Mock.balanceOf(signer1AccountID);
    const erc721Mock = await ethers.getContractAt(
      Constants.Contract.OZERC721Mock,
      nonFungibleTokenAddress
    );
    const nftOwnerBefore = await erc721Mock.ownerOf(
      parseInt(nonFungibleTokeMintedSerialNumbers)
    );

    const transferList = {
      transfers: [
        {
          accountID: signer0AccountID, //sender
          amount: -10_000,
          isApproval: false,
        },
        {
          accountID: signer1AccountID, //receiver
          amount: 10_000,
          isApproval: false,
        },
      ],
    };

    //nft and token transfer
    const tokenTransferList = [
      {
        token: nonFungibleTokenAddress,
        transfers: [],
        nftTransfers: [
          {
            senderAccountID: signer0AccountID, //sender
            receiverAccountID: signer1AccountID, //receiver
            serialNumber: nonFungibleTokeMintedSerialNumbers[0],
            isApproval: false,
          },
        ],
      },
      {
        token: fungibleTokenAddress,
        transfers: [
          {
            accountID: signer1AccountID, //receiver
            amount: transferredAmount,
            isApproval: false,
          },
          {
            accountID: signer0AccountID, //sender
            amount: -transferredAmount,
            isApproval: false,
          },
        ],
        nftTransfers: [],
      },
    ];

    const cryptoTransferTx =
      await safeOperationsContract.safeCryptoTransferPublic(
        transferList,
        tokenTransferList,
        Constants.GAS_LIMIT_1_000_000
      );

    const cryptoTransferReceipt = await cryptoTransferTx.wait();

    expect(
      cryptoTransferReceipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args[0]
    ).to.equal(22);

    const signers0AfterHbarBalance = await pollForNewHBarBalance(
      signers[0].provider,
      signers0BeforeHbarBalance,
      signer0AccountID
    );
    const signers1AfterHbarBalance =
      await signers[0].provider.getBalance(signer1AccountID);

    const signers0AfterTokenBalance = await pollForNewBalance(
      erc20Mock,
      signer0AccountID,
      signers0BeforeTokenBalance
    );

    const signers1AfterTokenBalance = await pollForNewBalance(
      erc20Mock,
      signer1AccountID,
      signers1BeforeTokenBalance
    );

    const hbarTransferableAmount = BigInt(10_000 * 10_000_000_000);
    expect(signers0AfterHbarBalance).to.be.lessThan(
      signers0BeforeHbarBalance - hbarTransferableAmount
    );
    expect(signers1AfterHbarBalance).to.equal(
      signers1BeforeHbarBalance + hbarTransferableAmount
    );

    const nftOwnerAfter = await erc721Mock.ownerOf(
      parseInt(nonFungibleTokeMintedSerialNumbers)
    );
    expect(nftOwnerBefore).not.to.equal(nftOwnerAfter);

    expect(signers0AfterTokenBalance).to.equal(
      signers0BeforeTokenBalance - transferredAmount
    );

    expect(signers1AfterTokenBalance).to.equal(
      signers1BeforeTokenBalance + transferredAmount
    );
  });
});
// Filename: test/shanghai-opcodes/ShanghaiOpcodes.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../constants');

describe('ShanghaiOpcodes tests', function () {
  let signers;
  let shanghaiContract;

  before(async function () {
    signers = await ethers.getSigners();

    const factory = await ethers.getContractFactory(
      Constants.Contract.ShanghaiOpcodes
    );
    shanghaiContract = await factory.deploy();
  });

  it('should be able to execute opShl()', async function () {
    const res = await shanghaiContract.opShl(2, 10);
    // shift left
    expect(res).to.equal(0x28);
  });

  it('should be able to execute opShr()', async function () {
    const res = await shanghaiContract.opShr(2, 500);
    // shift right
    expect(res).to.equal(0x7d);
  });

  it('should be able to execute opSar()', async function () {
    const res = await shanghaiContract.opSar(2, 10);
    // shift arithmetic right
    expect(res).to.equal(0x2);
  });

  it('should be able to execute opExtCodeHash()', async function () {
    const res = await shanghaiContract.opExtCodeHash(
      await shanghaiContract.getAddress()
    );

    // code hash
    const prefix = res.toString().slice(0, 2);
    expect(prefix).to.equal('0x');

    const hash = res.toString().slice(2);
    expect(hash.length).to.equal(64);

    expect(res).not.to.equal(ethers.ZeroHash);
  });

  it('should be able to execute opPush0()', async function () {
    const res = await shanghaiContract.opPush0();
    // push0
    expect(res).to.equal(0x5f);
  });
});
// Filename: test/solidity/account/nonExisting.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv1 Solidity Account Non Existing Test Suite', function () {
  let contract, randomAddress, hasError, fakeContract, contractDup, factory, wallet, provider;
  const NO_IMPLEMENTED_ERROR = 'NotImplementedError';
  const ADDR_DOES_NOT_EXIST = 'nonExtAddr is not defined';

  before(async function () {
    const signers = await ethers.getSigners();
    wallet = signers[0];
    randomAddress = ethers.Wallet.createRandom().address;
    factory = await ethers.getContractFactory(Constants.Contract.NonExisting);
    const factoryDup = await ethers.getContractFactory(
      Constants.Contract.NonExtDup
    );
    fakeContract = factory.attach(randomAddress);
    provider = ethers.getDefaultProvider();

    contractDup = await factoryDup.deploy();
    contract = await factory.deploy(await contractDup.getAddress());
  });

  beforeEach(function () {
    hasError = false;
  });

  it('should confirm `call` on a non existing account', async function () {
    // call to non existing account
    const MINIMAL_GAS_USED = 21432
    const initialBalance = await contract.balanceOf(wallet.address);
    const tx = await fakeContract.callOnNonExistingAccount(randomAddress, {gasLimit: 1000000});
    receipt = await tx.wait();
    const finalBalance = await contract.balanceOf(wallet.address);
    const diff = initialBalance - finalBalance;

    expect(diff > MINIMAL_GAS_USED).to.be.true;
    expect(receipt.status).to.equal(1);
  });

  it('should confirm `call` on a non existing account internal ', async function () {
      const tx = await contract.callOnNonExistingAccount(randomAddress);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
  });

  it('should confirm `delegatecall` on a non existing account', async function () {
    try {
      const tx = await fakeContract.delegatecallOnNonExistingAccount(
        randomAddress
      );
      await tx.wait();
    } catch (err) {
      hasError = true;
      expect(err.code).to.equal(Constants.CONTRACT_REVERT_EXECUTED_CODE);
    }
    expect(hasError).to.equal(true);
  });

  it('should confirm `delegatecall` on a non existing account internal', async function () {
      const tx = await contract.delegatecallOnNonExistingAccount(
        randomAddress
      );
      const rec = await tx.wait();
      expect(rec.status).to.equal(1);
  });

  it('should confirm `staticcall` on a non existing account', async function () {
    try {
      const tx = await fakeContract.staticcallOnNonExistingAccount(
        randomAddress
      );
      await tx.wait();
    } catch (err) {
      hasError = true;
      expect(err.value).to.equal('0x');
    }
    expect(hasError).to.equal(true);
  });

  it('should confirm `staticcall` on a non existing account internal', async function () {
      const tx = await contract.staticcallOnNonExistingAccount(randomAddress);
      expect(tx).to.equal(true);
  });

  it('should confirm creation of a contract on non Existing addr', async function () {
    try {
      contract = await factory.deploy('randomAddress');
    } catch (err) {
      hasError = true;
      expect(err.name).to.equal(NO_IMPLEMENTED_ERROR);
    }
    expect(hasError).to.equal(true);
  });

  it("should confirm function call balance on an address that doesn't exist. ", async function () {
    try {
      await contract.balanceNoneExistingAddr(nonExtAddr);
    } catch (err) {
      hasError = true;
      expect(err.message).to.equal(ADDR_DOES_NOT_EXIST);
    }
    expect(hasError).to.equal(true);
  });
});
// Filename: test/solidity/address/AssemblyAddress.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv1 AssemblyAddress Tests', () => {
  let assemblyAddressContract, expectedContractBytecode;

  before(async () => {
    const assemblyAddressContractFactory = await ethers.getContractFactory(
      Constants.Contract.AssemblyAddress
    );

    assemblyAddressContract = await assemblyAddressContractFactory.deploy();
    expectedContractBytecode = await ethers.provider.getCode(
      await assemblyAddressContract.getAddress()
    );
  });

  it("Should get contract's code size at contract address", async () => {
    const contractCodeSize = await assemblyAddressContract.codesizeat(
      await assemblyAddressContract.getAddress()
    );

    // @notice Remove the '0x' prefix from the expected contract bytecode, then calculate the length in bytes
    // @notice Since each hexadeimal character represents 4 bits, and each byte is represented by 2 hexadecimal characters.
    //         Therefore, the length of bytecode in bytes is half of the length of the bytecode in hexadecimal characters.
    const expectedContractCodeSize =
      expectedContractBytecode.replace('0x', '').length / 2;

    expect(contractCodeSize).to.eq(expectedContractCodeSize);
  });

  it("Should get contract's code hash at contract address", async () => {
    const contractCodeHash = await assemblyAddressContract.codehashat(
      await assemblyAddressContract.getAddress()
    );

    const expectedContractCodeHash = ethers.keccak256(expectedContractBytecode);

    expect(contractCodeHash).to.eq(expectedContractCodeHash);
  });

  it("Should get contract's code at contract address", async () => {
    const contractCode = await assemblyAddressContract.codecopyat(
      await assemblyAddressContract.getAddress()
    );

    expect(contractCode).to.eq(expectedContractBytecode);
  });
});
// Filename: test/solidity/address/address.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const Utils = require('../../system-contracts/hedera-token-service/utils');

const TOP_UP_AMOUNT = ethers.parseEther('1.0');
const TRANSFER_AMOUNT = 1;

describe('@solidityequiv1 Solidity Address Test Suite', function () {
  let signers, contract, wallet, walletAddr, recipientContract, recipientAddr;

  const tinybarToWeibar = (amount) =>
    BigInt(amount) * BigInt(Utils.tinybarToWeibarCoef);
  const weibarTotinybar = (amount) =>
    BigInt(amount) / BigInt(Utils.tinybarToWeibarCoef);

  before(async function () {
    signers = await ethers.getSigners();
    wallet = signers[0];
    walletAddr = await wallet.getAddress();

    //deploy test contract
    const factory = await ethers.getContractFactory(
      Constants.Contract.AddressContract
    );
    contract = await factory.deploy();

    //deploy test contract
    const calledFactory = await ethers.getContractFactory(
      Constants.Contract.Recipient
    );
    recipientContract = await calledFactory.deploy();
    recipientAddr = recipientContract.getAddress();

    //top up the test contract with some funds
    let tx = {
      to: await contract.getAddress(),
      value: TOP_UP_AMOUNT,
    };
    const topUpRes = await wallet.sendTransaction(tx);
    topUpRes.wait();
  });

  it('should verify solidity functionality: <address>.balance', async function () {
    const balance = await ethers.provider.getBalance(wallet.address);
    const res = await contract.getAddressBalance(walletAddr);
    expect(tinybarToWeibar(res)).to.equal(balance);
    expect(tinybarToWeibar(res) > 0).to.be.true;
  });

  it('should verify solidity functionality: <address>.code', async function () {
    const walletAddrCodeRes = await contract.getAddressCode(walletAddr);
    const contractAddrCodeRes = await contract.getAddressCode(
      contract.getAddress()
    );

    expect(walletAddrCodeRes).to.exist;
    expect(walletAddrCodeRes).to.equal('0x');
    expect(contractAddrCodeRes).to.exist;
    expect(contractAddrCodeRes).to.not.equal('0x');
    expect(contractAddrCodeRes.length > 2).to.be.true;
  });

  it('should verify solidity functionality: <address>.codehash', async function () {
    const walletAddrCodeRes = await contract.getAddressCode(walletAddr);
    const contractAddrCodeRes = await contract.getAddressCode(
      contract.getAddress()
    );
    const hashedWalletCode = ethers.keccak256(walletAddrCodeRes);
    const hashedContractCode = ethers.keccak256(contractAddrCodeRes);
    const walletAddrResHash = await contract.getAddressCodeHash(walletAddr);
    const contractAddrResHash = await contract.getAddressCodeHash(
      contract.getAddress()
    );

    expect(hashedWalletCode).to.equal(walletAddrResHash);
    expect(hashedContractCode).to.equal(contractAddrResHash);
  });

  it('should verify solidity functionality: <address payable>.transfer', async function () {
    const recipientBalanceInitial =
      await ethers.provider.getBalance(recipientAddr);

    const tx = await contract.transferTo(recipientAddr, TRANSFER_AMOUNT);
    await tx.wait();

    const recipientBalanceFinal =
      await ethers.provider.getBalance(recipientAddr);
    const diff = recipientBalanceFinal - recipientBalanceInitial;

    expect(weibarTotinybar(diff)).to.equal(TRANSFER_AMOUNT);
    expect(recipientBalanceInitial < recipientBalanceFinal).to.be.true;
  });

  it('should verify solidity functionality: <address payable>.transfer (FAIL, should revert if the payment fails)', async function () {
    try {
      await contract.transferTo(recipientAddr, Number.MAX_SAFE_INTEGER);
      throw new Error();
    } catch (error) {
      expect(error).to.exist;
      expect(error.message.includes('execution reverted')).to.be.true;
    }
  });

  it('should verify calling a NON existing address', async function () {
    const tx = await contract.callNonExistingAddress(recipientAddr);
    const rec = await tx.wait();
    const resArgs = rec.logs[0].args;

    expect(resArgs[0]).to.equal(true);
    expect(resArgs[1]).to.equal('0x');
  });

  it('should verify solidity functionality: <address payable>.send', async function () {
    const recipientBalanceInitial =
      await ethers.provider.getBalance(recipientAddr);

    const tx = await contract.sendTo(recipientAddr, TRANSFER_AMOUNT);
    await tx.wait();

    const recipientBalanceFinal =
      await ethers.provider.getBalance(recipientAddr);
    const diff = recipientBalanceFinal - recipientBalanceInitial;

    expect(weibarTotinybar(diff)).to.equal(TRANSFER_AMOUNT);
    expect(recipientBalanceInitial < recipientBalanceFinal).to.be.true;
  });

  it('should verify solidity functionality: <address payable>.send (FAIL, returnes false if the payment fails)', async function () {
    const trx = await contract.sendTo(recipientAddr, Number.MAX_SAFE_INTEGER);
    const rec = await trx.wait();
    const result = rec.logs[0].data;

    const abi = ethers.AbiCoder.defaultAbiCoder();
    const res = abi.decode(['bool'], result);

    expect(res[0]).to.be.false;
  });

  it('should verify solidity functionality: <address>.call', async function () {
    const recipientBalanceInitial =
      await ethers.provider.getBalance(recipientAddr);

    const tx = await contract.callAddr(recipientAddr, TRANSFER_AMOUNT);
    await tx.wait();

    const recipientBalanceFinal =
      await ethers.provider.getBalance(recipientAddr);
    const diff = recipientBalanceFinal - recipientBalanceInitial;

    expect(weibarTotinybar(diff)).to.equal(TRANSFER_AMOUNT);
    expect(recipientBalanceInitial < recipientBalanceFinal).to.be.true;
  });

  it('should verify solidity functionality: <address>.call (FAIL, returnes false if the payment fails)', async function () {
    const tx = await contract.callAddr(recipientAddr, Number.MAX_SAFE_INTEGER);
    const rec = await tx.wait();
    const result = rec.logs[0].data;

    const abi = ethers.AbiCoder.defaultAbiCoder();
    const callSuccess = abi.decode(['bool'], result);

    expect(callSuccess[0]).to.be.false;
  });

  it('should verify solidity functionality: <address>.call -> with function signature', async function () {
    const resTx = await contract.callAddrWithSig(
      recipientAddr,
      TRANSFER_AMOUNT,
      'getMessageValue()'
    );
    const receipt = await resTx.wait();
    const data = receipt.logs[0].data;
    const value = BigInt(data);

    expect(value).to.equal(TRANSFER_AMOUNT);
  });

  it('should verify solidity functionality: <address>.delegatecall', async function () {
    const MESSAGE_FROM_ADDRESS = 'Hello World from AddressContract!';
    const resTx = await contract.delegate(recipientAddr, 'helloWorldMessage()');
    const receipt = await resTx.wait();
    const message = receipt.logs[0].args[0];

    expect(message).to.equal(MESSAGE_FROM_ADDRESS);
  });

  it('should verify solidity functionality: <address>.staticcall', async function () {
    const MY_NUMBER = 5;
    const resTx = await contract.staticCall(recipientAddr, 'getNumber()');
    const receipt = await resTx.wait();
    const result = receipt.logs[0].args[1];
    const myNumber = BigInt(result);

    expect(myNumber).to.equal(MY_NUMBER);
  });

  it('should verify solidity functionality: <address>.staticcall -> Try to set state', async function () {
    try {
      const resTx = await contract.staticCallSet(
        recipientAddr,
        'setNumber(uint number)',
        10
      );
      await resTx.wait();
    } catch (error) {
      expect(error.code).to.equal('CALL_EXCEPTION');
    }
  });
});
// Filename: test/solidity/assignments/assignments.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv1 Assignments Test Suite', function () {
  before(async function () {
    const factoryDestructuring = await ethers.getContractFactory(
      Constants.Contract.DestructuringReturns
    );
    contractDesctructuring = await factoryDestructuring.deploy();

    const factoryReferenceTypes = await ethers.getContractFactory(
      Constants.Contract.AssignmentReferenceTypes
    );
    contractReferenceTypes = await factoryReferenceTypes.deploy();
  });

  it('should verify destructuring works', async function () {
    const result = await contractDesctructuring.testDestructuredReturnParams();
    expect(result).to.deep.equal([BigInt(7), true, BigInt(2)]);
  });

  it('should verify assignment of reference types', async function () {
    // here we are testing that if a parameter is assigned to memory a copy will be created
    // and the original object wont be changed
    // while if it is in storage and only referenced we expect it to change
    await (await contractReferenceTypes.testAssignmentOfReferenceTypes()).wait();
    const result = await contractReferenceTypes.getSomeArray();
    expect(result).to.deep.equal([
      BigInt(1),
      BigInt(2),
      BigInt(3),
      BigInt(10),
      BigInt(5),
    ]);
  });
});
// Filename: test/solidity/blind-auction/blindAuction.js
// SPDX-License-Identifier: Apache-2.0

const chai = require('chai');
const { expect } = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const {
  tinybarToHbarCoef,
  tinybarToWeibarCoef,
} = require('../../system-contracts/hedera-token-service/utils');
chai.use(chaiAsPromised);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sleepUntilTimestamp = async (timestamp) => {
  const remainingMs = timestamp - Date.now();
  if (remainingMs > 0) {
    await sleep(remainingMs);
  }
};

const deployBlindAuctionContract = async (
  biddingTime,
  revealTime,
  beneficiaryAddress
) => {
  const factory = await ethers.getContractFactory(
    Constants.Contract.BlindAuction
  );
  const contract = await factory.deploy(
    biddingTime,
    revealTime,
    beneficiaryAddress
  );
  const biddingEndMs = Date.now() + biddingTime * 1000 + 250;
  const revealEndMs = biddingEndMs + revealTime * 1000 + 250;

  return { contract, biddingEndMs, revealEndMs };
};

describe('@solidityequiv1 Solidity Blind Auction Test Suite', function () {
  let beneficiary, wallet1;

  const biddingTimeSeconds = 6;
  const revealTimeSeconds = 3;

  const fiveHbars = 5 * tinybarToHbarCoef;
  const hundredHbars = 100 * tinybarToHbarCoef;
  const twoHundredHbars = 200 * tinybarToHbarCoef;
  const hundredHbarsToWeibar = BigInt(
    String(hundredHbars * tinybarToWeibarCoef)
  );
  const twohundredHbarsToWeibar = BigInt(
    String(twoHundredHbars * tinybarToWeibarCoef)
  );
  const fiveHbarsToWeibar = BigInt(String(fiveHbars * tinybarToWeibarCoef));

  before(async function () {
    [beneficiary, wallet1] = await ethers.getSigners();
  });

  it('should confirm beneficiary is set correctly', async function () {
    const { contract } = await deployBlindAuctionContract(
      biddingTimeSeconds,
      revealTimeSeconds,
      beneficiary.address
    );
    const beneficiaryAddress = await contract.beneficiary();

    expect(beneficiaryAddress).to.eq(beneficiary.address);
  });

  it('should confirm a user can bid', async function () {
    const { contract } = await deployBlindAuctionContract(
      biddingTimeSeconds,
      revealTimeSeconds,
      beneficiary.address
    );

    const bidData = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [hundredHbars, false, 2]
    );

    const result = await contract
      .connect(wallet1)
      .bid(bidData, { value: hundredHbarsToWeibar });
    await result.wait();
    const firstBidder = await contract.getBids(wallet1.address);

    expect(firstBidder.length).to.eq(1);
    expect(firstBidder[0].blindedBid).to.eq(bidData);
  });

  it('should confirm a user can reveal their bids', async function () {
    const { contract, biddingEndMs } = await deployBlindAuctionContract(
      biddingTimeSeconds,
      revealTimeSeconds,
      beneficiary.address
    );

    const firstBid = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [hundredHbars, false, ethers.encodeBytes32String('2')]
    );
    const secondBid = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [hundredHbars, true, ethers.encodeBytes32String('23')]
    );

    const bid = await contract
      .connect(wallet1)
      .bid(firstBid, { value: hundredHbarsToWeibar });
    await bid.wait();

    const bid2 = await contract
      .connect(wallet1)
      .bid(secondBid, { value: fiveHbarsToWeibar });
    await bid2.wait();

    await sleepUntilTimestamp(biddingEndMs);

    const result = await contract
      .connect(wallet1)
      .reveal(
        [hundredHbars, hundredHbars],
        [false, true],
        [ethers.encodeBytes32String('2'), ethers.encodeBytes32String('23')],
        { gasLimit: 5000000 }
      );
    await result.wait();

    const highestBidder = await contract.highestBidder();
    const highestBid = await contract.highestBid();

    expect(highestBid).to.equal(BigInt(hundredHbars));
    expect(highestBidder).to.equal(wallet1.address);
  });

  it('should confirm a user can withdraw', async function () {
    const { contract, biddingEndMs } = await deployBlindAuctionContract(
      biddingTimeSeconds,
      revealTimeSeconds,
      beneficiary.address
    );

    const firstBid = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [hundredHbars, false, ethers.encodeBytes32String('2')]
    );
    const secondBid = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [twoHundredHbars, true, ethers.encodeBytes32String('23')]
    );
    const thirdBid = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [twoHundredHbars, false, ethers.encodeBytes32String('5')]
    );

    const bid = await contract
      .connect(wallet1)
      .bid(firstBid, { value: hundredHbarsToWeibar });
    await bid.wait();

    const bid2 = await contract
      .connect(wallet1)
      .bid(secondBid, { value: fiveHbarsToWeibar });
    await bid2.wait();

    const bid3 = await contract
      .connect(wallet1)
      .bid(thirdBid, { value: twohundredHbarsToWeibar });
    await bid3.wait();

    //this sleep is needed as part of the contract business logic
    //to ensure time has passed and we can reveal the blind bid
    await sleepUntilTimestamp(biddingEndMs);

    const result = await contract
      .connect(wallet1)
      .reveal(
        [hundredHbars, twoHundredHbars, twoHundredHbars],
        [false, true, false],
        [
          ethers.encodeBytes32String('2'),
          ethers.encodeBytes32String('23'),
          ethers.encodeBytes32String('5'),
        ],
        { gasLimit: 5000000 }
      );
    await result.wait();

    const highestBidder = await contract.highestBidder();
    const highestBid = await contract.highestBid();

    const balanceBeforeWithdraw = await contract.getBalance();

    const withdraw = await contract.connect(wallet1).withdraw();
    await withdraw.wait();

    const balanceAfterWithdraw = await contract.getBalance();

    expect(balanceBeforeWithdraw).to.be.greaterThan(balanceAfterWithdraw);
    expect(highestBid).to.equal(BigInt(twoHundredHbars));
    expect(highestBidder).to.equal(wallet1.address);
  });

  it('should confirm a user can end an auction', async function () {
    const { contract, biddingEndMs, revealEndMs } =
      await deployBlindAuctionContract(
        biddingTimeSeconds,
        revealTimeSeconds,
        beneficiary.address
      );

    const firstBid = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [hundredHbars, false, ethers.encodeBytes32String('2')]
    );
    const secondBid = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [hundredHbars, true, ethers.encodeBytes32String('23')]
    );

    const bid = await contract
      .connect(wallet1)
      .bid(firstBid, { value: hundredHbarsToWeibar });
    await bid.wait();

    const bid2 = await contract
      .connect(wallet1)
      .bid(secondBid, { value: hundredHbarsToWeibar });
    await bid2.wait();

    await sleepUntilTimestamp(biddingEndMs);

    const reveal = await contract
      .connect(wallet1)
      .reveal(
        [hundredHbars, hundredHbars],
        [false, true],
        [ethers.encodeBytes32String('2'), ethers.encodeBytes32String('23')],
        { gasLimit: 5000000 }
      );
    await reveal.wait();

    const balanceBeforeAuctionEnd = await ethers.provider.getBalance(
      beneficiary.address
    );

    // this sleep is needed as part of the contract business logic
    // to ensure time has passed, and we can end the auction
    await sleepUntilTimestamp(revealEndMs);

    const result = await contract
      .connect(wallet1)
      .auctionEnd(Constants.GAS_LIMIT_1_000_000);
    await result.wait();

    const balanceAfterAuctionEnd = await ethers.provider.getBalance(
      beneficiary.address
    );

    const highestBidder = await contract.highestBidder();
    const highestBid = await contract.highestBid();

    expect(highestBid).to.equal(BigInt(hundredHbars));
    expect(highestBidder).to.equal(wallet1.address);
    expect(balanceBeforeAuctionEnd).to.be.lessThan(balanceAfterAuctionEnd);
  });

  it('should confirm a user cannot bid after end', async function () {
    const { contract, biddingEndMs } = await deployBlindAuctionContract(
      1,
      1,
      beneficiary.address
    );
    const bidData = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [hundredHbars, false, 2]
    );

    await sleepUntilTimestamp(biddingEndMs);

    await expect(
      contract.connect(wallet1).bid(bidData, { value: hundredHbarsToWeibar })
    ).to.eventually.be.rejected.and.have.property('code', -32008);
  });

  it('should confirm a user cannot reveal after reveal end', async function () {
    const { contract, revealEndMs } = await deployBlindAuctionContract(
      biddingTimeSeconds,
      revealTimeSeconds,
      beneficiary.address
    );

    const bidData = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [hundredHbars, false, 2]
    );
    const anotherBidData = ethers.solidityPackedKeccak256(
      ['uint256', 'bool', 'uint256'],
      [hundredHbars, true, 23]
    );

    const bid = await contract
      .connect(wallet1)
      .bid(bidData, { value: hundredHbarsToWeibar });
    await bid.wait();

    const bidAgain = await contract
      .connect(wallet1)
      .bid(anotherBidData, { value: fiveHbarsToWeibar });
    await bidAgain.wait();

    await sleepUntilTimestamp(revealEndMs);

    const result = await contract
      .connect(wallet1)
      .reveal(
        [hundredHbars, twoHundredHbars],
        [false, true],
        [ethers.encodeBytes32String('2'), ethers.encodeBytes32String('23')],
        Constants.GAS_LIMIT_1_000_000
      );
    await expect(result.wait()).to.eventually.be.rejected.and.have.property(
      'code',
      'CALL_EXCEPTION'
    );
  });
});
// Filename: test/solidity/block/BlockInfo.js
// SPDX-License-Identifier: Apache-2.0
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv1 BlockInfo Test Suite', function () {
  let blockInfo, provider, signers;

  before(async function () {
    signers = await ethers.getSigners();
    provider = signers[0].provider;

    const factory = await ethers.getContractFactory(Constants.Path.BLOCK_INFO);
    blockInfo = await factory.deploy({ gasLimit: 15000000 });
  });

  // Base fees do not adjust per block.
  it('should be able to execute getBlockBaseFee()', async function () {
    const blockBaseFee = await blockInfo.getBlockBaseFee();
    expect(blockBaseFee).to.equal(0);
  });

  it('should be able to get the hash of a given block when the block number is one of the 256 most recent blocks', async function () {
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    const blockHash = await blockInfo.getBlockHash(blockNumber);
    expect(block.hash).to.equal(blockHash);
  });

  it('should get the current block coinbase which is the hedera network account', async function () {
    const coinbase = await blockInfo.getMinerAddress();
    // 0.0.98 is the Hedera network account.  Alias is 0x0000000000000000000000000000000000000062
    expect(coinbase).to.equal('0x0000000000000000000000000000000000000062');
  });

  it('should get the current block prevrandao using block.prevrandao', async function () {
    let prevrandao;
    try {
      prevrandao = await blockInfo.getBlockPrevrando();
    } catch (e) {
      expect(e.code).to.equal('CALL_EXCEPTION');
      expect(e.message).to.contain('missing revert data in call exception');
      expect(e.reason).to.contain(
        'missing revert data in call exception; Transaction reverted without a reason string'
      );
    }
    expect(typeof prevrandao).to.equal('bigint');
  });

  // Turn off until mirror node issue is resolved: https://github.com/hashgraph/hedera-mirror-node/issues/7036
  it('should get the current block difficulty using block.difficulty (replaced by prevrandao)', async function () {
    let difficulty;
    try {
      difficulty = await blockInfo.getBlockDifficulty();
    } catch (e) {
      expect(e.code).to.equal('CALL_EXCEPTION');
      expect(e.message).to.contain('missing revert data in call exception');
      expect(e.reason).to.contain(
        'missing revert data in call exception; Transaction reverted without a reason string'
      );
    }
    expect(typeof difficulty).to.equal('bigint');
  });

  it('should get the block gas limit', async function () {
    const gasLimit = await blockInfo.getBlockGasLimit();
    expect(gasLimit).to.equal(15000000);
  });

  it('should get the block number', async function () {
    const blockNumber = await blockInfo.getBlockNumber();
    expect(blockNumber).to.exist;
  });

  it('should get the block timestamp', async function () {
    const timeStamp = await blockInfo.getBlockTimestamp();
    expect(isTimestamp(timeStamp)).to.equal(true);
  });
});

function isTimestamp(value) {
  // Ensure the value is a BigNumber
  if (!value) {
    return false;
  }

  const date = new Date(parseInt(value * 1000n));
  if (isNaN(date)) {
    return false;
  }

  const year = date.getUTCFullYear();
  return year >= 1970;
}
// Filename: test/solidity/concatenation/concatenation.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv1 Concatenation Test Suite', function () {
  let contract;
  const first = 'first';
  const second = 'second';
  const third = 'third';

  before(async function () {
    signers = await ethers.getSigners();

    const factory = await ethers.getContractFactory(
      Constants.Contract.Concatenation
    );
    contract = await factory.deploy();
  });

  it('byte concatenation', async function () {
    let utf8Encode = new TextEncoder();
    const bytesFirst = utf8Encode.encode(first);
    const bytesSecond = utf8Encode.encode(second);
    const bytesThird = utf8Encode.encode(third);
    const res = await contract.byteConcatenation(
      bytesFirst,
      bytesSecond,
      bytesThird
    );

    expect(
      bytesFirst.byteLength + bytesSecond.byteLength + bytesThird.byteLength
    ).to.equal(res);
  });

  it('string concatenation', async function () {
    const res = await contract.stringConcatenation(first, second, third);

    expect(first.length + second.length + third.length).to.equal(res.length);
    expect(first.concat(second, third)).to.equal(res);
  });

  it('string concatenation Empty', async function () {
    const res = await contract.stringConcatenationEmpty();

    expect(res.length).to.equal(0);
  });

  it('string concatenation Empty', async function () {
    const res = await contract.stringConcatenationEmpty();

    expect(res.length).to.equal(0);
  });
});
// Filename: test/solidity/control/control.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv1 Control Structures Test Suite', function () {
  let contract;

  before(async function () {
    const factory = await ethers.getContractFactory(
      Constants.Contract.ControlStructures
    );
    contract = await factory.deploy();
  });

  it('should verify is is working correctly', async function () {
    const res = await contract.evaluateIfElse(false);
    expect(res).to.equal(false);
  });

  it('should verify else is working correctly', async function () {
    const res = await contract.evaluateIfElse(true);
    expect(res).to.equal(true);
  });

  it('should verify while is working correctly', async function () {
    const res = await contract.evaluateWhile(5);
    expect(res).to.equal(5);
  });

  it('should verify do is working correctly', async function () {
    const res = await contract.evaluateDoWhile(5);
    expect(res).to.equal(5);
  });

  it('should verify break is working correctly', async function () {
    const res = await contract.evaluateBreak(5, 3);
    expect(res).to.equal(3);
  });

  it('should verify continue is working correctly', async function () {
    const res = await contract.evaluateContinue(5, 3);
    expect(res).to.equal(4);
  });

  it('should verify for is working correctly', async function () {
    const res = await contract.evaluateFor(5);
    expect(res).to.equal(4);
  });

  it('should verify catch is working correctly', async function () {
    const res = await contract.evaluateTryCatch(0);
    expect(res).to.equal(false);
  });

  it('should verify try is working correctly', async function () {
    const res = await contract.evaluateTryCatch(1);
    expect(res).to.equal(true);
  });
});
// Filename: test/solidity/cryptomath/CryptoMath.js
// SPDX-License-Identifier: Apache-2.0
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv1 CryptoMath Test Suite', function () {
  let cryptoMathContract, provider, signers;

  before(async function () {
    signers = await ethers.getSigners();
    provider = ethers.getDefaultProvider();
    const factory = await ethers.getContractFactory(Constants.Path.CRYPTO_MATH);
    cryptoMathContract = await factory.deploy({ gasLimit: 15000000 });
  });

  // callAddMod computes (x + y) % k where x, y, and k are uint
  it('callAddMod', async function () {
    const x = 5;
    const y = 6;
    const k = 7;
    const res = await cryptoMathContract.callAddMod(x, y, k);
    const expectedRes = (x + y) % k;
    expect(res).to.equal(expectedRes);
  });

  // callMulMod computes (x * y) % k where x, y, and k are uint
  it('callMulMod', async function () {
    const x = 5;
    const y = 6;
    const k = 7;
    const res = await cryptoMathContract.callMulMod(x, y, k);
    const expectedRes = (x * y) % k;
    expect(res).to.equal(expectedRes);
  });

  // callKeccak256 computes the Keccak256 hash of the input
  it('callKeccak256', async function () {
    const input = ethers.toUtf8Bytes('hello world');
    const res = await cryptoMathContract.callKeccak256(input);
    const expectedRes = ethers.keccak256(input);
    expect(res).to.equal(expectedRes);
  });

  // callSha256 computes the SHA256 hash of the input
  it('callSha256', async function () {
    const input = ethers.toUtf8Bytes('hello world');
    const res = await cryptoMathContract.callSha256(input);
    const expectedRes = ethers.sha256(input);
    expect(res).to.equal(expectedRes);
  });

  // callRipemd160 computes the RIPEMD-160 hash of the input
  it('callRipemd160', async function () {
    const input = ethers.toUtf8Bytes('hello world');
    const res = await cryptoMathContract.callRipemd160(input);
    const expectedRes = ethers.ripemd160(input);
    expect(res).to.equal(expectedRes);
  });

  // callEcrecover recovers the address associated with the public key from the signature
  it('callEcrecover and verify that returns the correct address of the signer', async function () {
    const messageToSign = 'Hello Future';
    const hashOfMessage = ethers.hashMessage(messageToSign);
    const walletSigner = ethers.Wallet.createRandom();
    const signedMessage = await walletSigner.signMessage(messageToSign);

    const splitSignature = ethers.Signature.from(signedMessage);

    // extract the v, r, s values from the splitSignature
    const v = splitSignature.v;
    const r = splitSignature.r;
    const s = splitSignature.s;

    const res = await cryptoMathContract.callEcrecover(hashOfMessage, v, r, s);
    const signerAddress = walletSigner.address;
    expect(res).to.equal(signerAddress);
  });
});
// Filename: test/solidity/cryptomath/arithmetic.js
// SPDX-License-Identifier: Apache-2.0
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv1 Arithmetic Test Suite', function () {
  let contract;

  before(async function () {
    const factory = await ethers.getContractFactory(
      Constants.Contract.Arithmetic
    );
    contract = await factory.deploy();
  });

  it('it should confirm solidity functionality: Arithmetic, checked overflow - confirm revert add', async function () {
    let hasError = false;
    try {
      const res = await contract.add();
      await res.wait();
    } catch (error) {
      hasError = true;
      expect(error).to.exist;
      const name = await contract.checkName();
      expect(name).to.equal('Arithmetic');
    }
    expect(hasError).to.be.true;
  });

  it('it should confirm solidity functionality: Arithmetic, checked overflow - confirm revert add2', async function () {
    let hasError = false;
    try {
      const res = await contract.add2();
      await res.wait();
    } catch (error) {
      hasError = true;
      expect(error).to.exist;
      const name = await contract.checkName();
      expect(name).to.equal('Arithmetic');
    }
    expect(hasError).to.be.true;
  });

  it('it should confirm solidity functionality: Arithmetic, checked overflow - confirm revert mul', async function () {
    let hasError = false;
    try {
      const res = await contract.mul();
      await res.wait();
    } catch (error) {
      hasError = true;
      expect(error).to.exist;
      const name = await contract.checkName();
      expect(name).to.equal('Arithmetic');
    }
    expect(hasError).to.be.true;
  });

  it('it should confirm solidity functionality: Arithmetic, checked underflow - confirm revert sub', async function () {
    let hasError = false;
    try {
      const res = await contract.sub();
      await res.wait();
    } catch (error) {
      hasError = true;
      expect(error).to.exist;
      const name = await contract.checkName();
      expect(name).to.equal('Arithmetic');
    }
    expect(hasError).to.be.true;
  });

  it('it should confirm solidity functionality: Arithmetic, checked underflow - confirm revert dec', async function () {
    let hasError = false;
    try {
      const res = await contract.dec();
      await res.wait();
    } catch (error) {
      hasError = true;
      expect(error).to.exist;
      const name = await contract.checkName();
      expect(name).to.equal('Arithmetic');
    }
    expect(hasError).to.be.true;
  });

  it('it should confirm solidity functionality: Arithmetic, checked underflow - confirm revert negativeHasMoreValues', async function () {
    let hasError = false;
    try {
      const res = await contract.negativeHasMoreValues();
      await res.wait();
    } catch (error) {
      hasError = true;
      expect(error).to.exist;
      const name = await contract.checkName();
      expect(name).to.equal('Arithmetic');
    }
    expect(hasError).to.be.true;
  });

  it('it should confirm solidity functionality: Arithmetic, unchecked overflow - confirm wrap uncheckedAdd', async function () {
    const res = await contract.uncheckedAdd();
    expect(res).to.be.true;
  });

  it('it should confirm solidity functionality: Arithmetic, unchecked underflow - confirm wrap uncheckedSub', async function () {
    const res = await contract.uncheckedSub();
    expect(res).to.be.true;
  });
});
// Filename: test/solidity/defaults/defaults.js
// SPDX-License-Identifier: Apache-2.0
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv1 Solidity Defaults Test Suite', function () {
  let contract;

  before(async function () {
    signers = await ethers.getSigners();

    const factory = await ethers.getContractFactory(
      Constants.Contract.Defaults
    );
    contract = await factory.deploy();
  });

  it('confirm solidity functionality: uint defaults', async function () {
    const res = await contract.getUintDefaults();
    expect(res.uInt8).to.equal(0);
    expect(res.uInt16).to.equal(0);
    expect(res.uInt32).to.equal(0);
    expect(res.uInt64).to.equal(BigInt(0));
    expect(res.uInt128).to.equal(BigInt(0));
    expect(res.uInt256).to.equal(BigInt(0));
    expect(res.uInt).to.equal(BigInt(0));
  });

  it('confirm solidity functionality: int defaults', async function () {
    const res = await contract.getIntDefaults();
    expect(res.uInt8).to.equal(0);
    expect(res.uInt16).to.equal(0);
    expect(res.uInt32).to.equal(0);
    expect(res.uInt64).to.equal(BigInt(0));
    expect(res.uInt128).to.equal(BigInt(0));
    expect(res.uInt256).to.equal(BigInt(0));
    expect(res.uInt).to.equal(BigInt(0));
  });

  // Fixed point numbers are Not supported by Solidity yet
  // You can find the documentation: https://docs.soliditylang.org/en/latest/types.html#fixed-point-numbers
  xit('confirm solidity functionality: fixed defaults', async function () {
    const res = await contract.getFixedDefaults();
  });

  // Fixed point numbers are Not supported by Solidity yet
  // You can find the documentation: https://docs.soliditylang.org/en/latest/types.html#fixed-point-numbers
  xit('confirm solidity functionality: ufixed defaults', async function () {
    const res = await contract.getUFixedDefaults();
  });

  it('confirm solidity functionality: bytes defaults', async function () {
    const res = await contract.getBytesDefaults();
    expect(res.bytesDef3).to.equal(
      ethers.zeroPadValue(ethers.hexlify('0x'), 3)
    );
    expect(res.bytesDef10).to.equal(
      ethers.zeroPadValue(ethers.hexlify('0x'), 10)
    );
    expect(res.bytesDef15).to.equal(
      ethers.zeroPadValue(ethers.hexlify('0x'), 15)
    );
    expect(res.bytesDef20).to.equal(
      ethers.zeroPadValue(ethers.hexlify('0x'), 20)
    );
    expect(res.bytesDef25).to.equal(
      ethers.zeroPadValue(ethers.hexlify('0x'), 25)
    );
    expect(res.bytesDef30).to.equal(
      ethers.zeroPadValue(ethers.hexlify('0x'), 30)
    );
    expect(res.bytesDef32).to.equal(
      ethers.zeroPadValue(ethers.hexlify('0x'), 32)
    );
  });

  it('confirm solidity functionality: string defaults', async function () {
    const res = await contract.getStringDefaults();
    expect(res).to.equal('');
  });

  it('confirm solidity functionality: array defaults', async function () {
    const res = await contract.getArrayDefaults();
    expect(Array.isArray(res.strArr)).to.be.true;
    expect(Array.isArray(res.uintArr)).to.be.true;
    expect(Array.isArray(res.boolArr)).to.be.true;
    expect(Array.isArray(res.bytesArr)).to.be.true;
  });

  it('confirm solidity functionality: address defaults', async function () {
    const res = await contract.getAddressDefaults();
    expect(res).to.equal(ethers.zeroPadValue(ethers.hexlify('0x'), 20));
  });

  it('confirm solidity functionality: mapping', async function () {
    const res1 = await contract.strUintMap('');
    const res2 = await contract.addrBoolMap(await contract.getAddress());
    const res3 = await contract.bytesBytesMap(10);
    expect(res1).to.equal(BigInt(0));
    expect(res2).to.equal(false);
    expect(res3).to.equal('0x');
  });
});
// Filename: test/solidity/encoding/Encoding.js
// SPDX-License-Identifier: Apache-2.0
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv2 Encoding Test Suite', function () {
  let encodingContract, receiver, sender;

  const addressData = '0x1234567890123456789012345678901234567890';
  const uintData = 123456789;

  beforeEach(async function () {
    const Encoding = await ethers.getContractFactory(
      Constants.Contract.Encoding
    );
    encodingContract = await Encoding.deploy();

    const Receiver = await ethers.getContractFactory(Constants.Path.RECEIVER);
    receiver = await Receiver.deploy();

    const Sender = await ethers.getContractFactory(Constants.Contract.Sender);
    sender = await Sender.deploy(await receiver.getAddress());
  });

  it('Should decode data', async function () {
    const abi = ethers.AbiCoder.defaultAbiCoder();
    const encodedData = abi.encode(
      ['address', 'uint256'],
      [addressData, uintData]
    );

    const result = await encodingContract.decodeData(encodedData);

    expect(result[0]).to.equal(addressData);
    expect(result[1]).to.equal(uintData);
  });

  it('Should encode data', async function () {
    const result = await encodingContract.encodeData(addressData, uintData);

    const abi = ethers.AbiCoder.defaultAbiCoder();
    const decodedData = abi.decode(['address', 'uint256'], result);

    expect(decodedData[0]).to.equal(addressData);
    expect(decodedData[1]).to.equal(uintData);
  });

  it('Should encode pack data', async function () {
    const address = '0x1234567890123456789012345678901234567890';
    const amount = 100;
    const data = 'Hello, World!';

    const packedData = encodePacked(address, ethers.toBeHex(amount), data);
    const result = await encodingContract.getPackedData(address, amount, data);
    expect(result).to.equal(packedData);
  });

  it('Should execute the add function and return the correct result to illustrate abi.encodeWitSelector', async function () {
    const a = 5;
    const b = 7;

    // Verify that the add function returns the correct result
    const sum = await encodingContract.add(a, b);
    expect(sum).to.equal(a + b);

    // Call the encodeAddFunction
    const encodedData = await encodingContract.encodeAddFunction(a, b);

    // Extract the selector and encoded arguments
    const selector = encodedData.slice(0, 10);
    const encodedArgs = '0x' + encodedData.slice(10);

    // Verify the selector matches the add function's selector
    expect(selector).to.equal(
      encodingContract.interface.getFunction('add').selector
    );

    const abi = ethers.AbiCoder.defaultAbiCoder();

    const [decodedA, decodedB] = abi.decode(
      ['uint256', 'uint256'],
      encodedArgs
    );
    expect(decodedA).to.equal(a);
    expect(decodedB).to.equal(b);

    const tx = await encodingContract.executeAddFunction(a, b);
    const receipt = await tx.wait();

    expect(receipt.logs.length).to.equal(1);
    expect(receipt.logs[0].fragment.name).to.equal('Added');

    const eventResult = receipt.logs[0].args[0];
    expect(eventResult).to.equal(a + b);
  });

  it('Should call receiveData in Receiver contract via Sender using abi.encodeWithSignature', async function () {
    const dataToSend = 12345;

    await expect(sender.sendDataEncodeWithSignature(dataToSend))
      .to.emit(receiver, 'ReceivedData')
      .withArgs(dataToSend);
  });

  it('Should call receiveData in Receiver contract via Sender using abi.encodeCall', async function () {
    const dataToSend = 12345;

    await expect(sender.sendDataEncodeCall(dataToSend))
      .to.emit(receiver, 'ReceivedData')
      .withArgs(dataToSend);
  });
});

function encodePacked(address, amount, data) {
  const addressBytes = ethers.getBytes(address);
  const amountBytes = ethers.getBytes(
    ethers.zeroPadValue(ethers.toBeHex(100), 32)
  );
  const dataBytes = ethers.toUtf8Bytes(data);

  return ethers.concat([addressBytes, amountBytes, dataBytes]);
}
// Filename: test/solidity/errors/errors.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv2 Solidity Errors Test Suite', function () {
  let contract, hasError;

  before(async function () {
    const factoryErrorsExternal = await ethers.getContractFactory(
      Constants.Contract.ErrorsExternal
    );
    contractExternal = await factoryErrorsExternal.deploy();

    const factory = await ethers.getContractFactory(Constants.Contract.Errors);
    contract = await factory.deploy(await contractExternal.getAddress());
  });

  beforeEach(async function () {
    hasError = false;
  });

  it('should confirm assert works', async function () {
    try {
      const res = await contract.assertCheck(1 == 1);
      expect(res).to.equal(true);

      await contract.assertCheck(1 > 1);
    } catch (err) {
      hasError = true;
      expect(err).to.exist;
    }
    expect(hasError).to.equal(true);
  });

  it('should confirm require works', async function () {
    try {
      const resReverted = await contract.requireCheck(true);
      expect(resReverted).to.equal(true);

      await contract.requireCheck(false);
    } catch (err) {
      hasError = true;
      expect(err).to.exist;
    }
    expect(hasError).to.equal(true);
  });

  it('should confirm revert works', async function () {
    try {
      await contract.revertCheck();
    } catch (err) {
      hasError = true;
      expect(err).to.exist;
    }
    expect(hasError).to.equal(true);
  });

  it('should confirm revert with message works', async function () {
    const message = 'We unfortunalty need to revert this transaction';
    expect(contract.revertWithMessageCheck(message)).to.be.revertedWith(
      message
    );
  });

  it('should confirm revert with custom error works', async function () {
    try {
      await contract.revertWithCustomError();
    } catch (err) {
      hasError = true;
      expect(err.code).to.equal(-32008);

      const customError = contract.interface.parseError(err.data);
      expect(customError).to.not.equal(null);
      expect(customError.name).to.equal('InsufficientBalance');
      expect(customError.args.available).to.equal(BigInt(1));
      expect(customError.args.required).to.equal(BigInt(100));
    }
    expect(hasError).to.equal(true);
    await expect(
      contract.revertWithCustomError()
    ).to.eventually.be.rejectedWith('CONTRACT_REVERT_EXECUTED');
  });

  it('should confirm try/catch with simple revert', async function () {
    const tx = await contract.tryCatchWithSimpleRevert();
    const receipt = await tx.wait();
    expect(receipt).to.exist;
    expect(receipt.logs[0].args.code).to.equal(0);
    expect(receipt.logs[0].args.message).to.equal('revertSimple');
  });

  it('should confirm try/catch revert with error message', async function () {
    const message = 'We unfortunalty need to revert this transaction';
    const tx = await contract.tryCatchWithErrorMessageRevert(message);
    const receipt = await tx.wait();
    expect(receipt).to.exist;
    expect(receipt.logs[0].args.code).to.equal(0);
    expect(receipt.logs[0].args.message).to.equal(message);
  });

  it('should confirm try/catch revert with panic', async function () {
    const tx = await contract.tryCatchWithPanic();
    const receipt = await tx.wait();
    expect(receipt).to.exist;
    expect(receipt.logs[0].args.code).to.equal(18);
    expect(receipt.logs[0].args.message).to.equal('panic');
  });
});
// Filename: test/solidity/errors/panicErrors.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv2 Panic Errors Test Suite', function () {
  const DEFAULT_ABI_CODER = ethers.AbiCoder.defaultAbiCoder();
  const PANIC_SELECTOR = ethers
    .keccak256(ethers.toUtf8Bytes('Panic(uint256)'))
    .substring(2, 10);

  let contract;

  before(async function () {
    const factory = await ethers.getContractFactory(Constants.Contract.Panic);
    contract = await factory.deploy();
  });

  const assertPanicError = (error, expectedCode) => {
    const selector = error.substring(2, 10);
    expect(selector).to.equal(PANIC_SELECTOR);

    const [code] = DEFAULT_ABI_CODER.decode(
      ['uint256'],
      error.replace(PANIC_SELECTOR, '')
    );
    expect(code).to.equal(BigInt(expectedCode));
  };

  it('should verify panic error 0x01', async function () {
    let error;
    try {
      await contract.verifyPanicError0x01();
    } catch (e) {
      error = e;
    }

    assertPanicError(error.data, 0x1);
  });

  it('should verify panic error 0x11', async function () {
    let error;
    try {
      await contract.verifyPanicError0x11();
    } catch (e) {
      error = e;
    }

    assertPanicError(error.data, 0x11);
  });

  it('should verify panic error 0x12', async function () {
    let error;
    try {
      await contract.verifyPanicError0x12();
    } catch (e) {
      error = e;
    }

    assertPanicError(error.data, 0x12);
  });

  it('should verify panic error 0x21', async function () {
    let error;
    try {
      await contract.verifyPanicError0x21();
    } catch (e) {
      error = e;
    }

    assertPanicError(error.data, 0x21);
  });

  it('should verify panic error 0x31', async function () {
    let error;
    try {
      const result = await contract.verifyPanicError0x31();
      await result.wait();
    } catch (e) {
      error = e;
    }

    assertPanicError(error.data, 0x31);
  });

  it('should verify panic error 0x32', async function () {
    let error;
    try {
      await contract.verifyPanicError0x32();
    } catch (e) {
      error = e;
    }

    assertPanicError(error.data, 0x32);
  });

  it('should verify panic error 0x41', async function () {
    let error;
    try {
      await contract.verifyPanicError0x41();
    } catch (e) {
      error = e;
    }

    assertPanicError(error.data, 0x41);
  });

  it('should verify panic error 0x51', async function () {
    let error;
    try {
      await contract.verifyPanicError0x51();
    } catch (e) {
      error = e;
    }

    assertPanicError(error.data, 0x51);
  });
});
// Filename: test/solidity/functions/functions.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const Utils = require('../../system-contracts/hedera-token-service/utils');

const weibarTotinybar = (amount) => amount / BigInt(Utils.tinybarToWeibarCoef);

describe('@solidityequiv2 Solidity Functions Test Suite', function () {
  let contract, contractAddr, contractChild, contractParent;

  before(async function () {
    const factory = await ethers.getContractFactory(
      Constants.Contract.Functions
    );
    contract = await factory.deploy();
    contractAddr = await contract.getAddress();

    const factoryChild = await ethers.getContractFactory(
      Constants.Contract.FunctionsChild
    );
    contractChild = await factoryChild.deploy();

    const factoryParent = await ethers.getContractFactory(
      Constants.Contract.FunctionsParent
    );
    contractParent = await factoryParent.deploy(contractAddr);
  });

  it('should confirm "internal" functionality', async function () {
    const message = await contractChild.getMessageString();
    expect(message).to.equal('Hello World');

    try {
      await contract.getMessage();
    } catch (error) {
      expect(error.message).to.equal('contract.getMessage is not a function');
    }
  });

  it('should confirm "external" functionality', async function () {
    const gas = await contractParent.testExternal();
    const gasSecond = await contract.checkGasleft();
    const fromExternalCall = await contract.checkGasleftFromExternalCall();
    expect(fromExternalCall).to.exist;
    expect(gas).to.exist;
    expect(gasSecond).to.exist;
  });

  it('should confirm "payable" functionality', async function () {
    const txDeposit = await contract.deposit({
      value: ethers.parseEther('1.0'),
    });
    txDeposit.wait();
    const balance = await contract.getBalance();
    expect(balance).to.exist;
    expect(balance).to.equal(weibarTotinybar(ethers.parseEther('1.0')));
    try {
      await contract.notPayable({ value: ethers.parseEther('1.0') });
    } catch (error) {
      expect(error.code).to.eq(-32008);
    }
  });

  it('should confirm "method({param1: value1, param2: value2...}): name properties" functionality', async function () {
    const res = await contract.manyInputsProxyCall();
    expect(res).to.exist;
  });

  it('should confirm "function func(uint k, uint)": omitted parameter name', async function () {
    const res = await contract.sumThemUp(12, 12);
    expect(res).to.equal(12);
  });
});
// Filename: test/solidity/inheritance/inheritance.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv2 Crypto Inheritance Tests', function () {
  let signers, contractMain, contractBase, wallet;
  const TOP_UP_AMOUNT = ethers.parseEther('0.000001');

  before(async function () {
    signers = await ethers.getSigners();
    wallet = signers[0];

    const factoryMain = await ethers.getContractFactory(
      Constants.Contract.Main
    );
    contractMain = await factoryMain.deploy();

    const factoryBase = await ethers.getContractFactory(
      Constants.Contract.Base
    );
    contractBase = await factoryBase.deploy();

    //top up the test contract with some funds
    const tx = {
      to: await contractMain.getAddress(),
      value: TOP_UP_AMOUNT,
    };
    const topUpRes = await wallet.sendTransaction(tx);
    await topUpRes.wait();
  });

  it("should confirm solidity functionality: this (current contract's type)", async function () {
    const mainThis = await contractMain.returnThis();

    expect(mainThis).to.equal(await contractMain.getAddress());
  });

  it('should confirm solidity functionality: super', async function () {
    const res = await contractMain.classIdentifier();

    expect(res).to.equal('Main');
  });
});
// Filename: test/solidity/modifiers/Modifiers.js
// SPDX-License-Identifier: Apache-2.0
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const Utils = require('../../system-contracts/hedera-token-service/utils');

describe('@solidityequiv2 Modifiers Test Suite', function () {
  let accounts, contractB, derivedContract, modifiersContract, owner;

  const tinybarToWeibar = (amount) =>
    amount * BigInt(Utils.tinybarToWeibarCoef);
  const weibarTotinybar = (amount) =>
    amount / BigInt(Utils.tinybarToWeibarCoef);

  beforeEach(async function () {
    const Modifiers = await ethers.getContractFactory(
      Constants.Contract.Modifiers
    );
    modifiersContract = await Modifiers.deploy(42);

    const Derived = await ethers.getContractFactory(
      Constants.Contract.DerivedContract
    );
    derivedContract = await Derived.deploy(55);

    const ContractA = await ethers.getContractFactory('A');
    contractA = await ContractA.deploy();

    const ContractB = await ethers.getContractFactory('B');
    contractB = await ContractB.deploy(79);

    [owner] = await ethers.getSigners();
    accounts = await ethers.getSigners();
  });

  it("Should not modify the contract's state after calling a pure function", async function () {
    const initialState = await ethers.provider.getCode(
      await modifiersContract.getAddress()
    );

    const result = await modifiersContract.addPure(7, 5);
    expect(result).to.equal(12);

    const finalState = await ethers.provider.getCode(
      await modifiersContract.getAddress()
    );
    expect(initialState).to.equal(finalState);
  });

  it("Should not modify the contract's state when calling a view function", async function () {
    const initialState = await ethers.provider.getStorage(
      await modifiersContract.getAddress(),
      0
    );

    const result = await modifiersContract.getData();
    expect(result).to.equal(42);

    const finalState = await ethers.provider.getStorage(
      await modifiersContract.getAddress(),
      0
    );
    expect(initialState).to.equal(finalState);
  });

  it("Should accept payments and increase the contract's balance", async function () {
    const initialBalance = await modifiersContract.getBalance();

    const paymentAmount = weibarTotinybar(ethers.parseEther('100'));
    await owner.sendTransaction({
      to: await modifiersContract.getAddress(),
      value: paymentAmount,
      data: modifiersContract.interface.encodeFunctionData('makePayment'),
    });

    const finalBalance = await modifiersContract.getBalance();
    expect(tinybarToWeibar(finalBalance + initialBalance)).to.equal(
      paymentAmount
    );
  });

  it('Should have the correct MAX_SUPPLY value', async function () {
    const maxSupply = await modifiersContract.MAX_SUPPLY();
    expect(maxSupply).to.equal(1000000);
  });

  it('Should set deploymentTimestamp to the block timestamp of deployment', async function () {
    const block = await ethers.provider.getBlock(
      modifiersContract.deploymentTransaction().blockHash
    );

    const deploymentTimestamp = await modifiersContract.deploymentTimestamp();
    expect(deploymentTimestamp).to.equal(block.timestamp);
  });

  it('Should emit indexed from and to values in the RegularEvent', async function () {
    const toAddress = accounts[1].address;
    const tx = await modifiersContract.triggerRegularEvent(
      toAddress,
      100,
      'test transfer'
    );
    const receipt = await tx.wait();

    expect(receipt.logs?.length).to.equal(1);
    const event = receipt.logs[0];

    // Check the event's topics. The first topic is the event's signature.
    // The next topics are the indexed parameters in the order they appear in the event.
    expect(event.topics[1].toLowerCase()).to.equal(
      ethers.zeroPadValue(accounts[0].address, 32).toLowerCase()
    ); // from address
    expect(event.topics[2].toLowerCase()).to.equal(
      ethers.zeroPadValue(toAddress, 32).toLowerCase()
    ); // to address
  });

  it('Should emit the AnonymousEvent with correct values', async function () {
    const tx = await modifiersContract.triggerAnonymousEvent(257);
    const receipt = await tx.wait();

    expect(receipt.logs?.length).to.equal(1);

    const anonymousEvent = receipt.logs[0];
    expect(anonymousEvent.fragment).to.undefined;

    // Since it's anonymous, we access the topics directly to get the indexed values.
    const senderAddress = '0x' + anonymousEvent.topics[0].slice(-40);
    expect(senderAddress.toLowerCase()).to.equal(
      accounts[0].address.toLowerCase()
    );
    const abi = ethers.AbiCoder.defaultAbiCoder();
    const value = abi.decode(['uint256'], anonymousEvent.data);
    expect(value[0]).to.equal(257);
  });

  it('Should return the message in the from the derived contract that overrides the virtual function', async function () {
    expect(await derivedContract.getData()).to.equal(55);
    expect(await derivedContract.show()).to.equal(
      'This is the derived contract'
    );
  });

  it('Should return the message in the from ContractB that overrides the show function', async function () {
    expect(await contractB.getData()).to.equal(79);
    expect(await contractB.show()).to.equal(
      'This is the overriding contract B'
    );
  });
});
// Filename: test/solidity/modular/Token.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv2 Modular Token Test Suite', () => {
  const INITIAL_AMOUNT = 12000;
  let modularTokenContract, signers, accountA, accountB;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    accountA = await signers[0].getAddress();
    accountB = await signers[1].getAddress();

    const modularTokenContractFactory = await ethers.getContractFactory(
      Constants.Contract.Token
    );

    modularTokenContract = await modularTokenContractFactory.deploy(
      INITIAL_AMOUNT
    );
  });

  it('Deployment', async () => {
    const initialBalance = await modularTokenContract.balanceOf(
      accountA // deployer
    );

    expect(initialBalance).to.eq(INITIAL_AMOUNT);
    expect(ethers.isAddress(await modularTokenContract.getAddress())).to.be
      .true;
  });

  it('Should transfer an `amount` of token from `msg.sender` to `to` address', async () => {
    const TRANSFER_AMOUNT = 3000;

    // execute transaction
    const tx = await modularTokenContract.transfer(accountB, TRANSFER_AMOUNT);

    // retrieve states from event
    const receipt = await tx.wait();
    const event = receipt.logs.map(
      (e) => e.fragment.name === 'Transfer' && e
    )[0];
    const [from, to, amount] = event.args;

    // retrieve balances after transfer
    const accountABalance = await modularTokenContract.balanceOf(accountA);
    const accountBBalance = await modularTokenContract.balanceOf(accountB);

    // assertion
    expect(from).to.eq(accountA);
    expect(to).to.eq(accountB);
    expect(amount).to.eq(TRANSFER_AMOUNT);
    expect(accountABalance).to.eq(INITIAL_AMOUNT - TRANSFER_AMOUNT);
    expect(accountBBalance).to.eq(TRANSFER_AMOUNT);
  });

  it('Should let `msg.sender` approve an `amount` of allowance for `spender`', async () => {
    const ALLOWANCE = 3000;

    // execute transaction
    const tx = await modularTokenContract.approve(accountB, ALLOWANCE);

    // retrieve states from event
    const receipt = await tx.wait();
    const event = receipt.logs.map(
      (e) => e.fragment.name === 'Approval' && e
    )[0];
    const [owner, spender, allowance] = event.args;

    // retrieve allowance from contract
    const storageAllowance = await modularTokenContract.allowance(
      accountA,
      accountB
    );

    // assertion
    expect(owner).to.eq(accountA);
    expect(spender).to.eq(accountB);
    expect(allowance).to.eq(ALLOWANCE);
    expect(storageAllowance).to.eq(ALLOWANCE);
  });

  it('Should let `msg.sender` transfer an `amount` to `to` on behalf of `from`', async () => {
    const ALLOWANCE = 3000;

    // accountA first need to approve an allowance for accountB
    await modularTokenContract.approve(accountB, ALLOWANCE);

    // execute transferFrom by signer[1] (i.e. accountB)
    const tx = await modularTokenContract
      .connect(signers[1])
      .transferFrom(
        accountA,
        accountB,
        ALLOWANCE,
        Constants.GAS_LIMIT_1_000_000
      );

    // retrieve states from event
    const receipt = await tx.wait();
    const event = receipt.logs.map(
      (e) => e.fragment.name === 'Transfer' && e
    )[0];
    const [from, to, amount] = event.args;

    // retrieve balances and allowance from storage
    const accountABalance = await modularTokenContract.balanceOf(accountA);
    const accountBBalance = await modularTokenContract.balanceOf(accountB);

    // assertion
    expect(to).to.eq(accountB);
    expect(from).to.eq(accountA);
    expect(amount).to.eq(ALLOWANCE);
    expect(accountBBalance).to.eq(ALLOWANCE);
    expect(accountABalance).to.eq(INITIAL_AMOUNT - ALLOWANCE);
  });
});
// Filename: test/solidity/new/New.js
// SPDX-License-Identifier: Apache-2.0

const {expect} = require('chai');
const {ethers} = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv2 New Keyword Test Suite', () => {
  let newContract;
  let targetContract;
  const CONTRACT_ALPHA = 'Alpha';
  const MESSAGE_ALPHA = 'Message from Alpha contract';

  before(async () => {
    const newContractFactory = await ethers.getContractFactory(
        Constants.Contract.New
    );
    newContract = await newContractFactory.deploy();

    const targetFactory = await ethers.getContractFactory(
        Constants.Contract.Target
    );
    targetContract = await targetFactory.deploy();
  });

  describe('New', function () {
    it('Create new contract using `new` keyword', async () => {
      const tx = await newContract.createContract(CONTRACT_ALPHA, MESSAGE_ALPHA);
      await tx.wait();
      const newContractsInfo = await newContract.newContractsInfo(CONTRACT_ALPHA);

      expect(ethers.isAddress(newContractsInfo.contractAddr)).to.be.true;
      expect(newContractsInfo.message).to.eq(MESSAGE_ALPHA);
    });

    it('Create new contract using `new` keyword with data', async () => {
      const tx = await newContract.createContractWithData(CONTRACT_ALPHA, MESSAGE_ALPHA);
      await tx.wait();
      const newContractsInfo = await newContract.newContractsInfo(CONTRACT_ALPHA);

      expect(ethers.isAddress(newContractsInfo.contractAddr)).to.be.true;
      expect(newContractsInfo.message).to.eq(MESSAGE_ALPHA);
    });
  });

  it('Create new contract using `new` keyword with salt', async () => {
    const SALT = ethers.encodeBytes32String('salt');

    await newContract.createContractWithSalt(
        SALT,
        CONTRACT_ALPHA,
        MESSAGE_ALPHA
    );
    const newContractsInfo = await newContract.newContractsInfo(CONTRACT_ALPHA);

    expect(ethers.isAddress(newContractsInfo.contractAddr)).to.be.true;
    expect(newContractsInfo.message).to.eq(MESSAGE_ALPHA);
  });

  describe('Target', function () {
    it('should be able to update the message', async () => {
      const msgBefore = await targetContract.message();
      const updatedMsg = '0x5644';

      const tx = await targetContract.setMessage(updatedMsg);
      await tx.wait();

      const msgAfter = await targetContract.message();

      expect(msgBefore).to.not.equal(msgAfter);
      expect(msgAfter).to.equal(updatedMsg);
    });

    it('should emit event WithdrawResponse (true, 0x) for calling non-existing contract with tryToWithdraw (no-op)', async () => {
      const randomAddress = ethers.Wallet.createRandom().address;
      const tx = await targetContract.tryToWithdraw(randomAddress, 1);
      const receipt = await tx.wait();

      expect(receipt.logs).to.not.be.empty;
      expect(receipt.logs[0].args[0]).to.be.true;
      expect(receipt.logs[0].args[1]).to.equal('0x');
    });
  });
});
// Filename: test/solidity/opcode-logger/opcodeLogger.js
// SPDX-License-Identifier: Apache-2.0

const Constants = require('../../constants');
const { expect, assert } = require('chai');
const hre = require('hardhat');
const fs = require('fs');
const {ethers} = hre;
const { hexToASCII } = require('../../utils')

const BESU_RESULTS_JSON_PATH = __dirname + '/opcodeLoggerBesuResults.json';
const IS_BESU_NETWORK = hre.network.name === 'besu_local';

describe('@OpcodeLogger Test Suite', async function () {
  let signers;
  let randomAddress;
  let opcodeLogger;

  before(async () => {
    signers = await ethers.getSigners();
    randomAddress = (ethers.Wallet.createRandom()).address;

    const factoryOpcodeLogger = await ethers.getContractFactory(Constants.Contract.OpcodeLogger);
    opcodeLogger = await factoryOpcodeLogger.deploy({gasLimit: 5_000_000});
    await opcodeLogger.waitForDeployment();
  });

  async function executeDebugTraceTransaction(txHash, options = {
    tracer: 'opcodeLogger',
    disableStorage: true,
    disableMemory: true,
    disableStack: true
  }) {
    return await signers[0].provider.send(
        'debug_traceTransaction', [txHash, options]
    );
  }

  describe('besu comparison', async function () {
    let erc20;
    let erc721;
    let besuResults;
    let updatedBesuResults = {};
    const NFT_ID = 5644;

    function compareOutputs(methodName, result) {
      if (hre.network.name !== 'besu_local') {
        expect(result).to.haveOwnProperty('gas');
        expect(result).to.haveOwnProperty('failed');
        expect(result).to.haveOwnProperty('returnValue');
        expect(result).to.haveOwnProperty('structLogs');

        const besuResp = besuResults[methodName];
        expect(besuResp).to.exist;
        expect(besuResp.failed).to.equal(result.failed);
        expect(besuResp.structLogs.length).to.equal(result.structLogs.length);
        expect(besuResp.structLogs.map(e => e.op)).to.deep.equal(result.structLogs.map(e => e.op));
      }
    }

    async function updateBesuResponsesIfNeeded(key, txHash) {
      if (IS_BESU_NETWORK) {
        updatedBesuResults[key] = await executeDebugTraceTransaction(txHash);
      }
    }

    before(async () => {
      besuResults = JSON.parse(fs.readFileSync(BESU_RESULTS_JSON_PATH));

      const erc20Factory = await ethers.getContractFactory(Constants.Path.HIP583_ERC20Mock);
      erc20 = await erc20Factory.deploy();
      await erc20.waitForDeployment();
      await (await erc20.mint(signers[0].address, 10_000_000_000)).wait();

      const erc721Factory = await ethers.getContractFactory(Constants.Path.HIP583_ERC721Mock);
      erc721 = await erc721Factory.deploy();
      await erc721.waitForDeployment();
      await (await erc721.mint(signers[0].address, NFT_ID)).wait();
    });

    after(async () => {
      if (IS_BESU_NETWORK) {
        fs.writeFileSync(BESU_RESULTS_JSON_PATH, JSON.stringify(updatedBesuResults, null, 2));
      }
    });

    it('should be able to call nonExisting contract', async function () {
      const res = await (await signers[0].sendTransaction({
        to: randomAddress,
        data: '0x00564400'
      })).wait();

      await updateBesuResponsesIfNeeded('nonExistingContract', res.hash);
      compareOutputs('nonExistingContract', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to call existing contract with nonExisting function', async function () {
      const res = await (await signers[0].sendTransaction({
        to: randomAddress,
        data: '0x00564400'
      })).wait();

      await updateBesuResponsesIfNeeded('existingContractNonExistingFunction', res.hash);
      compareOutputs('existingContractNonExistingFunction', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute updateOwner()', async function () {
      const res = await (await opcodeLogger.updateOwner({gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('updateOwner', res.hash);
      compareOutputs('updateOwner', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute resetCounter()', async function () {
      const res = await (await opcodeLogger.resetCounter({gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('resetCounter', res.hash);
      compareOutputs('resetCounter', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute call()', async function () {
      const res = await (await opcodeLogger.call(randomAddress, '0x056440', {gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('call', res.hash);
      compareOutputs('call', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute staticCall()', async function () {
      const res = await (await opcodeLogger.staticCall(randomAddress, '0x056440', {gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('staticCall', res.hash);
      compareOutputs('staticCall', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute callCode()', async function () {
      const res = await (await opcodeLogger.callCode(randomAddress, '0x056440', {gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('callCode', res.hash);
      compareOutputs('callCode', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute delegateCall()', async function () {
      const res = await (await opcodeLogger.delegateCall(randomAddress, '0x056440', {gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('delegateCall', res.hash);
      compareOutputs('delegateCall', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute erc20.approve()', async function () {
      const res = await (await erc20.approve(randomAddress, 5644, {gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('erc20.approve', res.hash);
      compareOutputs('erc20.approve', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute erc20.transfer()', async function () {
      const res = await (await erc20.transfer(randomAddress, 5644, {gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('erc20.transfer', res.hash);
      compareOutputs('erc20.transfer', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute erc20.transferFrom()', async function () {
      await (await erc20.approve(signers[1].address, 5644, {gasLimit: 1_000_000})).wait();
      const erc20SecondSigner = erc20.connect(signers[1]);

      const res = await (await erc20SecondSigner.transferFrom(signers[0].address, randomAddress, 56, {gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('erc20.transferFrom', res.hash);
      compareOutputs('erc20.transferFrom', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute erc721.approve()', async function () {
      const res = await (await erc721.approve(randomAddress, NFT_ID, {gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('erc721.approve', res.hash);
      compareOutputs('erc721.approve', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute erc721.setApprovalForAll()', async function () {
      const res = await (await erc721.setApprovalForAll(randomAddress, true, {gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('erc721.setApprovalForAll', res.hash);
      compareOutputs('erc721.setApprovalForAll', await executeDebugTraceTransaction(res.hash));
    });

    it('should be able to execute erc721.transferFrom()', async function () {
      await (await erc721.approve(signers[1].address, NFT_ID, {gasLimit: 1_000_000})).wait();
      const erc721SecondSigner = erc721.connect(signers[1]);

      const res = await (await erc721SecondSigner.transferFrom(signers[0].address, signers[1].address, NFT_ID, {gasLimit: 1_000_000})).wait();
      await updateBesuResponsesIfNeeded('erc721.transferFrom', res.hash);
      compareOutputs('erc721.transferFrom', await executeDebugTraceTransaction(res.hash));
    });
  });

  const txTypeSpecificSuitesConfig = {
    'type 0 tx suite': {gasLimit: 5_000_000, gasPrice: 710_000_000_000},
    'type 1 tx suite': {gasLimit: 5_000_000, gasPrice: 710_000_000_000, accessList: []},
    'type 2 tx suite': {gasLimit: 5_000_000},
  };
  for (let suiteName in txTypeSpecificSuitesConfig) {
    const txTypeSpecificOverrides = txTypeSpecificSuitesConfig[suiteName];
    describe(suiteName, async function () {
      it('successful CREATE transaction with disabledMemory, disabledStack, disabledStorage set to false', async function () {
        const factory = await ethers.getContractFactory(Constants.Contract.Base);
        const contract = await factory.deploy(txTypeSpecificOverrides);
        await contract.waitForDeployment();

        const {hash} = await contract.deploymentTransaction();
        const res = await executeDebugTraceTransaction(hash, {
          tracer: 'opcodeLogger',
          disableStorage: false,
          disableMemory: false,
          disableStack: false
        });

        expect(res.failed).to.be.false;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.not.equal(null);
          expect(sl.memory).to.not.equal(null);
          expect(sl.stack).to.not.equal(null);
        });
      });

      it('failing CREATE transaction with disabledMemory, disabledStack, disabledStorage set to false', async function () {
        const factory = await ethers.getContractFactory(Constants.Contract.Base);
        const contract = await factory.deploy({...txTypeSpecificOverrides, gasLimit: 25484});
        await expect(contract.waitForDeployment()).to.be.rejectedWith(Error);

        const {hash} = await contract.deploymentTransaction();
        const res = await executeDebugTraceTransaction(hash, {
          tracer: 'opcodeLogger',
          disableStorage: false,
          disableMemory: false,
          disableStack: false
        });

        expect(res.failed).to.be.true;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.not.equal(null);
          expect(sl.memory).to.not.equal(null);
          expect(sl.stack).to.not.equal(null);
        });
      });

      it('successful CREATE transaction with disabledMemory, disabledStack, disabledStorage set to true', async function () {
        const factory = await ethers.getContractFactory(Constants.Contract.Base);
        const contract = await factory.deploy(txTypeSpecificOverrides);
        await contract.waitForDeployment();

        const {hash} = await contract.deploymentTransaction();
        const res = await executeDebugTraceTransaction(hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: true,
          disableStack: true
        });

        expect(res.failed).to.be.false;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('failing CREATE transaction with disabledMemory, disabledStack, disabledStorage set to true', async function () {
        const factory = await ethers.getContractFactory(Constants.Contract.Base);
        const contract = await factory.deploy({...txTypeSpecificOverrides, gasLimit: 25484});
        await expect(contract.waitForDeployment()).to.be.rejectedWith(Error);

        const {hash} = await contract.deploymentTransaction();
        const res = await executeDebugTraceTransaction(hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: true,
          disableStack: true
        });

        expect(res.failed).to.be.true;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('successful CREATE transaction with disabledMemory set to false, disabledStack, disabledStorage set to true', async function () {
        const factory = await ethers.getContractFactory(Constants.Contract.Base);
        const contract = await factory.deploy(txTypeSpecificOverrides);
        await contract.waitForDeployment();

        const {hash} = await contract.deploymentTransaction();
        const res = await executeDebugTraceTransaction(hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: false,
          disableStack: true
        });

        expect(res.failed).to.be.false;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.not.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('failing CREATE transaction with disabledMemory set to false, disabledStack, disabledStorage set to true', async function () {
        const factory = await ethers.getContractFactory(Constants.Contract.Base);
        const contract = await factory.deploy({...txTypeSpecificOverrides, gasLimit: 25484});
        await expect(contract.waitForDeployment()).to.be.rejectedWith(Error);

        const {hash} = await contract.deploymentTransaction();
        const res = await executeDebugTraceTransaction(hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: false,
          disableStack: true
        });

        expect(res.failed).to.be.true;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.not.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('successful CREATE transaction with disabledStack set to false, disabledMemory, disabledStorage set to true', async function () {
        const factory = await ethers.getContractFactory(Constants.Contract.Base);
        const contract = await factory.deploy(txTypeSpecificOverrides);
        await contract.waitForDeployment();

        const {hash} = await contract.deploymentTransaction();
        const res = await executeDebugTraceTransaction(hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: true,
          disableStack: false
        });

        expect(res.failed).to.be.false;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.not.equal(null);
        });
      });

      it('failing CREATE transaction with disabledStack set to false, disabledMemory, disabledStorage set to true', async function () {
        const factory = await ethers.getContractFactory(Constants.Contract.Base);
        const contract = await factory.deploy({...txTypeSpecificOverrides, gasLimit: 25484});
        await expect(contract.waitForDeployment()).to.be.rejectedWith(Error);

        const {hash} = await contract.deploymentTransaction();
        const res = await executeDebugTraceTransaction(hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: true,
          disableStack: false
        });

        expect(res.failed).to.be.true;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.not.equal(null);
        });
      });

      it('successful CREATE transaction with disabledStorage set to false, disabledMemory, disabledStack set to true', async function () {
        const factory = await ethers.getContractFactory(Constants.Contract.Base);
        const contract = await factory.deploy(txTypeSpecificOverrides);
        await contract.waitForDeployment();

        const {hash} = await contract.deploymentTransaction();
        const res = await executeDebugTraceTransaction(hash, {
          tracer: 'opcodeLogger',
          disableStorage: false,
          disableMemory: true,
          disableStack: true
        });

        expect(res.failed).to.be.false;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.not.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('failing CREATE transaction with disabledStorage set to false, disabledMemory, disabledStack set to true', async function () {
        const factory = await ethers.getContractFactory(Constants.Contract.Base);
        const contract = await factory.deploy({...txTypeSpecificOverrides, gasLimit: 25484});
        await expect(contract.waitForDeployment()).to.be.rejectedWith(Error);

        const {hash} = await contract.deploymentTransaction();
        const res = await executeDebugTraceTransaction(hash, {
          tracer: 'opcodeLogger',
          disableStorage: false,
          disableMemory: true,
          disableStack: true
        });

        expect(res.failed).to.be.true;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.not.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('successful CALL transaction with disabledMemory, disabledStack, disabledStorage set to true', async function () {
        const tx = await opcodeLogger.resetCounter(txTypeSpecificOverrides);
        await tx.wait();
        const res = await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: true,
          disableStack: true
        });

        expect(res.failed).to.be.false;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('failing CALL transaction with disabledMemory, disabledStack, disabledStorage set to true', async function () {
        const tx = await opcodeLogger.resetCounter({...txTypeSpecificOverrides, gasLimit: 21_064});
        await expect(tx.wait()).to.be.rejectedWith(Error);
        const res = await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: true,
          disableStack: true
        });

        expect(res.failed).to.be.true;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('successful CALL transaction with disabledMemory, disabledStack, disabledStorage set to false', async function () {
        const tx = await opcodeLogger.resetCounter(txTypeSpecificOverrides);
        await tx.wait();
        const res = await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: false,
          disableMemory: false,
          disableStack: false
        });

        expect(res.failed).to.be.false;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.not.equal(null);
          expect(sl.memory).to.not.equal(null);
          expect(sl.stack).to.not.equal(null);
        });
      });

      it('failing CALL transaction with disabledMemory, disabledStack, disabledStorage set to false', async function () {
        const tx = await opcodeLogger.resetCounter({...txTypeSpecificOverrides, gasLimit: 21_064});
        await expect(tx.wait()).to.be.rejectedWith(Error);
        const res = await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: false,
          disableMemory: false,
          disableStack: false
        });

        expect(res.failed).to.be.true;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.not.equal(null);
          expect(sl.memory).to.not.equal(null);
          expect(sl.stack).to.not.equal(null);
        });
      });
      it('successful CALL transaction with disabledMemory set to false, disabledStack, disabledStorage set to true', async function () {
        const tx = await opcodeLogger.resetCounter(txTypeSpecificOverrides);
        await tx.wait();
        const res = await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: false,
          disableStack: true
        });

        expect(res.failed).to.be.false;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.not.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('failing CALL transaction with disabledMemory set to false, disabledStack, disabledStorage set to true', async function () {
        const tx = await opcodeLogger.resetCounter({...txTypeSpecificOverrides, gasLimit: 21_064});
        await expect(tx.wait()).to.be.rejectedWith(Error);
        const res = await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: false,
          disableStack: true
        });

        expect(res.failed).to.be.true;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.not.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('successful CALL transaction with disabledStack set to false, disabledMemory, disabledStorage set to true', async function () {
        const tx = await opcodeLogger.resetCounter(txTypeSpecificOverrides);
        await tx.wait();
        const res = await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: true,
          disableStack: false
        });

        expect(res.failed).to.be.false;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.not.equal(null);
        });
      });

      it('failing CALL transaction with disabledStack set to false, disabledMemory, disabledStorage set to true', async function () {
        const tx = await opcodeLogger.resetCounter({...txTypeSpecificOverrides, gasLimit: 21_064});
        await expect(tx.wait()).to.be.rejectedWith(Error);
        const res = await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: true,
          disableMemory: true,
          disableStack: false
        });

        expect(res.failed).to.be.true;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.not.equal(null);
        });
      });

      it('successful CALL transaction with disabledStorage set to false, disabledMemory, disabledStack set to true', async function () {
        const tx = await opcodeLogger.resetCounter(txTypeSpecificOverrides);
        await tx.wait();
        const res = await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: false,
          disableMemory: true,
          disableStack: true
        });

        expect(res.failed).to.be.false;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.not.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });

      it('failing CALL transaction with disabledStorage set to false, disabledMemory, disabledStack set to true', async function () {
        const tx = await opcodeLogger.resetCounter({...txTypeSpecificOverrides, gasLimit: 21_064});
        await expect(tx.wait()).to.be.rejectedWith(Error);
        const res = await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: false,
          disableMemory: true,
          disableStack: true
        });

        expect(res.failed).to.be.true;
        expect(res.structLogs.length).to.be.greaterThan(0);
        res.structLogs.map(function (sl) {
          expect(sl.storage).to.not.equal(null);
          expect(sl.memory).to.equal(null);
          expect(sl.stack).to.equal(null);
        });
      });
    });
  }

  describe('nested calls', async function () {
    let errorsExternal, nestedContractCreateTx;

    before(async () => {
      const factoryErrorsExternal = await ethers.getContractFactory(Constants.Contract.ErrorsExternal);
      errorsExternal = await factoryErrorsExternal.deploy();
      await errorsExternal.waitForDeployment();

      const contractCreatorFactory = await ethers.getContractFactory(Constants.Contract.ContractCreator);
      const contractCreator = await contractCreatorFactory.deploy();
      await contractCreator.waitForDeployment();
      const contractByteCode = (await hre.artifacts.readArtifact('Base')).bytecode;
      nestedContractCreateTx = await contractCreator.createNewContract(contractByteCode);
    });

    it('successful NESTED CALL to existing contract with disabledMemory, disabledStack, disabledStorage set to true', async function () {
      const tx = await opcodeLogger.call(opcodeLogger.target, '0xdbdf7fce'); // calling resetCounter()
      await tx.wait();
      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('failing NESTED CALL to existing contract with disabledMemory, disabledStack, disabledStorage set to true', async function () {
      const tx = await opcodeLogger.call(errorsExternal.target, '0xe3fdf09c'); // calling revertSimple()
      await tx.wait();
      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.false
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('successful NESTED CALL to existing contract with disabledMemory, disabledStack, disabledStorage set to false', async function () {
      const tx = await opcodeLogger.call(opcodeLogger.target, '0xdbdf7fce'); // calling resetCounter()
      await tx.wait();
      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: false,
        disableMemory: false,
        disableStack: false
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.not.equal(null);
        expect(sl.memory).to.not.equal(null);
        expect(sl.stack).to.not.equal(null);
      });
    });

    it('failing NESTED CALL to existing contract with disabledMemory, disabledStack, disabledStorage set to false', async function () {
      const tx = await opcodeLogger.call(errorsExternal.target, '0xe3fdf09c'); // calling revertSimple()
      await tx.wait();
      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: false,
        disableMemory: false,
        disableStack: false
      });

      expect(res.failed).to.be.false
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.not.equal(null);
        expect(sl.memory).to.not.equal(null);
        expect(sl.stack).to.not.equal(null);
      });
    });

    it('successful NESTED CALL to existing contract with disabledMemory set to false, disabledStack, disabledStorage set to true', async function () {
      const tx = await opcodeLogger.call(opcodeLogger.target, '0xdbdf7fce'); // calling resetCounter()
      await tx.wait();
      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: false,
        disableStack: true
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.not.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('failing NESTED CALL to existing contract with disabledMemory set to false, disabledStack, disabledStorage set to true', async function () {
      const tx = await opcodeLogger.call(errorsExternal.target, '0xe3fdf09c'); // calling revertSimple()
      await tx.wait();
      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: false,
        disableStack: true
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.not.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('successful NESTED CALL to existing contract with disabledStack set to false, disabledMemory, disabledStorage set to true', async function () {
      const tx = await opcodeLogger.call(opcodeLogger.target, '0xdbdf7fce'); // calling resetCounter()
      await tx.wait();
      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: false
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.not.equal(null);
      });
    });

    it('failing NESTED CALL to existing contract with disabledStack set to false, disabledMemory, disabledStorage set to true', async function () {
      const tx = await opcodeLogger.call(errorsExternal.target, '0xe3fdf09c'); // calling revertSimple()
      await tx.wait();
      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: false
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.not.equal(null);
      });
    });

    it('successful NESTED CALL to existing contract with disabledStorage set to false, disabledMemory, disabledStack set to true', async function () {
      const tx = await opcodeLogger.call(opcodeLogger.target, '0xdbdf7fce'); // calling resetCounter()
      await tx.wait();
      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: false,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.not.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('failing NESTED CALL to existing contract with disabledStorage set to false, disabledMemory, disabledStack set to true', async function () {
      const tx = await opcodeLogger.call(errorsExternal.target, '0xe3fdf09c'); // calling revertSimple()
      await tx.wait();
      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: false,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.not.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('successful NESTED Create CALL Deploy a contract which successfully deploys another contract with disableMemory, DisableStack and disableStorage set to true', async function () {
      const res = await executeDebugTraceTransaction(nestedContractCreateTx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('successful NESTED Create CALL Deploy a contract which successfully deploys another contract with disableMemory, DisableStack and disableStorage set to false', async function () {
      const res = await executeDebugTraceTransaction(nestedContractCreateTx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: false,
        disableMemory: false,
        disableStack: false
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.not.equal(null);
        expect(sl.memory).to.not.equal(null);
        expect(sl.stack).to.not.equal(null);
      });
    });
  });

  describe('precompiles', async function () {
    let precompiles;
    let tokenCreateContract;
    let tokenCreateTx;
    let tokenCreateContractAddress;
    let tokenAddress;

    before(async () => {
      const factoryPrecompiles = await ethers.getContractFactory(Constants.Contract.Precompiles);
      precompiles = await factoryPrecompiles.deploy();
      await precompiles.waitForDeployment();

      const tokenCreateFactory = await ethers.getContractFactory(Constants.Contract.TokenCreateOpcodeLogger);
      tokenCreateContract = await tokenCreateFactory.deploy(Constants.GAS_LIMIT_1_000_000);
      await tokenCreateContract.waitForDeployment();
      tokenCreateTx = await tokenCreateContract.createFungibleTokenPublic(
        await tokenCreateContract.getAddress(),
        {
          value: BigInt('10000000000000000000'),
          gasLimit: 1_000_000,
        }
      );
      const tokenAddressReceipt = await tokenCreateTx.wait();
      tokenAddress = { tokenAddress } = tokenAddressReceipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.CreatedToken
      )[0].args.tokenAddress;
      tokenCreateContractAddress = await tokenCreateContract.getAddress();
    });

    it('successful ETH precompile call to 0x2 with disabledMemory, disabledStack, disabledStorage set to true', async function () {
      const tx = await precompiles.modExp(5644, 3, 2);
      await tx.wait();

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('failing ETH precompile call to 0x2 with disabledMemory, disabledStack, disabledStorage set to true', async function () {
      const tx = await precompiles.modExp(5644, 3, 2, {gasLimit: 21_496});
      await expect(tx.wait()).to.be.rejectedWith(Error);

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.true;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('successful ETH precompile call to 0x2 with disabledMemory, disabledStack, disabledStorage set to false', async function () {
      const tx = await precompiles.modExp(5644, 3, 2);
      await tx.wait();

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: false,
        disableMemory: false,
        disableStack: false
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.not.equal(null);
        expect(sl.memory).to.not.equal(null);
        expect(sl.stack).to.not.equal(null);
      });
    });

    it('failing ETH precompile call to 0x2 with disabledMemory, disabledStack, disabledStorage set to false', async function () {
      const tx = await precompiles.modExp(5644, 3, 2, {gasLimit: 21_496});
      await expect(tx.wait()).to.be.rejectedWith(Error);

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: false,
        disableMemory: false,
        disableStack: false
      });

      expect(res.failed).to.be.true;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.not.equal(null);
        expect(sl.memory).to.not.equal(null);
        expect(sl.stack).to.not.equal(null);
      });
    });

    it('successful ETH precompile call to 0x2 with disabledStorage set to false, disabledMemory, disabledStack set to true', async function () {
      const tx = await precompiles.modExp(5644, 3, 2);
      await tx.wait();

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: false,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.not.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('failing ETH precompile call to 0x2 with disabledStorage set to false, disabledMemory, disabledStack set to true', async function () {
      const tx = await precompiles.modExp(5644, 3, 2, { gasLimit: 21_496 });
      await expect(tx.wait()).to.be.rejectedWith(Error);

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: false,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.true;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.not.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('successful ETH precompile call to 0x2 with disabledMemory set to false, disabledStorage, disabledStack set to true', async function () {
      const tx = await precompiles.modExp(5644, 3, 2);
      await tx.wait();

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: false,
        disableStack: true
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.not.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('failing ETH precompile call to 0x2 with disabledMemory set to false, disabledStorage, disabledStack set to true', async function () {
      const tx = await precompiles.modExp(5644, 3, 2, { gasLimit: 21_496 });
      await expect(tx.wait()).to.be.rejectedWith(Error);

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: false,
        disableStack: true
      });

      expect(res.failed).to.be.true;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.not.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('successful ETH precompile call to 0x2 with disabledStack set to false, disabledStorage, disabledMemory set to true', async function () {
      const tx = await precompiles.modExp(5644, 3, 2);
      await tx.wait();

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: false
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.not.equal(null);
      });
    });

    it('failing ETH precompile call to 0x2 with disabledStack set to false, disabledStorage, disabledMemory set to true', async function () {
      const tx = await precompiles.modExp(5644, 3, 2, { gasLimit: 21_496 });
      await expect(tx.wait()).to.be.rejectedWith(Error);

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: false
      });

      expect(res.failed).to.be.true;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.not.equal(null);
      });
    });

    it('successful tokenCreate call with disabledStorage, disabledMemory, disabledStack  set to true', async function () {
      const res = await executeDebugTraceTransaction(tokenCreateTx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.equal(null);
        expect(sl.memory).to.equal(null);
        expect(sl.stack).to.equal(null);
      });
    });

    it('successful tokenCreate call with disabledStorage, disabledMemory, disabledStack  set to false', async function () {
      const res = await executeDebugTraceTransaction(tokenCreateTx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: false,
        disableMemory: false,
        disableStack: false
      });

      expect(res.failed).to.be.false;
      expect(res.structLogs.length).to.be.greaterThan(0);
      res.structLogs.map(function (sl) {
        expect(sl.storage).to.not.equal(null);
        expect(sl.memory).to.not.equal(null);
        expect(sl.stack).to.not.equal(null);
      });
    });

    it('should not contain revert operation when GAS is depleted (insufficient)', async function () {
      const tx = await tokenCreateContract.createNonFungibleTokenPublic(
        tokenCreateContractAddress,
        { gasLimit: 21432 }
      );

      const res = await executeDebugTraceTransaction(tx.hash, {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: true
      });

      const revertOperations = res.structLogs.filter(function (opLog) {
        return opLog.op === "REVERT"
      });
      expect(revertOperations.length).to.equal(0);
    });
  });

  describe('negative', async function () {
    it('should fail to debug a transaction with invalid hash', async function () {
      const res = await executeDebugTraceTransaction('0x0fdfb3da2d40cd9ac8776ca02c17cb4aae634d2726f5aad049ab4ce5056b1a5c', {
        tracer: 'opcodeLogger',
        disableStorage: true,
        disableMemory: true,
        disableStack: true
      });

      expect(res.failed).to.be.true;
      expect(res.structLogs).to.be.empty;
    });

    it('should fail with invalid parameter value type for disableMemory, disableStack or disableStorage', async function () {
      const tx = await opcodeLogger.call(opcodeLogger.target, '0xdbdf7fce'); // calling resetCounter()
      await tx.wait();
      try {
        await executeDebugTraceTransaction(tx.hash, {
          tracer: 'opcodeLogger',
          disableStorage: 'true',
          disableMemory: 1,
          disableStack: 0
        });

      } catch (error) {
        expect(error.name).to.equal('ProviderError');
        expect(error._isProviderError).to.be.true;
        expect(error._stack).to.contain('Invalid parameter 2: Invalid tracerConfig');

        return;
      }

      assert.fail('Executing debug trace transaction with invalid parameter value types did not result in error')
    });

    it('should fail when executing debug trace transaction with incorrect tracer parameter', async function () {
      const tx = await opcodeLogger.call(opcodeLogger.target, '0xdbdf7fce'); // calling resetCounter()
      await tx.wait();
      const incorrectTracer = 'opcodeLogger1';

      try {
        await executeDebugTraceTransaction(tx.hash, {
          tracer: incorrectTracer,
          disableStorage: true,
          disableMemory: true,
          disableStack: true
        });
      } catch (error) {
        expect(error.name).to.equal('ProviderError');
        expect(error._isProviderError).to.be.true;
        expect(error._stack).to.contain(`Invalid parameter 1: Invalid tracer type, value: ${incorrectTracer}`);

        return;
      }

      assert.fail('Executing debug trace transaction with incorrect tracer parameter did not result in error')
    });
  });
});
// Filename: test/solidity/payment-channel/PaymentChannel.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const PaymentChannelHelper = require('./helper');

describe('@solidityequiv2 PaymentChannel Test Suite', () => {
  const GASLIMIT = 1000000;
  const DURATION = 3; // 3 seconds
  const OWED_AMOUNT = 100000000;
  const INITIAL_FUND = ethers.parseEther('3');
  let signers,
    senderAddress,
    recipientAddress,
    paymentSignature,
    paymentChannelContract;

  before(async () => {
    signers = await ethers.getSigners();
    senderAddress = await signers[0].getAddress();
    recipientAddress = await signers[1].getAddress();

    const paymentChannelContractFactory = await ethers.getContractFactory(
      Constants.Contract.PaymentChannel
    );

    paymentChannelContract = await paymentChannelContractFactory.deploy(
      recipientAddress,
      DURATION,
      {
        gasLimit: GASLIMIT,
        value: INITIAL_FUND,
      }
    );

    paymentSignature = await PaymentChannelHelper.signPayment(
      signers[0],
      await paymentChannelContract.getAddress(),
      OWED_AMOUNT
    );
  });

  it('Should deployed with correct deployed arguments - open payment channel', async () => {
    const contractBalance = await ethers.provider.getBalance(
      await paymentChannelContract.getAddress()
    );

    expect(contractBalance).to.eq(INITIAL_FUND);
    expect(await paymentChannelContract.expiration()).to.not.eq(0);
    expect(await paymentChannelContract.sender()).to.eq(senderAddress);
    expect(await paymentChannelContract.recipient()).to.eq(recipientAddress);
  });

  it('Should close the payment channel when recipient execute close method', async () => {
    const transaction = await paymentChannelContract
      .connect(signers[1])
      .close(OWED_AMOUNT, paymentSignature);

    const receipt = await transaction.wait();

    const [contractBalBefore, senderBalBefore, recipientBalBefore] =
      receipt.logs[0].args;

    const [contractBaleAfter, senderBalAfter, recipientBalAfter] =
      receipt.logs[1].args;

    // @notice after closing the channel, all the contract balance will be faily distributed to the parties => contractBaleAfter should be 0
    //
    // @notice since the OWED_AMOUNT = 100000000, after closing the channel the recipient should receive 100000000 crypto units (i.e. OWED_AMOUNT)
    //
    // @notice since the OWED_AMOUNT = 100000000 and the INITIAL_FUND (i.e. contractBaleAfter) = 300000000 =>
    //          the left over, 300000000 - 100000000 = 200000000, will be transfered back to the sender (the channel funder)
    expect(contractBaleAfter).to.eq(0);
    expect(recipientBalAfter - recipientBalBefore).to.eq(OWED_AMOUNT);
    expect(senderBalAfter - senderBalBefore).to.eq(
      contractBalBefore - BigInt(OWED_AMOUNT)
    );
  });

  it('Shoud extend the expiration of the payment channel when caller is the sender', async () => {
    const currentExp = await paymentChannelContract.expiration();
    const newExp = Number(currentExp) + DURATION;

    // call .extend() by signers[0] (i.e. the sender)
    await (await paymentChannelContract.extend(newExp)).wait();

    const updatedExp = await paymentChannelContract.expiration();

    expect(updatedExp).to.eq(newExp);
    expect(updatedExp).to.not.eq(currentExp);
  });

  it('Should not extend the expiration of the payment channel when caller is NOT the sender', async () => {
    const currentExp = await paymentChannelContract.expiration();
    const newExp = Number(currentExp) + DURATION;

    // call .extend() by signers[1] (i.e. the recipient)
    expect(paymentChannelContract.connect(signers[1]).extend(newExp)).to.be
      .rejected;

    const updatedExp = await paymentChannelContract.expiration();

    // @notice as the caller is signers[1] who is not the sender => the .extend function will revert
    expect(updatedExp).to.eq(currentExp);
    expect(updatedExp).to.not.eq(newExp);
  });

  it('Should release back the fund balance stored in the contract to sender when the timeout is reached', async () => {
    const currentExp = await paymentChannelContract.expiration();
    let currentTimeStamp = (await ethers.provider.getBlock()).timestamp;

    while (currentTimeStamp < currentExp) {
      await new Promise((r) => setTimeout(r, 2000));
      currentTimeStamp = (await ethers.provider.getBlock()).timestamp;
    }

    await paymentChannelContract.claimTimeout();
    const contractBalance = await ethers.provider.getBalance(
      await paymentChannelContract.getAddress()
    );

    expect(contractBalance).to.eq(0);
  });
});
// Filename: test/solidity/payment-channel/helper.js
// SPDX-License-Identifier: Apache-2.0

const { ethers } = require('hardhat');

class PaymentChannelHelper {
  /**
   * @dev constructs a payment message
   *
   * @param contractAddress used to prevent cross-contract replay attacks
   *
   * @param amount specifies how much Hbar should be sent
   *
   * @return Keccak256 hash string
   */
  static constructPaymentMessage(contractAddress, amount) {
    return ethers.solidityPackedKeccak256(
      ['address', 'uint256'],
      [contractAddress, amount]
    );
  }

  /**
   * @dev sign the payment message
   *
   * @param signer signing account
   *
   * @param contractAddress used to prevent cross-contract replay attacks
   *
   * @param amount specifies how much Hbar should be sent
   *
   * @return 65 bytes signature
   */
  static async signPayment(signer, contractAddress, amount) {
    const message = this.constructPaymentMessage(contractAddress, amount);
    return await signer.signMessage(ethers.getBytes(message));
  }
}

module.exports = PaymentChannelHelper;
// Filename: test/solidity/precompiles/Precompiles.js
// SPDX-License-Identifier: Apache-2.0

const blake = require('blakejs');
const BN = require('bn.js');
const elliptic = require('elliptic');
const { ethers } = require('hardhat');
const { expect } = require('chai');
const Constants = require('../../constants');

function computeBlake2b(input) {
  const hash = blake.blake2b(input, null, 32); // 32 bytes = 256 bits
  return Buffer.from(hash).toString('hex');
}

describe('@solidityequiv3 Precompiles Support Test Suite', function () {
  let precompilesContract;
  const prime =
    '21888242871839275222246405745257275088696311157297823662689037894645226208583';

  const alt_bn128 = new elliptic.curve.short({
    p: new BN(prime),
    a: '0',
    b: '3',
    g: [new BN('1'), new BN('2')],
    n: new BN(
      '21888242871839275222246405745257275088548364400416034343698204186575808495617'
    ),
    h: '1',
  });

  before(async () => {
    const Precompiles = await ethers.getContractFactory(
      Constants.Contract.Precompiles
    );
    precompilesContract = await Precompiles.deploy();
  });

  it('Should verify the signer of a message using ecrecover', async function () {
    const UNSIGNED_MESSAGE = 'I agree to the terms';
    const walletSigner = ethers.Wallet.createRandom();
    const signedMessage = await walletSigner.signMessage(UNSIGNED_MESSAGE);
    const hashedMessage = ethers.hashMessage(UNSIGNED_MESSAGE);

    const splitMessage = ethers.Signature.from(signedMessage);

    const v = splitMessage.v;
    const r = splitMessage.r;
    const s = splitMessage.s;

    // Verify the signature using the contract
    const isVerifiedAddress = await precompilesContract.verifySignature(
      hashedMessage,
      v,
      r,
      s,
      walletSigner.address
    );
    expect(isVerifiedAddress).to.be.true;
  });

  it('Should return the correct SHA-256 hash', async function () {
    const crypto = require('crypto');
    const input = 'Hello future!';
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    const expectedHash = '0x' + hash;

    const result = await precompilesContract.computeSha256Hash(input);
    expect(result).to.equal(expectedHash);
  });

  it('Should return the correct RIPEMD-160 hash', async function () {
    const crypto = require('crypto');
    const input = 'Hello future!';
    const hash = crypto.createHash('ripemd160').update(input).digest('hex');
    const expectedHash = '0x' + hash;

    const result = await precompilesContract.computeRipemd160Hash(input);
    expect(result).to.equal(expectedHash);
  });

  it('Should return the same value as input', async function () {
    const inputValue = 12345;
    const result = await precompilesContract.getIdentity(inputValue);

    expect(result).to.equal(inputValue);
  });

  it('Should correctly compute modular exponentiation', async function () {
    const base = 3n;
    const exponent = 2n;
    const modulus = 5n;

    // Expected result: (3^2) % 5 = 9 % 5 = 4
    const expectedOutput = 4n;
    const result = await precompilesContract.modExp.staticCall(
      base,
      exponent,
      modulus
    );

    expect(result).to.equal(expectedOutput);
  });

  it('should add two elliptic curve points', async function () {
    // Get the base point (generator) of the curve
    const basePoint = alt_bn128.g;
    // check that all is well
    expect(alt_bn128.validate(basePoint)).to.be.true;

    // Get another point on the curve by multiplying the base point by 2
    const secondPoint = basePoint.mul(new BN('2'));
    // check that all is well
    expect(alt_bn128.validate(secondPoint)).to.be.true;

    const resPoint = basePoint.add(secondPoint);

    const base = [
      BigInt(basePoint.getX().toString()),
      BigInt(basePoint.getY().toString()),
    ];

    const second = [
      BigInt(secondPoint.getX().toString()),
      BigInt(secondPoint.getY().toString()),
    ];

    // check in contract that the second point is on the curve
    expect(await precompilesContract.isOnCurve(second, prime)).to.be.true;

    const result = await precompilesContract.ecAdd(base, second);

    expect(result[0]).to.equal(resPoint.getX());
    expect(result[1]).to.equal(resPoint.getY());
  });

  it('should correctly multiply a point on the curve by a scalar', async () => {
    // Define a point on the curve (for example, the generator/base point)
    const basePoint = alt_bn128.g; // This is the generator point of the curve

    // Get another point on the curve by multiplying the base point by 2
    const secondPoint = basePoint.mul(new BN('2'));
    // check that all is well
    expect(alt_bn128.validate(secondPoint)).to.be.true;

    // Define a scalar for multiplication
    const scalar = new BN('7');

    // Multiply the point by the scalar
    const resultPoint = secondPoint.mul(scalar);

    const result = await precompilesContract.ecMul.staticCall(
      [
        BigInt(secondPoint.getX().toString()),
        BigInt(secondPoint.getY().toString()),
      ],
      BigInt(scalar.toString()),
      BigInt(prime.toString())
    );

    expect(result[0]).to.equal(resultPoint.getX());
    expect(result[1]).to.equal(resultPoint.getY());
  });

  it('Should correctly compute the ecPairing check', async function () {
    // zkSNARK verification with the pairing check. EIP-197: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-197.md
    // Inputs are taken from circom's "Getting started" example using circom and snarkjs:  https://docs.circom.io/getting-started/installation/

    const pa = [
      '0x10e0c597f83b5955dea39d1070b715e52c102ddb7e3a00168b44be8bf7119f55',
      '0x11661888377b0b03f2bcc23b8a351c8f3d23aabc8dc8df65c41e5d21c974b7c2',
    ];
    const pb = [
      [
        '0x2cf266680cb145e28c214aa7942adb33928091b85ee6a7d0f54c94b6073b89d9',
        '0x0c27c439fc1fd3e02ab52f501d6667fa3d3e1187fafd5b2c0ac15f45e6fbeae9',
      ],
      [
        '0x0f2f9159625c763a41d9eda032e8333d34d8d33d241f040f56e168de8236146c',
        '0x18bcf1bf1212e5e13fea9a0f7a7a01a663782a018a8dfaf5d1cbed099d8f2c45',
      ],
    ];
    const pc = [
      '0x01c57619c684da393e699fe9399a537a5d8d103b55151af2d750c67502a206ce',
      '0x171fe18647a62dbdb54ccb4ba1171ca0210715575ebd51e0abc5a2b8d9411f0c',
    ];
    const pd = [
      '0x0000000000000000000000000000000000000000000000000000000000000021',
    ];

    const result = await precompilesContract.ecPairing(pa, pb, pc, pd);
    expect(result).to.be.true;
  });

  it('Should return the correct Blake2 hash', async function () {
    // data from EIP-152: https://eips.ethereum.org/EIPS/eip-152
    const rounds = 12;
    const h = [
      '0x48c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5',
      '0xd182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b',
    ];
    const m = [
      '0x6162630000000000000000000000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ];
    // const t = ["0x03000000", "0x00000000"]
    const t = ['0x0300000000000000', '0x0000000000000000'];

    const f = true;

    const result = await precompilesContract.blake2.staticCall(
      rounds,
      h,
      m,
      t,
      f
    );

    expect(result[0]).to.equal(
      '0xba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d1'
    );
    expect(result[1]).to.equal(
      '0x7d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923'
    );
  });
});
// Filename: test/solidity/reentrancy/reentrancy.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv3 Reentrancy Guard Test Suite', function () {
  const tenHBAR = ethers.parseEther('10.0');
  async function deployContractsAndSendHbars() {
    const factorySender = await ethers.getContractFactory(
      Constants.Contract.ReentrancyGuardTestSender
    );
    contractSender = await factorySender.deploy({ value: tenHBAR });
    const factoryReceiver = await ethers.getContractFactory(
      Constants.Contract.ReentrancyGuardTestReceiver
    );
    contractReceiver = await factoryReceiver.deploy(
      await contractSender.getAddress()
    );
  }

  it('should verify it reenters without guard', async function () {
    await deployContractsAndSendHbars();

    await (await contractReceiver.attack(Constants.GAS_LIMIT_1_000_000)).wait();
    const counter = await contractSender.counter();
    const receiverBalance = await ethers.provider.getBalance(
      await contractReceiver.getAddress()
    );
    const senderBalance = await ethers.provider.getBalance(
      await contractSender.getAddress()
    );

    expect(counter).to.eq(10);
    expect(senderBalance).to.eq(0);
    expect(receiverBalance).to.eq(tenHBAR);
  });

  it('should verify it cannot reenter with guard', async function () {
    await deployContractsAndSendHbars();

    await (await contractReceiver.setNonReentrant(true)).wait();
    await (await contractReceiver.attackNonReentrant()).wait();
    const counter = await contractSender.counter();

    const receiverBalance = await ethers.provider.getBalance(
      await contractReceiver.getAddress()
    );
    const senderBalance = await ethers.provider.getBalance(
      await contractSender.getAddress()
    );

    expect(counter).to.eq(1);
    expect(receiverBalance).to.eq(0);
    expect(senderBalance).to.eq(tenHBAR);
  });
});
// Filename: test/solidity/safe-remote-purchase/safe-remote-purchase.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { Contract } = require('../../constants');

const contractStates = {
  Created: 0,
  Locked: 1,
  Release: 2,
  Inactive: 3,
};
const tinybarToHbarCoef = 100_000_000;
const EVEN_NUMBER_PRICE = 1 * tinybarToHbarCoef;
async function setupContract() {
  const signers = await ethers.getSigners();
  const seller = signers[0];
  const buyer = signers[1];
  const factoryPurchase = await ethers.getContractFactory(Contract.Purchase);
  const contract = await factoryPurchase.deploy({
    value: EVEN_NUMBER_PRICE,
  });

  return {
    contract,
    seller,
    buyer,
    factoryPurchase,
  };
}

describe('@solidityequiv2 Safe remote purchase Test Suite', function () {
  let contract, factoryPurchase, seller, buyer;

  beforeEach(async function () {
    const setup = await setupContract();
    contract = setup.contract;
    factoryPurchase = setup.factoryPurchase;
    seller = setup.seller;
    buyer = setup.buyer;
  });

  it('should revert deployment', async function () {
    const cont = await factoryPurchase.deploy({
      value: ethers.parseEther('3.0') - 1n,
      gasLimit: 1000000,
    });

    const receipt = await cont.deploymentTransaction().wait();
    expect(receipt.logs[0].fragment.name).to.equal('MsgValue');
    expect(receipt.logs[1].fragment.name).to.equal('RevertCreationForOdd');
  });

  it('should Abort contract', async function () {
    await ethers.provider.getBalance(seller.address);
    await contract.value();
    const initialState = await contract.state();
    expect(initialState).to.equal(contractStates.Created);

    const trxAbort = await contract.abort();
    const receiptAbort = await trxAbort.wait();

    await ethers.provider.getBalance(seller.address);
    const finalState = await contract.state();

    expect(receiptAbort.logs[0].fragment.name).to.equal('Aborted');
    expect(finalState).to.equal(contractStates.Inactive);
  });

  describe('standard flow buyer -> seller tests: ', async function () {
    let contract, seller, buyer;

    before(async function () {
      const setup = await setupContract();
      contract = setup.contract;
      seller = setup.seller;
      buyer = setup.buyer;
    });

    it('should Confirm the purchase as buyer', async function () {
      const initialState = await contract.state();
      expect(initialState).to.equal(contractStates.Created);

      const trxConfirm = await contract
        .connect(buyer)
        .confirmPurchase({ value: 2 * EVEN_NUMBER_PRICE });
      const receiptConfirm = await trxConfirm.wait();

      expect(receiptConfirm.logs[0].fragment.name).to.equal(
        'PurchaseConfirmed'
      );
      const finalState = await contract.state();
      expect(finalState).to.equal(contractStates.Locked);
    });

    it('should confirm that purchase is Received', async function () {
      const initialState = await contract.state();
      expect(initialState).to.equal(contractStates.Locked);

      const trxConfirm = await contract.connect(buyer).confirmReceived();
      const receiptConfirm = await trxConfirm.wait(2);

      expect(receiptConfirm.logs[0].fragment.name).to.equal('ItemReceived');
      const finalState = await contract.state();
      expect(finalState).to.equal(contractStates.Release);
    });

    it('should confirm that seller can be refunded', async function () {
      const initialState = await contract.state();
      expect(initialState).to.equal(contractStates.Release);

      const trxRefund = await contract.connect(seller).refundSeller();
      const receiptRefund = await trxRefund.wait(2);

      expect(receiptRefund.logs[0].fragment.name).to.equal('SellerRefunded');
      const finalState = await contract.state();
      expect(finalState).to.equal(contractStates.Inactive);
    });
  });

  describe('test contract modifiers', async () => {
    it('should confirm onlyBuyer modifier', async function () {
      const trxConfirm = await contract
        .connect(buyer)
        .confirmPurchase({ value: 2 * EVEN_NUMBER_PRICE });
      await trxConfirm.wait();

      await expect(contract.connect(seller).confirmReceived.staticCall()).to
        .eventually.be.rejected;
      // .to.eventually.be.rejected.and.have.property('errorName', 'OnlyBuyer');
    });

    it('should confirm onlySeller modifier', async function () {
      await expect(contract.connect(buyer).abort.staticCall()).to.eventually.be
        .rejected;
      // .to.eventually.be.rejected.and.have.property('errorName', 'OnlySeller');
    });

    it('should confirm inState modifier', async function () {
      const trxConfirm = await contract
        .connect(buyer)
        .confirmPurchase({ value: 2 * EVEN_NUMBER_PRICE });
      await trxConfirm.wait();

      await expect(contract.connect(seller).abort.staticCall()).to.eventually.be
        .rejected;
      // .to.eventually.be.rejected.and.have.property(
      //   'errorName',
      //   'InvalidState'
      // );
    });

    it('should confirm condition modifier', async function () {
      await expect(
        contract
          .connect(buyer)
          .confirmPurchase.staticCall({ value: ethers.parseEther('3.0') })
      ).to.eventually.be.rejected;
    });
  });
});
// Filename: test/solidity/scoping/scoping.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv3 Scoping Test Suite', () => {
  let contract;

  before(async () => {
    const factory = await ethers.getContractFactory(Constants.Contract.Scoping);
    contract = await factory.deploy();
  });

  it('should verify the solidity functionality: "scoping"', async () => {
    await contract.minimalScoping();
    const resReassign = await contract.reassign();

    expect(resReassign).to.equal(2);
  });
});
// Filename: test/solidity/signature-example/ReceiverPays.js
// SPDX-License-Identifier: Apache-2.0
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv3 Signature Example ReceiverPays Test Suite', function () {
  let receiverPaysContract, signers, currentNonce, sender, receiver;

  before(async function () {
    signers = await ethers.getSigners();
    sender = signers[0];
    receiver = signers[1];
    ethers.provider = sender.provider;
    provider = ethers.provider;
    const factory = await ethers.getContractFactory(
      Constants.Path.RECEIVER_PAYS
    );
    const initialFund = ethers.parseEther('4');
    receiverPaysContract = await factory.deploy({
      gasLimit: 15000000,
      value: initialFund,
    });
    currentNonce = 0;
  });

  // claim payment
  it('receiver should be able to claim payment and pay for transaction fees', async function () {
    const recipientAddress = receiver.address;
    const contractBalanceBefore = await signers[0].provider.getBalance(
      await receiverPaysContract.getAddress()
    );
    // There is a discrepancy between the amount of decimals for 1 ETH and 1 HBAR. see the tinybar to wei coefficient of 10_000_000_000
    // it should be ethers.parseEther('1');
    const amountToTransfer = 100000000;

    // Generate signature for payment
    const signedPayment = await signPayment(
      recipientAddress,
      amountToTransfer,
      currentNonce,
      await receiverPaysContract.getAddress()
    );

    // Claim payment
    const contract = receiverPaysContract.connect(receiver);
    await contract.claimPayment(amountToTransfer, currentNonce, signedPayment);

    // Verify payment is received
    const contractBalanceAfter = await signers[0].provider.getBalance(
      await receiverPaysContract.getAddress()
    );

    expect(contractBalanceAfter).to.equal(
      contractBalanceBefore - ethers.parseEther('1')
    );

    currentNonce++;
  });

  // try to shutdown contract as receiver
  it('receiver should not be able to shutdown contract', async function () {
    const contract = receiverPaysContract.connect(receiver);
    expect(contract.shutdown()).to.eventually.be.rejected;
    // verify the contract still has balance
    const contractBalance = await signers[0].provider.getBalance(
      await receiverPaysContract.getAddress()
    );
    expect(contractBalance).to.be.gt(0);
  });

  // should be able to shutdown as sender
  it('sender should be able to shutdown contract', async function () {
    const contract = receiverPaysContract.connect(sender);
    await contract.shutdown();
    // verify contract is shutdown, contract should have no balance left
    const contractBalance = await signers[0].provider.getBalance(
      await receiverPaysContract.getAddress()
    );
    expect(contractBalance).to.be.equal(0);
  });

  async function signPayment(recipient, amount, nonce, contractAddress) {
    const hash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256', 'address'],
      [recipient, amount, nonce, contractAddress]
    );
    // Sign the hash
    const signature = await sender.signMessage(ethers.getBytes(hash));
    return signature;
  }
});
// Filename: test/solidity/simple-auction/simple-auction.js
// SPDX-License-Identifier: Apache-2.0
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const Utils = require('../../system-contracts/hedera-token-service/utils');
const { genericPoll } = require('../../../utils/helpers');

describe('@solidityequiv3 Simple Auction Test Suite', function () {
  let factory,
    signers,
    wallet,
    wallet1,
    contract,
    bidAmount,
    contractShortLived,
    bidAmountSmall,
    initialEvent;
  const CONTRACT_DURATION = 10000000000;
  const CONTRACT_SHORT_DURATION = 1;
  const TRANSACTION_VALUE = '1000';
  const TRANSACTION_VALUE_SMALL = '100';

  before(async function () {
    signers = await ethers.getSigners();
    wallet = signers[0];
    wallet1 = signers[1];

    factory = await ethers.getContractFactory(Constants.Contract.SimpleAuction);
    contractShortLived = await factory.deploy(
      CONTRACT_SHORT_DURATION,
      wallet1.address
    );

    bidAmount = ethers.parseUnits(TRANSACTION_VALUE, 'gwei');
    bidAmountSmall = ethers.parseUnits(TRANSACTION_VALUE_SMALL, 'gwei');
  });

  beforeEach(async function () {
    hasError = false;
    contract = await factory.deploy(CONTRACT_DURATION, wallet.address);

    const trx = await contract.bid({ value: bidAmountSmall });
    const receipt = await trx.wait(1);
    initialEvent = receipt.logs[0].fragment.name;
  });

  it('should confirm "bid" function works', async function () {
    const highestBid = await contract.highestBid();
    const highestBidder = await contract.highestBidder();

    expect(highestBid * BigInt(Utils.tinybarToWeibarCoef)).to.equal(
      bidAmountSmall
    );
    expect(highestBidder).to.equal(wallet.address);
    expect(initialEvent).to.equal('HighestBidIncreased');
  });

  it('should confirm bid not high enough scenario works: BidNotHighEnough', async function () {
    await expect(
      contract.bid.staticCall({ value: 1 })
    ).to.eventually.be.rejectedWith('BidNotHighEnough');
  });

  it('should revert a bid with "AuctionAlreadyEnded" error', async function () {
    await expect(
      contractShortLived.bid.staticCall({ value: bidAmountSmall })
    ).to.eventually.be.rejectedWith('AuctionAlreadyEnded');
  });

  it('should confirm "withdraw" function works', async function () {
    expect(initialEvent, 'Initial bid').to.equal('HighestBidIncreased');

    const initialHighestBidder = await contract.highestBidder();
    const previousContractBalance = await ethers.provider.getBalance(
      await contract.getAddress()
    );
    expect(
      previousContractBalance,
      `Initial Contract balance to be: ${bidAmountSmall}`
    ).to.equal(bidAmountSmall);
    expect(
      initialHighestBidder,
      `Initial Highest bidder to be: ${initialHighestBidder}`
    ).to.equal(wallet.address);

    const tr = await contract.connect(wallet1).bid({ value: bidAmount });
    await tr.wait(2);

    const newHighestBidder = await genericPoll(
      await contract.highestBidder(),
      (res) => res === wallet1.address,
      3000,
      'New Highest bidder to be: --Wallet1--'
    );
    expect(newHighestBidder, 'New Highest bidder to be: --Wallet1--').to.equal(
      wallet1.address
    );

    const currentContractBalance = await ethers.provider.getBalance(
      await contract.getAddress()
    );
    const combined = bidAmount + bidAmountSmall;
    expect(
      currentContractBalance,
      'The contract balance to be the combined of the two transactions'
    ).to.equal(combined);

    // Call the withdraw function with the previous highest bidder's address
    const withdrawTx = await contract.connect(wallet).withdraw();
    await withdrawTx.wait(2);

    // Check that the amount of Ether returned to the previous highest bidder is correct
    const newContractBalance = await genericPoll(
      ethers.provider.getBalance(await contract.getAddress()),
      (res) => res === bidAmount,
      3000,
      `The new balance to be: ${bidAmount}`
    );
    expect(newContractBalance, `The new balance to be: ${bidAmount}`).to.equal(
      bidAmount
    );
  });

  it('should confirm "auctionEnd" function works', async function () {
    expect(initialEvent, 'Initial bid').to.equal('HighestBidIncreased');
    const previousContractBalance = await ethers.provider.getBalance(
      await contract.getAddress()
    );
    expect(
      previousContractBalance,
      `Initial Contract balance to be: ${bidAmountSmall}`
    ).to.equal(bidAmountSmall);

    const tr = await contractShortLived.connect(wallet).auctionEnd();
    await tr.wait(2);

    const contractBalance = await genericPoll(
      ethers.provider.getBalance(await contract.getAddress()),
      (res) => res === bidAmountSmall,
      1000,
      `Contract balance after 'auctionEnd' to be: ${bidAmountSmall}`
    );
    expect(
      contractBalance,
      `Contract balance after "auctionEnd" to be: ${bidAmountSmall}`
    ).to.equal(bidAmountSmall);
  });
});
// Filename: test/solidity/transaction/transaction.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const Utils = require('../../system-contracts/hedera-token-service/utils');

describe('@solidityequiv3 Transaction Test Suite', function () {
  let contractTr, wallet, mfContract, senderWalletAddr;

  before(async function () {
    const factoryTrasnactionContract = await ethers.getContractFactory(
      Constants.Contract.Transaction
    );
    const factoryMfContract = await ethers.getContractFactory(
      Constants.Contract.MessageFrameAddresses
    );

    mfContract = await factoryMfContract.deploy();
    contractTr = await factoryTrasnactionContract.deploy(
      await mfContract.getAddress()
    );

    const signers = await ethers.getSigners();
    wallet = signers[0];
    senderWalletAddr = await wallet.getAddress();
  });

  it('gasleft() returns (uint256): remaining gas', async function () {
    const STARTING_GAS = 30000n;
    const gasLeft = await contractTr.checkGasleft({ gasLimit: STARTING_GAS });

    expect(gasLeft > 0n).to.be.true;
    expect(gasLeft < STARTING_GAS).to.be.true;
  });

  it('msg.data (bytes calldata): complete calldata', async function () {
    const myString = 'Hello, world!';
    const txRes = await contractTr.getMessageData(12, myString);
    const returnedData = txRes.data;

    const ABI = [
      'function getMessageData(uint integer, string memory inputMessage)',
    ];
    const interface = new ethers.Interface(ABI);
    const encodedFunction = interface.encodeFunctionData('getMessageData', [
      12,
      myString,
    ]);

    expect(returnedData).to.exist;
    expect(returnedData).to.be.equal(encodedFunction);
  });

  it('msg.sender (address): sender of the message (current call)', async function () {
    const sender = await contractTr.getMessageSender();

    expect(sender).to.exist;
    expect(sender).to.be.equal(senderWalletAddr);
  });

  it('msg.sig (bytes4): first four bytes of the calldata (i.e. function identifier)', async function () {
    const msgSig = await contractTr.getMessageSignature();

    const ABI = ['function getMessageSignature()'];
    const interface = new ethers.Interface(ABI);
    const encodedFunctionSig = interface.encodeFunctionData(
      'getMessageSignature'
    );

    expect(msgSig).to.exist;
    expect(msgSig).to.be.equal(encodedFunctionSig);
  });

  it('msg.value (uint): number of wei sent with the message', async function () {
    const valueToSend = ethers.parseEther(String(1));
    const txRes = await contractTr.getMessageValue({ value: valueToSend });
    const receipt = await txRes.wait();
    const amount = receipt.logs[0].args[0];
    ethers.formatEther(amount);

    // to compare with the value sent, we need to convert to tinybar
    expect(amount * BigInt(Utils.tinybarToWeibarCoef)).to.equal(valueToSend);
  });

  it('tx.gasprice (uint): gas price of the transaction', async function () {
    const gasPrice = await contractTr.getGasPrice();

    expect(gasPrice > 0n).to.be.true;
  });

  it('tx.origin (address): sender of the transaction (full call chain)', async function () {
    const originAddr = await contractTr.getTxOriginFromSecondary();
    const msgSender = await contractTr.getMsgSenderFromSecondary();

    expect(originAddr).to.exist;
    expect(msgSender).to.exist;
    expect(originAddr).to.be.equal(senderWalletAddr);
    expect(msgSender).to.be.equal(await contractTr.getAddress());
  });
});
// Filename: test/solidity/typeops/TypeOps.js
// SPDX-License-Identifier: Apache-2.0
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@solidityequiv3 TypeOps Test Suite', function () {
  let typeOpsContract;

  before(async function () {
    signers = await ethers.getSigners();
    provider = ethers.getDefaultProvider();
    const factory = await ethers.getContractFactory(Constants.Path.TYPE_OPS);
    typeOpsContract = await factory.deploy({ gasLimit: 15000000 });
  });

  // typeContractName
  it('retrieve contract name using Type name', async function () {
    const res = await typeOpsContract.typeContractName();
    expect(res).to.equal('TypeOps');
  });

  // typeContractCreationCode
  it('retrieve contract creation code using Type(Contract)', async function () {
    const expectedCreationCode =
      '0x608060405234801561001057600080fd5b5060fc8061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806345773e4e146037578063c3780a3a14606b575b600080fd5b604080518082018252600b81526a12195b1b1bc815dbdc9b1960aa1b60208201529051606291906079565b60405180910390f35b604051607b81526020016062565b60006020808352835180602085015260005b8181101560a557858101830151858201604001528201608b565b506000604082860101526040601f19601f830116850101925050509291505056fea26469706673582212204a430e336079bde856c4b5655a6be1f72be0df09de753e24a78dfd65962b9d9e64736f6c63430008170033';
    const res = await typeOpsContract.typeContractCreationCode();
    expect(res).to.equal(expectedCreationCode);
  });

  // typeContractRuntimeCode
  it('retrieve contract runtime code using Type(Contract)', async function () {
    const expectedRuntimeCode =
      '0x6080604052348015600f57600080fd5b506004361060325760003560e01c806345773e4e146037578063c3780a3a14606b575b600080fd5b604080518082018252600b81526a12195b1b1bc815dbdc9b1960aa1b60208201529051606291906079565b60405180910390f35b604051607b81526020016062565b60006020808352835180602085015260005b8181101560a557858101830151858201604001528201608b565b506000604082860101526040601f19601f830116850101925050509291505056fea26469706673582212204a430e336079bde856c4b5655a6be1f72be0df09de753e24a78dfd65962b9d9e64736f6c63430008170033';
    const res = await typeOpsContract.typeContractRuntimeCode();
    expect(res).to.equal(expectedRuntimeCode);
  });

  // typeInterfaceId
  it('retrieve contract interface id using Type(Contract)', async function () {
    const expectedInterfaceId = '0xc3780a3a';
    const res = await typeOpsContract.typeInterfaceId();
    expect(res).to.equal(expectedInterfaceId);
  });

  // typeIntegerMin
  it('retrieve contract integer min using Type(Integer)', async function () {
    const expectedIntegerMin =
      '-57896044618658097711785492504343953926634992332820282019728792003956564819968';
    const res = await typeOpsContract.typeIntegerMin();
    expect(res).to.equal(expectedIntegerMin);
  });

  // typeIntegerMax
  it('retrieve contract integer max using Type(Integer)', async function () {
    const expectedIntegerMax =
      '57896044618658097711785492504343953926634992332820282019728792003956564819967';
    const res = await typeOpsContract.typeIntegerMax();
    expect(res).to.equal(expectedIntegerMax);
  });

  // typeUintMin
  it('retrieve contract uint min using Type(Uint)', async function () {
    const expectedUintMin = '0';
    const res = await typeOpsContract.typeUintMin();
    expect(res).to.equal(expectedUintMin);
  });

  // typeUintMax
  it('retrieve contract uint max using Type(Uint)', async function () {
    const expectedUintMax =
      '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    const res = await typeOpsContract.typeUintMax();
    expect(res).to.equal(expectedUintMax);
  });
});
// Filename: test/solidity/units/cryptoUnits.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { WEI, GWEI, Contract } = require('../../constants');

describe('@solidityequiv3 Crypto Units Test Suite', function () {
  let contract;

  before(async function () {
    signers = await ethers.getSigners();

    const factory = await ethers.getContractFactory(Contract.CryptoUnits);
    contract = await factory.deploy();
  });

  it('confirm 1 wei == 1', async function () {
    const res = await contract.get1Wei();

    expect(res).to.equal(WEI);
  });

  it('confirm 1 gwei == 1e9', async function () {
    const res = await contract.get1GWei();

    expect(res).to.equal(GWEI);
  });

  it('confirm 1 ether == 1e18', async function () {
    const res = await contract.get1Eth();

    expect(res / BigInt(1e9)).to.equal(GWEI);
  });
});
// Filename: test/solidity/units/timeUnits.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  WEEK,
  Contract,
} = require('../../constants');

describe('@solidityequiv3 Time Units Test Suite', function () {
  let contract;

  before(async function () {
    signers = await ethers.getSigners();

    const factory = await ethers.getContractFactory(Contract.TimeUnits);
    contract = await factory.deploy();
  });

  it('confirm 1 == 1 seconds', async function () {
    const res = await contract.get1Second();

    expect(res).to.equal(SECOND);
  });

  it('confirm 1 minutes == 60 seconds', async function () {
    const res = await contract.get1Minute();

    expect(res).to.equal(MINUTE);
  });

  it('confirm 1 hours == 60 minutes', async function () {
    const res = await contract.get1Hour();

    expect(res).to.equal(HOUR);
  });

  it('confirm 1 days == 24 hours', async function () {
    const res = await contract.get1Day();

    expect(res).to.equal(DAY);
  });

  it('confirm 1 weeks == 7 days', async function () {
    const res = await contract.get1Week();

    expect(res).to.equal(WEEK);
  });
});
// Filename: test/solidity/voting/Ballot.js
// SPDX-License-Identifier: Apache-2.0
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

/**
 * @notice This specific test suite necessitates the presence of 6 accounts for completion.
 * @notice Ensure that you include 6 private keys in the .env file under the `PRIVATE_KEYS` variable.
 */

describe('@solidityequiv3 Ballot Units Test Suite', function () {
  let ballotContract, owner, addressB, addressC, addressD, addressE, addrs;

  beforeEach(async function () {
    const Ballot = await ethers.getContractFactory(Constants.Contract.Ballot);
    const proposalBytes = ['proposal1', 'proposal2', 'proposal3'].map(
      (proposal) => ethers.encodeBytes32String(proposal)
    );
    ballotContract = await Ballot.deploy(proposalBytes);
    [owner, addressB, addressC, addressD, addressE, addressF, ...addrs] =
      await ethers.getSigners();
  });

  it('Should have the correct chairperson', async function () {
    const chairperson = await ballotContract.chairperson();
    expect(chairperson).to.equal(owner.address);
  });

  it('Should give voting rights', async function () {
    const tx = await ballotContract.giveRightToVote(addressB.address);
    await tx.wait();
    const voter = await ballotContract.voters(addressB.address);
    expect(voter.weight).to.equal(1);
  });

  it('Should allow a voter to delegate their vote', async function () {
    const giveRightToVoteTx = await ballotContract.giveRightToVote(
      addressB.address
    );
    await giveRightToVoteTx.wait();

    const delegateTx = await ballotContract
      .connect(addressB)
      .delegate(owner.address);
    await delegateTx.wait();

    const ownerVoter = await ballotContract.voters(owner.address);
    expect(ownerVoter.weight).to.equal(2); // 1 (original) + 1 (delegated)
  });

  it('Should allow voting for a proposal', async function () {
    const giveRightToVoteTx = await ballotContract.giveRightToVote(
      addressB.address
    );
    await giveRightToVoteTx.wait();

    const voteTx = await ballotContract.connect(addressB).vote(1); // voting for proposal2
    await voteTx.wait();

    const proposal = await ballotContract.proposals(1);
    expect(proposal.voteCount).to.equal(1);
  });

  it('Should correctly determine the winning proposal', async function () {
    await ballotContract.giveRightToVote(addressB.address);
    await ballotContract.connect(addressB).vote(1); // voting for proposal2

    await ballotContract.giveRightToVote(addressC.address);
    await ballotContract.connect(addressC).vote(1); // voting for proposal2

    await ballotContract.giveRightToVote(addressD.address);
    await ballotContract.connect(addressD).vote(2); // voting for proposal3

    await ballotContract.giveRightToVote(addressE.address);
    await ballotContract.connect(addressE).vote(0); // voting for proposal1

    const winningProposalId = await ballotContract.winningProposal();
    expect(winningProposalId).to.equal(1);
  });
});
// Filename: test/state-registry/ercStateTest.js
// SPDX-License-Identifier: Apache-2.0

const fs = require('fs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../constants');

const STATE_OBJECT_DIR = './test/state-registry/ercStates.json';

describe('@migration ERCs State Tests', function () {
  const tokenId1 = 3;
  const tokenId2 = 6;
  const token1InitialMint = 300;
  const token2InitialMint = 600;
  const initAmount = 900;
  const amount = 3;

  describe('@pre-migration', () => {
    let signers;
    let erc20;
    let erc721;
    let erc1155;
    let statesObject = {};

    before(async function () {
      signers = await ethers.getSigners();

      const erc20Factory = await ethers.getContractFactory(
        Constants.Contract.OZERC20Mock
      );
      erc20 = await erc20Factory.deploy(
        Constants.TOKEN_NAME,
        Constants.TOKEN_SYMBOL
      );
      await (await erc20.mint(signers[0].address, initAmount)).wait();

      const erc721Factory = await ethers.getContractFactory(
        Constants.Contract.OZERC721Mock
      );
      erc721 = await erc721Factory.deploy(
        Constants.TOKEN_NAME,
        Constants.TOKEN_SYMBOL
      );
      await (await erc721.mint(signers[0].address, tokenId1)).wait();

      const erc1155Factory = await ethers.getContractFactory(
        Constants.Contract.ERC1155Mock
      );

      erc1155 = await erc1155Factory.deploy(Constants.TOKEN_URL);
      await (
        await erc1155.mintBatch(
          signers[0].address,
          [tokenId1, tokenId2],
          [token1InitialMint, token2InitialMint],
          '0x'
        )
      ).wait();

      statesObject['erc_20_token_address'] = erc20.target;
      statesObject['erc_721_token_address'] = erc721.target;
      statesObject['erc_1155_token_address'] = erc1155.target;
    });

    after(async () => {
      fs.writeFileSync(STATE_OBJECT_DIR, JSON.stringify(statesObject));
    });

    it('should be able to execute basic erc20 functions', async function () {
      const name = await erc20.name();
      expect(name).to.equal(Constants.TOKEN_NAME);
      const symbol = await erc20.symbol();
      expect(symbol).to.equal(Constants.TOKEN_SYMBOL);
      const decimals = Number(await erc20.decimals());
      expect(decimals).to.equal(18);
      const totalSupply = Number(await erc20.totalSupply());
      expect(totalSupply).to.equal(initAmount);
      let signer0balance = await erc20.balanceOf(signers[0].address);
      expect(signer0balance).to.equal(initAmount);
      let signer1balance = await erc20.balanceOf(signers[1].address);
      expect(signer1balance).to.equal(0);
      await (await erc20.approve(await erc20.getAddress(), amount)).wait();
      const allowance = Number(
        await erc20.allowance(signers[0].address, await erc20.getAddress())
      );
      expect(allowance).to.eq(amount);

      await (await erc20.transfer(signers[1].address, amount)).wait();
      signer0balance = Number(await erc20.balanceOf(signers[0].address));
      signer1balance = Number(await erc20.balanceOf(signers[1].address));
      expect(signer0balance).to.eq(initAmount - amount);
      expect(signer1balance).to.eq(amount);

      statesObject['erc_20_states'] = {
        name,
        symbol,
        decimals,
        totalSupply,
        balances: {
          [signers[0].address]: signer0balance,
          [signers[1].address]: signer1balance,
        },
        allowance,
      };
    });

    it('should be able to execute basic erc721 functions', async function () {
      const name = await erc721.name();
      expect(name).to.equal(Constants.TOKEN_NAME);
      const symbol = await erc721.symbol();
      expect(symbol).to.equal(Constants.TOKEN_SYMBOL);
      let signer0Balance = await erc721.balanceOf(signers[0].address);
      expect(signer0Balance).to.eq(1);
      let signer1Balance = await erc721.balanceOf(signers[1].address);
      expect(signer1Balance).to.eq(0);
      let ownerOfToken = await erc721.ownerOf(tokenId1);
      expect(ownerOfToken).to.eq(signers[0].address);

      await (await erc721.approve(signers[1].address, tokenId1)).wait();
      let getApproved = await erc721.getApproved(tokenId1);
      expect(getApproved).to.eq(signers[1].address);
      await (await erc721.setApprovalForAll(signers[1].address, true)).wait();
      const isApprovedForAll = await erc721.isApprovedForAll(
        signers[0].address,
        signers[1].address
      );
      expect(isApprovedForAll).to.eq(true);

      await (
        await erc721.transferFrom(
          signers[0].address,
          signers[1].address,
          tokenId1
        )
      ).wait();

      signer0Balance = Number(await erc721.balanceOf(signers[0].address));
      signer1Balance = Number(await erc721.balanceOf(signers[1].address));
      expect(signer0Balance).to.eq(0);
      expect(signer1Balance).to.eq(1);

      ownerOfToken = await erc721.ownerOf(tokenId1);
      expect(ownerOfToken).to.eq(signers[1].address);

      statesObject['erc_721_states'] = {
        name,
        symbol,
        balances: {
          [signers[0].address]: signer0Balance,
          [signers[1].address]: signer1Balance,
        },
        ownerOf: {
          [tokenId1]: ownerOfToken,
        },
        isApprovedForAll,
      };
    });

    it('should be able to execute basic erc1155 functions', async function () {
      const tokenId1Uri = await erc1155.uri(tokenId1);
      const tokenId2Uri = await erc1155.uri(tokenId2);
      expect(tokenId1Uri).to.eq(tokenId2Uri);
      const signer0TokenId1Balance = Number(
        await erc1155.balanceOf(signers[0].address, tokenId1)
      );
      expect(signer0TokenId1Balance).to.eq(token1InitialMint);
      const signer0TokenId2Balance = Number(
        await erc1155.balanceOf(signers[0].address, tokenId2)
      );
      expect(signer0TokenId2Balance).to.eq(token2InitialMint);
      await (await erc1155.setApprovalForAll(signers[1].address, true)).wait();
      const isApprovedForAll = await erc1155.isApprovedForAll(
        signers[0].address,
        signers[1].address
      );
      expect(isApprovedForAll).to.eq(true);

      statesObject['erc_1155_states'] = {
        uri: {
          [tokenId1]: tokenId1Uri,
          [tokenId2]: tokenId2Uri,
        },
        balances: {
          [signers[0].address]: {
            [tokenId1]: signer0TokenId1Balance,
            [tokenId2]: signer0TokenId2Balance,
          },
        },
        isApprovedForAll,
      };
    });
  });

  describe('@post-migration-view-functions States Comparison', () => {
    let signers;
    let erc20;
    let erc721;
    let erc1155;
    let statesObject = {};

    before(async function () {
      signers = await ethers.getSigners();
      statesObject = JSON.parse(fs.readFileSync(STATE_OBJECT_DIR));

      erc20 = await ethers.getContractAt(
        Constants.Contract.OZERC20Mock,
        statesObject['erc_20_token_address']
      );

      erc721 = await ethers.getContractAt(
        Constants.Contract.OZERC721Mock,
        statesObject['erc_721_token_address']
      );

      erc1155 = await ethers.getContractAt(
        Constants.Contract.ERC1155Mock,
        statesObject['erc_1155_token_address']
      );
    });

    const erc20States = [
      'name',
      'symbol',
      'decimals',
      'totalSupply',
      'balances',
      'allowance',
    ];

    for (const state of erc20States) {
      it(`Should compare ${state} erc20 contract storage states`, async () => {
        switch (state) {
          case 'balances':
            const monoBalancSigner0eState =
              statesObject['erc_20_states'][state][signers[0].address];
            const monoBalancSigner1eState =
              statesObject['erc_20_states'][state][signers[1].address];

            const modBalancSigner0eState = await erc20.balanceOf(
              signers[0].address
            );
            const modBalancSigner1eState = await erc20.balanceOf(
              signers[1].address
            );

            expect(modBalancSigner0eState).to.eq(monoBalancSigner0eState);
            expect(modBalancSigner1eState).to.eq(monoBalancSigner1eState);

            break;
          case 'allowance':
            const monoAllowance = statesObject['erc_20_states'][state];
            const modAllowance = await erc20.allowance(
              signers[0].address,
              await erc20.getAddress()
            );

            expect(modAllowance).to.eq(monoAllowance);
            break;
          default:
            const monoState = statesObject['erc_20_states'][state];
            const modState = await erc20[state]();
            expect(modState).to.eq(monoState);
        }
      });
    }

    const erc721States = [
      'name',
      'symbol',
      'balances',
      'ownerOf',
      'isApprovedForAll',
    ];
    for (const state of erc721States) {
      it(`Should compare ${state} erc721 contract storage states`, async () => {
        switch (state) {
          case 'balances':
            const monoBalancSigner0eState =
              statesObject['erc_721_states'][state][signers[0].address];
            const monoBalancSigner1eState =
              statesObject['erc_721_states'][state][signers[1].address];

            const modBalancSigner0eState = await erc721.balanceOf(
              signers[0].address
            );
            const modBalancSigner1eState = await erc721.balanceOf(
              signers[1].address
            );

            expect(modBalancSigner0eState).to.eq(monoBalancSigner0eState);
            expect(modBalancSigner1eState).to.eq(monoBalancSigner1eState);

            break;
          case 'ownerOf':
            const monoOwnerOf = statesObject['erc_721_states'][state][tokenId1];
            const modOwnerOf = await erc721[state](tokenId1);
            expect(modOwnerOf).to.eq(monoOwnerOf);
            break;

          case 'isApprovedForAll':
            const monoIsApprovedForAll = statesObject['erc_721_states'][state];
            const modIsApprovedForAll = await erc721.isApprovedForAll(
              signers[0].address,
              signers[1].address
            );
            expect(modIsApprovedForAll).to.eq(monoIsApprovedForAll);

            break;
          default:
            const monoState = statesObject['erc_721_states'][state];
            const modState = await erc721[state]();
            expect(modState).to.eq(monoState);
        }
      });
    }

    const erc1155States = ['uri', 'balances', 'isApprovedForAll'];
    for (const state of erc1155States) {
      it(`Should compare ${state} erc1155 contract storage states`, async () => {
        switch (state) {
          case 'uri':
            const monoTokenId1Uri =
              statesObject['erc_1155_states'][state][tokenId1];
            const monoTokenId2Uri =
              statesObject['erc_1155_states'][state][tokenId2];
            const modTokenId1Uri = await erc1155.uri(tokenId1);
            const modTokenId2Uri = await erc1155.uri(tokenId2);

            expect(monoTokenId1Uri)
              .to.eq(monoTokenId2Uri)
              .to.eq(modTokenId1Uri)
              .to.eq(modTokenId2Uri);

            break;

          case 'balances':
            const monoTokenId1BalancSigner0State =
              statesObject['erc_1155_states'][state][signers[0].address][
                tokenId1
              ];
            const monoTokenId2BalancSigner0State =
              statesObject['erc_1155_states'][state][signers[0].address][
                tokenId2
              ];

            const modTokenId1BalancSigner0State = await erc1155.balanceOf(
              signers[0].address,
              tokenId1
            );
            const modTokenId2BalancSigner0State = await erc1155.balanceOf(
              signers[0].address,
              tokenId2
            );

            expect(monoTokenId1BalancSigner0State).to.eq(
              modTokenId1BalancSigner0State
            );
            expect(monoTokenId2BalancSigner0State).to.eq(
              modTokenId2BalancSigner0State
            );

            break;

          case 'isApprovedForAll':
            const monoIsApprovedForAll = statesObject['erc_1155_states'][state];
            const modIsApprovedForAll = await erc1155.isApprovedForAll(
              signers[0].address,
              signers[1].address
            );
            expect(modIsApprovedForAll).to.eq(monoIsApprovedForAll);

            break;
        }
      });
    }
  });
});
// Filename: test/state-registry/stateRegistry.js
// SPDX-License-Identifier: Apache-2.0

const fs = require('fs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../constants');

const getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const serializeSmartContractResponse = (arr) => {
  return JSON.stringify(arr, (_, value) => {
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return value;
  });
};

const STATE_OBJECT_DIR = './test/state-registry/states.json';

describe('@migration States Tests', () => {
  describe('@pre-migration', () => {
    const ITERATIONS = 1;
    let contract;
    let statesObject = {};

    before(async function () {
      signers = await ethers.getSigners();

      const contractFactory = await ethers.getContractFactory(
        Constants.Contract.StateRegistry
      );
      contract = await contractFactory.deploy();
      statesObject['contract_address'] = contract.target;
      statesObject[`Balance`] = [];
    });

    after(async () => {
      const contractStorageStateHash =
        await contract.getContractStorageStateHash();
      statesObject['monoStateHash'] = contractStorageStateHash;

      fs.writeFileSync(STATE_OBJECT_DIR, JSON.stringify(statesObject));
    });

    for (let i = 0; i < ITERATIONS; i++) {
      describe('should test value types', async function () {
        it('should test bool', async function () {
          const randomBool = getRandomInt(0, 1) > 0;

          const tx = await contract.setVarBool(randomBool);
          await tx.wait();

          const resp = await contract.getVarBool();
          statesObject['VarBool'] = resp;

          expect(resp).equal(randomBool);
        });

        const numTypes = [
          'Uint8',
          'Uint16',
          'Uint32',
          'Uint64',
          'Uint128',
          'Uint256',
          'Int8',
          'Int16',
          'Int32',
          'Int64',
          'Int128',
          'Int256',
        ];
        for (let i in numTypes) {
          it('should update ' + numTypes[i], async function () {
            const beforeInt = await contract[`getVar${numTypes[i]}`]();
            const randomInt = BigInt(getRandomInt(1, 3));

            const tx = await contract[`setVar${numTypes[i]}`](
              beforeInt + randomInt
            );
            await tx.wait();

            const resp = await contract[`getVar${numTypes[i]}`]();
            statesObject[`Var${numTypes[i]}`] = Number(resp);
            expect(resp).equal(beforeInt + randomInt);
          });
        }

        it('should test address', async function () {
          const randomAddress = ethers.Wallet.createRandom().address;

          const tx = await contract.setVarAddress(randomAddress);
          await tx.wait();

          const resp = await contract.getVarAddress();
          statesObject[`VarAddress`] = resp;
          expect(resp).equal(randomAddress);
        });

        it('should test ContractType', async function () {
          const tx = await contract.setVarContractType();
          await tx.wait();

          const resp = await contract.getVarContractType();
          statesObject[`VarContractType`] = resp;
          expect(resp).to.not.be.null;
          expect(resp).to.not.equal('0x');
        });

        it('should test bytes32', async function () {
          const randomBytes32 = Buffer.alloc(32, getRandomInt(1, 5644));
          const tx = await contract.setVarBytes32(randomBytes32);
          await tx.wait();

          const resp = await contract.getVarBytes32();
          statesObject[`VarBytes32`] = resp;
          expect(resp).to.equal('0x' + randomBytes32.toString('hex'));
        });

        it('should test string', async function () {
          const randomString = (Math.random() + 1).toString(36);
          const tx = await contract.setVarString(randomString);
          await tx.wait();

          const resp = await contract.getVarString();
          statesObject[`VarString`] = resp;
          expect(resp).to.equal(randomString);
        });

        it('should test enum', async function () {
          const randomEnum = getRandomInt(0, 3);
          const tx = await contract.setVarEnum(randomEnum);
          await tx.wait();

          const resp = await contract.getVarEnum();
          statesObject[`VarEnum`] = Number(resp);
          expect(resp).to.equal(randomEnum);
        });

        it('should test mapping K/V object', async function () {
          const randomAddress = ethers.Wallet.createRandom().address;
          const randomValue = getRandomInt(0, 100);

          const tx = await contract.setBalance(randomAddress, randomValue);
          await tx.wait();

          const resp = await contract.balanceOf(randomAddress);
          statesObject[`Balance`].push({
            address: randomAddress,
            value: randomValue,
          });
          expect(resp).equal(randomValue);
        });

        it('should test delete K/V object', async () => {
          const randomAddress = ethers.Wallet.createRandom().address;
          const randomValue = getRandomInt(0, 100);
          const tx = await contract.setBalance(randomAddress, randomValue);
          await tx.wait();

          const resp = await contract.balanceOf(randomAddress);
          expect(resp).equal(randomValue);

          const deleteTx = await contract.deleteBalance(randomAddress);
          await deleteTx.wait();
          const deletedBalance = await contract.balanceOf(randomAddress);
          expect(deletedBalance).equal(0n);
          statesObject[`Balance`].push({
            address: randomAddress,
            value: Number(deletedBalance),
          });
        });
      });

      describe('should test reference types', async function () {
        it('should test data allocation', async function () {
          for (let i = 0; i < 2; i++) {
            const randomArr = [
              getRandomInt(1, 1000),
              getRandomInt(1, 1000),
              getRandomInt(1, 1000),
              getRandomInt(1, 1000),
            ];

            const tx = await contract.setVarIntArrDataAlloc(randomArr);
            await tx.wait();

            const resp = (await contract.getVarIntArrDataAlloc()).toArray();
            statesObject[`VarIntArrDataAlloc`] =
              serializeSmartContractResponse(resp);

            const expected = randomArr.slice(0, 3);
            const resp0 = resp[0].toArray().map((n) => Number(n));
            const resp1 = resp[1].toArray().map((n) => Number(n));
            expect(JSON.stringify(expected)).equal(JSON.stringify(resp0));
            expect(JSON.stringify(expected)).equal(JSON.stringify(resp1));
          }
        });

        it('Should delete data allocation', async () => {
          for (let i = 0; i < 2; i++) {
            const randomArr = [
              getRandomInt(1, 1000),
              getRandomInt(1, 1000),
              getRandomInt(1, 1000),
              getRandomInt(1, 1000),
            ];

            const tx = await contract.setVarIntArrDataAllocDeleted(randomArr);
            await tx.wait();

            const resp = (
              await contract.getVarIntArrDataAllocDeleted()
            ).toArray();
            expect(resp).to.deep.eq(randomArr);

            const deleteTx = await contract.deleteVarIntArrDataAllocDeleted();
            await deleteTx.wait();

            const deletedResp = (
              await contract.getVarIntArrDataAllocDeleted()
            ).toArray();
            statesObject['VarIntArrDataAllocDeleted'] = deletedResp;
            expect(deletedResp.length).to.eq(0);
          }
        });

        it('should test string concat', async function () {
          for (let i = 0; i < 2; i++) {
            const fetchedInit = await contract.getVarStringConcat();

            const randomString1 = (Math.random() + 1)
              .toString(36)
              .substring(0, 4);
            const tx1 = await contract.setVarStringConcat(randomString1);
            await tx1.wait();

            const randomString2 = (Math.random() + 1)
              .toString(36)
              .substring(0, 4);
            const tx2 = await contract.setVarStringConcat(randomString2);
            await tx2.wait();

            const fetchedFinal = await contract.getVarStringConcat();
            statesObject[`VarStringConcat`] = fetchedFinal;
            expect(fetchedFinal).equal(
              fetchedInit + randomString1 + randomString2
            );
          }
        });

        it('Should delete string concat', async () => {
          for (let i = 0; i < 2; i++) {
            const fetchedInit = await contract.getVarStringConcatDeleted();

            const randomString1 = (Math.random() + 1)
              .toString(36)
              .substring(0, 4);
            const tx1 = await contract.setVarStringConcatDeleted(randomString1);
            await tx1.wait();

            const randomString2 = (Math.random() + 1)
              .toString(36)
              .substring(0, 4);
            const tx2 = await contract.setVarStringConcatDeleted(randomString2);
            await tx2.wait();

            const fetchedFinal = await contract.getVarStringConcatDeleted();
            expect(fetchedFinal).equal(
              fetchedInit + randomString1 + randomString2
            );

            const txDelete = await contract.deleteVarStringConcatDeleted();
            await txDelete.wait();

            const deletedString = await contract.getVarStringConcatDeleted();
            statesObject[`VarStringConcatDeleted`] = deletedString;
          }
        });

        it('should test contract struct', async function () {
          for (let i = 0; i < 2; i++) {
            const initStruct = await contract.getVarContractStruct();

            const struct = {
              varUint256: initStruct[0] + BigInt(getRandomInt(1, 100)),
              varAddress: ethers.Wallet.createRandom().address,
              varBytes32: Buffer.alloc(32, getRandomInt(1, 5644)),
              varString: (Math.random() + 1).toString(36).substring(0, 4),
              varContractType: getRandomInt(0, 3),
              varUint256Arr: [
                ...initStruct[5].map((e) => Number(e)),
                getRandomInt(1, 100),
                getRandomInt(1, 100),
              ],
              varStringConcat:
                initStruct[6] +
                (Math.random() + 1).toString(36).substring(0, 4),
            };

            const tx1 = await contract.setVarContractStruct(struct);
            await tx1.wait();

            const resp1 = await contract.getVarContractStruct();

            expect(resp1[0]).equal(struct.varUint256);
            expect(resp1[1]).equal(struct.varAddress);
            expect(resp1[2]).equal('0x' + struct.varBytes32.toString('hex'));
            expect(resp1[3]).equal(struct.varString);
            expect(resp1[4]).equal(struct.varContractType);
            expect(
              JSON.stringify(resp1[5].toArray().map((e) => Number(e)))
            ).equal(JSON.stringify(struct.varUint256Arr));
            expect(resp1[6]).equal(struct.varStringConcat);

            const updatedStruct = {
              varUint256: resp1[0] + BigInt(getRandomInt(1, 100)),
              varAddress: ethers.Wallet.createRandom().address,
              varBytes32: Buffer.alloc(32, getRandomInt(1, 5644)),
              varString: (Math.random() + 1).toString(36).substring(0, 4),
              varContractType: getRandomInt(0, 3),
              varUint256Arr: [
                ...resp1[5].toArray().map((e) => Number(e)),
                getRandomInt(1, 100),
                getRandomInt(1, 100),
              ],
              varStringConcat:
                resp1[6] + (Math.random() + 1).toString(36).substring(0, 4),
            };

            const tx2 = await contract.setVarContractStruct(updatedStruct);
            await tx2.wait();

            const resp2 = await contract.getVarContractStruct();
            statesObject[`VarContractStruct`] =
              serializeSmartContractResponse(resp2);

            expect(resp2[0]).equal(updatedStruct.varUint256);
            expect(resp2[1]).equal(updatedStruct.varAddress);
            expect(resp2[2]).equal(
              '0x' + updatedStruct.varBytes32.toString('hex')
            );
            expect(resp2[3]).equal(updatedStruct.varString);
            expect(resp2[4]).equal(updatedStruct.varContractType);
            expect(
              JSON.stringify(resp2[5].toArray().map((e) => Number(e)))
            ).equal(JSON.stringify(updatedStruct.varUint256Arr));
            expect(resp2[6]).equal(updatedStruct.varStringConcat);
          }
        });

        it('should delete contract struct', async () => {
          for (let i = 0; i < 2; i++) {
            const initStruct = await contract.getVarContractStructDeleted();

            const struct = {
              varUint256: initStruct[0] + BigInt(getRandomInt(1, 100)),
              varAddress: ethers.Wallet.createRandom().address,
              varBytes32: Buffer.alloc(32, getRandomInt(1, 5644)),
              varString: (Math.random() + 1).toString(36).substring(0, 4),
              varContractType: getRandomInt(0, 3),
              varUint256Arr: [
                ...initStruct[5].map((e) => Number(e)),
                getRandomInt(1, 100),
                getRandomInt(1, 100),
              ],
              varStringConcat:
                initStruct[6] +
                (Math.random() + 1).toString(36).substring(0, 4),
            };

            const tx1 = await contract.setVarContractStructDeleted(struct);
            await tx1.wait();

            const resp1 = await contract.getVarContractStructDeleted();

            expect(resp1[0]).equal(struct.varUint256);
            expect(resp1[1]).equal(struct.varAddress);
            expect(resp1[2]).equal('0x' + struct.varBytes32.toString('hex'));
            expect(resp1[3]).equal(struct.varString);
            expect(resp1[4]).equal(struct.varContractType);
            expect(
              JSON.stringify(resp1[5].toArray().map((e) => Number(e)))
            ).equal(JSON.stringify(struct.varUint256Arr));
            expect(resp1[6]).equal(struct.varStringConcat);

            const deleteTx = await contract.deleteVarContractStructDeleted();
            await deleteTx.wait();

            const deletedResp = await contract.getVarContractStructDeleted();
            statesObject[`VarContractStructDeleted`] =
              serializeSmartContractResponse(deletedResp);

            expect(deletedResp[0]).equal(0);
            expect(deletedResp[1]).equal(
              '0x0000000000000000000000000000000000000000'
            );
            expect(deletedResp[2]).equal(
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            );
            expect(deletedResp[3]).equal('');
            expect(deletedResp[4]).equal(0);
            expect(deletedResp[5].toArray()).deep.equal([]);
            expect(deletedResp[6]).equal('');
          }
        });
      });
    }
  });

  describe('@post-migration', () => {
    describe('@post-migration-view-functions States Comparison', () => {
      let statesObject, contract;
      const OBJECT_KEYS = [
        'VarBool',
        'VarUint8',
        'VarUint16',
        'VarUint32',
        'VarUint64',
        'VarUint128',
        'VarUint256',
        'VarInt8',
        'VarInt16',
        'VarInt32',
        'VarInt64',
        'VarInt128',
        'VarInt256',
        'VarAddress',
        'VarContractType',
        'VarBytes32',
        'VarString',
        'VarEnum',
        'Balance',
        'VarIntArrDataAlloc',
        'VarIntArrDataAllocDeleted',
        'VarStringConcat',
        'VarStringConcatDeleted',
        'VarContractStruct',
        'VarContractStructDeleted',
      ];
      before(async () => {
        statesObject = JSON.parse(fs.readFileSync(STATE_OBJECT_DIR));
        contract = await ethers.getContractAt(
          Constants.Contract.StateRegistry,
          statesObject['contract_address']
        );
      });

      it('validates states', () => {
        OBJECT_KEYS.forEach((key) => {
          expect(Object.hasOwn(statesObject, key));
        });

        expect(contract.target).to.eq(statesObject['contract_address']);
      });

      it('should compare contract storage states', async () => {
        const monoStateHash = statesObject['monoStateHash'];
        const modStateHash = await contract.getContractStorageStateHash();

        // @logic: modStateHash is supposed to exactly equal monoStateHash.
        //        In the case of the hashes are mismatched, compare each state for debugging purpose.
        try {
          expect(modStateHash).to.eq(monoStateHash);
        } catch (error) {
          if (error) {
            for (const key of OBJECT_KEYS) {
              try {
                switch (key) {
                  case 'VarIntArrDataAlloc':
                    const intArr = await contract[`get${key}`]();
                    expect(serializeSmartContractResponse(intArr)).to.eq(
                      statesObject[key]
                    );
                    break;
                  case 'VarIntArrDataAllocDeleted':
                    const deletedArr = await contract[`get${key}`]();
                    expect(deletedArr.toArray()).to.deep.eq(statesObject[key]);
                    break;
                  case 'Balance':
                    const balances = statesObject[key];
                    for (const balance of balances) {
                      const accountAddr = balance['address'];
                      const value = await contract.balanceOf(accountAddr);
                      expect(value).to.eq(balance['value']);
                    }

                    break;
                  case 'VarContractStruct':
                  case 'VarContractStructDeleted':
                    const varContractStruct = await contract[`get${key}`]();
                    expect(
                      serializeSmartContractResponse(varContractStruct)
                    ).to.eq(statesObject[key]);
                    break;

                  default:
                    const resp = await contract[`get${key}`]();
                    expect(resp).to.eq(statesObject[key]);
                }
              } catch (error) {
                console.log(`State Failure at state = ${key}`);
                console.log(error);
              }
            }

            expect(false).to.be.true;
          }
        }
      });
    });

    describe('@post-migration-non-view-functions States Update', () => {
      const ITERATIONS = 1;
      let statesObject, contract;

      before(async () => {
        statesObject = JSON.parse(fs.readFileSync(STATE_OBJECT_DIR));
        contract = await ethers.getContractAt(
          Constants.Contract.StateRegistry,
          statesObject['contract_address']
        );
      });

      for (let i = 0; i < ITERATIONS; i++) {
        describe('should test value types', async function () {
          it('should test bool', async function () {
            const randomBool = getRandomInt(0, 1) > 0;

            const tx = await contract.setVarBool(randomBool);
            await tx.wait();

            const resp = await contract.getVarBool();
            statesObject['VarBool'] = resp;

            expect(resp).equal(randomBool);
          });

          const numTypes = [
            'Uint8',
            'Uint16',
            'Uint32',
            'Uint64',
            'Uint128',
            'Uint256',
            'Int8',
            'Int16',
            'Int32',
            'Int64',
            'Int128',
            'Int256',
          ];
          for (let i in numTypes) {
            it('should update ' + numTypes[i], async function () {
              const beforeInt = await contract[`getVar${numTypes[i]}`]();
              const randomInt = BigInt(getRandomInt(1, 3));

              const tx = await contract[`setVar${numTypes[i]}`](
                beforeInt + randomInt
              );
              await tx.wait();

              const resp = await contract[`getVar${numTypes[i]}`]();
              statesObject[`Var${numTypes[i]}`] = Number(resp);
              expect(resp).equal(beforeInt + randomInt);
            });
          }

          it('should test address', async function () {
            const randomAddress = ethers.Wallet.createRandom().address;

            const tx = await contract.setVarAddress(randomAddress);
            await tx.wait();

            const resp = await contract.getVarAddress();
            statesObject[`VarAddress`] = resp;
            expect(resp).equal(randomAddress);
          });

          it('should test ContractType', async function () {
            const tx = await contract.setVarContractType();
            await tx.wait();

            const resp = await contract.getVarContractType();
            statesObject[`VarContractType`] = resp;
            expect(resp).to.not.be.null;
            expect(resp).to.not.equal('0x');
          });

          it('should test bytes32', async function () {
            const randomBytes32 = Buffer.alloc(32, getRandomInt(1, 5644));
            const tx = await contract.setVarBytes32(randomBytes32);
            await tx.wait();

            const resp = await contract.getVarBytes32();
            statesObject[`VarBytes32`] = resp;
            expect(resp).to.equal('0x' + randomBytes32.toString('hex'));
          });

          it('should test string', async function () {
            const randomString = (Math.random() + 1).toString(36);
            const tx = await contract.setVarString(randomString);
            await tx.wait();

            const resp = await contract.getVarString();
            statesObject[`VarString`] = resp;
            expect(resp).to.equal(randomString);
          });

          it('should test enum', async function () {
            const randomEnum = getRandomInt(0, 3);
            const tx = await contract.setVarEnum(randomEnum);
            await tx.wait();

            const resp = await contract.getVarEnum();
            statesObject[`VarEnum`] = Number(resp);
            expect(resp).to.equal(randomEnum);
          });

          it('should test mapping K/V object', async function () {
            const randomAddress = ethers.Wallet.createRandom().address;
            const randomValue = getRandomInt(0, 100);

            const tx = await contract.setBalance(randomAddress, randomValue);
            await tx.wait();

            const resp = await contract.balanceOf(randomAddress);
            statesObject[`Balance`] = {
              address: randomAddress,
              value: randomValue,
            };
            expect(resp).equal(randomValue);
          });
        });

        describe('should test reference types', async function () {
          it('should test data allocation', async function () {
            for (let i = 0; i < 2; i++) {
              const randomArr = [
                getRandomInt(1, 1000),
                getRandomInt(1, 1000),
                getRandomInt(1, 1000),
                getRandomInt(1, 1000),
              ];

              const tx = await contract.setVarIntArrDataAlloc(randomArr);
              await tx.wait();

              const resp = (await contract.getVarIntArrDataAlloc()).toArray();
              statesObject[`VarIntArrDataAlloc`] =
                serializeSmartContractResponse(resp);

              const expected = randomArr.slice(0, 3);
              const resp0 = resp[0].toArray().map((n) => Number(n));
              const resp1 = resp[1].toArray().map((n) => Number(n));
              expect(JSON.stringify(expected)).equal(JSON.stringify(resp0));
              expect(JSON.stringify(expected)).equal(JSON.stringify(resp1));
            }
          });

          it('Should delete data allocation', async () => {
            for (let i = 0; i < 2; i++) {
              const randomArr = [
                getRandomInt(1, 1000),
                getRandomInt(1, 1000),
                getRandomInt(1, 1000),
                getRandomInt(1, 1000),
              ];

              const tx = await contract.setVarIntArrDataAllocDeleted(randomArr);
              await tx.wait();

              const resp = (
                await contract.getVarIntArrDataAllocDeleted()
              ).toArray();
              expect(resp).to.deep.eq(randomArr);

              const deleteTx = await contract.deleteVarIntArrDataAllocDeleted();
              await deleteTx.wait();

              const deletedResp = (
                await contract.getVarIntArrDataAllocDeleted()
              ).toArray();
              statesObject['VarIntArrDataAllocDeleted'] = deletedResp;
              expect(deletedResp.length).to.eq(0);
            }
          });

          it('should test string concat', async function () {
            for (let i = 0; i < 2; i++) {
              const fetchedInit = await contract.getVarStringConcat();

              const randomString1 = (Math.random() + 1)
                .toString(36)
                .substring(0, 4);
              const tx1 = await contract.setVarStringConcat(randomString1);
              await tx1.wait();

              const randomString2 = (Math.random() + 1)
                .toString(36)
                .substring(0, 4);
              const tx2 = await contract.setVarStringConcat(randomString2);
              await tx2.wait();

              const fetchedFinal = await contract.getVarStringConcat();
              statesObject[`VarStringConcat`] = fetchedFinal;
              expect(fetchedFinal).equal(
                fetchedInit + randomString1 + randomString2
              );
            }
          });

          it('Should delete string concat', async () => {
            for (let i = 0; i < 2; i++) {
              const fetchedInit = await contract.getVarStringConcatDeleted();

              const randomString1 = (Math.random() + 1)
                .toString(36)
                .substring(0, 4);
              const tx1 = await contract.setVarStringConcatDeleted(
                randomString1
              );
              await tx1.wait();

              const randomString2 = (Math.random() + 1)
                .toString(36)
                .substring(0, 4);
              const tx2 = await contract.setVarStringConcatDeleted(
                randomString2
              );
              await tx2.wait();

              const fetchedFinal = await contract.getVarStringConcatDeleted();
              expect(fetchedFinal).equal(
                fetchedInit + randomString1 + randomString2
              );

              const txDelete = await contract.deleteVarStringConcatDeleted();
              await txDelete.wait();

              const deletedString = await contract.getVarStringConcatDeleted();
              statesObject[`VarStringConcatDeleted`] = deletedString;
            }
          });

          it('should test contract struct', async function () {
            for (let i = 0; i < 2; i++) {
              const initStruct = await contract.getVarContractStruct();

              const struct = {
                varUint256: initStruct[0] + BigInt(getRandomInt(1, 100)),
                varAddress: ethers.Wallet.createRandom().address,
                varBytes32: Buffer.alloc(32, getRandomInt(1, 5644)),
                varString: (Math.random() + 1).toString(36).substring(0, 4),
                varContractType: getRandomInt(0, 3),
                varUint256Arr: [
                  ...initStruct[5].map((e) => Number(e)),
                  getRandomInt(1, 100),
                  getRandomInt(1, 100),
                ],
                varStringConcat:
                  initStruct[6] +
                  (Math.random() + 1).toString(36).substring(0, 4),
              };

              const tx1 = await contract.setVarContractStruct(struct);
              await tx1.wait();

              const resp1 = await contract.getVarContractStruct();

              expect(resp1[0]).equal(struct.varUint256);
              expect(resp1[1]).equal(struct.varAddress);
              expect(resp1[2]).equal('0x' + struct.varBytes32.toString('hex'));
              expect(resp1[3]).equal(struct.varString);
              expect(resp1[4]).equal(struct.varContractType);
              expect(
                JSON.stringify(resp1[5].toArray().map((e) => Number(e)))
              ).equal(JSON.stringify(struct.varUint256Arr));
              expect(resp1[6]).equal(struct.varStringConcat);

              const updatedStruct = {
                varUint256: resp1[0] + BigInt(getRandomInt(1, 100)),
                varAddress: ethers.Wallet.createRandom().address,
                varBytes32: Buffer.alloc(32, getRandomInt(1, 5644)),
                varString: (Math.random() + 1).toString(36).substring(0, 4),
                varContractType: getRandomInt(0, 3),
                varUint256Arr: [
                  ...resp1[5].toArray().map((e) => Number(e)),
                  getRandomInt(1, 100),
                  getRandomInt(1, 100),
                ],
                varStringConcat:
                  resp1[6] + (Math.random() + 1).toString(36).substring(0, 4),
              };

              const tx2 = await contract.setVarContractStruct(updatedStruct);
              await tx2.wait();

              const resp2 = await contract.getVarContractStruct();
              statesObject[`VarContractStruct`] =
                serializeSmartContractResponse(resp2);

              expect(resp2[0]).equal(updatedStruct.varUint256);
              expect(resp2[1]).equal(updatedStruct.varAddress);
              expect(resp2[2]).equal(
                '0x' + updatedStruct.varBytes32.toString('hex')
              );
              expect(resp2[3]).equal(updatedStruct.varString);
              expect(resp2[4]).equal(updatedStruct.varContractType);
              expect(
                JSON.stringify(resp2[5].toArray().map((e) => Number(e)))
              ).equal(JSON.stringify(updatedStruct.varUint256Arr));
              expect(resp2[6]).equal(updatedStruct.varStringConcat);
            }
          });

          it('should delete contract struct', async () => {
            for (let i = 0; i < 2; i++) {
              const initStruct = await contract.getVarContractStructDeleted();

              const struct = {
                varUint256: initStruct[0] + BigInt(getRandomInt(1, 100)),
                varAddress: ethers.Wallet.createRandom().address,
                varBytes32: Buffer.alloc(32, getRandomInt(1, 5644)),
                varString: (Math.random() + 1).toString(36).substring(0, 4),
                varContractType: getRandomInt(0, 3),
                varUint256Arr: [
                  ...initStruct[5].map((e) => Number(e)),
                  getRandomInt(1, 100),
                  getRandomInt(1, 100),
                ],
                varStringConcat:
                  initStruct[6] +
                  (Math.random() + 1).toString(36).substring(0, 4),
              };

              const tx1 = await contract.setVarContractStructDeleted(struct);
              await tx1.wait();

              const resp1 = await contract.getVarContractStructDeleted();

              expect(resp1[0]).equal(struct.varUint256);
              expect(resp1[1]).equal(struct.varAddress);
              expect(resp1[2]).equal('0x' + struct.varBytes32.toString('hex'));
              expect(resp1[3]).equal(struct.varString);
              expect(resp1[4]).equal(struct.varContractType);
              expect(
                JSON.stringify(resp1[5].toArray().map((e) => Number(e)))
              ).equal(JSON.stringify(struct.varUint256Arr));
              expect(resp1[6]).equal(struct.varStringConcat);

              const deleteTx = await contract.deleteVarContractStructDeleted();
              await deleteTx.wait();

              const deletedResp = await contract.getVarContractStructDeleted();
              statesObject[`VarContractStructDeleted`] =
                serializeSmartContractResponse(deletedResp);

              expect(deletedResp[0]).equal(0);
              expect(deletedResp[1]).equal(
                '0x0000000000000000000000000000000000000000'
              );
              expect(deletedResp[2]).equal(
                '0x0000000000000000000000000000000000000000000000000000000000000000'
              );
              expect(deletedResp[3]).equal('');
              expect(deletedResp[4]).equal(0);
              expect(deletedResp[5].toArray()).deep.equal([]);
              expect(deletedResp[6]).equal('');
            }
          });
        });
      }
    });
  });
});
// Filename: test/system-contracts/exchange-rate/ExchangeRateMock.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('ExchangeRateMock Test Suite', function () {
  let exchangeRateMock;
  const gasLimit = 1000000;
  const tinybars = 100000000;
  const tinycents = 100000000;

  before(async function () {
    const factory = await ethers.getContractFactory(
      Constants.Contract.ExchangeRateMock
    );

    exchangeRateMock = await factory.deploy();
  });

  it('should be able to execute convertTinycentsToTinybars', async function () {
    const tx = await exchangeRateMock.convertTinycentsToTinybars(tinycents, {
      gasLimit,
    });

    const txReceipt = await tx.wait();
    const result = txReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.TinyBars
    )[0].args[0];

    expect(result).to.exist;
  });

  it('should be able to execute convertTinybarsToTinycents', async function () {
    const tx = await exchangeRateMock.convertTinybarsToTinycents(tinybars, {
      gasLimit,
    });

    const txReceipt = await tx.wait();
    const result = txReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.TinyCents
    )[0].args[0];

    expect(result).to.exist;
  });
});
// Filename: test/system-contracts/hedera-account-service/ihrc-632/aliasAccountUtility.js
// SPDX-License-Identifier: Apache-2.0

const Utils = require('../../hedera-token-service/utils');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../../constants');
const {
  Hbar,
  PrivateKey,
  AccountCreateTransaction,
  KeyList,
} = require('@hashgraph/sdk');
const path = require('path');
const protobuf = require('protobufjs');

describe('@HAS IHRC-632 Test Suite', () => {
  let walletA,
    walletB,
    walletC,
    aliasAccountUtility,
    sdkClient,
    walletAHederaAccountNumAlias;

  before(async () => {
    [walletA, walletB, walletC] = await ethers.getSigners();

    // deploy cyprtoAllowanceContract
    const AliasAccountUtilityFactory = await ethers.getContractFactory(
      Constants.Contract.AliasAccountUtility
    );
    aliasAccountUtility = await AliasAccountUtilityFactory.deploy();
    await aliasAccountUtility.waitForDeployment();

    sdkClient = await Utils.createSDKClient();

    const walletAAccountId = await Utils.getAccountId(
      walletA.address,
      sdkClient
    );

    walletAHederaAccountNumAlias =
      `0x` + (await Utils.convertAccountIdToLongZeroAddress(walletAAccountId));
  });

  describe('getEvmAddressAlias', () => {
    // skipping since there's a bug in getEvmAddressAlias in the services
    it('Should execute getEvmAddressAliasPublic and get the corressponded evmAddressAlias', async () => {
      const tx = await aliasAccountUtility.getEvmAddressAliasPublic(
        walletAHederaAccountNumAlias,
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();
      const evmAddressAliasLog = receipt.logs.find(
        (log) => log.fragment.name === 'AddressAliasResponse'
      ).args;

      expect(evmAddressAliasLog[0]).to.eq(22); // responseCode 22 = success
      expect(evmAddressAliasLog[1]).to.eq(walletA.address); // evm address
    });

    it('Should execute getEvmAddressAliasPublic with NOT long zero address and get INVALID_ACOUNT_ID', async () => {
      const tx = await aliasAccountUtility.getEvmAddressAliasPublic(
        walletA.address, // not a long zero address
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();

      const evmAddressAlias = receipt.logs.find(
        (log) => log.fragment.name === 'AddressAliasResponse'
      ).args;
      expect(evmAddressAlias[0]).to.eq(15); // responseCode 15 = INVALID_ACCOUNT_ID
      expect(evmAddressAlias[1]).to.eq(ethers.ZeroAddress);
    });
  });

  describe('getHederaAccountNumAlias', () => {
    it('Should execute getHederaAccountNumAlias and get the corressponded accountNumAlias', async () => {
      const tx = await aliasAccountUtility.getHederaAccountNumAliasPublic(
        walletA.address,
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();

      const evmAddressAliasLog = receipt.logs.find(
        (log) => log.fragment.name === 'AddressAliasResponse'
      ).args;

      expect(evmAddressAliasLog[0]).to.eq(22); // responseCode 22 = success
      expect(evmAddressAliasLog[1].toLowerCase()).to.eq(
        walletAHederaAccountNumAlias
      ); // evm address
    });

    it('Should execute getEvmAddressAliasPublic with long zero address and get the corresponded evm address', async () => {
      const tx = await aliasAccountUtility.getEvmAddressAliasPublic(
        walletAHederaAccountNumAlias, // a long zero address
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();

      const evmAddressAlias = receipt.logs.find(
        (log) => log.fragment.name === 'AddressAliasResponse'
      ).args;
      expect(evmAddressAlias[0]).to.eq(22); // responseCode 22 = success
      expect(evmAddressAlias[1]).to.eq(walletA.address);
    });
  });

  describe('isValidAlias', () => {
    it('Should execute isValidAliasPublic with EVM address alias param and return TRUE', async () => {
      const tx = await aliasAccountUtility.isValidAliasPublic(
        walletA.address,
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();

      const evmAddressAliasLog = receipt.logs.find(
        (log) => log.fragment.name === 'IsValidAliasResponse'
      ).args;

      expect(evmAddressAliasLog[0]).to.eq(22); // responseCode 22 = success
      expect(evmAddressAliasLog[1]).to.be.true;
    });

    it('Should execute isValidAliasPublic with Hedera Account Num Alias param and return TRUE', async () => {
      const tx = await aliasAccountUtility.isValidAliasPublic(
        walletAHederaAccountNumAlias,
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();

      const evmAddressAliasLog = receipt.logs.find(
        (log) => log.fragment.name === 'IsValidAliasResponse'
      ).args;

      expect(evmAddressAliasLog[0]).to.eq(22); // responseCode 22 = success
      expect(evmAddressAliasLog[1]).to.be.true;
    });

    it('Should execute isValidAliasPublic with a non existed account param and return FALSE', async () => {
      const tx = await aliasAccountUtility.isValidAliasPublic(
        ethers.Wallet.createRandom().address,
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();

      const evmAddressAliasLog = receipt.logs.find(
        (log) => log.fragment.name === 'IsValidAliasResponse'
      ).args;

      expect(evmAddressAliasLog[0]).to.eq(22); // responseCode 22 = success
      expect(evmAddressAliasLog[1]).to.be.false;
    });
  });

  describe(`IsAuthorizedRaw`, () => {
    const messageToSign = 'Hedera Account Service';
    const messageHashEC = ethers.hashMessage(messageToSign);
    const messageHashED = Buffer.from(messageToSign);
    const EDItems = [];

    before(async () => {
      for (let i = 0; i < 2; i++) {
        const newEdPK = PrivateKey.generateED25519();
        const newEdPubKey = newEdPK.publicKey;
        const client = await Utils.createSDKClient();
        const edSignerAccount = (
          await (
            await new AccountCreateTransaction()
              .setKey(newEdPubKey)
              .setInitialBalance(Hbar.fromTinybars(1000))
              .execute(client)
          ).getReceipt(client)
        ).accountId;
        const signerAlias = `0x${edSignerAccount.toSolidityAddress()}`;
        const signature = `0x${Buffer.from(newEdPK.sign(messageHashED)).toString('hex')}`;
        const obj = {
          signature,
          signerAlias,
        };
        EDItems.push(obj);
      }
    });

    it('Should verify message signature and return TRUE using isAuthorizedRawPublic for ECDSA account', async () => {
      const signature = await walletB.signMessage(messageToSign);
      expect(signature.slice(2).length).to.eq(65 * 2); // 65 bytes ECDSA signature

      const correctSignerReceipt = await (
        await aliasAccountUtility.isAuthorizedRawPublic(
          walletB.address, // correct signer
          messageHashEC,
          signature,
          Constants.GAS_LIMIT_1_000_000
        )
      ).wait();

      const correctSignerReceiptResponse = correctSignerReceipt.logs.find(
        (l) => l.fragment.name === 'AccountAuthorizationResponse'
      ).args;

      expect(correctSignerReceiptResponse[0]).to.eq(22);
      expect(correctSignerReceiptResponse[1]).to.eq(walletB.address);
      expect(correctSignerReceiptResponse[2]).to.be.true;
    });

    it('Should verify message signature and return FALSE using isAuthorizedRawPublic for ECDSA account', async () => {
      const signature = await walletB.signMessage(messageToSign);
      expect(signature.slice(2).length).to.eq(65 * 2); // 65 bytes ECDSA signature

      const incorrectSignerReceipt = await (
        await aliasAccountUtility.isAuthorizedRawPublic(
          walletC.address, // incorrect signer
          messageHashEC,
          signature,
          Constants.GAS_LIMIT_1_000_000
        )
      ).wait();

      const incorrectSignerReceiptResponse = incorrectSignerReceipt.logs.find(
        (l) => l.fragment.name === 'AccountAuthorizationResponse'
      ).args;

      expect(incorrectSignerReceiptResponse[0]).to.eq(22);
      expect(incorrectSignerReceiptResponse[1]).to.eq(walletC.address);
      expect(incorrectSignerReceiptResponse[2]).to.be.false;
    });

    it('Should verify message signature and return TRUE using isAuthorizedRawPublic for ED25519 account', async () => {
      const correctSignerReceipt = await (
        await aliasAccountUtility.isAuthorizedRawPublic(
          EDItems[0].signerAlias, // correct alias
          messageHashED,
          EDItems[0].signature, // correct signature
          Constants.GAS_LIMIT_10_000_000
        )
      ).wait();

      const correctSignerReceiptResponse = correctSignerReceipt.logs.find(
        (l) => l.fragment.name === 'AccountAuthorizationResponse'
      ).args;

      expect(correctSignerReceiptResponse[0]).to.eq(22);
      expect(correctSignerReceiptResponse[1].toLowerCase()).to.eq(
        EDItems[0].signerAlias.toLowerCase()
      );
      expect(correctSignerReceiptResponse[2]).to.be.true;
    });

    it('Should verify message signature and return FALSE using isAuthorizedRawPublic for ED25519 account', async () => {
      const incorrectSignerReceipt = await (
        await aliasAccountUtility.isAuthorizedRawPublic(
          EDItems[0].signerAlias, // incorrect signer
          messageHashED,
          EDItems[1].signature, // different signature
          Constants.GAS_LIMIT_10_000_000
        )
      ).wait();

      const incorrectSignerReceiptResponse = incorrectSignerReceipt.logs.find(
        (l) => l.fragment.name === 'AccountAuthorizationResponse'
      ).args;

      expect(incorrectSignerReceiptResponse[0]).to.eq(22);
      expect(incorrectSignerReceiptResponse[1].toLowerCase()).to.eq(
        EDItems[0].signerAlias.toLowerCase()
      );
      expect(incorrectSignerReceiptResponse[1].toLowerCase()).to.not.eq(
        EDItems[1].signerAlias.toLowerCase()
      );
      expect(incorrectSignerReceiptResponse[2]).to.be.false;
    });
  });

  // The isAuthorized function is responsible for verifying message signatures against the keys associated with a Hedera account.
  // This function is particularly complex as it accommodates various signature types available in the Hedera ecosystem, including ECDSA and ED25519.
  //
  // The function takes an address, a message, and a signatureBlob as inputs. The signatureBlob contains one or more signatures encoded in protobuf format, which correspond to the provided message.
  //
  // It is important to note that calls to this method incur additional gas charges, which are determined by the resource cost of validating each signature, along with the variable cost associated with performing a cryptographic hash on the message.
  // The tests for this function encompass:
  // - Verifying individual signatures from ECDSA and ED25519 keys
  // - Validating signatures from threshold keys that include multiple ECDSA and ED25519 keys
  // - Managing cases of unauthorized signatures
  // The function utilizes protobuf encoding to create signature blobs that conform to the SignatureMap message format.
  describe(`IsAuthorized`, () => {
    // raw messageToSign
    const messageToSign = 'Hedera Account Service';

    before(async () => {
      // Load and compile protobuf definitions
      const signatureMapProto = path.resolve(__dirname, 'signature_map.proto');
      root = await protobuf.load(signatureMapProto);
      SignatureMap = root.lookupType('SignatureMap');
    });

    // Helper function to create a signature blob which align with the SignatureMap protobuf message struct
    const createSignatureBlob = (signatures) => {
      const sigPairs = signatures.map((sig) => ({
        pubKeyPrefix: Buffer.from(sig.pubKeyPrefix),
        [sig.signatureType]: Buffer.from(sig.signatureValue),
      }));

      const message = SignatureMap.create({ sigPair: sigPairs });

      const encodedMessage = SignatureMap.encode(message).finish();

      return encodedMessage;
    };

    const prepareSigBlobData = async (
      sdkClient,
      signatureTypes,
      unauthorized = false
    ) => {
      let keyData = {
        pubKeys: [],
        signatureBlobDatas: [],
      };

      // loop through signatureTypes to prepare
      signatureTypes.forEach((sigType) => {
        if (sigType !== 'ECDSAsecp256k1' && sigType !== 'ed25519') {
          throw new Error('Invalid signature type.');
        }

        const privateKey =
          sigType === 'ECDSAsecp256k1'
            ? PrivateKey.generateECDSA()
            : PrivateKey.generateED25519();

        // Extract public key prefix from private key
        const pubKey = privateKey.publicKey;
        const pubKeyBytes = pubKey.toBytesRaw();
        const pubKeyPrefix = pubKeyBytes.slice(0, 32);

        // Sign message using private key
        let signature = privateKey.sign(Buffer.from(messageToSign, 'utf-8'));

        // create unauthorized signature if unauthorized is set to true
        if (unauthorized) {
          // create a new random key. This key will not be included in the threshold key during account creation and signatureBlob creation
          const unauthorizedKey = PrivateKey.generateECDSA();

          // re-assign signature with a new one signed by the `unauthorizedKey`
          signature = unauthorizedKey.sign(Buffer.from(messageToSign, 'utf-8'));
        }

        // Create signature blob data
        // depends on `unauthorized`, this signatureBlobData might be invalid as pubKeyPrefix and signature don't match if `unauthorized` is true
        const signatureBlobData = {
          pubKeyPrefix: pubKeyPrefix,
          signatureType: sigType,
          signatureValue: signature,
        };

        keyData.pubKeys.push(pubKey);
        keyData.signatureBlobDatas.push(signatureBlobData);
      });

      // Create a threshold key with both public keys
      const thresholdKey = new KeyList(
        [...keyData.pubKeys],
        keyData.pubKeys.length
      );

      // Create new account with the new key
      const accountCreateTx = await new AccountCreateTransaction()
        .setKey(thresholdKey)
        .setInitialBalance(Hbar.fromTinybars(1000))
        .execute(sdkClient);
      const receipt = await accountCreateTx.getReceipt(sdkClient);
      const newAccount = receipt.accountId;
      const accountAddress = `0x${newAccount.toSolidityAddress()}`;

      // Create signature blob
      const signatureBlob = createSignatureBlob(keyData.signatureBlobDatas);

      return { accountAddress, signatureBlob };
    };

    it('Should verify message signature and return TRUE using isAuthorized for ECDSA key', async () => {
      const sigBlobData = await prepareSigBlobData(sdkClient, [
        'ECDSAsecp256k1',
      ]);

      const tx = await aliasAccountUtility.isAuthorizedPublic(
        sigBlobData.accountAddress,
        Buffer.from(messageToSign, 'utf-8'),
        sigBlobData.signatureBlob,
        Constants.GAS_LIMIT_10_000_000
      );
      const txReceipt = await tx.wait();

      const accountAuthorizationResponse = txReceipt.logs.find(
        (l) => l.fragment.name === 'AccountAuthorizationResponse'
      ).args;

      expect(accountAuthorizationResponse[0]).to.eq(22);
      expect(accountAuthorizationResponse[1].toLowerCase()).to.eq(
        sigBlobData.accountAddress.toLowerCase()
      );
      expect(accountAuthorizationResponse[2]).to.be.true;
    });

    it('Should verify message signature and return TRUE using isAuthorized for ED25519 key', async () => {
      const sigBlobData = await prepareSigBlobData(sdkClient, ['ed25519']);

      const tx = await aliasAccountUtility.isAuthorizedPublic(
        sigBlobData.accountAddress,
        Buffer.from(messageToSign, 'utf-8'),
        sigBlobData.signatureBlob,
        Constants.GAS_LIMIT_10_000_000
      );
      const txReceipt = await tx.wait();

      const accountAuthorizationResponse = txReceipt.logs.find(
        (l) => l.fragment.name === 'AccountAuthorizationResponse'
      ).args;

      expect(accountAuthorizationResponse[0]).to.eq(22);
      expect(accountAuthorizationResponse[1].toLowerCase()).to.eq(
        sigBlobData.accountAddress.toLowerCase()
      );
      expect(accountAuthorizationResponse[2]).to.be.true;
    });

    it('Should verify message signature and return TRUE using isAuthorized for threshold key includes multiple ED25519 and ECDSA keys', async () => {
      const sigBlobData = await prepareSigBlobData(sdkClient, [
        'ECDSAsecp256k1',
        'ed25519',
        'ed25519',
        'ed25519',
        'ECDSAsecp256k1',
        'ECDSAsecp256k1',
        'ed25519',
        'ECDSAsecp256k1',
      ]);

      const tx = await aliasAccountUtility.isAuthorizedPublic(
        sigBlobData.accountAddress,
        Buffer.from(messageToSign, 'utf-8'),
        sigBlobData.signatureBlob,
        Constants.GAS_LIMIT_10_000_000
      );
      const txReceipt = await tx.wait();

      const accountAuthorizationResponse = txReceipt.logs.find(
        (l) => l.fragment.name === 'AccountAuthorizationResponse'
      ).args;

      expect(accountAuthorizationResponse[0]).to.eq(22);
      expect(accountAuthorizationResponse[1].toLowerCase()).to.eq(
        sigBlobData.accountAddress.toLowerCase()
      );
      expect(accountAuthorizationResponse[2]).to.be.true;
    });

    it('Should FAIL to verify message signature and return FALSE using isAuthorized for unauthorized key', async () => {
      const sigBlobData = await prepareSigBlobData(
        sdkClient,
        ['ECDSAsecp256k1'],
        true // set unauthorized to true
      );

      const tx = await aliasAccountUtility.isAuthorizedPublic(
        sigBlobData.accountAddress,
        Buffer.from(messageToSign, 'utf-8'),
        sigBlobData.signatureBlob,
        Constants.GAS_LIMIT_10_000_000
      );
      const txReceipt = await tx.wait();

      const accountAuthorizationResponse = txReceipt.logs.find(
        (l) => l.fragment.name === 'AccountAuthorizationResponse'
      ).args;

      expect(accountAuthorizationResponse[0]).to.eq(22);
      expect(accountAuthorizationResponse[1].toLowerCase()).to.eq(
        sigBlobData.accountAddress.toLowerCase()
      );
      expect(accountAuthorizationResponse[2]).to.be.false; // unauthorized
    });
  });
});
// Filename: test/system-contracts/hedera-account-service/ihrc-906-facade/IHRC906AccountFacade.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { Contract } = require('ethers');
const Constants = require('../../../constants');

describe('@IHRC-906 Facade @CryptoAllowance  Test Suite', function () {
  let walletA, walletB, walletC, walletIHRC906AccountFacade;
  const amount = 3_000;

  before(async () => {
    [walletA, walletB, walletC] = await ethers.getSigners();

    const IHRC906AccountFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC906AccountFacade')).abi
    );
    walletIHRC906AccountFacade = new Contract(walletA.address, IHRC906AccountFacade, walletA);
  });

  it('should execute hbarApprove() by an EOA to grant an hbar allowance to another EOA', async () => {
    const tx = await walletIHRC906AccountFacade.hbarApprove(
      walletB.address,
      amount,
      Constants.GAS_LIMIT_1_000_000
    );
    const receipt = await tx.wait();
    expect(receipt).to.exist;
    expect(receipt.status).to.eq(1);
  });

  // @notice: skipping until mirror-node fully enables HIP906
  xit('should execute hbarAllowance() by an EOA to retrieve allowance granted to a spender', async () => {
    const approveTx = await walletIHRC906AccountFacade.hbarApprove(
      walletC.address,
      amount,
      Constants.GAS_LIMIT_1_000_000
    );
    await approveTx.wait();

    // @notice: staticCall() method gets the return values instead of transaction information
    const result = await walletIHRC906AccountFacade.hbarAllowance.staticCall(
      walletC.address,
      Constants.GAS_LIMIT_1_000_000
    );

    const [responseCode, allowanceAmount] = result;

    expect(responseCode).to.eq(22n);
    expect(allowanceAmount).to.eq(amount);
  });
});
// Filename: test/system-contracts/hedera-account-service/ihrc-906/cryptoAllowance.js
// SPDX-License-Identifier: Apache-2.0

const utils = require('../../hedera-token-service/utils');
const Utils = require('../../hedera-token-service/utils');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../../constants');
const {
  pollForNewSignerBalanceUsingProvider,
} = require('../../../../utils/helpers');

describe('@HAS IHRC-906 Test Suite', () => {
  let walletA,
    walletB,
    walletC,
    cryptoAllowanceContract,
    cryptoOwnerContract,
    cryptoAllowanceAddress,
    cryptoOwnerAddress;
  const amount = 3000;

  before(async () => {
    [walletA, walletB, walletC, receiver] = await ethers.getSigners();

    // deploy cyprtoAllowanceContract
    const CryptoAllowanceFactory = await ethers.getContractFactory(
      Constants.Contract.CryptoAllowance
    );
    cryptoAllowanceContract = await CryptoAllowanceFactory.deploy();
    await cryptoAllowanceContract.waitForDeployment();
    cryptoAllowanceAddress = cryptoAllowanceContract.target;

    // deploy cryptoOwnerContract
    const CryptoOwnerFactory = await ethers.getContractFactory(
      Constants.Contract.CryptoOwner
    );
    cryptoOwnerContract = await CryptoOwnerFactory.deploy();
    await cryptoOwnerContract.waitForDeployment();
    cryptoOwnerAddress = cryptoOwnerContract.target;

    // transfer funds to cryptoOwnerContract
    await (
      await walletA.sendTransaction({
        to: cryptoOwnerAddress,
        value: ethers.parseEther('30'),
        gasLimit: 1_000_000,
      })
    ).wait();
  });

  it('Should execute hbarApprovePublic and return success response code', async () => {
    const tx = await cryptoAllowanceContract.hbarApprovePublic(
      cryptoAllowanceAddress,
      walletA.address,
      amount,
      Constants.GAS_LIMIT_1_000_000
    );
    const receipt = await tx.wait();
    const responseCode = receipt.logs.find(
      (l) => l.fragment.name === 'ResponseCode'
    );
    expect(responseCode.args).to.deep.eq([22n]);
  });

  it('Should execute hbarAllowancePublic and return an event with the allowance information', async () => {
    const approveTx = await cryptoAllowanceContract.hbarApprovePublic(
      cryptoAllowanceAddress,
      walletB.address,
      amount,
      Constants.GAS_LIMIT_1_000_000
    );
    await approveTx.wait();

    const allowanceTx = await cryptoAllowanceContract.hbarAllowancePublic(
      cryptoAllowanceAddress,
      walletB.address,
      Constants.GAS_LIMIT_1_000_000
    );

    const receipt = await allowanceTx.wait();
    const responseCode = receipt.logs.find(
      (l) => l.fragment.name === 'ResponseCode'
    );
    const logs = receipt.logs.find((l) => l.fragment.name === 'HbarAllowance');

    expect(responseCode.args).to.deep.eq([22n]);
    expect(logs.args[0]).to.eq(cryptoAllowanceAddress);
    expect(logs.args[1]).to.eq(walletB.address);
    expect(logs.args[2]).to.eq(amount);
  });

  it('Should allow an approval on behalf of hbar owner WITH its signature', async () => {
    // update accountKeys
    const ecdsaPrivateKeys = await Utils.getHardhatSignersPrivateKeys(false);
    await utils.updateAccountKeysViaHapi(
      [cryptoAllowanceAddress],
      [ecdsaPrivateKeys[0]] // walletA's key
    );

    const approveTx = await cryptoAllowanceContract.hbarApprovePublic(
      walletA.address,
      walletB.address,
      amount,
      Constants.GAS_LIMIT_1_000_000
    );
    await approveTx.wait();

    const allowanceTx = await cryptoAllowanceContract.hbarAllowancePublic(
      walletA.address,
      walletB.address,
      Constants.GAS_LIMIT_1_000_000
    );

    const receipt = await allowanceTx.wait();
    const responseCode = receipt.logs.find(
      (l) => l.fragment.name === 'ResponseCode'
    );
    const logs = receipt.logs.find((l) => l.fragment.name === 'HbarAllowance');

    expect(responseCode.args).to.deep.eq([22n]);
    expect(logs.args[0]).to.eq(walletA.address);
    expect(logs.args[1]).to.eq(walletB.address);
    expect(logs.args[2]).to.eq(amount);
  });

  it('Should NOT allow an approval on behalf of hbar owner WITHOUT its signature', async () => {
    try {
      const tx = await cryptoAllowanceContract.hbarApprovePublic(
        walletB.address, // random EOA hbar owner
        walletC.address,
        amount,
        Constants.GAS_LIMIT_1_000_000
      );
      await tx.wait();
      expect(false).to.be.true;
    } catch (e) {
      expect(e).to.exist;
      expect(e.code).to.eq(Constants.CALL_EXCEPTION);
    }
  });

  it('Should allow owner to grant an allowance to spender using IHRC906AccountFacade and spender to transfer allowance to receiver on behalf of owner', async () => {
    // set up IHRC906AccountFacade
    const IHRC906AccountFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC906AccountFacade')).abi
    );

    const walletAIHRC906AccountFacade = new ethers.Contract(
      walletA.address,
      IHRC906AccountFacade,
      walletA
    );

    // grant an allowance to cryptoAllowanceContract
    const approveTx = await walletAIHRC906AccountFacade.hbarApprove(
      cryptoAllowanceAddress,
      amount,
      Constants.GAS_LIMIT_1_000_000
    );
    await approveTx.wait();

    // cryptoTransferPublic
    const cryptoTransfers = {
      transfers: [
        {
          accountID: walletA.address,
          amount: amount * -1,
          isApproval: false,
        },
        {
          accountID: walletC.address,
          amount,
          isApproval: false,
        },
      ],
    };
    const tokenTransferList = [];

    const walletABefore = await walletA.provider.getBalance(walletA.address);
    const walletCBefore = await walletC.provider.getBalance(walletC.address);

    const cryptoTransferTx = await cryptoAllowanceContract.cryptoTransferPublic(
      cryptoTransfers,
      tokenTransferList,
      Constants.GAS_LIMIT_1_000_000
    );

    const cryptoTransferReceipt = await cryptoTransferTx.wait();

    const responseCode = cryptoTransferReceipt.logs.find(
      (l) => l.fragment.name === 'ResponseCode'
    ).args[0];

    const walletAAfter = await pollForNewSignerBalanceUsingProvider(
      walletA.provider,
      walletA.address,
      walletABefore
    );

    const walletCAfter = await pollForNewSignerBalanceUsingProvider(
      walletC.provider,
      walletC.address,
      walletCBefore
    );

    expect(responseCode).to.equal(22n);
    expect(walletABefore > walletAAfter).to.equal(true);
    expect(walletCBefore < walletCAfter).to.equal(true);
  });

  it('Should allow a crypto owner contract account to grant an allowance to a spender contract account to transfer allowance to a receiver on behalf of owner contract account', async () => {
    // crypto owner contract account's balance before the transfer
    const cryptoOwnerContractBalanceBefore =
      await ethers.provider.getBalance(cryptoOwnerAddress);
    // receiver's balance before the transfer
    const walletCBefore = await walletC.provider.getBalance(walletC.address);

    // initialize crypto transfer
    const tx = await cryptoOwnerContract.cryptoTransfer(
      cryptoAllowanceAddress,
      amount,
      walletC.address,
      Constants.GAS_LIMIT_1_000_000
    );

    // resolve logs
    const receipt = await tx.wait();
    const responseCode = receipt.logs.find(
      (l) => l.fragment.name === 'ResponseCode'
    ).args[0];

    // crypto owner contract account's balance after the transfer
    const cryptoOwnerContractBalanceAfter =
      await pollForNewSignerBalanceUsingProvider(
        ethers.provider,
        cryptoOwnerAddress,
        cryptoOwnerContractBalanceBefore
      );

    // receiver's balance after the transfer
    const walletCAfter = await pollForNewSignerBalanceUsingProvider(
      walletC.provider,
      walletC.address,
      walletCBefore
    );

    // assertion
    expect(responseCode).to.equal(22n);
    expect(walletCBefore < walletCAfter).to.equal(true);
    expect(
      cryptoOwnerContractBalanceBefore > cryptoOwnerContractBalanceAfter
    ).to.equal(true);
  });

  it('Should NOT allow a spender to spend hbar on behalf of owner without an allowance grant', async () => {
    const cryptoTransfers = {
      transfers: [
        {
          accountID: walletB.address,
          amount: amount * -1,
          isApproval: false,
        },
        {
          accountID: walletC.address,
          amount,
          isApproval: false,
        },
      ],
    };
    const tokenTransferList = [];

    try {
      const cryptoTransferTx = await cryptoAllowanceContract
        .connect(walletB)
        .cryptoTransferPublic(
          cryptoTransfers,
          tokenTransferList,
          Constants.GAS_LIMIT_1_000_000
        );
      await cryptoTransferTx.wait();
      expect(true).to.eq(false);
    } catch (e) {
      expect(e).to.exist;
      expect(e.code).to.eq(Constants.CALL_EXCEPTION);
    }
  });
});
// Filename: test/system-contracts/hedera-schedule-service/hrc-755/HIP755.js
// SPDX-License-Identifier: Apache-2.0

const {expect} = require('chai');
const {ethers} = require('hardhat');
const Utils = require('../../hedera-token-service/utils');
const Constants = require('../../../constants');
const HashgraphProto = require('@hashgraph/proto');

const {
  ScheduleCreateTransaction,
  TransferTransaction,
  Hbar,
  HbarUnit,
  PrivateKey
} = require('@hashgraph/sdk');

const convertScheduleIdToUint8Array = (scheduleId) => {
  const [shard, realm, num] = scheduleId.split('.');

  // size of the buffer is aligned with the services scheduleId to bytes conversion
  // https://github.com/hiero-ledger/hiero-consensus-node/blob/main/hedera-node/hedera-smart-contract-service-impl/src/main/java/com/hedera/node/app/service/contract/impl/utils/SystemContractUtils.java#L153
  const buffer = new ArrayBuffer(24);
  const dataView = new DataView(buffer);

  dataView.setBigUint64(0, BigInt(shard));
  dataView.setBigUint64(8, BigInt(realm));
  dataView.setBigUint64(16, BigInt(num));

  return new Uint8Array(buffer);
};

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const createScheduleTransactionForTransfer = async (senderInfo, receiverInfo, client) => {
  const transferAmountAsTinybars = getRandomInt(1, 100_000_000);
  const transferAmountAsWeibar = BigInt(transferAmountAsTinybars) * BigInt(Utils.tinybarToWeibarCoef);

  let transferTx = await new TransferTransaction()
      .addHbarTransfer(senderInfo.accountId, new Hbar(-transferAmountAsTinybars, HbarUnit.Tinybar))
      .addHbarTransfer(receiverInfo.accountId, new Hbar(transferAmountAsTinybars, HbarUnit.Tinybar));

  const {scheduleId} = await (await new ScheduleCreateTransaction()
      .setScheduledTransaction(transferTx)
      .execute(client)).getReceipt(client);

  return {scheduleId, transferAmountAsWeibar};
};

describe('HIP755 Test Suite', function () {
  let genesisSdkClient, signers, signerSender, signerReceiver, senderInfo, receiverInfo, contractHRC755;

  before(async () => {
    genesisSdkClient = await Utils.createSDKClient();
    signers = await ethers.getSigners();
    signerSender = signers[0];
    signerReceiver = signers[1];

    senderInfo = await Utils.getAccountInfo(signerSender.address, genesisSdkClient);
    receiverInfo = await Utils.getAccountInfo(signerReceiver.address, genesisSdkClient);

    const contractHRC755Factory = await ethers.getContractFactory('HRC755Contract');
    contractHRC755 = await contractHRC755Factory.deploy();
    await contractHRC755.waitForDeployment();
  });

  it('should be able to signSchedule via IHRC755ScheduleFacade', async () => {
    const {
      scheduleId,
      transferAmountAsWeibar
    } = await createScheduleTransactionForTransfer(senderInfo, receiverInfo, genesisSdkClient);

    const senderBalanceBefore = await signers[0].provider.getBalance(signerSender);
    const receiverBalanceBefore = await signers[0].provider.getBalance(signerReceiver);

    const contract = await ethers.getContractAt(
        'IHRC755ScheduleFacade',
        Utils.convertAccountIdToLongZeroAddress(scheduleId.toString(), true),
        signerSender
    );
    const signScheduleTx = await contract.signSchedule(Constants.GAS_LIMIT_2_000_000);
    await signScheduleTx.wait();

    const senderBalanceAfter = await signers[0].provider.getBalance(signerSender);
    const receiverBalanceAfter = await signers[0].provider.getBalance(signerReceiver);

    expect(receiverBalanceBefore).to.not.equal(receiverBalanceAfter);
    expect(senderBalanceBefore).to.not.equal(senderBalanceAfter);
    expect(senderBalanceAfter + transferAmountAsWeibar).to.be.lessThanOrEqual(senderBalanceBefore);
    expect(receiverBalanceBefore + transferAmountAsWeibar).to.equal(receiverBalanceAfter);
  });

  it('should be able to signSchedule via HRC755 contract', async () => {
    const {
      scheduleId,
      transferAmountAsWeibar
    } = await createScheduleTransactionForTransfer(senderInfo, receiverInfo, genesisSdkClient);

    const privateKey = PrivateKey.fromStringECDSA(Utils.getHardhatSignerPrivateKeyByIndex(0));
    const scheduleIdAsBytes = convertScheduleIdToUint8Array(scheduleId.toString());
    const sigMapProtoEncoded = await HashgraphProto.proto.SignatureMap.encode({
      sigPair: [{
        pubKeyPrefix: privateKey.publicKey.toBytesRaw(),
        ECDSASecp256k1: privateKey.sign(scheduleIdAsBytes)
      }]
    }).finish();

    const senderBalanceBefore = await signers[0].provider.getBalance(signerSender);
    const receiverBalanceBefore = await signers[0].provider.getBalance(signerReceiver);

    const signScheduleCallTx = await contractHRC755.signScheduleCall(
        Utils.convertAccountIdToLongZeroAddress(scheduleId.toString(), true),
        sigMapProtoEncoded,
        Constants.GAS_LIMIT_2_000_000
    );
    await signScheduleCallTx.wait();

    const senderBalanceAfter = await signers[0].provider.getBalance(signerSender);
    const receiverBalanceAfter = await signers[0].provider.getBalance(signerReceiver);

    expect(receiverBalanceBefore).to.not.equal(receiverBalanceAfter);
    expect(senderBalanceBefore).to.not.equal(senderBalanceAfter);
    expect(senderBalanceAfter + transferAmountAsWeibar).to.be.lessThanOrEqual(senderBalanceBefore);
    expect(receiverBalanceBefore + transferAmountAsWeibar).to.equal(receiverBalanceAfter);
  });

  it('should be able to authorizeSchedule via HRC755 contract', async () => {
    const {scheduleId} = await createScheduleTransactionForTransfer(senderInfo, receiverInfo, genesisSdkClient);

    const signScheduleCallTx = await contractHRC755.authorizeScheduleCall(
        Utils.convertAccountIdToLongZeroAddress(scheduleId.toString(), true),
        Constants.GAS_LIMIT_2_000_000
    );
    await signScheduleCallTx.wait();

    const debugTraceRes = await signers[0].provider.send('debug_traceTransaction', [
          signScheduleCallTx.hash, {
            tracer: 'callTracer',
            tracerConfig: {
              onlyTopCall: true,
            }
          }
        ]
    );
    expect(parseInt(debugTraceRes.output)).to.equal(Constants.TX_SUCCESS_CODE);
  });
});
// Filename: test/system-contracts/hedera-token-service/assertions.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');

const expectValidHash = (hash, len = 0) => {
  let regex;
  if (len && len > 0) {
    regex = new RegExp(`^0x[a-fA-F0-9]{${len}}$`);
  } else {
    regex = new RegExp(`^0x[a-fA-F0-9]*$`);
  }

  expect(!!hash.match(regex)).to.eq(true);
};

module.exports = {
  expectValidHash,
};
// Filename: test/system-contracts/hedera-token-service/atomic-hts/atomicHTS.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');

describe('AtomicHTS - HIP#551: Batch Transactions Test Suite', () => {
  let signers,
    tokenAddress,
    erc20Contract,
    atomicHTSContract,
    tokenCreateContract,
    tokenTransferContract,
    tokenManagmentContract;
  const ALLOWANCE = 30n;
  const WIPE_AMOUNT = 60n;
  const MINT_AMOUNT = 90n;
  const INITAL_AMOUNT = 1000n;
  const TRANSFER_AMOUNT = 120n;
  const SUCCESS_RESPONSE_CODE = 22n;
  const TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT_RESPONSE_CODE = 194n;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    accountA = signers[0].address;
    accountB = signers[1].address;
    tokenCreateContract = await utils.deployTokenCreateContract();
    tokenTransferContract = await utils.deployTokenTransferContract();
    tokenManagmentContract = await utils.deployTokenManagementContract();

    const atomicContractFactory = await ethers.getContractFactory(
      Constants.Contract.AtomicHTS
    );
    atomicHTSContract = await atomicContractFactory.deploy();

    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
      await tokenManagmentContract.getAddress(),
      await atomicHTSContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);

    // @notice tokenCreateContract.createFungibleTokenPublic() will generate an intial amount of 1000 tokens
    // to the treasury at the smart contract level
    tokenAddress = await utils.createFungibleTokenWithSECP256K1AdminKey(
      tokenCreateContract,
      accountA,
      utils.getSignerCompressedPublicKey()
    );
    await utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenManagmentContract.getAddress(),
      await atomicHTSContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);

    erc20Contract = await utils.deployERC20Contract();

    await utils.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );

    await utils.grantTokenKyc(tokenCreateContract, tokenAddress);
  });

  it('Should execute batchAssociateGrantKYCTransfer()', async () => {
    const batchTx = await atomicHTSContract.batchAssociateGrantKYCTransfer(
      tokenAddress,
      accountA,
      accountB,
      TRANSFER_AMOUNT,
      Constants.GAS_LIMIT_10_000_000
    );
    const args = (await batchTx.wait()).logs.find(
      (e) => e.fragment.name === 'BatchAssociateGrantKYCTransfer'
    ).args;

    const accountABalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountA
    );
    const accountBBalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountB
    );

    expect(accountABalance).to.eq(INITAL_AMOUNT - TRANSFER_AMOUNT);
    expect(accountBBalance).to.eq(TRANSFER_AMOUNT);
    expect(args.grantKYCResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.transferTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.associateResponseCode).to.eq(
      TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT_RESPONSE_CODE
    );
  });

  it('Should execute batchApproveAssociateGrantKYCTransferFrom()', async () => {
    const batchTx =
      await atomicHTSContract.batchApproveAssociateGrantKYCTransferFrom(
        tokenAddress,
        accountA,
        accountB,
        TRANSFER_AMOUNT,
        ALLOWANCE,
        Constants.GAS_LIMIT_10_000_000
      );

    const args = (await batchTx.wait()).logs.find(
      (e) => e.fragment?.name === 'BatchApproveAssociateGrantKYCTransferFrom'
    ).args;

    const afterSenderBalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountA
    );
    const afterReceiverBalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountB
    );

    expect(afterSenderBalance).to.eq(INITAL_AMOUNT - TRANSFER_AMOUNT);
    expect(afterReceiverBalance).to.eq(ALLOWANCE);
    expect(args.approveResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.grantKYCResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.transferFromResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.transferTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.associateResponseCode).to.eq(
      TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT_RESPONSE_CODE
    );
  });

  it('Shoud execute batchUnfreezeGrantKYCTransferFreeze()', async () => {
    const batchTx = await atomicHTSContract.batchUnfreezeGrantKYCTransferFreeze(
      tokenAddress,
      accountA,
      accountB,
      TRANSFER_AMOUNT,
      Constants.GAS_LIMIT_10_000_000
    );
    const args = (await batchTx.wait()).logs.find(
      (e) => e.fragment?.name === 'BatchUnfreezeGrantKYCTransferFreeze'
    ).args;

    const acountABalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountA
    );
    const accountBBalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountB
    );

    expect(acountABalance).to.eq(INITAL_AMOUNT - TRANSFER_AMOUNT);
    expect(accountBBalance).to.eq(TRANSFER_AMOUNT);
    expect(args.unfreezeTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.grantKYCResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.transferTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.freezeTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
  });

  it('Should execute batchWipeMintTransfer()', async () => {
    // top up accountB with some token fund
    const transferTx = await tokenTransferContract.transferTokenPublic(
      tokenAddress,
      accountA,
      accountB,
      TRANSFER_AMOUNT,
      Constants.GAS_LIMIT_10_000_000
    );
    await transferTx.wait();

    const batchTx = await atomicHTSContract.batchWipeMintTransfer(
      tokenAddress,
      accountA,
      accountB,
      WIPE_AMOUNT,
      MINT_AMOUNT,
      TRANSFER_AMOUNT,
      Constants.GAS_LIMIT_10_000_000
    );
    const args = (await batchTx.wait()).logs.find(
      (e) => e.fragment?.name === 'BatchWipeMintTransfer'
    ).args;

    const accountAbalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountA
    );

    const accountBBalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountB
    );

    /**
     * @logic accountA initially has INITIAL_AMOUNT token. It then transfers TRANSFER_AMOUNT token to accountB.
     *        During the batchWipeMintTransfer() transaction, accountA's balance increased with MINT_AMOUNT token after the mint transaction.
     *        Finally, accountA's reduced TRANSFER_AMOUNT token after the transfer transaction against accountB
     */
    expect(accountAbalance).to.eq(
      INITAL_AMOUNT - TRANSFER_AMOUNT + MINT_AMOUNT - TRANSFER_AMOUNT
    );

    /**
     * @logic accountB intially has 0 token but then got TRANSFER_AMOUNT token after the transfer transaction from accountB.
     *        During batchWipeMintTransfer(), accountB's balance is reduced by WIPE_AMOUNT after the wipe transaction and
     *        eventually gains TRANSFER_AMOUNT after the transfer transaction from accountA
     */
    expect(accountBBalance).to.eq(
      TRANSFER_AMOUNT - WIPE_AMOUNT + TRANSFER_AMOUNT
    );
    expect(args.wipeTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.mintTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.transferTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
  });

  it('Should execute batchMintUnfreezeGrantKYCTransferFreeze()', async () => {
    const batchTx =
      await atomicHTSContract.batchMintUnfreezeGrantKYCTransferFreeze(
        tokenAddress,
        accountA,
        accountB,
        MINT_AMOUNT,
        TRANSFER_AMOUNT
      );

    const args = (await batchTx.wait()).logs.find(
      (e) => e.fragment?.name === 'BatchMintUnfreezeGrantKYCTransferFreeze'
    ).args;

    const accountAbalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountA
    );

    const accountBBalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountB
    );

    expect(accountAbalance).to.eq(
      INITAL_AMOUNT + MINT_AMOUNT - TRANSFER_AMOUNT
    );
    expect(accountBBalance).to.eq(TRANSFER_AMOUNT);
    expect(args.mintTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.unfreezeTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.grantKYCResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.freezeTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
  });

  it('Should execute batchAssociateMintGrantTransfer()', async () => {
    const batchTx = await atomicHTSContract.batchAssociateMintGrantTransfer(
      tokenAddress,
      accountA,
      accountB,
      MINT_AMOUNT,
      Constants.GAS_LIMIT_10_000_000
    );

    const args = (await batchTx.wait()).logs.find(
      (e) => e.fragment?.name === 'BatchAssociateMintGrantTransfer'
    ).args;

    const accountAbalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountA
    );

    const accountBBalance = await erc20Contract.balanceOf(
      tokenAddress,
      accountB
    );

    expect(accountAbalance).to.eq(INITAL_AMOUNT);
    expect(accountBBalance).to.eq(MINT_AMOUNT);
    expect(args.mintTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.grantKYCResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.transferTokenResponseCode).to.eq(SUCCESS_RESPONSE_CODE);
    expect(args.associateResponseCode).to.eq(
      TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT_RESPONSE_CODE
    );
  });
});
// Filename: test/system-contracts/hedera-token-service/erc-20/ERC20Contract.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');

describe('ERC20Contract Test Suite', function () {
  let tokenCreateContract;
  let tokenTransferContract;
  let tokenAddress;
  let erc20Contract;
  let signers;
  const TOTAL_SUPPLY = 10000000000;

  before(async function () {
    signers = await ethers.getSigners();
    tokenCreateContract = await utils.deployTokenCreateContract();
    tokenTransferContract = await utils.deployTokenTransferContract();
    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    erc20Contract = await utils.deployERC20Contract();
    tokenAddress = await utils.createFungibleToken(
      tokenCreateContract,
      signers[0].address
    );

    await utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    await utils.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.grantTokenKyc(tokenCreateContract, tokenAddress);
  });

  it('should be able to get token name', async function () {
    const name = await erc20Contract.name(tokenAddress);
    expect(name).to.equal(Constants.TOKEN_NAME);
  });

  it('should be able to get token symbol', async function () {
    const symbol = await erc20Contract.symbol(tokenAddress);
    expect(symbol).to.equal('tokenSymbol');
  });

  it('should be able to get token decimals', async function () {
    const decimals = await erc20Contract.decimals(tokenAddress);
    expect(decimals).to.equal(0);
  });

  it('should be able to get token totalSupply', async function () {
    const totalSupply = await erc20Contract.totalSupply(tokenAddress);
    expect(totalSupply).to.equal(TOTAL_SUPPLY);
  });

  it('should be able to get token balance of any account', async function () {
    const contractOwnerBalance = await erc20Contract.balanceOf(
      tokenAddress,
      await tokenCreateContract.getAddress()
    );
    const wallet1Balance = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    const wallet2Balance = await erc20Contract.balanceOf(
      tokenAddress,
      signers[1].address
    );

    expect(contractOwnerBalance).to.exist;
    expect(contractOwnerBalance).to.eq(0);
    expect(wallet1Balance).to.exist;
    expect(wallet1Balance).to.eq(TOTAL_SUPPLY);
    expect(wallet2Balance).to.exist;
    expect(wallet2Balance).to.eq(0);
  });

  it('should NOT be able to use transfer', async function () {
    const signers = await ethers.getSigners();
    const amount = 200;

    const contractOwnerBalanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      await tokenCreateContract.getAddress()
    );
    const wallet1BalanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    const wallet2BalanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      signers[1].address
    );

    try {
      const tx = await erc20Contract
        .connect(signers[0])
        .transfer(
          tokenAddress,
          signers[1].address,
          amount,
          Constants.GAS_LIMIT_1_000_000
        );
      await tx.wait();
    } catch (e) {
      expect(e).to.exist;
      expect(e.code).to.eq(Constants.CALL_EXCEPTION);
    }

    const contractOwnerBalanceAfter = await erc20Contract.balanceOf(
      tokenAddress,
      await tokenCreateContract.getAddress()
    );
    const wallet1BalanceAfter = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    const wallet2BalanceAfter = await erc20Contract.balanceOf(
      tokenAddress,
      signers[1].address
    );

    expect(contractOwnerBalanceBefore).to.eq(contractOwnerBalanceAfter);
    expect(wallet1BalanceBefore).to.eq(wallet1BalanceAfter);
    expect(wallet2BalanceBefore).to.eq(wallet2BalanceAfter);
  });

  it('should NOT be able to use delegateTransfer', async function () {
    const signers = await ethers.getSigners();
    const amount = 200;

    const wallet1BalanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    const wallet2BalanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      signers[1].address
    );

    try {
      const tx = await erc20Contract
        .connect(signers[0])
        .delegateTransfer(
          tokenAddress,
          signers[1].address,
          amount,
          Constants.GAS_LIMIT_1_000_000
        );
      await tx.wait();
    } catch (e) {
      expect(e).to.exist;
      expect(e.code).to.eq(Constants.CALL_EXCEPTION);
    }

    const wallet1BalanceAfter = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    const wallet2BalanceAfter = await erc20Contract.balanceOf(
      tokenAddress,
      signers[1].address
    );

    expect(wallet1BalanceBefore).to.eq(wallet1BalanceAfter);
    expect(wallet2BalanceBefore).to.eq(wallet2BalanceAfter);
  });

  it('should NOT be able to use approve', async function () {
    const signers = await ethers.getSigners();
    const approvedAmount = 200;

    const allowanceBefore = await erc20Contract.allowance(
      tokenAddress,
      signers[0].address,
      signers[1].address
    );
    expect(allowanceBefore).to.eq(0);

    try {
      const tx = await erc20Contract
        .connect(signers[0])
        .approve(
          tokenAddress,
          signers[1].address,
          approvedAmount,
          Constants.GAS_LIMIT_1_000_000
        );
      await tx.wait();
    } catch (e) {
      expect(e).to.exist;
      expect(e.code).to.eq(Constants.CALL_EXCEPTION);
    }

    const allowanceAfter = await erc20Contract.allowance(
      tokenAddress,
      signers[0].address,
      signers[1].address
    );
    expect(allowanceAfter).to.eq(0);
  });

  it('should NOT be able to use delegateApprove and allowance', async function () {
    const signers = await ethers.getSigners();
    const approvedAmount = 200;

    const allowanceBefore = await erc20Contract.allowance(
      tokenAddress,
      signers[0].address,
      signers[1].address
    );
    expect(allowanceBefore).to.eq(0);

    try {
      const tx = await erc20Contract
        .connect(signers[0])
        .delegateApprove(
          tokenAddress,
          signers[1].address,
          approvedAmount,
          Constants.GAS_LIMIT_1_000_000
        );
      await tx.wait();
    } catch (e) {
      expect(e).to.exist;
      expect(e.code).to.eq(Constants.CALL_EXCEPTION);
    }

    const allowanceAfter = await erc20Contract.allowance(
      tokenAddress,
      signers[0].address,
      signers[1].address
    );
    expect(allowanceAfter).to.eq(allowanceBefore);
  });

  it('should NOT be able to use delegateTransferFrom', async function () {
    const signers = await ethers.getSigners();
    const amount = 50;

    const wallet1BalanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    const wallet2BalanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      signers[1].address
    );
    const allowanceBefore = await erc20Contract.allowance(
      tokenAddress,
      signers[0].address,
      signers[1].address
    );

    try {
      const tx = await erc20Contract
        .connect(signers[1])
        .delegateTransferFrom(
          tokenAddress,
          signers[0].address,
          signers[1].address,
          amount,
          Constants.GAS_LIMIT_1_000_000
        );
      await tx.wait();
    } catch (e) {
      expect(e).to.exist;
      expect(e.code).to.eq(Constants.CALL_EXCEPTION);
    }

    const wallet1BalanceAfter = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    const wallet2BalanceAfter = await erc20Contract.balanceOf(
      tokenAddress,
      signers[1].address
    );
    const allowanceAfter = await erc20Contract.allowance(
      tokenAddress,
      signers[0].address,
      signers[1].address
    );

    expect(allowanceAfter).to.eq(allowanceBefore);
    expect(wallet1BalanceBefore).to.eq(wallet1BalanceAfter);
    expect(wallet2BalanceBefore).to.eq(wallet2BalanceAfter);
  });
});
// Filename: test/system-contracts/hedera-token-service/erc-20/IERC20.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');
const {
  pollForNewBalance,
  pollForNewSignerBalance,
} = require('../../../../utils/helpers');

describe('IERC20 Test Suite', function () {
  let tokenCreateContract;
  let tokenTransferContract;
  let tokenAddress;
  let IERC20;
  let signers;
  const TOTAL_SUPPLY = BigInt(10000000000);
  const AMOUNT = BigInt(33);

  before(async function () {
    signers = await ethers.getSigners();
    tokenCreateContract = await utils.deployTokenCreateContract();
    tokenTransferContract = await utils.deployTokenTransferContract();
    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    tokenAddress = await utils.createFungibleToken(
      tokenCreateContract,
      signers[0].address
    );
    await utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    await utils.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.grantTokenKyc(tokenCreateContract, tokenAddress);
    IERC20 = await ethers.getContractAt(
      Constants.Contract.OZERC20Mock,
      tokenAddress
    );
  });

  it('should be able to get token name', async function () {
    const name = await IERC20.name();
    expect(name).to.equal(Constants.TOKEN_NAME);
  });

  it('should be able to get token symbol', async function () {
    const symbol = await IERC20.symbol();
    expect(symbol).to.equal(Constants.TOKEN_SYMBOL);
  });

  it('should be able to get token decimals', async function () {
    const decimals = await IERC20.decimals();
    expect(decimals).to.equal(0);
  });

  it('should be able to get token totalSupply', async function () {
    const totalSupply = await IERC20.totalSupply();
    expect(totalSupply).to.equal(TOTAL_SUPPLY);
  });

  it('should be able to get token balance of any account', async function () {
    const contractOwnerBalance = await IERC20.balanceOf(
      await tokenCreateContract.getAddress()
    );
    const signer0Balance = await IERC20.balanceOf(signers[0].address);
    const signer1Balance = await IERC20.balanceOf(signers[1].address);

    expect(contractOwnerBalance).to.exist;
    expect(contractOwnerBalance).to.eq(0);
    expect(signer0Balance).to.exist;
    expect(signer0Balance).to.eq(TOTAL_SUPPLY);
    expect(signer1Balance).to.exist;
    expect(signer1Balance).to.eq(0);
  });

  it('should be able to approve another account', async function () {
    const signer1AllowanceBefore = await IERC20.allowance(
      signers[0].address,
      signers[1].address
    );
    await IERC20.approve(
      signers[1].address,
      AMOUNT,
      Constants.GAS_LIMIT_800000
    );
    const signer1AllowanceAfter = await IERC20.allowance(
      signers[0].address,
      signers[1].address
    );

    expect(signer1AllowanceBefore).to.eq(0);
    expect(signer1AllowanceAfter).to.eq(AMOUNT);
  });

  it('should be able to transfer tokens to another account', async function () {
    const signer0BalanceBefore = await IERC20.balanceOf(signers[0].address);
    const signer1BalanceBefore = await IERC20.balanceOf(signers[1].address);
    await IERC20.transfer(signers[1].address, AMOUNT);

    const signer0BalanceAfter = await pollForNewSignerBalance(
      IERC20,
      signers[0].address,
      signer0BalanceBefore
    );
    const signer1BalanceAfter = await IERC20.balanceOf(signers[1].address);

    expect(signer0BalanceAfter).to.eq(signer0BalanceBefore - AMOUNT);
    expect(signer1BalanceAfter).to.eq(signer1BalanceBefore + AMOUNT);
  });

  it('should be able to execute transferFrom to another account', async function () {
    const tokenCreateBalanceBefore = await IERC20.balanceOf(
      await tokenCreateContract.getAddress()
    );
    const signer0BalanceBefore = await IERC20.balanceOf(signers[0].address);
    const signer1BalanceBefore = await IERC20.balanceOf(signers[1].address);

    await IERC20.approve(
      signers[1].address,
      AMOUNT,
      Constants.GAS_LIMIT_800000
    );
    const IERC20Signer1 = await IERC20.connect(signers[1]);
    await IERC20Signer1.transferFrom(
      signers[0].address,
      await tokenCreateContract.getAddress(),
      AMOUNT,
      Constants.GAS_LIMIT_800000
    );

    const tokenCreateBalanceAfter = await pollForNewBalance(
      IERC20,
      await tokenCreateContract.getAddress(),
      tokenCreateBalanceBefore
    );
    const signer0BalanceAfter = await pollForNewSignerBalance(
      IERC20,
      signers[0].address,
      signer0BalanceBefore
    );
    const signer1BalanceAfter = await IERC20.balanceOf(signers[1].address);

    expect(tokenCreateBalanceAfter).to.eq(tokenCreateBalanceBefore + AMOUNT);
    expect(signer0BalanceAfter).to.eq(signer0BalanceBefore - AMOUNT);
    expect(signer1BalanceAfter).to.eq(signer1BalanceBefore);
  });
});
// Filename: test/system-contracts/hedera-token-service/erc-721/ERC721Contract.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');

describe('ERC721Contract Test Suite', function () {
  let tokenCreateContract;
  let tokenTransferContract;
  let tokenAddress;
  let erc721Contract;
  let mintedTokenSerialNumber;
  let nftInitialOwnerAddress;
  let signers, firstWallet, secondWallet;

  before(async function () {
    signers = await ethers.getSigners();
    tokenCreateContract = await utils.deployTokenCreateContract();
    tokenTransferContract = await utils.deployTokenTransferContract();
    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    erc721Contract = await utils.deployERC721Contract();
    tokenAddress = await utils.createNonFungibleToken(
      tokenCreateContract,
      signers[0].address
    );
    await utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    mintedTokenSerialNumber = await utils.mintNFT(
      tokenCreateContract,
      tokenAddress
    );
    await utils.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.grantTokenKyc(tokenCreateContract, tokenAddress);
    firstWallet = signers[0];
    secondWallet = signers[1];

    await tokenCreateContract.associateTokenPublic(
      await erc721Contract.getAddress(),
      tokenAddress,
      Constants.GAS_LIMIT_1_000_000
    );

    await tokenCreateContract.grantTokenKycPublic(
      tokenAddress,
      await erc721Contract.getAddress(),
      Constants.GAS_LIMIT_1_000_000
    );

    await tokenTransferContract.transferNFTPublic(
      tokenAddress,
      await tokenCreateContract.getAddress(),
      signers[0].address,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000
    );
    nftInitialOwnerAddress = signers[0].address;
  });

  it('should be able to get token name', async function () {
    const name = await erc721Contract.name(tokenAddress);
    expect(name).to.equal(Constants.TOKEN_NAME);
  });

  it('should be able to get token symbol', async function () {
    const symbol = await erc721Contract.symbol(tokenAddress);
    expect(symbol).to.equal(Constants.TOKEN_SYMBOL);
  });

  it('should be able to get token totalSupply', async function () {
    const totalSupply = await erc721Contract.totalSupply(tokenAddress);
    expect(totalSupply).to.equal(1);
  });

  it('should be able to get token uri via tokenURI', async function () {
    const tokenURI = await erc721Contract.tokenURI(
      tokenAddress,
      mintedTokenSerialNumber
    );
    expect(tokenURI).to.equal('\u0001');
  });

  it('should be able to execute ownerOf', async function () {
    const owner = await erc721Contract.ownerOf(
      tokenAddress,
      mintedTokenSerialNumber
    );
    expect(owner).to.equal(nftInitialOwnerAddress);
  });

  it('should be able to execute balanceOf', async function () {
    const balance = await erc721Contract.balanceOf(
      tokenAddress,
      nftInitialOwnerAddress
    );
    expect(balance).to.equal(1);
  });

  it('should be able to execute getApproved', async function () {
    const approved = await erc721Contract.getApproved(
      tokenAddress,
      mintedTokenSerialNumber
    );
    expect(approved).to.equal('0x0000000000000000000000000000000000000000');
  });

  it('should NOT be able to execute delegateSetApprovalForAll and isApprovedForAll', async function () {
    const secondWallet = (await ethers.getSigners())[1];
    const isApprovedForAllBefore = await erc721Contract.isApprovedForAll(
      tokenAddress,
      firstWallet.address,
      secondWallet.address
    );
    await erc721Contract.delegateSetApprovalForAll(
      tokenAddress,
      secondWallet.address,
      true,
      Constants.GAS_LIMIT_1_000_000
    );
    const isApprovedForAllAfter = await erc721Contract.isApprovedForAll(
      tokenAddress,
      firstWallet.address,
      secondWallet.address
    );

    expect(isApprovedForAllBefore).to.equal(false);
    expect(isApprovedForAllAfter).to.not.equal(true);
  });

  it('should be able to execute delegate transferFrom', async function () {
    const ownerBefore = await erc721Contract.ownerOf(
      tokenAddress,
      mintedTokenSerialNumber
    );
    const erc721ContractNFTOwner = await ethers.getContractAt(
      Constants.Contract.ERC721Contract,
      await erc721Contract.getAddress(),
      firstWallet
    );
    await erc721ContractNFTOwner.delegateTransferFrom(
      tokenAddress,
      firstWallet.address,
      secondWallet.address,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000
    );
    const ownerAfter = await erc721Contract.ownerOf(
      tokenAddress,
      mintedTokenSerialNumber
    );

    expect(ownerBefore).to.equal(firstWallet.address);
    expect(ownerAfter).to.not.equal(secondWallet.address);
  });

  it('should be able to delegate approve', async function () {
    const erc721ContractNFTOwner = await ethers.getContractAt(
      Constants.Contract.ERC721Contract,
      await erc721Contract.getAddress(),
      secondWallet
    );
    const beforeApproval = await erc721ContractNFTOwner.getApproved(
      tokenAddress,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000
    );
    await erc721ContractNFTOwner.delegateApprove(
      tokenAddress,
      firstWallet.address,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000
    );
    const afterApproval = await erc721ContractNFTOwner.getApproved(
      tokenAddress,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000
    );

    expect(beforeApproval).to.equal(
      '0x0000000000000000000000000000000000000000'
    );
    expect(afterApproval).to.not.equal(firstWallet.address);
  });

  describe('Unsupported operations', async function () {
    let serialNumber;

    before(async function () {
      serialNumber = await utils.mintNFT(tokenCreateContract, tokenAddress, [
        '0x02',
      ]);
      await tokenTransferContract.transferNFTPublic(
        tokenAddress,
        await tokenCreateContract.getAddress(),
        signers[0].address,
        serialNumber,
        Constants.GAS_LIMIT_1_000_000
      );
    });

    it('should NOT be able to execute approve', async function () {
      const erc721ContractNFTOwner = await ethers.getContractAt(
        Constants.Contract.ERC721Contract,
        await erc721Contract.getAddress(),
        secondWallet
      );
      const beforeApproval = await erc721ContractNFTOwner.getApproved(
        tokenAddress,
        serialNumber,
        Constants.GAS_LIMIT_1_000_000
      );
      await utils.expectToFail(
        erc721ContractNFTOwner.approve(
          tokenAddress,
          firstWallet.address,
          serialNumber,
          Constants.GAS_LIMIT_1_000_000
        ),
        Constants.CALL_EXCEPTION
      );
      const afterApproval = await erc721ContractNFTOwner.getApproved(
        tokenAddress,
        serialNumber,
        Constants.GAS_LIMIT_1_000_000
      );

      expect(beforeApproval).to.equal(
        '0x0000000000000000000000000000000000000000'
      );
      expect(afterApproval).to.equal(
        '0x0000000000000000000000000000000000000000'
      );
    });

    it('should NOT be able to execute transferFrom', async function () {
      const ownerBefore = await erc721Contract.ownerOf(
        tokenAddress,
        serialNumber
      );
      const erc721ContractNFTOwner = await ethers.getContractAt(
        Constants.Contract.ERC721Contract,
        await erc721Contract.getAddress(),
        firstWallet
      );
      await utils.expectToFail(
        erc721ContractNFTOwner.transferFrom(
          tokenAddress,
          firstWallet.address,
          secondWallet.address,
          serialNumber,
          Constants.GAS_LIMIT_1_000_000
        ),
        Constants.CALL_EXCEPTION
      );
      const ownerAfter = await erc721Contract.ownerOf(
        tokenAddress,
        serialNumber
      );

      expect(ownerBefore).to.equal(firstWallet.address);
      expect(ownerAfter).to.equal(firstWallet.address);
    });

    it('should NOT be able call tokenByIndex', async function () {
      await utils.expectToFail(
        erc721Contract.tokenByIndex(tokenAddress, 0),
        Constants.CONTRACT_REVERT_EXECUTED_CODE
      );
    });

    it('should NOT be able call tokenOfOwnerByIndex', async function () {
      await utils.expectToFail(
        erc721Contract.tokenOfOwnerByIndex(
          tokenAddress,
          firstWallet.address,
          0
        ),
        Constants.CONTRACT_REVERT_EXECUTED_CODE
      );
    });

    it('should NOT be able execute safeTransferFrom', async function () {
      const tx = erc721Contract.safeTransferFrom(
        tokenAddress,
        firstWallet.address,
        secondWallet.address,
        mintedTokenSerialNumber,
        Constants.GAS_LIMIT_1_000_000
      );
      await utils.expectToFail(tx, Constants.CALL_EXCEPTION);
    });

    it('should NOT be able execute safeTransferFromWithData', async function () {
      const tx = erc721Contract.safeTransferFromWithData(
        tokenAddress,
        firstWallet.address,
        secondWallet.address,
        mintedTokenSerialNumber,
        '0x01',
        Constants.GAS_LIMIT_1_000_000
      );
      await utils.expectToFail(tx, Constants.CALL_EXCEPTION);
    });
  });
});
// Filename: test/system-contracts/hedera-token-service/hrc-719/HRC719Contract.js
// SPDX-License-Identifier: Apache-2.0

const Constants = require('../../../constants');
const { Contract } = require('ethers');
const { expect } = require('chai');
const hre = require('hardhat');
const { ethers } = hre;
const utils = require('../utils');

describe('@HRC-719 Test Suite', function () {
  let tokenCreateContract;
  let tokenAddress;
  let hrc719Contract;
  let signers;
  let hrcToken;
  let IHRC719;

  const parseCallResponseEventData = async (tx) => {
    return (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.CallResponseEvent
    )[0].args;
  };

  const decodeHexToDec = (message) => {
    message = message.replace(/^0x/, '');
    return parseInt(message, 16);
  };

  before(async function () {
    signers = await ethers.getSigners();
    tokenCreateContract = await utils.deployTokenCreateContract();
    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
    ]);

    hrc719Contract = await utils.deployHRC719Contract();

    IHRC719 = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC719')).abi
    );
  });

  beforeEach(async () => {
    // create new tokenAddress for every unit test
    tokenAddress = await utils.createFungibleToken(
      tokenCreateContract,
      signers[0].address
    );
    await utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
    ]);

    // create a contract object for the token
    hrcToken = new Contract(tokenAddress, IHRC719, signers[0]);
  });

  describe('HRC719 wrapper contract', () => {
    it('should be able to associate() to the token from a contract', async function () {
      const txAssociate = await hrc719Contract.associate(
        tokenAddress,
        Constants.GAS_LIMIT_1_000_000
      );
      const receiptAssociate = await txAssociate.wait();
      expect(receiptAssociate).to.exist;
      expect(receiptAssociate.status).to.eq(1);
    });

    it('should be able to disssociate() to the token from a contract', async function () {
      const txDissociate = await hrc719Contract.dissociate(
        tokenAddress,
        Constants.GAS_LIMIT_1_000_000
      );
      const receiptDissociate = await txDissociate.wait();
      expect(receiptDissociate).to.exist;
      expect(receiptDissociate.status).to.eq(1);
    });

    it('should be able to call isAssociated()', async function () {
      const txIsAssociate = await hrc719Contract
        .connect(signers[1])
        .isAssociated(tokenAddress, Constants.GAS_LIMIT_1_000_000);
      const receiptIsAssociate = await txIsAssociate.wait();
      const logIsAssociate = receiptIsAssociate.logs.find(
        (log) => log.fragment.name === Constants.Events.IsAssociated
      );

      expect(logIsAssociate).to.exist;
      expect(logIsAssociate.args[0]).to.eq(false);
    });

    it('should be able to call isAssociated() after token association', async function () {
      const txAssociate = await hrc719Contract
        .connect(signers[1])
        .associate(tokenAddress, Constants.GAS_LIMIT_1_000_000);
      await txAssociate.wait();

      const txIsAssociate = await hrc719Contract
        .connect(signers[1])
        .isAssociated(tokenAddress, Constants.GAS_LIMIT_1_000_000);
      const receiptIsAssociate = await txIsAssociate.wait();
      const logIsAssociate = receiptIsAssociate.logs.find(
        (log) => log.fragment.name === Constants.Events.IsAssociated
      );

      expect(logIsAssociate).to.exist;
      expect(logIsAssociate.args[0]).to.eq(true);
    });

    it('should be able to call isAssociated() after token dissociation', async function () {
      const txAssociate = await hrc719Contract
        .connect(signers[1])
        .dissociate(tokenAddress, Constants.GAS_LIMIT_1_000_000);
      await txAssociate.wait();

      const txIsAssociate = await hrc719Contract
        .connect(signers[1])
        .isAssociated(tokenAddress, Constants.GAS_LIMIT_1_000_000);
      const receiptIsAssociate = await txIsAssociate.wait();
      const logIsAssociate = receiptIsAssociate.logs.find(
        (log) => log.fragment.name === Constants.Events.IsAssociated
      );

      expect(logIsAssociate).to.exist;
      expect(logIsAssociate.args[0]).to.eq(false);
    });
  });

  describe('HRC719 Token', () => {
    it('should be able to associate() to the token from an EOA', async function () {
      const txAssociate = await hrcToken.associate(
        Constants.GAS_LIMIT_1_000_000
      );
      const receiptAssociate = await txAssociate.wait();
      expect(receiptAssociate).to.exist;
      expect(receiptAssociate.status).to.eq(1);
    });

    it('should be able to dissociate() to the token from an EOA', async function () {
      const txDissociate = await hrcToken.dissociate(
        Constants.GAS_LIMIT_1_000_000
      );
      const receiptDissociate = await txDissociate.wait();

      expect(receiptDissociate).to.exist;
      expect(receiptDissociate.status).to.eq(1);
    });

    // @notice: skip as IHRC719.isAssociated() is not yet supported by mirror node
    // @notice: should not be skipped when the feature is fully implemented in mirror node
    // @notice: track by https://github.com/hashgraph/hedera-smart-contracts/issues/948
    xit('should be able to call isAssociated() to the token from an EOA', async function () {
      const hrcTokenSigner1 = new Contract(tokenAddress, IHRC719, signers[1]);
      const isAssociatedSigner1 = await hrcTokenSigner1.isAssociated();
      expect(isAssociatedSigner1).to.be.false;
    });

    // @notice: skip as IHRC719.isAssociated() is not yet supported by mirror node
    // @notice: should not be skipped when the feature is fully implemented in mirror node
    // @notice: track by https://github.com/hashgraph/hedera-smart-contracts/issues/948
    xit('should be able to call isAssociated() to the token from an EOA when associated', async function () {
      const hrcTokenSigner1 = new Contract(tokenAddress, IHRC719, signers[1]);

      const txAssociate = await hrcTokenSigner1.associate(
        Constants.GAS_LIMIT_1_000_000
      );
      await txAssociate.wait();

      const isAssociated = await hrcTokenSigner1.isAssociated();
      expect(isAssociated).to.exist;
      expect(isAssociated).to.eq(true);
    });

    // @notice: skip as IHRC719.isAssociated() is not yet supported by mirror node
    // @notice: should not be skipped when the feature is fully implemented in mirror node
    // @notice: track by https://github.com/hashgraph/hedera-smart-contracts/issues/948
    xit('should be able to call isAssociated() to the token from an EOA when dissociated', async function () {
      const hrcTokenSigner1 = new Contract(tokenAddress, IHRC719, signers[1]);

      const txAssociate = await hrcTokenSigner1.dissociate(
        Constants.GAS_LIMIT_1_000_000
      );
      await txAssociate.wait();

      const isAssociated = await hrcTokenSigner1.isAssociated();
      expect(isAssociated).to.exist;
      expect(isAssociated).to.eq(false);
    });
  });

  describe('redirectoForToken', () => {
    it('should be able to execute associate() via redirectForToken', async function () {
      const encodedFunc = IHRC719.encodeFunctionData('associate()');
      const tx = await tokenCreateContract.redirectForToken(
        tokenAddress,
        encodedFunc,
        Constants.GAS_LIMIT_1_000_000
      );
      const [success, result] = await parseCallResponseEventData(tx);
      expect(success).to.eq(true);
      expect(decodeHexToDec(result)).to.eq(Constants.TX_SUCCESS_CODE);
    });

    it('should be able to execute dissociate() via redirectForToken', async function () {
      // first associate the token before dissociate other wise get response_code = 184 instead of 22 (success)
      const encodedFuncAssociate = IHRC719.encodeFunctionData('associate()');
      const associateTx = await tokenCreateContract.redirectForToken(
        tokenAddress,
        encodedFuncAssociate,
        Constants.GAS_LIMIT_1_000_000
      );
      await associateTx.wait();

      const enCodedFuncDissociate = IHRC719.encodeFunctionData('dissociate()');
      const dissociateTx = await tokenCreateContract.redirectForToken(
        tokenAddress,
        enCodedFuncDissociate,
        Constants.GAS_LIMIT_1_000_000
      );

      const [success, result] = await parseCallResponseEventData(dissociateTx);
      expect(success).to.eq(true);
      expect(decodeHexToDec(result)).to.eq(Constants.TX_SUCCESS_CODE);
    });

    it('should be able to execute isAssociated() via redirectForToken', async function () {
      const encodedFunc = IHRC719.encodeFunctionData('isAssociated()');
      const tx = await tokenCreateContract.redirectForToken(
        tokenAddress,
        encodedFunc,
        Constants.GAS_LIMIT_1_000_000
      );
      const [success, result] = await parseCallResponseEventData(tx);
      expect(success).to.eq(true);
      expect(decodeHexToDec(result)).to.eq(0); // 0 = false
    });

    it('should be able to execute isAssociated() after association via redirectForToken', async function () {
      await (
        await tokenCreateContract.redirectForToken(
          tokenAddress,
          IHRC719.encodeFunctionData('associate()'),
          Constants.GAS_LIMIT_1_000_000
        )
      ).wait();

      const encodedFunc = IHRC719.encodeFunctionData('isAssociated()');
      const tx = await tokenCreateContract.redirectForToken(
        tokenAddress,
        encodedFunc,
        Constants.GAS_LIMIT_1_000_000
      );
      const [success, result] = await parseCallResponseEventData(tx);
      expect(success).to.eq(true);
      expect(decodeHexToDec(result)).to.eq(1); // 1 = true
    });
  });
});
// Filename: test/system-contracts/hedera-token-service/hrc-904/AirdropContract.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');

describe('HIP904Batch1 AirdropContract Test Suite', function () {
  let airdropContract;
  let tokenCreateContract;
  let erc20Contract;
  let erc721Contract;
  let tokenAddress;
  let nftTokenAddress;
  let signers;
  let owner;
  let accounts;
  let contractAddresses;

  before(async function () {
    signers = await ethers.getSigners();
    airdropContract = await utils.deployContract(Constants.Contract.Airdrop);
    tokenCreateContract = await utils.deployContract(
      Constants.Contract.TokenCreateContract
    );
    erc20Contract = await utils.deployContract(
      Constants.Contract.ERC20Contract
    );
    erc721Contract = await utils.deployContract(
      Constants.Contract.ERC721Contract
    );
    owner = signers[0].address;
    accounts = signers.slice(1, 3).map((s) => s.address);

    contractAddresses = [
      await airdropContract.getAddress(),
      await tokenCreateContract.getAddress(),
    ];
    await utils.updateAccountKeysViaHapi(contractAddresses);

    tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );
  });

  it('should airdrop a fungible token (FT) to a single account', async function () {
    const ftAmount = BigInt(1);
    const receiver = signers[1].address;
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const initialBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver
    );

    const tx = await airdropContract.tokenAirdrop(
      tokenAddress,
      signers[0].address,
      receiver,
      ftAmount,
      Constants.GAS_LIMIT_2_000_000
    );
    await tx.wait();

    const updatedBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver
    );
    expect(updatedBalance).to.equal(initialBalance + ftAmount);
  });

  it('should airdrop a non-fungible token (NFT) to a single account', async function () {
    const receiver = signers[1].address;

    const serial = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );

    const txNFT = await airdropContract.nftAirdrop(
      nftTokenAddress,
      owner,
      receiver,
      serial,
      Constants.GAS_LIMIT_5_000_000
    );
    await txNFT.wait();

    const nftOwner = await erc721Contract.ownerOf(nftTokenAddress, serial);
    expect(nftOwner).to.equal(receiver);
  });

  it('should airdrop fungible token (FT) to a single account using distribute', async function () {
    const ftAmount = BigInt(1);
    const receiver = signers[1].address;
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const initialBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver
    );

    const tx = await airdropContract.tokenAirdropDistribute(
      tokenAddress,
      owner,
      [receiver],
      ftAmount,
      Constants.GAS_LIMIT_5_000_000
    );
    await tx.wait();

    const updatedBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver
    );
    expect(updatedBalance).to.equal(initialBalance + ftAmount);
  });

  it('should airdrop fungible tokens (FT) to multiple accounts', async function () {
    const ftAmount = BigInt(1);
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const getBalances = async () =>
      Promise.all(
        accounts.map((account) =>
          erc20Contract.balanceOf(tokenAddress, account)
        )
      );

    const initialBalances = await getBalances();

    const tx = await airdropContract.tokenAirdropDistribute(
      tokenAddress,
      owner,
      accounts,
      ftAmount,
      Constants.GAS_LIMIT_5_000_000
    );
    await tx.wait();

    const updatedBalances = await getBalances();

    updatedBalances.forEach((balance, index) => {
      expect(balance).to.equal(initialBalances[index] + ftAmount);
    });
  });

  it('should airdrop non-fungible token (NFT) to a single account using distribute', async function () {
    const receiver = signers[1].address;
    const serial = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );

    const txNFT = await airdropContract.nftAirdropDistribute(
      nftTokenAddress,
      owner,
      [receiver],
      [serial],
      Constants.GAS_LIMIT_5_000_000
    );
    await txNFT.wait();

    const nftOwner = await erc721Contract.ownerOf(nftTokenAddress, serial);
    expect(nftOwner).to.equal(receiver);
  });

  it('should airdrop non-fungible tokens (NFT) to multiple accounts', async function () {
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const serials = [];
    serials.push(
      await utils.mintNFTToAddress(tokenCreateContract, nftTokenAddress)
    );
    serials.push(
      await utils.mintNFTToAddress(tokenCreateContract, nftTokenAddress)
    );

    const txNFT = await airdropContract.nftAirdropDistribute(
      nftTokenAddress,
      owner,
      accounts,
      serials,
      Constants.GAS_LIMIT_5_000_000
    );

    await txNFT.wait();

    const updatedNFTBalances = await Promise.all([
      erc721Contract.ownerOf(nftTokenAddress, serials[0]),
      erc721Contract.ownerOf(nftTokenAddress, serials[1]),
    ]);

    for (let i = 0; i < accounts.length; i++) {
      expect(updatedNFTBalances[i]).to.equal(accounts[i]);
    }
  });

  it('should airdrop 10 tokens to multiple accounts', async function () {
    const ftAmount = BigInt(1);
    const tokens = [];
    // Every accountAmount counts as 1 transfer so 5x2=10
    for (let i = 0; i < 5; i++) {
      tokens.push(
        await utils.setupToken(tokenCreateContract, owner, contractAddresses)
      );
    }
    for (let i = 0; i < accounts.length; i++) {
      const tx = await airdropContract.multipleFtAirdrop(
        tokens,
        owner,
        accounts[i],
        ftAmount,
        Constants.GAS_LIMIT_2_000_000
      );
      await tx.wait();
      for (let j = 0; j < tokens.length; j++) {
        const balance = await erc20Contract.balanceOf(tokens[j], accounts[i]);
        expect(balance).to.equal(ftAmount);
      }
    }
  });

  it('should airdrop 10 NFTs to multiple accounts', async function () {
    async function createNFTs(count) {
      const tokens = [];
      const serials = [];
      for (let i = 0; i < count; i++) {
        const tokenAddress = await utils.setupNft(
          tokenCreateContract,
          owner,
          contractAddresses
        );
        const serial = await utils.mintNFTToAddress(
          tokenCreateContract,
          tokenAddress
        );
        tokens.push(tokenAddress);
        serials.push(serial);
      }
      return { tokens, serials };
    }

    async function performAirdropAndValidate(receiver, nftTokens, nftSerials) {
      const tx = await airdropContract.multipleNftAirdrop(
        nftTokens,
        owner,
        receiver,
        nftSerials,
        Constants.GAS_LIMIT_2_000_000
      );
      await tx.wait();

      for (let i = 0; i < nftTokens.length; i++) {
        const nftOwner = await erc721Contract.ownerOf(
          nftTokens[i],
          nftSerials[i]
        );
        expect(nftOwner).to.equal(receiver);
      }
    }

    // Create and airdrop 10 NFTs to the first account
    const { tokens: nftTokens1, serials: nftSerials1 } = await createNFTs(10);
    await performAirdropAndValidate(accounts[0], nftTokens1, nftSerials1);

    // Create and airdrop 10 NFTs to the second account
    const { tokens: nftTokens2, serials: nftSerials2 } = await createNFTs(10);
    await performAirdropAndValidate(accounts[1], nftTokens2, nftSerials2);
  });

  it('should fail when the sender does not have enough balance', async function () {
    const ftAmount = BigInt(100_000_000_000_000_000);
    const receiver = signers[1].address;

    const tx = await airdropContract.tokenAirdrop(
      tokenAddress,
      signers[2].address,
      receiver,
      ftAmount,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('178'); // INSUFFICIENT_TOKEN_BALANCE code
  });

  it('should fail when the receiver does not have a valid account', async function () {
    const invalidReceiver = '0x000000000000000000000000000000000000dead';
    const mintedTokenSerialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );

    const txNFT = await airdropContract.nftAirdrop(
      nftTokenAddress,
      owner,
      invalidReceiver,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(txNFT.hash);
    expect(responseCode).to.eq('15'); // INVALID_ACCOUNT_ID code
  });

  it('should fail when the token does not exist', async function () {
    const receiver = signers[1].address;
    const invalidToken = '0xdead00000000000000000000000000000000dead';
    const txNFT = await airdropContract.nftAirdrop(
      invalidToken,
      owner,
      receiver,
      1,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(txNFT.hash);
    expect(responseCode).to.eq('167'); // INVALID_TOKEN_ID code
  });

  it('should fail when the airdrop amounts are out of bounds', async function () {
    const invalidAmount = BigInt(0);
    const receiver = signers[1].address;

    const tx = await airdropContract.tokenAirdrop(
      tokenAddress,
      signers[0].address,
      receiver,
      invalidAmount,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('50'); // INVALID_TRANSACTION_BODY code
  });

  it('should fail when 11 or more NFT airdrops are provided', async function () {
    const nftTokens = [];
    const nftSerials = [];
    for (let i = 0; i < 11; i++) {
      const tokenAddress = await utils.setupNft(
        tokenCreateContract,
        owner,
        contractAddresses
      );
      const serial = await utils.mintNFTToAddress(
        tokenCreateContract,
        tokenAddress
      );
      nftTokens.push(tokenAddress);
      nftSerials.push(serial);
    }

    const tx = await airdropContract.multipleNftAirdrop(
      nftTokens,
      owner,
      signers[1].address,
      nftSerials,
      {
        gasLimit: 15_000_000,
      }
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    const responseText = utils.decimalToAscii(responseCode);
    expect(responseText).to.eq('TOKEN_REFERENCE_LIST_SIZE_LIMIT_EXCEEDED');
  });

  it('should fail when 11 or more token airdrops are provided', async function () {
    const ftAmount = BigInt(1);
    const tokens = [];
    for (let i = 0; i < 6; i++) {
      tokens.push(
        await utils.setupToken(tokenCreateContract, owner, contractAddresses)
      );
    }
    const tx = await airdropContract.multipleFtAirdrop(
      tokens,
      owner,
      signers[1].address,
      ftAmount,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    const responseText = utils.decimalToAscii(responseCode);
    expect(responseText).to.eq('TOKEN_REFERENCE_LIST_SIZE_LIMIT_EXCEEDED');
  });

  it('should handle airdrop to account with no available association slots', async function () {
    const ftAmount = BigInt(1);
    const receiver = ethers.Wallet.createRandom().connect(ethers.provider);
    await signers[0].sendTransaction({
      to: receiver.address,
      value: ethers.parseEther('100'),
    });
    const IHRC904AccountFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC904AccountFacade')).abi
    );

    walletIHRC904AccountFacade = new ethers.Contract(
      receiver.address,
      IHRC904AccountFacade,
      receiver
    );

    const disableAutoAssociations =
      await walletIHRC904AccountFacade.setUnlimitedAutomaticAssociations(
        false,
        Constants.GAS_LIMIT_2_000_000
      );
    await disableAutoAssociations.wait();

    const tx = await airdropContract.tokenAirdrop(
      tokenAddress,
      signers[0].address,
      receiver.address,
      ftAmount,
      {
        gasLimit: 2_000_000,
        value: Constants.ONE_HBAR,
      }
    );
    await tx.wait();

    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22');

    // The airdrop will be pending, so the balance should still be 0
    const balance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver.address
    );
    expect(balance).to.equal(0n);
  });
});
// Filename: test/system-contracts/hedera-token-service/hrc-904/CancelAirdropContract.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');

describe('HIP904Batch2 CancelAirdropContract Test Suite', function () {
  let airdropContract;
  let cancelAirdropContract;
  let tokenCreateContract;
  let erc20Contract;
  let erc721Contract;
  let signers;
  let owner;
  let receiver;
  let contractAddresses;

  before(async function () {
    signers = await ethers.getSigners();
    airdropContract = await utils.deployContract(Constants.Contract.Airdrop);
    cancelAirdropContract = await utils.deployContract(
      Constants.Contract.CancelAirdrop
    );

    receiver = ethers.Wallet.createRandom().connect(ethers.provider);

    // Send some HBAR to activate the account
    await signers[0].sendTransaction({
      to: receiver.address,
      value: ethers.parseEther('100'),
    });
    tokenCreateContract = await utils.deployContract(
      Constants.Contract.TokenCreateContract
    );
    erc20Contract = await utils.deployContract(
      Constants.Contract.ERC20Contract
    );
    erc721Contract = await utils.deployContract(
      Constants.Contract.ERC721Contract
    );
    owner = signers[0].address;

    contractAddresses = [
      await airdropContract.getAddress(),
      await tokenCreateContract.getAddress(),
      await cancelAirdropContract.getAddress(),
    ];

    await utils.updateAccountKeysViaHapi(contractAddresses);

    tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const IHRC904AccountFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC904AccountFacade')).abi
    );

    const walletIHRC904AccountFacade = new ethers.Contract(
      receiver.address,
      IHRC904AccountFacade,
      receiver
    );

    // Disabling automatic associations for receiver so all airdrops will be pending
    const disableAutoAssociations =
      await walletIHRC904AccountFacade.setUnlimitedAutomaticAssociations(
        false,
        {
          gasLimit: 2_000_000,
        }
      );
    await disableAutoAssociations.wait();
  });

  it('should cancel a single pending fungible token airdrop', async function () {
    const ftAmount = BigInt(1);
    const sender = signers[0].address;
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const initialBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver.address
    );

    const airdropTx = await airdropContract.tokenAirdrop(
      tokenAddress,
      sender,
      receiver.address,
      ftAmount,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdropTx.wait();

    const cancelTx = await cancelAirdropContract.cancelAirdrop(
      sender,
      receiver.address,
      tokenAddress,
      Constants.GAS_LIMIT_2_000_000
    );
    await cancelTx.wait();

    const updatedBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver.address
    );
    expect(updatedBalance).to.equal(initialBalance);
  });

  it('should cancel a single pending NFT airdrop', async function () {
    const sender = signers[0].address;
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const serialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );

    const airdropTx = await airdropContract.nftAirdrop(
      nftTokenAddress,
      sender,
      receiver.address,
      serialNumber,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdropTx.wait();

    const cancelTx = await cancelAirdropContract.cancelNFTAirdrop(
      sender,
      receiver.address,
      nftTokenAddress,
      serialNumber,
      Constants.GAS_LIMIT_2_000_000
    );
    await cancelTx.wait();

    const nftOwner = await erc721Contract.ownerOf(
      nftTokenAddress,
      serialNumber
    );
    expect(nftOwner).to.equal(sender);
  });

  it('should cancel multiple pending fungible token airdrops', async function () {
    const numAirdrops = 10;
    const { senders, receivers, tokens, serials, amounts } =
      await utils.createPendingAirdrops(
        numAirdrops,
        tokenCreateContract,
        owner,
        airdropContract,
        receiver
      );

    const initialBalances = await Promise.all(
      tokens.map(async (token) => erc20Contract.balanceOf(token, receiver))
    );

    const cancelTx = await cancelAirdropContract.cancelMultipleAirdrops(
      senders,
      receivers,
      tokens,
      serials,
      Constants.GAS_LIMIT_2_000_000
    );
    await cancelTx.wait();

    for (let i = 0; i < tokens.length; i++) {
      const updatedBalance = await erc20Contract.balanceOf(tokens[i], receiver);
      expect(updatedBalance).to.equal(initialBalances[i]);
    }
  });

  it('should fail when sender has no pending airdrops', async function () {
    const sender = signers[1].address;
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const tx = await cancelAirdropContract.cancelAirdrop(
      sender,
      receiver,
      tokenAddress,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail when sender account is invalid', async function () {
    const invalidSender = ethers.Wallet.createRandom().address;
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const tx = await cancelAirdropContract.cancelAirdrop(
      invalidSender,
      receiver,
      tokenAddress,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail when receiver account is invalid', async function () {
    const invalidReceiver = ethers.Wallet.createRandom().address;
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const tx = await cancelAirdropContract.cancelAirdrop(
      owner,
      invalidReceiver,
      tokenAddress,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail when token does not exist', async function () {
    const invalidToken = ethers.Wallet.createRandom().address;

    const tx = await cancelAirdropContract.cancelAirdrop(
      owner,
      receiver,
      invalidToken,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    const responseText = utils.decimalToAscii(responseCode);
    expect(responseText).to.eq('INVALID_TOKEN_ID');
  });

  it('should fail when NFT does not exist', async function () {
    const invalidNftToken = ethers.Wallet.createRandom().address;
    const serialNumber = 1;

    const tx = await cancelAirdropContract.cancelNFTAirdrop(
      owner,
      receiver,
      invalidNftToken,
      serialNumber,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    const responseText = utils.decimalToAscii(responseCode);
    expect(responseText).to.eq('INVALID_TOKEN_ID');
  });

  it('should fail when more than 10 pending airdrops provided', async function () {
    const { senders, receivers, tokens, serials } =
      await utils.createPendingAirdrops(
        11,
        tokenCreateContract,
        owner,
        airdropContract,
        receiver
      );

    const tx = await cancelAirdropContract.cancelMultipleAirdrops(
      senders,
      receivers,
      tokens,
      serials,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    const responseText = utils.decimalToAscii(responseCode);
    expect(responseText).to.eq('PENDING_AIRDROP_ID_LIST_TOO_LONG');
  });

  it('should fail when NFT serial number does not exist', async function () {
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const invalidSerialNumber = 999;

    const tx = await cancelAirdropContract.cancelNFTAirdrop(
      owner,
      receiver,
      nftTokenAddress,
      invalidSerialNumber,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });
});
// Filename: test/system-contracts/hedera-token-service/hrc-904/ClaimAirdropContract.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');

describe('HIP904Batch3 ClaimAirdropContract Test Suite', function () {
  let airdropContract;
  let claimAirdropContract;
  let tokenCreateContract;
  let erc20Contract;
  let erc721Contract;
  let signers;
  let owner;
  let receiver;
  let receiverPrivateKey;
  let contractAddresses;

  before(async function () {
    signers = await ethers.getSigners();
    airdropContract = await utils.deployContract(Constants.Contract.Airdrop);
    claimAirdropContract = await utils.deployContract(
      Constants.Contract.ClaimAirdrop
    );

    receiverPrivateKey = ethers.hexlify(ethers.randomBytes(32));
    receiver = new ethers.Wallet(receiverPrivateKey).connect(ethers.provider);

    // Send some HBAR to activate the account
    await signers[0].sendTransaction({
      to: receiver.address,
      value: ethers.parseEther('100'),
    });
    tokenCreateContract = await utils.deployContract(
      Constants.Contract.TokenCreateContract
    );
    erc20Contract = await utils.deployContract(
      Constants.Contract.ERC20Contract
    );
    erc721Contract = await utils.deployContract(
      Constants.Contract.ERC721Contract
    );
    owner = signers[0].address;
    contractAddresses = [
      await airdropContract.getAddress(),
      await tokenCreateContract.getAddress(),
      await claimAirdropContract.getAddress(),
    ];

    await utils.updateAccountKeysViaHapi(contractAddresses);

    await utils.updateAccountKeysViaHapi(contractAddresses, [
      receiverPrivateKey,
    ]);

    tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const IHRC904AccountFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC904AccountFacade')).abi
    );

    const walletIHRC904AccountFacade = new ethers.Contract(
      receiver.address,
      IHRC904AccountFacade,
      receiver
    );

    // Disabling automatic associations for receiver so all airdrops will be pending
    const disableAutoAssociations =
      await walletIHRC904AccountFacade.setUnlimitedAutomaticAssociations(
        false,
        {
          gasLimit: 2_000_000,
        }
      );
    await disableAutoAssociations.wait();
  });

  it('should claim a single pending fungible token airdrop', async function () {
    const ftAmount = BigInt(1);
    const sender = signers[0].address;
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const initialBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver.address
    );

    const airdropTx = await airdropContract.tokenAirdrop(
      tokenAddress,
      sender,
      receiver.address,
      ftAmount,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdropTx.wait();

    await utils.associateWithSigner(receiverPrivateKey, tokenAddress);
    const claimTx = await claimAirdropContract.claim(
      sender,
      receiver.address,
      tokenAddress,
      Constants.GAS_LIMIT_2_000_000
    );
    await claimTx.wait();

    const updatedBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver.address
    );
    expect(updatedBalance).to.equal(initialBalance + ftAmount);
  });

  it('should claim a single pending NFT airdrop', async function () {
    const sender = signers[0].address;
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const serialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );

    const airdropTx = await airdropContract.nftAirdrop(
      nftTokenAddress,
      sender,
      receiver.address,
      serialNumber,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdropTx.wait();

    const claimTx = await claimAirdropContract.claimNFTAirdrop(
      sender,
      receiver.address,
      nftTokenAddress,
      serialNumber,
      Constants.GAS_LIMIT_2_000_000
    );
    await claimTx.wait();

    const nftOwner = await erc721Contract.ownerOf(
      nftTokenAddress,
      serialNumber
    );
    expect(nftOwner).to.equal(receiver.address);
  });

  it('should claim multiple pending fungible token airdrops', async function () {
    const { senders, receivers, tokens, serials, amounts } =
      await utils.createPendingAirdrops(
        10,
        tokenCreateContract,
        owner,
        airdropContract,
        receiver.address
      );

    const initialBalances = await Promise.all(
      tokens.map((token) => erc20Contract.balanceOf(token, receiver.address))
    );

    for (let token of tokens) {
      await utils.associateWithSigner(receiverPrivateKey, token);
    }

    const claimTx = await claimAirdropContract.claimMultipleAirdrops(
      senders,
      receivers,
      tokens,
      serials,
      Constants.GAS_LIMIT_10_000_000
    );
    await claimTx.wait();

    for (let i = 0; i < tokens.length; i++) {
      const updatedBalance = await erc20Contract.balanceOf(
        tokens[i],
        receiver.address
      );
      expect(updatedBalance).to.equal(initialBalances[i] + amounts[i]);
    }
  });

  it('should fail to claim airdrops when sender has no pending airdrops', async function () {
    const sender = signers[1].address;
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const tx = await claimAirdropContract.claim(
      sender,
      receiver.address,
      tokenAddress,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail to claim airdrops when sender does not have a valid account', async function () {
    const invalidSender = ethers.Wallet.createRandom().address;
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const tx = await claimAirdropContract.claim(
      invalidSender,
      receiver.address,
      tokenAddress,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail to claim airdrops when receiver does not have a valid account', async function () {
    const invalidReceiver = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const tx = await claimAirdropContract.claim(
      owner,
      invalidReceiver,
      tokenAddress,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('15'); // INVALID_ACCOUNT_ID code
  });

  it('should fail to claim more than 10 pending airdrops at once', async function () {
    const { senders, receivers, tokens, serials, amounts } =
      await utils.createPendingAirdrops(
        11,
        tokenCreateContract,
        owner,
        airdropContract,
        receiver.address
      );

    for (let token of tokens) {
      await utils.associateWithSigner(receiverPrivateKey, token);
    }

    const tx = await claimAirdropContract.claimMultipleAirdrops(
      senders,
      receivers,
      tokens,
      serials,
      Constants.GAS_LIMIT_10_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    const responseText = utils.decimalToAscii(responseCode);
    expect(responseText).to.eq('PENDING_AIRDROP_ID_LIST_TOO_LONG');
  });

  it('should fail to claim airdrops when token does not exist', async function () {
    const nonExistentToken = '0x1234567890123456789012345678901234567890';

    const tx = await claimAirdropContract.claim(
      owner,
      receiver.address,
      nonExistentToken,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    const responseText = utils.decimalToAscii(responseCode);
    expect(responseText).to.eq('INVALID_TOKEN_ID');
  });

  it('should fail to claim airdrops when NFT does not exist', async function () {
    const nonExistentNft = '0x1234567890123456789012345678901234567890';

    const tx = await claimAirdropContract.claimNFTAirdrop(
      owner,
      receiver.address,
      nonExistentNft,
      1,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    const responseText = utils.decimalToAscii(responseCode);
    expect(responseText).to.eq('INVALID_TOKEN_ID');
  });

  it('should fail to claim airdrops when NFT serial number does not exist', async function () {
    const sender = signers[0].address;
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const nonExistentSerialNumber = 999;

    const serialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );

    const airdropTx = await airdropContract.nftAirdrop(
      nftTokenAddress,
      sender,
      receiver.address,
      serialNumber,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdropTx.wait();

    const tx = await claimAirdropContract.claimNFTAirdrop(
      owner,
      receiver.address,
      nftTokenAddress,
      nonExistentSerialNumber,
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });
});
// Filename: test/system-contracts/hedera-token-service/hrc-904/IHRC904ProxyTests.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');
const { Contract } = require('ethers');

describe('HIP904Batch2 IHRC904Facade Contract Test Suite', function () {
  let airdropContract;
  let tokenAddress;
  let nftTokenAddress;
  let tokenCreateContract;
  let signers;
  let owner;
  let receiver;
  let receiverPrivateKey;
  const invalidAddress = '0x000000000000000000000000000000000000dead';
  let walletIHRC904TokenFacadeSender;
  let walletIHRC904AccountFacade;
  let walletIHRC904NftFacadeSender;
  let walletIHRC904TokenFacadeReceiver;
  let walletIHRC904NftFacadeReceiver;
  let erc20Contract;
  let erc721Contract;
  let contractAddresses;

  before(async function () {
    signers = await ethers.getSigners();
    airdropContract = await utils.deployContract(Constants.Contract.Airdrop);
    tokenCreateContract = await utils.deployContract(
      Constants.Contract.TokenCreateContract
    );
    owner = signers[0].address;
    receiverPrivateKey = ethers.hexlify(ethers.randomBytes(32));
    receiver = new ethers.Wallet(receiverPrivateKey).connect(ethers.provider);
    invalidSender = ethers.Wallet.createRandom().connect(ethers.provider);

    // Send some HBAR to activate the account
    await signers[0].sendTransaction({
      to: receiver.address,
      value: ethers.parseEther('100'),
    });

    erc20Contract = await utils.deployContract(
      Constants.Contract.ERC20Contract
    );
    erc721Contract = await utils.deployContract(
      Constants.Contract.ERC721Contract
    );

    await utils.updateAccountKeysViaHapi([
      await airdropContract.getAddress(),
      await tokenCreateContract.getAddress(),
    ]);

    contractAddresses = [
      await airdropContract.getAddress(),
      await tokenCreateContract.getAddress(),
    ];

    tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const IHRC904AccountFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC904AccountFacade')).abi
    );

    walletIHRC904AccountFacade = new Contract(
      receiver.address,
      IHRC904AccountFacade,
      receiver
    );

    const IHRC904TokenFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC904TokenFacade')).abi
    );

    walletIHRC904TokenFacadeSender = new Contract(
      tokenAddress,
      IHRC904TokenFacade,
      signers[0]
    );

    walletIHRC904NftFacadeSender = new Contract(
      nftTokenAddress,
      IHRC904TokenFacade,
      signers[0]
    );

    walletIHRC904TokenFacadeReceiver = new Contract(
      tokenAddress,
      IHRC904TokenFacade,
      receiver
    );

    walletIHRC904NftFacadeReceiver = new Contract(
      nftTokenAddress,
      IHRC904TokenFacade,
      receiver
    );

    // Disabling automatic associations for receiver so all airdrops will be pending
    const disableAutoAssociations =
      await walletIHRC904AccountFacade.setUnlimitedAutomaticAssociations(
        false,
        {
          gasLimit: 2_000_000,
        }
      );
    await disableAutoAssociations.wait();
  });

  // Positive tests
  it('should cancel a pending airdrop for a fungible token (FT)', async function () {
    const initialBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver.address
    );

    const airdrop = await airdropContract.tokenAirdrop(
      tokenAddress,
      owner,
      receiver.address,
      BigInt(1),
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdrop.wait();
    const tx = await walletIHRC904TokenFacadeSender.cancelAirdropFT(
      receiver.address
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22');

    const finalBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver.address
    );
    expect(finalBalance).to.equal(initialBalance);
  });

  it('should cancel a pending airdrop for a non-fungible token (NFT)', async function () {
    const mintedTokenSerialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );

    const airdrop = await airdropContract.nftAirdrop(
      nftTokenAddress,
      owner,
      receiver.address,
      mintedTokenSerialNumber,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdrop.wait();

    const tx = await walletIHRC904NftFacadeSender.cancelAirdropNFT(
      receiver.address,
      mintedTokenSerialNumber
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22');

    const finalOwner = await erc721Contract.ownerOf(
      nftTokenAddress,
      mintedTokenSerialNumber
    );
    expect(finalOwner).to.not.equal(receiver.address);
  });

  it('should enable unlimited automatic associations for an account', async function () {
    const tx =
      await walletIHRC904AccountFacade.setUnlimitedAutomaticAssociations(true, {
        gasLimit: 2_000_000,
      });
    const responseCode = await utils.getHASResponseCode(tx.hash);
    expect(responseCode).to.eq('22');

    const maxAssociations = await utils.getMaxAutomaticTokenAssociations(
      receiver.address
    );
    expect(maxAssociations).to.eq(-1);
  });

  it('should disable unlimited automatic associations for an account', async function () {
    const tx =
      await walletIHRC904AccountFacade.setUnlimitedAutomaticAssociations(
        false,
        {
          gasLimit: 2_000_000,
        }
      );
    const responseCode = await utils.getHASResponseCode(tx.hash);
    expect(responseCode).to.eq('22');

    const maxAssociations = await utils.getMaxAutomaticTokenAssociations(
      receiver.address
    );
    expect(maxAssociations).to.eq(0);
  });

  it('should claim a pending airdrop for a fungible token (FT)', async function () {
    const initialBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver.address
    );
    const amount = BigInt(1);

    const airdrop = await airdropContract.tokenAirdrop(
      tokenAddress,
      owner,
      receiver.address,
      amount,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdrop.wait();
    await utils.associateWithSigner(receiverPrivateKey, tokenAddress);

    const tx = await walletIHRC904TokenFacadeReceiver.claimAirdropFT(owner);
    await tx.wait();

    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22');

    const finalBalance = await erc20Contract.balanceOf(
      tokenAddress,
      receiver.address
    );
    expect(finalBalance).to.equal(initialBalance + amount);
  });

  it('should claim a pending airdrop for a non-fungible token (NFT)', async function () {
    const mintedTokenSerialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );
    const airdrop = await airdropContract.nftAirdrop(
      nftTokenAddress,
      owner,
      receiver.address,
      mintedTokenSerialNumber,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdrop.wait();

    const tx = await walletIHRC904NftFacadeReceiver.claimAirdropNFT(
      owner,
      mintedTokenSerialNumber
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22');

    const finalOwner = await erc721Contract.ownerOf(
      nftTokenAddress,
      mintedTokenSerialNumber
    );
    expect(finalOwner).to.equal(receiver.address);
  });

  it('should reject tokens for a given account (FT)', async function () {
    const airdrop = await airdropContract.tokenAirdrop(
      tokenAddress,
      owner,
      receiver.address,
      BigInt(1),
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdrop.wait();
    const tx = await walletIHRC904TokenFacadeReceiver.rejectTokenFT();
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22');
  });

  it('should reject tokens for a given account and serial number (NFT)', async function () {
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const mintedTokenSerialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );
    const airdrop = await airdropContract.nftAirdrop(
      nftTokenAddress,
      owner,
      signers[1].address,
      mintedTokenSerialNumber,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdrop.wait();

    const IHRC904TokenFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC904TokenFacade')).abi
    );
    let walletIHRC904NftFacadeReceiver = new Contract(
      nftTokenAddress,
      IHRC904TokenFacade,
      signers[1]
    );

    await walletIHRC904NftFacadeReceiver.claimAirdropNFT(
      owner,
      mintedTokenSerialNumber
    );

    const tx = await walletIHRC904NftFacadeReceiver.rejectTokenNFTs([
      mintedTokenSerialNumber,
    ]);

    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22');
  });

  it('should reject 10 tokens for a given account and serial number (NFT)', async function () {
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    let serialNumbers = [];
    for (let i = 0; i < 10; i++) {
      serialNumbers.push(
        await utils.mintNFTToAddress(tokenCreateContract, nftTokenAddress)
      );
    }
    serialNumbers = serialNumbers.map(BigInt);

    for (let serialNumber of serialNumbers) {
      const airdrop = await airdropContract.nftAirdrop(
        nftTokenAddress,
        owner,
        signers[1].address,
        serialNumber,
        {
          value: Constants.ONE_HBAR,
          gasLimit: 2_000_000,
        }
      );
      await airdrop.wait();
    }

    const IHRC904TokenFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC904TokenFacade')).abi
    );
    let walletIHRC904NftFacadeReceiver = new Contract(
      nftTokenAddress,
      IHRC904TokenFacade,
      signers[1]
    );

    for (let serialNumber of serialNumbers) {
      await walletIHRC904NftFacadeReceiver.claimAirdropNFT(owner, serialNumber);
    }

    const tx =
      await walletIHRC904NftFacadeReceiver.rejectTokenNFTs(serialNumbers);
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22');
  });

  // Negative tests
  it('should fail to cancel a pending airdrop for FT when sender has no pending airdrops', async function () {
    const tx = await walletIHRC904TokenFacadeSender.cancelAirdropFT(
      receiver.address
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail to cancel a pending airdrop for FT when receiver has no valid account', async function () {
    const tx =
      await walletIHRC904TokenFacadeSender.cancelAirdropFT(invalidAddress);
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail to cancel a pending airdrop for NFT when sender has no pending airdrops', async function () {
    const mintedTokenSerialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );
    const tx = await walletIHRC904NftFacadeSender.cancelAirdropNFT(
      signers[2].address,
      mintedTokenSerialNumber
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail to cancel a pending airdrop for NFT when receiver has no valid account', async function () {
    const mintedTokenSerialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );
    const tx = await walletIHRC904NftFacadeSender.cancelAirdropNFT(
      invalidAddress,
      mintedTokenSerialNumber
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail to claim FT airdrop with no pending airdrops', async function () {
    const tx = await walletIHRC904TokenFacadeReceiver.claimAirdropFT(owner);
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail to claim FT airdrop with an invalid account', async function () {
    const tx =
      await walletIHRC904TokenFacadeReceiver.claimAirdropFT(invalidAddress);
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail to claim NFT airdrop with no pending airdrops', async function () {
    const mintedTokenSerialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );
    const tx = await walletIHRC904NftFacadeReceiver.claimAirdropNFT(
      owner,
      mintedTokenSerialNumber
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail to claim NFT airdrop with an invalid account', async function () {
    const mintedTokenSerialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );
    const tx = await walletIHRC904NftFacadeReceiver.claimAirdropNFT(
      invalidAddress,
      mintedTokenSerialNumber
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('367'); // INVALID_PENDING_AIRDROP_ID code
  });

  it('should fail to reject FT tokens with no tokens', async function () {
    const tx = await walletIHRC904TokenFacadeReceiver.rejectTokenFT();
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('178'); // INSUFFICIENT_TOKEN_BALANCE code
  });

  it('should fail to reject FT tokens with an invalid account', async function () {
    // Trying to reject FT tokens with the treasury account
    const tx = await walletIHRC904TokenFacadeSender.rejectTokenFT();
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('196'); // ACCOUNT_IS_TREASURY code
  });

  it('should fail to reject NFT tokens with no tokens', async function () {
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const mintedTokenSerialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );

    const IHRC904TokenFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC904TokenFacade')).abi
    );
    let walletIHRC904NftFacadeReceiver = new Contract(
      nftTokenAddress,
      IHRC904TokenFacade,
      signers[1]
    );

    const tx = await walletIHRC904NftFacadeReceiver.rejectTokenNFTs([
      mintedTokenSerialNumber,
    ]);
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('354'); // INVALID_OWNER_ID code
  });

  it('should revert when trying to reject NFT tokens when 11 or more serials are provided', async function () {
    let serialNumbers = [];
    for (let i = 0; i < 11; i++) {
      serialNumbers.push(
        await utils.mintNFT(tokenCreateContract, nftTokenAddress)
      );
    }

    const tx =
      await walletIHRC904NftFacadeReceiver.rejectTokenNFTs(serialNumbers);
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    const responseText = utils.decimalToAscii(responseCode);
    expect(responseText).to.eq('TOKEN_REFERENCE_LIST_SIZE_LIMIT_EXCEEDED');
  });
});
// Filename: test/system-contracts/hedera-token-service/hrc-904/TokenRejectContract.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');

describe('HIP904Batch3 TokenRejectContract Test Suite', function () {
  let tokenRejectContract;
  let tokenCreateContract;
  let airdropContract;
  let signers;
  let owner;
  let receiver;
  let walletIHRC904AccountFacade;
  let contractAddresses;

  before(async function () {
    signers = await ethers.getSigners();
    tokenRejectContract = await utils.deployContract(
      Constants.Contract.TokenReject
    );
    tokenCreateContract = await utils.deployContract(
      Constants.Contract.TokenCreateContract
    );
    airdropContract = await utils.deployContract(Constants.Contract.Airdrop);
    owner = signers[0].address;

    const randomWallet = ethers.Wallet.createRandom();
    const receiverPrivateKey = randomWallet.privateKey;
    receiver = randomWallet.connect(ethers.provider);

    await signers[0].sendTransaction({
      to: receiver.address,
      value: ethers.parseEther('100'),
    });

    contractAddresses = [
      await tokenRejectContract.getAddress(),
      await tokenCreateContract.getAddress(),
      await airdropContract.getAddress(),
    ];
    await utils.updateAccountKeysViaHapi(contractAddresses);

    await utils.updateAccountKeysViaHapi(contractAddresses, [
      receiverPrivateKey,
    ]);

    const IHRC904AccountFacade = new ethers.Interface(
      (await hre.artifacts.readArtifact('IHRC904AccountFacade')).abi
    );

    walletIHRC904AccountFacade = new ethers.Contract(
      receiver.address,
      IHRC904AccountFacade,
      receiver
    );
  });

  it('should reject tokens for a single account', async function () {
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const receiver = signers[1];

    const ftAmount = BigInt(1);
    const airdropTx = await airdropContract.tokenAirdrop(
      tokenAddress,
      owner,
      receiver.address,
      ftAmount,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdropTx.wait();

    await walletIHRC904AccountFacade.setUnlimitedAutomaticAssociations(true, {
      gasLimit: 2_000_000,
    });

    const tx = await tokenRejectContract.rejectTokens(
      receiver.address,
      [tokenAddress],
      [],
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22'); // SUCCESS code
  });

  it('should reject NFTs for a single account', async function () {
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const receiver = signers[1];

    const serial = utils.mintNFTToAddress(tokenCreateContract, nftTokenAddress);

    const airdropTx = await airdropContract.nftAirdrop(
      nftTokenAddress,
      owner,
      receiver.address,
      serial,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdropTx.wait();

    await walletIHRC904AccountFacade.setUnlimitedAutomaticAssociations(true, {
      gasLimit: 2_000_000,
    });

    const tx = await tokenRejectContract.rejectTokens(
      receiver.address,
      [],
      [nftTokenAddress],
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22'); // SUCCESS code
  });

  it('should reject tokens for multiple accounts', async function () {
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const receivers = signers.slice(1, 3);

    for (const receiver of receivers) {
      const airdropTx = await airdropContract.tokenAirdrop(
        tokenAddress,
        owner,
        receiver.address,
        BigInt(1),
        {
          value: Constants.ONE_HBAR,
          gasLimit: 2_000_000,
        }
      );
      await airdropTx.wait();

      const tx = await tokenRejectContract.rejectTokens(
        receiver.address,
        [tokenAddress],
        [],
        Constants.GAS_LIMIT_2_000_000
      );
      const responseCode = await utils.getHTSResponseCode(tx.hash);
      expect(responseCode).to.eq('22'); // SUCCESS code
    }
  });

  it('should fail when sender does not have any associated tokens', async function () {
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    await walletIHRC904AccountFacade.setUnlimitedAutomaticAssociations(false, {
      gasLimit: 2_000_000,
    });

    const airdropTx = await airdropContract.tokenAirdrop(
      tokenAddress,
      owner,
      receiver.address,
      BigInt(1),
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdropTx.wait();

    const tx = await tokenRejectContract.rejectTokens(
      receiver.address,
      [tokenAddress],
      [],
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('184'); // TOKEN_NOT_ASSOCIATED_TO_ACCOUNT code
  });

  it('should fail when sender does not have a pending airdrop', async function () {
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const receiver = signers[1];

    const tx = await tokenRejectContract.rejectTokens(
      receiver.address,
      [tokenAddress],
      [],
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('178'); // INSUFFICIENT_TOKEN_BALANCE code
  });

  it('should fail when provided fungible token is invalid', async function () {
    const invalidToken = ethers.Wallet.createRandom().address;
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );

    const tx = await tokenRejectContract.rejectTokens(
      receiver.address,
      [invalidToken],
      [nftTokenAddress],
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('167'); // INVALID_TOKEN_ID code
  });

  it('should fail when provided NFT is invalid', async function () {
    const invalidNft = ethers.Wallet.createRandom().address;

    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses
    );
    const receiver = signers[1];

    const serial = utils.mintNFTToAddress(tokenCreateContract, nftTokenAddress);

    const airdropTx = await airdropContract.nftAirdrop(
      nftTokenAddress,
      owner,
      receiver.address,
      serial,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      }
    );
    await airdropTx.wait();

    await walletIHRC904AccountFacade.setUnlimitedAutomaticAssociations(true, {
      gasLimit: 2_000_000,
    });

    const tx = await tokenRejectContract.rejectTokens(
      receiver.address,
      [],
      [invalidNft],
      Constants.GAS_LIMIT_2_000_000
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('226'); // INVALID_NFT_ID code
  });
});
// Filename: test/system-contracts/hedera-token-service/redirect-for-token.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const utils = require('./utils');
const Constants = require('../../constants');
const hre = require('hardhat');
const { ethers } = hre;

describe('RedirectForToken Test Suite', function () {
  const amount = 33;
  let signers;
  let tokenCreateContract;
  let tokenAddress;
  let IERC20;

  const parseCallResponseEventData = async (tx) => {
    return (await tx.wait()).logs.filter(
      (e) => e?.fragment?.name === Constants.Events.CallResponseEvent
    )[0].args;
  };

  const decodeHexToASCII = (message) => {
    message = message.replace(/^0x/, '');

    const strLen = parseInt(message.slice(64, 128), 16);
    const hex = message.slice(128, 128 + strLen * 2);

    let str = '';
    for (let n = 0; n < hex.length; n += 2) {
      str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }

    return str;
  };

  before(async () => {
    signers = await ethers.getSigners();

    const tokenCreateFactory = await ethers.getContractFactory(
      Constants.Contract.TokenCreateContract
    );
    const tokenCreateTx = await tokenCreateFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );
    tokenCreateContract = await ethers.getContractAt(
      Constants.Contract.TokenCreateContract,
      await tokenCreateTx.getAddress()
    );

    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
    ]);

    const tokenAddressTx =
      await tokenCreateContract.createFungibleTokenWithSECP256K1AdminKeyPublic(
        signers[0].address,
        utils.getSignerCompressedPublicKey(),
        {
          value: '10000000000000000000',
          gasLimit: 1_000_000,
        }
      );
    tokenAddress = (await tokenAddressTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args.tokenAddress;

    await utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
    ]);

    await utils.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.grantTokenKyc(tokenCreateContract, tokenAddress);

    IERC20 = new ethers.Interface(
      (await hre.artifacts.readArtifact('ERC20')).abi
    );
  });

  it('should be able to execute name()', async function () {
    const encodedFunc = IERC20.encodeFunctionData('name()');
    const tx = await tokenCreateContract.redirectForToken(
      tokenAddress,
      encodedFunc
    );
    const [success, result] = await parseCallResponseEventData(tx);
    expect(success).to.eq(true);
    expect(decodeHexToASCII(result)).to.eq(Constants.TOKEN_NAME);
  });

  it('should be able to execute symbol()', async function () {
    const encodedFunc = IERC20.encodeFunctionData('symbol()');
    const tx = await tokenCreateContract.redirectForToken(
      tokenAddress,
      encodedFunc
    );
    const [success, result] = await parseCallResponseEventData(tx);
    expect(success).to.eq(true);
    expect(decodeHexToASCII(result)).to.eq(Constants.TOKEN_SYMBOL);
  });

  it('should be able to execute decimals()', async function () {
    const encodedFunc = IERC20.encodeFunctionData('decimals()');
    const tx = await tokenCreateContract.redirectForToken(
      tokenAddress,
      encodedFunc
    );
    const [success, result] = await parseCallResponseEventData(tx);
    expect(success).to.eq(true);
    expect(Number(result)).to.eq(8);
  });

  it('should be able to execute totalSupply()', async function () {
    const encodedFunc = IERC20.encodeFunctionData('totalSupply()');
    const tx = await tokenCreateContract.redirectForToken(
      tokenAddress,
      encodedFunc
    );
    const [success, result] = await parseCallResponseEventData(tx);
    expect(success).to.eq(true);
    expect(Number(result)).to.eq(1000);
  });

  it('should be able to execute balanceOf(address)', async function () {
    const encodedFuncSigner0 = IERC20.encodeFunctionData('balanceOf(address)', [
      signers[0].address,
    ]);
    const tx0 = await tokenCreateContract.redirectForToken(
      tokenAddress,
      encodedFuncSigner0
    );
    const [success0, result0] = await parseCallResponseEventData(tx0);
    expect(success0).to.eq(true);
    expect(Number(result0)).to.eq(1000);

    const encodedFuncSigner1 = IERC20.encodeFunctionData('balanceOf(address)', [
      signers[1].address,
    ]);
    const tx1 = await tokenCreateContract.redirectForToken(
      tokenAddress,
      encodedFuncSigner1
    );
    const [success1, result1] = await parseCallResponseEventData(tx1);
    expect(success1).to.eq(true);
    expect(Number(result1)).to.eq(0);
  });

  it('should be able to execute approve(address,uint256)', async function () {
    const encodedFunc = IERC20.encodeFunctionData('approve(address,uint256)', [
      signers[1].address,
      amount,
    ]);
    const tx = await tokenCreateContract.redirectForToken(
      tokenAddress,
      encodedFunc,
      Constants.GAS_LIMIT_10_000_000
    );
    const [success] = await parseCallResponseEventData(tx);
    expect(success).to.eq(true);
  });

  it('should be able to execute allowance(address,address)', async function () {
    const encodedFunc = IERC20.encodeFunctionData(
      'allowance(address,address)',
      [await tokenCreateContract.getAddress(), signers[1].address]
    );
    const tx = await tokenCreateContract.redirectForToken(
      tokenAddress,
      encodedFunc,
      Constants.GAS_LIMIT_10_000_000
    );
    const [success, result] = await parseCallResponseEventData(tx);
    expect(success).to.eq(true);
    expect(Number(result)).to.eq(amount);
  });

  it('should be able to execute transfer(address,uint256)', async function () {
    const erc20 = await ethers.getContractAt(
      Constants.Contract.OZERC20Mock,
      tokenAddress
    );
    await (
      await erc20.transfer(await tokenCreateContract.getAddress(), amount)
    ).wait();

    const balanceBefore = await erc20.balanceOf(signers[1].address);

    const encodedFunc = IERC20.encodeFunctionData('transfer(address,uint256)', [
      signers[1].address,
      amount,
    ]);
    const tx = await tokenCreateContract.redirectForToken(
      tokenAddress,
      encodedFunc
    );
    const [success] = await parseCallResponseEventData(tx);
    expect(success).to.eq(true);

    const balanceAfter = await erc20.balanceOf(signers[1].address);
    expect(balanceBefore).to.not.eq(balanceAfter);
    expect(balanceAfter).to.eq(balanceBefore + BigInt(amount));
  });

  it('should be able to execute transferFrom(address,address,uint256)', async function () {
    const erc20 = await ethers.getContractAt(
      Constants.Contract.OZERC20Mock,
      tokenAddress
    );
    await (
      await erc20.transfer(await tokenCreateContract.getAddress(), amount)
    ).wait();

    const tokenCreateContractBefore = await erc20.balanceOf(
      await tokenCreateContract.getAddress()
    );
    const balanceBefore = await erc20.balanceOf(signers[1].address);

    await (
      await tokenCreateContract.approvePublic(
        tokenAddress,
        await tokenCreateContract.getAddress(),
        amount,
        Constants.GAS_LIMIT_1_000_000
      )
    ).wait();

    const encodedFunc = IERC20.encodeFunctionData(
      'transferFrom(address,address,uint256)',
      [await tokenCreateContract.getAddress(), signers[1].address, amount]
    );
    const tx = await tokenCreateContract.redirectForToken(
      tokenAddress,
      encodedFunc,
      Constants.GAS_LIMIT_1_000_000
    );
    const [success] = await parseCallResponseEventData(tx);
    expect(success).to.eq(true);

    const tokenCreateContractAfter = await erc20.balanceOf(
      await tokenCreateContract.getAddress()
    );

    const balanceAfter = await erc20.balanceOf(signers[1].address);
    expect(balanceBefore).to.not.eq(balanceAfter);
    expect(tokenCreateContractAfter).to.eq(
      tokenCreateContractBefore - BigInt(amount)
    );
    expect(balanceAfter).to.eq(parseInt(balanceBefore) + parseInt(amount));
  });
});
// Filename: test/system-contracts/hedera-token-service/token-create/tokenCreateContract.js
// SPDX-License-Identifier: Apache-2.0

const utils = require('../utils');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { expectValidHash } = require('../assertions');
const Constants = require('../../../constants');
const { pollForNewERC20Balance } = require('../../../../utils/helpers');
const {
  TokenCreateTransaction,
  TransactionId,
  PublicKey,
  TokenSupplyType,
  AccountId,
} = require('@hashgraph/sdk');

describe('TokenCreateContract Test Suite', function () {
  let tokenCreateContract;
  let tokenTransferContract;
  let tokenManagmentContract;
  let tokenQueryContract;
  let erc20Contract;
  let tokenAddress;
  let nftTokenAddress;
  let signers;

  before(async function () {
    signers = await ethers.getSigners();
    tokenCreateContract = await utils.deployTokenCreateContract();
    tokenTransferContract = await utils.deployTokenTransferContract();
    tokenManagmentContract = await utils.deployTokenManagementContract();
    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
      await tokenManagmentContract.getAddress(),
    ]);
    erc20Contract = await utils.deployERC20Contract();
    erc721Contract = await utils.deployERC721Contract();
    tokenAddress = await utils.createFungibleTokenWithSECP256K1AdminKey(
      tokenCreateContract,
      signers[0].address,
      utils.getSignerCompressedPublicKey()
    );
    await utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
      await tokenManagmentContract.getAddress(),
    ]);
    nftTokenAddress = await utils.createNonFungibleTokenWithSECP256K1AdminKey(
      tokenCreateContract,
      signers[0].address,
      utils.getSignerCompressedPublicKey()
    );
    await utils.updateTokenKeysViaHapi(nftTokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
      await tokenManagmentContract.getAddress(),
    ]);
    await utils.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.grantTokenKyc(tokenCreateContract, tokenAddress);
    await utils.associateToken(
      tokenCreateContract,
      nftTokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.grantTokenKyc(tokenCreateContract, nftTokenAddress);
    mintedTokenSerialNumber = await utils.mintNFT(
      tokenCreateContract,
      nftTokenAddress
    );
  });

  it('should be able to execute burnToken', async function () {
    const amount = BigInt(111);
    const totalSupplyBefore = await erc20Contract.totalSupply(tokenAddress);
    const balanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    await tokenManagmentContract.burnTokenPublic(tokenAddress, amount, []);

    const balanceAfter = await pollForNewERC20Balance(
      erc20Contract,
      tokenAddress,
      signers[0].address,
      balanceBefore
    );

    const totalSupplyAfter = await erc20Contract.totalSupply(tokenAddress);

    expect(totalSupplyAfter).to.equal(totalSupplyBefore - amount);
    expect(balanceAfter).to.equal(balanceBefore - amount);
  });

  it('should be able to execute dissociateTokens and associateTokens', async function () {
    const tokenCreateContractWallet2 = tokenCreateContract.connect(signers[1]);
    const tokenManagmentContractWallet2 = tokenManagmentContract.connect(
      signers[1]
    );

    const txDisassociate =
      await tokenManagmentContractWallet2.dissociateTokensPublic(
        signers[1].address,
        [tokenAddress],
        Constants.GAS_LIMIT_1_000_000
      );
    const receiptDisassociate = await txDisassociate.wait();
    expect(
      receiptDisassociate.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode
    ).to.equal(22);

    const txAssociate = await tokenCreateContractWallet2.associateTokensPublic(
      signers[1].address,
      [tokenAddress],
      Constants.GAS_LIMIT_1_000_000
    );
    const receiptAssociate = await txAssociate.wait();
    expect(
      receiptAssociate.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode
    ).to.equal(22);
  });

  it('should be able to execute dissociateToken and associateToken', async function () {
    const tokenCreateContractWallet2 = tokenCreateContract.connect(signers[1]);
    const tokenManagmentContractWallet2 = tokenManagmentContract.connect(
      signers[1]
    );

    const txDisassociate =
      await tokenManagmentContractWallet2.dissociateTokenPublic(
        signers[1].address,
        tokenAddress,
        Constants.GAS_LIMIT_1_000_000
      );
    const receiptDisassociate = await txDisassociate.wait();
    expect(
      receiptDisassociate.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode
    ).to.equal(22);

    const txAssociate = await tokenCreateContractWallet2.associateTokenPublic(
      signers[1].address,
      tokenAddress,
      Constants.GAS_LIMIT_1_000_000
    );
    const receiptAssociate = await txAssociate.wait();
    expect(
      receiptAssociate.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode
    ).to.equal(22);
  });

  it('should be able to execute createFungibleToken', async function () {
    const tokenAddressTx = await tokenCreateContract.createFungibleTokenPublic(
      await tokenCreateContract.getAddress(),
      {
        value: BigInt('30000000000000000000'),
        gasLimit: 1_000_000,
      }
    );
    const tokenAddressReceipt = await tokenAddressTx.wait();
    const result = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args[0];
    expect(result).to.exist;
    expectValidHash(result, 40);
  });

  it('should be able to execute createNonFungibleToken', async function () {
    const tokenAddressTx =
      await tokenCreateContract.createNonFungibleTokenPublic(
        await tokenCreateContract.getAddress(),
        {
          value: BigInt('10000000000000000000'),
          gasLimit: 1_000_000,
        }
      );

    const tokenAddressReceipt = await tokenAddressTx.wait();
    const result = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args[0];
    expect(result).to.exist;
    expectValidHash(result, 40);
  });

  it('should be able to execute createFungibleTokenWithCustomFees', async function () {
    const tx =
      await tokenCreateContract.createFungibleTokenWithCustomFeesPublic(
        signers[0].address,
        tokenAddress,
        {
          value: BigInt('20000000000000000000'),
          gasLimit: 1_000_000,
        }
      );

    const txReceipt = await tx.wait();
    const result = txReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args[0];
    expect(result).to.exist;
    expectValidHash(result, 40);
  });

  it('should be able to execute createNonFungibleTokenWithCustomFees', async function () {
    const tx =
      await tokenCreateContract.createNonFungibleTokenWithCustomFeesPublic(
        signers[0].address,
        tokenAddress,
        {
          value: BigInt('20000000000000000000'),
          gasLimit: 1_000_000,
        }
      );

    const txReceipt = await tx.wait();
    const result = txReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args[0];
    expect(result).to.exist;
    expectValidHash(result, 40);
  });

  it('should be able to execute mintToken', async function () {
    const nftAddress = await utils.createNonFungibleToken(
      tokenCreateContract,
      signers[0].address
    );
    expect(nftAddress).to.exist;
    expectValidHash(nftAddress, 40);

    const tx = await tokenCreateContract.mintTokenPublic(
      nftAddress,
      0,
      ['0x02'],
      Constants.GAS_LIMIT_1_000_000
    );

    const receipt = await tx.wait();
    const { responseCode } = receipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;
    expect(responseCode).to.equal(22);
    const { serialNumbers } = receipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.MintedToken
    )[0].args;
    expect(serialNumbers[0]).to.be.greaterThan(0);
  });

  it('should be able to execute grantTokenKyc', async function () {
    const grantKycTx = await tokenCreateContract.grantTokenKycPublic(
      tokenAddress,
      signers[1].address,
      Constants.GAS_LIMIT_1_000_000
    );
    expect(
      (await grantKycTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode
    ).to.equal(22);
  });

  describe('Hapi vs Ethereum token create test', function () {
    // @notice: The param values below are preset to match the values preset in the
    // `createFungibleTokenWithSECP256K1AdminKeyPublic()` method in the TokenCreateContract.sol
    const tokenName = 'tokenName';
    const tokenSymbol = 'tokenSymbol';
    const tokenMemo = 'memo';
    const initialSupply = 1000;
    const maxSupply = 20000000000;
    const decimals = 8;
    const freezeDefaultStatus = false;
    const key = PublicKey.fromBytes(utils.getSignerCompressedPublicKey());
    let signers;

    before(async function () {
      signers = await ethers.getSigners();
      tokenCreateContract = await utils.deployTokenCreateContract();
      tokenQueryContract = await utils.deployTokenQueryContract();
      await utils.updateAccountKeysViaHapi([
        await tokenCreateContract.getAddress(),
        await tokenQueryContract.getAddress(),
      ]);
    });

    async function createTokenviaHapi() {
      const client = await utils.createSDKClient();

      const tokenCreate = await new TokenCreateTransaction()
        .setTokenName(tokenName)
        .setTokenMemo(tokenMemo)
        .setTokenSymbol(tokenSymbol)
        .setDecimals(decimals)
        .setInitialSupply(initialSupply)
        .setMaxSupply(maxSupply)
        .setSupplyType(TokenSupplyType.Finite)
        .setTreasuryAccountId(client.operatorAccountId)
        .setAutoRenewAccountId(client.operatorAccountId)
        .setKycKey(key)
        .setWipeKey(key)
        .setPauseKey(key)
        .setFreezeKey(key)
        .setSupplyKey(key)
        .setFreezeDefault(freezeDefaultStatus)
        .setTransactionId(TransactionId.generate(client.operatorAccountId))
        .setNodeAccountIds([client._network.getNodeAccountIdsForExecute()[0]])
        .setTransactionMemo('Token')
        .execute(client);

      const receipt = await tokenCreate.getReceipt(client);
      const tokenId = receipt.tokenId.toString();
      return tokenId;
    }

    async function createTokenviaSystemContract() {
      // @notice: Use `.createFungibleTokenWithSECP256K1AdminKeyPublic()` for token key purposes.
      const tokenAddressTx =
        await tokenCreateContract.createFungibleTokenWithSECP256K1AdminKeyPublic(
          signers[0].address,
          utils.getSignerCompressedPublicKey(),
          {
            value: '30000000000000000000',
            gasLimit: 1_000_000,
          }
        );
      const tokenAddressReceipt = await tokenAddressTx.wait();
      const { tokenAddress } = tokenAddressReceipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.CreatedToken
      )[0].args;

      return tokenAddress;
    }

    it('should be able to compare tokens created from system contract and hapi', async function () {
      const hapiTokenAddress =
        '0x' +
        AccountId.fromString(await createTokenviaHapi()).toSolidityAddress();
      const precompileTokenAddress = await createTokenviaSystemContract();

      const hapiTokenInfoTx =
        await tokenQueryContract.getFungibleTokenInfoPublic(hapiTokenAddress);

      const hapiTokenInfo = (await hapiTokenInfoTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.FungibleTokenInfo
      )[0].args.tokenInfo[0][0];

      const precompileTokenInfoTx =
        await tokenQueryContract.getFungibleTokenInfoPublic(
          precompileTokenAddress
        );

      const precompileTokenInfo = (
        await precompileTokenInfoTx.wait()
      ).logs.filter(
        (e) => e.fragment.name === Constants.Events.FungibleTokenInfo
      )[0].args.tokenInfo[0][0];

      expect(
        (await hapiTokenInfoTx.wait()).logs.filter(
          (e) => e.fragment.name === Constants.Events.ResponseCode
        )[0].args.responseCode
      ).to.equal(22);
      expect(
        (await precompileTokenInfoTx.wait()).logs.filter(
          (e) => e.fragment.name === Constants.Events.ResponseCode
        )[0].args.responseCode
      ).to.equal(22);
      expect(hapiTokenInfo).not.null;
      expect(precompileTokenInfo).not.null;

      expect(hapiTokenInfo.name).to.eq(precompileTokenInfo.name);
      expect(hapiTokenInfo.symbol).to.eq(precompileTokenInfo.symbol);
      expect(hapiTokenInfo.memo).to.eq(precompileTokenInfo.memo);
      expect(hapiTokenInfo.maxSupply).to.eq(precompileTokenInfo.maxSupply);

      expect(hapiTokenInfo.tokenKeys[1].key.ECDSA_secp256k1).to.eq(
        precompileTokenInfo.tokenKeys[1].key.ECDSA_secp256k1
      ); // KYC KEY
      expect(hapiTokenInfo.tokenKeys[2].key.ECDSA_secp256k1).to.eq(
        precompileTokenInfo.tokenKeys[2].key.ECDSA_secp256k1
      ); // FREEZE KEY
      expect(hapiTokenInfo.tokenKeys[3].key.ECDSA_secp256k1).to.eq(
        precompileTokenInfo.tokenKeys[3].key.ECDSA_secp256k1
      ); // WIPE KEY
      expect(hapiTokenInfo.tokenKeys[4].key.ECDSA_secp256k1).to.eq(
        precompileTokenInfo.tokenKeys[4].key.ECDSA_secp256k1
      ); // SUPPLY KEY
      expect(hapiTokenInfo.tokenKeys[6].key.ECDSA_secp256k1).to.eq(
        precompileTokenInfo.tokenKeys[6].key.ECDSA_secp256k1
      ); // PAUSE KEY
    });
  });
});
// Filename: test/system-contracts/hedera-token-service/token-create/tokenCreateCustomContract.js
// SPDX-License-Identifier: Apache-2.0

const utils = require('../utils');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../../constants');
const { expectValidHash } = require('../assertions');

describe('TokenCreateCustomContract Test Suite', () => {
  const tokenName = 'WrappedHbar';
  const tokenSymbol = 'WHBAR';
  const tokenMemo = 'Wrapped Hbar';
  const initialSupply = 900000000; // 9 WHBAR
  const maxSupply = 30000000000; // 300 WHBAR
  const decimals = 8;
  const feeAmount = 1000n;
  const freezeDefaultStatus = false;
  let keys, signers, fixedFeeTokenAddress, tokenCreateCustomContract;

  before(async () => {
    tokenCreateCustomContract = await utils.deployTokenCreateCustomContract();
    signers = await ethers.getSigners();

    // constructing keys array
    const adminKey = utils.constructIHederaTokenKey(
      'ADMIN',
      'CONTRACT_ID',
      await tokenCreateCustomContract.getAddress()
    );

    const kycKey = utils.constructIHederaTokenKey(
      'KYC',
      'CONTRACT_ID',
      await tokenCreateCustomContract.getAddress()
    );
    const freezeKey = utils.constructIHederaTokenKey(
      'FREEZE',
      'CONTRACT_ID',
      await tokenCreateCustomContract.getAddress()
    );
    const wipeKey = utils.constructIHederaTokenKey(
      'WIPE',
      'CONTRACT_ID',
      await tokenCreateCustomContract.getAddress()
    );

    const supplyKey = utils.constructIHederaTokenKey(
      'SUPPLY',
      'CONTRACT_ID',
      await tokenCreateCustomContract.getAddress()
    );
    const feeKey = utils.constructIHederaTokenKey(
      'FEE',
      'CONTRACT_ID',
      await tokenCreateCustomContract.getAddress()
    );
    const pauseKey = utils.constructIHederaTokenKey(
      'PAUSE',
      'CONTRACT_ID',
      await tokenCreateCustomContract.getAddress()
    );

    keys = [adminKey, kycKey, freezeKey, wipeKey, supplyKey, feeKey, pauseKey];

    fixedFeeTokenAddress = await utils.createFungibleTokenPublic(
      tokenName,
      tokenSymbol,
      tokenMemo,
      initialSupply,
      maxSupply,
      decimals,
      freezeDefaultStatus,
      await tokenCreateCustomContract.getAddress(),
      keys,
      tokenCreateCustomContract
    );
  });

  it('should be able to create fungible token with dynamic params and empty keys array', async () => {
    // @notice: Only the ID of the smart contract is valid for the treasury by default.
    //          Any account other than the smart contract ID must first sign an AccountUpdate transaction
    //          before being eligible to be elected as the token's treasury account.
    //          For a practical example, refer to `utils.updateAccountKeysViaHapi()`.
    const tx = await tokenCreateCustomContract.createFungibleTokenPublic(
      tokenName,
      tokenSymbol,
      tokenMemo,
      initialSupply,
      maxSupply,
      decimals,
      freezeDefaultStatus,
      await tokenCreateCustomContract.getAddress(),
      keys,
      {
        value: '35000000000000000000', // = 35 hbars. The more configs on the token, the higher the value fee for system contract is
        gasLimit: 1_000_000,
      }
    );

    const txReceipt = await tx.wait();
    const result = txReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args[0];
    expect(result).to.exist;
    expectValidHash(result, 40);
  });

  it('should be able to execute createFungibleTokenWithCustomFees with dynamic params', async function () {
    const tx =
      await tokenCreateCustomContract.createFungibleTokenWithCustomFeesPublic(
        await tokenCreateCustomContract.getAddress(),
        fixedFeeTokenAddress,
        tokenName,
        tokenSymbol,
        tokenMemo,
        initialSupply,
        maxSupply,
        decimals,
        feeAmount,
        keys,
        {
          value: '35000000000000000000',
          gasLimit: 1_000_000,
        }
      );

    const txReceipt = await tx.wait();
    const result = txReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args[0];
    expect(result).to.exist;
    expectValidHash(result, 40);
  });

  it('should be able to execute createNonFungibleToken with dynamic params', async function () {
    const tx = await tokenCreateCustomContract.createNonFungibleTokenPublic(
      tokenName,
      tokenSymbol,
      tokenMemo,
      maxSupply,
      await tokenCreateCustomContract.getAddress(),
      keys,
      {
        value: '35000000000000000000',
        gasLimit: 1_000_000,
      }
    );

    const txReceipt = await tx.wait();
    const result = txReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args[0];
    expect(result).to.exist;
    expectValidHash(result, 40);
  });

  it('should be able to execute createNonFungibleTokenWithCustomFees', async function () {
    const tx =
      await tokenCreateCustomContract.createNonFungibleTokenWithCustomFeesPublic(
        await tokenCreateCustomContract.getAddress(),
        fixedFeeTokenAddress,
        tokenName,
        tokenSymbol,
        tokenMemo,
        maxSupply,
        feeAmount,
        keys,
        {
          value: '20000000000000000000',
          gasLimit: 1_000_000,
        }
      );

    const txReceipt = await tx.wait();
    const result = txReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args[0];
    expect(result).to.exist;
    expectValidHash(result, 40);
  });

  describe('TokenCreateCustomContract token actions', () => {
    let prepFungibleTokenAddress, prepNonFungibeTokenAddress;
    before(async () => {
      prepFungibleTokenAddress = (
        await (
          await tokenCreateCustomContract.createFungibleTokenPublic(
            tokenName,
            tokenSymbol,
            tokenMemo,
            initialSupply,
            maxSupply,
            decimals,
            freezeDefaultStatus,
            await tokenCreateCustomContract.getAddress(),
            keys,
            {
              value: '20000000000000000000',
              gasLimit: 1_000_000,
            }
          )
        ).wait()
      ).logs.filter((e) => e.fragment.name === Constants.Events.CreatedToken)[0]
        .args.tokenAddress;

      prepNonFungibeTokenAddress = (
        await (
          await tokenCreateCustomContract.createNonFungibleTokenPublic(
            tokenName,
            tokenSymbol,
            tokenMemo,
            maxSupply,
            await tokenCreateCustomContract.getAddress(),
            keys,
            {
              value: '20000000000000000000',
              gasLimit: 1_000_000,
            }
          )
        ).wait()
      ).logs.filter((e) => e.fragment.name === Constants.Events.CreatedToken)[0]
        .args[0];
    });

    it('should be able to execute mintToken', async function () {
      const amountToMint = 120;

      // mint fungible tokens
      const mintFungibleTokenTx =
        await tokenCreateCustomContract.mintTokenPublic(
          prepFungibleTokenAddress,
          amountToMint,
          ['0x02'],
          Constants.GAS_LIMIT_1_000_000
        );

      const mintFungibleTokenReceipt = await mintFungibleTokenTx.wait();
      const { responseCode: mintFungibleTokenResCode } =
        mintFungibleTokenReceipt.logs.filter(
          (e) => e.fragment.name === Constants.Events.ResponseCode
        )[0].args;
      expect(mintFungibleTokenResCode).to.equal(22);

      const { newTotalSupply } = mintFungibleTokenReceipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.MintedToken
      )[0].args;
      expect(newTotalSupply).to.eq(initialSupply + amountToMint);

      // mint NFTs
      const mintNonFungibleTokenTx =
        await tokenCreateCustomContract.mintTokenPublic(
          prepNonFungibeTokenAddress,
          0,
          ['0x02'],
          Constants.GAS_LIMIT_1_000_000
        );

      const mintNonFungibleTokenReceipt = await mintNonFungibleTokenTx.wait();

      const { responseCode } = mintNonFungibleTokenReceipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args;
      expect(responseCode).to.equal(22);

      const { serialNumbers } = mintNonFungibleTokenReceipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.MintedToken
      )[0].args;
      expect(serialNumbers[0]).to.be.greaterThan(0);
    });

    it('should be able to execute mintTokenToAddressPublic', async function () {
      const amountToMint = 120;

      const tx = await tokenCreateCustomContract.mintTokenToAddressPublic(
        prepFungibleTokenAddress,
        signers[1].address,
        amountToMint,
        ['0x02'],
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();

      const { responseCode } = receipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args;
      expect(responseCode).to.equal(22);

      const { newTotalSupply } = receipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.MintedToken
      )[0].args;
      expect(newTotalSupply).to.greaterThan(initialSupply);

      const { receiver, amount } = receipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.TransferToken
      )[0].args;
      expect(receiver).to.eq(signers[1].address);
      expect(amount).to.eq(amountToMint);
    });

    it('should be able to execute mintNonFungibleTokenToAddressPublic', async function () {
      const tx =
        await tokenCreateCustomContract.mintNonFungibleTokenToAddressPublic(
          prepNonFungibeTokenAddress,
          signers[1].address,
          0,
          ['0x02'],
          Constants.GAS_LIMIT_1_000_000
        );

      const receipt = await tx.wait();

      const { responseCode } = receipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args;
      expect(responseCode).to.equal(22);

      const { serialNumbers } = receipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.MintedToken
      )[0].args;
      expect(serialNumbers[0]).to.be.greaterThan(0);

      const { receiver, amount } = receipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.TransferToken
      )[0].args;
      expect(receiver).to.eq(signers[1].address);
      expect(amount).to.eq(0);
    });

    it('should be able to execute associateTokensPublic', async function () {
      // @notice the provided associating account must sign an updateAccountKeys transaction first.
      // @notice see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/HederaTokenService.sol#L98
      //         for more information on precompiled HTS.associateTokens()
      await utils.updateAccountKeysViaHapi([
        await tokenCreateCustomContract.getAddress(),
      ]);

      const tx = await tokenCreateCustomContract.associateTokensPublic(
        signers[0].address,
        [prepFungibleTokenAddress, prepNonFungibeTokenAddress],
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();
      const { responseCode } = receipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args;
      expect(responseCode).to.equal(22);
    });

    it('should be able to execute associateTokenPublic', async function () {
      // @notice the provided associating account must sign the transaction first.
      // @notice see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/HederaTokenService.sol#L105
      //         for more information on precompiled HTS.associateToken()
      await utils.updateAccountKeysViaHapi([
        await tokenCreateCustomContract.getAddress(),
      ]);

      const tx = await tokenCreateCustomContract.associateTokenPublic(
        signers[1].address, // using a different account to avoid TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT error
        prepFungibleTokenAddress,
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();
      const { responseCode } = receipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args;
      expect(responseCode).to.equal(22);
    });

    it('should be able to execute grantTokenKyc', async function () {
      // @notice: The ID of the smart contract is set as the account receiving KYC for testing purpose.
      //          Any account other than the smart contract ID must first get associated with the token first.
      //
      // @notice  see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/HederaTokenService.sol#L399
      //          for more information on precompiled HTS.associateToken()
      const tx = await tokenCreateCustomContract.grantTokenKycPublic(
        prepFungibleTokenAddress,
        await tokenCreateCustomContract.getAddress(),
        Constants.GAS_LIMIT_1_000_000
      );

      const receipt = await tx.wait();
      const { responseCode } = receipt.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args;
      expect(responseCode).to.equal(22);
    });
  });

  it("should fail when token create has missing treasury's signature in transaction", async () => {
    // @notice: Only the ID of the smart contract is valid for the treasury by default.
    //          Any account other than the smart contract ID must first sign an AccountUpdate transaction
    //          before being eligible to be elected as the token's treasury account.
    //          For a practical example, refer to `utils.updateAccountKeysViaHapi()`.
    const tx = await tokenCreateCustomContract.createFungibleTokenPublic(
      tokenName,
      tokenSymbol,
      tokenMemo,
      initialSupply,
      maxSupply,
      decimals,
      freezeDefaultStatus,
      signers[0].address, // the caller is set as treasury account of the token
      keys,
      {
        value: '35000000000000000000',
        gasLimit: 1_000_000,
      }
    );

    expect(tx.from).to.eq(signers[0].address);
    try {
      await tx.wait();
    } catch (error) {
      expect(error).to.exist;
      expect(error.code).to.eq(Constants.CALL_EXCEPTION);
    }
  });

  it("should pass when token create has the correct treasury's signature in transaction", async () => {
    // @notice the treasury account must sign the transaction first.
    await utils.updateAccountKeysViaHapi([
      await tokenCreateCustomContract.getAddress(),
    ]);

    const tx = await tokenCreateCustomContract.createFungibleTokenPublic(
      tokenName,
      tokenSymbol,
      tokenMemo,
      initialSupply,
      maxSupply,
      decimals,
      freezeDefaultStatus,
      signers[0].address, // the caller is set as treasury account of the token
      keys,
      {
        value: '35000000000000000000',
        gasLimit: 1_000_000,
      }
    );

    expect(tx.from).to.eq(signers[0].address);
    expect(tx.to).to.exist;

    const txReceipt = await tx.wait();
    const { tokenAddress } = txReceipt.logs[0].args;

    expect(tokenAddress).to.exist;
    expectValidHash(tokenAddress, 40);
  });
});
// Filename: test/system-contracts/hedera-token-service/token-managment/tokenManagmentContract.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');
const { pollForNewERC20Balance } = require('../../../../utils/helpers');

describe('TokenManagmentContract Test Suite', function () {
  const TX_SUCCESS_CODE = 22;
  const CUSTOM_SCHEDULE_ALREADY_HAS_NO_FEES = '244';
  const TOKEN_HAS_NO_FEE_SCHEDULE_KEY = '240';
  const CUSTOM_FEE_MUST_BE_POSITIVE = '239';
  const FRACTION_DIVIDES_BY_ZERO = '230';
  const CUSTOM_FEES_LIST_TOO_LONG = '232';
  const INVALID_CUSTOM_FEE_COLLECTOR = '233';
  const INVALID_TOKEN_ID_IN_CUSTOM_FEES = '234';
  const TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR = '235';

  let tokenCreateContract;
  let tokenQueryContract;
  let tokenManagmentContract;
  let tokenTransferContract;
  let tokenCreateCustomContract;
  let erc20Contract;
  let tokenAddress;
  let nftTokenAddress;
  let mintedTokenSerialNumber;
  let signers;
  let tokenInfoBefore;
  let keys;
  let tokenCreateCustomContractAddress;
  let tokenCreateContractAddress;
  let tokenTransferContractAddress;
  let tokenQueryContractAddress;
  let tokenManagementContractAddress;

  before(async function () {
    signers = await ethers.getSigners();
    tokenCreateContract = await utils.deployTokenCreateContract();
    tokenQueryContract = await utils.deployTokenQueryContract();
    tokenManagmentContract = await utils.deployTokenManagementContract();
    tokenTransferContract = await utils.deployTokenTransferContract();
    tokenCreateCustomContract = await utils.deployTokenCreateCustomContract();

    tokenCreateContractAddress = await tokenCreateContract.getAddress();
    tokenTransferContractAddress = await tokenTransferContract.getAddress();
    tokenQueryContractAddress = await tokenQueryContract.getAddress();
    tokenManagementContractAddress = await tokenManagmentContract.getAddress();
    tokenCreateCustomContractAddress =
      await tokenCreateCustomContract.getAddress();
    await utils.updateAccountKeysViaHapi([
      tokenCreateContractAddress,
      tokenTransferContractAddress,
      tokenManagementContractAddress,
      tokenQueryContractAddress,
      tokenCreateCustomContractAddress,
    ]);
    erc20Contract = await utils.deployERC20Contract();
    tokenAddress = await utils.createFungibleTokenWithSECP256K1AdminKey(
      tokenCreateContract,
      signers[0].address,
      utils.getSignerCompressedPublicKey()
    );
    await utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
      await tokenManagmentContract.getAddress(),
      await tokenQueryContract.getAddress(),
    ]);
    nftTokenAddress = await utils.createNonFungibleTokenWithSECP256K1AdminKey(
      tokenCreateContract,
      signers[0].address,
      utils.getSignerCompressedPublicKey()
    );
    await utils.updateTokenKeysViaHapi(nftTokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenTransferContract.getAddress(),
      await tokenManagmentContract.getAddress(),
      await tokenQueryContract.getAddress(),
    ]);
    await utils.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.grantTokenKyc(tokenCreateContract, tokenAddress);
    await utils.associateToken(
      tokenCreateContract,
      nftTokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.grantTokenKyc(tokenCreateContract, nftTokenAddress);
    mintedTokenSerialNumber = await utils.mintNFT(
      tokenCreateContract,
      nftTokenAddress
    );
  });

  it('should be able to delete token', async function () {
    const newTokenAddress =
      await utils.createFungibleTokenWithSECP256K1AdminKey(
        tokenCreateContract,
        signers[0].address,
        utils.getSignerCompressedPublicKey()
      );
    await utils.updateTokenKeysViaHapi(newTokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenManagmentContract.getAddress(),
      await tokenQueryContract.getAddress(),
    ]);
    const txBefore =
      await tokenQueryContract.getTokenInfoPublic(newTokenAddress);
    const tokenInfoBefore = (await txBefore.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenInfo
    )[0].args.tokenInfo;

    const tx = await tokenManagmentContract.deleteTokenPublic(newTokenAddress);
    await tx.wait();

    const txAfter = await tokenQueryContract.getTokenInfoPublic(
      newTokenAddress,
      Constants.GAS_LIMIT_1_000_000
    );
    const tokenInfoAfter = (await txAfter.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenInfo
    )[0].args.tokenInfo;

    expect(tokenInfoBefore.deleted).to.equal(false);
    expect(tokenInfoAfter.deleted).to.equal(true);
  });

  it('should be able to freeze and unfreeze token', async function () {
    const freezeTx = await tokenManagmentContract.freezeTokenPublic(
      tokenAddress,
      await tokenCreateContract.getAddress()
    );
    const isFrozenTx = await tokenQueryContract.isFrozenPublic(
      tokenAddress,
      await tokenCreateContract.getAddress(),
      Constants.GAS_LIMIT_1_000_000
    );
    const responseCodeFreeze = (await freezeTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;
    const responseCodeisFrozen = (await isFrozenTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;
    const isFrozen = (await isFrozenTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.Frozen
    )[0].args.frozen;

    expect(responseCodeFreeze).to.equal(TX_SUCCESS_CODE);
    expect(responseCodeisFrozen).to.equal(TX_SUCCESS_CODE);
    expect(isFrozen).to.equal(true);

    const unfreezeTx = await tokenManagmentContract.unfreezeTokenPublic(
      tokenAddress,
      await tokenCreateContract.getAddress()
    );
    const isStillFrozenTx = await tokenQueryContract.isFrozenPublic(
      tokenAddress,
      await tokenCreateContract.getAddress(),
      Constants.GAS_LIMIT_1_000_000
    );
    const responseCodeUnfreeze = (await unfreezeTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;
    const responseCodeisStillFrozen = (
      await isStillFrozenTx.wait()
    ).logs.filter((e) => e.fragment.name === Constants.Events.ResponseCode)[0]
      .args.responseCode;
    const isStillFrozen = (await isStillFrozenTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.Frozen
    )[0].args.frozen;

    expect(responseCodeUnfreeze).to.equal(TX_SUCCESS_CODE);
    expect(responseCodeisStillFrozen).to.equal(TX_SUCCESS_CODE);
    expect(isStillFrozen).to.equal(false);
  });

  it('should be able to wipe token', async function () {
    const wipeAmount = 3;

    await tokenTransferContract.transferTokensPublic(
      tokenAddress,
      [signers[0].address, signers[1].address],
      [-wipeAmount, wipeAmount]
    );

    const balanceBefore = await pollForNewERC20Balance(
      erc20Contract,
      tokenAddress,
      signers[1].address,
      0n
    );

    const tx = await tokenManagmentContract.wipeTokenAccountPublic(
      tokenAddress,
      signers[1].address,
      wipeAmount
    );

    const responseCode = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;

    const balanceAfter = await pollForNewERC20Balance(
      erc20Contract,
      tokenAddress,
      signers[1].address,
      balanceBefore
    );

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(Number(balanceAfter.toString())).to.equal(
      Number(balanceBefore.toString()) - wipeAmount
    );
  });

  it('should be able to remove token kyc', async function () {
    const revokeKycTx = await tokenManagmentContract.revokeTokenKycPublic(
      tokenAddress,
      await tokenCreateContract.getAddress()
    );
    const isKycTx = await tokenQueryContract.isKycPublic(
      tokenAddress,
      await tokenCreateContract.getAddress(),
      Constants.GAS_LIMIT_1_000_000
    );
    const revokeKycResponseCode = (await revokeKycTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;
    const isKycResponseCode = (await isKycTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;
    const isKyc = (await isKycTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.KycGranted
    )[0].args.kycGranted;

    expect(revokeKycResponseCode).to.equal(TX_SUCCESS_CODE);
    expect(isKycResponseCode).to.equal(TX_SUCCESS_CODE);
    expect(isKyc).to.equal(false);

    await utils.grantTokenKyc(tokenCreateContract, tokenAddress);
  });

  it('should be able to pause and unpause token', async function () {
    const pauseTokenTx =
      await tokenManagmentContract.pauseTokenPublic(tokenAddress);
    const pauseTokenResponseCode = (await pauseTokenTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;

    expect(pauseTokenResponseCode).to.equal(TX_SUCCESS_CODE);

    const unpauseTokenTx =
      await tokenManagmentContract.unpauseTokenPublic(tokenAddress);
    const uppauseTokenResponseCode = (await unpauseTokenTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;

    expect(uppauseTokenResponseCode).to.equal(TX_SUCCESS_CODE);
  });

  it('should be able to wipe token account NFT', async function () {
    await tokenTransferContract.transferNFTPublic(
      nftTokenAddress,
      signers[0].address,
      signers[1].address,
      mintedTokenSerialNumber
    );
    const tx = await tokenManagmentContract.wipeTokenAccountNFTPublic(
      nftTokenAddress,
      signers[1].address,
      [mintedTokenSerialNumber]
    );
    const responseCode = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
  });

  it('should be able to update token info', async function () {
    const TOKEN_UPDATE_NAME = 'tokenUpdateName';
    const TOKEN_UPDATE_SYMBOL = 'tokenUpdateSymbol';
    const TOKEN_UPDATE_MEMO = 'tokenUpdateMemo';

    const txBeforeInfo =
      await tokenQueryContract.getTokenInfoPublic(tokenAddress);
    const tokenInfoBefore = (await txBeforeInfo.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenInfo
    )[0].args.tokenInfo[0];
    const responseCodeTokenInfoBefore = (await txBeforeInfo.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;

    const token = {
      name: TOKEN_UPDATE_NAME,
      symbol: TOKEN_UPDATE_SYMBOL,
      memo: TOKEN_UPDATE_MEMO,
      treasury: signers[0].address, // treasury has to be the signing account,
      tokenSupplyType: tokenInfoBefore.tokenSupplyType,
      maxSupply: tokenInfoBefore.maxSupply,
      freezeDefault: tokenInfoBefore.freezeDefault,
      tokenKeys: [],
      expiry: {
        second: 0,
        autoRenewAccount: tokenInfoBefore.expiry[1],
        autoRenewPeriod: 0,
      },
    };

    const txUpdate = await tokenManagmentContract.updateTokenInfoPublic(
      tokenAddress,
      token,
      Constants.GAS_LIMIT_1_000_000
    );

    expect(
      (await txUpdate.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode
    ).to.be.equal(TX_SUCCESS_CODE);

    const txAfterInfo =
      await tokenQueryContract.getTokenInfoPublic(tokenAddress);

    const tokenInfoAfter = (await txAfterInfo.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenInfo
    )[0].args.tokenInfo[0];
    const responseCodeTokenInfoAfter = (await txAfterInfo.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;

    expect(responseCodeTokenInfoBefore).to.equal(TX_SUCCESS_CODE);
    expect(responseCodeTokenInfoAfter).to.equal(TX_SUCCESS_CODE);
    expect(tokenInfoAfter.name).to.equal(TOKEN_UPDATE_NAME);
    expect(tokenInfoAfter.symbol).to.equal(TOKEN_UPDATE_SYMBOL);
    expect(tokenInfoAfter.memo).to.equal(TOKEN_UPDATE_MEMO);
  });

  it('should be able to update token expiry info', async function () {
    const AUTO_RENEW_PERIOD = 8000000;
    const NEW_AUTO_RENEW_PERIOD = 7999900;
    const AUTO_RENEW_SECOND = 0;
    const epoch = parseInt(
      (Date.now() / 1000 + NEW_AUTO_RENEW_PERIOD).toFixed(0)
    );

    const getTokenExpiryInfoTxBefore =
      await tokenQueryContract.getTokenExpiryInfoPublic(
        tokenAddress,
        Constants.GAS_LIMIT_1_000_000
      );
    const responseCode = (await getTokenExpiryInfoTxBefore.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;
    const tokenExpiryInfoBefore = (
      await getTokenExpiryInfoTxBefore.wait()
    ).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenExpiryInfo
    )[0].args.expiryInfo;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(tokenExpiryInfoBefore.autoRenewPeriod).to.equal(AUTO_RENEW_PERIOD);

    const expiryInfo = {
      second: AUTO_RENEW_SECOND,
      autoRenewAccount: `${signers[0].address}`,
      autoRenewPeriod: NEW_AUTO_RENEW_PERIOD,
    };

    const updateTokenExpiryInfoTx =
      await tokenManagmentContract.updateTokenExpiryInfoPublic(
        tokenAddress,
        expiryInfo,
        Constants.GAS_LIMIT_1_000_000
      );
    const updateExpiryInfoResponseCode = (
      await updateTokenExpiryInfoTx.wait()
    ).logs.filter((e) => e.fragment.name === Constants.Events.ResponseCode)[0]
      .args.responseCode;

    // get updated expiryInfo
    const getTokenExpiryInfoTxAfter =
      await tokenQueryContract.getTokenExpiryInfoPublic(
        tokenAddress,
        Constants.GAS_LIMIT_1_000_000
      );
    const getExpiryInfoResponseCode = (
      await getTokenExpiryInfoTxAfter.wait()
    ).logs.filter((e) => e.fragment.name === Constants.Events.ResponseCode)[0]
      .args.responseCode;
    const tokenExpiryInfoAfter = (
      await getTokenExpiryInfoTxAfter.wait()
    ).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenExpiryInfo
    )[0].args.expiryInfo;

    expect(updateExpiryInfoResponseCode).to.equal(TX_SUCCESS_CODE);
    expect(getExpiryInfoResponseCode).to.equal(TX_SUCCESS_CODE);
    expect(tokenExpiryInfoAfter.autoRenewPeriod).to.equal(
      expiryInfo.autoRenewPeriod
    );
    expect(tokenExpiryInfoAfter.second).to.be.closeTo(epoch, 300);
  });

  it('should be able to update token keys', async function () {
    const getKeyTx = await tokenQueryContract.getTokenKeyPublic(
      tokenAddress,
      2,
      Constants.GAS_LIMIT_1_000_000
    );
    const originalKey = (await getKeyTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenKey
    )[0].args.key;
    const updateKey = [
      false,
      '0x0000000000000000000000000000000000000000',
      '0x',
      '0x03dfcc94dfd843649cc594ada5ac6627031454602aa190223f996de25a05828f36',
      '0x0000000000000000000000000000000000000000',
    ];

    const updateTx = await tokenManagmentContract.updateTokenKeysPublic(
      tokenAddress,
      [[2, updateKey]]
    );
    const updateResponseCode = (await updateTx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args.responseCode;

    // Assert updated key
    const tx = await tokenQueryContract.getTokenKeyPublic(
      tokenAddress,
      2,
      Constants.GAS_LIMIT_1_000_000
    );
    const result = await tx.wait();
    const { responseCode } = result.logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;
    const updatedKey = result.logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenKey
    )[0].args.key;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(updateResponseCode).to.equal(TX_SUCCESS_CODE);

    expect(updatedKey).to.exist;
    expect(updatedKey.inheritAccountKey).to.eq(updateKey[0]);
    expect(updatedKey.contractId).to.eq(updateKey[1]);
    expect(updatedKey.ed25519).to.eq(updateKey[2]);
    expect(updatedKey.ECDSA_secp256k1).to.eq(updateKey[3]);
    expect(updatedKey.delegatableContractId).to.eq(updateKey[4]);
    expect(updatedKey.ECDSA_secp256k1).to.not.eq(originalKey.ECDSA_secp256k1);
  });

  it('should be able to burn token', async function () {
    const amount = BigInt(111);
    const totalSupplyBefore = await erc20Contract.totalSupply(tokenAddress);
    const balanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    await tokenManagmentContract.burnTokenPublic(tokenAddress, amount, []);

    const balanceAfter = await pollForNewERC20Balance(
      erc20Contract,
      tokenAddress,
      signers[0].address,
      balanceBefore
    );
    const totalSupplyAfter = await erc20Contract.totalSupply(tokenAddress);

    expect(totalSupplyAfter).to.equal(totalSupplyBefore - amount);
    expect(balanceAfter).to.equal(balanceBefore - amount);
  });

  it('should be able to dissociate tokens', async function () {
    const signers = await ethers.getSigners();
    const tokenCreateContractWallet2 = tokenCreateContract.connect(signers[1]);
    const tokenManagmentContractWallet2 = tokenManagmentContract.connect(
      signers[1]
    );

    const txDisassociate =
      await tokenManagmentContractWallet2.dissociateTokensPublic(
        signers[1].address,
        [tokenAddress],
        Constants.GAS_LIMIT_1_000_000
      );
    const receiptDisassociate = await txDisassociate.wait();
    expect(
      receiptDisassociate.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode
    ).to.equal(22);

    const txAssociate = await tokenCreateContractWallet2.associateTokensPublic(
      signers[1].address,
      [tokenAddress],
      Constants.GAS_LIMIT_1_000_000
    );
    const receiptAssociate = await txAssociate.wait();
    expect(
      receiptAssociate.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode
    ).to.equal(22);
  });

  it('should be able to dissociate token', async function () {
    const signers = await ethers.getSigners();
    const tokenCreateContractWallet2 = tokenCreateContract.connect(signers[1]);
    const tokenManagmentContractWallet2 = tokenManagmentContract.connect(
      signers[1]
    );

    const txDisassociate =
      await tokenManagmentContractWallet2.dissociateTokenPublic(
        signers[1].address,
        tokenAddress,
        Constants.GAS_LIMIT_1_000_000
      );
    const receiptDisassociate = await txDisassociate.wait();
    expect(
      receiptDisassociate.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode
    ).to.equal(22);

    const txAssociate = await tokenCreateContractWallet2.associateTokenPublic(
      signers[1].address,
      tokenAddress,
      Constants.GAS_LIMIT_1_000_000
    );
    const receiptAssociate = await txAssociate.wait();
    expect(
      receiptAssociate.logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode
    ).to.equal(22);
  });

  describe('Extended update token info and keys test suite', function () {
    async function getTokenInfo(contract, token) {
      const txBeforeInfo = await contract.getTokenInfoPublic(token);
      const tokenInfo = (await txBeforeInfo.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.TokenInfo
      )[0].args.tokenInfo[0];
      expect(
        (await txBeforeInfo.wait()).logs.filter(
          (e) => e.fragment.name === Constants.Events.ResponseCode
        )[0].args.responseCode
      ).to.eq(TX_SUCCESS_CODE);
      return tokenInfo;
    }

    async function updateTokenInfo(contract, token, updateInfo) {
      const txUpdate = await contract.updateTokenInfoPublic(
        token,
        updateInfo,
        Constants.GAS_LIMIT_1_000_000
      );
      expect(
        (await txUpdate.wait()).logs.filter(
          (e) => e.fragment.name === Constants.Events.ResponseCode
        )[0].args.responseCode
      ).to.be.equal(TX_SUCCESS_CODE);
    }

    function updateTokenInfoValues(keyValueType, key) {
      const updatedKey = [
        false,
        '0x0000000000000000000000000000000000000000',
        '0x',
        '0x',
        '0x0000000000000000000000000000000000000000',
      ];

      switch (keyValueType) {
        case utils.KeyValueType.CONTRACT_ID:
          updatedKey[1] = key;
          break;
        case utils.KeyValueType.SECP256K1:
          updatedKey[3] = key;
          break;
        case utils.KeyValueType.DELEGETABLE_CONTRACT_ID:
          updatedKey[4] = key;
          break;
        default:
          break;
      }

      return updatedKey;
    }

    describe('Admin key set to ECDSA_secp256k', function () {
      before(async function () {
        tokenAddress = await utils.createFungibleTokenWithSECP256K1AdminKey(
          tokenCreateContract,
          signers[0].address,
          utils.getSignerCompressedPublicKey()
        );
        await utils.updateTokenKeysViaHapi(tokenAddress, [
          await tokenCreateContract.getAddress(),
          await tokenTransferContract.getAddress(),
          await tokenManagmentContract.getAddress(),
          await tokenQueryContract.getAddress(),
        ]);
        tokenInfoBefore = await getTokenInfo(tokenQueryContract, tokenAddress);

        await utils.associateToken(
          tokenCreateContract,
          tokenAddress,
          Constants.Contract.TokenCreateContract
        );
        await utils.grantTokenKyc(tokenCreateContract, tokenAddress);
      });

      it('should be able to change PAUSE key to contractId and pause the token with same contract', async function () {
        //Update token info
        {
          const contractId = await tokenManagmentContract.getAddress();
          const updatedKey = updateTokenInfoValues(
            utils.KeyValueType.CONTRACT_ID,
            contractId
          );

          const token = {
            name: tokenInfoBefore.name,
            symbol: tokenInfoBefore.symbol,
            memo: tokenInfoBefore.memo,
            treasury: signers[0].address, // treasury has to be the signing account,
            tokenSupplyType: tokenInfoBefore.tokenSupplyType,
            maxSupply: tokenInfoBefore.maxSupply,
            freezeDefault: tokenInfoBefore.freezeDefault,
            tokenKeys: [[utils.KeyType.PAUSE, updatedKey]],
            expiry: {
              second: 0,
              autoRenewAccount: tokenInfoBefore.expiry[1],
              autoRenewPeriod: 0,
            },
          };

          await updateTokenInfo(tokenManagmentContract, tokenAddress, token);
        }

        //Pause and unpause token
        {
          const pauseTokenTx = await tokenManagmentContract
            .connect(signers[1])
            .pauseTokenPublic(tokenAddress);

          await pauseTokenTx.wait();

          const unpauseTokenTx = await tokenManagmentContract
            .connect(signers[1])
            .unpauseTokenPublic(tokenAddress);

          await unpauseTokenTx.wait();

          expect(
            (await pauseTokenTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.PausedToken
            )[0].args.paused
          ).to.eq(true);
          expect(
            (await unpauseTokenTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.UnpausedToken
            )[0].args.unpaused
          ).to.eq(true);
          expect(
            (await pauseTokenTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
          expect(
            (await unpauseTokenTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
        }

        //Revert previous update token info
        {
          const updatedKeyAfter = updateTokenInfoValues(
            utils.KeyValueType.SECP256K1,
            utils.getSignerCompressedPublicKey()
          );

          const tokenAfter = {
            name: tokenInfoBefore.name,
            symbol: tokenInfoBefore.symbol,
            memo: tokenInfoBefore.memo,
            treasury: signers[0].address, // treasury has to be the signing account,
            tokenSupplyType: tokenInfoBefore.tokenSupplyType,
            maxSupply: tokenInfoBefore.maxSupply,
            freezeDefault: tokenInfoBefore.freezeDefault,
            tokenKeys: [[utils.KeyType.PAUSE, updatedKeyAfter]],
            expiry: {
              second: 0,
              autoRenewAccount: tokenInfoBefore.expiry[1],
              autoRenewPeriod: 0,
            },
          };

          tokenAfter.treasury = signers[0].address;
          await updateTokenInfo(
            tokenManagmentContract,
            tokenAddress,
            tokenAfter
          );
        }
      });

      it('should not be able to pause the token with different PAUSE key', async function () {
        const pauseTokenTx = await tokenManagmentContract
          .connect(signers[1])
          .pauseTokenPublic(tokenAddress);
        const unpauseTokenTx = await tokenManagmentContract
          .connect(signers[1])
          .unpauseTokenPublic(tokenAddress);

        await utils.expectToFail(pauseTokenTx, Constants.CALL_EXCEPTION);
        await utils.expectToFail(unpauseTokenTx, Constants.CALL_EXCEPTION);
      });

      it('should be able to change WIPE key to contractId and wipe the token with same contract', async function () {
        //Update token info
        {
          const contractId = await tokenManagmentContract.getAddress();
          const updatedKey = updateTokenInfoValues(
            utils.KeyValueType.CONTRACT_ID,
            contractId
          );

          const token = {
            name: tokenInfoBefore.name,
            symbol: tokenInfoBefore.symbol,
            memo: tokenInfoBefore.memo,
            treasury: signers[0].address, // treasury has to be the signing account,
            tokenSupplyType: tokenInfoBefore.tokenSupplyType,
            maxSupply: tokenInfoBefore.maxSupply,
            freezeDefault: tokenInfoBefore.freezeDefault,
            tokenKeys: [[utils.KeyType.WIPE, updatedKey]],
            expiry: {
              second: 0,
              autoRenewAccount: tokenInfoBefore.expiry[1],
              autoRenewPeriod: 0,
            },
          };

          await updateTokenInfo(tokenManagmentContract, tokenAddress, token);
        }

        //Wipe token
        {
          const wipeAmount = BigInt(3);
          await tokenTransferContract.transferTokensPublic(
            tokenAddress,
            [signers[0].address, signers[1].address],
            [-wipeAmount, wipeAmount]
          );

          const balanceBefore = await pollForNewERC20Balance(
            erc20Contract,
            tokenAddress,
            signers[1].address,
            0n
          );

          const tx = await tokenManagmentContract
            .connect(signers[1])
            .wipeTokenAccountPublic(
              tokenAddress,
              signers[1].address,
              wipeAmount
            );

          const balanceAfter = await pollForNewERC20Balance(
            erc20Contract,
            tokenAddress,
            signers[1].address,
            balanceBefore
          );

          expect(balanceAfter).to.eq(balanceBefore - wipeAmount);
          expect(
            (await tx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
        }

        //Revert previous update token info
        {
          const updatedKeyAfter = updateTokenInfoValues(
            utils.KeyValueType.SECP256K1,
            utils.getSignerCompressedPublicKey()
          );

          const tokenAfter = {
            name: tokenInfoBefore.name,
            symbol: tokenInfoBefore.symbol,
            memo: tokenInfoBefore.memo,
            treasury: signers[0].address, // treasury has to be the signing account,
            tokenSupplyType: tokenInfoBefore.tokenSupplyType,
            maxSupply: tokenInfoBefore.maxSupply,
            freezeDefault: tokenInfoBefore.freezeDefault,
            tokenKeys: [[utils.KeyType.WIPE, updatedKeyAfter]],
            expiry: {
              second: 0,
              autoRenewAccount: tokenInfoBefore.expiry[1],
              autoRenewPeriod: 0,
            },
          };

          tokenAfter.treasury = signers[0].address;
          await updateTokenInfo(
            tokenManagmentContract,
            tokenAddress,
            tokenAfter
          );
        }
      });

      it('should not be able to wipe the token with different WIPE key', async function () {
        const wipeAmount = 3;
        await tokenTransferContract.transferTokensPublic(
          tokenAddress,
          [signers[0].address, signers[1].address],
          [-wipeAmount, wipeAmount]
        );

        // await until the new balance is settled for signers[1]
        await pollForNewERC20Balance(
          erc20Contract,
          tokenAddress,
          signers[1].address,
          0n
        );

        const wipeTokenTx = await tokenManagmentContract
          .connect(signers[1])
          .wipeTokenAccountPublic(tokenAddress, signers[1].address, wipeAmount);
        await utils.expectToFail(wipeTokenTx, Constants.CALL_EXCEPTION);
      });

      it('should be able to change FREEZE key to contractId and freeze the token with same contract', async function () {
        //Update token info
        {
          const contractId = await tokenManagmentContract.getAddress();
          const updatedKey = updateTokenInfoValues(
            utils.KeyValueType.CONTRACT_ID,
            contractId
          );

          const token = {
            name: tokenInfoBefore.name,
            symbol: tokenInfoBefore.symbol,
            memo: tokenInfoBefore.memo,
            treasury: signers[0].address, // treasury has to be the signing account,
            tokenSupplyType: tokenInfoBefore.tokenSupplyType,
            maxSupply: tokenInfoBefore.maxSupply,
            freezeDefault: tokenInfoBefore.freezeDefault,
            tokenKeys: [[utils.KeyType.FREEZE, updatedKey]],
            expiry: {
              second: 0,
              autoRenewAccount: tokenInfoBefore.expiry[1],
              autoRenewPeriod: 0,
            },
          };

          token.treasury = signers[0].address;

          await updateTokenInfo(tokenManagmentContract, tokenAddress, token);
        }

        //Freeze and unfreeze token
        {
          const freezeTx = await tokenManagmentContract
            .connect(signers[1])
            .freezeTokenPublic(
              tokenAddress,
              await tokenCreateContract.getAddress()
            );
          const isFrozenTxBefore = await tokenQueryContract.isFrozenPublic(
            tokenAddress,
            await tokenCreateContract.getAddress(),
            Constants.GAS_LIMIT_1_000_000
          );

          const unfreezeTx = await tokenManagmentContract
            .connect(signers[1])
            .unfreezeTokenPublic(
              tokenAddress,
              await tokenCreateContract.getAddress()
            );
          const isFrozenTxAfter = await tokenQueryContract.isFrozenPublic(
            tokenAddress,
            await tokenCreateContract.getAddress(),
            Constants.GAS_LIMIT_1_000_000
          );

          expect(
            (await isFrozenTxBefore.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.Frozen
            )[0].args.frozen
          ).to.eq(true);
          expect(
            (await isFrozenTxAfter.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.Frozen
            )[0].args.frozen
          ).to.eq(false);

          expect(
            (await freezeTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
          expect(
            (await unfreezeTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
        }

        //Revert previous update token info
        {
          const updatedKeyAfter = updateTokenInfoValues(
            utils.KeyValueType.SECP256K1,
            utils.getSignerCompressedPublicKey()
          );

          const tokenAfter = {
            name: tokenInfoBefore.name,
            symbol: tokenInfoBefore.symbol,
            memo: tokenInfoBefore.memo,
            treasury: signers[0].address, // treasury has to be the signing account,
            tokenSupplyType: tokenInfoBefore.tokenSupplyType,
            maxSupply: tokenInfoBefore.maxSupply,
            freezeDefault: tokenInfoBefore.freezeDefault,
            tokenKeys: [[utils.KeyType.FREEZE, updatedKeyAfter]],
            expiry: {
              second: 0,
              autoRenewAccount: tokenInfoBefore.expiry[1],
              autoRenewPeriod: 0,
            },
          };

          tokenAfter.treasury = signers[0].address;
          await updateTokenInfo(
            tokenManagmentContract,
            tokenAddress,
            tokenAfter
          );
        }
      });

      it('should not be able to freeze the token with different FREEZE key', async function () {
        const freezeTokenTx = await tokenManagmentContract
          .connect(signers[1])
          .freezeTokenPublic(
            tokenAddress,
            await tokenCreateContract.getAddress()
          );
        const unfreezeTokenTx = await tokenManagmentContract
          .connect(signers[1])
          .unfreezeTokenPublic(
            tokenAddress,
            await tokenCreateContract.getAddress(),
            Constants.GAS_LIMIT_1_000_000
          );

        await utils.expectToFail(freezeTokenTx, Constants.CALL_EXCEPTION);
        await utils.expectToFail(unfreezeTokenTx, Constants.CALL_EXCEPTION);
      });

      it('should be able to change ADMIN key to contractId and perform admin action with same contract', async function () {
        //Update token info
        {
          const contractId = await tokenManagmentContract.getAddress();

          const updatedKey = updateTokenInfoValues(
            utils.KeyValueType.CONTRACT_ID,
            contractId
          );

          const token = {
            name: tokenInfoBefore.name,
            symbol: tokenInfoBefore.symbol,
            memo: tokenInfoBefore.memo,
            treasury: signers[0].address, // treasury has to be the signing account,
            tokenSupplyType: tokenInfoBefore.tokenSupplyType,
            maxSupply: tokenInfoBefore.maxSupply,
            freezeDefault: tokenInfoBefore.freezeDefault,
            tokenKeys: [[utils.KeyType.ADMIN, updatedKey]],
            expiry: {
              second: 0,
              autoRenewAccount: tokenInfoBefore.expiry[1],
              autoRenewPeriod: 0,
            },
          };

          token.treasury = signers[0].address;

          await updateTokenInfo(tokenManagmentContract, tokenAddress, token);
        }

        //Change supply key with admin contract
        {
          const updatedKey = updateTokenInfoValues(
            utils.KeyValueType.CONTRACT_ID,
            await tokenTransferContract.getAddress()
          );

          const keyTxBefore = await tokenQueryContract.getTokenKeyPublic(
            tokenAddress,
            utils.KeyType.SUPPLY,
            Constants.GAS_LIMIT_1_000_000
          );
          const keyBefore = (await keyTxBefore.wait()).logs.filter(
            (e) => e.fragment.name === Constants.Events.TokenKey
          )[0].args.key;

          const updateTokenKeyTx = await tokenManagmentContract
            .connect(signers[1])
            .updateTokenKeysPublic(tokenAddress, [
              [utils.KeyType.SUPPLY, updatedKey],
            ]);

          const keyTxAfter = await tokenQueryContract.getTokenKeyPublic(
            tokenAddress,
            utils.KeyType.SUPPLY,
            Constants.GAS_LIMIT_1_000_000
          );
          const keyAfter = (await keyTxAfter.wait()).logs.filter(
            (e) => e.fragment.name === Constants.Events.TokenKey
          )[0].args.key;

          expect(keyBefore[1]).to.not.eq(keyAfter[1]);
          expect(
            (await updateTokenKeyTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
        }
      });

      it('should be able to perform admin action with TokenManagementContract as ADMIN key', async function () {
        const updatedKey = updateTokenInfoValues(
          utils.KeyValueType.CONTRACT_ID,
          await tokenTransferContract.getAddress()
        );
        const updateTokenKeyTx = await tokenManagmentContract
          .connect(signers[1])
          .updateTokenKeysPublic(tokenAddress, [
            [utils.KeyType.SUPPLY, updatedKey],
          ]);

        expect(
          (await updateTokenKeyTx.wait()).logs.filter(
            (e) => e.fragment.name === Constants.Events.ResponseCode
          )[0].args.responseCode
        ).to.eq(TX_SUCCESS_CODE);
      });
    });

    describe('Admin key set to contractId', function () {
      before(async function () {
        tokenAddress = await utils.createFungibleTokenWithSECP256K1AdminKey(
          tokenCreateContract,
          signers[0].address,
          utils.getSignerCompressedPublicKey()
        );

        await utils.updateTokenKeysViaHapi(tokenAddress, [
          await tokenCreateContract.getAddress(),
          await tokenTransferContract.getAddress(),
          await tokenManagmentContract.getAddress(),
          await tokenQueryContract.getAddress(),
        ]);

        tokenInfoBefore = await getTokenInfo(tokenQueryContract, tokenAddress);

        await utils.associateToken(
          tokenCreateContract,
          tokenAddress,
          Constants.Contract.TokenCreateContract
        );

        await utils.grantTokenKyc(tokenCreateContract, tokenAddress);
      });
      describe('Positive', function () {
        it('should be able to change PAUSE key to ECDSA_secp256k and pause the token with the same account', async function () {
          await utils.updateTokenKeysViaHapi(
            tokenAddress,
            [await tokenManagmentContract.getAddress()],
            false,
            true,
            false,
            false,
            false,
            false
          );

          const pauseTokenTx = await tokenManagmentContract
            .connect(signers[1])
            .pauseTokenPublic(tokenAddress);
          const unpauseTokenTx = await tokenManagmentContract
            .connect(signers[1])
            .unpauseTokenPublic(tokenAddress);

          expect(
            (await pauseTokenTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.PausedToken
            )[0].args.paused
          ).to.eq(true);
          expect(
            (await unpauseTokenTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.UnpausedToken
            )[0].args.unpaused
          ).to.eq(true);
          expect(
            (await pauseTokenTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
          expect(
            (await unpauseTokenTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
        });

        it('should be able to change WIPE key to ECDSA_secp256k and wipe the token with the same account', async function () {
          await utils.updateTokenKeysViaHapi(
            tokenAddress,
            [await tokenManagmentContract.getAddress()],
            false,
            false,
            false,
            false,
            false,
            true
          );
          const wipeAmount = 3;
          await tokenTransferContract.transferTokensPublic(
            tokenAddress,
            [signers[0].address, signers[1].address],
            [-wipeAmount, wipeAmount],
            Constants.GAS_LIMIT_1_000_000
          );

          const balanceBefore = await pollForNewERC20Balance(
            erc20Contract,
            tokenAddress,
            signers[1].address,
            0n
          );

          const tx = await tokenManagmentContract
            .connect(signers[1])
            .wipeTokenAccountPublic(
              tokenAddress,
              signers[1].address,
              wipeAmount
            );

          const balanceAfter = await pollForNewERC20Balance(
            erc20Contract,
            tokenAddress,
            signers[1].address,
            balanceBefore
          );

          expect(balanceAfter).to.eq(balanceBefore - BigInt(wipeAmount));
          expect(
            (await tx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
        });

        it('should be able to change FREEZE key to ECDSA_secp256k and freeze the token with the same account', async function () {
          await utils.updateTokenKeysViaHapi(
            tokenAddress,
            [await tokenManagmentContract.getAddress()],
            false,
            false,
            false,
            true,
            false,
            false
          );
          const freezeTx = await tokenManagmentContract
            .connect(signers[1])
            .freezeTokenPublic(
              tokenAddress,
              await tokenCreateContract.getAddress(),
              Constants.GAS_LIMIT_1_000_000
            );
          const isFrozenTxBefore = await tokenQueryContract.isFrozenPublic(
            tokenAddress,
            await tokenCreateContract.getAddress(),
            Constants.GAS_LIMIT_1_000_000
          );

          const unfreezeTx = await tokenManagmentContract
            .connect(signers[1])
            .unfreezeTokenPublic(
              tokenAddress,
              await tokenCreateContract.getAddress(),
              Constants.GAS_LIMIT_1_000_000
            );
          const isFrozenTxAfter = await tokenQueryContract.isFrozenPublic(
            tokenAddress,
            await tokenCreateContract.getAddress(),
            Constants.GAS_LIMIT_1_000_000
          );

          expect(
            (await isFrozenTxBefore.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.Frozen
            )[0].args.frozen
          ).to.eq(true);
          expect(
            (await isFrozenTxAfter.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.Frozen
            )[0].args.frozen
          ).to.eq(false);

          expect(
            (await freezeTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
          expect(
            (await unfreezeTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
        });

        it('should be able to change ADMIN key to ECDSA_secp256k and perform admin action with same contract', async function () {
          await utils.updateTokenKeysViaHapi(
            tokenAddress,
            [await tokenManagmentContract.getAddress()],
            true,
            false,
            false,
            false,
            false,
            false
          );
          const keyTxBefore = await tokenQueryContract.getTokenKeyPublic(
            tokenAddress,
            utils.KeyType.SUPPLY,
            Constants.GAS_LIMIT_1_000_000
          );
          const keyBefore = (await keyTxBefore.wait()).logs.filter(
            (e) => e.fragment.name === Constants.Events.TokenKey
          )[0].args.key;
          const updatedKey = updateTokenInfoValues(
            utils.KeyValueType.CONTRACT_ID,
            await tokenTransferContract.getAddress()
          );
          const updateTokenKeyTx = await tokenManagmentContract
            .connect(signers[0])
            .updateTokenKeysPublic(tokenAddress, [
              [utils.KeyType.SUPPLY, updatedKey],
            ]);
          const keyTxAfter = await tokenQueryContract.getTokenKeyPublic(
            tokenAddress,
            utils.KeyType.SUPPLY,
            Constants.GAS_LIMIT_1_000_000
          );
          const keyAfter = (await keyTxAfter.wait()).logs.filter(
            (e) => e.fragment.name === Constants.Events.TokenKey
          )[0].args.key;

          expect(keyBefore[1]).to.not.eq(keyAfter[1]);
          expect(
            (await updateTokenKeyTx.wait()).logs.filter(
              (e) => e.fragment.name === Constants.Events.ResponseCode
            )[0].args.responseCode
          ).to.eq(TX_SUCCESS_CODE);
        });
      });
      describe('Negative', function () {
        before(async function () {
          tokenAddress = await utils.createFungibleTokenWithSECP256K1AdminKey(
            tokenCreateContract,
            signers[0].address,
            utils.getSignerCompressedPublicKey()
          );
        });
        it('should not be able to pause the token with different PAUSE key', async function () {
          const pauseTokenTx = await tokenManagmentContract
            .connect(signers[1])
            .pauseTokenPublic(tokenAddress);
          const unpauseTokenTx = await tokenManagmentContract
            .connect(signers[1])
            .unpauseTokenPublic(tokenAddress);

          await utils.expectToFail(pauseTokenTx, Constants.CALL_EXCEPTION);
          await utils.expectToFail(unpauseTokenTx, Constants.CALL_EXCEPTION);
        });

        it('should not be able to wipe the token with different WIPE key', async function () {
          const wipeAmount = 3;

          await utils.updateTokenKeysViaHapi(tokenAddress, [
            await tokenCreateContract.getAddress(),
          ]);

          await utils.associateToken(
            tokenCreateContract,
            tokenAddress,
            Constants.Contract.TokenCreateContract
          );
          await utils.grantTokenKyc(tokenCreateContract, tokenAddress);

          await tokenTransferContract.transferTokensPublic(
            tokenAddress,
            [signers[0].address, signers[1].address],
            [-wipeAmount, wipeAmount],
            Constants.GAS_LIMIT_1_000_000
          );

          // await until the new balance is settled for signers[1]
          await pollForNewERC20Balance(
            erc20Contract,
            tokenAddress,
            signers[1].address,
            0n
          );

          const wipeTokenTx = await tokenManagmentContract
            .connect(signers[1])
            .wipeTokenAccountPublic(
              tokenAddress,
              signers[1].address,
              wipeAmount
            );
          await utils.expectToFail(wipeTokenTx, Constants.CALL_EXCEPTION);
        });

        it('should not be able to freeze the token with different FREEZE key', async function () {
          const freezeTokenTx = await tokenManagmentContract
            .connect(signers[1])
            .freezeTokenPublic(
              tokenAddress,
              await tokenCreateContract.getAddress()
            );
          const unfreezeTokenTx = await tokenManagmentContract
            .connect(signers[1])
            .unfreezeTokenPublic(
              tokenAddress,
              await tokenCreateContract.getAddress()
            );

          await utils.expectToFail(freezeTokenTx, Constants.CALL_EXCEPTION);
          await utils.expectToFail(unfreezeTokenTx, Constants.CALL_EXCEPTION);
        });

        it('should not be able to perform admin action with different ADMIN key', async function () {
          const updatedKey = updateTokenInfoValues(
            utils.KeyValueType.CONTRACT_ID,
            await tokenTransferContract.getAddress()
          );
          const updateTokenKeyTx = await tokenManagmentContract
            .connect(signers[1])
            .updateTokenKeysPublic(tokenAddress, [
              [utils.KeyType.SUPPLY, updatedKey],
            ]);
          await utils.expectToFail(updateTokenKeyTx, Constants.CALL_EXCEPTION);
        });
      });
    });
  });

  describe('Update fees', function () {
    let feeToken;
    let tokenWithFees;
    let tenHbars;
    let twentyHbars;
    let tokenFeeAmount;

    before(async function () {
      // The owner of the fee token is the tokenCreateContract
      const adminKey = utils.constructIHederaTokenKey(
        'ADMIN',
        'SECP256K1',
        utils.getSignerCompressedPublicKey(0)
      );
      const kycKey = utils.constructIHederaTokenKey(
        'KYC',
        'CONTRACT_ID',
        await tokenCreateCustomContract.getAddress()
      );
      const freezeKey = utils.constructIHederaTokenKey(
        'FREEZE',
        'CONTRACT_ID',
        await tokenCreateCustomContract.getAddress()
      );
      const wipeKey = utils.constructIHederaTokenKey(
        'WIPE',
        'CONTRACT_ID',
        await tokenCreateCustomContract.getAddress()
      );
      const supplyKey = utils.constructIHederaTokenKey(
        'SUPPLY',
        'CONTRACT_ID',
        await tokenCreateCustomContract.getAddress()
      );
      const feeKey = utils.constructIHederaTokenKey(
        'FEE',
        'CONTRACT_ID',
        await tokenCreateCustomContract.getAddress()
      );
      const pauseKey = utils.constructIHederaTokenKey(
        'PAUSE',
        'CONTRACT_ID',
        await tokenCreateCustomContract.getAddress()
      );

      keys = [
        adminKey,
        kycKey,
        freezeKey,
        wipeKey,
        supplyKey,
        feeKey,
        pauseKey,
      ];
    });

    beforeEach(async function () {
      tenHbars = 10 * utils.tinybarToHbarCoef;
      twentyHbars = 20 * utils.tinybarToHbarCoef;
      tokenFeeAmount = 50;
      initialSupply = 1000000000;
      maxSupply = 2000000000;
      decimals = 0;
      feeToken = await utils.createFungibleTokenWithPresetKeysPublic(
        tokenCreateCustomContract,
        'FeeToken',
        'FT',
        'FeeToken',
        1000000000,
        2000000000,
        0,
        false,
        tokenCreateCustomContractAddress
      );
    });

    it('should be able to update fixed fee in HTS token', async function () {
      //need to associate the fee collector account of the token that will have fees
      await utils.associateAndGrantKyc(tokenCreateCustomContract, feeToken, [
        signers[0].address,
      ]);

      const fixedFee = [
        {
          amount: tokenFeeAmount,
          tokenId: feeToken,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        },
      ];
      tokenWithFees = await utils.createFungibleTokenWithCustomFeesAndKeys(
        tokenCreateCustomContract,
        signers[0].address,
        fixedFee,
        [],
        keys
      );
      await utils.updateTokenKeysViaHapi(tokenWithFees, [
        tokenManagementContractAddress,
        tokenTransferContractAddress,
        tokenCreateContractAddress,
        tokenCreateCustomContractAddress,
      ]);

      // ------------------ Associate and grantKyc to accounts tranfering tokenWithFees ------------------
      //TODO: error handling
      await utils.associateAndGrantKyc(tokenCreateContract, tokenWithFees, [
        signers[1].address,
        signers[2].address,
      ]);
      await utils.associateAndGrantKyc(tokenCreateCustomContract, feeToken, [
        signers[1].address,
      ]);

      const grantKycTx = await tokenCreateCustomContract.grantTokenKycPublic(
        feeToken,
        tokenCreateCustomContractAddress
      );
      await grantKycTx.wait();

      const transferTx = await tokenTransferContract.transferTokensPublic(
        tokenWithFees,
        [signers[0].address, signers[1].address],
        [-500, 500]
      );
      await transferTx.wait();

      const approveTx = await tokenCreateCustomContract.approvePublic(
        feeToken,
        tokenTransferContract,
        1000,
        Constants.GAS_LIMIT_1_000_000
      );
      await approveTx.wait();

      const transferFeeTokenToSigner1 =
        await tokenTransferContract.transferTokensPublic(
          feeToken,
          [tokenCreateCustomContractAddress, signers[1].address],
          [-150, 150],
          Constants.GAS_LIMIT_1_000_000
        );
      await transferFeeTokenToSigner1.wait();

      const updatedTokenFeeAmount = tokenFeeAmount + 15;
      const updatedFixedFee = [
        {
          amount: updatedTokenFeeAmount,
          tokenId: feeToken,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        },
      ];
      const updateFeeTx =
        await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
          tokenWithFees,
          updatedFixedFee,
          []
        );
      const updateFeeResponseCode = (await updateFeeTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode;

      const balanceBeforeTransferTokenWithFees1 = await utils.getTokenBalance(
        signers[1].address,
        tokenWithFees
      );
      const balanceBeforeTransferTokenWithFees2 = await utils.getTokenBalance(
        signers[2].address,
        tokenWithFees
      );
      const balanceBeforeTransferFeeToken1 = await utils.getTokenBalance(
        signers[1].address,
        feeToken
      );

      const transferBeforeFeeUpdate =
        await tokenTransferContract.transferTokensPublic(
          tokenWithFees,
          [signers[1].address, signers[2].address],
          [-50, 50],
          Constants.GAS_LIMIT_1_000_000
        );
      await transferBeforeFeeUpdate.wait();

      const balanceAfterTransferTokenWithFees1 = await utils.getTokenBalance(
        signers[1].address,
        tokenWithFees
      );
      const balanceAfterTransferTokenWithFees2 = await utils.getTokenBalance(
        signers[2].address,
        tokenWithFees
      );
      const balanceAfterTransferFeeToken1 = await utils.getTokenBalance(
        signers[1].address,
        feeToken
      );

      expect(balanceAfterTransferTokenWithFees1).to.be.equal(
        balanceBeforeTransferTokenWithFees1 - 50
      );
      expect(balanceAfterTransferTokenWithFees2).to.be.equal(
        balanceBeforeTransferTokenWithFees2 + 50
      );
      expect(balanceAfterTransferFeeToken1).to.be.equal(
        balanceBeforeTransferFeeToken1 - updatedTokenFeeAmount
      );

      const tokenInfoTx =
        await tokenQueryContract.getTokenInfoPublic(tokenWithFees);
      const tokenInfoResponse = (await tokenInfoTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.TokenInfo
      )[0].args.tokenInfo;

      expect(tokenInfoResponse[5].length).to.be.greaterThan(0);
      expect(tokenInfoResponse[5][0][2]).to.equal(false);
      expect(updateFeeResponseCode).to.equal(TX_SUCCESS_CODE);
    });

    it('should be able to update fixed fee for HBARs', async function () {
      const fixedFee = [
        {
          amount: tenHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        },
      ];
      const tokenWithFixedHbarFee =
        await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          fixedFee,
          [],
          keys
        );
      await utils.updateTokenKeysViaHapi(tokenWithFixedHbarFee, [
        tokenManagementContractAddress,
        tokenCreateContractAddress,
      ]);
      // ------------------ Associate and grantKyc to accounts transfering tokenWithFixedHbarFee ------------------
      await utils.associateAndGrantKyc(
        tokenCreateContract,
        tokenWithFixedHbarFee,
        [signers[1].address, signers[2].address]
      );

      const transferFromContract =
        await tokenTransferContract.transferTokensPublic(
          tokenWithFixedHbarFee,
          [signers[0].address, signers[1].address],
          [-500, 500]
        );
      const transferFromContractReceipt = await transferFromContract.wait();

      const balanceBeforeTransfer0 = await utils.getHbarBalance(
        signers[1].address
      );
      const balanceBeforeTransferContract0 = await utils.getHbarBalance(
        signers[2].address
      );

      const transferBeforeFeeUpdate =
        await tokenTransferContract.transferTokensPublic(
          tokenWithFixedHbarFee,
          [signers[1].address, signers[2].address],
          [-50, 50],
          Constants.GAS_LIMIT_1_000_000
        );
      await transferBeforeFeeUpdate.wait();

      const balanceAfterTransfer = await utils.getHbarBalance(
        signers[1].address
      );
      const balanceAfterTransferContract = await utils.getHbarBalance(
        signers[2].address
      );

      expect(parseFloat(balanceAfterTransfer)).to.be.equal(
        parseFloat(balanceBeforeTransfer0) -
          parseFloat(tenHbars / utils.tinybarToHbarCoef)
      );
      const updatedFixedFee = [
        {
          amount: twentyHbars,
          tokenId: '0x0000000000000000000000000000000000000000',
          useHbarsForPayment: true,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        },
      ];

      const updateFeeTx =
        await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
          tokenWithFixedHbarFee,
          updatedFixedFee,
          []
        );
      const updateFeeResponseCode = (await updateFeeTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode;

      const transferAfterFeeUpdate =
        await tokenTransferContract.transferTokensPublic(
          tokenWithFixedHbarFee,
          [signers[1].address, signers[2].address],
          [-50, 50],
          Constants.GAS_LIMIT_1_000_000
        );
      await transferAfterFeeUpdate.wait();
      const balanceAfterUpdate = await utils.getHbarBalance(signers[1].address);
      const balanceAfterUpdateContract = await utils.getHbarBalance(
        signers[2].address
      );

      expect(parseFloat(balanceAfterUpdate)).to.be.equal(
        parseFloat(balanceAfterTransfer) -
          parseFloat(twentyHbars / utils.tinybarToHbarCoef)
      );
      const tokenInfoTx = await tokenQueryContract.getTokenInfoPublic(
        tokenWithFixedHbarFee
      );

      const tokenInfoResponse = (await tokenInfoTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.TokenInfo
      )[0].args.tokenInfo;

      expect(tokenInfoResponse[5].length).to.be.greaterThan(0);
      expect(tokenInfoResponse[5][0][2]).to.equal(true);
      expect(updateFeeResponseCode).to.equal(TX_SUCCESS_CODE);
    });

    it('should be able to update fixed fee in the same token', async function () {
      const fixedFeeSameToken = [
        {
          amount: tokenFeeAmount,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: true,
          feeCollector: signers[3].address,
        },
      ];
      const tokenWithFixedFeeInSameToken =
        await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          fixedFeeSameToken,
          [],
          keys
        );

      await utils.updateTokenKeysViaHapi(tokenWithFixedFeeInSameToken, [
        tokenManagementContractAddress,
        tokenTransferContractAddress,
        tokenCreateContractAddress,
      ]);

      await utils.associateAndGrantKyc(
        tokenCreateContract,
        tokenWithFixedFeeInSameToken,
        [signers[1].address]
      );

      const transferTokenFromTreasury =
        await tokenTransferContract.transferTokensPublic(
          tokenWithFixedFeeInSameToken,
          [signers[0].address, signers[1].address],
          [-500, 500],
          Constants.GAS_LIMIT_1_000_000
        );
      await transferTokenFromTreasury.wait();

      const newFeeTokenAmount = tokenFeeAmount + 100;
      const fixedFeeSameTokenUpdated = [
        {
          amount: newFeeTokenAmount,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: true,
          feeCollector: signers[3].address,
        },
      ];
      const updateFeeTx =
        await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
          tokenWithFixedFeeInSameToken,
          fixedFeeSameTokenUpdated,
          []
        );
      await updateFeeTx.wait();

      const updateFeeResponseCode = (await updateFeeTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode;
      const tokenInfoTx = await tokenQueryContract.getTokenInfoPublic(
        tokenWithFixedFeeInSameToken
      );

      const tokenInfoResponse = (await tokenInfoTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.TokenInfo
      )[0].args.tokenInfo;

      expect(tokenInfoResponse[5].length).to.be.greaterThan(0);
      expect(updateFeeResponseCode).to.equal(TX_SUCCESS_CODE);
    });

    it('should be able to update multiple fixed fees in HTS token', async function () {
      const feeToken2 = await utils.createFungibleTokenWithPresetKeysPublic(
        tokenCreateCustomContract,
        'FeeToken2',
        'FT2',
        'FeeToken2',
        initialSupply,
        maxSupply,
        decimals,
        false,
        signers[3].address
      );
      //need to associate the fee collector account of the token that will have fees
      // with the fee token, since otherwise the collector won't be able to receive this token
      const associateTx = await tokenCreateCustomContract.associateTokenPublic(
        signers[0].address,
        feeToken2,
        Constants.GAS_LIMIT_1_000_000
      );
      await associateTx.wait();
      const associateTx2 = await tokenCreateCustomContract.associateTokenPublic(
        signers[0].address,
        feeToken,
        Constants.GAS_LIMIT_1_000_000
      );
      await associateTx2.wait();

      const fixedFee = {
        amount: tokenFeeAmount,
        tokenId: feeToken,
        useHbarsForPayment: false,
        useCurrentTokenForPayment: false,
        feeCollector: signers[0].address,
      };
      const fixedFee2 = {
        amount: tokenFeeAmount + 20,
        tokenId: feeToken2,
        useHbarsForPayment: false,
        useCurrentTokenForPayment: false,
        feeCollector: signers[0].address,
      };

      const tokenWithFees =
        await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [fixedFee, fixedFee2],
          [],
          keys
        );
      expect(
        await utils.getTokenBalance(signers[0].address, tokenWithFees)
      ).to.be.equal(utils.initialSupply);
      await utils.updateTokenKeysViaHapi(tokenWithFees, [
        tokenManagementContractAddress,
        tokenTransferContractAddress,
        tokenCreateContractAddress,
        tokenCreateCustomContractAddress,
      ]);

      const associateTx3 = await tokenCreateCustomContract.associateTokenPublic(
        signers[2].address,
        feeToken2,
        Constants.GAS_LIMIT_1_000_000
      );
      await associateTx3.wait();

      const newTokenAmount = tokenFeeAmount + 25;
      const updatedFixedFee = {
        amount: newTokenAmount,
        tokenId: feeToken,
        useHbarsForPayment: false,
        useCurrentTokenForPayment: false,
        feeCollector: signers[0].address,
      };
      const updatedFixedFee2 = {
        amount: tokenFeeAmount + 18,
        tokenId: feeToken2,
        useHbarsForPayment: false,
        useCurrentTokenForPayment: false,
        feeCollector: signers[2].address,
      };
      const updateFeeTx =
        await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
          tokenWithFees,
          [updatedFixedFee, updatedFixedFee2],
          []
        );
      const updateFeeResponseCode = (await updateFeeTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode;
      const tokenInfoTx =
        await tokenQueryContract.getTokenInfoPublic(tokenWithFees);
      const tokenInfoResponse = (await tokenInfoTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.TokenInfo
      )[0].args.tokenInfo;

      expect(tokenInfoResponse[5].length).to.be.greaterThan(0);
      expect(tokenInfoResponse[5][0][0]).to.equal(BigInt(newTokenAmount));
      expect(tokenInfoResponse[5][0][2]).to.equal(false);
      expect(tokenInfoResponse[5][0][3]).to.equal(false);
      expect(tokenInfoResponse[5][1][0]).to.equal(BigInt(tokenFeeAmount + 18));
      expect(tokenInfoResponse[5][1][2]).to.equal(false);
      expect(tokenInfoResponse[5][1][3]).to.equal(false);
      expect(updateFeeResponseCode).to.equal(TX_SUCCESS_CODE);

      //TODO: Add transfer and test if the fee is collected
    });

    it('should be able to update multiple fixed fees in HBARs', async function () {
      const thirtyHbars = 30 * utils.tinybarToHbarCoef;
      const fixedFee = {
        amount: tenHbars,
        tokenId: ethers.ZeroAddress,
        useHbarsForPayment: true,
        useCurrentTokenForPayment: false,
        feeCollector: signers[0].address,
      };
      const fixedFee2 = {
        amount: thirtyHbars,
        tokenId: ethers.ZeroAddress,
        useHbarsForPayment: true,
        useCurrentTokenForPayment: false,
        feeCollector: signers[0].address,
      };
      const tokenWithFixedHbarFee =
        await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [fixedFee, fixedFee2],
          [],
          keys
        );
      await utils.updateTokenKeysViaHapi(tokenWithFixedHbarFee, [
        tokenManagementContractAddress,
        tokenCreateContractAddress,
      ]);
      // ------------------ Associate and grantKyc to accounts transfering tokenWithFixedHbarFee ------------------
      await utils.associateAndGrantKyc(
        tokenCreateContract,
        tokenWithFixedHbarFee,
        [signers[1].address, signers[2].address]
      );

      const transferFromContract =
        await tokenTransferContract.transferTokensPublic(
          tokenWithFixedHbarFee,
          [signers[0].address, signers[1].address],
          [-500, 500]
        );
      await transferFromContract.wait();

      const balanceBeforeTransfer0 = await utils.getHbarBalance(
        signers[1].address
      );

      const transferBeforeFeeUpdate =
        await tokenTransferContract.transferTokensPublic(
          tokenWithFixedHbarFee,
          [signers[1].address, signers[2].address],
          [-50, 50],
          Constants.GAS_LIMIT_1_000_000
        );
      await transferBeforeFeeUpdate.wait();

      const balanceAfterTransfer = await utils.getHbarBalance(
        signers[1].address
      );

      expect(parseFloat(balanceAfterTransfer)).to.be.equal(
        parseFloat(balanceBeforeTransfer0) -
          parseFloat((tenHbars + thirtyHbars) / utils.tinybarToHbarCoef)
      );
      const updatedFixedFee = {
        amount: twentyHbars,
        tokenId: ethers.ZeroAddress,
        useHbarsForPayment: true,
        useCurrentTokenForPayment: false,
        feeCollector: signers[0].address,
      };
      const updatedFixedFee2 = {
        amount: twentyHbars,
        tokenId: ethers.ZeroAddress,
        useHbarsForPayment: true,
        useCurrentTokenForPayment: false,
        feeCollector: signers[0].address,
      };
      const updateFeeTx =
        await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
          tokenWithFixedHbarFee,
          [updatedFixedFee, updatedFixedFee2],
          []
        );
      const updateFeeResponseCode = (await updateFeeTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode;

      const transferAfterFeeUpdate =
        await tokenTransferContract.transferTokensPublic(
          tokenWithFixedHbarFee,
          [signers[1].address, signers[2].address],
          [-50, 50],
          Constants.GAS_LIMIT_1_000_000
        );
      await transferAfterFeeUpdate.wait();
      const balanceAfterUpdate = await utils.getHbarBalance(signers[1].address);

      expect(parseFloat(balanceAfterUpdate)).to.be.equal(
        parseFloat(balanceAfterTransfer) -
          parseFloat((twentyHbars * 2) / utils.tinybarToHbarCoef)
      );

      const tokenInfoTx = await tokenQueryContract.getTokenInfoPublic(
        tokenWithFixedHbarFee
      );
      const tokenInfoResponse = (await tokenInfoTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.TokenInfo
      )[0].args.tokenInfo;

      expect(tokenInfoResponse[5].length).to.be.greaterThan(0);
      expect(tokenInfoResponse[5][0][2]).to.equal(true);
      expect(updateFeeResponseCode).to.equal(TX_SUCCESS_CODE);
    });

    it('should be able to update fractional fee with net of transfer false in HTS token', async function () {
      const fractionalFeeNumerator = 30;
      const fractionalFeeDenominator = 100;
      const feeToken2 = await utils.createFungibleTokenWithPresetKeysPublic(
        tokenCreateCustomContract,
        'FeeToken2',
        'FT2',
        'FeeToken2',
        initialSupply,
        maxSupply,
        decimals,
        false,
        signers[3].address
      );
      await utils.associateToken(
        tokenCreateCustomContract,
        feeToken2,
        Constants.Contract.TokenCreateContract
      );

      const fractionalFee = {
        numerator: fractionalFeeNumerator,
        denominator: fractionalFeeDenominator,
        minimumAmount: 0,
        maximumAmount: 0,
        netOfTransfers: false,
        feeCollector: signers[0].address,
      };
      const fixedFee2 = {
        amount: tokenFeeAmount + 50,
        tokenId: feeToken2,
        useHbarsForPayment: false,
        useCurrentTokenForPayment: false,
        feeCollector: signers[0].address,
      };
      const tokenWithFees =
        await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [fixedFee2],
          [fractionalFee],
          keys
        );

      await utils.updateTokenKeysViaHapi(tokenWithFees, [
        tokenManagementContractAddress,
        tokenTransferContractAddress,
        tokenCreateContractAddress,
        tokenCreateCustomContractAddress,
      ]);

      const updatedFractionalFeeNumerator = fractionalFeeNumerator + 5;
      const updatedFractionalFee = [
        {
          numerator: updatedFractionalFeeNumerator,
          denominator: fractionalFeeDenominator,
          minimumAmount: 100,
          maximumAmount: 1000,
          netOfTransfers: false,
          feeCollector: signers[0].address,
        },
      ];

      // make a transfer and ensure that the fee is collected
      //apparently first you need to associate and then gran token kyc
      await utils.associateAndGrantKyc(tokenCreateContract, tokenWithFees, [
        signers[1].address,
        signers[2].address,
      ]);
      const transferTx = await tokenTransferContract.transferTokensPublic(
        tokenWithFees,
        [signers[0].address, signers[1].address],
        [-500, 500]
      );
      await transferTx.wait();

      const updateFeeTx =
        await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
          tokenWithFees,
          [],
          updatedFractionalFee
        );
      const updateFeeResponseCode = (await updateFeeTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode;
      const tokenInfoTx =
        await tokenQueryContract.getTokenInfoPublic(tokenWithFees);
      const tokenInfoResponse = (await tokenInfoTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.TokenInfo
      )[0].args.tokenInfo;

      // fractional fee is at position 7 in the tokenInfo array
      expect(tokenInfoResponse[6].length).to.be.greaterThan(0);
      expect(tokenInfoResponse[6][0][0]).to.equal(BigInt(35));
      expect(tokenInfoResponse[6][0][2]).to.equal(BigInt(100));
      expect(updateFeeResponseCode).to.equal(TX_SUCCESS_CODE);

      const feeCollectorBalanceBeforeTransfer = await utils.getTokenBalance(
        signers[0].address,
        tokenWithFees
      );
      const senderBalanceBeforeTransfer = await utils.getTokenBalance(
        signers[1].address,
        tokenWithFees
      );
      const feeToBeCharged = Math.floor(
        (400 * updatedFractionalFeeNumerator) / fractionalFeeDenominator
      );
      const transferTx1 = await tokenTransferContract.transferTokensPublic(
        tokenWithFees,
        [signers[1].address, signers[2].address],
        [-400, 400],
        Constants.GAS_LIMIT_1_000_000
      );
      await transferTx1.wait();

      //ensure the fee has been updated and collected
      expect(
        await utils.getTokenBalance(signers[0].address, tokenWithFees)
      ).to.be.equal(feeCollectorBalanceBeforeTransfer + feeToBeCharged);
      expect(
        await utils.getTokenBalance(signers[1].address, tokenWithFees)
      ).to.be.equal(senderBalanceBeforeTransfer - 400);
      expect(
        await utils.getTokenBalance(signers[2].address, tokenWithFees)
      ).to.be.equal(400 - feeToBeCharged);
    });

    it('should be able to update fractional fee with net of transfer true in HTS token', async function () {
      const fractionalFeeNumerator = 30;
      const fractionalFeeDenominator = 100;
      const feeToken2 = await utils.createFungibleTokenWithPresetKeysPublic(
        tokenCreateCustomContract,
        'FeeToken2',
        'FT2',
        'FeeToken2',
        initialSupply,
        maxSupply,
        decimals,
        false,
        signers[3].address
      );
      await utils.associateToken(
        tokenCreateCustomContract,
        feeToken2,
        Constants.Contract.TokenCreateContract
      );

      const fractionalFee = {
        numerator: fractionalFeeNumerator,
        denominator: fractionalFeeDenominator,
        minimumAmount: 0,
        maximumAmount: 0,
        netOfTransfers: false,
        feeCollector: signers[0].address,
      };
      const fixedFee2 = {
        amount: tokenFeeAmount + 50,
        tokenId: feeToken2,
        useHbarsForPayment: false,
        useCurrentTokenForPayment: false,
        feeCollector: signers[0].address,
      };
      const tokenWithFees =
        await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [fixedFee2],
          [fractionalFee],
          keys
        );

      await utils.updateTokenKeysViaHapi(tokenWithFees, [
        tokenManagementContractAddress,
        tokenTransferContractAddress,
        tokenCreateContractAddress,
        tokenCreateCustomContractAddress,
      ]);

      const updatedFractionalFeeNumerator = fractionalFeeNumerator + 5;
      const updatedFractionalFee = [
        {
          numerator: updatedFractionalFeeNumerator,
          denominator: fractionalFeeDenominator,
          minimumAmount: 100,
          maximumAmount: 1000,
          netOfTransfers: true,
          feeCollector: signers[0].address,
        },
      ];

      // make a transfer and ensure that the fee is collected
      //apparently first you need to associate and then gran token kyc

      await utils.associateAndGrantKyc(tokenCreateContract, tokenWithFees, [
        signers[1].address,
        signers[2].address,
      ]);

      const transferTx = await tokenTransferContract.transferTokensPublic(
        tokenWithFees,
        [signers[0].address, signers[1].address],
        [-1000, 1000]
      );
      await transferTx.wait();

      const updateFeeTx =
        await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
          tokenWithFees,
          [],
          updatedFractionalFee
        );
      const updateFeeResponseCode = (await updateFeeTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode;
      const tokenInfoTx =
        await tokenQueryContract.getTokenInfoPublic(tokenWithFees);
      const tokenInfoResponse = (await tokenInfoTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.TokenInfo
      )[0].args.tokenInfo;

      // fractional fee is at position 7 in the tokenInfo array
      expect(tokenInfoResponse[6].length).to.be.greaterThan(0);
      expect(tokenInfoResponse[6][0][0]).to.equal(BigInt(35));
      expect(tokenInfoResponse[6][0][2]).to.equal(BigInt(100));
      expect(updateFeeResponseCode).to.equal(TX_SUCCESS_CODE);

      const feeCollectorBalanceBeforeTransfer = await utils.getTokenBalance(
        signers[0].address,
        tokenWithFees
      );
      const senderBalanceBeforeTransfer = await utils.getTokenBalance(
        signers[1].address,
        tokenWithFees
      );
      const feeToBeCharged = Math.floor(
        (400 * updatedFractionalFeeNumerator) / fractionalFeeDenominator
      );
      const transferTx1 = await tokenTransferContract.transferTokensPublic(
        tokenWithFees,
        [signers[1].address, signers[2].address],
        [-400, 400],
        Constants.GAS_LIMIT_1_000_000
      );
      await transferTx1.wait();

      //ensure the fee has been updated and collected
      expect(
        await utils.getTokenBalance(signers[0].address, tokenWithFees)
      ).to.be.equal(feeCollectorBalanceBeforeTransfer + feeToBeCharged);
      expect(
        await utils.getTokenBalance(signers[1].address, tokenWithFees)
      ).to.be.equal(senderBalanceBeforeTransfer - 400 - feeToBeCharged);
      expect(
        await utils.getTokenBalance(signers[2].address, tokenWithFees)
      ).to.be.equal(400);
    });

    it('should be able to update multiple fractional fees in HTS token', async function () {
      const fractionalFeeNumerator = 30;
      const fractionalFeeDenominator = 100;
      const fractionalFeeNumerator2 = 10;
      console.log('Creating token');
      const feeToken2 = await utils.createFungibleTokenWithPresetKeysPublic(
        tokenCreateCustomContract,
        'FeeToken2',
        'FT2',
        'FeeToken2',
        initialSupply,
        maxSupply,
        decimals,
        false,
        signers[3].address
      );
      await utils.associateToken(
        tokenCreateCustomContract,
        feeToken2,
        Constants.Contract.TokenCreateCustomContract
      );

      const fixedFeeAmount = tokenFeeAmount + 50;
      const fractionalFee = {
        numerator: fractionalFeeNumerator,
        denominator: fractionalFeeDenominator,
        minimumAmount: 0,
        maximumAmount: 0,
        netOfTransfers: false,
        feeCollector: signers[0].address,
      };
      const fractionalFee2 = {
        numerator: fractionalFeeNumerator2,
        denominator: fractionalFeeDenominator,
        minimumAmount: 0,
        maximumAmount: 0,
        netOfTransfers: false,
        feeCollector: signers[0].address,
      };
      const fixedFee2 = {
        amount: fixedFeeAmount,
        tokenId: feeToken2,
        useHbarsForPayment: false,
        useCurrentTokenForPayment: false,
        feeCollector: signers[0].address,
      };
      const tokenWithFees =
        await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [fixedFee2],
          [fractionalFee, fractionalFee2],
          keys
        );

      await utils.updateTokenKeysViaHapi(tokenWithFees, [
        tokenManagementContractAddress,
        tokenTransferContractAddress,
        tokenCreateContractAddress,
        tokenCreateCustomContractAddress,
      ]);

      const updatedFractionalFeeNumerator = fractionalFeeNumerator + 5;
      const updatedFractionalFeeNumerator2 = fractionalFeeNumerator2 - 5;
      const updatedFractionalFee = [
        {
          numerator: updatedFractionalFeeNumerator,
          denominator: fractionalFeeDenominator,
          minimumAmount: 100,
          maximumAmount: 1000,
          netOfTransfers: false,
          feeCollector: signers[0].address,
        },
        {
          numerator: updatedFractionalFeeNumerator2,
          denominator: fractionalFeeDenominator,
          minimumAmount: 1,
          maximumAmount: 1000,
          netOfTransfers: false,
          feeCollector: signers[0].address,
        },
      ];

      // make a transfer and ensure that the fee is collected
      //apparently first you need to associate and then gran token kyc
      await utils.associateAndGrantKyc(
        tokenCreateCustomContract,
        tokenWithFees,
        [signers[1].address, signers[2].address]
      );
      const transferTx = await tokenTransferContract.transferTokensPublic(
        tokenWithFees,
        [signers[0].address, signers[1].address],
        [-500, 500]
      );
      await transferTx.wait();

      const updateFeeTx =
        await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
          tokenWithFees,
          [],
          updatedFractionalFee
        );
      const updateFeeResponseCode = (await updateFeeTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.ResponseCode
      )[0].args.responseCode;
      const tokenInfoTx =
        await tokenQueryContract.getTokenInfoPublic(tokenWithFees);
      const tokenInfoResponse = (await tokenInfoTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.TokenInfo
      )[0].args.tokenInfo;

      // fractional fee is at position 7 in the tokenInfo array
      expect(tokenInfoResponse[6].length).to.be.greaterThan(0);
      expect(tokenInfoResponse[6][0][0]).to.equal(BigInt(35));
      expect(tokenInfoResponse[6][0][2]).to.equal(BigInt(100));
      expect(tokenInfoResponse[6][1][0]).to.equal(BigInt(5));
      expect(updateFeeResponseCode).to.equal(TX_SUCCESS_CODE);

      const feeCollectorBalanceBeforeTransfer = await utils.getTokenBalance(
        signers[0].address,
        tokenWithFees
      );
      const senderBalanceBeforeTransfer = await utils.getTokenBalance(
        signers[1].address,
        tokenWithFees
      );
      const feeToBeCharged = Math.floor(
        400 *
          ((updatedFractionalFeeNumerator + updatedFractionalFeeNumerator2) /
            fractionalFeeDenominator)
      );

      const transferTx1 = await tokenTransferContract.transferTokensPublic(
        tokenWithFees,
        [signers[1].address, signers[2].address],
        [-400, 400],
        Constants.GAS_LIMIT_1_000_000
      );
      await transferTx1.wait();

      const signer2BalanceAfterTransfer = await utils.getTokenBalance(
        signers[2].address,
        tokenWithFees
      );

      //ensure the fee has been updated and collected
      expect(
        await utils.getTokenBalance(signers[0].address, tokenWithFees)
      ).to.be.equal(feeCollectorBalanceBeforeTransfer + feeToBeCharged);
      expect(
        await utils.getTokenBalance(signers[1].address, tokenWithFees)
      ).to.be.equal(senderBalanceBeforeTransfer - 400);
      expect(signer2BalanceAfterTransfer).to.be.equal(400 - feeToBeCharged);
    });

    it('should be able to update royalty fee in HBARs for NFT', async function () {
      const fixedFees = [];
      const royaltyFees = [
        {
          numerator: 10,
          denominator: 100,
          amount: tenHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          feeCollector: signers[2].address,
        },
      ];
      const nft = await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
        tokenCreateCustomContract,
        signers[0].address,
        fixedFees,
        royaltyFees,
        keys
      );
      const nftTx = await utils.mintNFT(tokenCreateCustomContract, nft);

      await utils.associateAndGrantKyc(tokenCreateCustomContract, nft, [
        signers[1].address,
        signers[3].address,
      ]);

      const transferNft = await tokenTransferContract.transferNFTPublic(
        nft,
        signers[0].address,
        signers[1].address,
        nftTx
      );
      await transferNft.wait();

      await utils.updateTokenKeysViaHapi(nft, [
        tokenManagementContractAddress,
        tokenCreateCustomContractAddress,
      ]);
      const updatedRoyaltyFee = [
        {
          numerator: 10,
          denominator: 100,
          amount: twentyHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          feeCollector: signers[2].address,
        },
      ];
      const updateRoyaltyFeeTx =
        await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
          nft,
          [],
          updatedRoyaltyFee
        );
      await updateRoyaltyFeeTx.wait();

      const beforeNftTransferHbars2 = await utils.getHbarBalance(
        signers[2].address
      );
      const beforeNftTransferHbars3 = await utils.getHbarBalance(
        signers[3].address
      );

      const transferNftToSigner3 =
        await tokenTransferContract.transferNFTPublic(
          nft,
          signers[1].address,
          signers[3].address,
          nftTx
        );
      await transferNftToSigner3.wait();

      expect(await utils.getTokenBalance(signers[3].address, nft)).to.equal(1);
      expect(
        parseFloat(await utils.getHbarBalance(signers[2].address))
      ).to.equal(
        beforeNftTransferHbars2 +
          parseFloat(twentyHbars / utils.tinybarToHbarCoef)
      );
      expect(
        parseFloat(await utils.getHbarBalance(signers[3].address))
      ).to.equal(
        beforeNftTransferHbars3 -
          parseFloat(twentyHbars / utils.tinybarToHbarCoef)
      );
    });

    it('should be able to update multiple royalty fees in HBARs for NFT', async function () {
      const fixedFees = [];
      const royaltyFees = [
        {
          numerator: 10,
          denominator: 100,
          amount: tenHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          feeCollector: signers[2].address,
        },
      ];
      const nft = await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
        tokenCreateCustomContract,
        signers[0].address,
        fixedFees,
        royaltyFees,
        keys
      );
      const nftTx = await utils.mintNFT(tokenCreateCustomContract, nft);

      await utils.associateAndGrantKyc(tokenCreateCustomContract, nft, [
        signers[1].address,
        signers[3].address,
      ]);

      const transferNft = await tokenTransferContract.transferNFTPublic(
        nft,
        signers[0].address,
        signers[1].address,
        nftTx
      );
      await transferNft.wait();

      await utils.updateTokenKeysViaHapi(nft, [
        tokenManagementContractAddress,
        tokenCreateCustomContractAddress,
      ]);
      const updatedRoyaltyFee = [
        {
          numerator: 10,
          denominator: 100,
          amount: twentyHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          feeCollector: signers[2].address,
        },
        {
          numerator: 10,
          denominator: 100,
          amount: tenHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          feeCollector: signers[2].address,
        },
      ];
      const updateRoyaltyFeeTx =
        await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
          nft,
          [],
          updatedRoyaltyFee
        );
      await updateRoyaltyFeeTx.wait();

      const beforeNftTransferHbars2 = await utils.getHbarBalance(
        signers[2].address
      );
      const beforeNftTransferHbars3 = await utils.getHbarBalance(
        signers[3].address
      );

      const transferNftToSigner3 =
        await tokenTransferContract.transferNFTPublic(
          nft,
          signers[1].address,
          signers[3].address,
          nftTx
        );
      await transferNftToSigner3.wait();

      expect(await utils.getTokenBalance(signers[3].address, nft)).to.equal(1);
      expect(
        parseFloat(await utils.getHbarBalance(signers[2].address))
      ).to.equal(
        beforeNftTransferHbars2 +
          parseFloat((twentyHbars + tenHbars) / utils.tinybarToHbarCoef)
      );
      expect(
        parseFloat(await utils.getHbarBalance(signers[3].address))
      ).to.equal(
        beforeNftTransferHbars3 -
          parseFloat((twentyHbars + tenHbars) / utils.tinybarToHbarCoef)
      );
    });

    it('should be able to update fixed fee in HBARs for NFT', async function () {
      const fixedFees = [
        {
          amount: tenHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          useCurrentTokenForPayment: false,
          feeCollector: signers[2].address,
        },
      ];
      const royaltyFees = [];
      const nft = await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
        tokenCreateCustomContract,
        signers[0].address,
        fixedFees,
        royaltyFees,
        keys
      );
      const nftTx = await utils.mintNFT(tokenCreateCustomContract, nft);

      await utils.associateAndGrantKyc(tokenCreateCustomContract, nft, [
        signers[1].address,
        signers[3].address,
      ]);

      const transferNft = await tokenTransferContract.transferNFTPublic(
        nft,
        signers[0].address,
        signers[1].address,
        nftTx
      );
      await transferNft.wait();

      await utils.updateTokenKeysViaHapi(nft, [
        tokenManagementContractAddress,
        tokenCreateCustomContractAddress,
      ]);
      const updatedfixedFees = [
        {
          amount: twentyHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          useCurrentTokenForPayment: false,
          feeCollector: signers[2].address,
        },
      ];
      const updateRoyaltyFeeTx =
        await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
          nft,
          updatedfixedFees,
          []
        );
      await updateRoyaltyFeeTx.wait();

      const beforeNftTransferHbars2 = await utils.getHbarBalance(
        signers[2].address
      );
      const beforeNftTransferHbars1 = await utils.getHbarBalance(
        signers[1].address
      );

      const transferNftToSigner3 =
        await tokenTransferContract.transferNFTPublic(
          nft,
          signers[1].address,
          signers[3].address,
          nftTx
        );
      await transferNftToSigner3.wait();

      expect(await utils.getTokenBalance(signers[3].address, nft)).to.equal(1);
      expect(
        parseFloat(await utils.getHbarBalance(signers[2].address))
      ).to.equal(
        beforeNftTransferHbars2 +
          parseFloat(twentyHbars / utils.tinybarToHbarCoef)
      );
      expect(
        parseFloat(await utils.getHbarBalance(signers[1].address))
      ).to.equal(
        beforeNftTransferHbars1 -
          parseFloat(twentyHbars / utils.tinybarToHbarCoef)
      );
    });

    it('should be able to update fixed HTS fee for NFT', async function () {
      await utils.associateToken(
        tokenCreateCustomContract,
        feeToken,
        Constants.Contract.TokenCreateCustomContract
      );
      //we need to grant kyc and associate token with the fee collector, which is signer[0]
      const grantKycFeeCollectorFeeToken =
        await tokenCreateCustomContract.grantTokenKycPublic(
          feeToken,
          signers[0].address
        );
      await grantKycFeeCollectorFeeToken.wait();

      const fixedFees = [
        {
          amount: tokenFeeAmount,
          tokenId: feeToken,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        },
      ];
      const royaltyFees = [];
      const nft = await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
        tokenCreateCustomContract,
        signers[0].address,
        fixedFees,
        royaltyFees,
        keys
      );
      const nftTx = await utils.mintNFT(tokenCreateCustomContract, nft);

      await utils.associateAndGrantKyc(tokenCreateCustomContract, nft, [
        signers[1].address,
        signers[3].address,
      ]);
      const transferNft = await tokenTransferContract.transferNFTPublic(
        nft,
        signers[0].address,
        signers[1].address,
        nftTx
      );
      await transferNft.wait();

      await utils.updateTokenKeysViaHapi(nft, [
        tokenManagementContractAddress,
        tokenCreateCustomContractAddress,
      ]);
      const updatedfixedFees = [
        {
          amount: tokenFeeAmount + 13,
          tokenId: feeToken,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        },
      ];

      const updateRoyaltyFeeTx =
        await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
          nft,
          updatedfixedFees,
          []
        );
      await updateRoyaltyFeeTx.wait();

      const beforeNftTransferHbars2 = await utils.getHbarBalance(
        signers[2].address
      );
      const beforeNftTransferHbars1 = await utils.getHbarBalance(
        signers[1].address
      );

      // need to grant kyc from the account which is the kyc key a.k.a tokenCreateCustomContract
      //should work witho another contract if token keys are updated
      const grantKycSigner1FeeToken =
        await tokenCreateCustomContract.grantTokenKycPublic(
          feeToken,
          signers[1].address
        );
      const grantKycSigner1FeeTokenReceipt =
        await grantKycSigner1FeeToken.wait();

      // ---------- send fee token to signer 1 ------------

      //prerequisite: signer 1 has to be associated
      // approve the tokenTransfer to spend feeTokens
      const approveTx = await tokenCreateCustomContract.approvePublic(
        feeToken,
        tokenTransferContract,
        1000,
        Constants.GAS_LIMIT_1_000_000
      );
      await approveTx.wait();
      const transferFeeToken = await tokenTransferContract.transferTokensPublic(
        feeToken,
        [tokenCreateCustomContractAddress, signers[1].address],
        [-500, 500]
      );
      await transferFeeToken.wait();

      const balanceBeforeFeeCollector = await utils.getTokenBalance(
        signers[0].address,
        feeToken
      );
      const balanceBeforeSigner1 = await utils.getTokenBalance(
        signers[1].address,
        feeToken
      );
      const transferNftToSigner3 =
        await tokenTransferContract.transferNFTPublic(
          nft,
          signers[1].address,
          signers[3].address,
          nftTx
        );
      await transferNftToSigner3.wait();

      expect(
        await utils.getTokenBalance(signers[1].address, feeToken)
      ).to.equal(balanceBeforeSigner1 - (tokenFeeAmount + 13));
      expect(
        await utils.getTokenBalance(signers[0].address, feeToken)
      ).to.equal(balanceBeforeFeeCollector + (tokenFeeAmount + 13));
      expect(await utils.getTokenBalance(signers[3].address, nft)).to.equal(1);
    });

    it('should be able to update fixed HTS fee and royalty fee in NFT', async function () {
      await utils.associateToken(
        tokenCreateCustomContract,
        feeToken,
        Constants.Contract.TokenCreateContract
      );
      //we need to grant kyc and associate token with the fee collector, which is signer[0]
      const grantKycFeeCollectorFeeToken =
        await tokenCreateCustomContract.grantTokenKycPublic(
          feeToken,
          signers[0].address
        );
      await grantKycFeeCollectorFeeToken.wait();

      const fixedFees = [
        {
          amount: tokenFeeAmount,
          tokenId: feeToken,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        },
      ];
      const royaltyFees = [
        {
          numerator: 10,
          denominator: 100,
          amount: tenHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          feeCollector: signers[2].address,
        },
      ];
      const nft = await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
        tokenCreateCustomContract,
        signers[0].address,
        fixedFees,
        royaltyFees,
        keys
      );
      const nftTx = await utils.mintNFT(tokenCreateCustomContract, nft);

      await utils.associateAndGrantKyc(tokenCreateCustomContract, nft, [
        signers[1].address,
        signers[3].address,
      ]);
      const transferNft = await tokenTransferContract.transferNFTPublic(
        nft,
        signers[0].address,
        signers[1].address,
        nftTx
      );
      await transferNft.wait();

      await utils.updateTokenKeysViaHapi(nft, [
        tokenManagementContractAddress,
        tokenCreateCustomContractAddress,
      ]);
      const updatedfixedFees = [
        {
          amount: tokenFeeAmount + 13,
          tokenId: feeToken,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        },
      ];
      const updatedRoyaltyFee = [
        {
          numerator: 10,
          denominator: 100,
          amount: twentyHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          feeCollector: signers[2].address,
        },
      ];

      const updateRoyaltyFeeTx =
        await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
          nft,
          updatedfixedFees,
          updatedRoyaltyFee
        );
      await updateRoyaltyFeeTx.wait();

      const updateFeeResponseCode = (
        await updateRoyaltyFeeTx.wait()
      ).logs.filter((e) => e.fragment.name === Constants.Events.ResponseCode)[0]
        .args.responseCode;
      const tokenInfoTx =
        await tokenQueryContract.getNonFungibleTokenInfoPublic(nft, nftTx);
      const tokenInfoResponse = (await tokenInfoTx.wait()).logs.filter(
        (e) => e.fragment.name === Constants.Events.NonFungibleTokenInfo
      )[0].args.tokenInfo;

      // fractional fee is at position 7 in the tokenInfo array
      expect(tokenInfoResponse[0][5].length).to.be.greaterThan(0);
      expect(tokenInfoResponse[0][7].length).to.be.greaterThan(0);
      expect(tokenInfoResponse[0][5][0][0]).to.equal(63);
      expect(tokenInfoResponse[0][5][0][1]).to.equal(feeToken);
      expect(tokenInfoResponse[0][7][0][2]).to.equal(twentyHbars);
      expect(tokenInfoResponse[0][7][0][4]).to.equal(true);
      expect(updateFeeResponseCode).to.equal(TX_SUCCESS_CODE);

      // need to grant kyc from the account which is the kyc key a.k.a tokenCreateCustomContract
      //should work witho another contract if token keys are updated
      const grantKycSigner1FeeToken =
        await tokenCreateCustomContract.grantTokenKycPublic(
          feeToken,
          signers[1].address
        );
      const grantKycSigner1FeeTokenReceipt =
        await grantKycSigner1FeeToken.wait();

      // ---------- send fee token to signer 1 ------------

      //prerequisite: signer 1 has to be associated
      // approve the tokenTransfer to spend feeTokens
      const approveTx = await tokenCreateCustomContract.approvePublic(
        feeToken,
        tokenTransferContract,
        1000,
        Constants.GAS_LIMIT_1_000_000
      );
      await approveTx.wait();

      const transferFeeToken = await tokenTransferContract.transferTokensPublic(
        feeToken,
        [tokenCreateCustomContractAddress, signers[1].address],
        [-500, 500]
      );
      await transferFeeToken.wait();

      const balanceBeforeFeeCollector = await utils.getTokenBalance(
        signers[0].address,
        feeToken
      );
      const balanceBeforeSigner1 = await utils.getTokenBalance(
        signers[1].address,
        feeToken
      );
      const beforeNftTransferHbars2 = await utils.getHbarBalance(
        signers[2].address
      );
      const beforeNftTransferHbars3 = await utils.getHbarBalance(
        signers[3].address
      );
      const transferNftToSigner3 =
        await tokenTransferContract.transferNFTPublic(
          nft,
          signers[1].address,
          signers[3].address,
          nftTx
        );
      await transferNftToSigner3.wait();

      expect(
        await utils.getTokenBalance(signers[1].address, feeToken)
      ).to.equal(balanceBeforeSigner1 - (tokenFeeAmount + 13));
      expect(
        await utils.getTokenBalance(signers[0].address, feeToken)
      ).to.equal(balanceBeforeFeeCollector + (tokenFeeAmount + 13));
      expect(await utils.getTokenBalance(signers[3].address, nft)).to.equal(1);
      expect(
        parseFloat(await utils.getHbarBalance(signers[2].address))
      ).to.equal(
        beforeNftTransferHbars2 +
          parseFloat(twentyHbars / utils.tinybarToHbarCoef)
      );
      expect(
        parseFloat(await utils.getHbarBalance(signers[3].address))
      ).to.equal(
        beforeNftTransferHbars3 -
          parseFloat(twentyHbars / utils.tinybarToHbarCoef)
      );
    });

    describe('Update fees negative cases', async function () {
      it('should fail when updating fungible token non-existing fixed fee', async function () {
        let transactionHash;
        tokenWithFees = await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [],
          [],
          keys
        );
        await utils.updateTokenKeysViaHapi(tokenWithFees, [
          tokenManagementContractAddress,
          tokenTransferContractAddress,
          tokenCreateContractAddress,
          tokenCreateCustomContractAddress,
        ]);

        const updateFeeTx =
          await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
            tokenWithFees,
            [],
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(
          CUSTOM_SCHEDULE_ALREADY_HAS_NO_FEES
        );
      });

      it('should fail when updating non fungible token non-existing fixed fee', async function () {
        let transactionHash;
        const nft =
          await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
            tokenCreateCustomContract,
            signers[0].address,
            [],
            [],
            keys
          );
        await utils.updateTokenKeysViaHapi(nft, [
          tokenManagementContractAddress,
          tokenTransferContractAddress,
          tokenCreateContractAddress,
          tokenCreateCustomContractAddress,
        ]);

        const updateFeeTx =
          await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
            nft,
            [],
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(
          CUSTOM_SCHEDULE_ALREADY_HAS_NO_FEES
        );
      });

      it('should fail when trying to update fees of fungible token with no fee schedule key', async function () {
        let transactionHash;
        const keysWithoutFeeSchedule = keys.slice();
        keysWithoutFeeSchedule.splice(5, 1);
        tokenWithFees = await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [],
          [],
          keysWithoutFeeSchedule
        );

        await utils.updateTokenKeysViaHapi(
          tokenWithFees,
          [
            tokenManagementContractAddress,
            tokenTransferContractAddress,
            tokenCreateContractAddress,
            tokenCreateCustomContractAddress,
          ],
          (setFeeScheduleKey = false)
        );

        const updateFeeTx =
          await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
            tokenWithFees,
            [],
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(TOKEN_HAS_NO_FEE_SCHEDULE_KEY);
      });

      it('should fail when trying to update fees of non fungible token with no fee schedule key', async function () {
        let transactionHash;
        const keysWithoutFeeSchedule = keys.slice();
        keysWithoutFeeSchedule.splice(5, 1);
        const nft =
          await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
            tokenCreateCustomContract,
            signers[0].address,
            [],
            [],
            keysWithoutFeeSchedule
          );
        await utils.updateTokenKeysViaHapi(nft, [
          tokenManagementContractAddress,
          tokenTransferContractAddress,
          tokenCreateContractAddress,
          tokenCreateCustomContractAddress,
        ]);

        const updateFeeTx =
          await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
            nft,
            [],
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(TOKEN_HAS_NO_FEE_SCHEDULE_KEY);
      });

      it('should fail when fee has negative values', async function () {
        const negativeHbars = -10 * utils.tinybarToHbarCoef;
        const fixedFee = {
          amount: tenHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: true,
          feeCollector: signers[0].address,
        };
        tokenWithFees = await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [fixedFee],
          [],
          keys
        );
        await utils.updateTokenKeysViaHapi(tokenWithFees, [
          tokenManagementContractAddress,
        ]);
        let transactionHash;
        const updatedFixedFee = {
          amount: negativeHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        };
        const updateFeeTx =
          await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
            tokenWithFees,
            [updatedFixedFee],
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(CUSTOM_FEE_MUST_BE_POSITIVE);
      });

      it('should fail when fee has negative values for non fungible token', async function () {
        let transactionHash;
        const negativeHbars = -10 * utils.tinybarToHbarCoef;
        const fixedFee = {
          amount: tenHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        };
        const nft =
          await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
            tokenCreateCustomContract,
            signers[0].address,
            [fixedFee],
            [],
            keys
          );
        await utils.updateTokenKeysViaHapi(nft, [
          tokenManagementContractAddress,
        ]);

        const updatedFixedFee = {
          amount: negativeHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        };
        const updateFeeTx =
          await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
            nft,
            [updatedFixedFee],
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(CUSTOM_FEE_MUST_BE_POSITIVE);
      });

      it('should fail when fractional fee has denominator zero', async function () {
        let transactionHash;
        const fractionalFee = {
          numerator: 10,
          denominator: 100,
          minimumAmount: 0,
          maximumAmount: 0,
          netOfTransfers: false,
          feeCollector: signers[0].address,
        };
        tokenWithFees = await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [],
          [fractionalFee],
          keys
        );
        await utils.updateTokenKeysViaHapi(tokenWithFees, [
          tokenManagementContractAddress,
        ]);
        const updatedFractionalFee = {
          numerator: 10,
          denominator: 0,
          minimumAmount: 0,
          maximumAmount: 0,
          netOfTransfers: false,
          feeCollector: signers[0].address,
        };

        const updateFeeTx =
          await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
            tokenWithFees,
            [],
            [updatedFractionalFee]
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }
        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(FRACTION_DIVIDES_BY_ZERO);
      });

      // Note: Tests below are skipped due to CUSTOM_FEES_LIST_TOO_LONG error introduced in network node v0.56.0
      // which enforces a maximum of 10 custom fees per token. This validation was previously done at the SDK level.
      // TODO: Re-enable tests once validation is properly handled - see https://github.com/hashgraph/hedera-services/issues/17533
      // and https://github.com/hashgraph/hedera-smart-contracts/issues/1207
      it.skip('should fail when updating fungible token fees to more than 10', async function () {
        let transactionHash;
        tokenWithFees = await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [],
          [],
          keys
        );
        await utils.updateTokenKeysViaHapi(tokenWithFees, [
          tokenManagementContractAddress,
        ]);

        const fees = [];
        for (let i = 0; i < 11; i++) {
          fees.push({
            amount: tokenFeeAmount + i,
            tokenId: ethers.ZeroAddress,
            useHbarsForPayment: true,
            useCurrentTokenForPayment: false,
            feeCollector: signers[0].address,
          });
        }
        const updateFeeTx =
          await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
            tokenWithFees,
            fees,
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(CUSTOM_FEES_LIST_TOO_LONG);
      });

      // Note: Tests below are skipped due to CUSTOM_FEES_LIST_TOO_LONG error introduced in network node v0.56.0
      // which enforces a maximum of 10 custom fees per token. This validation was previously done at the SDK level.
      // TODO: Re-enable tests once validation is properly handled - see https://github.com/hashgraph/hedera-services/issues/17533
      // and https://github.com/hashgraph/hedera-smart-contracts/issues/1207
      it.skip('should fail when updating NFT token fees to more than 10', async function () {
        const nft =
          await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
            tokenCreateCustomContract,
            signers[0].address,
            [],
            [],
            keys
          );
        await utils.updateTokenKeysViaHapi(nft, [
          tokenManagementContractAddress,
        ]);

        let transactionHash;
        const fees = [];
        for (let i = 0; i < 11; i++) {
          fees.push({
            amount: tokenFeeAmount + i,
            tokenId: ethers.ZeroAddress,
            useHbarsForPayment: true,
            useCurrentTokenForPayment: false,
            feeCollector: signers[0].address,
          });
        }
        const updateFeeTx =
          await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
            nft,
            fees,
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(CUSTOM_FEES_LIST_TOO_LONG);
      });

      it('should fail when the provided fee collector is invalid', async function () {
        let transactionHash;
        tokenWithFees = await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [],
          [],
          keys
        );
        await utils.updateTokenKeysViaHapi(tokenWithFees, [
          tokenManagementContractAddress,
        ]);
        const fixedFee = {
          amount: tenHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          useCurrentTokenForPayment: false,
          feeCollector: feeToken,
        };
        const updateFeeTx =
          await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
            tokenWithFees,
            [fixedFee],
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(INVALID_CUSTOM_FEE_COLLECTOR);
      });

      it('should fail when the provided fee collector is invalid for NFT', async function () {
        let transactionHash;
        const nft =
          await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
            tokenCreateCustomContract,
            signers[0].address,
            [],
            [],
            keys
          );
        await utils.updateTokenKeysViaHapi(nft, [
          tokenManagementContractAddress,
        ]);
        const fixedFee = {
          amount: tenHbars,
          tokenId: ethers.ZeroAddress,
          useHbarsForPayment: true,
          useCurrentTokenForPayment: false,
          feeCollector: feeToken,
        };
        const updateFeeTx =
          await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
            nft,
            [fixedFee],
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(INVALID_CUSTOM_FEE_COLLECTOR);
      });

      it('should fail when the provided token id is invalid', async function () {
        tokenWithFees = await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [],
          [],
          keys
        );
        await utils.updateTokenKeysViaHapi(tokenWithFees, [
          tokenManagementContractAddress,
        ]);

        const fixedFee = {
          amount: 10,
          tokenId: signers[1].address,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        };
        const updateFeeTx =
          await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
            tokenWithFees,
            [fixedFee],
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(INVALID_TOKEN_ID_IN_CUSTOM_FEES);
      });

      it('should fail when the provided token id is invalid for NFT', async function () {
        const nft =
          await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
            tokenCreateCustomContract,
            signers[0].address,
            [],
            [],
            keys
          );
        await utils.updateTokenKeysViaHapi(nft, [
          tokenManagementContractAddress,
        ]);
        const fixedFee = {
          amount: 10,
          tokenId: signers[1].address,
          useHbarsForPayment: false,
          useCurrentTokenForPayment: false,
          feeCollector: signers[0].address,
        };
        let transactionHash;
        const updateFeeTx =
          await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
            nft,
            [fixedFee],
            []
          );
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(INVALID_TOKEN_ID_IN_CUSTOM_FEES);
      });

      it('should fail for updateFungibleTokenCustomFees when token is not associated to fee collector', async function () {
        //need to associate the fee collector account of the token that will have fees
        tokenWithFees = await utils.createFungibleTokenWithCustomFeesAndKeys(
          tokenCreateCustomContract,
          signers[0].address,
          [],
          [],
          keys
        );
        await utils.updateTokenKeysViaHapi(tokenWithFees, [
          tokenManagementContractAddress,
          tokenTransferContractAddress,
          tokenCreateContractAddress,
          tokenCreateCustomContractAddress,
        ]);

        // ------------------ Associate and grantKyc to accounts tranfering tokenWithFees ------------------
        //TODO: error handling
        await utils.associateAndGrantKyc(tokenCreateContract, tokenWithFees, [
          signers[1].address,
          signers[2].address,
        ]);
        await utils.associateAndGrantKyc(tokenCreateCustomContract, feeToken, [
          signers[1].address,
        ]);

        const grantKycTx = await tokenCreateCustomContract.grantTokenKycPublic(
          feeToken,
          tokenCreateCustomContractAddress
        );
        await grantKycTx.wait();

        const transferTx = await tokenTransferContract.transferTokensPublic(
          tokenWithFees,
          [signers[0].address, signers[1].address],
          [-500, 500]
        );
        await transferTx.wait();

        const approveTx = await tokenCreateCustomContract.approvePublic(
          feeToken,
          tokenTransferContract,
          1000,
          Constants.GAS_LIMIT_1_000_000
        );
        await approveTx.wait();

        const transferFeeTokenToSigner1 =
          await tokenTransferContract.transferTokensPublic(
            feeToken,
            [tokenCreateCustomContractAddress, signers[1].address],
            [-150, 150],
            Constants.GAS_LIMIT_1_000_000
          );
        await transferFeeTokenToSigner1.wait();

        const updatedTokenFeeAmount = tokenFeeAmount + 15;
        const updatedFixedFee = [
          {
            amount: updatedTokenFeeAmount,
            tokenId: feeToken,
            useHbarsForPayment: false,
            useCurrentTokenForPayment: false,
            feeCollector: signers[0].address,
          },
        ];

        const updateFeeTx =
          await tokenManagmentContract.updateFungibleTokenCustomFeesPublic(
            tokenWithFees,
            updatedFixedFee,
            []
          );
        let transactionHash;
        try {
          await updateFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }
        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(
          TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR
        );
      });

      it('should fail for updateNonFungibleTokenCustomFees when token is not associated to fee collector', async function () {
        //we need to grant kyc and associate token with the fee collector, which is signer[0]
        const nft =
          await utils.createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
            tokenCreateCustomContract,
            signers[0].address,
            [],
            [],
            keys
          );
        const nftTx = await utils.mintNFT(tokenCreateCustomContract, nft);

        await utils.associateAndGrantKyc(tokenCreateCustomContract, nft, [
          signers[1].address,
          signers[3].address,
        ]);
        const transferNft = await tokenTransferContract.transferNFTPublic(
          nft,
          signers[0].address,
          signers[1].address,
          nftTx
        );
        await transferNft.wait();

        await utils.updateTokenKeysViaHapi(nft, [
          tokenManagementContractAddress,
          tokenCreateCustomContractAddress,
        ]);
        const updatedfixedFees = [
          {
            amount: tokenFeeAmount + 13,
            tokenId: feeToken,
            useHbarsForPayment: false,
            useCurrentTokenForPayment: false,
            feeCollector: signers[0].address,
          },
        ];

        let transactionHash;
        const updateRoyaltyFeeTx =
          await tokenManagmentContract.updateNonFungibleTokenCustomFeesPublic(
            nft,
            updatedfixedFees,
            []
          );
        try {
          await updateRoyaltyFeeTx.wait();
        } catch (error) {
          transactionHash = error.receipt.hash;
        }

        const revertReason =
          await utils.getRevertReasonFromReceipt(transactionHash);
        const decodeRevertReason = utils.decodeErrorMessage(revertReason);
        expect(decodeRevertReason).to.equal(
          TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR
        );
      });
    });
  });
});
// Filename: test/system-contracts/hedera-token-service/token-query/tokenQueryContract.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants.js');

describe('TokenQueryContract Test Suite', function () {
  const TX_SUCCESS_CODE = 22;

  let tokenCreateContract;
  let tokenQueryContract;
  let tokenAddress;
  let tokenWithCustomFeesAddress;
  let nftTokenAddress;
  let mintedTokenSerialNumber;
  let signers;

  before(async function () {
    signers = await ethers.getSigners();
    tokenCreateContract = await utils.deployTokenCreateContract();
    tokenQueryContract = await utils.deployTokenQueryContract();
    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
      await tokenQueryContract.getAddress(),
    ]);

    tokenAddress = await utils.createFungibleToken(
      tokenCreateContract,
      await tokenCreateContract.getAddress()
    );
    await utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenQueryContract.getAddress(),
    ]);
    tokenWithCustomFeesAddress = await utils.createFungibleTokenWithCustomFees(
      tokenCreateContract,
      tokenAddress
    );
    nftTokenAddress = await utils.createNonFungibleToken(
      tokenCreateContract,
      await tokenCreateContract.getAddress()
    );
    mintedTokenSerialNumber = await utils.mintNFTToAddress(
      tokenCreateContract,
      nftTokenAddress
    );

    await utils.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );

    await utils.grantTokenKyc(tokenCreateContract, tokenAddress);

    await utils.associateToken(
      tokenCreateContract,
      nftTokenAddress,
      Constants.Contract.TokenCreateContract
    );

    await utils.grantTokenKyc(tokenCreateContract, nftTokenAddress);
  });

  it('should query allowance', async function () {
    const tx = await tokenQueryContract.allowancePublic(
      tokenAddress,
      await tokenCreateContract.getAddress(),
      signers[1].address,
      Constants.GAS_LIMIT_1_000_000
    );
    const amount = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.AllowanceValue
    )[0].args.amount;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(amount).to.equal(0);
  });

  it('should query getApproved', async function () {
    const tx = await tokenQueryContract.getApprovedPublic(
      nftTokenAddress,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000
    );
    const { approved } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ApprovedAddress
    )[0].args;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(approved).to.equal('0x0000000000000000000000000000000000000000');
  });

  it('should query isApprovedForAll', async function () {
    const tx = await tokenQueryContract.isApprovedForAllPublic(
      nftTokenAddress,
      await tokenCreateContract.getAddress(),
      signers[1].address,
      Constants.GAS_LIMIT_1_000_000
    );
    const approved = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.Approved
    )[0].args.approved;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(approved).to.equal(false);
  });

  it('should query isFrozen', async function () {
    const tx = await tokenQueryContract.isFrozenPublic(
      tokenAddress,
      await tokenCreateContract.getAddress(),
      Constants.GAS_LIMIT_1_000_000
    );
    const isFrozen = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.Frozen
    )[0].args.frozen;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(isFrozen).to.equal(false);
  });

  it('should query isKyc', async function () {
    const tx = await tokenQueryContract.isKycPublic(
      tokenAddress,
      await tokenCreateContract.getAddress(),
      Constants.GAS_LIMIT_1_000_000
    );
    const isFrozen = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.KycGranted
    )[0].args.kycGranted;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(isFrozen).to.equal(true);
  });

  it('should query getTokenCustomFees', async function () {
    //All values for fixedFees and fractionalFees are hardcoded and pulled from the Token Create Contract
    const tx = await tokenQueryContract.getTokenCustomFeesPublic(
      tokenWithCustomFeesAddress,
      Constants.GAS_LIMIT_1_000_000
    );
    const { fixedFees, fractionalFees } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenCustomFees
    )[0].args;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);

    expect(fixedFees[0].amount).to.equal(1);
    expect(fixedFees[0].tokenId).to.equal(tokenAddress);
    expect(fixedFees[0].useHbarsForPayment).to.equal(false);
    expect(fixedFees[0].useCurrentTokenForPayment).to.equal(false);

    expect(fractionalFees[0].numerator).to.equal(4);
    expect(fractionalFees[0].denominator).to.equal(5);
    expect(fractionalFees[0].minimumAmount).to.equal(10);
    expect(fractionalFees[0].maximumAmount).to.equal(30);
    expect(fractionalFees[0].netOfTransfers).to.equal(false);
  });

  it('should query getTokenDefaultFreezeStatus', async function () {
    const tx =
      await tokenQueryContract.getTokenDefaultFreezeStatusPublic(tokenAddress,Constants.GAS_LIMIT_1_000_000);
    const defaultFreezeStatus = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenDefaultFreezeStatus
    )[0].args.defaultFreezeStatus;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(defaultFreezeStatus).to.equal(false);
  });

  it('should query getTokenDefaultKycStatus', async function () {
    const tx =
      await tokenQueryContract.getTokenDefaultKycStatusPublic(tokenAddress,Constants.GAS_LIMIT_1_000_000);
    const defaultKycStatus = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenDefaultKycStatus
    )[0].args.defaultKycStatus;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(defaultKycStatus).to.equal(false);
  });

  it('should query getTokenExpiryInfo', async function () {
    const tx = await tokenQueryContract.getTokenExpiryInfoPublic(tokenAddress,Constants.GAS_LIMIT_1_000_000);
    const expiryInfo = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenExpiryInfo
    )[0].args.expiryInfo;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(expiryInfo).not.null;
  });

  it('should query getFungibleTokenInfo', async function () {
    const tx =
      await tokenQueryContract.getFungibleTokenInfoPublic(tokenAddress);
    const tokenInfo = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.FungibleTokenInfo
    )[0].args.tokenInfo;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(tokenInfo).not.null;
  });

  it('should query getTokenInfo', async function () {
    const tx = await tokenQueryContract.getTokenInfoPublic(tokenAddress);
    const tokenInfo = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenInfo
    )[0].args.tokenInfo;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(tokenInfo).not.null;
  });

  it('should query getTokenKey', async function () {
    const tx = await tokenQueryContract.getTokenKeyPublic(tokenAddress, 2,Constants.GAS_LIMIT_1_000_000);
    const key = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenKey
    )[0].args.key;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(key).to.exist;
  });

  it('should query getNonFungibleTokenInfo', async function () {
    const tx = await tokenQueryContract.getNonFungibleTokenInfoPublic(
      nftTokenAddress,
      mintedTokenSerialNumber
    );
    const tokenInfo = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.NonFungibleTokenInfo
    )[0].args.tokenInfo;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(tokenInfo).not.null;
  });

  it('should query isToken', async function () {
    const tx = await tokenQueryContract.isTokenPublic(tokenAddress,Constants.GAS_LIMIT_1_000_000);
    const isToken = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.IsToken
    )[0].args.isToken;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(isToken).to.equal(true);
  });

  it('should query getTokenType', async function () {
    const tx = await tokenQueryContract.getTokenTypePublic(tokenAddress,Constants.GAS_LIMIT_1_000_000);
    const tokenType = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.TokenType
    )[0].args.tokenType;
    const { responseCode } = (await tx.wait()).logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args;

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(tokenType).to.equal(0);
  });
});
// Filename: test/system-contracts/hedera-token-service/token-transfer/tokenTransferContract.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const utils = require('../utils');
const Constants = require('../../../constants');
const {
  pollForNewERC20Balance,
  pollForNewSignerBalanceUsingProvider,
} = require('../../../../utils/helpers');

describe('TokenTransferContract Test Suite', function () {
  const TX_SUCCESS_CODE = 22;

  let tokenCreateContract;
  let tokenTransferContract;
  let tokenQueryContract;
  let erc20Contract;
  let erc721Contract;
  let tokenAddress;
  let nftTokenAddress;
  let mintedTokenSerialNumber;
  let signers;

  before(async function () {
    signers = await ethers.getSigners();
    tokenCreateContract = await utils.deployTokenCreateContract();
    tokenQueryContract = await utils.deployTokenQueryContract();
    tokenTransferContract = await utils.deployTokenTransferContract();
    erc20Contract = await utils.deployERC20Contract();
    erc721Contract = await utils.deployERC721Contract();
    await utils.updateAccountKeysViaHapi([
      await tokenCreateContract.getAddress(),
      await tokenQueryContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    tokenAddress = await utils.createFungibleTokenWithSECP256K1AdminKey(
      tokenCreateContract,
      signers[0].address,
      utils.getSignerCompressedPublicKey()
    );
    await utils.updateTokenKeysViaHapi(tokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenQueryContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    nftTokenAddress = await utils.createNonFungibleTokenWithSECP256K1AdminKey(
      tokenCreateContract,
      signers[0].address,
      utils.getSignerCompressedPublicKey()
    );
    await utils.updateTokenKeysViaHapi(nftTokenAddress, [
      await tokenCreateContract.getAddress(),
      await tokenQueryContract.getAddress(),
      await tokenTransferContract.getAddress(),
    ]);
    mintedTokenSerialNumber = await utils.mintNFT(
      tokenCreateContract,
      nftTokenAddress
    );

    await utils.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.grantTokenKyc(tokenCreateContract, tokenAddress);
    await utils.associateToken(
      tokenCreateContract,
      nftTokenAddress,
      Constants.Contract.TokenCreateContract
    );
    await utils.grantTokenKyc(tokenCreateContract, nftTokenAddress);
  });

  it('should NOT be able to use transferFrom on fungible tokens without approval', async function () {
    const amount = 1;
    try {
      const txTransfer = await tokenTransferContract.transferFromPublic(
        tokenAddress,
        signers[0].address,
        signers[1].address,
        amount,
        Constants.GAS_LIMIT_1_000_000
      );
      await txTransfer.wait();
      expect.fail();
    } catch (e) {
      expect(e).to.exist;
      expect(e.code).to.eq(Constants.CALL_EXCEPTION);
    }
  });

  it('should NOT be able to use transferFrom on NFT tokens without approval', async function () {
    try {
      const txTransfer = await tokenTransferContract.transferFromNFTPublic(
        nftTokenAddress,
        signers[0].address,
        signers[1].address,
        mintedTokenSerialNumber,
        Constants.GAS_LIMIT_1_000_000
      );
      await txTransfer.wait();
      expect.fail();
    } catch (e) {
      expect(e).to.exist;
      expect(e.code).to.eq(Constants.CALL_EXCEPTION);
    }
  });

  it('should be able to execute transferTokens', async function () {
    const amount = BigInt(33);
    const signers = await ethers.getSigners();

    let wallet1BalanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    let wallet2BalanceBefore = await erc20Contract.balanceOf(
      tokenAddress,
      signers[1].address
    );
    const tx = await tokenTransferContract.transferTokensPublic(
      tokenAddress,
      [signers[0].address, signers[1].address],
      [-amount, amount],
      Constants.GAS_LIMIT_1_000_000
    );
    await tx.wait();

    let wallet1BalanceAfter = await pollForNewERC20Balance(
      erc20Contract,
      tokenAddress,
      signers[0].address,
      wallet1BalanceBefore
    );
    let wallet2BalanceAfter = await pollForNewERC20Balance(
      erc20Contract,
      tokenAddress,
      signers[1].address,
      wallet1BalanceBefore
    );

    expect(wallet1BalanceAfter).to.equal(wallet1BalanceBefore - amount);
    expect(wallet2BalanceAfter).to.equal(wallet2BalanceBefore + amount);
  });

  it('should be able to execute transferNFTs', async function () {
    const signers = await ethers.getSigners();
    const ownerBefore = await erc721Contract.ownerOf(
      nftTokenAddress,
      mintedTokenSerialNumber
    );
    const tx = await tokenTransferContract.transferNFTsPublic(
      nftTokenAddress,
      [signers[0].address],
      [signers[1].address],
      [mintedTokenSerialNumber],
      Constants.GAS_LIMIT_1_000_000
    );
    await tx.wait();

    const ownerAfter = await erc721Contract.ownerOf(
      nftTokenAddress,
      mintedTokenSerialNumber
    );

    expect(ownerBefore).to.equal(signers[0].address);
    expect(ownerAfter).to.equal(signers[1].address);
  });

  it('should be able to execute transferToken', async function () {
    const amount = 33;
    const signers = await ethers.getSigners();

    let wallet1BalanceBefore = parseInt(
      await erc20Contract.balanceOf(tokenAddress, signers[0].address)
    );
    let wallet2BalanceBefore = parseInt(
      await erc20Contract.balanceOf(tokenAddress, signers[1].address)
    );
    const tx = await tokenTransferContract.transferTokenPublic(
      tokenAddress,
      signers[0].address,
      signers[1].address,
      amount,
      Constants.GAS_LIMIT_10_000_000
    );

    await tx.wait();

    const wallet1BalanceAfter = await pollForNewERC20Balance(
      erc20Contract,
      tokenAddress,
      signers[0].address,
      wallet1BalanceBefore
    );
    const wallet2BalanceAfter = await pollForNewERC20Balance(
      erc20Contract,
      tokenAddress,
      signers[1].address,
      wallet1BalanceBefore
    );

    expect(wallet1BalanceAfter).to.equal(wallet1BalanceBefore - amount);
    expect(wallet2BalanceAfter).to.equal(wallet2BalanceBefore + amount);
  });

  it('should be able to execute transferNFT', async function () {
    const signers = await ethers.getSigners();
    const ownerBefore = await erc721Contract.ownerOf(
      nftTokenAddress,
      mintedTokenSerialNumber
    );
    const tokenTransferContractNewOwner = tokenTransferContract.connect(
      signers[1]
    );
    const tx = await tokenTransferContractNewOwner.transferNFTPublic(
      nftTokenAddress,
      signers[1].address,
      signers[0].address,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000
    );
    await tx.wait();

    const ownerAfter = await erc721Contract.ownerOf(
      nftTokenAddress,
      mintedTokenSerialNumber
    );

    expect(ownerBefore).to.equal(signers[1].address);
    expect(ownerAfter).to.equal(signers[0].address);
  });

  it('should be able to execute getApproved', async function () {
    const approvedTx = await tokenQueryContract.getApprovedPublic(
      nftTokenAddress,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000
    );
    const receipt = await approvedTx.wait();
    const responseCode = receipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args[0];
    const approved = receipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.ApprovedAddress
    )[0].args[0];

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(approved).to.equal('0x0000000000000000000000000000000000000000');
  });

  it('should be able to execute cryptoTransfer for hbar transfer only', async function () {
    const cryptoTransfers = {
      transfers: [
        {
          accountID: signers[0].address,
          amount: -10_000,
          isApproval: false,
        },
        {
          accountID: signers[1].address,
          amount: 10_000,
          isApproval: false,
        },
      ],
    };
    const tokenTransferList = [];

    const signers0Before = await signers[0].provider.getBalance(
      signers[0].address
    );
    const signers1Before = await signers[0].provider.getBalance(
      signers[1].address
    );
    const cryptoTransferTx = await tokenTransferContract.cryptoTransferPublic(
      cryptoTransfers,
      tokenTransferList,
      Constants.GAS_LIMIT_1_000_000
    );
    const cryptoTransferReceipt = await cryptoTransferTx.wait();
    const responseCode = cryptoTransferReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args[0];

    const signers0After = await pollForNewSignerBalanceUsingProvider(
      signers[0].provider,
      signers[0].address,
      signers0Before
    );

    const signers1After = await pollForNewSignerBalanceUsingProvider(
      signers[0].provider,
      signers[1].address,
      signers0Before
    );
    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(signers0Before > signers0After).to.equal(true);
    expect(signers1After > signers1Before).to.equal(true);
  });

  it('should be able to execute cryptoTransfer for nft only', async function () {
    const mintedTokenSerialNumber = await utils.mintNFT(
      tokenCreateContract,
      nftTokenAddress
    );
    await tokenTransferContract.transferNFTsPublic(
      nftTokenAddress,
      [await tokenCreateContract.getAddress()],
      [signers[0].address],
      [mintedTokenSerialNumber],
      Constants.GAS_LIMIT_1_000_000
    );

    const cryptoTransfers = {
      transfers: [],
    };

    let tokenTransferList = [
      {
        token: nftTokenAddress,
        transfers: [],
        nftTransfers: [
          {
            senderAccountID: signers[0].address,
            receiverAccountID: signers[1].address,
            serialNumber: mintedTokenSerialNumber,
            isApproval: false,
          },
        ],
      },
    ];

    const ownerBefore = await erc721Contract.ownerOf(
      nftTokenAddress,
      mintedTokenSerialNumber
    );
    const cryptoTransferTx = await tokenTransferContract.cryptoTransferPublic(
      cryptoTransfers,
      tokenTransferList,
      Constants.GAS_LIMIT_1_000_000
    );
    const cryptoTransferReceipt = await cryptoTransferTx.wait();
    const responseCode = cryptoTransferReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args[0];

    const ownerAfter = await erc721Contract.ownerOf(
      nftTokenAddress,
      mintedTokenSerialNumber
    );

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(ownerBefore).to.equal(signers[0].address);
    expect(ownerAfter).to.equal(signers[1].address);
  });

  it('should be able to execute cryptoTransfer with both 3 txs', async function () {
    const amount = 1;
    await tokenTransferContract.transferTokenPublic(
      tokenAddress,
      await tokenCreateContract.getAddress(),
      signers[0].address,
      amount,
      Constants.GAS_LIMIT_1_000_000
    );

    const mintedTokenSerialNumber = await utils.mintNFT(
      tokenCreateContract,
      nftTokenAddress
    );
    await tokenTransferContract.transferNFTsPublic(
      nftTokenAddress,
      [await tokenCreateContract.getAddress()],
      [signers[0].address],
      [mintedTokenSerialNumber],
      Constants.GAS_LIMIT_1_000_000
    );

    const signers0BeforeHbarBalance = await signers[0].provider.getBalance(
      signers[0].address
    );
    const signers1BeforeHbarBalance = await signers[0].provider.getBalance(
      signers[1].address
    );
    const signers0BeforeTokenBalance = parseInt(
      await erc20Contract.balanceOf(tokenAddress, signers[0].address)
    );
    const signers1BeforeTokenBalance = parseInt(
      await erc20Contract.balanceOf(tokenAddress, signers[1].address)
    );
    const nftOwnerBefore = await erc721Contract.ownerOf(
      nftTokenAddress,
      mintedTokenSerialNumber
    );

    const cryptoTransfers = {
      transfers: [
        {
          accountID: signers[0].address,
          amount: -10_000,
          isApproval: false,
        },
        {
          accountID: signers[1].address,
          amount: 10_000,
          isApproval: false,
        },
      ],
    };

    let tokenTransferList = [
      {
        token: tokenAddress,
        transfers: [
          {
            accountID: signers[1].address,
            amount: amount,
            isApproval: false,
          },
          {
            accountID: signers[0].address,
            amount: -amount,
            isApproval: false,
          },
        ],
        nftTransfers: [],
      },
      {
        token: nftTokenAddress,
        transfers: [],
        nftTransfers: [
          {
            senderAccountID: signers[0].address,
            receiverAccountID: signers[1].address,
            serialNumber: mintedTokenSerialNumber,
            isApproval: false,
          },
        ],
      },
    ];
    //execute, verify balances, check the owner of the nft,
    const cryptoTransferTx = await tokenTransferContract.cryptoTransferPublic(
      cryptoTransfers,
      tokenTransferList,
      Constants.GAS_LIMIT_1_000_000
    );
    const cryptoTransferReceipt = await cryptoTransferTx.wait();
    const responseCode = cryptoTransferReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args[0];
    await new Promise((r) => setTimeout(r, 2000));

    const signers0AfterHbarBalance = await signers[0].provider.getBalance(
      signers[0].address
    );
    const signers1AfterHbarBalance = await signers[0].provider.getBalance(
      signers[1].address
    );
    const signers0AfterTokenBalance = await erc20Contract.balanceOf(
      tokenAddress,
      signers[0].address
    );
    const signers1AfterTokenBalance = await erc20Contract.balanceOf(
      tokenAddress,
      signers[1].address
    );
    const nftOwnerAfter = await erc721Contract.ownerOf(
      nftTokenAddress,
      mintedTokenSerialNumber
    );

    expect(responseCode).to.equal(TX_SUCCESS_CODE);
    expect(signers0BeforeHbarBalance > signers0AfterHbarBalance).to.equal(true);
    expect(signers1AfterHbarBalance > signers1BeforeHbarBalance).to.equal(true);
    expect(signers0BeforeTokenBalance - amount).to.equal(
      signers0AfterTokenBalance
    );
    expect(signers1BeforeTokenBalance + amount).to.equal(
      signers1AfterTokenBalance
    );
    expect(nftOwnerBefore).to.equal(signers[0].address);
    expect(nftOwnerAfter).to.equal(signers[1].address);
  });
});
// Filename: test/system-contracts/hedera-token-service/utils.js
// SPDX-License-Identifier: Apache-2.0

const hre = require('hardhat');
const { ethers } = hre;
const { expect } = require('chai');
const {
  AccountId,
  Client,
  AccountInfoQuery,
  AccountUpdateTransaction,
  ContractId,
  KeyList,
  PrivateKey,
  TokenId,
  TokenUpdateTransaction,
  TokenAssociateTransaction,
  AccountBalanceQuery,
  ContractInfoQuery,
  AccountDeleteTransaction,
} = require('@hashgraph/sdk');
const Constants = require('../../constants');
const axios = require('axios');
const {
  getMirrorNodeUrl,
} = require('../native/evm-compatibility-ecrecover/utils');

class Utils {
  static createTokenCost = '50000000000000000000';
  static createTokenCustomFeesCost = '60000000000000000000';
  static tinybarToWeibarCoef = 10_000_000_000;
  static tinybarToHbarCoef = 100_000_000;
  static initialSupply = 1000000000000;
  static maxSupply = 2000000000000;
  static nftMaxSupply = 20000;

  static KeyType = {
    ADMIN: 1,
    KYC: 2,
    FREEZE: 4,
    WIPE: 8,
    SUPPLY: 16,
    FEE: 32,
    PAUSE: 64,
  };

  static KeyValueType = {
    INHERIT_ACCOUNT_KEY: 0,
    CONTRACT_ID: 1,
    ED25519: 2,
    SECP256K1: 3,
    DELEGETABLE_CONTRACT_ID: 4,
  };

  static async deployContract(
    contractPath,
    gasLimit = Constants.GAS_LIMIT_1_000_000
  ) {
    const factory = await ethers.getContractFactory(contractPath);
    const contract = await factory.deploy(gasLimit);

    return await ethers.getContractAt(
      contractPath,
      await contract.getAddress()
    );
  }

  static async deployERC20Mock() {
    const erc20MockFactory = await ethers.getContractFactory(
      Constants.Path.HIP583_ERC20Mock
    );
    const erc20Mock = await erc20MockFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    return await ethers.getContractAt(
      Constants.Path.HIP583_ERC20Mock,
      await erc20Mock.getAddress()
    );
  }

  static async deployERC721Mock() {
    const erc721MockFactory = await ethers.getContractFactory(
      Constants.Path.HIP583_ERC721Mock
    );
    const erc721Mock = await erc721MockFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    return await ethers.getContractAt(
      Constants.Path.HIP583_ERC721Mock,
      await erc721Mock.getAddress()
    );
  }

  static async deployTokenCreateContract() {
    const tokenCreateFactory = await ethers.getContractFactory(
      Constants.Contract.TokenCreateContract
    );
    const tokenCreate = await tokenCreateFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    return await ethers.getContractAt(
      Constants.Contract.TokenCreateContract,
      await tokenCreate.getAddress()
    );
  }

  static async deployTokenCreateCustomContract() {
    const tokenCreateCustomFactory = await ethers.getContractFactory(
      Constants.Contract.TokenCreateCustomContract
    );
    const tokenCreateCustom = await tokenCreateCustomFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    return await ethers.getContractAt(
      Constants.Contract.TokenCreateCustomContract,
      await tokenCreateCustom.getAddress()
    );
  }

  static async deployTokenManagementContract() {
    const tokenManagementFactory = await ethers.getContractFactory(
      Constants.Contract.TokenManagementContract
    );
    const tokenManagement = await tokenManagementFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    return await ethers.getContractAt(
      Constants.Contract.TokenManagementContract,
      await tokenManagement.getAddress()
    );
  }

  static async deployTokenQueryContract() {
    const tokenQueryFactory = await ethers.getContractFactory(
      Constants.Contract.TokenQueryContract
    );
    const tokenQuery = await tokenQueryFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    return await ethers.getContractAt(
      Constants.Contract.TokenQueryContract,
      await tokenQuery.getAddress()
    );
  }

  static async deployTokenTransferContract() {
    const tokenTransferFactory = await ethers.getContractFactory(
      Constants.Contract.TokenTransferContract
    );
    const tokenTransfer = await tokenTransferFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    return await ethers.getContractAt(
      Constants.Contract.TokenTransferContract,
      await tokenTransfer.getAddress()
    );
  }

  static async deployHRC719Contract() {
    const hrcContractFactory = await ethers.getContractFactory(
      Constants.Contract.HRC719Contract
    );
    const hrcContract = await hrcContractFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    return await ethers.getContractAt(
      Constants.Contract.HRC719Contract,
      await hrcContract.getAddress()
    );
  }

  static async deployERC20Contract() {
    const erc20ContractFactory = await ethers.getContractFactory(
      Constants.Contract.ERC20Contract
    );
    const erc20Contract = await erc20ContractFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    return await ethers.getContractAt(
      Constants.Contract.ERC20Contract,
      await erc20Contract.getAddress()
    );
  }

  static async deployERC721Contract() {
    const erc721ContractFactory = await ethers.getContractFactory(
      Constants.Contract.ERC721Contract
    );
    const erc721Contract = await erc721ContractFactory.deploy(
      Constants.GAS_LIMIT_1_000_000
    );

    return await ethers.getContractAt(
      Constants.Contract.ERC721Contract,
      await erc721Contract.getAddress()
    );
  }

  static async createFungibleToken(contract, treasury) {
    const tokenAddressTx = await contract.createFungibleTokenPublic(treasury, {
      value: BigInt(this.createTokenCost),
      gasLimit: 1_000_000,
    });
    const tokenAddressReceipt = await tokenAddressTx.wait();

    const { tokenAddress } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  static async createFungibleTokenWithPresetKeysPublic(
    contract,
    name,
    symbol,
    memo,
    initialSupply,
    maxSupply,
    decimals,
    freezeDefaultStatus,
    treasury
  ) {
    const tokenAddressTx = await contract.createFungibleTokenWithPresetKeys(
      name,
      symbol,
      memo,
      initialSupply,
      maxSupply,
      decimals,
      freezeDefaultStatus,
      treasury,
      {
        value: BigInt(this.createTokenCost),
        gasLimit: 1_000_000,
      }
    );
    const tokenAddressReceipt = await tokenAddressTx.wait();

    const { tokenAddress } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  static async createFungibleTokenPublic(
    tokenName,
    tokenSymbol,
    tokenMemo,
    initialSupply,
    maxSupply,
    decimals,
    freezeDefaultStatus,
    signerAddress,
    keys,
    contract
  ) {
    const tokenAddress = (
      await (
        await contract.createFungibleTokenPublic(
          tokenName,
          tokenSymbol,
          tokenMemo,
          initialSupply,
          maxSupply,
          decimals,
          freezeDefaultStatus,
          signerAddress,
          keys,
          {
            value: '35000000000000000000',
            gasLimit: 1_000_000,
          }
        )
      ).wait()
    ).logs.filter((e) => e.fragment.name === Constants.Events.CreatedToken)[0]
      .args.tokenAddress;

    return tokenAddress;
  }

  static async createFungibleTokenWithSECP256K1AdminKey(
    contract,
    treasury,
    adminKey
  ) {
    const tokenAddressTx =
      await contract.createFungibleTokenWithSECP256K1AdminKeyPublic(
        treasury,
        adminKey,
        {
          value: BigInt(this.createTokenCost),
          gasLimit: 1_000_000,
        }
      );
    const tokenAddressReceipt = await tokenAddressTx.wait();
    const { tokenAddress } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  static async createFungibleTokenWithSECP256K1AdminKeyWithoutKYC(
    contract,
    treasury,
    adminKey
  ) {
    const tokenAddressTx =
      await contract.createFungibleTokenWithSECP256K1AdminKeyWithoutKYCPublic(
        treasury,
        adminKey,
        {
          value: BigInt(this.createTokenCost),
          gasLimit: 1_000_000,
        }
      );
    const tokenAddressReceipt = await tokenAddressTx.wait();
    const { tokenAddress } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  static async createFungibleTokenWithSECP256K1AdminKeyAssociateAndTransferToAddress(
    contract,
    treasury,
    adminKey,
    initialBalance = 300
  ) {
    const tokenAddressTx =
      await contract.createFungibleTokenWithSECP256K1AdminKeyAssociateAndTransferToAddressPublic(
        treasury,
        adminKey,
        initialBalance,
        {
          value: BigInt(this.createTokenCost),
          gasLimit: 1_000_000,
        }
      );
    const tokenAddressReceipt = await tokenAddressTx.wait();
    const { tokenAddress } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  static async createFungibleTokenWithCustomFees(contract, feeTokenAddress) {
    const tokenAddressTx =
      await contract.createFungibleTokenWithCustomFeesPublic(
        await contract.getAddress(),
        feeTokenAddress,
        {
          value: BigInt(this.createTokenCustomFeesCost),
          gasLimit: 10_000_000,
        }
      );
    const tokenAddressReceipt = await tokenAddressTx.wait();
    const { tokenAddress } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  // Helper function to associate and grant KYC
  static async associateAndGrantKyc(contract, token, addresses) {
    for (const address of addresses) {
      const associateTx = await contract.associateTokenPublic(address, token);
      await associateTx.wait(); // Ensure the association is completed before proceeding

      const grantKycTx = await contract.grantTokenKycPublic(token, address);
      await grantKycTx.wait(); // Ensure the KYC grant is completed before proceeding
    }
  }

  static async createFungibleTokenWithCustomFeesAndKeys(
    contract,
    treasury,
    fixedFees,
    fractionalFees,
    keys
  ) {
    const updateFeesTx = await contract.createFungibleTokenWithCustomFeesPublic(
      treasury,
      'Hedera Token Fees',
      'HTF',
      'Hedera Token With Fees',
      this.initialSupply,
      this.maxSupply,
      0,
      fixedFees,
      fractionalFees,
      keys,
      {
        value: BigInt(this.createTokenCost),
        gasLimit: 1_000_000,
      }
    );
    const updateFeesReceipt = await updateFeesTx.wait();

    const { tokenAddress } = updateFeesReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  static async createNonFungibleTokenWithCustomRoyaltyFeeAndKeys(
    contract,
    treasury,
    fixedFees,
    royaltyFees,
    keys
  ) {
    const tokenAddressTx =
      await contract.createNonFungibleTokenWithCustomFeesPublic(
        treasury,
        'Non Fungible Token With Custom Fees',
        'NFTF',
        'Non Fungible Token With Custom Fees',
        this.nftMaxSupply,
        fixedFees,
        royaltyFees,
        keys,
        {
          value: BigInt(this.createTokenCost),
          gasLimit: 1_000_000,
        }
      );
    const tokenAddressReceipt = await tokenAddressTx.wait();
    const { tokenAddress } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  static async createNonFungibleToken(contract, treasury) {
    const tokenAddressTx = await contract.createNonFungibleTokenPublic(
      treasury,
      {
        value: BigInt(this.createTokenCost),
        gasLimit: 1_000_000,
      }
    );
    const tokenAddressReceipt = await tokenAddressTx.wait();
    const { tokenAddress } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  static async createNonFungibleTokenWithSECP256K1AdminKey(
    contract,
    treasury,
    adminKey
  ) {
    const tokenAddressTx =
      await contract.createNonFungibleTokenWithSECP256K1AdminKeyPublic(
        treasury,
        adminKey,
        {
          value: BigInt(this.createTokenCost),
          gasLimit: 1_000_000,
        }
      );
    const tokenAddressReceipt = await tokenAddressTx.wait();
    const { tokenAddress } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  static async createNonFungibleTokenWithSECP256K1AdminKeyWithoutKYC(
    contract,
    treasury,
    adminKey
  ) {
    const tokenAddressTx =
      await contract.createNonFungibleTokenWithSECP256K1AdminKeyWithoutKYCPublic(
        treasury,
        adminKey,
        {
          value: BigInt(this.createTokenCost),
          gasLimit: 1_000_000,
        }
      );
    const tokenAddressReceipt = await tokenAddressTx.wait();
    const { tokenAddress } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.CreatedToken
    )[0].args;

    return tokenAddress;
  }

  static hexToASCII(str) {
    const hex = str.toString();
    let ascii = '';
    for (let n = 0; n < hex.length; n += 2) {
      ascii += String.fromCharCode(parseInt(hex.substring(n, n + 2), 16));
    }
    return ascii;
  }

  /**
   * Converts an EVM ErrorMessage to a readable form. For example this :
   * 0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000d53657420746f2072657665727400000000000000000000000000000000000000
   * will be converted to "Set to revert"
   * @param message
   */
  static decodeErrorMessage(message) {
    const EMPTY_HEX = '0x';
    if (!message) return '';

    // If the message does not start with 0x, it is not an error message, return it as is
    if (!message.includes(EMPTY_HEX)) return message;

    message = message.replace(/^0x/, ''); // Remove the starting 0x
    const strLen = parseInt(message.slice(8 + 64, 8 + 128), 16); // Get the length of the readable text
    const resultCodeHex = message.slice(8 + 128, 8 + 128 + strLen * 2); // Extract the hex of the text
    return this.hexToASCII(resultCodeHex);
  }

  static async getRevertReasonFromReceipt(hash) {
    const receipt = await ethers.provider.send('eth_getTransactionReceipt', [
      hash,
    ]);

    return receipt.revertReason;
  }

  static async getHbarBalance(address) {
    const balanceJson = (await this.getAccountBalance(address)).toJSON();
    const balanceFloat = parseFloat(balanceJson.hbars);

    return balanceFloat;
  }

  static async getTokenBalance(accountAddress, tokenAddress) {
    const accountBalanceJson = (
      await this.getAccountBalance(accountAddress)
    ).toJSON();
    const tokenId = await AccountId.fromEvmAddress(
      0,
      0,
      tokenAddress
    ).toString();
    const balance = accountBalanceJson.tokens.find(
      (e) => e.tokenId === tokenId
    );

    return parseInt(balance.balance);
  }

  static async updateFungibleTokenCustomFees(
    contract,
    token,
    treasury,
    feeToken,
    feeAmount
  ) {
    const updateFees = await contract.updateFungibleTokenCustomFeesPublic(
      token,
      treasury,
      feeToken,
      feeAmount
    );
    const receipt = await updateFees.wait();
  }

  static async mintNFT(contract, nftTokenAddress, data = ['0x01']) {
    const mintNftTx = await contract.mintTokenPublic(
      nftTokenAddress,
      0,
      data,
      Constants.GAS_LIMIT_1_000_000
    );
    const tokenAddressReceipt = await mintNftTx.wait();
    const { serialNumbers } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.MintedToken
    )[0].args;

    return parseInt(serialNumbers);
  }

  static async mintNFTToAddress(contract, nftTokenAddress, data = ['0x01']) {
    const mintNftTx = await contract.mintTokenToAddressPublic(
      nftTokenAddress,
      0,
      data,
      Constants.GAS_LIMIT_1_000_000
    );
    const tokenAddressReceipt = await mintNftTx.wait();
    const { serialNumbers } = tokenAddressReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.MintedToken
    )[0].args;

    return parseInt(serialNumbers);
  }

  // Add Token association via hedera.js sdk
  // Client with signer - my private key example

  static async associateToken(contract, tokenAddress, contractName) {
    const signers = await ethers.getSigners();
    const associateTx1 = await ethers.getContractAt(
      contractName,
      await contract.getAddress(),
      signers[0]
    );
    const associateTx2 = await ethers.getContractAt(
      contractName,
      await contract.getAddress(),
      signers[1]
    );

    const associateTx3 = await ethers.getContractAt(
      contractName,
      await contract.getAddress(),
      signers[2]
    );

    await contract.associateTokenPublic(
      await contract.getAddress(),
      tokenAddress,
      Constants.GAS_LIMIT_1_000_000
    );
    await associateTx1.associateTokenPublic(
      signers[0].address,
      tokenAddress,
      Constants.GAS_LIMIT_1_000_000
    );
    await associateTx2.associateTokenPublic(
      signers[1].address,
      tokenAddress,
      Constants.GAS_LIMIT_1_000_000
    );
    await associateTx3.associateTokenPublic(
      signers[2].address,
      tokenAddress,
      Constants.GAS_LIMIT_1_000_000
    );
  }

  static async grantTokenKyc(contract, tokenAddress) {
    const signers = await ethers.getSigners();
    await contract.grantTokenKycPublic(
      tokenAddress,
      await contract.getAddress()
    );
    await contract.grantTokenKycPublic(tokenAddress, signers[0].address);
    await contract.grantTokenKycPublic(tokenAddress, signers[1].address);
  }

  static async expectToFail(transaction, code = null) {
    try {
      const result = await transaction;
      await result.wait();
      expect(true).to.eq(false);
    } catch (e) {
      expect(e).to.exist;
      if (code) {
        expect(e.code).to.eq(code);
      }
    }
  }

  static async createSDKClient(operatorId, operatorKey) {
    const network = Utils.getCurrentNetwork();

    const hederaNetwork = {};
    hederaNetwork[hre.config.networks[network].sdkClient.networkNodeUrl] =
      AccountId.fromString(hre.config.networks[network].sdkClient.nodeId);
    const { mirrorNode } = hre.config.networks[network].sdkClient;

    operatorId =
      operatorId || hre.config.networks[network].sdkClient.operatorId;
    operatorKey =
      operatorKey || hre.config.networks[network].sdkClient.operatorKey;

    const client = Client.forNetwork(hederaNetwork)
      .setMirrorNetwork(mirrorNode)
      .setOperator(operatorId, operatorKey);

    return client;
  }

  static async getAccountId(evmAddress, client) {
    const query = new AccountInfoQuery().setAccountId(
      AccountId.fromEvmAddress(0, 0, evmAddress)
    );

    const accountInfo = await query.execute(client);
    return accountInfo.accountId.toString();
  }

  static async getAccountInfo(evmAddress, client) {
    const query = new AccountInfoQuery().setAccountId(
      AccountId.fromEvmAddress(0, 0, evmAddress)
    );

    return await query.execute(client);
  }

  static async getContractInfo(evmAddress, client) {
    const query = new ContractInfoQuery().setContractId(
      ContractId.fromEvmAddress(0, 0, evmAddress)
    );

    return await query.execute(client);
  }

  static async deleteAccount(account, signer, accountId) {
    const accountDeleteTransaction = await new AccountDeleteTransaction()
      .setAccountId(accountId)
      .setTransferAccountId(signer.getOperator().accountId)
      .freezeWith(signer)
      .sign(PrivateKey.fromStringECDSA(account.signingKey.privateKey));

    await accountDeleteTransaction.execute(signer);
  }

  static getSignerCompressedPublicKey(
    index = 0,
    asBuffer = true,
    prune0x = true
  ) {
    const wallet = new ethers.Wallet(
      hre.config.networks[hre.network.name].accounts[index]
    );
    const cpk = prune0x
      ? wallet.signingKey.compressedPublicKey.replace('0x', '')
      : wallet.signingKey.compressedPublicKey;

    return asBuffer ? Buffer.from(cpk, 'hex') : cpk;
  }

  static async getHardhatSignersPrivateKeys(add0xPrefix = true) {
    const network = Utils.getCurrentNetwork();
    return hre.config.networks[network].accounts.map((pk) =>
      add0xPrefix ? pk : pk.replace('0x', '')
    );
  }

  static getHardhatSignerPrivateKeyByIndex(index = 0) {
    return hre.config.networks[hre.network.name].accounts[index];
  }

  static async updateAccountKeysViaHapi(
    contractAddresses,
    ecdsaPrivateKeys = []
  ) {
    const clientGenesis = await Utils.createSDKClient();
    if (!ecdsaPrivateKeys.length) {
      ecdsaPrivateKeys = await this.getHardhatSignersPrivateKeys(false);
    }

    for (const privateKey of ecdsaPrivateKeys) {
      const pkSigner = PrivateKey.fromStringECDSA(privateKey.replace('0x', ''));
      const accountId = await Utils.getAccountId(
        pkSigner.publicKey.toEvmAddress(),
        clientGenesis
      );
      const clientSigner = await Utils.createSDKClient(accountId, pkSigner);

      const keyList = new KeyList(
        [
          pkSigner.publicKey,
          ...contractAddresses.map((address) =>
            ContractId.fromEvmAddress(0, 0, address)
          ),
        ],
        1
      );

      await (
        await new AccountUpdateTransaction()
          .setAccountId(accountId)
          .setKey(keyList)
          .freezeWith(clientSigner)
          .sign(pkSigner)
      ).execute(clientSigner);
    }
  }

  static async getAccountBalance(address) {
    const client = await Utils.createSDKClient();
    const accountId = await Utils.getAccountId(address, client);
    const tokenBalance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(client);
    return tokenBalance;
  }

  static async updateTokenKeysViaHapi(
    tokenAddress,
    contractAddresses,
    setAdmin = true,
    setPause = true,
    setKyc = true,
    setFreeze = true,
    setSupply = true,
    setWipe = true,
    setFeeSchedule = true
  ) {
    const signers = await ethers.getSigners();
    const clientGenesis = await Utils.createSDKClient();
    const pkSigners = (await Utils.getHardhatSignersPrivateKeys()).map((pk) =>
      PrivateKey.fromStringECDSA(pk)
    );
    const accountIdSigner0 = await Utils.getAccountId(
      signers[0].address,
      clientGenesis
    );
    const clientSigner0 = await Utils.createSDKClient(
      accountIdSigner0,
      pkSigners[0]
    );

    const keyList = new KeyList(
      [
        ...pkSigners.map((pk) => pk.publicKey),
        ...contractAddresses.map((address) =>
          ContractId.fromEvmAddress(0, 0, address)
        ),
      ],
      1
    );

    const tx = new TokenUpdateTransaction().setTokenId(
      TokenId.fromSolidityAddress(tokenAddress)
    );
    if (setAdmin) tx.setAdminKey(keyList);
    if (setPause) tx.setPauseKey(keyList);
    if (setKyc) tx.setKycKey(keyList);
    if (setFreeze) tx.setFreezeKey(keyList);
    if (setSupply) tx.setSupplyKey(keyList);
    if (setWipe) tx.setWipeKey(keyList);
    if (setFeeSchedule) tx.setFeeScheduleKey(keyList);

    await (
      await tx.freezeWith(clientSigner0).sign(pkSigners[0])
    ).execute(clientSigner0);
  }

  static getCurrentNetwork() {
    return hre.network.name;
  }

  static convertAccountIdToLongZeroAddress(accountId, prepend0x = false) {
    const address = AccountId.fromString(accountId).toSolidityAddress();

    return prepend0x ? '0x' + address : address;
  }

  static async associateWithSigner(privateKey, tokenAddress) {
    const genesisClient = await this.createSDKClient();

    const wallet = new ethers.Wallet(privateKey);
    const accountIdAsString = await this.getAccountId(
      wallet.address,
      genesisClient
    );
    const signerPk = PrivateKey.fromStringECDSA(wallet.signingKey.privateKey);

    const signerClient = await this.createSDKClient(
      accountIdAsString,
      signerPk.toString() // DER encoded
    );

    const transaction = new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(accountIdAsString))
      .setTokenIds([TokenId.fromSolidityAddress(tokenAddress)])
      .freezeWith(signerClient);

    const signTx = await transaction.sign(signerPk);
    const txResponse = await signTx.execute(signerClient);
    await txResponse.getReceipt(signerClient);
  }

  static defaultKeyValues = {
    inheritAccountKey: false,
    contractId: ethers.ZeroAddress,
    ed25519: Buffer.from('', 'hex'),
    ECDSA_secp256k1: Buffer.from('', 'hex'),
    delegatableContractId: ethers.ZeroAddress,
  };

  /**
   * @dev Constructs a key conforming to the IHederaTokenService.TokenKey type
   *
   * @param keyType ADMIN | KYC | FREEZE | WIPE | SUPPLY | FEE | PAUSE
   *                See https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L128
   *                for more information
   *
   * @param keyValyeType INHERIT_ACCOUNT_KEY | CONTRACT_ID | ED25519 | SECP256K1 | DELEGETABLE_CONTRACT_ID
   *
   * @param value bytes value, public address of an account, or boolean
   *            See https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L92
   *                     for more information
   */
  static constructIHederaTokenKey(keyType, keyValueType, value) {
    // sanitize params
    if (
      keyType !== 'ADMIN' &&
      keyType !== 'KYC' &&
      keyType !== 'FREEZE' &&
      keyType !== 'WIPE' &&
      keyType !== 'SUPPLY' &&
      keyType !== 'FEE' &&
      keyType !== 'PAUSE'
    ) {
      return;
    }

    switch (keyValueType) {
      case 'INHERIT_ACCOUNT_KEY':
        return {
          keyType: this.KeyType[keyType],
          key: { ...this.defaultKeyValues, inheritAccountKey: value },
        };
      case 'CONTRACT_ID':
        return {
          keyType: this.KeyType[keyType],
          key: { ...this.defaultKeyValues, contractId: value },
        };
      case 'ED25519':
        return {
          keyType: this.KeyType[keyType],
          key: { ...this.defaultKeyValues, ed25519: value },
        };
      case 'SECP256K1':
        return {
          keyType: this.KeyType[keyType],
          key: { ...this.defaultKeyValues, ECDSA_secp256k1: value },
        };
      case 'DELEGETABLE_CONTRACT_ID':
        return {
          keyType: this.KeyType[keyType],
          key: { ...this.defaultKeyValues, delegatableContractId: value },
        };
      default:
        return;
    }
  }

  /**
   * This method fetches the transaction actions from the mirror node corresponding to the current network,
   * filters the actions to find the one directed to the Hedera Token Service (HTS) system contract,
   * and extracts the result data from the precompile action. The result data is converted from a BigInt
   * to a string before being returned.
   *
   * @param {string} txHash - The transaction hash to query.
   * @returns {string} - The response code as a string.
   */
  static async getHTSResponseCode(txHash) {
    const network = hre.network.name;
    const mirrorNodeUrl = getMirrorNodeUrl(network);
    const res = await axios.get(
      `${mirrorNodeUrl}/contracts/results/${txHash}/actions`
    );
    const precompileAction = res.data.actions.find(
      (x) => x.recipient === Constants.HTS_SYSTEM_CONTRACT_ID
    );
    return BigInt(precompileAction.result_data).toString();
  }

  /**
   * This method fetches the transaction actions from the mirror node corresponding to the current network,
   * filters the actions to find the one directed to the Hedera Account Service (HAS) system contract,
   * and extracts the result data from the precompile action. The result data is converted from a BigInt
   * to a string before being returned.
   *
   * @param {string} txHash - The transaction hash to query.
   * @returns {string} - The response code as a string.
   */
  static async getHASResponseCode(txHash) {
    const network = hre.network.name;
    const mirrorNodeUrl = getMirrorNodeUrl(network);
    const res = await axios.get(
      `${mirrorNodeUrl}/contracts/results/${txHash}/actions`
    );
    const precompileAction = res.data.actions.find(
      (x) => x.recipient === Constants.HAS_SYSTEM_CONTRACT_ID
    );
    return BigInt(precompileAction.result_data).toString();
  }

  static async setupNft(tokenCreateContract, owner, contractAddresses) {
    const nftTokenAddress =
      await this.createNonFungibleTokenWithSECP256K1AdminKeyWithoutKYC(
        tokenCreateContract,
        owner,
        this.getSignerCompressedPublicKey()
      );

    await this.updateTokenKeysViaHapi(
      nftTokenAddress,
      contractAddresses,
      true,
      true,
      false,
      true,
      true,
      true,
      false
    );

    await this.associateToken(
      tokenCreateContract,
      nftTokenAddress,
      Constants.Contract.TokenCreateContract
    );

    return nftTokenAddress;
  }

  static async setupToken(tokenCreateContract, owner, contractAddresses) {
    const tokenAddress =
      await this.createFungibleTokenWithSECP256K1AdminKeyWithoutKYC(
        tokenCreateContract,
        owner,
        this.getSignerCompressedPublicKey()
      );

    await this.updateTokenKeysViaHapi(
      tokenAddress,
      contractAddresses,
      true,
      true,
      false,
      true,
      true,
      true,
      false
    );

    await this.associateToken(
      tokenCreateContract,
      tokenAddress,
      Constants.Contract.TokenCreateContract
    );

    return tokenAddress;
  }

  /**
   * Creates multiple pending airdrops for testing purposes
   * @param {Contract} airdropContract - The airdrop contract instance
   * @param {string} owner - The owner's address
   * @param {Contract} tokenCreateContract - The token create contract instance
   * @param {number} count - Number of pending airdrops to create
   * @returns {Object} Object containing arrays of senders, receivers, tokens, serials, and amounts
   */
  static async createPendingAirdrops(
    count,
    tokenCreateContract,
    owner,
    airdropContract,
    receiver
  ) {
    const senders = [];
    const receivers = [];
    const tokens = [];
    const serials = [];
    const amounts = [];

    for (let i = 0; i < count; i++) {
      const tokenAddress = await this.setupToken(tokenCreateContract, owner, [
        await airdropContract.getAddress(),
      ]);
      const ftAmount = BigInt(i + 1); // Different amount for each airdrop

      const airdropTx = await airdropContract.tokenAirdrop(
        tokenAddress,
        owner,
        receiver,
        ftAmount,
        {
          value: Constants.ONE_HBAR,
          gasLimit: 2_000_000,
        }
      );
      await airdropTx.wait();

      senders.push(owner);
      receivers.push(receiver);
      tokens.push(tokenAddress);
      serials.push(0); // 0 for fungible tokens
      amounts.push(ftAmount);
    }

    return { senders, receivers, tokens, serials, amounts };
  }

  /**
   * Retrieves the maximum number of automatic token associations for an account from the mirror node
   * @param {string} evmAddress - The EVM address of the account to query
   * @returns {Promise<number>} Returns:
   *  - -1 if unlimited automatic associations are enabled
   *  - 0 if automatic associations are disabled
   *  - positive number for the maximum number of automatic associations allowed
   * @throws {Error} If there was an error fetching the data from mirror node
   */
  static async getMaxAutomaticTokenAssociations(evmAddress) {
    const network = hre.network.name;
    const mirrorNodeUrl = getMirrorNodeUrl(network);
    const response = await axios.get(`${mirrorNodeUrl}/accounts/${evmAddress}`);
    return response.data.max_automatic_token_associations;
  }

  static decimalToAscii(decimalStr) {
    const hex = BigInt(decimalStr).toString(16);
    return Buffer.from(hex, 'hex').toString('ascii');
  }
}

module.exports = Utils;
// Filename: test/system-contracts/native/EcrecoverCaller.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const Utils = require('../../utils');

describe('Native Precompiles - Ecrecover Test Suite', function () {
  this.timeout(10000);

  let contract, signedData, hashedData, v, r, s, signer, callData;
  const UNSIGNED_DATA = 'Hello World!';
  const DEFAULT_VALUE = 10000000000000;
  const ADDRESS_ONE = '0x0000000000000000000000000000000000000001';

  before(async () => {
    const Contract = await ethers.getContractFactory(
      Constants.Contract.EcrecoverCaller
    );
    const _contract = await Contract.deploy({
      gasLimit: 8_000_000,
    });

    const contractAddress = await _contract.getAddress();
    contract = Contract.attach(contractAddress);

    signer = (await ethers.getSigners())[0];
    signedData = await signer.signMessage(UNSIGNED_DATA);
    hashedData = ethers.hashMessage(UNSIGNED_DATA);

    const splitSignature = ethers.Signature.from(signedData);

    v = splitSignature.v;
    r = splitSignature.r;
    s = splitSignature.s;

    callData = `0x${Utils.to32ByteString(hashedData)}${Utils.to32ByteString(
      v
    )}${Utils.to32ByteString(r)}${Utils.to32ByteString(s)}`;
  });

  // Calling a method that uses `ecrecover`
  it('should be able to call callEcrecover', async function () {
    const result = await contract.callEcrecover(hashedData, v, r, s);
    expect(result).to.eq(signer.address);
  });

  // Calling a method that calls `0x1` with the specified CallData
  it('should be able to call call0x1', async function () {
    const result = await contract.call0x1(callData);
    const rec = await result.wait();
    expect(rec.logs[0].data).to.contain(
      signer.address.toLowerCase().replace('0x', '')
    );
  });

  it('should not be able to call call0x1 with value', async function () {
    const balanceAtStart = await ethers.provider.getBalance(ADDRESS_ONE);
    expect(balanceAtStart).to.eq(0);

    try {
      await contract.call0x1(callData, { value: DEFAULT_VALUE });
      await result.wait();
      expect(1).to.eq(2);
    } catch (e) {
      expect(e).to.exist;
    }

    const balanceAtEnd = await ethers.provider.getBalance(ADDRESS_ONE);
    expect(balanceAtEnd).to.eq(0);
  });

  // Executing .send to 0x1
  it('should not be able to call send0x1 with no value', async function () {
    const balanceAtStart = await ethers.provider.getBalance(ADDRESS_ONE);
    expect(balanceAtStart).to.eq(0);

    try {
      await contract.send0x1();
      expect(1).to.eq(2);
    } catch (e) {
      expect(e).to.exist;
    }

    const balanceAtEnd = await ethers.provider.getBalance(ADDRESS_ONE);
    expect(balanceAtEnd).to.eq(0);
  });

  it('should not be able to call send0x1 with value', async function () {
    const balanceAtStart = await ethers.provider.getBalance(ADDRESS_ONE);
    expect(balanceAtStart).to.eq(0);

    try {
      await contract.send0x1({ value: DEFAULT_VALUE });
      expect(1).to.eq(2);
    } catch (e) {
      expect(e).to.exist;
    }

    const balanceAtEnd = await ethers.provider.getBalance(ADDRESS_ONE);
    expect(balanceAtEnd).to.eq(0);
  });

  // Executing .transfer to 0x1
  it('should not be able to call transfer0x1 with no value', async function () {
    const balanceAtStart = await ethers.provider.getBalance(ADDRESS_ONE);
    expect(balanceAtStart).to.eq(0);

    try {
      await contract.transfer0x1();
      expect(1).to.eq(2);
    } catch (e) {
      expect(e).to.exist;
    }

    const balanceAtEnd = await ethers.provider.getBalance(ADDRESS_ONE);
    expect(balanceAtEnd).to.eq(0);
  });

  it('should not be able to call transfer0x1 with value', async function () {
    const balanceAtStart = await ethers.provider.getBalance(ADDRESS_ONE);
    expect(balanceAtStart).to.eq(0);

    try {
      await contract.transfer0x1({ value: DEFAULT_VALUE });
      expect(1).to.eq(2);
    } catch (e) {
      expect(e).to.exist;
    }

    const balanceAtEnd = await ethers.provider.getBalance(ADDRESS_ONE);
    expect(balanceAtEnd).to.eq(0);
  });
});
// Filename: test/system-contracts/native/EthPrecompiles.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');
const Utils = require('../../utils');

describe('Eth Native Precompiles - Test Suite', function () {
  let contract,
    signedData,
    hashedData,
    v,
    r,
    s,
    signer,
    hashedMessageData,
    signerAddr;
  const MESSAGE_DATA = 'Hello World!';
  const UNSIGNED_DATA = 'Hello Eth Native Precompiles!';
  // RIPEMD160 encoding of the string "Hello World!"
  const RIPEMD160_ENCODED =
    '0x0000000000000000000000008476ee4631b9b30ac2754b0ee0c47e161d3f724c';

  before(async () => {
    const Contract = await ethers.getContractFactory(
      Constants.Contract.EthNativePrecompileCaller
    );
    contract = await Contract.deploy({
      gasLimit: 15_000_000,
    });

    signer = (await ethers.getSigners())[0];
    signerAddr = signer.address.toLowerCase().replace('0x', '');
    signedData = await signer.signMessage(UNSIGNED_DATA);
    hashedData = ethers.hashMessage(UNSIGNED_DATA);
    hashedMessageData = ethers.sha256(new Buffer.from(MESSAGE_DATA, 'utf-8'));

    const splitSignature = ethers.Signature.from(signedData);

    v = splitSignature.v;
    r = splitSignature.r;
    s = splitSignature.s;
  });

  it('should be able to call "call0x01 -> ecRecover"', async function () {
    const callData = `0x${Utils.to32ByteString(hashedData)}${Utils.to32ByteString(
      v
    )}${Utils.to32ByteString(r)}${Utils.to32ByteString(s)}`;

    const result = await contract.call0x01(callData);
    const rec = await result.wait();
    expect(rec.logs[0].data).to.contain(signerAddr);
  });

  it('should be able to call "call0x02sha256 -> ecRecover"', async function () {
    const result = await contract.call0x02sha256(MESSAGE_DATA);
    expect(result).to.equal(hashedMessageData);
  });

  it('should be able to call "call0x02 -> SHA2-256"', async function () {
    const result = await contract.call0x02(MESSAGE_DATA);
    const { logs } = await result.wait();
    expect(logs[0].data).to.equal(hashedMessageData);
  });

  it('should be able to call "call0x03 -> RIPEMD-160"', async function () {
    const result = await contract.call0x03(MESSAGE_DATA);
    const { logs } = await result.wait();
    expect(logs[0].data).to.equal(RIPEMD160_ENCODED);
  });

  it('should be able to call "call0x04 -> identity"', async function () {
    const result = await contract.call0x04(MESSAGE_DATA);
    const { logs } = await result.wait();
    const dataToWrite = logs[1].data;
    const resultFromIdentity = logs[0].data;

    expect(dataToWrite).to.equal(resultFromIdentity);
  });

  it('should be able to call "call0x05 -> modexp"', async function () {
    // 3^2 mod 8 = 1
    const result = await contract.call0x05.staticCall(3, 2, 8);

    expect(parseInt(result, 16)).to.equal(1);
  });

  describe('call0x06 & call0x07 -> ecAdd & ecMul', function () {
    const EXPECTED_RESULT_FOR_X =
      '0x030644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd3';
    const EXPECTED_RESULT_FOR_Y =
      '0x15ed738c0e0a7c92e7845f96b2ae9c0a68a6a449e3538fc7ff3ebf7a5a18a2c4';
    const Point = {
      x1: Utils.to32ByteString(1),
      y1: Utils.to32ByteString(2),
    };

    it('should be able to call "call0x06 -> ecAdd', async function () {
      const x1 = (x2 = Point.x1);
      const y1 = (y2 = Point.y1);
      const callData = `0x${x1}${y1}${x2}${y2}`;
      const result = await contract.call0x06(callData);

      const { logs } = await result.wait();
      const x = logs[0].data;
      const y = logs[1].data;

      expect(x).to.equal(EXPECTED_RESULT_FOR_X);
      expect(y).to.equal(EXPECTED_RESULT_FOR_Y);
    });

    it('should be able to call "call0x07 -> ecMul', async function () {
      const x1 = Point.x1;
      const y1 = Point.y1;
      const s = Utils.to32ByteString(2);
      const callData = `0x${x1}${y1}${s}`;
      const result = await contract.call0x07(callData);

      const { logs } = await result.wait();
      const x = logs[0].data;
      const y = logs[1].data;

      expect(x).to.equal(EXPECTED_RESULT_FOR_X);
      expect(y).to.equal(EXPECTED_RESULT_FOR_Y);
    });
  });

  describe('call0x08 -> ecPairing', function () {
    const EXPECTED_RESULT_FAILURE = Utils.to32ByteString(0);
    const EXPECTED_RESULT_SUCCESS = Utils.to32ByteString(1);

    const x1 =
      '2cf44499d5d27bb186308b7af7af02ac5bc9eeb6a3d147c186b21fb1b76e18da';
    const y1 =
      '2c0f001f52110ccfe69108924926e45f0b0c868df0e7bde1fe16d3242dc715f6';
    const x2 =
      '1fb19bb476f6b9e44e2a32234da8212f61cd63919354bc06aef31e3cfaff3ebc';
    const y2 =
      '22606845ff186793914e03e21df544c34ffe2f2f3504de8a79d9159eca2d98d9';
    const x3 =
      '2bd368e28381e8eccb5fa81fc26cf3f048eea9abfdd85d7ed3ab3698d63e4f90';
    const y3 =
      '2fe02e47887507adf0ff1743cbac6ba291e66f59be6bd763950bb16041a0a85e';
    const x4 =
      '0000000000000000000000000000000000000000000000000000000000000001';
    const y4 =
      '30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd45';
    const x5 =
      '1971ff0471b09fa93caaf13cbf443c1aede09cc4328f5a62aad45f40ec133eb4';
    const y5 =
      '091058a3141822985733cbdddfed0fd8d6c104e9e9eff40bf5abfef9ab163bc7';
    const x6 =
      '2a23af9a5ce2ba2796c1f4e453a370eb0af8c212d9dc9acd8fc02c2e907baea2';
    const y6 =
      '23a8eb0b0996252cb548a4487da97b02422ebc0e834613f954de6c7e0afdc1fc';
    // The point at infinity is encoded with both field x and y at 0.
    const x_failure =
      '0000000000000000000000000000000000000000000000000000000000000000';
    const y_failure =
      '0000000000000000000000000000000000000000000000000000000000000000';

    it('should be able to call "call0x08 -> ecPairing (0 points)', async function () {
      const callData = `0x`;
      const result = await contract.call0x08(callData);

      const { logs } = await result.wait();
      const success = logs[0].data;

      expect(success.replace('0x', '')).to.equal(EXPECTED_RESULT_SUCCESS);
    });

    it('should be able to call "call0x08 -> ecPairing', async function () {
      const callData = `0x${x1}${y1}${x2}${y2}${x3}${y3}${x4}${y4}${x5}${y5}${x6}${y6}`;
      const result = await contract.call0x08(callData);

      const { logs } = await result.wait();
      const success = logs[0].data;

      expect(success.replace('0x', '')).to.equal(EXPECTED_RESULT_SUCCESS);
    });

    it('should be able to call "call0x08 -> ecPairing (failure)', async function () {
      const callData = `0x${x_failure}${y_failure}${x2}${y2}${x3}${y3}${x4}${y4}${x5}${y5}${x6}${y6}`;
      const result = await contract.call0x08(callData);

      const { logs } = await result.wait();
      const success = logs[0].data;

      expect(success.replace('0x', '')).to.equal(EXPECTED_RESULT_FAILURE);
    });
  });

  describe('call0x09 -> blake2f', function () {
    const rounds = '0000000c';
    const h =
      '48c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b';
    const m =
      '6162630000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    const t = '03000000000000000000000000000000';
    const f = '01';
    const callData = `0x${rounds}${h}${m}${t}${f}`;
    const correctResult =
      'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923';

    it('should be able to call "call0x09 -> blake2f', async function () {
      const result = await contract.call0x09(callData);

      const { logs } = await result.wait();
      const stateVector = logs[0].data;

      expect(stateVector.slice(-128)).to.equal(correctResult);
    });
  });
});
// Filename: test/system-contracts/native/evm-compatibility-ecrecover/EcrecoverCheck.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const utils = require('./utils');
const htsUtils = require('../../hedera-token-service/utils');
const hre = require('hardhat');
const { PrivateKey } = require('@hashgraph/sdk');

describe('EcrecoverCheck', function () {
  let address;
  let client;

  before(async () => {
    address = await utils.deploy();
  });

  const initializeAccount = async (keyType, withAlias) => {
    const network = htsUtils.getCurrentNetwork();
    const operatorId = hre.config.networks[network].sdkClient.operatorId;
    const operatorKey = PrivateKey.fromStringDer(
      hre.config.networks[network].sdkClient.operatorKey.replace('0x', '')
    );
    client = await htsUtils.createSDKClient(operatorId, operatorKey);
    const account = await utils.createAccount(client, keyType, withAlias);
    client.setOperator(account.accountId, account.privateKey);
    return account;
  };

  /**
   * This method will sign a sample message and extract its signer using ecrecover.
   *
   * @param {Object} account - The account object containing the private key.
   * @returns {Promise<string>} - The recovered address of the signer.
   */
  const ecrecover = async (account) => {
    const message = 'Test message';
    return await utils.getAddressRecoveredFromEcRecover(
      address,
      client,
      message,
      await utils.sign(message, utils.formatPrivateKey(account.privateKey))
    );
  };

  const msgSender = () => utils.getMsgSenderAddress(address, client);

  const changeAccountKeyType = async (account, keyType) => {
    account.privateKey = await utils.changeAccountKeyType(account, keyType);
    client.setOperator(account.accountId, account.privateKey);
  };

  describe('Deployment', function () {
    it('Should be deployed correctly', async function () {
      expect(address).to.not.null;
    });
  });

  describe('Verification', function () {
    it('Ecrecover should work correctly for account with ECDSA key and EVM alias derived from ECDSA key.', async function () {
      const account = await initializeAccount('ECDSA', true);
      expect(await ecrecover(account)).to.equals(await msgSender());
    });

    it('Ecrecover should fail for account with ECDSA key replaced by new ECDSA private key. EVMAlias (msg.sender) will remain the same but signer extracted with ecrecover will be derived from new key pair.', async function () {
      const account = await initializeAccount('ECDSA', true);
      expect(await ecrecover(account)).to.equals(await msgSender());
      await changeAccountKeyType(account, 'ECDSA');
      expect(await ecrecover(account)).to.not.equals(await msgSender());
    });

    it('Ecrecover should fail for account with ECDSA key replaced by new ED25519 private key. EVMAlias (msg.sender) will remain the same but signer extracted with ecrecover will be some random value, because ecrecover will not work for ED25519 keys.', async function () {
      const account = await initializeAccount('ECDSA', true);
      expect(await ecrecover(account)).to.equals(await msgSender());
      await changeAccountKeyType(account, 'ED25519');
      expect(await ecrecover(account)).to.not.equals(await msgSender());
    });

    it('Ecrecover should be broken for account with ECDSA key and default EVM alias. EVM alias is not connected in any way to the ECDSA key, so ecrecover result will not return it.', async function () {
      const account = await initializeAccount('ECDSA', false);
      expect(await ecrecover(account)).to.not.equals(await msgSender());
    });

    it('Ecrecover should be broken for ED25519 keys. No matter what they will be replaced with.', async function () {
      const ed25519 = await initializeAccount('ED25519', false);
      expect(await ecrecover(ed25519)).to.not.equals(await msgSender());

      await changeAccountKeyType(ed25519, 'ED25519');
      expect(await ecrecover(ed25519)).to.not.equals(await msgSender());

      const ed25519ToEcdsa = await initializeAccount('ED25519', false);
      await initializeAccount('ED25519', false);

      await changeAccountKeyType(ed25519ToEcdsa, 'ECDSA');
      expect(await ecrecover(ed25519ToEcdsa)).to.not.equals(await msgSender());
    });

    it('Ecrecover should work correctly when reverting to previous ECDSA key for which ecrecover used to work.', async function () {
      const account = await initializeAccount('ECDSA', true);
      expect(await ecrecover(account)).to.equals(await msgSender());

      const initialCorrectPrivateKey = account.privateKey;
      await changeAccountKeyType(account, 'ED25519');

      expect(await ecrecover(account)).to.not.equals(await msgSender());

      await utils.changeAccountKey(account, initialCorrectPrivateKey);
      account.privateKey = initialCorrectPrivateKey;
      client.setOperator(account.accountId, initialCorrectPrivateKey);

      expect(await ecrecover(account)).to.equals(await msgSender());
    });
  });
});
// Filename: test/system-contracts/native/evm-compatibility-ecrecover/utils.js
// SPDX-License-Identifier: Apache-2.0

const { Signature, Wallet } = require('ethers');
const {
  PrivateKey,
  AccountCreateTransaction,
  Hbar,
  ContractCallQuery,
  ContractFunctionParameters,
  AccountUpdateTransaction,
} = require('@hashgraph/sdk');
const hre = require('hardhat');
const { ethers } = hre;
const htsUtils = require('../../hedera-token-service/utils');
const { arrayify } = require('@ethersproject/bytes');

class Utils {
  static sign = async (message, privateKey) => {
    const provider = ethers.getDefaultProvider();
    const signer = new Wallet(privateKey, provider);
    const flatSignature = await signer.signMessage(message);
    return Signature.from(flatSignature);
  };

  static async createAccount(operator, keyType, withAlias) {
    let newPrivateKey;
    switch (keyType) {
      case 'ED25519': {
        newPrivateKey = PrivateKey.generateED25519();
        break;
      }
      case 'ECDSA': {
        newPrivateKey = PrivateKey.generateECDSA();
        break;
      }
      default: {
        throw new Error('Unsupported key type');
      }
    }
    const newPublicKey = newPrivateKey.publicKey;
    if (withAlias) {
      newPublicKey.toAccountId(0, 0);
    }

    const transaction = new AccountCreateTransaction()
      .setKey(newPublicKey)
      .setInitialBalance(new Hbar(20));
    if (withAlias) {
      transaction.setAlias(newPrivateKey.publicKey.toEvmAddress());
    }
    const response = await transaction.execute(operator);
    return {
      accountId: (await response.getReceipt(operator)).accountId,
      privateKey: newPrivateKey,
      accountType: keyType,
    };
  }

  static async deploy() {
    const EcrecoverCheck = await ethers.getContractFactory('EcrecoverCheck');
    try {
      const network = hre.network.name;
      const ecrecoverCheck = await EcrecoverCheck.deploy();
      await ecrecoverCheck.waitForDeployment();
      const address = await ecrecoverCheck.getAddress();
      const contractQuery =
        Utils.getMirrorNodeUrl(network) + '/contracts/' + address;
      let result;
      let cnt = 0;
      while (cnt < 20 && (!result || result.status === 404)) {
        cnt++;
        result = await fetch(contractQuery);
        await new Promise((r) => setTimeout(r, 1000));
      }
      const json = await result.json();
      return json.contract_id;
    } catch (e) {
      return null;
    }
  }

  static QUERY_GAS = 100000;
  static QUERY_HBAR_PAYMENT = 2;

  static getAddressRecoveredFromEcRecover = async (
    contractId,
    client,
    message,
    signature
  ) => {
    const verifySignatureQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(Utils.QUERY_GAS)
      .setFunction(
        'verifySignature',
        new ContractFunctionParameters()
          .addString(message)
          .addUint8(signature.v)
          .addBytes32(arrayify(signature.r))
          .addBytes32(arrayify(signature.s))
      )
      .setQueryPayment(new Hbar(Utils.QUERY_HBAR_PAYMENT));
    const verifySignatureTransaction =
      await verifySignatureQuery.execute(client);
    return verifySignatureTransaction.getAddress();
  };

  static getMsgSenderAddress = async (contractId, client) => {
    const getSenderQuery = new ContractCallQuery()

      .setContractId(contractId)
      .setGas(Utils.QUERY_GAS)
      .setFunction('getSender')
      .setQueryPayment(new Hbar(Utils.QUERY_HBAR_PAYMENT));
    const getSenderTransaction = await getSenderQuery.execute(client);
    return getSenderTransaction.getAddress();
  };

  static async getMsgSenderAndEcRecover(contractId, client, privateKey) {
    const message = 'Test message';
    const addressRecoveredFromEcRecover =
      await Utils.getAddressRecoveredFromEcRecover(
        contractId,
        client,
        message,
        await Utils.sign(message, privateKey)
      );
    const msgSenderFromSmartContract = await Utils.getMsgSenderAddress(
      contractId,
      client
    );
    return { addressRecoveredFromEcRecover, msgSenderFromSmartContract };
  }

  static formatPrivateKey = (pk) => `0x${pk.toStringRaw()}`;

  static async changeAccountKeyType(account, keyType) {
    let newPrivateKey;
    switch (keyType) {
      case 'ED25519': {
        newPrivateKey = PrivateKey.generateED25519();
        break;
      }
      case 'ECDSA': {
        newPrivateKey = PrivateKey.generateECDSA();
        break;
      }
      default: {
        throw new Error('Unsupported key type');
      }
    }
    return await this.changeAccountKey(account, newPrivateKey);
  }

  static async changeAccountKey(account, newPrivateKey) {
    const network = htsUtils.getCurrentNetwork();
    const operatorId = hre.config.networks[network].sdkClient.operatorId;
    const operatorKey = PrivateKey.fromStringDer(
      hre.config.networks[network].sdkClient.operatorKey.replace('0x', '')
    );
    const client = await htsUtils.createSDKClient(operatorId, operatorKey);
    const newPublicKey = newPrivateKey.publicKey;
    const transaction = new AccountUpdateTransaction()
      .setAccountId(account.accountId)
      .setKey(newPublicKey)
      .freezeWith(client);
    let oldPrivateKey = account.privateKey;
    const signTx = await (
      await transaction.sign(oldPrivateKey)
    ).sign(newPrivateKey);
    const submitTx = await signTx.execute(client);
    await submitTx.getReceipt(client);
    return newPrivateKey;
  }

  static getMirrorNodeUrl(network) {
    switch (network) {
      case 'mainnet':
        return 'https://mainnet.mirrornode.hedera.com/api/v1';
      case 'testnet':
        return 'https://testnet.mirrornode.hedera.com/api/v1';
      case 'previewnet':
        return 'https://previewnet.mirrornode.hedera.com/api/v1';
      case 'local':
        return 'http://127.0.0.1:5551/api/v1';
      default:
        throw new Error('Unknown network');
    }
  }
}

module.exports = Utils;
// Filename: test/system-contracts/pseudo-random-number-generator/PrngSystemContract.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('PrngSystemContract Test Suite', function () {
  let prngSystemContract;

  before(async function () {
    const factory = await ethers.getContractFactory(
      Constants.Contract.PrngSystemContract
    );

    prngSystemContract = await factory.deploy();
  });

  it('should be able to execute getPseudorandomSeed to generate a pseudo random seed', async function () {
    const tx = await prngSystemContract.getPseudorandomSeed();
    const txReceipt = await tx.wait();

    const result = txReceipt.logs.filter(
      (e) => e.fragment.name === Constants.Events.PseudoRandomSeed
    )[0].args[0];

    expect(result).to.exist;
    expect(result).to.not.hexEqual(ethers.ZeroHash);
  });
});
// Filename: test/utils.js
// SPDX-License-Identifier: Apache-2.0

const hre = require('hardhat');
const { ethers } = hre;

class Utils {
  static functionSelector(functionNameAndParams) {
    return ethers.keccak256(ethers.toUtf8Bytes(functionNameAndParams))
      .substring(0, 10);
  }

  static to32ByteString(str) {
    return str.toString(16).replace('0x', '').padStart(64, '0');
  };

  static hexToASCII(str) {
    const hex = str.toString();
    let ascii = '';
    for (let n = 0; n < hex.length; n += 2) {
      ascii += String.fromCharCode(parseInt(hex.substring(n, n + 2), 16));
    }
    return ascii;
  };
}

module.exports = Utils;
// Filename: test/wrapped-tokens/WHBAR.js
// SPDX-License-Identifier: Apache-2.0

const chai = require('chai');
const { expect } = require('chai');
const hre = require('hardhat');
const Utils = require('../system-contracts/hedera-token-service/utils');
const chaiAsPromised = require('chai-as-promised');
const { Hbar, TransferTransaction, PrivateKey } = require('@hashgraph/sdk');
const { ethers } = hre;
chai.use(chaiAsPromised);

/**
 * How to run solidity coverage?
 * - change the defaultNetwork in hardhat.config.js to hardhat - defaultNetwork: 'hardhat'
 * - change the ONE_HBAR constant to the proper one
 *     - for solidity-coverage use 1_000_000_000_000_000_000n
 *     - for tests again local node use 100_000_000n
 * - run `npx hardhat coverage --sources wrapped-tokens/WHBAR.sol --testfiles test/wrapped-tokens/WHBAR.js`
 */

// Core constants
const ONE_HBAR = 1n * 100_000_000n;
const WEIBAR_COEF = 10_000_000_000n;
const ONE_HBAR_AS_WEIBAR = ONE_HBAR * WEIBAR_COEF;
const ONE_HBAR_TRUNCATED = '100000000';

// Test constants
const TINY_AMOUNT = 1n;
const TWO_HBAR = ONE_HBAR * 2n;
const THREE_HBAR = ONE_HBAR * 3n;
const FIVE_HBAR = ONE_HBAR * 5n;
const HUNDRED_HBAR = ONE_HBAR * 100n;
const SAMPLE_APPROVE_AMOUNT = 5644n;
const SAMPLE_FALLBACK_DATA = '0x5644aa';
const OVERFLOW_VALUE =
  '0x10000000000000000000000000000000000000000000000000000000000000000';

describe('WHBAR', function () {
  let signers;
  let contract;

  before(async function () {
    signers = await ethers.getSigners();
  });

  it('WHBAR-000 should deploy the WHBAR contract', async function () {
    const contractFactory = await ethers.getContractFactory('WHBAR');
    contract = await contractFactory.deploy();

    await contract.waitForDeployment();
    expect(contract).to.not.be.undefined;
  });

  it('WHBAR-001 should get name', async function () {
    expect(await contract.name()).to.equal('Wrapped HBAR');
  });

  it('WHBAR-002 should get symbol', async function () {
    expect(await contract.symbol()).to.equal('WHBAR');
  });

  it('WHBAR-003 should get decimals', async function () {
    expect(await contract.decimals()).to.equal(8);
  });

  it('WHBAR-004 should not update total supply after CryptoTransfer tx', async function () {
    // initial values for contract's total supply and balance
    const totalSupplyBefore = await contract.totalSupply();
    const balanceBefore = await signers[0].provider.getBalance(contract.target);

    // build a client for fetching signer's id and contract's id dynamically
    const client = await Utils.createSDKClient();
    const signerId = await Utils.getAccountId(signers[0].address, client);
    const contractId = await Utils.getAccountId(contract.target, client);
    client.setOperator(
      signerId,
      PrivateKey.fromStringECDSA(
        (await Utils.getHardhatSignersPrivateKeys(false))[0]
      )
    );

    // send 1 hbar to the contract via CryptoTransfer
    const tx = new TransferTransaction()
      .addHbarTransfer(signerId, Hbar.fromTinybars(Number(ONE_HBAR)).negated())
      .addHbarTransfer(contractId, Hbar.fromTinybars(Number(ONE_HBAR)));
    const txResponse = await tx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    if (receipt.status._code !== 22) {
      throw new Error(
        `Funding tx with id ${txResponse.transactionId.toString()} failed.`
      );
    }

    // wait for the mirror node data population
    await new Promise((r) => setTimeout(r, 3000));

    // get updated contract's total supply and balance
    const totalSupplyAfter = await contract.totalSupply();
    const balanceAfter = await signers[0].provider.getBalance(contract.target);

    // checks
    expect(totalSupplyBefore).to.equal(totalSupplyAfter);
    expect(balanceBefore + ONE_HBAR_AS_WEIBAR).to.equal(balanceAfter);
  });

  it('WHBAR-005 should deposit 1 hbar and check totalSupply', async function () {
    const hbarBalanceBefore = await ethers.provider.getBalance(
      signers[0].address
    );
    const whbarBalanceBefore = await contract.balanceOf(signers[0].address);
    const totalSupplyBefore = await contract.totalSupply();

    const txDeposit = await contract.deposit({
      value: ONE_HBAR_AS_WEIBAR,
    });
    const receiptDeposit = await txDeposit.wait();

    // Verify Deposit event was emitted with correct parameters
    const depositEvents = receiptDeposit.logs.filter(
      (log) => log.fragment && log.fragment.name === 'Deposit'
    );
    expect(depositEvents.length).to.equal(1);
    expect(depositEvents[0].args[0]).to.equal(signers[0].address); // dst
    expect(depositEvents[0].args[1]).to.equal(ONE_HBAR_TRUNCATED); // wad

    const hbarBalanceAfter = await ethers.provider.getBalance(
      signers[0].address
    );
    const whbarBalanceAfter = await contract.balanceOf(signers[0].address);
    const totalSupplyAfter = await contract.totalSupply();

    expect(hbarBalanceBefore - hbarBalanceAfter).to.be.greaterThanOrEqual(
      ONE_HBAR_AS_WEIBAR
    );
    expect(whbarBalanceAfter - whbarBalanceBefore).to.equal(ONE_HBAR);
    expect(totalSupplyBefore + ONE_HBAR).to.equal(totalSupplyAfter);
  });

  it('WHBAR-006 should withdraw 1 hbar and check totalSupply', async function () {
    const txDeposit = await contract.deposit({
      value: ONE_HBAR_AS_WEIBAR,
    });
    await txDeposit.wait();

    const hbarBalanceBefore = await ethers.provider.getBalance(
      signers[0].address
    );
    const whbarBalanceBefore = await contract.balanceOf(signers[0].address);
    const totalSupplyBefore = await contract.totalSupply();

    const txWithdraw = await contract.withdraw(ONE_HBAR);
    const receiptWithdraw = await txWithdraw.wait();

    // Verify Withdrawal event was emitted with correct parameters
    const withdrawalEvents = receiptWithdraw.logs.filter(
      (log) => log.fragment && log.fragment.name === 'Withdrawal'
    );
    expect(withdrawalEvents.length).to.equal(1);
    expect(withdrawalEvents[0].args[0]).to.equal(signers[0].address); // src
    expect(withdrawalEvents[0].args[1]).to.equal(ONE_HBAR); // wad

    const hbarBalanceAfter = await ethers.provider.getBalance(
      signers[0].address
    );
    const whbarBalanceAfter = await contract.balanceOf(signers[0].address);
    const totalSupplyAfter = await contract.totalSupply();

    expect(hbarBalanceBefore - hbarBalanceAfter).to.be.lessThanOrEqual(
      ONE_HBAR_AS_WEIBAR
    );
    expect(whbarBalanceBefore - ONE_HBAR).to.equal(whbarBalanceAfter);
    expect(totalSupplyBefore - ONE_HBAR).to.equal(totalSupplyAfter);
  });

  it('WHBAR-007 should be able to transfer', async function () {
    const receiver = ethers.Wallet.createRandom().address;
    const receiverBalanceBefore = await contract.balanceOf(receiver);

    const txDeposit = await contract.deposit({
      value: ONE_HBAR_AS_WEIBAR,
    });
    await txDeposit.wait();

    const txTransfer = await contract.transfer(receiver, ONE_HBAR);
    const receiptTransfer = await txTransfer.wait();

    // Verify Transfer event was emitted with correct parameters
    const transferEvents = receiptTransfer.logs.filter(
      (log) => log.fragment && log.fragment.name === 'Transfer'
    );
    expect(transferEvents.length).to.equal(1);
    expect(transferEvents[0].args[0]).to.equal(signers[0].address); // src
    expect(transferEvents[0].args[1]).to.equal(receiver); // dst
    expect(transferEvents[0].args[2]).to.equal(ONE_HBAR); // wad

    const receiverBalanceAfter = await contract.balanceOf(receiver);
    expect(receiverBalanceBefore).to.equal(0);
    expect(receiverBalanceAfter).to.equal(ONE_HBAR);
  });

  it('WHBAR-008 should be able to transferFrom', async function () {
    const amount = 1;

    // create a random receiver
    const receiverAddress = ethers.Wallet.createRandom().address;

    // create a new random signer
    const newSigner = ethers.Wallet.createRandom().connect(signers[0].provider);

    // add some balance for gas covering
    await (
      await signers[0].sendTransaction({
        to: newSigner.address,
        value: ONE_HBAR_AS_WEIBAR,
      })
    ).wait();

    // deposit 1 hbar with signer[0]
    await (
      await contract.deposit({
        value: ONE_HBAR_AS_WEIBAR,
      })
    ).wait();

    // approve the newSigner from signer[0]
    const txApprove = await contract.approve(newSigner.address, amount);
    const receiptApprove = await txApprove.wait();

    // Verify Approval event was emitted with correct parameters
    const approvalEvents = receiptApprove.logs.filter(
      (log) => log.fragment && log.fragment.name === 'Approval'
    );
    expect(approvalEvents.length).to.equal(1);
    expect(approvalEvents[0].args[0]).to.equal(signers[0].address); // src
    expect(approvalEvents[0].args[1]).to.equal(newSigner.address); // guy
    expect(approvalEvents[0].args[2]).to.equal(amount); // wad

    // save the balances before
    const allowanceBefore = await contract.allowance(
      signers[0].address,
      newSigner.address
    );
    const receiverBalanceBefore = await contract.balanceOf(receiverAddress);

    // execute transferFrom with newSigner using signers[0] approval
    const contractWithNewSigner = await contract.connect(newSigner);
    const txTransferFrom = await contractWithNewSigner.transferFrom(
      signers[0].address,
      receiverAddress,
      amount
    );
    const receiptTransferFrom = await txTransferFrom.wait();

    // Verify Transfer event was emitted with correct parameters
    const transferEvents = receiptTransferFrom.logs.filter(
      (log) => log.fragment && log.fragment.name === 'Transfer'
    );
    expect(transferEvents.length).to.equal(1);
    expect(transferEvents[0].args[0]).to.equal(signers[0].address); // src
    expect(transferEvents[0].args[1]).to.equal(receiverAddress); // dst
    expect(transferEvents[0].args[2]).to.equal(amount); // wad

    // save the balances after
    const allowanceAfter = await contract.allowance(
      signers[0].address,
      newSigner.address
    );
    const receiverBalanceAfter = await contract.balanceOf(receiverAddress);

    expect(allowanceBefore).to.equal(amount);
    expect(allowanceAfter).to.equal(0);
    expect(receiverBalanceBefore).to.equal(0);
    expect(receiverBalanceAfter).to.equal(amount);
  });

  it('WHBAR-009 should be able to approve', async function () {
    const receiverAddress = ethers.Wallet.createRandom().address;
    const amount = SAMPLE_APPROVE_AMOUNT;

    const txApprove = await contract.approve(receiverAddress, amount);
    const receiptApprove = await txApprove.wait();

    // Verify Approval event was emitted with correct parameters
    const approvalEvents = receiptApprove.logs.filter(
      (log) => log.fragment && log.fragment.name === 'Approval'
    );
    expect(approvalEvents.length).to.equal(1);
    expect(approvalEvents[0].args[0]).to.equal(signers[0].address); // src
    expect(approvalEvents[0].args[1]).to.equal(receiverAddress); // guy
    expect(approvalEvents[0].args[2]).to.equal(amount); // wad

    expect(
      await contract.allowance(signers[0].address, receiverAddress)
    ).to.equal(amount);
  });

  it('WHBAR-010 should be able to deposit via contract`s fallback method', async function () {
    const whbarSigner0Before = await contract.balanceOf(signers[0].address);

    const txFallback = await signers[0].sendTransaction({
      to: contract.target,
      data: SAMPLE_FALLBACK_DATA,
      value: ONE_HBAR_AS_WEIBAR,
    });
    const receiptFallback = await txFallback.wait();

    // Get the Deposit event signature
    const depositEventSignature = 'Deposit(address,uint256)';
    const depositTopic = ethers.id(depositEventSignature);

    // Filter logs by the event signature
    const depositEvents = receiptFallback.logs.filter(
      (log) => log.topics[0] === depositTopic
    );

    expect(depositEvents.length).to.equal(1);

    // Decode the event data
    const decodedData = contract.interface.parseLog({
      topics: depositEvents[0].topics,
      data: depositEvents[0].data,
    });

    expect(decodedData.args[0]).to.equal(signers[0].address); // dst
    expect(decodedData.args[1]).to.equal(ONE_HBAR_TRUNCATED); // wad

    const whbarSigner0After = await contract.balanceOf(signers[0].address);
    expect(whbarSigner0After - whbarSigner0Before).to.equal(ONE_HBAR);
  });

  it('WHBAR-011 should be able to deposit via contract`s receive method', async function () {
    const whbarSigner0Before = await contract.balanceOf(signers[0].address);

    const txReceive = await signers[0].sendTransaction({
      to: contract.target,
      value: ONE_HBAR_AS_WEIBAR,
    });
    const receiptReceive = await txReceive.wait();

    // Get the Deposit event signature
    const depositEventSignature = 'Deposit(address,uint256)';
    const depositTopic = ethers.id(depositEventSignature);

    // Filter logs by the event signature
    const depositEvents = receiptReceive.logs.filter(
      (log) => log.topics[0] === depositTopic
    );

    expect(depositEvents.length).to.equal(1);

    // Decode the event data
    const decodedData = contract.interface.parseLog({
      topics: depositEvents[0].topics,
      data: depositEvents[0].data,
    });

    expect(decodedData.args[0]).to.equal(signers[0].address); // dst
    expect(decodedData.args[1]).to.equal(ONE_HBAR_TRUNCATED); // wad

    const whbarSigner0After = await contract.balanceOf(signers[0].address);
    expect(whbarSigner0After - whbarSigner0Before).to.equal(ONE_HBAR);
  });

  it('WHBAR-012 should throw InsufficientFunds error on withdraw', async function () {
    await expect(contract.withdraw(HUNDRED_HBAR)).to.be.revertedWithCustomError(
      contract,
      `InsufficientFunds`
    );
  });

  it('WHBAR-013 should throw InsufficientFunds error on transferFrom', async function () {
    const receiverAddress = ethers.Wallet.createRandom().address;

    await expect(
      contract.transferFrom(signers[1].address, receiverAddress, HUNDRED_HBAR)
    ).to.be.revertedWithCustomError(contract, `InsufficientFunds`);
  });

  it('WHBAR-014 should throw InsufficientAllowance error on withdraw', async function () {
    const amount = 1;
    const receiverAddress = ethers.Wallet.createRandom().address;
    const newSigner = ethers.Wallet.createRandom().connect(signers[0].provider);

    // add some balance for gas covering
    await (
      await signers[0].sendTransaction({
        to: newSigner.address,
        value: ONE_HBAR_AS_WEIBAR,
      })
    ).wait();

    // deposit 1 hbar with signer[0]
    await (
      await contract.deposit({
        value: ONE_HBAR_AS_WEIBAR,
      })
    ).wait();

    const contractWithNewSigner = await contract.connect(newSigner);
    await expect(
      contractWithNewSigner.transferFrom(
        signers[0].address,
        receiverAddress,
        amount
      )
    ).to.be.revertedWithCustomError(
      contractWithNewSigner,
      `InsufficientAllowance`
    );
  });

  it('WHBAR-015 should throw SendFailed error on withdrawal from a contract with no receive/fallback method', async () => {
    const contractWithoutReceiveFactory =
      await ethers.getContractFactory('Target');
    const contractWithoutReceive = await contractWithoutReceiveFactory.deploy();
    await contractWithoutReceive.waitForDeployment();

    const receiver = contractWithoutReceive.target;
    const receiverBalanceBefore = await contract.balanceOf(receiver);

    const txDeposit = await contract.deposit({
      value: ONE_HBAR_AS_WEIBAR,
    });
    await txDeposit.wait();

    const txTransfer = await contract.transfer(
      contractWithoutReceive,
      ONE_HBAR
    );
    await txTransfer.wait();

    const receiverBalanceAfter = await contract.balanceOf(receiver);
    expect(receiverBalanceBefore).to.equal(0);
    expect(receiverBalanceAfter).to.equal(ONE_HBAR);

    const tryToWithdrawTx = await contractWithoutReceive.tryToWithdraw(
      contract.target,
      ONE_HBAR
    );
    const tryToWithdrawReceipt = await tryToWithdrawTx.wait();

    expect(tryToWithdrawReceipt.logs).to.not.be.empty;
    expect(tryToWithdrawReceipt.logs[0].fragment.name).to.equal(
      'WithdrawResponse'
    );
    // revert with SendFailed()
    expect(tryToWithdrawReceipt.logs[0].args[0]).to.be.false;
    // first 4 bytes of the SendError selector - keccak256("SendFailed()") = 0x81063e51806c3994c498b39c9d9f4124c2e61b7cd154bc84f959aea44d44ce4f
    expect(tryToWithdrawReceipt.logs[0].args[1]).to.equal('0x81063e51');
  });

  it('WHBAR-016 should revert on overflow via transfer', async function () {
    const receiver = ethers.Wallet.createRandom().address;
    const MAX_UINT256 = ethers.MaxUint256;

    const txDeposit = await contract.deposit({
      value: ONE_HBAR_AS_WEIBAR,
    });
    await txDeposit.wait();

    await expect(
      contract.transfer(receiver, OVERFLOW_VALUE)
    ).to.be.rejectedWith('value out-of-bounds');

    // Test with MAX_UINT256 which should revert with InsufficientFunds
    await expect(
      contract.transfer(receiver, MAX_UINT256)
    ).to.be.revertedWithCustomError(contract, 'InsufficientFunds');
  });

  it('WHBAR-017 should revert on overflow via approve', async function () {
    const spender = ethers.Wallet.createRandom().address;
    const MAX_UINT256 = ethers.MaxUint256;

    await expect(contract.approve(spender, OVERFLOW_VALUE)).to.be.rejectedWith(
      'value out-of-bounds'
    );

    // Test with MAX_UINT256 which should work (no overflow in approve)
    await expect(contract.approve(spender, MAX_UINT256)).not.to.be.reverted;
  });

  it('WHBAR-018 should revert on negative value for deposit', async function () {
    await expect(contract.deposit({ value: '-1' })).to.be.rejectedWith(
      'unsigned value cannot be negative'
    );
  });

  it('WHBAR-019 should revert on negative value for withdraw', async function () {
    await expect(contract.withdraw('-1')).to.be.rejectedWith(
      'value out-of-bounds'
    );
  });

  it('WHBAR-020 should revert on negative value for approve', async function () {
    const spender = ethers.Wallet.createRandom().address;

    await expect(contract.approve(spender, '-1')).to.be.rejectedWith(
      'value out-of-bounds'
    );
  });

  it('WHBAR-021 should revert on negative value for transfer', async function () {
    const receiver = ethers.Wallet.createRandom().address;

    await expect(contract.transfer(receiver, '-1')).to.be.rejectedWith(
      'value out-of-bounds'
    );
  });

  it('WHBAR-022 should revert on negative value for transferFrom', async function () {
    const sender = signers[0].address;
    const receiver = ethers.Wallet.createRandom().address;

    await expect(
      contract.transferFrom(sender, receiver, '-1')
    ).to.be.rejectedWith('value out-of-bounds');
  });

  it('WHBAR-023 should revert on value > MaxUint256 for deposit', async function () {
    await expect(
      contract.deposit({ value: OVERFLOW_VALUE })
    ).to.be.rejectedWith('value cannot exceed MAX_INTEGER');
  });

  it('WHBAR-024 should revert on value > MaxUint256 for withdraw', async function () {
    await expect(contract.withdraw(OVERFLOW_VALUE)).to.be.rejectedWith(
      'value out-of-bounds'
    );
  });

  it('WHBAR-025 should revert on value > MaxUint256 for transfer', async function () {
    const receiver = ethers.Wallet.createRandom().address;

    await expect(
      contract.transfer(receiver, OVERFLOW_VALUE)
    ).to.be.rejectedWith('value out-of-bounds');
  });

  it('WHBAR-026 should revert on value > MaxUint256 for approve', async function () {
    const spender = ethers.Wallet.createRandom().address;

    await expect(contract.approve(spender, OVERFLOW_VALUE)).to.be.rejectedWith(
      'value out-of-bounds'
    );
  });

  it('WHBAR-027 should revert on value > MaxUint256 for transferFrom', async function () {
    const sender = signers[0].address;
    const receiver = ethers.Wallet.createRandom().address;

    await expect(
      contract.transferFrom(sender, receiver, OVERFLOW_VALUE)
    ).to.be.rejectedWith('value out-of-bounds');
  });

  it('WHBAR-032 Sending small amount of hbar should work and have the same value on WHBAR', async function () {
    const tinyAmount = TINY_AMOUNT;
    const tinyAmountAsWeibar = tinyAmount * WEIBAR_COEF;

    const initialBalance = await contract.balanceOf(signers[0].address);

    // Deposit the tiny amount and check for Deposit event
    const txDeposit = await contract.deposit({
      value: tinyAmountAsWeibar,
    });
    const receiptDeposit = await txDeposit.wait();
    const depositEvents = receiptDeposit.logs.filter(
      (log) => log.fragment && log.fragment.name === 'Deposit'
    );
    expect(depositEvents.length).to.equal(1);
    expect(depositEvents[0].args[0]).to.equal(signers[0].address); // dst
    expect(depositEvents[0].args[1]).to.equal(1); // wad

    // Check that balance increased by exactly the tiny amount
    const finalBalance = await contract.balanceOf(signers[0].address);
    expect(finalBalance - initialBalance).to.equal(tinyAmount);

    // Verify total supply also increased by the same amount
    const totalSupply = await contract.totalSupply();
    expect(totalSupply).to.be.greaterThanOrEqual(tinyAmount);
  });

  it('WHBAR-033 Multiple depositors can withdraw and transfer up to their own values', async function () {
    const depositors = [signers[1], signers[2], signers[3]];
    const depositAmounts = [TWO_HBAR, FIVE_HBAR, THREE_HBAR];

    const initialBalances = [];
    for (let i = 0; i < depositors.length; i++) {
      initialBalances.push(await contract.balanceOf(depositors[i].address));
    }

    for (let i = 0; i < depositors.length; i++) {
      const txDeposit = await contract.connect(depositors[i]).deposit({
        value: depositAmounts[i] * WEIBAR_COEF,
      });
      const receiptDeposit = await txDeposit.wait();

      // Verify Deposit event was emitted with correct parameters
      const depositEvents = receiptDeposit.logs.filter(
        (log) => log.fragment && log.fragment.name === 'Deposit'
      );
      expect(depositEvents.length).to.equal(1);
      expect(depositEvents[0].args[0]).to.equal(depositors[i].address); // dst
      expect(depositEvents[0].args[1]).to.equal(depositAmounts[i]); // wad

      // Verify balance increased by exactly the deposit amount
      const newBalance = await contract.balanceOf(depositors[i].address);
      expect(newBalance - initialBalances[i]).to.equal(depositAmounts[i]);
    }

    // Test that each depositor can transfer their full amount but not more
    for (let i = 0; i < depositors.length; i++) {
      const recipient = signers[4].address;
      const recipientInitialBalance = await contract.balanceOf(recipient);

      // Transfer the full amount
      const txTransfer = await contract
        .connect(depositors[i])
        .transfer(recipient, depositAmounts[i]);
      const receiptTransfer = await txTransfer.wait();

      // Verify Transfer event was emitted with correct parameters
      const transferEvents = receiptTransfer.logs.filter(
        (log) => log.fragment && log.fragment.name === 'Transfer'
      );
      expect(transferEvents.length).to.equal(1);
      expect(transferEvents[0].args[0]).to.equal(depositors[i].address); // src
      expect(transferEvents[0].args[1]).to.equal(recipient); // dst
      expect(transferEvents[0].args[2]).to.equal(depositAmounts[i]); // wad

      // Verify recipient received the full amount
      const recipientFinalBalance = await contract.balanceOf(recipient);
      expect(recipientFinalBalance - recipientInitialBalance).to.equal(
        depositAmounts[i]
      );

      // Verify depositor's balance is now zero (or back to initial)
      const depositorFinalBalance = await contract.balanceOf(
        depositors[i].address
      );
      expect(depositorFinalBalance).to.equal(initialBalances[i]);

      // Attempt to transfer more should fail
      await expect(
        contract.connect(depositors[i]).transfer(recipient, ONE_HBAR)
      ).to.be.revertedWithCustomError(contract, 'InsufficientFunds');
    }

    // Test that signers[4] can withdraw the received funds
    const signers4Balance = await contract.balanceOf(signers[4].address);
    const ethBalanceBefore = await ethers.provider.getBalance(
      signers[4].address
    );

    // Withdraw all received funds
    const txWithdraw = await contract
      .connect(signers[4])
      .withdraw(signers4Balance);
    const receiptWithdraw = await txWithdraw.wait();

    // Verify Withdrawal event was emitted with correct parameters
    const withdrawalEvents = receiptWithdraw.logs.filter(
      (log) => log.fragment && log.fragment.name === 'Withdrawal'
    );
    expect(withdrawalEvents.length).to.equal(1);
    expect(withdrawalEvents[0].args[0]).to.equal(signers[4].address); // src
    expect(withdrawalEvents[0].args[1]).to.equal(signers4Balance); // wad

    // Verify WHBAR balance is now zero
    expect(await contract.balanceOf(signers[4].address)).to.equal(0);

    // Verify ETH balance increased (minus gas costs)
    const ethBalanceAfter = await ethers.provider.getBalance(
      signers[4].address
    );
    expect(ethBalanceAfter).to.be.greaterThan(ethBalanceBefore);
  });

  it('WHBAR-044 Test that I can transfer to myself', async function () {
    const depositAmount = THREE_HBAR;
    const txDeposit = await contract.deposit({
      value: depositAmount * WEIBAR_COEF,
    });
    const receiptDeposit = await txDeposit.wait();

    // Verify Deposit event was emitted
    const depositEvents = receiptDeposit.logs.filter(
      (log) => log.fragment && log.fragment.name === 'Deposit'
    );
    expect(depositEvents.length).to.equal(1);

    const initialBalance = await contract.balanceOf(signers[0].address);

    const txTransfer = await contract.transfer(signers[0].address, ONE_HBAR);
    const receiptTransfer = await txTransfer.wait();

    // Verify Transfer event was emitted with correct parameters
    const transferEvents = receiptTransfer.logs.filter(
      (log) => log.fragment && log.fragment.name === 'Transfer'
    );
    expect(transferEvents.length).to.equal(1);
    expect(transferEvents[0].args[0]).to.equal(signers[0].address); // src
    expect(transferEvents[0].args[1]).to.equal(signers[0].address); // dst
    expect(transferEvents[0].args[2]).to.equal(ONE_HBAR); // wad

    // Balance should remain unchanged
    const finalBalance = await contract.balanceOf(signers[0].address);
    expect(finalBalance).to.equal(initialBalance);
  });

  it('WHBAR-045 Test that sending with 18 decimals precision truncates correctly', async function () {
    // WHBAR has 8 decimals, but HBAR has 18 decimals in its wei representation
    // When converting between them, the last 10 decimal places should be truncated

    // Create two values that differ only in the last 10 decimal places
    // 1.0 HBAR (clean value)
    const cleanAmount = ethers.parseEther('1.0');

    // 1.000000001234567890 HBAR (with extra precision in positions 9-18)
    const preciseAmount = ethers.parseEther('1.000000001234567890');

    const initialBalance = await contract.balanceOf(signers[0].address);

    const txDeposit = await contract.deposit({
      value: preciseAmount,
    });
    const receiptDeposit = await txDeposit.wait();

    const depositEvents = receiptDeposit.logs.filter(
        (log) => log.fragment && log.fragment.name === 'Deposit'
    );
    expect(depositEvents.length).to.equal(1);
    expect(depositEvents[0].args[0]).to.equal(signers[0].address); // dst
    expect(depositEvents[0].args[1]).to.equal(ONE_HBAR_TRUNCATED); // wad - should be truncated to 8 decimals

    const finalBalance = await contract.balanceOf(signers[0].address);
    const balanceIncrease = finalBalance - initialBalance;

    const expectedIncrease = ONE_HBAR_TRUNCATED;

    expect(balanceIncrease).to.equal(expectedIncrease);

    // Verify that we can withdraw the full amount that was recognized
    const txWithdraw = await contract.withdraw(expectedIncrease);
    const receiptWithdraw = await txWithdraw.wait();

    // Verify Withdrawal event was emitted with correct parameters
    const withdrawalEvents = receiptWithdraw.logs.filter(
        (log) => log.fragment && log.fragment.name === 'Withdrawal'
    );
    expect(withdrawalEvents.length).to.equal(1);
    expect(withdrawalEvents[0].args[0]).to.equal(signers[0].address); // src
    expect(withdrawalEvents[0].args[1]).to.equal(expectedIncrease); // wad

    // Balance should be back to initial
    const balanceAfterWithdraw = await contract.balanceOf(signers[0].address);
    expect(balanceAfterWithdraw).to.equal(initialBalance);
  });

  it('should not be able to transfer WHBAR to the actual WHBAR contract', async () => {
    const txDeposit = await contract.deposit({
      value: ONE_HBAR_AS_WEIBAR
    });
    await txDeposit.wait();

    await expect(contract.transfer(contract.target, ONE_HBAR))
        .to.be.revertedWithCustomError(contract, `SendFailed`);
  });

  it('should not be able to transferFrom WHBAR to the actual WHBAR contract', async () => {
    const amount = 1;

    // create a new random signer
    const newSigner = ethers.Wallet.createRandom().connect(signers[0].provider);

    // add some balance for gas covering
    await (await signers[0].sendTransaction({
      to: newSigner.address,
      value: ONE_HBAR_AS_WEIBAR
    })).wait();

    // deposit 1 hbar with signer[0]
    await (await contract.deposit({
      value: ONE_HBAR_AS_WEIBAR
    })).wait();

    // approve the newSigner from signer[0]
    await (await contract.approve(newSigner.address, amount)).wait();

    // execute transferFrom with newSigner using signers[0] approval
    const contractWithNewSigner = await contract.connect(newSigner);
    await expect(contractWithNewSigner.transferFrom(signers[0].address, contractWithNewSigner.target, amount))
        .to.be.revertedWithCustomError(contractWithNewSigner, `SendFailed`);
  });
});
// Filename: test/yul/bitwise-coverage/Bitwise.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@yulequiv Bitwise Test Suite', () => {
  let bitwiseContract;
  const X = 1;
  const Y = 12;

  before(async () => {
    const bitwiseContractFactory = await ethers.getContractFactory(
      Constants.Contract.Bitwise
    );
    bitwiseContract = await bitwiseContractFactory.deploy();
  });

  it('Should execute not(x)', async () => {
    const result = await bitwiseContract.not(Y);
    expect(result).to.eq(~Y);
  });

  it('Should execute and(x, y)', async () => {
    const result = await bitwiseContract.and(X, Y);
    expect(result).to.eq(X & Y);
  });

  it('Should execute or(x, y)', async () => {
    const result = await bitwiseContract.or(X, Y);
    expect(result).to.eq(X | Y);
  });

  it('Should execute xor(x, y)', async () => {
    const result = await bitwiseContract.xor(X, Y);
    expect(result).to.eq(X ^ Y);
  });

  it('Should execute extractbyteat(n, x)', async () => {
    const DATA = 0x01020304;
    const N = 31; // 32nd byte - since `DATA` is supposed to be a 256-bit (32 bytes) unsigned integer, Solidity will convert the `DATA` to bytes32 by padding 0s in front of the actual data
    const EXPECTED_RESULT = 4; // last byte

    const result = await bitwiseContract.extractbyteat(N, DATA);

    expect(result).to.eq(EXPECTED_RESULT);
  });

  it('Should execute shl(x, y)', async () => {
    const result = await bitwiseContract.shl(X, Y);
    expect(result).to.eq(Y << X);
  });

  it('Should execute shr(x, y)', async () => {
    const result = await bitwiseContract.shr(X, Y);
    expect(result).to.eq(Y >> X);
  });

  it('Should execute sar(x, y)', async () => {
    const SX = -3;
    const SY = -9;
    const result = await bitwiseContract.sar(SX, SY);
    expect(result).to.eq(SY >> SX);
  });
});
// Filename: test/yul/contract-caller/ContractCaller.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@yulequiv Contract Caller Test Suite', async () => {
  let contractCaller, targetContract, getCountEncodedSig, setCountEncodedSig;
  const COUNT_A = 3;
  const GAS = 1_000_000;
  const INITIAL_COUNT = 9;

  beforeEach(async () => {
    // deploy contracts
    const contractCallerFactory = await ethers.getContractFactory(
      Constants.Contract.ContractCaller
    );
    const targetContractFactory = await ethers.getContractFactory(
      Constants.Contract.TargetContract
    );
    contractCaller = await contractCallerFactory.deploy();
    targetContract = await targetContractFactory.deploy(INITIAL_COUNT);

    // prepare encoded function signatures
    getCountEncodedSig =
      targetContract.interface.encodeFunctionData('getCount()');

    setCountEncodedSig = targetContract.interface.encodeFunctionData(
      'setCount(uint256)',
      [COUNT_A]
    );
  });

  it('Should execute call(g, a, v, in, insize, out, outsize)', async () => {
    // prepare transactions
    const callSetCountTx = await contractCaller.call(
      GAS,
      await targetContract.getAddress(),
      setCountEncodedSig
    );
    const callGetCountTx = await contractCaller.call(
      GAS,
      await targetContract.getAddress(),
      getCountEncodedSig
    );

    // wait for the receipts
    const callSetCountReceipt = await callSetCountTx.wait();
    const callGetCountReceipt = await callGetCountTx.wait();

    // extract events
    const [callSetCountResult] = callSetCountReceipt.logs.map(
      (e) => e.fragment.name === 'CallResult' && e
    )[0].args;
    const [callGetCountResult] = callGetCountReceipt.logs.map(
      (e) => e.fragment.name === 'CallResult' && e
    )[0].args;
    const [callGetCountReturnedData] = callGetCountReceipt.logs.map(
      (e) => e.fragment.name === 'CallReturnedData' && e
    )[1].args;

    // assertion
    expect(callSetCountResult).to.be.true;
    expect(callGetCountResult).to.be.true;
    expect(callGetCountReturnedData).to.eq(COUNT_A);
  });

  it('Should execute staticcall(g, a, in, insize, out, outsize)', async () => {
    // prepare transactions
    const callGetCountTx = await contractCaller.staticcall(
      GAS,
      await targetContract.getAddress(),
      getCountEncodedSig
    );

    // wait for the receipts
    const callGetCountReceipt = await callGetCountTx.wait();

    // extract events
    const [callGetCountResult] = callGetCountReceipt.logs.map(
      (e) => e.fragment.name === 'CallResult' && e
    )[0].args;
    const [callGetCountReturnedData] = callGetCountReceipt.logs.map(
      (e) => e.fragment.name === 'CallReturnedData' && e
    )[1].args;

    // assertion
    expect(callGetCountResult).to.be.true;
    expect(callGetCountReturnedData).to.eq(INITIAL_COUNT);
  });

  it('Should execute callcode(g, a, v, in, insize, out, outsize)', async () => {
    // prepare transactions
    const callSetCountTx = await contractCaller.callCode(
      GAS,
      await targetContract.getAddress(),
      setCountEncodedSig
    );

    // wait for the receipts
    const callSetCountReceipt = await callSetCountTx.wait();

    // extract events
    const [callSetCountResult] = callSetCountReceipt.logs.map(
      (e) => e.fragment.name === 'CallResult' && e
    )[0].args;

    // get storage count within ContractCaller contract
    const storageCount = await contractCaller.count();

    // @notice since callcode use the code from `targetContract` to update `ContractCaller` contract
    //          => `storageCount` is expected to equal `COUNT_A`
    expect(storageCount).to.eq(COUNT_A);
    expect(callSetCountResult).to.be.true;
  });

  it('Should execute delegatecall(g, a, in, insize, out, outsize)', async () => {
    // prepare transactions
    const callSetCountTx = await contractCaller.delegateCall(
      GAS,
      await targetContract.getAddress(),
      setCountEncodedSig
    );

    // wait for the receipts
    const callSetCountReceipt = await callSetCountTx.wait();

    // extract events
    const [callSetCountResult] = callSetCountReceipt.logs.map(
      (e) => e.fragment.name === 'CallResult' && e
    )[0].args;

    // get storage count within ContractCaller contract
    const storageCount = await contractCaller.count();

    // @notice since callcode use the code from `targetContract` to update `ContractCaller` contract
    //          => `storageCount` is expected to equal `COUNT_A`
    expect(storageCount).to.eq(COUNT_A);
    expect(callSetCountResult).to.be.true;
  });
});
// Filename: test/yul/contract-creator/ContractCreator.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@yulequiv Contract Creator Test Suite', async () => {
  let contractCreator, signers;
  const EXPECTED_COUNT = 3;
  const TARGET_CONTRACT_BYTECODE =
    '0x608060405234801561000f575f80fd5b506101438061001d5f395ff3fe608060405234801561000f575f80fd5b5060043610610034575f3560e01c8063a87d942c14610038578063d14e62b814610056575b5f80fd5b610040610072565b60405161004d919061009b565b60405180910390f35b610070600480360381019061006b91906100e2565b61007a565b005b5f8054905090565b805f8190555050565b5f819050919050565b61009581610083565b82525050565b5f6020820190506100ae5f83018461008c565b92915050565b5f80fd5b6100c181610083565b81146100cb575f80fd5b50565b5f813590506100dc816100b8565b92915050565b5f602082840312156100f7576100f66100b4565b5b5f610104848285016100ce565b9150509291505056fea2646970667358221220af7141ab23a3458b57b18949d542040e5d9b03df8e389b9ab7b04d1780386cc564736f6c63430008140033';

  const TARGET_CONTRACT_INTERFACE = [
    {
      inputs: [],
      name: 'getCount',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: '_number',
          type: 'uint256',
        },
      ],
      name: 'setCount',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ];

  before(async () => {
    signers = await ethers.getSigners();
    const contractCreatorFactory = await ethers.getContractFactory(
      Constants.Contract.ContractCreator
    );
    contractCreator = await contractCreatorFactory.deploy();
  });

  it('Should create a new contract using create(v, p, n)', async () => {
    // prepare createNewContract transaction
    const transaction = await contractCreator.createNewContract(
      TARGET_CONTRACT_BYTECODE
    );

    // wait for the receipt
    const receipt = await transaction.wait();

    // extract newContractAddress from event logs
    const [newContractAddress] = receipt.logs.map(
      (e) => e.fragment.name === 'NewContractCreated' && e
    )[0].args;

    // assert newContractAddress is valid
    expect(ethers.isAddress(newContractAddress)).to.be.true;

    // connect to target contract at the new created contract address
    const targetContract = new ethers.Contract(
      newContractAddress,
      TARGET_CONTRACT_INTERFACE,
      signers[0]
    );

    // interact with the target contract
    await targetContract.setCount(EXPECTED_COUNT);
    const count = await targetContract.getCount();

    // assertion
    expect(count).to.eq(EXPECTED_COUNT);
  });

  it('Should create a new contract using create2(v, p, n, s)', async () => {
    // random 256-bit salt
    const SALT = 36;

    // prepare create2NewContract transaction
    const transaction = await contractCreator.create2NewContract(
      TARGET_CONTRACT_BYTECODE,
      SALT
    );

    // wait for the receipt
    const receipt = await transaction.wait();

    // extract newContractAddress from event logs
    const [newContractAddress] = receipt.logs.map(
      (e) => e.fragment.name === 'NewContractCreated' && e
    )[0].args;

    // assert newContractAddress is valid
    expect(ethers.isAddress(newContractAddress)).to.be.true;

    // connect to target contract at the new created contract address
    const targetContract = new ethers.Contract(
      newContractAddress,
      TARGET_CONTRACT_INTERFACE,
      signers[0]
    );

    // interact with the target contract
    await targetContract.setCount(EXPECTED_COUNT);
    const count = await targetContract.getCount();

    // assertion
    expect(count).to.eq(EXPECTED_COUNT);
  });
});
// Filename: test/yul/data-allocation/DataAllocation.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@yulequiv Data Allocation Test Suite', () => {
  let dataAllocationContract;
  const P = 32;
  const V = 72;
  const SLOT_0_KEY = 0;
  const SLOT_1_KEY = 1;

  before(async () => {
    const dataAllocationContractFactory = await ethers.getContractFactory(
      Constants.Contract.DataAllocation
    );

    dataAllocationContract = await dataAllocationContractFactory.deploy();
  });

  it('Should execute allocateMemory', async () => {
    const result = await dataAllocationContract.allocateMemory(P, V);

    expect(result).to.eq(V);
  });

  it('Should execute allocateMemory8', async () => {
    const result = await dataAllocationContract.allocateMemory8(P, V);

    expect(result).to.eq(V);
  });

  it('Should execute sload', async () => {
    const EXPECTED_SLOT_0_VALUE = 0; // state variable `a`
    const EXPECTED_SLOT_1_VALUE = 12; // state variable `b`

    const result0 = await dataAllocationContract.sload(SLOT_0_KEY);
    const result1 = await dataAllocationContract.sload(SLOT_1_KEY);

    expect(result0).to.eq(EXPECTED_SLOT_0_VALUE);
    expect(result1).to.eq(EXPECTED_SLOT_1_VALUE);
  });

  it('Should execute sstore', async () => {
    await (await dataAllocationContract.sstore(SLOT_0_KEY, V)).wait();

    const result = await dataAllocationContract.sload(SLOT_0_KEY);

    expect(result).to.eq(V);
  });
});
// Filename: test/yul/math-coverage/MathCoverage.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@yulequiv Math Test Suite', () => {
  let mathCoverageContract;
  const X = 6;
  const SX = -6;
  const Y = 3;
  const SY = -3;
  const M = 2;

  before(async () => {
    const mathConverageContractFactory = await ethers.getContractFactory(
      Constants.Contract.MathCoverage
    );

    mathCoverageContract = await mathConverageContractFactory.deploy();
  });

  it('Should execute add(x, y)', async () => {
    const result = await mathCoverageContract.add(X, Y);

    expect(result).to.eq(X + Y);
  });

  it('Should execute sub(x, y)', async () => {
    const result = await mathCoverageContract.sub(X, Y);

    expect(result).to.eq(X - Y);
  });

  it('Should execute mul(x, y)', async () => {
    const result = await mathCoverageContract.mul(X, Y);

    expect(result).to.eq(X * Y);
  });

  it('Should execute div(x, y)', async () => {
    const result = await mathCoverageContract.div(X, Y);
    const zeroResult = await mathCoverageContract.div(X, 0);

    expect(result).to.eq(X / Y);
    expect(zeroResult).to.eq(0);
  });

  it('Should execute sdiv(x, y)', async () => {
    const result = await mathCoverageContract.sdiv(SX, SY);
    const zeroResult = await mathCoverageContract.sdiv(SX, 0);

    expect(result).to.eq(SX / SY);
    expect(zeroResult).to.eq(0);
  });

  it('Should execute mod(x, y)', async () => {
    const result = await mathCoverageContract.mod(X, Y);

    expect(result).to.eq(X % Y);
  });

  it('Should execute smod(x, y)', async () => {
    const result = await mathCoverageContract.smod(SX, SY);

    expect(result).to.eq(SX % SY);
  });

  it('Should execute exp(x, y)', async () => {
    const result = await mathCoverageContract.exp(X, Y);

    expect(result).to.eq(X ** Y);
  });

  it('Should execute lt(x, y)', async () => {
    const result = await mathCoverageContract.lt(X, Y);

    expect(result).to.eq(X < Y ? 1 : 0);
  });

  it('Should execute gt(x, y)', async () => {
    const result = await mathCoverageContract.gt(X, Y);

    expect(result).to.eq(X > Y ? 1 : 0);
  });

  it('Should execute slt(x, y)', async () => {
    const result = await mathCoverageContract.slt(SX, SY);

    expect(result).to.eq(SX < SY ? 1 : 0);
  });

  it('Should execute sgt(x, y)', async () => {
    const result = await mathCoverageContract.sgt(SX, SY);

    expect(result).to.eq(SX > SY ? 1 : 0);
  });

  it('Should execute eq(x, y)', async () => {
    const truthResult = await mathCoverageContract.eq(X, X);
    const falsyResult = await mathCoverageContract.eq(X, Y);

    expect(truthResult).to.eq(1);
    expect(falsyResult).to.eq(X === Y ? 1 : 0);
  });

  it('Should execute iszero(x, y)', async () => {
    const result = await mathCoverageContract.iszero(X);

    expect(result).to.eq(result === 0 ? 1 : 0);
  });

  it('Should execute addMod(x, y)', async () => {
    const result = await mathCoverageContract.addMod(X, Y, M);

    expect(result).to.eq((X + Y) % M);
  });

  it('Should execute mulMod(x, y)', async () => {
    const result = await mathCoverageContract.mulMod(X, Y, M);

    expect(result).to.eq((X * Y) % M);
  });
});
// Filename: test/yul/transaction-information/TransactionInfo.js
// SPDX-License-Identifier: Apache-2.0

const { expect } = require('chai');
const { ethers } = require('hardhat');
const Constants = require('../../constants');

describe('@yulequiv TransactionInfo Test Suite', () => {
  let transactionInfoContract, signers;
  const GASLIMIT = 1000000;
  const INITIAL_BALANCE = 30000000000;
  const tinybarToWeibarCoef = 10_000_000_000;

  before(async () => {
    signers = await ethers.getSigners();
    const transactionInfoContractFactory = await ethers.getContractFactory(
      Constants.Contract.TransactionInfo
    );
    transactionInfoContract = await transactionInfoContractFactory.deploy({
      value: INITIAL_BALANCE,
      gasLimit: GASLIMIT,
    });
  });

  it('Should deploy with a call value', async () => {
    const intialBalance = await ethers.provider.getBalance(
      await transactionInfoContract.getAddress()
    );

    expect(intialBalance).to.eq(INITIAL_BALANCE);
  });

  it('Should get the gas left', async () => {
    const result = await transactionInfoContract.getGasLeft();

    expect(result).to.gt(0);
  });

  it('Should get contract address', async () => {
    const expectedContractAddress = await transactionInfoContract.getAddress();
    const result = await transactionInfoContract.getContractAddress();

    expect(result).to.eq(expectedContractAddress);
  });

  it('Should get contract balance', async () => {
    const expectedSignerABalance = Math.round(
      parseInt(
        (await ethers.provider.getBalance(signers[0].address)) /
          BigInt(tinybarToWeibarCoef)
      )
    );

    const result = await transactionInfoContract.getBalance(
      await signers[0].getAddress()
    );

    expect(result).to.eq(expectedSignerABalance);
  });

  it('Should get self balance', async () => {
    const expectedSelfBalance = Math.round(
      INITIAL_BALANCE / tinybarToWeibarCoef
    );
    const result = await transactionInfoContract.getSelfBalance();

    expect(result).to.eq(expectedSelfBalance);
  });

  it('Should get message caller', async () => {
    const expectedMessageCaller = signers[0].address;

    const result = await transactionInfoContract.getMsgCaller();

    expect(result).to.eq(expectedMessageCaller);
  });

  it('Should get message call value', async () => {
    const expectedValue = 10_000_000_000;

    const transaction = await transactionInfoContract.getCallValue({
      value: expectedValue,
    });
    const receipt = await transaction.wait();

    const event = receipt.logs.map(
      (e) => e.fragment.name === 'CallValue' && e
    )[0];

    const [messageValue] = event.args;

    expect(messageValue).to.eq(expectedValue / tinybarToWeibarCoef);
  });

  it('Should get message call data', async () => {
    const index = 2;
    const functionSig = 'getCallDataLoad(uint256)';
    const callData = transactionInfoContract.interface
      .encodeFunctionData(functionSig, [index])
      .replace('0x', '');

    // @notice since transactionInfoContract.getCallDataLoad() returns the msg.calldata from memory offset `index`,
    //         `bytes32CallData` also needs to dynamically truncate itself based on `index`
    const expectedBytes32CallData =
      `0x` + callData.slice(index * 2, 64 + index * 2);

    const result = await transactionInfoContract.getCallDataLoad(index);

    expect(result).to.eq(expectedBytes32CallData);
  });

  it('Should get the size of message call data', async () => {
    const messagecallData = await transactionInfoContract.getCallDataLoad(0);
    const callDataBytesArraay = ethers.getBytes(messagecallData);
    const significantBytesLength = callDataBytesArraay.reduce(
      (length, byte) => {
        if (byte !== 0) {
          return (length += 1);
        } else {
          return length;
        }
      },
      0
    );

    const result = await transactionInfoContract.getCallDataSize();

    expect(result).to.eq(significantBytesLength);
  });

  it('Should copy message call data to memory', async () => {
    const dataPosF = 0;
    const memPosT = 0x20;
    const bytesAmountS = 4; // max amount
    const functionSig = 'callDataCopier(uint256, uint256, uint256)';

    const messageCallData = transactionInfoContract.interface
      .encodeFunctionData(functionSig, [memPosT, dataPosF, bytesAmountS])
      .replace('0x', '');

    const bytes32MessageCallData =
      '0x' + messageCallData.slice(dataPosF * 2, 64 + dataPosF * 2);

    const result = await transactionInfoContract.callDataCopier(
      memPosT,
      dataPosF,
      bytesAmountS
    );

    expect(result).to.eq(bytes32MessageCallData);
  });

  it('Should get current chainID', async () => {
    const chainId = await transactionInfoContract.getChainId();
    const expectedChainId = (await ethers.provider.getNetwork()).chainId;

    expect(chainId).to.eq(expectedChainId);
  });

  it('Should get original sender', async () => {
    const originalSender = await transactionInfoContract.getOrigin();
    const expectedSender = await signers[0].getAddress();

    expect(originalSender).to.eq(expectedSender);
  });

  it('Should get gas price', async () => {
    const gasPrice = await transactionInfoContract.getGasPrice();

    expect(gasPrice).to.eq(71);
  });

  it('Should get coinbase', async () => {
    const coinbase = await transactionInfoContract.getCoinbase();

    expect(ethers.isAddress(coinbase)).to.be.true;
  });

  it('Should get current block timestamp', async () => {
    const blockTimestamp = await transactionInfoContract.getTimestamp();

    const expectedTimeStamp = Math.floor(Date.now() / 1000);

    expect(blockTimestamp).to.lte(expectedTimeStamp);
  });

  it('Should get current block number', async () => {
    const currentBlockNumber =
      await transactionInfoContract.getCurrentBlockNumber();

    expect(currentBlockNumber).to.gt(0);
  });

  it('Should get gas limit', async () => {
    const gasLimit = await transactionInfoContract.getGasLimit({
      gasLimit: GASLIMIT,
    });

    expect(gasLimit).to.eq(GASLIMIT);
  });
});
// Filename: tools/custom/sevm/analyze.js
#!/usr/bin/env node

import c from 'chalk';
import * as fs from 'fs';
import { Contract, Shanghai, sol } from 'sevm';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const info = (message, ...optionalParams) => console.info(c.dim('[info]'), message, ...optionalParams);

const name = 'testnet';

/**
 * @param {sqlite3.Database} db
 * @param {string} code 
 * @param {string} hash 
 * @param {string} path 
 */
async function analyze(db, code, hash, path) {
    const row = await db.get('SELECT address FROM contracts WHERE hash = ?', hash);
    const contractAddress = row?.address;

    try {
        new Contract(code, new class extends Shanghai {
            STATICCALL = (state) => {
                super.STATICCALL(state);
                const call = state.stack.top;
                const address = call.address.eval();
                if (address.tag === 'Val') {
                    console.log(contractAddress, '0x' + address.val.toString(16), path, sol`${call.eval()}`)
                }
            };

            CALL = (state) => {
                super.CALL(state);
                const call = state.stack.top;
                const address = call.address.eval();
                if (address.tag === 'Val') {
                    console.log(contractAddress, '0x' + address.val.toString(16), path, sol`${call.eval()}`)
                }
            };

            DELEGATECALL = (state) => {
                super.DELEGATECALL(state);
                const call = state.stack.top;
                const address = call.address.eval();
                if (address.tag === 'Val') {
                    console.log(contractAddress, '0x' + address.val.toString(16), path, sol`${call.eval()}`)
                }
            };
        }());
    } catch (err) {
        console.info(path, err);
    }
}

const shortened = hash => hash.slice(0, 8) + '[..]' + hash.slice(-6);

async function main() {
    const dbname = `${name}.sqlite`;
    info('Opening db', c.magenta(dbname));

    const db = await open({
        filename: dbname,
        driver: sqlite3.Database
    });

    let prefixes = process.argv.slice(2);
    prefixes = prefixes.length === 0 ? fs.readdirSync(`.${name}`) : prefixes;

    for (const prefix of prefixes) {
        // process.stdout.write(`${c.dim(prefix)} `);
        for (const file of fs.readdirSync(`.${name}/${prefix}`)) {
            const path = `.${name}/${prefix}/${file}`;
            // console.info(`Running ${c.cyan('sevm')} analysis on ${c.magenta(file.slice(0, 8) + '..' + file.slice(-9 - 6))}`);
            const code = fs.readFileSync(path, 'utf8');

            if (code === '0x') {
                continue;
            }

            const [hash, ext] = file.split('.');
            const shortenedPath = `.${name}/${prefix}/${shortened(hash)}.${ext}`
            await analyze(db, code, hash, shortenedPath);
        }
    }
}

main().catch(console.error);
// Filename: tools/custom/sevm/fetch.js
#!/usr/bin/env node

import c from 'chalk';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';
import { keccak256 } from 'ethers';
import { mkdir, writeFile } from 'fs/promises';

const name = 'testnet';

const info = (message, ...optionalParams) => console.info(c.dim('[info]'), message, ...optionalParams);

/**
 * 
 * @param {sqlite3.Database} db
 * @param {string} contract_id
 * @param {string} address
 */
async function fetchCode(db, contract_id, address) {
    const { bytecode: content } = await (await fetch(`https://testnet.mirrornode.hedera.com/api/v1/contracts/${address}`)).json();

    const hash = keccak256(content);

    await Promise.all([
        writeFile(path.join(`.${name}`, hash.slice(2, 4), hash + '.bytecode'), content, 'utf8'),
        db.run('INSERT INTO contracts (address, contract_id, hash, size) VALUES ($address, $contract_id, $hash, $size)', {
            $address: address,
            $contract_id: contract_id,
            $hash: hash,
            $size: content.length,
        })
    ]);
}

async function main() {
    const dbname = `${name}.sqlite`;

    info('Opening db', c.magenta(dbname));
    const db = await open({
        filename: dbname,
        driver: sqlite3.Database
    });

    await db.exec('CREATE TABLE IF NOT EXISTS contracts (address TEXT PRIMARY KEY ON CONFLICT REPLACE, contract_id TEXT NOT NULL, hash TEXT NOT NULL, size INTEGER NOT NULL) STRICT');

    info(`Creating directory prefixes under ${c.magenta('.' + name)}`);
    for (let i = 0; i < 256; i++) {
        const prefix = i.toString(16).padStart(2, '0');
        await mkdir(path.join(`.${name}`, prefix), { recursive: true });
    }

    const row = await db.get('SELECT MIN(contract_id) AS contract_id FROM contracts');
    const params = row.contract_id ? `&contract.id=lt:${row.contract_id}` : '';

    let next = `https://${name}.mirrornode.hedera.com/api/v1/contracts?limit=100&order=desc${params}`;
    for (let i = 0; i < 20; i++) {
        info(`Using URL \`${next}\` to fetch the next contracts`)
        let { contracts, links } = await (await fetch(next)).json();
        for (const contract of contracts) {
            info(`Fetching code ${contract.contract_id}:${contract.evm_address}`)
            await fetchCode(db, contract.contract_id, contract.evm_address);
        }

        next = `https://${name}.mirrornode.hedera.com${links.next}`;
    }
}

main().catch(console.error);
// Filename: tools/erc-repository-indexer/erc-contract-indexer/jest.config.js
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'], // Ignore these folders
  moduleFileExtensions: ['ts', 'js', 'json', 'node'], // File extensions to be considered
  transform: {
    '^.+\\.ts$': 'ts-jest', // Transform TypeScript files
  },
};
// Filename: utils/constants.js
// SPDX-License-Identifier: Apache-2.0

require('dotenv').config();
const { ethers } = require('ethers');

/**  @type string */
const OPERATOR_ID_A = process.env.OPERATOR_ID_A
  ? process.env.OPERATOR_ID_A
  : '0.0.0';

/**  @type string */
const OPERATOR_KEY_A = process.env.OPERATOR_KEY_A
  ? process.env.OPERATOR_KEY_A
  : ethers.ZeroHash;

const PRIVATE_KEYS = process.env.PRIVATE_KEYS
  ? process.env.PRIVATE_KEYS.split(',').map((key) => key.trim())
  : [];

const NETWORKS = {
  local: {
    name: 'local',
    url: 'http://localhost:7546',
    chainId: 298,
    networkNodeUrl: '127.0.0.1:50211',
    nodeId: '3',
    mirrorNode: 'http://127.0.0.1:5600',
  },
  testnet: {
    name: 'testnet',
    url: 'https://testnet.hashio.io/api',
    chainId: 296,
    networkNodeUrl: '0.testnet.hedera.com:50211', // https://docs.hedera.com/hedera/networks/testnet/testnet-nodes
    nodeId: '3',
    mirrorNode: 'testnet.mirrornode.hedera.com:443', // https://docs.hedera.com/hedera/core-concepts/mirror-nodes/hedera-mirror-node#testnet
  },
  previewnet: {
    name: 'previewnet',
    url: 'https://previewnet.hashio.io/api',
    chainId: 297,
    networkNodeUrl: '0.previewnet.hedera.com:50211', // https://docs.hedera.com/hedera/networks/testnet/testnet-nodes#preview-testnet-nodes
    nodeId: '3',
    mirrorNode: 'previewnet.mirrornode.hedera.com:443', // https://docs.hedera.com/hedera/core-concepts/mirror-nodes/hedera-mirror-node#previewnet
  },
  besu: {
    name: 'besu_local',
    url: 'http://127.0.0.1:8540',
    chainId: 1337,
    allowUnlimitedContractSize: true,
    blockGasLimit: 0x1fffffffffffff,
    gas: 1_000_000_000,
    timeout: 60_000,
  },
};

module.exports = {
  OPERATOR_ID_A,
  OPERATOR_KEY_A,
  PRIVATE_KEYS,
  NETWORKS,
};
// Filename: utils/helpers.js
// SPDX-License-Identifier: Apache-2.0

require('dotenv').config();
const Constants = require('../test/constants');

const delay = (ms) => {
  return new Promise((resolve) =>
    setTimeout(resolve, ms || process.env.RETRY_DELAY || 2000)
  );
};

const getBalance = async (erc20Contract, tokenAddress, signersAddress) => {
  const balance = await erc20Contract.balanceOf(tokenAddress, signersAddress);
  return balance;
};

/**
 * @param {*} proxyContract
 * @returns counter  - the count value on the proxyContract
 */
const getCount = async (proxyContract) => {
  const counter = await proxyContract.count();
  return counter;
};

const getSignerBalance = async (provider, signersAddress) => {
  const balance = await provider.getBalance(signersAddress);
  return balance;
};

// Transaction needs to be propagated to the mirror node
const pauseAndPoll = async (ERC20Pausable) => {
  await ERC20Pausable.pause();

  for (
    let numberOfTries = 0;
    numberOfTries <= process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const isPaused = await ERC20Pausable.paused();

    if (isPaused) {
      return true; // Paused
    }

    await delay(); // Delay before the next attempt
  }

  return false; // Not paused
};

const pollForLastEvent = async (contract) => {
  for (
    let numberOfTries = 0;
    numberOfTries <= process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const event = contract.logs.filter(
      (e) => e.fragment.name === Constants.Events.ResponseCode
    )[0].args[0];
    if (event._hex !== undefined && event._hex !== null) {
      return parseInt(event._hex);
    }
  }

  throw new Error(
    `Failed to get an event after ${process.env.MAX_RETRY} tries`
  );
};

const pollForERC20BurnableChangedSupply = async (
  ERC20Burnable,
  initialSupply
) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const newSupply = await ERC20Burnable.totalSupply();

    if (newSupply !== initialSupply) {
      return newSupply; // Supply changed and not zero
    }

    await delay(); // Delay before the next attempt
  }

  throw new Error(
    `Failed to get a different supply value after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewCounterValue = async (proxyContract, counterBefore) => {
  let counterAfter,
    numberOfTries = 0;

  while (numberOfTries < process.env.MAX_RETRY) {
    counterAfter = await proxyContract.count();

    if (counterAfter !== counterBefore) {
      return counterAfter;
    }

    numberOfTries++;
    await delay(); // Delay before the next attempt
  }

  throw new Error(
    `proxyContract.count failed to get a different value after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewERC721Owner = async (erc721Contract, tokenId, ownerBefore) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const ownerAfter = await erc721Contract.ownerOf(tokenId);

    if (ownerAfter !== ownerBefore) {
      return ownerAfter; // Ownership changed
    }

    await delay();
  }

  throw new Error(
    `Ownership did not change after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewERC721Balance = async (
  erc721Contract,
  nftTokenAddress,
  signersAddress,
  balanceBefore
) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const balanceAfter = await erc721Contract.balanceOf(
      nftTokenAddress,
      signersAddress
    );

    if (balanceAfter !== balanceBefore) {
      return balanceAfter; // Balance changed
    }

    await delay(); // Delay before the next attempt
  }

  throw new Error(
    `erc721Contract.balanceOf failed to get a different value after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewERC721HollowWalletOwner = async (
  erc721Contract,
  nftTokenAddress,
  ownerBefore
) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const ownerAfter = await erc721Contract.ownerOf(nftTokenAddress);

    if (ownerAfter !== ownerBefore) {
      return ownerAfter; // Ownership changed
    }

    await delay();
  }

  throw new Error(
    `Ownership did not change after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewWalletBalance = async (
  erc20Contract,
  tokenAddress,
  signersAddress,
  balanceBefore
) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const balanceAfter = await erc20Contract.balanceOf(
      tokenAddress,
      signersAddress
    );

    if (balanceAfter !== 0 && balanceAfter !== balanceBefore) {
      return balanceAfter; // Balance changed and not zero
    }

    await delay(); // Delay before the next attempt
  }

  throw new Error(
    `Failed to get a different balance value after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewHollowWalletBalance = async (
  provider,
  walletAddress,
  balanceBefore
) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const balanceAfter = await provider.getBalance(walletAddress);

    if (balanceAfter !== balanceBefore) {
      return balanceAfter; // Balance changed
    }

    await delay();
  }

  throw new Error(
    `Failed to get a different balance value after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewBalance = async (
  IERC20,
  contractAddress,
  tokenCreateBalanceBefore
) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const balanceAfter = await IERC20.balanceOf(contractAddress);

    if (balanceAfter !== 0 && balanceAfter !== tokenCreateBalanceBefore) {
      return balanceAfter; // Balance changed and not null
    }

    await delay(); // Delay before the next attempt
  }
  console.log('----');

  throw new Error(
    `Failed to get a different balance value after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewERC20Balance = async (
  erc20Contract,
  tokenAddress,
  signersAddress,
  balanceBefore
) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    try {
      const balanceAfter = await getBalance(
        erc20Contract,
        tokenAddress,
        signersAddress
      );
      if (balanceAfter !== balanceBefore) {
        return balanceAfter;
      }
    } catch (error) {
      // Handle errors from erc20Contract.balanceOf
      console.error(`Error fetching balance: ${error.message}`);
    }

    await delay();
  }

  throw new Error(
    `Failed to get a different value after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewHBarBalance = async (
  provider,
  signers0BeforeHbarBalance,
  signer1AccountID
) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const signers0AfterHbarBalance = await provider.getBalance(
      signer1AccountID
    );

    if (signers0AfterHbarBalance !== signers0BeforeHbarBalance) {
      return signers0AfterHbarBalance;
    }

    await delay();
  }

  throw new Error(
    `Failed to get a different balance after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewSignerBalance = async (
  IERC20Contract,
  signersAddress,
  signerBefore
) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const signerAfter = await IERC20Contract.balanceOf(signersAddress);

    if (signerAfter !== signerBefore) {
      return signerAfter; // Balance changed and not null
    }

    await delay(); // Delay before the next attempt
  }

  throw new Error(
    `Failed to get a different balance value after ${process.env.MAX_RETRY} tries`
  );
};

const pollForNewSignerBalanceUsingProvider = async (
  provider,
  signersAddress,
  signerBefore
) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    try {
      const signerAfter = await getSignerBalance(provider, signersAddress);
      if (signerAfter !== signerBefore) {
        return signerAfter;
      }
    } catch (error) {
      // Handle errors from provider.getBalance
      console.error(`Error fetching signer balance: ${error.message}`);
    }

    await delay();
  }

  throw new Error(
    `Failed to get a different value after ${process.env.MAX_RETRY} tries`
  );
};

const unPauseAndPoll = async (ERC20Pausable) => {
  await ERC20Pausable.unpause();

  for (
    let numberOfTries = 0;
    process.env.MAX_RETRY <= process.env.MAX_RETRY;
    numberOfTries++
  ) {
    const isPaused = await ERC20Pausable.paused();

    if (!isPaused) {
      return true; // Unpaused
    }

    await delay(); // Delay before the next attempt
  }

  return false; // paused
};

const genericPoll = async (toPollFromPromise, comparator, ms, forOperation) => {
  for (
    let numberOfTries = 0;
    numberOfTries < process.env.MAX_RETRY;
    numberOfTries++
  ) {
    try {
      let pollResult = await toPollFromPromise;
      if (pollResult.wait) {
        pollResult = await pollResult.wait();
      }
      const comparatorResult = comparator(pollResult);
      if (comparatorResult) {
        return pollResult;
      }
    } catch (error) {
      throw error;
    }

    await delay(ms);
  }

  throw new Error(`Failed to get a different value after ${process.env.MAX_RETRY} tries.
    For: 
    ${forOperation}
  `);
};

module.exports = {
  delay,
  pauseAndPoll,
  pollForNewERC20Balance,
  pollForERC20BurnableChangedSupply,
  pollForLastEvent,
  pollForNewBalance,
  pollForNewCounterValue,
  pollForNewHBarBalance,
  pollForNewSignerBalanceUsingProvider,
  pollForNewERC721Balance,
  pollForNewERC721Owner,
  pollForNewHollowWalletBalance,
  pollForNewERC721HollowWalletOwner,
  pollForNewSignerBalance,
  pollForNewWalletBalance,
  unPauseAndPoll,
  genericPoll,
};
