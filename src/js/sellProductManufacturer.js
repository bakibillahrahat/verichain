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

        var productSN = document.getElementById('productSN').value.trim();
        var sellerCode = document.getElementById('sellerCode').value.trim();

        if (!productSN || !sellerCode) {
            if (window.AppNotification) {
                window.AppNotification('warning', 'Please enter both Product Serial Number and Seller Code.');
            } else {
                alert('Please enter both Product Serial Number and Seller Code.');
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
        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin mr-2"></i> Assigning Inventory on Chain...');

        if (window.AppNotification) {
            window.AppNotification('info', 'Assigning product to authorized seller on Ethereum...');
        }

        App.contracts.product.deployed().then(function(instance) {
            return instance.manufacturerSellProduct(
                web3.fromAscii(productSN),
                web3.fromAscii(sellerCode),
                { from: account }
            );
        }).then(function(result) {
            $btn.prop('disabled', false).html('<i class="fa fa-truck mr-2"></i> Transfer Product to Seller');
            var txHash = result.tx ? (result.tx.substring(0, 10) + '...' + result.tx.substring(result.tx.length - 8)) : '';

            if (window.AppNotification) {
                window.AppNotification('success', 'Product transferred to seller ' + sellerCode + ' successfully! Tx: ' + txHash, 8000);
            }

            document.getElementById('productSN').value = '';
            document.getElementById('sellerCode').value = '';

        }).catch(function(err) {
            $btn.prop('disabled', false).html('<i class="fa fa-truck mr-2"></i> Transfer Product to Seller');
            console.error(err);
            var msg = err.message || err;
            if (window.AppNotification) {
                window.AppNotification('error', 'Transfer failed: ' + msg, 8000);
            } else {
                alert('Transfer failed: ' + msg);
            }
        });
    }
};

$(function() {
    App.init();
});