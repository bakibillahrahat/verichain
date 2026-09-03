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
        var manufacturerCode = document.getElementById('manufacturerCode').value.trim();

        if (!manufacturerCode) {
            if (window.AppNotification) {
                window.AppNotification('warning', 'Please enter a Manufacturer Code.');
            } else {
                alert('Please enter a Manufacturer Code.');
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
        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin mr-2"></i> Querying Sellers...');

        App.contracts.product.deployed().then(function(instance) {
            return instance.querySellersList(web3.fromAscii(manufacturerCode), { from: account });
        }).then(function(result) {
            $btn.prop('disabled', false).html('<i class="fa fa-search mr-2"></i> Query Authorized Sellers');

            var sellerIds = result[0];
            var count = 0;
            var html = "";

            for (var i = 0; i < sellerIds.length; i++) {
                var sid = sellerIds[i].toNumber ? sellerIds[i].toNumber() : sellerIds[i];
                var name = window.cleanAscii(result[1][i]);
                var brand = window.cleanAscii(result[2][i]);
                var code = window.cleanAscii(result[3][i]);
                var num = result[4][i].toNumber ? result[4][i].toNumber() : result[4][i];
                var manager = window.cleanAscii(result[5][i]);
                var address = window.cleanAscii(result[6][i]);

                if (!code || code === "") continue;

                count++;
                html += "<tr>";
                html += "<td><strong>#" + sid + "</strong></td>";
                html += "<td>" + name + "</td>";
                html += "<td>" + brand + "</td>";
                html += "<td><code>" + code + "</code></td>";
                html += "<td>" + num + "</td>";
                html += "<td>" + manager + "</td>";
                html += "<td>" + address + "</td>";
                html += "</tr>";
            }

            if (count === 0) {
                html = "<tr><td colspan='7' class='text-center text-muted py-4'><i class='fa fa-user-slash mr-2'></i> No authorized sellers found under manufacturer code <strong>" + manufacturerCode + "</strong>.</td></tr>";
            }

            document.getElementById('logdata').innerHTML = html;
            document.getElementById('add').innerHTML = (account && account.length > 10) ? (account.substring(0, 6) + '...' + account.substring(account.length - 4)) : 'View Query';

            if (window.AppNotification) {
                window.AppNotification('info', 'Found ' + count + ' authorized sellers for manufacturer ' + manufacturerCode);
            }

        }).catch(function(err) {
            $btn.prop('disabled', false).html('<i class="fa fa-search mr-2"></i> Query Authorized Sellers');
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