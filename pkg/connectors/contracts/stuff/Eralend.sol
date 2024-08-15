// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
}

interface IUnitroller {
    function enterMarkets(address[] calldata rfTokens) external returns (uint[] memory);
    function exitMarket(address rfToken) external returns (uint);
}

interface ICToken {
    function balanceOf(address owner) external view returns (uint);
    function exchangeRateStored() external view returns (uint);
    function borrowBalanceStored(address account) external view returns (uint);
    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow() external payable returns (uint);
    function repayBorrowBehalf(address borrower) external payable returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
    function accrueInterest() external returns (uint);
}