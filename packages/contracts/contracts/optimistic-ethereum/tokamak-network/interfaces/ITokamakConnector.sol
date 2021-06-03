// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface ITokamakConnector {
    function seigManager() external view returns(address);
    function setSeigManager(address __seigManager) external;
    function setRewardVault(address _newRewardVault) external;
    function setChallengeReward(uint256 _rewardForChallenge) external;
    function setRelayReward(uint256 _rewardForRelay) external;
}
