/**
 * Created by FLomka on 2018/9/07.
 * такое говно facepalm
 **/

class Clock {
	constructor(scene) {
		this.scene = document.querySelector(scene)
		this.DOM = document.createElement("div")
		this.date.className = "module"
		this.scene.append(this.DOM)
		this.load = [0, 4]
		this.initial()
		this.startTimer()
	}

	getStyle() {
		return this.DOM.style
	}

	initial() {
		this.getStyle().width = width + "px"
		this.getStyle().fontSize = Math.floor((height / 300) * 20) + "px"
		document.body.style.setProperty("--glith_size", width + "px " + height + "px")
		this.getStyle().fontSize = Math.floor((window.height / 300) * 20) + "px"
		this.blink = false
		this.load[0] += 1
	}

	startTimer() {
		try {
			this.getTime()
			this.timer = setTimeout(this.startTimer.bind(this), 1000)
		} catch (e) {}
	}

	setTimeColor() {
		if (vv > 255) {
			timeTag *= -1
			vv = 255
		}
		if (vv < 0) {
			timeTag *= -1
			vv = 0
		}
		color2 = "hsl(" + vv + ",90%,50%)"
		vv += timeTag / 1
		this.getStyle().color = color2
		this.getStyle().textShadow = "0 0 20px " + color2
		document.body.style.setProperty("--glith_color", color2)
	}

	getTime() {
		let c = new Date(),
			realTime,
			ar = {}

		if (tStyle) {
			if (tShowSencends) {
				oClock.innerHTML =
					add0(c.getHours()) +
					' <span style="opacity: ' +
					(blink ? 0 : 1) +
					';">' +
					dot +
					"</span> " +
					add0(c.getMinutes()) +
					" <span class='sec'>" +
					add0(c.getSeconds()) +
					"</span>"
				realTime = add0(c.getHours()) + " " + dot + " " + add0(c.getMinutes()) + " " + dot + " " + add0(c.getSeconds())
				ar = [c.getHours(), c.getMinutes(), c.getSeconds()].reduce(padClock, "")
				oSlide_dots.style.display = "inline-block"
			} else {
				oClock.innerHTML = add0(c.getHours()) + ' <span style="opacity: ' + (blink ? 0 : 1) + ';">' + dot + "</span> " + add0(c.getMinutes())
				realTime = add0(c.getHours()) + " " + dot + " " + add0(c.getMinutes())
				ar = [c.getHours(), c.getMinutes()].reduce(padClock, "")
				oSlide_dots.style.display = "none"
			}
		} else {
			let h = c.getHours()
			let str = h < 12 ? "AM" : "PM"
			h = h <= 12 ? h : h - 12
			if (tShowSencends) {
				oClock.innerHTML =
					"<span id='time'>" +
					add0(h) +
					' <span style="opacity: ' +
					(blink ? 0 : 1) +
					';">' +
					dot +
					"</span> " +
					add0(c.getMinutes()) +
					" <span class='sec'>" +
					add0(c.getSeconds()) +
					"</span><span class='st'>" +
					str +
					"</span></span>"
				realTime = add0(h) + " " + dot + " " + add0(c.getMinutes()) + " " + dot + " " + add0(c.getSeconds()) + " " + str
				ar = [h, c.getMinutes(), c.getSeconds()].reduce(padClock, "")
				oSlide_dots.style.display = "inline-block"
			} else {
				oClock.innerHTML =
					"<span id='time'>" +
					add0(h) +
					' <span style="opacity: ' +
					(blink ? 0 : 1) +
					';">' +
					dot +
					"</span> " +
					add0(c.getMinutes()) +
					"</span>" +
					" <span class='sec'>" +
					str +
					"</span>"
				realTime = add0(h) + " " + dot + " " + add0(c.getMinutes()) + " " + str
				ar = [h, c.getMinutes()].reduce(padClock, "")
				oSlide_dots.style.display = "none"
			}
		}
		oDigital_clock.setAttribute("data-hours", add0(c.getHours()))
		oDigital_clock.setAttribute("data-minutes", add0(c.getMinutes()))
		oDigital_clock.setAttribute("data-seconds", add0(c.getSeconds()))
		snow_sign(c)
		columns.forEach(function (ele, i) {
			let n = +ar[i]
			let offset = -n * size
			ele.style.transform = "translateY(calc(50vh + " + offset + "px - " + size / 2 + "px))"
			Array.from(ele.children).forEach(function (ele2, i2) {
				ele2.className = "num " + getClass(n, i2)
			})
		})

		function getClass(n, i2) {
			return (
				classList.find(function (class_, classIndex) {
					return Math.abs(n - i2) === classIndex
				}) || ""
			)
		}

		$(".time").html(realTime)
		$(".time").attr("data-time", realTime)

		if (dot == ":" && timeDot) {
			dot = "."
			return
		}

		if (dot == ".") {
			dot = ":"
		}

		if (!blink && timeDot2) {
			blink = true
		} else if (blink) {
			blink = false
		}
	}

	setX(x) {
		try {
			this.x = x === undefined ? this.x : x
			this.getStyle().left = this.x - 50.5 + this.align + "%"
		} catch (e) {
			alert(e)
		}
	}

	setY(y) {
		try {
			this.y = y === undefined ? this.y : y
			this.getStyle().top = this.y + "%"
		} catch (e) {
			alert(e)
		}
	}

	setVar(variable, value) {
		try {
			this[variable] = value
			return value
		} catch (e) {
			alert(e)
		}
	}

	getVar(variable) {
		try {
			if (this[variable] != null) return this[variable]
			else return null
		} catch (e) {
			alert(e)
		}
	}

	SetOldFontClock(type) {
		switch (type) {
			case 1:
				this.getStyle().fontFamily = '"等线 Light","Microsoft Yahei Light"'
				break
			case 2:
				this.getStyle().fontFamily = "'Lato', sans-serif"
				break
			case 3:
				this.getStyle().fontFamily = "'Brush Script Std', cursive"
				break
			case 4:
				this.getStyle().fontFamily = "'Papyrus', fantasy"
				break
			case 5:
				this.getStyle().fontFamily = "'Harrington', fantasy"
				break
			case 6:
				this.getStyle().fontFamily = "'Open Sans', sans-serif"
				break
			default:
		}
	}
}

var oClock = document.getElementById("clock_classic")
var oClock_glitch = document.querySelector(".screen")
var oGlitch_clock = document.querySelector(".clock span")
var oDigital_clock = document.getElementById("digital_clock")
var oDigital_enable = document.querySelector(".digital_clock")
var oSlide_enable = document.querySelector(".column2")
var oSlide_dots = document.querySelector(".showed")

var size = 86
var columns = Array.from(document.getElementsByClassName("column"))
var classList = ["visible", "close", "far", "far", "distant", "distant"]

var tStyle = true
var dot = ":"

let blink = false

oClock.style.width = width + "px"
oClock.style.height = height + "px"
oClock.style.fontSize = Math.floor((height / 300) * 20) + "px"
document.body.style.setProperty("--glith_size", width + "px " + height + "px")

function second_passed() {
	$(".clock").removeClass("is-off")
}

setTimeout(second_passed, 2000)

function getTime() {
	let c = new Date()
	let realTime
	let ar = {}

	if (tStyle) {
		if (tShowSencends) {
			oClock.innerHTML =
				add0(c.getHours()) +
				' <span style="opacity: ' +
				(blink ? 0 : 1) +
				';">' +
				dot +
				"</span> " +
				add0(c.getMinutes()) +
				" <span class='sec'>" +
				add0(c.getSeconds()) +
				"</span>"
			realTime = add0(c.getHours()) + " " + dot + " " + add0(c.getMinutes()) + " " + dot + " " + add0(c.getSeconds())
			ar = [c.getHours(), c.getMinutes(), c.getSeconds()].reduce(padClock, "")
			oSlide_dots.style.display = "inline-block"
		} else {
			oClock.innerHTML = add0(c.getHours()) + ' <span style="opacity: ' + (blink ? 0 : 1) + ';">' + dot + "</span> " + add0(c.getMinutes())
			realTime = add0(c.getHours()) + " " + dot + " " + add0(c.getMinutes())
			ar = [c.getHours(), c.getMinutes()].reduce(padClock, "")
			oSlide_dots.style.display = "none"
		}
	} else {
		let h = c.getHours()
		let str = h < 12 ? "AM" : "PM"
		h = h <= 12 ? h : h - 12
		if (tShowSencends) {
			oClock.innerHTML =
				"<span id='time'>" +
				add0(h) +
				' <span style="opacity: ' +
				(blink ? 0 : 1) +
				';">' +
				dot +
				"</span> " +
				add0(c.getMinutes()) +
				" <span class='sec'>" +
				add0(c.getSeconds()) +
				"</span><span class='st'>" +
				str +
				"</span></span>"
			realTime = add0(h) + " " + dot + " " + add0(c.getMinutes()) + " " + dot + " " + add0(c.getSeconds()) + " " + str
			ar = [h, c.getMinutes(), c.getSeconds()].reduce(padClock, "")
			oSlide_dots.style.display = "inline-block"
		} else {
			oClock.innerHTML =
				"<span id='time'>" +
				add0(h) +
				' <span style="opacity: ' +
				(blink ? 0 : 1) +
				';">' +
				dot +
				"</span> " +
				add0(c.getMinutes()) +
				"</span>" +
				" <span class='sec'>" +
				str +
				"</span>"
			realTime = add0(h) + " " + dot + " " + add0(c.getMinutes()) + " " + str
			ar = [h, c.getMinutes()].reduce(padClock, "")
			oSlide_dots.style.display = "none"
		}
	}
	oDigital_clock.setAttribute("data-hours", add0(c.getHours()))
	oDigital_clock.setAttribute("data-minutes", add0(c.getMinutes()))
	oDigital_clock.setAttribute("data-seconds", add0(c.getSeconds()))
	snow_sign(c)
	columns.forEach(function (ele, i) {
		let n = +ar[i]
		let offset = -n * size
		ele.style.transform = "translateY(calc(50vh + " + offset + "px - " + size / 2 + "px))"
		Array.from(ele.children).forEach(function (ele2, i2) {
			ele2.className = "num " + getClass(n, i2)
		})
	})

	function getClass(n, i2) {
		return (
			classList.find(function (class_, classIndex) {
				return Math.abs(n - i2) === classIndex
			}) || ""
		)
	}

	$(".time").html(realTime)
	$(".time").attr("data-time", realTime)

	if (dot == ":" && timeDot) {
		dot = "."
		return
	}

	if (dot == ".") {
		dot = ":"
	}

	if (!blink && timeDot2) {
		blink = true
	} else if (blink) {
		blink = false
	}
}

function autoTime() {
	getTime()
	setTimeout(autoTime, 1000)
}

function padClock(p, n) {
	return p + ("0" + n).slice(-2)
}

autoTime()

function SetOldFontClock(type) {
	switch (type) {
		case 1:
			oClock.style.fontFamily = '"等线 Light","Microsoft Yahei Light"'
			break
		case 2:
			oClock.style.fontFamily = "'Lato', sans-serif"
			break
		case 3:
			oClock.style.fontFamily = "'Brush Script Std', cursive"
			break
		case 4:
			oClock.style.fontFamily = "'Papyrus', fantasy"
			break
		case 5:
			oClock.style.fontFamily = "'Harrington', fantasy"
			break
		case 6:
			oClock.style.fontFamily = "'Open Sans', sans-serif"
			break
		default:
	}
}
