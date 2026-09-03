const product = artifacts.require('product');
const AuthorizationRegistry = artifacts.require('AuthorizationRegistry');
const ProductRegistry = artifacts.require('ProductRegistry');
const ProvenanceTracker = artifacts.require('ProvenanceTracker');
const ScanEventLogger = artifacts.require('ScanEventLogger');

module.exports = async function(deployer) {
    await deployer.deploy(product);
    
    await deployer.deploy(AuthorizationRegistry);
    const authRegistry = await AuthorizationRegistry.deployed();
    
    await deployer.deploy(ProductRegistry, authRegistry.address);
    const productRegistry = await ProductRegistry.deployed();
    
    await deployer.deploy(ProvenanceTracker, productRegistry.address, authRegistry.address);
    const provenanceTracker = await ProvenanceTracker.deployed();
    
    await deployer.deploy(ScanEventLogger, productRegistry.address);
    
    await productRegistry.setProvenanceTracker(provenanceTracker.address);
};