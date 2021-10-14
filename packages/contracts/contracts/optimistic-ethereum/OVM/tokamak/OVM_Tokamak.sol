// SPDX-License-Identifier: MIT
// @unsupported: ovm
pragma solidity >0.5.0 <0.8.0;
pragma experimental ABIEncoderV2;

/* Interface Imports */
import { iOVM_Tokamak } from "../../iOVM/tokamak/iOVM_Tokamak.sol";

/**
 * @title OVM_Tokamak
 * @dev The L1 ETH and ERC20 Bridge is a contract which stores deposited L1 funds
 * and standard tokens that are in use on L2.
 * It synchronizes a corresponding L2 Bridge, informing it of deposits, and listening
 * to it for newly finalized withdrawals.
 *
 * Compiler used: solc
 * Runtime target: EVM
 */
contract OVM_Tokamak is iOVM_Tokamak {
    string public override version;
    bool public override usingFeeToken;
    address public override feeToken;

    constructor(
        bool _usingFeeToken,
        address _feeToken
    ) {
        usingFeeToken = _usingFeeToken;
        feeToken = _feeToken;
        version = "Natasha optimism";
    }
}
