/**
 * Created by FLomka on 2018/12/23.
 *
 * User settings for background.
 **/

var backgroundSettingsObject = {}
backgroundSettingsObject.video = document.querySelector(".videoground")
backgroundSettingsObject.backgroundRoute = "url('../Default Content/imgs/1.jpg')"
backgroundSettingsObject.videoRoute = "Default Content/video/1-test.webm"
backgroundSettingsObject.cusvideoRoute = ""
backgroundSettingsObject.random = false
backgroundSettingsObject.currentImg = ""
backgroundSettingsObject.speed = 1
backgroundSettingsObject.timer = null
backgroundSettingsObject.custom = {}

var background_settings = function (settings) {
	if (settings.wallpapermode) {
		backgroundSettingsObject.wallpapermode = settings.wallpapermode.value
		changeBackground()
	}
	if (settings.DefaultWallpaper) {
		backgroundSettingsObject.backgroundRoute = "url('../Default Content/imgs/" + settings.DefaultWallpaper.value + ".jpg')"
		shouldShow()
	}
	if (settings.customdirectory) {
		changeBackground()
	}
	if (settings.backgroundColor) {
		document.body.style.setProperty(
			"--bg-color",
			"rgb(" +
				settings.backgroundColor.value.split(" ").map(function (c) {
					return Math.ceil(c * 255)
				}) +
				")"
		)
	}
	if (settings.image) {
		backgroundSettingsObject.custom = settings.image.value
		shouldShow()
	}
	if (settings.foreground) {
		document.body.style.setProperty("--fg-img", "url('" + "file:///" + settings.foreground.value + "')")
	}
	if (settings.selectvideo) {
		if (backgroundSettingsObject.wallpapermode == 3) {
			selectvideo = settings.selectvideo.value
			if (selectvideo) {
				backgroundSettingsObject.cusvideoRoute = "file:///" + selectvideo
			} else {
				backgroundSettingsObject.cusvideoRoute = ""
			}
			ChangeVideoModel()
		}
	}
	if (settings.videomodel) {
		if (backgroundSettingsObject.wallpapermode == 3) {
			backgroundSettingsObject.videoRoute = "Default Content/video/" + settings.videomodel.value + ".webm"
			ChangeVideoModel()
		}
	}
	if (settings.random) {
		backgroundSettingsObject.random = settings.random.value
	}
	if (settings.imageswitchtimes) {
		backgroundSettingsObject.speed = settings.imageswitchtimes.value
		if (backgroundSettingsObject.timer) clearTimeout(backgroundSettingsObject.timer)
		backgroundSettingsObject.timer = setTimeout(changeBackground, backgroundSettingsObject.speed * 60 * 1000)
	}
	if (settings.imagedisplaystlye) {
		backgroundSettingsObject.bgStyle = settings.imagedisplaystlye.value
		shouldShow()
	}
	if (settings.foregroundDisplayStlye) {
		switch (settings.foregroundDisplayStlye.value) {
			case 1:
				document.body.style.setProperty("--fg-repeat", "no-repeat")
				document.body.style.setProperty("--fg-size", "cover")
				break
			case 2:
				document.body.style.setProperty("--fg-repeat", "no-repeat")
				document.body.style.setProperty("--fg-size", "100% 100%")
				break
			case 3:
				document.body.style.setProperty("--fg-repeat", "no-repeat")
				document.body.style.setProperty("--fg-size", "contain")
				break
			case 4:
				document.body.style.setProperty("--fg-repeat", "repeat")
				document.body.style.setProperty("--fg-size", "auto")
				break
			case 5:
				document.body.style.setProperty("--fg-repeat", "no-repeat")
				document.body.style.setProperty("--fg-size", "auto")
				break
			default:
		}
	}
	if (settings.VideoVolume) {
		backgroundSettingsObject.video.volume = settings.VideoVolume.value / 100
	}
}

function setBackgroundStyle() {
	switch (backgroundSettingsObject.bgStyle) {
		case 1:
			document.body.style.setProperty("--bg-repeat", "no-repeat")
			document.body.style.setProperty("--bg-size", "cover")
			break
		case 2:
			document.body.style.setProperty("--bg-repeat", "no-repeat")
			document.body.style.setProperty("--bg-size", "100% 100%")
			break
		case 3:
			document.body.style.setProperty("--bg-repeat", "no-repeat")
			document.body.style.setProperty("--bg-size", "contain")
			break
		case 4:
			document.body.style.setProperty("--bg-repeat", "repeat")
			document.body.style.setProperty("--bg-size", "auto")
			break
		case 5:
			document.body.style.setProperty("--bg-repeat", "no-repeat")
			document.body.style.setProperty("--bg-size", "auto")
			break
		default:
	}
}

function shouldShow() {
	switch (backgroundSettingsObject.wallpapermode) {
		case 1:
			$.backstretch("destroy", false)
			backgroundSettingsObject.video.src = null
			if (backgroundSettingsObject.custom) document.body.style.setProperty("--bg-img", "url('" + "file:///" + backgroundSettingsObject.custom + "')")
			else document.body.style.setProperty("--bg-img", backgroundSettingsObject.backgroundRoute)
			setBackgroundStyle()
			break
		case 2:
			backgroundSettingsObject.video.src = null
			document.body.style.setProperty("--bg-img", " ")
			document.body.style.setProperty("--bg-color", "#0000")
			if (myList.length) {
				$.backstretch("file:///" + backgroundSettingsObject.currentImg, {fade: 1000})
			} else {
				$.backstretch("destroy", false)
			}
			break
		case 3:
			$.backstretch("destroy", false)
			document.body.style.setProperty("--bg-img", " ")
			document.body.style.setProperty("--bg-color", "#0000")
			ChangeVideoModel()
			break
		case 4:
			$.backstretch("destroy", false)
			backgroundSettingsObject.video.src = null
			document.body.style.setProperty("--bg-img", " ")
			break
		default:
	}
}

function changeBackground() {
	switch (backgroundSettingsObject.wallpapermode) {
		case 2:
			if (myList.length) {
				nextImage(backgroundSettingsObject.random)
			} else {
				shouldShow()
			}
			if (backgroundSettingsObject.timer) clearTimeout(backgroundSettingsObject.timer)
			backgroundSettingsObject.timer = setTimeout(changeBackground, backgroundSettingsObject.speed * 60 * 1000)
			break
		default:
			shouldShow()
	}
}

function ChangeVideoModel() {
	if (backgroundSettingsObject.cusvideoRoute != "") backgroundSettingsObject.video.src = backgroundSettingsObject.cusvideoRoute
	else backgroundSettingsObject.video.src = backgroundSettingsObject.videoRoute
	backgroundSettingsObject.video.play()
}

function updateFileList(currentFiles) {
	for (let i = 0; i < currentFiles.length; ++i) {
		if (myList.indexOf(currentFiles[i]) === -1) {
			myList.push(currentFiles[i])
		}
	}
}

function nextImage(rands) {
	let index = -1
	let indexNow = -1
	if (backgroundSettingsObject.currentImg) {
		indexNow = myList.indexOf(backgroundSettingsObject.currentImg)
		index = indexNow
	}
	if (rands) {
		while (index == indexNow) {
			index = Math.floor(Math.random() * myList.length)
		}
		backgroundSettingsObject.currentImg = myList[index]
	} else {
		if (index + 1 == myList.length) backgroundSettingsObject.currentImg = myList[0]
		else backgroundSettingsObject.currentImg = myList[index + 1]
	}
	shouldShow()
}
