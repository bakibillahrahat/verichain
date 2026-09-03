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
        var consumerCode = document.getElementById('consumerCode').value.trim();

        if (!consumerCode) {
            if (window.AppNotification) {
                window.AppNotification('warning', 'Please enter your Consumer Code to inspect history.');
            } else {
                alert('Please enter your Consumer Code to inspect history.');
            }
            return;
        }

        var account = '0x0000000000000000000000000000000000000000';
        try {
            if (window.ethereum) {
                var accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) account = accounts[0];
            }
        } catch (e) {}

        var $btn = $('.btn-register');
        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin mr-2"></i> Querying Blockchain Ledger...');

        App.contracts.product.deployed().then(function(instance) {
            return instance.getPurchaseHistory(web3.fromAscii(consumerCode), { from: account });
        }).then(function(result) {
            $btn.prop('disabled', false).html('<i class="fa fa-history mr-2"></i> Inspect Purchase History');

            var productSNs = result[0];
            var sellerCodes = result[1];
            var mfrCodes = result[2];

            var count = 0;
            var html = "";

            for (var i = 0; i < productSNs.length; i++) {
                var sn = window.cleanAscii(productSNs[i]);
                var seller = window.cleanAscii(sellerCodes[i]);
                var mfr = window.cleanAscii(mfrCodes[i]);

                if (!sn || sn === "") continue;

                count++;
                html += "<tr>";
                html += "<td><strong>" + count + "</strong></td>";
                html += "<td><code>" + sn + "</code></td>";
                html += "<td>" + (seller || 'Direct') + "</td>";
                html += "<td>" + (mfr || 'Certified Manufacturer') + "</td>";
                html += "<td><span class='badge badge-success'><i class='fa fa-check-circle mr-1'></i> Verified</span></td>";
                html += "</tr>";
            }

            if (count === 0) {
                html = "<tr><td colspan='5' class='text-center text-muted py-4'><i class='fa fa-history mr-2'></i> No purchased products recorded for consumer ID <strong>" + consumerCode + "</strong>.</td></tr>";
            }

            document.getElementById('logdata').innerHTML = html;
            document.getElementById('add').innerHTML = (account && account.length > 10) ? (account.substring(0, 6) + '...' + account.substring(account.length - 4)) : 'View Query';

            if (window.AppNotification) {
                window.AppNotification('info', 'Found ' + count + ' authenticated purchases for consumer ' + consumerCode);
            }

        }).catch(function(err) {
            $btn.prop('disabled', false).html('<i class="fa fa-history mr-2"></i> Inspect Purchase History');
            console.error(err);
            var msg = err.message || err;
            if (window.AppNotification) {
                window.AppNotification('error', 'Query failed: ' + msg);
            } else {
                alert('Query failed: ' + msg);
            }
        });
    }
};

$(function() {
    App.init();
});