// SPDX-License-Identifier: MIT
pragma solidity >0.5.0 <0.8.0;

/* Interface Imports */
import { iOVM_BondManager } from "../../iOVM/verification/iOVM_BondManager.sol";
import { TokamakConnector } from "../../tokamak-network/TokamakConnector.sol";

/* Contract Imports */
import { Lib_AddressResolver } from "../../libraries/resolver/Lib_AddressResolver.sol";

//import { ISeigManager } from "../../tokamak-network/interfaces/ISeigManager.sol";

/**
 * @title mockOVM_BondManager
 */
contract mockOVM_BondManager is TokamakConnector, iOVM_BondManager, Lib_AddressResolver {
    //ISeigManager public seigManager;

    constructor(
        address _libAddressManager,
        address _seigManager
    )
        Lib_AddressResolver(_libAddressManager)
        TokamakConnector(_seigManager)
    {
        //seigManager = ISeigManager(_seigManager);
    }

    /*function setSeigManager(address _seigManager) override external {
        seigManager = ISeigManager(_seigManager);
    }*/

    function recordGasSpent(
        bytes32 _preStateRoot,
        bytes32 _txHash,
        address _who,
        uint256 _gasSpent
    )
        override
        public
    {}

    function finalize(
        bytes32 _preStateRoot,
        address _publisher,
        uint256 _timestamp
    )
        override
        public
    {}

    function deposit()
        override
        public
    {}

    function startWithdrawal()
        override
        public
    {}

    function finalizeWithdrawal()
        override
        public
    {}

    function claim(
        address _who
    )
        override
        public
    {}

    function isCollateralized(
        address _who
    )
        override
        public
        view
        returns (
            bool
        )
    {
        // Only authenticate sequencer to submit state root batches.
        //return _who == resolve("OVM_Proposer");

        return stakedMinimumAmount(_who);
    }

    function getGasSpent(
        bytes32, // _preStateRoot,
        address // _who
    )
        override
        public
        pure
        returns (
            uint256
        )
    {
        return 0;
    }
}
