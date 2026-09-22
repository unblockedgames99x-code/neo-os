/**
 * Created by FLomka on 2018/12/23.
 *
 * User settings for .
 **/
var date = new DateM('.app')

var date_settings = function(settings) {
	if(settings.showDate) {
		date.loadEx(!settings.showDate.value)
		date.getStyle().display = settings.showDate.value ? 'block' : 'none'
	}
	if (settings.dateFont) {
		if (isNaN(settings.dateFont.value) && settings.dateFont.value) {
			SetFont(settings.dateFont.value)
			date.getStyle().fontFamily = settings.dateFont.value.replace(/:/g, ' ')
		}
		else date.setOldFontDate(settings.dateFont.value)
	}
	if (settings.dateFontDir) {
		if (settings.dateFontDir.value) {
			date.getStyle().fontFamily = "'Custom-i8', sans-serif"
			SetFontCustom(settings.dateFontDir.value, 'Custom-i8')
		}
	}
	if(settings.DateSize){
		date.getStyle().fontSize = Math.floor(window.height/600*settings.DateSize.value) + 'px';
	}
	if(settings.DateAlignment){
		date.setAlign(settings.DateAlignment.value)
	}
	if(settings.DateX){
		date.setX(settings.DateX.value)
	}
	if(settings.DateY){
		date.setY(settings.DateY.value)
	}
	if(settings.DateFormat){
		date.setFormat(settings.DateFormat.value)
	}
	if(settings.DateColorRhythm){
		date.setVar('colorRythm', settings.DateColorRhythm.value)
		if(!settings.DateColorRhythm.value){
			date.getStyle().color = date.getVar('color')
			date.getStyle().textShadow = date.getVar('blur_color')
		}
	}
	if(settings.DateColor){
		date.getStyle().color = date.setVar('color','rgb('+settings.DateColor.value.split(' ').map(function(c){return Math.ceil(c*255)})+')')
	}
	if(settings.DateBlurColor){
		date.getStyle().textShadow = date.setVar('blur_color','0 0 10px rgb('+settings.DateBlurColor.value.split(' ').map(function(c){return Math.ceil(c*255)})+')')
	}
	if(settings.datetransparency){
		date.getStyle().opacity = settings.datetransparency.value/100
	}
}