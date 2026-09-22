/**
 * Weather class
 * Created by FLomka on 2018/9/07.
 **/

class Weather {
	/**
	 *	@param {string} id Id for querySelector
	 */
	constructor(id) {
		this.scene = document.querySelector(id)
		this.weather = document.createElement("div")
		this.weather.className = "module wetaher"
		this.scene.append(this.weather)
		this.load = [0, 6]
		this.initial()
	}

	/**
	 *	@param {string} api Api-key
	 */
	setApi(api, pos) {
		if (pos == "first") this.api = api
		if (pos == "second") this.apiSecond = api
		this.load[0] += 1
	}

	setSlowUpdate(bool) {
		this.slow = bool ? 2 : 1
		this.load[0] += 1
	}

	/**
	 *	@param {string} city City
	 */
	setCity(city) {
		this.city = city
		this.load[0] += 1
	}

	/**
	 *	@param {string} unit Units
	 */
	setUnits(unit) {
		this.unit = unit
		this.load[0] += 1
	}

	/**
	 *	@param {string} format Fomat
	 */
	setFormat(format) {
		this.format = format
	}

	/**
	 *	@param {string} align Align
	 */
	setAlign(align) {
		try {
			this.align = align == "left" ? 50 : align == "right" ? -50 : 0
			this.getStyle().textAlign = align
			this.setX()
			// alert(this.getStyle().textAlign)
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
			this.getStyle().left = this.x - 50 + this.align + "%"
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
	 *
	 */
	startTimer() {
		try {
			this.getWeather()
			this.timer = setTimeout(this.startTimer.bind(this), 30 * this.slow * 60 * 1000)
		} catch (e) {
			alert(e)
		}
	}

	/**
	 *
	 */
	stopTimer() {
		try {
			clearTimeout(this.timer)
		} catch (e) {
			alert(e)
		}
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
	}

	/**
	 *
	 */
	reloadTimer() {
		try {
			clearTimeout(this.timer)
		} catch (e) {
			alert(e)
		}
		this.startTimer()
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

	/**
	 *	@return {CSSStyleDeclaration}
	 */
	getStyle() {
		return this.weather.style
	}

	initial() {
		this.slow = 2
		this.getStyle().fontSize = Math.floor((window.height / 300) * 20) + "px"
		this.load[0] += 1
	}

	setColor() {
		this.getStyle().color = colorChanger.get(this.color_type, this.color)
		this.getStyle().textShadow = "0 0 10px " + colorChanger.get(this.color_blur_type, this.color_blur)
	}

	getWeather() {
		try {
			if (this.api == "") {
				this.weather.innerHTML = "Please input API-key in Wallpaper Engine"
			} else if (this.city == "") {
				this.weather.innerHTML = "None City"
			} else if (this.unit != null) {
				$.get(
					`http://api.weatherstack.com/current?access_key=${this.api}&query=${this.city}&units=${this.unit}`,
					function (data, status) {
						let weatherData = data
						if (weatherData == null) {
							this.loadEx(true)
							return
						}
						if (weatherData.success == false && this.apiSecond) {
							$.ajax({
								url: `http://api.weatherstack.com/current?access_key=${this.apiSecond}&query=${this.city}&units=${this.unit}`,
								success: function (result) {
									weatherData = result
								},
								async: false,
							})
						}
						if (weatherData.success == false) this.loadEx(true)
						// alert(JSON.stringify(weatherData))

						this.cityname = weatherData.location.name
						this.temp = weatherData.current.temperature
						this.pressure = weatherData.current.pressure
						this.wind = weatherData.current.wind_speed
						this.windDir = weatherData.current.wind_dir
						this.feelslike = weatherData.current.feelslike
						this.precip = weatherData.current.precip
						this.humidity = weatherData.current.humidity
						this.uv_index = weatherData.current.uv_index
						this.visibility = weatherData.current.visibility

						let current_lang_temp = current_lang.replace(/-\w\w/, "")
						// alert(current_lang_temp)
						if (current_lang_temp == "en") this.status = weatherData.current.weather_descriptions
						else
							for (let i = 0; i < weather_state.length; i++) {
								if (weather_state[i].icon == weatherData.current.weather_code) {
									let temp_state = weather_state[i].languages
									for (let z = 0; z < temp_state.length; z++) {
										if (temp_state[z].lang_iso == current_lang_temp) {
											this.status = weatherData.current.is_day == "yes" ? temp_state[z].day_text : temp_state[z].night_text
										}
									}
								}
							}

						let strHtml = this.format || ""

						strHtml = strHtml.replaceAll("{,}", "<br>")
						strHtml = strHtml.replaceAll("{vert}", '<span class="verticalText">')
						strHtml = strHtml.replaceAll("{vertMix}", '<span class="verticalMixText">')
						strHtml = strHtml.replaceAll("{end}", "</span>")
						strHtml = strHtml.replaceAll("{city}", this.cityname)
						strHtml = strHtml.replaceAll("{temp}", this.temp)
						strHtml = strHtml.replaceAll("{weather}", this.status)
						strHtml = strHtml.replaceAll("{pressure}", this.pressure)
						strHtml = strHtml.replaceAll("{wind}", this.wind)
						strHtml = strHtml.replaceAll("{winddir}", this.windDir)
						strHtml = strHtml.replaceAll("{feels}", this.feelslike)
						strHtml = strHtml.replaceAll("{precip}", this.precip)
						strHtml = strHtml.replaceAll("{humidity}", this.humidity)
						strHtml = strHtml.replaceAll("{uv_index}", this.uv_index)
						strHtml = strHtml.replaceAll("{visibility}", this.visibility)

						this.weather.innerHTML = strHtml
						this.load[0] += 1
					}.bind(this)
				)
			}
		} catch (e) {
			alert(e)
		}
	}

	setWeatherColor() {
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

	/**
	 *	@param {number} type Type of font
	 */
	setOldFont(type) {
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
