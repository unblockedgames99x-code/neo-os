class Color {
	static wpe2rgb(wpe) {
		return "rgb(" + wpe.split(" ").map((c) => Math.ceil(c * 255)) + ")"
	}

	color = {
		primary: "",
		secondary: "",
		tertiary: "",
		text: "",
		highContrast: "",
	}
	fns = []

	constructor() {}

	addListener(fn) {
		this.fns.push(fn)
	}

	removeListener(fn) {
		const fns = []
		this.fns.forEach((e) => {
			if (e == fn) return
			fns.push(e)
		})
		this.fns = fns
	}

	trigger() {
		this.fns.forEach((fn) => {
			try {
				fn()
			} catch (error) {}
		})
	}

	get(type, stock) {
		switch (type) {
			case 1:
				return stock
			case 2:
				return this.color.primary || stock
			case 3:
				return this.color.secondary || stock
			case 4:
				return this.color.tertiary || stock
			case 5:
				return this.color.text || stock
			case 6:
				return this.color.highContrast || stock
			default:
				return "#0000"
		}
	}
}
