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

        var manufacturerID = document.getElementById('manufacturerID').value.trim();
        var productName = document.getElementById('productName').value.trim();
        var productSN = document.getElementById('productSN').value.trim();
        var productBrand = document.getElementById('productBrand').value.trim();
        var productPrice = document.getElementById('productPrice').value.trim();

        if (!manufacturerID || !productName || !productSN || !productBrand || !productPrice) {
            if (window.AppNotification) {
                window.AppNotification('warning', 'Please fill in all required product fields.');
            } else {
                alert('Please fill in all required product fields.');
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

        if (window.AppNotification) {
            window.AppNotification('info', 'Submitting product registration to Ethereum blockchain...', 4000);
        }

        var $btn = $('.btn-register');
        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin mr-2"></i> Registering on Blockchain...');

        App.contracts.product.deployed().then(function(instance) {
            return instance.addProduct(
                web3.fromAscii(manufacturerID),
                web3.fromAscii(productName),
                web3.fromAscii(productSN),
                web3.fromAscii(productBrand),
                productPrice,
                { from: account }
            );
        }).then(function(result) {
            $btn.prop('disabled', false).html('<i class="fa fa-check-circle mr-2"></i> Register Product on Blockchain & Generate QR');

            var txHash = result.tx ? (result.tx.substring(0, 10) + '...' + result.tx.substring(result.tx.length - 8)) : '';
            if (window.AppNotification) {
                window.AppNotification('success', 'Product registered successfully! Tx: ' + txHash, 8000);
            }

            // Also trigger QR generator before clearing
            if (typeof fetchQR === 'function') {
                fetchQR();
            }

            // Clear inputs after slight delay so QR can use productSN
            setTimeout(function() {
                document.getElementById('manufacturerID').value = '';
                document.getElementById('productName').value = '';
                document.getElementById('productBrand').value = '';
                document.getElementById('productPrice').value = '';
            }, 500);

        }).catch(function(err) {
            $btn.prop('disabled', false).html('<i class="fa fa-check-circle mr-2"></i> Register Product on Blockchain & Generate QR');
            console.error(err);
            var msg = err.message || err;
            if (window.AppNotification) {
                window.AppNotification('error', 'Registration failed: ' + msg, 8000);
            } else {
                alert('Registration failed: ' + msg);
            }
        });
    }
};

$(function() {
    App.init();
});
