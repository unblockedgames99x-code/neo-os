/**
 * Created by FLomka.
 **/

var width = window.innerWidth
var height = window.innerHeight
var current_lang = "en"

var spotifyColor = {
	primal: -1,
	light: -1,
	dark: -1,
	darkness: -1,
}

var mapRoute = "Default Content/map/1.png"
var cusmapRoute = {}
var timeType = 99
var musicRandom = false

var FristLoad = true

var visual_audio_model = 1
var PWCircle_show_bool = true
var PWLine_show_bool = true

var myList = []
var files = {}

var timeDot = false
var timeDot2 = false
var timetransparency = 0.8
var datetransparency = 0.8
var TimeX = 50
var TimeY = 50
var tShowSencends = true
var TimeColorRhythm = false
var TimeColor
var TimeBlurColor
var GlitchBG = true
var color2
var vv = 0
var timeTag = 1

var wallpaper = $("body").particles({}).audiovisualizer({})
var isGlobalSettings = false

var PWParticleShow = false

var audio = {
	opacity: 0.9,
	color: "255,255,255",
	shadowColor: "255,255,255",
	shadowBlur: 15,
	offsetX: 0.5,
	offsetY: 0.5,
	isClickOffset: false,
}

var param = {
	style: 1,
	r: 0.45,
	color: "rgba(255,255,255,0.8)",
	blurColor: "#ffcccc",
	arr1: [],
	arr2: [],
	rotation: 0,
	rotationcopy: 0,
	offsetAngle: 0,
	waveArr: new Array(120),
	cX: 0.5,
	cY: 0.5,
	range: 9,
	shadowBlur: 15,
	lineWidth: 9,
	showCircle: true,
	wavetransparency: 0.8,
	showSemiCircle: false,
	SemiCircledirection: 1,
	Polygon: 12,
	SolidColorGradient: true,
	BlurColorGradient: true,
	ColorRhythm: true,
	ColorMode: 1,
	TagNow: 1,
	GradientRate: 0.5,
}

var PWLineParam = {
	style: 1,
	sw: 0.8,
	lineWidth: 9,
	waveArr: new Array(120),
	range: 5,
	color: "rgba(255,255,255,0.8)",
	blurColor: "#ffcccc",
	shadowBlur: 100,
	arr1: [],
	arr2: [],
	arr3: [],
	LineX: 0.5,
	LineY: 0.5,
	showLine: true,
	LinePosition: 1,
	Direction: 1,
	LineDensity: 120,
	LineTransparency: 0.8,
	MiddleLine: false,
	TagNow: 1,
	SolidColorGradient: true,
	BlurColorGradient: true,
	ColorRhythm: true,
	ColorMode: 1,
	GradientRate: 0.5,
}

/**
 * Библиотеки
 */
const colorChanger = new Color()

/**
 * Подключение модулей
 */
const mediaIntegration = new MediaIntegration(".app")

/**
 * Прослушиватель Wallpaper Engine
 */
window.wallpaperPropertyListener = {
	applyUserProperties: function (properties) {
		mediaIntegration.applyUserProperties(properties)

		background_settings(properties)
		effect_particles_settings(properties)
		weather_settings(properties)
		date_settings(properties)
		clock_settings(properties)
		monsterCat_settings(properties)
		note_settings(properties)

		if (properties.PolygonAngle) {
			SetPolygonAngle(properties.PolygonAngle.value)
		}
		if (properties.style) {
			param.style = properties.style.value
		}
		if (properties.radius) {
			param.r = properties.radius.value / 1000
		}
		if (properties.range) {
			param.range = properties.range.value / 5
		}
		if (properties.color) {
			var c = properties.color.value.split(" ").map(function (c) {
				return Math.ceil(c * 255)
			})
			ctx.strokeStyle = param.color = "rgba(" + c + ",0.8)"
		}
		if (properties.blurColor) {
			var c = properties.blurColor.value.split(" ").map(function (c) {
				return Math.ceil(c * 255)
			})
			ctx.shadowColor = param.blurColor = "rgb(" + c + ")"
		}
		if (properties.cX) {
			param.cX = properties.cX.value / 1000
		}
		if (properties.cY) {
			param.cY = properties.cY.value / 1000
		}
		if (properties.ColorMode) {
			param.ColorMode = properties.ColorMode.value
		}
		if (properties.SolidColorGradient) {
			param.SolidColorGradient = properties.SolidColorGradient.value

			if (!param.SolidColorGradient) ctx.strokeStyle = param.color
		}
		if (properties.BlurColorGradient) {
			param.BlurColorGradient = properties.BlurColorGradient.value
		}
		if (properties.ColorRhythm) {
			param.ColorRhythm = properties.ColorRhythm.value
		}
		if (properties.GradientRate) {
			param.GradientRate = properties.GradientRate.value / 10
		}
		if (properties.rotation) {
			param.rotation = properties.rotation.value
			rotationcopy = param.rotation
		}
		if (properties.lineWidth) {
			ctx.lineWidth = param.lineWidth = properties.lineWidth.value
		}
		if (properties.showCircle) {
			param.showCircle = properties.showCircle.value
			PWCircle_show_bool = param.showCircle
		}
		if (properties.direction) {
			param.direction = properties.direction.value
		}
		if (properties.wavetransparency) {
			param.wavetransparency = properties.wavetransparency.value / 100
			ctx.globalAlpha = param.wavetransparency
		}
		if (properties.showSemiCircle) {
			param.showSemiCircle = properties.showSemiCircle.value
			if (param.showSemiCircle) {
				rotationcopy = param.rotation
				param.rotation = 0
				param.offsetAngle = 0
			} else {
				param.rotation = rotationcopy
			}
		}
		if (properties.SemiCircledirection) {
			param.SemiCircledirection = properties.SemiCircledirection.value
		}
		if (properties.PWLineShow) {
			PWLineParam.showLine = properties.PWLineShow.value
			PWLine_show_bool = PWLineParam.showLine
		}
		if (properties.PWLinePosition) {
			PWLineParam.LinePosition = properties.PWLinePosition.value
		}
		if (properties.PWLineStyle) {
			PWLineParam.style = properties.PWLineStyle.value
		}
		if (properties.PWLineDirection) {
			PWLineParam.Direction = properties.PWLineDirection.value
		}
		if (properties.PWLineWidth) {
			CTXLine.lineWidth = PWLineParam.lineWidth = properties.PWLineWidth.value
		}
		if (properties.PWLineSpacing) {
			PWLineParam.sw = properties.PWLineSpacing.value / 10
		}
		if (properties.PWLineDensity) {
			PWLineParam.LineDensity = properties.PWLineDensity.value * 10
		}
		if (properties.PWLineRange) {
			PWLineParam.range = properties.PWLineRange.value / 5
		}
		if (properties.PWLineTransparency) {
			PWLineParam.LineTransparency = properties.PWLineTransparency.value / 100
			CTXLine.globalAlpha = PWLineParam.LineTransparency
		}
		if (properties.PWLineColor) {
			var c = properties.PWLineColor.value.split(" ").map(function (c) {
				return Math.ceil(c * 255)
			})
			CTXLine.strokeStyle = PWLineParam.color = "rgba(" + c + ",0.8)"
		}
		if (properties.PWLineBlurColor) {
			var c = properties.PWLineBlurColor.value.split(" ").map(function (c) {
				return Math.ceil(c * 255)
			})
			CTXLine.shadowColor = PWLineParam.blurColor = "rgb(" + c + ")"
		}
		if (properties.PWLineX) {
			PWLineParam.LineX = properties.PWLineX.value / 1000.0
		}
		if (properties.PWLineY) {
			PWLineParam.LineY = properties.PWLineY.value / 1000.0
		}
		if (properties.PWMiddleLine) {
			PWLineParam.MiddleLine = properties.PWMiddleLine.value
		}
		if (properties.PWLineColorMode) {
			PWLineParam.ColorMode = properties.PWLineColorMode.value
		}
		if (properties.PWLineSolidColorGradient) {
			PWLineParam.SolidColorGradient = properties.PWLineSolidColorGradient.value
			if (!PWLineParam.SolidColorGradient) CTXLine.strokeStyle = PWLineParam.color
		}
		if (properties.PWLineBlurColorGradient) {
			PWLineParam.BlurColorGradient = properties.PWLineBlurColorGradient.value
		}
		if (properties.PWLineColorRhythm) {
			PWLineParam.ColorRhythm = properties.PWLineColorRhythm.value
		}
		if (properties.PWLineGradientRate) {
			PWLineParam.GradientRate = properties.PWLineGradientRate.value / 10
		}
		if (properties.visual_audio_model) {
			visual_audio_model = properties.visual_audio_model.value
			switch (visual_audio_model) {
				case 0:
					param.showCircle = false
					PWLineParam.showLine = false
					canvasz.style.display = "none"
					break
				case 1:
					param.showCircle = PWCircle_show_bool
					PWLineParam.showLine = false
					canvasz.style.display = "none"
					break
				case 2:
					param.showCircle = false
					PWLineParam.showLine = PWLine_show_bool
					canvasz.style.display = "none"
					break
				case 3:
					param.showCircle = false
					PWLineParam.showLine = false
					canvasz.style.display = "none"
					break
				case 4:
					param.showCircle = false
					PWLineParam.showLine = false
					canvasz.style.display = "block"
					break
				default:
			}
		}
		if (properties.audio_amplitude) {
			wallpaper.audiovisualizer("set", "amplitude", properties.audio_amplitude.value)
		}
		if (properties.audio_decline) {
			wallpaper.audiovisualizer("set", "decline", properties.audio_decline.value / 100)
		}
		if (properties.audio_isRing) {
			if (properties.audio_isRing.value) {
				wallpaper.audiovisualizer("set", "isRing", true)
			} else {
				wallpaper.audiovisualizer("set", "isRing", false)
			}
		}
		if (properties.audio_isStaticRing) {
			if (properties.audio_isStaticRing.value) {
				wallpaper.audiovisualizer("set", "isStaticRing", true)
			} else {
				wallpaper.audiovisualizer("set", "isStaticRing", false)
			}
		}
		if (properties.audio_isInnerRing) {
			if (properties.audio_isInnerRing.value) {
				wallpaper.audiovisualizer("set", "isInnerRing", true)
			} else {
				wallpaper.audiovisualizer("set", "isInnerRing", false)
			}
		}
		if (properties.audio_isOuterRing) {
			if (properties.audio_isOuterRing.value) {
				wallpaper.audiovisualizer("set", "isOuterRing", true)
			} else {
				wallpaper.audiovisualizer("set", "isOuterRing", false)
			}
		}
		if (properties.audio_radius) {
			wallpaper.audiovisualizer("set", "radius", properties.audio_radius.value / 1000)
		}
		if (properties.audio_ringRotation) {
			wallpaper.audiovisualizer("set", "ringRotation", properties.audio_ringRotation.value)
		}
		if (properties.audio_opacity) {
			audio.opacity = properties.audio_opacity.value / 100
			wallpaper.audiovisualizer("set", "opacity", audio.opacity)
		}
		if (properties.audio_color) {
			audio.color = properties.audio_color.value.split(" ").map(function (c) {
				return Math.ceil(c * 255)
			})
			if (isGlobalSettings == false) {
				wallpaper.audiovisualizer("set", "color", audio.color)
			}
		}
		if (properties.audio_shadowColor) {
			audio.shadowColor = properties.audio_shadowColor.value.split(" ").map(function (c) {
				return Math.ceil(c * 255)
			})
			if (isGlobalSettings == false) {
				wallpaper.audiovisualizer("set", "shadowColor", audio.shadowColor)
			}
		}
		if (properties.audio_shadowBlur) {
			audio.shadowBlur = properties.audio_shadowBlur.value * 5
			if (isGlobalSettings == false) {
				wallpaper.audiovisualizer("set", "shadowBlur", audio.shadowBlur)
			}
		}
		if (properties.audio_offsetX) {
			audio.offsetX = properties.audio_offsetX.value / 1000
			if (isGlobalSettings == false) {
				wallpaper.audiovisualizer("set", "offsetX", audio.offsetX)
			}
		}
		if (properties.audio_offsetY) {
			audio.offsetY = properties.audio_offsetY.value / 1000
			if (isGlobalSettings == false) {
				wallpaper.audiovisualizer("set", "offsetY", audio.offsetY)
			}
		}
		if (properties.audio_isClickOffset) {
			audio.isClickOffset = properties.audio_isClickOffset.value
			if (isGlobalSettings == false) {
				wallpaper.audiovisualizer("set", "isClickOffset", audio.isClickOffset)
			}
		}
		if (properties.audio_isLineTo) {
			wallpaper.audiovisualizer("set", "isLineTo", properties.audio_isLineTo.value)
		}
		if (properties.audio_firstPoint) {
			wallpaper.audiovisualizer("set", "firstPoint", properties.audio_firstPoint.value)
		}
		if (properties.audio_secondPoint) {
			wallpaper.audiovisualizer("set", "secondPoint", properties.audio_secondPoint.value)
		}
		if (properties.audio_pointNum) {
			wallpaper.audiovisualizer("set", "pointNum", properties.audio_pointNum.value)
		}
		if (properties.audio_distance) {
			wallpaper.audiovisualizer("set", "distance", properties.audio_distance.value)
		}
		if (properties.audio_lineWidth) {
			wallpaper.audiovisualizer("set", "lineWidth", properties.audio_lineWidth.value)
		}
		if (properties.audio_isBall) {
			wallpaper.audiovisualizer("set", "isBall", properties.audio_isBall.value)
		}
		if (properties.audio_ballSpacer) {
			wallpaper.audiovisualizer("set", "ballSpacer", properties.audio_ballSpacer.value)
		}
		if (properties.audio_ballSize) {
			wallpaper.audiovisualizer("set", "ballSize", properties.audio_ballSize.value)
		}
		if (properties.audio_ballRotation) {
			wallpaper.audiovisualizer("set", "ballRotation", properties.audio_ballRotation.value)
		}
		if (properties.number && properties.number.value != numLevel) {
			numLevel = properties.number.value
			createPoint()
		}
		if (properties.bgcolor) {
			var bgcolor = properties.bgcolor.value.split(" ").map(function (c) {
				return Math.ceil(c * 255)
			})
			CanPar.style.backgroundColor = "rgb(" + bgcolor + ")"
		}
		if (properties.image123) {
			if (properties.image.value) {
				CanPar.style.backgroundImage = "url(file:///" + properties.image.value + ")"
				CanPar.style.backgroundSize = "100% 100%"
			} else {
				CanPar.style.backgroundImage = "none"
			}
		}
		if (properties.ratio) {
			ratio = properties.ratio.value / 1.5
		}
		if (properties.tEqualize) {
			equalize = 1 - properties.tEqualize.value / 10
		}
		if (properties.showline) {
			isShowLine = properties.showline.value
		}
		if (properties.showpoint) {
			isShowPoint = properties.showpoint.value
		}
		if (properties.smovefollow) {
			isMoveFollow = properties.smovefollow.value
		}
		if (properties.style) {
			pStyle = properties.style.value
		}
		if (properties.usePColor) {
			usePColor = properties.usePColor.value
		}
		if (properties.pColor) {
			var color = properties.pColor.value.split(" ").map(function (c) {
				return Math.ceil(c * 255)
			})
			pColor = "rgba(" + color + ",0.8)"
		}
		if (properties.isBlur) {
			isBlur = properties.isBlur.value
		}
		if (properties.blurColor) {
			var color = properties.blurColor.value.split(" ").map(function (c) {
				return Math.ceil(c * 255)
			})
			blurColor = "rgb(" + color + ")"
		}
		FristLoad = false
	},
	setPaused: function (isPaused) {
		if (isPaused) {
			backgroundSettingsObject.video.pause()
		} else {
			if (backgroundSettingsObject.video.paused) {
				backgroundSettingsObject.video.play()
			}
		}
	},
	userDirectoryFilesAddedOrChanged: function (propertyName, changedFiles) {
		if (!files.hasOwnProperty(propertyName)) {
			files[propertyName] = changedFiles
		} else {
			files[propertyName] = files[propertyName].concat(changedFiles)
		}
		updateFileList(files[propertyName])
	},
	userDirectoryFilesRemoved: function (propertyName, removedFiles) {
		for (var i = 0; i < removedFiles.length; ++i) {
			var index = files[propertyName].indexOf(removedFiles[i])
			var myindex = myList.indexOf(removedFiles[i])
			if (index >= 0) {
				files[propertyName].splice(index, 1)
			}
			if (myindex >= 0) {
				myList.splice(myindex, 1)
			}
		}
		updateFileList(files[propertyName])
	},
	applyGeneralProperties: function (properties) {
		if (properties.language) {
			current_lang = properties.language
		}
	},
}

var SetPolygonAngle = function (mode) {
	switch (mode) {
		case 1:
			param.PolygonAngle = 1
			Polygon = 295
			break
		case 2:
			param.PolygonAngle = 2
			Polygon = 270
			break
		case 3:
			param.PolygonAngle = 4
			Polygon = 245
			break
		case 4:
			param.PolygonAngle = 5
			Polygon = 220
			break
		case 5:
			param.PolygonAngle = 7
			Polygon = 195
			break
		case 6:
			param.PolygonAngle = 9
			Polygon = 170
			break
		case 7:
			param.PolygonAngle = 10
			Polygon = 145
			break
		case 8:
			param.PolygonAngle = 12
			Polygon = 120
			break
		case 9:
			param.PolygonAngle = 30
			Polygon = 95
			break
		case 10:
			param.PolygonAngle = 60
			Polygon = 70
			break
		case 11:
			param.PolygonAngle = 90
			Polygon = 45
			break
		case 12:
			param.PolygonAngle = 180
			Polygon = 20
			break
		default:
	}
}

var shouldShowMap = function () {
	if (cusmapRoute) {
		wallpaper.particles("particlesImage", cusmapRoute, "false")
	} else {
		wallpaper.particles("particlesImage", mapRoute, "true")
	}
}

window.wallpaperRegisterAudioListener && window.wallpaperRegisterAudioListener(wallpaperAudioListener)

function wallpaperAudioListener(arr) {
	if (musicRandom) wallpaper.particles("drawCanvas", arr)
	wallpaper.audiovisualizer("clearCanvas")
	CTXLine.clearRect(0, 0, w, h)
	ctx.clearRect(0, 0, w, h)
	switch (visual_audio_model) {
		case 1:
			setCan()
			createPoint(arr)
			if (param.showCircle) {
				switch (param.style) {
					case 1:
						style1()
						break
					case 2:
						style2()
						break
					case 3:
						style3()
						break
				}
			}
			break
		case 2:
			setCTXLine()
			PWLineCreatePoint(arr)
			if (PWLineParam.showLine) {
				switch (PWLineParam.style) {
					case 1:
						PWLineStyle1()
						break
					case 2:
						PWLineStyle2()
						break
					case 3:
						PWLineStyle3()
						break
				}
			}
			break
		case 3:
			wallpaper.audiovisualizer("drawCanvas", arr)
			break
		case 4:
			monstercateq(arr)
			break
	}
	// if (TimeColorRhythm) setTimeColor()
	// if (date.getVar('colorRythm')) date.setDateColor()
	// if (weather.getVar('colorRythm')) weather.setWeatherColor()
	// if (true) {
	// 	for(var i=0; i<32; i++)
	// 	{
	// 		audioArrayPar[i] = Math.floor(arr[i*4]*100)
	// 	}
	// }
	spotifyUpdater()
}

function add0(n) {
	return n < 10 ? "0" + n : "" + n
}

function mathMap(value, fromLow, fromHigh, toLow, toHigh) {
	var fromRange = fromHigh - fromLow
	var toRange = toHigh - toLow
	var scaleFactor = toRange / fromRange
	var tmpValue = value - fromLow
	tmpValue *= scaleFactor
	return tmpValue + toLow
}

String.prototype.replaceAll = function (search, replace) {
	return this.split(search).join(replace)
}

function spotifyUpdater() {
	weather.setColor()
	note.setColor()
}

function color4vec(vector3) {
	return (
		"rgb(" +
		vector3.split(" ").map(function (c) {
			return Math.ceil(c * 255)
		}) +
		")"
	)
}
