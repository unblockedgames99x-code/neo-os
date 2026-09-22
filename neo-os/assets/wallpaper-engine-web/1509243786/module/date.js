/**
 * Created by FLomka on 2018/9/07.
 **/

const wes_array = new Array("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
const we_array = new Array(
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday"
)
const me_array = new Array(
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
)

const wrus_array = new Array("Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб")
const wru_array = new Array(
	"Воскресенье",
	"Понедельник",
	"Вторник",
	"Среда",
	"Четверг",
	"Пятница",
	"Суббота"
)
const mru_array = new Array(
	"Января",
	"Февраля",
	"Марта",
	"Апреля",
	"Мая",
	"Июня",
	"Июля",
	"Августа",
	"Сентября",
	"Октября",
	"Ноября",
	"Декабря"
)

const wuas_array = new Array("Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб")
const wua_array = new Array(
	"неділя",
	"понеділок",
	"вівторок",
	"середа",
	"четвер",
	"п'ятниця",
	"субота"
)
const mua_array = new Array(
	"січня",
	"лютого",
	"березня",
	"квітня",
	"травня",
	"червня",
	"липня",
	"серпня",
	"вересня",
	"жовтня",
	"листопада",
	"грудня"
)

class DateM {
	constructor(id) {
		this.scene = document.querySelector(id)
		this.date = document.createElement("div")
		this.date.className = "module date"
		this.load = [0, 4]
		this.scene.append(this.date)
		this.initial()
		this.startTimer()
	}

	/**
	 *	@return {CSSStyleDeclaration}
	 */
	getStyle() {
		return this.date.style
	}

	initial() {
		this.getStyle().fontSize = Math.floor((window.height / 300) * 20) + "px"
		this.load[0] += 1
	}

	startTimer() {
		try {
			this.getDates()
			this.timer = setTimeout(this.startTimer.bind(this), 1000)
		} catch (e) {
			alert(e)
		}
	}

	/**
	 *	@param {string} format Fomat
	 */
	setFormat(format) {
		this.format = format
		this.load[0] += 1
	}

	/**
	 *	@param {string} align Align
	 */
	setAlign(align) {
		try {
			this.align = align == "left" ? 50 : align == "right" ? -50 : 0
			this.getStyle().textAlign = align
			this.setX()
		} catch (e) {
			alert(e)
		}
	}

	/**
	 *	@param {number} [x] X
	 */
	setX(x) {
		try {
			this.x = x === undefined ? this.x : x
			this.getStyle().left = this.x - 50.5 + this.align + "%"
		} catch (e) {
			alert(e)
		}
	}

	/**
	 *	@param {number} [y] Y
	 */
	setY(y) {
		try {
			this.y = y === undefined ? this.y : y
			this.getStyle().top = this.y + "%"
		} catch (e) {
			alert(e)
		}
	}

	/**
	 *	@param {string} variable Name var
	 *	@param {any} value Value var
	 *	@return {any} Value var
	 */
	setVar(variable, value) {
		try {
			this[variable] = value
			return value
		} catch (e) {
			alert(e)
		}
	}

	/**
	 *	@param {string} variable Name var
	 *	@return {any} Value var
	 */
	getVar(variable) {
		try {
			if (this[variable] != null) return this[variable]
			else return null
		} catch (e) {
			alert(e)
		}
	}

	add0(n) {
		return n < 10 ? "0" + n : "" + n
	}

	/**
	 *	@return {boolean} Status loaded module weather
	 */
	loaded() {
		if (this.load[0] >= this.load[1]) return true
		else return false
	}

	/**
	 *	@param {boolean} bool Load
	 */
	loadEx(bool) {
		if (bool) this.load[0] += this.load[1]
		else return false
	}

	getDates() {
		let d = new Date()
		let dateHtml

		if (this.format == "" || this.format == null) dateHtml = "None format"
		else {
			dateHtml = this.format
			dateHtml = dateHtml.replaceAll("{,}", "<br>")
			dateHtml = dateHtml.replaceAll(
				"{vert}",
				'<span class="verticalText">'
			)
			dateHtml = dateHtml.replaceAll(
				"{vertMix}",
				'<span class="verticalMixText">'
			)
			dateHtml = dateHtml.replaceAll("{end}", "</span>")
			dateHtml = dateHtml.replaceAll("{DD}", d.getDate())
			dateHtml = dateHtml.replaceAll("{MM}", this.add0(d.getMonth() + 1))
			dateHtml = dateHtml.replaceAll("{YYYY}", d.getFullYear())
			dateHtml = dateHtml.replaceAll("{week}", we_array[d.getDay()])
			dateHtml = dateHtml.replaceAll("{wek}", wes_array[d.getDay()])
			dateHtml = dateHtml.replaceAll("{неделя}", wru_array[d.getDay()])
			dateHtml = dateHtml.replaceAll("{нд}", wrus_array[d.getDay()])
			dateHtml = dateHtml.replaceAll("{месяц}", mru_array[d.getMonth()])
			dateHtml = dateHtml.replaceAll("{month}", me_array[d.getMonth()])
			dateHtml = dateHtml.replaceAll("{тиждень}", wua_array[d.getDay()])
			dateHtml = dateHtml.replaceAll("{тжд}", wuas_array[d.getDay()])
			dateHtml = dateHtml.replaceAll("{місяць}", mua_array[d.getMonth()])
		}
		if (this.date.innerHTML != dateHtml) {
			this.date.innerHTML = dateHtml
		}
		this.load[0] += 1
	}

	setDateColor() {
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
		this.getStyle().textShadow = "0 0 20px" + color2
	}

	setOldFontDate(type) {
		switch (type) {
			case 1:
				this.date.style.fontFamily =
					'"等线 Light","Microsoft Yahei Light"'
				break
			case 2:
				this.date.style.fontFamily = "'Lato', sans-serif"
				break
			case 3:
				this.date.style.fontFamily = "'Brush Script Std', cursive"
				break
			case 4:
				this.date.style.fontFamily = "'Papyrus', fantasy"
				break
			case 5:
				this.date.style.fontFamily = "'Harrington', fantasy"
				break
			case 6:
				this.date.style.fontFamily = "'Open Sans', sans-serif"
				break
			default:
		}
	}
}
