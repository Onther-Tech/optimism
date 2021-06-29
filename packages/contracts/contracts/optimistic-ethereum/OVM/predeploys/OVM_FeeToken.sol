// SPDX-License-Identifier: MIT
pragma solidity >0.5.0 <0.8.0;

/* Library Imports */
import { Lib_PredeployAddresses } from "../../libraries/constants/Lib_PredeployAddresses.sol";

/* Contract Imports */
import { L2StandardERC20 } from "../../libraries/standards/L2StandardERC20.sol";
import { IWETH9 } from "../../libraries/standards/IWETH9.sol";

/**
 * @title OVM_FeeToken
 * @dev The ETH predeploy provides an ERC20 interface for ETH deposited to Layer 2. Note that
 * unlike on Layer 1, Layer 2 accounts do not have a balance field.
 *
 * Compiler used: optimistic-solc
 * Runtime target: OVM
 */
contract OVM_FeeToken is L2StandardERC20 {

    /***************
     * Constructor *
     ***************/

    constructor(
        address _l1FeeToken,
        string memory _name,
        string memory _symbol
    )
        L2StandardERC20(
            Lib_PredeployAddresses.L2_STANDARD_BRIDGE,
            _l1FeeToken,
            _name,
            _symbol
        )
    {}

    // TODO: for testing
    function setL1Token(
        address _token
    )
        external
    {
        require(l1Token == address(0), "l1Token is already initialized");
        l1Token = _token;
    }
}
