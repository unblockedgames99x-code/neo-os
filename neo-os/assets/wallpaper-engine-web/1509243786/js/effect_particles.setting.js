/**
 * Created by FLomka on 2018/12/23.
 *
 * User settings for effect particles.
 **/

var effectparticlesSettingsObject = {};
var effect_particles_settings = function(settings) {
	if (settings.particles_isParticles) {
		if (settings.particles_isParticles.value) {
			wallpaper.particles('startParticles');
		} else {
			wallpaper.particles('clearCanvas')
				.particles('stopParticles');
		}
	}
	if (settings.particles_number) {
		wallpaper.particles('addParticles', settings.particles_number.value);
	}
	if (settings.particles_musicTone) {
		effectparticlesSettingsObject.tone = settings.particles_musicTone.value;
	}
	if (settings.particles_opacity) {
		wallpaper.particles('set', 'opacity', settings.particles_opacity.value / 100);
	}
	if (settings.particles_opacityRandom) {
		wallpaper.particles('set', 'opacityRandom', settings.particles_opacityRandom.value);
	}
	if (settings.particles_color) {
		var color = settings.particles_color.value.split(' ').map(function (c) {
			return Math.ceil(c * 255)
		});
		wallpaper.particles('set', 'color', color);
	}
	if (settings.particles_shadowColor) {
		var color = settings.particles_shadowColor.value.split(' ').map(function (c) {
			return Math.ceil(c * 255)
		});
		wallpaper.particles('set', 'shadowColor', color);
	}
	if (settings.particles_shadowBlur) {
		wallpaper.particles('set', 'shadowBlur', settings.particles_shadowBlur.value);
	}
	if (settings.particles_image) {
		cusmapRoute = settings.particles_image.value
		shouldShowMap();
	}
	if (settings.particles_shapeType) {
		switch (settings.particles_shapeType.value) {
			case 1:
				wallpaper.particles('set', 'shapeType', 'circle');
				break;
			case 2:
				wallpaper.particles('set', 'shapeType', 'edge');
				break;
			case 3:
				wallpaper.particles('set', 'shapeType', 'triangle');
				break;
			case 4:
				wallpaper.particles('set', 'shapeType', 'star');
				break;
			case 5:
				wallpaper.particles('set', 'shapeType', 'image');
				shouldShowMap();
				break;
			case 6:
				wallpaper.particles('set', 'shapeType', 'image');
				wallpaper.particles('particlesSnow');
				break;
			default:
				wallpaper.particles('set', 'shapeType', 'circle');
		}
	}
	if(settings.particles_picdef) {
		mapRoute = 'map/' + settings.particles_picdef.value + '.png';
		shouldShowMap();
	}
	if (settings.particles_sizeValue) {
		wallpaper.particles('set', 'sizeValue', settings.particles_sizeValue.value);
	}
	if (settings.particles_sizeRandom) {
		wallpaper.particles('set', 'sizeRandom', settings.particles_sizeRandom.value);
	}
	if (settings.particles_linkEnable) {
		wallpaper.particles('set', 'linkEnable', settings.particles_linkEnable.value);
	}
	if (settings.particles_linkDistance) {
		wallpaper.particles('set', 'linkDistance', settings.particles_linkDistance.value);
	}
	if (settings.particles_linkWidth) {
		wallpaper.particles('set', 'linkWidth', settings.particles_linkWidth.value);
	}
	if (settings.particles_linkColor) {
		var color = settings.particles_linkColor.value.split(' ').map(function (c) {
			return Math.ceil(c * 255)
		});
		wallpaper.particles('set', 'linkColor', color);
	}
	if (settings.particles_linkOpacity) {
		wallpaper.particles('set', 'linkOpacity', settings.particles_linkOpacity.value / 100);
	}
	if (settings.particles_isMove) {
		wallpaper.particles('set', 'isMove', settings.particles_isMove.value);
	}
	if (settings.particles_speed) {
		wallpaper.particles('set', 'speed', settings.particles_speed.value);
	}
	if (settings.particles_speedRandom) {
		wallpaper.particles('set', 'speedRandom', settings.particles_speedRandom.value);
	}
	if (settings.particles_musicRandom) {
		wallpaper.particles('set', 'musicRandom', settings.particles_musicRandom.value);
		musicRandom = settings.particles_musicRandom.value;
	}
	if (settings.particles_musicStrengh) {
		wallpaper.particles('set', 'musicStrengh', settings.particles_musicStrengh.value);
	}
	if (settings.particles_direction_x) {
		wallpaper.particles('set', 'directionX', settings.particles_direction_x.value);
	}
	if (settings.particles_direction_y) {
		wallpaper.particles('set', 'directionY', settings.particles_direction_y.value);
	}
	if (settings.particles_isStraight) {
		wallpaper.particles('set', 'isStraight', settings.particles_isStraight.value);
	}
	if (settings.particles_isBounce) {
		wallpaper.particles('set', 'isBounce', settings.particles_isBounce.value);
	}
	if (settings.particles_moveOutMode) {
		switch (settings.particles_moveOutMode.value) {
			case 1:
				wallpaper.particles('set', 'moveOutMode', 'out');
				break;
			case 2:
				wallpaper.particles('set', 'moveOutMode', 'bounce');
				break;
			default:
				wallpaper.particles('set', 'moveOutMode', 'out');
		}
	}
}