// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface ITokamakConnector {
    function seigManager() external view returns(address);
    function setSeigManager(address __seigManager) external;
    function setRewardVault(address _newRewardVault) external;
}
