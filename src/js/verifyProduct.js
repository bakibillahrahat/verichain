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
        $(document).on('click', '.btn-register', App.getData);
    },

    getData: async function(event) {
        event.preventDefault();

        var productSN = document.getElementById('productSN').value.trim();
        var consumerCode = document.getElementById('consumerCode').value.trim();

        if (!productSN) {
            if (window.AppNotification) {
                window.AppNotification('warning', 'Please scan a QR code or enter a Product Serial Number.');
            } else {
                alert('Please scan a QR code or enter a Product Serial Number.');
            }
            return;
        }

        var account = '0x0000000000000000000000000000000000000000';
        try {
            if (window.ethereum) {
                var accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    account = accounts[0];
                }
            }
        } catch (e) {}

        var $btn = $('.btn-register');
        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin mr-2"></i> Querying Ethereum Ledger...');

        App.contracts.product.deployed().then(async function(instance) {
            var snBytes = web3.fromAscii(productSN);
            var consumerBytes = consumerCode ? web3.fromAscii(consumerCode) : '0x0000000000000000000000000000000000000000000000000000000000000000';

            // Check if manufactured
            var mfrBytes = await instance.productsManufactured.call(snBytes);
            var mfrId = window.cleanAscii(mfrBytes);

            // Check if assigned to seller
            var sellerBytes = await instance.productsForSale.call(snBytes);
            var sellerId = window.cleanAscii(sellerBytes);

            // Check if sold to consumer
            var soldBytes = await instance.productsSold.call(snBytes);
            var soldConsumerId = window.cleanAscii(soldBytes);

            // Standard boolean verification check
            var isSoldToThisConsumer = false;
            if (consumerCode) {
                isSoldToThisConsumer = await instance.verifyProduct.call(snBytes, consumerBytes);
            }

            $btn.prop('disabled', false).html('<i class="fa fa-search mr-2"></i> Query Blockchain for Authenticity');

            var html = "<tr><td class='text-center py-4'>";

            if (mfrId && mfrId !== "" && mfrId !== "0") {
                // Product exists on blockchain
                if (isSoldToThisConsumer) {
                    html += "<div class='badge-genuine d-inline-flex align-items-center mb-3'><i class='fa fa-check-circle mr-2'></i> 100% GENUINE AUTHENTIC PRODUCT</div>";
                    html += "<p class='text-success font-weight-bold'>Successfully verified on the Ethereum blockchain.</p>";
                } else if (consumerCode && soldConsumerId && soldConsumerId !== consumerCode) {
                    // Consumer mismatch! Potential counterfeit / stolen serial number
                    html += "<div class='badge-fake d-inline-flex align-items-center mb-3'><i class='fa fa-times-circle mr-2'></i> OWNERSHIP MISMATCH / SUSPICIOUS</div>";
                    html += "<p class='text-danger font-weight-bold'>This serial number is registered on blockchain to a different consumer ID (" + soldConsumerId + ").</p>";
                } else {
                    // Product is genuine but pre-sale or verified by general SN lookup
                    html += "<div class='badge-genuine d-inline-flex align-items-center mb-3'><i class='fa fa-check-circle mr-2'></i> GENUINE REGISTERED PRODUCT</div>";
                    html += "<p class='text-success font-weight-bold'>Legitimate origin confirmed on Ethereum blockchain.</p>";
                }

                // Provenance metadata card
                html += "<div class='mt-3 text-left p-3' style='background:rgba(255,255,255,0.05); border-radius:8px; display:inline-block; max-width:480px; width:100%;'>";
                html += "<div class='row small text-muted'>";
                html += "<div class='col-6 mb-2'><strong>Serial Number:</strong><br><span class='text-light font-weight-bold'>" + productSN + "</span></div>";
                html += "<div class='col-6 mb-2'><strong>Manufacturer ID:</strong><br><span class='text-light'>" + mfrId + "</span></div>";
                html += "<div class='col-6'><strong>Authorized Seller:</strong><br><span class='text-light'>" + (sellerId || 'In Factory') + "</span></div>";
                html += "<div class='col-6'><strong>Status:</strong><br><span class='text-light'>" + (soldConsumerId ? 'Sold to ' + soldConsumerId : 'Available for Sale') + "</span></div>";
                html += "</div></div>";

            } else {
                // Product SN not found anywhere on the blockchain
                html += "<div class='badge-fake d-inline-flex align-items-center mb-3'><i class='fa fa-times-circle mr-2'></i> COUNTERFEIT / UNVERIFIED PRODUCT</div>";
                html += "<p class='text-danger font-weight-bold'>Warning: Serial number '" + productSN + "' was NEVER registered by any certified manufacturer on the blockchain.</p>";
            }

            html += "</td></tr>";

            document.getElementById('logdata').innerHTML = html;
            document.getElementById('add').innerHTML = (account && account.length > 10) ? (account.substring(0, 6) + '...' + account.substring(account.length - 4)) : 'View Query';

            if (window.AppNotification) {
                if (mfrId) {
                    window.AppNotification('success', 'Blockchain query complete: Genuine manufacturer origin found.');
                } else {
                    window.AppNotification('error', 'Blockchain query complete: Product serial number not registered on ledger.');
                }
            }

        }).catch(function(err) {
            $btn.prop('disabled', false).html('<i class="fa fa-search mr-2"></i> Query Blockchain for Authenticity');
            console.error(err);
            var msg = err.message || err;
            if (window.AppNotification) {
                window.AppNotification('error', 'Verification query failed: ' + msg);
            } else {
                alert('Verification query failed: ' + msg);
            }
        });
    }
};

$(function() {
    App.init();
});