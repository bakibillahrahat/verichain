/**
 * VeriChain — Global Frontend Utilities & Web3 Helper
 */
(function($) {
	"use strict";

	// Global string cleaner for Solidity bytes32
	window.cleanAscii = function(hexOrAscii) {
		if (!hexOrAscii) return "";
		try {
			if (typeof hexOrAscii === 'string' && hexOrAscii.startsWith('0x')) {
				if (typeof web3 !== 'undefined' && web3.toAscii) {
					hexOrAscii = web3.toAscii(hexOrAscii);
				}
			}
			return String(hexOrAscii).replace(/\u0000/g, '').trim();
		} catch (e) {
			return String(hexOrAscii).replace(/\u0000/g, '').trim();
		}
	};

	// Global Notification Banner
	window.AppNotification = function(type, message, duration) {
		duration = duration || 5000;
		var alertClass = 'alert-info';
		var icon = 'fa-info-circle';
		if (type === 'success') {
			alertClass = 'alert-success';
			icon = 'fa-check-circle';
		} else if (type === 'error' || type === 'danger') {
			alertClass = 'alert-danger';
			icon = 'fa-exclamation-triangle';
		} else if (type === 'warning') {
			alertClass = 'alert-warning';
			icon = 'fa-exclamation-circle';
		}

		var container = document.getElementById('appNotificationContainer');
		if (!container) {
			container = document.createElement('div');
			container.id = 'appNotificationContainer';
			container.style.position = 'fixed';
			container.style.top = '70px';
			container.style.right = '20px';
			container.style.zIndex = '99999';
			container.style.maxWidth = '420px';
			container.style.width = 'calc(100% - 40px)';
			document.body.appendChild(container);
		}

		var alertEl = document.createElement('div');
		alertEl.className = 'alert ' + alertClass + ' alert-dismissible fade show shadow-lg';
		alertEl.style.borderRadius = '10px';
		alertEl.style.border = '1px solid rgba(255,255,255,0.15)';
		alertEl.style.backdropFilter = 'blur(10px)';
		alertEl.style.fontSize = '0.9rem';
		alertEl.innerHTML = '<i class="fa ' + icon + ' mr-2"></i> ' + message +
			'<button type="button" class="close" data-dismiss="alert" aria-label="Close" style="outline:none;">' +
			'<span aria-hidden="true">&times;</span></button>';

		container.appendChild(alertEl);

		if (duration > 0) {
			setTimeout(function() {
				$(alertEl).alert('close');
			}, duration);
		}
	};

	// Global account requester
	window.ensureAccount = async function() {
		if (window.ethereum) {
			try {
				var accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
				if (accounts && accounts.length > 0) {
					updateBadge(accounts[0]);
					return accounts[0];
				}
			} catch (err) {
				window.AppNotification('error', 'MetaMask connection rejected: ' + (err.message || err));
				throw err;
			}
		} else {
			window.AppNotification('warning', 'MetaMask not detected. Please install MetaMask to interact with the blockchain.');
			throw new Error("No web3 provider");
		}
	};

	function updateBadge(addr) {
		if (addr && addr.length > 10) {
			var shortAddr = addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
			$('#walletAddressBadge').text(shortAddr).attr('title', addr);
			$('.status-dot').css('background', '#00c853');
		} else {
			$('#walletAddressBadge').text('Connect MetaMask');
			$('.status-dot').css('background', '#ff9100');
		}
	}

	$(document).ready(function() {
		// Check current accounts
		if (window.ethereum) {
			window.ethereum.request({ method: 'eth_accounts' }).then(function(accounts) {
				if (accounts && accounts.length > 0) {
					updateBadge(accounts[0]);
				} else {
					updateBadge(null);
				}
			}).catch(function(e) { console.log(e); });

			// Click badge to connect
			$(document).on('click', '#walletAddressBadge, .wallet-badge', function(e) {
				e.preventDefault();
				window.ensureAccount();
			});

			// Listen for account change
			window.ethereum.on('accountsChanged', function (accounts) {
				if (accounts && accounts.length > 0) {
					updateBadge(accounts[0]);
					window.AppNotification('info', 'Active account changed: ' + accounts[0].substring(0, 6) + '...');
				} else {
					updateBadge(null);
					window.AppNotification('warning', 'MetaMask disconnected.');
				}
			});

			// Listen for network change
			if (window.ethereum.on) {
				window.ethereum.on('chainChanged', function (chainId) {
					window.location.reload();
				});
			}
		} else {
			updateBadge(null);
		}
	});

})(jQuery);
