// Filename: hardhat.config.ts
/*-
 *
 * Hedera smart contract starter
 *
 * Copyright (C) 2023 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { HardhatUserConfig } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-ethers';
import dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 13000,
      },
    },
  },
  networks: {
    local: {
      url: "http://127.0.0.1:7546",
      chainId: 298,
      accounts: [process.env.ECDSA_PRIVATE_KEY_LOCAL || ''], // Private key generated from 'hedera start -d'
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 3
    },
    testnet: {
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: [process.env.ECDSA_PRIVATE_KEY_TEST || ''], // Private key of your testnet account
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 3
    }
  }
};

export default config;// Filename: scripts/create-topic-beacon.ts
/*-
 *
 * Hedera smart contract starter
 *
 * Copyright (C) 2023 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("Fetching Topic contract...");
  const Topic = await ethers.getContractFactory("Topic");

  console.log("Deploying Topic contract as a beacon...");
  const beacon = await upgrades.deployBeacon(Topic);
  await beacon.deployed();
  console.log("Beacon deployed to:", beacon.address);

  console.log("Deploying Topic contract as a beacon proxy with topic ID '0.0.1234'...");
  const topic = await upgrades.deployBeaconProxy(beacon, Topic, ["0.0.1234"]);
  await topic.deployed();
  console.log("Topic beacon proxy deployed to:", topic.address);

  console.log("Topic beacon proxy initialized with topic ID:", await (topic as unknown as TopicContract).getTopicId());
}

main().catch(console.error);
// Filename: scripts/create-topic.ts
/*-
 *
 * Hedera smart contract starter
 *
 * Copyright (C) 2023 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { ethers, upgrades } from "hardhat";

async function main() {
    console.log("Fetching Topic contract...");
    const Topic = await ethers.getContractFactory("Topic");

    console.log("Deploying Topic contract with topic ID '0.0.1234'...");
    const topic = await upgrades.deployProxy(Topic, ["0.0.1234"]);
    await topic.deployed();
    console.log("Topic contract deployed to:", topic.address);

    console.log("Topic contract initialized with topic ID:", await (topic as unknown as TopicContract).getTopicId());
}

main().catch(console.error);
// Filename: scripts/upgrade-topic-beacon.ts
/*-
 *
 * Hedera smart contract starter
 *
 * Copyright (C) 2023 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { ethers, upgrades } from "hardhat";

const BEACON_ADDRESS = "..."; // replace with your Beacon contract address

async function main() {
  console.log("Fetching TopicV2 contract...");
  const TopicV2 = await ethers.getContractFactory("TopicV2");

  console.log("Upgrading beacon to TopicV2...");
  await upgrades.upgradeBeacon(BEACON_ADDRESS, TopicV2);
  console.log("Beacon upgraded to TopicV2");

  const TOPIC_PROXY_ADDRESS = "..."; // replace with your Topic beacon proxy contract address
  const topicProxy = await ethers.getContractAt("TopicV2", TOPIC_PROXY_ADDRESS);

  console.log("Setting message on TopicV2 beacon proxy to 'Hello, Hedera' for TopicId:", await (topicProxy as unknown as TopicContract).getTopicId());
  await (topicProxy as unknown as TopicContract).setMessage("Hello, Hedera");
  console.log("TopicV2 beacon proxy message:", await (topicProxy as unknown as TopicContract).getMessage());
}

main().catch(console.error);
// Filename: scripts/upgrade-topic.ts
/*-
 *
 * Hedera smart contract starter
 *
 * Copyright (C) 2023 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { ethers, upgrades } from "hardhat";

const TOPIC_ADDRESS = "..."; // replace with your Node contract address

async function main() {
    console.log("Fetching TopicV2 contract...");
    const TopicV2 = await ethers.getContractFactory("TopicV2");

    console.log("Upgrading Topic contract to TopicV2...");
    const topic = await upgrades.upgradeProxy(TOPIC_ADDRESS, TopicV2);

    console.log("Setting message on TopicV2 contract to 'Hello, Hedera' for TopicId:", await (topic as unknown as TopicContract).getTopicId());
    await (topic as unknown as TopicContract).setMessage("Hello, Hedera");
    console.log("TopicV2 contract message:", await (topic as unknown as TopicContract).getMessage());
}

main().catch(console.error);
// Filename: test/topic.test.ts
/*-
 *
 * Hedera smart contract starter
 *
 * Copyright (C) 2023 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { describe, it } from "mocha";
import { Contract } from "ethers";

describe("Topic", function () {
  let Topic: Contract;
  let TopicV2: Contract;

  beforeEach(async function () {
    const TopicFactory = await ethers.getContractFactory("Topic");
    Topic = await upgrades.deployProxy(TopicFactory, ["0.0.1337"], { initializer: 'initialize' });

    const TopicV2Factory = await ethers.getContractFactory("TopicV2");
    TopicV2 = await upgrades.upgradeProxy(Topic.address, TopicV2Factory);
  });

  it("should return the correct topicId", async function () {
    expect(await (Topic as unknown as TopicContract).getTopicId()).to.equal("0.0.1337");
  });

  it("should return the correct topicId for version 2", async function () {
    expect(await (TopicV2 as unknown as TopicContract).getTopicId()).to.equal("0.0.1337");
  });

  it("should set and return the correct message for version 2", async function () {
    await (TopicV2 as unknown as TopicContract).setMessage("HelloFuture");
    expect(await (TopicV2 as unknown as TopicContract).getMessage()).to.equal("HelloFuture");
  });
});
// Filename: types/topic.d.ts
/*-
 *
 * Hedera smart contract starter
 *
 * Copyright (C) 2023 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

declare interface TopicContract {
  getTopicId: () => Promise<string>;
  setMessage(message: string): Promise<void>;
  getMessage(): Promise<void>;
}
