App = {
    web3Provider: null,
    contracts: {},

    init: async function() {
        return await App.initWeb3();
    },

    initWeb3: async function() {
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
            } catch (error) {
                console.error("User denied account access", error);
            }
        } else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        } else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }

        web3 = new Web3(App.web3Provider);
        return App.initContract();
    },

    initContract: function() {

        $.getJSON('product.json',function(data){

            var productArtifact=data;
            App.contracts.product=TruffleContract(productArtifact);
            App.contracts.product.setProvider(App.web3Provider);
        });

        return App.bindEvents();
    },

    bindEvents: function() {

        $(document).on('click','.btn-register',App.getData);
    },

    getData:function(event) {
        event.preventDefault();
        var productSN = document.getElementById('productSN').value;
        var consumerCode = document.getElementById('consumerCode').value;
        var productInstance;
        //window.ethereum.enable();
        web3.eth.getAccounts(function(error,accounts){

            if(error) {
                console.log(error);
            }

            var account=accounts[0];
            // console.log(account);
            App.contracts.product.deployed().then(function(instance){

                productInstance=instance;
                return productInstance.verifyProduct(web3.fromAscii(productSN), web3.fromAscii(consumerCode),{from:account});

            }).then(function(result){
                
                // console.log(result);

                var t= "";

                var tr="<tr><td class='text-center py-4'>";
                if(result){
                    tr+="<div class='badge-genuine d-inline-flex align-items-center'><i class='fa fa-check-circle mr-2'></i> GENUINE AUTHENTIC PRODUCT</div><p class='text-muted mt-2 mb-0'><small>Cryptographically verified on the Ethereum blockchain.</small></p>";
                }else{
                    tr+="<div class='badge-fake d-inline-flex align-items-center'><i class='fa fa-times-circle mr-2'></i> COUNTERFEIT / UNVERIFIED PRODUCT</div><p class='text-muted mt-2 mb-0'><small>Product serial number or consumer ID mismatch on the blockchain.</small></p>";
                }
                tr+="</td></tr>";
                t+=tr;

                document.getElementById('logdata').innerHTML = t;
                document.getElementById('add').innerHTML=account;
           }).catch(function(err){
               console.log(err.message);
           })
        })
    }
};

$(function() {
    App.init();
});