// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

/**
 * @title AuthorizationRegistry
 * @dev Role-based access control for the supply chain.
 */
contract AuthorizationRegistry {
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant MANUFACTURER = keccak256("MANUFACTURER");
    bytes32 public constant DISTRIBUTOR = keccak256("DISTRIBUTOR");
    bytes32 public constant RETAILER = keccak256("RETAILER");

    mapping(address => bytes32) private roles;

    event RoleGranted(address indexed account, bytes32 indexed role, address indexed sender);
    event RoleRevoked(address indexed account, bytes32 indexed role, address indexed sender);

    constructor() {
        _grantRole(ADMIN, msg.sender);
    }

    modifier onlyRole(bytes32 role) {
        require(roles[msg.sender] == role, "AuthorizationRegistry: missing role");
        _;
    }

    function _grantRole(bytes32 role, address account) internal {
        roles[account] = role;
        emit RoleGranted(account, role, msg.sender);
    }

    /**
     * @notice Register a manufacturer (only ADMIN)
     */
    function registerManufacturer(address account) external onlyRole(ADMIN) {
        require(roles[account] == 0, "Account already has a role");
        _grantRole(MANUFACTURER, account);
    }

    /**
     * @notice Register a distributor (only MANUFACTURER)
     */
    function registerDistributor(address account) external onlyRole(MANUFACTURER) {
        require(roles[account] == 0, "Account already has a role");
        _grantRole(DISTRIBUTOR, account);
    }

    /**
     * @notice Register a retailer (only DISTRIBUTOR)
     */
    function registerRetailer(address account) external onlyRole(DISTRIBUTOR) {
        require(roles[account] == 0, "Account already has a role");
        _grantRole(RETAILER, account);
    }

    /**
     * @notice Revoke a role from an account
     */
    function revokeRole(address account) external {
        bytes32 targetRole = roles[account];
        require(targetRole != 0, "Account has no role");
        
        if (targetRole == MANUFACTURER) {
            require(roles[msg.sender] == ADMIN, "Only ADMIN can revoke MANUFACTURER");
        } else if (targetRole == DISTRIBUTOR) {
            require(roles[msg.sender] == MANUFACTURER, "Only MANUFACTURER can revoke DISTRIBUTOR");
        } else if (targetRole == RETAILER) {
            require(roles[msg.sender] == DISTRIBUTOR, "Only DISTRIBUTOR can revoke RETAILER");
        } else if (targetRole == ADMIN) {
            require(msg.sender == account, "ADMIN can only revoke themselves");
        } else {
            revert("Invalid role");
        }
        
        roles[account] = 0;
        emit RoleRevoked(account, targetRole, msg.sender);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return roles[account] == role;
    }

    function getRole(address account) external view returns (bytes32) {
        return roles[account];
    }
}
