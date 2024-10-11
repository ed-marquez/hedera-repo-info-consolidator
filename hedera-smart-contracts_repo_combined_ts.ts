// Filename: system-contract-dapp-playground/__tests__/ethers/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract, ethers } from 'ethers';
import { HEDERA_SMART_CONTRACTS_ASSETS } from '@/utils/common/constants';

// Mock the ethers.Contract constructor
jest.mock('ethers', () => {
  const actualEthers = jest.requireActual('ethers');
  return {
    ...actualEthers,
    Contract: jest.fn().mockImplementation(() => ({
      name: jest.fn().mockResolvedValue('Hedera'),
    })),
  };
});

describe('Contract tests', () => {
  beforeEach(() => {
    (Contract as jest.Mock).mockClear();
  });

  it('should create an instance of ethers.Contract and interact with deployed contract', async () => {
    const contractAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    const contractABI = HEDERA_SMART_CONTRACTS_ASSETS.ERC_20.contractABI;

    const contract = new Contract(contractAddress, contractABI);
    const name = await contract.name();

    expect(name).toBe('Hedera');
  });

  it('should not create an instance of ethers.ContractFactory to interact with deployed contract', async () => {
    const contractABI = HEDERA_SMART_CONTRACTS_ASSETS.ERC_20.contractABI;
    const contractBytecode = HEDERA_SMART_CONTRACTS_ASSETS.ERC_20.contractBytecode;

    const factory = new ethers.ContractFactory(contractABI, contractBytecode);

    try {
      await (factory as any).name();
    } catch (error: any) {
      expect(error.toString()).toBe('TypeError: factory.name is not a function');
    }
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/erc20-interactions/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import {
  balanceOf,
  erc20Mint,
  erc20Transfers,
  getERC20TokenInformation,
  handleErc20TokenPermissions,
} from '@/api/hedera/erc20-interactions';
import { Contract } from 'ethers';
import {
  MOCK_TX_HASH,
  MOCK_GAS_LIMIT,
  MOCK_HEDERA_NETWORK,
  MOCK_SIGNER_ADDRESS,
} from '../../utils/common/constants';

describe('getERC20TokenInformation', () => {
  const expectedSymbol = 'TKN';
  const expectedDecimals = '18';
  const expectedName = 'TokenName';
  const expectedTotalSupply = '1000000';

  // Mock baseContract object
  const baseContract = {
    name: jest.fn().mockResolvedValue(expectedName),
    symbol: jest.fn().mockResolvedValue(expectedSymbol),
    totalSupply: jest.fn().mockResolvedValue(expectedTotalSupply),
    decimals: jest.fn().mockResolvedValue(expectedDecimals),
  };

  it('should execute name()', async () => {
    const res = await getERC20TokenInformation(baseContract as unknown as Contract, 'name');

    // assertion
    expect(res.err).toBeNull;
    expect(getERC20TokenInformation).toBeCalled;
    expect(res.name).toBe(expectedName);
  });

  it('should execute symbol()', async () => {
    const res = await getERC20TokenInformation(baseContract as unknown as Contract, 'symbol');

    // assertion
    expect(res.err).toBeNull;
    expect(getERC20TokenInformation).toBeCalled;
    expect(res.symbol).toBe(expectedSymbol);
  });
  it('should execute totalSupply()', async () => {
    const res = await getERC20TokenInformation(baseContract as unknown as Contract, 'totalSupply');

    // assertion
    expect(res.err).toBeNull;
    expect(getERC20TokenInformation).toBeCalled;
    expect(res.totalSupply).toBe(expectedTotalSupply);
  });
  it('should execute decimals()', async () => {
    const res = await getERC20TokenInformation(baseContract as unknown as Contract, 'decimals');

    // assertion
    expect(res.err).toBeNull;
    expect(getERC20TokenInformation).toBeCalled;
    expect(res.decimals).toBe(expectedDecimals);
  });
});

describe('erc20Mint', () => {
  // Mock baseContract object
  const baseContract = {
    mint: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({
        hash: MOCK_TX_HASH,
      }),
    }),
  };

  it('should execute erc20Mint', async () => {
    const res = await erc20Mint(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      '0x7a575266b2020e262e9b1ad4eba3014d63630095',
      120,
      MOCK_GAS_LIMIT
    );

    // assertion
    expect(res.err).toBeNull;
    expect(erc20Mint).toBeCalled;
    expect(res.mintRes).toBe(true);
    expect(res.txHash).toBe(MOCK_TX_HASH);
  });

  it('should failed with invalid recipient address', async () => {
    const res = await erc20Mint(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      '0xabc',
      120,
      MOCK_GAS_LIMIT
    );
    // assertion
    expect(res.err).toBe('Invalid recipient address');
    expect(erc20Mint).toBeCalled;
    expect(res.mintRes).toBeNull;
  });

  it('should failed with invalid token amount', async () => {
    const res = await erc20Mint(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      '0x7a575266b2020e262e9b1ad4eba3014d63630095',
      -120,
      MOCK_GAS_LIMIT
    );
    // assertion
    expect(res.err).toBe('Invalid token amount');
    expect(erc20Mint).toBeCalled;
    expect(res.mintRes).toBeNull;
  });
});

describe('balanceOf', () => {
  const baseContract = {
    balanceOf: jest.fn().mockResolvedValue('120'),
  };

  it('should execute balanceOf', async () => {
    const balanceOfRes = await balanceOf(
      baseContract as unknown as Contract,
      '0x7a575266b2020e262e9b1ad4eba3014d63630095'
    );

    // assertion
    expect(balanceOfRes.err).toBeNull;
    expect(balanceOfRes.balanceOfRes).toBe('120');
    expect(balanceOf).toBeCalled;
  });

  it('should fail with Invalid account address', async () => {
    const balanceOfRes = await balanceOf(baseContract as unknown as Contract, '0x3619');

    // assertion
    expect(balanceOfRes.err).toBe('Invalid account address');
    expect(balanceOfRes.balanceOfRes).toBeNull;
    expect(balanceOf).toBeCalled;
  });
});

describe('Token Permissions', () => {
  const mockedValue = jest.fn().mockResolvedValue({
    wait: jest.fn().mockResolvedValue({
      hash: MOCK_TX_HASH,
    }),
  });

  const baseContract = {
    approve: mockedValue,
    increaseAllowance: mockedValue,
    decreaseAllowance: mockedValue,
    allowance: jest.fn().mockResolvedValue('120'),
  };

  it('should execute erc20Approve', async () => {
    const approveRes = await handleErc20TokenPermissions(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'approve',
      '0x7a575266b2020e262e9b1ad4eba3014d63630095',
      MOCK_GAS_LIMIT,
      '',
      120
    );

    // assertion
    expect(approveRes.err).toBeNull;
    expect(approveRes.txHash).toBe(MOCK_TX_HASH);
    expect(approveRes.approveRes).toBe(true);
    expect(handleErc20TokenPermissions).toBeCalled;
  });

  it('should fail erc20Approve with Invalid spender address', async () => {
    const approveRes = await handleErc20TokenPermissions(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'approve',
      '0x3619',
      MOCK_GAS_LIMIT,
      '',
      120
    );

    // assertion
    expect(approveRes.err).toBe('Invalid spender address');
    expect(approveRes.approveRes).toBeNull;
    expect(handleErc20TokenPermissions).toBeCalled;
  });

  it('should execute erc20IncreaseAllowance', async () => {
    const increaseAllowanceRes = await handleErc20TokenPermissions(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'increaseAllowance',
      '0x7a575266b2020e262e9b1ad4eba3014d63630095',
      MOCK_GAS_LIMIT,
      '',
      120
    );

    // assertion
    expect(increaseAllowanceRes.err).toBeNull;
    expect(handleErc20TokenPermissions).toBeCalled;
    expect(increaseAllowanceRes.txHash).toBe(MOCK_TX_HASH);
    expect(increaseAllowanceRes.increaseAllowanceRes).toBe(true);
  });

  it('should fail erc20IncreaseAllowance with Invalid spender address', async () => {
    const increaseAllowanceRes = await handleErc20TokenPermissions(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'increaseAllowance',
      '0x3619',
      MOCK_GAS_LIMIT,
      '',
      120
    );

    // assertion
    expect(increaseAllowanceRes.err).toBe('Invalid spender address');
    expect(increaseAllowanceRes.increaseAllowanceRes).toBeNull;
    expect(handleErc20TokenPermissions).toBeCalled;
  });

  it('should execute erc20DecreaseAllowance', async () => {
    const decreaseAllowanceRes = await handleErc20TokenPermissions(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'decreaseAllowance',
      '0x7a575266b2020e262e9b1ad4eba3014d63630095',
      MOCK_GAS_LIMIT,
      '',
      120
    );

    // assertion
    expect(decreaseAllowanceRes.err).toBeNull;
    expect(handleErc20TokenPermissions).toBeCalled;
    expect(decreaseAllowanceRes.txHash).toBe(MOCK_TX_HASH);
    expect(decreaseAllowanceRes.decreaseAllowanceRes).toBe(true);
  });

  it('should fail erc20DecreaseAllowance with Invalid spender address', async () => {
    const decreaseAllowanceRes = await handleErc20TokenPermissions(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'decreaseAllowance',
      '0x3619',
      MOCK_GAS_LIMIT,
      '',
      120
    );

    // assertion
    expect(handleErc20TokenPermissions).toBeCalled;
    expect(decreaseAllowanceRes.err).toBe('Invalid spender address');
    expect(decreaseAllowanceRes.decreaseAllowanceRes).toBeNull;
  });

  it('should execute erc20Allowance', async () => {
    const allowanceRes = await handleErc20TokenPermissions(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'allowance',
      '0x7a575266b2020e262e9b1ad4eba3014d63630095',
      MOCK_GAS_LIMIT,
      '0x7a575266b2020e262e9b1ad4eba3014d63630012'
    );

    // assertion
    expect(allowanceRes.err).toBeNull;
    expect(allowanceRes.allowanceRes).toBe('120');
    expect(handleErc20TokenPermissions).toBeCalled;
  });

  it('should fail erc20Allowance with Invalid owner address', async () => {
    const allowanceRes = await handleErc20TokenPermissions(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'allowance',
      '0x7a575266b2020e262e9b1ad4eba3014d63630012',
      MOCK_GAS_LIMIT,
      '0x3619'
    );

    // assertion
    expect(allowanceRes.err).toBe('Invalid owner address');
    expect(allowanceRes.allowanceRes).toBeNull;
    expect(handleErc20TokenPermissions).toBeCalled;
  });

  it('should fail erc20Allowance with Invalid spender address', async () => {
    const allowanceRes = await handleErc20TokenPermissions(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'allowance',
      '0x3619',
      MOCK_GAS_LIMIT,
      '0x7a575266b2020e262e9b1ad4eba3014d63630012'
    );

    // assertion
    expect(allowanceRes.err).toBe('Invalid spender address');
    expect(allowanceRes.allowanceRes).toBeNull;
    expect(handleErc20TokenPermissions).toBeCalled;
  });
});

describe('Transfer', () => {
  const mockedValue = jest.fn().mockResolvedValue({
    wait: jest.fn().mockResolvedValue({
      hash: MOCK_TX_HASH,
    }),
  });

  const baseContract = {
    transfer: mockedValue,
    transferFrom: mockedValue,
  };

  it('should execute erc20Transfer', async () => {
    const transferRes = await erc20Transfers(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'transfer',
      '0x7a575266b2020e262e9b1ad4eba3014d63630012',
      120,
      MOCK_GAS_LIMIT
    );

    // assertion
    expect(balanceOf).toBeCalled;
    expect(transferRes.err).toBeNull;
    expect(transferRes.txHash).toBe(MOCK_TX_HASH);
    expect(transferRes.transferRes).toBe(true);
  });

  it('should fail erc20Transfer with Invalid recipient address', async () => {
    const transferRes = await erc20Transfers(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'transfer',
      '0x112c',
      120,
      MOCK_GAS_LIMIT
    );

    // assertion
    expect(transferRes.err).toBe('Invalid recipient address');
    expect(transferRes.transferRes).toBeNull;
    expect(balanceOf).toBeCalled;
  });

  it('should execute erc20TransferFrom', async () => {
    const transferFromRes = await erc20Transfers(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'transferFrom',
      '0x7a575266b2020e262e9b1ad4eba3014d63630022',
      120,
      MOCK_GAS_LIMIT,
      '0x7a575266b2020e262e9b1ad4eba3014d63630012'
    );

    // assertion
    expect(balanceOf).toBeCalled;
    expect(transferFromRes.err).toBeNull;
    expect(transferFromRes.txHash).toBe(MOCK_TX_HASH);
    expect(transferFromRes.transferFromRes).toBe(true);
  });

  it('should fail erc20TransferFrom with Invalid token owner address', async () => {
    const transferFromRes = await erc20Transfers(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'transferFrom',
      '0x7a575266b2020e262e9b1ad4eba3014d63630012',
      MOCK_GAS_LIMIT,
      120,
      '0x112c'
    );

    // assertion
    expect(transferFromRes.err).toBe('Invalid token owner address');
    expect(transferFromRes.transferFromRes).toBeNull;
    expect(balanceOf).toBeCalled;
  });

  it('should fail erc20TransferFrom with Invalid recipient address', async () => {
    const transferFromRes = await erc20Transfers(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'transferFrom',
      '0x112c',
      120,
      MOCK_GAS_LIMIT,
      '0x7a575266b2020e262e9b1ad4eba3014d63630012'
    );

    // assertion
    expect(transferFromRes.err).toBe('Invalid recipient address');
    expect(transferFromRes.transferFromRes).toBeNull;
    expect(balanceOf).toBeCalled;
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/erc721-interactions/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import {
  erc721Mint,
  erc721OwnerOf,
  erc721TokenURI,
  erc721Transfers,
  erc721BalanceOf,
  erc721TokenApprove,
  erc721TokenApproval,
  getERC721TokenInformation,
} from '@/api/hedera/erc721-interactions';
import { Contract } from 'ethers';
import {
  MOCK_TX_HASH,
  MOCK_GAS_LIMIT,
  MOCK_HEDERA_NETWORK,
  MOCK_SIGNER_ADDRESS,
} from '../../utils/common/constants';

describe('ERC721 test suite', () => {
  const tokenID = 369;
  const approvalStatus = true;
  const expectedSymbol = 'TKN';
  const expectedBalance = '120';
  const expectedName = 'TokenName';
  const expectedTokenURI = 'ipfs://bafyreih7a5ds4th3o';
  const recipient = '0x34810E139b451e0a4c67d5743E956Ac8990842A8';
  const tokenOwner = '0xCC07a8243578590d55c5708D7fB453245350Cc2A';
  const spenderAddress = '0x05FbA803Be258049A27B820088bab1cAD2058871';
  const operatorAddress = '0x0851072d7bB726305032Eff23CB8fd22eB74c85B';

  const waitMockedObject = {
    wait: jest.fn().mockResolvedValue({
      hash: MOCK_TX_HASH,
    }),
  };

  // Mock baseContract object
  const baseContract = {
    name: jest.fn().mockResolvedValue(expectedName),
    symbol: jest.fn().mockResolvedValue(expectedSymbol),
    tokenURI: jest.fn().mockResolvedValue(expectedTokenURI),
    mint: jest.fn().mockResolvedValue(waitMockedObject),
    balanceOf: jest.fn().mockResolvedValue(expectedBalance),
    ownerOf: jest.fn().mockResolvedValue(tokenOwner),
    approve: jest.fn().mockResolvedValue(waitMockedObject),
    getApproved: jest.fn().mockResolvedValue(spenderAddress),
    setApprovalForAll: jest.fn().mockResolvedValue(waitMockedObject),
    isApprovedForAll: jest.fn().mockResolvedValue(approvalStatus),
    transferFrom: jest.fn().mockResolvedValue(waitMockedObject),
    ['safeTransferFrom(address,address,uint256,bytes)']: jest.fn().mockResolvedValue(waitMockedObject),
  };

  describe('getERC721TokenInformation', () => {
    it('should execute name()', async () => {
      const res = await getERC721TokenInformation(baseContract as unknown as Contract, 'name');

      // assertion
      expect(res.err).toBeNull;
      expect(res.name).toBe(expectedName);
      expect(getERC721TokenInformation).toBeCalled;
    });
    it('should execute symbol()', async () => {
      const res = await getERC721TokenInformation(baseContract as unknown as Contract, 'symbol');

      // assertion
      expect(res.err).toBeNull;
      expect(res.symbol).toBe(expectedSymbol);
      expect(getERC721TokenInformation).toBeCalled;
    });
  });

  describe('erc721TokenURI', () => {
    it('should execute erc721TokenURI()', async () => {
      const res = await erc721TokenURI(baseContract as unknown as Contract, tokenID);

      // assertion
      expect(res.err).toBeNull;
      expect(erc721TokenURI).toBeCalled;
      expect(res.tokenURI).toBe(expectedTokenURI);
    });

    it('should execute erc721TokenURI() and return an error if the tokenID is invalid', async () => {
      const res = await erc721TokenURI(baseContract as unknown as Contract, -3);

      // assertion
      expect(res.tokenURI).toBeNull;
      expect(erc721TokenURI).toBeCalled;
      expect(res.err).toBe('Invalid token amount');
    });
  });

  describe('erc721Mint', () => {
    it('should execute erc721Mint', async () => {
      const res = await erc721Mint(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        recipient,
        tokenID,
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.err).toBeNull;
      expect(erc721Mint).toBeCalled;
      expect(res.txHash).toBe(MOCK_TX_HASH);
    });

    it('should execute erc721Mint and return error if recipientAddress is invalid', async () => {
      const res = await erc721Mint(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        '0xabc',
        tokenID,
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.err).toBe('Invalid recipient address');
      expect(erc721Mint).toBeCalled;
      expect(res.txHash).toBeNull;
    });

    it('should execute erc721Mint and return error if tokenID is invalid', async () => {
      const res = await erc721Mint(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        recipient,
        -3,
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.err).toBe('Invalid token amount');
      expect(erc721Mint).toBeCalled;
      expect(res.txHash).toBeNull;
    });
  });

  describe('erc721BalanceOf', () => {
    it('should execute erc721BalanceOf', async () => {
      const res = await erc721BalanceOf(baseContract as unknown as Contract, tokenOwner);

      // assertion
      expect(res.err).toBeNull;
      expect(erc721BalanceOf).toBeCalled;
      expect(res.balanceOfRes).toBe(expectedBalance);
    });

    it('should execute erc721BalanceOf and return error if recipientAddress is invalid', async () => {
      const res = await erc721BalanceOf(baseContract as unknown as Contract, '0xabc');

      // assertion
      expect(res.err).toBe('Invalid account address');
      expect(erc721BalanceOf).toBeCalled;
      expect(res.txHash).toBeNull;
    });
  });

  describe('erc721OwnerOf', () => {
    it('should execute erc721OwnerOf', async () => {
      const res = await erc721OwnerOf(baseContract as unknown as Contract, tokenID);

      // assertion
      expect(res.err).toBeNull;
      expect(erc721OwnerOf).toBeCalled;
      expect(res.ownerOfRes).toBe(tokenOwner);
    });
  });

  describe('erc721TokenApprove', () => {
    it('should execute erc721TokenApprove with method === "APPROVE" and return a txHash', async () => {
      const res = await erc721TokenApprove(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'APPROVE',
        spenderAddress,
        tokenID,
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.err).toBeNull;
      expect(res.txHash).toBe(MOCK_TX_HASH);
      expect(erc721TokenApprove).toBeCalled;
    });

    it('should execute erc721TokenApprove with method === "GET_APPROVE" and return an approved account', async () => {
      const res = await erc721TokenApprove(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'GET_APPROVE',
        spenderAddress,
        tokenID,
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.err).toBeNull;
      expect(res.approvedAccountRes).toBe(spenderAddress);
      expect(erc721TokenApprove).toBeCalled;
    });

    it('should execute erc721TokenApprove and return an error if the spender address is invalid', async () => {
      const res = await erc721TokenApprove(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'APPROVE',
        '0xabc',
        tokenID,
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.txHash).toBeNul;
      expect(erc721TokenApprove).toBeCalled;
      expect(res.approvedAccountRes).toBeNul;
      expect(res.err).toBe('Invalid account address');
    });
  });

  describe('erc721TokenApproval', () => {
    it('should execute erc721TokenApproval with method === "SET_APPROVAL" and return a txHash ', async () => {
      const res = await erc721TokenApproval(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'SET_APPROVAL',
        tokenOwner,
        operatorAddress,
        approvalStatus,
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.err).toBeNull;
      expect(res.txHash).toBe(MOCK_TX_HASH);
      expect(erc721TokenApproval).toBeCalled;
    });

    it('should execute erc721TokenApproval with method === "IS_APPROVAL" and return the approval status', async () => {
      const res = await erc721TokenApproval(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'IS_APPROVAL',
        tokenOwner,
        operatorAddress,
        approvalStatus,
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.err).toBeNull;
      expect(erc721TokenApproval).toBeCalled;
      expect(res.approvalStatusRes).toBe(approvalStatus);
    });

    it('should execute erc721TokenApproval and return error if tokenOwner is invalid', async () => {
      const res = await erc721TokenApproval(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'IS_APPROVAL',
        '0xabc',
        operatorAddress,
        approvalStatus,
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.txHash).toBeNull;
      expect(res.approvalStatusRes).toBeNull;
      expect(erc721TokenApproval).toBeCalled;
      expect(res.err).toBe('Invalid owner address');
    });

    it('should execute erc721TokenApproval and return error if operatorAddress is invalid', async () => {
      const res = await erc721TokenApproval(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'IS_APPROVAL',
        tokenOwner,
        '0xabc',
        approvalStatus,
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.txHash).toBeNull;
      expect(res.approvalStatusRes).toBeNull;
      expect(erc721TokenApproval).toBeCalled;
      expect(res.err).toBe('Invalid operator address');
    });
  });

  describe('erc721Transfers', () => {
    it('should execute erc721Transfers with method === "TRANSFER_FROM" and return a txHash ', async () => {
      const res = await erc721Transfers(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'TRANSFER_FROM',
        tokenOwner,
        recipient,
        tokenID,
        '',
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.err).toBeNull;
      expect(res.txHash).toBe(MOCK_TX_HASH);
      expect(erc721Transfers).toBeCalled;
    });

    it('should execute erc721Transfers with method === "SAFE_TRANSFER_FROM" and return a txHash ', async () => {
      const res = await erc721Transfers(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'SAFE_TRANSFER_FROM',
        tokenOwner,
        recipient,
        tokenID,
        '',
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.err).toBeNull;
      expect(res.txHash).toBe(MOCK_TX_HASH);
      expect(erc721Transfers).toBeCalled;
    });

    it('should execute erc721Transfers and return an error if senderAddress is invalid ', async () => {
      const res = await erc721Transfers(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'SAFE_TRANSFER_FROM',
        '0xabc',
        recipient,
        tokenID,
        '',
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.txHash).toBeNull;
      expect(erc721Transfers).toBeCalled;
      expect(res.err).toBe('Invalid sender address');
    });

    it('should execute erc721Transfers and return an error if recipientAddress is invalid ', async () => {
      const res = await erc721Transfers(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'SAFE_TRANSFER_FROM',
        tokenOwner,
        '0xabc',
        tokenID,
        '',
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.txHash).toBeNull;
      expect(erc721Transfers).toBeCalled;
      expect(res.err).toBe('Invalid recipient address');
    });

    it('should execute erc721Transfers and return an error if tokenID is invalid ', async () => {
      const res = await erc721Transfers(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'SAFE_TRANSFER_FROM',
        tokenOwner,
        recipient,
        -3,
        '',
        MOCK_GAS_LIMIT
      );

      // assertion
      expect(res.txHash).toBeNull;
      expect(erc721Transfers).toBeCalled;
      expect(res.err).toBe('Invalid tokenId');
    });
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/exchange-rate-interactions/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract } from 'ethers';
import {
  MOCK_TX_HASH,
  MOCK_GAS_LIMIT,
  MOCK_HEDERA_NETWORK,
  MOCK_SIGNER_ADDRESS,
} from '../../utils/common/constants';
import { handleExchangeRate } from '@/api/hedera/exchange-rate-interactions';

describe('Exchange Rate Test Suite', () => {
  const amount = 100000000;
  const mockConvertedAmount = 833333;

  // mock resolved return value
  const contractMockedResolvedValue = (eventName: string) => {
    return {
      wait: jest.fn().mockResolvedValue({
        logs: [
          {
            fragment: {
              name: eventName,
            },
            data: mockConvertedAmount,
          },
        ],
        hash: MOCK_TX_HASH,
      }),
    };
  };

  // mock baseContract object
  const baseContract = {
    convertTinycentsToTinybars: jest.fn().mockResolvedValue(contractMockedResolvedValue('TinyBars')),
    convertTinybarsToTinycents: jest.fn().mockResolvedValue(contractMockedResolvedValue('TinyCents')),
  };

  it('should execute handleExchangeRate with API === "CENT_TO_BAR" and return a txHash and convertedAmount', async () => {
    const txRes = await handleExchangeRate(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'CENT_TO_BAR',
      amount,
      MOCK_GAS_LIMIT
    );

    expect(txRes.err).toBeNull;
    expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    expect(txRes.convertedAmount).toBe(mockConvertedAmount);
  });

  it('should execute handleExchangeRate with API === "BAR_TO_CENT" and return a txHash and convertedAmount', async () => {
    const txRes = await handleExchangeRate(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      'BAR_TO_CENT',
      amount,
      MOCK_GAS_LIMIT
    );

    expect(txRes.err).toBeNull;
    expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    expect(txRes.convertedAmount).toBe(mockConvertedAmount);
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/helper/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import { constructIHederaTokenKey } from '@/utils/contract-interactions/HTS/helpers';
import {
  DEFAULT_IHTS_KEY_VALUE,
  KEY_TYPE_MAP,
} from '@/utils/contract-interactions/HTS/token-create-custom/constant';

describe('constructIHederaTokenKey test suite', () => {
  // mock contractId & compressedPubKey
  const contractId = '0xbdcdf69052c9fc01e38377d05cc83c28ee43f24a';
  const compressedPubKey = '0x02abd6f73537915169f0172a49b8521f0679482c6538f0cc063c27bd31f32db9c1';

  it('should construct a correct IHederaTokenService.TokenKey for all key types', () => {
    const keyValueType = 'contractId';

    const keyTypesArray: IHederaTokenServiceKeyType[] = [
      'ADMIN',
      'KYC',
      'FREEZE',
      'WIPE',
      'SUPPLY',
      'FEE',
      'PAUSE',
    ];

    keyTypesArray.forEach((keyType) => {
      const expectedHederaTokenKey = {
        keyType: KEY_TYPE_MAP[keyType],
        key: { ...DEFAULT_IHTS_KEY_VALUE, contractId },
      };

      const hederaTokenKey = constructIHederaTokenKey(keyType, keyValueType, contractId);

      expect(hederaTokenKey).toStrictEqual(expectedHederaTokenKey);
    });
  });

  it('should construct a correct IHederaTokenService.TokenKey for all key value types', () => {
    const keyValueTypsArray: IHederaTokenServiceKeyValueType[] = [
      'inheritAccountKey',
      'contractId',
      'ed25519',
      'ECDSA_secp256k1',
      'delegatableContractId',
    ];

    keyValueTypsArray.forEach((keyValueType) => {
      let expectedKeyValue, inputKeyValue;
      if (keyValueType === 'inheritAccountKey') {
        inputKeyValue = true;
        expectedKeyValue = true;
      } else if (keyValueType === 'contractId' || keyValueType === 'delegatableContractId') {
        inputKeyValue = contractId;
        expectedKeyValue = contractId;
      } else {
        inputKeyValue = compressedPubKey;
        expectedKeyValue = Buffer.from(compressedPubKey.replace('0x', ''), 'hex');
      }

      const expectedHederaTokenKey = {
        keyType: 1, // ADMIN
        key: { ...DEFAULT_IHTS_KEY_VALUE, [keyValueType]: expectedKeyValue },
      };
      const hederaTokenKey = constructIHederaTokenKey('ADMIN', keyValueType, inputKeyValue);

      expect(hederaTokenKey).toStrictEqual(expectedHederaTokenKey);
    });
  });

  it('should return NULL when construct a IHederaTokenService.TokenKey with address typed key that does not match standard public address', () => {
    const keyValueType: IHederaTokenServiceKeyValueType[] = ['contractId', 'delegatableContractId'];
    const invalidAddress = '0xabc';

    keyValueType.forEach((keyValueType) => {
      const hederaTokenKey = constructIHederaTokenKey('ADMIN', keyValueType, invalidAddress);
      expect(hederaTokenKey).toBe(null);
    });
  });

  it('should return NULL when construct a IHederaTokenService.TokenKey with compressed public key typed key that does not match standard compressed public key', () => {
    const keyValueType: IHederaTokenServiceKeyValueType[] = ['ed25519', 'ECDSA_secp256k1'];
    const invalidPubKey = '0xabc';

    keyValueType.forEach((keyValueType) => {
      const hederaTokenKey = constructIHederaTokenKey('ADMIN', keyValueType, invalidPubKey);
      expect(hederaTokenKey).toBe(null);
    });
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/hts-interactions/token-create-custom/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract } from 'ethers';
import {
  mintHederaToken,
  grantTokenKYCToAccount,
  mintHederaTokenToAddress,
  createHederaFungibleToken,
  createHederaNonFungibleToken,
  associateHederaTokensToAccounts,
} from '@/api/hedera/hts-interactions/tokenCreateCustom-interactions';
import {
  MOCK_TX_HASH,
  MOCK_GAS_LIMIT,
  MOCK_TOKEN_ADDRESS,
  MOCK_HEDERA_NETWORK,
  MOCK_SIGNER_ADDRESS,
} from '../../../utils/common/constants';

describe('createHederaFungibleToken test suite', () => {
  // mock states
  const decimals = 8;
  const tokenSymbol = 'WHBAR';
  const returnedResult = true;
  const tokenName = 'WrappedHbar';
  const tokenMemo = 'Wrapped Hbar';
  const freezeDefaultStatus = false;
  const maxSupply = 30000000000; // 300 WHBAR
  const initialSupply = 900000000; // 9 WHBAR
  const metadata = ['Zeus', 'Athena', 'Apollo'];
  const msgValue = '20000000000000000000'; // 20 hbar
  const feeAmount = 1000; // 20 hbar
  const recipient = '0x34810E139b451e0a4c67d5743E956Ac8990842A8';
  const contractId = '0xbdcdf69052c9fc01e38377d05cc83c28ee43f24a';
  const feeTokenAddress = '0x00000000000000000000000000000000000006Ab';
  const associtingAccount = '0x34810E139b451e0a4c67d5743E956Ac8990842A8';
  const grantingKYCAccount = '0x34810E139b451e0a4c67d5743E956Ac8990842A8';
  const returnedTokenAddress = '0x00000000000000000000000000000000000000000000000000000000000084b7';

  const mockResolvedValue = {
    wait: jest.fn().mockResolvedValue({
      logs: [
        {
          fragment: {
            name: 'CreatedToken',
          },
          data: returnedTokenAddress,
        },
        {
          fragment: {
            name: 'ResponseCode',
          },
          data: '0x0016',
        },
      ],
      hash: MOCK_TX_HASH,
    }),
  };

  // mock baseContract object
  const baseContract = {
    mintTokenPublic: jest.fn().mockResolvedValue(mockResolvedValue),
    grantTokenKycPublic: jest.fn().mockResolvedValue(mockResolvedValue),
    associateTokenPublic: jest.fn().mockResolvedValue(mockResolvedValue),
    associateTokensPublic: jest.fn().mockResolvedValue(mockResolvedValue),
    mintTokenToAddressPublic: jest.fn().mockResolvedValue(mockResolvedValue),
    createFungibleTokenPublic: jest.fn().mockResolvedValue(mockResolvedValue),
    createNonFungibleTokenPublic: jest.fn().mockResolvedValue(mockResolvedValue),
    mintNonFungibleTokenToAddressPublic: jest.fn().mockResolvedValue(mockResolvedValue),
    createFungibleTokenWithCustomFeesPublic: jest.fn().mockResolvedValue(mockResolvedValue),
    createNonFungibleTokenWithCustomFeesPublic: jest.fn().mockResolvedValue(mockResolvedValue),
  };

  // mock inputKeys with ICommonKeyObject[] type
  const inputKeys: ICommonKeyObject[] = [
    {
      keyType: 'ADMIN',
      keyValueType: 'contractId',
      keyValue: contractId,
    },
    {
      keyType: 'KYC',
      keyValueType: 'contractId',
      keyValue: contractId,
    },
    {
      keyType: 'FREEZE',
      keyValueType: 'contractId',
      keyValue: contractId,
    },
    {
      keyType: 'WIPE',
      keyValueType: 'contractId',
      keyValue: contractId,
    },
    {
      keyType: 'SUPPLY',
      keyValueType: 'contractId',
      keyValue: contractId,
    },
    {
      keyType: 'FEE',
      keyValueType: 'contractId',
      keyValue: contractId,
    },
    {
      keyType: 'PAUSE',
      keyValueType: 'contractId',
      keyValue: contractId,
    },
  ];

  describe('createHederaFungibleToken', () => {
    it('should execute createHederaFungibleToken then a token address and transaction hash', async () => {
      const txRes = await createHederaFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        initialSupply,
        maxSupply,
        decimals,
        freezeDefaultStatus,
        contractId,
        inputKeys,
        msgValue
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.tokenAddress).toBe(MOCK_TOKEN_ADDRESS);
    });

    it('should execute createFungibleTokenWithCustomFeesPublic then a token address and transaction hash', async () => {
      const txRes = await createHederaFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        initialSupply,
        maxSupply,
        decimals,
        freezeDefaultStatus,
        contractId,
        inputKeys,
        msgValue,
        feeTokenAddress,
        feeAmount
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.tokenAddress).toBe(MOCK_TOKEN_ADDRESS);
    });

    it('should execute createHederaFungibleToken and return error if initialTotalSupply is invalid', async () => {
      const txRes = await createHederaFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        -3,
        maxSupply,
        decimals,
        freezeDefaultStatus,
        contractId,
        inputKeys,
        msgValue
      );

      expect(txRes.err).toBe('initial total supply cannot be negative');
      expect(txRes.tokenAddress).toBeNull;
    });

    it('should execute createHederaFungibleToken and return error if maxSupply is invalid', async () => {
      const txRes = await createHederaFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        initialSupply,
        -3,
        decimals,
        freezeDefaultStatus,
        contractId,
        inputKeys,
        msgValue
      );

      expect(txRes.err).toBe('max supply cannot be negative');
      expect(txRes.tokenAddress).toBeNull;
    });

    it('should execute createHederaFungibleToken and return error if decimals is invalid', async () => {
      const txRes = await createHederaFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        initialSupply,
        maxSupply,
        -3,
        freezeDefaultStatus,
        contractId,
        inputKeys,
        msgValue
      );

      expect(txRes.err).toBe('decimals cannot be negative');
      expect(txRes.tokenAddress).toBeNull;
    });

    it('should execute createHederaFungibleToken and return error if treasury address does not match public address standard', async () => {
      const txRes = await createHederaFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        initialSupply,
        maxSupply,
        decimals,
        freezeDefaultStatus,
        '0xabc',
        inputKeys,
        msgValue
      );

      expect(txRes.err).toBe('invalid treasury address');
      expect(txRes.tokenAddress).toBeNull;
    });

    it('should execute createHederaFungibleToken and return error if fee token address does not match public address standard', async () => {
      const txRes = await createHederaFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        initialSupply,
        maxSupply,
        decimals,
        freezeDefaultStatus,
        contractId,
        inputKeys,
        msgValue,
        '0xabc'
      );

      expect(txRes.err).toBe('invalid fee token address');
      expect(txRes.tokenAddress).toBeNull;
    });

    it('should execute createHederaFungibleToken and return error if inputKeys is invalid ', async () => {
      const failedKeys: ICommonKeyObject[] = [
        {
          keyType: 'ADMIN',
          keyValueType: 'contractId',
          keyValue: '0xabc', // invalid
        },
        {
          keyType: 'KYC',
          keyValueType: 'contractId',
          keyValue: contractId,
        },
        {
          keyType: 'FREEZE',
          keyValueType: 'ECDSA_secp256k1',
          keyValue: '0x02bc', // invalid
        },
      ];

      const txRes = await createHederaFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        initialSupply,
        maxSupply,
        decimals,
        freezeDefaultStatus,
        contractId,
        failedKeys,
        msgValue
      );

      expect(txRes.err.length).toBe(2);

      expect(txRes.err[0].keyType).toBe('ADMIN');
      expect(txRes.err[0].keyValueType).toBe('contractId');
      expect(txRes.err[0].keyValue).toBe('0xabc');
      expect(txRes.err[0].err).toBe('Invalid key value');

      expect(txRes.err[1].keyType).toBe('FREEZE');
      expect(txRes.err[1].keyValueType).toBe('ECDSA_secp256k1');
      expect(txRes.err[1].keyValue).toBe('0x02bc');
      expect(txRes.err[1].err).toBe('Invalid key value');

      expect(txRes.tokenAddress).toBeNull;
    });
  });

  describe('createHederaNonFungibleToken', () => {
    it('should execute createHederaNonFungibleToken then a token address and transaction hash', async () => {
      const txRes = await createHederaNonFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        maxSupply,
        contractId,
        inputKeys,
        msgValue
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.tokenAddress).toBe(MOCK_TOKEN_ADDRESS);
    });

    it('should execute createFungibleTokenWithCustomFeesPublic then a token address and transaction hash', async () => {
      const txRes = await createHederaNonFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        maxSupply,
        contractId,
        inputKeys,
        msgValue,
        feeTokenAddress,
        feeAmount
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.tokenAddress).toBe(MOCK_TOKEN_ADDRESS);
    });

    it('should execute createHederaNonFungibleToken and return error if maxSupply is invalid', async () => {
      const txRes = await createHederaNonFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        -3,
        contractId,
        inputKeys,
        msgValue
      );

      expect(txRes.err).toBe('max supply cannot be negative');
      expect(txRes.tokenAddress).toBeNull;
    });

    it('should execute createHederaNonFungibleToken and return error if treasury address does not match public address standard', async () => {
      const txRes = await createHederaNonFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        maxSupply,
        '0xabc',
        inputKeys,
        msgValue
      );

      expect(txRes.err).toBe('invalid treasury address');
      expect(txRes.tokenAddress).toBeNull;
    });

    it('should execute createHederaNonFungibleToken and return error if fee token address does not match public address standard', async () => {
      const txRes = await createHederaNonFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        maxSupply,
        contractId,
        inputKeys,
        msgValue,
        '0xabc'
      );

      expect(txRes.err).toBe('invalid fee token address');
      expect(txRes.tokenAddress).toBeNull;
    });

    it('should execute createHederaNonFungibleToken and return error if inputKeys is invalid ', async () => {
      const failedKeys: ICommonKeyObject[] = [
        {
          keyType: 'ADMIN',
          keyValueType: 'contractId',
          keyValue: '0xabc', // invalid
        },
        {
          keyType: 'KYC',
          keyValueType: 'contractId',
          keyValue: contractId,
        },
        {
          keyType: 'FREEZE',
          keyValueType: 'ECDSA_secp256k1',
          keyValue: '0x02bc', // invalid
        },
      ];

      const txRes = await createHederaNonFungibleToken(
        baseContract as unknown as Contract,
        tokenName,
        tokenSymbol,
        tokenMemo,
        maxSupply,
        contractId,
        failedKeys,
        msgValue
      );

      expect(txRes.err.length).toBe(2);

      expect(txRes.err[0].keyType).toBe('ADMIN');
      expect(txRes.err[0].keyValueType).toBe('contractId');
      expect(txRes.err[0].keyValue).toBe('0xabc');
      expect(txRes.err[0].err).toBe('Invalid key value');

      expect(txRes.err[1].keyType).toBe('FREEZE');
      expect(txRes.err[1].keyValueType).toBe('ECDSA_secp256k1');
      expect(txRes.err[1].keyValue).toBe('0x02bc');
      expect(txRes.err[1].err).toBe('Invalid key value');

      expect(txRes.tokenAddress).toBeNull;
    });
  });

  describe('mintHederaToken', () => {
    it('should execute mintTokenPublic to mint a FUNGIBLE token then return a transaction hash', async () => {
      const txRes = await mintHederaToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        1200,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(returnedResult);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute mintTokenPublic to mint a NON-FUNGIBLE token then return a transaction hash', async () => {
      const txRes = await mintHederaToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'NON_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        0,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(returnedResult);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute mintTokenPublic to mint a Hedera token and return error when the hederaTokenAddress is invalid', async () => {
      const txRes = await mintHederaToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        '0xabc',
        1200,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('invalid Hedera token address');
      expect(txRes.transactionHash).toBeNull;
      expect(txRes.result).toBeNull;
    });

    it('should execute mintTokenPublic to mint a FUNGIBLE token and return error when the amount to mint is a negative number', async () => {
      const txRes = await mintHederaToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        -1,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('amount to mint cannot be negative when minting a fungible token');
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute mintTokenPublic to mint a NON-FUNGIBLE token and return error when the amount to mint is a non-zero number', async () => {
      const txRes = await mintHederaToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'NON_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        1,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('amount to mint must be 0 when minting a non-fungible token');
      expect(txRes.transactionHash).toBeNull;
      expect(txRes.result).toBeNull;
    });
  });

  describe('mintHederaTokenToAddress', () => {
    it('should execute mintHederaTokenToAddress to mint a FUNGIBLE token and transfer it to the recipient then return a transaction hash', async () => {
      const txRes = await mintHederaTokenToAddress(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        recipient,
        1200,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(returnedResult);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute mintHederaTokenToAddress to mint a NON-FUNGIBLE token and transfer it to the recipient then return a transaction hash', async () => {
      const txRes = await mintHederaTokenToAddress(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'NON_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        recipient,
        0,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(returnedResult);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute mintHederaTokenToAddress to mint a Hedera token and transfer it to the recipient then return error when the hederaTokenAddress is invalid', async () => {
      const txRes = await mintHederaTokenToAddress(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        '0xabc',
        recipient,
        1200,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('invalid Hedera token address');
      expect(txRes.transactionHash).toBeNull;
      expect(txRes.result).toBeNull;
    });

    it('should execute mintHederaTokenToAddress to mint a Hedera token and transfer it to the recipient then return error when the recipientAddress is invalid', async () => {
      const txRes = await mintHederaTokenToAddress(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        '0xabc',
        1200,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('invalid recipient address');
      expect(txRes.transactionHash).toBeNull;
      expect(txRes.result).toBeNull;
    });

    it('should execute mintHederaTokenToAddress to mint a FUNGIBLE token and transfer it to the recipient then return error when the amount to mint is a negative number', async () => {
      const txRes = await mintHederaTokenToAddress(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        recipient,
        -1,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('amount to mint cannot be negative when minting a fungible token');
      expect(txRes.transactionHash).toBeNull;
      expect(txRes.result).toBeNull;
    });

    it('should execute mintHederaTokenToAddress to mint a NON-FUNGIBLE token and transfer it to the recipient then return error when the amount to mint is a non-zero number', async () => {
      const txRes = await mintHederaTokenToAddress(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'NON_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        recipient,
        1,
        metadata,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('amount to mint must be 0 when minting a non-fungible token');
      expect(txRes.transactionHash).toBeNull;
      expect(txRes.result).toBeNull;
    });
  });

  describe('associateHederaTokensToAccounts', () => {
    it('should execute associateHederaTokensToAccounts to associate a token to an account then return a transaction hash', async () => {
      const txRes = await associateHederaTokensToAccounts(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        [MOCK_TOKEN_ADDRESS],
        associtingAccount,
        MOCK_GAS_LIMIT
      );
      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute associateHederaTokensToAccounts to associate a list of tokens to an account then return a transaction hash', async () => {
      const txRes = await associateHederaTokensToAccounts(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        [MOCK_TOKEN_ADDRESS, feeTokenAddress],
        associtingAccount,
        MOCK_GAS_LIMIT
      );
      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute associateHederaTokensToAccounts and return an error when the hederaTokenAddresses array is empty', async () => {
      const txRes = await associateHederaTokensToAccounts(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        [],
        associtingAccount,
        MOCK_GAS_LIMIT
      );
      expect(txRes.err).toBe('must have at least one token address to associate');
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute associateHederaTokensToAccounts and return an error when the associtingAccountAddress is invalid', async () => {
      const txRes = await associateHederaTokensToAccounts(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        [MOCK_TOKEN_ADDRESS, feeTokenAddress],
        '0xabc',
        MOCK_GAS_LIMIT
      );
      expect(txRes.err).toBe('associating account address is invalid');
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute associateHederaTokensToAccounts and return an error when the hederaTokenAddresses array contains invalid token addresses', async () => {
      const invalidTokenAddress = '0xaac';
      const txRes = await associateHederaTokensToAccounts(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        [MOCK_TOKEN_ADDRESS, invalidTokenAddress],
        associtingAccount,
        MOCK_GAS_LIMIT
      );

      expect((txRes.err as any).invalidTokens).toStrictEqual([invalidTokenAddress]);
      expect(txRes.transactionHash).toBeNull;
    });
  });

  describe('grantTokenKYCToAccount', () => {
    it('should execute grantTokenKYCToAccount to associate a token KYC to an account then return a transaction hash', async () => {
      const txRes = await grantTokenKYCToAccount(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        MOCK_TOKEN_ADDRESS,
        grantingKYCAccount,
        MOCK_GAS_LIMIT
      );
      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute grantTokenKYCToAccount to associate a token KYC to an account then return error when hederaTokenAddress is invalid', async () => {
      const txRes = await grantTokenKYCToAccount(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        '0xabc',
        grantingKYCAccount,
        MOCK_GAS_LIMIT
      );
      expect(txRes.err).toBe('invalid Hedera token address');
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute grantTokenKYCToAccount to associate a token KYC to an account then return error when grantingKYCAccountAddress is invalid', async () => {
      const txRes = await grantTokenKYCToAccount(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        MOCK_TOKEN_ADDRESS,
        '0xabc',
        MOCK_GAS_LIMIT
      );
      expect(txRes.err).toBe('invalid associating account address');
      expect(txRes.transactionHash).toBeNull;
    });
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/hts-interactions/token-management-contract/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract } from 'ethers';
import {
  manageTokenStatus,
  manageTokenRelation,
  manageTokenDeduction,
  manageTokenInfomation,
  manageTokenPermission,
} from '@/api/hedera/hts-interactions/tokenManagement-interactions';
import {
  MOCK_TX_HASH,
  MOCK_GAS_LIMIT,
  MOCK_CONTRACT_ID,
  MOCK_TOKEN_ADDRESS,
  MOCK_SIGNER_ADDRESS,
  MOCK_HEDERA_NETWORK,
} from '../../../utils/common/constants';

describe('TokenManagementContract test suite', () => {
  // mock states
  const responseCode = 22;
  const AUTO_RENEW_SECOND = 0;
  const NEW_AUTO_RENEW_PERIOD = 7999900;
  const accountAddress = '0x34810E139b451e0a4c67d5743E956Ac8990842A8';
  const MOCK_TOKEN_ADDRESSES = [
    '0x00000000000000000000000000000000000084b7',
    '0x00000000000000000000000000000000000084b8',
    '0x00000000000000000000000000000000000084b9',
  ];

  const tokenExpiry: IHederaTokenServiceExpiry = {
    second: AUTO_RENEW_SECOND,
    autoRenewAccount: accountAddress,
    autoRenewPeriod: NEW_AUTO_RENEW_PERIOD,
  };

  const tokenInfo: IHederaTokenServiceHederaToken = {
    name: 'udpatedTokenInfo',
    symbol: 'UTI',
    treasury: accountAddress,
    memo: 'UUTI',
    tokenSupplyType: false,
    maxSupply: 3000,
    freezeDefault: false,
    tokenKeys: [],
    expiry: tokenExpiry,
  };

  // mock inputKeys with ICommonKeyObject[] type
  const tokenKeys: ICommonKeyObject[] = [
    {
      keyType: 'ADMIN',
      keyValueType: 'contractId',
      keyValue: MOCK_CONTRACT_ID,
    },
    {
      keyType: 'KYC',
      keyValueType: 'contractId',
      keyValue: MOCK_CONTRACT_ID,
    },
    {
      keyType: 'FREEZE',
      keyValueType: 'contractId',
      keyValue: MOCK_CONTRACT_ID,
    },
    {
      keyType: 'WIPE',
      keyValueType: 'contractId',
      keyValue: MOCK_CONTRACT_ID,
    },
    {
      keyType: 'SUPPLY',
      keyValueType: 'contractId',
      keyValue: MOCK_CONTRACT_ID,
    },
    {
      keyType: 'FEE',
      keyValueType: 'contractId',
      keyValue: MOCK_CONTRACT_ID,
    },
    {
      keyType: 'PAUSE',
      keyValueType: 'contractId',
      keyValue: MOCK_CONTRACT_ID,
    },
  ];

  const contractMockedResolvedValue = {
    wait: jest.fn().mockResolvedValue({
      logs: [
        {
          fragment: {
            name: 'ResponseCode',
          },
          data: responseCode,
        },
      ],
      hash: MOCK_TX_HASH,
    }),
  };

  // mock baseContract object
  const baseContract = {
    updateTokenInfoPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    updateTokenExpiryInfoPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    updateTokenKeysPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    approvePublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    approveNFTPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    setApprovalForAllPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    pauseTokenPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    unpauseTokenPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    revokeTokenKycPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    freezeTokenPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    unfreezeTokenPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    dissociateTokensPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    dissociateTokenPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    wipeTokenAccountPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    wipeTokenAccountNFTPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    burnTokenPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    deleteTokenPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
  };

  describe('manageTokenInfomation test suite', () => {
    it('should execute manageTokenInfomation with API === "UPDATE_INFO" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'UPDATE_INFO',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        tokenInfo
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenInfomation with API === "UPDATE_INFO" then return error if tokenInfo is missing', async () => {
      const txRes = await manageTokenInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'UPDATE_INFO',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        undefined
      );

      expect(txRes.err).toBe('Token information object is needed for UPDATE_INFO API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenInfomation with API === "UPDATE_EXPIRY" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'UPDATE_EXPIRY',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        undefined,
        tokenExpiry
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenInfomation with API === "UPDATE_EXPIRY" then return error if expiryInfo is missing', async () => {
      const txRes = await manageTokenInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'UPDATE_EXPIRY',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        undefined,
        undefined
      );

      expect(txRes.err).toBe('Expiry information object is needed for UPDATE_EXPIRY API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenInfomation with API === "UPDATE_KEYS" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'UPDATE_KEYS',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        undefined,
        undefined,
        tokenKeys
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenInfomation with API === "UPDATE_KEYS" then return error if keysInfo is missing', async () => {
      const txRes = await manageTokenInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'UPDATE_KEYS',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        undefined,
        undefined,
        undefined
      );

      expect(txRes.err).toBe('Keys information object is needed for UPDATE_KEYS API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenInfomation then return an error if MOCK_TOKEN_ADDRESS is not valid success response code and a transaction hash', async () => {
      const txRes = await manageTokenInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'UPDATE_KEYS',
        '0xabc',
        MOCK_GAS_LIMIT,
        undefined,
        undefined,
        tokenKeys
      );

      expect(txRes.err).toBe('Invalid token address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });
  });

  describe('manageTokenPermission test suite', () => {
    it('should execute manageTokenInfomation with API === "APPROVED_FUNGIBLE" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenPermission(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'APPROVED_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        accountAddress,
        MOCK_GAS_LIMIT,
        200
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenInfomation with API === "APPROVED_FUNGIBLE" then return an error if amountToApprove is missing ', async () => {
      const txRes = await manageTokenPermission(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'APPROVED_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        accountAddress,
        MOCK_GAS_LIMIT,
        undefined
      );

      expect(txRes.err).toBe('A valid amount is needed for the APPROVED_FUNGIBLE API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenInfomation with API === "APPROVED_NON_FUNGIBLE" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenPermission(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'APPROVED_NON_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        accountAddress,
        MOCK_GAS_LIMIT,
        undefined,
        20
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenInfomation with API === "APPROVED_NON_FUNGIBLE" then return an error if serialNumber is missing ', async () => {
      const txRes = await manageTokenPermission(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'APPROVED_NON_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        accountAddress,
        MOCK_GAS_LIMIT,
        undefined,
        undefined
      );

      expect(txRes.err).toBe('Serial number is needed for APPROVED_NON_FUNGIBLE API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenInfomation with API === "SET_APPROVAL" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenPermission(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'SET_APPROVAL',
        MOCK_TOKEN_ADDRESS,
        accountAddress,
        MOCK_GAS_LIMIT,
        undefined,
        undefined,
        true
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenInfomation with API === "SET_APPROVAL" then return an error if approvedStatus is missing ', async () => {
      const txRes = await manageTokenPermission(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'SET_APPROVAL',
        MOCK_TOKEN_ADDRESS,
        accountAddress,
        MOCK_GAS_LIMIT,
        undefined,
        undefined,
        undefined
      );

      expect(txRes.err).toBe('Approved status is needed for SET_APPROVAL API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenInfomation then return error if MOCK_TOKEN_ADDRESS is invalid', async () => {
      const txRes = await manageTokenPermission(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'SET_APPROVAL',
        '0xabc',
        accountAddress,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid token address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });
    it('should execute manageTokenInfomation then return error if targetApproveAddress is invalid', async () => {
      const txRes = await manageTokenPermission(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'SET_APPROVAL',
        MOCK_TOKEN_ADDRESS,
        '0xabc',
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid target approved address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });
  });

  describe('manageTokenStatus test suite', () => {
    it('should execute manageTokenStatus with API === "PAUSE" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenStatus(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'PAUSE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenStatus with API === "UNPAUSE" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenStatus(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'UNPAUSE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenStatus then return error if MOCK_TOKEN_ADDRESS is invalid', async () => {
      const txRes = await manageTokenStatus(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'PAUSE',
        '0xabc',
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid token address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });
  });

  describe('manageTokenRelation test suite', () => {
    it('should execute manageTokenRelation with API === "REVOKE_KYC" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenRelation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'REVOKE_KYC',
        accountAddress,
        MOCK_GAS_LIMIT,
        MOCK_TOKEN_ADDRESS
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenRelation with API === "FREEZE" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenRelation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FREEZE',
        accountAddress,
        MOCK_GAS_LIMIT,
        MOCK_TOKEN_ADDRESS
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });
    it('should execute manageTokenRelation with API === "UNFREEZE" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenRelation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'UNFREEZE',
        accountAddress,
        MOCK_GAS_LIMIT,
        MOCK_TOKEN_ADDRESS
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });
    it('should execute manageTokenRelation with API === "DISSOCIATE_TOKEN" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenRelation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'DISSOCIATE_TOKEN',
        accountAddress,
        MOCK_GAS_LIMIT,
        MOCK_TOKEN_ADDRESS,
        MOCK_TOKEN_ADDRESSES
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenRelation then return error if accountAddress is invalid', async () => {
      const txRes = await manageTokenRelation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'REVOKE_KYC',
        '0xabc',
        MOCK_GAS_LIMIT,
        MOCK_TOKEN_ADDRESS
      );

      expect(txRes.err).toBe('Invalid account address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenRelation then return error if MOCK_TOKEN_ADDRESSES contains an invalid token address', async () => {
      const txRes = await manageTokenRelation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'REVOKE_KYC',
        accountAddress,
        MOCK_GAS_LIMIT,
        MOCK_TOKEN_ADDRESS,
        [MOCK_TOKEN_ADDRESS, '0xabc']
      );

      expect(txRes.err).toBe('Invalid token addresses');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });
  });

  describe('manageTokenDeduction test suite', () => {
    it('should execute manageTokenDeduction with API === "WIPE_FUNGIBLE" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'WIPE_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        accountAddress,
        120
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenDeduction with API === "WIPE_FUNGIBLE" then return an error if accountAddress is missing', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'WIPE_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Account address is needed for WIPE_FUNGIBLE API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenDeduction with API === "WIPE_FUNGIBLE" then return an error if amount is missing', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'WIPE_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        accountAddress
      );

      expect(txRes.err).toBe('Amount is needed for WIPE_FUNGIBLE API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenDeduction with API === "WIPE_NON_FUNGIBLE" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'WIPE_NON_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        accountAddress,
        undefined,
        [120]
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenDeduction with API === "WIPE_NON_FUNGIBLE" then return an error if accountAddress is missing', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'WIPE_NON_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Account address is needed for WIPE_NON_FUNGIBLE API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenDeduction with API === "WIPE_NON_FUNGIBLE" then return an error if serialNumber is missing', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'WIPE_NON_FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        accountAddress
      );

      expect(txRes.err).toBe('Serial number is needed for WIPE_NON_FUNGIBLE API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenDeduction with API === "BURN" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'BURN',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        undefined,
        120,
        [120]
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenDeduction with API === "BURN" then return an error if amount is missing', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'BURN',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        accountAddress
      );

      expect(txRes.err).toBe('Amount/serial number is needed for BURN API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenDeduction with API === "BURN" then return an error if serialNumber is missing', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'BURN',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        undefined,
        undefined
      );

      expect(txRes.err).toBe('Amount/serial number is needed for BURN API');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenDeduction with API === "DELETE" then return a success response code and a transaction hash', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'DELETE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute manageTokenDeduction then return error if MOCK_TOKEN_ADDRESS is invalid', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'DELETE',
        '0xabc',
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid token address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenDeduction then return error if accountAddress is invalid', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'DELETE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        '0xabc'
      );

      expect(txRes.err).toBe('Invalid account address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenDeduction then return error if amount is invalid', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'DELETE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        accountAddress,
        -9
      );

      expect(txRes.err).toBe('Amount cannot be negative');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute manageTokenDeduction then return error if accountAddress is invalid', async () => {
      const txRes = await manageTokenDeduction(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'DELETE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        accountAddress,
        120,
        [-9]
      );

      expect(txRes.err).toBe('Serial number cannot be negative');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/hts-interactions/token-query-contract/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract } from 'ethers';
import {
  queryTokenValidity,
  queryTokenStatusInformation,
  queryTokenGeneralInfomation,
  queryTokenSpecificInfomation,
  queryTokenPermissionInformation,
} from '@/api/hedera/hts-interactions/tokenQuery-interactions';
import {
  MOCK_TX_HASH,
  MOCK_GAS_LIMIT,
  MOCK_TOKEN_ADDRESS,
  MOCK_HEDERA_NETWORK,
  MOCK_SIGNER_ADDRESS,
} from '../../../utils/common/constants';

// mock convertsArgsProxyToHTSTokenInfo
jest.mock('../../../../src/utils/contract-interactions/HTS/helpers.ts', () => {
  const actualModule = jest.requireActual('../../../../src/utils/contract-interactions/HTS/helpers.ts');

  return {
    ...actualModule,
    convertsArgsProxyToHTSTokenInfo: jest.fn().mockReturnValue('mockedEventReturnedValue'),
    convertsArgsProxyToHTSSpecificInfo: jest.fn().mockReturnValue('mockedEventReturnedValue'),
  };
});

describe('TokenQueryContract Test Suite', () => {
  // mock states
  const keyType = 1;
  const serialNumber = 36;
  const mockedEventReturnedValue = 'mockedEventReturnedValue';
  const ownerAddress = '0xCC07a8243578590d55c5708D7fB453245350Cc2A';
  const spenderAddress = '0x34810E139b451e0a4c67d5743E956Ac8990842A8';

  // prepare contract mocked value
  const contractTokenInfoMockedResolvedValue = (eventName: string) => {
    return jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({
        logs: [
          {
            fragment: {
              name: eventName,
            },
            data: mockedEventReturnedValue,
            args: {
              tokenInfo: mockedEventReturnedValue,
            },
          },
        ],
        hash: MOCK_TX_HASH,
      }),
    });
  };
  const contractMockedResolvedValue = (eventName: string) => {
    return jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({
        logs: [
          {
            fragment: {
              name: eventName,
            },
            data: mockedEventReturnedValue,
            args: mockedEventReturnedValue,
          },
        ],
        hash: MOCK_TX_HASH,
      }),
    });
  };

  // mock baseContract object
  const baseContract = {
    isTokenPublic: contractMockedResolvedValue('IsToken'),
    isFrozenPublic: contractMockedResolvedValue('Frozen'),
    isKycPublic: contractMockedResolvedValue('KycGranted'),
    getTokenKeyPublic: contractMockedResolvedValue('TokenKey'),
    getTokenTypePublic: contractMockedResolvedValue('TokenType'),
    allowancePublic: contractMockedResolvedValue('AllowanceValue'),
    isApprovedForAllPublic: contractMockedResolvedValue('Approved'),
    getApprovedPublic: contractMockedResolvedValue('ApprovedAddress'),
    getTokenInfoPublic: contractTokenInfoMockedResolvedValue('TokenInfo'),
    getTokenCustomFeesPublic: contractMockedResolvedValue('TokenCustomFees'),
    getTokenExpiryInfoPublic: contractMockedResolvedValue('TokenExpiryInfo'),
    getTokenDefaultKycStatusPublic: contractMockedResolvedValue('TokenDefaultKycStatus'),
    getFungibleTokenInfoPublic: contractTokenInfoMockedResolvedValue('FungibleTokenInfo'),
    getNonFungibleTokenInfoPublic: contractTokenInfoMockedResolvedValue('NonFungibleTokenInfo'),
    getTokenDefaultFreezeStatusPublic: contractMockedResolvedValue('TokenDefaultFreezeStatus'),
  };

  describe('queryTokenValidity test suite', () => {
    it('should execute queryTokenValidity then return info value from event', async () => {
      const txRes = await queryTokenValidity(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.IsToken).toBe(mockedEventReturnedValue);
    });
  });

  describe('queryTokenGeneralInfomation test suite', () => {
    it('should execute queryTokenGeneralInfomation wit API === "TOKEN" then return info value from event', async () => {
      const txRes = await queryTokenGeneralInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'TOKEN',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.TokenInfo).toBe(mockedEventReturnedValue);
    });

    it('should execute queryTokenGeneralInfomation wit API === "FUNGIBLE" then return info value from event', async () => {
      const txRes = await queryTokenGeneralInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.FungibleTokenInfo).toBe(mockedEventReturnedValue);
    });

    it('should execute queryTokenGeneralInfomation wit API === "NON_FUNFIBLE" then return info value from event', async () => {
      const txRes = await queryTokenGeneralInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'NON_FUNFIBLE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        serialNumber
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.NonFungibleTokenInfo).toBe(mockedEventReturnedValue);
    });
  });

  describe('queryTokenSpecificInfomation test suite', () => {
    it('should execute queryTokenSpecificInfomation wit API === "KYC_STATUS" then return info value from event', async () => {
      const txRes = await queryTokenSpecificInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'DEFAULT_KYC_STATUS',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.TokenDefaultKycStatus).toBe(mockedEventReturnedValue);
    });

    it('should execute queryTokenSpecificInfomation wit API === "FREEZE_STATUS" then return info value from event', async () => {
      const txRes = await queryTokenSpecificInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'DEFAULT_FREEZE_STATUS',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.TokenDefaultFreezeStatus).toBe(mockedEventReturnedValue);
    });

    it('should execute queryTokenSpecificInfomation wit API === "CUSTOM_FEES" then return info value from event', async () => {
      const txRes = await queryTokenSpecificInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'CUSTOM_FEES',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.TokenCustomFees).toBe(mockedEventReturnedValue);
    });

    it('should execute queryTokenSpecificInfomation wit API === "TOKEN_TYPE" then return info value from event', async () => {
      const txRes = await queryTokenSpecificInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'TOKEN_TYPE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.TokenType).toBe(mockedEventReturnedValue);
    });

    it('should execute queryTokenSpecificInfomation wit API === "TOKEN_KEYS" then return info value from event', async () => {
      const txRes = await queryTokenSpecificInfomation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'TOKEN_KEYS',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        keyType as any
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.TokenKey).toBe(mockedEventReturnedValue);
    });
  });

  describe('queryTokenPermissionInformation test suite', () => {
    it('should execute queryTokenPermissionInformation wit API === "ALLOWANCE" then return info value from event', async () => {
      const txRes = await queryTokenPermissionInformation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'ALLOWANCE',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        ownerAddress,
        spenderAddress
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.AllowanceValue).toBe(mockedEventReturnedValue);
    });

    it('should execute queryTokenPermissionInformation wit API === "GET_APPROVED" then return info value from event', async () => {
      const txRes = await queryTokenPermissionInformation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'GET_APPROVED',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        ownerAddress,
        spenderAddress,
        serialNumber
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.ApprovedAddress).toBe(mockedEventReturnedValue);
    });

    it('should execute queryTokenPermissionInformation wit API === "IS_APPROVAL" then return info value from event', async () => {
      const txRes = await queryTokenPermissionInformation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'IS_APPROVAL',
        MOCK_TOKEN_ADDRESS,
        MOCK_GAS_LIMIT,
        ownerAddress,
        spenderAddress,
        serialNumber
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.Approved).toBe(mockedEventReturnedValue);
    });
  });

  describe('queryTokenStatusInformation test suite', () => {
    it('should execute queryTokenStatusInformation wit API === "IS_KYC" then return info value from event', async () => {
      const txRes = await queryTokenStatusInformation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'IS_KYC',
        MOCK_TOKEN_ADDRESS,
        ownerAddress,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.KycGranted).toBe(mockedEventReturnedValue);
    });

    it('should execute queryTokenStatusInformation wit API === "IS_FROZEN" then return info value from event', async () => {
      const txRes = await queryTokenStatusInformation(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'IS_FROZEN',
        MOCK_TOKEN_ADDRESS,
        ownerAddress,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
      expect(txRes.Frozen).toBe(mockedEventReturnedValue);
    });
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/hts-interactions/token-transfer-contract/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract } from 'ethers';
import {
  MOCK_TX_HASH,
  MOCK_GAS_LIMIT,
  MOCK_RESPONSE_CODE,
  MOCK_TOKEN_ADDRESS,
  MOCK_HEDERA_NETWORK,
  MOCK_SIGNER_ADDRESS,
} from '../../../utils/common/constants';
import {
  transferCrypto,
  transferSingleToken,
  transferFungibleTokens,
  transferNonFungibleTokens,
} from '@/api/hedera/hts-interactions/tokenTransfer-interactions';

describe('TokenTransferContract test suite', () => {
  const quantity = 369;
  const invalidSender = '0xabc';
  const nonFungibleAmounts = [3, 6, 9];
  const fungibleAmounts = [-18, 3, 6, 9];
  const senderA = '0xDd7fCb7c2ee96A79B1e201d25F5E43d6a0cED5e6';
  const senderB = '0x0851072d7bB726305032Eff23CB8fd22eB74c85B';
  const receiverA = '0x7a35433804d8Cd070d98d66C6E9b45c6C32C3CDD';
  const receiverB = '0x9de0881b3110aA8cAD1dF3182B1eB6F14d1608a2';

  const contractMockedResolvedValue = {
    wait: jest.fn().mockResolvedValue({
      logs: [
        {
          fragment: {
            name: 'ResponseCode',
          },
          data: MOCK_RESPONSE_CODE,
        },
      ],
      hash: MOCK_TX_HASH,
    }),
  };

  // mock baseContract object
  const baseContract = {
    cryptoTransferPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    transferTokensPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    transferNFTsPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    transferTokenPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    transferNFTPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    transferFromPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
    transferFromNFTPublic: jest.fn().mockResolvedValue(contractMockedResolvedValue),
  };

  describe('transferCrypto test suite', () => {
    // prepare transferList:IHederaTokenServiceTransferList param
    const transfers = [
      {
        accountID: senderA,
        amount: 369,
        isApproval: true,
      },
    ];
    const transferList: IHederaTokenServiceTransferList = {
      transfers,
    };

    // prepare tokenTransferList: IHederaTokenServiceTokenTransferList
    const nftTransfers = [
      {
        senderAccountID: senderA,
        receiverAccountID: receiverA,
        serialNumber: 3,
        isApproval: false,
      },
    ];
    const tokenTransferList: IHederaTokenServiceTokenTransferList[] = [
      {
        token: MOCK_TOKEN_ADDRESS,
        transfers,
        nftTransfers,
      },
    ];

    it('should execute transferCrypto then return a successful response code', async () => {
      const txRes = await transferCrypto(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        transferList,
        tokenTransferList,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });
  });

  describe('transferFungibleTokens test suite', () => {
    it('should execute transferFungibleTokens then return a successful response code', async () => {
      const txRes = await transferFungibleTokens(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        MOCK_TOKEN_ADDRESS,
        [senderA, senderB],
        fungibleAmounts,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute transferFungibleTokens with an invalid token address then return an error', async () => {
      const txRes = await transferFungibleTokens(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        '0xabc',
        [senderA, senderB],
        fungibleAmounts,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid token address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferFungibleTokens with an invalid sender ID then return an error', async () => {
      const txRes = await transferFungibleTokens(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        MOCK_TOKEN_ADDRESS,
        [senderA, '0xabc'],
        fungibleAmounts,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe(`${invalidSender} is an invalid accountID`);
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferFungibleTokens with an invalid amount then return an error', async () => {
      const txRes = await transferFungibleTokens(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        MOCK_TOKEN_ADDRESS,
        [senderA, senderB],
        [-9, -3, 6],
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe(`-3 is an invalid amount`);
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });
  });

  describe('transferNonFungibleTokens test suite', () => {
    it('should execute transferNonFungibleTokens then return a successful response code', async () => {
      const txRes = await transferNonFungibleTokens(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        MOCK_TOKEN_ADDRESS,
        [senderA, senderB],
        [receiverA, receiverB],
        nonFungibleAmounts,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute transferNonFungibleTokens with an invalid token address then return an error', async () => {
      const txRes = await transferNonFungibleTokens(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        '0xabc',
        [senderA, senderB],
        [receiverA, receiverB],
        nonFungibleAmounts,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid token address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferNonFungibleTokens with an invalid sender ID then return an error', async () => {
      const txRes = await transferNonFungibleTokens(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        MOCK_TOKEN_ADDRESS,
        [senderA, '0xabc'],
        [receiverA, receiverB],
        nonFungibleAmounts,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe(`${invalidSender} is an invalid sender accountID`);
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferNonFungibleTokens with an invalid receiver ID then return an error', async () => {
      const txRes = await transferNonFungibleTokens(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        MOCK_TOKEN_ADDRESS,
        [senderA, senderB],
        [receiverA, '0xabc'],
        nonFungibleAmounts,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe(`${invalidSender} is an invalid receiver accountID`);
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferNonFungibleTokens with an invalid amount then return an error', async () => {
      const txRes = await transferNonFungibleTokens(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        MOCK_TOKEN_ADDRESS,
        [senderA, senderB],
        [receiverA, receiverB],
        [-3, 6, 9],
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe(`-3 is an invalid serial number`);
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });
  });

  describe('transferSingleToken test suite', () => {
    it('should execute transferSingleToken with API === "FUNGIBLE" then return a successful response code', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        senderA,
        receiverA,
        quantity,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute transferSingleToken with API === "NFT" then return a successful response code', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'NFT',
        MOCK_TOKEN_ADDRESS,
        senderA,
        receiverA,
        quantity,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute transferSingleToken with an invalid token address then return an error', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        '0xabc',
        senderA,
        receiverA,
        quantity,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid token address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferSingleToken with an invalid sender accountID then return an error', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        '0xabc',
        receiverA,
        quantity,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid sender address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferSingleToken with an invalid receiver accountID then return an error', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        senderA,
        '0xabc',
        quantity,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid receiver address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferSingleToken with an invalid quantity then return an error', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE',
        MOCK_TOKEN_ADDRESS,
        senderA,
        receiverB,
        quantity * -1,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid quantity');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });
  });

  describe('transferSingleTokenFrom test suite', () => {
    it('should execute transferSingleTokenFrom with API === "FUNGIBLE" then return a successful response code', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE_FROM',
        MOCK_TOKEN_ADDRESS,
        senderA,
        receiverA,
        quantity,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute transferSingleTokenFrom with API === "NFT_FROM" then return a successful response code', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'NFT_FROM',
        MOCK_TOKEN_ADDRESS,
        senderA,
        receiverA,
        quantity,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBeNull;
      expect(txRes.result).toBe(true);
      expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    });

    it('should execute transferSingleTokenFrom with an invalid token address then return an error', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE_FROM',
        '0xabc',
        senderA,
        receiverA,
        quantity,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid token address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferSingleTokenFrom with an invalid sender accountID then return an error', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE_FROM',
        MOCK_TOKEN_ADDRESS,
        '0xabc',
        receiverA,
        quantity,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid sender address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferSingleTokenFrom with an invalid receiver accountID then return an error', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE_FROM',
        MOCK_TOKEN_ADDRESS,
        senderA,
        '0xabc',
        quantity,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid receiver address');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });

    it('should execute transferSingleTokenFrom with an invalid quantity then return an error', async () => {
      const txRes = await transferSingleToken(
        baseContract as unknown as Contract,
        MOCK_SIGNER_ADDRESS,
        MOCK_HEDERA_NETWORK,
        'FUNGIBLE_FROM',
        MOCK_TOKEN_ADDRESS,
        senderA,
        receiverB,
        quantity * -1,
        MOCK_GAS_LIMIT
      );

      expect(txRes.err).toBe('Invalid quantity');
      expect(txRes.result).toBeNull;
      expect(txRes.transactionHash).toBeNull;
    });
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/ihrc-interactions/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import { ethers } from 'ethers';
import { handleIHRC719APIs } from '@/api/hedera/ihrc-interactions';
import {
  MOCK_GAS_LIMIT,
  MOCK_HEDERA_NETWORK,
  MOCK_TOKEN_ADDRESS,
  MOCK_TX_HASH,
} from '../../utils/common/constants';

// Mock the ethers.Contract constructor
jest.mock('ethers', () => {
  const actualEthers = jest.requireActual('ethers');
  return {
    ...actualEthers,
    Contract: jest.fn().mockImplementation(() => ({
      associate: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ hash: MOCK_TX_HASH }),
      }),
      dissociate: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ hash: MOCK_TX_HASH }),
      }),
    })),
  };
});

describe('handleIHR719CAPIs test suite', () => {
  it("should execute handleIHRCAPI() with API === 'ASSOCIATE' and return a success response code and a transaction hash", async () => {
    const txRes = await handleIHRC719APIs(
      'ASSOCIATE',
      MOCK_TOKEN_ADDRESS,
      {} as ethers.JsonRpcSigner,
      MOCK_GAS_LIMIT,
      MOCK_HEDERA_NETWORK
    );

    expect(txRes.err).toBeNull;
    expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
  });

  it("should execute handleIHRCAPI() with API === 'DISSOCIATE' and return a success response code and a transaction hash", async () => {
    const txRes = await handleIHRC719APIs(
      'DISSOCIATE',
      MOCK_TOKEN_ADDRESS,
      {} as ethers.JsonRpcSigner,
      MOCK_GAS_LIMIT,
      MOCK_HEDERA_NETWORK
    );

    expect(txRes.err).toBeNull;
    expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
  });

  it("should execute handleIHRCAPI() with API === 'ASSOCIATE' and return error if hederaTokenAddress is not valid", async () => {
    const txRes = await handleIHRC719APIs(
      'ASSOCIATE',
      '0xabc',
      {} as ethers.JsonRpcSigner,
      MOCK_GAS_LIMIT,
      MOCK_HEDERA_NETWORK
    );

    expect(txRes.err).toBe('Invalid token address');
    expect(txRes.transactionHash).toBeNull;
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import { ContractFactory } from 'ethers';
import { deploySmartContract } from '@/api/hedera';
import { IHederaSmartContractResult } from '@/types/common';
import { HEDERA_SMART_CONTRACTS_ASSETS } from '@/utils/common/constants';
import { MOCK_CONTRACT_ID, MOCK_TX_HASH } from '../utils/common/constants';

// Mock ethers
jest.mock('ethers', () => {
  const actualEthers = jest.requireActual('ethers');
  return {
    ...actualEthers,
    ContractFactory: jest.fn(),
  };
});

// Mock the getWalletProvider function
jest.mock('../../src/api/wallet', () => {
  const actualModule = jest.requireActual('../../src/api/wallet');

  return {
    ...actualModule,
    getWalletProvider: jest.fn().mockImplementation(() => ({
      err: null,
      walletProvider: { getSigner: jest.fn() },
    })),
  };
});

describe('deploySmartContract', () => {
  beforeEach(() => {
    (ContractFactory as unknown as jest.Mock).mockClear();
  });

  it('should deploy the smart contract', async () => {
    // prepare states
    const deployParams = [100];
    const contractABI = HEDERA_SMART_CONTRACTS_ASSETS.EXCHANGE_RATE.contractABI;
    const contractBytecode = HEDERA_SMART_CONTRACTS_ASSETS.EXCHANGE_RATE.contractBytecode;

    // mock contractDeployTx
    const mockContractDeployTx = {
      getAddress: jest.fn().mockResolvedValue(MOCK_CONTRACT_ID),
      deploymentTransaction: jest.fn().mockResolvedValue({
        hash: MOCK_TX_HASH,
      }),
    };

    // mock contract
    const mockContract = {
      deploy: jest.fn().mockResolvedValue(mockContractDeployTx),
    };

    // mock contract factory
    (ContractFactory as unknown as jest.Mock).mockImplementation(() => mockContract);

    // execute deploySmartContract API
    const result: IHederaSmartContractResult = await deploySmartContract(
      contractABI,
      contractBytecode,
      deployParams
    );

    // validation
    expect(result.err).toBeNull;
    expect(deploySmartContract).toBeCalled;
    expect(result.contractAddress).toEqual(MOCK_CONTRACT_ID);
    expect(mockContractDeployTx.getAddress).toHaveBeenCalled();
    expect(mockContract.deploy).toHaveBeenCalledWith(...deployParams, { gasLimit: 4_000_000 });
  });
});
// Filename: system-contract-dapp-playground/__tests__/hedera/prng-interactions/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract } from 'ethers';
import { handlePRGNAPI } from '@/api/hedera/prng-interactions';
import {
  MOCK_TX_HASH,
  MOCK_GAS_LIMIT,
  MOCK_HEDERA_NETWORK,
  MOCK_SIGNER_ADDRESS,
} from '../../utils/common/constants';

describe('PRNG Test Suite', () => {
  const pseudoRandomeSeed = '0xfa50a79075af247b11ea6e7e492d10e96f66237a9f8352ac92473580d23ec924';

  // mock baseContract object
  const baseContract = {
    getPseudorandomSeed: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({
        logs: [
          {
            fragment: {
              name: 'PseudoRandomSeed',
            },
            data: pseudoRandomeSeed,
          },
        ],
        hash: MOCK_TX_HASH,
      }),
    }),
  };

  it('should execute handlePRGNAPI then return a transaction hash and a pseudo random seed', async () => {
    const txRes = await handlePRGNAPI(
      baseContract as unknown as Contract,
      MOCK_SIGNER_ADDRESS,
      MOCK_HEDERA_NETWORK,
      MOCK_GAS_LIMIT
    );

    expect(txRes.err).toBeNull;
    expect(txRes.transactionHash).toBe(MOCK_TX_HASH);
    expect(txRes.pseudoRandomSeed).toBe(pseudoRandomeSeed);
  });
});
// Filename: system-contract-dapp-playground/__tests__/mirror-node/index.test.ts
/*-
 *
 * Hedera Smart Contracts
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

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { TNetworkName } from '@/types/common';
import { HEDERA_NETWORKS } from '@/utils/common/constants';
import { estimateGasViaMirrorNode, getHederaNativeIDFromEvmAddress } from '@/api/mirror-node';

// Create a new instance of MockAdapter
const RestMock = new MockAdapter(axios);

describe('Mirror Node Test Suite', () => {
  it('should match mirror-node url dynamically based on different networks', async () => {
    const evmAddress = '0xCC07a8243578590d55c5708D7fB453245350Cc2A';
    const networks: TNetworkName[] = ['mainnet', 'testnet', 'previewnet', 'localnet'];

    networks.forEach((network) => {
      const experimentUrl = `${HEDERA_NETWORKS[network].mirrorNodeUrl}/accounts/${evmAddress}`;

      let expectedUrl = ``;
      if (network === 'localnet') {
        expectedUrl = `http://127.0.0.1:5600/api/v1/accounts/${evmAddress}`;
      } else {
        expectedUrl = `https://${network}.mirrornode.hedera.com/api/v1/accounts/${evmAddress}`;
      }
      expect(experimentUrl).toBe(expectedUrl);
    });
  });

  it('should match mirror-node url dynamically based on different params', async () => {
    const evmAddress = '0xCC07a8243578590d55c5708D7fB453245350Cc2A';
    const network: TNetworkName = 'mainnet';
    const params = ['accounts', 'contracts'];

    params.forEach((param) => {
      const experimentUrl = `${HEDERA_NETWORKS[network].mirrorNodeUrl}/${param}/${evmAddress}`;

      let expectedUrl = `https://${network}.mirrornode.hedera.com/api/v1/${param}/${evmAddress}`;
      expect(experimentUrl).toBe(expectedUrl);
    });
  });

  it('should call getHederaNativeIDFromEvmAddress() and return the expected values', async () => {
    const accountParam = 'accounts';
    const contractParam = 'contracts';
    const network: TNetworkName = 'testnet';
    const expectedHederaNativeId = '0.0.445445';
    const evmAddress = '0xCC07a8243578590d55c5708D7fB453245350Cc2A';

    const mockAccountResponse = { account: expectedHederaNativeId };
    const mockContractResponse = { contract_id: expectedHederaNativeId };

    const expectedAccountUrl = `https://${network}.mirrornode.hedera.com/api/v1/${accountParam}/${evmAddress}`;
    const expectedContractUrl = `https://${network}.mirrornode.hedera.com/api/v1/${contractParam}/${evmAddress}`;

    RestMock.onGet(expectedAccountUrl).reply(200, mockAccountResponse);
    RestMock.onGet(expectedContractUrl).reply(200, mockContractResponse);

    const accountResult = await getHederaNativeIDFromEvmAddress(evmAddress, network, accountParam);
    const contractResult = await getHederaNativeIDFromEvmAddress(evmAddress, network, contractParam);

    expect(accountResult.accountId).toBe(expectedHederaNativeId);
    expect(contractResult.contractId).toBe(expectedHederaNativeId);
  });

  it('should call estimateGasViaMirrorNode() and return the expected values', async () => {
    const network: TNetworkName = 'testnet';
    const to = '0x701962ab7ce76b0367c400ffcde5867aa584999c';
    const from = '0xc9f01be8d573a0b4ba8a4c9c23d6c775176dffa1';
    const data = '0xf2f38a74000000000000000000000000000000000000000000000000000000000000e8f5';
    const expectedGasLimit = '0x0000000000017a49';

    const expectedUrl = `https://${network}.mirrornode.hedera.com/api/v1/contracts/call`;
    RestMock.onPost(expectedUrl).reply(200, { result: expectedGasLimit });

    const estimateGas = await estimateGasViaMirrorNode(to, from, data, network);

    expect(estimateGas.err).toBeNull;
    expect(estimateGas.gasLimit).toBe(expectedGasLimit);
  });
});
// Filename: system-contract-dapp-playground/__tests__/utils/common/constants.ts
/*-
 *
 * Hedera Smart Contracts
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

export const MOCK_RESPONSE_CODE = 22;
export const MOCK_GAS_LIMIT = 1_000_000;
export const MOCK_HEDERA_NETWORK = 'testnet';
export const MOCK_CONTRACT_ID = '0xDd7fCb7c2ee96A79B1e201d25F5E43d6a0cED5e6';
export const MOCK_SIGNER_ADDRESS = '0x21725B0AE10F52eC4D587D51B37732Badb223D94';
export const MOCK_TOKEN_ADDRESS = '0x00000000000000000000000000000000000084b7';
export const MOCK_TX_HASH = '0x63424020a69bf46a0669f46dd66addba741b9c02d37fab1686428f5209bc759d';
// Filename: system-contract-dapp-playground/prerequisite-check/contracts-info/index.ts
/*-
 *
 * Hedera Smart Contracts
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

/**
 * @dev setting up the directory/location information for smart contract assets
 */
const getHederaSmartContractAssets = (HederaSmartContractsRootPath: string) => {
  return {
    TokenCreateCustomContract: {
      name: 'TokenCreateCustomContract',
      contractPath: `${HederaSmartContractsRootPath}/contracts/system-contracts/hedera-token-service/examples/token-create/TokenCreateCustom.sol`,
      artifactPath: `${HederaSmartContractsRootPath}/artifacts/contracts/system-contracts/hedera-token-service/examples/token-create/TokenCreateCustom.sol/TokenCreateCustomContract.json`,
    },
    TokenManagementContract: {
      name: 'TokenManagementContract',
      contractPath: `${HederaSmartContractsRootPath}/contracts/system-contracts/hedera-token-service/examples/token-manage/TokenManagementContract.sol`,
      artifactPath: `${HederaSmartContractsRootPath}/artifacts/contracts/system-contracts/hedera-token-service/examples/token-manage/TokenManagementContract.sol/TokenManagementContract.json`,
    },
    TokenQueryContract: {
      name: 'TokenQueryContract',
      contractPath: `${HederaSmartContractsRootPath}/contracts/system-contracts/hedera-token-service/examples/token-query/TokenQueryContract.sol`,
      artifactPath: `${HederaSmartContractsRootPath}/artifacts/contracts/system-contracts/hedera-token-service/examples/token-query/TokenQueryContract.sol/TokenQueryContract.json`,
    },
    TokenTransferContract: {
      name: 'TokenTransferContract',
      contractPath: `${HederaSmartContractsRootPath}/contracts/system-contracts/hedera-token-service/examples/token-transfer/TokenTransferContract.sol`,
      artifactPath: `${HederaSmartContractsRootPath}/artifacts/contracts/system-contracts/hedera-token-service/examples/token-transfer/TokenTransferContract.sol/TokenTransferContract.json`,
    },
    IHRC719Contract: {
      name: 'IHRC719Contract',
      contractPath: `${HederaSmartContractsRootPath}/contracts/system-contracts/hedera-token-service/IHRC719.sol`,
      artifactPath: `${HederaSmartContractsRootPath}/artifacts/contracts/system-contracts/hedera-token-service/IHRC719.sol/IHRC719.json`,
    },
    ExchangeRateMock: {
      name: 'ExchangeRateMock',
      contractPath: `${HederaSmartContractsRootPath}/contracts/system-contracts/exchange-rate/ExchangeRateMock.sol`,
      artifactPath: `${HederaSmartContractsRootPath}/artifacts/contracts/system-contracts/exchange-rate/ExchangeRateMock.sol/ExchangeRateMock.json`,
    },
    PrngSystemContract: {
      name: 'PrngSystemContract',
      contractPath: `${HederaSmartContractsRootPath}/contracts/system-contracts/pseudo-random-number-generator/PrngSystemContract.sol`,
      artifactPath: `${HederaSmartContractsRootPath}/artifacts/contracts/system-contracts/pseudo-random-number-generator/PrngSystemContract.sol/PrngSystemContract.json`,
    },
    ERC20Mock: {
      name: 'ERC20Mock',
      contractPath: `${HederaSmartContractsRootPath}/contracts/openzeppelin/ERC-20/ERC20Mock.sol`,
      artifactPath: `${HederaSmartContractsRootPath}/artifacts/contracts/openzeppelin/ERC-20/ERC20Mock.sol/OZERC20Mock.json`,
    },
    ERC721Mock: {
      name: 'ERC721Mock',
      contractPath: `${HederaSmartContractsRootPath}/contracts/openzeppelin/ERC-721/ERC721Mock.sol`,
      artifactPath: `${HederaSmartContractsRootPath}/artifacts/contracts/openzeppelin/ERC-721/ERC721Mock.sol/OZERC721Mock.json`,
    },
  };
};

module.exports = getHederaSmartContractAssets;
// Filename: system-contract-dapp-playground/prerequisite-check/scripts/index.ts
/*-
 *
 * Hedera Smart Contracts
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

const fs = require('fs');
const path = require('path');
const getHederaSmartContractAssetsFunc = require('../contracts-info');

/** @dev resolves the root path of the hedera smart contracts repo */
const HederaSmartContractsRootPath = path.resolve(__dirname, '..', '..', '..');

if (
  !fs.existsSync(`${HederaSmartContractsRootPath}/artifacts`) ||
  !fs.existsSync(`${HederaSmartContractsRootPath}/contracts`)
) {
  console.error(
    '❌ CONTRACT ASSETS UNAVAILABLE! ❌\nPlease ensure to compile the smart contracts first by navigating to the `hedera-smart-contracts` root directory and running `npm i` and `npx hardhat compile` commands.'
  );
  process.exit();
}

/** @dev retrieves smart contract assets */
const HEDERA_SMART_CONTRACTS = getHederaSmartContractAssetsFunc(HederaSmartContractsRootPath);

/** @dev validation check that ensure availability of the contract assets (artifact files or solidity contract files) */
(() => {
  type ValidatingError = {
    name: string;
    type: 'ABI' | 'SOL';
    path: string;
  };

  const validatingError: ValidatingError[] = [];

  const contractNames = [
    'TokenCreateCustomContract',
    'TokenManagementContract',
    'TokenTransferContract',
    'PrngSystemContract',
    'ExchangeRateMock',
    'TokenQueryContract',
    'IHRC719Contract',
    'ERC20Mock',
    'ERC721Mock',
  ];

  contractNames.forEach((name) => {
    if (!fs.existsSync(HEDERA_SMART_CONTRACTS[name].contractPath)) {
      validatingError.push({ name, type: 'SOL', path: HEDERA_SMART_CONTRACTS[name].contractPath });
    }
    if (!fs.existsSync(HEDERA_SMART_CONTRACTS[name].artifactPath)) {
      validatingError.push({ name, type: 'ABI', path: HEDERA_SMART_CONTRACTS[name].artifactPath });
    }
  });

  if (validatingError.length > 0) {
    console.error('❌ CONTRACT ASSETS UNAVAILABLE! ❌');
    validatingError.forEach((error) => {
      console.error(
        `Missing ${error.type === 'ABI' ? 'artifacts' : 'solidity contract'} file at ${error.path}`
      );
    });

    console.error(
      '\nPlease ensure to compile the smart contracts first by navigating to the `hedera-smart-contracts` root directory and running `npm i` and `npx hardhat compile` commands.'
    );
  } else {
    console.log(`✅ Validation successful! Contract assets are available! ✅`);
  }
})();
// Filename: system-contract-dapp-playground/src/api/cookies/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import Cookies from 'js-cookie';

/**
 * @dev store the connected accounts array and network info to client cookies
 *
 * @notice for logging in purpose
 *
 * @params accounts string[]
 *
 * @params network string
 *
 * @return error
 */
export const storeAccountInfoInCookies = (accounts: string[], network: string) => {
  try {
    Cookies.set('_isConnected', true.toString());
    Cookies.set('_connectedAccounts', JSON.stringify(accounts));
    Cookies.set('_network', JSON.stringify(network));
  } catch (error: any) {
    console.error(error);
    return error;
  }
};

/**
 * @dev load the connected accounts array from client Cookies
 *
 * @return isConnected?: string | null;
 *
 * @return accounts?: string | null;
 *
 * @return error?: any;
 */
export const loadAccountInfoFromCookies = (): {
  isConnected?: string | null;
  accounts?: string | null;
  network?: string | null;
  error?: any;
} => {
  try {
    return {
      network: Cookies.get('_network'),
      isConnected: Cookies.get('_isConnected'),
      accounts: Cookies.get('_connectedAccounts'),
    };
  } catch (error) {
    console.error(error);
    return { error };
  }
};

/**
 * @dev store customize data to Cookies
 *
 * @params key: string
 *
 * @params value: string
 *
 * @return error
 */
export const storeInfoInCookies = (key: string, value: string) => {
  try {
    Cookies.set(key, value);
  } catch (error) {
    console.error(error);
    return error;
  }
};

/**
 * @dev store customize data to Cookies
 *
 * @params key: string
 *
 * @returns value: string
 *
 * @return error
 */
export const getInfoFromCookies = (
  key: string
): {
  value?: string | null;
  error?: any;
} => {
  try {
    return { value: Cookies.get(key) };
  } catch (error) {
    console.error(error);
    return { error };
  }
};

/**
 * @dev remove specific cookie
 *
 * @param key: string
 */
export const removeCookieAt = (key: string) => {
  Cookies.remove(key);
};

/**
 * @dev clear account information stored in cookies
 */
export const clearCookies = async () => {
  const cookies = Cookies.get();

  for (let key in cookies) {
    Cookies.remove(key);
  }
};
// Filename: system-contract-dapp-playground/src/api/ethers/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { ethers } from 'ethers';
import { getWalletProvider } from '../wallet';
import { IContractABI, IEthersResult } from '@/types/common';

/**
 * @dev generate a new ethers.Contract instance at contractAddress
 *
 * @param contractAddress: string
 *
 * @param contractABI: IContractABI[]
 *
 * @return Promise<IEthersResult>
 */
export const generateBaseContractInstance = async (
  contractAddress: string,
  contractABI: IContractABI[]
): Promise<IEthersResult> => {
  // get wallet provider
  const walletProvider = getWalletProvider();
  if (walletProvider.err || !walletProvider.walletProvider) {
    return { err: walletProvider.err };
  }

  try {
    // get signer
    const walletSigner = await walletProvider.walletProvider.getSigner();

    // generate a new ethers.Contract instance
    const baseContract = new ethers.Contract(contractAddress, JSON.stringify(contractABI), walletSigner);

    return { baseContract };
  } catch (err) {
    console.error(err);
    return { err };
  }
};
// Filename: system-contract-dapp-playground/src/api/hedera/erc20-interactions/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { TNetworkName } from '@/types/common';
import { Contract, ethers, isAddress } from 'ethers';
import { handleEstimateGas } from '@/utils/common/helpers';

/**
 * @dev get token information
 *
 * @notice execute name(), symbol(), totalSupply(), decimals()
 *
 * @param baseContract: Contract
 *
 * @param method: 'name' | 'symbol' | 'totalSupply' | 'decimals'
 *
 * @return Promise<IERCSmartContractResult>
 */
export const getERC20TokenInformation = async (
  baseContract: Contract,
  method: 'name' | 'symbol' | 'totalSupply' | 'decimals'
): Promise<IERCSmartContractResult> => {
  try {
    switch (method) {
      case 'name':
        return { name: await baseContract.name() };
      case 'symbol':
        return { symbol: await baseContract.symbol() };
      case 'totalSupply':
        return { totalSupply: (await baseContract.totalSupply()).toString() };
      case 'decimals':
        return { decimals: (await baseContract.decimals()).toString() };
    }
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev mints erc20 tokens
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param recipientAddress: ethers.AddressLike
 *
 * @param tokenAmount: number
 *
 * @param gasLimit: number
 *
 * @return Promise<IERCSmartContractResult>
 */
export const erc20Mint = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  recipientAddress: ethers.AddressLike,
  tokenAmount: number,
  gasLimit: number
): Promise<IERCSmartContractResult> => {
  if (!isAddress(recipientAddress)) {
    return { err: 'Invalid recipient address' };
  } else if (tokenAmount <= 0) {
    return { err: 'Invalid token amount' };
  }

  try {
    if (gasLimit === 0) {
      const estimateGasResult = await handleEstimateGas(baseContract, signerAddress, network, 'mint', [
        recipientAddress,
        tokenAmount,
      ]);
      if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
      gasLimit = estimateGasResult.gasLimit;
    }

    const txReceipt = await (await baseContract.mint(recipientAddress, tokenAmount, { gasLimit })).wait();
    return { mintRes: true, txHash: txReceipt.hash };
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev get token balance owned by `accountAddress`
 *
 * @param baseContract: Contract
 *
 * @param accountAddress: ethers.AddressLike
 *
 * @return Promise<IERCSmartContractResult>
 */
export const balanceOf = async (
  baseContract: Contract,
  accountAddress: ethers.AddressLike
): Promise<IERCSmartContractResult> => {
  if (!isAddress(accountAddress)) {
    return { err: 'Invalid account address' };
  }

  try {
    return { balanceOfRes: (await baseContract.balanceOf(accountAddress)).toString() };
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev handle executing APIs relate  to Token Permissions
 *
 * @dev approve() sets `amount` as the allowance of `spenderAddress` over the caller's tokens
 *
 * @dev increaseAllowance() atomically increases the allowance granted to spender by the caller.
 *
 * @dev decreaseAllowance() atomically decreases the allowance granted to spender by the caller.
 *
 * @dev allowance() returns the remaining number of tokens that `spenerAddress` will be allowed to spend on behalf of `ownerAddress`
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param method: 'approve' | 'allowance' | 'increaseAllowance' | 'decreaseAllowance'
 *
 * @param gasLimit: number
 *
 * @param spenderAddress?: ethers.AddressLike
 *
 * @param owner?: ethers.AddressLike
 *
 * @param amount?: number
 *
 * @return Promise<IERCSmartContractResult>
 */
export const handleErc20TokenPermissions = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  method: 'approve' | 'allowance' | 'increaseAllowance' | 'decreaseAllowance',
  spenderAddress: ethers.AddressLike,
  gasLimit: number,
  ownerAddress?: ethers.AddressLike,
  amount?: number
): Promise<IERCSmartContractResult> => {
  // sanitize params
  if (ownerAddress && !isAddress(ownerAddress)) {
    return { err: 'Invalid owner address' };
  } else if (spenderAddress && !isAddress(spenderAddress)) {
    return { err: 'Invalid spender address' };
  }

  // prepare function arguments
  const args = method === 'allowance' ? [ownerAddress, spenderAddress] : [spenderAddress, amount];

  if (gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(baseContract, signerAddress, network, method, args);
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  // executing logic
  try {
    switch (method) {
      case 'approve':
        const approveReceipt = await (
          await baseContract.approve(spenderAddress, amount, { gasLimit })
        ).wait();
        return { approveRes: true, txHash: approveReceipt.hash };
      case 'increaseAllowance':
        const increaseAllowanceReceipt = await (
          await baseContract.increaseAllowance(spenderAddress, amount, { gasLimit })
        ).wait();
        return { increaseAllowanceRes: true, txHash: increaseAllowanceReceipt.hash };
      case 'decreaseAllowance':
        const decreaseAllowanceReceipt = await (
          await baseContract.decreaseAllowance(spenderAddress, amount, { gasLimit })
        ).wait();
        return { decreaseAllowanceRes: true, txHash: decreaseAllowanceReceipt.hash };
      case 'allowance':
        const allowance = await baseContract.allowance(ownerAddress, spenderAddress, { gasLimit });
        return { allowanceRes: allowance.toString() };
    }
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev handle executing APIs relate to Token Transfer
 *
 * @dev transfer() moves amount tokens from the caller’s account to `recipient`.
 *
 * @dev transferFrom() moves amount tokens from `tokenOwnerAddress` to `recipientAddress` using the allowance mechanism. `amount` is then deducted from the caller’s allowance.
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param method: "transfer" | "transferFrom"
 *
 * @param recipientAddress: ethers.AddressLike
 *
 * @param amount: number
 *
 * @param gasLimit: number
 *
 * @param tokenOwnerAddress?: ethers.AddressLike
 *
 * @return Promise<IERCSmartContractResult>
 */
export const erc20Transfers = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  method: 'transfer' | 'transferFrom',
  recipientAddress: ethers.AddressLike,
  amount: number,
  gasLimit: number,
  tokenOwnerAddress?: ethers.AddressLike
): Promise<IERCSmartContractResult> => {
  if (method === 'transferFrom' && !isAddress(tokenOwnerAddress)) {
    return { err: 'Invalid token owner address' };
  } else if (!isAddress(recipientAddress)) {
    return { err: 'Invalid recipient address' };
  }

  // prepare function arguments
  const args =
    method === 'transfer' ? [recipientAddress, amount] : [tokenOwnerAddress, recipientAddress, amount];

  if (gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(baseContract, signerAddress, network, method, args);
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  try {
    switch (method) {
      case 'transfer':
        const transferReceipt = await (
          await baseContract.transfer(recipientAddress, amount, { gasLimit })
        ).wait();
        return { transferRes: true, txHash: transferReceipt.hash };
      case 'transferFrom':
        const transferFromReceipt = await (
          await baseContract.transferFrom(tokenOwnerAddress, recipientAddress, amount, { gasLimit })
        ).wait();

        return { transferFromRes: true, txHash: transferFromReceipt.hash };
    }
  } catch (err) {
    console.error(err);
    return { err };
  }
};
// Filename: system-contract-dapp-playground/src/api/hedera/erc721-interactions/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { TNetworkName } from '@/types/common';
import { handleEstimateGas } from '@/utils/common/helpers';
import { Contract, ethers, isAddress } from 'ethers';

/**
 * @dev get token information
 *
 * @notice execute name(), symbol()
 *
 * @param baseContract: Contract
 *
 * @param method: 'name' | 'symbol'
 *
 * @return Promise<IERCSmartContractResult>
 */
export const getERC721TokenInformation = async (
  baseContract: Contract,
  method: 'name' | 'symbol'
): Promise<IERCSmartContractResult> => {
  try {
    switch (method) {
      case 'name':
        return { name: await baseContract.name() };
      case 'symbol':
        return { symbol: await baseContract.symbol() };
    }
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev get token URI of the tokenId token
 *
 * @param baseContract: Contract
 *
 * @param tokenId: number
 *
 * @return Promise<IERCSmartContractResult>
 */
export const erc721TokenURI = async (
  baseContract: Contract,
  tokenId: number
): Promise<IERCSmartContractResult> => {
  if (tokenId < 0) {
    return { err: 'Invalid token amount' };
  }

  try {
    return { tokenURI: (await baseContract.tokenURI(tokenId)).toString() };
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev mints erc721 tokens
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param recipientAddress: address
 *
 * @param tokenId: number
 *
 * @param gasLimit: number
 *
 * @return Promise<IERCSmartContractResult>
 */
export const erc721Mint = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  recipientAddress: string,
  tokenId: number,
  gasLimit: number
): Promise<IERCSmartContractResult> => {
  if (!isAddress(recipientAddress)) {
    return { err: 'Invalid recipient address' };
  } else if (tokenId < 0) {
    return { err: 'Invalid token amount' };
  }

  if (gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(baseContract, signerAddress, network, 'mint', [
      recipientAddress,
      tokenId,
    ]);
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  try {
    const txReceipt = await (await baseContract.mint(recipientAddress, tokenId, { gasLimit })).wait();
    return { txHash: txReceipt.hash };
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev get token balance owned by `accountAddress`
 *
 * @param baseContract: Contract
 *
 * @param accountAddress: address
 *
 * @return Promise<IERCSmartContractResult>
 */
export const erc721BalanceOf = async (
  baseContract: Contract,
  accountAddress: string
): Promise<IERCSmartContractResult> => {
  if (!isAddress(accountAddress)) {
    return { err: 'Invalid account address' };
  }

  try {
    return { balanceOfRes: (await baseContract.balanceOf(accountAddress)).toString() };
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev gets the token owner of the `tokenId` token
 *
 * @param baseContract: Contract
 *
 * @param tokenId: number
 *
 * @return Promise<IERCSmartContractResult>
 */
export const erc721OwnerOf = async (
  baseContract: Contract,
  tokenId: number
): Promise<IERCSmartContractResult> => {
  try {
    return { ownerOfRes: (await baseContract.ownerOf(tokenId)).toString() };
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev integrates ERC721.approve()
 *
 * @dev integrates ERC721.getApproved()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param method: 'APPROVE' | 'GET_APPROVE'
 *
 * @param spenderAddress: string
 *
 * @param tokenId: number
 *
 * @param gasLimit: number
 *
 * @return Promise<IERCSmartContractResult>
 */
export const erc721TokenApprove = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  method: 'APPROVE' | 'GET_APPROVE',
  spenderAddress: string,
  tokenId: number,
  gasLimit: number
): Promise<IERCSmartContractResult> => {
  if (method === 'APPROVE' && !isAddress(spenderAddress)) {
    return { err: 'Invalid account address' };
  }

  if (method === 'APPROVE' && gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(baseContract, signerAddress, network, 'approve', [
      spenderAddress,
      tokenId,
    ]);
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  try {
    switch (method) {
      case 'APPROVE':
        const approveReceipt = await (
          await baseContract.approve(spenderAddress, tokenId, { gasLimit })
        ).wait();
        return { txHash: approveReceipt.hash };
      case 'GET_APPROVE':
        return { approvedAccountRes: await baseContract.getApproved(tokenId) };
    }
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev integrates ERC721.setApprovalForAll()
 *
 * @dev integrates ERC721.isApprovedForAll()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param method: 'SET_APPROVAL' | 'IS_APPROVAL'
 *
 * @param ownerAddress: string
 *
 * @param operatorAddress: string
 *
 * @param approvalStatus: boolean
 *
 * @param gasLimit: number
 *
 * @return Promise<IERCSmartContractResult>
 */
export const erc721TokenApproval = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  method: 'SET_APPROVAL' | 'IS_APPROVAL',
  ownerAddress: string,
  operatorAddress: string,
  approvalStatus: boolean,
  gasLimit: number
): Promise<IERCSmartContractResult> => {
  if (method === 'IS_APPROVAL' && !isAddress(ownerAddress)) {
    return { err: 'Invalid owner address' };
  } else if (!isAddress(operatorAddress)) {
    return { err: 'Invalid operator address' };
  }

  if (method === 'SET_APPROVAL' && gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(
      baseContract,
      signerAddress,
      network,
      'setApprovalForAll',
      [operatorAddress, approvalStatus]
    );
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  try {
    switch (method) {
      case 'SET_APPROVAL':
        const approveReceipt = await (
          await baseContract.setApprovalForAll(operatorAddress, approvalStatus, { gasLimit })
        ).wait();
        return { txHash: approveReceipt.hash };
      case 'IS_APPROVAL':
        return {
          approvalStatusRes: await baseContract.isApprovedForAll(ownerAddress, operatorAddress),
        };
    }
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev handle executing APIs relate to Token Transfer
 *
 * @dev integrates ERC721.transferFrom()
 *
 * @dev integrates ERC721.safeTransferFrom()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param method: "TRANSFER_FROM" | "SAFE_TRANSFER_FROM"
 *
 * @param senderAddress: string
 *
 * @param recipientAddress: string
 *
 * @param tokenId: number
 *
 * @param data: string
 *
 * @param gasLimit: number
 *
 * @return Promise<IERCSmartContractResult>
 */
export const erc721Transfers = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  method: 'TRANSFER_FROM' | 'SAFE_TRANSFER_FROM',
  senderAddress: string,
  recipientAddress: string,
  tokenId: number,
  data: string,
  gasLimit: number
): Promise<IERCSmartContractResult> => {
  if (!isAddress(senderAddress)) {
    return { err: 'Invalid sender address' };
  } else if (!isAddress(recipientAddress)) {
    return { err: 'Invalid recipient address' };
  } else if (tokenId < 0) {
    return { err: 'Invalid tokenId' };
  }

  try {
    switch (method) {
      case 'TRANSFER_FROM':
        if (gasLimit === 0) {
          const estimateGasResult = await handleEstimateGas(
            baseContract,
            signerAddress,
            network,
            'transferFrom',
            [senderAddress, recipientAddress, tokenId]
          );
          if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
          gasLimit = estimateGasResult.gasLimit;
        }
        const transferReceipt = await (
          await baseContract.transferFrom(senderAddress, recipientAddress, tokenId, { gasLimit })
        ).wait();
        return { txHash: transferReceipt.hash };

      case 'SAFE_TRANSFER_FROM':
        if (gasLimit === 0) {
          const estimateGasResult = await handleEstimateGas(
            baseContract,
            signerAddress,
            network,
            'safeTransferFrom(address,address,uint256,bytes)',
            [senderAddress, recipientAddress, tokenId, ethers.toUtf8Bytes(data)]
          );
          if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
          gasLimit = estimateGasResult.gasLimit;
        }

        // Typed function signature to specify the safeTransferFrom function
        // @logic there are two safeTransferFrom functions with different params, without specifying the function signature =>`TypeError: ambiguous function description`
        const safeTransferFromFunctionSignature = 'safeTransferFrom(address,address,uint256,bytes)';

        const safeTransferReceipt = await (
          await baseContract[safeTransferFromFunctionSignature](
            senderAddress,
            recipientAddress,
            tokenId,
            ethers.toUtf8Bytes(data),
            { gasLimit }
          )
        ).wait();
        return { txHash: safeTransferReceipt.hash };
    }
  } catch (err: any) {
    console.error(err);
    return { err, txHash: err.receipt && err.receipt.hash };
  }
};
// Filename: system-contract-dapp-playground/src/api/hedera/exchange-rate-interactions/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract, ethers } from 'ethers';
import { TNetworkName } from '@/types/common';
import { handleEstimateGas } from '@/utils/common/helpers';
import { ISmartContractExecutionResult } from '@/types/contract-interactions/shared';

/**
 * @dev handle converting tinycents to tinybars and vice versa
 *
 * @dev integrates exchangeRate.convertTinycentsToTinybars()
 *
 * @dev integrates exchangeRate.convertTinybarsToTinycents()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param API: "CENT_TO_BAR" | "BAR_TO_CENT"
 *
 * @param amount: number
 *
 * @param gasLimit: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const handleExchangeRate = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API: 'CENT_TO_BAR' | 'BAR_TO_CENT',
  amount: number,
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize param
  if (amount < 0) {
    console.error('Amount to convert cannot be negative');
    return { err: 'Amount to convert cannot be negative' };
  }

  // Event name map
  const eventNameMap = {
    CENT_TO_BAR: 'TinyBars',
    BAR_TO_CENT: 'TinyCents',
  };

  if (gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(
      baseContract,
      signerAddress,
      network,
      API === 'CENT_TO_BAR' ? 'convertTinycentsToTinybars' : 'convertTinybarsToTinycents',
      [amount]
    );
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  try {
    // invoke contract method
    let tx;
    if (API === 'CENT_TO_BAR') {
      tx = await baseContract.convertTinycentsToTinybars(amount, { gasLimit });
    } else {
      tx = await baseContract.convertTinybarsToTinycents(amount, { gasLimit });
    }

    // retrieve txReceipt
    const txReceipt = await tx.wait();

    const { data } = txReceipt.logs.filter((event: any) => event.fragment.name === eventNameMap[API])[0];

    return { transactionHash: txReceipt.hash, convertedAmount: Number(data) };
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};
// Filename: system-contract-dapp-playground/src/api/hedera/hts-interactions/tokenCreateCustom-interactions/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import {
  handleContractResponse,
  prepareHederaTokenKeyArray,
} from '@/utils/contract-interactions/HTS/helpers';
import { Contract, ethers, isAddress } from 'ethers';
import { ISmartContractExecutionResult } from '@/types/contract-interactions/shared';
import { handleEstimateGas } from '@/utils/common/helpers';
import { TNetworkName } from '@/types/common';

/**
 * @dev creates a Hedera fungible token
 *
 * @dev integrates tokenCreateCustomContract.createFungibleTokenPublic() and tokenCreateCustomContract.createFungibleTokenWithCustomFeesPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param name: string
 *
 * @param symbol: string
 *
 * @param memo: string
 *
 * @param initialTotalSupply: number
 *
 * @param maxSupply: number
 *
 * @param decimals: number
 *
 * @param freezeDefaultStatus: boolean
 *
 * @param treasury: string
 *
 * @param inputKeys: ICommonKeyObject[],
 *
 * @param msgValue: string
 *
 * @param feeTokenAddress?: string
 *
 * @param feeAmount?: number
 *
 * @return Promise<ISmartContractExecutionResult>
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L136
 *      for more information on the purposes of the params
 */
export const createHederaFungibleToken = async (
  baseContract: Contract,
  name: string,
  symbol: string,
  memo: string,
  initialTotalSupply: number,
  maxSupply: number,
  decimals: number,
  freezeDefaultStatus: boolean,
  treasury: string,
  inputKeys: ICommonKeyObject[],
  msgValue: string,
  feeTokenAddress?: string,
  feeAmount?: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (initialTotalSupply < 0) {
    sanitizeErr = 'initial total supply cannot be negative';
  } else if (maxSupply < 0) {
    sanitizeErr = 'max supply cannot be negative';
  } else if (decimals < 0) {
    sanitizeErr = 'decimals cannot be negative';
  } else if (!isAddress(treasury)) {
    sanitizeErr = 'invalid treasury address';
  } else if (feeTokenAddress && !isAddress(feeTokenAddress)) {
    sanitizeErr = 'invalid fee token address';
  }
  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  // prepare keys array
  const keyRes = prepareHederaTokenKeyArray(inputKeys);

  // handle error
  if (keyRes.err) {
    console.error(keyRes.err);
    return { err: keyRes.err };
  }

  try {
    let tokenCreateTx;
    if (feeTokenAddress) {
      tokenCreateTx = await baseContract.createFungibleTokenWithCustomFeesPublic(
        treasury,
        feeTokenAddress,
        name,
        symbol,
        memo,
        initialTotalSupply,
        maxSupply,
        decimals,
        feeAmount,
        keyRes.hederaTokenKeys,
        {
          value: ethers.parseEther(msgValue),
          gasLimit: 1_000_000,
        }
      );
    } else {
      tokenCreateTx = await baseContract.createFungibleTokenPublic(
        name,
        symbol,
        memo,
        initialTotalSupply,
        maxSupply,
        decimals,
        freezeDefaultStatus,
        treasury,
        keyRes.hederaTokenKeys,
        {
          value: ethers.parseEther(msgValue),
          gasLimit: 1_000_000,
        }
      );
    }

    const txReceipt = await tokenCreateTx.wait();

    const { data } = txReceipt.logs.filter((event: any) => event.fragment.name === 'CreatedToken')[0];

    // @notice since the returned `data` is 32 byte, convert it to the public 20-byte address standard
    const tokenAddress = `0x${data.slice(-40)}`;

    return { tokenAddress, transactionHash: txReceipt.hash };
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev creates a Hedera non fungible token
 *
 * @dev integrates tokenCreateCustomContract.createNonFungibleTokenPublic() and tokenCreateCustomContract.createNonFungibleTokenWithCustomFeesPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param name: string
 *
 * @param symbol: string
 *
 * @param memo: string
 *
 * @param maxSupply: number
 *
 * @param treasury: ethers.AddressLike
 *
 * @param inputKeys: ICommonKeyObject[],
 *
 * @param msgValue: string
 *
 * @param feeTokenAddress?: ethers.AddressLike
 *
 * @param feeAmount?: number
 *
 * @return Promise<ISmartContractExecutionResult>
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L136
 *      for more information on the purposes of the params
 */
export const createHederaNonFungibleToken = async (
  baseContract: Contract,
  name: string,
  symbol: string,
  memo: string,
  maxSupply: number,
  treasury: ethers.AddressLike,
  inputKeys: ICommonKeyObject[],
  msgValue: string,
  feeTokenAddress?: ethers.AddressLike,
  feeAmount?: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (maxSupply < 0) {
    sanitizeErr = 'max supply cannot be negative';
  } else if (!isAddress(treasury)) {
    sanitizeErr = 'invalid treasury address';
  } else if (feeTokenAddress && !isAddress(feeTokenAddress)) {
    sanitizeErr = 'invalid fee token address';
  }

  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  // prepare keys array
  const keyRes = prepareHederaTokenKeyArray(inputKeys);

  // handle error
  if (keyRes.err) {
    return { err: keyRes.err };
  }

  try {
    let tokenCreateTx;
    if (feeTokenAddress) {
      tokenCreateTx = await baseContract.createNonFungibleTokenWithCustomFeesPublic(
        treasury,
        feeTokenAddress,
        name,
        symbol,
        memo,
        maxSupply,
        feeAmount,
        keyRes.hederaTokenKeys,
        {
          value: ethers.parseEther(msgValue),
          gasLimit: 1_000_000,
        }
      );
    } else {
      tokenCreateTx = await baseContract.createNonFungibleTokenPublic(
        name,
        symbol,
        memo,
        maxSupply,
        treasury,
        keyRes.hederaTokenKeys,
        {
          value: ethers.parseEther(msgValue),
          gasLimit: 1_000_000,
        }
      );
    }

    const txReceipt = await tokenCreateTx.wait();

    const { data } = txReceipt.logs.filter((event: any) => event.fragment.name === 'CreatedToken')[0];

    // @notice since the returned `data` is 32 byte, convert it to the public 20-byte address standard
    const tokenAddress = `0x${data.slice(-40)}`;

    return { tokenAddress, transactionHash: txReceipt.hash };
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev mints Hedera tokens
 *
 * @dev integrates tokenCreateCustomContract.mintTokenPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param tokenType: 'FUNGIBLE' | 'NON_FUNGIBLE'
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param amountToMint: number
 *
 * @param metadata: string[]
 *
 * @param gasLimit: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const mintHederaToken = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  tokenType: 'FUNGIBLE' | 'NON_FUNGIBLE',
  hederaTokenAddress: ethers.AddressLike,
  amountToMint: number,
  metadata: string[],
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (!isAddress(hederaTokenAddress)) {
    sanitizeErr = 'invalid Hedera token address';
  } else if (tokenType === 'FUNGIBLE' && amountToMint < 0) {
    sanitizeErr = 'amount to mint cannot be negative when minting a fungible token';
  } else if (tokenType === 'NON_FUNGIBLE' && amountToMint !== 0) {
    sanitizeErr = 'amount to mint must be 0 when minting a non-fungible token';
  }

  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  // convert metadata to Buffer[]
  const bufferedMetadata = metadata.map((meta) => Buffer.from(meta));

  // execute .mintTokenPublic() method
  try {
    if (gasLimit === 0) {
      const estimateGasResult = await handleEstimateGas(
        baseContract,
        signerAddress,
        network,
        'mintTokenPublic',
        [hederaTokenAddress, amountToMint, bufferedMetadata]
      );
      if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
      gasLimit = estimateGasResult.gasLimit;
    }
    const tx = await baseContract.mintTokenPublic(hederaTokenAddress, amountToMint, bufferedMetadata, {
      gasLimit,
    });

    // handle contract responses
    return await handleContractResponse(tx);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev mints Hedera tokens and transfer it to another address
 *
 * @dev integrates tokenCreateCustomContract.mintTokenToAddressPublic() & tokenCreateCustomContract.mintNonFungibleTokenToAddressPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param tokenType: 'FUNGIBLE' | 'NON_FUNGIBLE'
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param recipientAddress: ethers.AddressLike
 *
 * @param amountToMint: number
 *
 * @param metadata: string[]
 *
 * @param gasLimit: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const mintHederaTokenToAddress = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  tokenType: 'FUNGIBLE' | 'NON_FUNGIBLE',
  hederaTokenAddress: ethers.AddressLike,
  recipientAddress: ethers.AddressLike,
  amountToMint: number,
  metadata: string[],
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (!isAddress(hederaTokenAddress)) {
    sanitizeErr = 'invalid Hedera token address';
  } else if (!isAddress(recipientAddress)) {
    sanitizeErr = 'invalid recipient address';
  } else if (tokenType === 'FUNGIBLE' && amountToMint < 0) {
    sanitizeErr = 'amount to mint cannot be negative when minting a fungible token';
  } else if (tokenType === 'NON_FUNGIBLE' && amountToMint !== 0) {
    sanitizeErr = 'amount to mint must be 0 when minting a non-fungible token';
  }

  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  // convert metadata to Buffer[]
  const bufferedMetadata = metadata.map((meta) => Buffer.from(meta));

  try {
    let tx;
    if (tokenType === 'FUNGIBLE') {
      if (gasLimit === 0) {
        const estimateGasResult = await handleEstimateGas(
          baseContract,
          signerAddress,
          network,
          'mintTokenToAddressPublic',
          [hederaTokenAddress, recipientAddress, amountToMint, bufferedMetadata]
        );
        if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
        gasLimit = estimateGasResult.gasLimit;
      }
      tx = await baseContract.mintTokenToAddressPublic(
        hederaTokenAddress,
        recipientAddress,
        amountToMint,
        bufferedMetadata,
        {
          gasLimit,
        }
      );
    } else {
      if (gasLimit === 0) {
        const estimateGasResult = await handleEstimateGas(
          baseContract,
          signerAddress,
          network,
          'mintNonFungibleTokenToAddressPublic',
          [hederaTokenAddress, recipientAddress, amountToMint, bufferedMetadata]
        );
        if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
        gasLimit = estimateGasResult.gasLimit;
      }
      tx = await baseContract.mintNonFungibleTokenToAddressPublic(
        hederaTokenAddress,
        recipientAddress,
        amountToMint,
        bufferedMetadata,
        {
          gasLimit,
        }
      );
    }

    // handle contract responses
    return await handleContractResponse(tx);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev associates Hedera tokens to accounts
 *
 * @dev integrates tokenCreateCustomContract.associateTokensPublic() and tokenCreateCustomContract.associateTokenPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param hederaTokenAddresses: string[]
 *
 * @param associtingAccountAddress: ethers.AddressLike
 *
 * @param gasLimit: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const associateHederaTokensToAccounts = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  hederaTokenAddresses: string[],
  associtingAccountAddress: ethers.AddressLike,
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (hederaTokenAddresses.length === 0) {
    sanitizeErr = 'must have at least one token address to associate';
  } else if (!isAddress(associtingAccountAddress)) {
    sanitizeErr = 'associating account address is invalid';
  }
  let invalidTokens = [] as any;
  hederaTokenAddresses.forEach((address) => {
    if (!isAddress(address.trim())) {
      invalidTokens.push(address);
    }
  });

  if (invalidTokens.length > 0) {
    sanitizeErr = { invalidTokens };
  }

  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  try {
    let tx;
    if (hederaTokenAddresses.length === 1) {
      if (gasLimit === 0) {
        const estimateGasResult = await handleEstimateGas(
          baseContract,
          signerAddress,
          network,
          'associateTokenPublic',
          [associtingAccountAddress, hederaTokenAddresses[0]]
        );
        if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
        gasLimit = estimateGasResult.gasLimit;
      }

      tx = await baseContract.associateTokenPublic(associtingAccountAddress, hederaTokenAddresses[0], {
        gasLimit,
      });
    } else {
      if (gasLimit === 0) {
        const estimateGasResult = await handleEstimateGas(
          baseContract,
          signerAddress,
          network,
          'associateTokensPublic',
          [associtingAccountAddress, hederaTokenAddresses]
        );
        if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
        gasLimit = estimateGasResult.gasLimit;
      }
      tx = await baseContract.associateTokensPublic(associtingAccountAddress, hederaTokenAddresses, {
        gasLimit,
      });
    }

    // handle contract responses
    return await handleContractResponse(tx);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev grants token KYC to an account
 *
 * @dev integrates tokenCreateCustomContract.grantTokenKycPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param grantingKYCAccountAddress: ethers.AddressLike
 *
 * @param gasLimit: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const grantTokenKYCToAccount = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  hederaTokenAddress: ethers.AddressLike,
  grantingKYCAccountAddress: ethers.AddressLike,
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (!isAddress(hederaTokenAddress)) {
    sanitizeErr = 'invalid Hedera token address';
  } else if (!isAddress(grantingKYCAccountAddress)) {
    sanitizeErr = 'invalid associating account address';
  }

  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  try {
    if (gasLimit === 0) {
      const estimateGasResult = await handleEstimateGas(
        baseContract,
        signerAddress,
        network,
        'grantTokenKycPublic',
        [hederaTokenAddress, grantingKYCAccountAddress]
      );
      if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
      gasLimit = estimateGasResult.gasLimit;
    }
    const tx = await baseContract.grantTokenKycPublic(hederaTokenAddress, grantingKYCAccountAddress, {
      gasLimit,
    });

    // handle contract responses
    return await handleContractResponse(tx);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};
// Filename: system-contract-dapp-playground/src/api/hedera/hts-interactions/tokenManagement-interactions/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract, ethers, isAddress } from 'ethers';
import { ISmartContractExecutionResult } from '@/types/contract-interactions/shared';
import {
  handleContractResponse,
  prepareHederaTokenKeyArray,
} from '@/utils/contract-interactions/HTS/helpers';
import { TNetworkName } from '@/types/common';
import { handleEstimateGas } from '@/utils/common/helpers';

/**
 * @dev manages and updates token information
 *
 * @dev integrates tokenMagemnentContract.updateTokenInfoPublic()
 *
 * @dev integrates tokenMagemnentContract.updateTokenExpiryInfoPublic()
 *
 * @dev integrates tokenMagemnentContract.updateTokenKeysPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param API: "UPDATE_INFO" | "UPDATE_EXPIRY" | "UPDATE_KEYS"
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param gasLimit: number
 *
 * @param tokenInfo?: IHederaTokenServiceHederaToken
 *
 * @param expiryInfo?: IHederaTokenServiceExpiry
 *
 * @param keysInfo?: ICommonKeyObject[],
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const manageTokenInfomation = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API: 'UPDATE_INFO' | 'UPDATE_EXPIRY' | 'UPDATE_KEYS',
  hederaTokenAddress: ethers.AddressLike,
  gasLimit: number,
  tokenInfo?: IHederaTokenServiceHederaToken,
  expiryInfo?: IHederaTokenServiceExpiry,
  keysInfo?: ICommonKeyObject[]
): Promise<ISmartContractExecutionResult> => {
  // sanitize param
  if (!isAddress(hederaTokenAddress)) {
    console.error('Invalid token address');
    return { err: 'Invalid token address' };
  }

  // invoking contract methods
  try {
    // prepare states
    let transactionResult, errMsg;
    switch (API) {
      case 'UPDATE_INFO':
        if (!tokenInfo) {
          errMsg = 'Token information object is needed for UPDATE_INFO API';
        } else {
          if (gasLimit === 0) {
            const estimateGasResult = await handleEstimateGas(
              baseContract,
              signerAddress,
              network,
              'updateTokenInfoPublic',
              [hederaTokenAddress, tokenInfo]
            );
            if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
            gasLimit = estimateGasResult.gasLimit;
          }
          transactionResult = await baseContract.updateTokenInfoPublic(hederaTokenAddress, tokenInfo, {
            gasLimit,
          });
        }
        break;
      case 'UPDATE_EXPIRY':
        if (!expiryInfo) {
          errMsg = 'Expiry information object is needed for UPDATE_EXPIRY API';
        } else {
          if (gasLimit === 0) {
            const estimateGasResult = await handleEstimateGas(
              baseContract,
              signerAddress,
              network,
              'updateTokenExpiryInfoPublic',
              [hederaTokenAddress, expiryInfo]
            );
            if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
            gasLimit = estimateGasResult.gasLimit;
          }
          transactionResult = await baseContract.updateTokenExpiryInfoPublic(hederaTokenAddress, expiryInfo, {
            gasLimit,
          });
        }
        break;
      case 'UPDATE_KEYS':
        if (!keysInfo) {
          errMsg = 'Keys information object is needed for UPDATE_KEYS API';
        } else {
          // prepare keys array
          const keyRes = prepareHederaTokenKeyArray(keysInfo);

          // handle error
          if (keyRes.err) {
            errMsg = keyRes.err;
          } else {
            const hederaTokenKeys = keyRes.hederaTokenKeys;

            if (gasLimit === 0) {
              const estimateGasResult = await handleEstimateGas(
                baseContract,
                signerAddress,
                network,
                'updateTokenKeysPublic',
                [hederaTokenAddress, hederaTokenKeys]
              );
              if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
              gasLimit = estimateGasResult.gasLimit;
            }

            transactionResult = await baseContract.updateTokenKeysPublic(
              hederaTokenAddress,
              hederaTokenKeys,
              { gasLimit }
            );
          }
        }
    }

    // handle contract responses
    return await handleContractResponse(transactionResult, errMsg);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev manages token permission
 *
 * @dev integrates tokenMagemnentContract.approvePublic()
 *
 * @dev integrates tokenMagemnentContract.approveNFTPublic()
 *
 * @dev integrates tokenMagemnentContract.setApprovalForAllPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param API: "APPROVED_FUNGIBLE" | "APPROVED_NON_FUNGIBLE" | "SET_APPROVAL"
 *
 * @param hederaTokenAddress:  ethers.AddressLike
 *
 * @param targetApprovedAddress:  ethers.AddressLike (spender address for APPROVED_FUNGIBLE, approved NFT controller for APPROVED_NON_FUNGIBLE, operator for SET_APPROVAL)
 *
 * @param gasLimit: number
 *
 * @param amountToApprove?: number (APPROVED_FUNGIBLE)
 *
 * @param serialNumber?: number (APPROVED_NON_FUNGIBLE)
 *
 * @param approvedStatus?: boolean (SET_APPROVAL)
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const manageTokenPermission = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API: 'APPROVED_FUNGIBLE' | 'APPROVED_NON_FUNGIBLE' | 'SET_APPROVAL',
  hederaTokenAddress: ethers.AddressLike,
  targetApprovedAddress: ethers.AddressLike,
  gasLimit: number,
  amountToApprove?: number,
  serialNumber?: number,
  approvedStatus?: boolean
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (!isAddress(hederaTokenAddress)) {
    sanitizeErr = 'Invalid token address';
  } else if (!isAddress(targetApprovedAddress)) {
    sanitizeErr = 'Invalid target approved address';
  }

  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  // invoking contract methods
  try {
    // prepare states
    let transactionResult, errMsg;
    switch (API) {
      case 'APPROVED_FUNGIBLE':
        if (!amountToApprove) {
          errMsg = 'A valid amount is needed for the APPROVED_FUNGIBLE API';
        } else {
          if (gasLimit === 0) {
            const estimateGasResult = await handleEstimateGas(
              baseContract,
              signerAddress,
              network,
              'approvePublic',
              [hederaTokenAddress, targetApprovedAddress, amountToApprove]
            );
            if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
            gasLimit = estimateGasResult.gasLimit;
          }
          transactionResult = await baseContract.approvePublic(
            hederaTokenAddress,
            targetApprovedAddress,
            amountToApprove,
            { gasLimit }
          );
        }
        break;
      case 'APPROVED_NON_FUNGIBLE':
        if (!serialNumber) {
          errMsg = 'Serial number is needed for APPROVED_NON_FUNGIBLE API';
        } else {
          if (gasLimit === 0) {
            const estimateGasResult = await handleEstimateGas(
              baseContract,
              signerAddress,
              network,
              'approveNFTPublic',
              [hederaTokenAddress, targetApprovedAddress, serialNumber]
            );
            if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
            gasLimit = estimateGasResult.gasLimit;
          }
          transactionResult = await baseContract.approveNFTPublic(
            hederaTokenAddress,
            targetApprovedAddress,
            serialNumber,
            { gasLimit }
          );
        }
        break;

      case 'SET_APPROVAL':
        if (typeof approvedStatus === 'undefined') {
          errMsg = 'Approved status is needed for SET_APPROVAL API';
        } else {
          if (gasLimit === 0) {
            const estimateGasResult = await handleEstimateGas(
              baseContract,
              signerAddress,
              network,
              'setApprovalForAllPublic',
              [hederaTokenAddress, targetApprovedAddress, approvedStatus]
            );
            if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
            gasLimit = estimateGasResult.gasLimit;
          }
          transactionResult = await baseContract.setApprovalForAllPublic(
            hederaTokenAddress,
            targetApprovedAddress,
            approvedStatus,
            { gasLimit }
          );
        }
    }

    // handle contract responses
    return await handleContractResponse(transactionResult, errMsg);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev manages token status
 *
 * @dev integrates tokenMagemnentContract.pauseTokenPublic()
 *
 * @dev integrates tokenMagemnentContract.unpauseTokenPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param API: "PAUSE" | "UNPAUSE"
 *
 * @param hederaTokenAddress: string
 *
 * @param gasLimit: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const manageTokenStatus = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API: 'PAUSE' | 'UNPAUSE',
  hederaTokenAddress: string,
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize param
  if (!isAddress(hederaTokenAddress)) {
    console.error('Invalid token address');
    return { err: 'Invalid token address' };
  }

  // invoking contract methods
  try {
    // prepare states
    let transactionResult;
    switch (API) {
      case 'PAUSE':
        if (gasLimit === 0) {
          const estimateGasResult = await handleEstimateGas(
            baseContract,
            signerAddress,
            network,
            'pauseTokenPublic',
            [hederaTokenAddress]
          );
          if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
          gasLimit = estimateGasResult.gasLimit;
        }
        transactionResult = await baseContract.pauseTokenPublic(hederaTokenAddress, { gasLimit });
        break;
      case 'UNPAUSE':
        if (gasLimit === 0) {
          const estimateGasResult = await handleEstimateGas(
            baseContract,
            signerAddress,
            network,
            'unpauseTokenPublic',
            [hederaTokenAddress]
          );
          if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
          gasLimit = estimateGasResult.gasLimit;
        }
        transactionResult = await baseContract.unpauseTokenPublic(hederaTokenAddress, { gasLimit });
    }

    // handle contract responses
    return await handleContractResponse(transactionResult);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev manages token relationship between tokens and accounts
 *
 * @dev integrates tokenMagemnentContract.revokeTokenKycPublic()
 *
 * @dev integrates tokenMagemnentContract.freezeTokenPublic()
 *
 * @dev integrates tokenMagemnentContract.unfreezeTokenPublic()
 *
 * @dev integrates tokenMagemnentContract.dissociateTokensPublic()
 *
 * @dev integrates tokenMagemnentContract.dissociateTokenPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param API: "REVOKE_KYC" | "FREEZE" | "UNFREEZE" | "DISSOCIATE_TOKEN"
 *
 * @param accountAddress: string
 *
 * @param gasLimit: number
 *
 * @param hederaTokenAddress?: string
 *
 * @param hederaTokenAddresses?: string[]
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const manageTokenRelation = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API: 'REVOKE_KYC' | 'FREEZE' | 'UNFREEZE' | 'DISSOCIATE_TOKEN',
  accountAddress: string,
  gasLimit: number,
  hederaTokenAddress?: string,
  hederaTokenAddresses?: string[]
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (!isAddress(accountAddress)) {
    sanitizeErr = 'Invalid account address';
  } else if (hederaTokenAddresses) {
    hederaTokenAddresses.some((address) => {
      if (!isAddress(address)) {
        sanitizeErr = 'Invalid token addresses';
        return true;
      }
    });
  } else if (hederaTokenAddress && !isAddress(hederaTokenAddress)) {
    sanitizeErr = 'Invalid token address';
  }

  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  // prepare function signagure and arguments
  const selector = {
    funcSig: '',
    args: [] as any,
  };

  switch (API) {
    case 'REVOKE_KYC':
      selector.funcSig = 'revokeTokenKycPublic';
      selector.args = [hederaTokenAddress, accountAddress];
      break;
    case 'FREEZE':
      selector.funcSig = 'freezeTokenPublic';
      selector.args = [hederaTokenAddress, accountAddress];
      break;
    case 'UNFREEZE':
      selector.funcSig = 'unfreezeTokenPublic';
      selector.args = [hederaTokenAddress, accountAddress];
      break;
    case 'DISSOCIATE_TOKEN':
      if (hederaTokenAddresses!.length === 1) {
        selector.funcSig = 'dissociateTokenPublic';
        selector.args = [accountAddress, hederaTokenAddresses![0]];
      } else {
        selector.funcSig = 'dissociateTokensPublic';
        selector.args = [accountAddress, hederaTokenAddresses];
      }
      break;
  }

  // prepare gasLimit
  if (gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(
      baseContract,
      signerAddress,
      network,
      selector.funcSig,
      selector.args
    );
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  // invoking contract methods
  try {
    // prepare states
    let transactionResult;
    switch (API) {
      case 'REVOKE_KYC':
        transactionResult = await baseContract.revokeTokenKycPublic(hederaTokenAddress, accountAddress, {
          gasLimit,
        });
        break;
      case 'FREEZE':
        transactionResult = await baseContract.freezeTokenPublic(hederaTokenAddress, accountAddress, {
          gasLimit,
        });
        break;
      case 'UNFREEZE':
        transactionResult = await baseContract.unfreezeTokenPublic(hederaTokenAddress, accountAddress, {
          gasLimit,
        });
        break;
      case 'DISSOCIATE_TOKEN':
        if (hederaTokenAddresses!.length === 1) {
          transactionResult = await baseContract.dissociateTokenPublic(
            accountAddress,
            hederaTokenAddresses![0],
            { gasLimit }
          );
        } else {
          transactionResult = await baseContract.dissociateTokensPublic(
            accountAddress,
            hederaTokenAddresses,
            { gasLimit }
          );
        }
    }

    // handle contract responses
    return await handleContractResponse(transactionResult);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev manages deducting tokens
 *
 * @dev integrates tokenMagemnentContract.wipeTokenAccountPublic()
 *
 * @dev integrates tokenMagemnentContract.wipeTokenAccountNFTPublic()
 *
 * @dev integrates tokenMagemnentContract.burnTokenPublic()
 *
 * @dev integrates tokenMagemnentContract.deleteTokenPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param API: "WIPE_FUNGIBLE" | "WIPE_NON_FUNGIBLE" | "BURN" | "DELETE"
 *
 * @param hederaTokenAddress: string
 *
 * @param gasLimit: number
 *
 * @param accountAddress?: string
 *
 * @param amount?: number
 *
 * @param serialNumbers?: number[]
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const manageTokenDeduction = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API: 'WIPE_FUNGIBLE' | 'WIPE_NON_FUNGIBLE' | 'BURN' | 'DELETE',
  hederaTokenAddress: string,
  gasLimit: number,
  accountAddress?: string,
  amount?: number,
  serialNumbers?: number[]
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (!isAddress(hederaTokenAddress)) {
    sanitizeErr = 'Invalid token address';
  } else if (accountAddress && !isAddress(accountAddress)) {
    sanitizeErr = 'Invalid account address';
  } else if (amount && amount < 0) {
    sanitizeErr = 'Amount cannot be negative';
  } else if (serialNumbers) {
    serialNumbers.some((sn) => {
      if (sn < 0) {
        sanitizeErr = 'Serial number cannot be negative';
        return true;
      }
    });
  }

  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  // prepare function signagure and arguments
  const selector = {
    funcSig: '',
    args: [] as any,
  };
  switch (API) {
    case 'WIPE_FUNGIBLE':
      selector.funcSig = 'wipeTokenAccountPublic';
      selector.args = [hederaTokenAddress, accountAddress, amount];
      break;
    case 'WIPE_NON_FUNGIBLE':
      selector.funcSig = 'wipeTokenAccountNFTPublic';
      selector.args = [hederaTokenAddress, accountAddress, serialNumbers];
      break;
    case 'BURN':
      selector.funcSig = 'burnTokenPublic';
      selector.args = [hederaTokenAddress, amount, serialNumbers];
      break;
    case 'DELETE':
      selector.funcSig = 'deleteTokenPublic';
      selector.args = [hederaTokenAddress];
      break;
  }

  // prepare gasLimit
  if (gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(
      baseContract,
      signerAddress,
      network,
      selector.funcSig,
      selector.args
    );
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  // invoking contract methods
  try {
    // prepare states
    let transactionResult, errMsg;
    switch (API) {
      case 'WIPE_FUNGIBLE':
        if (!accountAddress) {
          errMsg = 'Account address is needed for WIPE_FUNGIBLE API';
        } else if (!amount) {
          errMsg = 'Amount is needed for WIPE_FUNGIBLE API';
        } else {
          transactionResult = await baseContract.wipeTokenAccountPublic(
            hederaTokenAddress,
            accountAddress,
            amount,
            { gasLimit }
          );
        }
        break;

      case 'WIPE_NON_FUNGIBLE':
        if (!accountAddress) {
          errMsg = 'Account address is needed for WIPE_NON_FUNGIBLE API';
        } else if (!serialNumbers || serialNumbers.length === 0) {
          errMsg = 'Serial number is needed for WIPE_NON_FUNGIBLE API';
        } else {
          transactionResult = await baseContract.wipeTokenAccountNFTPublic(
            hederaTokenAddress,
            accountAddress,
            serialNumbers,
            { gasLimit }
          );
        }
        break;

      case 'BURN':
        if (!amount && (!serialNumbers || serialNumbers.length === 0)) {
          errMsg = 'Amount/serial number is needed for BURN API';
        } else {
          transactionResult = await baseContract.burnTokenPublic(hederaTokenAddress, amount, serialNumbers, {
            gasLimit,
          });
        }
        break;

      case 'DELETE':
        transactionResult = await baseContract.deleteTokenPublic(hederaTokenAddress, { gasLimit });
    }

    // handle contract responses
    return await handleContractResponse(transactionResult, errMsg);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};
// Filename: system-contract-dapp-playground/src/api/hedera/hts-interactions/tokenQuery-interactions/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract, ethers, isAddress } from 'ethers';
import { ISmartContractExecutionResult } from '@/types/contract-interactions/shared';
import { KEY_TYPE_MAP } from '@/utils/contract-interactions/HTS/token-create-custom/constant';
import {
  convertsArgsProxyToHTSSpecificInfo,
  convertsArgsProxyToHTSTokenInfo,
  handleContractResponseWithDynamicEventNames,
} from '@/utils/contract-interactions/HTS/helpers';
import { TNetworkName } from '@/types/common';
import { handleEstimateGas } from '@/utils/common/helpers';

/**
 * @dev queries token validity
 *
 * @dev integrates TokenQueryContract.isTokenPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param gasLimit: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const queryTokenValidity = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  hederaTokenAddress: ethers.AddressLike,
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize param
  if (!isAddress(hederaTokenAddress)) {
    console.error('Invalid token address');
    return { err: 'Invalid token address' };
  }

  try {
    if (gasLimit === 0) {
      const estimateGasResult = await handleEstimateGas(
        baseContract,
        signerAddress,
        network,
        'isTokenPublic',
        [hederaTokenAddress]
      );
      if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
      gasLimit = estimateGasResult.gasLimit;
    }

    const transactionResult = await baseContract.isTokenPublic(hederaTokenAddress, { gasLimit });
    // get transaction receipt
    const txReceipt = await transactionResult.wait();

    // retrieve information from event
    const { data } = txReceipt.logs.filter((event: any) => event.fragment.name === 'IsToken')[0];
    return { IsToken: data, transactionHash: txReceipt.hash };
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev queries token general information
 *
 * @dev integrates TokenQueryContract.getTokenInfoPublic()
 *
 * @dev integrates TokenQueryContract.getFungibleTokenInfoPublic()
 *
 * @dev integrates TokenQueryContract.getNonFungibleTokenInfoPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param API: "TOKEN_INFO" | "FUNGIBLE_INFO" | "NON_FUNFIBLE_INFO"
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param gasLimit: number
 *
 * @param serialNumber?: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const queryTokenGeneralInfomation = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API: 'TOKEN' | 'FUNGIBLE' | 'NON_FUNFIBLE',
  hederaTokenAddress: ethers.AddressLike,
  gasLimit: number,
  serialNumber?: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize param
  if (!isAddress(hederaTokenAddress)) {
    console.error('Invalid token address');
    return { err: 'Invalid token address' };
  } else if (serialNumber && serialNumber < 0) {
    console.error('Invalid serial number');
    return { err: 'Invalid serial number' };
  }

  // prepare events map
  const eventMaps = {
    TOKEN: 'TokenInfo',
    FUNGIBLE: 'FungibleTokenInfo',
    NON_FUNFIBLE: 'NonFungibleTokenInfo',
  };

  // prepare function signagure and arguments
  const selector = {
    funcSig: '',
    args: [] as any,
  };
  switch (API) {
    case 'TOKEN':
      selector.funcSig = 'getTokenInfoPublic';
      selector.args = [hederaTokenAddress];
      break;
    case 'FUNGIBLE':
      selector.funcSig = 'getFungibleTokenInfoPublic';
      selector.args = [hederaTokenAddress];
      break;
    case 'NON_FUNFIBLE':
      if (!serialNumber) {
        console.error('Serial number is needed for querying NON_FUNGIBLE');
        return { err: 'Serial number is needed for querying NON_FUNGIBLE' };
      }
      selector.funcSig = 'getNonFungibleTokenInfoPublic';
      selector.args = [hederaTokenAddress, serialNumber];
      break;
  }

  // prepare gasLimit
  if (gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(
      baseContract,
      signerAddress,
      network,
      selector.funcSig,
      selector.args
    );
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  // invoking contract methods
  try {
    let transactionResult;
    switch (API) {
      case 'TOKEN':
        // prepare transaction
        transactionResult = await baseContract.getTokenInfoPublic(hederaTokenAddress, { gasLimit });
        break;
      case 'FUNGIBLE':
        // prepare transaction
        transactionResult = await baseContract.getFungibleTokenInfoPublic(hederaTokenAddress, { gasLimit });
        break;
      case 'NON_FUNFIBLE':
        if (!serialNumber) {
          console.error('Serial number is needed for querying NON_FUNGIBLE');
          return { err: 'Serial number is needed for querying NON_FUNGIBLE' };
        } else {
          // prepare transaction
          transactionResult = await baseContract.getNonFungibleTokenInfoPublic(
            hederaTokenAddress,
            serialNumber,
            { gasLimit }
          );
        }
        break;
    }

    // get transaction receipt
    const txReceipt = await transactionResult.wait();

    // retrieve information from event
    const { args } = txReceipt.logs.filter((event: any) => event.fragment.name === eventMaps[API])[0];

    return {
      [eventMaps[API]]: convertsArgsProxyToHTSTokenInfo(args.tokenInfo, API),
      transactionHash: txReceipt.hash,
    };
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev queries token's certain information fields
 *
 * @dev integrates TokenQueryContract.getTokenDefaultFreezeStatusPublic()
 *
 * @dev integrates TokenQueryContract.getTokenDefaultKycStatusPublic()
 *
 * @dev integrates TokenQueryContract.getTokenCustomFeesPublic()
 *
 * @dev integrates TokenQueryContract.getTokenExpiryInfoPublic()
 *
 * @dev integrates TokenQueryContract.getTokenTypePublic()
 *
 * @dev integrates TokenQueryContract.getTokenKeyPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param network: TNetworkName
 *
 * @param API: "DEFAULT_FREEZE_STATUS" | "DEFAULT_KYC_STATUS" | "CUSTOM_FEES" | "TOKEN_EXPIRY" | "TOKEN_TYPE" | "TOKEN_KEYS"
 *
 * @param hederaTokenAddress: ethers.AddressLike,
 *
 * @param gasLimit: number
 *
 * @param keyType?: IHederaTokenServiceKeyType
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const queryTokenSpecificInfomation = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API:
    | 'TOKEN_TYPE'
    | 'TOKEN_KEYS'
    | 'CUSTOM_FEES'
    | 'TOKEN_EXPIRY'
    | 'DEFAULT_KYC_STATUS'
    | 'DEFAULT_FREEZE_STATUS',
  hederaTokenAddress: ethers.AddressLike,
  gasLimit: number,
  keyType?: IHederaTokenServiceKeyType
): Promise<ISmartContractExecutionResult> => {
  // sanitize param
  if (!isAddress(hederaTokenAddress)) {
    console.error('Invalid token address');
    return { err: 'Invalid token address' };
  }

  // prepare events map
  const eventMaps = {
    TOKEN_TYPE: 'TokenType',
    TOKEN_KEYS: 'TokenKey',
    CUSTOM_FEES: 'TokenCustomFees',
    TOKEN_EXPIRY: 'TokenExpiryInfo',
    DEFAULT_KYC_STATUS: 'TokenDefaultKycStatus',
    DEFAULT_FREEZE_STATUS: 'TokenDefaultFreezeStatus',
  };

  // prepare function signagure and arguments
  const selector = {
    funcSig: '',
    args: [hederaTokenAddress] as any,
  };
  switch (API) {
    case 'DEFAULT_FREEZE_STATUS':
      selector.funcSig = 'getTokenDefaultFreezeStatusPublic';
      break;
    case 'DEFAULT_KYC_STATUS':
      selector.funcSig = 'getTokenDefaultKycStatusPublic';
      break;
    case 'CUSTOM_FEES':
      selector.funcSig = 'getTokenCustomFeesPublic';
      break;
    case 'TOKEN_EXPIRY':
      selector.funcSig = 'getTokenExpiryInfoPublic';
      break;
    case 'TOKEN_TYPE':
      selector.funcSig = 'getTokenTypePublic';
      break;
    case 'TOKEN_KEYS':
      if (!keyType) {
        console.error('Key Type is needed for querying NON_FUNGIBLE');
        return { err: 'Key Type is needed for querying NON_FUNGIBLE' };
      }
      selector.funcSig = 'getTokenKeyPublic';
      selector.args = [hederaTokenAddress, KEY_TYPE_MAP[keyType]];
      break;
  }

  // prepare gasLimit
  if (gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(
      baseContract,
      signerAddress,
      network,
      selector.funcSig,
      selector.args
    );
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  // invoking contract methods
  try {
    let transactionResult;
    switch (API) {
      case 'DEFAULT_FREEZE_STATUS':
        transactionResult = await baseContract.getTokenDefaultFreezeStatusPublic(hederaTokenAddress, {
          gasLimit,
        });
        break;

      case 'DEFAULT_KYC_STATUS':
        transactionResult = await baseContract.getTokenDefaultKycStatusPublic(hederaTokenAddress, {
          gasLimit,
        });
        break;

      case 'CUSTOM_FEES':
        transactionResult = await baseContract.getTokenCustomFeesPublic(hederaTokenAddress, { gasLimit });
        break;

      case 'TOKEN_EXPIRY':
        transactionResult = await baseContract.getTokenExpiryInfoPublic(hederaTokenAddress, { gasLimit });
        break;
      case 'TOKEN_TYPE':
        transactionResult = await baseContract.getTokenTypePublic(hederaTokenAddress, { gasLimit });
        break;
      case 'TOKEN_KEYS':
        if (!keyType) {
          console.error('Key Type is needed for querying NON_FUNGIBLE');
          return { err: 'Key Type is needed for querying NON_FUNGIBLE' };
        } else {
          transactionResult = await baseContract.getTokenKeyPublic(
            hederaTokenAddress,
            KEY_TYPE_MAP[keyType],
            { gasLimit }
          );
        }
        break;
    }

    // get transaction receipt
    const txReceipt = await transactionResult.wait();

    // retrieve information from event
    const tokenInfoResult = txReceipt.logs.filter((event: any) => event.fragment.name === eventMaps[API])[0];

    if (API === 'DEFAULT_FREEZE_STATUS' || API === 'DEFAULT_KYC_STATUS' || API === 'TOKEN_TYPE') {
      return { [eventMaps[API]]: tokenInfoResult.data, transactionHash: txReceipt.hash };
    } else {
      const tokenInfo = convertsArgsProxyToHTSSpecificInfo(tokenInfoResult.args, API);
      return { [eventMaps[API]]: tokenInfo, transactionHash: txReceipt.hash };
    }
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev queries token's permission information
 *
 * @dev integrates TokenQueryContract.allowancePublic()
 *
 * @dev integrates TokenQueryContract.getApprovedPublic()
 *
 * @dev integrates TokenQueryContract.isApprovedForAllPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param API: "ALLOWANCE" | "GET_APPROVED" | "IS_APPROVAL"
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param gasLimit: number
 *
 * @param ownerAddress?: ethers.AddressLike
 *
 * @param spenderAddress?: ethers.AddressLike
 *
 * @param serialNumber?: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const queryTokenPermissionInformation = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API: 'ALLOWANCE' | 'GET_APPROVED' | 'IS_APPROVAL',
  hederaTokenAddress: ethers.AddressLike,
  gasLimit: number,
  ownerAddress?: ethers.AddressLike,
  spenderAddress?: ethers.AddressLike,
  serialNumber?: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize param
  if (!isAddress(hederaTokenAddress)) {
    console.error('Invalid token address');
    return { err: 'Invalid token address' };
  } else if (ownerAddress && !isAddress(ownerAddress)) {
    console.error('Invalid owner address');
    return { err: 'Invalid owner address' };
  } else if (spenderAddress && !isAddress(spenderAddress)) {
    console.error('Invalid spender address');
    return { err: 'Invalid spender address' };
  } else if (serialNumber && serialNumber < 0) {
    console.error('Invalid serial number');
    return { err: 'Invalid serial number' };
  }

  // prepare events map
  const eventMaps = {
    IS_APPROVAL: 'Approved',
    ALLOWANCE: 'AllowanceValue',
    GET_APPROVED: 'ApprovedAddress',
  };

  let transactionResult, errMsg;
  // invoking contract methods
  try {
    switch (API) {
      case 'ALLOWANCE':
        if (!ownerAddress) {
          errMsg = 'Owner address is needed for ALLOWANCE API';
        } else if (!spenderAddress) {
          errMsg = 'Spender address is needed for ALLOWANCE API';
        } else {
          if (gasLimit === 0) {
            const estimateGasResult = await handleEstimateGas(
              baseContract,
              signerAddress,
              network,
              'allowancePublic',
              [hederaTokenAddress, ownerAddress, spenderAddress]
            );
            if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
            gasLimit = estimateGasResult.gasLimit;
          }
          transactionResult = await baseContract.allowancePublic(
            hederaTokenAddress,
            ownerAddress,
            spenderAddress,
            { gasLimit }
          );
        }
        break;
      case 'GET_APPROVED':
        if (!serialNumber) {
          errMsg = 'Serial number is needed for GET_APPROVED API';
        } else {
          if (gasLimit === 0) {
            const estimateGasResult = await handleEstimateGas(
              baseContract,
              signerAddress,
              network,
              'getApprovedPublic',
              [hederaTokenAddress, serialNumber]
            );
            if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
            gasLimit = estimateGasResult.gasLimit;
          }
          transactionResult = await baseContract.getApprovedPublic(hederaTokenAddress, serialNumber, {
            gasLimit,
          });
        }
        break;
      case 'IS_APPROVAL':
        if (!ownerAddress) {
          errMsg = 'Owner address is needed for IS_APPROVAL API';
        } else if (!spenderAddress) {
          errMsg = 'Spender address is needed for IS_APPROVAL API';
        } else {
          if (gasLimit === 0) {
            const estimateGasResult = await handleEstimateGas(
              baseContract,
              signerAddress,
              network,
              'isApprovedForAllPublic',
              [hederaTokenAddress, ownerAddress, spenderAddress]
            );
            if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
            gasLimit = estimateGasResult.gasLimit;
          }
          transactionResult = await baseContract.isApprovedForAllPublic(
            hederaTokenAddress,
            ownerAddress,
            spenderAddress
          );
        }
        break;
    }

    // return err if any
    if (errMsg) {
      console.error(errMsg);
      return { err: errMsg };
    } else if (!transactionResult) {
      console.error('Cannot execute contract methods');
      return { err: 'Cannot execute contract methods' };
    }

    return await handleContractResponseWithDynamicEventNames(transactionResult, eventMaps, API);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev queries token's relation information
 *
 * @dev integrates TokenQueryContract.isKycPublic()
 *
 * @dev integrates TokenQueryContract.isFrozenPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param API: "IS_KYC" | "IS_FROZEN"
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param accountAddress: ethers.AddressLike
 *
 * @param gasLimit: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const queryTokenStatusInformation = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API: 'IS_KYC' | 'IS_FROZEN',
  hederaTokenAddress: ethers.AddressLike,
  accountAddress: ethers.AddressLike,
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize param
  if (!isAddress(hederaTokenAddress)) {
    console.error('Invalid token address');
    return { err: 'Invalid token address' };
  } else if (accountAddress && !isAddress(accountAddress)) {
    console.error('Invalid owner address');
    return { err: 'Invalid owner address' };
  }

  // prepare events map
  const eventMaps = {
    IS_KYC: 'KycGranted',
    IS_FROZEN: 'Frozen',
  };

  if (gasLimit === 0) {
    const estimateGasResult = await handleEstimateGas(
      baseContract,
      signerAddress,
      network,
      API === 'IS_KYC' ? 'isKycPublic' : 'isFrozenPublic',
      [hederaTokenAddress, accountAddress]
    );
    if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
    gasLimit = estimateGasResult.gasLimit;
  }

  // invoking contract methods
  try {
    let transactionResult;
    switch (API) {
      case 'IS_KYC':
        transactionResult = await baseContract.isKycPublic(hederaTokenAddress, accountAddress, { gasLimit });
        break;

      case 'IS_FROZEN':
        transactionResult = await baseContract.isFrozenPublic(hederaTokenAddress, accountAddress, {
          gasLimit,
        });
        break;
    }

    return await handleContractResponseWithDynamicEventNames(transactionResult, eventMaps, API);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};
// Filename: system-contract-dapp-playground/src/api/hedera/hts-interactions/tokenTransfer-interactions/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { TNetworkName } from '@/types/common';
import { Contract, ethers, isAddress } from 'ethers';
import { handleEstimateGas } from '@/utils/common/helpers';
import { handleContractResponse } from '@/utils/contract-interactions/HTS/helpers';
import { ISmartContractExecutionResult } from '@/types/contract-interactions/shared';

/**
 * @dev transfers Hedera Cryptos
 *
 * @dev integrates TokenTransferContract.cryptoTransferPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param transferList: IHederaTokenServiceTransferList
 *
 * @param tokenTransferList: IHederaTokenServiceTokenTransferList[]
 *
 * @param gasLimit: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const transferCrypto = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  transferList: IHederaTokenServiceTransferList,
  tokenTransferList: IHederaTokenServiceTokenTransferList[],
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // invoking contract methods
  try {
    if (gasLimit === 0) {
      const estimateGasResult = await handleEstimateGas(
        baseContract,
        signerAddress,
        network,
        'cryptoTransferPublic',
        [transferList, tokenTransferList]
      );
      if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
      gasLimit = estimateGasResult.gasLimit;
    }
    const tx = await baseContract.cryptoTransferPublic(transferList, tokenTransferList, {
      gasLimit,
    });

    return await handleContractResponse(tx);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev transfers Hedera fungible tokens
 *
 * @dev integrates TokenTransferContract.transferTokensPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param accountId: ethers.AddressLike[]
 *
 * @param amount: number[]
 *
 * @param gasLimit: number
 *
 * @return Promise Promise<ISmartContractExecutionResult>
 */
export const transferFungibleTokens = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  hederaTokenAddress: ethers.AddressLike,
  accountIDs: ethers.AddressLike[],
  amounts: number[],
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (!isAddress(hederaTokenAddress)) {
    sanitizeErr = 'Invalid token address';
  }
  if (!sanitizeErr) {
    accountIDs.some((address) => {
      if (!isAddress(address)) {
        sanitizeErr = `${address} is an invalid accountID`;
        return true;
      }
    });
  }
  if (!sanitizeErr) {
    // @notice skipping the first element of the array in the loop as the initial item in the amounts array represents the totalInputAmount multiplied by -1
    amounts.slice(1).some((amount) => {
      if (amount < 0) {
        sanitizeErr = `${amount} is an invalid amount`;
        return true;
      }
    });
  }
  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  // invoking contract methods
  try {
    if (gasLimit === 0) {
      const estimateGasResult = await handleEstimateGas(
        baseContract,
        signerAddress,
        network,
        'transferTokensPublic',
        [hederaTokenAddress, accountIDs, amounts]
      );
      if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
      gasLimit = estimateGasResult.gasLimit;
    }

    const tx = await baseContract.transferTokensPublic(hederaTokenAddress, accountIDs, amounts, {
      gasLimit,
    });

    return await handleContractResponse(tx);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev transfers Hedera non-fungible tokens
 *
 * @dev integrates TokenTransferContract.transferNFTsPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param senders: ethers.AddressLike[]
 *
 * @param receivers: ethers.AddressLike[]
 *
 * @param serialNumbers: number[]
 *
 * @param gasLimit: number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const transferNonFungibleTokens = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  hederaTokenAddress: ethers.AddressLike,
  senders: ethers.AddressLike[],
  receivers: ethers.AddressLike[],
  serialNumbers: number[],
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (!isAddress(hederaTokenAddress)) {
    sanitizeErr = 'Invalid token address';
  }
  if (!sanitizeErr) {
    senders.some((address) => {
      if (!isAddress(address)) {
        sanitizeErr = `${address} is an invalid sender accountID`;
        return true;
      }
    });
  }
  if (!sanitizeErr) {
    receivers.some((address) => {
      if (!isAddress(address)) {
        sanitizeErr = `${address} is an invalid receiver accountID`;
        return true;
      }
    });
  }
  if (!sanitizeErr) {
    serialNumbers.some((seriNum) => {
      if (seriNum < 0) {
        sanitizeErr = `${seriNum} is an invalid serial number`;
        return true;
      }
    });
  }
  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  // invoking contract methods
  try {
    if (gasLimit === 0) {
      const estimateGasResult = await handleEstimateGas(
        baseContract,
        signerAddress,
        network,
        'transferNFTsPublic',
        [hederaTokenAddress, senders, serialNumbers]
      );
      if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
      gasLimit = estimateGasResult.gasLimit;
    }

    const tx = await baseContract.transferNFTsPublic(hederaTokenAddress, senders, receivers, serialNumbers, {
      gasLimit,
    });

    return await handleContractResponse(tx);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};

/**
 * @dev transfers single token (fungible vs non-fungible)
 *
 * @dev integrates TokenTransferContract.transferTokenPublic()
 *
 * @dev integrates TokenTransferContract.transferNFTPublic()
 *
 * @dev integrates TokenTransferContract.transferFromPublic()
 *
 * @dev integrates TokenTransferContract.transferFromNFTPublic()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param API: "FUNGIBLE" | "NFT" | 'FUNGIBLE_FROM' | 'NFT_FROM'
 *
 * @param hederaTokenAddress: ethers.AddressLike
 *
 * @param sender: ethers.AddressLike
 *
 * @param receiver: ethers.AddressLike
 *
 * @param quantity: number (amount/serialNumber)
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const transferSingleToken = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  API: 'FUNGIBLE' | 'NFT' | 'FUNGIBLE_FROM' | 'NFT_FROM',
  hederaTokenAddress: ethers.AddressLike,
  sender: ethers.AddressLike,
  receiver: ethers.AddressLike,
  quantity: number,
  gasLimit: number
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  let sanitizeErr;
  if (!isAddress(hederaTokenAddress)) {
    sanitizeErr = 'Invalid token address';
  } else if (!isAddress(sender)) {
    sanitizeErr = 'Invalid sender address';
  } else if (!isAddress(receiver)) {
    sanitizeErr = 'Invalid receiver address';
  } else if (quantity < 0) {
    sanitizeErr = 'Invalid quantity';
  }
  if (sanitizeErr) {
    console.error(sanitizeErr);
    return { err: sanitizeErr };
  }

  // invoking contract methods
  try {
    let transactionResult;

    switch (API) {
      case 'FUNGIBLE':
        if (gasLimit === 0) {
          const estimateGasResult = await handleEstimateGas(
            baseContract,
            signerAddress,
            network,
            'transferTokenPublic',
            [hederaTokenAddress, sender, receiver, quantity]
          );
          if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
          gasLimit = estimateGasResult.gasLimit;
        }

        transactionResult = await baseContract.transferTokenPublic(
          hederaTokenAddress,
          sender,
          receiver,
          quantity,
          { gasLimit }
        );
        break;

      case 'NFT':
        if (gasLimit === 0) {
          const estimateGasResult = await handleEstimateGas(
            baseContract,
            signerAddress,
            network,
            'transferNFTPublic',
            [hederaTokenAddress, sender, receiver, quantity]
          );
          if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
          gasLimit = estimateGasResult.gasLimit;
        }

        transactionResult = await baseContract.transferNFTPublic(
          hederaTokenAddress,
          sender,
          receiver,
          quantity,
          { gasLimit }
        );
        break;

      case 'FUNGIBLE_FROM':
        if (gasLimit === 0) {
          const estimateGasResult = await handleEstimateGas(
            baseContract,
            signerAddress,
            network,
            'transferFromPublic',
            [hederaTokenAddress, sender, receiver, quantity]
          );
          if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
          gasLimit = estimateGasResult.gasLimit;
        }

        transactionResult = await baseContract.transferFromPublic(
          hederaTokenAddress,
          sender,
          receiver,
          quantity,
          { gasLimit }
        );
        break;

      case 'NFT_FROM':
        if (gasLimit === 0) {
          const estimateGasResult = await handleEstimateGas(
            baseContract,
            signerAddress,
            network,
            'transferFromNFTPublic',
            [hederaTokenAddress, sender, receiver, quantity]
          );
          if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
          gasLimit = estimateGasResult.gasLimit;
        }

        transactionResult = await baseContract.transferFromNFTPublic(
          hederaTokenAddress,
          sender,
          receiver,
          quantity,
          { gasLimit }
        );
        break;
    }

    return await handleContractResponse(transactionResult);
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};
// Filename: system-contract-dapp-playground/src/api/hedera/ihrc-interactions/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { TNetworkName } from '@/types/common';
import { Contract, ethers, isAddress } from 'ethers';
import { handleEstimateGas } from '@/utils/common/helpers';
import { HEDERA_SMART_CONTRACTS_ASSETS } from '@/utils/common/constants';
import { ISmartContractExecutionResult } from '@/types/contract-interactions/shared';

/**
 * @dev handle associating and/or dissociating token from an EOA
 *
 * @dev integrates IHRC719.associate()
 *
 * @dev integrates IHRC719.dissociate()
 *
 * @param API: "ASSOCIATE" | "DISSOCIATE"
 *
 * @param hederaTokenAddress: string
 *
 * @param signer: ethers.JsonRpcSigner
 *
 * @param gasLimit: number
 *
 * @param network: TNetworkName
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const handleIHRC719APIs = async (
  API: 'ASSOCIATE' | 'DISSOCIATE',
  hederaTokenAddress: string,
  signer: ethers.JsonRpcSigner,
  gasLimit: number,
  network: TNetworkName
): Promise<ISmartContractExecutionResult> => {
  // sanitize params
  if (!isAddress(hederaTokenAddress)) {
    console.error('Invalid token address');
    return { err: 'Invalid token address' };
  }

  // prepare IHRC719 ABI
  const IHRC719 = new ethers.Interface(HEDERA_SMART_CONTRACTS_ASSETS.TOKEN_ASSOCIATION.contractABI);

  // prepare a contract instance at hederaTokenAddress
  const baseContract = new Contract(hederaTokenAddress, IHRC719, signer);

  // invoke contract method
  try {
    let txResult;
    switch (API) {
      case 'ASSOCIATE':
        if (gasLimit === 0) {
          const estimateGasResult = await handleEstimateGas(
            baseContract,
            signer.address,
            network,
            'associate',
            []
          );
          if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
          gasLimit = estimateGasResult.gasLimit;
        }
        txResult = await baseContract.associate({ gasLimit });
        break;
      case 'DISSOCIATE':
        if (gasLimit === 0) {
          const estimateGasResult = await handleEstimateGas(
            baseContract,
            signer.address,
            network,
            'dissociate',
            []
          );
          if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
          gasLimit = estimateGasResult.gasLimit;
        }
        txResult = await baseContract.dissociate({ gasLimit });
        break;
    }

    // retrieve txReceipt
    const txReceipt = await txResult.wait();

    return { transactionHash: txReceipt.hash };
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};
// Filename: system-contract-dapp-playground/src/api/hedera/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { ContractFactory } from 'ethers';
import { getWalletProvider } from '../wallet';
import { ITransactionResult } from '@/types/contract-interactions/shared';
import { IContractABI, IHederaSmartContractResult } from '@/types/common';
import { HEDERA_TRANSACTION_RESULT_STORAGE_KEYS } from '@/utils/common/constants';

/**
 * @dev deploys smart contract to Hedera network
 *
 * @params contractABI: IContractABI
 *
 * @params contractBytecode: string
 *
 * @return Promise<IHederaSmartContractResult>
 *
 * @resource https://github.com/ed-marquez/hedera-example-metamask-counter-dapp/blob/master/src/components/hedera/contractDeploy.js
 */
export const deploySmartContract = async (
  contractABI: IContractABI[],
  contractBytecode: string,
  params: any[]
): Promise<IHederaSmartContractResult> => {
  // states
  const transactionResultStorageKey = HEDERA_TRANSACTION_RESULT_STORAGE_KEYS['CONTRACT-CREATE'];

  // get contract create transactions from localStorage
  const cachedCreateTransactions = localStorage.getItem(transactionResultStorageKey);
  const contractCreateTransactions = cachedCreateTransactions ? JSON.parse(cachedCreateTransactions) : [];

  // get signer
  const walletProvider = getWalletProvider();
  if (walletProvider.err || !walletProvider.walletProvider) {
    return { err: walletProvider.err };
  }
  const walletSigner = await walletProvider.walletProvider.getSigner();

  // Deploy smart contract
  try {
    // prepare gaslimit
    const gasLimit = 4_000_000;

    // get contract from contract factory
    const contract = new ContractFactory(JSON.stringify(contractABI), contractBytecode, walletSigner);

    // execute deploy transaction
    const contractDeployTx = await contract.deploy(...params, {
      gasLimit,
    });

    // get contractAddress
    const contractAddress = await contractDeployTx.getAddress();

    // retrieve transaction receipt
    const txReceipt = contractDeployTx.deploymentTransaction();

    // prepare create transaction result
    if (txReceipt) {
      const createTransactionResult: ITransactionResult = {
        status: 'success',
        transactionResultStorageKey,
        transactionTimeStamp: Date.now(),
        txHash: txReceipt.hash as string,
        transactionType: 'CONTRACT-CREATE',
        sessionedContractAddress: contractAddress,
      };
      contractCreateTransactions.push(createTransactionResult);
      localStorage.setItem(transactionResultStorageKey, JSON.stringify(contractCreateTransactions));
    }

    return { contractAddress };
  } catch (err) {
    console.error(err);
    return { err };
  }
};
// Filename: system-contract-dapp-playground/src/api/hedera/prng-interactions/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract, ethers } from 'ethers';
import { TNetworkName } from '@/types/common';
import { handleEstimateGas } from '@/utils/common/helpers';
import { ISmartContractExecutionResult } from '@/types/contract-interactions/shared';

/**
 * @dev handle retrieving a pseudo-random seed
 *
 * @dev integrates PRNG.getPseudorandomSeed()
 *
 * @param baseContract: ethers.Contract
 *
 * @param signerAddress: ethers.AddressLike
 *
 * @param network: TNetworkName
 *
 * @param gasLimit: Number
 *
 * @return Promise<ISmartContractExecutionResult>
 */
export const handlePRGNAPI = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  gasLimit: Number
): Promise<ISmartContractExecutionResult> => {
  try {
    if (gasLimit === 0) {
      const estimateGasResult = await handleEstimateGas(
        baseContract,
        signerAddress,
        network,
        'getPseudorandomSeed',
        []
      );
      if (!estimateGasResult.gasLimit || estimateGasResult.err) return { err: estimateGasResult.err };
      gasLimit = estimateGasResult.gasLimit;
    }

    // invoke contract method
    const tx = await baseContract.getPseudorandomSeed({ gasLimit });

    // retrieve txReceipt
    const txReceipt = await tx.wait();

    const { data } = txReceipt.logs.filter((event: any) => event.fragment.name === 'PseudoRandomSeed')[0];

    return { transactionHash: txReceipt.hash, pseudoRandomSeed: data };
  } catch (err: any) {
    console.error(err);
    return { err, transactionHash: err.receipt && err.receipt.hash };
  }
};
// Filename: system-contract-dapp-playground/src/api/localStorage/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { OFFCIAL_NETWORK_NAME } from '@/utils/common/constants';

/**
 * @dev get map typed value from LocalStorage
 */
export const getMapValuesFromLocalStorage = (transactionResultStorageKey: string) => {
  try {
    const storagedValue = localStorage.getItem(transactionResultStorageKey);
    if (storagedValue) {
      return {
        storagedValue: new Map(Object.entries(JSON.parse(storagedValue))) as Map<string, number>,
      };
    } else {
      return { storagedValue: new Map() };
    }
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev get allowances from LocalStorage
 *
 * @param key string
 *
 * @return storageResult?: []
 *
 * @return err?
 */
export const getArrayTypedValuesFromLocalStorage = (key: string) => {
  try {
    const storageResult = localStorage.getItem(key);
    return {
      storageResult: storageResult ? JSON.parse(storageResult) : [],
    };
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev clear HEDERA transaction results cached in localStorage
 *
 * @param contractKey?: string
 *
 * @param readonly?: boolean
 */
export const clearCachedTransactions = (contractKey?: string, readonly?: boolean) => {
  // prepare key
  const targetKey = contractKey ? contractKey : OFFCIAL_NETWORK_NAME;

  // loop through localStorage items
  if (localStorage) {
    for (let i = 0; i < localStorage.length; i++) {
      // get key
      const key = localStorage.key(i);

      // remove items that have keys include `contractKey`
      if (key?.includes(targetKey)) {
        if (readonly) {
          if (key?.includes('READONLY')) {
            localStorage.removeItem(key);
            i--;
          }
        } else {
          localStorage.removeItem(key);
          i--;
        }
      }
    }
  }
};
// Filename: system-contract-dapp-playground/src/api/mirror-node/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import axios from 'axios';
import { ethers } from 'ethers';
import { HEDERA_NETWORKS } from '@/utils/common/constants';
import { IAccountIDMirrorNodeResult, IEstimateGasMirrorNodeResult, TNetworkName } from '@/types/common';

/**
 * @dev get Hedera native account ID from EVM address
 *
 * @param evmAddress string
 *
 * @param network string
 *
 * @return Promise<IAccountIDMirrorNodeResult>
 */
export const getHederaNativeIDFromEvmAddress = async (
  evmAddress: string,
  network: TNetworkName,
  params: 'accounts' | 'contracts'
): Promise<IAccountIDMirrorNodeResult> => {
  try {
    const accountInfo = await axios.get(`${HEDERA_NETWORKS[network].mirrorNodeUrl}/${params}/${evmAddress}`);

    if (params === 'accounts') {
      return { accountId: accountInfo.data.account };
    } else {
      return { contractId: accountInfo.data.contract_id };
    }
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev estimate gas for transactions
 *
 * @param to string(AddressLike) - typically the address of the smart contract the call is aiming at
 *
 * @param from string(AddressLike) - typically the address of the caller
 *
 * @param data string - the calldata of the function
 *
 * @param network string - the current network
 *
 * @return IAccountIDMirrorNodeResult
 */
export const estimateGasViaMirrorNode = async (
  to: ethers.AddressLike,
  from: ethers.AddressLike,
  data: string,
  network: TNetworkName
): Promise<IEstimateGasMirrorNodeResult> => {
  const requestData = JSON.stringify({
    data,
    from,
    to,
    estimate: true,
  });

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${HEDERA_NETWORKS[network].mirrorNodeUrl}/contracts/call`,
    headers: {
      'Content-Type': 'application/json',
    },
    data: requestData,
  };
  try {
    const estimateGasResponse = await axios.request(config);
    return { gasLimit: estimateGasResponse.data.result };
  } catch (err) {
    console.error(err);
    return { err };
  }
};
// Filename: system-contract-dapp-playground/src/api/wallet/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import { IWalletResult } from '@/types/common';
import { ethers, BrowserProvider } from 'ethers';

/**
 * @dev get wallet object if available
 *
 * @return object<any>
 */
export const getWalletObject = () => {
  if (typeof window !== 'undefined') {
    const { ethereum }: any = window;
    return ethereum;
  }
};

/**
 * @dev get ethersjs wallet provider (i.e. Metamask provider)
 *
 * @return IWalletResult
 */
export const getWalletProvider = (): IWalletResult => {
  // prepare walletObject
  const walletObject = getWalletObject();
  if (!walletObject) {
    return { err: '!HEDERA' };
  }

  // get walletProvider
  const walletProvider: BrowserProvider = new ethers.BrowserProvider(walletObject);
  return { walletProvider };
};

/**
 * @dev get the balance of an account
 *
 * @params walletProvider: ethers.BrowserProvider
 *
 * @params account: string
 *
 * @returns Promise<IWalletResult>
 */
export const getBalance = async (
  walletProvider: ethers.BrowserProvider,
  account: string
): Promise<IWalletResult> => {
  try {
    const balance = await walletProvider.send('eth_getBalance', [account]);
    return {
      balance,
    };
  } catch (err) {
    console.error(err);
    return { err };
  }
};

/**
 * @dev return current chainId of the network that the walletPro is connected to
 *
 * @params walletProvider: ethers.BrowserProvider
 *
 * @returns Promise<IWalletResult>
 */
export const getCurrentChainId = async (walletProvider: ethers.BrowserProvider): Promise<IWalletResult> => {
  try {
    const currentChainId = await walletProvider.send('eth_chainId', []);
    return {
      currentChainId,
    };
  } catch (err) {
    return { err };
  }
};

/**
 * @dev requests a list of connected accounts in a the wallet
 *
 * @params walletProvider: ethers.BrowserProvider
 *
 * @returns Promise<IWalletResult>
 */
export const requestAccount = async (walletProvider: ethers.BrowserProvider): Promise<IWalletResult> => {
  try {
    const accounts: [string] = await walletProvider.send('eth_requestAccounts', []);
    return {
      accounts,
    };
  } catch (err) {
    return { err };
  }
};
// Filename: system-contract-dapp-playground/src/components/contract-interaction/hts/shared/states/commonStates.ts
/*-
 *
 * Hedera Smart Contracts
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

// Page Size
export const TRANSACTION_PAGE_SIZE = 10;

// keys states
export const HederaTokenKeyTypes: IHederaTokenServiceKeyType[] = [
  'ADMIN',
  'KYC',
  'FREEZE',
  'WIPE',
  'SUPPLY',
  'FEE',
  'PAUSE',
];

// key value types
export const HederaTokenKeyValueType: IHederaTokenServiceKeyValueType[] = [
  'inheritAccountKey',
  'contractId',
  'ed25519',
  'ECDSA_secp256k1',
  'delegatableContractId',
];
// Filename: system-contract-dapp-playground/src/components/contract-interaction/hts/token-transfer-contract/method/transferCrypto/helpers/generateInitialValues.ts
/*-
 *
 * Hedera Smart Contracts
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

import { generatedRandomUniqueKey } from '@/utils/common/helpers';

export interface CryptoTransferParam {
  fieldKey: string;
  fieldValue: {
    accountID: string;
    amount: string;
    isApprovalA: boolean;
  };
}

export interface NonFungibleTokenTransferParam {
  fieldKey: string;
  fieldValue: {
    senderAccountID: string;
    receiverAccountID: string;
    serialNumber: string;
    isApprovalB: boolean;
  };
}

export interface TokenTransferParam {
  fieldKey: string;
  fieldValue: {
    token: string;
    transfers: CryptoTransferParam[];
    tokenType: 'FUNGIBLE' | 'NON_FUNGIBLE';
    nftTransfers: NonFungibleTokenTransferParam[];
  };
}

export const generateInitialCryptoTransferParamValues = (): CryptoTransferParam => {
  return {
    fieldKey: generatedRandomUniqueKey(9),
    fieldValue: {
      accountID: '',
      amount: '',
      isApprovalA: false,
    },
  };
};

export const generateInitialFungibleTokenTransferParamValues = (): CryptoTransferParam => {
  return {
    fieldKey: generatedRandomUniqueKey(9),
    fieldValue: {
      accountID: '',
      amount: '',
      isApprovalA: false,
    },
  };
};

export const generateInitialNonFungibleTokenTransferParamValues = (): NonFungibleTokenTransferParam => {
  return {
    fieldKey: generatedRandomUniqueKey(9),
    fieldValue: {
      senderAccountID: '',
      receiverAccountID: '',
      serialNumber: '',
      isApprovalB: false,
    },
  };
};

export const generateInitialTokenTransferParamValues = (): TokenTransferParam => {
  return {
    fieldKey: generatedRandomUniqueKey(9),
    fieldValue: {
      token: '',
      transfers: [],
      nftTransfers: [],
      tokenType: 'FUNGIBLE',
    },
  };
};
// Filename: system-contract-dapp-playground/src/components/contract-interaction/hts/token-transfer-contract/method/transferCrypto/helpers/prepareCryptoTransferValues.ts
/*-
 *
 * Hedera Smart Contracts
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

import { CryptoTransferParam, TokenTransferParam } from './generateInitialValues';

interface CryptoTransferPageProps {
  contractCaller: string;
  cryptoTransferParamValues: CryptoTransferParam[];
}

export const prepareCryptoTransferList = ({
  contractCaller,
  cryptoTransferParamValues,
}: CryptoTransferPageProps) => {
  // prepare total amount
  const amountArray = cryptoTransferParamValues.map((prev) => Number(prev.fieldValue.amount));
  const amountTotal = amountArray.reduce((sum, curVal) => sum + curVal, 0);

  let cryptoTransfers: IHederaTokenServiceAccountAmount[] = [
    {
      accountID: contractCaller,
      amount: amountTotal * -1,
      isApproval: false,
    },
  ];

  cryptoTransferParamValues.forEach((prev) => {
    cryptoTransfers.push({
      accountID: prev.fieldValue.accountID,
      amount: Number(prev.fieldValue.amount),
      isApproval: prev.fieldValue.isApprovalA,
    });
  });

  return {
    transfers: cryptoTransfers,
  };
};

interface TokenTransferPageProps {
  tokenTransferParamValues: TokenTransferParam[];
  contractCaller: string;
}

export const prepareTokenTransferList = ({
  tokenTransferParamValues,
  contractCaller,
}: TokenTransferPageProps) => {
  let tokenTransferList: IHederaTokenServiceTokenTransferList[] = [];
  tokenTransferParamValues.forEach((tokenTransferParamValue) => {
    if (tokenTransferParamValue.fieldValue.tokenType === 'FUNGIBLE') {
      // prepare total amount
      let amountsArray = [] as number[];
      tokenTransferParamValue.fieldValue.transfers.forEach((transfer) => {
        amountsArray.push(Number(transfer.fieldValue.amount));
      });

      const amountsTotal = amountsArray.reduce((sum, curVal) => sum + curVal, 0);

      let tokenTransfers = [
        {
          accountID: contractCaller,
          amount: amountsTotal * -1,
          isApproval: false,
        },
      ];

      tokenTransferParamValue.fieldValue.transfers.forEach((transfer) => {
        tokenTransfers.push({
          accountID: transfer.fieldValue.accountID,
          amount: Number(transfer.fieldValue.amount),
          isApproval: transfer.fieldValue.isApprovalA,
        });
      });

      tokenTransferList.push({
        token: tokenTransferParamValue.fieldValue.token,
        transfers: tokenTransfers,
        nftTransfers: [],
      });
    } else {
      let nftTransfers = [] as IHederaTokenServiceNftTransfer[];
      tokenTransferParamValue.fieldValue.nftTransfers.forEach((transfer) => {
        nftTransfers.push({
          senderAccountID: transfer.fieldValue.senderAccountID,
          receiverAccountID: transfer.fieldValue.receiverAccountID,
          serialNumber: Number(transfer.fieldValue.serialNumber),
          isApproval: transfer.fieldValue.isApprovalB,
        });
      });
      tokenTransferList.push({
        token: tokenTransferParamValue.fieldValue.token,
        transfers: [],
        nftTransfers,
      });
    }
  });
  return tokenTransferList;
};
// Filename: system-contract-dapp-playground/src/components/contract-interaction/hts/token-transfer-contract/method/transferMultipleTokens/helpers/generateInitialValues.ts
/*-
 *
 * Hedera Smart Contracts
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

import { generatedRandomUniqueKey } from '@/utils/common/helpers';

export interface FungibleParamValue {
  fieldKey: string;
  fieldValue: {
    receiverAddress: string;
    amount: string;
  };
}

export interface NonFungibleParamValue {
  fieldKey: string;
  fieldValue: {
    senderAddress: string;
    receiverAddress: string;
    serialNumber: string;
  };
}

export const generateInitialFungibleParamValue = (): FungibleParamValue => {
  return {
    fieldKey: generatedRandomUniqueKey(9),
    fieldValue: {
      receiverAddress: '',
      amount: '',
    },
  };
};

export const generateInitialNonFungibleParamValue = (): NonFungibleParamValue => {
  return {
    fieldKey: generatedRandomUniqueKey(9),
    fieldValue: {
      senderAddress: '',
      receiverAddress: '',
      serialNumber: '',
    },
  };
};
// Filename: system-contract-dapp-playground/src/fonts/index.ts
/*-
 *
 * Hedera Smart Contracts
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

import localFont from 'next/font/local';

/** @notice learn more about localFont at https://nextjs.org/docs/app/building-your-application/optimizing/fonts#local-fonts */
const StyreneAWebFont = localFont({
  src: [
    {
      path: './styreneA-webfont/StyreneA-Black-Web.woff2',
      weight: '900',
      style: 'normal',
    },
    {
      path: './styreneA-webfont/StyreneA-BlackItalic-Web.woff2',
      weight: '900',
      style: 'italic',
    },
    {
      path: './styreneA-webfont/StyreneA-Bold-Web.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: './styreneA-webfont/StyreneA-BoldItalic-Web.woff2',
      weight: '800',
      style: 'italic',
    },
    {
      path: './styreneA-webfont/StyreneA-Bold-Web.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: './styreneA-webfont/StyreneA-BoldItalic-Web.woff2',
      weight: '700',
      style: 'italic',
    },
    {
      path: './styreneA-webfont/StyreneA-Bold-Web.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './styreneA-webfont/StyreneA-BoldItalic-Web.woff2',
      weight: '600',
      style: 'italic',
    },
    {
      path: './styreneA-webfont/StyreneA-Medium-Web.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './styreneA-webfont/StyreneA-MediumItalic-Web.woff2',
      weight: '500',
      style: 'italic',
    },
    {
      path: './styreneA-webfont/StyreneA-Regular-Web.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './styreneA-webfont/StyreneA-RegularItalic-Web.woff2',
      weight: '400',
      style: 'italic',
    },
    {
      path: './styreneA-webfont/StyreneA-Light-Web.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: './styreneA-webfont/StyreneA-LightItalic-Web.woff2',
      weight: '300',
      style: 'italic',
    },
    {
      path: './styreneA-webfont/StyreneA-Light-Web.woff2',
      weight: '200',
      style: 'normal',
    },
    {
      path: './styreneA-webfont/StyreneA-LightItalic-Web.woff2',
      weight: '200',
      style: 'italic',
    },
    {
      path: './styreneA-webfont/StyreneA-Thin-Web.woff2',
      weight: '100',
      style: 'normal',
    },
    {
      path: './styreneA-webfont/StyreneA-ThinItalic-Web.woff2',
      weight: '100',
      style: 'italic',
    },
  ],
  display: 'swap',
  variable: '--font-styrene',
});

export default StyreneAWebFont;
// Filename: system-contract-dapp-playground/src/middleware.ts
/*-
 *
 * Hedera Smart Contracts
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

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isProtectedRoute } from './utils/common/helpers';

export async function middleware(request: NextRequest) {
  const isConnected = request.cookies.get('_isConnected')?.value;
  const { pathname } = request.nextUrl;

  if (isConnected && pathname === '/') {
    return NextResponse.redirect(new URL(`/hedera/overview`, request.url));
  }

  if (!isConnected && isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL(`/`, request.url));
  }
}

export const config = {
  matcher: ['/', '/hedera/:path*', '/activity'],
};
// Filename: system-contract-dapp-playground/src/types/common/index.d.ts
/*-
 *
 * Hedera Smart Contracts
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

import { BrowserProvider, Contract, ContractFactory } from 'ethers';

/**
 * @dev a type for network name
 */
type TNetworkName = 'mainnet' | 'testnet' | 'previewnet' | 'localnet';

/**
 * @dev a type for contract names
 */
type TContractName =
  | 'TokenCreateCustomContract'
  | 'TokenManagementContract'
  | 'ExchangeRateSystemContract'
  | 'TokenTransferContract'
  | 'TokenQueryContract'
  | 'PrngSystemContract'
  | 'IHRC719Contract'
  | 'ERC721Mock'
  | 'ERC20Mock';

/**
 * @dev an interface for the results related to wallet interaction
 *
 * @params walletProvider?: BrowserProvider;
 *
 * @params accounts?: string[]
 *
 * @params currentChainId?: string
 *
 * @params err: any
 */
interface IWalletResult {
  walletProvider?: BrowserProvider;
  accounts?: string[];
  currentChainId?: string;
  balance?: ethers.BigNumberish;
  err?: any;
}

/**
 * @dev an interface for the results related to ethers module
 *
 * @params baseContract?: ethers.Contract
 *
 * @params err: any
 */
interface IEthersResult {
  baseContract?: Contract;
  err?: any;
}

/**
 * @dev an interface for the results returned back from querying accoutnID to the Mirror Node
 *
 * @params accountId?: string
 *
 * @params err?: any
 */
interface IAccountIDMirrorNodeResult {
  accountId?: string;
  contractId?: string;
  err?: any;
}

/**
 * @dev an interface for the results returned back from querying estimated gasLimit to the Mirror Node
 *
 * @params gasLimit?: string
 *
 * @params err?: any
 */
interface IEstimateGasMirrorNodeResult {
  gasLimit?: number;
  err?: any;
}

/**
 * @dev an interface for the results returned back from interacting with Hedera smart contracts
 *
 * @params contractAddress?: string
 *
 * @params err: any
 */
interface IHederaSmartContractResult {
  contractAddress?: string;
  err?: any;
}

/**
 * @dev an interface for solidity contract ABI
 */
interface IContractABI {
  anonymous?: boolean;
  inputs?: any;
  name?: string;
  outputs?: any;
  stateMutability?: string;
  type?: string;
}

/**
 * @dev an interface for the Hedera contract assets
 *
 * @params name: string
 *
 * @params title: string
 *
 * @params contractABI: IContractABI[]
 *
 * @params contractBytecode: string
 *
 * @params githubUrl: string
 */
interface IHederaContractAsset {
  name: TContractName;
  title: string;
  githubUrl: string;
  contractBytecode: string;
  contractABI: IContractABI[];
  methods: string[];
}
// Filename: system-contract-dapp-playground/src/types/contract-interactions/HTS/index.d.ts
/*-
 *
 * Hedera Smart Contracts
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

/**
 * @dev a type for the IHederaTokenService.TokenKey.keyType
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L128
 */
type IHederaTokenServiceKeyType = 'ADMIN' | 'KYC' | 'FREEZE' | 'WIPE' | 'SUPPLY' | 'FEE' | 'PAUSE';

/**
 * @dev a type representing the correct bit value for IHederaTokenService.TokenKey.keyType
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L128
 */
type IHederaTokenServiceKeyTypeBitValue = 1 | 2 | 4 | 8 | 16 | 32 | 64;

/**
 * @dev a type for the key value type of the IHederaTokenService.KeyValue
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L92
 */
type IHederaTokenServiceKeyValueType =
  | 'inheritAccountKey'
  | 'contractId'
  | 'ed25519'
  | 'ECDSA_secp256k1'
  | 'delegatableContractId';

/**
 * @dev an interface for keyInput
 *
 * @param keyType: IHederaTokenServiceKeyType;
 *
 * @param keyValueType: IHederaTokenServiceKeyValueType;
 *
 * @param keyValue: string | boolean;
 *
 * @param err?: any
 */
interface ICommonKeyObject {
  keyType: IHederaTokenServiceKeyType;
  keyValueType: IHederaTokenServiceKeyValueType;
  keyValue: string | boolean;
  err?: any;
}

/**
 * @dev an interface that adheres to the `IHederaTokenService.KeyValue` type.
 *
 * @param inheritAccountKey: boolean
 *
 * @param contractId: string<address>
 *
 * @param ed25519: Buffer
 *
 * @param ECDSA_secp256k1: Buffer
 *
 * @param delegatableContractId: string<address>
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L92
 */
interface IHederaTokenServiceKeyValue {
  inheritAccountKey: boolean;
  contractId: string;
  ed25519: Buffer;
  ECDSA_secp256k1: Buffer;
  delegatableContractId: string;
}

/**
 * @dev an interface that adheres to the `IHederaTokenService.TokenKey`
 *
 * @param keyType: IHederaTokenServiceKeyTypeBitValue
 *
 * @param key: IHederaTokenServiceKeyValue
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L116
 */
interface IHederaTokenServiceTokenKey {
  keyType: IHederaTokenServiceKeyTypeBitValue;
  key: IHederaTokenServiceKeyValue;
}

/**
 * @dev an interface that adheres to the IHederaTokenService.Expiry
 *
 * @param second: number
 *
 * @param autoRenewAccount: string
 *
 * @param autoRenewPeriod: number
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L69
 */
interface IHederaTokenServiceExpiry {
  second: number;
  autoRenewAccount: string;
  autoRenewPeriod: number;
}

/**
 * @dev an interface that adheres to the IHederaTokenService.HederaToken
 *
 * @param name: string
 *
 * @param symbol: string
 *
 * @param treasury: string
 *
 * @param memo: string
 *
 * @param tokenSupplyType: boolean
 *
 * @param maxSupply: number
 *
 * @param freezeDefault: boolean
 *
 * @param tokenKeys: IHederaTokenServiceTokenKey[]
 *
 * @param expiry: IHederaTokenServiceExpiry
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L136
 */
interface IHederaTokenServiceHederaToken {
  name: string;
  symbol: string;
  treasury: string;
  memo: string;
  tokenSupplyType: boolean;
  maxSupply: number;
  freezeDefault: boolean;
  tokenKeys: IHederaTokenServiceTokenKey[];
  expiry: IHederaTokenServiceExpiry;
}

/**
 * @dev an interface that adheres to the IHederaTokenService.FixedFee
 *
 * @param amount: number;
 *
 * @param tokenId: string;
 *
 * @param useHbarsForPayment: boolean;
 *
 * @param  useCurrentTokenForPayment: boolean;
 *
 * @param feeCollector: string;
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L236
 */
interface IHederaTokenServiceFixedFee {
  amount: number;
  tokenId: string;
  useHbarsForPayment: boolean;
  useCurrentTokenForPayment: boolean;
  feeCollector: string;
}

/**
 * @dev an interface that adheres to the IHederaTokenService.FractionalFee
 *
 * @param numerator: number;
 *
 * @param denominator: number;
 *
 * @param minimumAmount: number;
 *
 * @param maximumAmount: number;
 *
 * @param netOfTransfers: boolean;
 *
 * @param feeCollector: string;
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L256
 */
interface IHederaTokenServiceFractionalFee {
  numerator: number;
  denominator: number;
  minimumAmount: number;
  maximumAmount: number;
  netOfTransfers: boolean;
  feeCollector: string;
}

/**
 * @dev an interface that adheres to the IHederaTokenService.RoyaltyFee
 *
 * @param numerator: number;
 *
 * @param denominator: number;
 *
 * @param amount?: number;
 *
 * @param tokenId?: string;
 *
 * @param useHbarsForPayment: boolean;
 *
 * @param feeCollector: string;
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L279
 */
interface IHederaTokenServiceRoyaltyFee {
  numerator: number;
  denominator: number;
  amount?: number;
  tokenId?: string;
  useHbarsForPayment: boolean;
  feeCollector: string;
}

/**
 * @dev an interface that adheres to the IHederaTokenService.TokenInfo
 *
 * @param token: IHederaTokenServiceHederaToken;
 *
 * @param totalSupply: number;
 *
 * @param deleted: boolean;
 *
 * @param defaultKycStatus: boolean;
 *
 * @param pauseStatus: boolean;
 *
 * @Param fixedFees: FixedFee[];
 *
 * @param fraztiofractionalFees: FractionalFee[];
 *
 * @param royaltyFees: RoyaltyFee[];
 *
 * @param ledgerId: string;
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L173
 */
interface IHederaTokenServiceTokenInfo {
  token: IHederaTokenServiceHederaToken;
  totalSupply: number;
  deleted: boolean;
  defaultKycStatus: boolean;
  pauseStatus: boolean;
  fixedFees: IHederaTokenServiceFixedFee[];
  fractionalFees: IHederaTokenServiceFractionalFee[];
  royaltyFees: IHederaTokenServiceRoyaltyFee[];
  ledgerId: string;
}

/**
 * @dev an interface that adheres to the IHederaTokenService.FungibleTokenInfo
 *
 * @param tokenInfo: IHederaTokenServiceTokenInfo;
 *
 * @param decimals: number;
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L203
 */
interface IHederaTokenServiceFungibleTokenInfo {
  tokenInfo: IHederaTokenServiceTokenInfo;
  decimals: number;
}

/**
 * @dev an interface that adheres to the IHederaTokenService.NonFungibleTokenInfo
 *
 * @param tokenInfo: IHederaTokenServiceTokenInfo;
 *
 * @param serialNumber: number;
 *
 * @param ownerId: string;
 *
 * @param creationTime: number;
 *
 * @param metadata: Uint8Array
 *
 * @param spenderId: string
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L212
 */
interface IHederaTokenServiceNonFungibleTokenInfo {
  tokenInfo: IHederaTokenServiceTokenInfo;
  serialNumber: number;
  ownerId: string;
  creationTime: number;
  metadata: Uint8Array;
  spenderId: string;
}

/**
 * @dev an interface that adheres to the IHederaTokenService.AccountAmount
 *
 * @param accountID: string
 *
 * @param amount: number
 *
 * @param isApproval: boolean
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L17
 */
interface IHederaTokenServiceAccountAmount {
  accountID: string;
  amount: number;
  isApproval?: boolean;
}

/**
 * @dev an interface  that adheres to the IHederaTokenService.NftTransfer
 *
 * @param senderAcocuntID: string
 *
 * @param receiverAccountID: string
 *
 * @param serialNumber: number
 *
 * @param isApproval: boolean
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L34
 */
interface IHederaTokenServiceNftTransfer {
  senderAccountID: string;
  receiverAccountID: string;
  serialNumber: number;
  isApproval: boolean;
}

/**
 * @dev an interface  that adheres to the IHederaTokenService.TransferList
 *
 * @param transfers: IHederaTokenServiceAccountAmount[]
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L62
 */
interface IHederaTokenServiceTransferList {
  transfers: IHederaTokenServiceAccountAmount[];
}

/**
 * @dev an interface  that adheres to the IHederaTokenService.TokenTransferList
 *
 * @param token: string
 *
 * @param transfers: IHederaTokenServiceAccountAmount[]
 *
 * @param nftTransfers: IHederaTokenServiceNftTransfer[]
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L49
 */
interface IHederaTokenServiceTokenTransferList {
  token: string;
  transfers: IHederaTokenServiceAccountAmount[];
  nftTransfers: IHederaTokenServiceNftTransfer[];
}
// Filename: system-contract-dapp-playground/src/types/contract-interactions/erc/index.d.ts
/*-
 *
 * Hedera Smart Contracts
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

/**
 * @dev an interface for the results returned back from interacting with ERC20Mock & ERC721Mock smart contract
 */
interface IERCSmartContractResult {
  name?: string;
  symbol?: string;
  txHash?: string;
  decimals?: string;
  tokenURI?: string;
  mintRes?: boolean;
  ownerOfRes?: string;
  totalSupply?: string;
  balanceOfRes?: string;
  approveRes?: boolean;
  allowanceRes?: string;
  transferRes?: boolean;
  transferFromRes?: boolean;
  approvalStatusRes?: boolean;
  approvedAccountRes?: string;
  increaseAllowanceRes?: boolean;
  decreaseAllowanceRes?: boolean;
  err?: any;
}
// Filename: system-contract-dapp-playground/src/types/contract-interactions/shared/index.d.ts
/*-
 *
 * Hedera Smart Contracts
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

/** @dev an interface for transaction results when interacting with smart contracts. */
export interface ITransactionResult {
  status: 'success' | 'fail';
  txHash: string;
  APICalled?: any;
  tokenInfo?: any;
  tokenID?: string;
  isToken?: boolean;
  readonly?: boolean;
  selected?: boolean;
  keyTypeCalled?: any;
  recordIndex?: number;
  tokenAddress?: string;
  mintedAmount?: string;
  initialAmount?: string;
  accountAddress?: string;
  transferAmount?: string;
  transactionType: string;
  convertedAmount?: string;
  receiverAddress?: string;
  pseudoRandomSeed?: string;
  tokenAddresses?: string[];
  transactionTimeStamp: number;
  sessionedContractAddress: string;
  transactionResultStorageKey: string;
  ercTokenInfo?: {
    name?: string;
    symbol?: string;
    decimals?: string;
    totalSupply?: string;
  };
  balanceOf?: {
    owner: string;
    balance: number;
  };
  allowances?: {
    owner: string;
    spender: string;
    amount: number;
  };
  tokenURI?: {
    tokenID: string;
    tokenURI: string;
  };
  ownerOf?: {
    tokenID: string;
    owner: string;
  };
  approves?: {
    tokenID: string;
    spender: string;
  };
  approval?: {
    owner: string;
    status: boolean;
    operator: string;
  };
}

/** @dev an interface for the results returned back from interacting with Hedera System Smart Contracts */
interface ISmartContractExecutionResult {
  Frozen?: any;
  IsToken?: any;
  Approved?: any;
  TokenType?: any;
  KycGranted?: any;
  result?: boolean;
  AllowanceValue?: any;
  ApprovedAddress?: any;
  tokenAddress?: string;
  convertedAmount?: number;
  transactionHash?: string;
  pseudoRandomSeed?: string;
  TokenDefaultKycStatus?: any;
  TokenDefaultFreezeStatus?: any;
  TokenInfo?: IHederaTokenServiceTokenInfo;
  TokenKey?: IHederaTokenServiceKeyValueType;
  TokenExpiryInfo?: IHederaTokenServiceExpiry;
  FungibleTokenInfo?: IHederaTokenServiceFungibleTokenInfo;
  NonFungibleTokenInfo?: IHederaTokenServiceNonFungibleTokenInfo;
  TokenCustomFees?: {
    fixedFees: IHederaTokenServiceFixedFee[];
    royaltyFees: IHederaTokenServiceRoyaltyFee[];
    fractionalFees: IHederaTokenServiceFractionalFee[];
  };
  err?: any;
}
// Filename: system-contract-dapp-playground/src/utils/common/constants.ts
/*-
 *
 * Hedera Smart Contracts
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

import { TContractName } from '@/types/common';
import ERC20Mock from '@hashgraph-smartcontract/artifacts/contracts/openzeppelin/ERC-20/ERC20Mock.sol/OZERC20Mock.json';
import ERC721Mock from '@hashgraph-smartcontract/artifacts/contracts/openzeppelin/ERC-721/ERC721Mock.sol/OZERC721Mock.json';
import IHRC719Contract from '@hashgraph-smartcontract/artifacts/contracts/system-contracts/hedera-token-service/IHRC719.sol/IHRC719.json';
import ExchangeRateSystemContract from '@hashgraph-smartcontract/artifacts/contracts/system-contracts/exchange-rate/ExchangeRateMock.sol/ExchangeRateMock.json';
import PrngSystemContract from '@hashgraph-smartcontract/artifacts/contracts/system-contracts/pseudo-random-number-generator/PrngSystemContract.sol/PrngSystemContract.json';
import TokenQueryContract from '@hashgraph-smartcontract/artifacts/contracts/system-contracts/hedera-token-service/examples/token-query/TokenQueryContract.sol/TokenQueryContract.json';
import TokenTransferContract from '@hashgraph-smartcontract/artifacts/contracts/system-contracts/hedera-token-service/examples/token-transfer/TokenTransferContract.sol/TokenTransferContract.json';
import TokenCreateCustomContract from '@hashgraph-smartcontract/artifacts/contracts/system-contracts/hedera-token-service/examples/token-create/TokenCreateCustom.sol/TokenCreateCustomContract.json';
import TokenManagementContract from '@hashgraph-smartcontract/artifacts/contracts/system-contracts/hedera-token-service/examples/token-manage/TokenManagementContract.sol/TokenManagementContract.json';

/** @notice Hedera Smart Contract official github url */
export const HEDERA_SMART_CONTRACT_OFFICIAL_GITHUB_URL =
  'https://github.com/hashgraph/hedera-smart-contracts';

/** @notice Hedera Improvement Proposals official url */
export const HEDERA_OFFICIAL_HIPS_URL = 'https://hips.hedera.com/';

/** @notice hashcan baseURL */
export const HASHSCAN_BASE_URL = 'https://hashscan.io';

/** @notice Hedera network */
export const OFFCIAL_NETWORK_NAME = 'HEDERA';

/** @notice information about Hedera social media */
export const HEDERA_SOCIAL_MEDIA = [
  {
    name: 'discord',
    link: 'https://discord.com/invite/hedera',
  },
  {
    name: 'facebook',
    link: 'https://www.facebook.com/hashgraph',
  },
  {
    name: 'linkedin',
    link: 'https://www.linkedin.com/company/hashgraph/',
  },
  {
    name: 'reddit',
    link: 'https://www.reddit.com/r/Hedera/',
  },
  {
    name: 'telegram',
    link: 'https://t.me/hederahashgraph',
  },
  {
    name: 'twitter',
    link: 'https://twitter.com/hedera',
  },
  {
    name: 'youtube',
    link: 'https://www.youtube.com/hederahashgraph',
  },
];

/**
 * @notice information about Hedera Networks
 */
export const HEDERA_NETWORKS = {
  mainnet: {
    chainId: '295',
    chainIdHex: '0x127',
    chainName: 'Hedera Mainnet',
    rpcUrls: 'https://mainnet.hashio.io/api',
    nativeCurrency: {
      name: 'Hedera',
      symbol: 'HBAR',
      decimals: 18,
    },
    blockExplorerUrls: 'https://hashscan.io/mainnet/dashboard',
    mirrorNodeUrl: 'https://mainnet.mirrornode.hedera.com/api/v1',
  },
  testnet: {
    chainId: '296',
    chainIdHex: '0x128',
    chainName: 'Hedera Testnet',
    rpcUrls: 'https://testnet.hashio.io/api',
    nativeCurrency: {
      name: 'Hedera',
      symbol: 'HBAR',
      decimals: 18,
    },
    blockExplorerUrls: 'https://hashscan.io/testnet/dashboard',
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com/api/v1',
  },
  previewnet: {
    chainId: '297',
    chainIdHex: '0x129',
    chainName: 'Hedera Previewnet',
    rpcUrls: 'https://previewnet.hashio.io/api',
    nativeCurrency: {
      name: 'Hedera',
      symbol: 'HBAR',
      decimals: 18,
    },
    blockExplorerUrls: 'https://hashscan.io/previewnet/dashboard',
    mirrorNodeUrl: 'https://previewnet.mirrornode.hedera.com/api/v1',
  },
  localnet: {
    chainId: '298',
    chainIdHex: '0x12a',
    chainName: 'Hedera Localnet',
    rpcUrls: 'http://localhost:7546',
    nativeCurrency: {
      name: 'Hedera',
      symbol: 'HBAR',
      decimals: 18,
    },
    blockExplorerUrls: 'http://localhost:8080',
    mirrorNodeUrl: 'http://127.0.0.1:5600/api/v1',
  },
};

/**
 * @notice information about protected routes
 */
export const PROTECTED_ROUTES = [
  '/hedera/overview',
  '/hedera/hts-hip-206',
  '/hedera/hrc-719',
  '/hedera/exchange-rate-hip-475',
  '/hedera/prng-hip-351',
  '/hedera/erc-20',
  '/hedera/erc-721',
  '/activity',
];

/**
 * @notice information for NavSideBar items
 */
export const NAV_SIDE_BAR_ITEMS = [
  {
    name: 'Overview',
    path: PROTECTED_ROUTES[0],
  },
  {
    name: 'HTS system contract wrapper (HIP-206)',
    path: PROTECTED_ROUTES[1],
  },
  {
    name: 'Token associate (HIP-719 / HRC-719)',
    path: PROTECTED_ROUTES[2],
  },
  {
    name: 'Exchange rate system conract wrapper (HIP-475)',
    path: PROTECTED_ROUTES[3],
  },
  {
    name: 'Pseudo random number system contract wrapper (HIP-351)',
    path: PROTECTED_ROUTES[4],
  },
  {
    name: 'Fungible token (ERC-20)',
    path: PROTECTED_ROUTES[5],
  },
  {
    name: 'Non-fungible token (ERC-721)',
    path: PROTECTED_ROUTES[6],
  },
];

/**
 * @notice an object storing contract names
 */
export const CONTRACT_NAMES: Record<string, TContractName> = {
  ERC20: 'ERC20Mock',
  ERC721: 'ERC721Mock',
  PRNG: 'PrngSystemContract',
  IHRC719: 'IHRC719Contract',
  TOKEN_QUERY: 'TokenQueryContract',
  TOKEN_TRANSFER: 'TokenTransferContract',
  EXCHANGE_RATE: 'ExchangeRateSystemContract',
  TOKEN_MANAGE: 'TokenManagementContract',
  TOKEN_CREATE: 'TokenCreateCustomContract',
};

/**
 * @notice information about Hedera Smart Contract assets
 */
export const HEDERA_SMART_CONTRACTS_ASSETS = {
  HTS_PRECOMPILED: [
    {
      name: 'TokenCreateCustomContract' as TContractName,
      title: 'Token Create Contract',
      contractABI: TokenCreateCustomContract.abi,
      contractBytecode: TokenCreateCustomContract.bytecode,
      githubUrl: `${HEDERA_SMART_CONTRACT_OFFICIAL_GITHUB_URL}/blob/main/contracts/system-contracts/hedera-token-service/examples/token-create/TokenCreateCustom.sol`,
      methods: ['fungibleTokenCreate', 'non-fungibleTokenCreate', 'mint', 'tokenAssociation', 'grantKYC'],
    },
    {
      name: 'TokenManagementContract' as TContractName,
      title: 'Token Management Contract',
      contractABI: TokenManagementContract.abi,
      contractBytecode: TokenManagementContract.bytecode,
      githubUrl: `${HEDERA_SMART_CONTRACT_OFFICIAL_GITHUB_URL}/blob/main/contracts/system-contracts/hedera-token-service/examples/token-manage/TokenManagementContract.sol`,
      methods: [
        'tokenInformation',
        'tokenPermission',
        'tokenStatus',
        'tokenRelation',
        'tokenSupplyReduction',
        'tokenDelete',
      ],
    },
    {
      name: 'TokenQueryContract' as TContractName,
      title: 'Token Query Contract',
      contractABI: TokenQueryContract.abi,
      contractBytecode: TokenQueryContract.bytecode,
      githubUrl: `${HEDERA_SMART_CONTRACT_OFFICIAL_GITHUB_URL}/blob/main/contracts/system-contracts/hedera-token-service/examples/token-query/TokenQueryContract.sol`,
      methods: ['tokenValidity', 'generalInfo', 'specificInfo', 'tokenPermission', 'tokenStatus'],
    },
    {
      name: 'TokenTransferContract' as TContractName,
      title: 'Token Transfer Contract',
      contractABI: TokenTransferContract.abi,
      contractBytecode: TokenTransferContract.bytecode,
      githubUrl: `${HEDERA_SMART_CONTRACT_OFFICIAL_GITHUB_URL}/blob/main/contracts/system-contracts/hedera-token-service/examples/token-transfer/TokenTransferContract.sol`,
      methods: ['crypto', 'transferToken', 'transferTokens'],
    },
  ],
  TOKEN_ASSOCIATION: {
    name: 'IHRC719Contract' as TContractName,
    title: 'Token Associate Example Contract',
    contractABI: IHRC719Contract.abi,
    contractBytecode: IHRC719Contract.bytecode,
    githubUrl: `${HEDERA_SMART_CONTRACT_OFFICIAL_GITHUB_URL}/blob/main/contracts/system-contracts/hedera-token-service/IHRC.sol`,
    methods: ['IHRC / HIP-719'],
  },
  EXCHANGE_RATE: {
    name: 'ExchangeRateSystemContract' as TContractName,
    title: 'Exchange Rate Example Contract',
    contractABI: ExchangeRateSystemContract.abi,
    contractBytecode: ExchangeRateSystemContract.bytecode,
    githubUrl: `${HEDERA_SMART_CONTRACT_OFFICIAL_GITHUB_URL}/blob/main/contracts/exchange-rate-precompile/ExchangeRateMock.sol`,
    methods: ['Exchange Rate'],
  },
  PRNG_PRECOMPILED: {
    name: 'PrngSystemContract' as TContractName,
    title: 'Pseudo Random Number Example Contract',
    contractABI: PrngSystemContract.abi,
    contractBytecode: PrngSystemContract.bytecode,
    githubUrl: `${HEDERA_SMART_CONTRACT_OFFICIAL_GITHUB_URL}/blob/main/contracts/util-precompile/PrngSystemContract.sol`,
    methods: ['getPseudoRandomSeed'],
  },
  ERC_20: {
    name: 'ERC20Mock' as TContractName,
    title: 'ERC-20 Example Contract',
    contractABI: ERC20Mock.abi,
    contractBytecode: ERC20Mock.bytecode,
    githubUrl: `${HEDERA_SMART_CONTRACT_OFFICIAL_GITHUB_URL}/blob/main/contracts/erc-20/ERC20Mock.sol`,
    methods: ['tokenInformation', 'mint', 'balanceOf', 'tokenPermissions', 'transfer'],
  },
  ERC_721: {
    name: 'ERC721Mock' as TContractName,
    title: 'ERC-721 Example Contract',
    contractABI: ERC721Mock.abi,
    contractBytecode: ERC721Mock.bytecode,
    githubUrl: `${HEDERA_SMART_CONTRACT_OFFICIAL_GITHUB_URL}/blob/main/contracts/erc-721/ERC721Mock.sol`,
    methods: [
      'tokenInformation',
      'mint',
      'tokenURI',
      'balance',
      'owner',
      'approve',
      'operatorApproval',
      'transferFrom',
    ],
  },
};

/** @notice Hedera branding colors */
export const HEDERA_BRANDING_COLORS = {
  violet: '#82ACF9',
  purple: '#A98DF4',
  panel: '#374151',
};

/** @notice Input box sizes */
export const HEDERA_CHAKRA_INPUT_BOX_SIZES = {
  'extra-small': 'xs',
  small: 'sm',
  medium: 'md',
  large: 'lg',
};

/** @notice Table Variants */
export const HEDERA_CHAKRA_TABLE_VARIANTS = {
  simple: 'simple',
  striped: 'striped',
  unstyled: 'unstyled',
};

/** @notice Input box shared class name */
export const HEDERA_CHAKRA_INPUT_BOX_SHARED_CLASSNAME = 'w-full border-white/30';

/**
 * @notice a shared object for parameters input fields
 */
export const HEDERA_SHARED_PARAM_INPUT_FIELDS = {
  paramKey: '',
  inputType: '',
  explanation: '',
  inputPlaceholder: '',
  inputSize: HEDERA_CHAKRA_INPUT_BOX_SIZES.medium,
  inputFocusBorderColor: HEDERA_BRANDING_COLORS.purple,
  inputClassname: HEDERA_CHAKRA_INPUT_BOX_SHARED_CLASSNAME,
};

/**
 * @notice a shared object maping contract name to storage key value
 */
export const CONTRACT_NAME_TO_STORAGE_KEY_VALUE: Record<TContractName, string> = {
  ERC20Mock: 'ERC-20',
  ERC721Mock: 'ERC-721',
  IHRC719Contract: 'IHRC719',
  PrngSystemContract: 'PRNG',
  TokenQueryContract: 'TOKEN-QUERY',
  TokenTransferContract: 'TOKEN-TRANSFER',
  ExchangeRateSystemContract: 'EXCHANGE-RATE',
  TokenManagementContract: 'TOKEN-MANAGE',
  TokenCreateCustomContract: 'TOKEN-CREATE',
};

/**
 * @notice a shared object stores all transaction result storage keys
 */
const prepareTransactionResultStorageKey = (
  contractKey: string,
  methodKey: string,
  resultKey: string,
  readonly?: boolean
) => {
  return `HEDERA.${contractKey}.${methodKey}.${resultKey}-RESULTS${readonly ? `.READONLY` : ``}`;
};
export const HEDERA_TRANSACTION_RESULT_STORAGE_KEYS = {
  'CONTRACT-CREATE': 'HEDERA.CONTRACT-CREATE-RESULTS',
  'TOKEN-CREATE': {
    'TOKEN-KYC': prepareTransactionResultStorageKey('HTS', 'TOKEN-CREATE', 'TOKEN-KYC'),
    'MINT-TOKEN': prepareTransactionResultStorageKey('HTS', 'TOKEN-CREATE', 'MINT-TOKEN'),
    'FUNGIBLE-TOKEN': prepareTransactionResultStorageKey('HTS', 'TOKEN-CREATE', 'FUNGIBLE-TOKEN'),
    'ASSOCIATE-TOKEN': prepareTransactionResultStorageKey('HTS', 'TOKEN-CREATE', 'ASSOCIATE-TOKEN'),
    'NON-FUNGIBLE-TOKEN': prepareTransactionResultStorageKey('HTS', 'TOKEN-CREATE', 'NON-FUNGIBLE-TOKEN'),
  },
  'TOKEN-MANAGE': {
    'TOKEN-INFO': prepareTransactionResultStorageKey('HTS', 'TOKEN-MANAGE', 'TOKEN-INFO'),
    'TOKEN-STATUS': prepareTransactionResultStorageKey('HTS', 'TOKEN-MANAGE', 'TOKEN-STATUS'),
    'TOKEN-DELETE': prepareTransactionResultStorageKey('HTS', 'TOKEN-MANAGE', 'TOKEN-DELETE'),
    'TOKEN-RELATION': prepareTransactionResultStorageKey('HTS', 'TOKEN-MANAGE', 'TOKEN-RELATION'),
    'TOKEN-REDUCTION': prepareTransactionResultStorageKey('HTS', 'TOKEN-MANAGE', 'TOKEN-REDUCTION'),
    'TOKEN-PERMISSION': prepareTransactionResultStorageKey('HTS', 'TOKEN-MANAGE', 'TOKEN-PERMISSION'),
  },
  'TOKEN-QUERY': {
    'TOKEN-VALIDITY': prepareTransactionResultStorageKey('HTS', 'TOKEN-QUERY', 'TOKEN-VALIDITY'),
    'TOKEN-PERMISSION': prepareTransactionResultStorageKey('HTS', 'TOKEN-QUERY', 'TOKEN-PERMISSION'),
    'TOKEN-STATUS-INFO': prepareTransactionResultStorageKey('HTS', 'TOKEN-QUERY', 'TOKEN-STATUS-INFO'),
    'TOKEN-GENERAL-INFO': prepareTransactionResultStorageKey('HTS', 'TOKEN-QUERY', 'TOKEN-GENERAL-INFO'),
    'TOKEN-SPECIFIC-INFO': prepareTransactionResultStorageKey('HTS', 'TOKEN-QUERY', 'TOKEN-SPECIFIC-INFO'),
  },
  'TOKEN-TRANSFER': {
    'SINGLE-TOKEN': prepareTransactionResultStorageKey('HTS', 'TOKEN-TRANSFER', 'SINGLE-TOKEN'),
    'CRYPTO-TRANSFER': prepareTransactionResultStorageKey('HTS', 'TOKEN-TRANSFER', 'CRYPTO-TRANSFER'),
    'MULTIPLE-TOKENS': prepareTransactionResultStorageKey('HTS', 'TOKEN-TRANSFER', 'MULTIPLE-TOKENS'),
  },
  'IHRC719-RESULTS': `HEDERA.IHRC719.IHRC719-RESULTS`,
  'ERC20-RESULT': {
    'TOKEN-INFO': prepareTransactionResultStorageKey('EIP', 'ERC-20', 'TOKEN-INFO'),
    'TOKEN-MINT': prepareTransactionResultStorageKey('EIP', 'ERC-20', 'TOKEN-MINT'),
    'BALANCE-OF': prepareTransactionResultStorageKey('EIP', 'ERC-20', 'BALANCE-OF', true),
    'TOKEN-TRANSFER': prepareTransactionResultStorageKey('EIP', 'ERC-20', 'TOKEN-TRANSFER'),
    'TOKEN-PERMISSION': prepareTransactionResultStorageKey('EIP', 'ERC-20', 'TOKEN-PERMISSION'),
    'ALLOWANCES-RESULT': prepareTransactionResultStorageKey('EIP', 'ERC-20', 'ALLOWANCES', true),
  },
  'ERC721-RESULT': {
    'TOKEN-INFO': prepareTransactionResultStorageKey('EIP', 'ERC-721', 'TOKEN-INFO', true),
    'TOKEN-MINT': prepareTransactionResultStorageKey('EIP', 'ERC-721', 'TOKEN-MINT'),
    'OWNER-OF': prepareTransactionResultStorageKey('EIP', 'ERC-721', 'OWNER-OF', true),
    'SET-APPROVAL': prepareTransactionResultStorageKey('EIP', 'ERC-721', 'SET-APPROVAL'),
    'TOKEN-URI': prepareTransactionResultStorageKey('EIP', 'ERC-721', 'TOKEN-URI', true),
    'BALANCE-OF': prepareTransactionResultStorageKey('EIP', 'ERC-721', 'BALANCE-OF', true),
    'TOKEN-TRANSFER': prepareTransactionResultStorageKey('EIP', 'ERC-721', 'TOKEN-TRANSFER'),
    'TOKEN-PERMISSION': prepareTransactionResultStorageKey('EIP', 'ERC-721', 'TOKEN-PERMISSION'),
    'APPROVAL-STATUS': prepareTransactionResultStorageKey('EIP', 'ERC-721', 'APPROVAL-STATUS', true),
  },
  'PRNG-RESULT': {
    'PSEUDO-RANDOM': prepareTransactionResultStorageKey('PRNG', 'PRNG', 'PSEUDO-RANDOM'),
  },
  'EXCHANGE-RATE-RESULT': {
    'EXCHANGE-RATE': prepareTransactionResultStorageKey('EXCHANGE', 'EXCHANGE', 'EXCHANGE-RATE'),
  },
};

/**
 * @notice stores common revert reasons from wallet
 */
export const HEDERA_COMMON_WALLET_REVERT_REASONS = {
  REJECT: {
    // @notice 4001 error code is returned when a metamask wallet request is rejected by the user
    // @notice See https://docs.metamask.io/wallet/reference/provider-api/#errors for more information on the error returned by Metamask.
    code: '4001',
    description: 'You have rejected the request.',
  },
  NETWORK_SWITCH: {
    // @notice -32002 error code is returned when a metamask wallet request is already in progress
    // @notice See https://docs.metamask.io/wallet/reference/provider-api/#errors for more information on the error returned by Metamask.
    code: '-32002',
    description: 'A network switch request already in progress.',
  },
  NONCE: {
    message: 'nonce has already been used',
    description: 'Nonce has already been used. Please try again!',
  },
  ALLOWANCE_BELOW_ZERO: {
    message: 'decreased allowance below zero',
    description: 'The transaction was reverted due to the allowance decrease falling below zero.',
  },
  TRANSFER_EXCEEDS_BALANCE: {
    message: 'transfer amount exceeds balance',
    description: 'Transfer amount exceeds balance.',
  },
  INSUFFICIENT_ALLOWANCE: {
    message: 'insufficient allowance',
    description: 'Insufficient allowance.',
  },
  UNAUTHORIZED_CALLER: {
    message: 'approve caller is not token owner or approved for all',
    description: 'Unauthorized caller. Caller is not token owner.',
  },
  APPROVAL_CURRENT_CALLER: {
    message: 'approval to current owner',
    description: 'Caller is the token owner.',
  },
  INVALID_TOKENID: {
    message: 'invalid token ID',
    description: 'Invalid token ID',
  },
  DEFAULT: {
    description: "See client's console for more information",
  },
};

/**
 * @notice stores common transaction type constants
 */
export const HEDERA_COMMON_TRANSACTION_TYPE = {
  ERC20_MINT: 'ERC20-MINT',
  ERC721_MINT: 'ERC721-MINT',
  HIP351_PRNG: 'HIP-351-PRNG',
  HTS_WIPE_NFT: 'HTS-WIPE-NFT',
  HTS_NFT_MINT: 'HTS-NFT-MINT',
  ERC20_APPROVE: 'ERC20-APPROVE',
  HTS_GRANT_KYC: 'HTS-GRANT-KYC',
  HTS_NFT_CREATE: 'HTS-NFT-CREATE',
  HTS_TOKEN_MINT: 'HTS-TOKEN-MINT',
  HTS_WIPE_TOKEN: 'HTS-WIPE-TOKEN',
  HTS_TOKEN_BURN: 'HTS-TOKEN-BURN',
  ERC20_TRANSFER: 'ERC20-TRANSFER',
  ERC721_APPROVE: 'ERC721-APPROVE',
  HIP475_BAR_TO_CENT: 'BAR-TO-CENT',
  HIP475_CENT_TO_BAR: 'CENT-TO-BAR',
  HTS_TOKEN_PAUSE: 'HTS-TOKEN-PAUSE',
  ERC721_OWNER_OF: 'ERC721-OWNER-OF',
  HTS_TOKEN_CREATE: 'HTS-TOKEN-CREATE',
  HTS_TOKEN_DELETE: 'HTS-TOKEN-DELETE',
  HTS_FREEZE_TOKEN: 'HTS-FREEZE-TOKEN',
  HTS_QUERY_IS_KYC: 'HTS-QUERY-IS-KYC',
  ERC20_ALLOWANCES: 'ERC20-ALLOWANCES',
  ERC721_TOKEN_URI: 'ERC721-TOKEN-URI',
  ERC20_TOKEN_INFO: 'ERC20-TOKEN-INFO',
  HTS_SET_APPROVAL: 'HTS-SET-APPROVAL',
  HTS_APPROVED_NFT: 'HTS-APPROVED-NFT',
  ERC20_BALANCE_OF: 'ERC20-BALANCE-OF',
  IHRC719_ASSOCIATE: 'IHRC719-ASSOCIATE',
  HTS_TOKEN_UNPAUSE: 'HTS-TOKEN-UNPAUSE',
  ERC721_TOKEN_INFO: 'ERC721-TOKEN-INFO',
  ERC721_BALANCE_OF: 'ERC721-BALANCE-OF',
  HTS_UNFREEZE_TOKEN: 'HTS-UNFREEZE-TOKEN',
  HTS_QUERY_NFT_INFO: 'HTS-QUERY-NFT-INFO',
  ERC721_IS_APPROVAL: 'ERC721-IS-APPROVAL',
  HTS_TOKEN_TRANSFER: 'HTS-TOKEN-TRANSFER',
  HTS_APPROVED_TOKEN: 'HTS-APPROVED-TOKEN',
  IHRC719_DISSOCIATE: 'IHRC719-DISSOCIATE',
  ERC721_GET_APPROVE: 'ERC721-GET-APPROVE',
  HTS_QUERY_IS_TOKEN: 'HTS-QUERY-IS-TOKEN',
  HTS_QUERY_ALLOWANCE: 'HTS-QUERY-ALLOWANCE',
  HTS_QUERY_IS_FROZEN: 'HTS-QUERY-IS-FROZEN',
  HTS_CRYPTO_TRANSFER: 'HTS-CRYPTO-TRANSFER',
  HTS_TOKENS_TRANSFER: 'HTS-TOKENS-TRANSFER',
  ERC721_SET_APPROVAL: 'ERC721-SET-APPROVAL',
  HTS_REVOKE_KYC: 'HTS-APPROVED-REVOKE-KYC',
  HTS_TOKEN_ASSOCIATE: 'HTS-TOKEN-ASSOCIATE',
  ERC20_TRANSFER_FROM: 'ERC20-TRANSFER-FROM',
  HTS_UPDATE_INFO: 'HTS-APPROVED-UPDATE-INFO',
  HTS_UPDATE_KEYS: 'HTS-APPROVED-UPDATE-KEYS',
  HTS_QUERY_TOKEN_TYPE: 'HTS-QUERY-TOKEN-TYPE',
  HTS_QUERY_TOKEN_KEYS: 'HTS-QUERY-TOKEN-KEYS',
  ERC721_TRANSFER_FROM: 'ERC721-TRANSFER-FROM',
  HTS_QUERY_TOKEN_INFO: 'HTS-QUERY-TOKEN-INFO',
  HTS_QUERY_IS_APPROVAL: 'HTS-QUERY-IS-APPROVAL',
  HTS_QUERY_CUSTOM_FEES: 'HTS-QUERY-CUSTOM-FEES',
  HTS_UPDATE_EXPIRY: 'HTS-APPROVED-UPDATE-EXPIRY',
  HTS_QUERY_TOKEN_EXPIRY: 'HTS-QUERY-TOKEN-EXPIRY',
  HTS_QUERY_GET_APPROVED: 'HTS-QUERY-GET-APPROVED',
  HTS_QUERY_FUNGIBLE_INFO: 'HTS-QUERY-FUNGIBLE-INFO',
  ERC20_INCREASE_ALLOWANCE: 'ERC20-INCREASE-ALLOWANCE',
  ERC20_DECREASE_ALLOWANCE: 'ERC20-DECREASE-ALLOWANCE',
  HTS_DISSOCIATE_TOKEN: 'HTS-UNFREEZE-DISSOCIATE-TOKEN',
  ERC721_SAFE_TRANSFER_FROM: 'ERC721-SAFE-TRANSFER-FROM',
  HTS_QUERY_DEFAULT_KYC_STATUS: 'HTS-QUERY-DEFAULT-KYC-STATUS',
  HTS_QUERY_DEFAULT_FREEZE_STATUS: 'HTS-QUERY-DEFAULT-FREEZE-STATUS',
};
// Filename: system-contract-dapp-playground/src/utils/common/helpers.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Contract, ethers } from 'ethers';
import { TNetworkName } from '@/types/common';
import { getCurrentChainId } from '@/api/wallet';
import { HEDERA_NETWORKS, PROTECTED_ROUTES } from './constants';
import { ITransactionResult } from '@/types/contract-interactions/shared';
import { estimateGasViaMirrorNode } from '@/api/mirror-node';

/**
 * @dev validating if a route is protected
 * @param pathname string
 * @returns boolean
 */
export const isProtectedRoute = (pathname: string) => {
  return PROTECTED_ROUTES.includes(pathname);
};

/**
 * @dev Handles checking if the connected network is the expected network (i.e. HEDERA_TESTNET, HEDERA_PREVIEWNET, HEDERA_LOCALNET, HEDERA_MAINNET)
 *
 * @params walletProvider: ethers.BrowserProvider
 *
 * @returns bool
 */
export const isCorrectHederaNetwork = async (walletProvider: ethers.BrowserProvider) => {
  // get current chainId
  const currentChainId = (await getCurrentChainId(walletProvider)).currentChainId as string;

  return (
    currentChainId === HEDERA_NETWORKS.mainnet.chainIdHex ||
    currentChainId === HEDERA_NETWORKS.testnet.chainIdHex ||
    currentChainId === HEDERA_NETWORKS.previewnet.chainIdHex ||
    currentChainId === HEDERA_NETWORKS.localnet.chainIdHex
  );
};

/**
 * @dev convert chainId to network name
 *
 * @params chainId string
 *
 * @returns string
 */
export const chainIdToNetwork = (chainId: string): TNetworkName => {
  switch (chainId) {
    case '0x127':
      return 'mainnet';
    case '0x128':
      return 'testnet';
    case '0x129':
      return 'previewnet';
    case '0x12a':
    default:
      return 'localnet';
  }
};

/**
 * @dev convert ABI function name from camelCase to normal
 *
 * @params functionName: string
 *
 * @returns string
 */
export const convertCalmelCaseFunctionName = (functionName: string) => {
  // Split the string into words based on camel case
  const fnNames = functionName.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');

  // Capitalize the first letter of each function name
  const titleCaseNames = fnNames.map((fnName) => fnName.charAt(0).toUpperCase() + fnName.slice(1));

  // Join the names back together with a space
  const titleCaseFunctionName = titleCaseNames.join(' ');

  return titleCaseFunctionName;
};

/**
 * @dev create a random unique key string
 *
 * @param byteLength: number
 *
 * @return string
 */
export const generatedRandomUniqueKey = (byteLength: number) => {
  const randomBytes = ethers.randomBytes(9);
  const randomKey = ethers.hexlify(randomBytes);
  return randomKey;
};

/**
 * @dev prepare a list of transaction in order from newest to oldest based on the timestamp when each transaction occurs
 *
 * @returns allTransactions: ITransactionResult[]
 */
export const prepareTransactionList = () => {
  // prepare
  const transactions: ITransactionResult[] = [];

  // loop through localStorage items
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      // get key
      const key = localStorage.key(i);

      // only include item with KEY includes 'HEDERA' and NOT include 'READONLY'
      if (key?.includes('HEDERA')) {
        const records = JSON.parse(localStorage.getItem(key) || '');
        records.forEach((record: any) => {
          transactions.push({ ...record });
        });
      }
    }
  }

  // sort transactions from oldest to newest to assign recordIndex
  const sortedTransactions = transactions
    .sort((txA, txB) => txA.transactionTimeStamp - txB.transactionTimeStamp)
    .map((record, index) => ({ ...record, recordIndex: index + 1 }));

  return sortedTransactions;
};

/**
 * @dev prepare headers object for CSV exporting feature
 */
export const prepareCSVHeaders = () => {
  return [
    {
      label: 'Request Type',
      key: 'reques_type',
    },
    {
      label: 'Transaction Type',
      key: 'transaction_type',
    },
    {
      label: 'Status',
      key: 'status',
    },
    {
      label: 'Transaction Hash',
      key: 'transaction_hash',
    },
    {
      label: 'Contract Address',
      key: 'contract_address',
    },
    {
      label: 'Timestamp',
      key: 'transaction_time_stamp',
    },
    {
      label: 'Query Reponse',
      key: 'query_response',
    },
    {
      label: 'HashScan Explorer',
      key: 'hashscan_explorer',
    },
  ];
};

/**
 * @dev prepare data object for CSV exporting feature
 */
export const prepareCSVData = (transactionList: ITransactionResult[], network: string) => {
  const queryResponseKeys = [
    'ownerOf',
    'tokenURI',
    'approves',
    'approves',
    'balanceOf',
    'allowances',
    'ercTokenInfo',
  ];

  // sort transactionList based on order
  const sortedTransactionList = transactionList.sort((txA, txB) => {
    return txA.transactionTimeStamp - txB.transactionTimeStamp;
  });

  return sortedTransactionList.map((transaction) => {
    // prepare query responses
    let queryResponse;
    queryResponseKeys.forEach((key) => {
      if ((transaction as any)[key] && transaction.readonly) {
        queryResponse = JSON.stringify((transaction as any)[key]).replaceAll(',', ';');
      }
    });

    return {
      status: transaction.status,
      query_response: queryResponse || 'N/A',
      transaction_type: transaction.transactionType,
      contract_address: transaction.sessionedContractAddress,
      reques_type: transaction.readonly ? 'QUERY' : 'TRANSACTION',
      transaction_hash: transaction.readonly ? 'N/A' : transaction.txHash,
      transaction_time_stamp: new Date(transaction.transactionTimeStamp).toLocaleString(),
      hashscan_explorer: transaction.readonly
        ? 'N/A'
        : `https://hashscan.io/${network}/transaction/${transaction.txHash}`,
    };
  });
};

/**
 * @dev handles estimating gas
 */
export const handleEstimateGas = async (
  baseContract: Contract,
  signerAddress: ethers.AddressLike,
  network: TNetworkName,
  functionSignature: string,
  args: any[]
) => {
  // prepare arguments for estimateGas()
  const contractAddress = await baseContract.getAddress();

  const calldata = baseContract.interface.encodeFunctionData(functionSignature, args);
  const estimateGas = await estimateGasViaMirrorNode(contractAddress, signerAddress, calldata, network);
  if (!estimateGas.gasLimit || estimateGas.err) return { err: estimateGas.err };

  return { gasLimit: estimateGas.gasLimit };
};
// Filename: system-contract-dapp-playground/src/utils/common/metadata.ts
/*-
 *
 * Hedera Smart Contracts
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

import { Metadata } from 'next';

const DAPP_NAME = 'Hedera System Contract Dapp';
const TITLE = 'System Contract Dapp Playground | Hedera';
const DESCRIPTION = "Explore Hedera's system smart contract through an intutive and exciting Dapp Playground";
const OFFICIAL_REPO_URL =
  'https://github.com/hashgraph/hedera-smart-contracts/system-contract-dapp-playground';

const dappMetadata: Metadata = {
  // ######## DAPP ########
  applicationName: DAPP_NAME,
  keywords: [
    'Hedera System Contract Dapp',
    'Hashgraph System Contract Dapp',
    'Hedera',
    'Hashgraph',
    'Swirlds Labs',
    'Dapp Playground',
    'Hedera System Smart Contracts',
  ],
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: '/hederafavicon.ico',
    shortcut: '/hederafavicon.ico',
  },
  metadataBase: new URL(OFFICIAL_REPO_URL),
  alternates: {
    canonical: '/',
  },

  // ######## OG ########
  openGraph: {
    siteName: DAPP_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
    type: 'website',
    url: '/',
  },

  // ######## Twitter ########
  twitter: {
    card: 'summary_large_image',
    site: OFFICIAL_REPO_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default dappMetadata;
// Filename: system-contract-dapp-playground/src/utils/contract-interactions/HTS/helpers.ts
/*-
 *
 * Hedera Smart Contracts
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

import {
  EXPIRY_KEYS,
  KEY_VALUE_KEYS,
  FIXED_FEES_KEYS,
  CUSTOM_FEES_KEYS,
  TOKEN_INFO_NFT_KEYS,
  FRACTIONAL_FEES_KEYS,
  TOKEN_INFO_BASIC_KEYS,
  TOKEN_INFO_ADVANCED_KEYS,
} from './token-query/constant';
import { isAddress } from 'ethers';
import { ISmartContractExecutionResult } from '@/types/contract-interactions/shared';
import { KEY_TYPE_MAP, DEFAULT_IHTS_KEY_VALUE } from './token-create-custom/constant';

/**
 * @dev tests if the input conforms to the common compressed public key standard
 *
 * @param compressedPublicKey: string
 *
 * @return boolean
 */
export const isCompressedPublicKey = (compressedPublicKey: string): boolean => {
  const compressedPublicKeyPattern = /^0x(02|03)[0-9a-fA-F]{64}$/;
  return compressedPublicKeyPattern.test(compressedPublicKey);
};

/**
 * @dev Constructs a key conforming to the IHederaTokenService.TokenKey type
 *
 * @param keyType: IHederaTokenServiceKeyType
 *
 * @param keyValueType: IHederaTokenServiceKeyValueType
 *
 * @param keyValue: string | boolean
 *
 * @return IHederaTokenServiceTokenKey
 */
export const constructIHederaTokenKey = (
  inputKeyType: IHederaTokenServiceKeyType,
  inputKeyValueType: IHederaTokenServiceKeyValueType,
  inputKeyValue: string | boolean
): IHederaTokenServiceTokenKey | null => {
  // sanitize params and prepare keyValue
  let keyValue;
  if (inputKeyValueType === 'inheritAccountKey') {
    keyValue = inputKeyValue as boolean;
  } else if (inputKeyValueType === 'contractId' || inputKeyValueType === 'delegatableContractId') {
    if (!isAddress(inputKeyValue as string)) {
      return null;
    } else {
      keyValue = inputKeyValue as string;
    }
  } else {
    if (!isCompressedPublicKey(inputKeyValue as string)) {
      return null;
    } else {
      keyValue = Buffer.from((inputKeyValue as string).replace('0x', ''), 'hex');
    }
  }

  return {
    keyType: KEY_TYPE_MAP[inputKeyType],
    key: { ...DEFAULT_IHTS_KEY_VALUE, [inputKeyValueType]: keyValue },
  };
};

/**
 * @dev prepares a list of IHederaTokenService.TokenKey typed keys with a ICommonKeyObject[] input
 *
 * @param inputKeys: ICommonKeyObject[]
 *
 * @return IHederaTokenServiceTokenKey[]
 *
 * @return err: ICommonKeyObject[]
 */
export const prepareHederaTokenKeyArray = (inputKeys: ICommonKeyObject[]) => {
  let constructingKeyError: ICommonKeyObject[] = [];
  const hederaTokenKeys = inputKeys.map((inputKey) => {
    // construct IHederaTokenKey
    const hederaTokenKey = constructIHederaTokenKey(
      inputKey.keyType,
      inputKey.keyValueType,
      inputKey.keyValue
    );

    // push the invalid keys to the error list
    if (!hederaTokenKey) {
      constructingKeyError.push({
        keyType: inputKey.keyType,
        keyValueType: inputKey.keyValueType,
        keyValue: inputKey.keyValue,
        err: 'Invalid key value',
      });
    }

    // return the new token key
    return hederaTokenKey;
  });

  if (constructingKeyError.length > 0) {
    return { err: constructingKeyError };
  } else {
    return { hederaTokenKeys: hederaTokenKeys as IHederaTokenServiceTokenKey[] };
  }
};

/**
 * @dev handle responses while interacting with contract APIs
 *
 * @param transactionResult: any,
 *
 * @param errMsg: string
 */
export const handleContractResponse = async (
  transactionResult: any,
  errMsg?: any
): Promise<ISmartContractExecutionResult> => {
  // return err if any
  if (errMsg) {
    console.error(errMsg);
    return { err: errMsg };
  } else if (!transactionResult) {
    console.error('Cannot execute contract methods');
    return { err: 'Cannot execute contract methods' };
  }

  // get transaction receipt
  const txReceipt = await transactionResult.wait();

  // retrieve responseCode from event
  const { data } = txReceipt.logs.filter((event: any) => event.fragment.name === 'ResponseCode')[0];

  // @notice: 22 represents the predefined response code from the Hedera system contracts, indicating a successful transaction.
  return { result: Number(data) === 22, transactionHash: txReceipt.hash };
};

/**
 * @dev handle responses while interacting with contract APIs
 *
 * @param transactionResult: any,
 *
 * @param errMsg: string
 */
export const handleContractResponseWithDynamicEventNames = async (
  transactionResult: any,
  eventMaps?: any,
  API?: any
): Promise<ISmartContractExecutionResult> => {
  // get transaction receipt
  const txReceipt = await transactionResult.wait();

  // retrieve information from event
  const { data } = txReceipt.logs.filter((event: any) => event.fragment.name === eventMaps[API])[0];
  return { [eventMaps[API]]: data, transactionHash: txReceipt.hash };
};

/**
 * @dev convert an `args` Proxy object returned from events to HTS Token Info object
 *
 * @notice applicable for QueryGeneralInfo APIs
 */
export const convertsArgsProxyToHTSTokenInfo = (
  proxyObj: any,
  API: 'TOKEN' | 'FUNGIBLE' | 'NON_FUNFIBLE'
) => {
  // prepare states
  const htsTokenInfoKeys = ['token', ...TOKEN_INFO_ADVANCED_KEYS];
  const htsNFTTokenInfoKeys = ['tokenInfo', ...TOKEN_INFO_NFT_KEYS];
  const commonProxyObject = API === 'TOKEN' ? proxyObj : proxyObj.tokenInfo;
  const htsTokenInfo = {} as any;
  htsTokenInfoKeys.forEach((key) => {
    if (key === 'token') {
      const htsHederaToken = {} as any;
      TOKEN_INFO_BASIC_KEYS.forEach((key) => {
        const value = commonProxyObject.token[key];
        htsHederaToken[key] = typeof value === 'bigint' ? value.toString() : value;
      });
      htsTokenInfo[key] = htsHederaToken;
    } else {
      const value = commonProxyObject[key];
      htsTokenInfo[key] = typeof value === 'bigint' ? value.toString() : value;
    }
  });

  switch (API) {
    case 'TOKEN': {
      return htsTokenInfo as IHederaTokenServiceTokenInfo;
    }
    case 'FUNGIBLE': {
      const htsFungibleTokenInfo = {
        tokenInfo: htsTokenInfo as IHederaTokenServiceTokenInfo,
        decimals: Number(proxyObj.decimals.toString()),
      };

      return htsFungibleTokenInfo as IHederaTokenServiceFungibleTokenInfo;
    }
    case 'NON_FUNFIBLE': {
      const htsNonFungibleTokenInfo = {} as any;
      htsNFTTokenInfoKeys.forEach((key) => {
        if (key === 'tokenInfo') {
          htsNonFungibleTokenInfo[key] = htsTokenInfo as IHederaTokenServiceTokenInfo;
        } else {
          const value = proxyObj[key];
          htsNonFungibleTokenInfo[key] = typeof value === 'bigint' ? value.toString() : value;
        }
      });
      return htsNonFungibleTokenInfo as IHederaTokenServiceNonFungibleTokenInfo;
    }
  }
};

/**
 * @dev convert an `args` Proxy object returned from events to HTS FEES/KEYS/EXPIRY info
 *
 * @notice applicable for QuerySpecificInfo APIs
 */
export const convertsArgsProxyToHTSSpecificInfo = (
  proxyObj: any,
  API: 'CUSTOM_FEES' | 'TOKEN_EXPIRY' | 'TOKEN_KEYS'
) => {
  // prepare states

  switch (API) {
    case 'CUSTOM_FEES':
      let htsFeesInfo = {
        fixedFees: [] as IHederaTokenServiceFixedFee[],
        fractionalFees: [] as IHederaTokenServiceFractionalFee[],
        royaltyFees: [] as IHederaTokenServiceRoyaltyFee[],
      };

      CUSTOM_FEES_KEYS.forEach((customFeesKey) => {
        proxyObj[customFeesKey].forEach((fee: any) => {
          const customFee = {} as any;
          let keysArray = [];
          if (customFeesKey === 'fixedFees') {
            keysArray = FIXED_FEES_KEYS;
          } else if (customFeesKey === 'fractionalFees') {
            keysArray = FRACTIONAL_FEES_KEYS;
          } else {
            keysArray = FRACTIONAL_FEES_KEYS;
          }
          keysArray.forEach((key: any) => {
            const value = fee[key];
            customFee[key] = typeof value === 'bigint' ? value.toString() : value;
          });
          htsFeesInfo[customFeesKey].push(customFee);
        });
      });
      return htsFeesInfo;

    case 'TOKEN_EXPIRY': {
      let htsExpiryInfo = {} as any;
      EXPIRY_KEYS.forEach((key) => {
        const value = proxyObj.expiryInfo[key];
        htsExpiryInfo[key] = typeof value === 'bigint' ? value.toString() : value;
      });
      return htsExpiryInfo as IHederaTokenServiceExpiry;
    }

    case 'TOKEN_KEYS': {
      let htsKeysInfo = {} as any;
      KEY_VALUE_KEYS.forEach((key) => {
        const value = proxyObj.key[key];
        htsKeysInfo[key] = typeof value === 'bigint' ? value.toString() : value;
      });
      return htsKeysInfo as IHederaTokenServiceKeyValueType;
    }
  }
};
// Filename: system-contract-dapp-playground/src/utils/contract-interactions/HTS/token-create-custom/constant.ts
/*-
 *
 * Hedera Smart Contracts
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

import { ethers } from 'ethers';
import { HEDERA_SHARED_PARAM_INPUT_FIELDS } from '@/utils/common/constants';

/**
 * @notice an object to map key type to the specific bit value
 *
 * @see https://github.com/hashgraph/hedera-smart-contracts/blob/main/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol#L128C22-L128C22
 */
export const KEY_TYPE_MAP: Record<IHederaTokenServiceKeyType, IHederaTokenServiceKeyTypeBitValue> = {
  ADMIN: 1,
  KYC: 2,
  FREEZE: 4,
  WIPE: 8,
  SUPPLY: 16,
  FEE: 32,
  PAUSE: 64,
};

/**
 * @notice an object of the keyValue's default values which conform to IHederaTokenService.KeyValue
 */
export const DEFAULT_IHTS_KEY_VALUE: IHederaTokenServiceKeyValue = {
  inheritAccountKey: false,
  contractId: ethers.ZeroAddress,
  ed25519: Buffer.from('', 'hex'),
  ECDSA_secp256k1: Buffer.from('', 'hex'),
  delegatableContractId: ethers.ZeroAddress,
};

/**
 * @notice an object that holds constant values for the parameters used in token creation.
 */
export const htsTokenCreateParamFields = {
  name: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    inputPlaceholder: 'Name of the token...',
    paramKey: 'name',
    explanation: 'represents the name by which the token should be known',
  },
  symbol: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'symbol',
    inputPlaceholder: 'Ticket symbol of the token...',
    explanation: 'represents the ticket symbol of the token',
  },
  memo: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'memo',
    inputType: 'text',
    inputPlaceholder: 'A memo associated with the token...',
    explanation: 'represents an optional note that can be attached to a token transfer',
  },
  initSupply: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'initSupply',
    inputPlaceholder: 'Initial supply...',
    explanation: 'represents the starting amount of tokens available when the token is deployed',
  },
  maxSupply: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'maxSupply',
    inputPlaceholder: 'Max supply...',
    explanation: 'defines the maximum number of tokens that can ever exist for the token',
  },
  decimals: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    inputPlaceholder: 'Decimal places...',
    paramKey: 'decimals',
    explanation: 'Determines token divisibility and decimal precision',
  },
  treasury: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'treasury',
    inputPlaceholder: 'The token treasury account ID...',
    explanation: 'represents the account will receive the specified initial supply or the newly minted NFTs',
  },
  feeTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'feeTokenAddress',
    inputPlaceholder: 'The denomination token ID...',
    explanation: 'represents the ID of token that is used for fixed fee denomination',
  },
  feeAmount: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'feeAmount',
    inputPlaceholder: 'The fee amount...',
    explanation: 'represents the number of units to assess as a fee',
  },
  customFee: {
    paramKey: 'customFee',
    explanation: {
      off: 'No fixed fee will be set. Token created will be free of charge during CryptoTransfer',
      on: ' A fixed fee will be set. An additional amount of the token will be transferred to the specified collection account(s) every time a token transfer is initiated',
    },
  },
  freezeStatus: {
    paramKey: 'freezeStatus',
    explanation: {
      off: 'Accounts can receive the token without needing to be unfrozen',
      on: ' Accounts must be unfrozen before they can receive the token ',
    },
  },
};

/**
 * @notice an object that holds constant values for the parameters used in token mint.
 */
export const htsTokenMintParamFields = {
  tokenAddressToMint: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'tokenAddressToMint',
    inputPlaceholder: 'Hedera token address...',
    explanation: 'represents the address of the Hedera token for which minting will be performed.',
  },
  amount: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'amount',
    inputType: 'number',
    inputPlaceholder: 'Amount to mint...',
    explanation: 'represents the amount you wish to mint for the specified Hedera token.',
  },
  metadata: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'metadata',
    inputPlaceholder: 'Metadata...',
    explanation:
      'Provide additional information about the minting process if needed. Each metadata is allocated to a new NFT.',
  },
  recipientAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'recipientAddress',
    inputPlaceholder: 'The receiver address (optional)...',
    explanation:
      'represents the address of the receiver who will receive the amount of newly minted tokens. If leave unset, the minted tokens will be sent to the treasury account.',
  },
};

export const htsTokenAssociateParamFields = {
  tokenAddresses: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'tokenAddresses',
    inputPlaceholder: 'Token addresses...',
    explanation: 'represents the tokens to be associated with the provided account',
  },
  associatingAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'associatingAddress',
    inputPlaceholder: 'Associating account...',
    explanation: 'represents the account to be associated with the provided tokens',
  },
};

export const htsGrantTokenKYCParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the token for which this account will be granted KYC.',
  },
  grantingKYCAccountAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'grantingKYCAccountAddress',
    inputPlaceholder: 'Account to grant KYC...',
    explanation: 'represents the account to be KYCed',
  },
};
// Filename: system-contract-dapp-playground/src/utils/contract-interactions/HTS/token-management/constant.ts
/*-
 *
 * Hedera Smart Contracts
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

import { ethers } from 'ethers';
import { HEDERA_SHARED_PARAM_INPUT_FIELDS } from '@/utils/common/constants';

/**
 * @notice an object for the IhederaTokenService.Expiry
 */
export const DEFAULT_TOKEN_EXIPIRY_VALUE: IHederaTokenServiceExpiry = {
  second: 0,
  autoRenewPeriod: 0,
  autoRenewAccount: ethers.ZeroAddress,
};

/**
 * @notice an object for the IHederaTokenService.HederaToken default values
 */
export const DEFAULT_HEDERA_TOKEN_INFO_VALUE: IHederaTokenServiceHederaToken = {
  memo: '',
  name: '',
  symbol: '',
  treasury: '',
  maxSupply: 0,
  tokenKeys: [],
  freezeDefault: false,
  tokenSupplyType: false,
  expiry: DEFAULT_TOKEN_EXIPIRY_VALUE,
};

/** @notice an object holding information for the updateTokenInfo's input fields */
export const htsUpdateTokenInfoParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera Token for updating',
  },
  name: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'name',
    inputType: 'text',
    inputPlaceholder: 'Name of the token...',
    explanation: 'represents the name by which the token should be known',
  },
  symbol: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'symbol',
    inputPlaceholder: 'Ticket symbol of the token...',
    explanation: 'represents the ticket symbol of the token',
  },
  memo: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'memo',
    inputType: 'text',
    inputPlaceholder: 'A memo for the token...',
    explanation: 'represents an optional note that can be attached to a token transfer',
  },
  maxSupply: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'maxSupply',
    inputPlaceholder: 'Max supply...',
    explanation: 'defines the maximum number of tokens that can ever exist for the token',
  },
  treasury: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'treasury',
    inputPlaceholder: 'The token treasury account ID...',
    explanation: 'represents the account will receive the specified initial supply or the newly minted NFTs',
  },
  tokenSupplyType: {
    paramKey: 'tokenSupplyType',
    explanation: {
      infinite: 'Indicates that tokens of that type have an upper bound of Long.MAX_VALUE.',
      finite:
        'Indicates that tokens of that type have an upper bound of maxSupply, provided on token creation.',
    },
  },
  freezeStatus: {
    paramKey: 'freezeStatus',
    explanation: {
      off: 'Accounts can receive the token without needing to be unfrozen',
      on: ' Accounts must be unfrozen before they can receive the token ',
    },
  },
};

/** @notice an object holding information for the updateTokenExpiry's input fields */
export const htsUpdateTokenExpiryParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera Token for updating',
  },
  second: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'second',
    inputType: 'number',
    inputPlaceholder: 'The new expiry time of the token...',
    explanation: 'represents the epoch second at which the token should expire',
  },
  autoRenewAccount: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'autoRenewAccount',
    inputPlaceholder: 'Account address...',
    explanation:
      "represents the new account which will be automatically charged to renew the token's expiration",
  },
  autoRenewPeriod: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'autoRenewPeriod',
    inputPlaceholder: 'Expiry interval...',
    explanation:
      "represents the new interval at which the auto-renew account will be charged to extend the token's expiry. The default auto-renew period is 131,500 minutes.",
  },
};

/** @notice an object holding information for the tokenPermission's input fields */
export const htsTokenPermissionParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera Token for updating',
  },
  targetApprovedAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'targetApprovedAddress',
    inputPlaceholder: 'Account address...',
    explanation: 'represents the operator of the update transaction',
  },
  amountToApprove: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'amountToApprove',
    inputPlaceholder: 'Amount...',
    explanation: 'represents the allocated allowance for the operator',
  },
  serialNumber: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'serialNumber',
    inputPlaceholder: 'Serial number...',
    explanation: "represents the NFT's serial number to be approved for the operator",
  },
  approvedStatus: {
    paramKey: 'approvedStatus',
    explanation: {
      on: 'authorize the operator to utilize the allowance on behalf of the token owner.',
      off: "revoke the operator's authorization to utilize the allowance on behalf of the token owner",
    },
  },
};

/** @notice an object holding information for the tokenStatus's input fields */
export const htsTokenStatusParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera Token for updating',
  },
};

/** @notice an object holding information for the tokenRelation's input fields */
export const htsTokenRelationParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera Token for updating',
  },
  hederaTokenAddresses: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddresses',
    inputPlaceholder: 'Token addresses (comma-separated)...',
    explanation: 'represents the tokens to be dissociated with the provided account',
  },
  accountAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'accountAddress',
    inputPlaceholder: 'Account address...',
    explanation: 'represents the account address of the update transaction',
  },
};

/** @notice an object holding information for the tokenDeduction's input fields */
export const htsTokenDeductionParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera Token for updating',
  },
  accountAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'accountAddress',
    inputPlaceholder: 'Account address...',
    explanation: 'represents the account address of the update transaction',
  },
  amount: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'amount',
    inputType: 'number',
    inputPlaceholder: 'The amount of token...',
    explanation: 'represents the amount of token to be deducted from the transaction',
  },
  serialNumbers: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'serialNumbers',
    inputPlaceholder: 'Serial numbers (comma-separated)...',
    explanation: "represents the NFT's serial numbers to be deducted from the transaction",
  },
};
// Filename: system-contract-dapp-playground/src/utils/contract-interactions/HTS/token-query/constant.ts
/*-
 *
 * Hedera Smart Contracts
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

import { HEDERA_SHARED_PARAM_INPUT_FIELDS } from '@/utils/common/constants';

/** @notice an object holding information for the tokenRelation's input fields */
export const htsQueryTokenInfoParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera Token for querying',
  },
  serialNumber: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'serialNumber',
    inputPlaceholder: 'Serial number...',
    explanation: "represents the NFT's serial number to be queried",
  },
};

/** @notice an object holding information for the queryTokenPermission's input fields */
export const htsQueryTokenPermissionParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera Token for querying',
  },
  serialNumber: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'serialNumber',
    inputPlaceholder: 'Serial number...',
    explanation: "represents the NFT's serial number to be queried",
  },
  ownerAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'string',
    paramKey: 'ownerAddress',
    inputPlaceholder: 'Owner address...',
    explanation: "represents the address of the token's owner",
  },
  spenderAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'string',
    paramKey: 'spenderAddress',
    inputPlaceholder: 'Spender/Operator address...',
    explanation: 'represents the spender or operator address',
  },
};

/** @notice an object holding information for the queryTokenInfo's input fields */
export const htsQueryTokenStatusParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera Token for querying',
  },
  accountAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'accountAddress',
    inputPlaceholder: 'Account address...',
    explanation: 'represents the account address to check status against',
  },
};

export const TOKEN_INFO_BASIC_KEYS = [
  'name',
  'symbol',
  'treasury',
  'memo',
  'tokenSupplyType',
  'maxSupply',
  'freezeDefault',
];
export const TOKEN_INFO_ADVANCED_KEYS = [
  'totalSupply',
  'deleted',
  'defaultKycStatus',
  'pauseStatus',
  'ledgerId',
];
export const TOKEN_INFO_NFT_KEYS = ['serialNumber', 'ownerId', 'creationTime', 'metadata', 'spenderId'];

type CustomFeeKeys = 'fixedFees' | 'fractionalFees' | 'royaltyFees';
export const CUSTOM_FEES_KEYS: CustomFeeKeys[] = ['fixedFees', 'fractionalFees', 'royaltyFees'];

export const FIXED_FEES_KEYS = [
  'amount',
  'tokenId',
  'useHbarsForPayment',
  'useCurrentTokenForPayment',
  'feeCollector',
];
export const FRACTIONAL_FEES_KEYS = [
  'numerator',
  'denominator',
  'minimumAmount',
  'maximumAmount',
  'netOfTransfers',
  'feeCollector',
];
export const ROYALTY_FEES_KEYS = [
  'numerator',
  'denominator',
  'amount',
  'tokenId',
  'useHbarsForPayment',
  'feeCollector',
];
export const KEY_VALUE_KEYS = [
  'inheritAccountKey',
  'contractId',
  'ed25519',
  'ECDSA_secp256k1',
  'delegatableContractId',
];
export const EXPIRY_KEYS = ['second', 'autoRenewAccount', 'autoRenewPeriod'];
// Filename: system-contract-dapp-playground/src/utils/contract-interactions/HTS/token-transfer/paramFieldConstant.ts
/*-
 *
 * Hedera Smart Contracts
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

import { HEDERA_SHARED_PARAM_INPUT_FIELDS } from '@/utils/common/constants';

/** @notice an object holding information for the queryTokenInfo's input fields */
export const htsCryptoTransferParamFields = {
  accountID: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'accountID',
    inputPlaceholder: 'Account ID...',
    explanation: 'represents the accountID that sends/receives cryptocurrency or tokens',
  },
  amount: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'amount',
    inputType: 'number',
    inputPlaceholder: 'Amount...',
    explanation:
      'represents the the amount of tinybars (for Crypto transfers) or in the lowest denomination (for Token transfers) that the account sends(negative) or receives(positive)',
  },
  isApprovalA: {
    paramKey: 'isApprovalA',
    explanation:
      'If true then the transfer is expected to be an approved allowance and the accountID is expected to be the owner. The default is false (omitted).',
  },
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera Token address',
  },
  senderAccountID: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'senderAccountID',
    inputPlaceholder: 'Sender ID...',
    explanation: 'represents the accountID of the sender',
  },
  receiverAccountID: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'receiverAccountID',
    inputPlaceholder: 'Receiver ID...',
    explanation: 'represents the accountID of the receiver',
  },
  serialNumber: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'serialNumber',
    inputPlaceholder: 'Serial number...',
    explanation: 'represents the serial number of the NFT',
  },
  isApprovalB: {
    paramKey: 'isApprovalB',
    explanation:
      'If true then the transfer is expected to be an approved allowance and the senderAccountID is expected to be the owner. The default is false (omitted).',
  },
};

/** @notice an object holding information for the tokenTransfer's input fields */
export const htsTokenTransferParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera token to be transfered',
  },
  senderAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'senderAddress',
    inputPlaceholder: 'Sender address...',
    explanation: 'represents the sender address',
  },
  receiverAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'receiverAddress',
    inputPlaceholder: 'Receiver address...',
    explanation: 'represents the receiver address',
  },
  quantity: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'quantity',
    inputPlaceholder: 'Amount | Serial number...',
    explanation:
      'represents the amount for type FUNGIBLE_COMMON and serial number for type NON_FUNGIBLE_COMMON',
  },
  feeValue: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'feeValue',
    inputPlaceholder: 'Gas limit...',
    explanation: 'represents the gas limit for the transaction',
  },
};

/** @notice an object holding information for the tokenTransfer's input fields */
export const htsMultiTokensTransferParamFields = {
  hederaTokenAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'hederaTokenAddress',
    inputPlaceholder: 'Token address...',
    explanation: 'represents the Hedera token to be transfered',
  },
  senderAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'senderAddress',
    inputPlaceholder: 'Sender address...',
    explanation: 'represents the sender address',
  },
  receiverAddress: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'receiverAddress',
    inputPlaceholder: 'Receiver address...',
    explanation: 'represents the receiver address',
  },
  amount: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'amount',
    inputType: 'number',
    inputPlaceholder: 'Amount...',
    explanation: 'represents the amount for to transfer',
  },
  serialNumber: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'serialNumber',
    inputPlaceholder: 'Serial number...',
    explanation: "represents the token's serialNumber to transfer",
  },
  feeValue: {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'feeValue',
    inputPlaceholder: 'Gas limit...',
    explanation: 'represents the gas limit for the transaction',
  },
};
// Filename: system-contract-dapp-playground/src/utils/contract-interactions/erc/erc20/constant.ts
/*-
 *
 * Hedera Smart Contracts
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
import { HEDERA_SHARED_PARAM_INPUT_FIELDS } from '@/utils/common/constants';

export const mintParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    inputPlaceholder: 'Recipient address..',
    paramKey: 'recipient',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    inputPlaceholder: 'Token amount..',
    paramKey: 'amount',
  },
];

export const approveParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'spender',
    inputPlaceholder: 'Spender address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'amount',
    inputType: 'number',
    inputPlaceholder: 'Allowance amount..',
  },
];

export const allowanceParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'owner',
    inputType: 'text',
    inputPlaceholder: 'Owner address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'spender',
    inputPlaceholder: 'Spender address..',
  },
];

export const increaseAllowanceParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'spender',
    inputPlaceholder: 'Spender address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'amount',
    inputType: 'number',
    inputPlaceholder: 'Allowance amount..',
  },
];

export const decreaseAllowanceParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'spender',
    inputPlaceholder: 'Spender address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'amount',
    inputType: 'number',
    inputPlaceholder: 'Allowance amount..',
  },
];

export const transferParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'recipient',
    inputPlaceholder: 'Recipient address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'amount',
    inputType: 'number',
    inputPlaceholder: 'Token amount..',
  },
];

export const transferFromParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'owner',
    inputType: 'text',
    inputPlaceholder: 'Token owner address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'recipient',
    inputPlaceholder: 'Recipient address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'amount',
    inputType: 'number',
    inputPlaceholder: 'Token amount..',
  },
];
// Filename: system-contract-dapp-playground/src/utils/contract-interactions/erc/erc721/constant.ts
/*-
 *
 * Hedera Smart Contracts
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

import { HEDERA_SHARED_PARAM_INPUT_FIELDS } from '@/utils/common/constants';

export const mintParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'recipient',
    inputPlaceholder: 'Recipient address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'tokenId',
    inputPlaceholder: 'Token ID..',
  },
];

export const mintERC721ParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'recipient',
    inputPlaceholder: 'Recipient address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'tokenId',
    inputPlaceholder: 'Token ID..',
  },
];

export const approveERC721ParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'spenderAddress',
    inputPlaceholder: 'Spender address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'number',
    paramKey: 'tokenId',
    inputPlaceholder: 'Token ID..',
  },
];

export const isApprovalERC721ParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'owner',
    inputPlaceholder: 'Owner address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'operator',
    inputPlaceholder: 'Operator address..',
  },
];

export const transferFromERC721ParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'sender',
    inputPlaceholder: 'Sender address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'recipient',
    inputPlaceholder: 'Recipient address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'tokenId',
    inputType: 'number',
    inputPlaceholder: 'Token ID..',
  },
];

export const safeTransferFromERC721ParamFields = [
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'sender',
    inputPlaceholder: 'Sender address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    inputType: 'text',
    paramKey: 'recipient',
    inputPlaceholder: 'Recipient address..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'tokenId',
    inputType: 'number',
    inputPlaceholder: 'Token ID..',
  },
  {
    ...HEDERA_SHARED_PARAM_INPUT_FIELDS,
    paramKey: 'data',
    inputType: 'text',
    inputPlaceholder: 'Data..',
  },
];
