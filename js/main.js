window.BowBuddy = window.BowBuddy || {
	clickCounter: 0,

	getUrlParams: function() {
		if (!window.location.search) {
			return {}
		}
		return window.location.search
			.substring(1)
			.split("&")
			.map((keyValueStr) => keyValueStr.split("="))
			.reduce((urlParams, keyValuePair) => {
				urlParams[keyValuePair[0]] = keyValuePair[1];
				return urlParams;
			}, {});
	},

	switchToFullscreen: function() {
		if ((++BowBuddy.clickCounter%2 === 0) & !document.fullscreenElement) {
			console.log("Init fullscreen...");
		
			if (document.documentElement.requestFullscreen) {
				document.documentElement.requestFullscreen();
			} else if (document.documentElement.webkitRequestFullscreen) {
				document.documentElement.webkitRequestFullscreen();
			}
		}
	}
};

