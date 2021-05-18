// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface IRewardVault {
  function claim(address _to, uint256 _amount) external;
}
