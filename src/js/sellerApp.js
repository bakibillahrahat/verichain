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

        $(document).on('click','.btn-register',App.registerProduct);
    },

    registerProduct: function(event) {
        event.preventDefault();

        var productInstance;

        var sellerName = document.getElementById('SellerName').value;
        var sellerBrand = document.getElementById('SellerBrand').value;
        var sellerCode = document.getElementById('SellerCode').value;
        var sellerPhoneNumber = document.getElementById('SellerPhoneNumber').value;
        var sellerManager = document.getElementById('SellerManager').value;
        var sellerAddress = document.getElementById('SellerAddress').value;
        var ManufacturerId = document.getElementById('ManufacturerId').value;
       
        
        //window.ethereum.enable();
        web3.eth.getAccounts(function(error,accounts){

            if(error) {
                console.log(error);
            }

            console.log(accounts);
            var account=accounts[0];
            // console.log(account);

            App.contracts.product.deployed().then(function(instance){
                productInstance=instance;
                return productInstance.addSeller(web3.fromAscii(ManufacturerId),web3.fromAscii(sellerName),web3.fromAscii(sellerBrand), web3.fromAscii(sellerCode), sellerPhoneNumber, web3.fromAscii(sellerManager), web3.fromAscii(sellerAddress), {from:account});
             }).then(function(result){
                console.log(result);
                document.getElementById('SellerName').value='';
                document.getElementById('SellerBrand').value='';
                document.getElementById('SellerCode').value='';
                document.getElementById('SellerPhoneNumber').value='';
                document.getElementById('SellerManager').value='';
                document.getElementById('SellerAddress').value='';
                document.getElementById('ManufacturerId').value='';
                window.location.reload();
            }).catch(function(err){
                console.log(err.message);
            });
        });
    }
};

$(function() {
    App.init();
});