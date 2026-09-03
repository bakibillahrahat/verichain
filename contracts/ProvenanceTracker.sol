// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

interface IAuthRegistryInProvenance {
    function getRole(address account) external view returns (bytes32);
}

interface IProductRegistry {
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
    function getProduct(uint256 productId) external view returns (ProductItem memory);
    function updateProductState(uint256 productId, bytes32 newFingerprint, Status newStatus) external;
}

/**
 * @title ProvenanceTracker
 * @dev Ownership transfer and supply chain graph.
 */
contract ProvenanceTracker {
    enum EventType { ManufacturerToDistributor, DistributorToRetailer, RetailerToConsumer }

    struct TransferEvent {
        uint256 transferId;
        uint256 productId;
        address from;
        address to;
        uint256 timestamp;
        bytes32 locationHash;
        EventType eventType;
    }

    struct ProvenanceNode {
        address account;
        bytes32 role;
        uint256 timestamp;
    }

    IProductRegistry public productRegistry;
    IAuthRegistryInProvenance public authRegistry;

    bytes32 public constant MANUFACTURER = keccak256("MANUFACTURER");
    bytes32 public constant DISTRIBUTOR = keccak256("DISTRIBUTOR");
    bytes32 public constant RETAILER = keccak256("RETAILER");

    mapping(uint256 => address) private currentOwner;
    mapping(uint256 => TransferEvent[]) private productTransferHistory;
    uint256 private transferCounter;

    event ProductTransferred(
        uint256 indexed productId,
        address indexed from,
        address indexed to,
        uint256 timestamp,
        bytes32 locationHash,
        bytes32 newFingerprint
    );

    constructor(address _productRegistryAddress, address _authRegistryAddress) {
        productRegistry = IProductRegistry(_productRegistryAddress);
        authRegistry = IAuthRegistryInProvenance(_authRegistryAddress);
    }

    /**
     * @notice Transfer product ownership to the next authorized entity in the chain
     */
    function transferProduct(uint256 productId, address to, bytes32 locationHash) external {
        address owner = currentOwner[productId];
        IProductRegistry.ProductItem memory item = productRegistry.getProduct(productId);
        
        if (owner == address(0)) {
            require(item.manufacturer == msg.sender, "Sender does not own the product");
            owner = item.manufacturer;
        } else {
            require(owner == msg.sender, "Sender does not own the product");
        }

        bytes32 senderRole = authRegistry.getRole(msg.sender);
        bytes32 recipientRole = authRegistry.getRole(to);
        
        EventType eType;
        IProductRegistry.Status newStatus;

        if (senderRole == MANUFACTURER) {
            require(recipientRole == DISTRIBUTOR, "Recipient must be a DISTRIBUTOR");
            eType = EventType.ManufacturerToDistributor;
            newStatus = IProductRegistry.Status.InTransit;
        } else if (senderRole == DISTRIBUTOR) {
            require(recipientRole == RETAILER, "Recipient must be a RETAILER");
            eType = EventType.DistributorToRetailer;
            newStatus = IProductRegistry.Status.WithRetailer;
        } else if (senderRole == RETAILER) {
            // Transfer to consumer, consumer does not need a role
            eType = EventType.RetailerToConsumer;
            newStatus = IProductRegistry.Status.Sold;
        } else {
            revert("Invalid sender role for transfer");
        }

        bytes32 newFP = keccak256(abi.encodePacked(item.fingerprint, msg.sender, to, block.timestamp, locationHash));

        transferCounter++;
        TransferEvent memory newEvent = TransferEvent({
            transferId: transferCounter,
            productId: productId,
            from: msg.sender,
            to: to,
            timestamp: block.timestamp,
            locationHash: locationHash,
            eventType: eType
        });

        productTransferHistory[productId].push(newEvent);
        currentOwner[productId] = to;

        productRegistry.updateProductState(productId, newFP, newStatus);

        emit ProductTransferred(productId, msg.sender, to, block.timestamp, locationHash, newFP);
    }

    function getTransferHistory(uint256 productId) external view returns (TransferEvent[] memory) {
        return productTransferHistory[productId];
    }

    function getCurrentOwner(uint256 productId) external view returns (address) {
        address owner = currentOwner[productId];
        if (owner == address(0)) {
            IProductRegistry.ProductItem memory item = productRegistry.getProduct(productId);
            return item.manufacturer;
        }
        return owner;
    }

    function getProvenancePath(uint256 productId) external view returns (ProvenanceNode[] memory) {
        TransferEvent[] memory history = productTransferHistory[productId];
        IProductRegistry.ProductItem memory item = productRegistry.getProduct(productId);
        
        if (history.length == 0) {
            ProvenanceNode[] memory singleNode = new ProvenanceNode[](1);
            singleNode[0] = ProvenanceNode(item.manufacturer, authRegistry.getRole(item.manufacturer), item.registrationTimestamp);
            return singleNode;
        }

        ProvenanceNode[] memory path = new ProvenanceNode[](history.length + 1);
        
        path[0] = ProvenanceNode(item.manufacturer, authRegistry.getRole(item.manufacturer), item.registrationTimestamp);

        for (uint256 i = 0; i < history.length; i++) {
            address toAccount = history[i].to;
            path[i + 1] = ProvenanceNode(toAccount, authRegistry.getRole(toAccount), history[i].timestamp);
        }

        return path;
    }
}
