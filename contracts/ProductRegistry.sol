// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

interface IAuthorizationRegistry {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRole(address account) external view returns (bytes32);
}

/**
 * @title ProductRegistry
 * @dev Product registration with fingerprinting.
 */
contract ProductRegistry {
    enum Status { Registered, InTransit, WithRetailer, Sold, Flagged }

    struct ProductItem {
        uint256 productId;
        string productSN;
        string productName;
        string productBrand;
        uint256 productPrice;
        address manufacturer;
        uint256 registrationTimestamp;
        string batchId;
        bytes32 fingerprint;
        Status status;
    }

    uint256 private _productIdCounter;
    IAuthorizationRegistry public authRegistry;
    bytes32 public constant MANUFACTURER = keccak256("MANUFACTURER");

    address public provenanceTracker;

    mapping(uint256 => ProductItem) private products;
    mapping(string => uint256) private snToProductId;

    event ProductRegistered(
        uint256 indexed productId,
        string indexed productSN,
        address indexed manufacturer,
        bytes32 fingerprint,
        uint256 timestamp
    );

    constructor(address _authRegistryAddress) {
        authRegistry = IAuthorizationRegistry(_authRegistryAddress);
    }

    modifier onlyManufacturer() {
        require(authRegistry.hasRole(MANUFACTURER, msg.sender), "Caller is not a manufacturer");
        _;
    }

    modifier onlyProvenanceTracker() {
        require(msg.sender == provenanceTracker, "Only Provenance Tracker can call this");
        _;
    }

    function setProvenanceTracker(address _tracker) external {
        require(provenanceTracker == address(0), "Tracker already set");
        provenanceTracker = _tracker;
    }

    /**
     * @notice Register a new product
     */
    function registerProduct(
        string calldata productSN,
        string calldata productName,
        string calldata productBrand,
        uint256 productPrice,
        string calldata batchId
    ) external onlyManufacturer returns (uint256) {
        require(snToProductId[productSN] == 0, "Product SN already registered");
        require(bytes(productSN).length > 0, "SN cannot be empty");

        _productIdCounter++;
        uint256 newId = _productIdCounter;

        bytes32 fingerprint = keccak256(
            abi.encodePacked(productSN, msg.sender, productName, productBrand, batchId, block.timestamp)
        );

        products[newId] = ProductItem({
            productId: newId,
            productSN: productSN,
            productName: productName,
            productBrand: productBrand,
            productPrice: productPrice,
            manufacturer: msg.sender,
            registrationTimestamp: block.timestamp,
            batchId: batchId,
            fingerprint: fingerprint,
            status: Status.Registered
        });

        snToProductId[productSN] = newId;

        emit ProductRegistered(newId, productSN, msg.sender, fingerprint, block.timestamp);

        return newId;
    }

    function getProduct(uint256 productId) external view returns (ProductItem memory) {
        require(products[productId].productId != 0, "Product does not exist");
        return products[productId];
    }

    function getProductBySN(string calldata productSN) external view returns (ProductItem memory) {
        uint256 id = snToProductId[productSN];
        require(id != 0, "Product SN does not exist");
        return products[id];
    }

    function getFingerprint(uint256 productId) external view returns (bytes32) {
        require(products[productId].productId != 0, "Product does not exist");
        return products[productId].fingerprint;
    }

    function updateProductState(uint256 productId, bytes32 newFingerprint, Status newStatus) external onlyProvenanceTracker {
        require(products[productId].productId != 0, "Product does not exist");
        products[productId].fingerprint = newFingerprint;
        products[productId].status = newStatus;
    }
}
