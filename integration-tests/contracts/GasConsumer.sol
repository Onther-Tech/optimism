// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

contract GasConsumer {
    constructor() {
    }

    function consume() external {
        uint256 i = 0;
        while(gasleft() > 100) {
            i++;
        }
    }
}
