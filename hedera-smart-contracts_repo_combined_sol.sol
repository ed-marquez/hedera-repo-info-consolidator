// Filename: contracts/base/NoDelegateCall.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.0;

import "../libraries/Constants.sol";

/// @title Prevents delegatecall to a contract
/// @notice Base contract that provides a modifier for preventing delegatecall to methods in a child contract
abstract contract NoDelegateCall is Constants {
    /// @dev The original address of this contract
    address private immutable original;

    /// @dev slightly modified as in context of constructor address(this) is the address of the deployed contract and not the etched contract address
    ///      hence _original allows passing the address to which a contract is etched to; for normal uses pass ADDRESS_ZERO
    constructor(address _original) {
        // Immutables are computed in the init code of the contract, and then inlined into the deployed bytecode.
        // In other words, this variable won't change when it's checked at runtime.
        original = _original == ADDRESS_ZERO ? address(this) : _original;
    }

    /// @dev Private method is used instead of inlining into modifier because modifiers are copied into each method,
    ///     and the use of immutable means the address bytes are copied in every place the modifier is used.
    function checkNotDelegateCall() private view {
        require(address(this) == original, "NO_DELEGATECALL");
    }

    /// @notice Prevents delegatecall into the modified method
    modifier noDelegateCall() {
        checkNotDelegateCall();
        _;
    }
}
// Filename: contracts/bls-bn254-signatures/BlsBn254.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

contract BlsBn254 {
    // negated generator of G1
    uint256 constant public nG1x = 1;
    uint256 constant public nG1y = 21888242871839275222246405745257275088696311157297823662689037894645226208581;

    // negated generator of G2
    uint256 constant public nG2x1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant public nG2x0 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant public nG2y1 = 17805874995975841540914202342111839520379459829704422454583296818431106115052;
    uint256 constant public nG2y0 = 13392588948715843804641432497768002650278120570034223513918757245338268106653;

    // nG1  - negative curve of G1
    // nG2  - negative curve of G2
    // H(m) - 32 bytes message hash
    // e    - pair
    // σ    - signature
    // pk   - public key

    // e(G1, σ) ?= e(pk, H(m))
    function verifySingleG1PubKeyG2SigAndMsg(
        uint256[2] memory pubKeyG1,
        uint256[4] memory msgG2,
        uint256[4] memory sigG2
    ) external view returns (bool) {
        uint256[12] memory input = [
            nG1x, nG1y,
            sigG2[1], sigG2[0], sigG2[3], sigG2[2],
            pubKeyG1[0], pubKeyG1[1],
            msgG2[1], msgG2[0], msgG2[3], msgG2[2]
        ];

        uint256[1] memory out;
        bool success;
        assembly {
            success := staticcall(gas(), 0x8, input, 0x180, out, 0x20)
        }

        return out[0] != 0;
    }

    // e(σ, G2) ?= e(H(m), pk)
    function verifySingleG1SigAndMsgG2PubKey(
        uint256[4] memory pubKeyG2,
        uint256[2] memory msgG1,
        uint256[2] memory sigG1
    ) external view returns (bool) {
        uint256[12] memory input = [
            sigG1[0], sigG1[1],
            nG2x1, nG2x0, nG2y1, nG2y0,
            msgG1[0], msgG1[1],
            pubKeyG2[1], pubKeyG2[0], pubKeyG2[3], pubKeyG2[2]
        ];

        uint256[1] memory out;
        bool success;
        assembly {
            success := staticcall(gas(), 0x8, input, 0x180, out, 0x20)
        }

        return out[0] != 0;
    }

    // e(σ[aggr], G2) ?= e(H(m), pk)
    function verifyMultipleG1SigAndMsgG2PubKey(
        uint256[4][] memory pubKeysG2,
        uint256[2][] memory msgsG1,
        uint256[2] memory sigG1
    ) external view returns (bool) {
        uint256 size = pubKeysG2.length;
        uint256 inputSize = (size + 1) * 6;
        uint256[] memory input = new uint256[](inputSize);
        input[0] = sigG1[0];
        input[1] = sigG1[1];
        input[2] = nG2x1;
        input[3] = nG2x0;
        input[4] = nG2y1;
        input[5] = nG2y0;
        for (uint256 i = 0; i < size; i++) {
            input[i * 6 + 6] = msgsG1[i][0];
            input[i * 6 + 7] = msgsG1[i][1];
            input[i * 6 + 8] = pubKeysG2[i][1];
            input[i * 6 + 9] = pubKeysG2[i][0];
            input[i * 6 + 10] = pubKeysG2[i][3];
            input[i * 6 + 11] = pubKeysG2[i][2];
        }

        uint256[1] memory out;
        bool success;
        assembly {
            success := staticcall(
            gas(),
            8,
            add(input, 0x20),
            mul(inputSize, 0x20),
            out,
            0x20
            )
        }

        return out[0] != 0;
    }

    // e(G1, σ[aggr]) ?= e(pk, H(m))
    function verifyMultipleG1PubKeyG2SigAndMsg(
        uint256[2][] memory pubKeysG1,
        uint256[4][] memory msgsG2,
        uint256[4] memory sigG2
    ) external view returns (bool) {
        uint256 size = pubKeysG1.length;
        uint256 inputSize = (size + 1) * 6;
        uint256[] memory input = new uint256[](inputSize);
        input[0] = nG1x;
        input[1] = nG1y;
        input[2] = sigG2[1];
        input[3] = sigG2[0];
        input[4] = sigG2[3];
        input[5] = sigG2[2];
        for (uint256 i = 0; i < size; i++) {
            input[i * 6 + 6] = pubKeysG1[i][0];
            input[i * 6 + 7] = pubKeysG1[i][1];
            input[i * 6 + 8] = msgsG2[i][1];
            input[i * 6 + 9] = msgsG2[i][0];
            input[i * 6 + 10] = msgsG2[i][3];
            input[i * 6 + 11] = msgsG2[i][2];
        }

        uint256[1] memory out;
        bool success;
        assembly {
            success := staticcall(
            gas(),
            8,
            add(input, 0x20),
            mul(inputSize, 0x20),
            out,
            0x20
            )
        }

        return out[0] != 0;
    }
}
// Filename: contracts/bls-signature/BLS.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./Pairing.sol";

/**
 * @title BLS
 * @dev A library for verifying BLS signatures. Based on the work of https://gist.github.com/BjornvdLaan/ca6dd4e3993e1ef392f363ec27fe74c4, which is licensed under Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0).
 */
library BLS {
    /*
     * Internal functions
     */

    /**
     * @dev Checks if a BLS signature is valid.
     * @param _verificationKey Public verification key associated with the secret key that signed the message.
     * @param _message Message that was signed.
     * @param _signature Signature over the message.
     * @return True if the message was correctly signed.
     */
    function verify(
        Pairing.G2Point memory _verificationKey,
        bytes memory _message,
        Pairing.G1Point memory _signature
    ) internal view returns (bool) {
        Pairing.G1Point memory messageHash = Pairing.hashToG1(_message);
        return Pairing.pairing2(Pairing.negate(_signature), Pairing.P2(), messageHash, _verificationKey);
    }
}
// Filename: contracts/bls-signature/BLSTest.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./Pairing.sol";
import "./BLS.sol";

/**
 * @title BLSTest
 * @dev Testing contract for the BLS library.
 */
contract BLSTest {
    /*
     * Storage
     */

    Pairing.G2Point verificationKey;

    /*
     * Constructor
     */

    constructor() {
        verificationKey = Pairing.G2Point({
            x: [
                18523194229674161632574346342370534213928970227736813349975332190798837787897,
                5725452645840548248571879966249653216818629536104756116202892528545334967238
            ],
            y: [
                3816656720215352836236372430537606984911914992659540439626020770732736710924,
                677280212051826798882467475639465784259337739185938192379192340908771705870
            ]
        });
    }

    /*
     * Public functions
     */

    function verify(bytes memory _message, uint _signatureX, uint _signatureY) public view returns (bool) {
        Pairing.G1Point memory signature = Pairing.G1Point({
            x: _signatureX,
            y: _signatureY
        });
        return BLS.verify(verificationKey, _message, signature);
    }
}
// Filename: contracts/bls-signature/Pairing.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/*
 * @title Pairing
 * @dev BN128 pairing operations.
 * @ref https://github.com/JacobEberhardt/ZoKrates/blob/da5b13f845145cf43d555c7741158727ef0018a2/zokrates_core/src/verification.rs
 */

library Pairing {
    /*
     * Structs
     */

    struct G1Point {
        uint x;
        uint y;
    }

    struct G2Point {
        uint[2] x;
        uint[2] y;
    }

    /*
     * Internal functions
     */

    /**
     * @return The generator of G1.
     */
    function P1() internal pure returns (G1Point memory) {
        return G1Point(1, 2);
    }

    /**
     * @return The generator of G2.
     */
    function P2() internal pure returns (G2Point memory) {
        return G2Point({
            x: [
                11559732032986387107991004021392285783925812861821192530917403151452391805634,
                10857046999023057135944570762232829481370756359578518086990519993285655852781
            ],
            y: [
                4082367875863433681332203403145435568316851327593401208105741076214120093531,
                8495653923123431417604973247489272438418190587263600148770280649306958101930
            ]
        });
    }

    /**
     * @dev Hashes a message into G1.
     * @param _message Message to hash.
     * @return Hashed G1 point.
     */
    function hashToG1(bytes memory _message) internal view returns (G1Point memory) {
        uint256 h = uint256(keccak256(_message));
        return curveMul(P1(), h);
    }

    /**
     * @dev Negates a point in G1.
     * @param _point Point to negate.
     * @return The negated point.
     */
    function negate(G1Point memory _point) internal pure returns (G1Point memory) {
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (_point.x == 0 && _point.y == 0) {
            return G1Point(0, 0);
        }
        return G1Point(_point.x, q - (_point.y % q));
    }

    /**
     * @dev Computes the pairing check e(p1[0], p2[0]) * .... * e(p1[n], p2[n]) == 1
     * @param _g1points List of points in G1.
     * @param _g2points List of points in G2.
     * @return True if pairing check succeeds.
     */
    function pairing(G1Point[] memory _g1points, G2Point[] memory _g2points) private view returns (bool) {
        require(_g1points.length == _g2points.length, "Point count mismatch.");

        uint elements = _g1points.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);

        for (uint i = 0; i < elements; i++) {
            input[i * 6 + 0] = _g1points[i].x;
            input[i * 6 + 1] = _g1points[i].y;
            input[i * 6 + 2] = _g2points[i].x[0];
            input[i * 6 + 3] = _g2points[i].x[1];
            input[i * 6 + 4] = _g2points[i].y[0];
            input[i * 6 + 5] = _g2points[i].y[1];
        }

        uint[1] memory out;
        bool success;

        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
        }
        require(success, "Pairing operation failed.");

        return out[0] != 0;
    }

    /**
     * @dev Convenience method for pairing check on two pairs.
     * @param _g1point1 First point in G1.
     * @param _g2point1 First point in G2.
     * @param _g1point2 Second point in G1.
     * @param _g2point2 Second point in G2.
     * @return True if the pairing check succeeds.
     */
    function pairing2(
        G1Point memory _g1point1,
        G2Point memory _g2point1,
        G1Point memory _g1point2,
        G2Point memory _g2point2
    ) internal view returns (bool) {
        G1Point[] memory g1points = new G1Point[](2);
        G2Point[] memory g2points = new G2Point[](2);
        g1points[0] = _g1point1;
        g1points[1] = _g1point2;
        g2points[0] = _g2point1;
        g2points[1] = _g2point2;
        return pairing(g1points, g2points);
    }

    /*
     * Private functions
     */

    /**
     * @dev Multiplies a point in G1 by a scalar.
     * @param _point G1 point to multiply.
     * @param _scalar Scalar to multiply.
     * @return The resulting G1 point.
     */
    function curveMul(G1Point memory _point, uint _scalar) private view returns (G1Point memory) {
        uint[3] memory input;
        input[0] = _point.x;
        input[1] = _point.y;
        input[2] = _scalar;

        bool success;
        G1Point memory result;
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, result, 0x60)
        }
        require(success, "Point multiplication failed.");
        
        return result;
    }
}
// Filename: contracts/cancun/cancun-opcodes/CancunOpcodes.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract CancunOpcodes {
    event ContractAddress(address);

    // @dev writes `value` to transient storage at `transientSlot` using tstore,
    //      then read `value` from transient storage, using tload, into memory variable, val,
    //      and finally write `val` to regular storage at `regularSlot`
    function transientStorage(uint256 value, uint256 transientSlot, uint256 regularSlot) external {
        // store `value` to `slot` using tstore
        assembly {
            tstore(transientSlot, value)
        }

        // The `value` at `transientSlot` is stored transiently and will be wiped off after the transaction is done processing.
        // Therefore, in order to retain the value for the sake of testing, value will be retrieved from the same transientSlot using TLOAD 
        // and then stored in another slot, REGULAR_SLOT, using regular SSTORE opcode
        uint256 val;
        assembly {
            // read val from transientSlot using tload
            val := tload(transientSlot)

            // write val to regularSlot using sstore to retain value `val`
            sstore(regularSlot, val)
        }
    }

    function getStorageAt(uint256 slot) external view returns (uint256 value) {
        assembly {
            value := sload(slot)
        }
    }

    // @dev stores the address of this contract at the offset 0x20, then copy the address from that pointer offset to offset 0x0.
    //      Eventually, return the value at offset 0x0.
    function memoryCopy() external {
        address contractAddress;
        assembly {
            // // store address of this contract at the next available pointer in memory
            mstore(0x20, address())

            // copy 32 bytes from offset 0x20 to offset 0x0.
            mcopy(0x0, 0x20, 32)

            // assign `contractAddress` with the value at offset 0x0 in memory
            contractAddress := mload(0x0)
        }
        emit ContractAddress(contractAddress);
    }
}
// Filename: contracts/cancun/kzg-point-evaluation/KZGPointEvaluation.sol
// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;

contract KZGPointEvaluation {
    address constant KZG_PRECOMPILE_ADDRESS = 0x000000000000000000000000000000000000000A;

    event ExpectedOutput(bytes result);
    function evaluateKZGProof(
        bytes32 versionedHash,
        bytes32 z,
        bytes32 y,
        bytes memory commitment,
        bytes memory proof
    ) external {
        bytes memory input = abi.encodePacked(versionedHash, z, y, commitment, proof);
        (bool success, bytes memory result) = KZG_PRECOMPILE_ADDRESS.staticcall(input);

        if (!success) {
            emit ExpectedOutput(bytes("KZGPointEvalFailure"));
        } else {
            emit ExpectedOutput(result);
        }

    }
}
// Filename: contracts/diamond-pattern/Diamond.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {LibDiamond} from "./libraries/LibDiamond.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";

contract Diamond {

    constructor(address _contractOwner, address _diamondCutFacet) payable {
        LibDiamond.setContractOwner(_contractOwner);
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        bytes4[] memory functionSelectors = new bytes4[](1);
        functionSelectors[0] = IDiamondCut.diamondCut.selector;
        cut[0] = IDiamondCut.FacetCut({
        facetAddress : _diamondCutFacet,
        action : IDiamondCut.FacetCutAction.Add,
        functionSelectors : functionSelectors
        });
        LibDiamond.diamondCut(cut, address(0), "");
    }

    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: Function does not exist");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return (0, returndatasize())
            }
        }
    }

    receive() external payable {}
}
// Filename: contracts/diamond-pattern/DiamondInit.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {LibDiamond} from "./libraries/LibDiamond.sol";
import {IDiamondLoupe} from "./interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {IERC173} from "./interfaces/IERC173.sol";
import {IERC165} from "./interfaces/IERC165.sol";

contract DiamondInit {
    function init() external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;
    }
}
// Filename: contracts/diamond-pattern/facets/DiamondCutFacet.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract DiamondCutFacet is IDiamondCut {
    function diamondCut(FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }
}
// Filename: contracts/diamond-pattern/facets/DiamondLoupeFacet.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {LibDiamond} from  "../libraries/LibDiamond.sol";
import {IDiamondLoupe} from "../interfaces/IDiamondLoupe.sol";
import {IERC165} from "../interfaces/IERC165.sol";

contract DiamondLoupeFacet is IDiamondLoupe, IERC165 {
    function facets() external override view returns (Facet[] memory facets_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 numFacets = ds.facetAddresses.length;
        facets_ = new Facet[](numFacets);
        for (uint256 i; i < numFacets; i++) {
            address facetAddress_ = ds.facetAddresses[i];
            facets_[i].facetAddress = facetAddress_;
            facets_[i].functionSelectors = ds.facetFunctionSelectors[facetAddress_].functionSelectors;
        }
    }

    function facetFunctionSelectors(address _facet) external override view returns (bytes4[] memory facetFunctionSelectors_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetFunctionSelectors_ = ds.facetFunctionSelectors[_facet].functionSelectors;
    }

    function facetAddresses() external override view returns (address[] memory facetAddresses_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddresses_ = ds.facetAddresses;
    }

    function facetAddress(bytes4 _functionSelector) external override view returns (address facetAddress_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddress_ = ds.selectorToFacetAndPosition[_functionSelector].facetAddress;
    }

    function supportsInterface(bytes4 _interfaceId) external override view returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.supportedInterfaces[_interfaceId];
    }
}
// Filename: contracts/diamond-pattern/facets/OwnershipFacet.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IERC173} from "../interfaces/IERC173.sol";

contract OwnershipFacet is IERC173 {
    function transferOwnership(address _newOwner) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.setContractOwner(_newOwner);
    }

    function owner() external override view returns (address owner_) {
        owner_ = LibDiamond.contractOwner();
    }
}
// Filename: contracts/diamond-pattern/facets/Test1Facet.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

contract Test1Facet {
    event TestEvent(address data);

    function test1Func2() external {}

    function test1Func10() external {}

    function test1Func11() external {}

    function test1Func12() external {}

    function supportsInterface(bytes4 _interfaceID) external view returns (bool) {}
}
// Filename: contracts/diamond-pattern/facets/Test2Facet.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

contract Test2Facet {
    function test2Func1() external {}

    function test2Func5() external {}

    function test2Func6() external {}

    function test2Func19() external {}

    function test2Func20() external {}
}
// Filename: contracts/diamond-pattern/interfaces/IDiamondCut.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface IDiamondCut {
    enum FacetCutAction {Add, Replace, Remove} // Add=0, Replace=1, Remove=2

    struct FacetCut {
        address facetAddress;
        FacetCutAction action;
        bytes4[] functionSelectors;
    }

    function diamondCut(FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata) external;

    event DiamondCut(FacetCut[] _diamondCut, address _init, bytes _calldata);
}
// Filename: contracts/diamond-pattern/interfaces/IDiamondLoupe.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface IDiamondLoupe {
    struct Facet {
        address facetAddress;
        bytes4[] functionSelectors;
    }

    function facets() external view returns (Facet[] memory facets_);

    function facetFunctionSelectors(address _facet) external view returns (bytes4[] memory facetFunctionSelectors_);

    function facetAddresses() external view returns (address[] memory facetAddresses_);

    function facetAddress(bytes4 _functionSelector) external view returns (address facetAddress_);
}
// Filename: contracts/diamond-pattern/interfaces/IERC165.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
// Filename: contracts/diamond-pattern/interfaces/IERC173.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface IERC173 {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function owner() external view returns (address owner_);

    function transferOwnership(address _newOwner) external;
}
// Filename: contracts/diamond-pattern/libraries/LibDiamond.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";

    error InitializationFunctionReverted(address _initializationContractAddress, bytes _calldata);

library LibDiamond {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.diamond.storage");

    struct FacetAddressAndPosition {
        address facetAddress;
        uint96 functionSelectorPosition;
    }

    struct FacetFunctionSelectors {
        bytes4[] functionSelectors;
        uint256 facetAddressPosition;
    }

    struct DiamondStorage {
        mapping(bytes4 => FacetAddressAndPosition) selectorToFacetAndPosition;
        mapping(address => FacetFunctionSelectors) facetFunctionSelectors;
        address[] facetAddresses;
        mapping(bytes4 => bool) supportedInterfaces;
        address contractOwner;
    }

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function setContractOwner(address _newOwner) internal {
        DiamondStorage storage ds = diamondStorage();
        address previousOwner = ds.contractOwner;
        ds.contractOwner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = diamondStorage().contractOwner;
    }

    function enforceIsContractOwner() internal view {
        require(msg.sender == diamondStorage().contractOwner, "LibDiamond: Must be contract owner");
    }

    event DiamondCut(IDiamondCut.FacetCut[] _diamondCut, address _init, bytes _calldata);

    function diamondCut(
        IDiamondCut.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) internal {
        for (uint256 facetIndex; facetIndex < _diamondCut.length; facetIndex++) {
            IDiamondCut.FacetCutAction action = _diamondCut[facetIndex].action;
            if (action == IDiamondCut.FacetCutAction.Add) {
                addFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Replace) {
                replaceFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Remove) {
                removeFunctions(_diamondCut[facetIndex].facetAddress, _diamondCut[facetIndex].functionSelectors);
            } else {
                revert("LibDiamondCut: Incorrect FacetCutAction");
            }
        }
        emit DiamondCut(_diamondCut, _init, _calldata);
        initializeDiamondCut(_init, _calldata);
    }

    function addFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "LibDiamondCut: No selectors in facet to cut");
        DiamondStorage storage ds = diamondStorage();
        require(_facetAddress != address(0), "LibDiamondCut: Add facet can't be address(0)");
        uint96 selectorPosition = uint96(ds.facetFunctionSelectors[_facetAddress].functionSelectors.length);
        if (selectorPosition == 0) {
            addFacet(ds, _facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            require(oldFacetAddress == address(0), "LibDiamondCut: Can't add function that already exists");
            addFunction(ds, selector, selectorPosition, _facetAddress);
            selectorPosition++;
        }
    }

    function replaceFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "LibDiamondCut: No selectors in facet to cut");
        DiamondStorage storage ds = diamondStorage();
        require(_facetAddress != address(0), "LibDiamondCut: Add facet can't be address(0)");
        uint96 selectorPosition = uint96(ds.facetFunctionSelectors[_facetAddress].functionSelectors.length);
        if (selectorPosition == 0) {
            addFacet(ds, _facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            require(oldFacetAddress != _facetAddress, "LibDiamondCut: Can't replace function with same function");
            removeFunction(ds, oldFacetAddress, selector);
            addFunction(ds, selector, selectorPosition, _facetAddress);
            selectorPosition++;
        }
    }

    function removeFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        require(_functionSelectors.length > 0, "LibDiamondCut: No selectors in facet to cut");
        DiamondStorage storage ds = diamondStorage();
        require(_facetAddress == address(0), "LibDiamondCut: Remove facet address must be address(0)");
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            removeFunction(ds, oldFacetAddress, selector);
        }
    }

    function addFacet(DiamondStorage storage ds, address _facetAddress) internal {
        enforceHasContractCode(_facetAddress, "LibDiamondCut: New facet has no code");
        ds.facetFunctionSelectors[_facetAddress].facetAddressPosition = ds.facetAddresses.length;
        ds.facetAddresses.push(_facetAddress);
    }


    function addFunction(DiamondStorage storage ds, bytes4 _selector, uint96 _selectorPosition, address _facetAddress) internal {
        ds.selectorToFacetAndPosition[_selector].functionSelectorPosition = _selectorPosition;
        ds.facetFunctionSelectors[_facetAddress].functionSelectors.push(_selector);
        ds.selectorToFacetAndPosition[_selector].facetAddress = _facetAddress;
    }

    function removeFunction(DiamondStorage storage ds, address _facetAddress, bytes4 _selector) internal {
        require(_facetAddress != address(0), "LibDiamondCut: Can't remove function that doesn't exist");
        require(_facetAddress != address(this), "LibDiamondCut: Can't remove immutable function");
        uint256 selectorPosition = ds.selectorToFacetAndPosition[_selector].functionSelectorPosition;
        uint256 lastSelectorPosition = ds.facetFunctionSelectors[_facetAddress].functionSelectors.length - 1;
        if (selectorPosition != lastSelectorPosition) {
            bytes4 lastSelector = ds.facetFunctionSelectors[_facetAddress].functionSelectors[lastSelectorPosition];
            ds.facetFunctionSelectors[_facetAddress].functionSelectors[selectorPosition] = lastSelector;
            ds.selectorToFacetAndPosition[lastSelector].functionSelectorPosition = uint96(selectorPosition);
        }
        ds.facetFunctionSelectors[_facetAddress].functionSelectors.pop();
        delete ds.selectorToFacetAndPosition[_selector];

        if (lastSelectorPosition == 0) {
            uint256 lastFacetAddressPosition = ds.facetAddresses.length - 1;
            uint256 facetAddressPosition = ds.facetFunctionSelectors[_facetAddress].facetAddressPosition;
            if (facetAddressPosition != lastFacetAddressPosition) {
                address lastFacetAddress = ds.facetAddresses[lastFacetAddressPosition];
                ds.facetAddresses[facetAddressPosition] = lastFacetAddress;
                ds.facetFunctionSelectors[lastFacetAddress].facetAddressPosition = facetAddressPosition;
            }
            ds.facetAddresses.pop();
            delete ds.facetFunctionSelectors[_facetAddress].facetAddressPosition;
        }
    }

    function initializeDiamondCut(address _init, bytes memory _calldata) internal {
        if (_init == address(0)) {
            return;
        }
        enforceHasContractCode(_init, "LibDiamondCut: _init address has no code");
        (bool success, bytes memory error) = _init.delegatecall(_calldata);
        if (!success) {
            if (error.length > 0) {
                assembly {
                    let returndata_size := mload(error)
                    revert(add(32, error), returndata_size)
                }
            } else {
                revert InitializationFunctionReverted(_init, _calldata);
            }
        }
    }

    function enforceHasContractCode(address _contract, string memory _errorMessage) internal view {
        uint256 contractSize;
        assembly {
            contractSize := extcodesize(_contract)
        }
        require(contractSize > 0, _errorMessage);
    }
}
// Filename: contracts/discrepancies/nonce/InternalCallee.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

contract Sample {}

contract InternalCallee {
    uint calledTimes = 0;

    function factorySample() external returns (address) {
        return address(new Sample());
    }

    function externalFunction() external returns (uint) {
        // mutate state to maintain non-view function status
        return ++calledTimes;
    }

    function revertWithRevertReason() public returns (bool) {
        // mutate state to maintain non-view function status
        ++calledTimes;
        revert("RevertReason");
    }

    function revertWithoutRevertReason() public pure returns (bool) {
        revert();
    }

    function selfDestruct(address payable _addr) external {
        selfdestruct(_addr);
    }
}
// Filename: contracts/discrepancies/nonce/InternalCaller.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

contract InternalCaller {
    constructor() payable {}

    function callNonExisting(address _addr) external {
        (bool success,) = _addr.call(abi.encodeWithSignature("nonExisting()"));
        require(success);
    }

    function staticCallNonExisting(address _addr) view external {
        (bool success,) = _addr.staticcall(abi.encodeWithSignature("nonExisting()"));
        require(success);
    }

    function staticCallExternalFunction(address _addr) view external returns (uint) {
        (bool success, bytes memory result) = _addr.staticcall(abi.encodeWithSignature("externalFunction()"));
        return success && result.length > 0 ? abi.decode(result, (uint)) : 0;
    }

    function delegateCallExternalFunction(address _addr) external returns (uint) {
        (bool success, bytes memory result) = _addr.delegatecall(abi.encodeWithSignature("externalFunction()"));
        return success && result.length > 0 ? abi.decode(result, (uint)) : 0;
    }

    function callExternalFunction(address _addr) external returns (uint) {
        (bool success, bytes memory result) = _addr.call(abi.encodeWithSignature("externalFunction()"));
        return success && result.length > 0 ? abi.decode(result, (uint)) : 0;
    }

    function callRevertWithRevertReason(address _addr) external {
        (bool success,) = _addr.call(abi.encodeWithSignature("revertWithRevertReason()"));
        require(success);
    }

    function callRevertWithoutRevertReason(address _addr) external {
        (bool success,) = _addr.call(abi.encodeWithSignature("revertWithoutRevertReason()"));
        require(success);
    }

    function sendTo(address payable _addr) external {
        bool sent = _addr.send(1);
        require(sent);
    }

    function transferTo(address payable _addr) external {
        _addr.transfer(1);
    }

    function callWithValueTo(address _addr) external {
        (bool success,) = _addr.call{value : 1}("");
        require(success);
    }

    function selfDestruct(address payable _addr) external {
        selfdestruct(_addr);
    }

    receive() external payable {}

    fallback() external payable {}
}
// Filename: contracts/hip-583/ContractTransferTx.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

contract ContractTransferTx {

    event Transferred(address _from, address _to, uint256 _amount);

    function transferTo(address payable _to, uint256 _amount) public {
        require(address(this).balance > _amount, "Insufficient contract balance");

        (bool success, ) = _to.call{value : _amount}("");
        require(success, "Transfer call failed");

        emit Transferred(msg.sender, _to, _amount);
    }

    function transferFungibleTokenTo(address tokenContract, address _to, uint256 _amount) public {
        (bool success,) = tokenContract.call(abi.encodeWithSignature("transfer(address,uint256)", _to, _amount));
        require(success, "Function call failed");
    }

    event Success(bool _success, bytes _data);

    function transferFromNonFungibleTokenTo(address tokenContract, address _from, address _to, uint256 _tokenId) public {
        (bool success, bytes memory data) = tokenContract.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", _from, _to, _tokenId));
        emit Success(success, data);
    }

    receive() external payable {}

    fallback() external payable {}
}
// Filename: contracts/hip-583/ERC20Mock.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor() ERC20("ERC20Mock", "E20M") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }
}
// Filename: contracts/hip-583/ERC721Mock.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721Mock is ERC721 {
    constructor() ERC721("ERC721Mock", "E721M") {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }

    function burn(uint256 tokenId) public {
        _burn(tokenId);
    }
}
// Filename: contracts/hip-719-proxy/HRC719TokenProxy.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.4.9 <0.9.0;

/// @dev HTS Token Proxy contract defined in HIP-719, Specification section.
///
/// For more information,
/// see https://github.com/hashgraph/hedera-smart-contracts/issues/885.
contract HRC719TokenProxy {
    fallback() external payable {
        address precompileAddress = address(0x167);
        assembly {
            mstore(0, 0xFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFEFE)
            calldatacopy(32, 0, calldatasize())

            let result := call(gas(), precompileAddress, 0, 8, add(24, calldatasize()), 0, 0)
            let size := returndatasize()
            returndatacopy(0, 0, size)
            switch result
                case 0 { revert(0, size) }
                default { return(0, size) }
        }
    }
}
// Filename: contracts/libraries/Constants.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

abstract contract Constants {
  address internal constant HTS_PRECOMPILE = address(0x167);
  address internal constant EXCHANGE_RATE_PRECOMPILE = address(0x168);
  address internal constant UTIL_PRECOMPILE = address(0x168);

  address internal constant ADDRESS_ZERO = address(0);
}
// Filename: contracts/multicaller/Multicall3.sol
// SPDX-License-Identifier: Apache-2.0
// copied from https://github.com/mds1/multicall commit: eb34ad2954f9ceb475a24bb0155bff3bef0f5409

pragma solidity ^0.8.9;

/// @title Multicall3
/// @notice Aggregate results from multiple function calls
/// @dev Multicall & Multicall2 backwards-compatible
/// @dev Aggregate methods are marked `payable` to save 24 gas per call
/// @author Michael Elliot <mike@makerdao.com>
/// @author Joshua Levine <joshua@makerdao.com>
/// @author Nick Johnson <arachnid@notdot.net>
/// @author Andreas Bigger <andreas@nascent.xyz>
/// @author Matt Solomon <matt@mattsolomon.dev>
contract Multicall3 {
    struct Call {
        address target;
        bytes callData;
    }

    struct Call3 {
        address target;
        bool allowFailure;
        bytes callData;
    }

    struct Call3Value {
        address target;
        bool allowFailure;
        uint256 value;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    /// @notice Backwards-compatible call aggregation with Multicall
    /// @param calls An array of Call structs
    /// @return blockNumber The block number where the calls were executed
    /// @return returnData An array of bytes containing the responses
    function aggregate(Call[] calldata calls) public payable returns (uint256 blockNumber, bytes[] memory returnData) {
        blockNumber = block.number;
        uint256 length = calls.length;
        returnData = new bytes[](length);
        Call calldata call;
        for (uint256 i = 0; i < length;) {
            bool success;
            call = calls[i];
            (success, returnData[i]) = call.target.call(call.callData);
            require(success, "Multicall3: call failed");
        unchecked { ++i; }
        }
    }

    /// @notice Backwards-compatible with Multicall2
    /// @notice Aggregate calls without requiring success
    /// @param requireSuccess If true, require all calls to succeed
    /// @param calls An array of Call structs
    /// @return returnData An array of Result structs
    function tryAggregate(bool requireSuccess, Call[] calldata calls) public payable returns (Result[] memory returnData) {
        uint256 length = calls.length;
        returnData = new Result[](length);
        Call calldata call;
        for (uint256 i = 0; i < length;) {
            Result memory result = returnData[i];
            call = calls[i];
            (result.success, result.returnData) = call.target.call(call.callData);
            if (requireSuccess) require(result.success, "Multicall3: call failed");
        unchecked { ++i; }
        }
    }

    /// @notice Backwards-compatible with Multicall2
    /// @notice Aggregate calls and allow failures using tryAggregate
    /// @param calls An array of Call structs
    /// @return blockNumber The block number where the calls were executed
    /// @return blockHash The hash of the block where the calls were executed
    /// @return returnData An array of Result structs
    function tryBlockAndAggregate(bool requireSuccess, Call[] calldata calls) public payable returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData) {
        blockNumber = block.number;
        blockHash = blockhash(block.number);
        returnData = tryAggregate(requireSuccess, calls);
    }

    /// @notice Backwards-compatible with Multicall2
    /// @notice Aggregate calls and allow failures using tryAggregate
    /// @param calls An array of Call structs
    /// @return blockNumber The block number where the calls were executed
    /// @return blockHash The hash of the block where the calls were executed
    /// @return returnData An array of Result structs
    function blockAndAggregate(Call[] calldata calls) public payable returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData) {
        (blockNumber, blockHash, returnData) = tryBlockAndAggregate(true, calls);
    }

    /// @notice Aggregate calls, ensuring each returns success if required
    /// @param calls An array of Call3 structs
    /// @return returnData An array of Result structs
    function aggregate3(Call3[] calldata calls) public payable returns (Result[] memory returnData) {
        uint256 length = calls.length;
        returnData = new Result[](length);
        Call3 calldata calli;
        for (uint256 i = 0; i < length;) {
            Result memory result = returnData[i];
            calli = calls[i];
            (result.success, result.returnData) = calli.target.call(calli.callData);
            assembly {
            // Revert if the call fails and failure is not allowed
            // `allowFailure := calldataload(add(calli, 0x20))` and `success := mload(result)`
                if iszero(or(calldataload(add(calli, 0x20)), mload(result))) {
                // set "Error(string)" signature: bytes32(bytes4(keccak256("Error(string)")))
                    mstore(0x00, 0x08c379a000000000000000000000000000000000000000000000000000000000)
                // set data offset
                    mstore(0x04, 0x0000000000000000000000000000000000000000000000000000000000000020)
                // set length of revert string
                    mstore(0x24, 0x0000000000000000000000000000000000000000000000000000000000000017)
                // set revert string: bytes32(abi.encodePacked("Multicall3: call failed"))
                    mstore(0x44, 0x4d756c746963616c6c333a2063616c6c206661696c6564000000000000000000)
                    revert(0x00, 0x64)
                }
            }
        unchecked { ++i; }
        }
    }

    /// @notice Aggregate calls with a msg value
    /// @notice Reverts if msg.value is less than the sum of the call values
    /// @param calls An array of Call3Value structs
    /// @return returnData An array of Result structs
    function aggregate3Value(Call3Value[] calldata calls) public payable returns (Result[] memory returnData) {
        uint256 valAccumulator;
        uint256 length = calls.length;
        returnData = new Result[](length);
        Call3Value calldata calli;
        for (uint256 i = 0; i < length;) {
            Result memory result = returnData[i];
            calli = calls[i];
            uint256 val = calli.value;
            // Humanity will be a Type V Kardashev Civilization before this overflows - andreas
            // ~ 10^25 Wei in existence << ~ 10^76 size uint fits in a uint256
        unchecked { valAccumulator += val; }
            (result.success, result.returnData) = calli.target.call{value: val}(calli.callData);
            assembly {
            // Revert if the call fails and failure is not allowed
            // `allowFailure := calldataload(add(calli, 0x20))` and `success := mload(result)`
                if iszero(or(calldataload(add(calli, 0x20)), mload(result))) {
                // set "Error(string)" signature: bytes32(bytes4(keccak256("Error(string)")))
                    mstore(0x00, 0x08c379a000000000000000000000000000000000000000000000000000000000)
                // set data offset
                    mstore(0x04, 0x0000000000000000000000000000000000000000000000000000000000000020)
                // set length of revert string
                    mstore(0x24, 0x0000000000000000000000000000000000000000000000000000000000000017)
                // set revert string: bytes32(abi.encodePacked("Multicall3: call failed"))
                    mstore(0x44, 0x4d756c746963616c6c333a2063616c6c206661696c6564000000000000000000)
                    revert(0x00, 0x84)
                }
            }
        unchecked { ++i; }
        }
        // Finally, make sure the msg.value = SUM(call[0...i].value)
        require(msg.value == valAccumulator, "Multicall3: value mismatch");
    }

    /// @notice Returns the block hash for the given block number
    /// @param blockNumber The block number
    function getBlockHash(uint256 blockNumber) public view returns (bytes32 blockHash) {
        blockHash = blockhash(blockNumber);
    }

    /// @notice Returns the block number
    function getBlockNumber() public view returns (uint256 blockNumber) {
        blockNumber = block.number;
    }

    /// @notice Returns the block coinbase
    function getCurrentBlockCoinbase() public view returns (address coinbase) {
        coinbase = block.coinbase;
    }

    /// @notice Returns the block difficulty
    /// @notice Since the VM version paris, "difficulty" was replaced by "prevrandao", which now returns a random number based on the beacon chain.
    function getCurrentBlockDifficulty() public view returns (uint256 difficulty) {
        difficulty = block.prevrandao;
    }

    /// @notice Returns the block gas limit
    function getCurrentBlockGasLimit() public view returns (uint256 gaslimit) {
        gaslimit = block.gaslimit;
    }

    /// @notice Returns the block timestamp
    function getCurrentBlockTimestamp() public view returns (uint256 timestamp) {
        timestamp = block.timestamp;
    }

    /// @notice Returns the (ETH) balance of a given address
    function getEthBalance(address addr) public view returns (uint256 balance) {
        balance = addr.balance;
    }

    /// @notice Returns the block hash of the last block
    function getLastBlockHash() public view returns (bytes32 blockHash) {
    unchecked {
        blockHash = blockhash(block.number - 1);
    }
    }

    /// @notice Gets the base fee of the given block
    /// @notice Can revert if the BASEFEE opcode is not implemented by the given chain
    function getBasefee() public view returns (uint256 basefee) {
        basefee = block.basefee;
    }

    /// @notice Returns the chain id
    function getChainId() public view returns (uint256 chainid) {
        chainid = block.chainid;
    }
}// Filename: contracts/multicaller/Receiver.sol
//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

contract Receiver {

    uint public counter = 0;
    event Counter(uint);

    struct SomeData {
        uint a;
        uint b;
        uint c;
        uint d;
    }

    function processLongInput() pure external returns (uint result) {
        result = 5;
    }

    function processLongOutput(
        uint24 count
    ) external pure returns (SomeData[] memory) {
        SomeData[] memory data = new SomeData[](count);
        return data;
    }

    function processLongInputTx() payable external returns (uint) {
        counter += 1;
        return counter;
    }

    function processLongOutputTx(
        uint24 count
    ) external payable returns (SomeData[] memory) {
        counter += 1;
        SomeData[] memory data = new SomeData[](count);
        emit Counter(counter);
        return data;
    }

    receive() external payable {}
    fallback() external payable {}
}
// Filename: contracts/multicaller/Reverter.sol
//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

contract Reverter {

    struct SomeData {
        uint a;
        uint b;
        uint c;
        uint d;
    }

    function processLongInput() pure external {
        revert("SomeRevertReason");
    }

    function processLongOutput() pure external {
        revert("SomeRevertReason");
    }
}
// Filename: contracts/openzeppelin/ERC-1155/ERC1155Mock.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ERC1155Mock is ERC1155 {
    constructor(string memory uri) ERC1155(uri) {}

    function mint(address to, uint256 id, uint256 amount, bytes memory data) public {
        _mint(to, id, amount, data);
    }

    function mintBatch(address to, uint256[] memory id, uint256[] memory amount, bytes memory data) public {
        _mintBatch(to, id, amount, data);
    }
}
// Filename: contracts/openzeppelin/ERC-1155/ERC1155Token.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";

contract ERC1155Token is Context, ERC1155, Ownable, ERC1155Burnable, ERC1155Supply {

    /**
     * @dev emitted after minted new token to an address
     */
    event Minted(address account, uint256 id, uint256 amount, bytes data);

    /**
     * @dev emitted after minted new tokens in batch to an address
     */
    event MintedBatch(address to, uint256[] ids, uint256[] amounts, bytes data);

    /**
     * @dev initialize new ERC1155 token
     */
    constructor(string memory _tokenUri) ERC1155(_tokenUri) Ownable(_msgSender()) {}


    /**
     * @dev set a new uri for the token
     */
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    /**
     * dev only allow the owner of the contract to mint new tokens to an address
     */
    function mint(address account, uint256 id, uint256 amount, bytes memory data)
        public
        onlyOwner
    {
        _mint(account, id, amount, data);
        emit Minted(account, id, amount, data);
    }

    /**
     * @dev only allow the owner of the contract to mint new tokens in batch to an address
     */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public
        onlyOwner
    {
        _mintBatch(to, ids, amounts, data);
        emit MintedBatch(to, ids, amounts, data);
    }

    // The following functions are overrides required by Solidity.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }
}
// Filename: contracts/openzeppelin/ERC-165/ClimberSelector.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./IClimber.sol";

contract ClimberSelector {
    function calculateSelector() public pure returns (bytes4) {
        Climber i;
        return i.hasHarness.selector ^ i.hasChalk.selector ^ i.hasClimbingShoes.selector;
    }

    function calculateSelectorNotSupported() public pure returns (bytes4) {
        Climber i;
        return i.hasHarness.selector ^ i.hasChalk.selector;
    }
}
// Filename: contracts/openzeppelin/ERC-165/IClimber.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

interface Climber {
    function hasHarness() external returns (bool);
    function hasChalk() external returns (string memory);
    function hasClimbingShoes() external returns (string memory);
}

// Filename: contracts/openzeppelin/ERC-165/Test_ERC165.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./IClimber.sol";

contract Test_ERC165 is ERC165, Climber {
    function hasHarness() external virtual returns (bool) {
        return true;
    }

    function hasChalk() external virtual returns (string memory) {
        return 'yes';
    }
    
    function hasClimbingShoes() external virtual returns (string memory) {
        return 'yes';
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(Climber).interfaceId || super.supportsInterface(interfaceId);
}
}// Filename: contracts/openzeppelin/ERC-1967-Upgrade/VoteProxy.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";


/**
 * @dev This contract acts as a Proxy contract for the vote contracts
 */
contract VoteProxy is ERC1967Proxy, Context {
    /**
     * @dev caller is not authorized
     */
    error Unauthorized_Caller();

    /**
     * @dev Initializes the upgradeable ERC1967Proxy with an initial implementation specified by `implementation` and an empty call data.
     */
    constructor(address implementationContract) ERC1967Proxy(implementationContract, "") {
        ERC1967Utils.changeAdmin(_msgSender());
    }

    /**
     * @dev modifier which only allows proxy admin
     */
    modifier onlyProxyAdmin(address caller) {
        if (caller != ERC1967Utils.getAdmin()) {
            revert Unauthorized_Caller();
        }
        _;
    }

    /**
     * @notice required by Solidity
     */
    receive() external payable {}

    /**
     * @dev Returns the predefined IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
     *
     * @notice The IMPLEMENTATION_SLOT is obtained as bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
     */
    function getImplementationSlot() external pure returns (bytes32) {
        return ERC1967Utils.IMPLEMENTATION_SLOT;
    }

    /**
     * @dev Returns the current implementation address.
     *
     * @notice The internal _implementation() utilizes ERC1967Utils.getImplementation();
     */
    function implementation() external view returns (address) {
        return ERC1967Utils.getImplementation();
    }

    /**
     * @dev Performs implementation upgrade with additional setup call if data is nonempty.
     * This function is payable only if the setup call is performed, otherwise `msg.value` is rejected
     * to avoid stuck value in the contract.
     *
     * Emits an {IERC1967-Upgraded} event.
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) external onlyProxyAdmin(_msgSender()){
        ERC1967Utils.upgradeToAndCall(newImplementation, data);
    }

    /**
     * @dev Returns the predefined ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
     *
     * @notice The ADMIN_SLOT is obtained as bytes32(uint256(keccak256('eip1967.proxy.admin')) - 1)
     */
    function getAdminSlot() external pure returns (bytes32) {
        return ERC1967Utils.ADMIN_SLOT;
    }

    /**
     * @dev returns the current proxy admin
     *
     * TIP: To get this value clients can read directly from the storage slot shown below (specified by ERC-1967) using
     * the https://eth.wiki/json-rpc/API#eth_getstorageat[`eth_getStorageAt`] RPC call.
     * `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`
     */
    function getCurrentAdmin() external view returns (address) {
        return ERC1967Utils.getAdmin();
    }

     /**
     * @dev Changes the admin of the proxy.
     *
     * Emits an {IERC1967-AdminChanged} event.
     */
    function changeAdmin(address newAdmin) external onlyProxyAdmin(_msgSender()) {
        ERC1967Utils.changeAdmin(newAdmin);
    }
}
// Filename: contracts/openzeppelin/ERC-1967-Upgrade/VoteV1.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Context.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @dev This contract is an example of a simple voting system.
 */
contract VoteV1 is Context, Initializable {
    /**
     * @dev version of the vote system
     */
    uint256 _version;

    /**
     * @dev a list of voters
     */
    address[] _voters;

    /**
     * @dev voters have voted
     */
    mapping(address => bool) _voted;

    /**
     * @dev The caller has already voted
     */
    error Voter_Has_Already_Voted();

    /**
     * @dev modifier to only allow callers who have not voted to execute the calling method
     * @param voter the voter to check
     */
    modifier mustHaveNotVoted(address voter) {
        if (voted(voter)) {
            revert Voter_Has_Already_Voted();
        }
        _;
    }

    /**
     * @dev Initializes the vote system version 1
     */
    constructor() {
        _version = 1;
    }

    /**
     * @dev Initializes the vote system version 1
     */
    function initialize() external initializer {
        _version = 1;
    }

    /**
     * @dev Add a voter to the vote system
     */
    function vote() external mustHaveNotVoted(_msgSender()) {
        _voters.push(_msgSender());
        _voted[_msgSender()] = true;
    }

    /**
     * @dev Returs the list of voters
     */
    function voters() external view returns (address[] memory) {
        return _voters;
    }

    /**
     * @dev Checks if a voter has already voted
     * @param voter the voter to check
     * @return true if the voter has already voted, false otherwise
     */
    function voted(address voter) public view returns (bool) {
        return _voted[voter];
    }

    /**
     * @dev Returns the version of the vote system
     */
    function version() external view returns(uint256) {
        return _version;
    }

}
// Filename: contracts/openzeppelin/ERC-1967-Upgrade/VoteV2.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import './VoteV1.sol';
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @dev This contract is an upgraded version of the VoteV1
 */
contract VoteV2 is Initializable, VoteV1 {

    /**
     * @dev The caller has not voted
     */
    error Voter_Has_Not_Voted();

    /**
     * @dev modifier to only allow callers who have voted to execute the calling method
     * @param voter the voter to check
     */
    modifier mustHaveVoted(address voter) {
        if (!_voted[voter]) {
            revert Voter_Has_Not_Voted();
        }
        _;
    }

    /**
     * @dev Initialize the vote system version 2
     */
    constructor() {
        _version = 2;
    }

    /**
     * @dev Initializes the vote system version 2
     */
    function initializeV2() external reinitializer(2) {
        _version = 2;
    }

    /**
     * @dev Allows callers to withdraw their votes
     */
    function withdrawVote() external mustHaveVoted(_msgSender()) {
        for (uint256 i = 0; i < _voters.length; i++) {
            if (_voters[i] == _msgSender()) {
                for (uint256 j = i; j < _voters.length - 1; j++) {
                    _voters[j] = _voters[j+1];
                }
                break;
            }
        }
        _voted[_msgSender()] = false;
        _voters.pop();
    }

}
// Filename: contracts/openzeppelin/ERC-20-extensions/ERC20Extensions.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20BurnableMock is ERC20Burnable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) public virtual {
        require(amount > 0);
        _mint(to, amount);
    }
}

contract ERC20CappedMock is ERC20Capped {
    constructor(string memory name, string memory symbol, uint256 cap) ERC20(name, symbol) ERC20Capped(cap){}

    function mint(address to, uint256 amount) public virtual {
        require(amount > 0);
        _mint(to, amount);
    }
}

contract ERC20PausableMock is ERC20Pausable, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender){}
    
    function mint(address to, uint256 amount) public virtual {
        require(amount > 0);
        _mint(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
// Filename: contracts/openzeppelin/ERC-20-votes/erc20VotesTest.sol
// SPDX-License-Identifier: Apache-2.0 
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract ERC20VotesTest is ERC20, ERC20Permit, ERC20Votes {
    constructor(uint initialMintAmmount) ERC20("MyToken", "MTK") ERC20Permit("MyToken") {
        _mint(msg.sender, initialMintAmmount);
    }

    // The following functions are overrides required by Solidity.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
// Filename: contracts/openzeppelin/ERC-20/ERC20Mock.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OZERC20Mock is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    
    function mint(address to, uint256 amount) public virtual {
        require(amount > 0);
        _mint(to, amount);
    }
}
// Filename: contracts/openzeppelin/ERC-2612/ERC2612.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ERC2612Test is ERC20Permit {
    event Signer(address signer);
     bytes32 private constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    constructor() ERC20Permit("ERC2612Test") ERC20("ERC2612Test", "$"){
    }

    function mint(uint256 mintAmount) external {
        _mint(msg.sender, mintAmount);
    }

    function permitTest(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        permit(owner, spender, value, deadline, v, r, s);
    }
}
// Filename: contracts/openzeppelin/ERC-2771/ERC2771Context.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract ERC2771ContextTest is ERC2771Context {
    string public message;
    address public sender;
    bytes public msgData;
    event MessageChanged(string message, address forwarder, address sender);

    constructor(address trustedForward) ERC2771Context(trustedForward) {
    }

    function msgSenderTest() public returns (address) {
        sender = _msgSender();
        return _msgSender();
    }

    function msgDataTest() public returns (bytes memory) {
        msgData = _msgData();
        return _msgData();
    }

    function changeMessageTestRequest(string memory _message) external payable returns (bool) {
        message = _message;
        emit MessageChanged(_message, msg.sender, _msgSender());

        return true;
    }
}
// Filename: contracts/openzeppelin/ERC-2771/ERC2771Forward.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract ERC2771ForwardTest is ERC2771Forwarder {
    constructor(string memory name) ERC2771Forwarder(name) {

    }

    uint test;
    event TestEvent(bool, bool, bool, address);

    function validateTest(ERC2771Forwarder.ForwardRequestData calldata request)
        public
        returns (bool, bool, bool, address)
    {
        test = 5;
        (bool t1, bool t2, bool t3, address t4) = _validate(request);
        emit TestEvent(t1, t2, t3, t4);

        return (t1, t2, t3, t4);
    }

    function fund() external payable{}

    function getChainID() external view returns (uint256){
        return block.chainid;
    }
}
// Filename: contracts/openzeppelin/ERC-2981/ERC2981.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract ERC2981Test is ERC2981 {
    constructor() ERC2981() {}

    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator)
        external
    {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function feeDenominator()
        pure
        external
        returns (uint256)
    {
       return _feeDenominator();
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator)
        external
    {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function resetTokenRoyalty(uint256 tokenId)
        external
    {
        _resetTokenRoyalty(tokenId);
    }
}// Filename: contracts/openzeppelin/ERC-4626/TokenVault.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "../ERC-20/ERC20Mock.sol";

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract TokenVault is ERC4626 {

    // a mapping that checks if a user has deposited the token
    mapping(address => uint256) public shareHolders;

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol
    ) ERC4626(_asset) ERC20(_name, _symbol) {
       
    }

    function _deposit(uint256 _assets) public {
        // checks that the deposited amount is greater than zero.
        require(_assets > 0, "Deposit is zero");
        // calling the deposit function from the ERC-4626 library to perform all the necessary functionality
        deposit(_assets, msg.sender);
        // Increase the share of the user
        shareHolders[msg.sender] += _assets;
    }

    function _withdraw(uint256 _shares, address _receiver) public {
        // checks that the deposited amount is greater than zero.
        require(_shares > 0, "withdraw must be greater than Zero");
        // Checks that the _receiver address is not zero.
        require(_receiver != address(0), "Zero Address");
        // checks that the caller is a shareholder
        require(shareHolders[msg.sender] > 0, "Not a shareHolder");
        // checks that the caller has more shares than they are trying to withdraw.
        require(shareHolders[msg.sender] >= _shares, "Not enough shares");
        // Calculate 10% yield on the withdraw amount
        uint256 percent = (10 * _shares) / 100;
        // Calculate the total asset amount as the sum of the share amount plus 10% of the share amount.
        uint256 assets = _shares + percent;
        // Decrease the share of the user
        shareHolders[msg.sender] -= _shares;
        // calling the redeem function from the ERC-4626 library to perform all the necessary functionality
        redeem(assets, _receiver, msg.sender);                
    }

    // returns total number of assets
    function totalAssets() public view override returns (uint256) {
        return super.totalAssets();
    }

    function totalAssetsOfUser(address _user) public view returns (uint256) {
        return shareHolders[_user];
    }   

}
// Filename: contracts/openzeppelin/ERC-721-Receiver/ERC721Receiver.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @dev Represents a contract that does not support IERC721.safeTransferFrom
 */
contract InvalidERC721Receiver {}

/**
 * @dev Represents a contract that supports IERC721.safeTransferFrom by implementing IERC721Receiver.onERC721Received
 */
contract ValidERC721Receiver is IERC721Receiver {

    /**
     * @dev see {IERC721Receiver-onERC721Received}
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
// Filename: contracts/openzeppelin/ERC-721/ERC721Mock.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract OZERC721Mock is ERC721 {
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}
// Filename: contracts/openzeppelin/ERC-777/ERC777ContractAccount.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./ERC777Token.sol";
import "@openzeppelin/contracts/interfaces/IERC1820Registry.sol";


contract ERC777ContractAccount {

    /**
     * @dev Error when call instruction is not successful
     */
    error CallReverted();

    /**
     * @dev hashes of the necessary interfaces
     */
    bytes32 internal constant _TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 internal constant _TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    /**
     * @notice currently ERC1820Registry is not deployed on Hedera networks. Therefore, this implementation requires a manual ERC1820Registry deployment
     */
    IERC1820Registry internal immutable _ERC1820_REGISTRY;
    // IERC1820Registry internal constant _ERC1820_REGISTRY = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    /**
     * @dev register interfaces
     */
    constructor(address _erc1820Addr) {
        _ERC1820_REGISTRY = IERC1820Registry(_erc1820Addr);
    }

    /**
     * @dev register ERC777TokensSender interface 
     */
    function registerERC777TokensSender(address _erc777SenderHookImpl) external {
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), _TOKENS_SENDER_INTERFACE_HASH, _erc777SenderHookImpl);
    }

    /**
     * @dev register ERC777TokensRecipient interface 
     */
    function registerERC777TokensRecipient(address _erc777RecipientHookImpl) external {
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), _TOKENS_RECIPIENT_INTERFACE_HASH, _erc777RecipientHookImpl);
    }

     /**
     * @dev send an _amount of token to _recipient by calling _erc777tokenAddr.send
     */
    function send(address _erc777tokenAddr, address _recipient, uint256 _amount, bytes memory _data) public {
        (bool success, ) = _erc777tokenAddr.call(
            abi.encodeWithSignature("send(address,uint256,bytes)", _recipient, _amount, _data)
        );

        if (!success) {revert CallReverted();}
    }
}
// Filename: contracts/openzeppelin/ERC-777/ERC777Token.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/interfaces/IERC777.sol";
import "@openzeppelin/contracts/interfaces/IERC777Sender.sol";
import "@openzeppelin/contracts/interfaces/IERC777Recipient.sol";
import "@openzeppelin/contracts/interfaces/IERC1820Registry.sol";

contract ERC777Token is Context, IERC777 {
    string private _name;
    string private _symbol;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => bool) private _defaultOperators;
    mapping(address => mapping(address => bool)) private _operators;
    mapping(address => mapping(address => bool)) private _revokedDefaultOperators;

    using Address for address;

    /**
     * @notice currently ERC1820Registry is not deployed on Hedera networks. Therefore, this implementation requires a manual ERC1820Registry deployment
     */
    IERC1820Registry internal immutable _ERC1820_REGISTRY;
    // IERC1820Registry internal constant _ERC1820_REGISTRY = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    bytes32 internal constant _ERC777TOKEN_INTERFACE_HASH = keccak256("ERC777Token");
    bytes32 internal constant _TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 internal constant _TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    address[] private _defaultOperatorsArray;

    /**
     * @dev Initialize the name and symbol of the token, set up defaul operators and register for interfaces
     *
     * @notice defaultOperators_ may be empty
     */
    constructor(string memory name_, string memory symbol_, address _erc1820Addr, address[] memory defaultOperators_) {
        _name = name_;
        _symbol = symbol_;

        _defaultOperatorsArray = defaultOperators_;
        for (uint256 i = 0; i < defaultOperators_.length; i++) {
            _defaultOperators[defaultOperators_[i]] = true;
        }

        // register interfaces
        _ERC1820_REGISTRY = IERC1820Registry(_erc1820Addr);
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), keccak256("ERC777Token"), address(this));
    }

    /**
     * @dev See {IERC777-name}.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev See {IERC777-symbol}.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev See {IERC777-granularity}.
     *
     * This implementation always returns `1`.
     */
    function granularity() public view virtual override returns (uint256) {
        return 1;
    }

    /**
     * @dev See {IERC777-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Returns the amount of tokens owned by an account (`tokenHolder`).
     */
    function balanceOf(address tokenHolder) public view virtual override returns (uint256) {
        return _balances[tokenHolder];
    }

    /**
     * @dev Mint an _amount of token to _addr
     */
    function mint(address _addr, uint256 _amount, bytes memory userData, bytes memory operatorData) public virtual {
        _mint(_addr, _amount, userData, operatorData);
    }

    /**
     * @dev See {IERC777-send}.
     *
     * Also emits a {IERC20-Transfer} event for ERC20 compatibility.
     */
    function send(address recipient, uint256 amount, bytes memory data) public virtual override {
        _send(_msgSender(), recipient, amount, data, "", true);
    }

    /**
     * @dev See {IERC777-burn}.
     *
     * Also emits a {IERC20-Transfer} event for ERC20 compatibility.
     */
    function burn(uint256 amount, bytes memory data) public virtual override {
        _burn(_msgSender(), amount, data, "");
    }

    /**
     * @dev See {IERC777-isOperatorFor}.
     */
    function isOperatorFor(address operator, address tokenHolder) public view virtual override returns (bool) {
        return
            operator == tokenHolder ||
            (_defaultOperators[operator] && !_revokedDefaultOperators[tokenHolder][operator]) ||
            _operators[tokenHolder][operator];
    }

     /**
     * @dev See {IERC777-authorizeOperator}.
     */
    function authorizeOperator(address operator) public virtual override {
        require(_msgSender() != operator, "ERC777: authorizing self as operator");

        if (_defaultOperators[operator]) {
            delete _revokedDefaultOperators[_msgSender()][operator];
        } else {
            _operators[_msgSender()][operator] = true;
        }

        emit AuthorizedOperator(operator, _msgSender());
    }

    /**
     * @dev See {IERC777-revokeOperator}.
     */
    function revokeOperator(address operator) public virtual override {
        require(operator != _msgSender(), "ERC777: revoking self as operator");

        if (_defaultOperators[operator]) {
            _revokedDefaultOperators[_msgSender()][operator] = true;
        } else {
            delete _operators[_msgSender()][operator];
        }

        emit RevokedOperator(operator, _msgSender());
    }

    /**
     * @dev See {IERC777-defaultOperators}.
     */
    function defaultOperators() public view virtual override returns (address[] memory) {
        return _defaultOperatorsArray;
    }

    /**
     * @dev See {IERC777-operatorSend}.
     *
     * Emits {Sent} and {IERC20-Transfer} events.
     */
    function operatorSend(
        address sender,
        address recipient,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    ) public virtual override {
        require(isOperatorFor(_msgSender(), sender), "ERC777: caller is not an operator for holder");
        _send(sender, recipient, amount, data, operatorData, true);
    }

    /**
     * @dev See {IERC777-operatorBurn}.
     *
     * Emits {Burned} and {IERC20-Transfer} events.
     */
    function operatorBurn(
        address account,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    ) public virtual override {
        require(isOperatorFor(_msgSender(), account), "ERC777: caller is not an operator for holder");
        _burn(account, amount, data, operatorData);
    }

    /**
     * @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * If a send hook is registered for `account`, the corresponding function
     * will be called with the caller address as the `operator` and with
     * `userData` and `operatorData`.
     *
     * See {IERC777Sender} and {IERC777Recipient}.
     *
     * Emits {Minted} and {IERC20-Transfer} events.
     *
     * Requirements
     *
     * - `account` cannot be the zero address.
     * - if `account` is a contract, it must implement the {IERC777Recipient}
     * interface.
     */
    function _mint(address account, uint256 amount, bytes memory userData, bytes memory operatorData) internal virtual {
        _mint(account, amount, userData, operatorData, true);
    }

    /**
     * @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * If `requireReceptionAck` is set to true, and if a send hook is
     * registered for `account`, the corresponding function will be called with
     * `operator`, `data` and `operatorData`.
     *
     * See {IERC777Sender} and {IERC777Recipient}.
     *
     * Emits {Minted} and {IERC20-Transfer} events.
     *
     * Requirements
     *
     * - `account` cannot be the zero address.
     * - if `account` is a contract, it must implement the {IERC777Recipient}
     * interface.
     */
    function _mint(
        address account,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData,
        bool requireReceptionAck
    ) internal virtual {
        require(account != address(0), "ERC777: mint to the zero address");

        address operator = _msgSender();

        _beforeTokenTransfer(operator, address(0), account, amount);

        // Update state variables
        _totalSupply += amount;
        _balances[account] += amount;

        _callTokensReceived(operator, address(0), account, amount, userData, operatorData, requireReceptionAck);

        emit Minted(operator, account, amount, userData, operatorData);
    }

    /**
     * @dev Send tokens
     * @param from address token holder address
     * @param to address recipient address
     * @param amount uint256 amount of tokens to transfer
     * @param userData bytes extra information provided by the token holder (if any)
     * @param operatorData bytes extra information provided by the operator (if any)
     * @param requireReceptionAck if true, contract recipients are required to implement ERC777TokensRecipient
     */
    function _send(
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData,
        bool requireReceptionAck
    ) internal virtual {
        require(from != address(0), "ERC777: transfer from the zero address");
        require(to != address(0), "ERC777: transfer to the zero address");

        address operator = _msgSender();

        _callTokensToSend(operator, from, to, amount, userData, operatorData, true);

        _move(operator, from, to, amount, userData, operatorData);

        _callTokensReceived(operator, from, to, amount, userData, operatorData, requireReceptionAck);
    }

    /**
     * @dev Burn tokens
     * @param from address token holder address
     * @param amount uint256 amount of tokens to burn
     * @param data bytes extra information provided by the token holder
     * @param operatorData bytes extra information provided by the operator (if any)
     */
    function _burn(address from, uint256 amount, bytes memory data, bytes memory operatorData) internal virtual {
        require(from != address(0), "ERC777: burn from the zero address");

        address operator = _msgSender();

        _callTokensToSend(operator, from, address(0), amount, data, operatorData, true);

        _beforeTokenTransfer(operator, from, address(0), amount);

        // Update state variables
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC777: burn amount exceeds balance");
        unchecked {
            _balances[from] = fromBalance - amount;
        }
        _totalSupply -= amount;

        emit Burned(operator, from, amount, data, operatorData);
    }

    function _move(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    ) private {
        _beforeTokenTransfer(operator, from, to, amount);

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC777: transfer amount exceeds balance");
        unchecked {
            _balances[from] = fromBalance - amount;
        }
        _balances[to] += amount;

        emit Sent(operator, from, to, amount, userData, operatorData);
    }

    /**
     * @dev Call from.tokensToSend() if the interface is registered
     * @param operator address operator requesting the transfer
     * @param from address token holder address
     * @param to address recipient address
     * @param amount uint256 amount of tokens to transfer
     * @param userData bytes extra information provided by the token holder (if any)
     * @param operatorData bytes extra information provided by the operator (if any)
     */
    function _callTokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData,
        bool requireReceptionAck
    ) private {
        address implementer = _ERC1820_REGISTRY.getInterfaceImplementer(from, _TOKENS_SENDER_INTERFACE_HASH);

        /**
         * @notice if `to` is an EOA, normally it would not register the _TOKENS_RECIPIENT_INTERFACE_HASH to the registry => implementer will most likely be address(0) => NOT REVERT
         *
         * * @notice if `to` is a contract, and the returned `implementer` is not address(0) => call `tokensReceived` hook
         */

        if (implementer != address(0)) {
            IERC777Sender(implementer).tokensToSend(operator, from, to, amount, userData, operatorData);
        } else if (requireReceptionAck) {
            /**
             * @notice from.code.length > 0 checks if the address `from` is a contract thanks to the use of extcodesize/address.code.length
             */
            require(!(from.code.length > 0), "ERC777: token sender contract has no implementer for ERC777TokensSender");
        }
    }

    /**
     * @dev Call to.tokensReceived() if the interface is registered. Reverts if the recipient is a contract but
     * tokensReceived() was not registered for the recipient
     * @param operator address operator requesting the transfer
     * @param from address token holder address
     * @param to address recipient address
     * @param amount uint256 amount of tokens to transfer
     * @param userData bytes extra information provided by the token holder (if any)
     * @param operatorData bytes extra information provided by the operator (if any)
     * @param requireReceptionAck if true, contract recipients are required to implement ERC777TokensRecipient
     */
    function _callTokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData,
        bool requireReceptionAck
    ) private {
        address implementer = _ERC1820_REGISTRY.getInterfaceImplementer(to, _TOKENS_RECIPIENT_INTERFACE_HASH);

        /**
         * @notice if `to` is an EOA, normally it would not register the _TOKENS_RECIPIENT_INTERFACE_HASH to the registry => implementer will most likely be address(0) => NOT REVERT
         *
         * @notice if `to` is a contract, and the returned `implementer` is address(0) which means it does not register _TOKENS_RECIPIENT_INTERFACE_HASH to the registry => REVERT
         *
         * @notice if `to` is a contract, and the returned `implementer` is not address(0) => call `tokensReceived` hook
         */

        if (implementer != address(0)) {
            IERC777Recipient(implementer).tokensReceived(operator, from, to, amount, userData, operatorData);
        } else if (requireReceptionAck) {
            /**
             * @notice to.code.length > 0 checks if the address `to` is a contract thanks to the use of extcodesize/address.code.length
             */
            require(!(to.code.length > 0), "ERC777: token recipient contract has no implementer for ERC777TokensRecipient");
        }
    }

    /**
     * @dev Hook that is called before any token transfer. This includes
     * calls to {send}, {transfer}, {operatorSend}, {transferFrom}, minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be to transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     */
    function _beforeTokenTransfer(address operator, address from, address to, uint256 amount) internal virtual {}
}
// Filename: contracts/openzeppelin/ERC-777/hooks/ERC777RecipientHookImpl.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC777Recipient.sol";
import "@openzeppelin/contracts/interfaces/IERC1820Implementer.sol";

contract ERC777RecipientHookImpl is IERC777Recipient, IERC1820Implementer{

    /**
     * @dev hash of ERC1820_ACCEPT_MAGIC
     *
     * @notice required by ERC1820
     */
    bytes32 internal constant ERC1820_ACCEPT_MAGIC = keccak256(abi.encodePacked("ERC1820_ACCEPT_MAGIC"));

    /**
     * @dev Emitted when tokensReceived hook is called
     */
    event ERC777RecipientHook(address operator, address from, address to, uint256 amount, bytes userData, bytes operatorData);
    

    /**
     * @dev Called by an {IERC777} token contract whenever tokens are being
     * moved or created into a registered account (`to`). The type of operation
     * is conveyed by `from` being the zero address or not.
     *
     * This call occurs _after_ the token contract's state is updated, so
     * {IERC777-balanceOf}, etc., can be used to query the post-operation state.
     *
     * @notice this function may be overriden to implement more logic
     */
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external virtual {
        emit ERC777RecipientHook(operator, from, to, amount, userData, operatorData);
    }

    /**
     * @dev {see IERC1820Implementer-canImplementInterfaceForAddress}
     */
    function canImplementInterfaceForAddress(bytes32, address) external pure returns (bytes32) {
        return ERC1820_ACCEPT_MAGIC;
    }
}
// Filename: contracts/openzeppelin/ERC-777/hooks/ERC777SenderHookImpl.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC777Sender.sol";
import "@openzeppelin/contracts/interfaces/IERC1820Implementer.sol";

contract ERC777SenderHookImpl is IERC777Sender, IERC1820Implementer{

    /**
     * @dev hash of ERC1820_ACCEPT_MAGIC
     *
     * @notice required by ERC1820
     */
    bytes32 internal constant ERC1820_ACCEPT_MAGIC = keccak256(abi.encodePacked("ERC1820_ACCEPT_MAGIC"));

    /**
     * @dev Emitted when tokensReceived hook is called
     */
    event ERC777SenderHook(address operator, address from, address to, uint256 amount, bytes userData, bytes operatorData);

    /**
     * @dev Called by an {IERC777} token contract whenever tokens are being
     * moved or created into a registered account (`to`). The type of operation
     * is conveyed by `from` being the zero address or not.
     *
     * This call occurs _after_ the token contract's state is updated, so
     * {IERC777-balanceOf}, etc., can be used to query the post-operation state.
     *
     * @notice this function may be overriden to implement more logic
     */
    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external virtual {
        emit ERC777SenderHook(operator, from, to, amount, userData, operatorData);
    }

    /**
     * @dev {see IERC1820Implementer-canImplementInterfaceForAddress}
     */
    function canImplementInterfaceForAddress(bytes32, address) external pure returns (bytes32) {
        return ERC1820_ACCEPT_MAGIC;
    }
}
// Filename: contracts/openzeppelin/ERC-777/introspection/ERC1820Registry.sol
// SPDX-License-Identifier: Apache-2.0
/* ERC1820 Pseudo-introspection Registry Contract
 * This standard defines a universal registry smart contract where any address (contract or regular account) can
 * register which interface it supports and which smart contract is responsible for its implementation.
 *
 * Written in 2019 by Jordi Baylina and Jacques Dafflon
 *
 * To the extent possible under law, the author(s) have dedicated all copyright and related and neighboring rights to
 * this software to the public domain worldwide. This software is distributed without any warranty.
 *
 * You should have received a copy of the CC0 Public Domain Dedication along with this software. If not, see
 * <http://creativecommons.org/publicdomain/zero/1.0/>.
 *
 *    ███████╗██████╗  ██████╗ ██╗ █████╗ ██████╗  ██████╗
 *    ██╔════╝██╔══██╗██╔════╝███║██╔══██╗╚════██╗██╔═████╗
 *    █████╗  ██████╔╝██║     ╚██║╚█████╔╝ █████╔╝██║██╔██║
 *    ██╔══╝  ██╔══██╗██║      ██║██╔══██╗██╔═══╝ ████╔╝██║
 *    ███████╗██║  ██║╚██████╗ ██║╚█████╔╝███████╗╚██████╔╝
 *    ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝ ╚════╝ ╚══════╝ ╚═════╝
 *
 *    ██████╗ ███████╗ ██████╗ ██╗███████╗████████╗██████╗ ██╗   ██╗
 *    ██╔══██╗██╔════╝██╔════╝ ██║██╔════╝╚══██╔══╝██╔══██╗╚██╗ ██╔╝
 *    ██████╔╝█████╗  ██║  ███╗██║███████╗   ██║   ██████╔╝ ╚████╔╝
 *    ██╔══██╗██╔══╝  ██║   ██║██║╚════██║   ██║   ██╔══██╗  ╚██╔╝
 *    ██║  ██║███████╗╚██████╔╝██║███████║   ██║   ██║  ██║   ██║
 *    ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝
 *
 */
pragma solidity ^0.8.20;
// IV is value needed to have a vanity address starting with '0x1820'.
// IV: 53759

/// @dev The interface a contract MUST implement if it is the implementer of
/// some (other) interface for any address other than itself.
interface ERC1820ImplementerInterface {
    /// @notice Indicates whether the contract implements the interface 'interfaceHash' for the address 'addr' or not.
    /// @param interfaceHash keccak256 hash of the name of the interface
    /// @param addr Address for which the contract will implement the interface
    /// @return ERC1820_ACCEPT_MAGIC only if the contract implements 'interfaceHash' for the address 'addr'.
    function canImplementInterfaceForAddress(bytes32 interfaceHash, address addr) external view returns(bytes32);
}


/// @title ERC1820 Pseudo-introspection Registry Contract
/// @author Jordi Baylina and Jacques Dafflon
/// @notice This contract is the official implementation of the ERC1820 Registry.
/// @notice For more details, see https://eips.ethereum.org/EIPS/eip-1820
contract ERC1820Registry {
    /// @notice ERC165 Invalid ID.
    bytes4 constant internal INVALID_ID = 0xffffffff;
    /// @notice Method ID for the ERC165 supportsInterface method (= `bytes4(keccak256('supportsInterface(bytes4)'))`).
    bytes4 constant internal ERC165ID = 0x01ffc9a7;
    /// @notice Magic value which is returned if a contract implements an interface on behalf of some other address.
    bytes32 constant internal ERC1820_ACCEPT_MAGIC = keccak256(abi.encodePacked("ERC1820_ACCEPT_MAGIC"));

    /// @notice mapping from addresses and interface hashes to their implementers.
    mapping(address => mapping(bytes32 => address)) internal interfaces;
    /// @notice mapping from addresses to their manager.
    mapping(address => address) internal managers;
    /// @notice flag for each address and erc165 interface to indicate if it is cached.
    mapping(address => mapping(bytes4 => bool)) internal erc165Cached;

    /// @notice Indicates a contract is the 'implementer' of 'interfaceHash' for 'addr'.
    event InterfaceImplementerSet(address indexed addr, bytes32 indexed interfaceHash, address indexed implementer);
    /// @notice Indicates 'newManager' is the address of the new manager for 'addr'.
    event ManagerChanged(address indexed addr, address indexed newManager);

    /// @notice Query if an address implements an interface and through which contract.
    /// @param _addr Address being queried for the implementer of an interface.
    /// (If '_addr' is the zero address then 'msg.sender' is assumed.)
    /// @param _interfaceHash Keccak256 hash of the name of the interface as a string.
    /// E.g., 'web3.utils.keccak256("ERC777TokensRecipient")' for the 'ERC777TokensRecipient' interface.
    /// @return The address of the contract which implements the interface '_interfaceHash' for '_addr'
    /// or '0' if '_addr' did not register an implementer for this interface.
    function getInterfaceImplementer(address _addr, bytes32 _interfaceHash) external view returns (address) {
        address addr = _addr == address(0) ? msg.sender : _addr;
        if (isERC165Interface(_interfaceHash)) {
            bytes4 erc165InterfaceHash = bytes4(_interfaceHash);
            return implementsERC165Interface(addr, erc165InterfaceHash) ? addr : address(0);
        }
        return interfaces[addr][_interfaceHash];
    }

    /// @notice Sets the contract which implements a specific interface for an address.
    /// Only the manager defined for that address can set it.
    /// (Each address is the manager for itself until it sets a new manager.)
    /// @param _addr Address for which to set the interface.
    /// (If '_addr' is the zero address then 'msg.sender' is assumed.)
    /// @param _interfaceHash Keccak256 hash of the name of the interface as a string.
    /// E.g., 'web3.utils.keccak256("ERC777TokensRecipient")' for the 'ERC777TokensRecipient' interface.
    /// @param _implementer Contract address implementing '_interfaceHash' for '_addr'.
    function setInterfaceImplementer(address _addr, bytes32 _interfaceHash, address _implementer) external {
        address addr = _addr == address(0) ? msg.sender : _addr;
        require(getManager(addr) == msg.sender, "Not the manager");

        require(!isERC165Interface(_interfaceHash), "Must not be an ERC165 hash");
        if (_implementer != address(0) && _implementer != msg.sender) {
            require(
                ERC1820ImplementerInterface(_implementer)
                    .canImplementInterfaceForAddress(_interfaceHash, addr) == ERC1820_ACCEPT_MAGIC,
                "Does not implement the interface"
            );
        }
        interfaces[addr][_interfaceHash] = _implementer;
        emit InterfaceImplementerSet(addr, _interfaceHash, _implementer);
    }

    /// @notice Sets '_newManager' as manager for '_addr'.
    /// The new manager will be able to call 'setInterfaceImplementer' for '_addr'.
    /// @param _addr Address for which to set the new manager.
    /// @param _newManager Address of the new manager for 'addr'. (Pass '0x0' to reset the manager to '_addr'.)
    function setManager(address _addr, address _newManager) external {
        require(getManager(_addr) == msg.sender, "Not the manager");
        managers[_addr] = _newManager == _addr ? address(0) : _newManager;
        emit ManagerChanged(_addr, _newManager);
    }

    /// @notice Get the manager of an address.
    /// @param _addr Address for which to return the manager.
    /// @return Address of the manager for a given address.
    function getManager(address _addr) public view returns(address) {
        // By default the manager of an address is the same address
        if (managers[_addr] == address(0)) {
            return _addr;
        } else {
            return managers[_addr];
        }
    }

    /// @notice Compute the keccak256 hash of an interface given its name.
    /// @param _interfaceName Name of the interface.
    /// @return The keccak256 hash of an interface name.
    function interfaceHash(string calldata _interfaceName) external pure returns(bytes32) {
        return keccak256(abi.encodePacked(_interfaceName));
    }

    /* --- ERC165 Related Functions --- */
    /* --- Developed in collaboration with William Entriken. --- */

    /// @notice Updates the cache with whether the contract implements an ERC165 interface or not.
    /// @param _contract Address of the contract for which to update the cache.
    /// @param _interfaceId ERC165 interface for which to update the cache.
    function updateERC165Cache(address _contract, bytes4 _interfaceId) external {
        interfaces[_contract][_interfaceId] = implementsERC165InterfaceNoCache(
            _contract, _interfaceId) ? _contract : address(0);
        erc165Cached[_contract][_interfaceId] = true;
    }

    /// @notice Checks whether a contract implements an ERC165 interface or not.
    //  If the result is not cached a direct lookup on the contract address is performed.
    //  If the result is not cached or the cached value is out-of-date, the cache MUST be updated manually by calling
    //  'updateERC165Cache' with the contract address.
    /// @param _contract Address of the contract to check.
    /// @param _interfaceId ERC165 interface to check.
    /// @return True if '_contract' implements '_interfaceId', false otherwise.
    function implementsERC165Interface(address _contract, bytes4 _interfaceId) public view returns (bool) {
        if (!erc165Cached[_contract][_interfaceId]) {
            return implementsERC165InterfaceNoCache(_contract, _interfaceId);
        }
        return interfaces[_contract][_interfaceId] == _contract;
    }

    /// @notice Checks whether a contract implements an ERC165 interface or not without using nor updating the cache.
    /// @param _contract Address of the contract to check.
    /// @param _interfaceId ERC165 interface to check.
    /// @return True if '_contract' implements '_interfaceId', false otherwise.
    function implementsERC165InterfaceNoCache(address _contract, bytes4 _interfaceId) public view returns (bool) {
        uint256 success;
        uint256 result;

        (success, result) = noThrowCall(_contract, ERC165ID);
        if (success == 0 || result == 0) {
            return false;
        }

        (success, result) = noThrowCall(_contract, INVALID_ID);
        if (success == 0 || result != 0) {
            return false;
        }

        (success, result) = noThrowCall(_contract, _interfaceId);
        if (success == 1 && result == 1) {
            return true;
        }
        return false;
    }

    /// @notice Checks whether the hash is a ERC165 interface (ending with 28 zeroes) or not.
    /// @param _interfaceHash The hash to check.
    /// @return True if '_interfaceHash' is an ERC165 interface (ending with 28 zeroes), false otherwise.
    function isERC165Interface(bytes32 _interfaceHash) internal pure returns (bool) {
        return _interfaceHash & 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF == 0;
    }

    /// @dev Make a call on a contract without throwing if the function does not exist.
    function noThrowCall(address _contract, bytes4 _interfaceId)
        internal view returns (uint256 success, uint256 result)
    {
        bytes4 erc165ID = ERC165ID;

        assembly {
            let x := mload(0x40)               // Find empty storage location using "free memory pointer"
            mstore(x, erc165ID)                // Place signature at beginning of empty storage
            mstore(add(x, 0x04), _interfaceId) // Place first argument directly next to signature

            success := staticcall(
                30000,                         // 30k gas
                _contract,                     // To addr
                x,                             // Inputs are stored at location x
                0x24,                          // Inputs are 36 (4 + 32) bytes long
                x,                             // Store output over input (saves space)
                0x20                           // Outputs are 32 bytes long
            )

            result := mload(x)                 // Load the result
        }
    }
}
// Filename: contracts/openzeppelin/Pausable/Pausable.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";

contract PausableTest is Pausable {
    string public message;

    function setPausedMessage(string calldata _message) external whenNotPaused {
        message = _message;
    }

    function getPausedMessage() external view whenPaused returns (string memory) {
        return message;
    }

    function pause() external {
        _pause();
    }

    function unpause() external {
        _unpause();
    }
}// Filename: contracts/openzeppelin/access-control/AccessControlContract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AccessControlContract is AccessControl {
    // Define roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    constructor() {
        // Assign the deployer (msg.sender) the admin role
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // Function that can only be called by users with the admin role
    function adminFunction() public view onlyRole(ADMIN_ROLE) returns (string memory) {
        return "This function can only be called by administrators";
    }

    // Function that can only be called by users with the manager role
    function managerFunction() public view onlyRole(MANAGER_ROLE) returns (string memory) {
        return "This function can only be called by managers";
    }

    // Function to grant the manager role to an address
    function grantManagerRole(address account) public onlyRole(ADMIN_ROLE) {
        _grantRole(MANAGER_ROLE, account);
    }
}
// Filename: contracts/openzeppelin/beacon-proxy/LogicContractV1.sol
// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

contract LogicContractV1 {
    uint256 private value;
    event Value(uint256 value);
    event ValueChanged(uint256 newValue);

    constructor(uint256 _value) {
        value = _value;
    }

    // Stores a new value in the contract
    function store(uint256 _newValue) public {
        value = _newValue;
        emit ValueChanged(_newValue);
    }

    // Reads the last stored value
    function retrieve() public returns (uint256) {
        emit Value(value);
        return value;
    }

    // returns the square of the _input
    function square(uint256 _input) public pure returns (uint256) {
        return _input; // implementation error
    }
}
// Filename: contracts/openzeppelin/beacon-proxy/LogicContractV2.sol
// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

contract LogicContractV2 {
    uint256 private value;
    event Value(uint256 value);
    event ValueChanged(uint256 newValue);
    event Squared(uint256 squaredValue);

    constructor(uint256 _value) {
        value = _value;
    }

    // Stores a new value in the contract
    function store(uint256 _newValue) public {
        value = _newValue;
        emit ValueChanged(_newValue);
    }

    // Reads the last stored value
    function retrieve() public returns (uint256) {
        emit Value(value);
        return value;
    }

    // returns the square of the _input
    function square(uint256 _input) public returns (uint256) {
        emit Squared(_input * _input);
        return _input * _input;
    }
}
// Filename: contracts/openzeppelin/beacon-proxy/MyBeacon.sol
//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

contract MyBeacon is UpgradeableBeacon {

    constructor(address implementation_, address owner) UpgradeableBeacon(implementation_, owner) {}
}
// Filename: contracts/openzeppelin/beacon-proxy/MyProxy.sol
//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

/// @notice Beacon proxy using the Ticket contract as its implementation
contract MyProxy is BeaconProxy {
    /// @notice Simply passes the beacon address without any additional data to superior constructor
    constructor(address _beacon) payable BeaconProxy(_beacon, "") {}

    /// @return address The beacon managing the implementation of this proxy
    function beacon() public view returns (address) {
        return _getBeacon();
    }

    /// @return address The address of current implementation
    function implementation() public view returns (address) {
        return _implementation();
    }

    /// @notice required by Solidity
    receive() external payable {}
}
// Filename: contracts/openzeppelin/create2/ContractCreatorOZCreate2.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Create2.sol";

contract ContractCreatorOZCreate2 {
    constructor() payable{}

    event NewContractDeployedAt(address addr);

    function deploy(uint256 amount, uint256 salt, bytes memory bytecode) external {
        address addr = Create2.deploy(amount, bytes32(salt), bytecode);

        emit NewContractDeployedAt(addr);
    }

    function computeAddress(uint256 salt, bytes32 bytecodeHash) external view returns (address addr) {
        addr = Create2.computeAddress(bytes32(salt), bytecodeHash);
    }
}
// Filename: contracts/openzeppelin/finance/VestingWallet.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @dev A vesting wallet is an ownable contract that can receive native currency and ERC20 tokens, and release these
 * assets to the wallet owner, also referred to as "beneficiary", according to a vesting schedule.
 *
 * Any assets transferred to this contract will follow the vesting schedule as if they were locked from the beginning.
 * Consequently, if the vesting has already started, any amount of tokens sent to this contract will (at least partly)
 * be immediately releasable.
 *
 * By setting the duration to 0, one can configure this contract to behave like an asset timelock that hold tokens for
 * a beneficiary until a specified time.
 *
 * NOTE: Since the wallet is {Ownable}, and ownership can be transferred, it is possible to sell unvested tokens.
 * Preventing this in a smart contract is difficult, considering that: 1) a beneficiary address could be a
 * counterfactually deployed contract, 2) there is likely to be a migration path for EOAs to become contracts in the
 * near future.
 *
 * NOTE: When using this contract with any token whose balance is adjusted automatically (i.e. a rebase token), make
 * sure to account the supply/balance adjustment in the vesting schedule to ensure the vested amount is as intended.
 */
contract VestingWallet is Context, Ownable {
    event HbarReleased(address receiver, uint256 amount);
    event ERC20Released(address receiver, address indexed token, uint256 amount);

    uint256 private _released;
    mapping(address token => uint256) private _erc20Released;
    uint64 private immutable _start;
    uint64 private immutable _duration;

    /**
     * @dev Sets the sender as the initial owner, the beneficiary as the pending owner, the start timestamp and the
     * vesting duration of the vesting wallet.
     */
    constructor(address beneficiary, uint64 startTimestamp, uint64 durationSeconds) payable Ownable(beneficiary) {
        _start = startTimestamp;
        _duration = durationSeconds;
    }

    /**
     * @dev The contract should be able to receive native token.
     */
    receive() external payable virtual {}

    /**
     * @dev Getter for the start timestamp.
     */
    function start() public view virtual returns (uint256) {
        return _start;
    }

    /**
     * @dev Getter for the vesting duration.
     */
    function duration() public view virtual returns (uint256) {
        return _duration;
    }

    /**
     * @dev Getter for the end timestamp.
     */
    function end() public view virtual returns (uint256) {
        return start() + duration();
    }

    /**
     * @dev Amount of hbar already released
     */
    function released() public view virtual returns (uint256) {
        return _released;
    }

    /**
     * @dev Amount of token already released
     */
    function released(address token) public view virtual returns (uint256) {
        return _erc20Released[token];
    }

    /**
     * @dev Getter for the amount of releasable hbar.
     */
    function releasable() public view virtual returns (uint256) {
        return vestedAmount(uint64(block.timestamp)) - released();
    }

    /**
     * @dev Getter for the amount of releasable `token` tokens. `token` should be the address of an
     * IERC20 contract.
     */
    function releasable(address token) public view virtual returns (uint256) {
        return vestedAmount(token, uint64(block.timestamp)) - released(token);
    }

    /**
     * @dev Release the native token (hbar) that have already vested.
     *
     * Emits a {HbarReleased} event.
     */
    function release() public virtual {
        uint256 amount = releasable();
        _released += amount;
        emit HbarReleased(owner(), amount);
        Address.sendValue(payable(owner()), amount);
    }

    /**
     * @dev Release the tokens that have already vested.
     *
     * Emits a {ERC20Released} event.
     */
    function release(address token) public virtual {
        uint256 amount = releasable(token);
        _erc20Released[token] += amount;
        emit ERC20Released(owner(), token, amount);
        SafeERC20.safeTransfer(IERC20(token), owner(), amount);
    }

    /**
     * @dev Calculates the amount of hbar that has already vested. Default implementation is a linear vesting curve.
     */
    function vestedAmount(uint64 timestamp) public view virtual returns (uint256) {
        return _vestingSchedule(address(this).balance + released(), timestamp);
    }

    /**
     * @dev Calculates the amount of tokens that has already vested. Default implementation is a linear vesting curve.
     */
    function vestedAmount(address token, uint64 timestamp) public view virtual returns (uint256) {
        return _vestingSchedule(IERC20(token).balanceOf(address(this)) + released(token), timestamp);
    }

    /**
     * @dev Virtual implementation of the vesting formula. This returns the amount vested, as a function of time, for
     * an asset given its total historical allocation.
     */
    function _vestingSchedule(uint256 totalAllocation, uint64 timestamp) internal view virtual returns (uint256) {
        if (timestamp < start()) {
            return 0;
        } else if (timestamp >= end()) {
            return totalAllocation;
        } else {
            return (totalAllocation * (timestamp - start())) / duration();
        }
    }

    function getCurrentTimestamp() external view returns (uint256 timestamp) {
        timestamp = block.timestamp;
    }
}// Filename: contracts/openzeppelin/governor/ExampleGovernor.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";

contract ExampleGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction {
    constructor(IVotes _token)
        Governor("ExampleGovernor")
        GovernorSettings(0 /* 1 second */, 2 /* 2 blocks */, 0)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(1)
    {}

    // The following functions are overrides required by Solidity.

    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }
}
// Filename: contracts/openzeppelin/governor/ExampleTokenVote.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";


contract ExampleTokenVote is ERC20, ERC20Permit, ERC20Votes, Ownable {
    constructor() ERC20("ExampleToken", "EXM") ERC20Permit("ExampleToken") Ownable(msg.sender){}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }    

    function _update(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._update(from, to, amount);
    }

    function nonces(address owner) public view virtual override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
// Filename: contracts/openzeppelin/multicall/MulticallTest.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Multicall.sol";

contract MulticallTest is Multicall {
    function foo() public pure returns (uint256) {
        return 123;
    }

    function bar() public pure returns (uint256) {
        return 456;
    }
}
// Filename: contracts/openzeppelin/ownable/CrowdFund.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract CrowdFund is Context, Ownable {
    /// STATE
    uint256 private _balance;

    /// EVENTS
    event Deposit(address depositer, uint256 amount);
    event Withdraw(address withdrawer, uint256 amount);

    /// ERRORS
    error InsufficientBalance(uint256 balance);
    error WithdrawlError(uint256 amount);

    /// CONSTRUCTOR
    constructor(address _owner) Ownable(_owner) {}

    /**
     * @dev Allows any funder to fund this contract with arbitary amount
     */
    function deposit() external payable {
        _balance += msg.value;
        emit Deposit(_msgSender(), msg.value);
    }

    /**
     * @dev Allows the owner of the contract to withdraw a specific amount
     *
     * @param amount The amount to be withdrawn
     */
    function withdraw(uint256 amount) external onlyOwner {
        /// check
        if (amount > _balance) {
            revert InsufficientBalance(_balance);
        }

        /// effect
        _balance -= amount;

        /// interaction
        (bool success,) = _msgSender().call{value: amount}("");
        if (!success)  {
            revert WithdrawlError(amount);
        }

        /// emit event
        emit Withdraw(_msgSender(), amount);
    }

    /**
     * @dev Returns the current contract balance
     */
    function balance() external view returns(uint256) {
        return _balance;
    }
}// Filename: contracts/openzeppelin/proxy-upgrade/counter/Counter.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Counter is OwnableUpgradeable, UUPSUpgradeable {
    string public name;
    int256 public count;

    using Math for int256;

    function initialize(string memory _name) public initializer {
        name = _name;
        __Ownable_init(msg.sender);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function decrement() public returns (int256) {
        count--;
        return count;
    }

    function increment() public returns (int256) {
        count++;
        return count;
    }
}
// Filename: contracts/openzeppelin/proxy-upgrade/counter/CounterV2.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

import "./Counter.sol";

contract CounterV2 is Counter {
    function changeName(string memory _name) public {
        name = _name;
    }
}
// Filename: contracts/openzeppelin/proxy-upgrade/exchange/Exchange.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../../../system-contracts/hedera-token-service/IHederaTokenService.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../../system-contracts/HederaResponseCodes.sol";

contract Exchange is OwnableUpgradeable, UUPSUpgradeable {
    address public tokenAddress;
    address constant private precompile = address(0x167);

    function initialize(address token) public initializer {
        tokenAddress = token;
        __Ownable_init(msg.sender);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function deposit() public payable {
        require(msg.value > 0, "You have to deposit more than 0.");
    }

    function depositTokens(int64 amount) public returns (int responseCode) {
        require(amount > 0, "You have to deposit more than 0.");
        (bool success, bytes memory result) = precompile.call(
            abi.encodeWithSelector(
                IHederaTokenService.transferToken.selector,
                tokenAddress,
                msg.sender,
                address(this),
                amount
            )
        );
        responseCode = success
            ? abi.decode(result, (int32))
            : HederaResponseCodes.UNKNOWN;

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function buy() public payable {
        uint256 amountTobuy = msg.value;
        uint256 dexBalance = IERC20(tokenAddress).balanceOf(address(this));
        require(amountTobuy > 0, "You need to send some HBAR.");
        require(amountTobuy <= dexBalance, "Not enough tokens in the reserve.");
        IERC20(tokenAddress).transfer(msg.sender, amountTobuy);
    }

    function sell(uint256 amount) public {
        require(amount > 0, "You need to sell at least some tokens");
        uint256 approvedAmt = IERC20(tokenAddress).allowance(
            msg.sender,
            address(this)
        );
        require(approvedAmt >= amount, "Check the token allowance");
        IERC20(tokenAddress).transferFrom(
            msg.sender,
            payable(address(this)),
            amount
        );
        payable(msg.sender).transfer(amount);
    }

    function getNativeBalance() public view returns (uint) {
        return address(this).balance;
    }

    function getTokenBalance() public view returns (uint) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    function getImplementationAddress() public view returns (address) {
        return ERC1967Utils.getImplementation();
    }

    function associateToken() public returns (int responseCode) {
        (bool success, bytes memory result) = precompile.call(
            abi.encodeWithSelector(
                IHederaTokenService.associateToken.selector,
                address(this),
                tokenAddress
            )
        );
        responseCode = success
            ? abi.decode(result, (int32))
            : HederaResponseCodes.UNKNOWN;

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }
}
// Filename: contracts/openzeppelin/proxy-upgrade/exchange/ExchangeV2.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

import "./Exchange.sol";

contract ExchangeV2 is Exchange {
    function version() public pure returns (string memory) {
        return "V2";
    }
}
// Filename: contracts/openzeppelin/reentrancy-guard/ReentrancyGuardTestReceiver.sol
//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./ReentrancyGuardTestSender.sol";

contract ReentrancyGuardTestReceiver {
    ReentrancyGuardTestSender public reentrancyGuardTestSender;
    bool nonReentrant = false;

    constructor (address payable _reentrancyGuardTestSender) {
        reentrancyGuardTestSender = ReentrancyGuardTestSender(_reentrancyGuardTestSender);
    }

    receive() external payable {
        if(address(msg.sender).balance >= 100000000 && !nonReentrant) {
            reentrancyGuardTestSender.reentrancyTest();
        } else if (nonReentrant) {
            reentrancyGuardTestSender.reentrancyTestNonReentrant();
        }
    }

    function attack() external payable {
        reentrancyGuardTestSender.reentrancyTest();
    }

    function attackNonReentrant() external payable {
        reentrancyGuardTestSender.reentrancyTestNonReentrant();
    }

    function setNonReentrant(bool _nonReentrant) external {
        nonReentrant = _nonReentrant;
    }
}
// Filename: contracts/openzeppelin/reentrancy-guard/ReentrancyGuardTestSender.sol
//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./ReentrancyGuardTestReceiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ReentrancyGuardTestSender is ReentrancyGuard {
    uint256 public counter = 0;

    constructor() payable {}

    function reentrancyTest() external {
        counter = counter + 1;
        (bool sent,) = msg.sender.call{value: 100000000}("");
        require(sent);
    }

    function reentrancyTestNonReentrant() external nonReentrant {
        counter = counter + 1;
        (bool sent,) = msg.sender.call{value: 100000000}("");
        require(!sent);
    }

    receive() external payable {}
}
// Filename: contracts/openzeppelin/safe-cast/SafeCast.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract SafeCastTest {
    uint256 maxUint256 = type(uint256).max;
    uint248 maxUint248 = type(uint248).max;
    uint240 maxUint240 = type(uint240).max;
    uint232 maxUint232 = type(uint232).max;
    uint224 maxUint224 = type(uint224).max;
    uint216 maxUint216 = type(uint216).max;
    uint208 maxUint208 = type(uint208).max;
    uint200 maxUint200 = type(uint200).max;
    uint192 maxUint192 = type(uint192).max;
    uint184 maxUint184 = type(uint184).max;
    uint176 maxUint176 = type(uint176).max;
    uint168 maxUint168 = type(uint168).max;
    uint160 maxUint160 = type(uint160).max;
    uint152 maxUint152 = type(uint152).max;
    uint144 maxUint144 = type(uint144).max;
    uint136 maxUint136 = type(uint136).max;
    uint128 maxUint128 = type(uint128).max;
    uint120 maxUint120 = type(uint120).max;
    uint112 maxUint112 = type(uint112).max;
    uint104 maxUint104 = type(uint104).max;
    uint96 maxUint96 = type(uint96).max;
    uint88 maxUint88 = type(uint88).max;
    uint80 maxUint80 = type(uint80).max;
    uint72 maxUint72 = type(uint72).max;
    uint64 maxUint64 = type(uint64).max;
    uint56 maxUint56 = type(uint56).max;
    uint48 maxUint48 = type(uint48).max;
    uint40 maxUint40 = type(uint40).max;
    uint32 maxUint32 = type(uint32).max;
    uint24 maxUint24 = type(uint24).max;
    uint16 maxUint16 = type(uint16).max;
    uint8 maxUint8 = type(uint8).max;

    int256 maxInt256 = type(int256).max;
    int248 maxInt248 = type(int248).max;
    int240 maxInt240 = type(int240).max;
    int232 maxInt232 = type(int232).max;
    int224 maxInt224 = type(int224).max;
    int216 maxInt216 = type(int216).max;
    int208 maxInt208 = type(int208).max;
    int200 maxInt200 = type(int200).max;
    int192 maxInt192 = type(int192).max;
    int184 maxInt184 = type(int184).max;
    int176 maxInt176 = type(int176).max;
    int168 maxInt168 = type(int168).max;
    int160 maxInt160 = type(int160).max;
    int152 maxInt152 = type(int152).max;
    int144 maxInt144 = type(int144).max;
    int136 maxInt136 = type(int136).max;
    int128 maxInt128 = type(int128).max;
    int120 maxInt120 = type(int120).max;
    int112 maxInt112 = type(int112).max;
    int104 maxInt104 = type(int104).max;
    int96 maxInt96 = type(int96).max;
    int88 maxInt88 = type(int88).max;
    int80 maxInt80 = type(int80).max;
    int72 maxInt72 = type(int72).max;
    int64 maxInt64 = type(int64).max;
    int56 maxInt56 = type(int56).max;
    int48 maxInt48 = type(int48).max;
    int40 maxInt40 = type(int40).max;
    int32 maxInt32 = type(int32).max;
    int24 maxInt24 = type(int24).max;
    int16 maxInt16 = type(int16).max;
    int8 maxInt8 = type(int8).max;

    function toUint256(int256 number) public pure returns (uint256) {
        return SafeCast.toUint256(number);
    }

    function toUint248(uint256 number) public view returns (uint248) {
        return SafeCast.toUint248(maxUint248 + number);
    }

    function toUint240(uint256 number) public view returns (uint240) {
        return SafeCast.toUint240(maxUint240 + number);
    }

    function toUint232(uint256 number) public view returns (uint232) {
        return SafeCast.toUint232(maxUint232 + number);
    }

    function toUint224(uint256 number) public view returns (uint224) {
        return SafeCast.toUint224(maxUint224 + number);
    }

    function toUint216(uint256 number) public view returns (uint216) {
        return SafeCast.toUint216(maxUint216 + number);
    }

    function toUint208(uint256 number) public view returns (uint208) {
        return SafeCast.toUint208(maxUint208 + number);
    }

    function toUint200(uint256 number) public view returns (uint200) {
        return SafeCast.toUint200(maxUint200 + number);
    }

    function toUint192(uint256 number) public view returns (uint192) {
        return SafeCast.toUint192(maxUint192 + number);
    }

    function toUint184(uint256 number) public view returns (uint184) {
        return SafeCast.toUint184(maxUint184 + number);
    }

    function toUint176(uint256 number) public view returns (uint176) {
        return SafeCast.toUint176(maxUint176 + number);
    }

    function toUint168(uint256 number) public view returns (uint168) {
        return SafeCast.toUint168(maxUint168 + number);
    }

    function toUint160(uint256 number) public view returns (uint160) {
        return SafeCast.toUint160(maxUint160 + number);
    }

    function toUint152(uint256 number) public view returns (uint152) {
        return SafeCast.toUint152(maxUint152 + number);
    }

    function toUint144(uint256 number) public view returns (uint144) {
        return SafeCast.toUint144(maxUint144 + number);
    }

    function toUint136(uint256 number) public view returns (uint136) {
        return SafeCast.toUint136(maxUint136 + number);
    }

    function toUint128(uint256 number) public view returns (uint128) {
        return SafeCast.toUint128(maxUint128 + number);
    }

    function toUint120(uint256 number) public view returns (uint120) {
        return SafeCast.toUint120(maxUint120 + number);
    }

    function toUint112(uint256 number) public view returns (uint112) {
        return SafeCast.toUint112(maxUint112 + number);
    }

    function toUint104(uint256 number) public view returns (uint104) {
        return SafeCast.toUint104(maxUint104 + number);
    }

    function toUint96(uint256 number) public view returns (uint96) {
        return SafeCast.toUint96(maxUint96 + number);
    }

    function toUint88(uint256 number) public view returns (uint88) {
        return SafeCast.toUint88(maxUint88 + number);
    }

    function toUint80(uint256 number) public view returns (uint80) {
        return SafeCast.toUint80(maxUint80 + number);
    }

    function toUint72(uint256 number) public view returns (uint72) {
        return SafeCast.toUint72(maxUint72 + number);
    }

    function toUint64(uint256 number) public view returns (uint64) {
        return SafeCast.toUint64(maxUint64 + number);
    }

    function toUint56(uint256 number) public view returns (uint56) {
        return SafeCast.toUint56(maxUint56 + number);
    }

    function toUint48(uint256 number) public view returns (uint48) {
        return SafeCast.toUint48(maxUint48 + number);
    }

    function toUint40(uint256 number) public view returns (uint40) {
        return SafeCast.toUint40(maxUint40 + number);
    }

    function toUint32(uint256 number) public view returns (uint32) {
        return SafeCast.toUint32(maxUint32 + number);
    }

    function toUint24(uint256 number) public view returns (uint24) {
        return SafeCast.toUint24(maxUint24 + number);
    }

    function toUint16(uint256 number) public view returns (uint16) {
        return SafeCast.toUint16(maxUint16 + number);
    }

    function toUint8(uint256 number) public view returns (uint8) {
        return SafeCast.toUint8(maxUint8 + number);
    }

    function toInt248(int256 number) public view returns (int248) {
        return SafeCast.toInt248(maxInt248 + number);
    }

    function toInt240(int256 number) public view returns (int240) {
        return SafeCast.toInt240(maxInt240 + number);
    }

    function toInt232(int256 number) public view returns (int232) {
        return SafeCast.toInt232(maxInt232 + number);
    }

    function toInt224(int256 number) public view returns (int224) {
        return SafeCast.toInt224(maxInt224 + number);
    }

    function toInt216(int256 number) public view returns (int216) {
        return SafeCast.toInt216(maxInt216 + number);
    }

    function toInt208(int256 number) public view returns (int208) {
        return SafeCast.toInt208(maxInt208 + number);
    }

    function toInt200(int256 number) public view returns (int200) {
        return SafeCast.toInt200(maxInt200 + number);
    }

    function toInt192(int256 number) public view returns (int192) {
        return SafeCast.toInt192(maxInt192 + number);
    }

    function toInt184(int256 number) public view returns (int184) {
        return SafeCast.toInt184(maxInt184 + number);
    }

    function toInt176(int256 number) public view returns (int176) {
        return SafeCast.toInt176(maxInt176 + number);
    }

    function toInt168(int256 number) public view returns (int168) {
        return SafeCast.toInt168(maxInt168 + number);
    }

    function toInt160(int256 number) public view returns (int160) {
        return SafeCast.toInt160(maxInt160 + number);
    }

    function toInt152(int256 number) public view returns (int152) {
        return SafeCast.toInt152(maxInt152 + number);
    }

    function toInt144(int256 number) public view returns (int144) {
        return SafeCast.toInt144(maxInt144 + number);
    }

    function toInt136(int256 number) public view returns (int136) {
        return SafeCast.toInt136(maxInt136 + number);
    }

    function toInt128(int256 number) public view returns (int128) {
        return SafeCast.toInt128(maxInt128 + number);
    }

    function toInt120(int256 number) public view returns (int120) {
        return SafeCast.toInt120(maxInt120 + number);
    }

    function toInt112(int256 number) public view returns (int112) {
        return SafeCast.toInt112(maxInt112 + number);
    }

    function toInt104(int256 number) public view returns (int104) {
        return SafeCast.toInt104(maxInt104 + number);
    }

    function toInt96(int256 number) public view returns (int96) {
        return SafeCast.toInt96(maxInt96 + number);
    }

    function toInt88(int256 number) public view returns (int88) {
        return SafeCast.toInt88(maxInt88 + number);
    }

    function toInt80(int256 number) public view returns (int80) {
        return SafeCast.toInt80(maxInt80 + number);
    }

    function toInt72(int256 number) public view returns (int72) {
        return SafeCast.toInt72(maxInt72 + number);
    }

    function toInt64(int256 number) public view returns (int64) {
        return SafeCast.toInt64(maxInt64 + number);
    }

    function toInt56(int256 number) public view returns (int56) {
        return SafeCast.toInt56(maxInt56 + number);
    }

    function toInt48(int256 number) public view returns (int48) {
        return SafeCast.toInt48(maxInt48 + number);
    }

    function toInt40(int256 number) public view returns (int40) {
        return SafeCast.toInt40(maxInt40 + number);
    }

    function toInt32(int256 number) public view returns (int32) {
        return SafeCast.toInt32(maxInt32 + number);
    }

    function toInt24(int256 number) public view returns (int24) {
        return SafeCast.toInt24(maxInt24 + number);
    }

    function toInt16(int256 number) public view returns (int16) {
        return SafeCast.toInt16(maxInt16 + number);
    }

    function toInt8(int256 number) public view returns (int8) {
        return SafeCast.toInt8(maxInt8 + number);
    }

    function toInt256(uint256 number) public view returns (int256) {
        return SafeCast.toInt256(uint256(maxInt256) + number);
    }
}
// Filename: contracts/openzeppelin/transparent-upgradeable-proxy/Box.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;
 
contract Box {
    uint256 private value;
 
    // Emitted when the stored value changes
    event ValueChanged(uint256 newValue);
 
    // Stores a new value in the contract
    function store(uint256 newValue) public {
        value = newValue;
        emit ValueChanged(newValue);
    }
 
    // Reads the last stored value
    function retrieve() public view returns (uint256) {
        return value;
    }
}

// Filename: contracts/openzeppelin/transparent-upgradeable-proxy/BoxV2.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;
 
contract BoxV2 {
    uint256 private value;
 
    // Emitted when the stored value changes
    event ValueChanged(uint256 newValue);
 
    // Stores a new value in the contract
    function store(uint256 newValue) public {
        value = newValue;
        emit ValueChanged(newValue);
    }
    
    // Reads the last stored value
    function retrieve() public view returns (uint256) {
        return value;
    }
    
    // Increments the stored value by 1
    function increment() public {
        value = value + 1;
        emit ValueChanged(value);
    }
}
// Filename: contracts/openzeppelin/transparent-upgradeable-proxy/MyCustomTransparentUpgradeableProxy.sol
//SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

//Wrap the OZ contract so it can be instantiated in the hardhat tests
contract MyCustomTransparentUpgradeableProxy is TransparentUpgradeableProxy {
    constructor(address logic, address initialOwner, bytes memory data) TransparentUpgradeableProxy(logic, initialOwner, data) {}
}
// Filename: contracts/openzeppelin/uups-upgradable/VaultV1.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


// @notice: As the state variables are shared and store in a proxy contract's storage, working with low-level assembly code
//          to access directly to the storage is recommended. 
// @notice: Avoid working with state variables among implementation contracts

contract VaultV1 is OwnableUpgradeable, UUPSUpgradeable{
    uint256 private _version;   // slot 0
    uint256 private _totalBalance; // slot 1

    error InsufficientFund();
    event Deposited(address depositor, uint256 amount);
    event Withdrawn(address withdrawer, uint256 amount);

    function initialize() external initializer {
        __Ownable_init(_msgSender());
        assembly {
            sstore(0, 1) // slot 0: _version
        }
    }

    function deposit() external payable {
        assembly {
            sstore(1, add(sload(1), callvalue()))
        }
        emit Deposited(_msgSender(), msg.value);
    }

    function withdraw(uint256 _amount) external virtual onlyOwner {
        if (_amount > totalBalance()) {
            revert InsufficientFund();
        }

        assembly {
            sstore(1, sub(sload(1), _amount))

            let success := call(gas(), caller(), _amount, 0, 0, 0, 0)
            if iszero(success) {
                revert(0,0)
            }
        }

        emit Withdrawn(_msgSender(), _amount);
    }

    function totalBalance() public view returns (uint256 total) {
        assembly {
            total := sload(1)
        }
    }

    function version() external view virtual returns (uint256 currentVersion) {
        assembly {
            currentVersion := sload(0)
        }
    }

    // must have for UUPSUpgradable Proxy
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
// Filename: contracts/openzeppelin/uups-upgradable/VaultV2.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./VaultV1.sol";


// @notice: As the state variables are shared and store in a proxy contract's storage, working with low-level assembly code
//          to access directly to the storage is recommended. 
// @notice: Avoid working with state variables among implementation contracts

contract VaultV2 is VaultV1 {
    uint256 private _version; // slot 0
    uint256 private _totalBalance; // slot 1
    address private _beneficiary; // slot 2

    modifier onlyRightfulBeneficiary() {
        assembly {
            if iszero(eq(caller(), sload(2))) {
                revert(0, 0)
            }
        }
        _;
    }

    function initializeV2(address beneficiary) reinitializer(2) external {
        __Ownable_init(_msgSender());

        assembly{
            sstore(0, 2) // slot 0: _version
            sstore(2, beneficiary) // slot 2: _beneficiary
        }
    }


    function withdraw(uint256 _amount) external override onlyRightfulBeneficiary{
        if (_amount > totalBalance()) {
            revert InsufficientFund();
        }

        assembly {
            sstore(1, sub(sload(1), _amount))
            let success := call(gas(), caller(), _amount, 0, 0, 0, 0)
            if iszero(success) {
                revert(0,0)
            }
        }

        emit Withdrawn(_msgSender(), _amount);
    }

    function getCurrentBeneficiary() public view returns (address beneficiary) {
        assembly {
            beneficiary := sload(2)
        }
    }

    function version() external view override virtual returns (uint256 currentVersion) {
        assembly {
            currentVersion := sload(0)
        }
    }
}
// Filename: contracts/precompile/native/evm-compatibility-ecrecover/EcrecoverCheck.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

/**
 * @dev Converts an unsigned integer to its string representation.
 * @param value The unsigned integer to convert.
 * @return The string representation of the unsigned integer.
 */
function uintToString(uint value) pure returns (string memory) {
  uint length = 1;
  uint v = value;
  while ((v /= 10) != 0) { length++; }
  bytes memory result = new bytes(length);
  while (true) {
    length--;
    result[length] = bytes1(uint8(0x30 + (value % 10)));
    value /= 10;
    if (length == 0) {
        break;
    }
  }
  return string(result);
}

contract EcrecoverCheck {
    function verifySignature(
        string memory message,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (address) {
        bytes memory prefixedMessage = abi.encodePacked(
            "\x19Ethereum Signed Message:\n",
            uintToString(bytes(message).length),
            message
        );
        bytes32 digest = keccak256(prefixedMessage);
        return ecrecover(digest, v, r, s);
    }

    function getSender() public view returns (address) {
        return msg.sender;
    }
}
// Filename: contracts/shanghai-opcodes/ShanghaiOpcodes.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// solc --evm-version shanghai --opcodes ShanghaiOpcodes.sol
// ======= shanghai-opcodes/ShanghaiOpcodes.sol:ShanghaiOpcodes =======
// Opcodes:
// PUSH1 0x80 PUSH1 0x40 MSTORE CALLVALUE DUP1 ISZERO PUSH2 0xF JUMPI PUSH0 DUP1 REVERT JUMPDEST POP PUSH2 0x2F8 DUP1 PUSH2 0x1D PUSH0 CODECOPY PUSH0 RETURN INVALID PUSH1 0x80 PUSH1 0x40 MSTORE CALLVALUE DUP1 ISZERO PUSH2 0xF JUMPI PUSH0 DUP1 REVERT JUMPDEST POP PUSH1 0x4 CALLDATASIZE LT PUSH2 0x55 JUMPI PUSH0 CALLDATALOAD PUSH1 0xE0 SHR DUP1 PUSH4 0x1BDBF00F EQ PUSH2 0x59 JUMPI DUP1 PUSH4 0x4CB909A3 EQ PUSH2 0x89 JUMPI DUP1 PUSH4 0x8D71C7FF EQ PUSH2 0xB9 JUMPI DUP1 PUSH4 0x99174E14 EQ PUSH2 0xE9 JUMPI DUP1 PUSH4 0xB20BA9B1 EQ PUSH2 0x107 JUMPI JUMPDEST PUSH0 DUP1 REVERT JUMPDEST PUSH2 0x73 PUSH1 0x4 DUP1 CALLDATASIZE SUB DUP2 ADD SWAP1 PUSH2 0x6E SWAP2 SWAP1 PUSH2 0x1CD JUMP JUMPDEST PUSH2 0x137 JUMP JUMPDEST PUSH1 0x40 MLOAD PUSH2 0x80 SWAP2 SWAP1 PUSH2 0x210 JUMP JUMPDEST PUSH1 0x40 MLOAD DUP1 SWAP2 SUB SWAP1 RETURN JUMPDEST PUSH2 0xA3 PUSH1 0x4 DUP1 CALLDATASIZE SUB DUP2 ADD SWAP1 PUSH2 0x9E SWAP2 SWAP1 PUSH2 0x25C JUMP JUMPDEST PUSH2 0x141 JUMP JUMPDEST PUSH1 0x40 MLOAD PUSH2 0xB0 SWAP2 SWAP1 PUSH2 0x2A9 JUMP JUMPDEST PUSH1 0x40 MLOAD DUP1 SWAP2 SUB SWAP1 RETURN JUMPDEST PUSH2 0xD3 PUSH1 0x4 DUP1 CALLDATASIZE SUB DUP2 ADD SWAP1 PUSH2 0xCE SWAP2 SWAP1 PUSH2 0x25C JUMP JUMPDEST PUSH2 0x14D JUMP JUMPDEST PUSH1 0x40 MLOAD PUSH2 0xE0 SWAP2 SWAP1 PUSH2 0x2A9 JUMP JUMPDEST PUSH1 0x40 MLOAD DUP1 SWAP2 SUB SWAP1 RETURN JUMPDEST PUSH2 0xF1 PUSH2 0x159 JUMP JUMPDEST PUSH1 0x40 MLOAD PUSH2 0xFE SWAP2 SWAP1 PUSH2 0x2A9 JUMP JUMPDEST PUSH1 0x40 MLOAD DUP1 SWAP2 SUB SWAP1 RETURN JUMPDEST PUSH2 0x121 PUSH1 0x4 DUP1 CALLDATASIZE SUB DUP2 ADD SWAP1 PUSH2 0x11C SWAP2 SWAP1 PUSH2 0x25C JUMP JUMPDEST PUSH2 0x163 JUMP JUMPDEST PUSH1 0x40 MLOAD PUSH2 0x12E SWAP2 SWAP1 PUSH2 0x2A9 JUMP JUMPDEST PUSH1 0x40 MLOAD DUP1 SWAP2 SUB SWAP1 RETURN JUMPDEST PUSH0 DUP2 EXTCODEHASH SWAP1 POP SWAP2 SWAP1 POP JUMP JUMPDEST PUSH0 DUP2 DUP4 SHL SWAP1 POP SWAP3 SWAP2 POP POP JUMP JUMPDEST PUSH0 DUP2 DUP4 SAR SWAP1 POP SWAP3 SWAP2 POP POP JUMP JUMPDEST PUSH0 PUSH1 0x5F PUSH0 ADD SWAP1 POP SWAP1 JUMP JUMPDEST PUSH0 DUP2 DUP4 SHR SWAP1 POP SWAP3 SWAP2 POP POP JUMP JUMPDEST PUSH0 DUP1 REVERT JUMPDEST PUSH0 PUSH20 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF DUP3 AND SWAP1 POP SWAP2 SWAP1 POP JUMP JUMPDEST PUSH0 PUSH2 0x19C DUP3 PUSH2 0x173 JUMP JUMPDEST SWAP1 POP SWAP2 SWAP1 POP JUMP JUMPDEST PUSH2 0x1AC DUP2 PUSH2 0x192 JUMP JUMPDEST DUP2 EQ PUSH2 0x1B6 JUMPI PUSH0 DUP1 REVERT JUMPDEST POP JUMP JUMPDEST PUSH0 DUP2 CALLDATALOAD SWAP1 POP PUSH2 0x1C7 DUP2 PUSH2 0x1A3 JUMP JUMPDEST SWAP3 SWAP2 POP POP JUMP JUMPDEST PUSH0 PUSH1 0x20 DUP3 DUP5 SUB SLT ISZERO PUSH2 0x1E2 JUMPI PUSH2 0x1E1 PUSH2 0x16F JUMP JUMPDEST JUMPDEST PUSH0 PUSH2 0x1EF DUP5 DUP3 DUP6 ADD PUSH2 0x1B9 JUMP JUMPDEST SWAP2 POP POP SWAP3 SWAP2 POP POP JUMP JUMPDEST PUSH0 DUP2 SWAP1 POP SWAP2 SWAP1 POP JUMP JUMPDEST PUSH2 0x20A DUP2 PUSH2 0x1F8 JUMP JUMPDEST DUP3 MSTORE POP POP JUMP JUMPDEST PUSH0 PUSH1 0x20 DUP3 ADD SWAP1 POP PUSH2 0x223 PUSH0 DUP4 ADD DUP5 PUSH2 0x201 JUMP JUMPDEST SWAP3 SWAP2 POP POP JUMP JUMPDEST PUSH0 DUP2 SWAP1 POP SWAP2 SWAP1 POP JUMP JUMPDEST PUSH2 0x23B DUP2 PUSH2 0x229 JUMP JUMPDEST DUP2 EQ PUSH2 0x245 JUMPI PUSH0 DUP1 REVERT JUMPDEST POP JUMP JUMPDEST PUSH0 DUP2 CALLDATALOAD SWAP1 POP PUSH2 0x256 DUP2 PUSH2 0x232 JUMP JUMPDEST SWAP3 SWAP2 POP POP JUMP JUMPDEST PUSH0 DUP1 PUSH1 0x40 DUP4 DUP6 SUB SLT ISZERO PUSH2 0x272 JUMPI PUSH2 0x271 PUSH2 0x16F JUMP JUMPDEST JUMPDEST PUSH0 PUSH2 0x27F DUP6 DUP3 DUP7 ADD PUSH2 0x248 JUMP JUMPDEST SWAP3 POP POP PUSH1 0x20 PUSH2 0x290 DUP6 DUP3 DUP7 ADD PUSH2 0x248 JUMP JUMPDEST SWAP2 POP POP SWAP3 POP SWAP3 SWAP1 POP JUMP JUMPDEST PUSH2 0x2A3 DUP2 PUSH2 0x229 JUMP JUMPDEST DUP3 MSTORE POP POP JUMP JUMPDEST PUSH0 PUSH1 0x20 DUP3 ADD SWAP1 POP PUSH2 0x2BC PUSH0 DUP4 ADD DUP5 PUSH2 0x29A JUMP JUMPDEST SWAP3 SWAP2 POP POP JUMP INVALID LOG2 PUSH5 0x6970667358 0x22 SLT KECCAK256 0xBB DUP8 PUSH4 0xD7368B7B 0xC1 0x27 0xD2 BALANCE 0xBB 0xE5 SLOAD PUSH2 0x1ADD SUB 0xDC EQ 0x2C NUMBER 0x21 0x21 CHAINID 0xDB SHR 0xE7 CALLCODE REVERT 0xC6 0xBD PUSH5 0x736F6C6343 STOP ADDMOD EQ STOP CALLER 

contract ShanghaiOpcodes {
    function opShl(uint _one, uint _two) public pure returns (uint _resp) {
        assembly {
            _resp := shl(_one, _two)
        }
    }

    function opShr(uint _one, uint _two) public pure returns (uint _resp) {
        assembly {
            _resp := shr(_one, _two)
        }
    }

    function opSar(uint _one, uint _two) public pure returns (uint _resp) {
        assembly {
            _resp := sar(_one, _two)
        }
    }

    function opExtCodeHash(address _addr) public view returns (bytes32 _resp) {
        assembly {
            _resp := extcodehash(_addr)
        }
    }

    function opPush0() public pure returns (uint _resp) {
        assembly {
            _resp := add(0x0, 0x5f)
        }
    }
}
// Filename: contracts/solidity/account/NonExisting.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import { NonExtDup } from "./NonExtDup.sol";

contract NonExisting {
    NonExtDup duplicate;

    constructor(address addr) {
        // solhint-disable-previous-line no-empty-blocks
        duplicate = NonExtDup(addr);
    }

    function balanceOf(address addr) external view returns (uint256) {
        return addr.balance;
    }

    function callOnNonExistingAccount(address nonExistingAddr) external returns (bool) {
        (bool success, ) = nonExistingAddr.call(
            abi.encodeWithSignature("doesNotExist()")
        );

        return success;
    }

    function delegatecallOnNonExistingAccount(address nonExistingAddr) external returns (bool) {
        (bool success, ) = nonExistingAddr.delegatecall(
            abi.encodeWithSignature("doesNotExist()")
        );

        return success;
    }

    function staticcallOnNonExistingAccount(address nonExistingAddr) external view returns (bool) {
        (bool success, ) = nonExistingAddr.staticcall(
            abi.encodeWithSignature("doesNotExist()")
        );

        return success;
    }

    function balanceNoneExistingAddr(address nonExistingAddr) external view returns (uint256) {
        return nonExistingAddr.balance;
    }
}
// Filename: contracts/solidity/account/NonExtDup.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract NonExtDup {
    function ping() external pure returns (string memory){
        return "pong";
    }
}
// Filename: contracts/solidity/address/Address.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract AddressContract {
    receive() external payable {}
    string message = "Hello World from AddressContract!";
    address nonExistingContract = address(999999999999);

    event emitMessage(string a);
    event emitMessageData(bool success);
    event res(bool answer, bytes data);

    function getAddressBalance(address addressToQuery) external view returns (uint256) {
        return addressToQuery.balance;
    }

    function getAddressCode(address addressToQuery) external view returns (bytes memory) {
        return addressToQuery.code;
    }

    function getAddressCodeHash(address addressToQuery) external view returns (bytes32) {
        return addressToQuery.codehash;
    }

    function transferTo(address payable addressToQuery, uint amount) external {
        return addressToQuery.transfer(amount);
    }

    function sendTo(address payable addressToQuery, uint amount) external returns (bool){
        bool answer = addressToQuery.send(amount);
        emit emitMessageData(answer);

        return answer;
    }

    function callAddr(address payable addressToQuery, uint amount) external returns (bool){
        (bool answer,) = addressToQuery.call{value: amount}("");
        emit emitMessageData(answer);

        return answer;
    }


    function callNonExistingAddress() external {
        (bool answer, bytes memory data) = nonExistingContract.call("");
        emit res(answer, data);
    }

    function callAddrWithSig(address payable addressToQuery, uint amount, string memory functionSig) external payable returns (bytes memory){
        (bool answer, bytes memory data) = addressToQuery.call{gas: 900000, value: amount}(abi.encodeWithSignature(functionSig));
        require(answer, "Error calling");
        emit res(answer, data);

        return data;
    }

    function delegate(address payable addressToQuery, string memory functionSig) external payable returns (bytes memory){
        (bool success, bytes memory data) = addressToQuery.delegatecall{gas: 90000000}(abi.encodeWithSignature(functionSig));
        require(success, "Error calling");
        emit res(success, data);

        return data;
    }

    function staticCall(address payable addressToQuery, string memory functionSig) external payable returns (bytes memory){
        (bool answer, bytes memory data) = addressToQuery.staticcall(abi.encodeWithSignature(functionSig));
        require(answer, "Error calling");
        emit res(answer, data);

        return data;
    }

    function staticCallSet(address payable addressToQuery, string memory functionSig, uint number) external payable returns (bytes memory){
        (bool answer, bytes memory data) = addressToQuery.staticcall(abi.encodeWithSignature(functionSig, number));
        require(answer, "Error calling");
        emit res(answer, data);

        return data;
    }
}
// Filename: contracts/solidity/address/AssemblyAddress.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract AssemblyAddress {
    function codesizeat(address addr) external view returns(uint256 size) {
        assembly {
            size := extcodesize(addr)
        }
    }

    function codehashat(address addr) external view returns (bytes32 hash) {
        assembly {
            hash := extcodehash(addr)
        }
    }

    function codecopyat(address addr) external view returns (bytes memory code) {
        assembly {
            // retrieve the size of the code, this needs assembly
            let size := extcodesize(addr)
            // allocate output byte array - this could also be done without assembly
            // by using code = new bytes(size)
            code := mload(0x40)
            // new "memory end" including padding
            mstore(0x40, add(code, and(add(add(size, 0x20), 0x1f), not(0x1f))))
            // store length in memory
            mstore(code, size)
            // actually retrieve the code, this needs assembly
            extcodecopy(addr, add(code, 0x20), 0, size)
        }
    }
}

// Filename: contracts/solidity/address/Recipient.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Recipient {
    receive() external payable {}
    event msgValue(uint256 value);
    event emitMessage(string message);
    string message = "Hello World from Recipient contract!";
    uint myNumber = 5;

    function getNumber() external view returns (uint) {
        return myNumber;
    }

    function setNumber(uint number) external returns (uint) {
        return myNumber = number;
    }

    function getMessageValue() external payable {
        emit msgValue(msg.value);
    }

    function helloWorldMessage() external {
        emit emitMessage(message);
    }

    fallback() external payable {
        
    }
}
// Filename: contracts/solidity/assignments/AssignmentReferenceTypes.sol
//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract AssignmentReferenceTypes {
    uint[5] private someArray = [1, 2, 3, 4, 5];

    function testAssignmentOfReferenceTypes() external {
        testChangeCopy(someArray);
        testChangeReference(someArray);
    }

    function testChangeCopy(uint[5] memory y) internal pure {
        y[2] = 8;
    }

    function testChangeReference(uint[5] storage y) internal {
        y[3] = 10;
    }

    function getSomeArray() external view returns(uint[5] memory) {
        return someArray;
    }
}
// Filename: contracts/solidity/assignments/DestructuringReturns.sol
//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract DestructuringReturns {
    function f() public pure returns (uint, bool, uint) {
        return (7, true, 2);
    }

    function testDestructuredReturnParams() external pure returns(uint, bool, uint) {
        (uint x, bool y, uint z) = f();

        return (x, y, z);
    }
}
// Filename: contracts/solidity/blind-auction/BlindAuction.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract BlindAuction {
    struct Bid {
        bytes32 blindedBid;
        uint deposit;
    }

    address payable public beneficiary;
    uint public biddingEnd;
    uint public revealEnd;
    bool public ended;

    mapping(address => Bid[]) public bids;

    address public highestBidder;
    uint public highestBid;

    // Allowed withdrawals of previous bids
    mapping(address => uint) pendingReturns;

    event AuctionEnded(address winner, uint highestBid);

    // Errors that describe failures.

    /// The function has been called too early.
    /// Try again at `time`.
    error TooEarly(uint time);
    /// The function has been called too late.
    /// It cannot be called after `time`.
    error TooLate(uint time);
    /// The function auctionEnd has already been called.
    error AuctionEndAlreadyCalled();

    // Modifiers are a convenient way to validate inputs to
    // functions. `onlyBefore` is applied to `bid` below:
    // The new function body is the modifier's body where
    // `_` is replaced by the old function body.
    modifier onlyBefore(uint time) {
        if (block.timestamp >= time) revert TooLate(time);
        _;
    }
    modifier onlyAfter(uint time) {
        if (block.timestamp <= time) revert TooEarly(time);
        _;
    }

    constructor(
        uint biddingTime,
        uint revealTime,
        address payable beneficiaryAddress
    ) {
        beneficiary = beneficiaryAddress;
        biddingEnd = block.timestamp + biddingTime;
        revealEnd = biddingEnd + revealTime;
    }

    /// Place a blinded bid with `blindedBid` =
    /// keccak256(abi.encodePacked(value, fake, secret)).
    /// The sent ether is only refunded if the bid is correctly
    /// revealed in the revealing phase. The bid is valid if the
    /// ether sent together with the bid is at least "value" and
    /// "fake" is not true. Setting "fake" to true and sending
    /// not the exact amount are ways to hide the real bid but
    /// still make the required deposit. The same address can
    /// place multiple bids.
    function bid(bytes32 blindedBid)
        external
        payable
        onlyBefore(biddingEnd)
    {
        bids[msg.sender].push(Bid({
            blindedBid: blindedBid,
            deposit: msg.value
        }));
    }

    /// Reveal your blinded bids. You will get a refund for all
    /// correctly blinded invalid bids and for all bids except for
    /// the totally highest.
    function reveal(
        uint[] calldata values,
        bool[] calldata fakes,
        bytes32[] calldata secrets
    )
        external
        onlyAfter(biddingEnd)
        onlyBefore(revealEnd)
    {
        uint length = bids[msg.sender].length;
        require(values.length == length);
        require(fakes.length == length);
        require(secrets.length == length);

        uint refund;
        for (uint i = 0; i < length; i++) {
            Bid storage bidToCheck = bids[msg.sender][i];
            (uint value, bool fake, bytes32 secret) =
                    (values[i], fakes[i], secrets[i]);
            //console.log(bidToCheck.blindedBid);
            //console.log(keccak256(abi.encodePacked(value, fake, secret)));
            if (bidToCheck.blindedBid != keccak256(abi.encodePacked(value, fake, secret))) {
                // Bid was not actually revealed.
                // Do not refund deposit.
                continue;
            }
            refund += bidToCheck.deposit;
            if (!fake && bidToCheck.deposit >= value) {
                if (placeBid(msg.sender, value))
                    refund -= value;
            }
            // Make it impossible for the sender to re-claim
            // the same deposit.
            bidToCheck.blindedBid = bytes32(0);
        }
        payable(msg.sender).transfer(refund);
    }

    /// Withdraw a bid that was overbid.
    function withdraw() external {
        uint amount = pendingReturns[msg.sender];
        if (amount > 0) {
            // It is important to set this to zero because the recipient
            // can call this function again as part of the receiving call
            // before `transfer` returns (see the remark above about
            // conditions -> effects -> interaction).
            pendingReturns[msg.sender] = 0;

            payable(msg.sender).transfer(amount);
        }
    }

    /// End the auction and send the highest bid
    /// to the beneficiary.
    function auctionEnd()
        external
        onlyAfter(revealEnd)
    {
        if (ended) revert AuctionEndAlreadyCalled();
        emit AuctionEnded(highestBidder, highestBid);
        ended = true;
        beneficiary.transfer(highestBid);
    }

    // This is an "internal" function which means that it
    // can only be called from the contract itself (or from
    // derived contracts).
    function placeBid(address bidder, uint value) internal
            returns (bool success)
    {
        if (value <= highestBid) {
            return false;
        }
        if (highestBidder != address(0)) {
            // Refund the previously highest bidder.
            pendingReturns[highestBidder] += highestBid;
        }
        highestBid = value;
        highestBidder = bidder;
        return true;
    }

    function getBids(address bidderAddress) public view returns(Bid[] memory) {
        return bids[bidderAddress];
    }

    function getPendingReturns(address bidderAddress) public view returns(uint) {
        return pendingReturns[bidderAddress];
    }

    function getBalance() public view returns(uint256) {
        return address(this).balance;
    }
}
// Filename: contracts/solidity/block/BlockInfo.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

contract BlockInfo {
    
    function getBlockBaseFee() public view returns (uint256) {
        return block.basefee;
    }

    function getBlockHash(uint256 blockNumber) public view returns (bytes32) {
        return blockhash(blockNumber);
    }

    function getMinerAddress() public view returns (address) {
        return block.coinbase;
    }

    function getBlockPrevrando() external view returns (uint256) {
        return block.prevrandao;
    }

    function getBlockGasLimit() external view returns (uint256) {
        return block.gaslimit;
    }

    function getBlockNumber() external view returns (uint256) {
        return block.number;
    }

    function getBlockTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    // should behave like prevrandao
    /// @notice since VM version Paris, "difficulty" was replaced by "prevrandao", which now returns a random number based on the beacon chain
    function getBlockDifficulty() external view returns (uint256) {
        return block.difficulty;
    }
}
// Filename: contracts/solidity/concatenation/Concatenation.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Concatenation {
    function byteConcatenation(bytes calldata first, bytes calldata second, bytes calldata third) public pure returns (uint256) {
        bytes memory concatenated = bytes.concat(first, second, third);
        return concatenated.length;
    }

    function stringConcatenation(string memory first, string memory second, string memory  third) public pure returns (string memory) {
        return string.concat(first, second, third);
    }

    function byteConcatenationEmpty() public pure returns (bytes memory) {
        return bytes.concat();
    }

    function stringConcatenationEmpty() public pure returns (string memory) {
        return string.concat();
    }

}
// Filename: contracts/solidity/control/ControlStructures.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract TestTryCatchContract {
    function myFunc(uint x) public pure returns (string memory) {
        require(x != 0, "require failed");
        return "my func was called";
    }
}


contract ControlStructures {
    TestTryCatchContract private testContract;

    constructor() {
        testContract = new TestTryCatchContract();
    }

    function evaluateIfElse(bool condition) external pure returns(bool) {
        if(condition) {
            return true;
        } else {
            return false;
        }
    }

    function evaluateWhile(uint256 total) external pure returns(uint256) {
        require(total < 100, "Cannot have more than 100 iterations");
        uint256 it = 0;
        while(++it < total) {}

        return it;
    }

    function evaluateDoWhile(uint256 total) external pure returns(uint256) {
        require(total < 100, "Cannot have more than 100 iterations");
        uint256 it = 0;
        do {
            it++;
        } while(it < total);

        return it;
    }

    function evaluateBreak(uint256 total, uint256 interception) external pure returns(uint256) {
        require(total < 100, "Cannot have more than 100 iterations");
        uint256 it = 0;
        while(it++ < total) {
            if(it == interception) break;
        }

        return it;
    }

    function evaluateContinue(uint256 total, uint256 interception) external pure returns(uint256) {
        require(total < 100, "Cannot have more than 100 iterations");
        uint256 iterableSteps = 0;
        
        for(uint i=0; i < total; i++) {
            if(interception < i) continue;
            iterableSteps++;
        }

        return iterableSteps;
    }

    function evaluateFor(uint256 total) external pure returns(uint256) {
        require(total < 100, "Cannot have more than 100 iterations");
        uint256 it = 0;
        for(uint i=0; i < total; i++) {
            it = i;
        }

        return it;
    }

    function myFunc(uint x) internal pure returns (string memory) {
        require(x != 0, "require failed");
        return "my func was called";
    }

    function evaluateTryCatch(uint256 condition) external view returns(bool) {
        try testContract.myFunc(condition) {
            return true;
        } catch {
            return false;
        }
    }
}
// Filename: contracts/solidity/cryptomath/Arithmetic.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Arithmetic {
    string public name = "Arithmetic";
    uint256 maxUint = type(uint256).max;
    uint256 minUint = type(uint256).min;

    function checkName() external view returns (string memory){
        return name;
    }

    function add() external {
        name = "Arithmetic check if NOT reverted";
        maxUint = maxUint + 1;
    }

    function add2() external {
        uint256 tmp = maxUint;
        name = "Arithmetic check if NOT reverted";
        tmp += 100;
    }

    function mul() external {
        uint8 maxUint8 = type(uint8).max;
        name = "Arithmetic check if NOT reverted";
        maxUint8 * 2;
    }

    function dec() external {
        // This subtraction will revert on underflow.
        name = "Arithmetic check if NOT reverted";
        minUint--;
    }

    function sub() external {
        uint256 tmp = minUint;
        name = "Arithmetic check if NOT reverted";
        tmp -= 1;
    }

    function negativeHasMoreValues() external {
        int tmp;
        int x = type(int).min;
        name = "Arithmetic check if NOT reverted";
        tmp = -x;
    }

    function uncheckedAdd() external view returns (bool) {
        unchecked {
            uint256 tmp;
            tmp = maxUint + 1;

            return true;
        }
    }

    function uncheckedSub() external view returns (bool) {
        unchecked {
           uint256 tmp = minUint;
            tmp -= 1;

            return true;
        }
    }
    
}
// Filename: contracts/solidity/cryptomath/CryptoMath.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

contract CryptoMath {

    // addmod(uint x, uint y, uint k) returns (uint)
    function callAddMod(uint x, uint y, uint k) external pure returns (uint) {
        return addmod(x, y, k);
    }

    // mulmod(uint x, uint y, uint k) returns (uint)
    function callMulMod(uint x, uint y, uint k) external pure returns (uint) {
        return mulmod(x, y, k);
    }

    // keccak256(bytes memory) returns (bytes32)
    function callKeccak256(bytes memory input) external pure returns (bytes32) {
        return keccak256(input);
    }

    // sha256(bytes memory) returns (bytes32)
    function callSha256(bytes memory input) external pure returns (bytes32) {
        return sha256(input);
    }

    // ripemd160(bytes memory) returns (bytes20)
    function callRipemd160(bytes memory input) external pure returns (bytes20) {
        return ripemd160(input);
    }

    // ecrecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) returns (address)
    function callEcrecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) external pure returns (address) {
        return ecrecover(hash, v, r, s);
    }
    
}
// Filename: contracts/solidity/defaults/Defaults.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Defaults {
    struct UintDefaults {
        uint uInt;
        uint8 uInt8;
        uint16 uInt16;
        uint32 uInt32;
        uint64 uInt64;
        uint128 uInt128;
        uint256 uInt256;
    }

    struct IntDefaults {
        int intDef;
        int8 intDef8;
        int16 intDef16;
        int32 intDef32;
        int64 intDef64;
        int128 intDef128;
        int256 intDef256;
    }

    // struct FixedDefaults {
    //     fixed fixedVar;
    //     fixed8x18 fixed8x18Var;
    //     fixed16x12 fixed16x12Var;
    //     fixed32x10 fixed32x10Var;
    //     fixed64x8 fixed64x8Var;
    //     fixed128x6 fixed128x6Var;
    //     fixed256x4 fixed256x4Var;
    // }

    // struct UFixedDefaults {
    //     ufixed ufixedVar;
    //     ufixed8x18 ufixed8x18Var;
    //     ufixed16x12 ufixed16x12Var;
    //     ufixed32x10 ufixed32x10Var;
    //     ufixed64x8 ufixed64x8Var;
    //     ufixed128x6 ufixed128x6Var;
    //     ufixed256x4 ufixed256x4Var;
    // }

    struct BytesDefaults {
        bytes3 bytesDef3;
        bytes10 bytesDef10;
        bytes15 bytesDef15;
        bytes20 bytesDef20;
        bytes25 bytesDef25;
        bytes30 bytesDef30;
        bytes32 bytesDef32;
    }

    struct ArrayDefaults {
        string[] strArr;
        uint[] uintArr;
        bool[] boolArr;
        bytes[] bytesArr;
    }

    mapping(string => uint) public strUintMap;
    mapping(address => bool) public addrBoolMap;
    mapping(int => bytes) public bytesBytesMap;

    function getUintDefaults() external pure returns (UintDefaults memory) {
        UintDefaults memory defaults;
        return defaults;
    }

    function getIntDefaults() external pure returns (UintDefaults memory) {
        UintDefaults memory defaults;
        return defaults;
    }

    // Not supported by solidity yet
    // function getFixedDefaults() external pure returns (FixedDefaults memory) {
    //     FixedDefaults memory defaults;
    //     return defaults;
    // }

    // Not supported by solidity yet
    // function getUFixedDefaults() external pure returns (UFixedDefaults memory) {
    //     UFixedDefaults memory defaults;
    //     return defaults;
    // }

    function getBytesDefaults() external pure returns (BytesDefaults memory) {
        BytesDefaults memory defaults;
        return defaults;
    }

    function getStringDefaults() external pure returns (string memory) {
        string memory defaults;
        return defaults;
    }

    function getArrayDefaults() external pure returns (ArrayDefaults memory) {
        ArrayDefaults memory defaults;
        return defaults;
    }

    function getAddressDefaults() external pure returns (address) {
        address defaults;
        return defaults;
    }

}
// Filename: contracts/solidity/encoding/Encoding.sol
// Encoding.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Encoding {
    event Added(uint256 result);

    function add(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }
    
    function decodeData(bytes memory encodedData) public pure returns (address, uint256) {
        address decodedAddress;
        uint256 decodedUint;
        assembly {
            decodedAddress := mload(add(encodedData, 32))
            decodedUint := mload(add(encodedData, 64))
        }
        return (decodedAddress, decodedUint);
    }

    function encodeData(address _address, uint256 _uint) public pure returns (bytes memory) {
        return abi.encode(_address, _uint);
    }

    function encodeAddFunction(uint256 a, uint256 b) public pure returns (bytes memory) {
        bytes4 selector = this.add.selector;
    
        return abi.encodeWithSelector(selector, a, b);
    }

    function getPackedData(address _addr, uint256 _amount, string memory _data) public pure returns (bytes memory) {
        return abi.encodePacked(_addr, _amount, _data);
    }

    function executeAddFunction(uint256 a, uint256 b) public {
        bytes memory data = encodeAddFunction(a, b);
        (bool success, bytes memory result) = address(this).call(data);
        
        require(success, "Call failed");
        emit Added(abi.decode(result, (uint256)));
    }
}
// Filename: contracts/solidity/encoding/Receiver.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Receiver {
    event ReceivedData(uint256 data);

    function receiveData(uint256 data) external {
        emit ReceivedData(data);
    }
}
// Filename: contracts/solidity/encoding/Sender.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./Receiver.sol";

contract Sender {
    Receiver public receiver;

    constructor(address _receiver) {
        receiver = Receiver(_receiver);
    }

    function sendDataEncodeWithSignature(uint256 data) public {
        bytes memory payload = abi.encodeWithSignature("receiveData(uint256)", data);

        (bool success,) = address(receiver).call(payload);
        require(success, "External call using abi.encodeWithSignature failed");
    }

    function sendDataEncodeCall(uint256 data) public {
        bytes memory payload = abi.encodeCall(
            Receiver(address(receiver)).receiveData,
            (data)
        );

        (bool success,) = address(receiver).call(payload);
        require(success, "External call using abi.encodeCall failed"); 
    }

}
// Filename: contracts/solidity/errors/Errors.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import { ErrorsExternal } from "./ErrorsExternal.sol";

contract Errors {
    error InsufficientBalance(uint256 available, uint256 required);
    ErrorsExternal errorsExternal;
    event Result(uint code, string message);

    constructor(address errorsExternalAddr) {
        errorsExternal = ErrorsExternal(errorsExternalAddr);
    }

    function assertCheck(bool condition) external pure returns (bool) {
        assert(condition);
        return true;
    }

    function requireCheck(bool shouldRevert) external pure returns (bool) {
        require(shouldRevert);
        return true;
    }

    function revertCheck() external pure returns (bool) {
        revert();
    }

    function revertWithMessageCheck(string calldata message) external pure returns (bool) {
        revert(message);
    }

    function revertWithCustomError() external pure returns (bool) {
        revert InsufficientBalance(1, 100);
    }

    function tryCatchWithSimpleRevert() external returns (int value, bool success) {
        try errorsExternal.revertSimple() returns (bool v) {
            return (1, v);
        } catch (bytes memory) {
            emit Result(0, 'revertSimple');
        }
    }

    function tryCatchWithErrorMessageRevert(string memory message) external returns (int value, bool success) {
        try errorsExternal.revertWithErrorMessage(message) returns (bool v) {
            return (1, v);
        } catch Error(string memory _message) {
            emit Result(0, _message);
        }
    }

    function tryCatchWithPanic() external returns (uint value, bool success) {
        try errorsExternal.panic() returns (uint v) {
            return (v, false);
        } catch Panic(uint errorCode) {
            emit Result(errorCode, 'panic');
        }
    }
}
// Filename: contracts/solidity/errors/ErrorsExternal.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract ErrorsExternal {
    error InsufficientBalance(uint256 available, uint256 required);

    function revertWithCustomError() external pure returns (bool) {
        revert InsufficientBalance(1, 100);
    }

    function revertSimple() external pure returns (bool) {
        revert();
    }

    function revertWithErrorMessage(string memory message) external pure returns (bool) {
        revert(message);
    }

    function panic() external pure returns (uint) {
        return uint(4)/uint(0);
    }
}
// Filename: contracts/solidity/errors/Panic.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Panic {
    uint[] someArray;
    uint[] anotherArray = [1, 2, 3];

    enum Button {
        ON,
        OFF
    }
    constructor() {
    }

    function verifyPanicError0x01() external pure {
        assert(false);
    }

    function verifyPanicError0x11() external pure returns(uint8) {
        uint8 test = 255;
        uint8 test2 = 1;
        return test + test2;
    }

    function verifyPanicError0x12() external pure returns(uint8) {
        uint8 number1 = 5;
        uint8 number2 = 12-12;
        return number1 / number2;
    }

    function verifyPanicError0x21() external pure {
        int testValue = -1;
        Button(testValue);
    }

    function verifyPanicError0x22() external pure returns(uint8) {
        return 0;
    }

    function verifyPanicError0x31() external {
       someArray.pop();
    }

    function verifyPanicError0x32() external view returns(uint) {
       return anotherArray[5];
    }

    function verifyPanicError0x41() external pure returns(uint[] memory) {
       uint[] memory largeArray = new uint[](2**64);
       return largeArray;
    }

    function verifyPanicError0x51() external pure returns(uint) {
       function (uint, uint) internal pure returns (uint) funcPtr;

       return funcPtr(5, 6);
    }

    function getSomeArray() external view returns(uint[] memory) {
       return someArray;
    }
    
}
// Filename: contracts/solidity/functions/Functions.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

interface ContractInterface {
  function sumThemUp (uint a, uint b) external returns (uint);
}

contract Functions is ContractInterface {
    uint myInteger;
    address messageFrameAddresses;
    address addr;
    string str;
    uint num;
    event MsgValue(uint256);

    function getMessage() internal pure returns (string memory) {
        return "Hello World";
    }

    function checkGasleft() external view returns (uint256) {
        return gasleft();
    }

    function checkGasleftFromExternalCall() external view returns (uint256) {
        return this.checkGasleft();
    }

    function deposit() public payable {}

    function notPayable() public {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function manyInputs(uint _num, address _addr, string memory _str) internal returns (bool) {
        num = _num;
        addr = _addr;
        str = _str;

        return true;
    }

    function manyInputsProxyCall() external returns (bool){
        return manyInputs({
            _str: 'string',
            _num: 12,
            _addr: address(this)
        });
    }

    function sumThemUp(uint a, uint) external pure override returns (uint) {
        return a;
    }
}
// Filename: contracts/solidity/functions/FunctionsChild.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;
import { Functions } from "./Functions.sol";

contract FunctionsChild is Functions {
    string public message;

    constructor() {
        message = getMessage();
    }

    function getMessageString() external view returns (string memory) {
        return message;
    }
}
// Filename: contracts/solidity/functions/FunctionsParent.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;
import { Functions } from "./Functions.sol";

contract FunctionsParent {
    string public message;
    Functions functionsContract;

    constructor(address functionsContractAddr) {
        functionsContract = Functions(functionsContractAddr);
    }

    function testExternal() public view returns (uint256) {
        return functionsContract.checkGasleft();
    }
}
// Filename: contracts/solidity/inhetitance/Base.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Base {
    receive() external payable {}
    function classIdentifier() public pure virtual returns (string memory) {
        return "Base";
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
// Filename: contracts/solidity/inhetitance/Main.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;
import { Base } from "./Base.sol";

contract Main is Base {
    function classIdentifier() public pure override(Base) returns (string memory) {
        return "Main";
    }

    function returnThis() public view returns (Main) {
        return this;
    }

    function returnSuper() public view virtual returns (string memory) {
        return super.classIdentifier();
    }
}
// Filename: contracts/solidity/modifiers/A.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract A{
      
    function show() public pure virtual returns(string memory) {
        return "This is contract A";
    }
}// Filename: contracts/solidity/modifiers/B.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./Modifiers.sol";
import "./A.sol";

contract B is Modifiers, A {

    constructor(uint256 _baseValue) Modifiers(_baseValue){
        
    }    
    
    function show() public override(Modifiers, A) pure returns(string memory) {
        return "This is the overriding contract B";
    }
}// Filename: contracts/solidity/modifiers/DerivedContract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./Modifiers.sol";

contract DerivedContract is Modifiers {

    constructor(uint256 _baseValue) Modifiers(_baseValue) {
        
    }    
    
    function show() public override pure returns(string memory) {
        return "This is the derived contract";
    }
}// Filename: contracts/solidity/modifiers/Modifiers.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Modifiers {
    uint256 public data;
    address public owner;

    uint256 public constant MAX_SUPPLY = 1000000;  
    uint256 public immutable deploymentTimestamp;  

    event RegularEvent(address indexed from, address indexed to, uint256 value, string message);
    event AnonymousEvent(address indexed sender, uint256 value) anonymous;

    constructor(uint256 _initialData) {
        data = _initialData;
        owner = msg.sender;
        deploymentTimestamp = block.timestamp;
    }

    function addPure(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }

    function makePayment() public payable {
        require(msg.value > 0, "Payment amount should be greater than 0");
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }    

    function getData() public view returns (uint256) {
        return data;
    }

    function triggerRegularEvent(address _to, uint256 _value, string memory _message) public {
        emit RegularEvent(msg.sender, _to, _value, _message);
    }

    function triggerAnonymousEvent(uint256 _value) public {
        emit AnonymousEvent(msg.sender, _value);
    }

    function show() public virtual returns(string memory) {
        return "This is the base Modifiers contract";
    }    
    
}
// Filename: contracts/solidity/modular/Token.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

library Balances {
    function move(mapping(address => uint256) storage balances, address from, address to, uint amount) internal {
        require(balances[from] >= amount);
        require(balances[to] + amount >= balances[to]);
        balances[from] -= amount;
        balances[to] += amount;
    }
}

contract Token {
    /// storage states
    using Balances for *;
    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowed;

    /// events
    event Transfer(address from, address to, uint amount);
    event Approval(address owner, address spender, uint amount);

    /// constructor
    constructor(uint256 amount) {
        balances[msg.sender] = amount;
    }

    /// transfer `amount` from `msg.sender` to `to`
    function transfer(address to, uint amount) external returns (bool success) {
        balances.move(msg.sender, to, amount);
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /// transfer `amount` from `from` to `to`
    function transferFrom(address from, address to, uint amount) external returns (bool success) {
        require(allowed[from][msg.sender] >= amount);
        allowed[from][msg.sender] -= amount;
        balances.move(from, to, amount);
        emit Transfer(from, to, amount);
        return true;
    }

    /// approve an `amount` of allowance for `spender`
    function approve(address spender, uint amount) external returns (bool success) {
        require(allowed[msg.sender][spender] == 0, "");
        allowed[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// util method to check balances of addresses
    function balanceOf(address tokenOwner) external view returns (uint balance) {
        return balances[tokenOwner];
    }

    /// util method to check allowances
    function allowance(address owner, address spender) external view returns (uint balance) {
        return allowed[owner][spender];
    }
}

// Filename: contracts/solidity/new/New.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Target {
    string public message;

    function setMessage(string calldata _message) external {
        message = _message;
    }
}

contract TargetWithConstructor {
    string public message;

    constructor(string memory _message) {
        message = _message;
    }
}

contract New {
    struct ContractInformation {
        address contractAddr;
        string message;
    }

    mapping(string => ContractInformation) public newContractsInfo;

    function createContract(string calldata contractName, string calldata message) external {
        Target newTarget = new Target();

        newTarget.setMessage(message);

        newContractsInfo[contractName] = ContractInformation({
            contractAddr: address(newTarget),
            message: newTarget.message()
        });
    }

    function createContractWithData(string calldata contractName, string calldata message) external {
        TargetWithConstructor newTargetWithConstructor = new TargetWithConstructor(message);

        newContractsInfo[contractName] = ContractInformation({
            contractAddr: address(newTargetWithConstructor),
            message: newTargetWithConstructor.message()
        });
    }

    function createContractWithSalt(bytes32 salt, string calldata contractName, string calldata message) external {
        TargetWithConstructor newContractsWithSalt = new TargetWithConstructor{salt: salt}(message);

        newContractsInfo[contractName] = ContractInformation({
            contractAddr: address(newContractsWithSalt),
            message: newContractsWithSalt.message()
        });
    }
}
// Filename: contracts/solidity/opcode-logger/OpcodeLogger.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

contract OpcodeLogger {
    address public owner;
    mapping(address => uint256) public callsCounter;

    constructor() {
        owner = msg.sender;
        callsCounter[owner]++;
    }

    function updateOwner() external returns (address) {
        owner = msg.sender;
        callsCounter[owner]++;

        return owner;
    }

    function resetCounter() external {
        callsCounter[msg.sender] = 0;
    }

    function call(address payable _target, bytes memory _calldata) external payable returns (bool, uint256) {
        bool isSuccess;
        uint256 res;

        assembly {
            let resPlaceholder := mload(0x40)
            isSuccess := call(gas(), _target, callvalue(), add(_calldata, 0x20), mload(_calldata), resPlaceholder, 0x20)
            res := mload(resPlaceholder)
        }

        callsCounter[msg.sender]++;

        return (isSuccess, res);
    }

    function delegateCall(address payable _target, bytes memory _calldata) external returns (bool) {
        bool isSuccess;

        assembly {
            isSuccess := delegatecall(gas(), _target, add(_calldata, 0x20), mload(_calldata), 0, 0)
        }

        callsCounter[msg.sender]++;

        return isSuccess;
    }

    function staticCall(address payable _target, bytes memory _calldata) external returns (bool, uint256) {
        bool isSuccess;
        uint256 res;

        assembly {
            let resPlaceholder := mload(0x40)
            isSuccess := staticcall(gas(), _target, add(_calldata, 0x20), mload(_calldata), resPlaceholder, 0x20)
            res := mload(resPlaceholder)
        }

        callsCounter[msg.sender]++;

        return (isSuccess, res);
    }

    function callCode(address payable _target, bytes memory _calldata) external payable returns (bool) {
        bool isSuccess;

        assembly {
            isSuccess := callcode(gas(), _target, callvalue(), add(_calldata, 0x20), mload(_calldata), 0, 0)
        }

        callsCounter[msg.sender]++;

        return isSuccess;
    }
}
// Filename: contracts/solidity/payment-channel/PaymentChannel.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// resource: https://docs.soliditylang.org/en/latest/solidity-by-example.html#the-full-contract 

contract PaymentChannel {
    address payable public sender;      // The account sending payments.
    address payable public recipient;   // The account receiving the payments.
    uint256 public expiration;  // Timeout in case the recipient never closes.

    event AccountBalances( uint256 contractBalance, uint256 senderBalance, uint256 recipientBalance);

    constructor (address payable recipientAddress, uint256 duration) payable {
        sender = payable(msg.sender);
        recipient = recipientAddress;
        expiration = block.timestamp + duration;
    }

    /// the recipient can close the channel at any time by presenting a
    /// signed amount from the sender. the recipient will be sent that amount,
    /// and the remainder will go back to the sender
    function close(uint256 amount, bytes memory signature) external {
        require(msg.sender == recipient);
        require(isValidSignature(amount, signature));

        // emit an event containing balances before closing the channel => easier to keep track of balances and ignore transaction fees
        emit AccountBalances(address(this).balance, sender.balance, recipient.balance);

        // closing - distributing crypto logic
        recipient.transfer(amount);
        sender.transfer(address(this).balance);

        // emit an event containing balances after closing the channel
        emit AccountBalances( address(this).balance, sender.balance, recipient.balance);
    }

    /// the sender can extend the expiration at any time
    function extend(uint256 newExpiration) external {
        require(msg.sender == sender);
        require(newExpiration > expiration);

        expiration = newExpiration;
    }

    /// if the timeout is reached without the recipient closing the channel,
    /// then the Ether is released back to the sender.
    function claimTimeout() external {
        require(block.timestamp >= expiration);
        sender.transfer(address(this).balance);
    }

    /// must verify that the signature is a valid signature signed by the sender
    function isValidSignature(uint256 amount, bytes memory signature)
        internal
        view
        returns (bool)
    {
        // prefix used in Ethereum when signing a message.
        bytes32 message = prefixed(keccak256(abi.encodePacked(this, amount)));

        // check that the signature is from the payment sender
        return recoverSigner(message, signature) == sender;
    }

    /// split bytes signature into r, s, v values
    function splitSignature(bytes memory sig)
        internal
        pure
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        // a valid signature must have 65 bytes
        require(sig.length == 65);

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    /// recover the sender's address based on message and signature
    function recoverSigner(bytes32 message, bytes memory sig)
        internal
        pure
        returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);

        return ecrecover(message, v, r, s);
    }

    /// builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}// Filename: contracts/solidity/precompiles/Precompiles.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Precompiles {

    event DebugBytes(bytes data);
    event DebugUint256(uint256 value);

    // Generated for the ecPairing, using circom's "Getting started", "Verifying from a Smart Contract", example: https://docs.circom.io/getting-started/proving-circuits/#verifying-a-proof 
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 1992193412575387772633166300059621656894667020589796054599256571938481924230;
    uint256 constant alphay  = 17286394816897329629069822916679309371076736310284017855248312609568383258237;
    uint256 constant betax1  = 11964323460734694315238111140642024467452813403052111330212995086166809270885;
    uint256 constant betax2  = 12267908196455409001876930296230756523799830500981645004963998667454025535434;
    uint256 constant betay1  = 21275906100829937195191642051557308290074855814227086905366055391443466419712;
    uint256 constant betay2  = 11626206177405313309349477264020271977827652855514445334498513782927752593000;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 2009753607463674868643623849162140280453293590938413759204491084610780506800;
    uint256 constant deltax2 = 2318786346813288613910245922805240833314377829481066116275566236397337633311;
    uint256 constant deltay1 = 10136331428626930676893265737858796788982376651161771565051197160272857837902;
    uint256 constant deltay2 = 10244858826673312074376951503947532249080874861318982996096318922537363359310;

    
    uint256 constant IC0x = 8932029301015886160530317842397264455712404585681011305111252155919622321955;
    uint256 constant IC0y = 8277775186538355354365054546186421179471810889108665599571530260894812131569;
    
    uint256 constant IC1x = 10605992167215957342338540958692483139633228909008555813480804645225067260597;
    uint256 constant IC1y = 18983729039899565301459273836628802849991503687662293824406539434384123854551;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;
    // End of generated data


    function verifySignature(
        bytes32 hashedMessage,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address expectedSigner
    ) public pure returns (bool) {
        // Recover the address from the signature
        address recoveredAddress = ecrecover(hashedMessage, v, r, s);

        // Compare the recovered address with the expected signer's address
        return recoveredAddress == expectedSigner;
    }

    function computeSha256Hash(string memory input) public pure returns (bytes32) {
        return sha256(abi.encodePacked(input));
    }

    function computeRipemd160Hash(string memory input) public pure returns (bytes20) {
        return ripemd160(abi.encodePacked(input));
    }

    function getIdentity(uint256 input) public pure returns (uint256) {
        uint256 output;
        assert(output != input);
        assembly {
            // Load data from the call data at the specified index
            output := calldataload(4) // 4 bytes offset for the function selector
        }
        return output;
    }  

    function modExp(uint256 base, uint256 exponent, uint256 modulus) public returns (uint256 result) {
        // Input length for base, exponent, and modulus
        uint256 length = 32; // for simplicity, assuming all inputs are 32 bytes

        emit DebugUint256(base);
        emit DebugUint256(exponent);
        emit DebugUint256(modulus);
        emit DebugBytes(bytes.concat(abi.encode(base), abi.encode(exponent), abi.encode(modulus)));

        assembly {
            // Free memory pointer
            let p := mload(0x40)

            // Define length and position for base, exponent, and modulus
            mstore(p, length)           // Length of base
            mstore(add(p, 0x20), length) // Length of exponent
            mstore(add(p, 0x40), length) // Length of modulus
            mstore(add(p, 0x60), base)   // Base
            mstore(add(p, 0x80), exponent) // Exponent
            mstore(add(p, 0xA0), modulus)  // Modulus

            // Call the MODEXP precompiled contract at address 0x5
            if iszero(call(not(0), 0x05, 0, p, 0xC0, p, 0x20)) {
                revert(0, 0)
            }

            // Load the result
            result := mload(p)
        }
    }  

    function ecAdd(uint256[2] memory point1, uint256[2] memory point2) public view returns (uint256[2] memory result) {
        // Input format: (x1, y1, x2, y2)
        uint256[4] memory input;
        input[0] = point1[0];
        input[1] = point1[1];
        input[2] = point2[0];
        input[3] = point2[1];

        assembly {
            // Call the ecAdd precompile at address 0x6
            if iszero(staticcall(not(0), 0x6, input, 0x80, result, 0x40)) {
                revert(0, 0)
            }
        }
    }    

    function ecMul(uint256[2] memory point, uint256 k, uint256 prime) public returns (uint256[2] memory result) {
        // Ensure the input point is on the curve
        require(isOnCurve(point, prime), "Point is not on the curve");

        // Use the precompiled contract for the ecMul operation
        // The precompiled contract for ecMul is at address 0x07
        assembly {
            // Free memory pointer
            let p := mload(0x40)
            
            // Store input data in memory
            mstore(p, mload(point))
            mstore(add(p, 0x20), mload(add(point, 0x20)))
            mstore(add(p, 0x40), k)
            
            // Call the precompiled contract
            // Input: 0x60 bytes (point x, point y, scalar k)
            // Output: 0x40 bytes (resulting point x', y')
            if iszero(call(not(0), 0x07, 0, p, 0x60, p, 0x40)) {
                revert(0, 0)
            }
            
            // Load the result from memory
            result := p
        }
    }    

    // Generated function using circom's "Getting started", "Verifying from a Smart Contract", example: https://docs.circom.io/getting-started/proving-circuits/#verifying-a-proof 
    function ecPairing(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[1] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, q)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
        }
    }    

    function blake2(uint32 rounds, bytes32[2] memory h, bytes32[4] memory m, bytes8[2] memory t, bool f) view public returns (bytes32[2] memory) {
        bytes32[2] memory output;

        bytes memory args = abi.encodePacked(rounds, h[0], h[1], m[0], m[1], m[2], m[3], t[0], t[1], f);
     
        assembly {
            if iszero(staticcall(not(0), 0x09, add(args, 32), 0xd5, output, 0x40)) {
                revert(0, 0)
            }
        }

        return output;
    }

    function isOnCurve(uint256[2] memory point, uint256 prime) public pure returns (bool) {
        uint256 x = point[0];
        uint256 y = point[1];
        uint256 lhs = mulmod(y, y, prime);
        uint256 rhs = addmod(mulmod(mulmod(x, x, prime), x, prime), 3, prime);
        return lhs == rhs;
    }    
}
// Filename: contracts/solidity/safe-remote-purchase/SafeRemotePurchase.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;
contract Purchase {
    uint public value;
    address payable public seller;
    address payable public buyer;

    enum State { Created, Locked, Release, Inactive }
    // The state variable has a default value of the first member, `State.created`
    State public state;

    modifier condition(bool condition_) {
        require(condition_);
        _;
    }

    /// Only the buyer can call this function.
    error OnlyBuyer();
    /// Only the seller can call this function.
    error OnlySeller();
    /// The function cannot be called at the current state.
    error InvalidState();
    /// The provided value has to be even.
    error ValueNotEven();

    modifier onlyBuyer() {
        if (msg.sender != buyer)
            revert OnlyBuyer();
        _;
    }

    modifier onlySeller() {
        if (msg.sender != seller)
            revert OnlySeller();
        _;
    }

    modifier inState(State state_) {
        if (state != state_)
            revert InvalidState();
        _;
    }

    event Aborted();
    event PurchaseConfirmed();
    event ItemReceived();
    event SellerRefunded();
    event MsgValue(uint value);
    event RevertCreationForOdd();

    // Ensure that `msg.value` is an even number.
    // Division will truncate if it is an odd number.
    // Check via multiplication that it wasn't an odd number.
    constructor() payable {
        seller = payable(msg.sender);
        value = msg.value / 2;
        emit MsgValue(value);
        if ((2 * value) != msg.value)
            emit RevertCreationForOdd();
    }

    /// Abort the purchase and reclaim the ether.
    /// Can only be called by the seller before
    /// the contract is locked.
    function abort()
        external
        onlySeller
        inState(State.Created)
    {
        emit Aborted();
        state = State.Inactive;
        // We use transfer here directly. It is
        // reentrancy-safe, because it is the
        // last call in this function and we
        // already changed the state.
        seller.transfer(address(this).balance);
    }

    /// Confirm the purchase as buyer.
    /// Transaction has to include `2 * value` ether.
    /// The ether will be locked until confirmReceived
    /// is called.
    function confirmPurchase()
        external
        inState(State.Created)
        condition(msg.value == (2 * value))
        payable
    {
        emit PurchaseConfirmed();
        buyer = payable(msg.sender);
        state = State.Locked;
    }

    /// Confirm that you (the buyer) received the item.
    /// This will release the locked ether.
    function confirmReceived()
        external
        onlyBuyer
        inState(State.Locked)
    {
        emit ItemReceived();
        // It is important to change the state first because
        // otherwise, the contracts called using `send` below
        // can call in again here.
        state = State.Release;

        buyer.transfer(value);
    }

    /// This function refunds the seller, i.e.
    /// pays back the locked funds of the seller.
    function refundSeller()
        external
        onlySeller
        inState(State.Release)
    {
        emit SellerRefunded();
        // It is important to change the state first because
        // otherwise, the contracts called using `send` below
        // can call in again here.
        state = State.Inactive;

        seller.transfer(3 * value);
    }
}
// Filename: contracts/solidity/scoping/Scoping.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Scoping {
    function minimalScoping() pure public {
        {
            uint same;
            same = 1;
        }

        {
            uint same;
            same = 3;
        }
    }

    function reassign() pure public returns (uint) {
        uint x = 1;
        {
            x = 2; // this will assign to the outer variable
            uint x;
        }
        return x; // x has value 2
    }
}
// Filename: contracts/solidity/signature-example/ReceiverPays.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.7.0 <0.9.0;

contract ReceiverPays {
    address owner = msg.sender;

    mapping(uint256 => bool) usedNonces;

    constructor() payable {}

    function claimPayment(uint256 amount, uint256 nonce, bytes memory signature) external {
        require(!usedNonces[nonce], "invalid nonce");
        usedNonces[nonce] = true;

        // this recreates the message that was signed on the client
        bytes32 message = prefixed(keccak256(abi.encodePacked(msg.sender, amount, nonce, this)));

        require(recoverSigner(message, signature) == owner, "invalid signature");

        payable(msg.sender).transfer(amount);
    }

    /// destroy the contract and reclaim the leftover funds.
    function shutdown() external {
        require(msg.sender == owner, "only owner can shutdown");
        // This will report a warning due to deprecated selfdestruct
        selfdestruct(payable(msg.sender));
    }

    /// signature methods.
    function splitSignature(bytes memory sig)
        internal
        pure
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        require(sig.length == 65);

        assembly {
            // first 32 bytes, after the length prefix.
            r := mload(add(sig, 32))
            // second 32 bytes.
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes).
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function recoverSigner(bytes32 message, bytes memory sig)
        internal
        pure
        returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);

        return ecrecover(message, v, r, s);
    }

    /// builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}
// Filename: contracts/solidity/simple-auction/SimpleAuction.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract SimpleAuction {
    address payable public beneficiary;
    uint public auctionEndTime;
    address public highestBidder;
    uint public highestBid;

    mapping(address => uint) pendingReturns;
    bool ended;

    event HighestBidIncreased(address bidder, uint amount);
    event AuctionEnded(address winner, uint amount);
    event FundReturned(address recepient, uint amount);

    /// The auction has already ended.
    error AuctionAlreadyEnded();
    /// There is already a higher or equal bid.
    error BidNotHighEnough();
    /// The auction has not ended yet.
    error AuctionNotYetEnded();
    /// The function auctionEnd has already been called.
    error AuctionEndAlreadyCalled();

    constructor(
        uint biddingTime,
        address payable beneficiaryAddress
    ) {
        auctionEndTime = block.timestamp + biddingTime;
        beneficiary = beneficiaryAddress;
    }

    function bid() external payable {
        if (block.timestamp > auctionEndTime)
            revert('AuctionAlreadyEnded');

        if (highestBid >= msg.value)
            revert('BidNotHighEnough');

        if (highestBid != 0) {
            pendingReturns[highestBidder] += highestBid;
        }

        highestBidder = msg.sender;
        highestBid = msg.value;
        emit HighestBidIncreased(msg.sender, msg.value);
    }

    /// Withdraw a bid that was overbid.
    function withdraw() external returns (bool) {
        uint amount = pendingReturns[msg.sender];
        if (amount > 0) {
            pendingReturns[msg.sender] = 0;
            if (!payable(msg.sender).send(amount)) {
                pendingReturns[msg.sender] = amount;
                emit FundReturned(msg.sender, amount);
                return false;
            }
        }
        return true;
    }

    /// End the auction and send the highest bid
    /// to the beneficiary.
    function auctionEnd() external {
        if (block.timestamp < auctionEndTime)
            revert AuctionNotYetEnded();
        if (ended)
            revert AuctionEndAlreadyCalled();

        ended = true;
        emit AuctionEnded(highestBidder, highestBid);

        beneficiary.transfer(highestBid);
    }
}// Filename: contracts/solidity/transaction/MessageFrameAddresses.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract MessageFrameAddresses {
    function getTxOrigin() external view returns (address) {
        return tx.origin;
    }

    function getMsgSender() external view returns (address) {
        return msg.sender;
    }
}
// Filename: contracts/solidity/transaction/Transaction.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import { MessageFrameAddresses } from "./MessageFrameAddresses.sol";

contract Transaction {
    string public message;
    uint myInteger;
    address messageFrameAddresses;
    MessageFrameAddresses mfContract;
    event MsgValue(uint256);

    constructor(address addr) {
       messageFrameAddresses = addr;
       mfContract = MessageFrameAddresses(payable(addr));
    }

    function checkGasleft() external view returns (uint256) {
        return gasleft();
    }

    function getMessageData(uint integer, string memory inputMessage) external returns (bytes memory) {
        message = inputMessage;
        myInteger = integer;

        return msg.data;
    }

    function getMessageSender() external view returns (address) {
        return msg.sender;
    }

    function getMessageSignature() external pure returns (bytes4) {
        return msg.sig;
    }

    function getMessageValue() external payable {
        emit MsgValue(msg.value);
    }

    function getGasPrice() external view returns (uint256) {
        return tx.gasprice;
    }

    function getTxOriginFromSecondary() external view returns (address) {
        return mfContract.getTxOrigin();
    }

    function getMsgSenderFromSecondary() external view returns (address) {
        return mfContract.getMsgSender();
    }
}
// Filename: contracts/solidity/typeops/AnotherContract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

import "./MyInterface.sol";

contract AnotherContract is MyInterface {
    function sayHelloWorld() external pure returns (string memory) {
        return "Hello World";
    }

    function myFunction() external pure override returns (uint) {
        return 123;
    }
}
// Filename: contracts/solidity/typeops/MyInterface.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

// Define an interface
interface MyInterface {
    function myFunction() external pure returns (uint);
}
// Filename: contracts/solidity/typeops/TypeOps.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

import "./MyInterface.sol";
import "./AnotherContract.sol";

contract TypeOps {

    // type(C).name where C is a contract
    function typeContractName() external pure returns (string memory) {
        // get the contract name
        return type(TypeOps).name;
    }

    // `type(C).creationCode` where `C` is a contract
    function typeContractCreationCode() external pure returns (bytes memory) {
        // get the contract creation code
        return type(AnotherContract).creationCode;
    }

    // `type(C).runtimeCode` where `C` is a contract
    function typeContractRuntimeCode() external pure returns (bytes memory) {
        // get the contract runtime code
        return type(AnotherContract).runtimeCode;
    }

    // type(I).interfaceId where I is an interface
    function typeInterfaceId() external pure returns (bytes4) {
        // get the interface id
        return type(MyInterface).interfaceId;
    }

    // `type(I).min` where `T` is an integer type
    function typeIntegerMin() external pure returns (int) {
        // get the minimum value of int
        return type(int).min;
    }
    
    // `type(T).max` where `T` is an integer type
    function typeIntegerMax() external pure returns (int) {
        // get the minimum value of int
        return type(int).max;
    }

    // `type(T).min` where `T` is an unsigned integer type
    function typeUintMin() external pure returns (uint) {
        // get the minimum value of uint
        return type(uint).min;
    }

    // `type(T).max` where `T` is an unsigned integer type
    function typeUintMax() external pure returns (uint) {
        // get the maximum value of uint
        return type(uint).max;
    }

}
// Filename: contracts/solidity/units/cryptoUnits.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract CryptoUnits {
    constructor() {
    }

    function get1Wei() public pure returns (uint) {
      return 1 wei;
    }

    function get1GWei() public pure returns (uint256) {
      return 1 gwei;
    }

    function get1Eth() public pure returns (uint256) {
      return 1 ether;
    }
}
// Filename: contracts/solidity/units/timeUnits.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract TimeUnits {
    constructor() {
    }

    function get1Second() public pure returns (uint) {
      return 1 seconds;
    }

    function get1Minute() public pure returns (uint) {
      return 1 minutes;
    }

    function get1Hour() public pure returns (uint) {
      return 1 hours;
    }

    function get1Day() public pure returns (uint) {
      return 1 days;
    }

    function get1Week() public pure returns (uint) {
      return 1 weeks;
    }
}
// Filename: contracts/solidity/voting/Ballot.sol
// SPDX-License-Identifier: Apache 2.0
pragma solidity >=0.7.0 <0.9.0;
/// @title Voting with delegation.
// contract ballot from https://docs.soliditylang.org/en/latest/solidity-by-example.html#voting
contract Ballot {
    // This declares a new complex type which will
    // be used for variables later.
    // It will represent a single voter.
    struct Voter {
        uint weight; // weight is accumulated by delegation
        bool voted;  // if true, that person already voted
        address delegate; // person delegated to
        uint vote;   // index of the voted proposal
    }

    // This is a type for a single proposal.
    struct Proposal {
        bytes32 name;   // short name (up to 32 bytes)
        uint voteCount; // number of accumulated votes
    }

    address public chairperson;

    // This declares a state variable that
    // stores a `Voter` struct for each possible address.
    mapping(address => Voter) public voters;

    // A dynamically-sized array of `Proposal` structs.
    Proposal[] public proposals;

    /// Create a new ballot to choose one of `proposalNames`.
    constructor(bytes32[] memory proposalNames) {
        chairperson = msg.sender;
        voters[chairperson].weight = 1;

        // For each of the provided proposal names,
        // create a new proposal object and add it
        // to the end of the array.
        for (uint i = 0; i < proposalNames.length; i++) {
            // `Proposal({...})` creates a temporary
            // Proposal object and `proposals.push(...)`
            // appends it to the end of `proposals`.
            proposals.push(Proposal({
                name: proposalNames[i],
                voteCount: 0
            }));
        }
    }

    // Give `voter` the right to vote on this ballot.
    // May only be called by `chairperson`.
    function giveRightToVote(address voter) external {
        // If the first argument of `require` evaluates
        // to `false`, execution terminates and all
        // changes to the state and to Ether balances
        // are reverted.
        // This used to consume all gas in old EVM versions, but
        // not anymore.
        // It is often a good idea to use `require` to check if
        // functions are called correctly.
        // As a second argument, you can also provide an
        // explanation about what went wrong.
        require(
            msg.sender == chairperson,
            "Only chairperson can give right to vote."
        );
        require(
            !voters[voter].voted,
            "The voter already voted."
        );
        require(voters[voter].weight == 0);
        voters[voter].weight = 1;
    }

    /// Delegate your vote to the voter `to`.
    function delegate(address to) external {
        // assigns reference
        Voter storage sender = voters[msg.sender];
        require(sender.weight != 0, "You have no right to vote");
        require(!sender.voted, "You already voted.");

        require(to != msg.sender, "Self-delegation is disallowed.");

        // Forward the delegation as long as
        // `to` also delegated.
        // In general, such loops are very dangerous,
        // because if they run too long, they might
        // need more gas than is available in a block.
        // In this case, the delegation will not be executed,
        // but in other situations, such loops might
        // cause a contract to get "stuck" completely.
        while (voters[to].delegate != address(0)) {
            to = voters[to].delegate;

            // We found a loop in the delegation, not allowed.
            require(to != msg.sender, "Found loop in delegation.");
        }

        Voter storage delegate_ = voters[to];

        // Voters cannot delegate to accounts that cannot vote.
        require(delegate_.weight >= 1);

        // Since `sender` is a reference, this
        // modifies `voters[msg.sender]`.
        sender.voted = true;
        sender.delegate = to;

        if (delegate_.voted) {
            // If the delegate already voted,
            // directly add to the number of votes
            proposals[delegate_.vote].voteCount += sender.weight;
        } else {
            // If the delegate did not vote yet,
            // add to her weight.
            delegate_.weight += sender.weight;
        }
    }

    /// Give your vote (including votes delegated to you)
    /// to proposal `proposals[proposal].name`.
    function vote(uint proposal) external {
        Voter storage sender = voters[msg.sender];
        require(sender.weight != 0, "Has no right to vote");
        require(!sender.voted, "Already voted.");
        sender.voted = true;
        sender.vote = proposal;

        // If `proposal` is out of the range of the array,
        // this will throw automatically and revert all
        // changes.
        proposals[proposal].voteCount += sender.weight;
    }

    /// @dev Computes the winning proposal taking all
    /// previous votes into account.
    function winningProposal() public view
            returns (uint winningProposal_)
    {
        uint winningVoteCount = 0;
        for (uint p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposal_ = p;
            }
        }
    }

    // Calls winningProposal() function to get the index
    // of the winner contained in the proposals array and then
    // returns the name of the winner
    function winnerName() external view
            returns (bytes32 winnerName_)
    {
        winnerName_ = proposals[winningProposal()].name;
    }
}
// Filename: contracts/state-registry/StateRegistry.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

enum Choices {Top, Bottom, Left, Right}

struct ContractStruct {
    uint256 varUint256;
    address varAddress;
    bytes32 varBytes32;
    string varString;
    Choices varContractType;
    uint256[] varUint256Arr;
    string varStringConcat;
}

contract ContractType {
    uint256 public number;

    constructor() {
        number = block.number;
    }
}

/**
 * @dev mainly designed for migration testing
 */
contract StateRegistry {

    bool varBool;

    uint8 varUint8;
    uint16 varUint16;
    uint32 varUint32;
    uint64 varUint64;
    uint128 varUint128;
    uint256 varUint256;

    int8 varInt8;
    int16 varInt16;
    int32 varInt32;
    int64 varInt64;
    int128 varInt128;
    int256 varInt256;

    address varAddress;
    ContractType varContractType;
    bytes32 varBytes32;
    string varString;


    Choices varEnum;

    uint[] varIntArrDataAllocBefore;
    uint[] varIntArrDataAllocAfter;
    uint[] varIntArrDataAllocDeleted;

    string varStringConcat;
    string varStringConcatDeleted;

    ContractStruct varContractStruct;
    ContractStruct varContractStructDeleted;

    mapping(address account => uint256) balance;

    function setVarBool(bool newVar) external {
        varBool = newVar;
    }

    function getVarBool() external view returns (bool) {
        return varBool;
    }

    function setVarUint8(uint8 newVar) external {
        varUint8 = newVar;
    }

    function getVarUint8() external view returns (uint8) {
        return varUint8;
    }

    function setVarUint16(uint16 newVar) external {
        varUint16 = newVar;
    }

    function getVarUint16() external view returns (uint16) {
        return varUint16;
    }

    function setVarUint32(uint32 newVar) external {
        varUint32 = newVar;
    }

    function getVarUint32() external view returns (uint32) {
        return varUint32;
    }

    function setVarUint64(uint64 newVar) external {
        varUint64 = newVar;
    }

    function getVarUint64() external view returns (uint64) {
        return varUint64;
    }

    function setVarUint128(uint128 newVar) external {
        varUint128 = newVar;
    }

    function getVarUint128() external view returns (uint128) {
        return varUint128;
    }

    function setVarUint256(uint256 newVar) external {
        varUint256 = newVar;
    }

    function getVarUint256() external view returns (uint256) {
        return varUint256;
    }

    function setVarInt8(int8 newVar) external {
        varInt8 = newVar;
    }

    function getVarInt8() external view returns (int8) {
        return varInt8;
    }

    function setVarInt16(int16 newVar) external {
        varInt16 = newVar;
    }

    function getVarInt16() external view returns (int16) {
        return varInt16;
    }

    function setVarInt32(int32 newVar) external {
        varInt32 = newVar;
    }

    function getVarInt32() external view returns (int32) {
        return varInt32;
    }

    function setVarInt64(int64 newVar) external {
        varInt64 = newVar;
    }

    function getVarInt64() external view returns (int64) {
        return varInt64;
    }

    function setVarInt128(int128 newVar) external {
        varInt128 = newVar;
    }

    function getVarInt128() external view returns (int128) {
        return varInt128;
    }

    function setVarInt256(int256 newVar) external {
        varInt256 = newVar;
    }

    function getVarInt256() external view returns (int256) {
        return varInt256;
    }

    function setVarAddress(address newVar) external {
        varAddress = newVar;
    }

    function getVarAddress() external view returns (address) {
        return varAddress;
    }

    function setVarContractType() external {
        varContractType = new ContractType();
    }

    function getVarContractType() external view returns (ContractType) {
        return varContractType;
    }

    function setVarBytes32(bytes32 newVar) external {
        varBytes32 = newVar;
    }

    function getVarBytes32() external view returns (bytes32) {
        return varBytes32;
    }

    function setVarString(string memory newVar) external {
        varString = newVar;
    }

    function getVarString() external view returns (string memory) {
        return varString;
    }

    function setVarEnum(Choices newVar) external {
        varEnum = newVar;
    }

    function getVarEnum() external view returns (Choices) {
        return varEnum;
    }

    function setVarIntArrDataAlloc(uint[] calldata newVar) external {
        varIntArrDataAllocBefore = newVar;

        uint[] storage localVar = varIntArrDataAllocBefore;
        localVar.pop();
        // pointer to varIntArrDataAllocBefore, so varIntArrDataAllocAfter should pop varIntArrDataAllocBefore as well
        varIntArrDataAllocAfter = localVar;
    }

    function getVarIntArrDataAlloc() external view returns (uint[] memory, uint[] memory) {
        return (varIntArrDataAllocBefore, varIntArrDataAllocAfter);
    }

    function setVarIntArrDataAllocDeleted(uint[] calldata newVar) external {
        varIntArrDataAllocDeleted = newVar;
    }
    function deleteVarIntArrDataAllocDeleted() external {
        delete varIntArrDataAllocDeleted;
    }

    function getVarIntArrDataAllocDeleted() external view returns (uint[] memory) {
        return varIntArrDataAllocDeleted;
    }

    function setVarStringConcat(string memory newVar) external {
        varStringConcat = string.concat(varStringConcat, newVar);
    }

    function getVarStringConcat() external view returns (string memory) {
        return varStringConcat;
    }

    function setVarStringConcatDeleted(string memory newVar) external {
        varStringConcatDeleted = string.concat(varStringConcatDeleted, newVar);
    }

    function getVarStringConcatDeleted() external view returns (string memory) {
        return varStringConcatDeleted;
    }

    function deleteVarStringConcatDeleted() external {
        delete varStringConcatDeleted;
    }

    function setVarContractStruct(ContractStruct memory newVar) external {
        varContractStruct = newVar;
    }

    function getVarContractStruct() external view returns (ContractStruct memory) {
        return varContractStruct;
    }

     function setVarContractStructDeleted(ContractStruct memory newVar) external {
        varContractStructDeleted = newVar;
    }

    function getVarContractStructDeleted() external view returns (ContractStruct memory) {
        return varContractStructDeleted;
    }

    function deleteVarContractStructDeleted() external {
        delete varContractStructDeleted;
    }

    function setBalance(address addr, uint256 value) external {
        balance[addr] = value;
    }

    function balanceOf(address account) public view returns (uint256) {
        return balance[account];
    }

    function deleteBalance(address addr) external {
        delete balance[addr];
    }

    function getContractStorageStateHash() external view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    abi.encode(
                        varUint8, varUint16, varUint32, varUint64, varUint128, varUint256, 
                        varInt8, varInt16, varInt32, varInt64, varInt128, varInt256
                    ),
                    abi.encode(
                        varBool, varAddress, varContractType, varBytes32, varString, 
                        varIntArrDataAllocBefore, varIntArrDataAllocAfter, varIntArrDataAllocDeleted
                    ),
                    abi.encode(
                        varStringConcat, varStringConcatDeleted,
                        varContractStruct, varContractStructDeleted
                    )
                )
            );
    }
}
// Filename: contracts/system-contracts/HederaResponseCodes.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.4.9 <0.9.0;

library HederaResponseCodes {

    // response codes
    int32 internal constant OK = 0; // The transaction passed the precheck validations.
    int32 internal constant INVALID_TRANSACTION = 1; // For any error not handled by specific error codes listed below.
    int32 internal constant PAYER_ACCOUNT_NOT_FOUND = 2; //Payer account does not exist.
    int32 internal constant INVALID_NODE_ACCOUNT = 3; //Node Account provided does not match the node account of the node the transaction was submitted to.
    int32 internal constant TRANSACTION_EXPIRED = 4; // Pre-Check error when TransactionValidStart + transactionValidDuration is less than current consensus time.
    int32 internal constant INVALID_TRANSACTION_START = 5; // Transaction start time is greater than current consensus time
    int32 internal constant INVALID_TRANSACTION_DURATION = 6; //valid transaction duration is a positive non zero number that does not exceed 120 seconds
    int32 internal constant INVALID_SIGNATURE = 7; // The transaction signature is not valid
    int32 internal constant MEMO_TOO_LONG = 8; //Transaction memo size exceeded 100 bytes
    int32 internal constant INSUFFICIENT_TX_FEE = 9; // The fee provided in the transaction is insufficient for this type of transaction
    int32 internal constant INSUFFICIENT_PAYER_BALANCE = 10; // The payer account has insufficient cryptocurrency to pay the transaction fee
    int32 internal constant DUPLICATE_TRANSACTION = 11; // This transaction ID is a duplicate of one that was submitted to this node or reached consensus in the last 180 seconds (receipt period)
    int32 internal constant BUSY = 12; //If API is throttled out
    int32 internal constant NOT_SUPPORTED = 13; //The API is not currently supported

    int32 internal constant INVALID_FILE_ID = 14; //The file id is invalid or does not exist
    int32 internal constant INVALID_ACCOUNT_ID = 15; //The account id is invalid or does not exist
    int32 internal constant INVALID_CONTRACT_ID = 16; //The contract id is invalid or does not exist
    int32 internal constant INVALID_TRANSACTION_ID = 17; //Transaction id is not valid
    int32 internal constant RECEIPT_NOT_FOUND = 18; //Receipt for given transaction id does not exist
    int32 internal constant RECORD_NOT_FOUND = 19; //Record for given transaction id does not exist
    int32 internal constant INVALID_SOLIDITY_ID = 20; //The solidity id is invalid or entity with this solidity id does not exist

    int32 internal constant UNKNOWN = 21; // The responding node has submitted the transaction to the network. Its final status is still unknown.
    int32 internal constant SUCCESS = 22; // The transaction succeeded
    int32 internal constant FAIL_INVALID = 23; // There was a system error and the transaction failed because of invalid request parameters.
    int32 internal constant FAIL_FEE = 24; // There was a system error while performing fee calculation, reserved for future.
    int32 internal constant FAIL_BALANCE = 25; // There was a system error while performing balance checks, reserved for future.

    int32 internal constant KEY_REQUIRED = 26; //Key not provided in the transaction body
    int32 internal constant BAD_ENCODING = 27; //Unsupported algorithm/encoding used for keys in the transaction
    int32 internal constant INSUFFICIENT_ACCOUNT_BALANCE = 28; //When the account balance is not sufficient for the transfer
    int32 internal constant INVALID_SOLIDITY_ADDRESS = 29; //During an update transaction when the system is not able to find the Users Solidity address

    int32 internal constant INSUFFICIENT_GAS = 30; //Not enough gas was supplied to execute transaction
    int32 internal constant CONTRACT_SIZE_LIMIT_EXCEEDED = 31; //contract byte code size is over the limit
    int32 internal constant LOCAL_CALL_MODIFICATION_EXCEPTION = 32; //local execution (query) is requested for a function which changes state
    int32 internal constant CONTRACT_REVERT_EXECUTED = 33; //Contract REVERT OPCODE executed
    int32 internal constant CONTRACT_EXECUTION_EXCEPTION = 34; //For any contract execution related error not handled by specific error codes listed above.
    int32 internal constant INVALID_RECEIVING_NODE_ACCOUNT = 35; //In Query validation, account with +ve(amount) value should be Receiving node account, the receiver account should be only one account in the list
    int32 internal constant MISSING_QUERY_HEADER = 36; // Header is missing in Query request

    int32 internal constant ACCOUNT_UPDATE_FAILED = 37; // The update of the account failed
    int32 internal constant INVALID_KEY_ENCODING = 38; // Provided key encoding was not supported by the system
    int32 internal constant NULL_SOLIDITY_ADDRESS = 39; // null solidity address

    int32 internal constant CONTRACT_UPDATE_FAILED = 40; // update of the contract failed
    int32 internal constant INVALID_QUERY_HEADER = 41; // the query header is invalid

    int32 internal constant INVALID_FEE_SUBMITTED = 42; // Invalid fee submitted
    int32 internal constant INVALID_PAYER_SIGNATURE = 43; // Payer signature is invalid

    int32 internal constant KEY_NOT_PROVIDED = 44; // The keys were not provided in the request.
    int32 internal constant INVALID_EXPIRATION_TIME = 45; // Expiration time provided in the transaction was invalid.
    int32 internal constant NO_WACL_KEY = 46; //WriteAccess Control Keys are not provided for the file
    int32 internal constant FILE_CONTENT_EMPTY = 47; //The contents of file are provided as empty.
    int32 internal constant INVALID_ACCOUNT_AMOUNTS = 48; // The crypto transfer credit and debit do not sum equal to 0
    int32 internal constant EMPTY_TRANSACTION_BODY = 49; // Transaction body provided is empty
    int32 internal constant INVALID_TRANSACTION_BODY = 50; // Invalid transaction body provided

    int32 internal constant INVALID_SIGNATURE_TYPE_MISMATCHING_KEY = 51; // the type of key (base ed25519 key, KeyList, or ThresholdKey) does not match the type of signature (base ed25519 signature, SignatureList, or ThresholdKeySignature)
    int32 internal constant INVALID_SIGNATURE_COUNT_MISMATCHING_KEY = 52; // the number of key (KeyList, or ThresholdKey) does not match that of signature (SignatureList, or ThresholdKeySignature). e.g. if a keyList has 3 base keys, then the corresponding signatureList should also have 3 base signatures.

    int32 internal constant EMPTY_LIVE_HASH_BODY = 53; // the livehash body is empty
    int32 internal constant EMPTY_LIVE_HASH = 54; // the livehash data is missing
    int32 internal constant EMPTY_LIVE_HASH_KEYS = 55; // the keys for a livehash are missing
    int32 internal constant INVALID_LIVE_HASH_SIZE = 56; // the livehash data is not the output of a SHA-384 digest

    int32 internal constant EMPTY_QUERY_BODY = 57; // the query body is empty
    int32 internal constant EMPTY_LIVE_HASH_QUERY = 58; // the crypto livehash query is empty
    int32 internal constant LIVE_HASH_NOT_FOUND = 59; // the livehash is not present
    int32 internal constant ACCOUNT_ID_DOES_NOT_EXIST = 60; // the account id passed has not yet been created.
    int32 internal constant LIVE_HASH_ALREADY_EXISTS = 61; // the livehash already exists for a given account

    int32 internal constant INVALID_FILE_WACL = 62; // File WACL keys are invalid
    int32 internal constant SERIALIZATION_FAILED = 63; // Serialization failure
    int32 internal constant TRANSACTION_OVERSIZE = 64; // The size of the Transaction is greater than transactionMaxBytes
    int32 internal constant TRANSACTION_TOO_MANY_LAYERS = 65; // The Transaction has more than 50 levels
    int32 internal constant CONTRACT_DELETED = 66; //Contract is marked as deleted

    int32 internal constant PLATFORM_NOT_ACTIVE = 67; // the platform node is either disconnected or lagging behind.
    int32 internal constant KEY_PREFIX_MISMATCH = 68; // one internal key matches more than one prefixes on the signature map
    int32 internal constant PLATFORM_TRANSACTION_NOT_CREATED = 69; // transaction not created by platform due to large backlog
    int32 internal constant INVALID_RENEWAL_PERIOD = 70; // auto renewal period is not a positive number of seconds
    int32 internal constant INVALID_PAYER_ACCOUNT_ID = 71; // the response code when a smart contract id is passed for a crypto API request
    int32 internal constant ACCOUNT_DELETED = 72; // the account has been marked as deleted
    int32 internal constant FILE_DELETED = 73; // the file has been marked as deleted
    int32 internal constant ACCOUNT_REPEATED_IN_ACCOUNT_AMOUNTS = 74; // same accounts repeated in the transfer account list
    int32 internal constant SETTING_NEGATIVE_ACCOUNT_BALANCE = 75; // attempting to set negative balance value for crypto account
    int32 internal constant OBTAINER_REQUIRED = 76; // when deleting smart contract that has crypto balance either transfer account or transfer smart contract is required
    int32 internal constant OBTAINER_SAME_CONTRACT_ID = 77; //when deleting smart contract that has crypto balance you can not use the same contract id as transferContractId as the one being deleted
    int32 internal constant OBTAINER_DOES_NOT_EXIST = 78; //transferAccountId or transferContractId specified for contract delete does not exist
    int32 internal constant MODIFYING_IMMUTABLE_CONTRACT = 79; //attempting to modify (update or delete a immutable smart contract, i.e. one created without a admin key)
    int32 internal constant FILE_SYSTEM_EXCEPTION = 80; //Unexpected exception thrown by file system functions
    int32 internal constant AUTORENEW_DURATION_NOT_IN_RANGE = 81; // the duration is not a subset of [MINIMUM_AUTORENEW_DURATION,MAXIMUM_AUTORENEW_DURATION]
    int32 internal constant ERROR_DECODING_BYTESTRING = 82; // Decoding the smart contract binary to a byte array failed. Check that the input is a valid hex string.
    int32 internal constant CONTRACT_FILE_EMPTY = 83; // File to create a smart contract was of length zero
    int32 internal constant CONTRACT_BYTECODE_EMPTY = 84; // Bytecode for smart contract is of length zero
    int32 internal constant INVALID_INITIAL_BALANCE = 85; // Attempt to set negative initial balance
    int32 internal constant INVALID_RECEIVE_RECORD_THRESHOLD = 86; // [Deprecated]. attempt to set negative receive record threshold
    int32 internal constant INVALID_SEND_RECORD_THRESHOLD = 87; // [Deprecated]. attempt to set negative send record threshold
    int32 internal constant ACCOUNT_IS_NOT_GENESIS_ACCOUNT = 88; // Special Account Operations should be performed by only Genesis account, return this code if it is not Genesis Account
    int32 internal constant PAYER_ACCOUNT_UNAUTHORIZED = 89; // The fee payer account doesn't have permission to submit such Transaction
    int32 internal constant INVALID_FREEZE_TRANSACTION_BODY = 90; // FreezeTransactionBody is invalid
    int32 internal constant FREEZE_TRANSACTION_BODY_NOT_FOUND = 91; // FreezeTransactionBody does not exist
    int32 internal constant TRANSFER_LIST_SIZE_LIMIT_EXCEEDED = 92; //Exceeded the number of accounts (both from and to) allowed for crypto transfer list
    int32 internal constant RESULT_SIZE_LIMIT_EXCEEDED = 93; // Smart contract result size greater than specified maxResultSize
    int32 internal constant NOT_SPECIAL_ACCOUNT = 94; //The payer account is not a special account(account 0.0.55)
    int32 internal constant CONTRACT_NEGATIVE_GAS = 95; // Negative gas was offered in smart contract call
    int32 internal constant CONTRACT_NEGATIVE_VALUE = 96; // Negative value / initial balance was specified in a smart contract call / create
    int32 internal constant INVALID_FEE_FILE = 97; // Failed to update fee file
    int32 internal constant INVALID_EXCHANGE_RATE_FILE = 98; // Failed to update exchange rate file
    int32 internal constant INSUFFICIENT_LOCAL_CALL_GAS = 99; // Payment tendered for contract local call cannot cover both the fee and the gas
    int32 internal constant ENTITY_NOT_ALLOWED_TO_DELETE = 100; // Entities with Entity ID below 1000 are not allowed to be deleted
    int32 internal constant AUTHORIZATION_FAILED = 101; // Violating one of these rules: 1) treasury account can update all entities below 0.0.1000, 2) account 0.0.50 can update all entities from 0.0.51 - 0.0.80, 3) Network Function Master Account A/c 0.0.50 - Update all Network Function accounts & perform all the Network Functions listed below, 4) Network Function Accounts: i) A/c 0.0.55 - Update Address Book files (0.0.101/102), ii) A/c 0.0.56 - Update Fee schedule (0.0.111), iii) A/c 0.0.57 - Update Exchange Rate (0.0.112).
    int32 internal constant FILE_UPLOADED_PROTO_INVALID = 102; // Fee Schedule Proto uploaded but not valid (append or update is required)
    int32 internal constant FILE_UPLOADED_PROTO_NOT_SAVED_TO_DISK = 103; // Fee Schedule Proto uploaded but not valid (append or update is required)
    int32 internal constant FEE_SCHEDULE_FILE_PART_UPLOADED = 104; // Fee Schedule Proto File Part uploaded
    int32 internal constant EXCHANGE_RATE_CHANGE_LIMIT_EXCEEDED = 105; // The change on Exchange Rate exceeds Exchange_Rate_Allowed_Percentage
    int32 internal constant MAX_CONTRACT_STORAGE_EXCEEDED = 106; // Contract permanent storage exceeded the currently allowable limit
    int32 internal constant TRANSFER_ACCOUNT_SAME_AS_DELETE_ACCOUNT = 107; // Transfer Account should not be same as Account to be deleted
    int32 internal constant TOTAL_LEDGER_BALANCE_INVALID = 108;
    int32 internal constant EXPIRATION_REDUCTION_NOT_ALLOWED = 110; // The expiration date/time on a smart contract may not be reduced
    int32 internal constant MAX_GAS_LIMIT_EXCEEDED = 111; //Gas exceeded currently allowable gas limit per transaction
    int32 internal constant MAX_FILE_SIZE_EXCEEDED = 112; // File size exceeded the currently allowable limit

    int32 internal constant INVALID_TOPIC_ID = 150; // The Topic ID specified is not in the system.
    int32 internal constant INVALID_ADMIN_KEY = 155; // A provided admin key was invalid.
    int32 internal constant INVALID_SUBMIT_KEY = 156; // A provided submit key was invalid.
    int32 internal constant UNAUTHORIZED = 157; // An attempted operation was not authorized (ie - a deleteTopic for a topic with no adminKey).
    int32 internal constant INVALID_TOPIC_MESSAGE = 158; // A ConsensusService message is empty.
    int32 internal constant INVALID_AUTORENEW_ACCOUNT = 159; // The autoRenewAccount specified is not a valid, active account.
    int32 internal constant AUTORENEW_ACCOUNT_NOT_ALLOWED = 160; // An adminKey was not specified on the topic, so there must not be an autoRenewAccount.
    // The topic has expired, was not automatically renewed, and is in a 7 day grace period before the topic will be
    // deleted unrecoverably. This error response code will not be returned until autoRenew functionality is supported
    // by HAPI.
    int32 internal constant TOPIC_EXPIRED = 162;
    int32 internal constant INVALID_CHUNK_NUMBER = 163; // chunk number must be from 1 to total (chunks) inclusive.
    int32 internal constant INVALID_CHUNK_TRANSACTION_ID = 164; // For every chunk, the payer account that is part of initialTransactionID must match the Payer Account of this transaction. The entire initialTransactionID should match the transactionID of the first chunk, but this is not checked or enforced by Hedera except when the chunk number is 1.
    int32 internal constant ACCOUNT_FROZEN_FOR_TOKEN = 165; // Account is frozen and cannot transact with the token
    int32 internal constant TOKENS_PER_ACCOUNT_LIMIT_EXCEEDED = 166; // An involved account already has more than <tt>tokens.maxPerAccount</tt> associations with non-deleted tokens.
    int32 internal constant INVALID_TOKEN_ID = 167; // The token is invalid or does not exist
    int32 internal constant INVALID_TOKEN_DECIMALS = 168; // Invalid token decimals
    int32 internal constant INVALID_TOKEN_INITIAL_SUPPLY = 169; // Invalid token initial supply
    int32 internal constant INVALID_TREASURY_ACCOUNT_FOR_TOKEN = 170; // Treasury Account does not exist or is deleted
    int32 internal constant INVALID_TOKEN_SYMBOL = 171; // Token Symbol is not UTF-8 capitalized alphabetical string
    int32 internal constant TOKEN_HAS_NO_FREEZE_KEY = 172; // Freeze key is not set on token
    int32 internal constant TRANSFERS_NOT_ZERO_SUM_FOR_TOKEN = 173; // Amounts in transfer list are not net zero
    int32 internal constant MISSING_TOKEN_SYMBOL = 174; // A token symbol was not provided
    int32 internal constant TOKEN_SYMBOL_TOO_LONG = 175; // The provided token symbol was too long
    int32 internal constant ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN = 176; // KYC must be granted and account does not have KYC granted
    int32 internal constant TOKEN_HAS_NO_KYC_KEY = 177; // KYC key is not set on token
    int32 internal constant INSUFFICIENT_TOKEN_BALANCE = 178; // Token balance is not sufficient for the transaction
    int32 internal constant TOKEN_WAS_DELETED = 179; // Token transactions cannot be executed on deleted token
    int32 internal constant TOKEN_HAS_NO_SUPPLY_KEY = 180; // Supply key is not set on token
    int32 internal constant TOKEN_HAS_NO_WIPE_KEY = 181; // Wipe key is not set on token
    int32 internal constant INVALID_TOKEN_MINT_AMOUNT = 182; // The requested token mint amount would cause an invalid total supply
    int32 internal constant INVALID_TOKEN_BURN_AMOUNT = 183; // The requested token burn amount would cause an invalid total supply
    int32 internal constant TOKEN_NOT_ASSOCIATED_TO_ACCOUNT = 184; // A required token-account relationship is missing
    int32 internal constant CANNOT_WIPE_TOKEN_TREASURY_ACCOUNT = 185; // The target of a wipe operation was the token treasury account
    int32 internal constant INVALID_KYC_KEY = 186; // The provided KYC key was invalid.
    int32 internal constant INVALID_WIPE_KEY = 187; // The provided wipe key was invalid.
    int32 internal constant INVALID_FREEZE_KEY = 188; // The provided freeze key was invalid.
    int32 internal constant INVALID_SUPPLY_KEY = 189; // The provided supply key was invalid.
    int32 internal constant MISSING_TOKEN_NAME = 190; // Token Name is not provided
    int32 internal constant TOKEN_NAME_TOO_LONG = 191; // Token Name is too long
    int32 internal constant INVALID_WIPING_AMOUNT = 192; // The provided wipe amount must not be negative, zero or bigger than the token holder balance
    int32 internal constant TOKEN_IS_IMMUTABLE = 193; // Token does not have Admin key set, thus update/delete transactions cannot be performed
    int32 internal constant TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT = 194; // An <tt>associateToken</tt> operation specified a token already associated to the account
    int32 internal constant TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES = 195; // An attempted operation is invalid until all token balances for the target account are zero
    int32 internal constant ACCOUNT_IS_TREASURY = 196; // An attempted operation is invalid because the account is a treasury
    int32 internal constant TOKEN_ID_REPEATED_IN_TOKEN_LIST = 197; // Same TokenIDs present in the token list
    int32 internal constant TOKEN_TRANSFER_LIST_SIZE_LIMIT_EXCEEDED = 198; // Exceeded the number of token transfers (both from and to) allowed for token transfer list
    int32 internal constant EMPTY_TOKEN_TRANSFER_BODY = 199; // TokenTransfersTransactionBody has no TokenTransferList
    int32 internal constant EMPTY_TOKEN_TRANSFER_ACCOUNT_AMOUNTS = 200; // TokenTransfersTransactionBody has a TokenTransferList with no AccountAmounts
    int32 internal constant INVALID_SCHEDULE_ID = 201; // The Scheduled entity does not exist; or has now expired, been deleted, or been executed
    int32 internal constant SCHEDULE_IS_IMMUTABLE = 202; // The Scheduled entity cannot be modified. Admin key not set
    int32 internal constant INVALID_SCHEDULE_PAYER_ID = 203; // The provided Scheduled Payer does not exist
    int32 internal constant INVALID_SCHEDULE_ACCOUNT_ID = 204; // The Schedule Create Transaction TransactionID account does not exist
    int32 internal constant NO_NEW_VALID_SIGNATURES = 205; // The provided sig map did not contain any new valid signatures from required signers of the scheduled transaction
    int32 internal constant UNRESOLVABLE_REQUIRED_SIGNERS = 206; // The required signers for a scheduled transaction cannot be resolved, for example because they do not exist or have been deleted
    int32 internal constant SCHEDULED_TRANSACTION_NOT_IN_WHITELIST = 207; // Only whitelisted transaction types may be scheduled
    int32 internal constant SOME_SIGNATURES_WERE_INVALID = 208; // At least one of the signatures in the provided sig map did not represent a valid signature for any required signer
    int32 internal constant TRANSACTION_ID_FIELD_NOT_ALLOWED = 209; // The scheduled field in the TransactionID may not be set to true
    int32 internal constant IDENTICAL_SCHEDULE_ALREADY_CREATED = 210; // A schedule already exists with the same identifying fields of an attempted ScheduleCreate (that is, all fields other than scheduledPayerAccountID)
    int32 internal constant INVALID_ZERO_BYTE_IN_STRING = 211; // A string field in the transaction has a UTF-8 encoding with the prohibited zero byte
    int32 internal constant SCHEDULE_ALREADY_DELETED = 212; // A schedule being signed or deleted has already been deleted
    int32 internal constant SCHEDULE_ALREADY_EXECUTED = 213; // A schedule being signed or deleted has already been executed
    int32 internal constant MESSAGE_SIZE_TOO_LARGE = 214; // ConsensusSubmitMessage request's message size is larger than allowed.
    int32 internal constant OPERATION_REPEATED_IN_BUCKET_GROUPS = 215; // An operation was assigned to more than one throttle group in a given bucket
    int32 internal constant BUCKET_CAPACITY_OVERFLOW = 216; // The capacity needed to satisfy all opsPerSec groups in a bucket overflowed a signed 8-byte integral type
    int32 internal constant NODE_CAPACITY_NOT_SUFFICIENT_FOR_OPERATION = 217; // Given the network size in the address book, the node-level capacity for an operation would never be enough to accept a single request; usually means a bucket burstPeriod should be increased
    int32 internal constant BUCKET_HAS_NO_THROTTLE_GROUPS = 218; // A bucket was defined without any throttle groups
    int32 internal constant THROTTLE_GROUP_HAS_ZERO_OPS_PER_SEC = 219; // A throttle group was granted zero opsPerSec
    int32 internal constant SUCCESS_BUT_MISSING_EXPECTED_OPERATION = 220; // The throttle definitions file was updated, but some supported operations were not assigned a bucket
    int32 internal constant UNPARSEABLE_THROTTLE_DEFINITIONS = 221; // The new contents for the throttle definitions system file were not valid protobuf
    int32 internal constant INVALID_THROTTLE_DEFINITIONS = 222; // The new throttle definitions system file were invalid, and no more specific error could be divined
    int32 internal constant ACCOUNT_EXPIRED_AND_PENDING_REMOVAL = 223; // The transaction references an account which has passed its expiration without renewal funds available, and currently remains in the ledger only because of the grace period given to expired entities
    int32 internal constant INVALID_TOKEN_MAX_SUPPLY = 224; // Invalid token max supply
    int32 internal constant INVALID_TOKEN_NFT_SERIAL_NUMBER = 225; // Invalid token nft serial number
    int32 internal constant INVALID_NFT_ID = 226; // Invalid nft id
    int32 internal constant METADATA_TOO_LONG = 227; // Nft metadata is too long
    int32 internal constant BATCH_SIZE_LIMIT_EXCEEDED = 228; // Repeated operations count exceeds the limit
    int32 internal constant INVALID_QUERY_RANGE = 229; // The range of data to be gathered is out of the set boundaries
    int32 internal constant FRACTION_DIVIDES_BY_ZERO = 230; // A custom fractional fee set a denominator of zero
    int32 internal constant INSUFFICIENT_PAYER_BALANCE_FOR_CUSTOM_FEE = 231; // The transaction payer could not afford a custom fee
    int32 internal constant CUSTOM_FEES_LIST_TOO_LONG = 232; // More than 10 custom fees were specified
    int32 internal constant INVALID_CUSTOM_FEE_COLLECTOR = 233; // Any of the feeCollector accounts for customFees is invalid
    int32 internal constant INVALID_TOKEN_ID_IN_CUSTOM_FEES = 234; // Any of the token Ids in customFees is invalid
    int32 internal constant TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR = 235; // Any of the token Ids in customFees are not associated to feeCollector
    int32 internal constant TOKEN_MAX_SUPPLY_REACHED = 236; // A token cannot have more units minted due to its configured supply ceiling
    int32 internal constant SENDER_DOES_NOT_OWN_NFT_SERIAL_NO = 237; // The transaction attempted to move an NFT serial number from an account other than its owner
    int32 internal constant CUSTOM_FEE_NOT_FULLY_SPECIFIED = 238; // A custom fee schedule entry did not specify either a fixed or fractional fee
    int32 internal constant CUSTOM_FEE_MUST_BE_POSITIVE = 239; // Only positive fees may be assessed at this time
    int32 internal constant TOKEN_HAS_NO_FEE_SCHEDULE_KEY = 240; // Fee schedule key is not set on token
    int32 internal constant CUSTOM_FEE_OUTSIDE_NUMERIC_RANGE = 241; // A fractional custom fee exceeded the range of a 64-bit signed integer
    int32 internal constant ROYALTY_FRACTION_CANNOT_EXCEED_ONE = 242; // A royalty cannot exceed the total fungible value exchanged for an NFT
    int32 internal constant FRACTIONAL_FEE_MAX_AMOUNT_LESS_THAN_MIN_AMOUNT = 243; // Each fractional custom fee must have its maximum_amount, if specified, at least its minimum_amount
    int32 internal constant CUSTOM_SCHEDULE_ALREADY_HAS_NO_FEES = 244; // A fee schedule update tried to clear the custom fees from a token whose fee schedule was already empty
    int32 internal constant CUSTOM_FEE_DENOMINATION_MUST_BE_FUNGIBLE_COMMON = 245; // Only tokens of type FUNGIBLE_COMMON can be used to as fee schedule denominations
    int32 internal constant CUSTOM_FRACTIONAL_FEE_ONLY_ALLOWED_FOR_FUNGIBLE_COMMON = 246; // Only tokens of type FUNGIBLE_COMMON can have fractional fees
    int32 internal constant INVALID_CUSTOM_FEE_SCHEDULE_KEY = 247; // The provided custom fee schedule key was invalid
    int32 internal constant INVALID_TOKEN_MINT_METADATA = 248; // The requested token mint metadata was invalid
    int32 internal constant INVALID_TOKEN_BURN_METADATA = 249; // The requested token burn metadata was invalid
    int32 internal constant CURRENT_TREASURY_STILL_OWNS_NFTS = 250; // The treasury for a unique token cannot be changed until it owns no NFTs
    int32 internal constant ACCOUNT_STILL_OWNS_NFTS = 251; // An account cannot be dissociated from a unique token if it owns NFTs for the token
    int32 internal constant TREASURY_MUST_OWN_BURNED_NFT = 252; // A NFT can only be burned when owned by the unique token's treasury
    int32 internal constant ACCOUNT_DOES_NOT_OWN_WIPED_NFT = 253; // An account did not own the NFT to be wiped
    int32 internal constant ACCOUNT_AMOUNT_TRANSFERS_ONLY_ALLOWED_FOR_FUNGIBLE_COMMON = 254; // An AccountAmount token transfers list referenced a token type other than FUNGIBLE_COMMON
    int32 internal constant MAX_NFTS_IN_PRICE_REGIME_HAVE_BEEN_MINTED = 255; // All the NFTs allowed in the current price regime have already been minted
    int32 internal constant PAYER_ACCOUNT_DELETED = 256; // The payer account has been marked as deleted
    int32 internal constant CUSTOM_FEE_CHARGING_EXCEEDED_MAX_RECURSION_DEPTH = 257; // The reference chain of custom fees for a transferred token exceeded the maximum length of 2
    int32 internal constant CUSTOM_FEE_CHARGING_EXCEEDED_MAX_ACCOUNT_AMOUNTS = 258; // More than 20 balance adjustments were to satisfy a CryptoTransfer and its implied custom fee payments
    int32 internal constant INSUFFICIENT_SENDER_ACCOUNT_BALANCE_FOR_CUSTOM_FEE = 259; // The sender account in the token transfer transaction could not afford a custom fee
    int32 internal constant SERIAL_NUMBER_LIMIT_REACHED = 260; // Currently no more than 4,294,967,295 NFTs may be minted for a given unique token type
    int32 internal constant CUSTOM_ROYALTY_FEE_ONLY_ALLOWED_FOR_NON_FUNGIBLE_UNIQUE = 261; // Only tokens of type NON_FUNGIBLE_UNIQUE can have royalty fees
    int32 internal constant NO_REMAINING_AUTOMATIC_ASSOCIATIONS = 262; // The account has reached the limit on the automatic associations count.
    int32 internal constant EXISTING_AUTOMATIC_ASSOCIATIONS_EXCEED_GIVEN_LIMIT = 263; // Already existing automatic associations are more than the new maximum automatic associations.
    int32 internal constant REQUESTED_NUM_AUTOMATIC_ASSOCIATIONS_EXCEEDS_ASSOCIATION_LIMIT = 264; // Cannot set the number of automatic associations for an account more than the maximum allowed tokens.maxPerAccount.
    int32 internal constant TOKEN_IS_PAUSED = 265; // Token is paused. This Token cannot be a part of any kind of Transaction until unpaused.
    int32 internal constant TOKEN_HAS_NO_PAUSE_KEY = 266; // Pause key is not set on token
    int32 internal constant INVALID_PAUSE_KEY = 267; // The provided pause key was invalid
    int32 internal constant FREEZE_UPDATE_FILE_DOES_NOT_EXIST = 268; // The update file in a freeze transaction body must exist.
    int32 internal constant FREEZE_UPDATE_FILE_HASH_DOES_NOT_MATCH = 269; // The hash of the update file in a freeze transaction body must match the in-memory hash.
    int32 internal constant NO_UPGRADE_HAS_BEEN_PREPARED = 270; // A FREEZE_UPGRADE transaction was handled with no previous update prepared.
    int32 internal constant NO_FREEZE_IS_SCHEDULED = 271; // A FREEZE_ABORT transaction was handled with no scheduled freeze.
    int32 internal constant UPDATE_FILE_HASH_CHANGED_SINCE_PREPARE_UPGRADE = 272; // The update file hash when handling a FREEZE_UPGRADE transaction differs from the file hash at the time of handling the PREPARE_UPGRADE transaction.
    int32 internal constant FREEZE_START_TIME_MUST_BE_FUTURE = 273; // The given freeze start time was in the (consensus) past.
    int32 internal constant PREPARED_UPDATE_FILE_IS_IMMUTABLE = 274; // The prepared update file cannot be updated or appended until either the upgrade has been completed, or a FREEZE_ABORT has been handled.
    int32 internal constant FREEZE_ALREADY_SCHEDULED = 275; // Once a freeze is scheduled, it must be aborted before any other type of freeze can be performed.
    int32 internal constant FREEZE_UPGRADE_IN_PROGRESS = 276; // If an NMT upgrade has been prepared, the following operation must be a FREEZE_UPGRADE (To issue a FREEZE_ONLY, submit a FREEZE_ABORT first.)
    int32 internal constant UPDATE_FILE_ID_DOES_NOT_MATCH_PREPARED = 277; // If an NMT upgrade has been prepared, the subsequent FREEZE_UPGRADE transaction must confirm the id of the file to be used in the upgrade.
    int32 internal constant UPDATE_FILE_HASH_DOES_NOT_MATCH_PREPARED = 278; // If an NMT upgrade has been prepared, the subsequent FREEZE_UPGRADE transaction must confirm the hash of the file to be used in the upgrade.
    int32 internal constant CONSENSUS_GAS_EXHAUSTED = 279; // Consensus throttle did not allow execution of this transaction. System is throttled at consensus level.
    int32 internal constant REVERTED_SUCCESS = 280; // A precompiled contract succeeded, but was later reverted.
    int32 internal constant MAX_STORAGE_IN_PRICE_REGIME_HAS_BEEN_USED = 281; // All contract storage allocated to the current price regime has been consumed.
    int32 internal constant INVALID_ALIAS_KEY = 282; // An alias used in a CryptoTransfer transaction is not the serialization of a primitive Key message -- that is, a Key with a single Ed25519 or ECDSA(secp256k1) public key and no unknown protobuf fields.
    int32 internal constant UNEXPECTED_TOKEN_DECIMALS = 283; // A fungible token transfer expected a different number of decimals than the involved type actually has.
    int32 internal constant INVALID_PROXY_ACCOUNT_ID = 284; // [Deprecated] The proxy account id is invalid or does not exist.
    int32 internal constant INVALID_TRANSFER_ACCOUNT_ID = 285; // The transfer account id in CryptoDelete transaction is invalid or does not exist.
    int32 internal constant INVALID_FEE_COLLECTOR_ACCOUNT_ID = 286; // The fee collector account id in TokenFeeScheduleUpdate is invalid or does not exist.
    int32 internal constant ALIAS_IS_IMMUTABLE = 287; // The alias already set on an account cannot be updated using CryptoUpdate transaction.
    int32 internal constant SPENDER_ACCOUNT_SAME_AS_OWNER = 288; // An approved allowance specifies a spender account that is the same as the hbar/token owner account.
    int32 internal constant AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY = 289; // The establishment or adjustment of an approved allowance cause the token allowance to exceed the token maximum supply.
    int32 internal constant NEGATIVE_ALLOWANCE_AMOUNT = 290; // The specified amount for an approved allowance cannot be negative.
    int32 internal constant CANNOT_APPROVE_FOR_ALL_FUNGIBLE_COMMON = 291; // [Deprecated] The approveForAll flag cannot be set for a fungible token.
    int32 internal constant SPENDER_DOES_NOT_HAVE_ALLOWANCE = 292; // The spender does not have an existing approved allowance with the hbar/token owner.
    int32 internal constant AMOUNT_EXCEEDS_ALLOWANCE = 293; // The transfer amount exceeds the current approved allowance for the spender account.
    int32 internal constant MAX_ALLOWANCES_EXCEEDED = 294; // The payer account of an approveAllowances or adjustAllowance transaction is attempting to go beyond the maximum allowed number of allowances.
    int32 internal constant EMPTY_ALLOWANCES = 295; // No allowances have been specified in the approval transaction.
    int32 internal constant SPENDER_ACCOUNT_REPEATED_IN_ALLOWANCES = 296; // [Deprecated] Spender is repeated more than once in Crypto or Token or NFT allowance lists in a single CryptoApproveAllowance transaction.
    int32 internal constant REPEATED_SERIAL_NUMS_IN_NFT_ALLOWANCES = 297; // [Deprecated] Serial numbers are repeated in nft allowance for a single spender account
    int32 internal constant FUNGIBLE_TOKEN_IN_NFT_ALLOWANCES = 298; // Fungible common token used in NFT allowances
    int32 internal constant NFT_IN_FUNGIBLE_TOKEN_ALLOWANCES = 299; // Non fungible token used in fungible token allowances
    int32 internal constant INVALID_ALLOWANCE_OWNER_ID = 300; // The account id specified as the owner is invalid or does not exist.
    int32 internal constant INVALID_ALLOWANCE_SPENDER_ID = 301; // The account id specified as the spender is invalid or does not exist.
    int32 internal constant REPEATED_ALLOWANCES_TO_DELETE = 302; // [Deprecated] If the CryptoDeleteAllowance transaction has repeated crypto or token or Nft allowances to delete.
    int32 internal constant INVALID_DELEGATING_SPENDER = 303; // If the account Id specified as the delegating spender is invalid or does not exist.
    int32 internal constant DELEGATING_SPENDER_CANNOT_GRANT_APPROVE_FOR_ALL = 304; // The delegating Spender cannot grant approveForAll allowance on a NFT token type for another spender.
    int32 internal constant DELEGATING_SPENDER_DOES_NOT_HAVE_APPROVE_FOR_ALL = 305; // The delegating Spender cannot grant allowance on a NFT serial for another spender as it doesnt not have approveForAll granted on token-owner.
    int32 internal constant SCHEDULE_EXPIRATION_TIME_TOO_FAR_IN_FUTURE = 306; // The scheduled transaction could not be created because it's expiration_time was too far in the future.
    int32 internal constant SCHEDULE_EXPIRATION_TIME_MUST_BE_HIGHER_THAN_CONSENSUS_TIME = 307; // The scheduled transaction could not be created because it's expiration_time was less than or equal to the consensus time.
    int32 internal constant SCHEDULE_FUTURE_THROTTLE_EXCEEDED = 308; // The scheduled transaction could not be created because it would cause throttles to be violated on the specified expiration_time.
    int32 internal constant SCHEDULE_FUTURE_GAS_LIMIT_EXCEEDED = 309; // The scheduled transaction could not be created because it would cause the gas limit to be violated on the specified expiration_time.
    int32 internal constant INVALID_ETHEREUM_TRANSACTION = 310; // The ethereum transaction either failed parsing or failed signature validation, or some other EthereumTransaction error not covered by another response code.
    int32 internal constant WRONG_CHAIN_ID = 311; // EthereumTransaction was signed against a chainId that this network does not support.
    int32 internal constant WRONG_NONCE = 312; // This transaction specified an ethereumNonce that is not the current ethereumNonce of the account.
    int32 internal constant ACCESS_LIST_UNSUPPORTED = 313; // The ethereum transaction specified an access list, which the network does not support.
    int32 internal constant SCHEDULE_PENDING_EXPIRATION = 314; // A schedule being signed or deleted has passed it's expiration date and is pending execution if needed and then expiration.
    int32 internal constant CONTRACT_IS_TOKEN_TREASURY = 315; // A selfdestruct or ContractDelete targeted a contract that is a token treasury.
    int32 internal constant CONTRACT_HAS_NON_ZERO_TOKEN_BALANCES = 316; // A selfdestruct or ContractDelete targeted a contract with non-zero token balances.
    int32 internal constant CONTRACT_EXPIRED_AND_PENDING_REMOVAL = 317; // A contract referenced by a transaction is "detached"; that is, expired and lacking any hbar funds for auto-renewal payment---but still within its post-expiry grace period.
    int32 internal constant CONTRACT_HAS_NO_AUTO_RENEW_ACCOUNT = 318; // A ContractUpdate requested removal of a contract's auto-renew account, but that contract has no auto-renew account.
    int32 internal constant PERMANENT_REMOVAL_REQUIRES_SYSTEM_INITIATION = 319; // A delete transaction submitted via HAPI set permanent_removal=true
    int32 internal constant PROXY_ACCOUNT_ID_FIELD_IS_DEPRECATED = 320; // A CryptoCreate or ContractCreate used the deprecated proxyAccountID field.
    int32 internal constant SELF_STAKING_IS_NOT_ALLOWED = 321; // An account set the staked_account_id to itself in CryptoUpdate or ContractUpdate transactions.
    int32 internal constant INVALID_STAKING_ID = 322; // The staking account id or staking node id given is invalid or does not exist.
    int32 internal constant STAKING_NOT_ENABLED = 323; // Native staking, while implemented, has not yet enabled by the council.
    int32 internal constant INVALID_PRNG_RANGE = 324; // The range provided in UtilPrng transaction is negative.
    int32 internal constant MAX_ENTITIES_IN_PRICE_REGIME_HAVE_BEEN_CREATED = 325; // The maximum number of entities allowed in the current price regime have been created.
    int32 internal constant INVALID_FULL_PREFIX_SIGNATURE_FOR_PRECOMPILE = 326; // The full prefix signature for precompile is not valid
    int32 internal constant INSUFFICIENT_BALANCES_FOR_STORAGE_RENT = 327; // The combined balances of a contract and its auto-renew account (if any) did not cover the rent charged for net new storage used in a transaction.
    int32 internal constant MAX_CHILD_RECORDS_EXCEEDED = 328; // A contract transaction tried to use more than the allowed number of child records, via either system contract records or internal contract creations.
    int32 internal constant INSUFFICIENT_BALANCES_FOR_RENEWAL_FEES = 329; // The combined balances of a contract and its auto-renew account (if any) or balance of an account did not cover the auto-renewal fees in a transaction.
}
// Filename: contracts/system-contracts/exchange-rate/ExchangeRateMock.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

import "./SelfFunding.sol";

contract ExchangeRateMock is SelfFunding {
    event TinyBars(uint256 tinybars);
    event TinyCents(uint256 tinycents);

    function convertTinycentsToTinybars(uint256 tineycents) external returns (uint256 tinybars) {
        tinybars = tinycentsToTinybars(tineycents);
        emit TinyBars(tinybars);
    }

    function convertTinybarsToTinycents(uint256 tinybars) external returns (uint256 tineycents) {
        tineycents = tinybarsToTinycents(tinybars);
        emit TinyCents(tineycents);
    }
}// Filename: contracts/system-contracts/exchange-rate/ExchangeRateSystemContract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

import "./SelfFunding.sol";


contract ExchangeRateSystemContract is SelfFunding {
    // The USD in cents that must be sent as msg.value
    uint256 toll;

    constructor(uint256 _toll) {
        toll = _toll;
    }

    function gatedAccess() external payable costsCents(toll) {
        // Hope it was worth it!
    }

    function approxUsdValue() external payable returns (uint256 tinycents) {
        tinycents = tinybarsToTinycents(msg.value);
    }

    function invalidCall() external payable {
        // Should fail, this is not a valid selector 
        (bool success, ) = PRECOMPILE_ADDRESS.call(
            abi.encodeWithSelector(ExchangeRateSystemContract.approxUsdValue.selector));
        require(success);
    }
}
// Filename: contracts/system-contracts/exchange-rate/IExchangeRate.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.4.9 <0.9.0;

interface IExchangeRate {
    // Given a value in tinycents (1e-8 US cents or 1e-10 USD), returns the
    // equivalent value in tinybars (1e-8 HBAR) at the current exchange rate
    // stored in system file 0.0.112.
    //
    // This rate is a weighted median of the the recent" HBAR-USD exchange
    // rate on major exchanges, but should _not_ be treated as a live price
    // oracle! It is important primarily because the network will use it to
    // compute the tinybar fees for the active transaction.
    //
    // So a "self-funding" contract can use this rate to compute how much
    // tinybar its users must send to cover the Hedera fees for the transaction.
    function tinycentsToTinybars(uint256 tinycents) external returns (uint256);

    // Given a value in tinybars (1e-8 HBAR), returns the equivalent value in
    // tinycents (1e-8 US cents or 1e-10 USD) at the current exchange rate
    // stored in system file 0.0.112.
    //
    // This rate tracks the the HBAR-USD rate on public exchanges, but
    // should _not_ be treated as a live price oracle! This conversion is
    // less likely to be needed than the above conversion from tinycent to
    // tinybars, but we include it for completeness.
    function tinybarsToTinycents(uint256 tinybars) external returns (uint256);
}
// Filename: contracts/system-contracts/exchange-rate/SelfFunding.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

import "./IExchangeRate.sol";

abstract contract SelfFunding {
    uint256 constant TINY_PARTS_PER_WHOLE = 100_000_000;
    address constant PRECOMPILE_ADDRESS = address(0x168);

    function tinycentsToTinybars(uint256 tinycents) internal returns (uint256 tinybars) {
        (bool success, bytes memory result) = PRECOMPILE_ADDRESS.call(
            abi.encodeWithSelector(IExchangeRate.tinycentsToTinybars.selector, tinycents));
        require(success);
        tinybars = abi.decode(result, (uint256));
    }

    function tinybarsToTinycents(uint256 tinybars) internal returns (uint256 tinycents) {
        (bool success, bytes memory result) = PRECOMPILE_ADDRESS.call(
            abi.encodeWithSelector(IExchangeRate.tinybarsToTinycents.selector, tinybars));
        require(success);
        tinycents = abi.decode(result, (uint256));
    }

    modifier costsCents(uint256 cents) {
        uint256 tinycents = cents * TINY_PARTS_PER_WHOLE;
        uint256 requiredTinybars = tinycentsToTinybars(tinycents);
        require(msg.value >= requiredTinybars);
        _;
    } 
}
// Filename: contracts/system-contracts/hedera-account-service/HederaAccountService.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "../HederaResponseCodes.sol";
import "./IHederaAccountService.sol";

abstract contract HederaAccountService {
    address constant HASPrecompileAddress = address(0x16a);

    /// Returns the amount of hbars that the spender has been authorized to spend on behalf of the owner.
    /// @param owner The account that has authorized the spender
    /// @param spender The account that has been authorized by the owner
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return amount The amount of hbar that the spender has been authorized to spend on behalf of the owner.
    function hbarAllowance(address owner, address spender) internal returns (int64 responseCode, int256 amount)
    {
        (bool success, bytes memory result) = HASPrecompileAddress.call(
            abi.encodeWithSelector(IHederaAccountService.hbarAllowance.selector,
                owner, spender));
        (responseCode, amount) = success ? abi.decode(result, (int32, int256)) : (HederaResponseCodes.UNKNOWN, (int256)(0));
    }


    /// Allows spender to withdraw hbars from the owner account multiple times, up to the value amount. If this function is called
    /// again it overwrites the current allowance with the new amount.
    /// @param owner The owner of the hbars
    /// @param spender the account address authorized to spend
    /// @param amount the amount of hbars authorized to spend.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function hbarApprove(address owner, address spender, int256 amount) internal returns (int64 responseCode)
    {
        (bool success, bytes memory result) = HASPrecompileAddress.call(
            abi.encodeWithSelector(IHederaAccountService.hbarApprove.selector,
                owner, spender, amount));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Determines if the signature is valid for the given message hash and account.
    /// It is assumed that the signature is composed of a single EDCSA or ED25519 key.
    /// @param account The account to check the signature against
    /// @param messageHash The hash of the message to check the signature against
    /// @param signature The signature to check
    /// @return response True if the signature is valid, false otherwise
    function isAuthorizedRaw(address account, bytes memory messageHash, bytes memory signature) internal returns (bool response) {
        (bool success, bytes memory result) = HASPrecompileAddress.call(
            abi.encodeWithSelector(IHederaAccountService.isAuthorizedRaw.selector,
                account, messageHash, signature));
        response = success ? abi.decode(result, (bool)) : false;
    }

}
// Filename: contracts/system-contracts/hedera-account-service/IHRC632.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.4.9 <0.9.0;

/**
 * notice: This interface is only applicable when msg.sender, an EOA, is at the top level of the transaction, 
 *         i.e. the EOA initiates the transaction. It means this interface does not work for a wrapper smart contract.
 */
interface IHRC632 {
    function hbarApprove(address spender, int256 amount) external returns (uint256 responseCode);
    function hbarAllowance(address spender) external returns (int64 responseCode, int256 amount);
}
// Filename: contracts/system-contracts/hedera-account-service/IHederaAccountService.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.4.9 <0.9.0;
pragma experimental ABIEncoderV2;

interface IHederaAccountService {

    /// Returns the amount of hbars that the spender has been authorized to spend on behalf of the owner.
    /// @param owner The account that has authorized the spender
    /// @param spender The account that has been authorized by the owner
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return amount The amount of hbar that the spender has been authorized to spend on behalf of the owner.
    function hbarAllowance(address owner, address spender)
    external
    returns (int64 responseCode, int256 amount);

    /// Allows spender to withdraw hbars from the owner account multiple times, up to the value amount. If this function is called
    /// again it overwrites the current allowance with the new amount.
    /// @param owner The owner of the hbars
    /// @param spender the account address authorized to spend
    /// @param amount the amount of hbars authorized to spend.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function hbarApprove(
        address owner,
        address spender,
        int256 amount
    ) external returns (int64 responseCode);

    /// Determines if the signature is valid for the given message hash and account.
    /// It is assumed that the signature is composed of a single EDCSA or ED25519 key.
    /// @param account The account to check the signature against
    /// @param messageHash The hash of the message to check the signature against
    /// @param signature The signature to check
    /// @return response True if the signature is valid, false otherwise
    function isAuthorizedRaw(
        address account,
        bytes memory messageHash,
        bytes memory signature) external returns (bool response);
}
// Filename: contracts/system-contracts/hedera-account-service/examples/crypto-allowance/cryptoAllowance.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "../../HederaAccountService.sol";
import "../../../hedera-token-service/HederaTokenService.sol";

contract CryptoAllowance is HederaAccountService, HederaTokenService {
    event ResponseCode(int responseCode);
    event HbarAllowance(address owner, address spender, int256 allowance);

    function hbarApprovePublic(address owner, address spender, int256 amount) public returns (int64 responseCode) {
        responseCode = HederaAccountService.hbarApprove(owner, spender, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function hbarAllowancePublic(address owner, address spender) public returns (int64 responseCode, int256 allowance) {
        (responseCode, allowance) = HederaAccountService.hbarAllowance(owner, spender);
        emit ResponseCode(responseCode);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
        emit HbarAllowance(owner, spender, allowance);
    }

    function cryptoTransferPublic(IHederaTokenService.TransferList calldata transferList, IHederaTokenService.TokenTransferList[] calldata tokenTransferList) public returns (int responseCode) {
        responseCode = HederaTokenService.cryptoTransfer(transferList, tokenTransferList);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }
}
// Filename: contracts/system-contracts/hedera-account-service/examples/crypto-allowance/cryptoOwner.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "../../HederaAccountService.sol";
import "../../../hedera-token-service/HederaTokenService.sol";

interface ICryptoAllowance {
    function cryptoTransferPublic(IHederaTokenService.TransferList calldata transferList, IHederaTokenService.TokenTransferList[] calldata tokenTransferList) external returns (int responseCode);
}

contract CryptoOwner is HederaAccountService {
    receive() external payable {}

    event ResponseCode(int responseCode);
    function cryptoTransfer(address _cryptoAllowance, int64 amount, address receiver) external returns(int64 responseCode) {
        // check if fund is sufficient for transfer
        uint contractBalance = address(this).balance;
        require(uint64(amount) <= contractBalance, "Insufficient Fund");

        // approve hbar usin HederaAccountService, i.e. HIP-906
        int64 approveResponseCode = HederaAccountService.hbarApprove(address(this), _cryptoAllowance, amount);
        if (approveResponseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        // prepare IHTS.AccountAmount[]
        IHederaTokenService.AccountAmount[] memory accountAmounts = new IHederaTokenService.AccountAmount[](2);
        accountAmounts[0] = IHederaTokenService.AccountAmount({
            accountID: address(this),
            amount: amount * -1,
            isApproval: false
        });

        accountAmounts[1] = IHederaTokenService.AccountAmount({
            accountID: receiver,
            amount: amount,
            isApproval: false
        });

        // prepare IHTS.TransferList
        IHederaTokenService.TransferList memory transferList = IHederaTokenService.TransferList({
            transfers: accountAmounts
        });
        
        // prepare IHTS.TokenTransferList
        IHederaTokenService.TokenTransferList[] memory tokenTransferList = new IHederaTokenService.TokenTransferList[](0);

        // call `cryptoTransferPublic` from _cryptoAllowance
        (bool success, bytes memory data) = _cryptoAllowance.call(abi.encodeWithSelector(ICryptoAllowance.cryptoTransferPublic.selector, transferList, tokenTransferList));

        if (success != true) {
            revert();
        }

        responseCode = abi.decode(data, (int64));
        emit ResponseCode(responseCode);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }
}
// Filename: contracts/system-contracts/hedera-token-service/AtomicHTS.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./IHRC719.sol";
import "./HederaTokenService.sol";
import "./IHederaTokenService.sol";

/**
 * @dev This contract contains multiple examples highlighting the utilization of the 
 * HIP-551: Batch transactions using HTS calls via HederaTokenService Precompile contract.
 * The batches rolls multiple HTS calls in one transaction that passes ACID test 
 * (atomicity, consistency, isolation, and durability).
 * Read more about HIP-551 at https://hips.hedera.com/hip/hip-551
 */
contract AtomicHTS is HederaTokenService {
    /// events ///
    event BatchAssociateGrantKYCTransfer(int associateResponseCode, int grantKYCResponseCode, int transferTokenResponseCode);
    event BatchApproveAssociateGrantKYCTransferFrom(int transferTokenResponseCode, int approveResponseCode, int associateResponseCode, int grantKYCResponseCode, int transferFromResponseCode);
    event BatchUnfreezeGrantKYCTransferFreeze(int unfreezeTokenResponseCode, int grantKYCResponseCode, int transferTokenResponseCode, int freezeTokenResponseCode);
    event BatchWipeMintTransfer(int wipeTokenResponseCode, int mintTokenResponseCode, int transferTokenResponseCode);
    event BatchMintUnfreezeGrantKYCTransferFreeze(int mintTokenResponseCode, int unfreezeTokenResponseCode, int grantKYCResponseCode, int freezeTokenResponseCode);
    event BatchAssociateMintGrantTransfer(int associateResponseCode, int mintTokenResponseCode, int grantKYCResponseCode, int transferTokenResponseCode);


    /**
     * @dev associates, grant token KYC, and send an amount of fungible token to a receiver.
     * - associateToken() -> grantTokenKYC() -> transferToken()
     */
    function batchAssociateGrantKYCTransfer(address token, address sender, address receiver, int64 amount) external {
        (int associateResponseCode) = HederaTokenService.associateToken(receiver, token);
        require(
            associateResponseCode == HederaResponseCodes.SUCCESS || 
            associateResponseCode == HederaResponseCodes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT, 
            "Failed to associate token."
        );

        /// @notice an account needs to be granted the KYC of the HTS token for it to receive the token
        (int grantKYCResponseCode) = HederaTokenService.grantTokenKyc(token, receiver);
        require(grantKYCResponseCode == HederaResponseCodes.SUCCESS, "Failed to grant token KYC.");

        (int transferTokenResponseCode) = HederaTokenService.transferToken(token, sender, receiver, amount);
        require(transferTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to transfer token.");

        emit BatchAssociateGrantKYCTransfer(associateResponseCode, grantKYCResponseCode, transferTokenResponseCode);
    }

    /**
     * @dev grant allowance and transfer the token on behalf of the token owner
     * - approve() -> associateToken() -> grantTokenKyc() -> transferFrom()
     *
     * @notice because .approve() can only grant allowances to spender on behalf of the caller, and in this case
     *         `this contract` is the caller who makes transactions to the `precompile contract`. With the same reason,
     *         .transferFrom() will transfer the tokens from token owner to the receipient by the spender (this contract)
     *         on behalf of the token owner. Therefore, the spender in this particular case will also be the sender whose balance
     *         will be deducted by the .transferFrom() method.
     */
    function batchApproveAssociateGrantKYCTransferFrom(address token, address owner, address receipient, int64 transferAmount, uint256 allowance) external {
        
        /// top up the spender with initial fund
        /// @notice it is necessary for the spender to be associated and granted token KYC to receive fund. 
        address spender = address(this);
        (int associateContractResponseCode) = HederaTokenService.associateToken(spender, token);
        require(
            associateContractResponseCode == HederaResponseCodes.SUCCESS || 
            associateContractResponseCode == HederaResponseCodes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT, 
            "Failed to associate token."
        );

        (int grantKYCContractResponseCode) = HederaTokenService.grantTokenKyc(token, spender);
        require(grantKYCContractResponseCode == HederaResponseCodes.SUCCESS, "Failed to grant token KYC.");

        (int transferTokenResponseCode) = HederaTokenService.transferToken(token, owner, spender, transferAmount);
        require(transferTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to transfer token.");

        /// main logics

        (int approveResponseCode) = HederaTokenService.approve(token, spender, allowance);
        require(approveResponseCode == HederaResponseCodes.SUCCESS, "Failed to grant token allowance.");

        (int associateResponseCode) = HederaTokenService.associateToken(receipient, token);
        require(
            associateResponseCode == HederaResponseCodes.SUCCESS || 
            associateResponseCode == HederaResponseCodes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT, 
            "Failed to associate token."
        );

        (int grantKYCResponseCode) = HederaTokenService.grantTokenKyc(token, receipient); 
        require(grantKYCResponseCode == HederaResponseCodes.SUCCESS, "Failed to grant token KYC.");

        (int transferFromResponseCode) = this.transferFrom(token, spender, receipient, allowance);
        require(transferFromResponseCode == HederaResponseCodes.SUCCESS, "Failed to transfer token.");

        emit BatchApproveAssociateGrantKYCTransferFrom(transferTokenResponseCode, approveResponseCode, associateResponseCode, grantKYCResponseCode, transferFromResponseCode);
    }

    /**
      * @dev unfreeze the token, transfers the token to receiver and freeze the token.
      * - unfreezeToken() -> grantTokenKyc() -> transferToken() -> freezeToken()
      */
    function batchUnfreezeGrantKYCTransferFreeze(address token, address sender, address receiver, int64 amount) external {
        (int unfreezeTokenResponseCode) = HederaTokenService.unfreezeToken(token, receiver);
        require(unfreezeTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to unfreeze token.");

        (int grantKYCResponseCode) = HederaTokenService.grantTokenKyc(token, receiver); 
        require(grantKYCResponseCode == HederaResponseCodes.SUCCESS, "Failed to grant token KYC.");

        (int transferTokenResponseCode) = HederaTokenService.transferToken(token, sender, receiver, amount);
        require(transferTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to transfer token.");

        (int freezeTokenResponseCode) = HederaTokenService.freezeToken(token, receiver);
        require(freezeTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to freeze token.");

        emit BatchUnfreezeGrantKYCTransferFreeze(unfreezeTokenResponseCode, grantKYCResponseCode, transferTokenResponseCode, freezeTokenResponseCode);
    }

    /**
     * @dev wipes a token from token owner's balance, then mint more tokens to the treasury and finally transfer the token from treasury to the token owner.
     * - wipeTokenAccount() -> mintToken() -> transferToken()
     */
    function batchWipeMintTransfer(address token, address treasury, address owner, int64 wipedAmount, int64 mintAmount, int64 transferAmount) external {
        bytes[] memory metadata;
        (int wipeTokenResponseCode) = HederaTokenService.wipeTokenAccount(token, owner, wipedAmount);
        require(wipeTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to wipe token.");

        (int mintTokenResponseCode,,) = HederaTokenService.mintToken(token, mintAmount, metadata);
        require(mintTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to mint token.");

        (int transferTokenResponseCode) = HederaTokenService.transferToken(token, treasury, owner, transferAmount);
        require(transferTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to transfer token.");

        emit BatchWipeMintTransfer(wipeTokenResponseCode, mintTokenResponseCode, transferTokenResponseCode);
    } 

    /**
     * @dev mints new tokens to treasury, unfreeze the receiver on the token so the receiver can receive token, and finally reset the freeze status on the receiver and the token.
     * - mintToken() -> unfreezeToken() -> grantTokenKyc() -> transferToken() -> freezeToken()
     */
    function batchMintUnfreezeGrantKYCTransferFreeze(address token, address sender, address receiver, int64 mintAmount, int64 transferAmount) external {
        bytes[] memory metadata;
        (int mintTokenResponseCode,,) = HederaTokenService.mintToken(token, mintAmount, metadata);
        require(mintTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to mint token.");

        (int unfreezeTokenResponseCode) = HederaTokenService.unfreezeToken(token, receiver);
        require(unfreezeTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to unfreeze token.");

        (int grantKYCResponseCode) = HederaTokenService.grantTokenKyc(token, receiver); 
        require(grantKYCResponseCode == HederaResponseCodes.SUCCESS, "Failed to grant token KYC.");

        (int transferTokenResponseCode) = HederaTokenService.transferToken(token, sender, receiver, transferAmount);
        require(transferTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to transfer token.");

        (int freezeTokenResponseCode) = HederaTokenService.freezeToken(token, receiver);
        require(freezeTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to freeze token.");

        emit BatchMintUnfreezeGrantKYCTransferFreeze(mintTokenResponseCode, unfreezeTokenResponseCode, grantKYCResponseCode, freezeTokenResponseCode);
    }

    /**
     * @dev associate the token with receiver, then mint new token on treasury and transfer the new minted tokens to receiver
     * - associateToken() -> mintToken() -> grantTokenKyc() -> transferToken()
     */
    function batchAssociateMintGrantTransfer(address token, address sender, address receiver, int64 amount) external {
        (int associateResponseCode) = HederaTokenService.associateToken(receiver, token);
        require(
            associateResponseCode == HederaResponseCodes.SUCCESS || 
            associateResponseCode == HederaResponseCodes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT, 
            "Failed to associate token."
        );

        bytes[] memory metadata;
        (int mintTokenResponseCode,,) = HederaTokenService.mintToken(token, amount, metadata);
        require(mintTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to mint token.");

        (int grantKYCResponseCode) = HederaTokenService.grantTokenKyc(token, receiver);
        require(grantKYCResponseCode == HederaResponseCodes.SUCCESS, "Failed to grant token KYC.");

        (int transferTokenResponseCode) = HederaTokenService.transferToken(token, sender, receiver, amount);
        require(transferTokenResponseCode == HederaResponseCodes.SUCCESS, "Failed to transfer token.");

        emit BatchAssociateMintGrantTransfer(associateResponseCode, mintTokenResponseCode, grantKYCResponseCode, transferTokenResponseCode);
    }
}
// Filename: contracts/system-contracts/hedera-token-service/ExpiryHelper.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./HederaTokenService.sol";

abstract contract ExpiryHelper {

    function createAutoRenewExpiry(
        address autoRenewAccount,
        int64 autoRenewPeriod
    ) internal pure returns (IHederaTokenService.Expiry memory expiry) {
        expiry.autoRenewAccount = autoRenewAccount;
        expiry.autoRenewPeriod = autoRenewPeriod;
    }

    function createSecondExpiry(int64 second) internal pure returns (IHederaTokenService.Expiry memory expiry) {
        expiry.second = second;
    }
}// Filename: contracts/system-contracts/hedera-token-service/FeeHelper.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./IHederaTokenService.sol";

abstract contract FeeHelper {
    function createFixedHbarFee(int64 amount, address feeCollector)
        internal
        pure
        returns (IHederaTokenService.FixedFee memory fixedFee)
    {
        fixedFee.amount = amount;
        fixedFee.useHbarsForPayment = true;
        fixedFee.feeCollector = feeCollector;
    }

    function createFixedTokenFee(
        int64 amount,
        address tokenId,
        address feeCollector
    ) internal pure returns (IHederaTokenService.FixedFee memory fixedFee) {
        fixedFee.amount = amount;
        fixedFee.tokenId = tokenId;
        fixedFee.feeCollector = feeCollector;
    }

    function createFixedSelfDenominatedFee(int64 amount, address feeCollector)
        internal
        pure
        returns (IHederaTokenService.FixedFee memory fixedFee)
    {
        fixedFee.amount = amount;
        fixedFee.useCurrentTokenForPayment = true;
        fixedFee.feeCollector = feeCollector;
    }

    function createFractionalFee(
        int64 numerator,
        int64 denominator,
        bool netOfTransfers,
        address feeCollector
    )
        internal
        pure
        returns (IHederaTokenService.FractionalFee memory fractionalFee)
    {
        fractionalFee.numerator = numerator;
        fractionalFee.denominator = denominator;
        fractionalFee.netOfTransfers = netOfTransfers;
        fractionalFee.feeCollector = feeCollector;
    }

    function createFractionalFeeWithMinAndMax(
        int64 numerator,
        int64 denominator,
        int64 minimumAmount,
        int64 maximumAmount,
        bool netOfTransfers,
        address feeCollector
    )
        internal
        pure
        returns (IHederaTokenService.FractionalFee memory fractionalFee)
    {
        fractionalFee.numerator = numerator;
        fractionalFee.denominator = denominator;
        fractionalFee.minimumAmount = minimumAmount;
        fractionalFee.maximumAmount = maximumAmount;
        fractionalFee.netOfTransfers = netOfTransfers;
        fractionalFee.feeCollector = feeCollector;
    }

    function createFractionalFeeWithLimits(
        int64 numerator,
        int64 denominator,
        int64 minimumAmount,
        int64 maximumAmount,
        bool netOfTransfers,
        address feeCollector
    )
        internal
        pure
        returns (IHederaTokenService.FractionalFee memory fractionalFee)
    {
        fractionalFee.numerator = numerator;
        fractionalFee.denominator = denominator;
        fractionalFee.minimumAmount = minimumAmount;
        fractionalFee.maximumAmount = maximumAmount;
        fractionalFee.netOfTransfers = netOfTransfers;
        fractionalFee.feeCollector = feeCollector;
    }

    function createRoyaltyFeeWithoutFallback(
        int64 numerator,
        int64 denominator,
        address feeCollector
    ) internal pure returns (IHederaTokenService.RoyaltyFee memory royaltyFee) {
        royaltyFee.numerator = numerator;
        royaltyFee.denominator = denominator;
        royaltyFee.feeCollector = feeCollector;
    }

    function createRoyaltyFeeWithHbarFallbackFee(
        int64 numerator,
        int64 denominator,
        int64 amount,
        address feeCollector
    ) internal pure returns (IHederaTokenService.RoyaltyFee memory royaltyFee) {
        royaltyFee.numerator = numerator;
        royaltyFee.denominator = denominator;
        royaltyFee.amount = amount;
        royaltyFee.useHbarsForPayment = true;
        royaltyFee.feeCollector = feeCollector;
    }

    function createRoyaltyFeeWithTokenDenominatedFallbackFee(
        int64 numerator,
        int64 denominator,
        int64 amount,
        address tokenId,
        address feeCollector
    ) internal pure returns (IHederaTokenService.RoyaltyFee memory royaltyFee) {
        royaltyFee.numerator = numerator;
        royaltyFee.denominator = denominator;
        royaltyFee.amount = amount;
        royaltyFee.tokenId = tokenId;
        royaltyFee.feeCollector = feeCollector;
    }

    function createNAmountFixedFeesForHbars(
        uint8 numberOfFees,
        int64 amount,
        address feeCollector
    ) internal pure returns (IHederaTokenService.FixedFee[] memory fixedFees) {
        fixedFees = new IHederaTokenService.FixedFee[](numberOfFees);

        for (uint8 i = 0; i < numberOfFees; i++) {
            IHederaTokenService.FixedFee
                memory fixedFee = createFixedFeeForHbars(amount, feeCollector);
            fixedFees[i] = fixedFee;
        }
    }

    function createSingleFixedFeeForToken(
        int64 amount,
        address tokenId,
        address feeCollector
    ) internal pure returns (IHederaTokenService.FixedFee[] memory fixedFees) {
        fixedFees = new IHederaTokenService.FixedFee[](1);
        IHederaTokenService.FixedFee memory fixedFee = createFixedFeeForToken(
            amount,
            tokenId,
            feeCollector
        );
        fixedFees[0] = fixedFee;
    }

    function createFixedFeesForToken(
        int64 amount,
        address tokenId,
        address firstFeeCollector,
        address secondFeeCollector
    ) internal pure returns (IHederaTokenService.FixedFee[] memory fixedFees) {
        fixedFees = new IHederaTokenService.FixedFee[](1);
        IHederaTokenService.FixedFee memory fixedFee1 = createFixedFeeForToken(
            amount,
            tokenId,
            firstFeeCollector
        );
        IHederaTokenService.FixedFee memory fixedFee2 = createFixedFeeForToken(
            2 * amount,
            tokenId,
            secondFeeCollector
        );
        fixedFees[0] = fixedFee1;
        fixedFees[0] = fixedFee2;
    }

    function createSingleFixedFeeForHbars(int64 amount, address feeCollector)
        internal
        pure
        returns (IHederaTokenService.FixedFee[] memory fixedFees)
    {
        fixedFees = new IHederaTokenService.FixedFee[](1);
        IHederaTokenService.FixedFee memory fixedFee = createFixedFeeForHbars(
            amount,
            feeCollector
        );
        fixedFees[0] = fixedFee;
    }

    function createSingleFixedFeeForCurrentToken(
        int64 amount,
        address feeCollector
    ) internal pure returns (IHederaTokenService.FixedFee[] memory fixedFees) {
        fixedFees = new IHederaTokenService.FixedFee[](1);
        IHederaTokenService.FixedFee
            memory fixedFee = createFixedFeeForCurrentToken(
                amount,
                feeCollector
            );
        fixedFees[0] = fixedFee;
    }

    function createSingleFixedFeeWithInvalidFlags(
        int64 amount,
        address feeCollector
    ) internal pure returns (IHederaTokenService.FixedFee[] memory fixedFees) {
        fixedFees = new IHederaTokenService.FixedFee[](1);
        IHederaTokenService.FixedFee
            memory fixedFee = createFixedFeeWithInvalidFlags(
                amount,
                feeCollector
            );
        fixedFees[0] = fixedFee;
    }

    function createSingleFixedFeeWithTokenIdAndHbars(
        int64 amount,
        address tokenId,
        address feeCollector
    ) internal pure returns (IHederaTokenService.FixedFee[] memory fixedFees) {
        fixedFees = new IHederaTokenService.FixedFee[](1);
        IHederaTokenService.FixedFee
            memory fixedFee = createFixedFeeWithTokenIdAndHbars(
                amount,
                tokenId,
                feeCollector
            );
        fixedFees[0] = fixedFee;
    }

    function createFixedFeesWithAllTypes(
        int64 amount,
        address tokenId,
        address feeCollector
    ) internal pure returns (IHederaTokenService.FixedFee[] memory fixedFees) {
        fixedFees = new IHederaTokenService.FixedFee[](3);
        IHederaTokenService.FixedFee
            memory fixedFeeForToken = createFixedFeeForToken(
                amount,
                tokenId,
                feeCollector
            );
        IHederaTokenService.FixedFee
            memory fixedFeeForHbars = createFixedFeeForHbars(
                amount * 2,
                feeCollector
            );
        IHederaTokenService.FixedFee
            memory fixedFeeForCurrentToken = createFixedFeeForCurrentToken(
                amount * 4,
                feeCollector
            );
        fixedFees[0] = fixedFeeForToken;
        fixedFees[1] = fixedFeeForHbars;
        fixedFees[2] = fixedFeeForCurrentToken;
    }

    function createFixedFeeForToken(
        int64 amount,
        address tokenId,
        address feeCollector
    ) internal pure returns (IHederaTokenService.FixedFee memory fixedFee) {
        fixedFee.amount = amount;
        fixedFee.tokenId = tokenId;
        fixedFee.feeCollector = feeCollector;
    }

    function createFixedFeeForHbars(int64 amount, address feeCollector)
        internal
        pure
        returns (IHederaTokenService.FixedFee memory fixedFee)
    {
        fixedFee.amount = amount;
        fixedFee.useHbarsForPayment = true;
        fixedFee.feeCollector = feeCollector;
    }

    function createFixedFeeForCurrentToken(int64 amount, address feeCollector)
        internal
        pure
        returns (IHederaTokenService.FixedFee memory fixedFee)
    {
        fixedFee.amount = amount;
        fixedFee.useCurrentTokenForPayment = true;
        fixedFee.feeCollector = feeCollector;
    }

    //Used for negative scenarios
    function createFixedFeeWithInvalidFlags(int64 amount, address feeCollector)
        internal
        pure
        returns (IHederaTokenService.FixedFee memory fixedFee)
    {
        fixedFee.amount = amount;
        fixedFee.useHbarsForPayment = true;
        fixedFee.useCurrentTokenForPayment = true;
        fixedFee.feeCollector = feeCollector;
    }

    //Used for negative scenarios
    function createFixedFeeWithTokenIdAndHbars(
        int64 amount,
        address tokenId,
        address feeCollector
    ) internal pure returns (IHederaTokenService.FixedFee memory fixedFee) {
        fixedFee.amount = amount;
        fixedFee.tokenId = tokenId;
        fixedFee.useHbarsForPayment = true;
        fixedFee.feeCollector = feeCollector;
    }

    function getEmptyFixedFees()
        internal
        pure
        returns (IHederaTokenService.FixedFee[] memory fixedFees)
    {}

    function createNAmountFractionalFees(
        uint8 numberOfFees,
        int64 numerator,
        int64 denominator,
        bool netOfTransfers,
        address feeCollector
    )
        internal
        pure
        returns (IHederaTokenService.FractionalFee[] memory fractionalFees)
    {
        fractionalFees = new IHederaTokenService.FractionalFee[](numberOfFees);

        for (uint8 i = 0; i < numberOfFees; i++) {
            IHederaTokenService.FractionalFee
                memory fractionalFee = createFractionalFee(
                    numerator,
                    denominator,
                    netOfTransfers,
                    feeCollector
                );
            fractionalFees[i] = fractionalFee;
        }
    }

    function createSingleFractionalFee(
        int64 numerator,
        int64 denominator,
        bool netOfTransfers,
        address feeCollector
    )
        internal
        pure
        returns (IHederaTokenService.FractionalFee[] memory fractionalFees)
    {
        fractionalFees = new IHederaTokenService.FractionalFee[](1);
        IHederaTokenService.FractionalFee
            memory fractionalFee = createFractionalFee(
                numerator,
                denominator,
                netOfTransfers,
                feeCollector
            );
        fractionalFees[0] = fractionalFee;
    }

    function createSingleFractionalFeeWithLimits(
        int64 numerator,
        int64 denominator,
        int64 minimumAmount,
        int64 maximumAmount,
        bool netOfTransfers,
        address feeCollector
    )
        internal
        pure
        returns (IHederaTokenService.FractionalFee[] memory fractionalFees)
    {
        fractionalFees = new IHederaTokenService.FractionalFee[](1);
        IHederaTokenService.FractionalFee
            memory fractionalFee = createFractionalFeeWithLimits(
                numerator,
                denominator,
                minimumAmount,
                maximumAmount,
                netOfTransfers,
                feeCollector
            );
        fractionalFees[0] = fractionalFee;
    }

    function getEmptyFractionalFees()
        internal
        pure
        returns (IHederaTokenService.FractionalFee[] memory fractionalFees)
    {
        fractionalFees = new IHederaTokenService.FractionalFee[](0);
    }

    function createNAmountRoyaltyFees(
        uint8 numberOfFees,
        int64 numerator,
        int64 denominator,
        address feeCollector
    )
        internal
        pure
        returns (IHederaTokenService.RoyaltyFee[] memory royaltyFees)
    {
        royaltyFees = new IHederaTokenService.RoyaltyFee[](numberOfFees);

        for (uint8 i = 0; i < numberOfFees; i++) {
            IHederaTokenService.RoyaltyFee memory royaltyFee = createRoyaltyFee(
                numerator,
                denominator,
                feeCollector
            );
            royaltyFees[i] = royaltyFee;
        }
    }

    function getEmptyRoyaltyFees()
        internal
        pure
        returns (IHederaTokenService.RoyaltyFee[] memory royaltyFees)
    {
        royaltyFees = new IHederaTokenService.RoyaltyFee[](0);
    }

    function createSingleRoyaltyFee(
        int64 numerator,
        int64 denominator,
        address feeCollector
    )
        internal
        pure
        returns (IHederaTokenService.RoyaltyFee[] memory royaltyFees)
    {
        royaltyFees = new IHederaTokenService.RoyaltyFee[](1);

        IHederaTokenService.RoyaltyFee memory royaltyFee = createRoyaltyFee(
            numerator,
            denominator,
            feeCollector
        );
        royaltyFees[0] = royaltyFee;
    }

    function createSingleRoyaltyFeeWithFallbackFee(
        int64 numerator,
        int64 denominator,
        int64 amount,
        address tokenId,
        bool useHbarsForPayment,
        address feeCollector
    )
        internal
        pure
        returns (IHederaTokenService.RoyaltyFee[] memory royaltyFees)
    {
        royaltyFees = new IHederaTokenService.RoyaltyFee[](1);

        IHederaTokenService.RoyaltyFee
            memory royaltyFee = createRoyaltyFeeWithFallbackFee(
                numerator,
                denominator,
                amount,
                tokenId,
                useHbarsForPayment,
                feeCollector
            );
        royaltyFees[0] = royaltyFee;
    }

    function createRoyaltyFeesWithAllTypes(
        int64 numerator,
        int64 denominator,
        int64 amount,
        address tokenId,
        address feeCollector
    )
        internal
        pure
        returns (IHederaTokenService.RoyaltyFee[] memory royaltyFees)
    {
        royaltyFees = new IHederaTokenService.RoyaltyFee[](3);
        IHederaTokenService.RoyaltyFee
            memory royaltyFeeWithoutFallback = createRoyaltyFee(
                numerator,
                denominator,
                feeCollector
            );
        IHederaTokenService.RoyaltyFee
            memory royaltyFeeWithFallbackHbar = createRoyaltyFeeWithFallbackFee(
                numerator,
                denominator,
                amount,
                address(0x0),
                true,
                feeCollector
            );
        IHederaTokenService.RoyaltyFee
            memory royaltyFeeWithFallbackToken = createRoyaltyFeeWithFallbackFee(
                numerator,
                denominator,
                amount,
                tokenId,
                false,
                feeCollector
            );
        royaltyFees[0] = royaltyFeeWithoutFallback;
        royaltyFees[1] = royaltyFeeWithFallbackHbar;
        royaltyFees[2] = royaltyFeeWithFallbackToken;
    }

    function createRoyaltyFee(
        int64 numerator,
        int64 denominator,
        address feeCollector
    ) internal pure returns (IHederaTokenService.RoyaltyFee memory royaltyFee) {
        royaltyFee.numerator = numerator;
        royaltyFee.denominator = denominator;
        royaltyFee.feeCollector = feeCollector;
    }

    function createRoyaltyFeeWithFallbackFee(
        int64 numerator,
        int64 denominator,
        int64 amount,
        address tokenId,
        bool useHbarsForPayment,
        address feeCollector
    ) internal pure returns (IHederaTokenService.RoyaltyFee memory royaltyFee) {
        royaltyFee.numerator = numerator;
        royaltyFee.denominator = denominator;
        royaltyFee.amount = amount;
        royaltyFee.tokenId = tokenId;
        royaltyFee.useHbarsForPayment = useHbarsForPayment;
        royaltyFee.feeCollector = feeCollector;
    }
}
// Filename: contracts/system-contracts/hedera-token-service/HederaTokenService.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "../HederaResponseCodes.sol";
import "./IHederaTokenService.sol";

abstract contract HederaTokenService {
    address constant precompileAddress = address(0x167);
    // 90 days in seconds
    int32 constant defaultAutoRenewPeriod = 7776000;

    modifier nonEmptyExpiry(IHederaTokenService.HederaToken memory token)
    {
        if (token.expiry.second == 0 && token.expiry.autoRenewPeriod == 0) {
            token.expiry.autoRenewPeriod = defaultAutoRenewPeriod;
        }
        _;
    }

    /// Generic event
    event CallResponseEvent(bool, bytes);

    /// Performs transfers among combinations of tokens and hbars
    /// @param transferList the list of hbar transfers to do
    /// @param tokenTransfers the list of transfers to do
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @custom:version 0.3.0 the signature of the previous version was cryptoTransfer(TokenTransferList[] memory tokenTransfers)
    function cryptoTransfer(IHederaTokenService.TransferList memory transferList, IHederaTokenService.TokenTransferList[] memory tokenTransfers) internal
    returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.cryptoTransfer.selector, transferList, tokenTransfers));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Mints an amount of the token to the defined treasury account
    /// @param token The token for which to mint tokens. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param amount Applicable to tokens of type FUNGIBLE_COMMON. The amount to mint to the Treasury Account.
    ///               Amount must be a positive non-zero number represented in the lowest denomination of the
    ///               token. The new supply must be lower than 2^63.
    /// @param metadata Applicable to tokens of type NON_FUNGIBLE_UNIQUE. A list of metadata that are being created.
    ///                 Maximum allowed size of each metadata is 100 bytes
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return newTotalSupply The new supply of tokens. For NFTs it is the total count of NFTs
    /// @return serialNumbers If the token is an NFT the newly generate serial numbers, otherwise empty.
    function mintToken(address token, int64 amount, bytes[] memory metadata) internal
    returns (int responseCode, int64 newTotalSupply, int64[] memory serialNumbers)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.mintToken.selector,
            token, amount, metadata));
        (responseCode, newTotalSupply, serialNumbers) =
        success
        ? abi.decode(result, (int32, int64, int64[]))
        : (HederaResponseCodes.UNKNOWN, int64(0), new int64[](0));
    }

    /// Burns an amount of the token from the defined treasury account
    /// @param token The token for which to burn tokens. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param amount  Applicable to tokens of type FUNGIBLE_COMMON. The amount to burn from the Treasury Account.
    ///                Amount must be a positive non-zero number, not bigger than the token balance of the treasury
    ///                account (0; balance], represented in the lowest denomination.
    /// @param serialNumbers Applicable to tokens of type NON_FUNGIBLE_UNIQUE. The list of serial numbers to be burned.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return newTotalSupply The new supply of tokens. For NFTs it is the total count of NFTs
    function burnToken(address token, int64 amount, int64[] memory serialNumbers) internal
    returns (int responseCode, int64 newTotalSupply)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.burnToken.selector,
            token, amount, serialNumbers));
        (responseCode, newTotalSupply) =
        success
        ? abi.decode(result, (int32, int64))
        : (HederaResponseCodes.UNKNOWN, int64(0));
    }

    ///  Associates the provided account with the provided tokens. Must be signed by the provided
    ///  Account's key or called from the accounts contract key
    ///  If the provided account is not found, the transaction will resolve to INVALID_ACCOUNT_ID.
    ///  If the provided account has been deleted, the transaction will resolve to ACCOUNT_DELETED.
    ///  If any of the provided tokens is not found, the transaction will resolve to INVALID_TOKEN_REF.
    ///  If any of the provided tokens has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    ///  If an association between the provided account and any of the tokens already exists, the
    ///  transaction will resolve to TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT.
    ///  If the provided account's associations count exceed the constraint of maximum token associations
    ///    per account, the transaction will resolve to TOKENS_PER_ACCOUNT_LIMIT_EXCEEDED.
    ///  On success, associations between the provided account and tokens are made and the account is
    ///    ready to interact with the tokens.
    /// @param account The account to be associated with the provided tokens
    /// @param tokens The tokens to be associated with the provided account. In the case of NON_FUNGIBLE_UNIQUE
    ///               Type, once an account is associated, it can hold any number of NFTs (serial numbers) of that
    ///               token type
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function associateTokens(address account, address[] memory tokens) internal returns (int responseCode) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.associateTokens.selector,
            account, tokens));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    function associateToken(address account, address token) internal returns (int responseCode) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.associateToken.selector,
            account, token));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Dissociates the provided account with the provided tokens. Must be signed by the provided
    /// Account's key.
    /// If the provided account is not found, the transaction will resolve to INVALID_ACCOUNT_ID.
    /// If the provided account has been deleted, the transaction will resolve to ACCOUNT_DELETED.
    /// If any of the provided tokens is not found, the transaction will resolve to INVALID_TOKEN_REF.
    /// If any of the provided tokens has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    /// If an association between the provided account and any of the tokens does not exist, the
    /// transaction will resolve to TOKEN_NOT_ASSOCIATED_TO_ACCOUNT.
    /// If a token has not been deleted and has not expired, and the user has a nonzero balance, the
    /// transaction will resolve to TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES.
    /// If a <b>fungible token</b> has expired, the user can disassociate even if their token balance is
    /// not zero.
    /// If a <b>non fungible token</b> has expired, the user can <b>not</b> disassociate if their token
    /// balance is not zero. The transaction will resolve to TRANSACTION_REQUIRED_ZERO_TOKEN_BALANCES.
    /// On success, associations between the provided account and tokens are removed.
    /// @param account The account to be dissociated from the provided tokens
    /// @param tokens The tokens to be dissociated from the provided account.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function dissociateTokens(address account, address[] memory tokens) internal returns (int responseCode) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.dissociateTokens.selector,
            account, tokens));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    function dissociateToken(address account, address token) internal returns (int responseCode) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.dissociateToken.selector,
            account, token));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Creates a Fungible Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @param initialTotalSupply Specifies the initial supply of tokens to be put in circulation. The
    /// initial supply is sent to the Treasury Account. The supply is in the lowest denomination possible.
    /// @param decimals the number of decimal places a token is divisible by
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createFungibleToken(
        IHederaTokenService.HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals) nonEmptyExpiry(token)
    internal returns (int responseCode, address tokenAddress) {
        (bool success, bytes memory result) = precompileAddress.call{value : msg.value}(
            abi.encodeWithSelector(IHederaTokenService.createFungibleToken.selector,
            token, initialTotalSupply, decimals));


        (responseCode, tokenAddress) = success ? abi.decode(result, (int32, address)) : (HederaResponseCodes.UNKNOWN, address(0));
    }

    /// Creates a Fungible Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @param initialTotalSupply Specifies the initial supply of tokens to be put in circulation. The
    /// initial supply is sent to the Treasury Account. The supply is in the lowest denomination possible.
    /// @param decimals the number of decimal places a token is divisible by
    /// @param fixedFees list of fixed fees to apply to the token
    /// @param fractionalFees list of fractional fees to apply to the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createFungibleTokenWithCustomFees(
        IHederaTokenService.HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals,
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.FractionalFee[] memory fractionalFees) nonEmptyExpiry(token)
    internal returns (int responseCode, address tokenAddress) {
        (bool success, bytes memory result) = precompileAddress.call{value : msg.value}(
            abi.encodeWithSelector(IHederaTokenService.createFungibleTokenWithCustomFees.selector,
            token, initialTotalSupply, decimals, fixedFees, fractionalFees));
        (responseCode, tokenAddress) = success ? abi.decode(result, (int32, address)) : (HederaResponseCodes.UNKNOWN, address(0));
    }

    /// Creates an Non Fungible Unique Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createNonFungibleToken(IHederaTokenService.HederaToken memory token) nonEmptyExpiry(token)
    internal returns (int responseCode, address tokenAddress) {
        (bool success, bytes memory result) = precompileAddress.call{value : msg.value}(
            abi.encodeWithSelector(IHederaTokenService.createNonFungibleToken.selector, token));
        (responseCode, tokenAddress) = success ? abi.decode(result, (int32, address)) : (HederaResponseCodes.UNKNOWN, address(0));
    }

    /// Creates an Non Fungible Unique Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @param fixedFees list of fixed fees to apply to the token
    /// @param royaltyFees list of royalty fees to apply to the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createNonFungibleTokenWithCustomFees(
        IHederaTokenService.HederaToken memory token,
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.RoyaltyFee[] memory royaltyFees) nonEmptyExpiry(token)
    internal returns (int responseCode, address tokenAddress) {
        (bool success, bytes memory result) = precompileAddress.call{value : msg.value}(
            abi.encodeWithSelector(IHederaTokenService.createNonFungibleTokenWithCustomFees.selector,
            token, fixedFees, royaltyFees));
        (responseCode, tokenAddress) = success ? abi.decode(result, (int32, address)) : (HederaResponseCodes.UNKNOWN, address(0));
    }

    /// Retrieves fungible specific token info for a fungible token
    /// @param token The ID of the token as a solidity address
    /// @dev This function reverts if the call is not successful
    function getFungibleTokenInfo(address token) internal returns (int responseCode, IHederaTokenService.FungibleTokenInfo memory tokenInfo) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getFungibleTokenInfo.selector, token));
        IHederaTokenService.FungibleTokenInfo memory defaultTokenInfo;
        (responseCode, tokenInfo) = success ? abi.decode(result, (int32, IHederaTokenService.FungibleTokenInfo)) : (HederaResponseCodes.UNKNOWN, defaultTokenInfo);
    }

    /// Retrieves general token info for a given token
    /// @param token The ID of the token as a solidity address
    /// @dev This function reverts if the call is not successful
    function getTokenInfo(address token) internal returns (int responseCode, IHederaTokenService.TokenInfo memory tokenInfo) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenInfo.selector, token));
        IHederaTokenService.TokenInfo memory defaultTokenInfo;
        (responseCode, tokenInfo) = success ? abi.decode(result, (int32, IHederaTokenService.TokenInfo)) : (HederaResponseCodes.UNKNOWN, defaultTokenInfo);
    }

    /// Retrieves non-fungible specific token info for a given NFT
    /// @param token The ID of the token as a solidity address
    /// @dev This function reverts if the call is not successful
    function getNonFungibleTokenInfo(address token, int64 serialNumber) internal returns (int responseCode, IHederaTokenService.NonFungibleTokenInfo memory tokenInfo) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getNonFungibleTokenInfo.selector, token, serialNumber));
        IHederaTokenService.NonFungibleTokenInfo memory defaultTokenInfo;
        (responseCode, tokenInfo) = success ? abi.decode(result, (int32, IHederaTokenService.NonFungibleTokenInfo)) : (HederaResponseCodes.UNKNOWN, defaultTokenInfo);
    }

    /// Query token custom fees
    /// @param token The token address to check
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return fixedFees Set of fixed fees for `token`
    /// @return fractionalFees Set of fractional fees for `token`
    /// @return royaltyFees Set of royalty fees for `token`
    /// @dev This function reverts if the call is not successful
    function getTokenCustomFees(address token) internal returns (int64 responseCode,
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.FractionalFee[] memory fractionalFees,
        IHederaTokenService.RoyaltyFee[] memory royaltyFees) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenCustomFees.selector, token));
        IHederaTokenService.FixedFee[] memory defaultFixedFees;
        IHederaTokenService.FractionalFee[] memory defaultFractionalFees;
        IHederaTokenService.RoyaltyFee[] memory defaultRoyaltyFees;
        (responseCode, fixedFees, fractionalFees, royaltyFees) =
        success ? abi.decode
        (result, (int32, IHederaTokenService.FixedFee[], IHederaTokenService.FractionalFee[], IHederaTokenService.RoyaltyFee[]))
        : (HederaResponseCodes.UNKNOWN, defaultFixedFees, defaultFractionalFees, defaultRoyaltyFees);
    }

    /// Allows spender to withdraw from your account multiple times, up to the value amount. If this function is called
    /// again it overwrites the current allowance with value.
    /// Only Applicable to Fungible Tokens
    /// @param token The hedera token address to approve
    /// @param spender the account authorized to spend
    /// @param amount the amount of tokens authorized to spend.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function approve(address token, address spender, uint256 amount) internal returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.approve.selector,
            token, spender, amount));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Transfers `amount` tokens from `from` to `to` using the
    //  allowance mechanism. `amount` is then deducted from the caller's allowance.
    /// Only applicable to fungible tokens
    /// @param token The address of the fungible Hedera token to transfer
    /// @param from The account address of the owner of the token, on the behalf of which to transfer `amount` tokens
    /// @param to The account address of the receiver of the `amount` tokens
    /// @param amount The amount of tokens to transfer from `from` to `to`
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function transferFrom(address token, address from, address to, uint256 amount) external returns (int64 responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.transferFrom.selector,
            token, from, to, amount));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Transfers `serialNumber` of `token` from `from` to `to` using the allowance mechanism.
    /// Only applicable to NFT tokens
    /// @param token The address of the non-fungible Hedera token to transfer
    /// @param from The account address of the owner of `serialNumber` of `token`
    /// @param to The account address of the receiver of `serialNumber`
    /// @param serialNumber The NFT serial number to transfer
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function transferFromNFT(address token, address from, address to, uint256 serialNumber) external returns (int64 responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.transferFromNFT.selector,
            token, from, to, serialNumber));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Returns the amount which spender is still allowed to withdraw from owner.
    /// Only Applicable to Fungible Tokens
    /// @param token The Hedera token address to check the allowance of
    /// @param owner the owner of the tokens to be spent
    /// @param spender the spender of the tokens
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function allowance(address token, address owner, address spender) internal returns (int responseCode, uint256 amount)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.allowance.selector,
            token, owner, spender));
        (responseCode, amount) = success ? abi.decode(result, (int32, uint256)) : (HederaResponseCodes.UNKNOWN, 0);
    }

    /// Allow or reaffirm the approved address to transfer an NFT the approved address does not own.
    /// Only Applicable to NFT Tokens
    /// @param token The Hedera NFT token address to approve
    /// @param approved The new approved NFT controller.  To revoke approvals pass in the zero address.
    /// @param serialNumber The NFT serial number  to approve
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function approveNFT(address token, address approved, uint256 serialNumber) internal returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.approveNFT.selector,
            token, approved, serialNumber));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Get the approved address for a single NFT
    /// Only Applicable to NFT Tokens
    /// @param token The Hedera NFT token address to check approval
    /// @param serialNumber The NFT to find the approved address for
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return approved The approved address for this NFT, or the zero address if there is none
    function getApproved(address token, uint256 serialNumber) internal returns (int responseCode, address approved)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getApproved.selector,
            token, serialNumber));
        (responseCode, approved) =
        success
        ? abi.decode(result, (int32, address))
        : (HederaResponseCodes.UNKNOWN, address(0));
    }

    /// Query if token account is frozen
    /// @param token The token address to check
    /// @param account The account address associated with the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return frozen True if `account` is frozen for `token`
    /// @dev This function reverts if the call is not successful
    function isFrozen(address token, address account) internal returns (int64 responseCode, bool frozen){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.isFrozen.selector, token, account));
        (responseCode, frozen) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
    }

    /// Query if token account has kyc granted
    /// @param token The token address to check
    /// @param account The account address associated with the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return kycGranted True if `account` has kyc granted for `token`
    /// @dev This function reverts if the call is not successful
    function isKyc(address token, address account) internal returns (int64 responseCode, bool kycGranted){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.isKyc.selector, token, account));
        (responseCode, kycGranted) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
    }

    /// Operation to freeze token account
    /// @param token The token address
    /// @param account The account address to be frozen
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function freezeToken(address token, address account) internal returns (int64 responseCode){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.freezeToken.selector, token, account));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Operation to unfreeze token account
    /// @param token The token address
    /// @param account The account address to be unfrozen
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function unfreezeToken(address token, address account) internal returns (int64 responseCode){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.unfreezeToken.selector, token, account));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Operation to grant kyc to token account
    /// @param token The token address
    /// @param account The account address to grant kyc
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function grantTokenKyc(address token, address account) internal returns (int64 responseCode){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.grantTokenKyc.selector, token, account));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Operation to revoke kyc to token account
    /// @param token The token address
    /// @param account The account address to revoke kyc
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function revokeTokenKyc(address token, address account) internal returns (int64 responseCode){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.revokeTokenKyc.selector, token, account));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Enable or disable approval for a third party ("operator") to manage
    ///  all of `msg.sender`'s assets
    /// @param token The Hedera NFT token address to approve
    /// @param operator Address to add to the set of authorized operators
    /// @param approved True if the operator is approved, false to revoke approval
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function setApprovalForAll(address token, address operator, bool approved) internal returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.setApprovalForAll.selector,
            token, operator, approved));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Query if an address is an authorized operator for another address
    /// Only Applicable to NFT Tokens
    /// @param token The Hedera NFT token address to approve
    /// @param owner The address that owns the NFTs
    /// @param operator The address that acts on behalf of the owner
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return approved True if `operator` is an approved operator for `owner`, false otherwise
    function isApprovedForAll(address token, address owner, address operator) internal returns (int responseCode, bool approved)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.isApprovedForAll.selector,
            token, owner, operator));
        (responseCode, approved) =
        success
        ? abi.decode(result, (int32, bool))
        : (HederaResponseCodes.UNKNOWN, false);
    }

    /// Query token default freeze status
    /// @param token The token address to check
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return defaultFreezeStatus True if `token` default freeze status is frozen.
    /// @dev This function reverts if the call is not successful
    function getTokenDefaultFreezeStatus(address token) internal returns (int responseCode, bool defaultFreezeStatus) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenDefaultFreezeStatus.selector, token));
        (responseCode, defaultFreezeStatus) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
    }

    /// Query token default kyc status
    /// @param token The token address to check
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return defaultKycStatus True if `token` default kyc status is KycNotApplicable and false if Revoked.
    /// @dev This function reverts if the call is not successful
    function getTokenDefaultKycStatus(address token) internal returns (int responseCode, bool defaultKycStatus) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenDefaultKycStatus.selector, token));
        (responseCode, defaultKycStatus) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
    }

    /**********************
     * ABI v1 calls       *
     **********************/

    /// Initiates a Fungible Token Transfer
    /// @param token The ID of the token as a solidity address
    /// @param accountIds account to do a transfer to/from
    /// @param amounts The amount from the accountId at the same index
    function transferTokens(address token, address[] memory accountIds, int64[] memory amounts) internal
    returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.transferTokens.selector,
            token, accountIds, amounts));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Initiates a Non-Fungable Token Transfer
    /// @param token The ID of the token as a solidity address
    /// @param sender the sender of an nft
    /// @param receiver the receiver of the nft sent by the same index at sender
    /// @param serialNumber the serial number of the nft sent by the same index at sender
    function transferNFTs(address token, address[] memory sender, address[] memory receiver, int64[] memory serialNumber)
    internal returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.transferNFTs.selector,
            token, sender, receiver, serialNumber));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Transfers tokens where the calling account/contract is implicitly the first entry in the token transfer list,
    /// where the amount is the value needed to zero balance the transfers. Regular signing rules apply for sending
    /// (positive amount) or receiving (negative amount)
    /// @param token The token to transfer to/from
    /// @param sender The sender for the transaction
    /// @param receiver The receiver of the transaction
    /// @param amount Non-negative value to send. a negative value will result in a failure.
    function transferToken(address token, address sender, address receiver, int64 amount) internal
    returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.transferToken.selector,
            token, sender, receiver, amount));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Transfers tokens where the calling account/contract is implicitly the first entry in the token transfer list,
    /// where the amount is the value needed to zero balance the transfers. Regular signing rules apply for sending
    /// (positive amount) or receiving (negative amount)
    /// @param token The token to transfer to/from
    /// @param sender The sender for the transaction
    /// @param receiver The receiver of the transaction
    /// @param serialNumber The serial number of the NFT to transfer.
    function transferNFT(address token, address sender, address receiver, int64 serialNumber) internal
    returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.transferNFT.selector,
            token, sender, receiver, serialNumber));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Operation to pause token
    /// @param token The token address to be paused
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function pauseToken(address token) internal returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.pauseToken.selector, token));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Operation to unpause token
    /// @param token The token address to be unpaused
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function unpauseToken(address token) internal returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.unpauseToken.selector, token));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Operation to wipe fungible tokens from account
    /// @param token The token address
    /// @param account The account address to revoke kyc
    /// @param amount The number of tokens to wipe
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function wipeTokenAccount(address token, address account, int64 amount) internal returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.wipeTokenAccount.selector, token, account, amount));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Operation to wipe non fungible tokens from account
    /// @param token The token address
    /// @param account The account address to revoke kyc
    /// @param  serialNumbers The serial numbers of token to wipe
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function wipeTokenAccountNFT(address token, address account, int64[] memory serialNumbers) internal
    returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.wipeTokenAccountNFT.selector, token, account, serialNumbers));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Operation to delete token
    /// @param token The token address
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function deleteToken(address token) internal returns (int responseCode)
    {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.deleteToken.selector, token));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Operation to update token keys
    /// @param token The token address
    /// @param keys The token keys
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateTokenKeys(address token, IHederaTokenService.TokenKey[] memory keys)
    internal returns (int64 responseCode){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.updateTokenKeys.selector, token, keys));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Query token KeyValue
    /// @param token The token address to check
    /// @param keyType The keyType of the desired KeyValue
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return key KeyValue info for key of type `keyType`
    /// @dev This function reverts if the call is not successful
    function getTokenKey(address token, uint keyType)
    internal returns (int64 responseCode, IHederaTokenService.KeyValue memory key){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenKey.selector, token, keyType));
        IHederaTokenService.KeyValue memory defaultKeyValueInfo;
        (responseCode, key) = success ? abi.decode(result, (int32,IHederaTokenService.KeyValue) ) : (HederaResponseCodes.UNKNOWN, defaultKeyValueInfo);
    }


    /// Query if valid token found for the given address
    /// @param token The token address
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return isTokenFlag True if valid token found for the given address
    /// @dev This function reverts if the call is not successful
    function isToken(address token) internal returns (int64 responseCode, bool isTokenFlag) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.isToken.selector, token));
        (responseCode, isTokenFlag) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
    }

    /// Query to return the token type for a given address
    /// @param token The token address
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenType the token type. 0 is FUNGIBLE_COMMON, 1 is NON_FUNGIBLE_UNIQUE, -1 is UNRECOGNIZED
    /// @dev This function reverts if the call is not successful
    function getTokenType(address token) internal returns (int64 responseCode, int32 tokenType) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenType.selector, token));
        (responseCode, tokenType) = success ? abi.decode(result, (int32, int32)) : (HederaResponseCodes.UNKNOWN, - 1);
    }

    /// Operation to get token expiry info
    /// @param token The token address
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return expiryInfo The expiry info of the token
    /// @dev This function reverts if the call is not successful
    function getTokenExpiryInfo(address token) internal returns (int responseCode, IHederaTokenService.Expiry memory expiryInfo){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenExpiryInfo.selector, token));
        IHederaTokenService.Expiry memory defaultExpiryInfo;
        (responseCode, expiryInfo) = success ? abi.decode(result, (int32, IHederaTokenService.Expiry)) : (HederaResponseCodes.UNKNOWN, defaultExpiryInfo);
    }

    /// Operation to update token expiry info
    /// @param token The token address
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateTokenExpiryInfo(address token, IHederaTokenService.Expiry memory expiryInfo) internal returns (int responseCode){
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.updateTokenExpiryInfo.selector, token, expiryInfo));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Operation to update token info
    /// @param token The token address
    /// @param tokenInfo The hedera token info to update token with
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateTokenInfo(address token, IHederaTokenService.HederaToken memory tokenInfo) internal returns (int responseCode) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.updateTokenInfo.selector, token, tokenInfo));
        (responseCode) = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Redirect for token
    /// @param token The token address
    /// @param encodedFunctionSelector The function selector from the ERC20 interface + the bytes input for the function called
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return response The result of the call that had been encoded and sent for execution.
    function redirectForToken(address token, bytes memory encodedFunctionSelector) external returns (int responseCode, bytes memory response) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.redirectForToken.selector, token, encodedFunctionSelector)
        );

        emit CallResponseEvent(success, result);
        (responseCode, response) = success ? (HederaResponseCodes.SUCCESS, result) : (HederaResponseCodes.UNKNOWN, bytes(""));
    }

    /// Update the custom fees for a fungible token
    /// @param token The token address
    /// @param fixedFees Set of fixed fees for `token`
    /// @param fractionalFees Set of fractional fees for `token`
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateFungibleTokenCustomFees(address token,  IHederaTokenService.FixedFee[] memory fixedFees, IHederaTokenService.FractionalFee[] memory fractionalFees) internal returns (int64 responseCode) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.updateFungibleTokenCustomFees.selector, token, fixedFees, fractionalFees));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }

    /// Update the custom fees for a non-fungible token
    /// @param token The token address
    /// @param fixedFees Set of fixed fees for `token`
    /// @param royaltyFees Set of royalty fees for `token`
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateNonFungibleTokenCustomFees(address token, IHederaTokenService.FixedFee[] memory fixedFees, IHederaTokenService.RoyaltyFee[] memory royaltyFees) internal returns (int64 responseCode) {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.updateNonFungibleTokenCustomFees.selector, token, fixedFees, royaltyFees));
        responseCode = success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN;
    }
}
// Filename: contracts/system-contracts/hedera-token-service/IHRC719.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.4.9 <0.9.0;

interface IHRC719 {
    /// @notice Associates the calling account with the token
    /// @dev This function allows an account to opt-in to receive the token
    /// @return responseCode The response code indicating the result of the operation
    function associate() external returns (uint256 responseCode);

    /// @notice Dissociates the calling account from the token
    /// @dev This function allows an account to opt-out from receiving the token
    /// @return responseCode The response code indicating the result of the operation
    function dissociate() external returns (uint256 responseCode);

    /// @notice Checks if the calling account is associated with the token
    /// @dev This function returns the association status of the calling account
    /// @return associated True if the account is associated, false otherwise
    function isAssociated() external view returns (bool associated);
}
// Filename: contracts/system-contracts/hedera-token-service/IHederaTokenService.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.4.9 <0.9.0;
pragma experimental ABIEncoderV2;

interface IHederaTokenService {

    /// Transfers cryptocurrency among two or more accounts by making the desired adjustments to their
    /// balances. Each transfer list can specify up to 10 adjustments. Each negative amount is withdrawn
    /// from the corresponding account (a sender), and each positive one is added to the corresponding
    /// account (a receiver). The amounts list must sum to zero. Each amount is a number of tinybars
    /// (there are 100,000,000 tinybars in one hbar).  If any sender account fails to have sufficient
    /// hbars, then the entire transaction fails, and none of those transfers occur, though the
    /// transaction fee is still charged. This transaction must be signed by the keys for all the sending
    /// accounts, and for any receiving accounts that have receiverSigRequired == true. The signatures
    /// are in the same order as the accounts, skipping those accounts that don't need a signature.
    /// @custom:version 0.3.0 previous version did not include isApproval
    struct AccountAmount {
        // The Account ID, as a solidity address, that sends/receives cryptocurrency or tokens
        address accountID;

        // The amount of  the lowest denomination of the given token that
        // the account sends(negative) or receives(positive)
        int64 amount;

        // If true then the transfer is expected to be an approved allowance and the
        // accountID is expected to be the owner. The default is false (omitted).
        bool isApproval;
    }

    /// A sender account, a receiver account, and the serial number of an NFT of a Token with
    /// NON_FUNGIBLE_UNIQUE type. When minting NFTs the sender will be the default AccountID instance
    /// (0.0.0 aka 0x0) and when burning NFTs, the receiver will be the default AccountID instance.
    /// @custom:version 0.3.0 previous version did not include isApproval
    struct NftTransfer {
        // The solidity address of the sender
        address senderAccountID;

        // The solidity address of the receiver
        address receiverAccountID;

        // The serial number of the NFT
        int64 serialNumber;

        // If true then the transfer is expected to be an approved allowance and the
        // accountID is expected to be the owner. The default is false (omitted).
        bool isApproval;
    }

    struct TokenTransferList {
        // The ID of the token as a solidity address
        address token;

        // Applicable to tokens of type FUNGIBLE_COMMON. Multiple list of AccountAmounts, each of which
        // has an account and amount.
        AccountAmount[] transfers;

        // Applicable to tokens of type NON_FUNGIBLE_UNIQUE. Multiple list of NftTransfers, each of
        // which has a sender and receiver account, including the serial number of the NFT
        NftTransfer[] nftTransfers;
    }

    struct TransferList {
        // Multiple list of AccountAmounts, each of which has an account and amount.
        // Used to transfer hbars between the accounts in the list.
        AccountAmount[] transfers;
    }

    /// Expiry properties of a Hedera token - second, autoRenewAccount, autoRenewPeriod
    struct Expiry {
        // The epoch second at which the token should expire; if an auto-renew account and period are
        // specified, this is coerced to the current epoch second plus the autoRenewPeriod
        int64 second;

        // ID of an account which will be automatically charged to renew the token's expiration, at
        // autoRenewPeriod interval, expressed as a solidity address
        address autoRenewAccount;

        // The interval at which the auto-renew account will be charged to extend the token's expiry
        int64 autoRenewPeriod;
    }

    /// A Key can be a public key from either the Ed25519 or ECDSA(secp256k1) signature schemes, where
    /// in the ECDSA(secp256k1) case we require the 33-byte compressed form of the public key. We call
    /// these public keys <b>primitive keys</b>.
    /// A Key can also be the ID of a smart contract instance, which is then authorized to perform any
    /// precompiled contract action that requires this key to sign.
    /// Note that when a Key is a smart contract ID, it <i>doesn't</i> mean the contract with that ID
    /// will actually create a cryptographic signature. It only means that when the contract calls a
    /// precompiled contract, the resulting "child transaction" will be authorized to perform any action
    /// controlled by the Key.
    /// Exactly one of the possible values should be populated in order for the Key to be valid.
    struct KeyValue {

        // if set to true, the key of the calling Hedera account will be inherited as the token key
        bool inheritAccountKey;

        // smart contract instance that is authorized as if it had signed with a key
        address contractId;

        // Ed25519 public key bytes
        bytes ed25519;

        // Compressed ECDSA(secp256k1) public key bytes
        bytes ECDSA_secp256k1;

        // A smart contract that, if the recipient of the active message frame, should be treated
        // as having signed. (Note this does not mean the <i>code being executed in the frame</i>
        // will belong to the given contract, since it could be running another contract's code via
        // <tt>delegatecall</tt>. So setting this key is a more permissive version of setting the
        // contractID key, which also requires the code in the active message frame belong to the
        // the contract with the given id.)
        address delegatableContractId;
    }

    /// A list of token key types the key should be applied to and the value of the key
    struct TokenKey {

        // bit field representing the key type. Keys of all types that have corresponding bits set to 1
        // will be created for the token.
        // 0th bit: adminKey
        // 1st bit: kycKey
        // 2nd bit: freezeKey
        // 3rd bit: wipeKey
        // 4th bit: supplyKey
        // 5th bit: feeScheduleKey
        // 6th bit: pauseKey
        // 7th bit: ignored
        uint keyType;

        // the value that will be set to the key type
        KeyValue key;
    }

    /// Basic properties of a Hedera Token - name, symbol, memo, tokenSupplyType, maxSupply,
    /// treasury, freezeDefault. These properties are related both to Fungible and NFT token types.
    struct HederaToken {
        // The publicly visible name of the token. The token name is specified as a Unicode string.
        // Its UTF-8 encoding cannot exceed 100 bytes, and cannot contain the 0 byte (NUL).
        string name;

        // The publicly visible token symbol. The token symbol is specified as a Unicode string.
        // Its UTF-8 encoding cannot exceed 100 bytes, and cannot contain the 0 byte (NUL).
        string symbol;

        // The ID of the account which will act as a treasury for the token as a solidity address.
        // This account will receive the specified initial supply or the newly minted NFTs in
        // the case for NON_FUNGIBLE_UNIQUE Type
        address treasury;

        // The memo associated with the token (UTF-8 encoding max 100 bytes)
        string memo;

        // IWA compatibility. Specified the token supply type. Defaults to INFINITE
        bool tokenSupplyType;

        // IWA Compatibility. Depends on TokenSupplyType. For tokens of type FUNGIBLE_COMMON - the
        // maximum number of tokens that can be in circulation. For tokens of type NON_FUNGIBLE_UNIQUE -
        // the maximum number of NFTs (serial numbers) that can be minted. This field can never be changed!
        int64 maxSupply;

        // The default Freeze status (frozen or unfrozen) of Hedera accounts relative to this token. If
        // true, an account must be unfrozen before it can receive the token
        bool freezeDefault;

        // list of keys to set to the token
        TokenKey[] tokenKeys;

        // expiry properties of a Hedera token - second, autoRenewAccount, autoRenewPeriod
        Expiry expiry;
    }

    /// Additional post creation fungible and non fungible properties of a Hedera Token.
    struct TokenInfo {
        /// Basic properties of a Hedera Token
        HederaToken token;

        /// The number of tokens (fungible) or serials (non-fungible) of the token
        int64 totalSupply;

        /// Specifies whether the token is deleted or not
        bool deleted;

        /// Specifies whether the token kyc was defaulted with KycNotApplicable (true) or Revoked (false)
        bool defaultKycStatus;

        /// Specifies whether the token is currently paused or not
        bool pauseStatus;

        /// The fixed fees collected when transferring the token
        FixedFee[] fixedFees;

        /// The fractional fees collected when transferring the token
        FractionalFee[] fractionalFees;

        /// The royalty fees collected when transferring the token
        RoyaltyFee[] royaltyFees;

        /// The ID of the network ledger
        string ledgerId;
    }

    /// Additional fungible properties of a Hedera Token.
    struct FungibleTokenInfo {
        /// The shared hedera token info
        TokenInfo tokenInfo;

        /// The number of decimal places a token is divisible by
        int32 decimals;
    }

    /// Additional non fungible properties of a Hedera Token.
    struct NonFungibleTokenInfo {
        /// The shared hedera token info
        TokenInfo tokenInfo;

        /// The serial number of the nft
        int64 serialNumber;

        /// The account id specifying the owner of the non fungible token
        address ownerId;

        /// The epoch second at which the token was created.
        int64 creationTime;

        /// The unique metadata of the NFT
        bytes metadata;

        /// The account id specifying an account that has been granted spending permissions on this nft
        address spenderId;
    }

    /// A fixed number of units (hbar or token) to assess as a fee during a transfer of
    /// units of the token to which this fixed fee is attached. The denomination of
    /// the fee depends on the values of tokenId, useHbarsForPayment and
    /// useCurrentTokenForPayment. Exactly one of the values should be set.
    struct FixedFee {

        int64 amount;

        // Specifies ID of token that should be used for fixed fee denomination
        address tokenId;

        // Specifies this fixed fee should be denominated in Hbar
        bool useHbarsForPayment;

        // Specifies this fixed fee should be denominated in the Token currently being created
        bool useCurrentTokenForPayment;

        // The ID of the account to receive the custom fee, expressed as a solidity address
        address feeCollector;
    }

    /// A fraction of the transferred units of a token to assess as a fee. The amount assessed will never
    /// be less than the given minimumAmount, and never greater than the given maximumAmount.  The
    /// denomination is always units of the token to which this fractional fee is attached.
    struct FractionalFee {
        // A rational number's numerator, used to set the amount of a value transfer to collect as a custom fee
        int64 numerator;

        // A rational number's denominator, used to set the amount of a value transfer to collect as a custom fee
        int64 denominator;

        // The minimum amount to assess
        int64 minimumAmount;

        // The maximum amount to assess (zero implies no maximum)
        int64 maximumAmount;
        bool netOfTransfers;

        // The ID of the account to receive the custom fee, expressed as a solidity address
        address feeCollector;
    }

    /// A fee to assess during a transfer that changes ownership of an NFT. Defines the fraction of
    /// the fungible value exchanged for an NFT that the ledger should collect as a royalty. ("Fungible
    /// value" includes both ℏ and units of fungible HTS tokens.) When the NFT sender does not receive
    /// any fungible value, the ledger will assess the fallback fee, if present, to the new NFT owner.
    /// Royalty fees can only be added to tokens of type type NON_FUNGIBLE_UNIQUE.
    struct RoyaltyFee {
        // A fraction's numerator of fungible value exchanged for an NFT to collect as royalty
        int64 numerator;

        // A fraction's denominator of fungible value exchanged for an NFT to collect as royalty
        int64 denominator;

        // If present, the fee to assess to the NFT receiver when no fungible value
        // is exchanged with the sender. Consists of:
        // amount: the amount to charge for the fee
        // tokenId: Specifies ID of token that should be used for fixed fee denomination
        // useHbarsForPayment: Specifies this fee should be denominated in Hbar
        int64 amount;
        address tokenId;
        bool useHbarsForPayment;

        // The ID of the account to receive the custom fee, expressed as a solidity address
        address feeCollector;
    }

    /**********************
     * Direct HTS Calls   *
     **********************/

    /// Performs transfers among combinations of tokens and hbars
    /// @param transferList the list of hbar transfers to do
    /// @param tokenTransfers the list of token transfers to do
    /// @custom:version 0.3.0 the signature of the previous version was cryptoTransfer(TokenTransferList[] memory tokenTransfers)
    function cryptoTransfer(TransferList memory transferList, TokenTransferList[] memory tokenTransfers)
        external
        returns (int64 responseCode);

    /// Mints an amount of the token to the defined treasury account
    /// @param token The token for which to mint tokens. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param amount Applicable to tokens of type FUNGIBLE_COMMON. The amount to mint to the Treasury Account.
    ///               Amount must be a positive non-zero number represented in the lowest denomination of the
    ///               token. The new supply must be lower than 2^63.
    /// @param metadata Applicable to tokens of type NON_FUNGIBLE_UNIQUE. A list of metadata that are being created.
    ///                 Maximum allowed size of each metadata is 100 bytes
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return newTotalSupply The new supply of tokens. For NFTs it is the total count of NFTs
    /// @return serialNumbers If the token is an NFT the newly generate serial numbers, othersise empty.
    function mintToken(
        address token,
        int64 amount,
        bytes[] memory metadata
    )
        external
        returns (
            int64 responseCode,
            int64 newTotalSupply,
            int64[] memory serialNumbers
        );

    /// Burns an amount of the token from the defined treasury account
    /// @param token The token for which to burn tokens. If token does not exist, transaction results in
    ///              INVALID_TOKEN_ID
    /// @param amount  Applicable to tokens of type FUNGIBLE_COMMON. The amount to burn from the Treasury Account.
    ///                Amount must be a positive non-zero number, not bigger than the token balance of the treasury
    ///                account (0; balance], represented in the lowest denomination.
    /// @param serialNumbers Applicable to tokens of type NON_FUNGIBLE_UNIQUE. The list of serial numbers to be burned.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return newTotalSupply The new supply of tokens. For NFTs it is the total count of NFTs
    function burnToken(
        address token,
        int64 amount,
        int64[] memory serialNumbers
    ) external returns (int64 responseCode, int64 newTotalSupply);

    ///  Associates the provided account with the provided tokens. Must be signed by the provided
    ///  Account's key or called from the accounts contract key
    ///  If the provided account is not found, the transaction will resolve to INVALID_ACCOUNT_ID.
    ///  If the provided account has been deleted, the transaction will resolve to ACCOUNT_DELETED.
    ///  If any of the provided tokens is not found, the transaction will resolve to INVALID_TOKEN_REF.
    ///  If any of the provided tokens has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    ///  If an association between the provided account and any of the tokens already exists, the
    ///  transaction will resolve to TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT.
    ///  If the provided account's associations count exceed the constraint of maximum token associations
    ///    per account, the transaction will resolve to TOKENS_PER_ACCOUNT_LIMIT_EXCEEDED.
    ///  On success, associations between the provided account and tokens are made and the account is
    ///    ready to interact with the tokens.
    /// @param account The account to be associated with the provided tokens
    /// @param tokens The tokens to be associated with the provided account. In the case of NON_FUNGIBLE_UNIQUE
    ///               Type, once an account is associated, it can hold any number of NFTs (serial numbers) of that
    ///               token type
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function associateTokens(address account, address[] memory tokens)
        external
        returns (int64 responseCode);

    /// Single-token variant of associateTokens. Will be mapped to a single entry array call of associateTokens
    /// @param account The account to be associated with the provided token
    /// @param token The token to be associated with the provided account
    function associateToken(address account, address token)
        external
        returns (int64 responseCode);

    /// Dissociates the provided account with the provided tokens. Must be signed by the provided
    /// Account's key.
    /// If the provided account is not found, the transaction will resolve to INVALID_ACCOUNT_ID.
    /// If the provided account has been deleted, the transaction will resolve to ACCOUNT_DELETED.
    /// If any of the provided tokens is not found, the transaction will resolve to INVALID_TOKEN_REF.
    /// If any of the provided tokens has been deleted, the transaction will resolve to TOKEN_WAS_DELETED.
    /// If an association between the provided account and any of the tokens does not exist, the
    /// transaction will resolve to TOKEN_NOT_ASSOCIATED_TO_ACCOUNT.
    /// If a token has not been deleted and has not expired, and the user has a nonzero balance, the
    /// transaction will resolve to TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES.
    /// If a <b>fungible token</b> has expired, the user can disassociate even if their token balance is
    /// not zero.
    /// If a <b>non fungible token</b> has expired, the user can <b>not</b> disassociate if their token
    /// balance is not zero. The transaction will resolve to TRANSACTION_REQUIRED_ZERO_TOKEN_BALANCES.
    /// On success, associations between the provided account and tokens are removed.
    /// @param account The account to be dissociated from the provided tokens
    /// @param tokens The tokens to be dissociated from the provided account.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function dissociateTokens(address account, address[] memory tokens)
        external
        returns (int64 responseCode);

    /// Single-token variant of dissociateTokens. Will be mapped to a single entry array call of dissociateTokens
    /// @param account The account to be associated with the provided token
    /// @param token The token to be associated with the provided account
    function dissociateToken(address account, address token)
        external
        returns (int64 responseCode);

    /// Creates a Fungible Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @param initialTotalSupply Specifies the initial supply of tokens to be put in circulation. The
    /// initial supply is sent to the Treasury Account. The supply is in the lowest denomination possible.
    /// @param decimals the number of decimal places a token is divisible by
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createFungibleToken(
        HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals
    ) external payable returns (int64 responseCode, address tokenAddress);

    /// Creates a Fungible Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @param initialTotalSupply Specifies the initial supply of tokens to be put in circulation. The
    /// initial supply is sent to the Treasury Account. The supply is in the lowest denomination possible.
    /// @param decimals the number of decimal places a token is divisible by.
    /// @param fixedFees list of fixed fees to apply to the token
    /// @param fractionalFees list of fractional fees to apply to the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createFungibleTokenWithCustomFees(
        HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals,
        FixedFee[] memory fixedFees,
        FractionalFee[] memory fractionalFees
    ) external payable returns (int64 responseCode, address tokenAddress);

    /// Creates an Non Fungible Unique Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createNonFungibleToken(HederaToken memory token)
        external
        payable
        returns (int64 responseCode, address tokenAddress);

    /// Creates an Non Fungible Unique Token with the specified properties
    /// @param token the basic properties of the token being created
    /// @param fixedFees list of fixed fees to apply to the token
    /// @param royaltyFees list of royalty fees to apply to the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenAddress the created token's address
    function createNonFungibleTokenWithCustomFees(
        HederaToken memory token,
        FixedFee[] memory fixedFees,
        RoyaltyFee[] memory royaltyFees
    ) external payable returns (int64 responseCode, address tokenAddress);

    /**********************
     * ABIV1 calls        *
     **********************/

    /// Initiates a Fungible Token Transfer
    /// @param token The ID of the token as a solidity address
    /// @param accountId account to do a transfer to/from
    /// @param amount The amount from the accountId at the same index
    function transferTokens(
        address token,
        address[] memory accountId,
        int64[] memory amount
    ) external returns (int64 responseCode);

    /// Initiates a Non-Fungable Token Transfer
    /// @param token The ID of the token as a solidity address
    /// @param sender the sender of an nft
    /// @param receiver the receiver of the nft sent by the same index at sender
    /// @param serialNumber the serial number of the nft sent by the same index at sender
    function transferNFTs(
        address token,
        address[] memory sender,
        address[] memory receiver,
        int64[] memory serialNumber
    ) external returns (int64 responseCode);

    /// Transfers tokens where the calling account/contract is implicitly the first entry in the token transfer list,
    /// where the amount is the value needed to zero balance the transfers. Regular signing rules apply for sending
    /// (positive amount) or receiving (negative amount)
    /// @param token The token to transfer to/from
    /// @param sender The sender for the transaction
    /// @param recipient The receiver of the transaction
    /// @param amount Non-negative value to send. a negative value will result in a failure.
    function transferToken(
        address token,
        address sender,
        address recipient,
        int64 amount
    ) external returns (int64 responseCode);

    /// Transfers tokens where the calling account/contract is implicitly the first entry in the token transfer list,
    /// where the amount is the value needed to zero balance the transfers. Regular signing rules apply for sending
    /// (positive amount) or receiving (negative amount)
    /// @param token The token to transfer to/from
    /// @param sender The sender for the transaction
    /// @param recipient The receiver of the transaction
    /// @param serialNumber The serial number of the NFT to transfer.
    function transferNFT(
        address token,
        address sender,
        address recipient,
        int64 serialNumber
    ) external returns (int64 responseCode);

    /// Allows spender to withdraw from your account multiple times, up to the value amount. If this function is called
    /// again it overwrites the current allowance with value.
    /// Only Applicable to Fungible Tokens
    /// @param token The hedera token address to approve
    /// @param spender the account address authorized to spend
    /// @param amount the amount of tokens authorized to spend.
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function approve(
        address token,
        address spender,
        uint256 amount
    ) external returns (int64 responseCode);

    /// Transfers `amount` tokens from `from` to `to` using the
    //  allowance mechanism. `amount` is then deducted from the caller's allowance.
    /// Only applicable to fungible tokens
    /// @param token The address of the fungible Hedera token to transfer
    /// @param from The account address of the owner of the token, on the behalf of which to transfer `amount` tokens
    /// @param to The account address of the receiver of the `amount` tokens
    /// @param amount The amount of tokens to transfer from `from` to `to`
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function transferFrom(address token, address from, address to, uint256 amount) external returns (int64 responseCode);

    /// Returns the amount which spender is still allowed to withdraw from owner.
    /// Only Applicable to Fungible Tokens
    /// @param token The Hedera token address to check the allowance of
    /// @param owner the owner of the tokens to be spent
    /// @param spender the spender of the tokens
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return allowance The amount which spender is still allowed to withdraw from owner.
    function allowance(
        address token,
        address owner,
        address spender
    ) external returns (int64 responseCode, uint256 allowance);

    /// Allow or reaffirm the approved address to transfer an NFT the approved address does not own.
    /// Only Applicable to NFT Tokens
    /// @param token The Hedera NFT token address to approve
    /// @param approved The new approved NFT controller.  To revoke approvals pass in the zero address.
    /// @param serialNumber The NFT serial number  to approve
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function approveNFT(
        address token,
        address approved,
        uint256 serialNumber
    ) external returns (int64 responseCode);

    /// Transfers `serialNumber` of `token` from `from` to `to` using the allowance mechanism.
    /// Only applicable to NFT tokens
    /// @param token The address of the non-fungible Hedera token to transfer
    /// @param from The account address of the owner of `serialNumber` of `token`
    /// @param to The account address of the receiver of `serialNumber`
    /// @param serialNumber The NFT serial number to transfer
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function transferFromNFT(address token, address from, address to, uint256 serialNumber) external returns (int64 responseCode);

    /// Get the approved address for a single NFT
    /// Only Applicable to NFT Tokens
    /// @param token The Hedera NFT token address to check approval
    /// @param serialNumber The NFT to find the approved address for
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return approved The approved address for this NFT, or the zero address if there is none
    function getApproved(address token, uint256 serialNumber)
        external
        returns (int64 responseCode, address approved);

    /// Enable or disable approval for a third party ("operator") to manage
    ///  all of `msg.sender`'s assets
    /// @param token The Hedera NFT token address to approve
    /// @param operator Address to add to the set of authorized operators
    /// @param approved True if the operator is approved, false to revoke approval
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function setApprovalForAll(
        address token,
        address operator,
        bool approved
    ) external returns (int64 responseCode);

    /// Query if an address is an authorized operator for another address
    /// Only Applicable to NFT Tokens
    /// @param token The Hedera NFT token address to approve
    /// @param owner The address that owns the NFTs
    /// @param operator The address that acts on behalf of the owner
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return approved True if `operator` is an approved operator for `owner`, false otherwise
    function isApprovedForAll(
        address token,
        address owner,
        address operator
    ) external returns (int64 responseCode, bool approved);

    /// Query if token account is frozen
    /// @param token The token address to check
    /// @param account The account address associated with the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return frozen True if `account` is frozen for `token`
    function isFrozen(address token, address account)
        external
        returns (int64 responseCode, bool frozen);

    /// Query if token account has kyc granted
    /// @param token The token address to check
    /// @param account The account address associated with the token
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return kycGranted True if `account` has kyc granted for `token`
    function isKyc(address token, address account)
        external
        returns (int64 responseCode, bool kycGranted);

    /// Operation to delete token
    /// @param token The token address to be deleted
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function deleteToken(address token) external returns (int64 responseCode);

    /// Query token custom fees
    /// @param token The token address to check
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return fixedFees Set of fixed fees for `token`
    /// @return fractionalFees Set of fractional fees for `token`
    /// @return royaltyFees Set of royalty fees for `token`
    function getTokenCustomFees(address token)
        external
        returns (int64 responseCode, FixedFee[] memory fixedFees, FractionalFee[] memory fractionalFees, RoyaltyFee[] memory royaltyFees);

    /// Query token default freeze status
    /// @param token The token address to check
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return defaultFreezeStatus True if `token` default freeze status is frozen.
    function getTokenDefaultFreezeStatus(address token)
        external
        returns (int64 responseCode, bool defaultFreezeStatus);

    /// Query token default kyc status
    /// @param token The token address to check
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return defaultKycStatus True if `token` default kyc status is KycNotApplicable and false if Revoked.
    function getTokenDefaultKycStatus(address token)
        external
        returns (int64 responseCode, bool defaultKycStatus);

    /// Query token expiry info
    /// @param token The token address to check
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return expiry Expiry info for `token`
    function getTokenExpiryInfo(address token)
        external
        returns (int64 responseCode, Expiry memory expiry);

    /// Query fungible token info
    /// @param token The token address to check
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return fungibleTokenInfo FungibleTokenInfo info for `token`
    function getFungibleTokenInfo(address token)
        external
        returns (int64 responseCode, FungibleTokenInfo memory fungibleTokenInfo);

    /// Query token info
    /// @param token The token address to check
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenInfo TokenInfo info for `token`
    function getTokenInfo(address token)
        external
        returns (int64 responseCode, TokenInfo memory tokenInfo);

    /// Query token KeyValue
    /// @param token The token address to check
    /// @param keyType The keyType of the desired KeyValue
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return key KeyValue info for key of type `keyType`
    function getTokenKey(address token, uint keyType)
        external
        returns (int64 responseCode, KeyValue memory key);

    /// Query non fungible token info
    /// @param token The token address to check
    /// @param serialNumber The NFT serialNumber to check
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return nonFungibleTokenInfo NonFungibleTokenInfo info for `token` `serialNumber`
    function getNonFungibleTokenInfo(address token, int64 serialNumber)
        external
        returns (int64 responseCode, NonFungibleTokenInfo memory nonFungibleTokenInfo);

    /// Operation to freeze token account
    /// @param token The token address
    /// @param account The account address to be frozen
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function freezeToken(address token, address account)
        external
        returns (int64 responseCode);

    /// Operation to unfreeze token account
    /// @param token The token address
    /// @param account The account address to be unfrozen
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function unfreezeToken(address token, address account)
        external
        returns (int64 responseCode);

    /// Operation to grant kyc to token account
    /// @param token The token address
    /// @param account The account address to grant kyc
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function grantTokenKyc(address token, address account)
        external
        returns (int64 responseCode);

    /// Operation to revoke kyc to token account
    /// @param token The token address
    /// @param account The account address to revoke kyc
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function revokeTokenKyc(address token, address account)
        external
        returns (int64 responseCode);

    /// Operation to pause token
    /// @param token The token address to be paused
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function pauseToken(address token) external returns (int64 responseCode);

    /// Operation to unpause token
    /// @param token The token address to be unpaused
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function unpauseToken(address token) external returns (int64 responseCode);

    /// Operation to wipe fungible tokens from account
    /// @param token The token address
    /// @param account The account address to revoke kyc
    /// @param amount The number of tokens to wipe
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function wipeTokenAccount(
        address token,
        address account,
        int64 amount
    ) external returns (int64 responseCode);

    /// Operation to wipe non fungible tokens from account
    /// @param token The token address
    /// @param account The account address to revoke kyc
    /// @param  serialNumbers The serial numbers of token to wipe
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function wipeTokenAccountNFT(
        address token,
        address account,
        int64[] memory serialNumbers
    ) external returns (int64 responseCode);

    /// Operation to update token info
    /// @param token The token address
    /// @param tokenInfo The hedera token info to update token with
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateTokenInfo(address token, HederaToken memory tokenInfo)
        external
        returns (int64 responseCode);

    /// Operation to update token expiry info
    /// @param token The token address
    /// @param expiryInfo The hedera token expiry info
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateTokenExpiryInfo(address token, Expiry memory expiryInfo)
        external
        returns (int64 responseCode);

    /// Operation to update token expiry info
    /// @param token The token address
    /// @param keys The token keys
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateTokenKeys(address token, TokenKey[] memory keys)
        external
        returns (int64 responseCode);

    /// Query if valid token found for the given address
    /// @param token The token address
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return isToken True if valid token found for the given address
    function isToken(address token)
        external returns
        (int64 responseCode, bool isToken);

    /// Query to return the token type for a given address
    /// @param token The token address
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return tokenType the token type. 0 is FUNGIBLE_COMMON, 1 is NON_FUNGIBLE_UNIQUE, -1 is UNRECOGNIZED
    function getTokenType(address token)
        external returns
        (int64 responseCode, int32 tokenType);

    /// Initiates a Redirect For Token
    /// @param token The token address
    /// @param encodedFunctionSelector The function selector from the ERC20 interface + the bytes input for the function called
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    /// @return response The result of the call that had been encoded and sent for execution.
    function redirectForToken(address token, bytes memory encodedFunctionSelector) external returns (int64 responseCode, bytes memory response);

    /// Update the custom fees for a fungible token
    /// @param token The token address
    /// @param fixedFees Set of fixed fees for `token`
    /// @param fractionalFees Set of fractional fees for `token`
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateFungibleTokenCustomFees(address token,  IHederaTokenService.FixedFee[] memory fixedFees, IHederaTokenService.FractionalFee[] memory fractionalFees) external returns (int64 responseCode);

    /// Update the custom fees for a non-fungible token
    /// @param token The token address
    /// @param fixedFees Set of fixed fees for `token`
    /// @param royaltyFees Set of royalty fees for `token`
    /// @return responseCode The response code for the status of the request. SUCCESS is 22.
    function updateNonFungibleTokenCustomFees(address token, IHederaTokenService.FixedFee[] memory fixedFees, IHederaTokenService.RoyaltyFee[] memory royaltyFees) external returns (int64 responseCode);
}
// Filename: contracts/system-contracts/hedera-token-service/KeyHelper.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./HederaTokenService.sol";

abstract contract KeyHelper {
    using Bits for uint256;
    address supplyContract;

    mapping(KeyType => uint256) keyTypes;

    enum KeyType {
        ADMIN,
        KYC,
        FREEZE,
        WIPE,
        SUPPLY,
        FEE,
        PAUSE
    }
    enum KeyValueType {
        INHERIT_ACCOUNT_KEY,
        CONTRACT_ID,
        ED25519,
        SECP256K1,
        DELEGETABLE_CONTRACT_ID
    }

    constructor() {
        keyTypes[KeyType.ADMIN] = 1;
        keyTypes[KeyType.KYC] = 2;
        keyTypes[KeyType.FREEZE] = 4;
        keyTypes[KeyType.WIPE] = 8;
        keyTypes[KeyType.SUPPLY] = 16;
        keyTypes[KeyType.FEE] = 32;
        keyTypes[KeyType.PAUSE] = 64;
    }

    function getDefaultKeys() internal view returns (IHederaTokenService.TokenKey[] memory keys) {
        keys = new IHederaTokenService.TokenKey[](2);
        keys[0] = getSingleKey(KeyType.KYC, KeyValueType.CONTRACT_ID, '');
        keys[1] = IHederaTokenService.TokenKey(
            getDuplexKeyType(KeyType.SUPPLY, KeyType.PAUSE),
            getKeyValueType(KeyValueType.CONTRACT_ID, '')
        );
    }

    function getAllTypeKeys(KeyValueType keyValueType, bytes memory key)
        internal
        view
        returns (IHederaTokenService.TokenKey[] memory keys)
    {
        keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey(getAllKeyTypes(), getKeyValueType(keyValueType, key));
    }

    function getCustomSingleTypeKeys(
        KeyType keyType,
        KeyValueType keyValueType,
        bytes memory key
    ) internal view returns (IHederaTokenService.TokenKey[] memory keys) {
        keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey(getKeyType(keyType), getKeyValueType(keyValueType, key));
    }

    function getCustomDuplexTypeKeys(
        KeyType firstType,
        KeyType secondType,
        KeyValueType keyValueType,
        bytes memory key
    ) internal view returns (IHederaTokenService.TokenKey[] memory keys) {
        keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey(
            getDuplexKeyType(firstType, secondType),
            getKeyValueType(keyValueType, key)
        );
    }

    function getSingleKey(
        KeyType keyType,
        KeyValueType keyValueType,
        bytes memory key
    ) internal view returns (IHederaTokenService.TokenKey memory tokenKey) {
        tokenKey = IHederaTokenService.TokenKey(getKeyType(keyType), getKeyValueType(keyValueType, key));
    }

    function getSingleKey(
        KeyType keyType,
        KeyValueType keyValueType,
        address key
    ) internal view returns (IHederaTokenService.TokenKey memory tokenKey) {
        tokenKey = IHederaTokenService.TokenKey(getKeyType(keyType), getKeyValueType(keyValueType, key));
    }

    function getSingleKey(
        KeyType firstType,
        KeyType secondType,
        KeyValueType keyValueType,
        bytes memory key
    ) internal view returns (IHederaTokenService.TokenKey memory tokenKey) {
        tokenKey = IHederaTokenService.TokenKey(
            getDuplexKeyType(firstType, secondType),
            getKeyValueType(keyValueType, key)
        );
    }

    function getDuplexKeyType(KeyType firstType, KeyType secondType) internal pure returns (uint256 keyType) {
        keyType = keyType.setBit(uint8(firstType));
        keyType = keyType.setBit(uint8(secondType));
    }

    function getAllKeyTypes() internal pure returns (uint256 keyType) {
        keyType = keyType.setBit(uint8(KeyType.ADMIN));
        keyType = keyType.setBit(uint8(KeyType.KYC));
        keyType = keyType.setBit(uint8(KeyType.FREEZE));
        keyType = keyType.setBit(uint8(KeyType.WIPE));
        keyType = keyType.setBit(uint8(KeyType.SUPPLY));
        keyType = keyType.setBit(uint8(KeyType.FEE));
        keyType = keyType.setBit(uint8(KeyType.PAUSE));
    }

    function getKeyType(KeyType keyType) internal view returns (uint256) {
        return keyTypes[keyType];
    }

    function getKeyValueType(KeyValueType keyValueType, bytes memory key)
        internal
        view
        returns (IHederaTokenService.KeyValue memory keyValue)
    {
        if (keyValueType == KeyValueType.INHERIT_ACCOUNT_KEY) {
            keyValue.inheritAccountKey = true;
        } else if (keyValueType == KeyValueType.CONTRACT_ID) {
            keyValue.contractId = supplyContract;
        } else if (keyValueType == KeyValueType.ED25519) {
            keyValue.ed25519 = key;
        } else if (keyValueType == KeyValueType.SECP256K1) {
            keyValue.ECDSA_secp256k1 = key;
        } else if (keyValueType == KeyValueType.DELEGETABLE_CONTRACT_ID) {
            keyValue.delegatableContractId = supplyContract;
        }
    }

    function getKeyValueType(KeyValueType keyValueType, address keyAddress)
        internal
        pure
        returns (IHederaTokenService.KeyValue memory keyValue)
    {
        if (keyValueType == KeyValueType.CONTRACT_ID) {
            keyValue.contractId = keyAddress;
        } else if (keyValueType == KeyValueType.DELEGETABLE_CONTRACT_ID) {
            keyValue.delegatableContractId = keyAddress;
        }
    }
}

library Bits {
    uint256 internal constant ONE = uint256(1);

    // Sets the bit at the given 'index' in 'self' to '1'.
    // Returns the modified value.
    function setBit(uint256 self, uint8 index) internal pure returns (uint256) {
        return self | (ONE << index);
    }
}
// Filename: contracts/system-contracts/hedera-token-service/examples/erc-20/ERC20Contract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract ERC20Contract {

    function name(address token) public view returns (string memory) {
        return IERC20Metadata(token).name();
    }

    function symbol(address token) public view returns (string memory) {
        return IERC20Metadata(token).symbol();
    }

    function decimals(address token) public view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    function totalSupply(address token) external view returns (uint256) {
        return IERC20(token).totalSupply();
    }

    function balanceOf(address token, address account) external view returns (uint256) {
        return IERC20(token).balanceOf(account);
    }

    function transfer(address token, address recipient, uint256 amount) external returns (bool) {
        return IERC20(token).transfer(recipient, amount);
    }

    function allowance(address token, address owner, address spender) external view returns (uint256) {
        return IERC20(token).allowance(owner, spender);
    }

    function approve(address token, address spender, uint256 amount) external returns (bool) {
        return IERC20(token).approve(spender, amount);
    }

    function transferFrom(address token, address sender, address recipient, uint256 amount) external returns (bool) {
        return IERC20(token).transferFrom(sender, recipient, amount);
    }

    function delegateTransfer(address token, address recipient, uint256 amount) public {
        (bool success, ) = address(IERC20(token)).delegatecall(abi.encodeWithSignature("transfer(address,uint256)", recipient, amount));
        require(success, "Delegate call failed");
    }

    function delegateApprove(address token, address recipient, uint256 amount) public {
        (bool success, ) = address(IERC20(token)).delegatecall(abi.encodeWithSignature("approve(address,uint256)", recipient, amount));
        require(success, "Delegate call failed");
    }

    function delegateTransferFrom(address token, address from, address to, uint256 amount) external payable {
        (bool success, ) = address(IERC20(token)).delegatecall(abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount));
        require(success, "Delegate call failed");
    }

}
// Filename: contracts/system-contracts/hedera-token-service/examples/erc-721/ERC721Contract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

contract ERC721Contract {

    function balanceOf(address token, address owner) external view returns (uint256) {
        return IERC721(token).balanceOf(owner);
    }

    function ownerOf(address token, uint256 tokenId) external view returns (address) {
        return IERC721(token).ownerOf(tokenId);
    }

    function name(address token) public view returns (string memory) {
        return IERC721Metadata(token).name();
    }

    function symbol(address token) public view returns (string memory) {
        return IERC721Metadata(token).symbol();
    }

    function tokenURI(address token, uint256 tokenId) public view returns (string memory) {
        return IERC721Metadata(token).tokenURI(tokenId);
    }

    function totalSupply(address token) external view returns (uint256) {
        return IERC721Enumerable(token).totalSupply();
    }

    // The `to` address will receive approval by the contract itself
    // Be aware that the nft must be owned by the contract, not by the msg.sender address
    function approve(address token, address to, uint256 tokenId) external payable {
        IERC721(token).approve(to, tokenId);
    }

    // The `to` address will receive approval by msg.sender
    function delegateApprove(address token, address to, uint256 tokenId) external payable {
        (bool success, ) = address(IERC721(token)).delegatecall(abi.encodeWithSignature("approve(address,uint256)", to, tokenId));
        require(success, "Delegate call failed");
    }

    // The `to` address will receive approval by the contract itself
    // Be aware that the nft must be owned by the contract, not by the msg.sender address
    function setApprovalForAll(address token, address operator, bool approved) external {
        IERC721(token).setApprovalForAll(operator, approved);
    }

    // The `to` address will receive approval by msg.sender
    function delegateSetApprovalForAll(address token, address operator, bool approved) external {
        (bool success, ) = address(IERC721(token)).delegatecall(abi.encodeWithSignature("setApprovalForAll(address,bool)", operator, approved));
        require(success, "Delegate call failed");
    }

    function getApproved(address token, uint256 tokenId) external view returns (address) {
        return IERC721(token).getApproved(tokenId);
    }

    function isApprovedForAll(address token, address owner, address operator) public view returns (bool) {
        return IERC721(token).isApprovedForAll(owner, operator);
    }

    // The call will be executed by the contract itself, so the contract address has to be the owner of `tokenId`
    function transferFrom(address token, address from, address to, uint256 tokenId) external payable {
        IERC721(token).transferFrom(from, to, tokenId);
    }

    // The call will be executed by the msg.sender address
    function delegateTransferFrom(address token, address from, address to, uint256 tokenId) external payable {
        (bool success, ) = address(IERC721(token)).delegatecall(abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, tokenId));
        require(success, "Delegate call failed");
    }

    // Not supported operations - should return a failure

    function safeTransferFrom(address token, address from, address to, uint256 tokenId) external payable {
        IERC721(token).safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFromWithData(address token, address from, address to, uint256 tokenId, bytes calldata data) external payable {
        IERC721(token).safeTransferFrom(from, to, tokenId, data);
    }

    function tokenByIndex(address token, uint256 index) external view returns (uint256) {
        return IERC721Enumerable(token).tokenByIndex(index);
    }

    function tokenOfOwnerByIndex(address token, address owner, uint256 index) external view returns (uint256) {
        return IERC721Enumerable(token).tokenOfOwnerByIndex(owner, index);
    }
}
// Filename: contracts/system-contracts/hedera-token-service/examples/hrc-719/HRC719Contract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.7;

import "../../IHRC719.sol";

contract HRC719Contract {
    event IsAssociated(bool status);
    
    /// @dev Associate caller with token contract that implements the IHRC719 interface
    /// @param token The address of the token to associate with.
    /// @return responseCode The response code of the association.
    function associate(address token) public returns (uint256 responseCode) {
        return IHRC719(token).associate();
    }

    
    /// @dev Dissociate caller with token contract that implements the IHRC719 interface
    /// @param token The address of the token to dissociate with.
    /// @return responseCode The response code of the dissociation.
    function dissociate(address token) public returns (uint256 responseCode) {
        return IHRC719(token).dissociate();
    }

    /// @dev Calls the `isAssociated` function on the token contract that implements the IHRC719 interface.
    /// @param token The address of the token to associate with.
    /// @notice Making isAssociated(address) non-view function to avoid going through mirror-node as isAssociated() is not yet fully supported on mirror node.
    /// @notice Should be transitioned to view function when the feature is supported by mirror node. Tracking by this issue https://github.com/hashgraph/hedera-smart-contracts/issues/948
    function isAssociated(address token) public {
        bool status = IHRC719(token).isAssociated();
        emit IsAssociated(status);
    }
}
// Filename: contracts/system-contracts/hedera-token-service/examples/token-create/TokenCreateContract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "../../HederaTokenService.sol";
import "../../ExpiryHelper.sol";
import "../../KeyHelper.sol";

contract TokenCreateContract is HederaTokenService, ExpiryHelper, KeyHelper {

    string name = "tokenName";
    string symbol = "tokenSymbol";
    string memo = "memo";
    int64 initialTotalSupply = 10000000000;
    int64 maxSupply = 20000000000;
    int32 decimals = 0;
    bool freezeDefaultStatus = false;

    event ResponseCode(int responseCode);
    event CreatedToken(address tokenAddress);
    event MintedToken(int64 newTotalSupply, int64[] serialNumbers);
    event KycGranted(bool kycGranted);

    function createFungibleTokenPublic(
        address treasury
    ) public payable {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](6);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.PAUSE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[1] = getSingleKey(KeyType.KYC, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[2] = getSingleKey(KeyType.FREEZE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[3] = getSingleKey(KeyType.WIPE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[4] = getSingleKey(KeyType.SUPPLY, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[5] = getSingleKey(KeyType.FEE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, freezeDefaultStatus, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createFungibleToken(token, initialTotalSupply, decimals);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function createFungibleTokenWithSECP256K1AdminKeyPublic(
        address treasury, bytes memory adminKey
    ) public payable returns (address) {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](6);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.PAUSE, KeyValueType.SECP256K1, adminKey);
        keys[1] = getSingleKey(KeyType.KYC, KeyValueType.SECP256K1, adminKey);
        keys[2] = getSingleKey(KeyType.FREEZE, KeyValueType.SECP256K1, adminKey);
        keys[3] = getSingleKey(KeyType.SUPPLY, KeyValueType.SECP256K1, adminKey);
        keys[4] = getSingleKey(KeyType.WIPE, KeyValueType.SECP256K1, adminKey);
        keys[5] = getSingleKey(KeyType.FEE, KeyValueType.SECP256K1, adminKey);

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, freezeDefaultStatus, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createFungibleToken(token, initialTotalSupply, decimals);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);

        return tokenAddress;
    }

    function createFungibleTokenWithSECP256K1AdminKeyAssociateAndTransferToAddressPublic(address treasury, bytes memory adminKey, int64 amount) public payable {
        address tokenAddress = this.createFungibleTokenWithSECP256K1AdminKeyPublic{value : msg.value}(treasury, adminKey);
        this.associateTokenPublic(msg.sender, tokenAddress);
        this.grantTokenKycPublic(tokenAddress, msg.sender);
        HederaTokenService.transferToken(tokenAddress, address(this), msg.sender, amount);
    }

    function createFungibleTokenWithSECP256K1AdminKeyWithoutKYCPublic(
        address treasury, bytes memory adminKey
    ) public payable returns (address) {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](4);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.PAUSE, KeyValueType.SECP256K1, adminKey);
        keys[1] = getSingleKey(KeyType.FREEZE, KeyValueType.SECP256K1, adminKey);
        keys[2] = getSingleKey(KeyType.SUPPLY, KeyValueType.SECP256K1, adminKey);
        keys[3] = getSingleKey(KeyType.WIPE, KeyValueType.SECP256K1, adminKey);

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, freezeDefaultStatus, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createFungibleToken(token, initialTotalSupply, decimals);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);

        return tokenAddress;
    }

    function createFungibleTokenWithCustomFeesPublic(
        address treasury,
        address fixedFeeTokenAddress
    ) public payable {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.ADMIN, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, false, keys, expiry
        );

        IHederaTokenService.FixedFee[] memory fixedFees = new IHederaTokenService.FixedFee[](1);
        fixedFees[0] = IHederaTokenService.FixedFee(1, fixedFeeTokenAddress, false, false, treasury);

        IHederaTokenService.FractionalFee[] memory fractionalFees = new IHederaTokenService.FractionalFee[](1);
        fractionalFees[0] = IHederaTokenService.FractionalFee(4, 5, 10, 30, false, treasury);

        (int responseCode, address tokenAddress) =
        HederaTokenService.createFungibleTokenWithCustomFees(token, initialTotalSupply, decimals, fixedFees, fractionalFees);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function createNonFungibleTokenPublic(
        address treasury
    ) public payable {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](5);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.PAUSE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[1] = getSingleKey(KeyType.KYC, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[2] = getSingleKey(KeyType.FREEZE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[3] = getSingleKey(KeyType.SUPPLY, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[4] = getSingleKey(KeyType.WIPE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, freezeDefaultStatus, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createNonFungibleToken(token);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function createNonFungibleTokenWithSECP256K1AdminKeyPublic(
        address treasury, bytes memory adminKey
    ) public payable {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](6);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.PAUSE, KeyValueType.SECP256K1, adminKey);
        keys[1] = getSingleKey(KeyType.KYC, KeyValueType.SECP256K1, adminKey);
        keys[2] = getSingleKey(KeyType.FREEZE, KeyValueType.SECP256K1, adminKey);
        keys[3] = getSingleKey(KeyType.SUPPLY, KeyValueType.SECP256K1, adminKey);
        keys[4] = getSingleKey(KeyType.WIPE, KeyValueType.SECP256K1, adminKey);
        keys[5] = getSingleKey(KeyType.FEE, KeyValueType.SECP256K1, adminKey);

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, freezeDefaultStatus, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createNonFungibleToken(token);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function createNonFungibleTokenWithSECP256K1AdminKeyWithoutKYCPublic(
        address treasury, bytes memory adminKey
    ) public payable {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](4);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.PAUSE, KeyValueType.SECP256K1, adminKey);
        keys[1] = getSingleKey(KeyType.FREEZE, KeyValueType.SECP256K1, adminKey);
        keys[2] = getSingleKey(KeyType.SUPPLY, KeyValueType.SECP256K1, adminKey);
        keys[3] = getSingleKey(KeyType.WIPE, KeyValueType.SECP256K1, adminKey);

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, freezeDefaultStatus, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createNonFungibleToken(token);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function createNonFungibleTokenWithCustomFeesPublic(
        address treasury,
        address fixedFeeTokenAddress
    ) public payable {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](5);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.PAUSE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[1] = getSingleKey(KeyType.KYC, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[2] = getSingleKey(KeyType.FREEZE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[3] = getSingleKey(KeyType.SUPPLY, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[4] = getSingleKey(KeyType.WIPE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, freezeDefaultStatus, keys, expiry
        );

        IHederaTokenService.FixedFee[] memory fixedFees = new IHederaTokenService.FixedFee[](1);
        fixedFees[0] = IHederaTokenService.FixedFee(1, fixedFeeTokenAddress, false, false, treasury);

        IHederaTokenService.RoyaltyFee[] memory royaltyFees = new IHederaTokenService.RoyaltyFee[](1);
        royaltyFees[0] = IHederaTokenService.RoyaltyFee(4, 5, 10, fixedFeeTokenAddress, false, treasury);

        (int responseCode, address tokenAddress) =
        HederaTokenService.createNonFungibleTokenWithCustomFees(token, fixedFees, royaltyFees);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function mintTokenPublic(address token, int64 amount, bytes[] memory metadata) public
    returns (int responseCode, int64 newTotalSupply, int64[] memory serialNumbers)  {
        (responseCode, newTotalSupply, serialNumbers) = HederaTokenService.mintToken(token, amount, metadata);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit MintedToken(newTotalSupply, serialNumbers);
    }

    function mintTokenToAddressPublic(address token, int64 amount, bytes[] memory metadata) public
    returns (int responseCode, int64 newTotalSupply, int64[] memory serialNumbers)  {
        (responseCode, newTotalSupply, serialNumbers) = HederaTokenService.mintToken(token, amount, metadata);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit MintedToken(newTotalSupply, serialNumbers);

        HederaTokenService.transferNFT(token, address(this), msg.sender, serialNumbers[0]);
    }

    function associateTokensPublic(address account, address[] memory tokens) external returns (int256 responseCode) {
        (responseCode) = HederaTokenService.associateTokens(account, tokens);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function associateTokenPublic(address account, address token) public returns (int responseCode) {
        responseCode = HederaTokenService.associateToken(account, token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function grantTokenKycPublic(address token, address account) external returns (int64 responseCode) {
        (responseCode) = HederaTokenService.grantTokenKyc(token, account);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    //Adding this function to showcase token functionality in extended updateTokenInfo test suite
    function updateTokenInfoPublic(address token, IHederaTokenService.HederaToken memory tokenInfo)external returns (int responseCode) {
        (responseCode) = HederaTokenService.updateTokenInfo(token, tokenInfo);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function approvePublic(address token, address spender, uint256 amount) public returns (int responseCode) {
    responseCode = HederaTokenService.approve(token, spender, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }
}
// Filename: contracts/system-contracts/hedera-token-service/examples/token-create/TokenCreateCustom.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "../../HederaTokenService.sol";
import "../../ExpiryHelper.sol";
import "../../KeyHelper.sol";
import "../../FeeHelper.sol";

contract TokenCreateCustomContract is HederaTokenService, ExpiryHelper, KeyHelper, FeeHelper {
    event ResponseCode(int responseCode);
    event CreatedToken(address tokenAddress);
    event TransferToken(address tokenAddress, address receiver, int64 amount);
    event MintedToken(int64 newTotalSupply, int64[] serialNumbers);

    function createFungibleTokenPublic(
        string memory name,
        string memory symbol,
        string memory memo,
        int64 initialTotalSupply,
        int64 maxSupply,
        int32 decimals,
        bool freezeDefaultStatus,
        address treasury,
        IHederaTokenService.TokenKey[] memory keys
    ) public payable {
        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, freezeDefaultStatus, keys, expiry
        );
        
        (int responseCode, address tokenAddress) =
        HederaTokenService.createFungibleToken(token, initialTotalSupply, decimals);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
        emit CreatedToken(tokenAddress);
    }

    function createFungibleTokenWithPresetKeys(
        string memory name,
        string memory symbol,
        string memory memo,
        int64 initialTotalSupply,
        int64 maxSupply,
        int32 decimals,
        bool freezeDefaultStatus,
        address treasury
    ) public payable {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](6);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.PAUSE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[1] = getSingleKey(KeyType.KYC, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[2] = getSingleKey(KeyType.FREEZE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[3] = getSingleKey(KeyType.WIPE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[4] = getSingleKey(KeyType.SUPPLY, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));
        keys[5] = getSingleKey(KeyType.FEE, KeyValueType.INHERIT_ACCOUNT_KEY, bytes(""));

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, freezeDefaultStatus, keys, expiry
        );
        
        (int responseCode, address tokenAddress) =
        HederaTokenService.createFungibleToken(token, initialTotalSupply, decimals);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
        emit CreatedToken(tokenAddress);
    }

    function createFungibleTokenWithCustomFeesPublic(
        address treasury,
        string memory name,
        string memory symbol,
        string memory memo,
        int64 initialTotalSupply,
        int64 maxSupply,
        int32 decimals,
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.FractionalFee[] memory fractionalFees,
        IHederaTokenService.TokenKey[] memory keys
    ) public payable {
        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, false, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createFungibleTokenWithCustomFees(token, initialTotalSupply, decimals, fixedFees, fractionalFees);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function createNonFungibleTokenPublic(
        string memory name,
        string memory symbol,
        string memory memo,
        int64 maxSupply,
        address treasury,
        IHederaTokenService.TokenKey[] memory keys
    ) public payable {
        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, false, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createNonFungibleToken(token);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function createNonFungibleTokenWithCustomFeesPublic(
        address treasury,
        string memory name,
        string memory symbol,
        string memory memo,
        int64 maxSupply,
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.RoyaltyFee[] memory royaltyFees,
        IHederaTokenService.TokenKey[] memory keys
    ) public payable {
        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, true, maxSupply, false, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createNonFungibleTokenWithCustomFees(token, fixedFees, royaltyFees);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function mintTokenPublic(address token, int64 amount, bytes[] memory metadata) public
    returns (int responseCode, int64 newTotalSupply, int64[] memory serialNumbers)  {
        (responseCode, newTotalSupply, serialNumbers) = HederaTokenService.mintToken(token, amount, metadata);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit MintedToken(newTotalSupply, serialNumbers);
    }

    function mintTokenToAddressPublic(address token, address receiver, int64 amount, bytes[] memory metadata) public
    returns (int responseCode, int64 newTotalSupply, int64[] memory serialNumbers)  {
        (responseCode, newTotalSupply, serialNumbers) = mintTokenPublic(token, amount, metadata);

        HederaTokenService.transferToken(token, address(this), receiver, amount);
        emit TransferToken(token, receiver, amount);
    }

    function mintNonFungibleTokenToAddressPublic(address token, address receiver, int64 amount, bytes[] memory metadata) public
    returns (int responseCode, int64 newTotalSupply, int64[] memory serialNumbers)  {
        (responseCode, newTotalSupply, serialNumbers) = mintTokenPublic(token, amount, metadata);

        HederaTokenService.transferNFT(token, address(this), receiver, serialNumbers[0]);
        emit TransferToken(token, receiver, amount);
    }

    function associateTokensPublic(address account, address[] memory tokens) external returns (int256 responseCode) {
        (responseCode) = HederaTokenService.associateTokens(account, tokens);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function associateTokenPublic(address account, address token) public returns (int responseCode) {
        responseCode = HederaTokenService.associateToken(account, token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function grantTokenKycPublic(address token, address account) external returns (int64 responseCode) {
        (responseCode) = HederaTokenService.grantTokenKyc(token, account);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function approvePublic(address token, address spender, uint256 amount) public returns (int responseCode) {
    responseCode = HederaTokenService.approve(token, spender, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }
}
// Filename: contracts/system-contracts/hedera-token-service/examples/token-manage/TokenManagementContract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "../../HederaTokenService.sol";
import "../../ExpiryHelper.sol";
import "../../KeyHelper.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract TokenManagementContract is HederaTokenService, ExpiryHelper, KeyHelper {

    event ResponseCode(int responseCode);
    event PausedToken(bool paused);
    event UnpausedToken(bool unpaused);

    function deleteTokenPublic(address token) public returns (int responseCode) {
        responseCode = HederaTokenService.deleteToken(token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function freezeTokenPublic(address token, address account) public returns (int responseCode) {
        responseCode = HederaTokenService.freezeToken(token, account);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function unfreezeTokenPublic(address token, address account) public returns (int responseCode) {
        responseCode = HederaTokenService.unfreezeToken(token, account);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function revokeTokenKycPublic(address token, address account) external returns (int64 responseCode) {
        (responseCode) = HederaTokenService.revokeTokenKyc(token, account);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function pauseTokenPublic(address token) public returns (int responseCode) {
        responseCode = HederaTokenService.pauseToken(token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit PausedToken(true);
    }

    function unpauseTokenPublic(address token) public returns (int responseCode) {
        responseCode = HederaTokenService.unpauseToken(token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit UnpausedToken(true);
    }

    function wipeTokenAccountPublic(address token, address account, int64 amount) public returns (int responseCode) {
        responseCode = HederaTokenService.wipeTokenAccount(token, account, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function wipeTokenAccountNFTPublic(address token, address account, int64[] memory serialNumbers) public returns (int responseCode) {
        responseCode = HederaTokenService.wipeTokenAccountNFT(token, account, serialNumbers);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function updateTokenInfoPublic(address token, IHederaTokenService.HederaToken memory tokenInfo)external returns (int responseCode) {
        (responseCode) = HederaTokenService.updateTokenInfo(token, tokenInfo);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function updateTokenExpiryInfoPublic(address token, IHederaTokenService.Expiry memory expiryInfo)external returns (int responseCode) {
        (responseCode) = HederaTokenService.updateTokenExpiryInfo(token, expiryInfo);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function updateTokenKeysPublic(address token, IHederaTokenService.TokenKey[] memory keys) public returns (int64 responseCode) {
        (responseCode) = HederaTokenService.updateTokenKeys(token, keys);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function burnTokenPublic(address token, int64 amount, int64[] memory serialNumbers) external returns (int256 responseCode, int64 newTotalSupply) {
        (responseCode, newTotalSupply) = HederaTokenService.burnToken(token, amount, serialNumbers);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function dissociateTokensPublic(address account, address[] memory tokens) external returns (int256 responseCode) {
        (responseCode) = HederaTokenService.dissociateTokens(account, tokens);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function dissociateTokenPublic(address account, address token) public returns (int responseCode) {
        responseCode = HederaTokenService.dissociateToken(account, token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function approvePublic(address token, address spender, uint256 amount) public returns (int responseCode) {
        responseCode = HederaTokenService.approve(token, spender, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function approveNFTPublic(address token, address approved, uint256 serialNumber) public returns (int responseCode) {
        responseCode = HederaTokenService.approveNFT(token, approved, serialNumber);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function setApprovalForAllPublic(address token, address operator, bool approved) public returns (int responseCode) {
        responseCode = HederaTokenService.setApprovalForAll(token, operator, approved);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function updateFungibleTokenCustomFeesPublic(
        address token, 
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.FractionalFee[] memory fractionalFees
    ) public returns (int responseCode) {
        responseCode = HederaTokenService.updateFungibleTokenCustomFees(token, fixedFees, fractionalFees);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert(Strings.toString(uint(responseCode)));
        }
    }

    function updateNonFungibleTokenCustomFeesPublic(
        address token, 
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.RoyaltyFee[] memory royaltyFees
    ) public returns (int responseCode) {
        responseCode = HederaTokenService.updateNonFungibleTokenCustomFees(token, fixedFees, royaltyFees);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert(Strings.toString(uint(responseCode)));
        }
    }
}
// Filename: contracts/system-contracts/hedera-token-service/examples/token-query/TokenQueryContract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "../../HederaTokenService.sol";
import "../../ExpiryHelper.sol";
import "../../KeyHelper.sol";

contract TokenQueryContract is HederaTokenService, ExpiryHelper, KeyHelper {

    event ResponseCode(int responseCode);
    event AllowanceValue(uint256 amount);
    event ApprovedAddress(address approved);
    event Approved(bool approved);
    event Frozen(bool frozen);
    event KycGranted(bool kycGranted);
    event TokenCustomFees(IHederaTokenService.FixedFee[] fixedFees, IHederaTokenService.FractionalFee[] fractionalFees, IHederaTokenService.RoyaltyFee[] royaltyFees);
    event TokenDefaultFreezeStatus(bool defaultFreezeStatus);
    event TokenDefaultKycStatus(bool defaultKycStatus);
    event TokenExpiryInfo(IHederaTokenService.Expiry expiryInfo);
    event FungibleTokenInfo(IHederaTokenService.FungibleTokenInfo tokenInfo);
    event TokenInfo(IHederaTokenService.TokenInfo tokenInfo);
    event TokenKey(IHederaTokenService.KeyValue key);
    event NonFungibleTokenInfo(IHederaTokenService.NonFungibleTokenInfo tokenInfo);
    event IsToken(bool isToken);
    event TokenType(int32 tokenType);

    function allowancePublic(address token, address owner, address spender) public returns (int responseCode, uint256 amount) {
        (responseCode, amount) = HederaTokenService.allowance(token, owner, spender);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit AllowanceValue(amount);
    }

    function getApprovedPublic(address token, uint256 serialNumber) public returns (int responseCode, address approved) {
        (responseCode, approved) = HederaTokenService.getApproved(token, serialNumber);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit ApprovedAddress(approved);
    }

    function isApprovedForAllPublic(address token, address owner, address operator) public returns (int responseCode, bool approved) {
        (responseCode, approved) = HederaTokenService.isApprovedForAll(token, owner, operator);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit Approved(approved);
    }

    function isFrozenPublic(address token, address account) public returns (int responseCode, bool frozen) {
        (responseCode, frozen) = HederaTokenService.isFrozen(token, account);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
        emit Frozen(frozen);
    }

    function isKycPublic(address token, address account) external returns (int64 responseCode, bool kycGranted) {
        (responseCode, kycGranted) = HederaTokenService.isKyc(token, account);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit KycGranted(kycGranted);
    }

    function getTokenCustomFeesPublic(address token) public returns (
        int64 responseCode,
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.FractionalFee[] memory fractionalFees,
        IHederaTokenService.RoyaltyFee[] memory royaltyFees) {
        (responseCode, fixedFees, fractionalFees, royaltyFees) = HederaTokenService.getTokenCustomFees(token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit TokenCustomFees(fixedFees, fractionalFees, royaltyFees);
    }

    function getTokenDefaultFreezeStatusPublic(address token) public returns (int responseCode, bool defaultFreezeStatus) {
        (responseCode, defaultFreezeStatus) = HederaTokenService.getTokenDefaultFreezeStatus(token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit TokenDefaultFreezeStatus(defaultFreezeStatus);
    }

    function getTokenDefaultKycStatusPublic(address token) public returns (int responseCode, bool defaultKycStatus) {
        (responseCode, defaultKycStatus) = HederaTokenService.getTokenDefaultKycStatus(token);

        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit TokenDefaultKycStatus(defaultKycStatus);
    }

    function getTokenExpiryInfoPublic(address token)external returns (int responseCode, IHederaTokenService.Expiry memory expiryInfo) {
        (responseCode, expiryInfo) = HederaTokenService.getTokenExpiryInfo(token);
        emit ResponseCode(responseCode);

        if(responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit TokenExpiryInfo(expiryInfo);
    }

    function getFungibleTokenInfoPublic(address token) public returns (int responseCode, IHederaTokenService.FungibleTokenInfo memory tokenInfo) {
        (responseCode, tokenInfo) = HederaTokenService.getFungibleTokenInfo(token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit FungibleTokenInfo(tokenInfo);
    }

    function getTokenInfoPublic(address token) public returns (int responseCode, IHederaTokenService.TokenInfo memory tokenInfo) {
        (responseCode, tokenInfo) = HederaTokenService.getTokenInfo(token);

        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit TokenInfo(tokenInfo);
    }

    function getTokenKeyPublic(address token, uint keyType)
    public returns (int64 responseCode, IHederaTokenService.KeyValue memory key) {
        (responseCode, key) = HederaTokenService.getTokenKey(token, keyType);
        emit ResponseCode(responseCode);

        if(responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit TokenKey(key);
    }

    function getNonFungibleTokenInfoPublic(address token, int64 serialNumber) public returns (int responseCode, IHederaTokenService.NonFungibleTokenInfo memory tokenInfo) {
        (responseCode, tokenInfo) = HederaTokenService.getNonFungibleTokenInfo(token, serialNumber);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit NonFungibleTokenInfo(tokenInfo);
    }

    function isTokenPublic(address token) public returns (int64 responseCode, bool isTokenFlag) {
        (responseCode, isTokenFlag) = HederaTokenService.isToken(token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit IsToken(isTokenFlag);
    }

    function getTokenTypePublic(address token) public returns (int64 responseCode, int32 tokenType) {
        (responseCode, tokenType) = HederaTokenService.getTokenType(token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit TokenType(tokenType);
    }
}// Filename: contracts/system-contracts/hedera-token-service/examples/token-transfer/TokenTransferContract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "../../HederaTokenService.sol";
import "../../ExpiryHelper.sol";
import "../../KeyHelper.sol";

contract TokenTransferContract is HederaTokenService, ExpiryHelper, KeyHelper {

    event ResponseCode(int responseCode);

    function cryptoTransferPublic(IHederaTokenService.TransferList calldata transferList, IHederaTokenService.TokenTransferList[] calldata tokenTransferList) public returns (int responseCode) {
        responseCode = HederaTokenService.cryptoTransfer(transferList, tokenTransferList);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function transferTokensPublic(address token, address[] memory accountId, int64[] memory amount) external returns (int256 responseCode) {
        responseCode = HederaTokenService.transferTokens(token, accountId, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function transferNFTsPublic(address token, address[] memory sender, address[] memory receiver, int64[] memory serialNumber) external returns (int256 responseCode) {
        responseCode = HederaTokenService.transferNFTs(token, sender, receiver, serialNumber);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function transferTokenPublic(address token, address sender, address receiver, int64 amount) public returns (int responseCode) {
        responseCode = HederaTokenService.transferToken(token, sender, receiver, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function transferNFTPublic(address token, address sender, address receiver, int64 serialNumber) public returns (int responseCode) {
        responseCode = HederaTokenService.transferNFT(token, sender, receiver, serialNumber);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function transferFromPublic(address token, address from, address to, uint256 amount) public returns (int64 responseCode) {
        responseCode = this.transferFrom(token, from, to, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function transferFromNFTPublic(address token, address from, address to, uint256 serialNumber) public returns (int64 responseCode) {
        responseCode = this.transferFromNFT(token, from, to, serialNumber);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function setApprovalForAllPublic(address token, address operator, bool approved) public returns (int responseCode) {
        responseCode = HederaTokenService.setApprovalForAll(token, operator, approved);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function approvePublic(address token, address spender, uint256 amount) public returns (int responseCode) {
    responseCode = HederaTokenService.approve(token, spender, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function approveNFTPublic(address token, address approved, uint256 serialNumber) public returns (int responseCode) {
        responseCode = HederaTokenService.approveNFT(token, approved, serialNumber);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function grantTokenKycPublic(address token, address account) external returns (int64 responseCode) {
        (responseCode) = HederaTokenService.grantTokenKyc(token, account);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function associateTokenPublic(address account, address token) public returns (int responseCode) {
        responseCode = HederaTokenService.associateToken(account, token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }
}
// Filename: contracts/system-contracts/hedera-token-service/safe-hts/SafeHTS.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "../../HederaResponseCodes.sol";
import "../IHederaTokenService.sol";

abstract contract SafeHTS {

    address constant precompileAddress = address(0x167);
    // 90 days in seconds
    int32 constant defaultAutoRenewPeriod = 7776000;

    error CryptoTransferFailed();
    error MintFailed();
    error BurnFailed();
    error MultipleAssociationsFailed();
    error SingleAssociationFailed();
    error MultipleDissociationsFailed();
    error SingleDissociationFailed();
    error TokensTransferFailed();
    error NFTsTransferFailed();
    error TokenTransferFailed();
    error NFTTransferFailed();
    error CreateFungibleTokenFailed();
    error CreateFungibleTokenWithCustomFeesFailed();
    error CreateNonFungibleTokenFailed();
    error CreateNonFungibleTokenWithCustomFeesFailed();
    error ApproveFailed();
    error NFTApproveFailed();
    error SetTokenApprovalForAllFailed();
    error TokenDeleteFailed();
    error FreezeTokenFailed();
    error UnfreezeTokenFailed();
    error GrantTokenKYCFailed();
    error RevokeTokenKYCFailed();
    error PauseTokenFailed();
    error UnpauseTokenFailed();
    error WipeTokenAccountFailed();
    error WipeTokenAccountNFTFailed();
    error UpdateTokenInfoFailed();
    error UpdateTokenExpiryInfoFailed();
    error UpdateTokenKeysFailed();

    function safeCryptoTransfer(IHederaTokenService.TransferList memory transferList, IHederaTokenService.TokenTransferList[] memory tokenTransfers) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.cryptoTransfer.selector, transferList, tokenTransfers));
        if (!tryDecodeSuccessResponseCode(success, result)) revert CryptoTransferFailed();
    }

    function safeMintToken(address token, int64 amount, bytes[] memory metadata) internal returns (int64 newTotalSupply, int64[] memory serialNumbers) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.mintToken.selector,
            token, amount, metadata));
        (responseCode, newTotalSupply, serialNumbers) = success ? abi.decode(result, (int32, int64, int64[])) : (HederaResponseCodes.UNKNOWN, int64(0), new int64[](0));
        if (responseCode != HederaResponseCodes.SUCCESS) revert MintFailed();
    }

    function safeBurnToken(address token, int64 amount, int64[] memory serialNumbers) internal returns (int64 newTotalSupply) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.burnToken.selector,
            token, amount, serialNumbers));
        (responseCode, newTotalSupply) = success ? abi.decode(result, (int32, int64)) : (HederaResponseCodes.UNKNOWN, int64(0));
        if (responseCode != HederaResponseCodes.SUCCESS) revert BurnFailed();
    }

    function safeAssociateTokens(address account, address[] memory tokens) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.associateTokens.selector,
            account, tokens));
        if (!tryDecodeSuccessResponseCode(success, result)) revert MultipleAssociationsFailed();
    }

    function safeAssociateToken(address token, address account) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.associateToken.selector,
            account, token));
        if (!tryDecodeSuccessResponseCode(success, result)) revert SingleAssociationFailed();
    }

    function safeDissociateTokens(address account, address[] memory tokens) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.dissociateTokens.selector,
            account, tokens));
        if (!tryDecodeSuccessResponseCode(success, result)) revert MultipleDissociationsFailed();
    }

    function safeDissociateToken(address token, address account) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.dissociateToken.selector,
            account, token));
        if (!tryDecodeSuccessResponseCode(success, result)) revert SingleDissociationFailed();
    }

    function safeTransferTokens(address token, address[] memory accountIds, int64[] memory amounts) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.transferTokens.selector,
            token, accountIds, amounts));
        if (!tryDecodeSuccessResponseCode(success, result)) revert TokensTransferFailed();
    }

    function safeTransferNFTs(address token, address[] memory sender, address[] memory receiver, int64[] memory serialNumber) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.transferNFTs.selector,
            token, sender, receiver, serialNumber));
        if (!tryDecodeSuccessResponseCode(success, result)) revert NFTsTransferFailed();
    }

    function safeTransferToken(address token, address sender, address receiver, int64 amount) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.transferToken.selector,
            token, sender, receiver, amount));
        if (!tryDecodeSuccessResponseCode(success, result)) revert TokenTransferFailed();
    }

    function safeTransferNFT(address token, address sender, address receiver, int64 serialNumber) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.transferNFT.selector,
            token, sender, receiver, serialNumber));
        if (!tryDecodeSuccessResponseCode(success, result)) revert NFTTransferFailed();
    }

    function safeCreateFungibleToken(IHederaTokenService.HederaToken memory token, int64 initialTotalSupply, int32 decimals) internal returns (address tokenAddress) {
        nonEmptyExpiry(token);
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call{value : msg.value}(
            abi.encodeWithSelector(IHederaTokenService.createFungibleToken.selector,
            token, initialTotalSupply, decimals));
        (responseCode, tokenAddress) = success ? abi.decode(result, (int32, address)) : (HederaResponseCodes.UNKNOWN, address(0));
        if (responseCode != HederaResponseCodes.SUCCESS) revert CreateFungibleTokenFailed();
    }

    function safeCreateFungibleTokenWithCustomFees(IHederaTokenService.HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals,
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.FractionalFee[] memory fractionalFees) internal returns
    (address tokenAddress) {
        nonEmptyExpiry(token);
        int responseCode;
        (bool success, bytes memory result) = precompileAddress.call{value : msg.value}(
            abi.encodeWithSelector(IHederaTokenService.createFungibleTokenWithCustomFees.selector,
            token, initialTotalSupply, decimals, fixedFees, fractionalFees));
        (responseCode, tokenAddress) = success ? abi.decode(result, (int32, address)) : (HederaResponseCodes.UNKNOWN, address(0));
        if (responseCode != HederaResponseCodes.SUCCESS) revert CreateFungibleTokenWithCustomFeesFailed();
    }

    function safeCreateNonFungibleToken(IHederaTokenService.HederaToken memory token) internal returns
    (address tokenAddress) {
        nonEmptyExpiry(token);
        int responseCode;
        (bool success, bytes memory result) = precompileAddress.call{value : msg.value}(
            abi.encodeWithSelector(IHederaTokenService.createNonFungibleToken.selector, token));
        (responseCode, tokenAddress) = success ? abi.decode(result, (int32, address)) : (HederaResponseCodes.UNKNOWN, address(0));
        if (responseCode != HederaResponseCodes.SUCCESS) revert CreateNonFungibleTokenFailed();
    }

    function safeCreateNonFungibleTokenWithCustomFees(IHederaTokenService.HederaToken memory token,
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.RoyaltyFee[] memory royaltyFees) internal returns
    (address tokenAddress) {
        nonEmptyExpiry(token);
        int responseCode;
        (bool success, bytes memory result) = precompileAddress.call{value : msg.value}(
            abi.encodeWithSelector(IHederaTokenService.createNonFungibleTokenWithCustomFees.selector,
            token, fixedFees, royaltyFees));
        (responseCode, tokenAddress) = success ? abi.decode(result, (int32, address)) : (HederaResponseCodes.UNKNOWN, address(0));
        if (responseCode != HederaResponseCodes.SUCCESS) revert CreateNonFungibleTokenWithCustomFeesFailed();
    }

    function safeApprove(address token, address spender, uint256 amount) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.approve.selector, token, spender, amount));
        if (!tryDecodeSuccessResponseCode(success, result)) revert ApproveFailed();
    }

    function safeApproveNFT(address token, address approved, int64 serialNumber) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.approveNFT.selector, token, approved, serialNumber));
        if (!tryDecodeSuccessResponseCode(success, result)) revert NFTApproveFailed();
    }

    function safeSetApprovalForAll(address token, address operator, bool approved) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.setApprovalForAll.selector, token, operator, approved));
        if (!tryDecodeSuccessResponseCode(success, result)) revert SetTokenApprovalForAllFailed();
    }

    function safeDeleteToken(address token) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.deleteToken.selector, token));
        if (!tryDecodeSuccessResponseCode(success, result)) revert TokenDeleteFailed();
    }

    function safeFreezeToken(address token, address account) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.freezeToken.selector, token, account));
        if (!tryDecodeSuccessResponseCode(success, result)) revert FreezeTokenFailed();
    }

    function safeUnfreezeToken(address token, address account) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.unfreezeToken.selector, token, account));
        if (!tryDecodeSuccessResponseCode(success, result)) revert UnfreezeTokenFailed();
    }

    function safeGrantTokenKyc(address token, address account) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.grantTokenKyc.selector, token, account));
        if (!tryDecodeSuccessResponseCode(success, result)) revert GrantTokenKYCFailed();
    }

    function safeRevokeTokenKyc(address token, address account) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.revokeTokenKyc.selector, token, account));
        if (!tryDecodeSuccessResponseCode(success, result)) revert RevokeTokenKYCFailed();
    }

    function safePauseToken(address token) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.pauseToken.selector, token));
        if (!tryDecodeSuccessResponseCode(success, result)) revert PauseTokenFailed();
    }

    function safeUnpauseToken(address token) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.unpauseToken.selector, token));
        if (!tryDecodeSuccessResponseCode(success, result)) revert UnpauseTokenFailed();
    }

    function safeWipeTokenAccount(address token, address account, int64 amount) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.wipeTokenAccount.selector, token, account, amount));
        if (!tryDecodeSuccessResponseCode(success, result)) revert WipeTokenAccountFailed();
    }

    function safeWipeTokenAccountNFT(address token, address account, int64[] memory serialNumbers) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.wipeTokenAccountNFT.selector, token, account, serialNumbers));
        if (!tryDecodeSuccessResponseCode(success, result)) revert WipeTokenAccountNFTFailed();
    }

    function safeUpdateTokenInfo(address token, IHederaTokenService.HederaToken memory tokenInfo) internal {
        nonEmptyExpiry(tokenInfo);
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.updateTokenInfo.selector, token, tokenInfo));
        if (!tryDecodeSuccessResponseCode(success, result)) revert UpdateTokenInfoFailed();
    }

    function safeUpdateTokenExpiryInfo(address token, IHederaTokenService.Expiry memory expiryInfo) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.updateTokenExpiryInfo.selector, token, expiryInfo));
        if (!tryDecodeSuccessResponseCode(success, result)) revert UpdateTokenExpiryInfoFailed();
    }

    function safeUpdateTokenKeys(address token, IHederaTokenService.TokenKey[] memory keys) internal {
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.updateTokenKeys.selector, token, keys));
        if (!tryDecodeSuccessResponseCode(success, result)) revert UpdateTokenKeysFailed();
    }

    function tryDecodeSuccessResponseCode(bool success, bytes memory result) private pure returns (bool) {
        return (success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN) == HederaResponseCodes.SUCCESS;
    }

    function nonEmptyExpiry(IHederaTokenService.HederaToken memory token) private view
    {
        if (token.expiry.second == 0 && token.expiry.autoRenewPeriod == 0) {
            token.expiry.autoRenewPeriod = defaultAutoRenewPeriod;
            token.expiry.autoRenewAccount = address(this);
        }
    }
}
// Filename: contracts/system-contracts/hedera-token-service/safe-hts/SafeOperations.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./SafeHTS.sol";

contract SafeOperations is SafeHTS {

    event TokenCreated(address);
    event MintedNft(int64[], int64);
    event BurnToken(int64);
    event ResponseCode(int32);

    function safeAssociateTokenPublic(address sender, address tokenAddress) external {
        safeAssociateToken(tokenAddress, sender);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeDissociateTokenPublic(address sender, address tokenAddress) external {
        safeDissociateToken(tokenAddress, sender);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeAssociateTokensPublic(address account, address[] memory tokens) external {
        safeAssociateTokens(account, tokens);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeDissociateTokensPublic(address account, address[] memory tokens) external {
        safeDissociateTokens(account, tokens);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeTransferTokensPublic(address token, address[] memory accountIds, int64[] memory amounts) external {
        safeTransferTokens(token, accountIds, amounts);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeTransferNFTsPublic(address token, address[] memory sender,
        address[] memory receiver, int64[] memory serialNumber) external {
        safeTransferNFTs(token, sender, receiver, serialNumber);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeTransferTokenPublic(address token, address sender, address receiver, int64 amount) external {
        safeTransferToken(token, sender, receiver, amount);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeTransferNFTPublic(address token, address sender, address receiver, int64 serialNum) external {
        safeTransferNFT(token, sender, receiver, serialNum);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeCryptoTransferPublic(IHederaTokenService.TransferList calldata transferList, IHederaTokenService.TokenTransferList[] calldata tokenTransferList) external {
        safeCryptoTransfer(transferList, tokenTransferList);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeMintTokenPublic(address token, int64 amount,
        bytes[] memory metadata) external returns (int64 newTotalSupply, int64[] memory serialNumbers) {
        (newTotalSupply, serialNumbers) = safeMintToken(token, amount, metadata);
        emit MintedNft(serialNumbers, newTotalSupply);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeBurnTokenPublic(address token, int64 amount, int64[] memory serialNumbers) external returns (int64 newTotalSupply) {
        (newTotalSupply) = safeBurnToken(token, amount, serialNumbers);
        emit BurnToken(newTotalSupply);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeCreateFungibleTokenPublic() external payable returns (address tokenAddress) {
        IHederaTokenService.HederaToken memory token;
        token.name = "tokenName";
        token.symbol = "tokenSymbol";
        token.treasury = address(this);

        (tokenAddress) = safeCreateFungibleToken(token, 200, 8);
        emit TokenCreated(tokenAddress);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeCreateFungibleTokenWithCustomFeesPublic(address feeCollector,
        address existingTokenAddress) external payable returns (address tokenAddress) {
        IHederaTokenService.HederaToken memory token;
        token.name = "tokenName";
        token.symbol = "tokenSymbol";
        token.treasury = address(this);

        IHederaTokenService.FixedFee[] memory fixedFees =
        createFixedFeesWithAllTypes(1, existingTokenAddress, feeCollector);
        IHederaTokenService.FractionalFee[] memory fractionalFees =
        createSingleFractionalFeeWithLimits(4, 5, 10, 30, true, feeCollector);
        (tokenAddress) = safeCreateFungibleTokenWithCustomFees(token, 200, 8, fixedFees, fractionalFees);
        emit TokenCreated(tokenAddress);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeCreateNonFungibleTokenPublic() external payable returns (address tokenAddress) {
        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, msg.sender, 8000000
        );
        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            "tokenName", "tokenSymbol", msg.sender, "memo", true, 1000, false, getKeys(), expiry
        );
        (tokenAddress) = safeCreateNonFungibleToken(token);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
        emit TokenCreated(tokenAddress);
    }

    function safeCreateNonFungibleTokenWithCustomFeesPublic(address feeCollector,
        address existingTokenAddress) external payable returns (address tokenAddress) {
        IHederaTokenService.HederaToken memory token;
        token.name = "tokenName";
        token.symbol = "tokenSymbol";
        token.memo = "memo";
        token.treasury = address(this);
        IHederaTokenService.RoyaltyFee[] memory royaltyFees =
        createRoyaltyFeesWithAllTypes(4, 5, 10, existingTokenAddress, feeCollector);
        (tokenAddress) = safeCreateNonFungibleTokenWithCustomFees(token, new IHederaTokenService.FixedFee[](0), royaltyFees);
        emit TokenCreated(tokenAddress);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeApprovePublic(address token, address spender, uint256 amount) external {
        safeApprove(token, spender, amount);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeApproveNFTPublic(address token, address approved, int64 serialNumber) external {
        safeApproveNFT(token, approved, serialNumber);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeSetApprovalForAllPublic(address token, address operator, bool approved) external {
        safeSetApprovalForAll(token, operator, approved);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeDeleteTokenPublic(address token) external {
        safeDeleteToken(token);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeFreezeTokenPublic(address token, address account) external {
        safeFreezeToken(token, account);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeUnfreezeTokenPublic(address token, address account) external {
        safeUnfreezeToken(token, account);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeGrantTokenKycPublic(address token, address account) external {
        safeGrantTokenKyc(token, account);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeRevokeTokenKycPublic(address token, address account) external {
        safeRevokeTokenKyc(token, account);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safePauseTokenPublic(address token) external {
        safePauseToken(token);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeUnpauseTokenPublic(address token) external {
        safeUnpauseToken(token);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeWipeTokenAccountPublic(address token, address account, int64 amount) external {
        safeWipeTokenAccount(token, account, amount);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeWipeTokenAccountNFTPublic(address token, address account, int64[] memory serialNumbers) external {
        safeWipeTokenAccountNFT(token, account, serialNumbers);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeUpdateTokenInfoPublic(address token, IHederaTokenService.HederaToken memory tokenInfo) external {
        safeUpdateTokenInfo(token, tokenInfo);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeUpdateTokenExpiryInfoPublic(address token, IHederaTokenService.Expiry memory expiryInfo) external {
        safeUpdateTokenExpiryInfo(token, expiryInfo);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function safeUpdateTokenKeysPublic(address token, IHederaTokenService.TokenKey[] memory keys) external {
        safeUpdateTokenKeys(token, keys);
        emit ResponseCode(HederaResponseCodes.SUCCESS);
    }

    function createRoyaltyFeesWithAllTypes(int32 numerator, int32 denominator, int32 amount,
        address tokenId, address feeCollector) internal pure returns (IHederaTokenService.RoyaltyFee[] memory royaltyFees) {
        royaltyFees = new IHederaTokenService.RoyaltyFee[](3);
        IHederaTokenService.RoyaltyFee memory royaltyFeeWithoutFallback = createRoyaltyFee(numerator, denominator, feeCollector);
        IHederaTokenService.RoyaltyFee memory royaltyFeeWithFallbackHbar = createRoyaltyFeeWithFallbackFee(numerator, denominator, amount, address(0x0), true, feeCollector);
        IHederaTokenService.RoyaltyFee memory royaltyFeeWithFallbackToken = createRoyaltyFeeWithFallbackFee(numerator, denominator, amount, tokenId, false, feeCollector);
        royaltyFees[0] = royaltyFeeWithoutFallback;
        royaltyFees[1] = royaltyFeeWithFallbackHbar;
        royaltyFees[2] = royaltyFeeWithFallbackToken;
    }

    function createRoyaltyFee(int32 numerator, int32 denominator, address feeCollector) internal pure returns (IHederaTokenService.RoyaltyFee memory royaltyFee) {
        royaltyFee.numerator = numerator;
        royaltyFee.denominator = denominator;
        royaltyFee.feeCollector = feeCollector;
    }

    function createRoyaltyFeeWithFallbackFee(int32 numerator, int32 denominator, int32 amount, address tokenId, bool useHbarsForPayment,
        address feeCollector) internal pure returns (IHederaTokenService.RoyaltyFee memory royaltyFee) {
        royaltyFee.numerator = numerator;
        royaltyFee.denominator = denominator;
        royaltyFee.amount = amount;
        royaltyFee.tokenId = tokenId;
        royaltyFee.useHbarsForPayment = useHbarsForPayment;
        royaltyFee.feeCollector = feeCollector;
    }

    function createFixedFeesWithAllTypes(int32 amount, address tokenId, address feeCollector) internal pure returns (IHederaTokenService.FixedFee[] memory fixedFees) {
        fixedFees = new IHederaTokenService.FixedFee[](3);
        IHederaTokenService.FixedFee memory fixedFeeForToken = createFixedFeeForToken(amount, tokenId, feeCollector);
        IHederaTokenService.FixedFee memory fixedFeeForHbars = createFixedFeeForHbars(amount * 2, feeCollector);
        IHederaTokenService.FixedFee memory fixedFeeForCurrentToken = createFixedFeeForCurrentToken(amount * 4, feeCollector);
        fixedFees[0] = fixedFeeForToken;
        fixedFees[1] = fixedFeeForHbars;
        fixedFees[2] = fixedFeeForCurrentToken;
    }

    function createFixedFeeForToken(int32 amount, address tokenId, address feeCollector) internal pure returns (IHederaTokenService.FixedFee memory fixedFee) {
        fixedFee.amount = amount;
        fixedFee.tokenId = tokenId;
        fixedFee.feeCollector = feeCollector;
    }

    function createFixedFeeForHbars(int32 amount, address feeCollector) internal pure returns (IHederaTokenService.FixedFee memory fixedFee) {
        fixedFee.amount = amount;
        fixedFee.useHbarsForPayment = true;
        fixedFee.feeCollector = feeCollector;
    }

    function createFixedFeeForCurrentToken(int32 amount, address feeCollector) internal pure returns (IHederaTokenService.FixedFee memory fixedFee) {
        fixedFee.amount = amount;
        fixedFee.useCurrentTokenForPayment = true;
        fixedFee.feeCollector = feeCollector;
    }

    function createSingleFractionalFeeWithLimits(int32 numerator, int32 denominator, int32 minimumAmount,
        int32 maximumAmount, bool netOfTransfers, address feeCollector) internal pure returns (IHederaTokenService.FractionalFee[] memory fractionalFees) {
        fractionalFees = new IHederaTokenService.FractionalFee[](1);
        IHederaTokenService.FractionalFee memory fractionalFee = createFractionalFeeWithLimits(numerator, denominator, minimumAmount, maximumAmount, netOfTransfers, feeCollector);
        fractionalFees[0] = fractionalFee;
    }

    function createFractionalFeeWithLimits(int32 numerator, int32 denominator, int32 minimumAmount, int32 maximumAmount,
        bool netOfTransfers, address feeCollector) internal pure returns (IHederaTokenService.FractionalFee memory fractionalFee) {
        fractionalFee.numerator = numerator;
        fractionalFee.denominator = denominator;
        fractionalFee.minimumAmount = minimumAmount;
        fractionalFee.maximumAmount = maximumAmount;
        fractionalFee.netOfTransfers = netOfTransfers;
        fractionalFee.feeCollector = feeCollector;
    }

    function getKeys() internal pure returns (IHederaTokenService.TokenKey[] memory) {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](5);

        IHederaTokenService.KeyValue memory keyValueAdmin;
        keyValueAdmin.inheritAccountKey = true;
        IHederaTokenService.KeyValue memory keyValueKyc;
        keyValueKyc.inheritAccountKey = true;
        IHederaTokenService.KeyValue memory keyValueFreeze;
        keyValueFreeze.inheritAccountKey = true;
        IHederaTokenService.KeyValue memory keyValueWipe;
        keyValueWipe.inheritAccountKey = true;
        IHederaTokenService.KeyValue memory keyValueSupply;
        keyValueSupply.inheritAccountKey = true;

        keys[0] = IHederaTokenService.TokenKey(1, keyValueAdmin);
        keys[1] = IHederaTokenService.TokenKey(2, keyValueKyc);
        keys[2] = IHederaTokenService.TokenKey(4, keyValueFreeze);
        keys[3] = IHederaTokenService.TokenKey(8, keyValueWipe);
        keys[4] = IHederaTokenService.TokenKey(16, keyValueSupply);

        return keys;
    }
}
// Filename: contracts/system-contracts/hedera-token-service/safe-hts/SafeViewHTS.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "../IHederaTokenService.sol";
import "../../HederaResponseCodes.sol";

abstract contract SafeViewHTS {

    address constant precompileAddress = address(0x167);
    // 90 days in seconds
    int32 constant defaultAutoRenewPeriod = 7776000;

    error AllowanceFailed();
    error GetApprovedFailed();
    error IsApprovedForAllFailed();
    error IsFrozenFailed();
    error IsKYCGrantedFailed();
    error GetTokenCustomFeesFailed();
    error GetTokenDefaultFreezeStatusFailed();
    error GetTokenDefaultKYCStatusFailed();
    error GetTokenExpiryInfoFailed();
    error GetFungibleTokenInfoFailed();
    error GetTokenInfoFailed();
    error GetTokenKeyFailed();
    error GetNonFungibleTokenInfoFailed();
    error IsTokenFailed();
    error GetTokenTypeFailed();

    function safeAllowance(address token, address owner, address spender) internal returns (uint256 allowance) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.allowance.selector, token, owner, spender));
        (responseCode, allowance) = success ? abi.decode(result, (int32, uint256)) : (HederaResponseCodes.UNKNOWN, 0);
        if (responseCode != HederaResponseCodes.SUCCESS) revert AllowanceFailed();
    }

    function safeGetApproved(address token, int64 serialNumber) internal returns (address approved) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getApproved.selector, token, serialNumber));
        (responseCode, approved) = success ? abi.decode(result, (int32, address)) : (HederaResponseCodes.UNKNOWN, address(0));
        if (responseCode != HederaResponseCodes.SUCCESS) revert GetApprovedFailed();
    }

    function safeIsApprovedForAll(address token, address owner, address operator) internal returns (bool approved) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.isApprovedForAll.selector, token, owner, operator));
        (responseCode, approved) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
        if (responseCode != HederaResponseCodes.SUCCESS) revert IsApprovedForAllFailed();
    }

    function safeIsFrozen(address token, address account) internal returns (bool frozen) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.isFrozen.selector, token, account));
        (responseCode, frozen) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
        if (responseCode != HederaResponseCodes.SUCCESS) revert IsFrozenFailed();
    }

    function safeIsKyc(address token, address account) internal returns (bool kycGranted) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.isKyc.selector, token, account));
        (responseCode, kycGranted) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
        if (responseCode != HederaResponseCodes.SUCCESS) revert IsKYCGrantedFailed();
    }

    function safeGetTokenCustomFees(address token) internal returns (IHederaTokenService.FixedFee[] memory fixedFees, IHederaTokenService.FractionalFee[] memory fractionalFees, IHederaTokenService.RoyaltyFee[] memory royaltyFees) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenCustomFees.selector, token));
        (responseCode, fixedFees, fractionalFees, royaltyFees) =
        success
        ? abi.decode(result, (int32, IHederaTokenService.FixedFee[], IHederaTokenService.FractionalFee[], IHederaTokenService.RoyaltyFee[]))
        : (HederaResponseCodes.UNKNOWN, fixedFees, fractionalFees, royaltyFees);
        if (responseCode != HederaResponseCodes.SUCCESS) revert GetTokenCustomFeesFailed();
    }

    function safeGetTokenDefaultFreezeStatus(address token) internal returns (bool defaultFreezeStatus) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenDefaultFreezeStatus.selector, token));
        (responseCode, defaultFreezeStatus) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
        if (responseCode != HederaResponseCodes.SUCCESS) revert GetTokenDefaultFreezeStatusFailed();
    }

    function safeGetTokenDefaultKycStatus(address token) internal returns (bool defaultKycStatus) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenDefaultKycStatus.selector, token));
        (responseCode, defaultKycStatus) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
        if (responseCode != HederaResponseCodes.SUCCESS) revert GetTokenDefaultKYCStatusFailed();
    }

    function safeGetTokenExpiryInfo(address token) internal returns (IHederaTokenService.Expiry memory expiry) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenExpiryInfo.selector, token));
        (responseCode, expiry) = success ? abi.decode(result, (int32, IHederaTokenService.Expiry)) : (HederaResponseCodes.UNKNOWN, expiry);
        if (responseCode != HederaResponseCodes.SUCCESS) revert GetTokenExpiryInfoFailed();
    }

    function safeGetFungibleTokenInfo(address token) internal returns (IHederaTokenService.FungibleTokenInfo memory fungibleTokenInfo) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getFungibleTokenInfo.selector, token));
        (responseCode, fungibleTokenInfo) = success ? abi.decode(result, (int32, IHederaTokenService.FungibleTokenInfo)) : (HederaResponseCodes.UNKNOWN, fungibleTokenInfo);
        if (responseCode != HederaResponseCodes.SUCCESS) revert GetFungibleTokenInfoFailed();
    }

    function safeGetTokenInfo(address token) internal returns (IHederaTokenService.TokenInfo memory tokenInfo) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenInfo.selector, token));
        (responseCode, tokenInfo) = success ? abi.decode(result, (int32, IHederaTokenService.TokenInfo)) : (HederaResponseCodes.UNKNOWN, tokenInfo);
        if (responseCode != HederaResponseCodes.SUCCESS) revert GetTokenInfoFailed();
    }

    function safeGetTokenKey(address token, uint keyType) internal returns (IHederaTokenService.KeyValue memory key) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenKey.selector, token, keyType));
        (responseCode, key) = success ? abi.decode(result, (int32, IHederaTokenService.KeyValue)) : (HederaResponseCodes.UNKNOWN, key);
        if (responseCode != HederaResponseCodes.SUCCESS) revert GetTokenKeyFailed();
    }

    function safeGetNonFungibleTokenInfo(address token, int64 serialNumber) internal returns (IHederaTokenService.NonFungibleTokenInfo memory nonFungibleTokenInfo) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getNonFungibleTokenInfo.selector, token, serialNumber));
        (responseCode, nonFungibleTokenInfo) = success ? abi.decode(result, (int32, IHederaTokenService.NonFungibleTokenInfo)) : (HederaResponseCodes.UNKNOWN, nonFungibleTokenInfo);
        if (responseCode != HederaResponseCodes.SUCCESS) revert GetNonFungibleTokenInfoFailed();
    }


    function safeIsToken(address token) internal returns (bool isToken) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.isToken.selector, token));
        (responseCode, isToken) = success ? abi.decode(result, (int32, bool)) : (HederaResponseCodes.UNKNOWN, false);
        if (responseCode != HederaResponseCodes.SUCCESS) revert IsTokenFailed();
    }

    function safeGetTokenType(address token) internal returns (int32 tokenType) {
        int32 responseCode;
        (bool success, bytes memory result) = precompileAddress.call(
            abi.encodeWithSelector(IHederaTokenService.getTokenType.selector, token));
        (responseCode, tokenType) = success ? abi.decode(result, (int32, int32)) : (HederaResponseCodes.UNKNOWN, int32(0));
        if (responseCode != HederaResponseCodes.SUCCESS) revert GetTokenTypeFailed();
    }

    function tryDecodeSuccessResponseCode(bool success, bytes memory result) private pure returns (bool) {
        return (success ? abi.decode(result, (int32)) : HederaResponseCodes.UNKNOWN) == HederaResponseCodes.SUCCESS;
    }

    function nonEmptyExpiry(IHederaTokenService.HederaToken memory token) private view {
        if (token.expiry.second == 0 && token.expiry.autoRenewPeriod == 0) {
            token.expiry.autoRenewPeriod = defaultAutoRenewPeriod;
            token.expiry.autoRenewAccount = address(this);
        }
    }
}
// Filename: contracts/system-contracts/hedera-token-service/safe-hts/SafeViewOperations.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./SafeViewHTS.sol";

contract SafeViewOperations is SafeViewHTS {
    event Allowance(uint256);
    event GetApproved(address);
    event IsApprovedForAll(bool);
    event IsFrozen(bool);
    event IsKyc(bool);
    event GetTokenCustomFees(IHederaTokenService.FixedFee[], IHederaTokenService.FractionalFee[], IHederaTokenService.RoyaltyFee[]);
    event GetTokenDefaultFreezeStatus(bool);
    event GetTokenDefaultKycStatus(bool);
    event GetTokenExpiryInfo(IHederaTokenService.Expiry);
    event GetFungibleTokenInfo(IHederaTokenService.FungibleTokenInfo);
    event GetTokenInfo(IHederaTokenService.TokenInfo);
    event GetTokenKey(IHederaTokenService.KeyValue);
    event GetNonFungibleTokenInfo(IHederaTokenService.NonFungibleTokenInfo);
    event IsToken(bool);
    event GetTokenType(int32);

    function safeAllowancePublic(address token, address owner, address spender) external returns (uint256 allowance) {
        allowance = safeAllowance(token, owner, spender);
        emit Allowance(allowance);
    }

    function safeGetApprovedPublic(address token, int64 serialNumber) external returns (address approved) {
        approved = safeGetApproved(token, serialNumber);
        emit GetApproved(approved);
    }

    function safeIsApprovedForAllPublic(address token, address owner, address operator) external returns (bool approved) {
        approved = safeIsApprovedForAll(token, owner, operator);
        emit IsApprovedForAll(approved);
    }

    function safeIsFrozenPublic(address token, address account) external returns (bool frozen) {
        frozen = safeIsFrozen(token, account);
        emit IsFrozen(frozen);
    }

    function safeIsKycPublic(address token, address account) external returns (bool kycGranted) {
        kycGranted = safeIsKyc(token, account);
        emit IsKyc(kycGranted);
    }

    function safeGetTokenCustomFeesPublic(address token) external returns (IHederaTokenService.FixedFee[] memory fixedFees, IHederaTokenService.FractionalFee[] memory fractionalFees, IHederaTokenService.RoyaltyFee[] memory royaltyFees) {
        (fixedFees, fractionalFees, royaltyFees) = safeGetTokenCustomFees(token);
        emit GetTokenCustomFees(fixedFees, fractionalFees, royaltyFees);
    }

    function safeGetTokenDefaultFreezeStatusPublic(address token) external returns (bool defaultFreezeStatus) {
        defaultFreezeStatus = safeGetTokenDefaultFreezeStatus(token);
        emit GetTokenDefaultFreezeStatus(defaultFreezeStatus);
    }

    function safeGetTokenDefaultKycStatusPublic(address token) external returns (bool defaultKycStatus) {
        defaultKycStatus = safeGetTokenDefaultKycStatus(token);
        emit GetTokenDefaultKycStatus(defaultKycStatus);
    }

    function safeGetTokenExpiryInfoPublic(address token) external returns (IHederaTokenService.Expiry memory expiry) {
        expiry = safeGetTokenExpiryInfo(token);
        emit GetTokenExpiryInfo(expiry);
    }

    function safeGetFungibleTokenInfoPublic(address token) external returns (IHederaTokenService.FungibleTokenInfo memory fungibleTokenInfo) {
        fungibleTokenInfo = safeGetFungibleTokenInfo(token);
        emit GetFungibleTokenInfo(fungibleTokenInfo);
    }

    function safeGetTokenInfoPublic(address token) external returns (IHederaTokenService.TokenInfo memory tokenInfo) {
        tokenInfo = safeGetTokenInfo(token);
        emit GetTokenInfo(tokenInfo);
    }

    function safeGetTokenKeyPublic(address token, uint keyType) external returns (IHederaTokenService.KeyValue memory key) {
        key = safeGetTokenKey(token, keyType);
        emit GetTokenKey(key);
    }

    function safeGetNonFungibleTokenInfoPublic(address token, int64 serialNumber) external returns (IHederaTokenService.NonFungibleTokenInfo memory nonFungibleTokenInfo) {
        nonFungibleTokenInfo = safeGetNonFungibleTokenInfo(token, serialNumber);
        emit GetNonFungibleTokenInfo(nonFungibleTokenInfo);
    }

    function safeIsTokenPublic(address token) external returns (bool isToken) {
        isToken = safeIsToken(token);
        emit IsToken(isToken);
    }

    function safeGetTokenTypePublic(address token) external returns (int32 tokenType) {
        tokenType = safeGetTokenType(token);
        emit GetTokenType(tokenType);
    }
}
// Filename: contracts/system-contracts/native/EcrecoverCaller.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

contract EcrecoverCaller {
    event EcrecoverResult(bytes result);
    address accountZeroZeroOne = address(0x0000000000000000000000000000000000000001);

    function callEcrecover(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) external pure returns (address) {
        address result = ecrecover(messageHash, v, r, s);
        return result;
    }

    function call0x1(bytes calldata callData) external payable returns (bool) {
        address target = accountZeroZeroOne;
        (bool success, bytes memory result) = target.call{value: msg.value}(callData);
        if (!success) {
            revert();
        }
        emit EcrecoverResult(result);
        return success;
    }

    function send0x1() external payable {
        address payable target = payable(accountZeroZeroOne);
        target.transfer(msg.value);
    }

    function transfer0x1() external payable {
        address payable target = payable(accountZeroZeroOne);
        target.transfer(msg.value);
    }
}
// Filename: contracts/system-contracts/native/EthNativePrecompileCaller.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract EthNativePrecompileCaller {
    event PrecompileResult(bytes result);
    event PrecompileResult32(bytes32 result);
    event PrecompileResultUint(uint result);

    function call0x01(bytes calldata callData) external returns (bool) {
        (bool calculated, bytes memory result) = address(1).call(callData);
        
        require(calculated, "Error calling precompile 0x01");
        emit PrecompileResult(result);
        
        return calculated;
    }

    function call0x02(string memory input) external returns (bool) {
        (bool calculated, bytes memory result) = address(2).staticcall(bytes(input));
		
		require(calculated, "Error calling precompile 0x02");
        bytes32 h = abi.decode(result, (bytes32));
        emit PrecompileResult32(h);

        return calculated;
    }

    function call0x02sha256(string memory input) external pure returns (bytes32) {
        bytes32 hashRes = sha256(bytes(input));

        return hashRes;
    }

    function call0x03(string calldata input) external returns (bool) {
        (bool calculated, bytes memory result) = address(3).staticcall(bytes(input));
		
		require(calculated, "Error calling precompile 0x03");
        bytes32 h = abi.decode(result, (bytes32));
        emit PrecompileResult32(h);

        return calculated;
    }

    function call0x04(string calldata data) external returns (bool) {
        (bool calculated, bytes memory result) = address(4).staticcall(bytes(data));

        require(calculated, "Error calling precompile 0x04");
        emit PrecompileResult(result);
        emit PrecompileResult(bytes(data));

        return calculated;
    }

    function call0x05(uint64 base, uint64 exp, uint64 modulus) external returns (bytes memory) {
        bytes memory fixed32BytesCalldata = abi.encode(
            abi.encodePacked(base).length,
            abi.encodePacked(exp).length,
            abi.encodePacked(modulus).length
        );
        bytes memory dynamicCallData = abi.encodePacked(
            base,
            exp,
            modulus
        );
        bytes memory callData = abi.encodePacked(fixed32BytesCalldata, dynamicCallData);

        (bool success, bytes memory result) = address(5).call(callData);
        require(success, "Error calling precompile 0x05");

        return result;
    }

    function call0x06(bytes calldata callData) external returns (bool) {
        (bool calculated, bytes memory result) = address(6).staticcall(callData);

        require(calculated, "Error calling precompile 0x06");
        (bytes32 x, bytes32 y) = abi.decode(result, (bytes32, bytes32));
        emit PrecompileResult32(x);
        emit PrecompileResult32(y);
        
        return calculated;
    }

    function call0x07(bytes calldata callData) external returns (bool) {
        (bool calculated, bytes memory result) = address(7).staticcall(callData);

        require(calculated, "Error calling precompile 0x07");
        (bytes32 x, bytes32 y) = abi.decode(result, (bytes32, bytes32));
        emit PrecompileResult32(x);
        emit PrecompileResult32(y);
        
        return calculated;
    }

    function call0x08(bytes calldata callData) external returns (bool) {
        (bool calculated, bytes memory result) = address(8).staticcall(callData);

        require(calculated, "Error calling precompile 0x08");
        (bytes32 success) = abi.decode(result, (bytes32));
        emit PrecompileResult32(success);
        
        return calculated;
    }

    function call0x09(bytes calldata callData) external returns (bool) {
        (bool calculated, bytes memory result) = address(9).staticcall(callData);

        require(calculated, "Error calling precompile 0x09");
        emit PrecompileResult(result);
        
        return calculated;
    }
}
// Filename: contracts/system-contracts/pseudo-random-number-generator/IPrngSystemContract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.4.9 <0.9.0;

interface IPrngSystemContract {
    // Generates a 256-bit pseudorandom seed using the first 256-bits of running hash of n-3 transaction record.
    // Users can generate a pseudorandom number in a specified range using the seed by (integer value of seed % range)
    function getPseudorandomSeed() external returns (bytes32);
}
// Filename: contracts/system-contracts/pseudo-random-number-generator/PrngSystemContract.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;

import "./IPrngSystemContract.sol";

contract PrngSystemContract {
    event PseudoRandomSeed(bytes32 seedBytes);

    // Prng system contract address with ContractID 0.0.361
    address constant PRECOMPILE_ADDRESS = address(0x169);

    function getPseudorandomSeed() external returns (bytes32 seedBytes) {
        (bool success, bytes memory result) = PRECOMPILE_ADDRESS.call(
            abi.encodeWithSelector(IPrngSystemContract.getPseudorandomSeed.selector));
        require(success, "PRNG system call failed");
        seedBytes = abi.decode(result, (bytes32));
        emit PseudoRandomSeed(seedBytes);
    }
}
// Filename: contracts/yul/bitwise-coverage/Bitwise.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract Bitwise {
    /// bitwise “not” of x (every bit of x is negated)
    /// example x = 2 => not(x) = -3
    /// explanation: x = 2 => binaryX = 0|0010 => ~binaryX = 1|1101
    ///              1's complement (flip bit) 1sX = 1|0010
    ///              2's complement (add 1) 2sX = 1|0010 + 1 = 1|0011 => -3    
    function not(int256 x) external pure returns (int256 result) {
        assembly {
            result := not(x)
        }
    }

    /// bitwise “and” of x and y
    function and(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := and(x, y)
        }
    }

    /// bitwise or” of x and y
    function or(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := or(x, y)
        }
    }

    /// bitwise “xor” of x and y
    function xor(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := xor(x, y)
        }
    }

    /// nth byte of x, where the most significant byte is the 0th byte
    function extractbyteat(uint256 n, uint256 x) external pure returns (uint256 result) {
        assembly {
            result := byte(n , x)
        }
    }

    /// logical shift left y by x bits
    function shl(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := shl(x, y)
        }
    }

    /// logical shift right y by x bits
    function shr(uint256 x, uint256 y) external pure returns (uint256 result) {
        assembly {
            result := shr(x, y)
        }
    }

    /// signed arithmetic shift right y by x bits
    function sar(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := sar(x, y)
        }
    }
}

// Filename: contracts/yul/contract-caller/ContractCaller.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract TargetContract {
    uint256 count;

    constructor(uint256 _count) {
        count = _count;
    }

    function setCount(uint256 _count) external {
        count = _count;
    }

    function getCount() external view returns (uint256) {
        return count;
    }
}


contract ContractCaller {
    uint256 public count;

    event CallResult(bool success);
    event CallReturnedData(uint256 count);

    /// call(g, a, v, in, insize, out, outsize)
    /// `g`: Amount of gas to be provided for the execution of called contract
    /// `a`: Address of the called contract
    /// `v`: callvalue() (a.k.a. msg.value)
    /// `in`: Input data that will be provided to the called contract
    /// `insize`: Input data size
    /// `out`: Output data produced by the called contract
    /// `outsize`: Output data size
    function call(uint256 gasLimit, address payable _targetContractAddress, bytes memory input) external payable {
        bool success;
        uint256 returnedData;

        assembly {
            let returnedDataPlaceholder := mload(0x40) // load the data at free memory pointer
            
            success := call(gasLimit, _targetContractAddress, callvalue(), add(input, 0x20), mload(input), returnedDataPlaceholder, 0x20)
            
            returnedData := mload(returnedDataPlaceholder)
        }

        emit CallResult(success);
        emit CallReturnedData(returnedData);
    }

    /// staticcall(g, a, in, insize, out, outsize) - identical to `call` but do not allow state modifications
    /// `g`: Amount of gas to be provided for the execution of called contract
    /// `a`: Address of the called contract
    /// `in`: Input data that will be provided to the called contract
    /// `insize`: Input data size
    /// `out`: Output data produced by the called contract
    /// `outsize`: Output data size
    function staticcall(uint256 gasLimit, address payable _targetContractAddress, bytes memory input) external {
        bool success;
        uint256 returnedData;

        assembly {
            let returnedDataPlaceholder := mload(0x40) // load the data at free memory pointer
            
            success := staticcall(gasLimit, _targetContractAddress, add(input, 0x20), mload(input), returnedDataPlaceholder, 0x20)
            
            returnedData := mload(returnedDataPlaceholder)
        }

        emit CallResult(success);
        emit CallReturnedData(returnedData);
    }


    /// callcode(g, a, v, in, insize, out, outsize) - identical to `call` but only use the code from a and stay in the context of the current contract otherwise
    /// `g`: Amount of gas to be provided for the execution of called contract
    /// `a`: Address of the called contract
    /// `in`: Input data that will be provided to the called contract
    /// `insize`: Input data size
    /// `out`: Output data produced by the called contract
    /// `outsize`: Output data size
    function callCode(uint256 gasLimit, address payable _targetContractAddress, bytes memory input) external payable {
        bool success;
        assembly {
            /// @notice callcode uses the code from `_targetContractAddress` to update current contract's states
            success := callcode(gasLimit, _targetContractAddress, callvalue(), add(input, 0x20), mload(input), 0, 0)
        }
        emit CallResult(success);
    }

    /// delegatecall(g, a, in, insize, out, outsize) - identical to `callcode` but also keep caller and callvalue 
    /// `g`: Amount of gas to be provided for the execution of called contract
    /// `a`: Address of the called contract
    /// `in`: Input data that will be provided to the called contract
    /// `insize`: Input data size
    /// `out`: Output data produced by the called contract
    /// `outsize`: Output data size
    function delegateCall(uint256 gasLimit, address payable _targetContractAddress, bytes memory input) external {
        bool success;
        assembly {
            /// @notice delegatecall uses the code from `_targetContractAddress` to update current contract's states
            success := delegatecall(gasLimit, _targetContractAddress, add(input, 0x20), mload(input), 0, 0)
        }
        emit CallResult(success);
    }
}
// Filename: contracts/yul/contract-creator/ContractCreator.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @notice The unit tests for the `ContractCreator` contract will utilize a predefined bytecode of a contract that inherits the `ITargetContract` interface.
 */
interface ITargetContract {
    function setCount(uint _number) external;
    function getCount() external view returns (uint);
}

contract ContractCreator {
    event NewContractCreated(address contractAddress);

    /// create(v, p, n) is used to create a new contract
    /// `v`: The value (in wei) to be transferred to the newly created contract.
    /// `p`: The address of the location in memory where the code for the new contract is stored.
    /// `n`: The size of the code in memory.
    function createNewContract(bytes memory bytecode) external payable {
        address newContractAddress;
        assembly {
            // get msgValue
            let msgValue := callvalue()

            // get the size of the `bytecode`
            let size := mload(bytecode)

            // get actual bytecode
            // @notice: This is done as `add(bytecode, 0x20)` because the first 32 bytes of the `bytecode` are often used to store the length of the bytecode,
            //          and the actual bytecode starts from 33rd byte. So by adding `0x20`, it's pointing to the actualy bytecode's starting position within the `bytecode` array
            let actualByteCode := add(bytecode, 0x20)

            // Create new contract using create(v, p, n) opcode
            newContractAddress := create(msgValue, actualByteCode, size)

            // check if the contract creation was sucessful
            if iszero(extcodesize(newContractAddress)) {
                revert(0, 0)
            }
        }
        emit NewContractCreated(newContractAddress);
    }


    /// create2(v, p, n, s) is used to create a new contract
    /// `v`: The value (in wei) to be transferred to the newly created contract.
    /// `p`: The address of the location in memory where the code for the new contract is stored.
    /// `n`: The size of the code in memory.
    /// `s`: The random 256-bit salt
    function create2NewContract(bytes memory bytecode, uint256 salt) external payable {
        address newContractAddress;
        assembly {
            // get msgValue
            let msgValue := callvalue()

            // get the size of the `bytecode`
            let size := mload(bytecode)

            // get actual bytecode
            // @notice: This is done as `add(bytecode, 0x20)` because the first 32 bytes of the `bytecode` are often used to store the length of the bytecode,
            //          and the actual bytecode starts from 33rd byte. So by adding `0x20`, it's pointing to the actualy bytecode's starting position within the `bytecode` array
            let actualByteCode := add(bytecode, 0x20)

            // Create new contract using create2(v, p, n, s) opcode
            newContractAddress := create2(msgValue, actualByteCode, size, salt)

            // check if the contract creation was sucessful
            if iszero(extcodesize(newContractAddress)) {
                revert (0,0)
            }
        }
        emit NewContractCreated(newContractAddress);
    }
}
// Filename: contracts/yul/data-allocation/DataAllocation.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract DataAllocation {
    uint256 a = 0;
    uint256 b = 12;

    /// mstore - mem[p…(p+32)) := v
    /// mload - mem[p…(p+32))
    function allocateMemory(uint256 p, uint256 v) external pure returns (uint256 n) {
        assembly {
            mstore(p, v)
            n := mload(p)
        }
        return n;
    }

    /// mstore8 - mem[p] := v & 0xff (only modifies a single byte)
    /// mload - mem[p…(p+32))
    function allocateMemory8(uint256 p, uint8 v) external pure returns (uint8 n) {
        bytes1 value;
        assembly {
            mstore8(p, v)
            value := mload(p)
        }
        n = uint8(value);
    }

    /// sload - storage[p]
    function sload(uint256 p) external view returns (uint256 n) {
        assembly {
            n := sload(p)
        }
    }

    /// sstore - storage[p] := v
    function sstore(uint256 p, uint256 v) external {
        assembly {
            sstore(p, v)
        }
    }
}

// Filename: contracts/yul/math-coverage/MatchCoverage.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract MathCoverage {

    /// addition
    function add(int256 x, int256 y) external pure returns (int256 result){
        assembly {
            result := add(x, y)
        }
    }

    /// subtraction
    function sub(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := sub(x, y)
        }
    }

    /// multiply
    function mul(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := mul(x, y)
        }
    }

    /// division - x / y or 0 if y == 0
    function div(uint256 x, uint256 y) external pure returns (uint256 result) {
        assembly {
            result := div(x, y)
        }
    }

    /// signed division - x / y, for signed numbers in two’s complement, 0 if y == 0
    function sdiv(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := sdiv(x, y)
        }
    }

    /// modulous - x % y, 0 if y == 0
    function mod(uint256 x, uint256 y) external pure returns (uint256 result) {
        assembly {
            result := mod(x, y)
        }
    }

    /// signed modulous - x % y, for signed numbers in two’s complement, 0 if y == 0
    function smod(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := smod(x, y)
        }
    }

    /// exponent -  x to the power of y
    function exp(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := exp(x, y)
        }
    }

    /// less than -  1 if x < y, 0 otherwise
    function lt(uint256 x, uint256 y) external pure returns (uint256 result) {
        assembly {
            result := lt(x, y)
        }
    }

    /// greater than -  1 if x > y, 0 otherwise
    function gt(uint256 x, uint256 y) external pure returns (uint256 result) {
        assembly {
            result := gt(x, y)
        }
    }

    /// signed less than - 1 if x < y, 0 otherwise, for signed numbers in two’s complement
    function slt(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := slt(x, y)
        }
    }

    /// signed greater than -  1 if x > y, 0 otherwise, for signed numbers in two’s complement
    function sgt(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := sgt(x, y)
        }
    }

    /// equal - 1 if x == y, 0 otherwise
    function eq(int256 x, int256 y) external pure returns (int256 result) {
        assembly {
            result := eq(x, y)
        }
    }

    /// is zero - 1 if x == 0, 0 otherwise
    function iszero(int256 x) external pure returns (int256 result) {
        assembly {
            result := iszero(x)
        }
    }

    /// add modulous - (x + y) % m with arbitrary precision arithmetic, 0 if m == 0
    function addMod(int256 x, int256 y, int256 m) external pure returns (int256 result) {
        assembly {
            result := addmod(x, y, m)
        }
    }

    /// multiply modulous - (x * y) % m with arbitrary precision arithmetic, 0 if m == 0
    function mulMod(int256 x, int256 y, int256 m) external pure returns (int256 result) {
        assembly {
            result := mulmod(x, y, m)
        }
    }
}

// Filename: contracts/yul/transaction-information/TransactionInfo.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract TransactionInfo {

    constructor() payable {}

    /// gas still available to execution
    function getGasLeft() external view returns (uint256 result) {
        assembly{
            result := gas()
        }
    }
    
    /// address of the current contract / execution context
    function getContractAddress() external view returns (address addr) {
        assembly {
            addr := address()
        }
    }

    /// get wei balance at address a
    function getBalance(address a) external view returns (uint256 bal) {
        assembly {
            bal := balance(a)
        }
    }

    /// get self balance - equivalent to balance(address()), but cheaper
    function getSelfBalance() external view returns (uint256 bal) {
        assembly {
            bal := selfbalance()
        }
    }

    /// get call sender
    function getMsgCaller() external view returns (address msgCaller) {
        assembly {
            msgCaller := caller()
        }
    }

    /// get wei sent together with the current call
    event CallValue(uint256 callBalance);
    function getCallValue() external payable {
        uint256 callBalance;
        assembly {
            callBalance := callvalue()
        }
        emit CallValue(callBalance);
    }
    
    /// call msg.data starting from position p (32 bytes)
    /// msg.data is a byte array that contains the function arguments encoded according to the function's signature.
    function getCallDataLoad(uint256 p) external pure returns (bytes32 data) {
        assembly {
            data := calldataload(p)
        }
    }

    /// size of call data in bytes
    function getCallDataSize() external pure returns (uint256 datasize) {
        assembly {
            datasize := calldatasize()
        }
    }

    /// calldatacopy(t, f, s) - copy `s` bytes from calldata at position `f` to memory at position `t`
    function callDataCopier(uint256 t, uint256 f, uint256 s) external pure returns (bytes32 data) {
        assembly {
            calldatacopy(t, f, s)
            data := mload(t)
        }
    }

    /// chainid() - ID of the executing chain
    function getChainId() external view returns (uint256 chainId) {
        assembly {
            chainId := chainid()
        }
    }

    /// origin() - transaction sender
    function getOrigin() external view returns (address originSender) {
        assembly{
            originSender := origin()
        }
    }

    /// gasprice() - gas price of the transaction
    function getGasPrice() external view returns (uint256 gasPrice) {
        assembly {
            gasPrice := gasprice()
        }
    }

    /// coinbase() - current mining beneficiary
    function getCoinbase() external view returns (address beneficiary) {
        assembly {
            beneficiary := coinbase()
        }
    }

    /// timestamp() - timestamp of the current block in seconds since the epoch
    function getTimestamp() external view returns (uint256 currentTimestamp) {
        assembly {
            currentTimestamp := timestamp()
        }
    }

    /// number() - current block number
    function getCurrentBlockNumber() external view returns (uint256 blockNumber) {
        assembly {
            blockNumber := number()
        }
    }

    /// gaslimit() - block gas limit of the current block
    function getGasLimit() external view returns (uint256 gasLimit) {
        assembly {
            gasLimit := gaslimit()
        }
    }
}

// Filename: test/foundry/ExchangeRateSystemContractMock.t.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import './utils/ExchangeRateUtils.sol';

contract ExchangeRateSystemContractMockTest is ExchangeRateUtils {

    // setUp is executed before each and every test function
    function setUp() public {
        _setUpExchangeRateSystemContractMock();
        _setUpAccounts();
    }

    function test_CanCorrectlyConvertTinycentsToTinybars() public {
        uint256 tinycents = 1e8;
        uint256 tinybars = _doConvertTinycentsToTinybars(tinycents);
        assertEq(tinybars, 1e7, "expected 1 cent to equal 1e7 tinybar(0.1 HBAR) at $0.1/HBAR");
    }

    function test_CanCorrectlyConvertTinybarsToTinyCents() public {
        uint256 tinybars = 1e8;
        uint256 tinycents = _doConvertTinybarsToTinycents(tinybars);
        assertEq(tinycents, 1e9, "expected 1 HBAR to equal 10 cents(1e9 tinycents) at $0.1/HBAR");
    }

}

// forge test --match-contract ExchangeRateSystemContractMockTest -vv
// Filename: test/foundry/HederaFungibleToken.t.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '../../contracts/system-contracts/hedera-token-service/IHederaTokenService.sol';
import '../../contracts/system-contracts/hedera-token-service/KeyHelper.sol';
import './utils/HederaTokenUtils.sol';
import './utils/HederaFungibleTokenUtils.sol';

contract HederaFungibleTokenTest is HederaTokenUtils, HederaFungibleTokenUtils {

    // setUp is executed before each and every test function
    function setUp() public {
        _setUpHtsPrecompileMock();
        _setUpAccounts();
    }

    // positive cases
    function test_CreateHederaFungibleTokenViaHtsPrecompile() public {
        address sender = alice;
        string memory name = 'Token A';
        string memory symbol = 'TA';
        address treasury = alice;
        int64 initialTotalSupply = 1e16;
        int32 decimals = 8;

        _doCreateHederaFungibleTokenViaHtsPrecompile(sender, name, symbol, treasury, initialTotalSupply, decimals);
    }

    function test_CreateHederaFungibleTokenDirectly() public {
        address sender = alice;
        string memory name = 'Token A';
        string memory symbol = 'TA';
        address treasury = alice;
        int64 initialTotalSupply = 1e16;
        int32 decimals = 8;

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);

        _doCreateHederaFungibleTokenDirectly(sender, name, symbol, treasury, initialTotalSupply, decimals, keys);
    }

    function test_ApproveViaHtsPrecompile() public {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);
        address tokenAddress = _createSimpleMockFungibleToken(alice, keys);

        uint allowance = 1e8;
        _doApproveViaHtsPrecompile(alice, tokenAddress, bob, allowance);
    }

    function test_ApproveDirectly() public {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);
        address tokenAddress = _createSimpleMockFungibleToken(alice, keys);

        uint allowance = 1e8;
        _doApproveDirectly(alice, tokenAddress, bob, allowance);
    }

    function test_TransferViaHtsPrecompile() public {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);
        address tokenAddress = _createSimpleMockFungibleToken(alice, keys);

        bool success;
        uint256 amount = 1e8;

        TransferParams memory transferParams = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: amount
        });

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, false, 'expected transfer to fail since recipient is not associated with token');

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, 'expected bob to associate with token');

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, true, 'expected transfer to succeed');
    }

    function test_TransferDirectly() public {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);
        address tokenAddress = _createSimpleMockFungibleToken(alice, keys);

        bool success;
        uint256 amount = 1e8;

        TransferParams memory transferParams = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: amount
        });

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, false, 'expected transfer to fail since recipient is not associated with token');

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, 'expected bob to associate with token');

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, true, 'expected transfer to succeed');
    }

    function test_TransferUsingAllowanceViaHtsPrecompile() public {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);
        address tokenAddress = _createSimpleMockFungibleToken(alice, keys);

        bool success;
        uint256 amount = 1e8;

        TransferParams memory transferParams = TransferParams({
            sender: bob,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: amount
        });

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, false, 'expected transfer to fail since bob is not associated with token');

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, 'expected bob to associate with token');

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, false, 'expected transfer to fail since bob is not granted an allowance');

        uint allowance = 1e8;
        _doApproveViaHtsPrecompile(alice, tokenAddress, bob, allowance);

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, true, 'expected transfer to succeed');
    }

    function test_TransferUsingAllowanceDirectly() public {

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);
        address tokenAddress = _createSimpleMockFungibleToken(alice, keys);

        bool success;
        uint256 amount = 1e8;

        TransferParams memory transferParams = TransferParams({
            sender: bob,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: amount
        });

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, false, 'expected transfer to fail since bob is not associated with token');

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, 'expected bob to associate with token');

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, false, 'expected transfer to fail since bob is not granted an allowance');

        uint allowance = 1e8;
        _doApproveViaHtsPrecompile(alice, tokenAddress, bob, allowance);

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, true, 'expected transfer to succeed');
    }

    /// @dev there is no test_CanMintDirectly as the ERC20 standard does not typically allow direct mints
    function test_CanMintViaHtsPrecompile() public {

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = KeyHelper.getSingleKey(KeyHelper.KeyType.SUPPLY, KeyHelper.KeyValueType.CONTRACT_ID, alice);
        address tokenAddress = _createSimpleMockFungibleToken(alice, keys);

        _doAssociateViaHtsPrecompile(bob, tokenAddress);

        bool success;

        int64 mintAmount = 1e8;

        MintResponse memory mintResponse;
        MintParams memory mintParams;

        mintParams = MintParams({
            sender: bob,
            token: tokenAddress,
            mintAmount: mintAmount
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        assertEq(mintResponse.success, false, "expected mint to fail since bob is not supply key");

        mintParams = MintParams({
            sender: alice,
            token: tokenAddress,
            mintAmount: mintAmount
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        assertEq(mintResponse.success, true, "expected mint to succeed");
    }

    /// @dev there is no test_CanBurnDirectly as the ERC20 standard does not typically allow direct burns
    function test_CanBurnViaHtsPrecompile() public {

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);
        address tokenAddress = _createSimpleMockFungibleToken(alice, keys);

        bool success;

        int64 burnAmount = 1e8;

        BurnParams memory burnParams;

        burnParams = BurnParams({
            sender: bob,
            token: tokenAddress,
            amountOrSerialNumber: burnAmount
        });

        (success, ) = _doBurnViaHtsPrecompile(burnParams);
        assertEq(success, false, "expected burn to fail since bob is not treasury");

        burnParams = BurnParams({
            sender: alice,
            token: tokenAddress,
            amountOrSerialNumber: burnAmount
        });

        (success, ) = _doBurnViaHtsPrecompile(burnParams);
        assertEq(success, true, "expected burn to succeed");
    }

    function test_CanAssociateAndDissociateDirectly() public {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);
        address tokenAddress = _createSimpleMockFungibleToken(alice, keys);

        bool success;
        uint256 amount = 1e8;

        TransferParams memory transferFromAliceToBob = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: amount
        });

        TransferParams memory transferFromBobToAlice = TransferParams({
            sender: bob,
            token: tokenAddress,
            from: bob,
            to: alice,
            amountOrSerialNumber: amount
        });

        (success, ) = _doTransferViaHtsPrecompile(transferFromAliceToBob);
        assertEq(success, false, 'expected transfer to fail since recipient is not associated with token');

        success = _doAssociateDirectly(bob, tokenAddress);
        assertEq(success, true, 'expected bob to associate with token');

        (success, ) = _doTransferViaHtsPrecompile(transferFromAliceToBob);
        assertEq(success, true, 'expected transfer to succeed');

        success = _doDissociateDirectly(bob, tokenAddress);
        assertEq(success, false, 'expected bob to not dissociate with token while postive balance');

        (success, ) = _doTransferViaHtsPrecompile(transferFromBobToAlice);
        assertEq(success, true, 'expected transfer to succeed');

        success = _doDissociateDirectly(bob, tokenAddress);
        assertEq(success, true, 'expected bob to dissociate');
    }

    // negative cases
    function test_CannotApproveIfSpenderNotAssociated() public {
        /// @dev already demonstrated in some of the postive test cases
        // cannot approve spender if spender is not associated with HederaFungibleToken BOTH directly and viaHtsPrecompile
    }

    function test_CannotTransferIfRecipientNotAssociated() public {
        /// @dev already demonstrated in some of the postive test cases
        // cannot transfer to recipient if recipient is not associated with HederaFungibleToken BOTH directly and viaHtsPrecompile
    }

    function test_CannotRepeatedlyAssociateAndDissociateDirectly() public {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);
        address tokenAddress = _createSimpleMockFungibleToken(alice, keys);

        bool success;
        uint256 amount = 1e8;

        TransferParams memory transferFromAliceToBob = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: amount
        });

        TransferParams memory transferFromBobToAlice = TransferParams({
            sender: bob,
            token: tokenAddress,
            from: bob,
            to: alice,
            amountOrSerialNumber: amount
        });

        (success, ) = _doTransferViaHtsPrecompile(transferFromAliceToBob);
        assertEq(success, false, 'expected transfer to fail since recipient is not associated with token');

        success = _doAssociateDirectly(bob, tokenAddress);
        assertEq(success, true, 'expected bob to associate with token');

        success = _doAssociateDirectly(bob, tokenAddress);
        assertEq(success, false, 'expected bob to not re-associate with already associated token');

        (success, ) = _doTransferViaHtsPrecompile(transferFromAliceToBob);
        assertEq(success, true, 'expected transfer to succeed');

        (success, ) = _doTransferViaHtsPrecompile(transferFromBobToAlice);
        assertEq(success, true, 'expected transfer to succeed');

        success = _doDissociateDirectly(bob, tokenAddress);
        assertEq(success, true, 'expected bob to dissociate with token');

        success = _doDissociateDirectly(bob, tokenAddress);
        assertEq(success, false, 'expected bob to not re-dissociate with already unassociated token');

        (success, ) = _doTransferViaHtsPrecompile(transferFromAliceToBob);
        assertEq(success, false, 'expected transfer to fail since bob is not associated');
    }
}

// forge test --match-contract HederaFungibleTokenTest --match-test test_CanBurnViaHtsPrecompile -vv
// forge test --match-contract HederaFungibleTokenTest -vv// Filename: test/foundry/HederaNonFungibleToken.t.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '../../contracts/system-contracts/HederaResponseCodes.sol';
import '../../contracts/system-contracts/hedera-token-service/IHederaTokenService.sol';
import '../../contracts/system-contracts/hedera-token-service/KeyHelper.sol';
import './mocks/hts-precompile/HederaNonFungibleToken.sol';
import './mocks/hts-precompile/HtsSystemContractMock.sol';

import './utils/HederaNonFungibleTokenUtils.sol';
import '../../contracts/libraries/Constants.sol';

contract HederaNonFungibleTokenTest is HederaNonFungibleTokenUtils {

    // setUp is executed before each and every test function
    function setUp() public {
        _setUpHtsPrecompileMock();
        _setUpAccounts();
    }

    // positive cases
    function test_CreateHederaNonFungibleTokenViaHtsPrecompile() public {

        address sender = alice;
        string memory name = 'NFT A';
        string memory symbol = 'NFT-A';
        address treasury = bob;

        bool success;

        (success, ) = _doCreateHederaNonFungibleTokenViaHtsPrecompile(sender, name, symbol, treasury);
        assertEq(success, false, "expected failure since treasury is not sender");

        treasury = alice;

        (success, ) = _doCreateHederaNonFungibleTokenViaHtsPrecompile(sender, name, symbol, treasury);
        assertEq(success, true, "expected success since treasury is sender");

    }

    function test_CreateHederaNonFungibleTokenDirectly() public {

        address sender = alice;
        string memory name = 'NFT A';
        string memory symbol = 'NFT-A';
        address treasury = bob;

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);

        bool success;

        (success, ) = _doCreateHederaNonFungibleTokenDirectly(sender, name, symbol, treasury, keys);
        assertEq(success, false, "expected failure since treasury is not sender");

        treasury = alice;

        (success, ) = _doCreateHederaNonFungibleTokenDirectly(sender, name, symbol, treasury, keys);
        assertEq(success, true, "expected success since treasury is sender");

    }

    function test_ApproveViaHtsPrecompile() public {

        bytes[] memory NULL_BYTES = new bytes[](1);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = KeyHelper.getSingleKey(KeyHelper.KeyType.SUPPLY, KeyHelper.KeyValueType.CONTRACT_ID, alice);
        address tokenAddress = _createSimpleMockNonFungibleToken(alice, keys);

        bool success;

        MintResponse memory mintResponse;
        MintParams memory mintParams;

        mintParams = MintParams({
            sender: bob,
            token: tokenAddress,
            mintAmount: 0
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        assertEq(mintResponse.success, false, "expected failure since bob is not supply key");

        mintParams = MintParams({
            sender: alice,
            token: tokenAddress,
            mintAmount: 0
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        assertEq(mintResponse.success, true, "expected success since alice is supply key");

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, "bob should have associated with token");

        ApproveNftParams memory approveNftParams;

        approveNftParams = ApproveNftParams({
            sender: bob,
            token: tokenAddress,
            spender: carol,
            serialId: mintResponse.serialId
        });

        success = _doApproveNftViaHtsPrecompile(approveNftParams);
        assertEq(success, false, "should have failed as bob does not own NFT with serialId");

        approveNftParams = ApproveNftParams({
            sender: alice,
            token: tokenAddress,
            spender: carol,
            serialId: mintResponse.serialId
        });

        success = _doApproveNftViaHtsPrecompile(approveNftParams);
        assertEq(success, true, "should have succeeded as alice does own NFT with serialId");
    }

    function test_ApproveDirectly() public {

        bytes[] memory NULL_BYTES = new bytes[](1);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = KeyHelper.getSingleKey(KeyHelper.KeyType.SUPPLY, KeyHelper.KeyValueType.CONTRACT_ID, alice);
        address tokenAddress = _createSimpleMockNonFungibleToken(alice, keys);

        bool success;

        MintResponse memory mintResponse;
        MintParams memory mintParams;

        mintParams = MintParams({
            sender: alice,
            token: tokenAddress,
            mintAmount: 0
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        assertEq(mintResponse.success, true, "expected success since alice is supply key");

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, "bob should have associated with token");

        ApproveNftParams memory approveNftParams;

        approveNftParams = ApproveNftParams({
            sender: bob,
            token: tokenAddress,
            spender: carol,
            serialId: mintResponse.serialId
        });

        success = _doApproveNftDirectly(approveNftParams);
        assertEq(success, false, "should have failed as bob does not own NFT with serialId");

        approveNftParams = ApproveNftParams({
            sender: alice,
            token: tokenAddress,
            spender: carol,
            serialId: mintResponse.serialId
        });

        success = _doApproveNftDirectly(approveNftParams);
        assertEq(success, true, "should have succeeded as alice does own NFT with serialId");
    }

    function test_TransferViaHtsPrecompile() public {

        bytes[] memory NULL_BYTES = new bytes[](1);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = KeyHelper.getSingleKey(KeyHelper.KeyType.SUPPLY, KeyHelper.KeyValueType.CONTRACT_ID, alice);
        address tokenAddress = _createSimpleMockNonFungibleToken(alice, keys);

        bool success;
        uint256 serialIdU256;

        MintResponse memory mintResponse;
        MintParams memory mintParams;

        mintParams = MintParams({
            sender: alice,
            token: tokenAddress,
            mintAmount: 0
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        serialIdU256 = uint64(mintResponse.serialId);

        assertEq(mintResponse.success, true, "expected success since alice is supply key");

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, "bob should have associated with token");

        TransferParams memory transferParams;

        transferParams = TransferParams({
            sender: bob,
            token: tokenAddress,
            from: alice,
            to: carol,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, false, 'expected fail since bob does not own nft or have approval');

        transferParams = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: carol,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, false, 'expected fail since carol is not associated with nft');

        transferParams = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, true, 'expected success');
    }

    function test_TransferDirectly() public {

        bytes[] memory NULL_BYTES = new bytes[](1);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = KeyHelper.getSingleKey(KeyHelper.KeyType.SUPPLY, KeyHelper.KeyValueType.CONTRACT_ID, alice);
        address tokenAddress = _createSimpleMockNonFungibleToken(alice, keys);

        bool success;
        uint256 serialIdU256;

        MintResponse memory mintResponse;
        MintParams memory mintParams;

        mintParams = MintParams({
            sender: alice,
            token: tokenAddress,
            mintAmount: 0
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        serialIdU256 = uint64(mintResponse.serialId);

        assertEq(mintResponse.success, true, "expected success since alice is supply key");

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, "bob should have associated with token");

        TransferParams memory transferParams;

        transferParams = TransferParams({
            sender: bob,
            token: tokenAddress,
            from: alice,
            to: carol,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, false, 'expected fail since bob does not own nft or have approval');

        transferParams = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: carol,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, false, 'expected fail since carol is not associated with nft');

        transferParams = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, true, 'expected success');
    }

    function test_TransferUsingAllowanceViaHtsPrecompile() public {

        bytes[] memory NULL_BYTES = new bytes[](1);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = KeyHelper.getSingleKey(KeyHelper.KeyType.SUPPLY, KeyHelper.KeyValueType.CONTRACT_ID, alice);
        address tokenAddress = _createSimpleMockNonFungibleToken(alice, keys);

        bool success;
        uint256 serialIdU256;

        MintResponse memory mintResponse;
        MintParams memory mintParams;

        TransferParams memory transferParams;

        ApproveNftParams memory approveNftParams;

        mintParams = MintParams({
            sender: alice,
            token: tokenAddress,
            mintAmount: 0
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        serialIdU256 = uint64(mintResponse.serialId);

        assertEq(mintResponse.success, true, "expected success since alice is supply key");

        transferParams = TransferParams({
            sender: carol,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, false, 'expected fail since carol is not approved');

        approveNftParams = ApproveNftParams({
            sender: alice,
            token: tokenAddress,
            spender: carol,
            serialId: mintResponse.serialId
        });

        _doApproveNftDirectly(approveNftParams);

        transferParams = TransferParams({
            sender: carol,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, false, 'expected fail since bob is not associated with nft');

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, "bob should have associated with token");

        transferParams = TransferParams({
            sender: carol,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, true, 'expected success');
    }

    function test_TransferUsingAllowanceDirectly() public {

        bytes[] memory NULL_BYTES = new bytes[](1);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = KeyHelper.getSingleKey(KeyHelper.KeyType.SUPPLY, KeyHelper.KeyValueType.CONTRACT_ID, alice);
        address tokenAddress = _createSimpleMockNonFungibleToken(alice, keys);

        bool success;
        uint256 serialIdU256;

        MintResponse memory mintResponse;
        MintParams memory mintParams;

        TransferParams memory transferParams;

        ApproveNftParams memory approveNftParams;

        mintParams = MintParams({
            sender: alice,
            token: tokenAddress,
            mintAmount: 0
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        serialIdU256 = uint64(mintResponse.serialId);

        assertEq(mintResponse.success, true, "expected success since alice is supply key");

        transferParams = TransferParams({
            sender: carol,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferViaHtsPrecompile(transferParams);
        assertEq(success, false, 'expected fail since carol is not approved');

        approveNftParams = ApproveNftParams({
            sender: alice,
            token: tokenAddress,
            spender: carol,
            serialId: mintResponse.serialId
        });

        _doApproveNftDirectly(approveNftParams);

        transferParams = TransferParams({
            sender: carol,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, false, 'expected fail since bob is not associated with nft');

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, "bob should have associated with token");

        transferParams = TransferParams({
            sender: carol,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, true, 'expected success');
    }

    /// @dev there is no test_CanBurnDirectly as the ERC20 standard does not typically allow direct burns
    function test_CanBurnViaHtsPrecompile() public {

        bytes[] memory NULL_BYTES = new bytes[](1);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = KeyHelper.getSingleKey(KeyHelper.KeyType.SUPPLY, KeyHelper.KeyValueType.CONTRACT_ID, alice);
        address tokenAddress = _createSimpleMockNonFungibleToken(alice, keys);

        bool success;
        uint256 serialIdU256;

        MintResponse memory mintResponse;
        MintParams memory mintParams;
        BurnParams memory burnParams;

        mintParams = MintParams({
            sender: alice,
            token: tokenAddress,
            mintAmount: 0
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        serialIdU256 = uint64(mintResponse.serialId);

        assertEq(mintResponse.success, true, "expected success since alice is supply key");

        success = _doAssociateViaHtsPrecompile(bob, tokenAddress);
        assertEq(success, true, "bob should have associated with token");

        TransferParams memory transferParams;

        transferParams = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, true, 'expected success');

        burnParams = BurnParams({
            sender: alice,
            token: tokenAddress,
            amountOrSerialNumber: mintResponse.serialId
        });

        (success, ) = _doBurnViaHtsPrecompile(burnParams);
        assertEq(success, false, "burn should fail, since treasury does not own nft");

        transferParams = TransferParams({
            sender: bob,
            token: tokenAddress,
            from: bob,
            to: alice,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferDirectly(transferParams);
        assertEq(success, true, 'expected success');

        burnParams = BurnParams({
            sender: alice,
            token: tokenAddress,
            amountOrSerialNumber: mintResponse.serialId
        });

        (success, ) = _doBurnViaHtsPrecompile(burnParams);
        assertEq(success, true, "burn should succeed");
    }

    function test_CanAssociateAndDissociateDirectly() public {

        bytes[] memory NULL_BYTES = new bytes[](1);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = KeyHelper.getSingleKey(KeyHelper.KeyType.SUPPLY, KeyHelper.KeyValueType.CONTRACT_ID, alice);
        address tokenAddress = _createSimpleMockNonFungibleToken(alice, keys);

        bool success;
        uint256 serialIdU256;

        MintResponse memory mintResponse;
        MintParams memory mintParams;
        BurnParams memory burnParams;

        mintParams = MintParams({
            sender: alice,
            token: tokenAddress,
            mintAmount: 0
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        serialIdU256 = uint64(mintResponse.serialId);

        assertEq(mintResponse.success, true, "expected success since alice is supply key");

        success = _doAssociateDirectly(bob, tokenAddress);
        assertEq(success, true, 'expected bob to associate with token');

        TransferParams memory transferFromAliceToBob;
        TransferParams memory transferFromBobToAlice;

        transferFromAliceToBob = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        transferFromBobToAlice = TransferParams({
            sender: bob,
            token: tokenAddress,
            from: bob,
            to: alice,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferDirectly(transferFromAliceToBob);
        assertEq(success, true, 'expected success');

        success = _doDissociateDirectly(bob, tokenAddress);
        assertEq(success, false, 'expected bob to not dissociate with token while postive balance');

        (success, ) = _doTransferDirectly(transferFromBobToAlice);
        assertEq(success, true, 'expected transfer to succeed');

        success = _doDissociateDirectly(bob, tokenAddress);
        assertEq(success, true, 'expected bob to dissociate');

    }

    // negative cases
    function test_CannotApproveIfSpenderNotAssociated() public {
        /// @dev already demonstrated in some of the postive test cases
        // cannot approve spender if spender is not associated with HederaNonFungibleToken BOTH directly and viaHtsPrecompile
    }

    function test_CannotTransferIfRecipientNotAssociated() public {
        /// @dev already demonstrated in some of the postive test cases
        // cannot transfer to recipient if recipient is not associated with HederaNonFungibleToken BOTH directly and viaHtsPrecompile
    }

    function test_CannotRepeatedlyAssociateAndDissociateDirectly() public {
        bytes[] memory NULL_BYTES = new bytes[](1);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = KeyHelper.getSingleKey(KeyHelper.KeyType.SUPPLY, KeyHelper.KeyValueType.CONTRACT_ID, alice);
        address tokenAddress = _createSimpleMockNonFungibleToken(alice, keys);

        bool success;
        uint256 serialIdU256;

        MintResponse memory mintResponse;
        MintParams memory mintParams;
        BurnParams memory burnParams;

        mintParams = MintParams({
            sender: alice,
            token: tokenAddress,
            mintAmount: 0
        });

        mintResponse = _doMintViaHtsPrecompile(mintParams);
        serialIdU256 = uint64(mintResponse.serialId);

        assertEq(mintResponse.success, true, "expected success since alice is supply key");

        TransferParams memory transferFromAliceToBob;
        TransferParams memory transferFromBobToAlice;

        transferFromAliceToBob = TransferParams({
            sender: alice,
            token: tokenAddress,
            from: alice,
            to: bob,
            amountOrSerialNumber: serialIdU256
        });

        transferFromBobToAlice = TransferParams({
            sender: bob,
            token: tokenAddress,
            from: bob,
            to: alice,
            amountOrSerialNumber: serialIdU256
        });

        (success, ) = _doTransferDirectly(transferFromAliceToBob);
        assertEq(success, false, 'expected transfer to fail since recipient is not associated with token');

        success = _doAssociateDirectly(bob, tokenAddress);
        assertEq(success, true, 'expected bob to associate with token');

        success = _doAssociateDirectly(bob, tokenAddress);
        assertEq(success, false, 'expected bob to not re-associate with already associated token');

        (success, ) = _doTransferDirectly(transferFromAliceToBob);
        assertEq(success, true, 'expected transfer to succeed');

        (success, ) = _doTransferDirectly(transferFromBobToAlice);
        assertEq(success, true, 'expected transfer to succeed');

        success = _doDissociateDirectly(bob, tokenAddress);
        assertEq(success, true, 'expected bob to dissociate with token');

        success = _doDissociateDirectly(bob, tokenAddress);
        assertEq(success, false, 'expected bob to not re-dissociate with already unassociated token');

        (success, ) = _doTransferDirectly(transferFromAliceToBob);
        assertEq(success, false, 'expected transfer to fail since bob is not associated');
    }
}

// forge test --match-contract HederaNonFungibleTokenTest --match-test test_TransferUsingAllowanceDirectly -vv
// forge test --match-contract HederaNonFungibleTokenTest -vv// Filename: test/foundry/PRNGSytemContractMockMock.t.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import './utils/UtilUtils.sol';

contract PRNGSytemContractMockTest is UtilUtils {

    mapping(bytes32 => bool) private seeds; // use mapping over list as it's much faster to index

    // setUp is executed before each and every test function
    function setUp() public {
        _setUpPRNGSytemContractMock();
        _setUpAccounts();
    }

    function test_CallPseudoRandomSeed() public {

        uint256 iterations = 10000;

        address sender = alice;
        bytes32 seed;

        for (uint256 i = 0; i < iterations; i++) {
            seed = _doCallPseudorandomSeed(sender);

            if (seeds[seed]) {
                revert("seed already exists");
            }

            seeds[seed] = true;

            sender = _getAccount(uint256(seed) % NUM_OF_ACCOUNTS);
        }
    }

}

// forge test --match-contract PRNGSytemContractMockTest -vv
// Filename: test/foundry/mocks/exchange-rate-system-contract/ExchangeRateSystemContractMock.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '../../../../contracts/system-contracts/exchange-rate/IExchangeRate.sol';

contract ExchangeRateSystemContractMock is IExchangeRate {

    // 1e8 tinybars = 1 HBAR
    // 1e8 tinycents = 1 cent = 0.01 USD

    // HBAR/USD rate in tinybars/tinycents
    uint256 private rate; // 1e8 / 10; // Initial rate of 1e8 tinybars/10 tinycents, equivalent to $0.10/1 HBAR
    /// @dev it appears that contracts that are etched do NOT have any starting state i.e. all state is initialised to the default
    ///      hence "rate" is not initialised to 1e7 here, but updateRate is called after the ExchangeRateSystemContractMock is etched(using vm.etch) onto the EXCHANGE_RATE_PRECOMPILE address

    function tinycentsToTinybars(uint256 tinycents) external override returns (uint256) {
        require(rate > 0, "Rate must be greater than 0");
        return (tinycents * rate) / 1e8;
    }

    function tinybarsToTinycents(uint256 tinybars) external override returns (uint256) {
        require(rate > 0, "Rate must be greater than 0");
        return (tinybars * 1e8) / rate;
        // (1e8 * 1e8) / (1e8 / 12) = (12*1e8) tinycents
    }

    function updateRate(uint256 newRate) external {
        require(newRate > 0, "New rate must be greater than 0");
        rate = newRate;
    }

    function getCurrentRate() external view returns (uint256) {
        return rate;
    }
}// Filename: test/foundry/mocks/hts-precompile/HederaFungibleToken.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

import '../../../../contracts/system-contracts/HederaResponseCodes.sol';
import '../../../../contracts/system-contracts/hedera-token-service/IHederaTokenService.sol';
import '../../../../contracts/system-contracts/hedera-token-service/IHRC719.sol';
import './HtsSystemContractMock.sol';
import '../../../../contracts/libraries/Constants.sol';

contract HederaFungibleToken is IHRC719, ERC20, Constants {
    error HtsPrecompileError(int64 responseCode);
    HtsSystemContractMock internal constant HtsPrecompile = HtsSystemContractMock(HTS_PRECOMPILE);

    bool public constant IS_FUNGIBLE = true; /// @dev if HederaNonFungibleToken then false
    uint8 internal immutable _decimals;

    constructor(
        IHederaTokenService.FungibleTokenInfo memory _fungibleTokenInfo
    ) ERC20(_fungibleTokenInfo.tokenInfo.token.name, _fungibleTokenInfo.tokenInfo.token.symbol) {
        HtsPrecompile.registerHederaFungibleToken(msg.sender, _fungibleTokenInfo);
        _decimals = uint8(uint32(_fungibleTokenInfo.decimals));
        address treasury = _fungibleTokenInfo.tokenInfo.token.treasury;
        _mint(treasury, uint(uint64(_fungibleTokenInfo.tokenInfo.totalSupply)));
    }

    /// @dev the HtsSystemContractMock should do precheck validation before calling any function with this modifier
    ///      the HtsSystemContractMock has priveleged access to do certain operations
    modifier onlyHtsPrecompile() {
        require(msg.sender == HTS_PRECOMPILE, 'NOT_HTS_PRECOMPILE');
        _;
    }

    // public/external state-changing functions:
    // onlyHtsPrecompile functions:
    /// @dev mints "amount" to treasury
    function mintRequestFromHtsPrecompile(int64 amount) external onlyHtsPrecompile {
        (, IHederaTokenService.FungibleTokenInfo memory fungibleTokenInfo) = HtsPrecompile.getFungibleTokenInfo(
            address(this)
        );
        address treasury = fungibleTokenInfo.tokenInfo.token.treasury;
        _mint(treasury, uint64(amount));
    }

    /// @dev burns "amount" from treasury
    function burnRequestFromHtsPrecompile(int64 amount) external onlyHtsPrecompile {
        (, IHederaTokenService.FungibleTokenInfo memory fungibleTokenInfo) = HtsPrecompile.getFungibleTokenInfo(
            address(this)
        );
        address treasury = fungibleTokenInfo.tokenInfo.token.treasury;
        _burn(treasury, uint64(amount));
    }

    function wipeRequestFromHtsPrecompile(address account, int64 amount) external onlyHtsPrecompile {
        _burn(account, uint64(amount));
    }

    /// @dev transfers "amount" from "from" to "to"
    function transferRequestFromHtsPrecompile(bool isRequestFromOwner, address spender, address from, address to, uint256 amount) external onlyHtsPrecompile returns (int64 responseCode) {
        if (!isRequestFromOwner) {
            _spendAllowance(from, spender, amount);
        }
        _transfer(from, to, amount);

        return HederaResponseCodes.SUCCESS;
    }

    /// @dev gives "spender" an allowance of "amount" for "account"
    function approveRequestFromHtsPrecompile(
        address account,
        address spender,
        uint256 amount
    ) external onlyHtsPrecompile {
        _approve(account, spender, amount);
    }

    // standard ERC20 functions overriden for HtsSystemContractMock prechecks:
    function approve(address spender, uint256 amount) public override returns (bool) {
        int64 responseCode = HtsPrecompile.preApprove(msg.sender, spender, amount);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HtsPrecompileError(responseCode);
        }
        return super.approve(spender, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        int64 responseCode = HtsPrecompile.preTransfer(msg.sender, from, to, amount);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HtsPrecompileError(responseCode);
        }
        return super.transferFrom(from, to, amount);
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        int64 responseCode = HtsPrecompile.preTransfer(ADDRESS_ZERO, msg.sender, to, amount);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HtsPrecompileError(responseCode);
        }
        return super.transfer(to, amount);
    }

    // standard ERC20 overriden functions
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // IHRC719 setters:

    function associate() external returns (uint256 responseCode) {
        responseCode = uint64(HtsPrecompile.preAssociate(msg.sender));
    }

    function dissociate() external returns (uint256 responseCode) {
        responseCode = uint64(HtsPrecompile.preDissociate(msg.sender));
    }

    function isAssociated() external view returns (bool associated) {
        associated = HtsPrecompile.preIsAssociated(msg.sender);
    }
    
    // IHRC719 getters:

    function isAssociated(address evmAddress) external view returns (bool) {
        return HtsPrecompile.isAssociated(evmAddress, address(this));
    }
}
// Filename: test/foundry/mocks/hts-precompile/HederaNonFungibleToken.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

import '../../../../contracts/system-contracts/HederaResponseCodes.sol';
import '../../../../contracts/system-contracts/hedera-token-service/IHederaTokenService.sol';
import '../../../../contracts/system-contracts/hedera-token-service/IHRC719.sol';
import './HtsSystemContractMock.sol';
import '../../../../contracts/libraries/Constants.sol';

contract HederaNonFungibleToken is IHRC719, ERC721, Constants {
    error HtsPrecompileError(int64 responseCode);

    HtsSystemContractMock internal constant HtsPrecompile = HtsSystemContractMock(HTS_PRECOMPILE);

    bool public constant IS_FUNGIBLE = false; /// @dev if HederaFungibleToken then true

    struct NFTCounter {
        int64 minted;
        int64 burned;
    }

    NFTCounter internal nftCount;

    /// @dev NonFungibleTokenInfo is for each NFT(with a unique serial number) that is minted; however TokenInfo covers the common token info across all instances
    constructor(
        IHederaTokenService.TokenInfo memory _nftTokenInfo
    ) ERC721(_nftTokenInfo.token.name, _nftTokenInfo.token.symbol) {
        address sender = msg.sender;
        HtsPrecompile.registerHederaNonFungibleToken(sender, _nftTokenInfo);
    }

    /// @dev the HtsSystemContractMock should do precheck validation before calling any function with this modifier
    ///      the HtsSystemContractMock has priveleged access to do certain operations
    modifier onlyHtsPrecompile() {
        require(msg.sender == HTS_PRECOMPILE, 'NOT_HTS_PRECOMPILE');
        _;
    }

    // public/external state-changing functions:
    // onlyHtsPrecompile functions:
    function mintRequestFromHtsPrecompile(
        bytes[] memory metadata
    ) external onlyHtsPrecompile returns (int64 newTotalSupply, int64 serialNumber) {
        (, IHederaTokenService.TokenInfo memory nftTokenInfo) = HtsPrecompile.getTokenInfo(
            address(this)
        );
        address treasury = nftTokenInfo.token.treasury;

        serialNumber = ++nftCount.minted; // the first nft that is minted has serialNumber: 1
        _mint(treasury, uint64(serialNumber));

        newTotalSupply = int64(int256(totalSupply()));
    }

    function burnRequestFromHtsPrecompile(
        int64[] calldata tokenIds
    ) public onlyHtsPrecompile returns (int64 newTotalSupply) {
        int64 burnCount = int64(uint64(tokenIds.length));
        nftCount.burned = nftCount.burned + burnCount;

        for (uint256 i = 0; i < uint64(burnCount); i++) {
            uint256 tokenId = uint64(tokenIds[i]);
            _burn(tokenId);
        }

        newTotalSupply = int64(int256(totalSupply()));
    }

    function wipeRequestFromHtsPrecompile(
        int64[] calldata tokenIds
    ) external onlyHtsPrecompile {
        burnRequestFromHtsPrecompile(tokenIds); // implementation happens to coincide with burnRequestFromHtsPrecompile unlike in HederaFungibleToken
    }

    /// @dev transfers "amount" from "from" to "to"
    function transferRequestFromHtsPrecompile(
        bool isRequestFromOwner,
        address spender,
        address from,
        address to,
        uint256 tokenId
    ) external onlyHtsPrecompile returns (int64 responseCode) {
        bool isSpenderApproved = _isAuthorized(from, spender, tokenId);
        if (!isSpenderApproved) {
            return HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE;
        }

        _transfer(from, to, tokenId);
        responseCode = HederaResponseCodes.SUCCESS;
    }

    /// @dev unlike fungible/ERC20 tokens this only allows for a single spender to be approved at any one time
    /// @notice The `auth` argument is optional. If the value passed is non 0, then this function will check that `auth` is
    ///         either the owner of the token, or approved to operate on all tokens held by this owner.
    ///         https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/token/ERC721/ERC721.sol#L400
    function approveRequestFromHtsPrecompile(address spender, int64 tokenId, address auth) external onlyHtsPrecompile {
        _approve(spender, uint64(tokenId), auth);
    }

    function setApprovalForAllFromHtsPrecompile(
        address owner,
        address operator,
        bool approved
    ) external onlyHtsPrecompile {
        _setApprovalForAll(owner, operator, approved);
    }

    // standard ERC721 functions overriden for HtsSystemContractMock prechecks:
    function approve(address to, uint256 tokenId) public override {
        address sender = msg.sender;
        address spender = to;
        int64 responseCode = HtsPrecompile.preApprove(sender, spender, tokenId);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HtsPrecompileError(responseCode);
        }

        // TODO: do checks on approval prior to calling approval to avoid reverting with the OpenZeppelin error strings
        // this checks can be done in the HtsPrecompile.pre{Action} functions and ultimately in the _precheck{Action} internal functions
        return super.approve(to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) public override {
        address sender = msg.sender;
        int64 responseCode = HtsPrecompile.preSetApprovalForAll(sender, operator, approved);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HtsPrecompileError(responseCode);
        }
        return super.setApprovalForAll(operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        address sender = msg.sender;
        int64 responseCode = HtsPrecompile.preTransfer(sender, from, to, tokenId);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HtsPrecompileError(responseCode);
        }
        return super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        address sender = msg.sender;
        int64 responseCode = HtsPrecompile.preTransfer(sender, from, to, tokenId);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HtsPrecompileError(responseCode);
        }
        return super.safeTransferFrom(from, to, tokenId, data);
    }

    // Additional(not in IHederaTokenService or in IERC721) public/external view functions:
    function totalSupply() public view returns (uint256) {
        return uint64(nftCount.minted - nftCount.burned);
    }

    function isApprovedOrOwner(address owner, address spender, uint256 tokenId) external view returns (bool) {
        return _isAuthorized(owner, spender, tokenId);
    }

    function mintCount() external view returns (int64 minted) {
        minted = nftCount.minted;
    }

    function burnCount() external view returns (int64 burned) {
        burned = nftCount.burned;
    }

    // IHRC719 setters:

    function associate() external returns (uint256 responseCode) {
        responseCode = uint64(HtsPrecompile.preAssociate(msg.sender));
    }

    function dissociate() external returns (uint256 responseCode) {
        responseCode = uint64(HtsPrecompile.preDissociate(msg.sender));
    }

    function isAssociated() external view returns (bool associated) {
        associated = HtsPrecompile.preIsAssociated(msg.sender);
    }

    // IHRC719 getters:

    function isAssociated(address evmAddress) external view returns (bool) {
        return HtsPrecompile.isAssociated(evmAddress, address(this));
    }

}
// Filename: test/foundry/mocks/hts-precompile/HtsSystemContractMock.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '../../../../contracts/system-contracts/HederaResponseCodes.sol';
import '../../../../contracts/system-contracts/hedera-token-service/KeyHelper.sol';
import './HederaFungibleToken.sol';
import './HederaNonFungibleToken.sol';
import '../../../../contracts/base/NoDelegateCall.sol';
import '../../../../contracts/libraries/Constants.sol';

import '../interfaces/IHtsSystemContractMock.sol';
import '../libraries/HederaTokenValidation.sol';

contract HtsSystemContractMock is NoDelegateCall, KeyHelper, IHtsSystemContractMock {

    error HtsPrecompileError(int64 responseCode);

    /// @dev only for Fungible tokens
    // Fungible token -> FungibleTokenInfo
    mapping(address => FungibleTokenInfo) internal _fungibleTokenInfos;
    // Fungible token -> _isFungible
    mapping(address => bool) internal _isFungible;

    /// @dev only for NonFungibleToken
    // NFT token -> TokenInfo; TokenInfo is used instead of NonFungibleTokenInfo as the former is common to all NFT instances whereas the latter is for a specific NFT instance(uniquely identified by its serialNumber)
    mapping(address => TokenInfo) internal _nftTokenInfos;
    // NFT token -> serialNumber -> PartialNonFungibleTokenInfo
    mapping(address => mapping(int64 => PartialNonFungibleTokenInfo)) internal _partialNonFungibleTokenInfos;
    // NFT token -> _isNonFungible
    mapping(address => bool) internal _isNonFungible;

    /// @dev common to both NFT and Fungible HTS tokens
    // HTS token -> account -> isAssociated
    mapping(address => mapping(address => bool)) internal _association;
    // HTS token -> account -> isKyced
    mapping(address => mapping(address => TokenConfig)) internal _kyc; // is KYCed is the positive case(i.e. explicitly requires KYC approval); see defaultKycStatus
    // HTS token -> account -> isFrozen
    mapping(address => mapping(address => TokenConfig)) internal _unfrozen; // is unfrozen is positive case(i.e. explicitly requires being unfrozen); see freezeDefault
    // HTS token -> keyType -> key address(contractId) e.g. tokenId -> 16 -> 0x123 means that the SUPPLY key for tokenId is account 0x123
    mapping(address => mapping(uint => address)) internal _tokenKeys; /// @dev faster access then getting keys via {FungibleTokenInfo|NonFungibleTokenInfo}#TokenInfo.HederaToken.tokenKeys[]; however only supports KeyValueType.CONTRACT_ID
    // HTS token -> deleted
    mapping(address => bool) internal _tokenDeleted;
    // HTS token -> paused
    mapping(address => TokenConfig) internal _tokenPaused;

    // - - - - - - EVENTS - - - - - -

    // emitted for convenience of having the token address accessible in a Hardhat environment
    event TokenCreated(address indexed token);

    constructor() NoDelegateCall(HTS_PRECOMPILE) {}

    // peripheral internal helpers:
    // Concatenate metadata bytes arrays
    function _concatenate(bytes[] memory metadata) internal pure returns (bytes memory) {
        // Calculate the total length of concatenated bytes
        uint totalLength = 0;
        for (uint i = 0; i < metadata.length; i++) {
            totalLength += metadata[i].length;
        }

        // Create a new bytes variable with the total length
        bytes memory result = new bytes(totalLength);

        // Concatenate bytes from metadata array into result
        uint currentIndex = 0;
        for (uint i = 0; i < metadata.length; i++) {
            for (uint j = 0; j < metadata[i].length; j++) {
                result[currentIndex] = metadata[i][j];
                currentIndex++;
            }
        }

        return result;
    }

    modifier onlyHederaToken() {
        require(_isToken(msg.sender), 'NOT_HEDERA_TOKEN');
        _;
    }

    // Check if the address is a token
    function _isToken(address token) internal view returns (bool) {
        return _isFungible[token] || _isNonFungible[token];
    }

    /// @dev Hedera appears to have phased out authorization from the EOA with https://github.com/hashgraph/hedera-services/releases/tag/v0.36.0
    function _isAccountOriginOrSender(address account) internal view returns (bool) {
        return _isAccountOrigin(account) || _isAccountSender(account);
    }

    function _isAccountOrigin(address account) internal view returns (bool) {
        return account == tx.origin;
    }

    function _isAccountSender(address account) internal view returns (bool) {
        return account == msg.sender;
    }

    // Get the treasury account for a token
    function _getTreasuryAccount(address token) internal view returns (address treasury) {
        if (_isFungible[token]) {
            treasury = _fungibleTokenInfos[token].tokenInfo.token.treasury;
        } else {
            treasury = _nftTokenInfos[token].token.treasury;
        }
    }

    // Check if the treasury signature is valid
    function _hasTreasurySig(address token) internal view returns (bool validKey, bool noKey) {
        address key = _getTreasuryAccount(token);
        noKey = key == ADDRESS_ZERO;
        validKey = _isAccountSender(key);
    }

    // Check if the admin key signature is valid
    function _hasAdminKeySig(address token) internal view returns (bool validKey, bool noKey) {
        address key = _getKey(token, KeyHelper.KeyType.ADMIN);
        noKey = key == ADDRESS_ZERO;
        validKey = _isAccountSender(key);
    }

    // Check if the kyc key signature is valid
    function _hasKycKeySig(address token) internal view returns (bool validKey, bool noKey) {
        address key = _getKey(token, KeyHelper.KeyType.KYC);
        noKey = key == ADDRESS_ZERO;
        validKey = _isAccountSender(key);
    }

    // Check if the freeze key signature is valid
    function _hasFreezeKeySig(address token) internal view returns (bool validKey, bool noKey) {
        address key = _getKey(token, KeyHelper.KeyType.FREEZE);
        noKey = key == ADDRESS_ZERO;
        validKey = _isAccountSender(key);
    }

    // Check if the wipe key signature is valid
    function _hasWipeKeySig(address token) internal view returns (bool validKey, bool noKey) {
        address key = _getKey(token, KeyHelper.KeyType.WIPE);
        noKey = key == ADDRESS_ZERO;
        validKey = _isAccountSender(key);
    }

    // Check if the supply key signature is valid
    function _hasSupplyKeySig(address token) internal view returns (bool validKey, bool noKey) {
        address key = _getKey(token, KeyHelper.KeyType.SUPPLY);
        noKey = key == ADDRESS_ZERO;
        validKey = _isAccountSender(key);
    }

    // Check if the fee schedule key signature is valid
    function _hasFeeScheduleKeySig(address token) internal view returns (bool validKey, bool noKey) {
        address key = _getKey(token, KeyHelper.KeyType.FEE);
        noKey = key == ADDRESS_ZERO;
        validKey = _isAccountSender(key);
    }

    // Check if the pause key signature is valid
    function _hasPauseKeySig(address token) internal view returns (bool validKey, bool noKey) {
        address key = _getKey(token, KeyHelper.KeyType.PAUSE);
        noKey = key == ADDRESS_ZERO;
        validKey = _isAccountSender(key);
    }

    function _setFungibleTokenInfoToken(address token, HederaToken memory hederaToken) internal {
        _fungibleTokenInfos[token].tokenInfo.token.name = hederaToken.name;
        _fungibleTokenInfos[token].tokenInfo.token.symbol = hederaToken.symbol;
        _fungibleTokenInfos[token].tokenInfo.token.treasury = hederaToken.treasury;
        _fungibleTokenInfos[token].tokenInfo.token.memo = hederaToken.memo;
        _fungibleTokenInfos[token].tokenInfo.token.tokenSupplyType = hederaToken.tokenSupplyType;
        _fungibleTokenInfos[token].tokenInfo.token.maxSupply = hederaToken.maxSupply;
        _fungibleTokenInfos[token].tokenInfo.token.freezeDefault = hederaToken.freezeDefault;
    }

    function _setFungibleTokenExpiry(address token, Expiry memory expiryInfo) internal {
        _fungibleTokenInfos[token].tokenInfo.token.expiry.second = expiryInfo.second;
        _fungibleTokenInfos[token].tokenInfo.token.expiry.autoRenewAccount = expiryInfo.autoRenewAccount;
        _fungibleTokenInfos[token].tokenInfo.token.expiry.autoRenewPeriod = expiryInfo.autoRenewPeriod;
    }

    function _setFungibleTokenInfo(address token, TokenInfo memory tokenInfo) internal {
        _fungibleTokenInfos[token].tokenInfo.totalSupply = tokenInfo.totalSupply;
        _fungibleTokenInfos[token].tokenInfo.deleted = tokenInfo.deleted;
        _fungibleTokenInfos[token].tokenInfo.defaultKycStatus = tokenInfo.defaultKycStatus;
        _fungibleTokenInfos[token].tokenInfo.pauseStatus = tokenInfo.pauseStatus;
        _fungibleTokenInfos[token].tokenInfo.ledgerId = tokenInfo.ledgerId;

        // TODO: Handle copying of other arrays (fixedFees, fractionalFees, and royaltyFees) if needed
    }

    function _setFungibleTokenKeys(address token, TokenKey[] memory tokenKeys) internal {

        // Copy the tokenKeys array
        uint256 length = tokenKeys.length;
        for (uint256 i = 0; i < length; i++) {
            TokenKey memory tokenKey = tokenKeys[i];
            _fungibleTokenInfos[token].tokenInfo.token.tokenKeys.push(tokenKey);

            /// @dev contractId can in fact be any address including an EOA address
            ///      The KeyHelper lists 5 types for KeyValueType; however only CONTRACT_ID is considered
            _tokenKeys[token][tokenKey.keyType] = tokenKey.key.contractId;
        }

    }

    function _setFungibleTokenInfo(FungibleTokenInfo memory fungibleTokenInfo) internal returns (address treasury) {
        address tokenAddress = msg.sender;
        treasury = fungibleTokenInfo.tokenInfo.token.treasury;

        _setFungibleTokenInfoToken(tokenAddress, fungibleTokenInfo.tokenInfo.token);
        _setFungibleTokenExpiry(tokenAddress, fungibleTokenInfo.tokenInfo.token.expiry);
        _setFungibleTokenKeys(tokenAddress, fungibleTokenInfo.tokenInfo.token.tokenKeys);
        _setFungibleTokenInfo(tokenAddress, fungibleTokenInfo.tokenInfo);

        _fungibleTokenInfos[tokenAddress].decimals = fungibleTokenInfo.decimals;
    }

    function _setNftTokenInfoToken(address token, HederaToken memory hederaToken) internal {
        _nftTokenInfos[token].token.name = hederaToken.name;
        _nftTokenInfos[token].token.symbol = hederaToken.symbol;
        _nftTokenInfos[token].token.treasury = hederaToken.treasury;
        _nftTokenInfos[token].token.memo = hederaToken.memo;
        _nftTokenInfos[token].token.tokenSupplyType = hederaToken.tokenSupplyType;
        _nftTokenInfos[token].token.maxSupply = hederaToken.maxSupply;
        _nftTokenInfos[token].token.freezeDefault = hederaToken.freezeDefault;
    }

    function _setNftTokenExpiry(address token, Expiry memory expiryInfo) internal {
        _nftTokenInfos[token].token.expiry.second = expiryInfo.second;
        _nftTokenInfos[token].token.expiry.autoRenewAccount = expiryInfo.autoRenewAccount;
        _nftTokenInfos[token].token.expiry.autoRenewPeriod = expiryInfo.autoRenewPeriod;
    }


    function _setNftTokenInfo(address token, TokenInfo memory nftTokenInfo) internal {
        _nftTokenInfos[token].totalSupply = nftTokenInfo.totalSupply;
        _nftTokenInfos[token].deleted = nftTokenInfo.deleted;
        _nftTokenInfos[token].defaultKycStatus = nftTokenInfo.defaultKycStatus;
        _nftTokenInfos[token].pauseStatus = nftTokenInfo.pauseStatus;
        _nftTokenInfos[token].ledgerId = nftTokenInfo.ledgerId;

        // TODO: Handle copying of other arrays (fixedFees, fractionalFees, and royaltyFees) if needed
    }

    function _setNftTokenKeys(address token, TokenKey[] memory tokenKeys) internal {
        // Copy the tokenKeys array
        uint256 length = tokenKeys.length;
        for (uint256 i = 0; i < length; i++) {
            TokenKey memory tokenKey = tokenKeys[i];
            _nftTokenInfos[token].token.tokenKeys.push(tokenKey);

            /// @dev contractId can in fact be any address including an EOA address
            ///      The KeyHelper lists 5 types for KeyValueType; however only CONTRACT_ID is considered
            _tokenKeys[token][tokenKey.keyType] = tokenKey.key.contractId;
        }
    }

    function _setNftTokenInfo(TokenInfo memory nftTokenInfo) internal returns (address treasury) {
        address tokenAddress = msg.sender;
        treasury = nftTokenInfo.token.treasury;

        _setNftTokenInfoToken(tokenAddress, nftTokenInfo.token);
        _setNftTokenKeys(tokenAddress, nftTokenInfo.token.tokenKeys);
        _setNftTokenExpiry(tokenAddress, nftTokenInfo.token.expiry);
        _setNftTokenInfo(tokenAddress, nftTokenInfo);
    }

    // TODO: implement _post{Action} "internal" functions called inside and at the end of the pre{Action} functions is success == true
    // for getters implement _get{Data} "view internal" functions that have the exact same name as the HTS getter function name that is called after the precheck

    function _precheckCreateToken(
        address sender,
        HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals
    ) internal view returns (int64 responseCode) {
        bool validTreasurySig = sender == token.treasury;

        // if admin key is specified require admin sig
        KeyValue memory key = _getTokenKey(token.tokenKeys, _getKeyTypeValue(KeyHelper.KeyType.ADMIN));

        if (key.contractId != ADDRESS_ZERO) {
            if (sender != key.contractId) {
                return HederaResponseCodes.INVALID_ADMIN_KEY;
            }
        }

        for (uint256 i = 0; i < token.tokenKeys.length; i++) {
            TokenKey memory tokenKey = token.tokenKeys[i];

            if (tokenKey.key.contractId != ADDRESS_ZERO) {
                bool accountExists = _doesAccountExist(tokenKey.key.contractId);

                if (!accountExists) {

                    if (tokenKey.keyType == 1) { // KeyType.ADMIN
                        return HederaResponseCodes.INVALID_ADMIN_KEY;
                    }

                    if (tokenKey.keyType == 2) { // KeyType.KYC
                        return HederaResponseCodes.INVALID_KYC_KEY;
                    }

                    if (tokenKey.keyType == 4) { // KeyType.FREEZE
                        return HederaResponseCodes.INVALID_FREEZE_KEY;
                    }

                    if (tokenKey.keyType == 8) { // KeyType.WIPE
                        return HederaResponseCodes.INVALID_WIPE_KEY;
                    }

                    if (tokenKey.keyType == 16) { // KeyType.SUPPLY
                        return HederaResponseCodes.INVALID_SUPPLY_KEY;
                    }

                    if (tokenKey.keyType == 32) { // KeyType.FEE
                        return HederaResponseCodes.INVALID_CUSTOM_FEE_SCHEDULE_KEY;
                    }

                    if (tokenKey.keyType == 64) { // KeyType.PAUSE
                        return HederaResponseCodes.INVALID_PAUSE_KEY;
                    }
                }
            }
        }

        // TODO: add additional validation on token; validation most likely required on only tokenKeys(if an address(contract/EOA) has a zero-balance then consider the tokenKey invalid since active accounts on Hedera must have a positive HBAR balance)
        if (!validTreasurySig) {
            return HederaResponseCodes.AUTHORIZATION_FAILED;
        }

        if (decimals < 0 || decimals > 18) {
            return HederaResponseCodes.INVALID_TOKEN_DECIMALS;
        }

        if (initialTotalSupply < 0) {
            return HederaResponseCodes.INVALID_TOKEN_INITIAL_SUPPLY;
        }

        uint256 tokenNameLength = _getStringLength(token.name);
        uint256 tokenSymbolLength = _getStringLength(token.symbol);

        if (tokenNameLength == 0) {
            return HederaResponseCodes.MISSING_TOKEN_NAME;
        }

        // TODO: investigate correctness of max length conditionals
        // solidity strings use UTF-8 encoding, Hedera restricts the name and symbol to 100 bytes
        // in ASCII that is 100 characters
        // however in UTF-8 it is 100/4 = 25 UT-8 characters
        if (tokenNameLength > 100) {
            return HederaResponseCodes.TOKEN_NAME_TOO_LONG;
        }

        if (tokenSymbolLength == 0) {
            return HederaResponseCodes.MISSING_TOKEN_SYMBOL;
        }

        if (tokenSymbolLength > 100) {
            return HederaResponseCodes.TOKEN_SYMBOL_TOO_LONG;
        }

        return HederaResponseCodes.SUCCESS;
    }

    function _precheckDeleteToken(address sender, address token) internal view returns (bool success, int64 responseCode) {

        /// @dev success is initialised to true such that the sequence of any of the validation functions below can be easily rearranged
        ///      the rearrangement of the functions may be done to more closely align the response codes with the actual response codes returned by Hedera
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (bool validKey, bool noKey) = _hasAdminKeySig(token);
        (success, responseCode) = success ? HederaTokenValidation._validateAdminKey(validKey, noKey) : (success, responseCode);
    }

    /// @dev handles precheck logic for both freeze and unfreeze
    function _precheckFreezeToken(address sender, address token, address account) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (bool validKey, bool noKey) = _hasFreezeKeySig(token);
        (success, responseCode) = success ? HederaTokenValidation._validateFreezeKey(validKey, noKey) : (success, responseCode);
    }

    /// @dev handles precheck logic for both pause and unpause
    function _precheckPauseToken(address sender, address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (bool validKey, bool noKey) = _hasPauseKeySig(token);
        (success, responseCode) = success ? HederaTokenValidation._validatePauseKey(validKey, noKey) : (success, responseCode);
    }

    /// @dev handles precheck logic for both kyc grant and revoke
    function _precheckKyc(address sender, address token, address account) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? _validateKycKey(token) : (success, responseCode);
    }

    function _precheckUpdateTokenExpiryInfo(address sender, address token, Expiry memory expiryInfo) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? _validateAdminKey(token) : (success, responseCode);
        // TODO: validate expiryInfo; move validation into common HederaTokenValidation contract that exposes validation functions
    }

    function _precheckUpdateTokenInfo(address sender, address token, HederaToken memory tokenInfo) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? _validateAdminKey(token) : (success, responseCode);
        // TODO: validate tokenInfo; move validation into common HederaTokenValidation contract that exposes validation functions
    }

    function _precheckUpdateTokenKeys(address sender, address token, TokenKey[] memory keys) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? _validateAdminKey(token) : (success, responseCode);
        // TODO: validate keys; move validation into common HederaTokenValidation contract that exposes validation functions
    }

    function _validateAdminKey(address token) internal view returns (bool success, int64 responseCode) {
        (bool validKey, bool noKey) = _hasAdminKeySig(token);
        (success, responseCode) = HederaTokenValidation._validateAdminKey(validKey, noKey);
    }

    function _validateKycKey(address token) internal view returns (bool success, int64 responseCode) {
        (bool validKey, bool noKey) = _hasKycKeySig(token);
        (success, responseCode) = HederaTokenValidation._validateKycKey(validKey, noKey);
    }

    function _validateSupplyKey(address token) internal view returns (bool success, int64 responseCode) {
        (bool validKey, bool noKey) = _hasSupplyKeySig(token);
        (success, responseCode) = HederaTokenValidation._validateSupplyKey(validKey, noKey);
    }

    function _validateFreezeKey(address token) internal view returns (bool success, int64 responseCode) {
        (bool validKey, bool noKey) = _hasFreezeKeySig(token);
        (success, responseCode) = HederaTokenValidation._validateFreezeKey(validKey, noKey);
    }

    function _validateTreasuryKey(address token) internal view returns (bool success, int64 responseCode) {
        (bool validKey, bool noKey) = _hasTreasurySig(token);
        (success, responseCode) = HederaTokenValidation._validateTreasuryKey(validKey, noKey);
    }

    function _validateWipeKey(address token) internal view returns (bool success, int64 responseCode) {
        (bool validKey, bool noKey) = _hasWipeKeySig(token);
        (success, responseCode) = HederaTokenValidation._validateWipeKey(validKey, noKey);
    }

    function _validateAccountKyc(address token, address account) internal view returns (bool success, int64 responseCode) {
        bool isKyced;
        (responseCode, isKyced) = isKyc(token, account);
        success = _doesAccountPassKyc(responseCode, isKyced);
        (success, responseCode) = HederaTokenValidation._validateAccountKyc(success);
    }

    function _validateAccountUnfrozen(address token, address account) internal view returns (bool success, int64 responseCode) {
        bool isAccountFrozen;
        (responseCode, isAccountFrozen) = isFrozen(token, account);
        success = _doesAccountPassUnfrozen(responseCode, isAccountFrozen);
        (success, responseCode) = success ? HederaTokenValidation._validateAccountFrozen(success) : (success, responseCode);
    }

    /// @dev the following internal _precheck functions are called in either of the following 2 scenarios:
    ///      1. before the HtsSystemContractMock calls any of the HederaFungibleToken or HederaNonFungibleToken functions that specify the onlyHtsPrecompile modifier
    ///      2. in any of HtsSystemContractMock functions that specifies the onlyHederaToken modifier which is only callable by a HederaFungibleToken or HederaNonFungibleToken contract

    /// @dev for both Fungible and NonFungible
    function _precheckApprove(
        address token,
        address sender, // sender should be owner in order to approve
        address spender,
        uint256 amountOrSerialNumber /// for Fungible is the amount and for NonFungible is the serialNumber
    ) internal view returns (bool success, int64 responseCode) {

        success = true;

        /// @dev Hedera does not require an account to be associated with a token in be approved an allowance
        // if (!_association[token][owner] || !_association[token][spender]) {
        //     return HederaResponseCodes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT;
        // }

        (success, responseCode) = success ? _validateAccountKyc(token, sender) : (success, responseCode);
        (success, responseCode) = success ? _validateAccountKyc(token, spender) : (success, responseCode);

        (success, responseCode) = success ? _validateAccountUnfrozen(token, sender) : (success, responseCode);
        (success, responseCode) = success ? _validateAccountUnfrozen(token, spender) : (success, responseCode);

        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? HederaTokenValidation._validateNftOwnership(token, sender, amountOrSerialNumber, _isNonFungible, _partialNonFungibleTokenInfos) : (success, responseCode);
    }

    function _precheckSetApprovalForAll(
        address token,
        address owner,
        address operator,
        bool approved
    ) internal view returns (bool success, int64 responseCode) {

        success = true;

        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);

        (success, responseCode) = success ? HederaTokenValidation._validateTokenAssociation(token, owner, _association) : (success, responseCode);
        (success, responseCode) = success ? HederaTokenValidation._validateTokenAssociation(token, operator, _association) : (success, responseCode);

        (success, responseCode) = success ? _validateAccountKyc(token, owner) : (success, responseCode);
        (success, responseCode) = success ? _validateAccountKyc(token, operator) : (success, responseCode);

        (success, responseCode) = success ? _validateAccountUnfrozen(token, owner) : (success, responseCode);
        (success, responseCode) = success ? _validateAccountUnfrozen(token, operator) : (success, responseCode);

        (success, responseCode) = success ? HederaTokenValidation._validateIsNonFungible(token, _isNonFungible) : (success, responseCode);
    }

    function _precheckMint(
        address token,
        int64 amount,
        bytes[] memory metadata
    ) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? _validateSupplyKey(token) : (success, responseCode);
    }

    // TODO: implement multiple NFTs being burnt instead of just index 0
    function _precheckBurn(
        address token,
        int64 amount,
        int64[] memory serialNumbers // since only 1 NFT can be burnt at a time; expect length to be 1
    ) internal view returns (bool success, int64 responseCode) {
        success = true;

        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? _validateTreasuryKey(token) : (success, responseCode);
        (success, responseCode) = success ? HederaTokenValidation._validateTokenSufficiency(token, _getTreasuryAccount(token), amount, serialNumbers[0], _isFungible, _isNonFungible, _partialNonFungibleTokenInfos) : (success, responseCode);
    }

    // TODO: implement multiple NFTs being wiped, instead of just index 0
    function _precheckWipe(
        address sender,
        address token,
        address account,
        int64 amount,
        int64[] memory serialNumbers // since only 1 NFT can be wiped at a time; expect length to be 1
    ) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? HederaTokenValidation._validBurnInput(token, _isFungible, _isNonFungible, amount, serialNumbers) : (success, responseCode);
        (success, responseCode) = success ? _validateWipeKey(token) : (success, responseCode);
        (success, responseCode) = success ? HederaTokenValidation._validateTokenSufficiency(token, account, amount, serialNumbers[0], _isFungible, _isNonFungible, _partialNonFungibleTokenInfos) : (success, responseCode);
    }

    function _precheckGetApproved(
        address token,
        uint256 serialNumber
    ) internal view returns (bool success, int64 responseCode) {
        // TODO: do additional validation that serialNumber exists and is not burnt
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
    }

    function _precheckGetFungibleTokenInfo(address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? HederaTokenValidation._validateIsFungible(token, _isFungible) : (success, responseCode);
    }

    function _precheckGetNonFungibleTokenInfo(address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? HederaTokenValidation._validateIsNonFungible(token, _isNonFungible) : (success, responseCode);
    }

    function _precheckGetTokenCustomFees(address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
    }

    function _precheckGetTokenDefaultFreezeStatus(address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
    }

    function _precheckGetTokenDefaultKycStatus(address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
    }

    function _precheckGetTokenExpiryInfo(address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
    }

    function _precheckGetTokenInfo(address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
    }

    function _precheckGetTokenKey(address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
    }

    function _precheckGetTokenType(address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
    }

    function _precheckIsFrozen(address token, address account) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? _validateFreezeKey(token) : (success, responseCode);
    }

    function _precheckIsKyc(address token, address account) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? _validateKycKey(token) : (success, responseCode);
    }

    function _precheckAllowance(
        address token,
        address owner,
        address spender
    ) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
    }

    function _precheckAssociateToken(address account, address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);

        // TODO: consider extending HederaTokenValidation#_validateTokenAssociation with TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT
        if (success) {
            if (_association[token][account]) {
                return (false, HederaResponseCodes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT);
            }
        }

    }

    function _precheckDissociateToken(address account, address token) internal view returns (bool success, int64 responseCode) {
        success = true;
        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);
        (success, responseCode) = success ? HederaTokenValidation._validateTokenAssociation(token, account, _association) : (success, responseCode);
        (success, responseCode) = success ? HederaTokenValidation._validateTokenDissociation(token, account, _association, _isFungible, _isNonFungible) : (success, responseCode);
    }

    /// @dev doesPassKyc if KYC is not enabled or if enabled then account is KYCed explicitly or by default
    function _doesAccountPassKyc(int64 responseCode, bool isKyced) internal pure returns (bool doesPassKyc) {
        doesPassKyc = responseCode == HederaResponseCodes.SUCCESS ? isKyced : true;
    }

    /// @dev doesPassUnfrozen if freeze is not enabled or if enabled then account is unfrozen explicitly or by default
    function _doesAccountPassUnfrozen(int64 responseCode, bool isFrozen) internal pure returns (bool doesPassUnfrozen) {
        doesPassUnfrozen = responseCode == HederaResponseCodes.SUCCESS ? !isFrozen : true;
    }

    function _precheckTransfer(
        address token,
        address spender,
        address from,
        address to,
        uint256 amountOrSerialNumber
    ) internal view returns (bool success, int64 responseCode, bool isRequestFromOwner) {

        success = true;

        (success, responseCode) = success ? HederaTokenValidation._validateToken(token, _tokenDeleted, _isFungible, _isNonFungible) : (success, responseCode);

        (success, responseCode) = success ? HederaTokenValidation._validateTokenAssociation(token, from, _association) : (success, responseCode);
        (success, responseCode) = success ? HederaTokenValidation._validateTokenAssociation(token, to, _association) : (success, responseCode);

        (success, responseCode) = success ? _validateAccountKyc(token, spender) : (success, responseCode);
        (success, responseCode) = success ? _validateAccountKyc(token, from) : (success, responseCode);
        (success, responseCode) = success ? _validateAccountKyc(token, to) : (success, responseCode);

        (success, responseCode) = success ? _validateAccountUnfrozen(token, spender) : (success, responseCode);
        (success, responseCode) = success ? _validateAccountUnfrozen(token, from) : (success, responseCode);
        (success, responseCode) = success ? _validateAccountUnfrozen(token, to) : (success, responseCode);

        // If transfer request is not from owner then check allowance of msg.sender
        bool shouldAssumeRequestFromOwner = spender == ADDRESS_ZERO;
        isRequestFromOwner = _isAccountSender(from) || shouldAssumeRequestFromOwner;

        (success, responseCode) = success ? HederaTokenValidation._validateTokenSufficiency(token, from, amountOrSerialNumber, amountOrSerialNumber, _isFungible, _isNonFungible, _partialNonFungibleTokenInfos) : (success, responseCode);

        if (isRequestFromOwner || !success) {
            return (success, responseCode, isRequestFromOwner);
        }

        (success, responseCode) = success ? HederaTokenValidation._validateApprovalSufficiency(token, spender, from, amountOrSerialNumber, _isFungible, _isNonFungible) : (success, responseCode);

        return (success, responseCode, isRequestFromOwner);
    }

    function _postTransfer(
        address token,
        address spender,
        address from,
        address to,
        uint256 amountOrSerialNumber
    ) internal {
        if (_isNonFungible[token]) {
            int64 serialNumber = int64(uint64(amountOrSerialNumber));
            _partialNonFungibleTokenInfos[token][serialNumber].ownerId = to;
            delete _partialNonFungibleTokenInfos[token][serialNumber].spenderId;
        }
    }

    function _postAssociate(
        address token,
        address sender
    ) internal {
        _association[token][sender] = true;
    }

    function _postDissociate(
        address token,
        address sender
    ) internal {
        _association[token][sender] = false;
    }

    function _postIsAssociated(
        address token,
        address sender
    ) internal view returns (bool associated) {
        associated = _association[token][sender];
    }

    function _postApprove(
        address token,
        address sender,
        address spender,
        uint256 amountOrSerialNumber
    ) internal {
        if (_isNonFungible[token]) {
            int64 serialNumber = int64(uint64(amountOrSerialNumber));
            _partialNonFungibleTokenInfos[token][serialNumber].spenderId = spender;
        }
    }

    function _postMint(
        address token,
        int64 amountOrSerialNumber,
        bytes[] memory metadata
    ) internal {
        if (_isNonFungible[token]) {
            _partialNonFungibleTokenInfos[token][amountOrSerialNumber] = PartialNonFungibleTokenInfo({
                ownerId: _getTreasuryAccount(token),
                creationTime: int64(int(block.timestamp)),
                metadata: _concatenate(metadata),
                spenderId: ADDRESS_ZERO
            });
        }
    }

    function _postBurn(
        address token,
        int64 amount,
        int64[] memory serialNumbers
    ) internal {
        if (_isNonFungible[token]) {
            int64 serialNumber;
            uint burnCount = serialNumbers.length;
            for (uint256 i = 0; i < burnCount; i++) {
                serialNumber = serialNumbers[i];
                delete _partialNonFungibleTokenInfos[token][serialNumber].ownerId;
                delete _partialNonFungibleTokenInfos[token][serialNumber].spenderId;

                // TODO: remove the break statement below once multiple NFT burns are enabled in a single call
                break; // only delete the info at index 0 since only 1 NFT is burnt at a time
            }
        }
    }

    function preAssociate(
        address sender // msg.sender in the context of the Hedera{Non|}FungibleToken; it should be owner for SUCCESS
    ) external onlyHederaToken returns (int64 responseCode) {
        address token = msg.sender;
        bool success;
        (success, responseCode) = _precheckAssociateToken(sender, token);
        if (success) {
            _postAssociate(token, sender);
        }
    }

    function preIsAssociated(
        address sender // msg.sender in the context of the Hedera{Non|}FungibleToken; it should be owner for SUCCESS
    ) external view onlyHederaToken returns (bool associated) {
        address token = msg.sender;
        int64 responseCode;
        bool success;
        (success, responseCode) = _precheckAssociateToken(sender, token);
        if (success) {
            associated = _postIsAssociated(token, sender);
        }
    }

    function preDissociate(
        address sender // msg.sender in the context of the Hedera{Non|}FungibleToken; it should be owner for SUCCESS
    ) external onlyHederaToken returns (int64 responseCode) {
        address token = msg.sender;
        bool success;
        (success, responseCode) = _precheckDissociateToken(sender, token);
        if (success) {
            _postDissociate(token, sender);
        }
    }

    function preApprove(
        address sender, // msg.sender in the context of the Hedera{Non|}FungibleToken; it should be owner for SUCCESS
        address spender,
        uint256 amountOrSerialNumber /// for Fungible is the amount and for NonFungible is the serialNumber
    ) external onlyHederaToken returns (int64 responseCode) {
        address token = msg.sender;
        bool success;
        (success, responseCode) = _precheckApprove(token, sender, spender, amountOrSerialNumber);
        if (success) {
            _postApprove(token, sender, spender, amountOrSerialNumber);
        }
    }

    function preSetApprovalForAll(
        address sender, // msg.sender in the context of the Hedera{Non|}FungibleToken; it should be owner for SUCCESS
        address operator,
        bool approved
    ) external onlyHederaToken returns (int64 responseCode) {
        address token = msg.sender;
        bool success;
        (success, responseCode) = _precheckSetApprovalForAll(token, sender, operator, approved);
    }

    /// @dev not currently called by Hedera{}Token
    function preMint(
        address token,
        int64 amount,
        bytes[] memory metadata
    ) external onlyHederaToken returns (int64 responseCode) {
        address token = msg.sender;
        bool success;
        (success, responseCode) = _precheckMint(token, amount, metadata);

        if (success) {

            int64 amountOrSerialNumber;

            if (_isFungible[token]) {
                amountOrSerialNumber = amount;
            } else {
                amountOrSerialNumber = HederaNonFungibleToken(token).mintCount() + 1;
            }

            _postMint(token, amountOrSerialNumber, metadata);
        }
    }

    /// @dev not currently called by Hedera{}Token
    function preBurn(int64 amount, int64[] memory serialNumbers) external onlyHederaToken returns (int64 responseCode) {
        address token = msg.sender;
        bool success;
        (success, responseCode) = _precheckBurn(token, amount, serialNumbers);

        if (success) {
            _postBurn(token, amount, serialNumbers);
        }
    }

    function preTransfer(
        address spender, /// @dev if spender == ADDRESS_ZERO then assume ERC20#transfer(i.e. msg.sender is attempting to spend their balance) otherwise ERC20#transferFrom(i.e. msg.sender is attempting to spend balance of "from" using allowance)
        address from,
        address to,
        uint256 amountOrSerialNumber
    ) external onlyHederaToken returns (int64 responseCode) {
        address token = msg.sender;
        bool success;
        (success, responseCode, ) = _precheckTransfer(token, spender, from, to, amountOrSerialNumber);
        if (success) {
            _postTransfer(token, spender, from, to, amountOrSerialNumber);
        }
    }

    /// @dev register HederaFungibleToken; msg.sender is the HederaFungibleToken
    ///      can be called by any contract; however assumes msg.sender is a HederaFungibleToken
    function registerHederaFungibleToken(address caller, FungibleTokenInfo memory fungibleTokenInfo) external {

        /// @dev if caller is this contract(i.e. the HtsSystemContractMock) then no need to call _precheckCreateToken since it was already called when the createFungibleToken or other relevant method was called
        bool doPrecheck = caller != address(this);

        int64 responseCode = doPrecheck ? _precheckCreateToken(caller, fungibleTokenInfo.tokenInfo.token, fungibleTokenInfo.tokenInfo.totalSupply, fungibleTokenInfo.decimals) : HederaResponseCodes.SUCCESS;

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert("PRECHECK_FAILED"); // TODO: revert with custom error that includes response code
        }

        address tokenAddress = msg.sender;
        _isFungible[tokenAddress] = true;
        address treasury = _setFungibleTokenInfo(fungibleTokenInfo);
        associateToken(treasury, tokenAddress);
    }

    /// @dev register HederaNonFungibleToken; msg.sender is the HederaNonFungibleToken
    ///      can be called by any contract; however assumes msg.sender is a HederaNonFungibleToken
    function registerHederaNonFungibleToken(address caller, TokenInfo memory nftTokenInfo) external {

        /// @dev if caller is this contract(i.e. the HtsSystemContractMock) then no need to call _precheckCreateToken since it was already called when the createNonFungibleToken or other relevant method was called
        bool doPrecheck = caller != address(this);

        int64 responseCode = doPrecheck ? _precheckCreateToken(caller, nftTokenInfo.token, 0, 0) : HederaResponseCodes.SUCCESS;

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert("PRECHECK_FAILED"); // TODO: revert with custom error that includes response code
        }

        address tokenAddress = msg.sender;
        _isNonFungible[tokenAddress] = true;
        address treasury = _setNftTokenInfo(nftTokenInfo);

        associateToken(treasury, tokenAddress);
    }

    // IHederaTokenService public/external view functions:
    function getApproved(
        address token,
        uint256 serialNumber
    ) external view returns (int64 responseCode, address approved) {

        bool success;
        (success, responseCode) = _precheckGetApproved(token, serialNumber);

        if (!success) {
            return (responseCode, approved);
        }

        // TODO: abstract logic into _get{Data} function
        approved = HederaNonFungibleToken(token).getApproved(serialNumber);
    }

    function getFungibleTokenInfo(
        address token
    ) external view returns (int64 responseCode, FungibleTokenInfo memory fungibleTokenInfo) {

        bool success;
        (success, responseCode) = _precheckGetFungibleTokenInfo(token);

        if (!success) {
            return (responseCode, fungibleTokenInfo);
        }

        // TODO: abstract logic into _get{Data} function
        fungibleTokenInfo = _fungibleTokenInfos[token];
    }

    function getNonFungibleTokenInfo(
        address token,
        int64 serialNumber
    ) external view returns (int64 responseCode, NonFungibleTokenInfo memory nonFungibleTokenInfo) {

        bool success;
        (success, responseCode) = _precheckGetNonFungibleTokenInfo(token);

        if (!success) {
            return (responseCode, nonFungibleTokenInfo);
        }

        // TODO: abstract logic into _get{Data} function
        TokenInfo memory nftTokenInfo = _nftTokenInfos[token];
        PartialNonFungibleTokenInfo memory partialNonFungibleTokenInfo = _partialNonFungibleTokenInfos[token][
            serialNumber
        ];

        nonFungibleTokenInfo.tokenInfo = nftTokenInfo;

        nonFungibleTokenInfo.serialNumber = serialNumber;

        nonFungibleTokenInfo.ownerId = partialNonFungibleTokenInfo.ownerId;
        nonFungibleTokenInfo.creationTime = partialNonFungibleTokenInfo.creationTime;
        nonFungibleTokenInfo.metadata = partialNonFungibleTokenInfo.metadata;
        nonFungibleTokenInfo.spenderId = partialNonFungibleTokenInfo.spenderId;
    }

    function getTokenCustomFees(
        address token
    )
        external
        view
        returns (
            int64 responseCode,
            FixedFee[] memory fixedFees,
            FractionalFee[] memory fractionalFees,
            RoyaltyFee[] memory royaltyFees
        )
    {

        bool success;
        (success, responseCode) = _precheckGetTokenCustomFees(token);

        if (!success) {
            return (responseCode, fixedFees, fractionalFees, royaltyFees);
        }

        // TODO: abstract logic into _get{Data} function
        if (_isFungible[token]) {
            fixedFees = _fungibleTokenInfos[token].tokenInfo.fixedFees;
            fractionalFees = _fungibleTokenInfos[token].tokenInfo.fractionalFees;
            royaltyFees = _fungibleTokenInfos[token].tokenInfo.royaltyFees;
        } else {
            fixedFees = _nftTokenInfos[token].fixedFees;
            fractionalFees = _nftTokenInfos[token].fractionalFees;
            royaltyFees = _nftTokenInfos[token].royaltyFees;
        }
    }

    function getTokenDefaultFreezeStatus(
        address token
    ) external view returns (int64 responseCode, bool defaultFreezeStatus) {

        bool success;
        (success, responseCode) = _precheckGetTokenDefaultFreezeStatus(token);

        if (!success) {
            return (responseCode, defaultFreezeStatus);
        }

        // TODO: abstract logic into _get{Data} function
        if (_isFungible[token]) {
            defaultFreezeStatus = _fungibleTokenInfos[token].tokenInfo.token.freezeDefault;
        } else {
            defaultFreezeStatus = _nftTokenInfos[token].token.freezeDefault;
        }
    }

    function getTokenDefaultKycStatus(address token) external view returns (int64 responseCode, bool defaultKycStatus) {

        bool success;
        (success, responseCode) = _precheckGetTokenDefaultKycStatus(token);

        if (!success) {
            return (responseCode, defaultKycStatus);
        }

        // TODO: abstract logic into _get{Data} function
        if (_isFungible[token]) {
            defaultKycStatus = _fungibleTokenInfos[token].tokenInfo.defaultKycStatus;
        } else {
            defaultKycStatus = _nftTokenInfos[token].defaultKycStatus;
        }
    }

    function getTokenExpiryInfo(address token) external view returns (int64 responseCode, Expiry memory expiry) {

        bool success;
        (success, responseCode) = _precheckGetTokenExpiryInfo(token);

        if (!success) {
            return (responseCode, expiry);
        }

        // TODO: abstract logic into _get{Data} function
        if (_isFungible[token]) {
            expiry = _fungibleTokenInfos[token].tokenInfo.token.expiry;
        } else {
            expiry = _nftTokenInfos[token].token.expiry;
        }
    }

    function getTokenInfo(address token) external view returns (int64 responseCode, TokenInfo memory tokenInfo) {

        bool success;
        (success, responseCode) = _precheckGetTokenInfo(token);

        if (!success) {
            return (responseCode, tokenInfo);
        }

        // TODO: abstract logic into _get{Data} function
        if (_isFungible[token]) {
            tokenInfo = _fungibleTokenInfos[token].tokenInfo;
        } else {
            tokenInfo = _nftTokenInfos[token];
        }
    }

    function getTokenKey(address token, uint keyType) external view returns (int64 responseCode, KeyValue memory key) {

        bool success;
        (success, responseCode) = _precheckGetTokenKey(token);

        if (!success) {
            return (responseCode, key);
        }

        // TODO: abstract logic into _get{Data} function
        /// @dev the key can be retrieved using either of the following methods
        // method 1: gas inefficient
        // key = _getTokenKey(_fungibleTokenInfos[token].tokenInfo.token.tokenKeys, keyType);

        // method 2: more gas efficient and works for BOTH token types; however currently only considers contractId
        address keyValue = _tokenKeys[token][keyType];
        key.contractId = keyValue;
    }

    function _getTokenKey(IHederaTokenService.TokenKey[] memory tokenKeys, uint keyType) internal view returns (KeyValue memory key) {
        uint256 length = tokenKeys.length;

        for (uint256 i = 0; i < length; i++) {
            IHederaTokenService.TokenKey memory tokenKey = tokenKeys[i];
            if (tokenKey.keyType == keyType) {
                key = tokenKey.key;
                break;
            }
        }
    }

    function getTokenType(address token) external view returns (int64 responseCode, int32 tokenType) {

        bool success;
        (success, responseCode) = _precheckGetTokenType(token);

        if (!success) {
            return (responseCode, tokenType);
        }

        // TODO: abstract logic into _get{Data} function
        bool isFungibleToken = _isFungible[token];
        bool isNonFungibleToken = _isNonFungible[token];
        tokenType = isFungibleToken ? int32(0) : int32(1);
    }

    function grantTokenKyc(address token, address account) external returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckKyc(msg.sender, token, account);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        _kyc[token][account].explicit = true;
        _kyc[token][account].value = true;
    }

    /// @dev Applicable ONLY to NFT Tokens; accessible via IERC721
    function isApprovedForAll(
        address token,
        address owner,
        address operator
    ) external view returns (int64 responseCode, bool approved) {}

    function isFrozen(address token, address account) public view returns (int64 responseCode, bool frozen) {

        bool success = true;
        (success, responseCode) = _precheckIsFrozen(token, account);

        if (!success) {
            return (responseCode, frozen);
        }

        bool isFungible = _isFungible[token];
        bool isNonFungible = _isNonFungible[token];
        // TODO: abstract logic into _isFrozen function
        bool freezeDefault;
        if (isFungible) {
            FungibleTokenInfo memory fungibleTokenInfo = _fungibleTokenInfos[token];
            freezeDefault = fungibleTokenInfo.tokenInfo.token.freezeDefault;
        } else {
            TokenInfo memory nftTokenInfo = _nftTokenInfos[token];
            freezeDefault = nftTokenInfo.token.freezeDefault;
        }

        TokenConfig memory unfrozenConfig = _unfrozen[token][account];

        /// @dev if unfrozenConfig.explicit is false && freezeDefault is true then an account must explicitly be unfrozen otherwise assume unfrozen
        frozen = unfrozenConfig.explicit ? !(unfrozenConfig.value) : (freezeDefault ? !(unfrozenConfig.value) : false);
    }

    function isKyc(address token, address account) public view returns (int64 responseCode, bool kycGranted) {

        bool success;
        (success, responseCode) = _precheckIsKyc(token, account);

        if (!success) {
            return (responseCode, kycGranted);
        }

        // TODO: abstract logic into _isKyc function
        bool isFungible = _isFungible[token];
        bool isNonFungible = _isNonFungible[token];
        bool defaultKycStatus;
        if (isFungible) {
            FungibleTokenInfo memory fungibleTokenInfo = _fungibleTokenInfos[token];
            defaultKycStatus = fungibleTokenInfo.tokenInfo.defaultKycStatus;
        } else {
            TokenInfo memory nftTokenInfo = _nftTokenInfos[token];
            defaultKycStatus = nftTokenInfo.defaultKycStatus;
        }

        TokenConfig memory kycConfig = _kyc[token][account];

        /// @dev if kycConfig.explicit is false && defaultKycStatus is true then an account must explicitly be KYCed otherwise assume KYCed
        kycGranted = kycConfig.explicit ? kycConfig.value : (defaultKycStatus ? kycConfig.value : true);
    }

    function isToken(address token) public view returns (int64 responseCode, bool isToken) {
        isToken = _isToken(token);
        responseCode = isToken ? HederaResponseCodes.SUCCESS : HederaResponseCodes.INVALID_TOKEN_ID;
    }

    function allowance(
        address token,
        address owner,
        address spender
    ) public view returns (int64 responseCode, uint256 allowance) {

        bool success;
        (success, responseCode) = _precheckAllowance(token, owner, spender);

        if (!success) {
            return (responseCode, allowance);
        }

        // TODO: abstract logic into _allowance function
        allowance = HederaFungibleToken(token).allowance(owner, spender);
    }

    // Additional(not in IHederaTokenService) public/external view functions:
    /// @dev KeyHelper.KeyType is an enum; whereas KeyHelper.keyTypes is a mapping that maps the enum index to a uint256
    /// keyTypes[KeyType.ADMIN] = 1;
    /// keyTypes[KeyType.KYC] = 2;
    /// keyTypes[KeyType.FREEZE] = 4;
    /// keyTypes[KeyType.WIPE] = 8;
    /// keyTypes[KeyType.SUPPLY] = 16;
    /// keyTypes[KeyType.FEE] = 32;
    /// keyTypes[KeyType.PAUSE] = 64;
    /// i.e. the relation is 2^(uint(KeyHelper.KeyType)) = keyType
    function _getKey(address token, KeyHelper.KeyType keyType) internal view returns (address keyOwner) {
        /// @dev the following relation is used due to the below described issue with KeyHelper.getKeyType
        uint _keyType = _getKeyTypeValue(keyType);
        /// @dev the following does not work since the KeyHelper has all of its storage/state cleared/defaulted once vm.etch is used
        ///      to fix this KeyHelper should expose a function that does what it's constructor does i.e. initialise the keyTypes mapping
        // uint _keyType = getKeyType(keyType);
        keyOwner = _tokenKeys[token][_keyType];
    }

    // TODO: move into a common util contract as it's used elsewhere
    function _getKeyTypeValue(KeyHelper.KeyType keyType) internal pure returns (uint256 keyTypeValue) {
        keyTypeValue = 2 ** uint(keyType);
    }

    function _getBalance(address account) internal view returns (uint256 balance) {
        balance = account.balance;
    }

    // TODO: validate account exists wherever applicable; transfers, mints, burns, etc
    // is account(either an EOA or contract) has a non-zero balance then assume it exists
    function _doesAccountExist(address account) internal view returns (bool exists) {
        exists = _getBalance(account) > 0;
    }

    // IHederaTokenService public/external state-changing functions:
    function createFungibleToken(
        HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals
    ) external payable noDelegateCall returns (int64 responseCode, address tokenAddress) {
        responseCode = _precheckCreateToken(msg.sender, token, initialTotalSupply, decimals);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            return (responseCode, ADDRESS_ZERO);
        }

        FungibleTokenInfo memory fungibleTokenInfo;
        TokenInfo memory tokenInfo;

        tokenInfo.token = token;
        tokenInfo.totalSupply = initialTotalSupply;

        fungibleTokenInfo.decimals = decimals;
        fungibleTokenInfo.tokenInfo = tokenInfo;

        /// @dev no need to register newly created HederaFungibleToken in this context as the constructor will call HtsSystemContractMock#registerHederaFungibleToken
        HederaFungibleToken hederaFungibleToken = new HederaFungibleToken(fungibleTokenInfo);
        emit TokenCreated(address(hederaFungibleToken));
        return (HederaResponseCodes.SUCCESS, address(hederaFungibleToken));
    }

    function createNonFungibleToken(
        HederaToken memory token
    ) external payable noDelegateCall returns (int64 responseCode, address tokenAddress) {
        responseCode = _precheckCreateToken(msg.sender, token, 0, 0);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            return (responseCode, ADDRESS_ZERO);
        }

        TokenInfo memory tokenInfo;
        tokenInfo.token = token;

        /// @dev no need to register newly created HederaNonFungibleToken in this context as the constructor will call HtsSystemContractMock#registerHederaNonFungibleToken
        HederaNonFungibleToken hederaNonFungibleToken = new HederaNonFungibleToken(tokenInfo);
        emit TokenCreated(address(hederaNonFungibleToken));
        return (HederaResponseCodes.SUCCESS, address(hederaNonFungibleToken));
    }

    // TODO: implement logic that considers fixedFees, fractionalFees where applicable such as on transfers
    function createFungibleTokenWithCustomFees(
        HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals,
        FixedFee[] memory fixedFees,
        FractionalFee[] memory fractionalFees
    ) external payable noDelegateCall returns (int64 responseCode, address tokenAddress) {
        responseCode = _precheckCreateToken(msg.sender, token, initialTotalSupply, decimals);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            return (responseCode, ADDRESS_ZERO);
        }

        FungibleTokenInfo memory fungibleTokenInfo;
        TokenInfo memory tokenInfo;

        tokenInfo.token = token;
        tokenInfo.totalSupply = initialTotalSupply;
        tokenInfo.fixedFees = fixedFees;
        tokenInfo.fractionalFees = fractionalFees;

        fungibleTokenInfo.decimals = decimals;
        fungibleTokenInfo.tokenInfo = tokenInfo;

        /// @dev no need to register newly created HederaFungibleToken in this context as the constructor will call HtsSystemContractMock#registerHederaFungibleToken
        HederaFungibleToken hederaFungibleToken = new HederaFungibleToken(fungibleTokenInfo);
        emit TokenCreated(address(hederaFungibleToken));
        return (HederaResponseCodes.SUCCESS, address(hederaFungibleToken));
    }

    // TODO: implement logic that considers fixedFees, royaltyFees where applicable such as on transfers
    function createNonFungibleTokenWithCustomFees(
        HederaToken memory token,
        FixedFee[] memory fixedFees,
        RoyaltyFee[] memory royaltyFees
    ) external payable noDelegateCall returns (int64 responseCode, address tokenAddress) {
        responseCode = _precheckCreateToken(msg.sender, token, 0, 0);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            return (responseCode, ADDRESS_ZERO);
        }

        TokenInfo memory tokenInfo;
        tokenInfo.token = token;
        tokenInfo.fixedFees = fixedFees;
        tokenInfo.royaltyFees = royaltyFees;

        /// @dev no need to register newly created HederaNonFungibleToken in this context as the constructor will call HtsSystemContractMock#registerHederaNonFungibleToken
        HederaNonFungibleToken hederaNonFungibleToken = new HederaNonFungibleToken(tokenInfo);
        emit TokenCreated(address(hederaNonFungibleToken));
        return (HederaResponseCodes.SUCCESS, address(hederaNonFungibleToken));
    }

    // TODO
    function cryptoTransfer(
        TransferList memory transferList,
        TokenTransferList[] memory tokenTransfers
    ) external noDelegateCall returns (int64 responseCode) {}

    function deleteToken(address token) external noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckDeleteToken(msg.sender, token);

        if (!success) {
            return responseCode;
        }

        _tokenDeleted[token] = true;
    }

    function approve(
        address token,
        address spender,
        uint256 amount
    ) external noDelegateCall returns (int64 responseCode) {
        address owner = msg.sender;
        bool success;
        (success, responseCode) = _precheckApprove(token, owner, spender, amount); // _precheckApprove works for BOTH token types

        if (!success) {
            return responseCode;
        }

        _postApprove(token, owner, spender, amount);
        HederaFungibleToken(token).approveRequestFromHtsPrecompile(owner, spender, amount);
    }

    function approveNFT(
        address token,
        address approved,
        uint256 serialNumber
    ) external noDelegateCall returns (int64 responseCode) {
        address owner = msg.sender;
        address spender = approved;
        int64 _serialNumber = int64(int(serialNumber));
        bool success;
        (success, responseCode) = _precheckApprove(token, owner, spender, serialNumber); // _precheckApprove works for BOTH token types

        if (!success) {
            return responseCode;
        }

        _postApprove(token, owner, spender, serialNumber);
        HederaNonFungibleToken(token).approveRequestFromHtsPrecompile(spender, _serialNumber, owner);
    }

    function associateToken(address account, address token) public noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckAssociateToken(account, token);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        _association[token][account] = true;
    }

    function associateTokens(
        address account,
        address[] memory tokens
    ) external noDelegateCall returns (int64 responseCode) {
        for (uint256 i = 0; i < tokens.length; i++) {
            responseCode = associateToken(account, tokens[i]);
            if (responseCode != HederaResponseCodes.SUCCESS) {
                return responseCode;
            }
        }
    }

    function dissociateTokens(
        address account,
        address[] memory tokens
    ) external noDelegateCall returns (int64 responseCode) {
        for (uint256 i = 0; i < tokens.length; i++) {
            int64 responseCode = dissociateToken(account, tokens[i]);
            if (responseCode != HederaResponseCodes.SUCCESS) {
                return responseCode;
            }
        }
    }

    function dissociateToken(address account, address token) public noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckDissociateToken(account, token);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        _association[token][account] = false;
    }

    function freezeToken(address token, address account) external noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckFreezeToken(msg.sender, token, account);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        _unfrozen[token][account].explicit = true;
        _unfrozen[token][account].value = false;
    }

    function mintToken(
        address token,
        int64 amount,
        bytes[] memory metadata
    ) external noDelegateCall returns (int64 responseCode, int64 newTotalSupply, int64[] memory serialNumbers) {
        bool success;
        (success, responseCode) = _precheckMint(token, amount, metadata);

        if (!success) {
            return (responseCode, 0, new int64[](0));
        }

        int64 amountOrSerialNumber;

        if (_isFungible[token]) {
            amountOrSerialNumber = amount;
            HederaFungibleToken hederaFungibleToken = HederaFungibleToken(token);
            hederaFungibleToken.mintRequestFromHtsPrecompile(amount);
            newTotalSupply = int64(int(hederaFungibleToken.totalSupply()));
        }

        if (_isNonFungible[token]) {
            serialNumbers = new int64[](1); // since you can only mint 1 NFT at a time
            int64 serialNumber;
            (newTotalSupply, serialNumber) = HederaNonFungibleToken(token).mintRequestFromHtsPrecompile(metadata);
            serialNumbers[0] = serialNumber;
            amountOrSerialNumber = serialNumber;
        }

        _postMint(token, amountOrSerialNumber, metadata);
        return (responseCode, newTotalSupply, serialNumbers);
    }

    function burnToken(
        address token,
        int64 amount,
        int64[] memory serialNumbers
    ) external noDelegateCall returns (int64 responseCode, int64 newTotalSupply) {
        bool success;
        (success, responseCode) = _precheckBurn(token, amount, serialNumbers);

        if (!success) {
            return (responseCode, 0);
        }

        // TODO: abstract logic into _post{Action} function
        if (_isFungible[token]) {
            HederaFungibleToken hederaFungibleToken = HederaFungibleToken(token);
            hederaFungibleToken.burnRequestFromHtsPrecompile(amount);
            newTotalSupply = int64(int(hederaFungibleToken.totalSupply()));
        }

        if (_isNonFungible[token]) { // this conditional is redundant but added for code readibility
            newTotalSupply = HederaNonFungibleToken(token).burnRequestFromHtsPrecompile(serialNumbers);
        }

        _postBurn(token, amount, serialNumbers);
    }

    function pauseToken(address token) external noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckPauseToken(msg.sender, token);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        _tokenPaused[token].explicit = true;
        _tokenPaused[token].value = true;
    }

    function revokeTokenKyc(address token, address account) external noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckKyc(msg.sender, token, account);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        _kyc[token][account].explicit = true;
        _kyc[token][account].value = false;
    }

    function setApprovalForAll(
        address token,
        address operator,
        bool approved
    ) external noDelegateCall returns (int64 responseCode) {
        address owner = msg.sender;
        bool success;
        (success, responseCode) = _precheckSetApprovalForAll(token, owner, operator, approved);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        HederaNonFungibleToken(token).setApprovalForAllFromHtsPrecompile(owner, operator, approved);
    }

    function transferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) external noDelegateCall returns (int64 responseCode) {
        /// @dev spender is set to non-zero address such that shouldAssumeRequestFromOwner always evaluates to false if HtsSystemContractMock#transferFrom is called
        address spender = msg.sender;
        bool isRequestFromOwner;

        bool success;
        (success, responseCode, isRequestFromOwner) = _precheckTransfer(token, spender, from, to, amount);

        if (!success) {
            return responseCode;
        }

        _postTransfer(token, spender, from, to, amount);
        responseCode = HederaFungibleToken(token).transferRequestFromHtsPrecompile(
            isRequestFromOwner,
            spender,
            from,
            to,
            amount
        );
    }

    function transferFromNFT(
        address token,
        address from,
        address to,
        uint256 serialNumber
    ) external noDelegateCall returns (int64 responseCode) {
        address spender = msg.sender;
        bool isRequestFromOwner;

        bool success;
        (success, responseCode, isRequestFromOwner) = _precheckTransfer(token, spender, from, to, serialNumber);

        if (!success) {
            return responseCode;
        }

        _postTransfer(token, spender, from, to, serialNumber);
        HederaNonFungibleToken(token).transferRequestFromHtsPrecompile(
            isRequestFromOwner,
            spender,
            from,
            to,
            serialNumber
        );
    }

    /// TODO implementation is currently identical to transferFromNFT; investigate the differences between the 2 functions
    function transferNFT(
        address token,
        address sender,
        address recipient,
        int64 serialNumber
    ) public noDelegateCall returns (int64 responseCode) {
        address spender = msg.sender;
        uint256 _serialNumber = uint64(serialNumber);
        bool isRequestFromOwner;

        bool success;
        (success, responseCode, isRequestFromOwner) = _precheckTransfer(token, spender, sender, recipient, _serialNumber);

        if (!success) {
            return responseCode;
        }

        _postTransfer(token, spender, sender, recipient, _serialNumber);
        responseCode = HederaNonFungibleToken(token).transferRequestFromHtsPrecompile(
            isRequestFromOwner,
            spender,
            sender,
            recipient,
            _serialNumber
        );
    }

    function transferNFTs(
        address token,
        address[] memory sender,
        address[] memory receiver,
        int64[] memory serialNumber
    ) external noDelegateCall returns (int64 responseCode) {
        uint length = sender.length;
        uint receiverCount = receiver.length;
        uint serialNumberCount = serialNumber.length;

        require(length == receiverCount && length == serialNumberCount, 'UNEQUAL_ARRAYS');

        address _sender;
        address _receiver;
        int64 _serialNumber;

        for (uint256 i = 0; i < length; i++) {
            _sender = sender[i];
            _receiver = receiver[i];
            _serialNumber = serialNumber[i];

            responseCode = transferNFT(token, _sender, _receiver, _serialNumber);

            // TODO: instead of reverting return responseCode; this will require prechecks on each individual transfer before enacting the transfer of all NFTs
            // alternatively consider reverting but catch error and extract responseCode from the error and return the responseCode
            if (responseCode != HederaResponseCodes.SUCCESS) {
                revert HtsPrecompileError(responseCode);
            }
        }
    }

    /// TODO implementation is currently identical to transferFrom; investigate the differences between the 2 functions
    function transferToken(
        address token,
        address sender,
        address recipient,
        int64 amount
    ) public noDelegateCall returns (int64 responseCode) {
        address spender = msg.sender;
        bool isRequestFromOwner;
        uint _amount = uint(int(amount));

        bool success;
        (success, responseCode, isRequestFromOwner) = _precheckTransfer(token, spender, sender, recipient, _amount);

        if (!success) {
            return responseCode;
        }

        _postTransfer(token, spender, sender, recipient, _amount);
        responseCode = HederaFungibleToken(token).transferRequestFromHtsPrecompile(
            isRequestFromOwner,
            spender,
            sender,
            recipient,
            _amount
        );
    }

    function transferTokens(
        address token,
        address[] memory accountId,
        int64[] memory amount
    ) external noDelegateCall returns (int64 responseCode) {
        uint length = accountId.length;
        uint amountCount = amount.length;

        require(length == amountCount, 'UNEQUAL_ARRAYS');

        address spender = msg.sender;
        address receiver;
        int64 _amount;

        for (uint256 i = 0; i < length; i++) {
            receiver = accountId[i];
            _amount = amount[i];

            responseCode = transferToken(token, spender, receiver, _amount);

            // TODO: instead of reverting return responseCode; this will require prechecks on each individual transfer before enacting the transfer of all NFTs
            // alternatively consider reverting but catch error and extract responseCode from the error and return the responseCode
            if (responseCode != HederaResponseCodes.SUCCESS) {
                revert HtsPrecompileError(responseCode);
            }
        }
    }

    function unfreezeToken(address token, address account) external noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckFreezeToken(msg.sender, token, account);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        _unfrozen[token][account].explicit = true;
        _unfrozen[token][account].value = true;
    }

    function unpauseToken(address token) external noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckPauseToken(msg.sender, token);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        _tokenPaused[token].explicit = true;
        _tokenPaused[token].value = false;
    }

    function updateTokenExpiryInfo(
        address token,
        Expiry memory expiryInfo
    ) external noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckUpdateTokenExpiryInfo(msg.sender, token, expiryInfo);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        if (_isFungible[token]) {
            _setFungibleTokenExpiry(token, expiryInfo);
        }

        if (_isNonFungible[token]) {
            _setNftTokenExpiry(token, expiryInfo);
        }
    }

    function updateTokenInfo(
        address token,
        HederaToken memory tokenInfo
    ) external noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckUpdateTokenInfo(msg.sender, token, tokenInfo);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        if (_isFungible[token]) {
            _setFungibleTokenInfoToken(token, tokenInfo);
        }

        if (_isNonFungible[token]) {
            _setNftTokenInfoToken(token, tokenInfo);
        }
    }

    function updateTokenKeys(
        address token,
        TokenKey[] memory keys
    ) external noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckUpdateTokenKeys(msg.sender, token, keys);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        if (_isFungible[token]) {
            _setFungibleTokenKeys(token, keys);
        }

        if (_isNonFungible[token]) {
            _setNftTokenKeys(token, keys);
        }

    }

    function wipeTokenAccount(
        address token,
        address account,
        int64 amount
    ) external noDelegateCall returns (int64 responseCode) {

        int64[] memory nullArray;

        bool success;
        (success, responseCode) = _precheckWipe(msg.sender, token, account, amount, nullArray);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        HederaFungibleToken hederaFungibleToken = HederaFungibleToken(token);
        hederaFungibleToken.wipeRequestFromHtsPrecompile(account, amount);
    }

    function wipeTokenAccountNFT(
        address token,
        address account,
        int64[] memory serialNumbers
    ) external noDelegateCall returns (int64 responseCode) {

        bool success;
        (success, responseCode) = _precheckWipe(msg.sender, token, account, 0, serialNumbers);

        if (!success) {
            return responseCode;
        }

        // TODO: abstract logic into _post{Action} function
        int64 serialNumber;
        uint burnCount = serialNumbers.length;
        for (uint256 i = 0; i < burnCount; i++) {
            serialNumber = serialNumbers[i];
            delete _partialNonFungibleTokenInfos[token][serialNumber].ownerId;
            delete _partialNonFungibleTokenInfos[token][serialNumber].spenderId;
        }
    }

    function updateFungibleTokenCustomFees(address token,  IHederaTokenService.FixedFee[] memory fixedFees, IHederaTokenService.FractionalFee[] memory fractionalFees) external returns (int64 responseCode){}
    function updateNonFungibleTokenCustomFees(address token, IHederaTokenService.FixedFee[] memory fixedFees, IHederaTokenService.RoyaltyFee[] memory royaltyFees) external returns (int64 responseCode){}
    
    // TODO
    function redirectForToken(address token, bytes memory encodedFunctionSelector) external noDelegateCall override returns (int64 responseCode, bytes memory response) {}

    // Additional(not in IHederaTokenService) public/external state-changing functions:
    function isAssociated(address account, address token) external view returns (bool associated) {
        associated = _association[token][account];
    }

    function getTreasuryAccount(address token) external view returns (address treasury) {
        return _getTreasuryAccount(token);
    }

    function _getStringLength(string memory _string) internal pure returns (uint length) {
        length = bytes(_string).length;
    }
}
// Filename: test/foundry/mocks/interfaces/IHRCCommon.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.4.9 <0.9.0;

import "../../../../contracts/system-contracts/hedera-token-service/IHRC719.sol";

interface IERCCommonToken {
    function balanceOf(address account) external view returns (uint256);
}

interface IHRCCommon is IHRC719, IERCCommonToken {
    // NOTE: can be moved into IHRC once implemented https://hips.hedera.com/hip/hip-719
    function isAssociated(address evmAddress) external view returns (bool);
}
// Filename: test/foundry/mocks/interfaces/IHtsSystemContractMock.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '../../../../contracts/system-contracts/hedera-token-service/IHederaTokenService.sol';

interface IHtsSystemContractMock is IHederaTokenService {

    struct TokenConfig {
        bool explicit; // true if it was explicitly set to value
        bool value;
    }

    // this struct avoids duplicating common NFT data, in particular IHederaTokenService.NonFungibleTokenInfo.tokenInfo
    struct PartialNonFungibleTokenInfo {
        address ownerId;
        int64 creationTime;
        bytes metadata;
        address spenderId;
    }
}
// Filename: test/foundry/mocks/libraries/HederaTokenValidation.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '../../../../contracts/system-contracts/HederaResponseCodes.sol';
import '../hts-precompile/HederaFungibleToken.sol';
import '../hts-precompile/HederaNonFungibleToken.sol';
import '../interfaces/IHtsSystemContractMock.sol';

library HederaTokenValidation {

    /// checks if token exists and has not been deleted and returns appropriate response code
    function _validateToken(
        address token,
        mapping(address => bool) storage _tokenDeleted,
        mapping(address => bool) storage _isFungible,
        mapping(address => bool) storage _isNonFungible
    ) internal view returns (bool success, int64 responseCode) {

        if (_tokenDeleted[token]) {
            return (false, HederaResponseCodes.TOKEN_WAS_DELETED);
        }

        if (!_isFungible[token] && !_isNonFungible[token]) {
            return (false, HederaResponseCodes.INVALID_TOKEN_ID);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateIsFungible(
        address token,
        mapping(address => bool) storage _isFungible
    ) internal view returns (bool success, int64 responseCode) {

        if (!_isFungible[token]) {
            return (false, HederaResponseCodes.INVALID_TOKEN_ID);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateIsNonFungible(
        address token,
        mapping(address => bool) storage _isNonFungible
    ) internal view returns (bool success, int64 responseCode) {
        if (!_isNonFungible[token]) {
            return (false, HederaResponseCodes.INVALID_TOKEN_ID);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateAdminKey(bool validKey, bool noKey) internal pure returns (bool success, int64 responseCode) {
        if (noKey) {
            return (false, HederaResponseCodes.TOKEN_IS_IMMUTABLE);
        }

        if (!validKey) {
            return (false, HederaResponseCodes.INVALID_ADMIN_KEY);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateFreezeKey(bool validKey, bool noKey) internal pure returns (bool success, int64 responseCode) {

        if (noKey) {
            return (false, HederaResponseCodes.TOKEN_HAS_NO_FREEZE_KEY);
        }

        if (!validKey) {
            return (false, HederaResponseCodes.INVALID_FREEZE_KEY);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validatePauseKey(bool validKey, bool noKey) internal pure returns (bool success, int64 responseCode) {
        if (noKey) {
            return (false, HederaResponseCodes.TOKEN_HAS_NO_PAUSE_KEY);
        }

        if (!validKey) {
            return (false, HederaResponseCodes.INVALID_PAUSE_KEY);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateKycKey(bool validKey, bool noKey) internal pure returns (bool success, int64 responseCode) {
        if (noKey) {
            return (false, HederaResponseCodes.TOKEN_HAS_NO_KYC_KEY);
        }

        if (!validKey) {
            return (false, HederaResponseCodes.INVALID_KYC_KEY);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateSupplyKey(bool validKey, bool noKey) internal pure returns (bool success, int64 responseCode) {
        if (noKey) {
            return (false, HederaResponseCodes.TOKEN_HAS_NO_SUPPLY_KEY);
        }

        if (!validKey) {
            return (false, HederaResponseCodes.INVALID_SUPPLY_KEY);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateTreasuryKey(bool validKey, bool noKey) internal pure returns (bool success, int64 responseCode) {
        if (noKey) {
            return (false, HederaResponseCodes.AUTHORIZATION_FAILED);
        }

        if (!validKey) {
            return (false, HederaResponseCodes.AUTHORIZATION_FAILED);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateWipeKey(bool validKey, bool noKey) internal pure returns (bool success, int64 responseCode) {
        if (noKey) {
            return (false, HederaResponseCodes.TOKEN_HAS_NO_WIPE_KEY);
        }

        if (!validKey) {
            return (false, HederaResponseCodes.INVALID_WIPE_KEY);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateAccountKyc(bool kycPass) internal pure returns (bool success, int64 responseCode) {

        if (!kycPass) {
            return (false, HederaResponseCodes.ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;

    }

    function _validateAccountFrozen(bool frozenPass) internal pure returns (bool success, int64 responseCode) {

        if (!frozenPass) {
            return (false, HederaResponseCodes.ACCOUNT_FROZEN_FOR_TOKEN);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;

    }

    function _validateNftOwnership(
        address token,
        address expectedOwner,
        uint serialNumber,
        mapping(address => bool) storage _isNonFungible,
        mapping(address => mapping(int64 => IHtsSystemContractMock.PartialNonFungibleTokenInfo)) storage _partialNonFungibleTokenInfos
    ) internal view returns (bool success, int64 responseCode) {
        if (_isNonFungible[token]) {
            int64 _serialNumber = int64(uint64(serialNumber));
            IHtsSystemContractMock.PartialNonFungibleTokenInfo memory partialNonFungibleTokenInfo = _partialNonFungibleTokenInfos[token][_serialNumber];

            if (partialNonFungibleTokenInfo.ownerId != expectedOwner) {
                return (false, HederaResponseCodes.SENDER_DOES_NOT_OWN_NFT_SERIAL_NO);
            }
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateFungibleBalance(
        address token,
        address owner,
        uint amount,
        mapping(address => bool) storage _isFungible
    ) internal view returns (bool success, int64 responseCode) {
        if (_isFungible[token]) {
            HederaFungibleToken hederaFungibleToken = HederaFungibleToken(token);

            bool sufficientBalance = hederaFungibleToken.balanceOf(owner) >= uint64(amount);

            if (!sufficientBalance) {
                return (false, HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE);
            }
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateEmptyFungibleBalance(
        address token,
        address owner,
        mapping(address => bool) storage _isFungible
    ) internal view returns (bool success, int64 responseCode) {
        if (_isFungible[token]) {
            HederaFungibleToken hederaFungibleToken = HederaFungibleToken(token);

            bool emptyBalance = hederaFungibleToken.balanceOf(owner) == 0;

            if (!emptyBalance) {
                return (false, HederaResponseCodes.TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES);
            }
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateEmptyNonFungibleBalance(
        address token,
        address owner,
        mapping(address => bool) storage _isNonFungible
    ) internal view returns (bool success, int64 responseCode) {
        if (_isNonFungible[token]) {
            HederaNonFungibleToken hederaNonFungibleToken = HederaNonFungibleToken(token);

            bool emptyBalance = hederaNonFungibleToken.balanceOf(owner) == 0;

            if (!emptyBalance) {
                return (false, HederaResponseCodes.TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES);
            }
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateTokenSufficiency(
        address token,
        address owner,
        int64 amount,
        int64 serialNumber,
        mapping(address => bool) storage _isFungible,
        mapping(address => bool) storage _isNonFungible,
        mapping(address => mapping(int64 => IHtsSystemContractMock.PartialNonFungibleTokenInfo)) storage _partialNonFungibleTokenInfos
    ) internal view returns (bool success, int64 responseCode) {

        uint256 amountU256 = uint64(amount);
        uint256 serialNumberU256 = uint64(serialNumber);
        return _validateTokenSufficiency(token, owner, amountU256, serialNumberU256, _isFungible, _isNonFungible, _partialNonFungibleTokenInfos);
    }

    function _validateTokenSufficiency(
        address token,
        address owner,
        uint256 amount,
        uint256 serialNumber,
        mapping(address => bool) storage _isFungible,
        mapping(address => bool) storage _isNonFungible,
        mapping(address => mapping(int64 => IHtsSystemContractMock.PartialNonFungibleTokenInfo)) storage _partialNonFungibleTokenInfos
    ) internal view returns (bool success, int64 responseCode) {

        if (_isFungible[token]) {
            return _validateFungibleBalance(token, owner, amount, _isFungible);
        }

        if (_isNonFungible[token]) {
            return _validateNftOwnership(token, owner, serialNumber, _isNonFungible, _partialNonFungibleTokenInfos);
        }
    }

    function _validateFungibleApproval(
        address token,
        address spender,
        address from,
        uint256 amount,
        mapping(address => bool) storage _isFungible
    ) internal view returns (bool success, int64 responseCode) {
        if (_isFungible[token]) {

            uint256 allowance = HederaFungibleToken(token).allowance(from, spender);

            // TODO: do validation for other allowance response codes such as SPENDER_DOES_NOT_HAVE_ALLOWANCE and MAX_ALLOWANCES_EXCEEDED
            if (allowance < amount) {
                return (false, HederaResponseCodes.AMOUNT_EXCEEDS_ALLOWANCE);
            }
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateNftApproval(
        address owner,
        address token,
        address spender,
        uint256 serialNumber,
        mapping(address => bool) storage _isNonFungible
    ) internal view returns (bool success, int64 responseCode) {

        if (_isNonFungible[token]) {
            bool canSpendToken = HederaNonFungibleToken(token).isApprovedOrOwner(owner, spender, serialNumber);
            if (!canSpendToken) {
                return (false, HederaResponseCodes.INSUFFICIENT_ACCOUNT_BALANCE);
            }
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateApprovalSufficiency(
        address token,
        address spender,
        address from,
        uint256 amountOrSerialNumber,
        mapping(address => bool) storage _isFungible,
        mapping(address => bool) storage _isNonFungible
    ) internal view returns (bool success, int64 responseCode) {

        if (_isFungible[token]) {
            return _validateFungibleApproval(token, spender, from, amountOrSerialNumber, _isFungible);
        }

        if (_isNonFungible[token]) {
            return _validateNftApproval(from, token, spender, amountOrSerialNumber, _isNonFungible);
        }
    }

    function _validBurnInput(
        address token,
        mapping(address => bool) storage _isFungible,
        mapping(address => bool) storage _isNonFungible,
        int64 amount,
        int64[] memory serialNumbers
    ) internal view returns (bool success, int64 responseCode) {

        if (_isFungible[token] && serialNumbers.length > 0) {
            return (false, HederaResponseCodes.INVALID_TOKEN_ID);
        }

        if (_isNonFungible[token] && amount > 0) {
            return (false, HederaResponseCodes.INVALID_TOKEN_ID);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateTokenAssociation(
        address token,
        address account,
        mapping(address => mapping(address => bool)) storage _association
    ) internal view returns (bool success, int64 responseCode) {
        if (!_association[token][account]) {
            return (false, HederaResponseCodes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }

    function _validateTokenDissociation(
        address token,
        address account,
        mapping(address => mapping(address => bool)) storage _association,
        mapping(address => bool) storage _isFungible,
        mapping(address => bool) storage _isNonFungible
    ) internal view returns (bool success, int64 responseCode) {

        if (_isFungible[token]) {
            return _validateEmptyFungibleBalance(token, account, _isFungible);
        }

        if (_isNonFungible[token]) {
            return _validateEmptyNonFungibleBalance(token, account, _isNonFungible);
        }

        success = true;
        responseCode = HederaResponseCodes.SUCCESS;
    }
}
// Filename: test/foundry/mocks/prng-system-contract/PRNGSytemContractMock.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '../../../../contracts/system-contracts/pseudo-random-number-generator/IPrngSystemContract.sol';

contract PRNGSytemContractMock is IPrngSystemContract {

  address internal constant PRNG_PRECOMPILE_ADDRESS = address(0x169);

  bytes32 internal lastSeed; // to increase pseudorandomness by feeding in the previous seed into latest seed

  function getPseudorandomSeed() external returns (bytes32) {
    lastSeed = keccak256(abi.encodePacked(lastSeed, block.timestamp, block.number, msg.sender));
    return lastSeed;
  }
}
// Filename: test/foundry/utils/CommonUtils.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import 'forge-std/Test.sol';

import '../../../contracts/system-contracts/hedera-token-service/KeyHelper.sol';

/// generic test utils
abstract contract CommonUtils is Test, KeyHelper {

    address internal alice = vm.addr(1);
    address internal bob = vm.addr(2);
    address internal carol = vm.addr(3);
    address internal dave = vm.addr(4);

    uint256 public constant NUM_OF_ACCOUNTS = 4;

    modifier setPranker(address pranker) {
        vm.startPrank(pranker);
        _;
        vm.stopPrank();
    }

    function _setUpAccounts() internal {
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
        vm.deal(dave, 100 ether);
    }

    function _getAccount(uint index) internal returns (address) {
        if (index == 0) {
            return alice;
        }
        if (index == 1) {
            return bob;
        }
        if (index == 2) {
            return carol;
        }

        return dave; // return dave by default
    }

    function _getKeyTypeValue(KeyHelper.KeyType keyType) internal pure returns (uint256 keyTypeValue) {
        keyTypeValue = 2 ** uint(keyType);
    }

}
// Filename: test/foundry/utils/ExchangeRateUtils.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import 'forge-std/Test.sol';

import '../mocks/exchange-rate-system-contract/ExchangeRateSystemContractMock.sol';
import './CommonUtils.sol';
import '../../../contracts/libraries/Constants.sol';

/// for testing actions of the exchange rate precompiled/system contract
abstract contract ExchangeRateUtils is Test, CommonUtils, Constants {

    ExchangeRateSystemContractMock exchangeRateSystemContract = ExchangeRateSystemContractMock(EXCHANGE_RATE_PRECOMPILE);

    function _setUpExchangeRateSystemContractMock() internal {
        ExchangeRateSystemContractMock exchangeRateSystemContractMock = new ExchangeRateSystemContractMock();
        bytes memory code = address(exchangeRateSystemContractMock).code;
        vm.etch(EXCHANGE_RATE_PRECOMPILE, code);
        _doUpdateRate(1e7);
    }

    function _doConvertTinycentsToTinybars(uint256 tinycents) internal returns (uint256 tinybars) {

        tinybars = exchangeRateSystemContract.tinycentsToTinybars(tinycents);

    }

    function _doConvertTinybarsToTinycents(uint256 tinybars) internal returns (uint256 tinycents) {

        tinycents = exchangeRateSystemContract.tinybarsToTinycents(tinybars);

    }

    function _doUpdateRate(uint256 newRate) internal {

        exchangeRateSystemContract.updateRate(newRate);

    }

}
// Filename: test/foundry/utils/HederaFungibleTokenUtils.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '../../../contracts/system-contracts/HederaResponseCodes.sol';
import '../../../contracts/system-contracts/hedera-token-service/IHederaTokenService.sol';

import '../mocks/hts-precompile/HederaFungibleToken.sol';

import "./CommonUtils.sol";
import "./HederaTokenUtils.sol";

contract HederaFungibleTokenUtils is CommonUtils, HederaTokenUtils {

    function _getSimpleHederaFungibleTokenInfo(
        string memory name,
        string memory symbol,
        address treasury,
        int64 initialTotalSupply,
        int32 decimals
    ) internal returns (IHederaTokenService.FungibleTokenInfo memory fungibleTokenInfo) {
        IHederaTokenService.TokenInfo memory tokenInfo;

        IHederaTokenService.HederaToken memory token = _getSimpleHederaToken(name, symbol, treasury);

        tokenInfo.token = token;
        tokenInfo.totalSupply = initialTotalSupply;

        fungibleTokenInfo.decimals = decimals;
        fungibleTokenInfo.tokenInfo = tokenInfo;
    }

    function _doCreateHederaFungibleTokenViaHtsPrecompile(
        address sender,
        string memory name,
        string memory symbol,
        address treasury,
        int64 initialTotalSupply,
        int32 decimals
    ) internal setPranker(sender) returns (address tokenAddress) {
        bool isToken;
        assertTrue(isToken == false);
        IHederaTokenService.HederaToken memory token = _getSimpleHederaToken(name, symbol, treasury);

        int64 responseCode;
        (responseCode, tokenAddress) = htsPrecompile.createFungibleToken(token, initialTotalSupply, decimals);

        int32 tokenType;
        (, isToken) = htsPrecompile.isToken(tokenAddress);
        (responseCode, tokenType) = htsPrecompile.getTokenType(tokenAddress);

        HederaFungibleToken hederaFungibleToken = HederaFungibleToken(tokenAddress);

        assertEq(responseCode, HederaResponseCodes.SUCCESS, 'Failed to createFungibleToken');

        assertEq(responseCode, HederaResponseCodes.SUCCESS, 'Did not set is{}Token correctly');
        assertEq(tokenType, 0, 'Did not set isFungible correctly');

        assertEq(uint64(initialTotalSupply), hederaFungibleToken.totalSupply(), 'Did not set initial supply correctly');
        assertEq(token.name, hederaFungibleToken.name(), 'Did not set name correctly');
        assertEq(token.symbol, hederaFungibleToken.symbol(), 'Did not set symbol correctly');
        assertEq(
            hederaFungibleToken.totalSupply(),
            hederaFungibleToken.balanceOf(token.treasury),
            'Did not mint initial supply to treasury'
        );
    }

    function _doCreateHederaFungibleTokenDirectly(
        address sender,
        string memory name,
        string memory symbol,
        address treasury,
        int64 initialTotalSupply,
        int32 decimals,
        IHederaTokenService.TokenKey[] memory keys
    ) internal setPranker(sender) returns (address tokenAddress) {
        IHederaTokenService.FungibleTokenInfo memory fungibleTokenInfo = _getSimpleHederaFungibleTokenInfo(
            name,
            symbol,
            sender,
            initialTotalSupply,
            decimals
        );

        fungibleTokenInfo.tokenInfo.token.tokenKeys = keys;

        IHederaTokenService.HederaToken memory token = fungibleTokenInfo.tokenInfo.token;

        /// @dev no need to register newly created HederaFungibleToken in this context as the constructor will call HtsSystemContractMock#registerHederaFungibleToken
        HederaFungibleToken hederaFungibleToken = new HederaFungibleToken(fungibleTokenInfo);
        tokenAddress = address(hederaFungibleToken);

        (int64 responseCode, int32 tokenType) = htsPrecompile.getTokenType(tokenAddress);

        assertEq(responseCode, HederaResponseCodes.SUCCESS, 'Did not set is{}Token correctly');
        assertEq(tokenType, 0, 'Did not set isFungible correctly');

        assertEq(uint64(initialTotalSupply), hederaFungibleToken.totalSupply(), 'Did not set initial supply correctly');
        assertEq(token.name, hederaFungibleToken.name(), 'Did not set name correctly');
        assertEq(token.symbol, hederaFungibleToken.symbol(), 'Did not set symbol correctly');
        assertEq(
            hederaFungibleToken.totalSupply(),
            hederaFungibleToken.balanceOf(token.treasury),
            'Did not mint initial supply to treasury'
        );
    }

    function _createSimpleMockFungibleToken(
        address sender,
        IHederaTokenService.TokenKey[] memory keys
    ) internal returns (address tokenAddress) {
        string memory name = 'Token A';
        string memory symbol = 'TA';
        address treasury = sender;
        int64 initialTotalSupply = 1e16;
        int32 decimals = 8;

        tokenAddress = _doCreateHederaFungibleTokenDirectly(
            sender,
            name,
            symbol,
            treasury,
            initialTotalSupply,
            decimals,
            keys
        );
    }

    function _doApproveViaHtsPrecompile(
        address sender,
        address token,
        address spender,
        uint allowance
    ) internal setPranker(sender) returns (bool success) {
        HederaFungibleToken hederaFungibleToken = HederaFungibleToken(token);
        uint spenderStartingAllowance = hederaFungibleToken.allowance(sender, spender);
        int64 responseCode = htsPrecompile.approve(token, spender, allowance);
        assertEq(
            responseCode,
            HederaResponseCodes.SUCCESS,
            "expected spender to be given token allowance to sender's account"
        );

        uint spenderFinalAllowance = hederaFungibleToken.allowance(sender, spender);

        assertEq(spenderFinalAllowance, allowance, "spender's expected allowance not set correctly");
    }

    function _doApproveDirectly(
        address sender,
        address token,
        address spender,
        uint allowance
    ) internal setPranker(sender) returns (bool success) {
        HederaFungibleToken hederaFungibleToken = HederaFungibleToken(token);
        uint spenderStartingAllowance = hederaFungibleToken.allowance(sender, spender);
        success = hederaFungibleToken.approve(spender, allowance);
        assertEq(success, true, 'expected successful approval');
        uint spenderFinalAllowance = hederaFungibleToken.allowance(sender, spender);
        assertEq(spenderFinalAllowance, allowance, "spender's expected allowance not set correctly");
    }
}
// Filename: test/foundry/utils/HederaNonFungibleTokenUtils.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '../../../contracts/system-contracts/HederaResponseCodes.sol';
import '../../../contracts/system-contracts/hedera-token-service/IHederaTokenService.sol';

import '../mocks/hts-precompile/HederaFungibleToken.sol';

import "./CommonUtils.sol";
import "./HederaTokenUtils.sol";

contract HederaNonFungibleTokenUtils is CommonUtils, HederaTokenUtils {

    function _getSimpleHederaNftTokenInfo(
        string memory name,
        string memory symbol,
        address treasury
    ) internal returns (IHederaTokenService.TokenInfo memory tokenInfo) {
        IHederaTokenService.HederaToken memory token = _getSimpleHederaToken(name, symbol, treasury);
        tokenInfo.token = token;
    }

    function _doCreateHederaNonFungibleTokenViaHtsPrecompile(
        address sender,
        string memory name,
        string memory symbol,
        address treasury
    ) internal setPranker(sender) returns (bool success, address tokenAddress) {

        int64 expectedResponseCode = HederaResponseCodes.SUCCESS;
        int64 responseCode;

        if (sender != treasury) {
            expectedResponseCode = HederaResponseCodes.AUTHORIZATION_FAILED;
        }

        IHederaTokenService.HederaToken memory token = _getSimpleHederaToken(name, symbol, treasury);
        (responseCode, tokenAddress) = htsPrecompile.createNonFungibleToken(token);

        assertEq(expectedResponseCode, responseCode, "response code does not equal expected response code");

        success = responseCode == HederaResponseCodes.SUCCESS;

        if (success) {
            int32 tokenType;
            bool isToken;
            (, isToken) = htsPrecompile.isToken(tokenAddress);
            (responseCode, tokenType) = htsPrecompile.getTokenType(tokenAddress);

            HederaNonFungibleToken hederaNonFungibleToken = HederaNonFungibleToken(tokenAddress);

            assertEq(responseCode, HederaResponseCodes.SUCCESS, 'Failed to createNonFungibleToken');

            assertEq(responseCode, HederaResponseCodes.SUCCESS, 'Did not set is{}Token correctly');
            assertEq(tokenType, 1, 'Did not set isNonFungible correctly');

            assertEq(token.name, hederaNonFungibleToken.name(), 'Did not set name correctly');
            assertEq(token.symbol, hederaNonFungibleToken.symbol(), 'Did not set symbol correctly');
            assertEq(
                hederaNonFungibleToken.totalSupply(),
                hederaNonFungibleToken.balanceOf(token.treasury),
                'Did not mint initial supply to treasury'
            );
        }

    }

    function _doCreateHederaNonFungibleTokenDirectly(
        address sender,
        string memory name,
        string memory symbol,
        address treasury,
        IHederaTokenService.TokenKey[] memory keys
    ) internal setPranker(sender) returns (bool success, address tokenAddress) {

        int64 expectedResponseCode = HederaResponseCodes.SUCCESS;
        int64 responseCode;

        IHederaTokenService.TokenInfo memory nftTokenInfo = _getSimpleHederaNftTokenInfo(
            name,
            symbol,
            treasury
        );

        nftTokenInfo.token.tokenKeys = keys;

        IHederaTokenService.HederaToken memory token = nftTokenInfo.token;

        if (sender != treasury) {
            expectedResponseCode = HederaResponseCodes.AUTHORIZATION_FAILED;
        }

        if (expectedResponseCode != HederaResponseCodes.SUCCESS) {
            vm.expectRevert(bytes("PRECHECK_FAILED"));
        }

        /// @dev no need to register newly created HederaNonFungibleToken in this context as the constructor will call HtsSystemContractMock#registerHederaNonFungibleToken
        HederaNonFungibleToken hederaNonFungibleToken = new HederaNonFungibleToken(nftTokenInfo);

        if (expectedResponseCode == HederaResponseCodes.SUCCESS) {
            success = true;
        }

        if (success) {

            tokenAddress = address(hederaNonFungibleToken);

            (int64 responseCode, int32 tokenType) = htsPrecompile.getTokenType(tokenAddress);

            assertEq(responseCode, HederaResponseCodes.SUCCESS, 'Did not set is{}Token correctly');
            assertEq(tokenType, 1, 'Did not set isNonFungible correctly');

            assertEq(token.name, hederaNonFungibleToken.name(), 'Did not set name correctly');
            assertEq(token.symbol, hederaNonFungibleToken.symbol(), 'Did not set symbol correctly');
            assertEq(
                hederaNonFungibleToken.totalSupply(),
                hederaNonFungibleToken.balanceOf(token.treasury),
                'Did not mint initial supply to treasury'
            );

        }

    }

    function _createSimpleMockNonFungibleToken(
        address sender,
        IHederaTokenService.TokenKey[] memory keys
    ) internal returns (address tokenAddress) {

        string memory name = 'NFT A';
        string memory symbol = 'NFT-A';
        address treasury = sender;

        (, tokenAddress) = _doCreateHederaNonFungibleTokenDirectly(sender, name, symbol, treasury, keys);
    }

    struct ApproveNftParams {
        address sender;
        address token;
        address spender;
        int64 serialId;
    }

    struct ApproveNftInfo {
        address owner;
        address spender;
        uint256 serialIdU256;
    }

    function _doApproveNftViaHtsPrecompile(ApproveNftParams memory approveNftParams) internal setPranker(approveNftParams.sender) returns (bool success) {

        int64 expectedResponseCode = HederaResponseCodes.SUCCESS;
        int64 responseCode;

        ApproveNftInfo memory approveNftInfo;

        HederaNonFungibleToken hederaNonFungibleToken = HederaNonFungibleToken(approveNftParams.token);

        approveNftInfo.serialIdU256 = uint64(approveNftParams.serialId);
        approveNftInfo.owner = hederaNonFungibleToken.ownerOf(approveNftInfo.serialIdU256);

        if (approveNftParams.sender != approveNftInfo.owner) {
            expectedResponseCode = HederaResponseCodes.SENDER_DOES_NOT_OWN_NFT_SERIAL_NO;
        }

        responseCode = htsPrecompile.approveNFT(approveNftParams.token, approveNftParams.spender, approveNftInfo.serialIdU256);

        assertEq(responseCode, expectedResponseCode, "expected response code does not equal actual response code");

        success = responseCode == HederaResponseCodes.SUCCESS;

        approveNftInfo.spender = hederaNonFungibleToken.getApproved(approveNftInfo.serialIdU256);

        if (success) {
            assertEq(approveNftInfo.spender, approveNftParams.spender, "spender was not correctly updated");
        }

    }

    function _doApproveNftDirectly(ApproveNftParams memory approveNftParams) internal setPranker(approveNftParams.sender) returns (bool success) {

        int64 expectedResponseCode = HederaResponseCodes.SUCCESS;
        int64 responseCode;

        ApproveNftInfo memory approveNftInfo;

        HederaNonFungibleToken hederaNonFungibleToken = HederaNonFungibleToken(approveNftParams.token);

        approveNftInfo.serialIdU256 = uint64(approveNftParams.serialId);
        approveNftInfo.owner = hederaNonFungibleToken.ownerOf(approveNftInfo.serialIdU256);

        if (approveNftParams.sender != approveNftInfo.owner) {
            expectedResponseCode = HederaResponseCodes.SENDER_DOES_NOT_OWN_NFT_SERIAL_NO;
        }

        if (expectedResponseCode != HederaResponseCodes.SUCCESS) {
            vm.expectRevert(
                abi.encodeWithSelector(
                    HederaFungibleToken.HtsPrecompileError.selector,
                    expectedResponseCode
                )
            );
        }

        hederaNonFungibleToken.approve(approveNftParams.spender, approveNftInfo.serialIdU256);

        if (expectedResponseCode == HederaResponseCodes.SUCCESS) {
            success = true;
        }

        approveNftInfo.spender = hederaNonFungibleToken.getApproved(approveNftInfo.serialIdU256);

        if (success) {
            assertEq(approveNftInfo.spender, approveNftParams.spender, "spender was not correctly updated");
        }

    }

}
// Filename: test/foundry/utils/HederaTokenUtils.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import 'forge-std/Test.sol';

import '../mocks/hts-precompile/HtsSystemContractMock.sol';
import '../../../contracts/system-contracts/hedera-token-service/IHederaTokenService.sol';
import './CommonUtils.sol';
import '../mocks/interfaces/IHRCCommon.sol';

/// for testing actions common to both HTS token types i.e FUNGIBLE and NON_FUNGIBLE
/// also has common constants for both HTS token types
abstract contract HederaTokenUtils is Test, CommonUtils, Constants {

    HtsSystemContractMock htsPrecompile = HtsSystemContractMock(HTS_PRECOMPILE);

    function _setUpHtsPrecompileMock() internal {
        HtsSystemContractMock htsPrecompileMock = new HtsSystemContractMock();
        bytes memory code = address(htsPrecompileMock).code;
        vm.etch(HTS_PRECOMPILE, code);
    }

    function _getSimpleHederaToken(
        string memory name,
        string memory symbol,
        address treasury
    ) internal returns (IHederaTokenService.HederaToken memory token) {
        token.name = name;
        token.symbol = symbol;
        token.treasury = treasury;
    }

    function _doAssociateViaHtsPrecompile(
        address sender,
        address token
    ) internal setPranker(sender) returns (bool success) {
        bool isInitiallyAssociated = htsPrecompile.isAssociated(sender, token);
        int64 responseCode = htsPrecompile.associateToken(sender, token);
        success = responseCode == HederaResponseCodes.SUCCESS;

        int64 expectedResponseCode;

        if (isInitiallyAssociated) {
            expectedResponseCode = HederaResponseCodes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT;
        }

        if (!isInitiallyAssociated) {
            expectedResponseCode = HederaResponseCodes.SUCCESS;
        }

        bool isFinallyAssociated = htsPrecompile.isAssociated(sender, token);

        assertEq(responseCode, expectedResponseCode, 'expected response code does not match actual response code');
        assertEq(isFinallyAssociated, true, 'expected account to always be finally associated');
    }

    function _doAssociateDirectly(
        address sender,
        address token
    ) internal setPranker(sender) returns (bool success) {

        IHRCCommon htsToken = IHRCCommon(token);

        bool isInitiallyAssociated = htsToken.isAssociated(sender);
        int64 responseCode = int64(uint64(htsToken.associate()));
        success = responseCode == HederaResponseCodes.SUCCESS;

        int64 expectedResponseCode;

        if (isInitiallyAssociated) {
            expectedResponseCode = HederaResponseCodes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT;
        }

        if (!isInitiallyAssociated) {
            expectedResponseCode = HederaResponseCodes.SUCCESS;
        }

        bool isFinallyAssociated = htsToken.isAssociated(sender);

        assertEq(responseCode, expectedResponseCode, 'expected response code does not match actual response code');
        assertEq(isFinallyAssociated, true, 'expected account to always be finally associated');
    }

    function _doDissociateDirectly(
        address sender,
        address token
    ) internal setPranker(sender) returns (bool success) {

        IHRCCommon htsToken = IHRCCommon(token);

        bool isInitiallyAssociated = htsToken.isAssociated(sender);
        bool hasPositiveBalance = htsToken.balanceOf(sender) > 0;
        int64 responseCode = int64(uint64(htsToken.dissociate()));
        success = responseCode == HederaResponseCodes.SUCCESS;

        int64 expectedResponseCode;

        bool isFinallyAssociated = htsToken.isAssociated(sender);

        if (hasPositiveBalance) {
            expectedResponseCode = HederaResponseCodes.TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES;
            assertEq(isFinallyAssociated, true, 'expected account to be remain associated');
        } else {
            if (isInitiallyAssociated) {
                expectedResponseCode = HederaResponseCodes.SUCCESS;
                assertEq(isFinallyAssociated, false, 'expected account to be finally dissociated');
            }

            if (!isInitiallyAssociated) {
                expectedResponseCode = HederaResponseCodes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT;
                assertEq(isFinallyAssociated, false, 'expected account to be remain unassociated');
            }
        }

        assertEq(responseCode, expectedResponseCode, 'expected response code does not match actual response code');
    }

    struct MintKeys {
        address supplyKey;
        address treasury;
    }

    struct MintInfo {
        uint256 totalSupply;
        uint256 treasuryBalance;
        bool isFungible;
        bool isNonFungible;
        uint256 mintAmountU256;
        int64 mintCount;
    }

    struct MintParams {
        address sender;
        address token;
        int64 mintAmount;
    }

    struct MintResponse {
        bool success;
        int64 responseCode;
        int64 serialId;
    }

    function _doMintViaHtsPrecompile(MintParams memory mintParams) internal setPranker(mintParams.sender) returns (MintResponse memory mintResponse) {

        HederaFungibleToken hederaFungibleToken = HederaFungibleToken(mintParams.token);
        HederaNonFungibleToken hederaNonFungibleToken = HederaNonFungibleToken(mintParams.token);

        bytes[] memory NULL_BYTES = new bytes[](1);

        int64 newTotalSupply;
        int64[] memory serialNumbers;
        int32 tokenType;

        int64 expectedResponseCode = HederaResponseCodes.SUCCESS; // assume SUCCESS initially and later overwrite error code accordingly

        IHederaTokenService.KeyValue memory supplyKey;

        (, supplyKey) = htsPrecompile.getTokenKey(mintParams.token, _getKeyTypeValue(KeyHelper.KeyType.SUPPLY));

        MintKeys memory mintKeys = MintKeys({
            supplyKey: supplyKey.contractId,
            treasury: htsPrecompile.getTreasuryAccount(mintParams.token)
        });

        (mintResponse.responseCode, tokenType) = htsPrecompile.getTokenType(mintParams.token);

        mintResponse.success = mintResponse.responseCode == HederaResponseCodes.SUCCESS;

        if (tokenType == 1) {
            /// @dev since you can only mint one NFT at a time; also mintAmount is ONLY applicable to type FUNGIBLE
            mintParams.mintAmount = 1;
        }

        MintInfo memory preMintInfo = MintInfo({
            totalSupply: mintResponse.success ? (tokenType == 0 ? hederaFungibleToken.totalSupply() : hederaNonFungibleToken.totalSupply()) : 0,
            treasuryBalance: mintResponse.success ? (tokenType == 0 ? hederaFungibleToken.balanceOf(mintKeys.treasury) : hederaNonFungibleToken.totalSupply()) : 0,
            isFungible: tokenType == 0 ? true : false,
            isNonFungible: tokenType == 1 ? true : false,
            mintAmountU256: uint64(mintParams.mintAmount),
            mintCount: tokenType == 1 ? hederaNonFungibleToken.mintCount() : int64(0)
        });

        if (mintKeys.supplyKey != mintParams.sender) {
            expectedResponseCode = HederaResponseCodes.INVALID_SUPPLY_KEY;
        }

        if (mintKeys.supplyKey == ADDRESS_ZERO) {
            expectedResponseCode = HederaResponseCodes.TOKEN_HAS_NO_SUPPLY_KEY;
        }

        (mintResponse.responseCode, newTotalSupply, serialNumbers) = htsPrecompile.mintToken(mintParams.token, mintParams.mintAmount, NULL_BYTES);

        assertEq(expectedResponseCode, mintResponse.responseCode, 'expected response code does not equal actual response code');

        mintResponse.success = mintResponse.responseCode == HederaResponseCodes.SUCCESS;

        MintInfo memory postMintInfo = MintInfo({
            totalSupply: tokenType == 0 ? hederaFungibleToken.totalSupply() : hederaNonFungibleToken.totalSupply(),
            treasuryBalance: tokenType == 0 ? hederaFungibleToken.balanceOf(mintKeys.treasury) : hederaNonFungibleToken.totalSupply(),
            isFungible: tokenType == 0 ? true : false,
            isNonFungible: tokenType == 1 ? true : false,
            mintAmountU256: uint64(mintParams.mintAmount),
            mintCount: tokenType == 1 ? hederaNonFungibleToken.mintCount() : int64(0)
        });

        if (mintResponse.success) {

            assertEq(
                postMintInfo.totalSupply,
                uint64(newTotalSupply),
                'expected newTotalSupply to equal post mint totalSupply'
            );

            if (preMintInfo.isFungible) {

                assertEq(
                    preMintInfo.totalSupply + preMintInfo.mintAmountU256,
                    postMintInfo.totalSupply,
                    'expected total supply to increase by mint amount'
                );
                assertEq(
                    preMintInfo.treasuryBalance + preMintInfo.mintAmountU256,
                    postMintInfo.treasuryBalance,
                    'expected treasury balance to increase by mint amount'
                );
            }

            if (preMintInfo.isNonFungible) {
                assertEq(
                    preMintInfo.totalSupply + 1,
                    postMintInfo.totalSupply,
                    'expected total supply to increase by mint amount'
                );
                assertEq(
                    preMintInfo.treasuryBalance + 1,
                    postMintInfo.treasuryBalance,
                    'expected treasury balance to increase by mint amount'
                );

                assertEq(preMintInfo.mintCount + 1, postMintInfo.mintCount, "expected mintCount to increase by 1");
                assertEq(serialNumbers[0], postMintInfo.mintCount, "expected minted serialNumber to equal mintCount");

                mintResponse.serialId = serialNumbers[0];
            }
        }

        if (!mintResponse.success) {
            assertEq(
                preMintInfo.totalSupply,
                postMintInfo.totalSupply,
                'expected total supply to not change if failed'
            );
            assertEq(
                preMintInfo.treasuryBalance,
                postMintInfo.treasuryBalance,
                'expected treasury balance to not change if failed'
            );
        }
    }

    struct TransferParams {
        address sender;
        address token;
        address from;
        address to;
        uint256 amountOrSerialNumber; // amount for FUNGIBLE serialNumber for NON_FUNGIBLE
    }

    struct TransferInfo {
        // applicable to FUNGIBLE
        uint256 spenderAllowance;
        uint256 fromBalance;
        uint256 toBalance;
        // applicable to NON_FUNGIBLE
        address owner;
        address approvedId;
        bool isSenderOperator;
    }

    struct TransferChecks {
        bool isRecipientAssociated;
        bool isRequestFromOwner;
        int64 expectedResponseCode;
        bool isToken;
        int32 tokenType;
        bool isFungible;
        bool isNonFungible;
    }

    function _doTransferViaHtsPrecompile(
        TransferParams memory transferParams
    ) internal setPranker(transferParams.sender) returns (bool success, int64 responseCode) {
        HederaFungibleToken hederaFungibleToken = HederaFungibleToken(transferParams.token);
        HederaNonFungibleToken hederaNonFungibleToken = HederaNonFungibleToken(transferParams.token);

        TransferChecks memory transferChecks;
        TransferInfo memory preTransferInfo;

        transferChecks.expectedResponseCode = HederaResponseCodes.SUCCESS; // assume SUCCESS and overwrite with !SUCCESS where applicable

        (transferChecks.expectedResponseCode, transferChecks.tokenType) = htsPrecompile.getTokenType(transferParams.token);

        if (transferChecks.expectedResponseCode == HederaResponseCodes.SUCCESS) {
            transferChecks.isFungible = transferChecks.tokenType == 0 ? true : false;
            transferChecks.isNonFungible = transferChecks.tokenType == 1 ? true : false;
        }

        transferChecks.isRecipientAssociated = htsPrecompile.isAssociated(transferParams.to, transferParams.token);
        transferChecks.isRequestFromOwner = transferParams.sender == transferParams.from;

        if (transferChecks.isFungible) {
            preTransferInfo.spenderAllowance = hederaFungibleToken.allowance(transferParams.from, transferParams.sender);
            preTransferInfo.fromBalance = hederaFungibleToken.balanceOf(transferParams.from);
            preTransferInfo.toBalance = hederaFungibleToken.balanceOf(transferParams.to);
        }

        if (transferChecks.isNonFungible) {
            preTransferInfo.owner = hederaNonFungibleToken.ownerOf(transferParams.amountOrSerialNumber);
            preTransferInfo.approvedId = hederaNonFungibleToken.getApproved(transferParams.amountOrSerialNumber);
            preTransferInfo.isSenderOperator = hederaNonFungibleToken.isApprovedForAll(transferParams.from, transferParams.sender);
        }

        if (transferChecks.isRequestFromOwner) {
            if (transferChecks.isFungible) {
                if (preTransferInfo.fromBalance < transferParams.amountOrSerialNumber) {
                    transferChecks.expectedResponseCode = HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE;
                }
            }

            if (transferChecks.isNonFungible) {
                if (preTransferInfo.owner != transferParams.sender) {
                    transferChecks.expectedResponseCode = HederaResponseCodes.SENDER_DOES_NOT_OWN_NFT_SERIAL_NO;
                }
            }
        }

        if (!transferChecks.isRequestFromOwner) {
            if (transferChecks.isFungible) {
                if (preTransferInfo.spenderAllowance < transferParams.amountOrSerialNumber) {
                    transferChecks.expectedResponseCode = HederaResponseCodes.AMOUNT_EXCEEDS_ALLOWANCE;
                }
            }

            if (transferChecks.isNonFungible) {

                if (preTransferInfo.owner != transferParams.from) {
                    transferChecks.expectedResponseCode = HederaResponseCodes.INVALID_ALLOWANCE_OWNER_ID;
                }

                if (preTransferInfo.approvedId != transferParams.sender && !preTransferInfo.isSenderOperator) {
                    transferChecks.expectedResponseCode = HederaResponseCodes.SPENDER_DOES_NOT_HAVE_ALLOWANCE;
                }
            }
        }

        if (!transferChecks.isRecipientAssociated) {
            transferChecks.expectedResponseCode = HederaResponseCodes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT;
        }

        responseCode = htsPrecompile.transferFrom(
            transferParams.token,
            transferParams.from,
            transferParams.to,
            transferParams.amountOrSerialNumber
        );

        assertEq(
            transferChecks.expectedResponseCode,
            responseCode,
            'expected response code does not equal actual response code'
        );

        success = responseCode == HederaResponseCodes.SUCCESS;

        TransferInfo memory postTransferInfo;

        if (transferChecks.isFungible) {
            postTransferInfo.spenderAllowance = hederaFungibleToken.allowance(transferParams.from, transferParams.sender);
            postTransferInfo.fromBalance = hederaFungibleToken.balanceOf(transferParams.from);
            postTransferInfo.toBalance = hederaFungibleToken.balanceOf(transferParams.to);
        }

        if (transferChecks.isNonFungible) {
            postTransferInfo.owner = hederaNonFungibleToken.ownerOf(transferParams.amountOrSerialNumber);
            postTransferInfo.approvedId = hederaNonFungibleToken.getApproved(transferParams.amountOrSerialNumber);
            postTransferInfo.isSenderOperator = hederaNonFungibleToken.isApprovedForAll(transferParams.from, transferParams.sender);
        }

        if (success) {

            if (transferChecks.isFungible) {
                assertEq(
                    preTransferInfo.toBalance + transferParams.amountOrSerialNumber,
                    postTransferInfo.toBalance,
                    'to balance did not update correctly'
                );
                assertEq(
                    preTransferInfo.fromBalance - transferParams.amountOrSerialNumber,
                    postTransferInfo.fromBalance,
                    'from balance did not update correctly'
                );

                if (!transferChecks.isRequestFromOwner) {
                    assertEq(
                        preTransferInfo.spenderAllowance - transferParams.amountOrSerialNumber,
                        postTransferInfo.spenderAllowance,
                        'spender allowance did not update correctly'
                    );
                }
            }

            if (transferChecks.isNonFungible) {
                assertEq(postTransferInfo.owner, transferParams.to, "expected to to be new owner");
                assertEq(postTransferInfo.approvedId, ADDRESS_ZERO, "expected approvedId to be reset");
                assertEq(postTransferInfo.isSenderOperator, preTransferInfo.isSenderOperator, "operator should not have changed");
            }
        }

        if (!success) {

            if (transferChecks.isFungible) {
                assertEq(preTransferInfo.toBalance, postTransferInfo.toBalance, 'to balance changed unexpectedly');
                assertEq(preTransferInfo.fromBalance, postTransferInfo.fromBalance, 'from balance changed unexpectedly');

                if (!transferChecks.isRequestFromOwner) {
                    assertEq(
                        preTransferInfo.spenderAllowance,
                        postTransferInfo.spenderAllowance,
                        'spender allowance changed unexpectedly'
                    );
                }
            }

            if (transferChecks.isNonFungible) {
                assertEq(preTransferInfo.owner, postTransferInfo.owner, 'owner should not have changed on failure');
                assertEq(preTransferInfo.approvedId, postTransferInfo.approvedId, 'approvedId should not have changed on failure');
                assertEq(preTransferInfo.isSenderOperator, postTransferInfo.isSenderOperator, 'isSenderOperator should not have changed on failure');
            }
        }
    }

    function _doTransferDirectly(
        TransferParams memory transferParams
    ) internal setPranker(transferParams.sender) returns (bool success, int64 responseCode) {
        HederaFungibleToken hederaFungibleToken = HederaFungibleToken(transferParams.token);
        HederaNonFungibleToken hederaNonFungibleToken = HederaNonFungibleToken(transferParams.token);

        TransferChecks memory transferChecks;
        TransferInfo memory preTransferInfo;

        transferChecks.expectedResponseCode = HederaResponseCodes.SUCCESS; // assume SUCCESS and overwrite with !SUCCESS where applicable

        (transferChecks.expectedResponseCode, transferChecks.tokenType) = htsPrecompile.getTokenType(transferParams.token);

        if (transferChecks.expectedResponseCode == HederaResponseCodes.SUCCESS) {
            transferChecks.isFungible = transferChecks.tokenType == 0 ? true : false;
            transferChecks.isNonFungible = transferChecks.tokenType == 1 ? true : false;
        }

        transferChecks.isRecipientAssociated = htsPrecompile.isAssociated(transferParams.to, transferParams.token);
        transferChecks.isRequestFromOwner = transferParams.sender == transferParams.from;

        if (transferChecks.isFungible) {
            preTransferInfo.spenderAllowance = hederaFungibleToken.allowance(transferParams.from, transferParams.sender);
            preTransferInfo.fromBalance = hederaFungibleToken.balanceOf(transferParams.from);
            preTransferInfo.toBalance = hederaFungibleToken.balanceOf(transferParams.to);
        }

        if (transferChecks.isNonFungible) {
            preTransferInfo.owner = hederaNonFungibleToken.ownerOf(transferParams.amountOrSerialNumber);
            preTransferInfo.approvedId = hederaNonFungibleToken.getApproved(transferParams.amountOrSerialNumber);
            preTransferInfo.isSenderOperator = hederaNonFungibleToken.isApprovedForAll(transferParams.from, transferParams.sender);
        }

        if (transferChecks.isRequestFromOwner) {
            if (transferChecks.isFungible) {
                if (preTransferInfo.fromBalance < transferParams.amountOrSerialNumber) {
                    transferChecks.expectedResponseCode = HederaResponseCodes.INSUFFICIENT_TOKEN_BALANCE;
                }
            }

            if (transferChecks.isNonFungible) {
                if (preTransferInfo.owner != transferParams.sender) {
                    transferChecks.expectedResponseCode = HederaResponseCodes.SENDER_DOES_NOT_OWN_NFT_SERIAL_NO;
                }
            }
        }

        if (!transferChecks.isRequestFromOwner) {
            if (transferChecks.isFungible) {
                if (preTransferInfo.spenderAllowance < transferParams.amountOrSerialNumber) {
                    transferChecks.expectedResponseCode = HederaResponseCodes.AMOUNT_EXCEEDS_ALLOWANCE;
                }
            }

            if (transferChecks.isNonFungible) {

                if (preTransferInfo.owner != transferParams.from) {
                    transferChecks.expectedResponseCode = HederaResponseCodes.INVALID_ALLOWANCE_OWNER_ID;
                }

                if (preTransferInfo.approvedId != transferParams.sender && !preTransferInfo.isSenderOperator) {
                    transferChecks.expectedResponseCode = HederaResponseCodes.SPENDER_DOES_NOT_HAVE_ALLOWANCE;
                }
            }
        }

        if (!transferChecks.isRecipientAssociated) {
            transferChecks.expectedResponseCode = HederaResponseCodes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT;
        }

        if (transferChecks.expectedResponseCode != HederaResponseCodes.SUCCESS) {
            vm.expectRevert(
                abi.encodeWithSelector(
                    HederaFungibleToken.HtsPrecompileError.selector,
                    transferChecks.expectedResponseCode
                )
            );
        }

        if (transferChecks.isRequestFromOwner) {
            if (transferChecks.isFungible) {
                hederaFungibleToken.transfer(transferParams.to, transferParams.amountOrSerialNumber);
            }
            if (transferChecks.isNonFungible) {
                hederaNonFungibleToken.transferFrom(transferParams.from, transferParams.to, transferParams.amountOrSerialNumber);
            }
        }

        if (!transferChecks.isRequestFromOwner) {
            if (transferChecks.isFungible) {
                hederaFungibleToken.transferFrom(transferParams.from, transferParams.to, transferParams.amountOrSerialNumber);
            }
            if (transferChecks.isNonFungible) {
                hederaNonFungibleToken.transferFrom(transferParams.from, transferParams.to, transferParams.amountOrSerialNumber);
            }
        }

        if (transferChecks.expectedResponseCode == HederaResponseCodes.SUCCESS) {
            success = true;
        }

        TransferInfo memory postTransferInfo;

        if (transferChecks.isFungible) {
            postTransferInfo.spenderAllowance = hederaFungibleToken.allowance(transferParams.from, transferParams.sender);
            postTransferInfo.fromBalance = hederaFungibleToken.balanceOf(transferParams.from);
            postTransferInfo.toBalance = hederaFungibleToken.balanceOf(transferParams.to);
        }

        if (transferChecks.isNonFungible) {
            postTransferInfo.owner = hederaNonFungibleToken.ownerOf(transferParams.amountOrSerialNumber);
            postTransferInfo.approvedId = hederaNonFungibleToken.getApproved(transferParams.amountOrSerialNumber);
            postTransferInfo.isSenderOperator = hederaNonFungibleToken.isApprovedForAll(transferParams.from, transferParams.sender);
        }

        if (success) {
            if (transferChecks.isFungible) {
                assertEq(
                    preTransferInfo.toBalance + transferParams.amountOrSerialNumber,
                    postTransferInfo.toBalance,
                    'to balance did not update correctly'
                );
                assertEq(
                    preTransferInfo.fromBalance - transferParams.amountOrSerialNumber,
                    postTransferInfo.fromBalance,
                    'from balance did not update correctly'
                );

                if (!transferChecks.isRequestFromOwner) {
                    assertEq(
                        preTransferInfo.spenderAllowance - transferParams.amountOrSerialNumber,
                        postTransferInfo.spenderAllowance,
                        'spender allowance did not update correctly'
                    );
                }
            }

            if (transferChecks.isNonFungible) {
                assertEq(postTransferInfo.owner, transferParams.to, "expected to to be new owner");
                assertEq(postTransferInfo.approvedId, ADDRESS_ZERO, "expected approvedId to be reset");
                assertEq(postTransferInfo.isSenderOperator, preTransferInfo.isSenderOperator, "operator should not have changed");
            }
        }

        if (!success) {
            if (transferChecks.isFungible) {
                assertEq(preTransferInfo.toBalance, postTransferInfo.toBalance, 'to balance changed unexpectedly');
                assertEq(preTransferInfo.fromBalance, postTransferInfo.fromBalance, 'from balance changed unexpectedly');

                if (!transferChecks.isRequestFromOwner) {
                    assertEq(
                        preTransferInfo.spenderAllowance,
                        postTransferInfo.spenderAllowance,
                        'spender allowance changed unexpectedly'
                    );
                }
            }

            if (transferChecks.isNonFungible) {
                assertEq(preTransferInfo.owner, postTransferInfo.owner, 'owner should not have changed on failure');
                assertEq(preTransferInfo.approvedId, postTransferInfo.approvedId, 'approvedId should not have changed on failure');
                assertEq(preTransferInfo.isSenderOperator, postTransferInfo.isSenderOperator, 'isSenderOperator should not have changed on failure');
            }
        }
    }

    struct BurnParams {
        address sender;
        address token;
        int64 amountOrSerialNumber;
    }

    struct BurnChecks {
        bool isToken;
        int32 tokenType;
        bool isFungible;
        bool isNonFungible;
        uint256 amountOrSerialNumberU256;
        int64 expectedResponseCode;
    }

    struct BurnInfo {
        address owner;
        uint256 totalSupply;
        uint256 treasuryBalance;
    }

    function _doBurnViaHtsPrecompile(BurnParams memory burnParams) internal setPranker(burnParams.sender) returns (bool success, int64 responseCode) {

        HederaFungibleToken hederaFungibleToken = HederaFungibleToken(burnParams.token);
        HederaNonFungibleToken hederaNonFungibleToken = HederaNonFungibleToken(burnParams.token);

        BurnChecks memory burnChecks;

        bytes[] memory NULL_BYTES = new bytes[](1);

        int64 newTotalSupply;
        int64[] memory serialNumbers = new int64[](1); // this test function currently only supports 1 NFT being burnt at a time

        burnChecks.amountOrSerialNumberU256 = uint64(burnParams.amountOrSerialNumber);
        burnChecks.expectedResponseCode = HederaResponseCodes.SUCCESS; // assume SUCCESS initially and later overwrite error code accordingly

        burnChecks.expectedResponseCode = HederaResponseCodes.SUCCESS; // assume SUCCESS and overwrite with !SUCCESS where applicable

        (burnChecks.expectedResponseCode, burnChecks.tokenType) = htsPrecompile.getTokenType(burnParams.token);

        if (burnChecks.expectedResponseCode == HederaResponseCodes.SUCCESS) {
            burnChecks.isFungible = burnChecks.tokenType == 0 ? true : false;
            burnChecks.isNonFungible = burnChecks.tokenType == 1 ? true : false;
        }

        address treasury = htsPrecompile.getTreasuryAccount(burnParams.token);

        BurnInfo memory preBurnInfo;

        preBurnInfo.totalSupply = hederaFungibleToken.totalSupply();
        preBurnInfo.treasuryBalance = hederaFungibleToken.balanceOf(treasury);

        if (burnChecks.isNonFungible) {
            // amount is only applicable to type FUNGIBLE
            serialNumbers[0] = burnParams.amountOrSerialNumber; // only burn 1 NFT at a time
            preBurnInfo.owner = hederaNonFungibleToken.ownerOf(burnChecks.amountOrSerialNumberU256);
            burnParams.amountOrSerialNumber = 0;

            if (burnParams.sender != preBurnInfo.owner) {
                burnChecks.expectedResponseCode = HederaResponseCodes.SENDER_DOES_NOT_OWN_NFT_SERIAL_NO;
            }
        }

        if (treasury != burnParams.sender) {
            burnChecks.expectedResponseCode = HederaResponseCodes.AUTHORIZATION_FAILED;
        }

        (responseCode, newTotalSupply) = htsPrecompile.burnToken(burnParams.token, burnParams.amountOrSerialNumber, serialNumbers);

        assertEq(burnChecks.expectedResponseCode, responseCode, 'expected response code does not equal actual response code');

        success = responseCode == HederaResponseCodes.SUCCESS;

        BurnInfo memory postBurnInfo;

        postBurnInfo.totalSupply = hederaFungibleToken.totalSupply();
        postBurnInfo.treasuryBalance = hederaFungibleToken.balanceOf(treasury);

        if (success) {
            if (burnChecks.isFungible) {
                assertEq(
                    preBurnInfo.totalSupply - burnChecks.amountOrSerialNumberU256,
                    postBurnInfo.totalSupply,
                    'expected total supply to decrease by burn amount'
                );
                assertEq(
                    preBurnInfo.treasuryBalance - burnChecks.amountOrSerialNumberU256,
                    postBurnInfo.treasuryBalance,
                    'expected treasury balance to decrease by burn amount'
                );
            }

            if (burnChecks.isNonFungible) {
                assertEq(
                    preBurnInfo.totalSupply - 1,
                    postBurnInfo.totalSupply,
                    'expected total supply to decrease by burn amount'
                );
                assertEq(
                    preBurnInfo.treasuryBalance - 1,
                    postBurnInfo.treasuryBalance,
                    'expected treasury balance to decrease by burn amount'
                );
            }
        }

        if (!success) {
            assertEq(
                preBurnInfo.totalSupply,
                postBurnInfo.totalSupply,
                'expected total supply to not change if failed'
            );
            assertEq(
                preBurnInfo.treasuryBalance,
                postBurnInfo.treasuryBalance,
                'expected treasury balance to not change if failed'
            );
        }
    }

}
// Filename: test/foundry/utils/UtilUtils.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import 'forge-std/Test.sol';

import '../mocks/prng-system-contract/PRNGSytemContractMock.sol';
import './CommonUtils.sol';
import '../../../contracts/libraries/Constants.sol';

/// for testing actions of the util precompiled/system contract
abstract contract UtilUtils is Test, CommonUtils, Constants {

    PRNGSytemContractMock utilPrecompile = PRNGSytemContractMock(UTIL_PRECOMPILE);

    function _setUpPRNGSytemContractMock() internal {
        PRNGSytemContractMock prngSytemContractMock = new PRNGSytemContractMock();
        bytes memory code = address(prngSytemContractMock).code;
        vm.etch(UTIL_PRECOMPILE, code);
    }

    function _doCallPseudorandomSeed(address sender) internal setPranker(sender) returns (bytes32 seed) {
        seed = utilPrecompile.getPseudorandomSeed();
    }
}
