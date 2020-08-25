pragma solidity ^0.6.6;


interface IOracleAdapter {

  function setAggregator(
    bytes32 _symbolA,
    bytes32 _symbolB,
    address _aggregator,
    uint8 _decimalsA,
    uint8 _decimalsB
  ) external;
  function getRate (bytes32[] calldata path) external view returns (uint256);
  function getAddedDecimals (bytes32 _symbol) external view returns (uint256);


  event SetAggregator(bytes32 _symbolA, bytes32 _symbolB, address _aggregator, uint8 _decimalsA, uint8 _decimalsB);
}