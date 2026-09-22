class Note {
	constructor(id) {
		this.scene = document.querySelector(id)
		this.note = document.createElement("div")
		this.note.className = "module note"
		this.scene.append(this.note)
		this.load = [0, 1]
		this.initial()
	}

	getStyle() {
		return this.note.style
	}

	initial() {
		this.getStyle().fontSize = Math.floor((window.height / 300) * 20) + "px"
		this.load[0] += 1
	}

	setAlign(align) {
		try {
			this.align = align == "left" ? 50 : align == "right" ? -50 : 0
			this.getStyle().textAlign = align
			this.setX()
		} catch (e) {
			alert(e)
		}
	}

	setX(x) {
		try {
			this.x = x === undefined ? this.x : x
			this.getStyle().left = this.x - 50 + this.align + "%"
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

	setText(text) {
		this.note.innerHTML = text.replaceAll("{,}", "<br>")
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

	loaded() {
		if (this.load[0] >= this.load[1]) return true
		else return false
	}

	loadEx(bool) {
		if (bool) this.load[0] += this.load[1]
		else return false
	}

	setColor() {
		this.getStyle().color = colorChanger.get(this.color_type, this.color)
		this.getStyle().textShadow = "0 0 10px " + colorChanger.get(this.color_blur_type, this.color_blur)
	}
}
