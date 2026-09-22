class Loader {
	constructor(id) {
		this.loader = document.querySelector(id)
		this.time = 0
		this.op = 100
	}
	getStyle() {
		return this.loader.style
	}
	setUpdate() {
		try {
			if (weather.loaded() && date.loaded() && note.loaded() && this.time >= 400) {
				clearTimeout(this.timer)
				this.off()
			}
			this.time += 10
			// if (this.time >= 5000) {
			// 	clearTimeout(this.timer)
			// 	this.off()
			// }
			this.timer = setTimeout(this.setUpdate.bind(this), 10)
		} catch (e) {
			console.error(e)
			this.timer = setTimeout(this.setUpdate.bind(this), 10)
		}
	}
	getLoad() {
		return
	}
	off() {
		try {
			this.op -= 1
			if (this.op > 0) {
				this.op -= 1
				this.getStyle().opacity = this.op / 100
				setTimeout(this.off.bind(this), 100)
			} else this.getStyle().opacity = "0%"
		} catch (e) {
			alert(e)
		}
	}
}

loader = new Loader("#loader")
loader.setUpdate()
