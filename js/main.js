function getUrlParams() {
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
}

