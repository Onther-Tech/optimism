// SPDX-License-Identifier: MIT
// @unsupported: ovm
pragma solidity >0.5.0 <0.8.0;
pragma experimental ABIEncoderV2;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FeeToken is ERC20 {

    constructor(
    )
        ERC20("FeeToken", "FEE")
    {
        _mint(msg.sender, 10000 ether);
    }

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
