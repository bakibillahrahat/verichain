(function($) {

	"use strict";

	$(document).ready(function() {
		if (window.ethereum) {
			window.ethereum.request({ method: 'eth_accounts' }).then(function(accounts) {
				if (accounts && accounts.length > 0) {
					var addr = accounts[0];
					var shortAddr = addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
					$('#walletAddressBadge').text(shortAddr);
				}
			}).catch(function(e) { console.log(e); });

			// Listen for account change
			if (window.ethereum.on) {
				window.ethereum.on('accountsChanged', function (accounts) {
					if (accounts && accounts.length > 0) {
						var addr = accounts[0];
						var shortAddr = addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
						$('#walletAddressBadge').text(shortAddr);
					}
				});
			}
		}
	});

})(jQuery);
