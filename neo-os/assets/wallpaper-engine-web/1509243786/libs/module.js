class Module {
	embed = document.createElement("div")
	_disableAlign = false
	_color = "#0000"
	_color_blur = "#0000"
	_color_type = 0
	_color_blur_type = 0
	_fnUC

	constructor(scene, customTag) {
		this.scene = scene
		if (customTag) this.embed = document.createElement(customTag)
		this.embed.classList.add("moduleSlim")
		this.scene.append(this.embed)
		this._fnUC = this.updateColor.bind(this)
		if (colorChanger) colorChanger.addListener(this._fnUC)
	}

	applyUserProperties(properties) {}

	setDisplay(visibility) {
		this.getStyle().display = visibility ? "flex" : "none"
	}

	setWidth(value) {
		this._setWidthRaw(value + "px")
	}
	setHeight(value) {
		this._setHeightRaw(value + "px")
	}

	_setWidthRaw(value) {
		this.getStyle().width = value
	}

	_setHeightRaw(value) {
		this.getStyle().height = value
	}

	setAlign(align) {
		this._align = align == "left" ? 50 : align == "right" ? -50 : 0
		this.getStyle().justifyContent = align == "left" ? "start" : align == "right" ? "end" : "center"
		this.setX()
	}

	setX(x) {
		this.x = x ?? this.x
		this.getStyle().left = this._disableAlign ? this.x + "%" : this.x - 50 + this._align + "%"
	}

	setY(y) {
		this.y = y ?? this.y
		this.getStyle().top = this.y + (this._disableAlign ? 0 : -50) + "%"
	}

	setFont(font) {
		SetFont(font)
		this.getStyle().fontFamily = font.replace(/:/g, " ")
	}

	setCustomFont(font) {
		if (font) {
			const tag = Date.now()
			this.group.label.getStyle().fontFamily = `'Custom-${tag}', sans-serif`
			SetFontCustom(font, "Custom-" + tag)
		}
	}

	setFontSize(em) {
		this.getStyle().fontSize = em + "em"
	}

	setOpacity(percent) {
		this.getStyle().opacity = percent / 100
	}

	editUpdateColor(fn) {
		if (colorChanger) colorChanger.removeListener(this._fnUC)

		this.updateColor = fn

		this._fnUC = this.updateColor.bind(this)
		if (colorChanger) colorChanger.addListener(this._fnUC)
	}

	updateColor() {
		this.getStyle().color = colorChanger.get(this._color_type, this._color)
		this.getStyle().textShadow = "0 0 .12em " + colorChanger.get(this._color_blur_type, this._color_blur)
	}

	setColor(color, type) {
		if (color) this._color = color
		if (type || type === 0) this._color_type = type
		this.updateColor()
	}

	setColorBlur(color, type) {
		if (color) this._color_blur = color
		if (type || type === 0) this._color_blur_type = type
		this.updateColor()
	}

	/**
	 *	@return {CSSStyleDeclaration}
	 */
	getStyle() {
		return this.embed.style
	}

	disableAlign() {
		this._disableAlign = true
	}

	setHTML(text) {
		this.embed.innerHTML = text
	}
}
