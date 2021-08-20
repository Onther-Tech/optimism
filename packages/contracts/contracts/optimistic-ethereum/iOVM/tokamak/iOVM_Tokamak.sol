// SPDX-License-Identifier: MIT
pragma solidity >0.5.0;
pragma experimental ABIEncoderV2;

/**
 * @title iOVM_Tokamak
 */
interface iOVM_Tokamak {
    function version() external view returns (string memory);
    function usingFeeToken() external view returns (bool);
    function feeToken() external view returns (address);
}
