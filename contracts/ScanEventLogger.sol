// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

interface IProductRegistryMinimal {
    function getProduct(uint256 productId) external view returns (
        uint256, string memory, string memory, string memory, uint256, address, uint256, string memory, bytes32, uint8
    );
}

/**
 * @title ScanEventLogger
 * @dev Immutable scan event logging.
 */
contract ScanEventLogger {
    struct ScanEvent {
        uint256 scanId;
        uint256 productId;
        address scanner;
        uint256 timestamp;
        bytes32 locationHash;
        uint256 nonce;
    }

    IProductRegistryMinimal public productRegistry;

    mapping(uint256 => ScanEvent[]) private productScans;
    mapping(uint256 => mapping(address => uint256)) private scannerNonceTracker;
    uint256 private scanCounter;

    event ProductScanned(
        uint256 indexed scanId,
        uint256 indexed productId,
        address indexed scanner,
        uint256 timestamp,
        bytes32 locationHash
    );

    constructor(address _productRegistryAddress) {
        productRegistry = IProductRegistryMinimal(_productRegistryAddress);
    }

    /**
     * @notice Log a product scan
     */
    function logScan(uint256 productId, bytes32 locationHash, uint256 nonce) external {
        // Will revert if product doesn't exist
        productRegistry.getProduct(productId);
        
        uint256 lastNonce = scannerNonceTracker[productId][msg.sender];
        require(nonce > lastNonce, "Nonce must be strictly greater than previous nonce");
        
        scannerNonceTracker[productId][msg.sender] = nonce;

        scanCounter++;
        ScanEvent memory newScan = ScanEvent({
            scanId: scanCounter,
            productId: productId,
            scanner: msg.sender,
            timestamp: block.timestamp,
            locationHash: locationHash,
            nonce: nonce
        });

        productScans[productId].push(newScan);

        emit ProductScanned(scanCounter, productId, msg.sender, block.timestamp, locationHash);
    }

    function getScanHistory(uint256 productId) external view returns (ScanEvent[] memory) {
        return productScans[productId];
    }

    function getScanCount(uint256 productId) external view returns (uint256) {
        return productScans[productId].length;
    }

    function getLastScan(uint256 productId) external view returns (ScanEvent memory) {
        require(productScans[productId].length > 0, "No scans for product");
        return productScans[productId][productScans[productId].length - 1];
    }
}
