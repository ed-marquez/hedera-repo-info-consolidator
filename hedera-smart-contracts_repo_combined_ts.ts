// Filename: system-contract-dapp-playground/__tests__/ethers/index.test.ts
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

export const MOCK_RESPONSE_CODE = 22;
export const MOCK_GAS_LIMIT = 1_000_000;
export const MOCK_HEDERA_NETWORK = 'testnet';
export const MOCK_CONTRACT_ID = '0xDd7fCb7c2ee96A79B1e201d25F5E43d6a0cED5e6';
export const MOCK_SIGNER_ADDRESS = '0x21725B0AE10F52eC4D587D51B37732Badb223D94';
export const MOCK_TOKEN_ADDRESS = '0x00000000000000000000000000000000000084b7';
export const MOCK_TX_HASH = '0x63424020a69bf46a0669f46dd66addba741b9c02d37fab1686428f5209bc759d';
// Filename: system-contract-dapp-playground/prerequisite-check/contracts-info/index.ts
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// SPDX-License-Identifier: Apache-2.0

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
// Filename: tools/erc-repository-indexer/erc-contract-indexer/src/index.ts
// SPDX-License-Identifier: Apache-2.0

import { ercRegistryRunner } from './runner';

(async () => {
  try {
    await ercRegistryRunner();
    console.log('Runner executed successfully.');
  } catch (err) {
    console.error('Error executing runner:', err);
    process.exit(1); // Exit with failure status
  }
})();
// Filename: tools/erc-repository-indexer/erc-contract-indexer/src/runner.ts
// SPDX-License-Identifier: Apache-2.0

import dotenv from 'dotenv';
import { ByteCodeAnalyzer } from './services/byteCodeAnalyzer';
import { ConfigService } from './services/config';
import { ContractScannerService } from './services/contractScanner';
import { RegistryGenerator } from './services/registryGenerator';

dotenv.config();

export const ercRegistryRunner = async () => {
  const configService = new ConfigService();
  const registryGenerator = new RegistryGenerator();
  const contractScannerService = new ContractScannerService(
    configService.getMirrorNodeUrl(),
    configService.getMirrorNodeUrlWeb3(),
    configService.getScanContractLimit()
  );
  const byteCodeAnalyzer = new ByteCodeAnalyzer();

  try {
    let next = await configService.resolveStartingPoint(registryGenerator);
    await processContracts(
      next,
      contractScannerService,
      byteCodeAnalyzer,
      registryGenerator,
      configService
    );
  } catch (error) {
    console.error('Error during the indexing process:', error);
  }
};

const processContracts = async (
  next: string | null,
  contractScannerService: ContractScannerService,
  byteCodeAnalyzer: ByteCodeAnalyzer,
  registryGenerator: RegistryGenerator,
  configService: ConfigService
) => {
  do {
    const fetchContractsResponse =
      await contractScannerService.fetchContracts(next);

    if (!fetchContractsResponse || !fetchContractsResponse.contracts.length) {
      console.warn('No contracts found.');
      return;
    }

    next = fetchContractsResponse.links.next;

    const ercContracts = await byteCodeAnalyzer.categorizeERCContracts(
      contractScannerService,
      fetchContractsResponse.contracts
    );

    // only update registry if detectionOnly is off
    if (!configService.getDetectionOnly()) {
      // let the registry update process to run asynchronously in the background
      registryGenerator.generateErcRegistry(
        ercContracts.erc20Contracts,
        ercContracts.erc721Contracts,
        ercContracts.erc1155Contracts
      );

      registryGenerator.updateNextPointer(next);
    }
  } while (next);
};
// Filename: tools/erc-repository-indexer/erc-contract-indexer/src/schemas/ERCRegistrySchemas.ts
// SPDX-License-Identifier: Apache-2.0

export interface ERCOutputInterface {
  address: string;
  contractId: string;
}

export interface ERC20OutputInterface extends ERCOutputInterface {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
}

export interface ERC721OutputInterface extends ERCOutputInterface {
  name: string;
  symbol: string;
}

export interface ERC1155OutputInterface extends ERCOutputInterface {}

export type TokenOutputInterface =
  | ERC20OutputInterface
  | ERC721OutputInterface
  | ERC1155OutputInterface;

export interface ERCTokenInfoSelectors {
  type: string;
  field: string;
  sighash: string;
}
// Filename: tools/erc-repository-indexer/erc-contract-indexer/src/schemas/MirrorNodeSchemas.ts
// SPDX-License-Identifier: Apache-2.0

// refs: https://github.com/hashgraph/hedera-mirror-node-explorer/blob/main/src/schemas/MirrorNodeSchemas.ts#L543
export interface MirrorNodeContract {
  admin_key: any;
  auto_renew_account: string | null; // Network entity ID in the format of shard.realm.num
  auto_renew_period: number | null;
  contract_id: string | null; // Network entity ID in the format of shard.realm.num
  created_timestamp: string | null;
  deleted: boolean;
  evm_address: string;
  expiration_timestamp: string | null;
  file_id: string | null | undefined; // Network entity ID in the format of shard.realm.num
  max_automatic_token_associations: number | null;
  memo: string;
  nonce: number | undefined;
  obtainer_id: string | null; // Network entity ID in the format of shard.realm.num
  permanent_removal: boolean | null;
  proxy_account_id: string | null; // Network entity ID in the format of shard.realm.num
  timestamp: any;
}

export interface MirrorNodeContractResponse extends MirrorNodeContract {
  bytecode: string | null;
  runtime_bytecode: string | null;
}

export interface Links {
  next: string | null;
}

export interface ContractCallData {
  data: string;
  to: string;
}
// Filename: tools/erc-repository-indexer/erc-contract-indexer/src/services/byteCodeAnalyzer.ts
// SPDX-License-Identifier: Apache-2.0

import AhoCorasick from 'ahocorasick';
import { ContractScannerService } from './contractScanner';
import constants from '../utils/constants';
import { ethers } from 'ethers';
import {
  ERCOutputInterface,
  ERCTokenInfoSelectors,
  TokenOutputInterface,
} from '../schemas/ERCRegistrySchemas';
import {
  MirrorNodeContract,
  MirrorNodeContractResponse,
} from '../schemas/MirrorNodeSchemas';

enum ERCID {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERCC1155 = 'ERC1155',
}

export class ByteCodeAnalyzer {
  /**
   * Analyzes bytecode, detects and categorizes contracts into ERC20, ERC721, and ERC1155 types based on their bytecode.
   *
   * This method fetches contract bytecode for the provided contract objects and categorizes them into ERC20, ERC721, and ERC1155 contracts
   * based on their bytecode analysis. It returns an object containing arrays of categorized contracts.
   *
   * @param {ContractScannerService} contractScannerService - The service used to fetch contract bytecode.
   * @param {MirrorNodeContract[]} contractObject - An array of contract objects to categorize.
   * @returns {Promise<{erc20Contracts: ERCOutputInterface[], erc721Contracts: ERCOutputInterface[], erc1155Contracts: ERCOutputInterface[]}>}
   * @throws {Error} If there's an error while analyzing contract bytecode.
   */
  async categorizeERCContracts(
    contractScannerService: ContractScannerService,
    contractObject: MirrorNodeContract[]
  ): Promise<{
    erc20Contracts: ERCOutputInterface[];
    erc721Contracts: ERCOutputInterface[];
    erc1155Contracts: ERCOutputInterface[];
  }> {
    const erc20Contracts: ERCOutputInterface[] = [];
    const erc721Contracts: ERCOutputInterface[] = [];
    const erc1155Contracts: ERCOutputInterface[] = [];

    try {
      const contractResponses = await Promise.all(
        contractObject.map(({ contract_id }) =>
          contract_id
            ? contractScannerService.fetchContractObject(contract_id)
            : null
        )
      );

      for (const contract of contractResponses) {
        if (
          !contract ||
          !contract.bytecode ||
          !contract.contract_id ||
          !contract.evm_address ||
          !contract.runtime_bytecode
        ) {
          console.warn('Skipping contract due to missing data:', {
            contractId: contract?.contract_id,
            hasBytecode: !!contract?.bytecode,
            hasContractId: !!contract?.contract_id,
            hasEvmAddress: !!contract?.evm_address,
            hasRuntimeBytecode: !!contract?.runtime_bytecode,
          });
          continue;
        }

        const contractBytecode =
          contract.runtime_bytecode === '0x'
            ? contract.bytecode
            : contract.runtime_bytecode;

        if (contractBytecode === '0x') {
          console.log(
            `Skipping analyzing contract due to empty bytecode: contractId=${contract.contract_id}`
          );
          continue;
        }

        console.log(`Analyzing contract: contractId=${contract.contract_id}`);

        if (this.isErc(ERCID.ERC20, contractBytecode)) {
          const ercTokenInfoObject = await this.analyzeErcContract(
            ERCID.ERC20,
            contract,
            contractScannerService,
            constants.ERC20_TOKEN_INFO_SELECTORS
          );
          if (ercTokenInfoObject) {
            erc20Contracts.push(ercTokenInfoObject);
          }
        }

        if (this.isErc(ERCID.ERC721, contractBytecode)) {
          const ercTokenInfoObject = await this.analyzeErcContract(
            ERCID.ERC721,
            contract,
            contractScannerService,
            constants.ERC721_TOKEN_INFO_SELECTORS
          );
          if (ercTokenInfoObject) {
            erc721Contracts.push(ercTokenInfoObject);
          }
        }

        if (this.isErc(ERCID.ERCC1155, contractBytecode)) {
          const ercTokenInfoObject = await this.analyzeErcContract(
            ERCID.ERCC1155,
            contract,
            contractScannerService,
            []
          );
          if (ercTokenInfoObject) {
            erc1155Contracts.push(ercTokenInfoObject);
          }
        }
      }
    } catch (error) {
      console.error('Error while analyzing contract bytecode:', error);
    }

    return { erc20Contracts, erc721Contracts, erc1155Contracts };
  }

  /**
   * Analyzes a specific ERC contract to extract token information.
   *
   * This method logs the detection of a new ERC contract and attempts to retrieve its token information
   * using the provided contract scanner service. If successful, it returns the token information object.
   *
   * @param {ERCID} ercId - The type of ERC contract (ERC20, ERC721, or ERC1155).
   * @param {MirrorNodeContractResponse} contract - The contract object containing relevant data.
   * @param {ContractScannerService} contractScannerService - The service used to fetch contract token information.
   * @param {ERCTokenInfoSelectors[]} ercTokenInfoSelectors - An array of selectors for token information.
   * @returns {Promise<TokenOutputInterface |  null>} The token information object or null if not found.
   */
  private async analyzeErcContract(
    ercId: ERCID,
    contract: MirrorNodeContractResponse,
    contractScannerService: ContractScannerService,
    ercTokenInfoSelectors: ERCTokenInfoSelectors[]
  ): Promise<TokenOutputInterface | null> {
    console.log(
      `New ERC contract detected: contractId=${contract.contract_id}, ercID: ${ercId}`
    );

    try {
      return await this.getErcTokenInfo(
        contractScannerService,
        contract,
        ercTokenInfoSelectors
      );
    } catch (error: any) {
      console.warn(error.errMessage);
      console.log(`Skip ERC contract: contractId=${contract.contract_id}`);
      return null;
    }
  }

  /**
   * Retrieves token information for a given ERC contract by making contract call requests.
   *
   * This method constructs and sends contract call requests based on the provided token info selectors,
   * decodes the responses, and returns an object containing the token information.
   *
   * @param {ContractScannerService} contractScannerService - The service used to fetch contract token information.
   * @param {MirrorNodeContractResponse} contract - The contract object containing relevant data.
   * @param {ERCTokenInfoSelectors[]} ercTokenInfoSelectors - An array of selectors for token information.
   * @returns {Promise<TokenOutputInterface>} The token information object.
   * @throws {Error} If a contract call fails despite passing signature matching.
   */
  private async getErcTokenInfo(
    contractScannerService: ContractScannerService,
    contract: MirrorNodeContractResponse,
    ercTokenInfoSelectors: ERCTokenInfoSelectors[]
  ): Promise<TokenOutputInterface> {
    const contractCallPromises = ercTokenInfoSelectors.map(
      ({ type, field, sighash }) =>
        contractScannerService
          .contractCallRequest({
            data: sighash,
            to: contract.evm_address,
          })
          .then((tokenInfoResponse) => ({
            type,
            field,
            tokenInfoResponse,
          }))
    );
    const contractCallResponses = await Promise.all(contractCallPromises);

    const ercTokenInfoObject = contractCallResponses.reduce<
      Record<string, string | number | null>
    >((ercTokenInfoObject, { type, field, tokenInfoResponse }) => {
      if (!tokenInfoResponse) {
        ercTokenInfoObject[field] = tokenInfoResponse;
      } else {
        const decodedTokenInfo = ethers.AbiCoder.defaultAbiCoder().decode(
          [type],
          tokenInfoResponse
        )[0];

        // `decodedTokenInfo` can potentially be one of two types: string or BigInt.
        // Since the goal is to write the data to disk, convert BigInt to a Number,
        // as the filesystem (fs) cannot directly handle BigInt values.
        ercTokenInfoObject[field] =
          type === 'string' ? decodedTokenInfo : Number(decodedTokenInfo);
      }

      return ercTokenInfoObject;
    }, {});

    return {
      contractId: contract.contract_id!,
      address: contract.evm_address,
      ...ercTokenInfoObject,
    } as TokenOutputInterface;
  }

  /**
   * Determines if the provided bytecode conforms to the specified ERC standard by searching for all required function selectors and event topics using the Aho-Corasick algorithm.
   *
   * The Aho-Corasick algorithm constructs a finite state machine from the provided set of standard signatures, facilitating efficient multi-pattern matching within the bytecode.
   * It operates with linear time complexity, O(n + m + z), where n represents the bytecode length, m is the total length of the signatures, and z is the number of matches identified.
   * This efficiency is especially beneficial for analyzing large bytecode sequences, as it drastically minimizes processing time.
   *
   * @param {ERCID} ercId - Identifier for the ERC standard (e.g., ERC-20, ERC-721, ERC-1155).
   * @param {string} bytecode - The contract's bytecode to be analyzed.
   * @returns {boolean} - Returns true if the bytecode contains all required signatures for the specified ERC standard; otherwise, false.
   */
  private isErc(ercId: ERCID, bytecode: string): boolean {
    const standardErcSignatures = constants.ERC_STANDARD_SIGNATURES[ercId];

    const ahoCorasick = new AhoCorasick(standardErcSignatures);
    const matches = ahoCorasick.search(bytecode);

    // Each match returned by ahoCorasick.search() is in the format [occurrences, ['key']], where:
    // - `match[1]` refers to the array containing the matched signature(s) (the `key` array).
    // - `match[1][0]` accesses the first item in this `key` array, which represents the actual matched signature.
    // This logic ensures we extract only the relevant signature from each match.
    const foundSignatures = new Set(matches.map((match: any) => match[1][0]));

    return standardErcSignatures.every((signature) =>
      foundSignatures.has(signature)
    );
  }
}
// Filename: tools/erc-repository-indexer/erc-contract-indexer/src/services/config.ts
// SPDX-License-Identifier: Apache-2.0

import constants from '../utils/constants';
import { ContractScannerService } from './contractScanner';
import { Helper } from '../utils/helper';
import { RegistryGenerator } from './registryGenerator';

export class ConfigService {
  /**
   * @private
   * @readonly
   * @property {string} network - The network identifier for the Hedera network (e.g., previewnet, testnet, mainnet).
   */
  private readonly network: string;

  /**
   * @private
   * @readonly
   * @property {string} mirrorNodeUrl - The URL for the Hedera Mirror Node API.
   */
  private readonly mirrorNodeUrl: string;

  /**
   * @private
   * @readonly
   * @property {string} mirrorNodeUrlWeb3 - The URL for the Hedera Mirror Node Web3Module API.
   */
  private readonly mirrorNodeUrlWeb3: string;

  /**
   * @private
   * @readonly
   * @property {string} startingPoint - The starting point for indexing, which can be a contract ID or a pagination pointer.
   */
  private readonly startingPoint: string;

  /**
   * @private
   * @readonly
   * @property {boolean} detectionOnly - A flag indicating whether detection-only mode is enabled.
   * If `true`, only contract detection occurs; if `false`, registry updates are also performed.
   */
  private readonly detectionOnly: boolean;

  /**
   * @private
   * @readonly
   * @property {number} scanContractLimit - The maximum number of contracts to scan per operation.
   */
  private readonly scanContractLimit: number;

  constructor() {
    this.network = process.env.HEDERA_NETWORK || '';
    this.mirrorNodeUrl = process.env.MIRROR_NODE_URL || '';
    this.mirrorNodeUrlWeb3 = process.env.MIRROR_NODE_URL_WEB3 || '';
    this.startingPoint = process.env.STARTING_POINT || '';
    this.detectionOnly = process.env.ENABLE_DETECTION_ONLY === 'true';
    this.scanContractLimit = process.env.SCAN_CONTRACT_LIMIT
      ? parseInt(process.env.SCAN_CONTRACT_LIMIT)
      : 100;
    this.validateConfigs();

    console.log(
      `Indexing process initiated: network=${this.network}, mirrorNodeUrl=${this.mirrorNodeUrl}, mirrorNodeUrlWeb3=${this.mirrorNodeUrlWeb3}, detectionOnly=${this.detectionOnly}, scanContractLimit=${this.scanContractLimit}`
    );
  }

  /**
   * Validates the configuration values for network and starting point.
   * Throws an error if the configurations are invalid.
   * @throws {Error} If HEDERA_NETWORK or STARTING_POINT is not properly configured.
   */
  private validateConfigs(): void {
    if (!this.network || !constants.NETWORK_REGEX.test(this.network)) {
      throw new Error(
        `HEDERA_NETWORK Is Not Properly Configured: network=${this.network}`
      );
    }

    if (constants.PRODUCTION_NETWORKS.includes(this.network)) {
      if (
        !this.mirrorNodeUrl ||
        !constants.MIRROR_NODE_URL_REGEX.test(this.mirrorNodeUrl)
      ) {
        throw new Error(
          `MIRROR_NODE_URL Is Not Properly Configured: mirrorNodeUrl=${this.mirrorNodeUrl}`
        );
      }
    }

    if (
      this.startingPoint &&
      !constants.STARTING_POINT_REGEX.test(this.startingPoint)
    ) {
      throw new Error(
        `STARTING_POINT Is Not Properly Configured: startingPoint=${this.startingPoint}`
      );
    }

    if (
      isNaN(this.scanContractLimit) ||
      this.scanContractLimit <= 0 ||
      this.scanContractLimit > 100
    ) {
      throw new Error(
        `SCAN_CONTRACT_LIMIT Is Not Properly Configured (should be a number from 1-100): scanContractLimit=${this.scanContractLimit}`
      );
    }
  }

  /**
   * Determines the starting point for indexing based on the configuration settings.
   * The method prioritizes the STARTING_POINT if it is defined in the configuration.
   * If STARTING_POINT is not defined, it checks for a stored next pointer on disk; if found, it uses that.
   * If neither is available, the indexing will start from the genesis block.
   *
   * @param {RegistryGenerator} registryGenerator - An instance of the RegistryGenerator used to retrieve the next pointer from storage.
   * @returns {Promise<string | null>} A promise that resolves to the starting point string, or null if no valid starting point is set.
   */
  async resolveStartingPoint(
    registryGenerator: RegistryGenerator
  ): Promise<string | null> {
    if (constants.GET_CONTRACTS_LISTS_NEXT_REGEX.test(this.startingPoint)) {
      console.log(
        `Start indexing the network from next_pointer=${this.startingPoint}`
      );
      return this.startingPoint;
    }

    if (constants.HEDERA_CONTRACT_ID_REGEX.test(this.startingPoint)) {
      console.log(
        `Start indexing the network from contractId=${this.startingPoint}`
      );
      return Helper.buildStartingPoint(this.startingPoint);
    }

    if (constants.EVM_ADDRESS_REGEX.test(this.startingPoint)) {
      return this.resolveFromEvmAddress();
    }

    const startingPointFromStorage =
      await registryGenerator.retrieveNextPointer();

    if (startingPointFromStorage) {
      console.log(
        `Start indexing the network from storage next pointer=${startingPointFromStorage}`
      );
      return startingPointFromStorage;
    }

    console.log('Start indexing the network from genesis');
    return null;
  }

  /**
   * Resolves the starting point from an EVM address by fetching the detailed contract object.
   * @returns {Promise<string>} A promise that resolves to the starting point string.
   * @throws {Error} If the contract is not found.
   */
  private async resolveFromEvmAddress(): Promise<string> {
    const contractScanner = new ContractScannerService(
      this.mirrorNodeUrl,
      this.mirrorNodeUrlWeb3,
      this.scanContractLimit
    );
    const contractResponse = await contractScanner.fetchContractObject(
      this.startingPoint
    );

    if (!contractResponse?.contract_id) {
      throw new Error(
        `Resource Not Found: startingPoint=${this.startingPoint}`
      );
    }

    console.log(
      `Start indexing the network from contractAddress=${this.startingPoint} (${contractResponse.contract_id})`
    );
    return Helper.buildStartingPoint(contractResponse.contract_id);
  }

  /**
   * Gets the configured network.
   * @returns {string} The network string.
   */
  getNetwork(): string {
    return this.network;
  }

  /**
   * Gets the URL of the mirror node.
   * @returns {string} The mirror node URL.
   */
  getMirrorNodeUrl(): string {
    return this.mirrorNodeUrl;
  }

  /**
   * Gets the URL of the mirror node web3module.
   * @returns {string} The mirror node URL web3module.
   */
  getMirrorNodeUrlWeb3(): string {
    return this.mirrorNodeUrlWeb3;
  }

  /**
   * Gets the current status of the detection-only mode.
   * @returns {boolean} `true` if detection-only mode is enabled, `false` otherwise.
   */
  getDetectionOnly(): boolean {
    return this.detectionOnly;
  }

  /**
   * Retrieves the maximum number of contracts to scan per operation.
   * @returns {number} The configured contract scan limit.
   */
  getScanContractLimit(): number {
    return this.scanContractLimit;
  }
}
// Filename: tools/erc-repository-indexer/erc-contract-indexer/src/services/contractScanner.ts
// SPDX-License-Identifier: Apache-2.0

import { AxiosError, AxiosInstance } from 'axios';
import constants from '../utils/constants';
import { Helper } from '../utils/helper';
import {
  ContractCallData,
  Links,
  MirrorNodeContract,
  MirrorNodeContractResponse,
} from '../schemas/MirrorNodeSchemas';

export class ContractScannerService {
  /**
   * @private
   * @readonly
   * @property {AxiosInstance} mirrorNodeRestClient - Axios client instance for interacting with the Hedera Mirror Node REST API.
   */
  private readonly mirrorNodeRestClient: AxiosInstance;

  /**
   * @private
   * @readonly
   * @property {AxiosInstance} mirrorNodeWeb3Client - Axios client instance for interacting with the Hedera Mirror Node Web3Module API.
   */
  private readonly mirrorNodeWeb3Client: AxiosInstance;

  /**
   * @private
   * @readonly
   * @property {number} scanContractLimit - The maximum number of contracts to scan per operation.
   */
  private readonly scanContractLimit: number;

  constructor(
    mirrorNodeUrl: string,
    mirrorNodeUrlWeb3: string,
    scanContractLimit: number
  ) {
    const mirrorNodeClients = Helper.buildAxiosClient(
      mirrorNodeUrl,
      mirrorNodeUrlWeb3
    );
    this.mirrorNodeRestClient = mirrorNodeClients.mirrorNodeRestClient;
    this.mirrorNodeWeb3Client = mirrorNodeClients.mirrorNodeWeb3Client;
    this.scanContractLimit = scanContractLimit;
  }

  /**
   * Fetches contracts from the mirror node API.
   * @param {string | null} next - The pagination token for the next set of results. If null, fetches from the beginning.
   * @returns {Promise<{ contracts: MirrorNodeContract[]; links: Links } | null>} A promise that resolves to an object containing an array of contract data and pagination links, or null if the request fails.
   * @throws {Error} When there is a network or API error. Rate limit errors (429) are automatically retried.
   */
  async fetchContracts(
    next: string | null = null
  ): Promise<{ contracts: MirrorNodeContract[]; links: Links } | null> {
    const getAllContractPath = Helper.buildUrl(next, this.scanContractLimit);
    console.log('Fetching contract batch from URL:', getAllContractPath);

    try {
      const response = await this.mirrorNodeRestClient.get(getAllContractPath);
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error, this.fetchContracts, next);
    }
  }

  /**
   * Fetches detailed contract object for a specific contract from the mirror node API.
   * @param {string} contractId - The ID of the contract to fetch details for.
   * @returns {Promise<MirrorNodeContractResponse | null>} A promise that resolves to the contract details including bytecode, or null if the request fails.
   * @throws {Error} When there is a network or API error. Rate limit errors (429) are automatically retried.
   */
  async fetchContractObject(
    contractId: string
  ): Promise<MirrorNodeContractResponse | null> {
    try {
      const response = await this.mirrorNodeRestClient.get(
        `${constants.GET_CONTRACT_ENDPOINT}/${contractId}`
      );
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error, this.fetchContractObject, contractId);
    }
  }

  /**
   * Handles Axios errors, specifically dealing with rate limiting (429) errors by implementing retry logic.
   * @param {unknown} error - The error thrown by Axios
   * @param {(param: string | null) => any} retryMethod - The method to retry if rate limited
   * @param {any} param - Parameter to pass to the retry method
   * @returns {Promise<any>} Returns the result of the retry method if successful, null otherwise
   */
  private async handleAxiosError(
    error: unknown,
    retryMethod: (param: any) => any,
    param: any
  ): Promise<any> {
    const isRateLimitError = (error as AxiosError).response?.status === 429;
    const isBadRequestError = (error as AxiosError).response?.status === 400;
    if (isRateLimitError) {
      console.log(
        `Rate limit exceeded. Retrying in ${constants.RETRY_DELAY_MS}ms...`
      );
      await Helper.wait(constants.RETRY_DELAY_MS);
      return retryMethod.call(this, param);
    }

    // Bad requests for contractCallRequest are expected for non-ERC contracts.
    // To prevent log clutter, log the error only if it is not a bad request originating from contractCallRequest.
    if (
      !isBadRequestError &&
      retryMethod.name !== this.contractCallRequest.name
    ) {
      console.error('Error returned from the mirror node:', error);
    }

    return null;
  }
  /**
   * Sends a contract call request to the mirror node API.
   *
   * This method constructs a POST request to the contract call endpoint with the provided call data.
   * It handles any potential errors, including rate limit errors, by retrying the request if necessary.
   *
   * @param {ContractCallData} callData - The data required for the contract call, including the target contract address and the data to be sent.
   * @returns {Promise<any>} A promise that resolves to the result of the contract call, or null if the request fails.
   * @throws {Error} When there is a network or API error.
   */
  async contractCallRequest(callData: ContractCallData): Promise<any> {
    try {
      const response = await this.mirrorNodeWeb3Client.post(
        constants.CONTRACT_CALL_ENDPOINT,
        callData
      );
      return response.data.result;
    } catch (error) {
      return this.handleAxiosError(error, this.contractCallRequest, callData);
    }
  }
}
// Filename: tools/erc-repository-indexer/erc-contract-indexer/src/services/registryGenerator.ts
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import constants from '../utils/constants';
import { ERCOutputInterface } from '../schemas/ERCRegistrySchemas';
import { Helper } from '../utils/helper';
import _ from 'lodash';

export class RegistryGenerator {
  /**
   * @private
   * @readonly
   * @property {string} erc20JsonFilePath - The file path where ERC20 contract registry data will be stored
   */
  private readonly erc20JsonFilePath: string;

  /**
   * @private
   * @readonly
   * @property {string} erc721JsonFilePath - The file path where ERC721 contract registry data will be stored
   */
  private readonly erc721JsonFilePath: string;

  /**
   * @private
   * @readonly
   * @property {string} erc1155JsonFilePath - The file path where ERC1155 contract registry data will be stored
   */
  private readonly erc1155JsonFilePath: string;

  /**
   * @private
   * @readonly
   * @property {string} nextPointerFilePath - The file path where the next pointer for indexing will be stored.
   */
  private readonly nextPointerFilePath: string;

  constructor() {
    this.erc20JsonFilePath = Helper.buildFilePath(
      constants.ERC_20_JSON_FILE_NAME
    );
    this.erc721JsonFilePath = Helper.buildFilePath(
      constants.ERC_721_JSON_FILE_NAME
    );
    this.erc1155JsonFilePath = Helper.buildFilePath(
      constants.ERC_1155_JSON_FILE_NAME
    );
    this.nextPointerFilePath = Helper.buildFilePath(
      constants.GET_CONTRACTS_LIST_NEXT_POINTER_JSON_FILE_NAME
    );
  }

  /**
   * Updates the next pointer in a file if it is not null.
   * @param {string | null} next - The next pointer to be written to the file. If null, the file will not be updated.
   * @returns {Promise<void>} A promise that resolves when the next pointer has been successfully written to the file.
   */
  async updateNextPointer(next: string | null): Promise<void> {
    if (next) {
      await this.writeContentsToFile(this.nextPointerFilePath, next);
      console.log('Next pointer has been successfully updated to:', next);
    }
  }

  /**
   * Retrieves the next pointer from nextPointerFilePath.
   * @returns {Promise<string | null>} A promise that resolves to the next pointer if it exists, or null if the file is empty or does not exist.
   */
  async retrieveNextPointer(): Promise<string | null> {
    const fileContent = this.readContentsFromFile(this.nextPointerFilePath);
    return fileContent ? JSON.parse(fileContent) : null;
  }

  /**
   * Generates registry files for ERC20, ERC721, and ERC1155 contracts by updating existing registries with new contracts.
   * @param {ERCOutputInterface[]} erc20Contracts - Array of ERC20 contract interfaces to add to registry
   * @param {ERCOutputInterface[]} erc721Contracts - Array of ERC721 contract interfaces to add to registry
   * @param {ERCOutputInterface[]} erc1155Contracts - Array of ERC1155 contract interfaces to add to registry
   * @returns {Promise<void>} Promise that resolves when registry files are updated
   */
  async generateErcRegistry(
    erc20Contracts: ERCOutputInterface[],
    erc721Contracts: ERCOutputInterface[],
    erc1155Contracts: ERCOutputInterface[]
  ): Promise<void> {
    const updatePromises = [];

    if (erc20Contracts.length) {
      updatePromises.push(
        this.updateRegistry(this.erc20JsonFilePath, erc20Contracts)
      );
    }

    if (erc721Contracts.length) {
      updatePromises.push(
        this.updateRegistry(this.erc721JsonFilePath, erc721Contracts)
      );
    }

    if (erc1155Contracts.length) {
      updatePromises.push(
        this.updateRegistry(this.erc1155JsonFilePath, erc1155Contracts)
      );
    }

    // Wait for all updates to complete in parallel
    await Promise.all(updatePromises);
  }

  /**
   * Updates a registry file with new contracts by merging them with existing contracts,
   * ensuring the registry remains sorted and free of duplicates.
   *
   * @param {string} filePath - The file path to the registry file.
   * @param {ERCOutputInterface[]} newContracts - The new contracts to add to the registry.
   * @returns {Promise<void>} - A promise that resolves once the registry is successfully updated.
   *
   * @private
   */
  private async updateRegistry(
    filePath: string,
    newContracts: ERCOutputInterface[]
  ): Promise<void> {
    let uniqueContracts: ERCOutputInterface[] = [];
    const fileContent = this.readContentsFromFile(filePath);
    const existingContracts = fileContent
      ? (JSON.parse(fileContent) as ERCOutputInterface[])
      : [];

    if (!existingContracts.length) {
      uniqueContracts = newContracts;
    } else if (
      // Since both arrays are sorted in ascending order, if the `contractId` of the last item in `existingContracts`
      // is less than the `contractId` of the first item in `newContracts`, just merged the contracts and remove dups without sorting.
      existingContracts[existingContracts.length - 1].contractId <
      newContracts[0].contractId
    ) {
      uniqueContracts = _.chain([...existingContracts, ...newContracts]) // merge contracts
        .uniqBy('contractId') // Remove duplicates based on contractId
        .value(); // Extract the final array
    } else {
      uniqueContracts = _.chain([...existingContracts, ...newContracts]) // merge contracts
        .uniqBy('contractId') // Remove duplicates based on contractId
        .sortBy((contract) => Number(contract.contractId.split('.')[2])) // Sort by the numeric value of contractId
        .value(); // Extract the final array
    }

    await this.writeContentsToFile(filePath, uniqueContracts);

    // Convert Map values back to array for file writing

    console.log(
      `Finished writing ${newContracts.length} new ERC token contracts to registry.`
    );
  }

  /**
   * Reads the contents of a registry file and returns the existing contracts.
   * If the file does not exist, an empty string is returned.
   * @param {string} filePath - The path to the registry file.
   * @returns {string} The contents of the registry file as a string, or an empty string if the file doesn't exist.
   * @private
   */
  private readContentsFromFile(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Writes the specified contents to a file at the given file path.
   * If the directory does not exist, it will be created recursively.
   *
   * @param {string} filePath - The path to the file where contents will be written.
   * @param {any} contents - The contents to write to the file, which will be stringified as JSON.
   * @returns {Promise<void>} A promise that resolves when the file has been successfully written.
   */
  private async writeContentsToFile(
    filePath: string,
    contents: any
  ): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(contents, null, 2));
  }
}
// Filename: tools/erc-repository-indexer/erc-contract-indexer/src/utils/constants.ts
// SPDX-License-Identifier: Apache-2.0

export default {
  RETRY_DELAY_MS: 9000,
  GET_CONTRACT_ENDPOINT: '/api/v1/contracts',
  CONTRACT_CALL_ENDPOINT: '/api/v1/contracts/call',
  ERC_20_JSON_FILE_NAME: 'erc-20.json',
  ERC_721_JSON_FILE_NAME: 'erc-721.json',
  ERC_1155_JSON_FILE_NAME: 'erc-1155.json',
  GET_CONTRACTS_LIST_NEXT_POINTER_JSON_FILE_NAME: 'next-pointer.json',
  PRODUCTION_NETWORKS: ['previewnet', 'testnet', 'mainnet'],
  NETWORK_REGEX: /^(local-node|previewnet|testnet|mainnet)$/,
  MIRROR_NODE_URL_REGEX:
    /^https:\/\/(previewnet|testnet|mainnet)\.mirrornode\.hedera\.com$/,
  STARTING_POINT_REGEX:
    /^(0x[a-fA-F0-9]{40}|0\.0\.\d+|\/api\/v1\/contracts\?limit=100&order=asc&contract\.id=gte:0\.0\.\d+)$/,
  EVM_ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/,
  HEDERA_CONTRACT_ID_REGEX: /^0\.0\.\d+$/,
  GET_CONTRACTS_LISTS_NEXT_REGEX:
    /^\/api\/v1\/contracts\?limit=100&order=asc&contract\.id=gte:0\.0\.\d+$/,
  ERC20_TOKEN_INFO_SELECTORS: [
    {
      type: 'string',
      field: 'name',
      sighash: '0x06fdde03',
    },
    {
      type: 'string',
      field: 'symbol',
      sighash: '0x95d89b41',
    },
    {
      type: 'uint256',
      field: 'totalSupply',
      sighash: '0x18160ddd',
    },
    {
      type: 'uint8',
      field: 'decimals',
      sighash: '0x313ce567',
    },
  ],
  ERC721_TOKEN_INFO_SELECTORS: [
    {
      type: 'string',
      field: 'name',
      sighash: '0x06fdde03',
    },
    {
      type: 'string',
      field: 'symbol',
      sighash: '0x95d89b41',
    },
  ],
  ERC_STANDARD_SIGNATURES: {
    /**
     * The pattern for identifying ERC-20 bytecode, based on a set of method and event signatures
     * as defined in the ERC-20 standard interface.
     *
     * Selectors (Methods):
     * - 'dd62ed3e': allowance(address _owner, address _spender) view returns (uint256 remaining)
     * - '095ea7b3': approve(address _spender, uint256 _value) returns (bool success)
     * - '70a08231': balanceOf(address _owner) view returns (uint256 balance)
     * - '18160ddd': totalSupply() view returns (uint256)
     * - 'a9059cbb': transfer(address _to, uint256 _value) returns (bool success)
     * - '23b872dd': transferFrom(address _from, address _to, uint256 _value) returns (bool success)
     *
     * Topics (Events):
     * - '8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': Approval(address indexed _owner, address indexed _spender, uint256 _value)
     * - 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': Transfer(address indexed _from, address indexed _to, uint256 _value)
     *
     * source: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.1.0/contracts/token/ERC20/IERC20.sol
     */
    ERC20: [
      'dd62ed3e',
      '095ea7b3',
      '70a08231',
      '18160ddd',
      'a9059cbb',
      '23b872dd',
      '8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
      'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    ],

    /**
     * The pattern for identifying ERC-721 bytecode, based on a set of method and event signatures
     * as defined in the ERC-721 standard interface.
     *
     * Selectors (Methods):
     * - '095ea7b3': approve(address _approved, uint256 _tokenId) payable
     * - '70a08231': balanceOf(address _owner) view returns (uint256)
     * - '081812fc': getApproved(uint256 _tokenId) view returns (address)
     * - 'e985e9c5': isApprovedForAll(address _owner, address _operator) view returns (bool)
     * - '6352211e': ownerOf(uint256 _tokenId) view returns (address)
     * - '42842e0e': safeTransferFrom(address _from, address _to, uint256 _tokenId) payable
     * - 'b88d4fde': safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes data) payable
     * - 'a22cb465': setApprovalForAll(address _operator, bool _approved)
     * - '01ffc9a7': supportsInterface(bytes4 interfaceID) view returns (bool)
     * - '23b872dd': transferFrom(address _from, address _to, uint256 _tokenId) payable
     *
     * Topics (Events):
     * - '8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': Approval(address indexed _owner, address indexed _approved, uint256 indexed _tokenId)
     * - '17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31': ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved)
     * - 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId)
     *
     * source: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.1.0/contracts/token/ERC721/IERC721.sol
     */
    ERC721: [
      '095ea7b3',
      '70a08231',
      '081812fc',
      'e985e9c5',
      '6352211e',
      '42842e0e',
      'b88d4fde',
      'a22cb465',
      '01ffc9a7',
      '23b872dd',
      '8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
      '17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31',
      'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    ],

    /**
     * The pattern for identifying ERC-1155 bytecode, based on a set of method and event signatures
     * as defined in the ERC-1155 standard interface.
     *
     * Selectors (Methods):
     * - '00fdd58e': 'function balanceOf(address account, uint256 id) external view returns (uint256)',
     * - '4e1273f4': 'function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory)',
     * - 'e985e9c5': 'function isApprovedForAll(address account, address operator) external view returns (bool),
     * - '2eb2c2d6': 'function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external',
     * - 'f242432a': 'function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external',
     * - 'a22cb465': 'function setApprovalForAll(address operator, bool approved) external',
     * - '01ffc9a7': 'function supportsInterface(bytes4 interfaceID) view returns (bool)'
     *
     * Topics (Events):
     * - '17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31': 'event ApprovalForAll(address indexed account, address indexed operator, bool approved)',
     * - '4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb': 'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)',
     * - 'c3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62': 'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);',
     * - '6bb7ff708619ba0610cba295a58592e0451dee2622938c8755667688daf3529b': 'event URI(string value, uint256 indexed id)'. Note: This event is defined in the IERC1155 interface but is not triggered in the base OpenZeppelin ERC1155 abstract contract.
     *                                                                                                                      As a result, it is not included in the bytecode of a custom contract inheriting from ERC1155. Only if explicitly implemented
     *                                                                                                                      in a derived contract, the event signature hash will appear in the compiled bytecode. For more flexible signature matching,
     *                                                                                                                      this hash is excluded from the ERC1155 array below.
     *
     * source: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.1.0/contracts/token/ERC1155/IERC1155.sol
     */
    ERC1155: [
      'fdd58e', // Leading zeros ('00') are omitted in the bytecode due to EVM optimizations. This does not affect functionality, as Solidity uses a PUSH3 instruction to load the selector onto the stack.
      '4e1273f4',
      'e985e9c5',
      '2eb2c2d6',
      'f242432a',
      'a22cb465',
      '01ffc9a7',
      '17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31',
      '4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb',
      'c3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62',
    ],
  },
};
// Filename: tools/erc-repository-indexer/erc-contract-indexer/src/utils/helper.ts
// SPDX-License-Identifier: Apache-2.0

import axios, { AxiosInstance } from 'axios';
import constants from './constants';
import path from 'path';

export class Helper {
  /**
   * Constructs the file path for the specified file name based on the current Hedera network.
   * The network is determined by the HEDERA_NETWORK environment variable, defaulting to 'previewnet'.
   *
   * @param {string} fileName - The name of the file for which to build the path.
   * @returns {string} The constructed file path.
   */
  static buildFilePath(fileName: string): string {
    const network = process.env.HEDERA_NETWORK || 'local-node';
    return path.join(__dirname, '../../erc-registry', network, fileName);
  }

  /**
   * Constructs a URL based on the provided `next` parameter. If `next` is not null,
   * it updates the value of the `limit=` parameter in the URL using the provided `scanContractLimit`.
   * If `next` is null, it returns a default URL with query parameters, including `scanContractLimit`
   * and an ascending order for fetching contracts.
   *
   * @param {string | null} next - The pagination token for the next set of results, or null to use the default endpoint.
   * @param {number} scanContractLimit - The limit for the number of contracts to fetch, used to update or construct the URL.
   * @returns {string} The complete URL to query the mirror node API.
   */
  static buildUrl(
    next: string | null,
    scanContractLimit: number = 100
  ): string {
    return next
      ? // Replace the value of the 'limit=' parameter in the URL with the given scanContractLimit.
        // Regex explanation:
        // - (limit=): Captures the exact string 'limit=' using a capture group.
        // - \d+: Matches one or more digits following 'limit='.
        // - `$1${scanContractLimit}`: Replaces the matched pattern with 'limit=' (from capture group) and the new value of scanContractLimit.
        next.replace(/(limit=)\d+/, `$1${scanContractLimit}`)
      : // If 'next' is null, construct a new URL with the scanContractLimit and order.
        `${constants.GET_CONTRACT_ENDPOINT}?limit=${scanContractLimit}&order=asc`;
  }

  /**
   * Creates a promise that resolves after the specified delay
   * @param {number} ms - The delay in milliseconds
   * @returns {Promise<void>} A promise that resolves after the specified delay
   */
  static wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Builds a starting point URL for fetching contracts from the mirror node API.
   * The URL is constructed to retrieve contracts with IDs greater than or equal to the specified contract ID.
   *
   * @param {string} contractId - The contract ID to use as a reference for the starting point.
   * @returns {string} The constructed starting point URL for the mirror node API.
   */
  static buildStartingPoint(contractId: string): string {
    return `/api/v1/contracts?limit=100&order=asc&contract.id=gte:${contractId}`;
  }

  /**
   * Creates and returns Axios client instances for interacting with the Hedera Mirror Node REST API
   * and Web3-compatible API.
   *
   * @param {string} mirrorNodeUrl - The base URL for the Hedera Mirror Node REST API.
   * @param {string} mirrorNodeUrlWeb3 - The base URL for the Hedera Mirror Node Web3-compatible API.
   *                                     If not provided, defaults to the value of `mirrorNodeUrl`.
   * @returns {{ mirrorNodeRestClient: AxiosInstance, mirrorNodeWeb3Client: AxiosInstance }}
   */
  static buildAxiosClient(
    mirrorNodeUrl: string,
    mirrorNodeUrlWeb3: string
  ): {
    mirrorNodeRestClient: AxiosInstance;
    mirrorNodeWeb3Client: AxiosInstance;
  } {
    return {
      mirrorNodeRestClient: axios.create({ baseURL: mirrorNodeUrl }),
      mirrorNodeWeb3Client: axios.create({
        baseURL: mirrorNodeUrlWeb3 || mirrorNodeUrl,
      }),
    };
  }
}
// Filename: tools/erc-repository-indexer/erc-contract-indexer/tests/acceptance/acceptance.test.ts
// SPDX-License-Identifier: Apache-2.0

import dotenv from 'dotenv';
dotenv.config();
import testHelper from './utils/helper';
import testConstants from './utils/constants';
import { ercRegistryRunner } from '../../src/runner';
import { Helper } from '../../src/utils/helper';
import constants from '../../src/utils/constants';
import NodeClient from '@hashgraph/sdk/lib/client/NodeClient';

describe('ERC Registry Acceptance Test', () => {
  // production networks take more time to finish deployments
  jest.setTimeout(60000);

  const totalExpectedDeploymentsForEachContractType = 1;

  const erc20JsonFilePath = Helper.buildFilePath(
    constants.ERC_20_JSON_FILE_NAME
  );
  const erc721JsonFilePath = Helper.buildFilePath(
    constants.ERC_721_JSON_FILE_NAME
  );
  const erc1155JsonFilePath = Helper.buildFilePath(
    constants.ERC_1155_JSON_FILE_NAME
  );

  let deployedAddresses = {
    erc20: [] as string[],
    erc721: [] as string[],
    erc1155: [] as string[],
    nonErc: [] as string[],
    minimalErc20: [] as string[],
    minimalErc721: [] as string[],
  };
  let sdkClient: NodeClient | null = null;

  beforeEach(async () => {
    const contractDeploymentRequirements =
      testHelper.prepareContractDeployRequirements(
        totalExpectedDeploymentsForEachContractType
      );
    sdkClient = testHelper.buildSdkClient();
    deployedAddresses = await testHelper.deployRequiredContracts(
      sdkClient,
      contractDeploymentRequirements
    );

    // Sort all contract addresses to identify the earliest deployed contract
    const allDeployedAddresses = testHelper.sortAddresses([
      ...deployedAddresses.erc20,
      ...deployedAddresses.minimalErc20,
      ...deployedAddresses.erc721,
      ...deployedAddresses.minimalErc721,
      ...deployedAddresses.nonErc,
      ...deployedAddresses.erc1155,
    ]);

    const totalExpectedDeployments =
      totalExpectedDeploymentsForEachContractType *
      contractDeploymentRequirements.length;

    expect(allDeployedAddresses.length).toEqual(totalExpectedDeployments);

    // Start the indexing process from the earliest contract in the batch, avoiding indexing from genesis.
    process.env.STARTING_POINT = allDeployedAddresses[0];
  });

  afterEach(() => {
    // Close or clean up any resources after all test
    if (sdkClient) {
      sdkClient.close(); // Or any appropriate cleanup method
    }
  });

  it('should execute the main ERC registry runner method and correctly record the number of detected ERC contracts in registry', async () => {
    // run the actual tool to start indexing the network and write to registry
    await ercRegistryRunner().then();

    // wait for 500ms for all the asynchronous tasks to finish
    await new Promise((resolve) => setTimeout(resolve, 500));

    // retrieve the newest erc contracts added to the registry
    const latestErc20sWrittenToRegistry = JSON.parse(
      testHelper.readContentsFromFile(erc20JsonFilePath)
    ).slice(totalExpectedDeploymentsForEachContractType * 2 * -1);
    const latestErc721sWrittenToRegistry = JSON.parse(
      testHelper.readContentsFromFile(erc721JsonFilePath)
    ).slice(totalExpectedDeploymentsForEachContractType * 2 * -1);

    const latestErc1155sWrittenToRegistry = JSON.parse(
      testHelper.readContentsFromFile(erc1155JsonFilePath)
    ).slice(totalExpectedDeploymentsForEachContractType * -1);

    // assertion
    latestErc20sWrittenToRegistry.forEach((object: any) => {
      expect(
        deployedAddresses.erc20.includes(object.address) ||
          deployedAddresses.minimalErc20.includes(object.address)
      ).toBe(true);

      if (deployedAddresses.erc20.includes(object.address)) {
        expect(object.name).toEqual(
          testConstants.ERC_CONSTRUCTOR_PARAMS.erc20.tokenName
        );
        expect(object.symbol).toEqual(
          testConstants.ERC_CONSTRUCTOR_PARAMS.erc20.tokenSymbol
        );
      }

      if (deployedAddresses.minimalErc20.includes(object.address)) {
        expect(object.name).toBeNull;
        expect(object.symbol).toBeNull;
        expect(object.decimals).toBeNull;
        expect(object.totalSupply).toBeNull;
      }
    });

    latestErc721sWrittenToRegistry.forEach((object: any) => {
      expect(
        deployedAddresses.erc721.includes(object.address) ||
          deployedAddresses.minimalErc721.includes(object.address)
      ).toBe(true);

      if (deployedAddresses.erc721.includes(object.address)) {
        expect(object.name).toEqual(
          testConstants.ERC_CONSTRUCTOR_PARAMS.erc721.tokenName
        );
        expect(object.symbol).toEqual(
          testConstants.ERC_CONSTRUCTOR_PARAMS.erc721.tokenSymbol
        );
      }

      if (deployedAddresses.minimalErc721.includes(object.address)) {
        expect(object.name).toBeNull;
        expect(object.symbol).toBeNull;
      }
    });

    latestErc1155sWrittenToRegistry.forEach((object: any) => {
      expect(deployedAddresses.erc1155.includes(object.address)).toBe(true);
    });
  });

  it('should not update registry when ENABLE_DETECTION_ONLY is set to true', async () => {
    // Enable detection-only mode
    process.env.ENABLE_DETECTION_ONLY = 'true';

    // Backup current registry
    const currentErc20Registry = JSON.parse(
      testHelper.readContentsFromFile(erc20JsonFilePath) || '[]'
    );
    const currentErc721Registry = JSON.parse(
      testHelper.readContentsFromFile(erc721JsonFilePath) || '[]'
    );

    const currentErc1155Registry = JSON.parse(
      testHelper.readContentsFromFile(erc1155JsonFilePath) || '[]'
    );

    // Run the tool to index the network and potentially update the registry
    await ercRegistryRunner();

    // Wait for asynchronous tasks to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Read updated registry
    const updatedErc20Registry = JSON.parse(
      testHelper.readContentsFromFile(erc20JsonFilePath) || '[]'
    );
    const updatedErc721Registry = JSON.parse(
      testHelper.readContentsFromFile(erc721JsonFilePath) || '[]'
    );

    const updatedErc1155Registry = JSON.parse(
      testHelper.readContentsFromFile(erc1155JsonFilePath) || '[]'
    );

    // Verify that the registry was not updated
    expect(updatedErc20Registry).toEqual(currentErc20Registry);
    expect(updatedErc721Registry).toEqual(currentErc721Registry);
    expect(updatedErc1155Registry).toEqual(currentErc1155Registry);
  });
});
// Filename: tools/erc-repository-indexer/erc-contract-indexer/tests/acceptance/utils/constants.ts
// SPDX-License-Identifier: Apache-2.0

export default {
  ERC_CONSTRUCTOR_PARAMS: {
    erc20: {
      tokenName: 'ERC Registry Fungible',
      tokenSymbol: 'ERFT',
    },
    erc721: {
      tokenName: 'ERC Registry Non-Fungible',
      tokenSymbol: 'ERNFT',
    },
    erc1155: {
      tokenUri: 'test-uri',
    },
  },
};
// Filename: tools/erc-repository-indexer/erc-contract-indexer/tests/acceptance/utils/helper.ts
// SPDX-License-Identifier: Apache-2.0

import {
  Client,
  ContractCreateFlow,
  ContractFunctionParameters,
} from '@hashgraph/sdk';
import fs from 'fs';
import testConstants from '../utils/constants';
import OZERC20Artifacts from '../contracts/erc-20/OZERC20Mock.json';
import MinimalOZERC20Artifacts from '../contracts/erc-20/MinimalERC20.json';
import OZERC721Artifacts from '../contracts/erc-721/OZERC721Mock.json';
import MinimalOZERC721Artifacts from '../contracts/erc-721/MinimalERC721.json';
import OZERC1155Artifacts from '../contracts/erc-1155/ERC1155Mock.json';
import BasicArtifacts from '../contracts/non-ercs/Basic.json';
import NodeClient from '@hashgraph/sdk/lib/client/NodeClient';

export interface ContractDeploymentRequirements {
  contractType: string;
  totalDeployments: number;
  bytecode: string;
  ercConstructorParams: ContractFunctionParameters | null;
}

export default class Helper {
  /**
   * Builds and returns an SDK client configured with the Hedera network and operator credentials.
   * @returns {Client} The configured Hedera SDK client.
   */
  static buildSdkClient(): Client {
    const HEDERA_NETWORK = process.env.HEDERA_NETWORK || '';
    const SDK_OPERATOR_ID = process.env.SDK_OPERATOR_ID || '';
    const SDK_OPERATOR_KEY = process.env.SDK_OPERATOR_KEY || '';

    const sdkClient = Client.forName(HEDERA_NETWORK).setOperator(
      SDK_OPERATOR_ID,
      SDK_OPERATOR_KEY
    );

    console.log(
      `SDK Client succesfully setup for acceptance test: network=${HEDERA_NETWORK}, operatorAccountId=${SDK_OPERATOR_ID}`
    );
    return sdkClient;
  }

  /**
   * Deploys a smart contract to the Hedera network using the provided SDK client.
   * @param {Client} sdkClient - The Hedera SDK client.
   * @param {string} bytecode - The bytecode of the smart contract to deploy.
   * @param {ContractFunctionParameters|null} params - Constructor parameters for the smart contract (optional).
   * @returns {Promise<string>} The deployed contract's Ethereum address.
   */
  static async deploySmartContractsViaSdk(
    sdkClient: Client,
    bytecode: string,
    params: ContractFunctionParameters | null,
    contractType: string
  ): Promise<string> {
    const contractCreateFlow = new ContractCreateFlow()
      .setGas(1_000_000)
      .setBytecode(bytecode);

    if (params) {
      contractCreateFlow.setConstructorParameters(params);
    }

    const txResponse = await contractCreateFlow.execute(sdkClient);
    const receipt = await txResponse.getReceipt(sdkClient);

    console.log(
      `New contract successfully deployed: contractId=${receipt.contractId}, contractType=${contractType}, contractEvmAddress=0x${receipt.contractId?.toSolidityAddress()}, contractEvmAddress=0x${receipt.contractId?.toSolidityAddress()}`
    );

    return `0x${receipt.contractId!.toSolidityAddress()}`;
  }

  /**
   * Reads the contents of a file from the given file path.
   * @param {string} filePath - The path to the file.
   * @returns {string} The file contents, or an empty string if the file does not exist.
   */
  static readContentsFromFile(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Sorts an array of Ethereum addresses in ascending order.
   * @param {string[]} addresses - An array of Ethereum addresses to sort.
   * @returns {string[]} The sorted array of addresses.
   */
  static sortAddresses(addresses: string[]): string[] {
    return addresses.sort((a, b) => {
      const diff = BigInt(a) - BigInt(b);
      return diff < 0n ? -1 : 1;
    });
  }

  /**
   * Prepares contract deployment requirements for ERC20, ERC721, and non-ERC contracts.
   * @param {number} totalExpectedDeploymentsForEachContractType - The total expected deployments for each contract type
   * @returns {ContractDeploymentRequirements[]} An array of contract deployment requirements.
   */
  static prepareContractDeployRequirements(
    totalExpectedDeploymentsForEachContractType: number
  ): ContractDeploymentRequirements[] {
    return [
      {
        contractType: 'erc20',
        totalDeployments: totalExpectedDeploymentsForEachContractType,
        bytecode: OZERC20Artifacts.bytecode,
        ercConstructorParams: new ContractFunctionParameters()
          .addString(testConstants.ERC_CONSTRUCTOR_PARAMS.erc20.tokenName)
          .addString(testConstants.ERC_CONSTRUCTOR_PARAMS.erc20.tokenSymbol),
      },
      {
        contractType: 'erc721',
        totalDeployments: totalExpectedDeploymentsForEachContractType,
        bytecode: OZERC721Artifacts.bytecode,
        ercConstructorParams: new ContractFunctionParameters()
          .addString(testConstants.ERC_CONSTRUCTOR_PARAMS.erc721.tokenName)
          .addString(testConstants.ERC_CONSTRUCTOR_PARAMS.erc721.tokenSymbol),
      },
      {
        contractType: 'minimalErc20',
        totalDeployments: totalExpectedDeploymentsForEachContractType,
        bytecode: MinimalOZERC20Artifacts.bytecode,
        ercConstructorParams: null,
      },
      {
        contractType: 'minimalErc721',
        totalDeployments: totalExpectedDeploymentsForEachContractType,
        bytecode: MinimalOZERC721Artifacts.bytecode,
        ercConstructorParams: null,
      },
      {
        contractType: 'erc1155',
        totalDeployments: totalExpectedDeploymentsForEachContractType,
        bytecode: OZERC1155Artifacts.bytecode,
        ercConstructorParams: new ContractFunctionParameters().addString(
          testConstants.ERC_CONSTRUCTOR_PARAMS.erc1155.tokenUri
        ),
      },
      {
        contractType: 'nonErc',
        totalDeployments: totalExpectedDeploymentsForEachContractType,
        bytecode: BasicArtifacts.bytecode,
        ercConstructorParams: null,
      },
    ];
  }

  /**
   * Deploys the required contracts to the Hedera network.
   * @param {NodeClient} sdkClient - The Hedera SDK client.
   * @param {ContractDeploymentRequirements[]} contractDeploymentRequirements - An array of contract deployment requirements.
   * @returns {Promise<{erc20: string[], erc721: string[], nonErc: string[]}>} An object containing arrays of deployed contract addresses categorized by type.
   */
  static async deployRequiredContracts(
    sdkClient: NodeClient,
    contractDeploymentRequirements: ContractDeploymentRequirements[]
  ): Promise<{
    erc20: string[];
    erc721: string[];
    erc1155: string[];
    nonErc: string[];
    minimalErc20: string[];
    minimalErc721: string[];
  }> {
    const deployedAddresses = {
      erc20: [] as any,
      minimalErc20: [] as any,
      erc721: [] as any,
      minimalErc721: [] as any,
      nonErc: [] as any,
      erc1155: [] as any,
    };

    for (const contractObject of contractDeploymentRequirements) {
      for (let i = 0; i < contractObject.totalDeployments; i++) {
        deployedAddresses[
          contractObject.contractType as
            | 'erc20'
            | 'minimalErc20'
            | 'erc721'
            | 'minimalErc721'
            | 'nonErc'
            | 'erc1155'
        ].push(
          Helper.deploySmartContractsViaSdk(
            sdkClient,
            contractObject.bytecode,
            contractObject.ercConstructorParams,
            contractObject.contractType
          )
        );
      }
    }

    deployedAddresses.erc20 = await Promise.all(deployedAddresses.erc20);
    deployedAddresses.erc721 = await Promise.all(deployedAddresses.erc721);
    deployedAddresses.erc1155 = await Promise.all(deployedAddresses.erc1155);
    deployedAddresses.nonErc = await Promise.all(deployedAddresses.nonErc);
    deployedAddresses.minimalErc20 = await Promise.all(
      deployedAddresses.minimalErc20
    );
    deployedAddresses.minimalErc721 = await Promise.all(
      deployedAddresses.minimalErc721
    );

    await new Promise((r) => setTimeout(r, 500));

    return deployedAddresses;
  }
}
// Filename: tools/erc-repository-indexer/erc-contract-indexer/tests/unit/services/byteCodeAnalyzer.test.ts
// SPDX-License-Identifier: Apache-2.0

import {
  MirrorNodeContract,
  MirrorNodeContractResponse,
  ContractCallData,
} from '../../../src/schemas/MirrorNodeSchemas';
import { ByteCodeAnalyzer } from '../../../src/services/byteCodeAnalyzer';
import { ContractScannerService } from '../../../src/services/contractScanner';
import constants from '../../../src/utils/constants';
import testConstants from '../utils/constants';
import { jest } from '@jest/globals';

describe('ByteCodeAnalyzer', () => {
  let byteCodeAnalyzer: ByteCodeAnalyzer;
  let contractScannerService: ContractScannerService;
  const mockContracts: MirrorNodeContract[] = testConstants.MOCK_MN_CONTRACTS;
  const mockContractCallResponse = testConstants.MOCK_CONTRACT_CALL_RESPONSE;
  const mockValidMirrorNodeUrl = 'mock-mirror-node.com';
  const mockValidMirrorNodeUrlWeb3 = 'mock-mirror-node-web3.com';
  const mockScanningLimit = 39;

  beforeEach(() => {
    byteCodeAnalyzer = new ByteCodeAnalyzer();
    contractScannerService = new ContractScannerService(
      mockValidMirrorNodeUrl,
      mockValidMirrorNodeUrlWeb3,
      mockScanningLimit
    );
  });

  describe('categorizeERCContracts', () => {
    it('should categorize contracts into ERC20, ERC721, and ERC1155', async () => {
      const expectedErc20Object = {
        contractId: mockContracts[0].contract_id,
        address: mockContracts[0].evm_address,
        name: mockContractCallResponse.erc20.name.decodedValue,
        symbol: mockContractCallResponse.erc20.symbol.decodedValue,
        decimals: mockContractCallResponse.erc20.decimals.decodedValue,
        totalSupply: mockContractCallResponse.erc20.totalSupply.decodedValue,
      };
      const expectedErc721Object = {
        contractId: mockContracts[1].contract_id,
        address: mockContracts[1].evm_address,
        name: mockContractCallResponse.erc721.name.decodedValue,
        symbol: mockContractCallResponse.erc721.symbol.decodedValue,
      };
      const expectedErc1155Object = {
        contractId: mockContracts[2].contract_id,
        address: mockContracts[2].evm_address,
      };

      jest
        .spyOn(contractScannerService, 'fetchContractObject')
        .mockImplementation(async (contractId) => {
          if (contractId === '0.0.1013') {
            return {
              ...mockContracts[0],
              bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
              runtime_bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
            };
          } else if (contractId === '0.0.1014') {
            return {
              ...mockContracts[1],
              bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
              runtime_bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
            };
          } else if (contractId === '0.0.1015') {
            return {
              ...mockContracts[2],
              bytecode: testConstants.ERC_1155_BYTECODE_EXAMPLE,
              runtime_bytecode: testConstants.ERC_1155_BYTECODE_EXAMPLE,
            };
          }
          return null;
        });

      jest
        .spyOn(byteCodeAnalyzer, 'analyzeErcContract' as any)
        .mockImplementation(async (ercId) => {
          if (ercId === 'ERC20') {
            return expectedErc20Object;
          } else if (ercId === 'ERC721') {
            return expectedErc721Object;
          } else if (ercId === 'ERC1155') {
            return expectedErc1155Object;
          }
          return null;
        });

      const result = await byteCodeAnalyzer.categorizeERCContracts(
        contractScannerService,
        mockContracts
      );

      expect(result.erc20Contracts).toHaveLength(1);
      expect(result.erc721Contracts).toHaveLength(1);
      expect(result.erc1155Contracts).toHaveLength(1);
      expect(result.erc20Contracts[0]).toEqual(expectedErc20Object);
      expect(result.erc721Contracts[0]).toEqual(expectedErc721Object);
      expect(result.erc1155Contracts[0]).toEqual(expectedErc1155Object);
    });

    it('should skip contracts with missing data', async () => {
      // Mock the fetchContractObject method to return null
      jest
        .spyOn(contractScannerService, 'fetchContractObject')
        .mockResolvedValue(null);
      const result = await byteCodeAnalyzer.categorizeERCContracts(
        contractScannerService,
        mockContracts
      );
      expect(result.erc20Contracts).toHaveLength(0);
      expect(result.erc721Contracts).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(contractScannerService, 'fetchContractObject')
        .mockImplementation(async () => {
          throw new Error('Fetch error');
        });
      const result = await byteCodeAnalyzer.categorizeERCContracts(
        contractScannerService,
        mockContracts
      );
      expect(result.erc20Contracts).toHaveLength(0);
      expect(result.erc721Contracts).toHaveLength(0);
    });
  });

  describe('analyzeErcContract', () => {
    it('should return ERC20 token info for ERC20 contracts', async () => {
      const expectedTokenInfoObject = {
        contractId: mockContracts[0].contract_id,
        address: mockContracts[0].evm_address,
        name: mockContractCallResponse.erc20.name.decodedValue,
        symbol: mockContractCallResponse.erc20.symbol.decodedValue,
        decimals: mockContractCallResponse.erc20.decimals.decodedValue,
        totalSupply: mockContractCallResponse.erc20.totalSupply.decodedValue,
      };

      jest
        .spyOn(byteCodeAnalyzer, 'getErcTokenInfo' as any)
        .mockResolvedValueOnce(expectedTokenInfoObject);

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[0],
        bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).analyzeErcContract(
        'ERC20',
        mockContractResponse,
        contractScannerService,
        constants.ERC20_TOKEN_INFO_SELECTORS
      );

      expect(result).toEqual(expectedTokenInfoObject);
    });

    it('should return ERC721 token info for ERC721 contracts', async () => {
      const expectedTokenInfoObject = {
        contractId: mockContracts[1].contract_id,
        address: mockContracts[1].evm_address,
        name: mockContractCallResponse.erc721.name.decodedValue,
        symbol: mockContractCallResponse.erc721.symbol.decodedValue,
      };

      jest
        .spyOn(byteCodeAnalyzer, 'getErcTokenInfo' as any)
        .mockResolvedValueOnce(expectedTokenInfoObject);

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[1],
        bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).analyzeErcContract(
        'ERC721',
        mockContractResponse,
        contractScannerService,
        constants.ERC721_TOKEN_INFO_SELECTORS
      );

      expect(result).toEqual(expectedTokenInfoObject);
    });

    it('should return ERC1155 token info for ERC1155 contracts', async () => {
      const expectedTokenInfoObject = {
        contractId: mockContracts[2].contract_id,
        address: mockContracts[2].evm_address,
      };

      jest
        .spyOn(byteCodeAnalyzer, 'getErcTokenInfo' as any)
        .mockResolvedValueOnce(expectedTokenInfoObject);

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[2],
        bytecode: testConstants.ERC_1155_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_1155_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).analyzeErcContract(
        'ERC1155',
        mockContractResponse,
        contractScannerService,
        []
      );

      expect(result).toEqual(expectedTokenInfoObject);
    });

    it('should return null if the fails to get token info', async () => {
      jest
        .spyOn(byteCodeAnalyzer, 'getErcTokenInfo' as any)
        .mockRejectedValue(new Error('Mocked Error'));

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[1],
        bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).analyzeErcContract(
        'ERC721',
        mockContractResponse,
        contractScannerService,
        constants.ERC721_TOKEN_INFO_SELECTORS
      );

      expect(result).toBeNull();
    });
  });

  describe('getErcTokenInfo', () => {
    it('should return ERC20 token info for ERC20 contracts', async () => {
      jest
        .spyOn(contractScannerService, 'contractCallRequest')
        .mockImplementation(async (callData: ContractCallData) => {
          for (const field of [
            'name',
            'symbol',
            'decimals',
            'totalSupply',
          ] as const) {
            if (
              callData.data === mockContractCallResponse.erc20[field].sighash
            ) {
              return mockContractCallResponse.erc20[field].value;
            }
          }

          return null;
        });

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[0],
        bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_20_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).getErcTokenInfo(
        contractScannerService,
        mockContractResponse,
        constants.ERC20_TOKEN_INFO_SELECTORS
      );

      expect(result).toEqual({
        contractId: mockContracts[0].contract_id,
        address: mockContracts[0].evm_address,
        name: mockContractCallResponse.erc20.name.decodedValue,
        symbol: mockContractCallResponse.erc20.symbol.decodedValue,
        decimals: mockContractCallResponse.erc20.decimals.decodedValue,
        totalSupply: mockContractCallResponse.erc20.totalSupply.decodedValue,
      });
    });

    it('should return ERC721 token info for ERC721 contracts', async () => {
      jest
        .spyOn(contractScannerService, 'contractCallRequest')
        .mockImplementation(async (callData: ContractCallData) => {
          for (const field of ['name', 'symbol'] as const) {
            if (
              callData.data === mockContractCallResponse.erc721[field].sighash
            ) {
              return mockContractCallResponse.erc721[field].value;
            }
          }
          return null;
        });

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[1],
        bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
      };

      const result = await (byteCodeAnalyzer as any).getErcTokenInfo(
        contractScannerService,
        mockContractResponse,
        constants.ERC721_TOKEN_INFO_SELECTORS
      );

      expect(result).toEqual({
        contractId: mockContracts[1].contract_id,
        address: mockContracts[1].evm_address,
        name: mockContractCallResponse.erc721.name.decodedValue,
        symbol: mockContractCallResponse.erc721.symbol.decodedValue,
      });
    });

    it('should NOT throw an error if the contractCallRequest return null tokenInfoResponse', async () => {
      jest
        .spyOn(contractScannerService, 'contractCallRequest')
        .mockResolvedValue(null);

      const mockContractResponse: MirrorNodeContractResponse = {
        ...mockContracts[1],
        bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
        runtime_bytecode: testConstants.ERC_721_BYTECODE_EXAMPLE,
      };

      const tokenInfo = await (byteCodeAnalyzer as any).getErcTokenInfo(
        contractScannerService,
        mockContractResponse,
        constants.ERC721_TOKEN_INFO_SELECTORS
      );

      expect(tokenInfo).toEqual({
        contractId: mockContracts[1].contract_id,
        address: mockContracts[1].evm_address,
        name: null,
        symbol: null,
      });
    });
  });

  describe('isErc', () => {
    enum ERCID {
      ERC20 = 'ERC20',
      ERC721 = 'ERC721',
      ERC1155 = 'ERC1155',
    }
    const legitimateErc20Bytecode = testConstants.ERC_20_BYTECODE_EXAMPLE;
    const legitimateErc721Bytecode = testConstants.ERC_721_BYTECODE_EXAMPLE;
    const legitimateErc1155Bytecode = testConstants.ERC_1155_BYTECODE_EXAMPLE;
    const nonErcBytecode =
      '0x6080604081815260048036101561001557600080fd5b600092833560e01c90816301';

    it('should correctly identify ERC-20 contract bytecode based on the presence of the required ERC-20 selectors and events', () => {
      const shouldBeErc20 = (byteCodeAnalyzer as any).isErc(
        ERCID.ERC20,
        legitimateErc20Bytecode
      );

      const shouldNotBeErc20WithErc721Bytecode = (
        byteCodeAnalyzer as any
      ).isErc(ERCID.ERC20, legitimateErc721Bytecode);

      const shouldNotBeErc20WithNonErcBytecode = (
        byteCodeAnalyzer as any
      ).isErc(ERCID.ERC20, nonErcBytecode);

      expect(shouldBeErc20).toBe(true);
      expect(shouldNotBeErc20WithErc721Bytecode).toBe(false);
      expect(shouldNotBeErc20WithNonErcBytecode).toBe(false);
    });

    it('should correctly identify ERC-721 contract bytecode based on the presence of the required ERC-721 selectors and events', () => {
      const shouldBeErc721 = (byteCodeAnalyzer as any).isErc(
        ERCID.ERC721,
        legitimateErc721Bytecode
      );

      const shouldNotBeErc20WithErc20Bytecode = (byteCodeAnalyzer as any).isErc(
        ERCID.ERC721,
        legitimateErc20Bytecode
      );

      const shouldNotBeErc721WithNonErcBytecode = (
        byteCodeAnalyzer as any
      ).isErc(ERCID.ERC721, nonErcBytecode);

      expect(shouldBeErc721).toBe(true);
      expect(shouldNotBeErc20WithErc20Bytecode).toBe(false);
      expect(shouldNotBeErc721WithNonErcBytecode).toBe(false);
    });

    it('should correctly identify ERC-1155 contract bytecode based on the presence of the required ERC-1155 selectors and events', () => {
      const shouldBeErc1155 = (byteCodeAnalyzer as any).isErc(
        ERCID.ERC1155,
        legitimateErc1155Bytecode
      );

      const shouldNotBeErc721WithNonErcBytecode = (
        byteCodeAnalyzer as any
      ).isErc(ERCID.ERC1155, nonErcBytecode);

      expect(shouldBeErc1155).toBe(true);
      expect(shouldNotBeErc721WithNonErcBytecode).toBe(false);
    });

    it('should perform isErc method within a very small time threshold compared to regular regex-based searching', () => {
      // official isErc() method with Aho-Corasick algorithm
      const startTime = performance.now();
      const largeByteCode = '0x' + '00'.repeat(41120); // ~20KB

      // perform signature matching through official isErc() method
      (byteCodeAnalyzer as any).isErc(ERCID.ERC20, largeByteCode);

      const endTime = performance.now();
      const elapsedTime = endTime - startTime;
      const performanceThreshold = 3; // 3 milliseconds
      expect(elapsedTime).toBeLessThan(performanceThreshold);

      // regex-based approach
      const startTimeRegex = performance.now();
      const exampleErc721RegexPattern =
        /(?=.*dd62ed3e)(?=.*095ea7b3)(?=.*70a08231)(?=.*18160ddd)(?=.*a9059cbb)(?=.*23b872dd)(?=.*8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925)(?=.*ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef)/;
      exampleErc721RegexPattern.test(largeByteCode);
      const endTimeRegex = performance.now();
      const elapsedTimeRegex = endTimeRegex - startTimeRegex;
      const performanceThresholdRegex = 3600; // 3600 milliseconds
      expect(elapsedTimeRegex).toBeGreaterThan(performanceThresholdRegex);
    });
  });
});
// Filename: tools/erc-repository-indexer/erc-contract-indexer/tests/unit/services/config.test.ts
// SPDX-License-Identifier: Apache-2.0

import { AxiosInstance } from 'axios';
import { ConfigService } from '../../../src/services/config';
import testConstants from '../utils/constants';
import { RegistryGenerator } from '../../../src/services/registryGenerator';
import { Helper } from '../../../src/utils/helper';
import constants from '../../../src/utils/constants';

describe('ConfigService', () => {
  let configService: ConfigService;
  const mockValidHederaNetwork = `testnet`;
  const mockValidMirrorNodeUrl = 'https://testnet.mirrornode.hedera.com';
  const mockContractId = testConstants.MOCK_MN_CONTRACTS[0].contract_id;
  const mockContractEvmAddress = testConstants.MOCK_MN_CONTRACTS[0].evm_address;
  const mockStartingPoint = `/api/v1/contracts?limit=100&order=asc&contract.id=gte:${mockContractId}`;
  const registryGenerator = new RegistryGenerator();

  beforeEach(() => {
    // Reset environment variables before each test
    delete process.env.HEDERA_NETWORK;
    delete process.env.STARTING_POINT;
    delete process.env.MIRROR_NODE_URL;

    jest.spyOn(Helper, 'buildAxiosClient').mockReturnValue({
      mirrorNodeRestClient: {
        get: jest
          .fn()
          .mockResolvedValue({ data: { contract_id: mockContractId } }),
      } as any,
      mirrorNodeWeb3Client: {} as jest.Mocked<AxiosInstance>,
    });
  });

  it('should get the correct configurations', () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    process.env.MIRROR_NODE_URL_WEB3 = mockValidMirrorNodeUrl;
    const configService = new ConfigService();

    expect(configService.getNetwork()).toEqual(mockValidHederaNetwork);
    expect(configService.getMirrorNodeUrl()).toEqual(mockValidMirrorNodeUrl);
    expect(configService.getMirrorNodeUrlWeb3()).toEqual(
      mockValidMirrorNodeUrl
    );
  });

  it('should not throw error even if MIRROR_NODE_URL_WEB3 is not set', () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    delete process.env.MIRROR_NODE_URL_WEB3;

    const configService = new ConfigService();

    expect(configService.getMirrorNodeUrlWeb3()).toEqual('');
  });

  it('should throw an error when HEDERA_NETWORK is not configured', () => {
    expect(() => {
      configService = new ConfigService();
    }).toThrow(/HEDERA_NETWORK Is Not Properly Configured/);
  });

  it('should throw an error if HEDERA_NETWORK is invalid', () => {
    process.env.HEDERA_NETWORK = 'invalid_network';
    expect(() => {
      configService = new ConfigService();
    }).toThrow(/HEDERA_NETWORK Is Not Properly Configured/);
  });

  it('should throw an error if MIRROR_NODE_URL is not configured', () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    expect(() => {
      configService = new ConfigService();
    }).toThrow(/MIRROR_NODE_URL Is Not Properly Configured/);
  });

  it('should throw an error if MIRROR_NODE_URL is invalid', () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = 'invalid_url';
    expect(() => {
      configService = new ConfigService();
    }).toThrow(/MIRROR_NODE_URL Is Not Properly Configured/);
  });

  it('should not throw an error if MIRROR_NODE_URL is invalid when network is not one of the PRODUCTION_NETWORKS', () => {
    const localnode = 'local-node';
    expect(constants.PRODUCTION_NETWORKS.includes(localnode)).toBeFalsy;

    const invalid_url = 'invalid_url';
    process.env.HEDERA_NETWORK = localnode;
    process.env.MIRROR_NODE_URL = invalid_url;
    const configService = new ConfigService();
    expect(configService.getMirrorNodeUrl()).toEqual(invalid_url);
  });

  it('should not throw an error if HEDERA_NETWORK and MIRROR_NODE_URL are valid', () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    configService = new ConfigService();
    expect(configService.getNetwork()).toBe(mockValidHederaNetwork);
  });

  it('should throw an error if STARTING_POINT is invalid', () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    process.env.STARTING_POINT = 'invalid_starting_point';
    expect(() => {
      configService = new ConfigService();
    }).toThrow(/STARTING_POINT Is Not Properly Configured/);
  });

  it('should resolve starting point from contract ID', async () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    process.env.STARTING_POINT = mockContractId;

    configService = new ConfigService();
    const startingPoint =
      await configService.resolveStartingPoint(registryGenerator);
    expect(startingPoint).toBe(mockStartingPoint);
  });

  it('should resolve starting point from EVM address', async () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    process.env.STARTING_POINT = mockContractEvmAddress;

    configService = new ConfigService();
    const startingPoint =
      await configService.resolveStartingPoint(registryGenerator);
    expect(startingPoint).toBe(mockStartingPoint);
  });

  it('should resolve starting point from get contracts list next pointer', async () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    process.env.STARTING_POINT = mockStartingPoint;

    configService = new ConfigService();
    const startingPoint =
      await configService.resolveStartingPoint(registryGenerator);

    expect(startingPoint).toBe(process.env.STARTING_POINT);
  });

  it('should resolve starting point from storage if available', async () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    process.env.STARTING_POINT = '';

    // Mock the retrieveNextPointer method to return a valid pointer
    const mockRetrieveNextPointer = jest
      .spyOn(registryGenerator, 'retrieveNextPointer')
      .mockResolvedValue(mockStartingPoint);

    configService = new ConfigService();
    const startingPoint =
      await configService.resolveStartingPoint(registryGenerator);

    expect(startingPoint).toBe(mockStartingPoint);
    expect(mockRetrieveNextPointer).toHaveBeenCalled();
  });
  it('should return default value for detectionOnly, false, if ENABLE_DETECTION_ONLY is not set', () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    delete process.env.ENABLE_DETECTION_ONLY;

    const configService = new ConfigService();
    expect(configService.getDetectionOnly()).toEqual(false);
  });

  it('should return preconfigured value for detectionOnly if ENABLE_DETECTION_ONLY is provided', () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    process.env.ENABLE_DETECTION_ONLY = 'true';

    const configService = new ConfigService();
    expect(configService.getDetectionOnly()).toEqual(true);
  });

  it('should return false for detectionOnly when ENABLE_DETECTION_ONLY is not explicitly set to true', () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    process.env.ENABLE_DETECTION_ONLY = 'not a boolean value';

    const configService = new ConfigService();
    expect(configService.getDetectionOnly()).toEqual(false);
  });

  it('should return default value, 100, if SCAN_CONTRACT_LIMIT is undefined', async () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;
    delete process.env.SCAN_CONTRACT_LIMIT;

    const configService = new ConfigService();

    expect(configService.getScanContractLimit()).toEqual(100);
  });

  it('should return dynamic SCAN_CONTRACT_LIMIT value', async () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;

    const expectedLimit = 36;
    process.env.SCAN_CONTRACT_LIMIT = expectedLimit.toString();

    const configService = new ConfigService();

    expect(configService.getScanContractLimit()).toEqual(expectedLimit);
  });

  it('should throw an error if SCAN_CONTRACT_LIMIT is set to invalid values', async () => {
    process.env.HEDERA_NETWORK = mockValidHederaNetwork;
    process.env.MIRROR_NODE_URL = mockValidMirrorNodeUrl;

    const invalidLimits = ['-3', '369', 'not a number'];
    invalidLimits.forEach((limit) => {
      process.env.SCAN_CONTRACT_LIMIT = limit;

      expect(() => {
        configService = new ConfigService();
      }).toThrow(/SCAN_CONTRACT_LIMIT Is Not Properly Configured/);
    });
  });
});
// Filename: tools/erc-repository-indexer/erc-contract-indexer/tests/unit/services/contractScanner.test.ts
// SPDX-License-Identifier: Apache-2.0

import axios from 'axios';
import constants from '../../../src/utils/constants';
import testConstants from '../utils/constants';
import { MirrorNodeContract } from '../../../src/schemas/MirrorNodeSchemas';
import { ContractScannerService } from '../../../src/services/contractScanner';
import { Helper } from '../../../src/utils/helper';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

jest.mock('axios');
jest.mock('../../../src/utils/helper');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedHelper = Helper as jest.Mocked<typeof Helper>;

describe('ContractScannerService', () => {
  const mockValidMirrorNodeUrl = 'mock-mirror-node.com';
  const mockValidMirrorNodeUrlWeb3 = 'mock-mirror-node-web3.com';
  const mockScanningLimit = 39;

  let contractScannerService: ContractScannerService;

  beforeEach(() => {
    mockedHelper.buildAxiosClient.mockReturnValue({
      mirrorNodeRestClient: mockedAxios,
      mirrorNodeWeb3Client: mockedAxios,
    });

    contractScannerService = new ContractScannerService(
      mockValidMirrorNodeUrl,
      mockValidMirrorNodeUrlWeb3,
      mockScanningLimit
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchContracts', () => {
    const mockContracts: MirrorNodeContract[] = testConstants.MOCK_MN_CONTRACTS;

    it('should fetch contracts successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { contracts: mockContracts },
      });

      const contracts = await contractScannerService.fetchContracts();
      expect(contracts?.contracts).toEqual(mockContracts);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should return null when there is an error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));
      const contracts = await contractScannerService.fetchContracts();
      expect(contracts).toBeNull();
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should retry fetching contracts on rate limit error', async () => {
      mockedAxios.get
        .mockRejectedValueOnce({ response: { status: 429 } }) // First call returns rate limit error
        .mockResolvedValueOnce({ data: { contracts: mockContracts } }); // Second call succeeds

      mockedHelper.wait.mockResolvedValueOnce(undefined);
      const contractsPromise = contractScannerService.fetchContracts();
      const contracts = await contractsPromise;

      expect(contracts?.contracts).toEqual(mockContracts);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchContractObject', () => {
    const contractId = '0.0.1013';
    const mockBytecode = '0x1234567890abcdef';

    it('should fetch contract bytecode successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { runtime_bytecode: mockBytecode },
      });

      const contractObject =
        await contractScannerService.fetchContractObject(contractId);

      expect(contractObject?.runtime_bytecode).toEqual(mockBytecode);
      expect(axios.get).toHaveBeenCalledWith(
        constants.GET_CONTRACT_ENDPOINT + '/' + contractId
      );
    });

    it('should return null when there is an error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      const contractObject =
        await contractScannerService.fetchContractObject(contractId);

      expect(contractObject).toBeNull();
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should retry fetching bytecode on rate limit error', async () => {
      mockedAxios.get
        .mockRejectedValueOnce({ response: { status: 429 } }) // First call returns rate limit error
        .mockResolvedValueOnce({ data: { runtime_bytecode: mockBytecode } }); // Second call succeeds
      mockedHelper.wait.mockResolvedValueOnce(undefined);

      const contractObject =
        await contractScannerService.fetchContractObject(contractId);

      expect(contractObject?.runtime_bytecode).toEqual(mockBytecode);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('contractCallRequest', () => {
    const callData = {
      data: testConstants.MOCK_CONTRACT_CALL_RESPONSE.erc20.name.sighash,
      to: testConstants.MOCK_MN_CONTRACTS[0].evm_address,
    };

    it('should send a contract call request successfully', async () => {
      const mockResponse = { result: '0xabcdef' };
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await contractScannerService.contractCallRequest(callData);

      expect(result).toEqual(mockResponse.result);
      expect(axios.post).toHaveBeenCalledWith(
        constants.CONTRACT_CALL_ENDPOINT,
        callData
      );
    });

    it('should return null when there is an error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network Error'));

      const result = await contractScannerService.contractCallRequest(callData);

      expect(result).toBeNull();
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('should retry on rate limit error', async () => {
      mockedAxios.post
        .mockRejectedValueOnce({ response: { status: 429 } }) // First call returns rate limit error
        .mockResolvedValueOnce({ data: { result: '0xabcdef' } }); // Second call succeeds

      mockedHelper.wait.mockResolvedValueOnce(undefined);
      const result = await contractScannerService.contractCallRequest(callData);

      expect(result).toEqual('0xabcdef');
      expect(axios.post).toHaveBeenCalledTimes(2);
    });
  });
});
// Filename: tools/erc-repository-indexer/erc-contract-indexer/tests/unit/services/registryGenerator.test.ts
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { RegistryGenerator } from '../../../src/services/registryGenerator';
import { ERCOutputInterface } from '../../../src/schemas/ERCRegistrySchemas';
import constants from '../../../src/utils/constants';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
  },
}));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('RegistryGenerator', () => {
  let registry: RegistryGenerator;
  const mockERC20Path = constants.ERC_20_JSON_FILE_NAME;

  const mockContractA: ERCOutputInterface[] = [
    { contractId: '123', address: '0x123' },
  ];
  const mockContractB: ERCOutputInterface[] = [
    { contractId: '456', address: '0x456' },
  ];
  const mockContractC: ERCOutputInterface[] = [
    { contractId: '789', address: '0x789' },
  ];
  const mockNextPointerPath =
    constants.GET_CONTRACTS_LIST_NEXT_POINTER_JSON_FILE_NAME;

  beforeEach(() => {
    registry = new RegistryGenerator();

    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify(mockContractA)
    );
    (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  describe('generateErcRegistry', () => {
    it('should call updateRegistry for ERC20, ERC721, and ERC1155 paths', async () => {
      const updateRegistrySpy = jest.spyOn<any, any>(
        registry,
        'updateRegistry'
      );

      await registry.generateErcRegistry(
        mockContractA,
        mockContractB,
        mockContractC
      );

      expect(updateRegistrySpy).toHaveBeenCalledTimes(3);
      expect(updateRegistrySpy).toHaveBeenCalledWith(
        registry['erc20JsonFilePath'],
        mockContractA
      );
      expect(updateRegistrySpy).toHaveBeenCalledWith(
        registry['erc721JsonFilePath'],
        mockContractB
      );
      expect(updateRegistrySpy).toHaveBeenCalledWith(
        registry['erc1155JsonFilePath'],
        mockContractC
      );
    });

    it('should not call updateRegistry if no contracts are provided', async () => {
      const updateRegistrySpy = jest.spyOn<any, any>(
        registry,
        'updateRegistry'
      );

      await registry.generateErcRegistry([], [], []);

      expect(updateRegistrySpy).not.toHaveBeenCalled();
    });
  });

  describe('readContentsFromFile', () => {
    it('should return an empty array if file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = registry['readContentsFromFile'](mockERC20Path);

      expect(result).toEqual('');
    });

    it('should parse JSON from file successfully', () => {
      const mockData = mockContractA;
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      const result = registry['readContentsFromFile'](mockERC20Path);

      expect(JSON.parse(result)).toEqual(mockData);
    });

    it('should throw error when file read fails', () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      expect(() => registry['readContentsFromFile'](mockERC20Path)).toThrow(
        'Read error'
      );
    });
  });

  describe('writeContentsToFile', () => {
    it('should create directories and write contracts to file', async () => {
      const mockContracts: ERCOutputInterface[] = mockContractA;

      await registry['writeContentsToFile'](mockERC20Path, mockContracts);

      expect(mockedFs.promises.mkdir).toHaveBeenCalledWith(
        path.dirname(mockERC20Path),
        { recursive: true }
      );
      expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
        mockERC20Path,
        JSON.stringify(mockContracts, null, 2)
      );
    });

    it('should throw error when write fails', async () => {
      jest
        .spyOn(mockedFs.promises, 'writeFile')
        .mockRejectedValue(new Error('Write error'));

      await expect(
        registry['writeContentsToFile'](mockERC20Path, mockContractA)
      ).rejects.toThrow('Write error');
    });
  });

  describe('updateRegistry', () => {
    it('should remove duplicates and write unique contracts to file', async () => {
      const existingContracts: ERCOutputInterface[] = mockContractA;
      const newContracts: ERCOutputInterface[] = [
        mockContractA[0],
        mockContractB[0],
      ];

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingContracts));

      await registry['updateRegistry'](mockERC20Path, newContracts);

      const expectedContracts = [mockContractA[0], mockContractB[0]];
      expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
        mockERC20Path,
        JSON.stringify(expectedContracts, null, 2)
      );
    });
  });

  describe('updateNextPointer', () => {
    it('should write the next pointer to the file if it is not null', async () => {
      await registry.updateNextPointer(mockNextPointerPath);

      expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
        registry['nextPointerFilePath'],
        JSON.stringify(mockNextPointerPath, null, 2)
      );
    });

    it('should not write to the file if the next pointer is null', async () => {
      await registry.updateNextPointer(null);

      expect(mockedFs.promises.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('retrieveNextPointer', () => {
    it('should return null if the file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await registry.retrieveNextPointer();

      expect(result).toBeNull();
    });

    it('should return the next pointer from the file', async () => {
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify(mockNextPointerPath)
      );

      const result = await registry.retrieveNextPointer();

      expect(result).toBe(mockNextPointerPath);
    });

    it('should return null if the file is empty', async () => {
      mockedFs.readFileSync.mockReturnValue('');

      const result = await registry.retrieveNextPointer();

      expect(result).toBeNull();
    });
  });
});
// Filename: tools/erc-repository-indexer/erc-contract-indexer/tests/unit/utils/constants.ts
// SPDX-License-Identifier: Apache-2.0

export default {
  MOCK_HEDERA_NETWORK: 'MOCK_HEDERA_NETWORK',
  MOCK_MN_CONTRACTS: [
    {
      admin_key: {},
      auto_renew_account: null,
      auto_renew_period: 7776000,
      contract_id: '0.0.1013',
      created_timestamp: '1732323370.357439918',
      deleted: false,
      evm_address: '0x00000000000000000000000000000000000003f5',
      expiration_timestamp: '1740099370.357439918',
      file_id: '0.0.1012',
      max_automatic_token_associations: 0,
      memo: 'cellar door',
      nonce: 1,
      obtainer_id: null,
      permanent_removal: null,
      proxy_account_id: null,
      timestamp: {},
    },
    {
      admin_key: {},
      auto_renew_account: null,
      auto_renew_period: 7776000,
      contract_id: '0.0.1014',
      created_timestamp: '1732323370.357439918',
      deleted: false,
      evm_address: '0x00000000000000000000000000000000000003f6',
      expiration_timestamp: '1740099370.357439918',
      file_id: '0.0.1012',
      max_automatic_token_associations: 0,
      memo: 'cellar door',
      nonce: 1,
      obtainer_id: null,
      permanent_removal: null,
      proxy_account_id: null,
      timestamp: {},
    },
    {
      admin_key: {},
      auto_renew_account: null,
      auto_renew_period: 7776000,
      contract_id: '0.0.1015',
      created_timestamp: '1732323370.357439918',
      deleted: false,
      evm_address: '0x00000000000000000000000000000000000003f7',
      expiration_timestamp: '1740099370.357439918',
      file_id: '0.0.1012',
      max_automatic_token_associations: 0,
      memo: 'cellar door',
      nonce: 1,
      obtainer_id: null,
      permanent_removal: null,
      proxy_account_id: null,
      timestamp: {},
    },
  ],
  ERC_20_BYTECODE_EXAMPLE:
    '0x608060405234801561001057600080fd5b50600436106100f55760003560e01c806340c10f19116100975780639dc29fac116100665780639dc29fac146101ee578063a457c2d714610201578063a9059cbb14610214578063dd62ed3e1461022757600080fd5b806340c10f191461019757806356189cb4146101aa57806370a08231146101bd57806395d89b41146101e657600080fd5b8063222f5be0116100d3578063222f5be01461014d57806323b872dd14610162578063313ce56714610175578063395093511461018457600080fd5b806306fdde03146100fa578063095ea7b31461011857806318160ddd1461013b575b600080fd5b61010261023a565b60405161010f91906109ba565b60405180910390f35b61012b610126366004610a2b565b6102cc565b604051901515815260200161010f565b6002545b60405190815260200161010f565b61016061015b366004610a55565b6102e4565b005b61012b610170366004610a55565b6102f4565b6040516012815260200161010f565b61012b610192366004610a2b565b610318565b6101606101a5366004610a2b565b61033a565b6101606101b8366004610a55565b610348565b61013f6101cb366004610a91565b6001600160a01b031660009081526020819052604090205490565b610102610353565b6101606101fc366004610a2b565b610362565b61012b61020f366004610a2b565b61036c565b61012b610222366004610a2b565b6103ec565b61013f610235366004610ab3565b6103fa565b60606003805461024990610ae6565b80601f016020809104026020016040519081016040528092919081815260200182805461027590610ae6565b80156102c25780601f10610297576101008083540402835291602001916102c2565b820191906000526020600020905b8154815290600101906020018083116102a557829003601f168201915b5050505050905090565b6000336102da818585610425565b5060019392505050565b6102ef838383610549565b505050565b600033610302858285610719565b61030d858585610549565b506001949350505050565b6000336102da81858561032b83836103fa565b6103359190610b36565b610425565b610344828261078d565b5050565b6102ef838383610425565b60606004805461024990610ae6565b610344828261086c565b6000338161037a82866103fa565b9050838110156103df5760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b60648201526084015b60405180910390fd5b61030d8286868403610425565b6000336102da818585610549565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6001600160a01b0383166104875760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b60648201526084016103d6565b6001600160a01b0382166104e85760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b60648201526084016103d6565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b6001600160a01b0383166105ad5760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b60648201526084016103d6565b6001600160a01b03821661060f5760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b60648201526084016103d6565b6001600160a01b038316600090815260208190526040902054818110156106875760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b60648201526084016103d6565b6001600160a01b038085166000908152602081905260408082208585039055918516815290812080548492906106be908490610b36565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161070a91815260200190565b60405180910390a35b50505050565b600061072584846103fa565b9050600019811461071357818110156107805760405162461bcd60e51b815260206004820152601d60248201527f45524332303a20696e73756666696369656e7420616c6c6f77616e636500000060448201526064016103d6565b6107138484848403610425565b6001600160a01b0382166107e35760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f20616464726573730060448201526064016103d6565b80600260008282546107f59190610b36565b90915550506001600160a01b03821660009081526020819052604081208054839290610822908490610b36565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b6001600160a01b0382166108cc5760405162461bcd60e51b815260206004820152602160248201527f45524332303a206275726e2066726f6d20746865207a65726f206164647265736044820152607360f81b60648201526084016103d6565b6001600160a01b038216600090815260208190526040902054818110156109405760405162461bcd60e51b815260206004820152602260248201527f45524332303a206275726e20616d6f756e7420657863656564732062616c616e604482015261636560f01b60648201526084016103d6565b6001600160a01b038316600090815260208190526040812083830390556002805484929061096f908490610b4e565b90915550506040518281526000906001600160a01b038516907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a3505050565b600060208083528351808285015260005b818110156109e7578581018301518582016040015282016109cb565b818111156109f9576000604083870101525b50601f01601f1916929092016040019392505050565b80356001600160a01b0381168114610a2657600080fd5b919050565b60008060408385031215610a3e57600080fd5b610a4783610a0f565b946020939093013593505050565b600080600060608486031215610a6a57600080fd5b610a7384610a0f565b9250610a8160208501610a0f565b9150604084013590509250925092565b600060208284031215610aa357600080fd5b610aac82610a0f565b9392505050565b60008060408385031215610ac657600080fd5b610acf83610a0f565b9150610add60208401610a0f565b90509250929050565b600181811c90821680610afa57607f821691505b602082108103610b1a57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fd5b60008219821115610b4957610b49610b20565b500190565b600082821015610b6057610b60610b20565b50039056fea264697066735822122062e84cb8f44c4c035bb08b344b04b097859a13109c006676ce804cd4dee3465b64736f6c634300080d0033',
  ERC_721_BYTECODE_EXAMPLE:
    '0x608060405234801561000f575f80fd5b50600436106100e5575f3560e01c80636352211e11610088578063a22cb46511610063578063a22cb465146101db578063b88d4fde146101ee578063c87b56dd14610201578063e985e9c514610214575f80fd5b80636352211e1461019f57806370a08231146101b257806395d89b41146101d3575f80fd5b8063095ea7b3116100c3578063095ea7b31461015157806323b872dd1461016657806340c10f191461017957806342842e0e1461018c575f80fd5b806301ffc9a7146100e957806306fdde0314610111578063081812fc14610126575b5f80fd5b6100fc6100f7366004610c22565b61024f565b60405190151581526020015b60405180910390f35b6101196102a0565b6040516101089190610c8a565b610139610134366004610c9c565b61032f565b6040516001600160a01b039091168152602001610108565b61016461015f366004610cce565b610356565b005b610164610174366004610cf6565b610365565b610164610187366004610cce565b6103f3565b61016461019a366004610cf6565b6103fd565b6101396101ad366004610c9c565b61041c565b6101c56101c0366004610d2f565b610426565b604051908152602001610108565b61011961046b565b6101646101e9366004610d48565b61047a565b6101646101fc366004610d95565b610485565b61011961020f366004610c9c565b61049c565b6100fc610222366004610e6a565b6001600160a01b039182165f90815260056020908152604080832093909416825291909152205460ff1690565b5f6001600160e01b031982166380ac58cd60e01b148061027f57506001600160e01b03198216635b5e139f60e01b145b8061029a57506301ffc9a760e01b6001600160e01b03198316145b92915050565b60605f80546102ae90610e9b565b80601f01602080910402602001604051908101604052809291908181526020018280546102da90610e9b565b80156103255780601f106102fc57610100808354040283529160200191610325565b820191905f5260205f20905b81548152906001019060200180831161030857829003601f168201915b5050505050905090565b5f6103398261050d565b505f828152600460205260409020546001600160a01b031661029a565b610361828233610545565b5050565b6001600160a01b03821661039357604051633250574960e11b81525f60048201526024015b60405180910390fd5b5f61039f838333610552565b9050836001600160a01b0316816001600160a01b0316146103ed576040516364283d7b60e01b81526001600160a01b038086166004830152602482018490528216604482015260640161038a565b50505050565b6103618282610651565b61041783838360405180602001604052805f815250610485565b505050565b5f61029a8261050d565b5f6001600160a01b038216610450576040516322718ad960e21b81525f600482015260240161038a565b506001600160a01b03165f9081526003602052604090205490565b6060600180546102ae90610e9b565b6103613383836106b2565b610490848484610365565b6103ed84848484610750565b60606104a78261050d565b505f6104bd60408051602081019091525f815290565b90505f8151116104db5760405180602001604052805f815250610506565b806104e584610876565b6040516020016104f6929190610ed3565b6040516020818303038152906040525b9392505050565b5f818152600260205260408120546001600160a01b03168061029a57604051637e27328960e01b81526004810184905260240161038a565b6104178383836001610913565b5f828152600260205260408120546001600160a01b039081169083161561057e5761057e818486610a42565b6001600160a01b038116156105b8576105995f855f80610913565b6001600160a01b0381165f90815260036020526040902080545f190190555b6001600160a01b038516156105e6576001600160a01b0385165f908152600360205260409020805460010190555b5f84815260026020526040808220805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0389811691821790925591518793918516917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef91a4949350505050565b6001600160a01b03821661067a57604051633250574960e11b81525f600482015260240161038a565b5f61068683835f610552565b90506001600160a01b03811615610417576040516339e3563760e11b81525f600482015260240161038a565b6001600160a01b0382166106e457604051630b61174360e31b81526001600160a01b038316600482015260240161038a565b6001600160a01b038381165f81815260056020908152604080832094871680845294825291829020805460ff191686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b6001600160a01b0383163b156103ed57604051630a85bd0160e11b81526001600160a01b0384169063150b7a0290610792903390889087908790600401610f01565b6020604051808303815f875af19250505080156107cc575060408051601f3d908101601f191682019092526107c991810190610f3c565b60015b610833573d8080156107f9576040519150601f19603f3d011682016040523d82523d5f602084013e6107fe565b606091505b5080515f0361082b57604051633250574960e11b81526001600160a01b038516600482015260240161038a565b805181602001fd5b6001600160e01b03198116630a85bd0160e11b1461086f57604051633250574960e11b81526001600160a01b038516600482015260240161038a565b5050505050565b60605f61088283610aa6565b60010190505f8167ffffffffffffffff8111156108a1576108a1610d81565b6040519080825280601f01601f1916602001820160405280156108cb576020820181803683370190505b5090508181016020015b5f19017f3031323334353637383961626364656600000000000000000000000000000000600a86061a8153600a85049450846108d557509392505050565b808061092757506001600160a01b03821615155b15610a06575f6109368461050d565b90506001600160a01b038316158015906109625750826001600160a01b0316816001600160a01b031614155b801561099357506001600160a01b038082165f9081526005602090815260408083209387168352929052205460ff16155b156109bc5760405163a9fbf51f60e01b81526001600160a01b038416600482015260240161038a565b8115610a045783856001600160a01b0316826001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560405160405180910390a45b505b50505f908152600460205260409020805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0392909216919091179055565b610a4d838383610b87565b610417576001600160a01b038316610a7b57604051637e27328960e01b81526004810182905260240161038a565b60405163177e802f60e01b81526001600160a01b03831660048201526024810182905260440161038a565b5f807a184f03e93ff9f4daa797ed6e38ed64bf6a1f0100000000000000008310610aee577a184f03e93ff9f4daa797ed6e38ed64bf6a1f010000000000000000830492506040015b6d04ee2d6d415b85acef81000000008310610b1a576d04ee2d6d415b85acef8100000000830492506020015b662386f26fc100008310610b3857662386f26fc10000830492506010015b6305f5e1008310610b50576305f5e100830492506008015b6127108310610b6457612710830492506004015b60648310610b76576064830492506002015b600a831061029a5760010192915050565b5f6001600160a01b03831615801590610c025750826001600160a01b0316846001600160a01b03161480610bdf57506001600160a01b038085165f9081526005602090815260408083209387168352929052205460ff165b80610c0257505f828152600460205260409020546001600160a01b038481169116145b949350505050565b6001600160e01b031981168114610c1f575f80fd5b50565b5f60208284031215610c32575f80fd5b813561050681610c0a565b5f5b83811015610c57578181015183820152602001610c3f565b50505f910152565b5f8151808452610c76816020860160208601610c3d565b601f01601f19169290920160200192915050565b602081525f6105066020830184610c5f565b5f60208284031215610cac575f80fd5b5035919050565b80356001600160a01b0381168114610cc9575f80fd5b919050565b5f8060408385031215610cdf575f80fd5b610ce883610cb3565b946020939093013593505050565b5f805f60608486031215610d08575f80fd5b610d1184610cb3565b9250610d1f60208501610cb3565b9150604084013590509250925092565b5f60208284031215610d3f575f80fd5b61050682610cb3565b5f8060408385031215610d59575f80fd5b610d6283610cb3565b915060208301358015158114610d76575f80fd5b809150509250929050565b634e487b7160e01b5f52604160045260245ffd5b5f805f8060808587031215610da8575f80fd5b610db185610cb3565b9350610dbf60208601610cb3565b925060408501359150606085013567ffffffffffffffff80821115610de2575f80fd5b818701915087601f830112610df5575f80fd5b813581811115610e0757610e07610d81565b604051601f8201601f19908116603f01168101908382118183101715610e2f57610e2f610d81565b816040528281528a6020848701011115610e47575f80fd5b826020860160208301375f60208483010152809550505050505092959194509250565b5f8060408385031215610e7b575f80fd5b610e8483610cb3565b9150610e9260208401610cb3565b90509250929050565b600181811c90821680610eaf57607f821691505b602082108103610ecd57634e487b7160e01b5f52602260045260245ffd5b50919050565b5f8351610ee4818460208801610c3d565b835190830190610ef8818360208801610c3d565b01949350505050565b5f6001600160a01b03808716835280861660208401525083604083015260806060830152610f326080830184610c5f565b9695505050505050565b5f60208284031215610f4c575f80fd5b815161050681610c0a56fea26469706673582212201c3f43711bdbae92c86c5f31bc94cb0310652d089b0efba65e34230f0d67962d64736f6c63430008180033',
  ERC_1155_BYTECODE_EXAMPLE:
    '0x608060405234801561000f575f80fd5b506004361061009a575f3560e01c80634e1273f4116100635780634e1273f41461012f578063731133e91461014f578063a22cb46514610162578063e985e9c514610175578063f242432a146101b0575f80fd5b8062fdd58e1461009e57806301ffc9a7146100c45780630e89341c146100e75780631f7fdffa146101075780632eb2c2d61461011c575b5f80fd5b6100b16100ac366004610b65565b6101c3565b6040519081526020015b60405180910390f35b6100d76100d2366004610ba5565b6101ea565b60405190151581526020016100bb565b6100fa6100f5366004610bc7565b610239565b6040516100bb9190610c21565b61011a610115366004610d73565b6102cb565b005b61011a61012a366004610e06565b6102dd565b61014261013d366004610ea9565b610367565b6040516100bb9190610f9d565b61011a61015d366004610faf565b610432565b61011a610170366004611000565b61043e565b6100d7610183366004611039565b6001600160a01b039182165f90815260016020908152604080832093909416825291909152205460ff1690565b61011a6101be36600461106a565b61044d565b5f818152602081815260408083206001600160a01b03861684529091529020545b92915050565b5f6001600160e01b03198216636cdb3d1360e11b148061021a57506001600160e01b031982166303a24d0760e21b145b806101e457506301ffc9a760e01b6001600160e01b03198316146101e4565b606060028054610248906110ca565b80601f0160208091040260200160405190810160405280929190818152602001828054610274906110ca565b80156102bf5780601f10610296576101008083540402835291602001916102bf565b820191905f5260205f20905b8154815290600101906020018083116102a257829003601f168201915b50505050509050919050565b6102d7848484846104ca565b50505050565b336001600160a01b038616811480159061031c57506001600160a01b038087165f9081526001602090815260408083209385168352929052205460ff16155b156103525760405163711bec9160e11b81526001600160a01b038083166004830152871660248201526044015b60405180910390fd5b61035f8686868686610500565b505050505050565b606081518351146103985781518351604051635b05999160e01b815260048101929092526024820152604401610349565b5f835167ffffffffffffffff8111156103b3576103b3610c33565b6040519080825280602002602001820160405280156103dc578160200160208202803683370190505b5090505f5b845181101561042a57602080820286010151610405906020808402870101516101c3565b82828151811061041757610417611102565b60209081029190910101526001016103e1565b509392505050565b6102d784848484610565565b6104493383836105c0565b5050565b336001600160a01b038616811480159061048c57506001600160a01b038087165f9081526001602090815260408083209385168352929052205460ff16155b156104bd5760405163711bec9160e11b81526001600160a01b03808316600483015287166024820152604401610349565b61035f8686868686610654565b6001600160a01b0384166104f357604051632bfa23e760e11b81525f6004820152602401610349565b6102d75f858585856106e0565b6001600160a01b03841661052957604051632bfa23e760e11b81525f6004820152602401610349565b6001600160a01b03851661055157604051626a0d4560e21b81525f6004820152602401610349565b61055e85858585856106e0565b5050505050565b6001600160a01b03841661058e57604051632bfa23e760e11b81525f6004820152602401610349565b6040805160018082526020820186905281830190815260608201859052608082019092529061035f5f878484876106e0565b6001600160a01b0382166105e85760405162ced3e160e81b81525f6004820152602401610349565b6001600160a01b038381165f81815260016020908152604080832094871680845294825291829020805460ff191686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b6001600160a01b03841661067d57604051632bfa23e760e11b81525f6004820152602401610349565b6001600160a01b0385166106a557604051626a0d4560e21b81525f6004820152602401610349565b604080516001808252602082018690528183019081526060820185905260808201909252906106d787878484876106e0565b50505050505050565b6106ec85858585610733565b6001600160a01b0384161561055e5782513390600103610725576020848101519084015161071e838989858589610942565b505061035f565b61035f818787878787610a63565b80518251146107625781518151604051635b05999160e01b815260048101929092526024820152604401610349565b335f5b8351811015610864576020818102858101820151908501909101516001600160a01b03881615610816575f828152602081815260408083206001600160a01b038c168452909152902054818110156107f0576040516303dee4c560e01b81526001600160a01b038a166004820152602481018290526044810183905260648101849052608401610349565b5f838152602081815260408083206001600160a01b038d16845290915290209082900390555b6001600160a01b0387161561085a575f828152602081815260408083206001600160a01b038b16845290915281208054839290610854908490611116565b90915550505b5050600101610765565b5082516001036108e45760208301515f906020840151909150856001600160a01b0316876001600160a01b0316846001600160a01b03167fc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f6285856040516108d5929190918252602082015260400190565b60405180910390a4505061055e565b836001600160a01b0316856001600160a01b0316826001600160a01b03167f4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb8686604051610933929190611135565b60405180910390a45050505050565b6001600160a01b0384163b1561035f5760405163f23a6e6160e01b81526001600160a01b0385169063f23a6e61906109869089908990889088908890600401611162565b6020604051808303815f875af19250505080156109c0575060408051601f3d908101601f191682019092526109bd918101906111a4565b60015b610a27573d8080156109ed576040519150601f19603f3d011682016040523d82523d5f602084013e6109f2565b606091505b5080515f03610a1f57604051632bfa23e760e11b81526001600160a01b0386166004820152602401610349565b805181602001fd5b6001600160e01b0319811663f23a6e6160e01b146106d757604051632bfa23e760e11b81526001600160a01b0386166004820152602401610349565b6001600160a01b0384163b1561035f5760405163bc197c8160e01b81526001600160a01b0385169063bc197c8190610aa790899089908890889088906004016111bf565b6020604051808303815f875af1925050508015610ae1575060408051601f3d908101601f19168201909252610ade918101906111a4565b60015b610b0e573d8080156109ed576040519150601f19603f3d011682016040523d82523d5f602084013e6109f2565b6001600160e01b0319811663bc197c8160e01b146106d757604051632bfa23e760e11b81526001600160a01b0386166004820152602401610349565b80356001600160a01b0381168114610b60575f80fd5b919050565b5f8060408385031215610b76575f80fd5b610b7f83610b4a565b946020939093013593505050565b6001600160e01b031981168114610ba2575f80fd5b50565b5f60208284031215610bb5575f80fd5b8135610bc081610b8d565b9392505050565b5f60208284031215610bd7575f80fd5b5035919050565b5f81518084525f5b81811015610c0257602081850181015186830182015201610be6565b505f602082860101526020601f19601f83011685010191505092915050565b602081525f610bc06020830184610bde565b634e487b7160e01b5f52604160045260245ffd5b604051601f8201601f1916810167ffffffffffffffff81118282101715610c7057610c70610c33565b604052919050565b5f67ffffffffffffffff821115610c9157610c91610c33565b5060051b60200190565b5f82601f830112610caa575f80fd5b81356020610cbf610cba83610c78565b610c47565b8083825260208201915060208460051b870101935086841115610ce0575f80fd5b602086015b84811015610cfc5780358352918301918301610ce5565b509695505050505050565b5f82601f830112610d16575f80fd5b813567ffffffffffffffff811115610d3057610d30610c33565b610d43601f8201601f1916602001610c47565b818152846020838601011115610d57575f80fd5b816020850160208301375f918101602001919091529392505050565b5f805f8060808587031215610d86575f80fd5b610d8f85610b4a565b9350602085013567ffffffffffffffff80821115610dab575f80fd5b610db788838901610c9b565b94506040870135915080821115610dcc575f80fd5b610dd888838901610c9b565b93506060870135915080821115610ded575f80fd5b50610dfa87828801610d07565b91505092959194509250565b5f805f805f60a08688031215610e1a575f80fd5b610e2386610b4a565b9450610e3160208701610b4a565b9350604086013567ffffffffffffffff80821115610e4d575f80fd5b610e5989838a01610c9b565b94506060880135915080821115610e6e575f80fd5b610e7a89838a01610c9b565b93506080880135915080821115610e8f575f80fd5b50610e9c88828901610d07565b9150509295509295909350565b5f8060408385031215610eba575f80fd5b823567ffffffffffffffff80821115610ed1575f80fd5b818501915085601f830112610ee4575f80fd5b81356020610ef4610cba83610c78565b82815260059290921b84018101918181019089841115610f12575f80fd5b948201945b83861015610f3757610f2886610b4a565b82529482019490820190610f17565b96505086013592505080821115610f4c575f80fd5b50610f5985828601610c9b565b9150509250929050565b5f815180845260208085019450602084015f5b83811015610f9257815187529582019590820190600101610f76565b509495945050505050565b602081525f610bc06020830184610f63565b5f805f8060808587031215610fc2575f80fd5b610fcb85610b4a565b93506020850135925060408501359150606085013567ffffffffffffffff811115610ff4575f80fd5b610dfa87828801610d07565b5f8060408385031215611011575f80fd5b61101a83610b4a565b91506020830135801515811461102e575f80fd5b809150509250929050565b5f806040838503121561104a575f80fd5b61105383610b4a565b915061106160208401610b4a565b90509250929050565b5f805f805f60a0868803121561107e575f80fd5b61108786610b4a565b945061109560208701610b4a565b93506040860135925060608601359150608086013567ffffffffffffffff8111156110be575f80fd5b610e9c88828901610d07565b600181811c908216806110de57607f821691505b6020821081036110fc57634e487b7160e01b5f52602260045260245ffd5b50919050565b634e487b7160e01b5f52603260045260245ffd5b808201808211156101e457634e487b7160e01b5f52601160045260245ffd5b604081525f6111476040830185610f63565b82810360208401526111598185610f63565b95945050505050565b5f6001600160a01b03808816835280871660208401525084604083015283606083015260a0608083015261119960a0830184610bde565b979650505050505050565b5f602082840312156111b4575f80fd5b8151610bc081610b8d565b5f6001600160a01b03808816835280871660208401525060a060408301526111ea60a0830186610f63565b82810360608401526111fc8186610f63565b905082810360808401526112108185610bde565b9897505050505050505056fea264697066735822122011343dae5e93506137cb628a2bf7bcd34ac03dff38732ca9d81195626a87540864736f6c63430008180033',
  MOCK_CONTRACT_CALL_RESPONSE: {
    erc20: {
      name: {
        sighash: '0x06fdde03',
        decodedValue: 'HbarToken',
        value:
          '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000948626172546f6b656e0000000000000000000000000000000000000000000000',
      },
      symbol: {
        sighash: '0x95d89b41',
        decodedValue: 'HT',
        value:
          '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000024854000000000000000000000000000000000000000000000000000000000000',
      },
      totalSupply: {
        sighash: '0x18160ddd',
        decodedValue: 10000000,
        value:
          '0x0000000000000000000000000000000000000000000000000000000000989680',
      },

      decimals: {
        sighash: '0x313ce567',
        decodedValue: 8,
        value:
          '0x0000000000000000000000000000000000000000000000000000000000000008',
      },
    },
    erc721: {
      name: {
        sighash: '0x06fdde03',
        decodedValue: 'HbarToken',
        value:
          '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000948626172546f6b656e0000000000000000000000000000000000000000000000',
      },
      symbol: {
        sighash: '0x95d89b41',
        decodedValue: 'HT',
        value:
          '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000024854000000000000000000000000000000000000000000000000000000000000',
      },
    },
  },
};
// Filename: tools/erc-repository-indexer/erc-contract-indexer/tests/unit/utils/helper.spec.ts
// SPDX-License-Identifier: Apache-2.0

import { Helper } from '../../../src/utils/helper';

describe('Helper', () => {
  describe('buildUrl', () => {
    const mockNext =
      '/api/v1/contracts?limit=100&order=asc&contract.id=gt:0.0.5294198';
    const mockScanningLimit = 39;

    it('Should build a default next url', () => {
      const expectedDefaultNext = '/api/v1/contracts?limit=100&order=asc';
      const defaultNext = Helper.buildUrl(null);
      expect(defaultNext).toEqual(expectedDefaultNext);
    });

    it('Should return next link if provided', () => {
      const nextLink = Helper.buildUrl(mockNext);
      expect(nextLink).toEqual(mockNext);
    });

    it('Should return next link modified with scanningLimit if provided', () => {
      const expectedNextLink = mockNext.replace(
        '100',
        mockScanningLimit.toString()
      );

      const nextLink = Helper.buildUrl(mockNext, mockScanningLimit);
      expect(nextLink).toEqual(expectedNextLink);
    });
  });
});
