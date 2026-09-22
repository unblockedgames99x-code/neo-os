/**
 * MediaIntegration class
 * Created by FLomka.
 **/

class MediaIntegration extends Module {
	group = {}
	_pause = false
	_disable = false
	_duration = 0
	_progress = 0
	_timer
	_color = {}

	/**
	 *	@param {string} id Id for querySelector
	 */
	constructor(id) {
		super(document.querySelector(id))
		this.disableAlign()
		this.embed.classList.add("mediaIntegration")
		this.regListeners()
		this.createGroup()
		this._timer = setInterval(this.timeFunc.bind(this), 100)
	}

	createGroup() {
		this.group.label = new Module(this.embed)
		this.group.artist = new Module(this.embed)
		this.group.progress = new Module(this.embed)
		this.group.duration = new Module(this.embed)
		this.group.duration_line = new Module(this.embed)
		this.group.duration_line.embed.classList.add("mI-line")
		this.group.duration_line.disableAlign()
		this.group.duration_line.setAlign("left")

		this.group.duration_line.editUpdateColor(
			function () {
				this.getStyle().backgroundColor = colorChanger.get(this._color_type, this._color)
				this.getStyle().boxShadow = "0 0 .12em " + colorChanger.get(this._color_blur_type, this._color_blur)
			}.bind(this.group.duration_line)
		)

		this.group.duration_progress = new Module(this.group.duration_line.embed)
		this.group.duration_progress.embed.className = "mI-progress"
		this.group.duration_progress.editUpdateColor(
			function () {
				this.getStyle().backgroundColor = colorChanger.get(this._color_type, this._color)
			}.bind(this.group.duration_progress)
		)

		this.group.img = new Module(this.embed, "img")
		this.group.img.embed.classList.add("mI-img")
		this.group.img.disableAlign()
	}

	applyUserProperties(properties) {
		if (properties.mMediaInegration_Enable) {
			if (properties.mMediaInegration_Enable.value) this._disable = false
			else this.pause(true)
		}

		/* Image setting */
		if (properties.mMediaInegration_Img) this.group.img.setDisplay(properties.mMediaInegration_Img.value)
		if (properties.mMediaInegration_ImgSize) {
			this.group.img.setWidth(properties.mMediaInegration_ImgSize.value)
			this.group.img.setHeight(properties.mMediaInegration_ImgSize.value)
		}
		if (properties.mMediaInegration_ImgX) this.group.img.setX(properties.mMediaInegration_ImgX.value)
		if (properties.mMediaInegration_ImgY) this.group.img.setY(properties.mMediaInegration_ImgY.value)
		if (properties.mMediaInegration_ImgBlur) this.group.img.blur = properties.mMediaInegration_ImgBlur.value
		if (properties.mMediaInegration_ImgTransparency) this.group.img.setOpacity(properties.mMediaInegration_ImgTransparency.value)

		/* Label setting */
		if (properties.mMediaInegration_Label) this.group.label.setDisplay(properties.mMediaInegration_Label.value)
		if (properties.mMediaInegration_LabelFont) this.group.label.setFont(properties.mMediaInegration_LabelFont.value)
		if (properties.mMediaInegration_LabelFontDir) this.group.label.setCustomFont(properties.mMediaInegration_LabelFontDir.value)
		if (properties.mMediaInegration_LabelX) this.group.label.setX(properties.mMediaInegration_LabelX.value)
		if (properties.mMediaInegration_LabelY) this.group.label.setY(properties.mMediaInegration_LabelY.value)
		if (properties.mMediaInegration_LabelAlignment) this.group.label.setAlign(properties.mMediaInegration_LabelAlignment.value)
		if (properties.mMediaInegration_LabelSize) this.group.label.setFontSize(properties.mMediaInegration_LabelSize.value)
		if (properties.mMediaInegration_LabelTransparency) this.group.label.setOpacity(properties.mMediaInegration_LabelTransparency.value)
		if (properties.mMediaInegration_LabelColor) this.group.label.setColor(Color.wpe2rgb(properties.mMediaInegration_LabelColor.value))
		if (properties.mMediaInegration_LabelColorBlur) this.group.label.setColorBlur(Color.wpe2rgb(properties.mMediaInegration_LabelColorBlur.value))
		if (properties.mMediaInegration_LabelColorType) this.group.label.setColor(null, properties.mMediaInegration_LabelColorType.value)
		if (properties.mMediaInegration_LabelColorBlurType) this.group.label.setColorBlur(null, properties.mMediaInegration_LabelColorBlurType.value)

		/* Artist setting */
		if (properties.mMediaInegration_Artist) this.group.artist.setDisplay(properties.mMediaInegration_Artist.value)
		if (properties.mMediaInegration_ArtistFont) this.group.artist.setFont(properties.mMediaInegration_ArtistFont.value)
		if (properties.mMediaInegration_ArtistFontDir) this.group.artist.setCustomFont(properties.mMediaInegration_ArtistFontDir.value)
		if (properties.mMediaInegration_ArtistX) this.group.artist.setX(properties.mMediaInegration_ArtistX.value)
		if (properties.mMediaInegration_ArtistY) this.group.artist.setY(properties.mMediaInegration_ArtistY.value)
		if (properties.mMediaInegration_ArtistAlignment) this.group.artist.setAlign(properties.mMediaInegration_ArtistAlignment.value)
		if (properties.mMediaInegration_ArtistSize) this.group.artist.setFontSize(properties.mMediaInegration_ArtistSize.value)
		if (properties.mMediaInegration_ArtistTransparency) this.group.artist.setOpacity(properties.mMediaInegration_ArtistTransparency.value)
		if (properties.mMediaInegration_ArtistColor) this.group.artist.setColor(Color.wpe2rgb(properties.mMediaInegration_ArtistColor.value))
		if (properties.mMediaInegration_ArtistColorBlur) this.group.artist.setColorBlur(Color.wpe2rgb(properties.mMediaInegration_ArtistColorBlur.value))
		if (properties.mMediaInegration_ArtistColorType) this.group.artist.setColor(null, properties.mMediaInegration_ArtistColorType.value)
		if (properties.mMediaInegration_ArtistColorBlurType) this.group.artist.setColorBlur(null, properties.mMediaInegration_ArtistColorBlurType.value)

		/* Duration setting */
		if (properties.mMediaInegration_Duration) this.group.duration.setDisplay(properties.mMediaInegration_Duration.value)
		if (properties.mMediaInegration_DurationFont) this.group.duration.setFont(properties.mMediaInegration_DurationFont.value)
		if (properties.mMediaInegration_DurationFontDir) this.group.duration.setCustomFont(properties.mMediaInegration_DurationFontDir.value)
		if (properties.mMediaInegration_DurationX) this.group.duration.setX(properties.mMediaInegration_DurationX.value)
		if (properties.mMediaInegration_DurationY) this.group.duration.setY(properties.mMediaInegration_DurationY.value)
		if (properties.mMediaInegration_DurationAlignment) this.group.duration.setAlign(properties.mMediaInegration_DurationAlignment.value)
		if (properties.mMediaInegration_DurationSize) this.group.duration.setFontSize(properties.mMediaInegration_DurationSize.value)
		if (properties.mMediaInegration_DurationTransparency) this.group.duration.setOpacity(properties.mMediaInegration_DurationTransparency.value)
		if (properties.mMediaInegration_DurationColor) this.group.duration.setColor(Color.wpe2rgb(properties.mMediaInegration_DurationColor.value))
		if (properties.mMediaInegration_DurationColorBlur) this.group.duration.setColorBlur(Color.wpe2rgb(properties.mMediaInegration_DurationColorBlur.value))
		if (properties.mMediaInegration_DurationColorType) this.group.duration.setColor(null, properties.mMediaInegration_DurationColorType.value)
		if (properties.mMediaInegration_DurationColorBlurType) this.group.duration.setColorBlur(null, properties.mMediaInegration_DurationColorBlurType.value)

		/* Progress setting */
		if (properties.mMediaInegration_Progress) this.group.progress.setDisplay(properties.mMediaInegration_Progress.value)
		if (properties.mMediaInegration_ProgressFont) this.group.progress.setFont(properties.mMediaInegration_ProgressFont.value)
		if (properties.mMediaInegration_ProgressFontDir) this.group.progress.setCustomFont(properties.mMediaInegration_ProgressFontDir.value)
		if (properties.mMediaInegration_ProgressX) this.group.progress.setX(properties.mMediaInegration_ProgressX.value)
		if (properties.mMediaInegration_ProgressY) this.group.progress.setY(properties.mMediaInegration_ProgressY.value)
		if (properties.mMediaInegration_ProgressAlignment) this.group.progress.setAlign(properties.mMediaInegration_ProgressAlignment.value)
		if (properties.mMediaInegration_ProgressSize) this.group.progress.setFontSize(properties.mMediaInegration_ProgressSize.value)
		if (properties.mMediaInegration_ProgressTransparency) this.group.progress.setOpacity(properties.mMediaInegration_ProgressTransparency.value)
		if (properties.mMediaInegration_ProgressColor) this.group.progress.setColor(Color.wpe2rgb(properties.mMediaInegration_ProgressColor.value))
		if (properties.mMediaInegration_ProgressColorBlur) this.group.progress.setColorBlur(Color.wpe2rgb(properties.mMediaInegration_ProgressColorBlur.value))
		if (properties.mMediaInegration_ProgressColorType) this.group.progress.setColor(null, properties.mMediaInegration_ProgressColorType.value)
		if (properties.mMediaInegration_ProgressColorBlurType) this.group.progress.setColorBlur(null, properties.mMediaInegration_ProgressColorBlurType.value)

		/* Line setting */
		if (properties.mMediaInegration_Line) this.group.duration_line.setDisplay(properties.mMediaInegration_Line.value)
		if (properties.mMediaInegration_LineWidth) this.group.duration_line._setWidthRaw(properties.mMediaInegration_LineWidth.value + "%")
		if (properties.mMediaInegration_LineHeight) this.group.duration_line.setHeight(properties.mMediaInegration_LineHeight.value)
		if (properties.mMediaInegration_LineRadius) this.group.duration_line.getStyle().borderRadius = properties.mMediaInegration_LineRadius.value + "px"
		if (properties.mMediaInegration_LineTransparency) this.group.duration_line.setOpacity(properties.mMediaInegration_LineTransparency.value)
		if (properties.mMediaInegration_LineX) this.group.duration_line.setX(properties.mMediaInegration_LineX.value)
		if (properties.mMediaInegration_LineY) this.group.duration_line.setY(properties.mMediaInegration_LineY.value)
		if (properties.mMediaInegration_LineColorLine) this.group.duration_progress.setColor(Color.wpe2rgb(properties.mMediaInegration_LineColorLine.value))
		if (properties.mMediaInegration_LineColorLineType) this.group.duration_progress.setColor(null, properties.mMediaInegration_LineColorLineType.value)
		if (properties.mMediaInegration_LineColor) this.group.duration_line.setColor(Color.wpe2rgb(properties.mMediaInegration_LineColor.value))
		if (properties.mMediaInegration_LineColorBlur) this.group.duration_line.setColorBlur(Color.wpe2rgb(properties.mMediaInegration_LineColorBlur.value))
		if (properties.mMediaInegration_LineColorType) this.group.duration_line.setColor(null, properties.mMediaInegration_LineColorType.value)
		if (properties.mMediaInegration_LineColorBlurType) this.group.duration_line.setColorBlur(null, properties.mMediaInegration_LineColorBlurType.value)
	}

	isPause() {
		return this._disable || this._pause || false
	}

	pause(disable) {
		this._pause = true
		this.embed.classList.add("paused")
		if (disable) this._disable = true
		if (colorChanger) {
			colorChanger.color.highContrast = ""
			colorChanger.color.primary = ""
			colorChanger.color.secondary = ""
			colorChanger.color.tertiary = ""
			colorChanger.color.text = ""
			colorChanger.trigger()
		}
	}

	resume(enable) {
		this._pause = false
		this.embed.classList.remove("paused")
		if (enable) this._disable = false
		if (colorChanger) {
			colorChanger.color.highContrast = this._color.highContrastColor
			colorChanger.color.primary = this._color.primaryColor
			colorChanger.color.secondary = this._color.secondaryColor
			colorChanger.color.tertiary = this._color.tertiaryColor
			colorChanger.color.text = this._color.textColor
			colorChanger.trigger()
		}
	}

	regListeners() {
		window.wallpaperRegisterMediaPropertiesListener((event) => {
			this.group.label.setHTML(event.title)
			this.group.artist.setHTML(event.artist)
		})

		window.wallpaperRegisterMediaThumbnailListener((event) => {
			this.group.img.embed.src = event.thumbnail || ""
			if (this.isPause()) return

			this.group.img.getStyle().boxShadow = this.group.img.blur ? "0 0 10px " + event.primaryColor : "none"

			this._color.highContrastColor = event.highContrastColor
			this._color.primaryColor = event.primaryColor
			this._color.secondaryColor = event.secondaryColor
			this._color.tertiaryColor = event.tertiaryColor
			this._color.textColor = event.textColor

			if (colorChanger) {
				colorChanger.color.highContrast = this._color.highContrastColor
				colorChanger.color.primary = this._color.primaryColor
				colorChanger.color.secondary = this._color.secondaryColor
				colorChanger.color.tertiary = this._color.tertiaryColor
				colorChanger.color.text = this._color.textColor
				colorChanger.trigger()
			}
		})

		window.wallpaperRegisterMediaTimelineListener((event) => {
			this._duration = event.duration
			this.group.duration.setHTML(this.displayTime(event.duration))
			this._progress = event.position
		})

		window.wallpaperRegisterMediaPlaybackListener(({state}) => {
			if (this._disable) return

			if (state == 1) this.resume()
			else this.pause()
		})
	}

	timeFunc() {
		if (this.isPause()) return
		this._progress += 0.1
		this.group.progress.setHTML(this.displayTime(this._progress))
		this.group.duration_progress._setWidthRaw((this._progress / this._duration) * 100 + "%")
	}

	displayTime(ms) {
		let minutes = Math.floor(ms / 60)
		let seconds = (ms % 60).toFixed(0)
		return minutes + ":" + (seconds < 10 ? "0" : "") + seconds
	}
}
