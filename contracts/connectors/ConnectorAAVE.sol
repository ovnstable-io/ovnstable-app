// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";
import "./aave/interfaces/ILendingPool.sol";

contract ConnectorAAVE is IConnector {

    ILendingPool pool;
    address owner;

    constructor () {
        owner = msg.sender;
    }

    modifier onlyOwner () {
        require(msg.sender == owner, "only owner can");
        _;
    }

    function setOwner (address _addrOwner) public onlyOwner {
        owner = _addrOwner;
    
    }
    function setPool (address _poolAddr) public onlyOwner {
        pool = ILendingPool(_poolAddr);
    }

    function stake (address _asset, uint256 _amount, address _beneficiar ) public override  {
        pool.deposit(_asset, _amount, _beneficiar, 0);
    }


    function unstake (address _asset, uint256 _amount, address _to  ) public override  returns (uint256) {
        pool.withdraw(_asset, _amount, _to);
    }

    function removeLiquidity (uint256 _amount) public override {

    }

    function addLiquidity (uint256 _amount) public override {

    }


}
