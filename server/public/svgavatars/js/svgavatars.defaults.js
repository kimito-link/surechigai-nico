/************************************************************************************************
 * svgavatars.defaults.js - すれちがい通信アプリ用に設定変更済み
 *************************************************************************************************/
if (window.jQuery === undefined) {
	window.alert('SVG Avatars Script requires jQuery (https://jquery.com)!');
	throw new Error('SVG Avatars Script requires jQuery!');
}

function svgAvatarsOptions() {
	"use strict";

	var options = {

		pathToFolder: '/svgavatars/',

		downloadingName: 'avatar',

		showGender: 'both',

		saturationDelta: 0.1,

		brightnessDelta: 0.06,

		saveFileFormat: 'png',

		savingSize: 400,

		pngFirstDownloadSize: 200,

		pngSecondDownloadSize: 400,

		svgDownloadSize: 400,

		pngiOSDownloadSize: 500,

		pngWin8TabletDownloadSize: 400,

		gravatarSize: 200,

		hideSvgDownloadOnAndroid: true,

		// ダウンロードボタンは非表示（サーバー保存のみ）
		hidePngFirstDownloadButton: true,

		hidePngSecondDownloadButton: true,

		hideSvgDownloadButton: true,

		hideGravatar: true,

		colorScheme: 'light',

		hideShareButton: true,

		twitter: false,

		pinterest: false,

		shareLink: '',

		shareTitle: '',

		shareDescription: '',

		shareCredit: '',

		// サーバー保存モード
		integration: 'custom',

		zooming: 0,

		debug: true

	};

	return options;
}
