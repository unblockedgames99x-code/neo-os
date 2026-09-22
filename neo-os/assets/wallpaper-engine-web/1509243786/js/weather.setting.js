/**
 * Created by FLomka on 2018/12/23.
 *
 * User settings for weather.
 **/

var weather = new Weather('.app')

var weather_settings = function(settings) {
	try{
		if(settings.weather_show){
			if(settings.weather_show.value) {
				weather.getStyle().display = 'block'
	            weather.getWeather()
	            weather.startTimer()
			}else{
				weather.loadEx(true)
				weather.getStyle().display = 'none'
	            weather.stopTimer()
			}
		}
		if(settings.weather_CityText){
			weather.setCity(settings.weather_CityText.value)
	        weather.reloadTimer()
		}
		if (settings.weatherFont) {
			if (isNaN(settings.weatherFont.value) && settings.weatherFont.value) {
	            SetFont(settings.weatherFont.value)
	            weather.getStyle().fontFamily = settings.weatherFont.value.replace(/:/g, ' ')
			}
			else weather.setOldFont(settings.weatherFont.value)
		}
		if (settings.weatherFontDir) {
			if (settings.weatherFontDir.value) {
				weather.getStyle().fontFamily = "'Custom-2J', sans-serif"
				SetFontCustom(settings.weatherFontDir.value, 'Custom-2J')
			}
		}
		if(settings.weather_Alignment){
			weather.setAlign(settings.weather_Alignment.value)
		}
		if(settings.weather_ApiKey){
			if (settings.weather_ApiKey.value) weather.setApi(settings.weather_ApiKey.value, 'first')
		}
		if(settings.weatherApiKeySecondary){
			if (settings.weatherApiKeySecondary.value) weather.setApi(settings.weatherApiKeySecondary.value, 'second')
		}
		if(settings.weatherSlowUpdate){
			weather.setSlowUpdate(settings.weatherSlowUpdate.value)
			weather.reloadTimer()
		}
		if(settings.weather_Color){
			weather.setVar('color','rgb('+settings.weather_Color.value.split(' ').map(function(c){return Math.ceil(c*255)})+')')
		}
		if(settings.weatherColorType){
			weather.setVar('color_type',settings.weatherColorType.value)
		}
		if(settings.weather_BlurColor){
			weather.setVar('color_blur','rgb('+settings.weather_BlurColor.value.split(' ').map(function(c){return Math.ceil(c*255)})+')')
		}
		if(settings.weatherColorBlurType){
			weather.setVar('color_blur_type',settings.weatherColorBlurType.value)
		}
		if(settings.weather_Format){
			weather.setFormat(settings.weather_Format.value)
	        weather.reloadTimer()
		}
		if(settings.weather_units){
	        weather.setUnits(settings.weather_units.value)
	        weather.reloadTimer()
		}
		if(settings.weather_timetransparency){
			weather.getStyle().opacity = settings.weather_timetransparency.value/100;
		}
		if(settings.weather_size){
			weather.getStyle().fontSize = Math.floor(window.height/600*settings.weather_size.value) + 'px';
		}
		if(settings.weatherX){
			weather.setX(settings.weatherX.value)
		}
		if(settings.weatherY){
	        weather.setY(settings.weatherY.value)
		}
	} catch(e) { alert(e) }
}