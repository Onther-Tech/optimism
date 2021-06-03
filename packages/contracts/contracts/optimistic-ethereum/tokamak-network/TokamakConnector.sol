// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import { ISeigManager } from "./interfaces/ISeigManager.sol";
import { ILayer2 } from "./interfaces/ILayer2.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ITokamakConnector } from "./interfaces/ITokamakConnector.sol";
import { IRewardVault } from "./interfaces/IRewardVault.sol";

contract TokamakConnector is ITokamakConnector, ILayer2 {
    ISeigManager internal _seigManager;
    address public override operator;

    IRewardVault public rewardVault;

    uint256 public rewardForChallenge;
    uint256 public rewardForRelay;

    constructor(address __seigManager) {
        _seigManager = ISeigManager(__seigManager);

        rewardForChallenge = 1;
        rewardForRelay = 1;
    }

    function seigManager() external override view returns(address) {
        return address(_seigManager);
    }

    function setSeigManager(address _newSeigManager) external override {
        _seigManager = ISeigManager(_newSeigManager);
    }

    function setRewardVault(address _newRewardVault) external override {
        rewardVault = IRewardVault(_newRewardVault);
    }

    function setChallengeReward(uint256 _rewardForChallenge) external override {
        rewardForChallenge = _rewardForChallenge;
    }

    function setRelayReward(uint256 _rewardForRelay) external override {
        rewardForRelay = _rewardForRelay;
    }

    function claimReward(address _user, uint256 _amount) public {
        rewardVault.claim(_user, _amount);
    }

    function stakedMinimumAmount(address _user) public view returns (bool) {
        uint256 minimumAmount = _seigManager.minimumAmount();
        return stakedOf(_user) >= minimumAmount;
    }

    function stakedOf(address _user) public view returns (uint256) {
        IERC20 coinage = _getCoinageToken();
        return coinage.balanceOf(_user);
    }

    function _getCoinageToken() internal view returns (IERC20) {
        return IERC20(_seigManager.coinages(address(this)));
    }

    //function operator() external view override returns (address) { return operator; }
    function isLayer2() external view override returns (bool) { return true; }
    function currentFork() external view override returns (uint256) { return 1; }
    function lastEpoch(uint256 forkNumber) external view override returns (uint256) { return 1; }
    function changeOperator(address _operator) external override { operator = _operator; }
}
