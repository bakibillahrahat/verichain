App = {
    web3Provider: null,
    contracts: {},

    init: async function() {
        return await App.initWeb3();
    },

    initWeb3: async function() {
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
        } else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        } else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }

        web3 = new Web3(App.web3Provider);
        return App.initContract();
    },

    initContract: function() {
        $.getJSON('product.json', function(data) {
            var productArtifact = data;
            App.contracts.product = TruffleContract(productArtifact);
            App.contracts.product.setProvider(App.web3Provider);
        }).fail(function() {
            if (window.AppNotification) {
                window.AppNotification('error', 'Failed to load product.json contract artifact.');
            }
        });

        return App.bindEvents();
    },

    bindEvents: function() {
        $(document).on('click', '.btn-register', App.registerProduct);
    },

    registerProduct: async function(event) {
        event.preventDefault();

        var sellerName = document.getElementById('SellerName').value.trim();
        var sellerBrand = document.getElementById('SellerBrand').value.trim();
        var sellerCode = document.getElementById('SellerCode').value.trim();
        var sellerPhoneNumber = document.getElementById('SellerPhoneNumber').value.trim();
        var sellerManager = document.getElementById('SellerManager').value.trim();
        var sellerAddress = document.getElementById('SellerAddress').value.trim();
        var ManufacturerId = document.getElementById('ManufacturerId').value.trim();

        if (!sellerName || !sellerBrand || !sellerCode || !sellerPhoneNumber || !sellerManager || !sellerAddress || !ManufacturerId) {
            if (window.AppNotification) {
                window.AppNotification('warning', 'Please fill in all seller registration fields.');
            } else {
                alert('Please fill in all seller registration fields.');
            }
            return;
        }

        var account;
        try {
            if (window.ensureAccount) {
                account = await window.ensureAccount();
            } else {
                var accounts = await new Promise(function(resolve, reject) {
                    web3.eth.getAccounts(function(err, res) {
                        if (err) reject(err); else resolve(res);
                    });
                });
                account = accounts[0];
            }
        } catch (e) {
            return;
        }

        if (!account) {
            if (window.AppNotification) window.AppNotification('error', 'No active MetaMask account found.');
            return;
        }

        var $btn = $('.btn-register');
        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin mr-2"></i> Registering Seller on Chain...');

        if (window.AppNotification) {
            window.AppNotification('info', 'Submitting seller registration transaction to Ethereum...');
        }

        App.contracts.product.deployed().then(function(instance) {
            return instance.addSeller(
                web3.fromAscii(ManufacturerId),
                web3.fromAscii(sellerName),
                web3.fromAscii(sellerBrand),
                web3.fromAscii(sellerCode),
                sellerPhoneNumber,
                web3.fromAscii(sellerManager),
                web3.fromAscii(sellerAddress),
                { from: account }
            );
        }).then(function(result) {
            $btn.prop('disabled', false).html('<i class="fa fa-check-circle mr-2"></i> Register Seller on Blockchain');
            var txHash = result.tx ? (result.tx.substring(0, 10) + '...' + result.tx.substring(result.tx.length - 8)) : '';

            if (window.AppNotification) {
                window.AppNotification('success', 'Seller registered successfully! Tx: ' + txHash, 8000);
            }

            document.getElementById('SellerName').value = '';
            document.getElementById('SellerBrand').value = '';
            document.getElementById('SellerCode').value = '';
            document.getElementById('SellerPhoneNumber').value = '';
            document.getElementById('SellerManager').value = '';
            document.getElementById('SellerAddress').value = '';
            document.getElementById('ManufacturerId').value = '';

        }).catch(function(err) {
            $btn.prop('disabled', false).html('<i class="fa fa-check-circle mr-2"></i> Register Seller on Blockchain');
            console.error(err);
            var msg = err.message || err;
            if (window.AppNotification) {
                window.AppNotification('error', 'Seller registration failed: ' + msg, 8000);
            } else {
                alert('Seller registration failed: ' + msg);
            }
        });
    }
};

$(function() {
    App.init();
});